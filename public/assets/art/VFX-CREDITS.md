# Weapon effects (vfx.js)

Weapon effects baked from Sprite Fusion's pixel-art VFX
(<https://www.spritefusion.com/pixel-art-vfx>), MIT License, Copyright (c) 2026 Hugo Duprez:
recoloured to the game's palette, retimed, resized. The effects were ported from TypeScript to
plain JavaScript (`tools/vfx/src/`, by `tools/vfx/port.mjs`, our edits marked "FS") and drawn
ahead of time into the sprite frames of `vfx.js` by `tools/vfx/bake.mjs`, from the list in
`tools/vfx/picks.mjs`.

| Effect | For |
| --- | --- |
| slash (`tools/vfx/src/slash.mjs`) | Longsword (Slash); Excalibur (Slash, holy); Whirlwind, the Knight's ultimate (Whirl); Twin Axes, Bloodstorm, Red Frenzy (Chop) |
| holy-light (`tools/vfx/src/holy-light.mjs`) | Smite, Judgement (Pillar) |
| lightning (`tools/vfx/src/lightning.mjs`) | Lightning Strike, Thunderstorm (shock); Chain Lightning, Storm Lash (hops) |
| explosion (`tools/vfx/src/explosion.mjs`) | Meteor Storm, Cataclysm (impact flash) |
| impact (`tools/vfx/src/impact.mjs`) | Purifier, Purge (silver burst); Silver Crossbow (bolt hits) |
| sparkle (`tools/vfx/src/sparkle.mjs`) | Starfall (Star landing); Comet Shower (Star landing); Starfall, Comet Shower (a falling star's head) |
| ice (`tools/vfx/src/ice.mjs`) | Frozen Heart (a frozen foe shatters) |
| energy (`tools/vfx/src/energy.mjs`) | every ultimate's start (Game.startUlt) |

## Licence

```
MIT License

Copyright (c) 2026 Hugo Duprez

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
