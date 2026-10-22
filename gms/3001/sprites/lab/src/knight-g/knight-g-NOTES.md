# Knight G: the Moon Knight

`lab:knight/g` ("Knight · Moon Knight"), collection "Knight looks". The source is `knight-g.px.js`, drawn with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl), in the same format as Knight B. The sheet is `sheets/knight-g.png`: 22 frames of 48x48 facing right, 1056x144 with the glow rows (`right`, `glow`, `glowLeft`). Idle is 0-7, walk 8-15, attack 16-21. The feet stand on row 39 in every frame (anchorY 40); each frame carries its own 1 px ink; nothing touches the frame edge.

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/knight-g/knight-g.px.js --scale 6 --out <scratch>
node gms/3001/sprites/lab/src/knight-g/finish.mjs <scratch>/anims/knight_g.png gms/3001/sprites/lab/sheets/knight-g.png
```

- `knight_g` is the 1056x48 strip. `finish.mjs` adds the two glow rows the way `gms/3001/tools/build.mjs` does (keep only the glow colours; mirror for `glowLeft`) and checks every frame: 1 px clear at the edges, the sole on row 39.
- `idle`, `walk` and `attack` are the same frames split out for pxl's own GIFs. `pxl check` has no warnings.
- `entry.json` is the catalogue entry (not merged into `catalog.json`). It carries `glow`, the four glow colours as hex, because this sheet has colours of its own (no master palette keys): `#a6e6ff` (visor, blade edge, sigil, crest edge), `#fff1b8` (stars), `#5f9aee` and `#f4fdff` (the moonlight trail and its core, the sparkles). `bake-heroes.mjs` reads `e.glow`. Those colours are used ONLY for glowing things, since the game lights every pixel of a glow colour.

## Design

A slim, graceful night-sky paladin. A fencer's poise: sabre up and forward in guard, a long cloak behind. Cute from the big domed helm, the small crescent crest with a twinkling star and the starry cloak; badass from the glowing slit visor, the lunge and the moon-crescent cut.

- **Silhouette.** A thin silver crescent standing on the crown of the helm (horns forward, a star in its mouth), a swallowtail cloak streaming behind, a slim curved sabre in front. No shield on his back, no plume, no kite: it cannot be taken for Knight A (plumed, red) or B (T-visor, gold, navy kite shield).
- **Palette** (22 colours in the sheet, the ink `#181425` included):
  - plate `n b s p S w`, `#261f62` to `#fbfdff`: deep violet shade, lavender mid, moon-silver lights, plus a cool rim `c` `#8fc4ff`;
  - midnight blue `N m M q` for the surcoat and cloak, violet lining `V v u`, dark leather `L l`;
  - star `d` (dim, no glow) and the glowing colours `g y z h`.
- **Helm.** 10x9 dome in two planes (shaded side, lit face plate) with a bright edge between them, a dark brow shadow and the narrow glowing visor slit (`g`) cut to the front edge. The crest is a separate part, 5x6, drawn behind the helm, silver with a glowing inner edge. The star in its mouth is a pixel painted in code, so it carries no ink ring.
- **Surcoat.** A 12x11 torso: dark back plate, a blue surcoat with a glowing crescent sigil on the chest, a silver collar, a belt with a buckle, a short skirt of folds. The near pauldron is a crescent of plate sitting forward of the torso, so the sigil shows.
- **Cloak.** A polygon (`cloak()`), filled row by row, with shading rules: the trailing edge dark, the lit side near the shoulder, two folds, a violet lining hem. It has 8 stars. Each star cycles bright (`y`, glows) - dim (`d`) - plain blue by phase, so the starfield twinkles in idle and walk. Drawn behind everything.
- **Buckler.** A fat crescent, 5x6, strapped over the sword forearm. (The mouth of a thin crescent filled solid with ink, so it is fat.)
- **Sabre.** `sabre()` walks a curved centre line in quarter pixels: a 2 px blade (silver body, a glowing lit edge on one side, a glowing tip), a silver guard bow and a violet grip. The lit edge keeps to one side all along so the blade never forks where it bends. Blade reach is `len + 3` px: keep the tip inside x 46.
- **Limbs.** Legs and the near arm are `capsule`s lit from above, each over an ink capsule 1 px wider. Feet: ink first, then the sabaton, then the fill (as Knight B). The far arm is hidden by the cloak; only its pauldron shows.
- **No frame outline.** Every part is inked, so the frame takes none (a frame outline would double it, as in Knight B).

