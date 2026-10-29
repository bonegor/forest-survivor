// Hero sprites, facing right. Light comes from the top-left.

import { KNIGHT_PLUMED } from './knight-plumed.js';
import { ARCHER_SHEET, ARCHER_POSE, MAGE_SHEET, MAGE_POSE, NECROMANCER_SHEET, NECROMANCER_POSE, ROGUE_SHEET, ROGUE_POSE,
  PALADIN_SHEET, PALADIN_POSE, DRUID_SHEET, DRUID_POSE, BERSERKER_SHEET, BERSERKER_POSE, WITCHHUNTER_SHEET, WITCHHUNTER_POSE } from './hero-sheets.js';
import { KNIGHT_PORTRAIT_V2 } from './knight-portrait-v2.js';
import { HERO_REVIEW_ART } from './hero-review.js';

export const HERO_ART = {
  // Mattz Art's plumed knight, selected from the free online sprite packs.
  knight: KNIGHT_PLUMED,

  // The selection portrait uses the menu's pixel grid. The campfire shows each hero from
  // their own sheet (background.js).
  knight_pose: KNIGHT_PORTRAIT_V2,

  // Retained originals, except Paladin and Berserker which use their unchanged V3.
  // Their menu poses are their own idle loops; two review alternatives follow below.
  archer: ARCHER_SHEET,
  archer_pose: ARCHER_POSE,
  mage: MAGE_SHEET,
  mage_pose: MAGE_POSE,
  necromancer: NECROMANCER_SHEET,
  necromancer_pose: NECROMANCER_POSE,
  rogue: ROGUE_SHEET,
  rogue_pose: ROGUE_POSE,
  paladin: PALADIN_SHEET,
  paladin_pose: PALADIN_POSE,
  druid: DRUID_SHEET,
  druid_pose: DRUID_POSE,
  berserker: BERSERKER_SHEET,
  berserker_pose: BERSERKER_POSE,
  witchhunter: WITCHHUNTER_SHEET,
  witchhunter_pose: WITCHHUNTER_POSE,
};

Object.assign(HERO_ART, HERO_REVIEW_ART);
