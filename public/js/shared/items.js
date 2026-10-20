// Gear: what the bosses of the crypts drop. Six slots, one item each, five
// rarities. Each hero keeps what they wear from run to run, so these rules are
// shared by the browser and the Node server, which checks every item it saves.
// Every function here is pure and treats its input as untrusted.

// What each of a crypt's lords leaves besides its coins and gold, rolled lord by lord, every
// lord alike and whatever the hero's luck (Game.lordDefeated): the user's "50% both a gear item
// and a champion's chest, 25% item only, 25% chest only" (16 October 2026). The odds add up to 1.
export const LORD_DROPS = [
  { odds: 0.5, item: true, chest: true },
  { odds: 0.25, item: true, chest: false },
  { odds: 0.25, item: false, chest: true },
];
// The most lords a crypt holds (dungeon.js cryptLords). Each drops one piece of gear at most, so
// a run finds no more than this many for each crypt it could have reached (profile.js sanitizeRun).
export const MAX_LORDS = 4;

// What a lord drops (a row of LORD_DROPS), for a roll r in [0, 1).
export function lordDrop(r) {
  for (const d of LORD_DROPS) {
    if (r < d.odds) return d;
    r -= d.odds;
  }
  return LORD_DROPS[LORD_DROPS.length - 1];
}

export const SLOTS = ['helm', 'armor', 'gloves', 'boots', 'amulet', 'ring'];
export const SLOT_NAMES = { helm: 'Helm', armor: 'Armor', gloves: 'Gloves', boots: 'Boots', amulet: 'Amulet', ring: 'Ring' };

// `affixes` stats each, rolled `mul` times as high as a common's; `price` in gold when sold.
export const RARITIES = [
  { id: 'common', name: 'Common', color: '#c0cbdc', affixes: 1, mul: 1, price: 20 },
  { id: 'uncommon', name: 'Uncommon', color: '#63c74d', affixes: 2, mul: 1.2, price: 50 },
  { id: 'rare', name: 'Rare', color: '#0099db', affixes: 3, mul: 1.45, price: 120 },
  { id: 'epic', name: 'Epic', color: '#b55088', affixes: 3, mul: 1.8, price: 300 },
  { id: 'legendary', name: 'Legendary', color: '#f77622', affixes: 4, mul: 2.2, price: 750 },
];
export const LEGENDARY = RARITIES.length - 1;

// A stat's value is whole percent, except armor (points) and regen (tenths of
// health per second). lo..hi is a common item's roll.
export const STATS = {
  might: { name: 'damage', lo: 3, hi: 6 },
  armor: { name: 'armor', lo: 1, hi: 1, unit: 'flat' },
  maxHp: { name: 'health', lo: 5, hi: 10 },
  regen: { name: 'health per second', lo: 1, hi: 2, unit: 'tenth' },
  cooldown: { name: 'cooldowns', lo: 2, hi: 4, minus: true },
  area: { name: 'area', lo: 3, hi: 6 },
  speed: { name: 'move speed', lo: 2, hi: 4 },
  magnet: { name: 'pickup range', lo: 8, hi: 15 },
  luck: { name: 'luck', lo: 4, hi: 8 },
  crit: { name: 'crit chance', lo: 1, hi: 3 },
  growth: { name: 'experience', lo: 3, hi: 6 },
  greed: { name: 'gold', lo: 5, hi: 10 },
  duration: { name: 'effect duration', lo: 3, hi: 6 },
  projSpeed: { name: 'projectile speed', lo: 4, hi: 8 },
};

// The stats each slot can roll.
export const POOLS = {
  helm: ['maxHp', 'armor', 'growth', 'cooldown', 'regen', 'luck'],
  armor: ['armor', 'maxHp', 'regen', 'duration', 'area'],
  gloves: ['might', 'crit', 'cooldown', 'area', 'projSpeed'],
  boots: ['speed', 'magnet', 'armor', 'duration', 'regen'],
  amulet: ['might', 'area', 'duration', 'luck', 'growth', 'maxHp'],
  ring: ['crit', 'luck', 'greed', 'might', 'regen', 'magnet'],
};

// A legendary's power, on top of its four stats. `stat` is in the hero's own units.
export const POWERS = {
  echo: { text: '+1 projectile for every weapon', stat: { amount: 1 } },
  wrath: { text: 'Critical hits deal +40% damage', stat: { critMult: 0.4 } },
  undying: { text: 'Rise once more when you fall', stat: { revival: 1 } },
  titan: { text: '+20% health and +2 armor', stat: { maxHp: 0.2, armor: 2 } },
};

