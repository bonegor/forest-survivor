import test from 'node:test';
import assert from 'node:assert/strict';
import approved from '../public/assets/heroes-approved/index.js';
import archer from '../tools/hero-polish-review/before/archer.js';
import rogue from '../tools/hero-polish-review/before/rogue.js';
import berserker from '../tools/hero-polish-review/before/berserker.js';
import paladin from '../tools/hero-polish-review/before/paladin.js';
import { unpack } from '../tools/animation-round/build.mjs';
import { packedPalette } from '../public/js/art/palette.js';
const master = new Set([0, ...Object.values(packedPalette())]);

for (const [id, original] of Object.entries({ archer, rogue, berserker, paladin })) {
  test(`${id}: requested art and cadence preserve complete gait, strike timing and equipment mapping`, () => {
    const current = approved[id];
    const density = current.hires || 1, originalDensity = original.hires || 1;
    for (const key of ['w', 'h', 'anchorY'])
      assert.equal(current[key] / density, original[key] / originalDensity, `${id} retains logical ${key}`);
    for (const key of ['idle', 'walk', 'attack', 'attackWalk', 'attackRelease', 'manualDelay'])
      assert.deepEqual(current[key], original[key], `${id} retains ${key}`);
    for (const key of ['walkFps', 'idleFps', 'attackFps'])
      assert.equal(current[key], original[key] * (id === 'rogue' ? 2 : 1), `${id}: ${key}`);
    assert.equal(current.frames.length, original.frames.length);
    for (let i = 0; i < current.frames.length; i++) {
      const after = unpack(current, current.frames[i]), before = unpack(original, original.frames[i]);
      assert.deepEqual([after.w / density, after.h / density], [before.w / originalDensity, before.h / originalDensity]);
      // Ranger and Berserker retain the source rig but now use the roster's
      // native opaque palette. Exact gait registration is checked separately.
      if (id === 'archer' || id === 'berserker') {
        assert.equal(density, 1);
        assert.equal(current.clarityRevision, 'native-style-match-2026-11-15');
        assert.ok(current.palette.length <= 32, `${id}: restrained palette`);
        for (const color of after.d) assert.ok(master.has(color), `${id}: opaque master-palette pixel`);
        continue;
      }
      const from = id === 'rogue' ? 0 : (id === 'archer' ? 44 : 46) * after.w;
      assert.deepEqual(after.d.slice(from), before.d.slice(from), `${id}: preserved ${id === 'rogue' ? 'all pixels' : 'lower body'} in pose ${i}`);
    }
    if (id !== 'rogue') assert.notDeepEqual(current.frames, original.frames, `${id}: artwork really changed`);
  });
}
