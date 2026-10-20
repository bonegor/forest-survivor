import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../public/js/shared/profile.js';
import * as I from '../public/js/shared/items.js';

test('sanitizeProfile repairs garbage into a valid default profile', () => {
  for (const raw of [null, 42, 'x', [], { gold: -5, wins: 'nope', up: { might: 99, bogus: 3 } }]) {
    const p = P.sanitizeProfile(raw);
    assert.equal(p.v, P.VERSION);
    assert.ok(p.gold >= 0);
    assert.deepEqual(Object.keys(p.wins).sort(), [...P.WIN_MODES].sort());
    assert.deepEqual(p.feats, {});
    assert.deepEqual(p.ranked, {});
    assert.ok(!('bogus' in p.up));
    if (p.up.might) assert.ok(p.up.might <= P.UPGRADES.find((u) => u.id === 'might').max);
  }
});

test('encode/decode round-trips and rejects junk', () => {
  const p = P.defaultProfile();
  p.gold = 1234;
  assert.deepEqual(P.decodeState(P.encodeState(p)), p);
  assert.equal(P.decodeState('!!!'), null);
  assert.equal(P.decodeState('a'.repeat(P.MAX_STATE + 1)), null, 'longer than any cookie of ours');
});

// With runs never saved, this is the biggest cookie the game writes.
test('every hero in six legendaries, and every record at its most, still fits the cookie', () => {
  const p = P.defaultProfile();
  Object.assign(p, { gold: 1e9, runs: 1e7, kills: 1e12, heroes: [...P.HERO_ORDER] });
  p.best = { s15: 960, dungeon: 4, kills: 1e7, level: 999 };
  for (const m of P.WIN_MODES) p.wins[m] = [1e6, 1e6, 1e6];
  for (const u of P.UPGRADES) p.up[u.id] = u.max;
  // The largest a legendary can be: four stats at the top of their roll, the highest seed.
  const legend = (slot) => {
    const stats = {};
    for (const id of I.POOLS[slot].slice(-4)) stats[id] = I.statRange(id, I.LEGENDARY)[1];
    return { slot, rarity: I.LEGENDARY, stats, power: 'undying', seed: 999999 };
  };
  for (const h of P.HERO_ORDER) {
    p.feats[h] = 7;
    p.ranked[h] = 14400;
    p.gear[h] = Object.fromEntries(I.SLOTS.map((s) => [s, legend(s)]));
  }
  const clean = P.sanitizeProfile(p);
  assert.deepEqual(clean.gear, p.gear, 'all of it is valid');
  const json = JSON.stringify(P.packProfile(clean));
  // The server seals at most about 3 000 characters of JSON into a 4 096-character cookie.
  assert.ok(json.length <= 2900, `${json.length} characters`);
  assert.deepEqual(P.sanitizeProfile(JSON.parse(json)), clean, 'packed, then read back');
  // The static game's plain cookie (and an old signed one the server upgrades) is read back by
  // decodeState, whose cap keeps a quarter spare over this, the worst case.
  const plain = P.encodeState(P.packProfile(clean));
  assert.ok(plain.length * 1.25 <= P.MAX_STATE, `${plain.length} characters encoded, cap ${P.MAX_STATE}`);
  assert.deepEqual(P.sanitizeProfile(P.decodeState(plain)), clean, 'encoded, decoded, the same profile');
});

// Every crypt lord may drop gear now, up to four a crypt (items.js MAX_LORDS), so a run may report
// four times the finds it could; the hero still wears six pieces at most, so the report stays small.
test('the largest run report, six legendaries worn and every find the bound allows, is still small', () => {
  const legend = (slot) => {
    const stats = {};
    for (const id of I.POOLS[slot].slice(-4)) stats[id] = I.statRange(id, I.LEGENDARY)[1];
    return { slot, rarity: I.LEGENDARY, stats, power: 'undying', seed: 999999 };
  };
  const gear = Object.fromEntries(I.SLOTS.map((s) => [s, legend(s)]));
  const report = { mode: 's15', diff: 'hard', hero: 'necromancer', victory: true, time: 960, gold: 1e9, kills: 1e12, level: 999, floor: 3, gear, realTime: 7200, found: 1e9 };
  const run = P.sanitizeRun(report);
  assert.equal(run.found, I.MAX_LORDS * (7200 / 45 + 1), 'four finds for every crypt two hours could reach');
  assert.deepEqual(run.gear, gear);
  const json = JSON.stringify({ ...report, found: run.found });
  assert.ok(json.length <= P.MAX_STATE / 4, `${json.length} characters of JSON`);
  assert.ok(P.encodeState({ ...report, found: run.found }).length <= P.MAX_STATE / 2, 'and encoded');
  // The new pieces are kept: the profile it leaves fits the cookie as before.
  const r = P.applyRun(P.defaultProfile(), { ...report, hero: 'knight', found: run.found });
  assert.deepEqual(r.profile.gear.knight, gear);
  assert.ok(P.encodeState(P.packProfile(r.profile)).length * 1.25 <= P.MAX_STATE);
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
  assert.ok(cheat.profile.kills <= 50 + 10 * 120);

  assert.equal(P.applyRun(p, { mode: 'nope', diff: 'easy' }).ok, false);
});

