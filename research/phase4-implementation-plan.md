# Phase 4 — Implementation Plan (with AI Integration)

> **Delta on top of [`predictive-allocation-plan.md`](predictive-allocation-plan.md).** That document is the contract — read it first. This file specifies *how* to build it, where the teammate's external **AI API** plugs in, and the exact build order for the implementation agent.
>
> Read order before coding:
> 1. [`implementation-plan.md`](implementation-plan.md) — Phase 1–3 shell that's already shipped.
> 2. [`predictive-allocation-plan.md`](predictive-allocation-plan.md) — *what* we're building.
> 3. **This file** — *how* and *with the AI API*.

---

## 1. What changed: AI now does the prediction

The original plan uses a local **cosine-similarity + Bayesian** matcher over hand-authored templates. We are now upgrading that into a **two-tier predictor**:

```
                                         ┌──────────────────────┐
                                         │  AI API (teammate)   │
                                         │  POST /predict       │
                                         └──────────▲───────────┘
                                                    │ JSON
                                                    │ (debounced,
                                                    │  cancellable)
┌──────────────────────────────────────────────┐    │
│  features = extractFeatures(tracks, simT)    │────┘
│           ▼                                  │
│  ┌──────── tier A (always on) ────────┐      │
│  │ localMatcher (cosine + Bayes)      │──┐   │
│  └────────────────────────────────────┘  │   │
│                                          ▼   ▼
│                       hypotheses[]  ←  merge(localResult, aiResult)
│                              │
│                              ▼
│                       recommend.ts → store.predictive
└──────────────────────────────────────────────┘
```

**Tier A (local):** runs every tick, sub-millisecond, deterministic. Drives the UI immediately and survives network failure.

**Tier B (AI):** called on a debounce when the feature vector changes meaningfully. When it returns, its hypotheses **replace** the local ones (or augment, see §5.4). When it errors / times out / disabled, the UI keeps showing the local result and a small `🤖 offline` badge.

This gives us four wins:

1. We can build, test, and demo today even if the API isn't ready (mock server, see §6).
2. The demo never freezes on a slow network call.
3. Determinism for jury reruns is preserved by a `predictive.aiMode = "off" | "shadow" | "primary"` toggle in the top bar.
4. The UI / store / panels from `predictive-allocation-plan.md` stay unchanged — they consume `RaidHypothesis[]` regardless of source.

---

## 2. AI API contract (what the teammate must implement)

This is the **only interface** between our frontend and the teammate's model. Lock this early.

### 2.1 Endpoint

```
POST  ${VITE_AI_API_URL}/predict
Headers:
  Content-Type: application/json
  X-Request-Id: <uuid>    (we set; they echo for traceability)
  Authorization: Bearer <token>   (optional, see §11)
```

### 2.2 Request body

```ts
interface PredictRequest {
  schemaVersion: "1.0";
  simTimeMin: number;                  // current sim time, e.g. 2.4
  raidStartedAtMin: number | null;     // null if no hostile detected yet
  theater: {
    name: "boreal-passage";
    /** Friendly defended assets, deduced from CSV. */
    defendedAssets: Array<{
      id: string; name: string; posKm: { x: number; y: number };
      kind: "air_base" | "capital" | "major_city";
    }>;
  };
  /** All hostile (and SUSPECT) tracks observed in the last 90 s. */
  tracks: Array<{
    id: string;
    classId: string;                   // e.g. "DRONE_SWARM", "CM_SUBSONIC"
    posKm: { x: number; y: number };
    velocityKmPerMin: { vx: number; vy: number };
    altitudeM: number;
    classification: "HOSTILE" | "SUSPECT" | "UNKNOWN";
    confidence: number;                // 0..1
    firstSeenT: number;                // sim minutes
  }>;
  /** Optional: lets the model condition on past behavior across runs. */
  history?: {
    pastRaidIds: string[];
    templateStats: Record<string, {
      matched: number;
      predictedWaveActuallyArrived: number;
      predictedWaveDidNotArrive: number;
    }>;
  };
  /** The 8 raid templates from §4.2 of predictive-allocation-plan.md.
   * Keeps the model and our local matcher reading the same template library. */
  templates: RaidTemplate[];
}
```

