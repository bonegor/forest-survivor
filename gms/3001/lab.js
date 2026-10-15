// Sprite Lab: the game itself (stage.html, the real game in a frame), played with the keyboard,
// with any sprite in any part. The panel puts a hero sprite on the hero or a monster sprite in
// a monster's part at once, brings monsters, and lines every part up for comparing sizes;
// "Make it the pick" keeps a choice (the server's picks.json), and the game starts as picked.
// The colour bar over the game recolours what the hero or the chosen monster part wears, live,
// and saves it as a new version of that sprite.
import { buildSprites } from '/game/js/engine/sprites.js';
import { HERO_ROLES, MONSTER_ROLES, roleOf, loadCast, candidatesFor, addVersion } from './lib/cast.js';
import { gameSprite, rememberOriginals } from './lib/gamesprite.js';
import { SLIDERS, neutral, isNeutral } from './lib/recolour.js';

const $ = (s) => document.querySelector(s);
const PAGE = 40;
const state = { role: 'knight', part: 'skeleton', zoom: 'game', heroSource: 'all', heroQ: '', family: 'all', monQ: '', hideRed: false, grow: false, tw: 'hero' };
let cast = null, picks = { hero: {}, monster: {} }, worn = { hero: {}, monster: {} }, monList = [], monShown = 0;
const frame = $('#game');

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
const tell = (action, data = {}) => frame.contentWindow?.postMessage({ lab: true, action, ...data }, location.origin);
// Back to the game, so the keys walk the hero again.
const focusGame = () => {
  frame.focus();
  frame.contentWindow?.focus();
};
const status = (text) => ($('#status').textContent = text);

// The hash keeps the class, part, view and scale; a link from the Compare page (compare.html)
// also says what to wear: wear=<id> on the hero, or mwear=<id> on the part, with some brought.
let start = { wear: null, mwear: null };
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  if (q.get('role') && roleOf('hero', q.get('role'))) state.role = q.get('role');
  if (q.get('part') && roleOf('monster', q.get('part'))) state.part = q.get('part');
  if (['game', 'closer', 'native'].includes(q.get('zoom'))) state.zoom = q.get('zoom');
  state.grow = q.get('grow') === '1';
  start = { wear: q.get('wear'), mwear: q.get('mwear') };
}
const writeHash = () => history.replaceState(null, '', '#' + new URLSearchParams({ role: state.role, part: state.part, zoom: state.zoom, ...(state.grow ? { grow: '1' } : {}) }).toString());

const pickOf = (kind, part) => picks[kind][part] || null;
const wornOf = (kind, part) => worn[kind][part] || null;
function nameOf(id, kind, part) {
  const c = id && cast.byId.get(id);
  if (c && c.source !== 'game') return c.name;
  return `the game's own ${kind === 'hero' ? roleOf('hero', part).name.toLowerCase() : roleOf('monster', part).name}`;
}
// Whether a candidate is what a part wears or has as its pick (no pick: the game's own).
const isGameOwn = (c) => c.source === 'game';
const matches = (c, id) => (id ? c.id === id : isGameOwn(c));

// ----------------------------------------------------------------- hero --

function renderClasses() {
  const nav = $('#classes');
  nav.innerHTML = '';
  for (const r of HERO_ROLES) {
    const p = pickOf('hero', r.id);
    const b = h('button', { 'aria-pressed': String(r.id === state.role) }, r.name, h('span', { class: 'pick' + (p ? ' set' : '') }, p ? nameOf(p, 'hero', r.id) : 'game\'s own'));
    b.addEventListener('click', () => {
      state.role = r.id;
      writeHash();
      tell('hero', { role: r.id, id: wornOf('hero', r.id) ?? pickOf('hero', r.id) });
      renderHero();
      focusGame();
    });
    nav.append(b);
  }
}

function renderHero() {
  renderClasses();
  const id = wornOf('hero', state.role);
  $('#hero-now').textContent = nameOf(id, 'hero', state.role);
  const wornIsPick = (id && !id.startsWith('game:') ? id : null) === pickOf('hero', state.role);
  $('#hero-pick').disabled = wornIsPick;
  $('#hero-pick').textContent = wornIsPick ? 'It is the pick' : 'Make it the pick';
  const list = candidatesFor(cast, 'hero', state.role).filter((c) => {
    if (state.heroSource === 'made' && c.source === 'scout') return false;
    if (state.heroSource === 'scout' && c.source !== 'scout') return false;
    const q = state.heroQ.toLowerCase();
    return !q || [c.name, c.by, c.pack, c.collection].some((x) => x && x.toLowerCase().includes(q));
  });
  const ul = $('#hero-list');
  ul.innerHTML = '';
  for (const c of list) ul.append(row(c, 'hero', state.role));
}

