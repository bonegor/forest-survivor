// The Darkwood: an endless night forest, the same in every run. Its map (roads from crossroads
// to crossroads, a shrine at each and a crypt at every second, groves and landmarks between)
// comes from darkwood.js; this turns it into chunks of ground and props, keeps the shrines and
// crypts in play, and lights the night.

import { SPR } from '../engine/sprites.js';
import { makeCanvas, hash2, fbm, rand, lerp, clamp, pick } from '../engine/util.js';
import { PC, P } from './particles.js';
import { CHUNK as CH, TREE_NAMES, layoutChunk, paintChunk, shrinesNear, cryptsNear, start, trimCaches } from './darkwood.js';
import { LANDMARK_SOLIDS, LANDMARK_TALL } from '../art/landmarks.js';

// Half the width of each tree's trunk at its foot.
const TRUNK = { oak1: 3.5, oak2: 3.5, oak3: 3.5, pine1: 2.5, pine2: 2.5, deadtree1: 2.5, deadtree2: 2.5 };
// Shrines come into play within this distance of the hero (the next crossroads down each road)
// and leave it beyond the second; one that has been used stays used.
const SHRINE_NEAR = 2400, SHRINE_FAR = 2800;

// Ambient light over the course of the night (survival progress 0..1).
export const NIGHT = [
  [0, [150, 136, 186]],
  [0.1, [118, 120, 172]],
  [0.5, [102, 110, 164]],
  [0.86, [110, 114, 166]],
  [0.95, [176, 146, 166]],
  [1, [240, 214, 190]],
];

// What steer() returns: the one pair, filled again by the next call.
const HEADING = [0, 0];

// A crypt building's footprint round its door (x, y): w wide, up deep, its front steps px above
// the door's line.
export const CRYPT_BOX = { w: 24, up: 18, steps: 3 };

export class Forest {
  constructor(g, seed) {
    this.g = g;
    this.seed = seed;
    this.chunks = new Map();
    this.dustColor = PC.b;
    this.fog = makeFogTexture(seed);
    this.ffT = 0;
    this.leafT = 0;
    this.start = start();
    this.mapShrines = true; // the spawner leaves the shrines to the map
    this.usedShrines = new Set();
    this.shrineT = 0;
  }

  key(cx, cy) {
    return cx + ',' + cy;
  }

  chunk(cx, cy) {
    const k = this.key(cx, cy);
    let c = this.chunks.get(k);
    if (!c) {
      c = this.generate(cx, cy);
      this.chunks.set(k, c);
    }
    c.used = this.g.frame;
    return c;
  }

  update(dt) {
    const g = this.g, cam = g.cam;
    // Pre-generate one chunk per frame around the view.
    const x0 = Math.floor((cam.x - 160) / CH), x1 = Math.floor((cam.x + cam.W + 160) / CH);
    const y0 = Math.floor((cam.y - 160) / CH), y1 = Math.floor((cam.y + cam.H + 160) / CH);
    let made = 0;
    for (let cy = y0; cy <= y1 && made < 1; cy++) {
      for (let cx = x0; cx <= x1 && made < 1; cx++) {
        if (!this.chunks.has(this.key(cx, cy))) {
          this.chunk(cx, cy);
          made++;
        }
      }
    }
    if (this.chunks.size > 40) {
      const pcx = Math.floor(g.player.x / CH), pcy = Math.floor(g.player.y / CH);
      for (const [k, c] of this.chunks) {
        if (Math.abs(c.cx - pcx) > 3 || Math.abs(c.cy - pcy) > 3) this.chunks.delete(k);
      }
      trimCaches(g.player.x, g.player.y);
    }
    this.shrineT -= dt;
    if (this.shrineT <= 0) {
      this.shrineT = 0.5;
      this.syncShrines();
    }
    // Fireflies and falling leaves: the fireflies hide from the rain (weather.js). The same draws
    // of Math.random whatever the weather.
    const wet = g.weather ? g.weather.now.rain : 0;
    this.ffT -= dt;
    while (this.ffT <= 0) {
      this.ffT += 0.12;
      const x = cam.x + rand(-20, cam.W + 20), y = cam.y + rand(-20, cam.H + 20);
      if (wet > 0 && g.weather.rng() < wet * 0.85) continue;
      g.particles.emit(x, y, rand(4, 20), rand(-8, 8), rand(-8, 8), rand(-3, 3), rand(2, 4), 1, Math.random() < 0.7 ? PC.l : PC.Y, P.GLOW | P.FADE, 0.2);
    }
    this.leafT -= dt;
    if (this.leafT <= 0) {
      this.leafT = rand(0.3, 0.8);
      const x = cam.x + rand(0, cam.W), y = cam.y + rand(-10, cam.H * 0.6);
      g.particles.emit(x, y, 60, rand(10, 25), rand(5, 15), -18, 3.2, 1, pick([PC.d, PC.O, PC.b, PC.y]), P.FADE, 0.1);
    }
  }

