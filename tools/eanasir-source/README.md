# Ea-nasir statue source model

The user explicitly requested the statue pictured on [Wikipedia's Ea-nāṣir page](https://en.wikipedia.org/wiki/Ea-n%C4%81%E1%B9%A3ir), adapted into this game's art style. The exact reference is the Metropolitan Museum's **Standing male worshiper, accession 40.156**, not a bald Ebih-Il figure and not a historical portrait identification of Ea-nasir.

- [Wikimedia Commons image and CC0 declaration](https://commons.wikimedia.org/wiki/File:Standing_male_worshiper_MET_DT850.jpg)
- [Met collection record](https://www.metmuseum.org/art/collection/search/323735)
- [Met original image](https://images.metmuseum.org/CRDImages/an/original/DT850.jpg)
- Local CC0 reference: `reference/standing-male-worshiper.jpg`.

`model.png` is the selected generated pixel-art adaptation. The built-in image generation tool was used for an initial style model and one identity correction after inspecting the exact museum photo. The final prompt is retained in `prompt-final.txt`. The rejected bald/tufted-skirt concept is retained only in disposable review output and is not a production dependency.

The defining reference traits are the wavy carved hair wrapping the head, continuous arched eyebrow ridge, large bordered white eyes with dark pupils, narrow projecting nose, wavy beard sides and horizontal ring curls, and a long wrapped skirt with a deep band of vertical fringe. Copper bracers, copper disc and leather whip are the game's existing adaptations. The source's frame and gear positions were preserved during the identity edit.

## Deterministic export

From the repository root:

```powershell
node tools/eanasir-source/build.mjs
```

This writes `public/assets/heroes-authored/eanasir.js`; optional diagnostics go to `output/hero-round2-2026-11-14/eanasir-art/candidate/`. `EANASIR_OUT` and `EANASIR_DIAGNOSTICS` can stage a separate take. The exporter uses only repository-local PNGs and JavaScript. It requires neither an image generation API nor a machine-local image path.

The packed sprite has 160×128 source pixels, density 2, anchor 112, body 50×88 and below-foot padding 14. Its logical footprint remains 80×64 with anchor 56 and body 25×44. A 16-phase walk retains the previous eight-phase cycle duration. Sixteen idle phases retain the previous breathing-cycle duration. The original five attack phases, 18 fps, release index 2 and manual delay 2/18 are preserved, with all 80 moving attack combinations.

Walking uses the original source textures with connected joints and fixed support soles under the long garment. The cloth has a small delayed sway. The whip arm is a single source-textured two-bone rig; its release grip is logical (44,38), matching the hero lash origin and the shared merchant boss's closely aligned release. The old arm and coil are removed before the new arm/lash are composited, so the active weapon has one owner. Copper icons and discs remain their existing code-authored art.

`preview.mjs` and `inspect.mjs` use `@napi-rs/canvas` for disposable comparison boards; set `CANVAS_MODULE` when that package is installed outside the local Node module path. The game and packed export do not depend on that package.
