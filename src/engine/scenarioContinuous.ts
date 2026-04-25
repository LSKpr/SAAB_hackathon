import type { Infrastructure, Scenario, ScenarioSpawn } from "./types";

const TICK_QUANT = 0.05;

function quantize(t: number): number {
  return Math.round(t / TICK_QUANT) * TICK_QUANT;
}

export interface SpawnEntry {
  atTMin: number;
  spec: ScenarioSpawn;
}

/**
 * Expands `scenario.continuousStreams` into discrete spawn entries so the tick
 * loop stays unchanged: a steady barrage without hand-authored wave steps.
 */
export function expandContinuousStreams(
  scenario: Scenario,
  defaultInfra: Infrastructure[],
): SpawnEntry[] {
  const streams = scenario.continuousStreams;
  if (!streams?.length) return [];

  const infraList = scenario.infrastructure ?? defaultInfra;
  const infraById = new Map(infraList.map((a) => [a.id, a]));
  const dur = scenario.durationMin;
  const out: SpawnEntry[] = [];

  for (const stream of streams) {
    const every = stream.everyMin;
    if (!Number.isFinite(every) || every <= 0) continue;

    const start = Math.max(0, stream.startMin ?? 0);
    const end = Math.min(stream.endMin ?? dur, dur);
    const lateral = stream.lateralSpreadKm ?? 8;
    const burst = Math.max(1, Math.floor(stream.burst ?? 1));

    const target = stream.targetAssetId
      ? infraById.get(stream.targetAssetId)
      : undefined;
    const toX = target?.posKm.x ?? stream.toKm[0];
    const toY = target?.posKm.y ?? stream.toKm[1];

    let spawnIndex = 0;
    for (let t = start; t < end - 1e-12; t += every) {
      const atT = quantize(Math.min(t, dur));
      for (let b = 0; b < burst; b++) {
        const jitter =
          burst > 1
            ? (b - (burst - 1) / 2) * lateral
            : ((spawnIndex % 9) - 4) * lateral;
        const fromX = stream.fromKm[0] + jitter;
        const fromY = stream.fromKm[1];
        const id = `${stream.idPrefix}-${spawnIndex}`;
        spawnIndex += 1;

        const spec: ScenarioSpawn = {
          t: atT,
          id,
          class: stream.class,
          fromKm: [fromX, fromY],
          toKm: [toX, toY],
          speedMps: stream.speedMps,
          altitudeM: stream.altitudeM,
          targetAssetId: stream.targetAssetId,
          threatUnitCostUsd: stream.threatUnitCostUsd,
          launchSide: stream.launchSide,
        };
        out.push({ atTMin: atT, spec });
      }
    }
  }

  out.sort((a, b) =>
    a.atTMin !== b.atTMin
      ? a.atTMin - b.atTMin
      : a.spec.id.localeCompare(b.spec.id),
  );
  return out;
}
