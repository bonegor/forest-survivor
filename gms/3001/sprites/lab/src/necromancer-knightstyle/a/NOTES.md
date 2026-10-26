# Necromancer · Knight style A (Classic)

`lab:necromancer/knightstyle-a`, collection `Knight style · round 3`. A faithful redraw of Morvath (the crowned skull,
the gold crown with its soul gem, the navy-purple robe with gold trim, the crooked staff, the green soulfire) in the
plumed Knight's style. Not yet in `catalog.json` (the entry is `entry.json` here).

- Source: `necromancer-a.px.js`, drawn with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl). Its
  compositor (parts laid with their edges stepped darker along their own ramp, `limb`, `strand`, `poly`) is Ranger C's.
  No pixels were copied or traced from the Mattz Art knight or any pack.
- Sheet: `sheets/necromancer-knightstyle-a.png`, 1056x144: 22 frames of 48x48 facing right, rows
  `["right", "glow", "glowLeft"]`, soles on row 39 (anchorY 40).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/necromancer-knightstyle/a/necromancer-a.px.js --out <scratch> --only necromancer_a
node gms/3001/sprites/lab/src/necromancer-knightstyle/a/make-sheet.mjs <scratch>/anims/necromancer_a.png gms/3001/sprites/lab/sheets/necromancer-knightstyle-a.png
```

`make-sheet.mjs` is Ranger C's for 22 frames; the glow rows hold `#46b947 #86e65a #c4ff92 #f0ffe2` (the soulfire
greens: both eyes, the crown gem, the staff's flame, the cast and the grave fire). `pxl check` passes with no warnings.

## Design

- **Head.** A skull in 3/4 to the right (8x7): cranium lit from the upper left, two deep sockets with a green ember in
  each, the nose hole, a row of teeth over a dark gap, the narrow jaw. On it a 9x5 gold crown: band with the soul gem,
  a tall centre spire, a shorter point either side, lit faces left.
- **Capelet.** Navy (a bluer ramp than the robe), lit on the shoulder, gold trim along its hem, a gold clasp at the
  throat.
- **Robe.** Purple-navy A-line from narrow shoulders: shaded per pixel as a cylinder lit from the upper left, folds
  fanning from the belt, a dark sash with a gold buckle, a gold-edged front opening, a ragged hem whose rags ride with
  the cloth. Bone feet under it.
- **Mantle.** A long tattered fall from the shoulders (two `strand` lobes, the inner in shade), torn into rags at its
  end; it ripples in the idle, streams back on the walk and is flung back and up by the burst.
- **Staff.** A crooked dark shaft (two kinks with knots, lit left, dark right) through a bony hand, its top curling
  forward into a hook that cradles a small flickering soulfire.

## Frames

| frames | what |
|---|---|
| 0-7 idle | breath (body down 1 px on 3-5, head a frame later), mantle ripple, hem sway, rags flutter, soulfire flicker (bigger on 1 and 5), crown gem pulse d-d-e-f-e-d-c-c |
| 8-15 walk | stride under the robe (bone feet step out at the front), bob on the contacts, front hem kicked and lifted by the leading foot, back hem trailing, mantle streaming, staff swung with the hand |
| 16 | wind-up: dips, staff tilted back, soulfire kindles, motes drawn in |
| 17 | raises the staff (the arm up out of the capelet), the light gathers into an orb |
| 18 | staff at its height, orb at its fullest, motes close in |
| 19 | **burst**: white-hot core, halo, four long and four short rays, a broken ring (about 28 px across, clipped at the top and right of the cell), eyes and gem flare, the mantle flung back, three soulfire tongues burst from the ground ahead |
| 20 | the ring flies apart into ten sparks, the ground fire rises as wisps |
| 21 | embers, the staff lowered |

attackFps 12, the burst on attack index 3 (game default, attackRelease null).

## Palette (41 colours on the sheet)

| material | ramp, dark to light |
|---|---|
| robe | `#120d24 #19132f #191532 #221c44 #2c2457 #382d6a #47397e #5b4892 #755aa3 #9a78b6 #bf96c6` |
| capelet, mantle | `#0e1026 #121731 #121838 #1a224b #232e60 #2f3d76 #43538e #6274a8` |
| bone | `#2a1d35 #47344f #6c5a6f #958491 #bdaea6 #dccdb9 #f3e9d2` |
| gold | `#3a1a12 #6b3414 #a1561b #cf8a2b #eebd4c #fff0a6` |
| staff wood | `#170c14 #28141b #3d2021 #56302a #734634 #9a6a48` |
| soulfire | `#0d2a22 #174f30 #24803b` (dim), `#46b947 #86e65a #c4ff92 #f0ffe2` (glow) |

Not every key ends up on the sheet.

## Measurements (48x48, soles on row 39)

| | Knight (plumed) | current Necromancer | Style A |
|---|---|---|---|
| idle frame 0 box | 21x30 | 29x38 (sickle staff to row 2) | 27x32 (crown and staff hook to row 8) |
| skull top to soles | helm 28 | 26 | 27 (crown spire 32) |
| idle box, average | 23.4x28.3 | | 28.4x32.0 |
| colours | 146 in herocmp's frames | 18 | 41 (sheet), 41 (idle) |
| outline | none | black | none (no #000000) |

## Weak spots

- 41 colours against the Knight's ~140: ramps, no anti-aliasing.
- The navy capelet and mantle are darker than the Knight's steel and red, so he reads lower in value contrast on the
  grass. The gold, the skull and the green carry him.
- The capelet is a fixed grid: it bobs with the body but does not ripple itself (the mantle's fall and the hem do).
- The walk is a glide under a robe: the feet show only at the front of the hem.
- The burst's rays and ring are clipped by the cell at the top and right on frame 19.
- The idle wind and the mantle are calmer than the Knight's cape.
