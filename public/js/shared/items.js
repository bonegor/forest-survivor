// Gear: what the bosses of the crypts drop. Eight slots, one item each; new loot
// is ordinary, enchanted blue or legendary gold. Legacy rarities still load.
// Each hero keeps what they wear from run to run, so these rules are
// shared by the browser and the Node server, which checks every item it saves.
// Every function here is pure and treats its input as untrusted.

import { WEAPONS } from '../data/weapons.js';
import { PASSIVES } from '../data/passives.js';

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

// Append slots: their positions are also the positions in existing saved gear.
export const SLOTS = ['helm', 'armor', 'gloves', 'boots', 'amulet', 'ring', 'weapon', 'shield'];
export const SLOT_NAMES = { helm: 'Helm', armor: 'Armor', gloves: 'Gloves', boots: 'Boots', amulet: 'Amulet', ring: 'Ring', weapon: 'Weapon', shield: 'Shield' };

// Enchanted stats roll `mul` times their base range; ordinary new loot has only
// its slot's base bonus. Legacy items keep their original affix counts.
export const RARITIES = [
  { id: 'common', name: 'Common', color: '#c0cbdc', affixes: 1, mul: 1, price: 20 },
  { id: 'uncommon', name: 'Uncommon', color: '#63c74d', affixes: 2, mul: 1.2, price: 50 },
  { id: 'rare', name: 'Enchanted', color: '#0099db', affixes: 3, mul: 1.45, price: 120 },
  { id: 'epic', name: 'Epic', color: '#b55088', affixes: 3, mul: 1.8, price: 300 },
  { id: 'legendary', name: 'Legendary', color: '#fff154', affixes: 4, mul: 2.2, price: 750 },
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
  weapon: ['might', 'crit', 'cooldown', 'area', 'projSpeed'],
  shield: ['armor', 'maxHp', 'regen', 'duration', 'luck'],
};

const RANGED_HEROES = new Set(['archer', 'mage', 'necromancer', 'druid', 'witchhunter', 'marksman',
  'trailblazer', 'thornkeeper', 'gravebinder', 'arcanist', 'boltguard']);
export const weaponClass = hero => RANGED_HEROES.has(typeof hero === 'string' ? hero : hero?.id) ? 'ranged' : 'melee';
export const itemIdentified = it => it?.identified !== false;
export const canEquipItem = (it, hero) => !!it && (it.slot !== 'weapon' || !hero || !it.weaponType || it.weaponType === weaponClass(hero));
export const itemIcon = it => it.slot === 'weapon' && it.weaponType === 'ranged' ? 'g_bow' : 'g_' + it.slot;

// Ordinary gear is useful immediately; enchantments and skill ranks await identification.
const BASE_STAT = { helm: 'armor', armor: 'armor', gloves: 'armor', boots: 'armor', weapon: 'might', shield: 'armor' };
export const baseStatRange = (slot, rarity) => BASE_STAT[slot] ? statRange(BASE_STAT[slot], rarity) : null;

// A legendary's power, on top of its four stats. `stat` is in the hero's own units.
export const POWERS = {
  echo: { text: '+1 projectile for every weapon', stat: { amount: 1 } },
  wrath: { text: 'Critical hits deal +40% damage', stat: { critMult: 0.4 } },
  undying: { text: 'Rise once more when you fall', stat: { revival: 1 } },
  titan: { text: '+20% health and +2 armor', stat: { maxHp: 0.2, armor: 2 } },
};

const rankWeapons = Object.keys(WEAPONS).filter(id => !WEAPONS[id].evolved);
const rankPassives = Object.keys(PASSIVES).filter(id => !PASSIVES[id].stat.revivals);

export function rankGrant(raw, rarity) {
  if (rarity < 2 || typeof raw !== 'string') return null;
  if (raw === 'weapons' || raw === 'passives') return rarity === LEGENDARY ? raw : null;
  const [kind, id, extra] = raw.split(':');
  if (extra !== undefined) return null;
  if (kind === 'weapon' && rankWeapons.includes(id) || kind === 'passive' && rankPassives.includes(id)) return raw;
  return null;
}

