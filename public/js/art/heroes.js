// The approved sheet roster plus the authored copper merchant and matching pose.
import { APPROVED_HERO_ART } from './approved-heroes.js';
import { casterFall } from './caster-falls.js';
import { EANASIR_HERO_ART } from './eanasir.js';
import { KNIGHT_FALL } from './knight-fall.js';
import { paladinFall, witchHunterFall } from './martial-falls.js';
import { ylvaFall } from './ylva-fall.js';
import { rangerFall } from './ranger-fall.js';
import { shadowFall } from './shadow-fall.js';
import { RECRUITS } from '../expansion/roster.js';
import { recruitFall } from './recruit-falls.js';
import { HOODED_TRAIL_ART, HOODED_TRAIL_POSE } from './trail-hood.js';

export const HERO_ART = {
  ...APPROVED_HERO_ART,
  ...EANASIR_HERO_ART,
  knight: { ...APPROVED_HERO_ART.knight, fall: KNIGHT_FALL },
  archer: { ...APPROVED_HERO_ART.archer, fall: rangerFall(APPROVED_HERO_ART.archer) },
  mage: { ...APPROVED_HERO_ART.mage, fall: casterFall('mage', APPROVED_HERO_ART.mage) },
  rogue: { ...APPROVED_HERO_ART.rogue, fall: shadowFall(APPROVED_HERO_ART.rogue) },
  necromancer: { ...APPROVED_HERO_ART.necromancer, fall: casterFall('necromancer', APPROVED_HERO_ART.necromancer) },
  paladin: { ...APPROVED_HERO_ART.paladin, fall: paladinFall(APPROVED_HERO_ART.paladin) },
  druid: { ...APPROVED_HERO_ART.druid, fall: casterFall('druid', APPROVED_HERO_ART.druid) },
  berserker: { ...APPROVED_HERO_ART.berserker, fall: ylvaFall },
  witchhunter: { ...APPROVED_HERO_ART.witchhunter, fall: witchHunterFall(APPROVED_HERO_ART.witchhunter) },
  ...Object.fromEntries(RECRUITS.map(({ id }) => {
    const living = id === 'trailblazer' ? HOODED_TRAIL_ART : APPROVED_HERO_ART[id];
    return [id, { ...living, fall: recruitFall(id, living) }];
  })),
  trailblazer_pose: HOODED_TRAIL_POSE,
};
