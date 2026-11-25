# Hero design proposals

Eight new sprite models: Ranger, Sorcerer, Shadow, Necromancer, Paladin, Druid, Berserker and Witch Hunter. Knight remains unchanged. No production sprite file or saved profile is written by this workflow.

## Art history

1. `src/models.mjs`: frozen first generation. It imports only the game's master palette; it does not derive pixels or equipment from existing hero sheets.
2. `review/skill-vetting.md`: the independent reviewer's vetting of the online Pixel Art Fundamentals skill and critique checklist.
3. `review/first-pass-review.md` and `feedback.json`: the single formal visual critique, based on native art, actual daylight/crypt renders, motion sequences and the approved Knight.
4. `src/models-fixup.mjs`: one review-driven fixup iteration, chiefly compact anatomy, connected collars/heads, wider heavy-class bodies, readable elf hair and a visibly perched crow.

The first generation is deliberately retained intact. The fixup was checked for rendering and pose consistency, not subjected to another subjective review round.

## Reproduce

Run from the repository root:

```powershell
node tools/hero-redesign/build.mjs 1
node tools/hero-redesign/build.mjs 2
node tools/hero-redesign/serve.mjs
```

Open http://127.0.0.1:3013/ for the latest comparison. `/round2.html` preserves first generation versus fixup; `/first-pass.html` preserves the initial current-game versus first-generation comparison.

The review uses the real Game, Player, sprite builder, camera, lighting, HUD and HeroShowcase, with an in-memory profile. Every model has eight idle poses, eight walking/floating poses, six attacks and 48 combined moving-attack poses. Sprites use 52x52 canvases, anchor 45 and only the game's master palette.

**Capture all eight** records idle, both walking directions, diagonal travel, both attack directions and moving attacks in daylight and crypt lighting. Controls are disabled during the recording. Fresh timestamped takes preserve previous captures. Each context has 312 native paired PNG frames at 30 FPS, plus full game and selection views and pose/identity/timing records.

With Pillow available, run `python tools/hero-redesign/package.py` after the final comparison capture to create `/out/review.html`, animated comparisons and pose sheets. The helper samples at 10 FPS without changing the 10.4-second timeline. The end-to-start GIF jump resets the complete demonstration. Outputs are under `tools/out/hero-redesign/`; the editable source is in this directory.

`preview.py 1` and `preview.py 2` render native pose sheets. The package step checks full walk/float pose coverage, frame bounds, hero identity and capture duration. Frozen hashes preserve the relationship between each iteration and the review.


## Round three

`node tools/hero-redesign/build.mjs 3` builds the third-generation models in `src/models-round3.mjs`. Witch Hunter is authored in `src/witchhunter-round3.mjs` with a two-handed crossbow and no firearm muzzle flash. Prior artwork and review files remain frozen.

`/round3.html` preserves the interactive round two versus round three comparison. After recording this pair, `python tools/hero-redesign/package-round3.py` writes `/out/round3.html` and uniquely prefixed media. The original `/out/review.html` remains available. Each packaged iteration retains its own capture manifest, so regenerating an earlier gallery does not silently consume a newer recording.

## New roster after round three

The user rejected the similarity of round three. `src/models-round4.mjs` starts a separate roster in `src/fresh/`, sharing only raster drawing primitives and the game's palette. Character anatomy, clothing, weapon art and movement are authored anew. None of these modules imports earlier model geometry or sprite sheets.

The new directions are Copperleaf Huntress, Storm Oracle, Pale Eclipse, Carrion Prophet, Solar Bastion, Briar Hermit, Bloodcrest and Crimson Inquisitor. The Ranger retains exposed hair and elven ears; the Necromancer retains a crow; Witch Hunter retains a crossbow. Knight is excluded.

Build with `node tools/hero-redesign/build.mjs 4`; use `preview.py 4` for native art. The builder rejects clipped drawing operations in every idle, walking, attacking and combined pose. The default comparison pairs round three with these new characters through the actual game renderer. After capturing, `package-round4.py` writes `/out/round4.html`. Gallery output remains a review proposal, without changing the production roster or saved progression.
