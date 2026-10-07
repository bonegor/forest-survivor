// Profile rules shared by the Node server and the browser.
//
// Everything a player owns lives in a cookie, so the profile is deliberately
// tiny: gold, wins, a few records and the ranks bought in the Armory. Every
// function here is pure and treats its input as untrusted.

export const VERSION = 1;
export const DIFFICULTIES = ['easy', 'medium', 'hard'];
export const MODES = ['s15', 's30', 'dungeon'];
// Heroes unlock in this order, each costing three times the last.
export const HERO_ORDER = ['knight', 'archer', 'mage', 'rogue', 'necromancer'];
export const BASE_HEROES = ['knight'];
export const HERO_UNLOCKS = { archer: 500, mage: 1500, rogue: 4500, necromancer: 13500 };

// Permanent upgrades bought with gold. Rank n+1 costs `cost * (n + 1)`.
export const UPGRADES = [
  { id: 'might', name: 'Might', desc: '+5% damage', max: 5, cost: 150 },
  { id: 'armor', name: 'Armor', desc: '+1 armor', max: 3, cost: 250 },
  { id: 'vitality', name: 'Vitality', desc: '+10% max health', max: 3, cost: 180 },
  { id: 'recovery', name: 'Recovery', desc: '+0.1 health per second', max: 5, cost: 120 },
  { id: 'haste', name: 'Haste', desc: '-3% cooldowns', max: 3, cost: 300 },
  { id: 'reach', name: 'Reach', desc: '+5% area', max: 3, cost: 250 },
  { id: 'swiftness', name: 'Swiftness', desc: '+5% move speed', max: 2, cost: 200 },
  { id: 'magnet', name: 'Magnetism', desc: '+20% pickup range', max: 3, cost: 100 },
  { id: 'fortune', name: 'Fortune', desc: '+10% luck', max: 3, cost: 220 },
  { id: 'wisdom', name: 'Wisdom', desc: '+4% experience', max: 5, cost: 160 },
  { id: 'greed', name: 'Greed', desc: '+10% gold', max: 5, cost: 130 },
  { id: 'reroll', name: 'Insight', desc: '+1 level-up reroll', max: 3, cost: 250 },
  { id: 'revival', name: 'Second Wind', desc: 'Revive once per run', max: 1, cost: 1800 },
];

const DIFF_GOLD = { easy: 0.75, medium: 1, hard: 1.5 };
const VICTORY_BONUS = { s15: 200, s30: 500, dungeon: 400 };
const DIFF_BONUS = { easy: 1, medium: 1.5, hard: 2.5 };
// Upper bounds used to reject absurd run reports.
const MAX_TIME = { s15: 16 * 60, s30: 31 * 60, dungeon: 3 * 60 * 60 };
const MAX_GOLD_PER_SEC = 12;
const MIN_WIN_TIME = { s15: 15 * 60 - 5, s30: 30 * 60 - 5, dungeon: 4 * 60 };

const int = (v, lo, hi) => {
  v = Math.floor(Number(v));
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
};
const isId = (s) => typeof s === 'string' && /^[a-z0-9]{2,16}$/.test(s);

export function defaultProfile() {
  return {
    v: VERSION,
    gold: 0,
    wins: { s15: [0, 0, 0], s30: [0, 0, 0], dungeon: [0, 0, 0] },
    runs: 0,
    kills: 0,
    best: { s15: 0, s30: 0, dungeon: 0, kills: 0, level: 0 },
    up: {},
    heroes: [...BASE_HEROES],
  };
}

export function sanitizeProfile(raw) {
  const p = defaultProfile();
  if (!raw || typeof raw !== 'object') return p;
  p.gold = int(raw.gold, 0, 1e9);
  for (const m of MODES) {
    for (let i = 0; i < 3; i++) p.wins[m][i] = int(raw.wins?.[m]?.[i], 0, 1e6);
  }
  p.runs = int(raw.runs, 0, 1e7);
  p.kills = int(raw.kills, 0, 1e12);
  p.best.s15 = int(raw.best?.s15, 0, MAX_TIME.s15);
  p.best.s30 = int(raw.best?.s30, 0, MAX_TIME.s30);
  p.best.dungeon = int(raw.best?.dungeon, 0, 4);
  p.best.kills = int(raw.best?.kills, 0, 1e7);
  p.best.level = int(raw.best?.level, 0, 999);
  for (const u of UPGRADES) {
    const r = int(raw.up?.[u.id], 0, u.max);
    if (r) p.up[u.id] = r;
  }
  if (Array.isArray(raw.heroes)) {
    for (const h of raw.heroes) if (HERO_UNLOCKS[h] && !p.heroes.includes(h)) p.heroes.push(h);
  }
  return p;
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

export function unlockHero(profile, id) {
  const p = sanitizeProfile(profile);
  const cost = HERO_UNLOCKS[id];
  if (!cost) return { ok: false, profile: p, error: 'Unknown hero' };
  if (p.heroes.includes(id)) return { ok: false, profile: p, error: 'Already unlocked' };
  if (nextHeroUnlock(p) !== id) return { ok: false, profile: p, error: 'Unlock the previous hero first' };
  if (p.gold < cost) return { ok: false, profile: p, error: 'Not enough gold' };
  p.gold -= cost;
  p.heroes.push(id);
  return { ok: true, profile: p };
}

// A finished run as reported by the client. Numbers are clamped to what a
// real run of that length could plausibly produce.
export function sanitizeRun(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!MODES.includes(raw.mode) || !DIFFICULTIES.includes(raw.diff)) return null;
  const time = int(raw.time, 0, MAX_TIME[raw.mode]);
  // A win only counts if the run lasted long enough to be one.
  const victory = raw.victory === true && time >= MIN_WIN_TIME[raw.mode];
  return {
    mode: raw.mode,
    diff: raw.diff,
    hero: isId(raw.hero) ? raw.hero : 'knight',
    victory,
    time,
    gold: int(raw.gold, 0, 100 + time * MAX_GOLD_PER_SEC),
    kills: int(raw.kills, 0, 50 + time * 60),
    level: int(raw.level, 1, 999),
    floor: int(raw.floor, 1, 3),
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
  const reward = runReward(run);
  p.gold = int(p.gold + reward.total, 0, 1e9);
  p.runs = int(p.runs + 1, 0, 1e7);
  p.kills = int(p.kills + run.kills, 0, 1e12);
  if (run.victory) p.wins[run.mode][DIFFICULTIES.indexOf(run.diff)] += 1;
  if (run.mode === 'dungeon') {
    const depth = run.victory ? 4 : run.floor;
    p.best.dungeon = Math.max(p.best.dungeon, depth);
  } else {
    p.best[run.mode] = Math.max(p.best[run.mode], Math.min(run.time, MAX_TIME[run.mode]));
  }
  p.best.kills = Math.max(p.best.kills, run.kills);
  p.best.level = Math.max(p.best.level, run.level);
  return { ok: true, profile: p, reward, run };
}

export function totalWins(profile) {
  let n = 0;
  for (const m of MODES) for (const w of profile.wins[m]) n += w;
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
    revival: r('revival'),
  };
}

// A saved run ("Save & Quit", dungeon floor checkpoints, survival autosave).
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
  return {
    v: VERSION,
    mode: raw.mode,
    diff: raw.diff,
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
    ts: int(raw.ts, 0, 2 ** 52),
  };
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