test('a victory only counts when the run was long enough', () => {
  const p = P.defaultProfile();
  const early = P.applyRun(p, { mode: 's15', diff: 'medium', victory: true, time: 42, gold: 10 });
  assert.equal(early.reward.bonus, 0);
  assert.equal(early.profile.wins.s15[1], 0);
  const real = P.applyRun(p, { mode: 's15', diff: 'hard', victory: true, time: 900, gold: 10 });
  assert.equal(real.profile.wins.s15[2], 1);
  assert.ok(P.hasFeat(real.profile, 'knight', P.FEAT.survivalHard), 'any night won counts');
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
  assert.equal(p.wins.dungeon[1], 1, 'a Normal win');
});

// The user: "let us have veteran + normal. Veteran is the current setup and normal is that all
// the monsters have their damage cause reduced by 50% and the number of ranged monsters spawn +
// wolver + any other monsters that lunges is reduced to 1/3".
test('a Normal run pays gold as the old Medium, a Veteran one as the old Hard; Ranked is always Veteran', () => {
  const p = veteran();
  const normal = P.applyRun(p, { mode: 's15', diff: 'medium', victory: true, time: 900, gold: 100 });
  assert.equal(normal.run.diff, 'medium');
  assert.deepEqual([normal.reward.collected, normal.reward.bonus, normal.reward.multiplier], [100, 300, 1]);
  assert.equal(normal.profile.wins.s15[1], 1);
  assert.ok(P.hasFeat(normal.profile, 'knight', P.FEAT.survivalHard), 'a night survived on Normal counts on the ladder');
  const vet = P.applyRun(p, { mode: 's15', diff: 'hard', victory: true, time: 900, gold: 100 });
  assert.deepEqual([vet.reward.collected, vet.reward.bonus, vet.reward.multiplier], [150, 500, 1.5]);
  assert.equal(vet.profile.wins.s15[2], 1);
  p.feats.necromancer |= P.FEAT.dungeon; // Ranked open
  const ranked = P.applyRun(p, { mode: 'ranked', diff: 'medium', hero: 'knight', time: 300, gold: 10 });
  assert.equal(ranked.ok, true);
  assert.equal(ranked.run.diff, 'hard', 'Ranked keeps one best per hero, so it is always Veteran');
  assert.equal(P.applyRun(p, { mode: 'ranked', hero: 'knight', time: 300 }).run.diff, 'hard');
});

