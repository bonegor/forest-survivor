// The Sunscorch's look (data/maps.js 'desert'): the first of the five Survival maps, where a new
// player's first night is spent. The owner's (28 October 2026): "One would be the desert map ...
// And I want you to make it so that the first one where we start is the desert map." A desert
// under a cool moon: dunes rippled by the wind where the Darkwood has its oak meadows, a redder
// hardpan where it has its pinewoods, a bleached salt pan where its woods are cursed, and caravan
// tracks for its roads. Saguaros and palms stand where its oaks stand, joshua trees where its
// pines do, dead acacias in the pan (the flora, art/flora-desert.js). A bright night, the
// second brightest of the five after the Bloomvale's, as the gentlest one should be, its crypts
// sandstone tombs.
//
// The fields are game/biomes.js's (its header says what each one is); this file is the Sunscorch's
// alone, so its look can be refined without touching another map's.

import { GROUND } from '../darkwood.js';
import { PC, P, tones, H } from './kit.js';

// The ground by night, dark to light. Brightened (28 October 2026): its first night, the first a
// new player sees, read as dark brown dirt, and it should read at once as moonlit dunes. So each
// zone's tones are worked back from the colours they are to show under the night's light at its
// depth (night below: 140, 150, 200, which shows a tone at 0.55, 0.59 and 0.78 of its red, green
// and blue): tan to pale gold as they stand, by night the dunes come to 0.25-0.44 in lightness
// (the Frostfell's snow 0.16-0.27, the Darkwood's oak meadows 0.08-0.14), their lee and troughs a
// cool blue-violet, the open sand and the crests a warm tan silvered by the moon. Not lighter: the
// horde, lifted by night (enemies.js NIGHT_EDGE), comes to 0.5-0.8, the darkest of it (scorpions,
// scarabs, cultists) to about 0.4, parted from the sand by its hue, its ink outline and pale ring.
const ground = {
  ...GROUND,
  zones: [
    tones(['#756b61', '#8e7c65', '#ab8d63', '#c5a269', '#e2bd78']), // the dunes
    tones(['#8a7059', '#9d7c5c', '#b1885e', '#c59662', '#d9a367']), // red hardpan, the joshua stands
    tones(['#998d74', '#a09479', '#a89b7d', '#b1a282', '#baaa87']), // the bleached salt pan, flat and pale
  ],
  // A caravan track: sand packed firm, a little darker than the dunes and warmer (0.22-0.35 by
  // night), its ruts and edges darker, not mud.
  road: tones(['#735c3e', '#816844', '#94754a', '#a88550', '#bc9457']),
  verge: 0.18, // sand banked along the track's edges, lighter
  tuft: {
    oak: tones(['#7a6f4c', '#8a7d55', '#685e40']), // dry grass, few and far between
    pine: tones(['#7a6448', '#8a724f', '#68553d']),
    cursed: tones(['#c8bea4', '#d4cab0', '#b8ae96']), // lumps of salt
  },
  tufts: 70,
  sparse: 0.5,
  leaf: {
    oak: tones(['#5e4a36', '#6e5840', '#4e3e2e']), // dry twigs under the scrub
    pine: tones(['#5e4a36', '#6e5840', '#4e3e2e']),
    cursed: tones(['#d4ccb8', '#e0d8c4', '#c4bca8']), // salt crust
  },
  leaves: 50,
  flower: tones(['#f6757a', '#feae34', '#e8e8d0', '#c49bd9']), // desert flowers, rare
  stem: H('#58492f'),
  flowers: 40,
  bloom: 0.62,
  pebble: tones(['#a08a6a', '#6e5a42', '#c2ac88']),
  pebbles: 130,
  // Ripples on the dunes (and fainter on the hardpan): one every `scale` px across the world,
  // slanting, bending with the patches; a lit crest (`crest` of each), its lee darker (to `lee`).
  // Calmer on the lighter sand (every 14 px, not 11, and a little softer), seen without crowding
  // the horde.
  ripple: { zones: [1, 0.35, 0], scale: 14, slant: 0.35, warp: 40, crest: 0.14, lee: 0.32, amp: 0.17 },
  // Salt on the pan catching the moon, a grain in 250 (the Frostfell's glint); the dunes stay clean.
  glint: { zones: [0, 0, 1], share: 0.004, color: H('#f0e4c8') },
};

