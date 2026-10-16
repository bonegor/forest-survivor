# Silverleaf, animated · review (15 October 2026)

**Final verdict (round 2, 16 October): APPROVED.** All seven findings are fixed in the module output;
three optional nits remain (see "Round 2" at the end).

**Round 1 verdict: CHANGES NEEDED.**

The new hair works. With the high ponytail tied at the crown, you can see where her hair grows from, and
it still reads as Silverleaf (silver mass, long ear, untouched 3/4 face with jade eyes). Every measure
passes: feet on row 39 in all 88 frames, no stray pixels, every colour from `D_PAL`, idle bob 1, walk bob 2,
drift 0.1/0.24 px, night 49% (the design itself has 48%).

What still needs work: the ponytail breaks up as soon as it moves. Its edge jags in every walk frame and
three idle frames, its tip comes loose in four walk frames, and a see-through slit opens behind her neck.
That is the user's own subject, so it has to be clean. The drawing arm also reads as a scarf under her chin.

I judged everything in the picked look (`silverleaf-picked`). Coordinates are cell pixels (x, y), with
y 39 as the feet. Frames are numbered by sheet index: idle 0-7, walk 8-15, shot 16-23, attackWalk 24-87
(`aw[k][w]` = 24 + 8k + w).

Previews are in `<scratchpad>/anim/archer-review/`
(called `R\` below). Previews with a grid show axis numbers every 5 px.

## Findings

### 1. The ponytail jags and comes loose whenever it swings (must fix)

The shear in `tail()` (`x - Math.round(sway * t)`, per row) steps on different rows from the ones where
the tail's own outline steps in (rows 16 and 19 of `P.tail`). The two steps cancel or add up, so:

- **sway 1: a 1-px bump on the tail's back edge.** The edge runs x 14 → 13 → 14.
  - (13,17) in idle 4, 5, 6 and walk 0, 4.
  - (13,18) in walk 3, 7.
  - The same in every attackWalk frame on those walk steps.
  - It flickers on and off at 12 fps, so the back of her hair shimmers as she walks.
- **sway 2: the tail tip comes loose.** The last coloured pixel is a single `B` boxed in ink on all four
  sides, joined to the tail only at a corner.
  - (14,20) in walk 1 and 5 (also notch (13,19)).
  - (14,21) in walk 2 and 6 (also notch (13,20)).
  - The same in 32 attackWalk frames.
  - At game size the tip reads as a loose grey speck under the tail.
- Previews:
  - `R\tail-tip-16x.png` (frames 4, 6, 8, 9, 10, 11)
  - `R\tail-walk-10x.png` (all 8 walk frames)

**Fix (tested in a scratch copy, `R\archer-try-napeA.js`).** Use a per-row offset table for tail rows
15-21 that steps exactly where the outline narrows, instead of rounding a linear shear:

```js
const SWING = { 0: [0,0,0,0,0,0,0], 1: [0,1,1,1,1,1,1], 2: [0,1,1,1,2,2,2] }; // tail rows 15..21
// in tail(): const off = ry <= TAIL_PIVOT ? 0 : SWING[sway][ry - TAIL_PIVOT - 1];
//            G.put(x - off, ry + oy + (ry > TAIL_PIVOT ? lag : 0), [r]);
```

With it, the back edge is straight then tapers in all swung frames, and the tip stays attached.
Previews: `R\trial-offsets-16x.png`, and `R\walk-tail-now-6x.png` against `R\walk-tail-trial-6x.png`.
Hand-drawn lower halves for sway 1 and 2 would do just as well.

### 2. A see-through slit opens between the ponytail and her neck (must fix)

When the tail tip lifts (`lag -1`) and swings back, it uncovers the space behind the neck. The background
shows through as a closed diagonal hole inside the silhouette:

- (18,18), (17,19), (16,20) in idle 6, walk 0 and walk 4;
- (18,19), (17,20) in walk 1 and walk 5;
- the same in 32 attackWalk frames (`aw[*][0,1,4,5]`).

At game size it shows as a dark crack between the hair and the collar. Previews: `R\tail-tip-16x.png`
(frames 6 and 8), `R\idle-b-8x.png` (frame 6).

**Fix (tested in the same scratch copy).** Before the tail is drawn, put down a nape: the resting tail's
rows 17-21 with the ink removed and every hair colour set to `A`:

```js
rows.forEach((r, j) => { const ry = y + j; if (ry >= 17) G.put(x, ry + oy, [r.replace(/o/g, '.').replace(/[CDB]/g, 'A')]); });
```

The tail covers it at rest, so frames 0-3, 7 and 16-23 stay identical. In the swung frames it fills the
slit with shadow-coloured hair. The hole check then finds no holes behind the neck in any frame. The
trial changes only 4-10 px in each swung frame. Preview: `R\trial-napeA-16x.png`.

### 3. The drawing arm reads as a scarf, and the loose barely moves (should fix)

- **The forearm band is buried in ink.** On frames 19-20 (and `aw[3]`, `aw[4]`), the forearm
  (`ooooo / tssto / ooooo`) lies over the mantle collar, 3 rows below the chin: x 24-28 on frame 19, x 23-27
  on frame 20, rows 21-23.
  - Rows 19, 20, 21 and 23 under the face are all ink.
  - New 2×2 ink blocks appear at (23-26, 20-21); idle 0 has only the inherited ones at (22-23, 19).
  - At game size this is a dark collar with a pink stripe, not an arm. Previews: `R\chin-20x.png`
    (frames 0, 20, 21 side by side), `R\shot-draw-loose-5x.png`.
- **The release hand hardly travels.** On frame 21 (the loose) the open hand only moves 2 px back
  (x 26-29 → 24-28) and gains a band at x 21-25, row 22.
  - With the arrow gone, she looks like she is holding a bar across her chest.
  - Frame 22 puts the fist on the mantle at x 23-26, rows 21-24.
- **Suggested fix:**
  - Frames 19-20: drop the forearm's top ink row. Draw it 2 rows thick (`ttt` over `sss`) directly under
    the jaw ink, inked only on its lower edge and sloping 1 row down toward the hidden elbow, so it reads as
    a limb.
  - Frame 21: drop the forearm and fling the open hand 4-5 px back, behind the jaw under the ear base
    (about x 19-23, rows 18-21), so the release snaps.
  - Simplest alternative: no forearm at all, only the fist at the anchor and the open hand behind the jaw.
    The string's V already sells the draw at game size.

### 4. The walk's stride is narrower than her standing stance, and passing stacks the feet (should fix)

- **Narrow stride.** At contact the ankles are 6 px apart (near 27, far 21; feet span x 21-31). Standing,
  her feet span x 17-30, and Lyra's contact is 11 px (ankles 18/29).
  - The far foot jumps 4 px forward as she starts walking.
  - At 12 fps the planted foot moves only 1-2 px a frame while the ground moves about 6.7 px a frame
    (speed 80.5 px/s), so she shuffles and skates more than Lyra did (2-3 px a frame).
  - Previews: `R\stand-vs-walk-legs-12x.png` (frames 0, 8, 12, 16), `R\walk-legs-12x.png`.
- **Stacked feet in passing.** Frame 14 (walk 6) puts the swinging near foot (ankle x 25, row 35) exactly
  over the planted far foot (ankle x 25, row 37). The near foot (row 36), an ink line (row 37) and the far
  foot (row 38) stack into one tall boot, and the leg reads as one. On frame 10 (walk 2) the far leg is a
  1-px `j` sliver at x 29, rows 33-34.
- **Why not reach further forward:** the bow's lower tip sits at x 32-34, rows 37-38, so a longer forward
  step runs into it.
- **Suggested fix:** keep contact at +3 and take the trailing foot further back. Tested in
  `R\archer-try-stride.js`; previews `R\trial-stride-legs-12x.png`, and `R\walk-now-4x.png` against
  `R\trial-stride-4x.png`:

  ```js
  { knee: [2,33],  ankle: [3,37],  foot: 'flat' },  // contact
  { knee: [1,33],  ankle: [1,37],  foot: 'flat' },  // down
  { knee: [0,33],  ankle: [-1,37], foot: 'flat' },  // passing
  { knee: [-2,33], ankle: [-4,37], foot: 'toe' },   // up
  { knee: [-3,33], ankle: [-6,37], foot: 'toe' },   // toe-off
  { knee: [-1,33], ankle: [-4,35], foot: 'air' },   // lift
  { knee: [2,33],  ankle: [-1,34], foot: 'air' },   // swing through: foot behind and higher, no stacking
  { knee: [2,32],  ankle: [3,36],  foot: 'air' },   // reach
  ```

  - The contact V then spans about 10 px (x 17-31) with no X crossing.
  - The planted foot moves about 2.25 px a frame.
  - The passing frames show two feet.

### 5. The drawn arrow is a row below the game's arrow (minor)

- The drawn arrow lies on row 21 when she stands (20-22 with the walk bob).
- The game spawns the real arrow at z 19 from the muzzle (`y - 1`), so its shaft is on row 20, as Lyra's
  drawn arrow was (`gripY - 1` = 20). At release the arrow jumps up 1 px, or 2 on bob +1 steps.
- Fix: raise the `high` pose one row (bow `[2,-6]`, arm at y 21, hand `[36,21]`). That puts the nock and
  arrow on row 20. Preview: `R\shot-a-8x.png`.
- Not for the artist: the game centres the real arrow on the hero (x 24, `muzzle` in weapons.js) and draws
  projectiles over the actors. For its first ~2 ticks the 12-px arrow sprite (x 18-29) covers her face and
  chin. This is game code; Lyra had the same.

### 6. The moonstone glint dims the stone at night (minor)

- Frame 6 sets the stone's upper pixel (36,24) from `G` to `D`. Only `G` glows unlit, so for 0.27 s of each
  idle loop the stone loses half its glow at night, and the glint pixel itself is shaded dark.
- Fix: leave both `G` pixels alone and put the glint on the limb beside the stone, e.g. (35,23) `W` → `D`.
  Preview: `R\idle-b-8x.png` (frame 6).

### 7. The bow tip touches her feet and the ground in the walk (minor)

- Walk 0 and 4: the forward toe's ink (31,38) touches the bow tip's ink (32,37) at a corner, closing the
  space between leg and bow.
- Walk 3 and 4: the forward foot's ink and the bow tip's ink run together into a 2-px wall at x 31-32, rows
  34-37.
- Walk 1 and 5 (bob +1): the bow tip's ink lands on the feet row, (33,39), so the bow scrapes the ground.
- Fix: carry the bow 1 row higher on walk frames (or only on the bob +1 steps), or end the forward foot one
  pixel shorter. Preview: `R\walk-legs-12x.png`.

## Minor nits

- **Pinholes (single clear pixels closed in by ink):**
  - between the legs: (25,37) walk 0, (23,32) walk 1, (26,36)-(26,37) walk 3, (25,35) walk 5;
  - between the tail tip and the quiver fletching: (15,22) walk 2 and 6, (14,21) walk 3 and 7;
  - the same in the matching attackWalk frames.

  Fill them with ink or the colour beside them.
- **Ink stub on walk 7:** (27,39). The far toe's sole ink runs on under the near foot's sole ink, making a
  2-px ink step. Trim the far sole to x 23-26 on that frame.
- **The `toe` foot doesn't lift its heel.** The sole ink still starts under the heel (`ax`, 39), so walk 3
  and 4 read flat-footed. Start the sole at `ax + 1` and leave the heel pixel clear.
- **The idle holds still for a long time.** Frames 7, 0, 1 and 2 are identical (1.07 s at 3.75 fps), and
  frame 4 equals frame 5. It is calm, not jittery; optionally give frame 1 a 1-px tail-tip sway (clean once
  finding 1 is fixed).
- **The drawing hand appears and disappears without an arm.** It pops in on frame 17 as a fist with no arm,
  over the bow arm at x 32-35, and vanishes after frame 22 (frame 23 is identical to frame 16). At 14 fps
  this is acceptable; mention it only if the user notices.
- **Arrow length.** The drawn arrow is 13 px visible (`ARROW = 14`); the game's arrow sprite is 12 px
  (items.js). Making it 12 would match the arrow that flies, and the nock-frame tip would end at x 45, not
  the cell edge.
- **Inherited figures.** The 20% speckle note and the 5-6% doubled ink come from the design (polish-d
  measures 19% and 4-5%) and from the 1-px bow string. Not the animation's doing.
- **The ear at game size.** It is a uniform 2-3-px band at 45°, so at 3× it can read as a pink strap
  running from the tie to the cheek. A one-pixel wider root (one more `t` on rows 15-16) and a crisper tip
  would make it read more clearly as an ear. Optional.

## Answers to the open questions

1. **Ponytail as a change of hairstyle.** Keep it. At rest it answers "what hairline": the hair is drawn
   back from the parted fringe over the ear into a visible tie, and the tail rises from it and falls behind.
   It reads at 3× and 6× (`R\hair-before-after-12x.png`, `R\stand-before-after-6x.png`,
   `R\head-f0-20x.png`). Show the user the before/after and say plainly that it is a style change, with the
   loose-hair try as the fallback. It only becomes approvable once findings 1 and 2 are fixed.
2. **The gold tie showing orange.** Keep `q`. In the picked look the brooch (28,21-22) and both bow nocks
   are the same orange, so the tie reads as part of her kit. At game size it is the only thing that marks
   the tie, and teal disappears into the mantle, as you found.
3. **The drawing arm (hand and short forearm).** Yes, at game size it reads as a scarf or collar: see
   finding 3 for the cause and fix. Leaving out the far elbow is right.
4. **Frames 3 and 4 differ by one pixel of pull.** That is fine as a hold at 14 fps (143 ms). A 1-px
   inward flex of the bow tips on frame 4 would add tension, but it isn't needed.
5. **The arrow point touching x 47 on the nock frame.** Harmless; the pixel is inside the cell and mirrors
   to x 0. A 12-px arrow (see the arrow-length nit) brings it to x 45 and matches the game's arrow.
6. **The menu portraits** (`public/img/archer-scene.png`, `archer-figure.png`). These are out of this
   sheet's scope; agreed they need redoing so the menus match the new ranger.

## Verified as clean

- Feet on row 39 in all 88 frames.
- Walk loop seam 15 → 8: reach at row 36, then contact at row 37, smooth.
- Idle loop seam 7 → 0: identical frames, no jump.
- Legs meet the torso hem in every frame; no gaps at the waist in any attackWalk frame.
- Exactly one bow per frame.
- All 24 colours come from `D_PAL`.
- Face pixels at x ≥ 24 match the design exactly.
- The shot reads at 3× (`R\shot-3x.png`): lift, nock, draw, hold, loose with string snap and flash,
  follow-through, lower.
- Release on frame 5, as `attackRelease` expects; anticipation frames 0-4 at 71 ms each.
- The attackWalk rows hold together at 4× (`R\aw-0-1-4x.png`, `R\aw-2-3-4x.png`, `R\aw-4-5-4x.png`,
  `R\aw-6-7-4x.png`, `R\aw4-8x.png`).

The scratch trials (`R\archer-try-*.js`) are copies with absolute imports. They are not in the repo and
only demonstrate findings 1, 2 and 4.

## Round 2 (16 October 2026)

**Verdict: APPROVED.**

I re-rendered all 88 frames from the current `archer.js` myself, including the 64 attackWalk frames, in
the picked look and in her own colours. I re-ran the lab's measure check and my own scans.

New previews are in the same folder `R\`. My scan output is in `R\checks-r2-mine.txt`.

### Checks re-run

- **Lab measure, picked look:** 34 px tall, outline 97%, night 49%.
  - Feet on row 39 in every idle, walk and shot frame.
  - Idle bob 1 / drift 0.11; walk bob 2 / drift 0.46; shot drift 0.52.
  - No stray pixels, no frames in pieces.
  - The only note is the speckle (19%), inherited from the design (its own measure is 19%).
- **Colours:** all 24 letters from `D_PAL`. `G` appears 176 times, so the moonstone is whole in every frame.
- **Holes:** the only closed clear areas left are inside the bow, between bow and string.
- **Loop seams:** idle 7 → 0 identical; walk 15 → 8 continuous (reach at row 36 to contact at row 37).
- **Idle:** frame 1 flicks the tail 1 px and frame 2 settles it. Still calm; nothing jitters.

### The seven findings

1. **Tail jags and loose tip: fixed.**
   - With `SWING`, the back edge only ever steps inward in every swung frame. Examples: idle 6 runs
     x 13 → 14 → 15 → 16 down the tail; walk 1 runs x 13 to row 20, then 14.
   - The tip stays attached by an edge: in walk 2 the tip `B` at (14,21) sits under `C` at (14,20).
   - Previews: `R\r2-tail-idle-12x.png`, `R\r2-tail-walk-12x.png`.
2. **Neck slit: fixed.** The nape (`A`) fills it.
   - In idle 6 and walk 0/4 it shows as a 1-px dark crease at (18,18), (17,19), (16,20).
   - In walk 1/5 it is a 2-px shadow.
   - No background shows through behind the neck in any frame.
3. **Drawing arm: fixed.**
   - Full draw (19-20): a two-row skin forearm under the jaw, inked only below. At 2-3× it reads as an
     arm drawn to the chin, not a scarf.
   - Release (21): the open hand jumps back ~6 px to behind the jaw, under the ear, so the loose snaps.
   - Follow-through (22): the fist settles behind the shoulder by the quiver, as if reaching for the next
     arrow. That reads well.
   - Previews: `R\r2-chin-20x.png`, `R\r2-shot-a-8x.png`, `R\r2-shot-b-8x.png`, `R\r2-shot-3x.png`,
     `R\r2-shot-2x.png`.
4. **Stride: fixed.**
   - The contact V spans about x 17-31, and the planted foot moves 2-3 px a frame.
   - The passing frames show two separate feet: the lifted one behind and higher.
   - The artist's swing-through change (knee +1 on row 32, ankle -3 on row 34) keeps the shin whole.
   - The toe-off heel now clears the ground (the sole starts at `ax + 1`).
   - Previews: `R\r2-walk-legs-12x.png`, `R\r2-walk-a-8x.png`, `R\r2-walk-b-8x.png`, `R\r2-walk-3x.png`,
     `R\r2-walk-2x.png`.
5. **Arrow row: fixed.** Standing, the nock and arrow are on row 20, matching the game's z 19 arrow.
   Walking they ride the bob (19-21).
6. **Moonstone glint: fixed.** It is now on the birch at (35,23); both `G` pixels stay lit.
7. **Bow tip against feet and ground: fixed.** With the bow carried a row higher, the tip ink is clear
   of the ground row and, in walk 0 and 4, a pixel clear of the forward toe.

Every attackWalk row holds together at 3× and 8×: no gaps at the waist, one bow, one drawing hand.
Previews: `R\r2-aw-0-3-3x.png`, `R\r2-aw-4-7-3x.png`, `R\r2-aw-4-5-8x.png`.

### Optional nits (none blocks approval)

- **Doubled ink at the shoulder in walk 2-5.**
  - When the bow arm swings 1 px forward, its top-left ink lands just outside the mantle's edge ink.
  - This makes a 2-px ink wall at (30-31, 22-23) on walk 2 and 4, (30-31, 21-22) on walk 3, and
    (30-31, 23-24) on walk 5.
  - Fix: on swung frames, skip the arm pattern's column-0 ink in its top two rows, or don't shift those
    two rows. Preview: `R\r2-shoulder-16x.png` (frames 0, 8, 9, 10, 11, 13).
- **Bow tip at the foot in walk 3.** The reaching far foot's toe ink (32,37) touches the swung bow tip's
  ink (33,36) at a corner. Dropping the arm swing on walk 3 alone (`ARM_SWING[3] = 0`) would separate
  them, but check that the foot then doesn't run into the unswung tip.
- **Chin at full draw.** The chin's two shadow pixels (25,19)-(26,19) sit directly on the forearm's top
  row, so the jaw line opens for 2 px in frames 19-20 and `aw[3]`/`aw[4]`. It reads as the chin resting on
  the arm, which is fine for an anchor. If wanted, make (25,20)-(26,20) `s` to keep a hint of the jaw.

Also seen and acceptable as they are:
- The filled pinholes by the tail tip and quiver now show as small ink clumps, at (14-15, 21-22) in walk
  2, 3, 6 and 7.
- On the release frame, the ink between the ear and the open hand forms a 2×2 dark block at (20-21, 17-18).
