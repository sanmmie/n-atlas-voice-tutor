# NAIC 2026 compliance lint — N-ATLaS Voice Tutor

Audit date: **2026-10-04** (revised; supersedes the 2026-10-03 audit).
Target: <https://ncair.nitda.gov.ng/naic/#tracks>.
Problem statement: **02 — Voice-First Access**. Track: **A — Academia & Research**.
Deadline: **12 October 2026, 23:59 WAT** — **8 days from this audit**.

Evidence markers:

- **[ran]** — executed against this repo or the live deployment for this audit
- **[src]** — read from the official source (NAIC page, HF model card)
- **[code]** — read from this repository

---

## 0. What was actually executed

| Check | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | No ESLint warnings or errors **[ran]** |
| Types | `npm run typecheck` (`tsc --noEmit`) | clean, no diagnostics **[ran]** |
| Build | `npm run build` | Compiled successfully, 11 routes, 98.9 kB first load **[ran]** |
| Live health | `GET /api/health` | **503** **[ran]** |
| Live tutor | `POST /api/tutor` with a Hausa transcript | **502** `fetch failed` **[ran]** |
| Vercel env | `vercel env ls --project n-atlas-voice-tutor` | 5 vars present; `LOG_DRIVER`, `DATABASE_URL`, `NATLAS_LLM_API_KEY` **absent** **[ran]** |
| Interaction data | search for `.jsonl` / `.csv` in tree | none exists **[ran]** |

Root cause of the live failure, established by temporarily instrumenting the
health route to report `process.env`, then removing the instrumentation:

```
rawAsr: "http://127.0.0.1:8000"
rawLlm: "http://127.0.0.1:8080/v1"
```

The variables **are** deployed and present in the function's `process.env` — their
**values** are the localhost placeholders from `.env.example`, which inside a Vercel
function resolve to the function's own container. See N1. **[ran]**

Build output is unchanged from the previous audit, so the README's "~99 kB first
load" claim is still accurate.

---

## 1. Verdict

**The code is not the problem and has not become one.** Lint, types and build are
clean, and since the 2026-10-03 audit most previously-listed defects have been fixed
(§4, *Resolved*). The N-ATLaS integration is enforced in three independent places
and evidenced per turn in the CSV. Do not rewrite it.

**What blocks the submission is deployment state, evidence and paperwork — none of
it code:**

1. **The deployed artefact is live but cannot function.** This is worse than not
   deploying: a judge who clicks the README link gets a page that loads and then
   fails every turn.
2. **0 of 50 documented real interactions** — PS2's only hard numeric threshold,
   and the longest lead-time item.
3. **Interaction logs are currently ephemeral**, so validation evidence would be
   destroyed on the next redeploy (N3).
4. **Endorsement letter, team profile and demo video** are unstarted.

With 8 days left the critical path is **N3 → N1 → N2**, in that order: N3 is a
silent data-loss trap, N1 is a prerequisite for recording anything, and N2 is the
requirement itself.

---

## 2. Requirement-by-requirement

### 2.1 General eligibility

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| All members Nigerian citizens or registered entities | ⚠️ | Not verifiable from code. `NATLAS_TEAM` lists 3 names/affiliations **[code]**; you must be able to prove citizenship per member. |
| Original work, not previously awarded | ⚠️ | Cannot self-certify in code. |
| One problem statement only | ✅ | PS2 only; no second statement anywhere **[code]**. |
| **Functioning artefact integrated with N-ATLAS** | ❌ | **Regression from the last audit.** Deployed, but `/api/health` is 503 and `/api/tutor` is 502 **[ran]**. See N1. |
| Applications and materials in English | ✅ | All docs English **[code]**. The tutor *speaks* Nigerian languages to learners — that is the product, not the submission material. |

### 2.2 Problem Statement 02 — Voice-First Access

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Voice input must use the **official N-ATLAS ASR service** for the relevant language | ✅ *(code)* / ❌ *(live)* | `asr.ts` selects `NCAIR1/{Hausa,Igbo,Yoruba}-ASR` from the learner's declared language, never inferred from the audio **[code]**. But **no ASR endpoint is deployed**, so there is no live path. See N1. |
| **Minimum 50 documented real user interactions** | ❌ | `validation/README.md` states **0 / 50 required**; no interaction data exists in the tree **[ran]**. |
| Use case within PS2's list | ✅ | Education / language learning **[code]**. |
| Delivery channel | ⚠️ | PS2 lists WhatsApp voice notes, USSD, IVR and **low-bandwidth mobile applications**. This is a mobile web app. Argue it explicitly in the team profile and demo video rather than leaving it implicit — the low-bandwidth engineering is real and documented. |

### 2.3 Build requirements

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| A working technical build | ⚠️ | Builds clean **[ran]** and is deployed, but is non-functional at runtime **[ran]**. |
| Genuine N-ATLAS integration | ✅ | Three independent runtime guards: `config.ts` Zod refinement requires the `NCAIR1/` prefix; `asr.ts` rejects any ASR payload whose `model` is not `NCAIR1/…`; `asr-service/app.py::assert_official()` refuses to load outside `NCAIR1/` **[code]**. `export-csv.mjs` additionally fails with `COMPLIANCE FAILURE` on any non-`NCAIR1/` id **[code]**. |
| Real-world validation (real users / data / live benchmarks) | ❌ | Zero. `validation/asr-samples/` holds no clips; no WER figures exist. |
| Not sufficient — paper, slides, framework, mock-up, proposal | ✅ | Not the case; this is a build. |
| Solutions not integrated with N-ATLAS are ineligible | ✅ | Enforced, not merely asserted: `config.ts` Zod refinement refuses to start on any model id outside `NCAIR1/`, and `export-csv.mjs` fails the export with `COMPLIANCE FAILURE`. There is no code path to a wrapped model. **[code]** |

