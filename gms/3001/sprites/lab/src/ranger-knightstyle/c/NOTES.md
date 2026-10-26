# Ranger · Knight style C (Hooded)

`lab:archer/knightstyle-c`, in the `Ranger · Knight style` collection. A comparison candidate for the
Sprite Lab, built from Style B (the user's pick of round 1): the same compositor, body, legs, cape,
bow and shot, with Lyra wearing a ranger's hood up over her head.

- Source: `ranger-c.px.js` (started as a copy of `../b/ranger-b.px.js`), drawn with claude-pxl (MIT,
  https://github.com/augusto-scarvalho/claude-pxl). No pixels were copied or traced from the Mattz Art
  knight or any pack.
- Sheet: `sheets/archer-knightstyle-c.png`, 4224x144: 88 frames of 48x48 facing right, rows
  `["right", "glow", "glowLeft"]`, the same layout as B and `archer-silverleaf-picked.png`.
- Catalogue entry: `entry.json` here (not yet in `catalog.json`).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/ranger-knightstyle/c/ranger-c.px.js --out <scratch>
node gms/3001/sprites/lab/src/ranger-knightstyle/c/make-sheet.mjs <scratch>/anims/ranger_c.png gms/3001/sprites/lab/sheets/archer-knightstyle-c.png
```

`make-sheet.mjs` is B's, unchanged but for names: the glow rows hold only `#b6ffdc` (the moonstone and
the arrowhead). `pxl check` passes with no warnings.

## Frames

As B (idle 0-7, walk 8-15, attack 16-23 at 14 fps with the loose on 21, attackWalk 24-87 = attack
pose k over walk step j at 24 + 8k + j). What moves differently: the hood's tail takes the ponytail's
place in every frame. In idle it sways a beat behind the cape and swings out and back (its amplitude is
larger than B's tail so the silhouette changes frame to frame); on the walk it streams back level; the
loose flings it back and up.

## What changed from B

- **The hood.** An 11x11 hood replaces the 10x10 hair-and-ear head (`HEAD`): lit from the upper left
  on the crown, a light rim running from the brim over the brow down past the cheek, a deep shadow
  inside, and its lower back running on into the mantle with no edge. The ponytail strand became the
  hood's long pointed tail (a liripipe), a tapering strand from the crown that rises a pixel or two
  above the hood and falls down her back; the head lays without an edge where it meets the tail, so
  hood and tail are one piece of cloth.
- **The face reads.** Under the brim: one row of silver fringe, a one-pixel lock down the back of the
  cheek (it carries on under the chin over the mantle), then 4 px of skin with the eye (navy lid, white,
  teal iris), a nose one pixel proud of the profile, and a mouth/chin shadow. The bow at rest moved one
  pixel forward so the string no longer runs over the nose, and the eye is redrawn over the string when
  the string is drawn across the face.
- **The draw arm.** Its forearm is now a green sleeve with the leather bracer only at the wrist, and it
  passes behind the hood; what shows is the elbow out behind the hood and the hand (a skin cluster laid
  over the nock, after the arrow) at the chin. No more leather bar under the face.
- **The cloak.** Hood, mantle and both cape lobes use a new ramp, a deeper and cooler green than the
  tunic (`0`-`8`, teal-black to moss), so the cloak and the tunic read as two materials, as the
  Knight's steel and red do. The cowl became a mantle over the shoulders.
- **The clasp.** A gold clasp at the throat (over the near shoulder) keeps a warm accent by the face,
  where B had the gold hair tie.
- The elf ear is gone (inside the hood).

## Palette (50 colours on the sheet, 46 in idle)

B's ramps (silver hair, skin, tunic green, leather, amber/gold, eye/string/glow/white) plus the cloak:

| material | fine ramp, dark to light |
|---|---|
| cloak (hood, mantle, cape) | `#0a171d #0e2228 #112e30 #163d38 #1c4d40 #286a4d #357f56 #529c64 #82be78` |

## Measurements (48x48 frames, soles on row 39)

| | Knight (plumed) | Style B | Style C (Hooded) |
|---|---|---|---|
| head top to soles (no plume / tail) | 28 px (helm row 12) | 27 px (hair row 13) | 27 px (hood crown row 13) |
| top of everything (plume / ponytail / hood tail) | row 10 | row 10 | row 10 |
| idle frame 0 bounding box | 21x30 | 23x30 | 24x30 |
| idle bounding box, average of the frames | 23.4x28.3 | 23.4x29.6 | 24.5x29.6 |
| head | ~10x10 helm | 10x10 | 11x11 hood |
| torso, limbs | ~11 px chest, 4-5 px legs | 8 px tunic, 3-4 px legs | as B |
| colours in idle | 140 | 42 | 46 |
| dark edge pixels, idle 0 (sum of RGB < 150) | 73% | 59% | 66% |
| outline | none | none | none (no pure black pixel) |

## Weak spots

- The figure is mostly green now (cloak and tunic); the cooler cloak helps, but the head is less of a
  bright focal point than B's silver hair or the Knight's steel helm. The face is small (4x5 px).
- The hood is a pixel wider and taller than B's head, so the head reads slightly heavy.
- At full draw the elbow shows only as a small green knob behind the hood.
- The string still crosses the cheek at full draw (the eye is kept over it).
- 46 colours in idle against the Knight's 140: no anti-aliasing beyond the ramps, as in B.
