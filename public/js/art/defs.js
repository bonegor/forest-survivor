// All sprite definitions in one table (pure data, usable from Node too).
//
// def = {
//   frames: [rows | { from: i, rows: { rowIndex: 'replacement' } }],
//   emissive: 'xY'          // palette keys rendered unlit (glowing eyes, gems...)
//   outline: false          // skip the automatic 1px ink outline
//   thin: 'T'               // palette keys left out of the outline (bowstrings, fine lines)
//   walk: [1, 2, 3, 4]      // frames cycled while moving; frame 0 stays the idle pose
//   idle: [0, 1, 2]         // frames cycled while standing still (flames, flicker)
//   motionRate: 1.5         // preserve cadence when adding walk in-between poses
//   idleRate: .625          // idle poses per unit of the Player animation clock
//   attack: [15, 16, 17]    // equipment poses along the existing .14s swing
//   selfBob: true           // poses already animate the body; no extra render bob
//   fps: 4                  // menu poses: loop every frame at this rate
//   hires: 3                // menu poses painted at n times the detail: drawn at 1/n the usual scale
//   small: 'name'           // a smaller cut of a hires pose, for when it does not fit
// }

import { HERO_ART } from './heroes.js';
import { MONSTER_ART } from './monsters.js';
import { BOSS_ART } from './bosses.js';
import { PICKUP_ART, PROJECTILE_ART, ICON_ART } from './items.js';
import { PROC_ART } from './procgen.js';
import { PROP_ART } from './props.js';

export const ART = { ...HERO_ART, ...MONSTER_ART, ...BOSS_ART, ...PICKUP_ART, ...PROJECTILE_ART, ...ICON_ART, ...PROC_ART, ...PROP_ART };

// Returns frames as row arrays, or as pixel buffers for procedural defs.
export function resolveFrames(def) {
  if (def.gen) return def.gen();
  const out = [];
  for (const f of def.frames) {
    if (Array.isArray(f)) out.push(f);
    else {
      const base = out[f.from ?? 0].slice();
      for (const [i, r] of Object.entries(f.rows)) base[Number(i)] = r;
      out.push(base);
    }
  }
  return def.flipY ? out.map((rows) => rows.slice().reverse()) : out;
}
