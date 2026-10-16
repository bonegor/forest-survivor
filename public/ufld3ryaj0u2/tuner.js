// The sprite tuner (index.html): every hero, monster, boss and minion the game draws, built by the
// game's own code (js/art, js/engine/sprites.js) as it ships now, under a colour tune of the
// owner's (js/art/tune.js: the sliders work on the sprite's palette colours, so a tune bakes into
// a palette override). Each is shown at 1x, at 4x and in the night's light as js/game/lighting.js
// casts it: the scene multiplied by the ambient (plus the hero's lamp, if chosen), what glows
// drawn after, unlit. Tunes are kept in this browser and handed over as "FS tune …" codes, which
// tools/bake-tune.mjs bakes into js/art/tuned.js. Nothing is sent anywhere.
import { ART } from '../js/art/defs.js';
import { PAL } from '../js/art/palette.js';
import { buildSprite, walkFrame, idleFrame } from '../js/engine/sprites.js';
import { hexPack } from '../js/engine/pixels.js';
import { mulberry32 } from '../js/engine/util.js';
import { ENEMIES } from '../js/data/enemies.js';
import { HEROES } from '../js/data/heroes.js';
import { LIGHT_COLORS } from '../js/game/lighting.js';
import { NIGHT } from '../js/game/forest.js';
import { THEMES } from '../js/game/dungeon.js';
import { GRASS } from '../js/game/darkwood.js';
import { SLIDERS, RIM, isNeutral, colourSlots, tunedDef, combine, meanLuma, tuneCode, parseTunes } from '../js/art/tune.js';

const $ = (s) => document.querySelector(s);
const status = $('#status');
const STORE = 'fs.spriteTuner.v1';
const CATS = { hero: 'Hero', monster: 'Monster', boss: 'Boss', minion: 'Minion' };
const ORDER = ['hero', 'monster', 'boss', 'minion'];
// The Necromancer's raised allies (game/minions.js), and the crypts' lord (Spawner.spawnLord).
const MINIONS = { minion: 'Raised Skeleton', legionnaire: 'Raised Death Knight' };
const LORD = 'skeletonarcher';
// Who stands beside the hero for scale, and in the group's lineup (the review's darkest first).
const REFS = ['skeleton', 'wolf', 'orc'];
const DARK = ['bat', 'spider', 'hellhound', 'deathknight', 'cultist'];

// ---- the night --------------------------------------------------------------------------------
// The night strip's grounds, each in its own light: the forest at mid-run (forest.js NIGHT), a
// crypt and the catacombs (dungeon.js THEMES; the Dungeon Run's floors are these too).
const GROUNDS = [
  { id: 'forest', name: 'Forest', ambient: NIGHT.find(([u]) => u === 0.5)[1] },
  { id: 'crypt', name: 'Crypt', ambient: THEMES.crypt.ambient },
  { id: 'catacombs', name: 'Catacombs', ambient: THEMES.catacombs.ambient },
];
// The hero's lamp (Game.draw: 'warm' at radius 125, 'white' at 46 and 0.7), d px from him, as
// lighting.js's gradient falls off.
const FALL = [[0, 1], [0.25, 0.82], [0.5, 0.48], [0.75, 0.18], [1, 0]];
function falloff(t) {
  for (let i = 1; i < FALL.length; i++) {
    if (t <= FALL[i][0]) {
      const [t0, k0] = FALL[i - 1], [t1, k1] = FALL[i];
      return k0 + ((k1 - k0) * (t - t0)) / (t1 - t0);
    }
  }
  return 0;
}
const LAMP = { dark: Infinity, lamp100: 100, lamp60: 60 };
// The light map's colour where the sprite stands: null by day (no night at all).
function lightAt(ambient, mode) {
  if (mode === 'day') return null;
  const d = LAMP[mode] ?? Infinity, warm = falloff(d / 125), white = 0.7 * falloff(d / 46);
  return ambient.map((a, i) => Math.min(255, Math.round(a + LIGHT_COLORS.warm[i] * warm + LIGHT_COLORS.white[i] * white)));
}

