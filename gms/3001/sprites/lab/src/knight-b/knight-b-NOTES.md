# Knight B: the knight-errant

`lab:knight/b`, in the `Knight B` collection. The source is `knight-b.px.js`, drawn with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl). The sheet is `sheets/knight-b.png`: 22 frames of 48x48 in one row, facing right. Idle is 0-7, walk 8-15, attack 16-21. The feet stand on row 39 in every frame (anchorY 40), and each frame carries its own 1 px ink.

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/knight-b/knight-b.px.js --scale 6 --out <scratch>
copy <scratch>/anims/knight_b.png  ->  gms/3001/sprites/lab/sheets/knight-b.png
```

- The `knight_b` anim's strip is exactly the sheet (1056x48), so nothing has to be cropped or converted.
- `idle`, `walk` and `attack` are the same frames split out for their GIFs. pxl writes them to `anims/*.gif`, and the 6x previews and onion sheets to `_preview/`.
- `pxl check` passes with no warnings.

## Design

The Knight's A look (Mattz Art's plumed knight: silver plate, a red plume and cape, a red shield held forward) stays as it is. B is the same role in a different kit:

- **Silhouette.** A flat-topped great helm with no plume. The kite shield is slung on his back, so it sticks out behind him. A broad sword is held up and forward at 45° in front of him.
- **Blued steel** (`n b s S w`, `#24304f` to `#c4daf2`). It is darker and bluer than A's silver, with lights kept high enough to read at night.
- **Helm.** A 10x10 great helm in 3/4: a flat lit top with a ridge, a side plate with a cool rim, a bright edge where side turns to face, a brass brow, then the T-visor (eye slit and breath slit) and cheek plates cut in at an angle.
- **Tabard.** "Or": gold, with an ochre side shade (`O o y`) and a navy chevron. A leather belt with a brass buckle. Steel faulds at the hips.
- **Kite shield on his back.** A navy field with the gold chevron, the tabard's colours reversed, and a steel rim.
- **Longsword.** A 3-px broad blade with a white lit edge, a steel middle and a shaded flat. A brass cross-guard, a leather grip and a brass pommel.
- **Palette.** 18 colours plus the ink `#181425`, which is the outline the team shares (since the review: a cool rim `c`, a navy enamel ramp `N m M`, a gold highlight `Y`).

## How it is built

- **Parts.** The parts are pxl sprites with their own ink (`outline: "k"`), stamped back to front:
  1. the shield
  2. the far arm
  3. the far leg, then the near leg
  4. the torso (with the skirt in one piece, so no ink line cuts the waist)
  5. the helm
  6. the sword
  7. the near arm
- **Limbs.** Legs, the far arm and the attack's near arm are `capsule`s lit from above. Each one is drawn over an ink capsule 1 px wider.
- **Feet.** The leg's ink goes down first, then the sabaton, then the leg's fill. This way the foot joins the shin with no line between them.
- **Sword.** `sword()` collects the pommel, grip, guard and blade pixels, rings them with ink, then paints them.
- **No frame outline.** The frame has no `outline` of its own, because every piece is already inked and a frame outline would double it.
- **Offset.** The figure is drawn in a layer offset by (1, 1).
- **Idle and walk arm.** In idle and walk the near arm is a hand-drawn part (`_arm`): the pauldron, the arm down, the forearm forward and the gauntlet on the hilt. This keeps the arm clean at rest.

## Animations

- **Idle (0-7)**
  - A slow breath: the chest, arms, shield and sword sink 1 px on f3-5.
  - The helm sinks a frame later (f4-6).
  - The feet stay planted.
  - A glint runs up the blade's lit edge on f1-4.
- **Walk (8-15)**
  - Each leg has 8 phases (`GAIT`): contact, down, under, push-off back, toe-off lifted, passing with the knee bent forward, reach, and back to contact. The far leg runs half a cycle behind.
  - The body is 1 px low on contact and down, and high when passing and on the up beat.
  - The far arm swings ±2 px behind the shield. The sword stays in guard and bobs with the body.
- **Attack (16-21, 13 fps)**
  1. **f16, wind-up.** The sword is raised over the helm, level and pointing back, with the gauntlet above the helm. The body leans back 1 px.
  2. **f17.** The blade comes over the top, up and forward. A white crescent smear runs behind it over the helm, centred on the shoulder.
  3. **f18, the cut.** The arm is level and the blade forward, with a big crescent sweeping down in front. He lunges 1 px forward and 1 px down, in a wide stance.
  4. **f19, follow-through.** The blade is low and forward, with the tip near the ground. No smear.
  5. **f20, recover.** The sword is level and forward.
  6. **f21.** The sword comes back up toward guard, to -30° (the idle guard is -45°).
  - The smears have their own ink, a white body and a cooler `v` inner edge on their trailing half.

## Measures

- The figure spans x 9-43 and y 8-39 in idle and walk. The strike's smear reaches x 46; the wind-up's blade tip row 1.
- The feet are on row 39 in all 22 frames.
- `fitW 36`, `fitH 34` and `motionRate` are the same as the Paladin's.
- No glow rows, since nothing on him glows: `rows: ["right"]`.

## REVIEW (2026-10-22, reviewer pass)

The first version read flat and chibi beside Knight A and the Paladin. What changed and why:

- **Proportions.** The helm went from 12x12 to 10x10 and the torso was redrawn round it, so the head is about 1/3 of the figure with ink, as the Paladin's is, instead of a big round bucket. Legs hang from hips 5 px apart (20 and 25) for a 3/4 stance.
- **Great helm.** Flat top with a lit ridge, side plate and face plate as two planes with a bright edge between, a cool rim (`c`) on the back edge, brass brow, a clear dark T-visor with breath holes, and the cheek plates chamfered under the face so it reads angular, not round.
- **Plate shading.** Steel is now five tones (`n b s S w`) plus the cool rim; pauldrons are three lames with a specular, knees carry a lit cop, sabatons a lit top. Limbs are lit from above-front (`LIGHT [0.4, -1]`).
- **Tabard.** Gold with a highlight tone (`Y`) in vertical folds over a shadow edge; the navy chevron is a clear ^ placed where the pauldron does not hide it; the belt dips at the front with a brass buckle; the skirt hangs in folds between dark faulds.
- **Shield.** Navy enamel (`N m M`, its own ramp so it no longer melts into the steel), a lit steel rim, a gold chevron sized to the part that shows past the body, a small boss under it. Moved 1 px back so the chevron shows.
- **Arm and sword.** The rest arm ends at the wrist; the sword is drawn after it and a gauntlet (`fist()`, lit knuckles, dark underside) is closed over the grip, so the brass cross-guard and pommel read on both sides of the hand. In action the arm is `armIn()`: a pauldron part at the shoulder, upper arm, couter highlight, vambrace, gauntlet.
- **Attack.** f16 wind-up: the fist above the helm, the blade back over his shoulder, the upper arm beside the helm and the forearm drawn over it (`helmOverArm`), so the arm reads. f17 smear capped (`smearMax`) and f16's tip lowered so nothing touches row 0. f18's crescent is thicker (inner 8) and still ends at x 46. The action pauldron sits on the shoulder (it covered the visor before).
- **Walk.** The passing phases were spread (`GAIT` [1,0] / [0,2] / [-2,2]) and the hips widened, so the far leg shows as a darker leg with its own ink on the passing frames instead of merging.
- **Kept.** Colour concept, 22 frames 48x48 facing right, feet on row 39 (anchorY 40), baked-in ink, catalog fields.
- **Still weak.** The walk's crossing frame (sheet frame 11) hides most of the far leg, as a profile walk does. The f16 fist overlaps the helm's top corner. The near pauldron is a big rounded mass that hides the tabard's right half.
