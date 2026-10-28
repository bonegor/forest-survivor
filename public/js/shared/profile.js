// Profile rules shared by the Node server and the browser.
//
// Everything a player owns lives in a cookie, so the profile is deliberately
// tiny: gold, wins, a few records, per-hero achievements, the ranks bought
// in the Armory and the gear each hero wears (shared/items.js; heroes don't
// share it). Every function here is pure and treats its input as untrusted.
//
// The ladder:
//  1. Everyone starts with the Knight in 15-minute Survival.
//  2. Five minutes on the clock with a hero unlock the next hero, all nine in turn
//     (HERO_ORDER): the Necromancer's bring in the Paladin, and so on.
//  3. Surviving the night with the Necromancer opens the Dungeon, for the Knight.
//  4. Beating the Dungeon with one of the ladder's five (LADDER) opens it for the next.
//  5. Beating the Dungeon with the Necromancer opens Ranked: endless, any hero,
//     personal bests.
// The four after the Necromancer (20 October 2026) are extras beside the ladder: once the
// Dungeon is open they may go down at once, and nothing waits on their clears.
//
// Three difficulties (data/difficulty.js): Normal is recorded as the old Easy, Veteran as the old
// Medium, Elite as the old Hard, so saves keep their shape (since 23 October 2026, when Normal
// became Veteran and Veteran Elite, old Easy wins count as Normal's).
// A Nightmare (three times the monsters, on Elite) is recorded as its difficulty, and pays a
// little more gold (NIGHTMARE_GOLD).
//
// The Survival maps (the owner's, 28 October 2026; data/maps.js): the night is spent on one of five,
// each opened by a night won on the one before it on the ladder (shared/progress.js mapLadder), the
// desert first (mo, mw; mapsEarned). Everything else counts a run on any of them alike: the next
// hero's five minutes, the ultimates, the wins and their marks, the records and the milestones.

// Progression (21 October 2026, shared/progress.js): weapons, relics and each hero's ultimate open
// by milestones, kept as bits (ul: PROGRESS.locks in order; uu: HERO_ORDER in order); weapon and
// relic slots are Armory ranks (Arsenal, Reliquary), as are all rerolls and banishes.

import { RARITIES, LEGENDARY, MAX_LORDS, SLOTS, POOLS, sanitizeGear, packGear, sameItem, itemPrice, statRange } from './items.js';
import { FLOORS } from '../data/waves.js';
import { PASSIVES } from '../data/passives.js';
import { PROGRESS, needText } from './progress.js';

export { PROGRESS, needText };

// 4: progression (unlocks by milestone, slots bought); a save from before keeps all it had
// (sanitizeProfile, fromBefore). 3: each hero's own gear, and heroes unlocked by time (2: one set
// of gear, heroes bought).
export const VERSION = 4;
export const DIFFICULTIES = ['easy', 'medium', 'hard'];
export const MODES = ['s15', 'dungeon', 'ranked'];
export const WIN_MODES = ['s15', 'dungeon']; // Ranked has no victory, only a time
// Heroes unlock in this order: a run with one that lasts this long on the clock (seconds)
// brings in the next.
export const HERO_ORDER = ['knight', 'archer', 'mage', 'rogue', 'necromancer', 'paladin', 'druid', 'berserker', 'witchhunter'];
// The ladder's five, whose Dungeon clears each bring the next one into it and the last opens
// Ranked; the heroes after them are extras (canPlay, nextGoal).
export const LADDER = HERO_ORDER.slice(0, 5);
export const BASE_HEROES = ['knight'];
export const HERO_UNLOCK_TIME = 5 * 60;
// The Survival maps by id, in the order the save keeps their bits (mo, mw), and in the order they
// open in: the first open from the start, each after it once a night is won on the one before it.
// The ids only, from shared/progress.js, which imports nothing: data/maps.js (the maps themselves,
// with their rosters and the waves) stays out of this file, which data/difficulty.js and the server
// import, so their imports never go round in a circle.
const MAP_IDS = PROGRESS.maps, MAP_ORDER = PROGRESS.mapLadder;
// Per-hero achievements, stored as bit flags. survivalHard is any night won
// (once only Hard counted); dungeonHard (4) lingers in old saves, unused.
// evolved: his signature weapon evolved in a run (the Knight's opens the Phoenix Heart, shared/progress.js).
// The rest are the marks of a win by difficulty (27 October 2026), for the hero and trial cards
// only (ui/ladder.js featStars): a night or a Dungeon Run won on Veteran, on Elite, in a Nightmare.
// A Nightmare's win marks Elite too; a Normal one only the any-win bit. They open nothing.
export const FEAT = { survivalHard: 1, dungeon: 2, dungeonHard: 4, evolved: 8, nightVeteran: 16, nightElite: 32, nightNightmare: 64, dungeonVeteran: 128, dungeonElite: 256, dungeonNightmare: 512 };
const ALL_FEATS = Object.values(FEAT).reduce((a, b) => a | b, 0);
// The marks a win sets, by mode and difficulty (applyRun).
const WIN_MARKS = {
  s15: { medium: FEAT.nightVeteran, hard: FEAT.nightElite, nightmare: FEAT.nightNightmare },
  dungeon: { medium: FEAT.dungeonVeteran, hard: FEAT.dungeonElite, nightmare: FEAT.dungeonNightmare },
};
// Ranked titles by minutes survived.
export const RANKS = [
  [0, 'Peasant'], [5, 'Squire'], [10, 'Knight'], [15, 'Champion'], [20, 'Paladin'],
  [25, 'Warlord'], [30, 'Hero'], [40, 'Legend'], [50, 'Mythic'], [60, 'Immortal'],
];

// Permanent upgrades bought with gold. Rank n+1 costs `cost * (n + 1)`, the first rank half that
// (PROGRESS.firstRank, upgradeCost).
export const UPGRADES = [
  // The owner's (21 October 2026): "the player doesn't start with 6 but starts with fewer".
  { id: 'arsenal', name: 'Arsenal', desc: '+1 weapon slot', max: 3, cost: 400 },
  { id: 'reliquary', name: 'Reliquary', desc: '+1 relic slot', max: 3, cost: 300 },
  { id: 'might', name: 'Might', desc: '+5% damage', max: 8, cost: 150 },
  { id: 'armor', name: 'Armor', desc: '+1 armor', max: 6, cost: 250 },
  { id: 'vitality', name: 'Vitality', desc: '+10% max health', max: 7, cost: 180 },
  { id: 'recovery', name: 'Recovery', desc: '+0.1 health per second', max: 10, cost: 120 },
  { id: 'haste', name: 'Haste', desc: '-3% cooldowns', max: 5, cost: 300 },
  { id: 'reach', name: 'Reach', desc: '+5% area', max: 5, cost: 250 },
  { id: 'swiftness', name: 'Swiftness', desc: '+5% move speed', max: 3, cost: 200 },
  { id: 'magnet', name: 'Magnetism', desc: '+20% pickup range', max: 5, cost: 100 },
  { id: 'fortune', name: 'Fortune', desc: '+10% luck', max: 5, cost: 220 },
  { id: 'wisdom', name: 'Wisdom', desc: '+4% experience', max: 8, cost: 160 },
  { id: 'greed', name: 'Greed', desc: '+10% gold', max: 8, cost: 130 },
  { id: 'reroll', name: 'Insight', desc: '+1 level-up reroll', max: 5, cost: 250 },
  { id: 'banish', name: 'Exile', desc: '+1 level-up banish', max: 5, cost: 250 },
  { id: 'endurance', name: 'Endurance', desc: '+6% effect duration', max: 5, cost: 160 },
  { id: 'velocity', name: 'Velocity', desc: '+6% projectile speed', max: 3, cost: 120 },
  { id: 'echo', name: 'Echo', desc: '+1 projectile for every weapon', max: 1, cost: 2500 },
  { id: 'revival', name: 'Second Wind', desc: '+1 revive per run', max: 2, cost: 1800 },
  // A milestone's relic for sale (`lock`: shared/progress.js, a lock with `buy`): shut until it is reached.
  { id: 'phoenix', name: 'Phoenix Heart', desc: 'the Phoenix Heart among the relics, for every hero', max: 1, cost: 1500, lock: 'phoenix' },
];

