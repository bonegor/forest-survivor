// Bitmap text rendering with outlines, drop shadows and per-row gradients.
// Rendered strings are cached as small canvases and blitted.

import { GLYPHS, BOLD } from './fontdata.js';
import PIXTURA from '../../assets/ui/pixtura12.js';
import * as px from './pixels.js';
import { bufToCanvas } from './sprites.js';

const GLYPH_H_ = 9;
export const GLYPH_H = GLYPH_H_;
export const LINE_H = 10;

// A glyph: its rows ('#' inked), its ink's width w, where the ink starts from the pen (x0) and
// how far the pen then moves (adv).
function parseFont(src) {
  const f = {};
  for (const [ch, s] of Object.entries(src)) {
    const rows = s.split('/');
    f[ch] = { w: rows[0].length, x0: 0, adv: rows[0].length + 1, rows };
  }
  return f;
}
function parsePixtura(src) {
  const f = {};
  for (const [ch, g] of Object.entries(src.glyphs)) {
    const rows = g.rows.split('/');
    f[ch] = { w: rows[0].length, x0: g.x0, adv: g.adv, rows };
  }
  return f;
}
// h: the glyph box's height; cap: the rows a gradient spreads over; lead: room on the left for
// ink that reaches back past the pen (Pixtura's capitals). 'gothic' is Pixtura12, a blackletter
// for titles: write it in mixed case, its capitals alone don't read.
const FONTS = {
  normal: { g: parseFont(GLYPHS), h: GLYPH_H_, cap: 7, lead: 0 },
  bold: { g: parseFont(BOLD), h: GLYPH_H_, cap: 7, lead: 0 },
  gothic: { g: parsePixtura(PIXTURA), h: PIXTURA.h, cap: PIXTURA.ascent, lead: 1 },
};
const GOTHIC_SWAP = { '—': '-', '–': '-' };

function glyph(ch, font) {
  if (font === 'gothic') return FONTS.gothic.g[GOTHIC_SWAP[ch] || ch] || FONTS.gothic.g['?'];
  return FONTS[font].g[ch] || FONTS.normal.g[ch] || FONTS.normal.g['?'];
}

export function textWidth(str, font = 'normal') {
  let w = 0, last = null;
  for (const ch of str) {
    last = glyph(ch, font);
    w += last.adv;
  }
  return last ? Math.max(0, w - last.adv + last.x0 + last.w) : 0;
}

// The glyph box's height of a font, and the rows its capitals take.
export const fontHeight = (font = 'normal') => FONTS[font].h;
export const capHeight = (font = 'normal') => FONTS[font].cap;

const cache = new Map();
const CACHE_MAX = 1200;
const OUTLINE = '#181425';

function colorAt(color, row, cap = 7) {
  if (!Array.isArray(color)) return color;
  // Spread the gradient over the cap height (rows 0-6 of the 5x7 font).
  const r = Math.max(0, Math.min(row, cap - 1));
  return color[Math.min(color.length - 1, Math.floor((r / cap) * color.length))];
}