### 2.3 Response body

```ts
interface PredictResponse {
  schemaVersion: "1.0";
  /** Echo of X-Request-Id. */
  requestId: string;
  /** Server-side compute time in ms (for observability). */
  computeMs: number;
  /** Top-K hypotheses, sorted desc by confidence. */
  hypotheses: Array<{
    /** MUST be one of the input template IDs, OR the literal "NO_MATCH". */
    templateId: string;
    similarity: number;       // 0..1 (model's notion of fit)
    confidence: number;       // 0..1, normalized over hypotheses + NO_MATCH
    /** Already-projected predicted waves with absolute ETA windows. */
    predictedWaves: Array<{
      label: string;
      etaMinRange: [number, number];
      expectedClasses: string[];
      expectedCount: [number, number];
      axis: "WEST" | "CENTRAL" | "EAST";
      arrivalConeDeg: number;
      predictedTargetAssetIds: string[];
      recommendedCounter: Record<string, number>;  // EffectorClassId → count
    }>;
    /** Top-5 features driving the match (for the Explain drawer). */
    topFeatures: Array<{
      featureLabel: string;
      live: number;
      template: number;
      contribution: number;
    }>;
    /** Optional natural-language rationale (≤ 200 chars). */
    rationale?: string;
  }>;
  /** Optional natural-language description of the raid state. ≤ 300 chars. */
  raidNarrative?: string;
}
```

### 2.4 Error contract

- HTTP 4xx/5xx → frontend logs + falls back to local result.
- Body-shape mismatch → same.
- Latency budget: **median ≤ 400 ms, p99 ≤ 1500 ms**. We hard-abort at 2000 ms and fall back.
- The frontend ALWAYS sends a `X-Request-Id`; the API ALWAYS echoes it. We use it to correlate with the audit log.

### 2.5 Mock contract

We ship a mock implementation at `tools/mock-ai-server/` (see §6) that exposes the same endpoint, returns deterministic responses keyed off the request payload, and injects configurable latency (default 250 ms). The implementation agent develops against the mock until the teammate's real API is reachable.

---

## 3. New + modified files (delta to the original plan §4.8)

The file list from `predictive-allocation-plan.md §4.8` stands. **Add** these for the AI integration:

**New files:**
- `src/engine/predictive/aiClient.ts` — `predict()` HTTP client with timeout, abort, retry-once policy.
- `src/engine/predictive/merge.ts` — `mergeHypotheses(localResult, aiResult, mode) → RaidHypothesis[]`.
- `src/engine/predictive/featuresShared.ts` — extracted from `features.ts`; shared shape used by both local matcher and AI request builder.
- `src/engine/predictive/circuitBreaker.ts` — opens after 3 consecutive failures, half-opens after 30 s.
- `src/components/Panels/AiStatusBadge.tsx` — small pill in the top-bar (`🤖 primary 218ms` / `🤖 shadow` / `🤖 offline`).
- `tools/mock-ai-server/server.mjs` — Node http server that mimics the API contract; deterministic responses keyed on request hash.
- `tools/mock-ai-server/fixtures/*.json` — canned responses per scenario.
- `.env.local.example` — documents `VITE_AI_API_URL`, `VITE_AI_API_TOKEN`, `VITE_AI_MODE`.