// What the gold a run found is worth, by difficulty (runReward); the trial screen says so.
export const DIFF_GOLD = { easy: 0.75, medium: 1, hard: 1.5 };
// A Nightmare's gold is worth this much more again, on either difficulty: a modest bonus for the
// harder night. Its victory bonus is the difficulty's.
export const NIGHTMARE_GOLD = 1.5;
const VICTORY_BONUS = { s15: 200, dungeon: 400 };
const DIFF_BONUS = { easy: 1, medium: 1.5, hard: 2.5 };
// Upper bounds used to reject absurd run reports.
const MAX_TIME = { s15: 16 * 60, dungeon: 3 * 60 * 60, ranked: 4 * 60 * 60 };
// A run's time played, crypts included (the night's clock stands still in them): the
// 15-minute night with at most an hour and three quarters below ground; the Dungeon has none.
const MAX_REAL_TIME = { s15: 2 * 60 * 60, dungeon: MAX_TIME.dungeon, ranked: MAX_TIME.ranked };
// Each of a crypt's lords drops a piece of gear at most, and a crypt holds MAX_LORDS of them at
// most (shared/items.js LORD_DROPS); one crypt is a step from the start and the next about a
// minute's walk on. So a run finds no more than MAX_LORDS pieces for each crypt it could have
// reached: the one by the start, and one more every SECS_PER_CRYPT of its time.
const SECS_PER_CRYPT = 45;
// A Dungeon Run has no crypts, but each of its three floors' guardians leaves a piece of gear
// (Game.bossDefeated, 27 October 2026).
const DUNGEON_GEAR = 3;
// The gold a run picks up in a second at the night's start with no greed, at most: 12 since the
// first commit. goldCap grows it as a run's gold can grow (27 October 2026: the flat 12 cut real
// gold from greedy builds and long Ranked runs).
const MAX_GOLD_PER_SEC = 12;
// The most the hero's greed (Player.recompute) multiplies it beyond the Armory's: a legendary
// ring's best roll of gold (one may be found and worn mid-run) and the Cursed Skulls, +50% each,
// three at most (game/game.js MAX_SKULLS). A Fortune shrine's doubled coins last moments, well
// inside the cap's room.
const MOST_SKULLS = 3;
const RUN_GREED = (1 + statRange('greed', LEGENDARY)[1] / 100) * (1 + 0.5 * MOST_SKULLS);
// And the most the hero's luck (Player.recompute) multiplies it: luck multiplies the odds of the
// horde's coin (Game.killEnemy) and of a chest's extra cards, gold among them when the run's
// auto-pick is gold and nothing is left to raise (Game.rollChest), so it grows that gold by as much
// as it is (27 October 2026: the cap once said luck weights no coin, and cut a lucky build's). A
// box's coins and gold piles it only makes rarer (PROP_LOOT).
// The most luck: the Rogue's (data/heroes.js, the luckiest hero), the Armory's Fortune at its top
// rank, a full Lucky Clover and a legendary piece's best roll of luck in every slot that rolls it.
const MOST_HERO_LUCK = 1.2;
const RUN_LUCK = MOST_HERO_LUCK * (1 + 0.1 * UPGRADES.find((u) => u.id === 'fortune').max)
  * (1 + PASSIVES.luck.max * PASSIVES.luck.stat.luck
    + SLOTS.filter((s) => POOLS[s].includes('luck')).length * statRange('luck', LEGENDARY)[1] / 100);
// The Armory's Greed at its top rank (metaBonuses), for a run checked without its save.
const TOP_GREED = 1 + 0.1 * UPGRADES.find((u) => u.id === 'greed').max;

// The night's phase at `time` on a run's clock, at most (Game.phase): 1.4 a minute, Ranked 0.9 a
// minute past its fifteenth; below ground the deepest floor's cap.
function phaseAt(mode, time) {
  const m = time / 60;
  if (mode === 'dungeon') return FLOORS[FLOORS.length - 1].cap;
  return mode === 'ranked' && m > 15 ? 21 + (m - 15) * 0.9 : m * 1.4;
}

// How many more monsters a Survival map sends than the Darkwood, where it sends more (data/maps.js
// foe.horde, the Abyss's; 28 October 2026): a night there may slay that many more (sanitizeRun's
// kills, countedKills) and pick up that much more of the horde's gold (goldCap). Their caps were
// set for the Darkwood's horde, and a Normal night counts each kill eight times over (effort): one
// in the Abyss with every Cursed Skull, slaying all that came, could have come near the counted
// kills' cap. Copied, as this file can't import data/maps.js (MAP_IDS); test/profile.test.js keeps
// each at least what maps.js sends.
const MAP_MORE = { hell: 1.2 };
const mapMore = (id) => (Object.hasOwn(MAP_MORE, id) ? MAP_MORE[id] : 1);

// The most gold a run could pick up (sanitizeRun): MAX_GOLD_PER_SEC for each second played, grown
// as the filler purse grows with the phase (Game.filler, 1 + phase / 10), by the most greed the
// run could have, its Armory's (`armory`, metaBonuses greed) times RUN_GREED, by the most luck
// (RUN_LUCK) and by its map's more monsters (MAP_MORE); and what selling a crypt lord's gear could pay.
export function goldCap(run, armory = TOP_GREED) {
  const rate = MAX_GOLD_PER_SEC * (1 + phaseAt(run.mode, run.time) / 10) * armory * RUN_GREED * RUN_LUCK * mapMore(run.map);
  return Math.floor(100 + run.realTime * rate + run.found * RARITIES[LEGENDARY].price);
}
const MIN_WIN_TIME = { s15: 15 * 60 - 5, dungeon: 4 * 60 };
// An evolution reported from a run shorter than this isn't believed (sanitizeRun): it takes eight
// levels and a relic. Game.lockReached waits for it likewise (runLocks after).
const EVO_AFTER = 120;

const int = (v, lo, hi) => {
  v = Math.floor(Number(v));
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
};
const isId = (s) => typeof s === 'string' && /^[a-z0-9]{2,16}$/.test(s);

