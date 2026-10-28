// The Survival maps: where the 15-minute night is spent, what it sends and how hard it hits.
// The owner's (28 October 2026): "we basically need a few more maps ... the desert map ... a frozen,
// you know, snowy map ... a bright flower, colorful map ... a dark, hellish, essentially dark,
// hellish, demonic map", opening desert, frozen, (the meadow), forest, hell, "and they should be
// like that in terms of difficulty too, make a few new sprites for the monsters, sure and you can
// also sometimes reuse sprites in different maps, but do not alter their health by too much".
//
// Each map is the Darkwood's night on another ground (game/biomes.js `look`): the same clock,
// waves, swarms, rings, packs, last stand and three bosses, drawn from its own roster. What makes
// one harder than another is who comes (its pockets, events and bosses) and `foe`: how many come
// (horde: the steady horde and every swarm, ring and pack, after the difficulty's bend, as a
// Nightmare's more is), how hard they hit (dmg: every blow the hero takes, before his armor), and
// a little of how tough they are (hp: kept within a sixth either way, the owner's "do not alter
// their health by too much"), with the horde's experience (xp) making up for fewer or more of them,
// so a hero levels at about the same pace on every map.
//
// The Darkwood's entry is the night as it always was, by reference: the tables of data/waves.js
// themselves and every factor 1, so a run without a map (the tests, the bots, the tools) and
// Ranked and the Dungeon Run (always in the Darkwood) play exactly as before.

import { POCKETS, EVENTS, LAST_STAND, SURVIVAL_BOSSES } from './waves.js';
import { PROGRESS } from '../shared/progress.js';

const SAME = { hp: 1, dmg: 1, horde: 1, xp: 1 };

