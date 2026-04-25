# Trajectory-aware Pre-arm UX

## Goal

Right now (after the previous patch) the operator can already pre-arm any station against any threat where the weapon class can in principle damage the threat. What's missing is **timing & feasibility information based on the threat's known straight-line trajectory toward its target**:

- *When* will the threat enter this station's range?
- *Will it ever* enter that range, or does the trajectory bypass the station entirely?
- *Will the threat reach its target before* entering range (so pre-arming is pointless)?

Because each threat has a deterministic aim point (`threat.targetAssetId` → `infrastructure.posKm`) and a constant velocity, this is a closed-form geometry problem. We compute it once per (threat, station) per tick and use it to:

1. **Disable Pre-arm** when there is provably no future intercept.
2. **Show "first shot in 2m13s"** on the button instead of just "out of range (212 > 60 km)".
3. **Sort infeasible suggestions** by soonest-engagement so the most actionable option floats up.
4. **Render an entry-point marker** on the map for queued/hovered engagements so the operator can spatially see "this station gets its first shot HERE."

## Current state (don't redo)

The basic pre-arm machinery is already implemented and tested:

- `PendingEngagement` type in `src/engine/types.ts`.
- Store: `pendingEngagements`, `queueEngagement`, `cancelQueuedEngagement` in `src/engine/store.ts`.
- Tick-loop auto-fire pass in `src/engine/defense/loop.ts` (between propagation and suggestion recompute). Reads PEs, fires once when feasible, drops the entry afterward; drops on weapon-class incompatibility (basePk == 0), threat finalization, or station destruction.
- `SuggestionCard` with three button states (`Engage` / `Pre-arm` / `Queued — Cancel`) and an amber tint when queued.
- `EngagementLayer` renders dashed amber line + halo per pending engagement.
- `ThreatCard` shows a `⏱ N` counter for queued engagements.
- 6 tests in `src/__tests__/defense.queue.test.ts`, all green.

This task **adds a layer on top of that**, it does not replace it.

## Geometric model

Threat at `P0 = threat.posKm` moves toward `A = target.posKm` (or `threat.toKm` if target is missing) with magnitude `v = |threat.velocityKmPerMin|`. Direction `D = (A - P0) / |A - P0|` (handle the degenerate `|A - P0| < ε` case).

For a station at `S` with range `R`, define `u = P0 - S`, `w = D * v`. The future position at offset `t ≥ 0` (sim-min into the future) is `P(t) = P0 + w * t`. Intercept condition `|P(t) - S| ≤ R` expands to:

```
|w|² · t² + 2 (u · w) · t + (|u|² - R²) ≤ 0
```

A quadratic in `t` with `A = |w|² = v²`, `B = 2 (u · w)`, `C = |u|² - R²`. Roots: `t = (-B ± √(B² - 4AC)) / (2A)`.

### Edge cases (must be handled explicitly)

| Situation                                        | Detection                                         | Result                                                     |
|--------------------------------------------------|---------------------------------------------------|------------------------------------------------------------|
| Stationary threat (`v < ε`)                      | `v < 1e-6`                                        | `noIntercept = (|P0 - S| > R)`; otherwise alreadyInRange   |
| Trajectory passes outside range entirely         | discriminant `< 0`                                | `noIntercept = true`                                       |
| Both roots `< 0` (already passed)                | larger root < 0                                   | `noIntercept = true`                                       |
| Smaller root `≤ 0`, larger `> 0`                 | currently in range                                | `alreadyInRange = true`, `enterT = simTimeMin`, `exitT = simTimeMin + larger` |
| Smaller root `> t_aim` where `t_aim = |A-P0|/v` | threat hits aim before entry                      | `hitsBeforeEntry = true`                                   |
| Larger root `> t_aim`                            | threat hits aim mid-engagement window             | clamp `exitT = simTimeMin + t_aim`                         |
| Otherwise                                         | normal future intercept                           | `enterT = simTimeMin + t_smaller`, `exitT = simTimeMin + clamp(t_larger, 0, t_aim)` |

## Phase 1 — `src/engine/defense/intercept.ts` (new)

