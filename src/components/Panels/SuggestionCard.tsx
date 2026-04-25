import { useSimStore } from "../../engine/store";
import type { DefenseSuggestion, ThreatClass } from "../../engine/types";
import { resolveEngagementClick } from "../../engine/defense/resolve";
import { basePk } from "../../engine/defense/effectiveness";
import { fmtMin } from "./format";

const RANK_COLOR: Record<number, string> = {
  1: "bg-cyan-400/20 text-cyan-200 border-cyan-300/40",
  2: "bg-sky-400/15 text-sky-200 border-sky-300/30",
  3: "bg-slate-400/15 text-slate-300 border-slate-300/30",
};

function pkColor(p: number): string {
  if (p >= 0.7) return "text-emerald-300";
  if (p >= 0.4) return "text-amber-300";
  if (p > 0) return "text-red-300";
  return "text-slate-500";
}

interface ButtonState {
  kind: "engage" | "queued" | "prearm" | "disabled";
  /** Tooltip on disabled buttons explaining why. */
  disabledReason?: string;
  /** Sub-line copy override (otherwise the default ratio / reasonText line is shown). */
  subline?: string;
}

export default function SuggestionCard({ sug }: { sug: DefenseSuggestion }) {
  const setHovered = useSimStore((s) => s.hoverStation);
  const queueEngagement = useSimStore((s) => s.queueEngagement);
  const cancelQueued = useSimStore((s) => s.cancelQueuedEngagement);
  const isQueued = useSimStore((s) =>
    s.pendingEngagements.some(
      (pe) => pe.threatId === sug.threatId && pe.stationId === sug.stationId,
    ),
  );
  const stationState = useSimStore(
    (s) => s.stations.find((st) => st.id === sug.stationId)?.state,
  );
  const threatClass = useSimStore(
    (s) => s.threats.find((t) => t.id === sug.threatId)?.class,
  );
  const simT = useSimStore((s) => s.simTimeMin);

  const state = decideButtonState({ sug, isQueued, stationState, threatClass, simT });

  const handleEngage = () => {
    if (!sug.feasible) return;
    resolveEngagementClick(sug);
  };
  const handleQueue = () => queueEngagement(sug.threatId, sug.stationId);
  const handleCancel = () => cancelQueued(sug.threatId, sug.stationId);

  const rankBadge = sug.feasible
    ? RANK_COLOR[sug.rank] ?? "bg-slate-400/15 text-slate-300 border-slate-300/30"
    : isQueued
      ? "bg-amber-400/20 text-amber-200 border-amber-300/40"
      : "bg-slate-700/40 text-slate-500 border-slate-700/50";
  const rankText = sug.feasible ? `#${sug.rank}` : isQueued ? "Q" : "—";

  const wrapperBorder = isQueued
    ? "border-amber-400/40 bg-amber-400/[0.06]"
    : sug.feasible
      ? "border-cyan-400/20 bg-white/[0.03]"
      : "border-slate-700/40 bg-white/[0.015]";

  // ETA badge: only for not-yet-feasible suggestions whose path enters the
  // disc in the future. Rendered next to the rank to draw the eye.
  const etaBadge =
    !sug.feasible &&
    sug.intercept &&
    !sug.intercept.alreadyInRange &&
    !sug.intercept.noIntercept &&
    !sug.intercept.hitsBeforeEntry
      ? fmtMin(sug.intercept.enterT - simT)
      : null;

  return (
    <div
      onMouseEnter={() => setHovered(sug.stationId)}
      onMouseLeave={() => setHovered(undefined)}
      className={`px-1.5 py-1.5 rounded border text-[10px] font-mono ${wrapperBorder}`}
    >
      <div className="flex items-center gap-2">
        <span className={`px-1 py-px rounded border ${rankBadge}`}>{rankText}</span>
        {etaBadge && (
          <span
            className="px-1 py-px rounded border bg-amber-400/10 text-amber-200/90 border-amber-300/30"
            title="Sim time until threat enters this station's range"
          >
            ⏱ {etaBadge}
          </span>
        )}
        <span className="text-slate-100 font-semibold">{sug.weapon}</span>
        <span className="text-slate-400">@ {sug.stationName}</span>
        <span className={`ml-auto ${pkColor(sug.pk)}`}>Pk {sug.pk.toFixed(2)}</span>
      </div>
      <div className="text-slate-400 mt-0.5 leading-tight">
        cost ${(sug.costUsd / 1_000_000).toFixed(sug.costUsd >= 100_000 ? 2 : 4)}M
        {" · "}
        ammo {sug.ammoLeft}/{sug.ammoMax}
        {" · "}
        {sug.inRange
          ? `range ${sug.distanceKm.toFixed(0)}/${sug.rangeKm} km`
          : `out of range (${sug.distanceKm.toFixed(0)} > ${sug.rangeKm} km)`}
      </div>
      <div className="text-slate-500 mt-0.5 leading-tight">
        {state.subline ??
          (isQueued
            ? `pre-armed — auto-fires when in range & ready`
            : sug.feasible
              ? `ratio $${(sug.costUsd / Math.max(sug.pk * 100, 1) / 1000).toFixed(1)}k/% · counterfactual −$${(sug.counterfactualUsd / 1_000_000).toFixed(1)}M`
              : sug.reasonText)}
      </div>
      <div className="mt-1 flex items-center justify-end gap-1.5">
        {state.kind === "queued" ? (
          <button
            onClick={handleCancel}
            className="px-2 py-0.5 text-[10px] font-semibold border rounded border-amber-300/60 text-amber-100 bg-amber-400/15 hover:bg-amber-400/25"
          >
            ✓ Queued — Cancel
          </button>
        ) : state.kind === "engage" ? (
          <button
            onClick={handleEngage}
            className="px-2 py-0.5 text-[10px] font-semibold border rounded border-cyan-400/60 text-cyan-200 bg-cyan-400/10 hover:bg-cyan-400/20"
          >
            Engage
          </button>
        ) : state.kind === "prearm" ? (
          <button
            onClick={handleQueue}
            className="px-2 py-0.5 text-[10px] font-semibold border rounded border-amber-400/50 text-amber-200 bg-amber-400/[0.07] hover:bg-amber-400/15"
          >
            Pre-arm
          </button>
        ) : (
          <button
            disabled
            title={state.disabledReason}
            className="px-2 py-0.5 text-[10px] font-semibold border rounded border-slate-700 text-slate-600 bg-transparent cursor-not-allowed"
          >
            Pre-arm
          </button>
        )}
      </div>
    </div>
  );
}

