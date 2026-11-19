// The approved sheet roster plus the authored copper merchant and matching pose.
import { APPROVED_HERO_ART } from './approved-heroes.js';
import { EANASIR_HERO_ART } from './eanasir.js';
import { KNIGHT_FALL } from './knight-fall.js';
import { rangerFall } from './ranger-fall.js';
import { HOODED_RANGER_ART, HOODED_RANGER_POSE } from './ranger-hood.js';

export const HERO_ART = {
  ...APPROVED_HERO_ART,
  ...EANASIR_HERO_ART,
  knight: { ...APPROVED_HERO_ART.knight, fall: KNIGHT_FALL },
  archer: { ...APPROVED_HERO_ART.archer, fall: rangerFall(APPROVED_HERO_ART.archer) },
  archer_hooded: { ...HOODED_RANGER_ART, fall: rangerFall(HOODED_RANGER_ART) },
  archer_hooded_pose: HOODED_RANGER_POSE,
};
