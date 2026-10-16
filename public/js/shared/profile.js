// Profile rules shared by the Node server and the browser.
//
// Everything a player owns lives in a cookie, so the profile is deliberately
// tiny: gold, wins, a few records, per-hero achievements, the ranks bought
// in the Armory and the gear each hero wears (shared/items.js; heroes don't
// share it). Every function here is pure and treats its input as untrusted.
//
// The ladder:
//  1. Everyone starts with the Knight in 15-minute Survival.
//  2. Five minutes on the clock with a hero unlock the next hero.
//  3. Surviving the night with the Necromancer opens the Dungeon, for the Knight.
//  4. Beating the Dungeon with a hero opens it for the next.
//  5. Beating the Dungeon with the Necromancer opens Ranked: endless, any hero,
//     personal bests.
//
// There is one difficulty for now (data/difficulty.js). Runs are recorded as
// Hard, so saves keep their shape and old Easy/Medium wins stay on record.

import { RARITIES, LEGENDARY, sanitizeGear, packGear, sameItem, itemPrice } from './items.js';

// 3: each hero's own gear, and heroes unlocked by time (2: one set of gear, heroes bought).
export const VERSION = 3;
export const DIFFICULTIES = ['easy', 'medium', 'hard'];
export const MODES = ['s15', 'dungeon', 'ranked'];
export const WIN_MODES = ['s15', 'dungeon']; // Ranked has no victory, only a time
// Heroes unlock in this order: a run with one that lasts this long on the clock (seconds)
// brings in the next.
export const HERO_ORDER = ['knight', 'archer', 'mage', 'rogue', 'necromancer'];
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
  { id: 'endurance', name: 'Endurance', desc: '+6% effect duration', max: 5, cost: 160 },
  { id: 'velocity', name: 'Velocity', desc: '+6% projectile speed', max: 3, cost: 120 },
  { id: 'echo', name: 'Echo', desc: '+1 projectile for every weapon', max: 1, cost: 2500 },
  { id: 'revival', name: 'Second Wind', desc: '+1 revive per run', max: 2, cost: 1800 },
];

const DIFF_GOLD = { easy: 0.75, medium: 1, hard: 1.5 };
const VICTORY_BONUS = { s15: 200, dungeon: 400 };
const DIFF_BONUS = { easy: 1, medium: 1.5, hard: 2.5 };
// Upper bounds used to reject absurd run reports.
const MAX_TIME = { s15: 16 * 60, dungeon: 3 * 60 * 60, ranked: 4 * 60 * 60 };
// A run's time played, crypts included (the night's clock stands still in them): the
// 15-minute night with at most an hour and three quarters below ground; the Dungeon has none.
const MAX_REAL_TIME = { s15: 2 * 60 * 60, dungeon: MAX_TIME.dungeon, ranked: MAX_TIME.ranked };
// A crypt's lord gives one piece of gear, and the next crypt is about a minute's walk on.
const SECS_PER_FIND = 45;
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

// The profile as its cookie keeps it, every hero's gear packed small (shared/items.js): five
// heroes in six legendaries each still fit.
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

// Whether a hero may enter a mode right now.
export function canPlay(p, mode, hero) {
  if (!p.heroes.includes(hero) || !modeUnlocked(p, mode)) return false;
  if (mode !== 'dungeon' || hero === HERO_ORDER[0]) return true;
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
  if (next) return { type: 'survive', hero: prevHero(next), unlocks: next, minutes: HERO_UNLOCK_TIME / 60 };
  if (!modeUnlocked(p, 'dungeon')) return { type: 'survivalHard', hero: 'necromancer', unlocks: 'dungeon' };
  // Each clear brings the next hero in; the Necromancer's opens Ranked.
  for (let i = 0; i < HERO_ORDER.length; i++) {
    const h = HERO_ORDER[i];
    if (!hasFeat(p, h, FEAT.dungeon)) return { type: 'dungeon', hero: h, unlocks: HERO_ORDER[i + 1] || 'ranked' };
  }
  return null;
}

// Everything currently open, as keys; applyRun diffs these to announce unlocks.
function openings(p) {
  const out = p.heroes.filter((h) => !BASE_HEROES.includes(h)).map((h) => 'hero:' + h);
  for (const m of MODES) if (m !== 's15' && modeUnlocked(p, m)) out.push('mode:' + m);
  if (modeUnlocked(p, 'dungeon')) {
    for (const h of HERO_ORDER.slice(1)) if (canPlay(p, 'dungeon', h)) out.push('dungeon:' + h);
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
  // Normal ('medium') or Veteran ('hard'); Ranked is always Veteran, and so is anything else.
  const diff = raw.diff === 'medium' && raw.mode !== 'ranked' ? 'medium' : 'hard';
  const time = int(raw.time, 0, MAX_TIME[raw.mode]);
  // The night's clock stands still in a crypt, so a run can last longer than its time.
  const realTime = int(raw.realTime, time, MAX_REAL_TIME[raw.mode]);
  // At most one item from each crypt's lord, and the Dungeon has no crypts.
  const found = raw.mode === 'dungeon' ? 0 : int(raw.found, 0, Math.floor(realTime / SECS_PER_FIND) + 1);
  // A win only counts if the run lasted long enough to be one. Ranked never ends in victory.
  const victory = raw.mode !== 'ranked' && raw.victory === true && time >= MIN_WIN_TIME[raw.mode];
  return {
    mode: raw.mode,
    diff,
    hero: isId(raw.hero) ? raw.hero : 'knight',
    victory,
    time,
    // Selling what the crypts gave pays too; applyRun adds what selling worn gear paid.
    gold: int(raw.gold, 0, 100 + realTime * MAX_GOLD_PER_SEC + found * RARITIES[LEGENDARY].price),
    claim: int(raw.gold, 0, 1e9),
    kills: int(raw.kills, 0, 50 + time * 60),
    level: int(raw.level, 1, 999),
    floor: int(raw.floor, 1, 3),
    realTime,
    found,
    // null keeps the gear on record (an older client sends none).
    gear: raw.gear && typeof raw.gear === 'object' ? sanitizeGear(raw.gear) : null,
  };
}

export function runReward(run) {
  const collected = Math.round(run.gold * DIFF_GOLD[run.diff]);
  const bonus = run.victory ? Math.round(VICTORY_BONUS[run.mode] * DIFF_BONUS[run.diff]) : 0;
  return { collected, bonus, total: collected + bonus, multiplier: DIFF_GOLD[run.diff] };
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
    duration: 1 + 0.06 * r('endurance'),
    projSpeed: 1 + 0.06 * r('velocity'),
    amount: r('echo'),
    revival: r('revival'),
  };
}

