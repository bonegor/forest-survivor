# Review: remaster-v3

This round uses the same rubric, anchors, strictness and measures as `../BASELINE.md`, `../remaster-v1/REVIEW.md` and `../remaster-v2/REVIEW.md`, so the scores compare across rounds.

A new reviewer took over for this round. To keep the numbers comparable, I re-ran the previous reviewer's own measure scripts unchanged. They reproduce every round-2 figure:
- walk upper change 45 / 38 / 39 / 50 / 37%
- doubled ink 6 / 7 / 5 / 11 / 5 px per frame
- night-grass 57 / 51 / 56 / 52 / 53%.

**Evidence:**
- `review.mjs` on the five `remaster-v3` sprites and `--team=remaster-v3`, and again on `remaster-v2`
- `shot.mjs --zoom=closer` on all five, and the same shots at the default game zoom
- a 32-shot burst of the ranger in the lab's game screen, fighting while standing and while walking right
- gridded zooms, frame diffs, onion skins, and clean 1x / 3x / 4x renders on the forest grass by day and at night
- v2 → v3 pixel diffs, frame by frame.

Coordinates are (x, y) in the 48x48 frame. The feet row is 39 and the sole row 38. Letters are `palette.js` keys; other colours are written as hex.

## Scores

| Hero | 1 Align | 2 Silhouette | 3 Team | 4 Anim | 5 Craft | 6 Palette | 7 Appeal | Overall | Verdict | v2 |
|---|---|---|---|---|---|---|---|---|---|---|
| **knight** | 10 | 9 | 9 | 8 | 8 | 8 | 8 | **8.5** (8.57) | **SHIP** | 8.5 SHIP (10 9 9 8 8 8 8) |
| **archer** | 10 | 8 | 9 | 8 | 8 | 8 | 7 | **8.5** (8.29) | ALMOST | 8.0 ALMOST (10 8 9 7 8 7 6) |
| **mage** | 9 | 9 | 9 | 8 | 8 | 8 | 7 | **8.5** (8.29) | ALMOST | 8.5 ALMOST (9 9 9 8 8 8 7) |
| **rogue**, assassin | 10 | 8 | 8 | 8 | 8 | 8 | 7 | **8.0** (8.14) | ALMOST | 7.5 ALMOST (10 7 7 8 7 7 7) |
| **necromancer** | 9 | 8 | 7 | 7 | 8 | 7 | 7 | **7.5** (7.57) | ALMOST | 7.5 ALMOST (9 8 7 7 7 7 7) |

The wraith (`rogue/remaster-v2-wraith`) wasn't carried forward, so its round-2 score (6.5, NOT YET) stands.

**Summary:**
- **The knight ships again.** The polish landed: the idle moves on every frame, the notches are down, and the raised blade reads.
- **Three heroes are one criterion short, and it's the same criterion: appeal.**
  - The ranger, the sorcerer and the assassin score 8 or more on everything else.
  - Each acted on round 2's appeal fixes, and each moved, but at 1x none of them reads as badass yet.
- **The necromancer is stuck at 7.5:**
  - The robe isn't blood-black: a third of it is still crimson, in the knight's own reds.
  - His staff disappears behind him on the blow.
  - His walk is a 4-frame loop played twice.

**Scoring conventions** are round 2's: alignment 10 only where a visible gait was verified frame by frame, and 9 for robed heroes.

## The numbers, checked

**The generator's report holds up.** Its table matches `measure.mjs` and my runs:

| | knight | archer | mage | rogue | necromancer |
|---|---|---|---|---|---|
| upper change, idle / walk | 22 / 60% | 23 / 49% | 20 / 57% | 28 / 66% | 33 / 54% |
| night-clear | 58% | 56% | 55% | 43% | 43% |
| bright (> luma 150) | 36% | 26% | 23% | 21% | 27% |
| smallest idle transition | 38 px | 30 px | 34 px | 39 px | 46 px |

