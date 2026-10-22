# Knight E: the Black Knight

`lab:knight/e` ("Knight · Black Knight", collection "Knight looks"). The source is `knight-e.px.js`, drawn with claude-pxl (MIT). The sheet is `sheets/knight-e.png`: 22 frames of 48x48 facing right, with glow rows (1056x144: `right`, `glow`, `glowLeft`). Idle is 0-7, walk 8-15, attack 16-21. The feet stand on row 39 in every frame (anchorY 40) and each part carries its own 1 px ink (the frame has no outline of its own).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/knight-e/knight-e.px.js --scale 6 --out <scratch>
node gms/3001/sprites/lab/src/knight-e/make-sheet.mjs <claude-pxl> <scratch>/anims/knight_e.png gms/3001/sprites/lab/sheets/knight-e.png
```

- The `knight_e` anim's strip is exactly the 1056x48 row 0. `make-sheet.mjs` adds the glow rows the way `tools/build.mjs` does: row 1 keeps only the glowing colours, row 2 is row 1 mirrored per frame.
- `idle`, `walk` and `attack` are the same frames split out for their GIFs.
- `pxl check` passes with no warnings.
- `entry.json` is the catalog entry (not merged into catalog.json). Its `glow` lists the three glowing colours as hex, which `tools/bake-heroes.mjs` reads (`e.glow`).

## Design

A brooding little tyrant: a chunky body under a big horned helm, in black plate, with a sword far too big for him.

- **Silhouette.** Two curved horns, a blade that sticks out behind the back, a tattered cloak trailing behind, a pauldron spiked at both ends. Nothing in common with Knight A (plume, silver, red shield) or B (T-visor, blue, shield).
- **Obsidian plate** (`a b c d e`): `#2a2640`, `#403b5e`, `#645f8c`, `#a9a6cc`, `#e6e6f6`. Mostly the two dark tones, with the lit edges and the dome in `c`/`d`, and tiny speculars in `e`. A cool rim `r` (`#8d98e0`) on the helm's back-left edge. Ink is the cast's `#181425`.
- **Blood-red cloth** (`f g h i`): the sash and skirt panel and the cloak.
- **Helm.** 12x10 in 3/4: a dome, a brow, a dark visor slit with two slanted eyes (a dim outer pixel `Z`, a red `X` and a hot core `Y`), and angular cheek plates with vents. Horns are separate parts (`_hornN` near, `_hornF` far, smaller), lit on the outer curve.
- **Pauldrons.** The near one has two spikes on its top corners; a darker spiked one peeks out behind the back (`_pauldronF`).
- **Cloak.** Generated per frame (`cloakGrid`): a ragged hem of long and short tatters that ripple with phase, folds in three reds, a dark back edge. It streams further back when he walks.
- **Greatsword** (`sword()`): a 33 px blade (about the figure's height) rasterised from a shape: a taper to a point, a saw-toothed edge with a glowing red line along it (`X`, or the dimmer `Z` on the pulse frames), lit flat, mid and spine tones, fuller glints. The cross-guard is spiked with a red gem, the grip is leather, and two gauntlets hold it (the far one darker). Edge detection is done on the mask, so the red line follows the teeth.
- **Glow.** `X #ff2e35`, `Y #ff5a3c`, `Z #b3162a`: only the eyes and the blade's edge use them (the swing's crescent and the cloth use other reds, `T t g h i`).

## Animations

- **Idle (0-7).** The sword rests on his shoulder: the hilt held out in front in two hands, the blade passing behind his body and out over his back to the left. The chest sinks 1 px on f3-5, the helm a frame later; the cloak sways; the blade's edge dims on f3-4; he blinks on f6 (the eyes go out).
- **Walk (8-15).** The same eight-phase gait as Knight B (`GAIT`, far leg half a cycle behind) with the body bobbing, the sword in its carry, and the cloak streaming further back and rippling faster.
- **Attack (16-21, 13 fps).**
  1. **f16 wind-up.** The body leans back 1 px, the hands rise to the face and the blade swings up behind the head.
  2. **f17.** The blade stands up in front, a dark-red crescent over the horns.
  3. **f18, the cut.** A big dark-red crescent (outline, body, a darker trailing strip, a lit leading rim) sweeps from over the head to the front as the blade chops forward and down. He lunges 1 px.
  4. **f19, follow-through.** The blade is low and forward, the tip near the ground.
  5. **f20, recover.** The blade is held level.
  6. **f21.** The blade lifts back over his shoulder, almost the idle carry.
  - The forward frames have a shorter blade (12-14 px) so the sword stays inside the 48 px frame.

