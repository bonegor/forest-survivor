# Review: druid/v1 (Bramwyn)

This review uses the rubric, anchors and measures of `../BASELINE.md` and `../remaster-v5/REVIEW.md`. The shipped five scored 8.5 SHIP.

**Evidence:**
- `review.mjs druid/v1`, which reproduces the generator's figures: feet on row 39 in every frame, drift 0.63 / 1.38 px, 25 colours, outline 100%, islandShare 0.120, night 55.7% (5+), bright 17.6%.
- `shot.mjs druid/v1` at the game zoom and at `--zoom=closer`. The stage now plays the druid, with no errors.
- Night shots of all six heroes at the forest's mid-run ambient (102, 110, 164).
- Gridded zooms and key dumps of all 22 frames.
- A check that the sheet matches a fresh build: 0 px differ.

Coordinates are (x, y) in the 48×48 frame.

## Scores

| Hero | 1 Align | 2 Silhouette | 3 Team | 4 Anim | 5 Craft | 6 Palette | 7 Appeal | Overall | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| **druid/v1** | 9 | 8 | 7 | 7 | 7 | 7 | 7 | **7.5** (7.43) | **CHANGES** |

**Works:**
- The antlers are a silhouette key that no other hero shares.
- He is warm against the grass by day and at night.
- His feet are locked on row 39.
- He reads as neither the sorcerer nor the necromancer.

**Holds him under 8.5:**
- The face reads as a mask.
- The attack clips at the frame's edges.
- The staff's head merges with the antler.
- Smaller points:
  - His bright share (17.6%) is the team's lowest; the shipped five are 24–36%.
  - The bark robe melts into the dirt at the crossroads.
  - The leaf mantle is a noisy checker; its islands push islandShare to 0.120, the team's highest.

## Must-fix

1. **The beard reads as a mask, an echo of the assassin's.**
   - Where: the A/a block at x 24–29, rows 18–21, in every frame.
   - The problem: it's a 5×3 rectangle the width of the face, darker than the skin (luma 112 against 194), right under the eyes.
   - The fix:
     - Recolour it on a light ash ramp: Z, with a G highlight and a g shade on the right edge.
     - Taper it to a point by row 23.
     - Leave skin cheeks at (24,18) and (30,18), with a moustache row on row 18.
   - This also lifts his bright share.
2. **The attack clips at the frame's edges.**
   - Where:
     - f17: the staff's head and flash sit on row 0 at (35,0), and the top ray is cut off.
     - f18: the streak reaches (40,0).
     - f19 and f20: the root at x 47 is cut by the right edge, so x 46–47 has no outline.
   - The fix:
     - Lower the raise by 3 px.
     - Keep the roots at x ≤ 43.
     - While there, give the blow (f19) some body: a 2-px crouch and a head drop. Today only the staff and the arm move.
3. **The staff's head touches the right antler in the idle.**
   - Where: on f0 the antler's outline at (33,8) runs straight into the claw's ink at (34–36,8), and the shoot at (34,9) touches it. f7 is worse, because the staff rocks −1 there.
   - The fix: move the staff's top 2 px right (x 39), or the crystal 2 px down, so a gap of background stays between them on every frame.

## Item art

I read `hero-druid-items.js` against `i_thorns` in `items.js`. I didn't render them; I stopped there at the producer's call.

**`i_roots` is too close to Bramble's icon.**
- Both are brown B/b spikes on an m earth band (rows 11–13), with green accents and a centre stalk.
- The inward hook is the only difference, and it's subtle at 14 px.
- Suggestion: make the claw the read. Close the two roots into a near-ring round a held glowing seed (y/Y), and drop the centre shoot.
- This isn't a must-fix for the sprite, but it should be done before the item ships.

**`i_worldroot` and the four-frame `root`** read correctly from their strings.

VERDICT: CHANGES
