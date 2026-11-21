// Oaths (G4 of the 21 November 2026 gameplay review; data/oaths.js): vows a Survival night is
// sworn under, each making it harder its own way; their heat raises the night's gold, and a night
// won under them is kept as the hero's best heat won. None on Ranked or the Dungeon Run.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { runMore } from '../public/js/game/spawner.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import * as P from '../public/js/shared/profile.js';
import { OATHS, OATH_IDS, MAX_HEAT, validOaths, heatOf, oathGold, oathFlags } from '../public/js/data/oaths.js';

function game(o = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(31);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: P.metaBonuses(P.defaultProfile()), settings: { numbers: false }, crypts: false, ...o });
    g.spawner.update = () => {};
    return g;
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

test('known oaths only, once each, in their order, and only in Survival; heat and gold add up', () => {
  assert.deepEqual(validOaths(['glass', 'bogus', 'iron', 'glass']), ['iron', 'glass']);
  assert.deepEqual(validOaths(['iron'], 'ranked'), [], 'none on Ranked');
  assert.deepEqual(validOaths(['iron'], 'dungeon'), [], 'nor on the Dungeon Run');
  assert.deepEqual(validOaths('iron'), []);
  assert.equal(heatOf(['iron', 'hands']), 3);
  assert.equal(MAX_HEAT, OATHS.reduce((n, o) => n + o.heat, 0));
  assert.ok(Math.abs(oathGold(5) - 1.5) < 1e-9);
  const f = oathFlags(['silence'], 's15');
  assert.ok(f.silence && !f.iron && f.heat === 2);
  for (const id of OATH_IDS) assert.equal(typeof oathFlags([], 's15')[id], 'boolean');
});

test('Iron takes his armor, Glass half his health, Few Hands a slot, Silence his ultimate, the Horde a quarter more', () => {
  const plain = game(), sworn = game({ oaths: ['iron', 'glass', 'hands', 'silence', 'horde'] });
  assert.ok(plain.player.armor > 0, 'the Knight has armor of his own');
  assert.equal(sworn.player.armor, 0);
  assert.equal(sworn.player.maxHp, Math.round(plain.player.maxHp / 2));
  assert.equal(sworn.maxWeapons, plain.maxWeapons - 1);
  assert.ok(sworn.player.ultLocked && !plain.player.ultLocked);
  assert.ok(Math.abs(runMore(sworn) - runMore(plain) * 1.25) < 1e-9);
  const necro = game({ hero: 'necromancer', maxWeapons: 2, oaths: ['hands'] });
  assert.equal(necro.maxWeapons, 2, 'never fewer slots than he starts with');
  const ranked = game({ mode: 'ranked', oaths: ['iron'] });
  assert.ok(ranked.player.armor > 0, 'no oath on Ranked');
});

test('Kings: a boss fights his fiercest from the first; the Restless: the dead rise once more, for nothing', () => {
  const g = game({ oaths: ['kings', 'restless'] }), p = g.player;
  const boss = g.spawnBoss('boneking', p.x + 120, p.y);
  assert.equal(boss.fierce, true);
  assert.equal(game().spawnBoss('boneking', p.x + 120, p.y).fierce, false);
  const sk = g.spawnEnemy('skeleton', p.x + 60, p.y, { instant: true });
  const n = g.enemies.length;
  g.killEnemy(sk);
  const risen = g.enemies.find((e) => !e.dead && e.risen);
  assert.ok(risen && risen.type === 'skeleton', 'it rose again');
  assert.equal(risen.xp, 0, 'and pays no soul gem the second time');
  assert.equal(g.enemies.filter((e) => !e.dead).length, n, 'one in its place');
  g.killEnemy(risen);
  assert.ok(!g.enemies.some((e) => !e.dead && e.risen && e !== risen), 'not a third time');
});

test("a night's oaths raise its gold, and a night won under them is the hero's best heat won", () => {
  const p = P.defaultProfile();
  const plain = P.applyRun(p, { mode: 's15', diff: 'medium', victory: true, time: 900, gold: 100 });
  const sworn = P.applyRun(p, { mode: 's15', diff: 'medium', victory: true, time: 900, gold: 100, oaths: ['iron', 'kings', 'dark'] });
  assert.deepEqual(sworn.run.oaths, ['iron', 'kings', 'dark']);
  assert.ok(Math.abs(sworn.reward.multiplier - plain.reward.multiplier * 1.5) < 1e-9, 'heat 5: half as much again');
  assert.equal(sworn.reward.collected, 150);
  assert.ok(sworn.reward.heatBest && sworn.reward.heat === 5);
  assert.equal(sworn.profile.oh.knight, 5);
  const back = P.sanitizeProfile(JSON.parse(JSON.stringify(P.packProfile(sworn.profile))));
  assert.equal(back.oh.knight, 5, 'kept as the cookie keeps it');
  const again = P.applyRun(sworn.profile, { mode: 's15', diff: 'medium', victory: true, time: 900, gold: 0, oaths: ['iron'] });
  assert.ok(!again.reward.heatBest && again.profile.oh.knight === 5, 'a lesser one leaves it');
  const lost = P.applyRun(p, { mode: 's15', diff: 'medium', died: true, time: 300, gold: 0, oaths: OATH_IDS });
  assert.equal(lost.profile.oh.knight, undefined, 'a night lost wins nothing');
  assert.deepEqual(P.sanitizeRun({ mode: 'ranked', oaths: ['iron'] }).oaths, []);
});
