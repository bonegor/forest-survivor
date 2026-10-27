// The horde keeps a little room (crowd.js): foes that overlap ease apart, the lighter the more,
// while a boss and the props never budge and foes still pass through props; a timed swarm comes
// as a loose stream, a big one wider; and on the Endless Night a swarm comes back as a whole batch.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { CROWD } from '../public/js/game/crowd.js';
import { SWARM_SPREAD } from '../public/js/game/spawner.js';
import { SWARM_BATCH } from '../public/js/data/waves.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function game(fn, o = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(o.seed ?? 7);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false, ...o });
    g.player.devGod = true;
    g.player.weapons.length = 0;
    g.update(1 / 60);
    for (const e of g.enemies) e.dead = true;
    g.spawner.update = () => {};
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

// Foes held where they stand (no walking), so only the crowd moves them.
const still = (e) => {
  e.spd = 0;
  e.update = () => {};
  return e;
};

test('foes on one spot ease apart to their room, and not at once', () => game((g, p) => {
  const pile = [];
  for (let i = 0; i < 12; i++) pile.push(still(g.spawnEnemy('skeleton', p.x + 80, p.y, { instant: true })));
  g.update(1 / 60);
  const spread = () => Math.max(...pile.map((e) => Math.hypot(e.x - p.x - 80, e.y - p.y)));
  assert.ok(spread() < 10, `soft: one frame moves them only a little (${spread().toFixed(1)} px)`);
  for (let f = 0; f < 180; f++) g.update(1 / 60);
  let close = 0;
  for (let i = 0; i < pile.length; i++) {
    for (let j = i + 1; j < pile.length; j++) {
      const a = pile[i], b = pile[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) < (a.r + b.r) * 0.9) close++;
    }
  }
  assert.equal(close, 0, 'after 3 s none stands inside another');
  assert.ok(spread() < 40 * CROWD.room, `they keep together as a crowd, just not on one spot (${spread().toFixed(1)} px)`);
}));

test('a boss and a prop never budge, and foes still pass through props', () => game((g, p) => {
  const prop = g.spawnEnemy('barrel', p.x + 60, p.y, { instant: true });
  if (prop) {
    still(prop);
    const foe = still(g.spawnEnemy('skeleton', p.x + 60, p.y, { instant: true }));
    for (let f = 0; f < 60; f++) g.update(1 / 60);
    assert.equal(prop.x, p.x + 60);
    assert.ok(Math.hypot(foe.x - prop.x, foe.y - prop.y) < 1, 'a foe stands in a prop as before');
  }
  const boss = g.spawnBoss('boneking', p.x - 90, p.y);
  still(boss);
  const bx = boss.x, by = boss.y;
  const near = still(g.spawnEnemy('zombie', bx + 1, by, { instant: true }));
  for (let f = 0; f < 60; f++) g.update(1 / 60);
  assert.deepEqual([boss.x, boss.y], [bx, by], 'the boss stands');
  assert.ok(Math.hypot(near.x - bx, near.y - by) > 1 + 1, 'the foe gives way');
}));

test('the crowd is soft: a share of the overlap a second, not a wall', () => {
  assert.ok(CROWD.rate > 1 && CROWD.rate < 20);
  assert.ok(CROWD.room >= 1 && CROWD.room < 1.5);
});

test('a timed swarm comes as a loose stream, not one clump', () => game((g, p) => {
  g.spawner.fire({ type: 'swarm', enemy: 'bat', count: 48, dir: 0 }, g.phase);
  const bats = g.enemies.filter((e) => !e.dead && e.type === 'bat');
  assert.ok(bats.length >= 40);
  const ys = bats.map((e) => e.y - p.y), xs = bats.map((e) => e.x - p.x);
  const across = Math.max(...ys) - Math.min(...ys), deep = Math.max(...xs) - Math.min(...xs);
  assert.ok(across >= SWARM_SPREAD.wide * 0.9, `across ${across.toFixed(0)} px`);
  assert.ok(deep >= SWARM_SPREAD.deep * 0.6, `deep ${deep.toFixed(0)} px`);
}));

// A big swarm comes wider across its way (spawner.js SWARM_SPREAD.base, .most), never deeper.
test('a big swarm comes wider, not deeper', () => game((g, p) => {
  g.spawner.fire({ type: 'swarm', enemy: 'bat', count: Math.round(1200 / g.diff.horde), dir: 0 }, g.phase);
  const bats = g.enemies.filter((e) => !e.dead && e.type === 'bat');
  assert.ok(bats.length >= 1000, `${bats.length} bats`);
  const ys = bats.map((e) => e.y - p.y), xs = bats.map((e) => e.x - p.x);
  const across = Math.max(...ys) - Math.min(...ys), deep = Math.max(...xs) - Math.min(...xs);
  assert.ok(across >= SWARM_SPREAD.wide * SWARM_SPREAD.most * 0.95, `across ${across.toFixed(0)} px`);
  assert.ok(deep <= SWARM_SPREAD.deep + 1, `deep ${deep.toFixed(0)} px`);
}));

test('on the Endless Night a looped swarm comes as a whole batch, each knowing its place', () => {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(3);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 'ranked', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.player.devGod = true;
    g.update(1 / 60);
    const sp = g.spawner;
    let swarms = 0;
    // Twelve loops, each brought near (loopAt) and then let come.
    for (let k = 0; k < 12; k++) {
      sp.eventIdx = sp.warnIdx = sp.events.length;
      const from = sp.events.length;
      sp.loopAt = g.phase + 0.01;
      for (let f = 0; f < 30 && sp.events.length === from; f++) g.update(1 / 60);
      const loop = sp.events.slice(from);
      assert.ok(loop.length >= 1, 'a looped event was put in');
      if (loop[0].type !== 'swarm') continue;
      swarms++;
      assert.ok(loop.length >= SWARM_BATCH.min && loop.length <= SWARM_BATCH.max, `${loop.length} swarms`);
      loop.forEach((e, i) => {
        assert.equal(e.batch, i);
        assert.equal(e.of, loop.length);
        if (i) assert.ok(e.at > loop[i - 1].at);
      });
    }
    assert.ok(swarms >= 1, 'a swarm came back among twelve loops');
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
});
