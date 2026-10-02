import { NextResponse } from 'next/server';
import { transcribeWithNatlas } from '@/lib/natlas/asr';
import { NatlasError } from '@/lib/natlas/llm';
import { isLanguageCode } from '@/lib/languages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/asr
 *
 * Standalone N-ATLaS ASR endpoint. Part of the required data flow
 * (`User speaks -> POST /api/asr -> N-ATLaS ASR -> transcription`) and useful for
 * judges who want to exercise the recogniser on their own Hausa/Igbo/Yorùbá clips
 * without going through the tutor loop.
 *
 * Request: multipart/form-data with
 *   audio    (blob, webm/opus | wav | m4a | ogg)
 *   language (hausa | igbo | yoruba)
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const audio = form.get('audio');
    const language = form.get('language');

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: 'multipart field "audio" is required.' }, { status: 400 });
    }
    if (!isLanguageCode(language)) {
      return NextResponse.json({ error: 'field "language" must be hausa, igbo or yoruba.' }, { status: 400 });
    }
    if (audio.size === 0) {
      return NextResponse.json({ error: 'audio clip was empty.' }, { status: 400 });
    }

    // N-ATLaS ASR INVOCATION (official NCAIR1/<Language>-ASR checkpoint).
    const result = await transcribeWithNatlas(await audio.arrayBuffer(), {
      language,
      mimeType: audio.type,
      fileName: audio.name,
    });

    return NextResponse.json({
      text: result.text,
      model: result.model,
      language: result.language,
      latencyMs: result.latencyMs,
      durationSeconds: result.durationSeconds,
      bytes: audio.size,
    });
  } catch (error) {
    if (error instanceof NatlasError) {
      return NextResponse.json({ error: error.message, detail: error.detail }, { status: error.status });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