const BASES = {
  helm: ['Leather Cap', 'Iron Helm', 'Barbute', 'Great Helm'],
  armor: ['Padded Jerkin', 'Chain Shirt', 'Scale Mail', 'Plate Armor'],
  gloves: ['Wool Gloves', 'Leather Gloves', 'Chain Gloves', 'Gauntlets'],
  boots: ['Sandals', 'Leather Boots', 'Riding Boots', 'Greaves'],
  amulet: ['Charm', 'Pendant', 'Talisman', 'Amulet'],
  ring: ['Copper Ring', 'Silver Ring', 'Gold Ring', 'Signet'],
};
const LEGENDS = {
  helm: ['Crown of Ossarian', 'Helm of the Long Night', 'Visage of Malgrath'],
  armor: ["Grimgut's Hide", 'Aegis of Dawn', 'Mantle of the Darkwood'],
  gloves: ['Hands of the Lich', 'Cinder Grips', "Executioner's Grasp"],
  boots: ['Cinderstride', 'Treads of the Wild Hunt', 'Moonwalkers'],
  amulet: ['Heart of the Darkwood', "Azgaroth's Ember", 'Eye of the Barrow'],
  ring: ['Ring of the Long Night', 'Band of Ages', 'Seal of the Bone King'],
};
const OF = {
  might: 'of Might', armor: 'of the Bulwark', maxHp: 'of Vigor', regen: 'of Mending', cooldown: 'of Haste',
  area: 'of Reach', speed: 'of the Hare', magnet: 'of the Lodestone', luck: 'of Fortune', crit: 'of Precision',
  growth: 'of Wisdom', greed: 'of Greed', duration: 'of Ages', projSpeed: 'of the Hawk',
};

// The range a stat rolls at a rarity.
export function statRange(stat, rarity) {
  const s = STATS[stat], m = RARITIES[rarity].mul;
  const lo = Math.max(1, Math.round(s.lo * m));
  return [lo, Math.max(lo, Math.round(s.hi * m))];
}

// Rarity odds improve later in the night (`minute`) and in crypts farther from the
// start (`depth` 1 for the nearest ring), and with nothing else: the hero's luck plays no part
// in what a crypt's lords leave, their gear, their drop or their chest (the user, 16 October
// 2026: "It should be RNG, but no luck effect").
const BASE_ODDS = [55, 30, 12, 3, 0.5];
const BOOST = [-0.75, 0.1, 2, 5, 12];
export function rarityOdds(minute, depth = 1) {
  const s = Math.max(0, minute / 15 + (depth - 1) * 0.15);
  const w = BASE_ODDS.map((b, i) => b * Math.max(0.1, 1 + s * BOOST[i]));
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map((v) => v / sum);
}

// A new item. `rng` is a mulberry32-style generator: rng() in [0, 1) with rng.int(lo, hi).
export function rollItem(rng, { minute = 0, depth = 1, slot = null } = {}) {
  const odds = rarityOdds(minute, depth);
  let r = rng(), rarity = 0;
  while (rarity < LEGENDARY && r >= odds[rarity]) r -= odds[rarity++];
  slot = SLOTS.includes(slot) ? slot : SLOTS[rng.int(0, SLOTS.length - 1)];
  const pool = POOLS[slot].slice();
  const stats = {};
  for (let k = 0; k < RARITIES[rarity].affixes; k++) {
    const id = pool.splice(rng.int(0, pool.length - 1), 1)[0];
    const [lo, hi] = statRange(id, rarity);
    stats[id] = rng.int(lo, hi);
  }
  const names = Object.keys(POWERS);
  return { slot, rarity, stats, power: rarity === LEGENDARY ? names[rng.int(0, names.length - 1)] : null, seed: rng.int(0, 999999) };
}

export function itemName(it) {
  if (it.rarity === LEGENDARY) return LEGENDS[it.slot][it.seed % LEGENDS[it.slot].length];
  const base = BASES[it.slot][Math.min(it.rarity, BASES[it.slot].length - 1)];
  return it.rarity === 0 ? base : `${base} ${OF[Object.keys(it.stats)[0]]}`;
}

export const itemPrice = (it) => RARITIES[it.rarity].price;

// '+12% damage', '+2 armor', '+0.3 health per second', '-4% cooldowns'.
export function statText(id, v) {
  const s = STATS[id];
  const n = s.unit === 'tenth' ? (v / 10).toFixed(1) : String(v);
  return `${s.minus ? '-' : '+'}${n}${s.unit ? '' : '%'} ${s.name}`;
}

export function itemLines(it) {
  const out = Object.entries(it.stats).map(([id, v]) => statText(id, v));
  if (it.power) out.push(POWERS[it.power].text);
  return out;
}

