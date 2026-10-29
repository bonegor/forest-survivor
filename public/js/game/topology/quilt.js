// The Bloomvale's ground (game/topology, 29 October 2026): the fae's flower farm. The owner's words
// on 28 October 2026: "another would be sort of like a bright flower, colorful map", and of the
// meadow "have some good game design idea how to make meadow not be identical to forest." So, from
// the round-3 build spec of 29 October 2026 (the Fae Fields and the Thread): an endless patchwork of
// fields, each one colour of flowers in rows (cornflower, coral, lavender, daisies, pinks and
// striped tulip beds), with grassy farm lanes between, blossom-tree avenues along some of them,
// orchards and hay fields here and there. Nothing here holds, slows or hurts anyone: the crops, the
// lanes and the headlands are all paint (the owner's rule: monsters bump into nothing), so every
// world query reads open ground. What this class gives is the paint's fields (`edge`, `bloom`, which
// field a point is in) and what stands: the places, the landmarks in the hay fields, and every tree
// (avenues, orchards, a lone blossom tree in half the crop fields), laid as the topology's own props.
//
// In prose a field is one patch of one crop; in the code it is a "plot", so it never clashes with the
// terrain's fields or Forest.fieldAt.
//   East-west lane k: wavy and endless, y = (k - 1/2)·band + J + A·sin(TAU·x/Λ + φ). Band k is the
//   ground between lane k and lane k + 1.
//   North-south lane (k, m): straight, a little slanted, only within band k; it meets the east-west
//   lanes as a T. One in about seven is dropped (never two side by side), which makes a double field.
//   Plot (k, m): the ground of band k between lane m and the next lane not dropped, named by its left.
// Everything is a pure function of world position and the map's seed on the topology's own dice
// (shapes.js dice), so neighbouring chunks agree, any order gives the same chunk, and it never ends.
// The same `core` measures a point for the lattice (terrain) and for the analytic twins (edgeAt,
// bloomAt, plotAt), so the two are equal at every lattice point. Pure: no canvas, no sprites.

import { valueNoise, hash2, TAU } from '../../engine/util.js';
import { SURFACE, TN, TSTEP, TMAX, TCHUNK } from './terrain.js';
import { dice, clampT, ss } from './shapes.js';
import { shrineOrder, adder, walkPath, shrinePlace, startCamp, dress } from './places.js';

const KEEP = 6000; // trim(): lanes, plots and places farther than this are forgotten (made again the same)
const key2 = (a, b) => a * 65536 + b; // a number key for (band, lane), |b| < 32768
const mod = (a, n) => ((a % n) + n) % n;
const OAKS = ['oak1', 'oak2', 'oak3']; // the trees' slots (the look makes them blossom trees, trunk 3.5)
const EW_BIN = 768; // an east-west avenue's trees are worked out (and cached) this many px of x at a time

// An east-west lane's middle at x, its slope there, and a north-south lane's middle at y.
export const laneY = (l, x) => l.base + l.A * Math.sin((TAU * x) / l.L + l.phi);
const laneSlope = (l, x) => ((l.A * TAU) / l.L) * Math.cos((TAU * x) / l.L + l.phi);
export const laneX = (l, y) => l.X0 + l.s * (y - l.yc);

// A cut (a place's plaza, walk or door apron, where no flower grows and paintChunk's own ground stays).
// A door's apron is no path of paintChunk's: the painter lays it as headland (or straw in the start's disc).
const disc = (x, y, r) => ({ x, y, r, xs: null, apron: false, minx: x - r, maxx: x + r, miny: y - r, maxy: y + r });
const apron = (x, y, r) => ({ ...disc(x, y, r), apron: true });
function walkCut(xs, ys, hw) {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (let k = 0; k < xs.length; k++) {
    minx = Math.min(minx, xs[k] - hw);
    maxx = Math.max(maxx, xs[k] + hw);
    miny = Math.min(miny, ys[k] - hw);
    maxy = Math.max(maxy, ys[k] + hw);
  }
  return { x: (minx + maxx) / 2, y: (miny + maxy) / 2, r: hw, xs, ys, minx, maxx, miny, maxy };
}
// Px from a cut's edge to (x, y), - inside it.
export function cutDist(c, x, y) {
  if (!c.xs) return Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2) - c.r;
  const { xs, ys } = c;
  let best = Infinity;
  for (let k = 0; k + 1 < xs.length; k++) {
    const ax = xs[k], ay = ys[k], dx = xs[k + 1] - ax, dy = ys[k + 1] - ay, l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = ax + dx * t - x, ey = ay + dy * t - y, d = ex * ex + ey * ey;
    if (d < best) best = d;
  }
  return Math.sqrt(best) - c.r;
}
const cutMeets = (c, x0, y0, x1, y1, m) => c.minx - m <= x1 && c.maxx + m >= x0 && c.miny - m <= y1 && c.maxy + m >= y0;

