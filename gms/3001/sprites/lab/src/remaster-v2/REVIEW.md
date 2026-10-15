# Review: remaster-v2

This round uses the same rubric, anchors, strictness and measures as `../BASELINE.md` and `../remaster-v1/REVIEW.md`, so the scores compare across rounds.

**Evidence:**
- `review.mjs` on all six and `--team=remaster-v2`
- `shot.mjs --zoom=closer`, plus shots at the default game zoom beside the game's own heroes and round 1
- a 14-shot burst of the ranger fighting, standing and walking, in the lab's game screen
- gridded zooms, frame diffs and onion skins
- the round-1 measures, re-run unchanged.

Coordinates are (x, y) in the 48x48 frame. The feet row is 39 and the sole row 38.

## Scores

| Hero | 1 Align | 2 Silhouette | 3 Team | 4 Anim | 5 Craft | 6 Palette | 7 Appeal | Overall | Verdict | v1 |
|---|---|---|---|---|---|---|---|---|---|---|
| **knight** | 10 | 9 | 9 | 8 | 8 | 8 | 8 | **8.5** (8.57) | **SHIP** | 7.5 |
| **archer** | 10 | 8 | 9 | 7 | 8 | 7 | 6 | **8.0** (7.86) | ALMOST | 7.0 |
| **mage** | 9 | 9 | 9 | 8 | 8 | 8 | 7 | **8.5** (8.29) | ALMOST | 6.5 |
| **rogue**, assassin (`remaster-v2`) | 10 | 7 | 7 | 8 | 7 | 7 | 7 | **7.5** (7.57) | ALMOST | 5.5 |
| **rogue**, wraith (`remaster-v2-wraith`) | 9 | 6 | 5 | 7 | 7 | 7 | 6 | **6.5** (6.71) | NOT YET | 5.5 |
| **necromancer** | 9 | 8 | 7 | 7 | 7 | 7 | 7 | **7.5** (7.43) | ALMOST | 6.0 |

**Summary:**
- **Real progress on every hero.** The knight ships.
- **Mage:** one criterion short (appeal).
- **Ranger:** three short (animation, palette, appeal).
- **Assassin and necromancer:** a solid round from SHIP.
- **Wraith:** capped by its concept (see "Rogue: which take").

**Scoring conventions:**
- Alignment 10 is given only where a visible gait was verified frame by frame.
- Robed and floating heroes get 9: feet on row 39 and drift are perfect, but there's no gait to check.

## The numbers, checked

The generator's report holds up under its own definitions:
- **`upperChange`** in the JSON matches its table. It uses the union of each frame pair's pixels above a hip at 60% of the height.
- **`inkWall` is 0.** It counts only ink with no colour anywhere in its 8 neighbours, so it catches long walls but not 2 px notches.
- **Night-grass visibility, 51–57%,** matches my own run exactly.

My round-1 measures, re-run unchanged so the rounds compare:

| | walk upper change, v1 → v2 | idle upper change, v1 → v2 | doubled ink px/frame, v1 → v2 | night-grass clear, v1 → v2 | px > luma 150, v1 → v2 |
|---|---|---|---|---|---|
| knight | 23% → **45%** (game knight 58%) | 9% → 13% (game 38%) | 20 → 6 | 56% → 57% | 34% → 36% |
| archer | 20% → **38%** (Lyra 45%) | 9% → 14% (Lyra 13%) | 40 → 7 | 47% → 51% | 21% → 21% |
| mage | 18% → **39%** | 8% → 13% | 47 → 5 | 54% → 56% | 18% → 24% |
| rogue, assassin / wraith | 25% → **50% / 40%** | 15% → 15% / 17% | 22 → 11 / 6 | 27% → 52% / 57% | 6% → 19% / 21% |
| necromancer | 22% → **37%** | 7% → 12% | 24 → 5 | 26% → 53% | 14% → 28% |

