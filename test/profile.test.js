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
  Object.assign(p, { gold: 1e9, runs: 1e7, kills: 1e12, effort: 1e12, deaths: 1e7, heroes: [...P.HERO_ORDER] });
  p.best = { s15: 960, dungeon: 4, kills: 1e7, level: 999, time: 14400, gold: 1e9, bosses: 9999, combo: 1e7 };
  for (const m of P.WIN_MODES) p.wins[m] = [1e6, 1e6, 1e6];
  for (const u of P.UPGRADES) p.up[u.id] = u.max;
  // Progression (shared/progress.js): everything open, and the most a save from before was given.
  P.openEverything(p);
  p.gift = { arsenal: 3, reliquary: 3, reroll: 2, banish: 2 };
  // The Survival maps (28 October 2026): every one open (openEverything) and a night won on each on
  // every difficulty; and the five longest weapon ids left at home, as many as the slots allow.
  p.mw = 2 ** (3 * P.PROGRESS.maps.length) - 1;
  p.home = ['lightning', 'runestone', 'caltrops', 'starfall', 'lantern'];
  // The largest a legendary can be: four stats at the top of their roll, the highest seed.
  const legend = (slot) => {
    const stats = {};
    for (const id of I.POOLS[slot].slice(-4)) stats[id] = I.statRange(id, I.LEGENDARY)[1];
    return { slot, rarity: I.LEGENDARY, stats, power: 'undying', seed: 999999 };
  };
  for (const h of P.HERO_ORDER) {
    p.feats[h] = Object.values(P.FEAT).reduce((a, b) => a | b, 0); // every win's mark too
    p.ranked[h] = 14400;
    p.bt[h] = 14400; // his longest run (28 October 2026)
    p.gear[h] = Object.fromEntries(I.SLOTS.map((s) => [s, legend(s)]));
  }
  const clean = P.sanitizeProfile(p);
  assert.deepEqual([clean.mo, clean.mw, clean.deaths, clean.home.length], [2 ** P.PROGRESS.maps.length - 1, p.mw, 1e7, 5], 'every map open and won, every fall, a full home: all kept');
  assert.equal(typeof P.packProfile(clean).heroes, 'number', 'the heroes kept as bits');
  assert.ok(typeof P.packProfile(clean).ranked === 'string' && typeof P.packProfile(clean).bt === 'string', "each hero's times kept as strings");
  // His marks stay an object, as every build before reads them: one of those (a tab left open, or the
  // build put back) reads a string as no marks and writes the save again without them (packProfile).
  assert.deepEqual(P.packProfile(clean).feats, clean.feats, 'his marks kept as an object (28 October 2026)');
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

