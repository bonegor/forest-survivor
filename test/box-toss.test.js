// A broken box's loot (the owner's, 22 October 2026): "the pickups fly a bit away when we break the
// box, like 2 spots away, perpendicular to hero movement, but not far, just so we dont directly pick
// them up". And "the monsters should repel the hero too", softly.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game, PROP_DROP } from '../public/js/game/game.js';
import { CROWD } from '../public/js/game/crowd.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function game(fn, seed = 6) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(seed);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.player.devGod = true;
    g.player.weapons.length = 0;
    g.spawner.update = () => {};
    g.update(1 / 60);
    for (const e of g.enemies) e.dead = true;
    g.update(1 / 60);
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

// Breaks boxes until one holds a potion; returns it.
function potion(g, x, y) {
  for (let i = 0; i < 200; i++) {
    g.pickups.length = 0;
    g.breakProp({ x, y, type: 'barrel' }, 0);
    const pk = g.pickups.find((k) => k.kind === 'potion');
    if (pk) return pk;
  }
  return null;
}

test('a box\'s loot lands about two steps across the way the hero walks, and waits to be walked over', () => game((g, p) => {
  // Walking east: it lands north or south of the box.
  p.vx = 70;
  p.vy = 0;
  const bx = p.x + 30, by = p.y;
  for (let k = 0; k < 8; k++) {
    const pk = potion(g, bx, by);
    assert.ok(pk);
    for (let i = 0; i < 90; i++) pk.update(1 / 60);
    const dx = pk.x - bx, dy = pk.y - by;
    assert.ok(Math.abs(Math.abs(dy) - PROP_DROP.toss) < 5, `across: ${dy.toFixed(1)} px`);
    assert.ok(Math.abs(dx) < 3, `not along: ${dx.toFixed(1)} px`);
    assert.ok(!pk.dead && !pk.pulled, 'in his magnet range but not pulled to him');
  }
  // Standing: across the way from him to the box.
  p.vx = p.vy = 0;
  const pk = potion(g, p.x, p.y + 30);
  for (let i = 0; i < 90; i++) pk.update(1 / 60);
  assert.ok(Math.abs(Math.abs(pk.x - p.x) - PROP_DROP.toss) < 5 && Math.abs(pk.y - p.y - 30) < 3);
  // Walked over, it is his.
  p.x = pk.x;
  p.y = pk.y;
  pk.update(1 / 60);
  assert.ok(pk.dead, 'taken');
}));

test('the foes on the hero ease him off them, never as fast as he walks', () => game((g, p) => {
  const x0 = p.x, y0 = p.y;
  // Three on his east side, held there.
  const foes = [0, 1, 2].map((i) => g.spawnEnemy('skeleton', p.x + 4, p.y + (i - 1) * 2, { instant: true, hpMul: 1e6 }));
  for (const e of foes) {
    e.spd = 0;
    e.update = () => {};
  }
  g.update(1 / 60);
  const step = Math.hypot(p.x - x0, p.y - y0);
  assert.ok(step > 0 && step <= CROWD.hero.most / 60 + 1e-9, `one frame: ${step.toFixed(2)} px`);
  assert.ok(p.x < x0, 'pushed west, away from them');
  assert.ok(CROWD.hero.most < 70, 'slower than the slowest hero walks');
}));
