// Bosses as events (arrival.js): something stirs before a night's boss; at its coming the horde
// recoils and the hero never moves; its name card holds the banners back; under a tenth of its
// health its heart beats. Its fall leaves the horde and the night as they were.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { ARRIVAL, LOW_HP } from '../public/js/game/arrival.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function game(fn, o = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(o.seed ?? 11);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: o.mode || 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.player.devGod = true;
    g.player.weapons.length = 0;
    g.update(1 / 60);
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}
const run = (g, secs) => {
  for (let i = 0; i < Math.round(secs * 60); i++) g.update(1 / 60);
};
const clearHorde = (g) => {
  for (const e of g.enemies) e.dead = true;
  run(g, 1 / 60);
};

test('something stirs before a night’s boss, then it comes with its name card and letterbox', () =>
  game((g) => {
    clearHorde(g);
    g.setTime(270 - ARRIVAL.stir * g.pace - 0.2);
    run(g, 0.1);
    assert.equal(g.stir, null, 'not yet');
    run(g, 0.2);
    assert.ok(g.stir && !g.stir.done, 'the stir has begun');
    assert.ok(!g.enemies.some((e) => e.boss && !e.dead), 'and no boss yet');
    run(g, ARRIVAL.stir + 0.1);
    const boss = g.enemies.find((e) => e.boss && !e.dead);
    assert.ok(boss, 'the Bone King has come');
    assert.equal(boss.type, 'boneking');
    assert.ok(g.card && g.card.letterbox && g.card.name === boss.def.name, 'its name card, letterboxed');
    assert.ok(boss.slamAt >= ARRIVAL.letterbox * 0.9, 'its bar slams in after the card');
  }));

test('Ranked’s returning boss comes lighter: no letterbox, its bar sooner', () =>
  game((g, p) => {
    const b = g.spawnBoss('boneking', p.x + 150, p.y);
    assert.ok(g.card && !g.card.letterbox);
    assert.equal(b.slamAt, ARRIVAL.lightSlamAt);
  }, { mode: 'ranked' }));

test('at a boss’s coming the horde near it recoils outward, and the hero is never moved', () =>
  game((g, p) => {
    clearHorde(g);
    const near = g.spawnEnemy('skeleton', p.x + 70, p.y, { instant: true });
    const far = g.spawnEnemy('skeleton', p.x + 400, p.y, { instant: true });
    run(g, 1 / 60);
    const hx = p.x, hy = p.y, kx = near.kx;
    g.spawnBoss('butcher', p.x + 40, p.y);
    assert.equal(p.x, hx);
    assert.equal(p.y, hy);
    assert.ok(near.kx > kx + 20, `the skeleton beside it is thrown out (${near.kx.toFixed(1)})`);
    assert.equal(far.kx, 0, 'one well away is not');
    run(g, 0.5);
    assert.ok(Math.hypot(p.x - hx, p.y - hy) < 1e-9, 'nor after, standing still');
  }));


test('under a tenth of its health a boss’s heart beats, and banners wait under its name card', () =>
  game((g, p) => {
    const king = g.spawnBoss('boneking', p.x + 120, p.y);
    g.banner('A word', 'that waits', '#ffffff', 1);
    const b = g.banners[g.banners.length - 1];
    run(g, 1);
    assert.ok(g.card, 'the name card is up');
    assert.equal(b.t, 0, 'the banner has not started under it');
    run(g, ARRIVAL.card);
    assert.equal(g.card, null, 'the card has gone');
    assert.ok(b.t > 0, 'and the banner goes on');
    assert.equal(g.bossBeatT, 0, 'no heartbeat at full health');
    king.hp = king.maxHp * (LOW_HP * 0.5);
    run(g, 0.1);
    assert.ok(g.bossBeatT > 0, 'nearly done: its heart beats');
  }));

// The side version's purge of the small fry at a boss's fall and its 8 s lull were not taken: the
// fall leaves the horde and the night as they were.
test('a boss’s fall fells no small fry, and the night goes on', () =>
  game((g, p) => {
    run(g, 20);
    const king = g.spawnBoss('boneking', p.x + 60, p.y);
    const fry = g.spawnEnemy('skeleton', p.x - 60, p.y, { instant: true });
    run(g, 0.5);
    let spawned = 0;
    const spawn = g.spawnEnemy.bind(g);
    g.spawnEnemy = (...a) => {
      spawned++;
      return spawn(...a);
    };
    g.killEnemy(king);
    run(g, 1);
    assert.ok(!fry.dead, 'the skeleton on the screen still stands');
    run(g, 3);
    assert.ok(spawned > 0, `the horde keeps coming (${spawned})`);
  }));

test('the night’s bar is 120 px wide where it can be, and on a phone keeps clear of the relic slots', async () => {
  const { nightBarHalf } = await import('../public/js/game/hud.js');
  assert.equal(nightBarHalf(240), 60, '1920×1080: the full bar');
  assert.equal(nightBarHalf(320), 60, '1280×720');
  const B = nightBarHalf(147); // a phone held upright, 295 px across
  assert.ok(B >= 30 && 147 - B >= 3 + 6 * 18, `clear of the slots (${B})`);
});
