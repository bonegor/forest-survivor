# Ranger · Knight style B

`lab:archer/knightstyle-b`, in the `Ranger · Knight style` collection. A comparison candidate for the
Sprite Lab: Lyra (game id `archer`) redrawn so she sits beside the plumed Knight, whose in-game sprite
is the style reference for every hero. It ships as the Ranger's look "Style B" (archer_c, chosen with LOOK on the hero screen).

- Source: `ranger-b.px.js`, drawn with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl).
  No pixels were copied or traced from the Mattz Art knight or any pack; the Knight was only rendered
  and measured.
- Sheet: `sheets/archer-knightstyle-b.png`, 4224x144: 88 frames of 48x48 facing right, rows
  `["right", "glow", "glowLeft"]`, the same layout as `archer-silverleaf-picked.png`.

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/ranger-knightstyle/b/ranger-b.px.js --out <scratch>
node gms/3001/sprites/lab/src/ranger-knightstyle/b/make-sheet.mjs <scratch>/anims/ranger_b.png gms/3001/sprites/lab/sheets/archer-knightstyle-b.png
```

`ranger_b` is the 88-frame strip; `idle`, `walk` and `attack` are the same frames split out for their
GIFs. `make-sheet.mjs` adds the glow rows: only the pixels in the glow colour `#b6ffdc` (the moonstone
in the bow's grip and the arrowhead), then the same mirrored inside each frame. `pxl check` passes
with no warnings.

## Frames (as the game reads them, see public/js/game/ranger-animation.js)

| frames | move |
|---|---|
| 0-7 | idle (6 fps in game: idleRate 3.75): a slow breath, the chest down a pixel on f3-5 and the head a frame later; the cape ripples out behind her and the ponytail sways |
| 8-15 | walk: a planted stride (each leg 8 phases, the far one half a cycle on), body 1 px low on the contacts, upper body leaning 1 px forward, the cape streaming back level, the tail trailing, the far arm swinging, the bow swaying a pixel |
| 16-23 | attack, 14 fps, attackRelease 5: lift the bow (the arrow drawn from the hip), nock (bow arm level), draw (elbow rising behind), full draw to the chin, hold (the arrowhead glints), **loose on 21** (the string snaps past straight, the draw hand flies back open, a white crescent bows out in front of the grip and a streak runs to the frame's edge with the glowing tip at its head; the cape and tail are flung back), follow-through (string buzzing, the streak breaking into dashes), lower |
| 24-87 | attackWalk: group k (24 + 8k ... 31 + 8k) is attack pose k over walk steps 0-7: her upper body shooting, her legs, bob, cape and tail walking (the loose still flings the cape and tail) |

## Design

- **No black outline.** A small compositor in the source draws each part (head, torso, cowl, cape,
  ponytail, each arm and leg) into its own map and, when laying it on the frame, steps its boundary
  pixels darker along that part's own ramp (two coarse steps; skin one). So the silhouette and every
  part laid over another are edged in the darkest tones of their own material, as on the Knight. The
  sheet has no pure black pixel; 59% of the edge pixels of idle 0 are dark (the Knight: 73%, the old
  Ranger: 100%, all black).
- **Proportions.** About 3 heads tall: a 10x10 head (hair included) on a 27 px figure. A wide, planted
  stance; slimmer limbs than the Knight.
- **Shading.** Two ramps per material: a coarse one (the main tones, which edges step along) and a
  fine one with half-tones between, which the round shading of limbs, cape and ponytail runs along
  (light from the upper left; the ponytail and cape also darken toward their ends and carry strand
  highlights along their flow).
- **Restrained colour, as the Knight's.** One main material (forest green), silver hair, leather, one
  warm accent (amber to gold: hair tie, buckle, cape clasp, bow tips, fletching), bright small
  highlights (white streak, string, glint) and one glow colour.
- **Flowing elements.** The high ponytail and the cape are flowing strands whose lines are moved per
  frame (a ripple running down them, swept back by walking or by the shot), so the silhouette changes
  frame to frame like the Knight's plume and cape.
- **Who she is.** Silver hair in a high ponytail tied in gold, a long elf ear laid back over the hair and
  out past it, teal eye, green tunic with a leather belt and gold buckle, green hood laid back as a cowl
  with a gold clasp, green cape, leather bracer and boots, a longbow with gold tips and a moonstone in
  the grip.

## Palette (47 colours on the sheet, 42 in idle)

| material | fine ramp, dark to light (coarse keys in capitals where they differ) |
|---|---|
| silver hair (violet shadow, pink light) | `#221a35 #342b4b #463c61 #63587e #7f749b #9d91b2 #bbaec8 #d5c8d9 #efe2ea` |
| skin | `#4a1d2a #6f333a #94494a #b56a5b #d68a6c #e7aa88 #f8c9a4` |
| forest green (blue-black to yellow-green) | `#0a1a20 #0e2725 #11332a #184931 #1e5f37 #29793d #339242 #50a94a #6dbf51 #98d566 #c2ea7a` |
| leather, bow wood (violet-brown to ochre) | `#1e0e16 #2e161a #3e1e1e #542b22 #6a3726 #84492c #9e5a32 #b97946 #d4985a` |
| accent amber/gold | `#4a1306 #8f2d0c #b44714 #d6611a #e68629 #f5aa38 #ffe390` |
| eye, string, glow, streak | `#14203f #3fcf9a #e3d8c6 #b6ffdc #ffffff #f0e4ee #b9a9cc` |

## Measurements (48x48 frames, soles on row 39)

| | Knight (plumed) | old Ranger (silverleaf-picked) | Knight style B |
|---|---|---|---|
| head top to soles (no plume / ponytail) | 28 px (helm row 12) | 34 px incl. hair (row 6) | 27 px (hair row 13) |
| idle frame 0 bounding box (everything) | 21x30 | 27x34 | 23x30 |
| idle bounding box, average of the frames | 23.4x28.3 | 27.0x34.4 | 23.4x29.6 |
| torso width at the chest | ~11 px of armour | ~17 px with the arms (boxy) | 8 px tunic (10 with the near arm) |
| legs | 4-5 px | 5 px | 3-4 px (boots 4-5 at the foot) |
| head | ~10x10 helm | ~18x17 head and hair (half her height) | 10x10 |
| colours in idle | 140 | 25 | 42 |
| outline | none (material darks) | pure black | none (material darks) |

## Open points

- 42 colours against the Knight's 140: the ramps are multi-step and hue-shifted, but the source does
  not anti-alias the way the Knight's pack does.
- The average idle box is a pixel taller than the Knight's because the ponytail rises above the head
  (as the plume does); her body itself is a pixel shorter.
- The draw arm is the far arm: its upper arm is behind the body and its forearm passes under the chin,
  so at full draw it reads as a leather bar under the face rather than a full arm.
- The release streak runs to the frame's right edge (48 px frame); the Knight's swoosh is wider because
  his frame is 80 px.
