import { DIFF_GOLD } from '../shared/profile.js';

// How much tougher than the old Hard monsters are, round on round of tuning:
// their numbers (+10%, +10%, +20%), health (+10%, +10%, +10%, +20%) and
// damage (+10%, +10%, +20%, +10%, +20%), then BUMPS more rounds of +10% to
// both health and damage.
const BUMPS = 2;
const MORE = 1.1 * 1.1 * 1.2;
const TOUGHER = 1.1 * 1.1 * 1.1 * 1.2 * 1.1 ** BUMPS;
const DEADLIER = 1.1 * 1.1 * 1.2 * 1.1 * 1.2 * 1.1 ** BUMPS;

// Veteran: the old Hard, made harder as above. Multipliers on the base monster
// stats, the size of the steady horde (spawn) and of the timed swarms, rings and
// packs (horde). hurt scales every blow the hero takes, after his armor, and few
// how many of the monsters that shoot or lunge come (spawner.js isFew). health is
// what this difficulty takes every monster's health down to, the crypts' lords too
// (hp has it in already), and late sends more of the night's monsters from a minute
// of it on (spawner.js lateMore). The id stays 'hard' so saves and run reports keep their shape.
// The gold a run brings home is the profile's to weigh (shared/profile.js DIFF_GOLD).
export const VETERAN = {
  id: 'hard',
  name: 'Veteran',
  hp: 1.9 * TOUGHER,
  dmg: 1.65 * DEADLIER,
  spawn: 1.15 * MORE,
  horde: MORE,
  speed: 1.12,
  elite: 1.35,
  hurt: 1,
  few: 1,
  health: 1,
  late: null,
  desc: `The night at full strength. Gold x${DIFF_GOLD.hard}.`,
};

// Normal's monsters, the user's (16 October 2026): "monster health -70%", and "in the last 6
// minutes 30% more of the same monsters, but they each have 70% less health". From minute 9 of
// the night (a Dungeon Run floor's own clock maps onto it: waves.js minuteOf) the steady horde
// and the timed swarms, rings and packs are 30% bigger.
const NORMAL_HEALTH = 0.3;
const NORMAL_LATE = { from: 9, more: 1.3 };

// Normal (the user's: "all the monsters have their damage cause reduced by 50% and the number
// of ranged monsters spawn + wolver + any other monsters that lunges is reduced to 1/3"): Veteran
// with every blow the hero takes halved, and a third as many monsters that shoot or lunge. It
// pays gold as the old Medium did. The id is the old Medium's, which the saves already know.
// Every monster has 70% less health, and late in the night 30% more come (above).
export const NORMAL = {
  ...VETERAN,
  id: 'medium',
  name: 'Normal',
  hp: VETERAN.hp * NORMAL_HEALTH,
  hurt: 0.5,
  few: 1 / 3,
  health: NORMAL_HEALTH,
  late: NORMAL_LATE,
  desc: `Monsters have 70% less health and hit half as hard; fewer shoot or charge, more come late. Gold x${DIFF_GOLD.medium}.`,
};

// By id, as a run report and the profile's wins keep it.
export const DIFFS = { medium: NORMAL, hard: VETERAN };

// Ranked keeps one best time per hero, so it is always Veteran; a run without a choice (bots,
// tests, older saves) plays it too: the game as it was tuned.
export const diffFor = (mode, id) => (mode === 'ranked' ? VETERAN : DIFFS[id] || VETERAN);

// The whole game runs this much faster than real time: the night's clock, the hero, the monsters,
// everything in a run (not the menus), so the 15-minute night passes in about 13⅔ minutes.
export const GAME_SPEED = 1.1;

export const MODES = {
  s15: { id: 's15', name: 'Survival', sub: '15 minutes', minutes: 15, desc: 'Hold out until dawn in the Darkwood.' },
  dungeon: { id: 'dungeon', name: 'Dungeon Run', sub: '3 floors', desc: 'Slay each floor\'s guardian and descend. Defeat the Demon Lord.' },
  ranked: { id: 'ranked', name: 'Ranked', sub: 'Endless', desc: 'No dawn. The night grows deadlier forever. How long can you last?' },
};
