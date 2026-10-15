// Shared drawing kit for the remaster-v2 heroes. Every frame is drawn into a Pic: a 48x48 grid
// of palette characters (null: clear). Parts are laid over one another back to front; where a
// part covers another, a separation line may be drawn on the covered pixels (never on clear
// ones: the silhouette outline alone draws the edge against the ground, so ink is never doubled).
// The finished frame gets a 1-px outline around its silhouette and is packed into the pixel
// buffer the game's buildSprite takes.
//
// Coordinates are pixel centres: (x, y) is the pixel in column x, row y. The ground line
// (anchorY) is row 40: the soles' own pixels end on row 38, their outline on row 39.
// Light comes from the top-left.
import { makeBuf, hexPack } from '../../../../../../public/js/engine/pixels.js';
import { PAL as MASTER } from '../../../../../../public/js/art/palette.js';

export const W = 48, H = 48, ANCHOR = 40, SOLE = 38;
export { MASTER };
export const R = Math.round;
export const lerp = (a, b, t) => a + (b - a) * t;

// A palette from { char: '#rrggbb' | masterKey }; '.' and ' ' stay clear.
export function palette(spec) {
  const hex = {};
  for (const [ch, v] of Object.entries(spec)) hex[ch] = v.startsWith('#') ? v : MASTER[v];
  for (const [ch, v] of Object.entries(hex)) if (!/^#[0-9a-f]{6}$/i.test(v || '')) throw new Error(`palette ${ch}: ${v}`);
  const packed = Object.fromEntries(Object.entries(hex).map(([k, v]) => [k, hexPack(v)]));
  return { hex, packed };
}

export class Pic {
  constructor(w = W, h = H) {
    this.w = w;
    this.h = h;
    this.c = new Array(w * h).fill(null);
  }
  clone() {
    const p = new Pic(this.w, this.h);
    p.c = this.c.slice();
    return p;
  }
  ok(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x, y) {
    return this.ok(x, y) ? this.c[y * this.w + x] : null;
  }
  set(x, y, ch) {
    x = R(x);
    y = R(y);
    if (this.ok(x, y)) this.c[y * this.w + x] = ch;
    return this;
  }
  // Paint only where something is already drawn (details on a shape).
  on(x, y, ch) {
    x = R(x);
    y = R(y);
    if (this.get(x, y)) this.c[y * this.w + x] = ch;
    return this;
  }
  rect(x, y, w, h, ch) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, ch);
    return this;
  }
  hline(x0, x1, y, ch, only = false) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) (only ? this.on(x, y, ch) : this.set(x, y, ch));
    return this;
  }
  vline(x, y0, y1, ch, only = false) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) (only ? this.on(x, y, ch) : this.set(x, y, ch));
    return this;
  }
  // Bresenham line between integer points; ch may be a function (x, y, i, n) -> char.
  line(x0, y0, x1, y1, ch, only = false) {
    for (const [x, y, i, n] of linePts(x0, y0, x1, y1)) {
      const c = typeof ch === 'function' ? ch(x, y, i, n) : ch;
      if (c) (only ? this.on(x, y, c) : this.set(x, y, c));
    }
    return this;
  }
  // Polygon fill (pixel centres inside the outline); ch may be a function (x, y) -> char.
  poly(pts, ch, only = false) {
    const ys = pts.map((p) => p[1]);
    const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const xs = [];
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > y !== yj > y) xs.push(xi + ((y - yi) * (xj - xi)) / (yj - yi));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5 + 1e-9); x++) {
          const c = typeof ch === 'function' ? ch(x, y) : ch;
          if (c) (only ? this.on(x, y, c) : this.set(x, y, c));
        }
      }
    }
    return this;
  }
  // Filled ellipse; ch may be a function (x, y, nx, ny) -> char with the offset in radii.
  ellipse(cx, cy, rx, ry, ch, only = false) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const nx = (x - cx) / (rx + 0.5), ny = (y - cy) / (ry + 0.5);
        if (nx * nx + ny * ny > 1) continue;
        const c = typeof ch === 'function' ? ch(x, y, nx, ny) : ch;
        if (c) (only ? this.on(x, y, c) : this.set(x, y, c));
      }
    }
    return this;
  }
  // Rows of characters stamped at (x, y); '.' and ' ' are clear. map renames characters.
  stamp(rows, x, y, { flip = false, only = false, map = null } = {}) {
    const w = Math.max(...rows.map((r) => r.length));
    rows.forEach((r, j) => {
      for (let i = 0; i < r.length; i++) {
        let ch = r[i];
        if (ch === '.' || ch === ' ') continue;
        if (map) ch = typeof map === 'function' ? map(ch, x + (flip ? w - 1 - i : i), y + j) : map[ch] ?? ch;
        if (!ch) continue;
        const X = x + (flip ? w - 1 - i : i);
        (only ? this.on(X, y + j, ch) : this.set(X, y + j, ch));
      }
    });
    return this;
  }
  // Lay `top` over this Pic. Where `top` meets what is already drawn, a separation line goes on
  // the covered pixels (never on clear ones): sep is a character or a function (covered char,
  // x, y) -> char. sides: which of top's edges cast it ('l', 'r', 'u', 'd').
  over(top, { sep = null, sides = 'lrud' } = {}) {
    if (sep) {
      const dirs = [];
      if (sides.includes('l')) dirs.push([-1, 0]);
      if (sides.includes('r')) dirs.push([1, 0]);
      if (sides.includes('u')) dirs.push([0, -1]);
      if (sides.includes('d')) dirs.push([0, 1]);
      const marks = [];
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          if (!top.get(x, y)) continue;
          for (const [ex, ey] of dirs) {
            const X = x + ex, Y = y + ey;
            if (top.get(X, Y) || !this.get(X, Y)) continue;
            marks.push([X, Y]);
          }
        }
      }
      for (const [X, Y] of marks) {
        const c = typeof sep === 'function' ? sep(this.get(X, Y), X, Y) : sep;
        if (c) this.set(X, Y, c);
      }
    }
    for (let i = 0; i < this.c.length; i++) if (top.c[i]) this.c[i] = top.c[i];
    return this;
  }
  recolor(map) {
    for (let i = 0; i < this.c.length; i++) if (this.c[i] && map[this.c[i]] !== undefined) this.c[i] = map[this.c[i]];
    return this;
  }
  shift(dx, dy) {
    const p = new Pic(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.c[y * this.w + x]) p.set(x + dx, y + dy, this.c[y * this.w + x]);
    this.c = p.c;
    return this;
  }
  // Shift rows by a per-row amount: fn(y) -> dx (a shear, a wave).
  shear(fn) {
    const p = new Pic(this.w, this.h);
    for (let y = 0; y < this.h; y++) {
      const dx = R(fn(y));
      for (let x = 0; x < this.w; x++) if (this.c[y * this.w + x]) p.set(x + dx, y, this.c[y * this.w + x]);
    }
    this.c = p.c;
    return this;
  }
  bounds() {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.c[y * this.w + x]) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
  }
}

