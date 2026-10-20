// The Darkwood's landmarks: gothic props for the gallows clearing, the sword's glade, the
// graveyards and the stone circle, a cursed tree or two, and the circle's monument.
// Baked by tools/bake-art.mjs into public/assets/art/landmarks.js (js/art/landmarks.js uses it).
const GOTHIC = 'ettingrinder-dark-fantasy-scenery/gothic-props.png';
const GV = 'ansimuz-gothicvania-cemetery/PNG/Environment/sliced-objects';
const TRF = 'ansimuz-tiny-rpg-forest/PNG/environment/sliced-objects';
const cut = (x, y, w, h) => ({ file: GOTHIC, rects: [[x, y, w, h]], trim: true });

// The Gothicvania trees are drawn near black for a side-on night sky: lifted a step or two, into
// the warm browns and violets of the game's palette, so they read on the cursed woods' dark ground.
const SKULLTREE = {
  '#000022': '#181425',
  '#241230': '#4a3040',
  '#47222d': '#6e4240',
  '#5f2e25': '#8c5440',
  '#3b2769': '#7a4a8c',
  '#783a2f': '#a86848',
  '#9b5e42': '#cc8e60',
};

export default {
  credits: [
    { pack: 'ettingrinder-dark-fantasy-scenery', what: 'Landmark props: gibbet cage, noose, chain, candelabra, pikes, skulls on posts, candles, sword in the stone, gargoyles, rock pile', source: 'gothic-props.png', author: 'ETTiNGRiNDER', link: 'https://opengameart.org/content/misc-dark-fantasy-scenery-sprites', licence: 'CC0', title: 'Misc. Dark Fantasy Scenery Sprites' },
    { pack: 'ansimuz-gothicvania-cemetery', what: 'Cursed trees by the graveyards', source: 'PNG/Environment/sliced-objects/tree-1.png, tree-3.png', author: 'Luis Zuno (ansimuz)', link: 'https://opengameart.org/content/gothicvania-cemetery-pack', licence: 'CC0', title: 'Gothicvania Cemetery Pack' },
    { pack: 'ansimuz-tiny-rpg-forest', what: 'The stone circle\'s monument (recoloured grey) and a dried tree', source: 'PNG/environment/sliced-objects/rock-monument.png, tree-dried.png', author: 'Luis Zuno (ansimuz)', link: 'https://ansimuz.itch.io/tiny-rpg-forest', licence: 'CC0', title: 'Tiny RPG – Forest' },
  ],
  sprites: {
    lm_cage: cut(44, 30, 32, 55), // the cage on a short end of its chain
    lm_noose: cut(107, 20, 7, 28), // on a shorter rope
    lm_chain2: cut(78, 12, 6, 27),
    lm_candelabra: cut(6, 17, 17, 52),
    lm_pike: cut(121, 5, 5, 46),
    lm_pikeblood: cut(132, 5, 5, 46),
    lm_pikehead: cut(141, 5, 11, 46),
    lm_skullpost: cut(26, 90, 10, 18),
    lm_skullpost2: cut(52, 90, 10, 18),
    lm_candle: cut(63, 133, 7, 20),
    lm_candle2: cut(72, 132, 7, 21),
    lm_swordstone: cut(84, 88, 27, 38),
    lm_gargoyle: cut(118, 75, 39, 38),
    lm_gargoyle2: cut(119, 115, 39, 38),
    lm_rockpile: cut(85, 130, 27, 24),
    lm_blood: cut(7, 80, 15, 3),
    lm_skulltree: { files: [`${GV}/tree-3.png`], scale: 0.5, map: SKULLTREE, trim: true },
    lm_skulltree2: { files: [`${GV}/tree-1.png`], scale: 0.5, map: SKULLTREE, trim: true },
    lm_driedtree: { files: [`${TRF}/tree-dried.png`], scale: 0.5, trim: true },
    lm_monument: {
      files: [`${TRF}/rock-monument.png`],
      scale: 0.5,
      // magenta stone to the grey of the game's menhirs
      map: { '#451234': '#262b44', '#522d51': '#3a4466', '#71496d': '#5a6988', '#946888': '#8b9bb4', '#ad829e': '#c0cbdc' },
      trim: true,
    },
  },
};
