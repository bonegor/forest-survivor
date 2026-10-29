// The sprites of the Survival maps' new ground (game/topology, 28 October 2026): the Sunscorch's cave
// mouths and the Frostfell's igloos (its crypts' doors: 26 x 29, open and sealed, as the crypt's own),
// the rocks frozen into its ice ponds, the spires on both maps' ranges, an oasis's reeds, a giant's
// ribcage and skull, the Abyss's bridge posts, and the quicksand's and a gust's swirls. Drawn by the
// artists one sprite each (the owner's way since 26 October 2026) and gathered here, all of them now
// (a name not here would be drawn as its stand-in, art/fallbacks.js; without a swirl, a pool or a gust
// would show its tells and rings alone: topology/draw.js, hazards/gusts.js). Pure data, as the rest of art/defs.js's table. Lit from the
// top-left as all the art; the 1 px ink outline is the build's (engine/sprites.js), none drawn here.

// ---- The crypts' doors -------------------------------------------------------------------------------
// Both the crypt's own 26 x 29 and its two frames (props.js crypt: open, then sealed once the hero has
// been in and come out), so CRYPT_BOX (forest.js), CRYPT_STEPS (game.js), the prompt over the door and
// Game.drawCryptGlow's d.y - 7 all hold unchanged; the foot row (28) is where the hero's steps begin,
// and the treads glow the crypts' own violet 'j' (the one emissive key), so a door the hero may enter
// reads the same on every map.

// The Sunscorch's: a cave mouth at the foot of the top range. The owner's (28 October 2026): "At the
// top, there is an entrance of a cave every once in a while 2 mins walk apart roughly and that is
// basicallly the crypt." A natural arch cut dark into the rock, its right wall in the sun and its left
// in shade; a worn lintel stone across its springing; under it sandstone steps going down into the
// dark, each tread lit faint lavender from below; a trodden sill at the foot. Sealed: the mouth choked
// by boulders fallen from the crown, one rolled out onto the sill, nothing glowing. The rock is the
// cliff's own: `palette` draws its eight keys in the Sunscorch's terrain tones, so the door sits in the
// painted wall as the same stone; the lintel, risers and sill keep the game's T, I, H. Since the walls
// became dry stone (29 October 2026, game/topology/stone.js) those are the walls' grey-brown stones
// (look.terrain: 1 2 3 4 B = stone[2..6]), the pale cobbles of their caps (t s o = cap[3..5]) and the
// joints' dark (b = stone[1]). Its ink too (k, the outline the build draws round it and the dark of its
// mouth) is the stones' own outline, stone[0], not the game's navy (its judging, 29 October 2026: the
// navy outline "clashes with the warm R0 outlines of the stones around it").
const CAVE_PALETTE = { 1: '#46302a', 2: '#54392f', 3: '#61463a', 4: '#7d5e4a', B: '#9b7c60', t: '#9b7c60', s: '#a98b6d', o: '#b89b7a', b: '#3a2622', k: '#2b1b1c' };

// The Frostfell's: an igloo. The owner's (28 October 2026): "Entrance to crypts are iglus here and
// there, some 2 minutes apart." A dome of five courses of snow blocks and a cap, each course sagging
// towards the viewer, its joints a tone under its blocks (g on the sunlit G and w of the upper left, N
// and n on the blue shade of the lower right); an entrance tunnel running out of its foot towards the
// viewer, its roof a second, lower arch catching the sun, its front a ring of voussoirs round a dark
// mouth; snow banked against dome and tunnel, sloping out to the ground. Open, the mouth is black and
// the steps go down into it (x 9..16, rows 24..27), the deeper pair narrower. Sealed, the mouth is
// walled with clear ice blocks in three courses (X c lit top-left, U body, u joints: the Frostfell's
// ice ramp), no glow.
const IGLOO_OPEN = [
  '...........kkkk...........',
  '.........kkwwwGkk.........',
  '.......kkwgGGGGgGkk.......',
  '......kgwGgGGGGgGGgk......',
  '.....kwggwgGGGGgGgNgk.....',
  '....kwwgwggGGGGggGNggk....',
  '...kggwgwwwggggGGGNgNNk...',
  '...kgwggwwGwwgGGGgNNgNk...',
  '..kwgwGggGGGGgGGgNNGgNgk..',
  '..kggwGwwgggggggNGGggNNk..',
  '.kwGgGGGGwgwwwGgGGgggNgNk.',
  '.kGGwgGGGGgGGGGgGgggNgNNk.',
  '.kGGGwgggGgNNNNggNNNgNNNk.',
  '.kgGGGgwGNNwwwGNNggNgNNnk.',
  '.kGgGGgGNwwGGGGGgNgNNNnNk.',
  'kwGgggGNwGGGGGGgggNNnnnNNk',
  'kgGgwwgNGGGwwwwgggNnggnNnk',
  'kGggGGNGGwwGGGGGGggNNNnnNk',
  '.kGgGGNGwGgGGGGggGgNNNnNk.',
  '.kGGggNwGGgGGGGNggGNnnNNk.',
  '..kGGgNGGGgkkkkNgggNNNNk..',
  '...kwwNGGGkhhhhkgggNGGk...',
  '..kGwGkggkhhhhhhkNNkGggk..',
  '.kGwGGkwGhhhhhhhhggkGgggk.',
  'kGwGGGkGGhqqqqqqhggkgggNNk',
  'kGGGGgkgghjjjjjjhNNkggNNNk',
  'kgGGggkGGqqqqqqqqggkgNNNnk',
  'kggNNNkGGjjjjjjjjggkNNNnnk',
  '.kkkkkkkkkkkkkkkkkkkkkkkk.',
];
const IGLOO_SEALED = [
  ...IGLOO_OPEN.slice(0, 21),
  '...kwwNGGGkXccUkgggNGGk...',
  '..kGwGkggkXccUUukNNkGggk..',
  '.kGwGGkwGuuuuuuuuggkGgggk.',
  'kGwGGGkGGXccuXccUggkgggNNk',
  'kGGGGgkggcUUucUUuNNkggNNNk',
  'kgGGggkGGuuuuuuuuggkgNNNnk',
  'kggNNNkGGcuXccuXcggkNNNnnk',
  IGLOO_OPEN[28],
];

