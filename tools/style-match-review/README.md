# Native hero art comparison

Run `node tools/style-match-review/serve.mjs`, then open <http://127.0.0.1:3019/>.
Ranger, Berserker and Ea-Nasir are compared against their exact shipping art at
commit `6a7d8bb`. The rest of the roster is available in the same scenes.

Both columns use the production Game, Player, camera, lighting, combat and
HeroShowcase with disposable in-memory profiles. Walk in both directions,
travel diagonally, inspect field and crypt combat, or use WASD/arrows and X.
The selection showcases use each side's matching character art. The scene selector
provides forest, daylight and crypt views; `?scale=1`, `2.4`, or `3.2` checks
different display densities. `STYLE_REVIEW_PORT` changes the loopback port.
`STYLE_REVIEW_BASELINE` accepts a Git commit hash for a later comparison. For
the statue-colour correction, use `aa98685` and select Ea-Nasir; the Ranger and
Berserker are unchanged on both sides.

`tools/animation-round/capture-review.mjs` provides native PNG pose sheets and
timed full-game captures. Set `REVIEW_OUT` to a fresh output folder and
`CANVAS_MODULE` to an installed `@napi-rs/canvas` module when needed. Run it
with `final archer berserker eanasir` to verify complete movement loops and
combat. Captures are disposable; neither preview reads or writes saved games.

`node tools/style-match-review/selection-capture.mjs` captures the production
HeroScreen for all three heroes at 480×270 and 640×420. It accepts the same
`CANVAS_MODULE` and `REVIEW_OUT` environment variables.

The Ranger and Berserker builders preserve their retained source model, whole
gait and original attack geometry, then apply a native material palette and
registered face/equipment details. Rebuild them with
`node tools/animation-round/build.mjs`. Ea-Nasir's shared hero/boss model is
authored directly in `tools/eanasir-source/native-model.mjs`; rebuild it with
`node tools/eanasir-source/build.mjs`.

To package the reviewed real-Game takes into one compact evidence image, run
`node tools/style-match-review/package.mjs <ranger-take> <berserker-take> <merchant-take>`.
This crops captured scenes at their recorded sprite bounds and enlarges with
nearest-neighbour sampling. It does not substitute a new renderer.
