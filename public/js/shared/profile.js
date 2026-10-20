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
// Two difficulties (data/difficulty.js): Normal is recorded as the old Medium,
// Veteran as the old Hard, so saves keep their shape and old Easy wins stay on record.
// A Nightmare (twice the monsters, on either) is recorded as its difficulty, and pays a
// little more gold (NIGHTMARE_GOLD).

import { RARITIES, LEGENDARY, MAX_LORDS, sanitizeGear, packGear, sameItem, itemPrice } from './items.js';

// 3: each hero's own gear, and heroes unlocked by time (2: one set of gear, heroes bought).
export const VERSION = 3;
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
// Per-hero achievements, stored as bit flags. survivalHard is any night won
// (once only Hard counted); dungeonHard (4) lingers in old saves, unused.
export const FEAT = { survivalHard: 1, dungeon: 2, dungeonHard: 4 };
// Ranked titles by minutes survived.
export const RANKS = [
  [0, 'Peasant'], [5, 'Squire'], [10, 'Knight'], [15, 'Champion'], [20, 'Paladin'],
  [25, 'Warlord'], [30, 'Hero'], [40, 'Legend'], [50, 'Mythic'], [60, 'Immortal'],
];

// Permanent upgrades bought with gold. Rank n+1 costs `cost * (n + 1)`.
export const UPGRADES = [
  { id: 'might', name: 'Might', desc: '+5% damage', max: 8, cost: 150 },
  { id: 'armor', name: 'Armor', desc: '+1 armor', max: 5, cost: 250 },
  { id: 'vitality', name: 'Vitality', desc: '+10% max health', max: 5, cost: 180 },
  { id: 'recovery', name: 'Recovery', desc: '+0.1 health per second', max: 8, cost: 120 },
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
const MAX_GOLD_PER_SEC = 12;
const MIN_WIN_TIME = { s15: 15 * 60 - 5, dungeon: 4 * 60 };

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
    best: { s15: 0, dungeon: 0, kills: 0, level: 0 },
    up: {},
    heroes: [...BASE_HEROES],
    feats: {}, // hero -> FEAT bits
    ranked: {}, // hero -> best Ranked time in seconds
    gear: {}, // hero -> slot -> the item that hero wears there (shared/items.js)
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
  p.best.s15 = int(raw.best?.s15, 0, MAX_TIME.s15);
  p.best.dungeon = int(raw.best?.dungeon, 0, 4);
  p.best.kills = int(raw.best?.kills, 0, 1e7);
  p.best.level = int(raw.best?.level, 0, 999);
  for (const u of UPGRADES) {
    const r = int(raw.up?.[u.id], 0, u.max);
    if (r) p.up[u.id] = r;
  }
  if (Array.isArray(raw.heroes)) {
    for (const h of raw.heroes) if (HERO_ORDER.includes(h) && !p.heroes.includes(h)) p.heroes.push(h);
  }
  for (const h of HERO_ORDER) {
    const f = int(raw.feats?.[h], 0, 7);
    if (f) p.feats[h] = f;
    const t = int(raw.ranked?.[h], 0, MAX_TIME.ranked);
    if (t) p.ranked[h] = t;
  }
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
  return p;
}

// The profile as its cookie keeps it, every hero's gear packed into a string (shared/items.js
// packGear): all nine heroes in six legendaries each still fit. A cookie written before, each
// item an array, reads back all the same (sanitizeGear takes both).
export function packProfile(p) {
  return { ...p, gear: Object.fromEntries(Object.entries(p.gear || {}).map(([h, g]) => [h, packGear(g)])) };
}

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

// What the player should aim for next, or null once Ranked is open.
//   { type: 'survive' | 'survivalHard' | 'dungeon', hero, unlocks, minutes? }
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
  return survive || null;
}

// Everything currently open, as keys; applyRun diffs these to announce unlocks.
function openings(p) {
  const out = p.heroes.filter((h) => !BASE_HEROES.includes(h)).map((h) => 'hero:' + h);
  for (const m of MODES) if (m !== 's15' && modeUnlocked(p, m)) out.push('mode:' + m);
  if (modeUnlocked(p, 'dungeon')) {
    for (const h of LADDER.slice(1)) if (canPlay(p, 'dungeon', h)) out.push('dungeon:' + h);
  }
  return out;
}

export function rankTitle(seconds) {
  let title = RANKS[0][1];
  for (const [min, name] of RANKS) if (seconds >= min * 60) title = name;
  return title;
}

export function upgradeCost(id, rank) {
  const u = UPGRADES.find((x) => x.id === id);
  return u ? u.cost * (rank + 1) : Infinity;
}

export function buyUpgrade(profile, id) {
  const p = sanitizeProfile(profile);
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) return { ok: false, profile: p, error: 'Unknown upgrade' };
  const rank = p.up[id] || 0;
  if (rank >= u.max) return { ok: false, profile: p, error: 'Already at max rank' };
  const cost = upgradeCost(id, rank);
  if (p.gold < cost) return { ok: false, profile: p, error: 'Not enough gold' };
  p.gold -= cost;
  p.up[id] = rank + 1;
  return { ok: true, profile: p };
}

