// The Abyss's look (data/maps.js 'hell'): the fifth and last of the Survival maps, the hardest
// night. The owner's (28 October 2026): "And one more would be a dark, hellish, essentially dark,
// hellish, demonic map." Ash where the Darkwood has its oak meadows, black basalt where it has its
// pinewoods, blood-red fields where its woods are cursed, scorched causeways for its roads, and the
// ground cracked, the cracks glowing through the dark. Charred trees with embers in their bark
// stand where its oaks stand, obsidian spires where its pines do, black thorns where its dead
// trees do (the flora, art/flora-hell.js); brimstone vents breathe fire where its mushrooms glow,
// braziers burn for its lanterns. The darkest night (L 0.33 at its depth): what is seen there is
// mostly what glows. Its crypts are the Inferno's.
//
// The fields are game/biomes.js's (its header says what each one is); this file is the Abyss's
// alone, so its look can be refined without touching another map's.

import { GROUND } from '../darkwood.js';
import { PC, P, tones, H } from './kit.js';

const ground = {
  ...GROUND,
  zones: [
    tones(['#231d20', '#2b2427', '#332b2d', '#3c3234', '#46393c']), // ash
    tones(['#1a1820', '#211e28', '#282430', '#302b38', '#383242']), // black basalt
    tones(['#2e1418', '#3a191e', '#461e24', '#52232a', '#5e2830']), // the blood fields
  ],
  road: tones(['#2f2422', '#3b2d29', '#473630', '#544037', '#62493e']), // a scorched causeway
  verge: -0.2,
  tuft: {
    oak: tones(['#3a3030', '#4a3a36', '#2e2626']), // charred stubble
    pine: tones(['#2e2a36', '#3a3444', '#24202c']),
    cursed: tones(['#5a2228', '#6a2a30', '#4a1a20']),
  },
  tufts: 160,
  sparse: 0.4,
  leaf: {
    oak: tones(['#5a4e4a', '#6a5e56', '#4a4040']), // ash
    pine: tones(['#4a4450', '#5a5462', '#3a3440']),
    cursed: tones(['#4a2a2a', '#5a3434', '#3a2020']),
  },
  leaves: 110,
  flower: tones(['#f77622', '#feae34', '#be4a2f']), // embers in the ash (painted, lit as the ground)
  stem: H('#2a1f2d'),
  flowers: 70,
  bloom: 0.55,
  pebble: tones(['#3a2a44', '#1e1828', '#5a4a6a']), // obsidian
  pebbles: 90,
  // The cracks (darkwood.js paintChunk): where a slow noise `scale` px across crosses its middle,
  // `width` either side of it, wider where the ground runs hot (`heat`, a noise `heat` px across);
  // fine ones (`fine` px, `fineWidth`) only where it runs hottest (`fineAt`). In the ash and the
  // blood fields, barely in the basalt (`zones`), never within `clear` px of a path. Hot in the
  // ground (`glow`: fine, edge, core), and lighting the night where they run as a fire would
  // (forest.js addLights, lighting.js glow): their glow added to the light at `alpha`, pulsing by
  // `pulse`, so they shine through the dark and light whatever stands over them.
  cracks: {
    zones: [1, 0.35, 1], scale: 46, fine: 19, heat: 380, width: 0.011, fineWidth: 0.009, fineAt: 0.55, clear: 5,
    glow: tones(['#7a2a22', '#be4a2f', '#f77622']), alpha: 0.7, pulse: 0.2,
  },
};