// -------------------------------------------------------------- monsters --

function renderParts() {
  const sel = $('#part');
  sel.innerHTML = '';
  for (const group of ['Monsters', 'Bosses', 'Props']) {
    const og = h('optgroup', { label: group });
    for (const r of MONSTER_ROLES.filter((x) => x.group === group)) {
      const p = pickOf('monster', r.id);
      og.append(h('option', { value: r.id }, `${r.name} · ${r.h} px${p ? ' · ' + nameOf(p, 'monster', r.id) : ''}`));
    }
    sel.append(og);
  }
  sel.value = state.part;
}

function renderFamilies() {
  const sel = $('#family');
  sel.innerHTML = '';
  sel.append(h('option', { value: 'all' }, 'every family'));
  for (const g of cast.families) sel.append(h('option', { value: g }, g));
  sel.value = state.family;
}

function renderMonsters() {
  const id = wornOf('monster', state.part);
  $('#mon-now').textContent = nameOf(id, 'monster', state.part);
  const wornIsPick = (id && !id.startsWith('game:') ? id : null) === pickOf('monster', state.part);
  $('#mon-pick').disabled = wornIsPick;
  $('#mon-pick').textContent = wornIsPick ? 'It is the pick' : 'Make it the pick';
  monList = candidatesFor(cast, 'monster', state.part).filter((c) => {
    if (state.family !== 'all' && c.source === 'scout' && c.group !== state.family) return false;
    if (state.hideRed && c.restricted) return false;
    const q = state.monQ.toLowerCase();
    return !q || [c.name, c.by, c.pack, c.group].some((x) => x && x.toLowerCase().includes(q));
  });
  monShown = 0;
  $('#mon-list').innerHTML = '';
  moreMonsters();
}
function moreMonsters() {
  for (const c of monList.slice(monShown, monShown + PAGE)) $('#mon-list').append(row(c, 'monster', state.part));
  monShown = Math.min(monList.length, monShown + PAGE);
  $('#mon-more').hidden = monShown >= monList.length;
  $('#mon-more').textContent = `Show more (${(monList.length - monShown).toLocaleString()} left)`;
}

// ------------------------------------------------------------------ rows --

const SOURCE = { game: 'in the game now', lab: 'made for the game', scout: 'scouted' };
function row(c, kind, part) {
  const wearing = matches(c, wornOf(kind, part)), picked = matches(c, pickOf(kind, part));
  const li = h('li', { class: ['row', c.restricted ? 'red' : '', wearing ? 'on' : '', picked ? 'picked' : ''].filter(Boolean).join(' '), tabindex: '0', title: `Put it on the ${kind === 'hero' ? 'hero' : roleOf('monster', part).name}` });
  const cv = h('canvas', { class: 'preview', width: 64, height: 56 });
  // A recolour keeps the credit of the sprite it was made from.
  const by = c.mine ? (c.by && c.by !== 'Forest Survivor' ? ' · ' + c.by : '') : c.source === 'lab' && !c.lab.creator ? '' : ' · ' + c.by;
  const source = c.mine ? `your recolour of ${c.lab.fromName || 'a sprite'}` : c.collection ? `${SOURCE[c.source]} · ${c.collection}` : SOURCE[c.source];
  li.append(
    h('div', { class: 'pv' }, cv),
    h('div', { class: 'meta' },
      h('b', {}, c.name),
      h('span', { class: 'sub' }, `${source}${by}`),
      h('span', { class: 'sub' }, h('span', { class: 'hpx' }, ''), c.restricted ? h('span', { class: 'no-com' }, ' not for commercial use') : null, wearing ? h('span', { class: 'chip on' }, 'wearing') : null, picked ? h('span', { class: 'chip pick' }, 'pick') : null),
    ),
  );
  Object.assign(li, { __cand: c, __kind: kind, __part: part, __canvas: cv });
  const choose = () => {
    if (kind === 'hero') tell('hero', { role: part, id: c.id });
    else tell('monster', { part, id: c.id });
    status(`Putting ${c.name} on the ${kind === 'hero' ? roleOf('hero', part).name.toLowerCase() : roleOf('monster', part).name}…`);
    focusGame();
  };
  li.addEventListener('click', choose);
  li.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose();
    }
  });
  watch.observe(li);
  return li;
}

