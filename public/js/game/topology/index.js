// game/topology: what a Survival map's ground is made of, beyond the Darkwood's lattice (28 October 2026).
// The owner's words that day: "The desert map should be long left to right map that has a mountain range
// at top and bottom", "The frost map goes up and down", "for hell, it has to be an area made of patches of
// land connected by bridges and occasionally just land". A look names its topology as data
// (look.topology: null or absent is the Darkwood's lattice) and this module turns it into a class:
//   a Corridor (topology/corridor.js): the Sunscorch along x, the Frostfell along y;
//   an Islands (topology/islands.js): the Abyss, over lava or the void, one or the other per run;
//   null: the Darkwood, the Bloomvale for now, Ranked, the prologue's road (forest.js { topology: false }).
// Pure: no canvas, no SPR, so tools/mapgen/endless.mjs and the tests import it as the game does. The
// surfaces and the lattice's constants live in topology/terrain.js (so the classes can read them without
// an import cycle) and are the contracts every part of the game reads the ground by: here they are.
import { Corridor } from './corridor.js';
import { Islands } from './islands.js';

export { SURFACE, SURFACE_NAME, HERO_BLOCKED, FOE_SLOWED, TSTEP, TN, TMAX } from './terrain.js';

const KINDS = { corridor: Corridor, islands: Islands }; // the Bloomvale's kind is added here (world spec 6c)
// look.topology null or absent: the Darkwood's lattice (null). runSeed: the run's g.seed (the Abyss's variant).
export function makeTopology(look, mapSeed, runSeed) {
  const T = look && look.topology;
  return T ? new KINDS[T.kind](T, mapSeed, runSeed) : null;
}
