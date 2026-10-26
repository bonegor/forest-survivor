// Lyra the Ranger, "Knight style A": a skin drawn to sit beside the plumed Knight (public/js/art/knight-plumed.js).
// Drawn in code, no plugin: body parts are shapes with their own shading ramps, lit from the upper front,
// stamped back to front per frame; edges take the darkest shade of their own material (no black outline),
// and a part tucked behind another darkens where it meets it. Face, ear, bow and arrow are placed by hand.
// Run from anywhere: node gms/3001/sprites/lab/src/ranger-knightstyle/a/ranger-a.mjs
// Writes gms/3001/sprites/lab/sheets/archer-knightstyle-a.png (88 frames of 48x48; rows right, glow, glowLeft).
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writePng } from '../../../../../../../tools/png.mjs';
import { makeBuf, hexPack } from '../../../../../../../public/js/engine/pixels.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHEET = join(HERE, '../../../sheets/archer-knightstyle-a.png');
const W = 48, H = 48;

// ---- palette: 7-step ramps, hue-shifted (shadows lean blue/purple, lights lean warm) ----------------
export const RAMPS = {
  // forest green, the main colour: teal-blue shadow to a warm moss light
  green: ['#0a1a1d', '#0f3330', '#14503a', '#1d6f3f', '#2f9043', '#62b04a', '#b0d968'],
  // silver hair (and the steel arrowhead): purple-grey shadow to a pink-warm light, as the Knight's steel
  hair: ['#261c38', '#4b4166', '#7a7096', '#a69cbc', '#cfc3d8', '#ecdfe8', '#ffffff'],
  skin: ['#3a1726', '#6d3138', '#a3554b', '#d1836a', '#efb08c', '#ffd6b6', '#fff1e2'],
  // brown leather: plum shadow to a tan light
  leather: ['#1b0e1d', '#341826', '#552a2c', '#7a4233', '#9f6340', '#c48b58', '#e4b97e'],
  // the bow's pale yew
  wood: ['#2b1219', '#55291f', '#84482b', '#b0703a', '#d49a52', '#ecc47c', '#fbe8b4'],
  // the one warm accent: amber-gold (hair tie, clasp, bow nocks and grip, fletching)
  amber: ['#2e0c0c', '#6e1f0e', '#b0400f', '#e2741a', '#ffa834', '#ffd66a', '#fff6c6'],
};
// Her one glowing colour: the moonstone at the cloak's clasp and the arrow's tip.
export const GLOW = '#b4ffd6';
const MATS = Object.keys(RAMPS);
const MI = Object.fromEntries(MATS.map((m, i) => [m, i]));
const GLOWM = MATS.length;
const COLOURS = MATS.map((m) => RAMPS[m].map((h) => hexPack(h)));
const GLOWC = hexPack(GLOW);

// Light comes from above and in front (she faces right).
const LX = 0.5, LY = -0.86;