**Modified files (additive, no behavior change to existing tests):**
- `src/engine/types.ts` — extend `RaidHypothesis` with `source: "local" | "ai" | "merged"` and `aiRequestId?: string`.
- `src/engine/store.ts` — add `predictive.aiStatus = { mode, lastLatencyMs, circuitOpen, lastErrorAtT }`.
- `src/engine/predictive/predictiveAllocation.ts` — orchestrates the two tiers per §4 below.
- `src/components/Panels/PredictionPanel.tsx` — render `source` chip on each hypothesis row + the optional `raidNarrative` string.
- `src/components/Panels/TopBar.tsx` — mount `AiStatusBadge` and the `aiMode` toggle (off/shadow/primary).

---

## 4. Orchestration logic (`predictiveAllocation.ts`)

Pseudocode for the per-tick loop. This replaces step 7 of the original plan's Phase 4a task list.

```ts
const AI_DEBOUNCE_MIN = 0.10;   // call AI at most every ~6 sim-seconds at 1× speed
const AI_TIMEOUT_MS   = 2000;
const SIG_DELTA       = 0.05;   // re-call AI only if feature vector moved ≥ this much

export async function runPredictiveAllocation(state, dt) {
  // Tier A — always run.
  const features = extractFeatures(state.tracks, state.simTimeMin, state.predictive.raidStartedAtT);
  const localHypotheses = matchTemplates(features, state.predictive.priors, state.simTimeMin)
    .map(h => ({ ...h, source: "local" as const }));

  // Decide if we need an AI call this tick.
  const sig = signature(features.counts);
  const shouldCallAI =
    state.predictive.aiMode !== "off" &&
    !state.predictive.aiStatus.circuitOpen &&
    state.simTimeMin - state.predictive.aiLastCallT >= AI_DEBOUNCE_MIN &&
    cosineDistance(sig, state.predictive.aiLastSig) >= SIG_DELTA &&
    features.totalCount > 0;

  if (shouldCallAI) {
    // Fire-and-forget; never block the tick. The promise resolution mutates the store.
    void callAiAndMerge(state, features);
  }

  // Use whichever AI hypotheses are still fresh (≤ 6 sim-seconds old).
  const aiFresh = state.predictive.aiHypotheses.filter(h =>
    state.simTimeMin - h.generatedAtT <= 0.10);

  const merged = mergeHypotheses(localHypotheses, aiFresh, state.predictive.aiMode);

  // Downstream steps (recommend + reserve budget) consume `merged`.
  state.predictive.hypotheses = merged;
  state.predictive.recommendations = recommendActions(
    merged, state.fireUnits, state.assets, state.simTimeMin
  );
  state.predictive.reserveBudget = computeReserveBudget(
    merged, state.fireUnits, state.simTimeMin
  );
}

async function callAiAndMerge(state, features) {
  const reqId = crypto.randomUUID();
  state.predictive.aiLastCallT = state.simTimeMin;
  state.predictive.aiLastSig   = signature(features.counts);
  const t0 = performance.now();
  try {
    const resp = await aiClient.predict(buildPayload(state, features), {
      timeoutMs: AI_TIMEOUT_MS, requestId: reqId,
    });
    const aiH = resp.hypotheses.map(toRaidHypothesis); // source = "ai"
    state.predictive.aiHypotheses = aiH;
    state.predictive.aiNarrative  = resp.raidNarrative;
    state.predictive.aiStatus = {
      mode: state.predictive.aiMode,
      lastLatencyMs: Math.round(performance.now() - t0),
      circuitOpen: false,
      lastErrorAtT: undefined,
    };
    circuitBreaker.recordSuccess();
  } catch (e) {
    circuitBreaker.recordFailure();
    state.predictive.aiStatus = {
      ...state.predictive.aiStatus,
      lastErrorAtT: state.simTimeMin,
      circuitOpen: circuitBreaker.isOpen(),
    };
    // local result already in `state.predictive.hypotheses`; nothing else to do.
  }
}
```

### 4.1 Three modes

| `aiMode` | Behavior |
|---|---|
| `off` | Never call the API. UI shows local result only; badge shows `🤖 off`. Useful for pure-local determinism reruns. |
| `shadow` | Call the API but **always render the local result**. AI hypotheses logged to event log + visible in dev panel only. Used for early integration testing without disturbing the demo. |
| `primary` | Default during the demo. AI result replaces local (subject to the merge rules). Local stays as fallback. |

