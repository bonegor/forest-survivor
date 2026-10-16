// The difficulty clock runs in "phase minutes" (0-30): the 15-minute night
// advances 1.4 phases per minute; Ranked keeps going past 30 with the late
// mix; dungeon floors map their own clocks onto this scale.

// What may spawn when. Each pocket is a stretch of the night in minutes of the
// 15-minute Survival clock, with the monsters that can turn up in it and how
// often, as relative weights. Ranked runs on the same clock and carries on into
// the pockets past minute 15; a dungeon floor's clock maps onto it through
// minuteOf. Timed swarms, rings and packs come on top (EVENTS below).
export const POCKETS = [
  { minutes: [0, 1], spawn: { rat: 6, bat: 4 } },
  { minutes: [1, 2], spawn: { rat: 5, bat: 5, slime: 3 } },
  { minutes: [2, 3], spawn: { rat: 4, bat: 3, slime: 3, skeleton: 5 } },
  { minutes: [3, 4], spawn: { bat: 1, slime: 3, skeleton: 6, zombie: 4 } },
  { minutes: [4, 5], spawn: { bat: 1, slime: 2, skeleton: 6, zombie: 4, wolf: 3 } },
  { minutes: [5, 6], spawn: { bat: 1, skeleton: 6, zombie: 4, wolf: 3, goblin: 5 } },
  { minutes: [6, 7], spawn: { bat: 1, skeleton: 6, zombie: 4, wolf: 3, goblin: 5, spider: 3 } },
  { minutes: [7, 8], spawn: { bat: 1, skeleton: 6, zombie: 4, wolf: 3, goblin: 5, spider: 3, ghost: 3 } },
  { minutes: [8, 9], spawn: { bat: 1, skeleton: 4, zombie: 4, wolf: 3, goblin: 5, spider: 3, ghost: 3, cultist: 1, orc: 2 } },
  { minutes: [9, 10], spawn: { bat: 1, skeleton: 1.5, zombie: 4, wolf: 3, goblin: 5, spider: 3, ghost: 3, cultist: 1, orc: 3, deathknight: 1 } },
  { minutes: [10, 11], spawn: { bat: 1, skeleton: 1.5, wolf: 3, goblin: 5, spider: 3, ghost: 3, cultist: 1, orc: 3, imp: 4, deathknight: 2 } },
  { minutes: [11, 12], spawn: { bat: 1, skeleton: 1.5, goblin: 5, spider: 3, ghost: 3, cultist: 1, orc: 3, imp: 4, hellhound: 3, deathknight: 2, ogre: 1 } },
  { minutes: [12, 13.5], spawn: { bat: 1, skeleton: 1.5, spider: 3, ghost: 3, cultist: 1, orc: 3, imp: 4, hellhound: 3, deathknight: 3, ogre: 1.5 } },
  { minutes: [13.5, 15], spawn: { bat: 1, skeleton: 1.5, spider: 3, ghost: 3, cultist: 1, orc: 3, imp: 4, hellhound: 3, deathknight: 3, ogre: 2 } },
  // Only Ranked gets past dawn.
  { minutes: [15, 19], spawn: { bat: 1, skeleton: 1.5, ghost: 3, cultist: 1, orc: 2, imp: 4, hellhound: 3, deathknight: 2, ogre: 1.1 } },
  { minutes: [19, Infinity], spawn: { bat: 1, skeleton: 1.5, cultist: 1, orc: 2, imp: 4, hellhound: 3, deathknight: 2, ogre: 1.1 } },
];

// The minute of the night a phase stands for: 1.4 phases a minute up to
// minute 15 (phase 21), then Ranked's 0.9 a minute.
export const minuteOf = (phase) => (phase <= 21 ? phase / 1.4 : 15 + (phase - 21) / 0.9);
export const pocketAt = (minute) => POCKETS.find((p) => minute >= p.minutes[0] && minute < p.minutes[1]) || POCKETS[POCKETS.length - 1];

// Desired number of live enemies.
export function targetCount(phase) {
  return Math.min(480, 22 + phase * 13 + Math.max(0, phase - 8) * 10);
}