export class Quilt {
  constructor(T, mapSeed) {
    this.T = T;
    this.kind = 'quilt';
    this.axis = null;
    this.still = true; // nothing here slows anyone (Forest.slows returns at once)
    this.patchKind = 0;
    this.blocked = SURFACE.WALL;
    this.cryptRange = { near: 2400, far: 2800 };
    const { H, rngOf, s } = dice(mapSeed);
    this.H = H;
    this.rngOf = rngOf;
    this.s = s;
    this.order = shrineOrder(rngOf);
    this.ews = new Map();
    this.nss = new Map();
    this.plotMap = new Map();
    this.orders = new Map();
    this.placeMap = new Map();
    this.lmMap = new Map();
    this.avMap = new Map();
    this.out = { k: 0, L: null, R: null, dT: 0, dB: 0, dL: 0, dR: 0, edge: 0, bloom: 0, plot: null };
    // The start's field and its four neighbours are crops, whatever their dice say: the start plot
    // (0, 0) and (0, ±1) beside it, and the plots over (0, -300) and under (0, 500), whose bands'
    // orders are turned so that the one over is tulips and the one under lavender.
    const up = this.locate(0, -300, {}), down = this.locate(0, 500, {});
    this.turn = new Map([[up.k, [up.L.m, 'tulips']], [down.k, [down.L.m, 'lavender']]]);
    this.startKeys = new Set([key2(0, 0), key2(0, -1), key2(0, 1), key2(up.k, up.L.m), key2(down.k, down.L.m)]);
  }

  // ---- Lanes ----------------------------------------------------------------------------------------
  // East-west lane k. Lanes 0 and 1 hold the start's field (y -110 and 290 at x 0) and have no avenue
  // within 500 px of it.
  ew(k) {
    let l = this.ews.get(k);
    if (l) return l;
    const T = this.T, H = this.H, hw = T.lane.hw;
    let J = (H(k, 0, 1) - 0.5) * 2 * T.bandJit, A = T.wave[0] + (T.wave[1] - T.wave[0]) * H(k, 0, 2);
    const L = T.waveLen[0] + (T.waveLen[1] - T.waveLen[0]) * H(k, 0, 3);
    let phi = TAU * H(k, 0, 4), w = hw[0] + (hw[1] - hw[0]) * H(k, 0, 5);
    if (k === 0 || k === 1) {
      phi = 0;
      A = 16;
      J = k ? 70 : 110;
      w = 8;
    }
    l = { k, base: (k - 0.5) * T.band + J, A, L, phi, hw: w, calm: k === 0 || k === 1 };
    this.ews.set(k, l);
    return l;
  }
  // How strongly an east-west lane is an avenue at x (0..1), and so the bloom's inset beside it: 6 px of
  // headland, up to 22 where blossom trees stand on it.
  avenueAt(l, x) {
    const v = valueNoise(x / 900, l.k * 7.31, this.s + 61);
    return l.calm ? v * ss(480, 560, Math.abs(x)) : v;
  }
  inset(l, x) {
    const L = this.T.lane, a = L.avenueEw;
    return L.headland + (L.avenue - L.headland) * ss(a[0], a[1], this.avenueAt(l, x));
  }
  off(k) {
    return k === 0 ? -0.4375 : this.H(k, 1, 6);
  }
  // North-south lane (k, m): dropped where its dice fall under `drop` and its western neighbour's do not
  // (so never two side by side); an avenue at one in four. The start's: (0, 0) at x -210, (0, 1) an
  // avenue at x 210, and (0, -1) to (0, 2) never dropped.
  ns(k, m) {
    const key = key2(k, m);
    let l = this.nss.get(key);
    if (l) return l;
    const T = this.T, H = this.H, hw = T.lane.hw;
    let j = (H(k, m, 7) - 0.5) * 2 * T.colJit, s = (H(k, m, 9) - 0.5) * 2 * T.slant, w = hw[0] + (hw[1] - hw[0]) * H(k, m, 15);
    let avenue = H(k, m, 8) < T.lane.avenueNs;
    if (k === 0 && (m === 0 || m === 1)) {
      j = m ? -60 : 0;
      s = 0;
      w = 8;
      avenue = m === 1;
    }
    const cand = (q) => H(k, q, 10) < T.drop;
    const dropped = k === 0 && m >= -1 && m <= 2 ? false : cand(m) && !cand(m - 1);
    l = { k, m, X0: (m + this.off(k)) * T.col + j, s, yc: k * T.band, hw: w, nrm: Math.sqrt(1 + s * s), avenue, dropped, ins: avenue ? T.lane.avenue : T.lane.headland, trees: null };
    this.nss.set(key, l);
    return l;
  }
  // The next lane east of l in its band that is not dropped.
  rightOf(l) {
    const a = this.ns(l.k, l.m + 1);
    return a.dropped ? this.ns(l.k, l.m + 2) : a;
  }
  // The band holding (x, y): Y_k(x) <= y < Y_k+1(x).
  bandOf(x, y) {
    const k0 = Math.round(y / this.T.band);
    for (let k = k0 - 2; k <= k0 + 2; k++) if (laneY(this.ew(k), x) <= y && y < laneY(this.ew(k + 1), x)) return k;
    return k0;
  }
  // The band and the lanes either side of (x, y), into o ({ k, L, R }).
  locate(x, y, o) {
    const k = this.bandOf(x, y), m0 = Math.floor(x / this.T.col - this.off(k));
    o.k = k;
    o.L = null;
    for (let m = m0 + 2; m >= m0 - 3; m--) {
      const l = this.ns(k, m);
      if (l.dropped) continue;
      if (laneX(l, y) <= x) {
        o.L = l;
        break;
      }
    }
    if (!o.L) o.L = this.ns(k, m0 - 3).dropped ? this.ns(k, m0 - 4) : this.ns(k, m0 - 3);
    o.R = this.rightOf(o.L);
    return o;
  }
  // Where east-west lane e and north-south lane n cross (their middles), by a fixed point.
  cross(e, n) {
    let y = e.base, x = laneX(n, y);
    for (let q = 0; q < 3; q++) {
      y = laneY(e, x);
      x = laneX(n, y);
    }
    return [x, y];
  }

