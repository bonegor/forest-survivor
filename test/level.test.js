// What the levels themselves give. The user: "level up make hero slightly stronger", then, of
// +0.5% damage and health a level and a point of armor every 20 levels: "do not cap, let it go
// wild. Also, let it be exponential for health".
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { levelBonus, xpFor } from '../public/js/game/player.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses, sanitizeCheckpoint } from '../public/js/shared/profile.js';

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

test('each level adds half a percent of damage, health grows half a percent on itself, armor a point every 20 levels, uncapped', () => {
  const at = (level, might, hp, armor) => {
    const b = levelBonus(level);
    near(b.might, might, `damage at ${level}`);
    near(b.hp, hp, `health at ${level}`);
    assert.equal(b.armor, armor, `armor at ${level}`);
  };
  at(1, 1, 1, 0);
  at(2, 1.005, 1.005, 0);
  at(20, 1.095, 1.005 ** 19, 1);
  at(80, 1.395, 1.005 ** 79, 4);
  at(300, 2.495, 1.005 ** 299, 15);
  assert.ok(levelBonus(300).hp > 4.4, 'health runs away the longer a run lasts');
  assert.ok(levelBonus(300).hp / levelBonus(299).hp > levelBonus(30).hp / levelBonus(29).hp - 1e-12, 'by the same share each level');
});

test('a level gained makes the hero stronger at once, the health he gains with it', () => {
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
  assert.equal(p.armor, base.armor + 1);
  assert.equal(p.hp, p.maxHp - 10, 'the health gained comes with it');
});

test('a saved run picked up again has its levels\' strength', () => {
  const cp = sanitizeCheckpoint({ mode: 's15', diff: 'hard', hero: 'archer', level: 60, hp: 5, weapons: [['bow', 3]] });
  const g = game({ checkpoint: cp }), fresh = game();
  assert.equal(g.player.level, 60);
  assert.equal(g.player.maxHp, Math.round(fresh.player.maxHp * levelBonus(60).hp));
  assert.equal(g.player.armor, fresh.player.armor + 3);
});
