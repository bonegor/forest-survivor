// The Bloomvale's new sprites of 29 October 2026 (art/flora-meadow.js): the moonblooms as props round
// the start's sown disc, the hay fields' two bales and the scarecrow. Each builds clean (no unknown
// palette key, the size drawn); the moonblooms are fae_bloom1/2's bright frame and glow; the bales are
// the hay field's own sage-gold and never burst; what stops the hero is drawn. Pure data: no canvas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ART, DRAWN } from '../public/js/art/defs.js';
import { LANDMARK_SOLIDS } from '../public/js/art/landmarks.js';
import { spriteBuffers } from '../public/js/engine/sprites.js';
import { pack, hexPack, keepColors } from '../public/js/engine/pixels.js';

const MAGENTA = pack(255, 0, 255); // what a palette key the palette doesn't know is drawn in
// [name, width, height] as drawn (the build's ink outline adds a pixel a side)
const SIZES = [['moonbloom1', 9, 12], ['moonbloom2', 11, 10], ['bloom_hay1', 16, 12], ['bloom_hay2', 18, 13], ['bloom_scarecrow', 14, 26]];

test('the new meadow sprites build: known keys only, one frame each, the size drawn', () => {
  for (const [n, w, h] of SIZES) {
    assert.ok(DRAWN[n], `${n} is drawn`);
    const { frames } = spriteBuffers(ART[n]);
    assert.equal(frames.length, 1, `${n}: one frame`);
    assert.deepEqual([frames[0].w, frames[0].h], [w + 2, h + 2], `${n}: ${w} x ${h}, outlined`);
    assert.equal(frames[0].d.filter((c) => c === MAGENTA).length, 0, `${n}: no unknown palette key`);
  }
});

test("the moonbloom props are the sowing's moonblooms at their brightest, and glow", () => {
  for (const [prop, bloom] of [['moonbloom1', 'fae_bloom1'], ['moonbloom2', 'fae_bloom2']]) {
    const one = spriteBuffers(ART[prop]), four = spriteBuffers(ART[bloom]);
    assert.deepEqual([...one.frames[0].d], [...four.frames[2].d], `${prop}: ${bloom}'s bright frame`);
    assert.ok(keepColors(one.frames[0], one.emissive), `${prop}: glows`);
  }
});

test("the bales are drawn in the hay field's colours and keep them off the particle list", () => {
  for (const n of ['bloom_hay1', 'bloom_hay2']) {
    assert.equal(ART[n].burst, false, `${n}: burst false`);
    const colours = new Set(spriteBuffers(ART[n]).frames[0].d);
    for (const hex of ['#b2b474', '#8e945a']) assert.ok(colours.has(hexPack(hex)), `${n}: has ${hex}`);
    assert.ok(colours.has(hexPack('#733e39')), `${n}: its twine`);
  }
});

test('the bales and the scarecrow stop the hero, and what is solid is drawn', () => {
  assert.deepEqual(LANDMARK_SOLIDS.bloom_hay1, [[0, 0, 6]]);
  assert.deepEqual(LANDMARK_SOLIDS.bloom_hay2, [[0, 0, 7]]);
  assert.deepEqual(LANDMARK_SOLIDS.bloom_scarecrow, [[0, 0, 2]]);
  for (const n of Object.keys(LANDMARK_SOLIDS)) assert.ok(ART[n], `${n}: solid and drawn`);
});
