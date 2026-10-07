// Animated menu backdrop: moonlit sky, parallax pine silhouettes, drifting
// mist, and the heroes resting around a campfire.

import { SPR } from '../engine/sprites.js';
import { makeCanvas, mulberry32, clamp, rand, TAU, hexToRgb } from '../engine/util.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);

function gradientCanvas(W, H, stops) {
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const cols = stops.map((s) => [s[0], hexToRgb(s[1])]);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = clamp(y / H + BAYER[(y & 3) * 4 + (x & 3)] * 0.05, 0, 1);
      let i = 0;
      while (i < cols.length - 2 && cols[i + 1][0] < t) i++;
      const [t0, c0] = cols[i], [t1, c1] = cols[i + 1];
      const k = clamp((t - t0) / (t1 - t0), 0, 1);
      // Posterise into 6 steps per segment for a banded retro sky.
      const q = Math.round(k * 6) / 6;
      const o = (y * W + x) * 4;
      img.data[o] = c0[0] + (c1[0] - c0[0]) * q;
      img.data[o + 1] = c0[1] + (c1[1] - c0[1]) * q;
      img.data[o + 2] = c0[2] + (c1[2] - c0[2]) * q;
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function treeLayer(W, H, seed, base, height, color, density) {
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const rng = mulberry32(seed);
  g.fillStyle = color;
  g.fillRect(0, base, W, H - base);
  let x = -10;
  while (x < W + 10) {
    const h = height * (0.6 + rng() * 0.6);
    const w = h * (0.32 + rng() * 0.12);
    const top = base - h;
    for (let y = Math.floor(top); y < base; y++) {
      const t = (y - top) / h;
      const jag = (Math.floor((y - top) / 4) % 2) * 1.5;
      const hw = Math.max(0.5, (w / 2) * t + jag * t);
      // Draw wrapped so the strip tiles horizontally.
      for (const off of [0, -W, W]) g.fillRect(Math.round(x - hw + off), y, Math.round(hw * 2), 1);
    }
    x += w * density * (0.5 + rng());
  }
  return c;
}

export class MenuScene {
  constructor() {
    this.t = 0;
    this.W = 0;
    this.H = 0;
    this.embers = [];
    this.flies = [];
  }

  build(W, H) {
    this.W = W;
    this.H = H;
    this.sky = gradientCanvas(W, H, [
      [0, '#07060f'],
      [0.45, '#1a1533'],
      [0.75, '#3b2346'],
      [1, '#5a2e3e'],
    ]);
    const rng = mulberry32(7);
    this.stars = [];
    for (let i = 0; i < (W * H) / 900; i++) this.stars.push([rng() * W, rng() * H * 0.6, rng() * TAU, rng() < 0.15]);
    const ground = Math.round(H * 0.8);
    this.layers = [
      { c: treeLayer(W, H, 11, Math.round(H * 0.66), H * 0.28, '#2a2141', 0.9), speed: 2 },
      { c: treeLayer(W, H, 23, Math.round(H * 0.74), H * 0.36, '#1a1430', 0.8), speed: 5 },
      { c: treeLayer(W, H, 37, ground + 6, H * 0.5, '#0c0a16', 1.1), speed: 9 },
    ];
    this.ground = ground;
  }

  draw(ctx, W, H, dt, o = {}) {
    if (W !== this.W || H !== this.H) this.build(W, H);
    this.t += dt;
    const t = this.t;
    ctx.drawImage(this.sky, 0, 0);
    // Stars.
    for (const [x, y, ph, big] of this.stars) {
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + ph);
      ctx.fillStyle = tw > 0.7 ? '#ffffff' : tw > 0.35 ? '#c0cbdc' : '#5a6988';
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      if (big && tw > 0.8) {
        ctx.fillStyle = '#8b9bb4';
        ctx.fillRect(Math.round(x) - 1, Math.round(y), 1, 1);
        ctx.fillRect(Math.round(x) + 1, Math.round(y), 1, 1);
        ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 1);
        ctx.fillRect(Math.round(x), Math.round(y) + 1, 1, 1);
      }
    }
    // Moon with halo.
    const mx = Math.round(W * 0.84), my = Math.round(H * 0.42), mr = Math.max(9, Math.round(H * 0.05));
    const halo = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 5);
    halo.addColorStop(0, 'rgba(255,240,210,0.25)');
    halo.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
    for (let y = -mr; y <= mr; y++) {
      for (let x = -mr; x <= mr; x++) {
        const d = Math.hypot(x, y);
        if (d > mr) continue;
        const crater = Math.hypot(x + mr * 0.3, y - mr * 0.2) < mr * 0.25 || Math.hypot(x - mr * 0.35, y + mr * 0.3) < mr * 0.18;
        ctx.fillStyle = crater ? '#d9cfae' : d > mr - 1.2 ? '#e4d8b4' : x + y > mr * 0.4 ? '#efe6c8' : '#fff8e0';
        ctx.fillRect(mx + x, my + y, 1, 1);
      }
    }
    // Clouds drifting across the moon.
    ctx.fillStyle = 'rgba(40,30,60,0.55)';
    for (let i = 0; i < 4; i++) {
      const cx = ((t * (3 + i) + i * 140) % (W + 160)) - 80;
      const cy = H * (0.12 + i * 0.07);
      ctx.fillRect(Math.round(cx), Math.round(cy), 70 + i * 10, 3);
      ctx.fillRect(Math.round(cx + 10), Math.round(cy - 2), 40, 2);
    }
    // Parallax tree lines.
    this.layers.forEach((L, i) => {
      const off = -((t * L.speed) % W);
      ctx.drawImage(L.c, Math.round(off), 0);
      ctx.drawImage(L.c, Math.round(off) + W, 0);
      if (i < 2) {
        ctx.fillStyle = `rgba(120,100,170,${0.07 + i * 0.03})`;
        const fy = Math.round(H * (0.68 + i * 0.08));
        ctx.fillRect(0, fy, W, 6);
        ctx.fillRect(0, fy + 6, W, 3);
      }
    });

    if (o.campfire !== false) this.drawCamp(ctx, W, H, dt);

    // Fireflies.
    if (this.flies.length < 18) this.flies.push({ x: rand(W), y: rand(H * 0.5, H * 0.95), ph: rand(TAU), sp: rand(0.3, 1) });
    for (const f of this.flies) {
      f.x += Math.sin(t * f.sp + f.ph) * 0.2;
      f.y += Math.cos(t * f.sp * 1.3 + f.ph) * 0.15;
      const a = 0.5 + 0.5 * Math.sin(t * 3 + f.ph);
      if (a < 0.3) continue;
      ctx.fillStyle = a > 0.8 ? '#fee761' : '#9ee562';
      ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
    }
    // Vignette.
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
    v.addColorStop(0, 'rgba(5,4,10,0)');
    v.addColorStop(1, 'rgba(5,4,10,0.75)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  drawCamp(ctx, W, H, dt) {
    const t = this.t;
    const fx = Math.round(W / 2), fy = Math.round(H * 0.9);
    // Firelight on the ground.
    const r = H * 0.35 * (0.95 + 0.05 * Math.sin(t * 13) * Math.sin(t * 7));
    const lg = ctx.createRadialGradient(fx, fy - 4, 0, fx, fy - 4, r);
    lg.addColorStop(0, 'rgba(255,170,90,0.45)');
    lg.addColorStop(0.5, 'rgba(255,120,60,0.12)');
    lg.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = lg;
    ctx.fillRect(fx - r, fy - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
    const fire = SPR.campfire.frames[Math.floor(t * 8) % 3].c;
    const fs = 2;
    ctx.drawImage(fire, fx - (fire.width * fs) / 2, fy - fire.height * fs, fire.width * fs, fire.height * fs);
    // Heroes around the fire.
    const heroes = [
      ['knight', -42, 1, false],
      ['archer', 40, -1, true],
      ['mage', -78, 1, false],
    ];
    for (const [name, dx, face, flip] of heroes) {
      const fr = SPR[name].frames[0];
      const img = flip ? fr.cf : fr.c;
      const s = 2;
      const bob = Math.sin(t * 2 + dx) > 0.7 ? 1 : 0;
      ctx.fillStyle = 'rgba(5,4,10,0.5)';
      ctx.fillRect(fx + dx - 8, fy - 2, 16, 3);
      ctx.drawImage(img, fx + dx - (img.width * s) / 2, fy - img.height * s + 2 - bob, img.width * s, img.height * s);
      if (fr.em) ctx.drawImage(flip ? fr.emf : fr.em, fx + dx - (img.width * s) / 2, fy - img.height * s + 2 - bob, img.width * s, img.height * s);
      void face;
    }
    // Embers.
    if (Math.random() < dt * 14) this.embers.push({ x: fx + rand(-6, 6), y: fy - 14, vx: rand(-6, 6), vy: rand(-22, -12), life: rand(1.2, 2.4) });
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      e.life -= dt;
      if (e.life <= 0) {
        this.embers.splice(i, 1);
        continue;
      }
      e.x += (e.vx + Math.sin(t * 3 + i) * 6) * dt;
      e.y += e.vy * dt;
      ctx.fillStyle = e.life > 1 ? '#fee761' : e.life > 0.5 ? '#f77622' : '#be4a2f';
      ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
    }
  }
}
