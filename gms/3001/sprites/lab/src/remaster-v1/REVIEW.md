# Review: remaster-v1

This round is scored against `../BASELINE.md`, with the same rubric, anchors and measurements, and the same strictness.

**Evidence:**
- `review.mjs <cls>/remaster-v1` and `--team=remaster-v1` (boards and JSON)
- `shot.mjs --zoom=closer`, plus shots at the default game zoom beside the game's own five
- gridded zooms, diffs and onion skins of every frame

**Coordinates and new measures:**
- Coordinates are (x, y) in the 48x48 frame. The feet row is 39 (the outline under the soles) and the sole row is 38. Palette keys are `public/js/art/palette.js` unless written as hex.
- **Change/frame:** the share of a sprite's pixels that differ from the previous frame, counted above the hips (the bottom 10 rows left out). It is the onion skin in numbers.
- **Doubled ink:** pixels where a second ink pixel sits just inside the silhouette's ink edge, making a 2 px black wall.

## Scores

| Hero | 1 Align | 2 Silhouette | 3 Team | 4 Anim | 5 Craft | 6 Palette | 7 Appeal | Overall | Verdict | Baseline |
|---|---|---|---|---|---|---|---|---|---|---|
| **knight** (Sir Aldric) | 9 | 9 | 8 | 6 | 7 | 8 | 7 | **7.5** (7.71) | ALMOST | 7.5, ALMOST |
| **archer** (Lyra) | 9 | 7 | 8 | 5 | 6 | 7 | 6 | **7.0** (6.86) | ALMOST | 7.0, ALMOST |
| **mage** (Eldrin) | 8 | 7 | 7 | 5 | 6 | 7 | 5 | **6.5** (6.43) | NOT YET | 4.5 |
| **rogue** (Kael) | 8 | 5 | 5 | 6 | 6 | 5 | 5 | **5.5** (5.71) | NOT YET | 3.5 |
| **necromancer** (Morvath) | 9 | 6 | 7 | 4 | 6 | 5 | 6 | **6.0** (6.14) | NOT YET | 3.5 |

**What's better:** a big step for the team.
- One scale, one ink outline, one palette system, one light direction.
- The three casters grew from 22–24 px to the knight's size and each gained 2 to 2.5 points.
- Every hero now has an idle, a walk and an attack.

**What isn't:** the knight and ranger are not better than the game's own. Their walks are stiff and limp, their idles are near-stills, and the ranger loses Lyra's shoot-while-walking. No hero reaches SHIP: animation is the weakest score for every one of them except the rogue.

## Measurements (baseline in brackets)

| | body / total height | feet row 39, idle+walk | idle / walk drift | colours | islandShare | px > luma 150 | night-grass clear | upper-body change/frame, idle / walk | doubled ink px/frame |
|---|---|---|---|---|---|---|---|---|---|
| knight | 30 / 30 | every frame | 0.10 / 0.58 | 15 [336] | 0.10 [0.28] | 34% [16] | 56% [56] | 9% [38] / 23% [58] | 20 [0] |
| archer | 30 / 30 | every frame | 0.04 / 0.36 | 19 [23] | 0.10 [0.18] | 21% [15] | 47% [36] | 9% [13] / 20% [45] | 40 [40] |
| mage | 30 / 37 (orb) | every frame | 0.30 / 0.28 | 16 | 0.10 | 18% [18] | **54%** [32] | 8% [–] / 18% | **47** |
| rogue | 30 / 31 (fire) | every frame (tail tip) | 0.43 / 0.31 | 10 | 0.12 | 6% [4] | 27% [12] | 15% [36] / 25% [36] | 22 |
| necromancer | 30 / 35 (staff) | every frame | 0.19 / 0.53 | 15 | 0.12 | 14% [6] | 26% [19] | 7% [–] / 22% (robe hem: 4%) | 24 |

## Team-wide problems (fix once, in `kit.js`)

1. **The walk limps (knight and ranger).**
   - `legPic` puts the hips 4 px apart: far x 26 / near x 22 for the knight, 25 / 21 for the ranger. Both legs run the same `LEG.walk` table, so each foot lands relative to its own hip.
   - Contact on f8 has the feet 11 px apart; the knight's soles are at x 16–22 and 28–32.
   - Contact on f12 has them 3 px apart (soles x 21–29).
   - The result is a long step, then a short step, every cycle.
