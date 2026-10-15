// Playable heroes. `stats` are multipliers/overrides on the base player.

export const HEROES = {
  knight: {
    id: 'knight',
    name: 'Sir Aldric',
    title: 'Knight',
    sprite: 'knight',
    pose: 'knight_pose', // shown on the menus instead of the in-game sprite
    picture: 'img/knight-portrait-v2.png',
    portrait: true,
    weapon: 'sword',
    caveStrike: true, // in the crypts: his sword alone, struck by the player (Game.caveStrike)
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
    name: 'Lyra',
    title: 'Ranger',
    sprite: 'archer',
    pose: 'archer_pose',
    picture: 'img/archer-scene.png',
    weapon: 'bow',
    color: '#63c74d',
    stats: { maxHp: 100, speed: 1.15, crit: 0.12, projSpeed: 1.1 },
    perk: 'Eagle Eye: +12% crit, +15% move speed',
    ult: 'arrowstorm',
    ultName: 'Arrow Storm',
    ultDesc: 'Arrows rain on every foe in sight for 3 seconds.',
  },
  mage: {
    id: 'mage',
    name: 'Eldrin',
    title: 'Sorcerer',
    sprite: 'mage',
    pose: 'mage_pose',
    weapon: 'fireball',
    color: '#b55088',
    stats: { maxHp: 95, cooldown: 0.9, area: 1.1, growth: 1.1 },
    perk: 'Arcane Mind: -10% cooldowns, +10% area & XP',
    ult: 'cataclysm',
    ultName: 'Cataclysm',
    ultDesc: 'Call down a storm of meteors across the battlefield.',
  },
  rogue: {
    id: 'rogue',
    name: 'Kael',
    title: 'Shadow',
    sprite: 'rogue',
    pose: 'rogue_pose',
    weapon: 'daggers',
    color: '#8f5bb0',
    stats: { maxHp: 95, speed: 1.2, crit: 0.18, luck: 1.2 },
    perk: 'Shadowstep: +18% crit, +20% speed & luck',
    ult: 'shadowdance',
    ultName: 'Shadow Dance',
    ultDesc: 'Vanish for 3s: untouchable, and blades fly in every direction.',
  },
  necromancer: {
    id: 'necromancer',
    name: 'Morvath',
    title: 'Necromancer',
    sprite: 'necromancer',
    pose: 'necromancer_pose',
    weapon: 'raise',
    color: '#9ee562',
    stats: { maxHp: 90, duration: 1.3, growth: 1.1 },
    perk: 'Grave Pact: minions last 30% longer, +10% XP',
    ult: 'deadrise',
    ultName: 'Army of the Dead',
    ultDesc: 'Raise a ring of empowered skeleton warriors around you.',
  },
};

// Unlock order lives in shared/profile.js (enforced by the server): five minutes on the clock
// with one hero bring in the next.
export { HERO_ORDER } from '../shared/profile.js';
