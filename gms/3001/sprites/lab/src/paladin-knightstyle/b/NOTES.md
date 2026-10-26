# Paladin · Knight style B (Crusader)

`lab:paladin/knightstyle-b`, in the `Knight style · round 3` collection. A look for Dame Seraphine
drawn in the plumed Knight's style. The other round-3 Paladin look is A ("Classic"); this one is a
freer redesign.

- Source: `paladin-b.px.js`, drawn with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl).
  The compositor (Part / limb / strand / lay) is Ranger C's (`../../ranger-knightstyle/c/`). No pixels were
  copied or traced from the Mattz Art knight or any pack.
- Sheet: `sheets/paladin-knightstyle-b.png`, 1056x144: 22 frames of 48x48 facing right, rows
  `["right", "glow", "glowLeft"]`.
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/paladin-knightstyle/b/paladin-b.px.js --out <scratch> --only paladin_b
node gms/3001/sprites/lab/src/paladin-knightstyle/b/make-sheet.mjs <scratch>/anims/paladin_b.png gms/3001/sprites/lab/sheets/paladin-knightstyle-b.png
```

`make-sheet.mjs` is Ranger C's helper for 22 frames: the glow rows hold only `#ffe48a #fff6cf #fffef6`
(`g G W`: the hammer's halo, the swing's outer edge, the smite's crescent, pillar, flash and sparks).
`pxl check` gives no warnings; `check-entry.mjs` says "OK: bake-ready".

## Design

- **Helm.** A sleek silver sallet, lit from the upper left, with a gold brow band. A swept silver wing on
  its side rises a little above the crown (the wing tip is the top of the figure, as the Knight's plume
  is). Her face shows under the band in 3/4: a dark lash, a blue eye and the nose a pixel proud.
- **Body.** Polished silver plate (gorget, breastplate, a gold-rimmed round pauldron, vambraces, greaves
  with a knee glint) under a white crusader tabard with a small gold cross, a gold belt, and the tabard's
  skirt falling between her legs to a gold hem.
- **Cape and veil.** A long white cape from the shoulders. Its outer lobe is lit white, and its inner lobe
  shows the gold lining. A short white veil falls from under the helm's nape.
- **Hammer.** A violet-brown haft with a gold pommel, and a silver head banded in gold across its middle
  and at both faces. At rest it hangs low before her front foot. Its halo is a pale-gold rim of light on
  the head's upper edge that shimmers from frame to frame, plus a white-hot mote circling it.

## Frames (soles on row 39, anchorY 40)

- idle 0-7: the breath (the chest sinks a pixel on f3-5 and the head a frame later). The cape ripples
  and swings out and back. The veil sways a beat behind it. The halo shimmers and its mote circles.
- walk 8-15: Ranger C's gait (planted stride, bob on the contacts), leaning a pixel forward. The cape
  streams back level, the veil streams, and the hammer swings a little with the arm.
- attack 16-21 at 13 fps, the hammer landing on attack index 3 (frame 19, attackRelease null):
  - 16 wind-up: both hands at the hip, the hammer drawn back low behind her.
  - 17 loaded: hoisted high over her head (the haft behind the helm), leaning back, the halo bright.
  - 18 swing: over the top, a gold smear following the head along its arc.
  - 19 SMITE: the head lands before her. A broad crescent sweeps from overhead, gold to white-hot. A
    pillar of light falls on the foe ahead, with a white flash and rays bursting from the impact and a
    shock along the ground. The cape is flung back.
  - 20 follow-through: the pillar breaks into dashes, white-hot sparks fly and the crescent's tail fades.
  - 21 recover: back toward the rest pose.

## Palette (46 colours on the sheet, 44 in idle)

| material | ramp, dark to light |
|---|---|
| silver plate | `#1c1530 #2a2040 #3d3257 #54486e #6e6489 #7d7397 #8d82a4 #9e93b2 #ada3bf #bdb3cb #cdc3d6 #dcd2e0 #ebe1e9` |
| white cloth (cape, tabard, veil) | `#2a2546 #3c3762 #56527f #77749e #9d9bbd #b1aecc #c3c0d8 #d2cfe1 #e0dde9 #eae6ed #f4f0f0 #fffbf3` |
| gold (the one accent) | `#2e0b08 #561806 #842c06 #b2500a #c46710 #d87d12 #e69a1a #f0ad22 #f8c43a #ffd650 #fff0a0` |
| skin | `#4a1d2a #6f333a #94494a #b56a5b #d68a6c #e7aa88 #f8c9a4` |
| haft | `#1e0e18 #3e1e22 #64352a #8e5534` |
| eye | `#1a1f42 #4f8fd8` |
| glow (night rows) | `#ffe48a #fff6cf #fffef6` |

## Measurements (herocmp, 48x48 frames)

| | Knight (plumed) | Paladin now | Style B (Crusader) |
|---|---|---|---|
| idle frame 0 bounding box | 21x30 | 28x35 (hammer head on row 5) | 32x30 (the hammer reaches forward) |
| body without the weapon (frame 16, hammer behind her) | ~21x30 | – | 24x30 |
| helm top to soles | 28 (row 12) | 30 (helm row 10) | 28 (row 12), wing tip row 10 |
| colours | 146 | 22 | 46 (44 in idle) |
| dark edge pixels, idle 0 (RGB sum < 150) | 73% | – | 72% |
| outline | none | ink | none (no pure black) |

## Weak spots

- 46 colours against the Knight's ~140. The ramps are finer than flat art, but there is no
  anti-aliasing beyond them.
- The face is small (4x4 px) inside a large grey helm, so she reads as a knight first and only slightly
  as a woman. The veil is the main feminine cue, and it is mostly white on the white cape.
- The wing reads as a feathered fin at 1x. Some may read it as a ponytail or flag.
- On frame 17 (loaded) the raised arms cross the face, so for that frame she looks turned away.
- With the hammer forward at rest, the idle box is 32 px wide, wider than the Knight's 21.
- The gold lining shows mostly at the cape's hem, not as a strong band.
