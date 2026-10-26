# Berserker · Knight style A (Classic)

`lab:berserker/knightstyle-a`, collection `Knight style · round 3`. This is a faithful redraw of Ulfric (wolf-pelt hood,
red beard, bare arms, brown leathers, twin axes) in the plumed Knight's style.

- Source: `berserker-a.px.js`, drawn with claude-pxl (MIT). It uses the same part compositor as Ranger C: each part is laid
  with its boundary stepped darker along its own ramp, so there is no black outline. No pixels were copied or traced from
  the Mattz Art knight or any pack.
- Sheet: `sheets/berserker-knightstyle-a.png`, 1056x48: 22 frames of 48x48 facing right, rows `["right"]`. Nothing glows.
- Catalogue entry: `entry.json` here. It is not in `catalog.json`.

## Rebuild (from the repo root)

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/berserker-knightstyle/a/berserker-a.px.js --out <scratch> --only berserker_a
node gms/3001/sprites/lab/src/berserker-knightstyle/a/make-sheet.mjs <scratch>/anims/berserker_a.png gms/3001/sprites/lab/sheets/berserker-knightstyle-a.png
```

`make-sheet.mjs` copies the strip into a single row. It refuses half-transparent and pure black pixels. `pxl check` reports
no warnings.

## Frames

- **idle 0-7:** a heavy breath. The chest rises a pixel on f3-5, the head follows a frame later and the hands sink a frame
  behind. The cape lobes ripple, and the wolf's tail swings a beat behind the cape.
- **walk 8-15:** a planted stride with the body low on the contacts. The axes swing against the legs, the kilt strips kick,
  and the cape and tail stream back.
- **attack 16-21** (12 fps, the hit on index 3 = f19, attackRelease null):
  - 16: gathers, with the axes pulled up to the chest.
  - 17: both axes raised overhead.
  - 18: cocked back behind the head, the edges up.
  - 19: the chop. He crouches forward and both axes crash down in front. A wide white crescent runs from over his head
    to the ground ahead, with a second, inner arc for the far axe. The near edge flashes white, and chips fly where the
    axes bite.
  - 20: the follow-through. The axes are buried low, the crescent breaks into dashes and more chips fly.
  - 21: recovery to the guard.
- Nothing is drawn below row 39, so an axe that reaches the ground reads as bitten into it.

## Palette (44 colours on the sheet, 40 in idle)

| material | ramp, dark to light |
|---|---|
| wolf pelt (hood, cape, tail, mantle, shin wraps) | `#1c1420 #2e2230 #45363f #5e4d50 #7a6862 #978575 #b3a28c #cfbfa5 #ebdfc6` |
| leather and haft wood (main material) | `#26121a #3a1b1e #532823 #6c3828 #874c30 #a16239 #ba7b45 #d19858 #e6b874` |
| skin | `#3f1a28 #66303a #8f4a48 #b4695a #d38b6c #e8ad8a #f7cfa9` |
| red beard (accent) | `#2c0610 #540c12 #861a14 #b42e16 #db4f1c #f27a2c #ffad55` |
| axe steel | `#24183a #3d3157 #5c5279 #827aa0 #b0a2c0 #d8c8da #f7eef2` |
| gold, eye, swoosh | `#6b3a0c #b8761e #f0c050`, `#1b0f1f #f4e8e0`, `#c9b6d6 #ffffff` |

Shadows lean violet and lights lean warm (cream, peach, ochre), as on the Knight.

## Measurements (48x48 frames, soles on row 39)

| | Knight (plumed) | Berserker v1 (current) | Style A |
|---|---|---|---|
| idle body box (herocmp, frame 0) | 21x30 | 44x34 | 38x31 (rows 9-39) |
| without the axe steel | – | – | 31x31 (cape and hafts included) |
| height without plume or ears | about 28 | about 32 | about 29 (hood crown row 11) |
| colours | 146 in the shown frames | 22 | 44 on the sheet |
| outline | none | ink 99% | none (no pure black) |

- Top of the idle: the ear tips on row 9, or row 8 on the breath frames.
- On the walk he spans x 5-46.
- The raised axes of f17 reach row 0, so they stay inside the frame.

## Weak spots

- The colour count is 44, against the Knight's ~140. There is no anti-aliasing beyond the ramps.
- At 1x the bulky body (leather, skin and pelt are all mid-values) is murkier than the Knight's steel-and-scarlet. The
  beard is the brightest mass and dominates the face.
- On f17-18 the raised near arm shows mostly as an elbow beside the snout, and the far axe largely hides behind the
  near one on f18.
- The idle stance is fairly square-on. He leans less than the Knight does.
