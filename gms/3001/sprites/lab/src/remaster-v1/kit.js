// Shared drawing kit for the remaster-v1 heroes. Every frame is drawn into a Pic: a 48x48 grid
// of palette characters (null: clear). Parts are drawn as their own Pics and laid over one
// another back to front, each casting a thin separation line onto what it covers; the finished
// frame gets a 1-px outline around its silhouette (ink, or a darker shade of the material it
// borders) and is packed into the pixel buffer the game's buildSprite takes.
//
// Coordinates are pixel centres: (x, y) is the pixel in column x, row y. The canvas is 48x48;
// the ground line (anchorY) is row 40, so the soles' outline sits on row 39 and the feet's
// own pixels end on row 38. Light comes from the top-left.
import { makeBuf, hexPack } from '../../../../../../public/js/engine/pixels.js';
import { PAL as MASTER } from '../../../../../../public/js/art/palette.js';

export const W = 48, H = 48, ANCHOR = 40, SOLE = 38;
export { MASTER };

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
    x = Math.round(x);
    y = Math.round(y);
    if (this.ok(x, y)) this.c[y * this.w + x] = ch;
  }
  // Paint only where something is already drawn (details on a shape).
  on(x, y, ch) {
    x = Math.round(x);
    y = Math.round(y);
    if (this.get(x, y)) this.c[y * this.w + x] = ch;
  }
  dot(x, y, ch) {
    this.set(x, y, ch);
  }
  rect(x, y, w, h, ch) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, ch);
  }
  hline(x0, x1, y, ch) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, ch);
  }
  vline(x, y0, y1, ch) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, ch);
  }
  // Bresenham line between integer points; fn(x, y, i, n) may pick the colour per pixel.
  line(x0, y0, x1, y1, ch, only = false) {
    for (const [x, y, i, n] of linePts(x0, y0, x1, y1)) {
      const c = typeof ch === 'function' ? ch(x, y, i, n) : ch;
      if (c) (only ? this.on(x, y, c) : this.set(x, y, c));
    }
  }
  // Polygon fill (pixel centres inside the outline).
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
  }
  // Filled ellipse; fn(x, y, nx, ny) gets the offset from the centre in radii.
  ellipse(cx, cy, rx, ry, ch, only = false) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const nx = (x - cx) / (rx + 0.5), ny = (y - cy) / (ry + 0.5);
        if (nx * nx + ny * ny > 1) continue;
        const c = typeof ch === 'function' ? ch(x, y, nx, ny) : ch;
        if (c) (only ? this.on(x, y, c) : this.set(x, y, c));
      }
    }
  }
  // Rows of characters stamped at (x, y); '.' and ' ' are clear. flip mirrors the patch.
  stamp(rows, x, y, { flip = false, only = false, map = null } = {}) {
    const w = Math.max(...rows.map((r) => r.length));
    rows.forEach((r, j) => {
      for (let i = 0; i < r.length; i++) {
        let ch = r[i];
        if (ch === '.' || ch === ' ') continue;
        if (map && map[ch] !== undefined) ch = map[ch];
        if (!ch) continue;
        const X = x + (flip ? w - 1 - i : i);
        (only ? this.on(X, y + j, ch) : this.set(X, y + j, ch));
      }
    });
  }
  // A thick stroke from a to b, radius r0 -> r1, shaded across its width: shade(s) gets
  // s in -1..1 (-1 the edge facing the light at the top-left, +1 the edge away from it) and t
  // along the stroke (0 at a).
  stroke(x0, y0, x1, y1, r0, r1, shade, only = false) {
    const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1e-9, len = Math.sqrt(len2);
    // The side facing the light: the normal with the larger component toward (-1, -1.25).
    let nx = -dy / len, ny = dx / len;
    if (len < 1e-6) { nx = -0.62; ny = -0.78; }
    const lit = nx * -0.62 + ny * -0.78 >= 0 ? 1 : -1;
    const R = Math.max(r0, r1) + 1;
    for (let y = Math.floor(Math.min(y0, y1) - R); y <= Math.ceil(Math.max(y0, y1) + R); y++) {
      for (let x = Math.floor(Math.min(x0, x1) - R); x <= Math.ceil(Math.max(x0, x1) + R); x++) {
        let t = ((x - x0) * dx + (y - y0) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const px = x0 + dx * t, py = y0 + dy * t, r = r0 + (r1 - r0) * t;
        const d2 = (x - px) ** 2 + (y - py) ** 2;
        if (d2 > r * r + 0.3) continue;
        const across = ((x - px) * nx + (y - py) * ny) / Math.max(0.5, r);
        const s = -lit * across; // -1: lit edge
        const c = shade(Math.max(-1, Math.min(1, s)), t, x, y);
        if (c) (only ? this.on(x, y, c) : this.set(x, y, c));
      }
    }
  }
  // Lay `top` over this Pic. Where `top` meets what is already drawn, a separation line is
  // drawn on the covered pixels: sep is a character, or a function (coveredChar, x, y) -> char.
  // sides limits it to some directions ('l', 'r', 'u', 'd' as seen from the top part).
  over(top, { sep = null, sides = 'lrud', mask = null } = {}) {
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
            if (mask && !mask(X, Y)) continue;
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
  // Swap characters through a map (e.g. to darken a far limb).
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
  bounds() {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.c[y * this.w + x]) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
  }
}

