# Remaster V3: the five heroes, round 3

Five entries, all `collection: 'Remasters'`, each `lab:<class>/remaster-v3`:
- knight, archer, mage, rogue (the assassin only), necromancer.
- The wraith was not carried forward (the review recommended the assassin). `rogue/remaster-v2-wraith` is untouched.

Build all five with:
`node gms/3001/tools/build.mjs gms/3001/sprites/lab/src/remaster-v3/{knight,archer,mage,rogue,necromancer}.js`

| | build line | verdict |
|---|---|---|
| knight | 33 px tall · 22 frames (idle 8, walk 8, attack 6) · 14 colours · outline 100% | lines up cleanly |
| archer | 32 px tall · 70 frames (idle 8, walk 8, attack 6) · 17 colours · outline 100% | lines up cleanly |
| mage | 37 px tall · 22 frames (idle 8, walk 8, attack 6) · 22 colours · outline 100% | lines up cleanly |
| rogue | 31 px tall · 22 frames (idle 8, walk 8, attack 6) · 13 colours · outline 100% | lines up cleanly |
| necromancer | 37 px tall · 22 frames (idle 8, walk 8, attack 6) · 18 colours · outline 100% | lines up cleanly |

**Evidence** (all in `gms/3001/sprites/lab/review/`):
- `review.mjs` boards: `<class>-remaster-v3.png`, and `team-remaster-v3.png`.
- `shot.mjs --zoom=closer`: `<class>-remaster-v3-{stand,walk,fight}.png`.
- For the ranger, a 22-shot burst of her fighting in the lab's game screen, standing and walking right. It shows draws, releases and recoil, turning to face targets both ways, with no errors.

## What changed in the kit

`kit.js` is round 2's kit plus one helper, `softenNotches(pic, dark, keep)`:
- It finds inner ink (ink with no clear neighbour) touching the silhouette's ink, which makes a 2-px dark wedge.
- It recolours that pixel to the darkest neighbouring colour from `dark`.
- It skips any pixel whose removal would strand an outline pixel.

How each hero uses it:
- **Knight:** with his steel and red.
- **Archer:** her cloak greens anywhere; her leather only at the boots (rows 34 and down).
- **Mage:** his robe blues only.
- **Necromancer:** his robe colours only.
- **Why the lists are restricted:** a staff or bow passing close to the body leaves a 2-px ink gap. Filling that gap with the staff's or bow's colour puts a bump on the staff or bow, so those colours are left out.

The assassin uses local helpers in `rogue.js`:
- `rimTopLeft`: a moonlight rim on the cloth's top-left silhouette.
- `smoothNotches`: like `softenNotches`, but it lets the outline continue through a diagonal step rather than keeping the doubled corner.
- `scarf`.
- `lick`: hand-drawn flame, in four flicker phases.

## Measurements

My scratch tools, run on the modules. Value shares are on idle frame 0; the means over the idle match within 1%.
- **Night-clear** uses the review's test: night luma at least the night grass + 20 (35.4).
- **Bracketed night-clear** counts only colours at least 2 luma over that line.
- **Notches** is my count of inner ink touching the outline, so it measures about twice what the review's "doubled ink" finds. Compare the two rounds by the change.

| | colours | islands | ink walls | notches/frame, v2 → v3 | > luma 150 | night-clear (≥ 2 over) | < luma 50 | upper change idle / walk | idle transitions, px (min) | drift idle / walk |
|---|---|---|---|---|---|---|---|---|---|---|
| knight | 14 | 0.114 | 0 | 12.9 → 6.2 | 36% | 58% (58%) | 30% | 22% / 60% | 38 62 389 61 69 418 80 64 (38) | 0.49 / 1.24 |
| archer | 17 | 0.119 | 0 | 15.4 → 12.3 | 26% | 56% (56%) | 40% | 23% / 49% | 59 56 299 107 30 297 134 52 (30) | 0.35 / 0.59 |
| mage | 22 | 0.096 | 0 | 9.0 → 7.0 | 23% | 55% (55%) | 30% | 20% / 57% | 34 40 282 34 57 263 40 38 (34) | 0.24 / 1.25 |
| rogue (assassin) | 13 | 0.109 | 0 | 14.4 → 1.9 | 21% | 43% (43%) | 57% | 28% / 66% | 47 54 203 172 49 190 194 39 (39) | 0.37 / 1.18 |
| necromancer | 18 | 0.101 | 0 | 8.6 → 7.6 | 27% | 43% (42%) | 43% | 33% / 54% | 194 46 423 46 191 265 183 46 (46) | 0.77 / 1.36 |

