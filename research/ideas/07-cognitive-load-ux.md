# Idea 07 — Cognitive-Load-Aware Operator UX

**Short description.** A C2 console that continuously measures the
operator's *current* cognitive load from cheap, non-invasive signals —
mouse / click latency, gaze proxy via cursor dwell, audio stress, time
per decision — and adaptively changes its own behavior: simplifies the
display, pre-commits to the top recommendation, promotes tasks to
peer operators, or escalates to HOTL mode for a pre-authorized class.
The system doesn't just assist the operator; it **notices** when the
operator is drowning.

---

## The problem

In every public review of modern air-defense operations under saturation
raids, the same finding recurs: **the operator, not the weapon or the
sensor, is the binding constraint**. Task counts in the hundreds per
minute; engagement windows of 5–15 seconds; perfect classification
required; and the fatigue curve is ugly after 30 minutes.

Most C2 systems respond to this by adding more information to the screen.
That is the opposite of what helps.

There is very solid HCI research ([Chalmers MSc thesis on AI-supported
adaptivity in C2](https://odr.chalmers.se/items/58de1e93-26a1-48af-b32b-5a8fada38e4f),
referenced in our C2 note) showing that **adaptive interfaces** — that
de-clutter, prioritize, and escalate automatically as load rises — are
one of the highest-leverage interventions available.

Meanwhile, cognitive-load *measurement* has become cheap:

- Click latency and error rate after a decision.
- Cursor dwell time and micro-movement jitter.
- Time-to-first-action after a new alert.
- Audio stress markers, if the operator is on voice.
- Heart-rate / breathing from a smartwatch, if issued (Swedish military
  and civil operators wear them).

---

## The idea in detail

Three layers:

### A. Load signals

A simple **load estimator** running locally, producing a 0–1 workload
score every few seconds from weighted signals:

- Decisions-per-minute over the last 60 s.
- Mean click latency (lower = faster response = lower load, up to a
  point; then cliff drops into panic range).
- Proportion of "Authorize without reviewing" clicks.
- Time since last mouse movement on the map.
- Alerts-unacknowledged queue length.
- *(Optional)* heart rate, voice stress from microphone.

### B. Adaptive UX policies

When load crosses thresholds the UI changes behavior:

- **Green → Yellow.** De-clutter map (hide neutrals, collapse routine
  friendlies). Enlarge the top-threat card. Pre-expand the top
  recommendation. Reduce audible notifications to only "new highest
  priority."
- **Yellow → Red.** Auto-stage the top recommendation for one-click
  authorization. Suggest handoff of lower-priority sectors to peer
  operators. Propose activating HOTL for a pre-authorized class (e.g.,
  drones in close-in belt). Switch the color palette from information-
  rich to decision-focused (fewer colors).
- **Red → Overload.** Explicit prompt: "Consider handoff or HOTL
  mode." The system does *not* take authority unilaterally; it
  surfaces the choice.

### C. Audit / debrief layer

Every adaptation is logged with the signal that caused it:

- "14:21:18 — switched to yellow (DPM 42, latency 1.4s)."
- "14:22:03 — prompted HOTL (DPM 71, 9 alerts unacknowledged)."

After-action: the operator sees their own curve. This is both a
training tool and a safety artifact — it documents that the system
offered help and the human made the authority choice.

---

## Why it's strong for this hackathon

- **Novel in the air-defense C2 space.** Cognitive-load-aware UX is
  mature in aviation (fighter cockpits, commercial autopilots) but
  very rarely seen in ground-based C2 product demos.
- **Directly maps to jury criteria.** "Does the solution help users
  succeed much better?" — explicitly, not abstractly, by adapting to
  the user's state.
- **Demonstrable with a simple trick.** During the demo, the presenter
  *deliberately* clicks faster and chases the mouse across the screen
  for 30 seconds. Load score rises, UI simplifies, HOTL prompt
  appears. The reviewer sees adaptation live. This is memorable.
- **Lines up with modern doctrine.** Air University and Saab both
  publish on human-machine teaming; citing those on stage is
  authentic, not buzzwordy.
- **Cheap to build.** All signals come from the browser's own event
  stream. No special hardware required for the prototype.

---

## Hard parts and risks

- **Calibration problem.** Load signals vary wildly per person. A
  per-operator baseline ("green") needs a short calibration phase.
  For the demo, script it.
- **Gaming the signal.** If the UI punishes fast clicks, operators
  will click fast to earn a de-clutter. This is why the signal
  must be a *vector*, not a single metric.
- **Patronizing UX.** Nothing ruins adaptive UX like "You seem
  stressed." tones. The system should act silently on low-stakes
  adaptations (de-clutter) and only *ask* on high-stakes ones (HOTL).
- **Privacy.** Biometric signals via watch/mic will raise eyebrows.
  Make them strictly opt-in and local-only; surface that clearly.

---

## Combos

- **+ Smart TEWA.** The pre-commit-top-recommendation behavior is a
  natural extension of the TEWA recommendation already in Part I.
- **+ Idea 13 in ideas.md (Multi-operator).** The handoff suggestion
  is meaningless without a peer to hand off to.
- **+ LLM narrator / auto-briefer (next file).** The narrator becomes
  *more verbose* in green and *tighter* in red.

---

## References

- [Chalmers MSc thesis — Visualizing AI-Supported Adaptivity in C2 Interfaces](https://odr.chalmers.se/items/58de1e93-26a1-48af-b32b-5a8fada38e4f)
- [Air University — Accelerating Decision-Making Through Human-Machine Teaming](https://www.airuniversity.af.edu/Wild-Blue-Yonder/Articles/Article-Display/Article/3816647/accelerating-decision-making-through-human-machine-teaming/)
- [../command-and-control.md §6.3 alerting and information overload](../command-and-control.md)
- NASA TLX (task-load index) — Wikipedia.
- Human-factors literature on "attention funneling" in fighter cockpits.
