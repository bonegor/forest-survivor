// The Gilded Thief keeps his own pace (the owner's, 22 October 2026: "the thief now seems to jump
// instead of just moving as set before"): no blow shoves him, and no gust, pull or fright moves him.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { THIEF, THIEF_LOOT } from '../public/js/game/enemies.js';

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

// The 27 October 2026 review, C10 (28 October 2026): a thief knows from the start whether it carries
// a chest, one time in two as when it was rolled at its fall; it drops that chest only then; its gold
// is the 92 it always was; and its escape says what got away.
test('a Gilded Thief carries its chest from the start, drops it only then, and its escape says what got away', () => {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(3);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.player.devGod = true;
    g.spawner.update = () => {};
    g.update(1 / 60);
    const p = g.player;
    assert.equal(THIEF_LOOT.coins * THIEF_LOOT.coin + THIEF_LOOT.pile, 92, 'its gold as it was');
    // About one in two comes with a chest.
    let carry = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const th = g.spawnEnemy('thief', p.x + 300, p.y + 300, { instant: true, always: true });
      if (th.chest) carry++;
      th.dead = true;
    }
    assert.ok(carry / N >= 0.35 && carry / N <= 0.65, `a chest one time in two: ${carry} of ${N}`);
    g.update(1 / 60);
    // It drops the chest it carries, and none if it carries none.
    const chests = () => g.pickups.filter((pk) => pk.kind === 'chest' && !pk.dead).length;
    for (const has of [true, false]) {
      const th = g.spawnEnemy('thief', p.x + 120, p.y, { instant: true, always: true });
      th.chest = has;
      const before = chests();
      g.killEnemy(th);
      assert.equal(chests() - before, has ? 1 : 0, has ? 'its chest' : 'no chest');
    }
    // Let go, it is gone when its time is up, and the banner says what went with it.
    const th = g.spawnEnemy('thief', p.x + 120, p.y + 40, { instant: true, always: true });
    th.chest = true;
    th.life = THIEF.time;
    g.update(1 / 60);
    assert.ok(th.dead, 'it escaped');
    const b = g.banners.find((x) => x.title === 'The thief escaped...');
    assert.ok(b, 'the escape is told');
    assert.match(b.sub, /^\d+ gold and a chest got away$/);
  } finally {
    Math.random = oldRandom;
    input.bot = oldBot;
  }
});
