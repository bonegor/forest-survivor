// Pictures drawn in code for the menus: the trial cards' scenes, and the hero
// screen's portrait frame. Pixel art at native size, drawn by the menus at whole-number scales.

import { SPR } from '../engine/sprites.js';
import { makeCanvas } from '../engine/util.js';
import { bounds, hexPack, unpack } from '../engine/pixels.js';

// The trial cards' scenes, 64 × 44 art pixels each: the night's forest at dusk under a crescent,
// the Dungeon's stairs going down into torchlight, Ranked's blood moon over the graves (the
// gravestone of round 4 in front). Locked, the same in shadow.
export const SCENE = { w: 64, h: 44 };
const cache = new Map();

export function trialScene(mode, open) {
  const key = mode + (open ? '' : ':locked');
  if (cache.has(key)) return cache.get(key);
  const c = makeCanvas(SCENE.w, SCENE.h), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  (mode === 'dungeon' ? stairs : mode === 'ranked' ? bloodMoon : dusk)(x, SCENE.w, SCENE.h);
  if (!open) {
    // In shadow: the picture all but gone, its shapes still there.
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(14,10,22,0.82)';
    x.fillRect(0, 0, SCENE.w, SCENE.h);
    x.globalCompositeOperation = 'source-over';
  }
  cache.set(key, c);
  return c;
}

// Horizontal bands of colour, top to bottom, over [y0, y1).
function bands(x, w, y0, y1, cols) {
  const n = cols.length;
  for (let i = 0; i < n; i++) {
    x.fillStyle = cols[i];
    const a = y0 + Math.round(((y1 - y0) * i) / n), b = y0 + Math.round(((y1 - y0) * (i + 1)) / n);
    x.fillRect(0, a, w, b - a);
  }
}

// A pine's silhouette: a stack of widening rows from its tip at (cx, top) down to its foot.
function pine(x, cx, top, h, col) {
  x.fillStyle = col;
  for (let r = 0; r < h; r++) {
    const half = Math.floor((r % 4) + r / 4);
    x.fillRect(cx - half, top + r, half * 2 + 1, 1);
  }
}

// A pixel disc (filled, or a crescent cut by a second disc).
function disc(x, cx, cy, r, col, cut = null) {
  x.fillStyle = col;
  for (let y = -r; y <= r; y++) {
    for (let xx = -r; xx <= r; xx++) {
      if (xx * xx + y * y > r * r + 1) continue;
      if (cut && (xx - cut[0]) ** 2 + (y - cut[1]) ** 2 <= r * r) continue;
      x.fillRect(cx + xx, cy + y, 1, 1);
    }
  }
}

function stars(x, w, h, col, seed) {
  x.fillStyle = col;
  let s = seed;
  for (let i = 0; i < 14; i++) {
    s = (s * 16807) % 2147483647;
    x.fillRect(s % w, Math.floor(s / w) % h, 1, 1);
  }
}

// Survival: dusk over the Darkwood under a crescent: far pines against the sunset, the road
// winding in to the crossroads, near pines framing it.
function dusk(x, w, h) {
  bands(x, w, 0, 30, ['#1b1530', '#2a1f45', '#3e2a52', '#68386c', '#b55088', '#d77643']);
  stars(x, w, 18, '#c0cbdc', 7);
  disc(x, 46, 8, 4, '#fff6c2', [2, -1]);
  for (const [cx, top, ph] of [[3, 20, 11], [12, 18, 13], [21, 21, 10], [42, 19, 12], [51, 21, 10], [60, 18, 13]]) pine(x, cx, top, ph, '#2a2238');
  x.fillStyle = '#151a24';
  x.fillRect(0, 30, w, h - 30);
  x.fillStyle = '#1d2b25';
  x.fillRect(0, 32, w, h - 32);
  // The road, winding toward us out of the trees, its edge lit by the sunset.
  for (let y = 30; y < h; y++) {
    const t = (y - 30) / (h - 31), half = Math.round(1 + t * t * 8 + t * 2), cx = 32 + Math.round(Math.sin(t * 2.6) * 5);
    x.fillStyle = '#3f3237';
    x.fillRect(cx - half, y, half * 2 + 1, 1);
    x.fillStyle = '#6b4f45';
    x.fillRect(cx - half, y, 1, 1);
  }
  // Near pines framing the road.
  for (const [cx, top, ph] of [[4, 6, 38], [14, 16, 28], [56, 9, 35], [64, 14, 30]]) pine(x, cx, top, ph, '#0d1016');
}

// The Dungeon: a stone hall, an arch, its stairs going down into torchlight.
function stairs(x, w, h) {
  x.fillStyle = '#0d0b14';
  x.fillRect(0, 0, w, h);
  // Stone courses.
  for (let y = 0; y < h; y += 5) {
    x.fillStyle = y % 10 ? '#262b44' : '#2b3150';
    x.fillRect(0, y, w, 4);
    x.fillStyle = '#181425';
    for (let bx = (y % 10 ? 3 : 8); bx < w; bx += 11) x.fillRect(bx, y, 1, 4);
  }
  // The arch and the dark beyond it.
  x.fillStyle = '#05040a';
  x.fillRect(20, 12, 24, h - 12);
  disc(x, 32, 13, 12, '#05040a');
  x.fillStyle = '#5a6988';
  for (let i = 0; i < 25; i++) {
    const a = Math.PI + (i / 24) * Math.PI;
    x.fillRect(Math.round(32 + Math.cos(a) * 13), Math.round(13 + Math.sin(a) * 13), 1, 1);
  }
  const st = SPR.stairs && SPR.stairs.frames[0].c;
  if (st) x.drawImage(st, Math.round(w / 2 - st.width / 2), h - st.height - 1);
  // Two torches, their light.
  for (const tx of [10, 53]) {
    const g = x.createRadialGradient(tx, 20, 1, tx, 20, 14);
    g.addColorStop(0, 'rgba(254,174,52,0.55)');
    g.addColorStop(1, 'rgba(254,174,52,0)');
    x.fillStyle = g;
    x.fillRect(tx - 14, 6, 28, 28);
    x.fillStyle = '#733e39';
    x.fillRect(tx, 21, 1, 6);
    x.fillStyle = '#f77622';
    x.fillRect(tx - 1, 18, 3, 3);
    x.fillStyle = '#fee761';
    x.fillRect(tx, 17, 1, 2);
  }
}

