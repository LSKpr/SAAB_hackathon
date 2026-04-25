# Defense Stations vs. Threats — Implementation Plan

> Pivot from the predictive-allocation idea. We are removing the AI / raid-template prediction layer. New product:
> a **static-defense-vs-threat decision system**. The map gets a population of civilian/military infrastructure with importance values; a fixed grid of **defense stations** with weapon types, ranges, costs, and effectiveness; and a right-side **threat + suggestions panel** that scores each incoming weapon and ranks the best countermeasure.
>
> Read order before coding:
> 1. [`implementation-plan.md`](implementation-plan.md) — the Phase 1–3 shell that stays.
> 2. **This file** — what we replace Phase 4 with.
> 3. The two earlier predictive plans (`predictive-allocation-plan.md`, `phase4-implementation-plan.md`) become **historical** — keep on disk for reference, all their *code* is deleted.

---

## 1. The new product, in one paragraph

The operator defends Country Y (south side of the Boreal Passage) with a small fixed network of pre-placed **defense stations**. Country X (north) launches multi-wave attacks: drones, cruise missiles, ballistic missiles, glide bombs. Each threat is heading for a specific piece of **infrastructure** with a known importance value. The right-side panel lists every active threat as a card (ID, type, speed, ETA, predicted target, threat level, damage-if-it-hits, threat unit cost). Below each threat the system enumerates **defense options** — which station can engage, with what weapon, at what range, with what % effectiveness, at what cost, and with what cost-effectiveness ratio. The operator clicks the option they like; the engagement resolves; the running cost-exchange ledger updates. Demo wow moment: side-by-side replay where a naive operator burns long-range SAMs on cheap drones and loses the airport, vs. the smart operator who uses cheap AAA on drones, holds SAM-MR for the cruise missile, and ends the wave with more money saved.

---

## 2. Locked decisions (defaults; tell me what to flip)

These are my picks for the 18 questions you skipped. Each is reversible, but locking now avoids analysis paralysis.

| # | Topic | Decision |
|---|-------|----------|
| 1 | **Infrastructure types** | `military_airport`, `civilian_airport`, `capital`, `major_city`, `small_town`, `power_plant`, `nuclear_plant`, `refinery`, `port`, `comms_tower`, `empty_field` (the last so threats can hit low-value tiles and the value contrast is obvious). |
| 2 | **Sides with infrastructure** | South only. North keeps its existing air bases (threat-spawn origins). |
| 3 | **Importance assignment** | Static weight per type × size multiplier, with optional hand-authored override per asset (`importanceOverride?: number`). |
| 4 | **Defense weapon types** | `SAM_LR`, `SAM_MR`, `SAM_SR`, `AAA`, `LASER`. Five is enough cost-exchange story; we can add `EW` later. |
| 5 | **Weapons per station** | One weapon type per station. Simpler suggestions, easier UI, identical to operational reality for a single battery. |
| 6 | **Effectiveness model** | Lookup table `Pk(weapon, threatClass)` × linear range falloff inside engagement radius (0 outside). No altitude/speed modifiers in v1. |
| 7 | **Ammo / cost** | Full: magazine + reload time + cost-per-shot. The cost line is the soul of the demo. |
| 8 | **Threat targeting** | Scripted per scenario (`targetAssetId` declared on each threat). Deterministic for jury reruns. |
| 9 | **Threat card fields** | ID, type, speed, ETA, predicted target name, threat-level number + band, damage-if-hits ($ + importance points), threat unit cost. Altitude shown in hover tooltip only. |
| 10 | **Suggestion fields** | Station + weapon, Pk %, cost-per-shot, ammo left, range check, $/% Pk ratio, counterfactual ("if ignored: $X damage"), rank chip (1st / 2nd / 3rd), an explicit "Do nothing" option at the bottom. |
| 11 | **Decision flow** | Operator clicks one suggestion → station fires → result resolves. Pure HITL. No auto-fire. |
| 12 | **Multi-station engagement** | Single shot per click. If it misses, operator can click a second option (manual layered defense). No automatic stacking. |
| 13 | **Station placement** | Pre-placed in scenario JSON. Static for v1. |
| 14 | **Scoring** | Score = `damagePrevented − defenderSpend`. No hard win/lose. After-action overlay shows both numbers + cost-exchange ratio + a list of damaged assets. |
| 15 | **Phase 4 cleanup** | Hard delete: predictive engine, raid templates, mock-ai-server, prediction panel, explain drawer, AI status badge, all `AI_` events. Keep Phase 1–3 shell + event log + scenario engine. Repurpose the **right column** for the new Threat + Suggestions panel. |
| 16 | **Time scale** | Real-time with manual pause and 1×/4×/8× scrub (already built). No auto-pause. |
| 17 | **Map visualization** | Infrastructure markers always visible. Defense stations always visible with their range rings drawn. Importance heatmap is a toggle in the top bar (off by default — keeps the map clean for the demo). |
| 18 | **Demo wow moment** | Side-by-side: the same scenario played by a naive operator (which we ghost-replay using a "always pick highest Pk" heuristic) vs. the smart operator (cost-aware human picks). Show two numbers: leakers and defender spend. |