// The road to the Sunscorch by day (game/prologue.js DayForest): sand and a caravan road in the sun.
const day = {
  ...ground,
  zones: [
    tones(['#b08a58', '#bd9662', '#c9a46a', '#d4b077', '#dfbd85']),
    tones(['#a87a52', '#b5865b', '#c09264', '#cb9e6e', '#d6aa79']),
    tones(['#b0a088', '#bcac94', '#c8b8a0', '#d2c4ac', '#dcceb8']),
  ],
  road: tones(['#8a6a48', '#987652', '#a6835c', '#b49068', '#c09c74']),
  tuft: {
    oak: tones(['#9a8a50', '#aa9a5c', '#8a7a44']),
    pine: tones(['#9a7a4a', '#aa8a56', '#8a6a40']),
    cursed: tones(['#b4aa98', '#c4baa8', '#a49a88']),
  },
  leaf: {
    oak: tones(['#8a6a48', '#9a7a52', '#7a5a3c']),
    pine: tones(['#8a6a48', '#9a7a52', '#7a5a3c']),
    cursed: tones(['#d8ccb8', '#e4d8c4', '#c8bca8']),
  },
  stem: H('#7a6a3c'),
  pebble: tones(['#a08a6c', '#7a6650', '#c4ae90']),
  glint: null, // the salt's glint is the moon's
};

// The climate (weather.js): clear nights, a haze of blown sand, now and then a sandstorm, its
// grains streaking along the wind, the fog thick with sand and the night cast toward orange. No
// rain and no thunder, so none of it is heard and no step is wet.
const weather = {
  skies: {
    clear: { rain: 0, dark: 0, lightning: 0, grain: 0, haze: 0, wind: 0, cast: 0 },
    haze: { rain: 0, dark: 0.05, lightning: 0, grain: 0.22, haze: 0.6, wind: 0.3, cast: 0.3 },
    sandstorm: { rain: 0, dark: 0.16, lightning: 0, grain: 1, haze: 1, wind: 1, cast: 0.75 },
  },
  spells: {
    clear: { secs: [120, 240], next: { haze: 2, sandstorm: 1 } },
    haze: { secs: [70, 140], next: { clear: 2, sandstorm: 1 } },
    sandstorm: { secs: [60, 120], next: { haze: 1, clear: 1 } },
  },
  dim: [0.4, 0.8, 1.5], // the dark of a storm takes the blue first
  cast: { to: [236, 168, 104], k: 0.3 },
  motes: [
    { key: 'grain', kind: 'grain', most: 280, speed: [150, 250], fall: [4, 10], high: [2, 34], len: [3, 7], colors: ['214,176,122', '232,200,150', '186,146,98'], alpha: 0.5 },
  ],
};

