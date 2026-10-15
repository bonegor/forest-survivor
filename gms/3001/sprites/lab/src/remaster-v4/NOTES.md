# Remaster V4: the five heroes, round 4

Five entries, all `collection: 'Remasters'`, each `lab:<class>/remaster-v4`: knight, archer, mage, rogue (the assassin), necromancer. The v3 sources were copied here and evolved; remaster-v1, -v2 and -v3 are untouched.

Build all five with:
`node gms/3001/tools/build.mjs gms/3001/sprites/lab/src/remaster-v4/{knight,archer,mage,rogue,necromancer}.js`

| | build line | verdict |
|---|---|---|
| knight | 33 px tall · 22 frames (idle 8, walk 8, attack 6) · 14 colours · outline 99% · night 58% | lines up cleanly |
| archer | 33 px tall · 70 frames (idle 8, walk 8, attack 6) · 17 colours · outline 100% · night 54% | lines up cleanly |
| mage | 37 px tall · 22 frames (idle 8, walk 8, attack 6) · 23 colours · outline 100% · night 52% | lines up cleanly |
| rogue | 34 px tall · 22 frames (idle 8, walk 8, attack 6) · 13 colours · outline 100% · night 43% | lines up cleanly |
| necromancer | 37 px tall · 22 frames (idle 8, walk 8, attack 6) · 14 colours · outline 100% · night 42% | lines up cleanly |

The knight's outline is 99% because f17's motion streaks are now drawn without ink (as asked).

**Evidence** (all in `gms/3001/sprites/lab/review/`):
- `review.mjs` boards: `<class>-remaster-v4.png` (+ `.json`), and `team-remaster-v4.png`.
- `shot.mjs --zoom=closer`: `<class>-remaster-v4-{stand,walk,fight}.png`.

## What changed in the kit

`kit.js` is round 3's kit plus:
- `destripe(pic, pairs)`: along rows, an alternation A B A B of a listed colour pair becomes A A B B (two 2-px bands), and a lone A B A becomes A A A. Only the listed pairs are touched, so a 1-px mid-tone crease between two lit pixels (a fold line) stays.
- `folds(..., { minWidth })`: a fold panel narrower than `minWidth` px (near the gather point) stays flat, so the folds merge at the shoulder instead of alternating 1-px stripes.

## Measurements

Same definitions as round 3 (my scratch tools, re-checked against `measure.mjs`):
- **Night** is the review's test (night luma ≥ the night grass + 20 = 35.4) on idle f0.
- **Night 5+** counts only colours at least 5 luma over that line.
  - In v4 the two numbers are identical for every hero: no colour sits between the line and +5.
  - The colours within 5 luma of the line all sit *under* it and carry nothing: the knight's R (−1.0) and n (−2.1), the ranger's E (−0.8), the sorcerer's u (−1.8), the necromancer's R (−1.0) and W (−2.6), all master keys.
- **Notches** is my count of inner ink touching the outline. It runs about twice the review's "doubled ink", so compare rounds by the change.

| | knight | ranger | sorcerer | assassin | necromancer |
|---|---|---|---|---|---|
| night (= night 5+) | 58% (v3 58) | 54% (v3 48 at 5+) | 52% (v3 51 at 5+) | 43% (v3 31 at 5+) | 42% (v3 38 at 5+) |
| bright (> luma 150) | 36% | 27% | 24% | 27% | 32% |
| dark (< luma 50) | 29% | 37% | 29% | 51% | 49% |
| upper change idle / walk | 0.22 / 0.60 | 0.21 / 0.47 | 0.22 / 0.59 | 0.21 / 0.56 | 0.29 / 0.49 |
| idle transitions, px (min) | 40 54 403 60 65 392 67 80 (40) | 54 62 314 102 38 301 148 59 (38) | 46 47 324 35 69 309 45 39 (35) | 62 71 204 163 43 199 180 48 (43) | 118 65 313 63 115 263 117 62 (62) |
| walk: f12–15 vs f8–11, px | 309 265 72 230 | 199 211 58 209 | 190 139 51 156 | 299 266 98 260 | 318 218 146 292 (v3: 0 0 0 0) |
| inkWall / stray / pieces | 0 / 0 / none | 0 / 0 / none | 0 / 0 / none | 0 / 0 / none | 0 / 0 / none |
| islandShare | 0.117 | 0.108 | 0.098 | 0.116 | 0.114 |
| notches per frame, v3 → v4 | 6.2 → 5.3 | 10.1 → 7.3 | 7.0 → 6.5 | 1.9 → 3.5 | 7.6 → 4.9 |
| drift idle / walk | 0.44 / 1.24 | 0.38 / 0.80 | 0.13 / 1.60 | 0.60 / 1.14 | 0.67 / 1.39 |
| colours | 14 | 17 | 23 | 13 | 14 |
| idle width, px | 32–34 | 32–33 | 36–37 | 32–35 (v3 37–38) | 27–29 |

