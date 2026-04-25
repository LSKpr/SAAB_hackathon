# Idea 12 — Capability Continuity Forecaster

**Short description.** A live "forward-looking readiness" panel that
answers a single question: **if I keep fighting like this, when — and
where — do I run out of defense?** It projects the air-defense
capability envelope 15 / 60 / 240 minutes into the future, accounting
for inventory burn, reload queues, crew duty limits, sensor duty cycle,
and predicted raid continuation, and highlights the earliest moment
capability drops below a chosen threshold per defended asset.

---

## Direct tie to the PDF

The kickoff asks:
> *"Hur säkerställs fortsatt förmåga när resurser förbrukas och nya hot
> dyker upp?"*
> — "How do we ensure continued capability as resources are consumed
> and new threats appear?"

Most C2 prototypes answer the "resource allocation *now*" question and
wave at continuity. This idea's whole purpose is the continuity
question. It's the visual answer to the jury's "think several steps
ahead" prompt that doesn't hide behind algorithmic jargon.

---

## The problem

Air-defense resources deplete in ways that are non-linear and locally
catastrophic:

- Each engagement removes interceptors from a specific magazine at a
  specific base — replacement arrives from a depot on a convoy time
  you have to respect.
- Launchers cool, radars duty-cycle, crews fatigue; they are
  intermittently "down" even when intact.
- Reloads are serial per launcher and take minutes to hours.
- A single Shahed wave can burn a MANPADS platoon's magazine in 3
  minutes; without a visible forecast, the operator discovers this
  only when the next wave arrives.

The operator's mental model of "can I keep doing this?" is the most
important, least supported question on the screen.

---

## The idea in detail

### A. The forecaster

A lightweight simulator (reuses the same engine behind Part I's think-
ahead and Idea 15's doctrine simulator) that:

- Takes current inventory, reload queues, duty-cycle state, and
  expected-threat templates (from Idea 10 in ideas.md: attack-pattern
  allocation, or simpler live raid-template match).
- Runs *k* Monte-Carlo rollouts over the next N minutes using the
  current recommender policy.
- Produces, per defended asset and per time horizon:
  - `P(incoming saturation overwhelms available fires in next 15 min)`
  - `expected interceptors remaining at t+60 min`
  - `time-of-first-capability-gap` per asset (the moment Pk drops
    below a set floor)

### B. Visualization — the capability horizon

The star of the UI is a **ribbon graph**, one row per defended asset,
X-axis time from now to t+240 min. The ribbon is colored:

- Green where capability is above target.
- Amber where it's marginal.
- Red where the forecaster predicts a sustained gap.

Hover any point to see the predicted state (inventory, reloads in
progress, crew fatigue, weather) and the expected threats driving it.

### C. Recommendations tied to the forecast

The forecaster doesn't just display; it emits **continuity
recommendations** that feed back into the TEWA score:

- "Request convoy from depot Oskarshamn now; ETA 47 min avoids the
  15:40 red window."
- "Cross-level 8 IRIS-T missiles from battery B to battery A before
  14:20."
- "Delay maintenance on Launcher L3 by 2 hours to preserve coverage
  of Port Karlskrona."
- "Rotate crew at Battery A before 14:45 to avoid fatigue-driven
  degradation."

Each recommendation carries an expected "gap-seconds averted" metric —
a single number the operator can compare against the operational cost
of the action.

---

## Why it's strong for this hackathon

- **Directly answers jury criterion #2.** "Help users succeed much
  better at something mission-critical" — capability continuity is
  *the* continuity question, and the current state of the art is
  nothing visual, just experienced intuition.
- **Makes "think several steps ahead" concrete.** The ribbon graph is
  the look-ahead. You don't have to *tell* jurors you're thinking
  ahead; they see the red region four hours from now and intuitively
  understand.
- **Composes with everything else.** Every other module in the
  prototype feeds or consumes the forecaster:
  - TEWA feeds expected engagement cost.
  - Attack-pattern learning (Idea 1 in ideas.md) feeds expected threat
    rate.
  - Re-roling planner (Idea 14 here) changes the forecast and lets
    the operator A/B test.
- **"Saab-shaped."** Saab's public material on 9AIR C4I talks about
  "continued operations under degraded conditions"; a continuity
  forecaster is the UI for exactly that doctrine.
- **Decision-grade output.** A named number per asset ("gap-seconds
  averted: 340") is what procurement and commanders respond to. It
  upgrades the demo from "cool tool" to "decision artifact."

---

## Hard parts and risks

- **Compounding uncertainty.** The forecast's variance grows with
  horizon. Show it honestly — the green ribbon should *widen* into
  amber/red bands as you look further out. Jurors reward honesty;
  they penalize confident-looking fiction.
- **Needs a threat-rate prior.** Either a scripted scenario (fine for
  the demo) or a pattern-based prediction (Idea 1 in ideas.md).
  Without one, the forecaster is only projecting depletion from the
  current state — still useful, but less impressive.
- **Too many recommendations.** Cap the panel to 2–3 actionable
  continuity suggestions at a time; rotate as state changes.

---

## Combos

- **+ Idea 1 in ideas.md (Attack-pattern-driven munitions allocation).**
  The pattern engine is the forecaster's best threat-rate source; the
  forecaster is the pattern engine's operator-facing payoff.
- **+ Idea 11 (Multi-base scramble optimizer, this folder).** Scramble
  decisions directly reshape the capability ribbon; the forecaster
  sells the cascade cost in a single picture.
- **+ Idea 14 (Re-roling planner, this folder).** Every "flex" changes
  the forecast visibly.
- **+ Idea 4 in ideas.md (Crew/sensor/magazine readiness dashboard).**
  The readiness dashboard is *now*, the forecaster is *next*. They
  share a data model.

---

## References

- [../../threats-and-effectors.md §4.4 Magazine and reload](../../threats-and-effectors.md)
- [../../threats-and-effectors.md §4.7 Saturation / simultaneous engagements](../../threats-and-effectors.md)
- [../../command-and-control.md §2 functions, §7.3 simulator as first-class module](../../command-and-control.md)
- Saab — [9AIR C2](https://www.saab.com/products/9airborne-c2) (public materials emphasizing continuity of operation)
- Academic — "Markovian models of air defense magazine depletion" (multiple OR journal papers 2015–2024).
