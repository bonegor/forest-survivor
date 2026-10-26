# Ranger · Knight style E (Hooded Pokémon)

`lab:archer/knightstyle-e`, in the `Ranger · Knight style` collection. A comparison candidate for the
Sprite Lab, built from Style B's source (`../b/ranger-b.px.js`): Lyra with her ranger's hood up, drawn
a bit toward a Gen 4-5 (Black/White) Pokémon trainer sprite. It ships as the Ranger's look "Style E" (archer_f).

- Source: `ranger-e.px.js`, drawn with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl).
  No pixels were copied or traced from the Mattz Art knight or any pack.
- Sheet: `sheets/archer-knightstyle-e.png`, 4224x144: 88 frames of 48x48 facing right, rows
  `["right", "glow", "glowLeft"]`, the same layout as B and `archer-silverleaf-picked.png`.
- Catalogue entry: `entry.json` (to insert into catalog.json; id `knightstyle-e`).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/ranger-knightstyle/e/ranger-e.px.js --out <scratch>
node gms/3001/sprites/lab/src/ranger-knightstyle/e/make-sheet.mjs <scratch>/anims/ranger_e.png gms/3001/sprites/lab/sheets/archer-knightstyle-e.png
```

`pxl check` passes with no warnings. The glow colour is `#b6ffdc` (the moonstone in the grip and the
arrowhead), as in B.

## Frames

The same timing and layout as B (idle 0-7, walk 8-15, attack 16-23 at 14 fps with the loose on 21,
attackWalk 24-87 = attack pose k over walk step j at 24 + 8k + j). The poses are B's, except the draw.

## What changed from B

- **The hood.** The silver ponytail is gone; the head is a hand-painted 13x10 hooded head: a round
  green dome lit from the upper left, a shadowed brim over the forehead, a silver fringe and a silver
  lock framing the face. The hood comes down into a short green mantle over the shoulders (with B's
  gold clasp) and the cape hangs from it. A pointed hood tail (liripipe) runs from the back of the
  hood down over the cape; it sways in the idle, trails back on the walk and is flung back by the
  loose, so the silhouette still flows like the Knight's plume.
- **The elf ear** pokes out through a slit in the hood's side, laid back.
- **A readable face.** The face is uncovered: a big near eye (navy lash row, a white highlight pixel,
  teal iris, 2x3), the far eye 1 px wide at the face's front, a pink blush pixel, a soft chin.
- **A bit Pokémon.** A larger, rounder head (13x10 against B's 10x10), the big bright eye, and clean
  colour blocks with 3-4 tones per material instead of B's 7-11 step fine ramps. Each block is its
  own material: green hood, mantle, cape and sleeves; a cream linen tunic; a brown belt with a gold
  buckle; dark leather breeches; tan boots. 30 colours on the sheet against B's 47.
- **The draw arm.** At the nock, draw and hold the string and arrow run to her far cheek *behind* her
  face (as they do on a real archer facing right), so the face stays clear: you see the elbow and
  green sleeve out behind the hood, the string's V converging on her cheek and the arrow from her
  face to the bow. The shot line is raised to cheek height (row 22, B: 24). On the loose the open
  hand flies back out past the hood. B's "leather bar under the chin" is gone.
- The bow at rest is a pixel further forward, so the string doesn't touch her face.

## Palette (30 colours, no pure black)

| material | ramp, dark to light |
|---|---|
| forest green (hood, mantle, cape, sleeves) | `#0c2b2c #145a3e #1f8c4a #47bf55 #a2ea6c` |
| linen (tunic) | `#6e4f4c #c4a693 #efdcc0 #fff8ea` |
| silver hair | `#3d3566 #857cb5 #c4bde6 #f6f2ff` |
| skin (+ blush `#f59a8c`) | `#8c3f48 #e0876c #fcc39e #ffe7d0` |
| leather, bow wood | `#331820 #6b3428 #a35a2e #dc9550` |
| accent amber/gold | `#7a2a10 #e07a1e #ffbf36 #fff3a8` |
| eye, string, glow, streak | `#1c2350 #28c2a6 #efe5d2 #b6ffdc #ffffff #efe9f7 #b9acd8` |

Edges step two tones down their own ramp (skin one), as in B.

## Measurements (48x48 frames, soles on row 39)

| | Knight (plumed) | Knight style B | Knight style E |
|---|---|---|---|
| head top to soles | 28 px (helm row 12, no plume) | 27 px (hair row 13) | 26 px (hood row 14) |
| idle frame 0 bounding box | 21x30 (with the plume) | 23x30 | 25x26 |
| idle bounding box, average | 23.4x28.3 | 23.4x29.6 | 25.4x25.8 |
| head | ~10x10 helm | 10x10 | 13x10 (hood included) |
| torso width at the chest | ~11 px of armour | 8 px | 8 px tunic (same build) |
| legs | 4-5 px | 3-4 px | 3-4 px |
| colours in idle / sheet | 140 | 42 / 47 | 28 / 30 |
| dark edge pixels, idle 0 | 73% | 59% | 52% |

## Weak spots

- The hood, its tail and the cape are one green, so the back of the figure is one large green mass;
  the hood tail reads more as part of the hood's back than as a separate plume.
- The breeches are dark and the legs read darker than B's.
- The draw hand is hidden behind her face at full draw; only the elbow, the string's V and the arrow
  show it.
- The ear sits on the outside of the hood, which is a stylisation.
- The frame is wider than the Knight's (the cape and the bow), and at 26 px she is 2 px shorter.
