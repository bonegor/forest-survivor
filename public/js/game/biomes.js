// The looks of the Survival maps (28 October 2026): the ground each night is spent on, what stands
// on it, its light, fog, air and weather, and its crypts. The owner's: "Okay, so now we basically
// need a few more maps ... the desert map ... a frozen, you know, snowy map ... sort of like a
// bright flower, colorful map ... a dark, hellish, essentially dark, hellish, demonic map", each a
// map of data/maps.js (its `look` names one of these), the Darkwood's look the forest's own.
//
// Every look is the Darkwood's map (darkwood.js: its roads, crossroads, shrines, crypts, groves and
// landmarks, laid out from the map's world seed) dressed otherwise: its ground in its own colours,
// its trees and props standing in the Darkwood's (the names darkwood.js lays out are the slots, and
// biomeProp says what stands in each), lit by a night of its own. The Darkwood's entry is the
// forest as it always was, built from the very tables it is painted and lit by (the rule: not a
// pixel of it changes), and where one of its fields is null the forest keeps what it always had,
// in code no other look runs. Pure data and one pure function: no canvas, no sprites, so the Node
// tools (tools/mapgen/endless.mjs) draw the looks as the game does. The four new looks each live in
// a file of their own (biomes/<look>.js), so each can be refined without touching another.
//
// A look:
//   ground    darkwood.js GROUND in the look's colours: paintChunk's zones, road, verge, strewn
//             tufts, leaves, flowers and pebbles, and the look's patterns (ripple, glint, cracks)
//   day       the ground by day (the Sunscorch's alone, for the prologue's road: prologue.js)
//   density   darkwood.js layoutChunk's knob: { standing, bushes, rocks, stumps, graves }, the
//             share standing and the scatter's odds (the Darkwood's, null: as they are)
//   props     what stands in each slot (biomeProp); null, the slot's own
//   trunks    half the width of a new tree's trunk at its foot (forest.js TRUNK has the
//             Darkwood's); a tree stands in a tree's slot, so it stops the hero, fades over him and
//             counts for the Druid's Grove Warden (forest.js), whatever it is
//   lit       a light a name casts where its entry gives none: { name: [key, radius] }
//   night     the ambient light over the night, survival progress 0 to 1 (forest.js ambient); the
//             same breakpoints for every look, 0.5 among them (the sprite tuner reads that one)
//   dawn      the light the sunrise brings it to (Game's dawn)
//   fog       two drifting layers over the night (Forest.drawOverlay): rgb, alpha and drift (px/s)
//             of each, its rise; haze, how much thicker the weather's haze makes it; wind, how much
//             faster the weather's wind drives it (px/s at full)
//   vignette  [colour, strength] by night (Game.draw)
//   dust      particle colours (particles.js PC): the hero's steps (step), the dirt a monster rises
//             out of (rise), a charger's dust (charge: null keeps the forest's, PC.N, unpicked)
//   fx        what drifts in the air (Forest.update): the Darkwood's fireflies and falling leaves
//             (null), or emitters { every: s or [a, b]; at: 'view' (anywhere over the view, as the
//             fireflies) or 'sky' (from above it, as the leaves fall); z, vx, vy, vz, life: [a, b]
//             or a number; size; colors; flags (particles.js P); drag; wind, px/s more along +x at
//             the weather's full wind; rain, hidden where rain is seen, as the fireflies are }
//   weather   the climate (weather.js): null, the Darkwood's rain and clear (weather.js SKIES and
//             SPELLS); else { skies, spells, and how its weather looks and falls }
//   crypt     { door: its crypts' sprite (26 x 29, open and sealed: forest.js, Game.drawCrypt),
//             inside: the Dungeon look within (dungeon.js THEMES; null: the Darkwood's, cryptLook),
//             kinds: what its crypts are called (null: game.js CRYPT_KIND), light and glow: the
//             light an open door casts and its glow's colour (Game.draw; the Darkwood's violet without) }
//   flicker   the light keys that flicker as a fire does (lighting.js LIGHT_COLORS)
//   lightK    how bright a light key burns (1 unless given)
//   topology  a ground of its own instead of the Darkwood's lattice (game/topology, 28 October 2026;
//             absent: the lattice): { kind: 'corridor' (the Sunscorch along x, the Frostfell along y:
//             its band, faces, road, crypts, shrines, landmarks, patches and spires) or 'islands' (the
//             Abyss: its spacing, radii, joinings and variants) }, made by topology/index.js makeTopology
//   terrain   how that ground is painted (topology/paint.js): its rock, cliff face, quicksand, water,
//             ice, lava, void and bridge decks' colours, and the tells' colours round its patches
//   hazards   what its sky does to the fight (game/hazards): the Frostfell's gusts, the Sunscorch's
//             duststorm haze; absent: none
//   fae       the Bloomvale's fae court (game/fae-rings.js FAE: its rings' places, clocks and dance;
//             game/fae.js brings them to life), absent elsewhere
//   clearAt   (x, y) => whether nothing may stand there (biomeProp): the Bloomvale's rings' clearings

