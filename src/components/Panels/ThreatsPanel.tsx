import { useMemo } from "react";
import { useSimStore } from "../../engine/store";
import ThreatCard from "./ThreatCard";

export default function ThreatsPanel() {
  const threats = useSimStore((s) => s.threats);
  const activeCount = useMemo(
    () =>
      threats.filter(
        (t) => t.state === "INBOUND" || t.state === "ENGAGED",
      ).length,
    [threats],
  );
  const sorted = useMemo(
    () =>
      [...threats].sort((a, b) => {
        // Active threats first, then by threatLevel desc.
        const aActive = a.state === "INBOUND" || a.state === "ENGAGED" ? 0 : 1;
        const bActive = b.state === "INBOUND" || b.state === "ENGAGED" ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return (b.threatLevel ?? 0) - (a.threatLevel ?? 0);
      }),
    [threats],
  );
  return (
    <div className="panel flex-1 min-h-0 flex flex-col">
      <div className="panel-h flex items-center justify-between">
        <span>Threats &amp; Response</span>
        <span className="text-slate-500 text-[10px] tabular-nums">
          {activeCount} inbound
          {threats.length !== activeCount ? (
            <span className="text-slate-600"> · {threats.length} tracks</span>
          ) : null}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {sorted.length === 0 ? (
          <div className="p-3 text-slate-500 text-xs">No threats yet.</div>
        ) : (
          sorted.map((t) => <ThreatCard key={t.id} threat={t} />)
        )}
      </div>
    </div>
  );
}