## Measures

- The figure spans x 3-46 and y 2-39 over all frames (idle and walk x 3-43, y 6-39). The strike's crescent reaches x 46; the wind-up's blade reaches y 2.
- The feet are on row 39 in all 22 frames.
- `fitW 36`, `fitH 34` and `motionRate` are the same as the Paladin's and Knight B's.

## Known weaknesses (the generator's, before the review; see REVIEW below)

- The idle and walk carry is a flat diagonal blade behind the back: it reads as a big blade rather than a drawn sword (the near horn and helm hide its base), and walking changes little besides the legs and the cloak.
- The hands on the hilt are small, and the fists are almost the same grey as the chest; the front reads as "a hilt held out" more than two gauntlets.
- The wind-up (f16) is busy: the blade crosses the horn.
- The blade is much shorter in the forward frames than in the carry (33 vs 12-14 px).
- He is darker than the rest of the cast; at night only the eyes and the blade's edge stand out (the rim and the cloak are lit by the game).
- The figure is 34 px tall with the horn tips (the cast is 30-33); the horns were cut down to stay near that.

## REVIEW (2026-10-22)

What was changed and why:

- **The carry.** The blade lying flat behind the back read as a lump poking out of the helm. The idle and walk now hold the greatsword UP before him in both hands, point to the sky at -74 degrees (22 px blade, clear of the face and the horns), so the whole sword is seen: guard, grip, pommel, a narrow tapered blade with a saw edge and the red line. The silhouette is horns plus a sword. The blade is slimmer and longer-looking (half-width 1.8 px, saw 1.9 px, taper over 8 px).
- **Hilt and hands.** Bigger guard (7 px, red gem, bright up-curved tips), a longer grip with a pommel; the gauntlets are now near-black with lit knuckles and a blood-red cuff, so they no longer match the chest's grey, and they sit 3.5 px apart.
- **Walk.** The body bobs 2 px (was 1) with a 1 px forward lean on the passing frames and a lagging helm; the sword rocks +-4 degrees with the steps and the hands follow it by a pixel; the cloak hem rides the bob (and no longer drops below the soles on the low frames: the old walk had ink on row 41).
- **Attack.** f16 wind-up is clean: the blade goes back near-horizontal under the horn (no crossing), the body leans back. f17 raises the blade to the sky (20 px) under the crescent; f18-f20 are a little shorter than before (13, 13, 12 px) so nothing touches the frame edge (max x 46), with the dark-red crescent selling the length; f21 lifts back toward the guard. Blade at the guard is 22 px, the forward frames 12-14 px (the frame is the limit; a 33 px blade cannot swing forward inside 48 px).
- **Brightness.** The obsidian ramp is lifted (`a b c d e` = #2e2a48 #4a4572 #7a75ad #b9b6e0 #eeeefc) and the back plate gets a cool rim (`r`) down its left edge, so he reads at night while staying black.
- **Horns.** Redrawn as thicker, curved horns (near one sweeping out to the back-left, far one to the front-right) instead of the thin stubs, 34 px with the horn tips, body size as the cast's.
- Glow is unchanged: eyes and blade edge only; the glow rows are rebuilt (`make-sheet.mjs`).
- Code: `sword()` takes a clip function (the wind-up blade passes behind the body); the idle/walk/attack tables were rewritten; the cloak lift sign was fixed for the walk.

Still weak: the hand/arm/pauldron area is dense at x6 (hilt, two fists, vambrace, pauldron spike all within 8 px); the forward-cut blade is short (12-14 px) and leans on the crescent; a stray ink pixel left of the near horn on f17 (the crescent's tail); the idle changes little besides the breath, blink and edge pulse; the horns still read slightly "antenna" on the far side.

## HELM (2026-10-22)

The owner found the new heroes' heads too round ("like balls"). The Black Knight's helm is now a barrel helm, a slight cylinder: `_helm` is 11x11 (was a 12x10 dome; stamped at hy - 1, so the bottom, brow and eyes sit where they did) with a flat crown line, straight vertical sides, one-pixel cut corners, a brow ledge, a squared chin, and cylinder shading: dark far (back) side with the cool rim, a vertical highlight band (`d`, specks `e`) on the lit front, a darker edge at the very front. The slit and eye pixels moved one column left to fit (`eyes()`). Horns, colours, glow, body and feet untouched (head about the same size, +1 px of height); the helm is shared by all 22 frames, so idle, walk and attack all changed. Rebuilt with the steps above (`pxl check` clean); `sheets/knight-e.png` is the new 1056x144 sheet with glow rows, `made` updated in `entry.json`.