  // The shrines at the crossroads near the hero join the game's own list; far ones leave it.
  syncShrines() {
    const g = this.g, p = g.player, have = new Set();
    for (let i = g.shrines.length - 1; i >= 0; i--) {
      const s = g.shrines[i];
      if (!s.key) continue;
      if (s.used) this.usedShrines.add(s.key);
      if (Math.hypot(s.x - p.x, s.y - p.y) > SHRINE_FAR) g.shrines.splice(i, 1);
      else have.add(s.key);
    }
    for (const s of shrinesNear(p.x, p.y, SHRINE_NEAR)) {
      if (have.has(s.key)) continue;
      g.shrines.push({ x: s.x, y: s.y, type: s.type, used: this.usedShrines.has(s.key), t: hash2(Math.round(s.x), Math.round(s.y), 7) * 6, spr: SPR.shrine, shrine: true, key: s.key });
    }
    // Crypt doors the same way; the game remembers which ones it has cleared, and which the
    // hero fainted in (both shut for good).
    const doors = new Set();
    for (let i = g.crypts.length - 1; i >= 0; i--) {
      const d = g.crypts[i];
      if (Math.hypot(d.x - p.x, d.y - p.y) > SHRINE_FAR) g.crypts.splice(i, 1);
      else doors.add(d.key);
    }
    for (const d of cryptsNear(p.x, p.y, SHRINE_NEAR)) {
      if (!doors.has(d.key)) g.crypts.push({ ...d, sealed: g.cleared.has(d.key) || g.lost.has(d.key), t: hash2(d.x, d.y, 9) * 6, spr: SPR.crypt, crypt: true });
    }
  }

  layout(cx, cy) {
    return layoutChunk(cx, cy);
  }

  generate(cx, cy) {
    const c = makeCanvas(CH, CH);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(CH, CH);
    const lay = this.layout(cx, cy);
    // Headless, the layout (trees, props, colliders) is all that matters.
    if (!this.g.headless) {
      paintChunk(lay, new Uint32Array(img.data.buffer));
      ctx.putImageData(img, 0, 0);
    }
    const props = [], trunks = [];
    for (const q of lay.props) {
      const spr = SPR[q.n];
      if (!spr) continue;
      const tree = TREE_NAMES.has(q.n);
      const p = { spr, x: q.x, y: q.y, frame: 0, anim: q.anim || 0, light: q.light || null, tree: tree || LANDMARK_TALL.has(q.n), t: hash2(q.x, q.y, 11) * 10, solid: 0, trunk: tree ? TRUNK[q.n] : 0 };
      props.push(p);
      if (p.trunk) trunks.push(p);
      // A landmark's solid parts (its posts, its stone) stop the hero as trunks do.
      for (const [dx, dy, r] of LANDMARK_SOLIDS[q.n] || []) trunks.push({ x: q.x + dx, y: q.y + dy, trunk: r });
    }
    return { cx, cy, canvas: c, props, trunks, used: 0 };
  }

