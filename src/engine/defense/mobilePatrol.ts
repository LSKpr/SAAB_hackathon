import type { DefenseStation } from "../types";

/**
 * Advance CAP / mobile picket stations on circular patrol. Mutates the
 * `stations` array entries in place (same objects as loop uses).
 */
export function propagateMobilePatrolStations(
  stations: DefenseStation[],
  dtMin: number,
): void {
  if (dtMin <= 0) return;
  for (let i = 0; i < stations.length; i++) {
    const s = stations[i];
    if (!s.mobilePatrol || s.state === "DESTROYED") continue;
    const mp = s.mobilePatrol;
    const nextAngle = mp.angleRad + mp.omegaRadPerMin * dtMin;
    const nx = mp.centerKm.x + Math.cos(nextAngle) * mp.radiusKm;
    const ny = mp.centerKm.y + Math.sin(nextAngle) * mp.radiusKm;
    stations[i] = {
      ...s,
      posKm: { x: nx, y: ny },
      mobilePatrol: { ...mp, angleRad: nextAngle },
    };
  }
}
