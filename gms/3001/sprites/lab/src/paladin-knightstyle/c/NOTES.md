# Paladin · Knight style C (barrel helm)

`lab:paladin/knightstyle-c`, in the `Knight style · round 3` collection. This is Style B ("Crusader",
`../b/`, game sprite `paladin_c`) reworked at the head, after the user asked for a head that is "not so
round, but a bit more like cylindrical" and does not look "attached from the body". Everything below the
shoulders is B's: the body, hammer, cape, colours, animation, attack and size.

- Source: `paladin-c.px.js`, a copy of `../b/paladin-b.px.js` with a new head, drawn with claude-pxl (MIT,
  https://github.com/augusto-scarvalho/claude-pxl). The compositor (Part / limb / strand / lay) is Ranger C's.
  No pixels were copied or traced from the Mattz Art knight or any pack.
- Sheet: `sheets/paladin-knightstyle-c.png`, 1056x144: 22 frames of 48x48 facing right, rows
  `["right", "glow", "glowLeft"]`, the same glow colours as B (`#ffe48a #fff6cf #fffef6`).
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/paladin-knightstyle/c/paladin-c.px.js --out <scratch> --only paladin_c
node gms/3001/sprites/lab/src/paladin-knightstyle/c/make-sheet.mjs <scratch>/anims/paladin_c.png gms/3001/sprites/lab/sheets/paladin-knightstyle-c.png
```

`pxl check` gives no warnings; `check-entry.mjs` says "OK: bake-ready".

## What changed from B

| | B (round helm) | C (barrel helm) |
|---|---|---|
| helm | 10x10 (x 18-27, rows 12-21 at rest), round: sloped crown, curved back | 8x9 (x 20-27, rows 12-20), a short upright cylinder: flat top, straight sides, square 1 px corners |
| shading | round, lit from the upper left | as a cylinder: a flat top in its own light tone over a dark seam; a light vertical band left of centre (`I j J`) falling off to the dark front (`n H`); a dark lower rim |
| gold band | across the front half only | right across the helm at the brow, light at the left, ember-brown at the right |
| face | 4x4 in the front | the same few pixels (dark lash, blue eye, nose at the edge) in a 4x3 opening at the front |
| neck | none: the helm sat straight on the shoulder line | a dark steel gorget: a 4 px neck (row 21) narrower than the helm, flaring to a 6 px collar (row 22) on the shoulders |
| crest (wing) | 10x7, its tip on row 10 | 8x6, its tip still on row 10, swept back off the helm's upper back corner |
| cape | its top rose beside the head | clipped at the shoulder line, so nothing fills the gap behind the neck |
| veil | from under the helm's nape | from the helm's lower back corner, the same fall and sway |

- The helm's outer ring is painted in its final edge tones (`paint`, not `lay`), so its corners stay
  square instead of being rounded by the edge stepping. The frame's flush still darkens the silhouette.
- The gorget is part of the head (`helm()` paints it at `x0 + 1, y0 + 9`), so it follows the head's bob
  and the head's one-frame breathing lag exactly like the helm. The head's position rule is B's
  (`20 + ux, 12 + by + hy`, two pixels right of B's `18` because the helm is two narrower at the back).
- The front notch: the helm's bottom row ends a pixel short at the chin, the neck is two in from the
  front, and the pauldron rises on row 22. The back notch: two empty pixels between the veil and the neck.
- Her height is unchanged: the wing tip on row 10, the helm top on row 12, the soles on row 39 (herocmp:
  idle body 32x30, top row 10, as B). The neck row came out of the head (10 rows to 9).

All 22 frames changed, each only in rows 8-27 (the head, the neck, the shoulder line, and the top of the
veil and cape beside them); 0-7 px per frame below row 24, all the veil's moved top.

## Design (unchanged from B except the head)

- **Helm.** A barrel helm (great helm) in polished silver: flat top, straight sides, the gold band across it,
  her face looking out of a small front opening (a dark lash, a blue eye, the nose at the edge), a swept silver
  wing crest on its upper back corner, a dark steel gorget below.
- **Body.** Polished silver plate (breastplate, a gold-rimmed round pauldron, vambraces, greaves with a knee
  glint) under a white crusader tabard with a small gold cross, a gold belt, the skirt to a gold hem.
- **Cape and veil.** A long white cape from the shoulders, lined in gold; a short white veil from under the
  helm's back.
- **Hammer.** A violet-brown haft, a gold pommel, a silver head banded in gold, with a shimmering pale-gold
  halo and a white-hot mote.

## Frames (soles on row 39, anchorY 40)

- idle 0-7: the breath (the chest sinks a pixel on f3-5, the head and gorget a frame later), the cape and veil
  ripple, the halo shimmers.
- walk 8-15: Ranger C's gait, leaning a pixel forward; the cape and veil stream back.
- attack 16-21 at 13 fps, the hammer landing on frame 19 (attackRelease null): 16 wind-up, 17 loaded overhead
  (the haft behind the helm, the arms across the face), 18 the swing's gold smear, 19 SMITE (crescent, pillar,
  flash, rays, ground shock), 20 the pillar breaking into sparks, 21 recover.

## Palette (45 colours on the sheet, 43 in idle)

B's palette, unchanged (see `../b/NOTES.md`): silver plate `#1c1530 … #ebe1e9`, white cloth `#2a2546 … #fffbf3`,
gold `#2e0b08 … #fff0a0`, skin `#4a1d2a … #f8c9a4`, haft `#1e0e18 … #8e5534`, eye `#1a1f42 #4f8fd8`, glow
`#ffe48a #fff6cf #fffef6`.

## Weak spots

- The barrel helm keeps her face showing (an open front), so it is a great helm in outline rather than a
  closed one with eye slits; the face is 4x3 px.
- On frame 17 (loaded) the raised arms still cross the face and the hammer's haft rises from the helm's top,
  so the cylinder reads less there; on 18 the gauntlets cover the front of the helm.
- On the back the white veil runs from the helm's corner to the shoulders as a thin diagonal; with the cape's
  top clipped it stands more on its own than in B.
- The neck's length changes by a pixel on the breathing lag (longer on f3, shorter on f6), as B's head moved.
