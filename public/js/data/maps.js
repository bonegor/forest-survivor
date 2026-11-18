// Survival maps share one spawn schedule. Biomes supply their own terrain and effects,
// and foe factors set the population, health, damage and experience on each map.

import { POCKETS, EVENTS, LAST_STAND, SURVIVAL_BOSSES } from './waves.js';
import { STANDS_FOR } from './enemies.js';
import { PROGRESS } from '../shared/progress.js';

const SAME = { hp: 1, dmg: 1, horde: 1, xp: 1 };

// Each variant takes one Darkwood kind's place in the steady horde and timed events.
function survivalSchedule(variants, bossIds) {
  const byKind = Object.fromEntries(variants.map((id) => [STANDS_FOR[id], id]));
  const enemyFor = (kind) => byKind[kind] ?? kind;
  return {
    pockets: POCKETS.map(({ minutes, spawn }) => ({
      minutes,
      spawn: Object.fromEntries(Object.entries(spawn).map(([kind, weight]) => [enemyFor(kind), weight])),
    })),
    events: EVENTS.map((event) => ({ ...event, enemy: enemyFor(event.enemy) })),
    lastStand: LAST_STAND,
    bosses: SURVIVAL_BOSSES.s15.map(({ at }, i) => ({ at, id: bossIds[i] })),
    fallback: enemyFor('skeleton'),
  };
}

export const MAPS = {
  desert: {
    id: 'desert',
    name: 'The Sunscorch',
    short: 'DESERT',
    color: '#feae34',
    desc: 'Sunlit dunes, bleached bones and buried tombs. The gentlest fight: start here.',
    look: 'desert',
    seed: 2, // its own world (game/darkwood.js setWorld): its own roads, groves and landmarks
    music: 'forest',
    foe: { hp: 0.85, dmg: 0.7, horde: 0.7, xp: 1.3 },
    ...survivalSchedule([
      'scarab', 'vulture', 'sandslime', 'mummy', 'jackal', 'scorpion',
      'dustwraith', 'anubite', 'sandgolem',
    ], ['butcher', 'lich', 'pharaoh']),
    side: 'dunes',
    summons: { ghost: 'dustwraith' },
  },
  frozen: {
    id: 'frozen',
    name: 'The Frostfell',
    short: 'FROZEN',
    color: '#8fd8ff',
    desc: 'A frozen waste under a cold sun, where the dead never rot. Harder than the dunes.',
    look: 'frozen',
    seed: 3,
    music: 'forest',
    foe: { hp: 0.9, dmg: 0.8, horde: 0.8, xp: 1.2 },
    ...survivalSchedule([
      'lemming', 'snowowl', 'frostslime', 'frostbitten', 'icewidow', 'frostwisp',
      'frostwitch', 'yeti', 'rimeknight', 'iceimp', 'frosthound', 'icetroll',
    ], ['boneking', 'lich', 'frostgiant']),
    side: 'snows',
    summons: { ghost: 'frostwisp' },
  },
  meadow: {
    id: 'meadow',
    name: 'The Bloomvale',
    short: 'MEADOW',
    color: '#f6757a',
    desc: 'Fae fields in bloom. Walk a circle: what it holds falls asleep.',
    look: 'meadow',
    seed: 4,
    music: 'forest',
    // Its Fae Thread (game/fae.js, 29 October 2026; the fae rings before it) takes the horde off the
    // hero for a while, so a little more of it comes (horde 0.95, was 0.9) for a little less each (xp 1.05, was 1.1): 0.9975
    // of the Darkwood's experience, levelling as ever, and still between the Frostfell and the Darkwood.
    foe: { hp: 0.95, dmg: 0.9, horde: 0.95, xp: 1.05 },
    ...survivalSchedule([
      'rabbit', 'bee', 'petalslime', 'myconid', 'flytrap', 'mantis',
      'pixie', 'thornwitch', 'boar', 'thornknight', 'treant',
    ], ['boneking', 'butcher', 'thornqueen']),
    side: 'long grass',
    summons: { skeleton: 'myconid' },
  },
  forest: {
    id: 'forest',
    name: 'The Darkwood',
    short: 'FOREST',
    color: '#8fb8ff',
    desc: 'Hold out until dawn in the Darkwood.',
    look: 'forest',
    seed: 1,
    music: 'forest',
    foe: SAME,
    pockets: POCKETS,
    events: EVENTS,
    lastStand: LAST_STAND,
    bosses: SURVIVAL_BOSSES.s15,
    fallback: 'skeleton',
    side: 'dark',
    summons: null,
  },
  hell: {
    id: 'hell',
    name: 'The Abyss',
    short: 'HELL',
    color: '#e43b44',
    desc: 'Ash, fire and the legions of the pit. The hardest night of all.',
    look: 'hell',
    seed: 5,
    music: 'forest',
    foe: { hp: 1.15, dmg: 1.25, horde: 1.2, xp: 0.9 },
    ...survivalSchedule([
      'cinderrat', 'flameskull', 'magmaslime', 'damned', 'fiend', 'hellwraith',
      'demonbrute', 'lavagolem',
    ], ['butcher', 'pitlord', 'demonlord']),
    side: 'dark',
    summons: null,
  },
};

// The order they open in (shared/progress.js mapLadder): the first is open from the start.
export const MAP_LADDER = PROGRESS.mapLadder.map((id) => MAPS[id]);
export const FIRST_MAP = PROGRESS.mapLadder[0];

// A run's map: Survival's as chosen, the Darkwood when none is (the tests, the bots, the tools, an
// older client), when what is asked names none of them (never a name every object has, such as
// 'constructor') or for any other mode (Ranked and the Dungeon Run keep to the Darkwood).
export const mapFor = (mode, id) => (mode === 's15' && Object.hasOwn(MAPS, id) && MAPS[id]) || MAPS.forest;
