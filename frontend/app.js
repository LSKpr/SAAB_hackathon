const MAP_WIDTH = 1000;
const MAP_HEIGHT = 780;
const CSV_WIDTH_KM = 1666.7;
const CSV_HEIGHT_KM = 1300;

const resources = [
  { id: "lr-01", name: "Long-range interceptor", count: 6, cost: 92, reloadPenalty: 88, optionValue: 96, range: 260, effectiveness: { "ballistic-missile": 0.82, "cruise-missile": 0.74, drone: 0.70, jammer: 0.18 } },
  { id: "sr-02", name: "Short-range battery", count: 12, cost: 35, reloadPenalty: 42, optionValue: 47, range: 170, effectiveness: { "ballistic-missile": 0.22, "cruise-missile": 0.58, drone: 0.72, jammer: 0.24 } },
  { id: "cd-03", name: "Counter-drone system", count: 18, cost: 14, reloadPenalty: 18, optionValue: 21, range: 115, effectiveness: { "ballistic-missile": 0.04, "cruise-missile": 0.16, drone: 0.86, jammer: 0.34 } },
  { id: "mob-04", name: "Mobile air-defense unit", count: 4, cost: 56, reloadPenalty: 64, optionValue: 69, range: 205, effectiveness: { "ballistic-missile": 0.38, "cruise-missile": 0.67, drone: 0.55, jammer: 0.42 } },
];

const grammars = [
  { intent: "decoy-first", label: "Decoy-first", story: "Probe -> Decoy -> Resource drain -> Precision strike", signals: { "ballistic-missile": 0.08, "cruise-missile": 0.22, drone: 0.62, jammer: 0.08 }, followUpPressure: 0.76, sectorShiftPressure: 0.24, premiumNeed: 0.82 },
  { intent: "saturation", label: "Saturation", story: "Single-axis drone wave -> Pause -> Multi-axis missile/drone mix", signals: { "ballistic-missile": 0.18, "cruise-missile": 0.34, drone: 0.38, jammer: 0.10 }, followUpPressure: 0.83, sectorShiftPressure: 0.44, premiumNeed: 0.62 },
  { intent: "high-value-strike", label: "High-value strike", story: "Low-value swarm -> Radar stress -> High-value follow-up", signals: { "ballistic-missile": 0.31, "cruise-missile": 0.38, drone: 0.22, jammer: 0.09 }, followUpPressure: 0.91, sectorShiftPressure: 0.31, premiumNeed: 0.94 },
  { intent: "sector-shift", label: "Sector shift", story: "Visible pressure -> Defense displacement -> Strike elsewhere", signals: { "ballistic-missile": 0.13, "cruise-missile": 0.32, drone: 0.42, jammer: 0.13 }, followUpPressure: 0.67, sectorShiftPressure: 0.86, premiumNeed: 0.58 },
  { intent: "random-harassment", label: "Harassment", story: "Uncoordinated harassment waves with low follow-up coherence", signals: { "ballistic-missile": 0.12, "cruise-missile": 0.18, drone: 0.55, jammer: 0.15 }, followUpPressure: 0.29, sectorShiftPressure: 0.19, premiumNeed: 0.27 },
];

const postures = [
  { posture: "Greedy Intercept", use: { "lr-01": 5, "sr-02": 5, "cd-03": 6, "mob-04": 2 }, reserve: [], move: [], rationale: "Maximize the current intercept with the strongest available mix." },
  { posture: "Flexible Hold", use: { "sr-02": 3, "cd-03": 8, "mob-04": 1 }, reserve: ["lr-01"], move: ["mob-04 -> threatened asset"], rationale: "Contain current pressure while preserving premium options for likely follow-up strikes." },
  { posture: "Distributed Defense", use: { "lr-01": 1, "sr-02": 5, "cd-03": 7, "mob-04": 2 }, reserve: ["lr-01"], move: ["mob-04 -> east passage", "mob-04 -> west passage"], rationale: "Spread coverage against multi-axis saturation and sector-shift behavior." },
  { posture: "Mobile Reposition", use: { "cd-03": 5, "mob-04": 2 }, reserve: ["lr-01", "sr-02"], move: ["mob-04 -> alternate target cluster"], rationale: "Prioritize future geometry when the attack appears to be drawing defenses out of position." },
];

const elements = {
  threatKind: document.querySelector("#threatKind"), targetId: document.querySelector("#targetId"), sector: document.querySelector("#sector"), count: document.querySelector("#count"), countValue: document.querySelector("#countValue"), sophistication: document.querySelector("#sophistication"), sophisticationValue: document.querySelector("#sophisticationValue"), regretMap: document.querySelector("#regretMap"), beliefBars: document.querySelector("#beliefBars"), postureCards: document.querySelector("#postureCards"), resourceControls: document.querySelector("#resourceControls"), recommendationBadge: document.querySelector("#recommendationBadge"), metricReduction: document.querySelector("#metricReduction"), metricFlexibility: document.querySelector("#metricFlexibility"), metricRegret: document.querySelector("#metricRegret"), metricOvercommitment: document.querySelector("#metricOvercommitment"), recommendationCopy: document.querySelector("#recommendationCopy"), commanderNote: document.querySelector("#commanderNote"), decisionState: document.querySelector("#decisionState"), decisionLog: document.querySelector("#decisionLog"), canvas: document.querySelector("#attackCanvas"), simClock: document.querySelector("#simClock"), simulationTimeline: document.querySelector("#simulationTimeline"),
};

const ctx = elements.canvas.getContext("2d");
const mapImage = new Image();
mapImage.src = "assets/the-boreal-passage-map.svg";
mapImage.onload = () => drawFrame();
mapImage.onerror = () => {
  addTimeline("Map warning", "SVG backdrop did not decode, using generated fallback map.");
  drawFrame();
};

const state = {
  selectedPosture: "Flexible Hold",
  manualUse: {},
  decision: "Pending",
  features: [],
  northAssets: [],
  southAssets: [],
  activeThreats: [],
  intercepts: [],
  timeline: [],
  running: false,
  simTime: 0,
  lastFrame: 0,
  nextThreatId: 1,
  rafId: null,
  attackPlan: [],
  firedEvents: new Set(),
  latestRecommendation: null,
  lastUiRender: -1,
};

function kmToMap(xKm, yKm) {
  return { x: (xKm / CSV_WIDTH_KM) * MAP_WIDTH, y: (yKm / CSV_HEIGHT_KM) * MAP_HEIGHT };
}

async function loadEnvironment() {
  const text = await fetch("assets/Boreal_passage_coordinates.csv").then((response) => response.text());
  const rows = parseCsv(text).filter((row) => row.record_type === "location");
  state.features = rows.map((row, index) => {
    const point = kmToMap(Number(row.x_km), Number(row.y_km));
    return {
      id: `asset-${index}`,
      name: row.feature_name,
      side: row.side,
      subtype: row.subtype,
      context: row.location_context,
      notes: row.notes,
      sector: sectorFromPoint(point),
      criticality: criticalityFor(row.subtype),
      ...point,
    };
  });
  state.northAssets = state.features.filter((feature) => feature.side === "north");
  state.southAssets = state.features.filter((feature) => feature.side === "south");
  populateTargets();
  setInitialControls();
  resetSimulationState(false);
  render();
  drawFrame();
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = splitCsvLine(lines.shift());
  return lines.map((line) => Object.fromEntries(splitCsvLine(line).map((value, index) => [headers[index], value])));
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { result.push(current); current = ""; }
    else current += char;
  }
  result.push(current);
  return result;
}

