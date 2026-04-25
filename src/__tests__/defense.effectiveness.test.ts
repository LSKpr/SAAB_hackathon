import { describe, expect, it } from "vitest";
import {
  PK_TABLE,
  basePk,
  distanceKm,
  pk,
  rangeFalloff,
} from "../engine/defense/effectiveness";
import type { DefenseStation, Threat } from "../engine/types";

describe("rangeFalloff", () => {
  it("is 0 outside range", () => {
    expect(rangeFalloff(101, 100)).toBe(0);
  });
  it("is 1 inside the inner 20%", () => {
    expect(rangeFalloff(0, 100)).toBe(1);
    expect(rangeFalloff(15, 100)).toBe(1);
  });
  it("is 1 at exactly 20%", () => {
    expect(rangeFalloff(20, 100)).toBeCloseTo(1, 5);
  });
  it("is 0.5 at full range", () => {
    expect(rangeFalloff(100, 100)).toBeCloseTo(0.5, 5);
  });
  it("midpoint of falloff is 0.75", () => {
    expect(rangeFalloff(60, 100)).toBeCloseTo(0.75, 5);
  });
  it("range zero gives zero", () => {
    expect(rangeFalloff(0, 0)).toBe(0);
  });
});

describe("PK table", () => {
  it("SAM_LR vs SRBM > AAA vs SRBM", () => {
    expect(PK_TABLE.SAM_LR.SRBM).toBeGreaterThan(PK_TABLE.AAA.SRBM);
  });
  it("LASER vs DRONE is best", () => {
    expect(PK_TABLE.LASER.DRONE).toBeGreaterThanOrEqual(PK_TABLE.AAA.DRONE);
  });
  it("basePk lookup matches", () => {
    expect(basePk("SAM_MR", "CM_SUBSONIC")).toBe(0.85);
  });
});

describe("pk(station, threat)", () => {
  const station: DefenseStation = {
    id: "s1",
    name: "s1",
    posKm: { x: 0, y: 0 },
    weapon: "SAM_MR",
    rangeKm: 60,
    costPerShotUsd: 1_000_000,
    magazine: 8,
    magazineMax: 8,
    reloadMin: 2,
    state: "READY",
    emcon: "WHITE",
  };
  const threat = (x: number): Threat => ({
    id: "T",
    class: "CM_SUBSONIC",
    posKm: { x, y: 0 },
    velocityKmPerMin: { vx: 0, vy: 0 },
    altitudeM: 0,
    speedMps: 0,
    classification: "HOSTILE",
    detectedAtT: 0,
    targetAssetId: "x",
    threatUnitCostUsd: 0,
    threatLevel: 0,
    threatBand: "LOW",
    etaMin: 0,
    state: "INBOUND",
    fromKm: { x, y: 0 },
    toKm: { x: 0, y: 0 },
    spawnedAtT: 0,
  });
  it("zero outside range", () => {
    expect(pk(station, threat(70))).toBe(0);
  });
  it("base * 1.0 well inside", () => {
    expect(pk(station, threat(5))).toBeCloseTo(0.85, 5);
  });
  it("half base at full range", () => {
    expect(pk(station, threat(60))).toBeCloseTo(0.85 * 0.5, 5);
  });
});

describe("distanceKm", () => {
  it("basic pythag", () => {
    expect(distanceKm({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
