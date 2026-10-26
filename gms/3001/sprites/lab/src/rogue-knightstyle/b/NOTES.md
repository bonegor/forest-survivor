# Shadow · Knight style B (Wraith)

`lab:rogue/knightstyle-b`, collection `Knight style · round 3`. A comparison look for Kael the Shadow
in the plumed Knight's style, keeping the spirit of today's Eclipse Wraith: a cloaked shadow assassin
whose cloak and scarf tatter into wisps that trail and dissolve, but now on legs, with a crisp
hood-and-body silhouette.

- Source: `rogue-b.px.js` (compositor adapted from `../../ranger-knightstyle/c/ranger-c.px.js`), drawn
  with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl). No pixels were copied or
  traced from the Mattz Art knight or any pack.
- Sheet: `sheets/rogue-knightstyle-b.png`, 1056x144: 22 frames of 48x48 facing right, rows
  `["right", "glow", "glowLeft"]`.
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/rogue-knightstyle/b/rogue-b.px.js --only rogue_b --out <scratch>
node gms/3001/sprites/lab/src/rogue-knightstyle/b/make-sheet.mjs <scratch>/anims/rogue_b.png gms/3001/sprites/lab/sheets/rogue-knightstyle-b.png
```

`make-sheet.mjs` is Ranger C's, set to 22 frames; the glow rows hold `#a9b2ff` and `#e6f0ff` (the eye,
the near dagger's edge and point, the throw's swoosh, streaks and spin ring). `pxl check` passes with
no warnings.

## Design

- **Hood** (11x10 at (17, 12)): a deep cowl lit from the upper left, its crown swept back, the brim
  overhanging; in its shadow a pale bone mask (forehead, cheek, nose) and one glowing lilac eye with a
  dark socket on each side.
- **Scarf**: wound round the neck over the chin as a short mantle over the shoulders (ties hood and
  cloak together); two tails stream back from the nape, the upper lit, the lower darker. They do the
  plume's job: ripple, overlap, fray at their ends.
- **Cloak**: two lobes from the back of the shoulders (outer violet, inner a bluer indigo), the hem
  cut into tongues past 55% of its length; past 78% pixels drop out (a per-frame seed, so the hem
  flickers), lone leftovers are removed, and 2-4 flecks drift off each tip, lighter as they go.
- **Body**: a slim slate tunic with a strap and a violet sash, slate sleeves, violet-wrapped
  forearms, dark gloves, slim slate legs with a violet wrap under the knee and soft boots.
- **Daggers**: violet grip and guard, steel blade, glowing edge and white point (near hand); the far
  hand's blade is dimmer, held point-down behind him.

## Frames (attackFps 12, hit on attack index 3 = frame 19)

- idle 0-7: breath (chest down on 3-5, head a frame later); the cloak lifts and ripples, the scarf
  tails sway a beat behind it, flecks drift.
- walk 8-15: planted stride (Ranger C's gait), body bob, cloak and scarf streaming further back.
- 16 crouch, both blades crossed at the chest; 17 wind-up, both arms cocked back over the shoulder,
  blades up behind the hood; 18 whip, a pale-violet crescent swoosh over the head, thick and white at
  its leading end; 19 release, arms open, two daggers fly out with long glowing streaks, cloak and
  scarf flung back; 20 spin back, a flat ring of light round his waist, the daggers' last dashes at
  the frame's edge; 21 recover, new blades drawn, back to stance.

## Palette (39 colours on the sheet, 37 in idle)

| material | ramp, dark to light |
|---|---|
| slate (body) | `#0d0b17 #151221 #1d192b #26213a #312a49 #3f3659 #463e63 #51466c #5c4f76 #675a82 #76678c #81739a #9e8fb0 #bfb0c6` |
| shadow violet (hood, cloak, scarf) | `#0f0920 #170d32 #211145 #2d1758 #311a64 #3b1e6d #43227c #4e2785 #5a2d8f #66339c #763ea6 #8245b0 #9654b8 #a161c3 #c48ad4` |
| inner lobe indigo | `#16143a #1f1d52 #2c2a6a` |
| mask | `#3c3552 #5d5774 #8b88a3 #b6b6cb #dcdce9` |
| blade steel | `#4a4868 #7c7ea0 #b2b8d2` |
| cold glow | `#6c66d8` (not glowing), `#a9b2ff`, `#e6f0ff` |

## Measurements (48x48 frames, soles on row 39)

| | Knight (plumed) | current Shadow (wraith) | Style B (Wraith) |
|---|---|---|---|
| idle frame 0 box | 21x30 | 31x30 (floating, feet row 36 in its own frame) | 30x28 (rows 12-39) incl. flecks |
| hood/helm top to soles | 28 px | n/a (floats) | 28 px |
| head | ~10x10 helm | hood blob | 11x10 hood |
| torso width | ~11 px chest (Ranger C notes) | n/a (cloak mass) | 7-8 px tunic, 11 px hood (eyeballed slimmer) |
| colours | ~140 | ~157 | 39 (37 in idle) |
| outline | none | none | none (no pure black) |

## Weak spots

- 39 colours against the Knight's ~140: ramps are hue-shifted with half-tones, but no hand AA.
- The torso and legs are dark slate by design (the owner wanted him dark); at 1x the hood, mask and
  blades carry the read, the body less so.
- The box width (30-35 px idle) counts the cloak tongues and drifting flecks; the flecks also make
  idle look a little noisy at 8x.
- The wind-up (17) hides most of the arms behind the hood; only the blades show above it.
- The spin (20) shows the ring and the cloak, but the body itself barely turns.
