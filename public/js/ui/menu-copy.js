// Short labels for browsing; mechanics and full descriptions stay in the game data.
import { WEAPONS } from '../data/weapons.js';
import { PASSIVES } from '../data/passives.js';
import { HEROES } from '../data/heroes.js';

const WEAPON_SUMMARY = {
  axe: 'Arcing axes', blades: 'Orbiting swords', aura: 'Burns nearby foes',
  glaive: 'Returning blade', thorns: 'Piercing, snaring thorns', wisps: 'Homing lights',
  lightning: 'Stuns strong foes', chain: 'Chain damage', frost: 'Chilling burst',
  arcane: 'Piercing beam', flask: 'Burning ground', caltrops: 'Slows pursuing foes',
  leech: 'Drains foes to heal', spores: 'Confusing traps', hex: 'Delayed curse damage',
  gale: 'Pushes the horde back', hook: 'Piercing return strike', hollow: 'Pulls foes into a pit',
  bell: 'Makes foes flee', lantern: 'Sweeping fire beam', runestone: 'Bouncing projectile',
  scythe: 'Executes wounded foes', starfall: 'Falling stars',
};
const RELIC_SUMMARY = {
  might: '+10% damage', armor: '+1 armor', vitality: '+15% health', regen: '+0.3 health/sec',
  cooldown: '-7% cooldowns', area: '+10% area', projspeed: '+12% projectile speed',
  duration: '+12% duration', movespeed: '+8% move speed', magnet: '+30% pickup range',
  luck: '+10% luck, +2% crit', hunter: '+8% boss/elite damage', torc: 'Low-health damage bonus',
  thornmail: '8 retaliation damage', cloak: '4% dodge chance', ember: '5% burn chance',
  ramhorn: '+15% knockback', fang: '0.4% damage as healing', rime: 'Freeze foes when hit',
  amount: '+1 projectile', growth: '+7% experience', phoenix: 'Revive + evolution aid',
};

export const HERO_SUMMARY = {
  knight: ['Armored · strong regeneration', 'Spinning attack · less damage taken'],
  archer: ['Fast attacks · high critical chance', 'Arrow rain across the screen'],
  mage: ['Faster spells · more area and XP', 'Meteors across the battlefield'],
  rogue: ['Fast movement · critical hits and luck', 'Invulnerable blade storm'],
  necromancer: ['Longer-lived minions · more XP', 'Summon empowered death knights'],
  paladin: ['Stronger healing · kills restore health', 'Healing dome burns and stuns foes'],
  druid: ['Stronger near trees · regeneration', 'Roots every foe on screen'],
  berserker: ['Low health boosts damage and attacks', 'Relentless swings · kills heal'],
  witchhunter: ['Bonus damage to bosses and elites', 'Slows foes · triple explosive bolts'],
};

export function shortNeed(text = '') {
  return text.replace(/^Slay ([\d,]+) foes in all$/, '$1 total kills')
    .replace(' in a run with this hero', ' with this hero')
    .replace(' in a run', ' / run')
    .replace('Pick up ', 'Collect ').replace('Reach level ', 'Level ')
    .replace('Slay a boss', 'Defeat 1 boss').replace('Slay ', 'Defeat ')
    .replace('Win a night to learn more', 'Win a night to reveal');
}

export function codexSummary(e) {
  if (!e.open) return shortNeed(e.need);
  if (e.type === 'weapon') return WEAPON_SUMMARY[e.id] || WEAPONS[e.id].desc;
  if (e.type === 'relic') return RELIC_SUMMARY[e.id] || PASSIVES[e.id].desc.replace(/[{}]/g, '');
  return `${HEROES[e.id].title}'s ultimate`;
}

export function codexDescription(e) {
  if (e.hidden) return 'Win your first night to reveal this weapon.';
  return e.type === 'weapon' ? WEAPONS[e.id].desc : e.type === 'relic' ? PASSIVES[e.id].desc : HEROES[e.id].ultDesc;
}

export function evolutionRecipe(e) {
  if (e.hidden || e.type !== 'weapon') return null;
  const evo = WEAPONS[e.id].evo;
  return evo ? `Level 8 + ${PASSIVES[evo.with].name} + chest → ${WEAPONS[evo.into].name}` : null;
}
