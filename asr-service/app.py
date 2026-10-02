"""
N-ATLaS ASR service
===================

A small FastAPI wrapper around the **official N-ATLaS speech recognition
checkpoints** published by the National Centre for Artificial Intelligence and
Robotics (NCAIR) and powered by Awarri Technologies:

    * NCAIR1/Hausa-ASR   (Whisper-small architecture, fine-tuned by NCAIR, ha)
    * NCAIR1/Igbo-ASR    (Whisper-small architecture, fine-tuned by NCAIR, ig)
    * NCAIR1/Yoruba-ASR  (Whisper-small architecture, fine-tuned by NCAIR, yo)
    * NCAIR1/NigerianAccentedEnglish (optional, for learners who code-switch)

Why this service exists
-----------------------
`NCAIR1/N-ATLaS` is a **gated** Hugging Face repository and none of the N-ATLaS
checkpoints are currently deployed by a Hugging Face Inference Provider, so there
is no hosted, key-free inference endpoint for them. Serving them from a small GPU
box is therefore the supported path — and it is also the path that makes the NAIC
integration check unambiguous: the exact official weights answer the request.

Endpoints
---------
    GET  /health                 -> which NCAIR1 checkpoints are loaded
    POST /transcribe             -> multipart: file=<audio>, language=ha|ig|yo|en-NG
    POST /transcribe/batch       -> several clips at once (used for accuracy evaluation)

Only official NCAIR1 checkpoints are ever loaded. There is no fallback to
`openai/whisper-*`, Deepgram, AssemblyAI, Google STT or any other recogniser: the
module refuses to start if a model id outside the `NCAIR1/` organisation is
requested.

Audio expectations
------------------
The N-ATLaS ASR checkpoints take 16 kHz mono audio and at most 30 seconds per
inference. Browser recordings arrive as WebM/Opus or MP4/AAC, so every request is
decoded with ffmpeg and resampled to 16 kHz mono. Utterances longer than 30
seconds are split on the quietest boundary available and transcribed chunk by
chunk; the chunk boundaries are returned so the accuracy report can be audited.
"""

from __future__ import annotations

import io
import os
import subprocess
import tempfile
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Official N-ATLaS checkpoints. Nothing outside NCAIR1/ may be loaded.
# ---------------------------------------------------------------------------

NATLAS_ORG = "NCAIR1"

MODEL_BY_LANGUAGE: Dict[str, str] = {
    "ha": "NCAIR1/Hausa-ASR",
    "ig": "NCAIR1/Igbo-ASR",
    "yo": "NCAIR1/Yoruba-ASR",
    "en-ng": "NCAIR1/NigerianAccentedEnglish",
}

# Aliases accepted from the client.
LANGUAGE_ALIASES: Dict[str, str] = {
    "hausa": "ha",
    "ha-NG": "ha",
    "igbo": "ig",
    "ig-NG": "ig",
    "yoruba": "yo",
    "yo-NG": "yo",
    "english": "en-ng",
    "naija": "en-ng",
}

SAMPLE_RATE = 16_000
CHUNK_SECONDS = 25  # under the checkpoints' hard 30 s window, leaving headroom
API_KEY = os.environ.get("NATLAS_ASR_API_KEY")

# ---------------------------------------------------------------------------
# Lazy model loading
# ---------------------------------------------------------------------------


@dataclass
class LoadedModel:
    repo_id: str
    pipeline: object
    loaded_at: str


_MODELS: Dict[str, LoadedModel] = {}


def resolve_language(value: str) -> str:
    key = (value or "").strip().lower()
    key = LANGUAGE_ALIASES.get(key, key)
    if key not in MODEL_BY_LANGUAGE:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language '{value}'. Expected one of: {', '.join(MODEL_BY_LANGUAGE)}",
        )
    return key


def assert_official(repo_id: str) -> None:
    if not repo_id.startswith(f"{NATLAS_ORG}/"):
        raise RuntimeError(
            f"Refusing to load '{repo_id}'. N-ATLaS compliance requires an official "
            f"{NATLAS_ORG}/ checkpoint; wrapping another model disqualifies a NAIC submission."
        )


