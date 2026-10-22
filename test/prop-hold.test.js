// A broken box's loot waits PROP_HOLD before it pops out (the owner's, 22 October 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game, PROP_HOLD } from '../public/js/game/game.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

test('what a broken box held stays unseen and untouched for 0.2 s, then pops out', () => {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(4);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.player.devGod = true;
    g.player.weapons.length = 0;
    g.update(1 / 60);
    assert.equal(PROP_HOLD, 0.2);
    const p = g.player;
    let pk = null;
    for (let i = 0; i < 50 && !pk; i++) {
      const box = g.spawnEnemy('crate', p.x, p.y, { instant: true });
      g.pickups.length = 0;
      g.breakProp(box, 0);
      pk = g.pickups[0] || null;
    }
    assert.ok(pk, 'a box held something');
    pk.x = p.x;
    pk.y = p.y; // under his feet
    const ctx = { drawImage() { throw new Error('drawn while held'); } };
    for (let t = 0; t < PROP_HOLD - 0.05; t += 1 / 60) {
      assert.ok(pk.update(1 / 60) && !pk.dead, 'not taken while held');
      pk.draw(ctx, g.cam);
      pk.drawGlow(ctx, g.cam);
    }
    for (let i = 0; i < 120 && !pk.dead; i++) pk.update(1 / 60);
    assert.ok(pk.dead, 'then it pops out and is his');
  } finally {
    Math.random = oldRandom;
    input.bot = oldBot;
  }
});
