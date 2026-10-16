# Grand Archmage, animated · review (15 October 2026)

Reviewed: `mage.js` as of 23:22 (both entries), against `../polish-oct15-mage.js` (polish-a), in the
picked look `FS mage polish-a hue=-9 sat=41 bright=-4 contrast=21 mid=23 warm=40 tint=-15 outline=-100`.
Frame numbers are the sheet's: idle 0-7, walk 8-15 (w0-w7), cast 16-21. Coordinates are x,y in the 48×48 cell.

Previews and scripts: `<scratchpad>/anim/mage-review/`
(file names below are in that folder; `tools/` holds the letter-grid dump, lints and the travel strip;
`proto/mage-hem.js` is a scratch copy with only the fix in finding 1 applied).

## Final verdict (round 2): APPROVED. See "Round 2" at the end.

## Round 1 verdict: CHANGES NEEDED (small)

The pixel work is clean and the design holds in all 22 frames. One thing matters in the game: the walk's
two steps are unequal (finding 1, a two-number fix, tested). Findings 2-3 are cast-only (Sprite Lab). 4-6 are polish.

What already passes (keep it): idle 0 is the drawing (0 px differ). There are no stray pixels, no bare
colour beside empty, no 2×2 ink clumps, no colours outside the palette, and the doubled-ink measure is 0
(I also scanned: the staff never stands one pixel off the robe or shoulder). The feet are on row 39 in all
22 frames. The walk bobs the body 2 px (brim rows 11-13) and drifts 0.93 px. The upper body changes 67%
per walk frame (knight 74%) and 16% per idle frame. Night readability is 55%.

Loop seams are clean: idle 7→0 changes 12 px (fire and orb only); walk 15→8 changes 427 px, in line with
the other walk steps (392-513); cast 21 equals idle 0. The hat, brows, beard, robe, gold trim (the middle
panel never moves), orb cup and fireball stay the drawing's in every frame.

The idle reads as calm breathing with no jitter: the body rises on 3, the cone follows on 4, the body
falls on 6 and the cone on 7. The walk's contact/down/passing/up bob and the orb's loop are right.

## Findings

1. **Walk: the far-leg step is much weaker than the near-leg one, so the cycle limps.**
   - **What's wrong:** on the near contact (frames 8-9) the front hem pushes out +3/+2 and kicks up a row.
     That lifts the hem over x25-34 and shows the boot and a slot of ground on row 38. On the far contact
     (frames 12-13) the front gets only +1/+1 and no kick. At row 37 the hem spans x8..34 on frame 8 but
     x8..32 on frame 12.
   - **How it reads at game size:** at 2-3× the one conspicuous event in the cycle is the frame-8 kick.
     Frames 12-15 look almost like idle apart from the staff lift. So the 0.8 s cycle reads as one step
     plus a shuffle: a hitch every 0.8 s, not two steps.
   - **Why the front can't simply push further on 12:** the staff is at its back-most point there (foot 0,
     ink at x34), so the robe's ink can't pass x32 without two inks touching.
   - **Fix (tested in `proto/mage-hem.js`):** in `HEM`, change w4 to `[1, 2, 1]` and w5 to `[2, 1]`.
     - w4 `[1, 2, 1]` gives the far leg its own kick. The hem lifts over x25-32, the far boot (x29-31) shows
       under it, and the staff still clears by a pixel.
     - w5 `[2, 1]` gives the front the same +2 as frame 9. The staff's foot is 1 there (ink x35), so the
       robe edge at x33 clears it.
   - **Check:** measure and lint stay clean (stray 0, doubled ink 0). The 3× strip now shows two beats.
   - **Previews:** `hem-w0-w1-16x.png` vs `hem-w4-w5-16x.png`, `sheet-2x.png`, `walk-6x.png`; after the fix:
     `proto-hem-w0-w4-16x.png`, `proto-hem-w4-w5-16x.png`, `proto-walk-idle-3x.png` (walk over idle).

2. **Cast, frames 17-18: the blaze touches the hat's brim.**
   - **What's wrong:** the blaze's right rim at (16,13) meets the brim's ink corner at (17,12) diagonally.
     That seals off a pocket of background (x15-19, rows 13-18) between the flame and the face. It is a
     tangent, and flame and hat read as one shape.
   - **Fix:** either place the blaze at `x: 5` (the embers of frame 18 still clear it), or drop the right
     rim pixel of its 6th row (screen 16,13) so that shoulder starts a row lower.
   - **Previews:** `cast-tangents-16x.png` (left), `cast-fire-12x.png`.