export function* linePts(x0, y0, x1, y1) {
  x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  const n = Math.max(dx, -dy);
  let err = dx + dy, x = x0, y = y0, i = 0;
  for (;;) {
    yield [x, y, i++, n];
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

// A part drawn on its own: fn(pic) draws it, the result is returned (for over()).
export const part = (fn) => {
  const p = new Pic();
  fn(p);
  return p;
};
export const stamped = (rows, x, y, opts) => new Pic().stamp(rows, x, y, opts);

// ------------------------------------------------------------- shading --

// Directional form shading for a flat-filled part: the rim facing the light (top-left) takes
// hi, the rim away from it lo (lo2 one pixel further in), the rest mid. keep: characters left
// as they are.
export function bevel(pic, { hi, mid, lo, lo2 = null, keep = null, rimHi = 1, rimLo = 1 }) {
  const inside = (x, y) => !!pic.get(x, y);
  const out = pic.clone();
  const steps = (x, y, dx, dy, max) => {
    for (let k = 1; k <= max; k++) if (!inside(x + dx * k, y + dy * k)) return k;
    return max + 1;
  };
  for (let y = 0; y < pic.h; y++) for (let x = 0; x < pic.w; x++) {
    const c = pic.get(x, y);
    if (!c || (keep && keep.has(c))) continue;
    const lit = Math.min(steps(x, y, -1, 0, 3), steps(x, y, 0, -1, 3), steps(x, y, -1, -1, 3));
    const dark = Math.min(steps(x, y, 1, 0, 3), steps(x, y, 0, 1, 3), steps(x, y, 1, 1, 3));
    let ch = mid;
    if (dark <= rimLo && (lit > rimHi || dark < lit)) ch = lo;
    else if (lit <= rimHi) ch = hi;
    else if (lo2 && dark <= rimLo + 1) ch = lo2;
    out.set(x, y, ch);
  }
  pic.c = out.c;
  return pic;
}

// Shade a filled part across each row: from its left edge, bands of the given widths (pixels)
// in the given colours; what is left over takes `rest`, and the last `right.length` pixels of
// the row take `right` (from the inside out). For robes and cloaks seen as cones.
export function bands(pic, { left = [], rest, right = [] }) {
  for (let y = 0; y < pic.h; y++) {
    let a = -1, b = -1;
    for (let x = 0; x < pic.w; x++) if (pic.get(x, y)) { if (a < 0) a = x; b = x; }
    if (a < 0) continue;
    for (let x = a; x <= b; x++) {
      if (!pic.get(x, y)) continue;
      const i = x - a, j = b - x;
      let c = rest;
      let acc = 0;
      for (const [w, col] of left) { if (i < acc + w) { c = col; break; } acc += w; }
      if (c === rest) {
        acc = 0;
        for (const [w, col] of right) { if (j < acc + w) { c = col; break; } acc += w; }
      }
      pic.set(x, y, c);
    }
  }
  return pic;
}

// Cloth folds fanning from an origin: each fold is a ray from `o` to a hem point; a pixel's
// angle between the rays decides its tone. Each fold gets a lit band on one side (`lit`, the
// share of the gap) and a shadow on the other (`dark`), so folds taper toward the origin.
// ramp: [lit2, lit, mid, dark, dark2]: lit2 nearest the ridge, dark2 in the deepest crease.
export function folds(pic, o, hems, ramp, { lit = 0.35, dark = 0.3 } = {}) {
  const ang = (x, y) => Math.atan2(y - o[1], x - o[0]);
  const rays = hems.map(([x, y]) => ang(x, y)).sort((a, b) => a - b);
  for (let y = 0; y < pic.h; y++) for (let x = 0; x < pic.w; x++) {
    if (!pic.get(x, y)) continue;
    const a = ang(x, y);
    let k = 0;
    while (k < rays.length && rays[k] < a) k++;
    if (k === 0 || k === rays.length) continue;
    const t = (a - rays[k - 1]) / (rays[k] - rays[k - 1]);
    const [lit2, lt, mid, dk, dark2] = ramp;
    let c = mid;
    if (t < lit * 0.4) c = lit2;
    else if (t < lit) c = lt;
    else if (t > 1 - dark * 0.45) c = dark2;
    else if (t > 1 - dark) c = dk;
    pic.set(x, y, c);
  }
  return pic;
}

// A rim of reflected (cool) light on the shadow side of a part: drawn pixels whose right or
// bottom neighbour is clear take map[char] (if there is one). For readability at night.
export function rimLight(pic, map, { sides = 'r', clearOf = null } = {}) {
  const clear = (x, y) => !(clearOf || pic).get(x, y);
  const out = pic.clone();
  for (let y = 0; y < pic.h; y++) for (let x = 0; x < pic.w; x++) {
    const c = pic.get(x, y);
    if (!c || map[c] === undefined) continue;
    if ((sides.includes('r') && clear(x + 1, y)) || (sides.includes('d') && clear(x, y + 1))) out.set(x, y, map[c]);
  }
  pic.c = out.c;
  return pic;
}

// Speckle cleanup: a pixel of one of `chars` sharing no edge with its own colour takes the colour
// most of its 4 neighbours have (among `chars`), when one has at least two.
export function despeckle(pic, chars) {
  const set = new Set(chars);
  const out = pic.clone();
  for (let y = 0; y < pic.h; y++) for (let x = 0; x < pic.w; x++) {
    const c = pic.get(x, y);
    if (!c || !set.has(c)) continue;
    const n = [pic.get(x + 1, y), pic.get(x - 1, y), pic.get(x, y + 1), pic.get(x, y - 1)];
    if (n.includes(c)) continue;
    const count = {};
    for (const o of n) if (o && set.has(o)) count[o] = (count[o] || 0) + 1;
    const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 2) out.set(x, y, best[0]);
  }
  pic.c = out.c;
  return pic;
}

// Shading across a stroke from a ramp listed light to dark.
export const across = (ramp, cuts = null) => (s) => {
  const n = ramp.length;
  const c = cuts || (n === 2 ? [0.15] : n === 3 ? [-0.45, 0.45] : [-0.6, -0.05, 0.5]);
  let i = 0;
  while (i < c.length && s > c[i]) i++;
  return ramp[Math.min(n - 1, i)];
};

// A thick stroke from a to b, radius r0 -> r1, shaded across: shade(s, t, x, y) gets s in
// -1..1 (-1 the edge facing the light at the top-left, +1 the far edge) and t along the stroke.
export function stroke(pic, x0, y0, x1, y1, r0, r1, shade) {
  const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1e-9, len = Math.sqrt(len2);
  let nx = -dy / len, ny = dx / len;
  if (len < 1e-6) { nx = -0.62; ny = -0.78; }
  const lit = nx * -0.62 + ny * -0.78 >= 0 ? 1 : -1;
  const RR = Math.max(r0, r1) + 1;
  for (let y = Math.floor(Math.min(y0, y1) - RR); y <= Math.ceil(Math.max(y0, y1) + RR); y++) {
    for (let x = Math.floor(Math.min(x0, x1) - RR); x <= Math.ceil(Math.max(x0, x1) + RR); x++) {
      let t = ((x - x0) * dx + (y - y0) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = x0 + dx * t, py = y0 + dy * t, r = r0 + (r1 - r0) * t;
      if ((x - px) ** 2 + (y - py) ** 2 > r * r + 0.3) continue;
      const s = (-lit * ((x - px) * nx + (y - py) * ny)) / Math.max(0.5, r);
      const c = shade(Math.max(-1, Math.min(1, s)), t, x, y);
      if (c) pic.set(x, y, c);
    }
  }
  return pic;
}

// A tapered ribbon through points [[x, y, r], ...], shaded across each segment.
export function ribbon(pic, pts, shade) {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0, r0] = pts[i - 1], [x1, y1, r1] = pts[i];
    stroke(pic, x0, y0, x1, y1, r0, r1, shade);
  }
  return pic;
}

