import { useSimStore } from "../../engine/store";
import type { Track } from "../../engine/types";
import { kmToSvgRaw } from "./coords";
import type { TooltipState } from "./HoverTooltip";

interface Props {
  onHover: (s: TooltipState | null) => void;
}

function trackColor(t: Track): string {
  if (
    t.classification === "HOSTILE" ||
    (t.classification !== "FRIEND" &&
      t.classification !== "CIVIL" &&
      t.side === "north")
  )
    return "#ff4d4d";
  if (t.classification === "FRIEND" || t.side === "south") return "#3fc1ff";
  return "#ffd24a";
}

function TrackGlyph({
  t,
  onHover,
}: {
  t: Track;
  onHover: (s: TooltipState | null) => void;
}) {
  const { x, y } = kmToSvgRaw(t.posKm.x, t.posKm.y);
  const color = trackColor(t);
  const selectedTrackId = useSimStore.getState().selectedTrackId;
  const isSel = t.id === selectedTrackId;

  const handleEnter = (e: React.MouseEvent) =>
    onHover({
      px: e.clientX,
      py: e.clientY,
      title: `${t.id} · ${t.classId}`,
      lines: [
        `class: ${t.classification}`,
        `pos: (${t.posKm.x.toFixed(0)}, ${t.posKm.y.toFixed(0)}) km`,
        `alt: ${t.altitudeM} m`,
        `score: ${(t.threatScore ?? 0).toFixed(2)}`,
      ],
    });
  const handleMove = handleEnter;
  const handleLeave = () => onHover(null);
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    useSimStore.getState().selectTrack(t.id);
  };
  const events = {
    onMouseEnter: handleEnter,
    onMouseMove: handleMove,
    onMouseLeave: handleLeave,
    onClick: handleClick,
    style: { cursor: "pointer" } as const,
  };

  // Trail
  const trailPoints = (t.trail ?? [])
    .map((p) => {
      const sp = kmToSvgRaw(p.x, p.y);
      return `${sp.x.toFixed(1)},${sp.y.toFixed(1)}`;
    })
    .join(" ");

  // NATO-ish glyph: hostile diamond, friend circle, unknown question.
  let glyph: React.ReactNode;
  const isHostile = color === "#ff4d4d";
  const isFriend = color === "#3fc1ff" && t.classification !== "UNKNOWN";
  if (isHostile) {
    const r = 6;
    glyph = (
      <polygon
        points={`${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`}
        fill={color}
        stroke="#000"
        strokeWidth={1}
      />
    );
  } else if (isFriend) {
    glyph = (
      <circle
        cx={x}
        cy={y}
        r={6}
        fill="none"
        stroke={color}
        strokeWidth={2}
      />
    );
  } else {
    glyph = (
      <>
        <circle
          cx={x}
          cy={y}
          r={6}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
        />
        <text
          x={x}
          y={y + 3.5}
          textAnchor="middle"
          fontSize={9}
          fill={color}
          fontFamily="monospace"
          fontWeight="bold"
        >
          ?
        </text>
      </>
    );
  }

  return (
    <g {...events}>
      {trailPoints && (
        <polyline
          points={trailPoints}
          fill="none"
          stroke={color}
          strokeOpacity={0.35}
          strokeWidth={1}
        />
      )}
      {isSel && (
        <circle
          cx={x}
          cy={y}
          r={11}
          fill="none"
          stroke="#fff"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      )}
      {glyph}
      <text
        x={x + 9}
        y={y - 7}
        fontSize={8}
        fontFamily="monospace"
        fill={color}
      >
        {t.id}
      </text>
    </g>
  );
}

export default function TrackLayer({ onHover }: Props) {
  const tracks = useSimStore((s) => s.tracks);
  return (
    <g>
      {tracks.map((t) => (
        <TrackGlyph key={t.id} t={t} onHover={onHover} />
      ))}
    </g>
  );
}
