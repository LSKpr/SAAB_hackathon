import { describe, expect, it } from "vitest";
import { computeSuggestions } from "../engine/defense/suggestions";
import type { DefenseStation, Infrastructure, Threat } from "../engine/types";

const target: Infrastructure = {
  id: "firewatch",
  name: "Firewatch",
  type: "military_airport",
  size: "L",
  posKm: { x: 1398, y: 1072 },
  damageOnHitUsd: 250_000_000,
  state: "INTACT",
  damageTakenUsd: 0,
};

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

function threat(p: Partial<Threat>): Threat {
  return {
    id: "M-09",
    class: "CM_SUBSONIC",
    posKm: { x: 1390, y: 1070 },
    velocityKmPerMin: { vx: 0, vy: 1 },
    altitudeM: 80,
    speedMps: 240,
    classification: "HOSTILE",
    detectedAtT: 0,
    targetAssetId: "firewatch",
    threatUnitCostUsd: 1_000_000,
    threatLevel: 70,
    threatBand: "HIGH",
    etaMin: 1,
    state: "INBOUND",
    fromKm: { x: 1158, y: 385 },
    toKm: { x: 1398, y: 1072 },
    spawnedAtT: 0,
    ...p,
  };
}

describe("computeSuggestions ordering", () => {
  it("CM_SUBSONIC near a co-sited MR/LR: SAM_MR ranks #1 by ratio, SAM_LR #2; AAA omitted (cannot intercept this path)", () => {
    // Synthetic: MR/LR co-located near Firewatch so the same threat is in
    // both ranges; AAA is at Firewatch with its 8 km range.
    const stations = [
      station({
        id: "stn-firewatch-mr",
        name: "Firewatch MR",
        weapon: "SAM_MR",
        rangeKm: 60,
        costPerShotUsd: 1_000_000,
        posKm: { x: 1398, y: 1072 },
      }),
      station({
        id: "stn-firewatch-lr",
        name: "Firewatch LR",
        weapon: "SAM_LR",
        rangeKm: 150,
        costPerShotUsd: 4_000_000,
        magazineMax: 4,
        magazine: 4,
        reloadMin: 4,
        posKm: { x: 1398, y: 1072 },
      }),
      station({
        id: "stn-firewatch-aaa",
        name: "Firewatch AAA",
        weapon: "AAA",
        rangeKm: 8,
        costPerShotUsd: 5000,
        posKm: { x: 1410, y: 1072 },
        magazineMax: 200,
        magazine: 200,
        reloadMin: 0.05,
      }),
    ];
    // Threat ~30 km from Firewatch — inside SAM_MR (60), inside SAM_LR (150),
    // outside AAA (8 km).
    const t = threat({ posKm: { x: 1370, y: 1043 } });
    const suggestions = computeSuggestions([t], stations, [target], 0);
    expect(suggestions.length).toBe(2);
    const mr = suggestions.find((s) => s.weapon === "SAM_MR")!;
    const lr = suggestions.find((s) => s.weapon === "SAM_LR")!;
    expect(suggestions.find((s) => s.weapon === "AAA")).toBeUndefined();
    expect(mr.feasible).toBe(true);
    expect(lr.feasible).toBe(true);
    expect(mr.rank).toBe(1);
    expect(lr.rank).toBe(2);
    expect(mr.ratio).toBeLessThan(lr.ratio);
  });

  it("infeasible suggestions sink below feasible ones", () => {
    const stations = [
      station({
        id: "out",
        name: "out",
        weapon: "SAM_MR",
        rangeKm: 200,
        posKm: { x: 1398, y: 400 },
        state: "RELOADING",
        magazine: 0,
        costPerShotUsd: 1_000_000,
      }),
      station({
        id: "in",
        name: "in",
        weapon: "SAM_MR",
        rangeKm: 200,
        posKm: { x: 1398, y: 400 },
        state: "READY",
        magazine: 8,
        costPerShotUsd: 1_000_000,
      }),
    ];
    const t = threat({
      posKm: { x: 1398, y: 200 },
      velocityKmPerMin: { vx: 0, vy: 14.4 },
      toKm: { x: 1398, y: 1072 },
    });
    const suggestions = computeSuggestions([t], stations, [target], 0);
    expect(suggestions.length).toBe(2);
    expect(suggestions[0].feasible).toBe(true);
    expect(suggestions[1].feasible).toBe(false);
    expect(suggestions[0].stationId).toBe("in");
    expect(suggestions[1].stationId).toBe("out");
  });

  it("counterfactual is per-threat damage", () => {
    const t = threat({ class: "CM_SUBSONIC" });
    const sams = [
      station({
        weapon: "SAM_MR",
        rangeKm: 5000,
        posKm: { x: 0, y: 0 },
      }),
    ];
    const suggestions = computeSuggestions([t], sams, [target], 0);
    // CM_SUBSONIC damage mult is 1.0 → exact damageOnHitUsd.
    expect(suggestions[0].counterfactualUsd).toBe(target.damageOnHitUsd);
  });

  it("infeasible future-intercept suggestions sort by enterT ascending", () => {
    // Three stations all out of range, all weapon-effective vs CM_SUBSONIC.
    // Threat at (1398, 200) heading south to (1398, 1072) at 14.4 km/min.
    // Stations placed so they enter range at different sim-mins:
    //   far (300 km away) → enterT ≈ (300 - 60) / 14.4 ≈ 16.7 min
    //   mid (200 km away) → enterT ≈ (200 - 60) / 14.4 ≈ 9.7 min
    //   near (100 km away) → enterT ≈ (100 - 60) / 14.4 ≈ 2.8 min
    const stations = [
      station({
        id: "far-stn",
        name: "Far",
        weapon: "SAM_MR",
        rangeKm: 60,
        posKm: { x: 1398, y: 500 },
      }),
      station({
        id: "mid-stn",
        name: "Mid",
        weapon: "SAM_MR",
        rangeKm: 60,
        posKm: { x: 1398, y: 400 },
      }),
      station({
        id: "near-stn",
        name: "Near",
        weapon: "SAM_MR",
        rangeKm: 60,
        posKm: { x: 1398, y: 300 },
      }),
    ];
    const t = threat({
      posKm: { x: 1398, y: 200 },
      velocityKmPerMin: { vx: 0, vy: 14.4 },
      toKm: { x: 1398, y: 1072 },
    });
    const all = computeSuggestions([t], stations, [target], 0);
    // All three must be infeasible (all out of range).
    for (const s of all) expect(s.feasible).toBe(false);
    // Ordered by enterT ascending: near, mid, far.
    expect(all[0].stationName).toBe("Near");
    expect(all[1].stationName).toBe("Mid");
    expect(all[2].stationName).toBe("Far");
  });

  it("stations with basePk 0 vs threat class are omitted", () => {
    const meridia: Infrastructure = {
      id: "meridia",
      name: "Meridia",
      type: "capital",
      size: "XL",
      posKm: { x: 1225, y: 1208 },
      damageOnHitUsd: 500_000_000,
      state: "INTACT",
      damageTakenUsd: 0,
    };
    const stations = [
      station({
        id: "sr-useless",
        name: "SR vs SRBM",
        weapon: "SAM_SR",
        rangeKm: 200,
        posKm: { x: 1225, y: 1180 },
      }),
      station({
        id: "lr-ok",
        name: "LR vs SRBM",
        weapon: "SAM_LR",
        rangeKm: 150,
        posKm: { x: 1225, y: 1180 },
        costPerShotUsd: 4_000_000,
        magazineMax: 4,
        magazine: 4,
        reloadMin: 4,
      }),
    ];
    const t = threat({
      class: "SRBM",
      targetAssetId: "meridia",
      posKm: { x: 900, y: 1150 },
      velocityKmPerMin: { vx: 12, vy: 2 },
      toKm: { x: 1225, y: 1208 },
    });
    const suggestions = computeSuggestions([t], stations, [meridia], 0);
    expect(suggestions.every((s) => s.stationId !== "sr-useless")).toBe(true);
    expect(suggestions.some((s) => s.stationId === "lr-ok")).toBe(true);
  });

  it("north-side batteries do not suggest against north-launched tracks (no friendly IADS on own outbound)", () => {
    const northStn = station({
      id: "stn-boreal-lr",
      name: "Enemy LR",
      side: "north",
      weapon: "SAM_LR",
      rangeKm: 500,
      posKm: { x: 1158, y: 385 },
      costPerShotUsd: 4_000_000,
      magazineMax: 4,
      magazine: 4,
      reloadMin: 4,
    });
    const t = threat({
      launchSide: "north",
      posKm: { x: 1160, y: 400 },
      velocityKmPerMin: { vx: 0, vy: 14.4 },
    });
    expect(computeSuggestions([t], [northStn], [target], 0)).toEqual([]);
  });

  it("south defender still sees suggestions vs north-launched threat", () => {
    const southStn = station({
      id: "stn-fw",
      name: "Firewatch MR",
      side: "south",
      weapon: "SAM_MR",
      rangeKm: 200,
      posKm: { x: 1398, y: 1072 },
    });
    const t = threat({
      launchSide: "north",
      posKm: { x: 1398, y: 900 },
      velocityKmPerMin: { vx: 0, vy: 14.4 },
    });
    const all = computeSuggestions([t], [southStn], [target], 0);
    expect(all.length).toBe(1);
    expect(all[0].stationId).toBe("stn-fw");
  });

  it("noIntercept stations are omitted (only geometry-viable interceptors listed)", () => {
    const stations = [
      station({
        id: "off",
        name: "Off",
        weapon: "SAM_MR",
        rangeKm: 30,
        posKm: { x: 0, y: -500 },
      }),
      station({
        id: "on",
        name: "On",
        weapon: "SAM_MR",
        rangeKm: 60,
        posKm: { x: 1398, y: 500 },
      }),
    ];
    const t = threat({
      posKm: { x: 1398, y: 200 },
      velocityKmPerMin: { vx: 0, vy: 14.4 },
      toKm: { x: 1398, y: 1072 },
    });
    const all = computeSuggestions([t], stations, [target], 0);
    expect(all.length).toBe(1);
    expect(all[0].stationName).toBe("On");
    expect(all[0].intercept?.noIntercept).toBe(false);
  });
});
