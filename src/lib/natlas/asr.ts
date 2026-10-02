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

const HF_ROUTER = 'https://router.huggingface.co/hf-inference/models';

/**
 * Calls the official N-ATLaS speech-recognition checkpoints.
 *
 * Two supported transports, both running NCAIR1 ASR weights:
 *  1. `service`     — `asr-service/` in this repo: a small FastAPI app that loads
 *     NCAIR1/Hausa-ASR, NCAIR1/Igbo-ASR or NCAIR1/Yoruba-ASR on a GPU and exposes
 *     POST /transcribe. Preferred for the demo (deterministic, inspectable, no quota).
 *  2. `hf-router`   — Hugging Face serverless inference on the same NCAIR1 repos.
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
    const result =
      config.NATLAS_ASR_PROVIDER === 'hf-router'
        ? await callHfRouter(audio, language.asrModel, options.mimeType ?? config.NATLAS_ASR_MIME, config.HF_TOKEN, controller.signal)
        : await callAsrService(audio, language, options.mimeType ?? config.NATLAS_ASR_MIME, config.NATLAS_ASR_BASE_URL, config.NATLAS_ASR_API_KEY, controller.signal);

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
  form.append('language', language.iso6393);

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
    language: payload.language ?? language.iso6393,
    durationSeconds: payload.duration_seconds ?? null,
  };
}

async function callHfRouter(
  audio: ArrayBuffer,
  model: string,
  mimeType: string,
  token: string | undefined,
  signal: AbortSignal,
): Promise<Omit<TranscribeResult, 'latencyMs'>> {
  const response = await fetch(`${HF_ROUTER}/${model}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token ?? ''}`,
      'content-type': mimeType,
    },
    body: audio,
    signal,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new NatlasError(
      'asr',
      response.status,
      `Hugging Face could not serve ${model}.`,
      (await response.text().catch(() => '')).slice(0, 500),
    );
  }

  const payload = (await response.json()) as { text?: string };
  return {
    text: (payload.text ?? '').trim(),
    model,
    language: model.split('/')[1]?.split('-')[0]?.toLowerCase() ?? '',
    durationSeconds: null,
  };
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('mp3')) return 'mp3';
  return 'webm';
}
