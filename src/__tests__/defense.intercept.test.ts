import { describe, expect, it } from "vitest";
import { computeInterceptWindow } from "../engine/defense/intercept";
import type { DefenseStation, Infrastructure, Threat } from "../engine/types";

function station(p: Partial<DefenseStation>): DefenseStation {
  return {
    id: "stn",
    name: "stn",
    posKm: { x: 0, y: 0 },
    weapon: "SAM_MR",
    rangeKm: 60,
    costPerShotUsd: 1_000_000,
    magazine: 8,
    magazineMax: 8,
    reloadMin: 2,
    state: "READY",
    emcon: "WHITE",
    ...p,
  };
}

function target(p: Partial<Infrastructure>): Infrastructure {
  return {
    id: "aim",
    name: "aim",
    type: "military_airport",
    size: "L",
    posKm: { x: 0, y: 0 },
    damageOnHitUsd: 100_000_000,
    state: "INTACT",
    damageTakenUsd: 0,
    ...p,
  };
}

function threat(p: Partial<Threat>): Threat {
  return {
    id: "T-1",
    class: "CM_SUBSONIC",
    posKm: { x: -100, y: 0 },
    velocityKmPerMin: { vx: 1, vy: 0 },
    altitudeM: 80,
    speedMps: 240,
    classification: "HOSTILE",
    detectedAtT: 0,
    targetAssetId: "aim",
    threatUnitCostUsd: 1_000_000,
    threatLevel: 70,
    threatBand: "HIGH",
    etaMin: 100,
    state: "INBOUND",
    fromKm: { x: -100, y: 0 },
    toKm: { x: 200, y: 0 },
    spawnedAtT: 0,
    ...p,
  };
}

