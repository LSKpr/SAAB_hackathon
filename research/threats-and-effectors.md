# Air Threats and Effectors: Research Note for the Saab Hackathon Decision-Support Prototype

> Purpose: a practical, developer-facing reference for modelling threats, effectors, and threat-to-effector matching in a real-time command-and-control (C2) prototype. Numbers are order-of-magnitude, open-source estimates unless otherwise stated. Do **not** treat any figure below as authoritative targeting data.

---

## 1. Threat Taxonomy

### 1.1 Quick reference table

| # | Threat class | Typical speed | Typical altitude | RCS (order of magnitude, m²) | Range / reach | Maneuverability | What makes it hard |
|---|---|---|---|---|---|---|---|
| T1 | 4th-gen fighter (Su-30/35, F-16, Rafale) | Mach 1.5–2 dash, Mach 0.8–0.9 cruise | 0–15 km | 1–10 | Combat radius 500–1500 km | High (7–9 g) | Speed + standoff weapons |
| T2 | 5th-gen / stealth fighter (F-35, Su-57, J-20) | Mach 1.5–1.8 | 0–15 km | 0.0001–0.01 (frontal) | 1000+ km | High + low observability | Very low RCS, sensor fusion, EW |
| T3 | Strategic / tactical bomber (B-1B, Tu-95, Tu-160, H-6) | Mach 0.8 cruise (Tu-160 Mach 2 dash) | 10–15 km | 10–100 (B-52 ≈100) | Intercontinental; carries standoff ALCMs | Low | Usually stays outside SAM rings and launches ALCMs |
| T4 | Combat helicopter (Mi-28, Ka-52, AH-64) | 250–350 km/h | NOE 10–100 m typical | 3–10 | 200–500 km | Very high at low altitude | Terrain masking, pop-up attacks |
| T5 | Subsonic cruise missile (Tomahawk, Kh-101) | Mach 0.6–0.8 | 30–100 m (tree-top) | 0.05–1 | 1500–5500 km | Low but route-programmable | Low-altitude terrain following, small RCS |
| T6 | Supersonic / terminal-supersonic CM (3M-54 Kalibr, BrahMos) | Mach 2.5–3 terminal | Sea-skim to ~100 m terminal | 0.1–0.5 | 300–2500 km | Medium | Short engagement window in terminal |
| T7 | Short-range ballistic missile (Iskander-M, KN-23, ATACMS-class) | Mach 6–7 | Apogee ~50 km, quasi-ballistic | ~0.1 (RV) | 300–500 km | Quasi-ballistic, up to 20–30 g | Speed + maneuver in terminal phase |
| T8 | MRBM (No-Dong, DF-21) | Mach 8–10 | Apogee 100–300 km | Small RV | 1000–3000 km | Low (pure ballistic) or MaRV | Very high speed, exo-atmospheric |
| T9 | Hypersonic glide vehicle (Avangard, DF-ZF) | Mach 5–20 | 20–60 km (glide) | Small | 1000s km | High, unpredictable | Low-trajectory + maneuver, detection gap |
| T10 | Hypersonic cruise missile (Zircon, HAWC) | Mach 5–8 | 20–30 km | Small | ~500–1000 km | Medium | Sustained hypersonic, air-breathing |
| T11 | MALE/HALE UAV (MQ-9, Bayraktar Akinci, Heron) | 150–450 km/h | 5–15 km | 0.5–5 | 1000+ km, 24+ h | Low | Persistent ISR + standoff strike |
| T12 | Small tactical drone / loitering munition (Shahed-136, Lancet, quad-copter) | 100–200 km/h (Shahed); 110–300 km/h (Lancet) | 50–4000 m | 0.01–0.1 | Shahed ~2000 km; Lancet ~40 km | Low–medium | Small RCS, low/slow, cheap, mass-produced |
| T13 | Drone swarm | Same as T12 | Same as T12 | Individually tiny | Per-drone, but coordinated | Distributed | Saturation, cost exchange, decision overload |
| T14 | Standoff weapons / glide bombs (JASSM, Storm Shadow, JDAM-ER, UMPK) | Mach 0.6–0.9 | Released at 5–12 km, glides down | 0.05–0.5 | 40–1000 km | Low (glide) | Released beyond SAM range of the shooter |
| T15 | Anti-radiation missiles (AGM-88, Kh-31P) | Mach 2–4 | Release altitude → terminal low | ~0.1 | 50–300 km | Medium | Targets the defender's radar directly |

