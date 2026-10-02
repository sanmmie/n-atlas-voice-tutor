# Real-world validation

NAIC 2026 Problem Statement 02 (Voice-First Access) requires **at least 50
documented real user interactions** with actual learners. Simulated or
self-generated interactions do not count and would disqualify the submission.

## Status

| Item | Status |
| --- | --- |
| Interactions collected | **0 / 50 required** |
| Learners recruited | 0 (target 15-20) |
| Sessions per learner | — (target 3-5) |
| CSV export | `npm run export:csv` |
| Summary report | `npm run validation:report` |

Everything in this folder except `asr-samples/` is produced by those two commands
from real logged sessions. Nothing here is hand-written to look complete.

## How to collect the evidence

1. Deploy the app (see `docs/deployment.md`) or run it locally on a laptop the
   learners can reach.
2. Recruit 15-20 learners. Do **not** restrict this to computer-science students:
   NAIC explicitly expects testing with the actual target users, and the tutor is
   meant for people who do not primarily type. Language-department students,
   traders, teachers and community members are all in scope. Record for each
   participant: age band, first language, device, and whether they were a regular
   user of the language being taught.
3. Each learner completes 3-5 sessions of 3-8 turns. That yields 50+ interactions
   across all three languages.
4. Ask each learner for a 1-5 rating on a few turns (the in-app rating buttons
   write to the log), and collect 3-5 short testimonials for the submission.
5. Export:

   ```bash
   npm run export:csv          # -> validation/interactions-<date>.csv
   npm run validation:report   # -> validation/REPORT.md
   ```

6. Commit the CSV and the report. The CSV carries the N-ATLaS checkpoint id for
   every single turn, which is what proves the interactions were produced by
   N-ATLaS rather than by a wrapped general model.

## Anonymity

Learner identifiers are random strings generated in the browser
(`guest-xxxxxxxxxx`). No names, phone numbers, emails or IP addresses are stored.
Transcripts are stored in full because they are the evidence; if a participant
asks for a specific utterance to be removed, remove it and note the removal in
`REPORT.md`.

## Files

| File | Produced by |
| --- | --- |
| `interactions-<date>.csv` | `npm run export:csv` |
| `REPORT.md` | `npm run validation:report` |
| `asr-accuracy.md` | `python scripts/evaluate-asr.py` |
| `testimonials.md` | written by you, from real learners, with consent |
| `asr-samples/` | recorded by you, see its README |
