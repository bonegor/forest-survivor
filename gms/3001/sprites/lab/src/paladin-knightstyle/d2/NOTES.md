# Paladin · Knight style D (squared hood) (both eyes)

`lab:paladin/knightstyle-d2`, collection `Knight style · round 3`. Style D (`../d/`, the squared hood)
reworked on the owner's note of 27 October 2026: "Hero sprites - all past necromancer (druid, paladin,
etc....) seem to only be looking completely into one direction. Alter the way they are turned so that on
the sprites, both eyes are visible like in case of ranger, necromancer." Everything else (the squared
hood and its circlet, the gorget neck, body, hammer, veil, cape, colours, animation, attack) is D's,
pixel for pixel. D's own notes (design, measurements, frames) are in `../d/NOTES.md` and still hold.

- Source: `paladin-d2.px.js`, a copy of `../d/paladin-d.px.js`, drawn with claude-pxl (MIT,
  https://github.com/augusto-scarvalho/claude-pxl). No pixels copied or traced from any pack.
- Sheet: `sheets/paladin-knightstyle-d2.png`, 1056x144: 22 frames of 48x48 facing right, soles on row 39,
  rows `["right", "glow", "glowLeft"]`, the same four glow colours as D.
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/paladin-knightstyle/d2/paladin-d2.px.js --out <scratch> --only paladin_d2
node gms/3001/sprites/lab/src/paladin-knightstyle/d2/make-sheet.mjs <scratch>/anims/paladin_d2.png gms/3001/sprites/lab/sheets/paladin-knightstyle-d2.png
```

## What changed from D

One thing in the source: four rows of **`HEAD`**, the hand-drawn hood grid (9x9 at (19, 12), drawn the
same in every frame and moved only with the breath, the walk bob and the attack's lean, so the face
never flickers). The face turns a little toward the viewer, in the 3/4 that Ranger B uses: near eye,
one pixel of light skin between, far eye, a pixel of cheek past the far eye.

```
D (profile)      D2 (turned)      x 19 ... 27
.233332..        .233332..        (top rim, unchanged)
17999873.        17999873.        (crown, unchanged)
twxxwvXu.        twxxwvXu.        (circlet and gem, unchanged; the gem now sits over the bridge of the nose)
17973mnm.        1793nonm.        the lining (3) a pixel nearer the back, x 22; forehead x 23-26, lit near, shaded far
18973nen.        1893nene.        two navy lids: near x 24, far x 26, light skin between
18963obnl        1893obobm        two blue eyes under them; lit nose bridge (o) x 25; far cheek (m) x 27 where the nose was
17864nnm.        1784nnmm.        chin, shaded toward the far side
16876554.        16876554.        (wimple, unchanged)
.122111..        .122111..        (bottom rim, unchanged)
```

- The squared hood keeps its outline exactly: same top rim, flat crown, circlet, straight back and
  wimple, and the head's silhouette is the same pixels as D's (the old nose's place at (27, 17) is now
  the far cheek). A cylinder looks the same when it turns about the vertical, so only the face
  opening moves: its lining steps one pixel toward the back (x 23 to x 22), the side's shade step
  beside it gives way, and the face is 4 px wide instead of 3 (x 23-26, plus the cheek at x 27).
- Each eye is D's eye: a navy lid (`e`) over a blue iris (`b`), 1x2, the two 1 px apart.
- The light is still upper-left: the near cheek and the forehead toward it are the lighter skin (`n`,
  `o`); the far cheek and the chin's far side are the darker `m`.
- D's dark-red nose pixel (`l`, #7a3a3e) is gone: the bridge between the eyes is the nose now. That
  colour was used nowhere else, so the sheet has 39 colours (D: 40). No new colour.

Changed pixels against D: 17 in every frame, all inside the face (x 22-27, y 15-18 at rest, moved
with the bob and lean). The glow rows are identical to D's.

## Checks

- Both eyes are on the sheet in all 22 frames (lids; the irises one row lower):
  - idle 0-3, 7 and recover 21: (24, 16) and (26, 16); idle 4-6 (breath): (24, 17)/(26, 17)
  - walk 10, 11, 14, 15 and attack 18: (25, 16)/(27, 16); walk 8, 9, 12, 13 and attack 19, 20: (25, 17)/(27, 17)
  - attack 16 (wind-up): (23, 17)/(25, 17); attack 17 (heave): (23, 15)/(25, 15)
- The face is the same 17 changed pixels in every frame; nothing laps over it in any frame (the raised
  arm on 17 and the haft on 18 pass behind or below it, as in D). The eyes never change.
- `check-entry.mjs`: OK: bake-ready (39 colours, feet row 39, idle top rows 12-13). `pxl check`: no warnings.

## Weak spots

- At 1x the face is a 4x4 window: the two lids and the light between them read as a pair of dots at
  --scale 3, and as a dark-light-dark flicker at 1x, about as Ranger B's does.
- With the eyes centred in a square opening, the face is close to a front view; the turn is carried by
  the shading (lit near cheek, dark far cheek) and the far cheek past the hood's front edge more than by
  the eyes' spacing, which has no room to be uneven in 4 px.
- Losing the dark-red nose tip makes her face softer and plainer than D's profile.
- All of D's own weak spots (`../d/NOTES.md`) remain, including the hood reading as a helm at a glance.
