import { useSimStore } from "../../engine/store";
import type { Threat } from "../../engine/types";
import SuggestionCard from "./SuggestionCard";
import { counterfactual } from "../../engine/defense/cost";
import { fmtMin } from "./format";

const BAND_COLOR: Record<Threat["threatBand"], string> = {
  CRIT: "bg-red-500/20 text-red-300 border-red-400/40",
  HIGH: "bg-orange-500/20 text-orange-300 border-orange-400/40",
  MED: "bg-yellow-500/20 text-yellow-300 border-yellow-400/40",
  LOW: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
};

const STATE_COLOR: Record<Threat["state"], string> = {
  INBOUND: "text-red-300",
  ENGAGED: "text-amber-300",
  DESTROYED: "text-emerald-300",
  HIT_TARGET: "text-rose-400",
  EXPIRED: "text-slate-500",
};

export default function ThreatCard({ threat }: { threat: Threat }) {
  const selectThreat = useSimStore((s) => s.selectThreat);
  const selectedThreatId = useSimStore((s) => s.selectedThreatId);
  const isSel = threat.id === selectedThreatId;
  const suggestions = useSimStore((s) =>
    s.suggestions.filter((x) => x.threatId === threat.id),
  );
  const queuedCount = useSimStore(
    (s) =>
      s.pendingEngagements.filter((pe) => pe.threatId === threat.id).length,
  );
  const target = useSimStore((s) =>
    s.infrastructure.find((a) => a.id === threat.targetAssetId),
  );
  // Soonest-firing pre-armed engagement against this threat: walk
  // pendingEngagements, look up each matching suggestion (carries the
  // intercept window), pick the one with the earliest enterT in the
  // future. `alreadyInRange` counts as "fires now-ish" — we treat its
  // ETA as 0 so it floats up.
  const nextFire = useSimStore((s) => {
    let best: { stationName: string; etaMin: number } | undefined;
    for (const pe of s.pendingEngagements) {
      if (pe.threatId !== threat.id) continue;
      const sug = s.suggestions.find(
        (x) => x.threatId === pe.threatId && x.stationId === pe.stationId,
      );
      if (!sug?.intercept) continue;
      const w = sug.intercept;
      if (w.noIntercept || w.hitsBeforeEntry) continue;
      const eta = w.alreadyInRange ? 0 : Math.max(0, w.enterT - s.simTimeMin);
      if (!best || eta < best.etaMin) {
        best = { stationName: sug.stationName, etaMin: eta };
      }
    }
    return best;
  });

  const dollarCf = target ? counterfactual(threat, target) : 0;
  const speedKmh = (threat.speedMps * 3600) / 1000;

  const active = threat.state === "INBOUND" || threat.state === "ENGAGED";
  const showDetail = isSel || !active;

  return (
    <div
      className={`border-b border-panelBorder/60 px-2 py-2 ${
        isSel ? "bg-white/[0.06]" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => selectThreat(isSel ? undefined : threat.id)}
        className="w-full text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`shrink-0 w-2 h-2 rounded-full ${isSel ? "bg-cyan-300" : "bg-slate-500"}`} />
          <span className="font-mono font-semibold text-slate-100 truncate">
            {threat.id}
          </span>
          <span className="shrink-0 text-[10px] text-slate-400 font-mono">{threat.class}</span>
          {queuedCount > 0 && (
            <span
              className="shrink-0 px-1.5 py-0.5 text-[10px] rounded border bg-amber-400/15 text-amber-200 border-amber-300/40 font-mono"
              title="Pre-armed — auto-fires when in range"
            >
              ⏱ {queuedCount}
            </span>
          )}
          <span className="ml-auto shrink-0 flex items-center gap-1.5">
            <span
              className={`px-1.5 py-0.5 text-[10px] rounded border ${BAND_COLOR[threat.threatBand]}`}
            >
              {threat.threatBand}
            </span>
            <span className="text-[10px] font-mono text-slate-300 tabular-nums">
              {threat.threatLevel}
            </span>
          </span>
        </div>
        {!showDetail && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-mono text-slate-500">
            <span className="text-slate-400">ETA {fmtMin(threat.etaMin)}</span>
            <span className="truncate max-w-[140px]">
              → {target?.name ?? threat.targetAssetId}
            </span>
            <span className={`uppercase ${STATE_COLOR[threat.state]}`}>
              {threat.state}
            </span>
          </div>
        )}
        {showDetail && (
          <div className="mt-1 text-[10px] font-mono text-slate-400 leading-tight">
            <div>
              speed {speedKmh.toFixed(0)} km/h · alt {threat.altitudeM} m · ETA{" "}
              {fmtMin(threat.etaMin)}
            </div>
            <div>
              → {target?.name ?? threat.targetAssetId}{" "}
              {target ? `(${target.type.replace("_", " ")})` : ""}
            </div>
            <div>
              damage if hits: ${(dollarCf / 1_000_000).toFixed(1)}M · enemy spent: $
              {(threat.threatUnitCostUsd / 1_000_000).toFixed(2)}M
            </div>
            <div className={`uppercase ${STATE_COLOR[threat.state]}`}>
              {threat.state}
            </div>
          </div>
        )}
      </button>

      {active && isSel && (
          <div className="mt-1.5 border-l border-cyan-400/20 pl-2 space-y-1">
            {nextFire && (
              <div className="px-1.5 py-0.5 text-[10px] font-mono text-amber-200/90 bg-amber-400/[0.06] border border-amber-400/30 rounded">
                next fire: {nextFire.stationName} in {fmtMin(nextFire.etaMin)}
              </div>
            )}
            {suggestions.map((s) => (
              <SuggestionCard key={s.id} sug={s} />
            ))}
            {suggestions.length === 0 && (
              <div className="px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                No interceptors available for this track (geometry or weapon class).
              </div>
            )}
            <div className="px-1.5 py-1 border border-dashed border-slate-600/60 rounded text-[10px] font-mono">
              <div className="text-slate-300">— Do nothing</div>
              <div className="text-slate-500">
                expected damage: ${(dollarCf / 1_000_000).toFixed(1)}M
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
