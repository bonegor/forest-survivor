// Sprite colour tunes, shared by the sprite tuner (an unlisted page: the owner's link list has it)
// and tools/bake-tune.mjs. A tune moves a sprite's colours, never its pixels: each colour it is
// drawn in (a palette key, or one of a hero sheet's own colours) goes through the sliders; the
// ink, its outline's colour, can be swapped for another; and a rim rings it with 1 px outside the
// outline. Baked, a tune is the colours it gives (art/tuned.js), which engine/sprites.js draws
// (spriteBuffers). Hue, saturation, brightness and contrast work as on the hero review page and in
// the Sprite Lab; gamma and lift are for the night, which multiplies every colour down.
import { PAL } from './palette.js';
import { resolveFrames } from './defs.js';

// The sliders, each 0 when the sprite is as shipped.
export const SLIDERS = [
  { key: 'bright', label: 'Brightness', min: -100, max: 100, hint: 'Darker or lighter, black staying black' },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100, hint: 'Left: flatter. Right: darks darker, lights lighter' },
  { key: 'sat', label: 'Saturation', min: -100, max: 100, hint: 'Left: greyer. Right: more vivid' },
  { key: 'hue', label: 'Hue shift', min: -180, max: 180, unit: '°', hint: 'Every colour round the colour wheel' },
  { key: 'gamma', label: 'Gamma', min: -100, max: 100, hint: 'Right: shadows and midtones lighter, the lightest kept' },
  { key: 'lift', label: 'Lift the darks', min: 0, max: 100, hint: 'The darkest tones lighter, keeping their colour; light ones barely move' },
];
export const RIM = '#8b9bb4'; // the pale rim (palette 'g')

