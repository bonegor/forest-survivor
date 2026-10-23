import { DIFF_GOLD, NIGHTMARE_GOLD } from '../shared/profile.js';

// How much tougher than the old Hard monsters are, round on round of tuning:
// their numbers (+10%, +10%, +20%), health (+10%, +10%, +10%, +20%) and
// damage (+10%, +10%, +20%, +10%, +20%), then BUMPS more rounds of +10% to
// both health and damage, then HARDER: the owner's (20 October 2026) "difficulty is too easy.
// Increase monster health and damage by 20%", every monster on both difficulties (Normal is
// Veteran's with its cuts on top): the horde, champions, the thief, bosses and Dungeon Run floors
// through hp and every blow through dmg, and the crypts' lords, whose health is their own, through
// health (below).
const BUMPS = 2;
export const HARDER = 1.2;
const MORE = 1.1 * 1.1 * 1.2;
// The owner's, the same day after another test (20 October 2026): "the thing is even a bit too easy.
// Double the amount of monsters". The steady horde and the timed swarms, rings and packs, on both
// difficulties and a Dungeon Run's floors; a Nightmare multiplies that again (hordeMore). The crypts'
// sleeping packs, champions, thieves, bosses and their summons come as they did.
// Then, once more (20 October 2026): "double the number of monsters on all difficulties": 4.
export const CROWD = 4;
// The owner's (21 October 2026): "Reduce the numbers of monsters on normal by 3 times what it is rn.
// Then veteran is double, nightmare is tripple veteran". Normal sends a third of what both sent
// (NORMAL_CROWD), Veteran twice Normal's (VETERAN_CROWD: two thirds), a Nightmare three times
// Veteran's (NIGHTMARE.more). The steady horde and the timed swarms, rings and packs alike.
// Then, the same day: "Double the amount of monsters on all difficulties": both twice that.
// (Since 23 October 2026 that Normal is Veteran and that Veteran Elite: the names below.)
export const VETERAN_CROWD = 2 / 3, ELITE_CROWD = 2 * VETERAN_CROWD;
const TOUGHER = 1.1 * 1.1 * 1.1 * 1.2 * 1.1 ** BUMPS * HARDER;
const DEADLIER = 1.1 * 1.1 * 1.2 * 1.1 * 1.2 * 1.1 ** BUMPS * HARDER;

// Elite (Veteran until 23 October 2026, the owner's: "the veteran difficulty will become elite"):
// the old Hard, made harder as above. Multipliers on the base monster
// stats, the size of the steady horde (spawn) and of the timed swarms, rings and
// packs (horde). hurt scales every blow the hero takes, after his armor, and few
// how many of the monsters that shoot or lunge come (spawner.js isFew). health is
// what this difficulty does to a monster whose health is its own, a crypt's lord (hp has
// it in already): the last round's +20% (HARDER), and on Veteran and Normal 70% less on top. late
// sends more of the night's monsters from a minute of it on (spawner.js lateMore). The id
// stays 'hard' so saves and run reports keep their shape.
// The gold a run brings home is the profile's to weigh (shared/profile.js DIFF_GOLD).
export const ELITE = {
  id: 'hard',
  name: 'Elite',
  hp: 1.9 * TOUGHER,
  dmg: 1.65 * DEADLIER,
  spawn: 1.15 * MORE * CROWD * ELITE_CROWD,
  horde: MORE * CROWD * ELITE_CROWD,
  speed: 1.12,
  elite: 1.35,
  hurt: 1,
  few: 1,
  health: HARDER,
  late: null,
  desc: `The night at full strength. Gold x${DIFF_GOLD.hard}.`,
};

// Veteran (Normal until 23 October 2026, the owner's: "the current normal difficulty will actually
// be veteran"). Its monsters, the user's (16 October 2026): "monster health -70%", and "in the last 6
// minutes 30% more of the same monsters, but they each have 70% less health". From minute 9 of
// the night (a Dungeon Run floor's own clock maps onto it: waves.js minuteOf) the steady horde
// and the timed swarms, rings and packs are 30% bigger.
const VETERAN_HEALTH = 0.3;
const VETERAN_LATE = { from: 9, more: 1.3 };

