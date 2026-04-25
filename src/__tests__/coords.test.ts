import { describe, expect, it } from "vitest";
import { kmToSvg, kmToSvgRaw, KM_TO_PX } from "../components/Map/coords";

/**
 * The CSV is the source of truth. We assert the helper produces the expected
 * SVG-space x,y for three known rows from `data/boreal-passage.csv`.
 *
 * Sanity from plan §5: Northern Vanguard Base (198.3, 335) maps to:
 *   raw x ≈ 118.98, raw y ≈ 200.97; with side="north" (-40 dy) → y ≈ 161.
 */
describe("kmToSvg", () => {
  const eps = 1e-3;

  it("maps Northern Vanguard Base correctly", () => {
    const r = kmToSvg(198.3, 335, "north");
    expect(r.x).toBeCloseTo(198.3 * KM_TO_PX, 4);
    expect(r.x).toBeCloseTo(118.98, 1);
    expect(r.y).toBeCloseTo(335 * KM_TO_PX - 40, 1);
    expect(r.y).toBeCloseTo(160.97, 1);
  });

  it("maps Meridia (Capital Y) correctly with south offset", () => {
    const r = kmToSvg(1225, 1208.3, "south");
    expect(r.x).toBeCloseTo(1225 * KM_TO_PX, eps);
    expect(r.y).toBeCloseTo(1208.3 * KM_TO_PX + 40, eps);
  });

  it("maps Highridge Command correctly", () => {
    const r = kmToSvg(838.3, 75, "north");
    expect(r.x).toBeCloseTo(838.3 * KM_TO_PX, eps);
    expect(r.y).toBeCloseTo(75 * KM_TO_PX - 40, eps);
  });

  it("kmToSvgRaw ignores side offset (used for tracks)", () => {
    const a = kmToSvgRaw(198.3, 335);
    expect(a.y).toBeCloseTo(335 * KM_TO_PX, eps);
  });
});
