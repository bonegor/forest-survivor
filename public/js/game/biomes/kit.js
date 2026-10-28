// What the looks of the Survival maps (game/biomes.js and the four maps' files beside this one) are
// written with: the particles' palette colours and flags, and packed ground colours. Worked out
// from the palette itself (art/palette.js), so the looks stay data that a Node tool can import
// (tools/mapgen/endless.mjs draws them): no canvas, no sprites.

import { PAL } from '../../art/palette.js';
import { hexPack } from '../../engine/pixels.js';

// A palette key's particle colour: its place in the palette, as particles.js PC has it (the same
// list, Object.keys(PAL); test/biomes.test.js holds the two to each other).
export const PC = Object.fromEntries(Object.keys(PAL).map((k, i) => [k, i]));
// The particles' flags (particles.js P).
export const P = { GLOW: 1, FADE: 2, SHRINK: 4, GROUND: 8, SOFT: 16, RISE: 32, STAR: 64 };
// Ground colours, packed as paintChunk lays them.
export const tones = (hexes) => hexes.map((h) => hexPack(h));
export const H = (hex) => hexPack(hex);