// Veteran pays half as much again, so a report that doesn't say it was one is never paid as one.
test('a run that names no difficulty, or one the game no longer has, is paid as Normal', () => {
  const p = veteran();
  for (const diff of [undefined, null, 'easy', 'HARD', 7]) {
    const r = P.applyRun(p, { mode: 's15', diff, victory: true, time: 900, gold: 100 });
    assert.equal(r.run.diff, 'medium', String(diff));
    assert.deepEqual([r.reward.collected, r.reward.bonus, r.reward.multiplier], [100, 300, 1], String(diff));
    assert.equal(r.profile.wins.s15[1], 1, 'a Normal win');
  }
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

test('Second Wind cannot be bought past its cap', () => {
  let p = P.defaultProfile();
  p.gold = 100000;
  const max = P.UPGRADES.find((u) => u.id === 'revival').max;
  for (let i = 0; i < max; i++) {
    const r = P.buyUpgrade(p, 'revival');
    assert.ok(r.ok);
    p = r.profile;
  }
  assert.equal(p.up.revival, max);
  assert.equal(P.buyUpgrade(p, 'revival').ok, false);
});

test('five minutes on the clock with a hero unlock the next, in order and for free', () => {
  let p = P.defaultProfile();
  assert.deepEqual(p.heroes, ['knight']);
  const run = (hero, time) => {
    const r = P.applyRun(p, { mode: 's15', hero, time, gold: 0, kills: 10, level: 5 });
    if (r.ok) p = r.profile;
    return r;
  };
  assert.deepEqual(run('knight', P.HERO_UNLOCK_TIME - 1).reward.unlocks, [], '4:59 is not enough');
  assert.deepEqual(P.nextGoal(p), { type: 'survive', hero: 'knight', unlocks: 'archer', minutes: 5 });
  assert.equal(run('archer', 600).ok, false, 'a locked hero cannot play');
  for (const [i, h] of P.HERO_ORDER.slice(0, -1).entries()) {
    const next = P.HERO_ORDER[i + 1];
    assert.equal(P.unlocksNext(p, h), next);
    const r = run(h, P.HERO_UNLOCK_TIME);
    assert.deepEqual(r.reward.unlocks, ['hero:' + next], h);
    assert.ok(p.heroes.includes(next));
    assert.equal(p.gold, 0, 'no gold changes hands');
    assert.deepEqual(run(h, 900).reward.unlocks, [], 'once is enough');
  }
  assert.equal(P.nextHeroUnlock(p), null);
  assert.equal(P.unlocksNext(p, 'necromancer'), null);
});

test('a save from before keeps its heroes, and a night won brings in the next hero', () => {
  const ring = { slot: 'ring', rarity: 3, stats: { crit: 4, luck: 10, greed: 15 }, power: null, seed: 9 };
  // Version 2: the Knight bought the Ranger; the Ranger won a night but the Sorcerer was never bought.
  const old = { v: 2, gold: 50, heroes: ['knight', 'archer'], feats: { knight: 1, archer: 1 }, gear: { ring } };
  const p = P.sanitizeProfile(old);
  assert.deepEqual(p.heroes, ['knight', 'archer', 'mage']);
  assert.deepEqual(p.gear, { knight: { ring }, archer: { ring }, mage: { ring } }, 'every hero keeps a copy of the gear they shared');
  assert.notEqual(p.gear.knight.ring, p.gear.archer.ring, 'copies, not one item');
  assert.deepEqual(P.sanitizeProfile({ heroes: ['knight'], ranked: { knight: 300 } }).heroes, ['knight', 'archer'], 'five minutes in Ranked count too');
  assert.deepEqual(P.sanitizeProfile({ heroes: ['knight', 'dragon'] }).heroes, ['knight']);
});

test('the full ladder: nights survived, then the Dungeon hero by hero, then Ranked', () => {
  let p = P.defaultProfile();
  const run = (o) => {
    const r = P.applyRun(p, { time: 900, gold: 0, kills: 100, level: 30, victory: true, ...o });
    if (r.ok) p = r.profile;
    return r;
  };
  assert.deepEqual(P.nextGoal(p), { type: 'survive', hero: 'knight', unlocks: 'archer', minutes: 5 });
  assert.equal(P.canPlay(p, 'dungeon', 'knight'), false);
  assert.equal(P.canPlay(p, 'ranked', 'knight'), false);
  assert.equal(run({ mode: 'dungeon', diff: 'easy', hero: 'knight' }).ok, false, 'locked modes are refused');

  // Survival ladder: a night won is more than five minutes, so it brings in the next hero too.
  for (const [i, h] of P.HERO_ORDER.entries()) {
    const next = P.HERO_ORDER[i + 1];
    const r = run({ mode: 's15', hero: h });
    assert.deepEqual(r.reward.unlocks, [next ? 'hero:' + next : 'mode:dungeon'], h);
  }
  assert.deepEqual(P.nextGoal(p), { type: 'dungeon', hero: 'knight', unlocks: 'archer' });
  assert.ok(P.canPlay(p, 'dungeon', 'knight'));
  assert.equal(P.canPlay(p, 'dungeon', 'archer'), false, 'only the Knight enters the Dungeon at first');
  assert.equal(run({ mode: 'dungeon', diff: 'easy', hero: 'archer', time: 1200 }).ok, false);

  // Dungeon ladder: it must be a full clear.
  run({ mode: 'dungeon', diff: 'easy', hero: 'knight', time: 1200, victory: false, floor: 3 });
  assert.equal(P.canPlay(p, 'dungeon', 'archer'), false, 'dying on floor 3 is not a clear');
  for (const [i, h] of P.HERO_ORDER.slice(0, -1).entries()) {
    assert.deepEqual(P.nextGoal(p), { type: 'dungeon', hero: h, unlocks: P.HERO_ORDER[i + 1] });
    const r = run({ mode: 'dungeon', hero: h, time: 1200 });
    assert.deepEqual(r.reward.unlocks, ['dungeon:' + P.HERO_ORDER[i + 1]]);
  }
  // The Necromancer's clear opens Ranked.
  assert.deepEqual(P.nextGoal(p), { type: 'dungeon', hero: 'necromancer', unlocks: 'ranked' });
  assert.deepEqual(run({ mode: 'dungeon', hero: 'necromancer', time: 1200 }).reward.unlocks, ['mode:ranked']);
  assert.equal(P.nextGoal(p), null);
  for (const h of P.HERO_ORDER) assert.ok(P.canPlay(p, 'ranked', h), h);
});

test('ranked keeps a personal best per hero and never counts as a win', () => {
  const p = veteran();
  for (const h of P.HERO_ORDER) p.feats[h] |= P.FEAT.dungeon;
  let r = P.applyRun(p, { mode: 'ranked', diff: 'hard', hero: 'mage', victory: true, time: 1300, gold: 50, kills: 900, level: 60 });
  assert.ok(r.ok);
  assert.equal(r.run.diff, 'hard', 'one ruleset for everyone');
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
  // An Armory rank of Armor is one point of armor, which now takes a tenth off a blow
  // (Player.hurt armored): the user's "just denote that as armor +1".
  assert.equal(m.armor, 1);
  assert.equal(m.revival, 1);
  assert.equal(m.cooldown, 1);
});
