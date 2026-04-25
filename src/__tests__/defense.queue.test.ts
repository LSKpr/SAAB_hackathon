import { describe, expect, it } from "vitest";
import { computeDefenseTick } from "../engine/defense/loop";
import type {
  DefenseStation,
  Engagement,
  Infrastructure,
  Ledger,
  PendingEngagement,
  Threat,
} from "../engine/types";
import type { SimState } from "../engine/store";

const target: Infrastructure = {
  id: "firewatch",
  name: "Firewatch",
  type: "military_airport",
  size: "L",
  posKm: { x: 1398, y: 1072 },
  damageOnHitUsd: 250_000_000,
  state: "INTACT",
  damageTakenUsd: 0,
};

function station(p: Partial<DefenseStation>): DefenseStation {
  return {
    id: "stn-mr",
    name: "Firewatch MR",
    posKm: { x: 1398, y: 1072 },
    weapon: "SAM_MR",
    rangeKm: 60,
    costPerShotUsd: 1_000_000,
    magazine: 8,
    magazineMax: 8,
    reloadMin: 2,
    state: "READY",
    emcon: "WHITE",
    ...p,
  };
}

function threat(p: Partial<Threat>): Threat {
  return {
    id: "M-09",
    class: "CM_SUBSONIC",
    posKm: { x: 1398, y: 800 }, // 272 km north of Firewatch — well outside SAM_MR (60 km)
    velocityKmPerMin: { vx: 0, vy: 14.4 }, // 240 m/s southbound
    altitudeM: 80,
    speedMps: 240,
    classification: "HOSTILE",
    detectedAtT: 0,
    targetAssetId: "firewatch",
    threatUnitCostUsd: 1_000_000,
    threatLevel: 70,
    threatBand: "HIGH",
    etaMin: 19,
    state: "INBOUND",
    fromKm: { x: 1398, y: 200 },
    toKm: { x: 1398, y: 1072 },
    spawnedAtT: 0,
    ...p,
  };
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

function baseState(p: {
  threats: Threat[];
  stations: DefenseStation[];
  infrastructure: Infrastructure[];
  pendingEngagements: PendingEngagement[];
  simTimeMin: number;
  autoArmDeclinedThreatIds?: string[];
}): SimState {
  // We only need the slices computeDefenseTick reads. Cast through `unknown`
  // to satisfy the broader SimState shape without enumerating every field.
  return {
    assets: [],
    tracks: [],
    fireUnits: [],
    infrastructure: p.infrastructure,
    stations: p.stations,
    threats: p.threats,
    engagements: [],
    pendingEngagements: p.pendingEngagements,
    autoArmDeclinedThreatIds: p.autoArmDeclinedThreatIds ?? [],
    suggestions: [],
    ledger: emptyLedger(),
    showImportanceHeatmap: false,
    scenarioMode: "defense",
    defaultWorldInfrastructure: [],
    defaultWorldStations: [],
    events: [],
    simTimeMin: p.simTimeMin,
    durationMin: 60,
    scenarioName: "test",
    scenarioId: "S-test",
    playState: "playing",
    speed: 1,
    allSpawns: [],
    pendingSpawns: [],
    afterAction: null,
    // unused setters — never invoked by the pure tick function:
    setAssets: () => {},
    setDefaultWorld: () => {},
    loadScenario: () => {},
    selectAsset: () => {},
    selectTrack: () => {},
    selectThreat: () => {},
    setPlay: () => {},
    togglePlay: () => {},
    setSpeed: () => {},
    setSimTime: () => {},
    resetSim: () => {},
    tick: () => {},
    appendEvent: () => {},
    toggleHeatmap: () => {},
    hoverStation: () => {},
    applyEngagement: () => {},
    setSuggestions: () => {},
    setAfterAction: () => {},
    queueEngagement: () => {},
    cancelQueuedEngagement: () => {},
  } as SimState;
}

describe("auto-fire of pending engagements", () => {
  it("does NOT fire while threat is out of range", () => {
    const t = threat({}); // 272 km out, well beyond 60 km SAM_MR range
    const s = station({});
    const pe: PendingEngagement = {
      id: "PE-M-09-stn-mr",
      threatId: t.id,
      stationId: s.id,
      queuedAtT: 0,
    };
    const st = baseState({
      threats: [t],
      stations: [s],
      infrastructure: [target],
      pendingEngagements: [pe],
      simTimeMin: 0,
    });
    const out = computeDefenseTick(st, 1.0); // advance 1 sim-min
    expect(out.engagements?.length ?? 0).toBe(0);
    expect(out.pendingEngagements?.length).toBe(1);
    // Station ammo unchanged.
    expect(out.stations?.[0].magazine).toBe(8);
  });

  it("auto-fires once the propagated threat enters range", () => {
    // Place threat just barely outside range, ticking forward should bring it in.
    const t = threat({ posKm: { x: 1398, y: 1010 } }); // 62 km away — just out
    const s = station({});
    const pe: PendingEngagement = {
      id: "PE-M-09-stn-mr",
      threatId: t.id,
      stationId: s.id,
      queuedAtT: 0,
    };
    const st = baseState({
      threats: [t],
      stations: [s],
      infrastructure: [target],
      pendingEngagements: [pe],
      simTimeMin: 0,
    });
    // Advance 1 sim-min: speed is 14.4 km/min southbound, so y goes 1010 → 1024.4.
    // distance to (1398, 1072) = 1072 - 1024.4 = 47.6 km → in range.
    const out = computeDefenseTick(st, 1.0);
    expect(out.pendingEngagements?.length).toBe(0);
    expect(out.engagements?.length).toBe(1);
    const e = out.engagements?.[0] as Engagement;
    expect(e.stationId).toBe("stn-mr");
    expect(e.threatId).toBe("M-09");
    // Station consumed 1 round.
    expect(out.stations?.[0].magazine).toBe(7);
    // Ledger debited the per-shot cost.
    expect(out.ledger?.defenderSpendUsd).toBe(1_000_000);
  });

  it("drops the queued shot when the threat is no longer engageable", () => {
    const t = threat({ state: "DESTROYED" });
    const s = station({});
    const pe: PendingEngagement = {
      id: "PE-M-09-stn-mr",
      threatId: t.id,
      stationId: s.id,
      queuedAtT: 0,
    };
    const st = baseState({
      threats: [t],
      stations: [s],
      infrastructure: [target],
      pendingEngagements: [pe],
      simTimeMin: 0,
    });
    const out = computeDefenseTick(st, 1.0);
    expect(out.pendingEngagements?.length).toBe(0);
    expect(out.engagements?.length).toBe(0);
    expect(out.stations?.[0].magazine).toBe(8);
  });

  it("does NOT fire when the weapon has zero base Pk (e.g. SAM_SR vs SRBM)", () => {
    const t = threat({
      class: "SRBM",
      posKm: { x: 1398, y: 1072 }, // co-located with the station — definitely "in range"
    });
    const s = station({ weapon: "SAM_SR", rangeKm: 25 }); // SAM_SR vs SRBM = pk 0.0
    const pe: PendingEngagement = {
      id: "PE-M-09-stn-mr",
      threatId: t.id,
      stationId: s.id,
      queuedAtT: 0,
    };
    const st = baseState({
      threats: [t],
      stations: [s],
      infrastructure: [target],
      pendingEngagements: [pe],
      simTimeMin: 0,
    });
    const out = computeDefenseTick(st, 0.1);
    // pk == 0 → entry is dropped (won't ever fire).
    expect(out.pendingEngagements?.length).toBe(0);
    expect(out.engagements?.length).toBe(0);
  });

  it("waits while the station is reloading even though the threat is in range", () => {
    const t = threat({ posKm: { x: 1398, y: 1050 } }); // 22 km — well in range
    const s = station({
      state: "RELOADING",
      magazine: 0,
      reloadingUntilT: 5.0, // not done yet at t=1
    });
    const pe: PendingEngagement = {
      id: "PE-M-09-stn-mr",
      threatId: t.id,
      stationId: s.id,
      queuedAtT: 0,
    };
    const st = baseState({
      threats: [t],
      stations: [s],
      infrastructure: [target],
      pendingEngagements: [pe],
      simTimeMin: 0,
    });
    const out = computeDefenseTick(st, 1.0);
    expect(out.pendingEngagements?.length).toBe(1);
    expect(out.engagements?.length).toBe(0);
  });

  it("drops a queued shot when intercept is permanently impossible (noIntercept)", () => {
    // Station off the threat's path: SAM_MR with R=30 placed far west so the
    // straight-line south-bound trajectory bypasses the disc entirely.
    const t = threat({
      posKm: { x: 1398, y: 800 },
      velocityKmPerMin: { vx: 0, vy: 14.4 },
    });
    const s = station({
      id: "off-path",
      name: "Off-path",
      rangeKm: 30,
      posKm: { x: 1000, y: 800 }, // 398 km west of the threat's path
    });
    const pe: PendingEngagement = {
      id: `PE-${t.id}-${s.id}`,
      threatId: t.id,
      stationId: s.id,
      queuedAtT: 0,
    };
    const st = baseState({
      threats: [t],
      stations: [s],
      infrastructure: [target],
      pendingEngagements: [pe],
      simTimeMin: 0,
    });
    const out = computeDefenseTick(st, 0.1);
    // Geometry says trajectory never crosses range → drop the queue.
    expect(out.pendingEngagements?.length).toBe(0);
    expect(out.engagements?.length).toBe(0);
    expect(out.stations?.[0].magazine).toBe(8);
  });

  it("auto pre-arms the best suggestion when no queue exists", () => {
    // 62 km from station — out of range so the tick does not also auto-fire.
    const t = threat({ posKm: { x: 1398, y: 1010 } });
    const s = station({});
    const st = baseState({
      threats: [t],
      stations: [s],
      infrastructure: [target],
      pendingEngagements: [],
      simTimeMin: 0,
    });
    const out = computeDefenseTick(st, 0.05);
    expect(out.pendingEngagements?.length).toBe(1);
    expect(out.pendingEngagements?.[0]?.stationId).toBe("stn-mr");
    expect(out.events?.some((e) => e.kind === "ENGAGEMENT_AUTO_QUEUED")).toBe(true);
  });

  it("skips auto pre-arm when threat is in autoArmDeclinedThreatIds", () => {
    const t = threat({ posKm: { x: 1398, y: 1010 } });
    const s = station({});
    const st = baseState({
      threats: [t],
      stations: [s],
      infrastructure: [target],
      pendingEngagements: [],
      simTimeMin: 0,
      autoArmDeclinedThreatIds: [t.id],
    });
    const out = computeDefenseTick(st, 0.05);
    expect(out.pendingEngagements?.length).toBe(0);
  });

  it("auto-fires once reload completes — same tick", () => {
    const t = threat({ posKm: { x: 1398, y: 1050 } }); // 22 km — in range
    const s = station({
      state: "RELOADING",
      magazine: 0,
      reloadingUntilT: 0.5, // done by tick t=1
    });
    const pe: PendingEngagement = {
      id: "PE-M-09-stn-mr",
      threatId: t.id,
      stationId: s.id,
      queuedAtT: 0,
    };
    const st = baseState({
      threats: [t],
      stations: [s],
      infrastructure: [target],
      pendingEngagements: [pe],
      simTimeMin: 0,
    });
    const out = computeDefenseTick(st, 1.0);
    // Reload step refilled magazine & set state READY before auto-fire ran.
    expect(out.engagements?.length).toBe(1);
    expect(out.pendingEngagements?.length).toBe(0);
    // After firing once, magazine = magazineMax - 1.
    expect(out.stations?.[0].magazine).toBe(7);
  });
});
