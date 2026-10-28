// The Sunscorch's and the Frostfell's ground (game/topology, 28 October 2026): an endless corridor. The
// owner's words that day: "The desert map should be long left to right map that has a mountain range at
// top and bottom. At the top, there is an entrance of a cave every once in a while 2 mins walk apart
// roughly and that is basicallly the crypt. feel free to add quicksand", and "The frost map goes up and
// down feel free to add details to it like ice here and there ... Entrance to crypts are iglus here and
// there, some 2 minutes apart. Both frost and desert have roads that are not constantly straigh".
//
// One class for both: u runs along the corridor and v across it (the Sunscorch: u = x, v = y; the
// Frostfell: u = y, v = x). Open ground about `band` px across between two faces that wobble (lo(u), the
// top or left one, and hi(u)), a mountain range or a cliff beyond each the hero cannot climb; a road
// winding along it, never long straight (two sines that never line up and a slow noise); a shrine on it
// every 30-odd seconds of walking; crypts a minute from the start each way, then every two minutes' walk
// (~9,000 px): cave mouths cut in the foot of the top range, or igloos beside the road; landmarks between
// the shrines; and patches off the road (quicksand pools, ice sheets with rocks). Everything is a pure
// function of an index along u and the map's seed, so any piece of it can be made alone, in any order.
// The faces are 1D functions of u, so the corridor can never fold back on itself.

import { fbm, clamp, TAU } from '../../engine/util.js';
import { pathOf, footpath } from '../darkwood.js';
import { SURFACE, TN, TSTEP, TMAX, TCHUNK } from './terrain.js';
import { dice, ss, clampT, makeBlob, blobSdf, blobOutline, blobMeets, fieldOf, settle, DEEP } from './shapes.js';
import { shrineOrder, adder, walkPath, shrinePlace, startCamp, dress, pondLandmark } from './places.js';

const PATCH_REACH = 16; // a patch's field reaches this far past its rim (its sign is all that's read there)
const POOL_REACH = TMAX; // an oasis's water is stamped as far as it can lower `open`
const KEEP = 6000; // trim(): what is farther than this along u is forgotten (made again the same if needed)
const RIDGE_BIN = 960; // the spires on a range are laid out as one landmark per this much of u
const PATH_GAP = 12; // px kept between a patch's farthest rim and the edge of a footpath to a crypt or a landmark

// Whether a disc of radius r round (x, y) meets a path (darkwood.js pathOf: its points ~4 px apart, each
// a disc of its half width).
function meetsPath(p, x, y, r) {
  if (x < p.minx - r || x > p.maxx + r || y < p.miny - r || y > p.maxy + r) return false;
  for (let i = 0; i < p.xs.length; i++) if (Math.hypot(p.xs[i] - x, p.ys[i] - y) < r + p.hw[i]) return true;
  return false;
}

export class Corridor {
  constructor(T, mapSeed, runSeed) {
    this.T = T;
    this.kind = 'corridor';
    this.axis = T.axis;
    this.variant = null;
    this.blocked = SURFACE.WALL;
    this.patchKind = !T.patches ? 0 : T.patches.kind === 'ice' ? SURFACE.ICE : SURFACE.QUICKSAND;
    // Crypts are ~9,000 px apart along the corridor (7,000-11,000 with their jitter): in at 5,800, out at
    // 6,200, so the HUD points at both of the start's (each 3,900-5,100 px along it, up to ~800 across)
    // and, anywhere along the corridor, at least at the nearest (Forest.syncShrines).
    this.cryptRange = { near: 5800, far: 6200 };
    const { H, rngOf, s } = dice(mapSeed);
    this.H = H;
    this.rngOf = rngOf;
    this.s = s;
    this.f1 = H(0, 0, 1) * TAU;
    this.f2 = H(0, 0, 2) * TAU;
    this.half = T.band / 2;
    this.order = shrineOrder(rngOf);
    this.caves = T.crypts.at === 'top';
    this.segs = new Map();
    this.cache = new Map(); // places, landmarks, patch cells, ridges: by a key of their own
  }

