# N-ATLaS integration evidence

This document is the compliance evidence for NAIC 2026 Problem Statement 02
(Voice-First Access). It states exactly which official N-ATLaS models this
application calls, how they are invoked, what was rejected and why, and how a
reviewer can verify all of it independently.

- Official model card: **<https://huggingface.co/NCAIR1/N-ATLaS>**
- Challenge rules: <https://ncair.nitda.gov.ng/naic/>

> **N-ATLaS is an initiative of the Federal Ministry of Communications,
> Innovation and Digital Economy, and powered by Awarri Technologies.**

---

## 1. Models used

This project uses **only** checkpoints published by the `NCAIR1` organisation on
the Hugging Face Hub. There is no code path that can be pointed at a different
model.

| Role | Model id | Parameters | Used for |
| --- | --- | --- | --- |
| LLM (tutor) | `NCAIR1/N-ATLaS` | 8B (Llama-3 8B fine-tune, BF16) | Generating every tutor reply |
| ASR — Hausa | `NCAIR1/Hausa-ASR` | 244M (Whisper-small architecture, NCAIR fine-tune) | Transcribing Hausa speech |
| ASR — Igbo | `NCAIR1/Igbo-ASR` | 244M (Whisper-small architecture, NCAIR fine-tune) | Transcribing Igbo speech |
| ASR — Yorùbá | `NCAIR1/Yoruba-ASR` | 244M (Whisper-small architecture, NCAIR fine-tune) | Transcribing Yorùbá speech |
| ASR — Nigerian English (optional) | `NCAIR1/NigerianAccentedEnglish` | 244M | Support turns when a learner code-switches to English |

### Published properties of `NCAIR1/N-ATLaS` (from the official model card)

| Property | Value | Consequence in this app |
| --- | --- | --- |
| Base model | Llama-3 8B | Llama-3 chat template (`<\|start_header_id\|>` … `date_string`) |
| Context length | **8,092 tokens** | `trimToContext()` caps the whole prompt at ~18k characters (`src/lib/natlas/llm.ts`) |
| Training tokens | ~391,956,264 | Instruct-tuned, so short explicit prompts work better than long ones |
| Human evaluation | English 4.21, Hausa 3.98, Igbo 3.87, **Yorùbá 2.69** (avg /5) | Yorùbá mode is labelled "weak" in the UI and in `docs/limitations.md` |
| Access | **Gated** repo | Requires a Hugging Face account that has accepted the licence conditions |
| Inference providers | **None deployed** | Inference must be self-hosted or via a Hugging Face Inference Endpoint |

### Published properties of the N-ATLaS ASR checkpoints

| Checkpoint | Architecture | Training data | Inference window |
| --- | --- | --- | --- |
| `NCAIR1/Hausa-ASR` | Whisper-small, 244M | 120 h | 30 s |
| `NCAIR1/Igbo-ASR` | Whisper-small, 244M | 120 h | 30 s |
| `NCAIR1/Yoruba-ASR` | Whisper-small, 244M | 627.09 h | 30 s |
| `NCAIR1/NigerianAccentedEnglish` | Whisper-small, 244M | Nigerian-accented English | 30 s |

The app therefore caps a single utterance at **25 seconds** in the browser
(`src/lib/audio.ts`, `maxChunkSeconds` in `src/lib/languages.ts`), leaving headroom
inside the 30-second window. Longer audio — only reachable if a user bypasses the
client — is split at the quietest boundary by the ASR service
(`asr-service/app.py::split_wav`).

---

## 2. How they are called

### 2.1 N-ATLaS LLM — `NCAIR1/N-ATLaS`

**Code:** `src/lib/natlas/llm.ts` → `completeWithNatlas()`.
**Call sites (each marked with a comment in the source):**

| File | Marker comment to search for |
| --- | --- |
| `src/lib/tutor/turn.ts` | `N-ATLaS LLM INVOCATION #2 (official NCAIR1/N-ATLaS weights)` |
| `src/app/api/tutor/route.ts` | `N-ATLaS LLM INVOCATION (official NCAIR1/N-ATLaS weights).` |

Two transports are supported, both serving the same official weights:

