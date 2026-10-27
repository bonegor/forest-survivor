# Paladin · Knight style D (squared hood)

`lab:paladin/knightstyle-d`, in the `Knight style · round 3` collection. This is Style A (`../a/`, game sprite `paladin_b`) with a reworked head, after the user's note on 27 October 2026: "rework so that the head is not so round, but a bit more like cylindrical instead and it does not look as attached from the body."

- **Source:** `paladin-d.px.js` and `make-sheet.mjs`, drawn with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl). They started as copies of Style A's `paladin-a.px.js` and `make-sheet.mjs`. Style A's folder is untouched and stays the reference.
  - No pixels were copied or traced from the Mattz Art knight or from any pack.
- **Sheet:** `sheets/paladin-knightstyle-d.png`, 1056x144. It holds 22 frames of 48x48 facing right, with rows `["right", "glow", "glowLeft"]` and the same glow colours as Style A.
- **Catalogue entry:** `entry.json` here. It is not in `catalog.json` yet.

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/paladin-knightstyle/d/paladin-d.px.js --out <scratch> --only paladin_d
node gms/3001/sprites/lab/src/paladin-knightstyle/d/make-sheet.mjs <scratch>/anims/paladin_d.png gms/3001/sprites/lab/sheets/paladin-knightstyle-d.png
```

`pxl check` passes with no warnings. `check-entry.mjs` reports "OK: bake-ready".

## What changed from Style A

Only the head, the neck and the root of the veil. The body, hammer, lower veil, cape lobe, colours, animation, attack and size are Style A's. Per frame, 103-112 pixels differ from Style A, almost all in rows 11-24. Below row 24, 0-3 pixels per frame differ: the veil's fold streaks shift a little because its root moved.

- **The head is a squared hood.** It used to be a round veil over the crown, 11x10, that tapered through the wimple straight into the gorget.
  - It is now a hand-drawn grid (`HEAD`): a coif 8 px wide and 9 px tall (x 19-26, rows 12-20 at rest), with a 1 px nose on the right (x 27). That makes it 9x9 with the nose.
  - It is a short upright cylinder:
    - The top row is a dark rim 6 px wide, with the corners cut by 1 px.
    - Under the rim the flat crown is a band of its own, the brightest cloth.
    - The gold circlet runs straight round it, with the holy gem (it glows) above the face.
    - Below the circlet the sides are straight. The side is shaded as a cylinder: a dark back edge, then a light vertical band toward the upper-left light, then the shade toward the face.
    - The lining of the face opening is a dark column that frames the face.
    - The wimple squares it off under the chin, and the bottom rim is dark with its corners cut.
  - The face is small: 3x4 skin (x 24-26, rows 15-18). It has a navy lid over a blue eye, a lit cheek, a chin shadow and a dark-red nose.
  - Every head pixel is placed by hand, edges included. Each edge is a dark cloth tone (or dark gold at the circlet's ends, and darker skin on the face's front). There is no pure black.
- **A neck sets the head apart.** A gorget of dark steel (`NECK`), 4x2 (x 21-24, rows 21-22), sits under the hood.
  - It is 2 px narrower than the hood on each side, and it has a single lit pixel.
  - Under it, the breastplate's light collar (row 23) and the near pauldron widen out again. The shoulder line dips in under the neck, as the Knight's does under his helm.
  - The neck moves with the head, so the idle's one-frame head lag stretches or squashes the neck by a row and never opens a gap.
- **The veil falls from behind the hood.**
  - Its root moved from the back of the crown, (18.6, 16) with a 3.0 radius, to behind the hood, (20, 16.5) with a 2.2 radius. It no longer bulges round the top of the head. Its second point moved to (18.6, 19.2).
  - From its third point on, the veil follows Style A's path and radii, so the fall and its motion are unchanged.
  - Where it shows beside the lower hood and the neck, it lies in the head's shadow: 2 tone steps darker beside the hood and 1 step beside the neck. The fold streak starts lower, so the hood's square back corner stands clear of it.
- The gem flash on idle frames 6-7 moved with the gem, to the head's (6, 2).

## Measurements (48x48 frames, soles on row 39)

| | Knight (plumed) | Style A (paladin_b) | Style D |
|---|---|---|---|
| idle frame 0 body | 21x30 | 25x28 (top row 12) | 25x28 (top row 12) |
| idle / walk box, average of the frames | ~23x28 | 28.0x27.6 / 29.8x27.5 | 28.0x27.6 / 29.8x27.5 |
| head | ~8-10 wide helm on a red collar | 11x10, round, tapering into the gorget | 8x9 hood plus a 1 px nose, square, flat top |
| neck | the collar under the helm | 3x1 dark row, mostly hidden by the wimple | 4x2 dark steel gorget, then the light collar row |
| colours (sheet / idle) | 146 | 40 / 38 | 40 / 38 |

Her total height and her sizes are unchanged. The top rows per frame are the same as Style A's: 12-13 in the idle and walk, and 3 at the smite.

## Frames

The head and the neck change in all 22 frames. Everything else is Style A's:
- idle 0-7: the head follows the breath a frame late.
- walk 8-15.
- attack 16-21: the hit on 19.

The overlaps were checked frame by frame:
- 17 (heave): the raised near arm and the haft pass behind the hood. The arm now shows at the hood's front edge.
- 18 (over the top): the near hand and the haft cross in front of the hood's lower front corner.
- 19-20: the pillar of light passes clear of the head.

## Weak spots

- **The face is small and blocky.** It is 3 px wide. Next to the hood's straight front edge it reads more like a window in a box than a softly framed face. At game size it is mostly the blue eye and the dark-red nose.
- **The hood can read as a helm.** The squared shape with the gold band and the dark rims can read as a white bucket helm at a glance, not a cloth hood. The veil behind it is what says "hood".
- **The veil root.** It is darker beside the lower hood (a cast shadow). On some idle frames that leaves a dull mauve patch behind the head's lower back.
- **The neck is dark.** The neck and the hood's dark bottom rim make three dark rows in a row. That reads as a clear gap at game size, but at 8x the gorget's own shape (one lit pixel) is modest.
- The style-wide weak spots of Style A still hold: 40 colours against the Knight's ~140, and the white veil is the biggest mass.
