// The Frostfell's look (data/maps.js 'frozen'): the second of the five Survival maps. The owner's
// (28 October 2026): "One would be a frozen, you know, snowy map ... From there on, we progress to
// the frozen map." The Darkwood under snow: snowfields where it has its oak meadows, blue-shadowed
// drifts under the pines, ice sheets where its woods are cursed, trampled slush for its roads and
// snow banked along them. Its own trees under snow stand where the Darkwood's stand (the flora,
// art/flora-frozen.js); ice crystals glow where its mushrooms do. Its crypts are ice caves. Then,
// the same day: "we will have to only have to spend the night in the forest, make the desert and
// snow one be normal bright": its fifteen minutes are a cold, clear day (sun, below) on white snow
// (day); its night's snow and light (ground, night) are kept for a night it may be given again.
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

// The snow by day: white fields, the drifts in the pines' shade a cold blue, the ice sheets
// cyan, the roads trampled to grey slush; lumps of snow, twigs and needles on it, a glint here and there.
const day = {
  ...ground,
  zones: [
    tones(['#c4d0e0', '#d0dbe9', '#dce5f1', '#e7eef7', '#f2f6fb']), // the snowfields
    tones(['#aebed4', '#bac9dd', '#c6d3e5', '#d2ddec', '#dde6f2']), // drifts in the pines' shade
    tones(['#94bed4', '#a2c9dc', '#b0d3e4', '#bedcea', '#cce5f0']), // the ice sheets
  ],
  road: tones(['#7e8490', '#8c929e', '#9aa0ab', '#a8aeb8', '#b6bcc5']), // trampled slush
  tuft: {
    oak: tones(['#ffffff', '#e2eaf4', '#c2cee0']), // lumps of snow
    pine: tones(['#b6c6da', '#ccd8e8', '#a0b0c8']),
    cursed: tones(['#d4f2ff', '#eafaff', '#a8d6ee']), // ice
  },
  leaf: {
    oak: tones(['#6a5a54', '#7a6a62', '#58484a']), // twigs on the snow
    pine: tones(['#4a6a5c', '#5a7a6a', '#3a5a4c']), // fallen needles
    cursed: tones(['#c4ecff', '#e0f8ff', '#a2d2ec']), // ice chips
  },
  flower: tones(['#ffffff', '#c8f4ec', '#a9dcff', '#8fd8ff']), // frost flowers
  stem: H('#a4b4ca'),
  pebble: tones(['#8b9bb4', '#6a7890', '#a8b4c8']),
  glint: { zones: [1, 0, 1], share: 0.004, color: H('#ffffff') },
};

