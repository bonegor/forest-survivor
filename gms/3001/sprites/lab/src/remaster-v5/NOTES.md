# Remaster V5: the five heroes, round 5

Five entries, all `collection: 'Remasters'`, each `lab:<class>/remaster-v5`: knight, archer (the ranger), mage (the sorcerer), rogue (the assassin), necromancer. The v4 sources were copied here and changed. remaster-v1 to -v4 are untouched.

Build all five with:
`node gms/3001/tools/build.mjs gms/3001/sprites/lab/src/remaster-v5/{knight,archer,mage,rogue,necromancer}.js`

| | build line | verdict |
|---|---|---|
| knight | 33 px tall · 22 frames (idle 8, walk 8, attack 6) · 14 colours · outline 99% · night 58% | lines up cleanly |
| archer | 33 px tall · 70 frames (idle 8, walk 8, attack 6) · 17 colours · outline 100% · night 54% | lines up cleanly |
| mage | 37 px tall · 22 frames (idle 8, walk 8, attack 6) · 23 colours · outline 100% · night 53% | lines up cleanly |
| rogue | 34 px tall · 22 frames (idle 8, walk 8, attack 6) · 13 colours · outline 100% · night 43% | lines up cleanly |
| necromancer | 37 px tall · 22 frames (idle 8, walk 8, attack 6) · 14 colours · outline 100% · night 44% | lines up cleanly |

**Evidence.** Everything is in `gms/3001/sprites/lab/review/`, which isn't kept in git:
- `review.mjs` boards: `<class>-remaster-v5.png` (+ `.json`), and `team-remaster-v5.png`.
- `shot.mjs` at the game's default zoom: `<class>-remaster-v5-{stand,walk,fight}.png`.
- `shot.mjs --zoom=closer`: `closer/<class>-remaster-v5-{stand,walk,fight}.png`.
- **The robe control render: `necromancer-remaster-v5-robe-control.png`** (see A1).

## How each number is measured

