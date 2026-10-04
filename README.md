# N-ATLaS Voice Tutor

A voice-first language tutor for **Hausa**, **Igbo** and **Yorùbá**. A learner
picks a language, presses one large microphone button, speaks, and hears N-ATLaS
reply in that language — with a live transcript for accessibility and review, no
login, and no typing required.

Built for the **National AI Innovation Challenge (NAIC) 2026, Problem Statement 02:
Voice-First Access** — *"Build applications for Nigerians who do not type."*

---

**Live deployment:** <https://n-atlas-voice-tutor-deltaos-core.vercel.app>
(Vercel, project `deltaos-core/n-atlas-voice-tutor`, auto-deploys from `main`)

## Team and credits

N-ATLaS Voice Tutor is developed by **DeltaOS Core** in collaboration with the
**Department of Linguistics and Languages, Adekunle Ajasin University** (AAUA).

| Name | Role | Affiliation |
| --- | --- | --- |
| Prof. Simeon Olaogun | Academic Lead | Department of Linguistics and Languages, AAUA |
| Oluwasanmi T. Adebowale | Technical Partner | DeltaOS Core |
| Aladejana Aduragbemi Samuel | PG student | Department of Linguistics and Languages, AAUA |

Team profiles are also available on the live site at
<https://n-atlas-voice-tutor-deltaos-core.vercel.app/team>.

## N-ATLaS integration (the non-negotiable part)

Every model this application calls is an official checkpoint from the `NCAIR1`
organisation on Hugging Face:

| Role | Model | Where it is called |
| --- | --- | --- |
| LLM (tutor) | **`NCAIR1/N-ATLaS`** | `src/lib/natlas/llm.ts`, invoked from `src/lib/tutor/turn.ts` and `src/app/api/tutor/route.ts` |
| ASR — Hausa | **`NCAIR1/Hausa-ASR`** | `src/lib/natlas/asr.ts` → `asr-service/` |
| ASR — Igbo | **`NCAIR1/Igbo-ASR`** | same |
| ASR — Yorùbá | **`NCAIR1/Yoruba-ASR`** | same |
| ASR — Nigerian English (optional) | **`NCAIR1/NigerianAccentedEnglish`** | same |

- Official model card: **<https://huggingface.co/NCAIR1/N-ATLaS>**
- Full evidence, including every rejected alternative and the reasoning:
  **[`docs/n-atlas-integration.md`](docs/n-atlas-integration.md)**
- Challenge rules: <https://ncair.nitda.gov.ng/naic/>

> N-ATLaS is an initiative of the Federal Ministry of Communications,
> Innovation and Digital Economy, and powered by Awarri Technologies.

> Developed by DeltaOS Core in collaboration with the Department of
> Linguistics and Languages, AAUA.

There is no GPT-4, Claude, Whisper-from-OpenAI, AssemblyAI, Deepgram or Google STT
anywhere in the inference path. Three runtime guards enforce this: config
validation requires the `NCAIR1/` prefix, the ASR client rejects payloads claiming
a non-N-ATLaS model, and the ASR service refuses to load any checkpoint outside
`NCAIR1/`.

## Data flow

```
User speaks (WebM/Opus, mono, ≤25 s)
  → POST /api/turn
      → N-ATLaS ASR  (NCAIR1/<Language>-ASR)
      → topic guard
      → adaptive level + language-tutor system prompt
      → N-ATLaS LLM  (NCAIR1/N-ATLaS)
      → topic guard on the reply
      → interaction logged with both checkpoint ids
  ← reply text + spoken audio (phrase library → Web Speech fallback)
  ← transcript rendered, rating captured
```

`/api/asr` and `/api/tutor` are also exposed standalone, as the NAIC problem
statement's data flow describes them. The client uses `/api/turn` instead so the
recorded model evidence comes from the server and cannot be forged by the browser.

## Features

- **Language selection with cultural theming.** Each language has its own palette
  and motif — Hausa latticework in adobe and Sahel gold, Igbo uli-inspired chalk
  lines on forest green, Yorùbá adire indigo patterning. Switching re-themes the
  whole UI instantly.
- **Voice-first interaction.** One large microphone target, clear recording state,
  live level meter, auto-stop at the app's own 25-second cap (the checkpoints'
  hard window is 30 s, so the cap leaves headroom).
- **Live transcript panel.** Every turn is on screen: accessibility, lesson review,
  and a safety net when ASR mishears a word.
- **Adaptive difficulty.** Beginner → intermediate → advanced from observable
  signals, injected into the prompt because N-ATLaS is stateless
  (`src/lib/tutor/difficulty.ts`).
- **Topic guard.** Sensitive and divisive topics are screened before and after the
  model call, with neutral in-language redirects.
- **Interaction logging and CSV export.** Timestamp, language, both transcripts,
  session duration, learner id, both N-ATLaS checkpoint ids, latencies, TTS engine,
  connection type. The admin-token-protected dashboard and export are available
  at `/validation` and `/api/export`.
- **Guest mode.** No account, no login wall. Progress lives in `localStorage`.
- **Low bandwidth.** No web fonts, no icon library, ~99 kB first load on the landing
  page and ~103 kB in a session, compressed audio upload, text-first fallback.
- **Typed fallback.** For desktop judges and devices without a usable microphone —
  typed turns skip ASR and are logged as typed, so the CSV stays honest.

## Project layout

