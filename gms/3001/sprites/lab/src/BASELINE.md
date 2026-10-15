# Baseline: the five heroes the game draws now

This is the reviewer's calibration on the sprites in the game today (2026-10-13). Every remaster round gets scored against it.
Evidence comes from `node gms/3001/tools/review.mjs <cls>/game` (boards and JSON in `sprites/lab/review/`), `node gms/3001/tools/shot.mjs <cls>/game --zoom=closer` (in-game stand, walk and fight shots), and gridded zooms of every frame.
Coordinates are (x, y) in the built frame's own pixels. The casters get a 1 px auto-outline, so their source rows in `public/js/art/heroes.js` are x−1, y−1.

## Scores

| Hero | 1 Align | 2 Silhouette | 3 Team | 4 Anim | 5 Craft | 6 Palette | 7 Appeal | Overall | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| **knight/game**: Sir Aldric (Mattz Art pack, lab recolour "tweak 2") | 9 | 8 | 6 | 8 | 6 | 7 | 7 | **7.5** (7.29) | ALMOST |
| **archer/game**: Lyra (the "verdant" ranger) | 9 | 7 | 7 | 7 | 7 | 6 | 6 | **7.0** (7.00) | ALMOST |
| **mage/game**: Eldrin | 4 | 6 | 4 | 3 | 5 | 5 | 4 | **4.5** (4.43) | NOT YET |
| **rogue/game**: Kael | 3 | 3 | 3 | 3 | 4 | 3 | 4 | **3.5** (3.29) | NOT YET |
| **necromancer/game**: Morvath | 4 | 4 | 4 | 3 | 4 | 3 | 4 | **3.5** (3.71) | NOT YET |

## Measurements: the numbers each round is compared against

| | height | idle / walk / attack frames | feet vs row anchorY−1 | idle / walk drift | colours | islandShare | outline dark | px > luma 150 | px clear of night grass |
|---|---|---|---|---|---|---|---|---|---|
| knight | 30 | 7 / 8 / 6 | on it, every frame | 1.04 / 1.87 | **336** | **0.28** | **73%** | 16% | **56%** |
| archer | 32 | 8 / 8 / 8 (+64 shoot-while-walking) | on it, every frame | 0.35 / 0.73 | 23 | 0.18 | 79% | 15% | 36% |
| mage | **24** | **1** / 4 / – | 1 row low (on the anchor row) | 0 / 0.12 | 15 | 0.15 | 100% | 18% | 32% |
| rogue | **23** | 4 / same 4 / – | hovers 1–2 rows up, jumps 21↔22 | 0.84 / 0.84 | 9 | 0.26 | 100% | **4%** | **12%** |
| necromancer | **22** | **1** / 4 / – | 1 row low (on the anchor row) | 0 / 0.04 | 11 | 0.13 | 100% | 6% | 19% |

