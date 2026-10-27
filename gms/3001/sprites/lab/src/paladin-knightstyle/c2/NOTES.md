# Paladin · Knight style C (barrel helm) (both eyes)

`lab:paladin/knightstyle-c2`, collection `Knight style · round 3`. Style C (`../c/`, the barrel helm)
reworked on the owner's request of 27 October 2026: "Hero sprites - all past necromancer (druid,
paladin, etc....) seem to only be looking completely into one direction. Alter the way they are turned
so that on the sprites, both eyes are visible like in case of ranger, necromancer." Everything else
(helm outline, band, wing crest, gorget, body, hammer, cape, veil, colours, animation, attack) is C's,
pixel for pixel. C's own notes (design, palette, measurements, frames) are in `../c/NOTES.md` and still
hold. Done the way the Sorcerer's A2 was (`../../mage-knightstyle/a2/NOTES.md`).

- Source: `paladin-c2.px.js`, a copy of `../c/paladin-c.px.js`, drawn with claude-pxl (MIT,
  https://github.com/augusto-scarvalho/claude-pxl). No pixels copied or traced from any pack.
- Sheet: `sheets/paladin-knightstyle-c2.png`, 1056x144: 22 frames of 48x48 facing right, soles on row 39,
  rows `["right", "glow", "glowLeft"]`, the same glow colours as C (`#ffe48a #fff6cf #fffef6`).
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/paladin-knightstyle/c2/paladin-c2.px.js --out <scratch> --only paladin_c2
node gms/3001/sprites/lab/src/paladin-knightstyle/c2/make-sheet.mjs <scratch>/anims/paladin_c2.png gms/3001/sprites/lab/sheets/paladin-knightstyle-c2.png
```

## What changed from C

One thing in the source: two rows of **`HELM`**, the face in the helm's front opening (the helm is 8x9
at (20, 12) at rest, painted the same in every frame and moved only with the bob, the breathing lag and
the attack's lean, so the face never flickers). The head turns a little toward the viewer, in the 3/4
that Ranger B uses: near eye, a pixel of light skin, far eye, cheek at the helm's front edge.

```
C (profile)     C2 (turned)     x 20 ... 27
.VuuuuV.        .VuuuuV.        (unchanged: flat top, cylinder shading, gold band)
...
VIjiFxPp        VIjixPxp        two dark lashes: near x 24, far x 26, skin between and past
VIjiPxXp        VIjiXpXP        near blue eye x 24, nose light (p) x 25, far blue eye x 26, cheek x 27
VIjIiFPr        VIjIiFPr        (unchanged: the chin row, the nose-shadow at the edge)
.VuhhuV.        .VuhhuV.
```

- C had one eye: a vertical dark lash at x 25 and the blue eye at x 26, with the nose's light at the
  helm's edge. C2 has two one-pixel blue eyes (`X`, #4f8fd8) on row 18 at rest, each under a dark lash
  (`x`, #1a1f42), with the lightest skin between: the 1 px spacing of Ranger B, a small turn, not a
  front view. The far eye has a pixel of cheek past it, so it reads as an eye, not a notch.
- The barrel helm itself is unchanged: a cylinder looks the same when it turns about the vertical, and
  its shape was what the owner asked for in C. The opening stays where it was (x 24-27); the turn shows
  only in the face inside it.

Changed pixels against C: 5 per frame in 19 frames (3 in frame 17, 4 in frame 18, where the arms cover
part of the face), all inside a 3x2 box (x 24-26, y 17-18 at rest). The glow rows are identical to C's.
45 colours, as C (no new colour).

## Checks

- Eye positions on the sheet (near, far): (24, 18) (26, 18) at rest (idle 0-3, 7); a row lower on the
  breathing lag (idle 4-6: (24, 19) (26, 19)); walk (25, 18) (27, 18), a row lower on the bobs (8, 9,
  12, 13); wind-up 16 (23, 18) (25, 18); smite and follow-through 19-20 (26, 19) (28, 19); recover 21
  (25, 18) (27, 18).
- Frames 17 and 18: only the near eye shows, (23, 18) on 17 and (25, 18) on 18; the raised gauntlets
  and the hammer's haft cross the front of the helm there, as they did in C (where the single eye was
  covered entirely on both).
- The two eyes and lashes are the same 4 px shape in every frame they show, moving only with the head.
- `check-entry.mjs`: OK: bake-ready (45 colours, feet row 39). `pxl check`: no warnings.

## Weak spots

- Frames 17 (loaded overhead) and 18 (the swing) show one eye only: the arms cover the far one. Uncovering
  it would mean changing the attack, which was to stay.
- At 1x the face is a 3x2 group: two dark lashes over two blue dots. At --scale 6 it reads clearly as two
  eyes; at 1x as a blue-eyed face looking out at the viewer, a touch more frontal than the helm's side-on
  cylinder shading suggests.
- C's profile nose at the helm's edge is gone (the edge is now cheek); the face is rounder and younger.
- All of C's own weak spots (`../c/NOTES.md`) remain.
