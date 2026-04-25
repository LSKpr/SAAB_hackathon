import { useMemo } from "react";
import { useSimStore } from "../../engine/store";
import { kmToSvgRaw, KM_W, KM_H } from "./coords";
import { importance } from "../../engine/defense/importance";

const GRID_X = 50;
const GRID_Y = 40;
const RADIUS_KM = 50;

/**
 * 50×40 grid; each cell's alpha is the maximum importance of any infrastructure
 * within 50 km of the cell centre. Off by default; turned on via the top-bar
 * toggle. Performance is fine for this resolution: 50×40=2000 cells × ~13 assets.
 */
export default function ImportanceHeatmapLayer() {
  const show = useSimStore((s) => s.showImportanceHeatmap);
  const infrastructure = useSimStore((s) => s.infrastructure);

  const cells = useMemo(() => {
    if (!show) return [] as { x: number; y: number; w: number; h: number; alpha: number }[];
    const cellWKm = KM_W / GRID_X;
    const cellHKm = KM_H / GRID_Y;
    const out: { x: number; y: number; w: number; h: number; alpha: number }[] = [];
    for (let cy = 0; cy < GRID_Y; cy++) {
      for (let cx = 0; cx < GRID_X; cx++) {
        const cxKm = (cx + 0.5) * cellWKm;
        const cyKm = (cy + 0.5) * cellHKm;
        let maxImp = 0;
        for (const a of infrastructure) {
          const dx = a.posKm.x - cxKm;
          const dy = a.posKm.y - cyKm;
          if (Math.hypot(dx, dy) <= RADIUS_KM) {
            const imp = importance(a);
            if (imp > maxImp) maxImp = imp;
          }
        }
        if (maxImp <= 0) continue;
        const top = kmToSvgRaw(cx * cellWKm, cy * cellHKm);
        const w = (cellWKm) * (kmToSvgRaw(1, 0).x);
        const h = (cellHKm) * (kmToSvgRaw(0, 1).y);
        const alpha = Math.min(0.55, 0.08 + (maxImp / 180) * 0.45);
        out.push({ x: top.x, y: top.y, w, h, alpha });
      }
    }
    return out;
  }, [show, infrastructure]);

  if (!show) return null;
  return (
    <g pointerEvents="none">
      {cells.map((c, i) => (
        <rect
          key={i}
          x={c.x}
          y={c.y}
          width={c.w}
          height={c.h}
          fill="#ef4444"
          fillOpacity={c.alpha}
        />
      ))}
    </g>
  );
}