export function defaultProfile() {
  return {
    v: VERSION,
    gold: 0,
    wins: { s15: [0, 0, 0], dungeon: [0, 0, 0] },
    runs: 0,
    kills: 0,
    effort: 0, // kills counted as Veteran's (PROGRESS.effort): the 'kills' milestones and the exclusion slots
    deaths: 0, // runs that ended with the hero fallen (milestones: shared/progress.js deaths)
    // time: the longest run on the clock in any mode; gold: the most gold picked up in a run;
    // bosses: the most bosses (and crypt lords) slain in a run. Milestones read them (earnedBits).
    // combo: the longest kill streak in a run (Game.stats.maxCombo), for the results' NEW BEST
    // (28 October 2026); it opens nothing.
    best: { s15: 0, dungeon: 0, kills: 0, level: 0, time: 0, gold: 0, bosses: 0, combo: 0 },
    up: {},
    // Armory ranks a save from before was given (fromBefore); a refund pays them back as gold too.
    gift: {},
    ul: 0, // the milestones' weapons and relics open: bit i is PROGRESS.locks[i]
    uu: 0, // the heroes whose ultimate is open: bit i is HERO_ORDER[i]
    // The Survival maps open (mo: bit i is PROGRESS.maps[i]; a new save's the ladder's first, the
    // desert) and the nights won on each (mw: bit 3i + d for maps[i] won on DIFFICULTIES[d], a
    // Nightmare's as Elite's): 28 October 2026 (mapsEarned).
    mo: 2 ** MAP_IDS.indexOf(MAP_ORDER[0]),
    mw: 0,
    heroes: [...BASE_HEROES],
    feats: {}, // hero -> FEAT bits
    ranked: {}, // hero -> best Ranked time in seconds
    // hero -> his longest run on the clock in seconds, in any mode (28 October 2026, the review's
    // C4): the hero screen, the results' NEXT bar and the Codex's ultimate bars.
    bt: {},
    gear: {}, // hero -> slot -> the item that hero wears there (shared/items.js)
    ev: [], // the evolutions a lock waits on (need 'evolution') that a run has reached
    ek: 0, // every evolution a run has made: bit i is PROGRESS.evolutions[i] (knownEvos)
    home: [], // the shared weapons left at home: never offered in a run (setHome, the Codex)
  };
}

export function sanitizeProfile(raw) {
  const p = defaultProfile();
  if (!raw || typeof raw !== 'object') return p;
  p.gold = int(raw.gold, 0, 1e9);
  for (const m of WIN_MODES) {
    for (let i = 0; i < 3; i++) p.wins[m][i] = int(raw.wins?.[m]?.[i], 0, 1e6);
  }
  p.runs = int(raw.runs, 0, 1e7);
  p.kills = int(raw.kills, 0, 1e12);
  // A save from before 27 October 2026 starts from its kills (before exclusionState reads it, below).
  p.effort = raw.effort === undefined ? p.kills : int(raw.effort, 0, 1e12);
  p.deaths = int(raw.deaths, 0, 1e7);
  p.best.s15 = int(raw.best?.s15, 0, MAX_TIME.s15);
  p.best.dungeon = int(raw.best?.dungeon, 0, 4);
  p.best.kills = int(raw.best?.kills, 0, 1e7);
  p.best.level = int(raw.best?.level, 0, 999);
  p.best.time = int(raw.best?.time, 0, MAX_TIME.ranked);
  p.best.gold = int(raw.best?.gold, 0, 1e9);
  p.best.bosses = int(raw.best?.bosses, 0, 9999);
  p.best.combo = int(raw.best?.combo, 0, 1e7);
  for (const u of UPGRADES) {
    const r = int(raw.up?.[u.id], 0, u.max);
    if (r) p.up[u.id] = r;
    const g = int(GIFTS.includes(u.id) ? giftOf(raw.gift, u.id) : 0, 0, r);
    if (g) p.gift[u.id] = g;
  }
  p.ul = int(raw.ul, 0, ALL_LOCKS);
  if (Array.isArray(raw.ev)) p.ev = EVO_IDS.filter((id) => raw.ev.includes(id));
  p.ek = int(raw.ek, 0, ALL_EVOS);
  if (Array.isArray(raw.home)) p.home = SHARED_IDS.filter((id) => raw.home.includes(id)).slice(0, exclusionState(p).level);
  p.uu = int(raw.uu, 0, ALL_ULTS);
  // A cookie keeps them as bits in HERO_ORDER's order (packProfile); one from before keeps a list.
  const heroes = typeof raw.heroes === 'number' ? HERO_ORDER.filter((h) => (raw.heroes & heroBit(h)) !== 0) : raw.heroes;
  if (Array.isArray(heroes)) {
    for (const h of heroes) if (HERO_ORDER.includes(h) && !p.heroes.includes(h)) p.heroes.push(h);
  }
  for (const h of HERO_ORDER) {
    // His marks, an object as the cookie keeps them (packProfile), or packed as his times are.
    const f = int(perHero(raw.feats, h), 0, ALL_FEATS);
    if (f) p.feats[h] = f;
    const t = int(perHero(raw.ranked, h), 0, MAX_TIME.ranked);
    if (t) p.ranked[h] = t;
    // His longest run, any mode; a save from before 28 October 2026 has his Ranked best for it.
    const b = Math.max(t, int(perHero(raw.bt, h), 0, MAX_TIME.ranked));
    if (b) p.bt[h] = b;
  }
  // The evolutions a save from before 27 October 2026 already tells of are known (SIGNATURE_EVO);
  // taken again every time, which changes nothing once they are in.
  for (const id of p.ev) p.ek = withEvo(p.ek, id);
  for (const [h, id] of Object.entries(SIGNATURE_EVO)) if (hasFeat(p, h, FEAT.evolved)) p.ek = withEvo(p.ek, id);
  // And those a lock waits on are read back from ek, which the cookie keeps in their place (packProfile).
  p.ev = EVO_IDS.filter((id) => hasBit(p.ek, EVOS.indexOf(id)));
  // A hero who has won a night, or lasted five minutes in Ranked, has brought in the next
  // (saves from when the next hero was bought with gold, after a night survived).
  for (const h of HERO_ORDER) {
    const next = unlocksNext(p, h);
    if (next && p.heroes.includes(h) && (hasFeat(p, h, FEAT.survivalHard) || (p.ranked[h] || 0) >= HERO_UNLOCK_TIME)) p.heroes.push(next);
  }
  // Each hero's own gear. Saves from before (2) kept one set for every hero: each hero keeps a
  // copy of it.
  if (int(raw.v, 0, 99) >= 3) {
    for (const h of HERO_ORDER) {
      const g = sanitizeGear(raw.gear?.[h]);
      if (Object.keys(g).length) p.gear[h] = g;
    }
  } else if (Object.keys(sanitizeGear(raw.gear)).length) {
    for (const h of p.heroes) p.gear[h] = sanitizeGear(raw.gear);
  }
  const v = int(raw.v, 0, 99);
  if (v >= 1 && v < 4) fromBefore(p);
  // The Survival maps open and the nights won on each (28 October 2026). A save from before them (no
  // mo) that has played spent all its nights in the Darkwood: it keeps the Darkwood and every map
  // before it on the ladder, and its nights won are the Darkwood's, which opens the Abyss after it.
  // One that never played starts in the desert, as a new save does. Taken from the field, not the
  // version (a save may have none), and only once: the save keeps mo from then on, so a map opened
  // by it is open already when the next run begins and is never told as new (openings).
  p.mo = int(raw.mo, 0, ALL_MAPS);
  p.mw = int(raw.mw, 0, ALL_MAP_WINS);
  if (raw.mo === undefined && p.runs > 0) {
    for (const m of MAP_ORDER.slice(0, MAP_ORDER.indexOf('forest') + 1)) p.mo = withBit(p.mo, mapI(m));
    p.wins.s15.forEach((n, d) => {
      if (n) p.mw = withBit(p.mw, winBit('forest', d));
    });
  }
  // Every map the nights won have earned is open; one open stays open.
  p.mo = mapsEarned(p);
  // Whatever the records have earned is open (a milestone retuned lower opens for all who passed it).
  p.ul = orBits(p.ul, earnedBits(p));
  for (const h of p.heroes) if (ultEarned(p, h)) p.uu |= heroBit(h);
  return p;
}

// ------------------------------------------------------------ progression --
// (shared/progress.js holds the numbers.)

