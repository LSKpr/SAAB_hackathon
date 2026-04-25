# Idea 03 — Defensive Drone Swarm as an Effector

**Short description.** Treat a pool of small, cheap friendly interceptor
drones as a first-class **effector class** inside the C2 system, managed
by a swarm-coordination module. When a hostile swarm is detected, the
C2 assigns and coordinates friendly drones against it — drone-on-drone,
ramming or net-capture — at an order of magnitude lower cost per kill
than any SAM.

---

## The problem

The single most publicly-studied air-defense crisis right now is the
**cost-exchange** against Shahed-class loitering munitions and drone
swarms (see [../threats-and-effectors.md §1.2 T12/T13](../threats-and-effectors.md)).
Gepard is great; HPM is great; but both are **static point-defense**.
They protect the spot they're parked at.

A fleet of friendly interceptor drones is mobile, cheap per shot,
scales with swarm size, and — crucially — is unbundled from any fixed
site. Real-world products aimed exactly at this gap are already in
service or trials: Anduril **Roadrunner**, Saab's **Nimbrix**-style
counter-UAS concepts, Fortem **DroneHunter**, and Ukrainian
improvised FPV interceptors.

What is *missing* from most public discussions is the **C2 problem**:
how does a command system decide when to launch, how many, which
targets each drone takes, and when to recover?

---

## The idea in detail

Introduce a new effector type `SWARM` with:

- An **inventory** of N interceptor drones at M launch sites.
- Per-drone state: battery / fuel, position, armed / disarmed,
  in-flight / loitering / recovering.
- A **swarm controller** that receives a list of hostile tracks from
  the TEWA engine with assigned priority, and decides:
  - How many interceptors to launch now vs. hold in reserve.
  - Which drone chases which target (a dynamic assignment problem on
    top of Part I's TEWA — the drones move, the targets move).
  - When to recall an interceptor because the target is already dead or
    because a higher-priority target appeared.
- A **recovery / refuel loop** — drones that survive come home, recharge,
  re-arm, and re-enter the inventory.

On the operator UX:

- Each interceptor shows as an icon on the map, with a fuel bar.
- The **swarm box** shows current coverage: "26 of 40 drones ready, 8 in
  flight on TRK-47 cluster, 4 recharging."
- Authorization model: operator authorizes the *swarm response*, not
  each interceptor (clear HOTL candidate — close-in, short-lived,
  against a pre-authorized threat class).

Optional: a physics-light animation of the intercept (drone flies to
predicted-impact point, "kills" the track on contact).

---

## Why it's strong for this hackathon

- **Directly hits the cost-exchange narrative.** Jury loves this because
  the Shahed/swarm problem is explicitly called out in the kickoff
  material.
- **Visually irresistible.** Hostile red swarm comes in; friendly blue
  swarm launches and peels off one-to-one; the map turns into a
  shimmering choreographed intercept. This reads to a non-technical
  juror in 5 seconds.
- **Novel inside air-defense C2 prototypes.** Most public C2 systems
  treat SAMs and guns; few have a real "swarm controller" lane. This
  is where Saab is actively investing.
- **Composable.** It slots into Part I's TEWA engine as just another
  effector class with a different assignment/recall logic.
- **Publicly documented technology.** You can cite Anduril Roadrunner,
  Helsing / Saab Nimbrix concepts, and Ukrainian FPV interceptor
  doctrine on stage.

---

## Hard parts and risks

- **Dynamic assignment.** Drones and targets both move. A naive
  assignment done once at launch will misallocate mid-flight. Use a
  continuously-re-solved Hungarian or greedy assignment at 2–5 Hz.
- **Fratricide inside the swarm.** Two friendly drones converging on
  the same target; model this as a mutual-exclusion check in the
  assignment (Idea 01 applies inside the swarm too).
- **Comms model.** Real swarms suffer jamming and link loss. For the
  demo, model a simple "if comms lost, drone continues last command for
  T seconds then self-lands."
- **Don't drown the UI.** 40 drones + 40 hostiles = 80 icons. Cluster
  and summarize.

---

## Combos

- **+ Smart TEWA.** Drones are just another `EffectorClass`; the
  suitability matrix already has a "counter-UAS interceptor" slot.
- **+ Idea 01 (Fratricide guard).** Each interceptor's predicted
  intercept point is a friendly trajectory for the purposes of SAM
  engagements happening simultaneously.
- **+ Idea 04 (Track integrity / spoof detection).** Enemy spoofing of
  friendly drone feeds is a plausible attack surface; worth a mention.
- **+ Idea 06 (Acoustic sensor mesh).** Cheap distributed sensors feed
  cueing directly into the swarm controller for "hear-cue-kill" at
  minimum cost.

---

## References

- Anduril — [Roadrunner](https://www.anduril.com/hardware/roadrunner/)
- Fortem Technologies — [DroneHunter](https://fortemtech.com/products/dronehunter/)
- Saab / Nordic C-UAS trials — search public press for 2024–2026 items.
- [../threats-and-effectors.md §2.1 E11 dedicated C-UAS](../threats-and-effectors.md)
- [../threats-and-effectors.md §3 suitability matrix (swarm row)](../threats-and-effectors.md)
- JAPCC — [Counter-UAS Comprehensive Approach (PDF)](https://www.japcc.org/wp-content/uploads/A-Comprehensive-Approach-to-Countering-Unmanned-Aircraft-Systems.pdf)
