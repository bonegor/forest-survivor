// The menus' frames, buttons, pointer and dividers, cut from the Creative Commons library
// (public/assets/ui, baked by tools/bake-ui.mjs) and recoloured into the game's palette here.
// Each piece is drawn nine-sliced: its corners as they are, its edges and middle stretched.

import PIECES from '../../assets/ui/pieces.js';
import { bufToCanvas } from '../engine/sprites.js';
import { hexPack } from '../engine/pixels.js';

const decoded = new Map();
function piece(name) {
  let p = decoded.get(name);
  if (p) return p;
  const src = PIECES[name], bytes = atob(src.data);
  p = { w: src.w, h: src.h, palette: src.palette, idx: Uint8Array.from(bytes, (ch) => ch.charCodeAt(0)) };
  decoded.set(name, p);
  return p;
}

// The piece with its colours swapped: map takes a source colour ('#757575') to a new one, or a
// function (x, y, colour) to one, for colours that differ by place (a panel's corners). A
// colour left out stays as it is, one mapped to null is cleared; alpha always stays.
const cache = new Map();
export function skin(name, map = {}, key = JSON.stringify(map)) {
  const k = name + key;
  let c = cache.get(k);
  if (c) return c;
  const p = piece(name);
  const pal = p.palette.map((hex) => {
    const rgb = hex.slice(0, 7), a = parseInt(hex.slice(7, 9), 16);
    return { rgb, a };
  });
  const d = new Uint32Array(p.w * p.h);
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const i = y * p.w + x, e = pal[p.idx[i]];
      if (!e.a) continue;
      const to = typeof map === 'function' ? map(x, y, e.rgb) : map[e.rgb];
      if (to === null) continue;
      d[i] = hexPack(to || e.rgb, e.a);
    }
  }
  c = bufToCanvas({ w: p.w, h: p.h, d });
  cache.set(k, c);
  return c;
}

// Draws img nine-sliced into (x, y, w, h). m: the corner size, [left, top, right, bottom].
// sy, sh: a band of the source to use (a button's rows without its empty ones).
export function nine(ctx, img, x, y, w, h, m, sy = 0, sh = img.height) {
  const [l, t, r, b] = m, sw = img.width;
  const mw = sw - l - r, mh = sh - t - b, dw = w - l - r, dh = h - t - b;
  const cols = [[0, l, x, l], [l, mw, x + l, dw], [sw - r, r, x + w - r, r]];
  const rows = [[sy, t, y, t], [sy + t, mh, y + t, dh], [sy + sh - b, b, y + h - b, b]];
  for (const [rsy, rsh, rdy, rdh] of rows) {
    if (rdh <= 0) continue;
    for (const [csx, csw, cdx, cdw] of cols) if (cdw > 0) ctx.drawImage(img, csx, rsy, csw, rsh, cdx, rdy, cdw, rdh);
  }
}

// ------------------------------------------------------------------ pieces --

const INK = '#0d0b14';

// Lucifer's panel, its frame in trim and its corner brackets in gold when it has rivets. The
// inside is left clear for the caller's fill. Needs w, h of 25 or more.
export const PANEL_MIN = 25;
export function panelFrame(ctx, x, y, w, h, trim, rivets) {
  const lit = rivets ? '#feae34' : trim;
  const img = skin('panel', (px, py, col) => {
    if (col === '#393a3b') return null;
    if (col === '#000000') return INK;
    const corner = (px < 6 || px > 41) && (py < 6 || py > 41);
    return corner ? lit : trim;
  }, `${trim}|${lit}`);
  nine(ctx, img, x, y, w, h, [12, 12, 12, 12]);
}

// Lucifer's pointed button, in rows 1-13 of its sheet: the rim, the face, the face's shade, the
// drop shadow below and its black outline.
const BUTTON = {
  idle: { '#8d8d8d': '#9e5b47', '#757575': '#3e2731', '#393a3b': '#2b1b26', '#28221f': '#0d0b14', '#000000': INK },
  focus: { '#8d8d8d': '#fee761', '#757575': '#733e39', '#393a3b': '#4f2a2e', '#28221f': '#0d0b14', '#000000': '#be4a2f' },
  pulse: { '#8d8d8d': '#fff6c2', '#757575': '#7f4540', '#393a3b': '#4f2a2e', '#28221f': '#0d0b14', '#000000': '#f77622' },
  on: { '#8d8d8d': '#feae34', '#757575': '#733e39', '#393a3b': '#4f2a2e', '#28221f': '#0d0b14', '#000000': INK },
  off: { '#8d8d8d': '#4a3540', '#757575': '#221820', '#393a3b': '#1a1219', '#28221f': '#0d0b14', '#000000': INK },
};
export function buttonFace(ctx, x, y, w, h, state = 'idle') {
  // The points take 9 pixels a side; a narrow button keeps them shorter.
  const side = Math.max(2, Math.min(9, Math.floor(w / 2) - 2));
  // A short one (under 13) keeps its top and bottom rows and loses the middle.
  const top = Math.min(6, h >> 1), bottom = Math.min(6, h - top);
  nine(ctx, skin('button', BUTTON[state] || BUTTON.idle, state), x, y, w, h, [side, top, side, bottom], 1, 13);
}
// How far in from a button's ends its points reach at mid-height.
export const BUTTON_TIP = 2;

// Lucifer's arrow, brightened to the focused button's gold, pointing right at (x, y)'s row, its
// tip at x.
export function pointer(ctx, x, y) {
  const img = skin('arrow', { '#d1ca80': '#fee761', '#a29d6b': '#feae34', '#836b3f': '#be4a2f', '#000000': INK });
  ctx.drawImage(img, Math.round(x - img.width), Math.round(y - 6));
}

// Kenney's fading divider either side of a title from left to right, its row through y: each
// fades in from the outside to its ornament beside the title.
export function flank(ctx, left, right, y, len, color = '#feae34') {
  const img = skin('divider', { '#ffffff': color });
  const w = Math.min(len, img.width), top = Math.round(y - img.height / 2);
  ctx.drawImage(img, img.width - w, 0, w, img.height, Math.round(left - w), top, w, img.height);
  ctx.save();
  ctx.translate(Math.round(right) * 2 + w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(img, img.width - w, 0, w, img.height, Math.round(right), top, w, img.height);
  ctx.restore();
}