const LOCKS = PROGRESS.locks;
const ALL_LOCKS = 2 ** LOCKS.length - 1;
const ALL_ULTS = 2 ** HERO_ORDER.length - 1;
const heroBit = (h) => 1 << HERO_ORDER.indexOf(h);
// The locks are more than a 32-bit number's bits, so they are kept with plain arithmetic: a
// number's bit i is 2 ** i, safe up to 53 of them (test/progress.test.js keeps the table to 50).
const hasBit = (n, i) => Math.floor((n || 0) / 2 ** i) % 2 === 1;
const withBit = (n, i) => (hasBit(n, i) ? n : (n || 0) + 2 ** i);
const orBits = (a, b) => LOCKS.reduce((n, _, i) => (hasBit(b, i) ? withBit(n, i) : n), a || 0);
const lockOpen = (p, i) => !LOCKS[i].retired && hasBit(p.ul, i);
const sum = (a) => a.reduce((s, x) => s + x, 0);

// The Survival maps' bits (28 October 2026): mo's bit i is MAP_IDS[i] open, mw's bit 3i + d a night
// won on it on DIFFICULTIES[d].
const mapI = (m) => MAP_IDS.indexOf(m);
const winBit = (m, d) => 3 * mapI(m) + d;
const ALL_MAPS = 2 ** MAP_IDS.length - 1, ALL_MAP_WINS = 2 ** (3 * MAP_IDS.length) - 1;
// Whether a Survival map is open on a profile, and whether a night has been won on it (on any
// difficulty): the trial screen's map row, the run's credit (applyRun).
export const mapOpen = (p, m) => mapI(m) >= 0 && hasBit(p?.mo, mapI(m));
export const mapWon = (p, m) => mapI(m) >= 0 && [0, 1, 2].some((d) => hasBit(p?.mw, winBit(m, d)));
// The maps a profile's nights have earned, on top of those open: the ladder's first, and every one
// after a map with a night won on it.
const mapsEarned = (p) => MAP_ORDER.reduce((n, m, k) => (k === 0 || mapWon(p, MAP_ORDER[k - 1]) ? withBit(n, mapI(m)) : n), p.mo || 0);

// What the profile's records measure, for each kind of milestone (PROGRESS.locks need).
function measures(p) {
  return {
    time: p.best.time, kills: p.effort, level: p.best.level, gold: p.best.gold, bosses: p.best.bosses, wins: sum(p.wins.s15),
    deaths: p.deaths, veteran: p.wins.s15[DIFFICULTIES.indexOf('hard')], dungeon: sum(p.wins.dungeon),
    heroes: HERO_ORDER.filter((h) => hasFeat(p, h, FEAT.survivalHard)).length,
  };
}
// How far the records have come toward one lock: nothing toward one of the second circle (deep)
// before a night is won.
function measure(p, l, m = measures(p)) {
  if (l.deep && !m.wins) return 0;
  if (l.need === 'evolution') return +p.ev.includes(l.of);
  return l.need === 'evolve' ? +hasFeat(p, l.hero, FEAT.evolved) : m[l.need];
}
// Whether a lock is of the second circle and still hidden: no night won yet (the Codex names none).
const hiddenLock = (l, m) => !!l.deep && !m.wins;
// Every shared weapon the table names, in its order (the ones open from the start, then the locks').
const SHARED_IDS = [...PROGRESS.openWeapons, ...PROGRESS.locks.filter((l) => l.type === 'weapon').map((l) => l.id)];
// The evolutions a lock waits on (need 'evolution'), the only ones a profile keeps (p.ev).
const EVO_IDS = PROGRESS.locks.filter((l) => l.need === 'evolution').map((l) => l.of);
// Every evolution, each a bit of profile.ek (PROGRESS.evolutions); withEvo: one more of them known.
const EVOS = PROGRESS.evolutions, ALL_EVOS = 2 ** EVOS.length - 1;
const withEvo = (n, id) => (EVOS.includes(id) ? withBit(n, EVOS.indexOf(id)) : n || 0);
// A save from before 27 October 2026 kept only that a hero's signature had evolved (FEAT.evolved):
// that evolution is known. The Necromancer's two can't be told apart, so neither is.
const SIGNATURE_EVO = { knight: 'excalibur', archer: 'stormstring', mage: 'meteor', rogue: 'shadowstrike', paladin: 'judgement', druid: 'worldroot', berserker: 'bloodstorm', witchhunter: 'purifier' };
// The evolutions a run before has made, in PROGRESS.evolutions' order. The owner's (27 October
// 2026): "we dont know the evolution relics unless we have already achieved that evolution in the
// past": until then a card, the pause screen and the Codex never name a weapon's relic (Game.evoKnown).
export const knownEvos = (p) => EVOS.filter((id, i) => hasBit(p?.ek, i));
// Whether a lock's weapon or relic may be found: its milestone reached, and, one for sale, bought.
const lockUsable = (p, i) => lockOpen(p, i) && (!LOCKS[i].buy || (p.up?.[LOCKS[i].id] || 0) > 0);

// The bits of every milestone the records have reached.
function earnedBits(p) {
  const m = measures(p);
  let bits = 0;
  LOCKS.forEach((l, i) => {
    if (measure(p, l, m) >= l.at) bits = withBit(bits, i);
  });
  return bits;
}

// Whether a hero's records show a run with him of PROGRESS.ultTime: his longest run that long (bt),
// a Ranked best that long, a win with him (no win is that short), or the next hero brought in (five
// minutes with him).
function ultEarned(p, h) {
  if ((p.bt[h] || 0) >= PROGRESS.ultTime || (p.ranked[h] || 0) >= PROGRESS.ultTime || (p.feats[h] || 0) !== 0) return true;
  const next = HERO_ORDER[HERO_ORDER.indexOf(h) + 1];
  return HERO_UNLOCK_TIME >= PROGRESS.ultTime && !!next && p.heroes.includes(next);
}

// A save from before progression (version 3 and older) keeps all it had: every milestone its
// records imply is open; a win implies the run-long ones they never kept (gold, bosses, and the
// Phoenix Heart's, which a win opened then: it is for sale to them); every
// hero it owns has his ultimate once any of its runs lasted PROGRESS.ultTime; the Armory's Arsenal
// and Reliquary are full, so no slot is lost; Insight and Exile get two ranks more (to their max),
// for the two free rerolls and banishes every run had. Those ranks are a gift (p.gift), given once;
// Refund All takes them back as gold like the rest (refundUpgrades).
function fromBefore(p) {
  const wins = sum(p.wins.s15) + sum(p.wins.dungeon);
  p.best.time = Math.max(p.best.time, p.best.s15, ...Object.values(p.ranked), sum(p.wins.dungeon) ? MIN_WIN_TIME.dungeon : 0, sum(p.wins.s15) ? MIN_WIN_TIME.s15 : 0);
  if (wins) LOCKS.forEach((l, i) => {
    if (l.need === 'gold' || l.need === 'bosses' || l.need === 'evolve') p.ul = withBit(p.ul, i);
  });
  if (p.best.time >= PROGRESS.ultTime) for (const h of p.heroes) p.uu |= heroBit(h);
  const give = (id, n) => {
    const u = UPGRADES.find((x) => x.id === id), had = p.up[id] || 0, add = Math.min(n, u.max - had);
    if (add <= 0) return;
    p.up[id] = had + add;
    p.gift[id] = (p.gift[id] || 0) + add;
  };
  give('arsenal', 3);
  give('reliquary', 3);
  give('reroll', 2);
  give('banish', 2);
}

// Every milestone's weapon and relic, every hero's ultimate and every Survival map open, and the
// Armory's slots full (the debug address, engine/storage.js unlockEverything; the bots,
// tools/headless.mjs). No night is won by it (mw).
export function openEverything(p) {
  p.ul = ALL_LOCKS;
  p.uu = ALL_ULTS;
  p.ek = ALL_EVOS;
  p.mo = ALL_MAPS;
  for (const id of ['arsenal', 'reliquary', 'phoenix']) p.up[id] = UPGRADES.find((u) => u.id === id).max;
  return p;
}