export function* linePts(x0, y0, x1, y1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
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

// Shading across a stroke from a ramp listed light to dark: the lit edge takes the first,
// the far edge the last, the middle the rest in turn.
export const across = (ramp, cuts = null) => (s) => {
  const n = ramp.length;
  const c = cuts || (n === 2 ? [0.15] : n === 3 ? [-0.45, 0.45] : [-0.6, -0.05, 0.5]);
  let i = 0;
  while (i < c.length && s > c[i]) i++;
  return ramp[Math.min(n - 1, i)];
};

// A darkening (or lightening) map along ramps listed light to dark.
export function stepMap(ramps, n = 1, floor = null) {
  const m = {};
  for (const r of ramps) r.forEach((c, i) => (m[c] = r[Math.max(0, Math.min(r.length - 1, i + n))] ?? floor));
  return m;
}

// The silhouette outline: every clear pixel touching (4-way) a drawn one becomes ink, or the
// colour `edge[ch]` gives for the drawn character it touches (the first that has one).
export function outline(pic, ink = 'k', edge = {}) {
  const out = pic.clone();
  for (let y = 0; y < pic.h; y++) {
    for (let x = 0; x < pic.w; x++) {
      if (pic.get(x, y)) continue;
      let hit = null;
      for (const [ex, ey] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
        const c = pic.get(x + ex, y + ey);
        if (!c) continue;
        if (edge[c] !== undefined) { hit = edge[c]; break; }
        hit = hit || ink;
      }
      if (hit) out.set(x, y, hit);
    }
  }
  return out;
}

// Directional form shading for a flat-filled part (every drawn pixel of `pic` is the shape):
// the rim facing the light (top-left) takes hi, the rim away from it lo (and lo2 one pixel
// further in, if given), the rest mid. spec: optional pixel lit hottest, the most top-left.
// Pixels already in `keep` (a Set of characters) are left as they are (details).
export function bevel(pic, { hi, mid, lo, lo2 = null, top = true, keep = null, rimHi = 1, rimLo = 1 }) {
  const inside = (x, y) => !!pic.get(x, y);
  const out = pic.clone();
  const steps = (x, y, dx, dy, max) => {
    for (let k = 1; k <= max; k++) if (!inside(x + dx * k, y + dy * k)) return k;
    return max + 1;
  };
  for (let y = 0; y < pic.h; y++) {
    for (let x = 0; x < pic.w; x++) {
      const c = pic.get(x, y);
      if (!c || (keep && keep.has(c))) continue;
      const lit = Math.min(steps(x, y, -1, 0, 3), top ? steps(x, y, 0, -1, 3) : 9, steps(x, y, -1, -1, 3));
      const dark = Math.min(steps(x, y, 1, 0, 3), steps(x, y, 0, 1, 3), steps(x, y, 1, 1, 3));
      let ch = mid;
      if (dark <= rimLo && (lit > rimHi || dark < lit)) ch = lo;
      else if (lit <= rimHi) ch = hi;
      else if (lo2 && dark <= rimLo + 1) ch = lo2 === true ? lo : lo2;
      out.set(x, y, ch);
    }
  }
  pic.c = out.c;
  return pic;
}

// A soft tapered ribbon through points [[x, y, r], ...]: strokes between them, shaded across.
export function ribbon(pic, pts, shade) {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0, r0] = pts[i - 1], [x1, y1, r1] = pts[i];
    pic.stroke(x0, y0, x1, y1, r0, r1, shade);
  }
  return pic;
}

// A layer with its own 1-px ink edge (4-way), for parts that must stand off what is behind
// them: the edge pixels are part of the layer, so they overwrite whatever they cover.
// skip(x, y): edge pixels to leave out. Nothing is inked below the sole row (38): the
// silhouette outline puts the one ink row under the feet.
// sides: which edges get ink, as seen from the part ('l', 'r', 'u', 'd').
export function inked(pic, ink = 'k', skip = null, sides = 'lrud') {
  const out = pic.clone();
  const L = sides.includes('l'), Rr = sides.includes('r'), U = sides.includes('u'), D = sides.includes('d');
  for (let y = 0; y < pic.h; y++) for (let x = 0; x < pic.w; x++) {
    if (pic.get(x, y)) continue;
    if (y > SOLE || (skip && skip(x, y))) continue;
    // A clear pixel to the part's right lies on its right edge, and so on.
    if ((Rr && pic.get(x - 1, y)) || (L && pic.get(x + 1, y)) || (D && pic.get(x, y - 1)) || (U && pic.get(x, y + 1))) out.set(x, y, ink);
  }
  return out;
}

