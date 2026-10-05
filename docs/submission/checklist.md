# NAIC 2026 submission checklist — Problem Statement 02, Track A

Deadline: **12 October 2026, 23:59 WAT**. Track A = Academia & Research.

| # | Component | Status | Where it lives | Blocked on |
| --- | --- | --- | --- | --- |
| 1 | Working artefact (deployed app + public repo) | **Deployed; LLM verified, ASR blocked on a token, not on missing models.** Re-verified 2026-10-05 after redeploying both Modal apps: `/api/health` returns **HTTP 503 `degraded`** — `llm.ok: true` with `NCAIR1/N-ATLaS` served by vLLM, `asr.ok: false` because the service rejects `NATLAS_ASR_API_KEY`. All four `NCAIR1/` ASR models are listed and three are preloaded. The earlier **HTTP 200 `ok: true` on 2026-10-04 was a false green**: it predates the auth-aware health gate, which is the only reason the drift is now visible | [Live application](https://n-atlas-voice-tutor-deltaos-core.vercel.app), this repository | — |
| 2 | N-ATLaS integration evidence | **Done** | [`docs/n-atlas-integration.md`](../n-atlas-integration.md) | — |
| 3 | Real-world validation, 50+ interactions | **Tooling done and verified against the live deployment, data outstanding: 0 completed interactions.** 5 turns are logged and all 5 failed at ASR | `validation/`, `validation/interactions-2026-10-04.csv` | real learners, and the ASR token fix below |
| 4 | Technical documentation | **Done** | `README.md`, [`architecture.md`](../architecture.md), [`deployment.md`](../deployment.md), [`limitations.md`](../limitations.md) | — |
| 5 | Video demonstration, 3-5 min | Script written, **not recorded** | [`demo-video-script.md`](demo-video-script.md) | the ASR token fix, so a turn actually completes |
| 6 | Team profile | **Filled** from `attribution.ts` (3 members, Track A requirement check) — contribution breakdown and signature outstanding | [`team-profile.md`](team-profile.md) | the team, for who-wrote-what and the signature |
| 7 | Track A endorsement letter | Template written, **not signed** | [`endorsement-letter-template.md`](endorsement-letter-template.md) | Head of Department |

## Order of work

Both Modal apps were redeployed on 2026-10-05, so the endpoints now scale to zero
after 30 idle minutes and idle time costs nothing. The consequence is that the first
request after an idle stretch pays a multi-minute cold start, which the 60 s route
cannot wait for: warm them minutes ahead with `python -m modal run scripts/modal_llm.py`
and `scripts/modal_asr.py` before recording anything.

`/api/health` is currently **503 `degraded`**: the LLM check passes and the ASR check
fails on token drift. Fix that before recruiting learners, because every voice turn
fails until it is fixed — see the defect section below.

1. ~~**Accept the N-ATLaS licence conditions**~~ — done; `HF_TOKEN` is in the `natlas-hf`
   Modal secret.
2. ~~**Stand up the LLM endpoint**~~ — done; `scripts/modal_llm.py`, served at
   `natlas-llm-server.modal.direct`.
3. ~~**Stand up the ASR service**~~ — done; `scripts/modal_asr.py`, served at
   `natlas-asr-server.modal.direct`.
4. **Restore inference health** — half done. The LLM side is verified working
   (`llm.ok: true`, `NCAIR1/N-ATLaS` via vLLM, `official: true`) and the ASR service
   loads correctly, but `asr.ok: false` on token drift, so `/api/health` is 503. The
   token fix below is the whole of what remains. `logDriver` is `postgres`, so logged
   interactions are being persisted.
5. **Record the demo video** while the deployment is warm.
6. **Recruit learners and collect 50+ interactions.** This is the long pole —
   start recruiting the moment step 4 is stable, not after the video is done.
7. **Export the evidence**: `npm run export:csv`, `npm run validation:report`,
   `python scripts/evaluate-asr.py`.
8. **Fill the team profile**, obtain the signed endorsement letter, submit.

**Cost.** Idle is $0 and one demo hour is ≈ $1.60; the setting that would have
left two GPU endpoints running 24/7 at ≈ $38/day is off, and the endpoints must
be redeployed for that to take effect. The plain-language version for the team and
the supervisor, including two open finance TODOs (confirm a monthly spend cap,
confirm the academic credit), is [`cost-note.md`](cost-note.md).

## Live defect: the ASR bearer token does not match

> **Now machine-detected, not inferred.** Since the 2026-10-05 redeploy, the ASR
> service reports an `auth` verdict on `/health` (`ok`, `unset`, or `mismatch`) and
> `/api/health` treats `mismatch` as a failure. The production app sends its
> `NATLAS_ASR_API_KEY`, still gets `mismatch`, and says so in plain words. Do not
> re-derive this by hand from 401s in a log.

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
