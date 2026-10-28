// The Abyss's ground (game/topology, 28 October 2026): islands of dead land over lava or the void. The
// owner's words that day: "for hell, it has to bean area made of patches of land connected by bridges
// and occasionally just land. Everything should look dead....and, yeah, should be like patches of this
// dead baren wasteland connected with either thin stretches of this land or bridges here and there and
// below it should look like .....basically two versions, one version has lava around these patches of
// land and below the bridges and the other has like a huge fall into the void."
//
// An island stands near each point (i, j) of a lattice `spacing` px apart (the start's at the origin),
// round, its coast wobbling, never nearer its neighbours than `gapMin` px; each is joined to the four
// next to it by a bridge, a thin isthmus or a broad joining of land, as darkwood.js joins its
// crossroads by roads: an island may give up one of its joinings and one goes only where both its ends
// give it up, so every island keeps three or four and every island can be walked to from every other
// (no dead end without a way back). Causeways run from each island's middle to its joinings; a shrine
// stands on the islands with i + j odd, a crypt on a checkerboard of the even ones (the nearest four
// links, a minute's walk, from the start, as the Darkwood's are), landmarks on the rest. The layout is
// the map's seed's alone; below it, lava or the void, one or the other by the run's seed.

import { hash2, fbm, TAU } from '../../engine/util.js';
import { pathOf, footpath, chaikin, resample } from '../darkwood.js';
import { SURFACE, TN, TSTEP, TMAX, TCHUNK } from './terrain.js';
import { dice, clampT, ss, makeBlob, blobSdf, blobMeets, makeChain, chainSdf, chainMeets, stampChain, fieldOf, settle, DEEP } from './shapes.js';
import { shrineOrder, adder, walkPath, shrinePlace, startCamp, dress, bridgehead } from './places.js';

const ISLAND_REACH = 40; // an island's field is stamped this far past its farthest coast
const FINE = { amp: 6, cell: 36 }; // the coasts' finer wobble, px and the length of rim it wanders over
const KEEP = 6000; // trim(): islands and joinings farther than this are forgotten (made again the same)
const LANDMARK_KINDS = ['graveyard', 'gallows', 'circle', 'ruins'];
const DIRS = [[1, 0], [0, 1]]; // a joining is named by its west or north end: east (0) or south (1)

export class Islands {
  constructor(T, mapSeed, runSeed) {
    this.T = T;
    this.kind = 'islands';
    this.axis = null;
    // Lava or the void, from the run's seed (the layout is the map's alone, the same in both); lava
    // without one (tools/mapgen/endless.mjs without --run, which --variant overrides).
    this.variant = runSeed === undefined || runSeed === null ? T.variants[0] : hash2(runSeed & 0xffff, runSeed >>> 16, 4049) < 0.5 ? T.variants[0] : T.variants[1];
    this.blocked = SURFACE.GAP;
    this.patchKind = 0;
    this.cryptRange = { near: 2400, far: 2800 };
    const { H, rngOf, s } = dice(mapSeed);
    this.H = H;
    this.rngOf = rngOf;
    this.s = s;
    this.order = shrineOrder(rngOf);
    this.isl = new Map();
    this.links = new Map();
    this.cache = new Map(); // places and landmarks by island
  }

