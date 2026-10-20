// The five wayside shrines, an altar each from Dungeon Crawl Stone Soup's (CC0); baked by
// tools/bake-art.mjs into public/assets/art/shrines.js, drawn by Game.drawShrine (js/art/props.js).
// Fury burns (Makhleb's flame), Fortune shines (Gozag's gold), Haste flickers (Vehumet's cyan
// glyph); Protection (Zin) and Wisdom (Sif Muna) stand still. Never dithmenos*: no known licence.
const ALTARS = 'dcss-crawl-tiles-cc0/dngn/altars/';
const altar = (...names) => ({ files: names.map((n) => `${ALTARS}${n}.png`), trim: true });
const range = (stem, a, b) => Array.from({ length: b - a + 1 }, (_, i) => `${stem}${a + i}`);

export default {
  credits: [
    {
      pack: 'dcss-crawl-tiles-cc0',
      title: 'Dungeon Crawl 32x32 tiles',
      what: 'Shrine altars (fury, haste, fortune, wisdom, protection)',
      source: 'dngn/altars: makhleb_flame1-8, vehumet1-2, gozag0-2, sif_muna, zin',
      author: 'Dungeon Crawl Stone Soup artists',
      link: 'https://opengameart.org/content/dungeon-crawl-32x32-tiles',
      licence: 'CC0',
    },
  ],
  sprites: {
    shrine_fury: { ...altar(...range('makhleb_flame', 1, 8)), meta: { fps: 10 } },
    shrine_haste: { ...altar('vehumet1', 'vehumet2'), meta: { fps: 3 } },
    shrine_fortune: { ...altar('gozag0', 'gozag1', 'gozag2'), meta: { fps: 4 } },
    shrine_wisdom: altar('sif_muna'),
    shrine_protection: altar('zin'),
  },
};