Round 2, for comparison:
- Idle transitions had minimums of 0 (knight, ranger, necromancer), 5 (mage) and 11 (assassin).
- The assassin was 48% darker than luma 50, the necromancer 38%.

**Frames and borders:**
- Feet are on row 39 in every idle and walk frame.
- No frame touches the canvas border or goes below row 39.
- Walk minimum transitions: 229 px or more.

## Bars for round 3

1. **Night-grass, relaxed for the dark heroes: met, with margin.**
   - **Dark heroes:**
     - Assassin: 43% night-clear, 21% brighter than luma 150, and a lilac rim on every top-left silhouette edge.
     - Necromancer: 43%, 27%, and a 1 px r rim on the robe's top-left.
   - **The others:** knight 58%, ranger 56%, mage 55%.
   - **No colour is tuned to the line.** Fixes:
     - Assassin: p is #6f3d78 (4.0 over the line) rather than the master's #68386c (0.9 over).
     - Ranger, mage and necromancer: the master b (#733e39, 0.08 over) is replaced by #7d4540 (3.75 over).
     - Necromancer: '2' is #b52f40 (4.8 over) rather than #aa2a3a (1.66 over).
   - **The one colour left within 2 luma of the line:** the necromancer's hot rune red x (master #ff0044, 1.75 over). It's an emissive accent on 0.6% of his pixels.
2. **No dead idle frames: met.**
   - Every idle transition changes 30 px or more.
   - Minimums: knight 38, ranger 30, mage 34, assassin 39, necromancer 46.
3. **Robed casts: met.**
   - Necromancer:
     - The staff swings 60°, from −112° at f17 to −52° at f19.
     - Its skull travels from (9,7) to (30,10).
     - The lean goes from −2 to +2, and the hem kicks 2 px.
   - Mage: unchanged from round 2 (~90° and a lean).
4. **Everything else holds:**
   - Eye lines on rows 15–17.
   - The shared gait.
   - Zero ink walls.
   - Islands ≤ 0.119.

## Checklist: every fix in ../remaster-v2/REVIEW.md

### Knight (SHIP; polish only)
1. **No dead idle frames.** Done.
   - Breath on f3–5, as before.
   - The plume's tail sways 0 → −2 → 0 px over the cycle and lifts on f4–6.
   - The cape's hem waves on every frame (`capeWave = i`) and trails 0–2 px.
   - The sword dips 6° → 3° → 6°.
   - Result: f7→f0 is 64 px, f0→f1 38, f1→f2 62 (round 2: 0, 0, 0).
2. **Ink notches.** Done.
   - Plume–helm corner (21,13): now R. (20,13) is a plain outline pixel against clear.
   - Ankles: (18,36) is N and (22,36) is steel g. This comes from `softenNotches` over his steel and red, plus a forced fix on the standing frames.
   - Notches: 12.9 → 6.2 per frame.
3. **Thin raised blade.** Done.
   - f16–17 draw the blade 3 px wide (w edge, w, G).
   - f17 adds short G motion streaks behind the cocked blade.
- **Kept as it was:** the en garde stance, plume, cape folds, shield, gait and crescent slash.

### Ranger
1. **A hunter's stance.** Done.
   - The bow is low and diagonal: grip at (32,28), turned 28° with the top limb forward (it rocks 27–30° through the idle).
   - An arrow is nocked, with her near hand on the string at (27,27).
   - Feet wide: soles at x 17–21 and 28–32.
   - The chin is raised 1 px, with a lid line over the eye on row 16.
2. **Animation.** Done.
   - **Idle:** the hood tip, cloak hem and quiver/fletching run on continuous waves (minimum transition 30 px).
   - **Release with recoil:**
     - f20: the grip kicks forward 2 px ((35,23) → (37,23)).
     - The limbs snap past straight (flex −0.4).
     - The string hand flies to (19,20): 4 px back and 3 px up, past the cheek.
     - The body rocks back 1 px.
     - f21 settles.
   - **Game wiring kept:** `attackFps` 13, `attackRelease` 4, `attackWalk` 6 × 8 frames (22–69). Checked in the catalogue and in the burst.
3. **Value with margin.** Done.
   - t on the bracers and belt.
   - A 1 px l rim on the hood's top-left.
   - The cloak's darkest fold in e.
   - b lifted off the night line (see the bars).
   - Night-clear 56%, every pixel of it at least 2 luma over the line (round 2: 51%, 7 points of it at 0.08 over).

### Mage
1. **A commanding idle.** Done.
   - **The staff** is planted forward and leaning: foot at (34,38), orb at x 37.
   - **The free hand** is raised to chest height (hand at (13,22)) with a gold cuff. It holds a pulsing ember of 3–4 px in four shapes.
   - **The ember's colours:** pale flame f and orange o, both emissive. f was added so the gold trim doesn't glow too. The cast's core uses them as well.
   - **The scowl:** the brows' inner ends are a row lower, at (23,16) and (26,16).
2. **No dead idle frames.** Done.
   - The beard tip, hat tip and hem's back move ±1 px on staggered frames.
   - The ember changes shape and a glint circles the orb, a step on every frame.
   - Minimum transition 34 px (round 2: 5).
3. **The near hand outside the cast.** Done.
   - **Walk:** it carries a small tome at the waist (B/b/y), with a skin hand and a y cuff.
   - **Idle:** it holds the ember.

### Rogue: the assassin
1. **Head silhouette.** Done.
   - **Fire:** none near the head. The only fire is a hand-drawn lick of violet flame where the scarf's tail burns out (four flicker phases). Its highest pixel is row 15 in every frame.
   - **No shoulder flames.** The review allowed flames off the shoulders' back edge. At this size they read as ears again, so I left them out.
   - **The hood** has one clean point: its top runs x 24–27 on row 10, hooked forward to (28,11).
2. **Build.** Done.
   - Thighs 4 px, shins 3 px.
   - The hip is raised to row 29, so the head top goes from row 10 to row 9.
   - Boots in h with a lit edge.
   - Knee guards: lilac over violet on the near leg (9/V), violet over lavender on the far one (V/j).
   - The shoulders are broader (x 16–28), and the eyes are on rows 15–16.
3. **Shadow value.** Done.
   - **Mains in q/p.** j only on lit planes: the hood's crown, the chest's upper-left, and the near arm's V edge.
   - **The rim:** a 1 px #d9a6ff rim on every top-left silhouette edge above the hips, and a lit step on the legs.
   - **Accents:**
     - The eyes, now "\ /" diagonal slits in bone white z (emissive).
     - The blades, 9 px at 2:1 slopes.
     - The magenta scarf, with its lit edge I and a magenta collar that separates head from shoulders.
   - **Darkness:** 57% darker than luma 50 (v1 73%, v2 48%), 21% bright, 43% night-clear.
   - **Waist and scarf notches cleaned up:**
     - The collar now reaches the chin.
     - A seat row under the hips leads into the thighs.
     - The scarf's root is thicker where it leaves the back.
     - `smoothNotches` handles the rest.
     - Result: 14.4 → 1.9 per frame.
   - **Idle:** every transition moves at least 39 px (round 2: 11). The scarf's wave loops, the flame flickers, and the hands follow the breath a frame late.

### Necromancer
1. **Body in the cast.** Done.
   - f16–17: he leans back 1 then 2 px, with the book lifted to rows 19 and 18.
   - f19: the staff drives through to −52° (60° from f17; skull from (9,7) to (30,10)). He leans in 2 px and the hem kicks 2 px.
   - The burst (f19) and the wisps (f20) are kept.
2. **Blood-black.** Done.
   - **The robe** from row 30 down is in m/h with R and h folds.
   - **The crimson** ('2' and r) stays on the upper robe and lit planes, with a 1 px r rim on the top-left.
   - **Bone carries the light.**
   - **The runes** cycle R → r → x → r, and x is emissive.
   - **Values:** 43% night-clear, 27% bright, 43% darker than luma 50 (v2 38%). The dark lower half separates him from the knight's scarlet.
3. **The face, and the idle.** Done.
   - **The skull is modelled:**
     - A lit brow and cheek in z/Z on the top-left.
     - h sockets around the green eyes.
     - A hollow cheek and jaw in Q/W.
     - A tooth row.
   - **Idle motion:** the pages' glow and the runes step on every frame, and the staff's eyes pulse (l/L). The hem's back and the staff's skull sway. Minimum transition 46 px (round 2: 0).

## Weak points and what's left

- **Assassin.**
  - The hood is large and smoothly round: at 1x it can read as a bean-shaped head.
  - The scarf's flame is a small lilac tuft, not a strong read.
  - The attack keeps round 2's choreography and trail shapes, re-posed for the new body; it wasn't reworked this round.
- **Glows only show in the game.** The lab catalogue doesn't carry `emissive`, so the assassin's eyes, the mage's ember and the necromancer's runes glow only once the sprite is wired into the game.
- **Ranger notches.** By my count she still has 12.3 notches per frame. They are mostly where the bow and string pass close to the body. I left them as ink, because filling them puts bumps on the bow.
- **Mage colours.** He is now at 22 colours (+f, for an ember that glows on its own).