function populateTargets() {
  elements.targetId.innerHTML = state.northAssets.map((asset) => `<option value="${asset.id}">${asset.name}</option>`).join("");
}

function setInitialControls() {
  const command = state.northAssets.find((asset) => asset.name.includes("Highridge")) || state.northAssets[0];
  elements.targetId.value = command.id;
  elements.threatKind.value = "drone";
  elements.sector.value = "south";
  elements.count.value = "22";
  elements.sophistication.value = "72";
}

function baseScenario() {
  return { kind: elements.threatKind.value, count: Number(elements.count.value), sector: elements.sector.value, sophistication: Number(elements.sophistication.value) / 100, targetId: elements.targetId.value };
}

function liveScenario() {
  const active = state.activeThreats.filter((threat) => threat.count > 0 && threat.progress < 1);
  if (!active.length) return baseScenario();
  const totalCount = active.reduce((sum, threat) => sum + threat.count, 0);
  const lead = [...active].sort((a, b) => threatPressure(b) - threatPressure(a))[0];
  return {
    kind: lead.kind,
    count: Math.max(1, Math.round(totalCount)),
    sector: lead.sector,
    sophistication: active.reduce((sum, threat) => sum + threat.sophistication * threat.count, 0) / totalCount,
    targetId: lead.targetId,
  };
}

function buildAttackPlan() {
  const base = baseScenario();
  const primary = assetById(base.targetId);
  const second = nearestAsset(primary, state.northAssets.filter((asset) => asset.id !== primary.id));
  const coastal = state.northAssets.find((asset) => asset.name.includes("Nordvik")) || second;
  return [
    { t: 0, label: "Probe wave", kind: base.kind, count: base.count, from: southernLaunch("west"), targetId: primary.id, sophistication: base.sophistication, grammar: "decoy-first" },
    { t: 5.5, label: "Radar stressors", kind: "jammer", count: 3, from: southernLaunch("central"), targetId: primary.id, sophistication: 0.78, grammar: "high-value-strike" },
    { t: 9.5, label: "Low-altitude cruise track", kind: "cruise-missile", count: 7, from: southernLaunch("east"), targetId: primary.id, sophistication: 0.84, grammar: "high-value-strike" },
    { t: 13.5, label: "Sector shift", kind: "drone", count: 16, from: southernLaunch("far-east"), targetId: second.id, sophistication: 0.73, grammar: "sector-shift" },
    { t: 18.5, label: "Saturation split", kind: "drone", count: 28, from: southernLaunch("west"), targetId: coastal.id, sophistication: 0.69, grammar: "saturation" },
    { t: 23.5, label: "Precision follow-up", kind: "ballistic-missile", count: 4, from: southernLaunch("central"), targetId: primary.id, sophistication: 0.91, grammar: "high-value-strike" },
    { t: 29.0, label: "Second-axis cruise wave", kind: "cruise-missile", count: 9, from: southernLaunch("far-west"), targetId: second.id, sophistication: 0.86, grammar: "saturation" },
  ];
}

function southernLaunch(slot) {
  const anchors = {
    "far-west": { x: 60, y: 690 }, west: { x: 190, y: 715 }, central: { x: 555, y: 650 }, east: { x: 820, y: 670 }, "far-east": { x: 930, y: 615 },
  };
  return anchors[slot] || anchors.central;
}

function resetSimulationState(seed) {
  pauseSimulation();
  state.simTime = 0;
  state.lastFrame = 0;
  state.activeThreats = [];
  state.intercepts = [];
  state.timeline = [];
  state.nextThreatId = 1;
  state.firedEvents = new Set();
  state.attackPlan = buildAttackPlan();
  if (seed) fireEvent(state.attackPlan[0]);
  setDecision("Pending");
}

function startSimulation() {
  if (!state.activeThreats.length && state.firedEvents.size === 0) resetSimulationState(true);
  if (state.running) return;
  state.running = true;
  state.lastFrame = performance.now();
  state.rafId = requestAnimationFrame(animationLoop);
}

function pauseSimulation() {
  state.running = false;
  if (state.rafId !== null) cancelAnimationFrame(state.rafId);
  state.rafId = null;
}

function animationLoop(timestamp) {
  if (!state.running) return;
  const delta = Math.min(0.08, (timestamp - state.lastFrame) / 1000 || 0.016);
  state.lastFrame = timestamp;
  advanceSimulation(delta);
  drawFrame();
  state.rafId = requestAnimationFrame(animationLoop);
}

function advanceSimulation(delta) {
  state.simTime += delta;
  fireScheduledEvents();
  applyDefense(delta);
  moveThreats(delta);
  state.intercepts = state.intercepts.filter((effect) => state.simTime - effect.time < 0.9);
  if (state.simTime - state.lastUiRender > 0.22) {
    state.lastUiRender = state.simTime;
    render(false);
  }
}

function stepSimulation() {
  if (!state.activeThreats.length && state.firedEvents.size === 0) resetSimulationState(true);
  for (let i = 0; i < 18; i += 1) advanceSimulation(1 / 18);
  drawFrame();
}

function fireScheduledEvents() {
  state.attackPlan.forEach((event) => {
    if (state.simTime >= event.t && !state.firedEvents.has(event.t)) fireEvent(event);
  });
}

function fireEvent(event) {
  state.firedEvents.add(event.t);
  spawnThreat(event);
  addTimeline(event.label, `${event.count} ${event.kind}s inbound toward ${assetById(event.targetId).name}`);
}

function spawnThreat(event) {
  const target = assetById(event.targetId);
  const curve = (state.nextThreatId % 2 === 0 ? -1 : 1) * (55 + Math.random() * 60);
  state.activeThreats.push({
    id: state.nextThreatId++, kind: event.kind, count: event.count, initialCount: event.count, sector: sectorFromPoint(event.from), targetId: event.targetId, grammar: event.grammar, sophistication: event.sophistication, progress: 0, x: event.from.x, y: event.from.y, startX: event.from.x, startY: event.from.y, targetX: target.x, targetY: target.y, curve, speed: speedFor(event.kind, event.sophistication), leaked: false,
  });
}

function applyDefense(delta) {
  const selected = buildManualPlan(selectedBasePosture());
  const defendedAssets = defendedPositions(selected);
  state.activeThreats.forEach((threat) => {
    const coverage = defendedAssets.reduce((best, defense) => {
      const distance = Math.hypot(threat.x - defense.x, threat.y - defense.y);
      if (distance > defense.range) return best;
      return Math.max(best, (1 - distance / defense.range) * defense.effectiveness[threat.kind] * defense.assigned);
    }, 0);
    if (coverage <= 0) return;
    const attrition = coverage * delta * (threat.kind === "drone" ? 2.2 : 1.25);
    const removed = Math.min(threat.count, attrition);
    threat.count -= removed;
    if (removed > 0.08 && Math.random() < 0.42) state.intercepts.push({ x: threat.x, y: threat.y, time: state.simTime, size: 7 + removed * 1.4 });
  });
  state.activeThreats = state.activeThreats.filter((threat) => threat.count > 0.6 && threat.progress < 1);
}

