# Architecture

## Runtime shape

```
┌──────────────────────── Browser ────────────────────────┐
│  Language selection  →  theme + language cookie         │
│  MediaRecorder (WebM/Opus, mono, 25 s cap)              │
│  Transcript panel (accessibility + review)              │
│  TTS: phrase library → Web Speech fallback              │
│  Guest id in localStorage (no login wall)               │
└───────────────┬───────────────────────────┬─────────────┘
                │ POST /api/turn            │ POST /api/log
                │ multipart: audio + meta   │ {rating, ttsEngine}
                ▼                            ▼
┌──────────────────────── Next.js server ────────────────┐
│  src/app/api/turn                                         │
│    └─ src/lib/tutor/turn.ts  runTurn()                   │
│         1. transcribeWithNatlas()  ─────────► N-ATLaS ASR│
│         2. screenTopic(input)                           │
│         3. resolveLevel(signals) + buildTutorSystemPrompt│
│         4. completeWithNatlas()     ─────────► N-ATLaS LLM│
│         5. screenTopic(reply)                           │
│         6. logInteraction()                              │
│                                                          │
│  src/lib/store/interactions.ts   jsonl | postgres        │
│  GET /api/health · GET /api/export                        │
└───────────────┬─────────────────────────────────────────┘
                │ HTTP
                ▼
┌──────────────────── Inference hosts ─────────────────────┐
│  N-ATLaS ASR service (FastAPI, GPU)                       │
│    NCAIR1/Hausa-ASR · Igbo-ASR · Yoruba-ASR              │
│    ffmpeg → 16 kHz mono → transformers pipeline          │
│                                                          │
│  N-ATLaS LLM server                                       │
│    llama.cpp llama-server / vLLM / TGI / Modal           │
│    weights: NCAIR1/N-ATLaS                                │
│                                                          │
│  Production today: both run on Modal (scripts/modal_llm.py│
│  and scripts/modal_asr.py), each on an L4.                │
└───────────────────────────────────────────────────────────┘
```

## Why one endpoint instead of two round-trips

The required data flow is `browser → /api/asr → /api/tutor`. Both endpoints exist
and are documented (`src/app/api/asr/route.ts`, `src/app/api/tutor/route.ts`), and
`/api/asr` is what you call to test the recogniser on your own clips.

The voice client calls **`POST /api/turn`** instead, which runs the same two N-ATLaS
invocations server-side in one request. The reason is evidentiary: the ASR and LLM
checkpoint ids recorded in the interaction log are the ones that actually
answered, rather than values a browser could have sent. It also removes a full
round-trip on a metered connection.

## Module map

| Path | Responsibility |
| --- | --- |
| `src/lib/natlas/config.ts` | Validated env config; enforces the `NCAIR1/` model prefix |
| `src/lib/natlas/llm.ts` | N-ATLaS LLM client (OpenAI-compatible + HF endpoint), context trimming |
| `src/lib/natlas/asr.ts` | N-ATLaS ASR client (service transport only), rejects non-N-ATLaS payloads |
| `src/lib/natlas/tutor-prompt.ts` | The language-tutor system prompt |
| `src/lib/tutor/turn.ts` | One conversational turn: ASR → guard → level → LLM → guard |
| `src/lib/tutor/difficulty.ts` | Deterministic level adaptation and the "stuck" signal |
| `src/lib/tutor/safety.ts` | Topic guard with in-language refusals |
| `src/lib/store/interactions.ts` | Log drivers, CSV serialisation, validation summary |
| `src/lib/audio.ts` | Recording, mime negotiation, 25 s cap, level metering, network label |
| `src/lib/tts.ts` | Phrase-library match, then Web Speech fallback |
| `src/lib/session.ts` | Anonymous learner id, session id, transcript persistence |
| `asr-service/app.py` | The official-checkpoint ASR service |
| `scripts/` | CSV export, validation report, ASR accuracy harness |

## Tutor behaviour

### System prompt

Built by `buildTutorSystemPrompt()` and passed to N-ATLaS as the `system` message.
It enforces, in order:

1. reply primarily in the selected language, with native orthography and diacritics;
2. one short English clarifying sentence only if the learner is clearly confused;
3. gentle correction — corrected form first, then continue;
4. one imitable example sentence, plus a cultural note when relevant;
5. exactly one question per turn;
6. under 60 words (spoken register, not an essay);
7. no politics, religion, ethnicity or divisive topics.

The prompt is deliberately short because N-ATLaS is instruct-tuned with ~392M
tokens and a 8,092-token context; long instructions degrade rather than improve
compliance.

### Difficulty adaptation

N-ATLaS has no memory between requests, so the level is computed server-side from
observable signals and injected into the prompt
(`src/lib/tutor/difficulty.ts::resolveLevel`):

| Signal | Source |
| --- | --- |
| `turnCount` | number of learner turns in the session |
| `averageInputChars` | mean length of the last 6 learner transcriptions |
| `repeats` | verbatim repeats of the previous turn |
| `mistakeSignals` | `repeats` + turns shorter than 4 characters |

Rules, in order:

1. fewer than 3 turns → `beginner`;
2. 3 or more repeats → `beginner` (the learner is stuck, not progressing);
3. fewer than 10 turns → `intermediate` when the average utterance is ≥ 22
   characters, otherwise `beginner`;
4. 10 or more turns → `advanced` when the average is ≥ 38 characters and
   `mistakeSignals ≤ 4`; `intermediate` at ≥ 20 characters; otherwise `beginner`.

`learnerLooksStuck()` adds a one-line English bridge instruction to the prompt when
the learner repeats themselves twice or their replies drop below 8 characters.

### Topic guard

`screenTopic()` runs on the learner's utterance **before** the LLM call and on the
reply **before** it is spoken. It blocks explicit solicitation of political,
religious or divisive topics, and unambiguously harmful framings such as
"all Hausa are…". Bare nouns are not blocked, because "government" and "church" are
legitimate vocabulary in Nigerian lessons. A blocked turn is logged with
`blocked: true` and answered with a short, neutral in-language redirect.

## Cultural theming

Three themes, all driven by CSS custom properties on `<html data-theme>` so the
whole UI re-themes instantly with no reload and no extra network round-trip:

| Language | Palette | Motif |
| --- | --- | --- |
| Hausa | adobe/terracotta, Sahel gold | interlocking lattice of carved building screens |
| Igbo | forest green, black, chalk white | uli-inspired continuous chalk line work |
| Yorùbá | adire indigo, shrine red | resist-dye blocks and dot rows |

The motifs are geometric SVG patterns in `src/components/MotifBackground.tsx`,
drawn abstractly and rendered at low opacity behind the content. They are
decorative, not claimed to be reproductions of any specific cloth or carving.

## Data and privacy

- No account required. The learner id is `guest-xxxxxxxxxx`, generated in the
  browser and stored only in `localStorage`.
- Audio is transmitted to the N-ATLaS ASR service for transcription and is **not**
  persisted by this application. Only text, timings and model ids are logged.
- No IP address, phone number, email or name is stored.
- `/validation` and `/api/export` require `ADMIN_TOKEN`; the dashboard checks it
  before reading learner-derived summaries, and exports contain full transcripts.

## Low-bandwidth choices

- Audio is captured as WebM/Opus mono with echo cancellation and noise
  suppression, and uploaded as a single multipart request.
- No web fonts, no icon library, no client-side data fetching beyond the app
  shell; the whole first load is a few tens of kilobytes of JS.
- The transcript is the source of truth: if speech is dropped on a weak network,
  the lesson still works as text.
- `prefers-reduced-motion` is respected, and the mic button is a single large
  target usable one-handed.
