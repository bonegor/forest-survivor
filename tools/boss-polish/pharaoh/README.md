# Pharaoh surface pass

`source.mjs` paints the original 128×128 Pharaoh texture in native coordinates.
It gives the gold mask a stern brow and angular jaw, simplifies the nemes into
legible lapis/gold bands, sets blue inlays into the broad collar, clarifies the
linen overlaps, and authors a lapis belt stone, royal kilt glyph, and crook rim.
Warm gold, cool lapis, old linen and a small garnet cuff accent have separate
material ramps; the original embroidered cape and equipment richness remain.

The source is cloned. Every alpha byte and source-box coordinate is retained.
No animation, rig, gameplay, effects, or runtime rendering code changes.

Rebuild from the repository root:

```powershell
$env:BOSS_ART_REVIEW_OUT='output/boss-polish/pharaoh/artist/poses'
node tools/boss-art/build.mjs pharaoh
```

Artist evidence is in `output/boss-polish/pharaoh/artist/`:

- `source-native-before-after.png` and `source-4x-before-after.png`
- `pose-native-before-after.png` and `pose-3x-before-after.png`
- `pose-contacts/`: each chronological pose sequence, including both winds
- `game-before-after.png` and `game-before-after.gif`: matched actual Game captures, baseline left
- `game-final/pharaoh-game.gif`: continuous 30-second Game capture with both facings,
  full equipment framing and a separate label header
- `game-combat-contact.png`: idle, travel and all three attacks in both facings
- `verification.json`: independently decoded baseline/candidate frame audit
- `runtime-verification.json`: actual Game capture coverage

Validation: all 94 frames remain 224×192; every source/frame alpha byte is
identical to the frozen baseline; all metadata and source bounds are identical.
The exact engine outline sentinel is absent. The Game capture visits all 94
source frames and both facings at unchanged scale/draw scale/hit radius.
Native before/after, all seven pose sequences and actual combat contacts were
inspected. Remaining fine highlight movement follows the unchanged texture rig.
The `game-final` capture uses the revised wider framing, keeping the crown and
crook visible throughout attack extremes. Matched before/after media use the
earlier close framing on both sides.

The production palette has 420 colors (baseline 7,617), including the deliberately
blended edge/material shades. This is a local pixel painting pass, not a new
animation or a global palette filter.
