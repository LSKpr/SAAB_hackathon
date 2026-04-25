# Idea 01 — Airspace Fratricide Guard

**Short description.** A safety layer that sits between the weapon-assignment
engine and the trigger. Before any engagement is authorized, it checks the
shot against the current friendly-force picture and *refuses* or flags any
engagement that could hit a friendly aircraft, a civilian airliner, our own
artillery trajectory, or the debris footprint of another in-flight engagement.
Think of it as a circuit breaker for blue-on-blue.

---

## The problem

Blue-on-blue in air defense is not a theoretical concern — it's the single
most operationally famous failure mode of modern SAM systems:

- **Patriot / RAF Tornado (Iraq, 2003)** — Patriot battery engaged a friendly
  GR4 returning from a mission; crew killed.
- **Patriot / USN F/A-18C (Iraq, 2003)** — second Patriot-on-friendly
  incident in the same war.
- **Buk / MH17 (Ukraine, 2014)** — civilian airliner shot down in an area
  with active air-defense operations.
- **Tor-M1 / PS752 (Iran, 2020)** — civilian airliner misidentified as a
  cruise missile minutes after takeoff.

Every one of those incidents had the same causal signature: an operator
under time pressure made a classification call with imperfect information
and no independent check. The C2 system is exactly the place that check
should live.

---

## The idea in detail

A **dedicated safety module** sits between `weaponAssignment` and
`engagementController` in the pipeline (see
[../command-and-control.md §8](../command-and-control.md)). Every proposed
engagement is passed through a chain of hard checks:

1. **Friendly-track proximity** — is any blue track within the predicted
   intercept region (3D) or the debris footprint of the warhead?
2. **Civilian-track proximity** — any ADS-B / flight-plan track in the
   region, including tracks that have *just* gone dark (possible
   transponder failure, not automatically hostile).
3. **Own-fires deconfliction** — does our own artillery, MLRS, or friendly
   missile trajectory cross the WEZ in the next N seconds?
4. **Restricted / controlled airspace** — SAR corridors, humanitarian
   corridors, diplomatic flights (flight plans with special status).
5. **Cross-engagement interference** — another missile we already fired is
   predicted to be in the same airspace; fusing a second warhead could
   destroy it or confuse its seeker.
6. **Classification-confidence floor** — if the hostile track's
   classification confidence is below a threshold *and* a friendly or
   civilian track is nearby, block.

Outputs:

- A **go / no-go verdict** per engagement, with the specific rule that
  tripped.
- A **near-miss log** — engagements that passed but only by a small margin,
  surfaced to the operator after the fact for training and doctrine review.
- A **bypass-requires-commander** channel — any rule can be overridden, but
  only at a higher authority level, with the override reason captured in
  the audit log.

The module is deterministic, fast (< 10 ms), and fully explainable: the
operator sees *which* friendly track is within *which* distance. No AI
anywhere near the trigger.

---

## Why it's strong for this hackathon

- **Visceral demo moment.** Mid-engagement, spawn a civilian airliner on a
  path that crosses the intercept. The recommender says "engage"; the
  safety module says "no — civilian track CAT-177 within 4.2 km of
  predicted intercept, classification confidence 0.62." Operator sees
  the block in real time. Jury-guaranteed silence in the room.
- **Directly answers the unavoidable jury question.** Any defense jury
  will ask: "what prevents this system from shooting down a Boeing 737?"
  Having a named module whose sole job is that question is the
  correct answer.
- **Maps cleanly to Sweden's geography.** The Baltic is one of the
  most-trafficked civilian air corridors in Europe. Gothenburg–Helsinki,
  Stockholm–Riga, transatlantic routes across Swedish airspace. The
  scenario sells itself.
- **Tiny surface area.** The logic is a few hundred lines. Most of the
  work is UX — showing the check, the margin, the "why."
- **Legal / ROE posture.** Lines up with LOAC (distinction, proportionality)
  and public policy on human-in-the-loop for weapons. Commanders and
  policymakers specifically look for this feature.

---

## Hard parts and risks

- **Civilian data.** ADS-B is noisy, spoofable, and some state aircraft fly
  with transponders off. Design the module to degrade gracefully: if the
  civilian feed is stale, *raise* the safety threshold, don't lower it.
- **Debris modeling.** A proper debris footprint is ballistics; for the
  demo a parametric cone (altitude-dependent radius) is enough and
  explainable.
- **False-positive rate.** Over-blocking makes the defense useless. The
  "bypass with commander override" channel is the real feature — it
  makes the system usable under pressure, not just safe.
- **Classification-confidence thresholds** need tuning. For a demo, expose
  them as sliders and narrate the trade-off.

---

## Combos

- **+ Smart TEWA (Part I of ideas.md)** — this is literally the safety layer
  in front of it. They ship together.
- **+ Idea 08 (Trajectory intent inference)** — intent score improves
  classification confidence, which improves the civilian-near-miss check.
- **+ Idea 14 (Graceful degradation)** — when a sensor is degraded, the
  safety module tightens its thresholds automatically.

---

## References

- [../threats-and-effectors.md §4.6 Collateral damage](../threats-and-effectors.md)
- [../command-and-control.md §6.4 Human-in / on-the-loop](../command-and-control.md)
- Historical incidents: Wikipedia — [2003 Patriot friendly-fire incidents](https://en.wikipedia.org/wiki/2003_Patriot_missile_friendly-fire_incidents), [MH17](https://en.wikipedia.org/wiki/Malaysia_Airlines_Flight_17), [PS752](https://en.wikipedia.org/wiki/Ukraine_International_Airlines_Flight_752).
