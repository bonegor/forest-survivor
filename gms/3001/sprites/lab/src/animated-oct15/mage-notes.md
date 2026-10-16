# Grand Archmage, animated · notes (15 October 2026)

`mage.js` animates the picked sorcerer (polish-a, `../polish-oct15-mage.js`) for the game, judged in
the user's look `FS mage polish-a hue=-9 sat=41 bright=-4 contrast=21 mid=23 warm=40 tint=-15 outline=-100`
(entry `grand-archmage-picked`; `grand-archmage-animated` is the same frames in the drawing's own colours).
22 frames: idle 0-7, walk 8-15, cast 16-21. Facing right, 48×48, feet on row 39, ink drawn in.
Idle frame 0 is the drawing pixel for pixel.

## What changed from the first draft, and why

| Draft weak spot | Now |
|---|---|
| The staff leaned by shifting its 4-px column row by row, so a lean showed as kinks. | The shaft is always upright, so it never shows a stair-step. It moves along the ground with the fist (`x`) and lifts (`lift`). A lean (`foot`: the shaft under the fist 1 px to either side of the shaft above) puts its one step inside the fist, where it doesn't show. |
| The hem's swing sheared whole rows, so the gold edge zig-zagged and the trim got a notch. | Each skirt row (31-37) is cut into three pieces: the back panel, the middle (fold and gold edge, which never move) and the front (lining, dark front, ink). The back trails or draws in by stretching or trimming its last colour. The front pushes out by stretching its dark side, or draws in by narrowing the lining. Every profile is a clean slope with no step over 1 px. The gold trim (row 37) is built the same way, so it never breaks. |
| The walk read weakly because the robe hides the legs. | The walk now has several cues: the hem alternates wide and narrow (front pushed out up to 3 px, back trailing 2 px, then the back drawn in at passing while the front hangs straight); the front of the hem kicks up a row on each contact (near leg and far leg), showing the boot and a slot of ground under it; the boots step back under the hem; the body bobs over a 2-px range; the staff is planted, walked past, lifted 2 px and swung forward, so the bright orb traces a loop; the fire's tongues stream back. |
| The head, hat and beard didn't lag. | The hat's cone follows the body a frame late. Rows 8 and 9 share an outline (x 21-27), so the cone's top (rows 3-8) rides a row down (row 9 dropped: squash) or up (row 8 doubled: stretch). The base pair (rows 10-11) is never touched. The beard's tip (rows 25-27) swings back a pixel; the robe colour `2` fills where it was, and ink goes under its point on the belt. |
| The cast was simple. | The cast now runs: sink as the fire swells; rise into a blaze twice the size, lifting the staff; flare with three embers while the staff's top tips forward; a spent small flame with the embers flung further out; the flame regrows; settle. |

Other changes:

- **Breathing seam.** Rows 29 and 30 of the robe are identical, so the body rises or sinks by adding or dropping a row there. The robe stretches instead of parting.
- **Fist.** The fist on the staff moves with the staff. Moving forward, the forearm reaches out of the sleeve in the sleeve's dark blue `1`. The sleeve's end (x 32) is always inked.
- **Seal pass.** After a frame is composed, every empty pixel that touches a coloured one (fire excepted: it has its own ember rim) gets ink, so no seam shows bare colour.
- **Fire.** I redrew it by hand. The body (rows 17-20) is the drawing's. Idle has 6 tongue shapes; frames 6 and 7 reuse shapes 1 and 4 with a shimmer in the body (4-5 frames apart, so the repeat doesn't show). The walk has 4 shapes with the tongues streaming back. The cast has swell, blaze and spent. Each tongue's fill sits inside its `r` rim.
- **Ember in the cup.** It shimmers (`orb` 1: white-hot, 2: its light slides a pixel).
- **Double ink.** The staff never stands exactly one pixel off the robe's front or the shoulder; it either clears them by two or more or overlaps them, so two inks never sit side by side. That is why the walk's fist stays at x 0..+2 and the cast never pulls the staff back past x 0.

## Pose tables

Offsets are in pixels. `up`: the body, down positive. `cone`: the hat's cone against the head. `x/foot/lift`: the staff's fist column, the shaft under the fist, and the lift.

**Idle** (6 fps): breathing up on 3-5, the cone a frame late, the fire through 6 shapes (frames 6-7 repeat shapes 1 and 4 with a shimmer).

