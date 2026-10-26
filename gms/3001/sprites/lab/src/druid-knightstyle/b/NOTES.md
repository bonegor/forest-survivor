# Druid · Knight style B (Forest spirit)

`lab:druid/knightstyle-b`, collection `Knight style · round 3`. A freer redesign of Bramwyn in the
plumed Knight's style. Drawn with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl).
No pixels were copied or traced from the Mattz Art knight or any pack. The compositor (parts laid
with their boundary stepped darker along their own ramp) comes from Ranger C.

- Source: `druid-b.px.js`, `make-sheet.mjs` (adds the glow rows).
- Sheet: `sheets/druid-knightstyle-b.png`, 1056x144: 22 frames of 48x48 facing right, rows
  `["right", "glow", "glowLeft"]`.
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild (from the repo root)

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/druid-knightstyle/b/druid-b.px.js --out <scratch> --only druid_b
node gms/3001/sprites/lab/src/druid-knightstyle/b/make-sheet.mjs <scratch>/anims/druid_b.png gms/3001/sprites/lab/sheets/druid-knightstyle-b.png
```

## Design

- **Main material: a moss-green cloak of leaves.** It has a hood of leaves over the back of the head,
  a leaf mantle over the shoulders, a long two-lobed cloak and a leaf skirt. The cloak's rim is cut
  into leaf points (`jag`) and its cloth is laid in staggered leaf scales (`LEAF`).
- **Head: a deer skull worn over the brow and nose.** The snout points forward with a dark nostril
  tip. A gold eye glints in the socket. An ash beard falls below it, with a little skin at the cheek.
  Two bone antlers rise from the crown: they taper, with tines, the near one lit and the far one in
  shade.
- **Staff:** gnarled living wood with a wobble, knots and a leafy twig. At the top, a claw of two
  twigs with leaf buds cradles the **gold seed**, the one accent. It pulses in idle and blazes in the
  attack.
- **Legs:** bark-brown wraps with bands, and wrapped feet.
- **Stance:** feral. He leans forward a little, the skull forward over the staff hand, his stance is
  wide and the cloak streams out behind him.

## Palette (42 colours on the sheet, 38 in idle)

| material | ramp, dark to light |
|---|---|
| leaves / robe (main) | `#0a1519 #0e2024 #122c2b #173b30 #1d4b34 #2b6639 #3f8040 #619d40 #8fbd4a #bcd862 #e3ef9c` |
| bone / beard | `#241a33 #382c48 #50425f #6c5f78 #8a7d90 #a99ca7 #c6b9b8 #e0d4c8 #f4ecdc` |
| wood / wraps | `#1d0f15 #2d171a #3f201e #552c23 #6b3a29 #84502f #9c6538 #b67f46` |
| skin | `#4a1d2a #6f333a #94494a #b56a5b #d68a6c #e7aa88` |
| seed gold (accent) | `#4e1a08 #93380c #c25f14 #e8901f` + glowing `#ffc93c #fff19a #ffffff` |
| strike light | glowing `#e2f77a #a8e05c` |

Glow (rows 1-2): `#ffc93c #fff19a #ffffff #e2f77a #a8e05c`. These are the seed, the eye and the
strike's light, and they are used nowhere else. No pure black pixels.

## Measurements (48x48, soles on row 39)

| | Knight (plumed) | Druid now (v1) | Style B |
|---|---|---|---|
| idle frame 0 box (herocmp) | 21x30 | 31x36 | 30x37 (staff and antlers included) |
| idle frame 0 box without the staff | — | — | 24x37 |
| head top (helm / skull crown) | row 12 | row 12 (hood) | row 12 |
| top of everything | row 10 (plume) | row 4 (antlers) | row 3 (antler tips) |
| idle box, average of the 8 frames | 23.4x28.3 | — | 33x36.8 |
| colours in the shown frames | 146 | 25 | 42 |

## Frames

- **Idle 0-7 (6 fps):** he breathes (the chest sinks on frames 3-5 and the head follows a frame
  later). The cloak ripples, swelling out and settling. The beard sways. A leaf tears off the cloak's
  tip and a second drifts away (two loops offset). The seed brightens on frames 2-3.
- **Walk 8-15:** a low, prowling stride with the body bobbing (`BOB`). The cloak streams back and
  ripples, three shed leaves trail behind, the staff swings with the near hand and the beard is
  blown back.
- **Attack 16-21 (12 fps, strike on index 3 = frame 19):**
  - 16, gather: he sinks with both hands on the staff.
  - 17, heave: the staff goes up high, the body rises and the seed flares.
  - 18, drive: he lunges. Streaks of light trail above the seed, with blur lines down both sides of
    the staff and ahead of its foot.
  - **19, strike:** the staff's foot hits the ground ahead and he crouches low. A filled dome of
    white, gold and green light bursts out, a ring of light runs along the ground (about 28 px),
    rays fan up to 15 px, roots break out, sparks fly, and the cloak is flung back with leaves.
  - 20: five curling roots stand at full height with leaf tips, the dome breaks into dashes and
    motes rise.
  - 21: he straightens, the roots sink and motes drift.

## Weak spots

- On grass, green-on-green: the cloak's mid tones sit near the ground's value. The figure reads by
  its dark edges, the bone skull and antlers and the gold seed, but less boldly than the Knight's
  red and steel.
- 42 colours against the Knight's ~140. The ramps are hue-shifted but not anti-aliased further.
- The skull is a pale mask read mainly by its socket, its eye and its antlers. At 1x the long snout
  reads only a little.
- Behind the long cloak the legs show mostly as feet. The walk reads by the feet and the bob.
- The near forearm crosses to the staff almost level at the waist, and in the attack the far arm
  reaching the staff shows as a thin dark line.