### 2.4 The seven submission components

| # | Component | Status | Where it lives / what is missing |
| --- | --- | --- | --- |
| 1 | Working artefact (repo, deployed app, live API) | ⚠️ | Repo and live URL both exist, but the deployment cannot serve a turn **[ran]**. Unblocks with N1. |
| 2 | N-ATLAS integration evidence | ✅ | `docs/n-atlas-integration.md` — models, call sites, transports, rejected alternatives, reviewer verification steps. |
| 3 | Real-world validation | ❌ | `validation/` zero rows. |
| 4 | Technical documentation | ✅ | `README.md`, `docs/architecture.md`, `docs/deployment.md`, `docs/limitations.md`, `docs/tts.md`. |
| 5 | Video demonstration, 3–5 min | ❌ | `docs/submission/demo-video-script.md` is written and good; unrecorded. Blocked on N1. |
| 6 | Team profile | ⚠ | `docs/submission/team-profile.md` — names, affiliations and Track A requirement check filled from `attribution.ts`; contribution breakdown and signature still outstanding. |
| 7 | Endorsement / registration | ❌ | `docs/submission/endorsement-letter-template.md` — unsigned. Institutional lead time; start today. |

### 2.5 Track A — Academia & Research

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Team size 2–5 | ✅ | 3 members in `attribution.ts` **[code]**. |
| At least one enrolled student / postgraduate researcher | ⚠️ | Listed as "PG student" **[code]** — needs proof of enrolment. |
| A faculty supervisor | ✅ | Prof. Simeon Olaogun, Academic Lead **[code]**. |
| Institutional endorsement letter signed by the Head of Department | ❌ | Template only. |

> **Discrepancy in the official material.** The Tracks section gives both tracks as
> 2–5 members; the FAQ gives Track B as 1–6. That affects Track B only, so it does
> not change anything for you — but do not quote the FAQ at a Track A panel.

### 2.6 Evaluation criteria — where this submission is strong and weak

| Criterion | Read |
| --- | --- |
| Working artefact & technical rigour | Strong code; **artefact deployed but non-functional**, which currently reads worse than shipping no URL at all. |
| N-ATLAS integration | **Strongest asset.** Real checkpoints, runtime enforcement, per-turn evidence in the CSV. |
| Real-world validation | **Weakest asset.** Zero, and currently at risk of staying zero — see N3. |
| Impact potential | Good story (people who do not type); needs the user evidence to land. |
| Scalability & sustainability | Honest limitation docs help here; the licence cap is correctly disclosed. |
| Team capability | Linguistics department plus an engineering partner is a genuinely good shape; the profile currently renders blank. |

---

## 3. What the code already gets right — do not "improve" these

Recorded so nobody refactors them away under deadline pressure:

- **Server-side chaining in `/api/turn`**, so the logged checkpoint ids cannot be forged by a browser (`src/lib/tutor/turn.ts`) **[code]** — the single best compliance decision in the repo.
- **Three model-identity guards** (config, ASR response, ASR service loader) plus the CSV export's hard `COMPLIANCE FAILURE` **[code]**.
- **Per-turn evidence in the CSV** (`asrModel`, `llmModel`, both latencies, `ttsEngine`, `networkType`) and the on-screen `EvidenceStrip` **[code]**.
- **Per-checkpoint attribution** in `NATLAS_ASR_ATTRIBUTIONS`, quoted verbatim per model card including Yoruba's different wording **[code]**.
- **`date_string` matches the official template** (`03 Oct 2026`), and the HF transport's deliberate omission of it is documented in `llm.ts` **[code]**.
- **`/validation` is token-gated** behind `isValidAdminToken` **[code]**.
- **Honest limitations** — Yorùbá 2.69/5.0 disclosed in the UI, README and `docs/limitations.md`. Panels reward this; do not soften it.
- **Guest mode / no login** and **no audio persisted** **[code]**.
- **`asr-service/pyproject.toml` is absent and must stay absent.** Vercel switches the entire build to `uv` when it sees one, which takes the Next.js app down (`docs/deployment.md`) **[code]**.

---

## 4. Defect register

### Blocking — the submission is invalid until these are closed

**N1. The deployed artefact is live but non-functional.**
Evidence: `GET /api/health` → 503; `POST /api/tutor` with a Hausa transcript →
`502 {"error":"N-ATLaS LLM call failed (NCAIR1/N-ATLaS via openai-compatible).","detail":"fetch failed"}` **[ran]**.
The Vercel production env holds `NATLAS_LLM_BASE_URL=http://127.0.0.1:8080/v1` and
`NATLAS_ASR_BASE_URL=http://127.0.0.1:8000` — the `.env.example` placeholders,
confirmed by reading `process.env` from the live function **[ran]**. No ASR endpoint
has been deployed at all.
PS2 impact: NAIC requires that *every submission include a **functioning** technical
artefact integrated with N-ATLAS*. This also blocks submission components #1 and #5,
and makes the README's "Live deployment" line an overclaim (N5).
Fix: point both variables at real endpoints. `scripts/modal_llm.py` now deploys the
LLM; the ASR Modal wrapper is still to be written. Then confirm `/api/health` reports
`ok: true` with at least three loaded `NCAIR1/` checkpoints.

