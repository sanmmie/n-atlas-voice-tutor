import type { Config } from 'tailwindcss';

/**
 * Colour themes are driven by CSS custom properties set on <html data-theme="...">
 * so that switching language re-themes the whole application without a reload.
 * See src/app/globals.css for the palettes and src/lib/languages.ts for motifs.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
        gold: 'rgb(var(--gold) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
      },
      keyframes: {
        pulseRing: {
          '0%': { transform: 'scale(0.94)', opacity: '0.55' },
          '70%': { transform: 'scale(1.25)', opacity: '0' },
          '100%': { transform: 'scale(1.25)', opacity: '0' },
        },
        riseIn: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'pulse-ring': 'pulseRing 1.8s cubic-bezier(0.2, 0.6, 0.3, 1) infinite',
        'rise-in': 'riseIn 0.28s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
