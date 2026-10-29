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
  // (Since 29 October 2026 none of the Darkwood's ground shows under the Abyss's floor, topology/abyss.js:
  // no tufts, leaves, flowers or pebbles are laid for it to paint over.)
  tufts: 0,
  sparse: 0.4,
  leaf: {
    oak: tones(['#5a4e4a', '#6a5e56', '#4a4040']), // ash
    pine: tones(['#4a4450', '#5a5462', '#3a3440']),
    cursed: tones(['#4a2a2a', '#5a3434', '#3a2020']),
  },
  leaves: 0,
  flower: tones(['#f77622', '#feae34', '#be4a2f']), // embers in the ash (painted, lit as the ground)
  stem: H('#2a1f2d'),
  flowers: 0,
  bloom: 0.55,
  pebble: tones(['#2c2c34', '#1e1c1e', '#44444e']), // grey grit (none laid now)
  pebbles: 0,
  // The cracks (darkwood.js paintChunk): where a slow noise `scale` px across crosses its middle,
  // `width` either side of it, wider where the ground runs hot (`heat`, a noise `heat` px across);
  // fine ones (`fine` px, `fineWidth`) only where it runs hottest (`fineAt`). In the ash and the
  // blood fields, barely in the basalt (`zones`), never within `clear` px of a path. Hot in the
  // ground (`glow`: fine, edge, core), and lighting the night where they run as a fire would
  // (forest.js addLights, lighting.js glow): their glow added to the light at `alpha`, pulsing by
  // `pulse`, so they shine through the dark and light whatever stands over them. Since 29 October 2026
  // in no zone: the floor's own fissures (topology/abyss.js) are the cracks now, painted into the same
  // glow, which paintChunk still makes for a look with cracks, so they light the night as these did.
  cracks: {
    zones: [0, 0, 0], scale: 46, fine: 19, heat: 380, width: 0.011, fineWidth: 0.009, fineAt: 0.55, clear: 5,
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
    // (Grey ash, not mauve, since the floor went grey on 29 October 2026.)
    { key: 'flake', kind: 'flake', most: 240, fall: [16, 30], high: [30, 170], sway: 5, big: 0.25, colors: ['125,120,116', '75,72,74', '160,155,150'], alpha: 0.6, wind: 40 },
    { key: 'ember', kind: 'ember', most: 140, rise: [16, 40], high: [0, 12], top: 160, sway: 8, colors: ['247,118,34', '254,174,52', '228,59,68'], alpha: 0.85 },
  ],
};

