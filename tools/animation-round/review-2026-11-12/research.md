# Sprite workflow research · 12 November 2026

The production task keeps Forest Survivor's approved character identities and improves complete motion. External skills were inspected as references; none were installed and no external service received game art.

## Useful agent skills

- [Pixel Art Animator, willibrandon/pixel-plugin](https://github.com/willibrandon/pixel-plugin/blob/main/skills/pixel-art-animator/SKILL.md) supplies an Aseprite MCP workflow for animation tags, frame durations and linked cels. Useful authoring infrastructure, but its Aseprite MCP dependency is not available in this session.
- [Scenario Sprite Animation, scenario-labs](https://github.com/scenario-labs/skills/blob/main/skills/scenario-sprite-animation/SKILL.md) focuses on reference consistency across actions/facings, specified frame beats, repeatable sheet extraction and checking loop seams. Generation requires its own service connection. The applicable principle here is to retain one model and review a complete action, including the final-to-first transition.
- [Pixel Art Studio](https://github.com/AnastasiyaW/codex-claude-code-config/blob/main/skills/creative/pixel-art-studio/SKILL.md) provides generator/reviewer separation and pixel-hygiene checks. Its rigid FPS/frame-count rules and numerical quality thresholds should not replace judgement about a specific game's movement.

## Primary art references

- [Raymond Schlitter: Human Walk Cycle](https://www.slynyrd.com/blog/2024/5/24/pixelblog-50-human-walk-cycle). Establish body-part movement before details, using contact, compression, passing and forward swing. Maintain the full cycle's intended duration when changing pose count. Keep cloth folds tied to consistent attachment points. Applied here through continuous source-owned legs and local hem follow-through.
- [Pedro Medeiros: Pixel Art Tutorials](https://saint11.art/blog/pixel-art-tutorials/). The artist's collection includes walk, top-down walk, idle, looping, subpixel and attack studies. Useful visual references for weight transfer, restrained secondary motion and clean silhouettes.
- Aseprite's official [onion skinning](https://aseprite.org/docs/onion-skinning/), [frame duration](https://aseprite.org/docs/frame-duration/) and [animation tags](https://aseprite.org/docs/tags/) documentation describes practical tools for checking adjacent poses and keeping idle, walking and attack sequences distinct.

## Decisions for this game

The existing code-authored/source-texture pipeline is the closest fit. Independent generated stills are design references until anatomy, scale, equipment ownership and timing remain coherent across the entire cycle. A separate reviewer inspected every hero's chronological poses and loop return; actual Game captures check the full motion and runtime cadence.

The six robed walkers now sample sixteen distinct phases from retained original robe, calf/boot and equipment ownership layers. Planted-foot displacement matches the actual normal movement speed; adding frames does not slow the cycle. Spectres retain one clear travelling model with continuous hover and trailing cloth rather than walking legs. Equipment-free lower layers are composed before the moving feet so a staff-removal mask cannot cut a newly placed boot.

The correctness checks establish source integrity, timing and anatomy continuity. They do not establish aesthetic quality; chronological visual review and real-game playback remain necessary.

## Sprite Fusion investigation

The linked [Pixel Art VFX library](https://www.spritefusion.com/pixel-art-vfx) contains 25 effects such as slashes, explosions and weather. These are dependency-free TypeScript effects under MIT, and can be captured into static frames. They do not generate character locomotion.

Sprite Fusion's separate [Pixel Art Animator](https://www.spritefusion.com/pixel-art-animator) does animate an imported still sprite. It exports a PNG sprite sheet, animated WebP and JSON frame dimensions/FPS. The documented [animation API](https://www.spritefusion.com/docs/pixel-art-generator/api/generate-and-transform-images) accepts even frame counts from two through sixteen. Authentication requires an account/API key.

Its own [animation guidance](https://www.spritefusion.com/docs/pixel-art-generator/animation-tips) says to prepare an action-suitable source pose, repair outline gaps, preserve a clean pixel grid and allow sufficient canvas margins. An upright standing source is unsuitable for a reliable run loop. That supports using generated motion as a reviewable reference, followed by explicit registration and whole-cycle correction.

At the research date, [credit costs](https://www.spritefusion.com/docs/pixel-art-generator/credits-costs) were 15 for one animation and 15 for a pose edit. A single static generation through the API costs 3 credits through 80×80, or 5 above that. An edit-plus-animation attempt for all 21 heroes would therefore use at least 630 credits before retries. No purchase, account creation, generation or game-art upload was performed.

The [service terms](https://www.spritefusion.com/terms) allow personal/commercial output use. Creations made with free/promotional credits without a paid plan can be selected for its public gallery; creations under an active paid plan are private. These terms differ from the MIT license attached to the VFX source library.

For the present fix, thirteen grounded heroes instead use retained original model textures with connected hip/knee/ankle articulation, constant-speed planted soles, controlled weight transfer and equipment-preserving native upper bodies. The independent reviewer rejected initial foot fragments and isolated outline pixels; subsequent drawing revisions restored complete shins/boots, corrected alpha composition behind weapons, and checked every chronological phase and the loop return. Source drawings and metadata are retained under `baseline/grounded-models/`.
