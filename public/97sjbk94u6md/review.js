// The hero sprite review (index.html): every version of the ranger, the sorcerer and the
// necromancer (heroes.json, laid out by tools/export-hero-review.mjs), drawn big beside the knight
// and in the game's own forest at night, with the Sprite Lab's colour bar (recolour.js). A saved
// look is kept in this browser and handed over as a short code, which is then baked into the game.
import { SLIDERS, neutral, isNeutral, recolourPixels, pickCode } from './recolour.js';

const $ = (s) => document.querySelector(s);
const status = $('#status');
const STORE = 'fs.heroSprites.v1';
const BG = { forest: '#2f3b2c', night: '#101418', light: '#d9d5c9' };
const KIND = { game: 'In the game now', study: 'Study · 14 Oct', new: 'New · 15 Oct' };

function remembered() {
  try {
    const v = JSON.parse(localStorage.getItem(STORE));
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}
const state = { data: null, pics: new Map(), hero: null, version: {}, bg: 'forest', knight: true, face: 1, zoom: 3, keep: remembered() };
state.keep.drafts = state.keep.drafts || {};
state.keep.saved = state.keep.saved || {};
let keepT = 0;
function keep() {
  clearTimeout(keepT);
  keepT = setTimeout(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(state.keep));
    } catch {
      // Private windows may refuse; the page works without it.
    }
  }, 200);
}

// ---- pictures and their colours ---------------------------------------------------------------
async function picture(file) {
  const img = new Image();
  img.src = file;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height);
  return { w: c.width, h: c.height, d: new Uint32Array(data.data.buffer.slice(0)) };
}
const packHex = (h) => (parseInt(h.slice(1, 3), 16) | (parseInt(h.slice(3, 5), 16) << 8) | (parseInt(h.slice(5, 7), 16) << 16) | (255 << 24)) >>> 0;

const heroData = () => state.data.heroes.find((h) => h.id === state.hero);
const current = () => heroData().versions.find((v) => v.id === state.version[state.hero]) || heroData().versions[0];
const draftKey = (hero, id) => `${hero}/${id}`;
const valuesOf = (hero, id) => ({ ...neutral(), ...(state.keep.drafts[draftKey(hero, id)] || {}) });
const values = () => valuesOf(state.hero, current().id);

// A version in the given colours: its pixels, and its glow layer (the colours that shine unlit).
function look(v, vals) {
  const src = state.pics.get(v.file);
  const d = recolourPixels(src.d, src.w, src.h, vals);
  let em = null;
  if (v.glow.length) {
    const glow = new Set(v.glow.map(packHex)), m = new Uint32Array(src.d.length);
    for (let i = 0; i < m.length; i++) if (glow.has(src.d[i])) m[i] = src.d[i];
    em = recolourPixels(m, src.w, src.h, vals, false);
  }
  return { w: src.w, h: src.h, d, em };
}
function toCanvas(b) {
  const c = document.createElement('canvas');
  c.width = b.w;
  c.height = b.h;
  const g = c.getContext('2d');
  const img = g.createImageData(b.w, b.h);
  new Uint32Array(img.data.buffer).set(b.d);
  g.putImageData(img, 0, 0);
  return c;
}
function bounds(b) {
  let x0 = b.w, y0 = b.h, x1 = -1, y1 = -1;
  for (let i = 0; i < b.d.length; i++) {
    if (!(b.d[i] >>> 24)) continue;
    const x = i % b.w, y = (i / b.w) | 0;
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}
// A canvas at whole device pixels per art pixel, as wide as its box allows (k at most `max`).
function fit(canvas, w, h, max) {
  const dpr = window.devicePixelRatio || 1;
  const box = Math.max(200, canvas.parentElement.clientWidth);
  const k = Math.max(1, Math.min(max, Math.floor((box * dpr) / w)));
  canvas.width = w * k;
  canvas.height = h * k;
  canvas.style.width = `${canvas.width / dpr}px`;
  canvas.style.height = `${canvas.height / dpr}px`;
  return k;
}

// ---- the big view: facing left, facing right, and the knight, on one ground line -------------------
function drawBig() {
  const v = current(), L = toCanvas(look(v, values()));
  const kn = state.knight ? state.pics.get(state.data.knight.file) : null;
  const GROUND = 44, slots = kn ? 3 : 2, W = 4 + 50 * slots, H = 50;
  const art = document.createElement('canvas');
  art.width = W;
  art.height = H;
  const a = art.getContext('2d');
  a.fillStyle = BG[state.bg];
  a.fillRect(0, 0, W, H);
  a.fillStyle = state.bg === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.25)';
  a.fillRect(0, GROUND, W, H - GROUND);
  const top = GROUND - v.anchorY;
  a.save();
  a.translate(2 + 48, top);
  a.scale(-1, 1);
  a.drawImage(L, 0, 0);
  a.restore();
  a.drawImage(L, 52, top);
  if (kn) {
    const b = bounds(kn), cx = (b.x0 + b.x1 + 1) / 2;
    a.drawImage(toCanvas(kn), Math.round(102 + 24 - cx), GROUND - state.data.knight.anchorY);
  }
  const big = $('#big'), k = fit(big, W, H, 9), g = big.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(art, 0, 0, W * k, H * k);
}

