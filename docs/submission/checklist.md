# NAIC 2026 submission checklist — Problem Statement 02, Track A

Deadline: **12 October 2026, 23:59 WAT**. Track A = Academia & Research.

| # | Component | Status | Where it lives | Blocked on |
| --- | --- | --- | --- | --- |
| 1 | Working artefact (deployed app + public repo) | Build ready, **not deployed** | this repository | HF access, GPU endpoint, Vercel account |
| 2 | N-ATLaS integration evidence | **Done** | [`docs/n-atlas-integration.md`](../n-atlas-integration.md) | — |
| 3 | Real-world validation, 50+ interactions | **Tooling done, data outstanding** | `validation/` | real learners |
| 4 | Technical documentation | **Done** | `README.md`, [`architecture.md`](../architecture.md), [`deployment.md`](../deployment.md), [`limitations.md`](../limitations.md) | — |
| 5 | Video demonstration, 3-5 min | Script written, **not recorded** | [`demo-video-script.md`](demo-video-script.md) | a working deployment |
| 6 | Team profile | Template written, **not filled** | [`team-profile-template.md`](team-profile-template.md) | your names and affiliations |
| 7 | Track A endorsement letter | Template written, **not signed** | [`endorsement-letter-template.md`](endorsement-letter-template.md) | Head of Department |

## Order of work

The dependency chain is strictly linear. Everything after step 2 is blocked by
having a live deployment.

1. **Accept the N-ATLaS licence** at <https://huggingface.co/N-ATLaS> (gated repo)
   and create an HF token.
2. **Stand up the LLM endpoint** (`llama-server`, vLLM, HF Inference Endpoint, or
   Modal) — [`deployment.md` §1](../deployment.md#1-n-atlas-llm-endpoint).
3. **Stand up the ASR service** on a GPU box — [`deployment.md` §2](../deployment.md#2-n-atlas-asr-service).
4. **Deploy the app**, with `ADMIN_TOKEN` set, and confirm
   `GET /api/health` returns `ok: true` with at least three loaded `NCAIR1/` ASR
   checkpoints.
5. **Record the demo video** while the deployment is warm.
6. **Recruit learners and collect 50+ interactions.** This is the long pole —
   start recruiting the moment step 4 is stable, not after the video is done.
7. **Export the evidence**: `npm run export:csv`, `npm run validation:report`,
   `python scripts/evaluate-asr.py`.
8. **Fill the team profile**, obtain the signed endorsement letter, submit.

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
