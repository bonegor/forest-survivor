# Detailed boss source and animation

The current field-art rebuild is documented in [Forest Survivor boss field art](../boss-chunky/README.md). This page describes the previous source art and its shared rig. When reproducing the previous build, set `BOSS_ART_ASSET_OUT` to an evidence folder before running the build command below.

These six original boss models replace the previous two-frame Butcher, Lich,
Pharaoh, Frost Giant, Thorn Queen and Pit Lord. The subsequent material pass in
`../boss-polish` also updates Bone King and Demon Lord. The original atlas is
`source/bosses-original-2026-11-15.png`, generated
with the built-in image tool and copied into the repository. It includes an alpha
channel; its RGB under fully transparent pixels is intentionally ignored.

Run `node tools/boss-art/build.mjs` from the repository root. The build has no
external dependencies. It extracts native source pixels, removes disconnected
neighboring atlas scraps, applies each boss's authored material hook, and bakes
texture rigs into `public/assets/art/bosses-reforged/*.js`. Each boss has connected
shoulder/elbow/hand and hip/knee/foot motion, a head counter-motion, and independent
cloth/fur motion. A fist and its whole weapon share one rigid forearm island.
Hidden cloth/boot surfaces are extended only behind moving limbs/equipment.
One-pixel sampling seams are joined; detached tiny texture scraps are removed.

The exported source silhouette is 114 pixels high. `hires = (57 / oldHeight) * 2`
keeps each source pixel at 0.5 world pixels while retaining the original Enemy
AI scale. Source body widths preserve the six original ground radii. All engine
geometry, shadows, debris and combat-text clearances respect that density.

The production files contain lossless palette indices with inter-frame delta
coding. The source sprites are never reduced to the particle palette. Sprite
debris instead maps previously unregistered shades to the nearest existing
particle colour, with a cache independent of exact colour registrations.

Review in the real game with `node tools/hero-round2-review/serve.mjs`, then open
`http://127.0.0.1:3018/bosses.html`. Each 30-second tour includes idle, travel,
all relevant attacks and recovery, both facings, and the Butcher kits' enraged
charge. The Demon Lord's full tour takes 42 seconds. The route uses current Game/Enemy/boss AI, an in-memory profile, and the
same simulation time for movement, pose and effects.

`capture.mjs` records that same encounter with native Canvas and makes continuous
GIFs through ffmpeg. Its optional native Canvas module can be selected using the
`CANVAS_MODULE` environment variable. `connectivity.mjs` reports detached source
islands of eight pixels or more for inspection; it is diagnostic evidence, not
an aesthetic approval test.

## Image generation prompt record

The built-in tool was used, not the CLI/API fallback. The model prompt requested
a transparent three-column/two-row atlas of exactly six full-body original
right-facing, three-quarter medieval fantasy boss sprites, with anatomy and
material shading at the level of Heroes of Might and Magic III units, small
anatomically proportional heads, deep contact shadows, clear brows/jaws, crisp
pixel clusters and no text, scenery or UI. Individual identity requirements:

- Butcher: huge belly/shoulders, pale scarred flesh, black executioner hood with
  narrow red eyes, stained grey apron, heavy boots, steel hook and upright cleaver.
- Lich: skeletal king-mage, gold crown, green eyes, engulfing violet robes with
  embroidered folds, armored high collar, skull-topped staff.
- Pharaoh: stern gold death mask, lapis/gold nemes, bandaged muscular arms,
  jeweled collar, long royal robes and a hooked golden staff.
- Frost Giant: blue barrel-chested giant, horned steel helmet, huge white beard,
  ivory/brown fur mantle and kilt, leather boots, large ice axe.
- Thorn Queen: severe mint-green face, purple eyes, thorn/flower crown, sweeping
  green/violet layered gown and leafy mantle, vine staff with magenta flower.
- Pit Lord: hulking red demon, severe bestial face and fire eyes, thick curled
  horns, spiked black iron shoulders, layered waist armor, heavy boots, fissured
  black-iron greatsword.

The follow-up edit prompt preserved all six models, placement, anatomy, textures
and equipment exactly and requested transparent alpha outside their silhouettes,
including gaps between limbs and weapons, without haze, shadows or checkerboard
pixels. It explicitly preserved shafts, hooks, horns, thorns and weapon edges.
