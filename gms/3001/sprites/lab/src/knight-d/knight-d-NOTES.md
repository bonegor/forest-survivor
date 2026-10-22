# Knight D: the Frost Warden

`lab:knight/d`, "Knight · Frost Warden", collection "Knight looks". Source `knight-d.px.js`, drawn with claude-pxl (MIT). Sheet `sheets/knight-d.png`: 22 frames of 48x48 facing right in one row (idle 0-7, walk 8-15, attack 16-21), plus the two glow rows (1056x144), as the Paladin's. The catalog entry is `entry.json` (the orchestrator merges it). Feet on row 39 in every frame (anchorY 40), own 1 px ink `#181425` baked in, no frame outline.

## Concept

A northern guardian from the frozen peaks, cute (round fluffy mantle, small determined face, big icy eyes, blush) and badass (stern brow, upright crystal sword, winged helm). It cannot be mistaken for the others by silhouette:

- A big white wolf-fur mantle: the widest shape, with clumps, notches and a tufted hem.
- Two swept-back silver feathered wings on the helm: a long diagonal streak up and back behind the head.
- A round ice shield with a silver rim and a glowing snowflake, held forward on the near arm (the sword hangs from the far hand above it, so the blade stands up beside the head).
- A crystal-cyan blade (3 px, white core) held upright, not at 45° like Knight B.

## Palette (all in `pal({...})`)