1. **`openai-compatible`** (default) — any server exposing
   `POST {NATLAS_LLM_BASE_URL}/chat/completions` for N-ATLaS: `llama-server`
   (llama.cpp), vLLM, TGI, or a Modal/RunPod deployment. The request body carries
   `chat_template_kwargs: { date_string }` because the N-ATLaS chat template takes
   the current date as a template argument (visible in the official usage snippet
   on the model card).
2. **`hf-inference-endpoint`** — a Hugging Face Inference Endpoint running
  `NCAIR1/N-ATLaS`, at `POST {NATLAS_LLM_BASE_URL}/v1/chat/completions`. This
  transport does not send `chat_template_kwargs.date_string`: TGI applies its
  own chat template defaults and may render a different system prompt than the
  OpenAI-compatible transport. Tutor behavior does not depend on that date.

Minimal working example (this is what `/api/tutor` does):

```bash
curl -s http://localhost:3000/api/tutor \
  -H 'content-type: application/json' \
  -d '{"language":"hausa","history":[],
       "transcript":"Yaya ake gaisuwa da yawa?"}' | jq
```

```json
{
  "reply": "Barka da safiya. A cikin Hausa, gaisuwa da safiya ake cewa 'Barka da safiya' ...",
  "blocked": false,
  "level": "beginner",
  "model": "NCAIR1/N-ATLaS",
  "provider": "openai-compatible",
  "latencyMs": 1840
}
```

### 2.2 N-ATLaS ASR — `NCAIR1/{Hausa,Igbo,Yoruba}-ASR`

**Code:** `src/lib/natlas/asr.ts` → `transcribeWithNatlas()`.
**Call sites:**

| File | Marker comment to search for |
| --- | --- |
| `src/lib/tutor/turn.ts` | `N-ATLaS ASR INVOCATION #1 (official NCAIR1 ASR checkpoint)` |
| `src/app/api/asr/route.ts` | `N-ATLaS ASR INVOCATION (official NCAIR1/<Language>-ASR checkpoint).` |

The **`service`** transport uses the FastAPI service in `asr-service/`, which
loads the NCAIR1 repos directly with `transformers` on a GPU. There is no
Hugging Face serverless transport: these gated checkpoints are not deployed by
an Inference Provider.

The checkpoint is selected from the learner's chosen language, never from the
audio itself. Minimum working example:

```bash
curl -s -F 'audio=@./hausa-001.webm' -F 'language=hausa' \
  http://localhost:3000/api/asr | jq
```

```json
{
  "text": "Sannu, yaya ake?",
  "model": "NCAIR1/Hausa-ASR",
  "language": "ha",
  "latencyMs": 612,
  "durationSeconds": 2.4,
  "bytes": 18342
}
```

### 2.3 Runtime enforcement

Three independent guards make it impossible to accidentally wrap another model:

1. **Startup validation** — `src/lib/natlas/config.ts` validates `NATLAS_LLM_MODEL`
   with a Zod refinement that requires the `NCAIR1/` prefix. A non-N-ATLaS value
   makes the process throw on first request.
2. **Response validation** — `src/lib/natlas/asr.ts` rejects any ASR payload whose
   `model` field is not `NCAIR1/…`, so a misconfigured proxy cannot be mistaken
   for the real service.
3. **Service-level enforcement** — `asr-service/app.py::assert_official()` raises
   before loading any checkpoint outside `NCAIR1/`.

### 2.4 Required checkpoint attribution

The app displays the model-card attribution for every checkpoint it uses:

- N-ATLaS: “N-ATLaS is an initiative of the Federal Ministry of Communications,
  Innovation and Digital Economy, and powered by Awarri Technologies.”
- Hausa-ASR: “Hausa-ASR is powered by Awarri Technologies in an initiative of
  the Federal Ministry of Communications, Innovation and Digital Economy.”
- Igbo-ASR: “Igbo-ASR is powered by Awarri Technologies in an initiative of
  the Federal Ministry of Communications, Innovation and Digital Economy.”
- Yoruba-ASR: “Yoruba-ASR is developed by Awarri Technologies in partnership
  with the Federal Government of Nigeria.”

### 2.5 Runtime evidence in the product

