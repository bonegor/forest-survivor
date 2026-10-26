# Necromancer · Knight style B (Grave lord)

`lab:necromancer/knightstyle-b`, collection `Knight style · round 3`. A look for Morvath in the plumed
Knight's style, made as a freer redesign: a gaunt hooded grave lord rather than the crowned skull in a robe.

- Source: `necro-b.px.js`, drawn with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl).
  Its compositor (parts laid with their edges darkened along their own ramp, round limbs and flowing
  strands) is the one from `../../ranger-knightstyle/c/`, with a `cut` option added to the strand for
  the cloak's torn strips. No pixels were copied or traced from the Mattz Art knight or any pack.
- Sheet: `sheets/necromancer-knightstyle-b.png`, 1056x144: 22 frames of 48x48 facing right, rows
  `["right", "glow", "glowLeft"]`.
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild (from the repo root)

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/necromancer-knightstyle/b/necro-b.px.js --out <scratch> --only necro_b
node gms/3001/sprites/lab/src/necromancer-knightstyle/b/make-sheet.mjs <scratch>/anims/necro_b.png gms/3001/sprites/lab/sheets/necromancer-knightstyle-b.png
```

`make-sheet.mjs` copies the strip and puts only the four bright soulfire greens (`#35a83a #6bd94a
#adff7a #ecffd2`) in the glow rows. `pxl check` gives no warnings.

## Design

- **Hood and face.** A 12x12 black-violet hood, lit from the upper left, with a lit front rim and a
  deep shadow under the brim. Inside it the skull in 3/4 to the right: a shadowed brow, two green eyes
  over darker green glow, a nose hole, and cheekbones, teeth and jaw lit from below in green-tinted bone.
  The light comes from the soul-gem clasp at his throat.
- **Crown.** A circlet of bone around the hood with three tines (the tallest at the front) and the green
  crown gem. It keeps the identity of the crowned lich without the gold of the classic look.
- **Mantle and cloak.** A dark mantle over the shoulders. A ridge of three curved bone spines rises from
  its back and rides the cloak's line. The long cloak streams back from the shoulders. Its outer lobe is
  lit mauve along the top, its inner lobe is in shade, and its end is torn into five strips of different
  lengths. A row of vertebrae runs down its spine, shrinking toward the end.
- **Robe.** A gaunt column that tapers from narrow shoulders to a zigzag tattered hem. It has round
  shading and two folds, and a belt of bone beads. Bone toes show under the hem.
- **Staff.** Black wood bound with bone rings. A small skull with green eyes sits at its head with a
  soulfire flame on it, and an iron scythe blade curves forward with a pale edge underneath.
- **Lean.** The head and shoulders sit forward of the hem, and the bony hand grips the staff ahead of him.

## Palette (38 colours on the sheet)

| material | ramp, dark to light |
|---|---|
| black-violet cloth (main) | `#0b0710 #140d1e #1f142e #251836 #2c1d40 #342248 #3c2753 #47305f #52366a #5f4276 #6c4c82 #7c5b8e #8d6a9a #a380a7 #b896b4` |
| bone | `#24182a #3d2a40 #5e4558 #826a77 #a8958f #cbbca8 #e6dbc2 #fff6e0` |
| bone lit by soulfire | `#557a5a #9dc489 #d6f2b8` |
| soulfire (accent; E-H glow) | `#061a17 #0b3324 #12552c #1e7e34 #35a83a #6bd94a #adff7a #ecffd2` |
| staff wood | `#160b10 #261419 #3b2022 #54302d #714638` |
| scythe iron | `#1a1a2c #2f3150 #535879 #9298b8 #dfe2f2` |

## Measurements (48x48 frames, soles on row 39)

| | Knight (plumed) | current Necromancer | Style B |
|---|---|---|---|
| hood/helm top to soles | 28 px | 37 px (crown) | 29 px (hood row 11), 31 px to the crown tines (row 9) |
| idle 0, figure without staff | 21x30 | 23x38 | 22x31 |
| idle 0, everything (staff, blade, flame) | 21x30 | 29x38 | 35x37 |
| head | ~10x10 helm | 11x14 skull + crown | 12x12 hood, 4x6 face |
| colours | 146 (shown frames) | 18 | 38 |

## Frames

- idle 0-7: a breath (the body sinks a pixel on frames 3-5, the head a frame later), the cloak rippling
  out behind, the hem swaying, the soulfire flickering, and the crown gem flaring white on frames 2-3.
- walk 8-15: a gliding stride under the robe (the bone toes step and lift), a 1 px bob, the cloak
  streaming back level, the staff carried and swinging.
- attack 16-21 (12 fps, attackRelease null, so the hit lands on index 3): 16 draws the staff back as
  sparks gather, 17 thrusts it up and forward as the flame swells, 18 has a big flame and an orb with the
  sparks close in, 19 is the burst (a ring and 16 rays of soulfire with a white-green core, about 21 px
  across, soulfire and a bony hand breaking from the ground ahead, the cloak flung back), 20 has the
  ring broken and fading with the ground fire sinking, and 21 brings the staff down with the last
  sparks.

## Weak spots

- 38 colours against the Knight's ~140: the ramps are long, but there is no anti-aliasing at the silhouette.
- The figure is dark by design: in game it reads by silhouette, face and soulfire more than by value.
- The staff and blade make it wider than the Knight (35 px against 21 in idle).
- The legs are hidden under the robe, so the walk is mostly hem, toes, cloak and staff.
- On the burst frame the flare hides the staff's skull and the root of the blade.
