import { getConfig } from './config';
import { LANGUAGES, type LanguageCode } from '../languages';
import { NatlasError } from './llm';

export interface TranscribeResult {
  text: string;
  /** The exact N-ATLaS checkpoint that produced the transcript. */
  model: string;
  language: string;
  latencyMs: number;
  durationSeconds: number | null;
}

/**
 * Calls the official N-ATLaS speech-recognition checkpoints.
 *
 * The supported transport is `service` — `asr-service/` in this repo: a small
 * FastAPI app that loads
 *     NCAIR1/Hausa-ASR, NCAIR1/Igbo-ASR or NCAIR1/Yoruba-ASR on a GPU and exposes
 *     POST /transcribe. Preferred for the demo (deterministic, inspectable, no quota).
 *
 * The checkpoint is chosen from the learner's selected language. There is no path
 * to Whisper-from-OpenAI, AssemblyAI, Google STT or any other recogniser.
 */
export async function transcribeWithNatlas(
  audio: ArrayBuffer,
  options: { language: LanguageCode; mimeType?: string; fileName?: string; signal?: AbortSignal },
): Promise<TranscribeResult> {
  const config = getConfig();
  const language = LANGUAGES[options.language];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.NATLAS_ASR_TIMEOUT_MS);
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const startedAt = Date.now();
  try {
    const result = await callAsrService(
      audio,
      language,
      options.mimeType ?? config.NATLAS_ASR_MIME,
      config.NATLAS_ASR_BASE_URL,
      config.NATLAS_ASR_API_KEY,
      controller.signal,
    );

    // Defence in depth: never surface a transcript that did not come from N-ATLaS.
    if (!result.model.startsWith('NCAIR1/')) {
      throw new NatlasError(
        'asr',
        502,
        `ASR response claimed a non-N-ATLaS model ("${result.model}"). Refusing to use it.`,
      );
    }

    return { ...result, latencyMs: Date.now() - startedAt };
  } catch (error) {
    if (error instanceof NatlasError) throw error;
    const reason = controller.signal.aborted ? 'timeout' : (error as Error).message;
    throw new NatlasError(
      'asr',
      502,
      `N-ATLaS ASR call failed (${language.asrModel}).`,
      reason,
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function callAsrService(
  audio: ArrayBuffer,
  language: (typeof LANGUAGES)[LanguageCode],
  mimeType: string,
  baseUrl: string,
  apiKey: string | undefined,
  signal: AbortSignal,
): Promise<Omit<TranscribeResult, 'latencyMs'>> {
  const form = new FormData();
  form.append('file', new Blob([audio], { type: mimeType }), `utterance.${extensionFor(mimeType)}`);
  form.append('language', language.asrLanguageKey);

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/transcribe`, {
    method: 'POST',
    headers: apiKey ? { authorization: `Bearer ${apiKey}` } : undefined,
    body: form,
    signal,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new NatlasError(
      'asr',
      response.status,
      `N-ATLaS ASR service rejected the audio (expected model ${language.asrModel}).`,
      (await response.text().catch(() => '')).slice(0, 500),
    );
  }

  const payload = (await response.json()) as {
    text?: string;
    model?: string;
    language?: string;
    duration_seconds?: number;
  };

  if (!payload.text || !payload.model) {
    throw new NatlasError('asr', 502, 'N-ATLaS ASR service returned an unexpected payload.');
  }

  return {
    text: payload.text.trim(),
    model: payload.model,
    language: payload.language ?? language.asrLanguageKey,
    durationSeconds: payload.duration_seconds ?? null,
  };
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('mp3')) return 'mp3';
  return 'webm';
}