// What a set of worn items adds to the hero, in the hero's own units: fractions
// for percentages, points of armor, health per second.
export const BONUS_KEYS = [...Object.keys(STATS), 'amount', 'critMult', 'revival'];
export function gearBonuses(gear) {
  const b = Object.fromEntries(BONUS_KEYS.map((k) => [k, 0]));
  const powers = new Set();
  for (const slot of SLOTS) {
    const it = gear && gear[slot];
    if (!it) continue;
    for (const [id, v] of Object.entries(it.stats)) {
      const s = STATS[id];
      b[id] += s.unit === 'flat' ? v : s.unit === 'tenth' ? v / 10 : ((s.minus ? -v : v) / 100);
    }
    // Each power counts once, however many legendaries worn carry it.
    if (it.power && !powers.has(it.power)) {
      powers.add(it.power);
      for (const [k, v] of Object.entries(POWERS[it.power].stat)) b[k] += v;
    }
  }
  return b;
}

// Whether a power is already worn in another slot than `slot` (and so would add nothing).
export const powerWorn = (gear, power, slot) => !!power && SLOTS.some((s) => s !== slot && gear && gear[s] && gear[s].power === power);

// --------------------------------------------------------------- checking --

const int = (v) => (Number.isInteger(v) ? v : NaN);

// The item if it is one these rules could have rolled, else null.
export function sanitizeItem(raw, slot = null) {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw.slot, r = int(raw.rarity), seed = int(raw.seed);
  if (!SLOTS.includes(s) || (slot && s !== slot) || !(r >= 0 && r <= LEGENDARY) || !(seed >= 0 && seed <= 999999)) return null;
  if (!raw.stats || typeof raw.stats !== 'object' || Array.isArray(raw.stats)) return null;
  const ids = Object.keys(raw.stats);
  if (ids.length !== RARITIES[r].affixes) return null;
  const stats = {};
  for (const id of ids) {
    if (!POOLS[s].includes(id)) return null;
    const v = int(raw.stats[id]), [lo, hi] = statRange(id, r);
    if (!(v >= lo && v <= hi)) return null;
    stats[id] = v;
  }
  const power = r === LEGENDARY ? raw.power : null;
  if (r === LEGENDARY ? !Object.hasOwn(POWERS, power) : raw.power != null) return null;
  return { slot: s, rarity: r, stats, power, seed };
}

// Takes gear as objects, or packed: a slot's item as an array (packItem, the cookies written
// before nine heroes), or the whole hero's as one string (packGear).
export function sanitizeGear(raw) {
  const gear = {};
  if (typeof raw === 'string') raw = unpackGear(raw);
  if (!raw || typeof raw !== 'object') return gear;
  for (const slot of SLOTS) {
    const it = sanitizeItem(Array.isArray(raw[slot]) ? unpackItem(raw[slot], slot) : raw[slot], slot);
    if (it) gear[slot] = it;
  }
  return gear;
}

// An item as the profile's cookie keeps it, where every character counts (nine heroes' gear has
// to fit): [rarity, seed, power, stat, value, stat, value, ...], the power and each stat by their
// place in POWERS and in the slot's pool, and power -1 for none.
const POWER_IDS = Object.keys(POWERS);
export function packItem(it) {
  const out = [it.rarity, it.seed, it.power ? POWER_IDS.indexOf(it.power) : -1];
  for (const [id, v] of Object.entries(it.stats)) out.push(POOLS[it.slot].indexOf(id), v);
  return out;
}
// A hero's gear packed into one string: his slots in SLOTS order split by '|' (empty for none, the
// empties at the end left off), each item its packItem numbers in base 36 split by '.'. Six
// legendaries take about 150 characters, a third less than they took as arrays.
export const packGear = (gear) =>
  SLOTS.map((s) => (gear && gear[s] ? packItem(gear[s]).map((n) => n.toString(36)).join('.') : '')).join('|').replace(/\|+$/, '');
// Back to a slot -> packed item table for sanitizeGear to check (anything malformed is no item).
function unpackGear(str) {
  const out = {};
  if (str.length > 600) return out;
  str.split('|').forEach((part, i) => {
    if (i >= SLOTS.length || !/^-?[0-9a-z]+(\.-?[0-9a-z]+)*$/.test(part)) return;
    out[SLOTS[i]] = part.split('.').map((n) => parseInt(n, 36));
  });
  return out;
}

// Back to an item for sanitizeItem to check, or null.
function unpackItem(a, slot) {
  if (a.length < 3 || a.length % 2 === 0) return null;
  const stats = {};
  for (let i = 3; i < a.length; i += 2) {
    const id = Number.isInteger(a[i]) ? POOLS[slot][a[i]] : null;
    if (!id || id in stats) return null;
    stats[id] = a[i + 1];
  }
  return { slot, rarity: a[0], seed: a[1], power: a[2] === -1 ? null : POWER_IDS[a[2]] ?? '?', stats };
}

export function sameItem(a, b) {
  if (!a || !b || a.slot !== b.slot || a.rarity !== b.rarity || a.seed !== b.seed || a.power !== b.power) return false;
  const ka = Object.keys(a.stats), kb = Object.keys(b.stats);
  return ka.length === kb.length && ka.every((k) => a.stats[k] === b.stats[k]);
}
