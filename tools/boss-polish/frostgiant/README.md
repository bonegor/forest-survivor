# Frost Giant — Frostthane art pass

`source.mjs` paints the existing 128×128 source model before the shared boss rig
samples it. It uses explicit material regions and native pixel geometry: cold
slate helmet, recessed icy eyes and blue nose, ivory beard locks, blue anatomical
planes, muted fur, dark leather, a bronze belt medallion, and large crystalline
axe faces with a continuous bright cutting edge.

The source dimensions, box and every alpha value are preserved. No rig,
silhouette, gameplay, effects or glow code is changed. The baked asset keeps all
88 frames at 224×192 and all original animation/body metadata. The reserved
`#181425` outline colour is absent.

Rebuild from the repository root in PowerShell:

```powershell
$env:BOSS_ART_REVIEW_OUT='output/boss-polish/frostgiant/artist/poses'
node tools/boss-art/build.mjs frostgiant
node output/boss-polish/frostgiant/artist/verify.mjs
$env:CANVAS_MODULE='C:/Users/I/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'
$env:BOSS_REVIEW_OUT='output/boss-polish/frostgiant/artist/game-final-v2'
node tools/boss-art/capture.mjs frostgiant
```

Review evidence in `output/boss-polish/frostgiant/artist/`:

- `source-before-after-2x.png`: matched original and painted native source.
- `all-88-before-after-native.png` and `all-88-before-after-2x.png`: every pose.
- Separate rest, travel, charge, dash, recover and slam comparison boards.
- `key-poses-before-after-2x.png`: selected poses and attack extremes.
- `validation.json`: exact source alpha, all 88 frame masks and metadata checks
  against `output/boss-polish/before/assets/frostgiant.js`.
- `game-final-v2/frostgiant-game.gif`, runtime PNGs and JSON: a continuous
  30-second real Game capture at the actual clock, both facings and all attacks.
- `game-before-after-both-facings.png`: frozen and current real-Game stills.
- `runtime-validation.json`: all 88 frames reached at 60 Hz; 85 distinct source
  frames sampled in the 450-frame, 15 fps recording. All runtime records match
  the frozen take, including attacks, effects, body rectangle and facing.

`game-final` is the earlier take before the small nose/eye refinement;
`game-final-v2` is the current baked asset. Source painting is deterministic and
does not add independently generated poses or resample the character geometry.