// ---- the canvas -----------------------------------------------------------------------------------
class Canvas {
  constructor() {
    this.mat = new Int8Array(W * H).fill(-1);
    this.val = new Float32Array(W * H);
    this.part = new Int16Array(W * H).fill(-1);
    this.lvl = new Int8Array(W * H).fill(-1); // set by hand: wins over the shading
    this.parts = [];
  }
  // A new part: edge (its silhouette edge darkens), occl (it darkens what lies behind it where they meet),
  // line (a part behind it of the same material gets a dark line, not just a shade).
  begin(name, o = {}) {
    this.parts.push({ name, edge: o.edge ?? true, occl: o.occl ?? true, behind: o.behind ?? 1 });
    this.cur = this.parts.length - 1;
    return this;
  }
  set(x, y, m, v, lvl = -1) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = y * W + x;
    this.mat[i] = m === 'glow' ? GLOWM : MI[m];
    this.val[i] = v;
    this.lvl[i] = lvl;
    this.part[i] = this.cur;
  }
  // Fill: inside(x, y) for pixel centres; shade(x, y) gives the ramp value.
  fill(x0, y0, x1, y1, inside, m, shade) {
    for (let y = Math.floor(y0) - 1; y <= Math.ceil(y1) + 1; y++)
      for (let x = Math.floor(x0) - 1; x <= Math.ceil(x1) + 1; x++)
        if (inside(x, y)) this.set(x, y, m, shade(x, y));
  }
  // A polygon (points at pixel centres), shaded as a rounded form: centre and radii from its box
  // unless given.
  poly(pts, m, base, amp = 1.6, o = {}) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const cx = o.cx ?? (x0 + x1) / 2, cy = o.cy ?? (y0 + y1) / 2;
    const rx = o.rx ?? Math.max(1, (x1 - x0) / 2), ry = o.ry ?? Math.max(1, (y1 - y0) / 2);
    const inside = (px, py) => {
      px += 0.013; py += 0.007;
      let c = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    this.fill(x0, y0, x1, y1, inside, m, (x, y) => base + amp * (((x - cx) / rx) * LX + ((y - cy) / ry) * LY) + (o.grad ? o.grad(x, y) : 0));
    return this;
  }
  ellipse(cx, cy, rx, ry, m, base, amp = 1.6) {
    this.fill(cx - rx, cy - ry, cx + rx, cy + ry,
      (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1,
      m, (x, y) => base + amp * (((x - cx) / rx) * LX + ((y - cy) / ry) * LY));
    return this;
  }
  // A limb: pixels within r of the segment a-b (r from ra to rb), shaded by the normal off its axis.
  capsule([ax, ay], [bx, by], ra, rb, m, base, amp = 1.6) {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
    const near = (x, y) => {
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
      const qx = ax + t * dx, qy = ay + t * dy, r = ra + (rb - ra) * t;
      return { t, nx: (x - qx) / r, ny: (y - qy) / r, d: Math.hypot(x - qx, y - qy), r };
    };
    const R = Math.max(ra, rb);
    this.fill(Math.min(ax, bx) - R, Math.min(ay, by) - R, Math.max(ax, bx) + R, Math.max(ay, by) + R,
      (x, y) => { const n = near(x, y); return n.d <= n.r + 0.05; },
      m, (x, y) => { const n = near(x, y); return base + amp * (n.nx * LX + n.ny * LY); });
    return this;
  }
  // Hand-placed pixels: rows of keys at (x0, y0); KEYS maps a key to [material, level].
  grid(x0, y0, rows) {
    rows.forEach((r, j) => [...r].forEach((ch, i) => {
      if (ch === '.' || ch === ' ') return;
      const k = KEYS[ch];
      if (!k) throw new Error(`no key "${ch}"`);
      this.set(x0 + i, y0 + j, k[0], 0, k[1]);
    }));
    return this;
  }
  px(x, y, m, lvl) { this.set(x, y, m, 0, lvl); return this; }
  // A 1-px line in one colour.
  line(x0, y0, x1, y1, m, lvl) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.px(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, m, lvl);
    return this;
  }

  // Shading to levels, then the edges: silhouette edges take the darkest shade (a lit top or front edge
  // one step up); where a part meets one drawn over it, it darkens (a dark line within one material).
  resolve() {
    const L = new Int8Array(W * H).fill(-1);
    for (let i = 0; i < W * H; i++) {
      if (this.mat[i] < 0) continue;
      if (this.mat[i] === GLOWM) { L[i] = 0; continue; }
      L[i] = this.lvl[i] >= 0 ? this.lvl[i] : Math.max(1, Math.min(6, Math.round(this.val[i])));
    }
    const out = L.slice();
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (this.mat[i] < 0 || this.mat[i] === GLOWM) continue;
      const P = this.parts[this.part[i]];
      let litEdge = false, darkEdge = false, under = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = at(x + dx, y + dy);
        if (j < 0 || this.mat[j] < 0) {
          if (dx === 1 || dy === -1) litEdge = true; else darkEdge = true;
          continue;
        }
        const Q = this.parts[this.part[j]];
        if (this.part[j] > this.part[i] && Q.occl && this.mat[j] !== GLOWM) {
          under = Math.max(under, this.mat[j] === this.mat[i] ? 2 : Q.behind);
        }
      }
      if (P.edge && (darkEdge || litEdge)) out[i] = darkEdge ? 0 : Math.max(1, L[i] - 2);
      else if (under === 2) out[i] = Math.min(L[i], 1) - (L[i] <= 2 ? 1 : 0);
      else if (under) out[i] = Math.max(1, L[i] - under);
      if (out[i] < 0) out[i] = 0;
    }
    this.out = out;
    return this;
  }
  // After resolve(): final pixels, set by hand (highlights, the eye).
  dot(x, y, m, lvl) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return this;
    const i = y * W + x;
    this.mat[i] = m === 'glow' ? GLOWM : MI[m];
    this.out[i] = lvl;
    return this;
  }
  // The frame as a pixel buffer.
  buf() {
    const b = makeBuf(W, H);
    for (let i = 0; i < W * H; i++) {
      const m = this.mat[i];
      if (m < 0) continue;
      b.d[i] = m === GLOWM ? GLOWC : COLOURS[m][this.out[i]];
    }
    return b;
  }
}

