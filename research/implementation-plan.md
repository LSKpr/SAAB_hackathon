# Implementation Plan — Boreal Passage Operator Console

> Idea-agnostic operator console for the Saab Smart Stridsledning Hackathon.
> Built on top of `the-boreal-passage-map.svg` and `Boreal_passage_coordinates.csv`.
> Phases 1–3 are reusable for any of the 37 ideas in [ideas-summary.md](ideas-summary.md);
> Phase 4 is where the chosen idea plugs in.

---

## 0. Decisions locked

| # | Decision | Choice |
|---|----------|--------|
| 1 | Operator side | **Defender — South (Country Y)** |
| 2 | Map handling | **Inline the SVG into React** (so every asset is a live `<g>` with hover/click/animation) |
| 3 | Plan persistence | **This file**, saved next to the ideas |

---

## 1. Source assets

- **`the-boreal-passage-map.svg`** — stylized 1000×780 theater. Two coastlines, islands, capitals (yellow squares), air bases (triangles), cities (white squares). Each asset already has `data-name`, `data-info`, `data-side`. North group has visual offset `translate(0,-40)`, south group `translate(0,+40)` — purely cosmetic, to widen the passage.
- **`Boreal_passage_coordinates.csv`** — engine-space truth in km. Theater is ≈ 1666.7 km × 1300 km. Contains all locations and terrain polygons.

**Coordinate relationship:** `KM_TO_PX = 1000 / 1666.7 ≈ 0.6`.
SVG y also shifts by `±40 px` per side group. Tracks (which fly through the passage) ignore the side offset.

---

## 2. Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Build | **Vite + React + TypeScript** | Fastest dev loop, zero config friction |
| Styles | **Tailwind CSS** | Operator UIs are dense; utility classes win |
| State | **Zustand** | Tiny, perfect for tick-driven sim state |
| SVG inlining | **vite-plugin-svgr** | Imports SVG as a React component |
| Animation | **framer-motion** (optional, phase 3) | Smooth track motion |
| CSV parsing | **papaparse** | Robust enough for a static CSV |

No backend in phases 1–3. A pure-frontend scenario engine on a `setInterval` tick is enough to demo any idea.

---

## 3. Layout

```
┌──────────────────────────────────────────────────────────────┐
│  TOP BAR: scenario · sim clock · DEFCON-style status · ROE   │
├───────────────┬──────────────────────────────┬───────────────┤
│  TRACK LIST   │                              │  RESOURCES    │
│  (threats,    │                              │  (bases,      │
│   sorted by   │         MAP CANVAS           │   fighters,   │
│   priority)   │      (SVG + overlays)        │   SAMs,       │
│               │                              │   magazines)  │
├───────────────┤                              ├───────────────┤
│  ENGAGEMENTS  │                              │  ALERTS /     │
│  (active +    │                              │  EXPLAINS     │
│   proposed)   │                              │               │
├───────────────┴──────────────────────────────┴───────────────┤
│  TIMELINE / EVENT LOG  (play / pause / 1× / 4× / scrub)      │
└──────────────────────────────────────────────────────────────┘
```

Operator plays **South / Country Y**. South assets render in friendly colors (cyan for SAM, blue circle for friend tracks). North assets render as hostile by default (red diamond for hostile tracks, neutral grey for unidentified land assets).

---

## 4. Project structure

```
saab-hackathon/
├── data/
│   ├── boreal-passage.csv             ← copy of source CSV
│   └── scenarios/
│       └── 01-saturation-raid.json    ← scripted timeline
├── public/
│   └── map/boreal-passage.svg         ← copy of source SVG
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── Map/
│   │   │   ├── BorealMap.tsx          ← root SVG, viewBox, layers in z-order
│   │   │   ├── TerrainLayer.tsx       ← coastlines + islands (from SVG paths)
│   │   │   ├── AssetLayer.tsx         ← bases/capitals/cities (from CSV)
│   │   │   ├── RangeRingLayer.tsx     ← effector ranges
│   │   │   ├── TrackLayer.tsx         ← live tracks
│   │   │   ├── EngagementLayer.tsx    ← shot lines, intercept points
│   │   │   ├── HoverTooltip.tsx
│   │   │   └── coords.ts              ← km ↔ svg helpers
│   │   ├── Panels/
│   │   │   ├── TopBar.tsx
│   │   │   ├── TrackListPanel.tsx
│   │   │   ├── EngagementPanel.tsx
│   │   │   ├── ResourcePanel.tsx
│   │   │   ├── AlertsPanel.tsx
│   │   │   └── TimelinePanel.tsx
│   │   └── ui/                        ← Button, Badge, Tooltip, Tag
│   ├── engine/
│   │   ├── store.ts                   ← Zustand state
│   │   ├── scenario.ts                ← scenario loader/parser
│   │   ├── tick.ts                    ← sim loop (200 ms)
│   │   └── types.ts                   ← Asset, Track, FireUnit, Engagement, SimEvent
│   ├── data/
│   │   └── parseAssets.ts             ← CSV → typed Assets
│   └── styles/
│       └── tailwind.css
├── index.html
├── package.json
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 5. Coordinate helper (pin this exactly)

```ts
// src/components/Map/coords.ts
export type Side = "north" | "south" | "neutral";

