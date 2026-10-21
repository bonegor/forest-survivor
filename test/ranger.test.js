// The Ranger, the owner's (20 October 2026): "make ranger attack faster and stronger (both by 20%)
// and increase ranger health by 50%". Her weapons strike 1.2 times as often and 1.2 times as hard,
// she has half again the health, and her pace is as it was: the thief is measured against the
// heroes' pace (data/enemies.js thief).
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { HEROES } from '../public/js/data/heroes.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

// Her stats before (the rest of her hero as it is).
const BEFORE = { maxHp: 100, speed: 1.15, crit: 0.12, projSpeed: 1.1 };

// A run with the Ranger, or with her stats as they were; what her bow and a blow of hers come to.
function ranger(stats) {
  const oldRandom = Math.random;
  Math.random = mulberry32(7);
  try {
    const g = new Game({ hero: 'archer', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    const p = g.player;
    if (stats) {
      p.hero = { ...p.hero, stats };
      p.recompute();
      p.hp = p.maxHp;
    }
    const bow = p.weapons.find((w) => w.id === 'bow');
    const foe = g.spawnEnemy('skeleton', p.x + 60, p.y, { instant: true, hpMul: 1000 });
    Math.random = mulberry32(3);
    const blow = g.hitEnemy(foe, 1000, { noCrit: true });
    return { maxHp: p.maxHp, hp: p.hp, speed: p.speedMul, might: p.might, cd: bow.s.cd, blow };
  } finally {
    Math.random = oldRandom;
  }
}

test('the Ranger strikes 20% faster and 20% harder, at the pace she had', () => {
  const h = HEROES.archer.stats;
  assert.equal(h.maxHp, 80, 'cut to the rule of 21 October 2026 (data/heroes.js)');
  assert.equal(h.might, 1.2);
  assert.ok(Math.abs(h.cooldown * 1.2 - 1) < 1e-12, 'every cooldown divided by 1.2');
  assert.equal(h.speed, BEFORE.speed, 'her pace as it was');
  const now = ranger(), was = ranger(BEFORE);
  assert.equal(now.maxHp / was.maxHp, 0.8, 'her health cut to 80');
  assert.equal(now.hp, now.maxHp, 'and she starts with all of it');
  assert.ok(Math.abs(now.might / was.might - 1.2) < 1e-12, 'her damage 1.2 times');
  assert.ok(Math.abs(now.blow / was.blow - 1.2) < 0.002, `a blow of hers 1.2 times as hard: ${now.blow} against ${was.blow}`);
  assert.ok(Math.abs(was.cd / now.cd - 1.2) < 1e-9, `her bow ready 1.2 times as often: every ${now.cd} s against ${was.cd}`);
  assert.equal(now.speed, was.speed, 'her pace untouched');
});
