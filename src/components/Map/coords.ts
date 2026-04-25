export type Side = "north" | "south" | "neutral";

export const SVG_W = 1000;
export const SVG_H = 780;
export const KM_W = 1666.7;
export const KM_H = 1300;
export const KM_TO_PX = SVG_W / KM_W; // ≈ 0.6
const NORTH_DY_PX = -40;
const SOUTH_DY_PX = +40;

export function kmToSvg(xKm: number, yKm: number, side: Side = "neutral") {
  const x = xKm * KM_TO_PX;
  const dy =
    side === "north" ? NORTH_DY_PX : side === "south" ? SOUTH_DY_PX : 0;
  const y = yKm * KM_TO_PX + dy;
  return { x, y };
}

// Tracks fly through the passage and should NOT take the side offset.
export function kmToSvgRaw(xKm: number, yKm: number) {
  return { x: xKm * KM_TO_PX, y: yKm * KM_TO_PX };
}
