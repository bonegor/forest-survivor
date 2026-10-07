// Procedurally rendered effect sprites (crisp pixel rings, slash arcs,
// crescents, glows). All cached by their parameters.

import { makeCanvas, TAU, clamp, hexToRgb } from '../engine/util.js';

const cache = new Map();
function cached(key, fn) {
  let c = cache.get(key);
  if (!c) {
    c = fn();
    cache.set(key, c);
  }
  return c;
}

function pixelCanvas(w, h, fn) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = fn(x, y);
      if (!col) continue;
      const i = (y * w + x) * 4;
      d[i] = col[0];
      d[i + 1] = col[1];
      d[i + 2] = col[2];
      d[i + 3] = col[3] ?? 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const dither = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

// Crisp ring (or disc when thick >= r).
export function ringSprite(r, color, thick = 1, fill = null) {
  r = Math.max(1, Math.round(r));
  return cached(`ring|${r}|${color}|${thick}|${fill}`, () => {
    const s = r * 2 + 3;
    const c = hexToRgb(color);
    const f = fill ? [...hexToRgb(fill[0]), fill[1]] : null;
    return pixelCanvas(s, s, (x, y) => {
      const d = Math.hypot(x + 0.5 - s / 2, y + 0.5 - s / 2);
      if (d <= r + 0.5 && d > r + 0.5 - thick) return c;
      if (f && d <= r + 0.5 - thick) return f;
      return null;
    });
  });
}

// Dithered soft disc, used for ground pools and auras.
export function discSprite(r, colors, edge = 0.35) {
  r = Math.max(2, Math.round(r));
  return cached(`disc|${r}|${colors.join(',')}|${edge}`, () => {
    const s = r * 2 + 2;
    const cs = colors.map(hexToRgb);
    return pixelCanvas(s, s, (x, y) => {
      const d = Math.hypot(x + 0.5 - s / 2, y + 0.5 - s / 2) / r;
      if (d > 1) return null;
      // colors[0] fills the centre, the last colour the rim.
      const t = clamp((d - (1 - edge)) / edge, 0, 1);
      const k = Math.floor(clamp(t + (dither(x, y) - 0.5) * 0.5, 0, 0.999) * cs.length);
      return [...cs[k], 255];
    });
  });
}

// A swept sword arc, frame f of n: a crisp crescent with a white-hot leading
// edge and a tail that tapers and dithers away behind it.
// palette: dark -> light, last entry is the edge highlight.
export function slashFrame(radius, arc, angleIdx, f, n, palette) {
  radius = Math.round(radius);
  const key = `slash3|${radius}|${arc.toFixed(2)}|${angleIdx}|${f}|${n}|${palette.join(',')}`;
  return cached(key, () => {
    const s = radius * 2 + 4;
    const cx = s / 2, cy = s / 2;
    const a0 = (angleIdx / 32) * TAU - arc / 2;
    const p = (f + 1) / n;
    const head = arc * Math.min(1, p * 1.45);
    const tail = arc * 0.95;
    const fade = p > 0.6 ? (p - 0.6) / 0.4 : 0;
    const cols = palette.map(hexToRgb);
    const top = cols.length - 1;
    return pixelCanvas(s, s, (x, y) => {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      if (d > radius) return null;
      let th = Math.atan2(dy, dx) - a0;
      th = ((th % TAU) + TAU) % TAU;
      if (th > head) return null;
      const u = (head - th) / tail; // 0 at the leading edge, 1 at the tail end
      if (u > 1) return null;
      const thick = radius * (0.66 * (1 - u) * (1 - u * 0.4) + 0.06) * (1 - fade * 0.5);
      const inner = radius - thick;
      if (d < inner) return null;
      const rim = (d - inner) / Math.max(1, thick); // 0 inner .. 1 outer
      let v = (1 - u) * 0.8 + rim * 0.3 - fade;
      // Only the far tail breaks up into dither.
      if (u > 0.55 && v + (dither(x, y) - 0.5) * 0.35 < 0.2) return null;
      if (v < 0.04) return null;
      if (u < 0.12 && rim > 0.55 && fade < 0.5) return cols[top];
      const k = clamp(Math.floor(v * top), 0, top - 1);
      return cols[k];
    });
  });
}

