// Hero sprites, facing right. Light comes from the top-left.

import { portrait } from './portraits.js';
import { KNIGHT_PLUMED } from './knight-plumed.js';
import { RANGER_VERDANT } from './ranger-verdant.js';
import { MAGE_SHEET, MAGE_POSE, NECROMANCER_SHEET, NECROMANCER_POSE, ROGUE_SHEET, ROGUE_POSE } from './hero-sheets.js';
import { KNIGHT_PORTRAIT_V2 } from './knight-portrait-v2.js';

export const HERO_ART = {
  // Mattz Art's plumed knight, selected from the free online sprite packs.
  knight: KNIGHT_PLUMED,

  // The selection portrait uses the menu's pixel grid. The campfire keeps
  // its separate scene figure.
  knight_pose: KNIGHT_PORTRAIT_V2,
  knight_camp: { gen: () => [portrait('knight', 'camp')], hires: 2, picture: 'img/knight-figure.png' },

  // Lyra shares the plumed knight's native scale and animated equipment.
  archer: RANGER_VERDANT,

  // Menu poses, like the knight's: the hero panel shows the ranger's picture
  // (tools/portraits/archer-scene.png), the campfire the painted ranger cut out
  // (tools/portraits/archer.png).
  archer_pose: { gen: () => [portrait('archer', 'scene')], hires: 3, small: 'archer_camp' },
  archer_camp: { gen: () => [portrait('archer', 'camp')], hires: 2, picture: 'img/archer-figure.png' },

  // Eldrin, Morvath and Kael as picked in the Sprite Lab (hero-sheets.js): the Sorcerer and the
  // Necromancer remastered (Remaster V3), the Shadow as the Eclipse Wraith (tweak 1). Their menu
  // poses are their idle loops.
  mage: MAGE_SHEET,
  mage_pose: MAGE_POSE,
  necromancer: NECROMANCER_SHEET,
  necromancer_pose: NECROMANCER_POSE,
  rogue: ROGUE_SHEET,
  rogue_pose: ROGUE_POSE,
};