## Animations

- **Idle (0-7).** A slow breath: chest, arm and sabre sink 1 px on f3-5, the helm and crest a frame later (f4-6). The cloak hem lifts 1 px and the stars twinkle on their phases. The feet stay planted. A glint runs up the blade's lit edge on f1-4.
- **Walk (8-15).** Knight B's eight-phase gait (`GAIT`): contact, down, under, push-off, toe-off, passing, reach, contact; the far leg runs half a cycle behind. The body is 1 px low on contact, the cloak streams 2-3 px back and its hem ripples, the sabre stays in guard.
- **Attack (16-21, 13 fps).**
  1. **f16, draw.** The sabre is drawn back over the shoulder, pointing up and back behind the helm; the body leans back a pixel.
  2. **f17.** The blade comes up and over the top, forward and up. A moonlight crescent arcs over the crown of the helm (it is drawn behind the helm).
  3. **f18, the cut.** A deep lunge (near foot forward, far foot back, 2 px forward and 1 down). The blade is level and forward, with a big tapered crescent of moonlight behind it in three tones (`z`, `g`, `h`), and sparkles.
  4. **f19, follow-through.** The blade is low and forward, pointing down at the ground; sparkles are left in the air.
  5. **f20, recover.** The blade is level and short of full reach, one sparkle at its tip.
  6. **f21.** The sabre comes back up toward guard.

## Measures

- The figure spans x 9-46, y 6-39 (the sabre or the trail is the widest part). The crest is the highest point: row 6 in idle.
- `fitW 36`, `fitH 34`, `motionRate 1.052`, `idleRate 3.75`, `attackFps 13`: the Paladin's and Knight B's.

## Known weaknesses (after the review)

- The walk's lifted-knee frames (13-14) are still the Knight B bent-knee solution; they read, but are busy at 1x.
- The off arm is a dark akimbo elbow behind the torso: believable, but a small shape.
- The helm's top is bright white blocks; at x1 it reads as a lit dome, at x6 it is a little blotchy.

## REVIEW (2026-10-22)

- **Plate value range.** Deeper shades (`n` #1a1548, `b` #3a3592) and brighter lights (`s` #7f7ce0, `p` #b9c2f8, `S` #e4ecff, `w` #ffffff, rim `c` #a8d8ff): the violet stays but he no longer looks dim beside Knight B and the Paladin. Glow colours untouched (entry.json glow list still right).
- **Helm.** A white ridge up the crown and brow, a dark brow band over the visor so the glowing slit reads, a brighter rim.
- **Off arm.** Drawn now: an akimbo arm (shoulder under the far pauldron, elbow jutting out behind over the cloak, hand on the hip behind the belt). It bobs with the body; stays put in every frame.
- **Draw (f16).** The sword hand moved out from behind the helm to a cross-body backhand draw: forearm over the chest, hand at the back (12,17), blade angled up and back clear of the helm and crest. The wind-up now shows an arm.
- **Walk.** Passing frames lift the knee higher (lift 3 instead of 2; GAIT 5 = [-2,3], 6 = [1,3]) so the bent leg reads as a stride rather than a stiff fold.
- Sheet rebuilt with finish.mjs; frames clear of the edge, feet on row 39.

## HELM (2026-10-22)

The owner found the new heroes' heads too round, like balls. `_helm` is redrawn as a barrel helm, 9x10 (was a 10x9 dome): a flat crown (the top row is 7 wide, one step of rounding at each corner), straight vertical sides, stamped at (20, 10) so the front edge stays at x 28 and the chin on the same row as before. Shaded as a cylinder: a cool rim `c` on the far edge, a dark column behind it, then a vertical highlight band (`w`, with `S` and `p` either side) falling to mid violet at the front edge; a lit ridge, a dark brow band and the glowing slit (`g`) in the upper third, a short shadow under it, and one vent. The crest is now stamped after the helm, at x 18, so it stands on the crown (its foot overlaps the crown's back corner) instead of being cut by the flatter crown; the twinkling star moved with it (x 25). Nothing else changed: same palette, glow colours and frames; the figure still spans y 6-39, feet on row 39. Rebuilt with the steps above. Before/after previews are in the session scratchpad (`helm-g/`).
