// Colour tunes from the sprite tuner, written by tools/bake-tune.mjs: don't edit by hand, bake.
// Per sprite: `palette`, the colours it is drawn in instead (keyed by palette key as in
// palette.js, or for the heroes' sheets by their own '#rrggbb' colours); `rim`, a 1px ring outside
// its outline; `codes`, the tuner codes baked into it, oldest first. defs.js lays these over the
// art (withTunes) and engine/sprites.js draws them (spriteBuffers). Delete an entry to undo it.
export const TUNED = {};
