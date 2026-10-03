import { getConfig } from './config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionResult {
  text: string;
  model: string;
  /** Wall-clock ms for the upstream N-ATLaS call. Logged as evidence. */
  latencyMs: number;
  promptChars: number;
  completionChars: number;
  provider: string;
}

export class NatlasError extends Error {
  readonly status: number;
  readonly stage: 'llm' | 'asr';
  readonly detail?: string;

  constructor(stage: 'llm' | 'asr', status: number, message: string, detail?: string) {
    super(message);
    this.name = 'NatlasError';
    this.stage = stage;
    this.status = status;
    this.detail = detail;
  }
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Calls the official N-ATLaS LLM (NCAIR1/N-ATLaS).
 *
 * Two supported transports, both pointing at N-ATLaS weights:
 *  1. `openai-compatible`  — a self-hosted N-ATLaS server exposing /v1/chat/completions
 *     (llama.cpp `llama-server`, vLLM, TGI, or a Modal/RunPod deployment of the
 *     official GGUF/FP8 weights). Recommended: full control, no rate limit cliffs.
 *  2. `hf-inference-endpoint` — a Hugging Face Inference Endpoint running NCAIR1/N-ATLaS.
 *
 * There is deliberately no third transport, and no fallback to any other model.
 */
export async function completeWithNatlas(
  messages: ChatMessage[],
  options: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {},
): Promise<CompletionResult> {
  const config = getConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.NATLAS_LLM_TIMEOUT_MS);
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const startedAt = Date.now();
  const promptChars = messages.reduce((sum, m) => sum + m.content.length, 0);

  try {
    let response: RawCompletion | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response =
          config.NATLAS_LLM_PROVIDER === 'hf-inference-endpoint'
            ? await callHfInferenceEndpoint(config.NATLAS_LLM_BASE_URL, config.NATLAS_LLM_MODEL, config.NATLAS_LLM_API_KEY, messages, options, controller.signal)
            : await callOpenAiCompatible(config.NATLAS_LLM_BASE_URL, config.NATLAS_LLM_MODEL, config.NATLAS_LLM_API_KEY, messages, options, controller.signal);
        break;
      } catch (error) {
        const retryableStatus = error instanceof NatlasError && [429, 502, 503, 504].includes(error.status);
        const retryableNetworkError = error instanceof TypeError;
        if (controller.signal.aborted || (!retryableStatus && !retryableNetworkError) || attempt === 2) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
      }
    }
    if (!response) throw new Error('N-ATLaS request completed without a response.');

    const latencyMs = Date.now() - startedAt;
    return {
      text: response.text,
      model: config.NATLAS_LLM_MODEL,
      latencyMs,
      promptChars,
      completionChars: response.text.length,
      provider:
        config.NATLAS_LLM_PROVIDER === 'hf-inference-endpoint' ? 'hf-inference-endpoint' : 'openai-compatible',
    };
  } catch (error) {
    if (error instanceof NatlasError) throw error;
    const reason = controller.signal.aborted ? 'timeout' : (error as Error).message;
    throw new NatlasError(
      'llm',
      502,
      `N-ATLaS LLM call failed (${config.NATLAS_LLM_MODEL} via ${config.NATLAS_LLM_PROVIDER}).`,
      reason,
    );
  } finally {
    clearTimeout(timeout);
  }
}

interface RawCompletion {
  text: string;
}

async function callOpenAiCompatible(
  baseUrl: string,
  model: string,
  apiKey: string | undefined,
  messages: ChatMessage[],
  options: { maxTokens?: number; temperature?: number },
  signal: AbortSignal,
): Promise<RawCompletion> {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const body = JSON.stringify({
    model,
    messages,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    stream: false,
    // Llama-3 chat template: keep the turn prefix explicit.
    chat_template_kwargs: { date_string: todayStamp() },
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body,
    signal,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new NatlasError(
      'llm',
      response.status,
      'N-ATLaS LLM endpoint rejected the request.',
      (await safeRead(response)).slice(0, 500),
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string }; text?: string }>;
  };
  const text = payload.choices?.[0]?.message?.content ?? payload.choices?.[0]?.text ?? '';
  if (!text.trim()) {
    throw new NatlasError('llm', 502, 'N-ATLaS returned an empty completion.', JSON.stringify(payload).slice(0, 500));
  }
  return { text: cleanCompletion(text) };
}

async function callHfInferenceEndpoint(
  baseUrl: string,
  model: string,
  apiKey: string | undefined,
  messages: ChatMessage[],
  options: { maxTokens?: number; temperature?: number },
  signal: AbortSignal,
): Promise<RawCompletion> {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey ?? ''}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      stream: false,
    }),
    signal,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new NatlasError(
      'llm',
      response.status,
      'N-ATLaS Hugging Face Inference Endpoint rejected the request.',
      (await safeRead(response)).slice(0, 500),
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string }; text?: string }>;
  };
  const text = payload.choices?.[0]?.message?.content ?? payload.choices?.[0]?.text ?? '';
  if (!text.trim()) {
    throw new NatlasError('llm', 502, 'N-ATLaS Inference Endpoint returned an empty completion.');
  }
  return { text: cleanCompletion(text) };
}

/** Strips chat-template residue and any leaked preamble the base model may emit. */
function cleanCompletion(raw: string): string {
  let text = raw.trim();
  text = text.replace(/<\|start_header_id\|>assistant<\|end_header_id\|>\s*/i, '');
  text = text.replace(/<\/?s>/g, '').trim();
  // Some llama.cpp builds repeat the prompt; cut anything after an obvious loop restart.
  const loopMarker = text.search(/\n(sannu|nọọ|pẹ̀lẹ́|hello|hi)\b.*\n/i);
  if (loopMarker > 200) {
    text = text.slice(0, loopMarker).trim();
  }
  return text;
}

async function safeRead(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '<unreadable body>';
  }
}

/**
 * Keeps the prompt inside N-ATLaS's documented 8,092-token context.
 * Characters-per-token is set conservatively (3.2) because Hausa/Igbo/Yorùbá
 * orthography with diacritics tokenises less efficiently than the English
 * figures N-ATLaS was benchmarked on.
 */
export function trimToContext(
  system: string,
  history: ChatMessage[],
  maxChars = 18_000,
): ChatMessage[] {
  const trimmedSystem = system.slice(0, Math.floor(maxChars * 0.35));
  let budget = maxChars - trimmedSystem.length;
  const kept: ChatMessage[] = [];

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const message = history[i];
    if (message.content.length > budget) {
      if (kept.length === 0) {
        // Never drop the latest user turn entirely: hard-truncate it instead.
        kept.unshift({ ...message, content: message.content.slice(0, Math.max(0, budget)) });
      }
      break;
    }
    budget -= message.content.length;
    kept.unshift(message);
  }

  return [{ role: 'system', content: trimmedSystem }, ...kept];
}
