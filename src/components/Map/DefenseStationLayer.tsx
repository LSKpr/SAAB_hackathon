import { useMemo, type MouseEvent } from "react";
import { useSimStore } from "../../engine/store";
import type { DefenseStation, DefenseWeaponType, Threat } from "../../engine/types";
import { kmToSvgRaw, KM_TO_PX } from "./coords";
import type { TooltipState } from "./HoverTooltip";
import { pk as effectivePk, distanceKm } from "../../engine/defense/effectiveness";

interface Props {
  onHover: (s: TooltipState | null) => void;
}

const WEAPON_COLOR: Record<DefenseWeaponType, string> = {
  SAM_LR: "#22d3ee",
  SAM_MR: "#3fc1ff",
  SAM_SR: "#a78bfa",
  AAA: "#f59e0b",
  LASER: "#ec4899",
  FIGHTER_CAP: "#94f2c8",
};

const WEAPON_GLYPH: Record<DefenseWeaponType, string> = {
  SAM_LR: "LR",
  SAM_MR: "MR",
  SAM_SR: "SR",
  AAA: "AA",
  LASER: "L",
  FIGHTER_CAP: "FJ",
};

function pkRingColor(pkVal: number): string {
  if (pkVal >= 0.7) return "#22c55e";
  if (pkVal >= 0.4) return "#f59e0b";
  if (pkVal > 0) return "#ef4444";
  return "#64748b";
}

function StationGlyph({
  s,
  hostFor,
  hovered,
  detail,
}: {
  s: DefenseStation;
  hostFor?: Threat | null;
  hovered: boolean;
  detail: "minimal" | "full";
}) {
  const { x, y } = kmToSvgRaw(s.posKm.x, s.posKm.y);
  const color = WEAPON_COLOR[s.weapon];
  const reloading = s.state === "RELOADING";
  const destroyed = s.state === "DESTROYED";
  const op = destroyed ? 0.25 : reloading ? 0.5 : 1;
  const r = 7;
  const isCap = s.weapon === "FIGHTER_CAP";

  const inRange =
    hostFor != null && distanceKm(s.posKm, hostFor.posKm) <= s.rangeKm;
  const ringColor =
    hostFor !== null && hostFor !== undefined
      ? inRange
        ? pkRingColor(effectivePk(s, hostFor))
        : "#64748b"
      : color;

  const rangePx = s.rangeKm * KM_TO_PX;

  const ammoFrac = Math.max(
    0,
    Math.min(1, s.magazine / Math.max(1, s.magazineMax)),
  );

  const orbit =
    s.mobilePatrol &&
    (() => {
      const c = kmToSvgRaw(
        s.mobilePatrol.centerKm.x,
        s.mobilePatrol.centerKm.y,
      );
      const orbitR = s.mobilePatrol.radiusKm * KM_TO_PX;
      const oa = detail === "full" ? 0.22 : 0.12;
      return (
        <circle
          cx={c.x}
          cy={c.y}
          r={orbitR}
          fill="none"
          stroke={color}
          strokeOpacity={oa}
          strokeWidth={detail === "full" ? 1.05 : 0.9}
          strokeDasharray={detail === "full" ? "5 12" : "4 14"}
          pointerEvents="none"
        />
      );
    })();

  if (detail === "minimal") {
    return (
      <g opacity={op}>
        {orbit}
        <circle
          cx={x}
          cy={y}
          r={rangePx}
          fill="#0f172a"
          fillOpacity={0.09}
          stroke={color}
          strokeOpacity={0.28}
          strokeWidth={1.05}
          strokeDasharray="5 7"
          pointerEvents="none"
        />
        <circle
          cx={x}
          cy={y}
          r={rangePx}
          fill="none"
          stroke="#cbd5e1"
          strokeOpacity={0.38}
          strokeWidth={0.55}
          strokeDasharray="4 9"
          pointerEvents="none"
        />
        {isCap ? (
          <polygon
            points={`${x},${y - r * 0.95} ${x + r * 0.95},${y} ${x},${y + r * 0.95} ${x - r * 0.95},${y}`}
            fill={color}
            fillOpacity={0.85}
            stroke="#0b1320"
            strokeWidth={0.75}
          />
        ) : (
          <polygon
            points={`${x - r * 0.9},${y + r * 0.65} ${x + r * 0.9},${y + r * 0.65} ${x},${y - r * 0.85}`}
            fill={color}
            fillOpacity={0.85}
            stroke="#0b1320"
            strokeWidth={0.75}
          />
        )}
        <text
          x={x}
          y={y + 2}
          textAnchor="middle"
          fontSize={5}
          fontFamily="monospace"
          fontWeight="bold"
          fill="#0b1320"
        >
          {WEAPON_GLYPH[s.weapon]}
        </text>
      </g>
    );
  }

  const ringStrokeBase = hostFor ? 0.88 : 0.58;
  const ringStrokeOp = ringStrokeBase * (hovered ? 1 : 0.95);
  const ringFillOp = hostFor ? (inRange ? 0.11 : 0.065) : 0.075;
  const strokeW = hovered ? 2.35 : 1.85;

  return (
    <g opacity={op}>
      {orbit}
      <circle
        cx={x}
        cy={y}
        r={rangePx}
        fill="none"
        stroke="#020617"
        strokeWidth={strokeW + 2}
        strokeOpacity={0.38}
        pointerEvents="none"
      />
      <circle
        cx={x}
        cy={y}
        r={rangePx}
        fill={ringColor}
        fillOpacity={ringFillOp}
        stroke={ringColor}
        strokeOpacity={ringStrokeOp}
        strokeWidth={strokeW}
        strokeDasharray="8 6"
      />
      <line
        x1={x}
        y1={y}
        x2={x}
        y2={y - rangePx}
        stroke={ringColor}
        strokeOpacity={0.32 * ringStrokeOp}
        strokeWidth={1.1}
        strokeDasharray="3 6"
        pointerEvents="none"
      />
      <text
        x={x}
        y={y - rangePx - 5}
        textAnchor="middle"
        fontSize={6}
        fontFamily="ui-monospace, monospace"
        fontWeight="600"
        fill="#e2e8f0"
        stroke="#020617"
        strokeWidth={0.4}
        paintOrder="stroke fill"
        pointerEvents="none"
      >
        {s.rangeKm} km
      </text>
      {isCap ? (
        <polygon
          points={`${x},${y - r * 1.05} ${x + r * 1.05},${y} ${x},${y + r * 1.05} ${x - r * 1.05},${y}`}
          fill={color}
          stroke="#0b1320"
          strokeWidth={1}
        />
      ) : (
        <polygon
          points={`${x - r},${y + r * 0.7} ${x + r},${y + r * 0.7} ${x},${y - r * 1.0}`}
          fill={color}
          stroke="#0b1320"
          strokeWidth={1}
        />
      )}
      <text
        x={x}
        y={y + 3}
        textAnchor="middle"
        fontSize={isCap ? 5 : 6}
        fontFamily="monospace"
        fontWeight="bold"
        fill="#0b1320"
      >
        {WEAPON_GLYPH[s.weapon]}
      </text>
      <rect
        x={x - r}
        y={y + r * 0.85 + 1}
        width={r * 2}
        height={1.4}
        fill="#1e293b"
      />
      <rect
        x={x - r}
        y={y + r * 0.85 + 1}
        width={r * 2 * ammoFrac}
        height={1.4}
        fill={ammoFrac > 0.3 ? "#22c55e" : ammoFrac > 0 ? "#f59e0b" : "#ef4444"}
      />
    </g>
  );
}