**N2. 0 of 50 documented real user interactions.**
Evidence: `validation/README.md` → "Interactions collected **0 / 50 required**"; no
`.jsonl` or `.csv` interaction data exists anywhere in the tree **[ran]**.
PS2 impact: submission component #3 unsatisfied, and build requirement 3. This is the
only requirement with a hard numeric threshold and the longest lead time — recruiting
learners takes days, not hours.
Fix: close N3 first, then N1, then recruit. `validation/README.md` already has a sound
collection plan.

**N3. Interaction logs are ephemeral on the current deployment — this will silently destroy N2's evidence.**
Evidence: `LOG_DRIVER` is not set in the Vercel production env **[ran]**, so
`interactions.ts` takes the `jsonl` branch and writes to
`process.cwd()/<LOG_DIR>/interactions.jsonl`. `docs/deployment.md` states that Vercel's
filesystem is ephemeral and not shared between instances, so the `jsonl` driver cannot
be trusted there **[code]**.
PS2 impact: every interaction collected before this is fixed is lost on the next
redeploy or scale-down. You could reach the deadline with a working app, an empty log,
and no way to evidence 50 turns.
Fix: set `LOG_DRIVER=postgres` and `DATABASE_URL`, run
`psql "$DATABASE_URL" -f scripts/schema.sql` once, and confirm a row actually lands
before recruiting anyone.

**N4. Submission paperwork is unstarted.**
`endorsement-letter-template.md` still contains `[Name]`, `[Date]` and an unsigned
block; `team-profile.md` still needs the contribution breakdown; the demo video is unrecorded
**[ran]**. The HoD signature is institutional and has the longest lead time of
anything you control.

### Correctness / disclosure

**N5. README claims "Live deployment" without qualification while inference is down.**
Evidence: `README.md` → `**Live deployment:** <https://n-atlas-voice-tutor-deltaos-core.vercel.app>`,
while the same URL serves a 503 health check **[ran]**. `docs/submission/checklist.md`
row 1 is honest about the 503.
Fix: either bring the stack up (N1) or qualify the claim until it is up. Do not leave
a bare URL that a judge clicks straight into a broken app.

### Open, low cost

| Item | Detail | Fix cost |
| --- | --- | --- |
| C18 | `next.config.mjs` uses `experimental.serverComponentsExternalPackages`; Next 14.2 warns it is moving to top-level `serverExternalPackages` **[code]**. Build is clean today. | One line; do it before a Next major. |
| C16 | `PostgresDriver` opens and closes a connection per read and per write **[code]**. Fine at validation scale (50–500 rows); pathological at 1000 users. | Keep as a disclosed scale limit. |
| — | PS2 channel fit (mobile web vs "low-bandwidth mobile applications") is a judgement call, not a defect. | Argue it in the team profile and video. |

### Resolved since the 2026-10-03 audit — verified today, do not re-audit

| Old id | Finding | Resolution |
| --- | --- | --- |
| A4 | `/validation` published transcripts without authentication | Gated by `isValidAdminToken` (`validation/page.tsx:22`) **[code]** |
| A5 | `hf-router` documented as a working ASR transport | Removed from `asr.ts` and `docs/n-atlas-integration.md` **[code]** |
| B6 | Per-checkpoint ASR attribution missing | `NATLAS_ASR_ATTRIBUTIONS` carries all three verbatim strings **[code]** |
| B7 | `date_string` formatted `2026-10-03` | `todayStamp()` now returns `03 Oct 2026` **[code]** |
| B8 | HF transport omitted `date_string` | Deliberate, and now documented in `llm.ts` with a written rationale **[code]** |
| B9 | README vs checklist deployment contradiction | Checklist corrected to state the deployed status and the 503 **[code]** |
| C11 | `iso6393` held ISO 639-1 codes | Renamed `asrLanguageKey` **[code]** |
| C12 | `pendingTranscript` unreachable "Transcribing" UI | Removed **[code]** |
| C13 | Dead exports | `markAuthenticated`, `readInteractionFiles`, `refusalEnglishFor` removed **[code]** |
| C14 | `'christianity'` duplicated in `SENSITIVE_TERMS` | Single entry **[code]** |
| C15 | `REFUSALS_EN` held non-English strings | Removed **[code]** |
| C17 | `TranscriptPanel` used `lang="Hausa"` | Invalid `lang` removed; `tts.ts` uses correct `ha-NG`/`ig-NG`/`yo-NG` **[code]** |
| C19 | No Python linter or test in the repo | `asr-service/ruff.toml` and `asr-service/tests/test_app.py` exist **[code]** |
| — | Supervisor's name spelled three ways across the repo | Standardised on **Simeon** in `attribution.ts` and `README.md` **[ran]** |
| — | Stray `deltaos-core/asr-service` Vercel project | Deleted; it had never built (5157 MB bundle) and served nothing **[ran]** |

---

## 5. Setting up the inference layer: Hugging Face vs Modal

### 5.1 The facts that decide it

Everything below is verified against the source, not assumed.