| i | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| up | 0 | 0 | 0 | -1 | -1 | -1 | 0 | 0 |
| cone | 0 | 0 | 0 | +1 | 0 | 0 | -1 | 0 |
| flame | I0 | I1 | I2 | I3 | I4 | I5 | I1 + shimmer | I4 + shimmer |
| orb | – | – | 1 | 1 | – | – | 2 | 2 |

**Walk** (8 frames, two steps): contact (0), down (1), passing (2), up (3), then the far leg. Hem profiles are listed for rows 31-37. FRONT 3 = `0,0,1,1,2,2,3`, 2 = `0,0,0,1,1,2,2`, 1 = `0,0,0,0,1,1,1`, 0 = straight. BACK 2 = `0,1,1,2,2,2,2`, 1 = `0,0,0,1,1,1,1`, -1 = `0,0,0,0,-1,-1,-1`.

| w | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| up (bob) | 0 | +1 | 0 | -1 | 0 | +1 | 0 | -1 |
| cone (a frame late) | -1 | -1 | +1 | +1 | -1 | -1 | +1 | +1 |
| beard tip | 0 | -1 | -1 | 0 | 0 | -1 | -1 | 0 |
| hem front / back | 3 (kicked up) / 2 | 2 / 1 | 0 / -1 | 1 / 0 | 1 (kicked up) / 2 | 2 / 1 | 0 / -1 | 1 / 0 |
| near boot x | 30 | 28 | 26 | 24 | 21 | – | – | – |
| far boot x | 20 | – | – | – | 29 | 27 | 25 | 23 |
| staff x / foot / lift | 2/3/0 | 2/2/0 | 1/1/0 | 1/0/0 | 0/0/1 | 1/1/2 | 2/2/2 | 2/3/1 |
| fire (trail) | T1 | T3 | T2 | T0 | T1 | T3 | T2 | T0 |

A dash means the boot is lifted and hidden under the hem. The far step pushes the front less (+1, then +2) than the near step (+3, then +2), because the staff's foot is at its back-most point on frame 4 and the robe's ink must clear it. The staff is planted ahead and leaning back (0), walked past until it leans forward (3), then lifted and swung forward (4-7). The fist rises with the lift.

**Cast** (13 fps):

| k | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| up | +1 | -1 | -1 | 0 | 0 | 0 |
| cone | -1 | +1 | 0 | -1 | 0 | 0 |
| fire | swell | blaze | blaze + embers | spent + embers further out | idle I5 | idle I0 |
| staff x / foot / lift | 0/0/0 | 0/0/1 | 2/1/1 | 2/1/0 | 1/1/0 | 0/0/0 |
| orb | 1 | 2 | 1 | 2 | – | – |

## Review round 1 (mage-review.md): what changed

1. **The walk limped.** Only the near step kicked. Now the far step has its own kick: frame 12 has front +1 with the hem lifted over x 25-32 and the far boot under it, and frame 13 has front +2. The staff still clears the robe by a pixel or more.
2. **Cast 17-18: the blaze touched the hat's brim.** The blaze's 6th row now ends a pixel shorter, so its right shoulder starts a row lower. The flame no longer touches the brim corner, and the pocket by the face stays open.
3. **Cast 19: an ember sat on the hat.** I moved it to (15,4)/(16,5), 2 px or more clear of the cone.
4. **The beard's swung point lacked ink.** On the swing frames there is now ink under its point on the belt, at (24, 28+up).
5. **The squash left single pixels.** The squash now drops source row 9, so the cone's base pair (rows 10-11) keeps its 2-px clusters. The stretch doubles row 8, so there is no cylinder at the base.
6. **The front tucked under at passing.** Passing frames 10 and 14 now hang the front straight (front 0) and only draw the back in.

The reviewer's answers I followed: no forward lean and no 2-row kick (either would shear the gold stripe or need leg pixels). The staff foot's skate and the idle-to-walk staff step stay as they are.

## Checks run

- The module check (`gen()` for both entries: 22 frames, all 48×48, glow lists as expected).
- A lint (scratch `check.mjs`): idle 0 differs from the drawing in 0 pixels; no colour outside the palette; no stray pixels; no bare colour beside empty; no 2×2 ink clumps; no ink floating without colour.
- I looked at every frame at 7-8× and the walk at 2× and 3× on the forest floor (walk strip over the idle strip).

## Unsure / open

- **Ground speed.** The boots slide back 2 px per frame. The planted staff's foot skates against the game's 7 px per frame; the reviewer judged that fine, since the plant-and-lift loop is what reads.
- **Cast.** It is shown only in the Sprite Lab. It still reads more as the fire flaring and dying than as a throw: the palm never pushes and no ball leaves. This is optional polish.
