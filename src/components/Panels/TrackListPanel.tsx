import { useMemo } from "react";
import { useSimStore } from "../../engine/store";
import type { Track } from "../../engine/types";

function colorFor(t: Track): string {
  if (
    t.classification === "HOSTILE" ||
    (t.classification !== "FRIEND" &&
      t.classification !== "CIVIL" &&
      t.side === "north")
  )
    return "text-red-400";
  if (t.classification === "FRIEND" || t.side === "south")
    return "text-cyan-300";
  return "text-yellow-300";
}

export default function TrackListPanel() {
  const tracks = useSimStore((s) => s.tracks);
  const selectedTrackId = useSimStore((s) => s.selectedTrackId);
  const selectTrack = useSimStore((s) => s.selectTrack);

  const sorted = useMemo(
    () =>
      [...tracks].sort(
        (a, b) => (b.threatScore ?? 0) - (a.threatScore ?? 0),
      ),
    [tracks],
  );

  return (
    <div className="panel flex-1 min-h-0 flex flex-col">
      <div className="panel-h flex items-center justify-between">
        <span>Tracks · sorted by threat</span>
        <span className="text-slate-500">{tracks.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin font-mono text-[11px]">
        {sorted.length === 0 ? (
          <div className="p-3 text-slate-500 text-xs">No tracks</div>
        ) : (
          sorted.map((t) => {
            const isSel = t.id === selectedTrackId;
            return (
              <button
                key={t.id}
                onClick={() => selectTrack(t.id)}
                className={`w-full text-left px-2 py-1 row-hover border-b border-panelBorder/50 ${
                  isSel ? "bg-white/10" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`${colorFor(t)} font-semibold`}>
                    {t.id}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    {t.classId}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>{t.classification}</span>
                  <span>score {(t.threatScore ?? 0).toFixed(2)}</span>
                </div>
                <div className="text-slate-500 text-[10px]">
                  ({t.posKm.x.toFixed(0)}, {t.posKm.y.toFixed(0)}) km · alt{" "}
                  {t.altitudeM} m
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