The toggle lives in the top bar next to the clock.

### 4.2 Merge rules (`merge.ts`)

```ts
function mergeHypotheses(local, ai, mode) {
  if (mode === "off")    return local;
  if (mode === "shadow") return local;
  if (ai.length === 0)   return local;     // AI offline / circuit open
  // mode = "primary": take AI; if AI says NO_MATCH but local has > 0.30 confidence,
  // surface local as a "secondary opinion" row (small, source="local").
  const result = ai;
  const aiTopConf = ai[0]?.confidence ?? 0;
  const localTop  = local[0];
  if (aiTopConf < 0.20 && localTop && localTop.confidence > 0.30) {
    result.push({ ...localTop, source: "merged",
                  reasonText: "AI: NO_MATCH; local matcher disagrees" });
  }
  return result.slice(0, 3);
}
```

This means the local matcher is never silenced — it's at least the second opinion when the AI is uncertain.

---

## 5. Mock AI server (build first, before the teammate's API exists)

We must NOT block on the teammate. The implementation agent builds a Node mock that satisfies the contract in §2 and ships it under `tools/mock-ai-server/`. Run with `npm run mock-ai`.

### 5.1 Behavior

- Listens on `http://localhost:8787/predict`.
- Reads `tools/mock-ai-server/fixtures/*.json` at startup.
- For each request: hashes the input feature vector → key → finds the closest fixture by cosine similarity → returns it with realistic latency (configurable env `MOCK_AI_LATENCY_MS`, default 250 ms ± 80 ms jitter).
- One fixture per demo scenario:
  - `04-east-sat-precision.fixture.json` — strong match on `T-EAST-SAT-PRECISION`.
  - `05-west-decoy-cm.fixture.json` — strong match on `T-WEST-DECOY-CM`.
  - `06-no-match.fixture.json` — returns `[{ templateId: "NO_MATCH", confidence: 1.0 }]`.
- Includes a `?fail=timeout|http500|garbage` query for failure-mode testing.
- `MOCK_AI_NARRATIVES=true` adds the optional `raidNarrative` strings to test the panel rendering.

### 5.2 Why this matters

Once the teammate's API is up, swapping is one env-variable change:

```
# .env.local
VITE_AI_API_URL=http://localhost:8787   # mock during dev
# VITE_AI_API_URL=https://teammate-api.example.com   # uncomment when ready
```

No code changes.

---

## 6. Build sub-phases (replaces original plan §10)

Designed for one implementation agent + roughly 18–24 hours, starting from the Phase 1–3 shell.

### Phase 4a — Local matcher + UI scaffolding + mock AI (≈ 6–8 h)

Stop condition: scenario `04-east-sat-precision-demo.json` plays; the Prediction panel populates from the **local** matcher within 30 s of sim start; reserve budget shows `SAM_LR earmarked 1`; the mock AI server runs and the AI badge cycles through `off → shadow → primary` from the top bar.

Tasks (in order):
1. Extend `src/engine/types.ts` with all §5 types from `predictive-allocation-plan.md` plus the `source`, `aiRequestId`, `aiStatus` additions from §3 of this file.
2. Add `predictive` slice to `store.ts` with selectors.
3. Build the **template authoring CLI** (`tools/author-template.mjs`) per `predictive-allocation-plan.md §11 risk #7` — sparse-spec → 324-float JSON. Saves hours.
4. Author all 8 templates as JSON files under `data/raid-templates/` using the CLI.
5. Implement `extractFeatures.ts`, `match.ts`, `recommend.ts` (RESERVE branch only).
6. Implement `predictiveAllocation.ts` orchestrator with **AI calls stubbed off** (`aiMode = "off"` hardcoded for now).
7. Wire `predictiveAllocation.ts` into `tick.ts`.
8. Build `PredictionPanel.tsx` and `PredictedThreatLayer.tsx`.
9. Extend `ResourcePanel.tsx` with reserve columns and `RangeRingLayer.tsx` with the dashed amber reserve ring.
10. Author `data/scenarios/04-east-sat-precision-demo.json` per `predictive-allocation-plan.md §9`.
11. Build `tools/mock-ai-server/` with the three fixtures from §5.1. Add `npm run mock-ai` script.
12. Implement `aiClient.ts`, `merge.ts`, `circuitBreaker.ts` and the `aiMode` toggle in `TopBar.tsx`. Validate against the mock by flipping the toggle.

