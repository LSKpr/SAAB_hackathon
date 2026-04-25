import { useSimStore } from "../../engine/store";
import type { Ledger } from "../../engine/types";

function fmtMoney(n: number): string {
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function net(l: Ledger): number {
  return l.damagePreventedUsd - l.defenderSpendUsd;
}

function ratio(l: Ledger): string {
  if (l.defenderSpendUsd <= 0)
    return l.damagePreventedUsd > 0 ? "∞" : "—";
  return `${(l.damagePreventedUsd / l.defenderSpendUsd).toFixed(2)}×`;
}

export default function AfterActionPanel() {
  const aa = useSimStore((s) => s.afterAction);
  const setAA = useSimStore((s) => s.setAfterAction);
  const infrastructure = useSimStore((s) => s.infrastructure);

  if (!aa) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-6">
      <div className="bg-[#0b1320] border border-panelBorder rounded-lg shadow-2xl max-w-3xl w-full p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-cyan-200">{aa.title}</h2>
          <button
            onClick={() => setAA(null)}
            className="text-slate-400 hover:text-slate-100 text-xs px-2 py-0.5 border border-panelBorder rounded"
          >
            ✕ Close
          </button>
        </div>
        {aa.headline && (
          <div className="mb-3 text-2xl font-bold font-mono text-emerald-300 text-center">
            {aa.headline}
          </div>
        )}
        <div className={`grid gap-3 ${aa.rows.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {aa.rows.map((row, i) => (
            <div
              key={i}
              className="border border-panelBorder rounded p-3 bg-white/[0.03]"
            >
              <div className="text-cyan-300 font-semibold text-sm mb-2">
                {row.label}
              </div>
              <Row label="Threats destroyed" value={String(row.ledger.threatsDestroyed)} />
              <Row label="Threats leaked" value={String(row.ledger.threatsLeaked)} />
              <Row label="Defender spend" value={fmtMoney(row.ledger.defenderSpendUsd)} />
              <Row label="Damage taken" value={fmtMoney(row.ledger.damageTakenUsd)} />
              <Row label="Damage prevented" value={fmtMoney(row.ledger.damagePreventedUsd)} />
              <Row label="Cost-exchange ratio" value={ratio(row.ledger)} mono />
              <Row
                label="Net"
                value={fmtMoney(net(row.ledger))}
                mono
                color={net(row.ledger) >= 0 ? "text-emerald-300" : "text-red-300"}
              />
              {row.ledger.assetsLost.length > 0 && (
                <div className="mt-2 text-[11px]">
                  <div className="text-slate-400 mb-1">Assets lost:</div>
                  <ul className="text-slate-300 list-disc list-inside text-[10px]">
                    {row.ledger.assetsLost.map((al, j) => {
                      const asset = infrastructure.find((a) => a.id === al.assetId);
                      return (
                        <li key={j}>
                          {asset?.name ?? al.assetId} (importance {al.importance})
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  color,
}: {
  label: string;
  value: string;
  mono?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between text-[11px] py-0.5 border-b border-panelBorder/40">
      <span className="text-slate-400">{label}</span>
      <span
        className={`${color ?? "text-slate-100"} ${mono ? "font-mono" : ""} font-semibold`}
      >
        {value}
      </span>
    </div>
  );
}
