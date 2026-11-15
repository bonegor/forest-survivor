# Thorn Queen material pass

`source.mjs` paints the existing native source before its unchanged articulated
rig. Her identity is a severe mint-skinned fae ruler: purple eye, thorn crown,
dark royal-violet silk, broad overlapping green leaves and a magenta living
sceptre flower. Deliberate planes and seams replace generated microtexture.

Rebuild only this boss with:

```powershell
$env:BOSS_ART_REVIEW_OUT='output/boss-polish/thornqueen/artist/poses'
node tools/boss-art/build.mjs thornqueen
```

The hook is synchronous and pure, copies its Uint32Array, preserves source box
and exact per-pixel alpha, and introduces no animation, effects or gameplay
changes. All 84 baked frames retain their 224×192 allocation, alpha masks,
anchors, body metadata and clocks. Palette has 32 opaque colours.

Artist evidence is in `output/boss-polish/thornqueen/artist/`:

- `source-comparison.png`: native and enlarged original/painted source.
- `face-comparison.png`: original/painted face and crown close-up.
- `game-comparison.png`: matched actual Game crops at native capture scale.
- `poses/*-both-facings.png`: all 84 poses, both facings, inspected as complete
  chronological actions including the loop boundaries.
- `game-final/thornqueen-game.gif`: continuous 30-second actual Game tour,
  450 samples at 15 fps, with all 84 frames observed by 60 Hz simulation.
- `game-final/*-sequence.png`: volley, summon and blink release/recovery
  contacts for both tour halves. The living sceptre remains connected and the
  mint face, leaves and violet robe remain distinct through the rig.
- `verification.json`: independent direct baked-frame alpha/metadata check,
  pure/deterministic source check and candidate hash.
- `evidence.mjs`: reproducible evidence and invariant generation.

Validation: `node --test --test-name-pattern=thornqueen
test/boss-polish-contract.test.js` passes. Independently decoded candidate and
frozen baseline assets preserve every frame's complete alpha and metadata.

Inherited capture limitation: during the second blink (~27.28 seconds), the
actual AI teleports above the player-centred viewport and the top of the boss
leaves the recorded screen. Full blink source poseboards cover the entire
character in both facings. The scene camera and teleport are unchanged by art.
