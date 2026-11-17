import { deepStrictEqual } from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sources } from '../boss-art/extract.mjs';
import { packRig, rigFrames } from '../boss-art/build.mjs';
import { bakedBuffers } from '../../public/js/art/baked.js';
import { OUTLINE } from '../../public/js/art/palette.js';
import { padding } from './boneking-shield.mjs';
import { paintWorldGrid } from './world-grid.mjs';

const legged = 'boneking_legs';
const floating = 'boneking_floating';
const baked = ['boneking', 'demonlord', legged, floating];
const rigged = ['butcher', 'lich', 'pharaoh', 'frostgiant', 'thornqueen', 'pitlord'];
const all = [...baked, ...rigged];
const args = process.argv.slice(2);
const selected = args.filter(id => id !== '--apply');
const ids = selected.length ? [...new Set(selected.flatMap(id => id === 'boneking' ? [id, floating] : [id]))] : all;
if (ids.some(id => !all.includes(id))) throw Error(`Choose a boss from ${all.join(', ')}`);

const apply = args.includes('--apply');
const reviewDir = process.env.BOSS_CHUNKY_OUT || 'output/boss-chunky/candidates';
const original = ids.some(id => rigged.includes(id)) ? sources({ original: true }) : {};

function opaqueBounds({ w, h, d }) {
  let left = w, top = h, right = -1, bottom = -1;
  for (let i = 0; i < d.length; i++) {
    if (!(d[i] >>> 24)) continue;
    const x = i % w, y = Math.floor(i / w);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  return [left, top, right, bottom];
}

const bakedMetadata = ({ palette, frames, glow, ...metadata }) => metadata;

async function buildBaked(id) {
  const ground = id === legged;
  const shield = id === floating;
  const name = ground || shield ? 'boneking' : id;
  const { default: paint } = await import(`./${name}.mjs`);
  const { default: source } = await import(`./base/${name}.mjs`);
  const edged = paint(source);
  const before = ground || shield ? edged : source;
  let after = edged;
  if (ground) after = (await import('./boneking-legs.mjs')).default(edged);
  if (shield) after = (await import('./boneking-shield.mjs')).default(edged);
  const expected = bakedMetadata(before);
  if (ground || shield) {
    // Center the wider art on the same pivot and keep its feet at the old Y.
    expected.w += 2 * padding;
    expected.h += 2 * padding;
    expected.below += padding;
  }
  deepStrictEqual(bakedMetadata(after), expected, `${id}: changed baked timing or dimensions`);
  if (ground || shield) deepStrictEqual(after.glow, before.glow, `${id}: changed crown glow`);
  if (after.palette.includes(OUTLINE)) throw Error(`${id}: painted interior would glow as engine outline`);
  const beforeFrames = bakedBuffers(before);
  const afterFrames = bakedBuffers(after);
  if (afterFrames.length !== beforeFrames.length) throw Error(`${id}: changed frame count`);

  for (const [i, frame] of afterFrames.entries()) {
    const previous = beforeFrames[i];
    if (ground || shield) {
      const [left, top, right, bottom] = opaqueBounds(frame);
      if (left > right || top > bottom || left < 1 || top < 1 || right >= frame.w - 1 || bottom >= frame.h - 1) {
        throw Error(`${id}: frame ${i} has cropped artwork or no artwork`);
      }
      if (ground && i !== 20 && i !== 21) {
        const [oldLeft, oldTop, oldRight, oldBottom] = opaqueBounds(previous);
        if (left < oldLeft + padding || top < oldTop + padding ||
            right > oldRight + padding || bottom > oldBottom + padding) {
          throw Error(`${id}: frame ${i} exceeds the original boss hit bounds`);
        }
      }
    } else if (frame.d.some((v, p) => (v >>> 24) !== (previous.d[p] >>> 24))) {
      throw Error(`${id}: paint changed frame ${i} alpha`);
    }
  }
  return { id, data: after, directory: 'bosses-polished' };
}

const assets = await Promise.all(ids.map(async id => {
  if (baked.includes(id)) return buildBaked(id);
  const { default: paint } = await import(`./${id}.mjs`);
  const base = original[id];
  const texture = paint({ ...base, box: [...base.box], d: base.d.slice() });
  if (!(texture instanceof Uint32Array) || texture.length !== base.d.length ||
      texture.some((v, i) => (v >>> 24) !== (base.d[i] >>> 24))) {
    throw Error(`${id}: paint changed canonical source alpha or dimensions`);
  }
  const { frames, meta } = rigFrames(id, { ...base, d: texture });
  return { id, data: packRig(frames.map(paintWorldGrid), meta), directory: 'bosses-reforged' };
}));

for (const { id, data, directory } of assets) {
  const out = apply ? join('public/assets/art', directory) : reviewDir;
  mkdirSync(out, { recursive: true });
  const target = join(out, `${id}.js`);
  writeFileSync(target, `// Boss field art. Rebuild: node tools/boss-chunky/build.mjs --apply ${id}\nexport default ${JSON.stringify(data)};\n`);
  console.log(`${target}: ${data.frames.length} poses, ${data.palette.length - 1} paint colors`);
}