// The tallest any of its shown frames stands, in game pixels.
function tallest(spr) {
  const list = spr.walk ? [...new Set([...(spr.idle || []), ...spr.walk])] : spr.frames.map((_, i) => i);
  let H = 0;
  for (const i of list.slice(0, 24)) {
    const f = spr.frames[i], d = f.buf.d;
    let y0 = -1, y1 = -1;
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        if (d[y * f.w + x] >>> 24 > 24) {
          if (y0 < 0) y0 = y;
          y1 = y;
          break;
        }
      }
    }
    if (y1 >= 0) H = Math.max(H, y1 - y0 + 1);
  }
  return H;
}

// Each row's sprite walking, in the game's pixels at 2x (1x for the tallest parts), built as it scrolls into view.
const live = new Set();
const watch = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const li = e.target;
    if (!e.isIntersecting) {
      live.delete(li);
      continue;
    }
    live.add(li);
    if (li.__spr || li.__building) continue;
    li.__building = true;
    const c = li.__cand, height = li.__kind === 'hero' ? 30 : roleOf('monster', li.__part).h;
    li.__k = height <= 26 ? 2 : 1;
    gameSprite(c, { as: li.__kind, height, grow: state.grow })
      .then((spr) => {
        li.__spr = spr;
        li.querySelector('.hpx').textContent = `${tallest(spr)} px`;
      })
      .catch((err) => {
        li.__spr = null;
        li.querySelector('.hpx').textContent = 'could not be drawn: ' + err.message;
      });
  }
}, { rootMargin: '150px' });

function animate(now) {
  for (const li of live) {
    const spr = li.__spr;
    if (!spr) continue;
    const g = li.__canvas.getContext('2d'), W = li.__canvas.width, H = li.__canvas.height;
    const seq = spr.walk || spr.frames.map((_, i) => i);
    const fps = spr.walk ? spr.motionRate * 9.8 : spr.animFps || 6;
    const f = spr.frames[seq[Math.floor((now / 1000) * fps) % seq.length]], k = li.__k;
    g.clearRect(0, 0, W, H);
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#20402d';
    g.fillRect(0, H - 4, W, 4);
    const foot = spr.walk ? spr.anchorY : f.h;
    g.drawImage(f.c, Math.round(W / 2 - (f.w * k) / 2), Math.round(H - 3 - foot * k), f.w * k, f.h * k);
  }
  requestAnimationFrame(animate);
}

// ------------------------------------------------------------ colour bar --

// The bar recolours the hero (the class being played) or the monster part chosen in the panel,
// whatever sprite it wears. Each sprite a part has worn keeps its sliders ('kind:role:id' →
// values), so going back to one finds it as it was left.
const tweaks = new Map();
let saving = false;
const ownOf = (kind, role) => cast.all.find((c) => c.source === 'game' && (kind === 'hero' ? c.cls === role : c.role === role))?.id;
const slotId = (kind, role) => wornOf(kind, role) || ownOf(kind, role);
const twSlot = () => {
  const kind = state.tw, role = kind === 'hero' ? state.role : state.part;
  return { kind, role, id: slotId(kind, role) };
};
const keyOf = ({ kind, role, id }) => `${kind}:${role}:${id}`;
const valuesOf = (slot) => tweaks.get(keyOf(slot)) || neutral();
const tellTweak = (slot) => tell('tweak', { ...slot, values: valuesOf(slot) });
const shown = (s, v) => (s.unit ? `${v}${s.unit}` : v > 0 ? `+${v}` : String(v));

function buildBar() {
  const box = $('#tw-sliders');
  for (const s of SLIDERS) {
    const input = h('input', { type: 'range', min: s.min, max: s.max, step: 1, value: 0, 'aria-label': s.label });
    const label = h('label', { class: 'tw-s', title: `${s.hint}. Double-click: back to 0.` }, h('span', {}, s.label, h('output', {}, '0')), input);
    input.addEventListener('input', () => setSlider(s.key, Number(input.value)));
    label.addEventListener('dblclick', () => setSlider(s.key, 0));
    // Back to the game once the mouse lets go, so the keys walk the hero again.
    input.addEventListener('pointerup', focusGame);
    Object.assign(label, { __key: s.key, __input: input });
    box.append(label);
  }
  for (const [id, kind] of [['#tw-hero', 'hero'], ['#tw-mon', 'monster']]) {
    $(id).addEventListener('click', () => {
      state.tw = kind;
      syncBar();
    });
  }
  $('#tw-reset').addEventListener('click', () => {
    const slot = twSlot();
    tweaks.delete(keyOf(slot));
    tellTweak(slot);
    syncBar();
    focusGame();
  });
  $('#tw-save').addEventListener('click', () => {
    const slot = twSlot();
    saving = true;
    syncBar();
    status(`Saving the recoloured ${nameOf(slot.id, slot.kind, slot.role)} as a new version…`);
    tell('save', { kind: slot.kind, role: slot.role });
  });
  $('#tw-hide').addEventListener('click', () => showBar(false));
  $('#tw-show').addEventListener('click', () => showBar(true));
}
function showBar(on) {
  $('#tweak').hidden = !on;
  $('#tw-show').hidden = on;
  focusGame();
}