// Crescent used for holy waves.
export function crescentSprite(r, angleIdx, palette) {
  r = Math.round(r);
  return cached(`cres|${r}|${angleIdx}|${palette.join(',')}`, () => {
    const s = r * 2 + 4;
    const ang = (angleIdx / 32) * TAU;
    const ox = Math.cos(ang) * r * 0.45, oy = Math.sin(ang) * r * 0.45;
    const cols = palette.map(hexToRgb);
    return pixelCanvas(s, s, (x, y) => {
      const dx = x + 0.5 - s / 2, dy = y + 0.5 - s / 2;
      const d1 = Math.hypot(dx, dy);
      const d2 = Math.hypot(dx + ox, dy + oy);
      if (d1 > r || d2 < r * 0.92) return null;
      const t = clamp((d2 - r * 0.92) / (r * 0.6), 0, 1);
      const k = clamp(Math.floor((t + (dither(x, y) - 0.5) * 0.3) * cols.length), 0, cols.length - 1);
      return cols[cols.length - 1 - k];
    });
  });
}

// Soft radial glow (smooth), tinted.
export function glow(color, size = 64) {
  return cached(`glow|${color}|${size}`, () => {
    const c = makeCanvas(size, size);
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, color);
    grad.addColorStop(0.3, color + 'aa');
    grad.addColorStop(0.65, color + '33');
    grad.addColorStop(1, color + '00');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  });
}

// Pixel ellipse shadow.
export function shadowSprite(w) {
  w = Math.max(4, Math.round(w));
  return cached(`shadow|${w}`, () => {
    const h = Math.max(2, Math.round(w * 0.38));
    return pixelCanvas(w, h, (x, y) => {
      const dx = (x + 0.5 - w / 2) / (w / 2), dy = (y + 0.5 - h / 2) / (h / 2);
      return dx * dx + dy * dy <= 1 ? [12, 8, 20, 120] : null;
    });
  });
}

// Light beam column (level up, shrine, chest).
export function beamSprite(color, h = 96) {
  return cached(`beam|${color}|${h}`, () => {
    const w = 24;
    const c = makeCanvas(w, h);
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, color + '00');
    grad.addColorStop(0.35, color + '88');
    grad.addColorStop(0.5, '#ffffffee');
    grad.addColorStop(0.65, color + '88');
    grad.addColorStop(1, color + '00');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    const fade = g.createLinearGradient(0, 0, 0, h);
    fade.addColorStop(0, '#000000');
    fade.addColorStop(0.5, '#00000000');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = fade;
    g.fillRect(0, 0, w, h);
    return c;
  });
}

export function vignette(w, h, color = '0,0,0', strength = 0.75) {
  return cached(`vig|${w}|${h}|${color}|${strength}`, () => {
    const c = makeCanvas(w, h);
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.hypot(w, h) * 0.56);
    grad.addColorStop(0, `rgba(${color},0)`);
    grad.addColorStop(1, `rgba(${color},${strength})`);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    return c;
  });
}

// Ground splats for decals (blood, goo, scorch marks...).
const SPLAT = {
  blood: ['#a22633', '#e43b44', '#5c0f1c'],
  goo: ['#3e8948', '#63c74d', '#265c42'],
  dark: ['#3b2346', '#68386c', '#262b44'],
  scorch: ['#181425', '#2a1f2d', '#3e2731'],
  ash: ['#4b3d44', '#7d6a6a', '#2a1f2d'],
  ecto: ['#0099db', '#2ce8f5', '#124e89'],
  wood: ['#733e39', '#b86f50', '#3e2731'],
};

export function splatSprite(kind, variant, r) {
  r = Math.max(2, Math.round(r));
  return cached(`splat|${kind}|${variant}|${r}`, () => {
    let seed = (variant * 2654435761 + r * 97 + kind.length * 13) >>> 0;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const s = r * 2 + 6;
    const cols = (SPLAT[kind] || SPLAT.blood).map(hexToRgb);
    const blobs = [{ x: s / 2, y: s / 2, r: r * (kind === 'scorch' ? 0.9 : 0.55) }];
    const n = kind === 'scorch' ? 0 : 4 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, d = r * (0.4 + rnd() * 0.7);
      blobs.push({ x: s / 2 + Math.cos(a) * d, y: s / 2 + Math.sin(a) * d * 0.7, r: 0.6 + rnd() * r * 0.3 });
    }
    return pixelCanvas(s, s, (x, y) => {
      let best = 99;
      for (const b of blobs) best = Math.min(best, Math.hypot(x + 0.5 - b.x, (y + 0.5 - b.y) * 1.25) / b.r);
      if (best > 1) return null;
      if (kind === 'scorch') {
        const k = best + (dither(x, y) - 0.5) * 0.5;
        if (k > 0.95) return null;
        return [...cols[k > 0.7 ? 2 : k > 0.35 ? 1 : 0], 200];
      }
      const k = best + (dither(x, y) - 0.5) * 0.4;
      return [...cols[k > 0.75 ? 2 : k < 0.3 ? 1 : 0], 230];
    });
  });
}