// A 64 px tile of each ground: the forest's oak grass (darkwood.js GRASS) in patches, the
// dungeon's floor stones (16 px, mortar between) in its theme's colours.
const TILE = 64;
const tiles = {};
function groundTile(id) {
  const c = document.createElement('canvas');
  c.width = c.height = TILE;
  const g = c.getContext('2d'), img = g.createImageData(TILE, TILE), d = new Uint32Array(img.data.buffer);
  const rnd = mulberry32(id.length * 7919 + 17);
  if (id === 'forest') {
    const cols = GRASS.oak, cell = Array.from({ length: 256 }, rnd);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const v = cell[(y >> 2) * 16 + (x >> 2)] * 0.65 + rnd() * 0.35;
        d[y * TILE + x] = cols[Math.min(cols.length - 1, Math.floor(v * cols.length))];
      }
    }
  } else {
    const th = THEMES[id], floor = th.floor.map((h) => hexPack(h)), mortar = hexPack(th.mortar);
    for (let ty = 0; ty < TILE / 16; ty++) {
      for (let tx = 0; tx < TILE / 16; tx++) {
        const base = Math.floor(rnd() * floor.length);
        for (let y = 0; y < 16; y++) {
          for (let x = 0; x < 16; x++) {
            const r = rnd(), k = Math.max(0, Math.min(floor.length - 1, base + (r < 0.08 ? -1 : r > 0.92 ? 1 : 0)));
            d[(ty * 16 + y) * TILE + tx * 16 + x] = x === 0 || y === 0 ? mortar : floor[k];
          }
        }
      }
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}
function fillGround(g, id, x, y, w, h) {
  const t = (tiles[id] ??= groundTile(id));
  for (let oy = 0; oy < h; oy += TILE) {
    for (let ox = 0; ox < w; ox += TILE) {
      const cw = Math.min(TILE, w - ox), ch = Math.min(TILE, h - oy);
      g.drawImage(t, 0, 0, cw, ch, x + ox, y + oy, cw, ch);
    }
  }
}

// ---- the sprites --------------------------------------------------------------------------------
const entries = [];
const byName = {};
function add(name, label, cat, more = {}) {
  if (!ART[name] || byName[name]) return;
  const e = { name, label, cat, def: ART[name], scale: 1, alpha: 1, fps: 6, ver: 0, ...more };
  entries.push(e);
  byName[name] = e;
}
for (const h of Object.values(HEROES)) add(h.sprite, `${h.title} · ${h.name}`, 'hero');
for (const [id, d] of Object.entries(ENEMIES)) {
  if (d.prop) continue;
  const label = d.title ? `${d.name}, ${d.title}` : id === LORD ? `${d.name} · crypt lord` : d.name;
  add(d.sprite, label, d.boss || id === LORD ? 'boss' : 'monster', { scale: d.scale || 1, alpha: d.alpha ?? 1, fps: d.anim || 4 });
}
for (const [name, label] of Object.entries(MINIONS)) add(name, label, 'minion');
entries.sort((a, b) => ORDER.indexOf(a.cat) - ORDER.indexOf(b.cat));

// ---- what the owner has done (kept in this browser) ------------------------------------------------
const clampN = (v, s) => Math.max(s.min, Math.min(s.max, Math.round(v)));
const HEX = /^#[0-9a-f]{6}$/i;
// A tune as stored: only the sliders moved, a valid ink and rim. Anything else is dropped.
function cleanTune(t) {
  const o = {};
  if (!t || typeof t !== 'object') return o;
  for (const s of SLIDERS) if (Number.isFinite(t[s.key]) && Math.round(t[s.key])) o[s.key] = clampN(t[s.key], s);
  if (typeof t.ink === 'string' && HEX.test(t.ink)) o.ink = t.ink.toLowerCase();
  if (t.rim === false || (typeof t.rim === 'string' && HEX.test(t.rim))) o.rim = t.rim && t.rim.toLowerCase();
  return o;
}
function remembered() {
  try {
    const v = JSON.parse(localStorage.getItem(STORE));
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}
const kept = remembered();
const state = {
  own: {},
  group: cleanTune(kept.group),
  scope: { monster: true, boss: false, minion: false, hero: false, ...(kept.scope || {}) },
  sel: byName[kept.sel] ? kept.sel : 'spider',
  tab: kept.tab === 'group' ? 'group' : 'one',
  light: ['day', 'dark', 'lamp100', 'lamp60'].includes(kept.light) ? kept.light : 'dark',
  filter: kept.filter || 'all',
  animate: !!kept.animate,
  hero: byName[kept.hero]?.cat === 'hero' ? kept.hero : 'knight',
};
for (const [n, t] of Object.entries(kept.own || {})) if (byName[n]) state.own[n] = cleanTune(t);
let keepT = 0;
function keep() {
  clearTimeout(keepT);
  keepT = setTimeout(() => {
    try {
      const { own, group, scope, sel, tab, light, filter, animate, hero } = state;
      localStorage.setItem(STORE, JSON.stringify({ own, group, scope, sel, tab, light, filter, animate, hero }));
    } catch {
      // A private window may refuse; the page works without it.
    }
  }, 250);
}

const inScope = (e) => !!state.scope[e.cat];
const effective = (e) => combine(inScope(e) ? state.group : null, state.own[e.name]);
const changed = (e) => !isNeutral(e.tune);
const shippedInk = (e) => (e.inkSlot ? (e.def.palette?.[e.inkSlot.key] || e.inkSlot.from).toLowerCase() : null);

// ---- building -------------------------------------------------------------------------------------
// The mean luma of a built sprite's pixels, its ink and rim left out.
function lumaOf(e, spr, def) {
  const skip = new Set();
  if (e.inkSlot) skip.add(hexPack(def.palette?.[e.inkSlot.key] || e.inkSlot.from));
  if (def.rim) skip.add(hexPack(def.rim));
  return meanLuma(spr.frames.map((f) => f.buf), skip);
}
// The frames a card cycles through (walk, or every frame) and stands in (idle).
const shownFrames = (spr) => [...new Set([...(spr.idle || [0]), ...(spr.walk || spr.frames.map((_, i) => i))])].map((i) => spr.frames[i]);
function boxOf(spr) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const f of shownFrames(spr)) {
    const { w, h, d } = f.buf;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!(d[y * w + x] >>> 24)) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) [x0, y0, x1, y1] = [0, 0, spr.w - 1, spr.h - 1];
  // Down to the feet at least, so every sprite stands on the ground line.
  y1 = Math.max(y1, Math.min(spr.h - 1, spr.anchorY));
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1, foot: spr.anchorY - y0 };
}
function build(e) {
  if (!e.slots) {
    e.slots = colourSlots(e.def);
    e.inkSlot = e.slots.find((s) => s.ink) || null;
    e.shipped = buildSprite(e.name, e.def);
    e.shippedBox = boxOf(e.shipped);
    e.lumaBefore = lumaOf(e, e.shipped, e.def);
  }
  e.tune = effective(e);
  if (isNeutral(e.tune)) {
    e.tdef = e.def;
    e.tuned = e.shipped;
    e.lumaAfter = e.lumaBefore;
  } else {
    e.tdef = tunedDef(e.def, e.tune, e.slots);
    e.tuned = buildSprite(e.name, e.tdef);
    e.lumaAfter = lumaOf(e, e.tuned, e.tdef);
  }
  e.box = boxOf(e.tuned);
  e.ver++;
}