// What the hero may find in a run with this profile: the shared weapons and the relics open (his
// own signature weapons always are: the game adds them, Game.weaponOpen), whether his ultimate
// is, and the evolutions a run before has made, whose relics the cards may name (knownEvos). The
// game takes it as its `open` option.
export function openFor(profile, hero) {
  const p = profile || {};
  const weapons = [...PROGRESS.openWeapons], relics = [...PROGRESS.openRelics];
  LOCKS.forEach((l, i) => {
    if (lockUsable(p, i)) (l.type === 'weapon' ? weapons : relics).push(l.id);
  });
  // Those left at home stay there (setHome), but never all of them: a save that would leave every
  // shared weapon at home keeps them all, and setHome refuses the last (27 October 2026).
  const home = Array.isArray(p.home) ? p.home.filter(id => SHARED_IDS.includes(id)).slice(0, exclusionState(p).level) : [];
  const kept = weapons.filter((id) => !home.includes(id));
  return { weapons: kept.length ? kept : weapons, relics, ult: ((p.uu || 0) & heroBit(hero)) !== 0, evos: knownEvos(p) };
}

// Whether a shared weapon is the last a run could offer: that one never stays at home (setHome,
// the Codex). Every hero is offered the same shared weapons.
export function lastInPlay(profile, id) {
  const w = openFor(profile, 'knight').weapons;
  return w.length === 1 && w[0] === id;
}

// Every lock, for a codex: the open-from-the-start ones (start: true), the milestones with how
// far the records have come (progress 0..1), and each hero's ultimate (its progress is his longest
// run's (bt); 1 once open).
// A lock for sale whose milestone is reached is not open until bought: its need says so (forSale).
// A shared weapon left at home is open, and says so (home). One of the second circle before a night
// is won is hidden: the Codex shows neither its name nor its deed; once revealed it is still `deep`.
//   [{ type: 'weapon' | 'relic' | 'ult', id, open, need, progress, start?, forSale?, home?, hidden?, deep? }]
export function progressList(profile) {
  const p = sanitizeProfile(profile), m = measures(p);
  const out = [];
  for (const id of PROGRESS.openWeapons) out.push({ type: 'weapon', id, open: true, need: null, progress: 1, start: true, ...(p.home.includes(id) && { home: true }) });
  for (const id of PROGRESS.openRelics) out.push({ type: 'relic', id, open: true, need: null, progress: 1, start: true });
  LOCKS.forEach((l, i) => {
    if (l.retired) return;
    const reached = lockOpen(p, i), open = lockUsable(p, i), forSale = reached && !open;
    const e = { type: l.type, id: l.id, open, need: forSale ? 'For sale in the Armory' : needText(l), progress: reached ? 1 : Math.min(1, measure(p, l, m) / l.at) };
    if (forSale) e.forSale = true;
    if (l.deep) e.deep = true; // of the second circle: once revealed, the Codex marks it NEW (ui/ladder.js isNewEntry)
    if (hiddenLock(l, m)) Object.assign(e, { hidden: true, need: 'Win a night to learn more' });
    if (l.type === 'weapon' && p.home.includes(l.id)) e.home = true;
    out.push(e);
  });
  for (const h of HERO_ORDER) {
    const open = ((p.uu & heroBit(h)) !== 0);
    out.push({ type: 'ult', id: h, open, need: needText({ need: 'time', at: PROGRESS.ultTime }) + ' with this hero', progress: open ? 1 : Math.min(1, (p.bt[h] || 0) / PROGRESS.ultTime) });
  }
  return out;
}

// The needs one run's own numbers can reach as it goes (Game.lockReached): its clock, level, gold
// and bosses, the kills counted on top of the profile's, an evolution. Wins, falls, a Dungeon won
// and the heroes who have won tell only as the run ends (the results).
const RUN_NEEDS = ['time', 'level', 'gold', 'bosses', 'kills', 'evolution', 'evolve'];
// The locks a run with this hero may still open as it goes, for the game to tell the moment it
// reaches one (Game.checkLocks; the 27 October 2026 review, C12: "Reach level 15", "Slay 1 boss"
// or "Pick up 500 gold" crossed mid-run said nothing until the results). These are every milestone
// still shut whose need is one of RUN_NEEDS, leaving out one of the second circle before a night is
// won (hidden, and shut whatever the records say) and another hero's evolution, plus his ultimate
// if it is still shut. One for sale whose milestone is reached but not yet bought is left out too
// (lockOpen, not lockUsable): it has been told. from: the kills counted so far, which the run's add
// to. after: the clock before which sanitizeRun doesn't believe an evolution. Display only:
// applyRun opens them when the run ends.
//   [{ type: 'weapon' | 'relic' | 'ult', id, need, at, from, after, of?, buy? }]
export function runLocks(profile, hero) {
  const p = sanitizeProfile(profile), m = measures(p), out = [];
  LOCKS.forEach((l, i) => {
    if (l.retired || lockOpen(p, i) || !RUN_NEEDS.includes(l.need) || hiddenLock(l, m) || (l.need === 'evolve' && l.hero !== hero)) return;
    const evo = l.need === 'evolution' || l.need === 'evolve';
    out.push({ type: l.type, id: l.id, need: l.need, at: l.at, from: l.need === 'kills' ? p.effort : 0, after: evo ? EVO_AFTER : 0, ...(l.of && { of: l.of }), ...(l.buy && { buy: true }) });
  });
  if ((p.uu & heroBit(hero)) === 0) out.push({ type: 'ult', id: hero, need: 'time', at: PROGRESS.ultTime, from: 0, after: 0 });
  return out;
}

// The profile as its cookie keeps it, every hero's gear packed into a string (shared/items.js
// packGear): all nine heroes in six legendaries each still fit. A cookie written before, each
// item an array, reads back all the same (sanitizeGear takes both). The gift is one number.
// Since every evolution is kept as a bit (ek, 27 October 2026) the list of those a lock waits on
// (ev) is told by it and stays out, and so does an empty home: the worst case keeps its quarter
// spare (test/profile.test.js). sanitizeProfile reads both back. The heroes are one number too, a
// bit each in HERO_ORDER's order (27 October 2026, room for the effort and the win marks), and so
// are each hero's Ranked best and longest run, as strings (packPerHero, 28 October 2026).
// His marks (feats) stay an object, as every build before this one reads them (28 October 2026, the
// review of the Survival maps): packed, they made room for the maps' mo and mw, but a build before
// reads a string as no marks at all, and a tab still running one when this one came (it reads the
// save back before each write, engine/storage.js reload), or that build put back, would write the
// save again without them: the Dungeon and Ranked shut and every win's star gone, with nothing in
// the save to tell them again. Such a write drops only mo and mw, and sanitizeProfile opens the maps
// again as for a save from before them. With the marks as they are, the worst case (a full home and
// every fall counted) still keeps its quarter spare, if only just (test/profile.test.js).
export function packProfile(p) {
  const { ev, ...rest } = p;
  const out = { ...rest, heroes: p.heroes.reduce((n, h) => n | heroBit(h), 0), gift: packGift(p.gift), ranked: packPerHero(p.ranked), bt: packPerHero(p.bt), gear: Object.fromEntries(Object.entries(p.gear || {}).map(([h, g]) => [h, packGear(g)])) };
  if (!out.home?.length) delete out.home;
  return out;
}