```ts
import type { DefenseStation, Infrastructure, Threat } from "../types";

export interface InterceptWindow {
  enterT: number;
  exitT: number;
  enterPosKm: { x: number; y: number };
  exitPosKm: { x: number; y: number };
  alreadyInRange: boolean;
  noIntercept: boolean;
  hitsBeforeEntry: boolean;
}

export function computeInterceptWindow(
  threat: Threat,
  station: DefenseStation,
  target: Infrastructure | undefined,
  simTimeMin: number,
): InterceptWindow;
```

Pure function, O(1), no IO. Use `Math.hypot`, no external dependencies.

## Phase 2 — Plumb into suggestions

`src/engine/types.ts`: extend `DefenseSuggestion`:

```ts
export interface DefenseSuggestion {
  // ...existing fields...
  intercept?: InterceptWindow;
}
```

`src/engine/defense/suggestions.ts`:
- For every (threat, station) pair, call `computeInterceptWindow(threat, station, target, simTimeMin)` and store on the suggestion.
- **`computeSuggestions` must accept `simTimeMin`** as an additional argument (currently doesn't take it). Update the caller in `src/engine/defense/loop.ts`.
- Modify the sort: keep feasible-first; among infeasible suggestions, sort by `intercept.enterT` ascending. Suggestions with `noIntercept` or `hitsBeforeEntry` go to the bottom (after sorted future-intercept suggestions), still sorted by station name for stability.

## Phase 3 — SuggestionCard UX

Adjust button-state logic in `src/components/Panels/SuggestionCard.tsx`:

```
queueable = !sug.feasible
         && stationState !== "DESTROYED"
         && sug.pk > 0    // existing — but now superseded by basePk check below
         && (sug.intercept
             ? !sug.intercept.noIntercept && !sug.intercept.hitsBeforeEntry
             : true)
```

Note: the suggestion's `pk` field is range-attenuated and = 0 when out of range. Replace the `sug.pk > 0` check with a base-class effectiveness check using a small helper in `effectiveness.ts`. The auto-fire loop already does this with `basePk(weapon, threat.class)`. Mirror that here so `queueable` matches `loop.ts` semantics.

Display copy:

| State                                         | Sub-line                                         | Button     |
|-----------------------------------------------|--------------------------------------------------|------------|
| feasible                                      | (existing ratio + counterfactual)                | Engage     |
| isQueued                                      | "pre-armed — auto-fires when in range & ready"   | Queued — Cancel |
| infeasible, intercept future                  | "first shot in 2m17s @ 47 km from station"       | Pre-arm    |
| infeasible, alreadyInRange but ammo / reload  | "in range now — waiting on station"              | Pre-arm    |
| noIntercept                                   | "trajectory bypasses range"                      | (disabled) |
| hitsBeforeEntry                               | "threat impacts before entering range"           | (disabled) |
| basePk == 0                                   | "weapon ineffective vs {threat.class}"           | (disabled) |

Format helper: reuse the `fmtMin` function from `ThreatCard.tsx` (move into a shared `format.ts` if it ends up duplicated more than twice).

## Phase 4 — Map intercept markers

`src/components/Map/EngagementLayer.tsx`:

For every entry in `pendingEngagements`:
1. (Existing) Dashed amber line station → threat current position.
2. (Existing) Dashed amber halo around current threat position.
3. **(New)** If we can resolve the matching `DefenseSuggestion` and its `intercept` is a future window (`!alreadyInRange && !noIntercept && !hitsBeforeEntry`):
   - Render a small amber dot (`r=4`, fill `#f59e0b`, opacity 0.8) at `intercept.enterPosKm`.
   - Render a thin amber line from threat current position to entry point (different style: `strokeOpacity=0.35`, `strokeDasharray="2 6"`) so the operator sees the path until first-shot.
   - Tooltip / `<title>` element with text "first shot in 2m17s".

For hovered station (`hoveredStationId`) and hovered threat (selectedThreatId): preview entry markers for that station vs all active threats — purely additive layer, only renders when one is set.

## Phase 5 — Tests

### `src/__tests__/defense.intercept.test.ts` (new)

1. Threat heading directly at station: `enterT` correct; not alreadyInRange; `exitT > enterT`.
2. Threat inside range and moving outward: `alreadyInRange = true`, `enterT === simTimeMin`, `exitT > simTimeMin`.
3. Threat moving parallel to station with perpendicular distance > range: `noIntercept = true`.
4. Threat aim is between threat & station such that `t_smaller > t_aim`: `hitsBeforeEntry = true`.
5. Stationary threat in range: `alreadyInRange = true`, `enterT == exitT == simTimeMin`.
6. Stationary threat out of range: `noIntercept = true`.
7. Threat heading at station's edge (tangent): discriminant ≈ 0 → either `noIntercept` or zero-width window (acceptable: pick one and document).
8. Threat overshoots station: `enterT < t_aim < exitT` → `exitT` clamped to `simTimeMin + t_aim`.

### `src/__tests__/defense.suggestions.test.ts` (extend)

- New test: 3 infeasible suggestions with different `intercept.enterT` values are sorted ascending by `enterT`.
- New test: a `noIntercept` suggestion sorts after a future-intercept suggestion of the same threat.
- Existing tests still pass after adding the `simTimeMin` parameter to `computeSuggestions` (update call sites).

### `src/__tests__/defense.queue.test.ts` (extend)

- New test: a `PendingEngagement` whose station has `noIntercept` for the threat is dropped on the next tick (since basePk > 0 alone is no longer the only "drop forever" condition — actually, decision: should the loop ALSO drop on `noIntercept`?). See decision below.

### Decision: should the auto-fire loop drop on `noIntercept`?

**Yes.** It's a clear "this will never fire" signal. Add the check in `loop.ts` after the `basePk` check:

```ts
const target = infraById.get(threat.targetAssetId);
const win = computeInterceptWindow(threat, station, target, newT);
if (win.noIntercept || win.hitsBeforeEntry) continue; // drop forever
```

Caveat: the threat's velocity could in principle change later (it doesn't in the current physics, but be defensive). Since the propagation model is straight-line-toward-target, this is safe today. Add a comment noting the assumption.