If anything here is wrong, tell me which row to flip and I'll regenerate the plan.

---

## 3. What gets deleted (clean break from Phase 4)

The implementation agent **deletes** all of these. They're documented in `phase4-implementation-plan.md §3`.

```
src/engine/predictive/                       (entire folder)
src/components/Map/PredictedThreatLayer.tsx
src/components/Panels/PredictionPanel.tsx
src/components/Panels/ExplainDrawer.tsx
src/components/Panels/AiStatusBadge.tsx       (if it exists as a separate file)
tools/mock-ai-server/                         (entire folder)
tools/author-template.mjs
tools/template-specs/                         (entire folder)
data/raid-templates/                          (entire folder)
data/scenarios/04-east-sat-precision-demo.json
data/scenarios/05-west-decoy-cm-demo.json
data/scenarios/06-no-match-demo.json
.env.local.example                            (rewrite for v2 if needed)
```

In `src/engine/types.ts`: remove all Phase 4 types (`AxisId`, `RaidTemplate`, `RaidHypothesis`, `Recommendation`, `ReserveBudget`, `AiMode`, `AiStatus`, `PredictiveSlice`, plus any `AuditEntry` / `ScenarioFireUnit` fields that were predictive-only).

In `src/engine/store.ts`: remove the `predictive` slice, all AI-mode state, `runPredictiveAllocationSync`, ghost-replay logic that assumed predictive, after-action overlay (we'll rebuild a simpler one), `authorize/dismissRecommendation`.

In top bar: remove AI mode segmented control, AI status pill.

In `AlertsPanel.tsx`: revert to the Phase 1–3 baseline (event log of system events).
In `ResourcePanel.tsx`: remove `EARMK / AVAIL` columns; show ready/total/reload only.
In `EngagementPanel.tsx`: remove `aiRequestId` chip, remove "N reserved" header.

In `App.tsx`: remove auto-load of templates and `templateStats` persistence.

Keep package.json scripts: drop `mock-ai`, `author-template`. Keep `dev`, `build`, `test`, plus add `seed-infrastructure` (see §10).

`README.md`: rewrite the Phase 4 section to describe the new defense-stations product.

**Phase 1–3 acceptance criteria from `implementation-plan.md §9` MUST still pass after cleanup.** The shell is sacred.

---

## 4. New domain model

Add these to `src/engine/types.ts`. Field naming follows existing conventions (`posKm`, `simTimeMin`, etc.).

```ts
// =========================================================
// Infrastructure
// =========================================================
export type InfrastructureType =
  | "military_airport"
  | "civilian_airport"
  | "capital"
  | "major_city"
  | "small_town"
  | "power_plant"
  | "nuclear_plant"
  | "refinery"
  | "port"
  | "comms_tower"
  | "empty_field";

export interface Infrastructure {
  id: string;
  name: string;
  type: InfrastructureType;
  posKm: { x: number; y: number };
  /** Population/area class: "S" | "M" | "L" | "XL" — multiplies importance. */
  size: "S" | "M" | "L" | "XL";
  /** Damage in $ if a single typical threat hits. Used for counterfactual. */
  damageOnHitUsd: number;
  /** Authored override for unusual cases. Otherwise computed from type+size. */
  importanceOverride?: number;
  /** "alive" or "destroyed" (after taking enough damage). */
  state: "INTACT" | "DAMAGED" | "DESTROYED";
  /** Cumulative damage taken so far in $; threshold to "DESTROYED" is type-dependent. */
  damageTakenUsd: number;
}

// =========================================================
// Defense weapons & stations
// =========================================================
export type DefenseWeaponType =
  | "SAM_LR" | "SAM_MR" | "SAM_SR" | "AAA" | "LASER";

export interface DefenseStation {
  id: string;
  name: string;
  posKm: { x: number; y: number };
  weapon: DefenseWeaponType;
  rangeKm: number;
  /** Per-shot price in $. */
  costPerShotUsd: number;
  magazine: number;     // current rounds
  magazineMax: number;  // capacity
  reloadMin: number;    // sim minutes per round
  reloadingUntilT?: number;
  state: "READY" | "RELOADING" | "FIRING" | "DESTROYED";
  /** Cosmetic for the demo. */
  emcon: "WHITE" | "AMBER" | "RED";
}

// =========================================================
// Threats
// =========================================================
export type ThreatClass =
  | "DRONE" | "LOITERING_MUNITION"
  | "CM_SUBSONIC" | "CM_SUPERSONIC"
  | "SRBM" | "GLIDE_BOMB" | "FIGHTER_4GEN" | "BOMBER";

export interface Threat {
  id: string;                // "M-09"
  class: ThreatClass;
  posKm: { x: number; y: number };
  velocityKmPerMin: { vx: number; vy: number };
  altitudeM: number;
  speedMps: number;          // shown on the card; derived from velocity
  classification: "HOSTILE" | "SUSPECT" | "UNKNOWN";
  detectedAtT: number;
  /** Scenario-declared aim point; resolved to one Infrastructure id. */
  targetAssetId: string;
  /** Per-unit acquisition cost of the threat (what enemy "spent"). */
  threatUnitCostUsd: number;
  /** Computed at detection from importance(target) × class hazard. */
  threatLevel: number;       // 0..100
  threatBand: "LOW" | "MED" | "HIGH" | "CRIT";
  /** Live ETA to target in sim minutes; updated each tick. */
  etaMin: number;
  state: "INBOUND" | "ENGAGED" | "DESTROYED" | "HIT_TARGET" | "EXPIRED";
}

// =========================================================
// Engagements (operator-resolved)
// =========================================================
export interface Engagement {
  id: string;
  threatId: string;
  stationId: string;
  weapon: DefenseWeaponType;
  pkUsed: number;            // 0..1, the % shown to the operator
  costUsd: number;
  rolledOutcome: "HIT" | "MISS";
  resolvedAtT: number;
  /** What the suggestion told the operator at the moment of click. */
  decisionSnapshot: {
    rank: number;
    counterfactualUsd: number;
    rangeKm: number;
    suggestedAtT: number;
  };
}

// =========================================================
// Suggestions (per-threat, recomputed each tick)
// =========================================================
export interface DefenseSuggestion {
  id: string;                // "S-${threatId}-${stationId}"
  threatId: string;
  stationId: string;
  weapon: DefenseWeaponType;
  inRange: boolean;
  distanceKm: number;
  pk: number;                // 0..1, after range falloff
  costUsd: number;
  ammoLeft: number;
  ratio: number;             // costUsd / max(pk, 0.01); lower is better
  rank: number;              // 1 = best by ratio among in-range options
  counterfactualUsd: number; // expected damage if ignored
  feasible: boolean;         // false if out of range, or no ammo, or weapon NA vs class
  reasonText: string;        // short, e.g. "out of range" / "magazine empty"
}

// Plus a convenience pseudo-suggestion id "S-${threatId}-NOOP" representing
// "Do nothing". Always present; pk = 0; cost = 0; counterfactual = full damage.

// =========================================================
// Ledger (running cost-exchange)
// =========================================================
export interface Ledger {
  damagePreventedUsd: number;
  defenderSpendUsd: number;
  enemySpendUsd: number;
  damageTakenUsd: number;
  threatsDestroyed: number;
  threatsLeaked: number;
  assetsLost: { assetId: string; importance: number }[];
}
```

Add a new store slice:

```ts
export interface DefenseSlice {
  infrastructure: Infrastructure[];
  stations: DefenseStation[];
  threats: Threat[];
  engagements: Engagement[];
  suggestions: DefenseSuggestion[];   // recomputed every tick, per inbound threat
  ledger: Ledger;
  selectedThreatId?: string;
  showImportanceHeatmap: boolean;
}
```

---

## 5. Math (lock the formulas now)

### 5.1 Importance

```ts
const TYPE_BASE_IMPORTANCE: Record<InfrastructureType, number> = {
  military_airport: 100,
  capital:          100,
  nuclear_plant:     95,
  power_plant:       80,
  major_city:        80,
  refinery:          60,
  civilian_airport:  60,
  port:              50,
  comms_tower:       30,
  small_town:        25,
  empty_field:        2,
};
const SIZE_MULT = { S: 0.6, M: 1.0, L: 1.4, XL: 1.8 };

function importance(asset: Infrastructure): number {
  if (asset.importanceOverride !== undefined) return asset.importanceOverride;
  return Math.round(TYPE_BASE_IMPORTANCE[asset.type] * SIZE_MULT[asset.size]);
}
```

### 5.2 Threat-level → band

```ts
const CLASS_HAZARD: Record<ThreatClass, number> = {
  DRONE: 0.3, LOITERING_MUNITION: 0.4,
  CM_SUBSONIC: 0.7, CM_SUPERSONIC: 0.85,
  SRBM: 1.0, GLIDE_BOMB: 0.6,
  FIGHTER_4GEN: 0.5, BOMBER: 0.5,
};

function threatLevel(t: Threat, target: Infrastructure): number {
  const score = importance(target) * CLASS_HAZARD[t.class];
  return Math.min(100, Math.round(score));
}
function band(level: number): "LOW"|"MED"|"HIGH"|"CRIT" {
  if (level >= 80) return "CRIT";
  if (level >= 55) return "HIGH";
  if (level >= 30) return "MED";
  return "LOW";
}
```

### 5.3 Effectiveness lookup (full table; tweak in `data/effectiveness.json`)

```
Pk[weapon][threatClass]:

                 DRONE  LOIT  CM_SUB  CM_SUP  SRBM  GLIDE  FIG4  BOMB
SAM_LR           0.85   0.85  0.65    0.55    0.70  0.45   0.85  0.85
SAM_MR           0.80   0.80  0.85    0.65    0.10  0.40   0.85  0.70
SAM_SR           0.85   0.85  0.50    0.20    0.00  0.20   0.40  0.30
AAA              0.70   0.65  0.20    0.05    0.00  0.20   0.10  0.05
LASER            0.90   0.85  0.30    0.05    0.00  0.25   0.10  0.05
```

```ts
function rangeFalloff(distanceKm: number, rangeKm: number): number {
  if (distanceKm > rangeKm) return 0;
  if (distanceKm < rangeKm * 0.2) return 1.0;
  // linear from 1.0 at 20% range to 0.5 at full range
  const t = (distanceKm - rangeKm * 0.2) / (rangeKm * 0.8);
  return 1.0 - 0.5 * t;
}

function pk(station: DefenseStation, threat: Threat): number {
  const base = PK_TABLE[station.weapon][threat.class] ?? 0;
  const dist = distanceKm(station.posKm, threat.posKm);
  return base * rangeFalloff(dist, station.rangeKm);
}
```

### 5.4 Cost numbers (defaults; live in `data/cost-table.json`)

| Weapon | Cost / shot | Range km | Magazine | Reload (min/round) |
|---|---:|---:|---:|---:|
| SAM_LR | $4,000,000 | 150 | 4 | 4.0 |
| SAM_MR | $1,000,000 | 60  | 8 | 2.0 |
| SAM_SR | $200,000   | 25  | 12 | 1.0 |
| AAA    | $5,000     | 8   | 200 | 0.05 |
| LASER  | $100       | 15  | ∞ (cooldown) | 0.1 |

| Threat class | Unit cost | Damage on hit (if target type's `damageOnHitUsd`) |
|---|---:|---:|
| DRONE | $30,000 | uses target's value |
| LOITERING_MUNITION | $50,000 | × 1.0 |
| CM_SUBSONIC | $1,000,000 | × 1.0 |
| CM_SUPERSONIC | $4,000,000 | × 1.2 |
| SRBM | $3,000,000 | × 1.5 |
| GLIDE_BOMB | $50,000 | × 0.8 |
| FIGHTER_4GEN | n/a | × 1.0 |
| BOMBER | n/a | × 1.0 |

### 5.5 Counterfactual

```ts
function counterfactual(threat: Threat, target: Infrastructure): number {
  return target.damageOnHitUsd * CLASS_DAMAGE_MULT[threat.class];
}
```

This is the dollar amount shown in the suggestion card's "if ignored" line, and it's added to `ledger.damageTakenUsd` if the threat reaches its target.

### 5.6 Ratio for ranking

```ts
function ratio(suggestion: DefenseSuggestion): number {
  // $ per percentage point of Pk; lower is better.
  return suggestion.costUsd / Math.max(suggestion.pk * 100, 1);
}
```

Suggestions are sorted by `ratio` ascending (cheapest per % Pk first), among feasible ones. Infeasible options (out of range, no ammo, Pk = 0) sink to the bottom with their reason text shown.

---

## 6. UI changes

### 6.1 Right column — full rewrite

Replace the existing right column with a single **"THREATS & RESPONSE"** column:

```
┌─ THREATS & RESPONSE ────────────────────────────┐
│ ◉ M-09  CM_SUBSONIC                  CRIT  87  │
│   speed 880 km/h · alt 120 m · ETA 1m42s       │
│   →  Meridia (capital)                          │
│   damage if hits: $480M  · enemy spent: $1M     │
│ ┌──────────────────────────────────────────────┐│
│ │ #1  SAM_MR @ Spear Pt   Pk 0.85   $1.0M     ││
│ │     ratio $11.8k/%  ·  ammo 6/8  ·  in range││
│ │     Counterfactual if ignored: −$480M       ││
│ │     [Engage]                                 ││
│ │ #2  SAM_LR @ Meridia    Pk 0.55   $4.0M     ││
│ │     ratio $72.7k/%  ·  ammo 4/4  ·  in range││
│ │     [Engage]                                 ││
│ │ #3  AAA @ Solano        Pk 0.20   $0.005M   ││
│ │     out of range (38 km > 8 km)              ││
│ │ —  Do nothing                                ││
│ │     expected damage: $480M                   ││
│ └──────────────────────────────────────────────┘│
│                                                  │
│ ◯ M-10  DRONE_SWARM ×8               LOW   18  │
│   …                                              │
└──────────────────────────────────────────────────┘
```

- Threats sorted by `threatLevel` desc, with "in-flight" threats above "engaged".
- Click a threat → it becomes selected; the map highlights its target asset and draws a dashed line from threat → target.
- Each suggestion's `[Engage]` button is disabled if `feasible === false` and shows the `reasonText`.
- "Do nothing" is always present at the bottom and is not a button (just a reminder of the cost of inaction).

### 6.2 Left column — keep but trim

Keep `TrackListPanel` (now drawn from the `threats[]` slice instead of the old `tracks[]`) and `EngagementPanel` (now showing resolved engagements from the new `Engagement` type). Drop everything Phase-4-specific.

### 6.3 Top bar

Drop AI mode toggle. **Add:**
- Importance-heatmap toggle (`🌡️`).
- Live cost-exchange ledger: `Saved $X.XM · Spent $Y.YM · Net $Z.ZM`.
- Ghost-replay button (top-right): replays the active scenario with the "naive heuristic" operator and overlays the resulting ledger numbers.

### 6.4 Map layers (replace, don't extend, the predictive layer)

New layers, drawn in this z-order from bottom to top:

1. **`InfrastructureLayer.tsx`** — every `Infrastructure` rendered with a type-specific glyph (✈ military airport, 🏭 power plant, 🏙 city, etc. — use simple SVG shapes, not emoji). Color saturation ∝ `importance`. Damaged assets are darkened; destroyed assets are crossed out.
2. **`ImportanceHeatmapLayer.tsx`** — toggleable; renders a discretized 50×40 grid where each cell's alpha = max-importance-within-50 km. Off by default.
3. **`DefenseStationLayer.tsx`** — every station rendered as a triangle with the weapon symbol; the engagement range as a dashed circle; ammo meter as a tiny bar. Reloading stations drawn at 50% opacity.
4. **`ThreatLayer.tsx`** — every active threat as a red diamond moving along its trajectory; selected threat has a pulsing halo and a dashed line to its target asset.
5. **`EngagementLayer.tsx`** (rebuild from existing stub) — a brief animated streak from station → threat on engage, ending in a green checkmark (HIT) or red X (MISS).

### 6.5 Selected threat details on map

When a threat is selected:
- Highlight `targetAssetId` with a yellow ring + name label.
- Draw the threat's **flight path** (line from current pos to target, dashed).
- Draw **range arcs** for any station that *could* engage it, colored by Pk (green ≥ 0.7, amber 0.4–0.7, red < 0.4).

This is the "show the operator their options on the map" gesture. Hovering a suggestion card highlights only that station.

---

## 7. Scenarios

We ship **3 scenarios** in `data/scenarios/`:

### 7.1 `01-multi-wave.json` (the wow demo)

Mixed raid in three waves. Hand-tuned to make the cost-exchange story crisp.

```jsonc
{
  "name": "Multi-wave: drones, cruise missiles, ballistic strike",
  "durationMin": 12,
  "waves": [
    {
      "label": "Wave 1: drone saturation",
      "spawns": [
        // 8 cheap drones from Boreal Watch Post toward Solano (small town).
        // Naive operator burns SAM_MR/LR; smart operator uses AAA + LASER.
        { "t": 1.0, "id": "M-01", "class": "DRONE",
          "fromKm": [1158, 385], "toKm": [577, 1237], "speedMps": 35,
          "altitudeM": 250, "targetAssetId": "solano",
          "threatUnitCostUsd": 30000 },
        // ... seven more like it, t = 1.0 .. 1.5
      ]
    },
    {
      "label": "Wave 2: cruise missile salvo",
      "spawns": [
        // 3 subsonic CMs toward Firewatch Station (military airport).
        { "t": 4.5, "id": "M-09", "class": "CM_SUBSONIC",
          "fromKm": [1158, 385], "toKm": [1398, 1072], "speedMps": 240,
          "altitudeM": 80, "targetAssetId": "firewatch",
          "threatUnitCostUsd": 1000000 }
        // ... two more, t = 4.7, 4.9
      ]
    },
    {
      "label": "Wave 3: ballistic precision strike",
      "spawns": [
        // 1 SRBM toward Meridia (capital). Smart operator should still have
        // a SAM_LR shot left here.
        { "t": 8.5, "id": "M-13", "class": "SRBM",
          "fromKm": [1158, 385], "toKm": [1225, 1208], "speedMps": 1800,
          "altitudeM": 30000, "targetAssetId": "meridia",
          "threatUnitCostUsd": 3000000 }
      ]
    }
  ]
}
```

The scenario file ALSO declares the infrastructure and station layout for that match (or references a default one — see §10).

### 7.2 `02-single-srbm.json`

A single SRBM toward Meridia. Tutorial / sanity check. The only suggestion that has any Pk is the SAM_LR. Demonstrates the importance of having the right effector available.

### 7.3 `03-swarm-only.json`

Pure 30-drone swarm against Solano. Demonstrates AAA/LASER cost dominance against drones; if the operator burns SAM-MR, the ledger goes deep red.

---

## 8. Default infrastructure & station layout

Authored once, lives in `data/world.json`, loaded by default unless the active scenario provides its own. Coordinates are CSV km space.

### 8.1 Infrastructure (south side)

```jsonc
[
  { "id": "meridia",            "type": "capital",          "size": "XL", "posKm": [1225, 1208], "damageOnHitUsd": 500000000 },
  { "id": "callhaven",          "type": "major_city",        "size": "L",  "posKm": [97, 1150],   "damageOnHitUsd": 200000000 },
  { "id": "solano",             "type": "small_town",        "size": "M",  "posKm": [577, 1237],  "damageOnHitUsd": 8000000 },

  { "id": "firewatch",          "type": "military_airport",  "size": "L",  "posKm": [1398, 1072], "damageOnHitUsd": 250000000 },
  { "id": "southern-redoubt",   "type": "military_airport",  "size": "M",  "posKm": [322, 1238],  "damageOnHitUsd": 180000000 },
  { "id": "spear-point",        "type": "military_airport",  "size": "M",  "posKm": [918, 835],   "damageOnHitUsd": 180000000 },

  { "id": "haldfeld-civ",       "type": "civilian_airport",  "size": "M",  "posKm": [800, 1200],  "damageOnHitUsd": 80000000 },

  { "id": "torsby-power",       "type": "power_plant",       "size": "M",  "posKm": [950, 1180],  "damageOnHitUsd": 220000000 },
  { "id": "elnova-nuclear",     "type": "nuclear_plant",     "size": "L",  "posKm": [1080, 1130], "damageOnHitUsd": 600000000 },

  { "id": "havsala-refinery",   "type": "refinery",          "size": "M",  "posKm": [200, 1100],  "damageOnHitUsd": 90000000 },
  { "id": "valport",            "type": "port",              "size": "L",  "posKm": [1500, 1100], "damageOnHitUsd": 70000000 },

  { "id": "comms-tower-mid",    "type": "comms_tower",       "size": "S",  "posKm": [700, 1050],  "damageOnHitUsd": 5000000 },

  // explicit empty field, used when a stray drone misses everything
  { "id": "field-east",         "type": "empty_field",       "size": "S",  "posKm": [1300, 950],  "damageOnHitUsd": 50000 }
]
```

### 8.2 Defense stations (south side, fixed)

```jsonc
[
  { "id": "stn-meridia-lr",      "weapon": "SAM_LR", "posKm": [1225, 1180], "rangeKm": 150, "magazineMax": 4,  "magazine": 4,  "reloadMin": 4,    "costPerShotUsd": 4000000 },
  { "id": "stn-spearpoint-lr",   "weapon": "SAM_LR", "posKm": [918, 835],   "rangeKm": 150, "magazineMax": 4,  "magazine": 4,  "reloadMin": 4,    "costPerShotUsd": 4000000 },

  { "id": "stn-firewatch-mr",    "weapon": "SAM_MR", "posKm": [1398, 1072], "rangeKm": 60,  "magazineMax": 8,  "magazine": 8,  "reloadMin": 2,    "costPerShotUsd": 1000000 },
  { "id": "stn-callhaven-mr",    "weapon": "SAM_MR", "posKm": [97, 1150],   "rangeKm": 60,  "magazineMax": 8,  "magazine": 8,  "reloadMin": 2,    "costPerShotUsd": 1000000 },
  { "id": "stn-redoubt-mr",      "weapon": "SAM_MR", "posKm": [322, 1238],  "rangeKm": 60,  "magazineMax": 8,  "magazine": 8,  "reloadMin": 2,    "costPerShotUsd": 1000000 },

  { "id": "stn-meridia-sr",      "weapon": "SAM_SR", "posKm": [1235, 1198], "rangeKm": 25,  "magazineMax": 12, "magazine": 12, "reloadMin": 1,    "costPerShotUsd": 200000 },
  { "id": "stn-elnova-sr",       "weapon": "SAM_SR", "posKm": [1080, 1130], "rangeKm": 25,  "magazineMax": 12, "magazine": 12, "reloadMin": 1,    "costPerShotUsd": 200000 },

  { "id": "stn-solano-aaa",      "weapon": "AAA",    "posKm": [577, 1237],  "rangeKm": 8,   "magazineMax": 200,"magazine": 200,"reloadMin": 0.05, "costPerShotUsd": 5000 },
  { "id": "stn-firewatch-aaa",   "weapon": "AAA",    "posKm": [1410, 1072], "rangeKm": 8,   "magazineMax": 200,"magazine": 200,"reloadMin": 0.05, "costPerShotUsd": 5000 },

  { "id": "stn-meridia-laser",   "weapon": "LASER",  "posKm": [1215, 1198], "rangeKm": 15,  "magazineMax": 9999,"magazine": 9999,"reloadMin": 0.1,"costPerShotUsd": 100 },
  { "id": "stn-spearpoint-laser","weapon": "LASER",  "posKm": [925, 835],   "rangeKm": 15,  "magazineMax": 9999,"magazine": 9999,"reloadMin": 0.1,"costPerShotUsd": 100 }
]
```

This layout is intentional: SAM_LR can reach almost everywhere; SAM_MR is sector-local; SR/AAA/LASER are point-defense around the highest-value asset clusters. Solano is intentionally only covered by AAA — drones aimed at Solano are AAA's perfect job.

---

## 9. Files to add / modify (delta on the cleaned shell)

**New files:**
```
src/engine/defense/
  types.ts                     (re-exports from engine/types.ts; convenience)
  importance.ts                (importance, threatLevel, band)
  effectiveness.ts             (PK_TABLE, rangeFalloff, pk)
  cost.ts                      (cost tables, counterfactual, ratio)
  suggestions.ts               (computeSuggestions(threat, stations) → DefenseSuggestion[])
  resolve.ts                   (resolveEngagement, applyDamage, updateLedger)
  loop.ts                      (runDefenseTick: spawn, propagate, recompute suggestions, expire)
  naive.ts                     (the "naive operator" heuristic for ghost replay)

src/components/Map/
  InfrastructureLayer.tsx
  ImportanceHeatmapLayer.tsx
  DefenseStationLayer.tsx
  ThreatLayer.tsx              (replaces / consolidates the old TrackLayer once Phase-4 is gone)
  EngagementLayer.tsx          (full implementation; replaces stub)

src/components/Panels/
  ThreatsPanel.tsx             (the new right-column panel)
  ThreatCard.tsx
  SuggestionCard.tsx
  AfterActionPanel.tsx         (modal at end of scenario / ghost replay)

data/
  world.json                   (default infrastructure + stations)
  effectiveness.json           (PK_TABLE)
  cost-table.json              (cost-per-shot + threat unit costs)
  scenarios/
    01-multi-wave.json
    02-single-srbm.json
    03-swarm-only.json

tools/
  seed-infrastructure.mjs      (one-shot CLI to regenerate world.json from a sparse spec)
```

**Modified files:**
```
src/engine/types.ts            (add §4 types; remove all Phase 4 types per §3)
src/engine/store.ts            (add DefenseSlice; remove predictive slice; add ledger and suggestions selectors)
src/engine/tick.ts             (call runDefenseTick instead of runPredictiveAllocation)
src/engine/scenario.ts         (extend the scenario loader to load world.json on top, support `waves`)
src/components/Map/BorealMap.tsx  (mount the new layers; drop predictive layers)
src/components/Panels/TopBar.tsx  (heatmap toggle, ledger readout, ghost-replay button)
src/components/Panels/AlertsPanel.tsx (revert to plain event log)
src/components/Panels/ResourcePanel.tsx (revert to plain resource readout, but show defense stations now)
src/components/Panels/EngagementPanel.tsx (consume new Engagement shape)
src/App.tsx                    (load world.json + active scenario; mount ThreatsPanel in right column)
```

---

## 10. Build phases

Designed for one implementation agent, ~16–20 hours, on top of the cleaned Phase 1–3 shell.

### Phase A — Cleanup of Phase 4 (≈ 2 h)

1. Hard-delete every file in §3.
2. Strip Phase 4 types/slice/UI from the modified files in §3.
3. Run `npm run build` and `npm run test`. Phase 1–3 acceptance criteria from `implementation-plan.md §9` MUST still pass. Phase 1–3 scenario `01-saturation-raid.json` should still play (renamed if you want; keep it as a regression check).

**Stop condition:** Clean shell, zero Phase 4 references in the codebase, `grep -r "predictive\|raidTemplate\|aiMode" src/` returns nothing.

### Phase B — World, infrastructure, defense stations (≈ 4–5 h)

1. Add §4 types to `engine/types.ts`.
2. Build `engine/defense/importance.ts`, `effectiveness.ts`, `cost.ts` with unit tests.
3. Author `data/world.json`, `data/effectiveness.json`, `data/cost-table.json`.
4. Add the `DefenseSlice` to the store; selectors for stations, infrastructure, ledger.
5. Implement `InfrastructureLayer`, `DefenseStationLayer` (with range rings), `ImportanceHeatmapLayer` (toggle) on the map.
6. Top-bar heatmap toggle.

**Stop condition:** load app → see all infrastructure markers + defense stations + range rings; toggle the heatmap on/off. No threats yet.

### Phase C — Threats, scenario engine, suggestions, panel (≈ 5–6 h)

1. Add `Threat` to scenario loader (`engine/scenario.ts`); support the wave shape from §7.
2. `engine/defense/loop.ts` — spawns threats, propagates positions, computes ETA and threat level, expires on impact.
3. `engine/defense/suggestions.ts` — for each `INBOUND` threat, compute one `DefenseSuggestion` per station (in-range or not); sort by ratio; assign rank.
4. `ThreatsPanel.tsx` + `ThreatCard.tsx` + `SuggestionCard.tsx`.
5. `ThreatLayer.tsx` on the map; selected-threat highlighting + dashed line to target.

**Stop condition:** load scenario `01-multi-wave.json` → threats spawn and move; right-side panel populates with threat cards and ranked suggestion cards (no engagement yet).

### Phase D — Engagement resolution, ledger, after-action (≈ 4–5 h)

1. `engine/defense/resolve.ts` — operator clicks `[Engage]` → roll outcome (`Math.random() < pk`); update station magazine; update threat state; update ledger.
2. `EngagementLayer.tsx` — the streak animation HIT/MISS.
3. Damage application: if a threat reaches its target (`HIT_TARGET`), add `counterfactual(t, target)` to `ledger.damageTakenUsd`, mark target `DAMAGED`/`DESTROYED` based on cumulative damage.
4. `AfterActionPanel.tsx` modal — appears at scenario end with: threats destroyed, threats leaked, defender spend, damage taken, damage prevented, cost-exchange ratio, list of damaged assets.
5. Live ledger in the top bar.

**Stop condition:** play scenario `01-multi-wave.json` end-to-end; click suggestions; engagements resolve; cost-exchange ledger ticks; after-action modal renders with credible numbers.

### Phase E — Ghost replay + polish (≈ 2–3 h)

1. `engine/defense/naive.ts` — naive operator heuristic: for every threat the moment it goes `INBOUND`, pick the **highest-Pk** in-range option (no cost awareness). Records a ledger.
2. Top-bar **Ghost Replay** button: re-runs the active scenario silently with the naive operator, then opens an after-action overlay showing **two columns**: Naive operator vs. You. Net cost-exchange diff in big type.
3. Determinism: fix `Math.random` to a seeded PRNG keyed on `(scenarioId, simTimeMin, threatId, stationId)`. Both runs of the same scenario must yield identical numbers.
4. Anti-fortune-teller copy review: no "WILL"; always show probability; always show counterfactual.
5. Author scenarios `02-single-srbm.json` and `03-swarm-only.json`.
6. Update `README.md` to describe the product, scenarios, and cost tables.

**Stop condition:** the side-by-side wow moment plays; numbers are deterministic across runs.

### Stretch (only after E is green)

- Multi-station layered defense (operator can fire a second shot at a still-`INBOUND` threat); cumulative Pk shown in suggestion card.
- Per-asset damage state on the map (intact / damaged / destroyed glyph).
- Save/share the ledger as JSON for post-demo analysis.

---

## 11. Acceptance criteria (final handoff)

The implementation agent must verify:

1. ✅ All Phase 1–3 acceptance criteria from `implementation-plan.md §9` still pass.
2. ✅ `grep -r "predictive\|raidTemplate\|aiMode\|mock-ai-server" src/ tools/ data/` returns zero matches outside `research/`.
3. ✅ Loading the app shows infrastructure markers, defense stations with range rings, a clean top bar with the heatmap toggle and the live ledger.
4. ✅ Heatmap toggle visibly shades the south side, with brightest cells around Meridia / Elnova nuclear plant / Firewatch.
5. ✅ Scenario `01-multi-wave.json` plays end-to-end; right-side panel updates each tick; clicking `[Engage]` resolves the engagement; map shows the streak; ledger ticks.
6. ✅ For threat M-09 (the CM toward Firewatch in scenario 01), at the moment of detection: the suggestion ranking puts SAM_MR @ Firewatch as #1 by `$/% Pk`, SAM_LR as #2, AAA as infeasible (out of range or low Pk).
7. ✅ Selecting a threat highlights its target asset on the map and draws a dashed line + range arcs colored by Pk.
8. ✅ "Do nothing" is always the bottom suggestion with its expected damage in $.
9. ✅ Ghost-replay button produces an after-action overlay where naive-vs-smart numbers differ (smart < spend, smart ≥ damage prevented, lower net for smart).
10. ✅ Determinism: pressing ghost-replay twice yields identical numbers.
11. ✅ `npm run build` and `npm run test` are green; no TypeScript errors; no console errors at runtime.
12. ✅ `README.md` documents the product, scenarios, and how to tweak cost / Pk tables.

---

## 12. Out of scope (v1)

- Operator-placeable stations (we accept fixed placement).
- Multi-station auto-stacking (operator can manually stack).
- EW / soft-kill weapons.
- Weather effects on Pk.
- Cascading infrastructure damage (if power plant dies, cities don't lose value).
- Networked / multi-operator C2.
- Real Link 16 / NFFI.
- Anything LLM- or AI-driven. We are explicitly removing all of that from Phase 4.

---

## 13. Open questions (answer now or accept defaults)

1. **Currency and units.** Defaults: $ for cost, abstract "importance points" 0–100 for value, "$" damage on hit. OK?
2. **Numbers calibration.** The cost / Pk tables in §5 are real-world-plausible but tuned for visible cost-exchange storytelling. Can I keep them as-is, or do you want different numbers (e.g. a more dramatic SAM_LR / drone gap)?
3. **Decision for the demo wow:** I've assumed the side-by-side ghost replay is the wow. Is that fine, or should the demo focus instead on a single scripted "save-the-capital" moment?
4. **Damaged-asset visuals.** Do destroyed assets disappear from the map, get crossed out, or stay with a red border? (My default: red border + crossed-out + lower opacity.)
5. **Naive operator definition.** I'm using "always pick highest-Pk in-range option, ignore cost". Acceptable, or do you want a different anti-strategy (e.g. "always engage the closest threat first")?

If you don't answer, the implementation agent uses the defaults listed above.
