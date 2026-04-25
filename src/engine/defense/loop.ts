import type { SimState } from "../store";
import type {
  DefenseStation,
  DefenseSuggestion,
  Engagement,
  Infrastructure,
  Ledger,
  PendingEngagement,
  ScenarioSpawn,
  SimEvent,
  Threat,
  ThreatClass,
} from "../types";
import { band, importance, threatLevel } from "./importance";
import { basePk, distanceKm, pk as effectivePk } from "./effectiveness";
import { computeSuggestions } from "./suggestions";
import { counterfactual } from "./cost";
import { rollOutcome } from "./resolve";
import { computeInterceptWindow } from "./intercept";
import { propagateMobilePatrolStations } from "./mobilePatrol";
import {
  inferThreatLaunchSide,
  stationMayEngageThreat,
} from "./sides";

const ETA_REACHED_EPS = 0.02;

/** Default pre-arm: best-ranked suggestion per threat (unless operator declined). */
function appendBestAutoPrearms(
  st: SimState,
  threats: Threat[],
  stations: DefenseStation[],
  suggestions: DefenseSuggestion[],
  pending: PendingEngagement[],
  newT: number,
): { pending: PendingEngagement[]; events: SimEvent[] } {
  const declined = new Set(st.autoArmDeclinedThreatIds ?? []);
  const out = [...pending];
  const events: SimEvent[] = [];
  for (const t of threats) {
    if (t.state !== "INBOUND" && t.state !== "ENGAGED") continue;
    if (declined.has(t.id)) continue;
    if (out.some((pe) => pe.threatId === t.id)) continue;
    const best = suggestions.find((s) => s.threatId === t.id);
    if (!best) continue;
    const station = stations.find((s) => s.id === best.stationId);
    if (!station || station.state === "DESTROYED") continue;
    if (basePk(station.weapon, t.class) <= 0) continue;
    if (!stationMayEngageThreat(station, t)) continue;
    out.push({
      id: `PE-${t.id}-${best.stationId}`,
      threatId: t.id,
      stationId: best.stationId,
      queuedAtT: newT,
    });
    events.push({
      t: newT,
      kind: "ENGAGEMENT_AUTO_QUEUED",
      payload: { threatId: t.id, stationId: best.stationId },
    });
  }
  return { pending: out, events };
}

/**
 * Pure function: given the current store state and a target sim-time, return a
 * Partial<SimState> describing the new state. Does not mutate inputs.
 *
 * Responsibilities:
 *  - Spawn pending threats whose `atTMin <= newT`.
 *  - Propagate threat positions; mark `HIT_TARGET` if reached; apply damage.
 *  - Reload stations whose `reloadingUntilT` has elapsed.
 *  - Recompute suggestions for every still-INBOUND threat.
 *  - Update ledger when a threat hits its target.
 */