// ---- the game's own forest ------------------------------------------------------------------------
let G = null, sceneFailed = false;
async function game() {
  if (G) return G;
  const [sprites, pixels, gameMod, viewMod, profile, util] = await Promise.all([
    import('../js/engine/sprites.js'),
    import('../js/engine/pixels.js'),
    import('../js/game/game.js'),
    import('../js/engine/view.js'),
    import('../js/shared/profile.js'),
    import('../js/engine/util.js'),
  ]);
  sprites.buildSprites();
  G = { sprites, pixels, Game: gameMod.Game, view: viewMod.view, profile, util, games: {}, original: {} };
  return G;
}
function gameFor(hero) {
  if (G.games[hero]) return G.games[hero];
  const random = Math.random;
  Math.random = G.util.mulberry32(2047);
  let g;
  try {
    g = new G.Game({ hero, mode: 's15', meta: G.profile.metaBonuses(G.profile.defaultProfile()), settings: {} });
  } finally {
    Math.random = random;
  }
  g.fade = 0;
  g.time = 8;
  g.player.anim = 0;
  g.player.weapons.length = 0;
  G.original[hero] = G.sprites.SPR[hero];
  return (G.games[hero] = g);
}
// The version as a one-frame game sprite standing still, its glow drawn unlit as the game does.
function sprite(L, v, base) {
  const { Frame, bufToCanvas } = G.sprites, { flipX } = G.pixels;
  const fr = new Frame({ w: L.w, h: L.h, d: L.d }, null);
  if (L.em) {
    const e = { w: L.w, h: L.h, d: L.em };
    fr.em = bufToCanvas(e);
    fr.emf = bufToCanvas(flipX(e));
  }
  return { ...base, frames: [fr], walk: [0], idle: [0], attack: null, attackFps: 0, attackRelease: null, attackWalk: null, selfBob: true, motionRate: 1, idleRate: 4, anchorY: v.anchorY, w: L.w, h: L.h, fps: 0 };
}
async function drawScene() {
  if (sceneFailed) return;
  const note = $('#sceneNote');
  try {
    if (!G) {
      note.dataset.text = note.dataset.text || note.textContent;
      note.textContent = 'Loading the game’s forest…';
    }
    await game();
    if (note.dataset.text) note.textContent = note.dataset.text;
    const hero = state.hero, v = current(), L = look(v, values());
    const g = gameFor(hero), SPR = G.sprites.SPR, view = G.view;
    const canvas = $('#scene'), ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1, S = Math.max(1, Math.round(state.zoom * dpr));
    const box = Math.max(200, canvas.parentElement.clientWidth);
    // At least 80 world pixels high, so a tall hat or staff is never cut off on a narrow screen.
    const W = Math.max(60, Math.floor((box * dpr) / S)), H = Math.max(80, Math.min(130, Math.round(W * 0.56)));
    canvas.width = W * S;
    canvas.height = H * S;
    canvas.style.width = `${canvas.width / dpr}px`;
    canvas.style.height = `${canvas.height / dpr}px`;
    Object.assign(view, { canvas, ctx, pxW: canvas.width, pxH: canvas.height, W, H, S, zoom: 1 });
    const before = SPR[hero];
    SPR[hero] = sprite(L, v, G.original[hero]);
    try {
      g.player.face = state.face;
      g.player.moving = false;
      g.player.anim = 0;
      g.syncCam();
      g.snapCam();
      g.draw(ctx);
    } finally {
      SPR[hero] = before;
    }
  } catch (e) {
    sceneFailed = true;
    $('#sceneNote').textContent = `The game scene could not be drawn here (${e.message}). The big view above still shows every colour change.`;
    console.error(e);
  }
}

