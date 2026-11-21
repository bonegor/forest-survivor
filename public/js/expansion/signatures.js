// The roster, weapon definitions and evolution progression share this append-only order.
import footman from './weapons/footman.js';
import marksman from './weapons/marksman.js';
import templar from './weapons/templar.js';
import trailblazer from './weapons/trailblazer.js';
import thornkeeper from './weapons/thornkeeper.js';
import wraith from './weapons/wraith.js';
import gravebinder from './weapons/gravebinder.js';
import arcanist from './weapons/arcanist.js';
import praetorian from './weapons/praetorian.js';
import seraph from './weapons/seraph.js';
import boltguard from './weapons/boltguard.js';
import swordbearer from './weapons/swordbearer.js';

// Their damage was raised 1.8-6.7x on 22 November 2026: at shared-weapon strength (0.3-1.3x the
// median of all weapons at level 8, tools/dps.mjs), they sat below the owner's band for a signature
// (1.5-2.5x, evolution 2-3x); each now deals about 2x at level 8 and 2.0-2.6x evolved.
export const SIGNATURES = { footman, marksman, templar, trailblazer, thornkeeper, wraith, gravebinder, arcanist,
  praetorian, seraph, boltguard, swordbearer };

export const EXPANSION_WEAPONS = Object.fromEntries(Object.values(SIGNATURES).flatMap(spec => [
  [spec.id, spec.weapon], [spec.weapon.evo.into, spec.evolution],
]));

export const EXPANSION_EVOLUTIONS = Object.values(SIGNATURES).map(spec => spec.weapon.evo.into);
