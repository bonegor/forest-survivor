// The cast: every part in the game (the heroes' five classes, its monsters, bosses and props)
// and every sprite that could play it, from four places: the game's own sprites, the
// proposals made for it (sprites/lab/catalog.json: heroes, and some monsters), the versions
// saved from the lab's colour bar (sprites/lab/versions.json), and the scouted packs
// (sprites/heroes, sprites/monsters).
//
// A candidate: { id, source: 'game' | 'lab' | 'scout', kind: 'hero' | 'monster', cls (a
// hero's class), role (a monster's part), name, group, collection (a proposal's batch), by,
// licence, restricted, gameH (scouted: its own height), set (scouted: the sprite set), lab (a
// proposal's or saved version's catalogue entry), mine (a saved version), sprite (the game's
// own: the sprite's name) }. Ids: 'game:<sprite>', 'lab:<class or part>/<id>', 'scout:<set id>'.
import { HEROES } from '/game/js/data/heroes.js';
import { ENEMIES } from '/game/js/data/enemies.js';
import { loadHeroes, loadMonsters, gameHeight, gameSize, KNIGHT_H, kindIndex } from './sprites.js';

export const HERO_ROLES = [
  { id: 'knight', name: 'Knight' },
  { id: 'archer', name: 'Ranger' },
  { id: 'mage', name: 'Sorcerer' },
  { id: 'rogue', name: 'Shade' },
  { id: 'necromancer', name: 'Necromancer' },
  { id: 'paladin', name: 'Paladin' },
  { id: 'druid', name: 'Druid' },
  { id: 'berserker', name: 'Berserker' },
  { id: 'witchhunter', name: 'Witch Hunter' },
].filter((r) => HEROES[r.id]);

// The scouts' classes, by the game's.
const SCOUT_CLASS = { knight: 'knight', ranger: 'archer', mage: 'mage', rogue: 'rogue', necro: 'necromancer' };

// How tall each monster stands, whatever plays it: by the same table as every sprite (gameSize
// in lib/sprites.js, from its name), so all candidates for a part are compared at one height.
// Two the table gets wrong: a slimelet is a small slime, and an orc brute isn't a giant.
const ROLE_H = { slimelet: 7, orc: 30 };
export const MONSTER_ROLES = Object.entries(ENEMIES).map(([id, d]) => ({
  id,
  name: d.name,
  group: d.boss ? 'Bosses' : d.prop ? 'Props' : 'Monsters',
  h: ROLE_H[id] || gameSize({ kind: 'monster', name: `${d.name} ${id}`, family: d.prop ? 'props' : '', boss: !!d.boss }).h,
  kind: kindIndex(`${d.name} ${id}`),
}));
export const roleOf = (kind, id) => (kind === 'hero' ? HERO_ROLES : MONSTER_ROLES).find((r) => r.id === id) || null;

