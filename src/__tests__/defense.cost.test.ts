import { describe, expect, it } from "vitest";
import {
  classDamageMult,
  counterfactual,
  ratio,
  threatUnitCostUsd,
  WEAPON_COSTS,
} from "../engine/defense/cost";
import type { Infrastructure, Threat } from "../engine/types";

function mkAsset(damageOnHitUsd: number): Infrastructure {
  return {
    id: "x",
    name: "x",
    type: "capital",
    size: "XL",
    posKm: { x: 0, y: 0 },
    damageOnHitUsd,
    state: "INTACT",
    damageTakenUsd: 0,
  };
}

function mkThreat(klass: Threat["class"]): Threat {
  return {
    id: "T",
    class: klass,
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
  };
}

describe("threat costs", () => {
  it("DRONE cheap, CM_SUPERSONIC expensive", () => {
    expect(threatUnitCostUsd("DRONE")).toBeLessThan(
      threatUnitCostUsd("CM_SUPERSONIC"),
    );
  });
  it("SRBM has 1.5× damage mult", () => {
    expect(classDamageMult("SRBM")).toBeCloseTo(1.5, 5);
  });
});

describe("counterfactual", () => {
  it("scales by class damage mult", () => {
    const a = mkAsset(100_000_000);
    expect(counterfactual(mkThreat("DRONE"), a)).toBe(100_000_000);
    expect(counterfactual(mkThreat("SRBM"), a)).toBe(150_000_000);
    expect(counterfactual(mkThreat("GLIDE_BOMB"), a)).toBe(80_000_000);
  });
});

describe("ratio", () => {
  it("$ per percentage of Pk", () => {
    expect(ratio({ costUsd: 1_000_000, pk: 0.85 })).toBeCloseTo(
      1_000_000 / 85,
      5,
    );
  });
  it("avoids divide-by-zero on pk=0", () => {
    expect(Number.isFinite(ratio({ costUsd: 4_000_000, pk: 0 }))).toBe(true);
  });
});

describe("weapon cost table", () => {
  it("matches plan §5.4", () => {
    expect(WEAPON_COSTS.SAM_LR.costPerShotUsd).toBe(4_000_000);
    expect(WEAPON_COSTS.AAA.costPerShotUsd).toBe(5_000);
    expect(WEAPON_COSTS.LASER.costPerShotUsd).toBe(100);
  });
});