2. **Short stride, low lift.**
   - Even with the hips matched, the table's contacts sit at hip +4 and hip −3, a 7 px stride. Lyra's is 11 px.
   - The passing foot lifts 1 px: phases 5–7 put the sole on row 37. Lyra's lifts 4 px.
   - The planted foot's travel back is right (+4 → +3 → +1 → −1 → −3, 1–2 px a frame): keep it.
3. **Rigid upper bodies.**
   - The onion skins of the knight and ranger walks are crisp above the hips. In the walks:
     - the shield, the bow and the head move only with the 1 px bob
     - the sword arm swaps three stamped patches
     - the ranger's near hand swings ±1.5 px.
   - Nothing has drag: the plume, cape, hood point, quiver and beard move on the same frame as the body.
4. **Doubled ink on thin parts.**
   - `inked()` draws an ink edge on clear pixels around a part. When that edge lies on the silhouette, `outline()` adds the outer ring beside it, making a 2 px black wall. That's 20–47 px per frame:
     - knight: blade underside, x 31–38, rows 30–34 (f0)
     - ranger: bow's back, x 34–35, rows 21–31
     - mage: staff, x 35–36, rows 10–37 (`kBbkk`)
     - shade: near dagger, x 34–38, rows 26–29
     - necromancer: skull staff, x 16–18, rows 6–10
   - Fix: `inked()` should only ink pixels that are already drawn underneath, i.e. where the part covers another part. It should never ink a clear pixel; the silhouette outline does that.
5. **Scale.** The brief's "30 ±1 to the top of the head including headgear" squashed the mage: his face sits at row 21–22. The bar for round 2 is at the end of this review.

## Knight: Sir Aldric, 7.5, ALMOST (the baseline is also 7.5)

**Works:**
- **Reads instantly at 1x, by day and at night.**
  - The round armet has an inked T-visor (slit on row 17, x 23–29; nose slit x 25, rows 18–19). The beak face is gone.
  - The red plume, the red heater shield with its gold cross (x 30–37, rows 20–30), the cape and the white longsword all read.
  - 34% of pixels are lighter than luma 150 (the game knight has 16%), and 56% clear the night grass, matching the best in the game.
  - The shield, invisible in the baseline, is now his strongest read.
- **Clean, deliberate palette.** 15 colours, no near-duplicates, no strays, all lit from the top-left:
  - steel: w / G / g / N / n
  - red, warm to cool: #f2735a → r → R → #6e1a2a
  - gold: Y / y / d.

  Steel, cloth, gold and the leather belt (row 27) are distinct materials.
- **Registration is spotless.** Feet are on row 39 in every idle and walk frame, drift is 0.10 / 0.58, the plume top is on row 10 and the helm top on row 12.
- **The team's best attack:**
  - raise (16), then cock behind the helm (17)
  - overhead smear (18)
  - a crescent blow with a 2 px lunge (19), on attack frame 3, where `strikeClip` lands it
  - follow-through (20), recover (21).

**Doesn't:**
- **The walk limps and shuffles.** f8 has an 11 px stride and f12 a 3 px stride, and the passing foot lifts 1 px (sole on row 37 in f9–11 and f13–15). `shieldX` is 0 in all eight walk frames, so the shield never swings. Upper-body change is 23% per frame against the game knight's 58%: his walk was the bar and this is a step back.
- **The idle is almost a still.** A 1 px breath (f3–5), plume tail and cape hem ±1 px and a glint: 9% change per frame against 38%. The sword hangs at 1:3 with its tip at (40,33), pointing at the ground, which is a passive pose.
- **Craft:**
  - doubled ink under the blade (x 31–38, rows 30–34) and a 2–4 px ink wedge between plume and helm (x 14–19, rows 15–19)
  - a 9 px ink bar under the helm (row 21, x 21–29) that fuses chin and breastplate
  - cape folds as 1 px alternating stripes (row 30, x 12–18: `#f2735a r R r #f2735a R r`).
