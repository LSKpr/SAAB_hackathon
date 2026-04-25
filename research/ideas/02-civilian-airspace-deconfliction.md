# Idea 02 — Civilian Airspace Rapid-Classify & Deconfliction

**Short description.** A fast identification and deconfliction layer that
fuses ADS-B, filed flight plans, Mode-S squawks, and historical flight
patterns to classify every track in the air picture as *civilian / state /
military-friendly / unknown* within seconds — and pushes corresponding
advisories to civilian ATC so airliners can be vectored out of an active
engagement zone before the first missile leaves the rail.

---

## The problem

Modern peace-time and grey-zone conflicts happen *over* busy civilian
airspace. In the Baltic in an average hour there are 50–100 civilian
aircraft in the air; any of them can be the ambiguous track that forces
an operator into the worst decision of their career (see Idea 01).

The C2 system doesn't just need to avoid shooting them — it needs to
*actively coordinate* with civil aviation so that, when defensive
operations start, civilian traffic is moved, grounded, or re-routed
before it becomes the ambiguous track. Right now this coordination is
phone calls, faxes, and NOTAMs that take minutes to hours.

---

## The idea in detail

Two halves:

### A. Rapid classification

For every track in the RAP, compute an **identity vector** in < 1 s:

- **ADS-B match** — compare current kinematics against any ADS-B emitter
  in the area. A match on ICAO address + position + altitude + velocity
  is a strong civilian signal.
- **Flight-plan match** — does the track's position and trajectory match
  a filed civilian flight plan (Eurocontrol-style) for this time slot?
- **Mode-S interrogation** (if our own secondary radar has one) — query
  the track, check response.
- **Behavioral signature** — airline routes repeat; a track flying a
  Gothenburg–Helsinki great-circle at FL340 at 0.82 Mach is a known
  pattern. Deviation from pattern raises the "check again" score.
- **Historical baseline** — an airline's specific daily flight at ±15
  minutes strengthens the match even if ADS-B glitches momentarily.

The output is a **classification** with per-source confidence contributions,
so the operator can see *why* a track is civilian and which signal would
flip it if lost.

### B. Civil deconfliction hotline

A structured channel to civilian ATC (simulated for the prototype):

- When a **likely engagement zone** is predicted (TEWA says "we will fire
  missiles in sector S in the next 60 s"), emit an automatic advisory
  naming the bounding box, altitudes, and duration.
- Track which civilian flights are affected and propose re-routes in the
  same advisory.
- Receive an acknowledgment; show "X civilian flights now diverting,
  ETA clear 12 s" on the operator screen.
- Log every advisory — this is the document trail a ministry will want
  after any incident.

---

## Why it's strong for this hackathon

- **Saab context.** Sweden has one of the world's most mature civil-military
  airspace integration practices (LFV + Flygvapnet). A product that
  models this cleanly looks instantly at home on a Swedish customer's
  desk.
- **Zero-to-hero UX moment.** Switching from "unknown" to "civilian
  Lufthansa LH782 from FRA to HEL, matches pattern 97%, ADS-B live" is
  one of the most satisfying moments you can demo.
- **Reduces decision burden.** Most of an operator's cognitive load in
  peacetime is classifying the 95% of tracks that *are* civilian. A
  rapid-classify layer makes the hostile track literally the one that
  isn't already colored green.
- **Pitches cleanly to regulators.** Any defense AI product has to answer
  "how do you keep civilians safe?" This is half the answer (Idea 01 is
  the other half).

---

## Hard parts and risks

- **Data availability.** ADS-B is free (opensky-network.org); flight
  plans are harder. For a demo, synthesize a few dozen realistic
  civilian tracks from a published Eurocontrol daily pattern.
- **Spoofing.** ADS-B is unauthenticated and trivially spoofable. The
  classification should never say "definitely civilian" based on ADS-B
  alone; it should say "ADS-B reports X, physics consistent with X."
  Make that subtlety visible.
- **Ambiguity cliff.** A transponder failing mid-flight must not
  immediately reclassify a 737 as "unknown hostile." Bias the model
  toward persistence of identity when the physics still matches.
- **Coordination overreach.** The "hotline" has to remain an
  advisory-only channel. Don't let the prototype pretend it owns civil
  airspace.

---

## Combos

- **+ Idea 01 (Fratricide guard).** Identity vector is the primary input
  to the civilian-proximity check.
- **+ Idea 08 (Trajectory intent inference).** The same kinematic
  reasoning that classifies civilians also rules out intent against
  defended assets.
- **+ Smart TEWA.** Classification confidence × proximity to civilians
  becomes a hard penalty in engagement scoring.
- **+ Idea 22-style LLM narrator** — "Three civilian flights currently
  inside the predicted engagement zone, diverting; clear in 40 s."

---

## References

- [OpenSky Network — free ADS-B data](https://opensky-network.org/)
- [Eurocontrol — Network Manager](https://www.eurocontrol.int/network-manager)
- [../command-and-control.md §1 & §5](../command-and-control.md) —
  IFF, ID, tactical data links.
- [../threats-and-effectors.md §4.6](../threats-and-effectors.md) —
  collateral damage.
- NTSB / ICAO reports on civilian shootdowns (MH17, PS752).
