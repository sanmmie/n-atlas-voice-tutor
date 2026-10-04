# Text-to-speech: why there is no "AI voice" here

N-ATLaS ships **one LLM and four ASR models**. It has **no text-to-speech model**.
For a voice-first product that is a real gap, not an oversight, so this document
states the problem and the workaround instead of quietly substituting a commercial
voice service.

## What NAIC allows

Problem Statement 02 constrains the **speech recognition** path ("Voice input must
use the official N-ATLaS ASR service for the relevant language"). It does not
prescribe a speech synthesis provider. But adding a large external TTS vendor would
(a) cost money the project does not have, (b) send every reply to a foreign API, and
(c) risk quality problems in Hausa, Igbo and Yorùbá, where general TTS is weakest.

So the app uses a two-tier strategy.

## Tier 1 — pre-recorded phrase library (highest quality)

**Currently empty.** The mechanism is built and wired, but no recordings are
committed yet, so every reply currently falls through to Tier 2. The manifests
ship with `phrases: []` on purpose: an entry whose `.mp3` is missing makes the
browser request a file that 404s on every greeting. `src/lib/tts.ts` also
probes a recording with `HEAD` before playing it and caches the miss, so a
half-filled manifest degrades to Tier 2 instead of erroring.

When recordings exist, `public/audio/phrases/<language>/manifest.json` maps
exact tutor strings to human-recorded MP3s:

```json
{ "phrases": [ { "text": "Sannu! Ku ne mai koyar da harshen Hausa…", "file": "greeting-01.mp3" } ] }
```

At reply time, `src/lib/tts.ts` normalises the reply (lowercase, strip combining
diacritics, strip punctuation, collapse whitespace) and looks for an exact match. A
match plays the recording.

This guarantees correct native pronunciation for the strings the tutor actually
repeats most — the greeting, the topic-guard refusal, and the suggested prompts.
Recording guidance, and the phrases worth recording first, are in
`public/audio/phrases/README.md`.

## Tier 2 — browser `SpeechSynthesis` (fallback)

Everything unmatched is spoken by the Web Speech API using `ha-NG`, `ig-NG` or
`yo-NG`. **Limitations, stated plainly:**

- Voice availability is entirely device-dependent. Desktop Chrome on Windows ships
  Hausa and Yorùbá voices; most Android browsers ship **no Yorùbá voice at all**,
  in which case the OS falls back to a default voice that mispronounces the text.
- Voice quality is not guaranteed to be a native speaker.
- Some browsers silently drop utterances longer than ~15 seconds, so the tutor
  prompt caps replies at ~60 words.
- No server cost, and no learner audio leaves the device — which is the main
  privacy advantage.

There is no `hasVoiceFor()` helper: the app resolves the voice inside `speak()`
and returns `'none'` when the device has none, which is what makes the caller
fall back to showing the reply as text rather than letting the browser read it
aloud in English.

## What is deliberately not here

| Not used | Why |
| --- | --- |
| ElevenLabs / Azure / Google / Amazon Polly | Cost, data residency, and poor Nigerian-language coverage |
| Coqui / Piper / MMS-TTS fine-tunes | Would need its own compliance story and hosting; adds risk to a build-only submission |
| Pretrained Whisper TTS | Not an N-ATLaS model, and not designed for this purpose |

## Reporting honestly

The interaction log records which engine spoke each reply in the `ttsEngine`
column (`phrase-library`, `web-speech`, `none`), and the validation report breaks
that down. A judge can see exactly how much of a real learner's session was served
by native recordings versus a fallback voice.

If the team records enough phrase coverage, `phrase-library` share should climb
with each iteration — that number is the honest measure of how complete the voice
layer is.
