// The approved sheet roster plus the authored copper merchant and matching pose.
import { APPROVED_HERO_ART } from './approved-heroes.js';
import { EANASIR_HERO_ART } from './eanasir.js';
import { KNIGHT_FALL } from './knight-fall.js';
import { rangerFall } from './ranger-fall.js';
import { HOODED_TRAIL_ART, HOODED_TRAIL_POSE } from './trail-hood.js';

export const HERO_ART = {
  ...APPROVED_HERO_ART,
  ...EANASIR_HERO_ART,
  knight: { ...APPROVED_HERO_ART.knight, fall: KNIGHT_FALL },
  archer: { ...APPROVED_HERO_ART.archer, fall: rangerFall(APPROVED_HERO_ART.archer) },
  trailblazer: HOODED_TRAIL_ART,
  trailblazer_pose: HOODED_TRAIL_POSE,
};
