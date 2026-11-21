// The horde's pressure kinds (G10 of the 21 November 2026 gameplay review; game/pressure.js): the
// Bloater's gas, the Shieldbearer's shield, the Shaman's rally and the Gem Eater's hunger, each in
// the later pockets.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { Gas, GAS, shieldTakes, shamanAI, gemEaterAI } from '../public/js/game/pressure.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { ENEMIES } from '../public/js/data/enemies.js';
import { POCKETS, pocketAt } from '../public/js/data/waves.js';

const KINDS = ['bloater', 'shieldbearer', 'shaman', 'gemeater'];

function gameCase(fn) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(19);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.spawner.update = () => {};
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}
const foe = (g, type, dx, dy = 0) => {
  const e = g.spawnEnemy(type, g.player.x + dx, g.player.y + dy, { instant: true, hpMul: 100 });
  e.spd = 0;
  return e;
};

test('none comes before minute 4; then each joins the later pockets, a few at a time', () => {
  for (const k of KINDS) assert.ok(ENEMIES[k], k);
  for (const p of POCKETS) {
    const w = Object.values(p.spawn).reduce((s, v) => s + v, 0);
    for (const k of KINDS) {
      if (p.minutes[1] <= 4) assert.equal(p.spawn[k], undefined, `${k} not before minute 4`);
      else if (p.spawn[k]) assert.ok(p.spawn[k] / w < 0.1, `${k} is a few of the ${p.minutes.join('-')} horde`);
    }
  }
  assert.ok(KINDS.every((k) => pocketAt(10).spawn[k]), 'all four by minute 10');
});

test("a Shieldbearer's shield takes a blow from the hero's side of it, not one from behind or without a push", () => gameCase((g, p) => {
  const e = foe(g, 'shieldbearer', 60);
  assert.ok(Math.abs(shieldTakes(e, { kx: 1, ky: 0 }, p) - (1 - ENEMIES.shieldbearer.shield)) < 1e-9, 'pushed away from him: blocked');
  assert.equal(shieldTakes(e, { kx: -1, ky: 0 }, p), 1, 'from behind it: whole');
  assert.equal(shieldTakes(e, { kx: 0, ky: 0 }, p), 1, 'no push: whole');
  assert.equal(shieldTakes(foe(g, 'zombie', 60), { kx: 1, ky: 0 }, p), 1, 'only it has a shield');
}));

test("a Bloater bursts into gas where it dies, and the gas bites the hero standing in it", () => gameCase((g, p) => {
  const e = foe(g, 'bloater', 50);
  g.killEnemy(e);
  const gas = g.effects.find((f) => f instanceof Gas);
  assert.ok(gas && gas.x === e.x, 'its gas where it fell');
  const hits = [];
  p.hurt = (amount, src, by) => hits.push(by);
  p.x = gas.x;
  p.y = gas.y;
  for (let i = 0; i < 60; i++) gas.update(1 / 60);
  assert.ok(hits.length >= 2, 'bitten every half second');
  for (let i = 0; i < GAS.dur * 60; i++) gas.update(1 / 60);
  assert.equal(gas.update(1 / 60), false, 'gone in its time');
}));

test('a Shaman rallies the horde about it: faster for a while, and mended', () => gameCase((g, p) => {
  const s = foe(g, 'shaman', 120), z = foe(g, 'zombie', 140);
  z.hp = z.maxHp / 2;
  g.grid.rebuild(g.enemies, p.x, p.y);
  s.data.rallyT = 0;
  shamanAI(s, 1 / 60);
  assert.ok(z.hasteT > 0 && z.hasteK > 1, 'rallied');
  assert.ok(z.hp > z.maxHp / 2, 'mended');
}));

test('a Gem Eater runs for a soul gem, eats it, and gives back what it ate where it falls', () => gameCase((g, p) => {
  const e = foe(g, 'gemeater', 100);
  g.pickups.length = 0;
  g.dropGem(e.x + 2, e.y, 7);
  const gem = g.pickups.find((pk) => pk.kind === 'gem');
  assert.ok(gem);
  gemEaterAI(e, 1 / 60);
  assert.ok(gem.dead && e.ate === 7, 'eaten');
  g.pickups.length = 0;
  g.killEnemy(e);
  const back = g.pickups.filter((pk) => pk.kind === 'gem').reduce((s, pk) => s + pk.value, 0);
  assert.equal(back, 7 + ENEMIES.gemeater.xp * e.xpMul, 'its own gem and what it ate');
}));