// The rosters (28 October 2026). Each map's night is the Darkwood's, minute by minute. Its pockets
// have the forest's minutes and weights (data/waves.js POCKETS), each Darkwood kind replaced by its
// map's own (data/enemies.js STANDS_FOR: the same numbers, its own looks) in the same order; where two
// of the forest's kinds become one, their weights add up, at the first one's place. Its events are the
// forest's (EVENTS: the same times, kinds of event and counts, so none comes within 30 s of a boss),
// each of a kind of its map that suits it: a swarm of flyers or the swift, a ring of walkers or the
// dead rising, a pack of chargers or of those that come in threes. Its last stand is the forest's
// (LAST_STAND), a ring of every kind its own pockets have brought by 14:00 (Spawner.fire). Its three
// bosses come at the forest's times, 4:30, 9:00 and 13:00, no one twice (the HUD's skulls go gold by
// a boss's id), the last of each its own but the Abyss's, whose own comes at 9:00 before Azgaroth.
// The gentler maps send their tough kinds in the forest's own places and some late ones lighter (the
// Sunscorch's Imps come as Carrion Vultures and its Hellhounds as Dune Jackals, the Bloomvale's
// Hellhounds as Orchid Mantises); the Abyss sends its own a minute or so sooner (its pockets from
// 3:00 are the forest's from 4:00), and a little more of its toughest in the night's last pocket.
// The Cultist's place (a Frost Witch, a Thorn Witch) is weighed as his, one in twenty at most.
// The pockets and events past dawn are only Ranked's, which keeps to the Darkwood: there for the
// table's shape. A map's `fallback` is sent when a pocket has nothing left to send (a champion at
// dusk, when it holds only small fry), `side` is where a warning says a pack comes from when it can't
// say which way (events.js eventWords: the Darkwood's "from the dark"), and `summons` is what a
// Darkwood boss calls up there (Game.summonRing): the map's own kind in the place of his, the Lich's
// Wraiths rising as the Sunscorch's Dust Wraiths and the Frostfell's Frost Wisps, the Bone King's
// Skeletons as the Bloomvale's Myconids (none in the Darkwood, nor in the Abyss, whose Azgaroth
// calls up its own Imps; the new bosses call up their own, data/enemies.js summon).
const DESERT_POCKETS = [
  { minutes: [0, 1], spawn: { scarab: 6, vulture: 4 } },
  { minutes: [1, 2], spawn: { scarab: 5, vulture: 5, sandslime: 3 } },
  { minutes: [2, 3], spawn: { scarab: 4, vulture: 3, sandslime: 3, skeleton: 5 } },
  { minutes: [3, 4], spawn: { vulture: 1, sandslime: 3, skeleton: 6, mummy: 4 } },
  { minutes: [4, 5], spawn: { vulture: 1, sandslime: 2, skeleton: 6, mummy: 4, jackal: 3 } },
  { minutes: [5, 6], spawn: { vulture: 1, skeleton: 6, mummy: 4, jackal: 3, goblin: 5 } },
  { minutes: [6, 7], spawn: { vulture: 1, skeleton: 6, mummy: 4, jackal: 3, goblin: 5, scorpion: 3 } },
  { minutes: [7, 8], spawn: { vulture: 1, skeleton: 6, mummy: 4, jackal: 3, goblin: 5, scorpion: 3, dustwraith: 3 } },
  { minutes: [8, 9], spawn: { vulture: 1, skeleton: 4, mummy: 4, jackal: 3, goblin: 5, scorpion: 3, dustwraith: 3, cultist: 1, orc: 2 } },
  { minutes: [9, 10], spawn: { vulture: 1, skeleton: 1.5, mummy: 4, jackal: 3, goblin: 5, scorpion: 3, dustwraith: 3, cultist: 1, orc: 3, anubite: 1 } },
  // The Imps' four are Carrion Vultures (with the bats' one, five), from 11:00 the Hellhounds' three Dune Jackals.
  { minutes: [10, 11], spawn: { vulture: 5, skeleton: 1.5, jackal: 3, goblin: 5, scorpion: 3, dustwraith: 3, cultist: 1, orc: 3, anubite: 2 } },
  { minutes: [11, 12], spawn: { vulture: 5, skeleton: 1.5, goblin: 5, scorpion: 3, dustwraith: 3, cultist: 1, orc: 3, jackal: 3, anubite: 2, sandgolem: 1 } },
  { minutes: [12, 13.5], spawn: { vulture: 5, skeleton: 1.5, scorpion: 3, dustwraith: 3, cultist: 1, orc: 3, jackal: 3, anubite: 3, sandgolem: 1.5 } },
  { minutes: [13.5, 15], spawn: { vulture: 5, skeleton: 1.5, scorpion: 3, dustwraith: 3, cultist: 1, orc: 3, jackal: 3, anubite: 3, sandgolem: 2 } },
  { minutes: [15, 19], spawn: { vulture: 5, skeleton: 1.5, dustwraith: 3, cultist: 1, orc: 2, jackal: 3, anubite: 2, sandgolem: 1.1 } },
  { minutes: [19, Infinity], spawn: { vulture: 5, skeleton: 1.5, cultist: 1, orc: 2, jackal: 3, anubite: 2, sandgolem: 1.1 } },
];
// The forest's Imp swarm at 10:30 is a carpet of scarabs out of the sand; its others are vultures
// (the bats' and the Imps' alike: the Imps' place in its pockets is theirs).
const DESERT_EVENTS = [
  { at: 2.5, type: 'swarm', enemy: 'vulture', count: 16 },
  { at: 4.5, type: 'ring', enemy: 'skeleton', count: 26 },
  { at: 7, type: 'swarm', enemy: 'vulture', count: 30 },
  { at: 9.5, type: 'pack', enemy: 'jackal', count: 8 },
  { at: 11, type: 'ring', enemy: 'mummy', count: 34 },
  { at: 14.7, type: 'swarm', enemy: 'scarab', count: 26 },
  { at: 15.5, type: 'pack', enemy: 'goblin', count: 18 },
  { at: 16.8, type: 'ring', enemy: 'dustwraith', count: 40 },
  { at: 20, type: 'swarm', enemy: 'vulture', count: 36 },
  { at: 22.5, type: 'pack', enemy: 'jackal', count: 10 },
  { at: 24.5, type: 'ring', enemy: 'anubite', count: 22 },
  { at: 27, type: 'swarm', enemy: 'vulture', count: 44 },
  { at: 28.5, type: 'ring', enemy: 'skeleton', count: 60 },
];
const DESERT_BOSSES = [
  { at: 4.5 * 60, id: 'butcher' },
  { at: 9 * 60, id: 'lich' },
  { at: 13 * 60, id: 'pharaoh' },
];

