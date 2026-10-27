# Druid · Knight style A (both eyes)

`lab:druid/knightstyle-a2`, collection `Knight style · round 3`. Style A (`../a/`) reworked on the
user's request of 27 October 2026: "Hero sprites - all past necromancer (druid, paladin, etc....) seem
to only be looking completely into one direction. Alter the way they are turned so that on the
sprites, both eyes are visible like in case of ranger, necromancer." Everything else (hood, antlers,
beard, robes, mantle, leaf skirt, staff, colours, animation, attack) is A's, pixel for pixel, except
one staff pixel shift on walk frame 11 (below). A's own notes (design, palette, measurements, frames)
are in `../a/NOTES.md` and still hold.

- Source: `druid-a2.px.js`, a copy of `../a/druid-a.px.js`, drawn with claude-pxl (MIT,
  https://github.com/augusto-scarvalho/claude-pxl). No pixels copied or traced from any pack.
- Sheet: `sheets/druid-knightstyle-a2.png`, 1056x144: 22 frames of 48x48 facing right, soles on row 39,
  rows `["right", "glow", "glowLeft"]`, the same five glow colours as A.
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/druid-knightstyle/a2/druid-a2.px.js --out <scratch> --only druid_a2
node gms/3001/sprites/lab/src/druid-knightstyle/a2/make-sheet.mjs <scratch>/anims/druid_a2.png gms/3001/sprites/lab/sheets/druid-knightstyle-a2.png
```

## What changed from A

Two things in the source, nothing else:

1. **`FACE`, the face grid** (5x5 at (27, 18) at rest, inside the hood's opening; drawn the same in
   every frame and moved only with the breath, the walk's bob and the attack's lean, so the face never
   flickers). The face turns a little toward the viewer, in the 3/4 that Ranger B (`archer_c`) uses:
   near eye, the lightest skin between, far eye, a pixel of cheek past it.

   ```
   A (profile)   A2 (turned)    x 27 ... 31   (the grid; as on the sheet, the part's rim steps a tone darker)
   UKLKV         UKVKV          one bushy brow over the eye -> two brows (x 28, x 30), the bridge (V) between
   VxVWW         VxWxV          one eye (x 28) -> near eye x 28, lightest skin (W) x 29, far eye x 30, cheek x 31
   UVVWV         UVVWV          (unchanged: the nose's light under the far eye)
   LMMLK         LMMLK          (unchanged: the moustache)
   LMMML         LMMML          (unchanged)
   ```

   On the sheet (after the rim darkens) the eye rows read `S J U J U` / `U x W x U`: two grey brow
   tufts on the brim's shadow, the two eyes (`x`, #1b1430) one pixel apart with the lightest skin
   between, and the far cheek in mid skin at the face's front edge. The head's size, the hood and
   the silhouette are unchanged; the hood's opening was wide enough for the turn.
2. **Walk frame 11 (`WALK`, `tip`)**: on the step where the staff swings furthest back, its upper knot
   fell exactly on the far eye (x 30, row 19), which would have blinked that eye out for one walk frame.
   The staff's top now leans one pixel further forward on that frame only (foot and hand unchanged), so
   the knot passes over the cheek pixel instead and the far eye stays.

Changed pixels against A: 3 px in each of 21 frames (all inside x 26-30, y 18-20: the brows and the
far eye, moved with the lean in the attack). Frame 11: 78 px (7 in the face, 71 the staff's shaft,
knots, claw and seed a pixel over) plus 11 px in each glow row (the seed moved with the staff). All
other glow rows are identical to A's. 40 colours, as A (no new colour).

## Checks

- Both eyes are on the sheet in all 22 frames: (28, 19) and (30, 19) at rest (idle 0-3, 7, walk 10,
  11, 14, 15); a row lower on the breath (4-6), the walk bobs (8, 9, 12, 13) and the blow (19);
  (26, 19)/(28, 19) on 16 and 21, (25, 19)/(27, 19) in the wind-up (17), (27, 19)/(29, 19) on 18 and
  (27, 20)/(29, 20) on 20, as the attack leans back and forward.
- The face's eye rows (x 27-31, from the brow row to the row under the eyes) are the same pixels in
  every frame once the bob and the lean are taken out, except at the front edge (the far cheek column,
  one pixel past the far eye): the staff laps over it in walk 10 (2 px) and 11 (2 px) and the raised
  arm over its lowest pixel in the wind-up 17, as in A. The eyes, the light between them and the brows
  never change.
- `check-entry.mjs`: OK: bake-ready (40 colours, idle and walk feet rows 39). `pxl check`: no warnings.

## Weak spots

- At 1x the eyes and the light between them are a 3 px group in a 5 px face, deep under the hood's
  brim: at --scale 3 and up they read as two dots, at 1x as a dark-light-dark glint, about what
  Ranger B gives.
- The two brow tufts are the ivory `J` against mid skin `U`, close in value: they read as grey brows
  mainly by hue. A's single brow bar read a touch bolder.
- The near eye has only one pixel of dark skin between it and the hood's shadow; on the wind-up (17)
  the raised arm darkens the area and the face is busiest there.
- All of A's own weak spots (`../a/NOTES.md`) remain.
