# Idea 13 — Pre-Staged Speculative Engagement Copilot

**Short description.** A background "speculator" that — while the
operator is authorizing engagement *N* — has already fully worked out
engagements *N+1*, *N+2*, *N+3* under multiple branching assumptions,
and has them **pre-warmed** as one-click cards. The operator never
thinks ahead alone. When engagement *N* is authorized the next card is
already on the screen with its rationale, ready to accept or override.

---

## Direct tie to the PDF

The kickoff's exact phrasing:
> *"Systemet måste inte bara lösa den omedelbara krisen – det ska tänka
> flera steg framåt."*
> — "The system must not only solve the immediate crisis — it must
> think several steps ahead."

Part I's TEWA already plans ahead internally; this idea makes the
"thinking several steps ahead" visible *to the operator* as a user-
facing UX, not as a hidden algorithm. It's the difference between
"we have MCTS" and "the operator feels 3× faster."

---

## The problem

Under saturation, the operator's decision rate is the system's true
bottleneck. Even when TEWA produces a correct recommendation
instantly, the human still has to:

1. See it.
2. Parse the rationale.
3. Cross-check on the map.
4. Authorize.

That cycle is 5–10 seconds per engagement. Ten threats in a wave =
up to 100 seconds of pure cognitive serialization, during which new
threats arrive.

What helps is not better algorithms — it's **pre-staging**: by the
time the operator finishes engagement *N*, engagement *N+1* isn't a
fresh problem, it's a *warm* one. The operator has already glanced at
it in peripheral vision for a few seconds, already has a hypothesis,
and the authorization click takes 1 s, not 7.

This is how fighter pilots use HOTAS. This is how air traffic control
sector handoffs work. C2 can and should import the pattern.

---

## The idea in detail

### A. The speculator

A background worker that:

- Watches the track store for every hostile track that isn't yet
  engaged.
- For the top *K* (say, 4) tracks by threat score, computes a full
  TEWA recommendation (with rationale, think-ahead rollout, safety
  checks, cost trace).
- Stores the result in a **warm queue** keyed by track id.
- Invalidates entries when the track updates materially, or when the
  inventory state changes enough to change the recommendation.

### B. The pre-stage rail

A thin vertical rail on the left of the recommendation panel. Each
card:

- Small APP-6 icon of the track + 2-word summary ("CM-cluster east").
- Pre-filled top recommendation ("IRIS-T × 1, Pk 0.81, 8 s").
- Color dot: green = pre-staged and valid, amber = staged but
  invalidated (inventory changed), grey = no feasible option.
- **Tab key** cycles through the rail so the operator can
  pre-authorize the next one while still looking at the current.

### C. Branching: "if you authorize A, I've already planned B"

Each pre-staged card carries a small **"if" branch**:

- "If you authorize engagement N on TRK-47 (IRIS-T), then engagement
  N+1 on TRK-49 uses Gepard (Pk 0.76)."
- "If you *decline* engagement N, the system recommends skipping
  TRK-49 entirely and holding the Gepard magazine for the predicted
  Wave 2."

The branch is produced by the same rollout engine already used for
think-ahead. The novelty is surfacing both branches to the operator so
that the choice on N is visibly a choice about N+1, N+2 too.

### D. Authorization semantics

- **Single-click authorize** on a pre-staged card fires it immediately.
- **Shift-click pre-authorize** queues the card to auto-fire when a
  trigger condition is met ("authorize only if Pk stays above 0.6 in
  the next tick").
- **"Review" button** expands the full rationale as in the normal
  recommendation panel; nothing is hidden.

---

## Why it's strong for this hackathon

- **Directly demos "think several steps ahead" as user experience**,
  not as a paragraph in a slide. Jurors don't have to trust that
  something clever is happening under the hood — they see four cards.
- **Visible OODA compression.** You can literally count clicks and
  seconds saved per engagement. Before/after numbers for the demo are
  easy to gather.
- **Cheap to add on top of Part I.** All infrastructure exists: TEWA
  engine, rollout simulator, rationale generator. The new piece is
  (1) an invalidation rule set and (2) a rail UI.
- **The "fighter-pilot cockpit" metaphor lands well.** Saab is the
  Gripen company. Pitching the C2 UX in HOTAS-like terms is on-brand.
- **It's a breakthrough solution structure (jury criterion).** Almost
  no public C2 prototype does speculative execution for the operator.
  The framing alone is novel.

---

## Hard parts and risks

- **Invalidation is subtle.** If the operator acts on a stale card,
  trust collapses. Be aggressive with invalidation; prefer showing
  amber/blank over stale green.
- **Information density.** Four pre-staged cards + the main
  recommendation panel is a lot. Use a compact card design with a
  single-line summary + deep-link to full rationale.
- **Don't pre-stage the wrong things.** If the top-*K* ranking is
  unstable (threat scores flicker between updates), cards will flap.
  Add hysteresis on the ranking used for pre-staging.
- **Prompt fear of automation bias.** Pre-staging is easy to
  misinterpret as "the system already decided." Name the feature
  clearly ("Pre-Staged — not Authorized") and keep the authorization
  click present every time.

---

## Combos

- **+ Smart TEWA (Part I).** Fully additive; the feature *is* the
  visible face of the think-ahead engine.
- **+ Idea 07 (Cognitive-load-aware UX, this folder).** Under high
  load, the copilot can pre-authorize engagements in a
  pre-authorized class and only ask for exceptions. Load-aware
  degrades the *authorize* step the same way this idea degrades
  the *decide* step.
- **+ Idea 08 (LLM narrator).** Narrator pre-reads the top card so
  the operator's ears hear the summary while their eyes are still
  on the map.
- **+ Idea 10 (ROE authoring studio).** Pre-authorization conditions
  on cards are literally rule expressions; the studio is how you
  define them.

---

## References

- [../../command-and-control.md §1.1 OODA in air defense](../../command-and-control.md)
- [../../command-and-control.md §3.5 "Thinking several steps ahead"](../../command-and-control.md)
- Human factors literature on "preview control" and decision
  pre-staging in aviation (NASA/FAA human-factors reports).
- AFCEA — [The Decision Advantage: Left of the Kill Chain](https://www.afcea.org/signal-media/cyber-edge/decision-advantage-left-kill-chain)
- [../../command-and-control.md §6.4 human-in vs human-on-the-loop](../../command-and-control.md)