1. **Both the LLM and all four ASR checkpoints are gated.** `NCAIR1/N-ATLaS` and
   `NCAIR1/Hausa-ASR` both render *"You need to agree to share your contact
   information to access this model."* **[src]** You must accept the terms on
   **five separate repos**, with the same HF account, before any download works.
2. **There is no serverless inference for any of them.** Both cards state
   *"This model isn't deployed by any Inference Provider."* **[src]** There is no
   key-free, quota-free hosted endpoint. This is what kills the `hf-router` path
   (defect A5) and it means "just use the HF Inference API" is not an option.
3. **HF Inference Endpoints are dedicated and always on.** Billed per hour for as
   long as the endpoint exists, whether or not anyone calls it: L4 24 GB $0.80/hr,
   A10G 24 GB $1.00/hr, A100 80 GB $2.50/hr, H100 $4.50/hr, T4 16 GB $0.50/hr;
   CPU-only 4 vCPU/8 GB $0.13/hr, 8 vCPU/16 GB $0.27/hr **[src]**. A 24/7 L4 is
   ≈ **$576/month**. The compensating advantage: **no cold starts**.
4. **Modal is serverless and bills per second.** L4 $0.000222/s (≈$0.80/hr),
   A10 $0.000306/s (≈$1.10/hr), A100-40 GB $0.000583/s, A100-80 GB $0.000694/s,
   H100 $0.001097/s (≈$3.95/hr), T4 $0.000164/s (≈$0.59/hr) **[src]**. Starter
   includes **$30/month free compute**, 3 seats and 10 GPU concurrency, and
   academics can apply for up to **$10k** **[src]**. You are billed for container
   load time, processing, and the keep-alive window (default 60 s, configurable)
   **[src]**.
5. **The community has already deployed N-ATLaS on Modal.** The official N-ATLaS
   discussion thread links a working vLLM-on-Modal guide, and its author recommends
   Modal over HF/RunPod/Lambda on exactly the grounds that matter here — the $30
   credit, per-second billing, no credit card **[src]**. The guide lives at
   `huggingface.co/tosinamuda/N-ATLaS-FP8/blob/main/deploy-guide.md`.
6. **The community GGUF your docs reference is real.**
   `tosinamuda/N-ATLaS-GGUF/N-ATLaS-GGUF-Q4_K_M.gguf`, 4.92 GB **[src]** — so
   `docs/deployment.md` § 1 Option A is accurate as written.

### 5.2 Recommendation

**Use Modal for both the LLM and the ASR service. Use Hugging Face only as the
weight source, plus a demo-day fallback if you need a guaranteed warm endpoint.**

In order of weight:

- **Cost.** Your realistic usage between now and 12 Oct is a handful of hours of
  demoing plus the validation sessions. On Modal that is single-digit dollars
  inside the free $30. On HF Inference Endpoints the same coverage is
  $0.80–$2.50 **per hour, continuously** — a week of L4 costs more than the whole
  demo is worth.
- **Cold starts are a thing to manage, not a reason to overpay.** Modal's 2–3 minute
  cold start is real and it *will* break the app (gotcha G4). But you hit it once
  per scale-down window, and you can simply keep the app warm during recording and
  during the 15–17 Oct verification window.
- **One platform for both models.** The ASR service is already a self-contained
  FastAPI app with its own Dockerfile; wrapping it for Modal is ~20 lines. That
  removes an entire second deployment target.
- **Academic credit.** You are a university team. Apply to Modal's academic
  programme; up to $10k removes cost from the conversation entirely.

Do **not** pick HF Inference Endpoints first. Pick it only if, on the morning of the
recording, Modal is misbehaving and you want to stop debugging.

### 5.3 Prerequisites — do this once, first

```bash
pip install -U "huggingface_hub[cli]" modal
hf login          # a token with read access
python3 -m modal setup         # browser auth
```

Then accept the licence conditions on **all five** repos while logged into the same
HF account, or every download will 401:

- https://huggingface.co/NCAIR1/N-ATLaS
- https://huggingface.co/NCAIR1/Hausa-ASR
- https://huggingface.co/NCAIR1/Igbo-ASR
- https://huggingface.co/NCAIR1/Yoruba-ASR
- https://huggingface.co/NCAIR1/NigerianAccentedEnglish

Confirm the token can actually read the gated weights:

```bash
hf download NCAIR1/N-ATLaS config.json --local-dir /tmp/natlas-check
```

If that fails, nothing downstream will work. Do not proceed past this line.

### 5.4 Option 1 (recommended) — everything on Modal

> **Status update (2026-10-04).** The LLM half of this section now exists as a real,
> validated file: **`scripts/modal_llm.py`** — the official `NCAIR1/N-ATLaS` on vLLM
> behind an OpenAI-compatible endpoint, with an API key so the endpoint cannot be
> used to spend the free credit. **Deploy that file.** The ASR half is still unwritten.
> The listing below is the design it grew from and is kept for reference.

Two Modal apps in one file, so there is one deploy command.

**Status: this section is the design the code grew from, and the deployed files have
moved on.** What actually runs in production is two files, not one:

| File | What it serves | GPU | Notes |
| --- | --- | --- | --- |
| `scripts/modal_llm.py` | `NCAIR1/N-ATLaS` over an OpenAI-compatible API | `L4:1` | `vllm==0.21.0`, CUDA 12.9 |
| `scripts/modal_asr.py` | this repo's own FastAPI app on port 8000 | `L4:1` | `scaledown_window=300`, `startup_timeout=600` |

