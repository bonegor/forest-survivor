# Paladin · Knight style E (holy crusader)

`lab:paladin/knightstyle-e`, in the `Knight style · round 3` collection. A fresh look for Dame Seraphine
on the owner's request of 27 October 2026: the earlier Paladin looks (B, C/C2, D/D2) read oddly at the
head and not as a paladin. The inspiration is Diablo 2's Paladin (bare head, heavy plate, gold trim, a
tall shield with a cross, a sword and holy light), redrawn in the plumed Knight's style and turned the
way he is. None of the earlier looks' art was reused.

- Source: `paladin-e.px.js`, drawn with claude-pxl (MIT, https://github.com/augusto-scarvalho/claude-pxl).
  The compositor (Part / limb / strand / lay), the gait and the attack timing come from Paladin B
  (`../b/`, itself from Ranger C). No pixels were copied or traced from the Mattz Art knight or any pack.
- Sheet: `sheets/paladin-knightstyle-e.png`, 1056x144: 22 frames of 48x48 facing right, soles on row 39,
  rows `["right", "glow", "glowLeft"]`.
- Catalogue entry: `entry.json` here (not in `catalog.json`).

## Rebuild

```
node <claude-pxl>/bin/pxl.js build gms/3001/sprites/lab/src/paladin-knightstyle/e/paladin-e.px.js --out <scratch> --only paladin_e
node gms/3001/sprites/lab/src/paladin-knightstyle/e/make-sheet.mjs <scratch>/anims/paladin_e.png gms/3001/sprites/lab/sheets/paladin-knightstyle-e.png
```

`make-sheet.mjs` is Paladin B's helper: the glow rows hold only `#ffe48a #fff6cf #fffef6` (`g G W`: the
blade's blaze, the smear's edge, the crescent's white part, the pillar, the flash, the rays and the
sparks). `pxl check` gives no warnings; `check-entry.mjs` says "OK: bake-ready".

## Design

- **Head.** Bare, as the Diablo 2 Paladin's, and turned right in 3/4 the way the plumed Knight, Ranger B
  and Sorcerer A2 are (revised on the coordinator's note after the first pass, which read as a near
  front view). Short chestnut hair, lit on the crown, fills the top and the back (left) of the head and
  is tied at the nape into a short tail (a gold tie) that sways and streams. A thin gold circlet runs
  across the brow just over the eyes, with a one-pixel crimson gem over the nose's bridge. The face
  (`HEAD`, 13x9 at (18, 10) at rest) is the head's right (front) part: the ear behind the eyes at eye
  level, a 2 px dark lash over the near blue eye, a pixel of the lightest skin (the nose's light), a
  1 px lash over the far blue eye, a pixel of cheek past it; the nose's tip a pixel proud of the cheek,
  pointing the way she walks, the mouth forward under it, the chin forward. The neck sits under the
  back half of the head, between the pauldrons.
- **Plate.** Steel in purple-grey ramps like the Knight's: a gorget, a big rounded near pauldron (gold
  rim on its lower edge), the far pauldron peeking over the shield, vambraces and gauntlets, cuisses and
  greaves with knee glints, sabatons.
- **Tabard and cape.** The chest is turned right in 3/4: a deep crimson tabard with a gold cross set
  toward the chest's right (front) edge, a leather belt with a gold buckle, a skirt panel with a gold hem that swings; a short
  crimson cape from the shoulders (lit outer lobe, shaded inner lobe, fold streaks) that ripples and
  streams.
- **Shield.** A tall kite shield (7x14 face plus a 1 px edge) held forward on the far arm at the body's
  right side, seen a little angled: its left edge shows as a dark steel band. Dark polished steel lit
  from the upper left with a glint sliding down its face, a gold rim and a gold cross. Steel field and
  gold cross keep it readable at 1x without one more crimson mass beside the tabard.
