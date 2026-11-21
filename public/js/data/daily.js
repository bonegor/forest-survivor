// The Daily Night (G5 of the 21 November 2026 gameplay review; the owner's "one by one, work them"):
// one Survival night a day, the same for everyone that day (by its date in UTC): its map, Veteran,
// two oaths (data/oaths.js) and its run seed, which lays out its weather, an Abyss's lava or void
// and its crypts (Game.seed). It is played with the hero last chosen, on a map open or not (a night
// on a map the save hasn't opened marks no map: shared/profile.js sanitizeRun). The first attempt a
// day is the one that counts (recordDaily), kept with the settings with how many days in a row
// have been played, and its result is a line to paste anywhere (dailyLine): no server needed.
import { MAP_LADDER } from './maps.js';
import { OATH_IDS, OATH_OF, heatOf } from './oaths.js';

// The day it is (UTC), as YYYY-MM-DD.
export const dailyKey = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

// A number for each day, and a run of them from it (FNV-1a, then a xorshift).
function dice(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619) >>> 0;
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>>= 0);
  };
}

// That day's night: { key, seed, map, diff, oaths }.
export function dailyNight(key) {
  const roll = dice('forest-survivor daily ' + key);
  const seed = roll() % 2 ** 31;
  const map = MAP_LADDER[roll() % MAP_LADDER.length].id;
  const ids = [...OATH_IDS], oaths = [];
  for (let i = 0; i < 2; i++) oaths.push(ids.splice(roll() % ids.length, 1)[0]);
  return { key, seed, map, diff: 'medium', oaths: OATH_IDS.filter((id) => oaths.includes(id)) };
}

// A night's date as the line says it: "21 Nov 2026".
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dailyDate = (key) => `${+key.slice(8, 10)} ${MONTHS[+key.slice(5, 7) - 1]} ${key.slice(0, 4)}`;
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// The line to paste: the day, the map, the oaths, the hero, and how far the night went.
export function dailyLine(r, mapName, heroName) {
  const how = r.victory ? 'DAWN' : `fell at ${clock(r.time)}`;
  return `Forest Survivor · Daily ${dailyDate(r.key)} · ${mapName} · Oaths ${heatOf(r.oaths || [])} · ${heroName} · ${how} · ${r.bosses} boss${r.bosses === 1 ? '' : 'es'} · ${r.kills} kills`;
}

// The oaths' names, for the Records' DAILY tab.
export const dailyOaths = (night) => night.oaths.map((id) => OATH_OF[id].name.replace('Oath of ', '')).join(' · ');

// A daily run has ended (res: Game.result, with its daily key): the first that day is kept as the
// day's, with the run of days played in a row; a later one is practice. Whether it counted.
export function recordDaily(settings, res) {
  if (!res.daily) return null;
  const was = settings.daily;
  if (was && was.key === res.daily) return { counted: false };
  const prev = new Date(Date.parse(res.daily + 'T00:00:00Z') - 864e5).toISOString().slice(0, 10);
  const streak = was && was.key === prev ? (was.streak || 1) + 1 : 1;
  settings.daily = { key: res.daily, hero: res.hero, map: res.map, oaths: res.oaths || [], victory: !!res.victory, time: Math.floor(res.time || 0), bosses: res.stats?.bosses ?? res.bosses ?? 0, kills: res.kills || 0, streak };
  return { counted: true, streak };
}
