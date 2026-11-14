import test from 'node:test';
import assert from 'node:assert/strict';
import approved from '../public/assets/heroes-approved/index.js';
import archer from '../tools/hero-polish-review/before/archer.js';
import rogue from '../tools/hero-polish-review/before/rogue.js';
import berserker from '../tools/hero-polish-review/before/berserker.js';
import paladin from '../tools/hero-polish-review/before/paladin.js';
import { unpack } from '../tools/animation-round/build.mjs';

for (const [id, original] of Object.entries({ archer, rogue, berserker, paladin })) {
  test(`${id}: requested art and cadence preserve complete gait, strike timing and equipment mapping`, () => {
    const current = approved[id];
    for (const key of ['w', 'h', 'anchorY', 'idle', 'walk', 'attack', 'attackWalk', 'attackRelease', 'manualDelay'])
      assert.deepEqual(current[key], original[key], `${id} retains ${key}`);
    for (const key of ['walkFps', 'idleFps', 'attackFps'])
      assert.equal(current[key], original[key] * (id === 'rogue' ? 2 : 1), `${id}: ${key}`);
    assert.equal(current.frames.length, original.frames.length);
    for (let i = 0; i < current.frames.length; i++) {
      const after = unpack(current, current.frames[i]), before = unpack(original, original.frames[i]);
      const from = id === 'rogue' ? 0 : (id === 'archer' ? 44 : 46) * after.w;
      assert.deepEqual(after.d.slice(from), before.d.slice(from), `${id}: preserved ${id === 'rogue' ? 'all pixels' : 'lower body'} in pose ${i}`);
    }
    if (id !== 'rogue') assert.notDeepEqual(current.frames, original.frames, `${id}: artwork really changed`);
  });
}
