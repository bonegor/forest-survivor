// The Darkwood: an endless, procedurally generated night forest.

import { SPR } from '../engine/sprites.js';
import { makeCanvas, mulberry32, hash2, fbm, valueNoise, rand, TAU, lerp, clamp, hexToRgb, pick } from '../engine/util.js';
import { PC, P } from './particles.js';
import { glow } from './fxsprites.js';

const CH = 256; // chunk size in world pixels
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);

const rgbPack = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
};
const GRASS = ['#1b3426', '#20402d', '#264a32', '#2c5437', '#335f3d'].map(rgbPack);
const DIRT = ['#2e2522', '#3a2e28', '#463629', '#53412f'].map(rgbPack);
const TUFT = ['#3a6a44', '#4a7d4e', '#2f5a3a'].map(rgbPack);
const LEAF = ['#7a4a2a', '#8f5a2e', '#5e3a24', '#a0642c'].map(rgbPack);
const FLOWER = ['#e8e8d0', '#feae34', '#f6757a', '#8fb8ff', '#c49bd9'].map(rgbPack);
const PEBBLE = ['#5a6988', '#3a4466', '#8b9bb4'].map(rgbPack);

// Ambient light over the course of the night (survival progress 0..1).
const NIGHT = [
  [0, [150, 136, 186]],
  [0.1, [118, 120, 172]],
  [0.5, [102, 110, 164]],
  [0.86, [110, 114, 166]],
  [0.95, [176, 146, 166]],
  [1, [240, 214, 190]],
];

