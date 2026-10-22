# Knight F: the Thorn Knight

`lab:knight/f`, collection `Knight looks`. Source `knight-f.px.js`, drawn with claude-pxl (MIT). Sheet `sheets/knight-f.png`: 22 frames of 48x48 facing right, one row of frames plus two glow rows (1056x144). Idle 0-7, walk 8-15, attack 16-21. Feet on row 39 in every frame (anchorY 40), own 1 px ink baked in, nothing nearer than 1 px to the frame edge (checked: x 7-46, y 1-39).

## Concept

A guardian of the ancient forest, cute (a big round helm with two glowing eyes, little antlers, leaves and flowers) and badass (a wide guard stance, a bronze leaf-blade, a whip of green light). Not a recolour: his silhouette is the antlers, the round wooden shield high on his back and a leaf-shaped cape hanging under it.

- **Helm.** Moss-lacquer dome with a bark brow band, a bark jaw plate and a dark visor with two 1x2 glowing eyes (E). Tiny pink flower on the crown's back. Idle frame 6 blinks (the lower eye pixel goes dark).
- **Antlers.** Two forked bark branches (near taller, with a leaf on its outer tine; far shorter, darker), pixel-placed, 2 px thick at the base, prongs 3+ px apart so the ink does not clog.
- **Armour.** Dark bark under-layer; moss-green lacquered breastplate with a leaf-vein rib; vine belt with a bronze buckle (glowing vine pixel); skirt of three leaf tassets; pauldron with leaf lames and a pink flower; bark greaves with a moss knee leaf and moss toe caps.
- **Shield.** Round, bark rim with bronze studs, wood face, carved dark tree with two inlaid leaves, high on his back (x 8-18, y 14-24).
- **Cape.** A teal leaf (cooler than the lacquer, so it separates) with a lit vein, tip down; it sways 1-3 px with the body.
- **Sword.** Bronze leaf blade drawn square to its own axis (so it keeps its shape at any angle): lit upper half, shaded lower half, a rib, a bronze guard, the vine wound round the grip and the blade's root (glowing). A travelling glint (Z) runs up the blade in idle f1-4.

## Palette (30 colours with the ink)

