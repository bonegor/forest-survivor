// The shapes game/topology's ground is stamped from (28 October 2026): blobs (noisy polar outlines:
// the Abyss's islands, quicksand pools, ice sheets, an oasis's water), chains (points every 8 px with a
// half width at each: isthmuses, broad joinings, bridge decks), the stamping of both onto a chunk's 4 px
// lattice, and the topology's own dice. Each shape's signed distance is one function, read the same by
// the analytic queries (topo.openAt, patchAt, canStand) and by the lattice (topo.terrain), so what is
// stamped and what is asked agree exactly at every lattice point. Pure.

import { hash2, mulberry32, fbm, TAU } from '../../engine/util.js';
import { TN, TSTEP, TMAX, TCHUNK } from './terrain.js';

// The topology's dice: H(a, b, k) in [0, 1) and rngOf(a, b, k), a mulberry32 (int, range, pick) seeded
// by it. The salt 40503 keeps them apart from darkwood.js's own h, and they are an instance's, never
// module state, so nothing of one run's world is left for the next.
export function dice(mapSeed) {
  const base = (mapSeed * 977 + 40503) | 0;
  const H = (a, b, k) => hash2(a, b, base + k * 7919);
  const rngOf = (a, b, k) => mulberry32((H(a, b, k) * 4294967296) >>> 0);
  return { H, rngOf, s: base };
}

export const ss = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const clampT = (v) => (v < -TMAX ? -TMAX : v > TMAX ? TMAX : v);

// ---- Blobs ---------------------------------------------------------------------------------------
export const NR = 24; // polar radii round a blob
const SAMPLES = 96;
// A blob round (x, y): radius r, squashed across to ax of it (an ellipse r along, r * ax across) and
// turned by rot; its outline rad[k] at the k-th 24th of a turn, R * (1 + amp * noise) smoothed `smooth`
// times by neighbour averaging. fine: { amp: px, cell: px, seed }, a finer wobble of the rim (the
// Abyss's coasts), periodic round the turn. ext and inn: the farthest and nearest its rim ever comes,
// worked out once by sampling, for its box and the quick answers far in and far out.
export function makeBlob(x, y, r, ax, rot, amp, rnd, smooth = 1, fine = null) {
  let rad = new Float32Array(NR);
  for (let k = 0; k < NR; k++) rad[k] = r * (1 + amp * (rnd() - 0.5) * 2);
  for (let s = 0; s < smooth; s++) {
    const o = new Float32Array(NR);
    for (let k = 0; k < NR; k++) o[k] = (rad[(k + NR - 1) % NR] + 2 * rad[k] + rad[(k + 1) % NR]) / 4;
    rad = o;
  }
  const b = { x, y, r, ax, rot, cos: Math.cos(rot), sin: Math.sin(rot), rad, fine, ext: 0, inn: Infinity };
  for (let k = 0; k < SAMPLES; k++) {
    const t = (k / SAMPLES) * TAU, R = rimAt(b, t, Math.cos(t), Math.sin(t));
    // the farthest from the centre in world px: across the squash, a radius counts ax of itself
    const w = Math.hypot(Math.cos(t), Math.sin(t) * ax);
    b.ext = Math.max(b.ext, R * Math.max(1, w));
    b.inn = Math.min(b.inn, R * Math.min(1, w));
  }
  b.ext += 1;
  b.inn -= 1;
  return b;
}
// The rim's radius at angle t (local frame), its cosine and sine given; R_ holds dR/dt after.
let R_ = 0;
function rimAt(b, t, c, s) {
  const rad = b.rad;
  let f = (t / TAU) * NR;
  f -= Math.floor(f / NR) * NR;
  const i = f | 0, u = f - i;
  const p0 = rad[(i + NR - 1) % NR], p1 = rad[i], p2 = rad[(i + 1) % NR], p3 = rad[(i + 2) % NR];
  // Catmull-Rom through the radii, and its slope.
  const a1 = -p0 + p2, a2 = 2 * p0 - 5 * p1 + 4 * p2 - p3, a3 = -p0 + 3 * p1 - 3 * p2 + p3;
  let R = 0.5 * (2 * p1 + a1 * u + a2 * u * u + a3 * u * u * u);
  R_ = 0.5 * (a1 + 2 * a2 * u + 3 * a3 * u * u) * (NR / TAU);
  const F = b.fine;
  if (F) {
    const k = b.r / F.cell; // a circle of the noise's cells as long as the rim
    R += F.amp * (fbm(c * k + 7.31, s * k - 3.17, F.seed, 2) - 0.5) * 2;
  }
  return R;
}
// Signed px from (x, y) to the blob's rim, + inside; -Infinity beyond its reach (its box and `reach`
// px), so that a shape stamped over its box and asked anywhere give the very same answer.
export function blobSdf(b, x, y, reach = 40) {
  const dx = x - b.x, dy = y - b.y, E = b.ext + reach;
  if (dx < -E || dx > E || dy < -E || dy > E) return -Infinity;
  const lx = dx * b.cos + dy * b.sin, ly = (-dx * b.sin + dy * b.cos) / b.ax;
  const d = Math.sqrt(lx * lx + ly * ly);
  // Far in or far out the answer is past TMAX either way (fields are clamped there).
  const wd = Math.sqrt(dx * dx + dy * dy);
  if (wd < b.inn - TMAX - 2) return TMAX + 1;
  if (wd > b.ext + TMAX + 2) return -TMAX - 1;
  if (d < 1e-6) return b.inn;
  const c = lx / d, s = ly / d, R = rimAt(b, Math.atan2(ly, lx), c, s);
  // Along the ray in the squashed frame, then to world px (the ray's own stretch), leaned by the rim's slope.
  const k = wd / d, sl = R_ / d;
  return ((R - d) * k) / Math.sqrt(1 + sl * sl);
}
// The blob's outline in world points (n of them), for the tells and the tools.
export function blobOutline(b, n = 48) {
  const out = new Float32Array(n * 2);
  for (let k = 0; k < n; k++) {
    const t = (k / n) * TAU, c = Math.cos(t), s = Math.sin(t), R = rimAt(b, t, c, s);
    const lx = c * R, ly = s * R * b.ax;
    out[2 * k] = b.x + lx * b.cos - ly * b.sin;
    out[2 * k + 1] = b.y + lx * b.sin + ly * b.cos;
  }
  return out;
}
// Stamp blob b's sdf (times sign) into field f of the chunk at (x0, y0) with max(), over its reach.
export function stampBlob(f, x0, y0, b, reach = 40, sign = 1) {
  const E = b.ext + reach;
  const i0 = Math.max(0, Math.ceil((b.x - E - x0) / TSTEP)), i1 = Math.min(TN - 1, Math.floor((b.x + E - x0) / TSTEP));
  const j0 = Math.max(0, Math.ceil((b.y - E - y0) / TSTEP)), j1 = Math.min(TN - 1, Math.floor((b.y + E - y0) / TSTEP));
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const v = sign * blobSdf(b, x0 + i * TSTEP, y0 + j * TSTEP, reach), c = j * TN + i;
      if (v > f[c]) f[c] = v;
    }
  }
}
export const blobMeets = (b, x0, y0, reach = 40) => b.x + b.ext + reach >= x0 && b.x - b.ext - reach <= x0 + TCHUNK && b.y + b.ext + reach >= y0 && b.y - b.ext - reach <= y0 + TCHUNK;

