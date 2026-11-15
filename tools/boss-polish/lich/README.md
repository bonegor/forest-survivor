# Malgrath material pass

`source.mjs` repaints the existing 128 × 128 model before the unchanged shared
rig bakes its 84 poses. It returns a copied `Uint32Array` and preserves every
source alpha byte. No silhouette, canvas, pivot, animation, gameplay or effect
changes are part of this pass.

The robe is layered violet velvet over a cool dark lining, with broad diagonal
cape folds and vertical inner folds. The formerly dense gold embroidery is
replaced with narrow antique-gold borders and three repeated lozenges. A stern
ivory profile, crown, emerald breast seal and two-eyed skull sceptre establish
the focal hierarchy. Final palette snapping keeps the artwork at 40 colors
(including transparency), versus 8,054 in the baseline pose asset.

Rebuild only this boss from the repository root:

```powershell
$env:BOSS_ART_REVIEW_OUT='output/boss-polish/lich/artist/poses'
node tools/boss-art/build.mjs lich
$env:CANVAS_MODULE='C:/Users/I/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'
$env:BOSS_REVIEW_OUT='output/boss-polish/lich/artist/game-final'
node tools/boss-art/capture.mjs lich
```

Artist evidence is in `output/boss-polish/lich/artist/`:

- `model-before-after-native.png`, `model-before-after-6x.png`: native source comparison.
- `poses/before-all84-native.png`, `poses/after-all84-native.png`: complete pose contacts.
- `poses/before-after-selected-2x.png`, `poses/before-after-rest-4x.png`: matched enlarged comparisons.
- `invariants.json`: identical metadata, 128 × 128 source, 84 poses, zero changed source or pose alpha bytes, and no engine outline color literal.
- `game-final/lich-game.gif`, `game-final/lich-runtime.json`: continuous 30-second real Game recording with 450 captures and the whole crown/staff visible.
- `game-final/release-sequences.png`: matched windup, release and recovery samples for all three spells in both facings.
- `runtime-coverage.json`: all 84 source frames observed; both facings; idle, travel, volley, summon and blink.
- `game-final/lich-game-*.png`: full 960 × 600 real Game frames.
- `game-before-after.png`: matched full-world baseline and candidate comparison.

The complete pose contacts, full Game captures and 24 release-sequence samples
have been visually inspected. Crown, face, vestment panels and staff remain
coherent across the rig. The full continuous recording is retained for the
independent boss reviewer. An earlier `game/` recording is superseded by the
corrected `game-final/` capture; its tight crop omitted the tallest equipment.

Focused check passed: `node --test --test-name-pattern='lich:' test/boss-polish-contract.test.js`.
