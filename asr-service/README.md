# N-ATLaS ASR service

FastAPI wrapper around the **official N-ATLaS speech recognition checkpoints**:

| Language | Checkpoint | ASR language key |
| --- | --- | --- |
| Hausa | `NCAIR1/Hausa-ASR` | `ha` |
| Igbo | `NCAIR1/Igbo-ASR` | `ig` |
| Yorùbá | `NCAIR1/Yoruba-ASR` | `yo` |
| Nigerian-accented English (optional) | `NCAIR1/NigerianAccentedEnglish` | `en-NG` |

These are the checkpoints described in the N-ATLaS release: Whisper-small
architecture (244M parameters) fine-tuned by NCAIR / Awarri Technologies. The
service loads them directly from the Hugging Face repos — there is no alternative
recogniser, no vendor SDK, and `assert_official()` refuses to load any model id
outside the `NCAIR1/` organisation.

## Why self-hosted

- `NCAIR1/N-ATLaS` is a **gated** repo: you must accept the licence conditions in
  your browser before `huggingface_hub` can download weights.
- None of the N-ATLaS checkpoints are currently deployed by a Hugging Face
  Inference Provider, so there is no key-free serverless route to them.
- **Vercel cannot host it.** A Vercel project rooted at this directory installs
  `requirements.txt` to 5157 MB and fails the 500 MB function limit. Torch is the
  bulk of it, and the CPU-only wheel alone still unpacks past the cap — before the
  gated checkpoints (about a gigabyte each) have to be fetched on a cold lambda
  that also has no `ffmpeg`.

## Requirements

- **GPU with at least 6 GB VRAM** recommended (each checkpoint is 244M parameters;
  fp16 is ~0.5 GB, so CPU also works but is roughly 10-20x slower).
- `ffmpeg` on the host, to decode browser WebM/Opus and MP4/AAC to 16 kHz mono.
- A Hugging Face token with access to the gated N-ATLaS repos.

## Run it

```bash
pip install --extra-index-url https://download.pytorch.org/whl/cu124 -r requirements.txt

export HF_TOKEN=hf_...                       # gated-repo access
export NATLAS_ASR_API_KEY=$(openssl rand -hex 16)
export PRELOAD_LANGUAGES=ha,ig,yo            # avoid a cold start for the first learner

uvicorn app:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 75
```

Or with Docker:

```bash
docker build -f asr-service/Dockerfile -t natlas-asr .
docker run --gpus all -p 8000:8000 -e HF_TOKEN=hf_... -e NATLAS_ASR_API_KEY=... natlas-asr
```

## Checks

With the service dependencies installed, install the development tools and run
the correctness lint and smoke tests:

```bash
pip install -r requirements-dev.txt
ruff check app.py tests
python -m pytest tests
```

Ruff is configured in `ruff.toml`, deliberately not in `pyproject.toml`. Vercel
switches a build to `uv` as soon as it finds a `pyproject.toml` anywhere in the
repository, and `uv lock` then fails the whole deployment unless that file carries
a PEP 621 `[project]` table. This service is self-hosted, so tooling config must
stay in `ruff.toml` and `asr-service/pyproject.toml` must not be reintroduced.

## API

### `GET /health`

```json
{
  "ok": true,
  "device": "cuda",
  "models": ["NCAIR1/Hausa-ASR", "NCAIR1/Igbo-ASR", "NCAIR1/Yoruba-ASR", "NCAIR1/NigerianAccentedEnglish"],
  "loaded": ["NCAIR1/Hausa-ASR"],
  "attribution": "N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies."
}
```

The Next.js `/api/health` route consumes this and only reports healthy when at
least three `NCAIR1/` checkpoints are loaded.

### `POST /transcribe`

`multipart/form-data` with `file` (any browser container) and `language`
(`hausa` | `igbo` | `yoruba` | `english`, or a service key: `ha`, `ig`, `yo`, `en-ng`).

```json
{
  "text": "Sannu, yaya ake?",
  "model": "NCAIR1/Hausa-ASR",
  "language": "ha",
  "duration_seconds": 2.4,
  "chunks": 1,
  "chunk_offsets": [0.0],
  "latency_ms": 612
}
```

Utterances longer than the checkpoints' 30-second window are split at the
lowest-amplitude 50 ms near each cut, so words are not sliced in half. `chunks`
and `chunk_offsets` report where that happened.

### `POST /transcribe/batch`

> Several clips in one request, as an alternative to looping `/transcribe`.
> `scripts/evaluate-asr.py` does **not** use it — it posts each clip to
> `/transcribe` separately, so it can report progress per clip.

Same fields, several files at once. Used by `scripts/evaluate-asr.py`.

## Licensing reminder

N-ATLaS is released under an Open-Source Research and Innovation License with a
**1000 active end-user cap**. This project is a research/education prototype and
stays inside that cap. Public use must carry the attribution:
"N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation
and Digital Economy, and powered by Awarri Technologies."
