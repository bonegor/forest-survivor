# Azgaroth native art polish

Rebuild from the repository root:

```powershell
node tools/boss-polish/demonlord/build.mjs
```

`source.mjs` authors a harder crowned skull, black-iron breastplate and shoulder,
layered waist plates, and a connected furnace seal over the immutable baked
14-pose model in `public/assets/art/bosses.js`. All shapes clip to the original
opaque pixels. The invocation's turned head retains its original side profile;
the frontal face is not pasted onto the back of the skull. Hand highlights use
the authored finger and wrist pixels. Transparent articulation gaps are kept.

The broad blood-red wing planes and their original folds are retained. Rest has
a dark red seal; invocation introduces a small hot core and release strengthens
that same connected cluster. This is a pixel emphasis at the original pose
indexes, with no timing, telegraph or effect change.

The palette remains ten entries; the dark purple body material becomes the
game's existing `#262b44` iron shadow, while `#5a6988` supplies a restrained metal
plane. Orange and yellow remain the same emissive colors. There is no added
glow layer. Production integration continues using the original outline and
body metadata.

The build emits `public/assets/art/bosses-polished/demonlord.js`, source contacts
at native and 4× nearest-neighbor size in both facings, and `invariants.json`
under `output/boss-polish/demonlord/artist/`. It throws if any opaque/transparent
pixel changes. Frame count, dimensions, order, metadata, palette entry count,
index width, and 430,080 decoded frame-buffer bytes are unchanged.

Actual Game evidence is recorded with the shared real Game/Enemy encounter
harness, after the production import selects the candidate:

```powershell
$env:CANVAS_MODULE='C:/Users/I/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'
$env:BOSS_REVIEW_OUT='output/boss-polish/demonlord/artist/game-v1'
node tools/boss-art/capture.mjs demonlord
```

The dedicated reviewer owns final approval and the additional biome review.
Source invariant checks establish geometry and storage equivalence, not visual
quality. No gameplay files are authored by this build.
