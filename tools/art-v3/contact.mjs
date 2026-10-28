import { mkdirSync } from 'node:fs';
import { HERO_ART } from '../../public/js/art/heroes.js';
import { renderSource } from './bake.mjs';
import { makeBuf, blit, scaleN, hexPack } from '../../public/js/engine/pixels.js';
import { writePng } from '../png.mjs';
const [id, file, animation] = process.argv.slice(2);
const before = HERO_ART[id].gen(), after = renderSource(file, animation).frames;
const cols = 8, cell = 56, rows = Math.ceil(Math.max(before.length, after.length) / cols);
const sheet = makeBuf(cols * cell, rows * cell * 2);
sheet.d.fill(hexPack('#252a35'));
for (const [group, frames] of [before, after].entries()) for (let i = 0; i < frames.length; i++) {
  const f = frames[i];blit(sheet, f, (i % cols) * cell + Math.floor((cell - f.w) / 2), (Math.floor(i / cols) * 2 + group) * cell + cell - f.h);
}
mkdirSync('output/hero-v3', { recursive: true });
writePng(`output/hero-v3/${id}-contact.png`, scaleN(sheet, 3));