// The Armory ranks a save from before may have been given (fromBefore), two bits each in a cookie.
const GIFTS = ['arsenal', 'reliquary', 'reroll', 'banish'];
const packGift = (gift) => GIFTS.reduce((n, id, i) => n + Math.min(3, gift?.[id] || 0) * 4 ** i, 0);
const giftOf = (raw, id) => (typeof raw === 'number' ? Math.floor(raw / 4 ** GIFTS.indexOf(id)) % 4 : raw?.[id]);
// Each hero's time (ranked, bt) as a cookie keeps it: base 36 in HERO_ORDER's order, '.' between,
// none after the last kept (28 October 2026: nine heroes' Ranked bests as an object took 146
// characters; packed, both lists take less than that one did). A save from before keeps an
// object; both read back (perHero), and his marks (feats) either way too, though the cookie keeps
// those as an object (packProfile).
const packPerHero = (o) => HERO_ORDER.map((h) => (o?.[h] ? Math.floor(o[h]).toString(36) : '')).join('.').replace(/\.+$/, '');
const perHero = (raw, h) => (typeof raw === 'string' ? parseInt(raw.slice(0, 200).split('.')[HERO_ORDER.indexOf(h)] || '', 36) : raw?.[h]);

// ------------------------------------------------------------- the ladder --

export const hasFeat = (p, hero, bit) => ((p.feats?.[hero] || 0) & bit) !== 0;
const prevHero = (id) => HERO_ORDER[HERO_ORDER.indexOf(id) - 1] || null;

export function modeUnlocked(p, mode) {
  if (mode === 's15') return true;
  if (mode === 'dungeon') return hasFeat(p, 'necromancer', FEAT.survivalHard);
  if (mode === 'ranked') return hasFeat(p, 'necromancer', FEAT.dungeon);
  return false;
}

// Whether a hero may enter a mode right now. In the Dungeon one of the ladder's five waits for
// the one before him to beat it; an extra goes down as soon as it is open.
export function canPlay(p, mode, hero) {
  if (!p.heroes.includes(hero) || !modeUnlocked(p, mode)) return false;
  if (mode !== 'dungeon' || hero === LADDER[0] || !LADDER.includes(hero)) return true;
  return hasFeat(p, prevHero(hero), FEAT.dungeon);
}

// The hero that five minutes with `hero` would bring in, or null.
export function unlocksNext(p, hero) {
  const next = HERO_ORDER[HERO_ORDER.indexOf(hero) + 1];
  return next && !p.heroes.includes(next) ? next : null;
}

// Whether a night of Survival has been won on Elite (a Nightmare's too).
export const wonElite = (p) => (p.wins.s15[DIFFICULTIES.indexOf('hard')] || 0) > 0;

// What the player should aim for next, or null once Ranked is open and a night has been won on Elite.
//   { type: 'survive' | 'survivalHard' | 'dungeon' | 'elite', hero, unlocks, minutes? }
export function nextGoal(p) {
  const next = nextHeroUnlock(p);
  const survive = next && { type: 'survive', hero: prevHero(next), unlocks: next, minutes: HERO_UNLOCK_TIME / 60 };
  // The ladder's five come first; the extras after them wait until the Dungeon and Ranked are open.
  if (next && LADDER.includes(next)) return survive;
  if (!modeUnlocked(p, 'dungeon')) return { type: 'survivalHard', hero: 'necromancer', unlocks: 'dungeon' };
  // Each clear of the ladder's five brings the next in; the Necromancer's opens Ranked.
  for (let i = 0; i < LADDER.length; i++) {
    const h = LADDER[i];
    if (!hasFeat(p, h, FEAT.dungeon)) return { type: 'dungeon', hero: h, unlocks: LADDER[i + 1] || 'ranked' };
  }
  // Ranked is always Elite (data/difficulty.js diffFor); before it, one night won on Elite, so the
  // endless night is not a player's first taste of it (the 27 October 2026 review, D10).
  return survive || (wonElite(p) ? null : { type: 'elite' });
}

// Everything currently open, as keys; applyRun diffs these to announce unlocks.
function openings(p) {
  const out = p.heroes.filter((h) => !BASE_HEROES.includes(h)).map((h) => 'hero:' + h);
  for (const m of MODES) if (m !== 's15' && modeUnlocked(p, m)) out.push('mode:' + m);
  if (modeUnlocked(p, 'dungeon')) {
    for (const h of LADDER.slice(1)) if (canPlay(p, 'dungeon', h)) out.push('dungeon:' + h);
  }
  // Every Survival map open but the ladder's first, open from the start (28 October 2026; the
  // results say "The Frostfell is open!", ui/ladder.js unlockText). A run without a map opens none,
  // and a save from before the maps has its own open before the run begins (sanitizeProfile), so
  // neither tells one.
  for (const m of MAP_ORDER.slice(1)) if (mapOpen(p, m)) out.push('map:' + m);
  return out;
}

export function rankTitle(seconds) {
  let title = RANKS[0][1];
  for (const [min, name] of RANKS) if (seconds >= min * 60) title = name;
  return title;
}

export function upgradeCost(id, rank) {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) return Infinity;
  // The first rank at a discount (PROGRESS.firstRank), so a little gold always buys something new.
  return rank === 0 ? Math.round(u.cost * PROGRESS.firstRank) : u.cost * (rank + 1);
}

// Whether an Armory upgrade is for sale: always, but a milestone's relic (`lock`) once reached.
export function upgradeOpen(profile, u) {
  if (!u.lock) return true;
  const i = LOCKS.findIndex((l) => l.id === u.lock);
  return i >= 0 && lockOpen(profile, i);
}

// How many Armory upgrades the gold in hand buys a rank of now: for sale (upgradeOpen) and not at
// their top (the results' armoryLine; the title's coin on UPGRADES, the review's C5, 28 October 2026).
export function affordableRanks(p) {
  return UPGRADES.filter((u) => (p.up?.[u.id] || 0) < u.max && upgradeOpen(p, u) && upgradeCost(u.id, p.up?.[u.id] || 0) <= (p.gold || 0)).length;
}

// A shared weapon left at home (on: true) or taken along again: one left at home is never offered
// in a run, at a level-up or in a chest. A hero's own signature is never one of them.
// The slots open with the kills counted as Veteran's (effort), each at its own total in
// PROGRESS.exclusionAt.
export function exclusionState(profile) {
  const effort = Math.max(0, Number(profile?.effort) || 0), at = PROGRESS.exclusionAt;
  const level = at.filter((n) => effort >= n).length;
  return { level, max: at.length, next: at[level] ?? null };
}

// Repeatable progression is separate from the one-time weapon and relic milestones.
export function exclusionEntry(profile) {
  const p = sanitizeProfile(profile), state = exclusionState(p);
  return {
    type: 'feature', id: 'exclusions', open: state.level > 0,
    // Worded as the kill milestones are (needText): the kills counted as Veteran's.
    need: state.next ? needText({ need: 'kills', at: state.next }) : 'All exclusion slots unlocked',
    progress: state.next ? Math.min(1, p.effort / state.next) : 1,
    ...state,
  };
}

export function setHome(profile, id, on) {
  const p = sanitizeProfile(profile);
  if (!SHARED_IDS.includes(id)) return { ok: false, profile: p, error: 'Unknown weapon' };
  if (on && !p.home.includes(id) && p.home.length >= exclusionState(p).level) {
    return { ok: false, profile: p, error: 'Unlock more exclusion slots by slaying monsters' };
  }
  if (on && !p.home.includes(id) && lastInPlay(p, id)) return { ok: false, profile: p, error: "A run keeps one weapon besides the hero's own" };
  p.home = p.home.filter((x) => x !== id);
  if (on) p.home.push(id);
  return { ok: true, profile: p };
}

