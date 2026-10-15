// Bitmap text rendering with outlines, drop shadows and per-row gradients.
// Rendered strings are cached as small canvases and blitted.

import { GLYPHS, BOLD } from './fontdata.js';
import * as px from './pixels.js';
import { bufToCanvas } from './sprites.js';

export const GLYPH_H = 9;
export const LINE_H = 10;

function parseFont(src) {
  const f = {};
  for (const [ch, s] of Object.entries(src)) {
    const rows = s.split('/');
    f[ch] = { w: rows[0].length, rows };
  }
  return f;
}
const FONTS = { normal: parseFont(GLYPHS), bold: parseFont(BOLD) };

function glyph(ch, font) {
  return FONTS[font][ch] || FONTS.normal[ch] || FONTS.normal['?'];
}

export function textWidth(str, font = 'normal') {
  let w = 0, n = 0;
  for (const ch of str) {
    w += glyph(ch, font).w;
    n++;
  }
  return Math.max(0, w + n - 1);
}

const cache = new Map();
const CACHE_MAX = 1200;
const OUTLINE = '#181425';

function colorAt(color, row) {
  if (!Array.isArray(color)) return color;
  // Spread the gradient over the cap height (rows 0-6).
  const r = Math.max(0, Math.min(row, 6));
  return color[Math.min(color.length - 1, Math.floor((r / 7) * color.length))];
}

export function textCanvas(str, color = '#ffffff', outline = OUTLINE, shadow = null, font = 'normal') {
  const key = `${font}|${color}|${outline}|${shadow}|${str}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const pad = outline ? 1 : 0;
  const tw = Math.max(1, textWidth(str, font));
  const w = tw + pad * 2, h = GLYPH_H + pad * 2 + (shadow ? 1 : 0);
  const mask = new Uint8Array(w * h);
  let x = pad;
  for (const ch of str) {
    const g = glyph(ch, font);
    for (let gy = 0; gy < g.rows.length; gy++) {
      const row = g.rows[gy];
      for (let gx = 0; gx < g.w; gx++) if (row[gx] === '#') mask[(gy + pad) * w + x + gx] = 1;
    }
    x += g.w + 1;
  }
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
  for (let y = 0; y < h; y++) rowColors.push(px.hexPack(colorAt(color, y - pad)));
  for (let y = 0; y < h; y++) {
    for (let xx = 0; xx < w; xx++) if (mask[y * w + xx]) buf.d[y * w + xx] = rowColors[y];
  }
  const c = bufToCanvas(buf);
  cache.set(key, c);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return c;
}

// Draws at 1:1 on a pixel canvas (UI). (x, y) is the top-left of the glyph box.
export function drawText(ctx, str, x, y, opts = {}) {
  const { color = '#ffffff', outline = OUTLINE, shadow = null, align = 'left', font = 'normal' } = opts;
  if (!str) return 0;
  const c = textCanvas(String(str), color, outline, shadow, font);
  const pad = outline ? 1 : 0;
  let dx = x - pad;
  if (align === 'center') dx = Math.round(x - (c.width - pad * 2) / 2) - pad;
  else if (align === 'right') dx = x - c.width + pad;
  ctx.drawImage(c, Math.round(dx), Math.round(y - pad));
  return c.width - pad * 2;
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
