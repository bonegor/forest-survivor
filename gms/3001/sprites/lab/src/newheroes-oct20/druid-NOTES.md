# Druid · v1: Bramwyn

`lab:druid/v1`, collection "New heroes". Source: `druid.js` here. It imports the shared `../remaster-v5/kit.js` unchanged, so there's no kit-druid.js.

Build:
`node gms/3001/tools/build.mjs gms/3001/sprites/lab/src/newheroes-oct20/druid.js`

> 36 px tall · 22 frames (idle 8, walk 8, attack 6) · 25 colours · outline 100% · night 64%
> ! attack: bobs 5 px

The attack warning comes from the staff, which goes over his head on the wind-up. His feet stay on row 39 in all six frames.

## The design

**Silhouette: antlers.** Two pale antlers fork up out of a wreath of autumn leaves on a bark-brown hood. Each antler is a 3-px beam that splits into two tines, and the tips are on row 5. The hood itself tops out on row 12 (27 px above the feet).
- The sorcerer has a pointed hat and the necromancer a crowned skull. Nothing else in the team has a forked crown.

**Colour: warm, not green.**
- **Robe:** bark brown, its own ramp: '1' #c4915f, '2' #9c6a45, '3' #7e5038, '4' #593628. '3' sits just over the night line, so the robe's shadow side still reads at night.
- **Hood:** one step darker than the robe, so the face and antlers stand out against it.
- **Mantle:** a capelet of autumn leaves (orange o/O and gold t/d in a staggered checker, rust on the shadow side, two green leaves).
- **Green:** only the mossy hem (e) and the glows.
- **Everything else:**
  - an ash-grey beard (A/a)
  - linen leg wraps (T/t)
  - bark boots
  - a dark leather belt with an amber seed for a clasp (y, which glows).

**Staff:** gnarled wood (B/b) with a 1-px crook halfway up and two knots. At the top, a claw of roots holds a seed-crystal (gold Y, amber y, with a white glint that pulses). Green shoots (l) sprout off the claw.
- **Emissive:** `Yyl`.

**Legs:** the robe stops at the knee, so the kit's gait shows (contacts at ±5, the passing foot lifted 3 px, the planted ankle travelling back).

## Animation

**Idle (8 frames):**
- The breath lifts the head, mantle and hand on f3–5.
- The staff rocks about its planted foot (top x +0 1 2 2 1 0 0 −1).
- The mantle's back drape swings, and the crystal's glint pulses.
- Frame-to-frame changes: 75 142 231 143 83 228 137 132 px. The smallest is 75.

**Walk (8 frames):**
- The kit's `GAIT` from one hip column, with the head dipping a frame after the body.
- The staff is planted once a stride: its foot stays on the ground on f8–11 while he passes it, then lifts and swings forward on f12–15.
- The mantle's drape trails, and the upper body leans 1 px on each step's up frame.
- The second step differs from the first by 273 161 292 320 px (f12–15 against f8–11).

**Attack (6 frames, attackFps 12):**
- f16: lifts the staff.
- f17: raises it high and leans back 2 px. The crystal blazes (a 4-ray flash).
- f18: drives it down, with white motion streaks over the crystal.
- **f19, the blow:** the staff's foot hits the ground in front. He leans in 2 px and sinks 1. The crystal bursts into an 8-ray star, gold and green sparks fly up in a V from the staff's foot, and two thorny roots burst up beside it.
- f20: the roots grow taller and the flash fades.
- f21: he straightens and the roots sink back into the ground.
- Both feet stay planted throughout.

## Measures

These are measured the way remaster-v5/NOTES.md defines them, over f0–15 unless a frame range is given.

