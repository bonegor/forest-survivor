// Spawn schedule, expressed in "phase minutes" (0-30). The 15-minute night
// advances 1.4 phases per minute; Ranked keeps going past 30 with the late
// mix; dungeon floors map their own clocks onto this scale.

// [from, to, enemy, weight]
export const SPAWN_TABLE = [
  [0, 3.5, 'bat', 6],
  [0, 5, 'rat', 5],
  [1, 7, 'slime', 3],
  [2, 12, 'skeleton', 6],
  [3.5, 14, 'zombie', 4],
  [5, 15, 'wolf', 3],
  [6, 17, 'goblin', 5],
  [8, 21, 'spider', 3],
  [10, 25, 'ghost', 3],
  [11, 30, 'cultist', 2],
  [12, 30, 'orc', 2],
  [14, 30, 'imp', 4],
  [16, 30, 'hellhound', 3],
  [19, 30, 'deathknight', 2],
  [21, 30, 'ogre', 1.1],
  [3.5, 30, 'bat', 1],
  [13, 30, 'skeleton', 1.5],
];

// Desired number of live enemies.
export function targetCount(phase) {
  return Math.min(480, 22 + phase * 13 + Math.max(0, phase - 8) * 10);
}

// Extra health multiplier as the night goes on.
// Past phase 30 (only Ranked gets there) it also compounds, so every night ends.
export function hpScale(phase) {
  return (1 + phase * 0.08 + Math.max(0, phase - 9) * 0.2 + Math.max(0, phase - 16) * 0.3) * Math.pow(1.06, Math.max(0, phase - 30));
}

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

// Dungeon floors: theme, starting phase and the guardian waiting at the end.
export const FLOORS = [
  { n: 1, name: 'The Crypt', theme: 'crypt', phase0: 0, rate: 1.15, cap: 13, guardian: 'boneking' },
  { n: 2, name: 'The Catacombs', theme: 'catacombs', phase0: 9, rate: 1.05, cap: 22, guardian: 'butcher' },
  { n: 3, name: 'The Infernal Depths', theme: 'inferno', phase0: 17, rate: 1, cap: 30, guardian: 'demonlord' },
];