function setSlider(key, v) {
  const slot = twSlot(), values = { ...valuesOf(slot), [key]: v };
  if (isNeutral(values)) tweaks.delete(keyOf(slot));
  else tweaks.set(keyOf(slot), values);
  tellTweak(slot);
  syncBar();
}

// The bar as the chosen part and its sprite have it.
function syncBar() {
  if (!cast) return;
  const slot = twSlot(), values = valuesOf(slot), part = roleOf('monster', state.part);
  $('#tw-hero').setAttribute('aria-pressed', String(slot.kind === 'hero'));
  $('#tw-mon').setAttribute('aria-pressed', String(slot.kind === 'monster'));
  $('#tw-hero').textContent = roleOf('hero', state.role).name;
  $('#tw-mon').textContent = part.name;
  $('#tw-mon').title = `Recolour the ${part.name}${part.group === 'Props' ? '' : ' (bring some to see it)'}`;
  $('#tw-name').textContent = nameOf(slot.id, slot.kind, slot.role);
  $('#tw-name').title = $('#tw-name').textContent;
  for (const label of $('#tw-sliders').children) {
    const v = values[label.__key] || 0, s = SLIDERS.find((x) => x.key === label.__key);
    if (Number(label.__input.value) !== v) label.__input.value = v;
    label.querySelector('output').textContent = shown(s, v);
    label.classList.toggle('moved', v !== 0);
  }
  const still = isNeutral(values);
  $('#tw-save').disabled = still || saving;
  $('#tw-reset').disabled = still || saving;
  $('#tweak').classList.toggle('busy', saving);
}

// ----------------------------------------------------------------- picks --

async function makePick(kind, part) {
  const id = wornOf(kind, part), value = id && !id.startsWith('game:') ? id : null;
  $('#saved').textContent = 'Saving…';
  try {
    const r = await fetch('/api/picks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, role: part, id: value }) });
    if (!r.ok) throw new Error((await r.json()).error || r.status);
    picks = await r.json();
    $('#saved').textContent = `${nameOf(value, kind, part)} is the pick for the ${kind === 'hero' ? roleOf('hero', part).name.toLowerCase() : roleOf('monster', part).name}`;
  } catch (e) {
    $('#saved').textContent = 'Not saved! ' + e.message;
  }
  renderHero();
  renderParts();
  renderMonsters();
}

// ---------------------------------------------------------------- wiring --

window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || e.source !== frame.contentWindow || !e.data || !e.data.lab) return;
  const m = e.data;
  if (m.orbs) $('#screen').style.setProperty('--orb', m.orbs + 'px');
  if (m.ready) {
    worn = { hero: { ...m.worn.hero }, monster: { ...m.worn.monster } };
    tell('zoom', { value: state.zoom });
    for (const k of ['god', 'fight', 'waves']) tell(k, { value: $('#' + k).checked });
    if (state.grow) tell('grow', { value: true });
    // Sent here from the Compare page to see a monster sprite: some of them by the hero.
    if (start.mwear) tell('spawn', { part: state.part, n: 5 });
    start = { wear: null, mwear: null };
    status('Ready. Click the game and walk with WASD or the arrows.');
    renderHero();
    renderMonsters();
    syncBar();
    focusGame();
  }
  if (m.saved) {
    const { kind, role, entry } = m.saved;
    addVersion(cast, entry);
    tweaks.delete(`${kind}:${role}:${entry.from}`);
    saving = false;
    $('#saved').textContent = `Saved “${entry.name}”: it's in the ${kind === 'hero' ? roleOf('hero', role).name.toLowerCase() : roleOf('monster', role).name}'s list, and on now`;
    if (kind === 'hero') renderHero();
    else renderMonsters();
    syncBar();
  }
  if (m.wearing) {
    worn[m.wearing.kind][m.wearing.role] = m.wearing.id;
    // The sliders this sprite was left with (none for one not recoloured yet).
    tellTweak({ kind: m.wearing.kind, role: m.wearing.role, id: m.wearing.id });
    syncBar();
    const c = cast.byId.get(m.wearing.id);
    status(`${c ? c.name : 'The game\'s own'} is on the ${m.wearing.kind === 'hero' ? roleOf('hero', m.wearing.role).name.toLowerCase() : roleOf('monster', m.wearing.role).name}.`);
    if (m.wearing.kind === 'hero') renderHero();
    else {
      for (const li of document.querySelectorAll('#mon-list .row')) li.classList.toggle('on', matches(li.__cand, wornOf('monster', state.part)));
      const id = wornOf('monster', state.part);
      $('#mon-now').textContent = nameOf(id, 'monster', state.part);
      const wornIsPick = (id && !id.startsWith('game:') ? id : null) === pickOf('monster', state.part);
      $('#mon-pick').disabled = wornIsPick;
      $('#mon-pick').textContent = wornIsPick ? 'It is the pick' : 'Make it the pick';
    }
  }
  if (m.status) status(m.status);
  if (m.error) {
    status('Error in the game: ' + m.error);
    if (saving) {
      saving = false;
      $('#saved').textContent = 'Not saved! ' + m.error;
      syncBar();
    }
  }
});

