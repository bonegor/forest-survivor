// Progression (shared/progress.js). The owner, 21 October 2026: "make everything as progression
// based as possible... lock as much as possible initially and progress through the game... the
// player doesn't start with 6 but starts with fewer, and additionally also weapon types". Slots and
// power are bought in the Armory; weapons, relics and ultimates open by milestones.
import test from 'node:test';
import assert from 'node:assert/strict';
import { playGame } from '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { HEROES, SHARED_WEAPONS } from '../public/js/data/heroes.js';
import { PASSIVE_IDS } from '../public/js/data/passives.js';
import { WEAPONS } from '../public/js/data/weapons.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { unlockEverything } from '../public/js/engine/storage.js';
import { createServer } from '../server.js';
import * as P from '../public/js/shared/profile.js';
import { DIFFS, VETERAN, NIGHTMARE } from '../public/js/data/difficulty.js';

const { PROGRESS } = P;
const LOCKS = PROGRESS.locks;
// A report of a run that reaches nothing, to build each milestone's on.
const RUN = { mode: 's15', diff: 'medium', hero: 'knight', victory: false, time: 60, realTime: 60, gold: 0, kills: 10, level: 2, bosses: 0, floor: 1 };

// A Game as a profile would start it (ui/gamescreen.js), its random seeded.
function game(fn, profile = P.defaultProfile(), hero = 'knight') {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(5);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero, mode: 's15', meta: P.metaBonuses(profile), open: P.openFor(profile, hero), settings: { numbers: false }, crypts: false });
    g.player.devGod = true;
    g.spawner.update = () => {};
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    input.endFrame();
    Math.random = oldRandom;
  }
}

test('the table covers every shared weapon and relic exactly once, and fits its bits', () => {
  const weapons = [...PROGRESS.openWeapons, ...LOCKS.filter((l) => l.type === 'weapon').map((l) => l.id)];
  const relics = [...PROGRESS.openRelics, ...LOCKS.filter((l) => l.type === 'relic').map((l) => l.id)];
  assert.deepEqual([...weapons].sort(), [...SHARED_WEAPONS].sort());
  assert.deepEqual([...relics].sort(), [...PASSIVE_IDS].sort());
  assert.ok(LOCKS.length <= 50, 'the save keeps them as the bits of one number, safe to 53');
  for (const l of LOCKS) if (!l.retired) assert.ok(P.needText(l), l.id);
  assert.equal(P.needText(LOCKS[0]), 'Survive 1:00 in one run');
  assert.equal(P.needText(LOCKS[1]), 'Slay 1,000 monsters, counted as on Veteran');
});

test('a fresh profile: three weapon and relic slots, no rerolls or banishes, the starters open and no ultimate', () => {
  const p = P.defaultProfile();
  const m = P.metaBonuses(p);
  assert.deepEqual([m.weaponSlots, m.relicSlots, m.reroll, m.banish], [3, 3, 0, 0]);
  const open = P.openFor(p, 'knight');
  assert.deepEqual(open, { weapons: ['axe', 'blades', 'glaive', 'caltrops'], relics: ['might', 'armor', 'vitality', 'regen', 'magnet', 'movespeed'], ult: false, evos: [] }, 'and no evolution made yet, so no recipe known (the 27 October 2026 review, D3)');
  const list = P.progressList(p);
  assert.equal(list.filter((l) => l.open).length, 10, 'the ten starters');
  assert.ok(list.filter((l) => !l.start).every((l) => !l.open && l.progress === 0 && l.need));
  assert.equal(list.filter((l) => l.type === 'ult').length, P.HERO_ORDER.length);
  game((g, pl) => {
    assert.deepEqual([g.maxWeapons, g.maxRelics, pl.rerolls, pl.banishes, pl.ultLocked], [3, 3, 0, 0, true]);
  });
});

