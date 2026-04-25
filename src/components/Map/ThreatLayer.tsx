import type { MouseEvent } from "react";
import { useSimStore } from "../../engine/store";
import type { Threat } from "../../engine/types";
import { kmToSvgRaw } from "./coords";
import type { TooltipState } from "./HoverTooltip";

interface Props {
  onHover: (s: TooltipState | null) => void;
}

function threatColor(t: Threat): string {
  if (t.state === "DESTROYED") return "#64748b";
  if (t.state === "ENGAGED") return "#d97706";
  if (t.state === "HIT_TARGET") return "#7f1d1d";
  return "#dc2626";
}

function ThreatGlyph({
  t,
  selected,
  onHover,
}: {
  t: Threat;
  selected: boolean;
  onHover: (s: TooltipState | null) => void;
}) {
  const { x, y } = kmToSvgRaw(t.posKm.x, t.posKm.y);
  const color = threatColor(t);
  const r = selected ? 5 : 3.5;
  const handleEnter = (e: MouseEvent) =>
    onHover({
      px: e.clientX,
      py: e.clientY,
      title: `${t.id} · ${t.class}`,
      lines: [
        `state: ${t.state}`,
        `pos: (${t.posKm.x.toFixed(0)}, ${t.posKm.y.toFixed(0)}) km`,
        `alt: ${t.altitudeM} m`,
        `speed: ${t.speedMps} m/s`,
        `eta: ${t.etaMin.toFixed(2)} min`,
        `target: ${t.targetAssetId}`,
      ],
    });
  const handleLeave = () => onHover(null);
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    useSimStore.getState().selectThreat(t.id);
  };

  return (
    <g
      onMouseEnter={handleEnter}
      onMouseMove={handleEnter}
      onMouseLeave={handleLeave}
      onClick={handleClick}
      style={{ cursor: "pointer" }}
    >
      {selected && (
        <circle
          cx={x}
          cy={y}
          r={10}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={0.9}
          strokeOpacity={0.85}
        />
      )}
      <polygon
        points={`${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`}
        fill={color}
        fillOpacity={selected ? 1 : 0.88}
        stroke="#020617"
        strokeWidth={selected ? 1 : 0.65}
      />
      {selected && (
        <text
          x={x + 7}
          y={y - 4}
          fontSize={7}
          fontFamily="ui-monospace, monospace"
          fill="#e2e8f0"
          fillOpacity={0.92}
        >
          {t.id}
        </text>
      )}
    </g>
  );
}

export default function ThreatLayer({ onHover }: Props) {
  const threats = useSimStore((s) => s.threats);
  const selectedThreatId = useSimStore((s) => s.selectedThreatId);
  const infrastructure = useSimStore((s) => s.infrastructure);
  const selected = threats.find((t) => t.id === selectedThreatId);
  const target = selected
    ? infrastructure.find((a) => a.id === selected.targetAssetId)
    : undefined;

  return (
    <g>
      {selected && target && (() => {
        const a = kmToSvgRaw(selected.posKm.x, selected.posKm.y);
        const b = kmToSvgRaw(target.posKm.x, target.posKm.y);
        return (
          <line
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#eab308"
            strokeWidth={1}
            strokeDasharray="6 5"
            strokeOpacity={0.45}
          />
        );
      })()}
      {threats.map((t) => (
        <ThreatGlyph
          key={t.id}
          t={t}
          selected={t.id === selectedThreatId}
          onHover={onHover}
        />
      ))}
    </g>
  );
}
