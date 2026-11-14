# Ea-nasir statue model revision

Completed 15 November 2026; ready for the final independent graphics review.

The merchant now uses a coherent source-textured statue model instead of the flat procedural face, wedge beard, block arms and rectangular skirt. The user's later clarification required the exact statue pictured on Wikipedia. That superseded the initial bald, short-skirt concept before production integration.

## Exact reference and visual decisions

The inspected reference is the **Standing male worshiper, Met accession 40.156**, pictured on [Wikipedia's Ea-nāṣir page](https://en.wikipedia.org/wiki/Ea-n%C4%81%E1%B9%A3ir). It is an identity/art reference, not a claim that the statue is a historical portrait of Ea-nasir.

- [Commons image and CC0 declaration](https://commons.wikimedia.org/wiki/File:Standing_male_worshiper_MET_DT850.jpg)
- [Met collection record](https://www.metmuseum.org/art/collection/search/323735)
- [Met original photo](https://images.metmuseum.org/CRDImages/an/original/DT850.jpg)

The final art preserves its wavy carved hair around the head, continuous double-arched brows, very large bordered white eyes, narrow projecting nose, wavy beard sides with horizontal ring curls, and long wrapped skirt with vertical fringe. Shaded shoulder/forearm/hand volumes, substantial feet, warm copper and clear dark material recesses bring it into the game's existing fantasy pixel style. Copper and whip remain the existing game adaptations. Root visually inspected and approved the exact-statue source direction before full integration.

The built-in image generation tool produced the source model and the identity correction. The selected source is repository-local at `tools/eanasir-source/model.png`; its final prompt is in `tools/eanasir-source/prompt-final.txt`, and the CC0 museum reference is in `tools/eanasir-source/reference/standing-male-worshiper.jpg`. The final source SHA256 is:

`0327164338656b94f2f34672137d2dbf0b69bc559deb562dd2d3136e73c66430`

## Coherent animation and integration

- `tools/eanasir-source/build.mjs` creates all frames deterministically from that one source. It exports the full 16-phase idle, 16-phase connected gait, original five attack phases and all 80 attack/gait combinations. The long wrap has a small delayed sway while supporting feet remain registered.
- The whip arm uses one source-textured shoulder/elbow/hand rig. It moves from the rear resting guard through preparation to logical grip `(44,38)` at release. The old arm and whip coil are removed before drawing the active arm. During release/follow-through, the source contains only a short connected handle/stub; the actual game lash effect owns the extended strand, preventing two competing whip lines.
- Source dimensions are 160×128, density 2, anchor 112, body 50×88 and below-foot padding 14. Logical world size remains 80×64 with anchor 56 and body 25×44. The same art renders the playable hero and crypt merchant boss.
- Walk and idle cycle durations are preserved when increasing frame counts. Attack cadence remains 18 fps, release index 2, and manual impact delay 2/18. No combat statistics, evolution requirements, collision logic, boss AI or saved progression were changed by this art pass.
- `public/js/art/eanasir.js` retains the existing copper discs, weapon icons and evolution icons, delegating only hero/portrait art to `eanasir-source.js`. A test compares all copper definitions against the previous pass.
- The packed production asset is `public/assets/heroes-authored/eanasir.js`. Running `node tools/eanasir-source/build.mjs` reproduces it byte-for-byte, using only repository-local inputs and no image API.

## Final evidence

All paths below are under `output/hero-round2-2026-11-14/eanasir-art/`:

- `eanasir-threeway.png`: previous pass versus the final statue source at matched logical sizes, including native S1 and desktop S2.4. The filename is historical; the board has two variants.
- `eanasir-motion-contacts.png`: every gait phase, all attack phases, representative moving attacks and idle phases.
- `final-s1/` and `final-s2.4/`: final production Game/Player/Camera/lighting captures after shortening the redundant source lash. Each has 344 timed frames, complete chronological contact boards, moving-attack matrices and coverage metadata. These supersede the earlier `game-s1/` and `game-s2.4/` takes.
- `eanasir-game-motion.gif`: final 17.2-second, 20-fps desktop Game sequence, including both facings, diagonal travel, idle, field combat, crypt idle, manual attacks and moving manual attacks.
- `selection/selection-640.png`, `selection/selection-480.png`: actual HeroScreen with a disposable in-memory unlock; matching detail/scroll views are alongside them.
- `boss/`: six actual seeded crypt scenes, left/right whip, fireball and copper. `release-contact.png` and individual release PNGs expose the active effect/grip. `coverage.json` records actual merchant AI state/frame/effect selection, source density and unchanged profile. The 168-frame sequence is packaged as `eanasir-boss-motion.gif` at 20 fps.

The source model, source/pose boards, desktop Game frame, selection render and both boss whip release facings were directly inspected. The hand and single lash are connected in the final actual Game render. Long cloth deliberately hides most of the leg motion; a supporting foot and lifted return remain visible beneath its hem. Native S1 remains a small face and is not represented as portrait-level detail.

## Verification

All **26 focused tests passed** across source identity/geometry, cadence, release-hand pixels, copper icon preservation, complete hero art connectivity, merchant whip behavior, merchant boss tells/releases and copper integration. Both hero capture scales visited every idle and gait phase with **zero clipped frames**. All six boss scenes reached the intended release in the intended facing. In-memory profiles remained unchanged.

The tests establish source identity, geometry and integration; they are not the aesthetic approval. Final independent graphics and playthrough review remain root's next step.

The Ranger/Berserker source-detail exporter was also made portable during this task: four required source atlases and minimal metadata now live under `tools/animation-round/baseline/detail-models/`. Rebuilding from those copies produces byte-identical production assets. It no longer depends on the ignored `example sprites folder` tree.