export class Forest {
  constructor(g, seed) {
    this.g = g;
    this.seed = seed;
    this.chunks = new Map();
    this.dustColor = PC.b;
    this.fog = makeFogTexture(seed);
    this.ffT = 0;
    this.leafT = 0;
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
    }
    // Fireflies and falling leaves.
    this.ffT -= dt;
    while (this.ffT <= 0) {
      this.ffT += 0.12;
      const x = cam.x + rand(-20, cam.W + 20), y = cam.y + rand(-20, cam.H + 20);
      g.particles.emit(x, y, rand(4, 20), rand(-8, 8), rand(-8, 8), rand(-3, 3), rand(2, 4), 1, Math.random() < 0.7 ? PC.l : PC.Y, P.GLOW | P.FADE, 0.2);
    }
    this.leafT -= dt;
    if (this.leafT <= 0) {
      this.leafT = rand(0.3, 0.8);
      const x = cam.x + rand(0, cam.W), y = cam.y + rand(-10, cam.H * 0.6);
      g.particles.emit(x, y, 60, rand(10, 25), rand(5, 15), -18, 3.2, 1, pick([PC.d, PC.O, PC.b, PC.y]), P.FADE, 0.1);
    }
  }

  generate(cx, cy) {
    const seed = this.seed;
    const c = makeCanvas(CH, CH);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(CH, CH);
    const px = new Uint32Array(img.data.buffer);
    const wx0 = cx * CH, wy0 = cy * CH;

    // Low-frequency fields sampled every 8px and interpolated.
    const N = CH / 8 + 1;
    const patch = new Float32Array(N * N), path = new Float32Array(N * N);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const wx = wx0 + i * 8, wy = wy0 + j * 8;
        patch[j * N + i] = fbm(wx / 110, wy / 110, seed, 3);
        const r = fbm(wx / 260, wy / 260, seed + 77, 3);
        path[j * N + i] = 1 - Math.abs(r * 2 - 1);
      }
    }
    const sample = (f, x, y) => {
      const fx = x / 8, fy = y / 8;
      const i = Math.floor(fx), j = Math.floor(fy);
      const tx = fx - i, ty = fy - j;
      const a = f[j * N + i], b = f[j * N + i + 1], c2 = f[(j + 1) * N + i], d = f[(j + 1) * N + i + 1];
      return (a + (b - a) * tx) * (1 - ty) + (c2 + (d - c2) * tx) * ty;
    };
    for (let y = 0; y < CH; y++) {
      for (let x = 0; x < CH; x++) {
        const b = BAYER[(y & 3) * 4 + (x & 3)];
        const pv = sample(path, x, y);
        const n = hash2(wx0 + x, wy0 + y, seed) - 0.5;
        if (pv > 0.925 + b * 0.02) {
          const t = clamp((pv - 0.925) / 0.06 + b * 0.6 + n * 0.3, 0, 0.999);
          px[y * CH + x] = DIRT[Math.floor(t * DIRT.length)];
        } else {
          const t = clamp(sample(patch, x, y) * 1.25 - 0.12 + b * 0.22 + n * 0.12, 0, 0.999);
          px[y * CH + x] = GRASS[Math.floor(t * GRASS.length)];
        }
      }
    }

    const rng = mulberry32((hash2(cx, cy, seed) * 4294967296) >>> 0);
    const put = (x, y, col) => {
      if (x >= 0 && y >= 0 && x < CH && y < CH) px[y * CH + x] = col;
    };
    const isGrass = (x, y) => GRASS.includes(px[y * CH + x]);
    // Grass tufts.
    for (let i = 0; i < 320; i++) {
      const x = rng.int(1, CH - 4), y = rng.int(2, CH - 2);
      if (!isGrass(x, y)) continue;
      const col = rng.pick(TUFT);
      put(x, y, col);
      put(x, y - 1, col);
      put(x + 2, y, col);
      put(x + 2, y - 1, TUFT[1]);
      put(x + 1, y + 1, TUFT[2]);
      if (rng() < 0.4) put(x + 1, y - 2, TUFT[1]);
    }
    // Fallen leaves.
    for (let i = 0; i < 70; i++) {
      const x = rng.int(0, CH - 2), y = rng.int(0, CH - 2);
      const col = rng.pick(LEAF);
      put(x, y, col);
      if (rng() < 0.5) put(x + 1, y, col);
    }
    // Flowers.
    for (let i = 0; i < 26; i++) {
      const x = rng.int(1, CH - 2), y = rng.int(1, CH - 3);
      if (!isGrass(x, y)) continue;
      const col = rng.pick(FLOWER);
      put(x, y, col);
      put(x, y + 1, TUFT[2]);
      if (rng() < 0.3) {
        put(x + 2, y + 1, col);
        put(x + 2, y + 2, TUFT[2]);
      }
    }
    // Pebbles.
    for (let i = 0; i < 26; i++) {
      const x = rng.int(0, CH - 3), y = rng.int(0, CH - 2);
      put(x, y, PEBBLE[2]);
      put(x + 1, y, PEBBLE[0]);
      put(x, y + 1, PEBBLE[1]);
      put(x + 1, y + 1, PEBBLE[1]);
    }
    ctx.putImageData(img, 0, 0);

    return { cx, cy, canvas: c, props: this.placeProps(cx, cy, rng), used: 0 };
  }

  placeProps(cx, cy, rng) {
    const props = [];
    const wx0 = cx * CH, wy0 = cy * CH;
    const seed = this.seed;
    const clearOrigin = (x, y, r = 90) => x * x + y * y < r * r;
    const add = (name, x, y, extra = {}) => {
      const spr = SPR[name];
      if (!spr) return;
      props.push({ spr, x, y, frame: 0, anim: extra.anim || 0, light: extra.light || null, tree: !!extra.tree, t: rng() * 10, solid: extra.solid || 0 });
    };

    // Landmark?
    let landmark = null;
    if (rng() < 0.16 && !(cx === 0 && cy === 0) && !(cx === -1 && cy === -1) && !(cx === -1 && cy === 0) && !(cx === 0 && cy === -1)) {
      landmark = { x: wx0 + rng.range(70, CH - 70), y: wy0 + rng.range(70, CH - 70), kind: rng.pick(['graveyard', 'ruins', 'circle', 'camp', 'graveyard']) };
      const L = landmark;
      if (L.kind === 'graveyard') {
        for (let i = 0; i < rng.int(5, 9); i++) {
          add(rng() < 0.6 ? 'gravestone' : 'gravecross', L.x + rng.range(-46, 46), L.y + rng.range(-34, 34));
        }
        add(rng() < 0.5 ? 'deadtree1' : 'deadtree2', L.x + rng.range(-50, 50), L.y - 40, { tree: true });
        add('lantern', L.x + rng.range(-20, 20), L.y + 40, { light: ['warm', 60] });
      } else if (L.kind === 'ruins') {
        for (let i = 0; i < rng.int(3, 6); i++) {
          const a = (i / 6) * TAU + rng.range(-0.3, 0.3);
          add(rng() < 0.5 ? 'ruinpillar' : 'brokenpillar', L.x + Math.cos(a) * 44, L.y + Math.sin(a) * 30);
        }
        add('rubble', L.x + rng.range(-20, 20), L.y + rng.range(-10, 10));
        add('rubble', L.x + rng.range(-30, 30), L.y + rng.range(-20, 20));
      } else if (L.kind === 'circle') {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * TAU;
          add('menhir', L.x + Math.cos(a) * 48, L.y + Math.sin(a) * 36, { light: ['cyan', 34] });
        }
        add('campfire', L.x, L.y, { anim: 8, light: ['fire', 110] });
      } else {
        add('campfire', L.x, L.y, { anim: 8, light: ['fire', 110] });
        add('log', L.x - 22, L.y - 10);
        add('log', L.x + 20, L.y + 12);
        add('stump', L.x + 14, L.y - 16);
      }
    }
    const nearLandmark = (x, y, r = 80) => landmark && (x - landmark.x) ** 2 + (y - landmark.y) ** 2 < r * r;

    // Trees on a jittered grid, denser in thickets.
    for (let gy = 0; gy < CH; gy += 38) {
      for (let gx = 0; gx < CH; gx += 38) {
        const x = wx0 + gx + rng.range(4, 34), y = wy0 + gy + rng.range(4, 34);
        const dens = fbm(x / 320, y / 320, seed + 9, 2);
        if (rng() > Math.pow(dens, 1.8) * 0.7) continue;
        if (clearOrigin(x, y, 110) || nearLandmark(x, y)) continue;
        const cursed = valueNoise(x / 500, y / 500, seed + 3) > 0.68;
        const r = rng();
        const name = cursed && r < 0.5 ? rng.pick(['deadtree1', 'deadtree2']) : r < 0.42 ? rng.pick(['pine1', 'pine2']) : rng.pick(['oak1', 'oak2', 'oak3']);
        add(name, x, y, { tree: true });
      }
    }
    // Undergrowth.
    for (let i = 0; i < 26; i++) {
      const x = wx0 + rng.range(0, CH), y = wy0 + rng.range(0, CH);
      if (clearOrigin(x, y, 60) || nearLandmark(x, y, 50)) continue;
      const r = rng();
      if (r < 0.35) add(rng.pick(['bush1', 'bush2']), x, y);
      else if (r < 0.55) add(rng.pick(['rock1', 'rock3']), x, y);
      else if (r < 0.62) add('rock2', x, y);
      else if (r < 0.72) add('mushrooms', x, y, { light: ['cyan', 26] });
      else if (r < 0.8) add('redcaps', x, y);
      else if (r < 0.86) add('stump', x, y);
      else if (r < 0.9) add('log', x, y);
    }
    return props;
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
    const u = clamp(g.time / g.duration, 0, 1);
    let i = 0;
    while (i < NIGHT.length - 2 && NIGHT[i + 1][0] < u) i++;
    const [t0, c0] = NIGHT[i], [t1, c1] = NIGHT[i + 1];
    const k = clamp((u - t0) / (t1 - t0), 0, 1);
    let c = [lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k)];
    if (g.dawn > 0) {
      const d = clamp(g.dawn, 0, 1);
      c = [lerp(c[0], 255, d), lerp(c[1], 244, d), lerp(c[2], 228, d)];
    }
    return c;
  }

  drawOverlay(ctx, cam, time) {
    // Two drifting fog layers.
    const S = cam.S;
    const fog = this.fog;
    const scale = S * 3;
    const tw = fog.width * scale, th = fog.height * scale;
    for (let layer = 0; layer < 2; layer++) {
      const ox = -(((cam.x * (layer ? 1.15 : 0.85) + time * (layer ? 6 : 3.5)) * S) % tw) - tw;
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

  collide() {}

  lineOfSight() {
    return true;
  }

  steer(e, target) {
    const dx = target.x - e.x, dy = target.y - e.y;
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
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

  // Enemies left far behind are moved back into play.
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

export { glow };
