# Hero animation pass — 12 November 2026

## V1 preserved; V2 proposed

The current production artwork is preserved byte-for-byte in `variants/v1/`, with a SHA-256 manifest. The user found its legs too exaggerated. `variants/v2/` is a separate, selectable proposal; it is **not installed into the main game**. Both versions retain the shared crypt-only attack rule below.

V2 uses shorter, lower steps. The thirteen armoured/visible-leg walkers attach the thigh under the actual pelvis, keep near/far feet on modest separate tracks, and constrain knee bend and foot roll. This corrects the excessive inferred leg extension in V1. The six robed walkers have smaller boot returns and quieter hems. Shadow and Wraith keep their existing float. Idles, stationary attacks, portraits, weapon timing and movement speed remain unchanged.

Each designer received concrete directions from the independent motion reviewer, then returned complete cycles for review. See [V2 review and limitations](review-2026-11-12/v2-review.md). Shorter steps need a correspondingly shorter cycle to keep a planted sole moving backward with the ground; simply slowing the animation would create sliding. Diagonals retain the game's existing side-facing art and distance-based cadence, rather than adding directional foot locking.

```powershell
node tools/animation-round/preserve-v1.mjs
node tools/animation-round/build.mjs --v2
node tools/animation-round/serve.mjs
# Open http://127.0.0.1:3016/?compare=v2
```

The comparison starts with V1 and V2 walking at normal gameplay speed. Select any hero, scene, action, or half-speed **travel pace**; both columns run the real Game at 60 Hz, with gait driven by actual movement distance. V2's reduced-crop layout keeps both versions visible beside each other on a narrow desktop panel. The comparison uses disposable profiles.

`build.mjs` without `--v2` still rebuilds V1 production assets. The V1 snapshot script validates an existing snapshot and never silently refreshes it. To capture proposed sheets without changing production, set `REVIEW_SHEETS=tools/animation-round/variants/v2` before running `capture-review.mjs`; `--walk-only` records right, left, diagonal, stop/restart, slow travel, field combat and moving crypt attacks. Native PNGs are the source evidence; the paired packaging script preserves elapsed time for comparison GIFs.

## Shared animation rule

Every playable hero uses `heroAttackPose` through `Game.placePlayer`. Standing plays the dedicated idle loop on the main map and in a crypt. Travel plays the walk or spectral float. Only a manual crypt strike can select attack poses. Grounded moving strikes combine the attacking upper body/equipment with the current walking lower body; spectres retain their floating attack. Automatic weapon receipts, extra weapons and evolutions never select a field attack pose. Entering/leaving a world clears the previous manual strike and its buffered press. The legacy Ranger entry point delegates to this same selector.

This behavior correction is separate from the artwork. Crypt hit delays, damage, automatic projectiles and facing rules retain their original gameplay timing.

## Current full-roster gait

All 21 production heroes now have 16 chronological travel phases. `grounded-walk.mjs` draws thirteen visible-leg heroes with connected hip/knee/ankle articulation, an alternating planted sole and lifted return, and native equipment/upper-body pixels. `robed-walk.mjs` draws six robed heroes from their separate original garment/leg layers and gives Shadow/Wraith continuous travelling cloth and hover loops. Both read retained local inputs under `baseline/grounded-models/` and `baseline/robed-walk/`; the original stills/layers and source hashes remain available there. No external generator is required to rebuild.

The gait cadence follows distance covered through the existing Player clock. Source pose counts and full-cycle duration are carried through `walkFps` and `motionRate`. A planted sole sweeps backward at normal travel speed. Held equipment remains registered to its grip, and each character's original palette, 80×64 canvas, anchor at y56, idles and stationary attack clips are retained.

The lower layers used for moving attacks exclude resting equipment before the legs are drawn. Active shafts/blades are then composited over the walking lower body, so removing a resting staff cannot cut through a newly extended boot. Full attack-by-gait connectivity checks remain in `test/hero-art.test.js`.

The drawing/review pair examined every hero's full chronological cycle and loop return; findings and final capture coverage are recorded in [the independent review](review-2026-11-12/reviewer-notes.md). [The research notes](review-2026-11-12/research.md) cover sprite design skills and Sprite Fusion. Source contacts are followed by native Game captures with idle, both facings, diagonals, map combat, crypt idle and manual attacks. The comparison UI also offers six upgraded weapons to reproduce the reported map-combat bug.

