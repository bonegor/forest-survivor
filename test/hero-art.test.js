import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { buildSprites, SPR } from '../public/js/engine/sprites.js';
import { HEROES } from '../public/js/data/heroes.js';
import approved from '../public/assets/heroes-approved/index.js';

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

test('the approved sheets carry all indexed clips, exact dimensions and release timing', () => {
  buildSprites();
  for (const [id, data] of Object.entries(approved)) {
    const spr = SPR[id];
    for (const key of ['w', 'h', 'anchorY', 'idle', 'walk', 'attack', 'attackRelease', 'attackFps', 'floating']) {
      assert.deepEqual(spr[key], data[key], `${id}: ${key}`);
    }
    assert.equal(spr.frames.length, data.frames.length);
    assert.equal(SPR[id + '_pose'].fps, data.idleFps);
  }
  assert.deepEqual(Object.keys(approved).filter(id => approved[id].idle.length > 1), ['rogue', 'wraith']);
});
