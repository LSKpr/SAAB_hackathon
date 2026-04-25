type AttackIntent =
  | "decoy-first"
  | "saturation"
  | "high-value-strike"
  | "sector-shift"
  | "random-harassment";

type ThreatKind = "drone" | "cruise-missile" | "ballistic-missile" | "jammer";
type Sector = "north" | "east" | "south" | "west";
type PostureName = "Greedy Intercept" | "Flexible Hold" | "Distributed Defense" | "Mobile Reposition";

interface ThreatWave {
  readonly kind: ThreatKind;
  readonly count: number;
  readonly sector: Sector;
  readonly sophistication: number;
  readonly targetId: string;
}

interface Asset {
  readonly id: string;
  readonly name: string;
  readonly sector: Sector;
  readonly criticality: number;
}

interface Resource {
  readonly id: string;
  readonly name: string;
  readonly count: number;
  readonly cost: number;
  readonly reloadPenalty: number;
  readonly optionValue: number;
  readonly effectiveness: Readonly<Record<ThreatKind, number>>;
}

interface AttackGrammar {
  readonly intent: AttackIntent;
  readonly story: string;
  readonly signals: Readonly<Record<ThreatKind, number>>;
  readonly followUpPressure: number;
  readonly sectorShiftPressure: number;
  readonly premiumNeed: number;
}

interface ActionPlan {
  readonly posture: PostureName;
  readonly use: Readonly<Record<string, number>>;
  readonly reserve: readonly string[];
  readonly move: readonly string[];
  readonly rationale: string;
}

interface RegretRow {
  readonly scenario: string;
  readonly probability: number;
  readonly bestCurrentAction: string;
  readonly regretIfWrong: "Low" | "Medium" | "High";
}

interface ActionEvaluation {
  readonly plan: ActionPlan;
  readonly score: number;
  readonly immediateThreatReduction: number;
  readonly assetProtectionValue: number;
  readonly futureFlexibilityPreserved: number;
  readonly resourceCost: number;
  readonly reloadRepositionPenalty: number;
  readonly futureRegretRisk: number;
  readonly overcommitmentRisk: number;
}

interface SimulationResult {
  readonly belief: Readonly<Record<AttackIntent, number>>;
  readonly regretMap: readonly RegretRow[];
  readonly recommendation: ActionEvaluation;
  readonly alternatives: readonly ActionEvaluation[];
  readonly greedyOutcome: string;
  readonly regretAwareOutcome: string;
}

const resources: readonly Resource[] = [
  {
    id: "lr-01",
    name: "Long-range interceptor",
    count: 6,
    cost: 92,
    reloadPenalty: 88,
    optionValue: 96,
    effectiveness: {
      "ballistic-missile": 0.82,
      "cruise-missile": 0.74,
      drone: 0.70,
      jammer: 0.18,
    },
  },
  {
    id: "sr-02",
    name: "Short-range battery",
    count: 12,
    cost: 35,
    reloadPenalty: 42,
    optionValue: 47,
    effectiveness: {
      "ballistic-missile": 0.22,
      "cruise-missile": 0.58,
      drone: 0.72,
      jammer: 0.24,
    },
  },
  {
    id: "cd-03",
    name: "Counter-drone system",
    count: 18,
    cost: 14,
    reloadPenalty: 18,
    optionValue: 21,
    effectiveness: {
      "ballistic-missile": 0.04,
      "cruise-missile": 0.16,
      drone: 0.86,
      jammer: 0.34,
    },
  },
  {
    id: "mob-04",
    name: "Mobile air-defense unit",
    count: 4,
    cost: 56,
    reloadPenalty: 64,
    optionValue: 69,
    effectiveness: {
      "ballistic-missile": 0.38,
      "cruise-missile": 0.67,
      drone: 0.55,
      jammer: 0.42,
    },
  },
];

const assets: readonly Asset[] = [
  { id: "asset-a", name: "Command node Alpha", sector: "north", criticality: 94 },
  { id: "asset-b", name: "Power grid cluster Bravo", sector: "east", criticality: 87 },
  { id: "asset-c", name: "Logistics hub Charlie", sector: "south", criticality: 71 },
];

