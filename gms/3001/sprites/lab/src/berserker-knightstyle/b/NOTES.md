# Berserker · Knight style B (Raider)

`lab:berserker/knightstyle-b`, collection `Knight style · round 3`. A comparison look for Ulfric drawn in
the plumed Knight's style, direction B "Raider": a freer redesign as a Norse raider.

- Source: `berserker-b.px.js`, drawn with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl).
  The compositor (parts laid with their boundary stepped darker along their own ramp; `limb`, `strand`)
  is Ranger C's, extended with a rag edge for fur, a rotated bearded-axe head and a crescent swoosh.
  No pixels were copied or traced from the Mattz Art knight or any pack.
- Sheet: `sheets/berserker-knightstyle-b.png`, 1056x48: 22 frames of 48x48 facing right, rows `["right"]`
  (nothing glows at night, so no glow rows and no `glow` list).
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/berserker-knightstyle/b/berserker-b.px.js --out <scratch> --only berserker_b
node gms/3001/sprites/lab/src/berserker-knightstyle/b/make-sheet.mjs <scratch>/anims/berserker_b.png gms/3001/sprites/lab/sheets/berserker-knightstyle-b.png
```

`make-sheet.mjs` copies the strip to the sheet after checking its size, that nothing lies below row 39,
and that there is no pure black or half-transparent pixel. `pxl check` passes with no warnings.

## Design

- **Head:** bare, 10x10, 3/4 to the right: red hair swept back off the brow, a band of blue-grey war paint
  across the eye with one pale eye pixel glaring out of it, a nose a pixel proud, a red moustache.
- **Hair (the plume's job):** one long red mass from the crown streaming back over his shoulders and a thin
  braid with an iron bead parting from it halfway; both sway in idle (the braid a beat later), stream
  back on the walk, are flung back on the wind-up and whip out on the chop. A braided red beard with an
  iron bead hangs down his chest.
- **Body:** broad and heavy, leaning forward. Fur mantle over both shoulders, brown leather jerkin with a
  dark iron band, iron belt with a bright buckle, leather tassets, leather trousers, fur-wrapped boots
  with cross bindings. Bare muscled upper arms with a band of war paint, leather bracers with an iron
  ring, big fists.
- **Cape:** a heavy fur pelt streaming behind from the shoulders, a darker inner fold a beat behind, fur
  streaks along the fall and a ragged (tufted) hem.
- **Axes:** twin bearded axes, rotated per frame (wood haft with an iron pommel, iron head with a bright
  cutting edge that is never darkened). At rest the near axe is held up in front, the far one trails
  low behind him.

## Palette (49 colours on the sheet, 45 in idle)

| material | ramp, dark to light |
|---|---|
| fur (cape, mantle, boot wraps) | `#17111d #251b2b #362838 #574350 #735a5c #907466 #ae9074 #caad88 #e5cea4` |
| leather (jerkin, trousers, hafts) | `#1c0e17 #2d151d #4a2427 #6a372c #895033 #a5683d #c0824b #daa263` |
| iron (bands, axe heads) | `#1d1729 #2c2540 #403856 #5a516f #776e8c #968dab #b8afc7 #d9d0e0 #f6eff3` |
| skin | `#3b1822 #5a2830 #7f3d3c #b2614e #d3825e #eaa47b #f9c89f` |
| the accent: red hair and beard | `#2e0709 #530f0f #7e1c12 #a92e15 #cf481a #ec6a23 #fb9438 #ffc56b` |
| war paint | `#1e2742 #344869 #52709a #7d9ac0` |
| eye, swoosh | `#f4e9e3 #2a0d1c`, `#ffffff #efe0ee #c9b5d6` |

## Measurements (48x48 frames, soles on row 39)

| | Knight (plumed) | Berserker now (v1) | Raider (this) |
|---|---|---|---|
| idle frame 0 box (with weapons) | 21x30 | 44x34 (wolf ears row 6) | 37x28 (rows 12-39, x 4-40) |
| body without the axes | 21x30 | ~32x34 | ~26x28 (cape tip x 8 to nose x 33) |
| idle box, average of the frames | 23.4x28.3 | | 37.8x27.6 |
| head | ~10x10 helm | wolf hood ~14 wide | 10x10 (hair mass adds ~4 behind) |
| colours (shown frames / idle) | 146 / 140 | 22 | 49 / 45 |
| outline | none | ink | none (no pure black pixel) |

## Frames

- idle 0-7: the chest sinks a pixel on f3-5 and the head a frame later; the axes rock ±4°; the cape
  ripples out and back; hair and braid sway a beat behind it.
- walk 8-15: an 8-phase stride (feet 5 px either side of the hip), the body low on the contacts, the arms
  and axes counter-swing, the cape and hair stream back.
- attack 16-21 at 12 fps, the hit on index 3 (f19, attackRelease null):
  f16 rears back with both axes swung up past his shoulders; f17 both axes high behind his head, chest out;
  f18 the axes come over the top, a short trail starting behind; **f19 the crash**: he lunges forward and
  down, both axes chopped down in front to the ground, a wide white crescent over his head and down in
  front (a thinner inner arc for the second axe), chips flying where they bite; f20 follow-through, axes
  bitten in, the crescent breaking up, chips and dust; f21 recovers to the guard.
  Pixels below row 39 are clipped (the ground hides the bite).

## Weak spots

- 45-49 colours against the Knight's 140: ramps but no extra anti-aliasing.
- The hair mass is large; on the idle the head reads as a red mane more than a distinct skull, and the
  bright top of the hair forms an arc much like the Knight's plume.
- The near axe at rest is a small rotated shape: at 1x the bearded profile reads as a plain hatchet.
- On f17 the raised arms pass behind the head, so only a little of them shows above the hair.
- The torso still shows three horizontal light bands (mantle, iron band, belt).
