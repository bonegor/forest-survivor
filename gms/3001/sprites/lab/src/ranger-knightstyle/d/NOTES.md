# Ranger · Knight style D (Pokémon)

`lab:archer/knightstyle-d`, in the `Ranger · Knight style` collection. A comparison candidate:
Style B (the base the user preferred) shifted *a bit* toward a Gen 4-5 (Black/White) Pokémon trainer
sprite, while staying in the plumed Knight's manner. Not full chibi: "B, but cuter and cleaner".

- Source: `ranger-d.px.js`, drawn with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl),
  started from a copy of `../b/ranger-b.px.js` (same compositor, poses and frame layout). No pixels were
  copied or traced from the Mattz Art knight or any pack.
- Sheet: `sheets/archer-knightstyle-d.png`, 4224x144: 88 frames of 48x48 facing right, rows
  `["right", "glow", "glowLeft"]`, the same layout as B and `archer-silverleaf-picked.png`.
- Catalogue entry: `entry.json` here (not yet in catalog.json).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/ranger-knightstyle/d/ranger-d.px.js --out <scratch>
node gms/3001/sprites/lab/src/ranger-knightstyle/d/make-sheet.mjs <scratch>/anims/ranger_d.png gms/3001/sprites/lab/sheets/archer-knightstyle-d.png
```

`make-sheet.mjs` is B's, unchanged but for its paths: the glow rows hold only the `#b6ffdc` pixels
(moonstone in the grip, arrowhead). `pxl check` passes with no warnings.

## Frames

The same as B (see ../b/NOTES.md): idle 0-7, walk 8-15, attack 16-23 at 14 fps with the loose on 21
(attackRelease 5), attackWalk 24-87 (attack pose k over walk step j at 24 + 8k + j).

## What changed from B

- **Head.** 12x11 instead of 10x10, rounder, set a row lower so her height stays put. The silver hair
  is swept back under a short fringe with skin between its tips, so the face is open: a big near eye
  (a dark 2 px lid, then a white glint beside a dark pupil, a teal iris under), the far eye 1 px on the
  face's edge, the nose the lightest skin, a 1 px salmon smile. The elf ear is a clean wedge drawn
  after the head, its tip poking out past the hair into the gap before the ponytail.
- **Colour blocks.** Every material has 3-4 flat tones plus its edge tone (29 colours on the sheet,
  26 in idle; B had 47/42). More saturated and brighter: a bright green tunic against a darker green
  cape, cowl and trousers, lavender-silver hair, warm orange leather, gold accents. No grainy
  half-tone ramps and almost no strand streaks (one short highlight on the ponytail near its root).
- **Edges.** Still no black. The compositor now gives a part's silhouette edge (facing empty space)
  the darkest tone of its material, and its edge against a part already laid behind it only two steps
  down, so the outside reads crisp and the inside stays clean.
- **Ponytail.** A big high ponytail (think Hilda) that arcs up over the tie and falls back away from
  the head, so it moves like the Knight's plume; it ripples, streams and is flung as in B.
- **The draw arm (B's "leather bar").** The far arm is now a green sleeve throughout. At full draw
  the upper arm rises behind her with the elbow out past the ponytail, the forearm passes behind the
  head, and only a leather-gloved hand shows, at the jaw. On the loose the gloved hand flies open
  out behind her.

## Palette (29 colours)

| material | edge, shadow ... light |
|---|---|
| silver hair (violet-lavender) | `#3b3668 #8681b8 #cbc9ea #f8f7ff` |
| skin | `#a8503f #ee9f7c #ffd5b2 #fff1e0`, mouth `#f2826e` |
| green | `#0d3a2a #17683d #25984c #40c256 #97ea70` |
| leather, bow wood | `#3e1b16 #7f3d1f #bb672c #eba653` |
| gold accent | `#83340a #ec8510 #ffcb3c #fff4ae` |
| eye, string, glow, white, streak | `#1d2456 #20c6a6 #e6e0f6 #b6ffdc #ffffff #e6e2ff #a59fdc` |

## Measurements (48x48 frames, soles on row 39)

| | Knight (plumed) | Knight style B | Knight style D |
|---|---|---|---|
| head top to soles (no plume / ponytail) | 28 px (helm row 12) | 27 px (row 13) | 27 px (row 13) |
| idle frame 0 bounding box (everything) | 21x30 | 23x30 | 23x30 |
| idle bounding box, average | 23.4x28.3 | 23.4x29.6 | 24.1x29.6 |
| head | ~10x10 helm | 10x10 | 12x11 (plus the ear tip) |
| torso width at the chest | ~11 px armour | 8 px (10 with the near arm) | 8 px (10 with the near arm) |
| colours in idle | 140 | 42 | 26 |
| pure black pixels | 0 | 0 | 0 |

## Open points

- The ponytail is bigger than B's and rises 3 px over the head (the Knight's plume about 2), and it
  makes the average idle box 0.7 px wider than B's.
- The "dark edge" share of idle 0's silhouette measures 38% by the compare script's threshold (sum
  of RGB under 150), because the hair's edge tone `#3b3668` is a lighter violet than that threshold;
  every silhouette pixel is still its material's darkest tone.
- The draw hand at the jaw is mostly covered by the arrow's fletching at full draw; the pose reads
  from the raised elbow behind her.
- fitW/fitH/motionRate in entry.json are copied from B (same frame layout and size).