// The climate (weather.js), the owner's (28 October 2026): "Weather is snow blizzard, gusts here and
// there freeze monsters or hero." Snowfall, and blizzards in it: the flakes thick and driven by the
// wind, the fog white, the light dimmer; a clear sky only now and then, briefly. The day opens and ends
// in falling snow (`first`, `close`). Each sky's `gust` is how often the gusts blow (game/hazards/
// gusts.js): at a blizzard's 1 every 5 to 11 s, in a snowfall about three times rarer, under a clear sky
// twenty times. Snow is never heard falling and never wets a step; fresh snow crunches underfoot
// (`crunch`: the hero's steps while it falls).
const weather = {
  skies: {
    clear: { rain: 0, dark: 0, lightning: 0, flake: 0, haze: 0, wind: 0, gust: 0 },
    snow: { rain: 0, dark: 0.06, lightning: 0, flake: 0.5, haze: 0.4, wind: 0.15, gust: 0.3 },
    blizzard: { rain: 0, dark: 0.14, lightning: 0, flake: 1, haze: 1, wind: 1, gust: 1 },
  },
  spells: {
    clear: { secs: [40, 70], next: { snow: 1 } },
    snow: { secs: [90, 180], next: { blizzard: 2, clear: 0.4 } },
    blizzard: { secs: [60, 120], next: { snow: 1 } },
  },
  first: 'snow',
  close: 'snow',
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
  day,
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
  // A cold, clear day (the owner's "normal bright", 28 October 2026): a white light with blue in
  // it, the monsters in their own colours, too bright for the night's lifted edge (enemies.js nightFloor).
  sun: [240, 246, 255],
  // Its night, as it was lit before it was given the day.
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
  // What its sky does to the fight (game/hazards): gusts (gusts.js), none before `after` s, one every
  // `every` s at the sky's full `gust`, gathering `tell` s over `r` px, freezing the horde `foes` s and
  // the hero `hero` s; at his feet `aim` of the time, else `near` px off, `most` at once.
  hazards: { gusts: { key: 'gust', after: 120, every: [5, 11], tell: 1.2, r: [35, 50], foes: 3, hero: 1.5, aim: 0.35, near: [40, 220], most: 3 } },
  // Its crypts' doors are igloos (28 October 2026, the owner's "Entrance to crypts are iglus here and
  // there"), an ice cave within as before.
  crypt: { door: 'crypt_igloo', inside: 'icecave', kinds: ['Ice Cave', 'Glacier Vault'] },
  flicker: ['fire'],
  lightK: { cyan: 0.55, ice: 0.6 },
  // Its ground (game/topology/corridor.js, 28 October 2026). The owner's: "The frost map goes up and
  // down feel free to add details to it like ice here and there - hero steps on the ice and continues
  // sliding until reaches regular ground ... Entrance to crypts are iglus here and there, some 2
  // minutes apart." An endless corridor along y: open snow `band` px across (x about -750 to 750), ice
  // cliffs and rock either side; a road winding up and down it; igloos beside the road (`off` px off
  // its middle) a minute's walk from the start each way, then every two minutes' walk; a shrine every
  // 35 s of walking; landmarks between; ice sheets and frozen ponds off the road (`patches`: 50-260 px
  // across), half of them with rocks frozen in and at their rims (art/terrain.js: solid to the hero, so
  // a slide stops on one); spires of rock and ice on the cliffs. Its fields are the Sunscorch's (its
  // header says what each one is).
  topology: {
    kind: 'corridor', axis: 'y', band: 1500,
    face: { amp: 80, wave: 1200, rough: 20, grain: 150, ridge: 260 },
    road: { amp: 330, periods: [2700, 1600], wobble: 0.35, seg: 1024, keep: 200 },
    crypts: { first: 4500, every: 9000, jitter: 1000, at: 'road', off: [70, 100], face: 'igloo' },
    shrines: { every: 2240, jitter: 250 },
    landmarks: { share: 0.5, side: [180, 320], kinds: ['circle', 'woodcamp', 'ruins', 'graveyard'] },
    patches: { kind: 'ice', cell: 800, per: [1, 1, 2], r: [25, 130], aspect: [0.55, 1], amp: 0.16, offRoad: 30, clear: 150, fromFace: 50, rocks: { share: 0.5, n: [1, 3], names: ['ice_rock1', 'ice_rock2', 'ice_rock3'] } },
    spires: { name: ['ice_spire1', 'ice_spire2'], every: 140, depth: [40, 220] },
  },
  // How its ground is painted beyond darkwood.js's (game/topology/paint.js), by day: the cliffs' rock
  // (six tones of blue-grey, darker than the snow so the walls read), a band of face along them, snow
  // on their ledges and high ridges, the lit lip
  // and dark foot; the ice (four tones, pale cyan to white: a sheen across it, cracks, a white rim and
  // a blue shadow just outside it); the tell's colour round a sheet near the hero.
  terrain: {
    rock: tones(['#3e4c62', '#4e5d75', '#5f6f88', '#73839b', '#8b9ab0', '#a6b4c6']),
    face: tones(['#3f4f66', '#4c5d75', '#5b6c84', '#6b7c94', '#7c8da4']),
    snow: H('#f2f6fb'),
    lip: H('#ffffff'),
    foot: H('#2e3a4e'),
    ice: tones(['#7fc4dc', '#94d2e6', '#a9def0', '#c2eaf6']),
    iceCrack: H('#5a9ab8'),
    iceRim: H('#ffffff'),
    iceEdge: H('#8ea6c8'),
    tell: { ice: '#4fa8d8' },
  },
};