// ---- The Sunscorch's boneyard (topology/places.js `bones`: the ribcage at its middle, the skull 34 px
// off, the little sand_bones round them) ------------------------------------------------------------
// What is left of some great beast that died on the caravan road long ago, bleached in the noon sun (no
// glow: the Sunscorch is spent by day) in sand_bones' own keys (z T Z, the horns khaki D C H), so the
// small bones round it read as the same boneyard.
//   sand_ribcage  48 x 26: from its side, a knobbled spine arching over the sand, dorsal spikes up, the
//                 neck stepping down into the sand on the left and the tail sinking on the right; five
//                 great ribs curving down into it (white where the sun is on them, grey where they curve
//                 under), the far ribs seen between them in the cage's shade, the fourth snapped. The
//                 near ribs' feet stand at x 7-10 and 37-40, under its two posts in TERRAIN_SOLIDS;
//                 between them the hero walks through the cage.
//   sand_skull    24 x 16: its skull sunk to the jaw, a long, low dragon's head facing right, two horns
//                 swept back (the far one darker), a slanted eye socket under a heavy brow, its fangs
//                 going down into the sand where the lower jaw lies buried.
//   hell_ribcage, hell_skull: the same two charred (palette recolours of palette.js colours, no drawing
//                 of their own), for the Abyss's islands if they want them ("Everything should look
//                 dead", the owner, 28 October 2026): bone gone ash-grey, its shade burnt to char, the
//                 horns black. Nothing lays them out yet.
const RIBCAGE = {
  frames: [
    [
      '................T..T..T..T......................',
      '.............T.zT.zT.zT.zT..T...................',
      '............zTTzzTzzTzzTzzTzT..T................',
      '............zzZTTZTTZTTZTTZzzTzT..T.............',
      '.........zzTTTQZZKzTKZZQZKzTTZzz.zT.............',
      '.........zTZZZ...zTKZ....zTKZQTTTz..............',
      '......zzTTzT.....zT.Z....zT.Z.ZZZTz.z...........',
      '......zTKzTKZ...zT..QZ..zT..QZ..KzTTz...........',
      '......TZKzT.Z...zT...Z..zT...Z..zTKZTz..........',
      '...zzTZ.zT..QZ.zT....Q.zT....Q..zT.QZTTz........',
      '...zzZ..zT...Q.zT....QKzT....QKzT....ZZz........',
      '...TTQ.zT....KzT......zT......KzT.....QTz.......',
      '..zzZ..zT.....zT......zT......zT.......zTT......',
      '..zTZ..zT....zT......zT.......zT......zTKZz.....',
      '..TZQ.zT.....zT......zT.......zT......zT.Qz.....',
      '.zzT..zT.....zT......zT......zT......zT...Tz....',
      '.zTZ..zT.....zZ......zZ......zT......zT...ZT....',
      '.TZQ..zZ.....zZ......zZ......zzT....zT.....ZT...',
      'zzT...zZ.....zZ.....KzZ.............zT......Zz..',
      'zTZ...zZ....KzZ.....KzZ.............zT......QT..',
      'TZQ...zZ.....zzZ.....zzZ............zZ.......Zz.',
      'zT....zzZ.....zZ......zZ............zZ........TT',
      '.......zZ.....zZQ.....zZQ....zTZ....zZ........ZZ',
      '.......zZQ....zzZQ....zzZQ....zZQ...zzZ........Q',
      '.......zzZQ....zZQ.....zZQ....zzZQ...zZQ........',
      '........zZQ....zzZQ....zzZQ....zZQ...zzZQ.......',
    ],
  ],
};
const SKULL = {
  frames: [
    [
      'C.....H.................',
      'DC....IHH...............',
      'HDCC...IHH..............',
      '.IHDCC..IIH.............',
      '..IIHDDCC.IHz...........',
      '...wIIHHDDCwzzz.........',
      '...zzzIIHHzzwzzzz.......',
      '..wzzzzzzzzzzzwzzzz.z...',
      '..zzzzzZzzzKhhhzzzzzTT..',
      '..zzzzzzQzTKhhhhKzzzzzTT',
      '..zzzzzTZTTZKhhhKTzzzhTZ',
      '..zTzzTTTTTTZKKZTTTTTTTZ',
      '..TZTTTTTTZZZZZZZZZZZZZZ',
      '...ZZZZZZZZQZZQZZQZZQZQ.',
      '...QQQQQQQ.zT..zT..zT...',
      '...........zT..z...z....',
    ],
  ],
};
// Charred: bone white to bone grey, its warm half-tone to ash, its shade to char, the horns to soot.
const CHARRED = {
  w: '#a8b5b2', z: '#a8b5b2', T: '#7d6a6a', Z: '#4b3d44', Q: '#2a1f2d', K: '#181425',
  C: '#6c6c78', D: '#44444e', H: '#2c2c34', I: '#181425',
};

