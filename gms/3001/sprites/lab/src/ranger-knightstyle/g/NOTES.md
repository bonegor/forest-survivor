# Ranger · Knight style G (C with an accent)

`lab:archer/knightstyle-g`, collection `Knight style · round 3`. Style C (hooded, the user's favourite
Ranger) reworked with the plumed Knight's colour logic: one main material plus ONE strong saturated
accent, at high value contrast, and his forward lean. Not a redesign: the hood and its flowing tail,
the face, the slim build, the cape and the big release are C's.

- Source: `ranger-g.px.js` (started as a copy of `../c/ranger-c.px.js`), drawn with claude-pxl (MIT,
  https://github.com/augusto-scarvalho/claude-pxl). No pixels copied or traced from the Mattz Art knight
  or any pack.
- Sheet: `sheets/archer-knightstyle-g.png`, 4224x144: 88 frames of 48x48 facing right, rows
  `["right", "glow", "glowLeft"]`, the same layout as C. Glow: `#b6ffdc` (moonstone, arrowhead).
- Catalogue entry: `entry.json` here (not inserted into `catalog.json`).

## Rebuild (from the repo root)

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/ranger-knightstyle/g/ranger-g.px.js --out <scratch>
node gms/3001/sprites/lab/src/ranger-knightstyle/g/make-sheet.mjs <scratch>/anims/ranger_g.png gms/3001/sprites/lab/sheets/archer-knightstyle-g.png
```

`pxl check` passes with no warnings; `check-entry.mjs` says "OK: bake-ready".

## Frames

As C: idle 0-7, walk 8-15, attack 16-23 at 14 fps with attackRelease 5 (the loose on frame 21),
attackWalk 24-87 = attack pose k over walk step j at 24 + 8k + j. The scarf's ends move in every frame:
they hang back and ripple a beat behind the cape in idle, stream out level on the walk, gather on the
draw and are flung back and up by the loose (on the move too).

## What changed from C

- **One accent: crimson.** A new 8-step ramp, wine-black shadow to hot red light
  (`#1c0414 #3a0619 #62091b #8e0f1b #bb1b1b #e2291f #ff5a3c #ff9c7a`). Used for:
  - a scarf wound at the throat under the chin (drawn over the hood's lower edge so it reads as a
    collar), pinned with the gold clasp;
  - its two long ends from the back of the neck, a broad one (about 4-5 px) and a narrower one under it
    making a forked tip, streaming back over the cape like the Knight's plume and cape (`scarfTails`,
    `scarfAt`/`scarf2At`);
  - the hood's lining, a 1 px crimson line inside the brim framing the face;
  - the arrow's fletching and the bow's grip wrap.
  Gold is kept only as small sparks (clasp, belt buckle, bow tips), as the Knight's gold hilt.
- **Value contrast.** The cloak ramp (hood, mantle, cape) now runs from near-black teal `#060d16` to a
  bright warm moss `#a2da7a` (C: `#0a171d` to `#82be78`), so the lit hood crown pops and its edges sit
  dark against the grass. The cape lobes use the lower half of that ramp, so the dark cape sets off
  the red scarf above it and the bright hood.
- **Lean and stance.** The head (and its tail) sits 1 px forward of the chest (`LEAN`), the idle upper
  body 1 px forward of the hips (as C's walk was), and the back foot plants 1 px further back, so she
  stands in the Knight's forward-leaning stance. The inner cape lobe is slimmer, so the mass behind her
  is mostly the scarf and the cape's outer lobe.

## Palette (52 colours on the sheet, 48 in idle)

C's ramps (silver hair, skin, tunic green, leather, gold, eye/string/glow/white), the brighter cloak
ramp and the crimson ramp:

| material | fine ramp, dark to light |
|---|---|
| cloak (hood, mantle, cape) | `#060d16 #0a1a22 #0d2a2b #123f33 #18583b #227544 #33944c #5cb65a #a2da7a` |
| accent (scarf, lining, fletching, grip) | `#1c0414 #3a0619 #62091b #8e0f1b #bb1b1b #e2291f #ff5a3c #ff9c7a` |

## Measurements (48x48 frames, soles on row 39)

| | Knight (plumed) | Style C | Style G |
|---|---|---|---|
| head top to soles (no plume / tail) | 28 px | 27 px (hood crown row 13) | 27 px (hood crown row 13) |
| top of everything (plume / hood tail) | row 10 | row 10 | row 10 |
| idle frame 0 bounding box | 21x30 | 24x30 | 25x30 |
| idle bounding box, average | 23.4x28.3 | 24.5x29.6 | 26.0x29.6 |
| walk bounding box, average | | 26.3x29.5 | 30.3x29.5 (the scarf streams) |
| torso, limbs | ~11 px chest, 4-5 px legs | 8 px tunic, 3-4 px legs | as C |
| colours, sheet / idle | ~140 | 50 / 46 | 52 / 48 |
| outline | none | none | none (no pure black pixel) |

## Weak spots

- 48 colours in idle against the Knight's ~140: the ramps are richer than flat cel shading, but there
  is no extra anti-aliasing.
- The scarf widens her silhouette behind her (walk average 30 px wide against C's 26); the green cape
  shows mostly as a dark ragged fringe under it.
- The figure is still mostly green; the Knight's main material is pale steel, so he reads brighter
  overall. G pops more than C through the brighter hood, the darker edges and the red, not through a
  pale main material.
- The hood lining is one pixel wide and reads as a red line rather than as cloth at game size.
- The string still crosses the cheek at full draw (as in C; the eye is kept over it).