Sources for the table: [Wikipedia – Radar cross section](https://en.wikipedia.org/wiki/Radar_cross_section), [GlobalSecurity – RCS table](https://www.globalsecurity.org/military/world/stealth-aircraft-rcs.htm), [MIT Lincoln Lab – Target RCS (PDF)](https://www.ll.mit.edu/sites/default/files/outreach/doc/2018-07/lecture%204.pdf), [SIPRI – Hypersonic missile systems](https://www.sipri.org/commentary/topical-backgrounder/2022/matter-speed-understanding-hypersonic-missile-systems), [CRS – Hypersonic Weapons R45811](https://www.congress.gov/crs-product/R45811), [CSIS – Kh-101/102](https://missilethreat.csis.org/missile/kh-101-kh-102/), [CSIS – 9K720 Iskander](https://missilethreat.csis.org/missile/ss-26-2/), [Wikipedia – 9K720 Iskander](https://en.wikipedia.org/wiki/9K720_Iskander), [Wikipedia – HESA Shahed-136](https://en.wikipedia.org/wiki/HESA_Shahed_136), [Wikipedia – ZALA Lancet](https://en.wikipedia.org/wiki/ZALA_Lancet), [Wikipedia – Cruise missile](https://en.wikipedia.org/wiki/Cruise_missile).

### 1.2 Notes per class

- **T1/T2 Combat aircraft.** The real threat is usually *what they carry*: ALCMs, ARMs, glide bombs, AAMs. 5th-gen fighters' frontal RCS is commonly quoted at 0.0001–0.005 m² — detection ranges can drop by ~70–80 % vs a conventional fighter [GlobalSecurity RCS table](https://www.globalsecurity.org/military/world/stealth-aircraft-rcs.htm).
- **T3 Bombers.** Usually defeated at the weapon, not the platform. They launch standoff weapons (T5, T14) from outside the defender's SAM umbrella.
- **T4 Helicopters.** Fly nap-of-the-earth. Radar horizon and clutter are the challenge. Pop-up exposure times can be 3–10 s.
- **T5/T6 Cruise missiles.** Fly at "tree-top" altitudes (typically 30–70 m) to stay below radar horizon until very late. Supersonic terminal variants (Kalibr 3M-54, BrahMos) compress the engagement window to a few seconds [Wikipedia – Cruise missile](https://en.wikipedia.org/wiki/Cruise_missile), [FAS/NAIC – Land Attack CMs](https://irp.fas.org/threat/missile/naic/part07.htm).
- **T7/T8 Ballistic missiles.** Iskander-M is quasi-ballistic — maneuvers throughout flight, pulls 20–30 g, apogee ≈50 km, Mach 6–7, range 400–500 km [Wikipedia – 9K720 Iskander](https://en.wikipedia.org/wiki/9K720_Iskander). Only a few systems (Patriot PAC-3, SAMP/T Aster 30, THAAD, Arrow) can reliably engage them.
- **T9/T10 Hypersonics.** Fly lower than ballistic missiles and remain below terrestrial radar horizon until late; HGVs can change targets en route [GAO – Hypersonic weapons](https://www.gao.gov/products/gao-19-705sp), [SIPRI](https://www.sipri.org/commentary/topical-backgrounder/2022/matter-speed-understanding-hypersonic-missile-systems). Terminal speeds often drop below Mach 5 due to drag, opening a late interception window.
- **T11 MALE/HALE UAVs.** Big enough to see and relatively slow — the issue is deciding *whether* to spend an expensive SAM on them.
- **T12 Loitering munitions / OWA drones.** Shahed-136: ~185 km/h, ~2000–2500 km range, ~40 kg warhead, unit cost often cited $20–50 k (Iranian) or $30–80 k (Russian Geran-2) [Wikipedia – HESA Shahed-136](https://en.wikipedia.org/wiki/HESA_Shahed_136), [phenomenalworld.org – Cost of a Shahed](https://www.phenomenalworld.org/analysis/cost-of-a-shahed/). Lancet: ~110 km/h cruise / 300 km/h dive, 40 km range, ~$35 k [Wikipedia – ZALA Lancet](https://en.wikipedia.org/wiki/ZALA_Lancet). The central problem is **cost exchange**, not lethality per se.
- **T13 Drone swarms.** The threat model is saturation + decision overload + magazine depletion. Increasingly viewed as the killer use-case for HPM and RF-DEW [National Defense – Counter-Drone "killer app"](https://www.nationaldefensemagazine.org/articles/2026/1/20/counterdrone-mission-seen-as-killer-app-for-directed-energy).
- **T14 Glide bombs (UMPK, JDAM-ER, SPICE, Storm Shadow in low mode).** Low RCS, low-to-medium speed, no propulsion signature, released from 40–100+ km outside the SAM ring. Hard because the *shooter* has already gone home.
- **T15 ARMs.** Force the defender to radar-silent tactics; relevant to C2 logic (emit vs. survive).

### 1.3 Low-observable / stealth considerations (cross-cutting)

- RCS is highly frequency- and aspect-dependent. A VHF surveillance radar sees a "stealth" fighter much better than an X-band fire-control radar [Wikipedia – Radar cross section](https://en.wikipedia.org/wiki/Radar_cross_section).
- Side/rear aspects typically have much higher RCS than frontal — tactics (e.g., bistatic/multistatic nets, passive sensors like IRST) matter more than raw SAM range.
- For the prototype it's reasonable to treat "detection range" as a function of `(radar_band, rcs, aspect, weather)` rather than a fixed per-threat number.

---

## 2. Effector Taxonomy

### 2.1 Quick reference table

| # | Effector class | Reference system(s) | Engagement range | Engagement altitude | Reaction time | Magazine depth (per fire unit) | Cost/shot (order) | Best against | Worst against |
|---|---|---|---|---|---|---|---|---|---|
| E1 | Long-range SAM (BMD-capable) | Patriot PAC-3 MSE, SAMP/T (Aster 30), S-400 | 40–400 km (varies by missile) | up to 25–36 km | Seconds once cued | 16–48 rounds | $2–5 M (PAC-3 MSE ≈ $4 M) | T1–T3, T5–T8, some T9/T10 terminal | T12 (cost), T13 (magazine) |
| E2 | Medium-range SAM | IRIS-T SLM, NASAMS (AIM-120), SPYDER-MR | 25–50 km | up to ~20 km | Seconds | 8–24 rounds | €0.5–2 M per missile | T1, T5, T11, T14 | T7/T9 (kinematics), T12 (cost) |
| E3 | Short-range SAM (SHORAD) | IRIS-T SLS, Tor-M2, Crotale, RBS 98 | 10–25 km | up to 10 km | Seconds | 8–16 rounds | ~€0.4–0.6 M | T5, T11, T12 (at the right price), T4 | T7/T9, T2 at distance |
| E4 | VSHORAD / MANPADS | RBS 70 NG (Bolide), FIM-92 Stinger, Mistral | 6–9 km (RBS 70 NG Bolide >9 km); Stinger ~8 km | 0–5 km (RBS 70 NG); up to 3.8 km (Stinger) | 5–10 s | 4–8 tubes per station | RBS 70 Bolide and Stinger ~$0.1–0.5 M | T4, T11, T12, low CM | T7–T10 |
| E5 | AAA / C-RAM gun | Gepard 35 mm, Phalanx C-RAM 20 mm, Skyshield | 1–4 km effective | 0–3 km | <1 s | 100s–1000s of rounds | $ tens per round | T12 (drones), small CM, mortars, last-ditch | T1–T3, T7–T10 |
| E6 | Fighter with BVR AAM | JAS 39 Gripen + Meteor; F-35/F-22 + AIM-120/AIM-260 | Meteor >100 km "no-escape zone" large | 0–20 km | Minutes (scramble) to seconds (CAP) | 4–7 AAMs per sortie | Meteor ~$2–3 M | T1–T5 (including CM/drones at distance), T11 | T7–T10, T12 swarms (cost) |
| E7 | Fighter with WVR AAM / gun | Gripen + IRIS-T WVR; any fighter with Sidewinder | ~25 km IRIS-T, gun <1 km | 0–15 km | Same as E6 | 2–4 WVR + gun | ~$0.4–1 M | T1 merge, T4, T11, T12 | T7–T10 |
| E8 | Electronic warfare / jamming / GNSS denial | Stand-off jammers, ground EW, Gripen EW suite | Varies (bubble tens of km) | Any | Continuous | Unlimited "shots" | Operating cost only | T5, T11, T12, T13, T14 (GPS-dependent) | Anything with INS-only, fiber-optic link, or ARM response |
| E9 | Directed energy – HEL (laser) | Iron Beam, DragonFire | 1–10 km today | 0–2 km | Seconds (dwell) | Limited by power, generator | ~$1–10 per shot | T12, T4 sensors, T14 at close range | Weather-limited; T1–T3; T7–T10 |
| E10 | Directed energy – HPM / RF-DEW | Epirus Leonidas, RapidDestroyer, THOR | 0.5–2 km (near), larger beamwidth | 0–1 km | Instantaneous | Limited by power | ~cents per shot | T13 swarms, T12 | Hardened electronics, fiber/wired control, bluffed beam footprint |
| E11 | Counter-UAS specific (nets, spoof, RF takeover, drone-vs-drone) | Anti-Drone guns, Dronebuster, interceptor drones | 0.1–5 km | Very low | Seconds | Variable | $10s–$10k per shot | T12 commercial quad, low-end T13 | Shahed-class OWA, anything INS-only |
| E12 | Passive measures (decoys, dispersion, hardening, camouflage) | Inflatable decoys, dispersed basing, HAS | N/A | N/A | Pre-emplaced | N/A | Mostly CapEx | Reduces *impact* of any threat | Doesn't stop anything by itself |

Sources: [Norsk luftvern – IRIS-T SL cost/perf](https://norskluftvern.com/2026/03/14/iris-t-sl-air-defense-system-cost-analysis-and-performance-comparison/), [Norsk luftvern – EU vs US missile defense costs](https://norskluftvern.com/2025/07/28/american-vs-european-missile-defense-critical-cost-analysis-of-gbi-sm-3-sm-6-thaad-pac-3-amraam-aster-30-and-iris-t/), [MDAA – Missile Interceptors by Cost](https://www.missiledefenseadvocacy.org/missile-defense-systems/missile-interceptors-by-cost/), [Saab – RBS 70 NG](https://www.saab.com/products/rbs-70-ng), [Army-Technology – RBS 70 NG](https://www.army-technology.com/projects/rbs-70-ng-very-short-range-air-defence-vshorad-system/), [Wikipedia – FIM-92 Stinger](https://en.wikipedia.org/wiki/FIM-92_Stinger), [Saab – Gripen E](https://www.saab.com/products/gripen-e-series), [Wikipedia – Meteor (missile)](https://en.wikipedia.org/wiki/Meteor_(missile)), [Army.mil – C-RAM](https://www.army.mil/article/78724/c_ram_transforms_defense_tactics), [drone-warfare.com – Counter-UAS kinetic](https://drone-warfare.com/counter-uas/drone-defeat/), [JAPCC – A Comprehensive Approach to Countering UAS (PDF)](https://www.japcc.org/wp-content/uploads/A-Comprehensive-Approach-to-Countering-Unmanned-Aircraft-Systems.pdf), [National Defense – Counter-Drone DEW](https://www.nationaldefensemagazine.org/articles/2026/1/20/counterdrone-mission-seen-as-killer-app-for-directed-energy), [Wikipedia – RapidDestroyer](https://en.wikipedia.org/wiki/RapidDestroyer).

### 2.2 Notes per effector

- **E1 Long-range SAM.**
  - Patriot PAC-3 MSE: ~60 km vs aircraft, up to ~36 km altitude, hit-to-kill, unit cost ~$3.7–4.7 M [Norsk luftvern – EU vs US](https://norskluftvern.com/2025/07/28/american-vs-european-missile-defense-critical-cost-analysis-of-gbi-sm-3-sm-6-thaad-pac-3-amraam-aster-30-and-iris-t/).
  - SAMP/T (Aster 30): >100 km vs aircraft, ~$2 M [Norsk luftvern](https://norskluftvern.com/2025/07/28/american-vs-european-missile-defense-critical-cost-analysis-of-gbi-sm-3-sm-6-thaad-pac-3-amraam-aster-30-and-iris-t/).
  - S-400 40N6 family is quoted out to 400 km but against large/non-maneuvering targets only — open-source numbers are advertising.
- **E2 Medium-range SAM.**
  - IRIS-T SLM: ~40 km range, ~20 km altitude, €1–4.4 M per missile depending on accounting [Norsk luftvern – IRIS-T SL](https://norskluftvern.com/2026/03/14/iris-t-sl-air-defense-system-cost-analysis-and-performance-comparison/).
  - NASAMS uses surface-launched AMRAAMs — typical engagement 25–40 km.
- **E3 Short-range SAM.**
  - IRIS-T SLS: ~12 km / ~8 km altitude, ~€0.43–0.56 M [Norsk luftvern](https://norskluftvern.com/2026/03/14/iris-t-sl-air-defense-system-cost-analysis-and-performance-comparison/).
- **E4 VSHORAD.**
  - RBS 70 NG with Bolide: >9 km range, 0–5 km altitude, Mach 2, **laser beam-riding (unjammable)**, 1.1 kg combined shaped-charge/fragmentation warhead, deploy in 30–45 s, reload <5–6 s, auto-tracking sight — explicitly multi-target: fixed-wing, helicopters, cruise missiles, UAVs [Saab – RBS 70 NG](https://www.saab.com/products/rbs-70-ng), [Army-Technology – RBS 70 NG](https://www.army-technology.com/projects/rbs-70-ng-very-short-range-air-defence-vshorad-system/).
  - Laser beam-riding is a big deal in a C2 model: it is essentially immune to RF jamming and IR-decoys in the conventional sense.
  - Stinger FIM-92: ~8 km range, ~3.8 km altitude, Mach 2.2, passive IR/UV homing [Wikipedia – FIM-92 Stinger](https://en.wikipedia.org/wiki/FIM-92_Stinger).
- **E5 AAA / C-RAM.**
  - Gepard 35 mm has been the single most effective Shahed killer in Ukraine — cheap per round, high rate of fire, works at low altitude [drone-warfare.com](https://drone-warfare.com/counter-uas/drone-defeat/).
  - Phalanx-based land C-RAM handles mortars/rockets/drones in the 1–2 km final layer [Army.mil – C-RAM](https://www.army.mil/article/78724/c_ram_transforms_defense_tactics).
- **E6/E7 Fighter.**
  - Gripen E: 10 hard-points, up to 7× Meteor BVR + 2× IRIS-T WVR + 27 mm BK-27. Meteor is ramjet-powered with a large "no-escape zone" [Saab – Gripen E](https://www.saab.com/products/gripen-e-series), [Wikipedia – Meteor](https://en.wikipedia.org/wiki/Meteor_(missile)).
  - Fighters give you **elasticity** that SAMs don't: they can reposition, re-cue, visually ID, and return to base to rearm. But they have long reaction time if cold on the ground (scramble = minutes).
- **E8 EW / jamming / GNSS denial.**
  - Effective against GPS/GLONASS-dependent weapons (many cruise missiles, most loitering munitions, glide-bomb kits like UMPK/JDAM).
  - Less effective against INS-only, terrain-matching, fiber-optic-controlled, or IR/optical terminal-guided threats [drone-warfare.com – EW defeat](https://drone-warfare.com/counter-uas/electronic-warfare/).
- **E9 High-energy laser.**
  - Per-shot cost near-zero electricity; limited by beam dwell time, weather (rain/fog/haze), and one-target-at-a-time nature.
  - Realistic today against T12 small drones, sensors, some rockets/mortars in the 1–5 km ring.
- **E10 HPM / RF-DEW.**
  - Wide-beam, can disable multiple drones in one burst — the designed counter to T13 swarms. Fratricide risk to friendly electronics inside the beam [National Defense](https://www.nationaldefensemagazine.org/articles/2026/1/20/counterdrone-mission-seen-as-killer-app-for-directed-energy), [Wikipedia – RapidDestroyer](https://en.wikipedia.org/wiki/RapidDestroyer).
- **E11 Dedicated C-UAS kit.**
  - RF takeover and jam/spoof only work while the drone is actually using RF/GNSS. Against Shahed-class INS+GPS-denied weapons these tools are of limited value; they still matter for commercial quads in rear-area protection.
- **E12 Passive measures.**
  - Dispersion, hardening, decoys and camouflage don't kill anything but multiply the attacker's magazine requirement, buying time for active systems.

---

## 3. Threat-to-Effector Suitability Matrix

Cell format: **rating** — short reason. Ratings: **Excellent**, **Good**, **OK**, **Poor**, **N/A**.

| Threat ↓ / Effector → | E1 LR-SAM | E2 MR-SAM | E3 SR-SAM | E4 VSHORAD | E5 AAA/C-RAM | E6 Fighter BVR | E7 Fighter WVR | E8 EW / GNSS deny | E9 Laser | E10 HPM | E11 Dedicated C-UAS | E12 Passive |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| T1 4th-gen fighter | **Excellent** — designed target | **Good** — inside envelope | OK — only if close | Poor — too fast/high | Poor — out of reach | **Excellent** — beyond-visual-range kill | Good — if merged | OK — degrades kill chain, not kinematic | Poor | Poor | N/A | OK — decoys/HAS |
| T2 5th-gen stealth | OK — detection-limited | Poor — likely outside detect | Poor | Poor | Poor | OK — needs fused/passive cue | OK — merge only | OK — may blind its datalinks | Poor | Poor | N/A | Good — decoys/dispersion help a lot |
| T3 Bomber | **Excellent** — if it enters ring | Good | Poor | Poor | Poor | **Excellent** — intercept far forward, kill archer before arrow | Poor | OK | Poor | Poor | N/A | OK |
| T4 Helicopter | Poor — masked, low | OK | Good — in open | **Excellent** — designed for it (RBS 70, Stinger) | Good — in LoS | Good | **Excellent** — gun/WVR | Poor | OK | Poor | OK |
| T5 Subsonic cruise missile | Good — if detected early | **Excellent** — core target set | **Excellent** | Good — terminal | Good — close-in | **Excellent** — Meteor/AIM-120 hunt | Good — if vectored | Good — GPS-dependent variants | OK | OK | N/A | OK — hardening |
| T6 Supersonic CM | OK — very short window | OK | Poor | Poor | Poor | Good — forward intercept | Poor | OK | Poor | Poor | N/A | OK |
| T7 SRBM (Iskander-class) | **Excellent** (PAC-3, Aster 30) | Poor — wrong kinematics | Poor | N/A | N/A | N/A | N/A | OK — spoof GNSS terminal | N/A | N/A | N/A | Good — hardening matters |
| T8 MRBM | Excellent (BMD-only, e.g. PAC-3, THAAD, Aster 30 limited) | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Good |
| T9 HGV | Poor — below radar until late; PAC-3 MSE / SM-6 terminal-only | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | OK |
| T10 Hypersonic CM | Poor — limited terminal options | N/A | N/A | N/A | N/A | N/A | N/A | Poor | N/A | N/A | N/A | OK |
| T11 MALE/HALE UAV | OK — possible but wasteful $ | **Excellent** — right cost/range | Good | OK — if low enough | Poor | **Excellent** — cheap kill per AAM for big drone | Good | Good — often satellite-cued | Poor | Poor | Poor | N/A |
| T12 Loitering munition / small drone | Poor — cost exchange disaster | OK — if nothing else | Good (IRIS-T SLS has worked in UA) | **Excellent** — RBS 70 NG and Stinger documented effective | **Excellent** — Gepard/C-RAM is the cost-right answer | Good — gun passes work, AAM is overkill | **Excellent** — gun kill | **Excellent** — GNSS denial degrades Shahed significantly | **Excellent** — if weather/LOS good | **Excellent** — single Shahed | **Excellent** — RF takeover / net | Good — decoys work |
| T13 Drone swarm | Poor — magazine collapse | Poor — magazine | Poor | Poor — magazine | Good — but rate-limited | Poor — AAM count too low | OK — gun passes | Good — if RF/GNSS-dependent | OK — one-at-a-time | **Excellent** — wide beam, many drones/shot | Good — scales poorly | Good |
| T14 Standoff/glide bomb | OK — if long-range enough to reach release | **Excellent** — right size target | Good | OK | Poor | **Excellent** — kill launcher before release | Good | Good — GNSS-dependent kits (UMPK, JDAM) | Poor | Poor | N/A | Good — hardening |
| T15 Anti-radiation missile | OK — but radar may be off | OK | Poor | Poor | Poor | OK | Poor | **Excellent** — emcon / decoy emitters | OK | Poor | N/A | Good — decoy emitters |

**How to read this in code:** treat each cell as a `(threatClassId, effectorClassId) → { rating, rationale, modifiers[] }` entry. Runtime scoring should then adjust by: current range to threat, current altitude, remaining magazine, effector status (up / reloading / masked), cost exchange policy, and ROE.

---

## 4. Key Decision Factors for the Operator (and the recommender)

The prototype should score each candidate engagement on a vector of these factors and let the operator see the trade-off, not just a single answer.

### 4.1 Probability of kill (Pk)
- Pk is joint: `Pk_system = Pdetect * Ptrack * Pengage * Pintercept * Pkill_warhead`.
- Open-source Pk numbers are unreliable. For the prototype, model Pk per `(effector, threat)` pair as a base value modified by (range, aspect, EW environment, weather, salvo size).
- Salvo logic: `Pk_salvo = 1 - (1 - Pk_single)^n`. Doctrine is usually "shoot-look-shoot" (fire one, wait, fire again if miss) versus "shoot-shoot-look" (fire two immediately). The second costs 2× the missile but buys kill probability and compresses timeline.

### 4.2 Cost exchange ratio
- Hard rule: don't spend more defending than the attacker spent attacking, **unless** the defended asset is worth much more than the missile.
- Canonical bad trade: $4 M PAC-3 on a $30 k Shahed.
- Canonical good trade: $4 M PAC-3 on a $10 M+ bomber, critical C2 node, or ballistic missile aimed at a city.
- The prototype should carry `cost_per_shot` on effectors and `estimated_unit_cost` on threats, and should carry `protected_asset_value` on the zone / target the threat is heading for. A rational score is something like `utility = P(kill) * V(asset) - cost_per_shot`.

### 4.3 Time-to-intercept vs time-to-impact
- Compute `T_impact = distance_to_defended_asset / threat_speed`.
- Compute `T_intercept = fly-out_time(effector, engagement_range)`.
- Feasible engagement requires `T_intercept + sensor_to_shooter_latency < T_impact - safety_margin`.
- For low-flying, terminal-supersonic or hypersonic threats, the feasible window is sometimes < 10 s — this is the decision-support system's reason to exist.

### 4.4 Magazine and reload
- Each fire unit has a finite ready magazine (e.g., Patriot: 16 missiles on a typical battery; NASAMS: 6 launchers × 6 missiles; RBS 70 NG: one shot at a time then reload in seconds).
- Reload times range from seconds (VSHORAD) to hours (heavy SAM reload from transport-loader).
- The prototype must track `magazine_remaining` and `reload_in_progress_until` per fire unit and degrade recommendations accordingly.

### 4.5 Layered defense logic
Design target for a recommender: prefer **kill as far out as possible**, but with the cheapest effector whose Pk is "good enough".

| Layer | Distance | Typical effector | Role |
|---|---|---|---|
| Outer | 50–400 km | E1 LR-SAM, E6 fighter BVR | Kill bombers, high-value UAVs, CM before they release / arrive |
| Medium | 15–50 km | E2 MR-SAM, E6/E7 fighter | Kill cruise missiles, MALE, glide weapons in flight |
| Inner | 3–15 km | E3 SR-SAM, E4 VSHORAD | Last-chance engagement, cover gaps / leakers |
| Close-in | 0–3 km | E5 AAA / C-RAM, E9 laser, E10 HPM, E11 C-UAS | Cheap point defense, swarms, leakers |

See [EOS DS – Layered approach](http://www.eosdsusa.com/news/layered-approach-the-future-of-air-defence-global-defence-technology-reports/), [Army.mil – C-RAM](https://www.army.mil/article/78724/c_ram_transforms_defense_tactics).

### 4.6 Collateral damage / debris footprint
- Warhead kg, fuzing mode, altitude of intercept → debris circle on the ground.
- Over urban areas, short-fuzed / high-altitude intercepts are preferred; gun rounds that don't self-destruct are problematic.
- The prototype should flag engagements whose predicted debris area overlaps civilian zones on the map.

### 4.7 Saturation / simultaneous engagements
- Real attacks are rarely one missile. Drone+CM+ballistic "cocktails" are designed to saturate.
- Constraints to model:
  - Max *simultaneous* engagements per fire unit (radar channels, illuminator count).
  - Max tracks in fire-control per sensor.
  - Sensor field of view (a radar facing west can't engage from the east).
- Saturation drives the value of HPM/laser (rate-of-fire and unit-cost favorable) and fighter CAP (elastic capacity).

### 4.8 Sensor-to-shooter latency
- Total latency = sensor detect + track forming + classification + identification (IFF, library) + C2 decision + crypto/link + launcher slew + missile launch.
- Each step matters for T6, T7, T9, T10 where seconds count.
- The prototype should carry per-sensor and per-link latency numbers and sum them into the feasibility check (4.3).

---

## 5. Sweden-specific Context

Sweden is a geographically large country (≈ 1,600 km north–south), long Baltic coastline, and forward exposure to the Baltic approach. Doctrine emphasises **dispersed basing**, **mobile short-range systems**, and **networked C2** over a few monolithic SAM sites. Key Saab / Swedish building blocks:

| System | Class | Role in the prototype's catalog |
|---|---|---|
| RBS 70 NG (Bolide) | E4 VSHORAD | Dispersed point/area defense, multi-target including drones, laser beam-riding ⇒ jam-resistant. [Saab](https://www.saab.com/products/rbs-70-ng) |
| RBS 90 | E4 VSHORAD (shelter-mounted, 2× tubes, integrated radar) | Heavier VSHORAD, less exposed operator |
| RBS 98 / IRIS-T SLS | E3 SR-SAM | Swedish name for the IRIS-T SLS fit — ~12 km / 8 km. [Norsk luftvern](https://norskluftvern.com/2026/03/14/iris-t-sl-air-defense-system-cost-analysis-and-performance-comparison/) |
| IRIS-T SLM (in service / on order) | E2 MR-SAM | ~40 km / ~20 km. [Norsk luftvern](https://norskluftvern.com/2026/03/14/iris-t-sl-air-defense-system-cost-analysis-and-performance-comparison/) |
| Patriot ("Eldenhet 103") | E1 LR-SAM | Swedish Patriot batteries with PAC-3 for high-value / ballistic. |
| JAS 39 Gripen C/D/E | E6/E7 Fighter | 10 hard-points on E, Meteor (BVR) + IRIS-T (WVR) + BK-27; swing-role; strong EW. [Saab Gripen E](https://www.saab.com/products/gripen-e-series) |
| Giraffe 1X / 4A / AMB | Radar sensor | Short and medium-range 3D surveillance; 1X typical with brigade-level GBAD. [Saab FMV order – euro-sd](https://euro-sd.com/2025/11/major-news/47969/saab-fmv-air-defence-order/) |
| Erieye / GlobalEye | Long-range AEW&C | Extends the detection horizon for low-flying CMs/drones — critical vs T5/T6/T12. [Saab GlobalEye](https://www.saab.com/products/globaleye), [Wikipedia – GlobalEye](https://en.wikipedia.org/wiki/GlobalEye) |
| Arthur | Weapon-locating radar | Rocket/artillery/mortar tracking; adjacent to C-RAM logic. |
| 9AIR C4I / 9Airborne C2 / LSS Lv | C2 | Track Data Fusion Engine (TDFE) correlates multi-sensor tracks; Multi-Sensor Optimiser suggests best sensor allocation — essentially the real-world analog of what the hackathon prototype is prototyping. [Saab – 9AIR C2](https://www.saab.com/markets/thailand/editorial_articles/automated-c2-systems-enable-maximum-situational-awareness), [Saab – 9Airborne C2](https://www.saab.com/products/9airborne-c2) |

**Geographic/operational angles the prototype can reflect:**
- Long coastline + flat Baltic → sea-skimming CMs (T5/T6) are a defining threat; AEW&C (GlobalEye) matters disproportionately.
- Few, widely spaced main bases → dispersion is the primary passive measure; Gripen is designed for road-base ops.
- Arctic north / long flight times → handoffs between sensors/fire units over distance; data-fusion latency is a first-order concern.
- High-end threat reference is Iskander-class SRBM from nearby areas and cruise/loitering munition salvos.

---

## 6. Data-Model Hints

Keep the schema small enough to generate/mock in the first few hours, extensible enough to grow. Below is a pseudo-schema (TypeScript-flavored) the team can paste into the prototype.

```ts
// ====== IDENTIFIERS & ENUMS ======
type ThreatClassId =
  | "FIGHTER_4GEN" | "FIGHTER_5GEN" | "BOMBER" | "HELI"
  | "CM_SUBSONIC" | "CM_SUPERSONIC"
  | "SRBM" | "MRBM" | "HGV" | "HCM"
  | "UAV_MALE_HALE" | "LOITERING_MUNITION" | "DRONE_SWARM"
  | "GLIDE_BOMB" | "ARM";

type EffectorClassId =
  | "SAM_LR" | "SAM_MR" | "SAM_SR" | "VSHORAD"
  | "AAA_CRAM" | "FIGHTER_BVR" | "FIGHTER_WVR"
  | "EW_JAM" | "DEW_LASER" | "DEW_HPM" | "CUAS_DEDICATED" | "PASSIVE";

type Rating = "EXCELLENT" | "GOOD" | "OK" | "POOR" | "NA";

// ====== THREAT TRACK (runtime) ======
interface ThreatTrack {
  id: string;                      // track number from sensor fusion
  classId: ThreatClassId;
  classification: "HOSTILE" | "SUSPECT" | "UNKNOWN" | "FRIEND";
  position: { lat: number; lon: number; altMeters: number };
  velocity: { headingDeg: number; speedMps: number; climbMps: number };
  rcsM2?: number;                  // current estimate
  detectedBy: string[];            // sensor ids contributing
  firstSeen: number;               // epoch ms
  lastSeen: number;                // epoch ms
  confidence: number;              // 0..1
  assignedTarget?: { lat: number; lon: number } | string; // inferred aim point
  estimatedUnitCostUsd?: number;   // for cost-exchange math
  ewHardened?: boolean;            // fiber-optic / INS-only / jam-resistant
  maneuverG?: number;              // current observed g
}

// ====== THREAT CLASS (catalog) ======
interface ThreatClass {
  id: ThreatClassId;
  name: string;
  speedMpsRange: [number, number];
  altMetersRange: [number, number];
  rcsM2Typical: [number, number];  // order-of-magnitude band
  maneuverGTypical: [number, number];
  typicalUse: string;
  hardCounters: EffectorClassId[];
  notes: string;
}

// ====== EFFECTOR / FIRE UNIT (catalog + runtime) ======
interface EffectorClass {
  id: EffectorClassId;
  name: string;
  minRangeM: number;
  maxRangeM: number;
  minAltM: number;
  maxAltM: number;
  reactionTimeSec: number;         // first-round out from cued
  reloadTimeSec: number;
  costPerShotUsd: number;          // order of magnitude
  magazineTypical: number;
  guidance: ("RF_SAR" | "ARH" | "IR" | "LASER_BR" | "COMMAND" | "EO" | "GUN")[];
  strongVs: ThreatClassId[];
  weakVs: ThreatClassId[];
  notes: string;
}

interface FireUnit {
  id: string;
  classId: EffectorClassId;
  position: { lat: number; lon: number; altMeters: number };
  status: "UP" | "DEGRADED" | "RELOADING" | "DOWN" | "EMCON";
  magazineRemaining: number;
  readyAt: number;                 // epoch ms when next shot possible
  maxSimultaneousEngagements: number;
  currentEngagements: string[];    // track ids
  sensorIds: string[];             // organic / cueing sensors
  protectedAssets: string[];       // asset ids this unit primarily covers
}

// ====== SENSOR ======
interface Sensor {
  id: string;
  kind: "RADAR_LR" | "RADAR_MR" | "RADAR_SR" | "AEWC" | "IRST" | "ESM" | "ACOUSTIC" | "PASSIVE";
  position: { lat: number; lon: number; altMeters: number };
  band: "VHF" | "UHF" | "L" | "S" | "C" | "X" | "KU" | "IR" | "RF";
  detectRangeM: number;            // nominal vs 1 m² target
  latencyMs: number;               // sensor-to-shooter contribution
  fov?: { bearingDeg: number; widthDeg: number };
  status: "UP" | "DEGRADED" | "DOWN" | "EMCON";
}

// ====== ASSET TO DEFEND ======
interface DefendedAsset {
  id: string;
  name: string;
  position: { lat: number; lon: number };
  valueUsd: number;                // drives cost-exchange math
  priority: 1 | 2 | 3 | 4 | 5;     // 1 = critical
  acceptableDebrisKm2: number;     // for collateral-damage reasoning
}

// ====== SUITABILITY MATRIX ENTRY ======
interface SuitabilityCell {
  threat: ThreatClassId;
  effector: EffectorClassId;
  rating: Rating;
  pkBase: number;                  // 0..1, baseline before modifiers
  rationale: string;
}

// ====== ENGAGEMENT RECOMMENDATION ======
interface EngagementOption {
  trackId: string;
  fireUnitId: string;
  effectorClassId: EffectorClassId;
  predictedPk: number;
  timeToInterceptSec: number;
  timeToImpactSec: number;
  feasible: boolean;               // t_intercept + latency < t_impact - safety
  costPerShotUsd: number;
  expectedCostExchange: number;    // effector_cost / threat_cost
  magazineAfter: number;
  collateralFlag: boolean;
  score: number;                   // composite utility
  rationale: string;               // human-readable
}
```

Minimal gameplay loop for the prototype:

1. Tick: sensors produce / update `ThreatTrack`s.
2. For each track, enumerate `FireUnit`s that can reach it (range/alt/FOV/status).
3. For each `(track, fireUnit)` pair, look up the `SuitabilityCell`, build an `EngagementOption`, compute `score`.
4. Sort options by score, filter out infeasible ones, present top N to the operator.
5. Operator confirms → decrement magazine, mark `currentEngagements`, start fly-out timer.
6. On intercept: roll Pk, update track, update magazine.
7. Continuously recompute — new threats keep arriving, effectors keep depleting.

Sensible first composite score:

```
score = w1 * predictedPk * V(asset)
      - w2 * costPerShotUsd
      - w3 * (timeToInterceptSec / timeToImpactSec)
      - w4 * (1 - magazineAfter / magazineMax)
      - w5 * collateralPenalty
```

Tune `w*` to taste; surface the breakdown to the operator so the recommendation is explainable.

---

## 7. References

- Wikipedia – [Radar cross section](https://en.wikipedia.org/wiki/Radar_cross_section)
- Wikipedia – [Cruise missile](https://en.wikipedia.org/wiki/Cruise_missile)
- Wikipedia – [Hypersonic weapon](https://en.wikipedia.org/wiki/Hypersonic_weapon)
- Wikipedia – [Short-range ballistic missile](https://en.wikipedia.org/wiki/Short-range_ballistic_missile)
- Wikipedia – [9K720 Iskander](https://en.wikipedia.org/wiki/9K720_Iskander)
- Wikipedia – [Kh-101](https://en.wikipedia.org/wiki/Kh-101)
- Wikipedia – [HESA Shahed-136](https://en.wikipedia.org/wiki/HESA_Shahed_136)
- Wikipedia – [ZALA Lancet](https://en.wikipedia.org/wiki/ZALA_Lancet)
- Wikipedia – [FIM-92 Stinger](https://en.wikipedia.org/wiki/FIM-92_Stinger)
- Wikipedia – [RBS 70](https://en.wikipedia.org/wiki/RBS_70)
- Wikipedia – [Meteor (missile)](https://en.wikipedia.org/wiki/Meteor_(missile))
- Wikipedia – [Saab JAS 39 Gripen](https://en.wikipedia.org/wiki/Saab_JAS_39_Gripen)
- Wikipedia – [GlobalEye](https://en.wikipedia.org/wiki/GlobalEye)
- Wikipedia – [RapidDestroyer](https://en.wikipedia.org/wiki/RapidDestroyer)
- MIT Lincoln Laboratory – [Target Radar Cross Section (PDF)](https://www.ll.mit.edu/sites/default/files/outreach/doc/2018-07/lecture%204.pdf)
- GlobalSecurity – [Stealth Aircraft RCS table](https://www.globalsecurity.org/military/world/stealth-aircraft-rcs.htm)
- SIPRI – [A matter of speed? Understanding hypersonic missile systems](https://www.sipri.org/commentary/topical-backgrounder/2022/matter-speed-understanding-hypersonic-missile-systems)
- U.S. GAO – [Science & Tech Spotlight: Hypersonic Weapons](https://www.gao.gov/products/gao-19-705sp)
- U.S. Congress (CRS) – [R45811 Hypersonic Weapons: Background and Issues](https://www.congress.gov/crs-product/R45811)
- CSIS Missile Threat – [Kh-101 / Kh-102](https://missilethreat.csis.org/missile/kh-101-kh-102/)
- CSIS Missile Threat – [9K720 Iskander (SS-26)](https://missilethreat.csis.org/missile/ss-26-2/)
- RUSI – [The Iskander-M and Iskander-K: A Technical Profile](https://www.rusi.org/explore-our-research/publications/commentary/iskander-m-and-iskander-k-technical-profile)
- Missile Defense Advocacy Alliance – [Missile Interceptors by Cost](https://www.missiledefenseadvocacy.org/missile-defense-systems/missile-interceptors-by-cost/)
- Norsk luftvern – [IRIS-T SL Cost Analysis and Performance Comparison](https://norskluftvern.com/2026/03/14/iris-t-sl-air-defense-system-cost-analysis-and-performance-comparison/)
- Norsk luftvern – [American vs European Missile Defense cost analysis (PAC-3, Aster 30, IRIS-T, AMRAAM, SM-3/6, THAAD, GBI)](https://norskluftvern.com/2025/07/28/american-vs-european-missile-defense-critical-cost-analysis-of-gbi-sm-3-sm-6-thaad-pac-3-amraam-aster-30-and-iris-t/)
- NAIC / FAS – [Land Attack Cruise Missiles – Ballistic and Cruise Missile Threat](https://irp.fas.org/threat/missile/naic/part07.htm)
- phenomenalworld.org – [Drones Like Bicycles (cost of a Shahed)](https://www.phenomenalworld.org/analysis/cost-of-a-shahed/)
- Saab – [RBS 70 NG product page](https://www.saab.com/products/rbs-70-ng)
- Saab – [Gripen E-series](https://www.saab.com/products/gripen-e-series)
- Saab – [The Power of Gripen E's Arsenal](https://www.saab.com/markets/india/gripen-for-india/technology/the-power-of-gripen-es-arsenal)
- Saab – [GlobalEye AEW&C](https://www.saab.com/products/globaleye)
- Saab – [9Airborne C2](https://www.saab.com/products/9airborne-c2)
- Saab – [Automated C2 systems (9AIR C4I, TDFE, MSO)](https://www.saab.com/markets/thailand/editorial_articles/automated-c2-systems-enable-maximum-situational-awareness)
- European Security & Defence – [Saab FMV order: brigade-level GBAD, Giraffe 1X, LSS Lv](https://euro-sd.com/2025/11/major-news/47969/saab-fmv-air-defence-order/)
- The Defense Post – [Sweden Orders Ground-Based Air Defense Parts From Saab for $220M](https://thedefensepost.com/2025/11/26/sweden-gbad-parts-saab/)
- The Defense Post – [A Quick Guide Into Saab's GlobalEye](https://thedefensepost.com/2025/12/05/globaleye-saab-guide/)
- Army Technology – [RBS 70 NG VSHORAD System](https://www.army-technology.com/projects/rbs-70-ng-very-short-range-air-defence-vshorad-system/)
- U.S. Army – [C-RAM transforms defense tactics](https://www.army.mil/article/78724/c_ram_transforms_defense_tactics)
- EOS Defense Systems – [Layered approach: the future of air defence](http://www.eosdsusa.com/news/layered-approach-the-future-of-air-defence-global-defence-technology-reports/)
- drone-warfare.com – [Counter-UAS 101 – Drone Defeat and Kinetic Mitigation](https://drone-warfare.com/counter-uas/drone-defeat/)
- drone-warfare.com – [Counter-UAS 101 – Electronic Warfare (Non-Kinetic Defeat)](https://drone-warfare.com/counter-uas/electronic-warfare/)
- JAPCC – [A Comprehensive Approach to Countering Unmanned Aircraft Systems (PDF)](https://www.japcc.org/wp-content/uploads/A-Comprehensive-Approach-to-Countering-Unmanned-Aircraft-Systems.pdf)
- National Defense Magazine – [Counter-Drone Mission Seen as Killer App for Directed Energy](https://www.nationaldefensemagazine.org/articles/2026/1/20/counterdrone-mission-seen-as-killer-app-for-directed-energy)
- RAND – [Opportunities and challenges for integrating DEWs (PDF)](https://www.rand.org/content/dam/rand/pubs/research_reports/RRA3800/RRA3833-7/RAND_RRA3833-7.pdf)
- D-Fend Solutions – [Counter-Drone Mitigation Technologies Guide](https://d-fendsolutions.com/cuas-mitigation/)

---

*All figures above are open-source, order-of-magnitude estimates intended for prototype modelling only. Where a number is contested between sources, the note uses a range rather than a point value. None of this document should be treated as authoritative targeting, doctrinal, or procurement data.*
