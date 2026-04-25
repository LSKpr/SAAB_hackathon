import { describe, expect, it } from "vitest";
import {
  band,
  CLASS_HAZARD,
  importance,
  SIZE_MULT,
  threatLevel,
  TYPE_BASE_IMPORTANCE,
} from "../engine/defense/importance";
import type { Infrastructure, Threat } from "../engine/types";

function mkAsset(p: Partial<Infrastructure>): Infrastructure {
  return {
    id: "x",
    name: "x",
    type: "small_town",
    size: "M",
    posKm: { x: 0, y: 0 },
    damageOnHitUsd: 1,
    state: "INTACT",
    damageTakenUsd: 0,
    ...p,
  };
}

function mkThreat(p: Partial<Threat>): Threat {
  return {
    id: "T",
    class: "DRONE",
    posKm: { x: 0, y: 0 },
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
    fromKm: { x: 0, y: 0 },
    toKm: { x: 0, y: 0 },
    spawnedAtT: 0,
    ...p,
  };
}

describe("importance", () => {
  it("multiplies type base by size", () => {
    const a = mkAsset({ type: "capital", size: "XL" });
    expect(importance(a)).toBe(
      Math.round(TYPE_BASE_IMPORTANCE.capital * SIZE_MULT.XL),
    );
  });

  it("respects override", () => {
    const a = mkAsset({ type: "capital", size: "XL", importanceOverride: 7 });
    expect(importance(a)).toBe(7);
  });

  it("empty field is the lowest", () => {
    const a = mkAsset({ type: "empty_field", size: "S" });
    expect(importance(a)).toBeLessThan(5);
  });
});

describe("threatLevel & band", () => {
  it("clamps to 100", () => {
    const a = mkAsset({ type: "capital", size: "XL" });
    const t = mkThreat({ class: "SRBM" });
    expect(threatLevel(t, a)).toBe(100);
  });

  it("band tiers", () => {
    expect(band(85)).toBe("CRIT");
    expect(band(60)).toBe("HIGH");
    expect(band(40)).toBe("MED");
    expect(band(10)).toBe("LOW");
  });

  it("class hazard scales score", () => {
    const a = mkAsset({ type: "small_town", size: "M" });
    const drone = mkThreat({ class: "DRONE" });
    const cm = mkThreat({ class: "CM_SUBSONIC" });
    expect(threatLevel(drone, a)).toBeLessThan(threatLevel(cm, a));
    expect(CLASS_HAZARD.SRBM).toBeGreaterThan(CLASS_HAZARD.DRONE);
  });
});
