# NAIC 2026 submission checklist — Problem Statement 02, Track A

Deadline: **12 October 2026, 23:59 WAT**. Track A = Academia & Research.

| # | Component | Status | Where it lives | Blocked on |
| --- | --- | --- | --- | --- |
| 1 | Working artefact (deployed app + public repo) | Deployed and healthy: **`/api/health` returned HTTP 200 `ok: true` on 2026-10-04** with `NCAIR1/N-ATLaS` served by the Modal LLM endpoint and all four `NCAIR1/` ASR checkpoints loaded (Hausa, Igbo, Yoruba, Nigerian-accented English) | [Live application](https://n-atlas-voice-tutor-deltaos-core.vercel.app), this repository | — |
| 2 | N-ATLaS integration evidence | **Done** | [`docs/n-atlas-integration.md`](../n-atlas-integration.md) | — |
| 3 | Real-world validation, 50+ interactions | **Tooling done and verified against the live deployment, data outstanding: 0 completed interactions.** 5 turns are logged and all 5 failed at ASR | `validation/`, `validation/interactions-2026-10-04.csv` | real learners, and the ASR token fix below |
| 4 | Technical documentation | **Done** | `README.md`, [`architecture.md`](../architecture.md), [`deployment.md`](../deployment.md), [`limitations.md`](../limitations.md) | — |
| 5 | Video demonstration, 3-5 min | Script written, **not recorded** | [`demo-video-script.md`](demo-video-script.md) | the ASR token fix, so a turn actually completes |
| 6 | Team profile | **Filled** from `attribution.ts` (3 members, Track A requirement check) — contribution breakdown and signature outstanding | [`team-profile.md`](team-profile.md) | the team, for who-wrote-what and the signature |
| 7 | Track A endorsement letter | Template written, **not signed** | [`endorsement-letter-template.md`](endorsement-letter-template.md) | Head of Department |

## Order of work

The inference gate is passed, so the remaining work is evidence-gathering, not
plumbing. `/api/health` was verified at HTTP 200 `ok: true` on 2026-10-04; keep the
endpoints warm (`python -m modal run scripts/modal_llm.py` and `scripts/modal_asr.py`;
both scale to zero after 30 idle minutes) and re-check before you
record anything.

1. ~~**Accept the N-ATLaS licence conditions**~~ — done; `HF_TOKEN` is in the `natlas-hf`
   Modal secret.
2. ~~**Stand up the LLM endpoint**~~ — done; `scripts/modal_llm.py`, served at
   `natlas-llm-server.modal.direct`.
3. ~~**Stand up the ASR service**~~ — done; `scripts/modal_asr.py`, served at
   `natlas-asr-server.modal.direct`.
4. ~~**Restore inference health**~~ — done; `GET /api/health` returns `ok: true` with
   four loaded `NCAIR1/` checkpoints. `ADMIN_TOKEN` is set, so `/api/export` and the
   `/validation` page are reachable.
5. **Record the demo video** while the deployment is warm.
6. **Recruit learners and collect 50+ interactions.** This is the long pole —
   start recruiting the moment step 4 is stable, not after the video is done.
7. **Export the evidence**: `npm run export:csv`, `npm run validation:report`,
   `python scripts/evaluate-asr.py`.
8. **Fill the team profile**, obtain the signed endorsement letter, submit.

## Live defect: the ASR bearer token does not match

The app's `NATLAS_ASR_API_KEY` and the `natlas-hf` Modal secret's
`NATLAS_ASR_API_KEY` are different values. The `/health` endpoint was readable
without a token, so `/api/health` reported `ok: true` while every `POST /transcribe`
returned 401 and every voice turn failed — which is what all 5 logged interactions
are. This makes component 1 not fully working despite the green probe, and it
blocks component 5.

Fix, in this order:

1. Set one new value in both places (`modal secret create natlas-hf`, and the
   Vercel project variable).
2. Redeploy the ASR app (`python -m modal deploy scripts/modal_asr.py`) so it reads
   the new secret **and** serves the `auth` field added to `/health`.
3. Verify with an authenticated `POST /transcribe`. Only after step 2 does
   `/api/health` detect this class of fault on its own.

## Compliance traps

- **Do not ship placeholder validation data.** Simulated interactions disqualify
  the submission. `validation/REPORT.md` says so explicitly; leave it honest.
- **Do not add a second problem statement.** One submission, one problem statement.
- **Every team member must be a Nigerian citizen or registered entity.**
- **Supporting materials must be in English.** The tutor speaks Nigerian languages;
  the documentation must not.
- **Check the N-ATLaS attribution appears in any public-facing material** that
  shows N-ATLaS output.
- **Do not exceed 1000 active end-users** without a separate commercial licence.
- **Do not quote an NAIC requirement the rules do not contain.** The Track A
  requirements quoted in `team-profile.md` and
  `endorsement-letter-template.md` are NAIC's own wording; the wet-signature,
  letterhead and PDF-scan requirements are this team's own submission-format
  choices and are labelled as such.