// ---- the lists --------------------------------------------------------------------------------
function drawTabs() {
  const box = $('#heroes');
  box.textContent = '';
  for (const h of state.data.heroes) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(h.id === state.hero));
    b.textContent = h.title;
    const s = document.createElement('small');
    s.textContent = h.name;
    b.append(s);
    b.addEventListener('click', () => choose(h.id));
    box.append(b);
  }
}
function thumb(v) {
  const L = toCanvas(look(v, valuesOf(state.hero, v.id)));
  const c = document.createElement('canvas'), k = 2;
  c.width = 48 * k;
  c.height = 46 * k;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = BG.forest;
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(L, 0, (44 - v.anchorY) * k - 4 * k, 48 * k, 48 * k);
  return c;
}
function drawVersions() {
  const box = $('#versions'), saved = state.keep.saved[state.hero];
  box.textContent = '';
  for (const v of heroData().versions) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ver';
    b.setAttribute('aria-pressed', String(v.id === current().id));
    b.append(thumb(v));
    const n = document.createElement('span');
    n.className = 'vn';
    n.textContent = v.name;
    const k = document.createElement('span');
    k.className = 'vk';
    k.textContent = KIND[v.kind] || v.kind;
    b.append(n, k);
    if (saved && saved.version === v.id) {
      const m = document.createElement('span');
      m.className = 'mark';
      m.textContent = 'SAVED';
      b.append(m);
    }
    b.addEventListener('click', () => {
      state.version[state.hero] = v.id;
      show();
    });
    box.append(b);
  }
}
function drawInfo() {
  const v = current();
  $('#vname').textContent = v.name;
  const k = $('#vkind');
  k.textContent = KIND[v.kind] || v.kind;
  k.className = `badge ${v.kind}`;
  $('#vdesc').textContent = v.description || '';
}

// ---- the colour bar ---------------------------------------------------------------------------------
const inputs = {};
function buildSliders() {
  const box = $('#sliders');
  for (const s of SLIDERS) {
    const wrap = document.createElement('div');
    wrap.className = 'slider';
    const top = document.createElement('div');
    top.className = 'top';
    const label = document.createElement('label');
    label.htmlFor = `s-${s.key}`;
    label.textContent = s.label;
    const out = document.createElement('output');
    out.htmlFor = `s-${s.key}`;
    top.append(label, out);
    const input = document.createElement('input');
    input.type = 'range';
    input.id = `s-${s.key}`;
    input.min = s.min;
    input.max = s.max;
    input.step = 1;
    input.value = 0;
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = s.hint;
    input.addEventListener('input', () => {
      const key = draftKey(state.hero, current().id);
      const vals = { ...values(), [s.key]: Number(input.value) };
      if (isNeutral(vals)) delete state.keep.drafts[key];
      else state.keep.drafts[key] = vals;
      keep();
      showValue(s, out, Number(input.value));
      redraw();
    });
    // A double click puts one slider back to 0.
    input.addEventListener('dblclick', () => {
      input.value = 0;
      input.dispatchEvent(new Event('input'));
    });
    wrap.append(top, input, hint);
    box.append(wrap);
    inputs[s.key] = { input, out, s };
  }
}
function showValue(s, out, n) {
  out.value = `${n > 0 ? '+' : ''}${n}${s.unit || ''}`;
  out.classList.toggle('zero', n === 0);
}
function syncSliders() {
  const vals = values();
  for (const { input, out, s } of Object.values(inputs)) {
    input.value = vals[s.key];
    showValue(s, out, vals[s.key]);
  }
}

