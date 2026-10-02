#!/usr/bin/env node
/**
 * Exports the live interaction log to the CSV the NAIC submission attaches.
 *
 *   npm run export:csv
 *
 * Reads data/interactions.jsonl + data/feedback.jsonl (the jsonl log driver) or
 * asks a running deployment for /api/export (postgres driver). Writes
 * validation/interactions-<date>.csv and refuses to be silent about a short log:
 * Problem Statement 02 requires at least 50 documented real learner interactions.
 *
 * The script is intentionally dependency-free and reads the raw JSONL directly, so
 * it works on a laptop with no database and no running server.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const LOG_DIR = path.join(ROOT, process.env.LOG_DIR ?? 'data');
const OUT_DIR = path.join(ROOT, 'validation');
const REQUIRED_INTERACTIONS = 50;

const COLUMNS = [
  'id',
  'timestamp',
  'sessionId',
  'userId',
  'authenticated',
  'language',
  'level',
  'turnIndex',
  'inputTranscript',
  'outputTranscript',
  'audioSeconds',
  'sessionDurationSeconds',
  'asrModel',
  'asrLatencyMs',
  'llmModel',
  'llmLatencyMs',
  'ttsEngine',
  'blocked',
  'error',
  'rating',
  'networkType',
];

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

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main() {
  const interactions = await readJsonl(path.join(LOG_DIR, 'interactions.jsonl'));
  const feedback = await readJsonl(path.join(LOG_DIR, 'feedback.jsonl'));
  const feedbackById = new Map(feedback.map((entry) => [entry.interactionId, entry]));

  if (interactions.length === 0) {
    console.error(`No interactions found in ${LOG_DIR}. Run the tutor first (npm run dev).`);
    process.exit(1);
  }

  const merged = interactions
    .map((row) => {
      const entry = feedbackById.get(row.id);
      if (!entry) return row;
      return {
        ...row,
        rating: entry.rating ?? row.rating,
        ttsEngine: entry.ttsEngine ?? row.ttsEngine,
        error: entry.error ?? row.error,
      };
    })
    .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));

  const rows = merged.map((row) => COLUMNS.map((column) => escapeCsv(row[column])).join(','));
  const csv = [COLUMNS.join(','), ...rows].join('\n') + '\n';

  await mkdir(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const target = path.join(OUT_DIR, `interactions-${stamp}.csv`);
  await writeFile(target, csv, 'utf8');

  const learners = new Set(merged.map((row) => row.userId));
  const sessions = new Set(merged.map((row) => row.sessionId));
  const byLanguage = merged.reduce((acc, row) => {
    acc[row.language] = (acc[row.language] ?? 0) + 1;
    return acc;
  }, {});
  const models = new Set(merged.flatMap((row) => [row.asrModel, row.llmModel]).filter(Boolean));
  const nonNatlas = [...models].filter((model) => !String(model).startsWith('NCAIR1/'));

  console.log(`Wrote ${merged.length} interactions to ${path.relative(ROOT, target)}`);
  console.log(`  learners      : ${learners.size}`);
  console.log(`  sessions      : ${sessions.size}`);
  console.log(`  languages     : ${JSON.stringify(byLanguage)}`);
  console.log(`  N-ATLaS models: ${[...models].join(', ')}`);

  if (nonNatlas.length > 0) {
    console.error(`\nCOMPLIANCE FAILURE: non-N-ATLaS model ids in the log: ${nonNatlas.join(', ')}`);
    process.exit(2);
  }

  if (merged.length < REQUIRED_INTERACTIONS) {
    console.warn(
      `\nOnly ${merged.length} of the ${REQUIRED_INTERACTIONS} interactions required by NAIC ` +
        'Problem Statement 02 are documented so far.',
    );
  } else {
    console.log(`\nMeets the NAIC PS2 minimum of ${REQUIRED_INTERACTIONS} documented real interactions.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