- **Doubled ink: fixed.** The few pixels my stricter measure still finds are 2 px notches and corners, not walls along blades and staffs. In the knight's f0 they're the plume–helm corner (x 20–21, row 13) and the ankles ((17–18, 36) and (22–23, 36)).
- **Night-grass: met, but at the edge.**
  - The ink outline alone is 24–34% of every sprite and always counts as dark.
  - Several of the chosen colours clear the night line (35.4) by a hair: the necromancer's robe #aa2a3a at 37, the assassin's #68386c at 36, the ranger's #733e39 at 35.
  - So the numbers are met, but tuned to the test. In the game the hero always stands in his own warm and white light, so the test is pessimistic. That's why I'm relaxing the bar for dark-identity heroes below.
- **Gait: fixed and verified in the pixels.**
  - Knight, ranger and assassin all have the same stride at both contacts: f8 and f12 show soles at x 17–22 and 26–31.
  - The passing sole is on row 35 in f10 and f14.
  - The planted foot travels back 29 → 28 → 25 → 23 → 20 (centre x, f8–12).

## What improved, and what regressed, since round 1

**Improved:**
- **The walks are fixed and live.**
  - No limp, and a 3 px lift.
  - The knight's shield swings x −2 → +2.
  - The mage's staff works as a walking staff: its tip planted on row 38 at x 33–34 (f8, f11–12), the shaft leaning back to x 31–32 with the tip still down (f9, f13), then lifted and swung forward to x 35–36 (f10, f14).
  - The necromancer's hem kicks and his staff plants.
  - Upper-body motion roughly doubled; the walks now sit at Lyra's level.
- **Proportions.**
  - Every eye line is on rows 15–18: knight 17, ranger 17, mage 17, assassin 16–17, wraith 17–18, necromancer 15.
  - The mage's face now reads at 1x (eyes at (23,17) and (26,17) under w brows, a white beard from row 18 to 30), and his robe has shoulders, a waist and a flare.
- **Craft.**
  - No ink walls.
  - The knight's cape folds are broad bands, and his steel has a reflected-light rim on its shadow side.
  - The ranger's string is G, so the bow no longer reads as a loop, and her fletching is three feathers.
  - The mage's robe is cone-shaded with diagonal folds.
- **Attacks act.**
  - The mage swings his staff about 90°, from over the shoulder (f17) to levelled at 45° (f19), and the star has an ember core.
  - The rogue's slash trails are w / G, so they separate from the body.
  - The ranger is wired: `attackFps` 13, `attackRelease` 4 (f20), and 48 `attackWalk` frames. The burst shows full draws and releases while standing and while walking, turning to face targets, with no errors.
- **Value.** All six clear 50% on the night grass and have 19–36% bright pixels.

**Regressed or still weak:**
- **Idles still freeze.**
  - Knight: frames 7, 0, 1 and 2 are identical (0 px changed on 7→0, 0→1 and 1→2). Half his idle is a still, and he had 2 dead transitions in v1.
  - Ranger and necromancer: still 2 dead transitions each (0 px). Mage: nearly the same (5 px).
  - Only the two rogues move on every frame.
