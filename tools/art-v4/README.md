# Hero proposals · 29 October 2026

The active roster keeps the Plumed Knight unchanged. Ranger, Sorcerer, Shadow,
Necromancer, Druid and Witch Hunter keep their original sprite as baseline.
Paladin and Berserker keep their unchanged V3 as baseline. Each of the eight
non-Knight heroes has exactly two new options, `v4a` and `v4b`. Retired saved
choices resolve to the approved game default. Old source studies remain historical
authoring material and are no longer registered as selectable game art.

## Approved game defaults

Ranger: **Moonsteel Huntress**; Sorcerer: **Ember Sage**; Shadow: **Nightveil**;
Necromancer: **Bone Regent**; Paladin: **Iron Vow**; Druid: **Oakwarden**;
Berserker: **Red Fang**; Witch Hunter: **Original**. The Plumed Knight is unchanged.
These choices ship in `data/hero-review.js`, independent of browser settings.
Explicit choices in a player's LOOK setting still override the default.

## Review

Run `npm run lab`, then open <http://localhost:3001/game/skins/>. Each hero has
four synchronized views: Knight reference, baseline, A, B. Controls cover idle,
walk/hover, attacks, both facings, pause, slow motion and single-frame stepping.
Each view links to a real, playable forest test with in-memory progress only.
The LOOK control in the normal hero screen also exposes the same active choices.
Preview settings on port 3001 are separate from settings on port 3000.

## Rebuild and capture

- `node tools/art-v4/bake.mjs` rebuilds all sixteen assets from native editable
  drawing sources under `src/`. It inherits the retained baseline's animation
  lists, rates, anchors and attack-release metadata.
- Set `CANVAS_MODULE` to an installed `@napi-rs/canvas` module, then run
  `node tools/art-v4/capture.mjs` for twelve-second captures through the real
  HeroShowcase, Player and Game renderer. The simulation is 60 Hz; exported
  frames are 20 fps (240 frames, exactly 12 seconds).
- `python tools/art-v4/package.py --helper <skill>/scripts/capture-gif.py`
  creates GIFs with exact 50 ms frame durations and whole-loop contact sheets.
- `node tools/art-v4/field-capture.mjs` captures the actual forest, camera,
  lighting, HUD, diagonal movement and combat. Optional arguments restrict it
  to named heroes.

Artifacts go under `output/hero-v4/`. Baseline captures precede integration;
the baseline assets themselves are unchanged. Shadow proposals keep their
single float loop and suppress extra engine bob; all Shadow looks omit footstep
particles and sounds. Terrain effects and combat mechanics are unchanged.

Focused regressions are in `test/hero-skins.test.js` and `test/hero-v3.test.js`
(the latter filename is retained). They verify exact retained pixels, active
choices, model differences, complete cycles/facings, neck continuity, Ranger
release timing, unchanged gameplay and hovering without footsteps. Visual
preference remains the owner's decision.