test('each milestone opens from a run report: just short of it nothing, at it the one', () => {
  const stats = { time: 'time', level: 'level', gold: 'gold', bosses: 'bosses' };
  for (const [i, l] of LOCKS.entries()) {
    if (l.retired || l.need === 'kills' || l.need === 'wins' || l.need === 'evolve' || l.need === 'evolution' || l.need === 'deaths' || l.deep) continue; // the second circle: its own test
    const k = stats[l.need];
    // Long enough a run for whatever it reports to stand (sanitizeRun's bounds).
    const base = { ...RUN, time: l.need === 'time' ? l.at - 1 : 60, realTime: 600 };
    const short = P.applyRun(P.defaultProfile(), { ...base, [k]: l.need === 'time' ? l.at - 1 : l.at - 1 });
    assert.ok(!short.reward.unlocked.some((u) => u.id === l.id), `${l.id} not yet`);
    const at = P.applyRun(P.defaultProfile(), { ...base, [k]: l.at });
    assert.ok(at.reward.unlocked.some((u) => u.type === l.type && u.id === l.id && u.need === P.needText(l)), `${l.id} at ${l.at}`);
    assert.ok(Math.floor(at.profile.ul / 2 ** i) % 2 === 1);
    const open = P.openFor(at.profile, 'knight');
    assert.ok((l.type === 'weapon' ? open.weapons : open.relics).includes(l.id));
  }
  // Kills count over all runs together: two runs of 600 open what 1,000 opens.
  let p = P.defaultProfile();
  p = P.applyRun(p, { ...RUN, time: 100, kills: 600 }).profile;
  assert.ok(!P.openFor(p, 'knight').weapons.includes('lightning'));
  const second = P.applyRun(p, { ...RUN, time: 100, kills: 600 });
  assert.deepEqual(second.reward.unlocked.map((u) => u.id), ['lightning']);
  // The Knight's Longsword evolved puts the Phoenix Heart up for sale in the Armory; a night won
  // no longer does, nor another hero's signature evolved, nor a claim in the first two minutes.
  const night = P.applyRun(P.defaultProfile(), { ...RUN, victory: true, time: 900, realTime: 900 });
  assert.ok(!night.reward.unlocked.some((u) => u.id === 'phoenix'));
  assert.ok(!P.applyRun(P.defaultProfile(), { ...RUN, hero: 'knight', time: 119, evolved: true }).reward.unlocked.some((u) => u.id === 'phoenix'));
  const evolved = P.applyRun(P.defaultProfile(), { ...RUN, time: 300, realTime: 300, evolved: true });
  assert.deepEqual(evolved.reward.unlocked.filter((u) => u.id === 'phoenix'), [{ type: 'relic', id: 'phoenix', need: "Evolve the Knight's Longsword", buy: true }]);
  let ph = { ...evolved.profile, gold: 5000 };
  assert.ok(!P.openFor(ph, 'archer').relics.includes('phoenix'), 'not until bought');
  assert.equal(P.progressList(ph).find((l) => l.id === 'phoenix').need, 'For sale in the Armory');
  assert.equal(P.buyUpgrade(P.defaultProfile(), 'phoenix').error, 'Not yet for sale');
  ph = P.buyUpgrade(ph, 'phoenix').profile;
  assert.ok(P.openFor(ph, 'archer').relics.includes('phoenix') && P.openFor(ph, 'knight').relics.includes('phoenix'), 'then for every hero');
  // A report claiming more bosses than its time allows is held to it.
  assert.equal(P.sanitizeRun({ ...RUN, time: 60, realTime: 60, bosses: 1e6 }).bosses, 3 + 1 + 4 * 2);
});

