// Playable heroes. `stats` are multipliers/overrides on the base player.
//
// Each hero class has a signature weapon no other can get (`unique`; the Necromancer has two),
// and every other weapon is shared by all (SHARED_WEAPONS): a level-up offers a hero his own and
// the shared ones (weaponsFor). `start`: what he starts a run with, if not his `weapon` alone
// (startWeapons). Relics are shared by all.

import { WEAPONS } from './weapons.js';

export const HEROES = {
  knight: {
    id: 'knight',
    short: 'Knight', // on a hero card too narrow for the title (a phone held upright)
    name: 'Sir Aldric',
    title: 'Knight',
    sprite: 'knight',
    pose: 'knight_pose', // his painted pose on the in-run panels; the hero screen frames the in-game sprite, as for all five
    weapon: 'sword', // in the crypts each hero has his own weapon alone, struck by the player (Game.caveStrike)
    unique: ['sword'],
    color: '#0099db',
    // regenMul scales every kind of regeneration he gets (his own, Troll Blood, the Armory's
    // Recovery, the Protection shrine, Sanctuary) in step with his doubled health.
    stats: { maxHp: 280, armor: 2, speed: 1.067, regen: 0.3, regenMul: 2 },
    perk: 'Bulwark: +2 armor, +180% health, regenerates',
    ult: 'whirlwind',
    ultName: 'Whirlwind',
    ultDesc: 'Spin for 3.5s shredding all nearby foes. Damage taken halved.',
  },
  archer: {
    id: 'archer',
    short: 'Ranger',
    name: 'Lyra',
    title: 'Ranger',
    sprite: 'archer',
    pose: 'archer_pose',
    weapon: 'bow',
    unique: ['bow'],
    color: '#63c74d',
    stats: { maxHp: 100, speed: 1.15, crit: 0.12, projSpeed: 1.1 },
    perk: 'Eagle Eye: +12% crit, +15% move speed',
    ult: 'arrowstorm',
    ultName: 'Arrow Storm',
    ultDesc: 'Arrows rain on every foe in sight for 3 seconds.',
  },
  mage: {
    id: 'mage',
    short: 'Sorc',
    name: 'Eldrin',
    title: 'Sorcerer',
    sprite: 'mage',
    pose: 'mage_pose',
    weapon: 'fireball',
    unique: ['fireball'],
    color: '#b55088',
    stats: { maxHp: 95, cooldown: 0.9, area: 1.1, growth: 1.1 },
    perk: 'Arcane Mind: -10% cooldowns, +10% area & XP',
    ult: 'cataclysm',
    ultName: 'Cataclysm',
    ultDesc: 'Call down a storm of meteors across the battlefield.',
  },
  rogue: {
    id: 'rogue',
    short: 'Shadow',
    name: 'Kael',
    title: 'Shadow',
    sprite: 'rogue',
    pose: 'rogue_pose',
    weapon: 'daggers',
    unique: ['daggers'],
    color: '#8f5bb0',
    // His light line 2 px wide in play and on the menus: his dark tones (the owner's pick) lose him
    // at night otherwise. Drawn round him, his colours untouched.
    line: 2,
    stats: { maxHp: 95, speed: 1.2, crit: 0.18, luck: 1.2 },
    perk: 'Shadowstep: +18% crit, +20% speed & luck',
    ult: 'shadowdance',
    ultName: 'Shadow Dance',
    ultDesc: 'Vanish for 3s: untouchable, and blades fly in every direction.',
  },
  necromancer: {
    id: 'necromancer',
    short: 'Necro',
    name: 'Morvath',
    title: 'Necromancer',
    sprite: 'necromancer',
    pose: 'necromancer_pose',
    weapon: 'raise', // the one struck by hand in the crypts; Miasma waits outside
    unique: ['raise', 'miasma'],
    start: ['raise', 'miasma'],
    color: '#9ee562',
    stats: { maxHp: 90, summonDur: 1.3, growth: 1.1 },
    perk: 'Grave Pact: minions last 30% longer, +10% XP',
    ult: 'deadrise',
    ultName: 'Army of the Dead',
    ultDesc: 'Raise a ring of empowered death knights around you.',
  },
};

// The light line drawn round the hero, in play (game.js HERO_MARK) and on the menus.
export const HERO_LINE = '#d8e2f0';

// The weapons a hero starts a run with, each at level 1.
export const startWeapons = (hero) => hero.start || [hero.weapon];

// Every weapon that is no hero's signature (evolutions aside): any hero may find these.
export const SHARED_WEAPONS = Object.keys(WEAPONS).filter((id) => !WEAPONS[id].evolved && !Object.values(HEROES).some((h) => h.unique.includes(id)));

// The weapons a level-up may offer a hero: his own signature, then those shared by all.
export const weaponsFor = (hero) => [...hero.unique, ...SHARED_WEAPONS];

// Unlock order lives in shared/profile.js (enforced by the server): five minutes on the clock
// with one hero bring in the next.
export { HERO_ORDER } from '../shared/profile.js';
