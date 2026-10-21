// What the levels themselves give. The user: "level up make hero slightly stronger", then, of
// +0.5% damage and health a level and a point of armor every 20 levels: "do not cap, let it go
// wild. Also, let it be exponential for health", and later "double the effect of levelling":
// +1% damage a level, health growing 1% on itself, a point of armor every 10 levels. Then, 21
// October 2026: "Levelups do not make hero stronger", "set change to 0": every gain is nought.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { levelBonus, xpFor, LEVEL_MIGHT, LEVEL_HP, LEVEL_ARMOR_GAIN } from '../public/js/game/player.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-9, `${what}: ${a}, not ${b}`);

function game(o = {}) {
  const oldRandom = Math.random;
  Math.random = mulberry32(3);
  try {
    const g = new Game({ hero: 'archer', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, ...o });
    g.update(1 / 60);
    return g;
  } finally {
    Math.random = oldRandom;
  }
}

test('a level adds no damage, health or armor of its own: every gain is nought', () => {
  assert.equal(LEVEL_MIGHT, 0);
  assert.equal(LEVEL_HP, 1);
  assert.equal(LEVEL_ARMOR_GAIN, 0);
  const at = (level, might, hp, armor) => {
    const b = levelBonus(level);
    near(b.might, might, `damage at ${level}`);
    near(b.hp, hp, `health at ${level}`);
    assert.equal(b.armor, armor, `armor at ${level}`);
  };
  for (const level of [1, 2, 10, 20, 80, 300]) at(level, 1, 1, 0);
});

test('a level gained leaves the hero as strong as he was', () => {
  const g = game(), p = g.player;
  const base = { hp: p.maxHp, might: p.might, armor: p.armor };
  p.hp = p.maxHp - 10;
  let xp = 0;
  for (let l = 1; l < 21; l++) xp += xpFor(l);
  p.addXp(xp / p.growth / 1.1); // the night's own +10% on xp (Player.addXp)
  assert.equal(p.level, 21);
  const b = levelBonus(21);
  assert.equal(p.maxHp, Math.round(base.hp * b.hp));
  near(p.might, base.might * b.might, 'damage');
  assert.equal(p.armor, base.armor, 'no armor from the levels');
  assert.equal(p.hp, p.maxHp - 10, 'and his health as it was');
});

test('sixty levels gained at once bring no strength of their own', () => {
  const g = game(), fresh = game(), p = g.player;
  let xp = 0.5; // a little over, so rounding can't leave the last level short
  for (let l = 1; l < 60; l++) xp += xpFor(l);
  p.addXp(xp / p.growth / 1.1);
  assert.equal(p.level, 60);
  assert.equal(p.maxHp, Math.round(fresh.player.maxHp * levelBonus(60).hp));
  assert.equal(p.armor, fresh.player.armor);
});
