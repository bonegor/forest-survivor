# Druid · Knight style A (Classic)

`lab:druid/knightstyle-a`, collection "Knight style · round 3". A faithful redraw of Bramwyn, the
Druid, in the plumed Knight's style. He keeps the antlered hood, the beard, brown and rust robes, the
leaf skirt and the glowing staff.

- Source: `druid-a.px.js`, drawn with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl).
  The compositor (parts laid with edges in their own darker tone, `limb`, `strand`) is Ranger C's.
  No pixels were copied or traced from the Mattz Art knight or from any pack.
- Sheet: `sheets/druid-knightstyle-a.png`, 1056x144: 22 frames of 48x48 facing right, rows
  `["right", "glow", "glowLeft"]`, soles on row 39 (anchorY 40).
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/druid-knightstyle/a/druid-a.px.js --out <scratch> --only druid_a
node gms/3001/sprites/lab/src/druid-knightstyle/a/make-sheet.mjs <scratch>/anims/druid_a.png gms/3001/sprites/lab/sheets/druid-knightstyle-a.png
```

`make-sheet.mjs` is Ranger C's, adapted to 22 frames. Its glow rows hold only `l m n o p`: the
seed's light, the swing's arc, the burst and the sparks.

## Design

- **Silhouette:** two pale antlers in a V rise from a brown hood. The hood's brim overhangs a
  small 3/4 face with a grey brow, one eye and a nose a pixel proud of the profile. A white-grey
  beard falls to the belt. A rust collar sits under the hood, the way the Knight's red scarf does,
  to part the head from the body. A long rust mantle flows behind him, standing in for the Knight's
  cape. A three-row leaf skirt with a pointed hem covers the knees, over linen-banded legs and dark
  bark boots.
- **The staff:** gnarled, 2 px wide (an ochre lit side with grain glints, a purple-brown shade
  side), wavering a pixel, with two knots. At the top a wooden claw holds the golden seed, and a
  green shoot grows off the claw. The staff is planted at his side.
- **Lean:** the upper body sits 1 px forward of the legs and the head 1 px further.

## Palette (40 colours on the sheet)

| material | ramp, dark to light |
|---|---|
| robe brown (main) | `#1c0e1e #2b1527 #3d1e2c #522a30 #6c3a35 #894e3a #a66940 #c3874c #dcaa66` |
| rust mantle, collar | `#2e0e17 #4d1719 #6e2418 #90341a #b0481c #cb6525 #e08a3a` |
| leaf green (accent) | `#0e1f1f #14322b #1d4b30 #2c6634 #47833a #7cb048 #b4d468` |
| ivory (antlers, beard) | `#3e2a3c #66505e #8e7a7e #b6a49c #d9cab8 #f3e9d6` |
| skin | `#4c1e2b #7c3b3c #a65d4d #cc8264 #e8a986` |
| seed light (glow from `l`) | `#6e3f12 #c2801c #f0bb36 #ffe27a #fff8d6`, burst greens `#9ee05a #d6ff8a` |
| eye | `#1b1430` |

## Measurements (48x48 frames, soles on row 39)

| | Knight (plumed) | Druid now (v1) | Style A |
|---|---|---|---|
| head top to soles | 28 px | 27 px (hood row 12) | 27 px (hood row 13, leaf wreath row 12) |
| top of antlers | (plume row 10) | row 4 | row 6 |
| idle frame 0 box (staff included) | 21x30 | 31x36 | 26x35 (staff claw top on row 5) |
| colours | ~140 | 25 | 40 on the sheet |
| outline | none | 100% black-ish | none (no #000000; edges are each material's darkest tone) |
| dark edge pixels, idle 0 | 73% | n/a | 48% |

Idle frame-to-frame changes: 57 113 263 180 132 220 164 59 px. Walk: 228-478 px per step.

## Frames

- **idle 0-7:** a slow breath: the body sinks a pixel on f3-5 and the head a frame later. The
  mantle ripples out and back, the leaf hem's points ripple, the beard sways, and the staff's top
  rocks a pixel.
- **walk 8-15:** planted stride, body bob. The staff is planted for the first step, then lifted
  and swung forward. The mantle streams back and the skirt's back edge trails.
- **attack 16-21 (12 fps, the blow on 19):**
  - 16: lifts the staff, and the seed flares.
  - 17: raises it high behind the antlers, leaning back. The seed blazes in an 8-ray star.
  - 18: drives it down and forward, the seed drawing a thick golden arc over his head.
  - 19: the staff's foot strikes the ground in front. A dome of green-gold light with rays and a
    white-gold core bursts up, a ground ring forms, and roots break through.
  - 20: the roots grow taller, lit gold at their tips, and the light breaks into rising sparks.
  - 21: recovers. The roots sink to stubs and the last sparks drift.

## Weak spots

- The hood is the biggest single shape and reads somewhat like a sack. The face is small (5x5),
  as the brief asks, but the eye is the only feature that reads at 1x.
- 40 colours against the Knight's ~140: the ramps are hue-shifted but there is no anti-aliasing
  between materials.
- The antlers are 1 px tines and thinner than v1's. They read at 3x, but at 1x they are faint
  against light grass.
- On frame 17 the raised staff passes behind the antlers, and the crossing lines are busy.
- The leaf skirt is a narrow band. On grass it partly merges with the ground (by design it is
  only an accent).
