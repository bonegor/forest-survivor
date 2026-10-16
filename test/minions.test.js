// The Necromancer's minions share out the foes and stand apart instead of piling into one
// blob on the nearest foe (the user's call, 16 October 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + file).href);
await mod('tools/headless.mjs');
const { Game } = await mod('public/js/game/game.js');
const { Minion, claims } = await mod('public/js/game/minions.js');
const { input } = await mod('public/js/engine/input.js');
const { mulberry32, TAU } = await mod('public/js/engine/util.js');
const P = await mod('public/js/shared/profile.js');

// A hero who can't die, standing still, unarmed, with no spawner: only what a test puts there.
function game(fn, seed = 5, o = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(seed);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'necromancer', mode: 's15', meta: P.metaBonuses(P.defaultProfile()), settings: { numbers: false }, crypts: false, ...o });
    g.spawner.update = () => {};
    g.player.devGod = true;
    g.player.weapons.length = 0;
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}
const run = (g, seconds) => {
  for (let i = 0; i < seconds * 60; i++) g.update(1 / 60);
};
// Foes that neither die nor walk: only blows move them.
function foes(g, spots) {
  const list = spots.map(([x, y]) => g.spawnEnemy('skeleton', x, y, { instant: true, hpMul: 1e6 }));
  g.update(1 / 60);
  for (const e of list) e.spd = 0;
  return list;
}
// Eight skeletons raised in a huddle at the hero's feet.
function skeletons(g, p, n = 8) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const m = new Minion(g, p.x + ((i % 4) - 1.5) * 3, p.y + (i < 4 ? -2 : 2), { dmg: 1, dur: 99 });
    m.hits = 0;
    const attack = m.attack;
    m.attack = function (...a) {
      this.hits++;
      return attack.apply(this, a);
    };
    g.minions.push(m);
    list.push(m);
  }
  return list;
}
function closest(list) {
  let min = Infinity;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) min = Math.min(min, Math.hypot(list[i].x - list[j].x, list[i].y - list[j].y));
  return min;
}

test('eight skeletons spread over eight foes in a ring, none on top of another', () =>
  game((g, p) => {
    const ring = foes(g, Array.from({ length: 8 }, (_, i) => [p.x + Math.cos((i / 8) * TAU) * 60, p.y + Math.sin((i / 8) * TAU) * 45]));
    const ms = skeletons(g, p);
    run(g, 3);
    const on = new Map();
    for (const m of ms) {
      assert.ok(ring.includes(m.target), 'every skeleton is on a foe');
      on.set(m.target, (on.get(m.target) || 0) + 1);
    }
    assert.ok(Math.max(...on.values()) <= 2, `at most two on a foe (${[...on.values()]})`);
    assert.ok(on.size >= 6, `they go for many foes, not one (${on.size})`);
    assert.ok(closest(ms) >= 6, `none within 6 px of another (${closest(ms).toFixed(1)})`);
    assert.ok(ms.every((m) => m.hits > 0), 'and they fight');
  }));

test('eight skeletons on one foe all strike it, yet stand apart', () =>
  game((g, p) => {
    const [e] = foes(g, [[p.x + 40, p.y]]);
    const ms = skeletons(g, p);
    run(g, 2);
    for (const m of ms) m.hits = 0;
    run(g, 2);
    for (const m of ms) {
      assert.equal(m.target, e, 'every skeleton is on the one foe');
      assert.ok(m.hits >= 2, `each strikes it (${ms.map((m) => m.hits)})`);
    }
    assert.ok(closest(ms) >= 6, `none within 6 px of another (${closest(ms).toFixed(1)})`);
  }));

test("the Army of the Dead's knights fan out over the horde too", () =>
  game((g, p) => {
    const horde = foes(g, Array.from({ length: 12 }, (_, i) => [p.x + Math.cos((i / 12) * TAU) * 90, p.y + Math.sin((i / 12) * TAU) * 70]));
    g.startUlt('deadrise');
    run(g, 3);
    const knights = g.minions.filter((m) => m.ult);
    assert.equal(knights.length, 10);
    const on = new Map();
    for (const m of knights) if (m.target) on.set(m.target, (on.get(m.target) || 0) + 1);
    assert.ok(horde.length >= 10 && Math.max(...on.values()) <= 2, `at most two on a foe (${[...on.values()]})`);
    assert.ok(closest(knights) >= 6, `none within 6 px of another (${closest(knights).toFixed(1)})`);
  }));

