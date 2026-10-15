// The horde jostles: foes bump into one another and into the props (barrels, crates, urns,
// lanterns) instead of passing through, so a crowd spreads out round the hero rather than
// piling into one heap. Each frame every overlapping pair is pushed apart (CROWD.firm of the
// overlap), the lighter foe the more (def.mass; a champion weighs three times its kind). A boss
// or a prop doesn't budge, and a Wraith (ai 'phaser') drifts through everything.

import { SpatialGrid } from './grid.js';

export const CROWD = {
  firm: 1, // the share of an overlap undone each frame
};
// Foes up to SMALL across their radius share a fine grid: two of them that touch are always in
// the same cell or neighbouring ones. Bigger ones (an ogre, a lord, a champion brute) are few,
// and each looks round itself for whatever it touches.
const SMALL = 8;
const grid = new SpatialGrid(2 * SMALL, 96, 96);
// From each cell, the neighbours still to be paired with it: every pair of cells is met once.
const AHEAD = [
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];
const small = [], big = [], near = [];

// How far a foe gives way: the inverse of its weight, 0 for one that never moves.
const give = (e) => (e.boss || e.prop ? 0 : 1 / ((e.def.mass || 1) * (e.elite ? 3 : 1)));

function bump(a, b) {
  const ga = give(a), gb = give(b);
  if (ga + gb === 0) return;
  let dx = b.x - a.x, dy = b.y - a.y;
  const rr = a.r + b.r, d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr) return;
  let d = Math.sqrt(d2);
  // Two on the very same spot part along a line of their own (the same every time).
  if (d < 1e-3) {
    const t = ((a.id * 7919 + b.id * 104729) % 628) / 100;
    dx = Math.cos(t);
    dy = Math.sin(t);
    d = 1;
  }
  const push = ((rr - Math.min(d, rr)) * CROWD.firm) / (ga + gb) / d;
  a.x -= dx * push * ga;
  a.y -= dy * push * ga;
  b.x += dx * push * gb;
  b.y += dy * push * gb;
}

// Pushes apart every pair of overlapping foes in `list` (the game's enemies), round (cx, cy).
export function jostle(list, cx, cy) {
  small.length = big.length = 0;
  for (const e of list) {
    if (e.dead || e.def.ai === 'phaser') continue;
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
    for (const b of grid.query(a.x, a.y, a.r + SMALL, near)) bump(a, b);
  }
}