"Clear of night grass" is the share of idle-frame pixels that stay 20+ luma brighter than the forest grass (#172425, sampled from the walk shot) under the board's night multiply. It's pessimistic, because in the game the hero carries a warm and a white light and emissive keys draw unlit. Still, the in-game shots on grass rank the five the same way. I'll report it every round.

## Per hero

### Knight: Sir Aldric, 7.5, ALMOST
- **Works:** the most complete sprite in the game, and the bar for animation.
  - Idle breathes smoothly: the helmet top goes rows 20→22→20 over f0–6, under a flowing cape.
  - The walk lifts the passing foot (f7, f8, f11, f12) and dips 1 px on f10 and f14.
  - The attack has a two-frame wind-up (f16–17, blade behind the head), a 44 px smear (f18, x 14–57), a follow-through (f19) and a recovery (f20).
  - Feet sit on row 46 in all 21 frames. Scarlet plume and cape over a white blade read at 1x by day and at night (56%, best of the five).
- **The recolour damaged the pixels.** The game uses the lab recolour of a 20-colour pack sprite (`public/assets/knight-plumed/data.js`). The original is clean (outline 82%, islandShare 0.18). The recolour has:
  - 336 colours, 256 of them used fewer than 4 times across 21 frames, and 1737 near-duplicate pairs
  - 152 near-black variants where the original had 2
  - 4.1% of pixels that differ from every neighbour by less than 14 RGB (invisible noise)
  - the outline down to 73% dark.
- **The face reads as a beak.** The skin was #e69c69/#f6ca9f; it is now #ff8934 at (42,25), (42–43,26) and (42,27), between two #006ee0 eye pixels at (41,25) and (43,25). At 1x that reads as a chick's orange beak: cute, not badass.
- **The kit doesn't read.** The shield (x 45–49, rows 30–40) is maroon on near-black and melts into the outline. In walk f7, f13 and f14 the white blade lies across the legs (rows 40–45) and muddles the stride, and f8–11 raise the sword forward like a salute.
- **The feet skate.** In the contact frames both feet hold still: back foot x 33–35, front x 43–46 across f9→f10 and f13→f14, so they slide along the ground with the body. The attack only plays on crypt strikes.

### Archer: Lyra, 7.0, ALMOST
- **Works:** the cleanest craft in the game, and the bar for legs.
  - 23 colours, no near-duplicates, no stray pixels. Hue-shifted ramps (#263c36→#365b42→#5c8b51→#95b969→#d0d992) lit from the top-left.
  - The planted ankle travels back 29→27→24→21→18 over walk f8–12 and the passing foot lifts 3–4 px, so nothing skates.
  - Feet sit on row 39 in all 88 frames.
  - The draw plays in sync with the real bow, even while walking: f17 nocks, f19–20 reach full draw (pull 9–10 px), f21 releases with a snap.
- **She's camouflaged.** Her main masses are the forest's own colours: hood and cloak #365b42/#5c8b51, tunic #624337, with 47% of pixels darker than luma 50. In the walk and fight shots on grass, only the bow and fletching read. Only 36% of her pixels clear the night grass.
- **The upper body is frozen.**
  - The idle is just a 1 px bob and a 1 px cloak sway.
  - The bow arm is held out level (forearm rows 24–25, x 28–36) in both idle and walk, so she always looks mid-aim.
  - The walk has no arm counter-swing, and the shot has no recoil.
- **She's too tall.** At 32 px (hood top row 8) her head sits about 4 px above the knight's helmet, making the ranger the tallest hero. The line()/poly() construction also gives a lumpy 3 px-outlined bow and 5 px-outlined legs at 4x.

### Mage: Eldrin, 4.5, NOT YET
- **Works:** reads as "wizard" instantly from the pointy hat, the white beard (rows 9–13) and the emissive orb staff (orb x 15–17, rows 2–4). The #0099db blue survives the night better than any other caster. Clean 15-colour palette.js ramp, lit from the top-left, outline 100%.
- **Too small, and not grounded.**
  - 24 px tall, 80% of the knight.
  - His lowest row is 23, which is anchorY itself: one row below the knight and ranger.
  - Without `selfBob`, the engine lifts the whole sprite 1 px for about 30% of the idle time (`game.js:1582`), so the feet leave the ground.
  - The staff ends on row 21 when idle but row 22 in walk f1/f3, so it floats when he stands.
- **The animation is a placeholder.** The idle is a single frame, and the walk is two poses:
  - f1/f3: body down 1 px, hem flared, feet apart
  - f2/f4: body up, feet together.

  f1→f3 and f2→f4 differ only in the foot pixels on row 22 swapping colour. The hat, beard and staff never move, and there is no cast.
- **Banding and a blank face.** The hat ramp K/u/U runs as parallel diagonal stripes (rows 1–5). The robe runs as vertical stripes (U x 7, G x 10, K x 13, rows 13–17). The face is a flat band whose only feature is one ink pixel at (11,8). The feet (m/h/b on row 22) are near-black against the outline.
- **The design contradicts the kit.** He is a frost archmage (ice orb, blue), but his kit throws fire (Fireball, Cataclysm meteors). He reads as a stock blue Gandalf chibi: friendly, not formidable.

### Rogue: Kael, 3.5, NOT YET
- **Works:** a striking idea. A shadow with black flames and angry slanted eyes (G at (9,8), (13,8), (10,9), (12,9)), and the flame flicker gives the idle real life.
- **It reads as a wraith enemy, not a hero.**
  - No legs and no shoulders; a tail instead of feet.
  - The daggers are 1 px wide: left at x 4, rows 15–17; right on row 14, x 16–18.
  - The tail's lowest pixel jumps between rows 22 and 21 with anchorY 24, so it hovers and jitters, and the engine hop adds 1 px more.
- **Almost no value contrast.** The body is two flat greys (W #44444e lit, V #2c2c34 shade): 61% of pixels are darker than luma 50 and only 4% are above 150. Only 12% clear the night grass (the worst of the five), so at night just the eyes remain. The emissive key p (#68386c) is too dark to glow.
- **No locomotion.** Idle and walk share the same 4 frames, so walking looks no different from standing. Every edge pixel is redrawn each frame, so the outline boils and the onion skin ghosts everywhere. There's no attack, and the blades never move.
- **Noisy contour.** 26% speckle, from lone flame pixels (p/q) that each get wrapped in outline.

### Necromancer: Morvath, 3.5, NOT YET
- **Works:** reads as a lich by day: a bone crown (rows 1–3), red eyes at (10,5) and (12,5), and a grimoire held out (x 15–18, rows 10–12).
- **He's the smallest hero, and his minion out-reads him.** At 22 px he is 73% of the knight. His lowest row is the anchor row and he gets the engine hop. His skeleton minion is 20 px tall to his 22, and 54% of its pixels are bright (luma > 150) against his 6% (stand shot).
- **Too dark, and he looks like a monster.** Near-black violet (h #2a1f2d, q #3b2346) makes 73% of his pixels darker than luma 50, and only 19% clear the night grass. His glowing eyes use x (#ff0044), the colour the monsters use for glowing eyes, so he reads as an enemy.
- **Crude shapes.**
  - The robe is a rectangle (x 6–13, rows 10–20) with no shoulders.
  - The hood covers only the left half of the head (h at x 7–8, rows 4–9), so the head looks lopsided.
  - The "runes" are single R pixels at (10,11), (12,12), (9,14) and (11,15) that read as specks.
  - The feet are pure ink.
- **The animation is the mage's placeholder scheme:** a 1-frame idle, a 2-pose bounce walk, no cast, and a book that never moves.

## What the remasters must beat

1. **Height and feet, for all five.**
   - **Height:** the knight is the scale. His helmet top sits 28 px above his feet row, and the plume takes him to 30, the cyan line.
     - Head, helmet or hood top: 27–29 px above the feet row.
     - Plume, hat tip, crown, flame or fletching: may rise above the head, up to 34 px in total.
     - The casters are 22–24 px now (73–80%), and that is the most visible flaw of the team.
   - **Feet:** on row anchorY−1 in every idle and walk frame (`feetOff` 0, `feetSpread` 0).
   - **Drift:** idle ≤ 1 px, walk ≤ 2 px.
   - **Breathing:** set `selfBob: true` and draw the breath into the frames, so the engine hop never lifts the feet.
2. **The animation budget: the knight's frame counts with Lyra's legs.**
   - **Idle:** at least 6 frames, with a 1–2 px breath and secondary motion (cape, hem, beard, hair, flame). Never a single frame, and never only a 1 px bob.
   - **Walk:** 8 frames of contact, down, passing and up, twice, with the passing foot lifted at least 2 px.
     - The planted foot travels back 2–3 px a frame, like Lyra's ankles (29→27→24→21→18).
     - Arms or weapon counter-swing, and the body dips 1 px on the down frames.
   - **Attack or cast:** 6–8 frames, with feet planted throughout:
     - at least 2 frames of anticipation
     - an impact frame with a smear or flash
     - at least 2 frames of follow-through and recovery.

   The casters have none of this today. Only Lyra's attack plays in the forest, but the rubric scores a cast for every hero, and wiring it into the game can come later.
3. **Craft: Lyra's discipline, not the knight's recolour.**
   - At most 32 colours per hero (Lyra uses 23), taken from `palette.js` keys or a declared ramp.
   - One outline colour (ink k #181425), or a deliberate per-material sel-out.
   - 0 near-duplicate colours, 0 stray pixels, islandShare ≤ 0.15, outline ≥ 85% dark.
   - No banding (a ramp laid down as parallel stripes), and no single-pixel "details" that aren't a highlight, an eye or a glint.
4. **Reads on grass and at night.**
   - A light mass of at least 15% of pixels above luma 150: steel, bone, pale cloth, a beard or a glow.
   - At least 50% of pixels clear of the night grass. The knight manages 56%; Lyra 36, Eldrin 32, Morvath 19 and Kael 12.
   - Judge it on the grass, not only on the dirt crossroads.
5. **Class from the silhouette alone, and heroes that don't look like monsters.**
   - Knight: plume, a shield that actually reads, and the sword.
   - Ranger: bow, quiver and hood.
   - Mage: hat, and a staff or orb.
   - Rogue: a hooded person with legs and two daggers whose blades are at least 2 px wide, not a ghost.
   - Necromancer: crown or hood, grimoire or staff, and clearly bigger and brighter than his skeleton.
   - No hero's main read should be the monsters' glowing hot-red eyes (x #ff0044).
6. **One dominant hue per class, and never the forest's green or brown as the main mass.**
   - Knight: scarlet and silver. That was the owner's pick, so keep it, but give him real skin, not #ff8934.
   - Ranger: keep the green, but add a pale or warm accent that lifts her off the grass.
   - Mage: blue is fine, but his kit throws fire, so tie them together with ember or gold accents.
   - Rogue: violet as a real hue, not grey.
   - Necromancer: bone and blood red, or the minions' acid green (#9ee562), but not near-black violet.
7. **Appeal: the knight's plume, cape and smear are the floor for all five.**
   - Heroic proportions: broad shoulders, the weapon presented, a slight forward lean.
   - Faces that read at 1x: two eye pixels and a mass of skin or shadow. No beak, and no one-pixel face.
   - A hero the player wants to pick, not a mascot.