  // (u, v) <-> (x, y)
  X(u, v) {
    return this.axis === 'x' ? u : v;
  }
  Y(u, v) {
    return this.axis === 'x' ? v : u;
  }
  U(x, y) {
    return this.axis === 'x' ? x : y;
  }
  V(x, y) {
    return this.axis === 'x' ? y : x;
  }
  memo(key, make) {
    let v = this.cache.get(key);
    if (v === undefined) {
      v = make();
      this.cache.set(key, v);
    }
    return v;
  }

  // ---- The 1D functions --------------------------------------------------------------------------
  // The road's middle at u: never long straight, bending both ways (the owner's "roads that are not
  // constantly straight"): two sines whose periods never line up, and a slow noise, within the band
  // less `keep` either side.
  road(u) {
    const R = this.T.road, lim = this.half - R.keep;
    const v = R.amp * (0.62 * Math.sin((TAU * u) / R.periods[0] + this.f1) + 0.38 * Math.sin((TAU * u) / R.periods[1] + this.f2) + R.wobble * (fbm(u / 700, 0.5, this.s + 5, 2) - 0.5) * 2);
    return clamp(v, -lim, lim);
  }
  // Its half width, as darkwood.js's roads have it.
  roadHw(u) {
    return 13 + 4.5 * (fbm(u / 520, 1.3, this.s + 23, 2) - 0.5) * 2;
  }
  // The top (Sunscorch) or left (Frostfell) face, as laid: a slow swell and a rough grain.
  loRaw(u) {
    const F = this.T.face;
    return -this.half + F.amp * (fbm(u / F.wave, 1.7, this.s + 11, 3) - 0.5) * 2 + F.rough * (fbm(u / F.grain, 3.1, this.s + 13, 2) - 0.5) * 2;
  }
  // The face as it stands: at a cave's mouth (the Sunscorch's crypts) drawn level for 24 px either side
  // of it and eased back over 32 more, so its door stands square in the cliff.
  lo(u) {
    const l = this.loRaw(u);
    if (!this.caves) return l;
    const k = this.cryptNear(u);
    if (!k) return l;
    const uk = this.cryptU(k), d = Math.abs(u - uk);
    return d >= 56 ? l : l + (this.loRaw(uk) - l) * ss(56, 24, d);
  }
  // The bottom (Sunscorch) or right (Frostfell) face.
  hi(u) {
    const F = this.T.face;
    return this.half + F.amp * (fbm(u / F.wave, 5.3, this.s + 17, 3) - 0.5) * 2 + F.rough * (fbm(u / F.grain, 7.9, this.s + 19, 2) - 0.5) * 2;
  }