| keys | what |
|---|---|
| `k` | ink `#181425` (the cast's outline) |
| `a b c d e` | ice-blue enamel plate, dark to light (helm dome, gauntlet, tassets, greaves) |
| `s t u v` | silver trim (wings, helm brim, guard, shield rim) |
| `f g h i` | wolf fur, shadow to white (mantle, boot cuffs) |
| `m n o` | deep frost-blue cloth (skirt, shield centre) |
| `x y z p` | skin, shade to light, `p` the cold cheek |
| `q r w` | shield ice |
| `L l` | boot leather, belt |
| `G H J` | frost glow: cyan, light cyan, near-white |

Glow is exactly `G H J` (`#4fcdfc #a6efff #effeff`): the eyes, the blade, the snowflake, the cold arc and the shed shards. Nothing else uses these colours; the plate/ice tones differ (`w` is `#8dd2fa`). The entry says `"glow": [...]`, so tools/bake-heroes.mjs reads those hexes (rows `["right","glow","glowLeft"]`, `emissive: null`, like the lab's other hex-glow entries).

## How it is built

- Parts: `_helm` (11x10 grid: ice-enamel dome, silver brim band, ear flap, face with brow, glowing eyes and cheeks), `_wing` / `_wingfar` (the same 11x7 feathered wing, the far one a tone darker, set 2 px up), `_mantle` (20x9 grid), `_torso` (chest, belt with a silver buckle, skirt in folds), `_foot`, `_cuff` (a fur cuff at each ankle).
- Code-drawn: legs (capsules over a 1 px wider ink capsule, as Knight B), `shield()` (a lit circle with rim and facet plus a 5x5 snowflake), `sword()` (collects the pixels, rings them with ink, paints them), `fist()`, `armIn()`, `shards()`.
- Draw order: far wing, legs, torso, (resting forearm), mantle, shield, smear, helm-side items, near wing, helm, then the sword and gauntlet on top. In the cut the arm and sword come after the shield, so the arm swings in front of it.

## Animations

- Idle (0-7): a slow breath; chest, mantle and shield sink 1 px on f3-5, the helm and wings a frame later (f4-6); a glint runs up the blade on f1-4.
- Walk (8-15): the 8-phase gait of Knight B (feet and fur-cuffed boots show; the skirt and shield cover the thighs), the body bobbing 1 px, the blade bobbing with it.
- Attack (16-21, 13 fps): f16 the blade raised back over the helm, upper arm beside the head; f17 the blade over the top with a first cold crescent and shards behind; f18 the cut: a wide crescent in front (outer `H`, inner `G`, tapering from nothing), a lunge of 1 px, the shield pulled in 2 px, shards flying; f19 follow-through, blade low and forward with falling shards; f20 level, shards fading; f21 back up toward guard.

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/knight-d/knight-d.px.js --out <scratch>
node gms/3001/sprites/lab/src/knight-d/build-sheet-d.mjs <scratch>/anims/knight_d.png
```

The second step (uses tools/png.mjs) reads pxl's 1056x48 strip and adds the glow row (only the `G H J` pixels) and the flipped glow row, as gms/3001/tools/build.mjs does, and writes `sheets/knight-d.png`. `pxl check` passes with no warnings.

## Measures

Figure spans x 9-41 and y 5-39 in idle and walk (the blade tip is the top at row 5, the wing tip row 6). Attack frames stay within x 7-46 and y 1-39. fitW 36, fitH 34, motionRate as the Paladin's.

## Known weaknesses

- The thighs are hidden by the skirt and shield, so the walk reads from the boots and shins only; the crossing frames (11, 13) show one boot.
- The mantle is a pale mass; the tufts read at 4x but are subtle at 1x.
- In the follow-through (f19) and recover (f20) the blade and arm cross the shield and are busy.
- The sword is held by the far hand in idle/walk and by the near-side arm in the cut (the arm starts at the near shoulder behind the fur), a sprite-level cheat like Knight B's.
- The blade tip makes him a few pixels taller than the other knights; the wing makes him wide to the left.

## REVIEW (second artist)

Changed, and why:

- **Mantle**: the 20x9 tile grid made a repeating, noisy zigzag. It is now painted in code from lit fur clumps (`CLUMPS`, `mantle()`): white crowns, grey-blue undersides, overlaps that make the creases, a ruff of collar clumps, a hem of narrow hanging tufts with dark strands between them. The ragged hem and shoulder tips read as shaggy fur at 1x.
- **Walk**: the skirt is one row shorter, the cuffs smaller (two rows), the shield smaller (11 px incl. ink, was 13) and moved up and 2 px right (it no longer hides the near leg), and the stride longer (dx +-4, lift 3). Boots, shins and knees now read through the whole cycle.
- **Skirt/belt**: dark leather and cloth merged with the ink under the fur; now a silver belt with a buckle, pale plate tassets either side of a blue cloth panel, a silver hem.
- **Wing**: the grey bar with black blotches is now a three-feather silver wing (white upper edge, shaded undersides), set 2 px lower, and the far wing sits behind it. With the blade 11 long (was 13) the idle figure is 33 px tall (rows 7-39, was 5-39) and 32 wide (x 9-40), so the game's bounding-box fit scales him like Knight B (32 tall) instead of shrinking him.
- **Face**: the eyes were two cyan rows that read as tears; now a dark brow, one row of glowing eyes (H J), the blush below.
- **Cut and the hand/blade cheat**: the sword shoulder moved from the neck to under the right clump of fur ((31,20)), and one arm routine (`armIn`, same ramp, same fist) serves all three carries: at rest the forearm comes out of the fur and the blade stands beside the helm; raised (f16-17) the arm is in front; low (f18-21) the arm and blade are drawn under the fur and the shield, so only forearm, fist and blade show, and a smaller, pulled-in shield no longer crosses the arm and blade (f19-20 were the busy ones). The black ink blob over the right shoulder in f18 is gone; the arc is drawn under the arm so the blade lies on it.
- Frame 17's blade tip left a 1 px clear border (it touched row 0).
- `entry.json`: `made` set to a real time; description updated (shaggy mantle).

Still weak: the follow-through (f19-21) arm is a few pixels only, the far leg is dark on dark ground, the raised arm in f16-17 is a flat blue band, and the figure is very pale (mantle, helm, tassets) so on bright terrain it relies on the ink.

Rebuild helper used for review: build, then `build-sheet-d.mjs` (as above); previews are `knight-d-rev-*` in the preview folder.

## HELM (22 Oct 2026: less ball, more cylinder)

The owner found the new heroes' heads too round. Only the `_helm` grid changed (it is stamped in every frame, so idle, walk and attack all follow): the body is now 9 wide x 10 tall (was a dome 10-11 wide with a tapering chin), a flat crown (top row two steps in at each corner, one step of rounding), straight vertical sides, a squared jaw with one rounded step at the bottom. Shading follows a cylinder: a vertical highlight band (`d e e d`) just left of centre on the crown and the left cheek-guard, falling off to `b a` on the right; the face's far cheek is shaded `x`. The brim is a straight silver band. Wings, eyes, brow, colours, glow, positions and sword are untouched; the helm sits at the same place, so feet stay on row 39 and the figure box is the same (the head is 2 px narrower, not bigger). Rebuilt with the steps above; `pxl check` has no warnings. Before/after previews: scratchpad `helm-d/`.
