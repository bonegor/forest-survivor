# Remaster V2: the five heroes, round 2

Six entries, all `collection: 'Remasters'`:
- `knight`, `archer`, `mage` and `necromancer` are `lab:<class>/remaster-v2`.
- `rogue` has two takes for the owner to pick from, both in `rogue.js`:
  - `remaster-v2`: the hooded assassin.
  - `remaster-v2-wraith`: the floating shade.

Build all six with:
`node gms/3001/tools/build.mjs gms/3001/sprites/lab/src/remaster-v2/{knight,archer,mage,rogue,necromancer}.js`

Every entry builds with "lines up cleanly" (no warnings).

## What changed in the kit (kit.js, a new copy; remaster-v1 is untouched)

- **No more doubled ink.**
  - `inked()` is gone. Parts are laid with `Pic.over(top, { sep })`, which draws a separation line only on pixels the part covers, never on clear ones.
  - The silhouette outline alone draws the edge against the ground.
  - Thin parts (blades, bows, staffs, daggers) get one ink edge around a lit core.
  - Doubled ink is 0 for all six.
- **One hip column for both legs** (`GAIT`, `leg()`).
  - The far leg runs phase i, the near leg i + 4.
  - Contacts sit at hip +5 and −5, an 11 px stride at both contacts (f8 and f12).
  - The planted ankle travels back +5, +3, 0, −3, −5 (2–3 px a frame).
  - The passing sole is on row 35 (f10, f14) and on row 36 either side (f9, f11, f13, f15).
  - Legs are drawn as clean row spans: thigh, knee, shin, and a foot by contact type (heel, flat, toe, tip, air).
- **Shading helpers.**
  - `folds()`: cloth folds fanning from an origin, as lit bands and shadows that taper toward it.
  - `bands()`: cone shading for robes.
  - `rimLight()`: reflected light on steel's shadow side.
  - `despeckle()`.
  - `stroke()` and `ribbon()`: capsule limbs and plumes.
  - `blade()`: a two-pixel sword with its guard, grip and pommel.
- **Motion everywhere.**
  - Walk: the body dips on the down frames (1, 5) and the head and hat a frame later (2, 6).
  - Weapons and arms counter-swing.
  - Capes, plumes, hoods, quivers, hems and flames trail by a frame.
  - Idle: a 1 px breath (f3–5), plus 2 px of secondary motion a frame behind it.

## Measurements (my measure.mjs run; "night" uses the reviewer's test: night luma ≥ the night grass + 20)

| | body top / eyes | feet row 39 | idle / walk drift | colours | islands | doubled ink | > luma 150 | night | upper-body change idle / walk |
|---|---|---|---|---|---|---|---|---|---|
| knight | helm 12 / visor 17 | every idle+walk frame | 0.16 / 1.24 | 14 | 0.111 | 0 | 36% | 57% | 17% / 60% |
| archer | hood 11 / eye 17 | every frame | 0.36 / 0.69 | 17 | 0.115 | 0 | 21% | 51% | 19% / 47% |
| mage | brim 13–14 / eyes 17 | every frame | 0.52 / 1.20 | 21 | 0.089 | 0 | 24% | 56% | 24% / 57% |
| rogue (assassin) | hood 11 / eyes 16–17 | every frame | 0.24 / 0.86 | 12 | 0.120 | 0 | 19% | 52% | 19% / 55% |
| rogue (wraith) | hood 11 / eyes 17–18 | every frame (tail tip) | 0.21 / 0.23 | 10 | 0.119 | 0 | 21% | 57% | 20% / 47% |
| necromancer | skull 12 / eyes 15 | every frame | 0.43 / 1.34 | 16 | 0.088 | 0 | 28% | 53% | 20% / 53% |

**What rises above the head:**
- knight: the plume, to row 7 (outline 6)
- archer: the fletching, to row 8
- mage: the hat tip, at row 5, as the review asked; the staff's orb at row 3
- assassin: the flame aura, to row 9
- wraith: the flame crown, to row 6
- necromancer: the crown spikes, to row 8; the skull staff, to row 3

**Attack top-row travel** is 3 px or less for every hero. No pixel touches the canvas border in any frame.

## Checklist: every fix in REVIEW.md

### Team-wide (kit.js)
1. **Walk limps.** Done: one hip column (x 24 for the knight, x 23 for the ranger and the assassin). Both contacts now have an 11 px stride.
2. **Short stride, low lift.** Done: contacts at ±5 (an 11 px stride), the passing sole on row 35, and the planted ankle travelling +5 → −5 at 2–3 px a frame.
3. **Rigid upper bodies.** Done:
   - The head lags the body by a frame.
   - Arms, weapons and the shield counter-swing.
   - Plume, cape, hood, quiver, hem, beard tip and flames trail.
   - Walk change is now 47–60% (v1: 29–32%).
4. **Doubled ink on thin parts.** Done: `inked()` was removed and separation lines go only on covered pixels. Doubled ink is 0 for all six. Where a part met ink (the ranger's far sole, the bow's separation), those now use dark non-ink tones.
5. **Scale.** Done:
   - Heads: rows 11–12 for the knight, ranger, both rogues and the necromancer; the mage's hairline is under a brim on rows 13–14.
   - Eye lines: rows 15–18 for all.