Both scale to zero after 30 idle minutes (`scaledown_window=30 * MINUTES`, no
`min_containers`), so an unused endpoint is free — see §5.7 for what that costs
instead. Both read
the **`natlas-hf`** Modal secret, which must contain `HF_TOKEN`,
`NATLAS_LLM_API_KEY` *and* `NATLAS_ASR_API_KEY`. The ASR bearer token is compared
by `asr-service/app.py::_require_auth`. Until 2026-10-04 `/health` needed no token,
so a mismatch showed up as healthy health plus a failing `/transcribe` — the exact
state production was in. `/health` now returns an `auth` verdict and the app's probe
fails on `mismatch`, but the ASR app must be redeployed for the probe to see it.

The single-file sketch that follows is kept for the reasoning, not as copy-paste:

```python
import modal

MINUTES = 60

# ---------------- LLM: NCAIR1/N-ATLaS via vLLM ----------------
vllm_image = (
    modal.Image.from_registry("nvidia/cuda:12.8.0-devel-ubuntu22.04", add_python="3.12")
    .entrypoint([])
    .uv_pip_install("vllm==0.11.2", "huggingface-hub==0.36.0")
    .env({"HF_XET_HIGH_PERFORMANCE": "1"})
)

hf_cache = modal.Volume.from_name("natlas-hf-cache", create_if_missing=True)

llm_app = modal.App("natlas-llm")
LLM_PORT = 8000


@llm_app.function(
    image=vllm_image,
    gpu="A10G",                      # 24 GB, $0.000306/s
    scaledown_window=15 * MINUTES,   # raise to 60 * MINUTES on recording day
    timeout=10 * MINUTES,
    volumes={"/root/.cache/huggingface": hf_cache},
)
@modal.concurrent(max_inputs=8)
@modal.web_server(port=LLM_PORT, startup_timeout=10 * MINUTES)
def serve_llm():
    import subprocess

    cmd = [
        "vllm", "serve", "NCAIR1/N-ATLaS",
        "--served-model-name", "NCAIR1/N-ATLaS",  # see gotcha G1
        "--host", "0.0.0.0",
        "--port", str(LLM_PORT),
        "--max-model-len", "8092",                # N-ATLaS is tuned to 8,092
        "--enforce-eager",                        # faster cold start
    ]
    subprocess.Popen(" ".join(cmd), shell=True)


# ---------------- ASR: NCAIR1/*-ASR via this repo's own FastAPI app ----------------
asr_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "fastapi==0.115.5",
        "uvicorn[standard]==0.32.1",
        "python-multipart==0.0.17",
        "transformers==4.46.3",
        "accelerate==1.1.1",
        "numpy==2.1.3",
        "soundfile==0.12.1",
        "huggingface_hub==0.26.2",
        "torch==2.5.1",
    )
    .env({"PRELOAD_LANGUAGES": "ha,ig,yo"})       # preload, see gotcha G6
    .add_local_file("asr-service/app.py", remote_path="/srv/app.py")
)

asr_app = modal.App("natlas-asr")
ASR_PORT = 8000


@asr_app.function(
    image=asr_image,
    gpu="T4",                        # 16 GB is ample for three Whisper-small models
    scaledown_window=15 * MINUTES,
    timeout=10 * MINUTES,
    volumes={"/root/.cache/huggingface": hf_cache},
    secrets=[modal.Secret.from_name("huggingface-token")],
)
@modal.concurrent(max_inputs=8)
@modal.web_server(port=ASR_PORT, startup_timeout=10 * MINUTES)
def serve_asr():
    import subprocess

    subprocess.Popen(
        f"uvicorn app:app --host 0.0.0.0 --port {ASR_PORT}",
        shell=True,
        cwd="/srv",
    )
```

Create the secret once, using the HF token that has accepted all five licences:

```bash
modal secret create natlas-hf HF_TOKEN=hf_xxxxxxxx NATLAS_LLM_API_KEY=... NATLAS_ASR_API_KEY=...
```

Deploy, then read the two URLs off the output:

```bash
python -m modal deploy scripts/modal_llm.py
python -m modal deploy scripts/modal_asr.py
# https://<workspace>--natlas-llm-server.modal.run      (production: ...us-east.modal.direct)
# https://<workspace>--natlas-asr-server.modal.run      (production: ...us-east.modal.direct)
```

Point the app at them:

```bash
# LLM — the base must include /v1; the client appends /chat/completions
NATLAS_LLM_PROVIDER=openai-compatible
NATLAS_LLM_BASE_URL=https://<workspace>--natlas-llm-server.modal.direct/v1
NATLAS_LLM_MODEL=NCAIR1/N-ATLaS
NATLAS_LLM_API_KEY=the NATLAS_LLM_API_KEY in the natlas-hf secret

# ASR — the key must be the NATLAS_ASR_API_KEY in the same secret, byte for byte
NATLAS_ASR_PROVIDER=service
NATLAS_ASR_BASE_URL=https://<workspace>--natlas-asr-server.modal.direct
NATLAS_ASR_API_KEY=the NATLAS_ASR_API_KEY in the natlas-hf secret
```

Verify before you open a browser:

