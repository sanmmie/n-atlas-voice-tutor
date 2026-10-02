import Link from 'next/link';
import { cookies } from 'next/headers';
import { MotifBackground } from '@/components/MotifBackground';
import { VoiceTutor } from '@/components/VoiceTutor';
import { LANGUAGES, LANGUAGE_ORDER, isLanguageCode, type LanguageCode } from '@/lib/languages';
import { NATLAS_ATTRIBUTION, NATLAS_LLM_MODEL_CARD } from '@/lib/natlas/attribution';

export const dynamic = 'force-dynamic';

function resolveLanguage(param: string | undefined): LanguageCode {
  if (isLanguageCode(param)) return param;
  const stored = cookies().get('natlas_theme')?.value;
  return isLanguageCode(stored) ? stored : 'hausa';
}

export default function SessionPage({ searchParams }: { searchParams: { lang?: string } }) {
  const language = resolveLanguage(searchParams.lang);
  const definition = LANGUAGES[language];

  return (
    <>
      <MotifBackground language={language} />
      <main id="main" className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 py-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/" className="text-xs text-muted underline underline-offset-4 hover:text-ink">
              ← Change language
            </Link>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              {definition.endonym} voice tutor
            </h1>
            <p className="text-xs text-muted">{definition.culture}</p>
          </div>
          <nav aria-label="Switch language" className="flex gap-2">
            {LANGUAGE_ORDER.map((code) => (
              <Link
                key={code}
                href={`/session?lang=${code}`}
                aria-current={code === language ? 'page' : undefined}
                className={[
                  'rounded-lg border px-3 py-2 text-sm',
                  code === language
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-white/15 text-muted hover:text-ink',
                ].join(' ')}
              >
                {LANGUAGES[code].endonym}
              </Link>
            ))}
          </nav>
        </header>

        <VoiceTutor language={language} />

        <footer className="text-center text-[11px] leading-relaxed text-muted">
          <p>{NATLAS_ATTRIBUTION}</p>
          <p className="mt-1">
            N-ATLaS model card:{' '}
            <a href={NATLAS_LLM_MODEL_CARD} className="underline underline-offset-4">
              {NATLAS_LLM_MODEL_CARD}
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}