  // ---- Plots ----------------------------------------------------------------------------------------
  // Plot (k, m)'s corners (lanes' middles), its middle (the mean of its corners) and its size.
  frame(k, m) {
    const L = this.ns(k, m), R = this.rightOf(L), top = this.ew(k), bot = this.ew(k + 1);
    const a = this.cross(top, L), b = this.cross(top, R), c = this.cross(bot, L), d = this.cross(bot, R);
    return {
      L, R, top, bot,
      x: (a[0] + b[0] + c[0] + d[0]) / 4, y: (a[1] + b[1] + c[1] + d[1]) / 4,
      w: (b[0] - a[0] + d[0] - c[0]) / 2, h: (c[1] - a[1] + d[1] - b[1]) / 2,
      minx: Math.min(a[0], c[0]), maxx: Math.max(b[0], d[0]), miny: Math.min(a[1], b[1]) - top.A, maxy: Math.max(c[1], d[1]) + bot.A,
    };
  }
  // Band k's crops in their order along it: `crops` shuffled by its dice (band 0's as given), so
  // neighbours east and west always differ (a double field's too: m and m + 2).
  orderOf(k) {
    let o = this.orders.get(k);
    if (o) return o;
    const crops = this.T.crops;
    if (k === 0) o = [...crops];
    else {
      const r = this.rngOf(k, 0, 16), sh = [...crops];
      for (let q = sh.length - 1; q > 0; q--) {
        const z = Math.floor(r() * (q + 1));
        [sh[q], sh[z]] = [sh[z], sh[q]];
      }
      const t = this.turn.get(k);
      if (t) {
        const at = mod(t[0], sh.length), want = sh.indexOf(t[1]);
        o = sh.map((_, q) => sh[mod(q - at + want, sh.length)]);
      } else o = sh;
    }
    this.orders.set(k, o);
    return o;
  }
  // Plot (k, m): its kind (a crop, an orchard or hay), its crop, which way its rows run (east-west when
  // k + m is even), the first of its tulip beds, its lanes, and the landmark it holds (hay) if any.
  plot(k, m) {
    const key = key2(k, m);
    let p = this.plotMap.get(key);
    if (p) return p;
    const T = this.T, H = this.H, f = this.frame(k, m);
    let lm = null, kind;
    if (this.startKeys.has(key)) kind = 'crop';
    else if ((lm = this.landmarkIn(key, f.x, f.y))) kind = 'hay';
    else {
      const h = H(k, m, 13);
      kind = h < T.kinds.crop ? 'crop' : h < T.kinds.crop + T.kinds.orchard ? 'orchard' : 'hay';
    }
    p = {
      key, k, m, m2: f.R.m, kind, crop: kind === 'crop' ? this.orderOf(k)[mod(m, T.crops.length)] : null,
      axis: (k + m) & 1, bedStart: Math.floor(T.tulips.length * H(k, m, 19)),
      top: f.top, left: f.L, right: f.R, bottom: f.bot,
      x: f.x, y: f.y, w: f.w, h: f.h, minx: f.minx, maxx: f.maxx, miny: f.miny, maxy: f.maxy, lm, props: null,
    };
    this.plotMap.set(key, p);
    return p;
  }
  // The landmark whose node names plot `key` (its middle at x, y), or null.
  landmarkIn(key, x, y) {
    const S = this.T.spacing, i0 = Math.round(x / S), j0 = Math.round(y / S);
    for (let j = j0 - 1; j <= j0 + 1; j++) {
      for (let i = i0 - 1; i <= i0 + 1; i++) {
        if (!((i + j) & 1)) continue;
        const L = this.landmark(i, j);
        if (L && L.plotKey === key) return L;
      }
    }
    return null;
  }

