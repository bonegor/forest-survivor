# Ea-nasir statue source model

The user explicitly requested the statue pictured on [Wikipedia's Ea-nāṣir page](https://en.wikipedia.org/wiki/Ea-n%C4%81%E1%B9%A3ir), adapted into this game's art style. The exact reference is the Metropolitan Museum's **Standing male worshiper, accession 40.156**, not a bald Ebih-Il figure and not a historical portrait identification of Ea-nasir.

- [Wikimedia Commons image and CC0 declaration](https://commons.wikimedia.org/wiki/File:Standing_male_worshiper_MET_DT850.jpg)
- [Met collection record](https://www.metmuseum.org/art/collection/search/323735)
- [Met original image](https://images.metmuseum.org/CRDImages/an/original/DT850.jpg)
- Local CC0 reference: `reference/standing-male-worshiper.jpg`.

`model.png` preserves the earlier generated adaptation and its prompt is retained in `prompt-final.txt`. The shipping artwork is the animated stone statue in `native-model.mjs`: the reference's scalloped hair, double-arched brow, inset eyes, long tiered beard, calm torso and deep vertical fringe are drawn directly as coarse opaque clusters. Hair, beard, body and skirt share one muted warm beige/taupe stone ramp drawn from the photo. Copper and leather are small game equipment accents.

The defining reference traits are the wavy carved hair wrapping the head, continuous arched eyebrow ridge, large bordered inset eyes with dark pupils, narrow projecting nose, wavy beard sides and five horizontal relief tiers, and a straight rounded skirt with a deep band of vertical fringe. Resting arms bend inward, with the smaller muted copper disc cradled near the chest and the whip held near the center of the torso. The release grip and all gameplay timings remain unchanged.

## Deterministic export

From the repository root:

```powershell
node tools/eanasir-source/build.mjs
```

This writes `public/assets/heroes-authored/eanasir.js`; optional diagnostics go to `output/eanasir-statue/candidate/`. `EANASIR_OUT` and `EANASIR_DIAGNOSTICS` can stage a separate take. The exporter uses only repository-local JavaScript and retains the source PNG's provenance hash. It requires neither an image generation API nor a machine-local image path.

The packed sprite has 80×64 native pixels, density 1, anchor 56, body 25×44 and below-foot padding 7. Its world geometry is unchanged. It uses 17 local statue/equipment colours including transparency; every visible pixel is opaque. The local palette preserves the photograph's stone colours while the hard clusters, native pixel density and outline thickness match the game. Broad lighting crosses the vertical fringe grooves; there is no flesh/cloth material split or diagonal fabric swish. A 16-phase walk retains the previous eight-phase cycle duration. Sixteen idle phases retain the previous breathing-cycle duration. The original five attack phases, 18 fps, release index 2 and manual delay 2/18 are preserved, with all 80 moving attack combinations.

Walking uses connected hips, knees and ankles, planted support soles and lifted returning feet under the long garment. The fringed hem follows the legs. One articulated whip arm has a release grip at logical (44,38), matching the hero lash origin and the shared merchant boss's closely aligned release. The release sprite carries only its short handle; the actual game effect supplies the lash. Copper icons and projectiles remain their existing code-authored art.

`preview.mjs` and `inspect.mjs` use `@napi-rs/canvas` for disposable comparison boards; set `CANVAS_MODULE` when that package is installed outside the local Node module path. The game and packed export do not depend on that package.
