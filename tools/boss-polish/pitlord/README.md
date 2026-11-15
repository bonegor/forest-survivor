# Pit Lord surface painting

Azrak uses broad crimson muscle planes, blackened steel plates, segmented warm
horns, torn darker cloth, a stern furnace-eyed profile and one connected molten
fissure inside his greatsword. The restricted 41 opaque colours make the armour,
living anatomy and equipment readable at the existing game scale. The orange
accents belong to the eyes and blade; this pass adds no effects or halo.

`source.mjs` exports synchronous `polishSource(source)`. It returns copied pixels
on the same 128 × 128 canvas and preserves every source alpha value and box.
The shared source extraction and articulated builder own geometry and motion.

Rebuild this boss only:

```powershell
$env:BOSS_ART_REVIEW_OUT='output/boss-polish/pitlord/artist/poses'
node tools/boss-art/build.mjs pitlord
```

Artist evidence is under `output/boss-polish/pitlord/artist/`: native/enlarged
source comparison, every before/after pose grouped by action, all 94 poses,
full-game comparison, continuous 30-second recording and both-facing action
timelines. The focused nova timeline includes release and recovery frames.
`audit.mjs` independently decodes the frozen baseline and candidate, checking
all frame alpha masks, metadata, dimensions and allocations. `invariants.json`
records the inspected production SHA-256. The targeted boss contract test also
passes. The existing rig, attack cadence and effects remain unchanged.