// Before the four heroes of 20 October 2026 a save kept each item as an array of numbers; nine
// heroes' gear packed that way would not fit a cookie, so each hero's is one string now. A save
// packed the old way reads back all the same, and is written the new way from then on.
test('gear packed the old way (an array an item) reads back, and the new way is a third smaller', () => {
  const legend = (slot) => {
    const stats = {};
    for (const id of I.POOLS[slot].slice(-4)) stats[id] = I.statRange(id, I.LEGENDARY)[1];
    return { slot, rarity: I.LEGENDARY, stats, power: 'titan', seed: 123456 };
  };
  const gear = Object.fromEntries(I.SLOTS.map((s) => [s, legend(s)]));
  const common = { slot: 'boots', rarity: 0, stats: { speed: 3 }, power: null, seed: 7 };
  const old = { v: 3, heroes: ['knight', 'archer'], gear: { knight: Object.fromEntries(Object.entries(gear).map(([s, it]) => [s, I.packItem(it)])), archer: { boots: I.packItem(common) } } };
  const p = P.sanitizeProfile(JSON.parse(JSON.stringify(old)));
  assert.deepEqual(p.gear, { knight: gear, archer: { boots: common } });
  const packed = P.packProfile(p);
  assert.equal(typeof packed.gear.knight, 'string');
  assert.equal(packed.gear.archer, '|||0.7.-1.0.3', 'empty slots before it kept, none after');
  assert.deepEqual(P.sanitizeProfile(JSON.parse(JSON.stringify(packed))).gear, p.gear, 'and back');
  assert.ok(JSON.stringify(packed.gear.knight).length < JSON.stringify(old.gear.knight).length * 0.67);
  // Garbage in a packed string is no item, and spoils nothing else.
  for (const bad of ['zzzz', '4.lfls.9.0.1', '|||x.y', 'a'.repeat(700), '4.lfls.2.0.99999']) {
    assert.deepEqual(I.sanitizeGear(bad), {}, bad.slice(0, 20));
  }
  assert.deepEqual(I.sanitizeGear('|||0.7.-1.0.3|junk'), { boots: common });
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
  // A night's report names its Survival map since 28 October 2026 (ui/gamescreen.js submit): one
  // of the longest of their ids.
  const report = { mode: 's15', map: 'meadow', diff: 'hard', hero: 'necromancer', victory: true, time: 960, gold: 1e9, kills: 1e12, level: 999, floor: 3, gear, realTime: 7200, found: 1e9 };
  const run = P.sanitizeRun(report);
  assert.equal(run.map, 'meadow');
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
  assert.equal(r.reward.wage, 675); // 900 s * 0.5 * 1.5 (shared/progress.js wage)
  assert.equal(r.profile.gold, 1775);
  assert.equal(r.profile.wins.s15[2], 1);
  assert.equal(r.profile.best.s15, 900);

  const cheat = P.applyRun(p, { mode: 's15', diff: 'easy', victory: false, time: 10, gold: 1e9, kills: 1e9 });
  const tenSeconds = P.goldCap({ mode: 's15', time: 10, realTime: 10, found: 0 }, 1);
  assert.ok(tenSeconds < 2000, `ten seconds could pick up ${tenSeconds}`);
  assert.ok(cheat.profile.gold <= Math.round(tenSeconds * P.DIFF_GOLD.easy) + Math.round(10 * P.PROGRESS.wage * P.DIFF_GOLD.easy), 'gold is capped by run time');
  assert.ok(cheat.profile.kills <= 50 + 10 * 240);
  assert.ok(cheat.profile.effort <= 50 + 10 * 240, "and they count as no more than Veteran's horde could give");
  assert.equal(P.sanitizeRun({ mode: 's15', time: 900, realTime: 900, gold: 30000 }).gold, 30000, 'a greedy night keeps its gold');
  assert.equal(P.applyRun(P.defaultProfile(), { mode: 's15', diff: 'medium', time: 10, gold: 1e9 }).reward.gold, P.goldCap({ mode: 's15', time: 10, realTime: 10, found: 0 }, 1), 'the reward says what was credited');

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
  assert.equal(p.wins.dungeon[1], 1, 'a Veteran win');
});

// The user: "let us have veteran + normal. Elite is the current setup and normal is that all
// the monsters have their damage cause reduced by 50% and the number of ranged monsters spawn +
// wolver + any other monsters that lunges is reduced to 1/3".
test('a Veteran run pays gold as the old Medium, an Elite one as the old Hard; Ranked is always Elite', () => {
  const p = veteran();
  const normal = P.applyRun(p, { mode: 's15', diff: 'medium', victory: true, time: 900, gold: 100 });
  assert.equal(normal.run.diff, 'medium');
  assert.deepEqual([normal.reward.collected, normal.reward.bonus, normal.reward.multiplier], [100, 300, 1]);
  assert.equal(normal.profile.wins.s15[1], 1);
  assert.ok(P.hasFeat(normal.profile, 'knight', P.FEAT.survivalHard), 'a night survived on Veteran counts on the ladder');
  const vet = P.applyRun(p, { mode: 's15', diff: 'hard', victory: true, time: 900, gold: 100 });
  assert.deepEqual([vet.reward.collected, vet.reward.bonus, vet.reward.multiplier], [150, 500, 1.5]);
  assert.equal(vet.profile.wins.s15[2], 1);
  p.feats.necromancer |= P.FEAT.dungeon; // Ranked open
  const ranked = P.applyRun(p, { mode: 'ranked', diff: 'medium', hero: 'knight', time: 300, gold: 10 });
  assert.equal(ranked.ok, true);
  assert.equal(ranked.run.diff, 'hard', 'Ranked keeps one best per hero, so it is always Elite');
  assert.equal(P.applyRun(p, { mode: 'ranked', hero: 'knight', time: 300 }).run.diff, 'hard');
});

