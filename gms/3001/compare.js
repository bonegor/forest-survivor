// Sprite Lab · Compare: every sprite that could play one part, side by side as the game draws
// them, their feet on one line: the game's own, the proposals made for it (by batch), the
// versions saved from the colour bar and the scouted packs. "Try in the game" opens the lab's
// game (index.html) wearing it; "Make it the pick" keeps it in picks.json, as the lab does.
import { buildSprites } from '/game/js/engine/sprites.js';
import { ENEMIES } from '/game/js/data/enemies.js';
import { HERO_ROLES, MONSTER_ROLES, roleOf, loadCast, candidatesFor } from './lib/cast.js';
import { gameSprite, rememberOriginals, standsTall } from './lib/gamesprite.js';
import { KNIGHT_H } from './lib/sprites.js';

const $ = (s) => document.querySelector(s);
const PAGE = 48; // scouted sprites shown at a time
const state = { kind: 'hero', role: 'knight', source: 'all', batch: 'all', q: '', hideRed: false, grow: false, pose: 'walk', face: 'right', k: 3 };
let cast = null, picks = { hero: {}, monster: {} }, scouted = [], scoutShown = 0;

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
const partName = () => (state.kind === 'hero' ? roleOf('hero', state.role).name.toLowerCase() : roleOf('monster', state.role).name);

// ------------------------------------------------------------------ hash --

function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const kind = q.get('kind') === 'monster' ? 'monster' : 'hero';
  if (roleOf(kind, q.get('role'))) Object.assign(state, { kind, role: q.get('role') });
  if (['all', 'made', 'scout'].includes(q.get('source'))) state.source = q.get('source');
  if (q.get('batch')) state.batch = q.get('batch');
  if (['walk', 'idle', 'attack'].includes(q.get('pose'))) state.pose = q.get('pose');
  if (['right', 'left'].includes(q.get('face'))) state.face = q.get('face');
  if (['2', '3', '4'].includes(q.get('k'))) state.k = Number(q.get('k'));
  state.grow = q.get('grow') === '1';
}
function writeHash() {
  const q = { kind: state.kind, role: state.role, pose: state.pose, face: state.face, k: state.k };
  if (state.source !== 'all') q.source = state.source;
  if (state.batch !== 'all') q.batch = state.batch;
  if (state.grow) q.grow = '1';
  history.replaceState(null, '', '#' + new URLSearchParams(q));
}

// --------------------------------------------------------------- batches --

// Where a candidate came from, as the page groups them: newest batches of proposals first.
const OWN = 'In the game now', MINE = 'Your recolours', SCOUTED = 'Scouted';
const BATCHES = {
  [OWN]: 'what the game draws today',
  [MINE]: 'saved from the colour bar',
  Remasters: 'new versions, round after round: one agent draws, another reviews (src/remaster-v*/REVIEW.md)',
  'Earlier in the game': 'what the game drew before',
  'Standing studies': 'standing poses only: V1 to V4 each from V1, then V5 to V8',
  'Ranger standing studies': 'standing poses only, each from the fuller hood (V5)',
  'Ranger reworks': 'fully animated: walk, stand and shoot',
  'Arcade knight': 'the compact knight the game had before the plume, and its tweaks',
  Looks: 'one standing frame each',
  'Walk styles': 'one knight, eight ways of walking',
  'Realm knights': 'eight armours on one build',
  'From online packs': 'redrawn from online packs; see their artists',
  'Earlier Sprite Lab': 'proposals from the earlier Sprite Lab',
  'First proposals': 'the first redesigns, drawn for the smaller heroes of the time',
  [SCOUTED]: 'from free packs, redrawn in the game\'s pixels',
};
const ORDER = Object.keys(BATCHES);
const batchOf = (c) => (c.source === 'game' ? OWN : c.mine ? MINE : c.source === 'lab' ? c.collection || 'Made for the game' : SCOUTED);
const rank = (b) => (ORDER.includes(b) ? ORDER.indexOf(b) : ORDER.length - 1.5);

// ---------------------------------------------------------------- choose --

