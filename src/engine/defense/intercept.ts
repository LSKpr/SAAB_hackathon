import type { DefenseStation, Infrastructure, Threat } from "../types";

/**
 * Geometric intercept window between a threat (moving in a straight line
 * toward its aim point) and a defense station's circular engagement zone.
 *
 * All times are absolute sim minutes. Positions are in km, world frame.
 *
 * Semantics:
 *  - `noIntercept` — the threat's straight-line path never crosses the
 *    station's range disc *in the future*; pre-arming is pointless.
 *  - `hitsBeforeEntry` — the path does eventually enter the range disc, but
 *    the threat reaches its aim point first, so it never actually arrives.
 *  - `alreadyInRange` — the threat is *currently* inside the disc; `enterT`
 *    is `simTimeMin`.
 *  - `enterPosKm` / `exitPosKm` — the geometric entry/exit points on the
 *    range circle (or current position when alreadyInRange).
 *
 * The engagement window does NOT account for station readiness (reload,
 * ammo) or weapon-class effectiveness — those are gated live by the loop.
 */
export interface InterceptWindow {
  enterT: number;
  exitT: number;
  enterPosKm: { x: number; y: number };
  exitPosKm: { x: number; y: number };
  alreadyInRange: boolean;
  noIntercept: boolean;
  hitsBeforeEntry: boolean;
}

const EPS = 1e-6;

/**
 * Pure, O(1). Solves |P0 + D·v·t − S|² ≤ R² for t ≥ 0, clamped to
 * t ≤ t_aim = |aim − P0| / v so the window stops the moment the threat
 * reaches its aim point.
 *
 * IMPORTANT: the propagation in `loop.ts` re-aims toward `target.posKm`
 * each tick using the *magnitude* of `velocityKmPerMin`, so the actual
 * direction can drift if velocity isn't already aligned with aim. We
 * mirror that here by deriving direction from `aim − P0` (rather than
 * trusting the velocity vector's direction) — this keeps the predicted
 * entry point consistent with where the threat will actually arrive.
 */
export function computeInterceptWindow(
  threat: Threat,
  station: DefenseStation,
  target: Infrastructure | undefined,
  simTimeMin: number,
): InterceptWindow {
  const P0 = threat.posKm;
  const aim = target?.posKm ?? threat.toKm;
  const S = station.posKm;
  const R = station.rangeKm;

  const speed = Math.hypot(threat.velocityKmPerMin.vx, threat.velocityKmPerMin.vy);
  const distToAim = Math.hypot(aim.x - P0.x, aim.y - P0.y);

  const ux = P0.x - S.x;
  const uy = P0.y - S.y;
  const distToStation = Math.hypot(ux, uy);

  // Stationary threat OR threat already at its aim point: no propagation.
  if (speed < EPS || distToAim < EPS) {
    const inRange = distToStation <= R;
    return {
      enterT: simTimeMin,
      exitT: simTimeMin,
      enterPosKm: { x: P0.x, y: P0.y },
      exitPosKm: { x: P0.x, y: P0.y },
      alreadyInRange: inRange,
      noIntercept: !inRange,
      hitsBeforeEntry: false,
    };
  }

  const dirX = (aim.x - P0.x) / distToAim;
  const dirY = (aim.y - P0.y) / distToAim;
  const wx = dirX * speed;
  const wy = dirY * speed;
  const tAim = distToAim / speed;

  // Quadratic: A·t² + B·t + C ≤ 0
  const A = speed * speed;
  const B = 2 * (ux * wx + uy * wy);
  const C = distToStation * distToStation - R * R;
  const disc = B * B - 4 * A * C;

  if (disc < 0) {
    return noInterceptResult(P0, simTimeMin);
  }

  const sqrtDisc = Math.sqrt(disc);
  const tSmall = (-B - sqrtDisc) / (2 * A);
  const tLarge = (-B + sqrtDisc) / (2 * A);

  // Both roots in the past — disc was crossed before now.
  if (tLarge < 0) {
    return noInterceptResult(P0, simTimeMin);
  }

  // Currently in range: smaller root ≤ 0 < larger root.
  if (tSmall <= 0) {
    const exitOffset = clamp(tLarge, 0, tAim);
    return {
      enterT: simTimeMin,
      exitT: simTimeMin + exitOffset,
      enterPosKm: { x: P0.x, y: P0.y },
      exitPosKm: { x: P0.x + wx * exitOffset, y: P0.y + wy * exitOffset },
      alreadyInRange: true,
      noIntercept: false,
      hitsBeforeEntry: false,
    };
  }

  // Future intercept window. Check whether the threat reaches its aim
  // point before the disc; if so this pre-arm will never fire.
  if (tSmall > tAim) {
    const px = P0.x + wx * tSmall;
    const py = P0.y + wy * tSmall;
    return {
      enterT: simTimeMin + tSmall,
      exitT: simTimeMin + tSmall,
      enterPosKm: { x: px, y: py },
      exitPosKm: { x: px, y: py },
      alreadyInRange: false,
      noIntercept: false,
      hitsBeforeEntry: true,
    };
  }

  const exitOffset = clamp(tLarge, 0, tAim);
  return {
    enterT: simTimeMin + tSmall,
    exitT: simTimeMin + exitOffset,
    enterPosKm: { x: P0.x + wx * tSmall, y: P0.y + wy * tSmall },
    exitPosKm: { x: P0.x + wx * exitOffset, y: P0.y + wy * exitOffset },
    alreadyInRange: false,
    noIntercept: false,
    hitsBeforeEntry: false,
  };
}

function noInterceptResult(
  P0: { x: number; y: number },
  simTimeMin: number,
): InterceptWindow {
  return {
    enterT: simTimeMin,
    exitT: simTimeMin,
    enterPosKm: { x: P0.x, y: P0.y },
    exitPosKm: { x: P0.x, y: P0.y },
    alreadyInRange: false,
    noIntercept: true,
    hitsBeforeEntry: false,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}
