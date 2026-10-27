# Sorcerer · Knight style A (both eyes)

`lab:mage/knightstyle-a2`, collection `Knight style · round 3`. Style A (`../a/`, game sprite `mage_b`)
reworked on the user's request of 27 October 2026: "rework style A so that its head is oriented ever so
slightly more towards the user so that both eyes are visible. Like with ranger style B both eyes are
visible, so should the sorcerer." Everything else (body, staff, fire, robe, hat, colours, animation,
attack) is A's, pixel for pixel. A's own notes (design, palette, measurements, frames) are in
`../a/NOTES.md` and still hold.

- Source: `mage-a2.px.js`, a copy of `../a/mage-a.px.js`, drawn with claude-pxl (MIT,
  https://github.com/augusto-scarvalho/claude-pxl). No pixels copied or traced from any pack.
- Sheet: `sheets/mage-knightstyle-a2.png`, 1056x144: 22 frames of 48x48 facing right, soles on row 39,
  rows `["right", "glow", "glowLeft"]`, the same six glow colours as A.
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/mage-knightstyle/a2/mage-a2.px.js --out <scratch> --only mage_a2
node gms/3001/sprites/lab/src/mage-knightstyle/a2/make-sheet.mjs <scratch>/anims/mage_a2.png gms/3001/sprites/lab/sheets/mage-knightstyle-a2.png
```

## What changed from A

Two things in the source, nothing else:

1. **`HEAD`, the face grid** (11x6 at (19, 16), drawn the same in every frame and moved only with the
   breath and the attack's lean, so the face never flickers). The face turns a little toward the
   viewer, in the 3/4 that Ranger B (`archer_c`) uses: near eye, the nose's light between, far eye.

   ```
   A (profile)        A2 (turned)          x 19 ... 29
   uhHIkfffF..        uhHIkffffF.          forehead in the brim's shade, a pixel wider
   uhIJFJjjJP.        uhIrJjJPjJ.          two brows: near x 23-25, the bridge (P) x 26, far x 27-28
   uhHIFFxFPpP        uhHrFFxpxP.          near eye x 25, nose light (p) x 26, far eye x 27, far cheek x 28
   .hIJjFrPjj.        .hIJFFrPppP          the big nose under the far eye, its tip a pixel proud (x 29)
   .hIJjWjJWj.        .hIJjWjWrfj          shadow under the nose tip (r f), the moustache both sides of it
   ..JjWjWJjJ.        ..JjWjWJjJ.          (unchanged)
   ```

   - The eyes are one pixel each (`x`, #1d1433), on row 18 at rest, with one pixel of the lightest skin
     between them: the 1 px spacing of Ranger B's 3/4, a small turn, not a front view. The far eye has
     a pixel of cheek past it (its edge steps to `F`), so it reads as an eye rather than a notch in
     the silhouette.
   - The near temple (x 22, rows 17-18) is skin a step darker (`r`) where A had hair: as the head
     turns, a little more of the near side of the face shows. The hair still frames the face at x 19-21
     and as the side whisker at x 22 below.
   - The bushy white brows sit right over the eyes; the far brow's end steps to grey at the edge.
   - The nose moved from the eye row (A's profile hook) to just under the far eye, still big and still
     a pixel past the face.
2. **`BEARD0`**: the beard's root moved about 0.8 px forward (24.8 to 25.6 at the chin, tapering to
   0.1 px at the tip), so it hangs from under the turned face's mouth. It shows mostly in the attack's
   wind-up (frames 17-18), where the throwing arm is behind the head; elsewhere the near sleeve covers
   most of it, as in A.

The hat (cone, band, brim) is unchanged: a round brim and a cone look the same when the head turns
about the vertical, and the hat's shape was to stay.

Changed pixels against A: every frame, 33-49 px each, all inside x 20-30, y 15-31 (face, moustache
and beard). The glow rows are identical to A's. 46 colours, as A (no new colour).

## Checks

- Both eyes are on the sheet in all 22 frames: (25, 18) and (27, 18) at rest, a row lower on the
  breath (4-6) and walk bobs, (24, 18)/(26, 18) and (24, 17)/(26, 17) in the wind-up (17, 18), and
  (26, 18)/(28, 18) in the throw and follow-through (19, 20).
- The face rows (x 22-29, y 16-20) are the same pixels in every frame once the bob is taken out, except
  where the near sleeve or the hand flame laps over the moustache or the nose tip (1-3 px in frames 6,
  8, 9, 12, 15, 16 and 19), as they did in A. The eyes and brows never change.
- `check-entry.mjs`: OK: bake-ready (46 colours, feet row 39). `pxl check`: no warnings.

## Weak spots

- At 1x the two eyes and the light between them are a 3 px group; at --scale 3 they read as two dots,
  at 1x as a dark-light-dark flicker of a face, which is about what Ranger B gives too.
- The profile's hooked nose at eye level was much of A's old-wizard character; turned, the face is
  rounder and a touch more cartoon. The white brows, the moustache and the big nose tip carry the age.
- The hand flame still touches the nose tip in walk 8-9 and attack 16 (unchanged from A).
- All of A's own weak spots (`../a/NOTES.md`) remain.
