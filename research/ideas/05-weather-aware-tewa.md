# Idea 05 — Weather-Aware Engagement Scoring

**Short description.** A live meteorology layer that feeds weather into
the TEWA engine so every engagement score reflects *today's* atmosphere,
not textbook numbers. Rain attenuates X-band radar; fog and haze collapse
laser DEW; icing grounds Gripen; thunderstorm anvils hide cruise missiles
beneath them; strong crosswinds at the intercept altitude change missile
fly-out time. The recommender adjusts Pk and engagement envelopes in
real time.

---

## The problem

Every open-source Pk, engagement range, and reaction time in our research
notes is a **sunny-day number**. In reality:

- X-band radar loses 10 dB+ in heavy rain; detection range drops sharply.
- High-energy lasers are the most weather-sensitive effector class —
  fog, haze, clouds, humidity all bleed beam energy. A cloud at 2 km
  can cut effective engagement range in half
  ([../threats-and-effectors.md §2.2 E9](../threats-and-effectors.md)).
- IR guidance (Stinger, IRIS-T) suffers against low-contrast,
  low-temperature backgrounds — winter Baltic sky reduces IR Pk.
- Crosswinds change gun dispersion; the Gepard effective range depends
  on wind at altitude.
- Icing and ceiling ground Gripen pairs on CAP.
- Thunderstorm anvils absorb radar energy and create natural masking
  corridors for low-flying cruise missiles.

Without a weather layer, TEWA is confidently recommending engagements at
Pk 0.82 that are actually Pk 0.30.

---

## The idea in detail

Three integrated pieces:

### A. Weather data model

A per-grid-cell (say, 10 × 10 km grid over the defended zone) record:

```
{
  "cell": { "lat": 58.4, "lon": 15.6 },
  "ceiling_m": 800,
  "visibility_km": 3,
  "precip": "heavy_rain",
  "precip_rate_mm_h": 12,
  "wind_at_level": { "10m": [280, 8], "1km": [290, 18], "10km": [300, 40] },
  "rh_percent": 92,
  "temp_c": 3,
  "icing_risk": "moderate",
  "cloud_layers": [{ "base": 400, "top": 2500, "coverage": 0.9 }]
}
```

Source: synthesized for the demo; in production, ECMWF / SMHI open data
or internal met feeds.

### B. Per-effector weather modifiers

A small function per effector type that takes the relevant cells on the
engagement geometry and returns multiplicative adjustments:

- `pk_multiplier`
- `range_multiplier`
- `reaction_time_adder`
- `available` boolean (e.g., laser unavailable in fog > X, Gripen
  grounded on icing > Y)

Example:

```
laser_modifiers(cells_along_beam):
  if any(cell.fog or cell.cloud_base < beam_altitude): available=False
  else: pk_mult = exp(-k * sum(cell.rh + cell.precip))
```

### C. UI integration

- Weather overlay on the map: light shading by ceiling, hatching by
  precipitation.
- In the recommendation panel, every score row names the weather
  penalty explicitly: "Pk 0.83 × 0.55 (rain in Cell B4) = 0.45."
- A **"best hour to fight"** advisory — if the operator is deciding
  between engaging now vs. waiting 20 minutes for a front to clear
  (rarely possible in saturation but often possible in CAP planning),
  show the trade-off.

---

## Why it's strong for this hackathon

- **Looks obviously correct.** Everyone intuitively knows lasers don't
  shoot through clouds. Seeing the score drop when a cloud moves over
  the map is a "yes, of course, thank god the system knows this"
  moment.
- **Very Swedish context.** Low ceiling, long winters, icing, coastal
  fog, sudden squalls over the Baltic — meteorology is a much bigger
  piece of Swedish air-defense planning than of, say, Arizona's.
- **Cheap to implement convincingly.** 4–6 weather cells + 5–6 effector
  modifier functions = a full visible feature.
- **Grounds the prototype in reality.** A lot of defense AI demos look
  plastic; a weather layer makes the scenario look lived-in.
- **Educates the jury without being didactic.** Jurors watching the
  numbers move with the weather will internalize the cost-exchange
  and kinematic trade-offs you already built in Part I.

---

## Hard parts and risks

- **Don't go full numerical weather prediction.** You are not ECMWF.
  Use canned weather snapshots for the scenario's timeline.
- **Choosing which modifiers to model.** Pick the dramatic ones (laser
  + fog, radar + rain, IR + low contrast). Skip the rest.
- **UI clutter.** Weather overlays easily drown the map. Use subtle
  opacity and hide under a toggle by default.

---

## Combos

- **+ Smart TEWA.** Weather multipliers plug in as extra terms in the
  engagement score without changing the core algorithm.
- **+ Idea 06 (Acoustic mesh).** Acoustic detection is weather-sensitive
  (wind, rain noise) and a natural partner.
- **+ Idea 09 in ideas.md (Digital twin).** A 3D twin plus cloud layers
  is how you get believable line-of-sight for IR and laser.
- **+ Idea 14 in ideas.md (Graceful degradation).** Losing a radar to
  weather degradation is the same re-plan logic as losing a radar to
  an attack.

---

## References

- SMHI — [Open meteorological data](https://www.smhi.se/data)
- ECMWF — [Open data](https://www.ecmwf.int/en/forecasts/datasets/open-data)
- RAND — [Opportunities and challenges for integrating DEWs (PDF)](https://www.rand.org/content/dam/rand/pubs/research_reports/RRA3800/RRA3833-7/RAND_RRA3833-7.pdf) — explicit on DEW weather sensitivity.
- [../threats-and-effectors.md §2.2 E9 laser, E5 gun](../threats-and-effectors.md)
- [../command-and-control.md §6.3 alerting](../command-and-control.md) — for surfacing weather changes.