// Taken through a crypt's door (or back out), they let go of the foes they were on: those
// stay in the world he left, and nobody walks off toward them or keeps them claimed.
test('gathered to the hero, skeletons drop their foes and pick afresh at once', () =>
  game((g, p) => {
    const [e] = foes(g, [[p.x + 120, p.y]]);
    const ms = skeletons(g, p, 4);
    run(g, 1);
    assert.ok(ms.every((m) => m.target === e), 'all four are on the far foe');
    assert.equal(claims(e), 4, 'and claim it');
    g.gatherMinions();
    for (const m of ms) {
      assert.ok(m.target === null, 'no foe kept');
      assert.ok(m.retarget <= 0, 'a new pick due on the next step');
    }
    assert.equal(claims(e), 0, 'the far foe is claimed by none');
  }));

test('skeletons taken into a crypt chase nothing left in the forest', () =>
  game((g, p) => {
    const [e] = foes(g, [[p.x + 30, p.y]]);
    const ms = skeletons(g, p, 3);
    for (const m of ms) m.rise = 0;
    run(g, 0.1);
    assert.ok(ms.some((m) => m.target === e), 'on the forest foe');
    g.enterCrypt({ key: '3,4', depth: 1, x: p.x, y: p.y });
    run(g, 0.7);
    assert.ok(g.inCrypt, 'in the crypt');
    assert.ok(ms.every((m) => !m.target || g.enemies.includes(m.target)), 'every target is a crypt monster');
  }, 5, { crypts: true }));

// The user, 16 October 2026: minions break boxes as the hero's weapons do, but only in passing. A
// blow struck at a foe breaks any box in its swing; they never go for a box, nor stop at one.
const barrels = (g, p, spots) => spots.map(([dx, dy]) => g.spawnEnemy('barrel', p.x + dx, p.y + dy, { instant: true }));

test('a skeleton striking a foe breaks the barrel beside it, and a death knight likewise', () => {
  for (const knight of [false, true])
    game((g, p) => {
      const [e] = foes(g, [[p.x + 50, p.y]]);
      const [barrel] = barrels(g, p, [[50, 9]]);
      const m = new Minion(g, p.x + 30, p.y, { dmg: 50, dur: 99, knight });
      m.rise = 0;
      g.minions.push(m);
      let onBox = false;
      for (let i = 0; i < 90; i++) {
        g.update(1 / 60);
        if (m.target && m.target.prop) onBox = true;
      }
      assert.equal(m.target, e, 'on the foe');
      assert.ok(!onBox, 'never on the barrel');
      assert.ok(barrel.dead, `${knight ? 'a knight' : 'a skeleton'}: the barrel beside its foe is broken`);
      assert.ok(g.pickups.length > 0, 'and what it held lies there');
    });
});

test('with no foe about, skeletons leave the boxes be: they never go for one', () =>
  game((g, p) => {
    const boxes = barrels(g, p, [[40, 0], [-36, 20], [0, -44], [60, 30], [20, 14]]);
    const ms = skeletons(g, p, 4);
    let targeted = false;
    for (let i = 0; i < 180; i++) {
      g.update(1 / 60);
      if (ms.some((m) => m.target)) targeted = true;
    }
    assert.ok(!targeted, 'no box is ever a target');
    assert.ok(ms.every((m) => m.hits === 0), 'no blow struck');
    assert.ok(boxes.every((b) => !b.dead), 'every box stands');
    assert.ok(ms.every((m) => Math.hypot(m.x - p.x, m.y - p.y) < 50), 'they keep by the hero');
  }));

test('a skeleton walks through a row of boxes to its foe, breaking none it only passes', () =>
  game((g, p) => {
    const [e] = foes(g, [[p.x + 90, p.y]]);
    const row = barrels(g, p, [[40, -10], [40, 0], [40, 10]]);
    const [m] = skeletons(g, p, 1);
    run(g, 2);
    assert.equal(m.target, e);
    assert.ok(m.x > p.x + 70, `it got through to its foe (${Math.round(m.x - p.x)} px on)`);
    assert.ok(m.hits > 0, 'and strikes it');
    assert.ok(row.every((b) => !b.dead), 'the boxes it walked through stand');
  }));
