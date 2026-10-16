// The Phoenix Heart, a relic unlike the rest. The owner: "if you have this as one of the abilities
// (like the luck, or damage, or armor skill at level up) it would enable the EVOLUTION — any
// weapon can be evolved. +1 revive, evolves any weapon. Available once you have evolved your main
// weapon. If you die it disappears and you CAN get it again at some level up."
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { WEAPONS, MAX_WEAPON_LEVEL } from '../public/js/data/weapons.js';
import { PASSIVES } from '../public/js/data/passives.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses, sanitizeCheckpoint } from '../public/js/shared/profile.js';

function gameCase(hero, fn, o = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(31);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero, mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false, ...o });
    g.spawner.update = () => {};
    g.update(1 / 60);
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

const offered = (g) => g.upgradePool().some((c) => c.type === 'passive' && c.id === 'phoenix');
const topLevel = (w) => {
  w.level = MAX_WEAPON_LEVEL;
  w.recompute();
  return w;
};
const evolveOwn = (p) => p.weapons.find((w) => p.hero.unique.includes(w.id) && w.def.evo).evolve();

test('the Phoenix Heart is offered only once one of the hero\'s own weapons has evolved', () => {
  gameCase('knight', (g, p) => {
    assert.ok(!offered(g), 'not at the start');
    topLevel(g.addWeapon('axe')).evolve();
    assert.ok(p.weapons.some((w) => w.evolved));
    assert.ok(!offered(g), 'not for a shared weapon evolved');
    topLevel(p.weapons[0]).evolve();
    assert.equal(p.weapons[0].id, 'excalibur');
    assert.ok(offered(g), 'once his Longsword is Excalibur');
    // A relic slot must be free, and it is one while held.
    for (const id of ['might', 'armor', 'vitality', 'regen', 'cooldown', 'area']) g.addPassive(id);
    assert.ok(!offered(g), 'no slot free');
  });
  gameCase('necromancer', (g, p) => {
    assert.ok(!offered(g));
    topLevel(p.weapons.find((w) => w.id === 'miasma')).evolve();
    assert.ok(offered(g), 'either of the Necromancer\'s two will do');
  });
});

test('held, it is a revive more, and any weapon at its top level evolves at a chest', () => {
  gameCase('knight', (g, p) => {
    topLevel(p.weapons[0]).evolve();
    const axe = topLevel(g.addWeapon('axe'));
    assert.ok(!p.passives.has(WEAPONS.axe.evo.with), 'without its own relic');
    assert.equal(g.evolvable().length, 0, 'no evolution without it');
    const revives = p.revives;
    g.applyChoice({ type: 'passive', id: 'phoenix' });
    assert.equal(p.revives, revives + 1, '+1 revive');
    assert.deepEqual(g.evolvable(), [axe]);
    const roll = g.rollChest('elite');
    assert.deepEqual(roll.items.filter((it) => it.type === 'evolve').map((it) => it.id), [WEAPONS.axe.evo.into]);
    assert.equal(axe.id, WEAPONS.axe.evo.into);
    assert.ok(p.passives.has('phoenix'), 'evolving does not use it up');
    // One a chest, as always.
    const a = topLevel(g.addWeapon('blades')), b = topLevel(g.addWeapon('glaive'));
    const two = g.rollChest('boss').items.filter((it) => it.type === 'evolve');
    assert.equal(two.length, 1);
    assert.equal([a, b].filter((w) => w.evolved).length, 1);
  });
});

test('a fall spends it first, the other revives kept; offered again five levels later', () => {
  gameCase('knight', (g, p) => {
    topLevel(p.weapons[0]).evolve();
    g.applyChoice({ type: 'passive', id: 'phoenix' });
    p.revivals = 1; // a Second Wind, the Armory's
    const level = p.level;
    p.hurt(1e9);
    assert.ok(!p.dead && p.hp > 0, 'he rises');
    assert.ok(!p.passives.has('phoenix'), 'the Phoenix Heart is gone');
    assert.equal(p.revivals, 1, 'the Second Wind kept for later');
    assert.equal(p.revives, 1);
    assert.equal(g.phoenixLostAt, level);
    assert.ok(g.banners.some((b) => b.title === 'Phoenix Heart!'), 'said so');
    for (let i = 1; i < PASSIVES.phoenix.again; i++) {
      p.level++;
      assert.ok(!offered(g), `not ${i} levels on`);
    }
    p.level++;
    assert.ok(offered(g), `${PASSIVES.phoenix.again} levels on, it can be had again`);
    p.invuln = 0;
    p.hurt(1e9);
    assert.ok(!p.dead && p.revivals === 0, 'the next fall takes the Second Wind');
    p.invuln = 0;
    p.hurt(1e9);
    assert.ok(p.dead, 'and the one after is the end');
  });
});

test('a saved run keeps the Phoenix Heart, and when one was spent', () => {
  gameCase('knight', (g, p) => {
    topLevel(p.weapons[0]).evolve();
    g.applyChoice({ type: 'passive', id: 'phoenix' });
    const cp = sanitizeCheckpoint(JSON.parse(JSON.stringify(g.checkpoint())));
    assert.deepEqual(cp.passives, [['phoenix', 1, 0]]);
    gameCase('knight', (g2, p2) => {
      assert.ok(p2.passives.has('phoenix'));
      assert.equal(p2.revives, p.revives);
      assert.equal(g2.evolvable().length, 0);
    }, { checkpoint: cp });
    g.spendRelic('phoenix');
    const spent = sanitizeCheckpoint(JSON.parse(JSON.stringify(g.checkpoint())));
    assert.equal(spent.phoenixLostAt, p.level);
    gameCase('knight', (g2) => assert.equal(g2.phoenixLostAt, p.level), { checkpoint: spent });
    assert.equal(sanitizeCheckpoint({ ...spent, phoenixLostAt: 'x' }).phoenixLostAt, null);
  });
});
