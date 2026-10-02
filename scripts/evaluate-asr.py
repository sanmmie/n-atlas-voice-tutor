#!/usr/bin/env python3
"""
ASR accuracy harness for the official N-ATLaS checkpoints.

Required by the NAIC build: demonstrate that the speech pipeline actually works in
Hausa, Igbo and Yorùbá, and document the accuracy honestly rather than claiming it.

    # 1. Put clips and references in place (see validation/asr-samples/README.md)
    # 2. With the ASR service running:
    python scripts/evaluate-asr.py --service http://127.0.0.1:8000

Each sample line is JSON:
    {"audio": "hausa-001.wav", "reference": "Ina son in tafi gida yanzu."}

Output: a markdown table per language written to validation/asr-accuracy.md, with
word error rate, character error rate, median latency and the model id that
answered — which doubles as N-ATLaS integration evidence for the submission.
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
import urllib.request
import uuid
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parent.parent
SAMPLES = ROOT / "validation" / "asr-samples"
OUTPUT = ROOT / "validation" / "asr-accuracy.md"

LANGUAGE_KEYS = {"hausa": "ha", "igbo": "ig", "yoruba": "yo"}


def levenshtein(reference: List[str], hypothesis: List[str]) -> int:
    if not reference:
        return len(hypothesis)
    previous = list(range(len(hypothesis) + 1))
    for i, ref_word in enumerate(reference, start=1):
        current = [i]
        for j, hyp_word in enumerate(hypothesis, start=1):
            current.append(
                min(
                    previous[j] + 1,          # deletion
                    current[j - 1] + 1,       # insertion
                    previous[j - 1] + (ref_word != hyp_word),  # substitution
                )
            )
        previous = current
    return previous[-1]


def normalise(text: str) -> str:
    return " ".join(text.lower().split())


def post_clip(service: str, audio: Path, language_key: str, token: str | None) -> dict:
    boundary = f"----natlas{uuid.uuid4().hex}"
    audio_bytes = audio.read_bytes()
    parts = [
        f"--{boundary}\r\n".encode(),
        f'Content-Disposition: form-data; name="file"; filename="{audio.name}"\r\n'.encode(),
        b"Content-Type: audio/wav\r\n\r\n",
        audio_bytes,
        f"\r\n--{boundary}\r\n".encode(),
        b'Content-Disposition: form-data; name="language"\r\n\r\n',
        f"{language_key}\r\n".encode(),
        f"--{boundary}--\r\n".encode(),
    ]
    body = b"".join(parts)

    request = urllib.request.Request(
        f"{service.rstrip('/')}/transcribe",
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            **({"Authorization": f"Bearer {token}"} if token else {}),
        },
        method="POST",
    )

    started = time.perf_counter()
    with urllib.request.urlopen(request, timeout=180) as response:
        payload = json.loads(response.read().decode("utf-8"))
    payload["_latency_ms"] = int((time.perf_counter() - started) * 1000)
    return payload


def evaluate_language(service: str, language: str, token: str | None) -> List[dict]:
    directory = SAMPLES / language
    manifest = directory / "references.jsonl"
    if not manifest.exists():
        return []

    rows: List[dict] = []
    with manifest.open(encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            sample = json.loads(line)
            audio = directory / sample["audio"]
            if not audio.exists():
                print(f"  ! missing audio: {audio}", file=sys.stderr)
                continue

            payload = post_clip(service, audio, LANGUAGE_KEYS[language], token)
            reference = normalise(sample["reference"])
            hypothesis = normalise(payload["text"])

            ref_words = reference.split()
            hyp_words = hypothesis.split()
            word_errors = levenshtein(ref_words, hyp_words)
            char_errors = levenshtein(list(reference), list(hypothesis))

            rows.append(
                {
                    "audio": sample["audio"],
                    "reference": sample["reference"],
                    "hypothesis": payload["text"],
                    "model": payload.get("model", "unknown"),
                    "wer": word_errors / max(1, len(ref_words)),
                    "cer": char_errors / max(1, len(reference)),
                    "seconds": payload.get("duration_seconds", 0),
                    "latency_ms": payload["_latency_ms"],
                }
            )
            print(f"  {sample['audio']}: WER {rows[-1]['wer']:.0%} — {payload['text']}")

    return rows


def render(language: str, rows: List[dict]) -> str:
    if not rows:
        return f"## {language.capitalize()}\n\n_No samples collected yet._\n"

    lines = [
        f"## {language.capitalize()}",
        "",
        f"Samples: {len(rows)} · model: `{rows[0]['model']}`",
        "",
        f"- Mean word error rate: **{statistics.mean(r['wer'] for r in rows):.1%}**",
        f"- Mean character error rate: **{statistics.mean(r['cer'] for r in rows):.1%}**",
        f"- Median latency: **{statistics.median(r['latency_ms'] for r in rows):.0f} ms**",
        "",
        "| Clip | Reference | Hypothesis | WER |",
        "| --- | --- | --- | --- |",
    ]
    for row in rows:
        lines.append(
            f"| {row['audio']} | {row['reference']} | {row['hypothesis']} | {row['wer']:.0%} |"
        )
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--service", default="http://127.0.0.1:8000")
    parser.add_argument("--token", default=None, help="NATLAS_ASR_API_KEY if the service is protected")
    parser.add_argument("--languages", default="hausa,igbo,yoruba")
    args = parser.parse_args()

    try:
        with urllib.request.urlopen(f"{args.service.rstrip('/')}/health", timeout=20) as response:
            health = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        print(f"ASR service unreachable at {args.service}: {exc}", file=sys.stderr)
        return 1

    models: Dict[str, str] = {"loaded": ", ".join(health.get("loaded", [])) or "none yet"}
    print(f"ASR service on {health.get('device')}; loaded: {models['loaded']}")

    sections = ["# N-ATLaS ASR accuracy", ""]
    for language in [item.strip() for item in args.languages.split(",") if item.strip()]:
        print(f"{language}:")
        rows = evaluate_language(args.service, language, args.token)
        sections.append(render(language, rows))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text("\n".join(sections), encoding="utf-8")
    print(f"\nWrote {OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