  // ---- Measuring a point -----------------------------------------------------------------------------
  // The one measure behind the lattice and the analytic twins: band k, its east-west lanes' middles at
  // x (yT, yB), their slopes' norms (nT, nB) and the bloom's insets beside them (iT, iB), the lanes
  // either side (L, R) and the cuts near. Into this.out: the four sides' px from the lanes' edges, the
  // least of them (`edge`: + in a field, - in a lane), the plot, and `bloom` (px into a crop's flowers:
  // past the headland and clear of every cut by `cut.pad`; -TMAX off a crop).
  core(x, y, k, yT, nT, iT, yB, nB, iB, L, R, cuts) {
    const o = this.out, top = this.ew(k), bot = this.ew(k + 1);
    const dT = (y - yT) / nT - top.hw, dB = (yB - y) / nB - bot.hw;
    const dL = (x - laneX(L, y)) / L.nrm - L.hw, dR = (laneX(R, y) - x) / R.nrm - R.hw;
    const e = Math.min(dT, dB, dL, dR), p = this.plot(k, L.m);
    let b = -TMAX;
    if (p.kind === 'crop') {
      b = Math.min(dT - iT, dB - iB, dL - L.ins, dR - R.ins);
      const pad = this.T.cut.pad;
      for (let q = 0; q < cuts.length; q++) {
        const c = cutDist(cuts[q], x, y) - pad;
        if (c < b) b = c;
      }
    }
    o.k = k;
    o.L = L;
    o.R = R;
    o.dT = dT;
    o.dB = dB;
    o.dL = dL;
    o.dR = dR;
    o.edge = clampT(e);
    o.bloom = clampT(b);
    o.plot = p;
    return o;
  }
  // The analytic measure at (x, y) (this.out, overwritten by the next call).
  measure(x, y) {
    const o = this.locate(x, y, this.out), k = o.k, L = o.L, R = o.R, top = this.ew(k), bot = this.ew(k + 1);
    const sT = laneSlope(top, x), sB = laneSlope(bot, x);
    const m = TMAX + this.T.cut.pad + 2;
    return this.core(x, y, k, laneY(top, x), Math.sqrt(1 + sT * sT), this.inset(top, x), laneY(bot, x), Math.sqrt(1 + sB * sB), this.inset(bot, x), L, R, this.cutsIn(x, y, x, y, m));
  }
  edgeAt(x, y) {
    return this.measure(x, y).edge;
  }
  bloomAt(x, y) {
    return this.measure(x, y).bloom;
  }
  plotAt(x, y) {
    return this.measure(x, y).plot;
  }
  // Px from the nearest cut's edge (- inside one), TMAX + 1 past them all.
  cutAt(x, y) {
    let b = TMAX + 1;
    for (const c of this.cutsIn(x, y, x, y, TMAX)) b = Math.min(b, cutDist(c, x, y));
    return b;
  }
  // Plot p's sown edge (where its flowers meet its headland) inside box ([x0, y0, x1, y1] or
  // { x0, y0, x1, y1 }), a point every 8 px: fn(x, y, tx, ty), (tx, ty) the edge's direction there. For
  // the Fae Court's tell (game/fae.js), which shows the thread where the field ends.
  bloomRim(p, box, fn) {
    const [x0, y0, x1, y1] = Array.isArray(box) ? box : [box.x0, box.y0, box.x1, box.y1];
    if (p.kind !== 'crop' || p.maxx < x0 || p.minx > x1 || p.maxy < y0 || p.miny > y1) return;
    const on = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1 && Math.abs(this.bloomAt(x, y)) < 1.5 && this.out.plot === p;
    for (const [l, sgn] of [[p.top, 1], [p.bottom, -1]]) {
      for (let x = Math.ceil(Math.max(x0, p.minx) / 8) * 8; x <= Math.min(x1, p.maxx); x += 8) {
        const s = laneSlope(l, x), n = Math.sqrt(1 + s * s), y = laneY(l, x) + sgn * (l.hw + this.inset(l, x)) * n;
        if (on(x, y)) fn(x, y, 1 / n, s / n);
      }
    }
    for (const [l, sgn] of [[p.left, 1], [p.right, -1]]) {
      for (let y = Math.ceil(Math.max(y0, p.miny) / 8) * 8; y <= Math.min(y1, p.maxy); y += 8) {
        const x = laneX(l, y) + sgn * (l.hw + l.ins) * l.nrm;
        if (on(x, y)) fn(x, y, l.s / l.nrm, 1 / l.nrm);
      }
    }
  }

