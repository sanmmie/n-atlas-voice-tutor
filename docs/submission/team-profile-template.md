# Team profile — template

> Replace every bracketed field. NAIC requires 2-5 members for Track A
> (Academia & Research), at least one enrolled student or postgraduate researcher,
> a faculty supervisor, and an institutional endorsement letter signed by the Head
> of Department. All team members must be Nigerian citizens or registered Nigerian
> entities. Supporting materials must be in English.

## Team

| # | Name | Affiliation | Role in this project | Track A requirement |
| --- | --- | --- | --- | --- |
| 1 | [Full name] | [Department, University] | [e.g. Team lead — backend, N-ATLaS integration] | Enrolled student / postgraduate researcher |
| 2 | [Full name] | [Department, University] | [e.g. Frontend, cultural theming, accessibility] | |
| 3 | [Full name] | [Department, University] | [e.g. ASR service, GPU deployment] | |
| 4 | [Professor/Dr name] | [Department, University] | Faculty supervisor | **Faculty supervisor** |
| 5 | [Optional] | [Lab / Institute] | [e.g. Validation coordination] | |

## Submission

| Field | Value |
| --- | --- |
| Problem statement | 02 — Voice-First Access |
| Track | Academia & Research |
| Live application | [https://…] |
| Repository | [https://github.com/…] |
| Languages covered | Hausa, Igbo, Yorùbá |
| N-ATLaS models used | `NCAIR1/N-ATLaS`, `NCAIR1/Hausa-ASR`, `NCAIR1/Igbo-ASR`, `NCAIR1/Yoruba-ASR` |

## One-paragraph summary

[Who you are, what you built, in three or four sentences. Written for a panel that
knows N-ATLaS but does not know your project. Mention the real user count and the
languages — do not overstate Yorùbá quality, the panel will have read the model card
and will compare.]

## Contribution breakdown

State honestly who wrote what. Panels reward a clear, verifiable split.

| Member | Files / subsystems owned | Can be asked to explain |
| --- | --- | --- |
| [Name] | `src/lib/natlas/**`, `asr-service/app.py` | Why the ASR service is self-hosted |
| [Name] | `src/components/**`, `src/app/session` | Theme tokens, accessibility decisions |
| [Name] | `scripts/**`, `validation/**` | How the 50 interactions were collected |

## Declaration

- [ ] All team members are Nigerian citizens.
- [ ] This submission is original work and has not been awarded in another competition.
- [ ] This team is submitting to only one problem statement.
- [ ] The artefact is deployed and functioning with genuine N-ATLaS integration.
- [ ] The validation evidence comes from real users, not simulation.

**Team lead:** [Name]  **Date:** [YYYY-MM-DD]  **Signature:** ______________
