// How much tougher than the old Hard monsters are, round on round of tuning:
// their numbers (+10%, +10%, +20%), health (+10%, +10%, +10%, +20%) and
// damage (+10%, +10%, +20%, +10%, +20%), then BUMPS more rounds of +10% to
// both health and damage.
const BUMPS = 2;
const MORE = 1.1 * 1.1 * 1.2;
const TOUGHER = 1.1 * 1.1 * 1.1 * 1.2 * 1.1 ** BUMPS;
const DEADLIER = 1.1 * 1.1 * 1.2 * 1.1 * 1.2 * 1.1 ** BUMPS;

// The one difficulty, for every mode (Easy and Medium are gone for now): the
// old Hard, made harder as above. Multipliers on the base monster stats, the
// size of the steady horde (spawn) and of the timed swarms, rings and packs
// (horde); the id stays 'hard' so saves and checkpoints keep their shape.
export const RULES = {
  id: 'hard',
  hp: 1.9 * TOUGHER,
  dmg: 1.65 * DEADLIER,
  spawn: 1.15 * MORE,
  horde: MORE,
  speed: 1.12,
  elite: 1.35,
  gold: 1.5,
};

// The whole game runs this much faster than real time: the night's clock, the hero, the monsters,
// everything in a run (not the menus), so the 15-minute night passes in about 13⅔ minutes.
export const GAME_SPEED = 1.1;

export const MODES = {
  s15: { id: 's15', name: 'Survival', sub: '15 minutes', minutes: 15, desc: 'Hold out until dawn in the Darkwood.' },
  dungeon: { id: 'dungeon', name: 'Dungeon Run', sub: '3 floors', desc: 'Slay each floor\'s guardian and descend. Defeat the Demon Lord.' },
  ranked: { id: 'ranked', name: 'Ranked', sub: 'Endless', desc: 'No dawn. The night grows deadlier forever. How long can you last?' },
};
