# Idea 17 — Gripen Road-Base Dispersion & Scramble Planner

**Short description.** A planner uniquely designed around **Bas 90** /
road-basing doctrine: dispersed Gripen operations from dozens of
civilian roads, with small ground crews, limited fuel / munitions per
site, and weather-sensitive runway segments. The planner decides where
pairs sit on alert tonight, which road segment they'll scramble from,
which smaller base hosts the turnaround, and how the defense picture
looks if any one site is lost to a strike. It's a piece of software
that only Sweden would build — and that makes it a Saab signature.

---

## Direct tie to the PDF

Two kickoff phrasings this idea lands on:

> *"Vilka flygplan ska skickas från vilka baser?"* — which aircraft
> from which bases. With road basing, "bases" is plural in a way few
> other air forces can match.

> *"Hög operativ flexibilitet."* — road basing *is* the doctrinal
> answer to operational flexibility for the Swedish Air Force.

Judges at Saab will recognize road-base operations as a product
distinction that no non-Swedish team can credibly claim.

---

## The problem

Gripen is one of very few front-line fighters specifically designed
for dispersed road-base operations (Bas 90 doctrine, revived under
current Swedish thinking):

- Short take-off and landing (≈ 800 m on highway segments).
- Small fuel/maintenance footprint — 5-person ground crew can turn
  an aircraft in ~10 minutes.
- Networked sortie planning across bases.

The doctrinal promise is enormous: no single missile strike can kill
Swedish air power, because there are no monolithic targets. The
operational reality is harder:

- Fuel, munitions, and spares have to be **pre-positioned** across
  dozens of candidate road segments.
- Weather (icing, snow coverage, crosswind) eliminates some segments
  in real time.
- Ground crews rotate between sites in buses or utility vehicles.
- A Meteor-armed pair at Site A can't cover Sector B if it's still
  at Site A; a Meteor-less pair at Site B covers Sector B but less
  well.
- Civilian road disruption (closures to traffic) is a political cost
  that accumulates.

Without software, the planner is a colonel with a map and a phone.
This is the software.

---

## The idea in detail

### A. Road-base catalog

A curated list of candidate road segments with attributes:

- Geometry (start, end, LDA, width, slope, obstacles).
- Current condition (clear / icy / snow / flooded / damaged).
- Support level (bare segment / pre-stocked with fuel only / fuel +
  munitions / full crew on site).
- Access for support convoy (time from nearest depot).
- Political cost (civilian road closure duration).
- Survivability score (distance to likely cruise-missile tracks from
  the Baltic, terrain masking).

### B. Overnight disposition optimizer

For tonight's posture, recommend:

- Which segments host an alert pair (Alert-5, Alert-15).
- Which are pre-stocked (fuel + AAMs) but unmanned.
- Which are cold backups.
- Convoy plan to move fuel and crews to match the disposition.
- Weather sensitivity: "if icing warning Band 2 materializes, fall
  back from segments R4 and R7 to hardened site Såtenäs."

Objective is a weighted blend of:

- Coverage of likely sectors (anchored to threat-template work from
  Idea 1 in ideas.md and Idea 10 / "raid template classifier").
- Survivability.
- Civilian/political cost.
- Crew and airframe sustainability.

### C. Live scramble recommendations

In the live air picture:

- When a threat appears, the planner is already aware of the
  disposition. Idea 11 (multi-base scramble optimizer) now has a
  **realistic catalog of candidate bases**, including road segments
  unique to Swedish doctrine.
- Scramble recommendation names the segment, the pair, and the
  loadout, plus expected time-to-launch (which includes factors
  like "pair at R4 has to taxi 300 m on a snow-limited surface").

### D. Loss resilience view

A what-if button: "assume road segment R4 is struck now — how does
the disposition re-plan?" The system shows the new coverage and the
time to reconstitute (pair relocates to alternate R5, takes 35 min
including crew bus movement).

---

## Why it's strong for this hackathon

- **Unique to Sweden.** No non-Swedish team will build this. It
  signals deep local knowledge and respect for Saab's specific
  doctrinal environment.
- **Beautiful map.** Hand-picked road segments on an OSM basemap
  with weather overlays and a colored-ribbon "coverage" zone is a
  strikingly different visual from generic TEWA demos.
- **Answers "resilience" honestly.** Rather than abstract "graceful
  degradation," this shows the exact thing Swedish AD doctrine is
  designed around: distributed, survivable air power.
- **Perfect match with the hackathon's "breakthrough solution
  structure" criterion.** It reframes the base-selection problem
  around dispersed geography, which is genuinely novel inside a
  TEWA demo.
- **Works even if you skip the live TEWA.** Even as a
  stand-alone planning tool, this is a compelling product.

---

## Hard parts and risks

- **Public data.** OSM has the roads. Exact LDA, width, and slope
  figures are harder; for the demo, pick 6–10 real Swedish highway
  segments known to have been used as Bas 90 sites and assign
  plausible parameters.
- **Weather integration.** Keep it canned (Idea 05 is a full weather
  layer; here you only need a per-segment flag).
- **Don't market as a live operational tool.** Frame it as a
  planning + rehearsal aid, not a "tonight you will fly from R7"
  directive.
- **Scope temptation.** Resist adding convoy route optimization at
  scale; it's a separate product.

---

## Combos

- **+ Idea 11 (Multi-base scramble, this folder).** Road segments
  become first-class in the scramble catalog.
- **+ Idea 12 (Continuity forecaster, this folder).** Dispersion
  posture directly drives survivability terms in the forecast.
- **+ Idea 14 (Flex planner, this folder).** Relocating a pair
  across bases is a flex action.
- **+ Idea 1 in ideas.md (Attack-pattern allocation).** Pattern-based
  threat forecast drives nightly disposition.
- **+ Idea 09 (3D digital twin, this folder).** Tilted 3D view of
  road segments against terrain is visually perfect.

---

## References

- Wikipedia — [Bas 90](https://en.wikipedia.org/wiki/Bas_90) (Swedish
  Air Force dispersed basing).
- Wikipedia — [Saab JAS 39 Gripen road-base operations](https://en.wikipedia.org/wiki/Saab_JAS_39_Gripen).
- Saab — [Gripen E-series product page](https://www.saab.com/products/gripen-e-series).
- Public press on Swedish Air Force exercises using road bases
  (numerous 2022–2026 items).
- [../../threats-and-effectors.md §5 Swedish context](../../threats-and-effectors.md)
- OpenStreetMap — for candidate road geometry.
