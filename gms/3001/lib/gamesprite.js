// Any candidate (lib/cast.js) as a sprite the game itself draws: the shape buildSprite in
// public/js/engine/sprites.js gives, frames of the game's own Frame class with walk, idle and
// attack lists and the row the feet stand on, so the lab can put it straight into the game.
//
// The game's own sprites are used as they are, and the proposals made for the game as they
// were drawn. Scouted sprites are first redrawn in the game's pixels at the height of the part
// they play (lib/redraw.js); then every frame is placed as the game places its own: the resting
// body in the middle of the frame (the game centres frames on the feet, and mirrors them to
// face left), the feet on the frame's last row for a monster, on its anchor row for a hero.
// Views drawn facing left stay as drawn instead of being mirrored.
import { Frame, SPR } from '/game/js/engine/sprites.js';
import { NAMES, findAnim, defaultAnim, pickView, viewBox, visibleBox, standGap, bodyShift, frameNudge, emptyView, drawable, isReady, img, views } from './sprites.js';
import { redrawn } from './redraw.js';

// The attack each class's heroes are shown with, as the scouts sorted them.
const HERO_ATTACK = {
  knight: ['attack', 'slash', 'attack2', 'thrust', 'cast', 'shoot'],
  ranger: ['shoot', 'attack', 'thrust', 'cast'],
  mage: ['cast', 'attack', 'shoot', 'thrust'],
  rogue: ['attack', 'thrust', 'attack2', 'shoot', 'cast'],
  necro: ['cast', 'attack', 'thrust', 'shoot'],
};

const sheetsOf = (set) => [...new Set(Object.values(set.anims || {}).flatMap((a) => views(a).flatMap((v) => v.frames.map((f) => f[4])).filter((s) => typeof s === 'string')))];
const loadSheets = (set) => Promise.all(sheetsOf(set).map((u) => (isReady(img(u)) ? null : img(u).decode().catch(() => null))));

export function animsOf(set) {
  const idle = defaultAnim(set);
  const move = findAnim(set, NAMES.move) || idle;
  const attack = set.kind === 'hero' ? findAnim(set, HERO_ATTACK[set.cls] || NAMES.attack) || findAnim(set, NAMES.attack) : findAnim(set, NAMES.attack);
  return { idle, move, attack, hurt: findAnim(set, NAMES.hurt), death: findAnim(set, NAMES.death) };
}

// ------------------------------------------------- placing scouted frames --

