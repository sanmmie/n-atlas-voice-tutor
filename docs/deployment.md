# Deployment

Two services: the Next.js app, and the official N-ATLaS ASR service on a GPU. The
N-ATLaS LLM needs a third endpoint, which is the same N-ATLaS weights served by a
llama.cpp / vLLM / TGI / Modal container.

```
Vercel (Next.js)  ──HTTP──▶  GPU box: asr-service (FastAPI, NCAIR1 ASR)
        │
        └───────────────HTTP──▶  GPU box: llama-server / vLLM  (NCAIR1/N-ATLaS)
```

---

## 1. N-ATLaS LLM endpoint

The weights are gated. One-time: sign in at
<https://huggingface.co/NCAIR1/N-ATLaS>, accept the conditions, then create a token
at <https://huggingface.co/settings/tokens>.

### Option A — llama.cpp (cheapest, CPU-viable)

```bash
# Community GGUF conversion of the official weights. Same weights, smaller footprint.
huggingface-cli download tosinamuda/N-ATLaS-GGUF N-ATLaS-GGUF-Q4_K_M.gguf --local-dir models/

./llama-server -m models/N-ATLaS-GGUF-Q4_K_M.gguf \
  --host 0.0.0.0 --port 8080 --ctx-size 8092 --alias NCAIR1/N-ATLaS
```

Q4_K_M is ~4.9 GB and runs on 6-8 GB of RAM. Set `--ctx-size 8092` to match the
model's documented window rather than Llama-3's 131k default, so generation cannot
run past what N-ATLaS was tuned for.

### Option B — vLLM on GPU (best latency)

```bash
huggingface-cli download NCAIR1/N-ATLaS --local-dir models/n-atlas
vllm serve models/n-atlas --served-model-name NCAIR1/N-ATLaS \
  --max-model-len 8092 --dtype bfloat16 --gpu-memory-utilization 0.9
```

Requires roughly 16 GB of VRAM for BF16, or 8 GB with `--quantization fp8`.

### Option C — Hugging Face Inference Endpoint

No GPU to manage. Create an endpoint for `NCAIR1/N-ATLaS` and set:

```
NATLAS_LLM_PROVIDER=hf-inference-endpoint
NATLAS_LLM_BASE_URL=https://<your-endpoint>.endpoints.hf.cloud
NATLAS_LLM_API_KEY=<endpoint token>
```

### Option D — Modal (pays only while in use)

Good for a demo: the GPU shuts down on idle, so a month of sporadic judging costs
almost nothing. Community docs for deploying the official weights on Modal are
linked from the model card's discussion thread.

---

## 2. N-ATLaS ASR service

```bash
docker build -f asr-service/Dockerfile -t natlas-asr
docker run -d --gpus all --name natlas-asr \
  -p 8000:8000 \
  -e HF_TOKEN=hf_... \
  -e NATLAS_ASR_API_KEY=$(openssl rand -hex 16) \
  -e PRELOAD_LANGUAGES=ha,ig,yo \
  --restart unless-stopped natlas-asr
```

Verify it loaded the official checkpoints:

```bash
curl -s http://localhost:8000/health | jq '.models, .loaded'
```

---

## 3. Next.js app

### Local / single box

```bash
cp .env.example .env.local     # fill in
npm install
npm run build && npm start
```

Put nginx or Caddy in front of it for TLS. Browsers require HTTPS for microphone
access on anything other than `localhost`, and mobile browsers will not prompt for
the microphone at all on a plain-HTTP origin other than localhost.

### Vercel

The app is a standard Next.js 14 App Router project and deploys unchanged:

```bash
vercel --prod
```

Set every variable from `.env.example` in the project settings, and use
`LOG_DRIVER=postgres` with a `DATABASE_URL` — Vercel's filesystem is ephemeral and
not shared between instances, so the `jsonl` driver cannot be trusted there.

Apply the schema once:

```bash
psql "$DATABASE_URL" -f scripts/schema.sql
```

On a single VPS, keep `LOG_DRIVER=jsonl` and `LOG_DIR=/var/lib/natlas-logs`; it is
append-only, easy to back up, and `npm run export:csv` reads it directly.

### Four project settings that silently break the deployment

All four were hit while deploying this project. Each one produces a build that
*succeeds* and a site that 404s or refuses connections, which is why they are
written down here rather than discovered at demo time.

| Setting | Symptom when it is wrong |
| --- | --- |
| **Framework preset must be `nextjs`.** With `Other`, `next build` runs and prints every route, but Vercel then serves `./public` instead of the `.next` output. | `NOT_FOUND` on `/` *and* `/api/*`, behind a perfectly green build log |
| **Vercel Authentication (SSO protection) must be off** for a public submission. The project API reports it as `ssoProtection: { deploymentType: "prod_deployment_urls_and_all_previews" }`. | Judges see a Vercel "Login" page instead of the app |
| **The Git link must point at *your* repository.** A project reused from an older Bitbucket-linked project keeps that link, so a push to the old repo redeploys your app and leaves a misleading alias behind. | Deployments you did not trigger; a URL named after the wrong project |
| **Function timeout must exceed your slowest inference.** On Hobby the project reports `functionDefaultTimeout: 10` seconds. `export const maxDuration = 60` in a route is a *request*, not a guarantee — the plan caps it. | Turns cut off mid-reply whenever the N-ATLaS LLM or ASR is cold |