// Extra health multiplier as the night goes on.
// Past phase 30 (only Ranked gets there) it also compounds, so every night ends.
export function hpScale(phase) {
  return (1 + phase * 0.08 + Math.max(0, phase - 9) * 0.2 + Math.max(0, phase - 16) * 0.3) * Math.pow(1.06, Math.max(0, phase - 30));
}

// Survival's night hardens much faster from minute 6.5 (phase 9) on: a hero
// without the Armory hits a wall of health it can't cut through, one with all
// of it gets to dawn. Tuned with the gem-collecting bot (tools/bots.mjs
// --bot=gems --armory=none|max). Ranked and the dungeon keep hpScale.
export function nightHpScale(phase) {
  return 1 + phase * 0.08 + Math.max(0, phase - 9) * 0.8 + Math.max(0, phase - 16) * 1;
}

// Monster health multiplier for a mode at a phase.
export const monsterHp = (phase, mode) => (mode === 's15' ? nightHpScale(phase) : hpScale(phase));

// Timed events (phase minutes).
export const EVENTS = [
  { at: 2.5, type: 'swarm', enemy: 'bat', count: 16 },
  { at: 4.5, type: 'ring', enemy: 'skeleton', count: 26 },
  { at: 7, type: 'swarm', enemy: 'bat', count: 30 },
  { at: 9.5, type: 'pack', enemy: 'wolf', count: 8 },
  { at: 11, type: 'ring', enemy: 'zombie', count: 34 },
  { at: 13.5, type: 'swarm', enemy: 'imp', count: 26 },
  { at: 15.5, type: 'pack', enemy: 'goblin', count: 18 },
  { at: 18, type: 'ring', enemy: 'ghost', count: 40 },
  { at: 20.5, type: 'swarm', enemy: 'imp', count: 36 },
  { at: 22.5, type: 'pack', enemy: 'hellhound', count: 10 },
  { at: 24.5, type: 'ring', enemy: 'deathknight', count: 22 },
  { at: 27, type: 'swarm', enemy: 'imp', count: 44 },
  { at: 28.5, type: 'ring', enemy: 'skeleton', count: 60 },
];

// Survival bosses by real elapsed seconds.
export const SURVIVAL_BOSSES = {
  s15: [
    { at: 4.5 * 60, id: 'boneking' },
    { at: 9 * 60, id: 'butcher' },
    { at: 13 * 60, id: 'lich' },
  ],
};

// Ranked: the four lords return in rotation, one every 4.5 minutes, forever.
export const RANKED_BOSSES = ['boneking', 'butcher', 'lich', 'demonlord'];
export const RANKED_BOSS_EVERY = 270;
// Once the scripted events run out, Ranked keeps drawing from the late ones.
export const RANKED_EVENT_EVERY = 2.5; // phase minutes

// Breakable sites: barrels and crates, urns, or a lantern among barrels and crates. The user's
// "triple the current spawn" and "the box sites have 2-5 boxes" (16 October 2026). In the forest
// a site turns up every `every` seconds (it was 16-26) while fewer than `most` props stand (it was
// 10, at fewer than 2½ to a site); a dungeon room has `room` sites along its walls (it was 1-4
// single props). Each site holds `boxes` of them. What each one holds: game.js PROP_LOOT.
export const PROP_SITES = { every: [16 / 3, 26 / 3], most: 45, room: [3, 12], boxes: [2, 5] };

// Dungeon floors: theme, starting phase and the guardian waiting at the end.
export const FLOORS = [
  { n: 1, name: 'The Crypt', theme: 'crypt', phase0: 0, rate: 1.15, cap: 13, guardian: 'boneking' },
  { n: 2, name: 'The Catacombs', theme: 'catacombs', phase0: 9, rate: 1.05, cap: 22, guardian: 'butcher' },
  { n: 3, name: 'The Infernal Depths', theme: 'inferno', phase0: 17, rate: 1, cap: 30, guardian: 'demonlord' },
];