export function textCanvas(str, color = '#ffffff', outline = OUTLINE, shadow = null, font = 'normal') {
  const key = `${font}|${color}|${outline}|${shadow}|${str}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const pad = outline ? 1 : 0, F = FONTS[font];
  const { w, h, mask } = textMask(str, font, pad, shadow ? 1 : 0);
  const buf = px.makeBuf(w, h);
  const ring = new Uint8Array(w * h);
  if (outline) {
    for (let y = 0; y < h; y++) {
      for (let xx = 0; xx < w; xx++) {
        if (mask[y * w + xx]) continue;
        let on = false;
        for (let dy = -1; dy <= 1 && !on; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = xx + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < w && ny < h && mask[ny * w + nx]) { on = true; break; }
          }
        }
        if (on) ring[y * w + xx] = 1;
      }
    }
  }
  if (shadow) {
    const sc = px.hexPack(shadow);
    for (let y = h - 2; y >= 0; y--) {
      for (let xx = 0; xx < w; xx++) if (mask[y * w + xx] || ring[y * w + xx]) buf.d[(y + 1) * w + xx] = sc;
    }
  }
  if (outline) {
    const oc = px.hexPack(outline);
    for (let i = 0; i < ring.length; i++) if (ring[i]) buf.d[i] = oc;
  }
  const rowColors = [];
  for (let y = 0; y < h; y++) rowColors.push(px.hexPack(colorAt(color, y - pad, F.cap)));
  for (let y = 0; y < h; y++) {
    for (let xx = 0; xx < w; xx++) if (mask[y * w + xx]) buf.d[y * w + xx] = rowColors[y];
  }
  const c = bufToCanvas(buf);
  cache.set(key, c);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return c;
}

// The inked pixels of str (1s), with pad clear pixels round it and extra more below.
export function textMask(str, font = 'normal', pad = 0, extra = 0) {
  const F = FONTS[font];
  const w = Math.max(1, textWidth(str, font)) + pad * 2 + F.lead, h = F.h + pad * 2 + extra;
  const mask = new Uint8Array(w * h);
  let x = pad + F.lead;
  for (const ch of str) {
    const g = glyph(ch, font);
    for (let gy = 0; gy < g.rows.length; gy++) {
      const row = g.rows[gy];
      for (let gx = 0; gx < g.w; gx++) {
        const mx = x + g.x0 + gx;
        if (row[gx] === '#' && mx >= 0 && mx < w) mask[(gy + pad) * w + mx] = 1;
      }
    }
    x += g.adv;
  }
  return { w, h, mask };
}

// Draws at 1:1 on a pixel canvas (UI). (x, y) is the top-left of the glyph box.
export function drawText(ctx, str, x, y, opts = {}) {
  const { color = '#ffffff', outline = OUTLINE, shadow = null, align = 'left', font = 'normal' } = opts;
  if (!str) return 0;
  const c = textCanvas(String(str), color, outline, shadow, font);
  const pad = outline ? 1 : 0, lead = FONTS[font].lead, tw = c.width - pad * 2 - lead;
  let dx = x - pad - lead;
  if (align === 'center') dx = Math.round(x - tw / 2) - pad - lead;
  else if (align === 'right') dx = x - tw - pad - lead;
  ctx.drawImage(c, Math.round(dx), Math.round(y - pad));
  return tw;
}

// Draws centred at (cx, cy) in device pixels with an arbitrary scale.
export function drawTextScaled(ctx, str, cx, cy, scale, opts = {}) {
  const { color = '#ffffff', outline = OUTLINE, shadow = null, font = 'normal' } = opts;
  const c = textCanvas(String(str), color, outline, shadow, font);
  const w = c.width * scale, h = c.height * scale;
  ctx.drawImage(c, Math.round(cx - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h));
}

const stripMarkup = (s) => s.replace(/[{}]/g, '');

// Word wrap; understands {highlight} markup (braces don't count as width).
export function wrapText(str, maxW, font = 'normal') {
  const lines = [];
  for (const para of String(str).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (line && textWidth(stripMarkup(test), font) > maxW) {
        lines.push(line);
        line = word;
      } else line = test;
    }
    lines.push(line);
  }
  // Re-balance braces so each line is self-contained.
  let open = false;
  return lines.map((l) => {
    let out = open ? '{' + l : l;
    for (const ch of l) {
      if (ch === '{') open = true;
      else if (ch === '}') open = false;
    }
    if (open) out += '}';
    return out;
  });
}

// Text with {highlighted} spans.
export function drawRich(ctx, str, x, y, opts = {}) {
  const { color = '#c0cbdc', hi = '#feae34', align = 'left' } = opts;
  const parts = String(str).split(/([{}])/);
  let total = textWidth(stripMarkup(str));
  let cx = align === 'center' ? Math.round(x - total / 2) : align === 'right' ? x - total : x;
  let inHi = false;
  for (const p of parts) {
    if (p === '{') { inHi = true; continue; }
    if (p === '}') { inHi = false; continue; }
    if (!p) continue;
    const w = drawText(ctx, p, cx, y, { ...opts, align: 'left', color: inHi ? hi : color });
    cx += w + 1;
  }
  return total;
}
