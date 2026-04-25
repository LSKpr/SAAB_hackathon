import { useSimStore } from "../../engine/store";
import { runGhostReplay } from "../../engine/defense/naive";

function fmtSimClock(min: number): string {
  const totalSec = Math.floor(min * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `T+${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtMoney(n: number): string {
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

interface Props {
  scenarios?: { id: string; label: string }[];
  activeScenarioId?: string;
  onPickScenario?: (id: string) => void;
}

export default function TopBar({
  scenarios,
  activeScenarioId,
  onPickScenario,
}: Props) {
  const scenarioName = useSimStore((s) => s.scenarioName);
  const simTimeMin = useSimStore((s) => s.simTimeMin);
  const playState = useSimStore((s) => s.playState);
  const tracks = useSimStore((s) => s.tracks);
  const threats = useSimStore((s) => s.threats);
  const mode = useSimStore((s) => s.scenarioMode);
  const ledger = useSimStore((s) => s.ledger);
  const showHeatmap = useSimStore((s) => s.showImportanceHeatmap);
  const toggleHeatmap = useSimStore((s) => s.toggleHeatmap);

  const hostiles =
    mode === "defense"
      ? threats.filter((t) => t.state === "INBOUND" || t.state === "ENGAGED").length
      : tracks.filter((t) => t.classification === "HOSTILE").length;

  const defcon =
    hostiles >= 10
      ? "DEFCON 2"
      : hostiles >= 4
        ? "DEFCON 3"
        : hostiles >= 1
          ? "DEFCON 4"
          : "DEFCON 5";
  const defconColor =
    hostiles >= 10
      ? "text-red-400 border-red-400/40"
      : hostiles >= 4
        ? "text-orange-300 border-orange-300/40"
        : hostiles >= 1
          ? "text-yellow-300 border-yellow-300/40"
          : "text-emerald-300 border-emerald-300/40";

  const net = ledger.damagePreventedUsd - ledger.defenderSpendUsd;

  return (
    <div className="h-12 border-b border-panelBorder bg-panel flex items-center px-4 gap-3 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-slate-400 text-xs uppercase tracking-widest">
          Boreal Passage Console
        </span>
      </div>
      {scenarios && onPickScenario ? (
        <select
          className="bg-white/5 border border-panelBorder text-slate-200 text-xs px-2 py-0.5 rounded focus:outline-none"
          value={activeScenarioId ?? ""}
          onChange={(e) => onPickScenario(e.target.value)}
        >
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="text-slate-300">
          <span className="text-slate-500 text-xs mr-2">SCENARIO</span>
          <span className="font-semibold">{scenarioName}</span>
        </div>
      )}
      <div className="font-mono text-cyan-300">{fmtSimClock(simTimeMin)}</div>
      <div className={`px-2 py-0.5 border rounded text-xs ${defconColor}`}>
        {defcon}
      </div>
      {mode === "defense" && (
        <button
          onClick={toggleHeatmap}
          title="Toggle importance heatmap"
          className={`px-2 py-0.5 border rounded text-xs ${
            showHeatmap
              ? "bg-rose-500/20 border-rose-300/50 text-rose-200"
              : "bg-white/5 border-panelBorder text-slate-300 hover:bg-white/10"
          }`}
        >
          Heatmap {showHeatmap ? "ON" : "OFF"}
        </button>
      )}
      {mode === "defense" && (
        <div className="flex items-center gap-2 px-2 py-0.5 border border-panelBorder rounded bg-white/5 text-xs font-mono">
          <span className="text-emerald-300">Saved {fmtMoney(ledger.damagePreventedUsd)}</span>
          <span className="text-slate-500">·</span>
          <span className="text-orange-300">Spent {fmtMoney(ledger.defenderSpendUsd)}</span>
          <span className="text-slate-500">·</span>
          <span className={net >= 0 ? "text-cyan-300" : "text-red-300"}>
            Net {fmtMoney(net)}
          </span>
        </div>
      )}
      {mode === "defense" && (
        <button
          onClick={() => runGhostReplay()}
          title="Replay this scenario with a naive operator"
          className="ml-auto px-2 py-0.5 border border-purple-300/50 bg-purple-500/15 text-purple-200 rounded text-xs hover:bg-purple-500/25"
        >
          ▶ Ghost replay
        </button>
      )}
      {mode !== "defense" && (
        <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
          <span>
            OPERATOR: <span className="text-cyan-300">SOUTH / Y</span>
          </span>
        </div>
      )}
      <span className="text-xs text-slate-400 ml-2">
        {playState === "playing" ? "▶ LIVE" : "⏸ PAUSED"}
      </span>
    </div>
  );
}
