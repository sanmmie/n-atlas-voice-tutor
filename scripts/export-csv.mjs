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
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const LOG_DIR = path.join(ROOT, process.env.LOG_DIR ?? 'data');
const OUT_DIR = path.join(ROOT, 'validation');
const REQUIRED_INTERACTIONS = 50;

/** Where the deployed app lives, overridable for a preview URL. */
const DEFAULT_BASE_URL = 'https://n-atlas-voice-tutor-deltaos-core.vercel.app';

/**
 * The deployment is the source of truth when it runs with LOG_DRIVER=postgres:
 * Vercel's filesystem is ephemeral, so the local jsonl file is always empty
 * there. ADMIN_TOKEN and (on a pull) BASE_URL come from .env.local, which this
 * script reads itself so the documented `npm run export:csv` works as written.
 */
function loadDotEnv(file) {
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (!match) continue;
      const value = match[2].trim();
      if (value && !value.startsWith('#') && process.env[match[1]] === undefined) {
        process.env[match[1]] = value;
      }
    }
  } catch {
    // no .env.local is fine
  }
}

async function readFromDeployment() {
  const base = (process.env.BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return { rows: [], queried: false, note: 'ADMIN_TOKEN is not set, so the deployment was not queried' };
  }
  const url = `${base}/api/export?format=json&token=${encodeURIComponent(token)}`;
  try {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok) {
      return { rows: [], queried: false, note: `${base}/api/export answered ${response.status}` };
    }
    const payload = await response.json();
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    return { rows, queried: true, note: `${base} (${rows.length} rows, postgres driver)` };
  } catch (error) {
    return { rows: [], queried: false, note: `could not reach ${base}: ${error.message}` };
  }
}

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
  loadDotEnv(path.join(ROOT, '.env.local'));
  const localRows = await readJsonl(path.join(LOG_DIR, 'interactions.jsonl'));
  const feedback = await readJsonl(path.join(LOG_DIR, 'feedback.jsonl'));
  const feedbackById = new Map(feedback.map((entry) => [entry.interactionId, entry]));

  let source = `${path.relative(ROOT, LOG_DIR)}/interactions.jsonl (jsonl driver)`;
  let interactions = localRows;

  if (interactions.length === 0) {
    const deployed = await readFromDeployment();
    if (deployed.rows.length > 0) {
      interactions = deployed.rows;
      source = deployed.note;
    } else {
      const headline = deployed.queried
        ? `The deployment is reachable but has no logged interactions yet.`
        : `No interactions found in ${LOG_DIR} and none could be exported from the deployment.`;
      console.error(
        [
          headline,
          `  local:    run the tutor first (npm run dev), or`,
          `  deployed: set ADMIN_TOKEN (and BASE_URL if not ${DEFAULT_BASE_URL}) in .env.local`,
          `            reason: ${deployed.note}`,
        ].join('\n'),
      );
      process.exit(1);
    }
  }

  console.log(`Source: ${source}`);

  const merged = (interactions.length === localRows.length && localRows.length > 0
    ? interactions.map((row) => {
        const entry = feedbackById.get(row.id);
        if (!entry) return row;
        return {
          ...row,
          rating: entry.rating ?? row.rating,
          ttsEngine: entry.ttsEngine ?? row.ttsEngine,
          error: entry.error ?? row.error,
        };
      })
    : interactions
  ).sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));

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
