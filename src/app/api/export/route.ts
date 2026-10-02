import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { readMergedInteractions, summarise, toCsv } from '@/lib/store/interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/export?format=csv|json
 *
 * NAIC submission artefact: exports every logged interaction with the exact
 * N-ATLaS checkpoints that handled each turn. Protected by ADMIN_TOKEN because the
 * rows contain full transcripts.
 */
export async function GET(request: Request) {
  const adminToken = process.env.ADMIN_TOKEN;
  const provided = new URL(request.url).searchParams.get('token');

  if (!adminToken) {
    return NextResponse.json(
      { error: 'ADMIN_TOKEN is not configured on this deployment.' },
      { status: 503 },
    );
  }
  if (!provided || !safeEqual(provided, adminToken)) {
    return NextResponse.json({ error: 'Invalid export token.' }, { status: 401 });
  }

  const format = new URL(request.url).searchParams.get('format') ?? 'csv';
  const rows = await readMergedInteractions();

  if (format === 'json') {
    return NextResponse.json({ rows, summary: summarise(rows) });
  }

  const csv = toCsv(rows);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="n-atlas-interactions-${stamp}.csv"`,
      'x-interaction-count': String(rows.length),
    },
  });
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
