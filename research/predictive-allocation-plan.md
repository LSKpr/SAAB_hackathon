# Phase 4 — Predictive Resource Allocation for Multi-Wave Air Attacks

> Implementation plan for the chosen idea, plugged into the Phase 1–3 operator-console shell described in [implementation-plan.md](implementation-plan.md).
> Source idea: [chatgpt_idea.txt](chatgpt_idea.txt). This document is the contract between research and implementation; another agent should be able to build Phase 4 from this file plus the existing shell.
> Theater: Boreal Passage. Operator: Defender — South (Country Y).

---

## 1. Executive summary

We add a thin, opinionated **predictive layer** on top of the operator console that watches the first 30–90 seconds of an incoming raid, matches it against a small library of **canonical multi-wave attack templates** on the Boreal Passage map, and turns the top hypotheses into three operator-visible artifacts: **predicted next-wave overlays on the map**, a **reserve budget per effector class** that earmarks expensive interceptors against likely follow-ups, and **per-track recommendations** that explicitly say *"engage with cheap effector now — hold the long-range round for the predicted Iskander at +6 min."* Every recommendation carries a similarity score, the matched template name, an "if you ignore this" counterfactual, and a one-click *Explain* drawer. Closing the loop, completed engagements update template statistics live so the system gets visibly smarter across demo runs.

**Demo headline:** *"Two minutes in, the system told the operator to hold the Patriot. Six minutes in, that Patriot killed the Iskander aimed at Meridia. Without prediction, the same operator had spent it on a $30k decoy."*

---

## 2. Critique of the source idea