- The **EvidenceStrip** panel at the top of every session screen shows the ASR
  checkpoint, the LLM checkpoint, their latencies and the transport for the last
  turn. This is what the demo video keeps on screen.
- `GET /api/health` probes both the LLM endpoint and the ASR service and returns
  the configured model ids plus the ASR service's loaded `NCAIR1/` checkpoints.
- Every row of `validation/interactions-*.csv` carries `asrModel`, `llmModel` and
  both latencies. If a submission wrapped a different model, those columns would
  not read `NCAIR1/…`. Today that file holds **5 rows, all of them failed turns**
  with empty model columns: the deployed ASR service was rejecting audio because
  its bearer token did not match. It is evidence of the guard working, not of a
  completed session — see `validation/README.md`. The token mismatch itself was
  fixed on 2026-10-05, so these rows describe a fault that no longer exists; they are
  kept because deleting real logged turns would be worse than keeping them.

---

## 3. Alternatives considered and rejected

| Rejected option | Why it was rejected |
| --- | --- |
| **OpenAI Whisper (`openai/whisper-*`)** | Global model, not N-ATLaS. NAIC disqualifies submissions that wrap a general-purpose model instead of N-ATLaS. Note the N-ATLaS ASR checkpoints are *built on* Whisper-small architecture, but they are NCAIR fine-tunes — a different set of weights, which is why they are used. |
| **GPT-4 / Claude / Gemini** | Explicitly listed as disqualifying on the NAIC FAQ. |
| **AssemblyAI, Deepgram, Google STT, Azure Speech** | Commercial third-party speech services; not N-ATLaS, and they would send Nigerian learners' audio to foreign vendors. |
| **Meta / NLLB / SeamlessM4T** | Different foundations; no N-ATLaS integration. |
| **Community GGUF conversions** (e.g. `tosinamuda/N-ATLaS-GGUF-*`, `tosinamuda/N-ATLaS-FP8`) | These are third-party quantisations of the same N-ATLaS weights and are a legitimate way to *run* N-ATLaS on a small GPU, so they are mentioned in `docs/deployment.md` as a cost-saving option. They are **not** the default, because the official `NCAIR1/N-ATLaS` safetensors repository is the authoritative artefact and using it keeps the integration evidence unambiguous. |
| **Text-only tutor** | Problem Statement 02 requires voice input to use the official N-ATLaS ASR service. |
| **A general-purpose TTS** | N-ATLaS has no TTS. Rather than add a voice model, the app uses a pre-recorded phrase library plus the browser voice, with the limitation stated openly (`docs/tts.md`). |

---

## 4. Verification checklist for a reviewer

1. `grep -rn "NCAIR1/" src/` — every model reference is an NCAIR1 checkpoint.
2. `grep -rniE "openai|assemblyai|deepgram|whisper-|anthropic|gemini" src/` — no
   vendor SDK imports; the only `whisper` mentions are comments explaining *why*
   the official N-ATLaS ASR checkpoints are used instead.
3. Open `GET /api/health` on the deployment: it names the LLM checkpoint and the
   loaded `NCAIR1/` ASR checkpoints.
4. Open `GET /api/export?format=csv&token=…` and inspect `asrModel` / `llmModel`.
5. Run `python scripts/evaluate-asr.py` to reproduce the ASR accuracy table
   (`validation/asr-accuracy.md`) with your own clips.

---

## 5. Honest limitations

- **Yorùbá is weak.** N-ATLaS itself scores Yorùbá 2.69/5.0 in human evaluation.
  Broken transcripts and stilted Yorùbá replies are expected; the app keeps the
  transcript on screen so the lesson survives, and says so in the UI.
- **ASR degrades in noise, on children's speech, and with code-switching** — all
  documented in the N-ATLaS terms of use.
- **No hosted N-ATLaS inference provider exists today**, so the demo depends on a
  self-hosted GPU (or a Hugging Face Inference Endpoint). This is a deployment
  cost, not an integration gap.
- **Context is 8,092 tokens.** Long lessons are truncated server-side; the client
  keeps only the last 12 turns in `localStorage`.

Full detail: [`docs/limitations.md`](limitations.md).
