import { useSimStore, type SimState } from "../store";
import type {
  DefenseStation,
  DefenseSuggestion,
  Engagement,
  Infrastructure,
  Ledger,
  Threat,
} from "../types";
import { spawnThreats } from "./loop";
import { computeSuggestions } from "./suggestions";
import { rollOutcome } from "./resolve";
import { counterfactual } from "./cost";

const TICK_DT_MIN = 0.05;

interface Sim {
  scenarioId: string;
  durationMin: number;
  simTimeMin: number;
  pendingSpawns: { atTMin: number; spec: import("../types").ScenarioSpawn }[];
  threats: Threat[];
  stations: DefenseStation[];
  infrastructure: Infrastructure[];
  engagements: Engagement[];
  suggestions: DefenseSuggestion[];
  ledger: Ledger;
}

function emptyLedger(): Ledger {
  return {
    damagePreventedUsd: 0,
    defenderSpendUsd: 0,
    enemySpendUsd: 0,
    damageTakenUsd: 0,
    threatsDestroyed: 0,
    threatsLeaked: 0,
    assetsLost: [],
  };
}

function snapshotSim(st: SimState): Sim {
  return {
    scenarioId: st.scenarioId ?? "default",
    durationMin: st.durationMin,
    simTimeMin: 0,
    pendingSpawns: st.allSpawns.map((p) => ({ atTMin: p.atTMin, spec: p.spec })),
    threats: [],
    stations: st.stations.map((s) => ({
      ...s,
      magazine: s.magazineMax,
      state: "READY" as const,
      reloadingUntilT: undefined,
    })),
    infrastructure: st.infrastructure.map((a) => ({
      ...a,
      state: "INTACT" as const,
      damageTakenUsd: 0,
    })),
    engagements: [],
    suggestions: [],
    ledger: emptyLedger(),
  };
}

/**
 * Naive operator: when called, scans `INBOUND` threats and picks the
 * highest-Pk in-range, ammo-available, weapon-effective option for each
 * threat that does not already have an engagement queued at this tick.
 * Cost-blind by design.
 */
function naiveDecide(sim: Sim): DefenseSuggestion[] {
  const inbound = sim.threats.filter((t) => t.state === "INBOUND");
  if (inbound.length === 0) return [];
  const out: DefenseSuggestion[] = [];
  const used = new Set<string>();
  // Build a quick suggestion table for the naive view.
  const all = computeSuggestions(inbound, sim.stations, sim.infrastructure, sim.simTimeMin);
  // Group per threat, sort by Pk desc among feasible.
  const byThreat = new Map<string, DefenseSuggestion[]>();
  for (const s of all) {
    if (!byThreat.has(s.threatId)) byThreat.set(s.threatId, []);
    byThreat.get(s.threatId)!.push(s);
  }
  for (const [, group] of byThreat) {
    const feasible = group
      .filter((s) => s.feasible && !used.has(s.stationId))
      .sort((a, b) => b.pk - a.pk);
    if (feasible.length > 0) {
      const pick = feasible[0];
      out.push(pick);
      used.add(pick.stationId);
    }
  }
  return out;
}

function applyResolution(sim: Sim, sug: DefenseSuggestion): void {
  const station = sim.stations.find((s) => s.id === sug.stationId);
  const threat = sim.threats.find((t) => t.id === sug.threatId);
  const target = sim.infrastructure.find((a) => threat && a.id === threat.targetAssetId);
  if (!station || !threat) return;
  if (station.magazine <= 0 || station.state !== "READY") return;
  const { hit } = rollOutcome(
    sim.scenarioId,
    sim.simTimeMin,
    threat.id,
    station.id,
    sug.pk,
  );
  station.magazine -= 1;
  if (station.magazine <= 0) {
    station.state = "RELOADING";
    station.reloadingUntilT = sim.simTimeMin + station.reloadMin;
  }
  sim.ledger.defenderSpendUsd += sug.costUsd;
  sim.ledger.enemySpendUsd += threat.threatUnitCostUsd;
  if (hit) {
    threat.state = "DESTROYED";
    if (target) {
      sim.ledger.damagePreventedUsd += counterfactual(threat, target);
      sim.ledger.threatsDestroyed += 1;
    }
  } else {
    threat.state = "ENGAGED";
  }
  sim.engagements.push({
    id: `E-${threat.id}-${station.id}-${sim.simTimeMin.toFixed(2)}`,
    threatId: threat.id,
    stationId: station.id,
    weapon: station.weapon,
    pkUsed: sug.pk,
    costUsd: sug.costUsd,
    rolledOutcome: hit ? "HIT" : "MISS",
    resolvedAtT: sim.simTimeMin,
    decisionSnapshot: {
      rank: sug.rank,
      counterfactualUsd: sug.counterfactualUsd,
      rangeKm: sug.rangeKm,
      distanceKm: sug.distanceKm,
      suggestedAtT: sim.simTimeMin,
    },
  });
}

