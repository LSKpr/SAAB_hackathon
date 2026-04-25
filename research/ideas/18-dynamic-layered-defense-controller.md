# Idea 18 — Dynamic Layered-Defense Controller

**Short description.** A visible controller that *moves the layers of
defense themselves* — outer, medium, inner, close-in — dynamically as
the fight evolves. Instead of being fixed rings around a site, layers
expand, contract, shift, and merge based on current threat mix,
inventory, weather, and predicted saturation. The operator doesn't
micro-manage engagements as much as **shape the defense volume**.

---

## Direct tie to the PDF

Two jury-criterion hooks:

- **"Banbrytande lösningsstruktur"** — breakthrough solution
  structure. Most air-defense demos treat layered defense as static
  rings; making it *dynamic* and *visible* is a step-change framing.
- **"Tänka flera steg framåt"** — the controller is literally a
  future-looking layout of defense: "the inner layer is about to
  contract because we just burned through short-range SAM; expect
  more leakers through close-in."

---

## The problem

Textbook air-defense doctrine (see
[../../threats-and-effectors.md §4.5](../../threats-and-effectors.md))
talks about four layers:

- **Outer** (LR-SAM, fighter BVR): kill at range, before weapons
  release.
- **Medium** (MR-SAM): kill cruise missiles in flight.
- **Inner** (SR-SAM, VSHORAD): last-chance.
- **Close-in** (guns, DEW, HPM): point defense.

In practice, which "layer" actually exists for a given asset right
now depends on:

- **Inventory status** — an IRIS-T SLM battery with 1 missile left
  is barely a medium layer anymore.
- **Threat mix** — against a Shahed wave, the "inner" layer is
  Gepard and laser, not short-range SAM.
- **Sensor posture** — with GlobalEye down, the outer layer's
  effective range collapses.
- **Weather** — fog eliminates the laser layer at close-in.
- **Geometry** — a ridgeline puts part of one asset behind
  terrain-masked defense (the ridgeline itself becomes a layer).

Operators do this re-layering in their heads under pressure. Making
it explicit, visible, and manipulable is the breakthrough.

---

## The idea in detail

### A. Layer as a data structure

Each defended asset has an associated **layer stack** at each tick:

```
layers[asset_id] = [
  { layer: "outer", radius: 120000, effectors: [Gripen-BVR], status: "active" },
  { layer: "medium", radius: 35000, effectors: [IRIS-T SLM], status: "marginal" },
  { layer: "inner", radius: 9000, effectors: [RBS 70 NG], status: "active" },
  { layer: "closein", radius: 2500, effectors: [Gepard, laser], status: "laser-down-weather" }
]
```

Each layer has dynamic bounds — not fixed rings but **polygons**
that follow terrain, sensor coverage, and weather cells.

### B. Layer evolution policy

A controller updates the layer stack at each tick based on:

- Inventory (effector goes "marginal" when magazine fraction < X).
- Weather (effector goes "unavailable" when its weather modifier < Y).
- Geometry (terrain masking visible via Idea 09's 3D twin).
- Threat composition (a Shahed-heavy threat mix swaps "inner" to
  prefer gun over SR-SAM).

The controller is rule-based and fully explainable (e.g., "inner
layer contracted from 12 km to 8 km because IRIS-T SLS magazine
dropped below 40 %; projected effective range at current reload
rate is 8 km").

### C. Visualization — "layer heat map"

On the map, defended assets have **concentric shaded polygons**, one
per layer, colored by status:

- Solid where the layer is active and at full capacity.
- Faded where marginal.
- Striped where unavailable.

As inventory burns and weather changes, the polygons visibly
breathe. This is the most striking single visual in the whole
prototype — you can tell the health of the defense at a glance,
zoomed out, without reading a number.

### D. Operator handles

The operator can **promote / demote / reshape** layers:

- "Contract the outer layer to 80 km to concentrate fighter CAP on
  the Baltic approach."
- "Promote close-in layer priority: auto-engage drones within 4 km
  belt."
- "Merge asset-A and asset-B under a single layered envelope." —
  useful when a shared defense is more efficient.

Each handle triggers a downstream re-plan (TEWA recomputes, Idea 12
updates, Idea 13 re-stages).

---

## Why it's strong for this hackathon

- **Most photogenic feature in the whole catalog.** Shaded polygons
  breathing in real time read as "this system is alive" to any
  viewer. Beats any bar chart.
- **Genuinely novel in TEWA UX.** Static layer rings are everywhere
  in air-defense marketing. Dynamic, state-driven, visible layers
  are almost nowhere. That's the "breakthrough solution structure"
  jurors ask for.
- **Puts the operator in the commander's chair.** Instead of
  authorizing engagement-by-engagement, the operator shapes the
  *defense volume* and lets the engagement loop execute against it.
  That's a *different* user experience from what other teams will
  pitch.
- **Pedagogically clean.** Even a non-technical juror watching the
  layers breathe understands why an interceptor should be reserved,
  why the close-in layer needs a cheap effector, why losing a
  sensor collapses a layer. It teaches itself.

---

## Hard parts and risks

- **Polygon rendering.** Four layers × several assets × dynamic
  updates × terrain-following = careful UI work. deck.gl's
  PolygonLayer can handle it but keep vertex counts reasonable.
- **Policy authoring.** The rules that update layers are the brain;
  misbehaving rules make the polygons flicker unpleasantly. Debounce
  changes and smooth transitions.
- **Over-abstraction.** If the layers become the only way to think
  about the fight, operators lose contact with individual tracks.
  Keep the per-track UI fully present; layers are a *layer on top*,
  not a replacement.
- **Interaction with Idea 13 (speculative copilot).** Layer shifts
  can invalidate many pre-staged cards at once; be careful the
  copilot doesn't flap.

---

## Combos

- **+ Smart TEWA (Part I).** The layer controller is essentially a
  dynamic weight on TEWA's "layered defense" term — makes that
  implicit logic visible and manipulable.
- **+ Idea 09 (3D twin).** Terrain-following layer polygons are the
  killer use for a 3D twin.
- **+ Idea 12 (Continuity forecaster, this folder).** Layer status
  is the mid-level feature between the track-level TEWA output and
  the asset-level continuity graph; the three form a clean hierarchy.
- **+ Idea 05 (Weather-aware).** Weather is a direct driver of
  layer status; the polygons move *with* the weather.
- **+ Idea 14 (Flex planner, this folder).** Re-roling an asset
  changes its layer contribution instantly.

---

## References

- [../../threats-and-effectors.md §4.5 Layered defense logic](../../threats-and-effectors.md)
- EOS Defense — [Layered approach: the future of air defence](http://www.eosdsusa.com/news/layered-approach-the-future-of-air-defence-global-defence-technology-reports/)
- [../../command-and-control.md §6 operator UX](../../command-and-control.md)
- deck.gl — [PolygonLayer and SolidPolygonLayer docs](https://deck.gl/docs/api-reference/layers/polygon-layer)
- US Army — [C-RAM layered defense](https://www.army.mil/article/78724/c_ram_transforms_defense_tactics)
