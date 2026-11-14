# Forest Survivor graphics review — 14 November 2026

Independent final review of the production roster and enemy graphics. This review did not author the hero changes. It used the Forest Survivor art skill, the shipping sprite builder, Game, Player, Enemy, camera, lighting, HUD and HeroScreen. All profiles and encounters were disposable in-memory instances; no player save was changed.

## Verdict

The requested Ranger, Shadow, Berserker, Paladin and Ea-nasir changes are visually coherent with their animation sets. The Ranger again has the smaller, three-quarter Hunter head and auburn silhouette; the oversized replacement face is gone. Berserker has clearer chest planes, heavier shoulders and a legible beard/jaw. Paladin's corrected face stays within the hood rather than projecting an extra nose pixel. Shadow remains a hovering figure at the requested faster cadence.

One integration defect was found and repaired during this review: Ea-nasir's shared boss sprite moved the whip hand forward, but the boss effect still began behind the body, and the boss skipped the impact pose on release. The effect now starts at the forward grip and the boss displays attack phase 2 at impact. Fresh real-Game captures verify the repair facing both directions.

No remaining blocking anatomy, equipment attachment, missing-frame or sprite-clipping defect was found in the inspected final changes. This is not a claim that every existing graphic now meets the same polish level: the older two-frame bosses remain visibly coarser and less animated than the newer hero roster.

## Evidence and method

Primary evidence is under `output/hero-polish-2026-11-14/graphics/`:

- `heroes/`: chronological idle/walk/attack contacts, full attack/gait matrices, timed real-Game PNGs, native scene contacts, per-frame sample data and coverage. All 22 heroes have 344 runtime frames each at 20 fps: 7,568 frames, 378.4 seconds, zero reported sprite clipping. The four `runtime-overview-*.png` pages were inspected across the complete roster; they use final Paladin v2 captures.
- `monsters/`: all 249 source frames for all 76 enemy archetypes, including the four breakable props; seven overview pages show both facings.
- `enemy-runtime/`: 756 seconds of seeded simulation and 2,268 native screenshots. Ordinary enemies were exercised for six seconds each, Ea-nasir for 18 seconds, and each of the eight night bosses for 42 seconds. Ten overview pages show representative observed states. The complete frame/state receipts are in `source-coverage.json`.
- `selection/`: every hero at 640×420; changed human heroes and Ea-nasir additionally at 480×270 and 360×640. Ea-nasir was checked at both ends of its information scroll.
- `eanasir-boss-release-1-detail.png`, `eanasir-boss-release--1-detail.png`, and `eanasir-boss-release.json`: final boss grip and exact release pose, both directions.
- `merchant-icons.png`, `goodcopper-sequence.png`, `highcopper-sequence.png`: exclusive weapon icons and their actual projectiles in Game.
- `eanasir-game.gif`: final Ea-nasir real-Game capture, 344 frames at 50 ms each (17.2 seconds), including both facings, travel, attacks and crypt motion. The PNG source remains in `output/hero-polish-2026-11-14/eanasir-final/eanasir-world/`.

Final Paladin evidence also uses `output/heavy-hero-art-2026-11-14/final-paladin-v2/` and the updated `after/paladin-details.png`. These supersede the earlier Paladin sheet loaded at the beginning of the roster-wide capture.

Source clips were examined in order, including the last-to-first return. Runtime scenes cover idle, right/left/diagonal travel, stationary and moving field combat, crypt idle, stationary crypt strikes and moving leftward crypt strikes. Attack/gait matrices were generated exhaustively; visual checks concentrated on release and recovery poses, both support-leg extremes, equipment grips and waist joins. Tests or nonblank pixels were not used as a substitute for the visual judgment.

## Hero findings

