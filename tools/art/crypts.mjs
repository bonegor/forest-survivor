// The crypts' and Dungeon floors' dressing from three CC0 packs; baked by tools/bake-art.mjs into
// public/assets/art/crypts.js, drawn by js/game/dungeon.js:
//   - the Inferno's lava, its wall torches, lava lamps and standing flags (Lucifer Lava Dungeon);
//   - a lord's or a guardian's room: the red carpet under it, armour stands, an arched door and a
//     pool of blood (Lucifer Dungeon; props only, none of its floor);
//   - the Undercroft, the fourth look of a crypt: 0x72's floors, walls, wall tops, columns,
//     banners and fountains (16x16 DungeonTileset II).
const LAVA = 'foozle-lucifer-lava-tileset/Animated Tiles/Lava Dungeon/';
const LUCIFER = 'foozle-lucifer-dungeon-tileset/Png/DungeonTileset.png';
const X72 = '0x72-dungeontileset-ii/frames/';
const x72 = (...names) => ({ files: names.map((n) => `${X72}${n}.png`) });
const anim = (name, n) => Array.from({ length: n }, (_, i) => `${name}_anim_f${i}`);

// The lava's yellows into the game's orange (art/palette.js), its oranges and reds a step deeper: molten rock, not sunlight.
const MOLTEN = { '#ffc940': '#f77622', '#f7c23b': '#feae34', '#e59835': '#be4a2f', '#e56a25': '#a83a26', '#e54325': '#8a2a22' };

export default {
  credits: [
    {
      pack: 'foozle-lucifer-lava-tileset',
      title: 'Lucifer – Lava Dungeon Tileset',
      what: "The Inferno's lava, wall torches, lava lamps and standing flags",
      source: 'Animated Tiles/Lava Dungeon/Lava/Png/Lava.png, Deco/Png/Torch.png, Deco/Png/Lava lamp.png, Flags/Png/StandingFlag.png',
      author: 'Foozle (art by Baldur)',
      link: 'https://foozlecc.itch.io/lucifer-lava-dungeon-tileset',
      licence: 'CC0',
    },
    {
      pack: 'foozle-lucifer-dungeon-tileset',
      title: 'Lucifer – Dungeon Tileset',
      what: "A lord's room: its red carpet, armour stands, arched door and pool of blood",
      source: 'Png/DungeonTileset.png',
      author: 'Foozle (art by Baldur)',
      link: 'https://foozlecc.itch.io/lucifer-dungeon-tileset',
      licence: 'CC0',
    },
    {
      pack: '0x72-dungeontileset-ii',
      title: '16x16 DungeonTileset II',
      what: "The Undercroft's floors, walls, columns, banners and fountains",
      source: 'frames/floor_*.png, wall_*.png, column.png, wall_fountain_*.png',
      author: '0x72 (Robert Norenberg)',
      link: 'https://0x72.itch.io/dungeontileset-ii',
      licence: 'CC0',
    },
  ],
  sprites: {
    // ------------------------------------------------------------ the Inferno --
    // Ten frames of a 2x2-tile lava surface, a bubble rising and bursting in it.
    lava: { file: `${LAVA}Lava/Png/Lava.png`, frame: [32, 32], map: MOLTEN, meta: { fps: 6 } },
    lavaTorch: { file: `${LAVA}Deco/Png/Torch.png`, frame: [32, 32], trim: true, meta: { fps: 9 } },
    lavaLamp: { file: `${LAVA}Deco/Png/Lava lamp.png`, frame: [32, 32], map: MOLTEN, trim: true, meta: { fps: 5 } },
    lavaFlag: { file: `${LAVA}Flags/Png/StandingFlag.png`, frame: [32, 64], scale: 0.5, trim: true, meta: { fps: 8 } },

    // ------------------------------------------------------------ a lord's room --
    carpet: { file: LUCIFER, rects: [[237, 167, 70, 83]] },
    armourAxe: { file: LUCIFER, rects: [[417, 125, 23, 35]] },
    armourShield: { file: LUCIFER, rects: [[450, 125, 26, 35]] },
    door: { file: LUCIFER, rects: [[611, 9, 26, 57]], scale: 0.5, trim: true },
    // A strip of the blood pool's surface; dungeon.js cuts a pool's shape out of it.
    blood: { file: LUCIFER, rects: [[416, 199, 32, 57]] },

    // ------------------------------------------------------------ the Undercroft --
    ucFloor: x72('floor_1', 'floor_2', 'floor_3', 'floor_4', 'floor_5', 'floor_6', 'floor_7', 'floor_8'),
    // A wall's face: plain, broken, with a banner, with goo running down it.
    ucFace: x72('wall_mid', 'wall_hole_1', 'wall_hole_2', 'wall_banner_red', 'wall_banner_blue', 'wall_banner_green', 'wall_banner_yellow', 'wall_goo'),
    // The cap along a wall's top (its lowest rows), and the strips down a wall's sides.
    ucCap: x72('wall_top_mid'),
    ucSides: x72('wall_outer_mid_left', 'wall_outer_mid_right'),
    ucColumn: x72('column'),
    ucFountainTop: x72('wall_fountain_top_1'),
    ucFountainRed: x72(...anim('wall_fountain_mid_red', 3), ...anim('wall_fountain_basin_red', 3)),
    ucFountainBlue: x72(...anim('wall_fountain_mid_blue', 3), ...anim('wall_fountain_basin_blue', 3)),
    ucGooBase: x72('wall_goo_base'),
  },
};