// Elite pays half as much again, so a report that doesn't say it was one is never paid as one.
test('a run that names no difficulty, or one the game no longer has, is paid as Veteran', () => {
  const p = veteran();
  for (const diff of [undefined, null, 'EASY', 'HARD', 7]) {
    const r = P.applyRun(p, { mode: 's15', diff, victory: true, time: 900, gold: 100 });
    assert.equal(r.run.diff, 'medium', String(diff));
    assert.deepEqual([r.reward.collected, r.reward.bonus, r.reward.multiplier], [100, 300, 1], String(diff));
    assert.equal(r.profile.wins.s15[1], 1, 'a Veteran win');
  }
});

// The owner's (23 October 2026): a new, easier Normal under Veteran and Elite. It is recorded as the
// old Easy, paid as that was (x0.75, a victory bonus of x1), and Ranked is still Elite.
test('a Normal run is recorded as the old Easy and paid as it was', () => {
  const r = P.applyRun(veteran(), { mode: 's15', diff: 'easy', victory: true, time: 900, gold: 100 });
  assert.equal(r.run.diff, 'easy');
  assert.deepEqual([r.reward.collected, r.reward.bonus, r.reward.multiplier], [75, 200, P.DIFF_GOLD.easy]);
  assert.equal(r.profile.wins.s15[0], 1, 'a Normal win');
  assert.equal(P.sanitizeRun({ mode: 'ranked', diff: 'easy' }).diff, 'hard', 'Ranked is always Elite');
  assert.equal(P.sanitizeRun({ mode: 's15', diff: 'easy', nightmare: true }).nightmare, false, 'never a Nightmare');
});