// ---- Chains ---------------------------------------------------------------------------------------
// Points every 8 px (from a 4 px polyline, every other one) with a half width at each, and its box. A
// chain's sdf at a point is the best hw - distance over its points within hw + 40 of it: the same
// whether stamped point by point onto a lattice or asked at once.
export const CHAIN_REACH = 40;
export function makeChain(xs, ys, hw) {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (let k = 0; k < xs.length; k++) {
    const R = hw[k] + CHAIN_REACH;
    minx = Math.min(minx, xs[k] - R);
    maxx = Math.max(maxx, xs[k] + R);
    miny = Math.min(miny, ys[k] - R);
    maxy = Math.max(maxy, ys[k] + R);
  }
  return { xs: Float32Array.from(xs), ys: Float32Array.from(ys), hw: Float32Array.from(hw), minx, miny, maxx, maxy };
}
export function chainSdf(ch, x, y) {
  if (x < ch.minx || x > ch.maxx || y < ch.miny || y > ch.maxy) return -Infinity;
  const { xs, ys, hw } = ch;
  let best = -Infinity;
  for (let k = 0; k < xs.length; k++) {
    const dx = x - xs[k], dy = y - ys[k], R = hw[k] + CHAIN_REACH, d2 = dx * dx + dy * dy;
    if (d2 > R * R) continue;
    const v = hw[k] - Math.sqrt(d2);
    if (v > best) best = v;
  }
  return best;
}
export const chainMeets = (ch, x0, y0) => ch.maxx >= x0 && ch.minx <= x0 + TCHUNK && ch.maxy >= y0 && ch.miny <= y0 + TCHUNK;
export function stampChain(f, x0, y0, ch) {
  const { xs, ys, hw } = ch;
  for (let k = 0; k < xs.length; k++) {
    const R = hw[k] + CHAIN_REACH, px = xs[k], py = ys[k];
    if (px + R < x0 || px - R > x0 + TCHUNK || py + R < y0 || py - R > y0 + TCHUNK) continue;
    const i0 = Math.max(0, Math.ceil((px - R - x0) / TSTEP)), i1 = Math.min(TN - 1, Math.floor((px + R - x0) / TSTEP));
    const j0 = Math.max(0, Math.ceil((py - R - y0) / TSTEP)), j1 = Math.min(TN - 1, Math.floor((py + R - y0) / TSTEP));
    for (let j = j0; j <= j1; j++) {
      const dy = y0 + j * TSTEP - py;
      for (let i = i0; i <= i1; i++) {
        const dx = x0 + i * TSTEP - px, d2 = dx * dx + dy * dy;
        if (d2 > R * R) continue;
        const v = hw[k] - Math.sqrt(d2), c = j * TN + i;
        if (v > f[c]) f[c] = v;
      }
    }
  }
}

// A lattice field of a chunk, all at v.
export const fieldOf = (v) => new Float32Array(TN * TN).fill(v);
// Clamp a stamped field to ±TMAX; say whether every point is at `all` after (so it can be left out).
export function settle(f, all) {
  let same = true;
  for (let c = 0; c < f.length; c++) {
    const v = f[c] < -TMAX ? -TMAX : f[c] > TMAX ? TMAX : f[c];
    f[c] = v;
    if (v !== all) same = false;
  }
  return same;
}
// One field shared by every chunk that lies wholly in the rock or over the gap (never written to).
export const DEEP = fieldOf(-TMAX);
