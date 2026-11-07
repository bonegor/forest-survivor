# Hero animation pass — 7 November 2026

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

## Motion

Every hero has a dedicated 16-pose idle, with 14–16 unique native poses at two seconds per loop. The two spectres use a slower 16-pose/7 fps resting hover. Feet remain planted for grounded idles; breathing grows from the waist, while cloth, hair, crests, leaves and held equipment settle at different phases. Sorcerer/Arcanist flames and hand focus, plus the green staff ornaments, use local flicker drawn from the existing material palette. Dark disconnected export specks are removed; coloured effects remain.

The eight-pose walks retain the original connected legs and receive small upper-body and loose-material follow-through. Shadow retains four travel poses and Wraith eight. Their forward-travel float stays separate from the upright resting hover. Walking cadence is reduced from the previous 17–30 fps range:

| Cadence | Heroes |
| --- | --- |
| 13 fps | Praetorian |
| 14 fps | Knight, Sorcerer, Necromancer, Paladin, Footman, Templar, Arcanist, Seraph, Swordbearer |
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