// The climate (weather.js): clear nights, ash falling, and now and then an ember storm, embers
// whirling up through the ash and red lightning with the forest's thunder. No rain, so no step is
// wet; only the thunder is heard.
const weather = {
  skies: {
    clear: { rain: 0, dark: 0, lightning: 0, flake: 0, ember: 0, haze: 0, wind: 0 },
    ashfall: { rain: 0, dark: 0.1, lightning: 0, flake: 0.7, ember: 0.15, haze: 0.5, wind: 0.1 },
    emberstorm: { rain: 0, dark: 0.18, lightning: 1, flake: 0.5, ember: 1, haze: 0.8, wind: 0.3 },
  },
  spells: {
    clear: { secs: [120, 220], next: { ashfall: 2, emberstorm: 1 } },
    ashfall: { secs: [90, 170], next: { clear: 1, emberstorm: 1 } },
    emberstorm: { secs: [70, 130], next: { ashfall: 1, clear: 1 } },
  },
  dim: [0.6, 1.2, 1],
  flash: [255, 150, 110],
  bolt: { glow: '255,70,40', core: '255,226,200', light: 'red' },
  gap: [5, 13],
  motes: [
    { key: 'flake', kind: 'flake', most: 240, fall: [16, 30], high: [30, 170], sway: 5, big: 0.25, colors: ['125,106,106', '75,61,68', '160,140,140'], alpha: 0.6, wind: 40 },
    { key: 'ember', kind: 'ember', most: 140, rise: [16, 40], high: [0, 12], top: 160, sway: 8, colors: ['247,118,34', '254,174,52', '228,59,68'], alpha: 0.85 },
  ],
};

