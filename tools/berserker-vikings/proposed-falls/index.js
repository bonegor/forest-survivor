import { APPROVED_HERO_ART as art } from '../../../public/js/art/approved-heroes.js';
import { casterFall } from './caster-falls.js';
import { paladinFall, witchHunterFall } from './martial-falls.js';
import { rangerFall } from './ranger-fall.js';
import { shadowFall } from './shadow-fall.js';

export const proposedFalls = {
  archer: rangerFall(art.archer),
  mage: casterFall('mage', art.mage),
  rogue: shadowFall(art.rogue),
  necromancer: casterFall('necromancer', art.necromancer),
  paladin: paladinFall(art.paladin),
  druid: casterFall('druid', art.druid),
  witchhunter: witchHunterFall(art.witchhunter),
};