  // ---- Places ---------------------------------------------------------------------------------------
  // Node (i, j) of the places' lattice: the Darkwood's rhythm, `spacing` apart, strayed (not the origin).
  node(i, j) {
    if (!i && !j) return [0, 0];
    const S = this.T.spacing, J = this.T.stray * S;
    return [i * S + (this.H(i, j, 1) - 0.5) * 2 * J, j * S + (this.H(i, j, 2) - 0.5) * 2 * J];
  }
  isCrypt(i, j) {
    return ((i | j) & 1) === 0 && !!(i || j);
  }
  // The south T nearest node (i, j): the top end of a lane (k, m) not dropped, where it meets lane k.
  junction(i, j) {
    const [nx, ny] = this.node(i, j), T = this.T, k0 = Math.round(ny / T.band + 0.5);
    let best = null, bd = Infinity;
    for (let k = k0 - 1; k <= k0 + 1; k++) {
      const m0 = Math.round(nx / T.col - this.off(k)), e = this.ew(k);
      for (let m = m0 - 1; m <= m0 + 1; m++) {
        const n = this.ns(k, m);
        if (n.dropped) continue;
        let y = (k - 0.5) * T.band, x = laneX(n, y);
        for (let q = 0; q < 3; q++) {
          y = laneY(e, x);
          x = laneX(n, y);
        }
        const d = (x - nx) ** 2 + (y - ny) ** 2;
        if (d < bd) {
          bd = d;
          best = { x, y, k, m };
        }
      }
    }
    return best;
  }
  // What stands at node (i, j) with i + j even: the start, or a shrine at its junction (with a crypt
  // beside it at a crypt's node), each with its cuts.
  place(i, j) {
    if ((i + j) & 1) return null;
    const key = key2(i, j);
    let P = this.placeMap.get(key);
    if (P) return P;
    const C = this.T.cut;
    if (!i && !j) {
      // The start: the camp in a pressed straw disc in the cornflower field, no plaza (the disc is its
      // floor), a crypt a step north-west, its apron cut, and a ring of moonblooms round the disc.
      const S = this.T.start;
      P = startCamp(0, 0, { fire: [36, 42], lamp: [44, -34], stone: [-46, 34] });
      P.path = null;
      P.clear.r = S.disc;
      P.crypt = { key: '0,0', x: -37, y: -52, depth: 1, face: 'field' };
      P.cuts = [apron(-37, -48, C.apron)];
      const camp = [...P.props], add = adder(P), a0 = (this.H(0, 0, 40) * TAU) / S.blooms;
      for (let q = 0, lit = 0; q < S.blooms; q++) {
        const a = a0 + (q * TAU) / S.blooms, x = Math.round(Math.cos(a) * S.bloomR), y = Math.round(Math.sin(a) * S.bloomR);
        if (Math.hypot(x - P.crypt.x, y - P.crypt.y) < 34 || camp.some((p) => Math.hypot(x - p.x, y - p.y) < 20)) continue;
        add(this.H(q, 0, 41) < 0.3 ? 'moonbloom2' : 'moonbloom1', x, y, lit++ % 3 === 0 ? { light: ['pink', 18] } : undefined);
      }
    } else {
      const J = this.junction(i, j);
      P = shrinePlace(`${i},${j}`, i, j, J.x, J.y, this.order[mod(i + 3 * j, 5)]);
      P.junction = J;
      P.cuts = [disc(J.x, J.y, C.plaza)];
      if (this.isCrypt(i, j)) {
        // The crypt in the field's corner without a lane, 62 px north, facing south onto the lane, a walk
        // down to the plaza.
        const a = -Math.PI / 2 + (this.H(i, j, 30) - 0.5) * 0.5, dx = Math.round(J.x + Math.cos(a) * 78), dy = Math.round(J.y + Math.sin(a) * 78 * 0.8);
        P.crypt = { key: `${i},${j}`, x: dx, y: dy, depth: Math.max(Math.abs(i), Math.abs(j)) / 2, face: 'field' };
        P.path = walkPath(J.x, J.y, C.plaza, J.x, J.y, dx, dy + 14, Math.floor(this.H(i, j, 35) * 1e6), 0);
        P.cuts.push(walkCut(Array.from(P.path.xs).slice(1), Array.from(P.path.ys).slice(1), C.walk), apron(dx, dy + 4, C.apron));
      }
    }
    this.placeMap.set(key, P);
    return P;
  }
  // A landmark at node (i, j) with i + j odd (`landmark` of them): its node names a plot, which becomes
  // hay, and it stands in that plot's middle, its clearing the field (no footpath). None if that plot
  // is the start's or a neighbour of it, or if its clearing would meet a place's cut.
  landmark(i, j) {
    const key = key2(i, j);
    if (this.lmMap.has(key)) return this.lmMap.get(key);
    let L = null;
    const T = this.T;
    if ((i + j) & 1 && this.H(i, j, 6) < T.landmark) {
      const [nx, ny] = this.node(i, j), at = this.locate(nx, ny, {}), pk = key2(at.k, at.L.m);
      if (!this.startKeys.has(pk)) {
        const f = this.frame(at.k, at.L.m), kind = T.landmarks[Math.floor(T.landmarks.length * this.H(i, j, 9))], r = kind === 'woodcamp' ? 100 : 128;
        if (!this.cutsIn(f.x - r, f.y - r, f.x + r, f.y + r, 0).some((c) => cutDist(c, f.x, f.y) < r)) {
          L = { x: f.x, y: f.y, i, j, kind, props: [], clear: { x: f.x, y: f.y, r }, plotKey: pk };
          dress(L, this.rngOf(i, j, 10), f.x - 200);
        }
      }
    }
    this.lmMap.set(key, L);
    return L;
  }
  // fn(i, j) for every node within the box, m px round.
  nodes(x0, y0, x1, y1, m, fn) {
    const S = this.T.spacing;
    for (let j = Math.floor((y0 - m) / S); j <= Math.ceil((y1 + m) / S); j++) for (let i = Math.floor((x0 - m) / S); i <= Math.ceil((x1 + m) / S); i++) fn(i, j);
  }
  // The cuts whose box, m px round, meets the box.
  cutsIn(x0, y0, x1, y1, m) {
    const out = [];
    this.nodes(x0, y0, x1, y1, 900 + m, (i, j) => {
      const P = this.place(i, j);
      if (P) for (const c of P.cuts) if (cutMeets(c, x0, y0, x1, y1, m)) out.push(c);
    });
    return out;
  }
  start() {
    return this.place(0, 0).hero;
  }

