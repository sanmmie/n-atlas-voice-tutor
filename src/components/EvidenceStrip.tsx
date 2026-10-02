'use client';

export interface Evidence {
  asrModel: string | null;
  asrLatencyMs: number | null;
  llmModel: string | null;
  llmLatencyMs: number | null;
  provider: string;
  typed: boolean;
  interactionId: string;
}

/**
 * On-screen N-ATLaS integration evidence.
 *
 * A judge opening the live link should be able to see, without reading any code,
 * exactly which official checkpoints answered the last turn. This panel is what the
 * demo video keeps on screen.
 */
export function EvidenceStrip({ evidence, qualityNote }: { evidence: Evidence | null; qualityNote: string }) {
  return (
    <section aria-label="N-ATLaS integration evidence" className="card !p-4 text-xs">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-semibold uppercase tracking-wide text-gold">Powered by N-ATLaS</span>
        {evidence ? (
          <>
            <span className="chip">
              ASR <code>{evidence.asrModel ?? 'skipped (typed turn)'}</code>
              {evidence.asrLatencyMs !== null ? ` · ${evidence.asrLatencyMs} ms` : ''}
            </span>
            <span className="chip">
              LLM <code>{evidence.llmModel ?? 'not called (topic guard)'}</code>
              {evidence.llmLatencyMs !== null ? ` · ${evidence.llmLatencyMs} ms · ${evidence.provider}` : ''}
            </span>
          </>
        ) : (
          <span className="text-muted">Waiting for the first spoken turn…</span>
        )}
      </div>
      <p className="mt-2 text-muted">{qualityNote}</p>
    </section>
  );
}
