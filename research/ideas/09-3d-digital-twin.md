# Idea 09 — 3D Digital Twin of the Defended Zone

**Short description.** A 3D terrain + infrastructure + airspace twin of
the defended area (say, a 200 × 200 km patch of the Baltic coast),
inside which everything else operates: radar line-of-sight and masking,
weapon engagement zones projected onto actual terrain, debris footprints
overlaid on actual towns, and a "walk through the battle" replay in
full 3D for after-action review. Built on open-source globe libraries
(Cesium / CesiumJS or MapLibre + deck.gl 3D).

---

## The problem

2D maps are what operators use on the live console. That's correct — 2D
is faster and denser. But every layer *underneath* that 2D map is
fundamentally 3D:

- Radar line-of-sight is bent by terrain; a nap-of-the-earth cruise
  missile behind a ridgeline is invisible to a ground radar but not to
  an AEW at 9 km.
- Weapon engagement zones are 3D volumes, not circles — IRIS-T SLM
  cannot reach a target at 25 km range and 22 km altitude even though
  its nominal max range is 40 km.
- Debris footprints depend on 3D intercept geometry, not horizontal
  distance from the launcher.
- Helicopter pop-up attacks and low-level ingress routes exist
  specifically because the terrain has folds.
- Emitter coverage (for EMCON planning) is a 3D problem — an ARM
  carrier at 8 km altitude sees very different things than one at
  500 m.

A C2 prototype without a 3D model of the terrain is lying in small but
compounding ways about everything that touches geometry.

---

## The idea in detail

### A. The twin

- **Terrain:** SRTM / Copernicus DEM at 30 m resolution for the chosen
  area.
- **Imagery:** open Sentinel-2 / OpenStreetMap-based basemap.
- **Infrastructure:** OSM features for cities, power stations, ports,
  airports, highways, plus hand-placed "defended assets" markers.
- **Airspace:** controlled/restricted zones, civil corridors.
- **Render:** Cesium or deck.gl's 3D layers.

### B. 3D-aware computations

Every geometric query in the system routes through the twin:

- **Line-of-sight** between any two 3D points, with a terrain raycast.
- **Radar detection probability** given DEM, target position/altitude,
  radar position/beam pattern.
- **WEZ** projected onto the 3D surface — the operator sees a
  3D engagement envelope that *visibly* excludes the valley behind the
  hill.
- **Debris cone** from an engagement, projected onto populated areas
  (Idea 01 / fratricide becomes tangibly visible).
- **Ingress corridor suggestion** — given a threat class, where are
  the natural low-observable corridors into this area? Useful for
  both red-teaming and sensor placement.

### C. Operator views

- **Primary: same 2D top-down** as Part I's TEWA view. No regression.
- **Secondary: "3D perspective" toggle** that tilts and shows the same
  picture as a globe-slice. Useful for briefings and for the
  cognitive moment where a masked cruise missile suddenly appears from
  behind a ridgeline.
- **After-action replay**: scrub a timeline, fly the camera through
  the 3D scene. Show the intercept happening over the actual coastline.

---

## Why it's strong for this hackathon

- **One of the most photogenic features you can ship.** A 2D tactical
  map is a product; a 3D tactical globe is a magazine cover. Judges
  remember screenshots.
- **Directly motivates multiple other ideas.** Weather-aware TEWA,
  line-of-sight radar, debris footprint, ingress corridor — all
  become much more convincing in 3D.
- **Cesium / CesiumJS are free and battle-tested.** There's open
  tooling for exactly this use case (see mil-oss TacMap in our C2
  note's references), so the dev curve is gentle.
- **Educational for the jury.** Even non-technical jurors "get" why
  the system just failed to see a cruise missile when they watch it
  fly behind a hill in the 3D view.
- **Swedish geography is terrain-rich.** The Norrland coast, the
  archipelago, the Baltic islands — it's beautiful and operationally
  meaningful. The demo area sells itself.

---

## Hard parts and risks

- **Performance.** 3D globes with hundreds of entities and a busy
  terrain tile set can strain browsers. Limit the demo area, cap
  icon counts, use deck.gl's batched layers, or lean on Cesium's
  entity collection.
- **Don't let the globe steal the show.** The decision story is
  still "allocation." The 3D view is *in service of* that story —
  cutting from 2D TEWA panel to 3D perspective and back at the
  right moment is the skill.
- **Data licensing.** SRTM, Copernicus DEM, Sentinel-2, OSM are all
  permissively licensed. Cesium terrain has a free tier; you can
  also host open terrain tiles yourself.
- **Don't fake LOS.** A 3D view with a fake LOS model looks worse
  than a 2D view with correct math. Use a real raycast against the
  DEM even if it's slow; cache results per frame.

---

## Combos

- **+ Smart TEWA.** Makes WEZ and Pk modeling materially more
  correct. Terrain masking becomes visible and exploited by both
  attacker and defender.
- **+ Idea 01 (Fratricide guard).** Debris cones over actual towns
  are a much stronger visual than abstract circles.
- **+ Idea 05 (Weather-aware).** Layer clouds at their real altitude
  in 3D; laser DEW unavailability becomes visible at a glance.
- **+ Idea 08 (LLM narrator).** "We lost TRK-47 behind Ridge-Alpha;
  next radar contact expected in 22 s as it clears the valley."
- **+ Idea 12 in ideas.md (Training simulator).** A 3D twin is the
  single highest-value asset a training simulator can have.

---

## References

- [CesiumJS](https://cesium.com/platform/cesiumjs/) (3D globe)
- [Copernicus DEM](https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model) (free 30 m global DEM)
- [Sentinel-2 open data](https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-2)
- [mil-oss / TacMap on GitHub](https://github.com/mil-oss/TacMap)
- [deck.gl 3D layers](https://deck.gl/docs/api-reference/layers) with MapLibre
- [../command-and-control.md §9 recommendations — mapping stack](../command-and-control.md)
- [../threats-and-effectors.md §1.2 helicopter NOE, §4.6 debris](../threats-and-effectors.md)
