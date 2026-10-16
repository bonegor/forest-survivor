// The weapons reference page (index.html): every hero's signature weapons, the weapons shared by
// all, and every relic, read from the game's own data and drawn from its own art, as the game
// builds its sprites (engine/sprites.js buildSprite). Read-only; works as plain static files.

import { WEAPONS, MAX_WEAPON_LEVEL, statsAt } from '../js/data/weapons.js';
import { HEROES, HERO_ORDER, SHARED_WEAPONS, startWeapons } from '../js/data/heroes.js';
import { PASSIVES, PASSIVE_IDS } from '../js/data/passives.js';
import { ART } from '../js/art/defs.js';
import { buildSprite } from '../js/engine/sprites.js';

// Sprites are built as asked for, once each.
const built = new Map();
const sprite = (name) => {
  if (!built.has(name)) built.set(name, ART[name] ? buildSprite(name, ART[name]) : null);
  return built.get(name);
};

// One frame of a sprite at a whole-number scale, every pixel crisp.
function pixels(name, scale, frame = 0) {
  const s = sprite(name);
  const c = document.createElement('canvas');
  if (!s) {
    c.width = c.height = 16 * scale;
    return c;
  }
  const src = s.frames[frame].c;
  c.width = src.width * scale;
  c.height = src.height * scale;
  paint(c, src);
  return c;
}
function paint(c, src) {
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, c.width, c.height);
  g.drawImage(src, 0, 0, c.width, c.height);
}

// A little DOM builder: h('div', { class: 'x' }, child, 'text', ...).
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'style') el.style.cssText = v;
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}

// Card text as the game writes it: {...} is the highlighted part.
function rich(tag, text, attrs = {}) {
  const el = h(tag, attrs);
  const parts = String(text).split(/[{}]/);
  parts.forEach((part, i) => el.append(i % 2 ? h('b', {}, part) : part));
  return el;
}

// Stats as a player reads them; flags (wave, ring, pull...) are told by the description instead.
const num = (v) => String(+v.toFixed(2));
const STATS = {
  dmg: ['damage', num],
  cd: ['cooldown', (v) => num(v) + 's'],
  amount: ['amount', num],
  area: ['area', (v) => '×' + num(v)],
  speed: ['speed', (v) => '×' + num(v)],
  dur: ['lasts', (v) => num(v) + 's'],
  eternal: ['lasts', () => 'for good'],
  tick: ['every', (v) => num(v) + 's'],
  pierce: ['pierce', (v) => (v >= 99 ? 'all' : num(v))],
  chains: ['arcs', num],
  len: ['reach', num],
  slow: ['slow', (v) => Math.round(v * 100) + '%'],
  freeze: ['freeze', (v) => Math.round(v * 100) + '%'],
  dot: ['poison', (v) => num(v) + '/s'],
  critBonus: ['crit', (v) => '+' + Math.round(v * 100) + '%'],
  critDmg: ['crit dmg', (v) => '+' + num(v) + '×'],
  kb: ['knockback', num],
};
function stats(base) {
  return h('div', { class: 'stats' }, Object.keys(STATS).filter((k) => base[k] !== undefined && base[k] !== 0).map((k) => {
    const [label, fmt] = STATS[k];
    return h('span', { class: 'stat' }, label + ' ', h('span', {}, fmt(base[k])));
  }));
}


const signatureOf = new Map();
for (const hero of Object.values(HEROES)) for (const id of hero.unique) signatureOf.set(id, hero);

function card(id, hero = null) {
  const def = WEAPONS[id], evo = WEAPONS[def.evo.into], relic = PASSIVES[def.evo.with];
  const tags = h('div', { class: 'tags' },
    hero ? h('span', { class: 'tag sig' }, `${hero.title}'s signature`) : h('span', { class: 'tag' }, 'shared by all'),
    hero && startWeapons(hero).includes(id) ? h('span', { class: 'tag start' }, 'starts with it') : null,
    hero && hero.weapon === id ? h('span', { class: 'tag' }, 'struck by hand in crypts') : null);
  return h('article', { class: hero ? 'card sig' : 'card', id: 'w-' + id },
    h('div', { class: 'head' }, pixels(def.icon, 3), h('div', {}, h('h3', {}, def.name), tags)),
    rich('p', def.desc, { class: 'desc' }),
    h('div', {}, h('div', { class: 'tag', style: 'display:inline-block;margin-bottom:4px' }, 'level 1'), stats(def.base)),
    h('ol', { class: 'levels' }, def.levels.map((lv, i) => h('li', {}, h('span', { class: 'lv' }, `LV ${i + 2}`), rich('span', lv.text)))),
    h('div', {}, h('div', { class: 'tag', style: 'display:inline-block;margin-bottom:4px' }, `level ${MAX_WEAPON_LEVEL}`), stats(statsAt(def, MAX_WEAPON_LEVEL))),
    h('div', { class: 'evo' },
      h('div', { class: 'head' }, pixels(evo.icon, 2), h('div', {}, h('h4', {}, `Evolves into ${evo.name}`),
        h('div', { class: 'with' }, pixels(relic.icon, 2), h('span', {}, 'with ', h('b', {}, relic.name), `, at level ${MAX_WEAPON_LEVEL}, from a chest`)))),
      rich('p', evo.desc, { class: 'desc' }),
      stats(evo.base)));
}