def load_model(language_key: str) -> LoadedModel:
    if language_key in _MODELS:
        return _MODELS[language_key]

    repo_id = MODEL_BY_LANGUAGE[language_key]
    assert_official(repo_id)

    import torch
    from transformers import pipeline

    device = 0 if torch.cuda.is_available() else -1
    dtype = torch.float16 if torch.cuda.is_available() else torch.float32

    # Whisper checkpoints ship their own processor/tokenizer with the repo, so the
    # pipeline is loaded straight from the NCAIR1 repo id. `chunk_length_s` keeps
    # every inference inside the checkpoints' 30 s window.
    asr = pipeline(
        "automatic-speech-recognition",
        model=repo_id,
        torch_dtype=dtype,
        device=device,
        chunk_length_s=CHUNK_SECONDS,
    )

    from datetime import datetime, timezone

    loaded = LoadedModel(repo_id=repo_id, pipeline=asr, loaded_at=datetime.now(timezone.utc).isoformat())
    _MODELS[language_key] = loaded
    return loaded


def warm_up(languages: Iterable[str]) -> None:
    for key in languages:
        load_model(key)


# ---------------------------------------------------------------------------
# Audio decoding
# ---------------------------------------------------------------------------


def decode_to_mono_16k(data: bytes, filename: str) -> bytes:
    """Decode any browser container to 16 kHz mono 16-bit WAV via ffmpeg."""
    with tempfile.TemporaryDirectory() as tmp:
        source = os.path.join(tmp, f"in-{os.path.basename(filename) or 'clip.webm'}")
        target = os.path.join(tmp, "out.wav")
        with open(source, "wb") as handle:
            handle.write(data)

        command = [
            "ffmpeg",
            "-nostdin",
            "-loglevel",
            "error",
            "-y",
            "-i",
            source,
            "-ac",
            "1",
            "-ar",
            str(SAMPLE_RATE),
            "-f",
            "wav",
            target,
        ]
        try:
            subprocess.run(command, check=True, capture_output=True)
        except FileNotFoundError as exc:  # pragma: no cover - operator error
            raise HTTPException(
                status_code=500,
                detail="ffmpeg is not installed on the ASR host. Install it and restart the service.",
            ) from exc
        except subprocess.CalledProcessError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Could not decode audio: {exc.stderr.decode('utf-8', 'ignore')[:300]}",
            ) from exc

        with open(target, "rb") as handle:
            return handle.read()


def wav_duration_seconds(wav_bytes: bytes) -> float:
    import wave

    with wave.open(io.BytesIO(wav_bytes), "rb") as handle:
        frames = handle.getnframes()
        rate = handle.getframerate() or SAMPLE_RATE
    return round(frames / float(rate), 3)


def split_wav(wav_bytes: bytes, chunk_seconds: int = CHUNK_SECONDS) -> List[bytes]:
    """
    Split on the quietest sample boundary inside each window.

    The N-ATLaS ASR checkpoints accept at most 30 s per inference. Cutting mid-word
    damages word error rate badly, so each cut is placed at the lowest-amplitude
    50 ms around the target boundary.
    """
    import numpy as np
    import wave

    with wave.open(io.BytesIO(wav_bytes), "rb") as handle:
        params = handle.getparams()
        frames = handle.readframes(params.nframes)

    samples = np.frombuffer(frames, dtype=np.int16)
    if samples.size <= chunk_seconds * params.framerate:
        return [wav_bytes]

    window = int(0.05 * params.framerate)
    step = chunk_seconds * params.framerate
    chunks: List[bytes] = []
    start = 0

    while start < samples.size:
        end = min(start + step, samples.size)
        if end < samples.size:
            search_start = end - window
            search_end = min(end + window, samples.size)
            region = samples[search_start:search_end].astype(np.float32)
            cut = int(search_start + np.argmin(np.abs(region)))
        else:
            cut = end

        piece = samples[start:cut]
        if piece.size:
            buffer = io.BytesIO()
            with wave.open(buffer, "wb") as out:
                out.setnchannels(params.nchannels)
                out.setsampwidth(params.sampwidth)
                out.setframerate(params.framerate)
                out.writeframes(piece.tobytes())
            chunks.append(buffer.getvalue())
        start = cut

    return chunks


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

