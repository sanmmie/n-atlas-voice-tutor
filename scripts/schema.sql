-- PostgreSQL schema for the interaction log.
--
--   psql "$DATABASE_URL" -f scripts/schema.sql
--
-- Mirrors POSTGRES_SCHEMA in src/lib/store/interactions.ts. Keep the two in sync.

create table if not exists interactions (
  id uuid primary key,
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

-- Learner feedback (1-5 rating, TTS engine used, client-side errors) is kept in a
-- separate append-only table so an interaction row is never rewritten.
create table if not exists feedback (
  interaction_id uuid primary key,
  reported_at timestamptz not null,
  rating integer,
  tts_engine text not null default 'none',
  error text
);
