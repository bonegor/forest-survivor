# Review: remaster-v5

This round uses the same rubric, anchors, strictness and measures as `../BASELINE.md` and the reviews of rounds 1–4, so the scores compare across rounds. Round 4 is commit 4042287 (its review ed84ba0); round 5 is 27a4fe1.

I re-ran the same scripts as in round 4, unchanged, on both `remaster-v4` and `remaster-v5`. On v4 they reproduce every round-4 figure.

**Evidence:**
- `review.mjs` on the five `remaster-v5` sprites and `--team=remaster-v5`, and again on `remaster-v4`.
- `shot.mjs` on all five at the default zoom and at `--zoom=closer`. I took v4's shots again too, so both rounds are compared under today's game code. No errors in any shot.
- In-game shots at the forest's mid-run night (the ambient patched to `[102, 110, 164]` in the headless page, as in round 4) for both rounds of the two dark heroes.
- Native-size and 3x crops of every in-game shot, v4 beside v5.
- Gridded zooms, palette-key dumps, the boards' onion skins, v4 → v5 pixel diffs per frame, and clean renders on the forest grass by day and under the boards' night multiply.
- **For the necromancer's robe:** CIELAB per frame, the robe's colour as the game draws it, and the generator's control render (`review/necromancer-remaster-v5-robe-control.png`), checked against my own crops.
- A check that each committed sheet matches a fresh in-memory build of its source: 0 px differ, in all five.

Coordinates are (x, y) in the 48x48 frame. The feet row is 39 and the sole row 38. Letters are `palette.js` keys; other colours are written as hex. The necromancer's own keys '1', '3' and '4' are now #38333c, #28242c and #1e1b22.

## Scores

| Hero | 1 Align | 2 Silhouette | 3 Team | 4 Anim | 5 Craft | 6 Palette | 7 Appeal | Overall | Verdict | v4 |
|---|---|---|---|---|---|---|---|---|---|---|
| **knight** | 10 | 9 | 9 | 8 | 8 | 8 | 8 | **8.5** (8.57) | **SHIP** | 8.5 SHIP (10 9 9 8 8 8 8) |
| **archer**, ranger | 10 | 8 | 9 | 8 | 8 | 8 | 8 | **8.5** (8.43) | **SHIP** | 8.5 SHIP (10 8 9 8 8 8 8) |
| **mage**, sorcerer | 9 | 9 | 9 | 8 | 8 | 8 | 8 | **8.5** (8.43) | **SHIP** | 8.5 SHIP (9 9 9 8 8 8 8) |
| **rogue**, assassin | 10 | 8 | 9 | 8 | 8 | 8 | 8 | **8.5** (8.43) | **SHIP** | 8.5 SHIP (10 8 8 8 8 8 8) |
| **necromancer** | 9 | 8 | 9 | 8 | 8 | 8 | 8 | **8.5** (8.29) | **SHIP** | 8.0 ALMOST (9 8 8 8 8 7 8) |

The wraith (`rogue/remaster-v2-wraith`) wasn't carried forward, so its round-2 score (6.5, NOT YET) stands.

**Summary:**
- **All five heroes ship.** Every criterion is 8 or more for every hero, and alignment is 9 or 10.
- **The necromancer ships for the first time.**
  - His robe now reads black, with blood-red edges, at 1x in the game. That was the last criterion short, and palette rises from 7 to 8.
  - His panel steps back behind his face, and his hem is cut into tatters that clear the night bar on every frame.
  - With the robe out of the red family, the five heroes have five unrelated dominant hues, so team rises from 8 to 9.
- **The assassin's team score rises from 8 to 9.** His walk is now 33–37 px wide (v4: 39–44), in line with the team, and his hood stays within the headgear limit on every frame. Those were the two reasons I held him at 8.
- **The other three got the polish they were asked for,** and none of the bar-5 measures got worse. The knight's idle drift rose 0.13 px, still well inside its 1-px bar.
- **My recommendation: the team is ready to go into the game.** See "Ready for the game?" near the end.