export const SVG_W = 1000;
export const SVG_H = 780;
export const KM_W = 1666.7;
export const KM_H = 1300;
export const KM_TO_PX = SVG_W / KM_W;          // ≈ 0.6
const NORTH_DY_PX = -40;
const SOUTH_DY_PX = +40;

export function kmToSvg(xKm: number, yKm: number, side: Side = "neutral") {
  const x = xKm * KM_TO_PX;
  const dy = side === "north" ? NORTH_DY_PX
           : side === "south" ? SOUTH_DY_PX : 0;
  const y = yKm * KM_TO_PX + dy;
  return { x, y };
}

// Tracks fly through the passage and should NOT take the side offset.
export function kmToSvgRaw(xKm: number, yKm: number) {
  return { x: xKm * KM_TO_PX, y: yKm * KM_TO_PX };
}
```

Sanity check: Northern Vanguard Base CSV `(198.3, 335)` → `(118.98, 200.97)` raw, then `+ (-40)` → final SVG y `≈ 161`. Original SVG triangle apex sits at `(119, 226)` *before* the group's `translate(0,-40)`, i.e. effective y `186`. The 25-px discrepancy is acceptable map-styling licence; the helper matches the *true* km coordinates from the CSV, which is what the sim engine needs. The original baked-in SVG markers will be **removed** in Phase 2 and replaced by data-driven `AssetLayer`.

---

## 6. Data model

```ts
// src/engine/types.ts
export type Side = "north" | "south" | "neutral";

export type ThreatClassId =
  | "FIGHTER_4GEN" | "FIGHTER_5GEN" | "BOMBER" | "HELI"
  | "CM_SUBSONIC" | "CM_SUPERSONIC"
  | "SRBM" | "MRBM" | "HGV" | "HCM"
  | "UAV_MALE_HALE" | "LOITERING_MUNITION" | "DRONE_SWARM"
  | "GLIDE_BOMB" | "ARM";

export type EffectorClassId =
  | "SAM_LR" | "SAM_MR" | "SAM_SR" | "VSHORAD"
  | "AAA_CRAM" | "FIGHTER_BVR" | "FIGHTER_WVR"
  | "EW_JAM" | "DEW_LASER" | "DEW_HPM" | "CUAS_DEDICATED";

export interface Asset {
  id: string;
  name: string;
  side: Side;
  type: "air_base" | "capital" | "major_city";
  context: "mainland" | "island";
  posKm: { x: number; y: number };
}

export interface Track {
  id: string;
  classId: ThreatClassId | "FRIEND" | "CIVIL";
  side: Side;
  posKm: { x: number; y: number };
  velocityKmPerMin: { vx: number; vy: number };
  altitudeM: number;
  detectedBySensors: string[];
  classification: "HOSTILE" | "SUSPECT" | "UNKNOWN" | "FRIEND" | "CIVIL";
  confidence: number;        // 0..1
  firstSeenT: number;
  threatScore?: number;
  assignedEngagementId?: string;
}

export interface FireUnit {
  id: string;
  baseAssetId: string;
  effectorClass: EffectorClassId;
  ammoReady: number;
  ammoReserve: number;
  reloadMin: number;
  status: "READY" | "ENGAGING" | "RELOADING" | "DAMAGED";
  rangeKm: number;
}

export interface Engagement {
  id: string;
  trackId: string;
  fireUnitId: string;
  state: "PROPOSED" | "AUTHORIZED" | "IN_FLIGHT" | "HIT" | "MISS";
  pkPredicted: number;
  costUsd: number;
  reasonText: string;
  proposedAtT: number;
}

