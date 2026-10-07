// All sprite definitions in one table (pure data, usable from Node too).
//
// def = {
//   frames: [rows | { from: i, rows: { rowIndex: 'replacement' } }],
//   emissive: 'xY'          // palette keys rendered unlit (glowing eyes, gems...)
//   outline: false          // skip the automatic 1px ink outline
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
