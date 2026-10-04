import io
import wave

import pytest
from fastapi import HTTPException

import app as asr_app
from app import _auth_verdict, assert_official, resolve_language, split_wav


def make_wav(frame_count: int, sample_rate: int = 1_000) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(sample_rate)
        audio.writeframes(bytes(frame_count * 2))
    return buffer.getvalue()


def wav_frame_count(data: bytes) -> int:
    with wave.open(io.BytesIO(data), "rb") as audio:
        return audio.getnframes()


def test_resolve_language_maps_supported_aliases() -> None:
    assert resolve_language("hausa") == "ha"
    assert resolve_language("ig") == "ig"
    assert resolve_language("yo-NG") == "yo"


def test_resolve_language_rejects_unsupported_language() -> None:
    with pytest.raises(HTTPException) as error:
        resolve_language("swahili")

    assert error.value.status_code == 400


def test_assert_official_accepts_natlas_checkpoint() -> None:
    assert_official("NCAIR1/Hausa-ASR")


def test_assert_official_rejects_other_organizations() -> None:
    with pytest.raises(RuntimeError, match="NCAIR1/"):
        assert_official("openai/whisper-small")


def test_split_wav_preserves_short_audio() -> None:
    audio = make_wav(500)

    assert split_wav(audio, chunk_seconds=1) == [audio]


def test_split_wav_chunks_long_audio_without_losing_frames() -> None:
    frame_count = 2_500
    chunks = split_wav(make_wav(frame_count), chunk_seconds=1)

    assert len(chunks) == 3
    assert sum(wav_frame_count(chunk) for chunk in chunks) == frame_count
    assert all(wav_frame_count(chunk) <= 1_050 for chunk in chunks)

def test_auth_verdict_reports_unset_when_service_has_no_key(monkeypatch) -> None:
    monkeypatch.setattr(asr_app, "API_KEY", "")

    assert _auth_verdict(None) == "unset"


def test_auth_verdict_accepts_the_configured_token(monkeypatch) -> None:
    monkeypatch.setattr(asr_app, "API_KEY", "s3cret")

    assert _auth_verdict("Bearer s3cret") == "ok"


def test_auth_verdict_rejects_a_different_token(monkeypatch) -> None:
    monkeypatch.setattr(asr_app, "API_KEY", "s3cret")

    assert _auth_verdict("Bearer stale") == "mismatch"
    assert _auth_verdict(None) == "mismatch"


def test_health_reports_a_token_mismatch_instead_of_ok(monkeypatch) -> None:
    monkeypatch.setattr(asr_app, "API_KEY", "s3cret")

    healthy = asr_app.health(authorization="Bearer s3cret")
    assert healthy.ok is True
    assert healthy.auth == "ok"

    drifted = asr_app.health(authorization="Bearer stale")
    assert drifted.auth == "mismatch"
    assert drifted.ok is False


def test_require_auth_raises_on_mismatch(monkeypatch) -> None:
    monkeypatch.setattr(asr_app, "API_KEY", "s3cret")

    with pytest.raises(HTTPException) as error:
        asr_app._require_auth("Bearer stale")

    assert error.value.status_code == 401
