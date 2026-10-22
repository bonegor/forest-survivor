// Hero sprites, facing right. Light comes from the top-left.

import { KNIGHT_PLUMED } from './knight-plumed.js';
import { ARCHER_SHEET, ARCHER_POSE, MAGE_SHEET, MAGE_POSE, NECROMANCER_SHEET, NECROMANCER_POSE, ROGUE_SHEET, ROGUE_POSE,
  PALADIN_SHEET, PALADIN_POSE, DRUID_SHEET, DRUID_POSE, BERSERKER_SHEET, BERSERKER_POSE, WITCHHUNTER_SHEET, WITCHHUNTER_POSE, KNIGHT_B_SHEET, KNIGHT_B_POSE,
  KNIGHT_C_SHEET, KNIGHT_C_POSE, KNIGHT_D_SHEET, KNIGHT_D_POSE, KNIGHT_E_SHEET, KNIGHT_E_POSE, KNIGHT_F_SHEET, KNIGHT_F_POSE, KNIGHT_G_SHEET, KNIGHT_G_POSE } from './hero-sheets.js';
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

  // The Knight's second look, chosen on the hero screen (data/heroes.js skins).
  knight_b: KNIGHT_B_SHEET,
  knight_b_pose: KNIGHT_B_POSE,
  knight_c: KNIGHT_C_SHEET,
  knight_c_pose: KNIGHT_C_POSE,
  knight_d: KNIGHT_D_SHEET,
  knight_d_pose: KNIGHT_D_POSE,
  knight_e: KNIGHT_E_SHEET,
  knight_e_pose: KNIGHT_E_POSE,
  knight_f: KNIGHT_F_SHEET,
  knight_f_pose: KNIGHT_F_POSE,
  knight_g: KNIGHT_G_SHEET,
  knight_g_pose: KNIGHT_G_POSE,
};
