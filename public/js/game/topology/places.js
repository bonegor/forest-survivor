// The places and landmarks of game/topology's maps (28 October 2026), in darkwood.js's shapes (its
// scene: places with a plaza, props and a clearing; landmarks down a footpath), so layoutChunk lays them
// out and the looks dress them (biomes.js biomeProp, by what each prop dresses: its src) as they do the
// Darkwood's: the start camp, wayside shrines, crypt doors with a walk up to their steps, and the
// landmarks. The Darkwood's kinds (circle, ruins, woodcamp, graveyard, gallows, glade) are dressed by
// darkwood.dressLandmark; the topology's own are dressed here: an oasis and a giant's bones in the
// Sunscorch, the rocks of an ice pond in the Frostfell, a bridgehead's posts in the Abyss, the spires
// on a range's ridges. Pure.

import { TAU } from '../../engine/util.js';
import { pathOf, footpath, dressLandmark, SHRINE_TYPES } from '../darkwood.js';

// The shrine types in a map's own order (darkwood.js setWorld's shuffle, on the topology's dice):
// whatever the neighbours' indices differ by one or (i + 3j) differs mod 5, their types differ.
export function shrineOrder(rngOf) {
  const r = rngOf(0, 0, 15), o = [...SHRINE_TYPES];
  for (let k = o.length - 1; k > 0; k--) {
    const m = Math.floor(r() * (k + 1));
    [o[k], o[m]] = [o[m], o[k]];
  }
  return o;
}

// A prop adder for a place or landmark P (darkwood.js's own: rounded, its extras kept).
export const adder = (P) => (n, x, y, extra) => {
  const p = { n, x: Math.round(x), y: Math.round(y), ...extra };
  P.props.push(p);
  return p;
};

// A walk: a plaza of half width `w0` at (x0, y0), then a gravel walk of half width 9 from (ax, ay) to
// (bx, by) wandering a little (darkwood.js footpath, wander px), as the Darkwood's crypts have up to
// their steps.
export function walkPath(x0, y0, w0, ax, ay, bx, by, seed, wander) {
  const f = footpath(ax, ay, bx, by, seed, wander);
  const xs = [x0, ...f.xs], ys = [y0, ...f.ys], hw = [w0, ...f.xs.map(() => 9)];
  return pathOf('plaza', xs, ys, hw);
}

// A wayside shrine: a plaza where the road runs through, a lantern either side (darkwood.js place).
export function shrinePlace(key, i, j, x, y, type) {
  const P = { x, y, i, j, key, kind: 'shrine', type, props: [], clear: { x, y, r: 130 } };
  P.path = pathOf('plaza', [x], [y], [32]);
  const add = adder(P);
  add('lantern', x - 19, y + 3, { light: ['warm', 60] });
  add('lantern', x + 19, y + 3, { light: ['warm', 60] });
  return P;
}

// The start camp round (x, y): a campfire with two stones to sit on, a lantern and a waystone (each
// given where it stands), the hero by the fire's side of the plaza.
export function startCamp(x, y, at) {
  const P = { x, y, i: 0, j: 0, key: '0,0', kind: 'start', props: [], clear: { x, y, r: 190 } };
  P.path = pathOf('plaza', [x], [y], [40]);
  const add = adder(P);
  add('campfire', at.fire[0], at.fire[1], { anim: 8, light: ['fire', 110] });
  add('stump', at.fire[0] - 24, at.fire[1] - 4);
  add('stump', at.fire[0] + 23, at.fire[1] + 6);
  if (at.lamp) add('lantern', at.lamp[0], at.lamp[1], { light: ['warm', 60] });
  if (at.stone) add('menhir', at.stone[0], at.stone[1], { light: ['cyan', 40] });
  P.hero = { x: Math.round(x + 4), y: Math.round(y + 18) };
  return P;
}

// What stands at a landmark: the Darkwood's kinds by darkwood.js, the topology's own here. r: its
// dice; bx: where its footpath comes in; o: what it needs besides (an oasis's pool).
export function dress(L, r, bx, o = {}) {
  const add = adder(L), { x, y } = L;
  if (L.kind === 'oasis') {
    // Water ringed with palms (a tree's slot: the Sunscorch's 'oasis:oak1' is a date palm), reeds at
    // its rim, agave and scrub about it.
    const pool = o.pool, R = pool.ext;
    for (let k = r.int(3, 5), a0 = r.range(0, TAU); k > 0; k--) {
      const a = a0 + (k / 5) * TAU + r.range(-0.3, 0.3), d = R + r.range(14, 30);
      add('oak1', x + Math.cos(a) * d, y + Math.sin(a) * d);
    }
    for (let k = r.int(2, 4); k > 0; k--) {
      const a = r.range(0, TAU), d = R + r.range(3, 7);
      add('sand_reeds', x + Math.cos(a) * d, y + Math.sin(a) * d);
    }
    for (let k = r.int(2, 4); k > 0; k--) {
      const a = r.range(0, TAU), d = R + r.range(36, 64);
      add(r() < 0.5 ? 'redcaps' : 'bush1', x + Math.cos(a) * d, y + Math.sin(a) * d);
    }
  } else if (L.kind === 'bones') {
    // A giant beast's bleached ribcage arching out of the sand, its horned skull half buried beside it.
    add('sand_ribcage', x, y);
    const s = r() < 0.5 ? -1 : 1;
    add('sand_skull', x + s * 34, y + r.range(8, 16));
    for (let k = r.int(2, 3); k > 0; k--) add('sand_bones', x + r.range(-56, 56), y + r.range(14, 34) * (r() < 0.5 ? -1 : 1));
  } else dressLandmark(L, r, bx);
  return L;
}

// An ice pond's rocks (the Frostfell): `rocks.n` of `rocks.names` round its middle, some on the ice and
// some at its rim, a landmark of their own so they stand as laid (and stop the hero: art/terrain.js
// TERRAIN_SOLIDS) and the woods keep back from the pond.
export function pondLandmark(p, i, j, rocks, r) {
  const L = { x: p.x, y: p.y, i, j, kind: 'pond', props: [], clear: { x: p.x, y: p.y, r: p.r + 24 } };
  const add = adder(L);
  for (let k = r.int(rocks.n[0], rocks.n[1]); k > 0; k--) {
    const a = r.range(0, TAU), d = p.r * r.range(0.35, 1.1);
    add(r.pick(rocks.names), p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.8);
  }
  return L;
}

// A bridge's head on the land (the Abyss): its two posts either side of the deck, in its material
// (art/terrain.js hell_post_*: a plank bridge's are the charred wood ones, hell_post_wood, as drawn on
// 28 October 2026; the material's own name was no sprite, so half the bridges stood without posts), and at
// one bridge in three a brazier burning beside one of them: the bridges' only lights.
export function bridgehead(i, j, x, y, nx, ny, hw, material, brazier) {
  const L = { x, y, i, j, kind: 'bridgehead', props: [], clear: { x, y, r: 40 } };
  const add = adder(L), n = 'hell_post_' + (material === 'planks' ? 'wood' : material), o = hw + 3;
  add(n, x + nx * o, y + ny * o);
  add(n, x - nx * o, y - ny * o);
  if (brazier) add('brazier', x + nx * (o + 10), y + ny * (o + 10) + 2, { light: ['fire', 60], anim: 9 });
  return L;
}
