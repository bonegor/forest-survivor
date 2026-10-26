# Witch Hunter · Knight style B (Inquisitor)

`lab:witchhunter/knightstyle-b`, collection `Knight style · round 3`. Mercy Crane redrawn as a grim inquisitor in the
plumed Knight's style. Drawn with claude-pxl (MIT). No pixels were copied or traced from the Mattz Art knight or any pack.
The compositor (parts edged in their own dark tones, round limbs, flowing strands) is Ranger C's, reused.

- Source: `witchhunter-b.px.js`; `make-sheet.mjs` adds the glow rows.
- Sheet: `sheets/witchhunter-knightstyle-b.png`, 1056x144: 22 frames of 48x48 facing right, rows `["right","glow","glowLeft"]`.
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild (from the repo root)

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/witchhunter-knightstyle/b/witchhunter-b.px.js --out <scratch>
node gms/3001/sprites/lab/src/witchhunter-knightstyle/b/make-sheet.mjs <scratch>/anims/witchhunter_b.png gms/3001/sprites/lab/sheets/witchhunter-knightstyle-b.png
```

`pxl check` passes with no warnings. The glow rows hold only `#dff6ff` (the bolt head and the streak's head).

## Design

- **Hat:** a tall capotain crown (5 rows, lit on its back), a crimson band with a silver buckle at the front, a
  12-13 px brim dipping over the eyes at the front. Its crown top is row 12, level with the Knight's helm top.
- **Head:** a small profile face in the brim's shadow (one dark eye, the nose a pixel proud, a grim mouth), brown hair
  tied back at the nape.
- **Coat (main material):** slate, violet-black in the shadows and warm grey in the light. A leaning chest, a leather
  baldric with silver buckles, a belt with a silver buckle, an A-line skirt with a fold, and two split tails from the
  hips that stream behind like the Knight's cape (an outer lit lobe and an inner shaded one a frame behind).
- **Scarf (the one accent):** crimson, wound at the throat with a knot, its two long ends flying back from the nape
  like the plume. The hat band and a crimson stone in the stock repeat it.
- **Crossbow:** heavy and ornate: a three-pixel recurved silver prod with bright tips, a silver rail on a walnut stock
  flaring to a silver butt plate, silver inlay, a lock plate, a trigger and a crimson stone. The string is spanned to
  the nut; a silver bolt with a glowing head lies on the rail.

## Palette (44 colours on the sheet, 42 in idle)

| material | ramp, dark to light |
|---|---|
| coat, hat | `#161221 #211b30 #2d2741 #3a3553 #4a4766 #5d5c7c #747593 #9190ab #bcb3c6` |
| crimson | `#2a0410 #4a0716 #6e0b1c #961322 #be1d2b #e0383a #ff7a5c` |
| silver | `#251f38 #403a5a #67628a #9894b2 #c6c2d8 #ece6f2 #ffffff` |
| skin | `#4a1d2a #6f333a #94494a #b56a5b #d68a6c #e7aa88` |
| hair | `#22101a #3a1a1c #57281f #763a26 #955430 #b06f3c` |
| leather, walnut | `#170d16 #24131c #331b22 #45242a #5a3030 #713e37 #8c5242` |
| eye, string, glow | `#141a33 #d8ccd2 #dff6ff` |

## Measurements (48x48 frames, soles on row 39)

| | Knight (plumed) | current Witch Hunter | Style B (Inquisitor) |
|---|---|---|---|
| top to soles | 30 px (plume), helm top row 12 | 35 px (hat top row 5) | 28 px (hat crown row 12) |
| idle frame 0 box | 21x30 | 26x35 | 29x28 (the crossbow and scarf included; the figure itself is about 15 px wide, the brim 13) |
| idle boxes over the 8 frames | | | 28-32 x 27-28 |
| attack release (f19) box | | | 39x28 (the streak runs to the frame's edge) |
| colours | ~140 | 18 | 44 (42 in idle) |
| outline | none | black, 100% | none (no pure black) |

## Frames

- **Idle 0-7:** a breath (the chest sinks a pixel on f3-5, the head a frame later). The scarf ends lift and fall in the wind, a
  beat apart. The coat tails ripple and swing out and back.
- **Walk 8-15:** the Ranger's gait under the coat, the body low on the contacts, the upper body a pixel forward. The tails
  and scarf stream back. The skirt's front edge kicks with the near leg.
- **Attack 16-21 (12 fps; attackRelease null = index 3, frame 19):**
  - 16: the crossbow swings up, nose high.
  - 17: she shoulders it and leans in, the cheek to the rail.
  - 18: the hold. The bolt head glints.
  - **19, the loose:** the bolt is gone. A silver streak runs from the nose to the frame's edge, and a white flash
    crescent with sparks comes off the snapping prod. The prod springs flat and the string goes straight. The recoil
    kicks the nose up and rocks her back a pixel. The scarf and tails are flung back.
  - 20: the follow-through. The streak breaks into dashes.
  - 21: the reload. The crossbow comes down nose-low at the hip and the far hand hauls the string back toward the nut.

## Weak spots

- **The coat is dark.** The figure is mostly slate on a dark-green ground, so it reads lower in value than the steel
  Knight. Silver, the face, the hat crown and the crimson carry the contrast.
- **The idle waist is busy.** The far arm crosses the waist to the fore-stock, over the stock and belt.
- **The long coat hides the thighs,** so the walk's stride shows mostly in the boots and the tails.
- **The streak is short.** The crossbow's nose sits at x ≈ 37, so it runs only about 10 px to the frame's edge.
  The flash crescent makes the release frame readable, but it is smaller than the Knight's swoosh.
- **The reload is brief.** In frame 21 the string-hauling hand is small and the action is hard to read.
- **44 colours** against the Knight's ~140: no anti-aliasing beyond the ramps.
