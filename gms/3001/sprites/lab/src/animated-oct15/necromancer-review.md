# Review: Necromancer · Soulflame, crowned and animated (15 October 2026)

Under review: `necromancer.js`, judged in `soulflame-picked` (the user's look `FS necromancer polish-d hue=1 sat=69 bright=11 warm=29 tint=46 outline=-100`). The artist's notes are in `necromancer-notes.md`.

**Where the previews are.** All previews are in
`<scratchpad>/anim/necromancer-review/`
and are named below by file name.

**How frames are named.** Idle *i* is frame *i*, walk *w* is frame 8 + *w*, and cast *k* is frame 16 + *k*. Coordinates are (x, y) in the 48×48 cell.

> **Final verdict (round 2): APPROVED.** See [Round 2](#round-2-re-review-of-the-fixed-module) at the end. The round-1 verdict below is kept for the record.

## Verdict, round 1: CHANGES NEEDED (small ones)

- **The crown is approved as drawn.** The flames are gone, and the crown does what the user asked.
- **The moving parts need fixing.** There are four problems:
  - the robe's flare makes 2-px notches
  - the planted staff skates on the ground
  - one foot skips a pixel
  - the clasp pops on idle 1

  Each fix is a few numbers in the pose tables or one line in `skirt()`.
- **A scratch copy has all the fixes applied.** Findings 1–4 and 6 are applied in `<scratchpad>/review-tools/exp/allfix.js`. Diff it against `necromancer.js`: 9 lines change. With it:
  - my checks find no 2-px skirt steps and no outline gaps in any frame
  - the lab's verdict is otherwise unchanged: 38 px tall, feet on row 39 in all 22 frames, outline 99%, no strays, no doubled ink
  - the walk's upper body changes 68% per frame and drifts 0.62 px

  Full sheet: `all-fixes-sheet-4x.png`.

## What passes

### The crown
- **It reads as a crown at every scale.** Three points with a tall centre spire are unmistakable at 1×, 2× and 3×, beside the knight and beside Soulflame (`scale-1x.png`, `scale-2x.png`, `scale-3x.png`). It does not read as a hat, a helmet or antlers.
- **It sits on the skull.** The band lies directly on the brow with no ink line between them, so it is worn, not balanced on top (`head-before-after-12x.png`).
- **The colours work in the look.**
  - The gold comes out as #c26a00, #ffad02 and #ffe95a, and matches the trim, the clasp and the hem.
  - The green gem at (24, 9) stands out on the gold.
- **The face is still clear.** The green eyes at (24, 14) and (27, 14) read at 2×.

### Fidelity to Soulflame
- Below row 18, idle 0 differs from Soulflame in exactly the two pixels the notes list: (29, 19) and (32, 22).
- The head is stamped unchanged in every frame.
- Nothing detaches, drifts or distorts: idle drift is 0.15 px, walk drift 0.39 px.

### Pixels
- My 4-neighbour check over all 22 frames finds no outline gaps.
- There are no strays and no doubled ink.
- Only the module's 17 letters are used.

### Loops
- **Idle is calm.** One 1-px breath, and frames 5 → 6 → 7 → 0 are nearly still.
- **The walk loops without a seam.** Frame 15 → 8 changes 338 px, like every other step (345–370 px).
- **The cast returns to rest.** Cast 5 is pixel-identical to idle 0.

### The walk reads as walking
At 2× and 3× (`idle-walk-2x.png`, `idle-walk-3x.png`), the walk differs from the idle in four ways:
- the staff is planted and swung
- the hem kicks forward and back
- a bone foot slides back under the hem on every step
- the body bobs 2 px

It reads as a lich's gliding walk. Because the robe hides the legs, it is quieter than the knight's walk, which suits him.

## Findings (most important first)

### 1. The robe's flare makes 2-px stair notches

**Where.**
- The back edge steps from x 15 to x 13 between rows 32 and 33, with an ink run at (13, 33)–(14, 33). This happens on idle 4, 5, 6 and walk 0, 1, 4, 5 (frames 4–6, 8, 9, 12, 13).
- The front edge steps from x 29 to x 31 between rows 32 and 33, with an ink run at (30, 33)–(31, 33). This happens on walk 1, 3, 5, 7 (frames 9, 11, 13, 15).

**What's wrong.**
- The silhouette steps 2 px in one row. Every other step on the robe is 1 px.
- In the idle, the notch appears on frame 4 and goes on frame 7. The back of the robe grows a notch instead of swaying.

**Why it happens.**
- With n = 1, `Math.round(n * t)` turns over at t = 0.5, which is row 33.
- Row 33 is exactly where Soulflame's own edge already steps. Its edges step on rows 30, 33 and 37.
- The "bared fill is inked" rule then turns the second pixel into ink.
- A kick of 2 is already clean, because its steps land on rows 31 and 35.

**Fix (tested).** Move a 1-px flare down to rows 35–37, in the middle of a run:
```js
const off = (n, t) => (n === 1 ? +(t >= 0.75) : Math.round(n * t));
// in skirt():
const m = stretch(r, x0, first + 1, off(back, t), last - 1, off(kick, t));
```
- The back edge then runs at x 14 on rows 33–34, x 13 on rows 35–36 and x 12 on row 37.
- No 2-px steps remain in any idle or walk frame, and there are no gaps.

**Previews.**
- `hem-9x.png` shows the hem as it is.
- `hem-fix-before-after-8x.png` and `hem-fix-before-after-3x.png` show it as it is (top row) and fixed (bottom row).

### 2. The planted staff skates, and 3-px leans kink it

**Where.** Walk 7, 0, 1, 2 (frames 15, 8, 9, 10). The staff foot `fx` goes 38 → 37 → 36 → 35.

**What's wrong.**
- **The tip slides.** The feet travel 2 px a frame (the near foot 28 → 26 → 24 → 22), and so does the ground. The staff foot moves back only 1 px a frame, so its planted tip slides forward 1 px every frame: 3 px over the plant.
  - `walk-world-space-8x.png` shows this. Each frame is shifted by the body's 2-px advance, so the feet stay in one column, but the staff tip walks to the right.
- **The shaft kinks.** Walk 3 (`tx` 38, `fx` 35) and walk 7 (35/38) lean 3 px. That puts three 1-px jogs in the shaft; on frame 11 they are at rows 9, 20 and 32. At 3× the shaft looks crooked on walks 3–5 (`staff-kinks-8x.png`, `idle-walk-3x.png`).

**Fix (tested).** Plant the staff for two frames, moving at the ground's speed, lift it on walk 2, swing it forward on walks 3–6, and set it down on walk 0. No lean is over 2 px:

| walk | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| `fx` | 37 | 35 | 34 | 35 | 36 | 37 | 38 | 38 |
| `tx` | 35 | 36 | 36 | 37 | 38 | 37 | 36 | 36 |
| `lift` | 0 | 0 | 1 | 2 | 2 | 1 | 1 | 1 |

With this table:
- the tip stays in one ground column on walks 0–1
- the staff stays at least 1 clear pixel from the robe in every frame (with finding 1's hem)
- the hand's knuckle is at x 37, 36, 36, 37, 38, 38, 38, 38 (now 37, 37, 37, 37, 38, 38, 38, 38), so the arm stretches no more than it does now

**Previews.**
- `walk-world-space-staff-variant-8x.png` shows the fixed plant.
- `staff-variant-before-after-7x.png` shows the staff as it is (top row) and fixed (bottom row).
- `all-fixes-walk-before-after-3x.png` shows the whole walk before and after.

### 3. The far foot's toe-off skips a pixel

**Where.** Walk 7 → walk 0 (frames 15 → 8).
- On walk 7, the far foot `bbc` is at x 21–23, with its toe at (23, 38).
- On walk 0, the toe-off `bc` is at x 19–20, with its toe at (20, 38).

The toe moves 3 px in one frame, while the ground moves 2.

**Fix.** On walk 0, use `far: [[19, 2], ...]`, which puts the toe at (21, 38). The near foot's toe-off (walk 3 → 4: toe 25 → 23) is already right.

**Preview.** `hem-lift-3px-9x.png`, left column (walk 0): as it is on top, fixed below.

### 4. The gold clasp pops on idle 1

**Where.** Idle 1 (frame 1), at (23, 18).

**What's wrong.**
- The body rises a pixel while the head waits. The jaw's bottom ink (x 23–26, row 18) then covers the clasp's top-right pixel.
- For one frame the 2×2 gold clasp becomes an L, then it goes back.
- It is gold on navy, right under the face, so it shows as a flicker.

**Fix (tested).** Let the head rise with the body, and keep the lag only on the way down: `head: [0, 0, 0, 0, -1, 0, 0, 0]`. Stamping the clasp after the head would also work.

**Preview.** `clasp-pop-idle1-12x.png` shows idle 0, 1 and 2, as they are (top) and fixed (bottom).

### 5. For the user, not the artist: he now shares the bosses' motif

**The October rule is broken by the user's own choices.** The brief said "no crowned skull in violet (the lich boss and the Bone King)". Two of the user's choices now break it:
- the crown
- the look's tint +46, which turns Soulflame's navy (#363c68 at tint 0) into indigo-violet (#3d2f6f)

**What each of them has:**

| | crown | skull and eyes | robe | staff |
|---|---|---|---|---|
| The Bone King | gold | white, front-facing | violet cape | – |
| The Lich | yes | green eyes | violet, with a gold V | green-tipped |
| The new necromancer | gold | green eyes | violet, with gold trim | yes |

**He still reads as his own man at game size**, because of:
- the skull in profile
- the tall centre spire and the green gem
- the long robe with its gold hem and flap
- the sickle
- his size: the game draws heroes and bosses 1:1, so his 38 px stand against the Bone King's 32-px frame, and he is the biggest of the three

**What to do.** Show the user the comparison: `with-bosses-scene-3x.png` (day and night, with the current necromancer and a minion for scale), `boss-heads-10x.png` and `bosses-3x.png`. If he wants more distance from the bosses, the cheapest lever is his own tint slider.

### 6. The lifted hem corner reads as a shelf (open question 5)

**Where.** Walk 0 and 4 (frames 8 and 12). Hem pixels x 29–33 ride on row 36, with a 4-px ink run under them on row 37.

**What's wrong.**
- At 9× it looks like a gold ledge sticking out.
- On walk 4 there is no foot under it: the far foot is at x 27–29.

**Fix (tested).** Lift only the corner, 3 px: `for (let x = ends[1] - 2; x <= ends[1]; x++)`.
- It then reads as a flick of the hem, and on walk 0 the toe shows under it.
- Keep it to one row. A two-row slope would make the kick bigger than the stride.

**Previews.** `hem-lift-3px-9x.png` and `hem-lift-3px-3x.png`.

## Minor nits

- **The gem's white-hot phase.** This is idle 2–3 and cast 1–3.
  - By day, (24, 9) turns #ffffb3 between #ffad02 pixels. That is close to the crown's own light gold, #ffe95a, so the gem seems to go out rather than brighten.
  - By night it is a nice white glint (`idle-head-day-night-7x.png`).
  - Optional: use `i` on idle 2 only, so it is a one-frame glint.
- **A lone navy pixel at (26, 23) on idle 1–2.** The lagging trim's ink stops at x 25 and the arm's ink starts at x 27, so the robe's `1` shows between them. It is invisible at 1–3×; ink it if you touch that frame.
- **The back of the head is one straight line.** It runs at x 19 from row 7 (the crown) to row 14 (the eyes): 8 rows. At 10× and above this makes the head look like a block.
  - Optional: draw rows 13–14 as Soulflame had them (`.ocdoocooo.` and `.occohcoho.`), so the skull rounds in under the brow (`skull-round-back-12x.png`, `skull-round-back-3x.png`).
  - At game scale the difference is small. Leave it to taste.
- **The hem's gold pattern doubles at the back when it flares.** On walk 0 it reads `oyzz` at x 12–15, row 37. Harmless.
- **The cast (lab only).**
  - Cast 2 (frame 18) loses the burst's top pixel (row −1), and its right ray ends at the cell's edge, x 47.
  - If you want to fix it, centre the burst a row lower on that frame (cy = 8 − lift). It is also fine as it is.
  - The cast reads well: the dip, the raise, the burst, the sparks and the embers (`cast-6x.png`, `cast-3x.png`).
- **The verdict's "speckled 12%".** The picked entry measures 12.2%, which comes from the outline slider. Soulflame in the same look measures 14.7%. No action needed.

## Answers to the open questions

1. **Crowned skull vs. the bosses.** See finding 5. Show the user, and don't change it without him.
2. **Night readability.** Keep the glow as it is.
   - The 28% is measured with no light at all. In the game, the hero carries his own light: `game.js:1536–1537` adds a warm light of radius 125 at full strength and a white light of radius 46 at 0.7, both centred on him. So the player's hero is never in the dark that the measure assumes.
   - A glowing spire or band would bring back a burning head, which is what the user asked to lose. It would also flatten the crown's shading at night.
   - A 2-px gem is not needed either.
   - Night previews: `night-3x.png` (bottom row) and `idle-head-day-night-7x.png`.
3. **The walk ↔ idle hand-off.** Acceptable.
   - The game cuts between cycles anyway, and the idle has to keep Soulflame's pose.
   - With the staff table in finding 2, the walking hand sits at x 36–38 (knuckle), so the jump when he stops is 1–3 px instead of 2–3.
4. **The cast's clipped burst.** It is lab only; see the nit above. Fine either way.
5. **The hem's lifted corner.** See finding 6: one row, 3 px wide.

## Round 2: re-review of the fixed module

I rendered and checked the module itself, `necromancer.js` as it is now, both entries. Round-2 previews are in `...\scratchpad\anim\necromancer-review\round2\`.

### Final verdict: APPROVED

Every round-1 fix is in, and nothing new broke. The sprite is ready for the user. The only open item is the boss likeness, which is his call.

### How I verified it
- **Pixel for pixel against the tested fixes.** The module's 22 frames equal my scratch copy with the round-1 fixes (`allfix.js`), except at (26, 23) on idle 1–2. That pixel is now ink, which is the extra fix the artist made. So every fix behaves exactly as tested in round 1.
- **The lab's measure, picked look.**
  - 38 px tall, 22 frames, 18 colours, outline 99%.
  - Feet on row 39 in all 22 frames.
  - No strays and no doubled ink (inkWall 0).
  - Idle: drift 0.15 px, upper body changes 13% per frame.
  - Walk: bob 2 px, drift 0.62 px, upper body changes 68% per frame.
  - Its notes are the same three as before, and all are known and accepted:
    - "speckled 12%" (12.2%, from the outline slider)
    - "frames in pieces: 19" (the cast's sparks)
    - "night 28%" (answered in open question 2)
- **The glow.** Still 3 pixels: the eyes at (24, 14) and (27, 14), and the gem at (24, 9).

### The round-1 findings, checked one by one

| # | Finding | In the module now | Preview |
|---|---|---|---|
| 1 | The robe's 2-px notches | Gone. My silhouette scan (rows 26–37, staff left out) finds no 2-px step in any of the 22 frames. Before the fix it flagged 9 frames. | `round2/hem-8x.png` |
| 2 | The staff skates and kinks | Fixed. The tip stays in one ground column on walk 0–1. No lean is over 2 px. The staff keeps at least 1 clear px from the robe in every walk frame. The hand's knuckle is at x 37, 36, 36, 37, 38, 38, 38, 38. | `round2/walk-world-space-8x.png`, `round2/staff-walk-6x.png` |
| 3 | The far toe-off skips a pixel | Fixed. The toe goes (23, 38) → (21, 38) from walk 7 to walk 0. | `round2/walk-world-space-8x.png` |
| 4 | The clasp pops on idle 1 | Fixed. The clasp is a 2×2 block on idle 0–4. | `round2/neck-clasp-idle-0-4-10x.png` |
| 5 | The boss likeness | Left to the user, as agreed. | `with-bosses-scene-3x.png` |
| 6 | The hem corner reads as a shelf | Fixed. Only the front 3 px lift, on walk 0 and 4. | `round2/hem-8x.png` |
| nit | The lone navy pixel at (26, 23) | Fixed. It is inked on idle 1–2, and the trim's underside now runs unbroken to the arm. | – |

### Nothing new broke
- **All-frame scans.** Over all 22 frames there are:
  - no outline gaps
  - no lone pixels
  - no out-of-palette letters
  - no 2-px robe steps

  The only thing flagged is the cast nit below, and it was already there in round 1.
- **Loop seams.**
  - Idle 7 → 0 changes 1 px (the gem).
  - Walk 15 → 8 changes 444 px. The other walk steps change 238–429 px.
  - Cast 5 is still identical to idle 0.
- **Walk 6 → 7 changes the least (238 px).** The staff hangs still relative to the body for a frame before it is set down: same `tx`, `fx` and `lift`. In world space it is carried forward 2 px. It reads as "held ready, then planted", so leave it.
- **The idle's timing changed with the clasp fix.**
  - The breath now goes up in one step (0 → 1, 173 px).
  - Idle 1 → 2 changes only the gem (1 px), and the trim settles on 3.
  - The head comes down a frame after the body (4 → 5).

  It is still a 1-px, calm breath, with no jitter (`round2/idle-walk-3x.png`).
- **The walk still reads as walking against the idle at 2× and 3×.** The staff is planted and swung, the hem flares and flicks, the feet step and the body bobs (`round2/idle-walk-2x.png`, `round2/idle-walk-3x.png`).
- **Day and night.**
  - At 1× and 2× the crown and face read as before (`round2/scale-1x-2x.png`).
  - At night the eyes and gem glow as before (`round2/night-3x.png`).
  - Full sheets: `round2/sheet-picked-4x.png` and `round2/sheet-raw-3x.png`.

### What's left (none of it blocks)
1. **The boss likeness (finding 5).** The user should see him beside the Bone King and the Lich.
2. **The cast's shoulder ink (lab only; it was there in round 1 too).**
   - On cast 1–3 (frames 17–19), the raised sleeve's top ink lies right under the mantle's shoulder ink. That makes a 2-row ink block at (29–30, 18–19) on frames 17–18 and one row lower on frame 19.
   - (30, 18) on frames 17–18 and (30, 19) on frame 19 touch no colour.
   - Optional fix: in `ARM_UP`, change row 0 `'o33ooooooo.'` to `'o3322ooooo.'`. The sleeve then shows its fill under the shoulder. Tested: the scans come out fully clean (`cast-shoulder-ink-12x.png`: as is on top, fixed below).
3. **Two stale lines in `necromancer-notes.md`** (documentation only).
   - "Frames 5 → 6 → 7 → 0 change by only 1–11 px" is now 1–8 px. Also, idle 1 → 2 now changes only the gem.
   - "the crowned head itself rises 1 px on frames 2–4" is now frames 1–4.
4. **Optional round-1 nits that were not taken, and don't need to be:**
   - the gem's day glint on idle 2–3
   - the straight back of the head
   - the 1-px clip of the cast's burst