**Acceptance for 4a:**
- Scenario 04 plays; prediction panel shows `T-EAST-SAT-PRECISION` ≥ 0.55 confidence within 60 s of raid start.
- `aiMode = "off"`: no network calls, panel works.
- `aiMode = "shadow"` against mock: network calls happen on debounce, panel still renders **local** result, dev panel shows AI result.
- `aiMode = "primary"` against mock: panel renders AI hypotheses tagged `🤖 ai`. Local appears as fallback when fixture returns `NO_MATCH`.
- Mock timeouts and HTTP 500s do NOT crash the UI; circuit-breaker opens after 3 fails.
- Phase 1–3 acceptance criteria from `implementation-plan.md §9` still pass.

### Phase 4b — Bias TEWA + Alerts + Explain + closing the loop (≈ 5–7 h)

Stop condition: full operator flow — recommendation rows in AlertsPanel, reserved-badge in EngagementPanel, Explain drawer with feature radar chart and counterfactual, `templateStats.json` updated after each engagement.

Tasks:
1. `recommend.ts` `ALLOCATE` and `CUE` branches.
2. TEWA scoring penalty (single line; mark with `// Phase 4 reserve bias`).
3. `EngagementPanel.tsx` reserved badge + score-impact line.
4. `AlertsPanel.tsx` recommendation rows + sort + click-through.
5. Explain drawer (radar chart is the heaviest chunk; a plain SVG is fine).
6. `loop.ts` `updateAfterEvent` + `WAVE_WINDOW_EXPIRED` synthetic event.
7. Persist `templateStats.json`. Use disk if running with the Vite dev server has access (via a lightweight Node helper in the mock-ai-server, exposed at `POST /persist-stats`). Otherwise fall back to `localStorage` and surface that in the UI footer.
8. Hook `aiRequestId` into the audit log on every `PREDICTION_RECOMMENDATION` event so we can trace any recommendation back to the AI call that produced it.

**Acceptance for 4b:**
- ALLOCATE recommendation appears against using `SAM_LR` on cheap drones in scenario 04.
- Explain drawer renders both local-source and AI-source hypotheses identically (UI is source-agnostic).
- `templateStats.json` count for `T-EAST-SAT-PRECISION` increments by 1 per successful demo run.
- Audit log entries include `aiRequestId` when source = ai.

### Phase 4c — Polish, ghost-replay, second + NO_MATCH scenario, determinism (≈ 4–5 h)

Tasks:
1. Author `data/scenarios/05-west-decoy-cm-demo.json` and `06-no-match-demo.json`.
2. Ghost-replay top-bar button: re-runs scenario 04 with `predictive.enabled = false` and `aiMode = "off"`, overlays leakers/spend numbers.
3. After-action overlay (Leakers / Spend / Predicted-wave-arrived) at end-of-scenario.
4. Anti-fortune-teller copy review — sweep all operator-visible strings, replace any "WILL".
5. Determinism pass — fix scenario seed; freeze `simTimeMin` advance to integer multiples of `0.05`; debounce `RESERVE.amount` with 2-tick hysteresis.
6. **AI-mode determinism:** for the recorded demo, build the demo with `aiMode = "off"` so the live demo cannot fail due to network. Record a separate `aiMode = "primary"` run as backup video.