**Scoring conventions** are round 4's: alignment 10 only where a visible gait was verified frame by frame, and 9 for robed heroes. I re-verified the gait: contacts at x 18–20 and 27–29 on both f8 and f12 for the ranger and the assassin (the knight's 1 px right), and the planted sole travelling back 28 → 27 → 24 → 22 → 19.

## The numbers, checked

**The generator's report holds up.** Every figure in its tables matches my runs to the decimal, measured its way. Its notes now give a denominator for each measure, as round 4 asked. One denominator per measure, as I measured them:

| Measure (denominator) | knight | ranger | sorcerer | assassin | necromancer |
|---|---|---|---|---|---|
| night at 5+ luma, f0 / worst idle-or-walk frame (share of the frame's opaque pixels) | 58.5 / 56.6% (f13) | 53.7 / 52.9% (f4) | 52.9 / 52.1% (f15) | 42.9 / 42.4% (f12) | 44.1 / 42.2% (f8) |
| bright (> luma 150), f0 / worst (same denominator) | 35.5 / 34.0% | 27.4 / 27.0% | 23.9 / 23.4% | 27.2 / 26.8% | 29.5 / 28.1% |
| smallest idle transition | 40 px | 41 px | 37 px | 45 px | 76 px |
| upper change, idle / walk (`measure.mjs`) | 0.22 / 0.60 | 0.21 / 0.47 | 0.22 / 0.59 | 0.21 / 0.57 | 0.28 / 0.61 |
| stripes, rows / columns (mean px per idle and walk frame) | 5.00 / 1.00 | 0.50 / 1.06 | 0.00 / 6.25 | 5.00 / 0.00 | 0.00 / 0.00 |
| islandShare (all frames) | 0.1166 | 0.1064 | 0.0927 | 0.1156 | 0.1089 |
| second step vs first (f12–15 vs f8–11), px | 309 265 72 230 | 199 212 59 210 | 177 130 52 148 | 272 231 66 246 | 305 220 140 296 |
| colours | 14 | 17 | 23 | 13 | 14 |

**The necromancer's three fixes, measured:**
- **Robe chroma, pixel-weighted over tones '1', '3', '4':**
  - f0: C* 5.80, L* 14.16 (v4: 14.44, 14.42)
  - highest: f3, C* 5.84
  - L* runs 13.91–14.53 across f0–15.
- **Panel against skull (mean luma of the bone keys):** 134–141 against 151–167 on every idle and walk frame. On f0 it's 136 (46 px) against 157 (52 px). The closest frame is f6, at 15 under.
- **Crimson, as a share of the robe's cloth** (rows 20–38, the book left out):
  - 9.5% on f0, at most 10.8% on any idle or walk frame, and 11.7% at most on the cast (f17)
  - all of it r: R no longer appears in his idle or walk.

**Where my numbers differ:**
1. **Doubled ink.**
   - The generator's figures are its reconstruction, averaged over all frames. Mine are the round-1 script, averaged over the idle and walk frames.
   - Mine, v4 → v5: knight 1.1 → 1.1, ranger 4.5 → 3.5, sorcerer 5.4 → 3.3, assassin 2.9 → 2.9, necromancer 1.2 → 1.3.
   - The direction agrees for every hero.
2. **The assassin's walk upper change.**
   - By `measure.mjs` it rose from 0.56 to 0.57, and by the generator's proxy from 45.8% to 46.9%.
   - By the round-1 script it fell from 50.3% to 49.9%: the scarf cut that I asked for removed some moving pixels.
   - So "no bar-5 measure got worse" holds on `measure.mjs` but not quite on the old script. A 0.4-point dip isn't visible, and I don't count it against him.
3. **One near-duplicate colour, not reported.**
   - The robe's deepest tone, #1e1b22, sits 9.7 RGB from the ink #181425, and the baseline's test counts anything under 10 as a near-duplicate.
   - That tone was my own round-4 recommendation.
   - At 1x it reads as the outline on the robe's shadow side, so I don't score it. #201c24 (L* 11.0, C* 6.2, 11.4 RGB from the ink) would clear it.

The previous reviewers' measures, re-run unchanged:

| | walk upper change, v4 → v5 | idle upper change, v4 → v5 | doubled ink, px per frame | night-grass clear, f0, at 5+ | px > luma 150 | px < luma 50 | 1-px stripes, px per frame |
|---|---|---|---|---|---|---|---|
| knight | 45.3% → 45.3% | 15.7% → 16.1% | 1.1 → 1.1 | 58% → 58% | 36% → 36% | 29% → 29% | 6.0 → 6.0 |
| archer | 37.4% → 37.5% | 17.5% → 17.5% | 4.5 → 3.5 | 54% → 54% | 27% → 27% | 37% → 37% | 7.7 → 1.5 |
| mage | 42.2% → 43.6% | 14.8% → 15.0% | 5.4 → 3.3 | 52% → 53% | 24% → 24% | 29% → 29% | 6.3 → 6.3 |
| rogue, assassin | 50.3% → 49.9% | 18.6% → 18.6% | 2.9 → 2.9 | 43% → 43% | 27% → 27% | 51% → 51% | 5.0 → 5.0 |
| necromancer | 32.7% → 42.2% | 17.0% → 16.9% | 1.2 → 1.3 | 42% → 44% | 32% → 30% | 49% → 48% | 10.0 → 0.0 |

- **The necromancer's walk came alive:** 32.7% → 42.2%, from the 1-px lean on each step's up frame. It was the team's quietest walk by far; now the ranger's (37.5%) is quieter.
- **The stripes left are design:** the knight's visor grille, the sorcerer's brow shadow and beard edge, and the assassin's eye slits.
- **Two regressions**, both on the necromancer and both expected:
  - Bright fell from 32% to 30%, from the panel step. Round 4 predicted about 28%; the bar is 20%.
  - Ink islands rose, from the outlines around the tatter tips: about 10 lone ink pixels a frame. His islandShare still fell, from 0.1145 to 0.1089.

## Questions from the producer

**1. Does the necromancer's robe read black with blood-red edges at 1x in the game? Yes. Confirmed.**
- **At the default zoom, 1:1:** v5's robe reads black, with a crimson line down its left edge and red tips along the hem. v4's read maroon-brown on the dirt.
- **In the game's own render,** the robe comes out as #2e2b34, #3e3a43 and their neighbours: L* 18–25, C* 6–7, hue about 305°. That's a cool charcoal. v4 rendered at C* 15–19, hue 355–359°.
- **The generator's control render agrees:** v5 can't be told from zero-chroma greys of the same lightness, on the grass, on the dirt or at night. My 3x crops say the same.
- **The accents pop now:** the rim, the drips and the book's blood flame on the cast all stand out against the black, where in v4 they were a brighter edge of the same red.

**2. Does the sorcerer's walk flame read as the same weapon as the idle's raised flame? As the same fire, yes. As the same weapon, not quite.**
- **It's clearly the same fire.** It has the same colours (an f core, an o body, an O tongue) and the same four-phase flicker, in the same hand. It's there in all eight walk frames, at x 17–23, rows 26–30.
- **It's carried, not wielded.** It's 8–9 px against the idle's 14–16, held at the hip. At 1x it's an orange ember at his waist; the raised flame is a fireball at head height.
- **So the continuity flaw is fixed:** nothing pops in and out between standing and walking any more. But the walk still threatens less than the idle. That's the first item on his road to 9 below, not a bar he misses.

**3. Recompute the generator's numbers, one denominator per measure.** Done, in the section above. Everything matches except two definitional differences and one omission:
- doubled ink: all frames against idle and walk
- the assassin's walk upper change on the round-1 script
- the near-duplicate tone, which went unreported.

**4. The departures:** all accepted. See "Departures the generator chose".

## What improved, and what regressed, since round 4

**Improved:**
- **The necromancer:**
  - a black robe with blood-red edges
  - his face leads, with the panel 15–31 luma under the skull on every frame
  - a hem that tatters
  - night on every frame (worst 42.2%, v4: 39.8%)
  - stripes down columns from 10 to 0
  - a walk with body (42.2% upper change, v4: 32.7%)
  - a bone collar joining his pauldrons.
- **The sorcerer:**
  - his flame is in all eight walk frames
  - doubled ink cleared at (35,20), (30,24), (15,25) and (20,19)
  - the staff's claw redrawn in solid runs
  - islandShare 0.0977 → 0.0927.
- **The assassin:**
  - his hood peaks at row 7 on every frame, outline at 6
  - the walk box is 33–37 px
  - a glint on the raised dagger.
- **The ranger:**
  - destriped down the columns (stripes 7.7 → 1.5 px a frame)
  - doubled ink cleared at (19,16)
  - a glint climbing the bow.
- **The knight:** the cape billows 3 px on the breath (trailing edge x 11 → 8 over f0–3, against 11 → 9).

**Regressed or still weak:**
- **The assassin's walking scarf reads as a short flag.**
  - v4's long stream said "speed". v5's cut stream ends at x 8–10 as a stubby pennant with a flame.
  - It's the right trade for the team's walk widths, but it's a small loss of drama.
- **The sorcerer's walk flame is a spark** (above).
- **The necromancer:** bright 32 → 30%, more lone ink pixels at the tatters, and the near-duplicate deep tone (all above).
- **Steps closer together:** the assassin's second step differs from his first by 66 px at the least (v4: 98), and the sorcerer's range narrowed from 51–190 px to 52–177. Both still clearly differ.
- **The knight's idle drift** rose from 0.44 to 0.57 px, from the bigger billow. The bar is 1.

## Brief compliance (round 5)

| Item | Result | Evidence |
|---|---|---|
| 1. Robe chroma ≤ 8, lightness within ±2, judged against a control | Met | C* 5.80 on f0, 5.84 at most (f3); L* 14.16 (v4: 14.42), 13.91–14.53 across frames. Control render made, and my in-game crops agree. |
| 2. The face leads: panel bone darker than the skull | Met | 134–141 against 151–167 on all 16 idle and walk frames (v4: 172 against 155). |
| 3. Night on every frame, worst frame reported | Met | Worst frames: knight 56.6% (f13), ranger 52.9% (f4), sorcerer 52.1% (f15), assassin 42.4% (f12), necromancer 42.2% (f8). The dark heroes are 26.8% and 28.1% bright at worst, with their lit top-left rims. |
| 4. Props carry through the walk | Met | The sorcerer's flame is in 8 of 8 walk frames (8–9 px). Every other hero's weapon was already there. |
| 5. Shipped four: polish only, no measured regression | Met, with one hair | Night, bright, smallest idle transition, `measure.mjs` upper change, doubled ink, stripes and islandShare are all equal or better. The assassin's walk upper change on the round-1 script fell from 50.3% to 49.9% (above). |
| 6. Stripes in both directions | Met | Rows / columns, v4 → v5: knight 5.00 / 1.00 unchanged; ranger 2.75 / 5.19 → 0.50 / 1.06; sorcerer 0 / 6.25 unchanged; assassin 5.00 / 0 unchanged; necromancer 0 / 10.00 → 0 / 0. |
| 7. Everything else | Met | Feet on row 39 in every idle and walk frame. The same gait. Two different steps (52–309 px). The impact frames' weapons unchanged. Eye lines on rows 15–17. Headgear colour no higher than row 6 (the sorcerer's hat is the standing exception). inkWall 0. 13–23 colours. islandShare ≤ 0.1166. Smallest idle transition 37 px. |
| Necromancer fixes 1–3 | Met | The review's tones exactly; the panel down one value (T, Z, Q Q Q), ending at row 36; V points with 3-px bodies (a departure). |
| Sorcerer: flame in the walk; the doubled ink | Met | See bar 4; (35,20), (30,24) and (15,25) cleared. |
| Assassin: peak at row 7; scarf to about x 8; doubled ink | Two of three | Peak and scarf met. (30,21) and (28,25) left (a departure). |
| Ranger: destripe the columns; doubled ink | Met, but | Columns destriped. (19,16) cleared; (31,24) and (27,37) left (a departure). |
| Knight: a 3-px billow | Met | Only f3–5 changed (33–44 px each); the walk and attack are pixel-identical to v4. |