  // ---- Crypts, shrines, landmarks, patches: each a pure function of its index -------------------------
  // Crypt k (k != 0): a minute's walk from the start each way (k = ±1), then every `every` px.
  cryptU(k) {
    const C = this.T.crypts, a = Math.abs(k);
    return Math.sign(k) * (C.first + (a - 1) * C.every) + (this.H(k, 0, 31) - 0.5) * 2 * (a === 1 ? Math.min(600, C.jitter) : C.jitter);
  }
  // The crypts whose u lies within [ua, ub].
  cryptsIn(ua, ub) {
    const C = this.T.crypts, out = [], J = C.jitter + 1;
    const side = (a, b, s) => {
      // |u_k| = first + (|k| - 1) * every ± jitter, for u_k * s in [a, b]
      const m0 = Math.max(1, Math.floor((a - J - C.first) / C.every) + 1), m1 = Math.ceil((b + J - C.first) / C.every) + 1;
      for (let m = m0; m <= m1; m++) {
        const k = s * m, u = this.cryptU(k);
        if (u >= ua && u <= ub) out.push(k);
      }
    };
    if (ub > 0) side(Math.max(0, ua), ub, 1);
    if (ua < 0) side(Math.max(0, -ub), -ua, -1);
    return out;
  }
  // The crypt nearest u along the corridor (0 when none is within 2,000 px): among the three whose
  // places on the lattice of `every` are nearest (a crypt strays less than half of it).
  cryptNear(u) {
    const C = this.T.crypts, s = u < 0 ? -1 : 1, m = Math.round((Math.abs(u) - C.first) / C.every) + 1;
    let best = 0, bd = 2000;
    for (let q = Math.max(1, m - 1); q <= Math.max(1, m + 1); q++) {
      const d = Math.abs(this.cryptU(s * q) - u);
      if (d < bd) {
        bd = d;
        best = s * q;
      }
    }
    return best;
  }
  // The crypt's place: its door (key 'k,0': game.js cryptName splits and hashes it), a walk to its
  // steps, a lantern either side of them.
  cryptPlace(k) {
    return this.memo('c' + k, () => {
      const C = this.T.crypts, u = this.cryptU(k), key = `${k},0`, H = this.H;
      let v, face;
      if (C.at === 'top') {
        // A cave mouth at the foot of the top range, 16 px out from the cliff (its sprite's top half
        // stands against the face, the recess painted round it: topology/paint.js).
        v = this.loRaw(u) + 16;
        face = C.face || 'cliff';
      } else {
        // An igloo beside the road, `off` px off its middle on a side of its own.
        const side = H(k, 0, 33) < 0.5 ? -1 : 1;
        v = this.road(u) + side * (C.off[0] + (C.off[1] - C.off[0]) * H(k, 0, 34));
        face = C.face || 'igloo';
      }
      const x = Math.round(this.X(u, v)), y = Math.round(this.Y(u, v));
      const P = { x, y, i: k, j: 0, key, kind: 'crypt', props: [], clear: { x, y, r: 150 } };
      P.crypt = { key, x, y, depth: Math.abs(k), face };
      // Its door faces south on every map (game.js CRYPT_STEPS; the push up its steps): the walk comes
      // up to them from the south. A cave's from the road below it; an igloo's from the road a little
      // south along it (the Frostfell's u runs south), round to its front.
      const ua = C.at === 'top' ? u : u + (this.axis === 'y' ? 44 : 0);
      const ra = this.road(ua), ax = this.X(ua, ra), ay = this.Y(ua, ra);
      const seed = Math.floor(H(k, 0, 35) * 1e6);
      P.path = walkPath(x, y + 8, C.at === 'top' ? 15 : 20, ax, ay, x, y + 14, seed, C.at === 'top' ? 90 : 20);
      const add = adder(P);
      add('lantern', x - 24, y + 5, { light: ['warm', 60] });
      add('lantern', x + 24, y + 5, { light: ['warm', 60] });
      return P;
    });
  }
  // Shrine k (k != 0) on the road's middle, every `every` px; moved along off a crypt's door if it
  // would stand within 320 px of one.
  shrineU(k) {
    return this.memo('su' + k, () => {
      const S = this.T.shrines;
      let u = k * S.every + (this.H(k, 0, 3) - 0.5) * 2 * S.jitter;
      for (const c of this.cryptsIn(u - 400, u + 400)) {
        const P = this.cryptPlace(c), v = this.road(u);
        if (Math.hypot(P.x - this.X(u, v), P.y - this.Y(u, v)) < 320) u = this.cryptU(c) + Math.sign(u - this.cryptU(c) || 1) * 360;
      }
      return u;
    });
  }
  shrinePlace(k) {
    return this.memo('s' + k, () => {
      const u = this.shrineU(k), v = this.road(u);
      return shrinePlace(`s${k}`, k, 0, this.X(u, v), this.Y(u, v), this.order[((k % 5) + 5) % 5]);
    });
  }
  // The start (index 0): a plaza on the road, the camp to the side of it with more room, everything
  // kept off the road (each prop by the road where it stands, not where the start is).
  startPlace() {
    return this.memo('start', () => {
      const v = this.road(0), s = this.hi(0) - v >= v - this.lo(0) ? 1 : -1;
      const at = (du, dv) => [this.X(du, this.road(du) + s * dv), this.Y(du, this.road(du) + s * dv)];
      return startCamp(this.X(0, v), this.Y(0, v), { fire: at(0, 84), lamp: at(-48, -44), stone: at(52, -46) });
    });
  }
  start() {
    return this.startPlace().hero;
  }
  // The places worth keeping things away from near u: the start, the shrines, the crypt doors.
  spotsNear(u, r) {
    const out = [];
    if (Math.abs(u) < r + 400) out.push(this.startPlace());
    const S = this.T.shrines.every;
    for (let k = Math.floor((u - r - 900) / S); k <= Math.ceil((u + r + 900) / S); k++) if (k) out.push(this.shrinePlace(k));
    for (const k of this.cryptsIn(u - r - 200, u + r + 200)) out.push(this.cryptPlace(k));
    return out;
  }
  // Landmark k: between shrine k and k + 1 (the start is shrine 0), off the road on its roomier side.
  landmark(k) {
    return this.memo('l' + k, () => {
      const T = this.T, M = T.landmarks, H = this.H;
      if (!M || H(k, 0, 41) >= M.share) return null;
      const uA = k ? this.shrineU(k) : 0, uB = k + 1 ? this.shrineU(k + 1) : 0, u = (uA + uB) / 2;
      const ru = this.road(u), lo = this.lo(u), hi = this.hi(u), s = hi - ru >= ru - lo ? 1 : -1;
      const d = M.side[0] + (M.side[1] - M.side[0]) * H(k, 0, 43), v = ru + s * d;
      const kind = M.kinds[Math.floor(H(k, 0, 42) * M.kinds.length)];
      const x = this.X(u, v), y = this.Y(u, v);
      let pool = null, R = kind === 'woodcamp' ? 100 : 128;
      if (kind === 'oasis') {
        pool = makeBlob(x, y, 26 + 14 * H(k, 0, 45), 1, 0, 0.15, this.rngOf(k, 0, 46), 1);
        R = pool.ext + 90;
      } else if (kind === 'bones') R = 96;
      // Clear of both faces along its width, and of the start, shrines and crypt doors.
      for (const du of [-R, 0, R]) if (v - this.lo(u + du) < R + 60 || this.hi(u + du) - v < R + 60) return null;
      for (const P of this.spotsNear(u, 600)) if (Math.hypot(P.x - x, P.y - y) < (P.kind === 'shrine' ? 300 : 400)) return null;
      const L = { x, y, i: k, j: 1, kind, props: [], clear: { x, y, r: R } };
      const bx = this.X(u, ru), by = this.Y(u, ru), seed = Math.floor(H(k, 0, 44) * 1e6);
      if (pool) {
        // The footpath comes to the pool's rim on the road's side.
        const a = Math.atan2(by - y, bx - x), e = pool.ext + 8;
        L.path = footpath(bx, by, x + Math.cos(a) * e, y + Math.sin(a) * e, seed, 100);
        L.pool = pool;
      } else L.path = footpath(bx, by, x, y + 30, seed, 140);
      return dress(L, this.rngOf(k, 0, 10), bx, { pool });
    });
  }
  // The patches of cell q along u (quicksand pools, ice sheets): each kept clear of the road, the faces,
  // the places and the landmarks, apart from one another, inside its cell, so no cell needs another's.
  patchCell(q) {
    return this.memo('p' + q, () => {
      const P = this.T.patches, out = [];
      if (!P) return out;
      const C = P.cell, H = this.H, count = P.per[Math.floor(H(q, 0, 51) * P.per.length)];
      for (let n = 0; n < count; n++) {
        const r = this.rngOf(q, n, 52);
        for (let tries = 0; tries < 4; tries++) {
          const R = r.range(P.r[0], P.r[1]), ax = r.range(P.aspect[0], P.aspect[1]), rot = r.range(0, Math.PI);
          const E = R * (1 + P.amp) + 1, ua = q * C + E + 15, ub = (q + 1) * C - E - 15;
          if (ub <= ua) continue;
          const u = r.range(ua, ub), t = r();
          // Its room across, judged along all its width: off the road by its half width and `offRoad`
          // (wobble and all), off the faces by `fromFace`.
          let rMin = Infinity, rMax = -Infinity, lMax = -Infinity, hMin = Infinity;
          for (let du = -E; du <= E; du += E / 3) {
            const rv = this.road(u + du);
            rMin = Math.min(rMin, rv);
            rMax = Math.max(rMax, rv);
            lMax = Math.max(lMax, this.lo(u + du));
            hMin = Math.min(hMin, this.hi(u + du));
          }
          const off = 17.5 + 4 + P.offRoad + E;
          const pa = rMax + off, pb = hMin - P.fromFace - E, ma = lMax + P.fromFace + E, mb = rMin - off;
          const Lp = Math.max(0, pb - pa), Lm = Math.max(0, mb - ma);
          if (Lp + Lm <= 0) continue;
          const v = t * (Lp + Lm) < Lp ? pa + (t * (Lp + Lm)) : ma + (t * (Lp + Lm) - Lp);
          const x = this.X(u, v), y = this.Y(u, v);
          let ok = true;
          for (const S of this.spotsNear(u, 400)) if (Math.hypot(S.x - x, S.y - y) < P.clear + E) ok = false;
          // Off the footpaths up to the crypts and out to the landmarks too, which wander farther from
          // their ends than `clear` keeps: a painted path never leads into a pool.
          for (const k of this.cryptsIn(u - E - 400, u + E + 400)) if (ok && meetsPath(this.cryptPlace(k).path, x, y, E + PATH_GAP)) ok = false;
          for (let k = Math.floor(u / this.T.shrines.every) - 2; ok && k <= Math.floor(u / this.T.shrines.every) + 1; k++) {
            const L = this.landmark(k);
            if (L && (Math.hypot(L.x - x, L.y - y) < Math.max(P.clear, L.clear.r) + E || meetsPath(L.path, x, y, E + PATH_GAP))) ok = false;
          }
          for (const o of out) if (Math.hypot(o.x - x, o.y - y) < o.ext + E + 30) ok = false;
          if (!ok) continue;
          const b = makeBlob(x, y, R, ax, rot, P.amp, r, 1);
          b.key = `p${q},${n}`;
          b.kind = P.kind;
          b.pts = blobOutline(b, 48);
          b.rocks = P.rocks && r() < P.rocks.share ? pondLandmark(b, q, 1000 + n, P.rocks, r) : null;
          out.push(b);
          break;
        }
      }
      return out;
    });
  }
  // The patches whose cells lie within [ua, ub] along u.
  forPatches(ua, ub, fn) {
    if (!this.T.patches) return;
    const C = this.T.patches.cell;
    for (let q = Math.floor(ua / C); q <= Math.floor(ub / C); q++) for (const p of this.patchCell(q)) fn(p);
  }
  // A range's spires (decor, no collision: the hero can't get there), one landmark per RIDGE_BIN of u
  // and range, each spire at a depth into the rock.
  ridge(b, side) {
    return this.memo(`r${b},${side}`, () => {
      const S = this.T.spires;
      if (!S) return null;
      const L = { x: 0, y: 0, i: 100000 + b, j: side, kind: 'ridge', props: [], clear: null };
      const add = adder(L), n = Math.round(RIDGE_BIN / S.every);
      let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
      for (let m = 0; m < n; m++) {
        const id = b * n + m, H = (k) => this.H(id, side, k);
        if (H(71) > 0.62) continue;
        const u = b * RIDGE_BIN + (m + 0.2 + 0.6 * H(74)) * S.every;
        if (side === 0 && this.caves) {
          const k = this.cryptNear(u);
          if (k && Math.abs(this.cryptU(k) - u) < 34) continue; // never over a cave's mouth
        }
        const d = S.depth[0] + (S.depth[1] - S.depth[0]) * H(72), v = side ? this.hi(u) + d : this.lo(u) - d;
        const x = this.X(u, v), y = this.Y(u, v);
        add(S.name[Math.floor(H(73) * S.name.length)], x, y);
        minx = Math.min(minx, x - 30);
        maxx = Math.max(maxx, x + 30);
        miny = Math.min(miny, y - 50);
        maxy = Math.max(maxy, y + 10);
      }
      if (!L.props.length) return null;
      L.x = (minx + maxx) / 2;
      L.y = (miny + maxy) / 2;
      L.clear = { x: L.x, y: L.y, r: 1 };
      L.box = { minx, miny, maxx, maxy };
      return L;
    });
  }