export const HELL = {
  id: 'hell',
  ground,
  // The Act IV floor (29 October 2026): "the floow should resemble act 4 of diablo 2", a plain with
  // almost nothing growing on it, so the forest's stands are thinned hard (`standing` 0.25, from 0.75)
  // and what stands in their slots is mostly ruin: broken pillars where its pines stand, iron stakes
  // among the thorns where its dead trees do, a fallen drum or a pillar stump for its bushes, wall ends
  // and an arch at the ruins, a seal stone in the circles (art/flora-hell.js). A few charred trees by
  // the lava are the accents.
  density: { standing: 0.25, bushes: 1, rocks: 1.4, stumps: 1, graves: 2 },
  props: {
    oak1: ['hell_tree1', 'hell_tree2'],
    oak2: ['hell_tree2', 'hell_tree1'],
    oak3: ['hell_tree1', 'hell_tree2'],
    pine1: ['hell_pillar2', 'hell_spire2'],
    pine2: ['hell_pillar3', 'hell_spire1'],
    deadtree1: ['hell_stake', 'hell_thorn1'],
    deadtree2: ['hell_thorn2', 'hell_stake'],
    bush1: 'hell_drum',
    bush2: 'hell_pillar1',
    'ruins:ruinpillar': 'hell_pillar2',
    'ruins:brokenpillar': 'hell_pillar1',
    'ruins:rubble': 'hell_wall1',
    'ruins:lm_gargoyle2': 'hell_arch',
    'ruins:lm_rockpile': 'hell_wall2',
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
    // The stones of the circles and the start's waystone cast a blood-red light here (the waystone's
    // runes are the menhir's own; the circles' stones are seal stones since 29 October 2026, their
    // rune burning red).
    'start:menhir': { n: 'menhir', light: ['red', 40] },
    'circle:menhir': { n: 'hell_seal', light: ['red', 34] },
    'circle:lm_monument': { n: 'lm_monument', light: ['red', 80] },
  },
  trunks: { hell_tree1: 3.5, hell_tree2: 3.5, hell_spire1: 3, hell_spire2: 3, hell_thorn1: 2.5, hell_thorn2: 2.5, hell_pillar1: 3, hell_pillar2: 3, hell_pillar3: 3, hell_stake: 2 },
  // The embers in the charred trees and the lava in the spires cast a little light of their own.
  lit: { hell_tree1: ['ember', 22], hell_tree2: ['ember', 22], hell_spire1: ['ember', 16], hell_spire2: ['ember', 16] },
  // The light (29 October 2026, with the grey Act IV floor: "the setup should be more like grey"): a
  // near-neutral night, a hair warm at dusk and dawn, a grey fog and a vignette black with only a breath
  // of red. The old night (L 0.33, magenta) turned every grey maroon; the lava and the fissures' glow
  // are the reds now.
  night: [
    [0, [150, 142, 144]],
    [0.1, [136, 130, 134]],
    [0.5, [124, 120, 124]],
    [0.86, [128, 122, 124]],
    [0.95, [156, 142, 136]],
    [1, [230, 190, 170]],
  ],
  dawn: [255, 214, 180],
  fog: { rgb: [118, 108, 104], alpha: [0.1, 0.07], drift: [3.5, 6], rise: [0.8, 1.5], haze: 1.2, wind: 50 },
  vignette: ['12,8,8', 0.72],
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
  // Its ground (game/topology/plates.js, 29 October 2026): fault plates. The owner's that day: "the hell
  // part is like, the land patches look kinda shitty. They are a bit too big ... the patches of land
  // should have a better algorithm that makes it look just better than what we have now because the
  // patches rn look silly." (The 28 October islands, "patches of land connected by bridges and
  // occasionally just land", "lava around these patches of land and below the bridges and the other has
  // like a huge fall into the void", are kept in the lava or void below and the walkways over it.)
  // Jagged plates grouped into masses on an `M` px lattice, rivers of fire between the masses (half
  // width `hwMajor` by the heat, never under `hwMinMajor`, a broad `pBroad` of them `broad` times, else
  // `seamF` times; narrowing to `taper[0]` where a river runs alone, `taper[2]` where three meet), a
  // pinched mouth never under `capMin`; every node of land takes a way home and (`q2`) a second, a
  // `pLoop` share of the other rivers are crossed too, by walkways of `materials`. Plates.js holds the
  // rest of its numbers. Below: lava or the void, one or the other per run (`variants`, by the run's
  // seed); the land and its walkways the same in both.
  topology: {
    kind: 'plates', M: 460, q2: [1, 1], pLoop: 0.15,
    hwMajor: [22, 70], pBroad: 0.2, broad: 1.6, seamF: [0.7, 1.3], hwMinMajor: 16, capMin: 10, taper: [0.75, 1, 1.25],
    materials: { stone: 0.6, rock: 0.2, iron: 0.15, bone: 0.05 },
    variants: ['lava', 'void'],
  },
  // How the floor is painted (29 October 2026, game/topology/abyss.js, `style` 'abyss': every pixel, no
  // Darkwood ground under it). The owner's that day: "the setup should be more like grey and the floow
  // should resemble act 4 of diablo 2." The style study's grey Act IV palette (our own pixels): flagstones
  // (`stone`, dark to lit, one in six `slate`), the bare rock's slabs (`rock`), dark joints (`mortar`,
  // never a light chalk) and hairline cracks (`crack`), `rubble` and grit, an `ash` film, bone flecks
  // (`bones`) and dried `blood`; the lava's `scorch` on the rock by it and by the fissures (`fissure`:
  // edge, body, core, glowing into the night's light); the lava (its ramp, unchanged, glowing at
  // `alpha`, pulsing `pulse`; its `crust`: cooled, ember, ember dark) and its cooled `floe`s (body,
  // rim); the cliff under a south rim (`cliff`: its face high to low and its foot; `strata`, `under` its
  // foot's glow over the lava) and the `lip` atop it; the void (deep, its near rim, a speck: neutral
  // black, no violet); the walkways (`walk` stone slabs, `curb`, `joint`; `iron` plates and their
  // `ironJoint`; flat slabs of `bone`) and the `shade` each casts; the Sanctuary's plaza under the camp
  // (`tile` A, B, bevel; `grout`; `inlay` red and gold).
  terrain: {
    style: 'abyss',
    lava: { ramp: tones(['#be4a2f', '#f77622', '#feae34', '#fee761']), crust: tones(['#16110f', '#5c2418', '#3a1812']), alpha: 0.8, pulse: 0.15 },
    stone: tones(['#3d3936', '#4f4a45', '#625c55', '#776f66', '#8e867b']),
    slate: tones(['#3a3b41', '#4a4b52', '#5c5d64', '#707178', '#85868c']),
    rock: tones(['#3a3633', '#46423e', '#57524c', '#6a645c', '#7c756b']),
    mortar: H('#262322'),
    crack: H('#2e2a28'),
    rubble: tones(['#34302d', '#403b37', '#6e675e']),
    ash: tones(['#7f7a74', '#97928b', '#aca79f']),
    bones: tones(['#d9d0b8', '#b3a990', '#7d745f']),
    blood: tones(['#3f1d1f', '#55262a', '#6e2a2c']),
    scorch: tones(['#5e4036', '#7a4632', '#94502e']),
    fissure: tones(['#7a2a22', '#f77622', '#feae34']),
    floe: tones(['#4a1d15', '#8a3220']),
    cliff: tones(['#57514b', '#47423d', '#39342f', '#2b2724', '#1c1917']),
    strata: H('#322d29'),
    under: H('#6b2e1e'),
    lip: H('#8e867b'),
    void: tones(['#050507', '#15141a', '#34313a']),
    walk: tones(['#5d5853', '#6a645f', '#77716a']),
    curb: H('#3b3734'),
    joint: H('#2a2725'),
    iron: tones(['#3a3a40', '#55555c', '#707078']),
    ironJoint: H('#24242a'),
    bone: tones(['#d8ccb4', '#c4b69c', '#a89a80', '#8a7e68']),
    tile: tones(['#4d4954', '#58535f', '#6a6572']),
    grout: H('#211e26'),
    inlay: tones(['#7a2630', '#a07a3a']),
    shade: 0.5,
  },
};
