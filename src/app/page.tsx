import Link from 'next/link';
import { cookies } from 'next/headers';
import { MotifBackground } from '@/components/MotifBackground';
import { LanguagePicker } from '@/components/LanguagePicker';
import { isLanguageCode, type LanguageCode } from '@/lib/languages';
import { NATLAS_ALL_ATTRIBUTIONS, NATLAS_TEAM_ATTRIBUTION } from '@/lib/natlas/attribution';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const stored = cookies().get('natlas_theme')?.value;
  const language: LanguageCode = isLanguageCode(stored) ? stored : 'hausa';

  return (
    <>
      <MotifBackground language={language} />
      <main id="main" className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col justify-center gap-10 px-5 py-12">
        <header className="text-center">
          <p className="chip mx-auto">NAIC 2026 · Problem Statement 02 · Voice-First Access</p>
          <h1
            className="mt-5 text-4xl font-bold leading-tight sm:text-5xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Learn Hausa, Igbo or Yorùbá
            <span className="block text-accent">by speaking</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            No typing or account required. This mobile web app is designed for low-data use. Choose a
            language, hold the microphone, and talk with a tutor powered by Nigeria&apos;s N-ATLaS models.
          </p>
        </header>

        <div className="flex justify-center">
          <LanguagePicker current={language} />
        </div>

        <section className="mx-auto grid w-full max-w-2xl gap-3 text-sm text-muted sm:grid-cols-3">
          <div className="card !p-4">
            <strong className="block text-ink">Built for low bandwidth</strong>
            Audio is compressed in the browser and transcribed server-side; the UI ships under 100&nbsp;kB.
          </div>
          <div className="card !p-4">
            <strong className="block text-ink">Guest by default</strong>
            No login. A random identifier on your own device groups your sessions for progress tracking.
          </div>
          <div className="card !p-4">
            <strong className="block text-ink">
              <Link href="/validation" className="underline underline-offset-4">
                Validation report
              </Link>
            </strong>
            Restricted evidence dashboard for the NAIC submission.
          </div>
        </section>

        <footer className="text-center text-xs leading-relaxed text-muted">
          {NATLAS_ALL_ATTRIBUTIONS.map((attribution) => <p key={attribution}>{attribution}</p>)}
          <p className="mt-2">
            <Link href="/team" className="underline underline-offset-4 hover:text-ink">
              {NATLAS_TEAM_ATTRIBUTION}
            </Link>
          </p>
          <p className="mt-1">
            Tutor behaviour is experimental. Yorùbá responses are noticeably weaker than Hausa and Igbo — see
            the limitations document.
          </p>
        </footer>
      </main>
    </>
  );
}
