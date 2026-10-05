# What our AI servers cost, and what we changed

For team members and the supervisor. No code or cloud jargon needed.

## The short version

Our two AI servers now cost **nothing when nobody is using them**, and about
**$0.80 an hour each** when someone is. One hour of use costs roughly **$1.60**.
No use at all costs **$0**.

We also found a setting that was keeping both servers running 24 hours a day,
every day. That would have cost about **$38 a day, $1,152 a month** — roughly 38
times the free credit our platform gives us. We found it and turned it off on
4 October 2026.

## What it costs in practice

| Scenario | What it means | Cost |
| --- | --- | --- |
| Nobody uses the app | Both servers switch themselves off after 30 idle minutes | **$0** |
| Normal week: 1 hour of use a day, 5 days | 5 hours of use ($8), or about $12 counting the 30 minutes of shutdown lag after each session | **about $8–12 for the week** |
| Rehearsal or demo day: servers deliberately kept on all day, by turning the always-on setting back on for that day only | One day, chosen on purpose, so nobody waits for a start-up on camera | **about $38** |
| *Not our plan:* servers left on 24/7 | What the old setting did | **about $1,152 a month** |

## What "switch themselves off" means for you

The first time someone uses the app after a break of 30 minutes or more, the
servers need a few minutes to start up before they can answer. Nothing is broken
— they are waking up. So **tell whoever is running the demo a few minutes before
you want to record it or run a practice session**, and they will start the
servers for you in advance. *(TODO: agree who on the team handles this.)*

## Money facts worth knowing

- The free plan gives us **$30 of computing credit every month**, and there is
  **up to $10,000** available for academic work.
- The free plan covers **3 user accounts**. A team of 4 or 5 is fine as long as
  only 2 or 3 people ever need deployment access; if more do, the next plan up is
  $250/month, which we do not want.
- **Nothing is billed while a server is switched off.** The 30 minutes of
  "shutdown lag" *is* billed — that is why a one-hour session costs slightly more
  than one hour.
- Prices checked on modal.com/pricing on 5 October 2026.

## What we have not sorted out yet

- **The exact figure.** $0.80 an hour is the graphics card alone. Processor and
  memory time are counted separately and add a smaller amount, so treat $0.80 as
  a starting estimate and check the first real invoice.
- **A hard spending cap.** Nobody has confirmed whether our plan allows a monthly
  spending limit. If it does, we should set one, so that a mistake cannot run up a
  large bill. *(TODO: check and set before 12 October.)*
- **The academic credit.** We have not applied. It needs a supervisor's
  agreement, and applying before the deadline is worth doing.
  *(TODO: confirm eligibility with AAUA.)*

## If a supervisor or funder asks

> The AI models run on rented graphics cards that switch themselves off when
> nobody is using them. We pay about $0.80 an hour per card, and only while it is
> in use, on a plan that includes $30 of free credit every month. A one-hour
> demonstration costs about $1.60. We found and removed a setting that was keeping
> the cards running around the clock, which would have cost about $1,152 a month.
> Nothing is charged while the system is idle.

---

Prices and the reasoning: `docs/naic-compliance-lint.md` §5.7. Technical
instructions for warming the servers: `docs/deployment.md` §5.