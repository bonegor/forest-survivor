// Playable heroes. `stats` are multipliers/overrides on the base player.
//
// Each hero class has a signature weapon no other can get (`unique`; the Necromancer has two),
// and every other weapon is shared by all (SHARED_WEAPONS): a level-up offers a hero his own and
// the shared ones (weaponsFor). `start`: what he starts a run with, if not his `weapon` alone
// (startWeapons). Relics are shared by all.

import { WEAPONS } from './weapons.js';

// The owner's rule (21 October 2026): every hero loses a night on Normal without the Armory and
// wins it with the Armory full, as the best bot plays it (tools/bots.mjs, gems and autopilot). The
// Knight, Ranger, Shadow, Necromancer, Paladin and Berserker were cut to it that day: their health,
// the Knight's armour and regeneration, the Berserker's Bloodrage.
export const HEROES = {
  knight: {
    id: 'knight',
    short: 'Knight', // on a hero card too narrow for the title (a phone held upright)
    name: 'Sir Aldric',
    title: 'Knight',
    sprite: 'knight',
    pose: 'knight_pose', // his painted pose on the in-run panels; the hero screen frames the in-game sprite, as for every hero
    weapon: 'sword', // in the crypts each hero has his own weapon alone, struck by the player (Game.caveStrike)
    unique: ['sword'],
    color: '#0099db',
    // regenMul scales every kind of regeneration he gets (his own, Troll Blood, the Armory's
    // Recovery, the Protection shrine, Sanctuary): twice as much.
    stats: { maxHp: 85, armor: 1, speed: 1.067, regen: 0.15, regenMul: 2 },
    perk: 'Bulwark: +1 armor, regenerates, every regeneration doubled',
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
    // The owner's (20 October 2026): "make ranger attack faster and stronger (both by 20%) and
    // increase ranger health by 50%". Faster is how often her weapons strike (every cooldown
    // divided by 1.2), not her pace, which the thief is measured against; stronger is her damage
    // (might), the bow's and all else she fires. Her health, 150 then, is 80 since the rule above.
    stats: { maxHp: 80, might: 1.2, cooldown: 1 / 1.2, speed: 1.15, crit: 0.12, projSpeed: 1.1 },
    perk: 'Eagle Eye: +20% damage & attack speed, +12% crit',
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
    // A faint 1 px light line round him on the menus (ui/screens.js heroLine): his dark tones (the
    // owner's pick) are lost on their dark panels otherwise. Drawn round him, his colours untouched.
    // None in play, where he is always in the middle of the screen (game.js HERO_MARK).
    line: 1,
    stats: { maxHp: 45, speed: 1.2, crit: 0.18, luck: 1.2 },
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
    stats: { maxHp: 50, summonDur: 1.3, growth: 1.1 },
    perk: 'Grave Pact: minions last 30% longer, +10% XP',
    ult: 'deadrise',
    ultName: 'Army of the Dead',
    ultDesc: 'Raise a ring of empowered death knights around you.',
  },
  // The four of 20 October 2026, asked for together ("all four"), after the Necromancer in
  // HERO_ORDER: extras beside the ladder's five (shared/profile.js LADDER). Their sprites are
  // in art/hero-sheets.js.
  paladin: {
    id: 'paladin',
    short: 'Paladin',
    name: 'Dame Seraphine',
    title: 'Paladin',
    sprite: 'paladin',
    pose: 'paladin_pose',
    // One look since 27 October 2026: a holy crusader after Diablo 2's Paladin (lab
    // paladin/knightstyle-e), in place of her Styles C and D; in a cylindrical great helm (knightstyle-e2).
    weapon: 'smite',
    unique: ['smite'],
    color: '#fee761',
    // Devotion: every heal, regeneration of any kind included, does healMul as much (Player.heal,
    // regenMul); each kill heals killHeal, at most KILL_HEAL.most a second.
    stats: { maxHp: 55, regen: 0.1, regenMul: 1.5, healMul: 1.5, killHeal: 0.15 },
    perk: 'Devotion: all healing x1.5, kills heal a little',
    ult: 'sanctum',
    ultName: 'Sanctum',
    ultDesc: 'A dome of light for 5s: foes in it are stunned and burn; she heals.',
  },
  druid: {
    id: 'druid',
    short: 'Druid',
    name: 'Bramwyn',
    title: 'Druid',
    sprite: 'druid',
    pose: 'druid_pose',
    weapon: 'roots',
    unique: ['roots'],
    color: '#b86f50',
    // Grove Warden: `grove` more damage while a tree stands within GROVE.near of him (the forest's;
    // never in a crypt or the Dungeon), and he regenerates.
    stats: { maxHp: 110, regen: 0.4, grove: 0.25 },
    perk: 'Grove Warden: +25% damage near trees, regenerates',
    ult: 'overgrowth',
    ultName: 'Overgrowth',
    ultDesc: 'Vines burst over the whole screen, rooting every foe for 3s.',
  },
  berserker: {
    id: 'berserker',
    short: 'Berserk',
    name: 'Ulfric',
    title: 'Berserker',
    sprite: 'berserker',
    pose: 'berserker_pose',
    weapon: 'twinaxes',
    unique: ['twinaxes'],
    color: '#e43b44',
    // Bloodrage: the lower his health, the harder and faster he strikes, up to rage.might more
    // damage and rage.haste faster weapons at none left (Player.rage).
    stats: { maxHp: 40, speed: 1.15, rage: { might: 0.3, haste: 0.15 } },
    perk: 'Bloodrage: up to +30% damage & +15% attack speed as health falls, +15% speed',
    ult: 'frenzy',
    ultName: 'Red Frenzy',
    ultDesc: 'For 5s he chops all round him without rest; each kill heals 3%.',
  },
  witchhunter: {
    id: 'witchhunter',
    short: 'Hunter',
    name: 'Mercy Crane',
    title: 'Witch Hunter',
    sprite: 'witchhunter',
    pose: 'witchhunter_pose',
    weapon: 'crossbow',
    unique: ['crossbow'],
    color: '#c0cbdc',
    // Inquisition: `bane` more damage on champions, crypt lords and bosses, from all she has.
    stats: { maxHp: 100, speed: 1.05, crit: 0.1, bane: 0.3 },
    perk: 'Inquisition: +30% damage to champions, lords & bosses, +10% crit',
    ult: 'purge',
    ultName: 'Purge',
    ultDesc: 'For 4s foes are slowed by half; every bolt flies three at once and bursts.',
  },
};

// The light line drawn round a hero that has one (line: the Shadow) on the menus; none in play.
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

// Every caller uses the single approved roster, regardless of old LOOK preferences.
export function heroLook(id) {
  // Old saved LOOK settings cannot restore a discarded sprite.
  return HEROES[id];
}