## Phase 6 — Wire-up & polish

1. `SuggestionCard`: show "⏱ 2m17s" badge inline next to the rank badge for non-feasible suggestions with a future intercept.
2. `ThreatCard`: above the suggestion list, when there are pre-armed engagements, show "next: {station} fires in 2m17s" using the soonest queued window. Pull the data from the matching DefenseSuggestion already present in store.
3. Sub-line copy on disabled Pre-arm uses the table from Phase 3.
4. Tooltip on disabled Pre-arm button explains why (use `title` attribute).
5. Format helper `fmtMin` consolidated; existing duplicate in ThreatCard switched to use it.

## Acceptance criteria

1. Suggestions for far-away threats show **"first shot in {Xm Ys}"** rather than just "out of range".
2. Pre-arm button is **disabled** with a clear reason for `noIntercept` and `hitsBeforeEntry`.
3. Among infeasible suggestions for one threat, the soonest-firable one is at the top.
4. Queued engagements with `noIntercept` are dropped by the loop on the next tick (no perpetual zombie queue).
5. Map shows an amber entry-point marker for each pending engagement that has a future intercept window.
6. All previous tests pass; new tests in `defense.intercept.test.ts` (≥ 6 cases) green.
7. `npm run build` and `npm run test` both green.

## Files touched

- New: `src/engine/defense/intercept.ts`
- New: `src/__tests__/defense.intercept.test.ts`
- Modified: `src/engine/types.ts` — extend `DefenseSuggestion`, export `InterceptWindow`.
- Modified: `src/engine/defense/suggestions.ts` — compute intercept; resort; new `simTimeMin` arg.
- Modified: `src/engine/defense/loop.ts` — pass `simTimeMin` to `computeSuggestions`; drop pending engagements with `noIntercept`/`hitsBeforeEntry`.
- Modified: `src/components/Panels/SuggestionCard.tsx` — ETA badge, conditional Pre-arm button + sub-line copy.
- Modified: `src/components/Panels/ThreatCard.tsx` — "next fire" line; reuse shared `fmtMin`.
- Modified: `src/components/Map/EngagementLayer.tsx` — entry-point marker + path-to-entry segment.
- Modified: `src/__tests__/defense.suggestions.test.ts` — call-site fix + new sort tests.
- Modified: `src/__tests__/defense.queue.test.ts` — `noIntercept` drop test.

## Out of scope

- Don't change threat propagation physics.
- Don't change the seeded engagement-resolution PRNG keying.
- No LLM / AI integration.
- No new scenario JSON files.
- The intercept window does **not** need to account for station reload time or magazine state at the predicted entry time — keep it purely geometric. Reload/ammo gating happens live at fire time inside the loop.