## Departures the generator chose

1. **The tatter bodies are 3 px wide, not 2, with a 1-px r drip into the tip: accepted.**
   - With 2-px bodies, each tip's outline doubled against the gap's ink: 5.5 doubled px a frame by the generator's count, against 1.41 as built by the same count.
   - A lone r tip is an island; the drip joins it to its body.
   - At 1x, the hem reads as blood dripping off tattered cloth, which is better than what I specified.
2. **No R in the idle or walk: accepted.**
   - Fix 3 removed the row-38 dashes, and those were his only R. Keeping both "the R hem" and "no dashes" wasn't possible.
   - One crimson value on the body (the bright r) reads cleaner against the black. R still burns in the book's fire on the cast.
3. **The rim stops at row 35: accepted.** A one-row gap (row 36) separates it from the first drip (x 15, rows 37–38), so the first point reads as a tatter, not as the rim running on.
4. **Four doubled-ink spots left (assassin (30,21) and (28,25); ranger (31,24) and (27,37)): accepted.**
   - Filling them would swap a 2-px notch for a lone outline pixel on most frames, or make the assassin's guard pulse in width.
   - Neither notch is visible at 1x, and they were optional polish.
5. **The assassin's scarf is cut short rather than squeezed: accepted, with a note.**
   - Squeezing all eight segments made a 4-px P / p stripe and raised islandShare, and the cut keeps the wave intact.
   - But the result reads as a short flag. The better answer is in his road to 9: a long, thin ribbon instead of a long, wide band.
