# Sorcerer · Knight style A (Classic)

`lab:mage/knightstyle-a`, collection `Knight style · round 3`. Eldrin's costume as it is today (blue robe,
tall pointed blue hat with a gold band, white beard, a wooden staff with a fire orb, a flame in his free
hand), redrawn in the plumed Knight's style.

- Source: `mage-a.px.js`, drawn with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl).
  The compositor (parts edged in their own darker tones, round limbs, strands) is Ranger C's. No pixels
  were copied or traced from the Mattz Art knight or any pack.
- Sheet: `sheets/mage-knightstyle-a.png`, 1056x144: 22 frames of 48x48 facing right, soles on row 39,
  rows `["right", "glow", "glowLeft"]`.
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/mage-knightstyle/a/mage-a.px.js --out <scratch> --only mage_a
node gms/3001/sprites/lab/src/mage-knightstyle/a/make-sheet.mjs <scratch>/anims/mage_a.png gms/3001/sprites/lab/sheets/mage-knightstyle-a.png
```

The glow rows hold only the six fire colours (`#a8200f #dc4316 #ff6f22 #ffa02e #ffd457 #fff4c2`), which
nothing but fire uses (the hat band and buckle are a separate gold ramp, so they don't glow).

## Design

- **Pose.** The staff stands upright in his far hand by his side, its gold claw holding a 4x4 ball of fire
  that turns frame to frame. The near hand is held forward, palm up, with the flame over it, so the
  throwing arm is the near one and its strike reads in front of the body. Today's sprite has the two
  the other way round; the costume and colours are the same.
- **Hat.** A cone drawn as a tapering strand, lit from the upper left, its point flopping back. Two
  gold band rows at its foot and a 13 px brim: lit cyan top, violet-shadowed underside.
- **Face.** 3/4 to the right in the brim's shade: a bushy white brow over a 1 px eye, a big nose a pixel
  proud of the profile, the moustache falling into the beard. White hair falls down the back.
- **Robe.** One cloth from the shoulders, tapering in to a leather belt with a gold knot, then flaring
  out. Its back hem sweeps out and trails like the Knight's cape. It is shaded as a cylinder lit from the
  upper left, with folds running down from the belt and the pale cyan lining at the front opening.
  Bell sleeves have hanging cuffs, and boot toes peek out under the hem.

## Palette (46 colours on the sheet)

| material | ramp, dark to light |
|---|---|
| robe and hat (main) | `#21163e #281c52 #2b2468 #282f78 #2a4293 #2b59ae #3074c6 #3f92d9 #5fb1e8 #93d0f2` (violet shadow to cyan-white light) |
| beard and hair | `#63587e #7f749b #9d91b2 #bbaec8 #d5c8d9 #efe2ea #fff7f2` (purple-grey to warm white) |
| skin | `#6f333a #94494a #b56a5b #d68a6c #e7aa88 #f8c9a4` |
| wood, belt, boots | `#1e0e16 … #d4985a` (violet-brown to ochre) |
| gold (band, knot, claw) | `#4a1306 #8f2d0c #b44714 #d6611a #e68629 #f5aa38 #ffe390` |
| fire (glows) | `#a8200f #dc4316 #ff6f22 #ffa02e #ffd457 #fff4c2` |

## Measurements (48x48 frames, soles on row 39)

| | Knight (plumed) | current Sorcerer | Style A |
|---|---|---|---|
| idle body box (herocmp, shown frames) | 21x30 | 31x38 | 21-23x36 |
| idle frame 0 bounding box | 21x30 | 31x38 | 23x36 (x 12-34, y 4-39) |
| idle box, average of the 8 frames | 23.4x28.3 | | 22.5x35.6 |
| top of the head (helm / hat brim) to soles | 28 px (row 12) | | 27 px (brim row 13) |
| top of everything | row 10 (plume) | row 2 (hat) | row 4-5 (hat point, 6 px over the Knight) |
| colours | ~140 | 24 | 46 (46 in idle) |
| dark edge pixels, idle 0 (RGB sum < 150) | 73% | (black ink) | 28%. The white beard, the fire and the staff make up much of the silhouette. |
| outline | none | black | none (no pure black pixel) |

## Frames

- **Idle 0-7** (breath on 3-5, the head a frame later). The hat's point sways and blows back and
  forth. The back hem ripples in and out. Beard, hair and sleeve cuffs swing a beat behind, the hand
  flame flickers through 8 shapes with embers, and the orb turns.
- **Walk 8-15.** The boots stride under the hem, half a cycle apart, and the body bobs. The hem front
  swings out at each contact while the back trails. The staff swings with the far arm. The hat's
  point, beard and hair stream back, and the flame leans back.
- **Attack 16-21** (12 fps, the hit on index 3 = frame 19, attackRelease null):
  - 16: the fire swells in the palm, drawn in to the belt.
  - 17: he leans back as the arm swings up behind his head, and the fire becomes a ball.
  - 18: cocked high behind the hat, with the fire at its biggest.
  - 19: the throw. He lunges, the arm whips over and out, and a broad crescent of fire runs from behind
    his head over the hat to a 7 px fireball at x 38-45. Hem and hat point fling back.
  - 20: the fireball flies off at the frame's edge as the crescent breaks into ember dashes.
  - 21: he recovers, a small new flame catches in his palm, and the last embers drift.

## Weak spots

- The robe still hides the legs, so the stance is more upright than the Knight's. The lean comes
  from the trailing hem and the hat's point, not from the legs.
- 46 colours against the Knight's ~140: no anti-aliasing beyond the ramps (Ranger C has the same).
- The near sleeve, between the beard and the flame, reads as a dark navy mass at 1x.
- In frames 17-18 the wound-up fire sits behind the hat beside the staff orb, so the two fires merge on
  the left. The throwing arm is mostly hidden behind the head there.
- The edges are less consistently dark than the Knight's (28% against 73%), because the bright beard and
  fire run to the silhouette.