// ---- drawing --------------------------------------------------------------------------------------
let clock = 0;
function frameOf(e, spr) {
  if (!state.animate) return idleFrame(spr, 0);
  // Heroes step as the Player's clock does on the move; the rest at their own pace (enemies.js).
  const rate = e.cat === 'hero' ? 9.8 * 1.4 * spr.motionRate : e.fps;
  return walkFrame(spr, Math.floor(clock * rate));
}
function sized(canvas, w, h) {
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  return g;
}
// A frame's box drawn at (x, y), `k` times its size; `em`: its glowing part only.
function drawBox(g, fr, box, x, y, k = 1, em = false) {
  const src = em ? fr.em : fr.c;
  if (src) g.drawImage(src, box.x0, box.y0, box.w, box.h, Math.round(x), Math.round(y), Math.round(box.w * k), Math.round(box.h * k));
}
const scratch = document.createElement('canvas');
// The night strip: the frame on each ground, in its light, at the largest whole zoom (up to 3)
// that fits maxW.
function drawStrip(canvas, e, fr, box, maxW) {
  const PX = 5, PT = 4, PB = 4, GAP = 2;
  const sw = box.w + 2 * PX, sh = box.h + PT + PB, W = sw * GROUNDS.length + GAP * (GROUNDS.length - 1);
  const z = Math.max(1, Math.min(3, Math.floor(maxW / W)));
  const g = sized(scratch, W, sh);
  g.clearRect(0, 0, W, sh);
  GROUNDS.forEach((gr, i) => {
    const x = i * (sw + GAP);
    fillGround(g, gr.id, x, 0, sw, sh);
    g.globalAlpha = e.alpha;
    drawBox(g, fr, box, x + PX, PT);
    g.globalAlpha = 1;
    const L = lightAt(gr.ambient, state.light);
    if (!L) return;
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = `rgb(${L[0]},${L[1]},${L[2]})`;
    g.fillRect(x, 0, sw, sh);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = e.alpha;
    drawBox(g, fr, box, x + PX, PT, 1, true);
    g.globalAlpha = 1;
  });
  const out = sized(canvas, W * z, sh * z);
  out.clearRect(0, 0, W * z, sh * z);
  out.drawImage(scratch, 0, 0, W, sh, 0, 0, W * z, sh * z);
  canvas.title = GROUNDS.map((gr) => `${gr.name}: light ${lightAt(gr.ambient, state.light) || 'none (day)'}`).join(' · ');
}

