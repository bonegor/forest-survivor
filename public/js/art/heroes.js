// Hero sprites, facing right. Light comes from the top-left.

import { KNIGHT_PLUMED } from './knight-plumed.js';
import { ARCHER_SHEET, ARCHER_POSE, MAGE_SHEET, MAGE_POSE, NECROMANCER_SHEET, NECROMANCER_POSE, ROGUE_SHEET, ROGUE_POSE,
  PALADIN_SHEET, PALADIN_POSE, DRUID_SHEET, DRUID_POSE, BERSERKER_SHEET, BERSERKER_POSE, WITCHHUNTER_SHEET, WITCHHUNTER_POSE } from './hero-sheets.js';
import { KNIGHT_PORTRAIT_V2 } from './knight-portrait-v2.js';

export const HERO_ART = {
  // Mattz Art's plumed knight, selected from the free online sprite packs.
  knight: KNIGHT_PLUMED,

  // The selection portrait uses the menu's pixel grid. The campfire shows each hero from
  // their own sheet (background.js).
  knight_pose: KNIGHT_PORTRAIT_V2,

  // Lyra as Silverleaf, picked on 15 October 2026 (hero-sheets.js): her menu pose is her idle
  // loop.
  archer: ARCHER_SHEET,
  archer_pose: ARCHER_POSE,

  // Eldrin, Morvath and Kael as picked in the Sprite Lab (hero-sheets.js): the Sorcerer and the
  // Necromancer remastered (Remaster V3), the Shadow as the Eclipse Wraith (tweak 1). Their menu
  // poses are their idle loops.
  mage: MAGE_SHEET,
  mage_pose: MAGE_POSE,
  necromancer: NECROMANCER_SHEET,
  necromancer_pose: NECROMANCER_POSE,
  rogue: ROGUE_SHEET,
  rogue_pose: ROGUE_POSE,

  // The four of 20 October 2026, drawn in the lab (src/newheroes-oct20); poses are idle loops.
  paladin: PALADIN_SHEET,
  paladin_pose: PALADIN_POSE,
  druid: DRUID_SHEET,
  druid_pose: DRUID_POSE,
  berserker: BERSERKER_SHEET,
  berserker_pose: BERSERKER_POSE,
  witchhunter: WITCHHUNTER_SHEET,
  witchhunter_pose: WITCHHUNTER_POSE,
};
