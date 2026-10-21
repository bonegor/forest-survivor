// A bot's test buff (tools/bots.mjs --buff, headless.mjs playGame): its names, each the Armory
// bonus (shared/profile.js metaBonuses) it multiplies, and what that does. Percent, on top of the Armory.
export const BUFFS = {
  damage: ['might', 'all damage dealt'],
  life: ['maxHp', 'maximum health'],
  regen: ['regenBoost', 'all regeneration (none if the hero has none yet)'],
  xp: ['growth', 'experience gained'],
  speed: ['speed', 'move speed'],
};
