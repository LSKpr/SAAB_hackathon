# Boreal Passage Operator Console — Static Defense vs. Threats

Air-defense C2 operator console for the Saab Smart Stridsledning Hackathon. The operator plays **South / Country Y** defending against air threats from **North / Country X** across the Boreal Passage.

The product is a **static-defense-vs-threat decision system**: a fixed network of pre-placed defense stations (`SAM_LR`, `SAM_MR`, `SAM_SR`, `AAA`, `LASER`) defends a population of civilian and military infrastructure with known importance values. The right-hand panel ranks defense options for each inbound threat by `cost / %Pk`, shows the counterfactual ("damage if ignored"), and the operator clicks `[Engage]`. A running cost-exchange ledger tracks `Saved · Spent · Net` in real time. The wow moment is the side-by-side **Ghost Replay** comparing the user's run against a naive "highest-Pk-in-range" operator.

This repository implements:

- **Phases 1–3** (the operator console shell): see `research/implementation-plan.md`.
- **Phases B–E** (defense system on top of the shell): see `research/defense-stations-plan.md`.

The Phase 4 *predictive allocation* prototype was reverted; only the static-defense product ships in this build.

## Run

```powershell
cd "saab hackathon"
npm install
npm run dev
```

Then open http://localhost:5173. The default scenario `01-multi-wave.json` autoloads and starts playing.

```powershell
npm run build               # type-check + production build
npm run test                # vitest
npm run seed-infrastructure # validate / regenerate data/world.json from a spec
```

## Wow demo (scenario `01-multi-wave.json`)

1. `npm run dev` — the multi-wave scenario starts paused or playing depending on your last action.
2. Wave 1 (T+1m): eight cheap drones inbound to **Solano**. Click each `M-0x` threat in the right-side panel. Each is point-defended by `AAA @ Solano` (Pk 0.70, $5K/shot) — far cheaper than a SAM. Click `[Engage]` for the AAA option.
3. Wave 2 (T+4.5m): three subsonic cruise missiles toward **Firewatch**. The top suggestion should be `SAM_MR @ Firewatch` (Pk 0.85, $1M, ratio ≈ $11.8K/% Pk), with `SAM_LR @ Spear Point` ranked below it (Pk 0.55, $4M, ratio ≈ $72.7K/% Pk).
4. Wave 3 (T+8.5m): one SRBM toward **Meridia**. Only `SAM_LR` has nonzero Pk (0.70 vs SRBM); engage it.
5. When the scenario ends (T+12m), the after-action modal renders. Note the live ledger in the top bar.
6. Click **▶ Ghost replay** in the top bar. The system silently re-runs the same scenario with a naive operator (always picks the highest-Pk in-range station, ignoring cost), then opens a side-by-side overlay: **Naive vs. You**. The headline is your net cost-exchange diff in big type.

The Ghost Replay numbers are deterministic — pressing it twice yields identical numbers thanks to the seeded PRNG keyed on `(scenarioId, simTimeMin, threatId, stationId)`.

## Scenario picker

| id | label | purpose |
|----|-------|---------|
| 01 | Multi-wave (defense) | the wow demo: drones → CMs → SRBM |
| 02 | Single SRBM (defense) | tutorial: only `SAM_LR` has nonzero Pk |
| 03 | Swarm only (defense) | 30-drone swarm; AAA / LASER dominate; SAM_MR burns money |
| 00 | Saturation raid (legacy) | Phase 1–3 regression check (track propagation, no defense system) |

## Tweaking effectiveness, cost and world layout