let cast = null;
export function loadCast() {
  cast ??= (async () => {
    const none = { sets: [], groups: [] };
    const entries = (url) => fetch(url, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : { entries: [] })).catch(() => ({ entries: [] }));
    const [H, M, lab, versions] = await Promise.all([
      loadHeroes('/sprites/heroes/').catch(() => none),
      loadMonsters('/sprites/monsters/', { still: false }).catch(() => none),
      entries('/sprites/lab/catalog.json'),
      entries('/sprites/lab/versions.json'),
    ]);
    const all = [];
    // The game's own.
    for (const r of HERO_ROLES) all.push({ id: 'game:' + HEROES[r.id].sprite, source: 'game', kind: 'hero', cls: r.id, name: `${r.name} (in the game now)`, group: r.name, by: 'Forest Survivor', licence: 'the game\'s own', restricted: false, sprite: HEROES[r.id].sprite });
    for (const r of MONSTER_ROLES) all.push({ id: 'game:' + ENEMIES[r.id].sprite, source: 'game', kind: 'monster', role: r.id, name: `${r.name} (in the game now)`, group: r.group, by: 'Forest Survivor', licence: 'the game\'s own', restricted: false, sprite: ENEMIES[r.id].sprite });
    // The proposals made for the game: a hero's has its class (cls), a monster's its part (role).
    for (const e of lab.entries || []) {
      const by = e.creator || 'made for Forest Survivor', licence = e.creator ? 'its artist\'s (see the source)' : 'made for Forest Survivor';
      const common = { source: 'lab', name: e.name, collection: e.collection || null, by, licence, restricted: false, source2: e.source, lab: e, note: e.description };
      if (e.as === 'monster') {
        const r = roleOf('monster', e.role);
        if (r) all.push({ id: `lab:${e.role}/${e.id}`, kind: 'monster', role: e.role, group: r.group, gameH: e.h, ...common });
      } else all.push({ id: `lab:${e.cls}/${e.id}`, kind: 'hero', cls: e.cls, group: HERO_ROLES.find((r) => r.id === e.cls)?.name || e.cls, ...common });
    }
    // The versions saved from the colour bar.
    for (const e of versions.entries || []) {
      const c = versionCandidate(e);
      if (c) all.push(c);
    }
    // The scouted packs.
    for (const s of H.sets) {
      if (!s.anims) continue;
      const cls = SCOUT_CLASS[s.cls];
      if (!cls) continue;
      all.push({ id: 'scout:' + s.id, source: 'scout', kind: 'hero', cls, name: s.name, group: s.group, by: s.artist || 'unknown', licence: s.license || 'not stated', restricted: s.restricted, set: s, gameH: KNIGHT_H, pack: s.packName || s.pack });
    }
    for (const s of M.sets) {
      if (!s.anims || s.still) continue;
      all.push({ id: 'scout:' + s.id, source: 'scout', kind: 'monster', name: s.name, group: s.group, by: s.artist || 'unknown', licence: s.license || 'not stated', restricted: s.restricted, set: s, gameH: gameHeight(s), kindName: kindIndex(s.name), pack: s.packName || s.pack, boss: s.boss });
    }
    return { all, byId: new Map(all.map((c) => [c.id, c])), families: M.groups };
  })();
  return cast;
}

// A version saved from the colour bar (an entry in sprites/lab/versions.json) as a candidate
// for its part, keeping the licence of the sprite it was made from.
export function versionCandidate(e) {
  const hero = e.as === 'hero', r = roleOf(e.as, e.role);
  if (!r) return null;
  return { id: `lab:${e.role}/${e.id}`, source: 'lab', mine: true, kind: e.as, ...(hero ? { cls: e.role } : { role: e.role }), name: e.name, group: hero ? r.name : r.group, by: e.by || 'you', licence: e.licence || 'as the sprite it was made from', restricted: !!e.restricted, lab: e, gameH: e.h };
}
// A version just saved, added to a cast already loaded.
export function addVersion(c, e) {
  const cand = versionCandidate(e);
  if (cand && !c.byId.has(cand.id)) {
    c.all.push(cand);
    c.byId.set(cand.id, cand);
  }
  return cand;
}

// The candidates for one part: a hero class's (its own, the proposals and saved versions, the
// scouted ones of that class); for a monster, the game's own, its saved versions, the
// proposals made for it, and every scouted monster, those of its kind first.
export function candidatesFor(c, kind, role) {
  if (kind === 'hero') return c.all.filter((x) => x.kind === 'hero' && x.cls === role);
  const r = roleOf('monster', role);
  const own = c.all.find((x) => x.source === 'game' && x.role === role);
  const mine = c.all.filter((x) => x.mine && x.kind === 'monster' && x.role === role);
  const made = c.all.filter((x) => x.source === 'lab' && !x.mine && x.kind === 'monster' && x.role === role);
  const rest = c.all.filter((x) => x.kind === 'monster' && x.source === 'scout');
  const near = (x) => (r && r.kind >= 0 && x.kindName === r.kind ? 0 : 1);
  rest.sort((a, b) => near(a) - near(b) || Math.abs(a.gameH - (r?.h || 18)) - Math.abs(b.gameH - (r?.h || 18)) || a.name.localeCompare(b.name));
  return [...(own ? [own] : []), ...mine, ...made, ...rest];
}