export function refundUpgrades(profile) {
  const p = sanitizeProfile(profile);
  let refunded = 0;
  for (const [id, rank] of Object.entries(p.up)) {
    for (let r = 0; r < rank; r++) refunded += upgradeCost(id, r);
  }
  p.gold = int(p.gold + refunded, 0, 1e9);
  p.up = {};
  return { ok: true, profile: p, refunded };
}

// The next hero waiting to be unlocked, or null when all are free.
export function nextHeroUnlock(profile) {
  return HERO_ORDER.find((h) => !profile.heroes.includes(h)) || null;
}

// A finished run as reported by the client. Numbers are clamped to what a
// real run of that length could plausibly produce.
export function sanitizeRun(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!MODES.includes(raw.mode)) return null;
  // Normal ('medium') or Veteran ('hard'); Ranked is always Veteran. Veteran pays half as much
  // again, so only a run that says it was one is paid as one: anything else is Normal.
  const diff = raw.mode === 'ranked' || raw.diff === 'hard' ? 'hard' : 'medium';
  const time = int(raw.time, 0, MAX_TIME[raw.mode]);
  // The night's clock stands still in a crypt, so a run can last longer than its time.
  const realTime = int(raw.realTime, time, MAX_REAL_TIME[raw.mode]);
  // At most one item from each crypt's lord, MAX_LORDS to a crypt, and the Dungeon has no crypts.
  const found = raw.mode === 'dungeon' ? 0 : int(raw.found, 0, MAX_LORDS * (Math.floor(realTime / SECS_PER_CRYPT) + 1));
  // A win only counts if the run lasted long enough to be one. Ranked never ends in victory.
  const victory = raw.mode !== 'ranked' && raw.victory === true && time >= MIN_WIN_TIME[raw.mode];
  // A Nightmare (data/difficulty.js), twice the monsters, only as a run says it was, and never on
  // Ranked. A win still counts as its difficulty's.
  const nightmare = raw.mode !== 'ranked' && raw.nightmare === true;
  return {
    mode: raw.mode,
    diff,
    nightmare,
    hero: isId(raw.hero) ? raw.hero : 'knight',
    victory,
    time,
    // Selling what the crypts gave pays too; applyRun adds what selling worn gear paid.
    gold: int(raw.gold, 0, 100 + realTime * MAX_GOLD_PER_SEC + found * RARITIES[LEGENDARY].price),
    claim: int(raw.gold, 0, 1e9),
    // 240 a second: four times the 60 it was, for the horde doubled twice (difficulty.js CROWD); a
    // Nightmare twice that.
    kills: int(raw.kills, 0, 50 + time * 240 * (nightmare ? 2 : 1)),
    level: int(raw.level, 1, 999),
    floor: int(raw.floor, 1, 3),
    realTime,
    found,
    // null keeps the gear on record (an older client sends none).
    gear: raw.gear && typeof raw.gear === 'object' ? sanitizeGear(raw.gear) : null,
  };
}

export function runReward(run) {
  const multiplier = DIFF_GOLD[run.diff] * (run.nightmare ? NIGHTMARE_GOLD : 1);
  const collected = Math.round(run.gold * multiplier);
  const bonus = run.victory ? Math.round(VICTORY_BONUS[run.mode] * DIFF_BONUS[run.diff]) : 0;
  return { collected, bonus, total: collected + bonus, multiplier };
}

export function applyRun(profile, rawRun) {
  const p = sanitizeProfile(profile);
  const run = sanitizeRun(rawRun);
  if (!run) return { ok: false, profile: p, error: 'Invalid run' };
  if (!canPlay(p, run.mode, run.hero)) return { ok: false, profile: p, error: 'That mode is locked for this hero' };
  const before = new Set(openings(p));
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
  let personalBest = false;
  if (run.victory) {
    p.wins[run.mode][DIFFICULTIES.indexOf(run.diff)] += 1;
    let f = p.feats[run.hero] || 0;
    if (run.mode === 's15') f |= FEAT.survivalHard;
    if (run.mode === 'dungeon') f |= FEAT.dungeon;
    if (f) p.feats[run.hero] = f;
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
  reward.unlocks = openings(p).filter((k) => !before.has(k));
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
    reroll: r('reroll'),
    banish: r('banish'),
    duration: 1 + 0.06 * r('endurance'),
    projSpeed: 1 + 0.06 * r('velocity'),
    amount: r('echo'),
    revival: r('revival'),
  };
}

// The longest state decodeState reads. It must fit the biggest cookie the game writes, the
// profile with all nine heroes in six legendaries (packProfile): about 3 000 characters encoded
// (test/profile.test.js measures it and keeps a quarter spare; test/server.test.js seals it). A
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
