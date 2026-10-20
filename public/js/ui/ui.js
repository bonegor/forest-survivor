// Immediate-mode UI on the low-res UI canvas: focusable widgets that work with
// mouse, touch, keyboard and gamepad, plus the stone-and-gold look.

import { input } from '../engine/input.js';
import { sfx } from '../engine/audio.js';
import { drawText, textCanvas, textWidth, drawRich, wrapText, textMask, capHeight } from '../engine/font.js';
import { makeCanvas, clamp, hexToRgb } from '../engine/util.js';
import * as px from '../engine/pixels.js';
import { bufToCanvas } from '../engine/sprites.js';
import { panelFrame, PANEL_MIN, buttonFace, pointer } from './skin.js';

export class UI {
  constructor() {
    this.items = [];
    this.focusId = null;
    this.t = 0;
    this.lockT = 0;
    this.navSound = true;
    this.noSpace = false; // Space doesn't confirm: a choice that popped up mid-fight, where Space is the ultimate
  }

  begin(dt) {
    this.t += dt;
    this.lockT = Math.max(0, this.lockT - dt);
    this.items.length = 0;
    this.fired = false;
    if (this.pending !== undefined) {
      this.focusId = this.pending;
      this.pending = undefined;
    }
  }

  // Move focus to a widget that will exist next frame (e.g. a dialog).
  focus(id) {
    this.pending = id;
  }

  // Ignore input for a moment (e.g. right after a modal opens).
  lock(t = 0.25) {
    this.lockT = t;
  }

  // Registers a focusable rect. Returns true when activated this frame. opts.held: it takes the
  // focus (hover, the keys, a click or a tap) but can't be activated yet, and a press on it is
  // dropped, never kept for later (the level-up's cards in their first moments).
  item(id, x, y, w, h, opts = {}) {
    const it = { id, x, y, w, h, disabled: !!opts.disabled };
    this.items.push(it);
    const m = input.mouse;
    const inside = m.x >= x && m.y >= y && m.x < x + w && m.y < y + h;
    if (inside && m.moved && this.focusId !== id) {
      this.focusId = id;
      if (!it.disabled) sfx('ui', { pitch: 1.2 });
    }
    if (this.focusId === null) this.focusId = id;
    // One activation per frame, so moving focus can't chain a second click.
    if (this.lockT > 0 || this.fired) return false;
    const activated = (inside && m.clicked) || (this.focusId === id && input.pressed(this.noSpace ? 'select' : 'confirm'));
    if (activated) {
      this.fired = true;
      if (opts.held) {
        if (this.focusId !== id) sfx('ui', { pitch: 1.2 });
        this.focusId = id;
        input.mouse.clicked = false;
        return false;
      }
      this.focusId = id;
      if (it.disabled) {
        sfx('deny');
        return false;
      }
      sfx('select');
      input.mouse.clicked = false;
      return true;
    }
    return false;
  }

  focused(id) {
    return this.focusId === id;
  }

  end() {
    if (!this.items.length || this.pending !== undefined) return;
    if (!this.items.some((i) => i.id === this.focusId)) this.focusId = this.items[0].id;
    if (this.lockT > 0) return;
    const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    for (const [k, [dx, dy]] of Object.entries(dirs)) {
      if (!input.pressed(k)) continue;
      const cur = this.items.find((i) => i.id === this.focusId);
      const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
      let best = null, bs = Infinity;
      for (const it of this.items) {
        if (it === cur) continue;
        const ix = it.x + it.w / 2, iy = it.y + it.h / 2;
        const vx = ix - cx, vy = iy - cy;
        const along = vx * dx + vy * dy;
        if (along <= 0.5) continue;
        const across = Math.abs(vx * dy - vy * dx);
        const score = along + across * 2.2;
        if (score < bs) {
          bs = score;
          best = it;
        }
      }
      if (!best) {
        // Wrap around within the same row/column.
        const cands = this.items.filter((it) => it !== cur && (dx ? Math.abs(it.y + it.h / 2 - cy) < 4 : Math.abs(it.x + it.w / 2 - cx) < 4));
        if (cands.length) {
          cands.sort((a, b) => (dx ? (a.x - b.x) * dx : (a.y - b.y) * dy));
          best = cands[0];
        }
      }
      if (best) {
        this.focusId = best.id;
        sfx('ui');
      }
      break;
    }
  }
}

// ------------------------------------------------------------------ look --