The framework preset is the one that bites hardest when deploying from the CLI,
because the build log gives no hint that anything is wrong:

```bash
echo '{"framework":"nextjs"}' > patch.json
vercel api /v9/projects/<PROJECT_ID> -X PATCH --input patch.json
```

Deployment protection and the Git link are configured in Project Settings →
Deployment Protection / Git, or via `vercel api /v9/projects/<PROJECT_ID>/link`.

### One repository file that fails the build before Vercel starts

`asr-service/pyproject.toml` existed for a single commit, holding nothing but
`[tool.ruff]`. Vercel saw a `pyproject.toml` in the repository, switched the build
to `uv`, and aborted the Next.js deployment — which has no Python of its own:

```
Failed to run "uv lock --python /vercel/path0/asr-service/.vercel/python/.venv/bin/python":
error: No `project` table found in: /vercel/path0/asr-service/pyproject.toml
```

The Ruff configuration now lives in `asr-service/ruff.toml`. Do not add a
`pyproject.toml` for tooling: it changes how Vercel resolves Python dependencies
and takes the whole app down with it.

### Do not host the ASR service on Vercel

A `deltaos-core/asr-service` project (root directory `asr-service`, FastAPI
preset, Git-linked to `main`) was tried for this. It installed its dependencies
and then failed on size:

```
Installing required dependencies from asr-service/requirements.txt...
Error: Total bundle size (5157.66 MB) exceeds the maximum function size (500 MB).
```

`torch==2.5.1` is the reason: the PyPI manylinux wheel is 906 MB and pulls in the
CUDA `nvidia-*` wheels. Switching to the CPU-only index does not rescue it — that
wheel still unpacks past 500 MB before `transformers`, and each gated checkpoint
is about a gigabyte to download on a cold lambda that also lacks `ffmpeg` and has
a 10 s Hobby timeout. Nothing ever deployed from it, and the project has been
deleted rather than left sitting in the account.

The recogniser runs on the GPU box (section 2) or a Modal endpoint, and
`NATLAS_ASR_BASE_URL` points there. Do not recreate the Vercel project: a lambda
cannot hold the weights, and the only thing it would achieve is another 5 GB
failed build per push.

---

## 4. Smoke test the deployed stack

```bash
# Both N-ATLaS services reachable?
curl -s https://<app>/api/health | jq

# The recogniser on your own clip
curl -s -F 'audio=@hausa-001.webm' -F 'language=hausa' \
  https://<app>/api/asr | jq

# The tutor on a typed utterance
curl -s https://<app>/api/tutor -H 'content-type: application/json' \
  -d '{"language":"hausa","transcript":"Yaya ake gaisuwa da yawa?"}' | jq

# The validation export
curl -s -o interactions.csv \
  "https://<app>/api/export?format=csv&token=$ADMIN_TOKEN"
```

`/api/health` must report `NCAIR1/N-ATLaS` and at least three loaded `NCAIR1/` ASR
checkpoints before you record the demo video or invite validation learners. The
public page can load while this endpoint is unhealthy; only `ok: true` confirms
the inference stack is ready.

**`/api/health` is necessary but not sufficient.** It probes the ASR service's
`/health`, which is unauthenticated, so it stays green when `NATLAS_ASR_API_KEY` on
the app does not match the token in the `natlas-hf` Modal secret — and every
`/transcribe` then returns 401. That is the state production was in on 2026-10-04:
green health, five failed voice turns. Always confirm the authenticated path too:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  -H "authorization: Bearer $NATLAS_ASR_API_KEY" \
  -F 'file=@hausa-001.webm' -F 'language=hausa' \
  https://<app>/api/asr
```

A `200` there, not a green `/api/health`, is what means a voice turn will work.

---

## 5. Operational notes

- **Cold starts dominate first-run latency.** Preload the ASR checkpoints
  (`PRELOAD_LANGUAGES`) and keep one LLM instance warm, or the first learner of the
  day waits 30+ seconds.
- **Set `maxDuration`** high enough for a cold LLM (60 s in the route exports). On
  Vercel Hobby this exceeds the platform limit — use a warm endpoint.
- **Do not log audio.** The app sends audio to the ASR service and discards it; the
  service likewise holds no audio on disk. Verify this stays true if you add
  debugging.
- **Set and rotate `ADMIN_TOKEN`** before sharing the validation URL: it protects
  both the `/validation` dashboard and full-transcript exports from `/api/export`.
- **Back up the log directory** daily during the validation window. It is the
  evidence the submission depends on, and it lives in one JSONL file.