  // ---- What stands ------------------------------------------------------------------------------------
  // The plots of band k whose lanes come near x0..x1.
  bandPlots(k, x0, x1, fn) {
    const T = this.T, o = this.off(k);
    for (let m = Math.floor(x0 / T.col - o) - 3; m <= Math.ceil(x1 / T.col - o) + 1; m++) {
      if (this.ns(k, m).dropped) continue;
      fn(this.plot(k, m));
    }
  }
  // A plot's own props (cached): its lone blossom tree (a crop), its trees in rows (an orchard), its
  // bales and scarecrow (hay without a landmark).
  plotProps(p) {
    if (p.props) return p.props;
    const T = this.T, H = this.H, out = [], { k, m } = p;
    const tree = (x, y) => OAKS[Math.floor(hash2(Math.round(x), Math.round(y), 77) * 3)];
    if (p.kind === 'crop') {
      let x = null, y = null;
      if (p.key === key2(0, 0)) [x, y] = T.start.lone;
      else if (H(k, m, 14) < T.lone) {
        const tx = p.x + (H(k, m, 25) - 0.5) * 0.4 * p.w, ty = p.y + (H(k, m, 26) - 0.5) * 0.4 * p.h;
        if (this.bloomAt(tx, ty) >= 40 && this.cutAt(tx, ty) >= 70) [x, y] = [tx, ty];
      }
      if (x !== null) out.push({ kind: 'lone', n: tree(x, y), x: Math.round(x), y: Math.round(y) });
    } else if (p.kind === 'orchard') {
      // Beside an avenue its rows keep `lane.avenue` px farther in (29 October 2026): the avenue's own
      // trees stand on that headland, and an orchard's outer row 15 px from them crowded both, trunks
      // and canopies overlapping (seen on the preview's orchard view).
      const O = T.orchard, A = T.lane, wide = O.inset + A.avenue;
      for (let gj = Math.floor(p.miny / O.pitch); gj <= Math.ceil(p.maxy / O.pitch); gj++) {
        for (let gi = Math.floor(p.minx / O.pitch); gi <= Math.ceil(p.maxx / O.pitch); gi++) {
          const x = Math.round(gi * O.pitch + (H(gi, gj, 31) - 0.5) * 2 * O.jit), y = Math.round(gj * O.pitch + (H(gi, gj, 32) - 0.5) * 2 * O.jit);
          const q = this.measure(x, y);
          if (q.plot !== p || q.edge < O.inset) continue;
          if ((q.L.avenue && q.dL < wide) || (q.R.avenue && q.dR < wide)) continue;
          if ((q.dT < wide && this.avenueAt(p.top, x) > A.avenueEw[2]) || (q.dB < wide && this.avenueAt(p.bottom, x) > A.avenueEw[2])) continue;
          if (this.cutAt(x, y) < 20) continue;
          out.push({ kind: 'orchard', n: tree(x, y), x, y });
        }
      }
    } else if (!p.lm) {
      const r = this.rngOf(k, m, 40), B = T.hay.bales, want = r.int(B[0], B[1]), have = [];
      const tryAt = (n) => {
        for (let t = 0; t < 12; t++) {
          const x = Math.round(p.x + (r() - 0.5) * 0.8 * p.w), y = Math.round(p.y + (r() - 0.5) * 0.8 * p.h);
          const q = this.measure(x, y);
          if (q.plot !== p || q.edge < 36 || this.cutAt(x, y) < 36 || have.some((b) => Math.hypot(b.x - x, b.y - y) < 70)) continue;
          const b = { kind: 'hay', n, x, y };
          have.push(b);
          out.push(b);
          return;
        }
      };
      for (let q = 0; q < want; q++) tryAt(r() < 0.5 ? 'bloom_hay1' : 'bloom_hay2');
      if (H(k, m, 42) < T.hay.scarecrow) tryAt('bloom_scarecrow');
    }
    p.props = out;
    return out;
  }
  // An avenue's trees in their slots every `treeEvery` ± `treeJit` px along it, both sides, on the
  // headland (`treeOff` px past the lane's edge), none within about 40 px of a junction or 16 of a cut.
  keepTree(x, y, across) {
    const q = this.measure(x, y);
    if (q.edge < 4) return false;
    if (across ? Math.min(q.dT, q.dB) < 30 : Math.min(q.dL, q.dR) < 30) return false;
    return this.cutAt(x, y) >= 16;
  }
  ewTrees(k, b) {
    const key = key2(k, b);
    let out = this.avMap.get(key);
    if (out) return out;
    out = [];
    const L = this.T.lane, l = this.ew(k), q0 = Math.ceil((b * EW_BIN) / L.treeEvery), q1 = Math.ceil(((b + 1) * EW_BIN) / L.treeEvery);
    for (let q = q0; q < q1; q++) {
      const x = q * L.treeEvery + (this.H(q, k, 50) - 0.5) * 2 * L.treeJit;
      if (this.avenueAt(l, x) <= L.avenueEw[2]) continue;
      const s = laneSlope(l, x), n = Math.sqrt(1 + s * s), y = laneY(l, x), d = l.hw + L.treeOff;
      for (const sg of [-1, 1]) {
        const tx = Math.round(x - (sg * d * s) / n), ty = Math.round(y + (sg * d) / n);
        if (this.keepTree(tx, ty, false)) out.push({ kind: 'avenue', n: OAKS[Math.floor(hash2(tx, ty, 77) * 3)], x: tx, y: ty });
      }
    }
    this.avMap.set(key, out);
    return out;
  }
  nsTrees(l) {
    if (l.trees) return l.trees;
    const out = [], L = this.T.lane, top = this.ew(l.k), bot = this.ew(l.k + 1);
    if (l.avenue && !l.dropped) {
      const ya = this.cross(top, l)[1], yb = this.cross(bot, l)[1], d = l.hw + L.treeOff;
      for (let q = Math.ceil(ya / L.treeEvery); q <= Math.floor(yb / L.treeEvery); q++) {
        const y = q * L.treeEvery + (this.H(q, key2(l.k, l.m) | 0, 51) - 0.5) * 2 * L.treeJit, x = laneX(l, y);
        for (const sg of [-1, 1]) {
          const tx = Math.round(x + (sg * d) / l.nrm), ty = Math.round(y - (sg * d * l.s) / l.nrm);
          if (this.keepTree(tx, ty, true)) out.push({ kind: 'avenue', n: OAKS[Math.floor(hash2(tx, ty, 77) * 3)], x: tx, y: ty });
        }
      }
    }
    l.trees = out;
    return out;
  }