test('buying and refunding upgrades', () => {
  let p = P.defaultProfile();
  assert.equal(P.buyUpgrade(p, 'might').ok, false);
  p.gold = 1000;
  let r = P.buyUpgrade(p, 'might');
  assert.ok(r.ok);
  assert.equal(r.profile.up.might, 1);
  assert.equal(r.profile.gold, 925, 'the first rank at half price');
  r = P.buyUpgrade(r.profile, 'might');
  assert.equal(r.profile.up.might, 2);
  assert.equal(r.profile.gold, 625); // second rank costs 300
  const refund = P.refundUpgrades(r.profile);
  assert.equal(refund.refunded, 375);
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
    assert.equal(r.reward.collected + r.reward.bonus, 0, 'no gold changes hands (but the wage for the time)');
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

test('the extras wait their turn in the next goal: the ladder, the Dungeon and Ranked come first', () => {
  const p = P.sanitizeProfile({ heroes: [...P.LADDER] });
  assert.deepEqual(P.nextGoal(p), { type: 'survivalHard', hero: 'necromancer', unlocks: 'dungeon' }, 'the Paladin is not the next goal');
  for (const h of P.LADDER) p.feats[h] = P.FEAT.survivalHard | P.FEAT.dungeon;
  // (A night won with the Necromancer has brought the Paladin in already.)
  assert.deepEqual(P.nextGoal(P.sanitizeProfile(p)), { type: 'survive', hero: 'paladin', unlocks: 'druid', minutes: 5 }, 'then the extras, one by one');
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

  // Survival ladder: a night won is more than five minutes, so it brings in the next hero too; the
  // Necromancer's opens the Dungeon as well. The four after him are extras: nothing waits on them.
  for (const [i, h] of P.HERO_ORDER.entries()) {
    const next = P.HERO_ORDER[i + 1];
    const r = run({ mode: 's15', hero: h });
    const want = [...(next ? ['hero:' + next] : []), ...(h === 'necromancer' ? ['mode:dungeon'] : [])];
    assert.deepEqual(r.reward.unlocks, want, h);
  }
  assert.deepEqual(P.LADDER, ['knight', 'archer', 'mage', 'rogue', 'necromancer']);
  assert.deepEqual(P.nextGoal(p), { type: 'dungeon', hero: 'knight', unlocks: 'archer' });
  for (const h of P.HERO_ORDER.slice(5)) assert.ok(P.canPlay(p, 'dungeon', h), `${h}, an extra, goes down as soon as it opens`);
  assert.ok(P.canPlay(p, 'dungeon', 'knight'));
  assert.equal(P.canPlay(p, 'dungeon', 'archer'), false, 'only the Knight enters the Dungeon at first');
  assert.equal(run({ mode: 'dungeon', diff: 'easy', hero: 'archer', time: 1200 }).ok, false);

  // Dungeon ladder: it must be a full clear.
  run({ mode: 'dungeon', diff: 'easy', hero: 'knight', time: 1200, victory: false, floor: 3 });
  assert.equal(P.canPlay(p, 'dungeon', 'archer'), false, 'dying on floor 3 is not a clear');
  for (const [i, h] of P.LADDER.slice(0, -1).entries()) {
    assert.deepEqual(P.nextGoal(p), { type: 'dungeon', hero: h, unlocks: P.LADDER[i + 1] });
    const r = run({ mode: 'dungeon', hero: h, time: 1200 });
    assert.deepEqual(r.reward.unlocks, ['dungeon:' + P.LADDER[i + 1]]);
  }
  // An extra's clear is a win like any other, and brings nothing in.
  assert.deepEqual(run({ mode: 'dungeon', hero: 'paladin', time: 1200 }).reward.unlocks, []);
  assert.ok(P.hasFeat(p, 'paladin', P.FEAT.dungeon));
  // The Necromancer's clear opens Ranked.
  assert.deepEqual(P.nextGoal(p), { type: 'dungeon', hero: 'necromancer', unlocks: 'ranked' });
  assert.deepEqual(run({ mode: 'dungeon', hero: 'necromancer', time: 1200 }).reward.unlocks, ['mode:ranked']);
  // Ranked is always Elite: one night won on Elite first (the 27 October 2026 review, D10).
  assert.deepEqual(P.nextGoal(p), { type: 'elite' }, 'one night on Elite first: Ranked is always Elite');
  run({ mode: 's15', diff: 'hard', hero: 'knight' });
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

// The marks of a win by difficulty (27 October 2026), for the hero and trial cards only: a night or
// a Dungeon Run won on Veteran, on Elite, in a Nightmare (which marks Elite too). Normal's win
// keeps only the any-win star.
test('a win marks its difficulty on the hero: Veteran, Elite, and a Nightmare as Elite too', () => {
  const p = P.defaultProfile();
  p.feats.necromancer = P.FEAT.survivalHard; // the Dungeon open, as a night won with him opens it
  let r = P.applyRun(p, { mode: 's15', diff: 'hard', nightmare: true, hero: 'knight', victory: true, time: 900, gold: 0 });
  assert.ok(r.ok);
  const has = (bit, hero = 'knight') => P.hasFeat(r.profile, hero, bit);
  assert.ok(has(P.FEAT.nightElite) && has(P.FEAT.nightNightmare), 'Elite and its Nightmare');
  assert.ok(!has(P.FEAT.nightVeteran), 'not Veteran');
  r = P.applyRun(r.profile, { mode: 'dungeon', diff: 'medium', hero: 'knight', victory: true, time: 1200, floor: 3, gold: 0 });
  assert.ok(r.ok);
  assert.ok(has(P.FEAT.dungeonVeteran) && has(P.FEAT.dungeon), 'the Dungeon on Veteran');
  assert.ok(!has(P.FEAT.dungeonElite));
  r = P.applyRun(r.profile, { mode: 's15', diff: 'easy', hero: 'archer', victory: true, time: 900, gold: 0 });
  assert.ok(r.ok);
  assert.equal(r.profile.feats.archer, P.FEAT.survivalHard, 'a Normal win: the any-win star alone');
  assert.equal(P.sanitizeProfile({ feats: { knight: 1023 } }).feats.knight, 1023, 'every mark kept');
  assert.deepEqual(P.sanitizeProfile({ feats: 'sf..1' }).feats, { knight: 1023, mage: 1 }, 'and read back packed as the times are (perHero)');
});

// Each hero's longest run on the clock, in any mode (28 October 2026, the review's C4): the hero
// screen, the results' NEXT bar and the Codex's ultimate bars. A save from before has his Ranked best
// for it; the cookie keeps both lists as strings, and an object from before reads back too.
test("each hero's longest run is kept, from any mode, and read back from the cookie", () => {
  let p = P.applyRun(P.defaultProfile(), { mode: 's15', diff: 'medium', hero: 'knight', time: 271, gold: 0 }).profile;
  assert.equal(p.bt.knight, 271);
  p = P.applyRun(p, { mode: 's15', diff: 'medium', hero: 'knight', time: 100, gold: 0 }).profile;
  assert.equal(p.bt.knight, 271, 'a shorter run keeps it');
  assert.equal(P.sanitizeProfile({ v: 4, heroes: ['knight', 'archer'], ranked: { archer: 400 } }).bt.archer, 400, 'a Ranked best of before');
  assert.equal(typeof P.packProfile(p).bt, 'string');
  assert.deepEqual(P.sanitizeProfile(JSON.parse(JSON.stringify(P.packProfile(p)))).bt, p.bt, 'and back');
  // The Codex's ultimate bar fills with it.
  const half = P.applyRun(P.defaultProfile(), { mode: 's15', diff: 'medium', hero: 'knight', time: 60, gold: 0 }).profile;
  assert.equal(P.progressList(half).find((e) => e.type === 'ult' && e.id === 'knight').progress, 0.5);
});

// The longest kill streak a run has made (28 October 2026, the review's C8a), for the results'
// NEW BEST: never more than the run's kills.
test("the best combo is kept, a run's no more than its kills", () => {
  let p = P.applyRun(P.defaultProfile(), { mode: 's15', diff: 'medium', time: 120, kills: 40, combo: 999, level: 3 }).profile;
  assert.equal(p.best.combo, 40);
  p = P.applyRun(p, { mode: 's15', diff: 'medium', time: 120, kills: 40, combo: 12, level: 3 }).profile;
  assert.equal(p.best.combo, 40, 'a lesser one keeps it');
  assert.equal(P.sanitizeProfile(JSON.parse(JSON.stringify(P.packProfile(p)))).best.combo, 40, 'read back');
});

// The Survival maps (the owner's, 28 October 2026): "the first one where we start is the desert map.
// From there on, we progress to the frozen map. From there on, we progress to our current forest
// map. And from there on, we progress to the demonic map", the bright flower meadow between the
// frozen map and the forest. A night won on one, on any difficulty, opens the next, and the results
// tell it (reward.unlocks 'map:<id>').
const opened = (p) => P.PROGRESS.mapLadder.filter((m) => P.mapOpen(p, m));
const mapBit = (p, m, d) => Math.floor(p.mw / 2 ** (3 * P.PROGRESS.maps.indexOf(m) + d)) % 2 === 1;
const mapNews = (r) => r.reward.unlocks.filter((k) => k.startsWith('map:'));

test('a new save opens only the desert, and a night won on each map opens the next', () => {
  assert.deepEqual(P.PROGRESS.mapLadder, ['desert', 'frozen', 'meadow', 'forest', 'hell']);
  let p = P.defaultProfile();
  assert.deepEqual(opened(p), ['desert'], 'the desert alone');
  assert.deepEqual(opened(P.sanitizeProfile({})), ['desert'], 'and from a save of nothing');
  const night = (map, o = {}) => {
    const r = P.applyRun(p, { mode: 's15', map, diff: 'easy', hero: 'knight', victory: true, time: 900, gold: 0, kills: 100, level: 20, ...o });
    assert.ok(r.ok, `${map}: never refused`);
    p = r.profile;
    return r;
  };
  // A night lost opens nothing, however long it lasted.
  assert.deepEqual(mapNews(night('desert', { victory: false, time: 890 })), []);
  assert.deepEqual(opened(p), ['desert']);
  const ladder = P.PROGRESS.mapLadder;
  ladder.forEach((m, k) => {
    const next = ladder[k + 1];
    assert.deepEqual(mapNews(night(m)), next ? ['map:' + next] : [], `a night won on ${m}`);
    assert.ok(P.mapWon(p, m), m);
    assert.deepEqual(opened(p), ladder.slice(0, k + 2));
  });
  assert.deepEqual(mapNews(night('desert')), [], 'once is enough');
  // Kept by the cookie, as packed and read back.
  assert.deepEqual(P.sanitizeProfile(JSON.parse(JSON.stringify(P.packProfile(p)))), p);
  // A night is marked on its difficulty, a Nightmare's as Elite's (as its win is counted).
  const dread = P.applyRun(P.defaultProfile(), { mode: 's15', map: 'desert', diff: 'hard', nightmare: true, hero: 'knight', victory: true, time: 900, gold: 0 });
  assert.deepEqual([0, 1, 2].map((d) => mapBit(dread.profile, 'desert', d)), [false, false, true]);
  assert.deepEqual(mapNews(dread), ['map:frozen']);
});

// A run is never refused for its map: one without a map (the tests, the bots, an older client) or
// on a map still shut is paid and counted as ever, but marks no map and opens none.
test('a run without a map, or on a map still shut, is never refused and opens no map', () => {
  const won = { mode: 's15', diff: 'medium', hero: 'knight', victory: true, time: 900, gold: 100, kills: 100, level: 20 };
  for (const map of [undefined, null, 'forest', 'hell', 'nope', 'toString', 7]) {
    const r = P.applyRun(P.defaultProfile(), { ...won, map });
    assert.ok(r.ok, String(map));
    assert.equal(r.profile.wins.s15[1], 1, `${String(map)}: the night won all the same`);
    assert.deepEqual([r.reward.collected, r.reward.bonus], [100, 300], `${String(map)}: and paid as ever`);
    assert.equal(r.profile.mw, 0, `${String(map)}: but no map's`);
    assert.deepEqual(opened(r.profile), ['desert']);
    assert.deepEqual(mapNews(r), []);
  }
  // Only Survival's, and only a map there is.
  assert.equal(P.sanitizeRun({ mode: 's15', map: 'frozen' }).map, 'frozen');
  for (const map of [undefined, 'toString', 'Frozen']) assert.equal(P.sanitizeRun({ mode: 's15', map }).map, null, String(map));
  for (const mode of ['dungeon', 'ranked']) assert.equal(P.sanitizeRun({ mode, map: 'desert' }).map, null, `${mode} keeps to the Darkwood`);
  // The debug address and the bots have every map open (openEverything), none of them won.
  const all = P.openEverything(P.defaultProfile());
  assert.deepEqual(opened(all), P.PROGRESS.mapLadder);
  assert.equal(all.mw, 0);
});

// A save from before the maps played every night in the Darkwood (28 October 2026): it keeps the
// Darkwood and every map before it, and its nights won are the Darkwood's, which opens the Abyss.
test('a save from before the maps keeps the Darkwood and the maps before it; its nights won open the Abyss', () => {
  const played = P.sanitizeProfile({ v: 4, runs: 3, heroes: ['knight'] });
  assert.deepEqual(opened(played), ['desert', 'frozen', 'meadow', 'forest']);
  assert.equal(played.mw, 0);
  const won = P.sanitizeProfile({ v: 4, runs: 12, heroes: ['knight', 'archer'], wins: { s15: [0, 2, 1], dungeon: [0, 0, 0] } });
  assert.deepEqual(opened(won), P.PROGRESS.mapLadder, 'the Abyss too');
  assert.deepEqual([0, 1, 2].map((d) => mapBit(won, 'forest', d)), [false, true, true], 'its nights the Darkwood\'s, on their difficulties');
  assert.ok(!P.mapWon(won, 'desert'));
  assert.deepEqual(opened(P.sanitizeProfile({ v: 4, gold: 50 })), ['desert'], 'one that never played starts in the desert');
  // Once: read back, nothing more; its next run tells no map as new.
  assert.deepEqual(P.sanitizeProfile(JSON.parse(JSON.stringify(P.packProfile(won)))), won);
  assert.deepEqual(P.sanitizeProfile(JSON.parse(JSON.stringify(P.packProfile(played)))), played);
  assert.deepEqual(mapNews(P.applyRun(played, { mode: 's15', diff: 'medium', hero: 'knight', time: 100, gold: 0 })), []);
  // A night won in the Darkwood now opens the Abyss, as a new save's would.
  const dawn = P.applyRun(played, { mode: 's15', map: 'forest', diff: 'medium', hero: 'knight', victory: true, time: 900, gold: 0 });
  assert.deepEqual(mapNews(dawn), ['map:hell']);
});

// The Abyss sends more monsters than the Darkwood (data/maps.js foe.horde): its caps allow that many
// more kills, and the more gold of their coins; every other map's are the Darkwood's.
test("a map's caps allow its horde: the Abyss's more kills and gold, the others' as the Darkwood's", async () => {
  const { MAPS } = await import('../public/js/data/maps.js');
  const run = { mode: 's15', time: 900, realTime: 900, found: 0 };
  const base = P.goldCap(run, 1), slain = (map) => P.sanitizeRun({ ...run, map, kills: 1e9 }).kills;
  const counted = (map) => P.countedKills(1e9, 900, 'easy', false, map);
  for (const [id, m] of Object.entries(MAPS)) {
    const cap = P.goldCap({ ...run, map: id }, 1), more = Math.max(1, m.foe.horde);
    assert.ok(cap - 100 >= Math.floor((base - 100) * more) - 1, `${id}: ${cap} gold for a horde of x${m.foe.horde}`);
    assert.ok(slain(id) - 50 >= Math.floor((slain() - 50) * more) - 1, `${id}: ${slain(id)} slain`);
    assert.ok(counted(id) - 50 >= Math.floor((counted() - 50) * more) - 1, `${id}: ${counted(id)} counted`);
    if (m.foe.horde <= 1) assert.deepEqual([cap, slain(id), counted(id)], [base, slain(), counted()], `${id}: as the Darkwood's`);
  }
  assert.ok(P.goldCap({ ...run, map: 'hell' }, 1) > base && slain('hell') > slain() && counted('hell') > counted());
  assert.equal(slain(), 50 + 900 * 240, 'a run without a map as ever');
  assert.equal(P.sanitizeRun({ ...run, map: 'hell', gold: 1e9 }).gold, P.goldCap({ ...run, map: 'hell' }), "a report's gold held to it");
  // Only on a save with the Abyss open (applyRun): one from it on a save that has it shut, which marks
  // no map, is held to the Darkwood's caps, as no night that save could play sent more.
  const forged = { ...run, map: 'hell', diff: 'easy', hero: 'knight', gold: 1e9, kills: 1e9 };
  const shut = P.applyRun(P.defaultProfile(), forged), open = P.applyRun(P.openEverything(P.defaultProfile()), forged);
  assert.deepEqual([shut.run.gold, shut.run.kills, shut.profile.effort], [base, slain(), counted()], "shut: the Darkwood's");
  assert.deepEqual([open.run.gold, open.run.kills, open.profile.effort], [P.goldCap({ ...run, map: 'hell' }, 1), slain('hell'), counted('hell')], "open: the Abyss's");
});