let stone = null;
function stoneTexture() {
  if (stone) return stone;
  const c = makeCanvas(32, 32);
  const g = c.getContext('2d');
  const img = g.createImageData(32, 32);
  const base = hexToRgb('#1d1928');
  for (let i = 0; i < 32 * 32; i++) {
    const x = i % 32, y = (i / 32) | 0;
    const n = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1 + 1) % 1;
    const crack = (x + y * 3) % 17 === 0 && n > 0.5;
    const k = crack ? -10 : n > 0.85 ? 6 : n < 0.1 ? -5 : 0;
    img.data[i * 4] = base[0] + k;
    img.data[i * 4 + 1] = base[1] + k;
    img.data[i * 4 + 2] = base[2] + k;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  stone = c;
  return c;
}

export function fillStone(ctx, x, y, w, h) {
  const pat = ctx.createPattern(stoneTexture(), 'repeat');
  ctx.fillStyle = pat;
  ctx.fillRect(x, y, w, h);
}

// Framed stone panel with bronze trim and gold rivets: Lucifer's bracketed frame (skin.js), or
// the old one-pixel trim on a panel too small for it.
export function panel(ctx, x, y, w, h, o = {}) {
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);
  const trim = o.trim || ['#b86f50', '#733e39'];
  if (w >= PANEL_MIN && h >= PANEL_MIN) {
    if (o.fill) {
      ctx.fillStyle = o.fill;
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    } else fillStone(ctx, x + 2, y + 2, w - 4, h - 4);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(x + 3, y + 3, w - 6, 1);
    panelFrame(ctx, x, y, w, h, trim[0], o.rivets !== false);
    if (o.title) panelTitle(ctx, x, y, w, o.title);
    return;
  }
  ctx.fillStyle = '#0d0b14';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = trim[1];
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = trim[0];
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillStyle = '#0d0b14';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  if (o.fill) {
    ctx.fillStyle = o.fill;
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  } else fillStone(ctx, x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(x + 3, y + 3, w - 6, 1);
  if (o.rivets !== false) {
    for (const [rx, ry] of [[x + 1, y + 1], [x + w - 3, y + 1], [x + 1, y + h - 3], [x + w - 3, y + h - 3]]) {
      ctx.fillStyle = '#feae34';
      ctx.fillRect(rx, ry, 2, 2);
      ctx.fillStyle = '#fee761';
      ctx.fillRect(rx, ry, 1, 1);
    }
  }
  if (o.title) panelTitle(ctx, x, y, w, o.title);
}

// A panel's name on a bronze plate across its top edge, in the gothic font: written in capitals
// by the callers, so set in title case here ("SIR ALDRIC — KNIGHT" reads "Sir Aldric - Knight").
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s(—-])(\p{L})/gu, (m, a, c) => a + c.toUpperCase());
function panelTitle(ctx, x, y, w, title) {
  const text = titleCase(title), tw = textWidth(text, 'gothic') + 26;
  const tx = Math.round(x + w / 2 - tw / 2);
  buttonFace(ctx, tx, y - 8, tw, 16, 'on');
  drawText(ctx, text, x + w / 2, y - 7, { align: 'center', color: ['#fff6c2', '#fee761', '#feae34', '#d77643'], font: 'gothic' });
}

// Lucifer's pointed button (skin.js): iron at rest, bronze when it is the one chosen (o.on), rimmed
// in pulsing gold with focus, with Lucifer's gold arrow pointing at it.
export function button(ctx, ui, id, x, y, w, h, label, o = {}) {
  const hit = ui.item(id, x, y, w, h, o);
  const f = ui.focused(id);
  x = Math.round(x);
  y = Math.round(y);
  const lit = f && !o.disabled;
  buttonFace(ctx, x, y, w, h, o.disabled ? 'off' : lit ? (Math.sin(ui.t * 6) > 0 ? 'pulse' : 'focus') : o.on ? 'on' : 'idle');
  const color = o.disabled ? '#5a6988' : f ? ['#ffffff', '#fee761', '#feae34'] : o.color || '#c0cbdc';
  drawText(ctx, label, x + w / 2, y + Math.floor((h - 8) / 2), { align: 'center', color });
  if (lit && o.pointer !== false) pointer(ctx, x - 2 + Math.round(Math.sin(ui.t * 8)), y + Math.floor((h - 1) / 2));
  return hit;
}

