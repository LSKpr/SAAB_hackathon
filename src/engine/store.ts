import { create } from "zustand";
import { computeDefenseTick } from "./defense/loop";
import { stationMayEngageThreat } from "./defense/sides";
import { expandContinuousStreams, type SpawnEntry } from "./scenarioContinuous";
import type {
  Asset,
  Classification,
  DefenseStation,
  DefenseSuggestion,
  Engagement,
  FireUnit,
  Infrastructure,
  Ledger,
  PendingEngagement,
  Scenario,
  ScenarioEvent,
  ScenarioMode,
  ScenarioSpawn,
  SimEvent,
  Side,
  Threat,
  Track,
} from "./types";

export type PlayState = "playing" | "paused";

const TICK_QUANT = 0.05;

function quantize(t: number): number {
  return Math.round(t / TICK_QUANT) * TICK_QUANT;
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

export interface SimState {
  // Phase 1–3 (legacy track propagation)
  assets: Asset[];
  tracks: Track[];
  fireUnits: FireUnit[];
  selectedTrackId?: string;
  // Defense system
  infrastructure: Infrastructure[];
  stations: DefenseStation[];
  threats: Threat[];
  engagements: Engagement[];
  /** Operator-queued shots that auto-fire when conditions become feasible. */
  pendingEngagements: PendingEngagement[];
  suggestions: DefenseSuggestion[];
  ledger: Ledger;
  selectedThreatId?: string;
  showImportanceHeatmap: boolean;
  hoveredStationId?: string;
  scenarioMode: ScenarioMode;
  // Default world cache (used when a defense scenario doesn't override)
  defaultWorldInfrastructure: Infrastructure[];
  defaultWorldStations: DefenseStation[];

  events: SimEvent[];
  simTimeMin: number;
  durationMin: number;
  scenarioName: string;
  scenarioId?: string;
  playState: PlayState;
  speed: number;
  selectedAssetId?: string;
  /** Pending spawns left to fire (legacy track-style and defense-style alike). */
  allSpawns: SpawnEntry[];
  pendingSpawns: SpawnEntry[];
  /** Threat ids where the operator cancelled a queue — skip default auto pre-arm. */
  autoArmDeclinedThreatIds: string[];
  /** End-of-scenario after-action overlay. */
  afterAction: AfterActionOverlay | null;

  setAssets: (a: Asset[]) => void;
  setDefaultWorld: (i: Infrastructure[], s: DefenseStation[]) => void;
  loadScenario: (s: Scenario, opts?: LoadScenarioOpts) => void;
  selectAsset: (id?: string) => void;
  selectTrack: (id?: string) => void;
  selectThreat: (id?: string) => void;
  setPlay: (p: PlayState) => void;
  togglePlay: () => void;
  setSpeed: (s: number) => void;
  setSimTime: (t: number) => void;
  resetSim: () => void;
  tick: (dtMin: number) => void;
  appendEvent: (e: SimEvent) => void;
  toggleHeatmap: () => void;
  hoverStation: (id?: string) => void;
  /** Replace state-bearing slices for a defense engagement resolution. */
  applyEngagement: (e: Engagement, updatedStation: DefenseStation, updatedThreat: Threat) => void;
  /** Replace suggestion array (recomputed each tick). */
  setSuggestions: (s: DefenseSuggestion[]) => void;
  setAfterAction: (a: AfterActionOverlay | null) => void;
  /** Pre-arm a station against a threat. No-op if station/threat unknown or already queued. */
  queueEngagement: (threatId: string, stationId: string) => void;
  /** Cancel a previously queued engagement. */
  cancelQueuedEngagement: (threatId: string, stationId: string) => void;
}

export interface AfterActionRow {
  label: string;
  ledger: Ledger;
}

export interface AfterActionOverlay {
  title: string;
  rows: AfterActionRow[];
  /** Optional "net diff" headline string for ghost replay. */
  headline?: string;
}

export interface LoadScenarioOpts {
  scenarioId?: string;
}

interface ScenarioPrep {
  mode: ScenarioMode;
  infrastructure: Infrastructure[];
  stations: DefenseStation[];
  spawns: SpawnEntry[];
  events: ScenarioEvent[];
}

function flattenSpawns(s: Scenario): ScenarioSpawn[] {
  if (s.waves && s.waves.length) {
    const out: ScenarioSpawn[] = [];
    for (const w of s.waves) {
      if (w.spawns) out.push(...w.spawns);
    }
    return out;
  }
  return s.spawns ?? [];
}

function inferMode(s: Scenario): ScenarioMode {
  if (s.mode) return s.mode;
  if (s.waves) return "defense";
  if (s.continuousStreams?.length) return "defense";
  if (s.infrastructure || s.stations) return "defense";
  return "legacy";
}

function prepScenario(
  s: Scenario,
  defaultWorldInfrastructure: Infrastructure[],
  defaultWorldStations: DefenseStation[],
): ScenarioPrep {
  const mode = inferMode(s);
  const flat = flattenSpawns(s);
  const waveEntries: SpawnEntry[] = flat.map((spec) => ({
    atTMin: spec.t,
    spec,
  }));
  const continuousEntries =
    mode === "defense"
      ? expandContinuousStreams(s, defaultWorldInfrastructure)
      : [];
  const all: SpawnEntry[] = [...waveEntries, ...continuousEntries].sort(
    (a, b) =>
      a.atTMin !== b.atTMin
        ? a.atTMin - b.atTMin
        : a.spec.id.localeCompare(b.spec.id),
  );
  const infra =
    mode === "defense"
      ? (s.infrastructure ?? defaultWorldInfrastructure).map((a) => ({
          ...a,
          state: "INTACT" as const,
          damageTakenUsd: 0,
        }))
      : [];
  const stations =
    mode === "defense"
      ? (s.stations ?? defaultWorldStations).map((st) => {
          const base = {
            ...st,
            magazine: st.magazineMax,
            state: "READY" as const,
            emcon: st.emcon ?? ("WHITE" as const),
            reloadingUntilT: undefined,
          };
          if (!st.mobilePatrol) return base;
          const c = st.mobilePatrol.centerKm;
          const angleRad =
            st.mobilePatrol.angleRad ??
            Math.atan2(st.posKm.y - c.y, st.posKm.x - c.x);
          return {
            ...base,
            mobilePatrol: { ...st.mobilePatrol, angleRad },
          };
        })
      : [];
  return {
    mode,
    infrastructure: infra,
    stations,
    spawns: all,
    events: s.events ?? [],
  };
}

export const useSimStore = create<SimState>((set, get) => ({
  assets: [],
  tracks: [],
  fireUnits: [],
  infrastructure: [],
  stations: [],
  threats: [],
  engagements: [],
  pendingEngagements: [],
  suggestions: [],
  ledger: emptyLedger(),
  showImportanceHeatmap: false,
  scenarioMode: "legacy",
  defaultWorldInfrastructure: [],
  defaultWorldStations: [],
  events: [],
  simTimeMin: 0,
  durationMin: 30,
  scenarioName: "(none)",
  playState: "paused",
  speed: 1,
  allSpawns: [],
  pendingSpawns: [],
  autoArmDeclinedThreatIds: [],
  afterAction: null,

  setAssets: (a) => set({ assets: a }),
  setDefaultWorld: (i, s) =>
    set({
      defaultWorldInfrastructure: i,
      defaultWorldStations: s,
    }),

  loadScenario: (s, opts) => {
    const st = get();
    const prep = prepScenario(
      s,
      st.defaultWorldInfrastructure,
      st.defaultWorldStations,
    );
    set({
      scenarioName: s.name,
      scenarioId: opts?.scenarioId,
      durationMin: s.durationMin,
      tracks: [],
      threats: [],
      engagements: [],
      pendingEngagements: [],
      autoArmDeclinedThreatIds: [],
      suggestions: [],
      ledger: emptyLedger(),
      events: [],
      simTimeMin: 0,
      allSpawns: prep.spawns,
      pendingSpawns: [...prep.spawns],
      fireUnits: [],
      scenarioMode: prep.mode,
      infrastructure: prep.infrastructure,
      stations: prep.stations,
      playState: "playing",
      selectedThreatId: undefined,
      afterAction: null,
    });
  },

  selectAsset: (id) => set({ selectedAssetId: id }),
  selectTrack: (id) => set({ selectedTrackId: id }),
  selectThreat: (id) => set({ selectedThreatId: id }),
  setPlay: (p) => set({ playState: p }),
  togglePlay: () =>
    set((st) => ({
      playState: st.playState === "playing" ? "paused" : "playing",
    })),
  setSpeed: (s) => set({ speed: s }),
  toggleHeatmap: () =>
    set((st) => ({ showImportanceHeatmap: !st.showImportanceHeatmap })),
  hoverStation: (id) => set({ hoveredStationId: id }),

  setSimTime: (t) => {
    const st = get();
    const target = quantize(Math.max(0, Math.min(t, st.durationMin)));
    rescrubTo(set, st, target);
  },

  resetSim: () => {
    const st = get();
    rescrubTo(set, st, 0);
  },

  tick: (dtMin) => {
    const st = get();
    if (st.playState !== "playing") return;
    const advance = dtMin * st.speed;
    const newT = quantize(Math.min(st.simTimeMin + advance, st.durationMin));
    if (newT === st.simTimeMin) return;

    if (st.scenarioMode === "legacy") {
      legacyTick(set, st, newT);
    } else {
      defenseTickFromStore(set, st, newT);
    }
  },

  appendEvent: (e) => set((st) => ({ events: [...st.events, e] })),

  applyEngagement: (e, updatedStation, updatedThreat) =>
    set((st) => ({
      engagements: [...st.engagements, e],
      stations: st.stations.map((s) => (s.id === updatedStation.id ? updatedStation : s)),
      threats: st.threats.map((t) => (t.id === updatedThreat.id ? updatedThreat : t)),
    })),

  setSuggestions: (s) => set({ suggestions: s }),
  setAfterAction: (a) => set({ afterAction: a }),

  queueEngagement: (threatId, stationId) =>
    set((st) => {
      const station = st.stations.find((s) => s.id === stationId);
      const threat = st.threats.find((t) => t.id === threatId);
      if (!station || !threat) return {};
      if (station.state === "DESTROYED") return {};
      if (threat.state !== "INBOUND" && threat.state !== "ENGAGED") return {};
      if (!stationMayEngageThreat(station, threat)) return {};
      const exists = st.pendingEngagements.some(
        (pe) => pe.threatId === threatId && pe.stationId === stationId,
      );
      if (exists) return {};
      const pe: PendingEngagement = {
        id: `PE-${threatId}-${stationId}`,
        threatId,
        stationId,
        queuedAtT: st.simTimeMin,
      };
      const declined = st.autoArmDeclinedThreatIds.filter((id) => id !== threatId);
      return {
        autoArmDeclinedThreatIds: declined,
        pendingEngagements: [...st.pendingEngagements, pe],
        events: [
          ...st.events,
          {
            t: st.simTimeMin,
            kind: "ENGAGEMENT_QUEUED",
            payload: { threatId, stationId },
          },
        ],
      };
    }),

  cancelQueuedEngagement: (threatId, stationId) =>
    set((st) => {
      const next = st.pendingEngagements.filter(
        (pe) => !(pe.threatId === threatId && pe.stationId === stationId),
      );
      if (next.length === st.pendingEngagements.length) return {};
      const declined = st.autoArmDeclinedThreatIds.includes(threatId)
        ? st.autoArmDeclinedThreatIds
        : [...st.autoArmDeclinedThreatIds, threatId];
      return {
        pendingEngagements: next,
        autoArmDeclinedThreatIds: declined,
        events: [
          ...st.events,
          {
            t: st.simTimeMin,
            kind: "ENGAGEMENT_UNQUEUED",
            payload: { threatId, stationId },
          },
        ],
      };
    }),
}));

// =========================================================
// Legacy track tick (Phase 1–3 behaviour, retained)
// =========================================================
function legacyTick(
  set: (partial: Partial<SimState>) => void,
  st: SimState,
  newT: number,
) {
  const newTracks: Track[] = st.tracks.map((t) => ({ ...t }));
  const remainingPending: SpawnEntry[] = [];
  for (const p of st.pendingSpawns) {
    if (p.atTMin <= newT) {
      spawnFromSpec(newTracks, p.spec, p.atTMin);
    } else {
      remainingPending.push(p);
    }
  }
  propagateTracks(newTracks, newT);
  annotateThreatScores(newTracks, st.assets);
  set({
    simTimeMin: newT,
    tracks: newTracks,
    pendingSpawns: remainingPending,
    playState: newT >= st.durationMin ? "paused" : st.playState,
  });
}

// =========================================================
// Defense tick (delegates to engine/defense/loop.ts)
// =========================================================
function defenseTickFromStore(
  set: (partial: Partial<SimState>) => void,
  st: SimState,
  newT: number,
) {
  const partial = computeDefenseTick(st, newT);
  set(partial);
}

// =========================================================
// Track propagation (legacy)
// =========================================================
function spawnFromSpec(out: Track[], spec: ScenarioSpawn, spawnAtT: number) {
  const count = spec.count ?? 1;
  const speedKmPerMin = (spec.speedMps * 60) / 1000;
  for (let i = 0; i < count; i++) {
    const jitter = count > 1 ? (i - (count - 1) / 2) * 8 : 0;
    const fromX = spec.fromKm[0] + jitter;
    const fromY = spec.fromKm[1];
    const toX = spec.toKm[0] + jitter;
    const toY = spec.toKm[1];
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.hypot(dx, dy) || 1;
    const vx = (dx / dist) * speedKmPerMin;
    const vy = (dy / dist) * speedKmPerMin;
    const id = count > 1 ? `${spec.id}-${i + 1}` : spec.id;
    const side: Side = spec.side ?? inferSideFromY(fromY);
    const classification: Classification =
      spec.classification ??
      (spec.class === "FRIEND"
        ? "FRIEND"
        : spec.class === "CIVIL"
          ? "CIVIL"
          : side === "north"
            ? "HOSTILE"
            : side === "south"
              ? "FRIEND"
              : "UNKNOWN");
    out.push({
      id,
      classId: spec.class as Track["classId"],
      side,
      posKm: { x: fromX, y: fromY },
      velocityKmPerMin: { vx, vy },
      altitudeM: spec.altitudeM,
      detectedBySensors: [],
      classification,
      confidence: 0.8,
      firstSeenT: spawnAtT,
      destKm: { x: toX, y: toY },
      trail: [{ x: fromX, y: fromY, t: spawnAtT }],
    });
  }
}

function inferSideFromY(y: number): Side {
  if (y < 600) return "north";
  if (y > 700) return "south";
  return "neutral";
}

function propagateTracks(tracks: Track[], newT: number) {
  for (const trk of tracks) {
    if (trk.arrived) continue;
    const dtMin = newT - trk.firstSeenT;
    if (dtMin < 0) continue;
    const startX = trk.trail?.[0]?.x ?? trk.posKm.x;
    const startY = trk.trail?.[0]?.y ?? trk.posKm.y;
    const dest = trk.destKm;
    if (!dest) {
      trk.posKm = {
        x: startX + trk.velocityKmPerMin.vx * dtMin,
        y: startY + trk.velocityKmPerMin.vy * dtMin,
      };
    } else {
      const dx = dest.x - startX;
      const dy = dest.y - startY;
      const totalDist = Math.hypot(dx, dy);
      const speed = Math.hypot(
        trk.velocityKmPerMin.vx,
        trk.velocityKmPerMin.vy,
      );
      const traveled = speed * dtMin;
      if (traveled >= totalDist) {
        trk.posKm = { x: dest.x, y: dest.y };
        trk.arrived = true;
      } else {
        const k = traveled / totalDist;
        trk.posKm = { x: startX + dx * k, y: startY + dy * k };
      }
    }
    if (!trk.trail) trk.trail = [];
    const last = trk.trail[trk.trail.length - 1];
    if (!last || newT - last.t > 0.05) {
      trk.trail.push({ x: trk.posKm.x, y: trk.posKm.y, t: newT });
      const cutoff = newT - 0.5;
      while (trk.trail.length > 1 && trk.trail[0].t < cutoff) {
        trk.trail.shift();
      }
    }
  }
}

function annotateThreatScores(tracks: Track[], assets: Asset[]) {
  const southAssets = assets.filter((a) => a.side === "south");
  for (const trk of tracks) {
    if (trk.classification === "FRIEND" || trk.classification === "CIVIL") {
      trk.threatScore = 0;
      continue;
    }
    const speed = Math.hypot(
      trk.velocityKmPerMin.vx,
      trk.velocityKmPerMin.vy,
    );
    let bestTime = Infinity;
    for (const a of southAssets) {
      const dx = a.posKm.x - trk.posKm.x;
      const dy = a.posKm.y - trk.posKm.y;
      const dist = Math.hypot(dx, dy);
      const t = speed > 0.001 ? dist / speed : Infinity;
      if (t < bestTime) bestTime = t;
    }
    trk.threatScore = bestTime === Infinity ? 0 : 1 / Math.max(bestTime, 0.05);
  }
}

function rescrubTo(
  set: (partial: Partial<SimState>) => void,
  st: SimState,
  target: number,
) {
  if (st.scenarioMode === "legacy") {
    const newTracks: Track[] = [];
    const stillPending: SpawnEntry[] = [];
    for (const p of st.allSpawns) {
      if (p.atTMin <= target) {
        spawnFromSpec(newTracks, p.spec, p.atTMin);
      } else {
        stillPending.push(p);
      }
    }
    propagateTracks(newTracks, target);
    annotateThreatScores(newTracks, st.assets);
    set({
      tracks: newTracks,
      simTimeMin: target,
      pendingSpawns: stillPending,
      fireUnits: [],
      engagements: [],
      events: [],
      playState: target >= st.durationMin ? "paused" : st.playState,
    });
    return;
  }
  // Defense rescrub: reset world + re-run forward to target without operator inputs.
  // For demo/jury simplicity we just reset to t=0 (defense state is non-trivial to rewind).
  set({
    simTimeMin: 0,
    threats: [],
    engagements: [],
    pendingEngagements: [],
    autoArmDeclinedThreatIds: [],
    suggestions: [],
    ledger: emptyLedger(),
    events: [],
    pendingSpawns: [...st.allSpawns],
    infrastructure: st.infrastructure.map((a) => ({
      ...a,
      state: "INTACT",
      damageTakenUsd: 0,
    })),
    stations: st.stations.map((s) => ({
      ...s,
      magazine: s.magazineMax,
      state: "READY",
      reloadingUntilT: undefined,
    })),
    afterAction: null,
    playState: "paused",
  });
}