| Hero | Visual assessment |
|---|---|
| Knight | Connected steel silhouette, sword and leading shield remain coherent through strides and the upward sword preparation. |
| Ranger | Restored head scale reads closer to the earlier Hunter. Eye/jaw clusters are restrained; bow grip and draw are consistent. No face silhouette jump found through attack recovery. |
| Sorcerer | White hair, blue robe, staff and casting hand stay legible; robe movement is intentionally subtle. |
| Shadow | Continuous hovering body and trailing cloth remain intact at 2× cadence. The blade stays connected and the feet do not become a walking cycle. |
| Necromancer | Hood, book and extended casting arm retain their silhouette; dark cloak is readable through its rim and face. |
| Paladin | Final four-column face fits the original hood. The sword-over-head pose no longer misregisters the face downward. Gold/white armor still separates from skin. |
| Druid | Forward staff remains continuous beneath the hem and through the casting lean; green cloth moves without old-foot remnants. |
| Berserker | Broader, simpler chest planes and dark jaw read more forcefully at normal game scale. Both axes remain distinguishable from the bracers through the lift and return. |
| Witch Hunter | Hat, crossbow and lead hand remain aligned; planted steps and firing recovery retain the same character. |
| Ea-nasir | Sterner brow, carved dark beard, copper cuffs/belt and broader shoulders give the statue more weight. The copper disc and whip are recognizable. The deliberately large, geometric stone-statue design remains stylistically simpler than the Heroes-derived roster. |
| Footman | Low sword, round shield and armored step remain continuous; the forward thrust has a readable grip. |
| Marksman | Crossbow, auburn hair and recoil remain consistent; no equipment jump observed. |
| Templar | Gold armor and forward shield stay separate from the raised blade; tabard/greaves remain connected. |
| Trailblazer | Pale hair, green cloak and bow retain a clear silhouette through the draw. |
| Thornkeeper | Staff stem remains intact at rest, on the stride and during the angled preparation. |
| Wraith | Dark spectral body and pale blade remain legible; the translucent travel appearance is deliberate and not a missing body region. |
| Gravebinder | Skull/face, staff gem and long robe remain coherent during the forward cast. |
| Arcanist | Hat and fire accents clearly identify the model; the casting arm does not become a detached orange fragment. |
| Praetorian | Shield, red plume and short blade remain distinct. The revised weapon cut is anchored at its release position and its bright center clarifies the narrow hit lane. |
| Seraph | Winged gold silhouette and single sword are preserved through the raised preparation and recovery. |
| Boltguard | Gray hair, dark hat and crossbow remain recognizable on both facings. |
| Swordbearer | Large blade stays one connected shape; shield and forward sword recovery remain readable. |

## Enemy findings

All 76 archetypes have valid, nonblank source frames. The source and runtime reviews included the original forest creatures, all desert/frozen/meadow/hell variants, skeleton crypt archer and mage, Ea-nasir, thief, breakable props and all eight night bosses.

- Small creatures retain clean silhouette changes: bat/owl/vulture/bee wing positions; rat/lemming/rabbit/scarab movement; slime/ooze squash; spider/scorpion/mantis limbs. Their short cycles are intentional arcade animation.
- Humanoid enemies retain attached limbs, weapons and gear. Death/Rime/Thorn Knights, Anubite, goblins/fiends and the larger brutes remain readable against the lit forest ground.
- Caster preparation is legible through pose or wind tint. Skeleton Archer and Mage keep the bow/staff attached through travel and their held attack poses. Ea-nasir shows distinct whip, magic and copper tells.
- Bone King and Demon Lord have the richest boss animation. Their authored source clips, including Bone King's volley, were inspected in full. The 42-second natural Bone King encounter exercised nova and summon, but did not happen to select volley; that clip's inspection is source-pose coverage rather than a claim of a naturally observed attack.
- Butcher, Lich, Pharaoh, Frost Giant, Thorn Queen and Pit Lord use two source frames enlarged to boss scale. Their effects and windups make their attacks readable, but the coarse enlargement and limited body motion remain the largest existing art-quality gap. These assets were reviewed, not redesigned in this pass.
- Colored rims and glow preserve enemy silhouettes at night. The review's cropped overview tiles intentionally crop some large boss effects; the full 480×300 world PNGs are retained for judging framing.

## Selection and remaining limits

All hero selection cards and main showcases rendered. Short and portrait layouts keep the action button reachable and expose the longer Ea-nasir weapon route through the information scroll. Sprite equipment is not clipped by the showcase. The medium/high copper icons and base/evolved whip icons have distinct silhouettes or highlights; High Quality Copper uses polished warm copper rather than the unchanged dull base disc.

This is a focused graphics validation, not a complete run of every campaign/map/difficulty combination. Enemy runtime scenes share a controlled forest backdrop to make comparisons consistent; all biome-specific enemy source art was inspected, but every biome lighting combination was not exhaustively captured. Death, burn, freeze and hit feedback mostly reuse sprite masks/effects rather than separate authored animation sets; this pass did not exhaust every status-effect combination. Runtime recordings complement complete source poses; a sampled PNG sequence cannot establish that every brief attack/gait combination appeared during natural play.
