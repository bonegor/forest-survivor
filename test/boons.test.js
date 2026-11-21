// Boons (G7 of the 21 November 2026 gameplay review; data/boons.js): relics that bend a rule for a
// price, offered only by a boss's trophy, three the hero hasn't, one or none taken, kept the run.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { MAX_WEAPON_LEVEL } from '../public/js/data/weapons.js';
import { BOONS, BOON_IDS, trophyChoices } from '../public/js/data/boons.js';

function game() {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(41);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.spawner.update = () => {};
    return g;
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

test('every boon has its name, its icon and its rule with its price', () => {
  assert.equal(BOON_IDS.length, 9);
  for (const id of BOON_IDS) {
    const b = BOONS[id];
    assert.ok(b.name && b.icon.startsWith('i_') && /but|,/.test(b.desc), id);
  }
});

test('a trophy offers three boons the hero has not, fewer as he gathers them, none once he has all', () => {
  const rnd = mulberry32(3);
  const three = trophyChoices(new Set(), rnd);
  assert.equal(three.length, 3);
  assert.equal(new Set(three).size, 3);
  const held = new Set(BOON_IDS.slice(0, 8));
  assert.deepEqual(trophyChoices(held, rnd), [BOON_IDS[8]]);
  assert.deepEqual(trophyChoices(new Set(BOON_IDS), rnd), []);
});

test("a boon bends the hero's numbers for its price", () => {
  const g = game(), p = g.player;
  const base = { maxHp: p.maxHp, might: p.might, armor: p.armor, speed: p.speedMul, crit: p.crit, critMult: p.critMult, amount: p.amount };
  for (const id of ['glassheart', 'wolfsoath', 'moonedge', 'hollowcrown', 'embercrown', 'bloodpact']) p.boons.add(id);
  p.recompute();
  assert.equal(p.maxHp, Math.round(base.maxHp * 0.7));
  assert.ok(Math.abs(p.might - base.might * 1.4) < 1e-9);
  assert.ok(Math.abs(p.armor - base.armor * 0.5) < 1e-9);
  assert.ok(Math.abs(p.speedMul - base.speed * 1.25) < 1e-9);
  assert.ok(Math.abs(p.crit - base.crit * 0.5) < 1e-9);
  assert.ok(Math.abs(p.critMult - base.critMult * 1.5) < 1e-9);
  assert.equal(p.amount, base.amount + 1);
  assert.ok(Math.abs(p.hurtMul - 1.1) < 1e-9);
  assert.equal(p.potionMul, 0);
  assert.ok(p.boonLeech > 0);
});

test('under the Hollow Crown nothing evolves; a fallen boss leaves a trophy that offers its boons', () => {
  const g = game(), p = g.player;
  const sword = p.weapons[0];
  sword.level = MAX_WEAPON_LEVEL;
  sword.recompute();
  g.addPassive('might');
  assert.equal(g.evolvable().length, 1, 'the Longsword is ready');
  p.boons.add('hollowcrown');
  p.recompute();
  assert.deepEqual(g.evolvable(), [], 'not under the Hollow Crown');
  const boss = g.spawnBoss('boneking', p.x + 120, p.y);
  g.killEnemy(boss);
  const trophy = g.pickups.find((pk) => pk.kind === 'trophy' && !pk.dead);
  assert.ok(trophy, 'its trophy beside its chest');
  g.takeTrophy();
  assert.equal(g.trophyQueue.length, 1);
  const { title, cards } = g.trophyQueue[0];
  assert.equal(title, 'TROPHY');
  assert.equal(cards.length, 3);
  assert.ok(cards.every((c) => c.kind === 'boon' && !p.boons.has(c.id)), 'none he already has');
  const said = g.takeCard(cards[0]);
  assert.ok(p.boons.has(cards[0].id) && said.name === BOONS[cards[0].id].name, 'taken, his for the run');
});