// A hero's menu pose, its idle loop playing as on the hero screen.
const poses = [];
function pose(hero) {
  const s = sprite(hero.pose) || sprite(hero.sprite);
  const scale = Math.max(1, Math.round(110 / s.h));
  const c = pixels(s.name, scale);
  if (s.fps && s.frames.length > 1) poses.push({ c, s });
  return c;
}
function animate(t) {
  for (const { c, s } of poses) paint(c, s.frames[Math.floor((t / 1000) * s.fps) % s.frames.length].c);
  requestAnimationFrame(animate);
}

function heroSection(id) {
  const hero = HEROES[id];
  const starts = startWeapons(hero).map((w) => WEAPONS[w].name).join(' and ');
  return h('section', { id: 'h-' + id, style: `--hero:${hero.color}` },
    h('div', { class: 'hero' }, pose(hero), h('div', {},
      h('div', { class: 'title' }, hero.title),
      h('h2', {}, hero.name),
      h('p', {}, h('strong', {}, 'Starts with '), starts),
      h('p', {}, hero.perk, ' · Ultimate: ', hero.ultName))),
    h('div', { class: 'cards' }, hero.unique.map((w) => card(w, hero))));
}

function relicTable() {
  const rows = PASSIVE_IDS.map((id) => {
    const r = PASSIVES[id];
    const evolves = Object.entries(WEAPONS).filter(([, d]) => !d.evolved && d.evo.with === id).map(([wid, d]) => {
      const hero = signatureOf.get(wid);
      return `${d.name} → ${WEAPONS[d.evo.into].name}${hero ? ` (${hero.title})` : ''}`;
    });
    // The Phoenix Heart's rules (data/passives.js): it evolves them all, and comes and goes.
    if (r.evolvesAny) evolves.push(`Any weapon at level ${MAX_WEAPON_LEVEL}, its own relic held or not`);
    if (r.afterSignature) evolves.push("Offered only once the hero's own weapon has evolved");
    if (r.stat.revivals) evolves.push(`Spent by the revive it gives; offered again ${r.again} levels on`);
    return h('tr', {},
      h('td', { class: 'icon' }, pixels(r.icon, 2)),
      h('td', {}, r.name),
      h('td', {}, String(r.max)),
      rich('td', r.desc),
      h('td', { class: 'evolves' }, evolves.join('; ') || '—'));
  });
  return h('div', { class: 'tablewrap' }, h('table', {},
    h('thead', {}, h('tr', {}, ['', 'Relic', 'Ranks', 'Each rank', 'Evolves'].map((t) => h('th', {}, t)))),
    h('tbody', {}, rows)));
}

function build() {
  const page = document.getElementById('page'), toc = document.getElementById('toc');
  page.replaceChildren(
    ...HERO_ORDER.map(heroSection),
    h('section', { id: 'shared' },
      h('h2', { class: 'sec' }, 'Shared by all'),
      h('p', { class: 'note' }, 'Any hero may find these on his level-ups.'),
      h('div', { class: 'cards' }, SHARED_WEAPONS.map((w) => card(w)))),
    h('section', { id: 'relics' },
      h('h2', { class: 'sec' }, 'Relics'),
      h('p', { class: 'note' }, 'Shared by all. A weapon at its top level evolves when a chest is opened, if the hero holds its relic (or the Phoenix Heart, which evolves any).'),
      relicTable()));
  toc.replaceChildren(
    ...HERO_ORDER.map((id) => h('a', { href: '#h-' + id }, HEROES[id].title)),
    h('a', { href: '#shared' }, 'Shared by all'),
    h('a', { href: '#relics' }, 'Relics'));
  if (poses.length) requestAnimationFrame(animate);
}

try {
  build();
} catch (err) {
  document.getElementById('page').replaceChildren(h('div', { class: 'empty' }, 'Could not build the page: ' + err.message));
  throw err;
}
