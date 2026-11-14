# Ranger and Berserker source-detail review

The rejected face/torso patches are removed. Ranger and Berserker now use their original full character artwork at two source pixels per logical world pixel. This preserves their proportions and appearance while retaining the detail that was lost when the source was reduced to approximately 30 pixels high.

## Visual decisions

- Ranger: restored the original three-quarter face, visible jaw/chin, eyebrow/eye, pointed ear, swept auburn hair, green cloak, leather armor and bow. No enlarged replacement head. The original low-density version, rejected retouch and final export are shown at the same logical size in `output/hero-round2-2026-11-14/hero-art/archer-threeway.png`.
- Berserker: restored the source's broad short-bearded jaw, scowl, thick neck, natural pectorals, diagonal leather harness, metal/fur shoulder weight and two axes. Removed the pointed pasted beard/head and triangular chest that the user rejected. Comparison: `output/hero-round2-2026-11-14/hero-art/berserker-threeway.png`.
- The existing 16-phase connected gait is retained in logical coordinates. Its legs sample their original source textures at the new density; upper body, face and equipment move coherently. Original source attack atlases supply every attack frame; moving attacks retain the complete connected lower gait.
- Paladin's accepted face treatment is unchanged. The native density remains the default for every other grounded model.

The original Ranger/Berserker source references were inspected alongside the archived Heroes III Grand Elf contact sheet and Heroes II Archer frames. The chosen direction restores the original source silhouette, proportion and material separation rather than introducing unrelated facial pixel patches. Root reviewed the initial three-way comparison before production integration and approved this direction.

## Reproduction and integration

- `tools/animation-round/source-detail.mjs` deterministically reduces the retained original source PNGs and authored attack atlases with area filtering, then builds full idle/walk/attack/moving-attack clips.
- `tools/animation-round/grounded-walk.mjs` accepts an optional render density. All joints, timing, support paths and motion metadata stay in logical coordinates; default density 1 is preserved.
- `build.mjs` integrates the source-detail export only for Ranger/Berserker V1. The immutable V1/V2 comparison snapshots are unchanged.
- Packed assets are 160×128 with anchor 112 and `hires: 2`; their logical footprint remains 80×64 with anchor 56. The approved loader carries density into both world and selection sprites. Root updated runtime consumers to preserve world size.
- The obsolete `ranger-clarity.mjs` stamp is deleted. `heavy-hero-clarity.mjs` retains only the accepted Paladin treatment.

Rebuild only these heroes:

```powershell
node --input-type=module -e "import {rebuild} from './tools/animation-round/build.mjs';rebuild({ids:['archer','berserker']});"
```

## Evidence

All paths below are beneath `output/hero-round2-2026-11-14/hero-art/`:

- `archer-threeway.png`, `berserker-threeway.png`: original native, rejected pass and final source detail at matching size, including S1/S2.
- `archer-all-states.png`, `berserker-all-states.png`: enlarged source/detail anatomy and action comparisons.
- `game-s1/` and `game-s2.4/`: production Game/Player/Camera/lighting/HUD captures. Each hero has 344 chronological frames per scale, with coverage metadata and complete chronological pose and moving-attack boards.
- `archer-game-motion.gif`, `berserker-game-motion.gif`: 20 fps crops of the complete 17.2-second real-game sequence at desktop S2.4, including idle, right/left/diagonal walking, field combat, crypt idle and stationary/moving manual attacks.
- Root's additional browser evidence is in `../preview/`, with matching previous/final art and selection showcases at S1, S2.4 and S3.2.

Native S1 is necessarily a small face; it was reviewed as a silhouette/material/face-readability check rather than as an enlarged head substitute. At desktop S2.4 the source brow/jaw, hair, harness and shoulder materials remain distinct. No fallback was needed.

## Validation and limits

- Both scales captured every idle and walk phase, both facings and diagonal travel; 0 clipped world frames for either hero. Manual stationary and moving attacks appeared in the actual Game selector. In-memory test profiles remained unchanged.
- Hero art connectivity and animation tests passed (82 tests on the initial run). Two stale density assumptions were corrected: the gait identity test now verifies the literal original model at density 2, and the adversarial draw test expects logical dimensions. The subsequent 9 relevant source/gait/variant/adversarial tests passed.
- Source SHA256, proportional standing image, all 16 packed gait frames, whole upper-body identity, registered feet, finite joints, support timing and unchanged attack indices/release delays are checked. These tests establish integration and reproducibility; they do not substitute for the visual review.
- Root independently verified all 22 heroes at S1/S2.4/S3.2, eight scenes per changed hero, keyboard movement and manual strikes, with no browser errors. Root visually approved the improved Ranger and Berserker direction. Final independent graphics/playthrough review remains the overall task's next gate.

No saved profile or progression was modified.
