# Idea 06 — Distributed Acoustic Drone-Detection Mesh

**Short description.** A low-cost, passive, distributed sensor network
made of smartphone-grade microphones placed across a defended area.
Each node listens for the very recognizable acoustic signature of
Shahed-class loitering munitions ("mopeds in the sky"), triangulates
their position from multi-node time-of-arrival, and feeds the main C2
system with cued tracks *before* any primary radar detects them.
Modeled on Ukraine's real-world **Zvook** project.

---

## The problem

Shahed-136 and similar low-slow-small (LSS) threats are specifically
designed to sneak under radar:

- Altitude 50–4,000 m, often < 500 m.
- RCS 0.01–0.1 m² (see
  [../threats-and-effectors.md §1.1 T12](../threats-and-effectors.md)).
- Speed 100–200 km/h — in the clutter band of every ground radar.
- Thousands-of-km range, arriving in waves over hours.

But they have one very un-subtle property: a **loud, pulsing
two-stroke engine** that can be heard from 4–8 km in quiet conditions.
Ukraine demonstrated this with the **Zvook** project (see
[../command-and-control.md §4.5](../command-and-control.md)) —
smartphones and Raspberry Pis fielded across the country, machine
learning on the characteristic "moped" engine sound, aggregated up
to the national air picture. It shortened detection by minutes
against one of the hardest-to-see threats in the modern inventory.

A prototype C2 system that can ingest and exploit this class of
passive, crowdsourced, civilian-friendly sensor is a very modern
air-defense story.

---

## The idea in detail

Three components:

### A. Mesh nodes

Each node (phone, Pi, ESP32 with MEMS mic):

- Runs a small always-on classifier on 1-second audio windows:
  `is_loitering_munition(audio) -> probability`.
- When probability > threshold, uploads a **detection event**:
  `{ nodeId, timestamp, lat, lon, confidence, audio_snippet_hash }`.
- Node hardware is commodity; a coverage of ~1 per 3 km² in priority
  areas is enough.

### B. Fusion service

- Collects detections, correlates by time window.
- Uses time-difference-of-arrival across at least 3 nodes to
  **triangulate** a position estimate (and its error ellipse).
- Promotes confirmed acoustic detections to full tracks in the C2
  track store, tagged `source: acoustic_mesh`, with appropriate
  covariance.
- If a co-located ADS-B / IR / radar source confirms, boosts
  classification confidence. If radar *disagrees* (no return where
  acoustic says there's a track), flag via the integrity layer
  (Idea 04).

### C. C2 integration

- Acoustic-only tracks enter the RAP at a distinct, lower-initial-
  confidence tier.
- They are excellent *cues* — the TEWA engine hands them to secondary
  sensors (e.g., an IR camera or a steerable radar) for confirmation.
- Once confirmed, they're indistinguishable from any other track.

---

## Why it's strong for this hackathon

- **Directly inspired by real, currently-deployed systems.** Citing
  Zvook by name on stage signals you know the modern literature.
- **Sweden-relevant.** Long coastline, many civilian communities
  near strategic assets — citizen-aided mesh sensing is culturally
  workable in a Nordic society in a way it isn't everywhere.
- **Showcases lean, distributed, software-first thinking.** Contrast
  to monolithic radar-only IADS. This is exactly the architectural
  posture the Delta / Ukraine discussion in our C2 note celebrates.
- **Cheap demo.** Play a Shahed engine audio clip through laptop
  speakers near three laptops; show three detections in the UI
  producing one triangulated track. Low-budget, high-impact.
- **Extensible.** The same framework admits infrasound (for ballistic
  launches), seismic (for cruise-missile sea-skimming overflight),
  and passive RF — all cheap, all passive.

---

## Hard parts and risks

- **Classification robustness.** You need a working
  "is that a Shahed engine?" classifier. There are published training
  sets; use a small pretrained model (e.g., YAMNet fine-tune).
- **Triangulation under noise.** Real acoustic TDOA is painful
  because sound speed varies with wind/temperature. For the demo,
  synthesize detections with plausible timing jitter.
- **False positives** from motorcycles, chainsaws, small aircraft. A
  two-stage classifier (short-window moped-likeness, then 15-second
  temporal regularity) reduces this.
- **Privacy and civilian perception.** Even in the demo, frame the
  mesh as *opt-in volunteer nodes on state-owned infrastructure*,
  not covert microphones in citizens' apartments.

---

## Combos

- **+ Smart TEWA.** Adds a fast-cueing low-cost sensor tier that
  specifically addresses T12/T13 — the hardest cost-exchange case.
- **+ Idea 03 (Friendly drone swarm).** Acoustic mesh cues the
  interceptor swarm; swarm kills the Shahed. Cheap sensor → cheap
  shooter → cheap killchain.
- **+ Idea 05 (Weather-aware).** Acoustic detection range depends on
  wind and humidity; makes for a natural shared model.
- **+ Idea 04 (Integrity).** Acoustic-vs-radar disagreement is a
  natural red flag.

---

## References

- CSIS — [Does Ukraine Already Have Functional CJADC2 Technology?](https://www.csis.org/analysis/does-ukraine-already-have-functional-cjadc2-technology)
- Public reporting on **Zvook** (Google it; numerous 2023–2025 press pieces).
- Wikipedia — [Acoustic location](https://en.wikipedia.org/wiki/Acoustic_location)
- Google — [YAMNet audio classifier](https://tfhub.dev/google/yamnet/1)
- [../command-and-control.md §4.5 Ukraine / Delta / Zvook](../command-and-control.md)
- [../threats-and-effectors.md §1.1 T12/T13](../threats-and-effectors.md)
