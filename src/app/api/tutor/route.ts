import { NextResponse } from 'next/server';
import { z } from 'zod';
import { completeWithNatlas, NatlasError, trimToContext } from '@/lib/natlas/llm';
import { buildTutorSystemPrompt } from '@/lib/natlas/tutor-prompt';
import { isLanguageCode } from '@/lib/languages';
import { deriveSignals, parseLanguage } from '@/lib/tutor/turn';
import { resolveLevel } from '@/lib/tutor/difficulty';
import { refusalFor, screenTopic } from '@/lib/tutor/safety';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const bodySchema = z.object({
  language: z.string(),
  /** Prior turns, oldest first. */
  history: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string().max(6000),
      }),
    )
    .max(40)
    .default([]),
  /** The learner's transcribed utterance. Omitted for the opening greeting. */
  transcript: z.string().max(6000).optional(),
  /** Fixed level, e.g. for a "practice this phrase" drill. */
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

/**
 * POST /api/tutor
 *
 * Text half of the loop: an already-transcribed learner utterance in, an N-ATLaS
 * tutor reply out. The voice client normally calls /api/turn (which chains ASR and
 * the LLM server-side so the logged model evidence cannot be forged), but this
 * endpoint is the documented LLM entry point and is what the demo video calls when
 * demonstrating N-ATLaS directly.
 */
export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid body' }, { status: 400 });
    }

    const language = parseLanguage(isLanguageCode(parsed.data.language) ? parsed.data.language : null);
    const history = parsed.data.history;
    const learnerText = parsed.data.transcript?.trim() ?? '';

    const signals = deriveSignals(learnerText ? [...history, { role: 'user' as const, content: learnerText }] : history);
    const level = parsed.data.level ?? resolveLevel(signals);

    if (learnerText) {
      const screen = screenTopic(learnerText);
      if (screen.blocked) {
        return NextResponse.json({
          reply: refusalFor(language),
          blocked: true,
          level,
          model: null,
          latencyMs: null,
        });
      }
    }

    const system = buildTutorSystemPrompt({
      language,
      level,
      turnCount: signals.turnCount,
      mistakeSignals: signals.mistakeSignals,
    });

    const messages = trimToContext(system, learnerText ? [...history, { role: 'user', content: learnerText }] : history);

    // N-ATLaS LLM INVOCATION (official NCAIR1/N-ATLaS weights).
    const completion = await completeWithNatlas(messages, { maxTokens: 260 });

    const outputScreen = screenTopic(completion.text);
    const reply = outputScreen.blocked ? refusalFor(language) : completion.text;

    return NextResponse.json({
      reply,
      blocked: outputScreen.blocked,
      level,
      model: completion.model,
      provider: completion.provider,
      latencyMs: completion.latencyMs,
      promptChars: completion.promptChars,
    });
  } catch (error) {
    if (error instanceof NatlasError) {
      return NextResponse.json({ error: error.message, detail: error.detail }, { status: error.status });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
