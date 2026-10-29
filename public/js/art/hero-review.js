import archerA from '../../assets/heroes-v4/archer-a.js';
import archerB from '../../assets/heroes-v4/archer-b.js';
import mageA from '../../assets/heroes-v4/mage-a.js';
import mageB from '../../assets/heroes-v4/mage-b.js';
import rogueA from '../../assets/heroes-v4/rogue-a.js';
import rogueB from '../../assets/heroes-v4/rogue-b.js';
import necromancerA from '../../assets/heroes-v4/necromancer-a.js';
import necromancerB from '../../assets/heroes-v4/necromancer-b.js';
import paladinA from '../../assets/heroes-v4/paladin-a.js';
import paladinB from '../../assets/heroes-v4/paladin-b.js';
import druidA from '../../assets/heroes-v4/druid-a.js';
import druidB from '../../assets/heroes-v4/druid-b.js';
import berserkerA from '../../assets/heroes-v4/berserker-a.js';
import berserkerB from '../../assets/heroes-v4/berserker-b.js';
import witchhunterA from '../../assets/heroes-v4/witchhunter-a.js';
import witchhunterB from '../../assets/heroes-v4/witchhunter-b.js';
import { sheet, pose } from './hero-sheets.js';

export const HERO_REVIEW_ART = {};
for (const [id, versions] of Object.entries({ archer: [archerA, archerB], mage: [mageA, mageB],
  rogue: [rogueA, rogueB], necromancer: [necromancerA, necromancerB], paladin: [paladinA, paladinB],
  druid: [druidA, druidB], berserker: [berserkerA, berserkerB], witchhunter: [witchhunterA, witchhunterB] })) {
  versions.forEach((data, i) => {
    const key = `${id}_v4${i ? 'b' : 'a'}`, def = sheet(data);
    HERO_REVIEW_ART[key] = def;
    HERO_REVIEW_ART[key + '_pose'] = pose(def);
  });
}
