import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { SPR } from '../public/js/engine/sprites.js';
import { HEROES, heroLook } from '../public/js/data/heroes.js';
import { HeroShowcase } from '../public/js/ui/hero-showcase.js';
import { defaultProfile } from '../public/js/shared/profile.js';

test('optional skins preserve every collision silhouette, frame, cadence and combat animation', () => {
  for (const h of Object.values(HEROES)) {
    const look = heroLook(h.id, { [h.id]: 'refined' });
    assert.notEqual(look.sprite, h.sprite);
    assert.equal(heroLook(h.id, {}), h);
    assert.equal(heroLook(h.id, { [h.id]: 'removed-skin' }), h);
    assert.equal(heroLook(h.id, { [h.id]: 'original' }), h);
    assert.equal(look.stats, h.stats);
    const a = SPR[h.sprite], b = SPR[look.sprite];
    for (const key of ['w', 'h', 'anchorY', 'fitW', 'fitH', 'idle', 'walk', 'attack', 'attackWalk', 'attackRelease', 'attackFps', 'idleRate', 'motionRate', 'selfBob']) {
      assert.deepEqual(b[key], a[key], `${h.id}: ${key}`);
    }
    assert.equal(a.frames.length, b.frames.length);
    let changed = 0;
    for (let f = 0; f < a.frames.length; f++) {
      const original = a.frames[f], skin = b.frames[f];
      assert.deepEqual(skin.box, original.box, `${h.id} frame ${f} collision bounds`);
      assert.equal(!!skin.em, !!original.em, `${h.id} frame ${f} glow`);
      for (let i = 0; i < original.buf.d.length; i++) {
        assert.equal(skin.buf.d[i] >>> 24, original.buf.d[i] >>> 24, `${h.id} frame ${f} alpha`);
        if (skin.buf.d[i] !== original.buf.d[i]) changed++;
      }
    }
    assert.ok(changed > 100, `${h.id} visibly changes`);
    assert.ok(SPR[look.pose]?.frames.length, `${h.id} has a menu pose`);
  }
});

test('real Player and selection renderer use each selected skin for complete walk cycles and both facings', () => {
  const ctx = document.createElement('canvas').getContext('2d');
  for (const h of Object.values(HEROES)) {
    const settings = { skins: { [h.id]: 'refined' }, diff: 'easy' };
    const show = new HeroShowcase(h.id, defaultProfile(), settings);
    const spr = SPR[show.game.player.hero.sprite], seen = new Set(), faces = new Set();
    for (let i = 0; i < 720; i++) {
      show.update(1 / 60);
      show.draw(ctx, { x: 0, y: 0, w: 220, h: 220 }, false, settings);
      const rect = show.game.player._rect;
      assert.ok(rect && spr.frames.includes(rect[4]), h.id + ' renders selected skin');
      seen.add(spr.frames.indexOf(rect[4]));faces.add(rect[5]);
    }
    for (const f of spr.walk) assert.ok(seen.has(f), `${h.id} visits walk frame ${f}`);
    assert.equal(faces.size, 2, h.id + ' faces both ways');
  }
});
