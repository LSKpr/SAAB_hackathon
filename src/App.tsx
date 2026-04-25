import { useEffect } from "react";
import { useSimStore } from "./engine/store";
import { startTickLoop, stopTickLoop } from "./engine/tick";
import { parseAssetsFromCsvText } from "./data/parseAssets";
import csvText from "../data/boreal-passage.csv?raw";
import scenario01legacy from "../data/scenarios/01-saturation-raid.json";
import scenario01multi from "../data/scenarios/01-multi-wave.json";
import scenario02 from "../data/scenarios/02-single-srbm.json";
import scenario03 from "../data/scenarios/03-swarm-only.json";
import worldJson from "../data/world.json";
import type {
  DefenseStation,
  Infrastructure,
  Scenario,
  Side,
} from "./engine/types";

interface RawInfra {
  id: string;
  name: string;
  type: Infrastructure["type"];
  size: Infrastructure["size"];
  posKm: [number, number];
  damageOnHitUsd: number;
  importanceOverride?: number;
}

interface RawStation {
  id: string;
  name: string;
  /** `north` = attacker territory (does not engage own outbound tracks). */
  side?: Side;
  weapon: DefenseStation["weapon"];
  posKm: [number, number];
  rangeKm: number;
  magazineMax: number;
  magazine: number;
  reloadMin: number;
  costPerShotUsd: number;
  mobilePatrol?: {
    centerKm: [number, number];
    radiusKm: number;
    omegaRadPerMin: number;
    angleRad?: number;
  };
}

function normalizeWorld(): {
  infrastructure: Infrastructure[];
  stations: DefenseStation[];
} {
  const w = worldJson as { infrastructure: RawInfra[]; stations: RawStation[] };
  const infrastructure: Infrastructure[] = w.infrastructure.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    size: a.size,
    posKm: { x: a.posKm[0], y: a.posKm[1] },
    damageOnHitUsd: a.damageOnHitUsd,
    importanceOverride: a.importanceOverride,
    state: "INTACT",
    damageTakenUsd: 0,
  }));
  const stations: DefenseStation[] = w.stations.map((s) => {
    const posKm = { x: s.posKm[0], y: s.posKm[1] };
    const mobilePatrol = s.mobilePatrol
      ? {
          centerKm: {
            x: s.mobilePatrol.centerKm[0],
            y: s.mobilePatrol.centerKm[1],
          },
          radiusKm: s.mobilePatrol.radiusKm,
          omegaRadPerMin: s.mobilePatrol.omegaRadPerMin,
          angleRad:
            s.mobilePatrol.angleRad ??
            Math.atan2(
              posKm.y - s.mobilePatrol.centerKm[1],
              posKm.x - s.mobilePatrol.centerKm[0],
            ),
        }
      : undefined;
    return {
      id: s.id,
      name: s.name,
      ...(s.side !== undefined ? { side: s.side } : {}),
      posKm,
      weapon: s.weapon,
      rangeKm: s.rangeKm,
      costPerShotUsd: s.costPerShotUsd,
      magazine: s.magazine,
      magazineMax: s.magazineMax,
      reloadMin: s.reloadMin,
      state: "READY" as const,
      emcon: "WHITE" as const,
      mobilePatrol,
    };
  });
  return { infrastructure, stations };
}
import BorealMap from "./components/Map/BorealMap";
import TopBar from "./components/Panels/TopBar";
import TrackListPanel from "./components/Panels/TrackListPanel";
import EngagementPanel from "./components/Panels/EngagementPanel";
import ResourcePanel from "./components/Panels/ResourcePanel";
import AlertsPanel from "./components/Panels/AlertsPanel";
import TimelinePanel from "./components/Panels/TimelinePanel";
import ThreatsPanel from "./components/Panels/ThreatsPanel";
import AfterActionPanel from "./components/Panels/AfterActionPanel";

const SCENARIOS: { id: string; label: string; data: Scenario }[] = [
  { id: "01", label: "01 · Continuous multi-axis (defense)", data: scenario01multi as unknown as Scenario },
  { id: "02", label: "02 · Continuous SRBM barrage (defense)", data: scenario02 as unknown as Scenario },
  { id: "03", label: "03 · Continuous swarm (defense)", data: scenario03 as unknown as Scenario },
  { id: "00", label: "00 · Saturation raid (legacy regression)", data: scenario01legacy as unknown as Scenario },
];

export default function App() {
  const setAssets = useSimStore((s) => s.setAssets);
  const setDefaultWorld = useSimStore((s) => s.setDefaultWorld);
  const loadScenario = useSimStore((s) => s.loadScenario);
  const scenarioId = useSimStore((s) => s.scenarioId);
  const scenarioMode = useSimStore((s) => s.scenarioMode);

  useEffect(() => {
    const assets = parseAssetsFromCsvText(csvText);
    setAssets(assets);
    const w = normalizeWorld();
    setDefaultWorld(w.infrastructure, w.stations);
    loadScenario(SCENARIOS[0].data, { scenarioId: SCENARIOS[0].id });
    startTickLoop();
    return () => stopTickLoop();
  }, [setAssets, setDefaultWorld, loadScenario]);

  const onPickScenario = (id: string) => {
    const s = SCENARIOS.find((x) => x.id === id);
    if (!s) return;
    loadScenario(s.data, { scenarioId: s.id });
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#04060a] text-slate-200">
      <TopBar
        scenarios={SCENARIOS.map(({ id, label }) => ({ id, label }))}
        onPickScenario={onPickScenario}
        activeScenarioId={scenarioId}
      />
      {scenarioMode === "defense" ? (
        <div className="flex-1 grid grid-cols-[248px_minmax(0,1fr)_min(380px,36vw)] gap-3 p-3 min-h-0">
          <div className="flex flex-col gap-3 min-h-0">
            <ResourcePanel />
            <AlertsPanel />
          </div>
          <div className="panel relative min-h-0 overflow-hidden ring-1 ring-black/50 rounded-lg">
            <BorealMap />
          </div>
          <div className="flex flex-col gap-3 min-h-0">
            <ThreatsPanel />
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-[260px_minmax(0,1fr)_280px] gap-2 p-2 min-h-0">
          <div className="flex flex-col gap-2 min-h-0">
            <TrackListPanel />
            <EngagementPanel />
          </div>
          <div className="panel relative min-h-0 overflow-hidden">
            <BorealMap />
          </div>
          <div className="flex flex-col gap-2 min-h-0">
            <ResourcePanel />
            <AlertsPanel />
          </div>
        </div>
      )}
      <TimelinePanel />
      <AfterActionPanel />
    </div>
  );
}
