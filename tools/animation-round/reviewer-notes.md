# Independent animation review — 7 November 2026

The production roster contains 21 heroes, loaded through `approved-heroes.js` and `assets/heroes-approved`. Plumed Knight is the motion reference, not the currently selected Knight model. The final art passed a second critical review after additional repairs; the first review's readiness claim was premature and is superseded by this report.

## Original problems and resulting behavior

Nineteen heroes originally had a single idle frame. Shadow and Wraith reused their travelling float at rest. Automatic field attack poses were suppressed, moving imported heroes lacked composed attacks, several walks ran too quickly, and short caster/crossbow attacks lacked readable anticipation and recovery.

Every hero now has a separate 16-pose idle, travelling walk/float, and attack. Grounded heroes keep their stepping legs during attacks. The two floating heroes retain their full-body attacks. Idle motion varies by character: breath and armour weight, hair and cloak, plume/tabard, robe/beard, staff flame/foliage, or spectral cloth. Feet remain planted during grounded idles. These quiet gestures do not resemble attacks.

## Critical review and repairs

The first review checked complete ordinary clips but relied too heavily on representative moving-release poses. The second review inspected every attack phase against every gait phase, checked exact weapon ownership, and used both dark and light backgrounds to reveal weak joins.

| Hero | Final independent findings |
| --- | --- |
| Knight | Found a missing supporting shin, then a thigh joined only through faint edge pixels. Rebuilt hip/knee/ankle contours now follow all eight gait phases. Full blade and shield remain intact. |
| Ranger | Hair/cloak idle, connected travelling legs, and clear bow draw/release. No additional repair needed in the critical pass. |
| Sorcerer | Living flame, beard and robe idle; distinct six-pose cast. Removed lower resting-staff remnants while preserving the full active staff. |
| Shadow | Calm hovering idle differs from travelling cloth and dagger attack. No leg steps or foot dust introduced. |
| Necromancer | Cowl/robes breathe at rest; extended cast remains distinct and joins the moving lower body. |
| Paladin | Removed a resting golden blade fragment. Later restored actual low sword sections that had been cut by the composition boundary. Full blade now survives every attack/gait combination. |
| Druid | Foliage and mantle provide secondary idle motion. Full staff, robe and travelling legs remain coherent. |
| Berserker | Chest breath and restrained axe settling suit the stance. Removed dark resting-axe fragments; both actual axes remain connected. |
| Witch Hunter | Hat/coat idle and six-pose aim/recoil/recovery are distinct. Moving crossbow grip and legs remain coherent. |
| Footman | First cleanup exposed a missing shin; restored its knee-to-ankle path. A later light-background check found an inherited weak rear-thigh join in walk phase 4; three native plate pixels reconnect it without changing knee or boot positions. |
| Marksman | Quiet hair/crossbow hold differs from stronger recoil. Removed a small retained lower crossbow fragment. |
| Templar | Plume/tabard idle and sword attack remain distinct. Removed resting-blade outline remnants while preserving the active sword. |
| Trailblazer | Hair/cloak idle and full bow draw remain readable. Removed the old lower bow section that hung beside the knee during raised shots. |
| Thornkeeper | Beard/mantle/foliage idle and deliberate staff cast. Restored the boot connection cut by the old staff mask; retained the complete tilted staff. |
| Wraith | Restrained hover differs from travelling float and spectral dagger attack. Tapered cloth remains intentionally translucent. |
| Gravebinder | Hood/robe/staff-focus idle and long staff cast remain distinct. Removed old lower staff pixels without shortening the active pole. |
| Arcanist | Hat/beard/robe/fire idle and extended cast read clearly. No additional critical-pass repair needed. |
| Praetorian | Plume/cape follows the reference well. Found a fallback compositor that removed the actual downswing blade entirely despite a clean connectivity count. Exact weapon masks restore the full sword through every phase. |
| Seraph | Gold mantle idle and long sword attack remain coherent. Restored the low-right blade continuity and removed old lower fragments. |
| Boltguard | Coat/hair settle around the held crossbow. Removed a lower resting crossbow fragment; aim/recoil/recovery stays legible. |
| Swordbearer | Quiet armoured guard, connected march and broad sword arc. Removed a small resting-blade outline remnant. |

The final independent visual check covered 336 idle poses, 164 travelling poses, 200 stationary attack poses, and all 1,448 composed attack/gait poses for the 19 grounded heroes. The floating heroes' 19 full-body attack poses were also checked. Loop returns, hand grips, hips, knees, ankles, boots, staff shafts, and low sword sweeps were inspected. The final Knight and Praetorian matrices were rechecked after their last repair; unchanged pages were verified byte-for-byte against the already inspected pages.

Component scans are diagnostic aids, not visual approval. An alpha-greater-than-zero scan finds no detached lower components. At alpha 128, every grounded walk and moving attack has no detached lower component of three or more pixels. The stricter scan exposed the Knight and Footman joins. Small inherited one-pixel edge details in Thornkeeper/Seraph travel and Wraith cloth remain; contrasting-background comparisons show no missing limb or broken equipment, so no broad opacity cleanup was applied.

## Actual gameplay evidence

`capture-review.mjs` runs the real Game, Player, sprite builder, camera, lighting and HUD on native Canvas with a disposable in-memory profile. Simulation runs at 60 Hz; native 480×300 PNGs are saved at 20 fps. Each hero has 296 frames over 14.8 seconds covering quiet idle, right/left/diagonal travel, stationary and moving field combat, and actual `Game.enterCrypt()` / `Game.strike()` combat in both facings. The final evidence set contains 6,216 native frames with zero off-screen clipping.

Assertions verify every idle index and complete gait in each quiet direction, reject attack interruptions during quiet states, and require actual attack art during each combat scene. Chronological moving-left crypt sequences were visually followed through attack, recovery and continued gait for every hero. The root agent independently checked continuous browser cadence and transitions.

Re-enabling field poses initially caused weapons firing into empty space to interrupt quiet idle. Native captures exposed this; the runtime now checks for a nearby target before recording that visual receipt, retaining gameplay effects and damage timing. The review harness also isolates each scene's live target so legitimate rear-target facing suppression does not hide the requested forward pose. It clears only disposable Necromancer summons before demonstration casts to avoid the summon cap.

## Final evidence locations and limits

- `output/animation-round/release-final/coverage.json` maps all 21 heroes to their authoritative native capture folders.
- `release-final/roster-game.gif`, its native PNG stills and the per-hero `*-review.gif` files show 2.4 seconds idle, 1.6 seconds walking and 1.4 seconds manual combat at each hero's own clock. Crops are enlarged exactly 2× with nearest-neighbour sampling.
- `output/animation-round/matrix-release/` contains readable exhaustive attack/gait pages and source hashes.
- `output/animation-round/sequence-release/` contains chronological actual Game samples for full moving field, stationary crypt and moving-left crypt phases.
- `output/animation-round/critical-before-repair/` preserves the original critical defects. Current light-background source/pose comparisons are in `critical-pass/`; final scan reports are in `release-continuity/` and `release-alpha128/`.

The board's cut into the crypt is an intentional scene change. Its indexed GIF colour is for convenient playback; native PNGs are authoritative. A 20 fps recording can skip a brief source pose, which is why exhaustive source-pose pages accompany the real-time evidence. No saved progression was changed. Visual readiness is based on the inspected art and full sequences, separately from regression tests; it is not a claim of mathematical aesthetic perfection.