// Veteran (the user's, of it as Normal: "all the monsters have their damage cause reduced by 50% and
// the number of ranged monsters spawn + wolver + any other monsters that lunges is reduced to 1/3"):
// Elite with every blow the hero takes halved, and a third as many monsters that shoot or lunge. It
// pays gold as the old Medium did. The id is the old Medium's, which the saves already know.
// Every monster has 70% less health, and late in the night 30% more come (above).
export const VETERAN = {
  ...ELITE,
  id: 'medium',
  name: 'Veteran',
  hp: ELITE.hp * VETERAN_HEALTH,
  hurt: 0.5,
  few: 1 / 3,
  health: ELITE.health * VETERAN_HEALTH,
  late: VETERAN_LATE,
  // Half Elite's numbers: a third of what both difficulties sent before (VETERAN_CROWD).
  spawn: ELITE.spawn * (VETERAN_CROWD / ELITE_CROWD),
  horde: ELITE.horde * (VETERAN_CROWD / ELITE_CROWD),
  // The owner's (21 October 2026): "reduce the speed on normal by 20%". On Veteran the hero and the
  // monsters move at 0.8 of the game's speed (GAME_SPEED, moveFor); the clock is real time anyway.
  pace: 0.8,
  // "on normal, reduce the speed of monsters by 10%" (21 October 2026): every monster, bosses too,
  // walks 10% slower on Veteran (Enemy.update); the hero as before.
  foePace: 0.9,
  desc: `Monsters have 70% less health and hit half as hard; fewer shoot or charge, more come late. Gold x${DIFF_GOLD.medium}.`,
};

// Normal, the easiest, the owner's (23 October 2026): "there's going to be an easier difficulty
// that's going to be normal. And it's going to have half as many monsters as we do right now. And
// additionally, it's going to be running 30% slower". Veteran with half its steady horde and timed
// swarms, rings and packs, and the hero and the monsters moving 30% slower (pace; the clock keeps
// real time). The id is the old Easy's, which the saves already know; it pays gold as that did.
export const NORMAL = {
  ...VETERAN,
  id: 'easy',
  name: 'Normal',
  spawn: VETERAN.spawn * 0.5,
  horde: VETERAN.horde * 0.5,
  pace: VETERAN.pace * 0.7,
  desc: `Veteran with half the monsters, everyone moving 30% slower. Gold x${DIFF_GOLD.easy}.`,
};

// By id, as a run report and the profile's wins keep it.
export const DIFFS = { easy: NORMAL, medium: VETERAN, hard: ELITE };

// Ranked keeps one best time per hero, so it is always Elite; a run without a choice (bots,
// tests, older saves) plays it too: the game as it was tuned.
export const diffFor = (mode, id) => (mode === 'ranked' ? ELITE : DIFFS[id] || ELITE);

// Nightmare, the user's (16 October 2026): a box to tick on the trial screen that multiplies the
// number of monsters, Elite's only (nightmareFor): three times as many of the night's monsters
// (the owner's, 21 October 2026; twice before) come, in
// the steady horde and the timed swarms, rings and packs alike (spawner.js hordeMore), each as
// strong as ever. Not on Ranked, which keeps one best time per hero. The gold it brings home is
// the profile's to weigh (shared/profile.js NIGHTMARE_GOLD).
export const NIGHTMARE = {
  name: 'Nightmare',
  more: 3,
  desc: `Nightmare: three times as many monsters. Gold x${NIGHTMARE_GOLD} on top of Elite's.`,
};

// Whether a run is a Nightmare: only as chosen, only on Elite (the owner's, 21 October 2026: a
// modifier of what is now Elite, not a difficulty of its own), and never on Ranked.
export const nightmareFor = (mode, on, diff) => mode !== 'ranked' && diff === ELITE.id && on === true;

// The hero and the monsters move this much faster than they were drawn to: 1.1, then 20% up (16
// October 2026), then the owner's "let the game be 15% faster" (20 October). Only how fast they
// walk (Player.moveSpeed, Enemy.update): the night's clock and all else keep real time, the
// owner's (21 October 2026): "the clock was never to have been sped up ... 15 minutes should be 15
// minutes". The bots move at it too, so they play the game as people do.
export const GAME_SPEED = 1.1 * 1.2 * 1.15;

// How fast the hero and the monsters move in a run of this mode and difficulty: GAME_SPEED, times
// the difficulty's own pace (Veteran's 0.8, Normal's 0.56; Elite and Ranked as they are).
export const moveFor = (mode, id) => GAME_SPEED * (diffFor(mode, id).pace ?? 1);

export const MODES = {
  s15: { id: 's15', name: 'Survival', sub: '15 minutes', minutes: 15, desc: 'Hold out until dawn in the Darkwood.' },
  dungeon: { id: 'dungeon', name: 'Dungeon Run', sub: '3 floors', desc: 'Slay each floor\'s guardian and descend. Defeat the Demon Lord.' },
  ranked: { id: 'ranked', name: 'Ranked', sub: 'Endless', desc: 'No dawn. The night grows deadlier forever. How long can you last?' },
};