// ---- saving -----------------------------------------------------------------------------------
function drawSaved() {
  const saved = state.keep.saved[state.hero], box = $('#savedBox');
  box.hidden = !saved;
  if (saved) {
    const v = heroData().versions.find((x) => x.id === saved.version);
    $('#savedText').textContent = `Saved for the ${heroData().title.toLowerCase()}: ${v ? v.name : saved.version}${isNeutral(saved.values) ? ', colours as drawn' : ', with your colours'}. Send this code to Claude:`;
    $('#code').value = pickCode(state.hero, saved.version, saved.values);
  }
  const list = $('#savedList');
  list.textContent = '';
  for (const h of state.data.heroes) {
    const s = state.keep.saved[h.id], li = document.createElement('li'), b = document.createElement('b');
    b.textContent = `${h.title}: `;
    li.append(b, s ? pickCode(h.id, s.version, s.values) : 'not saved yet');
    list.append(li);
  }
}
async function copy(text, button) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const t = document.createElement('textarea');
    t.value = text;
    document.body.append(t);
    t.select();
    document.execCommand('copy');
    t.remove();
  }
  const was = button.textContent;
  button.textContent = 'Copied';
  setTimeout(() => (button.textContent = was), 1200);
}
function downloadPng() {
  const v = current(), c = toCanvas(look(v, values()));
  c.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${state.hero}-${v.id}${isNeutral(values()) ? '' : '-tuned'}.png`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

// ---- putting it together ----------------------------------------------------------------------------
let frame = 0;
function redraw() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    drawBig();
    drawScene();
    // The selected card's thumbnail follows the sliders too.
    const i = heroData().versions.indexOf(current()), card = $('#versions').children[i];
    if (card) card.querySelector('canvas').replaceWith(thumb(current()));
  });
}
function show() {
  drawTabs();
  drawVersions();
  drawInfo();
  syncSliders();
  drawSaved();
  redraw();
  history.replaceState(null, '', `#${state.hero}/${current().id}`);
  state.keep.last = { hero: state.hero, version: state.version };
  keep();
}
function choose(hero) {
  state.hero = hero;
  show();
}

async function start() {
  status.textContent = 'Loading the sprites…';
  const res = await fetch('heroes.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`heroes.json: ${res.status}`);
  state.data = await res.json();
  const files = [state.data.knight.file, ...state.data.heroes.flatMap((h) => h.versions.map((v) => v.file))];
  await Promise.all(files.map(async (f) => state.pics.set(f, await picture(f))));

  const last = state.keep.last || {};
  state.version = { ...(last.version || {}) };
  const [hHero, hVersion] = decodeURIComponent(location.hash.slice(1)).split('/');
  const known = (id) => state.data.heroes.some((h) => h.id === id);
  state.hero = known(hHero) ? hHero : known(last.hero) ? last.hero : state.data.heroes[0].id;
  if (hVersion && known(hHero)) state.version[state.hero] = hVersion;

  buildSliders();
  $('#reset').addEventListener('click', () => {
    delete state.keep.drafts[draftKey(state.hero, current().id)];
    keep();
    syncSliders();
    redraw();
  });
  $('#save').addEventListener('click', () => {
    state.keep.saved[state.hero] = { version: current().id, values: values(), at: Date.now() };
    keep();
    drawVersions();
    drawSaved();
  });
  $('#copy').addEventListener('click', (e) => copy($('#code').value, e.currentTarget));
  $('#copyAll').addEventListener('click', (e) => {
    const codes = state.data.heroes.map((h) => state.keep.saved[h.id]).map((s, i) => s && pickCode(state.data.heroes[i].id, s.version, s.values)).filter(Boolean);
    if (codes.length) copy(codes.join('\n'), e.currentTarget);
  });
  $('#png').addEventListener('click', downloadPng);
  $('#bigOptions').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.bg) {
      state.bg = b.dataset.bg;
      for (const x of $('#bigOptions').querySelectorAll('button[data-bg]')) x.setAttribute('aria-pressed', String(x === b));
    } else if (b.id === 'knight') {
      state.knight = !state.knight;
      b.setAttribute('aria-pressed', String(state.knight));
    }
    redraw();
  });
  $('#sceneOptions').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.face) {
      state.face = Number(b.dataset.face);
      for (const x of $('#sceneOptions').querySelectorAll('button[data-face]')) x.setAttribute('aria-pressed', String(x === b));
    } else if (b.dataset.zoom) {
      state.zoom = Number(b.dataset.zoom);
      for (const x of $('#sceneOptions').querySelectorAll('button[data-zoom]')) x.setAttribute('aria-pressed', String(x === b));
    }
    redraw();
  });
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(redraw, 120);
  });
  status.textContent = '';
  show();
}

start().catch((e) => {
  status.className = 'err';
  status.textContent = `The page could not load: ${e.message}`;
  console.error(e);
});
