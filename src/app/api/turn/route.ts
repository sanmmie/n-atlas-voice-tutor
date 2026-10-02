import { NextResponse } from 'next/server';
import { z } from 'zod';
import { NatlasError } from '@/lib/natlas/llm';
import { isLanguageCode, LANGUAGES } from '@/lib/languages';
import { parseLanguage, runTurn } from '@/lib/tutor/turn';
import { logInteraction, newInteractionLog } from '@/lib/store/interactions';
import { getConfig } from '@/lib/natlas/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const metaSchema = z.object({
  sessionId: z.string().min(8).max(64),
  userId: z.string().min(4).max(64),
  authenticated: z.boolean().default(false),
  language: z.string(),
  history: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string().max(6000),
      }),
    )
    .max(40)
    .default([]),
  audioSeconds: z.number().min(0).max(600).nullable().default(null),
  sessionStartedAt: z.string().datetime().nullable().default(null),
  networkType: z.string().max(32).nullable().default(null),
  /**
   * Typed fallback for devices without a usable microphone (desktop demos, some
   * kiosk browsers). Recorded as a typed turn: no N-ATLaS ASR call is made.
   */
  text: z.string().max(6000).optional(),
});

/**
 * Parses the multipart `meta` field, tolerating a UTF-8 BOM from tooling that
 * writes the JSON to a file (PowerShell, some shell heredocs) before curl sends it.
 */
function parseMeta(raw: FormDataEntryValue | null): unknown {
  const text = String(raw ?? '{}').replace(/^\uFEFF/, '').trim();
  return JSON.parse(text.length ? text : '{}');
}

/**
 * POST /api/turn
 *
 * The production path used by the voice client. Audio goes up, and one atomic
 * server-side exchange happens:
 *
 *   N-ATLaS ASR (NCAIR1/<Language>-ASR)
 *     -> topic guard
 *     -> N-ATLaS LLM (NCAIR1/N-ATLaS) with the language-tutor system prompt
 *     -> topic guard on the reply
 *     -> interaction logged
 *
 * Chaining on the server is deliberate: the ASR and LLM checkpoints recorded in
 * the log are the ones that actually answered, not values sent by the browser.
 *
 * Request: multipart/form-data with
 *   audio (blob)          recorded utterance
 *   meta  (JSON string)   session metadata (schema above)
 */
export async function POST(request: Request) {
  let meta: z.infer<typeof metaSchema> | null = null;
  try {
    const form = await request.formData();
    const audio = form.get('audio');
    const rawMeta = form.get('meta');

    const parsedMeta = metaSchema.safeParse(parseMeta(rawMeta));
    if (!parsedMeta.success) {
      return NextResponse.json(
        { error: 'invalid meta', detail: parsedMeta.error.issues },
        { status: 400 },
      );
    }
    meta = parsedMeta.data;

    const hasAudio = audio instanceof File && audio.size > 0;
    const hasText = Boolean(meta.text && meta.text.trim());

    if (!hasAudio && !hasText) {
      return NextResponse.json(
        { error: 'Provide either an "audio" file or a non-empty "text" value in meta.' },
        { status: 400 },
      );
    }

    const language = parseLanguage(isLanguageCode(meta.language) ? meta.language : null);

    // Single utterance is capped to the ASR checkpoint's 30s window by the browser
    // (see src/lib/audio.ts); anything longer is chunked inside the ASR service.
    const result = await runTurn(
      hasAudio ? await (audio as File).arrayBuffer() : null,
      {
        sessionId: meta.sessionId,
        userId: meta.userId,
        authenticated: meta.authenticated,
        language,
        history: meta.history,
        audioSeconds: meta.audioSeconds,
        networkType: meta.networkType,
        typedTranscript: hasText ? meta.text : undefined,
      },
      hasAudio ? (audio as File).type : 'text/plain',
    );

    const config = getConfig();
    const sessionDurationSeconds = meta.sessionStartedAt
      ? Math.max(0, Math.round((Date.now() - Date.parse(meta.sessionStartedAt)) / 1000))
      : null;

    const record = newInteractionLog({
      sessionId: meta.sessionId,
      userId: meta.userId,
      authenticated: meta.authenticated,
      language,
      level: result.level,
      turnIndex: result.turnIndex,
      inputTranscript: result.inputTranscript,
      outputTranscript: result.reply,
      audioSeconds: meta.audioSeconds,
      sessionDurationSeconds,
      asrModel: result.asrModel,
      asrLatencyMs: result.asrLatencyMs,
      llmModel: result.llmModel,
      llmLatencyMs: result.llmLatencyMs,
      ttsEngine: 'none',
      blocked: result.blocked,
      error: null,
      rating: null,
      networkType: meta.networkType,
    });

    await logInteraction(record).catch((error) => {
      console.error('[n-atlas] failed to persist interaction', error);
    });

    const definition = LANGUAGES[language];
    return NextResponse.json({
      interactionId: record.id,
      input: {
        text: result.inputTranscript,
        model: result.asrModel,
        latencyMs: result.asrLatencyMs,
      },
      reply: {
        text: result.reply,
        model: result.llmModel,
        latencyMs: result.llmLatencyMs,
        provider: config.NATLAS_LLM_PROVIDER,
      },      level: result.level,
      blocked: result.blocked,
      typed: result.typed,
      turnIndex: result.turnIndex,
      signals: result.signals,
      nextPrompts: definition.prompts[result.level].slice(0, 2),
      qualityNote: definition.qualityNote,
    });
  } catch (error) {
    if (meta) {
      await logInteraction(
        newInteractionLog({
          sessionId: meta.sessionId,
          userId: meta.userId,
          authenticated: meta.authenticated,
          language: isLanguageCode(meta.language) ? meta.language : 'hausa',
          level: 'beginner',
          turnIndex: meta.history.filter((m) => m.role === 'user').length,
          inputTranscript: '',
          outputTranscript: '',
          audioSeconds: meta.audioSeconds,
          sessionDurationSeconds: null,
          asrModel: null,
          asrLatencyMs: null,
          llmModel: null,
          llmLatencyMs: null,
          ttsEngine: 'none',
          blocked: false,
          error: (error as Error).message.slice(0, 300),
          rating: null,
          networkType: meta.networkType,
        }),
      ).catch(() => undefined);
    }

    if (error instanceof NatlasError) {
      return NextResponse.json({ error: error.message, detail: error.detail }, { status: error.status });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