| measure | value |
|---|---|
| height (build) | 36 px (top colour row 4–5 idle, antler tips row 5) |
| feet | row 39 on every idle and walk frame (feetSpread 0) |
| drift idle / walk | 0.63 / 1.38 px |
| upper change idle / walk (measure.mjs) | 0.28 / 0.60 |
| night 5+ (share of the frame's opaque pixels) | f0 55.7%; worst idle or walk frame 55.6% (f2); attack 51.8–56.0% |
| bright (> luma 150) | f0 17.7%, 17.6–18.6% over f0–15 |
| stripes, rows / cols (mean per idle and walk frame) | 0.00 / 0.00 |
| doubled ink (my reconstruction, mean over all 22 frames) | 2.3 per frame (the antler crotches and a sleeve/staff junction) |
| ink walls (measure.mjs) | 0 |
| islandShare | 0.120 (build) |
| colours | 25 |

## Clean-up I did along the way

- **The antler shape went through three versions.**
  - Flat-shaded beams replaced a T/D split that left the D side as a diagonal of lone pixels.
  - I also tried vertical 2-px tines with fewer islands. They read as two slingshots, not antlers, so I went back to the spread fork.
  - The tips are 2 rows of z, and the crotch gaps are 1 px, so no doubled ink.
- **The mantle's leaf rows start at the first row the head leaves showing.** Before that, the top row of leaves showed as a line of lone shade pixels.
- **I dropped the separation line under the robe's hem, and the robe's folds are a single '3' crease.** That took the '2'/'3' pinstripe away.
- **The belt is now leather 'b', not rope 't'.** The rope belt striped against the robe.
- **The near arm isn't drawn.** It was hidden under the mantle and robe anyway, and its lone hand at the hip read as a knee.

## Weapon art

The weapon art is in `public/js/art/hero-druid-items.js` as `DRUID_ITEMS`, in palette strings with no outline drawn:
- **`i_roots`** (14×14): two gnarled roots heave out of cracked earth and hook inward like a closing claw, with a young shoot between them. The tips and the crack glow green (emissive `lL`).
  - It's meant to read nothing like Bramble's `i_thorns`, which is straight, pale-tipped spikes with no glow.
- **`i_worldroot`** (14×14): a great tree with a glowing green canopy, an amber heart in the trunk and its roots spread into the ground, tips aglow (emissive `lLYy`).
- **`root`** (10×14, 4 frames):
  - rising out of a spray of earth
  - full, with a glowing tip
  - full and leaning, the tip pulsing
  - withering: bent over, dark, the glow gone (the tip goes to non-emissive E).
  - Emissive is `lL`.

The renders are at `<scratchpad>/heroes/druid/items.png` (made by `items-render.mjs` there), at 10x on grass and on the inventory slot's blue, with 1x and 2x copies.

## Evidence

- **Board:** `gms/3001/sprites/lab/review/druid-v1.png` (+ `.json`).
- **In-game shots:** `gms/3001/sprites/lab/review/druid-v1-{stand,walk,fight}.png` (game zoom) and `review/closer/druid-v1-{stand,walk,fight}.png`.
  - The stage only plays the five old classes (`lib/cast.js` HERO_ROLES), and `shot.mjs druid/v1` falls back to the knight.
  - So these shots are from a scratch copy of shot.mjs, `<scratchpad>/heroes/druid/shot-as.mjs`, that opens `stage.html?hero=mage&wear=lab:druid/v1`. That means he's wearing the sorcerer's kit (fireballs) in the fight shot.
- **Scratch tools** (all in `<scratchpad>/heroes/druid/`):
  - `preview.mjs` / `zoom.mjs`: grids of every frame on grass, dirt and night, and 10x gridded zooms
  - `analyze.mjs` / `islmap.mjs`: pieces, and islands by colour
  - `bars.mjs` / `where.mjs`: night, bright, stripes and doubled ink per frame, and where they are.

## Unsure / weak

- **The body is mid-value everywhere** (tan robe, tan-brown hood, orange mantle). At night, the antlers, face, beard, mantle and glows carry him. He measures 56% night-clear, but by eye he's quieter than the sorcerer or the knight on the night board.
- **On the dirt crossroads, the bark robe sits close to the dirt's brown.** The outline and the orange mantle separate him.
- **The mantle reads at 1x as a leafy orange-and-gold capelet.** At 4x the 3-px leaves are a fine checker, not distinct leaf shapes.
- **The roots on the blow frame reach the frame's right edge** (x 44–47). The tallest is 11 px. At game scale they're a flicker beside the staff; the real Roots effect is the in-world `root` sprite.
- **The free (near) arm is never seen.** The blow is one-handed (the far hand drives the staff down).
- **25 colours** against the team's 13–23. The leaves and the glow take six.
