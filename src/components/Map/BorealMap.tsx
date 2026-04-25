import { useState } from "react";
import MapSvg from "../../assets/map/boreal-passage.svg?react";
import AssetLayer from "./AssetLayer";
import TrackLayer from "./TrackLayer";
import RangeRingLayer from "./RangeRingLayer";
import InfrastructureLayer from "./InfrastructureLayer";
import DefenseStationLayer from "./DefenseStationLayer";
import ImportanceHeatmapLayer from "./ImportanceHeatmapLayer";
import ThreatLayer from "./ThreatLayer";
import EngagementLayer from "./EngagementLayer";
import HoverTooltip, { type TooltipState } from "./HoverTooltip";
import { useSimStore } from "../../engine/store";

/**
 * The map is composed of two stacked SVGs that share the same viewBox.
 * - Bottom: the imported terrain/coastline SVG (asset markers stripped).
 * - Top: an overlay SVG with one of two layer stacks depending on scenario
 *   mode. The Phase 1–3 legacy stack draws CSV assets + Tracks; the defense
 *   stack draws Infrastructure + DefenseStations + Threats.
 */
export default function BorealMap() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const mode = useSimStore((s) => s.scenarioMode);

  return (
    <div className="absolute inset-0">
      <MapSvg
        className="absolute inset-0 w-full h-full block"
        preserveAspectRatio="xMidYMid meet"
      />
      <svg
        viewBox="0 0 1000 780"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full block"
        onMouseLeave={() => setTooltip(null)}
      >
        {mode === "defense" ? (
          <>
            <ImportanceHeatmapLayer />
            <InfrastructureLayer onHover={setTooltip} />
            <DefenseStationLayer onHover={setTooltip} />
            <ThreatLayer onHover={setTooltip} />
            <EngagementLayer />
          </>
        ) : (
          <>
            <RangeRingLayer />
            <AssetLayer onHover={setTooltip} />
            <TrackLayer onHover={setTooltip} />
          </>
        )}
      </svg>
      <HoverTooltip state={tooltip} />
    </div>
  );
}