// Hand keys: hair 0-6, skin k-q (0-6), green A-G (0-6), leather a-g, amber r-x (0-6), wood H-N, glow '*'.
const KEYS = { '*': ['glow', 0] };
'0123456'.split('').forEach((c, i) => (KEYS[c] = ['hair', i]));
'klmnopq'.split('').forEach((c, i) => (KEYS[c] = ['skin', i]));
'ABCDEFG'.split('').forEach((c, i) => (KEYS[c] = ['green', i]));
'abcdefg'.split('').forEach((c, i) => (KEYS[c] = ['leather', i]));
'rstuvwx'.split('').forEach((c, i) => (KEYS[c] = ['amber', i]));
'HIJKLMN'.split('').forEach((c, i) => (KEYS[c] = ['wood', i]));

export { Canvas, KEYS };

// ==== the figure ====================================================================================
// Measured on the plumed Knight: helm top to sole 28 px (rows 19-46 of his 64 px cell), plume 2 px over
// the helm, torso about 10 px across, legs 4-5 px. Lyra: crown to sole 27 px (rows 13-39), the ponytail
// 2 px over the crown, torso 7 px across, legs 3 px. Feet stand on row 39.

const lerp = (a, b, t) => a + (b - a) * t;
const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const add = (p, dx, dy) => [p[0] + dx, p[1] + dy];
// A two-bone limb: the joint between a and c, bent towards `side` (+1: forward/right).
function joint(a, c, l1, l2, side = 1) {
  const dx = c[0] - a[0], dy = c[1] - a[1], d = Math.hypot(dx, dy);
  if (d >= l1 + l2 - 0.01) return lerp2(a, c, l1 / (l1 + l2));
  const x = (d * d + l1 * l1 - l2 * l2) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const ux = dx / d, uy = dy / d;
  let px = -uy, py = ux;
  if (px * side < 0) { px = -px; py = -py; }
  return [a[0] + ux * x + px * h, a[1] + uy * x + py * h];
}

// ---- the cloak: a hooded cloak, the hood fallen in a roll at the nape, the cape behind ------------
// t: ripple phase (0..1), wind: how far it streams back (0 hangs, 1 walking), kick: the shot's recoil.
function cape(C, p) {
  const oy = p.oy || 0, t = p.t || 0, wind = p.wind || 0, kick = p.kick || 0;
  const top = 21.6 + oy, len = 13.6 - wind * 2.6 - kick * 1.2;
  const back = [];
  const N = 7;
  for (let k = 0; k <= N; k++) {
    const s = k / N;
    const ripple = Math.sin(2 * Math.PI * (s * 1.1 - t)) * (0.35 + 1.2 * s) * (0.55 + wind * 0.8);
    const x = 20.4 - s * (4.6 + wind * 6.4 + kick * 3.2) + ripple;
    // streaming, it bellies upward in the middle before falling to the tip
    const y = top + s * len - s * s * (wind * 3 + kick * 1.6) - Math.sin(Math.PI * s) * (wind * 2.2 + kick * 1.2);
    back.push([x, y]);
  }
  const b = back[N];
  const hem = [];
  const M = 5;
  for (let k = 1; k <= M; k++) {
    const s = k / M;
    const wob = Math.sin(2 * Math.PI * (s * 0.9 - t + 0.3)) * 0.7;
    hem.push([lerp(b[0], 22.6, s), lerp(b[1], 34.6 + oy - wind * 0.8, s) + (k % 2 ? 1.3 : -0.5) * (0.6 + wind * 0.6) + wob]);
  }
  const pts = [[22.8, top - 0.2], ...back, ...hem, [23.2, 26 + oy]];
  C.begin('cape').poly(pts, 'green', 3.5, 1.5, {
    cx: 21, cy: top + 3, rx: 5, ry: 7,
    // folds: soft bands running down the cape that travel with the ripple
    grad: (x, y) => 1.05 * Math.sin((x - 20) * 1.05 + (y - top) * 0.38 - 2 * Math.PI * t),
  });
}

