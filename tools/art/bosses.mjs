// Two of the four bosses, cut from the Creative Commons library and baked by tools/bake-art.mjs
// into public/assets/art/bosses.js (js/art/bosses.js makes their defs). Both are drawn facing
// right, their feet (the hem of a robe that floats) on the bottom row less `below`; poses are
// lists of frames played at poseFps from when a boss starts an attack (js/game/bosses.js).
//
// King Ossarian: Foozle's Ancient Skeleton (CC0), side view, at the game's own pixel size: idle
// (0-6), walk (7-14), the overhead blow (15-21) and the charged blow (22-28). His horns are
// gilded into a crown (fill: only the horns' patches, whose browns the arms and shield share).
// Azgaroth: ansimuz's Gothicvania demon (CC0), mirrored to face right and shrunk to half, his
// blue skull and horns turned to embers: idle (0-5), then the attack without its breath (6-13).
const SKEL = 'foozle-lucifer-skeleton-ancient/Right/Png/AncientSkeletonRight';
const DEMON = 'ansimuz-gothicvania-patreons-collection/demon-Files/PNG/';

// n of frame f, for a pose at poseFps.
const hold = (f, n) => Array(n).fill(f);

// The skeleton's 80 px cells, its body in the middle and its hem on row 64; the walk's 96 px
// cells hold him 8 px further right and down (and the box is one in, to centre him).
const SK = [1, 0, 80, 80];
const skel = (name, count, crop = SK) => ({ file: `${SKEL}${name}.png`, frame: name === 'Walk' ? [96, 96] : [80, 80], count, crop });

// The demon's cells (idle 160×144, attack 192×176) put on one box round his body, 87 px into
// the attack's cell, his hem on its row 170: the idle cell sits 24 px left and 44 up of it.
const DM = [-9, 12, 192, 160];
const demon = (file, w, h, dx, dy) => ({ file: `${DEMON}${file}`, frame: [w, h], crop: [DM[0] - dx, DM[1] - dy, DM[2], DM[3]], flip: true });

export default {
  credits: [
    {
      pack: 'foozle-lucifer-skeleton-ancient',
      title: 'Lucifer – Ancient Skeleton Boss',
      what: 'King Ossarian, the Bone King (horns gilded into a crown)',
      source: 'Right/Png: AncientSkeletonRightIdle, Walk, Attack01, Attack03',
      author: 'Foozle (art by Baldur)',
      link: 'https://foozlecc.itch.io/lucifer-skeleton-ancient-boss',
      licence: 'CC0',
    },
    {
      pack: 'ansimuz-gothicvania-patreons-collection',
      title: "Gothicvania Patreon's Collection",
      what: 'Azgaroth, Lord of Cinders (mirrored, halved, skull and horns recoloured to embers)',
      source: 'demon-Files/PNG: demon-idle, demon-attack-no-breath',
      author: 'Luis Zuno (ansimuz)',
      link: 'https://opengameart.org/content/gothicvania-patreons-collection',
      licence: 'CC0',
    },
  ],
  sprites: {
    boneking: {
      sheets: [skel('Idle', 7), skel('Walk', 8, [SK[0] + 8, SK[1] + 8, 80, 80]), skel('Attack01', 7), skel('Attack03', 7)],
      fill: {
        seed: ['#63492c', '#413325'],
        map: { '#a29d6b': '#fee761', '#836b3f': '#feae34', '#63492c': '#d77643', '#413325': '#be4a2f' },
      },
      meta: {
        idle: [0, 1, 2, 3, 4, 5, 6],
        walk: [7, 8, 9, 10, 11, 12, 13, 14],
        motionRate: 3,
        below: 15,
        body: [30, 57],
        poseFps: 20,
        poses: {
          // The nova: the orb gathers through the 1 s warning, flashes white as it bursts.
          nova: [...hold(22, 2), ...hold(23, 2), ...hold(24, 4), ...hold(25, 12), 26, 27, 27, ...hold(28, 4)],
          // Raising the dead: a fist held up.
          summon: [15, 16, 16, 17, 17, ...hold(18, 13)],
          // The volley of bones: a sweep of the sword as they fly.
          volley: [19, 19, 19, 20, 20, 21],
        },
        glow: ['#a52d27', '#7d211d'],
      },
    },
    demonlord: {
      sheets: [demon('demon-idle.png', 160, 144, 24, 44), demon('demon-attack-no-breath.png', 192, 176, 0, 0)],
      scale: 0.5,
      map: {
        '#00dff5': '#fee761',
        '#00b2dd': '#f77622',
        '#006280': '#a22633',
      },
      meta: {
        idle: [0, 1, 2, 3, 4, 5],
        walk: [0, 1, 2, 3, 4, 5],
        motionRate: 3,
        body: [26, 40],
        poseFps: 20,
        poses: {
          // The fan of fire leaves at once: wings thrown up as it flies.
          volley: [12, 12, ...hold(13, 6)],
          // Calling fire from the sky: drawn in, then up with the wings.
          meteor: [6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 12, 13],
          // The burst round him (0.9 s): crouched under his wings, then up as it goes off.
          nova: [6, 7, 7, 8, 8, ...hold(9, 3), ...hold(10, 4), ...hold(11, 4), 12, 13, 13],
          summon: [6, 7, 8, 9, 10, 11, 12, ...hold(13, 7)],
        },
        glow: ['#fee761', '#f77622'],
      },
    },
  },
};