const FROZEN_POCKETS = [
  { minutes: [0, 1], spawn: { lemming: 6, snowowl: 4 } },
  { minutes: [1, 2], spawn: { lemming: 5, snowowl: 5, frostslime: 3 } },
  { minutes: [2, 3], spawn: { lemming: 4, snowowl: 3, frostslime: 3, skeleton: 5 } },
  { minutes: [3, 4], spawn: { snowowl: 1, frostslime: 3, skeleton: 6, frostbitten: 4 } },
  { minutes: [4, 5], spawn: { snowowl: 1, frostslime: 2, skeleton: 6, frostbitten: 4, wolf: 3 } },
  { minutes: [5, 6], spawn: { snowowl: 1, skeleton: 6, frostbitten: 4, wolf: 3, goblin: 5 } },
  { minutes: [6, 7], spawn: { snowowl: 1, skeleton: 6, frostbitten: 4, wolf: 3, goblin: 5, icewidow: 3 } },
  { minutes: [7, 8], spawn: { snowowl: 1, skeleton: 6, frostbitten: 4, wolf: 3, goblin: 5, icewidow: 3, frostwisp: 3 } },
  { minutes: [8, 9], spawn: { snowowl: 1, skeleton: 4, frostbitten: 4, wolf: 3, goblin: 5, icewidow: 3, frostwisp: 3, frostwitch: 1, yeti: 2 } },
  { minutes: [9, 10], spawn: { snowowl: 1, skeleton: 1.5, frostbitten: 4, wolf: 3, goblin: 5, icewidow: 3, frostwisp: 3, frostwitch: 1, yeti: 3, rimeknight: 1 } },
  { minutes: [10, 11], spawn: { snowowl: 1, skeleton: 1.5, wolf: 3, goblin: 5, icewidow: 3, frostwisp: 3, frostwitch: 1, yeti: 3, iceimp: 4, rimeknight: 2 } },
  { minutes: [11, 12], spawn: { snowowl: 1, skeleton: 1.5, goblin: 5, icewidow: 3, frostwisp: 3, frostwitch: 1, yeti: 3, iceimp: 4, frosthound: 3, rimeknight: 2, icetroll: 1 } },
  { minutes: [12, 13.5], spawn: { snowowl: 1, skeleton: 1.5, icewidow: 3, frostwisp: 3, frostwitch: 1, yeti: 3, iceimp: 4, frosthound: 3, rimeknight: 3, icetroll: 1.5 } },
  { minutes: [13.5, 15], spawn: { snowowl: 1, skeleton: 1.5, icewidow: 3, frostwisp: 3, frostwitch: 1, yeti: 3, iceimp: 4, frosthound: 3, rimeknight: 3, icetroll: 2 } },
  { minutes: [15, 19], spawn: { snowowl: 1, skeleton: 1.5, frostwisp: 3, frostwitch: 1, yeti: 2, iceimp: 4, frosthound: 3, rimeknight: 2, icetroll: 1.1 } },
  { minutes: [19, Infinity], spawn: { snowowl: 1, skeleton: 1.5, frostwitch: 1, yeti: 2, iceimp: 4, frosthound: 3, rimeknight: 2, icetroll: 1.1 } },
];
const FROZEN_EVENTS = [
  { at: 2.5, type: 'swarm', enemy: 'snowowl', count: 16 },
  { at: 4.5, type: 'ring', enemy: 'skeleton', count: 26 },
  { at: 7, type: 'swarm', enemy: 'snowowl', count: 30 },
  { at: 9.5, type: 'pack', enemy: 'wolf', count: 8 },
  { at: 11, type: 'ring', enemy: 'frostbitten', count: 34 },
  { at: 14.7, type: 'swarm', enemy: 'iceimp', count: 26 },
  { at: 15.5, type: 'pack', enemy: 'goblin', count: 18 },
  { at: 16.8, type: 'ring', enemy: 'frostwisp', count: 40 },
  { at: 20, type: 'swarm', enemy: 'iceimp', count: 36 },
  { at: 22.5, type: 'pack', enemy: 'frosthound', count: 10 },
  { at: 24.5, type: 'ring', enemy: 'rimeknight', count: 22 },
  { at: 27, type: 'swarm', enemy: 'iceimp', count: 44 },
  { at: 28.5, type: 'ring', enemy: 'skeleton', count: 60 },
];
const FROZEN_BOSSES = [
  { at: 4.5 * 60, id: 'boneking' },
  { at: 9 * 60, id: 'lich' },
  { at: 13 * 60, id: 'frostgiant' },
];