Ink `#181425` (the cast's). Bark `a A p P q` (`#2a1e1c`..`#d0a060`). Moss `n g m M l L` (`#14391f`..`#d4f8aa`). Bronze `o O y Y`. Shield wood `w W x X`. Teal cape `t T U`. Visor `d`. Flowers `f F`. Glow colours: eyes `E #d8ff8a`, vine `V #5bff7d`, the whip's arc `G #c4ff9c`, the blade glint `Z #fff6d6`. These four are in `entry.json` as `glow` and are used only for what should glow.

## Animations

- **Idle (0-7).** Breath: body sinks 1 px on f3-5, helm and antlers a frame later; cape sways; glint on the blade f1-4; a blink on f6. Stance a little wider than Knight B's.
- **Walk (8-15).** Knight B's proven 8-phase gait (far leg half a cycle behind and a step lighter than the ink so it reads), 1 px body bob, cape swinging against the stride, sword kept in guard.
- **Attack (16-21, 13 fps).** f16 wind-up: sword raised behind the head, arm bent beside the helm, body leaning back. f17: the whip arc sweeps overhead, leaves fly off it. f18 the cut: lunge, a big bright crescent in front, sword horizontal, leaves. f19 follow-through low. f20 recover level. f21 back toward guard. The arc is swung about his middle (25, 20) so it can be large and still stay inside the frame.

## Rebuild

```
set PXL_DIR=<claude-pxl>          (a clone of https://github.com/augusto-scarvalho/claude-pxl)
node %PXL_DIR%/bin/pxl.js build gms/3001/sprites/lab/src/knight-f/knight-f.px.js --out <scratch>
node gms/3001/sprites/lab/src/knight-f/make-glow.mjs <scratch>/anims/knight_f.png gms/3001/sprites/lab/sheets/knight-f.png
```

`make-glow.mjs` adds row 1 (`glow`: only the pixels of the four glow colours) and row 2 (`glowLeft`: row 1 mirrored inside each frame), as in the Paladin's sheet. `pxl check` passes with no warnings. Previews were made in the scratchpad (`knight-f-preview/`).

## Drawing notes

- No pxl frame outline: every part is inked itself (a frame outline would double it, as Knight B found).
- Figure drawn in a 46x46 canvas laid at (1, 1); soles on canvas row 37.
- Arms, legs, hand and sword code is Knight B's engine (`limb`, `leg`, `fist`, `armIn`), redrawn with this palette; the sword and everything else is new.

## Known weaknesses

- Value is lower and greener than Knight B and the Paladin; on the darkest forest ground the far leg and the bark under-layer sink toward the ink. The glow eyes carry the face at night.
- Torso is busy at 1x (lames, vein, belt, tassets, pauldron all green); it reads as armour but not as crisply as Knight B's gold tabard.
- f16 (wind-up): the raised sword and the antlers overlap in a small cluster; it is a one-frame (77 ms) pose.
- f18's crescent has a slightly stair-stepped tail at its lower end.
- The walk's crossing frames hide most of the far leg under the skirt and cape, as a profile walk does.
- The guard and pommel are tiny and mostly under the fist.

## REVIEW (2026-10-22, reviewer pass)

Rebuild is unchanged (same two commands). What changed and why:

- **Values.** Bark ramp lifted (`a A p P q` now `#33261f #5a4034 #86613f #b98c52 #e6bd78`) and moss a step brighter (`n g m M l L`), so the greaves, the far leg and the bark under-layer no longer sink into the ink on dark ground. Near leg ramp `ApPP`, far leg `aAAp` (still a step darker, so the pair reads on the walk's crossing frames; those frames now show both legs).
- **Torso.** Redrawn as one clear cuirass: bark collar, a single lit moss plate (bright central panel, `g` shade at the left), a vine belt with the bronze buckle, then three tassets whose tips are bronze (`o`), so skirt and legs separate by colour. The pauldron and the rest-arm's shoulder got a bronze lame at the bottom edge: the shoulder no longer melts into the chest.
- **Antlers.** Every tine is now 2 px thick (the old ones were 1 px with ink on each side and looked brittle); prongs kept 3+ px apart so the ink does not clog. Still two forks with the leaf on the near tip.
- **Sword.** The cross-guard moved out from under the fist (r = 3 from the hand, 5 px wide, lit end and shaded end, a ring behind it) and the blade starts after it; the pommel is two pixels. The sword now reads as a sword with a guard in every frame. Attack blades lengthened (14 in the raised/cut poses; 10-11 where the frame edge or the feet limit them).
- **f16 wind-up.** The sword is raised forward-up (-75 deg, hand at (36,13)) instead of behind the head, so it no longer clusters with the antlers; the bent arm is clear beside the helm.
- **f17/f18 crescents.** The `c.arc` smears were replaced by `crescent()`: drawn from pixel centres with a smooth sine taper at both ends, minimum 1.1 px, inked all round, a lighter inner rim over the thick half. No stair-stepped tail; f17's arc is thinner (6) so it no longer covers the antlers, f18's (8) is a clean leaf-shaped crescent. `make-glow.mjs` is unchanged (the arc is still colour `G`).
- **f19.** Sword angle 50 deg / length 10 so the tip stays on row 39 (it had reached row 40).
- **Checked.** `pxl check` no warnings; every frame inside x 7-46, y 1-39 (the crescents are capped at radius 18 and the f17/f18 blades shortened to keep 1 px clear of the frame edge).
- **Kept.** The concept, palette names, 22 frames, feet row 39, entry.json (no field changed), glow rows.

Still weak: the figure is still a green-on-green design at night (the glowing eyes and the pale crescent carry it); the far leg on the walk's crossing frames is still mostly hidden by the skirt and cape; f18's crescent reads more as a leaf-blade of light than a classic sword arc; no rim light was added to the outer edge because the outline is the cast's single ink.
