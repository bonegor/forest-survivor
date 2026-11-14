# Independent playthrough review — 14 November 2026

The requested control, crate-access and Ea-nāṣir progression changes pass the functional review. The review found and repaired a second crate-access problem affecting twelve starter kits. Survival balance is **not certified**: this run sample contains substantial differences between heroes, and most bots died despite a full Armory.

## What actually ran

- All 22 heroes: one complete real-Game survival attempt with `autopilot`, build policy, Normal, Darkwood, maximum Armory, seed 1411, 60 Hz, 18-minute safety cap. Every run reached death or victory; none crashed or reached the cap. Four won the 15-minute night, eighteen died. These runs began before the final nearby-object fallback repair.
- Ea-nāṣir, Gravebinder, Marksman, Boltguard and Praetor: a second complete attempt with `gems`, identical seed/difficulty/Armory, after that repair. All five died; several survived substantially longer than their autopilot attempt.
- All 22 heroes × starter/evolved × field/crypt: 88 controlled eight-second combat scenes at 60 Hz. Both movement directions, stationary combat, real cooldowns, accepted manual strikes, damage and four adjacent crates were exercised. The observer was immortal, targets were stationary with extra HP, and controlled terrain was open; these are mechanism checks, not survival wins. All 88 damaged enemies and stayed in a valid play state. All 44 crypt scenes opened all four nearby crates.
- All 22 starter kits and all 22 evolved kits: isolated field-crate regression at 14 pixels ahead, no monsters, no extra weapon. All 44 pass after the repair. The twelve newly supported target selectors also pass blocked-line-of-sight regressions.
- Actual Game/native Canvas contact sheets were inspected for all heroes, plus timed contact sequences showing the twelve repaired kits hitting an isolated crate. HeroScreen was rendered for every hero at 640×360, and Ea-nāṣir additionally at 480×270 and 293×633, including the scrolled details panel. All 22 selectable heroes and their play buttons remain available; longer text scrolls without overlapping the footer.
- Ea-nāṣir's two-stage chest route, Phoenix gating/reoffer, inherited copper curse challenge, HUD reveal and saved evolution records were checked with the real Game. Whip remains the manual crypt weapon while copper attacks automatically.

All profiles were disposable and in memory. No user progression was edited.

## Findings and repairs

1. **Fixed — twelve kits could not open an isolated field crate.** Before the repair, Paladin, Druid, Berserker, Witch Hunter, Ea-nāṣir, Marksman, Templar, Trailblazer, Thornkeeper, Gravebinder, Arcanist and Boltguard left a crate 14 pixels ahead untouched after ten seconds with no monsters. Their target acquisition required a creature even though their normal effects could usually damage props. `weapon-targets.js` now provides a weapon-only fallback to a nearby visible prop, at most 40 pixels away. Existing creature selection runs first. The normal visible attack, damage and cooldown do the work; there is no invisible destruction aura and monster/minion AI still excludes props.
2. **Fixed — Gravebinder could never hit a field box through its signature.** Its final crow now accepts a nearby crate if no creature is eligible. The crow still travels before damage lands, and a prop supplies no siphon or amplification. Creature priority and siphon limits remain covered by regressions. In a crowded fight it still prioritizes creatures; moving to a local clearing permits the crow to open a box.
3. **Verified — Praetor's box collision and attack explanation.** Base and evolved attacks hit boxes inside the visible front lane, including when no monster is present. A prop does not consume a monster hit budget, and stone blocks the hit. The release-anchored blade and bright lane spine make the short forward attack more legible. It remains directional: face the object or enemy.
4. **Fixed/verified — target visibility.** A nearer creature behind stone no longer steals manual aim from a visible target. Marksman's automatic selector also preserves visibility. Final review caught the same acquisition problem in copper outside crypts: Dungeon visibility alone admitted a closer obstructed creature. Copper now checks line of sight and solid terrain before selecting a target. New base/high-quality regressions prove its actual discs hit the farther unobstructed foe and leave the blocked foe unharmed.
5. **Open design risk — survival tuning varies widely.** Four of 22 autopilot runs won (Sorcerer, Shadow, Witch Hunter, Seraph); some other heroes died before the first boss. The `gems` follow-up improved Gravebinder from 3:29 to 12:13 and Boltguard from 3:41 to 10:23, demonstrating strategy sensitivity, but did not produce another win. One seed and two generic strategies are not a win-rate estimate, and the build preference table has no dedicated entries for recruits or Ea-nāṣir. This review does not establish the historical “every hero wins Normal with the best bot and full Armory” balance objective. Broad damage/health tuning was not changed during this graphics and interaction pass.

## Per-hero design review

Every row has starter/evolved field and crypt coverage, an isolated box pass, and a complete survival attempt. Times below are the single autopilot attempt, not balance thresholds.