- `data/effectiveness.json` — `Pk[weapon][threatClass]`. Lookup table; the runtime applies a linear range falloff (1.0 inside the inner 20% of range, dropping linearly to 0.5 at full range, 0 beyond). Edit the JSON, refresh the page.
- `data/cost-table.json` — per-weapon `costPerShotUsd / rangeKm / magazineMax / reloadMin` and per-threat `unitCostUsd / damageMult` (multiplier applied to the target's `damageOnHitUsd` for counterfactual damage).
- `data/world.json` — `infrastructure[]` and `stations[]` arrays. `tools/seed-infrastructure.mjs` validates the shape and rewrites the file in canonical form. Run `npm run seed-infrastructure` to validate, or pass a custom spec path.
- `data/scenarios/*.json` — wave-shaped or legacy `spawns[]`-shaped JSON. Each defense scenario must declare `mode: "defense"` (or include `waves[]`) and may optionally override `infrastructure` / `stations` for that match. If both are omitted, the default `data/world.json` is used.

## Adding a new scenario

1. Drop a new JSON file in `data/scenarios/`. Two shapes are supported:
   - **Defense** (`mode: "defense"`): a `waves[]` list, each wave with `spawns[]` of `{ t, id, class, fromKm, toKm, speedMps, altitudeM, targetAssetId, threatUnitCostUsd }`. `targetAssetId` must reference an `Infrastructure.id` from `world.json` (or your custom `infrastructure` override).
   - **Legacy** (Phase 1–3 regression): a flat `spawns[]` list as in `01-saturation-raid.json`. Mode is inferred as `"legacy"`. Renders tracks and the original side panels; the defense system is dormant.
2. Add the scenario to the picker list in `src/App.tsx`.
3. The store rebuilds tracks deterministically when you scrub the legacy timeline. Defense scenarios reset to T+0 on scrub (TODO[v2]: full forward-rewind).

## Math (locked)

- **Importance**: `TYPE_BASE_IMPORTANCE × SIZE_MULT`, override per asset with `importanceOverride`. See `src/engine/defense/importance.ts`.
- **Threat level**: `importance(target) × CLASS_HAZARD[class]`, clamped to 100, banded LOW/MED/HIGH/CRIT at thresholds 30/55/80.
- **Effective Pk**: `PK_TABLE[weapon][class] × rangeFalloff(distance, range)` — see `src/engine/defense/effectiveness.ts`.
- **Counterfactual**: `target.damageOnHitUsd × CLASS_DAMAGE_MULT`. Shown in every suggestion card and used as the `Do nothing` line.
- **Ratio**: `costPerShotUsd / max(pk × 100, 1)` — `$ per percentage point of Pk`. Lower is better. Suggestion lists are sorted by ratio ascending; infeasible options sink with a `reasonText`.

## Anti-fortune-teller rules

- No "WILL"/"will" in operator-visible strings.
- Every suggestion shows its probability (Pk), its cost, its ammo, and the counterfactual damage if ignored.
- "Do nothing" is always present at the bottom of every threat card.

## Project layout

```
saab hackathon/
├── data/
│   ├── boreal-passage.csv            # source-of-truth land/sea assets in km
│   ├── world.json                    # default infrastructure + station layout
│   ├── effectiveness.json            # Pk lookup table
│   ├── cost-table.json               # weapon and threat cost numbers
│   └── scenarios/
│       ├── 01-saturation-raid.json   # legacy regression
│       ├── 01-multi-wave.json        # wow demo
│       ├── 02-single-srbm.json
│       └── 03-swarm-only.json
├── src/
│   ├── App.tsx                       # mounts panels + map; switches layout by scenario mode
│   ├── main.tsx
│   ├── assets/map/boreal-passage.svg # terrain only — asset markers stripped
│   ├── components/
│   │   ├── Map/{BorealMap,InfrastructureLayer,DefenseStationLayer,
│   │   │        ImportanceHeatmapLayer,ThreatLayer,EngagementLayer,
│   │   │        AssetLayer,TrackLayer,RangeRingLayer,
│   │   │        TerrainLayer,HoverTooltip,coords}.tsx
│   │   └── Panels/{TopBar,ThreatsPanel,ThreatCard,SuggestionCard,
│   │                AfterActionPanel,TrackListPanel,EngagementPanel,
│   │                ResourcePanel,AlertsPanel,TimelinePanel}.tsx
│   ├── engine/
│   │   ├── store.ts                  # Zustand store, defense slice, ticks
│   │   ├── scenario.ts
│   │   ├── tick.ts                   # 200 ms setInterval
│   │   ├── types.ts                  # Asset/Track/Threat/Station/Engagement/Ledger
│   │   └── defense/
│   │       ├── importance.ts
│   │       ├── effectiveness.ts
│   │       ├── cost.ts
│   │       ├── suggestions.ts
│   │       ├── loop.ts               # pure tick: spawn / propagate / suggest
│   │       ├── resolve.ts            # operator click → seeded outcome
│   │       └── naive.ts              # ghost-replay heuristic
│   └── __tests__/{coords,defense.importance,defense.effectiveness,defense.cost}.test.ts
├── tools/seed-infrastructure.mjs
├── index.html
├── tailwind.config.ts
├── postcss.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Conventions

- The map is two stacked SVGs sharing the same viewBox; the bottom layer is the terrain SVG, the top layer is data-driven.
- South-side defense uses `kmToSvgRaw` for stations/threats (no cosmetic side offset) and `kmToSvg(x,y,side)` for legacy CSV assets that line up with the SVG's ±40 px land translations.
- The sim engine advances inside the Zustand store on a 200 ms `setInterval`. UI components subscribe — never the other way around.
- Engagement outcomes use a deterministic mulberry32 PRNG seeded on `(scenarioId, simTimeMin, threatId, stationId)`. Same scenario + same operator clicks → identical numbers across runs and across ghost-replay/live runs.
