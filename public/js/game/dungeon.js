// Dungeon floors: generated rooms and corridors, baked pixel-art tiles,
// collision, a BFS flow field so the horde can path around walls, fog of war,
// a minimap, and the guardian whose death opens the stairs down.

import { SPR } from '../engine/sprites.js';
import { drawText } from '../engine/font.js';
import { makeCanvas, mulberry32, hexToRgb, clamp, rand, TAU, pick } from '../engine/util.js';
import { FLOORS } from '../data/waves.js';
import { PC, P } from './particles.js';
import { glow } from './fxsprites.js';

const T = 16;
const FLOOR = 0, WALL = 1, LAVA = 2, PROP = 3;

const THEMES = {
  crypt: {
    floor: ['#2d3453', '#343c5e', '#3b4468', '#434d73'],
    mortar: '#1c1f33',
    face: ['#4a5579', '#3e4868', '#333b58', '#283049'],
    faceMortar: '#1b1d30',
    top: ['#141221', '#181528'],
    rim: '#4a5579',
    accent: ['#2f6a3e', '#3e8948'],
    ambient: [70, 70, 104],
    dust: PC.N,
  },
  catacombs: {
    floor: ['#3a2f36', '#44373e', '#4e4048', '#584951'],
    mortar: '#1f171e',
    face: ['#6b5a5c', '#5c4c50', '#4d3f44', '#3e3238'],
    faceMortar: '#1f171e',
    top: ['#130e13', '#1a1319'],
    rim: '#6b5a5c',
    accent: ['#ead4aa', '#c0b090'],
    ambient: [74, 62, 70],
    dust: PC.a,
  },
  inferno: {
    floor: ['#2e1a20', '#3a2027', '#46262e', '#522c34'],
    mortar: '#140b0f',
    face: ['#5e2b2b', '#4f2424', '#401d1f', '#321719'],
    faceMortar: '#140b0f',
    top: ['#0f0809', '#160b0d'],
    rim: '#7a3530',
    accent: ['#f77622', '#feae34'],
    ambient: [92, 52, 50],
    dust: PC.m,
  },
};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
const pack = (hex, a = 255) => {
  const [r, g, b] = hexToRgb(hex);
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
};

export class Dungeon {
  constructor(g, floor, seed) {
    this.g = g;
    this.floor = floor;
    this.info = FLOORS[floor - 1];
    this.theme = THEMES[this.info.theme];
    this.dustColor = this.theme.dust;
    this.rng = mulberry32(seed);
    this.props = [];
    this.torches = [];
    this.lavaSpots = [];
    this.stairs = null;
    // The guardian is sealed until enough blood is spilled on this floor.
    this.sealGoal = [900, 1400, 1900][floor - 1];
    this.sealTime = [4, 4.5, 5][floor - 1] * 60; // and enough time to grow stronger
    this.sealStart = g.kills;
    this.sealed = true;
    this.huntT = 0;
    this.flowT = 0;
    this.seenT = 0;
    this.lastPT = -1;
    this.generate();
    this.bake();
    g.world = this;
    this.populate();
  }

  // ------------------------------------------------------------- layout --