export function rankGrantName(grant) {
  if (grant === 'weapons') return 'All held weapons';
  if (grant === 'passives') return 'All held relics';
  const [kind, id] = grant.split(':');
  return (kind === 'weapon' ? WEAPONS : PASSIVES)[id].name;
}

export function gearRanks(gear, hero = null) {
  const weapons = new Set(), passives = new Set();
  let allWeapons = false, allPassives = false;
  for (const it of Object.values(gear || {})) {
    if (!it || !itemIdentified(it) || !canEquipItem(it, hero)) continue;
    const grant = rankGrant(it.grant, it.rarity);
    if (grant === 'weapons') allWeapons = true;
    else if (grant === 'passives') allPassives = true;
    else if (grant) {
      const [kind, id] = grant.split(':');
      (kind === 'weapon' ? weapons : passives).add(id);
    }
  }
  return { allWeapons, allPassives, weapons, passives };
}

const BASES = {
  helm: ['Leather Cap', 'Iron Helm', 'Barbute', 'Great Helm'],
  armor: ['Padded Jerkin', 'Chain Shirt', 'Scale Mail', 'Plate Armor'],
  gloves: ['Wool Gloves', 'Leather Gloves', 'Chain Gloves', 'Gauntlets'],
  boots: ['Sandals', 'Leather Boots', 'Riding Boots', 'Greaves'],
  amulet: ['Charm', 'Pendant', 'Talisman', 'Amulet'],
  ring: ['Copper Ring', 'Silver Ring', 'Gold Ring', 'Signet'],
  weapon: ['Sword', 'Broadsword', 'Longsword', 'Greatsword'],
  shield: ['Wooden Shield', 'Round Shield', 'Kite Shield', 'Tower Shield'],
};
const LEGENDS = {
  helm: ['Crown of Ossarian', 'Helm of the Long Night', 'Visage of Malgrath'],
  armor: ["Grimgut's Hide", 'Aegis of Dawn', 'Mantle of the Darkwood'],
  gloves: ['Hands of the Lich', 'Cinder Grips', "Executioner's Grasp"],
  boots: ['Cinderstride', 'Treads of the Wild Hunt', 'Moonwalkers'],
  amulet: ['Heart of the Darkwood', "Azgaroth's Ember", 'Eye of the Barrow'],
  ring: ['Ring of the Long Night', 'Band of Ages', 'Seal of the Bone King'],
  weapon: ['Blade of Dawn', 'Fang of the Darkwood', 'Edge of the Bone King'],
  shield: ['Wall of Dawn', 'Aegis of the Barrow', 'Ward of the Long Night'],
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
const BASE_ODDS = [70, 0, 29, 0, 1];
const BOOST = [-0.75, 0, 2, 0, 12];
function rawRarityOdds(minute, depth = 1) {
  const s = Math.max(0, minute / 15 + (depth - 1) * 0.15);
  const w = BASE_ODDS.map((b, i) => b * Math.max(0.1, 1 + s * BOOST[i]));
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map((v) => v / sum);
}

export function rarityOdds(minute, depth = 1) {
  const odds = rawRarityOdds(minute, depth);
  // Jewelry can only be enchanted or legendary. Include that in the advertised
  // odds for an unconstrained drop, rather than advertising common jewelry.
  const jewelry = 2 / SLOTS.length * odds[0];
  odds[0] -= jewelry;
  odds[2] += jewelry;
  return odds;
}

// A new item. `rng` is a mulberry32-style generator: rng() in [0, 1) with rng.int(lo, hi).
export function rollItem(rng, { minute = 0, depth = 1, slot = null, hero = null } = {}) {
  const odds = rawRarityOdds(minute, depth);
  let r = rng(), rarity = 0;
  while (rarity < LEGENDARY && r >= odds[rarity]) r -= odds[rarity++];
  slot = SLOTS.includes(slot) ? slot : SLOTS[rng.int(0, SLOTS.length - 1)];
  if ((slot === 'ring' || slot === 'amulet') && rarity === 0) rarity = 2;
  const pool = POOLS[slot].slice();
  const stats = {};
  for (let k = 0; k < (rarity === 0 ? 0 : RARITIES[rarity].affixes); k++) {
    const id = pool.splice(rng.int(0, pool.length - 1), 1)[0];
    const [lo, hi] = statRange(id, rarity);
    stats[id] = rng.int(lo, hi);
  }
  const names = Object.keys(POWERS);
  const base = {}, baseRange = baseStatRange(slot, rarity);
  if (baseRange) base[BASE_STAT[slot]] = rng.int(...baseRange);
  const item = { slot, rarity, stats, base, identified: false,
    ...(slot === 'weapon' && { weaponType: hero ? weaponClass(hero) : rng() < 0.5 ? 'melee' : 'ranged' }),
    power: rarity === LEGENDARY ? names[rng.int(0, names.length - 1)] : null, seed: rng.int(0, 999999) };
  if (rarity === LEGENDARY) {
    const weapon = rng() < 0.5;
    if (rarity === LEGENDARY && rng() < 0.5) item.grant = weapon ? 'weapons' : 'passives';
    else {
      const ids = weapon ? rankWeapons : rankPassives;
      item.grant = `${weapon ? 'weapon' : 'passive'}:${ids[rng.int(0, ids.length - 1)]}`;
    }
  }
  return item;
}

export function itemBaseName(it) {
  if (it.slot === 'weapon' && it.weaponType === 'ranged') return ['Bow', 'Longbow', 'War Bow', 'Great Bow'][Math.min(it.rarity, 3)];
  return BASES[it.slot][Math.min(it.rarity, BASES[it.slot].length - 1)];
}

export function itemName(it) {
  if (!itemIdentified(it)) return `Unidentified ${itemBaseName(it)}`;
  if (it.rarity === LEGENDARY) return LEGENDS[it.slot][it.seed % LEGENDS[it.slot].length];
  const base = itemBaseName(it);
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
  const out = Object.entries(it.base || {}).map(([id, v]) => statText(id, v));
  if (!itemIdentified(it)) {
    if (it.weaponType) out.push(`${it.weaponType === 'ranged' ? 'Ranged' : 'Melee'} classes`);
    out.push(it.rarity === 0 ? 'Unidentified · base bonus active' : 'Unidentified · enchantments dormant');
    return out;
  }
  out.push(...Object.entries(it.stats).map(([id, v]) => statText(id, v)));
  if (it.power) out.push(POWERS[it.power].text);
  if (it.grant) out.push(`+1 rank · ${rankGrantName(it.grant)}`);
  return out;
}

// What a set of worn items adds to the hero, in the hero's own units: fractions
// for percentages, points of armor, health per second.
export const BONUS_KEYS = [...Object.keys(STATS), 'amount', 'critMult', 'revival'];
export function gearBonuses(gear, hero = null) {
  const b = Object.fromEntries(BONUS_KEYS.map((k) => [k, 0]));
  const powers = new Set();
  for (const slot of SLOTS) {
    const it = gear && gear[slot];
    if (!it || !canEquipItem(it, hero)) continue;
    const stats = { ...it.base };
    if (itemIdentified(it)) for (const [id, v] of Object.entries(it.stats)) stats[id] = (stats[id] || 0) + v;
    for (const [id, v] of Object.entries(stats)) {
      const s = STATS[id];
      b[id] += s.unit === 'flat' ? v : s.unit === 'tenth' ? v / 10 : ((s.minus ? -v : v) / 100);
    }
    // Each power counts once, however many legendaries worn carry it.
    if (itemIdentified(it) && it.power && !powers.has(it.power)) {
      powers.add(it.power);
      for (const [k, v] of Object.entries(POWERS[it.power].stat)) b[k] += v;
    }
  }
  return b;
}

// Whether a power is already worn in another slot than `slot` (and so would add nothing).
export const powerWorn = (gear, power, slot) => !!power && SLOTS.some((s) => s !== slot && gear && gear[s] && itemIdentified(gear[s]) && gear[s].power === power);

// --------------------------------------------------------------- checking --

const int = (v) => (Number.isInteger(v) ? v : NaN);

// The item if it is one these rules could have rolled, else null.
export function sanitizeItem(raw, slot = null) {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw.slot, r = int(raw.rarity), seed = int(raw.seed);
  if (!SLOTS.includes(s) || (slot && s !== slot) || !(r >= 0 && r <= LEGENDARY) || !(seed >= 0 && seed <= 999999)) return null;
  if (!raw.stats || typeof raw.stats !== 'object' || Array.isArray(raw.stats)) return null;
  const modern = raw.base !== undefined;
  if (raw.identified !== undefined && typeof raw.identified !== 'boolean') return null;
  const base = {};
  if (modern) {
    if (![0, 2, LEGENDARY].includes(r) || ((s === 'ring' || s === 'amulet') && r === 0) || !raw.base || typeof raw.base !== 'object' || Array.isArray(raw.base)) return null;
    const id = BASE_STAT[s], keys = Object.keys(raw.base);
    if (id) {
      const v = int(raw.base[id]), [lo, hi] = baseStatRange(s, r);
      if (keys.length !== 1 || !(v >= lo && v <= hi)) return null;
      base[id] = v;
    } else if (keys.length) return null;
    if (s === 'weapon' ? !['melee', 'ranged'].includes(raw.weaponType) : raw.weaponType !== undefined) return null;
  } else if (s === 'weapon' || s === 'shield' || raw.weaponType !== undefined) return null;
  const ids = Object.keys(raw.stats);
  if (ids.length !== (modern && r === 0 ? 0 : RARITIES[r].affixes)) return null;
  const stats = {};
  for (const id of ids) {
    if (!POOLS[s].includes(id)) return null;
    const v = int(raw.stats[id]), [lo, hi] = statRange(id, r);
    if (!(v >= lo && v <= hi)) return null;
    stats[id] = v;
  }
  const power = r === LEGENDARY ? raw.power : null;
  if (r === LEGENDARY ? !Object.hasOwn(POWERS, power) : raw.power != null) return null;
  const grant = rankGrant(raw.grant, r);
  if (raw.grant != null && !grant) return null;
  if (modern && ((r === LEGENDARY && !grant) || (r !== LEGENDARY && grant))) return null;
  return { slot: s, rarity: r, stats, power, seed, ...(grant && { grant }),
    ...(modern && { base, identified: itemIdentified(raw), ...(s === 'weapon' && { weaponType: raw.weaponType }) }),
    ...(!modern && raw.identified === false && { identified: false }) };
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
// Saved codes are append-only. Do not derive them from the roster: adding a hero
// can insert weapon definitions before older ones and would change their codes.
const COMPACT_GRANTS = [
  null, 'weapons', 'passives',
  'weapon:footman_linebreaker', 'weapon:marksman_splitpin', 'weapon:templar_votive_edge',
  'weapon:trailblazer_wayline', 'weapon:thornkeeper_briar_compass', 'weapon:wraith_aftercut',
  'weapon:gravebinder_carrion_tithe', 'weapon:arcanist_meridian_pendulum', 'weapon:praetorian_shieldward_blade',
  'weapon:seraph_sunwing_edge', 'weapon:boltguard_ratchet', 'weapon:swordbearer_marchsteel',
  'weapon:sword', 'weapon:axe', 'weapon:blades', 'weapon:aura', 'weapon:bow', 'weapon:glaive', 'weapon:thorns',
  'weapon:wisps', 'weapon:fireball', 'weapon:lightning', 'weapon:chain', 'weapon:frost', 'weapon:arcane',
  'weapon:daggers', 'weapon:flask', 'weapon:caltrops', 'weapon:leech', 'weapon:spores', 'weapon:hex',
  'weapon:gale', 'weapon:hook', 'weapon:hollow', 'weapon:bell', 'weapon:lantern', 'weapon:runestone',
  'weapon:scythe', 'weapon:starfall', 'weapon:raise', 'weapon:miasma', 'weapon:smite', 'weapon:roots',
  'weapon:twinaxes', 'weapon:crossbow',
  'passive:might', 'passive:armor', 'passive:vitality', 'passive:regen', 'passive:cooldown', 'passive:area',
  'passive:projspeed', 'passive:duration', 'passive:movespeed', 'passive:magnet', 'passive:luck',
  'passive:hunter', 'passive:torc', 'passive:thornmail', 'passive:cloak', 'passive:ember', 'passive:ramhorn',
  'passive:fang', 'passive:rime', 'passive:amount', 'passive:growth', 'passive:bulwarkseal',
  'passive:wardrum', 'passive:pilgrimcord',
];
const rangeBits = max => Math.ceil(Math.log2(max + 1));

// Modern items use a base-36 bit field instead of verbose stat pairs and grant
// names. Eight slots for all 21 heroes, inventory and unresolved loot must fit
// the server's encrypted cookie together. '@' identifies this encoding version.
function packModernItem(it) {
  let bits = 0n, offset = 0n;
  const put = (value, size) => { bits |= BigInt(value) << offset; offset += BigInt(size); };
  put(it.seed, 20);
  put(it.rarity / 2, 2);
  put(itemIdentified(it) ? 1 : 0, 1);
  if (it.slot === 'weapon') put(it.weaponType === 'ranged' ? 1 : 0, 1);
  const baseRange = baseStatRange(it.slot, it.rarity);
  if (baseRange) put(it.base[BASE_STAT[it.slot]] - baseRange[0], rangeBits(baseRange[1] - baseRange[0]));
  if (it.rarity !== 0) {
    if (it.rarity === LEGENDARY) {
      put(POWER_IDS.indexOf(it.power), 2);
      put(COMPACT_GRANTS.indexOf(it.grant), 7);
    }
    const pool = POOLS[it.slot];
    put(pool.reduce((mask, id, index) => mask | (Object.hasOwn(it.stats, id) ? 1 << index : 0), 0), pool.length);
    for (const id of pool) if (Object.hasOwn(it.stats, id)) {
      const [lo, hi] = statRange(id, it.rarity);
      put(it.stats[id] - lo, rangeBits(hi - lo));
    }
  }
  return '@' + bits.toString(36);
}

function unpackModernItem(packed, slot) {
  if (!/^@[0-9a-z]{1,20}$/.test(packed)) return null;
  let bits = 0n;
  for (const digit of packed.slice(1)) bits = bits * 36n + BigInt(parseInt(digit, 36));
  const take = size => { const n = BigInt(size), value = Number(bits & ((1n << n) - 1n)); bits >>= n; return value; };
  const seed = take(20), rarity = take(2) * 2, identified = take(1) === 1;
  if (rarity > LEGENDARY) return null;
  const item = { slot, rarity, seed, identified, base: {}, stats: {}, power: null };
  if (slot === 'weapon') item.weaponType = take(1) ? 'ranged' : 'melee';
  const baseRange = baseStatRange(slot, rarity);
  if (baseRange) item.base[BASE_STAT[slot]] = baseRange[0] + take(rangeBits(baseRange[1] - baseRange[0]));
  if (rarity !== 0) {
    if (rarity === LEGENDARY) {
      item.power = POWER_IDS[take(2)];
      item.grant = COMPACT_GRANTS[take(7)] ?? '?';
    }
    const pool = POOLS[slot], mask = take(pool.length);
    for (let index = 0; index < pool.length; index++) if (mask & (1 << index)) {
      const id = pool[index], [lo, hi] = statRange(id, rarity);
      item.stats[id] = lo + take(rangeBits(hi - lo));
    }
  }
  return bits === 0n ? item : null;
}

function packItemNumbers(it) {
  const out = [it.rarity, it.seed, it.power ? POWER_IDS.indexOf(it.power) : -1];
  for (const [id, v] of Object.entries(it.stats)) out.push(POOLS[it.slot].indexOf(id), v);
  return out;
}
export function packItem(it) {
  const out = packItemNumbers(it);
  if (it.base !== undefined || it.identified === false || it.grant) {
    out.push({ ...(it.base !== undefined && { base: it.base, identified: itemIdentified(it) }),
      ...(it.base === undefined && it.identified === false && { identified: false }),
      ...(it.weaponType && { weaponType: it.weaponType }), ...(it.grant && { grant: it.grant }) });
  }
  return out;
}
// A hero's gear packed into one string: his slots in SLOTS order split by '|' (empty for none, the
// empties at the end left off), each item its packItem numbers in base 36 split by '.'. Six
// legendaries take about 150 characters, a third less than they took as arrays.
export const packGear = (gear) =>
  SLOTS.map(s => {
    const it = gear?.[s];
    if (!it) return '';
    if (it.base !== undefined) return packModernItem(it);
    const packed = packItemNumbers(it).map(n => n.toString(36)).join('.');
    if (it.identified === false) return `${packed}~${it.grant || ''}~u`;
    return it.grant ? `${packed}~${it.grant}` : packed;
  }).join('|').replace(/\|+$/, '');
// Back to a slot -> packed item table for sanitizeGear to check (anything malformed is no item).
function unpackGear(str) {
  const out = {};
  if (str.length > 900) return out;
  str.split('|').forEach((part, i) => {
    if (i >= SLOTS.length) return;
    if (part.startsWith('@')) {
      const item = unpackModernItem(part, SLOTS[i]);
      if (item) out[SLOTS[i]] = item;
      return;
    }
    const [packed, grant, meta, extra] = part.split('~');
    if (i >= SLOTS.length || extra !== undefined || !/^-?[0-9a-z]+(\.-?[0-9a-z]+)*$/.test(packed)) return;
    const item = unpackItem(packed.split('.').map(n => parseInt(n, 36)), SLOTS[i]);
    if (!item) return;
    if (grant) item.grant = grant;
    if (meta === 'u') item.identified = false;
    else if (meta !== undefined) {
      if (!/^[01]\.[0-9a-z]+\.[mrn]$/.test(meta)) return;
      const [known, value, type] = meta.split('.'), baseId = BASE_STAT[SLOTS[i]];
      item.base = baseId ? { [baseId]: parseInt(value, 36) } : {};
      if (!baseId && value !== '0') return;
      item.identified = known === '1';
      if (type !== 'n') item.weaponType = type === 'r' ? 'ranged' : 'melee';
    }
    out[SLOTS[i]] = item;
  });
  return out;
}

// Back to an item for sanitizeItem to check, or null.
function unpackItem(a, slot) {
  const metadata = a.length && typeof a[a.length - 1] === 'object' && a[a.length - 1] !== null ? a[a.length - 1] : null;
  if (metadata) a = a.slice(0, -1);
  if (a.length < 3 || a.length % 2 === 0) return null;
  const stats = {};
  for (let i = 3; i < a.length; i += 2) {
    const id = Number.isInteger(a[i]) ? POOLS[slot][a[i]] : null;
    if (!id || id in stats) return null;
    stats[id] = a[i + 1];
  }
  return { slot, rarity: a[0], seed: a[1], power: a[2] === -1 ? null : POWER_IDS[a[2]] ?? '?', stats,
    ...(metadata?.base !== undefined && { base: metadata.base }),
    ...(metadata?.identified !== undefined && { identified: metadata.identified }),
    ...(metadata?.weaponType !== undefined && { weaponType: metadata.weaponType }),
    ...(metadata?.grant !== undefined && { grant: metadata.grant }) };
}

export function sameItem(a, b) {
  if (!a || !b || a.slot !== b.slot || a.rarity !== b.rarity || a.seed !== b.seed || a.power !== b.power ||
      (a.grant ?? null) !== (b.grant ?? null) || itemIdentified(a) !== itemIdentified(b) ||
      (a.weaponType ?? null) !== (b.weaponType ?? null) || (a.base === undefined) !== (b.base === undefined)) return false;
  const ba = Object.keys(a.base || {}), bb = Object.keys(b.base || {});
  if (ba.length !== bb.length || ba.some(k => a.base[k] !== b.base[k])) return false;
  const ka = Object.keys(a.stats), kb = Object.keys(b.stats);
  return ka.length === kb.length && ka.every((k) => a.stats[k] === b.stats[k]);
}
