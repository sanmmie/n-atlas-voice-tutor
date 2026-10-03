import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { getConfig } from '../natlas/config';
import type { LanguageCode, Level } from '../languages';

export interface InteractionLog {
  id: string;
  /** ISO-8601 UTC. */
  timestamp: string;
  sessionId: string;
  /** Anonymous per-browser id, or the account id once a learner opts in. */
  userId: string;
  authenticated: boolean;
  language: LanguageCode;
  level: Level;
  turnIndex: number;
  inputTranscript: string;
  outputTranscript: string;
  audioSeconds: number | null;
  sessionDurationSeconds: number | null;
  /** Evidence fields: exactly which N-ATLaS weights answered this turn. */
  asrModel: string | null;
  asrLatencyMs: number | null;
  llmModel: string | null;
  llmLatencyMs: number | null;
  ttsEngine: 'phrase-library' | 'web-speech' | 'none';
  blocked: boolean;
  error: string | null;
  /** Learner self-rating, 1-5, optional. */
  rating: number | null;
  /** Effective connection type reported by the browser, e.g. "2g". */
  networkType: string | null;
}

export type NewInteractionLog = Omit<InteractionLog, 'id' | 'timestamp'>;

export function newInteractionLog(input: NewInteractionLog): InteractionLog {
  return {
    ...input,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ drivers */

interface Driver {
  append(record: InteractionLog): Promise<void>;
  readAll(): Promise<InteractionLog[]>;
}

class MemoryDriver implements Driver {
  private rows: InteractionLog[] = [];

  async append(record: InteractionLog): Promise<void> {
    this.rows.push(record);
  }

  async readAll(): Promise<InteractionLog[]> {
    return [...this.rows];
  }
}

class JsonlDriver implements Driver {
  constructor(private readonly file: string) {}

  async append(record: InteractionLog): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    await appendFile(this.file, `${JSON.stringify(record)}\n`, 'utf8');
  }

  async readAll(): Promise<InteractionLog[]> {
    let raw: string;
    try {
      raw = await readFile(this.file, 'utf8');
    } catch {
      return [];
    }
    return raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as InteractionLog);
  }
}

class PostgresDriver implements Driver {
  constructor(private readonly connectionString: string) {}

  async append(record: InteractionLog): Promise<void> {
    const client = postgres(this.connectionString, { max: 1 });
    try {
      await client`
        insert into interactions (
          id, timestamp, session_id, user_id, authenticated, language, level, turn_index,
          input_transcript, output_transcript, audio_seconds, session_duration_seconds,
          asr_model, asr_latency_ms, llm_model, llm_latency_ms, tts_engine, blocked, error,
          rating, network_type
        ) values (
          ${record.id}, ${record.timestamp}, ${record.sessionId}, ${record.userId}, ${record.authenticated},
          ${record.language}, ${record.level}, ${record.turnIndex},
          ${record.inputTranscript}, ${record.outputTranscript}, ${record.audioSeconds}, ${record.sessionDurationSeconds},
          ${record.asrModel}, ${record.asrLatencyMs}, ${record.llmModel}, ${record.llmLatencyMs}, ${record.ttsEngine},
          ${record.blocked}, ${record.error}, ${record.rating}, ${record.networkType}
        )
      `;
    } finally {
      await client.end({ timeout: 5 });
    }
  }

  async readAll(): Promise<InteractionLog[]> {
    const client = postgres(this.connectionString, { max: 1 });
    try {
      const result = await client<Record<string, unknown>[]>`
        select * from interactions order by timestamp asc
      `;
      return result.map((row) => ({
        id: String(row.id),
        timestamp: String(row.timestamp),
        sessionId: String(row.session_id),
        userId: String(row.user_id),
        authenticated: Boolean(row.authenticated),
        language: String(row.language) as LanguageCode,
        level: String(row.level) as Level,
        turnIndex: Number(row.turn_index),
        inputTranscript: String(row.input_transcript ?? ''),
        outputTranscript: String(row.output_transcript ?? ''),
        audioSeconds: row.audio_seconds === null ? null : Number(row.audio_seconds),
        sessionDurationSeconds:
          row.session_duration_seconds === null ? null : Number(row.session_duration_seconds),
        asrModel: row.asr_model === null ? null : String(row.asr_model),
        asrLatencyMs: row.asr_latency_ms === null ? null : Number(row.asr_latency_ms),
        llmModel: row.llm_model === null ? null : String(row.llm_model),
        llmLatencyMs: row.llm_latency_ms === null ? null : Number(row.llm_latency_ms),
        ttsEngine: String(row.tts_engine ?? 'none') as InteractionLog['ttsEngine'],
        blocked: Boolean(row.blocked),
        error: row.error === null ? null : String(row.error),
        rating: row.rating === null ? null : Number(row.rating),
        networkType: row.network_type === null ? null : String(row.network_type),
      }));
    } finally {
      await client.end({ timeout: 5 });
    }
  }
}

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (driver) return driver;
  const config = getConfig();

  if (config.LOG_DRIVER === 'postgres') {
    driver = new PostgresDriver(config.DATABASE_URL as string);
  } else if (config.LOG_DRIVER === 'memory') {
    driver = new MemoryDriver();
  } else {
    driver = new JsonlDriver(path.join(process.cwd(), config.LOG_DIR, 'interactions.jsonl'));
  }
  return driver;
}