// Crypts and shrines by their crossroads ('i,j'), the latest n of them (the nearest by then).
const crossroads = (a, n) => (Array.isArray(a) ? a.filter((k) => typeof k === 'string' && /^-?\d{1,5},-?\d{1,5}$/.test(k)).slice(-n) : []);
const cryptKeys = (a) => crossroads(a, 64);

// What a sealed cookie can hold: at most 4096 characters, so about 3 000 of JSON.
const MAX_SAVE_JSON = 2900;

// A run saved to pick up again if the game is closed mid-run: the Survival and Ranked
// autosave every minute, and the Dungeon's at each floor.
export function sanitizeCheckpoint(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!MODES.includes(raw.mode) || !DIFFICULTIES.includes(raw.diff) || !isId(raw.hero)) return null;
  const items = (arr) =>
    Array.isArray(arr)
      ? arr
          .filter((e) => Array.isArray(e) && isId(e[0]))
          .slice(0, 6)
          .map((e) => [e[0], int(e[1], 1, 8), e[2] ? 1 : 0])
      : [];
  const cp = {
    v: VERSION,
    mode: raw.mode,
    diff: raw.diff === 'medium' && raw.mode !== 'ranked' ? 'medium' : 'hard',
    hero: raw.hero,
    floor: int(raw.floor, 1, 3),
    seed: int(raw.seed, 0, 2 ** 31 - 1),
    time: int(raw.time, 0, MAX_TIME[raw.mode]),
    level: int(raw.level, 1, 999),
    xp: int(raw.xp, 0, 1e7),
    hp: int(raw.hp, 1, 1e5),
    gold: int(raw.gold, 0, 1e6),
    kills: int(raw.kills, 0, 1e7),
    fury: int(raw.fury, 0, 100),
    rerolls: int(raw.rerolls, 0, 99),
    weapons: items(raw.weapons),
    passives: items(raw.passives),
    bless: int(raw.bless, 0, 999),
    // The filler the player chose for every level-up once nothing else is left (Game FILLERS).
    auto: ['bless', 'heal', 'gold'].includes(raw.auto) ? raw.auto : null,
    // The level a Phoenix Heart was spent at this run (null: none was).
    phoenixLostAt: Number.isFinite(raw.phoenixLostAt) ? int(raw.phoenixLostAt, 1, 999) : null,
    gear: sanitizeGear(raw.gear),
    cleared: cryptKeys(raw.cleared),
    lost: cryptKeys(raw.lost),
    found: int(raw.found, 0, 64),
    cryptTime: int(raw.cryptTime, 0, MAX_TIME.ranked),
    // null: a save from before the boss schedule was kept.
    bossIdx: Number.isFinite(raw.bossIdx) ? int(raw.bossIdx, 0, 999) : null,
    bosses: Array.isArray(raw.bosses)
      ? raw.bosses.filter((b) => Array.isArray(b) && isId(b[0]) && Number.isFinite(b[1])).slice(0, 4).map(([id, left]) => [id, Math.min(1, Math.max(0.001, left))])
      : [],
    shrines: crossroads(raw.shrines, 48),
    ts: int(raw.ts, 0, 2 ** 52),
  };
  // Too big for its cookie (a very long run): the oldest shrines give way first, then the
  // oldest crypts, all far behind the hero by then.
  const fits = () => JSON.stringify(cp).length <= MAX_SAVE_JSON;
  while (!fits() && cp.shrines.length) cp.shrines.shift();
  while (!fits() && (cp.cleared.length || cp.lost.length)) {
    cp.cleared.shift();
    cp.lost.shift();
  }
  return cp;
}

// base64url(JSON). Our JSON is plain ASCII, so btoa/atob are safe here and
// exist both in browsers and in Node >= 16.
export function encodeState(obj) {
  return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeState(str) {
  if (typeof str !== 'string' || str.length > 3500 || !/^[A-Za-z0-9_-]*$/.test(str)) return null;
  try {
    let s = str.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return JSON.parse(atob(s));
  } catch {
    return null;
  }
}
