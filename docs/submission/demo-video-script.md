# Demo video script (3-5 minutes)

NAIC requires a 3-5 minute video showing the solution operating **end to end**.
Screen recording plus voiceover is acceptable; a talking head is not required. The
judges are looking for one thing above all — **that N-ATLaS is really doing the
work**. So keep `/api/health` and the EvidenceStrip on screen as long as possible.

Record at 1920x1080 or 1080x1920. Use a quiet room. Keep the network tab closed
except for the health shot below — it makes the proof trivial.

| # | Time | Shot | Voiceover / what to show |
| --- | --- | --- | --- |
| 1 | 0:00-0:30 | Open the mobile-first web app in a phone browser; show language selection. Click Yorùbá, then Hausa, then Igbo. | "This is a low-bandwidth mobile web application, not a native app or messaging bot. Nigerians who do not type can choose a language, press one button, and speak. Audio is compressed before upload; an internet connection is still required." Show the theme change per language. |
| 2 | 0:30-0:55 | Terminal: `curl -s .../api/health \| jq` | "Before anything else, here is the integration. The language model is `NCAIR1/N-ATLaS`. The loaded speech checkpoints are `NCAIR1/Hausa-ASR`, `NCAIR1/Igbo-ASR`, `NCAIR1/Yoruba-ASR`. These are the official NCAIR checkpoints — there is no wrapped general-purpose model anywhere in this stack." |
| 3 | 0:55-1:10 | Terminal: `curl -s -F 'audio=@hausa-clip.webm' -F 'language=hausa' .../api/asr \| jq` | "One call to the official ASR endpoint, on a real Hausa recording. Note the `model` field in the response." |
| 4 | 1:10-2:30 | **Full Hausa conversation, live.** 4-6 turns of real speech. Keep the EvidenceStrip in frame. | Let the audio run. Narrate sparingly: "The tutor answered in Hausa, corrected my word order, and asked one question back. The panel on top shows the ASR checkpoint and the LLM checkpoint with their latencies for every single turn." |
| 5 | 2:30-3:10 | Igbo, 2-3 turns | "Same pipeline for Igbo, with `NCAIR1/Igbo-ASR`." |
| 6 | 3:10-3:50 | Yorùbá, 2-3 turns — **keep the mistakes** | "Yorùbá is honestly weaker. N-ATLaS scores Yorùbá 2.69 out of 5 in its own evaluation. You can see the transcript degrading here — which is why the transcript stays on screen. We report this rather than hide it." |
| 7 | 3:50-4:20 | `/validation` page, then the CSV export | "Real users, real sessions. [N] documented interactions from [N] learners, and every row records which N-ATLaS checkpoint handled it." |
| 8 | 4:20-4:45 | Repository: `docs/n-atlas-integration.md` and the ASR accuracy table | "The integration evidence, the accuracy numbers, and the rejected alternatives are documented in the repository." |
| 9 | 4:45-5:00 | Attribution card | "N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies." |

## Recording checklist

- [ ] `/api/health` reports `ok: true` **before** recording — a degraded run will
      show up in the video and cost credibility.
- [ ] Both endpoints warmed **minutes** before recording — `python -m modal run
      scripts/modal_llm.py` and `scripts/modal_asr.py`. Both scale to zero after 30
      idle minutes, and the cold start is minutes long, not seconds: an unwarmed
      first turn will blow past the 60 s route limit and fail on camera.
- [ ] Microphone permission already granted, no permission prompt in shot 4.
- [ ] Yorùbá mistakes kept in (shot 6). A flawless Yorùbá demo invites the
      question "was that a scripted turn?".
- [ ] Show a real transcript panel with real learner text, not a placeholder.
- [ ] Repository and live URL on screen at least once, legibly.
- [ ] Identify the delivery channel accurately as mobile web; do not imply offline,
      native-app, WhatsApp, USSD, or IVR support.
- [ ] Attribution card is the last thing on screen.