const lumaClass = (v) => (v < 90 ? 'low' : v < 110 ? 'mid' : 'ok');
function lumaHtml(el, before, after) {
  el.textContent = '';
  const b = document.createElement('b');
  b.textContent = Math.round(before);
  b.className = lumaClass(before);
  el.append('luma ', b);
  if (Math.round(before) !== Math.round(after)) {
    const a = document.createElement('b');
    a.textContent = Math.round(after);
    a.className = lumaClass(after);
    el.append(' → ', a);
  }
}

function makeCard(e) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'spr';
  card.setAttribute('aria-pressed', 'false');
  const top = document.createElement('div');
  top.className = 'top';
  const nm = document.createElement('span');
  nm.className = 'nm';
  nm.textContent = e.label;
  const sz = document.createElement('span');
  sz.className = 'sz';
  top.append(nm, sz);
  const pics = document.createElement('div');
  pics.className = 'pics';
  const one = document.createElement('canvas');
  one.className = 'one';
  one.title = '1×: one pixel a pixel, as the art is drawn';
  const four = document.createElement('canvas');
  four.title = '4×';
  pics.append(one, four);
  const strip = document.createElement('canvas');
  strip.className = 'strip';
  const foot = document.createElement('div');
  foot.className = 'foot';
  const luma = document.createElement('span');
  luma.className = 'luma';
  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = 'tuned';
  foot.append(luma, tag);
  card.append(top, pics, strip, foot);
  card.addEventListener('click', () => select(e.name));
  e.el = { card, sz, one, four, strip, luma, tag };
  return card;
}
function drawCard(e) {
  const spr = e.tuned, fr = frameOf(e, spr), key = `${e.ver}|${spr.frames.indexOf(fr)}|${state.light}`;
  if (e.el.key === key) return;
  e.el.key = key;
  const { box } = e;
  let g = sized(e.el.one, box.w, box.h);
  g.clearRect(0, 0, box.w, box.h);
  drawBox(g, fr, box, 0, 0);
  e.el.one.style.width = `${box.w}px`;
  g = sized(e.el.four, box.w * 4, box.h * 4);
  g.clearRect(0, 0, box.w * 4, box.h * 4);
  drawBox(g, fr, box, 0, 0, 4);
  e.el.four.style.width = `${box.w * 4}px`;
  drawStrip(e.el.strip, e, fr, box, 228);
  e.el.strip.style.width = `${e.el.strip.width}px`;
  e.el.sz.textContent = `${spr.w}×${spr.h}${e.scale !== 1 ? ` ×${e.scale}` : ''}`;
  e.el.sz.title = `Each frame ${spr.w}×${spr.h} px, ${spr.frames.length} frame${spr.frames.length === 1 ? '' : 's'}${e.scale !== 1 ? `, drawn ${e.scale} times as large in the game` : ''}`;
  lumaHtml(e.el.luma, e.lumaBefore, e.lumaAfter);
  e.el.tag.classList.toggle('hidden', !changed(e));
}