```
src/app/                 Next.js App Router pages and API routes
  page.tsx               language selection
  session/page.tsx       the voice tutor
  team/page.tsx          team profiles
  validation/page.tsx    restricted validation dashboard + CSV export
  api/asr                N-ATLaS ASR endpoint
  api/tutor              N-ATLaS LLM endpoint
  api/turn               ASR + LLM + logging, the production path
  api/log                ratings and TTS-engine feedback
  api/export             CSV / JSON export (ADMIN_TOKEN protected)
  api/health             which N-ATLaS models this deployment is wired to
src/lib/natlas/          N-ATLaS clients, config, tutor system prompt
src/lib/tutor/           turn orchestration, difficulty, topic guard
src/lib/store/           interaction log drivers, CSV, summary
src/components/          language picker, motifs, mic, transcript, evidence strip
asr-service/             FastAPI service serving the official NCAIR1 ASR checkpoints
public/audio/phrases/    pre-recorded phrase library (see its README)
scripts/                 CSV export, validation report, ASR accuracy harness, SQL schema
docs/                    architecture, deployment, N-ATLaS evidence, TTS, limitations
validation/              real learner logs, CSV export, ASR accuracy, report
```

Documentation: [`docs/architecture.md`](docs/architecture.md) ·
[`docs/deployment.md`](docs/deployment.md) ·
[`docs/tts.md`](docs/tts.md) · [`docs/limitations.md`](docs/limitations.md) ·
[`docs/submission/checklist.md`](docs/submission/checklist.md)

## Getting started

### Prerequisites

- Node.js 18.18+ (developed on Node 24)
- An N-ATLaS LLM endpoint (self-hosted `llama-server` / vLLM / Modal, or a Hugging
  Face Inference Endpoint)
- The N-ATLaS ASR service on a GPU host — production runs it on Modal via
  `scripts/modal_asr.py`
- A Hugging Face token that has accepted the gated N-ATLaS licence conditions

### 1. N-ATLaS LLM

```bash
llama-server -m models/N-ATLaS-GGUF-Q4_K_M.gguf --port 8080 --ctx-size 8092 --alias NCAIR1/N-ATLaS
```

Other options (vLLM, Hugging Face Inference Endpoint, Modal) are in
[`docs/deployment.md`](docs/deployment.md#1-n-atlas-llm-endpoint).

### 2. N-ATLaS ASR service

```bash
docker build -f asr-service/Dockerfile -t natlas-asr
docker run --gpus all -p 8000:8000 -e HF_TOKEN=hf_... natlas-asr
curl -s http://localhost:8000/health | jq
```

### 3. App

```bash
cp .env.example .env.local     # fill in endpoints and ADMIN_TOKEN
npm install
npm run dev
```

Open <http://localhost:3000>, pick a language, allow microphone access, and speak.

The example config uses local endpoint defaults so the interface can start before
inference services are available; `/api/health` remains unhealthy until both
N-ATLaS endpoints are configured and loaded.

Microphone capture requires HTTPS on anything other than `localhost`, so use a
tunnel (e.g. `cloudflared tunnel --url http://localhost:3000`) when testing on
phones.

### 4. Verify the integration

```bash
curl -s http://localhost:3000/api/health | jq
# { "ok": true, "llm": { "model": "NCAIR1/N-ATLaS", ... }, "asr": { "models": ["NCAIR1/Hausa-ASR", ...] } }

curl -s -F 'audio=@./sample.webm' -F 'language=hausa' http://localhost:3000/api/asr | jq

curl -s http://localhost:3000/api/tutor -H 'content-type: application/json' \
  -d '{"language":"hausa","transcript":"Yaya ake gaisuwa da yawa?"}' | jq
```

### 5. Collect validation evidence

```bash
npm run export:csv          # -> validation/interactions-<date>.csv
npm run validation:report   # -> validation/REPORT.md
python scripts/evaluate-asr.py --service https://<asr-host> --token "$NATLAS_ASR_API_KEY"
```

Both npm scripts read the local jsonl log when it exists and otherwise pull the
evidence from the running deployment's `/api/export` (the production app logs to
postgres, whose filesystem is ephemeral). They read `ADMIN_TOKEN` and `BASE_URL`
from `.env.local`, so no extra flags are needed against the live site.

NAIC Problem Statement 02 requires **at least 50 documented real learner
interactions**. See [`validation/README.md`](validation/README.md) for the
recruitment plan and the honest current status — this project does not fabricate
that evidence.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run export:csv` | Interaction log (local jsonl, else the deployment) → `validation/*.csv` |
| `npm run validation:report` | Same sources → `validation/REPORT.md` |
| `python scripts/evaluate-asr.py` | ASR accuracy table from recorded clips |

## Known limitations (short version)

Yorùbá is weak — N-ATLaS itself scores it 2.69/5.0 in human evaluation. Context is
8,092 tokens. ASR degrades in noise, on children's speech, and with code-switching.
There is no N-ATLaS TTS, so spoken replies fall back to the browser voice, which is
often wrong for Yorùbá. Full detail, including what has **not** yet been measured:
[`docs/limitations.md`](docs/limitations.md).

## Licence

Application code: MIT. The N-ATLaS models are used under the N-ATLaS Open-Source
Research and Innovation License — free for research and prototyping, capped at 1000
active end-users, and requiring the attribution quoted above in any public use.
Derivatives of the models must keep the "Powered by Awarri" attribution.
