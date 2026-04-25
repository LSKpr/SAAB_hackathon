import { useSimStore } from "../../engine/store";
import type { Infrastructure } from "../../engine/types";
import { kmToSvgRaw } from "./coords";
import type { TooltipState } from "./HoverTooltip";
import { importance } from "../../engine/defense/importance";

interface Props {
  onHover: (s: TooltipState | null) => void;
}

const TYPE_COLOR: Record<Infrastructure["type"], string> = {
  capital: "#ffcc00",
  major_city: "#e9eef5",
  small_town: "#9aa3ad",
  military_airport: "#3fc1ff",
  civilian_airport: "#7ec4f4",
  power_plant: "#f59e0b",
  nuclear_plant: "#22d3ee",
  refinery: "#f97316",
  port: "#a78bfa",
  comms_tower: "#60a5fa",
  empty_field: "#6b7280",
};

function alphaForImportance(imp: number): number {
  return Math.min(1, 0.45 + imp / 220);
}

function Glyph({ a }: { a: Infrastructure }) {
  const { x, y } = kmToSvgRaw(a.posKm.x, a.posKm.y);
  const color = TYPE_COLOR[a.type] ?? "#9aa3ad";
  const imp = importance(a);
  const op = alphaForImportance(imp);
  const damaged = a.state === "DAMAGED";
  const destroyed = a.state === "DESTROYED";
  const finalOp = destroyed ? op * 0.45 : damaged ? op * 0.7 : op;
  const stroke = destroyed ? "#ef4444" : damaged ? "#f59e0b" : "#000";
  const sw = destroyed || damaged ? 1.5 : 1;

  let glyph: React.ReactNode;
  switch (a.type) {
    case "military_airport":
    case "civilian_airport": {
      const r = 7;
      glyph = (
        <polygon
          points={`${x - r},${y + r * 0.85} ${x},${y - r} ${x + r},${y + r * 0.85}`}
          fill={color}
          fillOpacity={finalOp}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
      break;
    }
    case "capital": {
      const s = 12;
      glyph = (
        <rect
          x={x - s / 2}
          y={y - s / 2}
          width={s}
          height={s}
          rx={2}
          fill={color}
          fillOpacity={finalOp}
          stroke={stroke}
          strokeWidth={sw + 0.4}
        />
      );
      break;
    }
    case "major_city":
    case "small_town": {
      const s = a.type === "major_city" ? 9 : 6;
      glyph = (
        <rect
          x={x - s / 2}
          y={y - s / 2}
          width={s}
          height={s}
          rx={1}
          fill={color}
          fillOpacity={finalOp}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
      break;
    }
    case "power_plant": {
      const r = 6;
      glyph = (
        <g>
          <rect
            x={x - r}
            y={y - r}
            width={r * 2}
            height={r * 2}
            fill={color}
            fillOpacity={finalOp}
            stroke={stroke}
            strokeWidth={sw}
          />
          <line x1={x - r * 0.6} y1={y - r * 1.2} x2={x - r * 0.6} y2={y - r} stroke={stroke} strokeWidth={1} />
          <line x1={x + r * 0.6} y1={y - r * 1.2} x2={x + r * 0.6} y2={y - r} stroke={stroke} strokeWidth={1} />
        </g>
      );
      break;
    }
    case "nuclear_plant": {
      const r = 7;
      glyph = (
        <g>
          <circle cx={x} cy={y} r={r} fill={color} fillOpacity={finalOp} stroke={stroke} strokeWidth={sw} />
          <circle cx={x} cy={y} r={r * 0.4} fill={stroke} fillOpacity={0.35} />
        </g>
      );
      break;
    }
    case "refinery": {
      const r = 6;
      glyph = (
        <polygon
          points={`${x - r},${y - r} ${x + r},${y - r} ${x + r * 1.2},${y + r} ${x - r * 1.2},${y + r}`}
          fill={color}
          fillOpacity={finalOp}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
      break;
    }
    case "port": {
      const r = 6;
      glyph = (
        <g>
          <rect
            x={x - r}
            y={y - r * 0.4}
            width={r * 2}
            height={r * 0.8}
            fill={color}
            fillOpacity={finalOp}
            stroke={stroke}
            strokeWidth={sw}
          />
          <line x1={x} y1={y - r * 1.2} x2={x} y2={y - r * 0.4} stroke={stroke} strokeWidth={1} />
          <circle cx={x} cy={y - r * 1.2} r={1.5} fill={stroke} />
        </g>
      );
      break;
    }
    case "comms_tower": {
      const r = 6;
      glyph = (
        <g>
          <line x1={x - r * 0.6} y1={y + r} x2={x} y2={y - r} stroke={stroke} strokeWidth={1.2} />
          <line x1={x + r * 0.6} y1={y + r} x2={x} y2={y - r} stroke={stroke} strokeWidth={1.2} />
          <circle cx={x} cy={y - r} r={2} fill={color} fillOpacity={finalOp} stroke={stroke} strokeWidth={1} />
        </g>
      );
      break;
    }
    case "empty_field":
    default: {
      const r = 4;
      glyph = (
        <circle
          cx={x}
          cy={y}
          r={r}
          fill={color}
          fillOpacity={finalOp * 0.6}
          stroke={stroke}
          strokeOpacity={0.5}
          strokeWidth={1}
        />
      );
    }
  }

  return (
    <>
      {glyph}
      {destroyed && (
        <g>
          <line
            x1={x - 9}
            y1={y - 9}
            x2={x + 9}
            y2={y + 9}
            stroke="#ef4444"
            strokeWidth={1.2}
          />
          <line
            x1={x + 9}
            y1={y - 9}
            x2={x - 9}
            y2={y + 9}
            stroke="#ef4444"
            strokeWidth={1.2}
          />
        </g>
      )}
    </>
  );
}

export default function InfrastructureLayer({ onHover }: Props) {
  const infrastructure = useSimStore((s) => s.infrastructure);
  const selectedThreatId = useSimStore((s) => s.selectedThreatId);
  const threats = useSimStore((s) => s.threats);
  const selectedThreat = threats.find((t) => t.id === selectedThreatId);
  const targetId = selectedThreat?.targetAssetId;

  return (
    <g>
      {infrastructure.map((a) => {
        const { x, y } = kmToSvgRaw(a.posKm.x, a.posKm.y);
        const isTarget = a.id === targetId;
        const handleEnter = (e: React.MouseEvent) =>
          onHover({
            px: e.clientX,
            py: e.clientY,
            title: a.name,
            lines: [
              `${a.type.replace("_", " ").toUpperCase()} (size ${a.size})`,
              `importance ${importance(a)}`,
              `damage if hit: $${(a.damageOnHitUsd / 1_000_000).toFixed(1)}M`,
              `state: ${a.state}`,
            ],
          });
        const handleLeave = () => onHover(null);
        return (
          <g
            key={a.id}
            onMouseEnter={handleEnter}
            onMouseMove={handleEnter}
            onMouseLeave={handleLeave}
            style={{ cursor: "default" }}
          >
            {isTarget && (
              <circle
                cx={x}
                cy={y}
                r={16}
                fill="none"
                stroke="#ffd24a"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              >
                <animate
                  attributeName="r"
                  values="14;19;14"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            <Glyph a={a} />
            <text
              x={x + 9}
              y={y + 3}
              fontSize={8.5}
              fontFamily="monospace"
              fill="#cbd5e1"
              fillOpacity={isTarget ? 1 : 0.55}
            >
              {a.name}
            </text>
          </g>
        );
      })}
    </g>
  );
}
