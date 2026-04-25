import { describe, expect, it } from "vitest";
import { rollOutcome } from "../engine/defense/resolve";

describe("rollOutcome (seeded PRNG)", () => {
  it("is deterministic for the same key", () => {
    const a = rollOutcome("S1", 1.5, "M-09", "stn-firewatch-mr", 0.85);
    const b = rollOutcome("S1", 1.5, "M-09", "stn-firewatch-mr", 0.85);
    expect(a.roll).toBeCloseTo(b.roll, 12);
    expect(a.hit).toBe(b.hit);
  });

  it("differs across different threats", () => {
    const a = rollOutcome("S1", 1.5, "M-09", "stn-firewatch-mr", 0.85);
    const b = rollOutcome("S1", 1.5, "M-10", "stn-firewatch-mr", 0.85);
    expect(a.roll).not.toBe(b.roll);
  });

  it("differs across different stations", () => {
    const a = rollOutcome("S1", 1.5, "M-09", "stn-firewatch-mr", 0.85);
    const b = rollOutcome("S1", 1.5, "M-09", "stn-meridia-lr", 0.85);
    expect(a.roll).not.toBe(b.roll);
  });

  it("hit at pk=1.0, miss at pk=0.0", () => {
    const a = rollOutcome("S", 0, "T", "X", 1.0);
    const b = rollOutcome("S", 0, "T", "X", 0.0);
    expect(a.hit).toBe(true);
    expect(b.hit).toBe(false);
  });

  it("roll is in [0,1)", () => {
    const a = rollOutcome("S2", 4.5, "T2", "X2", 0.5);
    expect(a.roll).toBeGreaterThanOrEqual(0);
    expect(a.roll).toBeLessThan(1);
  });
});