**Acceptance for 4c:**
- Demo storyboard from `predictive-allocation-plan.md §9` plays smoothly at 4× sim speed in `aiMode = "off"`.
- Same storyboard plays in `aiMode = "primary"` with the mock AI; AI badge shows green latency under 400 ms.
- Scenario 06 visibly says `"No raid pattern matched"` in the Prediction panel.
- Phase 1–3 + 4a + 4b acceptance still passes.

### Stretch (only after 4c green): Real API smoke test (≈ 2 h)

Pointed at the teammate's real endpoint. Test path:
1. Set `VITE_AI_API_URL` to teammate's URL.
2. Run scenario 04 end-to-end.
3. Compare AI hypotheses against mock fixture; if they substantially disagree, debug with the teammate using `X-Request-Id` correlation.
4. If acceptable: switch the live-demo build to `aiMode = "primary"` against the real API, **with the mock AI server still running** as a hot-swap fallback (set `VITE_AI_API_URL_FALLBACK=http://localhost:8787`).

---

## 7. Configuration / env vars

`.env.local` (gitignored, with `.env.local.example` committed):

```dotenv
VITE_AI_API_URL=http://localhost:8787      # mock by default
VITE_AI_API_URL_FALLBACK=                  # optional secondary endpoint
VITE_AI_API_TOKEN=                         # if/when teammate adds auth
VITE_AI_MODE=off                           # off | shadow | primary; user can flip in UI
VITE_AI_DEBOUNCE_SIM_MIN=0.10
VITE_AI_TIMEOUT_MS=2000
```

Top-bar UI toggle overrides `VITE_AI_MODE` per-run.

---

## 8. Determinism and demo safety

The demo must NEVER hang on a network call. Hard rules:

1. The live demo runs by default with `aiMode = "off"` *unless the operator deliberately flips it*. The local matcher alone produces the storyboard's wow moment.
2. `aiMode = "primary"` is a *bonus* run we present second, only if the API behaves under presentation conditions.
3. The mock AI server is bundled with the project and runs locally. If the teammate's real API breaks during the demo, we toggle `VITE_AI_API_URL` back to the mock without recompile (use `localStorage` override).
4. No AI hypothesis ever blocks rendering. Tier A always produces an immediate result.
5. Replays of `templateStats.json` updates are committed as scenario fixtures so a re-run from a clean stats file produces identical numbers.

---

## 9. Observability (built into the mock and real path identically)

Every `predict()` call produces an event-log entry:

```json
{ "t": 2.4, "kind": "AI_PREDICT_CALL",
  "payload": { "requestId": "...", "latencyMs": 218, "ok": true,
               "topTemplateId": "T-EAST-SAT-PRECISION", "topConfidence": 0.62 } }
```

Every recommendation links its `hypothesisId` to this entry via `aiRequestId`. After-action panel can show: *"This run made 14 AI calls, median 220 ms, 1 timeout. 4 recommendations were AI-driven, 1 was local-fallback."*

The teammate gets the request log offline if they want to compare their model's predictions against operator outcomes.

---

## 10. Open questions

### For the AI teammate (lock before they finish)

1. **Endpoint URL + auth** — final URL? Token in header or query? CORS configured for `http://localhost:5173`?
2. **Schema version** — agreed `1.0`?
3. **Latency target** — can they hit median ≤ 400 ms? If not, we increase the debounce.
4. **Determinism mode** — does the API support a `seed` field for reproducible jury reruns? If yes, add `seed: number` to the request.
5. **NO_MATCH handling** — confirm they will return `templateId: "NO_MATCH"` rather than empty `hypotheses[]` when nothing fits.
6. **Template echoing** — are they OK consuming our 8 templates verbatim, or do they want to pre-train on a different schema and we just send them tracks? (If the latter, drop `request.templates` and adjust §2.2.)
7. **Streaming** — do we need SSE/WebSocket later, or is request/response sufficient for the hackathon? (Default: request/response.)

