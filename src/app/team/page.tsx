import Link from 'next/link';
import { cookies } from 'next/headers';
import { MotifBackground } from '@/components/MotifBackground';
import {
  NATLAS_ALL_ATTRIBUTIONS,
  NATLAS_LLM_MODEL_CARD,
  NATLAS_TEAM_ATTRIBUTION,
  NATLAS_TEAM,
} from '@/lib/natlas/attribution';
import { isLanguageCode, type LanguageCode } from '@/lib/languages';

export const dynamic = 'force-dynamic';

export default function TeamPage() {
  const stored = cookies().get('natlas_theme')?.value;
  const language: LanguageCode = isLanguageCode(stored) ? stored : 'hausa';

  return (
    <>
      <MotifBackground language={language} />
      <main
        id="main"
        className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-10 px-5 py-12"
      >
        <header>
          <Link
            href="/"
            className="text-xs text-muted underline underline-offset-4 hover:text-ink"
          >
            ← Back to the tutor
          </Link>
          <h1
            className="mt-3 text-3xl font-bold sm:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Team
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            N-ATLaS Voice Tutor is a voice-first language tutor for Hausa, Igbo
            and Yorùbá, built on Nigeria’s N-ATLaS speech recognition and
            language models for the NAIC 2026 Voice-First Access problem
            statement.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NATLAS_TEAM.map((member) => (
            <div key={member.name} className="card">
              <h2 className="text-lg font-semibold">{member.name}</h2>
              <p className="mt-1 text-sm text-accent">{member.role}</p>
              <p className="mt-1 text-sm text-muted">{member.affiliation}</p>
            </div>
          ))}
        </section>

        <section className="card">
          <h2 className="font-semibold">Acknowledgements</h2>
          {NATLAS_ALL_ATTRIBUTIONS.map((attribution) => (
            <p key={attribution} className="mt-2 text-sm text-muted">{attribution}</p>
          ))}
          <p className="mt-2 text-sm text-muted">
            N-ATLaS model card:{' '}
            <a
              href={NATLAS_LLM_MODEL_CARD}
              className="underline underline-offset-4"
            >
              {NATLAS_LLM_MODEL_CARD}
            </a>
          </p>
        </section>

        <footer className="text-center text-xs text-muted">
          <p>{NATLAS_TEAM_ATTRIBUTION}</p>
        </footer>
      </main>
    </>
  );
}
