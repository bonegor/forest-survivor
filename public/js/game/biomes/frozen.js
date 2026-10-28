// The Frostfell's look (data/maps.js 'frozen'): the second of the five Survival maps. The owner's
// (28 October 2026): "One would be a frozen, you know, snowy map ... From there on, we progress to
// the frozen map." The Darkwood under snow: snowfields where it has its oak meadows, blue-shadowed
// drifts under the pines, ice sheets where its woods are cursed, trampled slush for its roads and
// snow banked along them. Its own trees under snow stand where the Darkwood's stand (the flora,
// art/flora-frozen.js); ice crystals glow where its mushrooms do. Its crypts are ice caves.
//
// The fields are game/biomes.js's (its header says what each one is); this file is the Frostfell's
// alone, so its look can be refined without touching another map's.

import { GROUND } from '../darkwood.js';
import { PC, P, tones, H } from './kit.js';

// Snow is lighter than grass (0.3-0.52), the night's light bluer over it; the monsters' night edge
// still stands out, as the light is lower than the Sunscorch's.
const ground = {
  ...GROUND,
  zones: [
    tones(['#46506a', '#525d79', '#5e6a88', '#6c7997', '#7b88a6']), // the snowfields
    tones(['#3b4560', '#45506c', '#505c79', '#5b6886', '#677593']), // drifts in the pines' shade
    tones(['#34505e', '#3d5c6b', '#466879', '#507587', '#5b8396']), // the ice sheets
  ],
  road: tones(['#2e2c33', '#38353d', '#433f48', '#4f4a53', '#5e5864']), // trampled slush
  verge: 0.25, // snow banked along the roads, lighter
  tuft: {
    oak: tones(['#7f8aa6', '#95a2bd', '#6b7690']), // lumps of snow
    pine: tones(['#56627a', '#6b7892', '#47526a']),
    cursed: tones(['#6fa0b4', '#88b8ca', '#5a8aa0']), // ice
  },
  tufts: 220,
  sparse: 0.35,
  leaf: {
    oak: tones(['#4a4048', '#5a4e52', '#3a3238']), // twigs on the snow
    pine: tones(['#3a4a44', '#46564e', '#2e3c38']), // fallen needles
    cursed: tones(['#8fb8d0', '#a9dcff', '#7aa0b8']), // ice chips
  },
  leaves: 90,
  flower: tones(['#c8f4ec', '#ffffff', '#a9dcff', '#8fd8ff']), // frost flowers
  stem: H('#6b7690'),
  flowers: 70,
  bloom: 0.55,
  pebble: tones(['#5a6988', '#3a4466', '#8b9bb4']),
  pebbles: 90,
  // A grain of snow catching the light, here and there (`share` of the pixels), off the pines' shade.
  glint: { zones: [1, 0, 1], share: 0.004, color: H('#d4e4f4') },
};

// The climate (weather.js): clear nights, snowfall, and now and then a blizzard: the flakes thick
// and driven by the wind, the fog white, the night darker. Snow is never heard falling and never
// wets a step; fresh snow crunches underfoot (`crunch`: the hero's steps while it falls).
const weather = {
  skies: {
    clear: { rain: 0, dark: 0, lightning: 0, flake: 0, haze: 0, wind: 0 },
    snow: { rain: 0, dark: 0.06, lightning: 0, flake: 0.5, haze: 0.4, wind: 0.15 },
    blizzard: { rain: 0, dark: 0.14, lightning: 0, flake: 1, haze: 1, wind: 1 },
  },
  spells: {
    clear: { secs: [120, 240], next: { snow: 2, blizzard: 1 } },
    snow: { secs: [90, 180], next: { clear: 2, blizzard: 1 } },
    blizzard: { secs: [60, 110], next: { snow: 1, clear: 1 } },
  },
  dim: [1, 0.9, 0.7],
  crunch: 'flake',
  // Flakes one or two pixels, drifting as they fall, drawn unlit: kept to a soft 0.6 so they never glow.
  motes: [
    { key: 'flake', kind: 'flake', most: 340, fall: [22, 40], high: [30, 170], sway: 6, big: 0.3, colors: ['235,242,255', '200,216,240'], alpha: 0.6, wind: 130 },
  ],
};

export const FROZEN = {
  id: 'frozen',
  ground,
  density: { standing: 0.9, bushes: 1, rocks: 1, stumps: 1, graves: 1 },
  props: {
    oak1: ['snow_oak1', 'snow_oak2'],
    oak2: ['snow_oak2', 'snow_oak1'],
    oak3: ['snow_oak1', 'snow_oak2'],
    pine1: ['snow_pine1', 'snow_pine2'],
    pine2: ['snow_pine2', 'snow_pine1'],
    deadtree1: ['snow_dead1', 'snow_dead2'],
    deadtree2: ['snow_dead2', 'snow_dead1'],
    bush1: 'snow_bush1',
    bush2: 'snow_bush2',
    rock1: 'snow_rock1',
    rock2: 'snow_rock2',
    rock3: 'snow_rock3',
    stump: 'snow_stump',
    redcaps: 'snow_shrub',
    // Ice crystals where the mushrooms glow, their glint running over them, in a light of ice.
    mushrooms: { n: 'snow_crystal', light: ['ice', 28], anim: 4 },
    gravestone: 'snow_grave',
    gravecross: 'snow_grave',
  },
  trunks: { snow_oak1: 3.5, snow_oak2: 3.5, snow_pine1: 2.5, snow_pine2: 2.5, snow_dead1: 2.5, snow_dead2: 2.5 },
  night: [
    [0, [164, 158, 198]],
    [0.1, [130, 140, 190]],
    [0.5, [112, 124, 180]],
    [0.86, [118, 128, 182]],
    [0.95, [182, 166, 194]],
    [1, [244, 232, 226]],
  ],
  dawn: [250, 244, 240],
  fog: { rgb: [225, 235, 255], alpha: [0.12, 0.08], drift: [3.5, 6], rise: [0.8, 1.5], haze: 1.5, wind: 110 },
  vignette: ['6,10,24', 0.7],
  dust: { step: PC.G, rise: [PC.G, PC.w, PC.g], charge: [PC.G, PC.w] },
  // Ice glinting on the snow, and a few flakes drifting down whatever the sky.
  fx: [
    { every: 0.18, at: 'view', z: [0, 3], vx: 0, vy: 0, vz: [0, 2], life: [0.4, 0.9], size: 1, colors: [PC.X, PC.w, PC.c], flags: P.GLOW | P.FADE | P.STAR, drag: 0 },
    { every: [0.15, 0.35], at: 'sky', z: [50, 70], vx: [-4, 6], vy: [2, 6], vz: [-14, -9], life: [3.5, 5], size: 1, colors: [PC.w, PC.G], flags: P.FADE, drag: 0.05, wind: 50 },
  ],
  weather,
  crypt: { door: 'crypt_frozen', inside: 'icecave', kinds: ['Ice Cave', 'Glacier Vault'] },
  flicker: ['fire'],
  lightK: { cyan: 0.55, ice: 0.6 },
};
