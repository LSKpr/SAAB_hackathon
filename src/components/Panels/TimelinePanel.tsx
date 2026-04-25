import { useSimStore } from "../../engine/store";

function fmt(min: number): string {
  const totalSec = Math.floor(min * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TimelinePanel() {
  const playState = useSimStore((s) => s.playState);
  const togglePlay = useSimStore((s) => s.togglePlay);
  const speed = useSimStore((s) => s.speed);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const simTimeMin = useSimStore((s) => s.simTimeMin);
  const durationMin = useSimStore((s) => s.durationMin);
  const setSimTime = useSimStore((s) => s.setSimTime);
  const resetSim = useSimStore((s) => s.resetSim);
  const allSpawns = useSimStore((s) => s.allSpawns);

  const pct = durationMin > 0 ? (simTimeMin / durationMin) * 100 : 0;

  return (
    <div className="h-20 border-t border-panelBorder bg-panel px-3 py-2 flex items-center gap-3">
      <div className="flex items-center gap-1">
        <button
          onClick={togglePlay}
          className="w-12 px-2 py-1 text-xs font-semibold border border-panelBorder rounded bg-white/5 hover:bg-white/10"
        >
          {playState === "playing" ? "PAUSE" : "PLAY"}
        </button>
        <button
          onClick={() => resetSim()}
          className="px-2 py-1 text-xs border border-panelBorder rounded bg-white/5 hover:bg-white/10"
        >
          ↺
        </button>
      </div>
      <div className="flex items-center gap-1">
        {[1, 4, 8].map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-2 py-1 text-xs border rounded ${
              speed === s
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                : "border-panelBorder bg-white/5 hover:bg-white/10"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <div className="relative h-2 bg-white/5 rounded">
          <div
            className="absolute inset-y-0 left-0 bg-cyan-500/40 rounded-l"
            style={{ width: `${pct}%` }}
          />
          {allSpawns.map((p, i) => {
            const left = (p.atTMin / durationMin) * 100;
            return (
              <div
                key={i}
                title={`${p.spec.id} @ T+${p.atTMin.toFixed(1)}m`}
                className="absolute top-0 bottom-0 w-px bg-red-400/60"
                style={{ left: `${left}%` }}
              />
            );
          })}
          <input
            type="range"
            min={0}
            max={durationMin}
            step={0.05}
            value={simTimeMin}
            onChange={(e) => setSimTime(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-4 bg-cyan-200 rounded-sm"
            style={{ left: `calc(${pct}% - 4px)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-slate-400">
          <span>T+{fmt(simTimeMin)}</span>
          <span>{fmt(durationMin)}</span>
        </div>
      </div>
    </div>
  );
}
