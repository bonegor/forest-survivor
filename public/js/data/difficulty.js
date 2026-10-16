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
// how many of the monsters that shoot or lunge come (spawner.js isFew). The id stays 'hard' so
// saves and checkpoints keep their shape.
export const VETERAN = {
  id: 'hard',
  name: 'Veteran',
  hp: 1.9 * TOUGHER,
  dmg: 1.65 * DEADLIER,
  spawn: 1.15 * MORE,
  horde: MORE,
  speed: 1.12,
  elite: 1.35,
  gold: 1.5,
  hurt: 1,
  few: 1,
  desc: 'The night at full strength. Gold x1.5.',
};

// Normal (the user's: "all the monsters have their damage cause reduced by 50% and the number
// of ranged monsters spawn + wolver + any other monsters that lunges is reduced to 1/3"): Veteran
// with every blow the hero takes halved, and a third as many monsters that shoot or lunge. It
// pays gold as the old Medium did. The id is the old Medium's, which the saves already know.
export const NORMAL = {
  ...VETERAN,
  id: 'medium',
  name: 'Normal',
  gold: 1,
  hurt: 0.5,
  few: 1 / 3,
  desc: 'Monsters hit half as hard, and a third as many shoot or charge. Gold x1.',
};

// By id, as a run, a checkpoint and the profile's wins keep it.
export const DIFFS = { medium: NORMAL, hard: VETERAN };

// What a run without a choice plays (bots, tests, older saves): the game as it was tuned.
export const RULES = VETERAN;

// Ranked keeps one best time per hero, so it is always Veteran.
export const diffFor = (mode, id) => (mode === 'ranked' ? VETERAN : DIFFS[id] || VETERAN);

// The whole game runs this much faster than real time: the night's clock, the hero, the monsters,
// everything in a run (not the menus), so the 15-minute night passes in about 13⅔ minutes.
export const GAME_SPEED = 1.1;

export const MODES = {
  s15: { id: 's15', name: 'Survival', sub: '15 minutes', minutes: 15, desc: 'Hold out until dawn in the Darkwood.' },
  dungeon: { id: 'dungeon', name: 'Dungeon Run', sub: '3 floors', desc: 'Slay each floor\'s guardian and descend. Defeat the Demon Lord.' },
  ranked: { id: 'ranked', name: 'Ranked', sub: 'Endless', desc: 'No dawn. The night grows deadlier forever. How long can you last?' },
};
