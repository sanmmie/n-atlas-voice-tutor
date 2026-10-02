# Pre-recorded phrase library

N-ATLaS ships **no text-to-speech model**, so the tutor needs a separate voice
layer. This directory holds the highest-quality tier: short audio files recorded
by native speakers, for the exact strings the tutor repeats most.

## How matching works

`src/lib/tts.ts` loads `manifest.json` for the selected language and compares the
tutor's reply against each `text` entry after:

1. lowercasing,
2. stripping combining diacritics,
3. removing `. , ! ? ; : ¿ ¡ …` and collapsing whitespace.

An exact match plays `file`. Anything unmatched falls through to the browser
`SpeechSynthesis` engine (`ha-NG`, `ig-NG`, `yo-NG`), which is a documented
fallback with real limitations — most Android devices ship no Yorùbá voice at all,
and none of the browser voices are guaranteed to be pronounced by a native
speaker. `docs/tts.md` states this openly rather than hiding it.

## Which phrases to record

Record at minimum, per language:

| Key phrase | Why it matters |
| --- | --- |
| The greeting in `src/lib/languages.ts` | Spoken on every first visit |
| The topic-guard refusal in `src/lib/tutor/safety.ts` | Must sound calm, never preachy |
| The 2 beginner prompts in `src/lib/languages.ts` | Suggested on the idle screen |

Everything else is free-form and will use the browser voice.

## Recording guidance

- 22.05 kHz mono, 64 kbps MP3 is plenty for speech and keeps the page light on a
  metered connection.
- One sentence per file, no background music, no reverb.
- Name files `greeting-01.mp3`, `refusal-01.mp3`, `prompt-01.mp3`, … and add a
  matching `{ "text": "<exact reply>", "file": "..." }` entry.

## Licensing and consent

Only record volunteers who have agreed to their voice being published inside an
open-source repository. Do not upload a recording of a learner without explicit
consent.
