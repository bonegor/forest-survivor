# Boss material and identity pass

This pass gives each of the eight main bosses a dedicated artist and independent
reviewer. Ea-nāṣir and the crypt lords are outside this pass. Stronger material separation,
recognizable faces and controlled focal details retain the game's medieval pixel
style. The art does not change combat, progression, rewards or encounter odds.

The six detailed models use `source.mjs` hooks before the existing articulated
rig in `tools/boss-art/build.mjs`. Every hook is checked against the original
source alpha. Rebuild a single candidate with `node tools/boss-art/build.mjs ID`.
Set `BOSS_ART_REVIEW_OUT` to isolate source pose evidence. Bone King and Demon Lord
have their own deterministic build scripts and use the original baked CC0 data
as immutable offline input. Production imports only their polished assets.

The geometry contract fixes every frame's alpha mask, canvas size, body metadata,
anchors, density and animation lists. It was independently checked against the
unaltered sprites built from clean Git revision `0791a0bf`.
`test/boss-polish-contract.test.js` checks
all eight bosses. These checks establish invariants, not art quality.

## Real-game review

Run `node tools/boss-polish/serve.mjs` and open `http://127.0.0.1:3022` for a
playable side-by-side comparison. The baseline is read from commit `0791a0bf`;
`BOSS_BASELINE_REF` can select another revision. Both sides use the same review
encounter placements and receive the same clock steps. Profiles are disposable.
Controls select the boss and action, reverse facing, pause, step and restart.
`BOSS_POLISH_PORT` changes the port.

`node tools/boss-art/capture.mjs ID` records the actual Game, Enemy and attack AI.
Set `CANVAS_MODULE` to a native `@napi-rs/canvas` installation and
`BOSS_REVIEW_OUT` to an evidence folder. `BOSS_REVIEW_MAP` selects a map. Tours
visit rest, travel, attack/recovery and relevant enraged attacks in both facings.
For teleports outside the normal player viewport, `BOSS_REVIEW_FOLLOW=1` records
a supplementary view centered on the boss. This camera is restored before the
next simulation update; recordings explicitly label the follow view.
Frame records accompany the continuous 15 fps GIF; poseboards cover frames that
fall between video samples. Every pose is tracked at the 60 Hz simulation rate.

`node tools/boss-polish/gallery.mjs` makes the eight-boss overview from actual
Game draws. It uses the same `CANVAS_MODULE`; `BOSS_GALLERY_OUT` selects its output
folder and `BOSS_GALLERY_LABEL` identifies an original or updated snapshot.

Artist evidence and separate reviewer verdicts live under
`output/boss-polish/ID/{artist,review}`. The release review records final candidate
identities and known inherited limitations. The larger sprite canvas memory
optimization remains separate: this art pass keeps frame allocations fixed.
