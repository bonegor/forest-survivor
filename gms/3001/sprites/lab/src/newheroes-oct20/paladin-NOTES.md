# Paladin v1: Dame Seraphine

`lab:paladin/v1`, in the `New heroes` collection. The source is `paladin.js`. It is drawn with the shared `../remaster-v5/kit.js`, unchanged, so there is no kit copy.

Build: `node gms/3001/tools/build.mjs gms/3001/sprites/lab/src/newheroes-oct20/paladin.js`

```
35 px tall · 22 frames (idle 8, walk 8, attack 6) · 22 colours · outline 99% · night 67%
lines up cleanly
```

## Measures

These come from `review/paladin-v1.json`, which `measure.mjs` writes.

| | paladin v1 | knight remaster-v5 |
|---|---|---|
| height | 35 (hammer top on row 5; helm top on row 10) | 33 |
| feet | row 39 on every idle and walk frame (feetOff 0, spread 0) | same |
| idle bob / drift / upper change | 1 / 0.55 / 0.19 | 1 / 0.57 / 0.22 |
| walk bob / drift / upper change | 1 / 1.85 / 0.60 | 1 / 1.24 / 0.60 |
| attack bob (top of the frame) | 2 | 3 |
| islandShare | 0.119 | 0.117 |
| ink walls | 0 | 0 |
| bright (> luma 150), idle f0 | 43% | 36% |
| night clear, idle f0 | 67% | 58% |
| colours | 22 | 14 |
| frames in pieces | none | none |

## Design choices

- **Not the Knight.** He is cool steel, a scarlet plume and cape, a sword and a red shield. She has:
  - pearl plate: warm ivory lights with lilac shadows (`1 #ebe5d9`, `2 #bfb6bc`, `3 #857c97`, `4 #544a6c`)
  - a white tabard and a short cream cape (`9`, `0`)
  - gold trim (`6`, `7`, `8`)
  - no plume and no shield
  - her face showing, with a copper fringe and ponytail (`a`, `A`, `m`)
  - a two-handed warhammer.
- **Helm.** An open-faced pearl dome with a gold brow band. In its middle is a sun gem (`Y`, which glows). Two eye pixels sit in a 5 px face of skin.
- **Torso.** A hand-placed stamp: the gorget, the tabard down the middle with a lit edge on the left and a warm shade on the right, and pearl cuirass at both sides.
  - On her breast is a 5×5 diamond sun (`Y`, with an `f` core), which glows.
  - Below are a gold belt and buckle, plate faulds flaring over the hips, and a front flap with a gold hem that swings with the stride.
- **Hammer.** A pearl-steel head, 8 across the haft and 6 along it, with a gold socket band, on a 2 px ash haft (`B`, `b`) with a gold butt cap.
  - When the haft is within 15° of upright, the head stays square to the frame, so the walk's small tilts don't break it into jaggies.
  - When the head is rotated (in the attack), it is bevelled and then despeckled.
- **Idle.** She stands at rest like a standard-bearer: the hammer upright in her far hand, butt near the ground, and the near arm at her side.
  - The breath lifts her chest, head, arms and hammer a pixel on f3–5. The last breathing row is also laid at rest, so no gap opens above the belt.
  - The hammer rocks −2° to +3° with the breath.
  - The cape's hem waves and its back corner streams 0–3 px. The ponytail sways −2 to +1, and the flap moves.
  - A glint crosses the hammer head on f2–4, and the sun's core flashes white on f6–7.
- **Walk.** The kit's GAIT runs with the far leg at phase i and the near leg at i+4, so the planted sole travels back and the passing foot lifts.
  - The body dips on the down frames, and the head lags a frame.
  - She carries the hammer upright, rocking ±5° with the far arm. Her free near arm swings 3 px against the near leg.
  - The cape, ponytail and flap trail by a frame.
- **Attack (Smite), at 13 fps.**
  - f0: she lifts the hammer skyward in both hands, and a sunburst of light gathers round its head. The rays are drawn after the outline, from it outward, so they stay joined to the sprite.
  - f1: she cocks it back over her shoulder. The hammer and far arm are drawn behind her head and body, so her face and the sun stay clear.
  - f2: she brings it over the top in a gold crescent smear (`z`, `Y`, `f`).
  - f3, the blow: the head slams into the ground in front of her. Light bursts up from it in spikes and as a pillar of holy light to row 3. The burst is drawn before the outline, so it is inked like the Knight's smear.
  - f4: the pillar thins.
  - f5: she recovers to the upright hold.
  - Both feet are planted in a lunge from f2.
- **Glow.** `emissive: 'Yfz'` (master keys), used only for the holy things: the sun on the tabard, the brow gem, the halo, the smear, the burst and the pillar. Her armour's gold is the custom `6`/`7`/`8`, which doesn't glow.

## Item art

`public/js/art/hero-paladin-items.js` exports `PALADIN_ITEMS`. Previews are in the scratchpad: `heroes/paladin/icons.png` (8x, then 1x and 2x, on grass and on night).
- `i_smite`: the warhammer upright (steel `G`/`g`/`N`, gold band `y`/`Y`/`d`, an ash haft), with a pillar of light (`f`, `Y`) falling on its head and splashing off it. It glows in `Yf`.
- `i_judgement`: the same hammer before a blazing sun, with rays all round. It glows in `Yf`.
- `brand`: a 7×7 gold diamond sun with an `f` core. It glows in `Yyf`.

## In-game shots: a note

`node gms/3001/tools/shot.mjs paladin/v1` shows the **Knight's** game sprite, not this one. The stage only wears lab sprites for the roles in `gms/3001/lib/cast.js` `HERO_ROLES`, and that list holds only the five original classes, so `paladin` falls back to the stub's `sprite: 'knight'`.

I didn't edit the lab code. Instead, the shots in `review/paladin-v1-{stand,walk,fight}.png` and `review/closer/paladin-v1-*.png` come from a scratch copy of `shot.mjs`: the same steps, opening `stage.html?hero=knight&wear=lab:paladin/v1`. So the HUD there is the Knight's.
