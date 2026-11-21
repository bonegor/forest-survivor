// Learning from a run (G12 of the 21 November 2026 gameplay review; the owner's "one by one, work
// them"): the results of a fall tell its last moments, the blows of its last RECENT s by who struck
// them (lastMoments, from Player.recent), and the Records' HISTORY keeps the last HISTORY_MOST runs
// (recordRun), a few short fields each, in this browser's localStorage alone (HISTORY_KEY: a
// convenience of its own, never a cookie, and never the settings, which a run writes at most once).
// Where localStorage can't be used, there is no history.
export const RECENT = 5;
export const HISTORY_MOST = 10;

// The blows of the last span s before now (recent: [{ t, who, dmg }]), by who struck them, the
// hardest first: [{ who, n, dmg }], three at most.
export function lastMoments(recent, now, span = RECENT) {
  const by = new Map();
  for (const b of recent) {
    if (b.t < now - span) continue;
    const e = by.get(b.who) || { who: b.who, n: 0, dmg: 0 };
    e.n++;
    e.dmg += b.dmg;
    by.set(b.who, e);
  }
  return [...by.values()].sort((a, b) => b.dmg - a.dmg).slice(0, 3);
}

// The results' line of them: "Last 5 s: 3× Death Knight 210 · 1× Cultist's bolt 40".
export const momentsLine = (moments) => `Last ${RECENT} s: ${moments.map((m) => `${m.n}× ${m.who} ${Math.round(m.dmg)}`).join(' · ')}`;

export const HISTORY_KEY = 'fs_history';
export function loadHistory() {
  try {
    const list = JSON.parse(globalThis.localStorage?.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(list) ? list.filter((e) => e && typeof e.d === 'string' && typeof e.h === 'string').slice(0, HISTORY_MOST) : [];
  } catch {
    return [];
  }
}
export function saveHistory(list) {
  try {
    globalThis.localStorage?.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    /* a full or blocked storage keeps no history */
  }
}

// A run ended (res: Game.result): first of the list (a copy), the oldest let go past HISTORY_MOST.
export function recordRun(list, res, now = Date.now()) {
  const entry = {
    d: new Date(now).toISOString().slice(0, 10), h: res.hero, m: res.mode === 's15' ? res.map || 'forest' : res.mode,
    t: Math.floor(res.time || 0), v: res.victory ? 1 : 0, k: res.kills || 0, l: res.level || 1,
    x: res.died ? res.stats?.killedBy || res.killedBy || '' : '', o: (res.oaths || []).length,
  };
  return [entry, ...(Array.isArray(list) ? list : [])].slice(0, HISTORY_MOST);
}

// A history row as the Records' HISTORY shows it: [what, how] ("21 Nov · Sir Aldric · The
// Frostfell · 12:41", "slain by a Death Knight").
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
export function historyRow(e, heroName, placeName) {
  const day = `${+e.d.slice(8, 10)} ${MONTHS[+e.d.slice(5, 7) - 1]}`;
  const how = e.v ? 'won' : e.x ? `slain by ${e.x}` : 'left';
  return [`${day} · ${heroName} · ${placeName} · ${clock(e.t)}`, `${how} · Lv ${e.l} · ${e.k} kills`];
}