  // ---- The road ----------------------------------------------------------------------------------
  // Road segment k: u in [k*seg - 48, (k+1)*seg + 48] (overlapping its neighbours so paintChunk's
  // search along one path never meets a seam), a point every 4 px of u with darkwood's hand-made
  // wobble, all of it by world u, so two segments agree where they overlap.
  segment(k) {
    let e = this.segs.get(k);
    if (e) return e;
    const seg = this.T.road.seg, m0 = Math.ceil((k * seg - 48) / TSTEP), m1 = Math.floor(((k + 1) * seg + 48) / TSTEP), n = m1 - m0 + 1;
    const xs = new Float64Array(n), ys = new Float64Array(n), hw = new Float32Array(n), av = new Uint8Array(n);
    for (let q = 0; q < n; q++) {
      const u = (m0 + q) * TSTEP, v = this.road(u), du = 8, dv = this.road(u + 4) - this.road(u - 4), l = Math.hypot(du, dv);
      const w = (fbm(u / 170, 3.7, this.s + 29, 2) - 0.5) * 8, nu = -dv / l, nv = du / l;
      xs[q] = this.X(u + nu * w, v + nv * w);
      ys[q] = this.Y(u + nu * w, v + nv * w);
      hw[q] = this.roadHw(u);
      av[q] = fbm(u / 700, 2.9, this.s + 61, 2) > 0.6 ? 1 : 0; // the Sunscorch's palm avenues
    }
    e = pathOf('road', xs, ys, hw, av);
    e.key = 'r' + k;
    this.segs.set(k, e);
    return e;
  }

