// The night's merchant (G6 of the 21 November 2026 gameplay review; game/stall.js): a stall sets up
// ahead of the hero on its clock, stays a while, and sells one of its wares for the night's gold.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { STALL, WARES, price } from '../public/js/game/stall.js';

function gameCase(fn, mode = 's15') {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(29);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode, meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.spawner.update = () => {};
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}
const stalls = (g) => g.pickups.filter((pk) => pk.kind === 'stall' && !pk.dead);

test('a stall sets up ahead of the hero on its clock, without a die, and moves on unvisited', () => gameCase((g, p) => {
  g.time = STALL.first - 1;
  g.stallTick();
  assert.equal(stalls(g).length, 0, 'not before its time');
  g.time = STALL.first;
  let rolled = 0;
  const random = Math.random;
  Math.random = () => (rolled++, random());
  try {
    g.stallTick();
  } finally {
    Math.random = random;
  }
  assert.equal(rolled, 0, 'no die rolled for it');
  const [s] = stalls(g);
  assert.ok(s && Math.abs(Math.hypot(s.x - p.x, s.y - p.y) - STALL.ahead) < 1, 'ahead of him');
  assert.equal(g.stallAt, STALL.first + STALL.every);
  g.time = STALL.first + STALL.stay + 1;
  g.stallTick();
  assert.equal(stalls(g).length, 0, 'packed up');
}));

test('its wares are priced by the night; one bought costs the gold, one he cannot afford is greyed', () => gameCase((g, p) => {
  g.addPassive('might');
  const cards = g.stallCards();
  assert.deepEqual(cards.map((c) => c.id), ['heal', 'whet', 'polish', 'reroll']);
  for (const c of cards) assert.equal(c.price, WARES[c.id].base, `${c.id} at its base at dusk`);
  assert.ok(price('heal', 21) > 3 * WARES.heal.base - 1, 'about three times it by dawn');
  g.gold = 10;
  assert.ok(g.cardInfo(cards[3]).disabled, 'too dear');
  assert.equal(g.takeCard(cards[3]), null);
  assert.equal(g.gold, 10);
  g.gold = 500;
  const rerolls = p.rerolls;
  g.takeCard(cards[3]);
  assert.equal(p.rerolls, rerolls + 1);
  assert.equal(g.gold, 500 - cards[3].price);
  const lvl = p.weapons[0].level;
  g.takeCard(cards[1]);
  assert.equal(p.weapons[0].level, lvl + 1, 'the Whetstone');
  g.takeCard(cards[2]);
  assert.equal(p.passives.get('might'), 2, 'the polish');
}));

test('no stall on a Dungeon Run floor', () => gameCase((g) => {
  g.time = STALL.first;
  g.stallTick();
  assert.equal(stalls(g).length, 0);
}, 'dungeon'));
