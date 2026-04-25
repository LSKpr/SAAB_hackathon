# Ideas Summary — 37 Ideas, Plain English

A flat list of every idea across [ideas.md](ideas.md) and the
[ideas/](ideas/) folder, renumbered 1–37 with a simple one-to-two
sentence description each. Use this as a quick overview; dive into
the detailed file for any idea that interests you.

---

1. **Smart TEWA** *(headline pick in [ideas.md](ideas.md))* — A decision
   panel that looks at the air picture and tells the operator exactly
   which weapon to fire at which threat, explains why, and shows what
   happens if they wait. Main job: stop expensive interceptors from
   being wasted on cheap drones.

2. **Attack-pattern allocation** *(your idea)* — Learn how the enemy
   has struck in the past so you can pre-position missiles, fighters,
   and reloads *before* the next raid instead of scrambling during it.

3. **Dispersion & basing optimizer** — Every evening, decide where
   mobile launchers and fighters should park tomorrow so no single
   missile wipes them all out.

4. **CAP + tanker scheduler** — Plan the next 24 hours of fighter
   patrols and air-to-air refueling so there's always a fighter
   nearby, without overworking crews.

5. **Readiness dashboard** — A single screen that tells you what's
   *really* ready right now (overheated radars, tired crews, low
   stocks) and when it'll be ready again.

6. **Multi-sensor optimizer** — Tells each radar where to look and
   when, so you see threats earliest while emitting as little as
   possible.

7. **Passive-first detection mesh** — Find incoming threats using only
   quiet sensors (heat, ESM, ADS-B, crowd-sourced audio) so your
   radars stay dark and survive.

8. **EMCON advisor** — Tells the operator "turn your radar on now" vs
   "stay quiet," with the trade-off spelled out.

9. **Intent inference** — After a few seconds of a track's motion,
   guess *which of your sites* it's aimed at (airbase? port? city?)
   so TEWA prioritizes correctly.

10. **Decoy screening** — Detect fake threats meant to waste your
    missiles, and engage them with cheap guns instead.

11. **Raid-template classifier** — When an attack starts, match its
    first seconds to known patterns to predict what's coming next
    ("expect 8–12 more drones in 5 minutes").

12. **Ask the RAP** — A chat box: "any unknowns heading for the port
    in 90 seconds?" — and it filters the map. AI for questions only,
    never for firing.

13. **Training simulator** — Practice environment where operators
    train and analysts compare strategies. The kickoff's "alternative
    task" reframed.

14. **Multi-operator C2** — Two or more operators share one picture
    and hand off targets cleanly, like air-traffic-control sector
    handoffs.

15. **Graceful-degradation re-planner** — When a radar is jammed or a
    launcher is hit, instantly re-plan coverage and show the operator
    what to move.

16. **Distributed edge-first C2** — Every defense site has its own
    brain; killing the headquarters doesn't kill the network.

17. **Cost-exchange war-gaming** — An offline tool for procurement:
    "€40M in Gepards beats €40M in Patriots against Shahed waves."
    Decision aid, not live.

18. **Deception effector planner** — Use fake CAPs, decoy emitters,
    and dummy launchers to make the enemy waste weapons on phantoms.

19. **Link-16 / JSON bridge** — A small translator so the prototype
    speaks the same data language as real NATO/Saab systems.

20. **Fratricide guard** *(ideas/01)* — A safety check run before every
    shot: are any friendlies, civilian airliners, or our own in-flight
    missiles in the blast zone? Block if yes. The anti-MH17 feature.

21. **Civilian airspace rapid-classify & deconfliction** *(ideas/02)* —
    Figure out fast which tracks are airliners (ADS-B, flight plans,
    routes) and ping civil ATC to reroute them before you open fire.

22. **Defensive drone swarm** *(ideas/03)* — A fleet of cheap friendly
    interceptor drones the C2 sends against hostile swarms. Cheap
    shooters for cheap threats.

23. **Track integrity / spoof detection** *(ideas/04)* — Score every
    track on "does this look real?" Flag ones that make impossible
    maneuvers, pop up from nowhere, or only show on one sensor — so
    you don't shoot ghosts.

24. **Weather-aware scoring** *(ideas/05)* — Adjust every engagement
    based on live weather. Lasers die in fog, radars lose range in
    heavy rain, fighters are grounded in icing — the numbers on
    screen reflect reality.

25. **Acoustic drone mesh** *(ideas/06)* — A cheap network of
    microphones (smartphones / Pis) that hears the distinctive Shahed
    engine noise and triangulates drones before radar sees them.
    Like Ukraine's Zvook.

26. **Cognitive-load-aware UX** *(ideas/07)* — The interface notices
    when the operator is overloaded (click rate, pending alerts) and
    simplifies the screen, pre-commits to the top answer, or suggests
    passing work to a peer.

27. **LLM battle narrator** *(ideas/08)* — An AI that narrates the
    battle in plain English and writes the after-action report. Never
    anywhere near the trigger.

28. **3D digital twin** *(ideas/09)* — A 3D terrain + city model so
    line-of-sight, terrain masking, and debris footprints are shown
    honestly in 3D instead of on a flat map.

29. **ROE authoring studio** *(ideas/10)* — Commanders write Rules of
    Engagement as formal rules, test them in simulation, and sign
    them. Every shot is traceable to the exact rule that allowed it.

30. **Multi-base scramble optimizer** *(ideas/11)* — Which pair of
    fighters, from which base, with which missiles? Answers that in
    seconds and plans who backfills the gap at the source base.

31. **Capability continuity forecaster** *(ideas/12)* — A graph that
    shows "how much defense will you have left in 15 min / 1 h / 4 h
    if this fight keeps going?" Red zones warn when you're about to
    run dry.

32. **Speculative engagement copilot** *(ideas/13)* — While you're
    authorizing shot #1, shots #2–4 are already pre-planned on the
    side as one-click cards. Compresses the operator's decision cycle.

33. **Flex planner** *(ideas/14)* — One button re-tasks an asset
    (Gripen CAP → SEAD, area SAM → point defense) and instantly shows
    all downstream effects: who backfills, what gap opens, which
    tanker moves.

34. **Doctrine evaluation simulator** *(ideas/15)* — The "alternative
    task" as a serious product. Feed in a strategy, it runs thousands
    of scenarios, outputs a report like "this policy loses 0.7 fewer
    cities at +11% missile spend." For procurement, not live
    operators.

35. **Multi-domain coast defense** *(ideas/16)* — One C2 that ties
    Navy (Saab 9LV), coastal missile batteries, Gripen, and ground
    SAMs together. Follow one cruise missile as it hands off across
    all four on its way to the coast.

36. **Gripen road-base scramble planner** *(ideas/17)* — Uniquely
    Swedish. Plan fighter operations from dispersed civilian road
    segments (Bas 90 doctrine): pre-stage fuel, crews, and munitions;
    pick which road launches from tonight based on weather and
    predicted threats.

37. **Dynamic layered-defense controller** *(ideas/18)* — Defense
    "rings" around each site are not static — they breathe. Shrink
    when missiles run low, expand on reload, shift when fog kills the
    laser. The operator shapes the *volume* of defense, not
    individual shots.