3. **Cast, frame 19: an ember sits on the hat's outline.**
   - **What's wrong:** the pair (19,6) `F` / (18,7) `f` touches the cone's back ink at (20,5) diagonally,
     so it reads as an orange nick in the hat.
   - **Fix:** move that pair 2+ px clear, for example to (17,5) / (16,6).
   - **Previews:** `cast-tangents-16x.png` (right), `cast-fire-12x.png`.

4. **Beard point on the belt, frames 9, 10, 13 and 14 (the tip-swing frames).**
   - **What's wrong:** with the tip swung back, its point `w` at (24, 27+up) sits straight on the belt's
     `d` at (24, 28+up), with no ink under it. The belt's notch ink stays at (25, 28+up), so the beard's
     right edge runs on into the belt. In the drawing the point has ink under it.
   - **Fix:** on tip frames, also ink (24, 28+up), so the notch is 2 px under the point. Keep (25, 28+up),
     which is also the buckle's left edge.
   - **Preview:** `beard-point-24x.png` (frame 8 vs 10).

5. **Squashed cone leaves single pixels: frames 3, 10, 11, 14, 15 and 17 (cone +1).**
   - **What's wrong:** the squash drops source row 11, so the cone's single base row lands on the band.
     Its `4` (x22) and `1` (x27), which are 2-px pairs in the drawing, become single pixels: (22,10) and
     (27,10) on frames 3/11/15/17, and (22,11) and (27,11) on frames 10/14.
   - **Fix:** squash by dropping source row 9 instead. It has the same outline as row 8 (x21-27). Draw cone
     rows 3-8 one row down and leave rows 10-11 in place, so the base keeps its 2-row pair.
   - **Previews:** `cone-squash-24x.png` (frame 0 vs 10), `cone-16x.png`.

6. **Passing frames 10 and 14: the front hem tucks under.**
   - **What's wrong:** FRONT -1 pulls the front edge in at the bottom only: R goes from x31 to x30 on rows
     36-37, and the `g` stripe jogs from x28 to x27 there. The robe's lip curls inward against its A-line.
   - **Fix:** use front 0 at passing (`HEM[2]` and `HEM[6]` = `[0, -1]`). The back still draws in, so the
     wide/narrow beat stays (row-37 R: 33 → 31 → 32).
   - **Previews:** `hem-w2-w3-16x.png` (left), `w2-w6-full-12x.png`.

## Minor nits

- The notes say there are 8 idle tongue shapes, but there are 6: `TONGUES[6]` is `TONGUES[1]` and
  `TONGUES[7]` is `TONGUES[4]`. Frames 6-7 differ from 1 and 4 only by the BODY2 shimmer. The repeat
  doesn't show, because they are 4-5 frames apart. Fix the note, or draw two more shapes
  (`fire-idle-12x.png`).
- The lab's "speckled 14%" on the picked entry comes from the drawing under the look (`outline=-100`
  blackens only the outer ink). Frame 0, which is pixel-identical to the drawing, scores 14.3%; the frames
  range from 13.1% to 15.2%. It is not a regression. "Frames in pieces 18, 19" are the embers, as
  intended.
- Stretched cone frames (6, 8, 9, 12, 13, 16): rows 9-11 are three identical `5433321` rows, so the
  cone's base becomes a short cylinder for those frames. Acceptable; finding 5's approach (taking or
  giving a row higher up) would also soften it.
- The forearm reach (frames 8, 9, 14 and 15) has no ink at the old sleeve end, so the sleeve lengthens
  rather than a forearm emerging. That is fine at game size (`hand-walk-16x.png`, `walk-staff-10x.png`).
- On the tip-swing frames the beard's left contour gets a 2-row vertical step at x21 (rows 24-25) where
  the drawing has a 45° edge. It comes with shifting a diagonal cut, and is acceptable (`beard-tip-16x.png`).

## Answers to the open questions

