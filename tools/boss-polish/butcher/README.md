# Grimgut material polish

`source.mjs` paints the extracted 128 × 128 model before the existing texture rig
builds its poses. Rebuild this boss with `node tools/boss-art/build.mjs butcher`.
Every original alpha byte is preserved. The hook, fist and cleaver remain in
their original shared texture islands, so the surface details follow the
existing rest, movement, charge, dash, recovery and slam motion.

The material pass separates pale scarred flesh, a coal executioner hood,
charcoal-blue apron, warm worn leather and cold steel. Authored clusters add a
hard hood brow with two narrow red eye slits, shoulder and belly scars with
short sutures, stitched apron binding, deep folds, selected rivets, knuckle
planes, a chipped cleaver edge, steel scoring and a highlighted open hook.
Blood is confined to selected scars, blade staining, hook barb and apron
stains. There is no permanent aura or new visual effect.

The shading ramps retain the original model's anatomical planes while limiting
each material ramp to 32 steps; the complete generated palette decreases from
7,386 to 734 colors. Authored highlights sit inside the existing silhouette.
The two narrow eye slits each have a darker second source row so that the
existing breathing deformation retains both eyes in every rest pose. The
two-column black gap is preserved and there is no bloom.

Evidence lives in `output/boss-polish/butcher/artist/`:

- `source-comparison.png`: original left and candidate right at 4× nearest
  neighbor scale.
- `baseline-game.png` and `v2-runtime/butcher-game-0000.png`: matched real Game
  idle scene, native Knight included.
- `candidate-poses.png`: every one of the 88 generated poses.
- `v2-runtime/butcher-game.gif`: continuous 30-second real Game tour with both
  facings, rest, travel, charge, slam and enraged charge.
- `v2-runtime/butcher-runtime.json`: all 88 source frames visited by the 60 Hz
  simulation; 450 scene captures at 15 fps. As in the original capture, the
  video sample rate alone does not capture every pose in each facing.
- `contract.json`: zero changed alpha pixels in source or any generated pose,
  identical complete metadata, no literal engine OUTLINE color, 88 frames.
- `v2/rest-eyes-all12.png`: all 12 rest poses; every pose retains both eyes.

Canvas dimensions remain 224 × 192; anchorY 166, below 25, body and all frame
timing remain identical. Encoded frame text changes from 1,233,928 to 1,243,820
base64 bytes. Runtime frame surfaces retain their original memory dimensions;
the palette is smaller. No gameplay, collision or engine files were modified.

Independent final visual acceptance is recorded by the dedicated reviewer,
separately from these implementation notes.
