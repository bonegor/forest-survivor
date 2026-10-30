// Population rules shared by spawning and kill progression. No profile, rendering or browser
// dependencies: the server can validate reports without importing the game.
import { HORDE_RATE, hordeRate, minuteOf } from '../data/waves.js';

const MORE = 1.1 * 1.1 * 1.2;
export const CROWD = 4;
export const VETERAN_CROWD = 2 / 3;
export const ELITE_CROWD = 2 * VETERAN_CROWD;
export const NIGHTMARE_MORE = 3;
export const PER_MINUTE = 0.05;
export const minuteMore = phase => 1 + PER_MINUTE * minuteOf(phase);
export const lateMore = (diff, phase) => diff.late && minuteOf(phase) >= diff.late.from ? diff.late.more : 1;

const eliteSpawn = 1.15 * MORE * CROWD * ELITE_CROWD;
const eliteHorde = MORE * CROWD * ELITE_CROWD;
const veteranShare = VETERAN_CROWD / ELITE_CROWD;
const late = { from: 9, more: 1.3 };
export const POPULATION = {
  hard: { spawn: eliteSpawn, horde: eliteHorde, late: null, steadyMore: 1 },
  medium: { spawn: eliteSpawn * veteranShare, horde: eliteHorde * veteranShare, late, steadyMore: 1 },
  easy: { spawn: eliteSpawn * veteranShare * 0.125, horde: eliteHorde * veteranShare * 0.125, late, steadyMore: 3, headStart: 0 },
};

// Before the run's map, skulls and Nightmare multiply it. Those multipliers come after the
// soft cap, so map/skull factors cancel when comparing the same encounter on two difficulties.
export function steadyRate(phase, diff, mode = 's15') {
  const grow = minuteMore(phase), knee = HORDE_RATE.knee * grow;
  const requested = hordeRate(phase) * diff.spawn * (mode === 'dungeon' ? 0.9 : 1) * grow * lateMore(diff, phase);
  return requested / (1 + requested / knee) * (diff.steadyMore ?? 1);
}

// The nominal ratios remain the bounds for report validation. Normal's actual weight shrinks
// with the soft cap; each kill earns its weight at that moment, never revaluing past kills.
export const KILL_CREDIT = Object.fromEntries(Object.entries(POPULATION).map(([id, d]) =>
  [id, POPULATION.medium.spawn / (d.spawn * d.steadyMore)]));

export function killCredit(phase, diff, nightmare = false, mode = 's15') {
  const weight = diff === 'easy'
    ? steadyRate(phase, POPULATION.medium, mode) / steadyRate(phase, POPULATION.easy, mode)
    : KILL_CREDIT[diff];
  return weight / (nightmare ? NIGHTMARE_MORE : 1);
}
