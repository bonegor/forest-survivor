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
//   palette: { p: '#7a4a80' } // colours drawn instead: palette keys, or the art's own '#rrggbb'
//   rim: '#8b9bb4'          // a 1px ring outside the outline (palette and rim: tuned.js)
// }

import { HERO_ART } from './heroes.js';
import { MONSTER_ART } from './monsters.js';
import { BOSS_ART } from './bosses.js';
import { PICKUP_ART, PROJECTILE_ART, ICON_ART } from './items.js';
import { PROC_ART } from './procgen.js';
import { PROP_ART } from './props.js';
import { LANDMARK_ART } from './landmarks.js';
import { TUNED } from './tuned.js';

// The art as drawn, and as the game draws it: with the colour tunes baked from the sprite tuner.
export const DRAWN = { ...HERO_ART, ...MONSTER_ART, ...BOSS_ART, ...PICKUP_ART, ...PROJECTILE_ART, ...ICON_ART, ...PROC_ART, ...PROP_ART, ...LANDMARK_ART };
export const ART = withTunes(DRAWN, TUNED);

// Art with colour tunes (tuned.js, by tools/bake-tune.mjs) laid over it: a sprite's palette
// override and its rim. A new table; the art files themselves stay as drawn.
export function withTunes(art, tuned) {
  const out = { ...art };
  for (const [name, t] of Object.entries(tuned)) {
    if (!out[name]) continue;
    out[name] = { ...out[name], ...(t.palette ? { palette: t.palette } : {}), ...(t.rim ? { rim: t.rim } : {}) };
  }
  return out;
}

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