function renderHeroes() {
  const nav = $('#heroes');
  nav.innerHTML = '';
  for (const r of HERO_ROLES) {
    const p = picks.hero[r.id], c = p && cast.byId.get(p);
    const b = h('button', { 'aria-pressed': String(state.kind === 'hero' && state.role === r.id) }, r.name, h('span', { class: 'pick' + (p ? ' set' : '') }, c ? c.name : 'game\'s own'));
    b.addEventListener('click', () => choose('hero', r.id));
    nav.append(b);
  }
  const sel = $('#part');
  sel.innerHTML = '';
  sel.append(h('option', { value: '' }, '—'));
  for (const group of ['Monsters', 'Bosses', 'Props']) {
    const og = h('optgroup', { label: group });
    for (const r of MONSTER_ROLES.filter((x) => x.group === group)) og.append(h('option', { value: r.id }, `${r.name} · ${r.h} px`));
    sel.append(og);
  }
  sel.value = state.kind === 'monster' ? state.role : '';
}

function choose(kind, role) {
  Object.assign(state, { kind, role, batch: 'all' });
  writeHash();
  renderHeroes();
  render();
}

// ------------------------------------------------------------------ list --

// The part's candidates as the filters leave them; a monster's scouted ones only of its own
// kind at first (there are thousands), the rest a page at a time.
function candidates() {
  const r = roleOf(state.kind, state.role), q = state.q.toLowerCase();
  return candidatesFor(cast, state.kind, state.role).filter((c) => {
    if (state.source === 'made' && c.source === 'scout') return false;
    if (state.source === 'scout' && c.source !== 'scout') return false;
    if (state.batch !== 'all' && batchOf(c) !== state.batch) return false;
    if (state.hideRed && c.restricted) return false;
    return !q || [c.name, c.by, c.pack, c.collection, c.note].some((x) => x && x.toLowerCase().includes(q));
  }).filter((c) => state.kind === 'hero' || c.source !== 'scout' || q || r.kind < 0 || c.kindName === r.kind || state.source === 'scout');
}

function renderBatches(all) {
  const sel = $('#collection'), have = new Set(all.map(batchOf));
  sel.innerHTML = '';
  sel.append(h('option', { value: 'all' }, 'every batch'));
  for (const b of [...have].sort((a, b) => rank(a) - rank(b))) sel.append(h('option', { value: b }, b));
  if (state.batch !== 'all' && !have.has(state.batch)) state.batch = 'all';
  sel.value = state.batch;
}

function render() {
  // A monster only ever walks in the game: no pose to choose.
  $('#pose').hidden = state.kind !== 'hero';
  live.clear();
  watch.disconnect();
  renderBatches(candidatesFor(cast, state.kind, state.role).filter((c) => state.kind === 'hero' || c.source !== 'scout'));
  const list = candidates(), main = $('#groups');
  main.innerHTML = '';
  main.style.setProperty('--cw', `${area().w * state.k + 18}px`);
  const groups = new Map();
  for (const c of list) {
    const b = batchOf(c);
    if (!groups.has(b)) groups.set(b, []);
    groups.get(b).push(c);
  }
  scouted = groups.get(SCOUTED) || [];
  groups.delete(SCOUTED);
  for (const [b, cs] of [...groups].sort((a, b) => rank(a[0]) - rank(b[0]))) main.append(section(b, cs));
  if (scouted.length) {
    const sec = section(SCOUTED, []);
    sec.querySelector('h2 small').textContent += ` · ${scouted.length.toLocaleString()}`;
    main.append(sec);
    scoutShown = 0;
    moreScouted();
  }
  if (!list.length) main.append(h('p', { class: 'empty' }, 'Nothing matches.'));
  $('#count').textContent = `${list.length.toLocaleString()} sprite${list.length === 1 ? '' : 's'} for the ${partName()}`;
}

function section(name, cs) {
  const grid = h('div', { class: 'grid' }, cs.map(card));
  return h('section', { class: 'group', 'data-batch': name }, h('h2', {}, name, h('small', {}, BATCHES[name] || 'made for the game')), grid);
}

function moreScouted() {
  const sec = document.querySelector(`.group[data-batch="${SCOUTED}"]`);
  if (!sec) return;
  const grid = sec.querySelector('.grid');
  for (const c of scouted.slice(scoutShown, scoutShown + PAGE)) grid.append(card(c));
  scoutShown = Math.min(scouted.length, scoutShown + PAGE);
  sec.querySelector('.more')?.remove();
  if (scoutShown < scouted.length) {
    const b = h('button', { class: 'more' }, `Show more (${(scouted.length - scoutShown).toLocaleString()} left)`);
    b.addEventListener('click', moreScouted);
    sec.append(b);
  }
}

