# Review: remaster-v4

This round uses the same rubric, anchors, strictness and measures as `../BASELINE.md` and the reviews of rounds 1–3, so the scores compare across rounds.

A new reviewer took over again. To keep the numbers comparable, I re-ran the earlier reviewers' scratch scripts unchanged on both `remaster-v3` and `remaster-v4`. On v3 they reproduce every round-3 figure:
- walk upper change 45 / 40 / 41 / 60 / 38%
- doubled ink 3.1 / 6.6 / 4.0 / 1.0 / 4.4 px per frame
- night-grass 58 / 56 / 55 / 43 / 43%, and 58 / 48 / 51 / 31 / 38% counting only colours 5+ luma clear.

**Evidence:**
- `review.mjs` on the five `remaster-v4` sprites and `--team=remaster-v4`, and again on `remaster-v3`.
- `shot.mjs` on all five at `--zoom=closer` and at the default zoom, and on v3 at the default zoom. No errors in any shot.
- In-game shots at the forest's mid-run night: I set the ambient to `[102, 110, 164]` by patching `Forest.prototype.ambient` in the headless page (no file changed). I took these for the knight and for both rounds of the two dark heroes.
- Native-size and 2x–3x crops of every in-game shot, v3 beside v4.
- Gridded zooms, palette-key dumps, the boards' onion skins, v3 → v4 pixel diffs per frame, and clean 1x / 2x / 3x renders on the forest grass by day and under the boards' night multiply.
- **For the necromancer's robe:**
  - the CIELAB lightness (L*) and chroma (C*) of every robe tone
  - the robe's colour as the game actually draws it
  - a control render with the three robe tones swapped for near-neutral blacks of the same lightness
  - a preview of fixes 1–2 below, applied to the built frames.
- A check that each committed sheet matches a fresh in-memory build of its source: 0 px differ, in all five.

Coordinates are (x, y) in the 48x48 frame. The feet row is 39 and the sole row 38. Letters are `palette.js` keys; other colours are written as hex. The necromancer's own keys '1', '3' and '4' are #4f2a36, #3a1e29 and #2a161e.

## Scores

| Hero | 1 Align | 2 Silhouette | 3 Team | 4 Anim | 5 Craft | 6 Palette | 7 Appeal | Overall | Verdict | v3 |
|---|---|---|---|---|---|---|---|---|---|---|
| **knight** | 10 | 9 | 9 | 8 | 8 | 8 | 8 | **8.5** (8.57) | **SHIP** | 8.5 SHIP (10 9 9 8 8 8 8) |
| **archer**, ranger | 10 | 8 | 9 | 8 | 8 | 8 | 8 | **8.5** (8.43) | **SHIP** | 8.5 ALMOST (10 8 9 8 8 8 7) |
| **mage**, sorcerer | 9 | 9 | 9 | 8 | 8 | 8 | 8 | **8.5** (8.43) | **SHIP** | 8.5 ALMOST (9 9 9 8 8 8 7) |
| **rogue**, assassin | 10 | 8 | 8 | 8 | 8 | 8 | 8 | **8.5** (8.29) | **SHIP** | 8.0 ALMOST (10 8 8 8 8 8 7) |
| **necromancer** | 9 | 8 | 8 | 8 | 8 | 7 | 8 | **8.0** (8.00) | ALMOST | 7.5 ALMOST (9 8 7 7 8 7 7) |

The wraith (`rogue/remaster-v2-wraith`) wasn't carried forward, so its round-2 score (6.5, NOT YET) stands.

**Summary:**
- **Four heroes ship:** the knight for the third round, and the ranger, the sorcerer and the assassin for the first time.
  - Round 3 held all three on appeal alone.
  - This round each fix was bold enough to read at 1x in the game: the ranger's open cloak, the sorcerer's flame and forward staff, and the assassin's peaked hood.
- **The necromancer is one criterion short: palette.**
  - His robe meets every number (crimson is 9.3% of the cloth; the bar is 12%), but it reads dark maroon, not black. So his blood-red trim doesn't pop.
  - His cast and his walk are fixed (animation 7 → 8), and he's no longer a second red hero (team 7 → 8).
  - One round, if the robe goes black and his bone panel steps back.
