# Knight C: the Ember Knight

`lab:knight/c` ("Knight · Ember", collection "Knight looks"). Source `knight-c.px.js`, drawn with claude-pxl (MIT). Sheet `sheets/knight-c.png`: 22 frames of 48x48 facing right (idle 0-7, walk 8-15, attack 16-21), 1056x144 with glow rows `["right","glow","glowLeft"]`. Feet on row 39 in every frame (anchorY 40), own 1 px ink baked in, no frame outline.

## Concept
A hot-headed young knight forged in a volcano. Stocky, big helm, bouncy flame; a low, smouldering swagger.
- **Helm:** a rounded sallet in blackened brass (`u U j J H`), a flare at the back, a dark face opening with two big glowing slanted eyes (`a A` over `F`), and a living flame crest (`flame()`: four tongues, flickering by frame phase, streaming back when he moves, whipping up in the cut).
- **Armour:** crimson plate (`R r C c h`) with a cracked glowing seam down the chest and a glowing belt buckle, brass belt, big round pauldron, brass knee cops.
- **Cape:** a short half-cape of scorched cloth (`m M N`), ragged hem with ember pixels, sways on walk and cut.
- **No shield:** the far fist sits on the hip (the elbow cocks out behind).
- **Flamberge:** a broad double-edged cleaver: dark iron core (`V v`), an ember edge on both sides, the front edge thick and bulging in kinks, a glowing tip. Carried low and forward at +28 degrees (Knight A holds level, B up at -45).

## Palette (and glow)
Ink `#181425`. GLOWING colours, used only for fire/seams/eyes/blade edges/smear/sparks: `Q #d9391a`, `a #ff6a1a`, `A #ffa83a`, `F #ffe58c`. Everything else is non-glowing. The catalog entry lists them as `glow` (hex), which `tools/bake-heroes.mjs` reads (they are all in the sheet). The lab sheet's glow rows are made by `make-sheet.mjs`: row 2 = only the glow colours of each frame, row 3 = that mirrored.

## Animations
- **Idle (0-7):** breath (chest sinks f3-5, helm a frame later), flame guttering through the loop, blade edge's hot spot travels along it, two sparks rise off the crest half a cycle apart.
- **Walk (8-15):** the 8-phase gait of Knight B (contact, down, under, push, toe-off, passing, reach), body bob, cape sways, blade dips a little on the passing frames, flame leans back.
- **Attack (16-21, 13 fps):** f16 rears back, blade over the helm, flame whipped forward; f17 blade up-forward, short crescent starts; f18 the cut: a blazing crescent (Q, a, A, F, hot at the leading end) with sparks; f19 blade low and forward, sparks at the tip; f20 recover; f21 back toward guard.

## Rebuild
```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/knight-c/knight-c.px.js --scale 6 --out <scratch>
node gms/3001/sprites/lab/src/knight-c/make-sheet.mjs <scratch>/anims/knight_c.png gms/3001/sprites/lab/sheets/knight-c.png
```
`pxl check`: no warnings. Figure spans x 12-46, y 1-39 (f19's blade tip dips to row 41; f17's crest to row 1).

## Known weaknesses (after review)
- Still the darkest of the cast (crimson on ink is the concept); the near fist, the guard and the blade's ink merge into a dark knot at the hand in the rest pose.
- f16's raised sword is small and the hand area reads as a few blocks; f17's smear is a flat streak rather than a true crescent. Both read at game scale.

## REVIEW (2026-10-22)
What was changed in `knight-c.px.js` and why:
- **Brighter, separated values.** Crimson ramp lifted (`R #46112a r #8a2133 C #d03a3a c #f2653f h #ffb07a`) so the plate reads against the ink instead of sinking into it.
- **Helm brass had no tone** (flat mustard-brown). Re-hued as a bronze ramp with reddish shadows and a yellow spec (`u #241422 U #5c2f33 j #99602e J #dd9c3e H #ffdb8a`); the helm grid got a lit brow band with a highlight at the front, a lit jaw rim and lighter cheek guards, so the dome reads as a rounded metal helm with a dark face opening.
- **Cape vs far leg.** The cape went from brown to a charcoal-violet (`m #2c1d36 M #4f3150 N #82504f`) so it no longer shares a hue with the crimson legs; the far leg ramp is now `RrC` (was the near-black `kRr`) and the near leg `rCch`, so the legs read as two legs on every walk frame.
- **Knee cops** were three scattered pixels (read as noise); now a 2x2 round cop, lit top-left, shaded bottom-right.
- **Near arm hidden by the pauldron.** Arm thickened (radii 1.8/1.6/1.4) and a brass bracer sits above the fist, so pauldron, forearm and fist read as separate pieces.
- **f16 wind-up**: the blade no longer lies across the flame. The sword is raised in front of the helm (-82 deg, len 9, hand [32,12]) and the flame is whipped hard back, so blade and flame occupy different parts of the frame.
- **f17**: the smear is now an arc ahead of and above the blade (-105..-38 deg, thicker) and the flame leans back (lean -5), so the two no longer overlap in one bright jumble.
- **f19** blade tip: measured, the figure is inside y 1-39 and x 12-46 on all 22 frames (the 41 in the first notes was wrong). Nothing dips below the feet row.
- Glow rows rebuilt with `make-sheet.mjs` (row 2 = only Q a A F pixels, row 3 = mirrored); the changed browns/crimsons are distinct from the four glow colours. `entry.json` unchanged.
- Previews: `*-rev` files in the preview folder (all frames x6, lineup with Knight A, B and the Paladin, idle/walk/attack GIFs).

## HELM (2026-10-22): less ball, more cylinder
The owner found the new heroes' heads too round. `_helm` is redrawn as a 10x11 barrel (was an 11x10 dome): a flat crown with one step of corner rounding, straight vertical sides, cylinder shading (dark far-left edge, a vertical `J H J` highlight band on the lit side, the near edge turning away), a lit brow band, the same glowing eye-slit (`a A` over `F`) in a dark face opening, bronze cheek plate and a jaw rim. The back flare of the sallet is gone (a barrel has none). Same area as before (head not bigger), stamped at `(hx+1, hy-1)` so its bottom still meets the gorget; feet stay on row 39. The flame now rises from the flat crown (`flame()` base `hy-2`) and its tongue height is clamped so no frame touches sheet row 0 (figure spans y 1-39). Sheet rebuilt with `make-sheet.mjs` as above; `entry.json` unchanged except `made`. Before/after previews: scratchpad `helm-c/`.
