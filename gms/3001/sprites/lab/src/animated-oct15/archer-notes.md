# Silverleaf, animated · notes (15 October 2026)

`archer.js` animates the picked ranger (polish-d, `../polish-oct15-archer.js`) for the game. I judged it
in the user's look, `FS archer polish-d hue=-19 sat=22 bright=-11 contrast=14 mid=37 warm=40 tint=11 outline=-100`
(entry `silverleaf-picked`). The entry `silverleaf-animated` has the same frames in the drawing's own
colours.

- 88 frames: idle 0-7, walk 8-15, shot 16-23, and shots on the move 24-87 (`attackWalk[shot][walk step]`).
- Every frame faces right in a 48×48 cell, with the feet on row 39 (all 88 frames end on row 39).
- Each frame draws its own ink. Every letter comes from `D_PAL`; no colours were added.
- The quiver, torso, mantle, bow, bow arm, hand and face are Silverleaf's own parts. The hair, the
  legs, the raised arms and the drawing hand are drawn in `archer.js`.

## 1. The hair

**The user said:** "The rear side of rangers hair looks weird and its hard to imagine what hairline
it could belong to."

**What I found wrong with the old lock:**
- **It was shaped like a sack.** It was narrow just under the ear (x 17-21) and widest at its bottom
  (x 14-19, rows 18-20). Hair falls the other way: fullest at the head, thinning towards the ends.
- **It hung from the ear.** Its top had its own ink line (row 10) below the crown, so it read as a
  second object hung behind the head.
- **The ear blocked the scalp.** The ear sat at the skull's top-back corner (tip at row 9), with its
  tip resting on the lock. It covered exactly where the scalp should turn into the falling hair, and
  read a little like a cat's ear or a horn.
- **No hairline showed.** The side of the head was all hair down to the jaw, so the eye found
  nowhere the hair grows from.

**What I tried** (standing frame, compared at 10× and 2-3× in the picked look; scratch previews):

| Try | Result |
|---|---|
| Loose hair falling from the crown, tucked behind a lowered ear | Readable, but the falling mass became a flat slab from crown to shoulder that read as a hood flap or cape. |
| Low ponytail tied at the nape | The hairline was clear, but the head looked small and the tail read as a strap down the back. Her silhouette lost its silver mass. |
| **High ponytail tied at the back of the crown** | **Chosen.** It reads at once as a girl with a ponytail, even at 2×. |

**What she has now:**
- **The ponytail.** The hair is drawn back from the parted fringe (unchanged) over the ear to a gold
  tie at the back of the crown. From the tie, the tail springs up two rows above the head and falls
  behind the ear to the shoulder blades, tapering to a point (`P.tail`). It does the job the plume
  does on the knight.
- **The tie is gold (`q`, with one `j` shade).** It ties into her brooch and bow nocks. I tried teal
  first: in the picked look it turns the mantle's green and disappeared.
- **Head and tail are one mass.** Where the tail lies behind the head (rows 11-17 at the back), the
  head has no ink of its own. Its edge pixels are hair colours sitting on the tail. The only lines
  inside the hair are the ear's ink and the tie's.
  - The tail's inner columns run on under the head, so they stay covered when its lower half swings.
- **Shading.** The tail is lit on its outer edge (`D` near the top, then `C`) and mid grey (`B`)
  towards her back. I removed most `A`: in the picked look `A` and the ink merge into a dark brown
  band that read as a seam.
- **The ear.** It is still the long, pointed, skin-coloured ear, now one row longer (8 rows). Its
  base moved down to eye level (row 16, it was row 14). It sweeps up and back with its tip over the
  tail, just below the tie. It sits on the side of the head now, not on its corner.
- **Under the ear,** the old 3×3 knot of ink and `A` is now `B` hair with one `A` edging the jaw.
- **The face is untouched,** pixel for pixel: the 3/4 view, the jade eyes, the fringe parted over the
  brow.

The ponytail adds two rows on top: the standing bounding box is now x 12-38, y 6-39.

## 2. The animation

### How a frame is built