One denominator per measure. Each is given on idle f0 and on the worst idle or walk frame (f0–f15).
- **Night 5+:** opaque pixels whose night luma (the boards' multiply 0.42 / 0.46 / 0.66) is at least 5 over the night line (night grass + 20 = 35.4), as a share of the frame's opaque pixels.
- **Bright:** opaque pixels over luma 150, as a share of the frame's opaque pixels.
- **Upper change:**
  - `measure.mjs` gives the idle and walk figures.
  - The "proxy" is my reconstruction of the review's older percentage. Above the hip line (feet − 0.4 × height), it takes the pixels opaque in both frames of each neighbouring pair (the cycle wraps) and counts the share that changed colour. It runs within about 3 points of the review's figures.
  - I count a change as a regression if either figure drops.
- **Doubled ink:**
  - This is the review's pattern as I reconstruct it (mean error 0.4 against its published figures): an inner ink pixel with colour on one side and ink-then-clear on the other, along a row or a column.
  - The mean is per frame over all of the hero's frames. f0 and the worst idle/walk frame are counts.
- **Stripes:**
  - Alternation runs of 4+ px between two non-ink colours (A B A B…), counted along rows and down columns separately.
  - The mean is over the 16 idle and walk frames. This reproduces 9 of the 10 figures the round-4 review published.
- **islandShare:** the `measure.mjs` formula (pixels sharing no edge with their own colour, over all pixels of all frames), shown to 4 decimals. `measure.mjs` rounds it to 3.
- **Colour:** CIELAB (D65), with C* = √(a*² + b*²).
  - The robe's figure is pixel-weighted over the pixels in tones 1, 3 and 4.
  - On v4 f0 this gives 14.44, against the review's 14.5.

## The bars for round 5

| Bar | knight | ranger | sorcerer | assassin | necromancer |
|---|---|---|---|---|---|
| 1. robe C* ≤ 8, L* ±2 (pixel-weighted) | | | | | **f0: C* 5.80, L* 14.16** (v4 14.44, 14.42). **Highest-chroma frame f3: C* 5.84, L* 14.53.** L* runs 13.91–14.53 over f0–15 (v4 14.26–14.69). Control render made. |
| 2. panel bone luma < skull's | | | | | **f0: 136 (46 px) < 157 (52 px).** Every idle and walk frame: 134–141 < 151–167 (v4 172 > 155) |
| 3. night 5+, f0 / worst | 58.5% / 56.6% (f13) | 53.7% / 52.9% (f4) | 52.9% / 52.1% (f15) | 42.9% / 42.4% (f12) | 44.1% / 42.2% (f8) (v4 worst 39.8%) |
| 3. bright, f0 / worst | 35.5% / 34.0% (f9) | 27.4% / 27.0% (f5) | 23.9% / 23.4% (f5) | 27.2% / 26.8% (f4) | 29.5% / 28.1% (f8) |
| 3. bar | 50% | 50% | 50% | 40%, 20% bright, lit rim | 40%, 20% bright, lit rim |
| 4. props through the walk | sword + shield, 8 of 8 | bow + nocked arrow, 8 of 8 | staff + **flame, 8 of 8** (v4: 0) | both daggers, 8 of 8 | staff + grimoire, 8 of 8 |
| 5. no regression (shipped four) | none | none | none | none | (not shipped; see below) |
| 6. stripes rows / cols (mean) | 5.00 / 1.00 (v4 5.00 / 1.00) | 0.50 / 1.06 (v4 2.75 / 5.19) | 0.00 / 6.25 (v4 0.00 / 6.25) | 5.00 / 0.00 (v4 5.00 / 0.00) | 0.00 / 0.00 (v4 0.00 / 10.00) |
| 6. stripes f0 / worst, rows; cols | 4 / 8 (f10); 0 / 4 (f10) | 0 / 4 (f9); 0 / 5 (f10) | 0 / 0; 8 / 8 (f0) | 5 / 5 (f0); 0 / 0 | 0 / 0; 0 / 0 |
| 7. feet row 39, every idle and walk frame | yes | yes | yes | yes | yes |
| 7. two different steps (f12–15 vs f8–11, px) | 309 265 72 230 | 199 212 59 210 | 177 130 52 148 | 272 231 66 246 | 305 220 140 296 |
| 7. headgear top colour row (idle / walk) | 7–8 / 8–9 | 7–8 / 8–9 | hat tip 2–4 (exception) | **7 on every idle frame** / 7–8 | crown 8; staff skull 4 in the idle, as in v4 |
| 7. ink walls · colours · islandShare | 0 · 14 · 0.1166 | 0 · 17 · 0.1064 | 0 · 23 · 0.0927 | 0 · 13 · 0.1156 | 0 · 14 · 0.1089 |
| 7. smallest idle transition, px | 40 | 41 | 37 | 45 | 76 |

The head tops and eye lines haven't moved from round 4 for any hero.
- The assassin's breath frames squash the hood's top rows instead of lifting the peak, so the face moves with the breath as before.
- The necromancer's change to his head row 13 is colour only.

The weapon on the impact frame:
- The knight's and assassin's attack frames are pixel-identical to v4.
- The ranger's differ by 1–10 px a frame (glint, fills). The sorcerer's differ by 2–5 px (fills).
- The necromancer's changes on f19 are recolours plus the collar. The staff, its skull and the soul fire are where they were.

## v4 → v5 for the four shipped heroes, every bar-5 measure

| | knight | ranger | sorcerer | assassin |
|---|---|---|---|---|
| night 5+ f0 | 58.5 → 58.5 | 53.5 → 53.7 | 52.4 → 52.9 | 42.9 → 42.9 |
| night 5+ worst | 56.6 (f13) → 56.6 (f13) | 52.5 (f4) → 52.9 (f4) | 50.8 (f14) → 52.1 (f15) | 42.0 (f12) → 42.4 (f12) |
| bright f0 | 35.5 → 35.5 | 27.1 → 27.4 | 23.9 → 23.9 | 27.2 → 27.2 |
| bright worst | 34.0 (f9) → 34.0 (f9) | 26.8 (f5) → 27.0 (f5) | 23.3 (f5) → 23.4 (f5) | 26.7 (f4) → 26.8 (f4) |
| smallest idle transition | 40 → 40 | 38 → 41 | 35 → 37 | 43 → 45 |
| upper change idle (measure.mjs) | 0.22 → 0.22 | 0.21 → 0.21 | 0.22 → 0.22 | 0.21 → 0.21 |
| upper change walk (measure.mjs) | 0.60 → 0.60 | 0.47 → 0.47 | 0.59 → 0.59 | 0.56 → 0.57 |
| upper change idle (proxy %) | 17.1 → 17.2 | 16.0 → 16.4 | 15.8 → 16.1 | 16.0 → 16.2 |
| upper change walk (proxy %) | 52.8 → 52.8 | 39.6 → 39.7 | 42.4 → 42.5 | 45.8 → 46.9 |
| doubled ink, mean per frame | 1.55 → 1.55 | 4.51 → 3.96 | 4.55 → 2.55 | 2.27 → 2.27 |
| doubled ink f0 / worst idle-walk | 1 / 2 → 1 / 2 | 3 / 7 → 2 / 7 | 6 / 7 → 2 / 3 | 2 / 5 → 2 / 4 |
| stripes rows | 5.00 → 5.00 | 2.75 → 0.50 | 0.00 → 0.00 | 5.00 → 5.00 |
| stripes cols | 1.00 → 1.00 | 5.19 → 1.06 | 6.25 → 6.25 | 0.00 → 0.00 |
| islandShare | 0.1166 → 0.1166 | 0.1078 → 0.1064 | 0.0977 → 0.0927 | 0.1164 → 0.1156 |

None got worse. Off the bar-5 list, three numbers moved the wrong way, all small:
- The knight's idle drift went 0.44 → 0.57 px, from the bigger cape billow (the warning sits at 2.5).
- The sorcerer's second step now differs from his first by 52–177 px (v4 51–190), because the walk's flame repeats on a 4-frame flicker.
- The assassin's second step differs by 66–272 px (v4 98–299), from the shorter scarf.

## A. Necromancer (ALMOST → the three fixes)

### A1. A robe that reads black
- **Tones** are the review's own:

  | key | v4 | v5 | L* (v4 → v5) | C* (v4 → v5) |
  |---|---|---|---|---|
  | '1' | #4f2a36 | #38333c | 22.2 → 22.1 | 18.9 → 6.5 |
  | '3' | #3a1e29 | #28242c | 15.4 → 14.9 | 15.5 → 6.0 |
  | '4' | #2a161e | #1e1b22 | 10.3 → 10.4 | 11.6 → 5.4 |

  The hue sits near 310°.
- **Pixel-weighted over the robe's pixels:** C* is 5.80 on f0 and 5.84 at its highest (f3), against the bar of 8 (v4: 14.44). L* is 14.16 on f0 (v4 14.42), within ±2 on every frame.
- **The control render, `gms/3001/sprites/lab/review/necromancer-remaster-v5-robe-control.png`:**
  - The same frames (f0 at 1x, 2x and 3x, f8 at 3x) appear three times:
    - with v4's wine tones
    - as built
    - with zero-chroma greys of the same lightness (#353535, #252525, #1c1c1c; L* 22.2, 14.7, 10.3; C* 0).
  - Each set sits on the boards' grass, on the game's dirt, and under the boards' night multiply.
  - Below them are 1:1 crops of the in-game stand shot at default zoom, v4 and v5.
  - **By eye, v5 can't be told from the zero-chroma control** at any size or on any ground. v4's tones read maroon on both grounds.
  - In the game at 1:1, v4's robe reads wine-red against the dirt. v5's reads black, and the crimson rim and the tatter tips stand out from it.
- **Kept as asked:**
  - the r rim down the top-left edge
  - the grimoire's fire (i / r / R on the cast).
  - Round 4's R hem was the row-38 dashes, and fix 3 says those go (see departures).
- **Crimson, by round 4's count** (r and R as a share of the robe's cloth, rows 20–38, the book left out): f0 9.5% (v4 9.3%). The highest is 11.7% (f17), and every idle and walk frame is at most 10.8%.

### A2. The face leads
- **The panel (x 23–32) runs over rows 28–36, one value down:** lit edge T, then Z, then Q Q Q (v4: T, z, Z Z Z). It stops above the tatters (v4 ran to row 38).
- **Its mean luma** is 134–141 on every idle and walk frame (39–47 px), under the skull's 151–167 (rows 12–19, the same bone keys).
  - On f0 it's 136 against 157. v4 was 172 against 155.
- **The runes** keep their green glow and move with the panel. The third row of glyphs moved up to row 35 so it stays on the shortened panel.
- **The panel and glyphs shift with the walk's lean** (`Lx = round(lean / 2)`), so they stay on the robe.

### A3. Tatters that read, and night on every frame
- **The hem is cut in V points 2 rows tall**, one every 5 px:
  - full on row 36
  - each point's body 3 px wide on row 37, in the robe's own tone, with a 1-px r drip down its middle
  - a 1-px r tip on row 38 under the drip.
  - The points shift with the hem kick on f8–9 and f12–13. Round 4's row-38 R dashes are gone.
- **Night 5+ on every idle and walk frame**, f0–f15:
  44.1, 43.4, 43.4, 43.4, 43.3, 43.1, 44.0, 44.3, **42.2 (f8, worst)**, 42.9, 44.3, 42.7, 43.4, 43.8, 44.8, 42.3%.
  - Bar 40. v4's f8 was 39.8.
- **Bright** is 28.1–29.9% (bar 20).
- **The lit top-left rim (r) stays.** It now stops at row 35, above the tatters, so the first point reads as a tatter and not as the rim running on.

### Other necromancer changes, and what they moved
- **Pauldrons simplified and joined into a bone collar.** The rib alternations (z/T, T/Z) are gone and the clasp now connects the two pauldrons.
  - This, the brow row and the one-tone cuffs together take stripes down columns from 10.0 to 0.
- **Head row 13** is now `zzzz` (the brow's lit plane two rows deep), which kills the z/Z alternation down the brow.
- **The near cuff is one tone (Z), 1.5 px up from the hand.** The far wrist gets a matching Z cuff at the book. The far sleeve is one tone (4).
- **Boot toe and heel have a cool lit edge (Q)** where they show under the hem.
- **The staff's skull row is `zzZZQ`** (v4 `zZzZQ`, a stripe).
- **The rim is now tested against the figure's own parts**, so the staff behind him no longer hides his edge from the light.
- **On the walk, the upper body leans 1 px forward** on each step's up frame (f11, f15). Walk upper change rose from 0.49 to 0.61 (`measure.mjs`), proxy 40.1 → 53.3%.
- **The idle's smallest transition** rose from 62 to 76 px with the round's changes together. The idle itself wasn't retimed.
- **What moved the other way** (the necromancer isn't held to bar 5):
  - bright 32.0 → 29.5% (f0), which the review predicted for the panel step
  - idle upper change 0.29 → 0.28 (proxy 22.6 → 21.5)
  - doubled ink 1.27 → 1.41 per frame
  - my notch count 4.91 → 5.05.
- **islandShare** fell from 0.1145 to 0.1089.

## B. Sorcerer

- **The flame carries through the walk.**
  - The idle's flame shrinks to a 3x4 version, held in the palm at the waist in all 8 walk frames (x 17–23, rows 26–30, 8–9 px).
  - It burns in the idle's four flicker phases (pale core f, orange o, deep tongue O). Its tongue trails a pixel on the passing frames.
  - It lights the beard and sleeve within a radius that flickers with it: 5 + (0, 2, −1, 1) px on the walk, 11 + (0, 1, −1, 1) in the idle (v4: a fixed 11).
- **The tome is gone.**
- **The idle keeps its flicker** (same four phases).
- **Doubled ink cleared:**
  - (35,20), (30,24) and (15,25) on f0, and (20,19) with them. The doubled ink below the hat is filled with the sleeve's blue (u / 7 / U).
  - Doubled ink fell 4.55 → 2.55 per frame. On f0 it went from 6 to 2; the two left are the hat-brim corners (18,12) and (28,12), unchanged since round 3.
- **The staff's claw is redrawn in solid runs:** a lit prong (g g), a far prong (N N) and a 3-px base (N N N). Before, it had four lone pixels.
- **Measures:**
  - islandShare 0.0977 → 0.0927
  - notches 6.55 → 4.55
  - night 5+ worst 50.8 → 52.1%
  - smallest idle transition 35 → 37
  - nothing worse (table above).

## C. Assassin

- **The hood's peak holds on row 7 through the breath (f3–5).** On the breath frames the cap squashes into the row below instead of lifting: rows 7–8 become `........999...` / `.......99VVq..`.
  - The top colour row is 7 and the outline's row is 6 on every idle frame (v4: 6 and 5 on f3–5).
  - Idle f3–5 change by 3–4 px each against v4.
- **A glint on the raised blade.** The far dagger's shadow side catches the light (w) twice per breath, at 2, 5, 7, –, 3, 4, 7, – px from the hand over f0–7.
  - It keeps the idle moving where the hood no longer does: the smallest idle transition went 43 → 45.
  - The spots are where the glint doesn't cut a lone steel pixel off the blade's shadow line. Running it up one pixel a frame added 14 islands.

## Optional polish (done only where nothing measured got worse)

### Knight: the cape billows on the breath
- The idle's `capeBack` went from 0 1 1 2 2 1 1 0 to 0 1 1 3 3 2 1 0.
  - The cape's trailing edge (its leftmost pixel) now runs x 11, 10, 10, 8, 8, 9, 10, 11 over f0–7 (v4: 11, 10, 10, 9, 9, 10, 10, 11), so it travels 3 px instead of 2.
  - Only f3–5 change (33–44 px each). The walk and attack frames are pixel-identical to v4.
- **What it moves:** idle upper change by proxy 17.1 → 17.2% (`measure.mjs` 0.22 → 0.22).
- **Every bar-5 measure is equal.** The smallest idle transition stays 40, at f0→f1. f4→f5 went 65 → 58, and f2→f3 went 403 → 431.

### Ranger: destriped down the columns, doubled ink cleared, a glint on the bow
- **Destriping:**
  - The cloak is destriped down the columns (L/E, l/e, L/e, e/E) as well as along the rows.
  - The leather from row 28 down is paired into 2-px bands both ways (B / #5e3230), away from the bow.
  - Head row 20 is now `.eLeeeEEESSS..`.
  - Stripes went 2.75 → 0.50 along rows and 5.19 → 1.06 down columns.
- **Doubled ink:**
  - At the junctions (quiver and hood, arm and string, the boots), it's filled with the cloth or leather beside it, but only where the outline keeps an ink neighbour, and never next to the bow's limbs.
  - (19,16) on f0 is cleared.
  - Doubled ink went 4.51 → 3.96 per frame, notches 7.32 → 6.45.
- **The glint:** a w pixel runs up the bow's top limb one step a frame, idle and walk. The smallest idle transition went 38 → 41.
- **Everything else is equal or better:**
  - night 5+ 53.5 → 53.7% (worst 52.5 → 52.9)
  - bright 27.1 → 27.4%
  - islandShare 0.1078 → 0.1064.

### Assassin: the walk's scarf ends at about x 8
- **The walk box is now 33–37 px (v4: 39–44).** The idle box is unchanged at 32–35, and the attack is pixel-identical.
- **The streaming scarf is the same wave, cut short.**
  - It shows 6 of its 8 segments, 1.0–1.05 px each, and its ripple rises from 1.6 to 1.8 px at the tail. The band darkens toward its new tail exactly as the full one did.
  - The lick of fire at the tail now leans 1 px (v4: 2).
  - Its leftmost pixel is at x 8–10 over f8–15 (v4: 1–4).
  - The far arm's walk positions are back to v4's.
- **What it moves:**
  - walk upper change 0.56 → 0.57 (proxy 45.8 → 46.9)
  - walk drift 1.14 → 0.99
  - islandShare 0.1164 → 0.1156 (with the glint choice above).
  - Stripes stay at 5.00 / 0.00 (the eyes' scowl, row 15–16 x 25–29, as in v4).

## What changed in the kit

`kit.js` is round 4's kit plus:
- **`fillDoubled(pic, allowed, where, ink, anyNeighbour, keepLine)`** fills the review's doubled-ink pattern with the colour beside it.
  - With `keepLine`, it only does so where the outline pixel left behind keeps another ink neighbour, so no lone outline pixel (an island) is made.
- **`destripeCols(pic, pairs, where)`** and **`destripeWhere(pic, pairs, where)`** are round 4's `destripe` down columns, and along rows limited to a region.
- **`roundDoubled(pre, out, ...)`** fills both doubled pixels in the un-outlined picture, so the outline goes round one pixel thick.
  - It's not used. It moved the problem a pixel along, and on the assassin it turned the dagger guard into a 5-px gold block.

## Where I departed from the brief, and why

1. **The necromancer's tatter bodies are 3 px wide, not 2,** with an r drip down the middle into the tip.
   - The 2-px bodies of the spec measured 5.5 doubled ink per frame (v4 1.27), because each tip's side outlines landed against the gap's ink.
   - A tip in r under an R or robe-tone body is a lone pixel (an island) on every point. The drip joins it to its body.
2. **No R in his idle or walk any more.** Fix 1 says "keep the R hem", but fix 3 says the row-38 dashes go, and those dashes were his only R. R still burns in the grimoire's fire on the cast (f16–18, f20–21).
3. **The rim stops at row 35,** so it doesn't run into the first tatter.
4. **More was changed on the necromancer than the three fixes,** each named above with its measure:
   - the collar and simplified pauldrons
   - the brow row, the one-tone cuffs and the staff skull row (stripes down columns 10 → 0)
   - the boots' lit edge
   - the walk lean.
5. **The runes stay acid green** (round 4's departure, kept).
6. **Two doubled-ink spots remain on each of two heroes.**
   - **Assassin (30,21) and (28,25):**
     - Filling them leaves a lone outline pixel on most frames. islandShare would rise from 0.1156 to 0.1167 (far hand only) or 0.1180 (both), over v4's 0.1164.
     - The keep-the-line fill only reaches the near guard on f2–f6, so the guard would pulse in width through the idle. I left both.
   - **Ranger (31,24) and (27,37):** for the same reason.
7. **The assassin's scarf is cut short, not squeezed.**
   - Compressing all 8 segments into the same length made a 4-px P/p stripe on f10 (row 24, x 12–15) and raised islandShare to 0.1182.
   - I tried 144 variants, varying length, step, droop, ripple, the far arm and the fire's lean. This is the one with nothing worse.

## Still weak

- **Necromancer:**
  - At 1x in the closer shots, the bone panel with its green runes is still the lightest patch below the collar, though it now measures under the skull.
  - Bright dropped to 28–30% (bar 20).
  - Doubled ink is up a little (1.41 per frame).
- **Assassin:**
  - The shorter scarf reads at 1x as a short flag with a flame rather than a long stream.
  - His second step differs less from his first (66 px at the least, from 98).
  - (30,21) and (28,25) remain.
- **Ranger:** 3.96 doubled ink per frame is still the team's highest; (31,24) and (27,37) remain.
- **Stripes left by design:**
  - the assassin's scowl (row 16, 5 px a frame)
  - the knight's face plate under the visor slit and his plume (5.0 / 1.0)
  - the sorcerer's face under the brim and the beard's edge against the robe (6.25 down columns, unchanged since round 4).
- **Night margins on the dark heroes** are 2.2–2.4 points: the assassin's worst is 42.4% and the necromancer's 42.2%, against 40.
- **The sorcerer's walk flame is small** (3x4 at the waist). It flickers in all 8 frames but is a spark next to the idle's raised fire.
