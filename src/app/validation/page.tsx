import Link from 'next/link';
import { readMergedInteractions, summarise, type InteractionLog } from '@/lib/store/interactions';
import { NATLAS_ATTRIBUTION, NATLAS_TEAM_ATTRIBUTION } from '@/lib/natlas/attribution';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * /validation
 *
 * The NAIC real-world-validation surface. Reads the live interaction log and
 * reports exactly what it contains, including the count of documented real user
 * interactions that Problem Statement 02 requires (minimum 50).
 */
export default async function ValidationPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  let rows: InteractionLog[] = [];
  let failure: string | null = null;

  try {
    rows = await readMergedInteractions();
  } catch (error) {
    failure = (error as Error).message;
  }

  const summary = summarise(rows);
  const token = searchParams.token;

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-6 px-5 py-10">
      <header>
        <Link href="/" className="text-xs text-muted underline underline-offset-4 hover:text-ink">
          ← Back to the tutor
        </Link>
        <h1 className="mt-3 text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          Real-world validation
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Every spoken turn is logged with the exact N-ATLaS checkpoints that handled it. NAIC Problem
          Statement 02 requires at least 50 documented real learner interactions; the current live count is
          shown below.
        </p>
      </header>

      {failure ? (
        <p role="alert" className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
          Could not read the interaction log: {failure}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Documented interactions" value={summary.totalInteractions} highlight />
        <Stat label="Unique learners" value={summary.uniqueLearners} />
        <Stat label="Sessions" value={summary.uniqueSessions} />
        <Stat label="Sessions per learner" value={summary.sessionsPerLearner} />
        <Stat label="Avg session length" value={`${summary.averageSessionDurationSeconds}s`} />
        <Stat label="Avg learner utterance" value={`${summary.averageInputChars} chars`} />
        <Stat label="Avg tutor reply" value={`${summary.averageOutputChars} chars`} />
        <Stat
          label="Avg learner rating"
          value={summary.averageRating === null ? '—' : `${summary.averageRating} / 5 (${summary.ratingsCount})`}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">Language distribution</h2>
          <Distribution data={summary.languageDistribution} total={summary.totalInteractions} />
        </div>
        <div className="card">
          <h2 className="font-semibold">Difficulty levels</h2>
          <Distribution data={summary.levelDistribution} total={summary.totalInteractions} />
        </div>
        <div className="card">
          <h2 className="font-semibold">N-ATLaS checkpoints used</h2>
          <Distribution data={{ ...summary.asrModelsUsed, ...summary.llmModelsUsed }} total={summary.totalInteractions} />
        </div>
        <div className="card">
          <h2 className="font-semibold">Weekly active learners</h2>
          {summary.weeklyActiveUsers.length === 0 ? (
            <p className="text-sm text-muted">No interactions logged yet.</p>
          ) : (
            <table className="mt-2 w-full text-left text-sm">
              <thead>
                <tr className="text-muted">
                  <th className="py-1">Week starting</th>
                  <th className="py-1">Learners</th>
                  <th className="py-1">Interactions</th>
                </tr>
              </thead>
              <tbody>
                {summary.weeklyActiveUsers.map((week) => (
                  <tr key={week.week} className="border-t border-white/5">
                    <td className="py-1">{week.week}</td>
                    <td className="py-1">{week.learners}</td>
                    <td className="py-1">{week.interactions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold">Export</h2>
        <p className="mt-1 text-sm text-muted">
          The CSV export is what the NAIC submission attaches. It contains the same rows shown above,
          including full transcripts.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            className="btn-primary"
            href={token ? `/api/export?format=csv&token=${encodeURIComponent(token)}` : '#export-unavailable'}
          >
            Download CSV
          </a>
          <a
            className="btn-ghost"
            href={token ? `/api/export?format=json&token=${encodeURIComponent(token)}` : '#export-unavailable'}
          >
            Download JSON + summary
          </a>
        </div>
        {!token ? (
          <p id="export-unavailable" className="mt-2 text-xs text-muted">
            Set <code>ADMIN_TOKEN</code> on the deployment and append <code>?token=…</code> to this URL to
            enable downloads.
          </p>
        ) : null}
        <p className="mt-3 text-xs text-muted">
          Blocked turns: {summary.blockedTurns} · failed turns: {summary.errorTurns}
        </p>
      </section>

      <footer className="text-center text-[11px] text-muted">
        <p>{NATLAS_ATTRIBUTION}</p>
        <p className="mt-1">
          <Link href="/team" className="underline underline-offset-4 hover:text-ink">
            {NATLAS_TEAM_ATTRIBUTION}
          </Link>
        </p>
      </footer>
    </main>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className={highlight ? 'card ring-2 ring-gold/50' : 'card'}>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Distribution({ data, total }: { data: Record<string, number>; total: number }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <p className="mt-2 text-sm text-muted">Nothing logged yet.</p>;

  return (
    <ul className="mt-2 space-y-2 text-sm">
      {entries.map(([key, count]) => (
        <li key={key}>
          <div className="flex justify-between gap-3">
            <span className="truncate">{key}</span>
            <span className="text-muted">{count}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${total === 0 ? 0 : Math.round((count / total) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
