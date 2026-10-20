# Berserker v1: Ulfric (lab:berserker/v1)

Source: `berserker.js` (and `kit-berserker.js`, an unchanged copy of the remaster-v5 kit). Build with:
`node gms/3001/tools/build.mjs gms/3001/sprites/lab/src/newheroes-oct20/berserker.js`

Build line: **34 px tall · 22 frames (idle 8, walk 8, attack 6) · 22 colours · outline 99% · night 72%** (the one warning, "attack: bobs 8 px", comes from the leap with the axes overhead; see below).

## The design

- **Silhouette:** the widest hero. In the idle he spans x 2–42 (about 41 px with the axes) against the knight's 36. He stands broad and hunched with an axe raised outward in each fist, a wolf's ears on top, and a fur pelt down his back.
- **Head:** a grey wolf's head over his brow, with two ears (rows 7–8), an amber eye, the snout over his forehead ending in a black nose, and two white fangs hanging over the brow. Under it are his face (two eye pixels and a nose) and a big red beard, braided below with a gold ring.
- **Body:** a bare chest (two pecs lit top-left, a belly line) with a leather strap across it, and a pale fur mantle on the shoulders. He wears a leather kilt in strips with a dark belt and a gold buckle, and fur-wrapped boots.
- **Arms:** big bare upper arms banded in blue woad, leather bracers, and two bearded hand axes. The axe hafts are weathered grey ash (the fur ramp), the heads steel with a white edge.
- **Palette (22 colours):**
  - fur W/F/f/h, #ece4d4 → #655a4d
  - skin 1/s/S/2, #f7d2aa → #87503c
  - beard O/r/R
  - leather L/l/m
  - steel w/G/g/N (the master palette's)
  - gold y
  - woad U/u
  - ink k

  The dominant mass is warm skin, pale fur and brown leather. That stays clear of the knight's scarlet and silver, and the red is only the beard.
- **Separation lines:** where a part crosses another, the line is drawn in the covered material's own deepest shade (skin '2', fur 'h', leather 'm', steel 'N'), not ink. Then `softenNotches` and `fillDoubled(..., keepLine)` from the kit clean the joins.

## Animation

- **Idle (8 frames):**
  - The breath lifts his chest, head and arms 1 px on f3–5, with his hands a frame behind it.
  - The pelt's hem sways on a continuous wave, and the braid swings on f3–4.
  - The axes rock 7–8°, and a white glint runs down the near axe head (f0–3), then the far one (f4–7).
- **Walk (8 frames):**
  - The kit's GAIT (11 px stride, the planted ankle travelling back 2–3 px a frame, the passing foot lifted), with the body dipping 1 px on the down frames and the head a frame late.
  - The arms counter-swing (the axes ±10°), the kilt's hem kicks with the stride, and the pelt streams behind.
- **Attack (6 frames):** the strike lands on f19, the middle frame.
  - f16: a crouch with both axes swung back behind him, low.
  - f17: the leap, 3 px off the ground (tucked legs), both axes high over his head.
  - f18: still airborne by 1 px, the axes coming over the top, with a trail.
  - f19, the blow: he lands on row 39, leaning forward, and both axes chop down into the ground in front. Two white trails run behind him, and chips fly up where the axes bite.
  - f20: the follow-through, the axes buried low and a puff of dust.
  - f21: recovery to the guard.
  - Nothing is drawn below row 38, so an axe reaching the ground reads as bitten into it.

## Measures (each per frame over its opaque pixels; same definitions as remaster-v5/NOTES.md)

| measure | value |
|---|---|
| height (idle f0) | 34 px (ear tips; colour row 6, row 5 on the breath frames) |
| feet | row 39 on every idle and walk frame; the attack lands on 39 (f16, f19–21), with the leap at 36 and 38 |
| night 5+, idle/walk | f0 67.3%, worst 66.1% (bar 50) |
| bright (luma > 150) | 27–29% |
| idle / walk drift | 0.21 / 0.85 px |
| upper change, idle / walk (`measure.mjs`) | 0.22 / 0.59 |
| smallest idle transition | 45 px (45 48 272 162 50 264 141 46) |
| second step vs first (f12–15 vs f8–11) | 405 339 32 337 px |
| doubled ink | 3.41 per frame (mean of all frames) |
| stripes rows / cols (mean over idle and walk) | 0.00 / 0.25 (a glint step on the far axe's edge) |
| islandShare | 0.117 |
| ink walls | 0.01 |
| colours | 22 |

## Evidence (in `gms/3001/sprites/lab/review/`, not kept in git)

- The board: `berserker-v1.png` (+ `.json`).
- In-game shots:
  - default zoom: `berserker-v1-{stand,walk,fight}.png`
  - `--zoom=closer`: `closer/berserker-v1-{stand,walk,fight}.png`
- **How the shots were taken:** `shot.mjs berserker/v1` loads `stage.html?hero=berserker`, and the game currently throws on that class ("Cannot read properties of undefined (reading 'tick')" in `weapons.js` `Weapon.update`; Twin Axes is being wired by another agent). So these shots come from a scratch copy of `shot.mjs` that plays the knight's class wearing `lab:berserker/v1`. The sprite, the scale and the scene are the same as the real tool's.
  - Because the shots play the knight's class, the fight shot shows the knight's sword weapon. The attack animation itself is on the board.

## Weapon icons: `public/js/art/hero-berserker-items.js`

`BERSERKER_ITEMS = { i_twinaxes, i_bloodstorm }`: 14×14 each, palette.js keys, no outline drawn.
- **i_twinaxes:** two bearded hand axes crossed in an X, heads up and blades out, their grips bound in red (r/R).
  - The shared Throwing Axe (`i_axe`) is one big axe on a diagonal, so the two read differently even at 1x: a red-and-steel X against one brown haft with a big head.
- **i_bloodstorm:** a double-headed spin, with two axe heads on one haft through the centre. Two red crescents trail behind the heads like a whirl, with blood drops off the top one.
  - It has 2-fold rotational symmetry, so it reads as spinning.
- **Render beside `i_axe`, `i_whirlwind` and `i_sword`:** at 1x, 2x, 3x and 10x, outlined as the build does, in `<scratchpad>/heroes/berserker/icons-final.png` (script `icons.mjs` beside it).

## Unsure / still weak

- **The wolf's snout** is a flat 2-row wedge over his brow. At 3x it reads as a wolf hood (ears, amber eye, fangs), but zoomed in it can look like a cap's peak.
- **The near arm** (image left) is a thick skin mass that reads as an arm mostly by its woad band and bracer. With the separation lines in skin shade instead of ink, the arms join the body more softly than the knight's do.
- **The attack's blow frame (f19) is busy:**
  - two trails, two axes and the chips, all in front of the kilt
  - the trails are drawn behind the body, so only their front part shows.
- **Height and frame edges:**
  - The ears take him to 34 px (35 on the breath frames).
  - The leap's axes reach row 0 on f17 (outline at the frame's top edge).
- **Stripes:** the far axe's glint makes one 4-px w/G stripe down a column on one idle frame.
- **The bloodstorm icon's axe heads are small** (3–4 px); the red ring carries it.
