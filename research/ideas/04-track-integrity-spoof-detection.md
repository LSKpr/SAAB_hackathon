# Idea 04 — Track Integrity & Spoofing Detector

**Short description.** A defensive "trust layer" on the air picture
itself. Every track has an integrity score that degrades when physics
stops adding up, when sources disagree in the wrong way, when ADS-B is
inconsistent with radar, or when a ghost track suddenly appears in a way
that matches known electronic-deception patterns. Operators stop
trusting tracks that shouldn't be trusted — *before* they shoot at one.

---

## The problem

Modern air-defense is not just shooting aircraft; the **sensor picture
itself is under attack**:

- **ADS-B spoofing** — unauthenticated by design; anyone with an SDR can
  inject fake civilian traffic.
- **DRFM and ECM ghost tracks** — jammers create plausible radar returns
  to saturate operators.
- **Range-gate pull-off** — electronic deception drags a radar's lock
  from the real target to a false position.
- **GPS/GNSS spoofing** — causes *friendly* kinematic reports to be
  wrong.
- **Cyber-intrusion of sensor feeds** — injected packets at the fusion
  layer look like legitimate tracks.
- **Human error + blue-on-red / red-on-blue ambiguity** — operator sees
  a track and assumes classification transfers across updates.

A TEWA engine that trusts its inputs absolutely will happily allocate
multi-million-dollar interceptors against ghosts and skip the real
threat.

---

## The idea in detail

Every track in the store carries an **integrity vector**, computed at
each update:

1. **Physics-plausibility score.** Does the update violate basic
   kinematics — g-limit, thrust-to-weight, turn radius? A track that
   makes a 50 g turn at 30,000 ft is a ghost until proven otherwise.
2. **Source-agreement score.** Multiple independent sensors agree on
   position? ADS-B says one thing but primary radar says another?
   Model expected disagreement (sensor error ellipses); flag when
   disagreement exceeds it.
3. **Pop-in / pop-out score.** Tracks that appear out of nowhere
   *without* a plausible launch source (no known base on the bearing,
   no boost phase observed) are suspicious. Same for tracks that
   vanish between sensor frames.
4. **Cluster plausibility score.** Ten "Shahed" tracks equally spaced
   3.2 km apart moving in perfect formation is a Shahed *or* a
   textbook DRFM artifact. Flag.
5. **Geographic-political plausibility.** A bomber appearing over
   central Sweden without crossing any border sensor is suspicious.
6. **Cross-domain coherence.** SIGINT says the enemy radar is emitting
   from bearing 090 but we have no associated tracks? Or we have
   tracks but no emissions? Flag.

The aggregate **integrity score** feeds TEWA as a penalty on the
engagement score, exactly like classification confidence does. Below a
threshold, engagement is **forbidden** pending operator confirmation.

Separately, the operator sees a **trust panel**: for each track, the
integrity score with a one-line explanation ("kinematic jump of 9g not
supported by expected airframe; two sensors disagree by 840 m — 14σ").

---

## Why it's strong for this hackathon

- **Timely and under-demoed.** Every real C2 presentation on a
  conference stage now mentions "cyber-hardening" or "integrity,"
  but almost none of them show it in the operator's actual display.
  This is the visible version.
- **It's Saab's portfolio in microcosm.** Saab's EW and SIGINT
  businesses care exactly about this; framing the prototype as a
  **trust-aware** air picture is a very Saab-flavored pitch.
- **Great demo moment.** Inject a spoofed ADS-B blob over the Baltic
  on stage. The integrity panel lights up: "Source-agreement 0.31,
  pop-in without border crossing — possible spoof." Operator doesn't
  waste an interceptor. Jurors remember that.
- **Small surface area.** Each of the six checks is 50–200 lines.
  Total module is maybe 1,500 lines of clean code.
- **Fully explainable.** Every flag is a rule with named inputs. No
  ML required (though an anomaly model can sit on top later).

---

## Hard parts and risks

- **False positives kill trust.** If the integrity panel yells about
  every routine sensor glitch, operators mute it. Calibrate to be
  quiet under normal conditions.
- **Physics plausibility needs a per-class model.** A fighter's
  kinematic envelope differs from a cruise missile's. Reuse the
  threat catalog from the data model.
- **The operator's UX problem.** How do you show *six* integrity
  components without cluttering the map? A single traffic-light
  badge per track that expands to the six on hover is a clean pattern.

---

## Combos

- **+ Smart TEWA.** Integrity score is a direct multiplier on engagement
  score and a hard floor below which engagements are blocked.
- **+ Idea 01 (Fratricide guard).** Low integrity raises the safety
  margin automatically.
- **+ Idea 02 (Civilian classify).** ADS-B-based classification is
  meaningful only when ADS-B integrity is passing.
- **+ Idea 09 in ideas.md (Decoy screening).** Same family; could be
  merged into one unified "trust score."

---

## References

- ICAO — [ADS-B security concerns](https://www.icao.int/safety/ADSB/Pages/default.aspx)
- Wikipedia — [Electronic countermeasures / DRFM](https://en.wikipedia.org/wiki/Digital_radio_frequency_memory)
- [../command-and-control.md §7.5 Logging and auditability](../command-and-control.md)
- [../threats-and-effectors.md §1.3 stealth / aspect notes](../threats-and-effectors.md)
- Academic — "Security of ADS-B: State of the Art and Beyond" (Strohmeier et al., arXiv 1307.3664).
