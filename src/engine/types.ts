export type Side = "north" | "south" | "neutral";

export type ThreatClassId =
  | "FIGHTER_4GEN"
  | "FIGHTER_5GEN"
  | "BOMBER"
  | "HELI"
  | "CM_SUBSONIC"
  | "CM_SUPERSONIC"
  | "SRBM"
  | "MRBM"
  | "HGV"
  | "HCM"
  | "UAV_MALE_HALE"
  | "LOITERING_MUNITION"
  | "DRONE_SWARM"
  | "DRONE"
  | "GLIDE_BOMB"
  | "ARM";

export type EffectorClassId =
  | "SAM_LR"
  | "SAM_MR"
  | "SAM_SR"
  | "VSHORAD"
  | "AAA_CRAM"
  | "FIGHTER_BVR"
  | "FIGHTER_WVR"
  | "EW_JAM"
  | "DEW_LASER"
  | "DEW_HPM"
  | "CUAS_DEDICATED";

export type Classification =
  | "HOSTILE"
  | "SUSPECT"
  | "UNKNOWN"
  | "FRIEND"
  | "CIVIL";

export interface Asset {
  id: string;
  name: string;
  side: Side;
  type: "air_base" | "capital" | "major_city";
  context: "mainland" | "island";
  posKm: { x: number; y: number };
}

export interface Track {
  id: string;
  classId: ThreatClassId | "FRIEND" | "CIVIL";
  side: Side;
  posKm: { x: number; y: number };
  velocityKmPerMin: { vx: number; vy: number };
  altitudeM: number;
  detectedBySensors: string[];
  classification: Classification;
  confidence: number;
  firstSeenT: number;
  threatScore?: number;
  assignedEngagementId?: string;
  trail?: { x: number; y: number; t: number }[];
  destKm?: { x: number; y: number };
  arrived?: boolean;
}

export interface FireUnit {
  id: string;
  baseAssetId: string;
  effectorClass: EffectorClassId;
  ammoReady: number;
  ammoReserve: number;
  reloadMin: number;
  status: "READY" | "ENGAGING" | "RELOADING" | "DAMAGED";
  rangeKm: number;
}

export interface SimEvent {
  t: number;
  kind: string;
  payload?: unknown;
}

// =========================================================
// Defense system — Infrastructure
// =========================================================
export type InfrastructureType =
  | "military_airport"
  | "civilian_airport"
  | "capital"
  | "major_city"
  | "small_town"
  | "power_plant"
  | "nuclear_plant"
  | "refinery"
  | "port"
  | "comms_tower"
  | "empty_field";

export type InfrastructureSize = "S" | "M" | "L" | "XL";

export interface Infrastructure {
  id: string;
  name: string;
  type: InfrastructureType;
  posKm: { x: number; y: number };
  size: InfrastructureSize;
  /** Damage in $ if a single typical threat hits. */
  damageOnHitUsd: number;
  /** Authored override for unusual cases. Otherwise computed from type+size. */
  importanceOverride?: number;
  state: "INTACT" | "DAMAGED" | "DESTROYED";
  /** Cumulative damage taken so far in $. */
  damageTakenUsd: number;
}

// =========================================================
// Defense weapons & stations
// =========================================================
export type DefenseWeaponType =
  | "SAM_LR"
  | "SAM_MR"
  | "SAM_SR"
  | "AAA"
  | "LASER"
  /** Airborne picket — BVR-style envelope; uses same engagement rules as SAMs. */
  | "FIGHTER_CAP";

/** Circular patrol: position is `center + radius * (cos θ, sin θ)`, advanced each tick. */
export interface StationMobilePatrol {
  centerKm: { x: number; y: number };
  radiusKm: number;
  /** Orbit rate in rad per sim-minute (sign = direction). */
  omegaRadPerMin: number;
  /** Current angle on the orbit (rad). */
  angleRad: number;
}

export interface DefenseStation {
  id: string;
  name: string;
  /** Coalition that operates this battery (`south` = defender in Boreal). Omitted = south. */
  side?: Side;
  posKm: { x: number; y: number };
  weapon: DefenseWeaponType;
  rangeKm: number;
  costPerShotUsd: number;
  magazine: number;
  magazineMax: number;
  /** sim minutes per round. */
  reloadMin: number;
  reloadingUntilT?: number;
  state: "READY" | "RELOADING" | "FIRING" | "DESTROYED";
  emcon: "WHITE" | "AMBER" | "RED";
  /** When set, `posKm` is driven by patrol each defense tick (mobile “tower”). */
  mobilePatrol?: StationMobilePatrol;
}

// =========================================================
// Threats
// =========================================================
export type ThreatClass =
  | "DRONE"
  | "LOITERING_MUNITION"
  | "CM_SUBSONIC"
  | "CM_SUPERSONIC"
  | "SRBM"
  | "GLIDE_BOMB"
  | "FIGHTER_4GEN"
  | "BOMBER";

export interface Threat {
  id: string;
  class: ThreatClass;
  posKm: { x: number; y: number };
  velocityKmPerMin: { vx: number; vy: number };
  altitudeM: number;
  speedMps: number;
  classification: "HOSTILE" | "SUSPECT" | "UNKNOWN";
  detectedAtT: number;
  /** Resolved Infrastructure id. */
  targetAssetId: string;
  threatUnitCostUsd: number;
  threatLevel: number;
  threatBand: "LOW" | "MED" | "HIGH" | "CRIT";
  etaMin: number;
  state: "INBOUND" | "ENGAGED" | "DESTROYED" | "HIT_TARGET" | "EXPIRED";
  /** Endpoints (in km). For propagation/path drawing. */
  fromKm: { x: number; y: number };
  toKm: { x: number; y: number };
  spawnedAtT: number;
  /** Nation / coalition that launched this track. Defender only engages opposite-side launches. */
  launchSide?: Side;
}

