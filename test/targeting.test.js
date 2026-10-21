// The one rule for the foes the hero's weapons pick out (game.js targetable), shared by every
// aim path: nearestEnemy (the sword, a hand-struck blow, chains, the Shadow Blade, homing),
// nearestEnemies (fireballs, flasks, glaives, thorns, Arcane Ray) and enemiesOnScreen (meteors,
// lightning, the ultimates). A monster still rising out of the ground, a prop and the dead are
// passed over; a risen monster, or one that only fades in, is taken.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game, targetable } from '../public/js/game/game.js';
import { KINDS } from '../public/js/game/weapons.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

// A seeded game with no horde of its own: only the foes a test brings.
function gameCase(hero, fn) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(5);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero, mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.spawner.update = () => {};
    g.player.devGod = true;
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

// What each aim path finds within 100 px of the hero.
function found(g, p) {
  g.grid.rebuild(g.enemies, p.x, p.y);
  return {
    nearest: g.nearestEnemy(p.x, p.y, 100),
    nearestN: g.nearestEnemies(p.x, p.y, 5, 100),
    onScreen: g.enemiesOnScreen().filter((e) => Math.hypot(e.x - p.x, e.y - p.y) <= 100),
  };
}

test('a monster rising out of the ground is passed over by every aim path until it has risen', () => {
  gameCase('knight', (g, p) => {
    // Behind the hero, who faces right: a swing at it goes the other way from his aim.
    const e = g.spawnEnemy('skeleton', p.x - 30, p.y, { hpMul: 1e5 });
    e.spd = 0;
    assert.ok(e.def.rise && e.spawnT > 0.3, 'it rises');
    assert.equal(p.aim, 0);
    assert.equal(targetable(e), false);
    assert.deepEqual(found(g, p), { nearest: null, nearestN: [], onScreen: [] }, 'no path finds it');
    const sword = p.weapons.find((w) => w.def.kind === 'sword');
    KINDS.sword.fire(sword);
    assert.equal(sword.aimAng, p.aim, 'the sword swings the way he faces');
    // Its last 0.3 s of rising, and every path takes it.
    e.spawnT = 0.3;
    assert.equal(targetable(e), true);
    assert.deepEqual(found(g, p), { nearest: e, nearestN: [e], onScreen: [e] }, 'every path finds it');
    KINDS.sword.fire(sword);
    assert.equal(sword.aimAng, p.aim, 'the sword still swings the way he faces, seeking no foe');
  });
});

test('a monster that only fades in is picked out at once; props and the dead never are', () => {
  gameCase('knight', (g, p) => {
    const bat = g.spawnEnemy('bat', p.x + 30, p.y, { hpMul: 1e5 });
    bat.spd = 0;
    assert.ok(!bat.def.rise && bat.spawnT > 0, 'fading in');
    assert.deepEqual(found(g, p), { nearest: bat, nearestN: [bat], onScreen: [bat] });
    const barrel = g.spawnEnemy('barrel', p.x + 10, p.y, { instant: true });
    bat.dead = true;
    assert.ok(barrel.prop && !targetable(barrel) && !targetable(bat));
    assert.deepEqual(found(g, p), { nearest: null, nearestN: [], onScreen: [] }, 'neither is found');
  });
});
