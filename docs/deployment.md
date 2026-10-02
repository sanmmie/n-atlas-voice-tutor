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
checkpoints before you record the demo video.

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
- **Rotate `ADMIN_TOKEN`** before sharing the deployment URL: it is the only thing
  protecting full transcripts in `/api/export`.
- **Back up the log directory** daily during the validation window. It is the
  evidence the submission depends on, and it lives in one JSONL file.
