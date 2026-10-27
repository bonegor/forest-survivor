# Berserker · Knight style A (Classic) (both eyes)

`lab:berserker/knightstyle-a2`, collection `Knight style · round 3`. Style A (`../a/`) reworked on the
owner's request of 27 October 2026: "Hero sprites - all past necromancer (druid, paladin, etc....) seem
to only be looking completely into one direction. Alter the way they are turned so that on the sprites,
both eyes are visible like in case of ranger, necromancer." Everything else (wolf hood, beard, body,
axes, cape, tail, colours, animation, attack) is A's, pixel for pixel, except one fist in frame 16
(below). A's own notes (design, palette, measurements, frames) are in `../a/NOTES.md` and still hold.

- Source: `berserker-a2.px.js`, a copy of `../a/berserker-a.px.js`, drawn with claude-pxl (MIT,
  https://github.com/augusto-scarvalho/claude-pxl). No pixels copied or traced from any pack.
- Sheet: `sheets/berserker-knightstyle-a2.png`, 1056x48: 22 frames of 48x48 facing right, soles on row
  39, rows `["right"]`. Nothing glows, as A.
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/berserker-knightstyle/a2/berserker-a2.px.js --out <scratch> --only berserker_a2
node gms/3001/sprites/lab/src/berserker-knightstyle/a2/make-sheet.mjs <scratch>/anims/berserker_a2.png gms/3001/sprites/lab/sheets/berserker-knightstyle-a2.png
```

## What changed from A

Two things in the source, nothing else:

1. **`HEAD`, the face rows** (rows 7-9 of the 17x17 head grid at (18, 9), drawn the same in every frame
   and moved only with the breath, the walk bob and the attack's lean, so the face never flickers). The
   face under the wolf's snout turns a little toward the viewer, in the 3/4 that Ranger B uses: near
   eye, a pixel of light skin at the bridge, far eye, the far cheek past it.

   ```
   A (profile)          A2 (turned)          col 6 ... 13 = x 24 ... 31 at rest
   ..2345kffffFr....    ..2345kfffrff....    the brow in the snout's shade, lighter (r) over the bridge: two brows
   ..2345krFexFP....    ..2345krexPxP....    near eye e x (x 26-27), bridge P (x 28), far eye x (x 29), cheek (x 30)
   ..1234krFFFPPF...    ..1234krFFPpPF...    the nose just under the bridge and far eye, its tip still a pixel proud
   ```

   - The near eye keeps A's two pixels, the pale white (`e`, #f4e8e0) behind the dark pupil (`x`,
     #1b0f1f), so the fierce pale stare stays; the far eye is one dark pixel, as Ranger B's far eye is
     one pixel of iris. Between them one pixel of the light skin (`P`), the 1 px spacing of Ranger B's
     3/4: a small turn, not a front view.
   - Past the far eye a pixel of cheek (`P`, laid on the edge as `F`), so the far eye reads as an eye
     and not a notch in the silhouette. The silhouette is A's: the face still ends at x 30 on the eye
     row and x 31 on the nose row.
   - The shadowed brow row stays dark (`f`) over both eyes, with a step lighter (`r`) over the bridge,
     which splits it into two heavy brows.
   - The nose moved from the front edge (A's profile) to just under the bridge and the far eye, its
     light (`p`) under the far eye; the tip still sits a pixel past the face.
2. **Attack frame 16 (the gather), the near fist**: `hand: [29, 18]` became `[31, 18]`. In A the near
   axe's haft ran diagonally across the face in this frame and the fist's knuckle pixel sat exactly
   where the far eye now is (A itself lost its pupil here). Two pixels forward, the haft passes in front
   of the far cheek instead and both eyes show. The forearm and the near axe in this one frame move with
   it; the pose and its read are the same.

The wolf hood, its eye and fangs, and the beard are unchanged: the beard already hangs under the middle
of the turned face (its brightest pixel sits under the bridge), so it needed no move.

Changed pixels against A: 9 px in every frame (all inside x 23-33, y 15-20: brow, eyes, nose), except
frame 16 with 86 (its face plus the moved fist, forearm and near axe, inside x 23-34, y 8-23); 275 in
all. 44 colours on the sheet, as A (no new colour).

## Checks

- Both eyes are on the sheet in all 22 frames (near pupil / far eye; the near white is a pixel behind
  the near pupil):
  - idle 0-3, 7: (27, 17) / (29, 17); breath 4-6: (27, 16) / (29, 16)
  - walk 8, 9, 12, 13: (28, 18) / (30, 18); walk 10, 11, 14, 15: (28, 17) / (30, 17)
  - attack 16, 17: (26, 18) / (28, 18); 18: (24, 18) / (26, 18); 19, 20: (30, 19) / (32, 19);
    21: (28, 18) / (30, 18)
- The face (8x4 px round the eyes) is the same pixels in every frame once the bob is taken out, except
  the far cheek's edge column where the near haft (16) or the near arm and the swoosh (17-19) lap over
  it, as in A. The eyes, brows and nose never change.
- `check-entry.mjs`: OK: bake-ready (44 colours, idle and walk feet row 39). `pxl check`: no warnings.

## Weak spots

- At 1x the eyes are a 4 px group (white, pupil, skin, pupil) under the snout; at --scale 6 they read as
  two eyes, at 1x as a dark-light-dark stare, about what Ranger B gives.
- The wolf snout's fang (x 27, row 15) sits two rows over the near eye's white; at 1x the two whites can
  read together as a taller glint, as they partly did in A.
- Frame 16 is the one frame with a non-face change (the fist two pixels forward); the axe head there sits
  two pixels further right over the hood.
- All of A's own weak spots (`../a/NOTES.md`) remain.