```bash
curl -s https://<workspace>--natlas-llm-server.modal.direct/v1/models | jq
curl -s https://<workspace>--natlas-asr-server.modal.direct/health | jq '.models, .loaded'

# /health needs no token, so also prove the token itself:
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  -H "authorization: Bearer $NATLAS_ASR_API_KEY" \
  -F 'file=@clip.wav' -F 'language=ha' \
  https://<workspace>--natlas-asr-server.modal.direct/transcribe

# the app's own go/no-go probe:
curl -s http://localhost:3000/api/health | jq
```

`/api/health` returns `ok: true` only when the LLM probe succeeds **and** the ASR
service reports at least three `NCAIR1/` checkpoints
(`src/app/api/health/route.ts::probeAsr`) **[code]**. Treat that as the gate before
anything else.
### 5.5 Option 2 — Hugging Face Inference Endpoints (demo-day fallback only)

Use this if Modal is misbehaving on recording day, or if Modal blocks the account.

Create endpoints at <https://endpoints.huggingface.co> from the **same account that
accepted the licences**:

1. **LLM** — `NCAIR1/N-ATLaS`, task *Text Generation*, container *vLLM*,
   instance **NVIDIA L4 (24 GB)**, $0.80/hr. 8B in BF16 is ~16 GB of weights, so L4
   is the cheapest instance that fits. Set max context to **8092**.
2. **ASR** — one per language. These are 244M Whisper-small models, ~1 GB each, so
   a **CPU instance (4 vCPU / 8 GB, $0.13/hr)** is enough for a demo. Use a T4
   ($0.50/hr) if you want headroom on long clips.

```bash
NATLAS_LLM_PROVIDER=hf-inference-endpoint
NATLAS_LLM_BASE_URL=https://<id>.<region>.aws.endpoints.huggingface.cloud
NATLAS_LLM_API_KEY=<endpoint token>
NATLAS_LLM_MODEL=NCAIR1/N-ATLaS
```

**Important trap.** `NATLAS_LLM_PROVIDER=hf-inference-endpoint` makes the client
call `{base}/v1/chat/completions` and the health probe call `{base}/v1/models`
**[code]** — which matches a vLLM-container Endpoint. But you **cannot** point
`NATLAS_ASR_PROVIDER` at a raw HF Endpoint: `callAsrService` posts to
`{base}/transcribe` and requires a JSON body containing **both** `text` and
`model` (`src/lib/natlas/asr.ts`) **[code]**. An HF Endpoint speaks
`/v1/audio/transcriptions` and returns a different shape, so the app's compliance
check (`model` must start with `NCAIR1/`) would reject it anyway. **An HF ASR
Endpoint still needs the `asr-service/` wrapper in front of it** — and once you
are wrapping it, you may as well host the wrapper somewhere cheaper. This is the
strongest practical argument for Option 1.

### 5.6 Option 3 — fully local (highest-confidence first run)

Use this to prove the pipeline end to end before moving to Modal.

```bash
# LLM — ~4.9 GB RAM, CPU-viable
hf download tosinamuda/N-ATLaS-GGUF N-ATLaS-GGUF-Q4_K_M.gguf --local-dir models/
./llama-server -m models/N-ATLaS-GGUF-Q4_K_M.gguf \
  --host 0.0.0.0 --port 8080 --ctx-size 8092 --alias NCAIR1/N-ATLaS

# ASR — needs a GPU, or a patient CPU
docker build -f asr-service/Dockerfile -t natlas-asr .
docker run --gpus all -p 8000:8000 -e HF_TOKEN=hf_... \
  -e PRELOAD_LANGUAGES=ha,ig,yo natlas-asr

# Tunnel so phones can reach it (mic needs HTTPS off localhost)
cloudflared tunnel --url http://localhost:3000
```

Note `--alias NCAIR1/N-ATLaS` — llama.cpp must advertise the official id, because
`config.ts` rejects any `NATLAS_LLM_MODEL` without the `NCAIR1/` prefix **[code]**.

### 5.7 Cost comparison

**Corrected twice on 2026-10-04.** The first version of this table priced Modal as
scale-to-zero, which was wrong: both deployed apps set `min_containers=1` so a demo
would never pay a cold start, and therefore billed continuously. The second version
corrected that, which was also wrong in practice: ~$38/day for two always-on L4s
against a $30/month credit is not a plan anyone will actually keep. **As of
2026-10-04 both apps scale to zero** — `min_containers` removed,
`scaledown_window=30 * 60` in both `scripts/modal_llm.py` and
`scripts/modal_asr.py`. An endpoint nobody is demonstrating to now costs nothing.

**Prices verified against modal.com/pricing on 2026-10-05.** An L4 is
$0.000222/sec, which is $0.80/hr. Modal's own FAQ states that the scale-down
window *is* billed and that nothing is charged once the app has scaled to zero
— the “idle is $0” row below rests on that sentence, not on assumption. CPU
($0.0000131/core/sec, 0.125-core minimum) and memory ($0.00000222/GiB/sec) are
metered on top of the card, so treat $0.80/hr as a floor and check the first real
invoice. The Starter plan's $30/month credit and the “up to $10k” academic grant
are also from that page; the 3-seat Starter limit is a real constraint on a 5-person
team if more than 3 people ever need Modal access. The plain-language version for
team members and the supervisor is `docs/submission/cost-note.md`.