const MEADOW_POCKETS = [
  { minutes: [0, 1], spawn: { rabbit: 6, bee: 4 } },
  { minutes: [1, 2], spawn: { rabbit: 5, bee: 5, petalslime: 3 } },
  { minutes: [2, 3], spawn: { rabbit: 4, bee: 3, petalslime: 3, myconid: 5 } },
  { minutes: [3, 4], spawn: { bee: 1, petalslime: 3, myconid: 6, flytrap: 4 } },
  { minutes: [4, 5], spawn: { bee: 1, petalslime: 2, myconid: 6, flytrap: 4, mantis: 3 } },
  { minutes: [5, 6], spawn: { bee: 1, myconid: 6, flytrap: 4, mantis: 3, goblin: 5 } },
  { minutes: [6, 7], spawn: { bee: 1, myconid: 6, flytrap: 4, mantis: 3, goblin: 5, spider: 3 } },
  { minutes: [7, 8], spawn: { bee: 1, myconid: 6, flytrap: 4, mantis: 3, goblin: 5, spider: 3, pixie: 3 } },
  { minutes: [8, 9], spawn: { bee: 1, myconid: 4, flytrap: 4, mantis: 3, goblin: 5, spider: 3, pixie: 3, thornwitch: 1, boar: 2 } },
  { minutes: [9, 10], spawn: { bee: 1, myconid: 1.5, flytrap: 4, mantis: 3, goblin: 5, spider: 3, pixie: 3, thornwitch: 1, boar: 3, thornknight: 1 } },
  { minutes: [10, 11], spawn: { bee: 1, myconid: 1.5, mantis: 3, goblin: 5, spider: 3, pixie: 3, thornwitch: 1, boar: 3, imp: 4, thornknight: 2 } },
  // From 11:00 the Hellhounds' three are Orchid Mantises, as the Dire Wolves' were.
  { minutes: [11, 12], spawn: { bee: 1, myconid: 1.5, goblin: 5, spider: 3, pixie: 3, thornwitch: 1, boar: 3, imp: 4, mantis: 3, thornknight: 2, treant: 1 } },
  { minutes: [12, 13.5], spawn: { bee: 1, myconid: 1.5, spider: 3, pixie: 3, thornwitch: 1, boar: 3, imp: 4, mantis: 3, thornknight: 3, treant: 1.5 } },
  { minutes: [13.5, 15], spawn: { bee: 1, myconid: 1.5, spider: 3, pixie: 3, thornwitch: 1, boar: 3, imp: 4, mantis: 3, thornknight: 3, treant: 2 } },
  { minutes: [15, 19], spawn: { bee: 1, myconid: 1.5, pixie: 3, thornwitch: 1, boar: 2, imp: 4, mantis: 3, thornknight: 2, treant: 1.1 } },
  { minutes: [19, Infinity], spawn: { bee: 1, myconid: 1.5, thornwitch: 1, boar: 2, imp: 4, mantis: 3, thornknight: 2, treant: 1.1 } },
];
const MEADOW_EVENTS = [
  { at: 2.5, type: 'swarm', enemy: 'bee', count: 16 },
  { at: 4.5, type: 'ring', enemy: 'myconid', count: 26 },
  { at: 7, type: 'swarm', enemy: 'bee', count: 30 },
  { at: 9.5, type: 'pack', enemy: 'mantis', count: 8 },
  { at: 11, type: 'ring', enemy: 'flytrap', count: 34 },
  { at: 14.7, type: 'swarm', enemy: 'imp', count: 26 },
  { at: 15.5, type: 'pack', enemy: 'goblin', count: 18 },
  { at: 16.8, type: 'ring', enemy: 'pixie', count: 40 },
  { at: 20, type: 'swarm', enemy: 'imp', count: 36 },
  { at: 22.5, type: 'pack', enemy: 'mantis', count: 10 },
  { at: 24.5, type: 'ring', enemy: 'thornknight', count: 22 },
  { at: 27, type: 'swarm', enemy: 'imp', count: 44 },
  { at: 28.5, type: 'ring', enemy: 'myconid', count: 60 },
];
const MEADOW_BOSSES = [
  { at: 4.5 * 60, id: 'boneking' },
  { at: 9 * 60, id: 'butcher' },
  { at: 13 * 60, id: 'thornqueen' },
];