import { GROUND } from './darkwood.js';
import { hash2 } from '../engine/util.js';
import { PC } from './biomes/kit.js';
import { DESERT } from './biomes/desert.js';
import { FROZEN } from './biomes/frozen.js';
import { MEADOW } from './biomes/meadow.js';
import { HELL } from './biomes/hell.js';

// The Darkwood's ambient light over the course of the night (survival progress 0..1). Read here by
// forest.js (which still exports it, for the sprite tuner) and the tools.
export const NIGHT = [
  [0, [150, 136, 186]],
  [0.1, [118, 120, 172]],
  [0.5, [102, 110, 164]],
  [0.86, [110, 114, 166]],
  [0.95, [176, 146, 166]],
  [1, [240, 214, 190]],
];

// The Darkwood as it always was.
export const FOREST = {
  id: 'forest',
  ground: GROUND,
  density: null,
  props: null,
  trunks: null,
  lit: null,
  night: NIGHT,
  dawn: [255, 244, 228],
  fog: { rgb: [200, 210, 240], alpha: [0.09, 0.06], drift: [3.5, 6], rise: [0.8, 1.5] },
  vignette: ['8,6,16', 0.7],
  dust: { step: PC.b, rise: [PC.b, PC.m, PC.a], charge: null },
  fx: null,
  weather: null,
  crypt: { door: 'crypt', inside: null, kinds: null },
  flicker: ['fire'],
  lightK: { cyan: 0.55 },
};

export const BIOMES = { forest: FOREST, desert: DESERT, frozen: FROZEN, meadow: MEADOW, hell: HELL };

// What stands in a prop's place on a look (Forest.generate, and endless.mjs's views): q is the prop
// as darkwood.js laid it out (its name the slot, its src what it dresses), lay its chunk's layout.
// Looked up in look.props by what it dresses and its name ('start:stump'), then by what it dresses
// ('gallows:*'), then by its name ('oak1'); not there, it stands as laid out. An entry is a name; a
// list of names, one picked by the prop's place (hash2), so every chunk and every run agrees; null,
// nothing stands there; or { n: a name or a list, road: the name it takes within `near` px of a
// path (default 50), light, anim }, light and anim when given in place of the slot's (null: none).
// Without either, a name's own light (look.lit), else the slot's. Returns a new prop, or null.
export function biomeProp(look, q, lay = null) {
  const map = look.props;
  if (!map) return q;
  // Nothing stands in a fae ring's clearing (the Bloomvale's: game/fae-rings.js, 28 October 2026).
  if (look.clearAt && look.clearAt(q.x, q.y)) return null;
  let e = q.src ? map[q.src + ':' + q.n] : undefined;
  if (e === undefined && q.src) e = map[q.src + ':*'];
  if (e === undefined) e = map[q.n];
  if (e === undefined) return q;
  if (e === null) return null;
  if (typeof e === 'string' || Array.isArray(e)) e = { n: e };
  let n = e.road && lay && lay.pathDist(q.x, q.y) < (e.near ?? 50) ? e.road : e.n;
  if (Array.isArray(n)) n = n[Math.floor(hash2(q.x, q.y, 61) * n.length)];
  const light = 'light' in e ? e.light : look.lit?.[n] ?? q.light;
  return { n, x: q.x, y: q.y, light: light || null, anim: 'anim' in e ? e.anim : q.anim || 0, src: q.src };
}