/** Test seam. */
export function resetDriver(): void {
  driver = null;
}

/* ------------------------------------------------------------------- public */

export async function logInteraction(record: InteractionLog): Promise<void> {
  await getDriver().append(record);
}

export async function readInteractions(): Promise<InteractionLog[]> {
  return getDriver().readAll();
}

/**
 * Learner feedback attached to an already-logged turn: 1-5 rating, which TTS
 * engine actually spoke the reply, and any client-side error the browser hit.
 * Stored as its own append-only stream so the interaction row written during the
 * turn is never rewritten.
 */
export interface FeedbackLog {
  interactionId: string;
  reportedAt: string;
  rating: number | null;
  ttsEngine: 'phrase-library' | 'web-speech' | 'none';
  error: string | null;
}

export function newFeedbackLog(input: Omit<FeedbackLog, 'reportedAt'>): FeedbackLog {
  return { ...input, reportedAt: new Date().toISOString() };
}

export async function logFeedback(record: FeedbackLog): Promise<void> {
  const config = getConfig();
  if (config.LOG_DRIVER === 'postgres') {
    const client = postgres(config.DATABASE_URL as string, { max: 1 });
    try {
      await client`
        insert into feedback (interaction_id, reported_at, rating, tts_engine, error)
        values (${record.interactionId}, ${record.reportedAt}, ${record.rating}, ${record.ttsEngine}, ${record.error})
      `;
    } finally {
      await client.end({ timeout: 5 });
    }
    return;
  }
  if (config.LOG_DRIVER === 'memory') {
    memoryFeedback.push(record);
    return;
  }
  const file = path.join(process.cwd(), config.LOG_DIR, 'feedback.jsonl');
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(record)}\n`, 'utf8');
}

const memoryFeedback: FeedbackLog[] = [];

export async function readFeedback(): Promise<FeedbackLog[]> {
  const config = getConfig();
  if (config.LOG_DRIVER === 'postgres') {
    const client = postgres(config.DATABASE_URL as string, { max: 1 });
    try {
      const rows = await client<Record<string, unknown>[]>`
        select interaction_id, reported_at, rating, tts_engine, error from feedback
      `;
      return rows.map((row) => ({
        interactionId: String(row.interaction_id),
        reportedAt: String(row.reported_at),
        rating: row.rating === null ? null : Number(row.rating),
        ttsEngine: String(row.tts_engine ?? 'none') as FeedbackLog['ttsEngine'],
        error: row.error === null ? null : String(row.error),
      }));
    } finally {
      await client.end({ timeout: 5 });
    }
  }
  if (config.LOG_DRIVER === 'memory') {
    return [...memoryFeedback];
  }
  const file = path.join(process.cwd(), config.LOG_DIR, 'feedback.jsonl');
  try {
    const raw = await readFile(file, 'utf8');
    return raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as FeedbackLog);
  } catch {
    return [];
  }
}

/** Interactions with learner feedback merged in, ready for CSV export / reporting. */
export async function readMergedInteractions(): Promise<InteractionLog[]> {
  const [rows, feedback] = await Promise.all([readInteractions(), readFeedback()]);
  const byId = new Map(feedback.map((entry) => [entry.interactionId, entry]));
  return rows.map((row) => {
    const entry = byId.get(row.id);
    if (!entry) return row;
    return {
      ...row,
      rating: entry.rating ?? row.rating,
      ttsEngine: entry.ttsEngine ?? row.ttsEngine,
      error: entry.error ?? row.error,
    };
  });
}

/* ---------------------------------------------------------------------- CSV */

export const CSV_COLUMNS: Array<keyof InteractionLog> = [
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

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(rows: InteractionLog[]): string {
  const header = CSV_COLUMNS.join(',');
  const body = rows
    .slice()
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((row) => CSV_COLUMNS.map((column) => escapeCsvCell(row[column])).join(','));
  return [header, ...body].join('\n');
}

/* ----------------------------------------------------------------- summary */

export interface ValidationSummary {
  totalInteractions: number;
  uniqueLearners: number;
  uniqueSessions: number;
  weeklyActiveUsers: Array<{ week: string; learners: number; interactions: number }>;
  sessionsPerLearner: number;
  averageSessionDurationSeconds: number;
  averageInputChars: number;
  averageOutputChars: number;
  languageDistribution: Record<string, number>;
  levelDistribution: Record<string, number>;
  asrModelsUsed: Record<string, number>;
  llmModelsUsed: Record<string, number>;
  averageRating: number | null;
  ratingsCount: number;
  blockedTurns: number;
  errorTurns: number;
}

export function summarise(rows: InteractionLog[]): ValidationSummary {
  const byLanguage: Record<string, number> = {};
  const byLevel: Record<string, number> = {};
  const byAsr: Record<string, number> = {};
  const byLlm: Record<string, number> = {};
  const sessions = new Map<string, { started: string; ended: string; user: string }>();
  const weeks = new Map<string, { learners: Set<string>; interactions: number }>();
  const ratings: number[] = [];

  let inputChars = 0;
  let outputChars = 0;
  let blockedTurns = 0;
  let errorTurns = 0;

  for (const row of rows) {
    byLanguage[row.language] = (byLanguage[row.language] ?? 0) + 1;
    byLevel[row.level] = (byLevel[row.level] ?? 0) + 1;
    if (row.asrModel) byAsr[row.asrModel] = (byAsr[row.asrModel] ?? 0) + 1;
    if (row.llmModel) byLlm[row.llmModel] = (byLlm[row.llmModel] ?? 0) + 1;
    inputChars += row.inputTranscript.length;
    outputChars += row.outputTranscript.length;
    if (row.blocked) blockedTurns += 1;
    if (row.error) errorTurns += 1;
    if (row.rating !== null) ratings.push(row.rating);

    const existing = sessions.get(row.sessionId);
    if (!existing) {
      sessions.set(row.sessionId, { started: row.timestamp, ended: row.timestamp, user: row.userId });
    } else {
      if (row.timestamp > existing.ended) existing.ended = row.timestamp;
    }

    const week = isoWeek(row.timestamp);
    const bucket = weeks.get(week) ?? { learners: new Set<string>(), interactions: 0 };
    bucket.learners.add(row.userId);
    bucket.interactions += 1;
    weeks.set(week, bucket);
  }

  const durations = [...sessions.values()].map(
    (session) => (Date.parse(session.ended) - Date.parse(session.started)) / 1000,
  );

  const learners = new Set(rows.map((row) => row.userId));

  return {
    totalInteractions: rows.length,
    uniqueLearners: learners.size,
    uniqueSessions: sessions.size,
    weeklyActiveUsers: [...weeks.entries()]
      .map(([week, bucket]) => ({ week, learners: bucket.learners.size, interactions: bucket.interactions }))
      .sort((a, b) => a.week.localeCompare(b.week)),
    sessionsPerLearner:
      learners.size === 0 ? 0 : Number((sessions.size / learners.size).toFixed(2)),
    averageSessionDurationSeconds:
      durations.length === 0
        ? 0
        : Number((durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(1)),
    averageInputChars: rows.length === 0 ? 0 : Number((inputChars / rows.length).toFixed(1)),
    averageOutputChars: rows.length === 0 ? 0 : Number((outputChars / rows.length).toFixed(1)),
    languageDistribution: byLanguage,
    levelDistribution: byLevel,
    asrModelsUsed: byAsr,
    llmModelsUsed: byLlm,
    averageRating:
      ratings.length === 0 ? null : Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)),
    ratingsCount: ratings.length,
    blockedTurns,
    errorTurns,
  };
}

function isoWeek(iso: string): string {
  const date = new Date(iso);
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}

export const POSTGRES_SCHEMA = `
create table if not exists interactions (  id uuid primary key,
  timestamp timestamptz not null,
  session_id text not null,
  user_id text not null,
  authenticated boolean not null default false,
  language text not null,
  level text not null,
  turn_index integer not null,
  input_transcript text not null default '',
  output_transcript text not null default '',
  audio_seconds double precision,
  session_duration_seconds double precision,
  asr_model text,
  asr_latency_ms integer,
  llm_model text,
  llm_latency_ms integer,
  tts_engine text not null default 'none',
  blocked boolean not null default false,
  error text,
  rating integer,
  network_type text
);
create index if not exists interactions_timestamp_idx on interactions (timestamp);
create index if not exists interactions_user_idx on interactions (user_id);
create index if not exists interactions_session_idx on interactions (session_id);

create table if not exists feedback (
  interaction_id uuid primary key,
  reported_at timestamptz not null,
  rating integer,
  tts_engine text not null default 'none',
  error text
);
`;