// The view of an animation drawn facing `dir`; one whose frames are all empty shows the resting one.
function resolve(view, A, name, dir) {
  let anim = view.anims[name];
  if (!anim) return null;
  let { v, flip } = pickView(view, anim, dir);
  if (v && emptyView(v) && view.anims[A.idle]) {
    anim = view.anims[A.idle];
    ({ v, flip } = pickView(view, anim, dir));
  }
  return v && v.frames && v.frames.length ? { anim, v, flip } : null;
}
// Where frame i goes with the feet at (x, y): the resting body centred on x, the lowest pixel on the row above y.
function place(view, r, dir, i, x, y) {
  const Yd = Math.round(y) + standGap(r.v);
  const X = Math.round(Math.round(x) + bodyShift(view, dir) + frameNudge(r.v, i, r.flip));
  return { X, T: Math.round(Yd - r.v.ay), L: r.flip ? Math.round(-r.v.ax) : Math.round(X - r.v.ax) };
}
function drawAt(ctx, view, r, dir, i, x, y) {
  const p = place(view, r, dir, i, x, y), [sx, sy, sw, sh, own] = r.v.frames[i], im = drawable(own || r.v.src);
  if (!isReady(im)) return;
  if (r.flip) {
    ctx.save();
    ctx.translate(p.X, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(im, sx, sy, sw, sh, p.L, p.T, sw, sh);
    ctx.restore();
  } else ctx.drawImage(im, sx, sy, sw, sh, p.L, p.T, sw, sh);
}
const boxes = new WeakMap();
let reader = null;
function cellBox(v, i) {
  const [sx, sy, sw, sh, src] = v.frames[i];
  const key = typeof src === 'string' ? null : src;
  if (key && boxes.has(key)) return boxes.get(key);
  reader ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (reader.canvas.width < sw || reader.canvas.height < sh) {
    reader.canvas.width = Math.max(reader.canvas.width, sw);
    reader.canvas.height = Math.max(reader.canvas.height, sh);
  }
  reader.clearRect(0, 0, sw, sh);
  reader.drawImage(drawable(src), sx, sy, sw, sh, 0, 0, sw, sh);
  const d = reader.getImageData(0, 0, sw, sh).data;
  let x0 = sw, x1 = -1, y0 = sh, y1 = -1;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (d[(y * sw + x) * 4 + 3] < 24) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  const b = x1 < 0 ? null : { x0, x1, y0, y1 };
  if (key) boxes.set(key, b);
  return b;
}
function rectAt(view, r, dir, i) {
  const b = cellBox(r.v, i);
  if (!b) return null;
  const p = place(view, r, dir, i, 0, 0);
  const [l, rr] = r.flip ? [p.X - p.L - b.x1 - 1, p.X - p.L - b.x0] : [p.L + b.x0, p.L + b.x1 + 1];
  return { l, r: rr, t: p.T + b.y0, b: p.T + b.y1 + 1 };
}
const liveFrames = (v) => viewBox(v)?.live ?? v.frames.map((_, i) => i);
const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

// Some animations' frames as the game's frames, all in one box. Returns the frames, which of
// them each animation plays, and the row the feet stand on.
function bake(view, A, names, monster) {
  const items = [];
  for (const name of new Set(names)) {
    const R = resolve(view, A, name, 'right');
    if (!R) continue;
    const L = pickView(view, R.anim, 'left');
    const left = L.v && !L.flip && L.v !== R.v ? { anim: R.anim, v: L.v, flip: false } : null;
    const live = liveFrames(R.v), liveL = left ? liveFrames(left.v) : null;
    const paired = left && liveL.length === live.length;
    live.forEach((i, k) => items.push({ name, r: R, i, l: paired ? left : null, li: paired ? liveL[k] : -1 }));
  }
  let l = 0, r = 0, t = -1, b = 0;
  for (const it of items) {
    for (const q of [rectAt(view, it.r, 'right', it.i), it.l ? rectAt(view, it.l, 'left', it.li) : null]) {
      if (!q) continue;
      l = Math.min(l, q.l);
      r = Math.max(r, q.r);
      t = Math.min(t, q.t);
      b = Math.max(b, q.b);
    }
  }
  const half = Math.max(-l, r, 2) + 1, W = half * 2, x0 = half, y0 = -t;
  // A monster's frame ends at its feet (the game stands its frames' last row on the ground); a hero's may reach below.
  const H = monster ? y0 : y0 + Math.max(0, b);
  const draw = (rr, dir, i) => {
    const c = canvas(W, H), g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    drawAt(g, view, rr, dir, i, x0, y0);
    return c;
  };
  const lists = {}, frames = [];
  items.forEach((it, k) => {
    const c = draw(it.r, 'right', it.i);
    const fr = new Frame({ w: W, h: H, d: new Uint32Array(c.getContext('2d').getImageData(0, 0, W, H).data.buffer) });
    if (it.l) fr.cf = draw(it.l, 'left', it.li);
    frames.push(fr);
    (lists[it.name] ??= []).push(k);
  });
  return { frames, lists, W, H, foot: y0 };
}

const fpsOf = (set, name) => (name && set.anims[name] ? set.anims[name].fps || 8 : 8);
// As the game's buildSprite makes them: attackRelease null (not undefined) means "no bow pose"
// to the ranger's animation (public/js/game/ranger-animation.js).
const shell = (name, frames, W, H, more) => ({ name, frames, walk: null, idle: null, motionRate: 1, idleRate: 4, attack: null, attackFps: 0, attackRelease: null, attackWalk: null, selfBob: false, anchorY: H - 1, fitW: W, fitH: H, fps: 0, hires: 1, small: null, picture: null, w: W, h: H, ...more });

// A scouted set as the game's sprite: as a hero (idle, walk and attack), or as a monster (its
// walk, which the game plays round and round), redrawn `height` game pixels tall.
async function scoutSprite(cand, as, height) {
  const set = cand.set;
  await loadSheets(set);
  const A0 = animsOf(set);
  set.gameH = height || 0;
  // A monster only ever walks in the game: its walk, not its rest, stands as tall as its part.
  if (as === 'monster' && height && A0.move !== A0.idle) {
    const rest = visibleBox(set), walk = pickView(set, set.anims[A0.move], 'right').v, wb = walk && viewBox(walk);
    if (rest && wb && wb.h) set.gameH = Math.max(4, Math.round((height * rest.h) / wb.h));
  }
  return bakeSet(cand.id, set, as);
}

function bakeSet(name, set, as) {
  const view = redrawn(set, set.redrawOpts);
  if (!view) throw new Error(`${set.name}: its sheets did not load`);
  const A = animsOf(set);
  const cand = { id: name };
  if (as === 'hero') {
    const k = bake(view, A, [A.idle, A.move, A.attack].filter(Boolean), false);
    const idle = k.lists[A.idle] || [0], walk = k.lists[A.move] || idle;
    // The game steps its walk 9.8 times a second at motionRate 1, and its rest 1.6 times at idleRate 1.
    return shell(cand.id, k.frames, k.W, k.H, { idle, walk, attack: A.attack ? k.lists[A.attack] || null : null, attackFps: A.attack ? fpsOf(set, A.attack) : 0, motionRate: fpsOf(set, A.move) / 9.8, idleRate: fpsOf(set, A.idle) / 1.6, selfBob: true, anchorY: k.foot });
  }
  const k = bake(view, A, [A.move], true);
  return shell(cand.id, k.frames, k.W, k.H, { animFps: fpsOf(set, A.move) });
}

// A proposal made for the game, or a version saved from the colour bar, from its sheet (frames
// left to right, already in the game's pixels). A saved version's sheet may have more rows
// (e.rows): the frames drawn facing left ('left') and the glow layers ('glow', 'glowLeft').
const sheets = new Map();
async function labSprite(cand) {
  const e = cand.lab, url = '/sprites/lab/' + e.sheet;
  let im = sheets.get(url);
  if (!im) {
    im = new Image();
    im.src = url;
    sheets.set(url, im);
  }
  await im.decode();
  const rows = e.rows || ['right'];
  const cut = (k, row) => {
    const c = canvas(e.w, e.h), g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, k * e.w, rows.indexOf(row) * e.h, e.w, e.h, 0, 0, e.w, e.h);
    return c;
  };
  const frames = [];
  for (let k = 0; k < e.frames; k++) {
    const c = cut(k, 'right');
    const fr = new Frame({ w: e.w, h: e.h, d: new Uint32Array(c.getContext('2d').getImageData(0, 0, e.w, e.h).data.buffer) });
    if (rows.includes('left')) fr.cf = cut(k, 'left');
    if (rows.includes('glow')) {
      fr.em = cut(k, 'glow');
      fr.emf = cut(k, 'glowLeft');
    }
    frames.push(fr);
  }
  // A ranger's bow pose needs its release frame, and its shots on the move their own frames.
  const release = Number.isInteger(e.attackRelease) && e.attack && e.attackRelease < e.attack.length ? e.attackRelease : null;
  const walking = release !== null && Array.isArray(e.attackWalk) && e.attackWalk.length === e.attack.length && e.attackWalk.every((r) => Array.isArray(r) && r.length >= (e.walk || []).length) ? e.attackWalk : null;
  return shell(cand.id, frames, e.w, e.h, { walk: e.walk, idle: e.idle, attack: e.attack && e.attack.length ? e.attack : null, attackFps: e.attackFps || 0, attackRelease: release, attackWalk: walking, motionRate: e.motionRate || 1, idleRate: e.idleRate ?? 4, selfBob: !!e.selfBob, anchorY: e.anchorY ?? e.h - 1, fitW: e.fitW || e.w, fitH: e.fitH || e.h, floating: !!e.floating, ...(e.animFps ? { animFps: e.animFps } : {}) });
}