const grammars: readonly AttackGrammar[] = [
  {
    intent: "decoy-first",
    story: "Probe -> Decoy -> Resource drain -> Precision strike",
    signals: { "ballistic-missile": 0.08, "cruise-missile": 0.22, drone: 0.62, jammer: 0.08 },
    followUpPressure: 0.76,
    sectorShiftPressure: 0.24,
    premiumNeed: 0.82,
  },
  {
    intent: "saturation",
    story: "Single-axis drone wave -> Pause -> Multi-axis missile/drone mix",
    signals: { "ballistic-missile": 0.18, "cruise-missile": 0.34, drone: 0.38, jammer: 0.10 },
    followUpPressure: 0.83,
    sectorShiftPressure: 0.44,
    premiumNeed: 0.62,
  },
  {
    intent: "high-value-strike",
    story: "Low-value swarm -> Radar stress -> High-value follow-up",
    signals: { "ballistic-missile": 0.31, "cruise-missile": 0.38, drone: 0.22, jammer: 0.09 },
    followUpPressure: 0.91,
    sectorShiftPressure: 0.31,
    premiumNeed: 0.94,
  },
  {
    intent: "sector-shift",
    story: "Visible pressure on one axis -> Mobile defense displacement -> Strike elsewhere",
    signals: { "ballistic-missile": 0.13, "cruise-missile": 0.32, drone: 0.42, jammer: 0.13 },
    followUpPressure: 0.67,
    sectorShiftPressure: 0.86,
    premiumNeed: 0.58,
  },
  {
    intent: "random-harassment",
    story: "Uncoordinated harassment waves with low follow-up coherence",
    signals: { "ballistic-missile": 0.12, "cruise-missile": 0.18, drone: 0.55, jammer: 0.15 },
    followUpPressure: 0.29,
    sectorShiftPressure: 0.19,
    premiumNeed: 0.27,
  },
];

const observedWave: ThreatWave = {
  kind: "drone",
  count: 20,
  sector: "north",
  sophistication: 0.68,
  targetId: "asset-a",
};

export function runAresNextDemo(): SimulationResult {
  const belief = inferAttackGrammar(observedWave, grammars);
  const alternatives = buildCandidateActions()
    .map((plan) => evaluateAction(plan, observedWave, belief))
    .sort((left, right) => right.score - left.score);
  const recommendation = alternatives[0];

  return {
    belief,
    regretMap: buildRegretMap(belief),
    recommendation,
    alternatives,
    greedyOutcome: simulateOutcome("Greedy Intercept", observedWave, belief),
    regretAwareOutcome: simulateOutcome(recommendation.plan.posture, observedWave, belief),
  };
}

function inferAttackGrammar(
  wave: ThreatWave,
  attackGrammars: readonly AttackGrammar[],
): Readonly<Record<AttackIntent, number>> {
  const weighted = attackGrammars.map((grammar) => {
    const signalFit = grammar.signals[wave.kind];
    const sophisticationFit = 0.6 + wave.sophistication * grammar.followUpPressure * 0.6;
    const swarmFit = wave.kind === "drone" && wave.count >= 15 ? 1.25 : 1;
    const likelihood = signalFit * sophisticationFit * swarmFit;
    return { intent: grammar.intent, likelihood };
  });
  const total = weighted.reduce((sum, entry) => sum + entry.likelihood, 0);

  return Object.fromEntries(
    weighted.map((entry) => [entry.intent, entry.likelihood / total]),
  ) as Readonly<Record<AttackIntent, number>>;
}

function buildCandidateActions(): readonly ActionPlan[] {
  return [
    {
      posture: "Greedy Intercept",
      use: { "lr-01": 4, "sr-02": 4, "cd-03": 4, "mob-04": 1 },
      reserve: [],
      move: [],
      rationale: "Maximize current-wave intercept probability with the most effective available mix.",
    },
    {
      posture: "Flexible Hold",
      use: { "sr-02": 3, "cd-03": 8 },
      reserve: ["lr-01", "mob-04"],
      move: ["mob-04 -> asset-b"],
      rationale: "Reduce current drone risk while preserving premium capacity for a likely follow-up wave.",
    },
    {
      posture: "Distributed Defense",
      use: { "sr-02": 4, "cd-03": 6, "mob-04": 1 },
      reserve: ["lr-01"],
      move: ["mob-04 -> east corridor"],
      rationale: "Balance current coverage against possible multi-axis pressure.",
    },
    {
      posture: "Mobile Reposition",
      use: { "cd-03": 6, "mob-04": 1 },
      reserve: ["lr-01", "sr-02"],
      move: ["mob-04 -> asset-b", "cd-03 -> south approach"],
      rationale: "Treat the current wave as a displacement attempt and protect future geometry.",
    },
  ];
}

