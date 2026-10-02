import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logFeedback, newFeedbackLog } from '@/lib/store/interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  interactionId: z.string().uuid(),
  rating: z.number().int().min(1).max(5).nullable().default(null),
  ttsEngine: z.enum(['phrase-library', 'web-speech', 'none']).default('none'),
  error: z.string().max(500).nullable().default(null),
});

/**
 * POST /api/log
 *
 * Attaches learner feedback (1-5 rating, which TTS engine spoke the reply) and
 * browser-side errors to an interaction that /api/turn already recorded.
 */
export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid body' }, { status: 400 });
    }

    await logFeedback(
      newFeedbackLog({
        interactionId: parsed.data.interactionId,
        rating: parsed.data.rating,
        ttsEngine: parsed.data.ttsEngine,
        error: parsed.data.error,
      }),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