| | Modal, two L4s, scale to zero (current) | Modal, two always-on L4s (rejected) | HF Inference Endpoint (L4, always on) |
| --- | --- | --- | --- |
| Rate | ≈ $0.80/hr each, only while up | ≈ $1.60/hr together | ≈ $0.80/hr, billed continuously |
| Idle | **$0** | ≈ $38/day | ≈ $19/day |
| 6 h of actual use | ≈ **$9.60** for the pair | ≈ $9.60 | ≈ $4.80 for the LLM alone |
| 7 days, one 1 h demo a day | ≈ **$11** use, ≈ **$17** with scale-down lag | ≈ $269 | ≈ $134 for the LLM alone |
| 7 days, left running | ≈ **$0** | ≈ $269 | ≈ $134 |
| 30 days, one 1 h demo a day | ≈ **$48** use, ≈ **$72** with scale-down lag | ≈ $1,152 | ≈ $576 for the LLM alone |
| Free tier | $30/month; up to $10k academic | $30/month | none |
| Cold start | minutes, on the first turn after 30 idle minutes | avoided by `min_containers=1` | none |

**What scale-to-zero costs instead.** A vLLM cold start takes minutes, and
`app/api/turn/route.ts` caps `maxDuration = 60`, so the first turn after an idle
stretch fails outright rather than being merely slow. Three things follow, all
required rather than optional:

1. Warm both endpoints deliberately before recording, demoing or recruiting —
   `python -m modal run scripts/modal_llm.py` and `scripts/modal_asr.py`. Each boots
   the server, waits out `/health`, and then exercises the model, so they double as
   post-deploy verification.
2. Warm minutes ahead, not seconds. `scripts/modal_asr.py` preloads the three
   checkpoints at boot for exactly this reason.
3. Set `min_containers=1` back on both apps for demo day only, if a cold start
   landing in the middle of a judged run is worse than $38. It is one day of spend
   against a $30 monthly credit.

The credit covers several demo days comfortably. What must not happen is two
always-on endpoints running unnoticed on the assumption that they are free.
---

### 5.8 Gotchas that will actually cost you hours

**G1 — the served model name must be `NCAIR1/N-ATLaS`, not `n-atlas`.**
The community Modal guide sets `--served-model-name n-atlas` **[src]**. The app
sends `"model": "NCAIR1/N-ATLaS"` (from `NATLAS_LLM_MODEL`) to
`{base}/chat/completions` **[code]**. vLLM answers that with `404 model not found`.
Either set `--served-model-name NCAIR1/N-ATLaS` (as in §5.4), or change
`NATLAS_LLM_MODEL` — but note `src/lib/natlas/config.ts` **rejects any value not
prefixed `NCAIR1/`**, so `n-atlas` makes the process refuse to start **[code]**.
Set it server-side. One line, or hours lost.

**G2 — the base URL must include `/v1`, exactly once.**
`callOpenAiCompatible` appends `/chat/completions` to `NATLAS_LLM_BASE_URL`
**[code]**, and the default is `http://127.0.0.1:8080/v1`. So Modal's
`...modal.run/v1`. Paste `...modal.run` instead and the request goes to
`/chat/completions` and 404s. The community thread shows someone hitting exactly
this class of error **[src]**.

**G3 — `HF_TOKEN` must be a Modal secret, not an env var you forget.**
`asr-service/app.py` downloads gated weights through `transformers`, which reads
`HF_TOKEN` from the environment. Without it the ASR container starts, the LLM call
succeeds, and transcription fails — which reads like an app bug rather than a
credentials bug.

**G4 — a cold Modal container outlives both timeouts.**
Cold start is 2–3 minutes **[src]**. The app aborts at `NATLAS_LLM_TIMEOUT_MS`
(default **120 s**) **[code]**, and the Vercel route caps itself at
`maxDuration = 60` **[code]** — and `docs/deployment.md` notes Hobby plans hard-cap
that at 10 s. A cold Modal endpoint does not degrade, it *fails*. Warm both
endpoints and raise `scaledown_window` before recording; keep a tab open during the
15–17 Oct verification window.

**G5 — Modal endpoints are public by default.**
Anyone with the URL can burn your credit. Set a shared secret and pass it as
`NATLAS_LLM_API_KEY` / `NATLAS_ASR_API_KEY`, or restrict access at the Modal proxy.
The app already sends `Authorization: Bearer` when those are set **[code]**, so
this is a server-side change only.

**G6 — preload the ASR checkpoints or a learner pays the download.**
`asr-service/Dockerfile` installs `ca-certificates` and nothing pre-downloads a
cache. On Modal the first `/transcribe` triggers three model downloads (~1.5 GB
total) inside the request. Mount the volume (§5.4) and set
`PRELOAD_LANGUAGES=ha,ig,yo` so the download happens at container start.

**G7 — Vercel's filesystem is ephemeral; `LOG_DRIVER=jsonl` silently loses data.**
`docs/deployment.md` already says this, but it is the failure mode that would
destroy your 50-interaction evidence: every deploy or cold start wipes
`./data/interactions.jsonl`. Set `LOG_DRIVER=postgres` + `DATABASE_URL` and run
`psql "$DATABASE_URL" -f scripts/schema.sql` **before recruiting a single learner**.
Losing 50 interactions to a redeploy on 11 October is the worst outcome available.

**G8 — the ASR service has no test and no linter.**
`npm run lint` does not see Python **[ran]**. You are about to change how it is
served, so smoke-test the deployed service before inviting learners:

