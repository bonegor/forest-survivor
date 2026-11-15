# Ossarian native-pixel polish

Run `node tools/boss-polish/boneking/build.mjs` from the repository root. The deterministic builder reads the immutable `BAKED.boneking` in `public/assets/art/bosses.js`, never its own output, and emits `public/assets/art/bosses-polished/boneking.js` plus comparison/evidence PNGs under `output/boss-polish/boneking/artist/`.

The underlying Ancient Skeleton is by Foozle / Baldur, CC0, as documented in `tools/art/bosses.mjs`. This pass authors native pixel clusters directly; it uses no generated or independently resampled animation frames.

## Model

- Connected antique-gold crown band and dark central jewel inside the original horn/head footprint.
- One consistent ivory skull with stern brow, dark eye sockets, tiny amber cores, distinct teeth and jaw.
- Cold steel pauldrons, warm bone arms, restrained gold gorget and royal shield. The shield bears a crowned blade emblem.
- Connected charcoal hem folds retain the spectral taper and the source partial alpha.
- Charge orb has stepped gold planes and a hot ivory core. The sword sweep has a narrow bright leading edge and steel trailing planes. The 50 ms nova impact retains the original release frame while briefly showing gold crown/shield shapes and dark face details.

The model transfer checks original pixel ownership. Any sword, moving hand, raised arm or effect that occludes the base model stays in front, including the crossing-guard frames 16, 27 and 28. Frame 28 retains its source seven-pixel translation.

## Fixed constraints

29 frames at 80×80, one-byte indices, exactly 23 palette entries, 185,600 index bytes, 742,400 decoded RGBA bytes. All source alpha bytes are identical, including partial-alpha hem pixels and attack effects. Consequently the sprite outline, body bounds and all mirrored/flash frame dimensions remain unchanged. `body:[30,57]`, `below:15`, `motionRate:3`, `poseFps:20`, idle/walk arrays and every attack pose map are retained verbatim. The only metadata change is the matching amber glow palette.

No combat, AI, collision, release clock, pose count, frame duration, world scale or renderer edits are part of this asset. The original baked source is unchanged.

## Evidence and known limitations

`all-29-before-after-{1,3}x-{left,right}.png` presents every native pose at native and enlarged scales in both facings. `allocation-check.json` records the alpha/size audit, per-frame bounds and model offsets. `before-after-0-6x.png` and `polished-keyposes-5x.png` show the authored material and face changes.

The final production Game tour is `output/boss-polish/boneking/artist/game-final/boneking-game.gif`; its adjacent JSON records real Enemy clocks and all observed source frames. Capture uses `tools/boss-art/capture.mjs boneking` with the installed `@napi-rs/canvas` module and `BOSS_REVIEW_OUT` set to that directory. It runs the real Game, Enemy AI, sprite builder, camera, world and lighting, with disposable encounter setup and in-memory profile. It does not modify saved progress. Both facings traverse idle, travel, nova, summon, volley and recoveries. The final capture must be reviewed independently before visual acceptance.

Pre-existing constraints remain visible: travel frames 8–10 and 12–14 clip at the right source edge; volley frames 20–21 clip at the source top/bottom; travel 14→7 has a large sword-angle change. Correcting these would require changed alpha geometry or animation allocation/ownership beyond this safe material pass. They were explicitly left for root review, not hidden by changing timing or damage. The existing summon animation also raises an empty-looking hand as its sword leaves the source canvas; no invented second weapon was added.
