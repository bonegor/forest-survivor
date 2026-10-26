# Ranger · Knight style A

A comparison skin for Lyra the Ranger (`archer`), drawn to sit beside the plumed Knight
(`public/js/art/knight-plumed.js`). It ships as the Ranger's look "Style A" (archer_b, chosen with LOOK on the hero screen).

- Source: `ranger-a.mjs`, drawn in code with no plugin. Regenerate with
  `node gms/3001/sprites/lab/src/ranger-knightstyle/a/ranger-a.mjs` (run from the repo root or anywhere).
  It writes `gms/3001/sprites/lab/sheets/archer-knightstyle-a.png` and checks every frame: 1 px clear at
  the cell edges, the soles on row 39.
- Sheet: 88 frames of 48x48, facing right, 4224x144, rows `right`, `glow`, `glowLeft`, the same as
  `archer-silverleaf-picked`. Idle is frames 0-7, walk 8-15, attack 16-23 (14 fps, `attackRelease` 5).
  attackWalk is 24-87: group k is shot pose k over walk steps 0-7. anchorY is 40.
- Catalogue: `lab:archer/knightstyle-a`, collection "Ranger · Knight style", glow `#b4ffd6`.

## How it's drawn

Body parts are shapes (polygons, ellipses and two-radius capsules for limbs). Each part has a material and
a base shade, and is lit from above and in front: the shade rises toward the top-right of each form.
Parts are stamped back to front: cape, far arm, far leg, skirt, jerkin, belt, near leg, hood, ponytail,
head, near arm. Then `resolve()` turns the shades into ramp steps and applies the Knight's edge treatment:

- **No black outline.** A silhouette edge facing away from the light takes step 0 of its own ramp (a
  dark teal on green, plum on leather, purple-grey on silver). An edge facing the light drops two steps,
  so lit rims stay readable.
- Where a part lies under one drawn over it, it darkens: a dark line within one material (the near leg
  over the far one, the sleeve over the tunic), and one step darker against another material.

The head (face, swept fringe, eye, nose) and the long ear are placed by hand pixel by pixel. So are the
bow (a pale yew stave with a lit face and a shaded back, amber nocks and grip), the string, the arrow and
the release swoosh, all drawn after the edge pass so they stay 1 px fine.

## Palette

Six 7-step ramps, each hue-shifted: shadows lean blue or purple, lights lean warm. There are 39 colours
on the sheet (36 in idle).

| ramp | steps (dark to light) | use |
|---|---|---|
| green (main) | `#0a1a1d #0f3330 #14503a #1d6f3f #2f9043 #62b04a #b0d968` | cloak, hood, tunic skirt, sleeves, breeches, iris |
| hair | `#261c38 #4b4166 #7a7096 #a69cbc #cfc3d8 #ecdfe8 #ffffff` | silver hair, bowstring, arrowhead, the white swoosh |
| skin | `#3a1726 #6d3138 #a3554b #d1836a #efb08c #ffd6b6 #fff1e2` | face, ear, hands |
| leather | `#1b0e1d #341826 #552a2c #7a4233 #9f6340 #c48b58 #e4b97e` | jerkin, belt, bracers, boots |
| wood | `#2b1219 #55291f #84482b #b0703a #d49a52 #ecc47c #fbe8b4` | the bow, the arrow shaft |
| amber (the one warm accent) | `#2e0c0c #6e1f0e #b0400f #e2741a #ffa834 #ffd66a #fff6c6` | hair tie, cloak clasp, buckle, nocks, grip, fletching, string flash |
| glow | `#b4ffd6` | the moonstone in the clasp, the arrow's tip, the end of the swoosh |

The scheme follows the Knight's: one main material (forest green, as his steel), silver and white for
the brightest values, and one strong warm accent used small (amber, as his gold sparks). Brown leather
is a dark neutral between them.

## Measurements (idle frame 0)

| | Knight (plumed) | old Ranger (silverleaf-picked) | Knight style A |
|---|---|---|---|
| body box with plume or tail | 21x30 | 27x34 | 19x30 (bow included) |
| crown or helm top to sole | 28 rows (19-46) | about 32 | 27 rows (13-39) |
| plume or tail above the crown | 2 px | n/a | 3 px (tail peak row 10) |
| head | about 10x10 | about 14x16 (half her height) | 10x10 including the nose, about 1/3 of her height |
| torso across | about 10 px | about 12 px | 7 px |
| legs | 4-5 px | 4-5 px | 3-4 px |
| colours (idle) | 140 | 25 | 36 |
| dark edge pixels | 73% | 100% (pure black) | 50% (own-material darks; lit rims are mid tones) |

So she's one row shorter than the Knight and visibly narrower in the torso, shoulders and limbs.

## Motion

- **Idle** (8 frames): she breathes (the body rises 1 px on frames 3-5). The cloak stirs in a light
  breeze, with a ripple and fold bands travelling down it. The ponytail swings back and forth and follows
  the breath a frame late.
- **Walk** (8 frames): a planted stride with the near foot down on frame 0 and the far foot on frame 4.
  The body bobs [0,1,0,-1] and leans into the stride (her legs sit a pixel back). The cloak streams out
  behind, bellies upward, and ripples with a ragged hem. The tail trails and bounces a frame late. The bow
  is carried higher, swinging with her arm, and the far arm swings against it.
- **Shot** (8 frames, 14 fps): she lifts the bow and nocks (the arrow appears). She draws in 4, 6 and 7 px
  steps to her chin, the drawing forearm coming level under her jaw. On frame 5 she looses: the string
  snaps straight past the line, a white swoosh with a glowing tip runs to the cell edge, amber flashes
  either side of the string, her drawing hand flies back to her ear, and the cloak kicks back. Then she
  follows through (the string vibrating, the last wisps of the swoosh) and lowers the bow.
- **Shooting on the move**: each shot pose is laid over each walk step (her legs, bob, cloak and tail from
  the walk).

## Open points

- 39 colours against the Knight's 140. The ramps are 7-step and hue-shifted, but there are no blended
  in-between tones. More colours would mean a separate cape ramp or anti-aliased steps.
- The upper body stays fairly still through the shot. The Knight lunges and the read comes from the
  swoosh, while here it comes from the string, hand and swoosh. A lean back at full draw could add punch.
- When the drawing arm is at full draw, it crosses under her jaw as a dark leather band and can read like
  a scarf.
