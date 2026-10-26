# Witch Hunter · Knight style A (Classic)

`lab:witchhunter/knightstyle-a`, in the `Knight style · round 3` collection. A faithful redraw of Mercy Crane
in the plumed Knight's style: the wide-brimmed grey hat, the long grey-blue coat, the brown hair and the silver
crossbow.

- Source: `witchhunter-a.px.js`, drawn with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl),
  on Ranger C's small compositor (parts edged in their own darker tones). No pixels were copied or traced from
  the Mattz Art knight or any pack.
- Sheet: `sheets/witchhunter-knightstyle-a.png`, 1056x144: 22 frames of 48x48 facing right, rows
  `["right", "glow", "glowLeft"]`.
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/witchhunter-knightstyle/a/witchhunter-a.px.js --out <scratch> --only witchhunter_a
node gms/3001/sprites/lab/src/witchhunter-knightstyle/a/make-sheet.mjs <scratch>/anims/witchhunter_a.png gms/3001/sprites/lab/sheets/witchhunter-knightstyle-a.png
```

`make-sheet.mjs` is Ranger C's, set to 22 frames; the glow rows hold only `#dff6ff` (the silver bolt's head,
and the bolt at the head of the streak on the release). `pxl check` passes with no warnings.

## Design

- **Hat** (the silhouette key): a capotain-like crown, rows 11-15, lit from the upper left, the red band with
  a brass buckle at the front, an 18 px brim (lit top, shadowed underside, its ends curving down).
- **Head**: a small face in 3/4 to the right under the brim (one dark eye pixel, a nose one pixel proud,
  the mouth, the chin), brown hair at the back; a hair strand falls to the shoulder blades and sways.
- **Coat**: a slim grey-blue frock coat lit on the left, a row of silver buttons down the front, a white
  falling-band collar at the throat, a leather belt with a brass buckle, the skirt flaring over the hips.
  Two tails (outer lit, inner in shade) fall from the back of the waist and flap out like the Knight's cape.
- **Legs**: grey-blue breeches, tall leather boots with a turned-down cuff at the knee.
- **Arms**: grey-blue sleeves, pale turned-back cuffs, leather gloves.
- **Crossbow**: a walnut stock lit along its top with a deeper butt, a silver lock plate and trigger, a
  silver prod across the nose (recurved tips), the string spanned to the nut, a silver bolt with pale
  fletching and a glowing head.

## Frames (attackFps 12, attackRelease null = attack index 3, frame 19)

- 0-7 idle: the crossbow level at the hip; a breath (chest down on 3-5, head a frame later, the nose dips a
  hair); the tails ripple and stream in and out; the hair sways a beat behind.
- 8-15 walk: Ranger C's gait (planted stride, body low on the contacts), the crossbow bobbing a little,
  the tails streaming back and lifting, the hair swept back.
- 16 raise (nose up), 17 aim (at the shoulder, head down to the stock), 18 hold (a crouch, the bolt's head
  flares), **19 loose** (white flash burst at the prod, a 5-row silver streak to the frame edge with the
  glowing bolt at its head, speed lines; the prod snaps flatter and the string straight; recoil: the nose
  kicks up, the upper body rocks back a pixel, the hat jolts up, the tails fling back and up),
  20 follow-through (the streak breaks into dashes and sparks), 21 reload (nose down, her near hand
  drawing the string back to the nut).

## Palette (50 colours on the sheet)

| material | ramp, dark to light |
|---|---|
| coat (main) | `#16142b #201f3b #2b2f4d #384360 #4a5674 #5d6b88 #75829d #909cb2 #afb6c8 #d4d1dc` |
| hat felt | `#1b1524 #282031 #362d41 #463c52 #594f66 #6f657c #8a8096 #aca1b5` |
| hair | `#22110f #3a1a14 #56271a #733922 #924f2b #b06a39 #c98b52` |
| skin | `#4a1d2a #6f333a #94494a #b56a5b #d68a6c #e7aa88 #f8c9a4` |
| red band (accent) | `#2b0612 #510b17 #7c141b #a8221f #cf3e27 #ef6a3e` |
| brass | `#4a250c #8a5418 #c98d2c #f3cf68` |
| silver (prod, bolts, collar, streak) | `#2a2539 #433e58 #645e7c #8a84a0 #b0aac2 #d3cddd #eee7f0 #ffffff` |
| leather / walnut | `#1f0f15 #30171a #46221f #5f3025 #7a432e #955a39 #b0744a` |
| eye, glow | `#1a1430`, `#dff6ff` |

## Measurements (48x48, soles on row 39)

| | Knight (plumed) | current Witch Hunter (v1) | Style A |
|---|---|---|---|
| idle frame 0 body box | 21x30 | 26x35 | 24x29 (crossbow included) |
| top of everything | helm row 12, plume row 10 | hat row 5 | hat crown row 11 |
| head | ~10x10 helm | 18 px brim, 6 px face | 18 px brim, crown 7 wide, face 5x5 |
| colours | 146 (shown frames) | 18 | 50 (sheet), 49 in the shown frames |
| outline | none | black, 100% | none (no pure black pixel) |

## Weak spots

- 50 colours against the Knight's ~140: ramps but little anti-aliasing.
- The arms sit over a coat of the same material, so the sleeves read weakly; the hands and the crossbow stock
  make a busy brown cluster at the waist in idle and walk.
- The crown reads a little like a top hat at zoom rather than a tapered capotain.
- The raise (16) and reload (21) frames are the least clean: the rotated stock steps, and the prod crosses
  the face on 16.
- The face is lit fairly evenly; the brim's shadow is only one row.