export function computeDefenseTick(st: SimState, newT: number): Partial<SimState> {
  const dtMin = newT - st.simTimeMin;
  if (dtMin <= 0) return { simTimeMin: newT };

  // Spawn pending threats.
  const remainingPending = [];
  let threats: Threat[] = st.threats.map((t) => ({ ...t }));
  for (const p of st.pendingSpawns) {
    if (p.atTMin <= newT) {
      const spawned = spawnThreats(p.spec, p.atTMin, st.infrastructure);
      threats.push(...spawned);
    } else {
      remainingPending.push(p);
    }
  }

  // Reload stations.
  const stations: DefenseStation[] = st.stations.map((s) => {
    if (
      s.state === "RELOADING" &&
      s.reloadingUntilT !== undefined &&
      s.reloadingUntilT <= newT
    ) {
      return {
        ...s,
        state: "READY",
        reloadingUntilT: undefined,
        magazine: s.magazineMax,
      };
    }
    return s;
  });

  propagateMobilePatrolStations(stations, dtMin);

  // Propagate threats; detect arrivals.
  const infraById = new Map<string, Infrastructure>();
  let infrastructure: Infrastructure[] = st.infrastructure.map((a) => ({ ...a }));
  for (const a of infrastructure) infraById.set(a.id, a);

  let ledger: Ledger = { ...st.ledger, assetsLost: [...st.ledger.assetsLost] };

  for (const t of threats) {
    if (t.state === "DESTROYED" || t.state === "HIT_TARGET" || t.state === "EXPIRED") continue;
    // Move along its path.
    const target = infraById.get(t.targetAssetId);
    const aim = target?.posKm ?? t.toKm;
    const dx = aim.x - t.posKm.x;
    const dy = aim.y - t.posKm.y;
    const distRemaining = Math.hypot(dx, dy);
    const speed = Math.hypot(t.velocityKmPerMin.vx, t.velocityKmPerMin.vy);
    const traveled = speed * dtMin;
    if (traveled >= distRemaining || distRemaining < ETA_REACHED_EPS) {
      // HIT_TARGET (only if state allows).
      t.posKm = { x: aim.x, y: aim.y };
      if (t.state === "INBOUND" || t.state === "ENGAGED") {
        t.state = "HIT_TARGET";
        if (target) {
          const dmg = counterfactual(t, target);
          target.damageTakenUsd += dmg;
          ledger.damageTakenUsd += dmg;
          ledger.threatsLeaked += 1;
          // First hit damages; second destroys.
          if (target.state === "INTACT") {
            target.state = "DAMAGED";
          } else if (target.state === "DAMAGED") {
            target.state = "DESTROYED";
            ledger.assetsLost.push({ assetId: target.id, importance: importanceOfTarget(target) });
          }
        }
      }
    } else {
      const k = traveled / Math.max(distRemaining, 0.0001);
      t.posKm = { x: t.posKm.x + dx * k, y: t.posKm.y + dy * k };
    }

    // Update ETA.
    const newDist = Math.hypot(aim.x - t.posKm.x, aim.y - t.posKm.y);
    t.etaMin = speed > 0.0001 ? newDist / speed : 0;

    // Re-derive threat level (importance of target × class hazard); stable per scenario.
    if (target) {
      t.threatLevel = threatLevel(t, target);
      t.threatBand = band(t.threatLevel);
    }
  }

  // Mark long-lost threats expired (off-map).
  for (const t of threats) {
    if (t.state === "INBOUND" || t.state === "ENGAGED") {
      if (
        t.posKm.x < -200 ||
        t.posKm.x > 1900 ||
        t.posKm.y < -200 ||
        t.posKm.y > 1500
      ) {
        t.state = "EXPIRED";
      }
    }
  }

  const activeThreats = threats.filter(
    (t) => t.state === "INBOUND" || t.state === "ENGAGED",
  );

  const suggestions: DefenseSuggestion[] = computeSuggestions(
    activeThreats,
    stations,
    infrastructure,
    newT,
  );

  const { pending: pendingForFire, events: autoEvents } = appendBestAutoPrearms(
    st,
    threats,
    stations,
    suggestions,
    st.pendingEngagements,
    newT,
  );

  // Auto-fire pre-armed (queued) engagements. Runs after default pre-arms are
  // merged so a shot resolved this tick is not immediately re-queued until
  // the next tick.
  const engagementsAcc: Engagement[] = [...st.engagements];
  const remainingPendingEng: PendingEngagement[] = [];
  for (const pe of pendingForFire) {
    const stationIdx = stations.findIndex((s) => s.id === pe.stationId);
    const threatIdx = threats.findIndex((t) => t.id === pe.threatId);
    if (stationIdx < 0 || threatIdx < 0) continue;
    const station = stations[stationIdx];
    const threat = threats[threatIdx];
    if (station.state === "DESTROYED") continue;
    if (threat.state !== "INBOUND" && threat.state !== "ENGAGED") continue;
    if (!stationMayEngageThreat(station, threat)) continue;
    // Drop only if the weapon is fundamentally ineffective vs this threat
    // class (e.g. SAM_SR vs SRBM = 0.0). Range falloff is range-dependent and
    // is checked separately below.
    const baseHit = basePk(station.weapon, threat.class);
    if (baseHit <= 0) continue;
    // Also drop "zombie" pre-arms whose geometric path will never
    // re-enter the station's range (`noIntercept`) or whose threat will
    // hit the target before entering range (`hitsBeforeEntry`). Safe
    // today because the propagation model is deterministic straight-line
    // toward `target.posKm`; if that ever changes this check must too.
    const targetForWin = infraById.get(threat.targetAssetId);
    const win = computeInterceptWindow(threat, station, targetForWin, newT);
    if (win.noIntercept || win.hitsBeforeEntry) continue;
    const dist = distanceKm(station.posKm, threat.posKm);
    const inRange = dist <= station.rangeKm;
    const hasAmmo = station.magazine > 0;
    const ready = station.state === "READY";
    if (!inRange || !hasAmmo || !ready) {
      // Conditions not yet met — keep waiting.
      remainingPendingEng.push(pe);
      continue;
    }
    const pkVal = effectivePk(station, threat);

    // Fire one shot using the same seeded resolution as a manual click.
    const { hit } = rollOutcome(
      st.scenarioId ?? "default",
      newT,
      threat.id,
      station.id,
      pkVal,
    );

    const newMag = station.magazine - 1;
    const newStation: DefenseStation = {
      ...station,
      magazine: Math.max(0, newMag),
      state: newMag <= 0 ? "RELOADING" : "READY",
      reloadingUntilT: newMag <= 0 ? newT + station.reloadMin : station.reloadingUntilT,
    };
    stations[stationIdx] = newStation;

    const target = infraById.get(threat.targetAssetId);
    let updatedThreat: Threat = { ...threat };
    if (hit) {
      updatedThreat.state = "DESTROYED";
      if (target) {
        const prevented = counterfactual(threat, target);
        ledger.damagePreventedUsd += prevented;
        ledger.threatsDestroyed += 1;
      }
    } else {
      updatedThreat.state = "ENGAGED";
    }
    threats[threatIdx] = updatedThreat;

    ledger.defenderSpendUsd += newStation.costPerShotUsd;
    ledger.enemySpendUsd += threat.threatUnitCostUsd;

    engagementsAcc.push({
      id: `E-${threat.id}-${station.id}-${newT.toFixed(2)}`,
      threatId: threat.id,
      stationId: station.id,
      weapon: newStation.weapon,
      pkUsed: pkVal,
      costUsd: newStation.costPerShotUsd,
      rolledOutcome: hit ? "HIT" : "MISS",
      resolvedAtT: newT,
      decisionSnapshot: {
        rank: 0,
        counterfactualUsd: target ? counterfactual(threat, target) : 0,
        rangeKm: newStation.rangeKm,
        distanceKm: dist,
        suggestedAtT: pe.queuedAtT,
      },
    });
  }

  // Recompute suggestions for still-active inbound threats.
  return {
    simTimeMin: newT,
    threats,
    stations,
    infrastructure,
    pendingSpawns: remainingPending,
    pendingEngagements: remainingPendingEng,
    engagements: engagementsAcc,
    suggestions,
    ledger,
    events: [...st.events, ...autoEvents],
    playState: newT >= st.durationMin ? "paused" : st.playState,
    afterAction: newT >= st.durationMin ? buildScenarioEndOverlay(st, ledger) : st.afterAction,
  };
}

