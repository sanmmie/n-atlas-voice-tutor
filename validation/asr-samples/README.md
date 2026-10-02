# ASR accuracy samples

Record short clips — 3 to 10 seconds each, one sentence — with **native speakers**
across the six geopolitical zones, then transcribe them by hand to build the
reference. One `references.jsonl` per language:

```json
{"audio": "hausa-001.wav", "reference": "Ina son in tafi gida yanzu."}
{"audio": "hausa-002.wav", "reference": "Sannu, yaya ake?"}
```

Requirements for the NAIC evidence:

- **At least 10 clips per language**, 30 clips total, recorded by at least
  **three different speakers** per language — this is what makes the accuracy
  numbers meaningful rather than anecdotal.
- 16 kHz mono WAV. Record on the phone you would realistically use; device
  diversity is part of the finding.
- Include at least a few noisy-market clips and a few children's voices, because
  the N-ATLaS licence documents reduced accuracy in noise and on children's
  speech. Reporting those honestly strengthens the submission.
- Do **not** include a clip whose speaker has not consented to publication in an
  open-source repository.

Then, with the ASR service running:

```bash
python scripts/evaluate-asr.py --service http://127.0.0.1:8000
```

Results (per-language WER/CER, latency, and the N-ATLaS checkpoint that answered)
are written to `validation/asr-accuracy.md`.

## Expected shape of the result

The N-ATLaS model card reports human evaluation of the LLM, not ASR word error
rates. Based on the published ASR training-data volumes — 120 h for Hausa and Igbo
versus 627 h for Yorùbá, on the same Whisper-small architecture — expect Hausa and
Igbo to be usable and Yorùbá to be noticeably weaker. Record what you measure
rather than what you expect; `docs/limitations.md` should quote your own numbers.
