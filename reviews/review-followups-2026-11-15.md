# Review follow-ups · 15 November 2026

## Swarm movement is intentional

The owner confirmed that swarms should keep their own crossing movement even
when fear or confusion is applied. The earlier bug classification and proposal
to prioritize those statuses over the direction lock are withdrawn. The existing
swarm spawn uses a six-second lock and multiplies the foe's configured speed by
1.2, so the requested slight speed advantage is already present. Source comments
now state the intended priority. Gameplay is unchanged.

The local, untracked October review was also corrected. Its separate question
about Frozen Heart immunity for champions and crypt lords is not a swarm issue.

## Dedicated item icons completed

Phoenix Heart and Exile each received a separate graphics worker. Both use
14×14 palette-string artwork and the production builder's 16×16 outlined result.
Phoenix Heart is a red heart carried by rising fire-feathers; Exile is a cancelled
parchment sinking into a dark violet rift. They are distinct from Revival and
Insight and retain the game's existing hard pixels and palette.

Phoenix Heart is wired through the relic definition and Armory mapping; Exile
is wired through the Armory mapping. Native/enlarged comparisons and the actual
Armory at 640×420 and 480×270, plus the Phoenix relic in the Codex, were inspected.
Captures use disposable in-memory profiles and can be regenerated with
`tools/icon-refresh-review.mjs`. The old art handoff now records completion.
All 23 focused menu, relic and gear checks pass on a clean shipping snapshot;
the release build contains 303 files with 206 module imports checked.

## Boss memory risk remains open

The empty-rim optimization below is now implemented. Lazy allocation and frame
deduplication remain investigated candidates; the startup/mobile risk stays open.
The six detailed bosses have 532 frames at 224×192. Their RGBA buffers require
87.28 MiB, and eager normal/mirrored canvases add 174.56 MiB: **261.84 MiB minimum**
before variants, asset strings, temporary allocations and browser/GPU overhead.
This number describes the six bosses, not total application memory.

Promising changes preserve source pixels, frame order, timing and geometry:

| Candidate | Evidence | Benefit and limitation |
| --- | --- | --- |
| **Implemented:** cache absence of an outline and skip an empty rim | All 532 boss frames lack the ink colour used by `rimBuf`, so their rim variants are transparent. | Avoids 0.328 MiB of transparent normal/mirrored canvases per visited frame per rim colour. This saves later variants, not initial allocation. |
| Lazy normal/mirrored canvas getters; create each variant facing separately | All 5,320 native Canvas comparisons matched, plus six synthetic alpha/emissive checks. | Defers boss startup backing from 261.84 to 87.28 MiB before first use. Prewarm upcoming poses in bounded work; caches can still grow as more poses are visited. |
| Deduplicate exactly equal frames | Exact pixel comparison confirmed 37 duplicates, leaving 495 unique frames. | Saves 18.21 MiB when both decoder buffers and rendered frames share storage. Keep every animation index and relevant metadata. |

Next candidates: lazy canvas allocation with measured prewarming and cache
lifetime, then exact deduplication. These changes need no
resolution reduction, palette reduction or removed animation frames.

### Empty-rim fix verification

`Frame.hasInk` caches exact presence of the frame's ink colour; `Enemy.drawRim`
skips canvas creation and drawing only when that colour is absent. Existing
outlined art, custom ink and the context's alpha-reset contract are preserved.
The source pixels, pose indices, geometry and eager startup canvases are untouched.

Two allocation/draw regressions failed before the fix, while the outlined
control passed. All 25 focused rim, night-layer, boss-animation and render checks
pass after it. Independent native-Canvas comparison covered all 532 detailed
boss frames in both facings plus 118 outlined/custom-ink control cases: every
image matched the old renderer. The new path allocated zero boss rim canvases;
the old path allocated 2,128 across the two tested colours. Repeated queries used
cached presence for all 591 tested frames without rescanning pixels.

Local evidence: `output/empty-rim-fix/before-tests.log`, `focused-tests.log`,
`native-result.json` and the independent `check-native.mjs` reproduction.

### Remaining investigation

Transparent trimming is not ready: cropped buffers reconstruct the source
exactly, but a naive cropped draw changed 1,063 of 1,596 scaled-image comparisons
because of fractional sampling/offsets. That shortcut fails the no-quality-loss
requirement. Indexed decoding or trimmed atlases require broader renderer work.

One-shot desktop native-Canvas construction was approximately 706 ms eager and
116 ms lazy; sampled lazy first use was 0.9–2.3 ms. These are local observations,
not a browser/mobile benchmark. Real-device memory, GPU allocation, worst-frame
timings, first-attack stutter and long-session cache growth remain unmeasured.

Local evidence is retained under `output/sprite-memory-options/`: `options.json`,
`inventory.json`, `baseline.json`, `lazy.json`, `verification.json`,
`synthetic.json`, `lazy-frame-prototype.mjs` and `measure.mjs`. The prototype
remains outside production. Run each `measure.mjs` mode separately with
`node --expose-gc` and an optional `CANVAS_MODULE` path.