test('the server keeps the milestones a run reached, and the ultimate of the hero who lasted two minutes', async () => {
  const server = createServer({ secret: 'progress-test-'.padEnd(40, 'x'), devKey: '' });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  const post = async (path, body) => {
    const res = await fetch(base + path, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    for (const c of res.headers.getSetCookie()) cookie = c.split(';')[0];
    return res.json();
  };
  try {
    let data = await post('/api/run', { ...RUN, time: 59, level: 10 });
    assert.deepEqual(data.reward.unlocked, [{ type: 'weapon', id: 'flask', need: 'Reach level 10' }]);
    data = await post('/api/run', { ...RUN, time: 119, kills: 100 });
    assert.deepEqual(data.reward.unlocked.map((u) => u.type + ':' + u.id), ['weapon:frost']);
    assert.equal(P.openFor(data.profile, 'knight').ult, false, '1:59 is not enough');
    data = await post('/api/run', { ...RUN, time: 200 });
    assert.deepEqual(data.reward.unlocked.map((u) => u.type + ':' + u.id), ['ult:knight']);
    data = await (await fetch(base + '/api/state', { headers: { cookie } })).json();
    const open = P.openFor(data.profile, 'knight');
    assert.ok(open.ult && open.weapons.includes('frost') && open.weapons.includes('flask'), 'kept in the sealed cookie');
    assert.equal(P.openFor(data.profile, 'archer').ult, false, 'the Knight\'s alone');
    // A forged save is sanitized: no bits beyond the table's.
    data = await post('/api/run', { ...RUN, time: 10, bosses: 'lots', level: 'x' });
    assert.ok(data.profile.ul < 2 ** LOCKS.length);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('nothing locked is ever offered, at a level-up or in a chest; his own signature always is', () => {
  const p = P.defaultProfile();
  p.up.arsenal = 3;
  p.up.reliquary = 3;
  for (const hero of ['knight', 'necromancer']) {
    game((g, pl) => {
      const open = P.openFor(p, hero);
      const ok = (c) => c.type === 'weapon' ? pl.hero.unique.includes(c.id) || open.weapons.includes(c.id) : c.type === 'passive' ? open.relics.includes(c.id) : true;
      const seen = new Set();
      for (let i = 0; i < 300; i++) {
        for (const c of g.levelChoices(4)) {
          assert.ok(ok(c), `${hero}: ${c.type} ${c.id} offered`);
          seen.add(c.id);
        }
        const chest = g.rollChest('boss');
        for (const c of chest.items) {
          assert.ok(c.type === 'evolve' || ok(c), `${hero}: ${c.type} ${c.id} in a chest`);
          seen.add(c.id);
        }
      }
      // And everything open does come (or is held, evolved maybe).
      for (const id of open.weapons) assert.ok(seen.has(id) || g.ownsWeapon(id), `${id} is offered`);
      for (const id of open.relics) assert.ok(seen.has(id) || pl.passives.has(id), `${id} is offered`);
      // A card naming a locked one, however it came, gives nothing.
      const before = pl.weapons.length;
      g.applyChoice({ type: 'weapon', id: 'arcane', level: 1, isNew: true });
      g.applyChoice({ type: 'passive', id: 'phoenix', level: 1, isNew: true });
      assert.ok(pl.weapons.length <= before && !pl.weapons.some((w) => w.id === 'arcane') && !pl.passives.has('phoenix'));
    }, p, hero);
  }
  // Without a profile's locks (the tests, the bots by default) everything is as before.
  const all = new Game({ hero: 'knight', mode: 's15', meta: P.metaBonuses(P.defaultProfile()), settings: {}, crypts: false });
  assert.ok(all.weaponOpen('caltrops') && all.relicOpen('phoenix') && !all.player.ultLocked);
});

test('weapon and relic slots come from the Armory: three, one more a rank of Arsenal or Reliquary', () => {
  for (const ranks of [0, 1, 3]) {
    const p = P.defaultProfile();
    P.openEverything(p);
    p.up.arsenal = ranks;
    p.up.reliquary = ranks;
    game((g, pl) => {
      assert.deepEqual([g.maxWeapons, g.maxRelics], [3 + ranks, 3 + ranks]);
      for (const id of SHARED_WEAPONS) g.applyChoice({ type: 'weapon', id, level: 1, isNew: true });
      for (const id of PASSIVE_IDS) if (id !== 'phoenix') g.applyChoice({ type: 'passive', id, level: 1, isNew: true });
      assert.equal(pl.weapons.length, 3 + ranks);
      assert.equal(pl.passives.size, 3 + ranks);
      assert.ok(!g.upgradePool().some((c) => c.isNew), 'no new weapon or relic offered with the slots full');
    }, p);
  }
  const u = P.UPGRADES.filter((x) => x.id === 'arsenal' || x.id === 'reliquary').map((x) => [x.name, x.desc, x.max, x.cost]);
  assert.deepEqual(u, [['Arsenal', '+1 weapon slot', 3, 400], ['Reliquary', '+1 relic slot', 3, 300]]);
});

test('the ultimate is locked until a run with the hero lasts two minutes: no fury, no ultimate', () => {
  game((g, p) => {
    g.player.weapons.length = 0;
    g.update(1 / 60);
    p.addFury(100);
    assert.equal(p.fury, 0, 'the orb stays empty');
    p.fury = 100; // however it came
    input.justDown.add('Space');
    g.update(1 / 60);
    input.endFrame();
    assert.ok(!g.ultLaunch && !p.ult, 'the key does nothing');
  });
  const p = P.applyRun(P.defaultProfile(), { ...RUN, time: PROGRESS.ultTime }).profile;
  game((g, pl) => {
    assert.equal(pl.ultLocked, false);
    pl.addFury(100);
    assert.equal(pl.fury, 100);
  }, p);
});

// The ranks the gold in hand buys (the results' line, the title's coin on UPGRADES: 28 October 2026):
// of what is for sale only, so never the Phoenix Heart before its milestone.
// Counted from the table (28 October 2026), so a retuned price or a new upgrade leaves it standing.
test('the gold in hand buys ranks of what is for sale, the Phoenix Heart only once it is', () => {
  const heart = P.UPGRADES.find((u) => u.id === 'phoenix');
  const forSale = (p) => P.UPGRADES.filter((u) => P.upgradeOpen(p, u) && P.upgradeCost(u.id, 0) <= p.gold).length;
  const p = P.defaultProfile();
  p.gold = 1e6;
  assert.ok(!P.upgradeOpen(p, heart), 'the Phoenix Heart not yet for sale');
  assert.equal(P.affordableRanks(p), forSale(p), 'every first rank for sale, the Phoenix Heart not among them');
  assert.ok(P.affordableRanks(p) < P.UPGRADES.length);
  // One at its top is no longer counted.
  const top = P.UPGRADES.find((u) => !u.lock);
  assert.equal(P.affordableRanks({ ...p, up: { ...p.up, [top.id]: top.max } }), forSale(p) - 1, 'none past its top');
  p.gold = 260;
  assert.equal(P.affordableRanks(p), forSale(p));
  p.gold = 0;
  assert.equal(P.affordableRanks(p), 0);
  // The Knight's Longsword evolved puts it up for sale: then it counts.
  const q = { ...P.applyRun(P.defaultProfile(), { ...RUN, time: 300, realTime: 300, evolved: true }).profile, gold: 1e6 };
  assert.ok(P.upgradeOpen(q, heart), 'for sale now');
  assert.equal(P.affordableRanks(q), forSale(q), 'the Phoenix Heart among them');
});

test('a run pays a wage for its time at the difficulty\'s rate, and every first Armory rank is half price', () => {
  const r = P.runReward(P.sanitizeRun({ ...RUN, diff: 'hard', time: 600, realTime: 600, gold: 100 }));
  assert.deepEqual([r.collected, r.wage, r.total], [150, 600 * 0.5 * 1.5, 150 + 450]);
  const dread = P.runReward(P.sanitizeRun({ ...RUN, diff: 'hard', nightmare: true, time: 600, realTime: 600 }));
  assert.equal(dread.wage, Math.round(600 * 0.5 * 1.5 * 1.5), 'a Nightmare\'s rate too');
  assert.equal(P.runReward(P.sanitizeRun({ ...RUN, time: 1e9 })).wage, 16 * 60 * 0.5, 'no more than the longest night');
  for (const u of P.UPGRADES) {
    assert.equal(P.upgradeCost(u.id, 0), Math.round(u.cost / 2), u.id);
    if (u.max > 1) assert.equal(P.upgradeCost(u.id, 1), u.cost * 2, u.id);
  }
  assert.deepEqual([0, 1, 2].map((r) => P.upgradeCost('arsenal', r)), [200, 800, 1200]);
});

test('a save from before keeps everything: its records open what they imply, six slots, the free rerolls, the ultimates', () => {
  const old = {
    v: 3, gold: 10, heroes: ['knight', 'archer'], kills: 6000, runs: 9,
    best: { s15: 700, dungeon: 0, kills: 900, level: 35 }, wins: { s15: [0, 1, 0], dungeon: [0, 0, 0] },
    feats: { knight: 1 }, up: { reroll: 4, might: 2 },
  };
  const p = P.sanitizeProfile(old);
  assert.equal(p.v, P.VERSION);
  assert.deepEqual(p.up, { arsenal: 3, reliquary: 3, might: 2, reroll: 5, banish: 2 }, 'Insight to its max, Exile two');
  assert.deepEqual(P.metaBonuses(p).weaponSlots, 6);
  const open = P.openFor(p, 'archer');
  assert.ok(open.ult && P.openFor(p, 'knight').ult, 'both owned heroes');
  assert.equal(P.progressList(p).find((l) => l.id === 'phoenix').forSale, true, 'a night won put the Phoenix Heart up for sale');
  assert.equal(P.openFor(p, 'mage').ult, false);
  const shut = P.progressList(p).filter((l) => !l.open && !LOCKS.find((x) => x.id === l.id)?.deep).map((l) => l.id);
  // The night won is 15:00 and opens the run-long ones; level 35 is short of the Fang's 38 and the
  // Crown's 45, and its 6,000 slain (counted as Veteran's) of Thornmail's 8,000 (27 October 2026).
  assert.deepEqual(shut, ['thorns', 'growth', 'phoenix', 'chain', 'thornmail', 'fang', 'ember', 'aura', ...P.HERO_ORDER.slice(2)], 'the Phoenix Heart for sale; 6,000 slain is short of Thornmail');
  // Read again, as the cookie gives it back: nothing more given.
  const again = P.sanitizeProfile(JSON.parse(JSON.stringify(P.packProfile(p))));
  assert.deepEqual(again, p);
  // Refund All resets the whole Armory, the given ranks too, each paid back at its price; and
  // read back from the cookie, nothing is given again.
  const r = P.refundUpgrades(p);
  assert.deepEqual(r.profile.up, {});
  const cost = (id, n) => [...Array(n).keys()].reduce((s, k) => s + P.upgradeCost(id, k), 0);
  assert.equal(r.refunded, cost('arsenal', 3) + cost('reliquary', 3) + cost('might', 2) + cost('reroll', 5) + cost('banish', 2));
  const after = P.sanitizeProfile(JSON.parse(JSON.stringify(P.packProfile(r.profile))));
  assert.deepEqual(after.up, {}, 'still empty through the cookie');
  // An old save with no records gets the slots and the free rerolls, and nothing else.
  const bare = P.sanitizeProfile({ v: 2 });
  assert.deepEqual(P.openFor(bare, 'knight'), P.openFor(P.defaultProfile(), 'knight'));
  assert.deepEqual([P.metaBonuses(bare).weaponSlots, P.metaBonuses(bare).reroll, P.metaBonuses(bare).banish], [6, 2, 2]);
});

test('the debug address opens every weapon, relic and ultimate, and every slot', () => {
  const p = unlockEverything(P.defaultProfile());
  for (const h of P.HERO_ORDER) assert.ok(P.openFor(p, h).ult, h);
  assert.ok(P.progressList(p).every((l) => l.open && l.progress === 1));
  assert.deepEqual([P.metaBonuses(p).weaponSlots, P.metaBonuses(p).relicSlots], [6, 6]);
  assert.deepEqual(P.sanitizeProfile(JSON.parse(JSON.stringify(P.packProfile(p)))).ul, p.ul, 'and keeps it');
});

test('the bots play as a profile when given one, and as before without', () => {
  const free = playGame({ bot: 'idle', seed: 2, max: 3 });
  assert.ok(free.report && typeof free.report.bosses === 'number' && free.wage >= 0);
  const fresh = playGame({ bot: 'idle', seed: 2, max: 3, profile: P.defaultProfile() });
  assert.equal(fresh.report.hero, 'knight');
  assert.ok(P.applyRun(P.defaultProfile(), fresh.report).ok, 'its report is one the server takes');
});

test('progressList measures how far each lock is', () => {
  const p = P.applyRun(P.defaultProfile(), { ...RUN, time: 90, realTime: 90, kills: 250, level: 10, gold: 100 }).profile;
  const at = (id) => P.progressList(p).find((l) => l.id === id && l.type !== 'ult');
  assert.equal(at('frost').progress, 1);
  assert.equal(at('aura').progress, 0, 'no fall yet');
  assert.equal(at('lightning').progress, 0.25);
  assert.equal(at('wisps').progress, 1 / 3);
  assert.equal(at('luck').progress, 0.2);
  assert.equal(at('phoenix').progress, 0);
  assert.deepEqual(Object.keys(at('frost')).sort(), ['id', 'need', 'open', 'progress', 'type']);
});

test('a weapon left at home is never offered, and comes along again when asked', () => {
  let p = { ...P.defaultProfile(), effort: 10 };
  p = P.setHome(p, 'axe', true).profile;
  assert.deepEqual(P.openFor(p, 'knight').weapons, ['blades', 'glaive', 'caltrops']);
  assert.equal(P.progressList(p).find((l) => l.id === 'axe').home, true);
  assert.equal(P.setHome(p, 'sword', true).ok, false, 'a signature never stays at home');
  assert.deepEqual(P.sanitizeProfile({ ...p, home: ['axe', 'nope', 7] }).home, ['axe']);
  p = P.setHome(p, 'axe', false).profile;
  assert.deepEqual(P.openFor(p, 'knight').weapons, ['axe', 'blades', 'glaive', 'caltrops']);
});

test('the second circle stays hidden and shut until a night is won, then opens by its deeds', () => {
  const deep = LOCKS.filter((l) => l.deep);
  assert.equal(deep.length, 11);
  let p = P.applyRun(P.defaultProfile(), { ...RUN, time: 13 * 60, realTime: 13 * 60, bosses: 5 }).profile;
  const list = P.progressList(p);
  for (const l of deep) {
    const e = list.find((x) => x.id === l.id);
    assert.ok(e.hidden && !e.open && e.progress === 0, `${l.id} hidden`);
  }
  assert.ok(!P.openFor(p, 'knight').weapons.includes('lantern'), '12:00 lasted, but no night won yet');
  const won = P.applyRun(p, { ...RUN, victory: true, time: 900, realTime: 900 });
  assert.deepEqual(won.reward.unlocked.map((u) => u.id).sort(), ['bell', 'gale', 'lantern']);
  assert.ok(!P.progressList(won.profile).some((e) => e.hidden));
});

test('Chain Lightning opens once a run has evolved Lightning Strike, with any hero', () => {
  let r = P.applyRun(P.defaultProfile(), { ...RUN, time: 119, realTime: 119, evos: ['thunderstorm'] });
  assert.ok(!r.reward.unlocked.some((u) => u.id === 'chain'), 'not in the first two minutes');
  r = P.applyRun(r.profile, { ...RUN, hero: 'knight', time: 400, realTime: 400, evos: ['excalibur', 'thunderstorm', 'nope'] });
  assert.deepEqual(r.reward.unlocked.filter((u) => u.id === 'chain'), [{ type: 'weapon', id: 'chain', need: 'Evolve Lightning Strike' }]);
  assert.deepEqual(r.profile.ev, ['thunderstorm'], 'only what a lock waits on is kept');
  assert.ok(P.openFor(r.profile, 'mage').weapons.includes('chain'));
  assert.deepEqual(P.sanitizeProfile(JSON.parse(JSON.stringify(P.packProfile(r.profile)))).ev, ['thunderstorm']);
  // Every evolution held is known from then on (the owner's, 27 October 2026), in the table's order.
  assert.deepEqual(P.knownEvos(r.profile), ['excalibur', 'thunderstorm']);
  assert.deepEqual(P.knownEvos(P.sanitizeProfile(JSON.parse(JSON.stringify(P.packProfile(r.profile))))), ['excalibur', 'thunderstorm'], 'through the cookie');
  assert.deepEqual(P.openFor(r.profile, 'mage').evos, ['excalibur', 'thunderstorm']);
});

test('every evolution has its bit, and a relic is told only once a run before has made its evolution', () => {
  const evos = Object.values(WEAPONS).filter((d) => d.evo).map((d) => d.evo.into);
  assert.deepEqual([...PROGRESS.evolutions].sort(), [...evos].sort(), 'every evolution once, none else');
  assert.equal(new Set(PROGRESS.evolutions).size, PROGRESS.evolutions.length);
  assert.ok(PROGRESS.evolutions.length <= 53, 'the bits of one number');
  assert.deepEqual(P.knownEvos(P.defaultProfile()), [], 'a new player knows none');
  assert.deepEqual(P.knownEvos(P.openEverything(P.defaultProfile())), PROGRESS.evolutions);
  // A save from before kept Lightning Strike's in ev and a signature's in its feat: those are known;
  // the Necromancer's two can't be told apart, so neither is.
  const old = P.sanitizeProfile({ feats: { knight: 8, necromancer: 8 }, ev: ['thunderstorm'] });
  assert.deepEqual(P.knownEvos(old), ['excalibur', 'thunderstorm']);
  assert.deepEqual(P.knownEvos(P.sanitizeProfile(old)), ['excalibur', 'thunderstorm'], 'read again, the same');
  assert.deepEqual(P.knownEvos(P.sanitizeProfile({ ek: -5 })), [], 'nothing absurd');
});

test('Consecration opens on the tenth fall: a run quit or won is no fall', () => {
  let p = P.defaultProfile();
  for (let i = 0; i < 9; i++) p = P.applyRun(p, { ...RUN, died: true }).profile;
  p = P.applyRun(p, { ...RUN }).profile; // quit
  p = P.applyRun(p, { ...RUN, died: true, victory: true, time: 900, realTime: 900 }).profile; // won
  assert.equal(p.deaths, 9);
  assert.ok(!P.openFor(p, 'knight').weapons.includes('aura'));
  assert.equal(P.progressList(p).find((l) => l.id === 'aura').need, 'Fall 10 times');
  const r = P.applyRun(p, { ...RUN, died: true });
  assert.deepEqual(r.reward.unlocked.map((u) => u.id), ['aura']);
  assert.ok(P.openFor(r.profile, 'knight').weapons.includes('aura'));
});

// Nominal bounds include boosts applied after the spawn-rate cap, not just raw spawn factors.
test("kill-credit bounds follow the shared population rules, including Normal's steady boost", () => {
  for (const [id, d] of Object.entries(DIFFS)) assert.ok(Math.abs(PROGRESS.effort[id] - VETERAN.spawn / (d.spawn * (d.steadyMore ?? 1))) < 1e-9, id);
  assert.equal(PROGRESS.nightmareEffort, 1 / NIGHTMARE.more);
});

// The 27 October 2026 review, C12 (28 October 2026): a run is told which locks it may open as it
// goes, to banner each the moment it reaches it; never one only the end can tell (falls, wins), one
// still hidden, another hero's evolution, nor one already open.
test('a run is given the locks it may still open as it goes', () => {
  const ids = (list, type) => list.filter((l) => !type || l.type === type).map((l) => l.id);
  const fresh = P.runLocks(P.defaultProfile(), 'knight');
  for (const id of ['frost', 'flask', 'arcane']) assert.ok(ids(fresh).includes(id), `${id} reachable in a run`);
  assert.ok(!ids(fresh).includes('aura'), 'falls tell only as the run ends');
  for (const l of fresh) {
    if (l.type === 'ult') continue;
    const lock = LOCKS.find((x) => x.type === l.type && x.id === l.id);
    assert.ok(lock && !lock.deep, `${l.id}: none of the second circle before a night is won`);
  }
  assert.deepEqual(ids(fresh, 'ult'), ['knight'], 'his ultimate, still shut');
  assert.equal(fresh.find((l) => l.id === 'phoenix')?.buy, true, 'the Phoenix Heart, for sale when it is reached');
  assert.ok(!ids(P.runLocks(P.defaultProfile(), 'mage')).includes('phoenix'), "another hero's evolution");
  const { profile } = P.applyRun(P.defaultProfile(), { ...RUN, time: 130, realTime: 130 });
  const after = P.runLocks(profile, 'knight');
  assert.ok(!ids(after).includes('frost'), 'one open is not told again');
  assert.deepEqual(ids(after, 'ult'), [], 'nor his ultimate');
  assert.equal(after.find((l) => l.need === 'kills').from, profile.effort, "the kills counted on top of the profile's");
});
