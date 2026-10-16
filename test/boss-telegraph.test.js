// A boss's telegraphed blow dies with the boss. Its body goes back to the enemy pool and the
// next monster spawned may come out of it; the warning must not move to that monster and
// fire there (found in review, 16 October 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + file).href);
await mod('tools/headless.mjs');
const { Game } = await mod('public/js/game/game.js');
const { Telegraph, Explosion } = await mod('public/js/game/effects.js');
const { input } = await mod('public/js/engine/input.js');
const { mulberry32 } = await mod('public/js/engine/util.js');
const P = await mod('public/js/shared/profile.js');

// A Knight standing still, unarmed, with no spawner, and the Bone King beside him about to
// raise his bone ring (a 1 s warning circle that follows him).
function game(fn, seed = 7) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(seed);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: P.metaBonuses(P.defaultProfile()), settings: { numbers: false }, crypts: false });
    g.spawner.update = () => {};
    g.update(1 / 60);
    const p = g.player;
    p.weapons.length = 0;
    const boss = g.spawnBoss('boneking', p.x + 40, p.y);
    boss.cdT = 0;
    boss.spawnT = 0;
    run(g, 3);
    const tel = g.effects.find((fx) => fx instanceof Telegraph && fx.o.follow === boss);
    assert.ok(tel, 'the Bone King is telegraphing his blast');
    return fn(g, p, boss, tel);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}
const run = (g, frames) => {
  for (let i = 0; i < frames; i++) g.update(1 / 60);
};
// The Bone King's blast is his dark one (his death throws fire).
const blasts = (g) => g.effects.filter((fx) => fx instanceof Explosion && fx.style === 'dark').length;

test('a live boss’s telegraph still lands: the blast and the bone ring', () =>
  game((g, p, boss, tel) => {
    const shots = g.eshots.length;
    run(g, 70);
    assert.ok(!g.effects.includes(tel), 'the warning has run its course');
    assert.ok(blasts(g) > 0, 'the blast went off');
    assert.ok(g.eshots.length - shots >= 11, `the bone ring flew (${g.eshots.length - shots} shots)`);
  }));

test('a boss killed mid-telegraph fires nothing, even from the monster that reuses its body', () =>
  game((g, p, boss, tel) => {
    const id = boss.id;
    g.killEnemy(boss);
    run(g, 1); // the sweep puts its body in the pool
    const fresh = g.spawnEnemy('skeleton', p.x + 400, p.y + 300, { instant: true });
    assert.ok(fresh === boss, 'the pool handed the boss’s body to the skeleton');
    assert.notEqual(fresh.id, id, 'under a new id');
    const shots = g.eshots.length, before = blasts(g);
    let hurts = 0;
    const hurt = p.hurt;
    p.hurt = function (...a) {
      hurts++;
      return hurt.apply(this, a);
    };
    run(g, 300); // well past the warning's second, slow motion after the kill and all
    assert.ok(!g.effects.includes(tel), 'the warning went with the boss');
    assert.equal(g.eshots.length, shots, 'no bone shots');
    assert.equal(blasts(g), before, 'no blast');
    assert.equal(hurts, 0, 'and nothing struck the hero');
  }));

test('the warning stops following once its boss falls, even before the body is reused', () =>
  game((g, p, boss, tel) => {
    g.killEnemy(boss);
    run(g, 1);
    assert.ok(!g.effects.includes(tel), 'gone the frame after');
  }));
