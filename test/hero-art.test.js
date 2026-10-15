import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { buildSprites, SPR } from '../public/js/engine/sprites.js';
import { HEROES } from '../public/js/data/heroes.js';

const opaque = (f) => f.buf.d.some((c) => c >>> 24);

test('every hero is drawn: frames of one size, animations that list them, feet in the frame, a menu pose', () => {
  buildSprites();
  for (const h of Object.values(HEROES)) {
    const s = SPR[h.sprite];
    assert.ok(s && s.frames.length, `${h.id} has a sprite`);
    assert.ok(s.frames.every((f) => f.w === s.w && f.h === s.h), `${h.id}: every frame ${s.w}x${s.h}`);
    for (const k of ['idle', 'walk', 'attack']) {
      for (const i of s[k] || []) assert.ok(Number.isInteger(i) && i >= 0 && i < s.frames.length && opaque(s.frames[i]), `${h.id}: ${k} frame ${i} is drawn`);
    }
    assert.ok(s.anchorY > 0 && s.anchorY < s.h, `${h.id}: feet inside the frame`);
    const pose = SPR[h.pose];
    assert.ok(pose && pose.frames.length && pose.frames.every(opaque), `${h.id}: a menu pose`);
  }
});

test('the heroes picked in the Sprite Lab play as the lab plays them, and their glow lights up', () => {
  buildSprites();
  for (const id of ['mage', 'necromancer']) {
    const s = SPR[id];
    assert.equal(s.w, 48);
    assert.equal(s.frames.length, 22);
    assert.deepEqual([s.idle.length, s.walk.length, s.attack.length], [8, 8, 6]);
    assert.ok(s.frames.some((f) => f.em), `${id}: what burns on him glows in the dark`);
  }
  const rogue = SPR.rogue;
  assert.deepEqual([rogue.w, rogue.h, rogue.frames.length], [40, 40, 9]);
  assert.deepEqual(rogue.idle, rogue.walk, 'the wraith floats: it idles and walks through the same frames');
});