export function buyUpgrade(profile, id) {
  const p = sanitizeProfile(profile);
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) return { ok: false, profile: p, error: 'Unknown upgrade' };
  const rank = p.up[id] || 0;
  if (rank >= u.max) return { ok: false, profile: p, error: 'Already at max rank' };
  if (!upgradeOpen(p, u)) return { ok: false, profile: p, error: 'Not yet for sale' };
  const cost = upgradeCost(id, rank);
  if (p.gold < cost) return { ok: false, profile: p, error: 'Not enough gold' };
  p.gold -= cost;
  p.up[id] = rank + 1;
  return { ok: true, profile: p };
}

// Every rank goes, and each is paid back at its price. The owner's (22 October 2026): Refund All
// must reset the whole Armory; the ranks given to a save from before (gift) go too, paid back as
// gold like the rest, so they can be bought again.
export function refundUpgrades(profile) {
  const p = sanitizeProfile(profile);
  let refunded = 0;
  for (const [id, rank] of Object.entries(p.up)) for (let r = 0; r < rank; r++) refunded += upgradeCost(id, r);
  p.gold = int(p.gold + refunded, 0, 1e9);
  p.up = {};
  p.gift = {};
  return { ok: true, profile: p, refunded };
}

// The next hero waiting to be unlocked, or null when all are free.
export function nextHeroUnlock(profile) {
  return HERO_ORDER.find((h) => !profile.heroes.includes(h)) || null;
}

// A finished run as reported by the client. Numbers are clamped to what a
// real run of that length could plausibly produce.
export function sanitizeRun(raw, armoryGreed = TOP_GREED) {
  if (!raw || typeof raw !== 'object') return null;
  if (!MODES.includes(raw.mode)) return null;
  // Normal ('easy'), Veteran ('medium') or Elite ('hard'); Ranked is always Elite. A run that names
  // none of them is Veteran's.
  const diff = raw.mode === 'ranked' ? 'hard' : DIFFICULTIES.includes(raw.diff) ? raw.diff : 'medium';
  const time = int(raw.time, 0, MAX_TIME[raw.mode]);
  // The night's clock stands still in a crypt, so a run can last longer than its time.
  const realTime = int(raw.realTime, time, MAX_REAL_TIME[raw.mode]);
  // At most one item from each crypt's lord, MAX_LORDS to a crypt; in the Dungeon, which has no
  // crypts, one from each of its three guardians.
  const found = raw.mode === 'dungeon' ? int(raw.found, 0, DUNGEON_GEAR) : int(raw.found, 0, MAX_LORDS * (Math.floor(realTime / SECS_PER_CRYPT) + 1));
  // A win only counts if the run lasted long enough to be one. Ranked never ends in victory.
  const victory = raw.mode !== 'ranked' && raw.victory === true && time >= MIN_WIN_TIME[raw.mode];
  // A Nightmare (data/difficulty.js), three times the monsters, only as a run says it was, and never on
  // Ranked. A win still counts as its difficulty's.
  // Elite's modifier (data/difficulty.js nightmareFor): a Normal or Veteran run is never one.
  const nightmare = raw.mode !== 'ranked' && diff === 'hard' && raw.nightmare === true;
  // The Survival map the night was spent on (data/maps.js; 28 October 2026): one of shared/
  // progress.js maps, in Survival only. None in another mode (Ranked and the Dungeon Run keep to the
  // Darkwood) or where a report names none (an older client, the bots, the tools): that night was
  // the Darkwood's, and credits no map (applyRun).
  const map = raw.mode === 's15' && MAP_IDS.includes(raw.map) ? raw.map : null;
  // 240 a second: four times the 60 it was, for the horde doubled twice (difficulty.js CROWD), and
  // kept so with Veteran's now two thirds of that (VETERAN_CROWD); a Nightmare three times that, and
  // a map that sends more its more (MAP_MORE).
  const kills = int(raw.kills, 0, 50 + time * 240 * (nightmare ? 3 : 1) * mapMore(map));
  return {
    mode: raw.mode,
    map,
    diff,
    nightmare,
    hero: isId(raw.hero) ? raw.hero : 'knight',
    victory,
    // Fallen, not quit: never a win.
    died: !victory && raw.died === true,
    time,
    // Selling what the crypts gave pays too; applyRun adds what selling worn gear paid.
    gold: int(raw.gold, 0, goldCap({ mode: raw.mode, time, realTime, found, map }, armoryGreed)),
    claim: int(raw.gold, 0, 1e9),
    kills,
    // His longest kill streak (Game.stats.maxCombo), for the record: never more than his kills.
    combo: int(raw.combo, 0, kills),
    level: int(raw.level, 1, 999),
    // Bosses and crypt lords slain (Game.stats.bosses), for the milestones: no more than a boss a
    // minute and a few, and every lord of every crypt the run could have reached (as `found`).
    bosses: int(raw.bosses, 0, 3 + Math.floor(time / 60) + (raw.mode === 'dungeon' ? 0 : MAX_LORDS * (Math.floor(realTime / SECS_PER_CRYPT) + 1))),
    floor: int(raw.floor, 1, 3),
    // His signature evolved (Game.signatureEvolved): it takes eight levels and a relic, so not in
    // the first two minutes.
    evolved: raw.evolved === true && time >= EVO_AFTER,
    // And every evolution held at the end (Game.result evos), likewise: known from then on
    // (knownEvos), and those a lock waits on kept in p.ev too.
    evos: time >= EVO_AFTER && Array.isArray(raw.evos) ? EVOS.filter((id) => raw.evos.includes(id)) : [],
    realTime,
    found,
    // null keeps the gear on record (an older client sends none).
    gear: raw.gear && typeof raw.gear === 'object' ? sanitizeGear(raw.gear) : null,
  };
}

export function runReward(run) {
  const multiplier = DIFF_GOLD[run.diff] * (run.nightmare ? NIGHTMARE_GOLD : 1);
  const collected = Math.round(run.gold * multiplier);
  // A wage for the time on the clock (PROGRESS.wage a second), at the same rate as the gold.
  const wage = Math.round(PROGRESS.wage * run.time * multiplier);
  const bonus = run.victory ? Math.round(VICTORY_BONUS[run.mode] * DIFF_BONUS[run.diff]) : 0;
  // `gold`: the gold credited, as picked up after the cap (sanitizeRun) and with any gear sold
  // (applyRun), for the results line to print what was paid for, not what was claimed.
  return { gold: run.gold, collected, wage, bonus, total: collected + wage + bonus, multiplier };
}

// What a run's kills count as, in Veteran's (PROGRESS.effort): each the difficulty's, a Nightmare's
// divided again by its three times the horde; and all of them at most what Veteran's horde could
// give in its time (sanitizeRun's kills): a forged Normal report, held to the kills a run of its
// length could make, would count eight times that (27 October 2026). From the plain numbers, so the
// game measures a lock's kills as it goes (Game.lockReached) with no object made each frame; map: the
// Survival map's id, whose more monsters (MAP_MORE) raise that most (none: the Darkwood's).
export const countedKills = (kills, time, diff, nightmare, map) => Math.min(Math.round(kills * PROGRESS.effort[diff] * (nightmare ? PROGRESS.nightmareEffort : 1)), 50 + time * 240 * mapMore(map));
const effortFor = (run) => countedKills(run.kills, run.time, run.diff, run.nightmare, run.map);

