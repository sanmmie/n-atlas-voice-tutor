import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { isLanguageCode, type LanguageCode } from '@/lib/languages';
import { NATLAS_ALL_ATTRIBUTIONS } from '@/lib/natlas/attribution';

export const metadata: Metadata = {
  title: 'N-ATLaS Voice Tutor — Hausa, Igbo and Yorùbá by speech',
  description:
    'A voice-first language tutor for Hausa, Igbo and Yorùbá, built on Nigeria’s N-ATLaS speech recognition and language models for the NAIC 2026 Voice-First Access problem statement.',
  applicationName: 'N-ATLaS Voice Tutor',
  other: { 'n-atlas-attribution': NATLAS_ALL_ATTRIBUTIONS.join(' ') },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#1c1612' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The theme is read from a cookie so the first paint is already in the right
  // cultural palette instead of flashing the default theme.
  const stored = cookies().get('natlas_theme')?.value;
  const language: LanguageCode = isLanguageCode(stored) ? stored : 'hausa';

  return (
    <html lang="en" data-theme={language}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-gold focus:px-4 focus:py-2 focus:text-black"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