// ------------------------------------------------------------------ cards --

const SOURCE = { game: 'in the game now', lab: 'made for the game', scout: 'scouted' };
const isPick = (c) => (c.source === 'game' ? !picks[state.kind][state.role] : picks[state.kind][state.role] === c.id);

function card(c) {
  const own = c.source === 'game';
  const by = c.mine ? `your recolour of ${c.lab.fromName || 'a sprite'}` : c.source === 'lab' && !c.lab.creator ? SOURCE.lab : [SOURCE[c.source], c.pack, c.by].filter(Boolean).join(' · ');
  const cv = h('canvas', { role: 'img', 'aria-label': c.name });
  const try_ = h('a', { href: state.kind === 'hero' ? `./#role=${state.role}&wear=${encodeURIComponent(c.id)}` : `./#part=${state.role}&mwear=${encodeURIComponent(c.id)}` }, 'Try in the game');
  const mk = h('button', { class: 'mk', type: 'button' });
  mk.addEventListener('click', () => makePick(c));
  const el = h('article', { class: ['card', c.restricted && 'red', own && 'own'].filter(Boolean).join(' ') },
    h('div', { class: 'stage' }, cv),
    h('div', { class: 'meta' },
      h('b', {}, c.name),
      h('span', { class: 'sub' }, by),
      h('span', { class: 'sub' }, h('span', { class: 'hpx' }, '…'), c.restricted ? h('span', { class: 'no-com' }, ' · not for commercial use') : null),
      c.note ? h('span', { class: 'note', title: c.note }, c.note) : null,
    ),
    h('div', { class: 'acts' }, try_, mk),
  );
  Object.assign(el, { __cand: c, __canvas: cv, __mk: mk });
  size(el);
  syncPick(el);
  watch.observe(el);
  return el;
}

function syncPick(el) {
  const picked = isPick(el.__cand);
  el.classList.toggle('pick', picked);
  el.__mk.disabled = picked;
  el.__mk.textContent = picked ? 'It is the pick' : 'Make it the pick';
}

// The box every card draws in, in game pixels, and the height its dashed line marks: a hero's
// is the knight's; a monster's, its part's. Heroes reach at most 39 px above their feet, and
// all but the online packs' knights (sword swings 51 to 77 px wide) fit 64 across.
function area() {
  if (state.kind === 'hero') return { w: 64, h: 46, line: KNIGHT_H };
  const r = roleOf('monster', state.role), hh = Math.max(32, Math.ceil(r.h * 1.7));
  return { w: Math.ceil(hh * 1.3), h: hh, line: r.h };
}
function size(el) {
  const a = area();
  el.__canvas.width = a.w * state.k;
  el.__canvas.height = a.h * state.k;
}

// ---------------------------------------------------------------- drawing --

// Each card's sprite, built as it scrolls into view, and drawn while it is in view.
const live = new Set();
const watch = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const el = e.target;
    if (!e.isIntersecting) {
      live.delete(el);
      continue;
    }
    live.add(el);
    if (el.__spr !== undefined || el.__building) continue;
    el.__building = true;
    const height = state.kind === 'hero' ? KNIGHT_H : roleOf('monster', state.role).h;
    gameSprite(el.__cand, { as: state.kind, height, grow: state.grow })
      .then((spr) => {
        el.__spr = spr;
        const n = spr.frames.length, has = state.kind === 'hero' && spr.walk ? ['walk', spr.idle && 'stand', spr.attack && spr.attack.length && 'attack'].filter(Boolean) : [];
        el.querySelector('.hpx').textContent = `${standsTall(spr)} px tall · ${n === 1 ? 'one frame, standing only' : `${n} frames${has.length ? ' · ' + has.join(', ') : ''}`}`;
      })
      .catch((err) => {
        el.__spr = null;
        el.querySelector('.hpx').textContent = 'could not be drawn: ' + err.message;
      });
  }
}, { rootMargin: '300px' });

// Which frames play, and how fast, for the pose chosen; a sprite without that pose walks.
function sequence(spr) {
  const all = spr.frames.map((_, i) => i);
  if (state.kind === 'monster' || !spr.walk) return { seq: spr.walk || all, fps: spr.walk ? spr.motionRate * 9.8 : spr.animFps || ENEMIES[state.role]?.anim || 6 };
  if (state.pose === 'idle') return { seq: spr.idle || [0], fps: (spr.idleRate ?? 4) * 1.6 };
  if (state.pose === 'attack' && spr.attack && spr.attack.length) return { seq: spr.attack, fps: spr.attackFps || 10 };
  return { seq: spr.walk, fps: (spr.motionRate || 1) * 9.8 };
}

