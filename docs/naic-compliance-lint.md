# NAIC 2026 compliance lint — N-ATLaS Voice Tutor

Audit date: 2026-10-03. Target: <https://ncair.nitda.gov.ng/naic/#tracks>.
Problem statement: **02 — Voice-First Access**. Track: **A — Academia & Research**.
Deadline: **12 October 2026, 23:59 WAT** (9 days from this audit).

Every claim below is marked with how it was established:

- **[ran]** — executed in this repo
- **[src]** — read from the official source (NAIC page, HF model card, HF/Modal pricing)
- **[code]** — read from this repository

---

## 0. What was actually executed

| Check | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | `✔ No ESLint warnings or errors` **[ran]** |
| Types | `npm run typecheck` (`tsc --noEmit`) | clean, no diagnostics **[ran]** |
| Build | `npm run build` | `✓ Compiled successfully`, 11 routes, 99 kB first load **[ran]** |
| HF checkpoints | fetched `huggingface.co/NCAIR1` | all 5 repos exist **[src]** |

Build output:

```
Route (app)                              Size     First Load JS
┌ ƒ /                                    3.12 kB          99 kB
├ ƒ /api/asr                             0 B                0 B
├ ƒ /api/export                          0 B                0 B
├ ƒ /api/health                          0 B                0 B
├ ƒ /api/log                             0 B                0 B
├ ƒ /api/turn                            0 B                0 B
├ ƒ /api/tutor                           0 B                0 B
├ ƒ /session                             7.23 kB         103 kB
├ ƒ /team                                178 B          96.1 kB
└ ƒ /validation                          178 B          96.1 kB
+ First Load JS shared by all            87.2 kB
```

The README's "~99 kB first load" claim is accurate.

---

## 1. Verdict

**The code is not the problem.** Lint, types and build are all clean. The N-ATLaS
integration is genuine, verifiable, and enforced in three places — this is better
evidence discipline than most NAIC entries will have. Do not rewrite any of it.

**Two things block the submission, and neither is a code defect:**

1. Nothing is deployed.
2. There are 0 of the 50 documented real user interactions PS2 requires.

**Three defects would cost you points or embarrass you in front of the panel:**

- `/validation` renders full learner transcripts to anyone with the URL.
- `hf-router` is documented as a supported ASR transport and cannot work.
- The docs contradict each other about whether the app is deployed.

Everything else is polish.

---

## 2. Requirement-by-requirement

### 2.1 General eligibility

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| All members Nigerian citizens or registered entities | ⚠️ | Not verifiable from code. `NATLAS_TEAM` lists 3 names/affiliations **[code]** — you must be able to prove citizenship per member. |
| Original work, not previously awarded | ⚠️ | Cannot self-certify in code. Requires the declaration checklist in `docs/submission/team-profile-template.md` to be ticked. |
| Each team submits to only one problem statement | ✅ | PS2 only; no second statement anywhere **[code]**. |
| Functioning artefact integrated with N-ATLAS | ⚠️ | The build is functioning and integrated **[ran]**; it is **not deployed**. |
| Applications and materials in English | ✅ | All docs English **[code]**. The app speaks Nigerian languages to learners — that is the product, not the submission material. |

### 2.2 Problem Statement 02 (Voice-First Access)

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Voice input must use the **official N-ATLAS ASR service** for the relevant language | ✅ | `src/lib/natlas/asr.ts` → `NCAIR1/Hausa-ASR`, `NCAIR1/Igbo-ASR`, `NCAIR1/Yoruba-ASR`, selected from the learner's language, never from audio it could sniff **[code]**. All three repos verified to exist **[src]**. |
| Real-world validation: **minimum 50 documented user interactions** | ❌ | `validation/README.md` states `0 / 50`. `validation/REPORT.md` is a placeholder. Nothing is fabricated — correct, but it is 0. |
| Use case must be one of: education, agriculture, health, civic, financial literacy | ✅ | Education / language learning **[code]**. |
| Delivery channel | ⚠️ | PS2 lists WhatsApp voice notes, USSD, IVR, **low-bandwidth mobile applications**. This is a mobile-web app, not a native low-bandwidth app and not a messaging/USSD channel. It is closest to the fourth bullet but you are asking the panel to accept a browser as "low-bandwidth mobile application". Say so explicitly in the team profile and demo video rather than leaving it implicit — the low-bandwidth engineering is real and documented (`docs/architecture.md` § Low-bandwidth choices), so argue it, don't hide it. |