// ---- legs --------------------------------------------------------------------------------------------
// L: { hip: x, ankle: [x, y], foot: 'flat' | 'toe' | 'air' }
function leg(C, side, L, oy) {
  const near = side === 'near';
  const hip = [L.hip, 30.6 + oy], ank = L.ankle;
  const knee = joint(hip, ank, 4.1, 4.1, 1);
  const g = near ? 3.9 : 2.8, l = near ? 4.2 : 3.2;
  C.begin(side + '-leg').capsule(hip, knee, 1.5, 1.25, 'green', g, 1.4).capsule(knee, ank, 1.25, 1.1, 'green', g, 1.4);
  const cuff = lerp2(knee, ank, 0.05);
  C.begin(side + '-boot').capsule(cuff, ank, 1.4, 1.25, 'leather', l, 1.5);
  const [ax, ay] = ank;
  if (L.foot === 'toe') C.poly([[ax - 1.2, ay - 0.6], [ax + 0.8, ay - 0.6], [ax + 2.4, ay + 1.2], [ax + 0.2, ay + 1.3]], 'leather', l - 0.4, 1.2);
  else C.poly([[ax - 1.3, ay - 0.6], [ax + 1, ay - 0.6], [ax + 3.2, ay + 1.2], [ax - 1.3, ay + 1.3]], 'leather', l - 0.4, 1.2);
}
const BRACE = { near: { hip: 25.2, ankle: [27.6, 38], foot: 'flat' }, far: { hip: 23.4, ankle: [21, 38], foot: 'flat' } };
const STAND = { near: { hip: 25.2, ankle: [27.4, 38], foot: 'flat' }, far: { hip: 23.4, ankle: [21.0, 38], foot: 'flat' } };
// The stride: 8 frames, the near foot planted ahead on 0 and the far one on 4.
function stride(side, w) {
  const s = ((w / 8) + (side === 'near' ? 0 : 0.5)) % 1;
  const hip = side === 'near' ? 24.4 : 23.0;
  const base = 23.8;
  if (s < 0.5) {
    const dx = 3.4 - 13.6 * s;
    return { hip, ankle: [base + dx, 38], foot: dx < -2 ? 'toe' : 'flat' };
  }
  const u = (s - 0.5) * 2, dx = -3.4 + 6.8 * u;
  return { hip, ankle: [base + dx, 38 - 2.3 * Math.sin(Math.PI * u)], foot: 'air' };
}