export default function DefenseStationLayer({ onHover }: Props) {
  const stations = useSimStore((s) => s.stations);
  const threats = useSimStore((s) => s.threats);
  const suggestions = useSimStore((s) => s.suggestions);
  const pendingEngagements = useSimStore((s) => s.pendingEngagements);
  const selectedThreatId = useSimStore((s) => s.selectedThreatId);
  const hoveredStationId = useSimStore((s) => s.hoveredStationId);
  const selectedThreat = threats.find((t) => t.id === selectedThreatId) ?? null;

  const focusStationIds = useMemo(() => {
    if (!selectedThreatId) return new Set<string>();
    const ids = new Set<string>();
    for (const s of suggestions) {
      if (s.threatId === selectedThreatId) ids.add(s.stationId);
    }
    for (const pe of pendingEngagements) {
      if (pe.threatId === selectedThreatId) ids.add(pe.stationId);
    }
    return ids;
  }, [suggestions, pendingEngagements, selectedThreatId]);

  return (
    <g>
      {stations.map((s) => {
        const handleEnter = (e: MouseEvent) =>
          onHover({
            px: e.clientX,
            py: e.clientY,
            title: `${s.name} · ${s.weapon}`,
            lines: [
              `range of influence: ${s.rangeKm} km radius`,
              `ammo ${s.magazine}/${s.magazineMax}`,
              `reload ${s.reloadMin.toFixed(2)} m/round`,
              `cost $${(s.costPerShotUsd / 1000).toFixed(1)}K/shot`,
              `state: ${s.state}`,
              ...(s.mobilePatrol
                ? [
                    `CAP patrol: R=${s.mobilePatrol.radiusKm} km`,
                    `center (${s.mobilePatrol.centerKm.x.toFixed(0)}, ${s.mobilePatrol.centerKm.y.toFixed(0)}) km`,
                    `ω ${s.mobilePatrol.omegaRadPerMin >= 0 ? "+" : ""}${s.mobilePatrol.omegaRadPerMin.toFixed(3)} rad/min`,
                  ]
                : []),
            ],
          });
        const handleLeave = () => onHover(null);
        const hovered = hoveredStationId === s.id;
        const full =
          hovered ||
          (!!selectedThreatId && focusStationIds.has(s.id));
        return (
          <g
            key={s.id}
            onMouseEnter={handleEnter}
            onMouseMove={handleEnter}
            onMouseLeave={handleLeave}
            style={{ cursor: "default" }}
          >
            <StationGlyph
              s={s}
              hostFor={selectedThreat}
              hovered={hovered}
              detail={full ? "full" : "minimal"}
            />
          </g>
        );
      })}
    </g>
  );
}