function wire() {
  $('#zoom').value = state.zoom;
  $('#zoom').addEventListener('change', () => {
    state.zoom = $('#zoom').value;
    writeHash();
    tell('zoom', { value: state.zoom });
    focusGame();
  });
  // The game and its colour bar together.
  $('#full').addEventListener('click', () => $('#screen').requestFullscreen?.().then(focusGame, () => status('The browser would not go full screen.')));
  let paused = false;
  $('#pause').addEventListener('click', () => {
    paused = !paused;
    $('#pause').textContent = paused ? 'Play' : 'Pause';
    tell('pause', { value: paused });
    focusGame();
  });
  $('#restart').addEventListener('click', () => {
    tell('restart');
    focusGame();
  });
  for (const k of ['god', 'fight', 'waves']) {
    $('#' + k).addEventListener('change', () => {
      tell(k, { value: $('#' + k).checked });
      focusGame();
    });
  }
  $('#grow').checked = state.grow;
  $('#grow').addEventListener('change', () => {
    state.grow = $('#grow').checked;
    writeHash();
    tell('grow', { value: state.grow });
    renderHero();
    renderMonsters();
    focusGame();
  });
  $('#hero-pick').addEventListener('click', () => makePick('hero', state.role));
  $('#mon-pick').addEventListener('click', () => makePick('monster', state.part));
  $('#hero-source').addEventListener('change', () => {
    state.heroSource = $('#hero-source').value;
    renderHero();
  });
  let hT = 0, mT = 0;
  $('#hero-q').addEventListener('input', () => {
    clearTimeout(hT);
    hT = setTimeout(() => {
      state.heroQ = $('#hero-q').value.trim();
      renderHero();
    }, 200);
  });
  $('#part').addEventListener('change', () => {
    state.part = $('#part').value;
    writeHash();
    renderMonsters();
    syncBar();
  });
  $('#family').addEventListener('change', () => {
    state.family = $('#family').value;
    renderMonsters();
  });
  $('#hide-red').addEventListener('change', () => {
    state.hideRed = $('#hide-red').checked;
    renderMonsters();
  });
  $('#mon-q').addEventListener('input', () => {
    clearTimeout(mT);
    mT = setTimeout(() => {
      state.monQ = $('#mon-q').value.trim();
      renderMonsters();
    }, 200);
  });
  $('#mon-more').addEventListener('click', moreMonsters);
  for (const b of document.querySelectorAll('.spawn [data-n]')) {
    b.addEventListener('click', () => {
      tell('spawn', { part: state.part, n: Number(b.dataset.n) });
      focusGame();
    });
  }
  $('#clear').addEventListener('click', () => {
    tell('clear');
    focusGame();
  });
  $('#lineup').addEventListener('click', () => {
    tell('lineup', { heroes: worn.hero });
    $('#fight').checked = false;
    focusGame();
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
  buildBar();
  renderParts();
  renderFamilies();
  renderHero();
  renderMonsters();
  writeHash();
  const params = new URLSearchParams({ hero: state.role, zoom: state.zoom });
  if (start.wear && cast.byId.has(start.wear)) params.set('wear', start.wear);
  if (start.mwear && cast.byId.has(start.mwear)) {
    params.set('part', state.part);
    params.set('mwear', start.mwear);
  }
  frame.src = `stage.html?${params}`;
  requestAnimationFrame(animate);
}
main().catch((e) => ($('#saved').textContent = 'Could not start: ' + e.message));