// ---- body ----------------------------------------------------------------------------------------------
function torso(C, oy) {
  C.begin('skirt').poly([[21.2, 27.6], [27.2, 27.6], [28.4, 31.2], [26.8, 32.3], [24.8, 31.6], [22.6, 32.3], [20.4, 31.3]].map((q) => add(q, 0, oy)), 'green', 4.2, 1.6);
  C.begin('chest').poly([[21.2, 22.6], [22.8, 21.9], [26.2, 21.9], [27.6, 23.1], [27.6, 26.6], [26.9, 28.2], [21.6, 28.2], [20.8, 26]].map((q) => add(q, 0, oy)),
    'leather', 4.3, 1.9, { cx: 25.5, cy: 23.5, rx: 4, ry: 5 });
  C.begin('belt').poly([[21, 27.5], [27.6, 27.5], [27.6, 28.5], [21, 28.5]].map((q) => add(q, 0, oy)), 'leather', 2.0, 0.6);
}
// The hood, fallen in a roll around the neck and over the shoulders.
function hood(C, oy) {
  C.begin('hood').poly([[19.4, 21.8], [20.6, 20.6], [22.6, 20.8], [24.6, 22], [26.6, 22.4], [25.6, 23.6], [22.6, 24.2], [20, 24]].map((q) => add(q, 0, oy)),
    'green', 4.1, 1.8, { cx: 22.6, cy: 22.6, rx: 3.5, ry: 2 });
}
// The ponytail: rooted at the tie on the back of the crown, springing up and back, falling behind her.
// sway: the tip's swing back (px, may be negative), lag: the lower half's vertical lag behind the bob.
function ponytail(C, oy, sway, lag) {
  const P = [[22.2, 13.6], [20.8, 12.2], [19.2, 12.0], [18.2, 13.4], [17.8, 15.2], [17.9, 18], [18.5, 20.6], [19.4, 23]];
  const R = [1.6, 1.9, 2.1, 2.1, 1.9, 1.6, 1.2, 0.7];
  const pts = P.map(([x, y], i) => {
    const k = Math.max(0, (i - 2) / 5);
    return [x - sway * k ** 1.3, y + oy + lag * k];
  });
  C.begin('ponytail');
  // the hair gathered at the back of the head, under the tail
  C.ellipse(21.4, 15.6 + oy, 2.2, 2.6, 'hair', 2.4, 1.2);
  for (let i = 0; i < pts.length - 1; i++) C.capsule(pts[i], pts[i + 1], R[i], R[i + 1], 'hair', 3.3, 2.1);
  return pts;
}
// The head, placed by hand (x 20-29, rows 13-22): silver hair drawn back from a swept fringe, the
// long ear sweeping up and back out of it, the face in three-quarter profile with the nose a pixel
// proud. Hair 0-6, skin k-q (dark to light), x the eye's lash line, v the green iris.
const HEAD = [
  '...01110..',
  '..0244551.',
  '.023356651',
  '0122345540',
  '0112234opl',
  '01122opxpl',
  '00112opvqo',
  '.011mnopnl',
  '..00klnom.',
  '....lmk...',
];
// The long ear, laid over the hair from the cheek up and back to a tip just proud of the head.
const EAR = [[20, 15, 'n'], [21, 16, 'o'], [22, 17, 'o'], [23, 18, 'p'], [24, 18, 'o'], [21, 17, 'l'], [22, 18, 'm'], [23, 19, 'm'], [24, 19, 'n'],
  [20, 16, 'k'], [21, 18, 'k'], [22, 19, 'k']];
KEYS.x = ['hair', 0];
KEYS.v = ['green', 5];
function head(C, oy) {
  C.begin('head', { edge: false }).grid(20, 13 + oy, HEAD);
  for (const [x, y, k] of EAR) C.px(x, y + oy, ...KEYS[k]);
}

// ---- arms ---------------------------------------------------------------------------------------------------
const SH_NEAR = [25.6, 23.2], SH_FAR = [22.6, 23.4];
const BOW_ARM = {
  rest: { elbow: [28.2, 26.0], hand: [31.8, 28.4], ang: 0.17 },
  carry: { elbow: [28.4, 25.2], hand: [32.0, 26.0], ang: 0.2 },
  mid: { elbow: [28.4, 25], hand: [31.2, 25.2], ang: 0.5 },
  high: { elbow: [29.2, 22.8], hand: [32.8, 22.4], ang: 0.04 },
};
function armSegs(C, name, sh, el, hd, base, oy) {
  const s = add(sh, 0, oy), e = add(el, 0, oy), h = add(hd, 0, oy);
  C.begin(name + '-sleeve').capsule(s, e, 1.4, 1.15, 'green', base + 0.8, 1.6);
  C.begin(name + '-bracer').capsule(lerp2(e, h, 0.15), lerp2(e, h, 0.85), 1.05, 1.05, 'leather', base, 1.4);
}

