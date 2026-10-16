// The Necromancer's minions share out the foes and stand apart instead of piling into one
// blob on the nearest foe (the user's call, 16 October 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + file).href);
await mod('tools/headless.mjs');
const { Game } = await mod('public/js/game/game.js');
const { Minion } = await mod('public/js/game/minions.js');
const { input } = await mod('public/js/engine/input.js');
const { mulberry32, TAU } = await mod('public/js/engine/util.js');
const P = await mod('public/js/shared/profile.js');

// A hero who can't die, standing still, unarmed, with no spawner: only what a test puts there.
function game(fn, seed = 5) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(seed);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'necromancer', mode: 's15', meta: P.metaBonuses(P.defaultProfile()), settings: { numbers: false }, crypts: false });
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