  // ---- The interface (topology/index.js) -----------------------------------------------------------
  features(bx0, by0, bx1, by1) {
    const ax = this.axis === 'x', u0 = ax ? bx0 : by0, u1 = ax ? bx1 : by1;
    const paths = [], places = [], landmarks = [];
    const near = (x, y, m) => x > bx0 - m && x < bx1 + m && y > by0 - m && y < by1 + m;
    const meets = (p) => p.minx < bx1 && p.maxx > bx0 && p.miny < by1 && p.maxy > by0;
    const seg = this.T.road.seg;
    for (let k = Math.floor((u0 - 48) / seg); k <= Math.floor((u1 + 48) / seg); k++) {
      const e = this.segment(k);
      if (meets(e)) paths.push(e);
    }
    const place = (P) => {
      const n = near(P.x, P.y, 260);
      if (n) places.push(P);
      if (n || meets(P.path)) paths.push(P.path);
    };
    if (u0 < 400 && u1 > -400) place(this.startPlace());
    const S = this.T.shrines.every;
    for (let k = Math.floor((u0 - 900) / S); k <= Math.ceil((u1 + 900) / S); k++) {
      if (k) place(this.shrinePlace(k));
      const L = this.landmark(k);
      if (L && (meets(L.path) || near(L.x, L.y, 200))) {
        landmarks.push(L);
        paths.push(L.path);
      }
    }
    for (const k of this.cryptsIn(u0 - 1500, u1 + 1500)) place(this.cryptPlace(k));
    this.forPatches(u0 - 300, u1 + 300, (p) => {
      if (p.rocks && near(p.x, p.y, p.ext + 60)) landmarks.push(p.rocks);
    });
    for (let b = Math.floor((u0 - 60) / RIDGE_BIN); b <= Math.floor((u1 + 60) / RIDGE_BIN); b++) {
      for (const side of [0, 1]) {
        const L = this.ridge(b, side);
        if (L && L.box.minx < bx1 && L.box.maxx > bx0 && L.box.miny < by1 && L.box.maxy > by0) landmarks.push(L);
      }
    }
    return { paths, places, landmarks };
  }
  shrinesNear(x, y, r) {
    const u = this.U(x, y), S = this.T.shrines.every, out = [];
    for (let k = Math.floor((u - r - 900) / S); k <= Math.ceil((u + r + 900) / S); k++) {
      if (!k) continue;
      const P = this.shrinePlace(k);
      if ((P.x - x) ** 2 + (P.y - y) ** 2 <= r * r) out.push({ key: P.key, x: P.x, y: P.y, type: P.type });
    }
    return out;
  }
  cryptsNear(x, y, r) {
    const u = this.U(x, y), out = [];
    for (const k of this.cryptsIn(u - r - 200, u + r + 200)) {
      const c = this.cryptPlace(k).crypt;
      if ((c.x - x) ** 2 + (c.y - y) ** 2 <= r * r) out.push(c);
    }
    return out;
  }
  patchesNear(x, y, r) {
    const u = this.U(x, y), out = [];
    this.forPatches(u - r - 300, u + r + 300, (p) => {
      if (Math.hypot(p.x - x, p.y - y) <= r + p.ext) out.push(p);
    });
    return out;
  }
  // The oases' water near u (their pools).
  poolsNear(ua, ub) {
    const out = [], S = this.T.shrines.every;
    for (let k = Math.floor(ua / S) - 2; k <= Math.floor(ub / S) + 1; k++) {
      const L = this.landmark(k);
      if (L && L.pool) out.push(L.pool);
    }
    return out;
  }
  // Signed px to the nearest face or water, + where the hero may stand: the very formula terrain()
  // stamps at its lattice points.
  openAt(x, y) {
    const u = this.U(x, y), v = this.V(x, y);
    const sl = (this.lo(u + 4) - this.lo(u - 4)) / 8, sh = (this.hi(u + 4) - this.hi(u - 4)) / 8;
    let o = Math.min((v - this.lo(u)) / Math.sqrt(1 + sl * sl), (this.hi(u) - v) / Math.sqrt(1 + sh * sh));
    for (const p of this.poolsNear(u - 200, u + 200)) o = Math.min(o, -blobSdf(p, x, y, POOL_REACH));
    return clampT(o);
  }
  patchAt(x, y) {
    const u = this.U(x, y);
    let o = -Infinity;
    this.forPatches(u - 300, u + 300, (p) => {
      const v = blobSdf(p, x, y, PATCH_REACH);
      if (v > o) o = v;
    });
    return clampT(o);
  }
  canStand(x, y) {
    return this.openAt(x, y) >= 12 && this.patchAt(x, y) <= -8;
  }
  terrain(cx, cy) {
    const x0 = cx * TCHUNK, y0 = cy * TCHUNK, ax = this.axis === 'x';
    const u0 = ax ? x0 : y0, v0 = ax ? y0 : x0;
    const LO = new Float32Array(TN + 2), HI = new Float32Array(TN + 2);
    let loMax = -Infinity, hiMin = Infinity;
    for (let m = 0; m < TN + 2; m++) {
      const u = u0 + (m - 1) * TSTEP;
      LO[m] = this.lo(u);
      HI[m] = this.hi(u);
      loMax = Math.max(loMax, LO[m]);
      hiMin = Math.min(hiMin, HI[m]);
    }
    const pools = this.poolsNear(u0 - 300, u0 + TCHUNK + 300).filter((p) => blobMeets(p, x0, y0, POOL_REACH));
    let open = null;
    if (v0 - loMax <= TMAX + 2 || hiMin - (v0 + TCHUNK) <= TMAX + 2 || pools.length) {
      open = new Float32Array(TN * TN);
      for (let a = 0; a < TN; a++) {
        const sl = (LO[a + 2] - LO[a]) / 8, sh = (HI[a + 2] - HI[a]) / 8, nl = 1 / Math.sqrt(1 + sl * sl), nh = 1 / Math.sqrt(1 + sh * sh);
        const l = LO[a + 1], h = HI[a + 1];
        for (let b = 0; b < TN; b++) {
          const v = v0 + b * TSTEP, o = Math.min((v - l) * nl, (h - v) * nh);
          open[ax ? b * TN + a : a * TN + b] = o;
        }
      }
      for (const p of pools) {
        const E = p.ext + POOL_REACH;
        const i0 = Math.max(0, Math.ceil((p.x - E - x0) / TSTEP)), i1 = Math.min(TN - 1, Math.floor((p.x + E - x0) / TSTEP));
        const j0 = Math.max(0, Math.ceil((p.y - E - y0) / TSTEP)), j1 = Math.min(TN - 1, Math.floor((p.y + E - y0) / TSTEP));
        for (let j = j0; j <= j1; j++) {
          for (let i = i0; i <= i1; i++) {
            const w = -blobSdf(p, x0 + i * TSTEP, y0 + j * TSTEP, POOL_REACH), c = j * TN + i;
            if (w < open[c]) open[c] = w;
          }
        }
      }
      settle(open, TMAX);
      let deep = true, clear = true;
      for (let c = 0; c < open.length && (deep || clear); c++) {
        if (open[c] > -TMAX) deep = false;
        if (open[c] < TMAX) clear = false;
      }
      if (deep) open = DEEP;
      else if (clear) open = null;
    }
    // The patches overlapping it, and their field.
    const patches = [];
    this.forPatches(u0 - 300, u0 + TCHUNK + 300, (p) => {
      if (blobMeets(p, x0, y0, PATCH_REACH)) patches.push(p);
    });
    let patch = null;
    if (patches.length) {
      patch = fieldOf(-Infinity);
      for (const p of patches) {
        const E = p.ext + PATCH_REACH;
        const i0 = Math.max(0, Math.ceil((p.x - E - x0) / TSTEP)), i1 = Math.min(TN - 1, Math.floor((p.x + E - x0) / TSTEP));
        const j0 = Math.max(0, Math.ceil((p.y - E - y0) / TSTEP)), j1 = Math.min(TN - 1, Math.floor((p.y + E - y0) / TSTEP));
        for (let j = j0; j <= j1; j++) {
          for (let i = i0; i <= i1; i++) {
            const w = blobSdf(p, x0 + i * TSTEP, y0 + j * TSTEP, PATCH_REACH), c = j * TN + i;
            if (w > patch[c]) patch[c] = w;
          }
        }
      }
      if (settle(patch, -TMAX)) patch = null;
    }
    // The road's middle and half width along the chunk (surfaceOf's ROAD).
    const road = new Float32Array(TN), roadHw = new Float32Array(TN);
    for (let a = 0; a < TN; a++) {
      road[a] = this.road(u0 + a * TSTEP);
      roadHw[a] = this.roadHw(u0 + a * TSTEP);
    }
    // The caves whose recess (painted round the door into the cliff) reaches into it.
    const caves = [];
    if (this.caves) {
      for (const k of this.cryptsIn(u0 - 60, u0 + TCHUNK + 60)) {
        const c = this.cryptPlace(k).crypt;
        if (c.x + 26 >= x0 && c.x - 26 <= x0 + TCHUNK && c.y + 4 >= y0 && c.y - 44 <= y0 + TCHUNK) caves.push({ x: c.x, y: c.y });
      }
    }
    return {
      cx, cy, x0, y0, open, patch, deck: null, road, roadHw,
      blocked: this.blocked, patchKind: this.patchKind, patches, bridges: [], pools, caves,
      lava: false, lavaTiles: null, any: !!(open || patch || pools.length || caves.length),
    };
  }
  // Forget what lies farther than KEEP px along u (it comes back the same if needed again).
  trim(x, y) {
    const u = this.U(x, y), seg = this.T.road.seg, S = this.T.shrines.every, C = this.T.patches ? this.T.patches.cell : 0;
    for (const k of this.segs.keys()) if (Math.abs(k * seg - u) > KEEP) this.segs.delete(k);
    // The cache's keys say what each is and its index: c (crypt), s and su (shrine), l (landmark), p
    // (patch cell), r (a ridge's bin).
    for (const key of this.cache.keys()) {
      if (key === 'start') continue;
      const t = key[0], n = parseInt(key.slice(key[1] === 'u' ? 2 : 1), 10);
      const at = t === 'c' ? this.cryptU(n) : t === 'p' ? n * C : t === 'r' ? n * RIDGE_BIN : n * S;
      if (Math.abs(at - u) > KEEP) this.cache.delete(key);
    }
  }
}