function defendedPositions(plan) {
  const primary = currentPrimaryAsset();
  const alternate = nearestAsset(primary, state.northAssets.filter((asset) => asset.id !== primary.id));
  return resources.flatMap((resource, index) => {
    const assigned = plan.use[resource.id] || 0;
    if (!assigned) return [];
    const anchor = resource.id === "mob-04" && plan.move.length ? alternate : primary;
    const spread = (index - 1.5) * 18;
    return [{ x: anchor.x + spread, y: anchor.y + spread * 0.3, range: resource.range, effectiveness: resource.effectiveness, assigned: assigned / resource.count }];
  });
}

function moveThreats(delta) {
  state.activeThreats.forEach((threat) => {
    threat.progress = clamp(threat.progress + threat.speed * delta, 0, 1);
    const point = curvedPoint(threat, threat.progress);
    threat.x = point.x;
    threat.y = point.y;
    if (threat.progress >= 0.98 && !threat.leaked) {
      threat.leaked = true;
      addTimeline("Impact risk", `${Math.round(threat.count)} ${threat.kind}s reached ${assetById(threat.targetId).name}`);
    }
  });
}

function curvedPoint(threat, t) {
  const midX = (threat.startX + threat.targetX) / 2 + threat.curve;
  const midY = (threat.startY + threat.targetY) / 2 - Math.abs(threat.curve) * 0.35;
  const x = (1 - t) * (1 - t) * threat.startX + 2 * (1 - t) * t * midX + t * t * threat.targetX;
  const y = (1 - t) * (1 - t) * threat.startY + 2 * (1 - t) * t * midY + t * t * threat.targetY;
  return { x, y };
}

function liveBelief(wave) {
  const activeGrammars = state.activeThreats.reduce((acc, threat) => ({ ...acc, [threat.grammar]: (acc[threat.grammar] || 0) + threatPressure(threat) }), {});
  const totalPressure = Object.values(activeGrammars).reduce((sum, value) => sum + value, 0);
  const weighted = grammars.map((grammar) => {
    const signalFit = grammar.signals[wave.kind];
    const sophisticationFit = 0.6 + wave.sophistication * grammar.followUpPressure * 0.6;
    const swarmFit = wave.kind === "drone" && wave.count >= 15 ? 1.25 : 1;
    const observedGrammar = totalPressure ? 1 + ((activeGrammars[grammar.intent] || 0) / totalPressure) * 1.35 : 1;
    const shiftFit = state.activeThreats.some((threat) => threat.targetId !== elements.targetId.value) && grammar.intent === "sector-shift" ? 1.45 : 1;
    return { intent: grammar.intent, likelihood: signalFit * sophisticationFit * swarmFit * observedGrammar * shiftFit };
  });
  const total = weighted.reduce((sum, entry) => sum + entry.likelihood, 0);
  return Object.fromEntries(weighted.map((entry) => [entry.intent, entry.likelihood / total]));
}

function evaluate(plan, wave, belief) {
  const target = assetById(wave.targetId);
  const immediateThreatReduction = currentReduction(plan, wave);
  const assetProtectionValue = immediateThreatReduction * target.criticality;
  const resourceCost = sumResources(plan, "cost");
  const reloadRepositionPenalty = sumResources(plan, "reloadPenalty") + plan.move.length * 18;
  const futureFlexibilityPreserved = futureFlexibility(plan);
  const overcommitmentRisk = overcommitment(plan);
  const futureRegretRisk = grammars.reduce((sum, grammar) => {
    const spentPremium = (plan.use["lr-01"] || 0) / 6;
    const spentMobile = (plan.use["mob-04"] || 0) / 4;
    const repositioned = plan.move.length > 0 ? 0.72 : 1;
    const premiumRegret = spentPremium * grammar.premiumNeed * 100;
    const sectorRegret = spentMobile * grammar.sectorShiftPressure * 60 * repositioned;
    const followUpRegret = overcommitmentRisk * grammar.followUpPressure * 0.44;
    return sum + belief[grammar.intent] * (premiumRegret + sectorRegret + followUpRegret);
  }, 0);
  const urgencyPenalty = state.activeThreats.some((threat) => threat.progress > 0.82) ? 30 : 0;
  const score = immediateThreatReduction * 175 + assetProtectionValue * 0.42 + futureFlexibilityPreserved * 1.08 - resourceCost * 0.31 - reloadRepositionPenalty * 0.24 - futureRegretRisk * 1.05 - overcommitmentRisk * 0.78 - urgencyPenalty;
  return { plan, score, immediateThreatReduction, assetProtectionValue, resourceCost, reloadRepositionPenalty, futureFlexibilityPreserved, overcommitmentRisk, futureRegretRisk };
}

function currentReduction(plan, wave) {
  const interceptMass = resources.reduce((sum, resource) => sum + (plan.use[resource.id] || 0) * resource.effectiveness[wave.kind], 0);
  const activeUrgency = state.activeThreats.reduce((max, threat) => Math.max(max, threat.progress), 0);
  const requiredMass = Math.max(1, wave.count * (0.48 + wave.sophistication * 0.18 + activeUrgency * 0.15));
  return clamp(interceptMass / requiredMass, 0, 0.96);
}

function bestEvaluations() {
  const wave = liveScenario();
  const belief = liveBelief(wave);
  return postures.map((posture) => evaluate(posture, wave, belief)).sort((a, b) => b.score - a.score);
}

function render(updateControls = true) {
  if (!state.features.length) return;
  const wave = liveScenario();
  if (updateControls && !state.running && !state.activeThreats.length) elements.count.value = wave.count;
  elements.countValue.textContent = wave.count;
  elements.sophisticationValue.textContent = percent(wave.sophistication);
  elements.simClock.textContent = `T+${state.simTime.toFixed(1)}s`;
  const belief = liveBelief(wave);
  const evaluated = bestEvaluations();
  const recommended = evaluated[0];
  const previousRecommendation = state.latestRecommendation;
  state.latestRecommendation = recommended.plan.posture;
  if (state.running && previousRecommendation && previousRecommendation !== state.latestRecommendation) addTimeline("Recommendation changed", `${previousRecommendation} -> ${state.latestRecommendation}`);
  const selectedBase = selectedBasePosture() || recommended.plan;
  if (Object.keys(state.manualUse).length === 0) state.manualUse = { ...selectedBase.use };
  const selectedEvaluation = evaluate(buildManualPlan(selectedBase), wave, belief);
  elements.recommendationBadge.textContent = recommended.plan.posture;
  renderBeliefs(belief);
  renderRegretMap(regretMap(belief));
  renderPostures(evaluated);
  renderResourceControls(selectedBase);
  renderDecision(selectedEvaluation, recommended, wave);
  renderTimeline();
}

function drawFrame() {
  ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  if (mapImage.complete && mapImage.naturalWidth > 0) ctx.drawImage(mapImage, 0, 0, MAP_WIDTH, MAP_HEIGHT);
  else drawFallbackMap();
  drawDefenseCoverage(buildManualPlan(selectedBasePosture()));
  drawThreatRoutes();
  drawThreats();
  drawIntercepts();
  drawTrackedAssets();
}