export const DESERT = {
  id: 'desert',
  ground,
  day,
  // Fewer trees than the Darkwood's (three in ten of its candidates stand, against half), more stone.
  density: { standing: 0.6, bushes: 0.8, rocks: 1.6, stumps: 0.7, graves: 1 },
  props: {
    // Saguaros for the oaks, scattered, and a date palm where one stands within 90 px of a road
    // (the caravans' wells); joshua trees for the pines, a palm too within 60 px of one. Since 28
    // October 2026 (50 px before, and none for the pines) the palms are found by the roads, two or
    // three together where an avenue runs (darkwood.js: its trees 36-52 px out), not only now and
    // then: about 35 in the 16 by 16 chunks round the start against 13, the saguaros and joshua
    // trees nearly as many as they were (154 and 99, against 160 and 115). The road by day
    // (prologue.js) has a dozen along it now, one every 200 px or so.
    oak1: { n: ['sand_cactus1', 'sand_cactus2'], road: 'sand_palm1', near: 90 },
    oak2: { n: ['sand_cactus1', 'sand_cactus2'], road: 'sand_palm1', near: 90 },
    oak3: { n: ['sand_cactus2', 'sand_cactus1'], road: 'sand_palm1', near: 90 },
    pine1: { n: ['sand_joshua1', 'sand_joshua2'], road: 'sand_palm1', near: 60 },
    pine2: { n: ['sand_joshua2', 'sand_joshua1'], road: 'sand_palm1', near: 60 },
    deadtree1: ['sand_acacia1', 'sand_acacia2'],
    deadtree2: ['sand_acacia2', 'sand_acacia1'],
    bush1: 'sand_scrub1',
    bush2: 'sand_scrub2',
    rock1: 'sand_rock1',
    rock2: 'sand_rock2',
    rock3: 'sand_rock3',
    stump: 'sand_bones',
    redcaps: 'sand_agave',
    // The night-blooming cactus glows as the mushrooms do, in a pale moonlight of its own (its own
    // key, the moon's colour: softened below, where the moon's key would dim the glades' sword in
    // the stone too), the light in its flowers shimmering, its two frames slowly in turn.
    mushrooms: { n: 'sand_bloom', light: ['bloom', 22], anim: 2 },
    gravestone: 'sand_cairn',
    gravecross: 'sand_cairn',
    // Torches for the lanterns; sandstone to sit on by the campfires.
    lantern: { n: 'torch', light: ['fire', 56], anim: 9 },
    'start:stump': 'sand_rock3',
    'woodcamp:stump': 'sand_rock3',
    // The graveyard's cursed trees, dried acacias here (their violet glow kept).
    'graveyard:lm_skulltree': 'lm_driedtree',
    'graveyard:lm_skulltree2': 'lm_driedtree',
  },
  trunks: { sand_cactus1: 3, sand_cactus2: 3, sand_palm1: 2.5, sand_joshua1: 2.5, sand_joshua2: 2.5, sand_acacia1: 2.5, sand_acacia2: 2.5 },
  // A bright night (28 October 2026: L 0.6 at its depth, 0.56 before, against the Darkwood's
  // 0.45 and the Frostfell's 0.5): dusk warm, the depth a cool silver-blue moonlight on the warm
  // sand (bluer than before, the ground's tones worked back from it), the dawn coming in gold.
  night: [
    [0, [220, 172, 150]],
    [0.1, [150, 156, 204]],
    [0.5, [140, 150, 200]],
    [0.86, [144, 152, 200]],
    [0.95, [214, 176, 160]],
    [1, [255, 228, 188]],
  ],
  dawn: [255, 236, 210],
  fog: { rgb: [222, 196, 150], alpha: [0.05, 0.035], drift: [3.5, 6], rise: [0.8, 1.5], haze: 2.5, wind: 90 },
  // The night's indigo at the edges, a little lighter (a dark brown before, which made dirt of the sand).
  vignette: ['12,10,26', 0.6],
  dust: { step: PC.t, rise: [PC.t, PC.S, PC.B], charge: [PC.t, PC.T] },
  // Sand blown low over the dunes, faster in a storm.
  fx: [
    { every: [0.2, 0.5], at: 'view', z: [1, 6], vx: [12, 28], vy: [-3, 3], vz: [-1, 1], life: [1.5, 3], size: 1, colors: [PC.t, PC.T, PC.S], flags: P.FADE, drag: 0.1, wind: 70 },
  ],
  weather,
  crypt: { door: 'crypt_desert', inside: 'tomb', kinds: ['Tomb', 'Necropolis'] },
  flicker: ['fire'],
  lightK: { cyan: 0.55, bloom: 0.7 },
};
