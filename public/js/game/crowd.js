// The horde keeps a little room: foes that overlap ease apart, a share of the overlap each moment
// (CROWD.rate a second), so a crowd spreads round the hero instead of piling into one heap, yet a
// press of them still squeezes together. The owner's (22 October 2026): "monsters repel one
// another". Only foes push foes: they still pass through props and trees (the rule of 16 October),
// and dungeon walls still hold the walkers. The lighter foe gives the more (def.mass; a champion
// weighs three times its kind); a boss, a lord or a prop doesn't budge, and a Wraith (ai 'phaser')
// drifts through everything.

import { SpatialGrid } from './grid.js';

export const CROWD = {
  rate: 6, // per second: the share of an overlap undone in 1/rate s (soft, not a wall)
  room: 1.15, // how far apart two foes want to stand, in their radii summed
};
// Foes up to SMALL across their radius share a fine grid: two of them that touch are always in
// the same cell or neighbouring ones. Bigger ones (an ogre, a champion brute) are few, and each
// looks round itself for whatever it touches.
const SMALL = 8;
const grid = new SpatialGrid(2 * SMALL * CROWD.room, 96, 96);
// From each cell, the neighbours still to be paired with it: every pair of cells is met once.
const AHEAD = [
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];
const small = [], big = [], near = [];
let firm = 0;

// How far a foe gives way: the inverse of its weight, 0 for one that never moves.
const give = (e) => (e.boss || e.lord || e.prop || e.sleeping || e.dormant ? 0 : 1 / ((e.def.mass || 1) * (e.elite ? 3 : 1)));

function bump(a, b) {
  const ga = give(a), gb = give(b);
  if (ga + gb === 0) return;
  let dx = b.x - a.x, dy = b.y - a.y;
  const rr = (a.r + b.r) * CROWD.room, d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr) return;
  let d = Math.sqrt(d2);
  // Two on the very same spot part along a line of their own (the same every time).
  if (d < 1e-3) {
    const t = ((a.id * 7919 + b.id * 104729) % 628) / 100;
    dx = Math.cos(t);
    dy = Math.sin(t);
    d = 1;
  }
  const push = ((rr - Math.min(d, rr)) * firm) / (ga + gb) / d;
  a.x -= dx * push * ga;
  a.y -= dy * push * ga;
  b.x += dx * push * gb;
  b.y += dy * push * gb;
}

// Eases apart every pair of overlapping foes in `list` (the game's enemies), round (cx, cy), over dt.
export function jostle(list, cx, cy, dt) {
  firm = 1 - Math.exp(-CROWD.rate * dt);
  if (firm <= 0) return;
  small.length = big.length = 0;
  for (const e of list) {
    if (e.dead || e.prop || e.def.ai === 'phaser') continue;
    (e.r > SMALL ? big : small).push(e);
  }
  grid.rebuild(small, cx, cy);
  const { head, next, items, cols, rows } = grid;
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      for (let i = head[gy * cols + gx]; i !== -1; i = next[i]) {
        const a = items[i];
        for (let j = next[i]; j !== -1; j = next[j]) bump(a, items[j]);
        for (const [ox, oy] of AHEAD) {
          const x = gx + ox, y = gy + oy;
          if (x < 0 || x >= cols || y >= rows) continue;
          for (let j = head[y * cols + x]; j !== -1; j = next[j]) bump(a, items[j]);
        }
      }
    }
  }
  for (let i = 0; i < big.length; i++) {
    const a = big[i];
    for (let j = i + 1; j < big.length; j++) bump(a, big[j]);
    for (const b of grid.query(a.x, a.y, (a.r + SMALL) * CROWD.room, near)) bump(a, b);
  }
}
