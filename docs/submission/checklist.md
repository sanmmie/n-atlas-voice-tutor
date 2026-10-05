# NAIC 2026 submission checklist — Problem Statement 02, Track A

Deadline: **12 October 2026, 23:59 WAT**. Track A = Academia & Research.

| # | Component | Status | Where it lives | Blocked on |
| --- | --- | --- | --- | --- |
| 1 | Working artefact (deployed app + public repo) | **Operational.** Verified 2026-10-05 after rotating the ASR token and redeploying: `/api/health` returns **HTTP 200 `ok: true`, `status: operational`** with `llm.ok: true` (`NCAIR1/N-ATLaS` served by vLLM, `official: true`) and `asr.ok: true` (all four `NCAIR1/` checkpoints listed, three preloaded, `device: cuda`). An authenticated `POST /transcribe` returned **200** with a Hausa transcript, so the voice path is proven end to end and not merely probed. Note for the record: the **HTTP 200 `ok: true` reported on 2026-10-04 was a false green**, taken before the auth-aware health gate existed while every `/transcribe` was returning 401 | [Live application](https://n-atlas-voice-tutor-deltaos-core.vercel.app), this repository | — |
| 2 | N-ATLaS integration evidence | **Done** | [`docs/n-atlas-integration.md`](../n-atlas-integration.md) | — |
| 3 | Real-world validation, 50+ interactions | **Tooling done and verified against the live deployment, data outstanding: 0 completed interactions.** 5 turns are logged and all 5 failed at ASR | `validation/`, `validation/interactions-2026-10-04.csv` | **real learners only** — the ASR token fix is done and verified |
| 4 | Technical documentation | **Done** | `README.md`, [`architecture.md`](../architecture.md), [`deployment.md`](../deployment.md), [`limitations.md`](../limitations.md) | — |
| 5 | Video demonstration, 3-5 min | Script written, **not recorded** | [`demo-video-script.md`](demo-video-script.md) | a warm deployment and someone free to record |
| 6 | Team profile | **Filled** from `attribution.ts` (3 members, Track A requirement check) — contribution breakdown and signature outstanding | [`team-profile.md`](team-profile.md) | the team, for who-wrote-what and the signature |
| 7 | Track A endorsement letter | Template written, **not signed** | [`endorsement-letter-template.md`](endorsement-letter-template.md) | Head of Department |

## Order of work

Both Modal apps were redeployed on 2026-10-05, so the endpoints now scale to zero
after 30 idle minutes and idle time costs nothing. The consequence is that the first
request after an idle stretch pays a multi-minute cold start, which the 60 s route
cannot wait for: warm them minutes ahead with `python -m modal run scripts/modal_llm.py`
and `scripts/modal_asr.py` before recording anything.

`/api/health` returned **HTTP 200 `ok: true`** on 2026-10-05, after the ASR token was
rotated in both places and the app redeployed. A voice turn now completes, so nothing
technical stands between you and the 50 interactions — see the resolved-defect section
below for the evidence.

1. ~~**Accept the N-ATLaS licence conditions**~~ — done; `HF_TOKEN` is in the `natlas-hf`
   Modal secret.
2. ~~**Stand up the LLM endpoint**~~ — done; `scripts/modal_llm.py`, served at
   `natlas-llm-server.modal.direct`.
3. ~~**Stand up the ASR service**~~ — done; `scripts/modal_asr.py`, served at
   `natlas-asr-server.modal.direct`.
4. ~~**Restore inference health**~~ — done. Token rotated in the Modal secret and in
   Vercel, both apps redeployed, and `/api/health` returns 200 `ok: true` with an
   authenticated `POST /transcribe` returning 200. `logDriver` is `postgres`, so logged
   interactions are being persisted.
5. **Record the demo video** while the deployment is warm.
6. **Recruit learners and collect 50+ interactions.** This is the long pole —
   start recruiting the moment step 4 is stable, not after the video is done.
7. **Export the evidence**: `npm run export:csv`, `npm run validation:report`,
   `python scripts/evaluate-asr.py`.
8. **Fill the team profile**, obtain the signed endorsement letter, submit.

**Cost.** Idle is $0 and one demo hour is ≈ $1.60; the setting that would have
left two GPU endpoints running 24/7 at ≈ $38/day is off **and deployed**, so it is
now actually in effect rather than only committed. The plain-language version for the team and
the supervisor, including two open finance TODOs (confirm a monthly spend cap,
confirm the academic credit), is [`cost-note.md`](cost-note.md).

## Resolved defect: the ASR bearer token did not match

> **Fixed 2026-10-05, verified three ways.** The `auth` verdict on `/health` now
> reports `ok` with the app's own token, `/api/health` is 200 `operational`, and an
> authenticated `POST /transcribe` returns 200 with a Hausa transcript. Do not
> re-derive this by hand from 401s in a log — the health gate now catches it.

**What was wrong.** The app's `NATLAS_ASR_API_KEY` and the `natlas-hf` Modal secret's
`NATLAS_ASR_API_KEY` were different values. `/health` was readable without a token, so
`/api/health` reported `ok: true` while every `POST /transcribe` returned 401 and
every voice turn failed. All 5 logged interactions are those failures, and they stay
in `validation/` as a record — the cause is fixed, the rows are not evidence of a
working session either way.

**What was done, in order.**

1. Generated one new random token and wrote it to both sides: the `natlas-hf` Modal
   secret (with `HF_TOKEN` and `NATLAS_LLM_API_KEY` preserved) and the Vercel
   production variable, both as Vercel *Secret* type.
2. Redeployed both Modal apps, so the ASR read the new secret and both services came
   back with scale-to-zero enabled.
3. Redeployed Vercel, because a Vercel environment change does not reach a running
   deployment until it is redeployed.
4. Verified: `auth: ok` on `/health`, HTTP 200 `operational` on `/api/health`, and a
   200 from `POST /transcribe`.

**Two things this exposed that are worth keeping.** The ASR app was redeployed with
the same secret, which re-proved that `HF_TOKEN` still grants access to the gated
`NCAIR1/` repos — otherwise the models would have failed to load. And the LLM cold
start measured **2.5 minutes** from zero to serving, which is why warming ahead is
not optional: the route allows 60 s.

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
