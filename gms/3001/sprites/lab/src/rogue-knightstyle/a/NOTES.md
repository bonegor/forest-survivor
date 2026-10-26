# Shadow · Knight style A (Assassin)

`lab:rogue/knightstyle-a`, collection `Knight style · round 3`. A comparison look for Kael the Shadow in
the plumed Knight's style: a hooded human assassin on his own two legs (no more floating wraith), kept
dark and violet as the owner wants, but readable as a figure on dark grass.

- Source: `rogue-a.px.js`, drawn with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl).
  The compositor (parts laid with their own darker edges, round limbs, flowing strands) is the one from
  `../../ranger-knightstyle/c/ranger-c.px.js`. No pixels were copied or traced from the Mattz Art knight or
  any pack.
- Sheet: `sheets/rogue-knightstyle-a.png`, 1056x144: 22 frames of 48x48 facing right, rows
  `["right", "glow", "glowLeft"]`, soles on row 39 (anchorY 40).
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild (from the repo root)

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/rogue-knightstyle/a/rogue-a.px.js --out <scratch> --only rogue_a
node gms/3001/sprites/lab/src/rogue-knightstyle/a/make-sheet.mjs <scratch>/anims/rogue_a.png gms/3001/sprites/lab/sheets/rogue-knightstyle-a.png
```

`make-sheet.mjs` is Ranger C's, set to 22 frames; its glow rows hold the four violet glow colours (the eye,
the pommel gems, the whip arc, the streaks and the spin rings). `pxl check` passes with no warnings.
`check-entry.mjs` says `OK: bake-ready`.

## Design

- **Cowl** (12x11 head at (16, 12)): an indigo-violet cloth, a step cooler and lighter than the leathers so
  the head is the focal point, as the Knight's steel helm is. Its peak leans back, its back drapes onto the
  shoulders, the brim catches a lavender rim; under it a sliver of skin, one glowing violet eye (2 px).
- **Mask and scarf** (the accent, plum to orchid): wound up over the nose and mouth, round the throat, and
  out behind in two long tapering tails with torn notches near the tips. They are this look's plume and
  cape: they ripple in idle, stream back on the walk, are flung back by the throw and whirl in the spin.
- **Leathers** (the main material): a close-fitting jerkin with a dark strap and steel stud across the
  chest, a belt with a steel buckle, short split coat tails, slim legs; boots and gloves in a warmer
  plum-brown leather with a steel knee buckle.
- **Daggers**: 6 px (near) and 5 px (far) blades, a 1 px near-white edge on the upper side, a steel guard,
  a violet gem pommel. At rest the near one is low and forward, point up; the far one reversed behind the hip.

## Palette (45 colours on the sheet, 44 in idle)

| material | ramp, dark to light |
|---|---|
| leathers (main) | `#0a0a1a #12112a #1b1838 #252048 #312a5a #40356c #534480 #6c5797 #8b70ad #ae94c6` |
| cowl | `#0d0b1f #15132f #1e1b42 #282554 #333066 #423e7a #55508f #6e68a6 #8f88bf #b4acd6` |
| scarf, mask (accent) | `#160818 #250b2c #380f42 #4f1559 #681c72 #85288c #a33aa5 #c05cbc` |
| boots, gloves | `#170c1c #25132b #351c3a #48274b #5e355d #7a4872` |
| steel | `#24223a #46445f #6f6c90 #a4a2c4 #eceaff` |
| skin (brow, by the eye) | `#3d2638 #6e4a5c` |
| violet glow | `#6d3fd0 #9d6cff #c9a6ff #f0e4ff` |

## Measurements (48x48 frames, soles on row 39)

| | Knight (plumed) | Shadow today (wraith) | Style A |
|---|---|---|---|
| idle frame 0 box, everything | 21x30 | 31x30 (floating, feet row 36) | 30x28 (scarf tails and the blades reach out) |
| idle frame 0 box, figure only (no scarf, no blades) | 21x30 | | 19x28 |
| top of the head | row 12 (plume row 10) | | row 12 (cowl peak) |
| head | ~10x10 helm | | 12x11 cowl including its drape (10 wide at the eye) |
| colours | 146 (shown frames) | 157 | 45 on the sheet |
| dark edge pixels, idle 0 (sum of RGB < 150) | 73% | | 68% |
| outline | none | | none (no pure black pixel) |

## Frames

- idle 0-7: the chest sinks a pixel on f3-5, the head a frame later; the scarf tails ripple and sway
  out and back, the coat tails a beat behind; a glint runs up the near blade on f2.
- walk 8-15: a planted stride (the Ranger's gait), the body low on the contacts, leaning forward a pixel,
  the arms swinging a little, the scarf streaming back level and the coat tails flapping.
- attack 16-21 at 12 fps, the hit on index 3 (attackRelease null):
  - 16 crouch: lower by 2, lean back, both blades drawn back past the hip;
  - 17 coil: lower by 3, the near blade up behind the head, the far low behind;
  - 18 whip: rising into a lunge, both arms over the head, a violet arc trailing from behind the shoulder;
  - 19 throw: arms flung out, both daggers flying apart (up and down) point first at the heads of two
    pale-violet streaks that cross in an X in front of him, a flash at each hand;
  - 20 spin: turned away (the figure mirrored), the scarf whirling round, two violet rings round the waist
    and shoulders, the streaks breaking into dashes;
  - 21 recover: back in the stance with fresh blades, a glint.

## Weak spots

- Dark on dark grass by design: it reads as a hooded figure with a plum scarf, but its value contrast is
  far below the Knight's. The cowl, the scarf, the eye and the blades carry the read; the jerkin and legs
  are a dark mass at 1x.
- 45 colours against the Knight's ~140: no anti-aliasing beyond the ramps.
- The throw's X is about 16x26 px, smaller than the Knight's full-width swoosh (there are only ~13 px in
  front of his hands in a 48 px frame).
- The spin frame is the whole figure mirrored, so the cowl and mask show on the left for one frame.
- The far dagger behind the hip reads as a short pale bar more than a blade at 1x.
- The arms swing only a little in the walk.