export const TERRAIN_ART = {
  crypt_cave: {
    emissive: 'j',
    palette: CAVE_PALETTE,
    burst: false, // a door never bursts: its nine tones stay off the particle list (engine/sprites.js)
    frames: [
      [
        '..........sooss...........',
        '.........ttttttBB.........',
        '...ssssstttbbbbB43........',
        '..tttttttb1kkkkbb3sssttt..',
        '.tttttBb1kkkkkkkkbbtBBBB4.',
        '.tttttB1kkkkkkkkkkBBB44332',
        'BtBBBB1kkkkkkkkkkkkB443332',
        'BBBBBB1kkkkkkkkkkkkB433221',
        '4B44441kkkkkkkkkkkkB332211',
        '44tttsTTTTTTTTTTTTsst2B411',
        '.tttBtssssssssssssstBtBB4.',
        'tttBBBBtttttttttttttBtB442',
        'ttBBB41kkkkkkkkkkkkBBBB443',
        'ttBBB41kkkkkkkkkkkktBBB442',
        'BtB4441kkkkkkkkkkkktBB4432',
        'BBB4431hhhhhhhhhhhhtB44332',
        '4B44331hhhhhhhhhhhht443322',
        '4443321hhqqqqqqqqhht433221',
        '3433221hhhhhhhhhhhht332211',
        '3332211hjjjjjjjjjjht322111',
        '.22ttt1hIIIIIIIIIIht221111',
        '.ttBBB1hjjjjjjjjjjhtsttt1.',
        'BtBBB41IHHHHHHHHHHItBB443.',
        'BBB4B41jjjjjjjjjjjjtB44332',
        '4444331IHHHHHHHHHHIt443221',
        '44333tssssssssssssBst32211',
        'B4222BttttBttttttttt4211BB',
        '4bb114BBBBBBBBBBBBBB3111b3',
        '11.111bIIIIIIIIIIIIb111.11',
      ],
      // sealed: boulders fallen from the crown fill the arch and the doorway, one on the sill
      [
        '..........sooss...........',
        '.........ttttttBB.........',
        '...ssssstttbbbbB43........',
        '..tttttttb1kkkkbb3sssttt..',
        '.tttttBb1stBksssBbbtBBBB4.',
        '.tttttB1sttB4sstB4BBB44332',
        'BtBBBB1ttBB43tBB431B443332',
        'BBBBBB1BB4432BB4321B433221',
        '4B44441k3321123211kB332211',
        '44tttsTTTTTTTTTTTTsst2B411',
        '.tttBtssssssssssssstBtBB4.',
        'tttBBBBtttttttttttttBtB442',
        'ttBBB41kk2343k2332kBBBB443',
        'ttBBB41kkBB443stt4ktBBB442',
        'BtB4441tttB42sttB42tBB4432',
        'BBB4431ttBB3tttBB33tB44332',
        '4B44331tB433BBBB332t443322',
        '444332144331h44331ht433221',
        '343322132211tB2211ht332211',
        '3332211hh1tttBB11hht322111',
        '.22ttt1tB4ttBB43tBht221111',
        '.ttBBB1tBkkBB43kt44tsttt1.',
        'BtBBB41B4kk4432k442tBB443.',
        'BBB4B41432k2321k321tB44332',
        '4444331211h111h2stBt443221',
        '44333tssssssssstsBB4t32211',
        'B4222BttttBttttB44324211BB',
        '4bb114BBBBBBBBBB321B3111b3',
        '11.111bIIIIIIIIIIIIb111.11',
      ],
    ],
  },
  crypt_igloo: { emissive: 'j', frames: [IGLOO_OPEN, IGLOO_SEALED] },

  // ---- The Frostfell's ice rocks: outcrops crusted with ice and snow in and beside its ice sheets,
  // solid to the hero (TERRAIN_SOLIDS), so a slide ends against them. The owner's (28 October 2026):
  // "hero steps on the ice and continues sliding until reaches regular ground. If hits wall while
  // sliding will stop and can decide where to slide next." Slate (K n N g, the spires' and snow_rock's
  // ramp) under a thick snow cap (w G) with a scalloped hem, the ice in the Frostfell's ramp (X c U u):
  // a glaze down each shaded flank and a collar where the rock is frozen into the sheet. Darker than
  // snow and ice alike, so each reads at a glance as the thing a slide stops on. No glow.
  //   ice_rock1  16 x 12  an outcrop, a chunky block and a lower step beside it
  //   ice_rock2  22 x 16  two boulders bound by a frozen cascade between them
  //   ice_rock3  12 x 9   a small one: a single stone, an icicle at its foot
  ice_rock1: {
    frames: [[
      '....wwwG........',
      '...wwwwGGn......',
      '..wwwwwGGnK.....',
      '.wwwGwwGGgnK.wG.',
      '.GwwGwGGgXunwwGG',
      'gNgGNnXnnXUKnGwg',
      'gNNnNNUNnXUKgNnK',
      'gwGGNNNnnXcuNNnK',
      'NnnnNNnnnXUuNnnK',
      'gNNNNnnnKXUugNnK',
      'XgNNnnnnXXUuXUUu',
      '.XXXUUUUUUuuUuu.',
    ]],
  },
  ice_rock2: {
    frames: [[
      '....wwwwG.............',
      '...wwwwwGGn...........',
      '..wwwwwwGGnK..........',
      '.wwwwGwwGGgnK.........',
      '.wwGwGGwGgXun..wwwG...',
      'gGwGNGGNnXUUu.wwwwGG..',
      'gNNnNNnNnXUUuXGwGwGGg.',
      'gwGGNNNnnXcUunNnGnnnK.',
      'NnnnNNnnnXUUuggNNnNnnK',
      'gNNNNNnnKXUcugNNNNnnKK',
      'gNNNKNNnnXUUuNNNNnKnnK',
      'NNNgNKNnnXUUugNNnnKKnK',
      'gNNNNnKnnXUcuNNnnnnKnK',
      'XgNNNnnnXXUUuXNXUnnXUu',
      'wGXUUUUXUUUUuuUUUXUuuu',
      '.GXUUUUUuuUUuuuUUuuuu.',
    ]],
  },
  ice_rock3: {
    frames: [[
      '...wwwG.....',
      '..wwwwGGn...',
      '.wwGwwGgnK..',
      '.gGwGnGXunK.',
      'gNgGNnnXUuK.',
      'gNNnNNnXUuKX',
      'NNNNNnnXUuKU',
      'XgNNnnXXUuuu',
      '.XXUUUUUuuu.',
    ]],
  },

  // ---- The ranges' spires: decor on the ridges above and below the Sunscorch and either side of the
  // Frostfell (the look's `spires`, one every 120 or 140 px of each ridge, 40-220 px into the rock),
  // y-sorted, never solid (the hero can't climb up to them). Darker and more saturated than the painted
  // ridge round them and outlined, so they read as crags standing on the range, not its paint.
  // The Sunscorch's hoodoos, in the desert's sandstone (m b B d t, as sand_rock and crypt_desert),
  // banded like a canyon wall: pale hard beds (b S t T) jutting out as ledges that catch the sun, a rust
  // bed (m b O d) between, the soft beds weathered back so every ledge throws a dark line below it.
  //   mtn_spire1  16 x 30  a hoodoo, its top broken off on a slant, a talus stone at its foot
  //   mtn_spire2  20 x 38  a taller one under a balanced cap stone, a darker ash-grey boulder (m a A S
  //                        t) bleached on its top, cracked, perched off-centre on a pinched neck
  mtn_spire1: {
    frames: [[
      '......tT........',
      '......dtTT......',
      '......ddtTt.....',
      '......dBBBb.....',
      '......BBbbm.....',
      '.....TTTTttt....',
      '.....ttSSbbb....',
      '.....ttddBB.....',
      '.....ttddBBB....',
      '.....ddBBBbbb...',
      '.....ddBbmmm....',
      '.....BBbbmmm....',
      '.....ttddBB.....',
      '....ddOOObbb....',
      '.....ddOObb.....',
      '....TTtttSSS....',
      '.....TTttSS.....',
      '....ttdddBBB....',
      '...dddBBBBBBb...',
      '...dddBBBbbbb...',
      '...dddBBbmmmm...',
      '....BBbbbmmm....',
      '...TTTTTTtttt...',
      '...tttSSSbbbb...',
      '...tttddBBbb....',
      '..tttdddBBbbb...',
      '..ttddddBBbbm...',
      '..ddBBBBbbbmmtd.',
      '.tttddddBBbmtdBb',
      '.tttdddddBbmdBbm',
    ]],
  },
  mtn_spire2: {
    frames: [[
      '.....StTTtS.........',
      '....SttTTttSSA......',
      '...SStttttSSSAAa....',
      '...SSttSSSSSaSAAa...',
      '...ASSSSSSAAaAAAam..',
      '...AASSAAAAAAAaaam..',
      '....aAAAAAAAAaaamm..',
      '.....maaaaaaaammmh..',
      '.......mmmmmmmhhh...',
      '........bmmm........',
      '........Bbmm........',
      '........dBBb........',
      '........tdBB........',
      '.......TTTtSS.......',
      '.......tSSSb........',
      '......ttdddBBB......',
      '......dddBBBbb......',
      '......ddBBBbbb......',
      '......ddBBbmmm......',
      '.......Bbbbmm.......',
      '......tdddOOb.......',
      '......dOOObbm.......',
      '......TTTTTttt......',
      '......ttSSSbbb......',
      '......ttdddBBB......',
      '.....tttdddBBBB.....',
      '.....dddBBBbbbb.....',
      '.....dddBBbmmmm.....',
      '.....BBBbbbmmm......',
      '.....tttdddBBB......',
      '....TTTttttSSSS.....',
      '.....tttSSSbbb......',
      '....tttddddBBbb.....',
      '....tttdddBBBbb.....',
      '...tttdddBBBBbbb.td.',
      '...ddBBBBBbbbbmtdBb.',
      '..tttdddddBBBbbmdBbm',
      '..ttddddddBBBbbmBbbm',
    ]],
  },
  // The Frostfell's crags, the owner's (28 October 2026): "The frost map goes up and down feel free to
  // add details to it like ice here and there". Slate (g N lit, n shade, K cracks), snow on every ledge
  // (w, G turning from the light, g its hem), ice in the ramp of its monsters and crypt (X U u, one c
  // glint), a drift at each foot so they stand in the ridge's snow. No glow: day props.
  //   ice_spire1  14 x 32  a slate needle, its tip snow-capped and glazed blue down its shaded flank, a
  //                        snowy shelf on its left, a frozen cascade down its foot block on the right
  //   ice_spire2  18 x 40  a horn of glacier ice on a slate needle, two shelves (left high, right low)
  //                        under snow pillows fringed with icicles, blue ice glazing its foot
  ice_spire1: {
    frames: [[
      '........w.....',
      '.......wwG....',
      '.......wGGn...',
      '......gwGnU...',
      '......gNnXu...',
      '......gNnXU...',
      '.....ggNnXUu..',
      '.....gNNnXUu..',
      '.....gNnnKUu..',
      '...wwwgNnnKn..',
      '...GwwGgNnnK..',
      '...NNGgNNnnK..',
      '...gggNNnnKK..',
      '...ggNNnnKnnK.',
      '....gNNnKnnnK.',
      '...ggNnnKnnnK.',
      '...gNNnnKnnwG.',
      '..wwgNnnKnwwGG',
      '..GwwGNnnwwGGg',
      '.wGNNgNnXUUUUu',
      '.ggNNgNnXcUUUu',
      '.gggNNnnKXUUuK',
      'gggNNNnnKXUUuK',
      'ggNNNnnKnXUuUK',
      'gNNNnnnKnXUuuK',
      'gNNnnnKnnnXUuK',
      'NNNnnnKnnnXunK',
      'wNNnnKnnnnXunK',
      'wwwNnnKnnnnUnK',
      'GwwwNnKnnnnKnK',
      'GGwwwwGGGGgGgg',
      '.GGGGGGGgGGgg.',
    ]],
  },
  ice_spire2: {
    frames: [[
      '.........X........',
      '........XU........',
      '........XUu.......',
      '........XcU.......',
      '.......wXUu.......',
      '.......XXUu.......',
      '.......XUUu.......',
      '......wXUUuK......',
      '......wwgUuK......',
      '......gwNnuK......',
      '.....ggNNnnK......',
      '.....gNNnnnK......',
      '.....gNNnnKK......',
      '....wgNnnnKnK.....',
      '..wwwwgNnnKnK.....',
      '.wwwwwwGNnnKnK....',
      'wwwwwwGgNnnKnK....',
      'GwwGGgNgNnnKnnK...',
      '.GgNNNnnNnnKnnK...',
      '.XU.X.KgNnnKnnK...',
      '.Uu.U.ggNnnKnnww..',
      '.U..u.gNNnKnwwwGG.',
      '.u....gNnnKnGGGgg.',
      '......gNnnKnNNnKK.',
      '......gNnnKKX.XU..',
      '.....ggNnnKnu.Uu..',
      '.....gNNnnKn..u...',
      '.....gNNnKnn......',
      '....ggNnnKnnK.....',
      '....gNNnnKnXUu....',
      '....gNNnKnXUUu....',
      '..wwwgNnKnXcUu....',
      '.wwwwwGNnKnXUUuG..',
      '.GwwwGGNnKnXUUGG..',
      '.NNNggNNnKnnXUuKK.',
      'gggNNNnnnKnnnXUuK.',
      'ggNNNnnnKnnnnXUnKK',
      'wNNNnnnKnnnnnnUnnK',
      'wwwNNnnKnnnnnnnnnK',
      '.GwwwwGGGGGGGgGgg.',
    ]],
  },

  // ---- An oasis's reeds (places.js lays 2-4 round each pool, among the date palms), 14 x 12: a fan of
  // green blades from a narrow root, so the sand shows between them and it never reads as a bush
  // (sand_scrub1 is the round one): an outer blade leaning out on each side, a tall one straight up, a
  // bent-over one whose broken tip the sun has dried to khaki (C D), and a cattail, a 2 x 5 brown head
  // (B b m) with its pale spike (D) on top. The date palm's greens (v E e L), L on the lit edges.
  sand_reeds: {
    frames: [[
      '.....L..D.....',
      '.....L..Bb..C.',
      '.....Le.Bb.C.D',
      'L....Le.Bb.Le.',
      'Le...Le.bm.Le.',
      '.Le..Le.bm.e.L',
      '.Le..Le.e.LeLe',
      '..Le.eE.eeE.eE',
      '...eEeE.EeEeE.',
      '...eEeE.E.eE..',
      '...LEeEEEE....',
      '..eEvEvvEvEe..',
    ]],
  },
  sand_ribcage: RIBCAGE,
  sand_skull: SKULL,
  hell_ribcage: { ...RIBCAGE, palette: CHARRED, burst: false },
  hell_skull: { ...SKULL, palette: CHARRED, burst: false },

  // ---- The Abyss's bridgehead posts, one at each end of a bridge. The owner's (28 October 2026): "for
  // hell, it has to bean area made of patches of land connected by bridges ... Everything should look
  // dead". So they are dead things too: wood burnt black, bones, cold basalt, in flora-hell.js's keys.
  // Their glow is a few pixels (Hell's night is dark: what is seen there is what glows); the bone reads
  // by its own whiteness, as the bone heaps do.
  //   hell_post_wood   7 x 16  two charred planks split down the middle, burnt to a jagged point,
  //                            lashed with three coils of singed rope, its loose end hanging; the tip
  //                            and one crack still smoulder (o O)
  //   hell_post_bone   7 x 18  a skull on a short spine: a small vertebra, a big winged one and a third
  //                            sunk in a heap of ash
  //   hell_post_stone  9 x 15  a mooring bollard of the spires' basalt, a chipped cap over a round neck,
  //                            a death rune cut in its face burning red (x its core, r its ends)
  hell_post_wood: {
    emissive: 'Oo',
    frames: [
      [
        '.o.....',
        '.AO....',
        '.AAh.a.',
        '.AAhah.',
        'TCCDDHH',
        'HHHIIJJ',
        'TCCDDHH',
        'HHHIIJJ',
        'TCCDDHH',
        '.AahahC',
        '.AaOahD',
        '.hahahC',
        '.AahahD',
        '.AahahH',
        '.AAhahh',
        'haaahhh',
      ],
    ],
  },
  hell_post_bone: {
    frames: [
      [
        '..zzzZ.',
        '.zzzzZA',
        'zzzzzZA',
        'zhhzhhA',
        'zhhZhhA',
        'zzZhZZA',
        '.ZhZhA.',
        '..aha..',
        '.zzzZA.',
        '..zZA..',
        '..aha..',
        'z.zzZ.A',
        'zzzzZZA',
        '.AzZZA.',
        '..ZZA..',
        '..aha..',
        '.zzZZA.',
        'haZZAah',
      ],
    ],
  },
  hell_post_stone: {
    emissive: 'xr',
    frames: [
      [
        '.gQQQh...',
        'gQgQQhQW.',
        'QQWWWWhVV',
        'hVVVVVVVh',
        '.QQWrWVV.',
        '.QQWxWVh.',
        '.QQWxWVV.',
        '.QQxxxVV.',
        '.QQrWrVV.',
        '.QQWWWVV.',
        '.QQWWhVV.',
        '.QQWhWVV.',
        'gQQWhWWVV',
        'QQWWhWVVV',
        'hVVVVVVVh',
      ],
    ],
  },

  // ---- The swirls: ground marks (no outline, as cobweb and stairs), played on a clock over the trap.
  // fx_quicksand, 24 x 14, the sinking swirl over every quicksand pool (topology/draw.js drawSwirls, at
  // alpha 0.55; Game.drawHold at up to 0.8 under a wading hero's feet). The owner's (28 October 2026): "feel
  // free to add quicksand, hero steps in and cannot move for a few seconds", and every trap readable at
  // a glance: a pit seen from three quarters, a black eye (h) under its far rim in shade (m), its near
  // lip in the sun (B t), and two grooves of wet sand spiralling down into it, breaking into dots at
  // their tails, each with a ridge on its inner side lit by how the pit's wall faces the light (T on
  // the lower right, t at the sides, B on the upper left), so it reads as a hollow, not a mound. Frame
  // to frame it turns 45 degrees anticlockwise while the grooves wind clockwise inward, so the sand is
  // seen to sink; the fourth frame runs into the first, one turn in 0.8 s at 5 fps, winding the same way
  // as the painted pool's own spiral. No glow: it is spent by day.
  fx_quicksand: {
    outline: false,
    fps: 5,
    frames: [
      [
        '........................',
        '.....m.m.mmmmmmm........',
        '...m.....BBBBBBBm.......',
        '.m.......hhh....th......',
        '......hhhBBBhh...th.....',
        '.....hBBBmmmBBh...th....',
        '....hB.mmmmmmmtb..Th....',
        '...hB..mmmhhhhmb.Th.....',
        '...ht...hTBttBTTTh......',
        '....ht...hhTTThhh.......',
        '.....hT....hhh.......m..',
        '......mTTTTTTT.....m....',
        '.......mmmmmmm.m.m......',
        '........................',
      ],
      [
        '........................',
        '........mmhhh...........',
        '.....mmmBBBBBhhh........',
        '...mmBBB.....BBBh.......',
        '...BB...hhhhh...th......',
        '.m....hhBBBBBmm.th......',
        '.....hBBmmmmmmbb.Th...m.',
        'm...ht.mmmhhhhmTTh......',
        '.....ht.mbBttBThh....m..',
        '.....hT...hhhhh...TT....',
        '......hTTT.....TTTmm....',
        '.......hhhTTTTTmmm......',
        '..........hhhmm.........',
        '........................',
      ],
      [
        '........................',
        '..................m.....',
        '.......hhhhhhh..........',
        '....hhhBBBBBBBhh....m...',
        '...mBBB...mmm.Bth.......',
        '..mB....hhmmmmm.th..Tm..',
        '.mB....hBBmmmmbTh...Tm..',
        '.mB...htmmhhhhmh....Tm..',
        '.mt..ht.mbBttBh....Tm...',
        '......hTT.bbb...TTTm....',
        '..m....hhTTTTTTThhh.....',
        '.........hhhhhhh........',
        '....m...................',
        '........................',
      ],
      [
        '..........m.m.m.........',
        '................m.......',
        '.................m......',
        '......hhhhhhhh...tm.....',
        '.....hBBBBBBBBh...tm....',
        '....hB..mmmmmmth...Tm...',
        '...hB..hBmmmmmTh...Th...',
        '..hB...htmhhhhmh..Th....',
        '..mt...hTbBttBb..Th.....',
        '...mt...hTTTTTTTTh......',
        '....mT...hhhhhhhh.......',
        '.....m..................',
        '......m.................',
        '........m.m.m...........',
      ],
    ],
  },
  // fx_gust, 40 x 22, a frost gust's telegraph (hazards/gusts.js drawGround, at twice its size over the
  // ring it gathers in). The owner's (28 October 2026): "Weather is snow blizzard, gusts here and there
  // freeze monsters or hero." So it must be read before it freezes anyone, by day on the snow: pale,
  // but in the snow's own blue-grey shading so it stands off the near-white ground. Seen from the 3/4
  // view as the ground ring is (r x 0.55r): three spiral arms of blown snow (white crests w, their
  // blue-grey shadow g, a darker N where they curl in on the lower right, G on a thick arm's lower-right
  // edge), wisps at the rim in a single G line, broken into dashes in the outer third, a fleck or two of
  // loose snow between. The arms are a logarithmic spiral turned 20 degrees a frame and the dashes run
  // in along their lanes, so each frame draws tighter towards the eye (its middle, 20, 11), and the
  // last runs on into the first. No glow: a ground mark's emissive pass, drawn after the actors, would
  // paint its crests over the hero's feet.
  fx_gust: {
    outline: false,
    fps: 8,
    frames: [
      [
        '..................GG....................',
        '...............GGG......................',
        '.............GGG........................',
        '............w..............w............',
        '............g..............g............',
        '.........w........wwwwwwwwwwww..........',
        '........ww......wwwwwwwwwwwwwwww........',
        '........wg.....wwwwggggwgggggwGGw.......',
        '........w......wwgg.wwww.w...gggGw......',
        '........ww.....wg..wwggwwww.....gGw.....',
        '........www....w...gg..ggGww.....gg.....',
        '....w...gwww.w.ww......w.gGw........w...',
        '....g....gwwwwwwww....wG..Nw........GG..',
        '..........ggwwwwwwwwwwGN..ww.........G..',
        '............gggGGGGGggNw.wwG.........G..',
        '...............gggNN...wwwGN.........G..',
        '...GG..............wwwwwGGN.............',
        '....GGGGG..........wGGGGNN..............',
        '.........Gww....wwwGggNN....w...........',
        '..........gg....gggg........g...........',
        '........................................',
        '........................................',
      ],
      [
        '........................................',
        '...................GGGGG................',
        '................wwwG....................',
        '...............wwgg.....................',
        '...........ww..gg.........w.............',
        '..........www.......wwwwwww.............',
        '..........wwg....wwwwwwwwwwwww..........',
        '..........wg....wwwwwgggggwwwwww........',
        '..........w.....wwggg.w...gggGGww.......',
        '..........w....wwg..wwwwwww..ggGGw......',
        '..........ww...ww...ggggGGw....ggG......',
        '......w...wwwwwgw.......ggw......g......',
        '......g...gwwwwwww...ww..ww.......w.....',
        '...........ggwwwGGwwwGgwwwG.......Gw....',
        '..GG.........ggggggggN.wwGN.......gw....',
        '...GGGG.............wwwwGN........GG....',
        '......wwww.....wwwwwGGGGN.........G.....',
        '......gggg...wwGGGGGNNNN...w.....GG.....',
        '.............gggggNN.......g............',
        '........................................',
        '........................................',
        '........................................',
      ],
      [
        '........................................',
        '........................................',
        '....................wwwwwGGG............',
        '..............ww...wwgggg...............',
        '.............www...gg...................',
        '............wwwg.........w..............',
        '...........wwwg...wwwwwwwwww............',
        '...........wwg....wwwwwwwwwwww..........',
        '...........wg...wwwggggggggwGwww........',
        '...........ww...wgg...ww...ggGGww.......',
        '...........www..w.....gGww...ggGw.......',
        '..G....w...gwwwwg......ggw.....gw.......',
        '..GG...g....gwww....ww..ww......G.......',
        '...Gww.......ggwwwwwwg.wwG......g.......',
        '....gwww.......gggggwwwwGN......ww......',
        '.....ggw...wwwwwwwwwwGGGN.......wg......',
        '.......g...GGGGGGGGGGNNN..w....wG.......',
        '...........gggggggNNN.....g....wg.......',
        '..............................GG........',
        '........................................',
        '........................................',
        '........................................',
      ],
      [
        '........................................',
        '........................................',
        '........................................',
        '................www...wwwwwwwwG.........',
        '..............wwwww...gggggggg....GG....',
        '.............wwwwgg................GG...',
        '..G.........wwwgg...wwwwww..............',
        '..G.........wwg.....wwwwwwww............',
        '............wg...wwwwgggwwwwww..........',
        '...G........ww..wwggg.wwggggGww.........',
        '...w........www.wg....gGw...gGww........',
        '...ww....w..gww.g......gw....gGw........',
        '...gwww..g...gwww..ww..ww.....Nw........',
        '....ggw..ww...ggwwwwgwwwG......G........',
        '......g..wwwwwwwwwwwwwGGN......g........',
        '.........gwGGGGGGGGGGGNN.w....w.........',
        '..........ggggggggNNNN...g...wG.........',
        '............................wGg.........',
        '...........................wGg..........',
        '..........................Ggg...........',
        '......................G.................',
        '....................GG..................',
      ],
      [
        '........................................',
        '........................................',
        '........................................',
        '......GG............www.................',
        '.....GG.........wwwwwww..wwwwww.........',
        '.....G.........wwwwwggg..gggggwww.......',
        '..............wwwggg....w.....ggg.......',
        '.............wwwg.....wwwww.........GG..',
        '....ww.......wwg..wwwwwwwwwww........GGG',
        '....gw.......wg..wwgggggggGGww..........',
        '.....ww......ww..gg....w..ggGw..........',
        '.....gw...w..www.......ww...gw..........',
        '......g.www..ggwwwww..wwG....w..........',
        '........wwwwww.ggggwwwwGN....w..........',
        '........ggwwwwwwwwwwGGGN.....w..........',
        '..........gggGGGGGGGNNN.w....G..........',
        '.............gggggNN....g..wwg..........',
        '..........................wGg...........',
        '.......................wwwgg............',
        '......................wGgg..............',
        '.............GGGGGG...gg................',
        '........................................',
      ],
      [
        '........................................',
        '...........GG...........................',
        '..........GG............................',
        '........GGG.............................',
        '........G..........wwwwwwwwww...........',
        '................wwwwwwwwwwwwww..........',
        '.......w.......wwwwwgggggggggwwww.......',
        '......ww......wwwggg...ww....gggGw......',
        '......ww......wwg..wwwwwwww.....gg......',
        '......ww......wg..wwggggwGww........GG..',
        '......gww.....w...gg....ggGww........GG.',
        '.......wwww.w.www......w..gGw.........GG',
        '.......gwwwww.ggww.....w...Nw..........G',
        '........ggwwwwwwwwwwwwwG...ww...........',
        '..........ggwGGGGGGGGGgNw.wwG...........',
        '............ggggggNNNN..gwwGN...........',
        '........................wwGN............',
        '.......................wGGN.............',
        '...................wwwwGgg..............',
        '.......GGGGGGGG....Ggggg................',
        '...................g....................',
        '........................................',
      ],
    ],
  },
};

// What of them stops the hero (forest.js generate): squat ellipses as the trees' trunks, [dx, dy,
// half width] from the prop's foot, as art/landmarks.js LANDMARK_SOLIDS. The horde walks through. A
// name not drawn stands in as its fallback, solid all the same; the doors are held by the crypt's own
// walls (forest.js CRYPT_BOX), and the spires stand where the hero can't go.
export const TERRAIN_SOLIDS = {
  ice_rock1: [[0, -1, 6]],
  ice_rock2: [[0, -1, 8]],
  ice_rock3: [[0, -1, 4.5]],
  sand_ribcage: [[-15, -1, 4], [15, -1, 4]],
  sand_skull: [[0, -2, 7]],
  hell_post_wood: [[0, -1, 2.5]],
  hell_post_bone: [[0, -1, 2.5]],
  hell_post_stone: [[0, -1, 3]],
};