const HELL_POCKETS = [
  { minutes: [0, 1], spawn: { cinderrat: 6, flameskull: 4 } },
  { minutes: [1, 2], spawn: { cinderrat: 5, flameskull: 5, magmaslime: 3 } },
  { minutes: [2, 3], spawn: { cinderrat: 4, flameskull: 3, magmaslime: 3, skeleton: 5 } },
  // From here each pocket is the forest's next: Hellhounds (the Dire Wolves' place) from 3:00,
  // Fiendlings from 4:00, Cultists and Horned Brutes from 7:00, Magma Golems from 10:00.
  { minutes: [3, 4], spawn: { flameskull: 1, magmaslime: 2, skeleton: 6, damned: 4, hellhound: 3 } },
  { minutes: [4, 5], spawn: { flameskull: 1, skeleton: 6, damned: 4, hellhound: 3, fiend: 5 } },
  { minutes: [5, 6], spawn: { flameskull: 1, skeleton: 6, damned: 4, hellhound: 3, fiend: 5, spider: 3 } },
  { minutes: [6, 7], spawn: { flameskull: 1, skeleton: 6, damned: 4, hellhound: 3, fiend: 5, spider: 3, hellwraith: 3 } },
  { minutes: [7, 8], spawn: { flameskull: 1, skeleton: 4, damned: 4, hellhound: 3, fiend: 5, spider: 3, hellwraith: 3, cultist: 1, demonbrute: 2 } },
  { minutes: [8, 9], spawn: { flameskull: 1, skeleton: 1.5, damned: 4, hellhound: 3, fiend: 5, spider: 3, hellwraith: 3, cultist: 1, demonbrute: 3, deathknight: 1 } },
  { minutes: [9, 10], spawn: { flameskull: 1, skeleton: 1.5, hellhound: 3, fiend: 5, spider: 3, hellwraith: 3, cultist: 1, demonbrute: 3, imp: 4, deathknight: 2 } },
  { minutes: [10, 11], spawn: { flameskull: 1, skeleton: 1.5, fiend: 5, spider: 3, hellwraith: 3, cultist: 1, demonbrute: 3, imp: 4, hellhound: 3, deathknight: 2, lavagolem: 1 } },
  { minutes: [11, 12], spawn: { flameskull: 1, skeleton: 1.5, spider: 3, hellwraith: 3, cultist: 1, demonbrute: 3, imp: 4, hellhound: 3, deathknight: 3, lavagolem: 1.5 } },
  { minutes: [12, 13.5], spawn: { flameskull: 1, skeleton: 1.5, spider: 3, hellwraith: 3, cultist: 1, demonbrute: 3, imp: 4, hellhound: 3, deathknight: 3, lavagolem: 2 } },
  // The night's last pocket: the forest's, with half a weight more of each of its toughest (Horned
  // Brutes, Hellhounds, Death Knights and Magma Golems).
  { minutes: [13.5, 15], spawn: { flameskull: 1, skeleton: 1.5, spider: 3, hellwraith: 3, cultist: 1, demonbrute: 3.5, imp: 4, hellhound: 3.5, deathknight: 3.5, lavagolem: 2.5 } },
  { minutes: [15, 19], spawn: { flameskull: 1, skeleton: 1.5, hellwraith: 3, cultist: 1, demonbrute: 2, imp: 4, hellhound: 3, deathknight: 2, lavagolem: 1.1 } },
  { minutes: [19, Infinity], spawn: { flameskull: 1, skeleton: 1.5, cultist: 1, demonbrute: 2, imp: 4, hellhound: 3, deathknight: 2, lavagolem: 1.1 } },
];
const HELL_EVENTS = [
  { at: 2.5, type: 'swarm', enemy: 'flameskull', count: 16 },
  { at: 4.5, type: 'ring', enemy: 'skeleton', count: 26 },
  { at: 7, type: 'swarm', enemy: 'flameskull', count: 30 },
  { at: 9.5, type: 'pack', enemy: 'hellhound', count: 8 },
  { at: 11, type: 'ring', enemy: 'damned', count: 34 },
  { at: 14.7, type: 'swarm', enemy: 'imp', count: 26 },
  { at: 15.5, type: 'pack', enemy: 'fiend', count: 18 },
  { at: 16.8, type: 'ring', enemy: 'hellwraith', count: 40 },
  { at: 20, type: 'swarm', enemy: 'imp', count: 36 },
  { at: 22.5, type: 'pack', enemy: 'hellhound', count: 10 },
  { at: 24.5, type: 'ring', enemy: 'deathknight', count: 22 },
  { at: 27, type: 'swarm', enemy: 'imp', count: 44 },
  { at: 28.5, type: 'ring', enemy: 'skeleton', count: 60 },
];
const HELL_BOSSES = [
  { at: 4.5 * 60, id: 'butcher' },
  { at: 9 * 60, id: 'pitlord' },
  { at: 13 * 60, id: 'demonlord' },
];

