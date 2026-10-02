import type { LanguageCode } from '@/lib/languages';

const MOTIFS: Record<LanguageCode, React.ReactNode> = {
  // Hausa: the interlocking lattice of carved Hausa building screens.
  hausa: (
    <pattern id="motif-hausa" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M0 24h48M24 0v48" stroke="rgb(var(--gold) / 0.16)" strokeWidth="1" />
      <path d="M12 12l12 12-12 12M36 12L24 24l12 12" fill="none" stroke="rgb(var(--gold) / 0.12)" strokeWidth="1" />
      <rect x="20" y="20" width="8" height="8" fill="none" stroke="rgb(var(--gold) / 0.2)" strokeWidth="1" />
    </pattern>
  ),
  // Igbo: uli-style continuous chalk line, drawn as looping paths.
  igbo: (
    <pattern id="motif-igbo" width="56" height="56" patternUnits="userSpaceOnUse">
      <path
        d="M0 28c8-14 20-14 28 0s20 14 28 0"
        fill="none"
        stroke="rgb(var(--accent) / 0.22)"
        strokeWidth="1.5"
      />
      <path
        d="M0 8c8 14 20 14 28 0s20-14 28 0"
        fill="none"
        stroke="rgb(var(--ink) / 0.12)"
        strokeWidth="1.5"
      />
      <circle cx="28" cy="28" r="2.5" fill="rgb(var(--ink) / 0.18)" />
      <circle cx="28" cy="8" r="1.5" fill="rgb(var(--gold) / 0.3)" />
    </pattern>
  ),
  // Yoruba: adire resist-dye blocks and dot rows.
  yoruba: (
    <pattern id="motif-yoruba" width="44" height="44" patternUnits="userSpaceOnUse">
      <rect x="6" y="6" width="14" height="14" fill="none" stroke="rgb(var(--ink) / 0.14)" />
      <rect x="24" y="24" width="14" height="14" fill="none" stroke="rgb(var(--ink) / 0.14)" />
      <path d="M6 27h14M27 6v14" stroke="rgb(var(--gold) / 0.22)" strokeWidth="1.5" />
      <circle cx="37" cy="9" r="1.4" fill="rgb(var(--gold) / 0.35)" />
      <circle cx="9" cy="37" r="1.4" fill="rgb(var(--accent) / 0.4)" />
    </pattern>
  ),
};

export function MotifBackground({ language }: { language: LanguageCode }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgb(var(--accent-soft)),transparent_55%)]" />
      <svg className="absolute inset-0 h-full w-full opacity-70">
        <defs>{MOTIFS[language]}</defs>
        <rect width="100%" height="100%" fill={`url(#motif-${language})`} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/50 to-transparent" />
    </div>
  );
}
