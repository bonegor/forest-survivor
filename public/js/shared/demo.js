// One edition boundary for the free browser and Windows demos. These are product limits,
// not copy protection: the full game keeps its ordinary progression when DEMO is false.
import { DEMO } from '../engine/build.js';

export const DEMO_HEROES = Object.freeze(['knight', 'archer', 'mage']);
export const DEMO_MAPS = Object.freeze(['desert']);
export const DEMO_MODES = Object.freeze(['s15']);
// Let each starter find the relic needed for their signature evolution in the first run.
// The Knight's Might relic is already in the normal starting pool.
export const DEMO_START_RELICS = Object.freeze(['cooldown', 'projspeed']);
export const demoHeroAllowed = (id) => !DEMO || DEMO_HEROES.includes(id);
export const demoMapAllowed = (id) => !DEMO || DEMO_MAPS.includes(id);
export const demoModeAllowed = (id) => !DEMO || DEMO_MODES.includes(id);

export function demoChoice(choice = {}) {
  if (!DEMO) return choice;
  return {
    ...choice,
    hero: demoHeroAllowed(choice.hero) ? choice.hero : DEMO_HEROES[0],
    mode: DEMO_MODES[0],
    map: DEMO_MAPS[0],
  };
}

export const DEMO_DETAILS = Object.freeze([
  'Play the Knight, Ranger and Sorcerer in the Sunscorch. Replay as often as you like.',
  'Explore optional crypts, fight their lords by hand, and keep the equipment you find. Spend earned gold on permanent upgrades.',
  'Evolve a weapon by learning all its ranks, carrying its matching relic, and opening a chest. Each demo hero can find their matching relic from the start.',
  'The full game adds more heroes, four more Survival lands, a three-floor Dungeon Run and endless personal challenges. It is still in development.',
]);
