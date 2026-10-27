# Paladin · Knight style E (holy crusader, great helm)

`lab:paladin/knightstyle-e2`, collection `Knight style · round 3`. Style E (`../e/`) with a helm, on the
owner's request of 27 October 2026: "let the paladin have a helmet. But don't make the helmet look like a
ball. Let it be the cylindrical helmet." Everything below the helm (body, tabard, shield, sword, cape,
animation, attack, glow rows, soles on row 39) is E's, pixel for pixel. E's own notes (design, palette,
frames, measurements) are in `../e/NOTES.md` and still hold. E itself is unchanged.

- Source: `paladin-e2.px.js` (anim `paladin_e2`), a copy of `../e/paladin-e.px.js`, drawn with claude-pxl
  (MIT, https://github.com/augusto-scarvalho/claude-pxl). No pixels copied or traced from any pack.
- Sheet: `sheets/paladin-knightstyle-e2.png`, 1056x144: 22 frames of 48x48 facing right, rows
  `["right", "glow", "glowLeft"]`, the same glow colours as E (`#ffe48a #fff6cf #fffef6`).
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/paladin-knightstyle/e2/paladin-e2.px.js --out <scratch> --only paladin_e2
node gms/3001/sprites/lab/src/paladin-knightstyle/e2/make-sheet.mjs <scratch>/anims/paladin_e2.png gms/3001/sprites/lab/sheets/paladin-knightstyle-e2.png
```

`pxl check`: no warnings. `check-entry.mjs`: OK: bake-ready (40 colours, feet row 39).

## What changed from E

1. **`HELM` replaces `HEAD`** (and the circlet): a crusader's great helm, 10x9 at (19, 9) at rest, drawn
   the same in every frame and moved only by whole pixels with the head (breath, walk bob, attack lean),
   so it never flickers.

   ```
   .osjsJoIn.   flat top in its own light tone, 1 px bevel at the corners (kept light on the rim)
   hiHnHmihhu   the dark seam under the top
   hHJsoIHYih   cylinder shading: light band at x+2..4 (left of centre), dark front at x+8..9
   yTQqlYeQTt   the gold brow band
   hHJsoVXlXV   the eye slit across the front: near eye x+6, the gold strip x+7, far eye x+8
   hHJsoIHYih   the gold strip down the front (the helm's cross)
   hHJsoIuYuh   breathing holes either side of the strip
   hHJsoIHTih
   uhiHHmiyhu   the darker lower rim
   ```

   - Facing right as the Knight's helm: the slit and the cross on the front (right) part, the plain
     lit side toward the back.
   - A dark steel gorget (`uhIiu`, 5 px, narrower than the helm) on the row under it sets it off the
     shoulders; the torso's bare neck became steel.
   - Her chestnut tail starts a pixel further back and peeks out below the helm's back, swaying as in E.
   - The helm's lit top row is exempt from the silhouette darkening (`KEEP`), so the flat top stays its
     own light tone.
2. Nothing else. Hair tones remain in the tail and the leather belt and grip.

## Measurements

| | Knight (plumed) | Style E | Style E2 |
|---|---|---|---|
| idle frame 0 box | 21x30 | 27x30 | 27x31 (helm top on row 9, a pixel over E's hair) |
| head | helm ~10x10 | 13x9 bare head | 10x9 helm + gorget row |
| colours | 146 | 48 | 40 (no skin in the face) |
| eyes at rest | – | (26, 15), (28, 15) | glints (25, 13), (27, 13) in the slit, in all 22 frames |

## Weak spots

- The helm hides the face entirely, so "Dame" Seraphine reads as a knight. Only the tail hints at her.
- At 1x the cross on the helm and the two eye glints merge into a gold-and-blue fleck at its front. It
  reads as a slit with a nasal, not as two eyes.
- One pixel taller than the Knight at the helm's top.
- In the raise (16-17) the sword arm passes over the helm's back edge, as it passed over E's hair.
- E's own weak spots (the faint arm on 18, the small tabard cross, the 27 px width) remain.
