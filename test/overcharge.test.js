// Overcharge (G9 of the 21 November 2026 gameplay review; data/passives.js OVERCHARGE): once a
// weapon is at its top, a level-up's fillers offer a rank past it for the one at its top that has
// dealt the most, its damage and area growing a little less each rank, never to an end, and kept
// through its evolution.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { MAX_WEAPON_LEVEL } from '../public/js/data/weapons.js';
import { OVERCHARGE, overDamage, FILLER_ROOM } from '../public/js/data/passives.js';

function gameCase(fn) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(23);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.spawner.update = () => {};
    g.player.devGod = true;
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

const top = (w) => {
  w.level = MAX_WEAPON_LEVEL;
  w.recompute();
  return w;
};

test('each rank gives a little less than the last, and there is no end to them', () => {
  assert.ok(Math.abs(overDamage(1) - 0.1) < 1e-9);
  assert.ok(Math.abs(overDamage(10) - 0.562) < 0.001);
  assert.ok(Math.abs(overDamage(20) - 0.946) < 0.001);
  for (let r = 2; r < 60; r++) {
    assert.ok(overDamage(r) > overDamage(r - 1), 'more at every rank');
    assert.ok(overDamage(r) - overDamage(r - 1) < overDamage(r - 1) - (r > 2 ? overDamage(r - 2) : 0), 'each a little less');
  }
  assert.ok(FILLER_ROOM.indexOf('over') === 1, 'on a screen with upgrades left it comes after Valor');
});

test('no Overcharge until a weapon is at its top; then it goes to the one that has dealt the most', () => gameCase((g, p) => {
  const sword = p.weapons[0];
  assert.ok(!sword.maxed);
  assert.ok(g.blessingCapped('over'), 'none at its top: not offered');
  assert.equal(g.filler('over').type, 'bless');
  top(sword);
  const axe = top(g.addWeapon('axe'));
  sword.dmgDealt = 10;
  axe.dmgDealt = 50;
  assert.ok(!g.blessingCapped('over'));
  assert.deepEqual(g.filler('over'), { type: 'over', id: 'axe' }, 'the one that has dealt the most');
  sword.dmgDealt = 90;
  assert.equal(g.filler('over').id, 'sword');
}));

test('an Overcharge makes its weapon strike harder and reach wider, and is kept through its evolution', () => gameCase((g, p) => {
  const sword = top(p.weapons[0]);
  const dmg = sword.s.dmg, area = sword.s.area;
  g.applyChoice(g.filler('over'));
  assert.equal(sword.over, 1);
  assert.equal(p.overcharges, 1);
  assert.ok(Math.abs(sword.s.dmg - dmg * (1 + overDamage(1))) < 1e-9, 'damage +10%');
  assert.ok(Math.abs(sword.s.area - area * (1 + OVERCHARGE.area)) < 1e-9, 'area +2%');
  for (let i = 0; i < 30; i++) g.applyChoice(g.filler('over'));
  assert.equal(sword.over, 31);
  assert.ok(Math.abs(sword.s.area - area * (1 + OVERCHARGE.areaMost)) < 1e-9, 'area 20% more at most');
  p.passives.set('might', 1);
  assert.ok(sword.evolve(), 'into Excalibur');
  assert.equal(sword.id, 'excalibur');
  assert.equal(sword.over, 31, 'its ranks go with it');
  const bare = sword.s.dmg / (1 + overDamage(31));
  sword.over = 0;
  sword.recompute();
  assert.ok(Math.abs(sword.s.dmg - bare) < 1e-6, 'and are in its strength');
}));