// The panel's before and after, in the chosen light.
let panelKey = '';
function drawCompare() {
  if (state.tab === 'group') return;
  const e = byName[state.sel], a = frameOf(e, e.shipped), b = frameOf(e, e.tuned);
  const key = `${e.name}|${e.ver}|${e.shipped.frames.indexOf(a)}|${e.tuned.frames.indexOf(b)}|${state.light}`;
  if (key === panelKey) return;
  panelKey = key;
  const maxW = Math.max(200, $('#compare').clientWidth || 360);
  drawStrip($('#before'), e, a, e.shippedBox, maxW);
  drawStrip($('#after'), e, b, e.box, maxW);
  $('#lumaBefore').textContent = Math.round(e.lumaBefore);
  $('#lumaBefore').className = lumaClass(e.lumaBefore);
  $('#lumaAfter').textContent = Math.round(e.lumaAfter);
  $('#lumaAfter').className = lumaClass(e.lumaAfter);
}

// The hero beside the sprite (or the group's darkest) and a few monsters, at their sizes in the
// game, feet on one line, over the forest in the chosen light.
let lineupKey = '';
function drawLineup() {
  const hero = byName[state.hero];
  let others;
  if (state.tab === 'group') others = DARK.map((n) => byName[n]).filter((e) => e && inScope(e)).slice(0, 4);
  else others = [byName[state.sel]];
  if (!others.length) others = REFS.map((n) => byName[n]);
  const list = [...new Set([hero, ...others, ...REFS.map((n) => byName[n])])].filter(Boolean).slice(0, 5);
  const frames = list.map((e) => frameOf(e, e.tuned));
  const key = `${list.map((e, i) => `${e.name}.${e.ver}.${e.tuned.frames.indexOf(frames[i])}`).join(',')}|${state.light}`;
  if (key === lineupKey) return;
  lineupKey = key;
  const GAP = 8, M = 6;
  const above = Math.max(...list.map((e) => Math.ceil(e.box.foot * e.scale)));
  const below = Math.max(...list.map((e) => Math.ceil((e.box.h - e.box.foot) * e.scale)));
  const W = list.reduce((s, e) => s + Math.round(e.box.w * e.scale), 0) + GAP * (list.length - 1) + 2 * M;
  const H = above + below + 2 * M, ground = M + above;
  const g = sized(scratch, W, H);
  fillGround(g, 'forest', 0, 0, W, H);
  const L = lightAt(GROUNDS[0].ambient, state.light);
  const place = [];
  let x = M;
  list.forEach((e, i) => {
    const w = Math.round(e.box.w * e.scale), y = ground - Math.round(e.box.foot * e.scale);
    place.push([e, frames[i], x, y]);
    g.globalAlpha = e.alpha;
    drawBox(g, frames[i], e.box, x, y, e.scale);
    g.globalAlpha = 1;
    x += w + GAP;
  });
  if (L) {
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = `rgb(${L[0]},${L[1]},${L[2]})`;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    for (const [e, fr, px, py] of place) {
      g.globalAlpha = e.alpha;
      drawBox(g, fr, e.box, px, py, e.scale, true);
      g.globalAlpha = 1;
    }
  }
  const canvas = $('#lineup'), z = Math.max(1, Math.min(4, Math.floor(Math.max(200, canvas.parentElement.clientWidth || 360) / W)));
  const out = sized(canvas, W * z, H * z);
  out.drawImage(scratch, 0, 0, W, H, 0, 0, W * z, H * z);
  canvas.style.width = `${W * z}px`;
  canvas.title = list.map((e) => e.label).join(', ');
}