export function applyRun(profile, rawRun) {
  const p = sanitizeProfile(profile);
  // The caps at this save's own Armory Greed, and at its map's horde (MAP_MORE) only where that map is
  // open to it: a report from one still shut, which marks no map (below), is held to the Darkwood's,
  // as no night this save could have played sent more (the review of 28 October 2026).
  const run = sanitizeRun(rawRun && typeof rawRun === 'object' && !mapOpen(p, rawRun.map) ? { ...rawRun, map: null } : rawRun, metaBonuses(p).greed);
  if (!run) return { ok: false, profile: p, error: 'Invalid run' };
  if (!canPlay(p, run.mode, run.hero)) return { ok: false, profile: p, error: 'That mode is locked for this hero' };
  const before = new Set(openings(p));
  const ul0 = p.ul, uu0 = p.uu, pickedUp = run.gold;
  // The gear the hero wears at the end is theirs to keep, as long as no more of it is new than
  // the run found; whatever they wore coming in that is gone was sold, and its price may be in
  // the gold. Other heroes' gear is theirs alone.
  if (run.gear) {
    const worn = Object.values(p.gear[run.hero] || {}), end = Object.values(run.gear);
    const fresh = end.filter((it) => !worn.some((w) => sameItem(w, it))).length;
    if (fresh <= run.found) {
      const sold = worn.filter((w) => !end.some((it) => sameItem(w, it))).reduce((s, w) => s + itemPrice(w), 0);
      run.gold = Math.min(run.claim, run.gold + sold);
      if (end.length) p.gear[run.hero] = run.gear;
      else delete p.gear[run.hero];
    }
  }
  // Five minutes on the clock bring in the next hero.
  const next = unlocksNext(p, run.hero);
  if (next && run.time >= HERO_UNLOCK_TIME) p.heroes.push(next);
  const reward = runReward(run);
  p.gold = int(p.gold + reward.total, 0, 1e9);
  p.runs = int(p.runs + 1, 0, 1e7);
  p.kills = int(p.kills + run.kills, 0, 1e12);
  p.effort = int(p.effort + effortFor(run), 0, 1e12);
  if (run.died) p.deaths = int(p.deaths + 1, 0, 1e7);
  let personalBest = false;
  if (run.victory) {
    p.wins[run.mode][DIFFICULTIES.indexOf(run.diff)] += 1;
    // A night won on a Survival map open to this save is its mark there, which opens the next on
    // the ladder (mapsEarned, below). A run is never refused for its map (28 October 2026,
    // test/profile.test.js): one without a map (the tests, the bots, an older client), or on a map
    // still shut, is paid and counted as ever but marks no map.
    if (run.map && mapOpen(p, run.map)) p.mw = withBit(p.mw, winBit(run.map, DIFFICULTIES.indexOf(run.diff)));
    let f = p.feats[run.hero] || 0;
    if (run.mode === 's15') f |= FEAT.survivalHard;
    if (run.mode === 'dungeon') f |= FEAT.dungeon;
    const marks = WIN_MARKS[run.mode];
    f |= (marks[run.diff] || 0) | (run.nightmare ? marks.nightmare : 0);
    if (f) p.feats[run.hero] = f;
  }
  if (run.evolved) p.feats[run.hero] = (p.feats[run.hero] || 0) | FEAT.evolved;
  for (const id of run.evos) {
    p.ek = withEvo(p.ek, id);
    if (EVO_IDS.includes(id) && !p.ev.includes(id)) p.ev.push(id);
  }
  if (run.mode === 'dungeon') {
    const depth = run.victory ? 4 : run.floor;
    p.best.dungeon = Math.max(p.best.dungeon, depth);
  } else if (run.mode === 'ranked') {
    personalBest = run.time > (p.ranked[run.hero] || 0);
    if (personalBest) p.ranked[run.hero] = run.time;
  } else {
    p.best[run.mode] = Math.max(p.best[run.mode], Math.min(run.time, MAX_TIME[run.mode]));
  }
  p.best.kills = Math.max(p.best.kills, run.kills);
  p.best.level = Math.max(p.best.level, run.level);
  p.best.time = Math.max(p.best.time, run.time);
  // His longest run, any mode (the clock that brings in the next hero and opens his ultimate).
  if (run.time > 0) p.bt[run.hero] = Math.max(p.bt[run.hero] || 0, run.time);
  p.best.gold = Math.max(p.best.gold, pickedUp);
  p.best.bosses = Math.max(p.best.bosses, run.bosses);
  p.best.combo = Math.max(p.best.combo, run.combo);
  p.mo = mapsEarned(p); // the map after one with a night won on it, told with the rest (openings)
  reward.unlocks = openings(p).filter((k) => !before.has(k));
  // The milestones this run reached (shared/progress.js), for the results screen to announce:
  //   [{ type: 'weapon' | 'relic' | 'ult', id, need }]
  p.ul = orBits(p.ul, earnedBits(p));
  if (run.time >= PROGRESS.ultTime) p.uu |= heroBit(run.hero);
  reward.unlocked = [];
  LOCKS.forEach((l, i) => {
    if (lockOpen(p, i) && !hasBit(ul0, i)) reward.unlocked.push({ type: l.type, id: l.id, need: needText(l), ...(l.buy ? { buy: true } : {}) }); // buy: only put up for sale (the results say so)
  });
  if ((p.uu & ~uu0) !== 0) reward.unlocked.push({ type: 'ult', id: run.hero, need: needText({ need: 'time', at: PROGRESS.ultTime }) + ' with this hero' });
  if (run.mode === 'ranked') reward.ranked = { time: run.time, best: p.ranked[run.hero] || 0, personalBest, title: rankTitle(run.time) };
  return { ok: true, profile: p, reward, run };
}

export function totalWins(profile) {
  let n = 0;
  for (const m of WIN_MODES) for (const w of profile.wins[m]) n += w;
  return n;
}

// Multipliers the Armory grants at the start of every run.
export function metaBonuses(profile) {
  const r = (id) => profile?.up?.[id] || 0;
  return {
    might: 1 + 0.05 * r('might'),
    armor: r('armor'),
    maxHp: 1 + 0.1 * r('vitality'),
    regen: 0.1 * r('recovery'),
    cooldown: 1 - 0.03 * r('haste'),
    area: 1 + 0.05 * r('reach'),
    speed: 1 + 0.05 * r('swiftness'),
    magnet: 1 + 0.2 * r('magnet'),
    luck: 1 + 0.1 * r('fortune'),
    growth: 1 + 0.04 * r('wisdom'),
    greed: 1 + 0.1 * r('greed'),
    // All of a run's rerolls and banishes (none without the Armory since 21 October 2026), and
    // its weapon and relic slots (the game keeps to its six at most).
    reroll: PROGRESS.rerolls + r('reroll'),
    banish: PROGRESS.banishes + r('banish'),
    weaponSlots: PROGRESS.weaponSlots + r('arsenal'),
    relicSlots: PROGRESS.relicSlots + r('reliquary'),
    duration: 1 + 0.06 * r('endurance'),
    projSpeed: 1 + 0.06 * r('velocity'),
    amount: r('echo'),
    revival: r('revival'),
  };
}

// The longest state decodeState reads. It must fit the biggest cookie the game writes, the
// profile with all nine heroes in six legendaries (packProfile): about 3 200 characters encoded
// since the Survival maps (test/profile.test.js measures it and keeps a quarter spare, with about
// two characters to go: a new field needs room made first; test/server.test.js seals it). A
// browser keeps at most 4096 bytes a cookie, its name included, so nothing longer than this can
// be one of ours.
export const MAX_STATE = 4000;

// base64url(JSON). Our JSON is plain ASCII, so btoa/atob are safe here and
// exist both in browsers and in Node >= 16.
export function encodeState(obj) {
  return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeState(str) {
  if (typeof str !== 'string' || str.length > MAX_STATE || !/^[A-Za-z0-9_-]*$/.test(str)) return null;
  try {
    let s = str.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return JSON.parse(atob(s));
  } catch {
    return null;
  }
}