export const HELL = {
  id: 'hell',
  ground,
  density: { standing: 0.75, bushes: 1, rocks: 1.4, stumps: 1, graves: 2 },
  props: {
    oak1: ['hell_tree1', 'hell_tree2'],
    oak2: ['hell_tree2', 'hell_tree1'],
    oak3: ['hell_tree1', 'hell_tree2'],
    pine1: ['hell_spire1', 'hell_spire2'],
    pine2: ['hell_spire2', 'hell_spire1'],
    deadtree1: ['hell_thorn1', 'hell_thorn2'],
    deadtree2: ['hell_thorn2', 'hell_thorn1'],
    bush1: 'hell_thornbush1',
    bush2: 'hell_thornbush2',
    rock1: 'hell_rock1',
    rock2: 'hell_rock2',
    rock3: 'hell_rock3',
    stump: 'skullpile',
    redcaps: 'hell_bones',
    // The vents breathe fire where the mushrooms glow.
    mushrooms: { n: 'hell_vent', light: ['fire', 34], anim: 6 },
    gravestone: ['lm_skullpost', 'lm_skullpost2'],
    gravecross: ['lm_skullpost2', 'lm_skullpost'],
    lantern: { n: 'brazier', light: ['fire', 70], anim: 9 },
    'start:stump': 'bonepile',
    'woodcamp:stump': 'bonepile',
    // The stones of the circles and the start's waystone cast a blood-red light here (their runes
    // are the menhir's own).
    'start:menhir': { n: 'menhir', light: ['red', 40] },
    'circle:menhir': { n: 'menhir', light: ['red', 34] },
    'circle:lm_monument': { n: 'lm_monument', light: ['red', 80] },
  },
  trunks: { hell_tree1: 3.5, hell_tree2: 3.5, hell_spire1: 3, hell_spire2: 3, hell_thorn1: 2.5, hell_thorn2: 2.5 },
  // The embers in the charred trees and the lava in the spires cast a little light of their own.
  lit: { hell_tree1: ['ember', 22], hell_tree2: ['ember', 22], hell_spire1: ['ember', 16], hell_spire2: ['ember', 16] },
  night: [
    [0, [150, 96, 104]],
    [0.1, [124, 80, 96]],
    [0.5, [108, 70, 90]],
    [0.86, [114, 72, 90]],
    [0.95, [150, 96, 96]],
    [1, [230, 170, 150]],
  ],
  dawn: [255, 214, 180],
  fog: { rgb: [140, 80, 70], alpha: [0.1, 0.07], drift: [3.5, 6], rise: [0.8, 1.5], haze: 1.2, wind: 50 },
  vignette: ['30,4,8', 0.72],
  dust: { step: PC.a, rise: [PC.a, PC.A, PC.m], charge: [PC.a, PC.A] },
  // Embers rising for the fireflies, ash falling for the leaves.
  fx: [
    { every: 0.1, at: 'view', z: [0, 8], vx: [-6, 6], vy: [-4, 4], vz: [10, 26], life: [1.5, 3], size: 1, colors: [PC.o, PC.y, PC.O], flags: P.GLOW | P.FADE, drag: 0.3, wind: 30 },
    { every: [0.2, 0.5], at: 'sky', z: [60, 60], vx: [4, 14], vy: [3, 9], vz: [-15, -10], life: [3.5, 4.5], size: 1, colors: [PC.a, PC.A, PC.W], flags: P.FADE, drag: 0.1, wind: 40 },
  ],
  weather,
  // Hellgates, their stairs burning orange (crypt_hell's emissive), lit by fire, not the crypts' violet.
  crypt: { door: 'crypt_hell', inside: 'inferno', kinds: ['Pit', 'Abyss Gate'], light: 'fire', glow: '#f77622' },
  flicker: ['fire', 'ember'],
  lightK: { cyan: 0.55, ember: 0.8 },
  // Its ground (game/topology/islands.js, 28 October 2026). The owner's: "for hell, it has to bean area
  // made of patches of land connected by bridges and occasionally just land. Everything should look
  // dead....and, yeah, should be like patches of this dead baren wasteland connected with either thin
  // stretches of this land or bridges here and there and below it should look like .....basically two
  // versions, one version has lava around these patches of land and below the bridges and the other has
  // like a huge fall into the void." Islands on a lattice `spacing` px apart (straying `stray` of it), `r`
  // px round (the start's `startR`), never nearer one another than `gapMin`, their coasts wobbling `amp`
  // of their radius; each joined to its four neighbours (`links`: one in five or so left out where both
  // ends can spare it, never leaving an island with fewer than three) by a bridge (`bridge` of them,
  // `hw.bridge` px half wide, of planks, bone or stone by `materials`), a thin isthmus (`isthmus`) or
  // a broad joining of land (the rest), bending `bend` of its length. Below: lava or the void, one or the
  // other per run (`variants`, by the run's seed); the islands and their joinings the same in both.
  topology: {
    kind: 'islands', spacing: 900, stray: 0.15, r: [230, 420], startR: 520, gapMin: 80, amp: 0.2,
    links: {
      drop: 0.2, bridge: 0.5, isthmus: 0.35, bend: 0.08,
      hw: { bridge: [12, 18], isthmus: [20, 40], broad: [70, 130] },
      materials: { planks: 0.5, bone: 0.25, stone: 0.25 },
    },
    variants: ['lava', 'void'],
  },
  // How the gaps and bridges are painted (game/topology/paint.js): the lava (the Dungeon's ramp, its
  // crust where it meets the rock, glowing into the night's light at `alpha`, pulsing `pulse`), the
  // dark rock of an island's south cliff (four strata, light to dark), the void (black, a faint speck
  // here and there) and the lit lip of a rim over it, the decks' planks, rails and nails, bone and stone,
  // and the shade a deck casts on what is below it.
  terrain: {
    lava: { ramp: tones(['#be4a2f', '#f77622', '#feae34', '#fee761']), crust: tones(['#140b0f', '#7a2a22']), alpha: 0.8, pulse: 0.15 },
    cliff: tones(['#4a3638', '#3a2a2c', '#2a1e22', '#1a1216']),
    void: tones(['#04030a', '#2a2438']),
    lip: H('#6e5c60'),
    drop: H('#0a0710'),
    planks: tones(['#5a3a26', '#6a4630', '#4e3220']),
    plankGap: H('#1e120c'),
    rail: H('#3a261a'),
    nail: H('#a0a0a8'),
    bone: tones(['#d8ccb4', '#c4b69c', '#a89a80', '#8a7e68']),
    stone: tones(['#5a5460', '#4a4450', '#3e3a46']),
    mortar: H('#1e1a24'),
    shade: 0.5,
  },
};