// ---- the bow ---------------------------------------------------------------------------------------------
const HALF = 9.4;
function bowGeom(g, ang, pull) {
  const d = [Math.sin(ang), -Math.cos(ang)], f = [Math.cos(ang), Math.sin(ang)];
  const bend = 2.5 + pull * 0.12;
  const v = (u) => -bend * (u / HALF) ** 2;
  const P = (u, w) => [g[0] + d[0] * u + f[0] * w, g[1] + d[1] * u + f[1] * w];
  return { P, v, d, f, top: P(HALF, v(HALF)), bot: P(-HALF, v(HALF)) };
}
function drawBow(C, B) {
  const { P, v } = B;
  const cells = new Map();
  const put = (q, m, l, pri) => {
    const k = Math.round(q[0]) + ',' + Math.round(q[1]);
    const o = cells.get(k);
    if (!o || o.pri <= pri) cells.set(k, { x: Math.round(q[0]), y: Math.round(q[1]), m, l, pri });
  };
  for (let u = -HALF; u <= HALF + 0.01; u += 0.2) {
    const a = Math.abs(u) / HALF;
    const tip = a > 0.92, grip = a < 0.12;
    put(P(u, v(u) - 0.85), tip ? 'amber' : 'wood', tip ? 2 : grip ? 2 : a > 0.6 ? 1 : 2, 1);
    put(P(u, v(u)), tip || grip ? 'amber' : 'wood', tip ? 4 : grip ? 3 : u > 0 ? (a > 0.6 ? 4 : 5) : (a > 0.6 ? 3 : 4), 2);
  }
  for (const c of cells.values()) C.dot(c.x, c.y, c.m, c.l);
  const gl = P(HALF * 0.45, v(HALF * 0.45));
  C.dot(gl[0], gl[1], 'wood', 6);
}
function drawString(C, B, nock, vib = 0, lv = 4) {
  const seg = (a, b, wob) => {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1) * 2;
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      C.dot(lerp(a[0], b[0], s) + (wob ? wob * Math.sin(s * Math.PI * 3) : 0), lerp(a[1], b[1], s), 'hair', lv);
    }
  };
  if (!nock) seg(B.top, B.bot, vib);
  else { seg(B.top, nock, 0); seg(nock, B.bot, 0); }
}
const ARROW = 14;
function drawArrow(C, nock, f) {
  const at = (s) => [nock[0] + f[0] * s, nock[1] + f[1] * s];
  for (let s = 0; s <= ARROW; s += 0.5) {
    const q = at(s);
    let m = 'wood', l = 5;
    if (s < 1) { m = 'amber'; l = 3; } else if (s < 3) { m = 'amber'; l = 5; } else if (s > ARROW - 0.6) { m = 'glow'; l = 0; } else if (s > ARROW - 2.6) { m = 'hair'; l = s > ARROW - 1.6 ? 6 : 4; }
    C.dot(q[0], q[1], m, l);
  }
  const a = at(1.5);
  C.dot(a[0], a[1] - 1, 'amber', 4).dot(a[0] - 1, a[1] - 1, 'amber', 3).dot(a[0], a[1] + 1, 'amber', 3).dot(a[0] - 1, a[1] + 1, 'amber', 2);
  const h = at(ARROW - 1.5);
  C.dot(h[0], h[1] - 1, 'hair', 3).dot(h[0], h[1] + 1, 'hair', 2);
}
function fist(C, h) {
  const x = Math.round(h[0]), y = Math.round(h[1]);
  C.dot(x, y - 1, 'skin', 4).dot(x + 1, y - 1, 'skin', 3).dot(x, y, 'skin', 3).dot(x + 1, y, 'skin', 1).dot(x - 1, y, 'leather', 1).dot(x - 1, y - 1, 'leather', 2);
}

