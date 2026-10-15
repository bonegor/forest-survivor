// The second look at a sprite set: redrawn at the knight's own pixel size, so that drawn at
// the game's scale one of its pixels is exactly as big as one of the knight's, whatever it is.
//
// Every frame is resampled so the set stands as tall as it should in the game (gameHeight in
// lib/sprites.js: a hero as tall as the knight, a rat 8 pixels, an ogre 34), measured as the
// knight is (its tallest resting frame, top pixel to feet). A small sprite is first doubled
// with Scale2x, as often as it takes to be at least that big, so its edges come out as clean
// diagonals instead of big blocks. Then every sprite is reduced to the exact size: each new
// pixel takes the average colour of what it covers (nothing, if less than ~40% of it is
// covered), snapped to the game's palette or, if asked, to the sprite's own colours. Last,
// the game's ink outline goes round it, as the game does for its own sprites
// (public/js/engine/pixels.js outline(), colour PAL.k).

import { views, visibleBox, gameFit, gameHeight, drawable, isReady, strayPixels } from './sprites.js';

// The game's master palette (public/js/art/palette.js: ENDESGA 32 and a few extras).
export const GAME_PALETTE = [
  '#949f56', '#6b783d', '#47522c', '#2b331f', '#181425', '#262b44', '#3a4466', '#5a6988', '#8b9bb4', '#c0cbdc', '#ffffff',
  '#ff0044', '#e43b44', '#a22633', '#3e2731', '#733e39', '#b86f50', '#d77643', '#e4a672', '#ead4aa', '#e8b796', '#c28569',
  '#be4a2f', '#f77622', '#feae34', '#fee761', '#63c74d', '#3e8948', '#265c42', '#193c3e', '#124e89', '#0099db', '#2ce8f5',
  '#68386c', '#b55088', '#f6757a', '#3b2346', '#8f5bb0', '#2a1f2d', '#4b3d44', '#7d6a6a', '#f4f4e4', '#a8b5b2', '#9ee562',
  '#ffd6a0', '#ff9b3d', '#2c2c34', '#44444e', '#6c6c78', '#d2c393', '#9e8c60', '#6e5f43', '#4a4030', '#2c2721', '#c8f4ec', '#6fb8b0',
];
const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const GAME_RGB = GAME_PALETTE.map(rgbOf);
const INK = rgbOf('#181425');
// Packed as the canvas stores it on little-endian machines: 0xAABBGGRR.
const pack = (r, g, b, a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
const INK_PACKED = pack(...INK);

// A colour distance close to how different colours look ("redmean").
function dist(r1, g1, b1, r2, g2, b2) {
  const rm = (r1 + r2) / 2, dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
}
function nearest(pal, r, g, b, memo) {
  const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
  let c = memo.get(key);
  if (c === undefined) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < pal.length; i++) {
      const d = dist(r, g, b, pal[i][0], pal[i][1], pal[i][2]);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    c = pack(pal[best][0], pal[best][1], pal[best][2]);
    memo.set(key, c);
  }
  return c;
}

let reader = null;
function pixels(im, sx, sy, sw, sh) {
  reader ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (reader.canvas.width < sw || reader.canvas.height < sh) {
    reader.canvas.width = Math.max(reader.canvas.width, sw);
    reader.canvas.height = Math.max(reader.canvas.height, sh);
  }
  reader.clearRect(0, 0, sw, sh);
  reader.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh);
  const data = reader.getImageData(0, 0, sw, sh).data, u32 = new Uint32Array(data.buffer.slice(0));
  // Bits of the neighbouring frames stay out of the redrawn one.
  const stray = strayPixels(data, sw, sh);
  if (stray) for (let i = 0; i < u32.length; i++) if (stray[i]) u32[i] = 0;
  return { w: sw, h: sh, u32 };
}

// Scale2x (EPX): doubles a sprite, turning stair-steps into clean diagonals.
function scale2x(b) {
  const { w, h, u32: s } = b, W = w * 2, o = new Uint32Array(W * h * 2);
  const at = (x, y) => s[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const P = s[y * w + x], A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      const i = y * 2 * W + x * 2;
      o[i] = C === A && C !== D && A !== B ? A : P;
      o[i + 1] = A === B && A !== C && B !== D ? B : P;
      o[i + W] = D === C && D !== B && C !== A ? C : P;
      o[i + W + 1] = B === D && B !== A && D !== C ? D : P;
    }
  }
  return { w: W, h: h * 2, u32: o };
}

// What counts as part of a sprite: as for its size (viewBox in lib/sprites.js), any pixel
// that isn't all but invisible, however faint (a ghost, a fish under water).
const SEEN = 24;

