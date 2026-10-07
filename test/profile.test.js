import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../public/js/shared/profile.js';

test('sanitizeProfile repairs garbage into a valid default profile', () => {
  for (const raw of [null, 42, 'x', [], { gold: -5, wins: 'nope', up: { might: 99, bogus: 3 } }]) {
    const p = P.sanitizeProfile(raw);
    assert.equal(p.v, P.VERSION);
    assert.ok(p.gold >= 0);
    assert.deepEqual(Object.keys(p.wins).sort(), [...P.WIN_MODES].sort());
    assert.deepEqual(p.feats, {});
    assert.deepEqual(p.ranked, {});
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
  const real = P.applyRun(p, { mode: 's15', diff: 'easy', victory: true, time: 900, gold: 10 });
  assert.equal(real.profile.wins.s15[0], 1);
});

// A profile with every hero bought and the Dungeon open.
function veteran() {
  const p = P.defaultProfile();
  p.heroes = [...P.HERO_ORDER];
  for (const h of P.HERO_ORDER) p.feats[h] = P.FEAT.survivalHard;
  return p;
}

test('dungeon runs record the deepest floor', () => {
  let p = veteran();
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
  assert.equal(P.unlockHero(p, 'archer').ok, false, 'the Knight must survive a Hard night first');
  for (const h of P.HERO_ORDER) p.feats[h] = P.FEAT.survivalHard;
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
  poor.feats.knight = P.FEAT.survivalHard;
  assert.equal(P.unlockHero(poor, 'archer').ok, false);
});

test('the full ladder: Hard nights, then the Dungeon hero by hero, then Ranked', () => {
  let p = P.defaultProfile();
  const run = (o) => {
    const r = P.applyRun(p, { time: 900, gold: 0, kills: 100, level: 30, victory: true, ...o });
    if (r.ok) p = r.profile;
    return r;
  };
  assert.deepEqual(P.nextGoal(p), { type: 'survivalHard', hero: 'knight', unlocks: 'archer' });
  assert.equal(P.canPlay(p, 'dungeon', 'knight'), false);
  assert.equal(P.canPlay(p, 'ranked', 'knight'), false);
  assert.equal(run({ mode: 'dungeon', diff: 'easy', hero: 'knight' }).ok, false, 'locked modes are refused');

  // An Easy or Medium win doesn't open the next hero.
  assert.deepEqual(run({ mode: 's15', diff: 'medium', hero: 'knight' }).reward.unlocks, []);
  assert.equal(P.heroUnlockReady(p, 'archer'), false);

  // Survival ladder.
  for (const [i, h] of P.HERO_ORDER.entries()) {
    const next = P.HERO_ORDER[i + 1];
    const r = run({ mode: 's15', diff: 'hard', hero: h });
    assert.deepEqual(r.reward.unlocks, [next ? 'buy:' + next : 'mode:dungeon'], h);
    if (next) {
      assert.deepEqual(P.nextGoal(p), { type: 'buy', hero: next, unlocks: next, cost: P.HERO_UNLOCKS[next] });
      p.gold = 1e6;
      p = P.unlockHero(p, next).profile;
    }
  }
  assert.ok(P.canPlay(p, 'dungeon', 'knight'));
  assert.equal(P.canPlay(p, 'dungeon', 'archer'), false, 'only the Knight enters the Dungeon at first');
  assert.equal(run({ mode: 'dungeon', diff: 'easy', hero: 'archer', time: 1200 }).ok, false);

  // Dungeon ladder: any difficulty, but it must be a full clear.
  run({ mode: 'dungeon', diff: 'easy', hero: 'knight', time: 1200, victory: false, floor: 3 });
  assert.equal(P.canPlay(p, 'dungeon', 'archer'), false, 'dying on floor 3 is not a clear');
  for (const [i, h] of P.HERO_ORDER.slice(0, -1).entries()) {
    assert.deepEqual(P.nextGoal(p), { type: 'dungeon', hero: h, unlocks: P.HERO_ORDER[i + 1] });
    const r = run({ mode: 'dungeon', diff: 'easy', hero: h, time: 1200 });
    assert.deepEqual(r.reward.unlocks, ['dungeon:' + P.HERO_ORDER[i + 1]]);
  }
  // The Necromancer must beat it on Hard to open Ranked.
  assert.deepEqual(run({ mode: 'dungeon', diff: 'medium', hero: 'necromancer', time: 1200 }).reward.unlocks, []);
  assert.deepEqual(P.nextGoal(p), { type: 'dungeonHard', hero: 'necromancer', unlocks: 'ranked' });
  assert.deepEqual(run({ mode: 'dungeon', diff: 'hard', hero: 'necromancer', time: 1200 }).reward.unlocks, ['mode:ranked']);
  assert.equal(P.nextGoal(p), null);
  for (const h of P.HERO_ORDER) assert.ok(P.canPlay(p, 'ranked', h), h);
});

test('ranked keeps a personal best per hero and never counts as a win', () => {
  const p = veteran();
  for (const h of P.HERO_ORDER) p.feats[h] |= P.FEAT.dungeon | P.FEAT.dungeonHard;
  let r = P.applyRun(p, { mode: 'ranked', diff: 'hard', hero: 'mage', victory: true, time: 1300, gold: 50, kills: 900, level: 60 });
  assert.ok(r.ok);
  assert.equal(r.run.diff, 'medium', 'one ruleset for everyone');
  assert.equal(r.run.victory, false);
  assert.deepEqual(r.reward.ranked, { time: 1300, best: 1300, personalBest: true, title: 'Paladin' });
  assert.equal(P.totalWins(r.profile), 0);
  r = P.applyRun(r.profile, { mode: 'ranked', hero: 'mage', time: 400 });
  assert.deepEqual(r.reward.ranked, { time: 400, best: 1300, personalBest: false, title: 'Squire' });
  assert.equal(r.profile.ranked.mage, 1300);
  assert.equal(P.sanitizeProfile(JSON.parse(JSON.stringify(r.profile))).ranked.mage, 1300, 'survives a round trip');
  assert.equal(P.rankTitle(0), 'Peasant');
  assert.equal(P.rankTitle(60 * 60 + 5), 'Immortal');
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
