// The night's events announced. Every scripted swarm, ring and pack (data/waves.js
// EVENTS) is told WARN.lead real seconds before it comes: a short banner in its own words, a sting of
// its family, and an edge arrow from the side it will come from (a ring: a faint ring on the ground
// round the hero for its last WARN.ring s). Its side is rolled at the warning and kept for its coming;
// counts and timings are as before.
export const WARN = { lead: 2, ring: 1.5 };

const WORDS = {
  'swarm:bat': ['A swarm of bats!', 'from the {side}'],
  'swarm:imp': ['Imps from the {side}!', ''],
  'ring:skeleton': ['The dead rise around you!', ''],
  'ring:zombie': ['The dead rise around you!', ''],
  'ring:ghost': ['Ghosts close in around you!', ''],
  'ring:deathknight': ['Death knights surround you!', ''],
  'pack:wolf': ['Wolves on the hunt!', 'from the {side}'],
  'pack:goblin': ['A goblin raid!', 'from the {side}'],
  'pack:hellhound': ['Hellhounds on your trail!', 'from the {side}'],
  // Survival's last stand at 14:00 (data/waves.js LAST_STAND).
  'stand:all': ['The last stand!', 'Every horror of the night closes in'],
};
const SIDES = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];

// The side of the hero a point (dx, dy away; y down) lies on, as a compass word.
export function sideWord([dx, dy]) {
  const a = Math.atan2(dy, dx);
  return SIDES[(Math.round(a / (Math.PI / 4)) + 8) % 8];
}

// An event's banner: [title, sub], its side put in.
export function eventWords(ev, side = '') {
  const [t, s] = WORDS[`${ev.type}:${ev.enemy}`] || (ev.type === 'ring' ? ['You are being surrounded!', ''] : ev.type === 'swarm' ? ['A swarm is coming!', 'from the {side}'] : ['A pack on the hunt!', 'from the {side}']);
  const put = (x) => x.replace('{side}', side || 'dark');
  return [put(t), put(s)];
}

// The records a run can break as it goes (Game.checkRecords): the profile's, as they stood when it began.
export const RECORDS = { kills: 'KILLS', level: 'LEVEL', time: 'TIME' };
export const RECORD_GRACE = 60; // never in the first minute
// A lock of the Codex reached mid-run (Game.checkLocks): what it is, over "yours when this run
// ends", and how many real seconds apart two are told, so they come one by one.
export const LOCK_KIND = { weapon: 'Weapon', relic: 'Relic', ult: 'Ultimate' };
export const LOCK_GAP = 2.5;
