# Ranger, Berserker and Ea-Nasir style match

The previous source-detail export made these heroes visibly smoother than the
rest of the roster. All three now use an 80×64 native canvas, opaque pixels and
the game's master palette. Their logical footprints, anchors, clip indices,
combat timings and gameplay remain unchanged.

- Ranger retains her auburn/olive identity and complete source gait, with
  deliberate face pixels and continuous bowstrings. 19 visible colours,
  125 frames. The dedicated reviewer accepted the final version.
- Berserker retains the source model and both axes. A second material pass
  strengthened skin planes, dark straps, rust hair and steel blades after the
  dedicated reviewer found the first reduction too muddy. 21 visible colours,
  177 frames. The reviewer accepted the revision.
- Ea-Nasir uses a coherent code-authored adaptation of the retained worshiper
  reference: almond eyes, scalloped hair, tiered beard and fringed ivory linen.
  The second visual review requested smaller head/beard proportions, separated
  eyes and stronger cloth volume; V3 resolved them and was accepted. 14 visible
  colours, 117 frames. The hero and crypt boss share the model.

Each hero had a separate updater and independent reviewer. Review included
chronological idle/walk/attack sheets, every moving attack combination, real
Game captures in both directions and diagonally, field/crypt combat, and the
selection screen. Each final take has 344 timed frames with zero clipping.
Ea-Nasir's three boss attacks were also checked in both facings. Loop returns,
weapon grips and the native roster comparison were inspected explicitly.

Validation used a clean copy of the shipping commit plus only this change:

- Full suite: 1,189 tests passed. Local HTTP tests ran outside the network sandbox.
- After Ea-Nasir's final visual refinement: all 43 focused art, gait, Ranger
  projectile-origin, merchant combat and integration tests passed.
- Release build: 301 files, 204 module imports checked.
- The existing local V1/V2 proposal test remains untracked; only its three
  source-detail expectations were updated for native-density Ranger/Berserker.

The reproducible, in-memory playable comparison is documented in
`tools/style-match-review/README.md`. It uses the exact pre-edit art from
commit `6a7d8bb` and the production Game/Player/lighting/HUD/showcase. Saved
progression is never loaded or changed by the review tools.
