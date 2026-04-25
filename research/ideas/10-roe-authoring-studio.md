# Idea 10 — ROE Authoring Studio with Simulation

**Short description.** A commander-facing tool for writing Rules of
Engagement as structured, versioned, simulation-checked policy. The
commander drafts a rule in a readable rules DSL, simulates it against a
library of scenarios, sees how it changes engagement outcomes
(leakers, interceptors spent, false-engagements, civilian near-misses,
blue-on-blue), and, if satisfied, publishes it into the live system.
Every engagement then carries a pointer back to the exact rule version
that authorized it.

---

## The problem

In every real air-defense operation, ROE is a mix of legal doctrine
(LOAC, national caveats), commander's intent, coalition constraints,
and hard technical ROE (automated — "do not engage if classification
confidence < 0.7 and civilian traffic within 10 km").

Today this mix is:

- Written in natural-language documents.
- Translated by hand into C2 system configurations.
- Updated rarely, under pressure, with high error cost.
- Almost impossible to *test* before going live.
- After an incident, hard to reconstruct: *which* version of *which*
  rule fired to authorize *this* engagement?

There is an enormous gap between "ROE on paper" and "ROE encoded in
software," and it is exactly the kind of gap a modern C2 prototype
could close.

---

## The idea in detail

### A. Rule DSL

A small, human-readable rules language with a narrow, auditable
grammar. Example:

```
rule "engage-hostile-cruise-missile" v1.3 {
  when:
    track.classification in [CM_SUBSONIC, CM_SUPERSONIC]
    and track.affiliation == "hostile"
    and track.integrity >= 0.7
    and predictedImpact.asset.priority <= 2
  allow:
    effectors [SAM_MR, SAM_SR, FIGHTER_BVR]
    authority HITL
  deny:
    if civilian.withinKm(track.predictedEngagement, 8)
    if friendly.withinKm(track.predictedEngagement, 3)
    if weather.laser.fogIndex > 0.6 effector DEW_LASER
  annotate:
    rationale "SOP 42 §3.1; commander's intent 2026-04-24"
}
```

Each rule is:

- **Typed**: fields reference the track / event / effector schemas
  from the research notes.
- **Versioned**: every change increments, old versions remain for
  audit.
- **Signed**: a commander's identity is cryptographically tied to the
  version (demo can use a simple JWT).

### B. Simulator checkpoint

Before publish, the studio runs the candidate rule set against a
library of scenarios (scripted waves from Part I + stored past
incidents), producing:

- **Leaker rate delta** vs. the previous rule version.
- **Interceptors-per-kill delta**.
- **Civilian-near-miss count**.
- **Blue-on-blue near-miss count**.
- **Operator authorization load** (clicks per minute under this rule
  set — does the new ROE overload the operator?).

These are shown as a diff. The commander sees explicitly: "with the
proposed stricter integrity floor, leaker rate +0.3 / scenario but
civilian near-misses 2 → 0." Trade-offs become visible and
accountable.

### C. Live binding

When published:

- The TEWA engine recompiles its constraint layer.
- Every subsequent engagement carries `authorizedByRuleVersion:
  "engage-hostile-cruise-missile@v1.3"` in its log entry.
- The operator can see which rules fired (and which denied) for any
  proposed engagement, with a one-click deep link to the rule text.

### D. Post-incident reconstruction

A query like "show me every engagement authorized by rule X in the
last 72 hours" becomes a one-line filter. Incident reviews that
previously took days of log-reading become minutes.

---

## Why it's strong for this hackathon

- **Nobody else will have it.** Commander-level ROE tooling is the
  *least-demoed* part of C2. Most prototypes hand-wave ROE as
  "configurable." Yours will have a visible rules editor with
  simulation diffs.
- **Elegantly showcases everything else you built.** The simulator
  used to check rule versions is the same simulator used for Part
  I's think-ahead. The scoring used in diffs is the same scoring
  used in engagement recommendations. One engine, three consumers.
- **Speaks to the actual buyer.** Procurement officers, commanders,
  and legal advisors care more about *governance* than about the
  algorithmic core. They will recognize this feature as the thing
  that makes the whole system fieldable.
- **Great storytelling.** In the demo, make a live rule change ("the
  commander tightens civilian-proximity from 5 km to 10 km"), push
  it, and show the TEWA recommendations shift within one tick.
  Trust becomes tangible.
- **Directly addresses jury criteria.** "Help users succeed much
  better" includes the user who is the *commander*, not only the
  radar operator. This expands the product's user-group in a way
  that looks deliberate.

---

## Hard parts and risks

- **DSL scope creep.** Keep the grammar tiny. Nouns: track, effector,
  event, civilian, friendly, weather, time. Verbs: allow, deny,
  annotate, prefer. Predicates: comparators + a few geometric
  helpers (`withinKm`, `insideZone`). Resist adding more.
- **Validation.** Bad rules can ground the defense. Require a
  simulator pass before publish. Require a "dry run on live picture"
  mode that shows what *would* change for 60 s before committing.
- **Human intuition vs. formalism.** Commanders don't write
  grammars; they write memos. The editor should support natural-
  language entry with an LLM-assisted (outside the engagement loop!)
  translation to the DSL — with the DSL shown side by side so the
  commander reviews and signs only the formal version.
- **Versioning UI.** Do not reinvent git. Show a simple linear
  version list with diffs; that's enough.

---

## Combos

- **+ Smart TEWA.** ROE becomes the hard-constraint layer over
  TEWA's soft scoring. They are natural partners.
- **+ Idea 01 (Fratricide guard).** Rules in the studio are exactly
  how a commander would encode "never engage within X km of a
  civilian track" once and trust it.
- **+ Idea 07 (Cognitive-load UX).** Overload-triggered HOTL mode is
  *itself* a rule. Author it in the studio.
- **+ Idea 12 in ideas.md (Training simulator).** Rules can be A/B
  tested across hundreds of synthetic scenarios.
- **+ Idea 08 (LLM narrator).** Narrator can explain rule
  applications in plain language to the supervising officer.

---

## References

- NATO MC 362/1 — Rules of Engagement (public summaries; the document
  itself is restricted).
- San Remo Manual on International Law Applicable to Armed Conflicts
  at Sea — a public-domain model of structured ROE language.
- [../command-and-control.md §2 ROE as hard constraint](../command-and-control.md)
- [../command-and-control.md §6.4 Human-in / on-the-loop](../command-and-control.md)
- Policy DSLs in adjacent fields: Open Policy Agent / Rego, Cedar
  (AWS) — models of what a signed, testable policy DSL looks like in
  production.
- [DoD Directive 3000.09 — Autonomy in Weapon Systems](https://www.esd.whs.mil/portals/54/documents/dd/issuances/dodd/300009p.pdf).