  // ---- Islands ------------------------------------------------------------------------------------
  // Where island (i, j) stands: the start at the origin; its eight neighbours stray only away from it,
  // so the start has room to be large.
  centre(i, j) {
    if (!i && !j) return [0, 0];
    const S = this.T.spacing, J = this.T.stray * S;
    let dx = (this.H(i, j, 1) - 0.5) * 2 * J, dy = (this.H(i, j, 2) - 0.5) * 2 * J;
    if (Math.abs(i) <= 1 && Math.abs(j) <= 1) {
      if (i) dx = Math.sign(i) * Math.abs(dx);
      if (j) dy = Math.sign(j) * Math.abs(dy);
    }
    return [i * S + dx, j * S + dy];
  }
  // Its radius before fitting, and its coast's shape at radius 1 (the start's rounder).
  shape(i, j) {
    const key = `u${i},${j}`;
    let u = this.cache.get(key);
    if (u) return u;
    const T = this.T, start = !i && !j;
    const R0 = start ? T.startR : T.r[0] + (T.r[1] - T.r[0]) * this.H(i, j, 3);
    let k = 0;
    const unit = makeBlob(0, 0, 1, 1, 0, start ? T.amp * 0.5 : T.amp, () => this.H(i, j, 10 + k++), 1);
    u = { R0, fmax: unit.ext - 1, fmin: unit.inn + 1 };
    this.cache.set(key, u);
    return u;
  }
  // Island (i, j): fitted so that no two coasts come nearer than gapMin (each gives up its share of
  // the room to each neighbour, by their sizes; the start gives none), pure and symmetric.
  island(i, j) {
    const key = `${i},${j}`;
    let I = this.isl.get(key);
    if (I) return I;
    const T = this.T, me = this.shape(i, j), [x, y] = this.centre(i, j), start = !i && !j;
    let R = me.R0;
    if (!start) {
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const n = this.shape(i + di, j + dj), [nx, ny] = this.centre(i + di, j + dj), d = Math.hypot(nx - x, ny - y) - T.gapMin - 2 * FINE.amp - 2;
          const lim = !(i + di) && !(j + dj) ? (d - n.R0 * n.fmax) / me.fmax : (d * me.R0) / (me.R0 * me.fmax + n.R0 * n.fmax);
          R = Math.min(R, lim);
        }
      }
    }
    R = Math.max(R, 60);
    let k = 0;
    const blob = makeBlob(x, y, R, 1, 0, start ? T.amp * 0.5 : T.amp, () => this.H(i, j, 10 + k++), 1, { ...FINE, seed: this.s + 101 + ((i * 31 + j * 17) & 1023) });
    I = { i, j, x, y, R, blob, key };
    this.isl.set(key, I);
    return I;
  }

  // ---- Joinings ------------------------------------------------------------------------------------
  // darkwood.js's rule for its roads: an island may give up its least-hashed joining if that hash is
  // under `drop`, and a joining goes only if both its ends give it up; the start gives up none.
  linksOf(i, j) {
    return [[i, j, 0], [i, j, 1], [i - 1, j, 0], [i, j - 1, 1]];
  }
  linkHash(i, j, d) {
    return this.H(2 * i + d, j, 3);
  }
  givesUp(i, j) {
    if (!i && !j) return null;
    let best = null, bh = this.T.links.drop;
    for (const e of this.linksOf(i, j)) {
      const v = this.linkHash(...e);
      if (v < bh) {
        bh = v;
        best = e;
      }
    }
    return best;
  }
  linkExists(i, j, d) {
    const same = (a) => a && a[0] === i && a[1] === j && a[2] === d;
    return !(same(this.givesUp(i, j)) && same(this.givesUp(i + DIRS[d][0], j + DIRS[d][1])));
  }
  // Joining (i, j, d), or null where it is left out: its kind and width, its path from middle to
  // middle (one bend), where it leaves the one coast and meets the other (its mouths), and its shape:
  // the land of an isthmus or a broad joining (flaring where it meets the coasts), a bridge's deck.
  link(i, j, d) {
    const key = `${i},${j},${d}`;
    if (this.links.has(key)) return this.links.get(key);
    let L = null;
    if (this.linkExists(i, j, d)) {
      const T = this.T.links, a = 2 * i + d, H = (k) => this.H(a, j, k);
      const A = this.island(i, j), B = this.island(i + DIRS[d][0], j + DIRS[d][1]);
      const h = H(4), kind = h < T.bridge ? 'bridge' : h < T.bridge + T.isthmus ? 'isthmus' : 'broad';
      const [w0, w1] = T.hw[kind], hw = w0 + (w1 - w0) * H(5);
      const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
      const off = (H(6) - 0.5) * 2 * T.bend * len;
      let pts = [[A.x, A.y], [A.x + dx * 0.5 + nx * off, A.y + dy * 0.5 + ny * off], [B.x, B.y]];
      for (let k = 0; k < 3; k++) pts = chaikin(pts);
      pts = resample(pts, 4);
      // The mouths: the last point still on A's land going out, the first on B's coming in.
      let mA = 0, mB = pts.length - 1;
      while (mA < pts.length - 1 && blobSdf(A.blob, pts[mA + 1][0], pts[mA + 1][1]) > 0) mA++;
      while (mB > 0 && blobSdf(B.blob, pts[mB - 1][0], pts[mB - 1][1]) > 0) mB--;
      if (mB <= mA) mB = Math.min(pts.length - 1, mA + 1);
      const material = kind !== 'bridge' ? null : pickWeighted(T.materials, H(7));
      L = { key, i, j, d, kind, hw, A, B, pts, mA, mB, material, len: (mB - mA) * 4 };
      const es = this.s + 131 + ((a * 13 + j * 7) & 1023);
      if (kind === 'bridge') {
        // The deck from 12 px inside the one coast to 12 px inside the other.
        const k0 = Math.max(0, mA - 3), k1 = Math.min(pts.length - 1, mB + 3), xs = [], ys = [], ws = [];
        for (let k = k0; k <= k1; k += 2) {
          xs.push(pts[k][0]);
          ys.push(pts[k][1]);
          ws.push(hw);
        }
        if ((k1 - k0) & 1) {
          xs.push(pts[k1][0]);
          ys.push(pts[k1][1]);
          ws.push(hw);
        }
        L.deck = makeChain(xs, ys, ws);
        L.deckPts = pts.slice(k0, k1 + 1);
        L.shape = L.deck;
      } else {
        // Land: its width wandering a little, flaring out where it meets each coast (from 40 px out).
        const flare = Math.min(24, hw), xs = [], ys = [], ws = [];
        const k0 = Math.max(0, mA - 10), k1 = Math.min(pts.length - 1, mB + 10);
        for (let k = k0; k <= k1; k += 2) {
          const s = k * 4, out = Math.max(0, Math.min((k - mA) * 4, (mB - k) * 4));
          xs.push(pts[k][0]);
          ys.push(pts[k][1]);
          ws.push(hw * (1 + 0.22 * (fbm(s / 70, 0.5, es, 2) - 0.5) * 2) + flare * ss(40, 0, out));
        }
        L.shape = makeChain(xs, ys, ws);
      }
      // A causeway along it, from middle to middle; on a bridge, from each middle to its mouth (the
      // deck takes it across).
      const cw = 10 + 3 * H(8), road = (k0, k1) => {
        const xs = [], ys = [], ws = [];
        for (let k = k0; k <= k1; k++) {
          xs.push(pts[k][0]);
          ys.push(pts[k][1]);
          ws.push(cw);
        }
        return pathOf('road', xs, ys, ws);
      };
      L.ways = kind === 'bridge' ? [road(0, mA), road(mB, pts.length - 1)] : [road(0, pts.length - 1)];
      if (kind === 'bridge') {
        // A post either side of the deck at each end, just on the land; a brazier at one bridge in three.
        const end = (k, s) => {
          const p = pts[k], q = pts[Math.min(pts.length - 1, Math.max(0, k + s))], tx = q[0] - p[0], ty = q[1] - p[1], tl = Math.hypot(tx, ty) || 1;
          return [p[0], p[1], -ty / tl, tx / tl];
        };
        const [ax, ay, anx, any] = end(Math.max(0, mA - 2), 1), [bx, by, bnx, bny] = end(Math.min(pts.length - 1, mB + 2), -1);
        const fire = H(9) < 1 / 3, side = H(10) < 0.5;
        L.heads = [
          bridgehead(1e6 + 2 * a, j, ax, ay, anx, any, hw, material, fire && side),
          bridgehead(1e6 + 2 * a + 1, j, bx, by, bnx, bny, hw, material, fire && !side),
        ];
      }
    }
    this.links.set(key, L);
    return L;
  }
  // The joinings of island (i, j) that exist.
  joinings(i, j) {
    const out = [];
    for (const e of this.linksOf(i, j)) {
      const L = this.link(...e);
      if (L) out.push(L);
    }
    return out;
  }
  // The direction a joining leaves island (i, j) by (toward its mouth on that island).
  heading(L, i, j) {
    const fromA = L.i === i && L.j === j, k = fromA ? Math.min(L.mA, L.pts.length - 1) : Math.max(L.mB, 0), I = fromA ? L.A : L.B;
    return Math.atan2(L.pts[k][1] - I.y, L.pts[k][0] - I.x);
  }

  // ---- Places -------------------------------------------------------------------------------------
  isCrypt(i, j) {
    return (i & 1) === 0 && (j & 1) === 0 && (((i + j) / 2) & 1) === 0;
  }
  // What stands on island (i, j): the start, a shrine, a crypt, a landmark or nothing but the woods.
  placeOf(i, j) {
    const key = `p${i},${j}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const I = this.island(i, j), { x, y, R } = I, out = { place: null, landmark: null };
    const dirs = this.joinings(i, j).map((L) => this.heading(L, i, j));
    // The open angle farthest from every joining, among those given.
    const freest = (cands) => {
      let best = cands[0], bd = -1;
      for (const a of cands) {
        let d = Infinity;
        for (const b of dirs) d = Math.min(d, Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))));
        if (d > bd) {
          bd = d;
          best = a;
        }
      }
      return best;
    };
    if (!i && !j) {
      // The start: the camp in the wedges between its four joinings (they run out from it north, south,
      // east and west, so the Darkwood's camp, its fire due south, would stand on a causeway): the fire
      // to the south-east, the lantern north-east, the waystone south-west, and a crypt a step away to
      // the north-west, its door facing the plaza, a walk up to its steps. No direction held from where
      // the hero starts walks onto them (he passes 22 px wide of them going north-west).
      const P = startCamp(x, y, { fire: [x + 58, y + 64], lamp: [x + 62, y - 50], stone: [x - 64, y + 50] });
      const a = -Math.PI / 2 - 0.62, cxp = Math.round(x + Math.cos(a) * 78), cyp = Math.round(y + Math.sin(a) * 78);
      P.crypt = { key: '0,0', x: cxp, y: cyp, depth: 1, face: 'island' };
      P.path = walkPath(x, y, 40, x, y, cxp, cyp + 14, 7, 0);
      out.place = P;
    } else if ((i + j) & 1) {
      out.place = shrinePlace(`${i},${j}`, i, j, x, y, this.order[(((i + 3 * j) % 5) + 5) % 5]);
    } else if (this.isCrypt(i, j)) {
      // A crypt on the north side of the island, off the joinings, its door facing south.
      const a = freest([-Math.PI / 2 - 0.75, -Math.PI / 2 + 0.75, -Math.PI / 2 - 1.1, -Math.PI / 2 + 1.1]);
      const r = Math.min(0.42 * R, R * this.shape(i, j).fmin - 60), cxp = Math.round(x + Math.cos(a) * r), cyp = Math.round(y + Math.sin(a) * r);
      const mx = (x + cxp) / 2, my = (y + cyp) / 2;
      const P = { x, y, i, j, key: `${i},${j}`, kind: 'crypt', props: [], clear: { x: mx, y: my, r: Math.max(150, Math.hypot(cxp - x, cyp - y) / 2 + 80) } };
      P.crypt = { key: `${i},${j}`, x: cxp, y: cyp, depth: Math.max(Math.abs(i), Math.abs(j)) / 2, face: 'island' };
      P.path = walkPath(x, y, 30, x, y, cxp, cyp + 14, Math.floor(this.H(i, j, 35) * 1e6), 24);
      const add = adder(P);
      add('lantern', cxp - 24, cyp + 5, { light: ['warm', 60] });
      add('lantern', cxp + 24, cyp + 5, { light: ['warm', 60] });
      out.place = P;
    } else if (this.H(i, j, 6) < 0.7 && R * this.shape(i, j).fmin >= 230) {
      // A landmark off the joinings, half way out, down a footpath from the middle.
      const a = freest([0.785, 2.356, -0.785, -2.356, 0, Math.PI, Math.PI / 2, -Math.PI / 2]);
      const dL = Math.min(0.55 * R, R * this.shape(i, j).fmin - 110), lx = x + Math.cos(a) * dL, ly = y + Math.sin(a) * dL;
      const kind = LANDMARK_KINDS[Math.floor(this.H(i, j, 9) * LANDMARK_KINDS.length)];
      const L = { x: lx, y: ly, i, j, kind, props: [], clear: { x: lx, y: ly, r: 128 } };
      L.path = footpath(x, y, lx, ly + 30, Math.floor(this.H(i, j, 14) * 1e6), 60);
      out.landmark = dress(L, this.rngOf(i, j, 10), x);
    }
    this.cache.set(key, out);
    return out;
  }
  start() {
    return this.placeOf(0, 0).place.hero;
  }

  // ---- The interface (topology/index.js) -----------------------------------------------------------
  // fn(i, j) for every island whose lattice point lies within the box, `m` px round.
  each(x0, y0, x1, y1, m, fn) {
    const S = this.T.spacing;
    for (let j = Math.floor((y0 - m) / S); j <= Math.ceil((y1 + m) / S); j++) for (let i = Math.floor((x0 - m) / S); i <= Math.ceil((x1 + m) / S); i++) fn(i, j);
  }
  features(bx0, by0, bx1, by1) {
    const paths = [], places = [], landmarks = [];
    const near = (x, y, m) => x > bx0 - m && x < bx1 + m && y > by0 - m && y < by1 + m;
    const meets = (p) => p.minx < bx1 && p.maxx > bx0 && p.miny < by1 && p.maxy > by0;
    this.each(bx0, by0, bx1, by1, 1100, (i, j) => {
      const { place, landmark } = this.placeOf(i, j);
      if (place) {
        const n = near(place.x, place.y, 260) || (place.crypt && near(place.crypt.x, place.crypt.y, 260));
        if (n) places.push(place);
        if (n || meets(place.path)) paths.push(place.path);
      }
      if (landmark && (meets(landmark.path) || near(landmark.x, landmark.y, 200))) {
        landmarks.push(landmark);
        paths.push(landmark.path);
      }
      for (const d of [0, 1]) {
        const L = this.link(i, j, d);
        if (!L) continue;
        for (const w of L.ways) if (meets(w)) paths.push(w);
        if (L.heads) for (const h of L.heads) if (near(h.x, h.y, 200)) landmarks.push(h);
      }
    });
    return { paths, places, landmarks };
  }
  shrinesNear(x, y, r) {
    const out = [];
    this.each(x - r, y - r, x + r, y + r, 200, (i, j) => {
      if (!((i + j) & 1)) return;
      const I = this.island(i, j);
      if ((I.x - x) ** 2 + (I.y - y) ** 2 <= r * r) out.push({ key: `${i},${j}`, x: I.x, y: I.y, type: this.order[(((i + 3 * j) % 5) + 5) % 5] });
    });
    return out;
  }
  cryptsNear(x, y, r) {
    const out = [];
    this.each(x - r, y - r, x + r, y + r, 200, (i, j) => {
      if ((i || j) && !this.isCrypt(i, j)) return;
      const c = this.placeOf(i, j).place.crypt;
      if ((c.x - x) ** 2 + (c.y - y) ** 2 <= r * r) out.push(c);
    });
    return out;
  }
  patchesNear() {
    return [];
  }
  // fnIsland(island) and fnLink(joining) for every island and joining that may reach the box (a
  // joining's far end may stand 1,200 px off).
  shapesNear(x0, y0, x1, y1, fnIsland, fnLink) {
    this.each(x0, y0, x1, y1, 1000, (i, j) => {
      fnIsland(this.island(i, j));
      for (const d of [0, 1]) {
        const L = this.link(i, j, d);
        if (L) fnLink(L);
      }
    });
  }
  openAt(x, y) {
    let o = -Infinity;
    this.shapesNear(x, y, x, y, (I) => {
      const v = blobSdf(I.blob, x, y, ISLAND_REACH);
      if (v > o) o = v;
    }, (L) => {
      const v = chainSdf(L.shape, x, y);
      if (v > o) o = v;
    });
    return clampT(o);
  }
  deckAt(x, y) {
    let o = -Infinity;
    this.shapesNear(x, y, x, y, () => {}, (L) => {
      if (!L.deck) return;
      const v = chainSdf(L.deck, x, y);
      if (v > o) o = v;
    });
    return clampT(o);
  }
  patchAt() {
    return -TMAX;
  }
  canStand(x, y) {
    return this.openAt(x, y) >= 12 && this.deckAt(x, y) <= -4;
  }
  terrain(cx, cy) {
    const x0 = cx * TCHUNK, y0 = cy * TCHUNK, open = fieldOf(-Infinity), bridges = [];
    let deck = null;
    this.shapesNear(x0, y0, x0 + TCHUNK, y0 + TCHUNK, (I) => {
      const b = I.blob;
      if (!blobMeets(b, x0, y0, ISLAND_REACH)) return;
      const E = b.ext + ISLAND_REACH;
      const i0 = Math.max(0, Math.ceil((b.x - E - x0) / TSTEP)), i1 = Math.min(TN - 1, Math.floor((b.x + E - x0) / TSTEP));
      const j0 = Math.max(0, Math.ceil((b.y - E - y0) / TSTEP)), j1 = Math.min(TN - 1, Math.floor((b.y + E - y0) / TSTEP));
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const v = blobSdf(b, x0 + i * TSTEP, y0 + j * TSTEP, ISLAND_REACH), c = j * TN + i;
          if (v > open[c]) open[c] = v;
        }
      }
    }, (L) => {
      if (!chainMeets(L.shape, x0, y0)) return;
      stampChain(open, x0, y0, L.shape);
      if (L.deck) {
        if (!deck) deck = fieldOf(-Infinity);
        stampChain(deck, x0, y0, L.deck);
        const xs = new Float32Array(L.deckPts.length), ys = new Float32Array(L.deckPts.length);
        L.deckPts.forEach((p, k) => {
          xs[k] = p[0];
          ys[k] = p[1];
        });
        bridges.push({ key: L.key, xs, ys, hw: L.hw, material: L.material, len: (L.deckPts.length - 1) * 4 });
      }
    });
    let o = open;
    const allGap = settle(o, -TMAX);
    let allLand = true;
    for (let c = 0; c < o.length && allLand; c++) if (o[c] < TMAX) allLand = false;
    if (allGap) o = DEEP;
    else if (allLand) o = null;
    if (deck && settle(deck, -TMAX)) deck = null;
    // The 32 px tiles wholly lava (all nine lattice points of the tile under -3, none on a deck): the
    // ones draw.js animates with the crypts' baked lava; the rest stay as painted.
    let lava = false, lavaTiles = null;
    if (this.variant === 'lava' && o) {
      const list = [];
      for (let ty = 0; ty < 8; ty++) {
        for (let tx = 0; tx < 8; tx++) {
          let whole = true;
          for (let b = 0; b <= 8 && whole; b += 4) {
            for (let a = 0; a <= 8 && whole; a += 4) {
              const c = (ty * 8 + b) * TN + tx * 8 + a;
              if (o[c] >= -3 || (deck && deck[c] >= -3)) whole = false;
            }
          }
          if (whole) list.push(tx, ty);
        }
      }
      for (let c = 0; c < o.length && !lava; c++) if (o[c] < 0) lava = true;
      if (list.length) lavaTiles = Int8Array.from(list);
    }
    return {
      cx, cy, x0, y0, open: o, patch: null, deck, road: null, roadHw: null,
      blocked: this.blocked, patchKind: 0, patches: [], bridges, pools: [], caves: [],
      lava, lavaTiles, any: !!(o || deck),
    };
  }
  trim(x, y) {
    const far = (I) => Math.abs(I.x - x) > KEEP || Math.abs(I.y - y) > KEEP;
    for (const [k, I] of this.isl) if (far(I)) this.isl.delete(k);
    for (const [k, L] of this.links) if (!L || far(L.A)) this.links.delete(k);
    const S = this.T.spacing;
    for (const k of this.cache.keys()) {
      const [i, j] = k.slice(1).split(',').map(Number);
      if (Math.abs(i * S - x) > KEEP || Math.abs(j * S - y) > KEEP) this.cache.delete(k);
    }
  }
}

// The key of `w` ({ name: share }) that r (0..1) falls in.
function pickWeighted(w, r) {
  let t = 0;
  const keys = Object.keys(w), sum = keys.reduce((s, k) => s + w[k], 0);
  for (const k of keys) {
    t += w[k] / sum;
    if (r < t) return k;
  }
  return keys[keys.length - 1];
}
