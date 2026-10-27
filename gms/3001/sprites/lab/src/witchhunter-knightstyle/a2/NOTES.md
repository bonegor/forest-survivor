# Witch Hunter · Knight style A (both eyes)

`lab:witchhunter/knightstyle-a2`, collection `Knight style · round 3`. Style A (`../a/`) reworked on the
owner's request of 27 October 2026: "Hero sprites - all past necromancer (druid, paladin, etc....) seem
to only be looking completely into one direction. Alter the way they are turned so that on the sprites,
both eyes are visible like in case of ranger, necromancer." Done as the Sorcerer's A2
(`../../mage-knightstyle/a2/`). Everything else (hat, hair, coat, tails, crossbow, colours, animation,
attack) is A's, pixel for pixel. A's own notes (design, palette, measurements, frames) are in
`../a/NOTES.md` and still hold.

- Source: `witchhunter-a2.px.js`, a copy of `../a/witchhunter-a.px.js`, drawn with claude-pxl (MIT,
  https://github.com/augusto-scarvalho/claude-pxl). No pixels copied or traced from any pack.
- Sheet: `sheets/witchhunter-knightstyle-a2.png`, 1056x144: 22 frames of 48x48 facing right, soles on
  row 39, rows `["right", "glow", "glowLeft"]`, the same glow colour as A (`#dff6ff`).
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/witchhunter-knightstyle/a2/witchhunter-a2.px.js --out <scratch> --only witchhunter_a2
node gms/3001/sprites/lab/src/witchhunter-knightstyle/a2/make-sheet.mjs <scratch>/anims/witchhunter_a2.png gms/3001/sprites/lab/sheets/witchhunter-knightstyle-a2.png
```

## What changed from A

One thing in the source: **`FACE`**, the face grid (14x5 at (14, 18), drawn the same in every frame and
moved only with the breath, the walk's bob and the attack's lean, so the face never flickers). The face
turns a little toward the viewer, in the 3/4 that Ranger B (`archer_c`) uses: near eye, light skin
between, far eye, a pixel of cheek past the far eye.

```
A (profile)        A2 (turned)        x 18 ... 27
bdeedjkkj.         bdeedjkkj.         forehead in the brim's shade (unchanged)
bdedjklvl.         bdedkvmvl.         near eye x 23, nose bridge (m) x 24, far eye x 25, far cheek x 26
bcedjlmmmk         bcedjlmmmk         the nose a pixel proud at x 27 (unchanged)
bcdcjklmi.         bcdcjklik.         mouth moved in from the edge (x 26 to x 25), the chin's far side past it
.bcbijkj..         .bcbijkj..         chin (unchanged)
```

- The eyes are one pixel each (`v`, #1a1430), on row 19 at rest, with one pixel of light skin (`m`)
  between them: the 1 px spacing of Ranger B's and the Sorcerer A2's 3/4, a small turn, not a front
  view. The far eye keeps A's place (x 25) and its cheek pixel (x 26), so it reads as an eye rather than
  a notch in the silhouette; the near eye is new at x 23, where A had mid skin.
- The near temple (x 22, row 19) is a step lighter (`j` to `k`), so the near eye sits on skin and not
  against the hair's shadow.
- The mouth moves a pixel in from the profile's edge, as a turned face's mouth sits inside the far
  cheek; the skin past it (`k`) closes the chin's far side.
- The silhouette is unchanged: the face, the nose tip and the chin keep A's outline, the hat's brim is
  untouched (its shape was to stay).

Changed pixels against A: 5 in every frame (3 on the eye row, 2 on the mouth row), all inside
x 21-27, y 19-23. The glow rows are identical to A's. 50 colours, as A (no new colour).

## Checks

- Both eyes are on the sheet in all 22 frames: (23, 19) and (25, 19) at rest (idle 0-3, 7; attack
  16, 20, 21), a row lower on the breath (4-6): (23, 20)/(25, 20); in the walk one pixel forward,
  (24, 19)/(26, 19) and a row lower on the bobs (8, 9, 12, 13); aim (17) (24, 20)/(26, 20), hold (18)
  (24, 21)/(26, 21); the loose's recoil (19) (22, 19)/(24, 19).
- Every frame has exactly the same 5 changed pixels, so nothing laps over the new face pixels; the face
  rows are the same pixels in every frame once the bob is taken out (except where A's collar or the
  crossbow's stock meets the chin on frames 6, 17 and 18, as in A). The eyes never change.
- `check-entry.mjs`: OK: bake-ready (50 colours, feet row 39). `pxl check`: no warnings.

## Weak spots

- The face is tiny (5x5 of skin), so the two eyes and the light between them are a 3 px group: at
  --scale 6 they read as two dots, at 1x as a dark-light-dark band under the brim, about what Ranger B
  and the Sorcerer A2 give.
- With the near eye at x 23 only one pixel of temple sits between it and the hair, so the face reads a
  touch more frontal than Ranger B's, whose face is wider; shifting the face a pixel forward instead
  (eyes x 24/26) was tried and made the face bulge past the brim's line, so A's silhouette was kept.
- The brim's shade is still one row (the forehead), as in A; the eyes sit on lit skin just under it.
- All of A's own weak spots (`../a/NOTES.md`) remain.
