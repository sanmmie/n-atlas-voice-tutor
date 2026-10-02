#!/usr/bin/env node
/**
 * Builds validation/REPORT.md — the real-world validation summary attached to the
 * NAIC submission. Reads the exported CSV if present, otherwise the raw JSONL.
 *
 *   npm run validation:report
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const LOG_DIR = path.join(ROOT, process.env.LOG_DIR ?? 'data');
const OUT_DIR = path.join(ROOT, 'validation');
const OUT_FILE = path.join(OUT_DIR, 'REPORT.md');
const REQUIRED = 50;

async function readJsonl(file) {
  try {
    const raw = await readFile(file, 'utf8');
    return raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function isoWeek(iso) {
  const date = new Date(iso);
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}

function table(entries) {
  if (entries.length === 0) return '_No data yet._\n';
  const head = Object.keys(entries[0]);
  const lines = [
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...entries.map((entry) => `| ${head.map((key) => entry[key]).join(' | ')} |`),
  ];
  return lines.join('\n') + '\n';
}

function count(values) {
  return values.reduce((acc, value) => {
    const key = value ?? 'none';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function toRows(entries) {
  return Object.entries(entries)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({ key, interactions: value }));
}

async function main() {
  const rows = (await readJsonl(path.join(LOG_DIR, 'interactions.jsonl'))).sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );

  await mkdir(OUT_DIR, { recursive: true });

  if (rows.length === 0) {
    const placeholder = [
      '# Real-world validation report',
      '',
      '> **Status: not yet generated.** No interactions were found in `' + path.relative(ROOT, LOG_DIR) + '`.',
      '> Run the tutor, collect real learner sessions, then run `npm run export:csv` and',
      '> `npm run validation:report` to regenerate this file.',
      '',
    ].join('\n');
    await writeFile(OUT_FILE, placeholder, 'utf8');
    console.warn(`No interactions found. Wrote a status placeholder to ${path.relative(ROOT, OUT_FILE)}`);
    return;
  }

  const sessions = new Map();
  const weeks = new Map();
  const learners = new Set();
  const ratings = [];
  let inputChars = 0;
  let outputChars = 0;

  for (const row of rows) {
    learners.add(row.userId);
    inputChars += (row.inputTranscript ?? '').length;
    outputChars += (row.outputTranscript ?? '').length;
    if (typeof row.rating === 'number') ratings.push(row.rating);

    const session = sessions.get(row.sessionId) ?? { started: row.timestamp, ended: row.timestamp };
    if (row.timestamp > session.ended) session.ended = row.timestamp;
    sessions.set(row.sessionId, session);

    const week = isoWeek(row.timestamp);
    const bucket = weeks.get(week) ?? { learners: new Set(), interactions: 0 };
    bucket.learners.add(row.userId);
    bucket.interactions += 1;
    weeks.set(week, bucket);
  }

  const durations = [...sessions.values()].map((s) => (Date.parse(s.ended) - Date.parse(s.started)) / 1000);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / (durations.length || 1);

  const body = [
    '# Real-world validation report',
    '',
    `Generated ${new Date().toISOString()} from \`${path.relative(ROOT, LOG_DIR)}/interactions.jsonl\`.`,
    '',
    '## NAIC Problem Statement 02 requirement',
    '',
    `- Required: **${REQUIRED}** documented real user interactions`,
    `- Documented: **${rows.length}**`,
    `- Status: **${rows.length >= REQUIRED ? 'met' : 'not yet met'}**`,
    '',
    '## Headline figures',
    '',
    table([
      { metric: 'Documented interactions', value: rows.length },
      { metric: 'Unique learners', value: learners.size },
      { metric: 'Sessions', value: sessions.size },
      { metric: 'Sessions per learner', value: (sessions.size / (learners.size || 1)).toFixed(2) },
      { metric: 'Average session duration (s)', value: avgDuration.toFixed(1) },
      { metric: 'Average learner utterance (chars)', value: (inputChars / rows.length).toFixed(1) },
      { metric: 'Average tutor reply (chars)', value: (outputChars / rows.length).toFixed(1) },
      {
        metric: 'Average learner rating',
        value: ratings.length ? `${(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)} / 5 (n=${ratings.length})` : 'n/a',
      },
    ]),
    '## Weekly active learners',
    '',
    table(
      [...weeks.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([week, bucket]) => ({
          'week starting': week,
          learners: bucket.learners.size,
          interactions: bucket.interactions,
        })),
    ),
    '## Language distribution',
    '',
    table(toRows(count(rows.map((row) => row.language)))),
    '## Difficulty levels',
    '',
    table(toRows(count(rows.map((row) => row.level)))),
    '## N-ATLaS checkpoints recorded in the log',
    '',
    'These are the exact official checkpoints that produced each turn.',
    '',
    table(toRows({ ...count(rows.map((row) => row.asrModel)), ...count(rows.map((row) => row.llmModel)) })),
    '## TTS engine used for spoken replies',
    '',
    table(toRows(count(rows.map((row) => row.ttsEngine)))),
    '## Known issues recorded during testing',
    '',
    table(toRows(count(rows.filter((row) => row.error).map((row) => row.error.slice(0, 60))))),
  ].join('\n');

  await writeFile(OUT_FILE, body, 'utf8');
  console.log(`Wrote ${path.relative(ROOT, OUT_FILE)} (${rows.length} interactions, ${learners.size} learners)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
