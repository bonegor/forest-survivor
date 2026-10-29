import knight from '../../assets/heroes-v3/knight.js';
import archer from '../../assets/heroes-v3/archer.js';
import mage from '../../assets/heroes-v3/mage.js';
import rogue from '../../assets/heroes-v3/rogue.js';
import necromancer from '../../assets/heroes-v3/necromancer.js';
import paladin from '../../assets/heroes-v3/paladin.js';
import druid from '../../assets/heroes-v3/druid.js';
import berserker from '../../assets/heroes-v3/berserker.js';
import witchhunter from '../../assets/heroes-v3/witchhunter.js';
import { sheet, pose } from './hero-sheets.js';

// Independently drawn native frames, not palette overrides. Each menu pose is
// cropped from its own idle cycle so selection and gameplay show the same model.
export const HERO_V3_ART = {};
for (const [id, data] of Object.entries({ knight, archer, mage, rogue, necromancer, paladin, druid, berserker, witchhunter })) {
  const def = sheet(data);
  HERO_V3_ART[id + '_v3'] = def;
  HERO_V3_ART[id + '_v3_pose'] = pose(def);
}
