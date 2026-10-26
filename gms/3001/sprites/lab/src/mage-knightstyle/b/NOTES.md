# Sorcerer · Knight style B (Battle mage)

`lab:mage/knightstyle-b`, collection `Knight style · round 3`. A selectable look for the Sorcerer (game id
`mage`), drawn in the plumed Knight's style. Direction B is a freer redesign of the same character in the
Knight's spirit. Eldrin is a leaner, more heroic battle-sorcerer, still old and white-bearded.

- Source: `mage-b.px.js`, drawn with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl). It uses
  the compositor from Ranger C (`../../ranger-knightstyle/c/`): parts laid with their edges stepped darker
  along their own ramp, plus round `limb`s and flowing `strand`s. The figure, poses and fire are new.
  No pixels were copied or traced from the Mattz Art knight or any pack.
- Sheet: `sheets/mage-knightstyle-b.png`, 1056x144: 22 frames of 48x48 facing right, with rows
  `["right", "glow", "glowLeft"]`.
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild (from the repo root)

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/mage-knightstyle/b/mage-b.px.js --out <scratch> --only mage_b
node gms/3001/sprites/lab/src/mage-knightstyle/b/make-sheet.mjs <scratch>/anims/mage_b.png gms/3001/sprites/lab/sheets/mage-knightstyle-b.png
```

`make-sheet.mjs` is the Ranger C helper adapted to 22 frames. The glow rows hold only the bright fire tones
V W X Y Z. `pxl check` reports no warnings. `check-entry.mjs` reports "OK: bake-ready".

## Design

- **Silhouette.** He leans forward with his weight planted in a wide stance (far foot back, near foot
  forward). The casting (far) arm is held out in front, with a flame on the palm. The near hand grips the
  staff at the hip, and the staff slants up over his back shoulder to a clawed fire orb. A wide, rakish
  brim sits on a tall crown swept back to a point.
- **Flowing parts.** The plume's job is done by a crimson scarf with two long ends from the throat and by
  the coat's long back tail. Both ripple in idle, stream level on the walk and are whipped back by the
  throw. The hat's tip and the beard's point lag the body by a beat.
- **Colour.** The main material is the deep-indigo coat. The one strong accent is a single ramp from the
  scarf's near-black red to the flame's white core. The small highlights are the white beard and brows,
  the brass hat band, buckle and orb claws, and the face.

## Frames

| frames | what |
|---|---|
| idle 0-7 (6 fps) | breath (the chest sinks a pixel on 3-5, the head a frame later), the scarf ends ripple, the coat tail lifts, the hat tip sways back on 3-5, the beard point lags, the palm flame flickers through 4 heights and leans |
| walk 8-15 (10 fps) | Ranger C's gait (planted stride, a 1 px bob on the contacts), the coat's front hem swings, the scarf and coat stream back, the hat tip and beard blown back, the flame leans away, the far hand bobs |
| 16 gather | the hand draws in to the chest and the flame swells |
| 17 wind-up | leaning back, the hand rises in front of the brim and the fire balls up |
| 18 coiled | leaning back further, the hand high, the fireball at its biggest (r 3.4) with sparks |
| **19 throw** | the lunge (+2 px, the body drops a pixel, the stance widens), the arm thrust out with a flash at the palm, the fireball at the head of a blazing arc 20x23 px from over the brim down to the front, the scarf and coat whipped back |
| 20 follow-through | the ball flies on as a comet with a 9 px tail, the arc breaks into fading embers |
| 21 recover | the hand back in front, a small flame rekindles, the last embers fade |

attackFps 12, attackRelease null (the game hits on attack index 3 = frame 19), attackWalk null.

## Palette (39 colours on the sheet, 37 in idle)

| material | ramp, dark to light |
|---|---|
| coat (main) | `#0e0b1d #17132d #221d40 #2e2855 #3c356a #4d4681 #625c99 #7f78b3 #a99ecc` (blue-black to lavender) |
| scarf, then fire (one accent ramp) | `#22030a #430710 #6c0f13 #961b15 #bf3216 #de4a2c` (scarf), then `#e5561b #f88323 #ffb03c #ffdc72 #fff7d2` (fire, glowing) |
| hair and beard | `#3a3050 #5c5174 #877c9e #b3a8c2 #d9d0de #f7eff0` (purple-grey to pink-white) |
| skin | `#4a1d2a #7c3c3f #a95c52 #d0896b #efb68f` |
| wood and boots | `#1c0e17 #341a1d #51301f #724626 #93613a #b8844f` |
| brass | `#4f2f12 #9c6a22 #e2b552` |
| eye | `#141a38` |

Glow (rows 1 and 2): `#e5561b #f88323 #ffb03c #ffdc72 #fff7d2`. Only the fire uses these colours: the palm
flame, the orb, the fireball, the arc and the embers. The scarf stops at `#de4a2c`.

## Measurements (48x48 frames, soles on row 39)

| | Knight (plumed) | current Sorcerer (`mage`) | this look |
|---|---|---|---|
| idle frame 0 bounding box | 21x30 | 31x38 | 26x35 (staff orb and scarf included) |
| idle average box | 23.4x28.3 | – | 26.6x34.8 |
| top of the head (helm / brim) | row 12 | – | brim row 12, face rows 14-18 |
| top of everything | row 10 (plume) | row 2 (hat) | row 5 (hat tip and orb flame), 5 px above the plume |
| head | ~10x10 helm | big | face 6x5 under a 14 px brim, beard 8 px down the chest |
| colours in the shown frames | 146 | 24 | 39 |
| outline | none | black | none (no pure black pixel) |

The attack frames reach 34-44 px wide (the arc and the ball), and the wind-up reaches row 2.

## Weak spots

- 39 colours against the Knight's ~140. The ramps are hue-shifted and multi-step, but there is no
  anti-aliasing beyond them (Ranger C has 46).
- The coat is deep indigo as the brief asked, so the body has less value contrast than the Knight's bright
  steel. On grass it reads as a dark figure lit by the fire and the beard. One more step of light on the coat
  would help if the user wants him brighter.
- The back of the figure is busy: the scarf, the coat tail and the slanted staff all go to the left. At 1x
  they read as one dark-red and indigo mass with the orb above.
- The throw's arc (about 20x23 px) is smaller than the Knight's full-width swoosh. It reads as a fiery
  slash ending in the ball, not a sweeping crescent.
- The near hand at the hip is small, and the crimson cuff by the belt can read as a red blob there.
- The staff stays on the shoulder through the whole cast. It never swings.