describe("computeInterceptWindow", () => {
  it("threat heading directly at station: enterT correct; not alreadyInRange; exitT > enterT", () => {
    // Station at (0,0) R=60, threat at (-200,0) heading to aim (1000,0) at 1 km/min.
    // Range disc: x ∈ [-60, 60]. Enter at t=140, exit at t=260, tAim=1200.
    const t = threat({
      posKm: { x: -200, y: 0 },
      velocityKmPerMin: { vx: 1, vy: 0 },
      toKm: { x: 1000, y: 0 },
    });
    const s = station({ posKm: { x: 0, y: 0 }, rangeKm: 60 });
    const aim = target({ posKm: { x: 1000, y: 0 } });
    const w = computeInterceptWindow(t, s, aim, 0);
    expect(w.alreadyInRange).toBe(false);
    expect(w.noIntercept).toBe(false);
    expect(w.hitsBeforeEntry).toBe(false);
    expect(w.enterT).toBeCloseTo(140, 5);
    expect(w.exitT).toBeCloseTo(260, 5);
    expect(w.enterPosKm.x).toBeCloseTo(-60, 5);
    expect(w.enterPosKm.y).toBeCloseTo(0, 5);
    expect(w.exitT).toBeGreaterThan(w.enterT);
  });

  it("threat inside range and moving outward: alreadyInRange = true, enterT === simTimeMin", () => {
    // Station at (0,0) R=60. Threat currently at (10, 0) moving toward aim at (500, 0).
    // distToStation = 10 < 60 → already in range. Speed 2 km/min. Exit when x=60: t=25.
    const t = threat({
      posKm: { x: 10, y: 0 },
      velocityKmPerMin: { vx: 2, vy: 0 },
      toKm: { x: 500, y: 0 },
    });
    const s = station({ posKm: { x: 0, y: 0 }, rangeKm: 60 });
    const aim = target({ posKm: { x: 500, y: 0 } });
    const w = computeInterceptWindow(t, s, aim, 5);
    expect(w.alreadyInRange).toBe(true);
    expect(w.noIntercept).toBe(false);
    expect(w.hitsBeforeEntry).toBe(false);
    expect(w.enterT).toBe(5);
    expect(w.exitT).toBeCloseTo(5 + 25, 5);
    expect(w.exitT).toBeGreaterThan(w.enterT);
  });

  it("threat moving parallel to station with perpendicular distance > range: noIntercept", () => {
    // Station at (0,0) R=60. Threat at (-200, 100) heading to aim (200, 100).
    // Path runs along y=100, perpendicular distance 100 > 60.
    const t = threat({
      posKm: { x: -200, y: 100 },
      velocityKmPerMin: { vx: 1, vy: 0 },
      toKm: { x: 200, y: 100 },
    });
    const s = station({ posKm: { x: 0, y: 0 }, rangeKm: 60 });
    const aim = target({ posKm: { x: 200, y: 100 } });
    const w = computeInterceptWindow(t, s, aim, 0);
    expect(w.noIntercept).toBe(true);
    expect(w.alreadyInRange).toBe(false);
    expect(w.hitsBeforeEntry).toBe(false);
  });

  it("threat aim is between threat & station such that t_smaller > t_aim: hitsBeforeEntry", () => {
    // Station at (0,0) R=30. Threat at (-100, 0) aim at (-50, 0). Speed 1.
    // tAim = 50. To enter range needs to reach x=-30 → t=70 > tAim=50.
    const t = threat({
      posKm: { x: -100, y: 0 },
      velocityKmPerMin: { vx: 1, vy: 0 },
      toKm: { x: -50, y: 0 },
    });
    const s = station({ posKm: { x: 0, y: 0 }, rangeKm: 30 });
    const aim = target({ posKm: { x: -50, y: 0 } });
    const w = computeInterceptWindow(t, s, aim, 0);
    expect(w.hitsBeforeEntry).toBe(true);
    expect(w.noIntercept).toBe(false);
    expect(w.alreadyInRange).toBe(false);
  });

  it("stationary threat in range: alreadyInRange = true, enterT == exitT == simTimeMin", () => {
    const t = threat({
      posKm: { x: 10, y: 0 },
      velocityKmPerMin: { vx: 0, vy: 0 },
    });
    const s = station({ posKm: { x: 0, y: 0 }, rangeKm: 60 });
    const aim = target({ posKm: { x: 0, y: 0 } });
    const w = computeInterceptWindow(t, s, aim, 7);
    expect(w.alreadyInRange).toBe(true);
    expect(w.noIntercept).toBe(false);
    expect(w.enterT).toBe(7);
    expect(w.exitT).toBe(7);
  });

  it("stationary threat out of range: noIntercept", () => {
    const t = threat({
      posKm: { x: 200, y: 0 },
      velocityKmPerMin: { vx: 0, vy: 0 },
    });
    const s = station({ posKm: { x: 0, y: 0 }, rangeKm: 60 });
    const aim = target({ posKm: { x: 0, y: 0 } });
    const w = computeInterceptWindow(t, s, aim, 3);
    expect(w.noIntercept).toBe(true);
    expect(w.alreadyInRange).toBe(false);
  });

  it("threat heading at station's tangent edge: zero-width window or noIntercept", () => {
    // Station at (0, 0) R=50. Threat at (-200, 50) heading to (200, 50).
    // Path tangent to range circle: discriminant ≈ 0. Either zero-width
    // window (enterT == exitT, future intercept) or noIntercept; both
    // are acceptable per the plan.
    const t = threat({
      posKm: { x: -200, y: 50 },
      velocityKmPerMin: { vx: 1, vy: 0 },
      toKm: { x: 200, y: 50 },
    });
    const s = station({ posKm: { x: 0, y: 0 }, rangeKm: 50 });
    const aim = target({ posKm: { x: 200, y: 50 } });
    const w = computeInterceptWindow(t, s, aim, 0);
    if (!w.noIntercept) {
      expect(w.alreadyInRange).toBe(false);
      expect(w.hitsBeforeEntry).toBe(false);
      expect(w.exitT).toBeCloseTo(w.enterT, 3);
    }
  });

  it("threat hits target mid-engagement: exitT clamped to simTimeMin + t_aim", () => {
    // Station at (0,0) R=50. Threat at (-100, 0) aim at (20, 0). Speed 1.
    // Geometric enter t=50, exit t=150. tAim = 120. Expect exit clamped to 120.
    const t = threat({
      posKm: { x: -100, y: 0 },
      velocityKmPerMin: { vx: 1, vy: 0 },
      toKm: { x: 20, y: 0 },
    });
    const s = station({ posKm: { x: 0, y: 0 }, rangeKm: 50 });
    const aim = target({ posKm: { x: 20, y: 0 } });
    const w = computeInterceptWindow(t, s, aim, 0);
    expect(w.alreadyInRange).toBe(false);
    expect(w.noIntercept).toBe(false);
    expect(w.hitsBeforeEntry).toBe(false);
    expect(w.enterT).toBeCloseTo(50, 5);
    expect(w.exitT).toBeCloseTo(120, 5);
    expect(w.exitT).toBeLessThan(150);
  });
});
