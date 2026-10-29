# Selected hero roster

Only one sprite per hero ships in public/assets/heroes: Moonsteel Huntress, Ember Sage, Nightveil, Bone Regent, Iron Vow, Oakwarden, Red Fang and the original Witch Hunter. The Plumed Knight remains in assets/knight-plumed/recoloured.js. Menu poses and in-game animation use the same approved models.

The LOOK selector is removed. heroLook ignores all legacy appearance settings, so an old original, V3 or alternative choice cannot override the selected roster. /skins/ is a gallery of the nine selected heroes, with no alternative choices. The old public comparison URL redirects there.

Historical originals, V3s, proposals and the old review are under archive/, outside the published public/ tree. They are source material only. Automated checks compare every canonical pixel against the precise approved archive and reject discarded files in the game or release.

Rebuild selected native art with node tools/art-v4/bake.mjs. It reads original timing metadata from archive/, writes rebuilt snapshots there, and promotes only the selected versions into public/assets/heroes. Historical bake tools also write to archive/ and cannot replace the production roster.

For motion verification, set CANVAS_MODULE to an installed @napi-rs/canvas package and run node tools/art-v4/field-capture.mjs. It captures the real Game, world, lighting, HUD, movement and combat without changing saved progress. Outputs remain under output/hero-v4/.
