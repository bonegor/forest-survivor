# Paladin · Knight style A (Classic)

`lab:paladin/knightstyle-a`, in the `Knight style · round 3` collection. This is a faithful redraw of Dame Seraphine in the plumed Knight's style: her white veil, white and silver plate, gold trim and warhammer. The other round-3 Paladin look is B ("Crusader"), drawn by another artist.

- **Source:** `paladin-a.px.js` and `make-sheet.mjs`, drawn with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl).
  - The small compositor (parts edged in their own darkest tones, plus round limbs and flowing strands) comes from `../../ranger-knightstyle/c/ranger-c.px.js`.
  - No pixels were copied or traced from the Mattz Art knight or from any pack.
- **Sheet:** `sheets/paladin-knightstyle-a.png`, 1056x144. It holds 22 frames of 48x48 facing right, with rows `["right", "glow", "glowLeft"]`.
- **Catalogue entry:** `entry.json` here. It is not in `catalog.json` yet.

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/paladin-knightstyle/a/paladin-a.px.js --out <scratch> --only paladin_a
node gms/3001/sprites/lab/src/paladin-knightstyle/a/make-sheet.mjs <scratch>/anims/paladin_a.png gms/3001/sprites/lab/sheets/paladin-knightstyle-a.png
```

`pxl check` passes with no warnings. `check-entry.mjs` reports "OK: bake-ready".

## Design

- **Head (11x10).**
  - A white veil covers the crown. Its back is lit from the upper left, and it frames a small 3/4 face looking right:
    - 4x4 skin
    - a navy lid over a blue eye
    - a one-pixel nose
    - a chin shadow.
  - The inner lining of the veil around the face is a step darker, so the opening reads as depth.
  - A gold circlet runs round the head, with a holy gem over the brow that glows. It flashes white on idle frames 6-7.
  - A wimple wraps under the chin into a steel gorget.
- **The veil's fall.** A broad strand of white cloth falls from the back of the crown down her back to the knees. Fold highlights run along it.
  - It does the job of the Knight's plume and cape. It breathes and ripples in the idle, streams back on the walk, and is flung back by the blow.
  - A shaded lobe behind it (the underside) gives it volume.
  - In earlier passes the veil and a separate cape made three white spikes that read as wings or ears, so the cape became this one fall.
- **Torso.**
  - Steel gorget and breastplate.
  - A white tabard down the front, with a gold sun cross whose heart glows.
  - A gold belt, and steel faulds.
  - A white tabard skirt with a gold hem hangs in front of the legs. It widens with the stride.
- **Limbs.**
  - Round steel limbs.
  - The near arm has a bright pauldron and couter.
  - Steel gauntlets and sabatons.
  - The far side is in shadow (dark steel), as the Knight's far leg is.
- **Warhammer.**
  - A leather-wrapped ash haft with a gold collar under the head and a gold butt cap.
  - A steel head with a polished striking face, a gold-banded socket and a short back spike.
  - Near upright, the head is kept square to the frame, so there are no jaggies.
  - At rest she holds it upright in her near hand, leaning a little forward, with the head beside her shoulder. A glint runs across its face on idle frames 2-4.

## Palette (40 colours on the sheet, 38 in idle)

| material | ramp, dark to light |
|---|---|
| steel (main) | `#1d1730 #2c2543 #3d3858 #524e6e #6a6887 #8483a0 #a09fb9 #bdbccf #d9d6e1 #f4efe9` |
| white cloth (veil, tabard, skirt) | `#2b2136 #3f3349 #574a62 #73657c #908298 #ada0b2 #c8bcc8 #ded4d8 #eee7e2 #fbf7ee` |
| gold trim (the one accent) | `#3d1c10 #6e3816 #a3601e #d0922e #ecc256 #fde89a` |
| skin | `#4a1d2a #7a3a3e #b06a5c #d89074 #f2bc98` |
| haft | `#22131c #3b2128 #5c3530 #7d4f3c #a3714c` |
| holy light (glows) | `#f2a93b #ffd45e #fff0a6 #fffde8` |
| eye | `#1b2346 #4f8fd6` |

All four light colours are used only for light, the gem and the sun's heart. They are the entry's `glow` list.

## Measurements (48x48 frames, soles on row 39)

| | Knight (plumed) | Paladin now (v1) | Style A (Classic) |
|---|---|---|---|
| idle frame 0 body | 21x30 | 28x35 (hammer top on row 5) | 25x28 (veil top on row 12) |
| idle box, average of the frames | ~23x28 | | 28.0x27.6 |
| walk box, average of the frames | | | 29.8x27.5 |
| head | ~10x10 helm | | 11x10 veil |
| colours (shown frames / sheet) | 146 | 22 | 40 / 40 |
| dark edge pixels, idle 0 (sum of RGB < 150) | 73% | | 46% |
| outline | none | black | none (no pure black pixel) |

## Frames

- **idle 0-7.**
  - A slow breath: the chest sinks a pixel on frames 3-5, and the head follows a frame later.
  - The veil sways and lifts a beat behind.
  - A glint crosses the hammer on frames 2-4, and the gem flashes on frames 6-7.
- **walk 8-15.** The planted stride (Ranger C's gait) with a body bob. The veil streams back, the skirt widens toward the leading leg, and the hammer rocks ±0.08 rad. The upper body sits 1 px forward.
- **attack 16-21 (13 fps, the hit on index 3 = frame 19):**
  - 16 gather: both hands on the haft at her chest, with the first sparks at the hammer head.
  - 17 heave: the hammer goes up behind her head in both hands, light gathers round its head, and the veil lifts.
  - 18 over the top: the hammer is up and forward, with a big gold-white crescent blazing behind it from back to front.
  - 19 SMITE: the head lands in front of her. You see:
    - a white flash at the face
    - rays and a ground flare
    - a pillar of holy light from the ground to row 3 (drawn behind the hammer, so the hammer reads against it)
    - the end of the arc trailing in.
  - 20: the pillar thins and breaks up at the top, sparks rise, and the hammer is still down.
  - 21 recover: the hammer is lifted back upright, and the last motes hang in the air.

## Weak spots

- **Colour count.** 40 colours against the Knight's ~140. There is no anti-aliasing beyond the ramps, as with Ranger C.
- **Edges.** 46% of the edge pixels are dark, against the Knight's 73%. The veil's lit top edge stays light, so on bright ground her head is less crisply cut out than the Knight's helm.
- **The veil is a large white mass.**
  - At game size, head and veil together are the biggest shape. The steel body reads second, while on the Knight the steel leads.
  - Seen small, the veil can read as a nun's habit or a hooded figure.
- **Frame 17 (heave).** The hammer head is small and rotated behind her head. The near arm's raise is mostly hidden behind the veil.
- **The face** is tiny (4x4), so the eye and nose are a few pixels each.
