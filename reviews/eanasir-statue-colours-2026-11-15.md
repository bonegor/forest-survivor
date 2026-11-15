# Ea-Nasir statue likeness and colours

Ea-Nasir now uses the warm beige and taupe stone colours of the user's
[standing worshiper reference](https://commons.wikimedia.org/wiki/File:Standing_male_worshiper_MET_DT850.jpg).
Hair, face, beard, torso and skirt share one carved material. The small scalloped
crown, double-arched brow, inset eyes, long five-tier beard, inward resting arms
and deep vertical fringe bring the silhouette closer to the statue. Copper and
leather remain small, muted gameplay accessories.

The art keeps the game's coarse opaque pixels and outline thickness: 80×64,
density 1, 16 visible colours, 117 frames. The logical body, foot anchor, motion
cadence, attack release at (44,38), damage and weapon effects are unchanged.
Ranger and Berserker are unchanged by this follow-up.

The dedicated updater and independent reviewer completed a fresh review against
the exact retained museum photograph. The reviewer approved the revised material
and likeness after inspecting all idle, walk and attack poses, every moving
attack combination, actual Game movement in both directions and diagonally,
field and crypt combat, all three boss attacks in both facings, and selection
layouts at 640×420 and 480×270. This supersedes the earlier human-merchant art
approval recorded in `hero-style-match-2026-11-15.md`.

Validation on a clean shipping snapshot containing only the scoped changes:

- Deterministic export matches the reviewed asset byte for byte.
- 33 focused art, gait, combat and integration tests pass.
- Actual Game capture: 344 frames, no clipped poses; boss capture: 168 frames.
- Release build: 301 files, 204 module imports checked.

The source, reference provenance and export instructions are in
`tools/eanasir-source/README.md`. The playable comparison accepts
`STYLE_REVIEW_BASELINE=aa98685` and shows the exact prior shipping artwork.
Disposable review evidence is retained locally under `output/eanasir-statue/`.