`chatgpt_idea.txt` correctly identifies the operationally important gap (don't burn LR-SAM on wave-1 decoys) and proposes the right loop (observe → match → predict → recommend → update). It also gets the framing right: *decision-support under uncertainty*, not fortune telling. But the draft is, as written, a **slide**, not a buildable spec. Concrete weaknesses:

1. **The "historical patterns" dataset is hand-waved.** The note says "use a small dataset of historical or simulated attacks" without defining the data, the storage format, the matching metric, or how five templates would even be authored on a specific map. A jury can spot this in five seconds: *what dataset?*
2. **"Markov chain" is name-dropped without a state space.** A Markov chain over what? Tracks? Waves? Class counts? The proposal mixes Markov chains, ML, and rule-based pattern matching as if they were interchangeable. They are not, and only one of them is buildable in 24 hours and explainable to a Saab jury.
3. **The probabilities in the example table are arbitrary.** "Second drone wave 70 %, missile strike 45 %, sector shift 30 %." Where do these numbers come from? Without a likelihood model, the system *looks* like a fortune teller and a juror's first question — *"how does it actually compute that 70 %?"* — has no answer.
4. **No integration with the operator's actual decision moment.** The note describes a separate "prediction dashboard", but the existing console already has a TEWA loop, an EngagementPanel, an AlertsPanel and a ResourcePanel. A standalone prediction widget that doesn't bias the actual *engagement recommendations* is a screensaver. Predictions must change which fire-unit gets earmarked and which engagement gets proposed.
5. **No mechanism for "reserving."** The note says "reserve high-value missiles" but never says *how many*, *which fire-unit*, or *how the reserve count surfaces to the operator*. A claim without a number is not a feature.
6. **No anti-fortune-teller posture.** The note assumes the user will trust the prediction. Real C2 operators (and the jury) actively distrust black-box predictions. There is no UX rule (no "always show alternatives", no "always show what cheap action would *confirm* the prediction").
7. **No failure mode.** What happens when the live raid does not match any template? The note implicitly assumes a match always exists. It does not.
8. **No closing of the loop.** The note says "update after each new detection" but never says *what state* updates and *how the next demo run is different*. A counter in a JSON file is enough — but it has to be visible.
9. **No theater.** The proposal is map-agnostic. Boreal Passage has three obvious axes (W / Central / E), island stepping-stone bases, and a clear high-value target (Meridia) that a strong template library should encode. The note does not.
10. **Overlap with existing ideas is unaddressed.** Ideas #1 (Smart TEWA), #2 (Attack-pattern allocation), #11 (Raid-template classifier), #31 (Capability continuity forecaster) all overlap with this one. A real plan must say which pieces it absorbs and which it explicitly leaves out.

---

## 3. Refined framing

> **User:** the South / Country Y air-defense console operator (the same single user the Phase 1–3 shell is built for).
> **Decision moment:** the 30–120-second window between *first hostile detection* and *the operator clicking "Authorize" on the first engagement against wave 1*.
> **Input:** the live track set, the existing fire-unit / asset state from the Zustand store, and a small library of pre-authored multi-wave raid templates.
> **Output:** (a) a ranked list of `RaidHypothesis` objects with predicted next-wave time/axis/composition/probability, (b) a `ReserveBudget` per effector class shown in the Resource panel, (c) a stream of `Recommendation` objects (allocate / reserve / cue / reposition) shown in the Alerts panel and used as a soft bias on the existing TEWA engagement scoring, (d) map overlays for predicted axes and impact areas.
> **Metric of success:** in the scripted demo scenario, the predictive system reduces leakers reaching Meridia from 1 (naive baseline) to 0, while spending **fewer total interceptor-dollars** than the naive run. Both numbers are visible on the After-Action panel at the end of the run.

The kickoff PDF asks the system to *"think several steps ahead"* and to deliver *"tactical superiority through efficient resource allocation."* This module is the most direct possible interpretation of those two phrases at the **operator-console** level: it is the difference between *seeing* the next wave on the map (with a probability and a confidence) and being *surprised* by it.

It is **not** a strategic forecaster (that is idea #31, the Capability Continuity Forecaster, which we explicitly leave for future work — see §12).

### Overlap with existing ideas (and what we fold in / leave out)

| Existing idea | Overlap | Decision |
|---|---|---|
| **#1 Smart TEWA** | Same operator, same panel set, same scoring loop. | We **build on top** — the TEWA scorer remains the only thing that proposes engagements; we only add a *bias term* (`reservedPenalty`) and a *Recommendation* layer above it. We do NOT replace TEWA. |
| **#2 Attack-pattern allocation** | This is the same idea, restated. | Fully absorbed. This document supersedes the one-line catalog entry. |
| **#11 Raid-template classifier** | Subset: the *classifier* part. | Fully absorbed. The classifier becomes one function (`matchTemplates`) inside this module. |
| **#31 Capability continuity forecaster** | Adjacent: *strategic* depletion outlook over 15–240 min. | **Out of scope.** Tempting but eats too much time. We expose enough hooks (`ReserveBudget`, predicted shots-needed-per-class) that a future Phase 5 can layer #31 on top without refactor. |
| **#1 Fratricide guard / #2 Civil deconfliction / #5 Weather-aware / #10 ROE studio** | Orthogonal hard-safety / scoring layers. | Out of scope here, but our Recommendation pipeline routes through the same `Engagement` proposal that they would gate, so they compose cleanly later. |

---

## 4. Tweaks and improvements (the meat)

This is the opinionated bit. Each item below replaces vague language in `chatgpt_idea.txt` with a concrete decision.

### 4.1 Algorithmic approach — pick: *feature-vector cosine similarity + Bayesian update over a hand-authored template library*

**Primary method (build this in 24 h):**

1. Bucket the last 90 s of hostile tracks into a fixed-shape **feature vector** over `(axis × altitude band × class bucket × time window)`.
2. Compute **cosine similarity** between the live feature vector and each template's pre-authored *signature vector*.
3. Apply a **Bayesian update**: `posterior(t) ∝ prior(t) × exp(-α × (1 - sim(t)))`, where the prior comes from `templateStats.json` (count of past matches in this and previous demo runs) and `α` is a tunable temperature (start at 3.0).
4. Normalize over templates *plus* a `"no-match"` mass (default prior 0.05) so the system is honestly *allowed to say "I don't know."*
5. Return the top-K (K=3) hypotheses with `confidence ≥ 0.20`.

**Why this and not the alternatives:**

| Alternative | Why we reject it for the hackathon |
|---|---|
| Markov chain | Requires a coherent state space and a transition matrix. We don't have either. Wastes 4 hours debating what a "state" even is. |
| Hidden Markov Model | Same, plus EM training. No training data. |
| Dynamic Time Warping | Strong for sequence shape but our raids only have 2–4 waves; DTW is overkill and the similarity it gives is harder to explain than cosine. |
| Tiny transformer / LSTM | No training data, no time, weak explainability, juror-hostile. |

Cosine + Bayes wins because **(1)** each step is a one-screen function, **(2)** the explanation is literally a bar chart of the dot-product terms, **(3)** posteriors are real probabilities the operator can read, and **(4)** the system can honestly say *"no template matches above 0.30"* and degrade to plain TEWA. This matches `command-and-control.md §3.4`'s production pattern of *fast / explainable heuristics first*.

**Stretch goal (only after 4a + 4b are demo-stable):** add a tiny *forward Monte Carlo rollout* (k=20, horizon=60 s) under the top hypothesis vs. a *no-prediction baseline*. The stretch produces the second visceral metric for the demo: *"if you follow the recommendation: expected leakers 0.3, expected interceptor spend $5.2M. If you ignore it: expected leakers 1.4, spend $7.1M."* This is exactly the look-ahead pattern from `command-and-control.md §3.5` and `ideas.md §4.4`.

### 4.2 Pattern library — 8 canonical templates on Boreal Passage

Eight is the magic number: enough that the matcher can fail to match (a real possibility, which we want to demonstrate), few enough that any one demo can credibly cover them. Each has a **signature** (first 30–90 s features), **predicted follow-up waves** with `deltaTMin` ranges, **axis vectors** drawn from the CSV asset positions, and a **recommended counter** that the recommender translates into a reserve budget.

The eight templates, axes are referenced to the CSV (north → south, x in km from west):

| ID | Name | Wave 1 signature | Predicted follow-up | Axis | Recommended counter |
|---|---|---|---|---|---|
| `T-EAST-SAT-PRECISION` | **Eastern Saturation-then-Precision** | 6–10 small drones + 1–2 subsonic CMs from Boreal Watch Post (1158, 385) toward Firewatch (1398, 1072) at 50–500 m | 1× SRBM (Iskander-class) toward Meridia (1225, 1208) at +5–8 min | EAST | Cheap (AAA/VSHORAD) on wave 1; **reserve 1× SAM_LR** for wave 2. |
| `T-WEST-DECOY-CM` | **Western Decoy + Cruise Follow-up** | 8–12 Shahed-class from Nordvik / Northern Vanguard (140, 320 → 198, 335) toward Callhaven (97, 1150) at 200–500 m | 2–4 subsonic CMs same axis at +5–9 min, sea-skim 30–80 m | WEST | Gepard/RBS-70 wave 1; **reserve 2× SAM_MR** for wave 2. |
| `T-MULTIAXIS-FEINT` | **Multi-Axis Feint** | 1–2 fighters + 3–4 drones probe on WEST axis | Real strike from EAST axis (CMs + glide bombs) at +3–5 min toward Firewatch / Meridia | WEST→EAST | **Do NOT reposition CAP west.** Hold central CAP; reserve EAST sector MR-SAM. |
| `T-EW-BLIND-WINDOW` | **EW-Blind Window Strike on Spear Point** | 1–2 ARMs + jamming spike + ESM-only contacts toward Spear Point (918, 835) | Glide bombs from Tu-class standoff at +3–6 min during EMCON window | CENTRAL | **Emcon amber, scramble Gripen BVR**, reserve 2× SAM_MR for glide-bomb release. |
| `T-PROBE-CAPITAL` | **Spear-Point Probe + Capital Strike** | Small 4–6 drone strike on Spear Point (island, exposed) | Kh-101-class ALCM salvo (2–4) toward Meridia at +8–12 min from Highridge axis | CENTRAL | VSHORAD at Spear Point only; **reserve 2× SAM_LR** for Meridia ALCMs. |
| `T-BOMBER-STANDOFF` | **Roof-Knock + Bomber Stand-off** | 1× MALE UAV recce pass (Boreal Watch Post → Firewatch) | Tu-95-class bomber lane outside SAM ring launching 4–6 ALCMs at +10–15 min | EAST/CENTRAL | **Forward Gripen CAP** to engage bomber pre-release; reserve 2× SAM_LR for ALCMs. |
| `T-SWARM-CONTINUATION` | **Drone Swarm Continuation** | 12+ continuous drone swarm from Highridge area (838, 75) toward Solano (577, 1237) | Same composition every 4–6 min indefinitely | CENTRAL | **HPM/AAA primary**; do not engage with SAM_MR or SAM_LR; expect long-tail magazine drain. |
| `T-HELO-POPUP-WEST` | **Western Helo Pop-up + CM Salvo** | 1–2 helos NOE around west islands toward Southern Redoubt (322, 1238) | 3–4 subsonic CMs over the same gap at +4–7 min | WEST | VSHORAD west; **reserve 2× SAM_MR** for the CM salvo. |

Templates are **JSON files** (see §6 for the schema and a worked example) so the team can hand-author and tweak them without code changes.

A 9th implicit "template" is the **"NO_MATCH"** state — when no `posterior > 0.20` exists, the prediction panel goes grey with the message *"No raid pattern matched. Current TEWA only."* This is required (see §4.6).

### 4.3 Reserve policy — concrete formula

For each effector class `C ∈ EffectorClassId`:

```
earmarked(C) =
  ceil(
    max over active hypotheses H with H.confidence ≥ 0.25 of:
      sum over predicted waves W in H of:
        H.confidence
        × shotsRequiredPerWave(W, C)
        × urgency(W.eta - simTimeMin)
  )

available(C) = ready(C) − earmarked(C)
```

Where:

- `shotsRequiredPerWave(W, C)` is **declared in the template** (e.g., template `T-EAST-SAT-PRECISION` declares `wave2.recommendedCounter = { SAM_LR: 1 }`). No magic.
- `urgency(eta)` is a piecewise-linear bump: `0` if `eta < 0`, `1.0` if `0 ≤ eta ≤ 5 min`, linearly down to `0.5` at `eta = 15 min`, `0` beyond `eta = 20 min`. Far-future waves don't earmark anything.
- `max over hypotheses` (not sum) is intentional: we don't double-earmark when two templates predict overlapping demand for the same class. This keeps reserve numbers operationally sober.

The reserve surfaces in the **Resource panel** as three columns per fire-unit:

```
 SAM_LR @ Spear Point      ready 4   earmarked 1  →  available 3
                                     ↑ "T-PROBE-CAPITAL · 0.62 conf · for wave 2 ETA +9 min"
```

And it surfaces in the **TEWA scoring** as a soft penalty:

```
score(option) -= w_reserve × (option.fireUnit.class is earmarked ? earmarkedFraction : 0)
```

`w_reserve = 1.5` (calibrated so reserved units only get used when no cheaper option is feasible — which is exactly the operator-override moment we want).

### 4.4 Explainability — concrete UI elements

We are **specifically anti-black-box**. Every visible piece of prediction has a deterministic, inspectable origin.

1. **Confidence ribbon** on every hypothesis row in the Prediction panel — three-segment bar (likelihood × prior × normalized posterior), each segment labeled with its number on hover.
2. **Matched-template signature similarity** rendered as a small *radar chart* (axes = class, axis, altitude, time-window — same dimensions as the feature vector). The operator can see *which* features drove the match.
3. **Counterfactual line** on every recommendation: *"If you fire all 4× SAM_LR on wave 1, expected SAM_LR available at predicted wave 2 = 0; predicted leakers = 1.4."* Computed from the (stretch) Monte Carlo rollout, or simply from `ready − wave1Demand` arithmetic when stretch is off.
4. **Audit log entry** per recommendation, written to the Phase 1–3 event log as `{ kind: "PREDICTION_RECOMMENDATION", payload: { hypothesisId, templateId, similarity, posterior, counterfactual, … } }`. Replayable at demo end.
5. **"Explain this" drawer** opens on click of any recommendation; renders the full feature-vector dot-product breakdown plus the template's authored `rationale` field.

### 4.5 Anti-fortune-teller framing — UX rules

These are *hard rules* the implementation agent must enforce. Violating any of them turns the demo into a black box.

- **Never use the word "WILL" in any operator-visible string.** Use *"expected"*, *"consistent with"*, *"matches template X at Y%"*. (Implementation: a one-line ESLint rule plus a code-review check.)
- **Always show probability.** Every prediction row shows `confidence: 0.62` (not "high"). Confidence below 0.40 is rendered amber, below 0.25 is grey-italic.
- **Always show the alternative.** Top-K = 3, the panel always shows the second hypothesis (even if it's "NO_MATCH") so the operator sees *what else this could be.*
- **Always show a cheap information action.** Each template declares 1–3 `cheapInfoActions` — e.g., *"Cue ESM to sector EAST"*, *"Scramble Gripen pair from Spear Point for visual ID"*, *"Steer GlobalEye revisit to (1300, 700)"*. The Recommendation panel surfaces these as low-priority `CUE` recommendations alongside the high-priority `ALLOCATE`/`RESERVE` ones. This addresses the kickoff PDF's *"think several steps ahead"* prompt at the **information** layer, not just the **shooting** layer.
- **Always show what would falsify the prediction.** E.g., *"This match would weaken if no new track from EAST appears within 4 min."* Authored per template.
- **Never auto-execute.** Recommendations are HITL by default. Only the existing TEWA engagement proposal flow (which is also HITL in Phase 1–3) ever leads to a shot.

### 4.6 Failure modes

- **No template above threshold (`max posterior < 0.20`):** Prediction panel renders a single grey row: *"No raid pattern matched (top similarity 0.18). Current TEWA only."* Reserve budget collapses to zero. Map predicted-axis layer is hidden. This is the **honest** state and we *show it* — including in the demo (during the cold pre-raid period). Jurors notice when a system *admits* it doesn't know.
- **Two templates within 0.05 of each other (genuine ambiguity):** Both rendered, both with their predicted axes drawn on the map (the operator sees two cones, not one). Reserve budget is the `max` over both, not double-counted.
- **Live raid evolves to contradict an active hypothesis:** the Bayesian update degrades the posterior naturally on the next tick. Additionally, each template carries a `falsifyOnObservation` field; if observed (e.g., *"no EAST-axis track within 4 min"*), the posterior is multiplied by `0.1` immediately rather than waiting for the natural decay.
- **Module crash / NaN:** the engine module wraps every tick in a try/catch and on error sets `state.predictiveAllocation = { error: <msg>, fallbackToTewa: true }`. The Prediction panel renders an amber "Module degraded" line; the rest of the console keeps working.

### 4.7 Closing the loop

A `data/raid-templates/templateStats.json` file is **persisted to disk** between demo runs (or to `localStorage` if persistence is annoying). After every completed engagement (`Engagement.state ∈ {HIT, MISS}`) and every wave-end timeout, the module updates:

```json
{
  "T-EAST-SAT-PRECISION": { "matched": 5, "predictedWaveActuallyArrived": 4,
                            "predictedWaveDidNotArrive": 1, "lastUpdated": "..." },
  "T-WEST-DECOY-CM":      { ... }
}
```

The prior in §4.1 is `prior(t) = (matched + 1) / (totalRuns + N_templates)` (Laplace-smoothed). On the next demo run the operator sees *"based on 5 of 6 historical matches"* in the rationale. This is the visible feedback loop the source idea hand-waves.

The Prediction panel header has a tiny *"Library: 8 templates · 14 historical matches · last updated 12 min ago"* footer so the closing-of-the-loop is **visible** rather than implicit.

### 4.8 Coupling to the existing shell — exact file list

The implementation agent must respect the Phase 1–3 contract. Files touched:

**New files:**
- `src/engine/modules/predictiveAllocation.ts` — the module (the `TODO[Phase 4]` plug-point).
- `src/engine/predictive/features.ts` — `extractFeatures`.
- `src/engine/predictive/match.ts` — `matchTemplates`.
- `src/engine/predictive/recommend.ts` — `recommendActions`.
- `src/engine/predictive/loop.ts` — `updateAfterEvent`.
- `src/components/Panels/PredictionPanel.tsx` — new panel, slots into the right column (see §8).
- `src/components/Map/PredictedThreatLayer.tsx` — new map overlay (cones, predicted impact circles, "earmarked" highlights on fire units).
- `data/raid-templates/*.json` — eight template files.
- `data/raid-templates/templateStats.json` — persisted prior.
- `data/scenarios/04-east-sat-precision-demo.json` — the demo scenario from §9.

**Modified files (additive, no behavior change to existing tests):**
- `src/engine/types.ts` — add `RaidTemplate`, `RaidHypothesis`, `Recommendation`, `ReserveBudget`, plus a `predictive` slice on the store. (See §5.)
- `src/engine/store.ts` — add the `predictive` slice and selectors `selectActiveHypotheses`, `selectReserveBudget`, `selectRecommendations`.
- `src/engine/tick.ts` — call `runPredictiveAllocation(state, dt)` after the existing TEWA tick.
- `src/components/Map/RangeRingLayer.tsx` — add a *"earmarked"* visual treatment (dashed amber outline) when a fire unit's class is in the reserve budget.
- `src/components/Map/EngagementLayer.tsx` — render a *ghost engagement* line for each `ALLOCATE` recommendation that has not yet been authorized.
- `src/components/Panels/EngagementPanel.tsx` — add a "🛡 reserved — see PredictionPanel" badge on options that target an earmarked fire unit, plus the score impact line.
- `src/components/Panels/AlertsPanel.tsx` — render `Recommendation`s of kind `RESERVE` and `CUE` here; clicking opens the Prediction panel's Explain drawer.
- `src/components/Panels/ResourcePanel.tsx` — extend each fire-unit row with the `ready / earmarked / available` columns from §4.3.

**Untouched (this is an explicit non-goal):** anything in Phases 1–3's data parsing, scenario loading, coordinate helpers, or top bar / timeline / track list.

---

## 5. Data model additions

These types extend `src/engine/types.ts`. Field naming follows the existing conventions (`posKm`, `simTimeMin`, etc.).

```ts
// ---------- Pattern library ----------

export type AxisId = "WEST" | "CENTRAL" | "EAST";
export type AltitudeBand = "VLOW" | "LOW" | "MID" | "HIGH";
export type ClassBucket =
  | "DRONE" | "CM" | "FIGHTER" | "BOMBER"
  | "BALLISTIC" | "GLIDE" | "ARM" | "HELI" | "OTHER";

/** Coarse per-tick feature vector; flattened for cosine. */
export interface FeatureVector {
  /** Counts indexed [axis][altBand][classBucket][tWindow]. */
  counts: number[]; // length AxisId×AltBand×ClassBucket×3, normalized
  totalCount: number;
  distinctAxes: number;
  classDiversity: number; // 0..1, Shannon-entropy-normalized
}

export interface PredictedWave {
  /** Operator-visible label, e.g. "Iskander toward Meridia". */
  label: string;
  /** Time delta from raid start (= first hostile detection), minutes. */
  deltaTMinRange: [number, number];
  expectedClasses: ClassBucket[];
  expectedCount: [number, number];
  axis: AxisId;
  /** Cone of arrival; angle in degrees off the axis vector. */
  arrivalConeDeg: number;
  /** Predicted impact area: which south asset(s) is the most likely aim point? */
  predictedTargetAssetIds: string[];
  /** Reserve advice the recommender consumes. */
  recommendedCounter: Partial<Record<EffectorClassId, number>>;
}

export interface RaidTemplate {
  id: string;
  name: string;
  /** Author's narrative, shown in Explain drawer. */
  rationale: string;
  /** First-30-90s feature vector — same shape as live FeatureVector.counts. */
  signatureVector: number[];
  /** Predicted later waves; index 0 is the first follow-up. */
  predictedWaves: PredictedWave[];
  /** Phrase-level UX strings authored once. */
  cheapInfoActions: { id: string; text: string }[];
  /** Plain-English condition that, if observed, weakens this template. */
  falsifyOnObservation: string;
  /** Default prior weight (used before any history accumulates). */
  defaultPrior: number;
}

export interface TemplateStats {
  templateId: string;
  matched: number;
  predictedWaveActuallyArrived: number;
  predictedWaveDidNotArrive: number;
  lastUpdatedSimT: number;
}

// ---------- Live hypotheses ----------

export interface RaidHypothesis {
  id: string;                 // "H-<simTime>-<templateId>"
  templateId: string;
  templateName: string;
  similarity: number;         // cosine, 0..1
  posterior: number;          // unnormalized
  confidence: number;         // 0..1, normalized over hypotheses + NO_MATCH
  predictedWaves: (PredictedWave & { etaMinRange: [number, number] })[];
  generatedAtT: number;
  /** Audit-trail: top 5 features and their similarity contribution. */
  topFeatures: { featureLabel: string; live: number; template: number; contribution: number }[];
}

// ---------- Recommendations ----------

export type RecommendationKind =
  | "ALLOCATE"          // soft proposal: "engage track X with fire unit Y"
  | "RESERVE"           // "hold N rounds of class C for predicted wave W"
  | "REPOSITION"        // "move CAP from area A to area B"
  | "CUE";              // cheap info action: "cue ESM to sector EAST"

export interface Recommendation {
  id: string;
  kind: RecommendationKind;
  // Targeting (optional, kind-specific):
  trackId?: string;
  fireUnitId?: string;
  effectorClass?: EffectorClassId;
  amount?: number;
  // Provenance:
  hypothesisId: string;
  reasonText: string;       // short, operator-friendly
  counterfactual?: string;  // "if ignored: leakers +1.1"
  confidence: number;       // copy of source hypothesis confidence at time of emission
  proposedAtT: number;
  expiresAtT: number;
}

// ---------- Reserve budget ----------

export interface ReserveBudgetEntry {
  effectorClass: EffectorClassId;
  ready: number;
  earmarked: number;
  available: number;
  drivenByHypothesisId?: string;
  reasonText?: string;
}

export type ReserveBudget = Record<EffectorClassId, ReserveBudgetEntry>;

// ---------- Store slice ----------

export interface PredictiveSlice {
  hypotheses: RaidHypothesis[];        // top-K (K=3) sorted desc
  recommendations: Recommendation[];   // active + non-expired
  reserveBudget: ReserveBudget;
  templateStats: Record<string, TemplateStats>;
  lastTickT: number;
  error?: string;                       // populated on module crash
}
```

---

## 6. Pattern-library seed data

Templates ship as one JSON file each under `data/raid-templates/`. The signature vector is dimensioned `3 axes × 4 altBands × 9 classBuckets × 3 timeWindows = 324`, dense, normalized to unit length so cosine similarity is well-defined. Authoring rule: fill in the 4–8 cells you actually expect; leave the rest 0.

Worked example (the most demo-relevant template):

```jsonc
// data/raid-templates/T-EAST-SAT-PRECISION.json
{
  "id": "T-EAST-SAT-PRECISION",
  "name": "Eastern Saturation-then-Precision",
  "rationale": "Cheap mass volley from Boreal Watch Post (1158, 385) onto Firewatch absorbs SAM-MR magazine; minutes later an Iskander-class SRBM is launched from the same axis at Meridia. Historically the cheap volley is a magazine-attrition tool, not the main strike.",
  "signatureVector": [
    /* shape: axis × altBand × classBucket × tWindow, flattened.
       Non-zero cells (axis=EAST=2, altBand=LOW=1, classBucket=DRONE=0/CM=1, tWindow=t0-30=0/t30-60=1):
         EAST × LOW × DRONE × t0-30  : 0.55
         EAST × LOW × DRONE × t30-60 : 0.40
         EAST × VLOW × CM × t30-60   : 0.30
         EAST × MID × OTHER × t0-30  : 0.10  (radar/ESM marker)
       All others 0; vector is then unit-normalized at load time. */
    "<<see authoring tool — 324 floats>>"
  ],
  "predictedWaves": [
    {
      "label": "Iskander-class SRBM toward Meridia",
      "deltaTMinRange": [5, 8],
      "expectedClasses": ["BALLISTIC"],
      "expectedCount": [1, 1],
      "axis": "EAST",
      "arrivalConeDeg": 12,
      "predictedTargetAssetIds": ["Meridia"],
      "recommendedCounter": { "SAM_LR": 1 }
    }
  ],
  "cheapInfoActions": [
    { "id": "cue-esm-east",       "text": "Cue ESM to sector EAST for SRBM-launch radar" },
    { "id": "globaleye-revisit",  "text": "Steer GlobalEye revisit to (1300, 700), 60-s cadence" },
    { "id": "scramble-gripen-sp", "text": "Scramble Gripen pair from Spear Point for visual ID on the cheap volley" }
  ],
  "falsifyOnObservation": "No new EAST-axis high-altitude detection within 4 minutes of first hostile.",
  "defaultPrior": 0.18
}
```

The remaining seven templates follow the same shape. Their non-zero cells (in the same `axis × altBand × class × tWindow` notation) are:

- **`T-WEST-DECOY-CM`:** `WEST × LOW × DRONE × t0-30` 0.60, `WEST × LOW × DRONE × t30-60` 0.45, baseline near-zero `CM` traces in t30-60. Predicted wave: 2–4 `CM_SUBSONIC` along WEST axis at +5–9 min toward Callhaven. Counter: `{ SAM_MR: 2 }`.
- **`T-MULTIAXIS-FEINT`:** `WEST × MID × FIGHTER × t0-30` 0.30, `WEST × LOW × DRONE × t0-30` 0.30, very low EAST-axis activity in the first 30 s. Predicted wave: the *real* strike on EAST (CMs + glide bombs) at +3–5 min. Counter: `{ SAM_MR: 2, FIGHTER_BVR: 0.5 }` (the half-CAP earmark just freezes them in place — see §4.5).
- **`T-EW-BLIND-WINDOW`:** `CENTRAL × MID × ARM × t0-30` 0.40, `CENTRAL × * × OTHER × t0-30` 0.30 (jamming/ESM marker). Predicted wave: 4–6 `GLIDE_BOMB` from standoff bombers toward Spear Point at +3–6 min. Counter: `{ SAM_MR: 2, FIGHTER_BVR: 1 }`.
- **`T-PROBE-CAPITAL`:** `CENTRAL × LOW × DRONE × t0-30` 0.50 with predicted impact on Spear Point. Predicted wave: 2–4 `CM_SUBSONIC` (Kh-101-class) on CENTRAL axis at +8–12 min toward Meridia. Counter: `{ SAM_LR: 2 }`.
- **`T-BOMBER-STANDOFF`:** `EAST × MID × OTHER × t0-30` 0.40 (MALE recce signature), low everything else. Predicted wave: 1× `BOMBER` lane outside SAM ring releasing 4–6 ALCMs at +10–15 min. Counter: `{ SAM_LR: 2, FIGHTER_BVR: 2 }`.
- **`T-SWARM-CONTINUATION`:** `CENTRAL × LOW × DRONE × t0-30` 0.45, `CENTRAL × LOW × DRONE × t30-60` 0.45, `CENTRAL × LOW × DRONE × t60-90` 0.45 (sustained intensity is the signature). Predicted wave: same composition every 4–6 min, indefinite. Counter: `{ DEW_HPM: 4, AAA_CRAM: 8 }` (note: this template *forbids* SAM_MR/LR earmark — magazine-protection, not reserve-for-future).
- **`T-HELO-POPUP-WEST`:** `WEST × VLOW × HELI × t0-30` 0.45 (NOE signature). Predicted wave: 3–4 `CM_SUBSONIC` on WEST axis at +4–7 min toward Southern Redoubt. Counter: `{ SAM_MR: 2 }`.

Each template also has an authoring-time **demo scenario** linked from its file, so the team can replay any template solo to validate the matcher.

---

## 7. Algorithm spec (pseudocode)

All four functions live in `src/engine/predictive/*.ts`, are pure (`(state, ctx) → output`), and have no side effects except `updateAfterEvent` which writes to `templateStats`.

### 7.1 `extractFeatures(tracks, simTimeMin, history) → FeatureVector`

```
WINDOW_MIN = 1.5   # last 90 s of detections
RAID_T0    = state.predictive.raidStartedAtT  # = firstHostileDetectionT
if RAID_T0 == undefined:
   return { counts: zeros(324), totalCount: 0, ... }

axes = {
  WEST:    centerX <= 466,            # x ∈ [0, 466) ≈ Nordvik / NV-Base / Callhaven corridor
  CENTRAL: 466 < centerX <= 933,      # x ∈ [466, 933) ≈ Highridge / Spear Point / Solano
  EAST:    centerX > 933,             # x ∈ [933, 1666] ≈ Boreal Watch / Firewatch / Meridia
}
altBands = {
  VLOW: alt <  200 m,                 # sea-skim / NOE
  LOW:  200 ≤ alt < 2000 m,           # drones, low CMs
  MID:  2000 ≤ alt < 10_000 m,        # MALE, fighters
  HIGH: alt ≥ 10_000 m,               # bombers, ballistic apogee
}
classBuckets = map ThreatClassId → ClassBucket per the rules:
  DRONE_SWARM/LOITERING_MUNITION/UAV_MALE_HALE → DRONE
  CM_SUBSONIC/CM_SUPERSONIC/HCM → CM
  FIGHTER_4GEN/FIGHTER_5GEN → FIGHTER
  BOMBER → BOMBER
  SRBM/MRBM/HGV → BALLISTIC
  GLIDE_BOMB → GLIDE
  ARM → ARM
  HELI → HELI
  else → OTHER

# Time windows are relative to RAID_T0 (not simTimeMin), so the live vector
# matches the shape templates were authored against.
tWindow(track) = bucket(track.firstSeenT - RAID_T0):
  [0, 0.5)  → 0   ("t0-30")
  [0.5, 1) → 1   ("t30-60")
  [1, 1.5] → 2   ("t60-90")
  > 1.5    → drop  (only first 90 s matter for matching)

counts = zeros(3 × 4 × 9 × 3)
for track in tracks:
  if track.classification != "HOSTILE": continue
  if (simTimeMin - track.firstSeenT) > WINDOW_MIN: continue
  i_axis  = axes(track.posKm.x)
  i_alt   = altBands(track.altitudeM)
  i_class = classBuckets(track.classId)
  i_t     = tWindow(track)
  if i_t === undefined: continue
  counts[i_axis][i_alt][i_class][i_t] += 1

return {
  counts: l2normalize(flatten(counts)),
  totalCount: sum(counts),
  distinctAxes: |{ a : counts[a].sum() > 0 }|,
  classDiversity: shannonEntropy(class-marginal of counts) / log(9),
}
```

### 7.2 `matchTemplates(features, prior, simTimeMin) → RaidHypothesis[]`

```
ALPHA = 3.0
NO_MATCH_MASS = 0.05
THRESHOLD = 0.20
TOP_K = 3

# Edge case: cold scene, no hostile yet.
if features.totalCount == 0:
  return []

raw = []
for tmpl in raidTemplates:
  sim = cosineSimilarity(features.counts, tmpl.signatureVector)
  likelihood = exp(-ALPHA * (1 - sim))
  posterior  = prior[tmpl.id] * likelihood
  topF = topK_features(features, tmpl, k=5)  # contribution = live[i] * tmpl[i] / sim
  raw.push({ tmpl, sim, posterior, topF })

# Add the NO_MATCH bucket.
totalP = sum(raw.posterior) + NO_MATCH_MASS

hypotheses = []
for r in raw:
  conf = r.posterior / totalP
  if conf < THRESHOLD: continue
  hypotheses.push({
    id: `H-${simTimeMin.toFixed(1)}-${r.tmpl.id}`,
    templateId: r.tmpl.id,
    templateName: r.tmpl.name,
    similarity: r.sim,
    posterior: r.posterior,
    confidence: conf,
    predictedWaves: r.tmpl.predictedWaves.map(w => ({
      ...w,
      etaMinRange: [simTimeMin + w.deltaTMinRange[0],
                    simTimeMin + w.deltaTMinRange[1]],
    })),
    generatedAtT: simTimeMin,
    topFeatures: r.topF,
  })

return sortDesc(hypotheses, h => h.confidence).slice(0, TOP_K)
```

### 7.3 `recommendActions(hypotheses, fireUnits, defendedAssets, simTimeMin) → Recommendation[]`

```
recs = []

# 1. Reserve budget per effector class.
budget = computeReserveBudget(hypotheses, fireUnits, simTimeMin)
for entry in budget:
  if entry.earmarked > 0:
    recs.push({
      kind: "RESERVE",
      effectorClass: entry.effectorClass,
      amount: entry.earmarked,
      hypothesisId: entry.drivenByHypothesisId,
      reasonText: `Hold ${entry.earmarked}× ${entry.effectorClass} for predicted ${tmpl.name} wave at +${eta}min`,
      counterfactual: `If used now: predicted SAM_LR available at +${eta}min = 0; expected leakers +1`,
      confidence: hypothesisById(entry.drivenByHypothesisId).confidence,
      proposedAtT: simTimeMin,
      expiresAtT: simTimeMin + 1.0,    # cycle every minute
    })

# 2. Allocation bias: for each existing TEWA option, if the proposed
#    fireUnit is in an earmarked class, emit a kind=ALLOCATE
#    recommendation that downscores it and proposes a cheaper alternative.
for option in state.tewa.proposedOptions:
  if isEarmarked(option.fireUnit.class, budget):
    cheaper = bestNonEarmarked(option.track, fireUnits, budget)
    if cheaper:
      recs.push({
        kind: "ALLOCATE",
        trackId: option.track.id,
        fireUnitId: cheaper.fireUnit.id,
        hypothesisId: budget[option.fireUnit.class].drivenByHypothesisId,
        reasonText: `Use ${cheaper.fireUnit.class} instead of ${option.fireUnit.class}; latter earmarked for ${tmpl.name} wave 2`,
        counterfactual: `If you take the SAM_LR shot: predicted leakers next wave +1.1`,
        confidence: budget[option.fireUnit.class].confidence,
        proposedAtT: simTimeMin,
        expiresAtT: simTimeMin + 0.5,
      })

# 3. Cheap-information actions, surface as low-priority CUEs.
for h in hypotheses:
  for a in tmplById(h.templateId).cheapInfoActions:
    recs.push({
      kind: "CUE",
      hypothesisId: h.id,
      reasonText: a.text,
      confidence: h.confidence,
      proposedAtT: simTimeMin,
      expiresAtT: simTimeMin + 2.0,
    })

return recs
```

### 7.4 `updateAfterEvent(eventType, payload) → void`

```
match eventType:
  "ENGAGEMENT_HIT" | "ENGAGEMENT_MISS":
    # Did any active hypothesis predict a wave that this engagement is
    # consistent with? "Consistent" = same axis bucket + same class bucket +
    # ETA window contains current simTime.
    for h in state.predictive.hypotheses:
      for w in h.predictedWaves:
        if axisOf(payload.track) == w.axis
           and classBucket(payload.track) in w.expectedClasses
           and w.etaMinRange[0] - 1 <= simTimeMin <= w.etaMinRange[1] + 1:
          stats[h.templateId].matched += 1
          stats[h.templateId].predictedWaveActuallyArrived += 1

  "WAVE_WINDOW_EXPIRED":  # synthetic event fired by the engine when
                          # an etaMinRange[1] passes with no matching track
    for h in state.predictive.hypothesesAtWindowOpen[payload.windowKey]:
      stats[h.templateId].predictedWaveDidNotArrive += 1

  "OPERATOR_OVERRIDE":    # operator chose an option we recommended against
    # No prior change; we still log the override in the audit trail.
    auditLog.push({ kind: "OVERRIDE", payload, hypothesisId: payload.hid })

# After any change, recompute prior:
for tid in templateIds:
  prior[tid] = (stats[tid].matched + 1) /
               (sum(stats[*].matched) + N_TEMPLATES)

# Persist `templateStats.json` to disk (or localStorage).
persist(stats)
```

---

## 8. UI/UX additions

Five surfaces. ASCII sketches are normative for layout; styling is Tailwind-default per the existing shell.

### 8.1 Prediction panel (new, right column, top half)

```
┌─ PREDICTION ─────────────────────────────────────────────┐
│ Library: 8 templates · 14 historical matches · ↻ 12m ago │
├──────────────────────────────────────────────────────────┤
│ ▓▓▓▓▓▓▓░░░  Eastern Saturation-then-Precision      0.62  │
│ ↳ Predicted: Iskander-class SRBM → Meridia               │
│   ETA +5–8 min · axis EAST · cone 12°                    │
│   based on 5 of 6 historical matches  [Explain ▾]        │
│                                                          │
│ ▓▓▓▓░░░░░░  Roof-Knock + Bomber Stand-off          0.27  │
│ ↳ Predicted: Tu-95 lane + 4–6 ALCMs ETA +10–15 min       │
│   based on 2 of 6 historical matches  [Explain ▾]        │
│                                                          │
│ ░░░░░░░░░░  NO_MATCH                               0.11  │
└──────────────────────────────────────────────────────────┘
```

`[Explain ▾]` opens an inline drawer with the radar chart of feature contributions, the template's `rationale` text, the `falsifyOnObservation` line, and an audit-log link.

When `max(confidence) < 0.20`: render a single grey row *"No raid pattern matched (top similarity 0.18). Current TEWA only."* and hide the map predicted-axis layer.

### 8.2 Reserve panel (extension of existing `ResourcePanel`)

```
┌─ RESOURCES ─────────────────────────────────────────────┐
│ FIRE UNIT                  READY  EARMK  AVAIL           │
│ SAM_LR @ Spear Point         4      1      3   ⚠         │
│   ↳ "T-EAST-SAT-PRECISION · 0.62 · for SRBM ETA +6m"    │
│ SAM_MR @ Firewatch           8      0      8             │
│ VSHORAD @ Spear Point        4      0      4             │
│ AAA @ Spear Point          200      0    200             │
│ FIGHTER_BVR (Gripen pair)    7      0      7             │
└─────────────────────────────────────────────────────────┘
```

Hover on `⚠` shows the reserve rationale + the counterfactual ("if used now: predicted SAM_LR available at +6m = 0; expected leakers +1").

### 8.3 Map overlays (new `PredictedThreatLayer` + tweaks to existing layers)

For each predicted wave with `confidence ≥ 0.25`:

- **Predicted axis cone** drawn as a translucent shaded sector from the axis's origin (north coast intercept) to the predicted target asset, with width = `arrivalConeDeg`. Opacity = `0.10 + 0.40 × confidence`. Stroke is dashed.
- **Predicted impact area** drawn as a circle of radius 30 km around `predictedTargetAssetIds[0]`, same opacity scaling.
- Two simultaneous hypotheses → two cones, possibly overlapping. That is a *feature* (genuine ambiguity, see §4.6) — the layer just renders both.

For each fire unit currently in the reserve budget (`earmarked > 0`), the existing `RangeRingLayer` adds a dashed amber ring outside the regular range ring with the label `"reserved 1× for +6m"`.

For each `kind: "ALLOCATE"` recommendation (i.e., we're proposing engagement against a current hostile), the existing `EngagementLayer` draws a *ghost* line in the same style as proposed engagements, but pulsing, with a tooltip showing the recommendation reason.

### 8.4 Recommendation surfacing (extension of existing `AlertsPanel`)

The Alerts panel already handles `AUTHORIZE_NEEDED` etc. We add three sources of rows, sorted by `kind` priority `RESERVE > ALLOCATE > REPOSITION > CUE` then by confidence desc:

```
┌─ ALERTS / RECOMMENDATIONS ──────────────────────────────────┐
│ 🛡 RESERVE   1× SAM_LR @ Spear Point for SRBM +6m   0.62 ▸ │
│ 🎯 ALLOCATE  Use AAA on T07, not SAM_LR             0.62 ▸ │
│ 📡 CUE       Cue ESM to sector EAST                 0.62 ▸ │
│ 📡 CUE       Steer GlobalEye revisit (1300, 700)    0.62 ▸ │
│ 📡 CUE       Scramble Gripen for visual ID          0.62 ▸ │
└─────────────────────────────────────────────────────────────┘
```

Click `▸` opens the same Explain drawer as the Prediction panel. Each row carries the *counterfactual* as a smaller second line on hover.

### 8.5 Explain drawer (universal — opens from any of the above)

```
┌─ EXPLAIN: Eastern Saturation-then-Precision ─────────────┐
│ Confidence:  0.62      Similarity: 0.71      Prior: 0.18 │
│ ◇ Top features driving the match:                        │
│   EAST × LOW × DRONE × t0-30        live 0.55  tmpl 0.55 │
│   EAST × LOW × DRONE × t30-60       live 0.42  tmpl 0.40 │
│   EAST × VLOW × CM   × t30-60       live 0.28  tmpl 0.30 │
│ ◇ Rationale:                                             │
│   Cheap mass volley from Boreal Watch Post absorbs       │
│   SAM-MR magazine; Iskander follows. Historically the    │
│   cheap volley is a magazine-attrition tool.             │
│ ◇ Counterfactual:                                        │
│   If 4× SAM_LR used now → 0 SAM_LR at +6m → leakers +1.4 │
│ ◇ Falsify on:                                            │
│   No new EAST high-altitude detection within 4 min.      │
│ ◇ Audit log:                                             │
│   [view 3 entries since H-1.2-T-EAST-SAT-PRECISION]      │
└──────────────────────────────────────────────────────────┘
```

---

## 9. Demo storyboard (2.5 minutes, single scenario)

**Scenario file:** `data/scenarios/04-east-sat-precision-demo.json` — a single scripted run that contains both the cheap volley (wave 1, observed by the operator) and the Iskander follow-up (wave 2, observed by the operator only after the predictive system has had time to recommend the reserve).

**Spawn list (the file's `spawns` array, simTimeMin in minutes):**

```jsonc
[
  // ── Wave 1: Eastern saturation ─────────────────────────────────────
  // 8 small drones from Boreal Watch Post (1158, 385) toward Firewatch (1398, 1072)
  { "t": 1.0, "id": "T01", "class": "LOITERING_MUNITION",
    "fromKm": [1158, 385], "toKm": [1398, 1072], "speedMps": 50, "altitudeM": 250 },
  { "t": 1.05, "id": "T02", "class": "LOITERING_MUNITION",
    "fromKm": [1170, 385], "toKm": [1398, 1072], "speedMps": 50, "altitudeM": 250 },
  { "t": 1.1, "id": "T03", "class": "LOITERING_MUNITION",
    "fromKm": [1180, 385], "toKm": [1398, 1072], "speedMps": 50, "altitudeM": 220 },
  { "t": 1.15, "id": "T04", "class": "LOITERING_MUNITION",
    "fromKm": [1145, 385], "toKm": [1398, 1072], "speedMps": 50, "altitudeM": 240 },
  { "t": 1.2, "id": "T05", "class": "LOITERING_MUNITION",
    "fromKm": [1158, 380], "toKm": [1398, 1072], "speedMps": 50, "altitudeM": 230 },
  { "t": 1.25, "id": "T06", "class": "LOITERING_MUNITION",
    "fromKm": [1175, 380], "toKm": [1398, 1072], "speedMps": 50, "altitudeM": 270 },
  { "t": 1.5, "id": "T07", "class": "LOITERING_MUNITION",
    "fromKm": [1160, 385], "toKm": [1398, 1072], "speedMps": 50, "altitudeM": 200 },
  { "t": 1.6, "id": "T08", "class": "LOITERING_MUNITION",
    "fromKm": [1170, 385], "toKm": [1398, 1072], "speedMps": 50, "altitudeM": 200 },
  // optional 1-2 sea-skimmers at +30-60s to clinch the template signature
  { "t": 1.7, "id": "T09", "class": "CM_SUBSONIC",
    "fromKm": [1158, 385], "toKm": [1398, 1072], "speedMps": 240, "altitudeM": 60 },

  // ── Wave 2: Iskander toward Meridia ───────────────────────────────
  { "t": 6.5, "id": "T10", "class": "SRBM",
    "fromKm": [1158, 385], "toKm": [1225, 1208], "speedMps": 1800, "altitudeM": 30000 }
],
"events": [
  { "t": 0, "kind": "EMCON_AMBER" }
]
```

**Wall-clock walkthrough (we present at 4× sim speed, so 2.5 minutes wall = 10 minutes sim):**

| Wall t | Sim t | What the jury sees |
|---|---|---|
| 0:00 | 0.0 | Cold scene. Map of Boreal Passage, defended assets at Firewatch / Meridia / Spear Point lit. Resource panel: SAM_LR 4 / SAM_MR 8 / VSHORAD 4 / AAA 200 / Gripen pair. Prediction panel grey: *"No raid pattern matched. Current TEWA only."* |
| 0:15 | 1.0 | First three drones spawn from Boreal Watch Post. Track list lights red. **Prediction panel updates within one tick** — `T-EAST-SAT-PRECISION` jumps to confidence 0.41 (similarity 0.55, only `t0-30` features filled so far). Map: dashed cone toward Meridia + Firewatch impact circle appears. Resource panel: `SAM_LR earmarked 1`. |
| 0:30 | 2.0 | All eight drones + 1 sea-skimmer CM are inbound. Predictive confidence climbs to 0.62. AlertsPanel emits four rows: `RESERVE 1× SAM_LR`, `ALLOCATE AAA on T01–T08`, `CUE Cue ESM EAST`, `CUE Scramble Gripen for visual ID`. Operator clicks Authorize on the AAA proposals. |
| 0:45 | 3.0 | First drones intercepted by AAA at Firewatch. **Naive baseline toggle** (top-bar button "Replay naive"): jury watches a side-by-side ghost run where the same wave was met with 4× SAM_LR + 4× SAM_MR. In the ghost run, SAM_LR magazine = 0 by t=3.5. *(This is a pre-recorded mini-replay using the same scenario file with predictive disabled.)* |
| 1:15 | 5.0 | Drones cleared, no leakers. Prediction panel still highlights `T-EAST-SAT-PRECISION` at 0.62; map cone still drawn; reserve still `SAM_LR 1`. EMCON-amber state means we *did not* fire SAM_LR on the cheap targets. |
| 1:30 | 6.5 | **Iskander spawns.** Track T10 bright red, BALLISTIC class, climbing fast. AlertsPanel: `AUTHORIZE_NEEDED — engage T10 with SAM_LR @ Spear Point`. Operator one-clicks Authorize. SAM_LR fires. |
| 1:45 | 7.5 | Intercept resolution: SAM_LR HIT on T10. Meridia safe. AlertsPanel header updates: `templateStats[T-EAST-SAT-PRECISION] += 1`. Prediction panel header re-renders: *"Library: 8 templates · 15 historical matches"*. |
| 2:00 | 8.5 | After-action overlay: **Leakers: 0. Interceptor spend: $4.4M (vs ghost run $11.8M, 1 leaker). Predicted wave 2 arrived as expected: ✓.** |
| 2:30 | 10.0 | End. Closing line: *"Two minutes in, the system told the operator to hold the Patriot. Six minutes in, that Patriot killed the Iskander aimed at Meridia."* |

The "wow moment" is the side-by-side at wall t=0:45: the predictive run still has 4 SAM_LR ready while the ghost run's SAM_LR row is `0/0`. When the Iskander appears in the predictive run a minute later, the operator's authorize click *visibly succeeds*. In the ghost run, the same action produces a `NO_LR_AVAILABLE` red flash and the impact lights Meridia.

---

## 10. Build plan — Phase 4 sub-phases

Designed for two operators working sequentially across ~16–24 hours of effective hackathon time, on top of a working Phase 1–3 shell. Each sub-phase ends in a demo-able state — a snap-back point if the next sub-phase blows up.

### Phase 4a — Match the live raid, render the prediction (≈ 5–7 h)

Stop condition: with scenario 04 loaded, the Prediction panel populates within 30 s of sim start, the map draws the predicted cone, and the Resource panel shows `SAM_LR earmarked 1` driven by `T-EAST-SAT-PRECISION`. **No recommendations bias the existing TEWA yet.** No closing of the loop.

Tasks:
1. Extend `src/engine/types.ts` with all §5 types (1 h).
2. Add `predictive` slice to `store.ts` + selectors (0.5 h).
3. Author all 8 templates as JSON files under `data/raid-templates/` — bulk of work is filling signature vectors honestly (2 h).
4. `extractFeatures.ts` per §7.1 (1 h, with unit tests of the bucketing).
5. `match.ts` per §7.2 (0.5 h).
6. `recommend.ts` only the `RESERVE` branch (0.5 h).
7. `predictiveAllocation.ts` module wiring + tick hook (0.5 h).
8. `PredictionPanel.tsx` (1 h) and `PredictedThreatLayer.tsx` (1 h).
9. Resource panel reserve columns + reserve-ring on `RangeRingLayer` (0.5 h).

Checkpoint demo: scripted scenario plays, prediction renders, no behavior change to TEWA. **Already a shippable mini-demo.**

### Phase 4b — Bias the engagements + alerts/explain + closing the loop (≈ 5–7 h)

Stop condition: same scenario 04 plays end-to-end, the operator sees the `ALLOCATE` recommendation against using SAM_LR on the drone wave, sees the `CUE` rows in the Alerts panel, the Explain drawer renders the feature radar chart and counterfactual, and `templateStats.json` is updated on the disk after the run.

Tasks:
1. `recommend.ts` `ALLOCATE` and `CUE` branches per §7.3 (1 h).
2. TEWA scoring penalty for earmarked classes (0.5 h) — single line in the existing scorer; mark with `// Phase 4 reserve bias`.
3. `EngagementPanel.tsx` reserved badge + score impact line (0.5 h).
4. `AlertsPanel.tsx` recommendation rendering + sort (1 h).
5. Explain drawer (1.5 h — feature radar chart is the longest chunk; a simple SVG is fine).
6. `loop.ts` `updateAfterEvent` + `WAVE_WINDOW_EXPIRED` synthetic event (1 h).
7. Persist `templateStats.json` (0.5 h, plus localStorage fallback).

Checkpoint demo: full predictive vs. no-predictive comparison works on scenario 04.

### Phase 4c — Polish, ghost-replay, second scenario (≈ 3–5 h)

Stop condition: the demo storyboard from §9 plays smoothly at 4× speed; a second scenario (say `T-WEST-DECOY-CM`) demonstrates the system matches a different template; the system *honestly* says "NO_MATCH" when given a third scenario that doesn't fit the library (e.g., a vanilla single-fighter incursion).

Tasks:
1. Author `data/scenarios/05-west-decoy-cm-demo.json` and `data/scenarios/06-no-match-demo.json` (0.5 h each).
2. Build the ghost-replay toggle for the side-by-side: a top-bar button that re-runs the same scenario with `state.predictive.enabled = false` and overlays the result for the leakers/spend numbers (1.5 h).
3. After-action overlay (the "Leakers / Interceptor spend / Predicted wave arrived" panel at end-of-scenario) (1 h).
4. Anti-fortune-teller copy review — sweep all operator-visible strings, replace any "WILL" (0.5 h).
5. Determinism pass — fix random seed for the demo build, make sure clicking through the storyboard always produces the same numbers (0.5 h).

Phase 4c is the "demo robustness" sub-phase. If time runs short, drop the second/third scenarios; do NOT drop the determinism pass.

**Stretch (only after 4c is green):** Monte Carlo rollout for the counterfactual numbers in the Explain drawer (≈ 3 h). Replace the arithmetic counterfactual ("ready − wave1Demand = 0") with a real `k=20` rollout-based number. Don't start this until the rest is rock solid.

---

## 11. Risks & mitigations

| # | Risk | Mitigation |
|---|---|---|
| 1 | **Demo non-determinism.** Tracks spawn at slightly different sim-times across runs, similarity floats to 0.61 vs 0.62, the `RESERVE` row briefly shows `2` instead of `1`. Jury notices flicker. | Fix the scenario seed; freeze `simTimeMin` advance to integer multiples of `0.05`; debounce `RESERVE.amount` with a 2-tick hysteresis (only change if the new value persists for ≥ 2 ticks). |
| 2 | **Over-fitting to the demo scenario.** We tune the template until scenario 04 matches at 0.78 and the system looks brilliant — but a slightly perturbed scenario doesn't match at all. | Author one **perturbed** version of scenario 04 (`04b-east-sat-precision-jittered.json`) with ±20 % spawn time jitter and ±10° axis offset. Build target: predictive run still produces the right reserve recommendation. If not, weaken the template signature, don't strengthen the matcher. |
| 3 | **"Operator never trusts it" UX risk.** The system says 0.62 confidence and the operator quite reasonably ignores it because there's no story attached. | The Explain drawer (§8.5) is the single most important UI element — invest the time. The *narrative* ("based on 5 of 6 historical matches; cheap volley is a magazine-attrition tool") is what makes 0.62 feel like *intelligence*, not *guess*. |
| 4 | **Adversarial template gaming.** Real adversary could craft a wave that looks like one template and behaves like another. Hackathon-relevant version: jury asks *"what if the enemy spoofs your library?"* | Documented limitation. Honest answer in the demo Q&A: *"the library is a small, hand-authored aid; the operator can always override; we never auto-execute; per-engagement audit log lets us reconstruct any decision."* Pre-bake this answer; do not engineer a defense. |
| 5 | **MCTS / Monte Carlo stretch eats all the time.** | It is a stretch. Phase 4c does not depend on it. The counterfactual works without it (arithmetic from `ready − wave1Demand`). Only start after 4c is green. |
| 6 | **Integration drift with the existing shell.** Phase 4 module starts touching `tick.ts` in ways that break Phase 1–3 acceptance tests. | All Phase 4 changes to existing files are *additive* (per §4.8, no deletions, no renames). The Phase 1–3 acceptance criteria from `implementation-plan.md §9` must still pass after Phase 4 is merged — add this as a hard CI/manual check at the end of Phase 4a, 4b, and 4c. |
| 7 | **Template authoring becomes a content-creation rathole.** Eight templates × 324-element vectors × 4 predicted-wave fields × cheap-info actions × falsify lines is a lot of typing. | Build a *template authoring helper* CLI in 30 minutes that takes a sparse spec (`{ "EAST × LOW × DRONE × t0-30": 0.55, ... }`) and emits the full JSON. Time spent here repaid 5×. |
| 8 | **NO_MATCH state never appears in practice.** Because the demo scenarios all match a template, the jury never sees the "honest" failure mode and assumes we're hiding it. | Scenario 06 (`06-no-match-demo.json`) is intentionally a vanilla single-fighter probe that no template matches. Show it briefly during the demo Q&A, or at minimum in the recorded backup video. |
| 9 | **Reserve budget interferes with the operator's freedom.** Operator wants to use the SAM_LR right now and the soft penalty makes them hunt for the override. | The penalty is *soft* (`-w_reserve × earmarkedFraction`), the engagement is still proposable, and the override path is one click with the override logged. Do not turn the reserve into a hard constraint. |

---

## 12. Out of scope

We will explicitly **not** build:

- Real ML training of any kind (no LSTM, no transformer, no RL policy, no offline learning).
- Real radar simulation (Phase 1–3 already abstracts sensors away).
- Multi-operator collaboration / networked C2 (idea #14).
- Capability continuity forecaster's strategic 15–240 min horizon graph (idea #31).
- Fratricide guard, civil deconfliction, weather-aware scoring, ROE studio (ideas #1/#2/#5/#10) — composable later.
- 3D digital twin and terrain-following layer polygons (ideas #9/#18) — gorgeous but a rathole.
- Acoustic / passive-sensor mesh (ideas #6/#7) — separate input layer, not part of this module.
- LLM-generated rationales. Templated text only. (Idea #27 covers LLM narration as a *separate* opt-in feature.)
- Persistence beyond `templateStats.json`. No login, no users, no DB.
- Network protocols (Link 16 / NFFI / J-series). The data model is *shaped* like J-series tracks but we do not implement any wire format.
- Any non-deterministic visual effect that could flicker between demo runs.

---

## 13. Open questions for the user

Answers to these tighten the plan; the implementation agent should not start Phase 4 without them.

1. **Are the eight templates in §4.2 the right set, or do you want to swap one for a specific Saab-marketing scenario (e.g., a "Baltic-coast saturation" framing)?** Adding/removing a template is cheap *now*, expensive *after* Phase 4a.
2. **Is the demo storyboard in §9 the one you want to perform, or should the wow-moment scenario be a different template (e.g., the multi-axis feint, which is more visually dramatic but harder to read on a 1666 km × 1300 km map)?**
3. **Stretch goal priority: Monte Carlo counterfactual rollout, or a second pre-baked scenario (`T-WEST-DECOY-CM`) for jury Q&A?** Only one fits in the budget after 4c.
4. **Persistence: are you OK with `templateStats.json` written to disk, or do you want it in `localStorage` only?** Disk is more impressive (the system *learns across runs*) but adds a Node fs dependency.
5. **Do we need an explicit `OPERATOR_OVERRIDE` audit-log entry visible in the AlertsPanel during the demo (proves the human is in charge), or is the silent log entry enough?** Visible is more juror-friendly but costs ≈ 30 min of UI work.
6. **Reserve hysteresis: is a 2-tick (≈ 0.4 s) debounce on `RESERVE.amount` acceptable, or do you want the panel to update instantly even at the cost of brief flicker?** Hysteresis is the right operational choice; the flicker is the demo-aesthetic concern.

---

*End of plan. Implementation may begin once the questions in §13 have answers and the Phase 1–3 shell is on `main`.*
