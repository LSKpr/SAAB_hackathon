import type {
  DefenseStation,
  DefenseSuggestion,
  Infrastructure,
  Threat,
} from "../types";
import { basePk, distanceKm, pk as effectivePk } from "./effectiveness";
import { counterfactual, ratio } from "./cost";
import { computeInterceptWindow, type InterceptWindow } from "./intercept";
import { stationMayEngageThreat } from "./sides";

/** Station could ever engage this threat (weapon class + geometry). */
function canPotentiallyIntercept(
  station: DefenseStation,
  threat: Threat,
  intercept: InterceptWindow,
): boolean {
  if (station.state === "DESTROYED") return false;
  if (basePk(station.weapon, threat.class) <= 0) return false;
  if (intercept.noIntercept || intercept.hitsBeforeEntry) return false;
  return true;
}

/**
 * Compute one DefenseSuggestion per (threat, station) pair that can actually
 * intercept: weapon effective vs class, station alive, and trajectory enters
 * the range disc before impact. Sorted: feasible first (by ratio), then
 * infeasible-but-possible future intercepts by `intercept.enterT` ascending.
 */
export function computeSuggestions(
  threats: Threat[],
  stations: DefenseStation[],
  infrastructure: Infrastructure[],
  simTimeMin: number,
): DefenseSuggestion[] {
  const infraById = new Map<string, Infrastructure>();
  for (const a of infrastructure) infraById.set(a.id, a);

  const out: DefenseSuggestion[] = [];

  for (const t of threats) {
    const target = infraById.get(t.targetAssetId);
    const cf = target ? counterfactual(t, target) : 0;

    const perThreat: DefenseSuggestion[] = [];
    for (const s of stations) {
      if (!stationMayEngageThreat(s, t)) continue;
      const intercept = computeInterceptWindow(t, s, target, simTimeMin);
      if (!canPotentiallyIntercept(s, t, intercept)) continue;

      const dist = distanceKm(s.posKm, t.posKm);
      const pkVal = effectivePk(s, t);
      const inRange = dist <= s.rangeKm;
      const hasAmmo = s.magazine > 0;
      const ready = s.state === "READY";
      const feasible = inRange && hasAmmo && ready && pkVal > 0;
      let reason = "";
      if (!inRange) {
        reason = `out of range (${dist.toFixed(0)} km > ${s.rangeKm} km)`;
      } else if (!hasAmmo) {
        reason = "magazine empty";
      } else if (!ready) {
        if (s.state === "RELOADING") reason = "reloading";
        else if (s.state === "DESTROYED") reason = "station destroyed";
        else reason = `station ${s.state.toLowerCase()}`;
      } else if (pkVal <= 0) {
        reason = `${s.weapon} not effective vs ${t.class}`;
      }

      const sug: DefenseSuggestion = {
        id: `S-${t.id}-${s.id}`,
        threatId: t.id,
        stationId: s.id,
        stationName: s.name,
        weapon: s.weapon,
        inRange,
        distanceKm: dist,
        rangeKm: s.rangeKm,
        pk: pkVal,
        costUsd: s.costPerShotUsd,
        ammoLeft: s.magazine,
        ammoMax: s.magazineMax,
        ratio: 0,
        rank: 0,
        counterfactualUsd: cf,
        feasible,
        reasonText: reason,
        intercept,
      };
      sug.ratio = feasible ? ratio({ costUsd: sug.costUsd, pk: sug.pk }) : Number.POSITIVE_INFINITY;
      perThreat.push(sug);
    }

    // Sort: feasible first by ratio; among infeasible (out of range / empty
    // mag / reload) by soonest intercept entry time.
    perThreat.sort((a, b) => {
      if (a.feasible !== b.feasible) return a.feasible ? -1 : 1;
      if (a.feasible && b.feasible) return a.ratio - b.ratio;
      const aT = a.intercept?.enterT ?? Number.POSITIVE_INFINITY;
      const bT = b.intercept?.enterT ?? Number.POSITIVE_INFINITY;
      if (aT !== bT) return aT - bT;
      return a.stationName.localeCompare(b.stationName);
    });

    let rank = 1;
    for (const sug of perThreat) {
      if (sug.feasible) sug.rank = rank++;
    }
    out.push(...perThreat);
  }

  return out;
}