// Reduce to W x H: each new pixel is the average colour of what it covers, snapped to the
// palette, as see-through as that was on average; areas less than ~40% covered stay empty.
function reduce(b, W, H, pal) {
  const out = new Uint32Array(W * H), fx = b.w / W, fy = b.h / H, memo = new Map(), s = b.u32;
  for (let ty = 0; ty < H; ty++) {
    const y0 = ty * fy, y1 = y0 + fy;
    for (let tx = 0; tx < W; tx++) {
      const x0 = tx * fx, x1 = x0 + fx;
      let area = 0, cover = 0, ink = 0, r = 0, g = 0, bl = 0;
      for (let y = Math.floor(y0); y < y1 && y < b.h; y++) {
        const wy = Math.min(y + 1, y1) - Math.max(y, y0);
        for (let x = Math.floor(x0); x < x1 && x < b.w; x++) {
          const wx = Math.min(x + 1, x1) - Math.max(x, x0), wgt = wx * wy, p = s[y * b.w + x], a = p >>> 24;
          area += wgt;
          if (a < SEEN) continue;
          const c = (wgt * a) / 255;
          cover += wgt;
          ink += c;
          r += c * (p & 255);
          g += c * ((p >>> 8) & 255);
          bl += c * ((p >>> 16) & 255);
        }
      }
      if (!area || cover / area < 0.4) continue;
      const alpha = Math.min(255, Math.round((ink / cover) * 255));
      out[ty * W + tx] = ((nearest(pal, r / ink, g / ink, bl / ink, memo) & 0xffffff) | (alpha << 24)) >>> 0;
    }
  }
  return { w: W, h: H, u32: out };
}

// The sprite's own colours, for when the game's palette isn't wanted.
function ownPalette(b) {
  const seen = new Set(), pal = [];
  for (const p of b.u32) {
    if (p >>> 24 < SEEN) continue;
    const c = p & 0xffffff;
    if (seen.has(c)) continue;
    seen.add(c);
    pal.push([c & 255, (c >>> 8) & 255, (c >>> 16) & 255]);
    if (pal.length > 256) break;
  }
  return pal.length ? pal : GAME_RGB;
}

// The game's outline: ink on every empty pixel next to a filled one (left, right, up, down),
// one pixel of room all round; as see-through as the most solid pixel it borders, so a
// ghost's outline is as faint as the ghost.
function outlined(b) {
  const W = b.w + 2, H = b.h + 2, o = new Uint32Array(W * H);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) o[(y + 1) * W + x + 1] = b.u32[y * b.w + x];
  const src = o.slice(), alphaAt = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? src[y * W + x] >>> 24 : 0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (src[y * W + x] >>> 24) continue;
      const a = Math.max(alphaAt(x - 1, y), alphaAt(x + 1, y), alphaAt(x, y - 1), alphaAt(x, y + 1));
      if (a) o[y * W + x] = ((INK_PACKED & 0xffffff) | (a << 24)) >>> 0;
    }
  }
  return { w: W, h: H, u32: o };
}

function toCanvas(b) {
  const c = document.createElement('canvas');
  c.width = b.w;
  c.height = b.h;
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(b.u32.buffer), b.w, b.h), 0, 0);
  return c;
}

function frameAt(src, sx, sy, sw, sh, r, opts) {
  let b = pixels(drawable(src), sx, sy, sw, sh);
  const pal = opts.palette ? GAME_RGB : ownPalette(b);
  for (let f = r; f > 1.001; f /= 2) b = scale2x(b);
  b = reduce(b, Math.max(1, Math.round(sw * r)), Math.max(1, Math.round(sh * r)), pal);
  return toCanvas(opts.outline ? outlined(b) : b);
}

function viewAt(v, r, opts) {
  const pad = opts.outline ? 1 : 0, s = (n) => Math.round(n * r) + pad;
  const frames = v.frames.map(([sx, sy, sw, sh, src]) => {
    const c = frameAt(src, sx, sy, sw, sh, r, opts);
    return [0, 0, c.width, c.height, c];
  });
  return { frames, w: frames[0][2], h: frames[0][3], ax: s(v.ax), ay: s(v.ay), top: s(v.top), cx0: s(v.cx0), cx1: s(v.cx1) };
}

// The set redrawn at the knight's pixel size, or null until its sheets have loaded.
// opts: palette (snap to the game's palette, else to its own colours), outline (the game's ink outline).
const made = new Map();
export function redrawn(set, opts = {}) {
  const o = { palette: opts.palette !== false, outline: opts.outline !== false };
  const gh = gameHeight(set), key = `${set.id}|${gh}|${o.palette ? 'p' : ''}${o.outline ? 'o' : ''}`;
  if (made.has(key)) return made.get(key);
  if (!set.anims) return null;
  for (const a of Object.values(set.anims)) for (const v of views(a)) for (const f of v.frames) if (!isReady(drawable(f[4]))) return null;
  const box = visibleBox(set);
  if (!box) return null;
  // The outline adds a pixel all round, so the body is drawn two pixels shorter: outlined, it
  // stands exactly its game height, as the knight's 30 pixels include his own outline.
  const r = gameFit(set) * (o.outline ? Math.max(1, gh - 2) / gh : 1);
  const anims = {};
  for (const [k, a] of Object.entries(set.anims)) {
    anims[k] = a.dirs
      ? { fps: a.fps, once: a.once, dirs: Object.fromEntries(Object.entries(a.dirs).map(([d, v]) => [d, viewAt(v, r, o)])) }
      : { fps: a.fps, once: a.once, ...viewAt(a, r, o) };
  }
  const out = { ...set, id: key, anims, height: Math.round(box.h * r) + (o.outline ? 2 : 0), original: set, redrawScale: r };
  made.set(key, out);
  return out;
}
// Drops a set's redrawn copies.
export function forget(set) {
  for (const k of [...made.keys()]) if (k.startsWith(set.id + '|')) made.delete(k);
}
