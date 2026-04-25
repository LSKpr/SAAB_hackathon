import { describe, expect, it } from "vitest";
import { propagateMobilePatrolStations } from "../engine/defense/mobilePatrol";
import type { DefenseStation } from "../engine/types";

function capStation(): DefenseStation {
  return {
    id: "cap-1",
    name: "CAP 1",
    posKm: { x: 100, y: 0 },
    weapon: "FIGHTER_CAP",
    rangeKm: 40,
    costPerShotUsd: 1,
    magazine: 6,
    magazineMax: 6,
    reloadMin: 1,
    state: "READY",
    emcon: "WHITE",
    mobilePatrol: {
      centerKm: { x: 0, y: 0 },
      radiusKm: 100,
      omegaRadPerMin: 1,
      angleRad: 0,
    },
  };
}

describe("propagateMobilePatrolStations", () => {
  it("advances position on the orbit", () => {
    const stations: DefenseStation[] = [capStation()];
    propagateMobilePatrolStations(stations, 0.1);
    const s = stations[0]!;
    expect(s.posKm.x).toBeCloseTo(100 * Math.cos(0.1), 5);
    expect(s.posKm.y).toBeCloseTo(100 * Math.sin(0.1), 5);
    expect(s.mobilePatrol!.angleRad).toBeCloseTo(0.1, 5);
  });

  it("skips destroyed stations", () => {
    const stations: DefenseStation[] = [{ ...capStation(), state: "DESTROYED" }];
    const before = { ...stations[0]!.posKm };
    propagateMobilePatrolStations(stations, 1);
    expect(stations[0]!.posKm).toEqual(before);
  });
});
