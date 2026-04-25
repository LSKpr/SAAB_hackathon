import { useSimStore } from "../../engine/store";
import { kmToSvgRaw } from "./coords";
import { fmtMin } from "../Panels/format";

const FLASH_DURATION_MIN = 0.05;

/**
 * Renders:
 *  - A dashed amber line from station → threat for each pending (queued)
 *    engagement, so the operator sees their pre-armed assignments live.
 *  - For every pending engagement whose intercept window is in the
 *    future (the threat hasn't entered range yet, but will), an amber
 *    dot at the predicted entry point on the disc boundary plus a
 *    dotted thread from the threat's current position to that entry
 *    point. Title attribute carries the time-to-first-shot.
 *  - A brief streak from station → threat for each resolved Engagement within
 *    the last `FLASH_DURATION_MIN` sim minutes, ending in a green ✓ on HIT or
 *    red × on MISS.
 */
export default function EngagementLayer() {
  const engagements = useSimStore((s) => s.engagements);
  const pending = useSimStore((s) => s.pendingEngagements);
  const stations = useSimStore((s) => s.stations);
  const threats = useSimStore((s) => s.threats);
  const suggestions = useSimStore((s) => s.suggestions);
  const simT = useSimStore((s) => s.simTimeMin);
  const selectedThreatId = useSimStore((s) => s.selectedThreatId);

  const flashes = engagements
    .filter((e) => simT - e.resolvedAtT <= FLASH_DURATION_MIN)
    .slice(-12);

  if (flashes.length === 0 && pending.length === 0) return null;

  return (
    <g>
      {pending.map((pe) => {
        const s = stations.find((x) => x.id === pe.stationId);
        const t = threats.find((x) => x.id === pe.threatId);
        if (!s || !t) return null;
        if (t.state !== "INBOUND" && t.state !== "ENGAGED") return null;
        const a = kmToSvgRaw(s.posKm.x, s.posKm.y);
        const b = kmToSvgRaw(t.posKm.x, t.posKm.y);
        const sug = suggestions.find(
          (x) => x.threatId === pe.threatId && x.stationId === pe.stationId,
        );
        const win = sug?.intercept;
        const showEntry =
          win &&
          !win.alreadyInRange &&
          !win.noIntercept &&
          !win.hitsBeforeEntry;
        const entry = showEntry
          ? kmToSvgRaw(win!.enterPosKm.x, win!.enterPosKm.y)
          : null;
        const etaLabel = showEntry ? fmtMin(win!.enterT - simT) : "";
        const focused =
          !selectedThreatId || pe.threatId === selectedThreatId;
        const lineOp = focused ? 0.42 : 0.1;
        const lineW = focused ? 1 : 0.65;
        return (
          <g key={pe.id} pointerEvents="none">
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#ca8a04"
              strokeWidth={lineW}
              strokeOpacity={lineOp}
              strokeDasharray="4 5"
            />
            {focused && (
              <>
                <circle
                  cx={b.x}
                  cy={b.y}
                  r={9}
                  fill="none"
                  stroke="#ca8a04"
                  strokeWidth={0.75}
                  strokeOpacity={0.35}
                  strokeDasharray="2 4"
                />
                {entry && (
                  <g>
                    <line
                      x1={b.x}
                      y1={b.y}
                      x2={entry.x}
                      y2={entry.y}
                      stroke="#ca8a04"
                      strokeWidth={0.75}
                      strokeOpacity={0.28}
                      strokeDasharray="2 7"
                    />
                    <circle
                      cx={entry.x}
                      cy={entry.y}
                      r={3.25}
                      fill="#ca8a04"
                      fillOpacity={0.65}
                      stroke="#eab308"
                      strokeWidth={0.5}
                      strokeOpacity={0.7}
                    >
                      <title>first shot in {etaLabel}</title>
                    </circle>
                  </g>
                )}
              </>
            )}
          </g>
        );
      })}
      {flashes.map((e) => {
        const s = stations.find((x) => x.id === e.stationId);
        const t = threats.find((x) => x.id === e.threatId);
        if (!s || !t) return null;
        const a = kmToSvgRaw(s.posKm.x, s.posKm.y);
        const b = kmToSvgRaw(t.posKm.x, t.posKm.y);
        const ageMin = Math.max(0, simT - e.resolvedAtT);
        const k = Math.min(1, ageMin / FLASH_DURATION_MIN);
        const op = 1 - k;
        const hit = e.rolledOutcome === "HIT";
        const color = hit ? "#22c55e" : "#ef4444";
        return (
          <g key={e.id} opacity={op} pointerEvents="none">
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={color}
              strokeWidth={2}
              strokeOpacity={0.85}
            />
            {hit ? (
              <g>
                <circle cx={b.x} cy={b.y} r={9} fill="none" stroke="#22c55e" strokeWidth={2} />
                <text
                  x={b.x}
                  y={b.y + 3.5}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight="bold"
                  fill="#22c55e"
                  fontFamily="monospace"
                >
                  ✓
                </text>
              </g>
            ) : (
              <g>
                <line x1={b.x - 6} y1={b.y - 6} x2={b.x + 6} y2={b.y + 6} stroke="#ef4444" strokeWidth={2} />
                <line x1={b.x + 6} y1={b.y - 6} x2={b.x - 6} y2={b.y + 6} stroke="#ef4444" strokeWidth={2} />
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}
