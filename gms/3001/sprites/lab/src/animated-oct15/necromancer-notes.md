# Necromancer · Soulflame, crowned and animated (15 October 2026)

Source: `necromancer.js` beside this file. It has two entries, `soulflame-picked` (in the user's look) and
`soulflame-animated` (as drawn), both in the collection *Picked · October 15*.

The picked design is Soulflame (`polish-d` in `../polish-oct15-necromancer.js`), in the look
`FS necromancer polish-d hue=1 sat=69 bright=11 warm=29 tint=46 outline=-100`.

The user's change: *"for the necromancer, lose the flames, give him a crown."*

Coordinates are (x, y) in the 48×48 cell. He faces right, his feet are on row 39 and the ground line is row 40.

## The crown

**What it is.** A lich king's crown, 11 px wide (x 19–29) and 8 rows tall (rows 3–10):
- a gold band two rows deep (rows 9–10), with a green soul gem at its front centre (24, 9)
- a tall centre spire, 1 px wide for three rows (rows 4–6) and widening to 3 px where it meets the band
- a shorter point either side (tips on row 6 at x 20 and x 28)
- lit from the upper left: the light gold `e` is on the left faces of the points and on the band's left end, `z` is the mid tone, and `y` is on the right faces and along the band's lower row

**How it sits.**
- **No ink between the band and the bone.** The band's lower row (y, row 10) lies directly on the brow (row 11). An ink line there (tried) read as a gap, as if the crown were stacked on the skull like a lid.
- **The cranium is one pixel deeper at the back.** Rows 11–14 now start at x 19, so the band's left end continues the line of the back of the skull. The band overhangs the brow by one pixel at the front (x 29). The crown is centred on the cranium (spire at x 24, skull x 19–28).
- **What the crown replaces.** It covers what the fire used to cover (the dome, rows 10–11). The skull below is Soulflame's (sockets, cheekbones, teeth, jaw), unchanged, with two rows of brow under the band.

**Why this shape.**
- **Three points with a tall centre spire read as "crown" at 1× and 2×.** That held in every 2× and 3× preview beside the knight.
- **Variants I tried and rejected:**
  - A 12 px crown with a broad band read as a hat.
  - A five-tine fan read as a picket fence.
  - Points splayed outwards read as antlers or horns.
  - Splayed tips only were close, but busier.
  - A taller spire (to row 2) read as a church steeple.
  - All are in the scratch previews `crowns-*.png` and `heads-*.png`.
- **Why it doesn't look like the knight.** He has no steel, no plume, no visor. His silhouette is a narrow gold crown over a bare skull, a navy mantle and a sickle.
- **Gold.** It matches his gold trim, clasp and hem.

**The metal in the user's look.** The look makes gold more saturated and pinker:

| letter | as drawn | in the look |
|---|---|---|
| `y` | #8c6a2f | #c26a00 |
| `z` | #d1a548 | #ffad02 |
| `e` (new) | #f2d98a | #ffe95a |
| gem `h` | #9ee562 | #a1ff21 |

The new light gold `e` was chosen so that it comes out a clean yellow highlight (not peach) in the look. With it, the crown reads as gold rather than orange.

## What glows

The glow keys are `h` and `i` (the painter's glow letters). The entries' `glow` is `['#a1ff21', '#ffffb3']` picked, `['#9ee562', '#effcc4']` as drawn.

- **Eyes.** (24, 14) and (27, 14), `h`, always.
- **The crown's soul gem.** (24, 9):
  - `h` normally
  - `i` (white-hot) on idle frames 2–3 and cast frames 1–3
  - `g` (dim green, not a glow letter) on idle frames 6–7, so at night it blinks off for a moment
- **The cast's soul light.** `h` and `i` glow; its `g` sel-out does not.

Before the change, 35 flame pixels glowed. Now 3 pixels glow at rest.

## Fixes to Soulflame's parts

These are on the standing frame too. Besides the crown, they are the only differences from polish-d:
- **The sickle's blade.** Its underside (36, 5) and its tip (40, 7) are closed with ink. The blade was open to the outside there.
- **The front shoulder of the mantle.** (29, 19) is now ink. The outline stepped out 2 px there and left a fill pixel touching the outside.
- **The forearm's top edge.** (32, 22) is now ink, where it leaves the mantle.

## How it's built

Soulflame's parts are copied into the module as named parts `[x, y, rows]`:

- HEAD
- MANTLE, TRIM
- TORSO (with the vertebra belt)
- SKIRT
- ARM, ARM_UP
- SICKLE

Each frame stamps them back to front:
1. the staff
2. the skirt
3. the torso and belt
4. the feet
5. the mantle and trim
6. the arm
7. the crowned head
8. the soul light

The pieces drawn per pose:
- **The staff.** A straight 4-px shaft (`oxwo`) from its top column `tx` (row 4) to its foot column `fx` (row 38), lifted `lift` px, with the sickle riding its top.
- **The arm.** Stretched or shortened along its forearm (split at x 32), so the hand always grips the shaft where it passes.
- **The skirt.**
  - Its back edge (`back`) and front edge (`kick`) are stretched outward towards the hem.
  - A 2-px flare grows over rows 31–37. A 1-px flare only starts on row 35 (`flare()`). Row 33 is where Soulflame's own edge already steps, so a flare there made a 2-px notch.
  - Any fill a stretch still bares is inked.
  - On contact frames, the hem's front corner (its last three pixels) rides a row higher (`lift`): a flick over the stepping foot, with the ground showing under it.
- **The feet.** Bone feet on row 38, inked at both ends, with their soles on row 39:
  - the near foot is `bccd`
  - the far foot is `bbc`
  - a toe-off shows only the front pixels
- **The rise.** When he rises (`up < 0`), the skirt's top row fills the row the belt leaves. When he sinks (`up > 0`), the belt covers the skirt's top.

## Pose tables

### Idle: 8 frames, idleRate 6/1.6

| frame | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| up (body, shoulders, arm) | 0 | -1 | -1 | -1 | 0 | 0 | 0 | 0 |
| head (relative to up) | 0 | 0 | 0 | 0 | -1 | 0 | 0 | 0 |
| trim (relative to up) | 0 | +1 | +1 | 0 | 0 | 0 | 0 | 0 |
| hem back | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 0 |
| gem | h | h | i | i | h | h | g | g |

- **The breath.** He breathes in on frames 1–3. The head rises with the body but comes down a frame late. A lag on the rise let the jaw's ink cover the gold clasp, turning it into an L for a frame.
- **The trim.** The mantle's heavy trim lags the rise by two frames. While it lags, the mantle is a row longer, then it settles. The lagging part of the trim reaches x 26, so no robe pixel shows between its ink and the arm's.
- **The hem.** The hem's back sways after the breath.
- **Every frame differs from the next**, if only by the gem: frame 1 → 2 changes the gem alone. Frames 5 → 6 → 7 → 0 change by only 1–8 px: the pause at the bottom of the breath.

### Walk: 8 frames, motionRate 10/9.8

The frames are contact (0), down (1), passing (2) and up (3), then the same for the other foot.

| frame | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| up (bob) | 0 | +1 | 0 | -1 | 0 | +1 | 0 | -1 |
| hem kick (front) | 2 | 1 | 0 | 1 | 2 | 1 | 0 | 1 |
| hem back | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 0 |
| hem front lifted | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| near foot x (px shown) | 28 (4) | 26 (4) | 24 (4) | 22 (4) | 20 (2, toe-off) | lifted | lifted | lifted |
| far foot x (px shown) | 19 (2, toe-off) | lifted | lifted | lifted | 27 (3) | 25 (3) | 23 (3) | 21 (3) |
| staff foot `fx` | 37 | 35 | 34 | 35 | 36 | 37 | 38 | 38 |
| staff top `tx` | 35 | 36 | 36 | 37 | 38 | 37 | 36 | 36 |
| staff lift | 0 | 0 | 1 | 2 | 2 | 1 | 1 | 1 |

- **The staff.**
  - It is set down ahead on contact (frame 0) and stays planted through the down (frame 1). Its foot moves back 2 px, at the ground's pace, so the tip doesn't skate.
  - It is lifted on frame 2, swung forward on frames 3–6, and held just off the ground on frame 7.
  - It never leans more than 2 px. Each pixel of lean is one jog in the shaft, and the 3-px leans looked crooked.
  - The hand follows the shaft (knuckle x 36–38).
  - The staff keeps at least one clear pixel from the robe in every frame.
- **The far foot.** Its toe-off on frame 0 is at x 19, so its toe moves 2 px from frame 7 like everything else on the ground.

### Cast: 6 frames, attackFps 13 (lab only)

| frame | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| up | +1 | -1 | -1 | 0 | 0 | 0 |
| arm | rest | raised | raised | raised | rest | rest |
| staff `tx` / `fx` / lift | 33/34/0 | 36/34/2 | 37/34/2 | 37/34/2 | 35/34/1 | rest |
| soul light | spark kindling (behind the blade) | ball (behind) | 13 px burst (in front) | rays breaking into sparks | embers rising | none |
| gem | h | i | i | i | h | h |

What happens frame by frame:
1. **Frame 0, the wind-up.** He dips and draws the staff back.
2. **Frames 1–2.** He rises and raises his arm level. The staff is lifted 2 px and leans forward as the light gathers in the hook, then bursts.
3. **Frames 3–5.** The sparks fly and he lowers it.

## Checks

These were run with the lab's own `measure`/`verdict` (no build) and a letter-grid checker of my own.

- **Feet and size.**
  - The feet are on row 39 in every idle, walk and cast frame.
  - He is 38 px tall (top row 2), as Soulflame was.
- **Movement.**
  - In idle the top row stays on row 2, because the sickle is the top; the crowned head itself rises 1 px on frames 1–4. Idle drift is 0.15 px and the upper body's change is 13%.
  - The walk bobs 2 px, drifts 0.62 px, and 68% of the upper body changes per frame. That is between Lyra (56%) and the knight (74%).
  - The robe's outline never steps more than 1 px from one row to the next, in any frame.
- **Outline and noise.**
  - The outline is 99% dark, with no outline gaps by my checker in any frame.
  - There is no doubled ink, no stray pixels, and only the 17 palette letters `12345bcdeghiowxyz`.
  - Cast frame 3 is in pieces on purpose: the sparks. Each spark is two pixels, so there are no strays.
- **Speckle.** Picked 12.2% (verdict threshold 12%), as drawn 9.9%. The extra in the look comes from the outline slider: edge ink turns pure black while inner ink keeps its colour. Soulflame itself in the same look measures 14.7%.
- **Night.** The verdict flags it as hard to see at night: 28% clear of the night grass. Soulflame was 29% too: the navy is dark. The flames were what carried him at night (35 glowing pixels). See the open questions.
- **The module check from the brief** passes: 22 frames per entry, all 48×48, every pixel fully opaque or clear.

## Review round 1 (the reviewer's `necromancer-review.md`)

The crown was approved as drawn. Fixed in `necromancer.js`:
1. **The robe's 2-px notches** at rows 32/33 are gone. They showed on idle 4–6 and walk 0, 1, 4, 5 at the back, and on walk 1, 3, 5, 7 at the front. A 1-px flare now steps on row 35 (`flare()` in `skirt()`).
2. **The skating staff is fixed.** The new staff table is in the walk section above: planted at the ground's pace, no lean over 2 px.
3. **The far foot's toe-off** on walk 0 is at x 19, so it no longer skips a pixel.
4. **The clasp no longer pops on idle 1.** The head rises with the body and lags only on the way down.
5. **The hem lifts only its front 3 px** on walk 0 and 4, so it no longer reads as a shelf.
6. **The lone navy pixel at (26, 23)** on idle 1–2 is gone: the lagging trim now reaches x 26.
7. **Round 2:** the raised sleeve's top (cast 1–3) is cloth (`o3322ooooo`) where it meets the mantle's shoulder, so there is no 2-row ink block at x 29–30.

Left as they were:
- **The glow.** Still the eyes and the gem; the crown doesn't glow.
- **The boss likeness.** That question (finding 5) is for the user.
- **Optional nits not taken:**
  - the gem's white-hot phase (idle 2–3)
  - the straight back of the head
  - the cast burst's clipped top pixel

## Open questions and doubts

1. **Crowned skull vs. the bosses.** The October review set a rule: "no crowned skull in violet (the lich boss and the Bone King)". In the user's look the navy robe turns indigo-violet (#3d2f6f / #554e99). He still differs:
   - his skull is in profile, not front-on
   - his crown is gold with a green gem (the Bone King's is orange with red gems; the lich boss's is white bone)
   - he has gold trim, a sickle and no cape

   But the motif is shared. The reviewer's comparison previews are in `scratchpad/anim/necromancer-review/`: `with-bosses-scene-3x.png`, `boss-heads-10x.png` and `bosses-3x.png`. This is the user's call.
2. **Night readability.** 3 glowing pixels instead of 35. The reviewer advises keeping it: in the game the hero carries his own light (`game.js` 1536–1537).
3. **Walk ↔ idle hand-off.** While walking, the staff stands 1–4 px further forward and the knuckle 1–3 px further out than standing, so it jumps a little when he stops. Within each loop nothing pops.
4. **The cast's burst** is clipped by one pixel at the top of the cell (frame 2). It is lab only.