function evaluateAction(
  plan: ActionPlan,
  wave: ThreatWave,
  belief: Readonly<Record<AttackIntent, number>>,
): ActionEvaluation {
  const target = assets.find((asset) => asset.id === wave.targetId);
  const targetCriticality = target === undefined ? 50 : target.criticality;
  const immediateThreatReduction = calculateCurrentReduction(plan, wave);
  const assetProtectionValue = immediateThreatReduction * targetCriticality;
  const resourceCost = calculateResourceCost(plan);
  const reloadRepositionPenalty = calculateReloadAndMovementPenalty(plan);
  const futureFlexibilityPreserved = calculateFutureFlexibility(plan);
  const futureRegretRisk = calculateFutureRegret(plan, belief);
  const overcommitmentRisk = calculateOvercommitment(plan);
  const score =
    immediateThreatReduction * 170 +
    assetProtectionValue * 0.42 +
    futureFlexibilityPreserved * 1.15 -
    resourceCost * 0.34 -
    reloadRepositionPenalty * 0.28 -
    futureRegretRisk * 1.05 -
    overcommitmentRisk * 0.82;

  return {
    plan,
    score,
    immediateThreatReduction,
    assetProtectionValue,
    futureFlexibilityPreserved,
    resourceCost,
    reloadRepositionPenalty,
    futureRegretRisk,
    overcommitmentRisk,
  };
}

function calculateCurrentReduction(plan: ActionPlan, wave: ThreatWave): number {
  const interceptMass = resources.reduce((sum, resource) => {
    const assigned = plan.use[resource.id] ?? 0;
    return sum + assigned * resource.effectiveness[wave.kind];
  }, 0);
  const requiredMass = Math.max(1, wave.count * (0.48 + wave.sophistication * 0.18));
  return clamp(interceptMass / requiredMass, 0, 0.96);
}

function calculateResourceCost(plan: ActionPlan): number {
  return resources.reduce((sum, resource) => {
    const assigned = plan.use[resource.id] ?? 0;
    return sum + assigned * resource.cost;
  }, 0);
}

function calculateReloadAndMovementPenalty(plan: ActionPlan): number {
  const reloadPenalty = resources.reduce((sum, resource) => {
    const assigned = plan.use[resource.id] ?? 0;
    return sum + assigned * resource.reloadPenalty;
  }, 0);
  return reloadPenalty + plan.move.length * 18;
}

function calculateFutureFlexibility(plan: ActionPlan): number {
  const baseline = resources.reduce((sum, resource) => sum + resource.count * resource.optionValue, 0);
  const preserved = resources.reduce((sum, resource) => {
    const assigned = plan.use[resource.id] ?? 0;
    const remaining = Math.max(0, resource.count - assigned);
    const reserveBonus = plan.reserve.includes(resource.id) ? 1.12 : 1;
    return sum + remaining * resource.optionValue * reserveBonus;
  }, 0);
  return (preserved / baseline) * 100;
}

function calculateFutureRegret(
  plan: ActionPlan,
  belief: Readonly<Record<AttackIntent, number>>,
): number {
  return grammars.reduce((sum, grammar) => {
    const probability = belief[grammar.intent];
    const spentPremium = (plan.use["lr-01"] ?? 0) / 6;
    const spentMobile = (plan.use["mob-04"] ?? 0) / 4;
    const repositioned = plan.move.length > 0 ? 0.72 : 1;
    const premiumRegret = spentPremium * grammar.premiumNeed * 100;
    const sectorRegret = spentMobile * grammar.sectorShiftPressure * 60 * repositioned;
    const followUpRegret = calculateOvercommitment(plan) * grammar.followUpPressure * 0.44;
    return sum + probability * (premiumRegret + sectorRegret + followUpRegret);
  }, 0);
}

function calculateOvercommitment(plan: ActionPlan): number {
  return resources.reduce((sum, resource) => {
    const assigned = plan.use[resource.id] ?? 0;
    const scarcityMultiplier = resource.optionValue > 65 ? 1.7 : 1;
    return sum + (assigned / resource.count) * 100 * scarcityMultiplier;
  }, 0);
}

function buildRegretMap(belief: Readonly<Record<AttackIntent, number>>): readonly RegretRow[] {
  return [
    {
      scenario: "Decoy drone wave",
      probability: belief["decoy-first"],
      bestCurrentAction: "Conserve scarce resources",
      regretIfWrong: regretBand(belief["high-value-strike"] + belief.saturation),
    },
    {
      scenario: "Saturation attack",
      probability: belief.saturation,
      bestCurrentAction: "Distribute defenses",
      regretIfWrong: regretBand(belief["decoy-first"] + belief["sector-shift"]),
    },
    {
      scenario: "High-value strike follows",
      probability: belief["high-value-strike"],
      bestCurrentAction: "Reserve premium resources",
      regretIfWrong: "High",
    },
    {
      scenario: "Sector shift",
      probability: belief["sector-shift"],
      bestCurrentAction: "Reposition mobile assets",
      regretIfWrong: regretBand(belief["random-harassment"]),
    },
  ];
}

function regretBand(value: number): "Low" | "Medium" | "High" {
  if (value >= 0.42) {
    return "High";
  }
  if (value >= 0.20) {
    return "Medium";
  }
  return "Low";
}

