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
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

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

// The owner (2026-10-20): the Phoenix Heart "should be available as soon as it is legal on the very
// next level up. Then on the one after that, and then only if randomly selected." A screen is told
// by its level (Game.sureRelic): here each p.level++ is the next level-up's screen.
const heartOn = (cards) => cards.some((c) => c.type === 'passive' && c.id === 'phoenix');
const nextScreen = (g, p, n = 3) => {
  p.level++;
  return g.levelChoices(n);
};

test('once it can be offered, the Phoenix Heart is on the next two level-ups for certain, then only by its weight', () => {
  gameCase('knight', (g, p) => {
    assert.equal(PASSIVES.phoenix.sure, 2);
    for (let i = 0; i < 5; i++) assert.ok(!heartOn(nextScreen(g, p)), 'not before it can be offered');
    topLevel(p.weapons[0]).evolve();
    const first = nextScreen(g, p), second = nextScreen(g, p);
    assert.ok(heartOn(first), 'on the very next level-up');
    assert.ok(heartOn(second), 'and on the one after');
    assert.equal(first.length, 3, 'one of the three, not a fourth');
    let seen = 0;
    for (let i = 0; i < 300; i++) if (heartOn(nextScreen(g, p))) seen++;
    assert.ok(seen > 0 && seen < 60, `after that by its weight alone (${seen} of 300)`);
  });
});

test('a reroll of a sure screen keeps the Phoenix Heart among the new cards and spends no showing', () => {
  gameCase('knight', (g, p) => {
    topLevel(p.weapons[0]).evolve();
    p.level++;
    for (let i = 0; i < 6; i++) assert.ok(heartOn(g.levelChoices(3)), `the first screen, rolled ${i + 1} times`);
    p.level++;
    for (let i = 0; i < 6; i++) assert.ok(heartOn(g.levelChoices(4)), `the second, rolled ${i + 1} times`);
    assert.equal(g.sureShown.get('phoenix').n, 2, 'two showings spent, however often rolled');
    p.level++;
    let seen = 0;
    for (let i = 0; i < 100; i++) if (heartOn(g.levelChoices(3))) seen++;
    assert.ok(seen < 50, `the third screen's rerolls draw it by weight (${seen} of 100)`);
    // Banished, it is not on them at all, sure or not.
    g.sureShown.clear();
    g.banish({ type: 'passive', id: 'phoenix' });
    assert.ok(!heartOn(nextScreen(g, p)), 'banished: never again');
  });
});

test('spent by a fall, it is sure again on the first two level-ups once it may be offered again', () => {
  gameCase('knight', (g, p) => {
    topLevel(p.weapons[0]).evolve();
    assert.ok(heartOn(nextScreen(g, p)));
    g.applyChoice({ type: 'passive', id: 'phoenix', level: 1, isNew: true });
    for (let i = 0; i < 4; i++) assert.ok(!heartOn(nextScreen(g, p)), 'held: not offered');
    g.spendRelic('phoenix');
    for (let i = 1; i < PASSIVES.phoenix.again; i++) assert.ok(!heartOn(nextScreen(g, p)), `spent: not ${i} levels on`);
    assert.ok(heartOn(nextScreen(g, p)), `${PASSIVES.phoenix.again} levels on, on the screen for certain`);
    assert.ok(heartOn(nextScreen(g, p)), 'and on the next');
    assert.equal(g.sureShown.get('phoenix').n, 2);
  });
});

test('a chest draws it only by its weight, spending none of its sure showings', () => {
  gameCase('knight', (g, p) => {
    topLevel(p.weapons[0]).evolve();
    // A chest's draws are drawUpgrades' from the plain pool (Game.rollChest).
    let seen = 0;
    for (let i = 0; i < 200; i++) if (g.drawUpgrades(1)[0].id === 'phoenix') seen++;
    assert.ok(seen < 40, `drawn ${seen} times in 200`);
    for (let i = 0; i < 5; i++) g.rollChest('elite');
    assert.equal(g.sureShown.size, 0, 'no showing spent by chests');
    if (!p.passives.has('phoenix')) assert.ok(heartOn(nextScreen(g, p)), 'the next level-up still has it for certain');
  });
});

test("a sure Phoenix screen isn't swallowed by ALWAYS: with it on offer the level-up asks", () => {
  gameCase('knight', (g, p) => {
    topLevel(p.weapons[0]).evolve();
    // Everything else out of the run: the heart is all that is left to offer.
    for (const c of g.upgradePool()) if (c.id !== 'phoenix') g.banish(c);
    assert.deepEqual(g.upgradePool().map((c) => c.id), ['phoenix']);
    g.autoPick = 'gold';
    g.pendingLevels = 1;
    assert.ok(!g.fillersOnly() && !g.autoReady(), 'not fillers alone');
    assert.equal(g.resolveAutoLevels(), false, 'the level waits for its screen');
    assert.equal(g.pendingLevels, 1);
    const cards = g.levelChoices(3);
    assert.ok(heartOn(cards), 'and the heart is on it');
    assert.deepEqual(cards.filter((c) => c.id !== 'phoenix').map((c) => c.type), ['bless', 'heal'], 'the fillers after it');
  });
});
