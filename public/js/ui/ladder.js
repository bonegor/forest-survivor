// Wording for the unlock ladder: what to do next, why something is locked,
// and what a finished run just opened up. The rules themselves live in
// shared/profile.js.

import { HEROES } from '../data/heroes.js';
import { HERO_ORDER, FEAT, hasFeat, modeUnlocked } from '../shared/profile.js';

const title = (id) => `the ${HEROES[id].title}`;
const prevHero = (id) => HERO_ORDER[HERO_ORDER.indexOf(id) - 1];

// One line describing the player's next goal (see nextGoal()).
export function goalText(goal) {
  if (!goal) return 'Every trial is open. Climb the Ranked ladder!';
  switch (goal.type) {
    case 'buy':
      return `${cap(title(goal.hero))} can now be unlocked for ${goal.cost} gold`;
    case 'survivalHard':
      return goal.unlocks === 'dungeon'
        ? `Survive 15 minutes on Hard with ${title(goal.hero)} to open the Dungeon`
        : `Survive 15 minutes on Hard with ${title(goal.hero)} to unlock ${title(goal.unlocks)}`;
    case 'dungeon':
      return `Beat the Dungeon with ${title(goal.hero)} to bring ${title(goal.unlocks)} into it`;
    case 'dungeonHard':
      return `Beat the Dungeon on Hard with ${title(goal.hero)} to unlock Ranked`;
    default:
      return '';
  }
}

// Why a hero can't enter a mode yet (short enough for a mode card).
export function lockReason(p, mode, hero) {
  if (mode === 'dungeon') {
    if (!modeUnlocked(p, 'dungeon')) return 'Survive on Hard with the Necromancer';
    return `Beat the Dungeon with ${title(prevHero(hero))}`;
  }
  if (mode === 'ranked') return 'Beat the Dungeon on Hard with the Necromancer';
  return '';
}

// Announcements for keys returned in reward.unlocks.
export function unlockText(key) {
  const [kind, id] = key.split(':');
  if (kind === 'buy') return `${cap(title(id))} can now be unlocked!`;
  if (kind === 'dungeon') return `${cap(title(id))} may now enter the Dungeon!`;
  if (key === 'mode:dungeon') return 'The Dungeon is open, starting with the Knight!';
  if (key === 'mode:ranked') return 'Ranked unlocked: the endless night awaits!';
  return '';
}

// Achievement stars for a hero: [label, colour, earned].
export function featStars(p, hero) {
  return [
    ['Hard night', '#fee761', hasFeat(p, hero, FEAT.survivalHard)],
    ['Dungeon', '#9ee562', hasFeat(p, hero, FEAT.dungeon)],
    ['Dungeon on Hard', '#f6757a', hasFeat(p, hero, FEAT.dungeonHard)],
  ];
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