function importanceOfTarget(a: Infrastructure): number {
  return importance(a);
}

function buildScenarioEndOverlay(st: SimState, ledger: Ledger): SimState["afterAction"] {
  if (st.afterAction) return st.afterAction;
  return {
    title: "After-Action Report",
    rows: [{ label: "You", ledger }],
  };
}

/**
 * Spawn threats for one ScenarioSpawn entry. Handles the optional `count` to
 * fan out a swarm with small lateral jitter.
 */
export function spawnThreats(
  spec: ScenarioSpawn,
  atT: number,
  infra: Infrastructure[],
): Threat[] {
  const out: Threat[] = [];
  const count = spec.count ?? 1;
  const speedKmPerMin = (spec.speedMps * 60) / 1000;
  const target = spec.targetAssetId
    ? infra.find((a) => a.id === spec.targetAssetId)
    : undefined;
  const klass = (spec.class as ThreatClass) ?? "DRONE";
  for (let i = 0; i < count; i++) {
    const jitter = count > 1 ? (i - (count - 1) / 2) * 8 : 0;
    const fromX = spec.fromKm[0] + jitter;
    const fromY = spec.fromKm[1];
    const toX = (target?.posKm.x ?? spec.toKm[0]) + jitter * 0.1;
    const toY = target?.posKm.y ?? spec.toKm[1];
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.hypot(dx, dy) || 1;
    const vx = (dx / dist) * speedKmPerMin;
    const vy = (dy / dist) * speedKmPerMin;
    const id = count > 1 ? `${spec.id}-${i + 1}` : spec.id;
    const initialEta = speedKmPerMin > 0.0001 ? dist / speedKmPerMin : 0;
    const toPos = { x: toX, y: toY };
    const fromPos = { x: fromX, y: fromY };
    const t: Threat = {
      id,
      class: klass,
      posKm: { x: fromX, y: fromY },
      velocityKmPerMin: { vx, vy },
      altitudeM: spec.altitudeM,
      speedMps: spec.speedMps,
      classification: "HOSTILE",
      detectedAtT: atT,
      targetAssetId: spec.targetAssetId ?? "",
      threatUnitCostUsd: spec.threatUnitCostUsd ?? 0,
      threatLevel: 0,
      threatBand: "LOW",
      etaMin: initialEta,
      state: "INBOUND",
      fromKm: fromPos,
      toKm: toPos,
      spawnedAtT: atT,
      launchSide:
        spec.launchSide ?? inferThreatLaunchSide(fromPos, toPos),
    };
    if (target) {
      t.threatLevel = threatLevel(t, target);
      t.threatBand = band(t.threatLevel);
    }
    out.push(t);
  }
  return out;
}

// Re-export distanceKm for convenience.
export { distanceKm };