// ---- the tools ---------------------------------------------------------------------------------------
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
      const t = target(), v = Number(input.value);
      if (v) t[s.key] = v;
      else delete t[s.key];
      showValue(s, out, v);
      touched();
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
// What the tools edit: the selected sprite's own tune, or the group's.
function target() {
  if (state.tab === 'group') return state.group;
  return (state.own[state.sel] ??= {});
}
function tidy() {
  for (const [n, t] of Object.entries(state.own)) if (!Object.keys(t).length) delete state.own[n];
}

let dirty = new Set();
let pending = 0;
// Something was tuned: rebuild what it touches, then draw.
function touched(all = false) {
  if (all || state.tab === 'group') for (const e of entries) dirty.add(e);
  else dirty.add(byName[state.sel]);
  tidy();
  keep();
  if (pending) return;
  pending = requestAnimationFrame(() => {
    pending = 0;
    for (const e of dirty) build(e);
    dirty = new Set();
    redraw();
  });
}

function syncTools() {
  const group = state.tab === 'group', e = byName[state.sel];
  $('#tabOne').setAttribute('aria-selected', String(!group));
  $('#tabGroup').setAttribute('aria-selected', String(group));
  $('#compare').classList.toggle('hidden', group);
  $('#scope').classList.toggle('hidden', !group);
  $('#codeRow').classList.toggle('hidden', group);
  $('#reset').textContent = group ? 'Reset the group' : 'Reset this sprite';
  const t = group ? state.group : state.own[state.sel] || {};
  for (const { input, out, s } of Object.values(inputs)) {
    input.value = t[s.key] || 0;
    showValue(s, out, t[s.key] || 0);
  }
  for (const box of $('#scope').querySelectorAll('input[data-scope]')) box.checked = !!state.scope[box.dataset.scope];
  const ink = $('#ink'), rim = $('#rim'), rimColour = $('#rimColour');
  if (group) {
    const n = entries.filter(inScope).length;
    $('#pname').textContent = 'All monsters';
    $('#pcat').textContent = 'Group';
    $('#pdesc').textContent = `These sliders tune ${n} sprite${n === 1 ? '' : 's'} at once, on top of each one's own.`;
    ink.disabled = false;
    ink.value = state.group.ink || PAL.k;
    $('#inkNote').textContent = state.group.ink ? '' : 'As shipped (the game\'s ink).';
    rim.checked = !!state.group.rim;
    if (state.group.rim) rimColour.value = state.group.rim;
  } else {
    const spr = e.tuned;
    $('#pname').textContent = e.label;
    $('#pcat').textContent = CATS[e.cat];
    $('#pdesc').textContent = `${spr.w}×${spr.h} px · ${spr.frames.length} frame${spr.frames.length === 1 ? '' : 's'} · ${e.slots.length} colour${e.slots.length === 1 ? '' : 's'}${e.scale !== 1 ? ` · drawn ×${e.scale} in the game` : ''}${inScope(e) && !isNeutral(state.group) ? ' · the group\'s tune applies too' : ''}`;
    ink.disabled = !e.inkSlot;
    ink.value = e.tune.ink || shippedInk(e) || PAL.k;
    $('#inkNote').textContent = !e.inkSlot ? 'Drawn without a one-colour outline: nothing to swap.' : e.tune.ink ? '' : 'As shipped.';
    const r = e.tune.rim !== undefined ? e.tune.rim : e.def.rim || false;
    rim.checked = !!r;
    if (r) rimColour.value = r;
    $('#code').value = changed(e) ? tuneCode(e.name, e.tune) : '';
    $('#code').placeholder = 'As shipped: nothing to bake';
  }
  $('#inkReset').disabled = group ? !state.group.ink : !e.inkSlot || !(state.own[state.sel] || {}).ink;
}
function drawSummary() {
  const list = entries.filter(changed);
  $('#count').textContent = `${entries.length} sprites · ${list.length} changed`;
  $('#summary').textContent = list.length ? `Changed: ${list.map((e) => e.label).join(', ')}.` : 'Nothing changed yet.';
  $('#copyAll').disabled = !list.length;
  for (const e of entries) {
    e.el.card.setAttribute('aria-pressed', String(state.tab === 'one' && e.name === state.sel));
    const f = state.filter;
    e.el.card.classList.toggle('hidden', !(f === 'all' || f === e.cat || (f === 'changed' && changed(e))));
  }
}
function redraw() {
  syncTools();
  drawSummary();
  for (const e of entries) drawCard(e);
  drawCompare();
  drawLineup();
}

