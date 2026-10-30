// Progression: what a new player starts without, and what opens it. Shared by the Node server
// (through shared/profile.js, which keeps and enforces it) and the browser.
//
// The owner's (21 October 2026): "we have to work a little bit on progression... make everything
// as progression based as possible... lock as much as possible initially and progress through the
// game... the player doesn't start with 6 but starts with fewer, and additionally also weapon
// types, so that the player is not able to just choose anything he likes but has to unlock them
// somehow". Their choices: slots and power are bought with gold in the Armory (Arsenal, Reliquary,
// Insight, Exile: shared/profile.js UPGRADES); weapons, relics and ultimates open by milestones;
// a new player starts with three weapon slots.
//
// Progression thresholds are here; population weights come from the shared spawning rules:
// shared/profile.js reads it (applyRun, sanitizeProfile, metaBonuses, openFor, progressList).

import { KILL_CREDIT, NIGHTMARE_MORE } from './population.js';

export const PROGRESS = {
  // Slots a new player has; each rank of the Armory's Arsenal or Reliquary adds one, to the
  // game's six (data/weapons.js MAX_WEAPONS, MAX_RELICS).
  weaponSlots: 3,
  relicSlots: 3,
  // Level-up rerolls and banishes a run starts with before the Armory's Insight and Exile (two of
  // each until 21 October 2026).
  rerolls: 0,
  banishes: 0,
  // Gold a run pays for every second on the clock, on top of the gold picked up, times the
  // difficulty's rate (runReward).
  wage: 0.5,
  // The first rank of every Armory upgrade costs this share of its price (upgradeCost).
  firstRank: 0.5,
  // A hero's ultimate opens once a run with him lasts this long on the clock (any mode).
  ultTime: 2 * 60,
  // Each weapon exclusion slot opens at its own total of kills counted as Veteran's (effort, below),
  // five at most (the review of 27 October 2026: a slot at every doubling from 10 gave seven after
  // one run, then asked 327,680 kills for the sixteenth).
  exclusionAt: [10, 500, 3000, 10000, 30000],
  // Nominal kill-credit bounds, derived from the spawning rules. Normal's live credit also
  // follows the soft cap (population.js killCredit), including its tripled steady rate.
  effort: KILL_CREDIT,
  nightmareEffort: 1 / NIGHTMARE_MORE,
  // Open from the first run; every hero's signature weapon(s) always are too (data/heroes.js unique).
  // The owner's (22 October 2026): five to start with, the hero's own among them (the boomerang and
  // the spikes too), Frost Nova a run away (1:00), Consecration after ten falls, then the ladder;
  // the second circle after it.
  openWeapons: ['axe', 'blades', 'glaive', 'caltrops'],
  openRelics: ['might', 'armor', 'vitality', 'regen', 'magnet', 'movespeed'],
  // The rest, each opened for the whole account by a milestone. `need` is what is measured:
  //   time:   seconds on the clock in one run (any mode)
  //   kills:  foes slain over all runs together, counted as Veteran's (effort)
  //   level:  the level reached in one run
  //   gold:   gold picked up in one run (as the run reports it, before the difficulty's rate)
  //   bosses: bosses (and crypt lords) slain in one run (Game.stats.bosses)
  //   wins:   nights won (Survival victories), on any difficulty
  //   deaths: runs that ended with the hero fallen (not quit, not won), over all runs together
  //   veteran: nights won on Elite (the old Veteran, 'hard'; the key kept from then)
  //   dungeon: Dungeon Runs won, on any difficulty
  //   heroes:  heroes who have won a night
  //   evolution: 1 once a run has evolved the weapon `of` (an evolution's id) with any hero; `what` names it
  //   evolve: 1 once `hero` has evolved his signature weapon in a run (FEAT.evolved); `what` names it
  // `buy`: once its milestone is reached it is for sale in the Armory (shared/profile.js UPGRADES,
  // by its id), and open only once bought.
// `deep`: the second circle, the weapons of 22 October 2026: hidden in the Codex and shut until a
// night is won, whatever the records say; then each opens by its own deed.
  // Its place in this list is its bit in the save (profile.ul): add new ones at the end only, and
  // leave one no longer locked in its place as { retired: id }, a bit that opens nothing.
  // The kills and the levels spread out (the review of 27 October 2026: an eight-minute Veteran
  // fall, some 9,000 kills and level 42, opened 17 of the 24 locks of the first circle at once):
  // the kills, counted alike on every difficulty (effort), at 1,000, 4,000, 8,000, 15,000 and
  // 25,000, so a run of some minutes opens one or two of them and the next runs the rest; the
  // levels from 10, so the first come with Normal's smaller horde too, to 45, which a long Veteran
  // run leaves for a later one. Not yet measured in play. A milestone retuned higher stays open
  // for a save that passed it (its bit is kept: shared/profile.js sanitizeProfile).
  locks: [
    { type: 'weapon', id: 'frost', need: 'time', at: 60 },
    { type: 'weapon', id: 'lightning', need: 'kills', at: 1000 },
    { type: 'weapon', id: 'flask', need: 'level', at: 10 },
    { retired: 'glaive' }, // open from the start since 22 October 2026
    { type: 'weapon', id: 'thorns', need: 'kills', at: 15000 },
    { type: 'weapon', id: 'wisps', need: 'level', at: 30 },
    { type: 'weapon', id: 'arcane', need: 'bosses', at: 1 },
    { retired: 'caltrops' }, // open from the start since 22 October 2026
    { type: 'relic', id: 'cooldown', need: 'time', at: 4 * 60 },
    { type: 'relic', id: 'area', need: 'level', at: 15 },
    { type: 'relic', id: 'projspeed', need: 'kills', at: 4000 },
    { type: 'relic', id: 'duration', need: 'time', at: 8 * 60 },
    { type: 'relic', id: 'luck', need: 'gold', at: 500 },
    { type: 'relic', id: 'amount', need: 'bosses', at: 2 },
    { type: 'relic', id: 'growth', need: 'level', at: 45 },
    // The owner's (22 October 2026): bought, once the Knight has evolved his Longsword; then for all.
    { type: 'relic', id: 'phoenix', need: 'evolve', hero: 'knight', what: "the Knight's Longsword", at: 1, buy: true },
    { retired: 'aura' }, // 100 foes slain until it was open from the start, the same day
    { type: 'weapon', id: 'gale', need: 'wins', at: 1, deep: true },
    { type: 'weapon', id: 'lantern', need: 'time', at: 12 * 60, deep: true },
    { type: 'weapon', id: 'bell', need: 'bosses', at: 3, deep: true },
    { type: 'weapon', id: 'hook', need: 'kills', at: 60000, deep: true },
    { type: 'weapon', id: 'starfall', need: 'gold', at: 1500, deep: true },
    { type: 'weapon', id: 'runestone', need: 'veteran', at: 1, deep: true },
    { type: 'weapon', id: 'leech', need: 'level', at: 55, deep: true },
    { type: 'weapon', id: 'hollow', need: 'dungeon', at: 1, deep: true },
    { type: 'weapon', id: 'spores', need: 'wins', at: 3, deep: true },
    { type: 'weapon', id: 'scythe', need: 'kills', at: 120000, deep: true },
    { type: 'weapon', id: 'hex', need: 'heroes', at: 3, deep: true },
    // The owner's (22 October 2026): Chain Lightning, sparking from the hero, once Lightning Strike
    // has evolved; and the relics of that day.
    { type: 'weapon', id: 'chain', need: 'evolution', of: 'thunderstorm', what: 'Lightning Strike', at: 1 },
    { type: 'relic', id: 'ramhorn', need: 'time', at: 5 * 60 },
    { type: 'relic', id: 'thornmail', need: 'kills', at: 8000 },
    { type: 'relic', id: 'torc', need: 'time', at: 7 * 60 },
    { type: 'relic', id: 'rime', need: 'gold', at: 800 },
    { type: 'relic', id: 'cloak', need: 'level', at: 22 },
    { type: 'relic', id: 'hunter', need: 'bosses', at: 4 },
    { type: 'relic', id: 'fang', need: 'level', at: 38 },
    { type: 'relic', id: 'ember', need: 'kills', at: 25000 },
    // "consecration should be tied to 10 deaths of the hero" (22 October 2026).
    { type: 'weapon', id: 'aura', need: 'deaths', at: 10 },
  ],
  // Every evolution, in the order the save keeps them (profile.ek: bit i is evolutions[i]). The
  // owner's (27 October 2026): a weapon's relic is not told until a run before has made its
  // evolution (shared/profile.js knownEvos). Add new ones at the end only (test/progress.test.js
  // holds it to data/weapons.js).
  evolutions: ['excalibur', 'whirlwind', 'aegis', 'sanctuary', 'stormstring', 'lodestar', 'briarheart', 'faelights', 'meteor', 'thunderstorm', 'stormlash',
    'frozenheart', 'prismatic', 'shadowstrike', 'hellfire', 'razorfield', 'tether', 'fairyring', 'doom', 'tempest', 'kraken', 'abyss', 'knell', 'beacon',
    'runestorm', 'harvest', 'comet', 'legion', 'pestilence', 'judgement', 'worldroot', 'bloodstorm', 'purifier'],
  // The Survival maps (data/maps.js), the owner's (28 October 2026): "the first one where we start
  // is the desert map. From there on, we progress to the frozen map. From there on, we progress to
  // our current forest map. And from there on, we progress to the demonic map", harder in that
  // order, and a bright flower meadow besides, which they didn't place: it comes between the frozen
  // map and the forest, the bright maps before the dark ones. `maps` is the order the save keeps
  // them in (profile mo, mw: bit i is maps[i]): add new ones at the end only. `mapLadder` is the
  // order they open in: the first is open from the start, and a night won on one opens the next.
  maps: ['forest', 'desert', 'frozen', 'meadow', 'hell'],
  mapLadder: ['desert', 'frozen', 'meadow', 'forest', 'hell'],
};

