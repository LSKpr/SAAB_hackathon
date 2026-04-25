# Idea 15 — Doctrine & Policy Evaluation Simulator (the Alternative Task, Done Seriously)

**Short description.** Take the PDF's **alternative task** — "build a
simulation engine to evaluate the decision-support system" — and treat
it as its own fully-realized product. An analyst-grade harness that
runs thousands of scenarios against a candidate TEWA/C2 policy,
compares it to baselines, and produces a decision-grade report: "this
policy change buys 27 % fewer leakers at +11 % missile spend, with no
civilian near-misses." Aimed at Saab's Concepts, Doctrine, and
Procurement audiences — a distinct user group from the live operator.

---

## Direct tie to the PDF

The kickoff lists two tracks, main and alternative:
> *"Alternativ uppgift: En alternativ uppgift är att bygga en prototyp
> av simuleringsmotor för att kunna utvärdera ovan nämnda
> beslutsstödssystem."*

Rather than treat the alternative as a demoted path, this idea
**owns** it: build the simulator as a product in its own right, and
if you're also building the main track (Part I of ideas.md + other
ideas), the simulator becomes the thing that *validates* them.

---

## The problem

Every TEWA paper, every C2 product brochure, every procurement case
rests on the same kind of claim: *"Policy A produces better outcomes
than Policy B."* Almost none of those claims can be reproduced by
anyone outside the vendor.

The people who decide which system to buy, how to train operators,
and how to write doctrine — doctrine officers, capability developers,
procurement staff — cannot **run their own experiments**. Today their
workflow is PowerPoint + vendor datasheets + anecdote.

A simulator that lets these users author scenarios, plug in policies,
and get back statistically credible outcomes is a *product-shaped*
thing, not a supporting utility.

---

## The idea in detail

### A. Scenario authoring

A small UI to define a scenario:

- Geography (from Idea 09's 3D twin or a flat map).
- Defended assets and their value functions.
- Friendly order-of-battle: sensors, fire units, aircraft, inventory,
  doctrine constraints.
- **Threat template** — pick from a library (Russian CM pulse, Iranian
  Shahed wave, SEAD sweep, hypersonic salvo, mixed cocktail) or
  author one by parameters.
- Weather, EW, ROE, political constraints.
- Random seed and repeat count.

### B. Policy plug-in

Every policy is an object with a single method:
`recommend(state) -> action`. Bundled:

- **Doctrine-baseline** (greedy nearest-best).
- **Smart TEWA** (Part I of ideas.md).
- **Cost-first** (minimize €/kill).
- **Protect-first** (minimize leakers regardless of cost).
- **User-defined** (Python / JSON / an LLM-translated natural-language
  policy — the ROE DSL from Idea 10 plugs in here).

### C. Batch runs

Run thousands of scenarios per policy in parallel. Metrics captured
per run:

- Leakers (count, value weighted).
- Interceptors spent (count, cost).
- Civilian near-misses, blue-on-blue near-misses.
- Operator authorization load (clicks / minute) if a humanized
  decision model is in the loop.
- Time-to-first-kill, sensor-to-shooter latency distribution.
- Resource-recovery time.

Seeds are logged; every run is reproducible.

### D. Report generator

On completion, produce a structured report:

- **Headline claim** with 95 % CI: "Policy A reduces leakers by 0.7
  per scenario (95 % CI [0.4, 1.0]) at the cost of 1.1 extra
  interceptors (95 % CI [0.8, 1.3])."
- **Pareto front** across objectives.
- **Scenario-level breakdown** — where does Policy A shine, where
  does it fail?
- **Deep-link to any individual run** replayable in the 3D/2D viewer
  for qualitative inspection.
- Export as PDF + Jupyter-style notebook.

### E. The tie to the live system

Here's the magic: the simulator and the live system **share the same
core**. The same TEWA engine, the same threat model, the same sensor
and effector data. A policy proven in simulation can be deployed live
with one click. A live incident can be replayed and A/B-tested by
changing only the policy.

---

## Why it's strong for this hackathon

- **Solves the hackathon's own alternative problem statement** with
  full seriousness. Jurors who specifically expect teams to dodge the
  alternative will remember the team that *owned* it.
- **Addresses a different user.** While everyone else is demoing live
  operator UX, you also hit the **procurement / doctrine** audience
  — which is exactly who at Saab signs off on product investments
  and who the kickoff mentions for the grand-finale dinner with
  "beslutsfattare och rekryterande chefer."
- **Multiplies every other feature's credibility.** "Here's a
  benchmark that says our 3D twin + TEWA + safety guard is 2.3×
  better than doctrine baseline across 1,000 scenarios." That's no
  longer a demo — it's evidence.
- **"Breakthrough solution structure" (jury criterion).**
  Simulator + live system sharing one core is not what most
  prototypes do; this is an architectural differentiator worth a
  slide.
- **Fieldable as an independent product.** The training simulator
  (Idea 12 in ideas.md) is this same artifact, framed for a third
  user group.

---

## Hard parts and risks

- **Computational scale.** Thousands of runs per policy is cheap if
  the simulator is pure-function and vectorized; expensive if every
  run spins up the full backend. Design for pure in-process
  simulation from day one.
- **Statistical honesty.** Report confidence intervals and tail risk,
  not averages. A policy that wins the mean but has catastrophic
  tails is the wrong procurement decision.
- **Threat model validity.** Your conclusions are only as good as
  your threat templates. Use conservative, well-documented priors;
  expose them in the report.
- **Scope risk.** This idea can absorb infinite work. For the hack
  day, target: 3 baseline policies × 5 scenarios × 200 runs each,
  with a report template that works the same at 200 runs and 20,000.

---

## Combos

- **+ All of Part I and the ideas catalog.** Every policy, every
  threat model, every effector catalog, every ROE rule is plugged
  in through the same interfaces.
- **+ Idea 10 (ROE authoring studio).** Rules written in the studio
  are policies testable here.
- **+ Idea 12 in this folder (Capability continuity).** The
  continuity forecaster *is* a single-run simulator; the doctrine
  evaluator is a many-run wrapper over the same engine.
- **+ Idea 16 in ideas.md (Cost-exchange war-gaming tool).** Same
  code, different framing — red-side adversary budget replaces
  fixed threat templates for game-theoretic exploration.
- **+ Idea 09 (3D digital twin, this folder).** Replay of any single
  run in 3D for qualitative review.

---

## References

- [../../command-and-control.md §7.3 simulator as first-class module](../../command-and-control.md)
- [../../command-and-control.md §3.3 static vs dynamic WTA](../../command-and-control.md)
- [../../command-and-control.md §3 TEWA research papers](../../command-and-control.md) — most of the
  listed papers are explicitly simulator-based studies.
- DST Group — [Evaluating the performance of TEWA systems (PDF)](https://www.diva-portal.org/smash/get/diva2:354687/FULLTEXT02.pdf)
- OR / defense simulators in the public domain: AFSIM (US), SWEAT
  (Sweden — historically), NATO NMSG modelling works.
