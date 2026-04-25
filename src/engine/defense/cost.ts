import type {
  DefenseSuggestion,
  DefenseWeaponType,
  Infrastructure,
  Threat,
  ThreatClass,
} from "../types";
import costTable from "../../../data/cost-table.json";

interface WeaponCost {
  costPerShotUsd: number;
  rangeKm: number;
  magazineMax: number;
  reloadMin: number;
}

interface ThreatCost {
  unitCostUsd: number;
  damageMult: number;
}

export const WEAPON_COSTS = costTable.weapons as Record<
  DefenseWeaponType,
  WeaponCost
>;

export const THREAT_COSTS = costTable.threats as Record<ThreatClass, ThreatCost>;

export function threatUnitCostUsd(klass: ThreatClass): number {
  return THREAT_COSTS[klass]?.unitCostUsd ?? 0;
}

export function classDamageMult(klass: ThreatClass): number {
  return THREAT_COSTS[klass]?.damageMult ?? 1;
}

/** Counterfactual: $ damage if this threat reaches its target. */
export function counterfactual(threat: Threat, target: Infrastructure): number {
  return Math.round(target.damageOnHitUsd * classDamageMult(threat.class));
}

/** Cost-per-percent-Pk; lower is better. Used to rank suggestions. */
export function ratio(s: Pick<DefenseSuggestion, "costUsd" | "pk">): number {
  return s.costUsd / Math.max(s.pk * 100, 1);
}
