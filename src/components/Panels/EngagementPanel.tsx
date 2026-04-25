import { useSimStore } from "../../engine/store";

export default function EngagementPanel() {
  const engagements = useSimStore((s) => s.engagements);

  return (
    <div className="panel h-44 flex flex-col">
      <div className="panel-h flex items-center justify-between">
        <span>Engagements</span>
        <span className="text-slate-500 text-[10px]">
          {engagements.length} eng
        </span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin font-mono text-[11px]">
        {engagements.length === 0 ? (
          <div className="p-2 text-slate-500 text-xs">No active engagements</div>
        ) : (
          [...engagements]
            .reverse()
            .slice(0, 30)
            .map((e) => (
              <div
                key={e.id}
                className="px-2 py-1 border-b border-panelBorder/50"
              >
                <div className="flex justify-between">
                  <span className="text-slate-200">{e.threatId}</span>
                  <span
                    className={
                      e.rolledOutcome === "HIT"
                        ? "text-emerald-300"
                        : "text-red-300"
                    }
                  >
                    {e.rolledOutcome}
                  </span>
                </div>
                <div className="text-slate-500 text-[10px]">
                  {e.weapon} · {e.stationId} · pK {(e.pkUsed * 100).toFixed(0)}%
                  · ${(e.costUsd / 1_000_000).toFixed(2)}M
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