// ---- a frame ---------------------------------------------------------------------------------------------------
function frame(p) {
  const C = new Canvas();
  const oy = p.oy || 0;
  cape(C, p);
  const A = BOW_ARM[p.arm || 'rest'];
  const swing = p.swing || 0;
  const g = add(A.hand, swing, oy);
  const pull = p.pull || 0;
  const B = bowGeom(g, A.ang + swing * 0.06, pull);
  let nock = null, farHand, farElbow;
  if (p.arm === 'high' && pull > 0) {
    nock = [Math.round(B.top[0] - pull), Math.round(g[1])];
    farHand = nock;
    farElbow = lerp2([24.6, 25.2 + oy], [19.6, 22.2 + oy], Math.min(1, pull / 7));
  }
  if (p.snap) { farHand = [22.4, 20.6 + oy]; farElbow = [19.8, 22.6 + oy]; }
  else if (p.hand === 'eased') { farHand = [22.8, 23.4 + oy]; farElbow = [20.4, 25.4 + oy]; }
  if (!farHand) {
    const fs = p.farSwing || 0;
    farElbow = [21.6 - fs * 0.5, 26.2 + oy];
    farHand = [21.6 - fs, 28.8 + oy];
  }
  const fsh = add(SH_FAR, 0, oy);
  C.begin('far-sleeve').capsule(fsh, farElbow, 1.3, 1.05, 'green', 2.0, 1.4);
  const drawing = p.arm === 'high' && (pull > 0 || p.snap || p.hand === 'eased');
  if (!drawing) {
    C.begin('far-bracer').capsule(lerp2(farElbow, farHand, 0.15), farHand, 1.0, 1.0, 'leather', 2.0, 1.2);
    C.begin('far-hand').ellipse(farHand[0], farHand[1] + 0.6, 0.9, 0.9, 'skin', 2.2, 1);
  }
  leg(C, 'far', p.far, oy);
  torso(C, oy);
  leg(C, 'near', p.near, oy);
  hood(C, oy);
  if (drawing) {
    C.begin('far-bracer').capsule(farElbow, farHand, 1.05, 0.95, 'leather', 2.8, 1.4);
    C.begin('far-hand').ellipse(farHand[0], farHand[1], 1.0, 1.0, 'skin', 3.4, 1.2);
  }
  ponytail(C, oy, p.sway || 0, p.lag || 0);
  head(C, oy);
  armSegs(C, 'near', SH_NEAR, [A.elbow[0] + swing * 0.5, A.elbow[1]], [g[0], g[1] - oy], 3.4, oy);
  C.resolve();
  // the tie on the ponytail, the cloak's clasp with its moonstone, the belt buckle
  C.dot(22, 13 + oy, 'amber', 4).dot(22, 14 + oy, 'amber', 2).dot(21, 14 + oy, 'amber', 3);
  C.dot(25, 23 + oy, 'amber', 4).dot(26, 23 + oy, 'glow', 0).dot(26, 24 + oy, 'amber', 2);
  C.dot(27, 28 + oy, 'amber', 4).dot(26, 28 + oy, 'amber', 2);
  drawBow(C, B);
  if (nock) {
    drawString(C, B, nock);
    if (p.arrow) drawArrow(C, add(nock, 1, 0), [1, 0]);
    C.dot(nock[0], nock[1], 'skin', 4).dot(nock[0] - 1, nock[1], 'skin', 3).dot(nock[0], nock[1] + 1, 'skin', 2).dot(nock[0] - 1, nock[1] + 1, 'skin', 1).dot(nock[0], nock[1] - 1, 'skin', 3);
  } else {
    drawString(C, B, p.snap ? [B.top[0] + 1, g[1]] : null, p.vib || 0, p.arm === 'high' ? 4 : 2);
  }
  fist(C, g);
  if (p.streak) streak(C, B, p.streak, Math.round(g[1]));
  return C.buf();
}
// The loosed arrow's wake: a bright swoosh from the bow to the edge of the cell, then its last wisps.
function streak(C, B, k, y) {
  const x0 = Math.round(B.top[0]) + 3;
  if (k === 1) {
    // a white swoosh along the arrow's line, thickest just past the bow, its far end a glint
    for (let x = x0; x <= 46; x++) {
      const s = (x - x0) / (46 - x0);
      C.dot(x, y, 'hair', s < 0.55 ? 6 : s < 0.85 ? 5 : 4);
      if (s > 0.08 && s < 0.7) C.dot(x, y - 1, 'hair', s < 0.4 ? 5 : 3);
      if (s > 0.2 && s < 0.5) C.dot(x, y + 1, 'hair', 3);
    }
    C.dot(46, y, 'glow', 0);
    // the string's slap: a flash either side of the snapped string
    const sx = Math.round(B.top[0]) + 1;
    C.dot(sx + 1, y - 2, 'amber', 5).dot(sx + 1, y + 2, 'amber', 5).dot(sx + 2, y - 3, 'amber', 6).dot(sx + 2, y + 3, 'amber', 6);
  } else {
    // its last wisps
    for (let x = x0 + 5; x <= 45; x += 4) {
      C.dot(x, y, 'hair', x > 38 ? 3 : 5).dot(x + 1, y, 'hair', x > 38 ? 2 : 4);
    }
  }
}