**Frames and alignment:**
- Feet are on row 39 in every idle and walk frame. No frame of any hero, attacks included (all 70 of the ranger's), goes below row 39 or touches the canvas border. Two things had to move for that: the assassin's 11-px blades in the walk and on f20, and the necromancer's blast.
- Eye lines:
  - knight's visor row 17
  - ranger 17
  - sorcerer 17
  - assassin 15–16
  - necromancer 15
- Hood points and crowns stay at row 6 or below (the assassin's peak is on row 7, its outline on 6).

## Round-4 bars

1. **Full compliance.**
   - **The necromancer's robe is black:** his own warm blacks, '1' #4f2a36, '3' #3a1e29 and '4' #2a161e, none of them another hero's colour.
   - **Crimson is only a rim, a fold, the hem's tatters and the book's fire:**
     - In the robe (rows 20–38, the book left out) crimson is 9.3% on f0, and 8.0–11.4% across all 22 frames (v3: 35% by the same count).
     - The runes went acid green instead (see "Where I departed").
   - **No two heroes share a main cloth colour:**
     - knight: scarlet 5 / r / R
     - ranger: green l / L / e / E
     - sorcerer: blue u / 7 / U / 8
     - assassin: violet h / q / #552d5c
     - necromancer: '1' / '3' / '4'
2. **Two different steps.** Every walk's second step differs from its first on every frame pair (table above).
   - The robed heroes mirror the hem kick: the first step kicks the front corner over a toe, the second the back corner over a heel.
   - The necromancer's staff plants once a stride.
   - The ranger's and assassin's secondary motion runs on 8-frame cycles, not 4.
3. **The weapon is in view on the impact frame:**
   - knight f19: the crescent and blade.
   - ranger f20: the release frame, the bow forward.
   - sorcerer f19: the staff and frost star.
   - assassin f19: both blades and the crossing trails.
   - necromancer f19: the staff in front of the body, its skull at (35–39, 12–16), clear of the head, the soul-fire blast at x 40–45; the crown is intact.
4. **Night without gaming.** Every hero clears its bar counting only colours 5+ luma clear: 58 / 54 / 52 (bar 50) and 43 / 42 (bar 40, with 27% / 32% bright and a lit top-left rim). Light came from:
   - **Ranger:** a pale linen shirt and sleeves, light bow wood, a widened shirt V. Her leather shadow, the shared #7d4540 at +3.8, is now #5e3230 at −6.5, well under the line; the sorcerer's staff wood and the knight's belt use the same colour.
   - **Assassin:** p went from #6f3d78 (+4.0) down to #552d5c (−5.6), so nothing is lifted. The light comes from:
     - the scarf pulled up over his nose as a magenta mask
     - wider moonlit planes and the rim
     - steel bracers
     - 11-px blades
     - lilac knee guards and a lit near-leg edge.
   - **Necromancer:** bone (a throat clasp, a 5-px panel, a deeper pauldron row), the crimson rim, and glowing green runes and eyes.
5. **Appeal:** the bolder moves, per hero, below.
6. **Knight:** polish only, and the plume's f0 twitch is gone.
7. **Measure targets:** all met (table above): walk ≥ 0.45, idle ≥ 0.10 with no frame equal to the next, inkWall 0, no strays, islandShare ≤ 0.12, feet on row 39.

## Checklist: every fix in ../remaster-v3/REVIEW.md

### Knight (SHIP; polish only)
1. **A wave, not a flick.** Done.
   - The plume tail's leftmost column on row 15 now runs x 12, 12, 11, 11, 10, 10, 11, 11 over f0–7 (v3: 12, 11, 11, 10, 10, 10, 11, 11).
   - The cape carries the frames where the plume holds. Its trailing edge (row 33, breath-corrected) runs 10, 9, 9, 8, 8, 9, 9, 10, stepping exactly on the plume's holds.
   - f0→f1 40 px, f4→f5 65, f6→f7 67.
2. **Motion streaks without ink (f17).** Done.
   - Two 1-px lines drawn after the outline, so nothing boxes them: from the arm's edge at (12,19) to (3,16), and from (11,21) to (5,19).
   - Each runs parallel to the blade and tapers G → g → N toward x 3.
   - They start on the outline, so the frame stays in one piece.
3. **The last stripes and notch.** Done.
   - `folds(minWidth 2)` + `destripe(5/R)`: the 1-px @ / R alternations went from 94 (v3, all frames) to 0. The fan folds keep their lit creases.
   - The plume's front tip ends in R at (24–25, 11), so the 2-px ink step on the crown is gone. The cost is about 1 island per frame (islandShare 0.114 → 0.117).
   - The belt and grip moved off the master b #733e39 (+0.1 over the night line) to #5e3230.

### Ranger
1. **Open the tent.** Done.
   - **The cloak hangs behind her:**
     - from the shoulders (x 14–21), its front edge stops at the belt (row 27) and is cut back from there
     - the tail reaches row 31 at the back (f0: x 12–17 on row 29, 11–15 on row 30, 12–13 on row 31), cut in 2-px tatters that ripple on an 8-frame cycle
     - shaded as a hanging sheet: lit outer edge, mid e, a dark crease toward her back, so it recedes behind the brighter hood.
   - **The torso and bow arm show:**
     - a leather jerkin open over a pale linen shirt (collar and V)
     - cream sleeves, leather bracers, the light belt.
   - **The hood's point** rises to row 8: (22,8) in the idle with the forward lean, (20–21,8) in the walk.
   - **Weight forward:** the head and chest lean 2 px ahead of the hips in the idle (v3: 1); idle drift stays 0.38.
   - **Green is 36% of her coloured pixels** (v3 39%). See "Still weak".
2. **Make the shot read at 1x.** Done.
   - **f20:** the thrown string hand is a 2x2 fist (s / S) at (18–19, 19–20), edged in k where it meets the hood's green. The elbow sits back at (16,22), so the arm reads.
   - **The walk:** the arrow stays nocked in all 8 frames, the drawing hand on the string. Its tip is 5–7 px past the grip (tips at x 37–40, grip x 31–33).
3. **Craft where the eye goes.** Done.
   - **The cloak:** 2-px bands (`destripe` on L/E, l/e, L/e, e/E).
   - **Between the feathers:** no ink. Row 10 of the fletching is now G across, so (12,10) and (15,10) are gone.
   - **Junction notches cleared:**
     - quiver against hood: the hood's back edge pulled in 1 px on rows 11–12
     - chin over collar: a neck now reaches the chin
     - cloak against arm: the front edge meets the sleeve, then cuts away steeply, so no row has a 2-px gap.
   - **Notches** 10.1 → 7.3 per frame; 5 on f0.

### Sorcerer
1. **Make the ember a weapon.** Done.
   - The hand is at head height (palm (12–13, 16), cuff at (11, 16–17)).
   - It holds a 5x5 flame (rows 11–15, x 10–14) in four flicker phases: a pale core f, an orange body o and a deep orange tongue O licking upward, all emissive (`emissive: 'cXofO'`).
   - The fire throws a 1-px warm rim (y) on the left edges of the raised sleeve and the top of the beard.
   - **The cast no longer drops it:** the flame stays in the free hand through the wind-up (f16–17), then the frost star's ember core takes over.
2. **A stern face.** Done.
   - Each brow is 3 px, angled down to the nose: (21,15), (22,15) → (23,16), and (28,15), (27,15) → (26,16).
   - Row 16 between them is K (the brim's shadow).
   - The eyes on row 17 are c: a frost glare, glowing in the dark.
3. **The staff forward, for real.** Done.
   - Foot at (32,38), orb at (40,6), the hand gripping at (36,22): about 14° off vertical, leading the stance.
   - The walking staff leans forward too: its orb is 3 px ahead of its foot (v3: 1 px).
- **Walk:** the second step kicks the back hem over a heel; the beard, hat tip and back hem run on 8-frame cycles.

### Assassin
1. **A peaked hood.** Done.
   - The crown rises to a peak at (26,7) and hooks forward over the eyes to (30,11).
   - The back of the cowl is pulled in to x 18 on rows 12–18, so the head is a pointed hood about 12 px wide.
   - The #d9a6ff rim runs up the back slope to the peak, 2 px per row, so it reads as a line, not specks.
2. **A scarf that trails.** Done.
   - **Idle:**
     - two tails fall from the knot behind the neck, each about 2 px wide, parting as they fall to about (10–13, 29) and (14–16, 31), swinging through the idle
     - magenta lit on top (I), shaded under it
     - each burns out in a 2–3 px flicker of lilac fire.
   - **Walk:** keeps the streaming scarf, with a smaller lick of fire (5 rows, 2 colours) instead of the bulb.
   - **Idle box** 32–35 px (v3 37–38).
   - **The scarf rises over his nose as a magenta mask**, which ties it to the face and gives a dark hero a light mass.
3. **Rework the attack.** Done.
   - **f16–17:** both blades cross in an X in front of the chest (rows 18–24), the far arm drawn in front for the coil, clear of the scarf.
   - **f18:** the trail runs from the shoulder down to the knee, about row 32.
   - **f19:** the crossing slash; the two trails now touch, so no ink wall sits between them.
   - **f10 and f14:** the passing foot is carried 2 px ahead of the stance shin, its top edge lit (9 on the near leg, j on the far), so both legs read.
- **Value:** see bar 4 above. 43% night at 5+, 27% bright, 51% darker than luma 50 (v3 57%), so he stays a shadow.
- **Craft:**
  - The eyes are two 3-px white slits, the inner ends a row lower (the scowl), instead of four lone pixels.
  - The limbs are 2-tone (moonlit near arm, steel bracers), so diagonal limbs don't speckle.
  - islandShare 0.116.

### Necromancer
1. **Blood-black, and not the knight's red.** Done.
   - **The robe, sleeves and cowl** are black with a lit plane, a mid and a deep fold, plus lit ridges beside deep creases.
   - **Crimson only as:**
     - a 1-px r rim down the left silhouette, from the crown band down the cowl and robe to the hem (rim pixels must run on in a line, so there are no specks)
     - the blood-soaked hem: R on the tatters left between the notches
     - the grimoire's fire (i / r / R).
   - **Share:** crimson is 8.0–11.4% of the robe in every frame (bar 12%).
   - **Night:** 42% (bar 40%), 32% bright.
   - **The bone that carries it:** a throat clasp with a glowing soul gem, a 5-px panel, a deeper pauldron row.
2. **Keep the staff in sight on the blow.** Done.
   - **f18:** the staff is whipped over the top behind his head: a 1-frame bone-white smear (z → Z) along its path, the crown intact.
   - **f19:** the staff is driven forward in front of the body at −35°, its skull at (35–39, 12–16), well clear of the crown. Acid-green soul fire blasts from it at x 40–45.
   - **f20:** wisps.
   - **The grimoire's role:** its pages burst into blood flame in the wind-up (f16–17), so the cast reads the spell and then strikes.
3. **Two different steps.** Done.
   - **The staff plants once a stride** (f8, foot at x 17) and stays planted while he passes it (17 → 15 → 13). It lifts on f11 and swings forward over f12–15.
   - **The hem:** f8–9 kick the front corner over a toe; f12–13 kick the back corner over a heel.
   - **The grimoire** counter-swings ±1 px.
   - Second step vs first: 318, 218, 146, 292 px (v3: 0, 0, 0, 0).
- **Also:**
  - The z / Z alternation down the lit cheek (x 20, rows 13–16) is now one z line.
  - The grimoire has black boards with bone corners, pale pages and glowing glyphs (i), so it no longer reads as a slice of cake. Embers rise off it in the idle.
  - The ink between the crown's spikes is now the hood's black.
  - Notches 7.6 → 4.9.

## Where I departed from the review, and why

1. **The necromancer's runes are acid green (l / L, glowing), not crimson.** The review allowed crimson runes inside the 12%. With the rim, the hem and crimson runes, the robe measured 17–20% crimson. Moving the runes to green brought it to 8–11% without thinning the rim, which is what reads at night and at 1x. Green also ties the panel to his eyes, his soul fire and his skeletons (his weapon is "raise"). Crimson now means blood (rim, hem, the book's fire) and green means necromancy.
2. **The necromancer's blow is the staff's soul fire, not the book's burst.** Both bursting at once crowded the right side. The book flares in the wind-up and the staff strikes on the blow, which keeps the skull clear and the crown whole.
3. **The ranger's hood point is at (22,8) in the idle**, a pixel forward of the suggested (21,8), because her head now leans 2 px forward. It's (20–21,8) in the walk.
4. **The assassin's eyes are 3 px each.** The "\ /" scowl is kept by dropping the inner ends a row. Four lone pixels per frame were 0.7% of his speckle.

## Still weak

- **Ranger: green is 36% of her coloured pixels**, not the suggested 30%.
  - The cloak is narrower and darker now, so the remaining green mass is the hood, which grew with the raised point.
  - Cutting it further would mean a smaller hood. At 1x the torso, shirt and bow now read in front of it.
- **Ranger: 7.3 notches per frame** (v3 10.1). They sit where the bow and string pass the face, the far arm and the hand. They're left as ink on purpose, because filling them bumps the limb (round 3's accepted departure).
- **Night margins on the dark heroes are modest:** 43% and 42% against 40%. Every point is earned by light masses, nothing sits within 5 luma over the line.
- **Speckle sits near the bar on three heroes:** knight 0.117, assassin 0.116, necromancer 0.114. The knight's rose by the plume-tip fix itself; the assassin's is mostly ink on his peak's 45° slopes.
- **Sorcerer at 23 colours** (+O for the flame's tongue), one under the cap.
- **Sorcerer's idle box is 36–37 px:** the fire held out at the left and the staff leaning forward widen it. That's the price of the commanding pose.
- **The necromancer's bone panel with green runes is the brightest thing on his robe;** at 1x it can read as a pale apron.
