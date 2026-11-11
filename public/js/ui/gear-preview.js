import { HEROES, startWeapons } from '../data/heroes.js';
import { MAX_WEAPON_LEVEL, WEAPONS } from '../data/weapons.js';
import { PASSIVES } from '../data/passives.js';
import { COOLDOWN_FLOOR, Player } from '../game/player.js';
import { canEquipItem, gearRanks, itemIdentified, powerWorn } from '../shared/items.js';
import { metaBonuses } from '../shared/profile.js';

const number = value => String(Number(value.toFixed(2)));
const percent = value => `${Number((value * 100).toFixed(1))}%`;
const STATS = [
  ['might', 'Damage multiplier', percent], ['armor', 'Armor', number], ['maxHp', 'Health', number],
  ['speedMul', 'Move speed multiplier', percent], ['cooldown', 'Cooldown multiplier', percent],
  ['crit', 'Crit chance', percent], ['regen', 'Health per second', number], ['revivals', 'Revives', number],
  ['area', 'Area multiplier', percent], ['duration', 'Duration multiplier', percent],
  ['projSpeed', 'Projectile speed multiplier', percent], ['magnet', 'Pickup range', number],
  ['luck', 'Luck multiplier', percent], ['growth', 'Experience multiplier', percent],
  ['greed', 'Gold multiplier', percent], ['amount', 'Extra projectiles', number], ['critMult', 'Critical damage multiplier', percent],
];

// Match the run's level-one player, with no cards, temporary buffs, or terrain effects.
export function gearPreview(profile, hero, item, worn = false) {
  if (!canEquipItem(item, hero)) return ['This weapon is incompatible with this hero. Its effects are inactive.'];
  const gear = profile.gear[hero] || {}, other = { ...gear };
  delete other[item.slot];
  const known = itemIdentified(item), duplicate = known && powerWorn(other, item.power);
  if (duplicate && !worn) return ['This legendary power is already worn. This hero cannot equip a second copy.'];

  const meta = metaBonuses(profile);
  const before = new Player({ gear: worn ? other : gear }, hero, meta);
  const after = new Player({ gear: { ...other, [item.slot]: item } }, hero, meta);
  const lines = [worn ? 'Worn item’s contribution at level 1.' : 'If equipped at level 1, before cards and temporary effects.'];
  for (const [key, label, format] of STATS) {
    const from = format(before[key]), to = format(after[key]);
    if (from !== to) lines.push(`${label} ${from} → ${to}`);
  }

  const starting = startWeapons(HEROES[hero]);
  const weapons = new Set([...starting, ...before.gearRanks.weapons, ...after.gearRanks.weapons]);
  for (const id of weapons) {
    const learned = starting.includes(id);
    const rank = player => learned ? 1 + Number(player.gearRanks.allWeapons || player.gearRanks.weapons.has(id)) : Number(player.gearRanks.weapons.has(id));
    const from = rank(before), to = rank(after);
    if (from !== to) lines.push(`${WEAPONS[id].name}${learned ? '' : ' (gear only)'} rank ${from || '–'} → ${to || '–'}`);
  }
  const relics = new Set([...before.gearRanks.passives, ...after.gearRanks.passives]);
  for (const id of relics) {
    const from = before.effectivePassiveRank(id), to = after.effectivePassiveRank(id);
    if (from !== to) lines.push(`${PASSIVES[id].name} (gear only) rank ${from || '–'} → ${to || '–'}`);
  }
  if (lines.length === 1) lines.push('No change to the starting stats or ranks shown here.');
  if (!known) {
    lines.push('Hidden magic is dormant. Only the visible base bonus is included.');
    return lines;
  }
  if (duplicate && Object.values(other).some(it => canEquipItem(it, hero) && itemIdentified(it) && it.power === item.power)) {
    lines.push('This power is already worn and adds no second effect.');
  }
  if (after.cooldown === COOLDOWN_FLOOR && (item.stats.cooldown || item.grant === 'passive:cooldown')) {
    lines.push(`Cooldown reduction is capped at ${percent(COOLDOWN_FLOOR)} of base.`);
  }

  const grant = item.grant;
  if (!grant) return lines;
  const existing = worn ? before.gearRanks : gearRanks(other, hero);
  if (grant === 'weapons') {
    if (existing.allWeapons) lines.push('All-weapons bonus is duplicated and does not stack.');
    else lines.push(`Adds one rank to learned weapons, up to ${MAX_WEAPON_LEVEL}. Evolved and gear-only weapons are excluded.`);
  } else if (grant === 'passives') {
    if (existing.allPassives) lines.push('All-relics bonus is duplicated and does not stack.');
    else lines.push('Dormant at the start. Adds one rank to learned relics up to their individual caps, excluding revival relics.');
  } else {
    const [kind, id] = grant.split(':');
    const learned = kind === 'weapon' && starting.includes(id);
    if (kind === 'weapon' && (existing.weapons.has(id) || learned && existing.allWeapons) ||
        kind === 'passive' && existing.passives.has(id)) {
      lines.push('This rank bonus is duplicated and does not stack.');
    } else if (learned) {
      lines.push(`Raises ${WEAPONS[id].name} by one rank up to ${MAX_WEAPON_LEVEL}. The bonus stops after evolution.`);
    } else if (kind === 'weapon') {
      lines.push(`Grants ${WEAPONS[id].name} at rank 1 without a learned weapon slot.`);
    } else {
      lines.push(`Grants ${PASSIVES[id].name} at rank 1 without a relic slot. Its learned cap is ${PASSIVES[id].max}.`);
    }
  }
  return lines;
}