  forEachVisible(cam, margin, fn) {
    const x0 = Math.floor((cam.x - margin) / CH), x1 = Math.floor((cam.x + cam.W + margin) / CH);
    const y0 = Math.floor((cam.y - margin) / CH), y1 = Math.floor((cam.y + cam.H + margin) / CH);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) fn(this.chunk(cx, cy));
  }

  drawGround(ctx, cam) {
    const S = cam.S;
    this.forEachVisible(cam, 0, (c) => {
      const x0 = Math.round((c.cx * CH - cam.x) * S), x1 = Math.round(((c.cx + 1) * CH - cam.x) * S);
      const y0 = Math.round((c.cy * CH - cam.y) * S), y1 = Math.round(((c.cy + 1) * CH - cam.y) * S);
      ctx.drawImage(c.canvas, x0, y0, x1 - x0, y1 - y0);
    });
  }

  // Adds y-sortable props within view to `list`.
  collectProps(cam, list) {
    this.forEachVisible(cam, 60, (c) => {
      for (const p of c.props) {
        const w = p.spr.w, h = p.spr.h;
        if (p.x + w < cam.x || p.x - w > cam.x + cam.W || p.y - h > cam.y + cam.H || p.y < cam.y - 8) continue;
        list.push(p);
      }
    });
  }

  drawProp(ctx, cam, p, time) {
    const S = cam.S;
    const fr = p.anim ? p.spr.frames[Math.floor(time * p.anim + p.t) % p.spr.frames.length] : p.spr.frames[0];
    const img = fr.c;
    const w = img.width * S, h = img.height * S;
    const X = Math.round((p.x - cam.x) * S - w / 2), Y = Math.round((p.y - cam.y) * S - h + S);
    let alpha = 1;
    if (p.tree) {
      // Fade canopies that hide the hero.
      const pl = this.g.player;
      if (pl.y < p.y - 2 && pl.y > p.y - img.height + 4 && Math.abs(pl.x - p.x) < img.width / 2) alpha = 0.45;
    }
    if (alpha < 1) ctx.globalAlpha = alpha;
    ctx.drawImage(img, X, Y, w, h);
    if (alpha < 1) ctx.globalAlpha = 1;
    p._rect = [X, Y, w, h, fr];
  }

  drawPropEmissive(ctx, p) {
    if (!p._rect) return;
    const [X, Y, w, h, fr] = p._rect;
    if (fr.em) ctx.drawImage(fr.em, X, Y, w, h);
  }

  addLights(g) {
    const t = g.time;
    this.forEachVisible(g.cam, 120, (c) => {
      for (const p of c.props) {
        if (!p.light) continue;
        const flick = p.light[0] === 'fire' ? 0.85 + 0.15 * Math.sin(t * 13 + p.t) * Math.sin(t * 7.3 + p.t * 2) : 1;
        g.light(p.x, p.y - 6, p.light[1] * flick, p.light[0], p.light[0] === 'cyan' ? 0.55 : 1);
      }
    });
  }

  ambient() {
    const g = this.g;
    // Ranked has no dawn: the night deepens over 12 minutes and stays.
    const u = g.mode === 'ranked' ? clamp(g.time / 900, 0, 0.86) : clamp(g.time / g.duration, 0, 1);
    let i = 0;
    while (i < NIGHT.length - 2 && NIGHT[i + 1][0] < u) i++;
    const [t0, c0] = NIGHT[i], [t1, c1] = NIGHT[i + 1];
    const k = clamp((u - t0) / (t1 - t0), 0, 1);
    let c = [lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k)];
    if (g.mode === 'ranked' && g.phase > 30) {
      // A blood moon rises as the endless night turns lethal.
      const r = clamp((g.phase - 30) / 15, 0, 1) * 0.45;
      c = [lerp(c[0], 170, r), lerp(c[1], 70, r), lerp(c[2], 90, r)];
    }
    if (g.weather) c = g.weather.tint(c);
    if (g.dawn > 0) {
      const d = clamp(g.dawn, 0, 1);
      c = [lerp(c[0], 255, d), lerp(c[1], 244, d), lerp(c[2], 228, d)];
    }
    return c;
  }

  drawOverlay(ctx, cam, time) {
    // Two drifting fog layers, drifting east as the leaves fall.
    const S = cam.S;
    const fog = this.fog;
    const scale = S * 3;
    const tw = fog.width * scale, th = fog.height * scale;
    for (let layer = 0; layer < 2; layer++) {
      const ox = -((((cam.x * (layer ? 1.15 : 0.85) - time * (layer ? 6 : 3.5)) * S) % tw + tw) % tw) - tw;
      const oy = -(((cam.y * (layer ? 1.15 : 0.85) + time * (layer ? 1.5 : 0.8)) * S) % th) - th;
      ctx.globalAlpha = layer ? 0.06 : 0.09;
      for (let y = oy; y < cam.pxH; y += th) for (let x = ox; x < cam.pxW; x += tw) ctx.drawImage(fog, x, y, tw, th);
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------- world interface --

  solid() {
    return false;
  }

  // Tree trunks stop the hero, who slides around them. Monsters and minions walk straight
  // through, so the horde never snags on the woods (the user's rule: monsters bump into
  // nothing). A trunk is a squat ellipse at the foot of its tree, as the ground is seen at an
  // angle.
  collide(e) {
    if (e !== this.g.player) return;
    // A crypt's walls: only its steps, below its door, can be stood on (Game's door check).
    for (const d of this.g.crypts) {
      const dx = e.x - d.x, dy = e.y - (d.y - CRYPT_BOX.up / 2 - CRYPT_BOX.steps);
      const px = CRYPT_BOX.w / 2 + 3 - Math.abs(dx), py = CRYPT_BOX.up / 2 - Math.abs(dy);
      if (px <= 0 || py <= 0) continue;
      if (px < py) e.x += Math.sign(dx || 1) * px;
      else e.y += Math.sign(dy || 1) * py;
    }
    this.trunksNear(e.x, e.y, (p) => {
      const rx = p.trunk + (e.r || 5), ry = rx * 0.65;
      // In units where the ellipse is a circle of radius rx.
      const dx = e.x - p.x, dy = ((e.y - p.y) * rx) / ry;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rx * rx) return;
      const d = Math.sqrt(d2);
      const nx = d > 1e-3 ? dx / d : 0, ny = d > 1e-3 ? dy / d : 1;
      // Walking dead straight at the trunk: creep round it rather than stick
      // forever, to the side the hero leans to (in front of the tree when dead on).
      const vx = e.vx || 0, vy = ((e.vy || 0) * rx) / ry, v = Math.hypot(vx, vy);
      const along = nx * vy - ny * vx;
      const side = Math.abs(along) > 0.02 * v ? Math.sign(along) : nx < 0 ? -1 : 1;
      const slip = v > 1 && nx * vx + ny * vy < -0.99 * v ? 0.03 * side : 0;
      const tx = nx - ny * slip, ty = ny + nx * slip, tl = Math.hypot(tx, ty);
      e.x = p.x + (tx / tl) * rx;
      e.y = p.y + ((ty / tl) * rx * ry) / rx;
    });
  }

  // Whether a body of radius r could stand at (x, y): off every trunk and landmark post (as
  // collide shapes them) and out of every crypt's walls. What a leap tests its way by (weapons.js LEAP).
  open(x, y, r = 5) {
    for (const d of this.g.crypts) {
      const dx = x - d.x, dy = y - (d.y - CRYPT_BOX.up / 2 - CRYPT_BOX.steps);
      if (Math.abs(dx) < CRYPT_BOX.w / 2 + 3 && Math.abs(dy) < CRYPT_BOX.up / 2) return false;
    }
    let free = true;
    this.trunksNear(x, y, (t) => {
      const rx = t.trunk + r, ry = rx * 0.65;
      if ((x - t.x) ** 2 + (((y - t.y) * rx) / ry) ** 2 < rx * rx) free = false;
    });
    return free;
  }

  // Whether a tree stands within R px of (x, y) (the Druid's Grove Warden): a tree's foot, not a
  // landmark's post.
  treeNear(x, y, R) {
    let near = false;
    this.trunksNear(x, y, (t) => {
      if (t.spr && (x - t.x) ** 2 + (y - t.y) ** 2 <= R * R) near = true;
    }, R);
    return near;
  }

  // fn(trunk) for every trunk and landmark post in the chunks within m px of (x, y). 36 px round
  // by default: a landmark's posts may stand up to 24 px from the foot that places it in its chunk.
  trunksNear(x, y, fn, m = 36) {
    const x0 = Math.floor((x - m) / CH), x1 = Math.floor((x + m) / CH);
    const y0 = Math.floor((y - m) / CH), y1 = Math.floor((y + m) / CH);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) for (const t of this.chunk(cx, cy).trunks) fn(t);
  }

  lineOfSight() {
    return true;
  }

  // Monster e's heading toward target, [dx, dy], straight at it out here. The returned pair is
  // reused by the next call: read it at once, don't keep it.
  steer(e, target) {
    const dx = target.x - e.x, dy = target.y - e.y;
    const l = Math.hypot(dx, dy) || 1;
    HEADING[0] = dx / l;
    HEADING[1] = dy / l;
    return HEADING;
  }

  freeSpot(x, y) {
    return { x, y };
  }

  spawnPoint(g, margin = 22) {
    const cam = g.cam, p = g.player;
    const x0 = cam.x - margin, y0 = cam.y - margin, w = cam.W + margin * 2, h = cam.H + margin * 2;
    // Favour the direction of travel a little.
    if (Math.hypot(p.vx, p.vy) > 20 && Math.random() < 0.35) {
      const a = Math.atan2(p.vy, p.vx) + rand(-0.8, 0.8);
      const R = Math.hypot(w, h) / 2;
      return { x: p.x + Math.cos(a) * R, y: p.y + Math.sin(a) * R };
    }
    let t = rand(2 * (w + h));
    if (t < w) return { x: x0 + t, y: y0 };
    t -= w;
    if (t < h) return { x: x0 + w, y: y0 + t };
    t -= h;
    if (t < w) return { x: x0 + w - t, y: y0 + h };
    t -= w;
    return { x: x0, y: y0 + h - t };
  }

  // Enemies left far behind: the steady horde's are let go, what was sent at the hero is moved
  // back into play (Game.relocate).
  tooFar(e, cam) {
    const p = this.g.player;
    const lim = Math.max(cam.W, cam.H) * 0.85;
    return Math.abs(e.x - p.x) > lim || Math.abs(e.y - p.y) > lim;
  }
}

function makeFogTexture(seed) {
  const N = 96;
  const c = makeCanvas(N, N);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // Tileable: blend noise sampled at wrapped coordinates.
      const u = x / N, v = y / N;
      const n = (a, b) => fbm(a * 6, b * 6, seed + 500, 3);
      const val = n(u, v) * (1 - u) * (1 - v) + n(u - 1, v) * u * (1 - v) + n(u, v - 1) * (1 - u) * v + n(u - 1, v - 1) * u * v;
      const a = clamp((val - 0.42) * 3, 0, 1);
      const i = (y * N + x) * 4;
      img.data[i] = 200;
      img.data[i + 1] = 210;
      img.data[i + 2] = 240;
      img.data[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
