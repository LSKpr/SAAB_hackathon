# Idea 14 — Operational Re-Roling ("Flex") Planner

**Short description.** A first-class UI affordance that makes
**re-roling a platform or a fire unit on the fly** a one-click action,
with the system immediately cascading the consequences: replacement
mission, backfill coverage, munition changes, new gap windows, and
timeline impact. Drag a Gripen pair from "CAP" to "SEAD"; the system
replies with the full replanned state in under a second.

---

## Direct tie to the PDF

The kickoff names the target capability explicitly:
> *"revolutionerar luftförsvarets förmåga att uppnå taktisk
> överlägsenhet med effektiv resursallokering och **hög operativ
> flexibilitet**."*
> — "…with effective resource allocation and **high operational
> flexibility**."

"Operativ flexibilitet" is one of the two headline qualities the jury
will evaluate. The most powerful way to demonstrate flexibility is to
give the operator a visible, one-click flex control and show the
system absorbing the change.

---

## The problem

Real air-defense assets have wide flex envelopes that are badly
exploited today because the *coordination cost* of re-tasking is too
high:

- A Gripen pair on CAP can peel off and do SEAD, A2A escort, ISR, or
  maritime strike — with a different loadout, tanker plan, coordination
  call, and duty-cycle consequence.
- An IRIS-T SLM battery in area-defense mode can be re-pointed to
  point-defense of a specific asset at the cost of wider coverage.
- A GlobalEye can drop area-wide surveillance to focused radar
  mapping of a tight sector.
- An EW platform can swap from jam to deception to passive ESM.

Today, re-roling decisions involve a commander, three radio calls, a
whiteboard, and a 5–15 minute delay. The C2 system should make the
decision a slider and a click, with the commander approving the
resulting *plan* rather than orchestrating it.

---

## The idea in detail

### A. Platform flex graph

For each asset, a small machine-readable spec of its possible roles
and the transitions between them:

```
gripen_pair:
  roles: [cap, qra_alert5, a2a_escort, sead, strike, recce, training]
  transitions:
    cap -> sead: { time_s: 60, cost: "loadout unchanged", caveat: "needs SEAD pod onboard" }
    cap -> strike: { time_s: 600, cost: "land-rearm-relaunch", caveat: "blows the tanker plan" }
    ...
```

For ground-based fire units, the same idea: area defense ↔ point
defense, active ↔ EMCON, sensor master ↔ sensor slave.

### B. The Flex action

Every asset card has a **"Flex"** button. Clicking it:

1. Shows allowed roles in a menu, each annotated with `time_s` and
   `cost`.
2. On selection, the planner runs:
   - The current mission's dependents (who was relying on this asset
     being in role X?).
   - A backfill suggestion (who can absorb the gap?).
   - The affected timelines (tanker, crew, inventory).
   - The updated capability forecast (hands off to Idea 12).
3. Presents the delta:
   - "Gap in CAP sector 2 from 14:30 to 14:47 (17 min)."
   - "Meteor expenditure rate projected −1.2/hour."
   - "Backfill: Alert-5 pair at Såtenäs, ready 14:28."
4. Operator approves → all downstream tasks are issued automatically.

### C. "What if" as a precursor

Before clicking Flex, the operator can hover the role options; the
planner shows the same delta as a ghost overlay without committing.
This turns flex into a *thinking tool*, not a commitment tool.

### D. Safety and ROE interlocks

Re-roling to certain roles triggers ROE checks (Idea 10). A Gripen
going from CAP to SEAD near a political boundary may need a higher
authority level; the system surfaces this before the operator
attempts the flex.

---

## Why it's strong for this hackathon

- **Headline jury feature.** The PDF names "operativ flexibilitet" as
  one of the two product-defining goals. A feature called **Flex** is
  impossible for the jury to miss.
- **Connects everything you already built.** The planner is the
  integration layer — it touches TEWA, scramble optimizer (Idea 11),
  continuity forecaster (Idea 12), and ROE (Idea 10). One demo
  moment showcases four features.
- **Most visually satisfying single click in air-defense C2.**
  Dragging a Gripen from CAP to SEAD and watching the whole plan
  rebuild in under a second is the kind of moment that ends up in
  the demo GIF.
- **Directly addresses "high-impact suboptimalities."** The jury
  demo framework asks about suboptimalities in coordination;
  coordination cost *is* the suboptimality in today's workflow, and
  flex-as-a-button is the antidote.

---

## Hard parts and risks

- **Correctness of the flex graph.** Getting roles and transitions
  right matters. For the demo, hand-curate a small graph that
  covers Gripen, one SAM battery, one AEW, and one EW platform.
- **Downstream cascade must actually work.** If the operator clicks
  Flex and the system says "ok" without truly re-solving TEWA and
  the forecast, the illusion breaks instantly. Wire the cascade
  fully end-to-end even if that's 70 % of the build effort for
  this idea.
- **Information density on the delta card.** Show at most five
  consequences; collapse the rest behind a "show all impacts" link.
- **Real operational transitions take minutes.** Don't promise
  instant re-roling; show the `time_s` honestly, and animate the
  transition so the operator sees *when* the new state takes effect.

---

## Combos

- **+ Idea 11 (Multi-base scramble, this folder).** Flex on a ground
  pair; scramble fills the gap from another base; forecaster updates.
  Three ideas, one continuous demo.
- **+ Idea 12 (Capability continuity, this folder).** Every flex is
  evaluated by its effect on the capability ribbon.
- **+ Idea 10 (ROE authoring studio).** Flex transitions can trigger
  rule checks; the studio is where those rules live.
- **+ Idea 13 (Speculative copilot, this folder).** Flex changes may
  invalidate many pre-staged cards; the copilot re-warms them.

---

## References

- [../../threats-and-effectors.md §2.2 E6/E7 Fighter](../../threats-and-effectors.md) — Gripen multi-role.
- [../../command-and-control.md §2 core C2 functions — coordination](../../command-and-control.md)
- [../../command-and-control.md §6.1 standard views](../../command-and-control.md)
- Saab — [Gripen E Power of the Arsenal](https://www.saab.com/markets/india/gripen-for-india/technology/the-power-of-gripen-es-arsenal)
- AFCEA — decision-making articles on "dynamic re-tasking."
