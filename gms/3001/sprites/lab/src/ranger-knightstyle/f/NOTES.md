# Ranger · Knight style F (C refined)

`lab:archer/knightstyle-f`, collection `Knight style · round 3`. Style C (the user's favourite Ranger:
hooded Lyra) with the same design, reworked to sit closer to the plumed Knight's in-game sprite.

- Source: `ranger-f.px.js` (started as a copy of `../c/ranger-c.px.js`), drawn with claude-pxl (MIT,
  https://github.com/augusto-scarvalho/claude-pxl). No pixels were copied or traced from the Mattz Art
  knight or any pack.
- Sheet: `sheets/archer-knightstyle-f.png`, 4224x144: 88 frames of 48x48 facing right, rows
  `["right", "glow", "glowLeft"]`, the same layout as C. Glow: `#b6ffdc` (moonstone, arrowhead, the
  release's tip).
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/ranger-knightstyle/f/ranger-f.px.js --out <scratch> --only ranger_f
node gms/3001/sprites/lab/src/ranger-knightstyle/f/make-sheet.mjs <scratch>/anims/ranger_f.png gms/3001/sprites/lab/sheets/archer-knightstyle-f.png
```

`pxl check` passes with no warnings. `check-entry.mjs` says "OK: bake-ready".

## Frames

As C: idle 0-7, walk 8-15, attack 16-23 at 14 fps with attackRelease 5 (the loose on frame 21),
attackWalk 24-87 = attack pose k over walk step j at frame 24 + 8k + j.
- idle: a breath (chest down a pixel on f3-5, head a frame later); the cape ripples with folds that
  travel down it to the hem; the hood tail swings out and back a beat behind (wider than C's).
- walk: the planted stride of C, upper body a pixel forward, cape and tail streaming back level.
- attack: lift, nock, draw, full draw to the chin, hold (the arrowhead flashes with a 4-point
  sparkle), loose (frame 21: a 24 px crescent of light, 6-7 px deep, plus the string's snap), follow
  through (the crescent thinner and drifted forward, breaking up), lower.

## What changed from C (the six style points)

Measured first (`fmeasure.mjs` in the scratchpad, idle/walk/attack rows):

| | Knight | C | F |
|---|---|---|---|
| colours, idle / whole sheet | 140 / ~200 | 46 / 50 | 61 / 65 |
| luminance p5 / p50 / p95 | 10 / 80 / 212 | 20 / 68 / 206 | 14 / 55 / 198 |
| pixels brighter than 170 (idle / attack) | 16% / 19% | 7% / 9% | 9% / 12% |
| silhouette-edge mean lum vs inner | 50 vs 104 | 62 vs 97 | 53 vs 90 |
| dark edge pixels, idle 0 | 73% | 66% | 75% |
| silhouette change per idle frame (px) | 56 | 46 | 58 |
| colour change per idle frame (px) | 158 | 96 | 133 |
| silhouette change per walk / attack frame | 115 / 151 | 107 / 104 | 119 / 126 |
| head top to soles | 28 (helm) | 27 | 26 (hood crown row 14) |
| top of everything | plume | row 10 | row 10-12 (hood tail) |
| idle box, average | 23.4x28.3 | 24.5x29.6 | 25.4x29.0 |

1. **Edges.** A silhouette pass after compositing: every pixel touching the air drops to the two
   darkest shades of its own material (cloak `#0b0c1d`/`#0f1729`, tunic `#101a22`/`#15292b`,
   leather `#150a17`/`#23101d`, hair `#221a35`/`#342b4b`), gold by three steps, skin keeps its
   one-step edge. Pinholes are closed first so no dark ring forms inside the figure. The bow, string,
   arrow, eye and release keep their own values. Parts over parts still get a one-step darker rim.
2. **Proportions.** The hood is 11x10 (C's 11x11), so her head-to-soles height is 26 px, two under
   the Knight's 28, and the head is a smaller share of her height. Torso and limbs stay C's slim
   ones (8 px tunic, 3 px legs against his ~11 px chest). The head and chest sit a pixel forward of
   the hips (the lean).
3. **Shading.** Long hue-shifted ramps: cloak 12 steps (indigo-black, blue-teal, moss, warm
   yellow-green sheen `#c2d870`), tunic 11 (teal shadow to lime-cream), leather 11 (violet-brown to
   ochre), hair 9 (purple-grey to pink-white), gold 8. The tunic is lighter and warmer than the cloak
   so the two read apart, as his steel and red do.
4. **Motion.** Folds (a lit crest and a shadowed trough) travel down the outer cape lobe with the
   phase; the inner lobe falls over the far leg; the hood tail sways wider and is flung back and up by
   the loose. Idle silhouette and colour change now match or near the Knight's.
5. **Colour scheme.** Deep green cloak as the main material, gold (clasp, buckle, bow bands, nock
   caps, fletching) as the accent, silver hair and white/teal sparks as the small highlights.
6. **Detail.** Bow: dark back, belly lit toward the top with a highlight pixel, leather grip wrap,
   gold bands either side, gold nock caps, moonstone. Clasp: a leaf-shaped brooch with a highlight
   pixel and a dark lower rim. Arrow: two-tone fletching, a birch shaft with a grain pixel every
   third, a steel head with barbs and a glowing tip. Face: silver fringe, navy lid, white and teal
   iris, the nose a pixel proud, mouth and chin.

## Palette (65 colours on the sheet)

| material | dark to light |
|---|---|
| cloak | `#0b0c1d #0f1729 #112436 #13333c #174340 #1d5444 #256747 #317b48 #449048 #63a54c #8ebd56 #c2d870` |
| tunic | `#101a22 #15292b #1c3b2f #264f32 #336436 #447a38 #5b903a #78a640 #9bbd4c #c0d462 #e4ec90` |
| leather | `#150a17 #23101d #331621 #451e24 #592926 #6f3629 #88462d #a05933 #ba713d #d28f50 #eab670` |
| hair | `#221a35 #342b4b #463c61 #63587e #7f749b #9d91b2 #bbaec8 #d5c8d9 #efe2ea` |
| skin | `#4a1d2a #6f333a #94494a #b56a5b #d68a6c #e7aa88 #f8c9a4` |
| gold | `#3c1007 #6e2208 #9c3a0e #c45a16 #e07e22 #f4a636 #ffd468 #fff2b0` |
| fx | eye `#14203f #3fcf9a`, string `#e3d8c6`, glow `#b6ffdc`, release `#ffffff #f0e4ee #c3b3d8 #8a7aae` |

## Weak spots

- Still about 65 colours against the Knight's 140: long ramps, but no anti-aliasing pass.
- She is darker overall than the Knight (median luminance 55 against 80, 9% bright pixels against
  16%): his main material is light steel, hers a deep green cloak.
- The hood tail rising off the crown still reads a little like a pointed hat, as in C.
- At full draw the draw arm's elbow shows only as a short sleeve behind the hood.
- The release crescent sits in the frame's right 24 px; it cannot sweep behind her as his sword arc does.