// Points along a straight line from a toward b at distance k (a, b: [x, y]).
export const along = (a, b, k) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  return [a[0] + (dx / l) * k, a[1] + (dy / l) * k];
};

// Speckle cleanup: a pixel of one of `chars` that shares no edge with its own colour takes the
// colour most of its 4 neighbours have (among `chars`), when one has at least two.
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

// Shade a filled part (every drawn pixel of pic) across each row: the left 'lit' share of its
// width takes hi, the right 'dark' share lo, the rest mid; a 1-px rim of hi2 on the far left.
export function sideShade(pic, { hi, mid, lo, hi2 = null, lit = 0.3, dark = 0.28 }) {
  for (let y = 0; y < pic.h; y++) {
    let a = -1, b = -1;
    for (let x = 0; x < pic.w; x++) if (pic.get(x, y)) { if (a < 0) a = x; b = x; }
    if (a < 0) continue;
    const w = b - a + 1;
    for (let x = a; x <= b; x++) {
      if (!pic.get(x, y)) continue;
      const t = (x - a + 0.5) / w;
      pic.set(x, y, hi2 && x === a ? hi2 : t < lit ? hi : t > 1 - dark ? lo : mid);
    }
  }
  return pic;
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

// ------------------------------------------------------------------ legs --
// One leg, side on, facing right, rows 30..38 (the sole on 38), the hip at column 5. Shade
// symbols: E highlight (knee), A lit, B mid, C dark, D sole. A walk is the same leg in eight
// phases: 0 heel strike in front, 1 weight taken (body down), 2 passing under the hip, 3 push,
// 4 toe-off behind, 5 lifting (body down), 6 swinging through, 7 reaching forward. The far
// leg runs phases i, the near leg i + 4.
export const LEG = {
  walk: [
    ['.....ABC....', '.....ABC....', '......ABC...', '......EBC...', '.......ABC..', '.......ABC..', '........ABCD', '........ABBC', '........DDD.'],
    ['............', '.....ABC....', '.....ABC....', '......EBC...', '......ABC...', '......ABC...', '......ABBC..', '......ABBBC.', '......DDDDD.'],
    ['....ABC.....', '....ABC.....', '....ABC.....', '....EBC.....', '....ABC.....', '....ABC.....', '....ABBC....', '....ABBBC...', '....DDDDD...'],
    ['....ABC.....', '....ABC.....', '...ABC......', '...EBC......', '..ABC.......', '..ABC.......', '.ABBC.......', '..ABBC......', '...DDD......'],
    ['....ABC.....', '...ABC......', '...ABC......', '..EBC.......', '..ABC.......', '.ABC........', '.ABC........', 'ABBC........', '.DDD........'],
    ['............', '....ABC.....', '....ABC.....', '...EBC......', '..ABC.......', '.ABC........', '.ABBC.......', '..DDD.......', '............'],
    ['....ABC.....', '....ABBC....', '.....ABC....', '.....EBC....', '.....ABC....', '....ABC.....', '....ABBC....', '....DDDD....', '............'],
    ['.....ABC....', '.....ABBC...', '......ABC...', '.......EBC..', '.......ABC..', '.......ABC..', '.......ABBC.', '.......DDDD.', '............'],
  ],
  // Standing: one foot set back, one forward.
  back: ['....ABC.....', '....ABC.....', '...ABC......', '...EBC......', '...ABC......', '..ABC.......', '..ABBC......', '..ABBBC.....', '..DDDDD.....'],
  front: ['.....ABC....', '.....ABC....', '......ABC...', '......EBC...', '......ABC...', '.......ABC..', '.......ABBC.', '.......ABBBC', '.......DDDDD'],
  // A lunge's leading leg, knee over the foot.
  lunge: ['.....ABC....', '......ABC...', '.......ABC..', '........EBC.', '........ABC.', '........ABC.', '........ABBC', '........ABBC', '........DDDD'],
};

// A leg pose drawn into a new Pic with the hip at x = hx: map(symbol, row) gives the colour.
export function legPic(rows, hx, map, dy = 0) {
  const p = new Pic();
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) {
      const s = r[i];
      if (s === '.') continue;
      const y = 30 + j + dy;
      if (y > 38) continue;
      p.set(hx - 5 + i, y, map(s, y));
    }
  });
  return p;
}

// Per-frame tables.
export const cyc = (list, i) => list[((i % list.length) + list.length) % list.length];
export const lerp = (a, b, t) => a + (b - a) * t;
export const R = Math.round;
