// The Gilded Thief keeps his own pace (the owner's, 22 October 2026: "the thief now seems to jump
// instead of just moving as set before"): no blow shoves him, and no gust, pull or fright moves him.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

test('a blow, a gust or a fright never moves the thief; he only runs and strolls', () => {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(3);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.player.devGod = true;
    g.update(1 / 60);
    const p = g.player;
    const th = g.spawnEnemy('thief', p.x + 120, p.y, { instant: true });
    g.hitEnemy(th, 1, { kb: 3, kx: 1, ky: 0 });
    assert.equal(th.kx, 0, 'no shove');
    assert.equal(th.movable, false, 'no gust or pull');
    assert.equal(th.scare(2), false, 'no fright');
    // A plain monster still is moved.
    const rat = g.spawnEnemy('rat', p.x - 120, p.y, { instant: true });
    g.hitEnemy(rat, 1, { kb: 3, kx: -1, ky: 0 });
    assert.ok(rat.kx < 0 && rat.movable);
  } finally {
    Math.random = oldRandom;
    input.bot = oldBot;
  }
});
