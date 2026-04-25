import { useSimStore } from "../../engine/store";
import type { Asset } from "../../engine/types";
import { kmToSvg } from "./coords";
import type { TooltipState } from "./HoverTooltip";

interface Props {
  onHover: (s: TooltipState | null) => void;
}

const SOUTH_BASE_FILL = "#3fc1ff";
const NORTH_BASE_FILL = "#9aa3ad"; // unidentified land — neutral grey
const CAPITAL_FILL = "#ffcc00";
const CITY_FILL = "#ffffff";

function colorFor(a: Asset): string {
  if (a.type === "capital") return CAPITAL_FILL;
  if (a.type === "major_city") return CITY_FILL;
  return a.side === "south" ? SOUTH_BASE_FILL : NORTH_BASE_FILL;
}

export default function AssetLayer({ onHover }: Props) {
  const assets = useSimStore((s) => s.assets);
  const selectedAssetId = useSimStore((s) => s.selectedAssetId);
  const selectAsset = useSimStore((s) => s.selectAsset);

  return (
    <g>
      {assets.map((a) => {
        const { x, y } = kmToSvg(a.posKm.x, a.posKm.y, a.side);
        const isSelected = a.id === selectedAssetId;
        const handleEnter = (e: React.MouseEvent) => {
          onHover({
            px: e.clientX,
            py: e.clientY,
            title: a.name,
            lines: [
              `${a.type.replace("_", " ").toUpperCase()} · ${a.context}`,
              `Side: ${a.side.toUpperCase()}`,
              `pos: (${a.posKm.x.toFixed(1)}, ${a.posKm.y.toFixed(1)}) km`,
            ],
          });
        };
        const handleMove = (e: React.MouseEvent) =>
          onHover({
            px: e.clientX,
            py: e.clientY,
            title: a.name,
            lines: [
              `${a.type.replace("_", " ").toUpperCase()} · ${a.context}`,
              `Side: ${a.side.toUpperCase()}`,
              `pos: (${a.posKm.x.toFixed(1)}, ${a.posKm.y.toFixed(1)}) km`,
            ],
          });
        const handleLeave = () => onHover(null);
        const handleClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          selectAsset(a.id);
        };
        const fill = colorFor(a);
        const stroke = isSelected ? "#fff" : "#000";
        const sw = isSelected ? 2 : 1.2;
        const common = {
          onMouseEnter: handleEnter,
          onMouseMove: handleMove,
          onMouseLeave: handleLeave,
          onClick: handleClick,
          style: { cursor: "pointer" } as const,
        };
        if (a.type === "air_base") {
          // Triangle (apex up)
          const r = 11;
          const points = `${x - r},${y + r * 0.85} ${x},${y - r * 1.0} ${x + r},${y + r * 0.85}`;
          return (
            <polygon
              key={a.id}
              points={points}
              fill={fill}
              stroke={stroke}
              strokeWidth={sw}
              {...common}
            />
          );
        }
        if (a.type === "capital") {
          const s = 14;
          return (
            <rect
              key={a.id}
              x={x - s / 2}
              y={y - s / 2}
              width={s}
              height={s}
              rx={2}
              fill={fill}
              stroke={stroke}
              strokeWidth={sw + 0.6}
              {...common}
            />
          );
        }
        const s = 10;
        return (
          <rect
            key={a.id}
            x={x - s / 2}
            y={y - s / 2}
            width={s}
            height={s}
            rx={1}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            {...common}
          />
        );
      })}
    </g>
  );
}