function select(name) {
  state.sel = name;
  state.tab = 'one';
  panelKey = '';
  history.replaceState(null, '', `#${name}`);
  keep();
  redraw();
  if (window.matchMedia('(max-width: 1000px)').matches) $('#tools').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---- codes ---------------------------------------------------------------------------------------
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
// Everything changed, as one blob: `codes` for the bake (each sprite's whole tune, the group's
// included), the rest to bring this page back exactly.
function allChanges() {
  return JSON.stringify({
    fsTune: 1,
    about: 'Sprite tuner changes. Bake: node tools/bake-tune.mjs <a file with this in it>',
    codes: entries.filter(changed).map((e) => tuneCode(e.name, e.tune)),
    group: state.group,
    scope: Object.keys(state.scope).filter((k) => state.scope[k]),
    own: state.own,
  }, null, 2);
}
// What was pasted: the blob (restored exactly), or codes (each sprite tuned to its code, the
// group's part taken off its own).
function restore(text) {
  let blob = null;
  try {
    if (text.trim().startsWith('{')) blob = JSON.parse(text);
  } catch {
    return 'That is not valid JSON.';
  }
  if (blob && blob.own && typeof blob.own === 'object') {
    state.own = {};
    for (const [n, t] of Object.entries(blob.own)) if (byName[n]) state.own[n] = cleanTune(t);
    state.group = cleanTune(blob.group);
    if (Array.isArray(blob.scope)) for (const k of Object.keys(state.scope)) state.scope[k] = blob.scope.includes(k);
    touched(true);
    return `Restored ${Object.keys(state.own).length} sprite${Object.keys(state.own).length === 1 ? '' : 's'} and the group.`;
  }
  const { tunes, bad } = parseTunes(text), unknown = [];
  let n = 0;
  for (const { name, tune } of tunes) {
    const e = byName[name];
    if (!e) {
      unknown.push(name);
      continue;
    }
    const g = inScope(e) ? state.group : {}, own = {};
    for (const s of SLIDERS) {
      const v = clampN((tune[s.key] || 0) - (g[s.key] || 0), s);
      if (v) own[s.key] = v;
    }
    if (tune.ink) own.ink = tune.ink;
    if (tune.rim !== undefined) own.rim = tune.rim;
    state.own[name] = own;
    n++;
  }
  touched(true);
  return [
    n ? `Restored ${n} sprite${n === 1 ? '' : 's'}.` : 'No codes found.',
    unknown.length ? `Not on this page: ${unknown.join(', ')}.` : '',
    bad.length ? `Could not read: ${bad.join(' | ')}` : '',
  ].filter(Boolean).join(' ');
}

// ---- putting it together ----------------------------------------------------------------------------
let raf = 0;
function tick(now) {
  raf = 0;
  clock = now / 1000;
  for (const e of entries) if (!e.el.card.classList.contains('hidden')) drawCard(e);
  drawCompare();
  drawLineup();
  if (state.animate) raf = requestAnimationFrame(tick);
}
function pressed(box, attr, value) {
  for (const b of box.querySelectorAll(`button[${attr}]`)) b.setAttribute('aria-pressed', String(b.getAttribute(attr) === value));
}

async function start() {
  status.textContent = 'Building the sprites…';
  await new Promise((r) => setTimeout(r));
  const hash = decodeURIComponent(location.hash.slice(1));
  if (byName[hash]) state.sel = hash;
  const grid = $('#grid');
  for (const e of entries) {
    build(e);
    grid.append(makeCard(e));
  }
  for (const e of entries.filter((x) => x.cat === 'hero')) {
    const o = document.createElement('option');
    o.value = e.name;
    o.textContent = e.label;
    $('#hero').append(o);
  }
  $('#hero').value = state.hero;
  buildSliders();

  $('#light').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-light]');
    if (!b) return;
    state.light = b.dataset.light;
    pressed($('#light'), 'data-light', state.light);
    keep();
    redraw();
  });
  $('#filter').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-filter]');
    if (!b) return;
    state.filter = b.dataset.filter;
    pressed($('#filter'), 'data-filter', state.filter);
    keep();
    redraw();
  });
  $('#animate').addEventListener('click', () => {
    state.animate = !state.animate;
    $('#animate').setAttribute('aria-pressed', String(state.animate));
    keep();
    if (state.animate && !raf) raf = requestAnimationFrame(tick);
    if (!state.animate) redraw();
  });
  $('#tabOne').addEventListener('click', () => select(state.sel));
  $('#tabGroup').addEventListener('click', () => {
    state.tab = 'group';
    lineupKey = '';
    keep();
    redraw();
  });
  $('#scope').addEventListener('change', (ev) => {
    const box = ev.target.closest('input[data-scope]');
    if (!box) return;
    state.scope[box.dataset.scope] = box.checked;
    touched(true);
  });
  $('#ink').addEventListener('input', () => {
    const t = target(), v = $('#ink').value.toLowerCase();
    const base = state.tab === 'group' ? PAL.k : (inScope(byName[state.sel]) && state.group.ink) || shippedInk(byName[state.sel]);
    if (v === base) delete t.ink;
    else t.ink = v;
    touched();
  });
  $('#inkReset').addEventListener('click', () => {
    delete target().ink;
    touched();
  });
  const rimChanged = () => {
    const t = target(), want = $('#rim').checked ? $('#rimColour').value.toLowerCase() : false;
    if (state.tab === 'group') {
      if (want) t.rim = want;
      else delete t.rim;
    } else {
      const e = byName[state.sel], g = inScope(e) ? state.group.rim : undefined;
      const base = g !== undefined ? g : e.def.rim || false;
      if (want === base) delete t.rim;
      else t.rim = want;
    }
    touched();
  };
  $('#rim').addEventListener('change', rimChanged);
  $('#rimColour').addEventListener('input', () => {
    if ($('#rim').checked) rimChanged();
  });
  $('#reset').addEventListener('click', () => {
    if (state.tab === 'group') state.group = {};
    else delete state.own[state.sel];
    touched(state.tab === 'group');
  });
  $('#resetAll').addEventListener('click', () => {
    if (!confirm('Put every sprite back as shipped, and the group too?')) return;
    state.own = {};
    state.group = {};
    touched(true);
  });
  $('#copy').addEventListener('click', (ev) => {
    if ($('#code').value) copy($('#code').value, ev.currentTarget);
  });
  $('#copyAll').addEventListener('click', (ev) => copy(allChanges(), ev.currentTarget));
  $('#restore').addEventListener('click', () => {
    $('#pasteNote').textContent = restore($('#pasteText').value);
  });
  $('#hero').addEventListener('change', () => {
    state.hero = $('#hero').value;
    keep();
    drawLineup();
  });
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      panelKey = lineupKey = '';
      redraw();
    }, 150);
  });

  pressed($('#light'), 'data-light', state.light);
  pressed($('#filter'), 'data-filter', state.filter);
  $('#animate').setAttribute('aria-pressed', String(state.animate));
  status.textContent = '';
  redraw();
  if (state.animate) raf = requestAnimationFrame(tick);
  // For checking the page headlessly: the state, codes in and out, the luma.
  window.__tuner = { state, entries: byName, allChanges, restore, code: (n) => tuneCode(n, byName[n].tune), RIM };
}

start().catch((e) => {
  status.className = 'err';
  status.textContent = `The page could not load: ${e.message}`;
  console.error(e);
});