- **The sorcerer ships with one flaw to fix first.** His flame is in the idle only. All eight walk frames are round 3's, with a tome where the flame should be.

**Scoring conventions** are round 3's: alignment 10 only where a visible gait was verified frame by frame, and 9 for robed heroes. I re-verified the gait this round:
- contacts at x 18–20 and 27–29 on both f8 and f12, for the ranger and the assassin (the knight's are 1 px right)
- the planted sole travelling back 28 → 27 → 24 → 22 → 19 (centre x, f8–12).

## The numbers, checked

**The generator's report holds up, with four exceptions** (below). Every figure in its table matches `measure.mjs` and my runs:

| | knight | archer | mage | rogue | necromancer |
|---|---|---|---|---|---|
| night, and night at 5+ luma | 58% | 54% | 52% | 43% | 42% |
| bright (> luma 150) / dark (< luma 50) | 36 / 29% | 27 / 37% | 24 / 29% | 27 / 51% | 32 / 49% |
| upper change, idle / walk | 0.22 / 0.60 | 0.21 / 0.47 | 0.22 / 0.59 | 0.21 / 0.56 | 0.29 / 0.49 |
| smallest idle transition | 40 px | 38 px | 35 px | 43 px | 62 px |
| second step vs first (f12–15 vs f8–11), px | 309 265 72 230 | 199 211 58 209 | 190 139 51 156 | 299 266 98 260 | 318 218 146 292 |
| islandShare | 0.117 | 0.108 | 0.098 | 0.116 | 0.114 |
| drift, idle / walk | 0.44 / 1.24 | 0.38 / 0.80 | 0.13 / 1.60 | 0.60 / 1.14 | 0.67 / 1.39 |
| colours | 14 | 17 | 23 | 13 | 14 |
| idle width | 32–34 px | 32–33 px | 36–37 px | 32–35 px | 27–29 px |

All five also have:
- feet on row 39 in every idle and walk frame (all 70 of the ranger's frames stay on or above it)
- inkWall 0, no strays, no frames in pieces, and nothing on the canvas border
- eye lines on rows 15–17.

**Where my numbers differ:**
1. **"The necromancer's robe is black."** It's dark wine:
   - The pixel-weighted chroma of its three tones is C* 14.5, at hues 354–359°.
   - It reads maroon by day. See the first question below.
2. **"In the robe crimson is 9.3% on f0 … (v3: 35% by the same count)."** It isn't the same count:
   - The 9.3% is crimson as a share of the robe's cloth. By that count v3 was 52.6% on f0 (46.6–54.3% across its 22 frames).
   - The 35% is crimson as a share of all non-ink pixels in rows 20–38, the book left out (v3: 33.3% on f0, about 34–36% on other frames). By that count v4 is 5.4%.
   - Mixing the two makes the drop look smaller than it is.
3. **"The assassin's peak is on row 7, its outline on 6."** That's true on f0–2 and f6–7. The breath lifts it on f3–5: its colour reaches row 6 and its outline row 5.
4. **"Every hero clears its bar."** On idle f0, yes. Over every idle and walk frame, the necromancer runs 39.8–43.3%, so walk f8 is 0.2 under his 40% bar.

Two smaller notes:
- The ranger's notches (10.1 → 7.3 per frame) are counted over the 22 base frames. Over all 70 frames it's 12.3 → 9.5.
- The generator's plume and cape columns count the outline. Mine count the first coloured pixel, 1 px to the right. The patterns agree.

The previous reviewers' measures, re-run unchanged:

| | walk upper change, v3 → v4 | idle upper change, v3 → v4 | smallest idle transition, px | doubled ink, px per frame | night-grass clear (counting only colours 5+ luma clear) | px > luma 150 | px < luma 50 | 1-px stripes, px per frame |
|---|---|---|---|---|---|---|---|---|
| knight | 45% → 45% (game knight 58%) | 16% → 16% (game knight 38%) | 38 → 40 | 3.1 → 1.1 | 58% → 58% (58 → 58) | 36% → 36% | 29% → 29% | 13.3 → 6.0 |
| archer | 40% → 37% (Lyra 45%) | 18% → 18% (Lyra 13%) | 30 → 38 | 6.6 → 4.5 | 56% → 54% (48 → 54) | 26% → 27% | 40% → 37% | 6.6 → 7.7 |
| mage | 41% → 42% | 13% → 15% | 34 → 35 | 4.0 → 5.4 | 55% → 52% (51 → 52) | 23% → 24% | 30% → 29% | 4.3 → 6.3 |
| rogue, assassin | 60% → 50% | 22% → 19% | 39 → 43 | 1.0 → 2.9 | 43% → 43% (31 → 43) | 21% → 27% | 57% → 51% | 13.9 → 5.0 |
| necromancer | 38% → 33% | 20% → 17% | 46 → 62 | 4.4 → 1.2 | 43% → 42% (38 → 42) | 27% → 32% | 43% → 49% | 14.0 → 10.0 |

- **The night score now means what it says.** For all five, the score is the same counting only colours 5+ luma clear: no colour that carries a score sits within 5 luma above the line.
  - Round 3's three shortfalls were fixed with light masses, not lifted mid-tones: ranger 48 → 54%, assassin 31 → 43%, necromancer 38 → 42%.
- **Stripes:** the knight's cape and the assassin's body lost theirs.
  - What's left is mostly design: the knight's visor grille, the crown's spikes, the assassin's eye slits, the sorcerer's brow shadow.
  - The exception is the ranger (see her section).
- **Doubled ink** fell on the knight and the necromancer. It rose on the sorcerer, with new spots at (35,20), (30,24) and (15,25) on f0, and on the assassin.
- **Walk motion fell on three heroes:** the ranger, the assassin and the necromancer. All still clear the 0.45 bar in `measure.mjs`.

## Three questions from the producer

**1. Does the necromancer's robe read as black with crimson accents? No. It reads dark maroon.**
- **All three robe tones are wine-tinted:**
  - '1' is L* 22, C* 19, hue 359°
  - '3' is L* 15, C* 16
  - '4' is L* 10, C* 12.

  Weighted by pixels, the robe's chroma is 14.5. A black reads at about 8 or less.
- **The game draws it lighter and just as red.** The lit plane comes out as about #54313d (L* 25, C* 18, hue 357°). The dirt beside it is L* 35, C* 15, hue 71°.
- **A control render settles it.**
  - With the three tones swapped for near-neutral blacks of the same lightness, the robe reads black from 1x to 4x, and the r rim and R hem pop.
  - As built, the rim and the hem share the robe's hue, so they read as a brighter edge of a red robe.
- **Round 3's own ask would only have been half-way there:** m with h folds comes to chroma 10.2.
- **So bar 3 is met in the numbers but missed in the read.** That's why his palette stays at 7.

**2. Does the ranger's 36% green (against a target of about 30%) matter to the eye? No.**
- **The numbers:** green fell from 39.6% to 35.7% of her coloured pixels (37.9% in the walk). Her largest single colour is now the leather B #b86f50 (19.6%).
- **The 30% was a proxy for "open the tent", and the tent is open.**
  - At the default zoom her torso, linen shirt, bracers and bow arm read in front of the green.
  - The green that's left is a hood and a cloak hanging behind her, and it reads as that.
- **Where the green went:** most of what's left is in the hood. Its point now rises to (22,8), so the green spike is her tallest shape. It reads as a hunter's hood, not a tent.

**3. Do the dark heroes hold up at night, at 43% and 42%? Yes in play; the necromancer is thin on the board.**
- **In the game,** at the mid-run night ambient, both are drawn in their own warm and white light, and both read fully:
  - the assassin by his lilac rim, white eyes and blades
  - the necromancer by his skull, bone, rim and glowing green runes.
- **On the boards' night multiply** (no hero light, no glow):
  - The assassin still reads by his rim, eyes, mask and blades.
  - The necromancer's robe all but vanishes, leaving a skull, the bone pieces, a staff and a faint left rim.
- **The margins:**
  - The assassin holds 42.0–44.4% on every idle and walk frame.
  - The necromancer runs 39.8–43.3%: walk f8 is under 40%.
- **I accept both under bar 4 as written,** since it's measured on idle f0. The round-5 bar checks every frame.

## What improved, and what regressed, since round 3

**Improved:**
- **Every walk has two different steps.**
  - The necromancer's second step differs from his first by 146–318 px a frame (v3: 0).
  - Both robed heroes mirror the hem: the front corner kicks over a toe on f8–9, and the back corner over a heel on f12–13.
- **Every weapon is in view on the hit** (see the table below).
- **The bold appeal fixes landed:**
  - The ranger's cloak hangs behind her, and her torso shows.
  - The sorcerer holds a 5x5 flame at head height and plants a staff leaning 14° forward.
  - The assassin has a peaked hood and a falling scarf.
  - The necromancer's robe is dark, and it isn't the knight's red.
- **The knight's polish landed:**
  - the plume waves
  - the f17 streaks have no ink
  - the cape's @ / R stripes are gone (85 px over idle and walk in v3, 0 now).
- **The night score is met without gaming** (above).

**Regressed or still weak:**
- **The sorcerer's flame is idle-only.** His walk is round 3's, with a tome at the waist.
- **The necromancer's robe reads maroon,** and his bone panel now outshines his face (see his section).
- **Walk motion fell:** ranger 40 → 37%, assassin 60 → 50%, and necromancer 38 → 33% (the team's lowest).
- **The ranger's stripes moved instead of going:** 6.6 → 7.7 px a frame.
- **Small craft slips:**
  - doubled ink up on the sorcerer (4.0 → 5.4) and the assassin (1.0 → 2.9)
  - islandShare up on the assassin (0.109 → 0.116) and the necromancer (0.101 → 0.114).

## Brief compliance (round 4)

| Item | Result | Evidence |
|---|---|---|
| Two different steps; robed heroes mirror the hem kick and the toe | Met | f12–15 differ from f8–11 by 51–318 px for every hero. Necromancer and sorcerer: toe on f8–9, heel on f12–13. The necromancer's staff is planted once a stride (foot x 17 → 15 → 13 → 12 on f8–11) and swung forward on f12–15. |
| Weapon in view on the impact frame | Met | Knight f19: blade and crescent. Ranger f20: bow forward. Sorcerer f19: staff and frost star. Assassin f19: both blades and the crossing trails. Necromancer f19: staff in front, its skull at x 35–39, rows 12–17, the blast at x 40–45, the crown whole. |
| No shared dominant cloth; the necromancer's crimson ≤ 12% of the robe | Met in the numbers, missed in the read | Crimson is 9.3% of the cloth on f0, and 8.1–11.4% across all 22 frames. By round 3's count it's 6% of rows 20–38. None of his robe colours is another hero's, but the robe reads dark maroon (above). |
| Night-grass bar, also reported at 5+ | Met on f0 | 58 / 54 / 52% (bar 50%) and 43 / 42% (bar 40%, with 27% / 32% bright and a lit top-left rim). Necromancer walk f8: 39.8%. |
| Everything else: scale, eye line, gait, ink walls, colours, islandShare, idle transitions ≥ 20 px | Met | Feet on row 39 everywhere. The same contacts on f8 and f12 for all three legged heroes. inkWall 0. 13–23 colours. islandShare ≤ 0.117. Smallest idle transition 35 px. One note: the assassin's hood outline reaches row 5 on f3–5 (its colour, row 6). |
| Knight: polish only (the wave, ink-free streaks, the last stripes and the notch) | Met | Plume tail on row 15 at x 13, 13, 12, 12, 11, 11, 12, 12, with the cape stepping on the frames between. The f17 streaks run from (12,19) to (3,16) and from (11,21) to (5,19), N → g → G, with no ink. The plume's front tip is R at (24–25,11). |
| Ranger: open the tent, make the shot read at 1x, craft | Met, but | The cloak hangs behind her, its tail to row 31 at x 12–13. Her torso and shirt show, and the hood point is at (22,8). The release fist is s / S at (18–19, 19–20). The arrow is nocked in all 8 walk frames (its head at x 37–40). Notches 10.1 → 7.3. The stripes weren't fixed: they turned vertical. |
| Sorcerer: the flame as a weapon, a stern face, the staff forward | Met | The flame is at x 10–14, rows 11–15, emissive. Brows run (21–22,15) → (23,16) and (27–28,15) → (26,16), with K at (24–25,16) and c eyes at (23,17) and (26,17). The staff's foot is at (32,38), its orb at about (40,6), 14° forward. The flame stays through the wind-up (f16–17). |
| Assassin: a peaked hood, a trailing scarf, the attack reworked | Met | The peak is at (26,7), hooking to (30,11), with the back edge at x 18 on rows 13–17. The scarf tails fall in the idle; the idle box is 32–35 px (v3: 37–38). On f10 and f14 the passing toe is 2 px ahead, with a lit top (row 34, x 24–28). |
| Necromancer: a blood-black robe, the staff in sight, two different steps | Two of three | The staff and the steps: met. The robe: dark, but maroon. |

## Departures the generator chose

1. **The necromancer's runes are acid green, not crimson: accepted.**
   - The game's own colour for Morvath is #9ee562 (`heroes.js`), the colour of his hero card, his minions' eyes and his "raise" weapon. Green runes tie his panel to all of that.
   - Taking the runes out of the crimson count let the rim stay a full line and still come in at 8–11%.
   - The cost: green glyphs on pale bone read like stains at 1x. That's more the panel's fault than the runes' (fix 2).
2. **His blow fires from the staff, and the book flares in the wind-up: accepted.**
   - The blow has one focus, the skull and its green blast at x 40–45, and the crown keeps its shape.
   - The wind-up reads as the spell being read off the pages (f16–17); the blow then strikes (f19).
   - Round 3 offered "slam it down as the book bursts" as one option, not a rule.
   - Two magic colours in one cast is fine here: red means blood, and green means necromancy.
3. **The ranger's hood point is at (22,8), not (21,8): accepted.** Her head leans 2 px forward, and the point follows it.
4. **The assassin's eyes are two 3-px slits: accepted.** The "\ /" scowl survives, because the inner ends drop a row at (26,16) and (28,16), and four lone pixels are gone.

## Knight: Sir Aldric, 8.5, SHIP (v3: 8.5)

**How far from SHIP:** it ships, for the third round running. What's below is polish.

**Improved:**
- **The plume waves.** Its tail steps once every two frames (x 13, 13, 12, 12, 11, 11, 12, 12 on row 15), and the cape steps on the frames between. Every idle transition changes 40 px or more.
- **f17's streaks** are two 1-px lines with no ink, tapering N → g → G toward x 3. At 1x they read as motion, not as two more sticks.
- **The cape's stripes are gone,** and the plume's front tip ends in R at (24–25,11), so the 2-px ink step on the crown is gone too.
- **Doubled ink is down from 3.1 to 1.1 a frame,** the team's lowest.
- **Nothing else moved:** v3 → v4 changes are 6–71 px a frame.

**Regressed:** islandShare 0.114 → 0.117, from the new plume tip. You can't see it.

**Polish (optional):**
1. **The idle is still small:** 16% upper change against the game knight's 38%. If anything moves next, make it the cape: a 3-px billow at the top of the breath (f3–5), where its trailing edge now travels 2 (x 11 → 9 on row 33).
2. **The visor grille's N / g alternation** (row 18, x 26–29) is his only stripe left. Keep it if it's meant as vents.

## Archer: Lyra, the ranger, 8.5, SHIP (v3: 8.5 ALMOST)

**How far from SHIP:** it ships. Appeal moved from 7 to 8.

**Improved:**
- **The tent is open.**
  - The cloak hangs behind her from the shoulders, with its tail to row 31 at the back, cut in 2-px tatters.
  - In front of it her torso reads at the default zoom: a leather jerkin open over a linen shirt, cream sleeves, bracers and the belt.
  - At 1x she's a lean, hooded hunter leaning into a low ready, not a cute Robin Hood.
- **The shot lands:**
  - The release's thrown hand is a 2x2 fist (s / S at (18–19, 19–20)), boxed in k and m.
  - The arrow stays nocked in all eight walk frames, its head at x 37–40. Idle, walk and draw now read as one hunter.
- **Night at 5+ is up from 48% to 54%.** Her leather shadow moved under the line, to #5e3230.
- **Craft:**
  - notches 10.1 → 7.3, doubled ink 6.6 → 4.5, islandShare 0.119 → 0.108
  - no ink between the feathers.

**Regressed or weak:**
- **The stripes moved instead of going.**
  - `destripe` works along rows only, so the cloak's L / e alternation now runs down columns (walk f8: col 18, rows 19–22, and col 12, rows 27–31).
  - It also left new B / #5e3230 alternations in the leather (f0: row 31, x 21–24): 48 px over idle and walk.
  - Stripes went from 6.6 to 7.7 px a frame.
- **Walk upper change fell from 40% to 37%** (Lyra: 45%).

**Polish (optional):**
1. **Run `destripe` down the columns as well,** on L / e and on B / #5e3230.
2. **Clear the doubled ink on f0** at (19,16), (31,24) and (27,37).

## Mage: Eldrin, the sorcerer, 8.5, SHIP (v3: 8.5 ALMOST)

**How far from SHIP:** it ships. Appeal moved from 7 to 8. Fix the walk's flame first, as polish.

**Improved:**
- **The flame is a weapon.**
  - A 5x5 emissive fire (x 10–14, rows 11–15) sits in a palm raised to head height: an f core, an o body and an O tongue, in four phases.
  - It throws a warm y rim on the sleeve and the beard's top-left.
  - At 1x it's the first thing you see.
- **A stern face:** 3-px brows angled down to the nose, the brim's K shadow between them, and glowing c eyes. At 1x it reads as a glare.
- **The staff leads:** its foot is at (32,38) and its orb at about (40,6), 14° forward.
- **The cast keeps the flame** through the wind-up (f16–17), then hands it to the frost star's ember core.
- **In the stand and fight shots he commands.** He's no longer a friendly wizard holding up a spark.

**Regressed or weak:**
- **The flame comes and goes.**
  - All eight walk frames hold a tome at the waist (B / #5e3230 at about x 20–24, rows 31–33, held at (21–22, 30) on f8).
  - So the fire pops out when he moves and back when he stops.
  - The walk is what a player sees most, and it's round 3's walk with cyan eyes. The ranger's arrow had the same flaw last round.
- **Doubled ink rose from 4.0 to 5.4 a frame:** new spots at (35,20), (30,24) and (15,25) on f0.
- **He's now the widest hero standing,** at 36–37 px. That's the price of the pose, and I accept it.

**Polish (do the first one before anything else):**
1. **Carry the flame into the walk.**
   - Drop the tome.
   - Hold a 3x4 flame (the idle's f / o / O, emissive) in the free hand where the tome is now: the palm at about (21–22, 30) on f8, the flame at about x 20–23, rows 26–29, left of the beard.
   - Run it on the idle's 4-phase flicker, and let it trail 1 px on f10 and f14.
2. **Clear the new doubled ink** at (35,20), (30,24) and (15,25).

## Rogue: Kael, the assassin, 8.5, SHIP (v3: 8.0 ALMOST)

**How far from SHIP:** it ships. Appeal moved from 7 to 8.

**Improved:**
- **A peaked hood.**
  - The peak is at (26,7), and the hood hooks forward over the eyes to (30,11).
  - Its back edge is pulled in to x 18 on rows 13–17, and the #d9a6ff rim runs up the back slope 2 px a row.
  - At 1x the bean is gone: he's a hooded assassin.
- **The scarf falls.**
  - In the idle, two tails drop behind him and burn out in a small lilac flicker.
  - His idle box is 32–35 px (v3: 37–38).
  - The scarf also rises over his nose as a magenta mask.
- **The eyes are two 3-px slits,** with the inner ends a row lower: "\ /".
- **The attack fits the new body:**
  - The blades cross in front of the chest on f16–17.
  - f18's trail ends at the knee.
  - Both blades and the crossing trails are in view on f19.
  - On f10 and f14 the passing toe is 2 px ahead of the stance shin, with a lit top (row 34, x 24–28), so both legs read.
- **Night at 5+ is up from 31% to 43%,** with 27% bright, while 51% of him is still darker than luma 50. He's a shadow that reads.

**Regressed or weak:**
- **The walk is still a horizontal bar.** The scarf streams back to x 2–3, so on the move he's 39–44 px wide. Round 3 allowed this, but it's the team's widest walk by 10 px.
- **The hood's outline reaches row 5 on f3–5,** because the breath lifts the peak to row 6.
- **The magenta mask is the loudest colour on his face.** It reads as a ninja's mask. I'd keep it, because it carries his night score.
- **Small slips:** doubled ink 1.0 → 2.9, islandShare 0.109 → 0.116, and walk motion 60 → 50% (still the team's highest by that measure; `measure.mjs` puts him third, at 0.56).

**Polish (optional):**
1. **Hold the peak at row 7 through the breath (f3–5),** so the outline stays on row 6.
2. **End the walk's scarf stream at about x 8,** so the walk box stays at 38 px or less.
3. **Clear the doubled ink** at (30,21) and (28,25) on f0.

## Necromancer: Morvath, 8.0, ALMOST (v3: 7.5)

**How far from SHIP:** one criterion, palette (7). One round, if the robe goes black and the panel steps back.

**Improved:**
- **Not the knight's red any more.**
  - The robe's mass is in his own dark tones. Crimson appears only as a rim, the hem and the book's fire: 9.3% of the cloth on f0 (v3: 52.6% by the same count).
  - In the lineup he's no longer a second red hero, so team rises from 7 to 8.
- **The cast acts, and stays readable:**
  - He leans back, and the pages burst into blood flame (f16–17).
  - The staff whips over the crown as a bone-white smear (f18).
  - He drives it forward in front of him, with acid-green fire blasting from its skull (f19).
  - Wisps follow (f20).

  The crown keeps its shape throughout, so animation rises from 7 to 8.
- **Two different steps:**
  - The staff is planted once a stride and drifts back 2 px a frame as he passes it (x 17 → 15 → 13 → 12 on f8–11), then swings forward over f12–15.
  - The hem kicks forward over a toe, then back over a heel.
  - The head and the book lag a frame.
- **Night at 5+ is up from 38% to 42%, and bright from 27% to 32%,** carried by the bone and the rim.
- **Craft:** doubled ink fell from 4.4 to 1.2, and the cheek's z / Z stripe is now one z line (x 20, rows 12–16).

**Regressed or weak:**
- **The robe reads dark maroon** (the first question above). Its mean chroma is 14.5, at hues 354–359°. The crimson trim shares that hue, so it reads as a bright edge of a red robe, not as blood on black.
- **The bone panel outshines his face.**
  - On f0 the panel (x 23–32, rows 28–38) has 58 bone pixels at a mean luma of 172. The skull (x 16–29, rows 12–19) has 52 at 155.
  - It sits on the side that should be in shadow.
  - With the green runes on it, at 1x it reads as a pale apron with stains.
- **The hem is a dashed line.** Row 38 runs R R k k (a notch every 4 px). At 1x that's a dotted red trim, not tatters.
- **He's thin at night.** His robe vanishes on the boards' night view, and walk f8 is 39.8%.
- **He has the quietest walk on the team:** upper change fell from 38% to 33%.
- **islandShare rose from 0.101 to 0.114,** mostly from the 1-px rim and the bone pixels.

**Top 3 fixes for round 5:**
1. **A robe that reads black (palette, the gate).**
   - Swap his three tones, keeping their lightness:
     - '1' #4f2a36 → #38333c
     - '3' #3a1e29 → #28242c
     - '4' #2a161e → #1e1b22.

     That keeps L* at 22 / 15 / 10 and takes C* from 19 / 16 / 12 to 6.5 / 6.0 / 5.4 (the robe's mean, 14.5 → 5.8). None of them is another hero's colour.
   - Keep the r rim, the R hem and the book's fire as they are.
   - On the built frames, the swap leaves night and bright unchanged (42.3% and 32.0% on f0), because all three tones sit under the night line either way.
   - In my preview the robe reads black with blood-red trim at 1x–3x.
2. **Let the skull lead (appeal and palette).**
   - Step the panel (x 23–32, rows 28–38) down one value: z → Z and Z → Q. Keep its T lit edge and the green runes.
   - Its mean luma falls from 172 to about 133, under the skull's 155.
   - Bright falls from 32.0% to 28.2% (26.7% at worst), still over the 20% the dark-hero bar needs.
   - Night-clear doesn't change, because Q sits 16 luma over the line.
3. **Hem tatters that read as tatters, and every frame over the night bar.**
   - Cut the hem into V points 2 rows tall: full on row 36, 2 px wide on row 37, and 1-px tips on row 38. Today's row-38 dashes go.
   - Draw the tips in r, not R. That adds 5–8 clear pixels a frame and lifts walk f8 from 39.8% to about 41%, so every idle and walk frame clears 40%.

## Bars for round 5 (changes from round 4 only)

1. **Hue is judged by eye and by CIELAB, not by palette-key counts.**
   - The necromancer's robe tones: a pixel-weighted mean chroma (C*) of 8 or less (now 14.5), with lightness within ±2 of today's.
   - Any claim about how a colour reads ("black", "warm", "maroon") comes with a control render.
2. **The face leads.** The necromancer's panel bone (rows 28–38) has a lower mean luma than his skull (rows 12–19). Now it's 172 against 155.
3. **Night on every frame.**
   - Each idle and walk frame clears its bar, counting only colours 5+ luma clear: 50%, or 40% for the dark heroes (with 20% bright and a lit top-left rim).
   - Report the worst frame, not only f0.
   - Today everyone passes except the necromancer's walk f8 (39.8%).
4. **Props carry through the walk.** A weapon, prop or spell drawn in idle f0 is drawn in all eight walk frames. Today the sorcerer's flame fails this.
5. **The four shipped heroes get polish only, and no measured regression.** None of these may get worse than in round 4:
   - night at 5+, and bright
   - the smallest idle transition, and idle and walk upper change
   - doubled ink, stripes and islandShare.
6. **Stripes in both directions.** Report the stripe count down columns as well as along rows. It may not rise for any hero.
7. **Everything else stays as in round 4, and every hero meets it now:**
   - feet on row 39 in every idle and walk frame, the shared gait, and two different steps
   - the weapon in view on the impact frame
   - the head top on rows 11–13 and the eye line on rows 15–18
   - headgear colour no higher than row 6 (the sorcerer's hat tip is round 1's standing exception)
   - zero ink walls, at most 24 colours, islandShare ≤ 0.12, and no idle transition under 20 px.

## Calibrating the generator

**Where it over-delivered:**
- **It was bold this time.** Round 3's appeal fixes were done to the letter but too timidly. Round 4's were big enough to read at 1x in the game, and that's what moved three heroes to SHIP.
- **Its measurements are accurate.** Every figure in its table that I recomputed matches mine; the four exceptions above are claims and comparisons, not measurements. The night bar is met without a single colour parked just over the line.
- **It fixed what it was asked, and stopped there.** The knight got polish only (6–71 px changed a frame).

**Where it over-claimed:**
- **"The necromancer's robe is black."** It's dark wine. The generator chose its own tones with more chroma than round 3's m / h, and judged them by name rather than by eye.
- **"v3: 35% by the same count."** It wasn't the same count. By the count behind v4's 9.3%, v3 was 52.6%.
- **Figures from f0 only.** "The peak on row 7, its outline on 6" and "night 42%" hold on f0, but not on every frame (f3–5, and walk f8).
- **"The cloak: 2-px bands."** That holds along the rows; the stripes moved into the columns.

**What it missed:**
- **The states other than the one being fixed.** The sorcerer's flame was fixed in the idle and the cast, but not in the walk.
- **Value composition.** Darkening the necromancer's robe made his bone panel the brightest mass on him.

**What to tell it next time:**
1. Check each fix in all three states a player sees (stand, walk, fight), at the default zoom, before calling it done.
2. For any claim about a colour, show the 1x in-game crop and a control render, and give its CIELAB C*. A key's name isn't how it reads.
3. For every measure, report the worst idle and walk frame as well as f0, and use one denominator per measure.
4. For the four shipped heroes, polish only. For each change, say which measure it moves, and show that it didn't make another one worse.