function decideButtonState(args: {
  sug: DefenseSuggestion;
  isQueued: boolean;
  stationState: string | undefined;
  threatClass: ThreatClass | undefined;
  simT: number;
}): ButtonState {
  const { sug, isQueued, stationState, threatClass, simT } = args;

  if (isQueued) return { kind: "queued" };
  if (sug.feasible) return { kind: "engage" };
  if (stationState === "DESTROYED") {
    return {
      kind: "disabled",
      disabledReason: "station destroyed",
      subline: "station destroyed",
    };
  }

  // Weapon-class incompatibility (independent of range falloff). Mirrors
  // the loop's drop-forever rule, so disabled here ↔ won't auto-fire.
  const baseHit = threatClass ? basePk(sug.weapon, threatClass) : 0;
  if (baseHit <= 0) {
    return {
      kind: "disabled",
      disabledReason: `weapon ineffective vs ${threatClass ?? "this class"}`,
      subline: `weapon ineffective vs ${threatClass ?? "this class"}`,
    };
  }

  const w = sug.intercept;
  if (w?.noIntercept) {
    return {
      kind: "disabled",
      disabledReason: "trajectory bypasses range",
      subline: "trajectory bypasses range",
    };
  }
  if (w?.hitsBeforeEntry) {
    return {
      kind: "disabled",
      disabledReason: "threat impacts before entering range",
      subline: "threat impacts before entering range",
    };
  }
  if (w?.alreadyInRange) {
    return {
      kind: "prearm",
      subline: "in range now — waiting on station",
    };
  }
  if (w) {
    const eta = fmtMin(w.enterT - simT);
    return {
      kind: "prearm",
      subline: `first shot in ${eta} @ ${sug.rangeKm} km from station`,
    };
  }
  return { kind: "prearm" };
}