### Knight
1. **Walk (f8–15).**
   - Done: one hip column (x 24), and an 11 px stride on f8 and f12.
   - Done: the passing sole on row 35 in f10 and f14, and on row 36 in f9, f11, f13 and f15.
   - Done: `shieldX` is [−2, −1, 0, 1, 2, 1, 0, −1], with `shieldY` riding the bob. The far forearm now reaches the shield, so it never detaches.
   - Done, differently: the sword swings with the near arm, the fist ±2 px and the blade 6°→26° below level. The tip travels about 6 px. I stopped at about 1:2 rather than 1:1 so the blade stays off the legs (the baseline's complaint about the game knight).
   - Done: the plume tail and cape hem move a frame after the dip.
2. **Idle (f0–7).**
   - Done, differently: attitude as **en garde**, with the shield raised and the longsword levelled at the foe. I tried the suggested raised guard (hilt (27,29), tip (38,20)) plus two other layouts; the blade crossed the shield and hid its gold cross, the knight's best read.
   - Done: the cape hem and plume tail move 2 px a frame behind the breath (f4–6).
   - Done: the shield and blade rise 1 px with the breath, the blade dipping 2–4° with it.
   - Done: a star glint on the blade's tip (f5).
3. **Craft.**
   - Done: doubled ink is 0. The plume casts a steel-shadow (N) separation on the helm, not ink.
   - Done: row 21 under the helm is the gorget in n, with ink only at the silhouette.
   - Done: cape folds are lit bands (#f2735a / r) and shadows (R) fanning from the shoulder, tapering toward it, with no 1 px alternation.
   - Done: the plume is a three-tone ribbon (no 1 px stripes) and rises to row 7.
   - Done: reflected light (g) on steel's shadow side.
   - Done: the legs are longer (visible from row 30), against the toy proportions.

### Ranger
1. **Wired into the game.** Done:
   - `attackFps: 13`, `attackRelease: 4` (the release is on f20); `gameAttackFps` was dropped.
   - `attackWalk`: 6 × 8 shoot-while-walking frames (22–69), each the draw's upper body over the legs of walk frames 8–15.
   - A burst of in-game fight shots shows the nock, full-draw and release frames playing.
2. **Walk (f8–15).** Done:
   - one hip column (x 23), an 11 px stride, a 3 px lift
   - the grip shifts x ±1 against the stride, and the bow tilts 4° more on alternate steps
   - the near hand swings ±3 px (x 18–24)
   - the head, quiver and fletching bounce a frame after the dip
   - the cloak hem trails 1–3 px
   - head and shoulders lean 1 px forward on the push frames
3. **Bow, fletching and legs.** Done:
   - The string is 1 px of G, never the limb colour.
   - The limbs are t / T with b tips, with a single ink edge.
   - The bow is tilted 12°, top limb forward.
   - The fletching is three angled feathers (w tips, G vanes, r bands) fanning up and back from the quiver mouth (x 10–17, rows 9–12).
   - Trousers are b / m with B on the lit edge; boots are B / b with a full t cuff.
   - The cloak now has fold bands instead of one fold line.
   - The eye has two pixels (w, k).

### Mage
1. **Proportions.** Done:
   - The brim is on rows 13–14, and the hat rises from row 12 to a tip at row 5 that bends back.
   - Two eye pixels (k) at (23,17) and (26,17), under w brows on row 16, with S / s cheeks and a nose.
   - A white beard (w / G) runs from row 18 to row 30, with a g shadow on its right.
   - The robe has shoulders (x 15–30 on row 20), a waist at the sash (x 18–28 on row 27) and a flared hem (x 13–32 on row 38).
2. **Act with the body.**
   - **Walk:**
     - The staff foot is planted on row 38 in the contact frames (8, 12) while the body passes it, then lifted and swung 2 px forward on the passing frames (10, 14).
     - The hem kicks 2 px forward with a boot toe (b / m) on alternate steps.
     - The near sleeve swings ±2 px.
     - The hat tip lags.
   - **Cast:**
     - f16–17: the staff drawn back over the shoulder (the orb behind the hat), the body leaning back 1–2 px, the free hand raised and glowing.
     - f18–19: the staff swung through about 80° and levelled at 45°, the body leaning in 2 px, the robe flaring.
     - The frost star has a warm ember core (Y / o).
3. **Craft.** Done:
   - Cone shading: a 3 px U band on the left, a #1f6fbf body, and a 3 px u shadow on the right.
   - A 3 px #7fd0f5 panel runs down the front with one trim line. The trim is in gold (y) rather than G, as are the hat band and the sash clasp: the warm accents tie him to his fireballs.
   - Folds are 2 px diagonals from the sash.
   - The staff is 2 px of wood (B lit, b shade) with a single ink column.

### Rogue
1. **Make Kael a hero.** Both takes are built, for the owner to choose:
   - **`remaster-v2`, the assassin:**
     - a pointed violet hood, two slanted glowing eyes over a mask, shoulders, a torso with a magenta sash and belt
     - two legs on the shared rig (soles on row 38)
     - a magenta scarf streaming behind
     - twin daggers 6 px long and 2 px wide (w edge, G body, y guard)
     - violet flame tongues off the shoulders as an aura
   - **`remaster-v2-wraith`, the shade:**
     - a tall hooked hood over a void face with "\ /" eyes
     - clear shoulders and arms, with blades twice the size
     - the fire as one cohesive crown rooted in the back of the hood (nested teardrop tongues: dark roots, lilac tips)
     - the tail tip on row 38 in every idle and walk frame
2. **Value.** Done:
   - Body planes in p / j, with a light lavender (#b57fd9) on the lit side and lilac (#d9a6ff) rims.
   - q only for shadows; h only for the void face.
   - The assassin is at 19% > 150 and 52% night; the wraith at 21% / 57%.
3. **Attack readability.** Done:
   - Blade trails in w / G, with only the fading tail in lilac, so the slash separates from the body.
   - A single ink edge around the daggers (doubled ink 0).
   - Coil (2 frames), a downward slash, a crossing rising slash on the blow (frame 3) as the fire flares, follow-through, recover.
   - A lunge of 2–3 px.

### Necromancer
1. **Make him act.**
   - **Cast:**
     - f16–17: the staff raised high (the skull's top on row 2), the grimoire lifted to the chest, the body leaning back 1–2 px.
     - f18: the pages flare.
     - f19: the staff driven down and forward (its foot 4 px forward), the grimoire thrust out in a blood-flame burst, the hem flaring 2 px.
     - f20: the flame breaks into three rising wisps.
     - f21: recover.
   - **Walk:**
     - The hem kicks 2 px forward with a boot toe on alternate steps.
     - The staff is planted on the contact frames and swung 2 px forward on the passing frames.
     - The head and book dip a frame late.
2. **Form and value.**
   - Done: bone pauldrons (z / T, ribbed) on rows 20–23.
   - Done: a waist at the bone-plaque belt (row 27) and a flared hem (x 13–33 on row 38).
   - Done: folds 2 px wide in m / R.
   - Done, differently: the robe is **crimson**, a 2 px r band, a #aa2a3a body and an m / h shadow. It darkens toward a ragged, blood-soaked hem, and a bone-white panel down the front carries the runes.
   - Why: in A / a / m / h only A clears the night grass (a, m and h fall below it), so that robe can't reach 50%. Crimson plus bone, the reviewer's "bone and blood red", gives 28% > 150 and 53% night.
3. **Props and eyes.** Done:
   - **Grimoire:** 8×5 at chest height (rows 21–25), with T / t pages in a shallow V, a b spine, an R cover edge and r glyphs.
   - **Runes:** glyph shapes (an L, a T, an arrow) burning on the bone panel, replacing the dashed line.
   - **Eyes:** acid green (l), his skeletons' eye colour, in deep sockets of a gaunt bone-grey skull face. The skull staff's eyes are green too.
   - `emissive: 'li'`.

### Bars for round 2
1. **Scale.** Met: see the table.
2. **Walk.** Met:
   - Legged heroes: the same 11 px stride at both contacts, the passing sole on row 35, the planted foot travelling 2–3 px a frame, hands counter-swinging 2–3 px, a 1 px bob on the down frames, and trailing cloth.
   - Robed heroes: a 2 px hem kick, a toe on alternate steps, and the staff planted on the contact frames.
   - The floating wraith glides: a float bob and a breathing lean on alternate transitions, the tail streaming.
3. **Idle.** Met: a 1 px breath plus 2 px of secondary motion a frame behind it. Change per frame is 17–24%.
4. **Attack.** Met:
   - Every attack has 2 anticipation frames, a blow on attack frame 3 (where `strikeClip` lands it), a follow-through and a recovery.
   - Every hero leans 2 px or more.
   - Arcs: the knight's sword about 175°, the mage's staff about 80°, the rogue blades over 100°.
   - The necromancer's staff only tips forward on the slam; his blow is the grimoire's burst.
5. **Craft.** Met: doubled ink 0, no 1 px alternating stripes, 10–21 colours, islands 0.088–0.120, no strays, no frames in pieces.
6. **Value.** Met: 19–36% > luma 150, and 51–57% clear the night grass.

## Still weak (my own read)
- **Knight:** the raised-sword frames of the slash (16–18) are thin, and the en-garde idle is a choice the reviewer may want to revisit.
- **Ranger:**
  - She is the closest to the night bar (51%).
  - The drawn bow still makes a diamond with its string.
  - The shoot-while-walking frames reuse the standing draw's arms over walking legs.
- **Mage:** the near arm is still a hanging sleeve outside the cast.
- **Rogue:**
  - The assassin's flame tongues read as small horns behind the hood.
  - Both rogues' violets are lighter than the game's black-violet idea, to meet the value bar.
- **Necromancer:**
  - The crimson robe reads strongly but trades away the "near-black" of the original brief.
  - The grimoire is still small at 1x.
