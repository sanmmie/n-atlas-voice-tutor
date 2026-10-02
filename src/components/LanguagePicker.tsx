'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LANGUAGE_ORDER, LANGUAGES, type LanguageCode } from '@/lib/languages';
import { clearHistory } from '@/lib/session';
import { NATLAS_ATTRIBUTION, NATLAS_TEAM_ATTRIBUTION } from '@/lib/natlas/attribution';

export function LanguagePicker({ current }: { current: LanguageCode }) {
  const router = useRouter();
  const [pending, setPending] = useState<LanguageCode | null>(null);

  function select(code: LanguageCode) {
    setPending(code);
    if (code !== current) clearHistory();
    document.cookie = `natlas_theme=${code}; path=/; max-age=31536000; samesite=lax`;
    router.push(`/session?lang=${code}`);
  }

  return (
    <div className="w-full max-w-3xl">
      <ul className="grid gap-4 sm:grid-cols-3">
        {LANGUAGE_ORDER.map((code) => {
          const language = LANGUAGES[code];
          const isCurrent = code === current;
          return (
            <li key={code}>
              <button
                type="button"
                onClick={() => select(code)}
                disabled={pending !== null}
                data-theme={code}
                aria-current={isCurrent ? 'true' : undefined}
                className={[
                  'group flex h-full w-full flex-col items-start gap-3 rounded-2xl border p-6 text-left transition',
                  'border-white/10 bg-elevated/70 hover:-translate-y-0.5 hover:border-white/25 hover:bg-elevated',
                  isCurrent ? 'ring-2 ring-gold/70' : '',
                  pending === code ? 'opacity-60' : '',
                ].join(' ')}
              >
                <span
                  aria-hidden
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl font-bold"
                  style={{ background: 'rgb(var(--accent-soft))', color: 'rgb(var(--accent))' }}
                >
                  {language.endonym.slice(0, 1)}
                </span>
                <span className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                  {language.endonym}
                </span>
                <span className="text-sm text-muted">{language.culture}</span>
                <span className="mt-auto pt-2 text-xs text-muted">
                  Recognised by <code className="text-ink/80">{language.asrModel}</code>
                </span>
                {isCurrent ? <span className="chip">Current</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-center text-xs leading-relaxed text-muted">
        {NATLAS_ATTRIBUTION}
      </p>
      <p className="mt-2 text-center text-xs text-muted">
        <Link href="/team" className="underline underline-offset-4 hover:text-ink">
          {NATLAS_TEAM_ATTRIBUTION}
        </Link>
      </p>
    </div>
  );
}