- **Sword.** A straight two-edged blade (lit edge and shaded edge), a gold crossguard, a leather grip
  and a gold pommel. At rest and walking it is held low in the near hand, its point trailing back over
  the cape, where the light steel reads against the crimson.

## Frames (soles on row 39, anchorY 40)

- idle 0-7: the breath (the chest sinks a pixel on 3-5, the head a frame later); the shield lifted a
  pixel on 1-3; the cape, the skirt and the hair's tail ripple.
- walk 8-15: the gait of Paladin B / Ranger C (planted stride, bob on the contacts), a pixel forward;
  the sword arm swings a little, the shield stays before her, the cape and the tail stream back.
- attack 16-21 at 13 fps, the blow landing on attack index 3 (frame 19, attackRelease null):
  - 16 raise: the sword lifted up and back beside her head, already blazing (a white-hot blade in a
    pale-gold halo).
  - 17 loaded: high over and behind her head, leaning back, blazing brighter, rays off the tip.
  - 18 cut: the arm swept forward at shoulder height, the blade level ahead, a gold smear following
    its tip down from overhead.
  - 19 SMITE: the blade down before her; a broad crescent sweeps from above her head to the blade's
    tip, gold at its tail to white at its leading edge; a pillar of holy light falls on the foe ahead
    (x 43), with a white flash, rays and a shock along the ground. The blade and arm are drawn over the
    crescent so the cut stays readable.
  - 20 follow-through: the blade further down; the pillar breaks into dashes and white-hot sparks fly;
    the crescent's tail fades.
  - 21 recover: the sword swinging back toward its low rest.

## Palette (48 colours on the sheet)

| material | ramp, dark to light |
|---|---|
| steel plate | `#1b1430 #2a1f42 #3c3158 #53476f #6c628a #7c7298 #8c82a5 #9d93b3 #aea4c1 #bfb5cf #cfc5db #ded4e3 #efe5ec` |
| crimson cloth (tabard, cape, gem) | `#1e0716 #370b20 #560f28 #76152e #961d33 #b22b38 #c94540 #dc6a52` |
| gold (circlet, trim, shield rim and cross, crossguard) | `#2e0b08 #561806 #842c06 #b2500a #c46710 #d87d12 #e69a1a #f0ad22 #f8c43a #ffd650 #fff0a0` |
| skin | `#4a1d2a #6f333a #94494a #b56a5b #d68a6c #e7aa88 #f8c9a4` |
| chestnut hair, leather (belt, grip) | `#1f0b16 #3b1620 #5c2527 #7e3a2d #a2563a #c4774b` |
| eyes | `#1a1f42` (lash), `#4f8fd8` (iris) |
| glow (night rows) | `#ffe48a #fff6cf #fffef6` |

## Measurements (herocmp, 48x48 frames)

| | Knight (plumed) | Paladin now | Style E |
|---|---|---|---|
| idle frame 0 bounding box | 21x30 | 32x30 | 27x30 (the sword's point trails back to x 9, the shield to x 35) |
| top of the head to soles | 30 (helm top row 10 in a 48 frame) | 30 | 30 (hair row 10, circlet row 12) |
| colours | 146 | 45 | 48 |
| eyes at rest | – | – | near (26, 15), far (28, 15); lashes on row 14; nose tip x 30 |
| outline | none | none | none (no pure black) |

Both eyes are on the sheet in all 22 frames (a row lower on the breath and the walk's bobs, shifted
with the lean in the attack).

## Weak spots

- 49 colours against the Knight's ~146: ramps, no extra anti-aliasing.
- The tabard's cross is small (its bar is 3 px, beside the shield's rim); the shield's cross carries the
  "paladin" read.
- In the cut (18) the sword arm crosses the shield's top in steel on steel, so the arm itself is faint;
  the blade's blaze and the smear carry that frame.
- With the sword trailing back and the shield forward the idle box is 27 px wide, 6 more than the
  Knight's.
- The nose's tip, one pixel proud, reads a touch long at 6x and up; at 1x and 3x it is what turns the
  face right.