function simulateOutcome(
  posture: PostureName,
  wave: ThreatWave,
  belief: Readonly<Record<AttackIntent, number>>,
): string {
  const plan = buildCandidateActions().find((candidate) => candidate.posture === posture);
  if (plan === undefined) {
    return "No simulation available.";
  }
  const evaluation = evaluateAction(plan, wave, belief);
  const waveOneStatus = evaluation.immediateThreatReduction > 0.72 ? "stops wave 1" : "contains wave 1";
  const flexibility = Math.round(evaluation.futureFlexibilityPreserved);
  const regret = Math.round(evaluation.futureRegretRisk);
  return `${waveOneStatus}, preserves ${flexibility}% future flexibility, projected regret index ${regret}`;
}

function renderDashboard(result: SimulationResult): string {
  const beliefLines = Object.entries(result.belief)
    .sort((left, right) => right[1] - left[1])
    .map(([intent, probability]) => `${pad(intent, 18)} ${formatPercent(probability)}`)
    .join("\n");

  const regretRows = result.regretMap
    .map((row) => (
      `${pad(row.scenario, 28)} ${pad(formatPercent(row.probability), 8)} ` +
      `${pad(row.bestCurrentAction, 28)} ${row.regretIfWrong}`
    ))
    .join("\n");

  const alternatives = result.alternatives
    .map((evaluation) => (
      `${pad(evaluation.plan.posture, 20)} score ${pad(formatNumber(evaluation.score), 7)} ` +
      `current reduction ${formatPercent(evaluation.immediateThreatReduction)} ` +
      `flex ${formatNumber(evaluation.futureFlexibilityPreserved)}% ` +
      `regret ${formatNumber(evaluation.futureRegretRisk)}`
    ))
    .join("\n");

  const recommended = result.recommendation;
  const grammar = grammars
    .filter((entry) => result.belief[entry.intent] >= 0.12)
    .map((entry) => `- ${entry.intent}: ${entry.story}`)
    .join("\n");

  return [
    "ARES-Next: Regret-Aware Resource Allocation for Multi-Wave Attacks",
    "Future-choice preservation engine, simulated decision support only.",
    "",
    "Observed wave",
    `${observedWave.count} ${observedWave.kind}s inbound from ${observedWave.sector} toward ${assetName(observedWave.targetId)}.`,
    "",
    "Adversary Attack Grammar Belief",
    beliefLines,
    "",
    "Likely attack stories",
    grammar,
    "",
    "Regret Map",
    `${pad("Future scenario", 28)} ${pad("Prob.", 8)} ${pad("Best current action", 28)} Regret if wrong`,
    regretRows,
    "",
    `Recommended posture: ${recommended.plan.posture}`,
    `Use: ${describeUsedResources(recommended.plan.use)}`,
    `Reserve: ${recommended.plan.reserve.map(resourceName).join(", ")}`,
    `Move: ${recommended.plan.move.join(", ")}`,
    `Reason: ${recommended.plan.rationale}`,
    `Future-response flexibility preserved: ${formatNumber(recommended.futureFlexibilityPreserved)}%`,
    "",
    "Action Score Breakdown",
    `Immediate threat reduction: ${formatPercent(recommended.immediateThreatReduction)}`,
    `Asset protection value: ${formatNumber(recommended.assetProtectionValue)}`,
    `Resource cost: ${formatNumber(recommended.resourceCost)}`,
    `Reload/reposition penalty: ${formatNumber(recommended.reloadRepositionPenalty)}`,
    `Future regret risk: ${formatNumber(recommended.futureRegretRisk)}`,
    `Overcommitment risk: ${formatNumber(recommended.overcommitmentRisk)}`,
    "",
    "Candidate postures",
    alternatives,
    "",
    "Killer demo comparison",
    `Greedy defense: ${result.greedyOutcome}`,
    `ARES-Next: ${result.regretAwareOutcome}`,
    "",
    "Pitch line",
    "Our system does not maximize the next interception. It minimizes strategic regret across the whole attack.",
  ].join("\n");
}

function describeUsedResources(used: Readonly<Record<string, number>>): string {
  return Object.entries(used)
    .filter((entry) => entry[1] > 0)
    .map(([id, count]) => `${count}x ${resourceName(id)}`)
    .join(", ");
}

function resourceName(id: string): string {
  return resources.find((resource) => resource.id === id)?.name ?? id;
}

function assetName(id: string): string {
  return assets.find((asset) => asset.id === id)?.name ?? id;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value: number): string {
  return value.toFixed(1);
}

function pad(value: string, length: number): string {
  return value.padEnd(length, " ");
}

const demo = runAresNextDemo();
console.log(renderDashboard(demo));