// How tall a game sprite stands: its tallest frame, top pixel to feet.
export function standsTall(spr) {
  let H = 0;
  for (const f of spr.frames.slice(0, 24)) {
    const d = f.buf.d;
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

// The game's own sprites, kept before any is replaced (a page that replaces some calls this
// once the game has built them).
const originals = {};
export const rememberOriginals = () => Object.assign(originals, SPR);

// One of the game's own sprites redrawn to another height in the same way as a scouted one (its
// pixels resampled, its own outline kept): to see the game's own cast at the knight's scale.
function grownGameSprite(name, s, as, height) {
  const frames = (list) => (list && list.length ? list : s.frames.map((_, i) => i)).map((i) => [0, 0, s.w, s.h, s.frames[i].c]);
  const view = (list, fps) => ({ fps, once: false, frames: frames(list), w: s.w, h: s.h, ax: Math.floor(s.w / 2), ay: as === 'hero' ? s.anchorY : s.h, top: 0, cx0: 0, cx1: s.w });
  const anims = as === 'hero'
    ? { idle: view(s.idle || [0], s.idleRate * 1.6), walk: view(s.walk, s.motionRate * 9.8), ...(s.attack ? { attack: view(s.attack, s.attackFps || 10) } : {}) }
    : { move: view(null, 6) };
  const set = { id: `grown:${name}`, kind: as, name, cls: 'knight', faces: 'right', anims, gameH: height, redrawOpts: { outline: false } };
  const out = bakeSet(`game:${name}@${height}`, set, as);
  // A monster keeps the game's own pace for it.
  if (as === 'monster') out.animFps = null;
  return out;
}

// cand: a candidate; as: 'hero' or 'monster'; height: the game height to redraw a scouted one at;
// grow: the game's own redrawn to that height too, if it stands shorter.
export async function gameSprite(cand, { as = cand.kind, height, grow = false } = {}) {
  if (cand.source === 'game') {
    const s = originals[cand.sprite] || SPR[cand.sprite];
    if (!s) throw new Error(`the game has no sprite "${cand.sprite}"`);
    if (grow && height && standsTall(s) < height - 1) return grownGameSprite(cand.sprite, s, as, height);
    return s;
  }
  if (cand.source === 'lab') return labSprite(cand);
  return scoutSprite(cand, as, height);
}
