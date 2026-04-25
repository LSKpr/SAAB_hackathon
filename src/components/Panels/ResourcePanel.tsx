import { useMemo } from "react";
import { useSimStore } from "../../engine/store";
import type { DefenseStation, DefenseWeaponType, FireUnit } from "../../engine/types";

const WEAPON_ORDER: DefenseWeaponType[] = [
  "SAM_LR",
  "SAM_MR",
  "SAM_SR",
  "FIGHTER_CAP",
  "AAA",
  "LASER",
];

function StationRow({ s, simT }: { s: DefenseStation; simT: number }) {
  const ammoFrac = s.magazineMax > 0 ? s.magazine / s.magazineMax : 0;
  const reloadETA =
    s.reloadingUntilT !== undefined ? Math.max(0, s.reloadingUntilT - simT) : 0;
  const stateColor =
    s.state === "READY"
      ? "text-emerald-300"
      : s.state === "RELOADING"
        ? "text-amber-300"
        : s.state === "DESTROYED"
          ? "text-red-400"
          : "text-slate-400";
  return (
    <div className="px-2 py-0.5 grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
      <span className="text-slate-200 truncate">{s.name}</span>
      <span className="font-mono text-[10px] text-slate-300">
        {s.magazine}/{s.magazineMax}
      </span>
      <span className="font-mono text-[10px] text-slate-500">
        {s.reloadMin.toFixed(2)}m
      </span>
      <span className={`font-mono text-[10px] ${stateColor}`}>
        {s.state === "RELOADING" ? `RELOAD ${reloadETA.toFixed(1)}m` : s.state}
        {s.state === "READY" && (
          <span className="ml-1 text-slate-500 text-[9px]">
            {Math.round(ammoFrac * 100)}%
          </span>
        )}
      </span>
    </div>
  );
}

export default function ResourcePanel() {
  const mode = useSimStore((s) => s.scenarioMode);
  const stations = useSimStore((s) => s.stations);
  const simT = useSimStore((s) => s.simTimeMin);
  const assets = useSimStore((s) => s.assets);
  const selectedAssetId = useSimStore((s) => s.selectedAssetId);
  const selectAsset = useSimStore((s) => s.selectAsset);
  const fireUnits = useSimStore((s) => s.fireUnits);

  const grouped = useMemo(() => {
    const m = new Map<DefenseWeaponType, DefenseStation[]>();
    for (const s of stations) {
      if (!m.has(s.weapon)) m.set(s.weapon, []);
      m.get(s.weapon)!.push(s);
    }
    return m;
  }, [stations]);

  if (mode === "defense") {
    const totalReady = stations.reduce(
      (acc, s) => acc + (s.state === "READY" ? s.magazine : 0),
      0,
    );
    return (
      <div className="panel flex-1 min-h-0 flex flex-col">
        <div className="panel-h flex items-center justify-between">
          <span>Defense Stations</span>
          <span className="text-slate-500 text-[10px]">
            {stations.length} stn · {totalReady} rdy
          </span>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin font-mono text-[11px]">
          {WEAPON_ORDER.map((w) => {
            const list = grouped.get(w);
            if (!list || list.length === 0) return null;
            return (
              <div key={w} className="border-b border-panelBorder/50 py-1">
                <div className="px-2 text-[9px] text-slate-500 uppercase tracking-widest flex items-center justify-between">
                  <span>{w}</span>
                  <span className="flex gap-2">
                    <span>READY</span>
                    <span>RELOAD</span>
                    <span>STATE</span>
                  </span>
                </div>
                {list.map((s) => (
                  <StationRow key={s.id} s={s} simT={simT} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Legacy resource panel (Phase 1–3 shape).
  const south = assets.filter((a) => a.side === "south");
  const north = assets.filter((a) => a.side === "north");
  const selected = assets.find((a) => a.id === selectedAssetId);

  return (
    <div className="panel flex-1 min-h-0 flex flex-col">
      <div className="panel-h flex items-center justify-between">
        <span>Resources</span>
        <span className="text-slate-500 text-[10px]">
          {south.length}S · {north.length}N · {fireUnits.length} FU
        </span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin font-mono text-[11px]">
        {fireUnits.length > 0 ? (
          <div className="px-2 py-1 border-b border-panelBorder/50">
            <div className="flex justify-between text-[9px] text-slate-500 uppercase tracking-widest">
              <span>FIRE UNIT</span>
              <span className="flex gap-3">
                <span>READY</span>
                <span>TOTAL</span>
                <span>RELOAD</span>
              </span>
            </div>
            {fireUnits.map((fu) => (
              <FireUnitRow key={fu.id} fu={fu} />
            ))}
          </div>
        ) : (
          <div className="px-2 py-2 text-[10px] text-slate-500 italic border-b border-panelBorder/50">
            no fire units yet
          </div>
        )}
        {selected && (
          <div className="px-2 py-2 border-b border-panelBorder bg-white/[0.03]">
            <div className="flex items-center justify-between">
              <span className="text-cyan-300 font-semibold">
                {selected.name}
              </span>
              <button
                onClick={() => selectAsset(undefined)}
                className="text-slate-500 hover:text-slate-300 text-[10px]"
              >
                clear
              </button>
            </div>
            <div className="text-slate-400 text-[10px] mt-0.5">
              {selected.type.replace("_", " ")} · {selected.context} ·{" "}
              {selected.side}
            </div>
            <div className="text-slate-500 text-[10px]">
              pos: ({selected.posKm.x.toFixed(1)}, {selected.posKm.y.toFixed(1)}
              ) km
            </div>
          </div>
        )}
        <div className="px-2 py-1 text-slate-500 uppercase tracking-wider text-[10px]">
          South assets
        </div>
        {south.map((a) => (
          <button
            key={a.id}
            onClick={() => selectAsset(a.id)}
            className={`w-full text-left px-2 py-1 row-hover border-b border-panelBorder/30 ${
              selectedAssetId === a.id ? "bg-white/10" : ""
            }`}
          >
            <div className="flex justify-between">
              <span className="text-slate-200">{a.name}</span>
              <span className="text-slate-500 text-[10px]">{a.type}</span>
            </div>
          </button>
        ))}
        <div className="px-2 py-1 text-slate-500 uppercase tracking-wider text-[10px] mt-2">
          North assets
        </div>
        {north.map((a) => (
          <button
            key={a.id}
            onClick={() => selectAsset(a.id)}
            className={`w-full text-left px-2 py-1 row-hover border-b border-panelBorder/30 ${
              selectedAssetId === a.id ? "bg-white/10" : ""
            }`}
          >
            <div className="flex justify-between">
              <span className="text-slate-300">{a.name}</span>
              <span className="text-slate-500 text-[10px]">{a.type}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FireUnitRow({ fu }: { fu: FireUnit }) {
  return (
    <div className="py-0.5 flex justify-between items-center">
      <span className="text-slate-200">{fu.effectorClass}</span>
      <span className="flex gap-3 font-mono">
        <span className="text-slate-300">{fu.ammoReady}</span>
        <span className="text-slate-500">{fu.ammoReady + fu.ammoReserve}</span>
        <span className="text-slate-500">{fu.reloadMin.toFixed(1)}m</span>
      </span>
    </div>
  );
}