- **Walk at game size.**
  - With finding 1 the cycle reads as two steps at 2× and 3× (`proto-walk-idle-3x.png`; compare
    `sheet-2x.png` and the current sorcerer `v3-sheet-3x.png`). Do that first.
  - Don't make the kick 2 rows: the design has no legs, so a second row is either a hole or new leg pixels.
  - Don't lean the upper body either. Anything shifted from the belt up shears the gold stripe at the belt
    (buckle x26 over the robe's `G` x26). Any lean line through rows 17-27 kinks the beard. Those are the
    design's two strongest verticals.
- **Ground speed.** The game moves the hero 7 world px per walk frame (70 px/s at 10 fps; one sprite px
  is one world px). Nothing planted in a 48-px cell can match that.
  - The boots (2 px/frame, one row, mostly under the robe) are fine as they are.
  - The staff's foot is the one planted thing that shows. Its world x on frames 8-11 is 38, 44, 50 and 56,
    so it skates about 6 px per frame (`travel-walk-3x.png`, `tools/travel.mjs`). Leave it: the plant and
    lift loop is what reads, and the foot is a 2-px cap. If it ever bothers you, lift it a frame earlier
    (planted on w0-w2).
- **Idle to walk.** Leave it. The game enters the walk at whatever phase the clock is in, so the staff's
  0-2 px step comes together with the whole pose change (hem, fire, fist) and doesn't read as a pop.
- **Cast embers.** Hot-head and cool-tail pairs are fine for sparks: they glow unlit and read as specks at
  2×. Only move the one on the hat (finding 3).
  - Optional, cast only: the fire hand never moves and nothing leaves, so frame 19 reads as the fire dying
    rather than a throw. A 1-px push of the palm on 17-18 and a small ball leaving on 19 would sell it.
    This is low priority, since the game never plays it.

## Round 2 (`mage.js` as of 23:50)

I rendered the module myself. My round-2 previews are in `r2\` in the review folder; I didn't rely on
the artist's previews. All six findings are fixed in the actual output:

1. **The walk now has two steps.**
   - The code: `HEM` is `[[3,2,1],[2,1],[0,-1],[1,0],[1,2,1],[2,1],[0,-1],[1,0]]`.
   - Frame 12 kicks: the hem is lifted over x25-32, the ink is on row 37, the far boot (x29-31) shows on
     row 38 with a 1-px slot at x27, and the staff (ink x34) clears the hem by a pixel.
   - Frame 13 pushes the front +2 (R x33), clear of the staff at x35.
   - At 2× and 3× both contacts read, so the cycle no longer limps.
   - Previews: `r2\hem-w0-w4-16x.png`, `r2\hem-w1-w5-16x.png`, `r2\walk-over-idle-3x.png`,
     `r2\walk-over-idle-2x.png`.
2. **The blaze no longer touches the brim** (17-18). Its 6th row ends at x15, so on rows 12-13 the rim is
   at x15 and the brim ink at x17. The enclosed pocket is gone: the hole scan finds only the drawing's own
   gap by the palm. Preview: `r2\cast-tangent-ember-16x.png`.
3. **The ember on frame 19 is clear of the hat.** It is now at (15,4)/(16,5), 3+ px from the cone's ink
   (x19-20 on rows 4-5). Preview: same file, right.
4. **The beard point has ink under it** on frames 9, 10, 13 and 14, at (24, 28+up). The buckle keeps its
   left edge at x25. Preview: `r2\beard-point-24x.png`.
5. **No single pixels at the cone's base.** The squash drops source row 9 and the stretch doubles row 8.
   The rows 10-11 pair stays intact on every frame (frames 3/10 checked; also 11, 14, 15, 17), and the
   island scan finds no new single pixels apart from the boots' own pattern. Preview: `r2\cone-24x.png`
   (0, 3, 6, 10).
6. **The passing frames 10 and 14 hang the front straight** (R x31 on rows 31-37), and the `g` stripe
   stays at x28. Preview: `r2\hem-passing-w2-w6-16x.png`.

**Nothing new broke:**
- **The lab's measure:** feet on row 39 in all 22 frames; walk bob 2 px, drift 0.93 px; the upper body
  changes 66% per walk frame and 16% per idle frame; doubled ink 0; strays 0; night 55%. The only notes
  are the inherited picked-look speckle (13.8%) and the embers of 18-19.
- **The artist's lint:** idle 0 still matches the drawing (0 px differ).
- **My scans:** no new enclosed holes. No two inks side by side between the staff and the robe or
  shoulder. No new single pixels.
  - The new 2-px ink runs are fine. One is the beard-point ink beside the buckle's edge on the swing
    frames, which has colour on both sides. The other is the cone's back outline running vertically for 2
    rows at x21 on squash frames: an outline, not a doubled wall.
- **Loop seams:**
  - Idle 7→0 changes 12 px.
  - Walk 15→8 changes 426 px, in line with the other walk steps (385-519).
  - Cast 21 still equals idle 0.

Left (not blocking):
- Two comments still say the idle has 8 fire shapes when it has 6: `mage.js` line 111 ("eight shapes so
  the loop never repeats") and line 234, and the notes' idle table heading ("the fire through 8 shapes").
- As the artist notes, the cast still reads as the fire flaring and dying rather than a throw. It is
  optional, and lab-only.