6. **More necromancer changes than the three fixes: accepted.**
   - These are the collar, the simpler pauldrons, the brow row, one-tone cuffs, the staff skull row, the boots' lit edge and the walk lean.
   - Each is named with its measure, together they take his column stripes from 10 to 0, and the walk lean gives his walk real body motion.
   - The collar reads at 1x as a bone mantle.

## Knight: Sir Aldric, 8.5, SHIP (v4: 8.5)

**Improved:** the cape now billows 3 px at the top of the breath (trailing edge x 11, 10, 10, 8, 8, 9, 10, 11 over f0–7). Nothing else changed.

**Regressed:** idle drift 0.44 → 0.57 px (bar 1). It isn't visible.

**What stops it shipping:** nothing. Fourth round as SHIP.

## Archer: Lyra, the ranger, 8.5, SHIP (v4: 8.5)

**Improved:**
- The cloak and leather are destriped down the columns: stripes 7.7 → 1.5 px a frame, the lowest they've been.
- Doubled ink 4.5 → 3.5 a frame, and islandShare 0.1078 → 0.1064.
- A white glint climbs the bow's top limb through the idle and walk.
- The smallest idle transition rose from 38 to 41 px.

**Regressed:** nothing measured.

**What stops it shipping:** nothing.

## Mage: Eldrin, the sorcerer, 8.5, SHIP (v4: 8.5)