```bash
curl -s -F 'file=@validation/asr-samples/hausa/hausa-001.wav' -F 'language=ha' \
  https://<workspace>--natlas-asr-server.modal.direct/transcribe | jq
```

Expect `model: "NCAIR1/Hausa-ASR"`. Anything else means the deployment is
non-compliant — do not proceed.

---

### 5.9 Critical path from here

Ordered strictly; each step unblocks the next. **Eight days** (deadline 12 Oct,
23:59 WAT).

Step 5 of the previous plan (close A4, A5, B6, B7, B9) is **done** — see §4,
*Resolved*. The Next.js app is already deployed, which moves the real work forward
without reducing it, because the deployed app cannot currently serve a turn.

1. ~~**Stop the data loss.**~~ **Done**: `LOG_DRIVER=postgres` and `DATABASE_URL` are
   set on Vercel, `scripts/schema.sql` is applied, and 5 turns are readable through
   `GET /api/export`. (N3, G7)
0. ~~**Rotate the ASR service token.**~~ **Done 2026-10-05.** One new random value in
   the `natlas-hf` secret and in the Vercel production variable, both apps redeployed,
   Vercel redeployed (an env change does not reach a running deployment otherwise).
   Verified by an authenticated `POST /transcribe` returning 200, not by `/api/health`
   — though `/api/health` would now have caught it, since the service reports an
   `auth` verdict and the probe fails on `mismatch`.
2. **Then fix inference.** Accept the five HF licences, create the `natlas-hf`
   Modal secret, deploy `scripts/modal_llm.py` and `scripts/modal_asr.py`, and point
   both Vercel variables at the resulting URLs. **Done 2026-10-03** — but see step 0.
   (§5.3, §5.4, N1)
3. **Then verify from outside.** `GET /api/health` must report `ok: true` with at
   least three loaded `NCAIR1/` checkpoints. Until it does, record nothing.
4. **Then recruit — today, in parallel.** Steps 1–3 are code; recruitment is people,
   and it is the only item that cannot be compressed. Start asking learners now
   and let the stack come up underneath them. (N2)
5. **Day 1–2.** Record the demo video with the endpoints warm. (component #5)
6. **Day 1–8.** Collect the 50+ documented interactions: 15–20 learners, 3–5
   sessions each, 3–8 turns per session.
7. **Day 8.** Fill the team profile; get the HOD letter signed. (N4)
8. **Day 8.** `npm run export:csv`, `npm run validation:report`,
   `python scripts/evaluate-asr.py`. Confirm `export:csv` prints no
   `COMPLIANCE FAILURE`. Submit.

The highest-risk item is recruitment (step 4), then the log driver (step 1) —
because an unfixed log driver makes every hour of validation work unrecoverable.

---

## 6. `.env.example`

`README.md` § 3 and `docs/deployment.md` § 3 both instruct
`cp .env.example .env.local`. The file is tracked in git with complete content; it
was absent from the working tree at the start of this audit, so the documented step
would have failed (defect A3, corrected).

`.env.example` is tracked and complete, and its comments carry the traps from §5.8:
the `/v1` requirement on the LLM base URL, the five gated repos that must be accepted
before any download works, and the warning that Vercel's ephemeral filesystem makes
`LOG_DRIVER=jsonl` unsafe there. (This paragraph previously claimed a comment about
`hf-router` that was never written; there is no `hf-router` anywhere in the repo.)

`.gitignore` keeps **both** the catch-all `.env*` (line 31) and the explicit
`.env`, `.env.local`, `.env.*.local` patterns, with `!.env.example` last. An earlier
version of this document claimed the catch-all had been replaced; it was not. The
current ordering works because `!.env.example` is the last matching rule, so the
template stays tracked while `.env.local` and `.env.modal` stay ignored — both of
which are ignored today, verified with `git check-ignore -v`.

---

## 7. One-paragraph summary

**Rewritten 2026-10-04; the previous version of this paragraph was stale and
contradicted §0, §1 and §4 of this same file.** The app **is** deployed
(`deltaos-core/n-atlas-voice-tutor`, auto-deploying from `main`) and both N-ATLaS
inference endpoints run on Modal. `GET /api/health` returns HTTP 200 `ok: true` with
`NCAIR1/N-ATLaS` served and four `NCAIR1/` ASR checkpoints loaded. The engineering
is real: the integration is enforced in three independent places, lint, types and
build pass, and the ASR service refuses to load anything outside `NCAIR1/`.

What is missing is evidence. **Zero of the 50 required real user interactions are
complete.** Five turns are logged and all five failed at the ASR step, because the
ASR bearer token did not match the token in the `natlas-hf` Modal secret — every
`/transcribe` returned 401 while `/health`, which needs no token, stayed green.
**That link in the chain was closed on 2026-10-05:** the token was rotated in both
places, both Modal apps and Vercel were redeployed, and an authenticated
`POST /transcribe` now returns 200. Nothing technical blocks the submission any
more; what remains is people and paperwork — record the video, recruit learners,
export the evidence (`npm run export:csv` now pulls from the deployment), fill the
team profile and obtain the signed Head of Department letter. Also decide the compute
bill: both Modal apps now scale to zero after 30 idle minutes, so they are free
while unused and paid only for actual use — which makes warming them before a
recording or demo a task, not an optimisation.
