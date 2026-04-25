import { describe, expect, it } from "vitest";
import { expandContinuousStreams } from "../engine/scenarioContinuous";
import type { Infrastructure, Scenario } from "../engine/types";

const stubInfra: Infrastructure[] = [
  {
    id: "solano",
    name: "Solano",
    type: "small_town",
    size: "M",
    posKm: { x: 577, y: 1237 },
    damageOnHitUsd: 1,
    state: "INTACT",
    damageTakenUsd: 0,
  },
];

describe("expandContinuousStreams", () => {
  it("emits one entry per interval until end", () => {
    const s: Scenario = {
      name: "t",
      durationMin: 0.35,
      continuousStreams: [
        {
          everyMin: 0.1,
          idPrefix: "X",
          class: "DRONE",
          fromKm: [100, 200],
          toKm: [0, 0],
          targetAssetId: "solano",
          speedMps: 30,
          altitudeM: 100,
        },
      ],
    };
    const out = expandContinuousStreams(s, stubInfra);
    expect(out.length).toBeGreaterThanOrEqual(3);
    expect(out[0].spec.id).toBe("X-0");
    expect(out.every((e) => e.atTMin <= 0.35)).toBe(true);
  });

  it("sorts by time then id", () => {
    const s: Scenario = {
      name: "t",
      durationMin: 0.25,
      continuousStreams: [
        {
          everyMin: 0.1,
          idPrefix: "B",
          class: "DRONE",
          fromKm: [0, 0],
          toKm: [0, 0],
          targetAssetId: "solano",
          speedMps: 30,
          altitudeM: 100,
        },
        {
          everyMin: 0.1,
          idPrefix: "A",
          class: "DRONE",
          fromKm: [10, 10],
          toKm: [0, 0],
          targetAssetId: "solano",
          speedMps: 30,
          altitudeM: 100,
        },
      ],
    };
    const out = expandContinuousStreams(s, stubInfra);
    for (let i = 1; i < out.length; i++) {
      const prev = out[i - 1]!;
      const cur = out[i]!;
      expect(
        cur.atTMin > prev.atTMin ||
          (cur.atTMin === prev.atTMin && cur.spec.id >= prev.spec.id),
      ).toBe(true);
    }
  });

  it("respects burst", () => {
    const s: Scenario = {
      name: "t",
      durationMin: 0.2,
      continuousStreams: [
        {
          everyMin: 0.1,
          burst: 3,
          idPrefix: "Z",
          class: "DRONE",
          fromKm: [100, 200],
          toKm: [0, 0],
          targetAssetId: "solano",
          speedMps: 30,
          altitudeM: 100,
          lateralSpreadKm: 2,
        },
      ],
    };
    const out = expandContinuousStreams(s, stubInfra);
    const at0 = out.filter((e) => e.atTMin === 0);
    expect(at0.length).toBe(3);
    expect(new Set(at0.map((e) => e.spec.id)).size).toBe(3);
  });

  it("copies launchSide onto each expanded spawn spec", () => {
    const s: Scenario = {
      name: "t",
      durationMin: 0.15,
      continuousStreams: [
        {
          everyMin: 0.1,
          idPrefix: "L",
          class: "DRONE",
          fromKm: [100, 200],
          toKm: [0, 0],
          targetAssetId: "solano",
          speedMps: 30,
          altitudeM: 100,
          launchSide: "north",
        },
      ],
    };
    const out = expandContinuousStreams(s, stubInfra);
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out.every((e) => e.spec.launchSide === "north")).toBe(true);
  });
});