const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const thousands = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// What a lock asks, in words: 'Survive 3:00 in a run'.
export function needText(lock) {
  const n = lock.at;
  switch (lock.need) {
    case 'time': return `Survive ${clock(n)} in one run`;
    // Counted as Veteran's (effort), so it says so (27 October 2026: "in total" read as every kill
    // alike, when on Normal an eighth as many will do and on Elite twice as many are asked).
    case 'kills': return `Slay ${thousands(n)} monsters, counted as on Veteran`;
    case 'level': return `Reach level ${n}`;
    case 'gold': return `Pick up ${thousands(n)} gold in a run`;
    case 'bosses': return n === 1 ? 'Slay 1 boss' : `Slay ${n} bosses in one run`;
    case 'wins': return n === 1 ? 'Win a night' : `Win ${n} nights`;
    case 'evolve':
    case 'evolution': return `Evolve ${lock.what}`;
    case 'veteran': return n === 1 ? 'Win a night on Elite' : `Win ${n} nights on Elite`;
    case 'dungeon': return n === 1 ? 'Win a Dungeon Run' : `Win ${n} Dungeon Runs`;
    case 'heroes': return `Win a night with ${n} heroes`;
    case 'deaths': return n === 1 ? 'Fall once' : `Fall ${n} times`;
    default: return '';
  }
}