function draw(el, now) {
  const spr = el.__spr, cv = el.__canvas, g = cv.getContext('2d'), k = state.k, W = cv.width, H = cv.height, a = area();
  const { seq, fps } = sequence(spr);
  const f = spr.frames[seq[Math.floor((now / 1000) * fps) % seq.length]];
  const ground = H - 3 * k;
  g.clearRect(0, 0, W, H);
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#20402d';
  g.fillRect(0, ground, W, H - ground);
  // A hero stands on its anchor row (the game's anchorY), a monster on its frame's last row.
  const top = state.kind === 'hero' ? ground - spr.anchorY * k : ground - f.h * k;
  g.drawImage(state.face === 'left' ? f.cf : f.c, Math.round(W / 2 - (f.w * k) / 2), top, f.w * k, f.h * k);
  // The reference height, dashed.
  const ly = (state.kind === 'hero' ? ground + k - a.line * k : ground - a.line * k) + 0.5;
  g.strokeStyle = 'rgba(254, 174, 52, 0.45)';
  g.setLineDash([2 * k, 2 * k]);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, ly);
  g.lineTo(W, ly);
  g.stroke();
  g.setLineDash([]);
}

function animate(now) {
  for (const el of live) if (el.__spr) draw(el, now);
  requestAnimationFrame(animate);
}

// ----------------------------------------------------------------- picks --

async function makePick(c) {
  const id = c.source === 'game' ? null : c.id;
  $('#saved').textContent = 'Saving…';
  try {
    const r = await fetch('/api/picks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: state.kind, role: state.role, id }) });
    if (!r.ok) throw new Error((await r.json()).error || r.status);
    picks = await r.json();
    $('#saved').textContent = `${c.name} is the pick for the ${partName()}`;
  } catch (e) {
    $('#saved').textContent = 'Not saved! ' + e.message;
  }
  for (const el of document.querySelectorAll('.card')) syncPick(el);
  renderHeroes();
}

// ---------------------------------------------------------------- wiring --

function segment(id, key, parse = (v) => v) {
  const box = $('#' + id);
  const sync = () => {
    for (const b of box.querySelectorAll('button')) b.setAttribute('aria-pressed', String(String(state[key]) === b.dataset.v));
  };
  for (const b of box.querySelectorAll('button')) {
    b.addEventListener('click', () => {
      state[key] = parse(b.dataset.v);
      sync();
      writeHash();
      if (key === 'k') {
        $('#groups').style.setProperty('--cw', `${area().w * state.k + 18}px`);
        for (const el of document.querySelectorAll('.card')) size(el);
      }
    });
  }
  sync();
}

function wire() {
  segment('pose', 'pose');
  segment('face', 'face');
  segment('size', 'k', Number);
  $('#part').addEventListener('change', () => {
    if ($('#part').value) choose('monster', $('#part').value);
    else choose('hero', HERO_ROLES[0].id);
  });
  $('#source').value = state.source;
  $('#source').addEventListener('change', () => {
    state.source = $('#source').value;
    writeHash();
    render();
  });
  $('#collection').addEventListener('change', () => {
    state.batch = $('#collection').value;
    writeHash();
    render();
  });
  let qT = 0;
  $('#q').addEventListener('input', () => {
    clearTimeout(qT);
    qT = setTimeout(() => {
      state.q = $('#q').value.trim();
      render();
    }, 200);
  });
  $('#hide-red').addEventListener('change', () => {
    state.hideRed = $('#hide-red').checked;
    render();
  });
  $('#grow').checked = state.grow;
  $('#grow').addEventListener('change', () => {
    state.grow = $('#grow').checked;
    writeHash();
    render();
  });
}

async function main() {
  buildSprites();
  rememberOriginals();
  readHash();
  $('#saved').textContent = 'Loading the sprites…';
  [cast, picks] = await Promise.all([loadCast(), fetch('/api/picks', { cache: 'no-store' }).then((r) => r.json())]);
  $('#saved').textContent = '';
  wire();
  renderHeroes();
  render();
  writeHash();
  requestAnimationFrame(animate);
}
main().catch((e) => ($('#saved').textContent = 'Could not start: ' + e.message));
