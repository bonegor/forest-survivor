// Order 2, item 1: banners keep their place (two at most, a twin replaces, real time, hidden under
// the cards); a crypt's foes are never moved to the hero; damage dealt is the health a blow took;
// nothing counts a kill or XP once the hero has fallen.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game, BANNERS_MOST } from '../public/js/game/game.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

const step = (g, n = 1) => {
  for (let i = 0; i < n; i++) g.update(1 / 60);
};

function gameCase(fn, seed = 7) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(seed);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    g.player.devGod = true;
    step(g, 2);
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

test('at most two banners; one with the same title replaces its twin; they run out under the cards', () =>
  gameCase((g) => {
    g.banners.length = 0;
    g.banner('A');
    g.banner('B');
    g.banner('C');
    assert.equal(BANNERS_MOST, 2);
    assert.deepEqual(g.banners.map((b) => b.title), ['B', 'C'], 'the oldest gave way');
    g.banner('B', 'again');
    assert.deepEqual(g.banners.map((b) => b.title), ['C', 'B'], 'the twin replaced, not stacked');
    g.state = 'chest';
    for (let i = 0; i < 200; i++) g.fadeReal(1 / 60);
    assert.equal(g.banners.length, 0, 'gone by the time the chest closes');
  }));

test('a woken crypt lord far from the hero is never moved to him; it walks, if anything', () =>
  gameCase((g, p) => {
    g.world.syncShrines();
    const door = g.crypts.find((d) => d.key === '0,0');
    g.enterCrypt(door);
    step(g, 100); // the journey down
    assert.ok(g.inCrypt);
    const w = g.world;
    const lord = g.enemies.find((e) => e.lord && !e.dead);
    // The hero 40 tiles' walk or so away: back at the stairs, the lord woken where it sleeps.
    p.x = w.start.x;
    p.y = w.start.y;
    g.hitEnemy(lord, 1);
    const was = { x: lord.x, y: lord.y };
    const far = Math.hypot(lord.x - p.x, lord.y - p.y);
    assert.ok(far > 300, `far off (${Math.round(far)} px)`);
    step(g, 120);
    const moved = Math.hypot(lord.x - was.x, lord.y - was.y);
    const walk = lord.spd * 1.12 * g.move * 2 + 4; // two seconds' walk, a little to spare
    assert.ok(moved < walk, `it walked at most (${Math.round(moved)} px), no jump`);
    assert.ok(Math.hypot(lord.x - p.x, lord.y - p.y) > far - walk, 'no nearer the hero than it could walk: not beside him');
  }));

test('damage dealt counts the health a blow took, not the overkill', () =>
  gameCase((g, p) => {
    const w = p.weapons[0];
    const e = g.spawnEnemy('rat', p.x + 40, p.y, { instant: true, hpMul: 1 });
    const hp = e.hp, before = g.stats.damage, wBefore = w.dmgDealt;
    g.hitEnemy(e, 1e6, { w, noCrit: true });
    assert.ok(e.dead);
    assert.equal(g.stats.damage - before, hp, 'the run: its health');
    assert.equal(w.dmgDealt - wBefore, hp, 'the weapon: its health');
  }));

test('once the hero has fallen nothing counts a kill or XP', () =>
  gameCase((g, p) => {
    const e = g.spawnEnemy('skeleton', p.x + 40, p.y, { instant: true });
    const gem = g.addPickup('gem', p.x, p.y, 50, { pop: false });
    p.devGod = false;
    p.revivals = 0;
    p.invuln = 0;
    p.hurt(1e9);
    assert.ok(p.dead);
    const kills = g.kills, xp = p.xp, level = p.level;
    assert.equal(g.hitEnemy(e, 1e6), 0, 'no blow lands');
    g.killEnemy(e);
    for (let i = 0; i < 60; i++) g.update(1 / 60);
    assert.equal(g.kills, kills, 'no kill');
    assert.ok(!gem.dead && p.xp === xp && p.level === level, 'no XP picked up');
  }));
