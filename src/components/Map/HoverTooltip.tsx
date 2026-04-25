export interface TooltipState {
  // Mouse position in CSS pixels relative to viewport.
  px: number;
  py: number;
  title: string;
  lines: string[];
}

export default function HoverTooltip({ state }: { state: TooltipState | null }) {
  if (!state) return null;
  return (
    <div
      className="pointer-events-none fixed z-50 px-2 py-1.5 rounded border border-panelBorder bg-[#0b1320]/95 text-xs shadow-lg"
      style={{
        left: state.px + 12,
        top: state.py + 12,
        maxWidth: 240,
      }}
    >
      <div className="font-semibold text-slate-100">{state.title}</div>
      {state.lines.map((l, i) => (
        <div key={i} className="text-slate-400 font-mono text-[10px]">
          {l}
        </div>
      ))}
    </div>
  );
}
