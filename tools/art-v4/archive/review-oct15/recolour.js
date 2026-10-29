// The colour bar of the hero sprite review (index.html): the same sliders, and the same pixel
// arithmetic, as the Sprite Lab's (gms/3001/lib/recolour.js), so a look tuned here comes out
// identical when it is baked into the game. Pixels are packed as the game packs them
// (0xAABBGGRR); see-through pixels stay as they are, so the shape never changes.

// The bar's sliders, each 0 when the sprite is as drawn.
export const SLIDERS = [
  { key: 'hue', label: 'Hue', min: -180, max: 180, unit: '°', hint: 'Turns every colour round the colour wheel' },
  { key: 'sat', label: 'Colourfulness', min: -100, max: 100, hint: 'Left: greyer. Right: more vivid' },
  { key: 'bright', label: 'Brightness', min: -100, max: 100, hint: 'Darker or lighter, black staying black' },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100, hint: 'Left: flatter. Right: darks darker and lights lighter' },
  { key: 'mid', label: 'Midtones', min: -100, max: 100, hint: 'The in-between shades darker or lighter, the darkest and lightest kept' },
  { key: 'warm', label: 'Warmth', min: -100, max: 100, hint: 'Left: cooler, bluer. Right: warmer, more orange' },
  { key: 'tint', label: 'Tint', min: -100, max: 100, hint: 'Left: greener. Right: more magenta' },
  { key: 'outline', label: 'Outline', min: -100, max: 100, hint: 'The dark edge only. Left: blacker. Right: coloured by what it surrounds' },
];
export const neutral = () => Object.fromEntries(SLIDERS.map((s) => [s.key, 0]));
export const isNeutral = (v) => !v || SLIDERS.every((s) => !v[s.key]);

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hueToRgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
function hslToRgb(h, s, l) {
  if (!s) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [hueToRgb(p, q, h + 1 / 3), hueToRgb(p, q, h), hueToRgb(p, q, h - 1 / 3)];
}

// One colour (r, g, b from 0 to 1) through every slider but the outline.
function shade(r, g, b, v) {
  if (v.hue) {
    const [h, s, l] = rgbToHsl(r, g, b);
    [r, g, b] = hslToRgb((((h + v.hue / 360) % 1) + 1) % 1, s, l);
  }
  if (v.sat) {
    const L = luma(r, g, b), f = 1 + v.sat / 100;
    r = L + (r - L) * f;
    g = L + (g - L) * f;
    b = L + (b - L) * f;
  }
  if (v.warm) {
    const k = v.warm / 100;
    r += 0.12 * k;
    g += 0.02 * k;
    b -= 0.12 * k;
  }
  if (v.tint) {
    const k = v.tint / 100;
    r += 0.05 * k;
    g -= 0.1 * k;
    b += 0.05 * k;
  }
  if (v.bright) {
    // Multiplied, so black outlines stay black.
    const k = v.bright / 100, f = k >= 0 ? 1 + k : 1 + 0.9 * k;
    r *= f;
    g *= f;
    b *= f;
  }
  if (v.contrast) {
    const k = v.contrast / 100, f = k >= 0 ? 1 + 1.5 * k : 1 + 0.9 * k;
    r = (r - 0.5) * f + 0.5;
    g = (g - 0.5) * f + 0.5;
    b = (b - 0.5) * f + 0.5;
  }
  r = clamp01(r);
  g = clamp01(g);
  b = clamp01(b);
  if (v.mid) {
    const p = Math.pow(2, (-1.2 * v.mid) / 100);
    r **= p;
    g **= p;
    b **= p;
  }
  return [r, g, b];
}

const OPAQUE = 24;
const pack = (r, g, b, a) => ((a << 24) | (Math.round(b * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(r * 255)) >>> 0;
const rgbOf = (c) => [(c & 255) / 255, ((c >>> 8) & 255) / 255, ((c >>> 16) & 255) / 255];

// A frame's pixels recoloured. `edges`: whether the outline slider applies (not to a glow
// layer, which has no outline).
export function recolourPixels(src, w, h, v, edges = true) {
  const out = new Uint32Array(src.length), memo = new Map();
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c >>> 24 === 0) {
      out[i] = c;
      continue;
    }
    let o = memo.get(c);
    if (o === undefined) {
      const [r, g, b] = shade(...rgbOf(c), v);
      memo.set(c, (o = pack(r, g, b, c >>> 24)));
    }
    out[i] = o;
  }
  if (edges && v.outline) outline(src, out, w, h, v.outline / 100);
  return out;
}

// The outline: dark pixels on the sprite's edge (next to a see-through pixel), made blacker
// (k < 0) or mixed towards a darkened copy of the colour just inside them (k > 0).
function outline(src, out, w, h, k) {
  const see = (x, y) => x < 0 || y < 0 || x >= w || y >= h || src[y * w + x] >>> 24 < OPAQUE;
  const isEdge = (x, y) => !see(x, y) && (see(x - 1, y) || see(x + 1, y) || see(x, y - 1) || see(x, y + 1)) && luma(...rgbOf(src[y * w + x])) < 0.35;
  const edge = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (isEdge(x, y)) edge[y * w + x] = 1;
  const changed = new Map();
  for (let i = 0; i < src.length; i++) {
    if (!edge[i]) continue;
    const x = i % w, y = (i / w) | 0, a = out[i] >>> 24;
    let [r, g, b] = rgbOf(out[i]);
    if (k < 0) {
      const f = 1 + k;
      r *= f;
      g *= f;
      b *= f;
    } else {
      // The colour inside: the opaque, non-edge neighbours' (all eight) average.
      let n = 0, R = 0, G = 0, B = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const X = x + dx, Y = y + dy, j = Y * w + X;
          if ((!dx && !dy) || X < 0 || Y < 0 || X >= w || Y >= h || edge[j] || src[j] >>> 24 < OPAQUE) continue;
          const [r2, g2, b2] = rgbOf(out[j]);
          R += r2;
          G += g2;
          B += b2;
          n++;
        }
      }
      if (n) {
        const t = k * 0.85;
        r += (0.45 * (R / n) - r) * t;
        g += (0.45 * (G / n) - g) * t;
        b += (0.45 * (B / n) - b) * t;
      }
    }
    changed.set(i, pack(clamp01(r), clamp01(g), clamp01(b), a));
  }
  for (const [i, c] of changed) out[i] = c;
}

// The code the review page hands over for a saved look, and back:
//   "FS mage polish-b hue=-12 sat=20"  (sliders left at 0 are left out)
export function pickCode(hero, version, v) {
  return ['FS', hero, version, ...SLIDERS.filter((s) => v[s.key]).map((s) => `${s.key}=${v[s.key]}`)].join(' ');
}
export function parsePickCode(code) {
  const [tag, hero, version, ...rest] = String(code).trim().split(/\s+/);
  if (tag !== 'FS' || !hero || !version) return null;
  const values = neutral();
  for (const kv of rest) {
    const [k, n] = kv.split('=');
    const s = SLIDERS.find((x) => x.key === k);
    if (!s || !/^-?\d+$/.test(n || '')) return null;
    values[k] = Math.max(s.min, Math.min(s.max, Number(n)));
  }
  return { hero, version, values };
}