To compare this pass with the exact local pre-edit sheets:

```powershell
$env:WALK_BASELINE='tools/animation-round/review-2026-11-12/before-sheets'
node tools/animation-round/serve.mjs
# Open http://127.0.0.1:3016/?before=previous
```

The local pre-edit copies are ignored; a fresh checkout can compare with the retained original import using the default review URL. Both art columns use the current shared gameplay rule. The older implementation history below documents the starting point, not the current field-attack policy or gait counts.

## Original pass — 7 November 2026

The production roster is the 21 packed sheets in `public/assets/heroes-approved/`, loaded by `public/js/art/approved-heroes.js`. The older `public/assets/heroes/` sheets and Plumed Knight are references, not the selected production roster. This pass keeps every selected character model and its native 80×64 canvas, anchor at y56, palette and equipment identity.

`baseline/*.js` preserves the exact selected packed inputs from before this pass. Their `source` and `sha256` fields identify the original imported sheet; the build records a separate SHA-256 of each retained packed input in its generated manifest. No external art service, image generation, downloaded art or saved game profile is involved.

Run from the repository root:

```powershell
node tools/animation-round/build.mjs
node tools/animation-round/contacts.mjs
```

The first command needs only Node and deterministically regenerates the 21 production sheets. It always reads the retained baseline, so repeated runs cannot accumulate deformation. The second writes enlarged contact sheets to the ignored `generated/` folder. Preview tools use the installed `@napi-rs/canvas` package; `CANVAS_MODULE` can override its location. `inspect.mjs` writes equivalent baseline contacts under ignored `inspection/`.

`baseline/equipment-masks.json` retains exact original arm/sword ownership for the five layered armoured models. Ordinary rebuilds read this self-contained file and do not need the original large art workspace. Optional `extract-equipment.mjs` can reproduce those masks from the original `example sprites folder/heroes-animation-2026-11-03/` source layers, using `CANVAS_MODULE` or an installed `@napi-rs/canvas`; it writes candidate masks and inspection PNGs to ignored `generated/`. The retained baseline mask file is promoted only after checking its source/native registration.

The local comparison preview runs on port **3016**. The review capture uses the production `Game`, `Player`, sprite builder, world, lighting and HUD in memory; it does not write saved progression. Production and comparison remain separate.

## Knight gait correction — 11 November 2026

The Knight now has sixteen chronological travel poses authored by `knight-walk.mjs`. The former eight-pose clip alternated compressed or shifted upper-body details and bunched leg positions. The new gait keeps the approved native helmet, face, torso, hands, sword and shield pixels intact, translating that whole upper body by a controlled single pixel. Original leg textures articulate through connected hips, knees, ankles and level boot contacts; the returning knee bends as its foot lifts and passes the supporting leg. The complete loop includes the last-to-first reach/contact transition.

At the game's normal Knight speed this is a brisk jog: a 0.54-second full cycle, 16 / 0.54 = 29.63 source poses per second, 40% support per foot and two short flight intervals. A planted foot sweeps 13.6 native pixels during its 0.216-second support, approximately 63 pixels/second, matching the normal Knight's movement. Increasing the phase count therefore does not halve cadence. Movement distance drives the runtime gait; idle time and blocked movement do not advance it. This pass changes only the Knight's art; the other twenty approved sheets are byte-identical after rebuilding.

`baseline/knight-walk-model.png` retains the original accepted source model from `example sprites folder/heroes-animation-2026-11-03/heroes7-sentinel/source-motion/original-pose0.png`. Its SHA-256 is `46dff0775110d6761258aca4e862f1f0a93af3af35c83952f161ed3cdc6a755b`. Source registration, limb ownership, equipment protection and joint coordinates are explicit in `knight-walk.mjs`; the builder also records this source hash in the generated manifest. No private sibling asset checkout or external generator is needed. The approved packed standing frame supplies the exact native upper-body colour and alpha values; source-resolution sampling is confined to articulated legs. Palette mapping preserves existing colours and does not promote transparent export fringes into visible pixels.