// =========================================================
// Engagements (operator-resolved; defense system shape)
// =========================================================
export interface Engagement {
  id: string;
  threatId: string;
  stationId: string;
  weapon: DefenseWeaponType;
  pkUsed: number;
  costUsd: number;
  rolledOutcome: "HIT" | "MISS";
  resolvedAtT: number;
  decisionSnapshot: {
    rank: number;
    counterfactualUsd: number;
    rangeKm: number;
    distanceKm: number;
    suggestedAtT: number;
  };
}

// =========================================================
// Suggestions (per-threat, recomputed each tick)
// =========================================================
import type { InterceptWindow } from "./defense/intercept";
export type { InterceptWindow };

export interface DefenseSuggestion {
  id: string;
  threatId: string;
  stationId: string;
  stationName: string;
  weapon: DefenseWeaponType;
  inRange: boolean;
  distanceKm: number;
  rangeKm: number;
  pk: number;
  costUsd: number;
  ammoLeft: number;
  ammoMax: number;
  ratio: number;
  rank: number;
  counterfactualUsd: number;
  feasible: boolean;
  reasonText: string;
  /** Geometric intercept window (computed each tick from the threat's
   *  straight-line trajectory toward its aim point). */
  intercept?: InterceptWindow;
}

export interface NoopSuggestion {
  id: string; // S-${threatId}-NOOP
  threatId: string;
  expectedDamageUsd: number;
}

/**
 * A pre-armed (queued) engagement. The operator picks a station against a
 * threat that may not yet be in range / ready / loaded. Each tick the loop
 * checks each PendingEngagement; when all conditions become feasible
 * (in range, station READY, magazine > 0, pk > 0) it auto-fires exactly one
 * shot using the same seeded resolution as a manual click.
 *
 * Single-shot semantics: after firing, the entry is removed regardless of
 * HIT/MISS. The operator can re-queue if they want a follow-up shot.
 */
export interface PendingEngagement {
  id: string; // PE-${threatId}-${stationId}
  threatId: string;
  stationId: string;
  queuedAtT: number;
}

// =========================================================
// Ledger
// =========================================================
export interface Ledger {
  damagePreventedUsd: number;
  defenderSpendUsd: number;
  enemySpendUsd: number;
  damageTakenUsd: number;
  threatsDestroyed: number;
  threatsLeaked: number;
  assetsLost: { assetId: string; importance: number }[];
}

// ---------- Scenario JSON ----------

export interface ScenarioSpawn {
  t: number;
  id: string;
  /** Phase 1–3 tracks use ThreatClassId; defense scenarios use ThreatClass. */
  class: ThreatClassId | ThreatClass | "FRIEND" | "CIVIL";
  count?: number;
  fromKm: [number, number];
  toKm: [number, number];
  speedMps: number;
  altitudeM: number;
  side?: Side;
  classification?: Classification;
  /** Defense scenarios: which Infrastructure id is the aim point. */
  targetAssetId?: string;
  /** Defense scenarios: per-unit acquisition cost of the threat. */
  threatUnitCostUsd?: number;
  /** Defense: firing side (`north` = Country X outbound). Inferred from `fromKm` when omitted. */
  launchSide?: Side;
}

export interface ScenarioWave {
  label?: string;
  spawns: ScenarioSpawn[];
}

/**
 * Steady threat feed (expanded at load into many spawn entries). Use instead of
 * discrete `waves` when the scenario should feel like a continuous barrage.
 */
export interface ScenarioContinuousStream {
  /** Sim minutes between spawn groups (each group is `burst` threats). */
  everyMin: number;
  startMin?: number;
  endMin?: number;
  /** Unique prefix for generated threat ids (`${idPrefix}-0`, …). */
  idPrefix: string;
  class: ThreatClass;
  fromKm: [number, number];
  /** Fallback aim in JSON; resolved from `targetAssetId` at load when possible. */
  toKm: [number, number];
  targetAssetId: string;
  speedMps: number;
  altitudeM: number;
  threatUnitCostUsd?: number;
  /** Threats spawned each `everyMin` tick (default 1). */
  burst?: number;
  /** Lateral offset at launch (km), cycled by spawn index / burst slot. */
  lateralSpreadKm?: number;
  /** Copied onto each spawn; inferred from `fromKm` when omitted. */
  launchSide?: Side;
}

export interface ScenarioEvent {
  t: number;
  kind: string;
  [k: string]: unknown;
}

export type ScenarioMode = "legacy" | "defense";

export interface Scenario {
  name: string;
  durationMin: number;
  /** "legacy" = Phase 1–3 track propagation; "defense" = new defense system. */
  mode?: ScenarioMode;
  /** Optional override for the default world.json infrastructure + stations. */
  infrastructure?: Infrastructure[];
  stations?: DefenseStation[];
  /** Phase 1–3 (legacy) flat list. */
  spawns?: ScenarioSpawn[];
  /** Phase B–E (defense) wave list. Either spawns, waves, or continuousStreams. */
  waves?: ScenarioWave[];
  /** Defense: steady streams expanded at load (no discrete wave steps). */
  continuousStreams?: ScenarioContinuousStream[];
  events?: ScenarioEvent[];
}