// ---------------------------------------------------------- thin parts --

// A limb or pole as row spans (mostly vertical) or column spans (mostly horizontal): `w` pixels
// wide, coloured across from `ramp` (light to dark, index by position across), so the edges are
// clean single steps. Returns the centre points.
export function limb(pic, x0, y0, x1, y1, w, ramp) {
  const dx = x1 - x0, dy = y1 - y0;
  const pts = [];
  if (Math.abs(dy) >= Math.abs(dx)) {
    const s = dy >= 0 ? 1 : -1;
    for (let y = R(y0); y !== R(y1) + s; y += s) {
      const t = dy ? (y - y0) / dy : 0;
      const cx = x0 + dx * t;
      const a = R(cx - (w - 1) / 2);
      for (let i = 0; i < w; i++) pic.set(a + i, y, ramp[Math.min(ramp.length - 1, Math.round((i / Math.max(1, w - 1)) * (ramp.length - 1)))]);
      pts.push([cx, y]);
    }
  } else {
    const s = dx >= 0 ? 1 : -1;
    for (let x = R(x0); x !== R(x1) + s; x += s) {
      const t = dx ? (x - x0) / dx : 0;
      const cy = y0 + dy * t;
      const a = R(cy - (w - 1) / 2);
      for (let i = 0; i < w; i++) pic.set(x, a + i, ramp[Math.min(ramp.length - 1, Math.round((i / Math.max(1, w - 1)) * (ramp.length - 1)))]);
      pts.push([x, cy]);
    }
  }
  return pts;
}

