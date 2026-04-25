import type {
  Infrastructure,
  InfrastructureSize,
  InfrastructureType,
  Threat,
  ThreatClass,
} from "../types";

export const TYPE_BASE_IMPORTANCE: Record<InfrastructureType, number> = {
  military_airport: 100,
  capital: 100,
  nuclear_plant: 95,
  power_plant: 80,
  major_city: 80,
  refinery: 60,
  civilian_airport: 60,
  port: 50,
  comms_tower: 30,
  small_town: 25,
  empty_field: 2,
};

export const SIZE_MULT: Record<InfrastructureSize, number> = {
  S: 0.6,
  M: 1.0,
  L: 1.4,
  XL: 1.8,
};

/** Returns 0..100 (rounded) importance value, or `importanceOverride` if set. */
export function importance(asset: Infrastructure): number {
  if (asset.importanceOverride !== undefined) return asset.importanceOverride;
  return Math.round(TYPE_BASE_IMPORTANCE[asset.type] * SIZE_MULT[asset.size]);
}

export const CLASS_HAZARD: Record<ThreatClass, number> = {
  DRONE: 0.3,
  LOITERING_MUNITION: 0.4,
  CM_SUBSONIC: 0.7,
  CM_SUPERSONIC: 0.85,
  SRBM: 1.0,
  GLIDE_BOMB: 0.6,
  FIGHTER_4GEN: 0.5,
  BOMBER: 0.5,
};

export function threatLevel(t: Threat, target: Infrastructure): number {
  const score = importance(target) * CLASS_HAZARD[t.class];
  return Math.min(100, Math.round(score));
}

export function band(level: number): "LOW" | "MED" | "HIGH" | "CRIT" {
  if (level >= 80) return "CRIT";
  if (level >= 55) return "HIGH";
  if (level >= 30) return "MED";
  return "LOW";
}
