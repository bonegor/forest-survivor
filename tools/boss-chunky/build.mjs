import { deepStrictEqual } from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bakedBuffers } from '../../public/js/art/baked.js';
import { OUTLINE } from '../../public/js/art/palette.js';
import base from './base/boneking.mjs';
import paintBoneKing from './boneking.mjs';
import paintLegged from './boneking-legs.mjs';
import paintFloating, { padding } from './boneking-shield.mjs';

const encounter = 'boneking';
const legged = 'boneking_legs';
const floating = 'boneking_floating';
const outputs = [encounter, legged, floating];
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const selected = args.filter(id => id !== '--apply');
if (selected.some(id => !outputs.includes(id))) {
  throw Error(`Choose a Bone King asset from ${outputs.join(', ')}`);
}

// The default build and --apply boneking both include the active floating art.
const ids = selected.length
  ? [...new Set(selected.flatMap(id => id === encounter ? [id, floating] : [id]))]
  : outputs;
const out = apply ? 'public/assets/art/bosses-polished'
  : process.env.BOSS_CHUNKY_OUT || 'output/boss-chunky/candidates';

function opaqueBounds({ w, h, d }) {
  let left = w, top = h, right = -1, bottom = -1;
  for (let i = 0; i < d.length; i++) {
    if (!(d[i] >>> 24)) continue;
    const x = i % w, y = Math.floor(i / w);
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  return [left, top, right, bottom];
}

const metadata = ({ palette, frames, glow, ...rest }) => rest;

function checkAsset(id, before, after) {
  const expected = metadata(before);
  if (id !== encounter) {
    // The art centers on the same pivot, with the hem at the old world Y.
    expected.w += 2 * padding;
    expected.h += 2 * padding;
    expected.below += padding;
  }
  deepStrictEqual(metadata(after), expected, `${id}: changed baked timing or dimensions`);
  if (id !== encounter) deepStrictEqual(after.glow, before.glow, `${id}: changed crown glow`);
  if (after.palette.includes(OUTLINE)) throw Error(`${id}: painted interior would glow as engine outline`);
  const beforeFrames = bakedBuffers(before);
  const afterFrames = bakedBuffers(after);
  if (afterFrames.length !== beforeFrames.length) throw Error(`${id}: changed frame count`);

  for (const [i, frame] of afterFrames.entries()) {
    const previous = beforeFrames[i];
    if (id !== encounter) {
      const [left, top, right, bottom] = opaqueBounds(frame);
      if (left > right || top > bottom || left < 1 || top < 1 || right >= frame.w - 1 || bottom >= frame.h - 1) {
        throw Error(`${id}: frame ${i} has cropped artwork or no artwork`);
      }
      if (id === legged && i !== 20 && i !== 21) {
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
}

const edged = paintBoneKing(base);
const assets = ids.map(id => {
  const after = id === legged ? paintLegged(edged) : id === floating ? paintFloating(edged) : edged;
  checkAsset(id, id === encounter ? base : edged, after);
  return { id, data: after };
});

mkdirSync(out, { recursive: true });
for (const { id, data } of assets) {
  const target = join(out, `${id}.js`);
  writeFileSync(target, `// Boss field art. Rebuild: node tools/boss-chunky/build.mjs --apply ${id}\nexport default ${JSON.stringify(data)};\n`);
  console.log(`${target}: ${data.frames.length} poses, ${data.palette.length - 1} paint colors`);
}