- **Toy proportions.** A 9x11 helm on 6 px legs (rows 33–38) with the blade hanging down reads as a toy soldier at 1x. He's heroic, but not yet badass.

**Top 3 fixes:**
1. **Walk (f8–15):**
   - one hip column for both legs (x 24), so f8 and f12 both show a 10–11 px stride
   - the passing sole on row 35 in f10 and f14, and on row 36 in f9, f11, f13 and f15
   - a shield counter-swing: `shieldX = [-2,-1,0,1,2,1,0,-1]`, opposite to the sword arm, with `shieldY` following the bob
   - the sword swing widened to a blade angle of 1:5 → 1:1 (the tip travels at least 4 px)
   - plume tail and cape hem moving one frame after the body's dip (f10 and f14, not f9 and f13).
2. **Idle (f0–7):**
   - Give him attitude: a raised guard, with the hilt at (27,29) and the tip near (38,20), blade up and forward. The other option is the point planted with both hands on the pommel.
   - The cape hem and plume tail move 2 px, a frame behind the breath (f4–6).
   - The shield and blade rise 1 px with the breath.
3. **Craft:**
   - zero doubled ink, via the `inked()` fix; check f0 at x 31–38 rows 30–34 and x 14–19 rows 15–19
   - row 21 under the helm in n (#3a4466), with ink only at the silhouette
   - cape folds as 2–3 px lit bands (#f2735a / r) and 1–2 px shadows (R / #6e1a2a) tapering to the shoulder, never 1 px alternation.

## Ranger: Lyra, 7.0, ALMOST (the baseline is also 7.0)

**Works:**
- **She shows on grass now.** The leaf-green hood (L #63c74d, lights l #9ee562, shadows e / E / v) separates from the forest (#172425) where Lyra's olive sank. 47% of pixels clear the night grass (Lyra 36%) and 21% are lighter than luma 150. Clean: 19 colours, no near-duplicates.
- **At the team's scale, with a face.** The hood top is on row 11, an auburn fringe d (#d77643) runs at x 24, rows 16–19, and an eye k sits at (27,17).
- **A complete draw:** nock (16), half draw (17), full draw with the bow flexed (18), hold (19), release with the hand flung back (20), recover (21).

**Doesn't:**
- **In the game she would regress.**
  - `attackFps` is 0, so `ranger-animation.js` returns null and no bow pose plays at all.
  - There are no `attackWalk` frames, so any shot on the move falls back to the standing frames (line 26) and her legs freeze mid-stride.
  - Lyra had 64 shoot-while-walking frames, and the ranger's draw is the only attack the forest shows.
- **The knight's limp and shuffle.** With the hips at x 25 / 21, f8 has an 11 px stride and f12 a 3 px stride, and the foot lifts 1 px where Lyra's lifted 4. The grip is fixed at (33,26) and the near hand swings ±1.5 px: upper-body change is 20% per frame against Lyra's 45%. The idle is a 1 px breath plus the cloak hem.
- **The bow.**
  - String and limbs are both T (#ead4aa), so at rest they read as one closed pale "D" (x 30–33, rows 15–37) and at full draw as a diamond.
  - The bow's back has a 2 px ink wall (x 34–35, rows 21–31, `TBkk`).
  - It is held upright in front of the body like a staff.
- **Fletching and legs.**
  - The fletching is two 2x2 blocks, w over r, at (13–14, 12–13) and (16–17, 12–13). At 1x that's a tiny red-and-white flag.
  - The trousers are h / m (#2a1f2d / #3e2731), dark enough to merge with the outline, so rows 30–38 read as a black mass.
  - The cloak is a flat L / e field with one fold line.

**Top 3 fixes:**
1. **Wire her into the game.**
   - `attackFps: 13`, `attackRelease: 4` (the release on f20). Drop `gameAttackFps`: the lab now keeps `attackRelease` and `attackWalk`.
   - Draw `attackWalk`: 6 attack × 8 walk frames, each the attack's upper body over the legs of walk frames 8–15, as Lyra had.
2. **Walk (f8–15):**
   - the team-wide leg fixes: one hip column (x 23), a 10–11 px stride, a 3 px passing lift
   - the bow arm moves: the grip shifts x ±1 against the stride and the bow tilts 1 px at the tips on alternate steps
   - the near hand swings ±3 px (x 18–24)
   - the quiver and fletching bounce 1 px, a frame after the dip
   - the cloak hem trails 2 px.
3. **Bow, fletching and legs:**
   - the string 1 px in g (#8b9bb4) or G (#c0cbdc), never the limb colour; limbs in t / T with b tips; a single ink edge
   - the bow tilted 10–15° (top limb forward), so it stops reading as a staff
   - the fletching as 2–3 small angled feathers (w tip, G vane, r band) fanning up and back from the quiver mouth around (11–15, 9–12)
   - trousers in b / m (#733e39 / #3e2731) with B on the lit edge, boots B / b with a t cuff.

## Mage: Eldrin, 6.5, NOT YET (the baseline is 4.5)

**Works:**
- **Scale and presence are fixed.** He went from 24 px to the team's 30 (hat tip on row 10, the orb on rows 3–9), with feet on row 39 in every frame. 54% of pixels clear the night grass (the baseline had 32%), so he meets the bar, thanks to U (#0099db) and the ice orb (X #c8f4ec, c #2ce8f5).
- **A wizard at 1x:** a hat bent back at the tip (x 17–29, rows 10–20), a silver band (row 18), white brows (21–23, 22), a beard, and the staff's orb in a claw.
- **He has an idle, a walk and a cast:**
  - idle: breath, robe sway, frost glints
  - walk: a glide with the hem kicking and a toe showing
  - cast: lean back 1 px (16–17), thrust with a 2 px lean in (18–19, the staff pivoting about 20° on its foot), a frost star (19), fade, recover.

  The baseline had a 1-frame idle and no cast.

**Doesn't:**
- **A short man in a tall hat.** The brim is on rows 19–20 and his only eye pixel is at (24,22): his eye line is 5 rows below the knight's visor and the ranger's eye (both row 17). The face is one skin row (row 21, x 22–27) plus that pixel, so at 1x there is no face.
- **A blue box, shaded in stripes.**
  - The robe is a rectangle, x 15–31, rows 21–38, with no shoulders and no waist.
  - It's shaded in 1 px vertical bands. On row 33 from x 16: U U U U, #1f6fbf, $ (#7fd0f5), u, #1f6fbf ×4, G, $, U, u, and rows 30–37 run the same columns. That's banding, not form.
  - The grey beard (G / g, x 23–27) runs straight into the G trim column at x 27 (rows 30–37), so beard and robe panel merge.
- **The staff carries the team's worst doubled ink:** 2 px of ink on its right (x 35–36, rows 10–37), 47 px per frame. At 1x it's a heavy dark pole.
- **The body barely acts.**
  - The walk changes 8% of the hem-region pixels per frame. The staff rides with the body (`orb` and `grip` move only with the bob) and never plants.
  - The cast is a 3 px sway and a 20° staff pivot.
  - His kit throws fire (Fireball, Cataclysm meteors), but there's nothing warm in the art.

**Top 3 fixes:**
1. **Proportions, to the bar:**
   - the brim on rows 13–14 and the hat rising from row 13 to a tip near row 5 (it may cross the cyan line)
   - two eye pixels (k) on row 17, e.g. (23,17) and (26,17), under w brows on row 16, with S / s cheeks
   - a white beard (w / G, not g) from row 18 to about row 30, with a g shadow on its right
   - the robe with shoulders (x 15–30 on row 20), a waist at the sash (x 18–28 on row 27) and a flared hem (x 13–32 on row 38).
2. **Act with the body.**
   - **Walk (f8–15):**
     - the staff foot planted on row 38 in the contact frames (8, 12) while the body passes it, then swung 2–3 px forward on the passing frames (10, 14)
     - the hem kicking 2 px forward with a boot toe (b / m) on alternate steps
     - the near sleeve swinging ±2 px.
   - **Cast (f16–21):**
     - f16–17: the staff drawn back over the shoulder (orb near (24,4)), the body leaning back 2 px, the free hand raised and glowing
     - f19: the staff thrust forward, the body leaning in 2 px, the robe flaring
     - a warm core (Y #fee761 / o #f77622) inside the frost star, so the art agrees with his fireballs.
3. **Craft:**
   - shade the robe as a cone: a 3–4 px U band on the left, a #1f6fbf body, a 3 px u shadow on the right, and a 3 px $ panel down the front with one G trim line
   - folds as 2 px diagonals from the sash
   - the staff as 2 px of wood (B lit, b shade) with a single ink column.

## Rogue: Kael, 5.5, NOT YET (the baseline is 3.5)

**Works:**
- **Violet is now a real hue.** h / q / p / j with lilac (#d9a6ff) tips make violet 28% and magenta 13% of his pixels, where the baseline was grey. He reads on dirt and on grass by day. The slanted eyes give him attitude: lilac at (26,17) and (30,17), white at (27,18) and (29,18).
- **The walk differs from the idle at last:** a glide, with the body sheared, the tail streaming and the flames blown back.
- **The most action of the casters:** coil (16), raise (17), a downward smear (18), a crossing slash on the blow (19), a flick (20), recover (21). The tail tip stays on row 38 in every idle and walk frame.

**Doesn't:**
- **Still a monster.**
  - He's a floating wraith whose flame tongues read as bat wings (x 8–20, rows 9–28), with no shoulders and no legs.
  - Beside the knight and ranger he looks like an enemy, not a hero to pick.
  - The blades are 4–5 px: near at (32–36, 29), far at (17–20, 31–35).
- **Too dark.** 73% of pixels are darker than luma 50 (the baseline had 61%) and only 6% are lighter than 150. 27% clear the night grass, so at night only the eyes and the lilac tips remain.
- **The slash merges into the body, and the flames boil.**
  - The lilac smears (f18–19) are the same hue family as the body, so at 1x the slash melts into the violet mass.
  - Every flame edge changes from frame to frame, so the onion skin ghosts all over. That's why alignment is 8.
  - There's doubled ink around the near dagger (22 px per frame).

**Top 3 fixes:**
1. **Make Kael a hero.** This needs the owner's decision: flag it.
   - **Recommended:** a hooded assassin with shoulders, a torso and two legs on the shared rig (soles on row 38) and a short cloak or scarf.
     - Daggers 6 px long and 2 px wide: w edge, G / g body, d / y hilt.
     - The violet flames become an aura trailing off the shoulders and cloak.
   - **If the wraith stays:** a clear head, shoulders and arms, blades twice the size, and fix 2 below.
2. **Value.**
   - Body planes in q / p, with j (#8f5bb0) lit faces on the top-left and #d9a6ff rims. Keep h for the void face and the deepest folds only.
   - At least 15% of pixels lighter than luma 150 (now 6%) and 50% clearing the night grass (now 27%).
3. **Attack readability.** Blade trails in w / G, with only the fading tail in lilac, so the slash separates from the body. A single ink edge around the daggers.

## Necromancer: Morvath, 6.0, NOT YET (the baseline is 3.5)

**Works:**
- **A lich at a glance, and master of his army.**
  - A spiked bone crown with a red gem (x 20–27, rows 10–12).
  - A grey skull face with sunken sockets, eyes at (22,15) and (26,15), and teeth (23–25, 18).
  - A skull staff (the skull at x 11–18, rows 5–10), red runes and a red hem.
  - 35 px with the staff against his skeleton's 20, so the minion no longer out-reads him.
- **Registration:** feet on row 39 everywhere, eye line on row 15.
- **Idle life in the right places:** runes and glyphs brighten (f2–5) and a blood flame rises off the pages (f3–4).

**Doesn't:**
- **The body never acts.**
  - The cast moves the skull 2 px (from (15,7) to (17,5)) and puts a flame on the book (f17–20). There's no lean, no raised arm, no slam.
  - The walk moves the staff 1 px. The robe hem changes 4% of its pixels per frame, the lowest of the team: a robe gliding on rails.
- **A dark box.** The robe is a rectangle (x 15–31, rows 20–38) in m (#3e2731), a (#4b3d44) and h, with 1 px fold lines. 60% of pixels are darker than luma 50, and 26% clear the night grass.
- **Unreadable props, and enemy eyes.**
  - The grimoire is two 3 px cream pages over an R cover (x 29–35, rows 22–26). At 1x it reads as two blocks of bread.
  - The runes are a dashed 1 px red line at x 28, rows 28–36: they read as stitches.
  - The eyes are x (#ff0044), the colour the monsters use for glowing eyes.

**Top 3 fixes:**
1. **Make him act.**
   - **Cast (f16–21):**
     - f16–17: the staff raised high (skull near row 2), the grimoire lifted to the chest, the body leaning back 1–2 px
     - f18: the pages flare
     - f19: the staff driven down and forward (the tip 3+ px forward), the grimoire thrust out with the blood-flame burst, the hem flaring 2 px
     - f20: the flame breaks into 2–3 rising wisps
     - f21: recover.
   - **Walk (f8–15):**
     - the hem kicks 2 px forward with a boot toe (h / m) on alternate steps
     - the staff foot is planted on the contact frames (8, 12) and swung 2 px forward on the passing frames (10, 14).
2. **Form and value in the robe.**
   - Shoulders: a ribbed bone collar or pauldrons in z / T on rows 20–22, x 17–30.
   - A waist at the bone-plaque belt (row 27) and a flared hem (x 13–33 on row 38).
   - Shading: a 3–4 px lit plane in A / a (#7d6a6a / #4b3d44) on the left, m in the middle, h for the shadow on the right.
   - Folds 2 px wide in R (#a22633) and m.
   - Targets: at least 15% of pixels lighter than luma 150, and 50% clearing the night grass.
3. **Readable props, and a hero's eyes.**
   - **The grimoire:** an open book, 8x5 px at chest height (rows 21–25), with T / t pages in a shallow V, a b spine, an R cover edge and 2–3 glyph pixels in x.
   - **The runes:** small glyph shapes on the front panel (an L, a +, an eye, 2x2 to 3x3) in R / r, replacing the dashed line at x 28.
   - **The eyes:** a colour the monsters don't use. Acid green l (#9ee562), his minions' eye colour, would tie him to his army. If red stays, the skull face (Z / z) must be the brightest thing on him.

## Bars for round 2 (they replace the "30 ±1 including headgear" brief)

1. **Scale.**
   - Head top (helm, hood, skull, or the hairline under a hat) on rows 11–13, i.e. 27–29 px above the feet row.
   - The eye line on rows 15–18 for all five. Today the knight, ranger and rogue are on 17–18 and the necromancer on 15; the mage, on 22, fails.
   - Plumes, hat tips, crowns and flame tips may rise up to row 6. Staffs and weapons may go higher.
   - Feet on row 39 in every idle and walk frame (every hero passes this now).
2. **Walk.**
   - **Legged heroes:**
     - the same stride, 10–12 px, at both contacts
     - the passing sole on row 36 or higher (a 2 px lift or more); the planted foot travelling back 1–3 px a frame
     - each hand counter-swinging 2 px or more, with a 1 px bob on the down frames
     - plume, cape, hood, quiver and beard trailing the body by a frame.
   - **Robed heroes:** a hem kick of 2 px or more, a toe showing on alternate steps, and the staff planted on the contact frames.
   - I'll keep reporting upper-body change per walk frame. Today it's 18–25%; the game knight is at 58% and Lyra at 45%.
3. **Idle.** A 1 px breath plus 2 px of secondary motion, trailing the breath by a frame. Not a still.
4. **Attack or cast.**
   - The structure stays: at least 2 frames of anticipation, an impact, a follow-through.
   - The body has to act: a lean of 2 px or more and a weapon or staff arc of 90° or more.
   - The ranger ships with `attackFps`, `attackRelease` and `attackWalk`.
5. **Craft.**
   - Zero doubled ink, and no 1 px alternating stripes.
   - At most 32 colours, islandShare ≤ 0.15, no strays (every hero passes these now).
6. **Value.** At least 15% of pixels lighter than luma 150, and at least 50% clearing the night grass.
   - Passing: the knight (56%) and the mage (54%).
   - Failing: the ranger (47%), the rogue (27%) and the necromancer (26%).