app = FastAPI(
    title="N-ATLaS ASR service",
    description=(
        "Speech recognition for Hausa, Igbo, Yorùbá and Nigerian-accented English "
        "using the official NCAIR1 checkpoints."
    ),
    version="1.0.0",
)


class HealthResponse(BaseModel):
    ok: bool
    device: str
    models: List[str]
    loaded: List[str]
    attribution: str


class TranscribeResponse(BaseModel):
    text: str
    model: str
    language: str
    duration_seconds: float
    chunks: int
    chunk_offsets: List[float]
    latency_ms: int


class BatchItem(BaseModel):
    text: str
    model: str
    language: str
    duration_seconds: float


class BatchResponse(BaseModel):
    results: List[BatchItem]


def _require_auth(authorization: Optional[str]) -> None:
    if not API_KEY:
        return
    if authorization != f"Bearer {API_KEY}":
        raise HTTPException(status_code=401, detail="Invalid ASR service token.")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    try:
        import torch

        device = "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:
        device = "cpu"

    loaded = [loaded.repo_id for loaded in _MODELS.values()]
    official = sorted(set(MODEL_BY_LANGUAGE.values()))

    return HealthResponse(
        ok=True,
        device=device,
        models=official,
        loaded=loaded,
        attribution=(
            "N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and "
            "Digital Economy, and powered by Awarri Technologies."
        ),
    )


@app.post("/transcribe", response_model=TranscribeResponse)
def transcribe(
    file: UploadFile = File(...),
    language: str = Form("ha"),
    authorization: Optional[str] = Header(default=None),
) -> TranscribeResponse:
    import time

    _require_auth(authorization)
    started = time.perf_counter()

    key = resolve_language(language)
    data = file.file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded audio was empty.")

    wav = decode_to_mono_16k(data, file.filename or "clip.webm")
    duration = wav_duration_seconds(wav)
    chunks = split_wav(wav)

    model = load_model(key)
    pieces: List[str] = []
    offsets: List[float] = []
    elapsed = 0.0

    for chunk in chunks:
        result = model.pipeline(chunk, return_timestamps=False)
        piece = (result.get("text") or "").strip() if isinstance(result, dict) else ""
        if piece:
            pieces.append(piece)
        offsets.append(round(elapsed, 2))
        elapsed += len(chunk) / 2 / SAMPLE_RATE

    text = " ".join(pieces).strip()
    latency_ms = int((time.perf_counter() - started) * 1000)

    return TranscribeResponse(
        text=text,
        model=model.repo_id,
        language=key,
        duration_seconds=duration,
        chunks=len(chunks),
        chunk_offsets=offsets,
        latency_ms=latency_ms,
    )


@app.post("/transcribe/batch", response_model=BatchResponse)
def transcribe_batch(
    files: List[UploadFile] = File(...),
    language: str = Form("ha"),
    authorization: Optional[str] = Header(default=None),
) -> BatchResponse:
    """Transcribe several clips; used by scripts/evaluate-asr.py for accuracy runs."""
    key = resolve_language(language)
    model = load_model(key)
    results: List[BatchItem] = []

    for upload in files:
        data = upload.file.read()
        if not data:
            continue
        wav = decode_to_mono_16k(data, upload.filename or "clip.webm")
        result = model.pipeline(wav, return_timestamps=False)
        text = (result.get("text") or "").strip() if isinstance(result, dict) else ""
        results.append(
            BatchItem(
                text=text,
                model=model.repo_id,
                language=key,
                duration_seconds=wav_duration_seconds(wav),
            )
        )

    return BatchResponse(results=results)


@app.on_event("startup")
def preload() -> None:
    """
    Warm the checkpoints named in PRELOAD_LANGUAGES so the first learner does not
    pay the cold-start cost on a metered connection.
    """
    preload_list = [item.strip() for item in os.environ.get("PRELOAD_LANGUAGES", "ha,ig,yo").split(",") if item.strip()]
    for item in preload_list:
        try:
            warm_up([resolve_language(item)])
        except Exception as exc:  # pragma: no cover - startup diagnostics
            print(f"[n-atlas-asr] could not preload {item}: {exc}")