function tickSim(sim: Sim, newT: number): void {
  const dtMin = newT - sim.simTimeMin;
  if (dtMin <= 0) return;
  // Spawn pending threats.
  const stillPending = [];
  for (const p of sim.pendingSpawns) {
    if (p.atTMin <= newT) {
      sim.threats.push(...spawnThreats(p.spec, p.atTMin, sim.infrastructure));
    } else {
      stillPending.push(p);
    }
  }
  sim.pendingSpawns = stillPending;

  // Reload stations.
  for (const s of sim.stations) {
    if (
      s.state === "RELOADING" &&
      s.reloadingUntilT !== undefined &&
      s.reloadingUntilT <= newT
    ) {
      s.state = "READY";
      s.magazine = s.magazineMax;
      s.reloadingUntilT = undefined;
    }
  }

  // Propagate threats.
  for (const t of sim.threats) {
    if (t.state !== "INBOUND" && t.state !== "ENGAGED") continue;
    const target = sim.infrastructure.find((a) => a.id === t.targetAssetId);
    const aim = target?.posKm ?? t.toKm;
    const dx = aim.x - t.posKm.x;
    const dy = aim.y - t.posKm.y;
    const dist = Math.hypot(dx, dy);
    const speed = Math.hypot(t.velocityKmPerMin.vx, t.velocityKmPerMin.vy);
    const traveled = speed * dtMin;
    if (traveled >= dist || dist < 0.02) {
      t.posKm = { x: aim.x, y: aim.y };
      t.state = "HIT_TARGET";
      sim.ledger.threatsLeaked += 1;
      if (target) {
        const dmg = counterfactual(t, target);
        target.damageTakenUsd += dmg;
        sim.ledger.damageTakenUsd += dmg;
        if (target.state === "INTACT") target.state = "DAMAGED";
        else if (target.state === "DAMAGED") target.state = "DESTROYED";
      }
    } else {
      const k = traveled / Math.max(dist, 0.0001);
      t.posKm = { x: t.posKm.x + dx * k, y: t.posKm.y + dy * k };
      t.etaMin = (dist - traveled) / Math.max(speed, 0.0001);
    }
  }

  sim.simTimeMin = newT;
}

/**
 * Runs the active scenario with the naive operator end-to-end and writes the
 * after-action overlay.
 */
export function runGhostReplay(): void {
  const st = useSimStore.getState();
  if (st.scenarioMode !== "defense") return;
  const sim = snapshotSim(st);

  while (sim.simTimeMin < sim.durationMin) {
    const next = Math.min(sim.durationMin, sim.simTimeMin + TICK_DT_MIN);
    tickSim(sim, next);
    // Naive operator decisions at this tick.
    const picks = naiveDecide(sim);
    for (const sug of picks) applyResolution(sim, sug);
  }

  const naiveLedger = sim.ledger;
  const yourLedger = st.ledger;

  const naiveNet = naiveLedger.damagePreventedUsd - naiveLedger.defenderSpendUsd;
  const yourNet = yourLedger.damagePreventedUsd - yourLedger.defenderSpendUsd;
  const diff = yourNet - naiveNet;
  const sign = diff >= 0 ? "+" : "−";
  const abs = Math.abs(diff);
  const headline =
    abs >= 1_000_000
      ? `${sign}$${(abs / 1_000_000).toFixed(1)}M better than naive`
      : `${sign}$${abs.toFixed(0)} better than naive`;

  st.setAfterAction({
    title: "Ghost Replay · Naive vs You",
    headline,
    rows: [
      { label: "Naive operator (highest-Pk in-range)", ledger: naiveLedger },
      { label: "You (current run)", ledger: yourLedger },
    ],
  });
}
