// Spawn schedule, expressed in "phase minutes" (0-30). A 30-minute survival
// run advances one phase per minute; shorter runs and dungeon floors map
// their own clocks onto this scale.

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
export function hpScale(phase) {
  return 1 + phase * 0.08 + Math.max(0, phase - 9) * 0.2 + Math.max(0, phase - 16) * 0.3;
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
  s30: [
    { at: 8 * 60, id: 'boneking' },
    { at: 16 * 60, id: 'butcher' },
    { at: 23 * 60, id: 'lich' },
    { at: 27.5 * 60, id: 'demonlord' },
  ],
};

// Dungeon floors: theme, starting phase and the guardian waiting at the end.
export const FLOORS = [
  { n: 1, name: 'The Crypt', theme: 'crypt', phase0: 0, rate: 1.15, cap: 13, guardian: 'boneking' },
  { n: 2, name: 'The Catacombs', theme: 'catacombs', phase0: 9, rate: 1.05, cap: 22, guardian: 'butcher' },
  { n: 3, name: 'The Infernal Depths', theme: 'inferno', phase0: 17, rate: 1, cap: 30, guardian: 'demonlord' },
];