// Left/right selector: returns -1/0/+1.
export function stepper(ctx, ui, id, x, y, w, label, value, o = {}) {
  const hit = button(ctx, ui, id, x, y, w, 13, '', { pointer: true });
  const f = ui.focused(id);
  drawText(ctx, label, x + 14, y + 2, { color: f ? '#fee761' : '#c0cbdc' });
  drawText(ctx, `< ${value} >`, x + w - 14, y + 2, { align: 'right', color: f ? '#ffffff' : '#8b9bb4' });
  if (!f || ui.lockT > 0) return hit ? 1 : 0;
  if (input.pressed('left')) return -1;
  if (input.pressed('right')) return 1;
  if (hit) {
    const m = input.mouse;
    return m.x < x + w / 2 ? -1 : 1;
  }
  return 0;
}

// A box to tick, its label beside it, as wide as checkboxWidth makes it. Returns true when it is
// clicked, tapped or confirmed (Enter, Space, the pad's A): the caller flips what it shows.
// color: the tick's and the label's while ticked.
const TICK = [[0, 2], [1, 3], [2, 4], [3, 3], [4, 2], [5, 1], [6, 0]];
export const checkboxWidth = (label) => textWidth(label) + 30;
export function checkbox(ctx, ui, id, x, y, label, on, o = {}) {
  const hit = button(ctx, ui, id, x, y, checkboxWidth(label), 13, '', { pointer: true });
  const f = ui.focused(id), color = o.color || '#fee761';
  const bx = Math.round(x) + 9, by = Math.round(y) + 2;
  ctx.fillStyle = on ? color : '#5a6988';
  ctx.fillRect(bx, by, 9, 9);
  ctx.fillStyle = '#0d0b14';
  ctx.fillRect(bx + 1, by + 1, 7, 7);
  if (on) {
    ctx.fillStyle = color;
    for (const [tx, ty] of TICK) ctx.fillRect(bx + 1 + tx, by + 1 + ty, 1, 2);
  }
  drawText(ctx, label, bx + 13, y + 2, { color: f ? '#fee761' : on ? color : '#8b9bb4' });
  return hit;
}

// Big gradient title text built from a bitmap font, smoothed with Scale2x: four times the 5x7
// font's capitals, or twice the gothic's (font: 'gothic'), whose gradient runs down its capitals.
const logoCache = new Map();
export function logo(text, colors = ['#fff6c2', '#fee761', '#feae34', '#f77622', '#be4a2f', '#a22633'], outline = '#181425', font = 'normal') {
  const key = font + text + colors.join();
  if (logoCache.has(key)) return logoCache.get(key);
  // Build a 1-bit mask from the glyphs: the 5x7 font's capitals only, the gothic's descenders too.
  const tm = textMask(text, font);
  const h = font === 'normal' ? 7 : tm.h, w = tm.w;
  let m = px.makeBuf(w, h);
  const ON = px.pack(255, 255, 255);
  for (let i = 0; i < w * h; i++) if (tm.mask[i]) m.d[i] = ON;
  const times = font === 'normal' ? 2 : 1;
  for (let i = 0; i < times; i++) m = px.scale2x(m);
  const capH = font === 'normal' ? m.h : capHeight(font) << times;
  const out = px.makeBuf(m.w + 4, m.h + 6);
  const cols = colors.map((c) => px.hexPack(c));
  const ol = px.hexPack(outline);
  const shadow = px.pack(13, 11, 20);
  const at = (xx, yy) => xx >= 0 && yy >= 0 && xx < m.w && yy < m.h && m.d[yy * m.w + xx];
  for (let yy = 0; yy < out.h; yy++) {
    for (let xx = 0; xx < out.w; xx++) {
      const sx = xx - 2, sy = yy - 2;
      if (at(sx, sy)) {
        const t = Math.min(1, sy / capH);
        const band = clamp(Math.floor(t * cols.length + ((xx + yy) % 2) * 0.15), 0, cols.length - 1);
        // Bevel: bright rim on top edges.
        out.d[yy * out.w + xx] = !at(sx, sy - 1) ? cols[0] : cols[band];
      } else {
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (at(sx + dx, sy + dy)) { near = true; break; }
        if (near) out.d[yy * out.w + xx] = ol;
        else if (at(sx, sy - 2) || at(sx - 1, sy - 2)) out.d[yy * out.w + xx] = shadow;
      }
    }
  }
  const c = bufToCanvas(out);
  logoCache.set(key, c);
  return c;
}

export function dim(ctx, W, H, a = 0.65) {
  ctx.fillStyle = `rgba(8,6,16,${a})`;
  ctx.fillRect(0, 0, W, H);
}

export { drawText, textCanvas, textWidth, drawRich, wrapText };