  // ---- The interface (topology/index.js) -----------------------------------------------------------
  // The places, landmarks and paths (the places' plazas and crypt walks) that reach into the box, and
  // the topology's own props as one pseudo-landmark per kind (avenue, orchard, lone, hay), holding
  // every prop of that kind whose foot is in the box (layoutChunk keeps the ones its chunk owns).
  features(bx0, by0, bx1, by1) {
    const paths = [], places = [], landmarks = [], T = this.T;
    const near = (x, y, m) => x > bx0 - m && x < bx1 + m && y > by0 - m && y < by1 + m;
    const meets = (p) => p.minx < bx1 && p.maxx > bx0 && p.miny < by1 && p.maxy > by0;
    this.nodes(bx0, by0, bx1, by1, 900, (i, j) => {
      if ((i + j) & 1) {
        const L = this.landmark(i, j);
        if (L && near(L.x, L.y, 200)) landmarks.push(L);
        return;
      }
      const P = this.place(i, j), n = near(P.x, P.y, 260) || (P.crypt && near(P.crypt.x, P.crypt.y, 260));
      if (n) places.push(P);
      if (P.path && (n || meets(P.path))) paths.push(P.path);
    });
    const kinds = { avenue: [], orchard: [], lone: [], hay: [] }, inBox = (q) => q.x >= bx0 && q.x < bx1 && q.y >= by0 && q.y < by1;
    const take = (list) => {
      for (const q of list) if (inBox(q)) kinds[q.kind].push({ n: q.n, x: q.x, y: q.y });
    };
    const k0 = Math.floor(by0 / T.band) - 1, k1 = Math.ceil(by1 / T.band) + 1;
    for (let k = k0; k <= k1; k++) {
      this.bandPlots(k, bx0, bx1, (p) => {
        if (p.maxx < bx0 - 40 || p.minx > bx1 + 40 || p.maxy < by0 - 40 || p.miny > by1 + 40) return;
        take(this.plotProps(p));
        if (p.left.avenue) take(this.nsTrees(p.left));
      });
      for (let b = Math.floor((bx0 - 40) / EW_BIN); b <= Math.floor((bx1 + 40) / EW_BIN); b++) take(this.ewTrees(k, b));
    }
    let n = 0;
    for (const kind of Object.keys(kinds)) {
      const props = kinds[kind];
      n++;
      if (!props.length) continue;
      const x = (bx0 + bx1) / 2, y = (by0 + by1) / 2;
      landmarks.push({ x, y, i: 1e6 + n, j: 0, kind, props, clear: { x, y, r: 1 } });
    }
    return { paths, places, landmarks };
  }
  shrinesNear(x, y, r) {
    const out = [];
    this.nodes(x - r, y - r, x + r, y + r, 600, (i, j) => {
      if ((i + j) & 1 || (!i && !j)) return;
      const P = this.place(i, j);
      if ((P.x - x) ** 2 + (P.y - y) ** 2 <= r * r) out.push({ key: P.key, x: P.x, y: P.y, type: P.type });
    });
    return out;
  }
  cryptsNear(x, y, r) {
    const out = [];
    this.nodes(x - r, y - r, x + r, y + r, 600, (i, j) => {
      if ((i || j) && !this.isCrypt(i, j)) return;
      const c = this.place(i, j).crypt;
      if ((c.x - x) ** 2 + (c.y - y) ** 2 <= r * r) out.push(c);
    });
    return out;
  }
  patchesNear() {
    return [];
  }
  openAt() {
    return TMAX;
  }
  patchAt() {
    return -TMAX;
  }
  // The scatter (layoutChunk's bushes, flowers and toadstools) only in a hay field, off its lanes and
  // out of the places' cuts.
  canStand(x, y) {
    const q = this.measure(x, y);
    return q.plot.kind === 'hay' && q.edge >= 14 && this.cutAt(x, y) >= 0;
  }
  // The chunk's lattice: `edge` and `bloom` (as core measures them) and `plot` (an index into `plots`)
  // at every point, the cuts that meet it and the start's disc if it does. No open, patch or deck: every
  // query of the world reads open ground.
  terrain(cx, cy) {
    const T = this.T, x0 = cx * TCHUNK, y0 = cy * TCHUNK, x1 = x0 + TCHUNK, y1 = y0 + TCHUNK;
    const cuts = this.cutsIn(x0, y0, x1, y1, TMAX + T.cut.pad + 2);
    const edge = new Float32Array(TN * TN), bloom = new Float32Array(TN * TN), plot = new Uint8Array(TN * TN), plots = [], ix = new Map();
    // The east-west lanes' middles, slopes and insets once per column.
    const kLo = Math.round(y0 / T.band) - 2, kHi = Math.round(y1 / T.band) + 3, nK = kHi - kLo + 1;
    const CY = new Float64Array(nK * TN), CN = new Float64Array(nK * TN), CI = new Float64Array(nK * TN);
    for (let q = 0; q < nK; q++) {
      const l = this.ew(kLo + q);
      for (let i = 0; i < TN; i++) {
        const x = x0 + i * TSTEP, s = laneSlope(l, x);
        CY[q * TN + i] = laneY(l, x);
        CN[q * TN + i] = Math.sqrt(1 + s * s);
        CI[q * TN + i] = this.inset(l, x);
      }
    }
    // Each band's live north-south lanes over the chunk, west to east.
    const lanes = [];
    for (let q = 0; q < nK; q++) {
      const k = kLo + q, o = this.off(k), list = [];
      for (let m = Math.floor(x0 / T.col - o) - 4; m <= Math.ceil(x1 / T.col - o) + 3; m++) {
        const l = this.ns(k, m);
        if (!l.dropped) list.push(l);
      }
      lanes.push(list);
    }
    for (let j = 0; j < TN; j++) {
      const y = y0 + j * TSTEP;
      for (let i = 0; i < TN; i++) {
        const x = x0 + i * TSTEP;
        let q = 0;
        while (q + 1 < nK && CY[(q + 1) * TN + i] <= y) q++;
        const list = lanes[q];
        let a = list.length - 2;
        while (a > 0 && laneX(list[a], y) > x) a--;
        const c = j * TN + i, r = q + 1;
        const o = this.core(x, y, kLo + q, CY[q * TN + i], CN[q * TN + i], CI[q * TN + i], CY[r * TN + i], CN[r * TN + i], CI[r * TN + i], list[a], list[a + 1], cuts);
        edge[c] = o.edge;
        bloom[c] = o.bloom;
        let n = ix.get(o.plot.key);
        if (n === undefined) {
          n = plots.length;
          plots.push(o.plot);
          ix.set(o.plot.key, n);
        }
        plot[c] = n;
      }
    }
    const S = T.start, start = x0 - S.disc <= 0 && x1 + S.disc >= 0 && y0 - S.disc <= 0 && y1 + S.disc >= 0 ? { x: 0, y: 0, r: S.disc } : null;
    return {
      cx, cy, x0, y0, open: null, patch: null, deck: null, road: null, roadHw: null,
      blocked: SURFACE.WALL, patchKind: 0, patches: [], bridges: [], pools: [], caves: [],
      lava: false, lavaTiles: null, any: true,
      edge, bloom, plot, plots, cuts, start,
    };
  }
  trim(x, y) {
    const far = (px, py) => Math.abs(px - x) > KEEP || Math.abs(py - y) > KEEP;
    for (const [k, l] of this.ews) if (Math.abs(l.base - y) > KEEP) this.ews.delete(k);
    for (const [k, l] of this.nss) if (far(l.X0, l.yc)) this.nss.delete(k);
    for (const [k, p] of this.plotMap) if (far(p.x, p.y)) this.plotMap.delete(k);
    for (const [k, P] of this.placeMap) if (far(P.x, P.y)) this.placeMap.delete(k);
    const S = this.T.spacing;
    for (const [k, L] of this.lmMap) {
      const i = Math.round(k / 65536), j = k - i * 65536;
      if (far(i * S, j * S) || (L && far(L.x, L.y))) this.lmMap.delete(k);
    }
    for (const k of this.avMap.keys()) {
      const kk = Math.round(k / 65536), b = k - kk * 65536;
      if (far(b * EW_BIN, kk * this.T.band)) this.avMap.delete(k);
    }
    for (const k of this.orders.keys()) if (Math.abs(k * this.T.band - y) > KEEP) this.orders.delete(k);
  }
}