**Improved:**
- **The flame stays with him.** It's in all eight walk frames, in the idle's colours and flicker, with its tongue trailing a pixel on the passing frames.
- **Craft:**
  - doubled ink 5.4 → 3.3 a frame (the brim corners (18,12) and (28,12) are the last spots)
  - islandShare 0.0977 → 0.0927 (the team's lowest)
  - the claw's lone pixels gone.
- **Night at its worst frame** rose from 50.8% to 52.1%.

**Regressed:** his second step now differs from his first by 52–177 px (v4: 51–190), because the walk flame repeats every 4 frames. Still clearly a different step.

**What stops it shipping:** nothing. The walk flame is small (question 2); it's his first item toward 9.

## Rogue: Kael, the assassin, 8.5, SHIP (v4: 8.5)

**Improved:**
- **The hood peaks at row 7 on every frame.** The breath squashes its top rows instead of lifting it, so the outline stays on row 6.
- **The walk box is 33–37 px** (v4: 39–44). He no longer stands out as a horizontal bar in the walking lineup, so team rises from 8 to 9.
- **A glint** catches the raised dagger twice per breath.
- **Walk drift** fell from 1.14 to 0.99.

**Regressed:**
- The scarf reads as a short flag (above).
- The second step differs from the first by 66 px at the least (v4: 98).
- The round-1 walk upper change dipped 0.4 points.

**What stops it shipping:** nothing.

## Necromancer: Morvath, 8.5, SHIP (v4: 8.0 ALMOST)

**Improved:**
- **A black robe** (C* 5.8 at hue about 310°). At 1x in the game it reads black, and the crimson rim and the hem's drips read as blood on it. Palette rises from 7 to 8.
- **His face leads.**
  - The panel is now T, Z, Q Q Q, ending at row 36, with mean luma 136 against the skull's 157.
  - At 1x his skull and crown are the lightest things on him again.
  - The panel is still the lightest patch below the collar, but it now reads as grey bone plate, not an apron.
- **Tatters that read:**
  - V points every 5 px, each with a 3-px body and an r drip into a 1-px r tip
  - night at 42.2% or more on every idle and walk frame (v4's worst: 39.8%).
- **A bone collar** joins his pauldrons, and his column stripes went from 10 to 0.
- **The walk has a body:** a 1-px forward lean on each step's up frame takes walk upper change from 32.7% to 42.2%.
- **Team rises from 8 to 9.** With the robe out of the red family, all five heroes now have unrelated dominant hues (scarlet, green, blue, violet, black).

**Regressed:**
- Bright 32 → 30% (bar 20).
- About 10 more lone ink pixels a frame at the tatter tips.
- Doubled ink 1.2 → 1.3.
- The deepest robe tone is a near-duplicate of the ink (above).

**What stops it shipping:** nothing. First round as SHIP.

## From 8.5 toward 9

All five sit at 8.5, and most of their 8s are in the same four criteria: animation, craft, palette and appeal. The anchors put 9 between a strong indie and Hyper Light Drifter, Shovel Knight or Blasphemous.

Here is what would move each, against the owner's four words.
- **"Perfectly aligned"** is already there: alignment is 10, or 9 by convention for the robed heroes. Feet are locked on row 39 in every frame, and drift is under 1 px in every idle.
- **"Addictive" and "badass"** are mostly animation and appeal.
- **"Aesthetically pleasing"** is craft and palette.

**For the whole team (each of these is an 8 everywhere):**
- **Animation:**
  - The idles move 15–19% of the upper body. The game's pack knight moves 38%.
  - For 9, add overlapping action, with each part a frame behind the last: breath, then shoulders, then head, then the cape, hood, beard or scarf.
  - Check: idle upper change of 25% or more on the round-1 script, with no transition under 20 px.
- **Craft:**
  - islandShare is 0.093–0.117: many single-pixel highlights and shadows.
  - For 9, merge them into 2-px clusters by hand, where they aren't a glint or an eye. Target 0.09 or less for every hero.
- **Palette:**
  - The ramps are the master palette's, and they are value-correct but hue-flat.
  - For 9, shift each material's shadows toward violet and its highlights toward warm, so the team shares one light.
- **Appeal in the game:**
  - Only the ranger's attack plays in the forest today (`ranger-animation.js` serves the archer alone). The other four play theirs only on cave and crypt strikes (`strikeClip` in `game.js`, whose hit frame is attack frame 3, f19).
  - So in the forest, the other four's best frames are never seen: the knight's crescent, the sorcerer's frost star, the assassin's crossing slash and the necromancer's soul-fire blast.
  - Playing a strike when each weapon fires is the biggest single step toward "addictive" and "badass", and it's game code, not art.

**Per hero:**
- **Knight (8.57):**
  1. **Animation:** let the shield and the levelled blade rise 1 px with the breath (f3–5), a frame after the chest, with the plume's tip a frame after that.
  2. **Craft:** his islandShare (0.117) is the team's highest, mostly single N and g pixels on the steel. Cluster them.
  3. **Palette:** move the steel's shadows toward violet and put a warm highlight on the helm's crown.
- **Ranger (8.43):**
  1. **Silhouette:** her tallest shapes are the hood's spike at (22,8) and the quiver's red-and-white fletching (x 9–18, rows 8–12), which reads as a flag at 1x. Make the bow the tallest thing (its top limb near row 10), and the fletching two feathers.
  2. **Appeal:** her face is one eye at (28–29,17) under the hood. Add a brow line and a cheek highlight so she reads as determined at 1x.
  3. **Animation:** walk upper change is 37.5% (Lyra: 45%). Let the cloak's tail lag the stride by a frame.
  4. **Craft:** her 3.5 doubled ink a frame is still the team's highest.
- **Sorcerer (8.43):**
  1. **Appeal and animation:** make the walk as threatening as the idle. Lift the flame to chest height (palm about (18–19,24)), 4x4, with a 1-px ember trail on f10 and f14.
  2. **Palette:** let the walk's flame light him, with a warm y / o rim on the sleeve and the beard within 3 px of it, as the idle's flame does.
  3. **Craft:** clear the brim corners (18,12) and (28,12).
- **Assassin (8.43):**
  1. **Silhouette and appeal:** bring back the speed without the bar. Keep the scarf's band short, and let a 1–2 px ribbon taper back from it to about x 4, with the flame at its tip.
  2. **Appeal:** the magenta mask (rows 17–19) is the loudest colour on his face. Darken it to p with a 1-px I top edge, so the white slits lead.
  3. **Animation:** a running crouch, with the head 1 px lower and forward on the contacts (f8, f12).
  4. **Craft:** his islandShare (0.116) is near the bar; most of it is the hood's 45° slopes.
- **Necromancer (8.29):**
  1. **Silhouette:** a vertical staff beside a vertical robe. Flare the robe's back hem (x 10–12) so his base is a triangle, or lean the idle staff's top 2 px out.
  2. **Appeal:** the grimoire reads as a pink block at 1x (the i glyphs on cream pages, x 30–37, rows 20–26). Make the glyphs acid green (l) to match the runes, and keep the blood flame for the cast.
  3. **Craft and palette:** move '4' to #201c24, clear of the ink. Give the tatter tips' outlines a neighbour so they stop counting as lone pixels.
  4. **Animation:** his idle moves 16.9% of his upper body. Let the hem sway on the breath, and let the staff's eyes flare a frame after the runes.

## Ready for the game?

**Yes. The team is ready to go into the game, and another full round isn't worth it now.**
- **Every hero meets every bar,** in the numbers and at 1x in the game.
  - The five read as one cast: one scale, one outline, one light.
  - Each has its own colour and a class you can read from the silhouette.
- **What's left is the 8-to-9 margin:** richer idles, cleaner clusters, hue-shifted ramps and signature details.
  - Those are best judged in play, and another full round on boards and stills would mostly polish numbers.
- **The biggest lever toward "addictive" and "badass" is in the game, not the sprites:** let the attacks play.

**When they go in, check these in the real game:**
1. **`selfBob: true`:** the engine mustn't add its own idle hop.
2. **The glow rows:** the flame, the frost orb and eyes, and the runes and soul fire should draw unlit at night, as they do in the lab.
3. **The 48x48 frame with anchorY 40:** check it against the hero's shadow, hit box and health bar.
4. **The menus:** the hero select and other menus use separate pose sprites, which should match the new heroes.
5. **The ranger's shoot-while-walking frames,** which are already wired.

**After a playtest,** a short, targeted round toward 9 is worth it. Use the lists above, judged from 1x playback in the game rather than from stills.

## Calibrating the generator

**Where it delivered:**
- **Every fix and every bar**, with numbers that reproduce exactly: one denominator per measure, f0 and the worst frame for each, and a list of what got worse.
- **A control render** that answered the hue question by eye, not only by number.
- **Departures argued with measurements**, each of them better than the letter of the brief (the tatter bodies, the rim's gap).
- **Restraint on the shipped four:** the knight changed on three frames, and the assassin's attack is pixel-identical.

**Where it fell short:**
- **It met the letter, not the spirit, twice:**
  - The walk flame satisfies "props carry through the walk" as a 3x3 spark.
  - The cut scarf satisfies "the walk box stays ≤ 38 px" as a stub.
  - In both cases the measurable option won over the visual one.
- **It reconstructed measures that exist.** Its proxy for upper change hid a 0.4-point dip that the round-1 script shows.
- **It missed a baseline test:** the near-duplicate deep tone (my value, but its check).

**What to tell it next time (for a round toward 9):**
1. When a fix meets the bar but reads small at 1x, push the visual, and report the number second.
2. Judge animation from 1x playback in the game (bursts or GIFs), not from single frames.
3. Run the baseline's own checks too: near-duplicates, strays, islandShare, outline.
4. Where the review's scripts exist, use them as written.
