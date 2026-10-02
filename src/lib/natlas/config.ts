import { z } from 'zod';

/**
 * Central N-ATLaS configuration.
 *
 * Every model identifier in this application is validated against the official
 * NCAIR1 organisation prefix at load time. There is no code path that can be
 * pointed at a non-N-ATLaS model without the process refusing to start — this is
 * deliberate, because NAIC disqualifies submissions that wrap another model.
 */

const OFFICIAL_MODEL_PREFIX = 'NCAIR1/';

const modelId = z
  .string()
  .min(1)
  .refine((value) => value.startsWith(OFFICIAL_MODEL_PREFIX), {
    message:
      'N-ATLaS compliance: the model must be an official NCAIR1 checkpoint such as NCAIR1/N-ATLaS. ' +
      'Wrapping a non-N-ATLaS model disqualifies a NAIC submission.',
  });

const envSchema = z.object({
  // ---- N-ATLaS LLM (NCAIR1/N-ATLaS, Llama-3 8B fine-tune) ----
  NATLAS_LLM_PROVIDER: z.enum(['openai-compatible', 'hf-inference-endpoint']).default('openai-compatible'),
  /** Base URL of a self-hosted OpenAI-compatible server (llama.cpp, vLLM, TGI, Modal, RunPod...). */
  NATLAS_LLM_BASE_URL: z.string().url().default('http://127.0.0.1:8080/v1'),
  NATLAS_LLM_MODEL: modelId.default('NCAIR1/N-ATLaS'),
  NATLAS_LLM_API_KEY: z.string().optional(),
  /** Guards against running the 8B model past its documented window. */
  NATLAS_LLM_MAX_TOKENS: z.coerce.number().int().positive().max(4096).default(220),
  NATLAS_LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.4),
  NATLAS_LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),

  // ---- N-ATLaS ASR (NCAIR1/{Hausa,Igbo,Yoruba}-ASR) ----
  NATLAS_ASR_PROVIDER: z.enum(['service', 'hf-router']).default('service'),
  /** This app's own thin N-ATLaS ASR service (see asr-service/). */
  NATLAS_ASR_BASE_URL: z.string().url().default('http://127.0.0.1:8000'),
  NATLAS_ASR_API_KEY: z.string().optional(),
  /** Required for hf-router access to the gated N-ATLaS checkpoints. */
  HF_TOKEN: z.string().optional(),
  NATLAS_ASR_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  /** WebM/Opus is what MediaRecorder produces on most Android + Chrome. */
  NATLAS_ASR_MIME: z.string().default('audio/webm;codecs=opus'),

  // ---- Interaction log store ----
  /** `jsonl` writes to disk (self-hosted / VPS). `postgres` uses DATABASE_URL (Vercel). */
  LOG_DRIVER: z.enum(['jsonl', 'postgres', 'memory']).default('jsonl'),
  LOG_DIR: z.string().default('./data'),
  DATABASE_URL: z.string().optional(),

  // ---- Tutor safety ----
  TUTOR_SAFETY_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
});

export type NatlasConfig = z.infer<typeof envSchema> & {
  llmModelIsOfficial: true;
};

let cached: NatlasConfig | null = null;

export function getConfig(): NatlasConfig {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid N-ATLaS configuration:\n${detail}`);
  }

  if (parsed.data.LOG_DRIVER === 'postgres' && !parsed.data.DATABASE_URL) {
    throw new Error('LOG_DRIVER=postgres requires DATABASE_URL.');
  }

  if (parsed.data.NATLAS_ASR_PROVIDER === 'hf-router' && !parsed.data.HF_TOKEN) {
    throw new Error('NATLAS_ASR_PROVIDER=hf-router requires HF_TOKEN.');
  }

  cached = { ...parsed.data, llmModelIsOfficial: true };
  return cached;
}

/** Test seam: forces the next getConfig() call to re-read process.env. */
export function resetConfigCache(): void {
  cached = null;
}