export const neutral = () => Object.fromEntries(SLIDERS.map((s) => [s.key, 0]));
// A tune: the sliders, plus ink ('#rrggbb', or none: as shipped) and rim ('#rrggbb' on, false off,
// undefined: as shipped).
export const isNeutral = (t) => !t || (SLIDERS.every((s) => !t[s.key]) && !t.ink && t.rim === undefined);

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = (x) => clamp(x, 0, 1);
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const hexOf = (r, g, b) => `#${[r, g, b].map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('')}`;
// A packed pixel (0xAABBGGRR, as the game packs them) as '#rrggbb'.
export const hexOfPacked = (c) => `#${[c & 255, (c >>> 8) & 255, (c >>> 16) & 255].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
export const luma = (c) => 0.299 * (c & 255) + 0.587 * ((c >>> 8) & 255) + 0.114 * ((c >>> 16) & 255);

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

// One colour ('#rrggbb') through the sliders.
export function shade(hex, t) {
  let [r, g, b] = rgbOf(hex);
  if (t.hue) {
    const [h, s, l] = rgbToHsl(r, g, b);
    [r, g, b] = hslToRgb((((h + t.hue / 360) % 1) + 1) % 1, s, l);
  }
  if (t.sat) {
    const L = 0.299 * r + 0.587 * g + 0.114 * b, f = 1 + t.sat / 100;
    r = L + (r - L) * f;
    g = L + (g - L) * f;
    b = L + (b - L) * f;
  }
  if (t.bright) {
    // Multiplied, so black stays black (the lift is for the darks).
    const k = t.bright / 100, f = k >= 0 ? 1 + k : 1 + 0.9 * k;
    r *= f;
    g *= f;
    b *= f;
  }
  if (t.contrast) {
    const k = t.contrast / 100, f = k >= 0 ? 1 + 1.5 * k : 1 + 0.9 * k;
    r = (r - 0.5) * f + 0.5;
    g = (g - 0.5) * f + 0.5;
    b = (b - 0.5) * f + 0.5;
  }
  r = clamp01(r);
  g = clamp01(g);
  b = clamp01(b);
  if (t.gamma) {
    const p = Math.pow(2, (-1.2 * t.gamma) / 100);
    r **= p;
    g **= p;
    b **= p;
  }
  if (t.lift) {
    // The lightness raised by up to half of what is left above it, most for the darkest: black
    // goes to mid grey at 100, a mid tone moves a sixteenth as much, white not at all.
    const [h, s, l] = rgbToHsl(r, g, b);
    [r, g, b] = hslToRgb(h, s, l + 0.5 * (t.lift / 100) * (1 - l) ** 3);
  }
  return hexOf(r, g, b);
}

// The colours a sprite is drawn in: [{ key, from, hex, ink }]. key: the palette key (art drawn in
// rows) or the colour itself ('#rrggbb', art in colours of its own: the heroes' sheets); from: the
// colour the art has; hex: the colour shipped now (def.palette over it); ink: the outline's colour.
// A sheet's ink is the colour of most of its silhouette's edge, if one colour is (the Knight and
// the Shadow outline in many colours, so theirs has none).
export function colourSlots(def) {
  const frames = resolveFrames(def), tuned = def.palette || {}, slots = new Map();
  const add = (key, from) => {
    if (!slots.has(key)) slots.set(key, { key, from, hex: (tuned[key] || from).toLowerCase(), ink: false });
  };
  if (frames.length && Array.isArray(frames[0])) {
    for (const rows of frames) for (const row of rows) for (const ch of row) if (PAL[ch]) add(ch, PAL[ch]);
    if (def.outline !== false) add('k', PAL.k);
    if (slots.has('k')) slots.get('k').ink = true;
    return [...slots.values()];
  }
  const edge = new Map();
  let edges = 0;
  for (const b of frames) {
    const see = (x, y) => x < 0 || y < 0 || x >= b.w || y >= b.h || !(b.d[y * b.w + x] >>> 24);
    for (let y = 0; y < b.h; y++) {
      for (let x = 0; x < b.w; x++) {
        const c = b.d[y * b.w + x];
        if (!(c >>> 24)) continue;
        const key = hexOfPacked(c);
        add(key, key);
        if (see(x - 1, y) || see(x + 1, y) || see(x, y - 1) || see(x, y + 1)) {
          edge.set(key, (edge.get(key) || 0) + 1);
          edges++;
        }
      }
    }
  }
  let top = null, most = 0;
  for (const [key, n] of edge) if (n > most) [top, most] = [key, n];
  if (top && most >= edges / 2) slots.get(top).ink = true;
  return [...slots.values()];
}

// The sprite's palette override under a tune: what it has now, with every colour tuned (its ink
// swapped instead). Colours that come back to the art's own drop out.
export function tunedPalette(def, t, slots = colourSlots(def)) {
  const out = { ...(def.palette || {}) };
  for (const s of slots) {
    const hex = s.ink ? t.ink || s.hex : shade(s.hex, t);
    if (hex === s.from) delete out[s.key];
    else out[s.key] = hex;
  }
  return out;
}
// The definition the game would build under a tune: its palette override and its rim.
export function tunedDef(def, t, slots) {
  const palette = tunedPalette(def, t, slots), rim = t.rim === undefined ? def.rim : t.rim || undefined;
  const out = { ...def, palette, rim };
  if (!Object.keys(palette).length) delete out.palette;
  if (!rim) delete out.rim;
  return out;
}

// A group's tune (all monsters) and a sprite's own, together: the sliders add up; the sprite's
// own ink and rim win over the group's.
export function combine(group, own) {
  const t = {};
  for (const s of SLIDERS) t[s.key] = clamp(Math.round((group?.[s.key] || 0) + (own?.[s.key] || 0)), s.min, s.max);
  const ink = own?.ink || group?.ink;
  if (ink) t.ink = ink;
  const rim = own && own.rim !== undefined ? own.rim : group?.rim;
  if (rim !== undefined) t.rim = rim;
  return t;
}

// Mean luma (0 to 255) of the frames' pixels, leaving out the colours in `skip` (packed: the ink
// and the rim). The review found monsters at 60 to 90 lost in the night.
export function meanLuma(frames, skip = new Set()) {
  let sum = 0, n = 0;
  for (const b of frames) {
    for (const c of b.d) {
      if (!(c >>> 24) || skip.has(c)) continue;
      sum += luma(c);
      n++;
    }
  }
  return n ? sum / n : 0;
}

// The code the tuner hands over for a sprite, and back:
//   "FS tune spider lift=40 bright=10 ink=3a2e4a rim"   (sliders at 0 left out)
// ink=rrggbb: the outline's colour; rim: the pale rim (rim=rrggbb another colour, rim=off none).
const HEX = /^#?([0-9a-f]{6})$/i;
const NAME = /^[a-z][a-z0-9_]*$/;
export function tuneCode(name, t) {
  const parts = ['FS', 'tune', name, ...SLIDERS.filter((s) => t[s.key]).map((s) => `${s.key}=${t[s.key]}`)];
  if (t.ink) parts.push(`ink=${t.ink.slice(1)}`);
  if (t.rim === false) parts.push('rim=off');
  else if (t.rim) parts.push(t.rim === RIM ? 'rim' : `rim=${t.rim.slice(1)}`);
  return parts.join(' ');
}
export function parseTuneCode(code) {
  const [tag, kind, name, ...rest] = String(code).trim().split(/\s+/);
  if (tag !== 'FS' || kind !== 'tune' || !NAME.test(name || '')) return null;
  const tune = neutral();
  for (const token of rest) {
    const [k, v, more] = token.split('=');
    const s = SLIDERS.find((x) => x.key === k);
    if (more !== undefined) return null;
    if (s) {
      if (!/^-?\d+$/.test(v || '')) return null;
      tune[k] = clamp(Number(v), s.min, s.max);
    } else if (k === 'rim' && v === undefined) tune.rim = RIM;
    else if (k === 'rim' && v === 'off') tune.rim = false;
    else if (k === 'ink' || k === 'rim') {
      const m = HEX.exec(v || '');
      if (!m) return null;
      tune[k] = `#${m[1].toLowerCase()}`;
    } else return null;
  }
  return { name, tune };
}

// The codes in what was pasted: the tuner's "copy all" blob (JSON, its `codes`), or any text with
// "FS tune …" codes in it, one a line or run together. Returns { tunes: [{ name, tune }], bad }.
export function parseTunes(text) {
  const s = String(text).trim();
  let chunks;
  if (s.startsWith('{')) {
    let j;
    try {
      j = JSON.parse(s);
    } catch {
      return { tunes: [], bad: ['not valid JSON'] };
    }
    chunks = Array.isArray(j.codes) ? j.codes.map(String) : [];
  } else chunks = s.split(/\r?\n|(?=\bFS\s+tune\s)/);
  const tunes = [], bad = [];
  for (const chunk of chunks) {
    const c = chunk.trim();
    if (!c.startsWith('FS')) continue;
    const p = parseTuneCode(c);
    if (p) tunes.push(p);
    else bad.push(c);
  }
  return { tunes, bad };
}
