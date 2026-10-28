// The Bloomvale's look (data/maps.js 'meadow'): the third of the five Survival maps, the bright one
// before the dark ones. The owner's (28 October 2026): "another would be sort of like a bright
// flower, colorful map." So the brightest night of the five: a midsummer fae twilight that never
// gets truly dark, lavender-pink where the Darkwood's is blue (its light about 0.73 luminance at
// midnight, the Darkwood's 0.45), over lush light greens. Meadows in bloom where the Darkwood has
// its oak meadows, their flowers in carpets; blossom groves where it has its pinewoods, pink and
// white cups in their grass; lavender in flower where its woods are cursed; pale paths strewn with
// petals for its roads. Blossom trees stand where its oaks and three in four of its pines stand,
// giant mushrooms in the rest (an accent among the blossom), vine-wrapped trees where its dead ones
// do (the flora, art/flora-meadow.js); clumps of sunflowers, tulips and bluebells lie where most of
// its stones and stumps do, and its glowing mushrooms are kept. No gallows here.
//
// The fields are game/biomes.js's (its header says what each one is); this file is the Bloomvale's
// alone, so its look can be refined without touching another map's.

import { GROUND } from '../darkwood.js';
import { PC, P, tones, H } from './kit.js';
import { FAE, clearAt } from '../fae-rings.js';

// Light, saturated greens (their red and blue kept low, so the lavender light leaves them green
// instead of greying them), and over them the colours of flowers. The meadows' flowers come in
// carpets: many tries a chunk (`flowers`) where the patch noise is over `bloom`, so a patch is thick
// at its heart and thins out to bare grass at its edge, in pinks and whites (three in ten each),
// yellows (two), a violet and a blue. The groves' grass is in flower too (its tufts pink and white
// cups on a green stem), petals lie thick under the blossom trees and strewn over the open
// (`leaves`), and on the paths (its pebbles, two by two). The horde is drawn over all of it again by
// night, lifted and ringed (enemies.js NIGHT_EDGE), so it stands out of the brightest of it.
const ground = {
  ...GROUND,
  zones: [
    tones(['#4a8a3e', '#539a45', '#5ca84c', '#66b654', '#72c45e']), // the meadows, spring green
    tones(['#3f7e4a', '#478c52', '#509a5a', '#5aa864', '#64b66e']), // the blossom groves, cooler
    tones(['#6e74a6', '#7878b2', '#8280be', '#8d8aca', '#9894d4']), // lavender
  ],
  road: tones(['#94806e', '#a8937f', '#bba792', '#cdbaa4', '#ddccb6']), // a pale path
  verge: -0.15,
  tuft: {
    oak: tones(['#8ad870', '#a2e682', '#70c25c']),
    pine: tones(['#ff9cc8', '#ffd0e4', '#3c8a3a', '#f4f4e4']), // cups of pink and white on a green stem
    cursed: tones(['#c4acfa', '#dcc8ff', '#a890e8']), // lavender in flower
  },
  tufts: 420,
  sparse: 0.25,
  leaf: {
    oak: tones(['#ffb8d8', '#ffffff', '#ff8fbf', '#f4f4e4']), // fallen petals under the blossom
    pine: tones(['#ffb8d8', '#ffe2ee', '#d8b4ff', '#ffffff']),
    cursed: tones(['#d8b4ff', '#c49bff', '#ffb8d8']),
  },
  leaves: 900,
  flower: tones(['#ff9cc8', '#ff9cc8', '#ffb8d8', '#fee761', '#fee761', '#ffffff', '#ffffff', '#f4f4e4', '#c8a0ff', '#90c8ff']),
  stem: H('#468e3e'),
  flowers: 9000,
  bloom: 0.42,
  pebble: tones(['#f4a6c4', '#d97aa0', '#ffdcea']), // petals on the path
  pebbles: 110,
};

// The climate (weather.js): clear nights, petals drifting on a breeze, and now and then a soft
// shower, rain without thunder (heard and wetting the steps as rain does; no clap opens it).
const weather = {
  skies: {
    clear: { rain: 0, dark: 0, lightning: 0, flake: 0, haze: 0, wind: 0 },
    petals: { rain: 0, dark: 0, lightning: 0, flake: 0.8, haze: 0.2, wind: 0.35 },
    shower: { rain: 0.55, dark: 0.08, lightning: 0, flake: 0, haze: 0.3, wind: 0 },
  },
  spells: {
    clear: { secs: [120, 240], next: { petals: 2, shower: 1 } },
    petals: { secs: [90, 160], next: { clear: 2, shower: 1 } },
    shower: { secs: [70, 130], next: { clear: 1, petals: 1 } },
  },
  motes: [
    { key: 'flake', kind: 'flake', most: 160, fall: [14, 26], high: [40, 170], sway: 10, big: 0.5, colors: ['246,117,122', '244,180,200', '232,232,208', '196,155,217'], alpha: 0.7, wind: 60 },
  ],
};