- **The darkness is gone.**
  - The necromancer's robe is crimson: he reads as a red cardinal-king, and he is a second red hero next to the scarlet knight.
  - The rogue went lavender (only 48% of the assassin's pixels are darker than luma 50, against 73% in v1). "Shadow" now reads as "purple".
  - Both changes come from my night bar; see the necromancer verdict.
- **The assassin's flame tongues** behind the hood (x 9–18, rows 13–22) read as horns or ears at 1x, so he edges toward an imp.

## Verdicts on the generator's four deliberate departures

1. **Knight idle en garde instead of a raised guard: the reason holds, and the sprite gained from it.**
   - The levelled blade (rows 30–32, x 29–41) runs under the shield.
   - The gold cross (x 32–34, rows 22–25) stays the brightest read.
   - At 1x the stance has more attitude than a raised guard would.
2. **Knight walk swing of 6°→26° instead of 1:5→1:1: the reason holds, at little cost.**
   - The blade never crosses the legs.
   - Upper-body motion is still 45%, carried by the shield (±2), fist (±2), head lag, plume and cape.
   - The sword's own swing is small, but it doesn't read as stiff.
3. **Necromancer crimson instead of ash / maroon / black: the reason holds, but the sprite paid for it.**
   - **The arithmetic is right.** Under the night multiply, a (#4b3d44) reaches 31, m (#3e2731) 22 and h 17, against a line of 35.4. Only A (#7d6a6a) clears, at 52. My bar can't be met by a dark robe; the bar was too blunt, not the generator.
   - **The cost:**
     - The near-black necromancer (the game's original "Blood Lich") became a crimson cardinal.
     - He shares red with the knight.
     - The robe body (#aa2a3a, night luma 37) was chosen to clear the line by 1.6.
   - **The bar changes:** see "Bars for round 3". Then he can darken again (fix 2).
4. **Sorcerer's gold trims and ember core: the reason holds, and it's an improvement.** Gold (y) on blue reads at 1x, warms an all-cool palette and ties him to his fireballs. The orange core (Y / o) inside the frost star (f19–20) is visible and doesn't muddy it.

## Knight: Sir Aldric, 8.5, SHIP (v1: 7.5)

**How far from SHIP:** it ships. What's left is polish, and nothing structural limits it.

**Works:**
- **Alignment.** Feet on row 39 everywhere, the same stride on f8 and f12, a 3 px lift, the planted foot travelling back 2–3 px a frame, drift 0.16 / 1.24.
- **Silhouette.** A taller arched plume (to row 7), the shield raised with its cross, and a levelled longsword. 57% night-clear, 36% bright.
- **Rendering.** A five-step steel ramp with reflected light (g) on the shadow side. Cape folds as broad bands fanning from the shoulder. A three-tone plume ribbon. A 2 px blade with a single ink edge.
- **Attack.** Raise (16), cock (17), overhead smear (18), crescent blow with lunge (19), follow-through (20), recover to en garde (21).
- **Appeal.** He beats the game's knight: en garde with real attitude, no cute face.

**Top 3 fixes (polish):**
1. **No dead idle frames.** Keep the breath on f3–5, but run the plume tail and cape hem as a continuous wave (±1 px, one frame behind the breath), so every transition changes 20 px or more. Today f7, f0, f1 and f2 are identical.
2. **Ink notches.** Replace the inner ink pixel at the plume–helm corner (x 20–21, row 13) with R, and at the ankles ((18,36) and (22,36)) with N.
3. **Thin raised blade.** In f16–17 the 2 px blade is thin against the plume. Add a 1 px w edge, plus a 2–3 px motion streak (G) behind the cocked blade in f17, so the anticipation reads at 1x.

## Archer: Lyra, 8.0, ALMOST (v1: 7.0)

**How far from SHIP:** three criteria short (animation 7, palette 7, appeal 6).
- Animation and palette are a round of work.
- Appeal is the real gap. Her design is a big green hood and cloak over a small figure, holding the bow upright like a staff, and that reads as a cute Robin Hood. Getting to 8 needs a pose and proportion change, not more frames. Likely 1–2 rounds; the canvas isn't the limit.

**Works:**
- The same verified gait as the knight. The grip moves ±1 against the stride, the near hand swings ±3, and the head and quiver lag a frame.
- The bow is fixed: limbs t / T with b tips, a 1 px G string, a 12° tilt.
- Three-feather fletching (x 10–17, rows 9–12).
- Legs in b / m with a lit B edge.
- Wired for the game, and it plays.

**Doesn't:**
- **Idle.** Dead transitions on f7→f0 and f0→f1 (0 px).
- **Release.** No recoil (f20): the bow and body don't react.
- **Draw.** The full draw still makes a diamond of bow and string (f18–19).
- **Night margin.** Thin: #733e39 sits at 35 against a line of 35.4, and E (#265c42) falls just under it.

**Top 3 fixes:**
1. **A hunter's stance (appeal).**
   - The bow low and diagonal: grip near (32,28), top limb tipped 25–30° forward.
   - The near hand on the string, or drawing an arrow from the quiver.
   - Feet 2 px wider in the idle (soles at x 17–21 and 28–32).
   - The chin up 1 px and a lid line over the eye, so she looks ready, not posed.
2. **Animation.**
   - No dead idle frames: the hood tip, cloak hem and fletching on a continuous 8-frame wave.
   - A release with recoil: on f20 the bow hand kicks forward 1–2 px, the limbs snap, the draw hand flies 3 px past the cheek and the body rocks back 1 px; f21 settles.
3. **Value with margin.**
   - Lighter leather (t #e4a672) on the bracers and belt.
   - A 1 px l (#9ee562) rim on the hood's top-left edge.
   - The cloak's darkest fold in e rather than E.
   - Aim for 55% night-clear or more, not 51%.

## Mage: Eldrin, 8.5, ALMOST (v1: 6.5)

**How far from SHIP:** one criterion (appeal 7). One round should do it; nothing structural.

**Works:**
- Iconic at 1x: a tall bent hat with a gold band (row 12), a face with eyes and white brows, a white beard from row 18 to 30, and a bell robe with gold trim.
- 56% night-clear and 24% bright.
- The walking-staff cycle (above).
- A real cast: drawn back over the shoulder, a ~90° swing and lean, a frost star with an ember core, a fade.
- Clean craft: 21 colours, islandShare 0.089 (the team's lowest), a single ink column on the staff.

**Doesn't:**
- **Appeal.** He's a friendly grandfather. The pose is upright, with the staff held straight at his side and the near arm a hanging sleeve.
- **Idle.** Near-dead transitions (5 px) on f7→f0 and f0→f1.

**Top 3 fixes:**
1. **A commanding idle (appeal).**
   - The staff planted forward at a slight angle: foot near x 34, orb near x 37.
   - The free hand raised to chest height, holding a 2–3 px ember or frost wisp (Y / c, emissive) that pulses through the idle.
   - Brows angled down at their inner ends, one row lower at (23,16) and (26,16): a scowl.
2. **No dead idle frames.** The beard tip, hat tip and hem on a continuous ±1 px wave, with the orb glinting on every frame.
3. **The near sleeve.** Give the near hand something to do outside the cast: holding the robe's edge or a small tome at the waist, with a 2–3 px skin hand and a G / y cuff.

## Rogue: Kael, the assassin, 7.5, ALMOST (v1: 5.5)

**How far from SHIP:** five criteria at 7. Likely two rounds.
- The limit is a tension, not the canvas: "Shadow" against my night bar, which pushed him to lavender.
- With the relaxed bar below, he can go darker and still read.

**Works:**
- A person at 1x: a pointed hood, a mask with slanted white eyes (rows 16–17), two legs on the team's verified gait, two daggers (w edge, G body, y guard), a magenta scarf.
- The most alive sprite of the round: walk upper change 50%, and every idle transition moves (11–216 px).
- The attack separates from the body: coil (16–17), downward slash (18), a crossing slash on the blow with a 2–3 px lunge (19), follow-through, recover.

**Doesn't:**
- The flame tongues behind the hood (x 9–18, rows 13–22) read as horns or ears, so he looks like an imp.
- Spindly 2–3 px legs and a crouch.
- The lavender body (p / j / #b57fd9) loses the "Shadow" read.
- The most leftover notches of the round (11 per frame, around the scarf and waist at (15–18, 27)).

**Top 3 fixes:**
1. **Head silhouette.**
   - Take the aura off the head: flames only from the scarf's tail and the back edge of the shoulders, none above row 14.
   - Give the hood one clean point, hooked forward at about (27,10).
2. **Build.** Thighs 4 px wide, shins 3 px, and the stance raised 1–2 px (head top from row 10 to 9), so he carries the knight and ranger's mass. Dark boots (h) with a light knee guard (j).
3. **Shadow value, under the new bar (≥ 40% night-clear, ≥ 15% bright).**
   - Mains in q / p, j only on lit planes, a 1 px #d9a6ff rim on the top-left.
   - The white eyes, blades and the magenta scarf as the accents.
   - Clean up the waist and scarf notches.

## Rogue: Kael, the wraith, 6.5, NOT YET (v1: 5.5)

**How far from SHIP:** far, and it's structural. A floating wraith can't share the team's anatomy (team 5), and among the night's ghosts and undead it reads as an enemy. Further rounds would polish it to around 7. Under this rubric it won't ship unless the owner wants a wraith and the team criterion is judged on that basis.

**Works:**
- Coherent fire: a crown of teardrop tongues, dark at the root and lilac at the tips.
- "\ /" eyes, and bigger blades.
- 57% night-clear, a smooth glide (drift 0.23), and every idle transition moves.

**Doesn't:**
- The six tongues rise to row 6 and read as a spiky crest.
- The arms trail, so he reads as a drifting ghost rather than a fighter.

**Top 3 fixes (if chosen):**
1. **A fighter's frame.** Shoulders and arms 3 px wide, with the daggers held forward at chest height, not trailing.
2. **A smaller flame crown.** Three shorter tongues leaning back, reaching row 9 at the highest, and let the tail wisps carry the motion.
3. **The assassin's value fix** (above).

## Necromancer: Morvath, 7.5, ALMOST (v1: 6.0)

**How far from SHIP:** four criteria at 7: team, animation, craft, palette (appeal is also 7).
- The palette was a structural limit, and the cause was my bar. With the bar relaxed, two rounds should get him there.

**Works:**
- A lich at a glance: a bone crown, a skull face with green eyes (his skeletons' colour) at (22,15) and (27,15), and a skull staff with green eyes.
- Ribbed bone pauldrons (rows 20–23), runes as glyphs on a bone panel, an 8x5 grimoire.
- The cast has a structure: staff raised (f16–17), pages flaring (18), a burst on the blow (19), three wisps (20).
- The walk kicks the hem and plants the staff.

**Doesn't:**
- **The cast's body.** The staff tips only about 25° and the body leans about 1 px: the blow is the book's burst alone.
- **Idle.** Dead transitions on f7→f0 and f0→f1 (0 px).
- **The skull face** is a flat grey block (x 20–29, rows 10–19).
- **Two reds.** The crimson makes a second red hero.

**Top 3 fixes:**
1. **Body in the cast.**
   - f16–17: lean back 1–2 px (shoulders x −1 / −2) with the book lifted to row 18.
   - f19: drive the staff through 45° or more (skull from about (14,3) to (24,6)), lean in 2 px, kick the hem 2 px.
   - Keep the burst.
2. **Blood-black, under the new bar.**
   - The robe from row 30 down in m / h (#3e2731 / #2a1f2d), with R (#a22633) folds.
   - Crimson (#aa2a3a / r) only on the upper robe and lit planes, plus a 1 px r rim on the top-left.
   - Bone (panel, pauldrons, skull) carries the light. Runes in r / x, emissive.
   - Target 40% night-clear or more and 20% bright or more.
   - This restores his darkness and separates him from the knight's scarlet.
3. **The face, and the idle.**
   - Model the skull: a lit brow and cheekbone in z / Z on the top-left, sockets in h around the green eyes, a hollow cheek and jaw in Q / W on the right, a 1 px tooth row.
   - No dead idle frames: the pages' glow and the staff's eye glow pulse on a continuous cycle.

## Rogue: which take (a recommendation; the owner decides)

**I recommend the assassin** (`rogue/remaster-v2`):
- **He reads as a playable person.** At the game's scale he's a hood, two legs and two daggers. The wraith reads as one of the night's ghosts, which is the wrong signal for the hero the player has to find in a crowd of undead.
- **He shares the team's rig and proportions.** The wraith's team score of 5 can't rise without changing what it is.
- **His kit fits.** Shadowstep, crit and "Shadow Dance: vanish while blades fly" suit an assassin.
- **He has a path to SHIP:** 7.5 now, two rounds of fixes. The wraith is capped around 7.

**The case for the wraith:** a more unusual silhouette, and continuity with the wraith the game shows today.

## Bars for round 3 (changes from round 2 only)

1. **Night-grass, relaxed for dark-identity heroes.**
   - Default: 50% or more.
   - The necromancer and rogue may go down to 40%, provided at least 20% of their pixels are lighter than luma 150 and the top-left rim of the silhouette is lit.
   - Don't tune colours to sit within 2 luma of the line.
2. **No dead idle frames.** Every idle transition changes at least 20 px: secondary motion keeps going while the breath holds.
3. **Robed casts.** A 45° or wider staff arc and a lean of 2 px or more on the blow, as the mage already has.
4. **Everything else stays as in round 2.** Every hero meets it now:
   - scale and eye line
   - gait
   - zero ink walls
   - colour count and islandShare
