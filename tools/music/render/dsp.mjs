// tools/music/render/dsp.mjs — the signal-processing pieces the renderer's modules share: biquad
// sections, the 4th-order Butterworth high-pass, a low shelf, an in-place FFT, and seeded random
// numbers (the game's own mulberry32, from public/js/engine/util.js). No other dependencies.

export { mulberry32 } from '../../../public/js/engine/util.js';

export const TAU = 2 * Math.PI;
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/** FNV-1a hash of a string (unsigned 32-bit), to seed mulberry32 from a name. */
export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ── filters ────────────────────────────────────────────────────────────────────────────────────

/** One biquad section, in place: [b0, b1, b2, a0, a1, a2] (divided through by a0 here). */
export function biquad(x, [b0, b1, b2, a0, a1, a2]) {
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i], y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = v; y2 = y1; y1 = y;
    x[i] = y;
  }
  return x;
}

/** 4th-order Butterworth high-pass at f Hz, in place: two RBJ sections (Q 0.5412 and 1.3066). */
export function highpass4(x, f, sr) {
  for (const Q of [0.5412, 1.3066]) {
    const w = (TAU * f) / sr, al = Math.sin(w) / (2 * Q), cw = Math.cos(w);
    biquad(x, [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2, 1 + al, -2 * cw, 1 - al]);
  }
  return x;
}

/** RBJ low shelf (slope 1) at f Hz, gainDb below it, in place. */
export function lowShelf(x, f, gainDb, sr) {
  const A = Math.pow(10, gainDb / 40), w = (TAU * f) / sr, cw = Math.cos(w), al = Math.sin(w) / Math.SQRT2, sa = 2 * Math.sqrt(A) * al;
  return biquad(x, [A * (A + 1 - (A - 1) * cw + sa), 2 * A * (A - 1 - (A + 1) * cw), A * (A + 1 - (A - 1) * cw - sa),
    A + 1 + (A - 1) * cw + sa, -2 * (A - 1 + (A + 1) * cw), A + 1 + (A - 1) * cw - sa]);
}

// ── spectrum ───────────────────────────────────────────────────────────────────────────────────

/** In-place radix-2 FFT of (re, im); the length must be a power of two. */
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}