export const MEADOW = {
  id: 'meadow',
  ground,
  // More flowering bushes, and twice the stones and stumps, most of them clumps of flowers here.
  density: { standing: 0.8, bushes: 1.8, rocks: 2, stumps: 2, graves: 1 },
  props: {
    oak1: ['bloom_tree1', 'bloom_tree2', 'bloom_tree3'],
    oak2: ['bloom_tree2', 'bloom_tree3', 'bloom_tree1'],
    oak3: ['bloom_tree3', 'bloom_tree1', 'bloom_tree2'],
    // Blossom trees in three of four of the pines' places too, a giant mushroom in the fourth.
    pine1: ['bloom_tree2', 'bloom_tree1', 'bloom_shroom1', 'bloom_tree3'],
    pine2: ['bloom_tree3', 'bloom_shroom2', 'bloom_tree2', 'bloom_tree1'],
    deadtree1: ['bloom_vine1', 'bloom_vine2'],
    deadtree2: ['bloom_vine2', 'bloom_vine1'],
    bush1: 'bloom_bush1',
    bush2: 'bloom_bush2',
    // Sunflowers, tulips and bluebells where most of the stones and stumps lie (and by the shrines),
    // a mossy stone here and there; toadstools for the seats by the start's and the woodcamps' fires.
    rock1: ['bloom_flower2', 'bloom_flower3', 'bloom_rock1'],
    rock2: 'bloom_rock2',
    rock3: ['bloom_flower1', 'bloom_flower2', 'bloom_flower3', 'bloom_rock3'],
    stump: ['bloom_flower1', 'bloom_flower2', 'bloom_flower3', 'bloom_flower2', 'bloom_toadstool'],
    'start:stump': 'bloom_toadstool',
    'woodcamp:stump': 'bloom_toadstool',
    redcaps: ['bloom_flower1', 'bloom_flower2', 'bloom_flower3'],
    gravestone: 'bloom_statue',
    gravecross: 'bloom_statue',
    // The gallows' clearing is left to the flowers: a statue where the gallows stood.
    'gallows:*': null,
    'gallows:lm_gallows': 'bloom_statue',
    // The graveyard's cursed trees are vine-wrapped (their violet glow kept), its skulls on posts gone.
    'graveyard:lm_skulltree': 'bloom_vine2',
    'graveyard:lm_skulltree2': 'bloom_vine1',
    'graveyard:lm_driedtree': 'bloom_vine2',
    'graveyard:lm_skullpost': null,
    'graveyard:lm_skullpost2': null,
  },
  trunks: { bloom_tree1: 3.5, bloom_tree2: 3.5, bloom_tree3: 3.5, bloom_shroom1: 3, bloom_shroom2: 3, bloom_vine1: 2.5, bloom_vine2: 2.5 },
  // The violet giant mushroom's spots glow (its emissive 'c'): a soft light of their own.
  lit: { bloom_shroom2: ['cyan', 24] },
  // The fae twilight: rosy at dusk, lavender-pink at its deepest and never dark (0.86 luminance at
  // dusk, 0.73 at midnight, the Darkwood's 0.45), rosy again before the dawn. The horde's night
  // layer still goes over it (drawn while the light is under 0.95: enemies.js nightFloor), four
  // fifths as strong at midnight. A light vignette, darkening the edges in violet.
  night: [
    [0, [236, 208, 222]],
    [0.1, [218, 190, 212]],
    [0.5, [204, 172, 202]],
    [0.86, [208, 176, 204]],
    [0.95, [236, 202, 206]],
    [1, [255, 234, 218]],
  ],
  dawn: [255, 246, 236],
  fog: { rgb: [250, 200, 230], alpha: [0.05, 0.035], drift: [3.5, 6], rise: [0.8, 1.5], haze: 1.5, wind: 40 },
  vignette: ['36,16,48', 0.42],
  dust: { step: PC.e, rise: [PC.b, PC.e, PC.m], charge: [PC.e, PC.L] },
  // More than twice the Darkwood's fireflies and now and then a fae light among them, soft and round
  // (a size of 1.5 has a glow of its own: particles.js), pollen glinting as it drifts (twinkling
  // stars), and petals falling for its leaves.
  fx: [
    { every: 0.05, at: 'view', z: [4, 20], vx: [-8, 8], vy: [-8, 8], vz: [-3, 3], life: [2, 4], size: 1, colors: [PC.l, PC.l, PC.Y], flags: P.GLOW | P.FADE, drag: 0.2, rain: true },
    { every: [0.5, 0.9], at: 'view', z: [8, 30], vx: [-5, 5], vy: [-5, 5], vz: [-2, 2], life: [3, 5], size: 1.5, colors: [PC.Y, PC.l, PC.i], flags: P.GLOW | P.FADE, drag: 0.3, rain: true },
    { every: [0.08, 0.16], at: 'view', z: [2, 24], vx: [-3, 5], vy: [-2, 2], vz: [-1, 2], life: [0.6, 1.4], size: 1, colors: [PC.Y, PC.f, PC.z], flags: P.GLOW | P.FADE | P.STAR, drag: 0.1, rain: true, wind: 30 },
    { every: [0.15, 0.35], at: 'sky', z: [60, 60], vx: [8, 20], vy: [4, 12], vz: [-16, -12], life: [3.2, 3.6], size: 1, colors: [PC.i, PC.P, PC.z, PC.j], flags: P.FADE, drag: 0.1, wind: 40 },
  ],
  weather,
  // Barrows and hollows, a third of them Undercrofts as in the Darkwood, the rest as their minute makes them.
  crypt: { door: 'crypt_meadow', inside: null, kinds: ['Barrow', 'Hollow'] },
  flicker: ['fire'],
  lightK: { cyan: 0.55, pink: 0.6 },
  // The fae court (game/fae-rings.js, game/fae.js). The owner's (28 October 2026): "Meadow, IDK what
  // to do with meadow, you guys figure out something, have some good game design idea how to make
  // meadow not be identical to forest." So fae rings stand all over it, circles of ten moonblooms
  // that wake about once a minute and dance: the horde that crosses one goes round the hero for a
  // while instead of at him, then breaks wild when the music stops (from 8:00 the Unseelie Hour,
  // crueller). The only thing the rings change of the land is what stands: nothing in a ring's
  // clearing (clearAt, biomes.js biomeProp). Its trees stay as thick as they were (density above):
  // the Druid's Grove Warden finds as many here as he did.
  fae: FAE,
  clearAt,
};