| Hero | Main-weapon assessment | Survival attempt |
| --- | --- | --- |
| Knight | Short left/right slash is coherent with facing; evolved area clear is visibly stronger. Box contact works. | Died 9:16 |
| Ranger | Bow follows last movement direction rather than auto-seeking; this is now explicit. Keep movement deliberate to aim. Both bow forms hit boxes. | Died 9:05 |
| Sorcerer | Aimed burst and evolved meteor communicate different crowd-clearing scales. Large evolved flashes can obscure nearby bodies briefly. | Won 15:00 |
| Shadow | Seeking blades support evasive travel and rear attacks. Doubled sprite cadence does not imply a weapon-DPS buff. | Won 15:00 |
| Necromancer | Summons plus movement-laid Miasma reward travel; the paired kit must be considered together. Crypt control and boxes work. | Died 5:35 |
| Paladin | Strong-target pillars make prioritization clear; nearby-object fallback repairs empty-clearing potion access. | Died 7:55 |
| Druid | Travelling roots and the delayed surface burst are readable; wider evolved coverage is distinct. Object fallback now starts the attack without creatures. | Died 11:09 |
| Berserker | Forward leaps and local landing chops support an aggressive identity; isolated boxes now provoke the ordinary nearby chop. | Died 13:41 |
| Witch Hunter | Wicked/strong-target priority and piercing bolts fit the hunter role. Local object fallback preserves that priority. | Won 15:00 |
| Ea-nāṣir | Manual Whip plus automatic copper is a coherent two-weapon identity. Whip → Lion's Lash with Might opens Phoenix; Phoenix alone forges Medium Copper → High Quality Copper (not for sale). | Died 4:40 |
| Footman | Front strike plus rear-rank shock gives a readable formation-breaking purpose. Props no longer steal enemy hit capacity. | Died 10:10 |
| Marksman | First-hit side splinters distinguish the weapon from Ranger's directional bow. Visible target acquisition and local box fallback work. | Died 4:23 |
| Templar | Transverse ward is a placed hazard rather than a sword swing. Targeting copy now explains crossing behavior; nearby boxes receive a ward at their position. | Died 6:25 |
| Trailblazer | Bolt plus tripline encourages movement and repeat crossings. Projectile impact opens a local box without treating it as a creature trip charge. | Died 4:41 |
| Thornkeeper | Inward convergence has a clear focal point. Base/evolved arcs hit bodies and props without duplicating hits across spokes. | Died 4:29 |
| Wraith | Current cut plus previous shade rewards positioning. Both origins remain visible; props do not displace enemy hits. | Died 4:51 |
| Gravebinder | Siphon from lesser creatures into a strong-target crow has a coherent identity. New local crow peck restores box access without treating a box as soul fuel. | Died 3:29 |
| Arcanist | Arc at target distance differs meaningfully from a straight projectile. Local object fallback positions that arc on the box. | Died 4:41 |
| Praetor | Short forward lane is functional and more legible. It is not a circular melee aura; facing remains essential. | Died 8:57 |
| Seraph | Forward cleave with flank sweep has broad but bounded coverage. Base and evolved box contacts pass. | Won 15:00 |
| Boltguard | Sequential piercing and stronger-foe stop give the bolt a clear purpose. Props supply no charge; nearby-object fallback fires the ordinary bolt. | Died 3:41 |
| Swordbearer | Sustained walking charges the longer cut; explanatory copy makes that condition explicit. Stationary and moving crypt strikes work. | Died 5:52 |

## Evidence and validation

- `output/hero-polish-2026-11-14/playthrough/full-runs.json` — all 22 full attempts and final builds.
- `output/hero-polish-2026-11-14/playthrough/gems-followup.json` — five second-strategy attempts.
- `output/hero-polish-2026-11-14/playthrough/controlled-results.json` — final 88-scene results; `controlled-results-before-object-fallback.json` retains the earlier pass.
- `output/hero-polish-2026-11-14/playthrough/isolated-crates-before.json` and `isolated-crates.json` — twelve failures before, all 22 starters passing after.
- `output/hero-polish-2026-11-14/playthrough/combat-overview-{1,2,3,4}.png` — all heroes, native Game scenes.
- `output/hero-polish-2026-11-14/playthrough/*-isolated-box.png` — visible attacks before, during and after prop destruction; times recorded in `isolated-box-visual-coverage.json`.
- `output/hero-polish-2026-11-14/playthrough/*-menu-*.png` and `menu-results.json` — real selection layouts.
- Focused validation: **133 tests passed**, covering all 44 starter/evolved object cases, twelve wall guards, resource/creature priority, affected expansion mechanics, original four additional heroes, Whip, copper and Phoenix route.
- After the final copper visibility repair, **112 focused tests passed** covering copper, Whip, Ea-nāṣir integration, evolution, all starter/evolved object access, wall blocking, signature prop budgets and the unchanged creature-targeting rules. These totals overlap with the earlier batch; they are not additive.

The survival attempts were automated, not human live-browser play. Controlled combat uses open terrain and an immortal observer to isolate mechanics; the full survival attempts use real terrain and normal damage. Visual contact sheets do not prove every frame of every animation; the separate graphics review owns complete motion and monster-art verification. Audio and controller hardware were not auditioned in this review.