### 2.3 Build requirements

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| A working technical build | ⚠️ | Builds and runs **[ran]**; not deployed, so there is no live artefact to point at. |
| Genuine N-ATLAS integration | ✅ | Three independent runtime guards: `config.ts` Zod refinement requires the `NCAIR1/` prefix; `asr.ts` rejects any ASR payload whose `model` is not `NCAIR1/…`; `asr-service/app.py::assert_official()` refuses to load outside `NCAIR1/` **[code]**. |
| Real-world validation (real users / data / live benchmarks) | ❌ | None. `validation/asr-samples/` is empty of clips; no WER figures exist yet. |
| Not sufficient — research paper without build | n/a | This is a build, not a paper. |
| Not sufficient — slides, frameworks, mock-ups, proposals | n/a | Not the case here. |
| Solutions not integrated with N-ATLAS are ineligible | ✅ | See above. |

### 2.4 The seven submission components

| # | Component | Status | Where it lives / what is missing |
| --- | --- | --- | --- |
| 1 | Working artefact (repo, deployed app, published model, live API) | ❌ | Repo yes; **deployment no**. |
| 2 | N-ATLAS integration evidence | ✅ | `docs/n-atlas-integration.md` — genuinely strong: models, call sites, transport options, rejected alternatives, reviewer verification steps. |
| 3 | Real-world validation | ❌ | `validation/` zero rows. |
| 4 | Technical documentation | ✅ | `README.md`, `docs/architecture.md`, `docs/deployment.md`, `docs/limitations.md`, `docs/tts.md`. |
| 5 | Video demonstration, 3–5 min | ❌ | `docs/submission/demo-video-script.md` is written and good; not recorded (blocked on #1). |
| 6 | Team profile | ❌ | `docs/submission/team-profile-template.md` — brackets unfilled. |
| 7 | Endorsement / registration | ❌ | `docs/submission/endorsement-letter-template.md` — unsigned. |

### 2.5 Track A (Academia & Research)

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Team size 2–5 | ✅ | 3 members in `src/lib/natlas/attribution.ts` **[code]**. |
| At least one enrolled student or postgraduate researcher | ⚠️ | Listed as "PG student" in the README table **[code]** — needs proof of enrolment. |
| A faculty supervisor | ✅ | Prof. Semion Olaogun listed as Academic Lead **[code]**. |
| Institutional endorsement letter signed by Head of Department | ❌ | Template only. |

> **Note on a discrepancy in the official material.** The Tracks section says both
> tracks are 2–5 members; the FAQ says Track B is 1–6. That affects Track B only,
> so it does not change anything for you — but do not quote the FAQ at a Track A
> panel.

### 2.6 Evaluation criteria — where this submission is strong and weak

| Criterion | Read |
| --- | --- |
| Working artefact & technical rigour | Strong code; **no deployed artefact yet**. |
| N-ATLAS integration | **Strongest asset.** Real checkpoints, runtime enforcement, per-turn evidence in the CSV. |
| Real-world validation | **Weakest asset.** Zero. |
| Impact potential | Good story (people who do not type), needs the user evidence to land. |
| Scalability & sustainability | Honest limitation docs help here; the 1000-active-user licence cap is correctly disclosed. |
| Team capability | Linguistics department + engineering partner is a genuinely good shape; unfilled profile currently shows as blank. |

---

## 3. What the code already gets right — do not "improve" these

Recording them so nobody refactors them away under deadline pressure:

- **Server-side chaining in `/api/turn`** so the logged checkpoint ids cannot be
  forged by a browser. This is the single best compliance decision in the repo
  (`src/lib/tutor/turn.ts`) **[code]**.
- **Three model-identity guards** (config, ASR response, ASR service loader)
  **[code]**. All five `NCAIR1` repos verified real **[src]**.
- **Per-turn evidence in the CSV** (`asrModel`, `llmModel`, both latencies,
  `ttsEngine`, `networkType`) and the `EvidenceStrip` on screen **[code]**.
- **`export-csv.mjs` fails hard** with `COMPLIANCE FAILURE` if any non-`NCAIR1/`
  model id appears in the log **[code]**. Keep that.
- **Honest limitations** — Yorùbá 2.69/5.0 is disclosed in the UI, README and
  `docs/limitations.md`. The model card confirms these figures **[src]**. Panels
  reward this; do not soften it.
- **Guest mode / no login** and **no audio persisted** **[code]**.
---

## 4. Defect register

Ranked by what it costs you. "PS2 impact" is the concrete consequence.

### A. Blocking — the submission is invalid until these are closed

**A1. Nothing is deployed.**
PS2 impact: submission component #1 ("working artefact") is unsatisfied, and #5
(the video) is blocked on it. `docs/submission/checklist.md` itself says
`Build ready, **not deployed**`.
Fix: §5 below.

**A2. 0 of 50 documented interactions.**
PS2 impact: component #3 unsatisfied. This is the *only* requirement with a hard
numeric threshold, and it is the longest lead-time item — recruiting learners takes
days, not hours. With 9 days left, start recruiting before the deployment is
polished.
Fix: deploy, then recruit. `validation/README.md` already has a sound plan.

**A3. `.env.example` was absent from the working tree** — *corrected after checking git*.
Evidence: `README.md` § *3. App* and `docs/deployment.md` § *3. Next.js app* both
instruct `cp .env.example .env.local`. The file **is** tracked in git (it appears in
commit `37b5452`) with complete, correct content, but it was **not present in the
working tree** when this audit began, so the documented setup step would have failed
from this checkout.

A first draft of this report claimed the file did not exist in the repository. That
was wrong: it exists in git; it was missing from the working copy. Corrected here,
and the file has been restored and extended (§6).

Secondary point, downgraded to hygiene: `.gitignore` opened with `.env`, `.env.local`
and `.env*.local` *and* ended with a catch-all `.env*`. A catch-all would drop the
template from version control the moment it was removed from the index and re-added.
It is **not** a live bug while the file stays tracked, because `.gitignore` does not
apply to tracked files.

**A4. `/validation` publishes learner transcripts without authentication.**
Evidence: `src/app/validation/page.tsx` calls `readMergedInteractions()`
unconditionally and renders the summary; the page has no token check **[code]**.
The CSV *download* buttons are behind `?token=`, but the page itself and the
underlying data are not.
PS2 impact: the docs promise "learner identifiers are anonymous, but the words a
person says are not" and that `/api/export` is token-protected because rows contain
full transcripts (`docs/architecture.md` § *Data and privacy*). The page contradicts
that promise. If a judge opens `/validation` on the live URL and the transcript
table renders, you have a privacy claim you cannot back. **In the current state the
page only shows aggregate counts, not raw transcripts** — but it does expose
interaction counts, session counts, language distribution and weekly active
learners publicly, and it is one edit away from leaking the text.
Fix: gate the page body behind the same `ADMIN_TOKEN`, or reduce it to the
aggregate counters and move the detail behind `/api/export`.

**A5. `hf-router` is documented as a working ASR transport and cannot work.**
Evidence: `src/lib/natlas/asr.ts` implements `callHfRouter()` against
`https://router.huggingface.co/hf-inference/models/NCAIR1/…`, and
`docs/n-atlas-integration.md` § 2.2 lists it as transport option 2 **[code]**.
Verified against the Hub: both `NCAIR1/N-ATLaS` and `NCAIR1/Hausa-ASR` are
**gated** *and* display **"This model isn't deployed by any Inference Provider."**
**[src]** There is therefore no serverless route for these weights.
PS2 impact: an evaluator who reads `docs/n-atlas-integration.md` and tries the
documented `NATLAS_ASR_PROVIDER=hf-router` path gets a failure, on a document whose
entire purpose is proving the integration works. That is the worst possible place
for an inaccuracy.
Fix: either delete the `hf-router` branch and the doc bullet, or relabel it
explicitly as "requires you to first deploy these repos to your own Inference
Endpoint — not available serverless."

### B. Correctness / compliance — fix before submitting

**B6. Per-model attribution is missing.**
Evidence: the Hub model cards require *different* attribution strings per model.
`NATLAS_TEAM_ATTRIBUTION`/`NATLAS_ATTRIBUTION` in `src/lib/natlas/attribution.ts`
carries only the LLM wording **[code]**. The ASR cards state their own required
string, e.g. Hausa-ASR: *"Hausa-ASR is powered by Awarri Technologies in an
initiative of the Federal Ministry of Communications, Innovation and Digital
Economy"* **[src]**.
PS2 impact: the licence for the ASR checkpoints is conditioned on attribution.
You ship three ASR checkpoints. Add their lines to the footer and to
`docs/n-atlas-integration.md`.

**B7. `date_string` is formatted differently from the official template.**
Evidence: `src/lib/natlas/llm.ts` sends `chat_template_kwargs: { date_string:
todayStamp() }` where `todayStamp()` returns `toISOString().slice(0,10)` →
`2026-10-03` **[code]**. The model card's own usage calls
`apply_chat_template(..., date_string=current_date)` with
`datetime.now().strftime('%d %b %Y')` → `03 Oct 2026` **[src]**.
PS2 impact: the date is injected verbatim into the rendered Llama-3 system prompt
("Today Date: …"). A malformed date is a small but self-inflicted prompt defect,
and it is trivially fixable.

**B8. `callHfInferenceEndpoint` does not pass `date_string` at all.**
Evidence: `src/lib/natlas/llm.ts` — the openai-compatible branch sends
`chat_template_kwargs`, the HF branch does not **[code]**. That is defensible for
TGI (which ignores unknown kwargs) but means the two transports produce *different
prompts*. For a submission whose selling point is evidence discipline, that is an
unforced inconsistency. Document it or drop the HF branch.

**B9. The README claims a live deployment that `checklist.md` says does not exist.**
Evidence: `README.md` opens with
`**Live deployment:** https://n-atlas-voice-tutor-deltaos-core.vercel.app`;
`docs/submission/checklist.md` row 1 says `Build ready, **not deployed**`
**[code]**.
PS2 impact: if the URL is dead, a judge clicking it from the README concludes the
artefact does not exist. Verify the URL, and if it is not live, remove the claim
until it is.

**B10. No bootstrapping: a fresh clone cannot start without hand-written env.**
Related to A3. `getConfig()` throws a multi-line error naming the exact invalid
fields, which is good, but there is no documented default that lets `npm run dev`
come up far enough to see the error in the UI.

### C. Polish — safe to leave, cheap to fix
| Item | Detail | Fix cost |
| --- | --- | --- |
| C11 | `LanguageDefinition.iso6393` holds ISO **639-1** codes (`'ha'`, `'ig'`, `'yo'`), not 639-3 (`hau`, `igb`, `yor`). Works only because `asr-service/app.py::MODEL_BY_LANGUAGE` is keyed on the same 2-letter values **[code]**. | Rename the field to `asrLanguageKey`, or genuinely use 639-3 and update the service. |
| C12 | `pendingTranscript` in `src/components/VoiceTutor.tsx` is only ever set to `''`, so the "Transcribing" state in `TranscriptPanel` is unreachable dead UI **[code]**. | Either populate it from an intermediate event or delete the branch. |
| C13 | Dead/unused exports: `markAuthenticated` (`src/lib/session.ts`), `readInteractionFiles` (`src/lib/store/interactions.ts`), `refusalEnglishFor` and `languageName` (`src/lib/tutor/safety.ts`), `PostgresDriver.rows` and `PostgresDriver.sql()` (`src/lib/store/interactions.ts`). **[code]** | Delete. |
| C14 | `'christianity'` appears twice in `SENSITIVE_TERMS` (`src/lib/tutor/safety.ts`) **[code]**. | Delete one. |
| C15 | `REFUSALS_EN` (`src/lib/tutor/safety.ts`) is not English — the `igbo` and `yoruba` entries are copies of the Igbo/Yorùbá refusals **[code]**. The Hausa entry is the only English one. It is unused, which hides the bug. | Delete it, or actually write the English lines. |
| C16 | `PostgresDriver` opens and closes a new connection per write and per read **[code]**. Fine at validation scale (50–500 rows); would be pathological at 1000 users. | Note it as a known scale limit; it is already covered by the sustainability criterion. |
| C17 | `TranscriptPanel` sets `lang={languageName}` → `lang="Hausa"` instead of a BCP-47 tag like `ha-NG` **[code]**. Screen readers ignore an invalid `lang`. | Use `LANGUAGES[code].bcp47`. |
| C18 | `next.config.mjs` uses `experimental.serverComponentsExternalPackages`, which Next 14.2 warns is moving to top-level `serverExternalPackages` **[code]**. Build is clean today. | Optional; migrate before a Next major upgrade. |
| C19 | `asr-service/app.py` and `asr-service/requirements.txt` are not covered by `npm run lint` or `tsc` **[ran]** — **there is no Python linter or test in the repo at all**. The ASR service is the only component with zero automated verification. | Add `ruff` + a smoke test for `resolve_language`, `assert_official` and `split_wav`. |
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
huggingface-cli login          # a token with read access
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
huggingface-cli download NCAIR1/N-ATLaS config.json --local-dir /tmp/natlas-check
```

If that fails, nothing downstream will work. Do not proceed past this line.

### 5.4 Option 1 (recommended) — everything on Modal

Two Modal apps in one file, so there is one deploy command.

`deploy/modal_natlas.py`:

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
modal secret create huggingface-token HF_TOKEN=hf_xxxxxxxx
```

Deploy, then read the two URLs off the output:

```bash
modal deploy deploy/modal_natlas.py
# https://<workspace>--natlas-llm-serve-llm.modal.run
# https://<workspace>--natlas-asr-serve-asr.modal.run
```

Point the app at them:

```bash
# LLM — the base must include /v1; the client appends /chat/completions
NATLAS_LLM_PROVIDER=openai-compatible
NATLAS_LLM_BASE_URL=https://<workspace>--natlas-llm-serve-llm.modal.run/v1
NATLAS_LLM_MODEL=NCAIR1/N-ATLaS
NATLAS_LLM_API_KEY=

# ASR
NATLAS_ASR_PROVIDER=service
NATLAS_ASR_BASE_URL=https://<workspace>--natlas-asr-serve-asr.modal.run
NATLAS_ASR_API_KEY=
```

Verify before you open a browser:

```bash
curl -s https://<workspace>--natlas-llm-serve-llm.modal.run/v1/models | jq
curl -s https://<workspace>--natlas-asr-serve-asr.modal.run/health | jq '.models, .loaded'

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
huggingface-cli download tosinamuda/N-ATLaS-GGUF N-ATLaS-GGUF-Q4_K_M.gguf --local-dir models/
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

Assumes ~6 hours of active inference between now and 12 Oct, and the endpoint
otherwise idle.

| | Modal (A10G, scale-to-zero) | HF Inference Endpoint (L4, always on) |
| --- | --- | --- |
| Rate | $0.000306/s ≈ $1.10/hr | $0.80/hr, billed continuously |
| 6 h of use | ≈ **$6.60** | $0.80 × every hour it exists |
| 7 days deployed but idle | ≈ **$0** (scales to zero) | ≈ **$134** |
| 30 days deployed but idle | ≈ **$0** | ≈ **$576** |
| Free tier | $30/month; up to $10k academic | none |
| Cold start | 2–3 min after scale-down | none |

Not close. Modal's per-hour rate is comparable and it charges nothing when idle,
which is exactly the shape of your usage.
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
  https://<workspace>--natlas-asr-serve-asr.modal.run/transcribe | jq
```

Expect `model: "NCAIR1/Hausa-ASR"`. Anything else means the deployment is
non-compliant — do not proceed.

---

### 5.9 Critical path from here

Ordered strictly; each step unblocks the next. Nine days.

1. **Today.** Accept the five HF licences. Create the Modal account and the
   `huggingface-token` secret. (§5.3)
2. **Today.** Deploy both Modal apps. Get `/api/health` to `ok: true`. (§5.4)
3. **Today.** Set `LOG_DRIVER=postgres`; apply `scripts/schema.sql`. (G7)
4. **Day 1.** Deploy the Next.js app. Re-check `/api/health` on the public URL.
5. **Day 1–2.** Close A4, A5, B6, B7, B9 — all small edits. (A3, the missing
   `.env.example`, was fixed during this audit.)
6. **Day 2.** Record the demo video with endpoints warm.
7. **Day 2–8.** Recruit 15–20 learners and collect the 50+ interactions. Runs in
   parallel with everything else and is the only item that cannot be compressed.
8. **Day 8.** Fill the team profile; get the HOD letter signed.
9. **Day 9.** `npm run export:csv`, `npm run validation:report`,
   `python scripts/evaluate-asr.py`. Confirm `export:csv` prints no
   `COMPLIANCE FAILURE`. Submit.

The single highest-risk item is step 7. Everything else is about a day of work.

---

## 6. `.env.example`

`README.md` § 3 and `docs/deployment.md` § 3 both instruct
`cp .env.example .env.local`. The file is tracked in git with complete content; it
was absent from the working tree at the start of this audit, so the documented step
would have failed (defect A3, corrected).

`.env.example` has been restored and extended with the Modal values from §5.4 and
the traps from §5.8 written into the comments: the `/v1` requirement on the LLM
base URL, the five gated repos that must be accepted before any download works, the
fact that `hf-router` cannot work, and the warning that Vercel's ephemeral
filesystem makes `LOG_DRIVER=jsonl` unsafe there.

`.gitignore` was also tightened: it carried a catch-all `.env*` alongside the three
explicit patterns. That catch-all would drop the template from version control if it
were ever removed from the index and re-added. It is replaced by `.env`,
`.env.local`, `.env.*.local` plus a `!.env.example` negation.

---

## 7. One-paragraph summary

The engineering is done and it is good; the integration is real, enforced and
documented better than most entries will manage. Lint, types and build all pass.
What is missing is not code: the app is not deployed and there are zero of the 50
required user interactions, and the second of those is the only item on the list
that cannot be finished in a day. Three smaller defects matter — the public
`/validation` page, the `hf-router` transport that cannot work because the models
are gated and unserved, and the disagreement between the README and the submission
checklist about whether anything is live. For compute, use Modal for both the LLM
and the ASR service; it is roughly the same hourly rate as Hugging Face Inference
Endpoints and it costs nothing while idle, which is the whole shape of your usage.
The Hugging Face models are gated and are not served by any Inference Provider, so
accept all five licences first, and remember that the served model name must be
`NCAIR1/N-ATLaS` and the LLM base URL must end in `/v1`.
