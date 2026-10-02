import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/natlas/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 *
 * Reports which official N-ATLaS models this deployment is wired to. Used as
 * integration evidence in the demo video: the on-screen panel shows the exact
 * checkpoint answering each turn, and this endpoint is what `/docs` links to.
 */
export async function GET() {
  let config: ReturnType<typeof getConfig> | null = null;
  let configError: string | null = null;

  try {
    config = getConfig();
  } catch (error) {
    configError = (error as Error).message;
  }

  if (!config) {
    return NextResponse.json(
      { ok: false, status: 'misconfigured', error: configError },
      { status: 500 },
    );
  }

  const base = config.NATLAS_LLM_BASE_URL.replace(/\/$/, '');

  const checks = await Promise.all([
    probeLlm(config.NATLAS_LLM_PROVIDER, config.NATLAS_LLM_MODEL, base, config.NATLAS_LLM_API_KEY),
    probeAsr(config.NATLAS_ASR_BASE_URL, config.NATLAS_ASR_API_KEY),
  ]);

  const [llm, asr] = checks;

  return NextResponse.json(
    {
      ok: llm.ok && asr.ok,
      status: llm.ok && asr.ok ? 'operational' : 'degraded',
      provider: 'Awarri Technologies / NCAIR / Federal Ministry of Communications, Innovation and Digital Economy',
      attribution:
        'N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.',
      llm,
      asr,
      logDriver: config.LOG_DRIVER,
      timestamp: new Date().toISOString(),
    },
    { status: llm.ok && asr.ok ? 200 : 503 },
  );
}

async function probeLlm(
  provider: string,
  model: string,
  base: string,
  apiKey: string | undefined,
): Promise<{ ok: boolean; model: string; provider: string; detail: string; official: boolean }> {
  const official = model.startsWith('NCAIR1/');
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const url =
      provider === 'hf-inference-endpoint'
        ? `${base}/v1/models`
        : `${base}/models`;
    const response = await fetch(url, {
      headers: apiKey ? { authorization: `Bearer ${apiKey}` } : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    const body = await response.text();
    return {
      ok: response.ok,
      model,
      provider,
      detail: response.ok ? body.slice(0, 200) : `${response.status} ${body.slice(0, 200)}`,
      official,
    };
  } catch (error) {
    return { ok: false, model, provider, detail: (error as Error).message, official };
  }
}

async function probeAsr(
  baseUrl: string,
  apiKey: string | undefined,
): Promise<{ ok: boolean; baseUrl: string; models: string[]; detail: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/health`, {
      headers: apiKey ? { authorization: `Bearer ${apiKey}` } : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!response.ok) {
      return {
        ok: false,
        baseUrl,
        models: [],
        detail: `${response.status} ${(await response.text()).slice(0, 200)}`,
      };
    }
    const payload = (await response.json()) as { models?: string[] };
    const models = (payload.models ?? []).filter((id) => id.startsWith('NCAIR1/'));
    return {
      ok: models.length >= 3,
      baseUrl,
      models,
      detail: models.length >= 3 ? 'N-ATLaS ASR checkpoints loaded' : 'expected 3 NCAIR1 ASR checkpoints',
    };
  } catch (error) {
    return { ok: false, baseUrl, models: [], detail: (error as Error).message };
  }
}
