import type { DefenseStation, DefenseWeaponType, Threat, ThreatClass } from "../types";
import effectivenessJson from "../../../data/effectiveness.json";

export type PkTable = Record<DefenseWeaponType, Record<ThreatClass, number>>;

export const PK_TABLE: PkTable = effectivenessJson as PkTable;

export function distanceKm(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Linear range falloff. 1.0 inside the inner 20% of range; linear from 1.0 to
 * 0.5 between 20% and 100%; 0 beyond range.
 */
export function rangeFalloff(distKm: number, rangeKm: number): number {
  if (rangeKm <= 0) return 0;
  if (distKm > rangeKm) return 0;
  if (distKm < rangeKm * 0.2) return 1.0;
  const t = (distKm - rangeKm * 0.2) / (rangeKm * 0.8);
  return 1.0 - 0.5 * t;
}

/** Effective Pk for a station against a threat at its current position. */
export function pk(station: DefenseStation, threat: Threat): number {
  const base = PK_TABLE[station.weapon]?.[threat.class] ?? 0;
  const dist = distanceKm(station.posKm, threat.posKm);
  return base * rangeFalloff(dist, station.rangeKm);
}

export function basePk(weapon: DefenseWeaponType, klass: ThreatClass): number {
  return PK_TABLE[weapon]?.[klass] ?? 0;
}
