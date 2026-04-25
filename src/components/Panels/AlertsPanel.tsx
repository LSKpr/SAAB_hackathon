import { useSimStore } from "../../engine/store";

export default function AlertsPanel() {
  const events = useSimStore((s) => s.events);
  const recent = [...events].reverse();

  return (
    <div className="panel h-44 flex flex-col">
      <div className="panel-h flex items-center justify-between">
        <span>Alerts</span>
        <span className="text-slate-500 text-[10px]">
          {events.length} ev
        </span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin font-mono text-[11px]">
        {recent.length === 0 ? (
          <div className="p-3 text-slate-500 text-xs">No alerts</div>
        ) : (
          recent.map((e, i) => (
            <div
              key={i}
              className="px-2 py-0.5 border-b border-panelBorder/50 text-slate-400"
            >
              <span className="text-slate-500 mr-2">
                T+{e.t.toFixed(2)}
              </span>
              <span className="text-slate-200">{e.kind}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