### For the user (you)

1. **AI role.** This plan assumes the teammate's model is the **predictor** (returns `hypotheses[]`). Is that right, or is the model doing something different (e.g., narrative generation only, threat classification only, recommendations only)? If different, we adjust §2.3 — let me know before Phase 4a starts.
2. **All six open questions from `predictive-allocation-plan.md §13` are still open** (template set, demo storyboard, stretch goal, persistence, override audit, hysteresis). Recommended quick answers: keep templates as-is, scenario 04 is the wow, stretch = second pre-baked scenario over Monte Carlo, disk persistence with localStorage fallback, visible OPERATOR_OVERRIDE, 2-tick hysteresis. Confirm or override.
3. **Live-demo mode** — `aiMode = "off"` by default in the recorded demo, with `aiMode = "primary"` as a "and here's the AI version" follow-up segment? (Recommended.)

---

## 11. Risks specific to AI integration (additive to original §11)

| # | Risk | Mitigation |
|---|------|------------|
| A | Teammate's API is late or unreachable on demo day. | Mock AI server bundled; demo plays with `aiMode = "off"` by default; toggle is a one-click UI switch. |
| B | API returns out-of-schema data, crashing the panel. | Strict response validation in `aiClient.ts` (zod or hand-rolled). On validation fail: fall back to local + log + surface `🤖 schema-error` badge. |
| C | API is slow and the demo stutters. | Hard 2 s timeout, abort signal, fire-and-forget call pattern (never blocks tick). |
| D | AI confidently disagrees with local matcher in front of jury. | This is acceptable — the merge rules (§4.2) surface both. UI explicitly shows `🤖 ai` vs `local`. Pre-bake the answer: *"the AI is our smart predictor; the local matcher is a fast deterministic check; we surface both for transparency."* |
| E | Network call leaks PII / reveals our scenario in dev logs. | Hackathon prototype only. Document but do not engineer around. |
| F | Determinism breaks because of AI's stochastic output. | Live demo runs `aiMode = "off"`; jury reruns are local-only. The `aiMode = "primary"` run is a *demo*, not a *test*. |
| G | Two predictors confuse the operator. | Only one row per (templateId) shown; merge rules pick the higher-confidence source; small `🤖`/`local` chip is the only visible difference. |

---

## 12. Acceptance criteria for the implementation agent's final handoff

A sign-off checklist the implementation agent must run:

1. ✅ All Phase 1–3 acceptance criteria in `implementation-plan.md §9` still pass.
2. ✅ All Phase 4a / 4b / 4c stop conditions in §6 of this file pass.
3. ✅ With `aiMode = "off"`: scenario 04 produces the wow moment from `predictive-allocation-plan.md §9`.
4. ✅ With `aiMode = "primary"` against mock AI: same scenario, AI badge green, replaces local hypotheses, latency ≤ 400 ms median.
5. ✅ With mock AI killed mid-run: UI keeps working, badge flips to `🤖 offline`, local hypotheses rendered.
6. ✅ Scenario 06 (`NO_MATCH`) renders the honest grey row with both local and AI agreeing.
7. ✅ `templateStats.json` updates persist between runs.
8. ✅ Audit log lets us trace any recommendation back to its `hypothesisId` and (if AI-sourced) `aiRequestId`.
9. ✅ `npm run build` passes with zero TS errors. `npm run test` passes. `npm run mock-ai` starts cleanly.
10. ✅ `README.md` documents the AI-mode toggle, the mock server, and the env vars.

---

## 13. Out of scope (additive to original §12)

- Real model training or fine-tuning.
- WebSocket / SSE streaming.
- Auth beyond a single bearer token in `.env.local`.
- Caching beyond the per-tick debounce (no Redis, no service worker).
- Cross-user request batching.
- Anything that would prevent `aiMode = "off"` from producing the full demo.
