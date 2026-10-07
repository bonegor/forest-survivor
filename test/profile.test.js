import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../public/js/shared/profile.js';

test('sanitizeProfile repairs garbage into a valid default profile', () => {
  for (const raw of [null, 42, 'x', [], { gold: -5, wins: 'nope', up: { might: 99, bogus: 3 } }]) {
    const p = P.sanitizeProfile(raw);
    assert.equal(p.v, P.VERSION);
    assert.ok(p.gold >= 0);
    assert.deepEqual(Object.keys(p.wins).sort(), [...P.MODES].sort());
    assert.ok(!('bogus' in p.up));
    if (p.up.might) assert.ok(p.up.might <= 5);
  }
});

test('encode/decode round-trips and rejects junk', () => {
  const p = P.defaultProfile();
  p.gold = 1234;
  assert.deepEqual(P.decodeState(P.encodeState(p)), p);
  assert.equal(P.decodeState('!!!'), null);
  assert.equal(P.decodeState('a'.repeat(5000)), null);
});

test('applyRun pays gold, records wins and clamps impossible reports', () => {
  let p = P.defaultProfile();
  const r = P.applyRun(p, { mode: 's15', diff: 'hard', victory: true, time: 900, gold: 400, kills: 3000, level: 40 });
  assert.ok(r.ok);
  assert.equal(r.reward.collected, 600); // 400 * 1.5 on hard
  assert.equal(r.reward.bonus, 500); // 200 * 2.5
  assert.equal(r.profile.gold, 1100);
  assert.equal(r.profile.wins.s15[2], 1);
  assert.equal(r.profile.best.s15, 900);

  const cheat = P.applyRun(p, { mode: 's15', diff: 'easy', victory: false, time: 10, gold: 1e9, kills: 1e9 });
  assert.ok(cheat.profile.gold < 1000, 'gold is capped by run time');
  assert.ok(cheat.profile.kills <= 50 + 10 * 60);

  assert.equal(P.applyRun(p, { mode: 'nope', diff: 'easy' }).ok, false);
});

test('a victory only counts when the run was long enough', () => {
  const p = P.defaultProfile();
  const early = P.applyRun(p, { mode: 's15', diff: 'medium', victory: true, time: 42, gold: 10 });
  assert.equal(early.reward.bonus, 0);
  assert.equal(early.profile.wins.s15[1], 0);
  const real = P.applyRun(p, { mode: 's30', diff: 'easy', victory: true, time: 1800, gold: 10 });
  assert.equal(real.profile.wins.s30[0], 1);
});

test('dungeon runs record the deepest floor', () => {
  let p = P.defaultProfile();
  p = P.applyRun(p, { mode: 'dungeon', diff: 'medium', victory: false, time: 600, floor: 2 }).profile;
  assert.equal(p.best.dungeon, 2);
  p = P.applyRun(p, { mode: 'dungeon', diff: 'medium', victory: true, time: 1200, floor: 3 }).profile;
  assert.equal(p.best.dungeon, 4);
  assert.equal(p.wins.dungeon[1], 1);
});

test('buying and refunding upgrades', () => {
  let p = P.defaultProfile();
  assert.equal(P.buyUpgrade(p, 'might').ok, false);
  p.gold = 1000;
  let r = P.buyUpgrade(p, 'might');
  assert.ok(r.ok);
  assert.equal(r.profile.up.might, 1);
  assert.equal(r.profile.gold, 850);
  r = P.buyUpgrade(r.profile, 'might');
  assert.equal(r.profile.up.might, 2);
  assert.equal(r.profile.gold, 550); // second rank costs 300
  const refund = P.refundUpgrades(r.profile);
  assert.equal(refund.refunded, 450);
  assert.equal(refund.profile.gold, 1000);
  assert.deepEqual(refund.profile.up, {});
  assert.equal(P.buyUpgrade(p, 'nonexistent').ok, false);
});

test('revival cannot be bought twice', () => {
  const p = P.defaultProfile();
  p.gold = 10000;
  const once = P.buyUpgrade(p, 'revival');
  assert.ok(once.ok);
  assert.equal(P.buyUpgrade(once.profile, 'revival').ok, false);
});

test('heroes unlock in order at exponentially rising prices', () => {
  let p = P.defaultProfile();
  assert.deepEqual(p.heroes, ['knight']);
  p.gold = 100000;
  assert.equal(P.unlockHero(p, 'mage').ok, false, 'cannot skip ahead');
  assert.equal(P.unlockHero(p, 'dragon').ok, false);
  const costs = [];
  for (const id of P.HERO_ORDER.slice(1)) {
    assert.equal(P.nextHeroUnlock(p), id);
    const before = p.gold;
    const r = P.unlockHero(p, id);
    assert.ok(r.ok, id);
    costs.push(before - r.profile.gold);
    p = r.profile;
  }
  assert.deepEqual(costs, [500, 1500, 4500, 13500]);
  assert.equal(P.nextHeroUnlock(p), null);
  assert.equal(P.unlockHero(p, 'archer').ok, false, 'already unlocked');
  const poor = P.defaultProfile();
  poor.gold = 499;
  assert.equal(P.unlockHero(poor, 'archer').ok, false);
});

test('metaBonuses reflect upgrade ranks', () => {
  const p = P.defaultProfile();
  p.up = { might: 2, armor: 1, revival: 1 };
  const m = P.metaBonuses(p);
  assert.equal(m.might, 1.1);
  assert.equal(m.armor, 1);
  assert.equal(m.revival, 1);
  assert.equal(m.cooldown, 1);
});

test('sanitizeCheckpoint keeps a compact, valid save', () => {
  const cp = P.sanitizeCheckpoint({
    mode: 'dungeon', diff: 'hard', hero: 'mage', floor: 2, seed: 77, time: 500, level: 12, xp: 30, hp: 50,
    gold: 80, kills: 900, fury: 40, weapons: [['fireball', 5, 0], ['bad id!', 3], ['axe', 99]], passives: [['might', 2]],
  });
  assert.equal(cp.floor, 2);
  assert.deepEqual(cp.weapons, [['fireball', 5, 0], ['axe', 8, 0]]);
  assert.equal(cp.bless, 0, 'older saves have no blessings');
  assert.equal(P.sanitizeCheckpoint({ ...cp, bless: 7 }).bless, 7);
  assert.equal(P.sanitizeCheckpoint({ ...cp, bless: -3 }).bless, 0);
  assert.equal(P.sanitizeCheckpoint({ mode: 'x' }), null);
  assert.ok(P.encodeState(cp).length < 1500, 'fits comfortably in a cookie');
});
