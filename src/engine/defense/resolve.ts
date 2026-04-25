import { useSimStore } from "../store";
import type {
  DefenseStation,
  DefenseSuggestion,
  Engagement,
  Infrastructure,
  Ledger,
  Threat,
} from "../types";
import { counterfactual } from "./cost";
import { stationMayEngageThreat } from "./sides";

/**
 * Seeded PRNG: mulberry32 over a hash of (scenarioId, simTimeMin, threatId,
 * stationId). Same inputs always yield the same outcome — guarantees
 * deterministic ledger numbers across replays.
 */
function hashStrings(...parts: (string | number)[]): number {
  // FNV-1a like 32-bit hash. Plenty for a coin flip.
  let h = 0x811c9dc5 >>> 0;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    h ^= 0x9e;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rollOutcome(
  scenarioId: string,
  simTimeMin: number,
  threatId: string,
  stationId: string,
  pk: number,
): { roll: number; hit: boolean } {
  // Quantize sim time to TICK_QUANT to make the seed stable across rounding.
  const tQ = Math.round(simTimeMin / 0.05) * 0.05;
  const seed = hashStrings(scenarioId, tQ.toFixed(2), threatId, stationId);
  const rng = mulberry32(seed);
  const roll = rng();
  return { roll, hit: roll < pk };
}

interface ResolveResult {
  engagement: Engagement;
  station: DefenseStation;
  threat: Threat;
  ledgerDelta: Partial<Ledger>;
}

export function resolveEngagementPure(
  state: {
    scenarioId?: string;
    simTimeMin: number;
    stations: DefenseStation[];
    threats: Threat[];
    infrastructure: Infrastructure[];
  },
  sug: DefenseSuggestion,
): ResolveResult | null {
  const station = state.stations.find((s) => s.id === sug.stationId);
  const threat = state.threats.find((t) => t.id === sug.threatId);
  const target = state.infrastructure.find(
    (a) => threat && a.id === threat.targetAssetId,
  );
  if (!station || !threat) return null;
  if (!stationMayEngageThreat(station, threat)) return null;
  if (!sug.feasible) return null;
  if (station.magazine <= 0 || station.state !== "READY") return null;
  if (threat.state !== "INBOUND" && threat.state !== "ENGAGED") return null;

  const { hit } = rollOutcome(
    state.scenarioId ?? "default",
    state.simTimeMin,
    threat.id,
    station.id,
    sug.pk,
  );

  const newMag = station.magazine - 1;
  const reloadingUntil =
    newMag <= 0 ? state.simTimeMin + station.reloadMin : station.reloadingUntilT;
  // After every shot the weapon is briefly busy until the next reload tick;
  // for v1 we keep it simple: only RELOADING when magazine is empty.
  const newStation: DefenseStation = {
    ...station,
    magazine: Math.max(0, newMag),
    state: newMag <= 0 ? "RELOADING" : "READY",
    reloadingUntilT: newMag <= 0 ? reloadingUntil : station.reloadingUntilT,
  };

  let newThreat: Threat = { ...threat };
  const ledgerDelta: Partial<Ledger> = {};
  if (hit) {
    newThreat.state = "DESTROYED";
    if (target) {
      const prevented = counterfactual(threat, target);
      ledgerDelta.damagePreventedUsd = prevented;
      ledgerDelta.threatsDestroyed = 1;
    }
  } else {
    // Stays inbound, but tagged ENGAGED to flag in UI.
    newThreat.state = "ENGAGED";
  }
  ledgerDelta.defenderSpendUsd = sug.costUsd;
  ledgerDelta.enemySpendUsd = threat.threatUnitCostUsd;

  const eng: Engagement = {
    id: `E-${threat.id}-${station.id}-${state.simTimeMin.toFixed(2)}`,
    threatId: threat.id,
    stationId: station.id,
    weapon: station.weapon,
    pkUsed: sug.pk,
    costUsd: sug.costUsd,
    rolledOutcome: hit ? "HIT" : "MISS",
    resolvedAtT: state.simTimeMin,
    decisionSnapshot: {
      rank: sug.rank,
      counterfactualUsd: sug.counterfactualUsd,
      rangeKm: sug.rangeKm,
      distanceKm: sug.distanceKm,
      suggestedAtT: state.simTimeMin,
    },
  };

  return { engagement: eng, station: newStation, threat: newThreat, ledgerDelta };
}

/**
 * UI handler — called from a SuggestionCard click. Reads current store state,
 * computes the resolution, and writes the results.
 */
export function resolveEngagementClick(sug: DefenseSuggestion): void {
  const st = useSimStore.getState();
  const r = resolveEngagementPure(st, sug);
  if (!r) return;
  const newLedger: Ledger = {
    ...st.ledger,
    damagePreventedUsd: st.ledger.damagePreventedUsd + (r.ledgerDelta.damagePreventedUsd ?? 0),
    defenderSpendUsd: st.ledger.defenderSpendUsd + (r.ledgerDelta.defenderSpendUsd ?? 0),
    enemySpendUsd: st.ledger.enemySpendUsd + (r.ledgerDelta.enemySpendUsd ?? 0),
    threatsDestroyed: st.ledger.threatsDestroyed + (r.ledgerDelta.threatsDestroyed ?? 0),
    assetsLost: st.ledger.assetsLost,
    damageTakenUsd: st.ledger.damageTakenUsd,
    threatsLeaked: st.ledger.threatsLeaked,
  };
  useSimStore.setState({
    engagements: [...st.engagements, r.engagement],
    stations: st.stations.map((s) => (s.id === r.station.id ? r.station : s)),
    threats: st.threats.map((t) => (t.id === r.threat.id ? r.threat : t)),
    ledger: newLedger,
  });
  st.appendEvent({
    t: st.simTimeMin,
    kind: r.engagement.rolledOutcome === "HIT" ? "ENGAGEMENT_HIT" : "ENGAGEMENT_MISS",
    payload: {
      threatId: r.threat.id,
      stationId: r.station.id,
      pk: sug.pk,
      cost: sug.costUsd,
    },
  });
}