Drift and islandShare match too. All five also have:
- feet on row 39 in every frame (all 70 of the ranger's)
- no frame touching the canvas edge
- 0 stray pixels and no frames in pieces
- a 100% dark outline and inkWall 0
- 13–22 colours.

The previous reviewer's measures, re-run unchanged:

| | walk upper change, v2 → v3 | idle upper change, v2 → v3 | smallest idle transition, px | doubled ink px/frame | night-grass clear (counting only colours 5+ luma clear) | px > luma 150 | px < luma 50 |
|---|---|---|---|---|---|---|---|
| knight | 45% → 45% (game knight 58%) | 13% → 16% (game knight 38%) | 0 → 38 | 5.6 → 3.1 | 57% → 58% (57 → 58) | 36% → 36% | 30% → 29% |
| archer | 38% → 40% (Lyra 45%) | 14% → 18% (Lyra 13%) | 0 → 30 | 7.2 → 6.6 | 51% → 56% (42 → 48) | 21% → 26% | 41% → 40% |
| mage | 39% → 41% | 13% → 13% | 5 → 34 | 5.1 → 4.0 | 56% → 55% (51 → 51) | 24% → 23% | 29% → 30% |
| rogue, assassin | 50% → 60% | 15% → 22% | 11 → 39 | 11.0 → 1.0 | 52% → 43% (33 → 31) | 19% → 21% | 48% → 57% |
| necromancer | 37% → 38% | 12% → 20% | 0 → 46 | 4.8 → 4.4 | 53% → 43% (41 → 38) | 28% → 27% | 38% → 43% |

- **Dead idle frames: gone.** Every idle transition changes 30 px or more; the bar was 20.
- **Doubled ink:** the assassin went from the team's worst to its best. The ranger now has the most, around the bow and between the fletching feathers (f0: (12,10), (15,10), (28,20), (30,24)).
- **Night-grass: met to the letter, at the smallest margin the rule allows.**
  - No colour that carries a score sits within 2 luma of the line any more. Two colours still sit that close, but they carry nothing:
    - the necromancer's emissive rune red x (+1.75, 1% of his pixels)
    - the knight's belt b (+0.1, 3 px).
  - Each colour that does carry a score was lifted just past the rule:
    - the assassin's mid-violet #6f3d78: +4.0, on 13% of his pixels
    - the leather #7d4540 that the ranger, the sorcerer and the necromancer share: +3.8, on 7% of the ranger
    - the necromancer's #b52f40: +4.8.
  - Counting only colours 5 or more luma clear (the bracketed figures), three heroes fall under their bars: the ranger to 48%, the assassin to 31%, the necromancer to 38%.
  - **I accept it this round.** The test is pessimistic: in the game the hero walks in his own light, and in the default-zoom fight shots on grass both dark heroes read clearly. See the bar for round 4.

## What improved, and what regressed, since round 2

**Improved:**
- **No idle freezes anywhere** (the table above).
- **The knight's idle moves on every frame.**
  - The cape's trailing edge (row 33, corrected for the breath) runs x 10, 10, 10, 9, 9, 9, 8, 9 over f7 and f0–6: a smooth 2 px drag and back.
  - The plume's tail swings, and the blade's point lifts 1 px on f5.
  - f16–17 draw the blade 3 px wide (a w edge, w, G), so the raise and the cock read at 1x.
- **The ranger stands like a hunter.**
  - The bow is low and tipped forward: grip at (32,28), top limb at (34,18), bottom at about (27,33), so about 25° off vertical.
  - An arrow is nocked, its head at (38–39,33), and her near hand is on the string at (27,27).
  - Her soles are at x 17–21 and 28–32, and there's a lid line over the eye at (27–28,16).
  - She carries the lowered bow into the walk: it tilts 21–23° there, where v2's tilted 13° in every walk frame.
- **The ranger's release kicks.**
  - On f20 the grip jumps from (35,23) to (37,23), the limbs straighten (x 35–37, rows 12–34) and the head drops back 1 px. f21 settles.
  - It plays in the game: the burst shows draws and releases facing both ways, standing and walking, with no errors.
- **The sorcerer has a gesture.**
  - His free hand is raised to chest height with a pulsing ember (f / o, x 12–14, rows 19–21, in four shapes).
  - The brows' inner ends drop to (23,16) and (26,16).
  - A tome rides at his waist in the walk.
- **The assassin is a person.**
  - No fire above row 15 in any frame: the horns are gone.
  - Thighs are 4 px and shins 3 px (f0: x 14–18 and 20–24 on rows 34–37).
  - 57% of his pixels are darker than luma 50 (v2: 48%), with a #d9a6ff rim on every top-left edge.
  - He has the cleanest outline of the team: 1 doubled pixel per frame.
- **The necromancer's skull is modelled:**
  - a lit brow in z (x 21–24, row 12)
  - h sockets around the l eyes at (22,15) and (26,15)
  - Q / W shadow on the right
  - a tooth row (z, x 22–25, row 18).
- **The necromancer's cast leans.** The crown's gem goes from x 24 (idle) to 22 (f17) to 26 (f19), and the hem kicks 2 px.

**Regressed or still weak:**
- **The necromancer's staff vanishes on the blow.** v2's staff tipped only about 25°, but stayed in view. v3's swings 60° and ends behind the body:
  - On f19 its skull hides behind the crown. The bone that shows at x 28–33, rows 8–12, makes the crown look lopsided.
  - Only its foot pokes out, at the lower left (x 9–17, rows 29–36).
  - f20 is the same.
- **The necromancer's robe is not blood-black, and his walk repeats** (see the brief compliance and his section).
- **The assassin's hood lost its point.** v2's hood peaked. v3's is a 14 px dome (x 16–30, rows 9–18) with a flat top (x 24–27, row 10) and a one-pixel hook at (28,11). At 1x it reads as a bean, as the generator's notes admit.
- **The assassin's scarf became a club.**
  - It runs level at chest height (rows 22–24) from the collar (x 17) to a lilac flame bulb (x 6–13, rows 16–25).
  - With both daggers level on the other side, he's a 37 px horizontal bar, the widest hero (the others are 28–32).
- **The ranger's cloak stripes got louder.**
  - The 1-px alternation is now L against e (48 luma apart); in v2 it was E against e (34 apart).
  - It runs at x 15–18 on rows 25–26 of f0, plus L / e / L columns through x 14–20, rows 21–30.
  - In the closer shots it reads as pinstripes.
- **The knight's plume flicks.** f7 and f1 are identical in the plume (0 px changed), and f0 sits 1 px right of both (21 px). The tail twitches out and back in one frame instead of waving.

## Brief compliance (round 3)

| Item | Result | Evidence |
|---|---|---|
| Knight: polish only; the frozen idle frames (7, 0, 1, 2) move, with the plume and cape alive | Met | f7→f0 64 px, f0→f1 38, f1→f2 62 (v2: 0, 0, 0). Elsewhere, v2→v3 changes are 3–11 px per walk frame and 5–54 per attack frame. One flaw: the plume's f0 flick. |
| Ranger: hunter's stance, bow low and diagonal | Met | Grip (32,28), about 25° off vertical, an arrow nocked, feet at x 17–21 and 28–32, a lid line. |
| Ranger: weight forward | Not visibly | The torso is upright. The head sits 3 px ahead of the feet's midpoint, as in v2 (2.5 px). |
| Ranger: recoil on the release | Met, but | Grip +2 px, limbs straight, head back 1 px. The thrown string hand is one skin pixel at (19,20) inside the cloak, so that part doesn't read. |
| Ranger: wiring kept, and the fight shot shows the bow pose | Met | `attackFps` 13, `attackRelease` 4, `attackWalk` 6 × 8 (frames 22–69). The fight shot shows the low ready; the burst shows full draws and releases. |
| Sorcerer: a commanding idle (staff planted forward, a raised glowing hand, a scowl) | Met to the letter, not in effect | The staff's foot is at (33–34,38) and its orb centred near x 36: round 2's own numbers, but only a 6° lean, on his side where v2's staff stood. The ember is 3x3 px and held behind him; the scowl is 2 px per brow. At 1x he's a friendly wizard holding up a spark. |
| Assassin: no flame horns | Met | The fire's top row is 15 in every frame. |
| Assassin: thicker legs | Met | Thighs 4 px, shins 3 px, and the head top raised to row 9. |
| Assassin: darker toward shadow (40% bar) | Met | 43% night-clear, 21% bright, a lit rim; 57% darker than luma 50. |
| Necromancer: body in the cast (staff through 45° or more, a 2 px lean) | Met in numbers, not in the read | A 60° arc, a lean of −2 → +2 px, a 2 px hem kick. But the staff is hidden behind the body on f19–20. |
| Necromancer: robe darkened to blood-black (40% bar) | Partly | Night 43%. The robe: see below. |
| Necromancer: distinct from the knight's red | Not met | See below. |
| All: no idle frame identical to the next | Met | Smallest transitions 38, 30, 34, 39 and 46 px. |
| All: colours not tuned to scrape past the night test | Met to the letter | Nothing carrying a score sits within 2 luma of the line, but the margins are +3.8 to +4.8 (above). |

**The necromancer's robe, measured on f0** (ink left out). The orchestrator is right: it still reads crimson.
- **Rows 30–38 (the skirt):**
  - Crimson fell from 43% to 27%, and m / h rose from 27% to 43%.
  - But only the shadow half went dark (x 21–25). The lit half is still crimson columns (@ R R at x 16–18, rows 28–37).
- **Rows 20–29 (chest and sleeves):** unchanged at 38% crimson.
  - The chest is a block of R (x 22–26, rows 21–26) where v2 had #aa2a3a.
  - The sleeves' lit planes are r and #b52f40.
- **The whole robe (rows 20–38):** 33% crimson (v2: 40%). By day, in the team lineup and in every in-game shot, he's a red-robed lich.
- **It's the knight's red, literally.**
  - The robe's mass is R #a22633, the knight's cape shadow. Its lit planes use r #e43b44, the knight's cape mid.
  - R and r make up 30% of the knight's coloured pixels and 19% of the necromancer's.
- **The crimson doesn't help him at night.**
  - R is under the line (34, against 35.4). Bone (Z, Q, z, T) supplies about 35 of his 43 points.
  - So the robe can go black without losing the night bar, as long as an r rim stays.

## Departures the generator chose

1. **No flames off the shoulders**, although round 2 allowed them. The reason holds: on the shoulders they'd read as ears again. But the fire moved to the scarf's tip, where it makes the bulb.
2. **The ranger's bow notches left in ink**, because filling them puts bumps on the bow. Accepted. The cost is 6.6 doubled pixels per frame, the team's most; zero ink walls still holds.
3. **The necromancer's rune x within 2 luma of the line.** Accepted: it's emissive, 1% of his pixels, and carries nothing.

## Knight: Sir Aldric, 8.5, SHIP (v2: 8.5)

**How far from SHIP:** it ships, for the second round running. Everything below is optional polish.

**Works:**
- Round 2's strengths are untouched: the verified gait, the en garde stance, the plume, the shield, and the team's best attack.
- 58% night-clear, all of it 5+ luma clear: the only hero whose night score doesn't drop at all at that margin.
- The idle moves on every frame, and the blade reads in the wind-up.
- Doubled ink is down from 5.6 to 3.1 per frame: (21,13) is now R, (18,36) N, (22,36) g.

**Doesn't (polish):**
- The plume's f0 flick (above).
- f17's motion streaks are two G dashes boxed in ink (x 3–6 and 7–10, rows 16–18). They read as two more sticks, not as motion.
- The idle is still small: upper change 16% against the game knight's 38%. That's why animation stays at 8.
- The cape's 1-px @ / R alternation (#f2735a / R) is inherited from v2: at x 15–18, rows 32–34 in idle f0 and f2, and somewhere in every walk frame (x 13–19, rows 26–34).

**Top 3 fixes (polish):**
1. **A wave, not a flick.**
   - Today the plume tail's leftmost column on row 15 runs x 12, 11, 11, 10, 10, 10, 11, 11 over f0–7, with f0 out of phase.
   - Make it step once every two frames: 12, 12, 11, 11, 10, 10, 11, 11.
   - Let the cape carry the frames where the plume holds, so f0→f1, f4→f5 and f6→f7 still change 20 px or more.
2. **Motion streaks without ink (f17).** Drop the k around the two dashes. Draw them as 1 px tall lines tapering G → g → N, trailing from the blade toward x 3.
3. **The last stripes and notch.**
   - Merge each @ R @ run (idle f0 and f2 at x 15–18, rows 32–34, and the walk's at x 13–19, rows 26–34) into one 2 px lit band.
   - End the plume's front tip with R at (25,11), so it stops leaving a 2 px ink step on the helm's crown.

## Archer: Lyra, 8.5, ALMOST (v2: 8.0)

**How far from SHIP:** one criterion, appeal (7).
- The stance earned a point, and animation and palette reached 8 with their fixes.
- What's left is shape: a small figure under a large green tent.
- One round if the cloak changes; two if the shape needs a second pass.

**Works:**
- The hunter's low ready and the release's recoil (above), wired and playing in the game.
- Value with margin: 56% night-clear (v2: 51%), 26% bright (v2: 21%), t bracers and belt, and a 1 px l rim on the hood's top-left.
- The idle waves on every frame: hood tip, cloak hem, fletching, a 2 px breath, the bow rocking. The smallest transition is 30 px.
- The gait is unchanged and verified.

**Doesn't:**
- **Appeal: the tent.**
  - The hood and cloak are one green triangle, from the hood point (21,10) to the hem (x 12–20, row 31).
  - Green is 39% of her coloured pixels, and it hides her torso and bow arm.
  - The quiver adds a big brown stick with three white-and-red flags above it.
  - At 1x she's a capable but cute Robin Hood.
- **The shot doesn't land at 1x.** The release's thrown string hand on f20 is one skin pixel inside the cloak.
- **The arrow comes and goes.** It's nocked in the idle but missing from all eight walk frames, so it vanishes when she moves and reappears when she stops.
- **Craft:** the cloak's pinstripes and the team's most doubled ink (both above).

**Top 3 fixes:**
1. **Open the tent (appeal).**
   - Cut the cloak's front to a short cape that ends at the belt (row 27), so the torso, the t belt and the bow arm show.
   - Keep the long tail only at the back (x 9–15, down to row 31), ragged in 2 px steps.
   - Raise and sharpen the hood's point by 2 px, to about (21,8).
   - Aim for green at about 30% of her coloured pixels. The night bar is safe: L and e both clear the line.
2. **Make the shot read at 1x.**
   - **f20:** draw the thrown string hand as a 2x2 fist (s / S) at about (18–19, 19–20), edged in k against the hood's green.
   - **The walk (f8–15):** keep the arrow nocked, its head about 6 px past the grip as in the idle, so idle, walk and draw read as one hunter.
3. **Craft where the eye goes.**
   - **The cloak:** turn its 1-px L / e alternation (x 14–20, rows 21–30) into 2 px bands.
   - **The bow and the fletching:** clear the doubled ink at (28,20) and (30,24) on the bow's inner edge, and at (12,10) and (15,10) between the feathers.

## Mage: Eldrin, 8.5, ALMOST (v2: 8.5)

**How far from SHIP:** one criterion, appeal (7), as in round 2.
- Round 2's three appeal fixes were all carried out to the letter, but at 1x they barely change the read. The numbers I inherited were too timid.
- One round, if the changes are bold.

**Works:**
- Still iconic and clean: 55% night-clear (51% counting only colours 5+ luma clear), 23% bright, islandShare 0.096 (the team's lowest), doubled ink 4.0.
- The idle is alive: the ember in four shapes, the orb's glint stepping round, and the beard tip, hat tip and hem moving. The smallest transition is 34 px.
- The walk gives the free hand a tome (B / b / y, with a skin hand).
- The walking-staff cycle and the cast are round 2's, and still good.

**Doesn't:**
- **He isn't commanding yet.**
  - The ember is a 3x3 spark, held behind him at chest height. At 1x it's an orange dot, and the raised palm reads as a wave or "one moment".
  - The scowl is two 2 px brows on skin ((22,15)–(23,16) and (27,15)–(26,16)), and it vanishes at 1x.
  - The staff leans 6°, from x 33–34 at row 38 to x 36–37 at row 9, on his side where v2's stood. At 1x it's upright.
- The cast ignores the ember hand, so the idle's fire just disappears when he casts.

**Top 3 fixes (all for appeal):**
1. **Make the ember a weapon.**
   - Lift the hand to head height, palm at about (11–13, 15–16).
   - Grow the flame to 4x5 and make it emissive: a w / f core, an o body, and an O / r tongue that flickers upward.
   - Let it throw a 1 px warm rim (o / y) on the left edge of the beard and sleeve.
2. **A stern face.**
   - Put the eyes in shadow: row 16 between the brows in K (the brim's shadow). Keep the eyes on row 17 dark, or use c for a frost glare.
   - Make each brow 3 px, angled down to the nose: (21,15) → (23,16) and (28,15) → (26,16).
3. **The staff forward, for real.** Plant it at about 15°: the foot at (32,38), the orb at about (39–40,6), the near hand gripping at chest height (about (36,22)). The stance gets a diagonal, and the orb leads.

## Rogue: Kael, the assassin, 8.0, ALMOST (v2: 7.5)

**How far from SHIP:** one criterion, appeal (7). The horns, the legs and the value are fixed. One round, if the head and the scarf change.

**Works:**
- A playable person at 1x: two sturdy legs on the verified gait, a mask with "\ /" eyes in bone white (z), two 9 px daggers (w / G with y guards), and a magenta collar.
- He's a shadow again:
  - dark plum mains (q / h / #6f3d78)
  - lilac only on the lit planes and the rim
  - 57% of his pixels darker than luma 50.
  
  He reads by day and at night, through the white eyes, the blades and the rim.
- The cleanest craft of the round: 13 colours, 1 doubled pixel per frame, islandShare 0.109.
- The most alive sprite: walk upper change 60% (the game knight's is 58%), and every idle transition moves 39 px or more.

**Doesn't:**
- **The bean head and the scarf club** (above). Between them, he reads as a cartoon ninja rather than an assassin.
- **The attack is round 2's, re-posed rather than reworked.**
  - f16's coiled blade (from (9,16) to (16,20)) lies across the scarf's flame (x 5–11, rows 17–25).
  - f18's trail runs down past the near leg's back edge (x 24–27, rows 34–37).
- **The passing frames show one leg.** On f10 and f14 the swing foot is hidden behind the stance shin (x 21–27). This was already so in v2.

**Top 3 fixes:**
1. **A peaked hood.**
   - Raise the crown to a point at about (26,7), hooking forward over the eyes to (29,9)–(30,11).
   - Slim the back of the cowl by 2 px: its back edge moves from x 16 to x 18 on rows 12–18.
   - The head then reads as a pointed hood about 12 px wide, not a 14 px dome.
   - Keep the #d9a6ff rim along the new top-left edge.
2. **A scarf that trails.**
   - In the idle, let it fall: two tails from the collar, angled down and back to about (10–12, 28–30), each 2–3 px wide.
   - The flame becomes a thin flicker at the tips (3 px or less), not a bulb at chest height.
   - Keep the long horizontal stream for the walk, where speed explains it.
   - His idle box shrinks from 37 px toward the team's 32, and the far side reads as cloth.
3. **Rework the attack for the new body.**
   - Coil the blades in front of the chest (x 22–30, rows 18–24), clear of the scarf.
   - End f18's trail at the knee (row 32).
   - On f10 and f14, draw the swing foot's toe 1–2 px ahead of the stance shin, with a j edge, so both legs read.

## Necromancer: Morvath, 7.5, ALMOST (v2: 7.5)

**How far from SHIP:** four criteria at 7: team, animation, palette and appeal.
- A black robe moves three of them at once: team, palette and appeal.
- Fixing the blow and the walk moves animation.
- Two rounds is likely; one if all three fixes below land cleanly.

**Works:**
- A lich at a glance, now with a face: the bone crown, the modelled skull with green eyes (his skeletons' colour), the bone pauldrons and panel, and the grimoire. He's bigger and brighter than his minions in every shot.
- The idle is alive:
  - The staff swings like a pendulum about its planted foot (the skull's x offset runs 0, −1, −1, 0, 0, +1, +1, 0).
  - The runes and pages step, and the staff's eyes pulse.
  - The smallest transition is 46 px.
- The cast's body acts: a lean from −2 to +2 px, and a 2 px hem kick on the blow.
- Craft is up a point: the modelled skull, 18 colours, islandShare 0.101, doubled ink 4.4. A small z / Z 1-px alternation remains down the lit cheek (x 20, rows 13–16).

**Doesn't:**
- **Still a red robe, in the knight's R and r** (see the brief compliance). That's why team, palette and appeal stay at 7.
- **The staff vanishes on the blow** (f19–20).
- **The walk is a 4-frame loop played twice.**
  - f12–15 are pixel for pixel f8–11, in v2 too. Every step kicks the same hem and plants the staff the same way.
  - The other four heroes' second steps differ from their first by 9–311 px.

**Top 3 fixes:**
1. **Blood-black, and not the knight's red.**
   - Make the robe m with h folds everywhere: the chest block (x 22–26, rows 21–26), the sleeves' lit planes, and the lit half of the skirt (x 16–18, rows 28–37).
   - Keep crimson only as:
     - a 1 px r rim down the top-left silhouette, shoulder to hem
     - 1 px R fold lines
     - a ragged R band at the hem (rows 36–37), the blood-soaked hem
     - the runes.
   - Aim for crimson on 12% of the robe or less (now 33%).
   - Nothing at night depends on R, so the bone and the r rim keep him at 40% or more. If he falls short, add bone (a wider panel, clasps), not lighter cloth.
2. **Keep the staff in sight on the blow (f19–20).**
   - Bring the staff in front of the body, with its skull clear of the head at about (34–38, 8–12).
   - Add a 1-frame bone-white smear (z → Z) along its path on f18–19, as the knight's f18 does.
   - Or slam it straight down in front of him (foot at about (31,38)) as the book bursts.
   - Either way, the crown keeps its shape on the impact frame.
3. **Two different steps (f12–15).**
   - Draw the second step with the other foot: on f12–13 the back hem (x 12–14) kicks out with a toe (h / m) while the front rests.
   - Plant the staff only on f8, and swing it forward on f12, so the 8-frame walk alternates.

## Bars for round 4 (changes from round 3 only)

1. **Two different steps.** In every walk, f12–15 may not repeat f8–11 pixel for pixel. Robed heroes mirror the hem kick and the toe on the second step.
2. **The weapon is visible on the impact frame.** On the blow frame the blade, staff or bow is in view, tip or head included: not hidden behind the body, and not merged into the head.
3. **No shared dominant cloth.** No hero's main cloth may use another hero's main cloth colours. The necromancer's robe may use crimson (R, r, #b52f40) on at most 12% of its pixels, as rim, folds, hem and runes.
4. **Night-grass: the bar stays, with one addition.**
   - The bar is 50%, or 40% for the dark heroes, provided 20% or more of their pixels are bright and the top-left rim is lit.
   - I'll also report it counting only colours 5 or more luma clear of the line. A palette score of 9 needs the bar met there.
   - A hero who falls short adds light masses (rim, bone, steel, glints), not a mid-tone lifted a few luma over the line.
5. **Everything else stays as in round 3, and every hero meets it:**
   - scale and eye line
   - the gait
   - zero ink walls
   - colour count and islandShare
   - no idle transition under 20 px.