export interface SimEvent {
  t: number;
  kind: string;
  payload: unknown;
}
```

This shape supports every idea in the catalog without modification.

---

## 7. Scenario format

```jsonc
// data/scenarios/01-saturation-raid.json
{
  "name": "Saturation raid from north",
  "durationMin": 30,
  "spawns": [
    { "t": 2,  "id": "T01", "class": "CM_SUBSONIC",
      "fromKm": [200, 320], "toKm": [1225, 1208],
      "speedMps": 250, "altitudeM": 50 },
    { "t": 3,  "id": "T02", "class": "DRONE_SWARM",
      "count": 12, "fromKm": [400, 350], "toKm": [600, 1100],
      "speedMps": 35, "altitudeM": 200 },
    { "t": 8,  "id": "T03", "class": "FIGHTER_4GEN",
      "fromKm": [838, 75], "toKm": [918, 835],
      "speedMps": 280, "altitudeM": 8000 }
  ],
  "events": [
    { "t": 5, "kind": "SENSOR_DEGRADED", "sensorId": "GIRAFFE-2" }
  ]
}
```

`tick.ts` runs every 200 ms (configurable), advances `simTimeMin`, propagates positions linearly, fires `SimEvent`s.

---

## 8. Build order

### Phase 1 — Shell (~1–2 h)
- Vite + TS + Tailwind set up. Dark theme by default.
- `BorealMap` renders the SVG verbatim, fits viewport, preserves aspect.
- Hover tooltip on existing markers (using their `data-name`).
- Three empty side panels + top bar with a mock clock.

**Done when:** `npm run dev` shows the map in the UI shell with hover tooltips.

### Phase 2 — Data-driven map (~1–2 h)
- Parse `data/boreal-passage.csv` into typed `Asset[]` at startup.
- Replace baked-in SVG markers with `AssetLayer` (same glyphs, but generated from data).
- Click asset → opens detail in a side panel. Highlight selected.
- Add unit test of `kmToSvg` against three known CSV rows.

**Done when:** all assets are clickable, the SVG no longer has hard-coded markers, and the CSV is the single source of truth.

### Phase 3 — Live tracks + scenario engine (~2–3 h)
- Zustand store with `assets`, `tracks`, `fireUnits`, `engagements`, `events`, `simTimeMin`, `playState`.
- Scenario loader reads JSON, populates the store, schedules spawns.
- `tick.ts` runs the sim, propagates track positions.
- `TrackLayer` renders moving symbols (NATO-ish: red diamond hostile, blue circle friend, yellow ? unknown). Trail shown for last N seconds.
- `TrackListPanel` shows the same data sorted by descending threat score (placeholder = time-to-impact for now).
- `TimelinePanel`: play / pause / 1× / 4× / scrub.

**Done when:** loading scenario 01 plays a saturation raid in the UI; tracks move; track list and map stay in sync; timeline can be paused and scrubbed.

### Phase 4 — Plug an idea in (deferred until idea picked)
- Add `engine/modules/<idea>.ts` that reads the store and writes proposed `Engagement`s and `Alert`s.
- Add the idea's bespoke panel.
- No other changes to phases 1–3 needed.

---

## 9. Acceptance criteria for the handoff (phases 1–3)

1. `npm install && npm run dev` starts the app on `http://localhost:5173`.
2. Map fills the center, panels surround it, top bar and timeline visible.
3. Every asset in the CSV is rendered from data (no baked-in markers in the SVG).
4. Hover any asset → tooltip with name, type, side. Click → detail panel.
5. Scenario `01-saturation-raid.json` loads on startup and plays automatically.
6. Tracks move smoothly (≥ 5 fps logical updates), red diamond hostiles head from north toward south assets.
7. Pause/play/4× scrub works.
8. Track list panel updates live and is sorted by descending threat priority (placeholder = inverse time-to-nearest-southern-asset).
9. No TypeScript errors. No console errors.
10. README in repo root explains how to run, where to add a new scenario, and where the idea-specific module hooks in.

---

## 10. Out of scope for now

- Real Link 16 / NFFI / STANAG bridges
- Real radar simulation (we just spawn tracks; sensors are implicit)
- Multi-operator collaboration
- Authentication / persistence
- Anything in Phase 4 (idea-specific logic)
