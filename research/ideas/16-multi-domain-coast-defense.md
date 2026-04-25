# Idea 16 — Multi-Domain Coast Defense C2 (Land + Sea + Air)

**Short description.** One C2 prototype that manages a **coastal
defense cell** by integrating ground-based SAMs, Gripen in the air,
naval 9LV-equipped corvettes at sea, and coastal anti-ship batteries
on land — all against the same sea-skimming cruise-missile / drone
saturation attack. Sensors and effectors hand off custody across
domains as the threat crosses the coast.

---

## Direct tie to the PDF

The kickoff frames air defense as part of "nationens intressen" and
"operativ flexibilitet." Sweden's national interest against a
Baltic-axis threat is not an air problem in isolation — it's a
**coast** problem that spans sea, land and air.

Saab's own product portfolio makes this idea uniquely on-brand:

- **Air:** JAS 39 Gripen, GlobalEye, IRIS-T, RBS 70 NG.
- **Sea:** **9LV Combat Management System**, RBS 15 anti-ship missile
  fired from ships, shore, and aircraft.
- **Land:** RBS 70 NG, Giraffe radar families, Arthur.
- **C2:** 9AIR C4I, Combat Cloud, 9LV.

Building the coast-defense C2 that tapes these together is directly
"taktisk överlägsenhet" in the jury's sense.

---

## The problem

A Kalibr-class sea-skimming cruise missile from the Baltic has a
different owner at different stages of flight:

1. **Over water, far** — AEW (GlobalEye) and ship sensors see it
   first; corvettes' SAMs or ship-launched AAMs are the right
   shooters; coastal radars barely see it below the horizon.
2. **Over water, close** — coastal surveillance radar picks it up;
   ship or shore SAMs can engage.
3. **Crossing coast** — clutter-heavy regime, terrain masking starts.
   Ground SAMs and gun systems take over.
4. **Over land, inbound** — short-range SAMs and VSHORAD, maybe a
   CAP pair on a last-chance intercept.

Each transition is a **handoff**: of track custody, of radar coverage,
of engagement authority, of ROE. Today these handoffs cross
service boundaries (navy / air force / army), different radio nets,
different C2 tools, different doctrines. The C2 prototype that
presents them as a single engagement is a materially different
product.

---

## The idea in detail

### A. Unified picture across domains

The RAP includes not only air tracks but **ships**, **coastal
launchers**, and their sensor coverage:

- Ship tracks (friendly + hostile) with their engagement envelopes.
- Coastal missile battery positions and their sea-search sectors.
- Harbor / port / islands as defended assets.
- Mixed sensor mesh: AEW radar, ship radar, coastal radar, Giraffe,
  ESM from multiple platforms.

### B. Cross-domain TEWA

The effector catalog expands:

- **Ship SAMs** (ESSM / CAMM-like, RBS 70 from vessels).
- **Ship-launched AAMs** (as a secondary layer against low-flying
  threats).
- **Ship guns / CIWS** (last ring at sea).
- **Shore anti-ship RBS 15** (offensive deterrent, useful when the
  attacker brings ships or landing assets).
- The existing air/ground catalog unchanged.

Engagement options are computed across all domains simultaneously.
For a given threat, the recommender might say: "Corvette HMS Visby
is 12 km closer than any coastal SAM; she has the engagement; shore
SAMs remain in reserve for the trailing Shahed wave."

### C. Custody & handoff

A visible **custody token** per track:

- Displayed on the track card: "tracked by: GlobalEye → HMS Visby →
  Giraffe-4A."
- Handoff moments visualized on the map (a small sweep icon).
- If a planned handoff window is about to close without a receiving
  platform ready, the system alerts and suggests remedies ("slew
  Giraffe-4A to bearing 170 30 s earlier" or "scramble CAP pair to
  bridge the gap").

### D. Cross-service ROE

Different services have different ROE. Ships may have pre-authorized
engagement on anything showing a sea-skimming profile; ground forces
may require explicit ID. The ROE studio (Idea 10) plus the safety
guard (Idea 01) make this visible and honest.

---

## Why it's strong for this hackathon

- **Showcases Saab's actual portfolio.** No other team will integrate
  9LV by name. Demonstrating that you *know* Saab spans across
  domains, and that your prototype respects that, is a significant
  credibility boost.
- **Sweden-specific.** The long coast, the archipelago, and the
  Baltic sea-lane threat are exactly Sweden's defining defense
  geography. Building an air-only prototype misses half the story.
- **Narrative momentum.** The demo can follow *one* cruise missile
  across all four custody stages, with the custody token visibly
  changing hands. That's a single 90-second video that tells the
  whole product story.
- **Hits "coordination of unavoidable activities" (jury criterion).**
  Handoff across service boundaries is the canonical coordination
  failure; making it visible and automatic *is* the breakthrough.
- **Procurement-friendly.** Joint/multi-domain C2 is where NATO and
  Sweden specifically want to invest post-accession.

---

## Hard parts and risks

- **Data load.** More domains = more tracks + more sensors + more
  effectors. Keep the demo area tight (100 × 100 km of Baltic + one
  coast stretch) and scenario small (one ship, one coastal battery,
  one air battery, one CAP pair).
- **Doctrine authenticity.** Real joint ROE is more complicated than
  a demo can faithfully model. Simplify honestly and flag it.
- **Symbology sprawl.** Ship tracks, coastal batteries, and air
  effectors all need distinct APP-6/2525 symbols. Reuse an open icon
  set; don't invent.
- **Don't overreach.** Keep the prototype at the level of two or
  three clear handoffs; don't try to model the whole Baltic theater.

---

## Combos

- **+ Smart TEWA (Part I).** Same engine, expanded catalog.
- **+ Idea 01 (Fratricide guard).** Cross-domain fires multiply
  blue-on-blue risk; the guard's value goes up.
- **+ Idea 05 (Weather-aware).** Baltic weather affects naval
  radar, Gripen CAP, and coastal LOS all at once.
- **+ Idea 09 (3D digital twin).** Archipelago geometry is the
  single most photogenic 3D setting possible.
- **+ Idea 13 (Speculative copilot, this folder).** Handoff pre-
  staging ("next sensor to have custody in 14 s is Giraffe-4A")
  is exactly the kind of anticipation the copilot was built for.

---

## References

- Saab — [9LV Combat Management System](https://www.saab.com/products/9lv-cms)
- Saab — [RBS 15 anti-ship / land-attack missile](https://www.saab.com/products/rbs-15-gungnir)
- Saab — [GlobalEye AEW&C](https://www.saab.com/products/globaleye)
- Saab — [Visby-class corvette reference](https://www.saab.com/products/visby-class-corvette) (where applicable)
- [../../threats-and-effectors.md §5 Swedish context](../../threats-and-effectors.md)
- [../../command-and-control.md §4.3 Saab 9AIR / 9LV](../../command-and-control.md)
- Swedish Defence Research Agency (FOI) publications on Baltic
  approach defense.