// Ranked: a blood moon over the graves, the round-4 gravestone in front.
function bloodMoon(x, w, h) {
  bands(x, w, 0, 32, ['#140c16', '#24101c', '#3e1622', '#5c1826', '#7a1f2a']);
  stars(x, w, 16, '#f6757a', 3);
  const g = x.createRadialGradient(46, 12, 2, 46, 12, 16);
  g.addColorStop(0, 'rgba(228,59,68,0.45)');
  g.addColorStop(1, 'rgba(228,59,68,0)');
  x.fillStyle = g;
  x.fillRect(28, 0, 36, 30);
  disc(x, 46, 12, 7, '#a22633');
  disc(x, 46, 12, 6, '#e43b44');
  x.fillStyle = '#f6757a';
  x.fillRect(43, 9, 2, 2);
  // Graves on the rise.
  x.fillStyle = '#0d0b14';
  x.fillRect(0, 30, w, h - 30);
  for (const [gx, gy, gw, gh] of [[4, 25, 5, 6], [12, 27, 4, 4], [52, 26, 5, 5], [59, 28, 3, 3]]) {
    x.fillRect(gx, gy, gw, gh);
    x.fillRect(gx + 1, gy - 1, gw - 2, 1);
  }
  x.fillStyle = '#1b1220';
  x.fillRect(0, 33, w, h - 33);
  const gr = SPR.ranked_grave && SPR.ranked_grave.frames[0].c;
  if (gr) x.drawImage(gr, Math.round(w / 2 - gr.width / 2 - 6), h - gr.height);
}

// ------------------------------------------------------------------ the portrait frame --

// A hero's standing sprite cut to what it covers (the union of its idle frames), for the hero
// cards and the portrait frame: the same source for all five, so they share one treatment.
// { list: [Frame], x, y, w, h }: the box inside each frame.
const crops = new Map();
export function heroCrop(spr) {
  if (crops.has(spr)) return crops.get(spr);
  const list = spr.idle ? spr.idle.map((i) => spr.frames[i]) : [spr.frames[0]];
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const f of list) {
    const b = bounds(f.buf);
    if (!b) continue;
    x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0);
    x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1);
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = list[0].w - 1; y1 = list[0].h - 1; }
  const out = { list, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  crops.set(spr, out);
  return out;
}

// Mix two '#rrggbb' colours into a third: t = 0 gives a, 1 gives b.
export function mix(a, b, t) {
  const A = unpack(hexPack(a)), B = unpack(hexPack(b));
  const [r, g, bl] = [0, 1, 2].map((i) => Math.round(A[i] + (B[i] - A[i]) * t));
  return '#' + [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// The portrait frame's backdrop, w × h UI pixels: the hero's colour as a glow in five flat tones
// (pixel art, dithered at the steps, not a smooth gradient), darkest at the edges, and a floor
// under him. A locked hero's is the same in slate.
export const PORTRAIT = { floor: 0.2, glowY: 0.46, tones: [0.22, 0.4, 0.56, 0.7, 0.84] };
const backdrops = new Map();
export function portraitBackdrop(w, h, color, locked = false) {
  const key = `${w}x${h}:${color}:${locked}`;
  if (backdrops.has(key)) return backdrops.get(key);
  const c = makeCanvas(w, h), x = c.getContext('2d');
  const base = locked ? '#5a6988' : color, dark = '#0d0b14';
  const tones = PORTRAIT.tones.map((t) => mix(base, dark, locked ? Math.min(1, t + 0.12) : t));
  const floorY = h - Math.max(4, Math.round(h * PORTRAIT.floor));
  const cx = w / 2, cy = h * PORTRAIT.glowY, rx = w * 0.62, ry = h * 0.6;
  const bayer = [0, 0.5, 0.75, 0.25];
  for (let y = 0; y < floorY; y++) {
    for (let xx = 0; xx < w; xx++) {
      const d = Math.hypot((xx + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      const i = Math.min(tones.length - 1, Math.floor(d * tones.length + bayer[(xx & 1) + (y & 1) * 2] - 0.5));
      x.fillStyle = tones[Math.max(0, i)];
      x.fillRect(xx, y, 1, 1);
    }
  }
  // The floor: a lit edge, then darker toward the front.
  x.fillStyle = tones[2];
  x.fillRect(0, floorY, w, 1);
  x.fillStyle = tones[3];
  x.fillRect(0, floorY + 1, w, h - floorY - 1);
  x.fillStyle = tones[4];
  x.fillRect(0, floorY + Math.ceil((h - floorY) / 2), w, h);
  backdrops.set(key, c);
  return c;
}

// A flat pixel ellipse (a ground shadow), centred on (cx, cy).
export function pixelEllipse(ctx, cx, cy, rx, ry, col) {
  ctx.fillStyle = col;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + 0.5)) ** 2)));
    if (half > 0) ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2, 1);
  }
}