// A blade from the hilt point h along `ang` (degrees: 0 right, 90 down), `len` long: two pixels
// wide, the edge facing the light in `edge`, the other side in `flat`, a `tip` pixel; the guard
// across its root (gold), the grip and pommel behind. No ink: the silhouette outline draws it.
export function blade(pic, h, ang, len, { edge = 'w', flat = 'G', tip = 'G', guard = ['Y', 'y', 'd'], grip = 'b', pommel = 'y', guardHalf = 2, gripLen = 2 } = {}) {
  const a = (ang * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
  const at = (k, s = 0) => [h[0] + dx * k - dy * s, h[1] + dy * k + dx * s];
  // Which neighbour is on the shadow side: below for a flat blade, right for an upright one.
  const off = Math.abs(dx) >= Math.abs(dy) ? [0, 1] : [1, 0];
  const b0 = at(1.5), b1 = at(len);
  const pts = [...linePts(R(b0[0]), R(b0[1]), R(b1[0]), R(b1[1]))];
  pts.forEach(([x, y], i) => {
    const last = i >= pts.length - 2;
    pic.set(x, y, last ? tip : edge);
    if (!last) pic.set(x + off[0], y + off[1], flat);
  });
  const g0 = at(-0.5), g1 = at(-gripLen);
  pic.line(R(g0[0]), R(g0[1]), R(g1[0]), R(g1[1]), grip);
  const pm = at(-gripLen - 1);
  pic.set(R(pm[0]), R(pm[1]), pommel);
  const c0 = at(0.6, -guardHalf), c1 = at(0.6, guardHalf);
  const gp = [...linePts(R(c0[0]), R(c0[1]), R(c1[0]), R(c1[1]))];
  gp.forEach(([x, y], i) => pic.set(x, y, i === 0 ? guard[0] : i === gp.length - 1 ? guard[2] : guard[1]));
  return pts;
}

// ------------------------------------------------------------------ legs --

// One leg's walk cycle, both legs from one hip column (the far leg runs phase i, the near leg
// i + 4). k: knee (dx, row), a: ankle (dx, row: the shin's last row), foot: how it meets the
// ground. Contacts at +5 / -5 (an 11 px stride); the planted ankle travels back +5 +3 0 -3 -5
// (2-3 px a frame); the passing foot lifts to a sole on row 35 (phase 6), 36 on either side.
export const GAIT = [
  { k: [3, 33], a: [5, 36], foot: 'heel' },
  { k: [3, 34], a: [3, 36], foot: 'flat' },
  { k: [1, 33], a: [0, 36], foot: 'flat' },
  { k: [-1, 33], a: [-3, 36], foot: 'toe' },
  { k: [-2, 33], a: [-5, 36], foot: 'tip' },
  { k: [0, 33], a: [-4, 34], foot: 'air' },
  { k: [3, 32], a: [0, 33], foot: 'air' },
  { k: [4, 32], a: [3, 34], foot: 'air' },
];
// Standing: feet apart, both flat.
export const STAND = {
  back: { k: [-2, 33], a: [-4, 36], foot: 'flat' },
  front: { k: [2, 33], a: [4, 36], foot: 'flat' },
};

// Feet by how they meet the ground, relative to the ankle (the shin's last row, its centre
// column): rows below the ankle row.
const FOOT = {
  flat: [[-1, 1, 'ABBBC'], [-1, 2, 'DDDDD']],
  heel: [[2, 0, '.CD'], [-1, 1, 'ABBC'], [-1, 2, 'DDD']],
  toe: [[-1, 1, '.ABC'], [0, 2, '.DDD']],
  tip: [[-1, 1, 'AB'], [0, 2, 'DDD']],
  air: [[-1, 1, 'ABBBC'], [-1, 2, 'DDDD']],
};

// Draws one leg from the hip (hx, hy) in pose g: the thigh `tw` wide, the shin `sw` wide, both
// as clean spans, the knee marked, the foot from FOOT. map(symbol, x, y) gives the colour for
// E (knee highlight), A (lit), B (mid), C (dark), D (sole).
export function leg(pic, hx, hy, g, map, { tw = 3, sw = 3 } = {}) {
  const [kx, ky] = [hx + g.k[0], g.k[1] + (hy - 30)];
  const [ax, ay] = [hx + g.a[0], g.a[1]];
  const sym = (w) => (w >= 4 ? ['A', 'B', 'B', 'C'] : w === 3 ? ['A', 'B', 'C'] : ['A', 'C']);
  const put = (x, y, s) => pic.set(x, y, map(s, x, y));
  const span = (cx, y, w) => {
    const a = R(cx - (w - 1) / 2), ss = sym(w);
    for (let i = 0; i < w; i++) put(a + i, y, ss[i]);
  };
  for (let y = hy; y <= ky; y++) span(hx + (kx - hx) * ((y - hy) / Math.max(1, ky - hy)), y, tw);
  for (let y = ky + 1; y <= ay; y++) span(kx + (ax - kx) * ((y - ky) / Math.max(1, ay - ky)), y, sw);
  const kxr = R(kx - (sw - 1) / 2);
  put(kxr, ky, 'E');
  for (const [dx, dy, row] of FOOT[g.foot]) {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') put(R(ax) + dx + i, ay + dy, row[i]);
  }
  return pic;
}

// ------------------------------------------------------------ finishing --

// The silhouette outline: every clear pixel touching (4-way) a drawn one becomes ink, or the
// colour edge[ch] gives for the drawn character it touches (null: no outline there).
export function outline(pic, ink = 'k', edge = {}) {
  const out = pic.clone();
  for (let y = 0; y < pic.h; y++) {
    for (let x = 0; x < pic.w; x++) {
      if (pic.get(x, y)) continue;
      let hit = null, any = false;
      for (const [ex, ey] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
        const c = pic.get(x + ex, y + ey);
        if (!c) continue;
        if (edge[c] === null) continue;
        any = true;
        if (edge[c] !== undefined) { hit = edge[c]; break; }
        hit = hit || ink;
      }
      if (any && hit) out.set(x, y, hit);
    }
  }
  return out;
}

// Remove pixels with no drawn neighbour at all (8-way): noise.
export function dropStrays(pic) {
  for (let y = 0; y < pic.h; y++) for (let x = 0; x < pic.w; x++) {
    if (!pic.get(x, y)) continue;
    let near = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if ((i || j) && pic.get(x + i, y + j)) near++;
    if (!near) pic.set(x, y, null);
  }
  return pic;
}

// Pack a Pic into the game's pixel buffer.
export function toBuf(pic, pal) {
  const b = makeBuf(pic.w, pic.h);
  for (let i = 0; i < pic.c.length; i++) {
    const ch = pic.c[i];
    if (!ch) continue;
    const v = pal.packed[ch];
    if (v === undefined) throw new Error(`no colour for "${ch}"`);
    b.d[i] = v;
  }
  return b;
}

export const cyc = (list, i) => list[((i % list.length) + list.length) % list.length];