All eighteen stationary attack poses and the idle remain unchanged. Each attack now has sixteen moving combinations made from the clean articulated lower body, so a transparent weapon-mask margin cannot cut a walking shin. `test/hero-art.test.js` checks every walk and moving-attack combination for disconnected lower anatomy. `test/knight-gait.test.js` checks native upper-body stability, palette/opacity preservation, alternating foot support, continuous cycle endpoints and cadence. Visual captures and a complete chronological review remain required in addition to these checks.

## Motion

Every hero has a dedicated 16-pose idle, with 14–16 unique native poses at two seconds per loop. The two spectres use a slower 16-pose/7 fps resting hover. Feet remain planted for grounded idles; breathing grows from the waist, while cloth, hair, crests, leaves and held equipment settle at different phases. Sorcerer/Arcanist flames and hand focus, plus the green staff ornaments, use local flicker drawn from the existing material palette. Dark disconnected export specks are removed; coloured effects remain.

Except for the Knight correction above, the eight-pose walks retain the original connected legs and receive small upper-body and loose-material follow-through. Shadow retains four travel poses and Wraith eight. Their forward-travel float stays separate from the upright resting hover. Walking cadence is reduced from the previous 17–30 fps range:

| Cadence | Heroes |
| --- | --- |
| 13 fps | Praetorian |
| 14 fps | Sorcerer, Necromancer, Paladin, Footman, Templar, Arcanist, Seraph, Swordbearer |
| 29.63 fps / 16 poses | Knight (0.54-second jog; 11 November correction) |
| 15 fps | Ranger, Druid, Thornkeeper, Gravebinder |
| 16 fps | Berserker, Trailblazer |
| 17 fps | Witch Hunter, Boltguard |
| 18 fps | Marksman |
| 5.4 / 6 fps | Shadow / Wraith floating travel |

Previous four-pose casts now have six poses at 14 fps, including anticipation and recovery. The three four-pose crossbow attacks have six poses at 12 fps, with a clearer recoil. Existing longer sword, axe, bow and spectral clips retain their cadence. Release is pose 2 for the extended clips. Original world-frame indices are retained; new idle and attack/walk combinations are appended.

All 19 grounded heroes have an `attackWalk` table covering every attack phase and every gait step. The compositor keeps the moving lower body, removes remnants of the resting weapon, preserves staff extensions and adds the attacking upper body. Spectres retain their continuous floating attack. Equipment and waist continuity are reviewed in the generated contact sheets and actual Game captures.

The final pass checks the complete attack-by-gait matrices. Original weapon-layer masks preserve low sword swings; explicit staff/bow ownership keeps equipment separate from boots; the Knight and Footman recover the greaves hidden by their resting swords. Subpixel export fringe and isolated removed-equipment crumbs are cleaned only in repaired moving clips, with active weapon/staff pixels protected. `review-continuity.mjs` independently lists every disconnected lower component for visual inspection; `review-matrices.mjs` pages every combination rather than sampling only the release pose.

Light-ground inspection also repaired the Knight's full hip-to-knee contour and an inherited three-pixel rear-hip gap in Footman's fourth walk phase. The regression in `test/hero-art.test.js` traverses every grounded walk and every moving-attack combination with eight-neighbour connectivity: components of three or more pixels at alpha 128 or above must remain connected below the waist. Smaller antialiased edge pixels remain a visual-review concern. This check catches substantive broken legs and abandoned equipment pieces; full weapon length and pose quality still require the chronological visual review.

## Combat timing and verification

The packed `manualDelay` is retained from the baseline release time, and the existing nine original hero delay overrides remain in `approved-heroes.js`. Adding anticipation poses does not change crypt strike latency, cooldowns or damage. Field attack receipts select the release/recovery portion after the real signature attack succeeds during nearby combat. Automatic effects in an empty clearing preserve idle/walk; explicit manual strikes still animate without a target. Runtime facing and timing regressions belong in `test/hero-animation.test.js`.

The generated `manifest.json` records each hero's clip sizes, cadence, release index, moving-attack coverage, source hash and class-specific motion. Native inspection checks all poses against the 80×64 bounds; production tests also verify actual pose selection and combat behavior. Passing these checks establishes integration, while the full-cycle contacts and Game recordings establish the visual review.
