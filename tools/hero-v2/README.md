# Hero V2 proposals

Seven staged sprite alternatives: Ranger, Sorcerer, Shadow, Necromancer, Paladin, Druid and Berserker. Knight and Witch Hunter are excluded. This tool does not write production assets or saved progression.

## Preview

From the repository root:

```powershell
node tools/hero-v2/build.mjs
node tools/hero-v2/serve.mjs
```

Open http://127.0.0.1:3012/. Current artwork is on the left and the proposal on the right. Both use the real Game, Player, sprite builder, lighting, HUD and HeroShowcase. Use the movement, attack and environment controls to compare. The review uses an in-memory profile.

## Record

Use **Capture all seven**. Controls are disabled during capture to keep each recording tied to one hero and environment. Captures cover a 10.4-second sequence at 30 FPS in daylight and crypts, with full-resolution world and selection PNGs. Output is under `tools/out/hero-v2/captures/<take>/`. A repair action recaptures interrupted sequences in the latest take.

Run `python tools/hero-v2/package.py` with Pillow installed to create the recorded gallery at `/out/review.html`. It uses the Forest Survivor art skill's GIF helper, samples to 10 FPS without changing duration, and produces chronological pose contact sheets. The last-to-first GIF jump resets the whole demonstration, rather than representing a walking animation seam.

## Artwork

The five `.px.js` sources reuse the game's native art system. Druid and Berserker are new integer-pixel models in `src/guardians.mjs`, with connected hip/knee/ankle motion and separate equipment layers. Outputs retain the production sheet format and attack metadata. Shadow keeps its floating animation. Choosing a proposal for production is a separate integration step.