  generate() {
    const rng = this.rng;
    const W = (this.W = 76), H = (this.H = 64);
    const grid = (this.grid = new Uint8Array(W * H).fill(WALL));
    const rooms = (this.rooms = []);
    for (let tries = 0; tries < 600 && rooms.length < 15; tries++) {
      const w = rng.int(9, 17), h = rng.int(8, 13);
      const x = rng.int(2, W - w - 3), y = rng.int(3, H - h - 3);
      const r = { x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) };
      if (rooms.some((o) => x < o.x + o.w + 3 && x + w + 3 > o.x && y < o.y + o.h + 3 && y + h + 3 > o.y)) continue;
      rooms.push(r);
    }
    const carve = (x, y) => {
      if (x > 0 && y > 1 && x < W - 1 && y < H - 1) grid[y * W + x] = FLOOR;
    };
    for (const r of rooms) {
      const round = r.w >= 12 && r.h >= 10 && rng() < 0.3;
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          if (round) {
            const dx = (x + 0.5 - (r.x + r.w / 2)) / (r.w / 2), dy = (y + 0.5 - (r.y + r.h / 2)) / (r.h / 2);
            if (dx * dx + dy * dy > 1.08) continue;
          }
          carve(x, y);
        }
      }
      r.round = round;
    }
    // Minimum spanning tree over room centres, plus a few loops.
    const edges = [];
    const inTree = new Set([0]);
    while (inTree.size < rooms.length) {
      let best = null;
      for (const i of inTree) {
        for (let j = 0; j < rooms.length; j++) {
          if (inTree.has(j)) continue;
          const d = Math.hypot(rooms[i].cx - rooms[j].cx, rooms[i].cy - rooms[j].cy);
          if (!best || d < best[2]) best = [i, j, d];
        }
      }
      inTree.add(best[1]);
      edges.push(best);
    }
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const d = Math.hypot(rooms[i].cx - rooms[j].cx, rooms[i].cy - rooms[j].cy);
        if (d < 22 && rng() < 0.18 && !edges.some((e) => (e[0] === i && e[1] === j) || (e[0] === j && e[1] === i))) edges.push([i, j, d]);
      }
    }
    for (const [i, j] of edges) {
      const a = rooms[i], b = rooms[j];
      const horizFirst = rng() < 0.5;
      const corridor = (x0, y0, x1, y1) => {
        const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
        let x = x0, y = y0;
        while (x !== x1 || y !== y1) {
          for (let k = -1; k <= 1; k++) {
            if (dx) carve(x, y + k);
            else carve(x + k, y);
          }
          if (x !== x1) x += dx;
          else y += dy;
        }
        for (let k = -1; k <= 1; k++) for (let m = -1; m <= 1; m++) carve(x1 + k, y1 + m);
      };
      if (horizFirst) {
        corridor(a.cx, a.cy, b.cx, a.cy);
        corridor(b.cx, a.cy, b.cx, b.cy);
      } else {
        corridor(a.cx, a.cy, a.cx, b.cy);
        corridor(a.cx, b.cy, b.cx, b.cy);
      }
    }
    // Start in the room nearest a corner; the guardian waits in the room
    // furthest away by walking distance.
    let start = rooms[0];
    for (const r of rooms) if (r.cx + r.cy < start.cx + start.cy) start = r;
    this.startRoom = start;
    const dist = this.bfs(start.cx, start.cy);
    let far = start;
    for (const r of rooms) if (dist[r.cy * W + r.cx] > dist[far.cy * W + far.cx]) far = r;
    this.guardRoom = far;
    this.start = { x: start.cx * T + T / 2, y: start.cy * T + T / 2 };
    // Pillars in big rooms, lava pools on the last floor.
    for (const r of rooms) {
      if (r === start || r === far) continue;
      if (r.w >= 13 && r.h >= 10 && !r.round && rng() < 0.55) {
        for (const [px, py] of [[r.x + 3, r.y + 3], [r.x + r.w - 4, r.y + 3], [r.x + 3, r.y + r.h - 3], [r.x + r.w - 4, r.y + r.h - 3]]) {
          grid[py * W + px] = PROP;
          this.props.push({ spr: SPR.pillar, x: px * T + T / 2, y: py * T + T + 1, anim: 0, t: 0 });
        }
      }
      if (this.info.theme === 'inferno' && r.w >= 11 && r.h >= 9 && rng() < 0.6) {
        const lx = r.cx + rng.int(-2, 1), ly = r.cy + rng.int(-1, 1);
        for (let y = ly - 1; y <= ly + 1; y++) for (let x = lx - 2; x <= lx + 2; x++) if (rng() < 0.85) grid[y * W + x] = LAVA;
      }
    }
  }

  bfs(sx, sy, out) {
    const { W, H, grid } = this;
    const dist = out || new Int16Array(W * H);
    dist.fill(-1);
    const q = this.queue || (this.queue = new Int32Array(W * H));
    let head = 0, tail = 0;
    const s = sy * W + sx;
    if (grid[s] !== FLOOR) return dist;
    dist[s] = 0;
    q[tail++] = s;
    while (head < tail) {
      const c = q[head++];
      const cx = c % W, cy = (c / W) | 0;
      const d = dist[c] + 1;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const n = ny * W + nx;
          if (dist[n] !== -1 || grid[n] !== FLOOR) continue;
          if (dx && dy && (grid[cy * W + nx] !== FLOOR || grid[ny * W + cx] !== FLOOR)) continue;
          dist[n] = d;
          q[tail++] = n;
        }
      }
    }
    return dist;
  }

  // -------------------------------------------------------------- bake --

  tile(x, y) {
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return WALL;
    return this.grid[y * this.W + x];
  }

  isWall(x, y) {
    return this.tile(x, y) === WALL;
  }

  bake() {
    const { W, H, theme } = this;
    const rng = mulberry32(this.floor * 1013 + 7);
    const pw = W * T, ph = H * T;
    const c = (this.canvas = makeCanvas(pw, ph));
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(pw, ph);
    const px = new Uint32Array(img.data.buffer);
    const em = (this.emissive = makeCanvas(pw, ph));
    const ectx = em.getContext('2d');
    const eimg = ectx.createImageData(pw, ph);
    const epx = new Uint32Array(eimg.data.buffer);
    const F = theme.floor.map((h) => pack(h)), FM = pack(theme.mortar);
    const FACE = theme.face.map((h) => pack(h)), FACEM = pack(theme.faceMortar);
    const TOP = theme.top.map((h) => pack(h)), RIM = pack(theme.rim);
    const LAVA_C = ['#be4a2f', '#f77622', '#feae34', '#fee761'].map((h) => pack(h));
    const set = (x, y, col) => {
      if (x >= 0 && y >= 0 && x < pw && y < ph) px[y * pw + x] = col;
    };
    const hash = (x, y) => {
      let h = (x * 374761393 + y * 668265263 + this.floor * 2147483647) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };

    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const t = this.tile(tx, ty);
        const ox = tx * T, oy = ty * T;
        if (t === WALL) {
          // Dark wall top with a light rim where it meets the floor.
          for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) set(ox + x, oy + y, TOP[hash(ox + x, oy + y) < 0.15 ? 1 : 0]);
          const fl = (x, y) => this.tile(x, y) !== WALL;
          if (fl(tx - 1, ty)) for (let y = 0; y < T; y++) set(ox, oy + y, RIM);
          if (fl(tx + 1, ty)) for (let y = 0; y < T; y++) set(ox + T - 1, oy + y, RIM);
          if (fl(tx, ty + 1)) for (let x = 0; x < T; x++) set(ox + x, oy + T - 1, RIM);
          continue;
        }
        // Flagstone floor: two slabs per tile, offset on alternate rows.
        const shift = ty % 2 ? 8 : 0;
        for (let y = 0; y < T; y++) {
          for (let x = 0; x < T; x++) {
            const gx = ox + x, gy = oy + y;
            const slab = Math.floor((x + shift) / 8);
            const sv = hash(tx * 2 + slab + (shift ? 1 : 0), ty * 3);
            let k = Math.floor(clamp(sv * 3.2 + BAYER[(gy & 3) * 4 + (gx & 3)] * 0.6 + (hash(gx, gy) - 0.5) * 0.5, 0, 3.99));
            let col = F[k];
            if (y === 0 || (x + shift) % 8 === 0) col = FM;
            else if (y === 1 || (x + shift) % 8 === 1) col = F[Math.min(3, k + 1)];
            set(gx, gy, col);
          }
        }
        // Cracks.
        if (rng() < 0.18) {
          let x = rng.int(2, 13), y = rng.int(2, 13);
          for (let i = 0; i < rng.int(4, 9); i++) {
            set(ox + x, oy + y, FM);
            x = clamp(x + rng.int(-1, 1), 1, 14);
            y = clamp(y + rng.int(0, 1), 1, 14);
          }
        }
        // Ambient occlusion under wall faces and beside walls.
        if (this.isWall(tx, ty - 1)) {
          for (let y = 0; y < 5; y++) for (let x = 0; x < T; x++) if (BAYER[(y & 3) * 4 + (x & 3)] + 0.5 > y / 5) set(ox + x, oy + y, FM);
        }
        if (this.isWall(tx - 1, ty)) for (let y = 0; y < T; y++) if ((y & 1) === 0) set(ox, oy + y, FM);
        if (this.isWall(tx + 1, ty)) for (let y = 0; y < T; y++) if ((y & 1) === 1) set(ox + T - 1, oy + y, FM);
        if (t === LAVA) {
          for (let y = 0; y < T; y++) {
            for (let x = 0; x < T; x++) {
              const v = Math.sin((ox + x) * 0.35 + (oy + y) * 0.2) * 0.5 + hash(ox + x, oy + y) * 0.6;
              const col = LAVA_C[Math.floor(clamp(v * 2.2 + 1, 0, 3.99))];
              set(ox + x, oy + y, col);
              epx[(oy + y) * pw + ox + x] = col;
            }
          }
          this.lavaSpots.push({ x: ox + T / 2, y: oy + T / 2 });
        }
      }
    }

    // Wall faces (wall with floor below), extended 8px upward for height.
    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        if (!this.isWall(tx, ty) || this.isWall(tx, ty + 1)) continue;
        const ox = tx * T, oy = ty * T - 8;
        for (let y = 0; y < T + 8; y++) {
          const row = Math.floor(y / 6);
          const brickShift = row % 2 ? 4 : 0;
          for (let x = 0; x < T; x++) {
            const gx = ox + x, gy = oy + y;
            let col;
            if (y < 2) col = y === 0 ? RIM : FACE[0];
            else if (y % 6 === 1 || (x + brickShift + tx * 16) % 8 === 0) col = FACEM;
            else {
              const shade = y > T + 3 ? 3 : y > T - 2 ? 2 : (hash(gx >> 3, gy) < 0.2 ? 1 : 0) + (BAYER[(gy & 3) * 4 + (gx & 3)] > 0.3 ? 1 : 0);
              col = FACE[Math.min(3, shade)];
            }
            set(gx, gy, col);
          }
        }
        // Theme details on faces.
        const r = rng();
        if (this.info.theme === 'catacombs' && r < 0.25) {
          // Skull niche.
          const nx = ox + 4, ny = oy + 8;
          for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) set(nx + x, ny + y, FACEM);
          const sk = SPR.h_skull.frames[0].buf;
          for (let y = 0; y < sk.h; y++) for (let x = 0; x < sk.w; x++) if (sk.d[y * sk.w + x] >>> 24) set(nx + 1 + x, ny + 1 + y, sk.d[y * sk.w + x]);
        } else if (this.info.theme === 'inferno' && r < 0.35) {
          // Glowing crack.
          let x = rng.int(3, 12), y = 4;
          while (y < T + 4) {
            set(ox + x, oy + y, LAVA_C[1]);
            epx[(oy + y) * pw + ox + x] = LAVA_C[rng() < 0.5 ? 1 : 2];
            x = clamp(x + rng.int(-1, 1), 1, 14);
            y++;
          }
        } else if (this.info.theme === 'crypt' && r < 0.12) {
          // Moss.
          for (let i = 0; i < 10; i++) set(ox + rng.int(0, 15), oy + rng.int(10, T + 6), pack(rng.pick(theme.accent)));
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    ectx.putImageData(eimg, 0, 0);

    // Stamped decor: cobwebs in room corners, bones, blood, banners.
    for (const r of this.rooms) {
      if (rng() < 0.6) ctx.drawImage(SPR.cobweb.frames[0].c, r.x * T, r.y * T);
      if (rng() < 0.5) {
        const w = SPR.cobweb.frames[0].cf;
        ctx.drawImage(w, (r.x + r.w) * T - w.width, r.y * T);
      }
      for (let i = 0; i < 3; i++) {
        if (rng() < 0.5) {
          const name = this.info.theme === 'catacombs' ? rng.pick(['bonepile', 'skullpile', 'bonepile']) : rng.pick(['bonepile', 'rubble']);
          const fx = rng.int(r.x + 1, r.x + r.w - 2), fy = rng.int(r.y + 1, r.y + r.h - 2);
          if (this.tile(fx, fy) === FLOOR) ctx.drawImage(SPR[name].frames[0].c, fx * T, fy * T + 6);
        }
      }
      // Torches and banners along the north wall.
      for (let x = r.x + 1; x < r.x + r.w - 1; x += rng.int(3, 5)) {
        let y = r.y;
        while (y < r.y + r.h && !this.isWall(x, y - 1)) y++;
        if (!this.isWall(x, y - 1) || this.tile(x, y) !== FLOOR) continue;
        if (rng() < 0.55) this.torches.push({ x: x * T + T / 2, y: y * T - 4, t: rng() * 10 });
        else if (this.info.theme !== 'catacombs' && rng() < 0.3) ctx.drawImage(SPR.banner.frames[0].c, x * T + 3, (y - 1) * T - 4);
      }
    }

    // Fog of war: one pixel per tile.
    this.seen = new Uint8Array(W * H);
    this.fog = makeCanvas(W, H);
    this.fogCtx = this.fog.getContext('2d');
    this.fogImg = this.fogCtx.createImageData(W, H);
    for (let i = 0; i < W * H; i++) this.fogImg.data[i * 4 + 3] = 255;
    this.fogDirty = true;
    this.flow = new Int16Array(W * H).fill(-1);
  }

  populate() {
    const g = this.g, rng = this.rng;
    const rooms = this.rooms.filter((r) => r !== this.startRoom && r !== this.guardRoom);
    // Breakables hugging the walls.
    for (const r of this.rooms) {
      const n = rng.int(1, 4);
      for (let i = 0; i < n; i++) {
        const side = rng.int(0, 3);
        const x = side === 0 ? r.x + 1 : side === 1 ? r.x + r.w - 2 : rng.int(r.x + 1, r.x + r.w - 2);
        const y = side === 2 ? r.y + 1 : side === 3 ? r.y + r.h - 2 : rng.int(r.y + 1, r.y + r.h - 2);
        if (this.tile(x, y) !== FLOOR) continue;
        const type = this.info.theme === 'catacombs' ? rng.pick(['urn', 'urn', 'barrel']) : rng.pick(['barrel', 'crate', 'urn']);
        g.spawnEnemy(type, x * T + T / 2, y * T + T - 2, { instant: true });
      }
      // Decorative furniture.
      if (r !== this.startRoom && rng() < 0.5) {
        const x = rng.int(r.x + 2, r.x + r.w - 3), y = rng.int(r.y + 2, r.y + r.h - 3);
        if (this.tile(x, y) === FLOOR && Math.abs(x - r.cx) + Math.abs(y - r.cy) > 2) {
          const name = rng.pick(this.info.theme === 'inferno' ? ['brazier', 'statue'] : ['brazier', 'statue', 'sarcophagus', 'candles']);
          const solid = name !== 'candles';
          if (solid) this.grid[y * this.W + x] = PROP;
          this.props.push({
            spr: SPR[name], x: x * T + T / 2, y: y * T + T - 1, anim: name === 'brazier' ? 8 : name === 'candles' ? 3 : 0, t: rng() * 10,
            light: name === 'brazier' ? ['fire', 100] : name === 'candles' ? ['warm', 50] : null,
          });
        }
      }
    }
    // Shrines and a treasure chest in side rooms.
    const shuffled = rooms.slice().sort(() => rng() - 0.5);
    for (let i = 0; i < Math.min(2, shuffled.length); i++) {
      const r = shuffled[i];
      g.addShrine(r.cx * T + T / 2, r.cy * T + T / 2, rng.pick(['fury', 'haste', 'fortune', 'wisdom', 'protection']));
    }
    if (shuffled[2]) {
      const r = shuffled[2];
      g.addPickup('chest', r.cx * T + T / 2, r.cy * T + T / 2, 0, { kind: 'elite', pop: false });
    }
    // The guardian sleeps at the far end.
    const gr = this.guardRoom;
    this.guardian = g.spawnBoss(this.info.guardian, gr.cx * T + T / 2, gr.cy * T + T / 2, { sleeping: true });
    if (this.guardian) this.guardian.sealed = true;
    // The flow field is needed before the first spawn.
    this.updateFlow(true);
  }

  // ------------------------------------------------------------ update --

  update(dt) {
    const g = this.g, p = g.player;
    this.flowT -= dt;
    this.updateFlow(false);
    this.seenT -= dt;
    if (this.seenT <= 0) {
      this.seenT = 0.12;
      this.reveal(p.x, p.y, 10);
    }
    const gd = this.guardian;
    if (this.sealed && gd && !gd.dead) {
      const n = g.kills - this.sealStart;
      const k = Math.min(1, n / this.sealGoal), t = Math.min(1, g.floorTime / this.sealTime);
      const pct = Math.floor((k + t) * 50);
      g.objective = k < 1 ? `Break the seal: slay foes (${pct}%)` : `The seal weakens... (${pct}%)`;
      if (pct >= 100 || g.floorTime > 7 * 60) {
        this.sealed = false;
        gd.sealed = false;
        g.objective = `Slay ${gd.def.name}`;
        g.banner('The seal is broken!', `${gd.def.name} stirs in the depths`, '#f6757a', 3);
        g.shake(0.4);
      }
    }
    // Wake the guardian when the hero comes close, or let it hunt them.
    if (gd && !gd.dead && gd.sleeping && !this.sealed) {
      this.huntT += dt;
      const d = Math.hypot(gd.x - p.x, gd.y - p.y);
      if ((d < 150 && this.lineOfSight(p.x, p.y, gd.x, gd.y)) || this.huntT > 75) {
        g.bossIntro(gd);
        g.objective = `Slay ${gd.def.name}`;
      }
    }
    // Stairs.
    if (this.stairs && g.state === 'play') {
      const s = this.stairs;
      s.t += dt;
      if (Math.random() < 0.3) g.particles.emit(s.x + rand(-10, 10), s.y + rand(-4, 8), 0, 0, 0, rand(10, 30), 1, 1, PC.L, P.GLOW | P.FADE, 0);
      if (Math.abs(p.x - s.x) < 12 && p.y > s.y - 6 && p.y < s.y + 14) g.descend();
    }
    // Torch embers.
    if (Math.random() < 0.3 && this.torches.length) {
      const t = pick(this.torches);
      if (Math.abs(t.x - p.x) < 260 && Math.abs(t.y - p.y) < 200) g.particles.emit(t.x + rand(-1, 1), t.y - 8, 0, rand(-4, 4), rand(-6, 0), rand(10, 25), 0.8, 1, PC.y, P.GLOW | P.FADE, 0);
    }
  }

  updateFlow(force) {
    const p = this.g.player;
    const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
    const idx = ty * this.W + tx;
    if (!force && (idx === this.lastPT || this.flowT > 0)) return;
    if (this.tile(tx, ty) !== FLOOR) return;
    this.lastPT = idx;
    this.flowT = 0.12;
    this.bfs(tx, ty, this.flow);
    // Candidate spawn tiles: a walk of 11-22 tiles away.
    const c = (this.spawnCands = this.spawnCands || []);
    c.length = 0;
    const far = (this.farCands = this.farCands || []);
    far.length = 0;
    for (let i = 0; i < this.flow.length; i++) {
      const d = this.flow[i];
      if (d >= 11 && d <= 22) c.push(i);
      else if (d > 22 && d <= 34) far.push(i);
    }
  }

  reveal(x, y, R) {
    const { W, H } = this;
    const ox = x / T, oy = y / T;
    let changed = false;
    for (let a = 0; a < 200; a++) {
      const ang = (a / 200) * TAU;
      const dx = Math.cos(ang) * 0.5, dy = Math.sin(ang) * 0.5;
      let cx = ox, cy = oy;
      for (let s = 0; s < R * 2; s++) {
        const tx = Math.floor(cx), ty = Math.floor(cy);
        if (tx < 0 || ty < 0 || tx >= W || ty >= H) break;
        const i = ty * W + tx;
        if (!this.seen[i]) {
          this.seen[i] = 1;
          changed = true;
          // Reveal the wall face above a revealed floor tile too.
          if (ty > 0 && !this.seen[i - W]) this.seen[i - W] = 1;
        }
        if (this.grid[i] === WALL) break;
        cx += dx;
        cy += dy;
      }
    }
    if (changed) this.fogDirty = true;
  }

  openStairs(x, y) {
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    let best = null;
    for (let r = 0; r < 6 && !best; r++) {
      for (let dy = -r; dy <= r && !best; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (this.tile(tx + dx, ty + dy) === FLOOR && this.tile(tx + dx, ty + dy + 1) === FLOOR && this.tile(tx + dx - 1, ty + dy) === FLOOR && this.tile(tx + dx + 1, ty + dy) === FLOOR) {
            best = [tx + dx, ty + dy];
            break;
          }
        }
      }
    }
    if (!best) best = [tx, ty];
    this.stairs = { x: best[0] * T + T / 2, y: best[1] * T + 2, t: 0 };
    this.g.banner('The way down is open', 'Find the stairs', '#63c74d', 2.5);
  }

  marker() {
    if (this.stairs) return [this.stairs.x, this.stairs.y, '#63c74d'];
    const gd = this.guardian;
    if (gd && !gd.dead && gd.sleeping) return [gd.x, gd.y, '#e43b44'];
    return null;
  }

  // ------------------------------------------------------------ queries --

  solid(x, y) {
    const t = this.tile(Math.floor(x / T), Math.floor(y / T));
    return t === WALL;
  }

  blocked(tx, ty) {
    return this.tile(tx, ty) !== FLOOR;
  }

  collide(e) {
    const r = Math.min(e.r, 6);
    const x0 = Math.floor((e.x - r) / T), x1 = Math.floor((e.x + r) / T);
    const y0 = Math.floor((e.y - r) / T), y1 = Math.floor((e.y + r) / T);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!this.blocked(tx, ty)) continue;
        const cx = clamp(e.x, tx * T, tx * T + T), cy = clamp(e.y, ty * T, ty * T + T);
        const dx = e.x - cx, dy = e.y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= r * r) continue;
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          e.x += (dx / d) * (r - d);
          e.y += (dy / d) * (r - d);
        } else {
          // Centre inside the tile: push out along the shallowest axis.
          const l = e.x - tx * T, rr = tx * T + T - e.x, u = e.y - ty * T, b = ty * T + T - e.y;
          const m = Math.min(l, rr, u, b);
          if (m === l) e.x = tx * T - r;
          else if (m === rr) e.x = tx * T + T + r;
          else if (m === u) e.y = ty * T - r;
          else e.y = ty * T + T + r;
        }
      }
    }
  }

  lineOfSight(x0, y0, x1, y1) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.solid(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }

  steer(e, target) {
    const dx = target.x - e.x, dy = target.y - e.y;
    const l = Math.hypot(dx, dy) || 1;
    const p = this.g.player;
    if (target !== p) return [dx / l, dy / l];
    const tx = Math.floor(e.x / T), ty = Math.floor(e.y / T);
    const W = this.W;
    const d0 = this.flow[ty * W + tx];
    if (d0 <= 2 && d0 >= 0) return [dx / l, dy / l];
    let best = -1, bd = d0 < 0 ? 32767 : d0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const nx = tx + ox, ny = ty + oy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= this.H) continue;
        const d = this.flow[ny * W + nx];
        if (d < 0 || d >= bd) continue;
        if (ox && oy && (this.blocked(tx + ox, ty) || this.blocked(tx, ty + oy))) continue;
        bd = d;
        best = ny * W + nx;
      }
    }
    if (best < 0) return [dx / l, dy / l];
    const bx = (best % W) * T + T / 2 - e.x, by = ((best / W) | 0) * T + T / 2 - e.y;
    const bl = Math.hypot(bx, by) || 1;
    return [bx / bl, by / bl];
  }

  freeSpot(x, y) {
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (this.tile(tx, ty) === FLOOR) return { x, y };
    for (let r = 1; r <= 4; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (this.tile(tx + dx, ty + dy) === FLOOR) return { x: (tx + dx) * T + T / 2, y: (ty + dy) * T + T / 2 };
        }
      }
    }
    return null;
  }

  spawnPoint(g) {
    const cam = g.cam;
    const list = this.spawnCands && this.spawnCands.length ? this.spawnCands : this.farCands;
    if (!list || !list.length) return null;
    for (let tries = 0; tries < 6; tries++) {
      const i = list[(Math.random() * list.length) | 0];
      const x = (i % this.W) * T + T / 2 + rand(-4, 4), y = ((i / this.W) | 0) * T + T / 2 + rand(-4, 4);
      const onScreen = x > cam.x - 10 && x < cam.x + cam.W + 10 && y > cam.y - 10 && y < cam.y + cam.H + 20;
      if (!onScreen || tries === 5) return { x, y };
    }
    return null;
  }

  tooFar(e) {
    const i = Math.floor(e.y / T) * this.W + Math.floor(e.x / T);
    const d = this.flow[i];
    return d < 0 ? !e.def.fly && e.def.ai !== 'phaser' && Math.hypot(e.x - this.g.player.x, e.y - this.g.player.y) > 200 : d > 30;
  }

  // ------------------------------------------------------------- render --

  ambient() {
    const a = this.theme.ambient;
    const d = this.g.dawn;
    return d > 0 ? a.map((v) => v + (220 - v) * d) : a;
  }

  drawGround(ctx, cam) {
    const S = cam.S;
    const sx = Math.max(0, Math.floor(cam.x)), sy = Math.max(0, Math.floor(cam.y));
    const sw = Math.min(this.canvas.width - sx, Math.ceil(cam.W) + 2), sh = Math.min(this.canvas.height - sy, Math.ceil(cam.H) + 2);
    if (sw <= 0 || sh <= 0) return;
    ctx.drawImage(this.canvas, sx, sy, sw, sh, Math.round((sx - cam.x) * S), Math.round((sy - cam.y) * S), sw * S, sh * S);
  }

  drawGroundProps(ctx, cam, time) {
    if (!this.stairs) return;
    const S = cam.S, s = this.stairs;
    const img = SPR.stairs.frames[0].c;
    const w = img.width * S, h = img.height * S;
    ctx.drawImage(img, Math.round((s.x - cam.x) * S - w / 2), Math.round((s.y - cam.y) * S - 2 * S), w, h);
  }

  collectProps(cam, list) {
    for (const p of this.props) {
      if (p.x < cam.x - 30 || p.x > cam.x + cam.W + 30 || p.y < cam.y - 10 || p.y > cam.y + cam.H + 40) continue;
      list.push(p);
    }
    for (const t of this.torches) {
      if (t.x < cam.x - 20 || t.x > cam.x + cam.W + 20 || t.y < cam.y - 20 || t.y > cam.y + cam.H + 30) continue;
      t.spr = SPR.torch;
      t.anim = 9;
      list.push(t);
    }
  }

  drawProp(ctx, cam, p, time) {
    const S = cam.S;
    const fr = p.anim ? p.spr.frames[Math.floor(time * p.anim + p.t) % p.spr.frames.length] : p.spr.frames[0];
    const img = fr.c;
    const w = img.width * S, h = img.height * S;
    const X = Math.round((p.x - cam.x) * S - w / 2), Y = Math.round((p.y - cam.y) * S - h + S);
    ctx.drawImage(img, X, Y, w, h);
    p._rect = [X, Y, w, h, fr];
  }

  drawPropEmissive(ctx, p) {
    if (!p._rect) return;
    const [X, Y, w, h, fr] = p._rect;
    if (fr.em) ctx.drawImage(fr.em, X, Y, w, h);
  }

  addLights(g) {
    const t = g.time, cam = g.cam;
    const vis = (x, y, m) => x > cam.x - m && x < cam.x + cam.W + m && y > cam.y - m && y < cam.y + cam.H + m;
    for (const tr of this.torches) {
      if (!vis(tr.x, tr.y, 120)) continue;
      const f = 0.85 + 0.15 * Math.sin(t * 11 + tr.t) * Math.sin(t * 6.7 + tr.t * 3);
      g.light(tr.x, tr.y - 4, 95 * f, 'fire', 1);
    }
    for (const p of this.props) {
      if (!p.light || !vis(p.x, p.y, 120)) continue;
      const f = 0.85 + 0.15 * Math.sin(t * 13 + p.t);
      g.light(p.x, p.y - 10, p.light[1] * f, p.light[0], 1);
    }
    for (const l of this.lavaSpots) {
      if (!vis(l.x, l.y, 80)) continue;
      g.light(l.x, l.y, 48 + 6 * Math.sin(t * 2 + l.x), 'fire', 0.7);
    }
    if (this.stairs) g.light(this.stairs.x, this.stairs.y + 8, 90 + 10 * Math.sin(t * 3), 'green', 1);
  }

  drawOverlay(ctx, cam, time) {
    const S = cam.S;
    // Molten cracks and lava stay bright in the dark.
    if (this.lavaSpots.length || this.info.theme === 'inferno') {
      const sx = Math.max(0, Math.floor(cam.x)), sy = Math.max(0, Math.floor(cam.y));
      const sw = Math.min(this.emissive.width - sx, Math.ceil(cam.W) + 2), sh = Math.min(this.emissive.height - sy, Math.ceil(cam.H) + 2);
      if (sw > 0 && sh > 0) {
        ctx.globalAlpha = 0.75 + 0.25 * Math.sin(time * 2.2);
        ctx.drawImage(this.emissive, sx, sy, sw, sh, Math.round((sx - cam.x) * S), Math.round((sy - cam.y) * S), sw * S, sh * S);
        ctx.globalAlpha = 1;
      }
    }
    if (this.stairs) {
      ctx.globalCompositeOperation = 'lighter';
      const s = this.stairs;
      const sz = (60 + 8 * Math.sin(time * 3)) * S;
      ctx.globalAlpha = 0.5;
      ctx.drawImage(glow('#63c74d'), (s.x - cam.x) * S - sz / 2, (s.y + 8 - cam.y) * S - sz / 2, sz, sz);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    // Unexplored areas stay black.
    if (this.fogDirty) {
      const d = this.fogImg.data;
      for (let i = 0; i < this.seen.length; i++) d[i * 4 + 3] = this.seen[i] ? 0 : 255;
      this.fogCtx.putImageData(this.fogImg, 0, 0);
      this.fogDirty = false;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.fog, (-cam.x - T / 2) * S, (-cam.y - T / 2) * S, this.W * T * S, this.H * T * S);
    ctx.imageSmoothingEnabled = false;
  }

  drawMinimap(ctx, W, H, big) {
    const scale = big ? Math.max(2, Math.floor(Math.min((W - 40) / this.W, (H - 60) / this.H))) : 1;
    const mw = this.W * scale, mh = this.H * scale;
    const ox = big ? Math.floor(W / 2 - mw / 2) : W - mw - 4;
    const oy = big ? Math.floor(H / 2 - mh / 2) + 6 : 36;
    ctx.globalAlpha = big ? 0.85 : 0.7;
    ctx.fillStyle = '#0d0b14';
    ctx.fillRect(ox - 2, oy - 2, mw + 4, mh + 4);
    ctx.globalAlpha = big ? 1 : 0.85;
    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        const i = y * this.W + x;
        if (!this.seen[i]) continue;
        const t = this.grid[i];
        if (t === WALL) {
          // Only draw wall edges next to floor.
          if (this.tile(x, y + 1) === WALL && this.tile(x, y - 1) === WALL && this.tile(x - 1, y) === WALL && this.tile(x + 1, y) === WALL) continue;
          ctx.fillStyle = '#8b9bb4';
        } else ctx.fillStyle = t === LAVA ? '#be4a2f' : '#3a4466';
        ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
      }
    }
    const p = this.g.player;
    const dot = (wx, wy, col, s = 2) => {
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(ox + (wx / T) * scale - s / 2), Math.round(oy + (wy / T) * scale - s / 2), s, s);
    };
    if (this.stairs) dot(this.stairs.x, this.stairs.y, '#63c74d', big ? 5 : 3);
    const gd = this.guardian;
    if (gd && !gd.dead && this.seen[Math.floor(gd.y / T) * this.W + Math.floor(gd.x / T)]) dot(gd.x, gd.y, '#e43b44', big ? 5 : 3);
    for (const s of this.g.shrines) if (!s.used && this.seen[Math.floor(s.y / T) * this.W + Math.floor(s.x / T)]) dot(s.x, s.y, '#feae34', big ? 4 : 2);
    dot(p.x, p.y, Math.floor(this.g.time * 4) % 2 ? '#ffffff' : '#2ce8f5', big ? 4 : 2);
    ctx.globalAlpha = 1;
    if (big) drawText(ctx, `FLOOR ${this.floor} — ${this.info.name.toUpperCase()}`, W / 2, oy - 14, { align: 'center', color: '#c0cbdc' });
  }
}