The parts are drawn back to front:

1. quiver
2. far leg
3. torso
4. near leg
5. bow (and the pulled string)
6. bow arm
7. mantle
8. the drawing forearm, on a full draw (the tail and head then cover its far end and top)
9. the nape: the resting tail's lower half in shadow (`A`), no ink
10. tail
11. head
12. tie
13. ear
14. drawing hand
15. bow hand
16. **ink pass:** any empty pixel touching a coloured one gets ink. This closes the contour wherever
    a moving part leaves an edge bare: a swung lock over a narrower one, or a knee out past the
    thigh above it.
17. **pinhole pass:** any clear pocket of one or two pixels closed in by the figure is inked shut
    (between the legs, between the tail's tip and the quiver). The bow's open belly is far larger
    and stays clear.
18. arrow, string flash, bow glint

The arrow is a deliberate 1-px line and stays uninked: a 3-px inked arrow looks like a rod.

### The tail in motion

The tail's rows above row 15 stay with the head. Rows 15-21 swing back by a table rather than a
rounded shear:

| sway | row 15 | 16 | 17 | 18 | 19 | 20 | 21 |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 1 | 1 | 1 | 1 | 1 | 1 |
| 2 | 0 | 1 | 1 | 1 | 2 | 2 | 2 |

The steps fall on rows 16 and 19, exactly where the tail's own outline steps in. So a swung tail
keeps a straight back edge and a whole, pointed tip. (A rounded linear shear stepped on other rows:
it left a 1-px bump on the back edge at sway 1 and a detached tip pixel at sway 2.)

`lag` moves the swinging rows a row behind the bob:
- +1 means they are still low as the body rises;
- -1 means they are still high as it sinks.

Rows 14 and 15 of the tail are alike, so a lag repeats or hides one of them and the tail stays
whole.

Under the tail lies the nape, so a lifted, swung tail never opens a see-through slit behind her
neck. It shows only in swung frames, as shadowed hair, and the tail covers it at rest.

### Legs

A leg is drawn row by row like her standing legs:

- legging, 2 px (`hj`), from the hip to the knee;
- the boot's cuff at the knee (`kll`);
- the boot, 3 px (`jkk`), down to the ankle;
- the foot, in one of three states:
  - `flat`: the toe forward, with the sole under it;
  - `toe`: heel up, the toe tipping a pixel ahead onto the ground, its sole starting under the toe
    so the heel is clear;
  - `air`: lifted.

The far leg is a shade darker, as her drawn back leg is (legging `hh`, cuff `jkj`, boot `hjj`,
foot `hjjj`).

### Idle

At 6 fps she breathes, rising one row on frames 3-5.
- The tail stirs on frame 1, follows the breath a frame late, and swings its tip a pixel back
  and settles.
- On frame 6 a glint runs down the birch beside the moonstone, at (35, 23). The glowing stone
  itself is left whole.

| i | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| body (`oy`) | 0 | 0 | 0 | -1 | -1 | -1 | 0 | 0 |
| tail lag | 0 | 0 | 0 | +1 | 0 | 0 | -1 | 0 |
| tail tip back (`sway`) | 0 | 1 | 0 | 0 | 1 | 1 | 1 | 0 |
| glint | | | | | | | ✓ | |

Idle frame 0 is the standing study with the new hair, pixel for pixel. Standing, she keeps her drawn
legs (`frontLeg`, `backLeg`: near hip x 26, the far leg set back from x 20). When she rises, their top
row is repeated so they stretch.

### Walk

A stride of 8 frames.
- The body bobs `0 1 0 -1 0 1 0 -1` and is lowest on the down frames.
- The tail trails 1-2 px back and bounces a frame late.
- She carries the lowered bow a row higher than standing, so its tip never reaches the ground row.
- Her bow arm swings a pixel forward while the near leg is back (`ARM_SWING` `0 0 1 1 1 1 0 0`), so
  the bow clears the far foot's reach.

In the near leg's columns below, knee and ankle are relative to the hip. Near hip x 24, far hip
x 25. The far leg runs the same table four frames later.

| w | near leg | knee | ankle (row) | foot | far leg | bob | lag | sway | bow arm |
|---|---|---|---|---|---|---|---|---|---|
| 0 | contact | +2 | +3 (37) | flat | toe-off | 0 | -1 | 1 | 0 |
| 1 | down | +1 | +1 (37) | flat | lift | +1 | -1 | 2 | 0 |
| 2 | passing | 0 | -1 (37) | flat | swing through | 0 | +1 | 2 | +1 |
| 3 | up | -2 | -4 (37) | toe | reach | -1 | +1 | 1 | +1 |
| 4 | toe-off | -3 | -6 (37) | toe | contact | 0 | -1 | 1 | +1 |
| 5 | lift | -1 | -4 (35) | air | down | +1 | -1 | 2 | +1 |
| 6 | swing through | +1 (row 32) | -3 (34) | air | passing | 0 | +1 | 2 | 0 |
| 7 | reach | +2 (row 32) | +3 (36) | air | up | -1 | +1 | 1 | 0 |

- **The stride.** The trailing foot goes well back (-6), so at contact the feet part in a V about
  10 px wide (x 17-31), close to her 13-px stance. The planted foot slides back about 2.25 px a
  frame.
  - The front foot can't reach further than +3: the bow's lower tip is right ahead of it.
- **Swing through.** The knee comes up (row 32) and the lifted foot stays behind (-3, row 34). So in
  passing, the lifted foot and the planted one are two feet, side by side, not one tall boot.
- **Why the hips sit close, the far one a pixel ahead.** With the drawn stance's 6-px hip gap, or any
  gap with the far hip behind, the legs cross in an X at the far leg's contact (w 4). A body turned
  three-quarters to us has its far hip slightly ahead, so with the hips at 24/25 both contacts
  (w 0 and w 4) show a clean V.

### Shot

The shot plays at 14 fps, and the arrow leaves on frame 5 (`attackRelease: 5`).

The legs take a wider archer's stance:
- near hip x 26, ankle x 27;
- far hip x 20, ankle x 17.

The bow rises in three steps:

| arm | bow raised by | bow hand |
|---|---|---|
| `rest` | — (as drawn) | (34, 27) |
| `mid` | 1 right, 3 up (bent arm) | (35, 24) |
| `high` | 2 right, 6 up (arm straight out) | (36, 21) |

The nock and the drawn arrow are on row 20, where the game's arrow flies (z 19). They are on row
19-21 with the walk's bob.

| k | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| beat | lift | nock | draw | to the chin | hold (anchor) | **loose** | follow through | lower |
| arm | mid | high | high | high | high | high | high | mid |
| pull (px) | 0 | 1 | 3 | 6 | 7 | – | – | 0 |
| arrow | | ✓ | ✓ | ✓ | ✓ | | | |
| drawing hand | | fist on the string | fist on the string | fist at the chin + forearm | same, 1 px further | open, flung back behind the jaw under the ear (x 19-23) | sunk behind the shoulder (x 17-20) | |
| string | straight | V | V | V | V | bowed 1 px forward + flash | straight | straight |

- **The forearm (frames 3-4).** Two rows of skin, lit `t` over shadowed `s`, lie directly under the
  jaw's ink. The forearm is inked only underneath and slopes a row down towards the elbow hidden
  behind her. The fist's wrist is open into it.
  - It replaced a 1-row pink stripe between two ink rows, which read as a collar or scarf at game
    size.
- **The arrow keeps its length** (14 px nock to point). Drawing it back brings the head from the
  cell's edge (frame 1) to two pixels past the bow (frame 4).
- **The pulled string** runs from each nock through the drawing hand. The bow's own straight string
  is hidden only in rows 3-17 of the bow part, where it leaves the limbs, so the limbs' tips keep
  their ink.

### Shots on the move

`attackWalk[k][w]` puts shot `k`'s upper body on walk step `w`:
- the arm, bow, string, hands and arrow from the shot;
- the legs, bob and tail (sway and lag) from the walk.

Only the lowered bow (`rest`) is carried and swung while walking; raised, it rides the bob.

## Round 2: the review's findings (`archer-review.md`)

| # | Finding | Fix |
|---|---|---|
| 1 | The swung tail jags (1-px bump on its back edge) and its tip comes loose | Swing table stepping where the outline steps (above). The back edge is now monotonic in all 88 frames. |
| 2 | A see-through slit behind the neck when the tail lifts and swings | The nape of shadowed hair under the tail. The reviewer's hole check finds no hole left of the bow in any frame. |
| 3 | The drawing arm reads as a scarf; the loose hardly moves | The forearm drawn as a limb (above). On the loose, the open hand is flung 6 px back behind the jaw, with no forearm. Eased, it sinks behind the shoulder. |
| 4 | The stride is short, and passing stacks the feet | The trailing foot goes back to -6 (the reviewer's table). Swing through: knee up, foot kept behind (-3, row 34) instead of the trial's (-1, 34), whose knee-to-ankle jump of 3 px broke the shin. |
| 5 | The drawn arrow is a row below the game's | The `high` pose is raised a row; the arrow is on row 20. |
| 6 | The glint whitens a glowing moonstone pixel | The glint is on the birch at (35, 23). Both `G` pixels stay. |
| 7 | The bow tip touches the feet and the ground while walking | The bow is carried a row higher and swung a pixel forward while the near leg is back. The bow's ink now clears every foot by at least a pixel, and its tip ends on row 37 at the lowest. |

The nits:
- The pinholes are inked shut.
- The walk-7 sole stub is gone with the new toe sole.
- The `toe` heel lifts.
- Idle frame 1 stirs the tail.

## Round 3: the last nits

- **The swung shoulder.** On walk frames 2-5 the bow arm's ink on its top two rows is left out. It stood
  a pixel outside the cape's ink, making a 2-px wall.
- **The full draw.** The forearm's top row under the neck, (25-26, 20 + bob), takes the neck's shadow
  `s`, a hint of the jaw over the arm.
- **The toe against the bow tip on walk 3.** In this build the reaching toe's ink is at (32, 37) and
  the swung bow's last pixel at (34, 36). A scan of all 88 frames finds no leg pixel touching the bow
  at a corner only, so nothing was changed there.

## Checks

These are scratch scripts, not in the repo, plus the reviewer's `checks.mjs`:

- **Edges.** In all 88 frames, every coloured pixel on the sprite's edge is ink, except the arrow's
  shaft, fletching and head (rows 19-21) and the string flash on frame 5.
- **Holes.** None, apart from the bow's belly (between the string and the limbs).
- **Pixels.** No lone pixels, no ink spurs, and no colours outside `D_PAL`.
- **Feet.** Every frame's lowest row is 39.
- **Idle frame 0** equals the drawn parts (with the new hair) pixel for pixel.
- **Sanity check.** The module check prints, for each entry: `88 true` and the moonstone's glow.

## Open questions and doubts

- **The ponytail is a change of hairstyle,** not just a fix: loose hair became hair tied back. The
  user is to be told so.
  - If the user wants the hair loose, the best loose try is described above.
  - The tail is one part (`P.tail`), so another style can replace it without touching the animation
    (the swing table assumes its outline steps at rows 16 and 19).
- **The gold tie** shows as orange in the picked look, like her brooch and nocks. Teal vanishes into
  the mantle.
- **The arrow is kept at 14 px.** The reviewer suggested 12, to match the game's 12-px arrow sprite.
  At 12 the point of the fully drawn arrow would sit on the bow's own ink. At 14 it shows two pixels
  past the bow, as a drawn arrow's head does.
- **The drawing hand** still appears on frame 1 and leaves after frame 6 without an arm, which is
  acceptable at 14 fps.
- **The ear** is left as it was. The reviewer's optional wider root was not tried.
- **The menu portraits** (`public/img/archer-scene.png`, `archer-figure.png`) still show the old hooded
  man, as the designer's notes already flagged.