function drawFallbackMap() {
  ctx.fillStyle = "#0f1e2e";
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= MAP_WIDTH; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_HEIGHT); ctx.stroke(); }
  for (let y = 0; y <= MAP_HEIGHT; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_WIDTH, y); ctx.stroke(); }
  ctx.fillStyle = "rgba(38,51,38,0.95)";
  ctx.fillRect(0, 0, MAP_WIDTH, 230);
  ctx.fillStyle = "rgba(58,50,34,0.95)";
  ctx.fillRect(0, 610, MAP_WIDTH, 170);
  ctx.fillStyle = "rgba(180,210,240,0.12)";
  ctx.font = "700 28px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("THE BOREAL PASSAGE", MAP_WIDTH / 2, MAP_HEIGHT / 2);
  ctx.textAlign = "left";
}

function drawDefenseCoverage(plan) {
  defendedPositions(plan).forEach((defense) => {
    ctx.beginPath();
    ctx.arc(defense.x, defense.y, defense.range, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(214, 173, 79, 0.06)";
    ctx.fill();
    ctx.strokeStyle = "rgba(214, 173, 79, 0.28)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  });
}

function drawThreatRoutes() {
  state.activeThreats.forEach((threat) => {
    ctx.beginPath();
    ctx.moveTo(threat.startX, threat.startY);
    for (let i = 1; i <= 24; i += 1) {
      const point = curvedPoint(threat, i / 24);
      ctx.lineTo(point.x, point.y);
    }
    ctx.strokeStyle = threat.kind === "ballistic-missile" ? "rgba(224,93,93,0.70)" : "rgba(224,93,93,0.38)";
    ctx.setLineDash([5, 8]);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  });
}

function drawThreats() {
  state.activeThreats.forEach((threat) => {
    const radius = clamp(7 + Math.sqrt(threat.count) * 2.4, 8, 25);
    const pulse = 1 + Math.sin(performance.now() / 130 + threat.id) * 0.08;
    ctx.beginPath();
    ctx.arc(threat.x, threat.y, radius * pulse, 0, Math.PI * 2);
    ctx.fillStyle = threatColor(threat.kind);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.78)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = "#f7f9fc";
    ctx.font = "700 12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(Math.ceil(threat.count)), threat.x, threat.y + 4);
    ctx.textAlign = "left";
  });
}

function drawIntercepts() {
  state.intercepts.forEach((effect) => {
    const age = state.simTime - effect.time;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.size + age * 36, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.72 - age)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function drawTrackedAssets() {
  state.northAssets.forEach((asset) => {
    ctx.beginPath();
    ctx.arc(asset.x, asset.y, asset.subtype === "capital" ? 8 : 6, 0, Math.PI * 2);
    ctx.fillStyle = asset.subtype === "capital" ? "#ffcc00" : "#3fc1ff";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.stroke();
  });
}

function renderBeliefs(belief) {
  elements.beliefBars.innerHTML = grammars.map((grammar) => ({ ...grammar, probability: belief[grammar.intent] })).sort((a, b) => b.probability - a.probability).map((grammar) => `<div class="belief-row"><div class="belief-label"><span>${grammar.label}</span><strong>${percent(grammar.probability)}</strong></div><div class="belief-track"><div class="belief-fill" style="width:${grammar.probability * 100}%"></div></div></div>`).join("");
}

function renderRegretMap(rows) {
  elements.regretMap.innerHTML = `<div class="regret-row header"><span>Future</span><span>Prob.</span><span>Best current action</span><span>Regret</span></div>${rows.map(([scenarioName, probability, action, regret]) => `<div class="regret-row"><strong>${scenarioName}</strong><span>${percent(probability)}</span><span>${action}</span><span class="risk-pill risk-${regret.toLowerCase()}">${regret}</span></div>`).join("")}`;
}

function renderPostures(evaluated) {
  elements.postureCards.innerHTML = evaluated.map((evaluation) => {
    const active = evaluation.plan.posture === state.selectedPosture ? "active" : "";
    return `<button class="posture-card ${active}" type="button" data-posture="${evaluation.plan.posture}"><h3>${evaluation.plan.posture}</h3><p>${evaluation.plan.rationale}</p><strong>Score ${evaluation.score.toFixed(1)} | Flex ${evaluation.futureFlexibilityPreserved.toFixed(1)}%</strong></button>`;
  }).join("");
  elements.postureCards.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
    const posture = postures.find((candidate) => candidate.posture === button.dataset.posture);
    state.selectedPosture = button.dataset.posture;
    state.manualUse = { ...posture.use };
    setDecision("Pending");
    render();
    drawFrame();
  }));
}

function renderResourceControls(selectedBase) {
  elements.resourceControls.innerHTML = resources.map((resource) => {
    const value = state.manualUse[resource.id] || 0;
    const optionLabel = resource.optionValue > 65 ? "High option value" : resource.optionValue > 35 ? "Medium option value" : "Low option value";
    return `<div class="resource-card"><div class="resource-top"><div><h3>${resource.name}</h3><span>${optionLabel}</span></div><strong>${value}/${resource.count}</strong></div><input type="range" min="0" max="${resource.count}" step="1" value="${value}" data-resource="${resource.id}" aria-label="${resource.name}"></div>`;
  }).join("");
  elements.resourceControls.querySelectorAll("input").forEach((input) => input.addEventListener("input", () => {
    state.manualUse[input.dataset.resource] = Number(input.value);
    setDecision("Pending");
    render();
    drawFrame();
  }));
  document.querySelector("#applyRecommended").onclick = () => {
    const recommended = bestEvaluations()[0].plan;
    state.selectedPosture = recommended.posture;
    state.manualUse = { ...recommended.use };
    setDecision("Pending");
    render();
    drawFrame();
  };
}

function renderDecision(evaluation, recommended, wave) {
  elements.metricReduction.textContent = percent(evaluation.immediateThreatReduction);
  elements.metricFlexibility.textContent = `${evaluation.futureFlexibilityPreserved.toFixed(1)}%`;
  elements.metricRegret.textContent = evaluation.futureRegretRisk.toFixed(1);
  elements.metricOvercommitment.textContent = evaluation.overcommitmentRisk.toFixed(1);
  const target = assetById(wave.targetId);
  elements.recommendationCopy.innerHTML = `<strong>Advisory recommendation:</strong> ${recommended.plan.posture}.<br><strong>Selected posture:</strong> ${state.selectedPosture}.<br><strong>Use now:</strong> ${describeUse(state.manualUse)}.<br><strong>Human decision required:</strong> approve, adjust, or reject before action is taken.<br><strong>Live pressure:</strong> ${wave.count} ${wave.kind}s, ${wave.sector} sector, target ${target.name}.`;
}

function renderTimeline() {
  elements.simulationTimeline.innerHTML = state.timeline.length ? state.timeline.slice(-6).reverse().map((entry) => `<div><strong>T+${entry.time.toFixed(1)}s</strong> ${entry.title}: ${entry.text}</div>`).join("") : "Simulation idle. Start or step to reveal how recommendations change.";
}

function regretMap(belief) {
  return [
    ["Decoy drone wave", belief["decoy-first"], "Conserve scarce resources", regretBand(belief["high-value-strike"] + belief.saturation)],
    ["Saturation attack", belief.saturation, "Distribute defenses", regretBand(belief["decoy-first"] + belief["sector-shift"])],
    ["High-value strike follows", belief["high-value-strike"], "Reserve premium resources", "High"],
    ["Sector shift", belief["sector-shift"], "Reposition mobile assets", regretBand(belief["random-harassment"])],
  ];
}

function addTimeline(title, text) {
  state.timeline.push({ time: state.simTime, title, text });
}

function setDecision(decision) {
  state.decision = decision;
  elements.decisionState.textContent = decision;
  elements.decisionState.className = `decision-state ${decision.toLowerCase()}`;
}

function recordDecision(decision) {
  const wave = liveScenario();
  const note = elements.commanderNote.value.trim() || "No note recorded.";
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  setDecision(decision);
  elements.decisionLog.innerHTML = `<strong>${time} - ${decision}</strong><br>Posture: ${state.selectedPosture}<br>Threat: ${wave.count} ${wave.kind}s toward ${assetById(wave.targetId).name}<br>Note: ${escapeHtml(note)}`;
}

function selectedBasePosture() { return postures.find((posture) => posture.posture === state.selectedPosture) || postures[1]; }
function buildManualPlan(basePosture) { return { ...basePosture, posture: `${basePosture.posture} - commander adjusted`, use: { ...state.manualUse } }; }
function currentPrimaryAsset() { return assetById(liveScenario().targetId); }
function assetById(id) { return state.features.find((asset) => asset.id === id) || state.northAssets[0] || { x: 500, y: 120, name: "Unknown", criticality: 70, sector: "north" }; }
function nearestAsset(origin, candidates) { return [...candidates].sort((a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y))[0] || origin; }
function speedFor(kind, sophistication) { return ({ drone: 0.018, jammer: 0.014, "cruise-missile": 0.028, "ballistic-missile": 0.04 }[kind] || 0.02) * (0.75 + sophistication * 0.55); }
function threatPressure(threat) { return threat.count * ({ drone: 0.75, jammer: 0.9, "cruise-missile": 1.28, "ballistic-missile": 1.65 }[threat.kind] || 1) * (1 + threat.progress * 1.35) * (assetById(threat.targetId).criticality / 100); }
function criticalityFor(subtype) { return subtype === "capital" ? 96 : subtype === "air_base" ? 88 : 72; }
function sectorFromPoint(point) { if (point.y < 300) return "north"; if (point.y > 515) return "south"; if (point.x > 650) return "east"; if (point.x < 350) return "west"; return "central"; }
function sumResources(plan, key) { return resources.reduce((sum, resource) => sum + (plan.use[resource.id] || 0) * resource[key], 0); }
function futureFlexibility(plan) { const baseline = resources.reduce((sum, resource) => sum + resource.count * resource.optionValue, 0); const preserved = resources.reduce((sum, resource) => sum + Math.max(0, resource.count - (plan.use[resource.id] || 0)) * resource.optionValue * (plan.reserve.includes(resource.id) ? 1.12 : 1), 0); return (preserved / baseline) * 100; }
function overcommitment(plan) { return resources.reduce((sum, resource) => sum + ((plan.use[resource.id] || 0) / resource.count) * 100 * (resource.optionValue > 65 ? 1.7 : 1), 0); }
function regretBand(value) { if (value >= 0.42) return "High"; if (value >= 0.20) return "Medium"; return "Low"; }
function threatColor(kind) { return { drone: "#e05d5d", jammer: "#d6ad4f", "cruise-missile": "#ff8a5c", "ballistic-missile": "#ff3f3f" }[kind] || "#e05d5d"; }
function describeUse(use) { const entries = resources.filter((resource) => (use[resource.id] || 0) > 0).map((resource) => `${use[resource.id]}x ${resource.name}`); return entries.length ? entries.join(", ") : "hold all resources"; }
function percent(value) { return `${Math.round(value * 100)}%`; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function escapeHtml(value) { return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }

["change", "input"].forEach((eventName) => {
  [elements.threatKind, elements.targetId, elements.sector, elements.count, elements.sophistication].forEach((input) => input.addEventListener(eventName, () => {
    if (!state.running) resetSimulationState(false);
    setDecision("Pending");
    render();
    drawFrame();
  }));
});

document.querySelector("#resetScenario").addEventListener("click", () => { setInitialControls(); state.selectedPosture = "Flexible Hold"; state.manualUse = {}; elements.commanderNote.value = ""; elements.decisionLog.textContent = ""; resetSimulationState(false); render(); drawFrame(); });
document.querySelector("#startSimulation").addEventListener("click", startSimulation);
document.querySelector("#stepSimulation").addEventListener("click", () => { pauseSimulation(); stepSimulation(); });
document.querySelector("#pauseSimulation").addEventListener("click", pauseSimulation);
document.querySelector("#resetSimulation").addEventListener("click", () => { resetSimulationState(true); render(); drawFrame(); });
document.querySelector("#approveDecision").addEventListener("click", () => recordDecision("Approved"));
document.querySelector("#rejectDecision").addEventListener("click", () => recordDecision("Rejected"));

setDecision("Pending");
loadEnvironment().then(() => startSimulation()).catch((error) => {
  console.error(error);
  elements.simulationTimeline.textContent = "Could not load Boreal Passage environment assets.";
});

/* Enhanced engagement layer: icons, approval-gated countermeasures, richer waves. */
buildAttackPlan = function() {
  const base = baseScenario();
  const primary = assetById(base.targetId);
  const second = nearestAsset(primary, state.northAssets.filter((asset) => asset.id !== primary.id));
  const coastal = state.northAssets.find((asset) => asset.name.includes("Nordvik")) || second;
  return [
    { t: 0, label: "Probe drone screen", kind: base.kind, count: base.count, from: southernLaunch("west"), targetId: primary.id, sophistication: base.sophistication, grammar: "decoy-first" },
    { t: 3.2, label: "Loitering decoys", kind: "drone", count: 12, from: southernLaunch("far-west"), targetId: coastal.id, sophistication: 0.61, grammar: "decoy-first" },
    { t: 6.0, label: "Jammer escort", kind: "jammer", count: 4, from: southernLaunch("central"), targetId: primary.id, sophistication: 0.80, grammar: "high-value-strike" },
    { t: 9.0, label: "Sea-skimming cruise track", kind: "cruise-missile", count: 7, from: southernLaunch("east"), targetId: primary.id, sophistication: 0.84, grammar: "high-value-strike" },
    { t: 12.2, label: "Fast attack aircraft", kind: "aircraft", count: 5, from: southernLaunch("far-east"), targetId: second.id, sophistication: 0.82, grammar: "sector-shift" },
    { t: 15.0, label: "Sector-shift swarm", kind: "drone", count: 18, from: southernLaunch("far-east"), targetId: second.id, sophistication: 0.73, grammar: "sector-shift" },
    { t: 19.0, label: "Saturation split", kind: "drone", count: 30, from: southernLaunch("west"), targetId: coastal.id, sophistication: 0.69, grammar: "saturation" },
    { t: 22.0, label: "Cruise missile crossfire", kind: "cruise-missile", count: 10, from: southernLaunch("far-west"), targetId: second.id, sophistication: 0.86, grammar: "saturation" },
    { t: 25.5, label: "Precision ballistic follow-up", kind: "ballistic-missile", count: 4, from: southernLaunch("central"), targetId: primary.id, sophistication: 0.91, grammar: "high-value-strike" },
    { t: 31.0, label: "Late adaptive drone push", kind: "drone", count: 20, from: southernLaunch("east"), targetId: primary.id, sophistication: 0.77, grammar: "saturation" },
  ];
};

resetSimulationState = function(seed) {
  pauseSimulation();
  state.simTime = 0;
  state.lastFrame = 0;
  state.activeThreats = [];
  state.intercepts = [];
  state.countermeasureEffects = [];
  state.timeline = [];
  state.nextThreatId = 1;
  state.firedEvents = new Set();
  state.approvedPlan = null;
  state.approvedPosture = null;
  state.approvedAt = null;
  state.attackPlan = buildAttackPlan();
  if (seed) fireEvent(state.attackPlan[0]);
  setDecision("Pending");
};

liveBelief = function(wave) {
  const activeGrammars = state.activeThreats.reduce((acc, threat) => ({ ...acc, [threat.grammar]: (acc[threat.grammar] || 0) + threatPressure(threat) }), {});
  const totalPressure = Object.values(activeGrammars).reduce((sum, value) => sum + value, 0);
  const weighted = grammars.map((grammar) => {
    const signalFit = grammar.signals[wave.kind] || (wave.kind === "aircraft" ? 0.24 : 0.12);
    const sophisticationFit = 0.6 + wave.sophistication * grammar.followUpPressure * 0.6;
    const swarmFit = wave.kind === "drone" && wave.count >= 15 ? 1.25 : 1;
    const aircraftFit = wave.kind === "aircraft" && grammar.intent === "sector-shift" ? 1.35 : 1;
    const observedGrammar = totalPressure ? 1 + ((activeGrammars[grammar.intent] || 0) / totalPressure) * 1.35 : 1;
    const shiftFit = state.activeThreats.some((threat) => threat.targetId !== elements.targetId.value) && grammar.intent === "sector-shift" ? 1.45 : 1;
    return { intent: grammar.intent, likelihood: signalFit * sophisticationFit * swarmFit * aircraftFit * observedGrammar * shiftFit };
  });
  const total = weighted.reduce((sum, entry) => sum + entry.likelihood, 0);
  return Object.fromEntries(weighted.map((entry) => [entry.intent, entry.likelihood / total]));
};

currentReduction = function(plan, wave) {
  const interceptMass = resources.reduce((sum, resource) => sum + (plan.use[resource.id] || 0) * effectivenessFor(resource, wave.kind), 0);
  const activeUrgency = state.activeThreats.reduce((max, threat) => Math.max(max, threat.progress), 0);
  const requiredMass = Math.max(1, wave.count * (0.48 + wave.sophistication * 0.18 + activeUrgency * 0.15));
  return clamp(interceptMass / requiredMass, 0, 0.96);
};

applyDefense = function(delta) {
  if (!state.approvedPlan) return;
  const defendedAssets = defendedPositions(state.approvedPlan);
  state.activeThreats.forEach((threat) => {
    const coverage = defendedAssets.reduce((best, defense) => {
      const distance = Math.hypot(threat.x - defense.x, threat.y - defense.y);
      if (distance > defense.range) return best;
      return Math.max(best, (1 - distance / defense.range) * effectivenessFor(defense, threat.kind) * defense.assigned);
    }, 0);
    if (coverage <= 0) return;
    const attrition = coverage * delta * threatAttritionRate(threat.kind);
    const removed = Math.min(threat.count, attrition);
    threat.count -= removed;
    if (removed > 0.05 && Math.random() < 0.56) {
      const source = nearestDefense(defendedAssets, threat);
      state.intercepts.push({ x: threat.x, y: threat.y, time: state.simTime, size: 8 + removed * 1.8 });
      if (source) state.countermeasureEffects.push({ fromX: source.x, fromY: source.y, toX: threat.x, toY: threat.y, time: state.simTime });
    }
  });
  state.activeThreats = state.activeThreats.filter((threat) => threat.count > 0.6 && threat.progress < 1);
};

advanceSimulation = function(delta) {
  state.simTime += delta;
  fireScheduledEvents();
  applyDefense(delta);
  moveThreats(delta);
  state.intercepts = state.intercepts.filter((effect) => state.simTime - effect.time < 0.9);
  state.countermeasureEffects = (state.countermeasureEffects || []).filter((effect) => state.simTime - effect.time < 1.4);
  if (state.simTime - state.lastUiRender > 0.22) {
    state.lastUiRender = state.simTime;
    render(false);
  }
};

drawFrame = function() {
  ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  if (mapImage.complete && mapImage.naturalWidth > 0) ctx.drawImage(mapImage, 0, 0, MAP_WIDTH, MAP_HEIGHT);
  else drawFallbackMap();
  const visiblePlan = state.approvedPlan || buildManualPlan(selectedBasePosture());
  drawDefenseCoverage(visiblePlan);
  drawCountermeasureIcons(visiblePlan);
  drawThreatRoutes();
  drawCountermeasureEffects();
  drawThreats();
  drawIntercepts();
  drawTrackedAssets();
};

drawDefenseCoverage = function(plan) {
  const active = Boolean(state.approvedPlan);
  defendedPositions(plan).forEach((defense) => {
    ctx.beginPath();
    ctx.arc(defense.x, defense.y, defense.range, 0, Math.PI * 2);
    ctx.fillStyle = active ? "rgba(63, 182, 168, 0.08)" : "rgba(214, 173, 79, 0.05)";
    ctx.fill();
    ctx.strokeStyle = active ? "rgba(63, 182, 168, 0.46)" : "rgba(214, 173, 79, 0.26)";
    ctx.lineWidth = active ? 2 : 1.2;
    ctx.stroke();
  });
};

function drawCountermeasureIcons(plan) {
  const active = Boolean(state.approvedPlan);
  defendedPositions(plan).forEach((defense) => {
    ctx.save();
    ctx.translate(defense.x, defense.y);
    ctx.globalAlpha = active ? 1 : 0.5;
    drawCountermeasureSymbol(defense.resourceId, 18, active ? "#9ff3df" : "#d6ad4f");
    ctx.fillStyle = active ? "#e9eef5" : "#aeb8c4";
    ctx.font = "700 10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(defense.resourceId.split("-")[0].toUpperCase(), 0, 31);
    ctx.restore();
  });
}

function drawCountermeasureEffects() {
  (state.countermeasureEffects || []).forEach((effect) => {
    const age = state.simTime - effect.time;
    const alpha = Math.max(0, 0.85 - age * 0.58);
    ctx.strokeStyle = `rgba(159,243,223,${alpha})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 7]);
    ctx.beginPath();
    ctx.moveTo(effect.fromX, effect.fromY);
    ctx.lineTo(effect.toX, effect.toY);
    ctx.stroke();
    ctx.setLineDash([]);
  });
}

drawThreats = function() {
  state.activeThreats.forEach((threat) => {
    const size = clamp(13 + Math.sqrt(threat.count) * 2.3, 16, 32);
    const angle = Math.atan2(threat.targetY - threat.y, threat.targetX - threat.x);
    ctx.save();
    ctx.translate(threat.x, threat.y);
    ctx.rotate(angle);
    if (threat.kind === "drone") drawDroneIcon(size, threatColor(threat.kind));
    else if (threat.kind === "jammer" || threat.kind === "aircraft") drawAircraftIcon(size, threatColor(threat.kind));
    else drawMissileIcon(size, threatColor(threat.kind));
    ctx.restore();
    ctx.fillStyle = "#f7f9fc";
    ctx.font = "700 12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(Math.ceil(threat.count)), threat.x, threat.y - size * 0.72);
    ctx.textAlign = "left";
  });
};

recordDecision = function(decision) {
  const wave = liveScenario();
  const note = elements.commanderNote.value.trim() || "No note recorded.";
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  setDecision(decision);
  if (decision === "Approved") activateCountermeasures();
  else {
    state.approvedPlan = null;
    state.approvedPosture = null;
    state.approvedAt = null;
    addTimeline("Posture rejected", `${state.selectedPosture} held for reassessment`);
  }
  elements.decisionLog.innerHTML = `<strong>${time} - ${decision}</strong><br>Posture: ${state.selectedPosture}<br>Threat: ${wave.count} ${wave.kind}s toward ${assetById(wave.targetId).name}<br>Note: ${escapeHtml(note)}`;
  render();
  drawFrame();
};

renderDecision = function(evaluation, recommended, wave) {
  elements.metricReduction.textContent = percent(evaluation.immediateThreatReduction);
  elements.metricFlexibility.textContent = `${evaluation.futureFlexibilityPreserved.toFixed(1)}%`;
  elements.metricRegret.textContent = evaluation.futureRegretRisk.toFixed(1);
  elements.metricOvercommitment.textContent = evaluation.overcommitmentRisk.toFixed(1);
  const target = assetById(wave.targetId);
  const approved = state.approvedPlan ? `<br><strong>Active countermeasures:</strong> ${describeUse(state.approvedPlan.use)}.` : "<br><strong>Active countermeasures:</strong> none until posture approval.";
  elements.recommendationCopy.innerHTML = `<strong>Advisory recommendation:</strong> ${recommended.plan.posture}.<br><strong>Selected posture:</strong> ${state.selectedPosture}.<br><strong>Use now:</strong> ${describeUse(state.manualUse)}.${approved}<br><strong>Human decision required:</strong> approve, adjust, or reject before action is taken.<br><strong>Live pressure:</strong> ${wave.count} ${wave.kind}s, ${wave.sector} sector, target ${target.name}.`;
};

function activateCountermeasures() {
  state.approvedPlan = buildManualPlan(selectedBasePosture());
  state.approvedPosture = state.selectedPosture;
  state.approvedAt = state.simTime;
  addTimeline("Countermeasures active", `${state.selectedPosture}: ${describeUse(state.approvedPlan.use)}`);
  const defenses = defendedPositions(state.approvedPlan);
  state.activeThreats.slice(0, 10).forEach((threat, index) => {
    const defense = defenses[index % Math.max(1, defenses.length)];
    if (!defense) return;
    state.countermeasureEffects.push({ fromX: defense.x, fromY: defense.y, toX: threat.x, toY: threat.y, time: state.simTime });
  });
}

defendedPositions = function(plan) {
  const primary = currentPrimaryAsset();
  const alternate = nearestAsset(primary, state.northAssets.filter((asset) => asset.id !== primary.id));
  return resources.flatMap((resource, index) => {
    const assigned = plan.use[resource.id] || 0;
    if (!assigned) return [];
    const anchor = resource.id === "mob-04" && plan.move.length ? alternate : primary;
    const spread = (index - 1.5) * 18;
    return [{ x: anchor.x + spread, y: anchor.y + spread * 0.3, range: resource.range, effectiveness: resource.effectiveness, resourceId: resource.id, assigned: assigned / resource.count }];
  });
};

function effectivenessFor(resourceLike, kind) {
  if (resourceLike.effectiveness[kind] !== undefined) return resourceLike.effectiveness[kind];
  if (kind === "aircraft") return resourceLike.effectiveness["cruise-missile"] || 0.35;
  return 0;
}

function nearestDefense(defenses, threat) {
  return [...defenses].sort((a, b) => Math.hypot(a.x - threat.x, a.y - threat.y) - Math.hypot(b.x - threat.x, b.y - threat.y))[0];
}

function threatAttritionRate(kind) {
  return { drone: 2.55, jammer: 1.15, aircraft: 1.45, "cruise-missile": 1.35, "ballistic-missile": 0.95 }[kind] || 1.2;
}

function drawDroneIcon(size, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  [[-0.45, -0.34], [0.45, -0.34], [-0.45, 0.34], [0.45, 0.34]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x * size, y * size, size * 0.18, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(-size * 0.45, -size * 0.34);
  ctx.lineTo(0, 0);
  ctx.lineTo(size * 0.45, -size * 0.34);
  ctx.moveTo(-size * 0.45, size * 0.34);
  ctx.lineTo(0, 0);
  ctx.lineTo(size * 0.45, size * 0.34);
  ctx.stroke();
  roundedRect(-size * 0.19, -size * 0.13, size * 0.38, size * 0.26, 3);
  ctx.fill();
}

function drawAircraftIcon(size, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(size * 0.62, 0);
  ctx.lineTo(-size * 0.38, -size * 0.18);
  ctx.lineTo(-size * 0.62, -size * 0.48);
  ctx.lineTo(-size * 0.18, -size * 0.1);
  ctx.lineTo(-size * 0.18, size * 0.1);
  ctx.lineTo(-size * 0.62, size * 0.48);
  ctx.lineTo(-size * 0.38, size * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawMissileIcon(size, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(size * 0.62, 0);
  ctx.quadraticCurveTo(size * 0.22, -size * 0.26, -size * 0.42, -size * 0.14);
  ctx.lineTo(-size * 0.62, -size * 0.34);
  ctx.lineTo(-size * 0.48, 0);
  ctx.lineTo(-size * 0.62, size * 0.34);
  ctx.lineTo(-size * 0.42, size * 0.14);
  ctx.quadraticCurveTo(size * 0.22, size * 0.26, size * 0.62, 0);
  ctx.fill();
  ctx.stroke();
}

function drawCountermeasureSymbol(resourceId, size, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  if (resourceId === "cd-03") {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.14, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (resourceId === "mob-04") {
    ctx.strokeRect(-size * 0.45, -size * 0.25, size * 0.9, size * 0.5);
    ctx.beginPath();
    ctx.moveTo(-size * 0.1, -size * 0.25);
    ctx.lineTo(size * 0.44, -size * 0.56);
    ctx.stroke();
    return;
  }
  if (resourceId === "sr-02") {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.52);
    ctx.lineTo(size * 0.45, size * 0.3);
    ctx.lineTo(-size * 0.45, size * 0.3);
    ctx.closePath();
    ctx.stroke();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.58);
  ctx.lineTo(size * 0.16, -size * 0.12);
  ctx.lineTo(size * 0.46, 0);
  ctx.lineTo(size * 0.16, size * 0.12);
  ctx.lineTo(0, size * 0.58);
  ctx.lineTo(-size * 0.16, size * 0.12);
  ctx.lineTo(-size * 0.46, 0);
  ctx.lineTo(-size * 0.16, -size * 0.12);
  ctx.closePath();
  ctx.stroke();
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

speedFor = function(kind, sophistication) {
  return ({ drone: 0.018, jammer: 0.014, aircraft: 0.024, "cruise-missile": 0.028, "ballistic-missile": 0.04 }[kind] || 0.02) * (0.75 + sophistication * 0.55);
};

threatPressure = function(threat) {
  return threat.count * ({ drone: 0.75, jammer: 0.9, aircraft: 1.12, "cruise-missile": 1.28, "ballistic-missile": 1.65 }[threat.kind] || 1) * (1 + threat.progress * 1.35) * (assetById(threat.targetId).criticality / 100);
};

threatColor = function(kind) {
  return { drone: "#e05d5d", jammer: "#d6ad4f", aircraft: "#b483ff", "cruise-missile": "#ff8a5c", "ballistic-missile": "#ff3f3f" }[kind] || "#e05d5d";
};

const countermeasureStatusElement = document.querySelector("#countermeasureStatus");
const previousRenderResourceControls = renderResourceControls;
renderResourceControls = function(selectedBase) {
  previousRenderResourceControls(selectedBase);
  if (!countermeasureStatusElement) return;
  if (!state.approvedPlan) {
    countermeasureStatusElement.className = "countermeasure-status";
    countermeasureStatusElement.innerHTML = "No active countermeasures. Approve a posture to activate the selected resource mix.";
    return;
  }
  countermeasureStatusElement.className = "countermeasure-status active";
  countermeasureStatusElement.innerHTML = `<strong>${state.approvedPosture}</strong><br>${describeUse(state.approvedPlan.use)}`;
};

/* Approval-launched interceptor projectiles. */
if (!Array.isArray(state.countermeasureProjectiles)) state.countermeasureProjectiles = [];

const previousResetSimulationStateForProjectiles = resetSimulationState;
resetSimulationState = function(seed) {
  previousResetSimulationStateForProjectiles(seed);
  state.countermeasureProjectiles = [];
};

const previousActivateCountermeasuresForProjectiles = activateCountermeasures;
activateCountermeasures = function() {
  previousActivateCountermeasuresForProjectiles();
  launchApprovedInterceptors();
};

const previousAdvanceSimulationForProjectiles = advanceSimulation;
advanceSimulation = function(delta) {
  previousAdvanceSimulationForProjectiles(delta);
  updateCountermeasureProjectiles(delta);
};

const previousDrawFrameForProjectiles = drawFrame;
drawFrame = function() {
  previousDrawFrameForProjectiles();
  drawCountermeasureProjectiles();
};

function launchApprovedInterceptors() {
  if (!state.approvedPlan) return;
  const defenses = defendedPositions(state.approvedPlan);
  const targets = [...state.activeThreats]
    .sort((left, right) => threatPressure(right) - threatPressure(left))
    .slice(0, 14);
  targets.forEach((threat, index) => {
    const defense = bestDefenseForThreat(defenses, threat) || defenses[index % Math.max(1, defenses.length)];
    if (!defense) return;
    const salvoSize = defense.resourceId === "cd-03" ? 2 : 1;
    for (let salvo = 0; salvo < salvoSize; salvo += 1) {
      state.countermeasureProjectiles.push({
        id: `${state.simTime}-${threat.id}-${index}-${salvo}`,
        resourceId: defense.resourceId,
        threatId: threat.id,
        fromX: defense.x,
        fromY: defense.y,
        x: defense.x,
        y: defense.y,
        targetX: threat.x,
        targetY: threat.y,
        launchedAt: state.simTime + salvo * 0.08,
        progress: 0,
        speed: projectileSpeed(defense.resourceId),
        effect: projectileEffect(defense.resourceId, threat.kind) / salvoSize,
        completed: false,
      });
    }
  });
  addTimeline("Interceptor launch", `${targets.length} tracks engaged from approved posture`);
}

function updateCountermeasureProjectiles(delta) {
  if (!state.countermeasureProjectiles) state.countermeasureProjectiles = [];
  state.countermeasureProjectiles.forEach((projectile) => {
    if (state.simTime < projectile.launchedAt || projectile.completed) return;
    const threat = state.activeThreats.find((candidate) => candidate.id === projectile.threatId);
    if (threat) {
      projectile.targetX = threat.x;
      projectile.targetY = threat.y;
    }
    projectile.progress = clamp(projectile.progress + delta * projectile.speed, 0, 1);
    const eased = 1 - Math.pow(1 - projectile.progress, 2.2);
    const arc = Math.sin(projectile.progress * Math.PI) * 34;
    projectile.x = projectile.fromX + (projectile.targetX - projectile.fromX) * eased;
    projectile.y = projectile.fromY + (projectile.targetY - projectile.fromY) * eased - arc;
    if (projectile.progress >= 1) completeProjectile(projectile, threat);
  });
  state.countermeasureProjectiles = state.countermeasureProjectiles.filter((projectile) => !projectile.completed);
}

function completeProjectile(projectile, threat) {
  projectile.completed = true;
  const x = projectile.targetX;
  const y = projectile.targetY;
  state.intercepts.push({ x, y, time: state.simTime, size: 18 });
  state.countermeasureEffects.push({ fromX: projectile.fromX, fromY: projectile.fromY, toX: x, toY: y, time: state.simTime });
  if (threat) {
    threat.count = Math.max(0, threat.count - projectile.effect);
    addTimeline("Intercept", `${projectileLabel(projectile.resourceId)} engaged ${threat.kind} track near ${assetById(threat.targetId).name}`);
  }
}

function drawCountermeasureProjectiles() {
  (state.countermeasureProjectiles || []).forEach((projectile) => {
    if (state.simTime < projectile.launchedAt) return;
    const angle = Math.atan2(projectile.targetY - projectile.y, projectile.targetX - projectile.x);
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(angle);
    ctx.fillStyle = projectileColor(projectile.resourceId);
    ctx.strokeStyle = "rgba(255,255,255,0.82)";
    ctx.lineWidth = 1.2;
    if (projectile.resourceId === "cd-03") {
      ctx.beginPath();
      ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-7, -4);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-7, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(159,243,223,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(projectile.fromX, projectile.fromY);
    ctx.lineTo(projectile.x, projectile.y);
    ctx.stroke();
  });
}

function bestDefenseForThreat(defenses, threat) {
  return [...defenses]
    .filter((defense) => effectivenessFor(defense, threat.kind) > 0)
    .sort((left, right) => {
      const leftScore = effectivenessFor(left, threat.kind) - Math.hypot(left.x - threat.x, left.y - threat.y) / Math.max(1, left.range);
      const rightScore = effectivenessFor(right, threat.kind) - Math.hypot(right.x - threat.x, right.y - threat.y) / Math.max(1, right.range);
      return rightScore - leftScore;
    })[0];
}

function projectileSpeed(resourceId) {
  return { "lr-01": 1.45, "sr-02": 1.85, "cd-03": 2.6, "mob-04": 1.65 }[resourceId] || 1.6;
}

function projectileEffect(resourceId, threatKind) {
  const base = { "lr-01": 3.1, "sr-02": 2.0, "cd-03": 1.1, "mob-04": 2.35 }[resourceId] || 1.4;
  const modifier = { drone: 1.25, jammer: 0.85, aircraft: 1.0, "cruise-missile": 1.05, "ballistic-missile": 0.72 }[threatKind] || 1;
  return base * modifier;
}

function projectileColor(resourceId) {
  return { "lr-01": "#ffffff", "sr-02": "#9ff3df", "cd-03": "#74c476", "mob-04": "#d6ad4f" }[resourceId] || "#ffffff";
}

function projectileLabel(resourceId) {
  return resources.find((resource) => resource.id === resourceId)?.name || resourceId;
}
