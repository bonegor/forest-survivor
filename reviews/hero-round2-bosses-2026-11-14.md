# Six older bosses — art and animation implementation review

Implemented a substantive visual replacement for Butcher, Lich, Pharaoh, Frost
Giant, Thorn Queen and Pit Lord. The initial geometric prototype was rejected
and replaced with original detailed models, authored textured limb/cloth rigs,
and lossless palette/delta exports. Bone King and Demon Lord remain unchanged.

The preserved baseline is in `output/hero-round2-2026-11-14/bosses/baseline`.
Final source and rebuild instructions live in `tools/boss-art/README.md`; runtime
assets are in `public/assets/art/bosses-reforged/`. There is no production
dependency on generated-image cache paths, ignored output or native Canvas.

## Runtime and visual work

- 88 frames each for Butcher/Frost Giant; 84 each for Lich/Thorn Queen; 94 each
  for Pharaoh/Pit Lord. Includes 12-frame idle and 16-frame travel cycles.
- Butcher kits have charge anticipation, rapid planted dash steps, recovery,
  overhead slam and return. Normal/enraged charge clocks remain unchanged.
- Lich kits prepare and release volleys/summons, recover, and react to blink.
  Bone King kits display nova windup/impact/recovery, summon and volley poses.
- Slam impact maps to the existing 0.85-second damage release; nova to 1 second.
  The AI changes only supply missing pose labels. No damage/speed/cooldown or
  projectile origin parameters were changed.
- Actual AI `scale` values are preserved. Rendering divides source coordinates
  by the authored density, preserving 57-world-pixel bodies and original ground
  hit radii. This generic fix also supports the new high-density Ea-nasir boss.
- Density is respected by frame bounds, body boxes, reach, shadow, draw,
  combat-text width and death debris. The root/playthrough reviewer owns the
  additional shared hit-flash/squash draw/body transform repair.
- Detailed source colours now produce silhouette debris through cached nearest
  registered particle colours. The actual source sprite colours remain intact.

## Evidence

`tools/hero-round2-review/bosses.html` is the reusable live actual-Game review.
`tools/boss-art/capture.mjs` records the same 30-second encounter, all relevant
attacks and both facings, with matched simulation/animation/effect clocks.

For each boss, `output/hero-round2-2026-11-14/bosses/` contains:

- `<boss>-game.gif`: continuous 30-second actual-Game motion capture.
- `<boss>-runtime/0000.png` …: 450 sequential native Canvas samples.
- `<boss>-runtime.json`: times, frames, AI states, facings and effects.
- `<boss>-runtime-contact.png`: overview samples, and full game stills.
- `<boss>-rig-contact.png`: all authored source poses including loop boundaries.

The local seam pass repaired robe material behind staffs, boot material behind
axe shafts, complete crook ownership, and isolated native sampling fragments.
The final connectivity diagnostic reports no detached islands of eight or more
pixels in any authored frame. This is a technical seam check, not aesthetic
approval. The independent graphics reviewer retains final visual approval.

## Verification

Focused regression run: **36 tests passed**, zero failed, across boss behavior,
telegraphs, crypt preservation, Ea-nasir behavior, terrain/art integration,
new density/hitbox/release checks and new source-debris checks. Following the
final narrow seam/export correction, the eight density/debris tests passed again.

The historical Lich size test was updated to measure the opaque body and source
density instead of assuming the complete padded source canvas equals its body.
It still checks original AI scale, world height, head-label placement and actual
projectile origins. Tests are not used as aesthetic evidence.

Limitations: these are authored texture rigs built from original still models,
not independently repainted cel animation. Large attacks therefore retain their
source three-quarter body orientation while arms/equipment move. Complete
motion, joint weights, grips and overall quality must be judged in the supplied
clips and live game before final acceptance.