// ---- the animations ------------------------------------------------------------------------------------------
const BREATH = [0, 0, 0, -1, -1, -1, 0, 0];
const lagOf = (bob, i) => bob[(i + bob.length - 1) % bob.length] - bob[i];
const idle = (i) => ({
  oy: BREATH[i], lag: lagOf(BREATH, i) * 0.8, t: i / 8, wind: 0.3 + 0.12 * Math.sin((2 * Math.PI * i) / 8),
  sway: 1.0 * Math.sin((2 * Math.PI * (i - 1)) / 8), near: STAND.near, far: STAND.far, arm: 'rest',
});
const BOB = [0, 1, 0, -1, 0, 1, 0, -1];
const walk = (w) => ({
  oy: BOB[w], lag: lagOf(BOB, w), t: w / 4, wind: 0.9 + 0.15 * Math.sin((2 * Math.PI * w) / 4),
  sway: 1.8 + 0.9 * Math.sin((2 * Math.PI * w) / 4), near: stride('near', w), far: stride('far', w), arm: 'carry',
  swing: [0, 0.4, 0.8, 0.4, 0, -0.4, -0.8, -0.4][w], farSwing: [-1, -0.5, 0, 0.5, 1, 0.5, 0, -0.5][w],
});
// Lift, nock, draw, draw to the chin, hold, loose (frame 5: the arrow leaves), follow through, lower.
const SHOT = [
  { arm: 'mid', pull: 0, kick: 0 },
  { arm: 'high', pull: 1, arrow: true },
  { arm: 'high', pull: 4, arrow: true },
  { arm: 'high', pull: 6, arrow: true },
  { arm: 'high', pull: 7, arrow: true },
  { arm: 'high', pull: 0, snap: true, streak: 1, kick: 1 },
  { arm: 'high', pull: 0, hand: 'eased', vib: 0.6, streak: 2, kick: 0.5 },
  { arm: 'mid', pull: 0, kick: 0.2 },
];
const shoot = (k) => ({ oy: 0, t: k / 8, wind: 0.15, sway: k === 5 ? -0.6 : k === 6 ? 0.8 : 0.3, lag: 0, near: BRACE.near, far: BRACE.far, ...SHOT[k] });
const shootWalking = (k, w) => ({ ...walk(w), ...SHOT[k], swing: 0, kick: SHOT[k].kick || 0 });

export function frames() {
  return [
    ...Array.from({ length: 8 }, (_, i) => frame(idle(i))),
    ...Array.from({ length: 8 }, (_, i) => frame(walk(i))),
    ...Array.from({ length: 8 }, (_, i) => frame(shoot(i))),
    ...Array.from({ length: 8 }, (_, k) => Array.from({ length: 8 }, (_, w) => frame(shootWalking(k, w)))).flat(),
  ];
}

// ---- the sheet ----------------------------------------------------------------------------------------------
export function buildSheet(file = SHEET) {
  const fr = frames();
  const sheet = makeBuf(W * fr.length, H * 3);
  fr.forEach((f, i) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = f.d[y * W + x];
      if (!(c >>> 24)) continue;
      sheet.d[y * sheet.w + i * W + x] = c;
      if (c === GLOWC) {
        sheet.d[(H + y) * sheet.w + i * W + x] = c;
        sheet.d[(2 * H + y) * sheet.w + i * W + (W - 1 - x)] = c;
      }
    }
  });
  writePng(file, sheet);
  // checks: 1 px clear at the edges, the soles on row 39, nothing below
  let bad = 0;
  const cols = new Set();
  fr.forEach((f, i) => {
    let x0 = 99, x1 = -1, y0 = 99, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (f.d[y * W + x] >>> 24) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      cols.add(f.d[y * W + x]);
    }
    if (x0 < 1 || y0 < 1 || x1 > W - 2 || y1 !== 39) { bad++; console.log(`frame ${i}: x ${x0}-${x1} y ${y0}-${y1}`); }
  });
  console.log(`${fr.length} frames, ${cols.size} colours, ${bad ? bad + ' frame(s) need a look' : 'all clear of the edges, soles on row 39'}`);
  return fr;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildSheet();