export const MAPS = {
  desert: {
    id: 'desert',
    name: 'The Sunscorch',
    short: 'DESERT',
    color: '#feae34',
    desc: 'Dunes, bleached bones and buried tombs. The gentlest night: start here.',
    look: 'desert',
    seed: 2, // its own world (game/darkwood.js setWorld): its own roads, groves and landmarks
    music: 'forest',
    foe: { hp: 0.85, dmg: 0.7, horde: 0.7, xp: 1.3 },
    pockets: DESERT_POCKETS,
    events: DESERT_EVENTS,
    lastStand: LAST_STAND,
    bosses: DESERT_BOSSES,
    fallback: 'skeleton',
    side: 'dunes',
    summons: { ghost: 'dustwraith' },
  },
  frozen: {
    id: 'frozen',
    name: 'The Frostfell',
    short: 'FROZEN',
    color: '#8fd8ff',
    desc: 'A frozen waste where the dead never rot. Colder, and harder, than the dunes.',
    look: 'frozen',
    seed: 3,
    music: 'forest',
    foe: { hp: 0.9, dmg: 0.8, horde: 0.8, xp: 1.2 },
    pockets: FROZEN_POCKETS,
    events: FROZEN_EVENTS,
    lastStand: LAST_STAND,
    bosses: FROZEN_BOSSES,
    fallback: 'skeleton',
    side: 'snows',
    summons: { ghost: 'frostwisp' },
  },
  meadow: {
    id: 'meadow',
    name: 'The Bloomvale',
    short: 'MEADOW',
    color: '#f6757a',
    desc: 'Bright meadows in bloom, ruled by fae and thorn. Prettier than it is kind.',
    look: 'meadow',
    seed: 4,
    music: 'forest',
    foe: { hp: 0.95, dmg: 0.9, horde: 0.9, xp: 1.1 },
    pockets: MEADOW_POCKETS,
    events: MEADOW_EVENTS,
    lastStand: LAST_STAND,
    bosses: MEADOW_BOSSES,
    fallback: 'myconid',
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
    pockets: HELL_POCKETS,
    events: HELL_EVENTS,
    lastStand: LAST_STAND,
    bosses: HELL_BOSSES,
    fallback: 'skeleton',
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
