// Pooled particles in typed arrays. Colours index the master palette.

import { PALETTE_CSS, PALETTE_KEYS } from '../engine/sprites.js';
import { makeCanvas, rand, TAU } from '../engine/util.js';

const MAX = 6000;
export const P = { GLOW: 1, FADE: 2, SHRINK: 4, GROUND: 8, SOFT: 16, RISE: 32 };

const C = Object.fromEntries(PALETTE_KEYS.map((k, i) => [k, i]));
export const PC = C; // palette key -> colour index

// Soft round glow per palette colour, built lazily.
const glowCache = [];
function glowSprite(ci) {
  let c = glowCache[ci];
  if (!c) {
    c = makeCanvas(32, 32);
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    const hex = PALETTE_CSS[ci];
    grad.addColorStop(0, hex);
    grad.addColorStop(0.25, hex + 'aa');
    grad.addColorStop(1, hex + '00');
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    glowCache[ci] = c;
  }
  return c;
}
export { glowSprite };

export class Particles {
  constructor() {
    this.n = 0;
    this.x = new Float32Array(MAX);
    this.y = new Float32Array(MAX);
    this.z = new Float32Array(MAX);
    this.vx = new Float32Array(MAX);
    this.vy = new Float32Array(MAX);
    this.vz = new Float32Array(MAX);
    this.life = new Float32Array(MAX);
    this.max = new Float32Array(MAX);
    this.size = new Float32Array(MAX);
    this.drag = new Float32Array(MAX);
    this.grav = new Float32Array(MAX);
    this.col = new Uint8Array(MAX);
    this.flags = new Uint8Array(MAX);
    this.budget = 1; // scaled down under heavy load
  }

  clear() {
    this.n = 0;
  }

  emit(x, y, z, vx, vy, vz, life, size, col, flags = 0, drag = 0, grav = 0) {
    let i = this.n;
    if (i >= MAX) {
      // Recycle a random particle rather than dropping the newest effect.
      i = (Math.random() * MAX) | 0;
    } else this.n++;
    this.x[i] = x; this.y[i] = y; this.z[i] = z;
    this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
    this.life[i] = life; this.max[i] = life;
    this.size[i] = size; this.col[i] = col; this.flags[i] = flags;
    this.drag[i] = drag; this.grav[i] = grav;
  }

  // Convenience: radial burst.
  burst(x, y, z, n, cols, speed, life, size, flags, opts = {}) {
    n = Math.ceil(n * this.budget);
    for (let i = 0; i < n; i++) {
      const a = opts.angle !== undefined ? opts.angle + rand(-opts.spread, opts.spread) : rand(TAU);
      const s = speed * rand(0.35, 1);
      this.emit(
        x + rand(-1, 1) * (opts.jitter || 0), y + rand(-1, 1) * (opts.jitter || 0), z,
        Math.cos(a) * s, Math.sin(a) * s * (opts.flat ?? 0.7), opts.vz !== undefined ? rand(opts.vz * 0.5, opts.vz) : rand(-10, 30),
        life * rand(0.6, 1.1), size, cols[(Math.random() * cols.length) | 0], flags, opts.drag ?? 2, opts.grav ?? 0,
      );
    }
  }

  update(dt) {
    const { x, y, z, vx, vy, vz, life, drag, grav, flags } = this;
    for (let i = 0; i < this.n; i++) {
      life[i] -= dt;
      if (life[i] <= 0) {
        this.n--;
        this.copy(this.n, i);
        i--;
        continue;
      }
      const d = drag[i] ? Math.exp(-drag[i] * dt) : 1;
      vx[i] *= d;
      vy[i] *= d;
      x[i] += vx[i] * dt;
      y[i] += vy[i] * dt;
      if (flags[i] & P.GROUND) {
        vz[i] -= grav[i] * dt;
        z[i] += vz[i] * dt;
        if (z[i] < 0) {
          z[i] = 0;
          if (vz[i] < -25) {
            vz[i] = -vz[i] * 0.35;
            vx[i] *= 0.55;
            vy[i] *= 0.55;
          } else {
            vz[i] = 0;
            vx[i] *= 0.8;
            vy[i] *= 0.8;
          }
        }
      } else {
        vz[i] -= grav[i] * dt;
        z[i] += vz[i] * dt;
      }
    }
  }

  copy(from, to) {
    this.x[to] = this.x[from]; this.y[to] = this.y[from]; this.z[to] = this.z[from];
    this.vx[to] = this.vx[from]; this.vy[to] = this.vy[from]; this.vz[to] = this.vz[from];
    this.life[to] = this.life[from]; this.max[to] = this.max[from]; this.size[to] = this.size[from];
    this.col[to] = this.col[from]; this.flags[to] = this.flags[from];
    this.drag[to] = this.drag[from]; this.grav[to] = this.grav[from];
  }

  // glow=false: plain pixels (lit by the scene). glow=true: additive pass.
  draw(ctx, cam, glow) {
    const { S } = cam;
    const ox = cam.x, oy = cam.y;
    let lastCol = -1, lastA = 1;
    ctx.globalAlpha = 1;
    for (let i = 0; i < this.n; i++) {
      const f = this.flags[i];
      if (((f & P.GLOW) !== 0) !== glow) continue;
      const t = this.life[i] / this.max[i];
      let s = this.size[i];
      if (f & P.SHRINK) s *= 0.3 + 0.7 * t;
      const a = f & P.FADE ? Math.min(1, t * 2) : 1;
      const sx = (this.x[i] - ox) * S, sy = (this.y[i] - this.z[i] - oy) * S;
      if (sx < -40 || sy < -40 || sx > cam.pxW + 40 || sy > cam.pxH + 40) continue;
      if (a !== lastA) {
        ctx.globalAlpha = a;
        lastA = a;
      }
      const ci = this.col[i];
      if (glow && (f & P.SOFT)) {
        const g = glowSprite(ci);
        const r = s * S * 2.2;
        ctx.drawImage(g, sx - r, sy - r, r * 2, r * 2);
        continue;
      }
      if (ci !== lastCol) {
        ctx.fillStyle = PALETTE_CSS[ci];
        lastCol = ci;
      }
      const px = Math.max(1, Math.round(s * S));
      ctx.fillRect(Math.round(sx - px / 2), Math.round(sy - px / 2), px, px);
      if (glow && s >= 1.5) {
        const g = glowSprite(ci);
        const r = s * S * 2.5;
        ctx.globalAlpha = a * 0.5;
        ctx.drawImage(g, sx - r, sy - r, r * 2, r * 2);
        ctx.globalAlpha = a;
      }
    }
    ctx.globalAlpha = 1;
  }
}
