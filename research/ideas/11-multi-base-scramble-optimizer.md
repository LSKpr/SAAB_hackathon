# Idea 11 — Multi-Base Scramble Optimizer

**Short description.** A decision-support module that answers, literally
and in real time, the kickoff's first question: **"which aircraft from
which bases, and for which threat?"** Given N fighter bases, different
alert states, different munition loadouts, and a live hostile picture,
it optimizes *which pair launches from where, armed with what, to meet
which threat*, and handles the cascade (replacement CAP, tanker, cross-
base re-rolling).

---

## Direct tie to the PDF

The kickoff explicitly asks:
> *"Vilka flygplan ska skickas från vilka baser? Vilken effektor är rätt —
> robot, luftvärn eller drönare?"*

The previous ideas focused on the *effector* question. This idea focuses
on the first half: **aircraft, from bases**. It's the same jury-criterion
question — "unavoidable activities, optimized" — but at the scramble
layer, which is where Sweden's airborne reserve capacity lives.

---

## The problem

Fighter scramble decisions are *politically* simple and *technically*
brutal. For each incoming track, the command has to decide, in seconds:

- Which base launches?
  - Nearest in time-to-intercept?
  - Best munition fit?
  - Best alert state?
  - Minimum impact on other ongoing or planned sorties?
- Which pair at that base?
  - Who's at Alert-5, Alert-15, Alert-60?
  - Who was scrambled 4 hours ago and is crew-duty-constrained?
  - Who has the right mix (Meteor vs. IRIS-T vs. bombs vs. recce pod)?
- What happens when they leave?
  - Who backfills the gap they leave in CAP or QRA?
  - Does any sector go below the readiness floor for the next N
    minutes?
  - Does a tanker orbit need to shift?
  - Does alert state need to rise at a neighboring base?

Today this is done by voice and whiteboard. The C2 system should
present it as a single optimization problem with a visible answer and a
visible explanation.

---

## The idea in detail

### A. The state the optimizer reasons about

For each base *b*:

- Geographic position, runway condition, weather.
- List of aircraft with: current alert state (ready in 5 / 15 / 60 min),
  crew status (duty hours used), last sortie time, fuel state, loadout
  (`4× Meteor + 2× IRIS-T`, `2× JASSM + 2× Meteor`, etc.), maintenance
  status, current mission assignment (CAP, QRA, training, none).
- Tanker availability and tracks.

For each hostile track *t*:

- Classification, position, velocity, predicted intent (feeds Idea 08).
- Required engagement envelope (BVR vs. WVR, altitude, speed class).
- Priority and time-to-impact.

### B. The optimization

For each (track, candidate pair from base) tuple, compute:

- **Feasibility:** time-to-intercept (scramble time + climb + cruise +
  intercept geometry) vs. time-to-impact-on-defended-asset.
- **Armament fit:** does the loadout give Pk for this threat class?
  Reuses Part I's suitability logic.
- **Crew/airframe cost:** hours added to duty limits, time to next
  maintenance.
- **Gap cost:** what other mission is this pair *not* doing anymore?
  Projected readiness gap for the next 60–180 min.
- **Cascade:** does scrambling this pair trigger a backfill from
  another base? Chain the cost.

Then run a **constrained assignment** across all active tracks
simultaneously (not threat-by-threat, greedy): this is a small ILP or a
well-tuned auction. Scale is tractable — we're talking dozens of
candidates, not thousands.

### C. Operator UX

- For each threat: top-3 scramble options, with "why chosen" and "why
  not chosen" — including the specific munition fit and the specific
  gap cost.
- A **base readiness strip** at the bottom of the screen: per base, a
  small bar showing "what's in the air," "what's Alert-5," "what's
  down." Click to expand.
- A **re-plan on accept** animation: when the operator authorizes a
  scramble, the system immediately shows the backfill recommendation
  at the source base ("Alert-15 pair promoted to Alert-5 at Såtenäs"),
  with one-click accept.

---

## Why it's strong for this hackathon

- **Literally the PDF question.** Citing the kickoff sentence on the
  first demo slide is always strong, and this idea answers exactly
  that sentence.
- **High-differentiation.** Most teams will pitch "TEWA for SAMs and
  guns" because that's what public TEWA literature focuses on. An air
  C2 prototype that integrates fighter scramble decisions feels like
  a more complete product.
- **Gripen-native.** Sweden operates around 100 Gripens from dispersed
  bases, many at short notice, often from road bases (see Idea 17).
  This feature is the most Swedish-flavored thing you can build on
  top of the generic TEWA.
- **Cascade visualization is visceral.** "Scrambling this pair means
  backfilling that pair, which means delaying this training sortie."
  Seeing it animate sells "we think several steps ahead" without any
  MCTS buzzword.

---

## Hard parts and risks

- **Crew and maintenance data are messy.** For the demo, script a
  believable base state with 8 aircraft × 2 bases and hand-curate the
  alert/fuel/loadout mix.
- **Tanker modeling.** Real tanker planning is a problem on its own
  (Idea 03 in ideas.md). Keep it simple here: tanker is either
  available or not, with a fixed offload capacity.
- **ILP latency.** Keep the problem size small; fall back to a greedy
  order if the solver doesn't return in 500 ms.
- **Coalition politics.** If we're building toward NATO, cross-border
  scramble has to respect alliance ROE. Out of scope for the hack
  day, but mention in the pitch as future work.

---

## Combos

- **+ Smart TEWA (Part I).** Ground-based and airborne effectors now
  compete in the same assignment. Better solutions emerge.
- **+ Idea 14 (Re-roling planner, this folder).** A scrambled pair can
  be re-roled mid-flight; the two ideas share the cascade engine.
- **+ Idea 12 (Capability continuity, this folder).** "Gap cost" is
  literally what the continuity dashboard visualizes.
- **+ Idea 08 (Trajectory intent inference in ideas.md).** Predicting
  the threat's aim point improves scramble urgency.

---

## References

- [../../threats-and-effectors.md §2.1 E6/E7 Fighter effectors](../../threats-and-effectors.md)
- [../../threats-and-effectors.md §5 Swedish context, Gripen and dispersion](../../threats-and-effectors.md)
- [../../command-and-control.md §2 core C2 functions — "coordination with adjacent units"](../../command-and-control.md)
- Saab — [Gripen E product page](https://www.saab.com/products/gripen-e-series)
- Aviation press on Nordic QRA ("alert-5", "alert-15") practices.
