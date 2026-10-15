// Light map: a low-resolution canvas filled with the ambient colour, lights
// added on top, then multiplied over the scene. Smooth upscaling keeps the
// falloff soft while the sprites underneath stay crisp.
//
// Lights are collected continuously; render() consumes everything added
// since the previous render, so effects that register their light while
// drawing their glow simply light up one frame later.

import { makeCanvas } from '../engine/util.js';

export const LIGHT_COLORS = {
  warm: [255, 186, 120],
  fire: [255, 140, 60],
  white: [255, 255, 255],
  cold: [140, 190, 255],
  holy: [255, 232, 160],
  purple: [200, 120, 255],
  green: [150, 255, 120],
  red: [255, 80, 60],
  cyan: [120, 240, 255],
  gold: [255, 210, 90],
  moon: [170, 185, 255],
  blue: [90, 140, 255],
};

const sprites = {};
function lightSprite(key) {
  let c = sprites[key];
  if (!c) {
    const [r, g, b] = LIGHT_COLORS[key] || LIGHT_COLORS.white;
    c = makeCanvas(64, 64);
    const x = c.getContext('2d');
    const grad = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    const stop = (t, k) => grad.addColorStop(t, `rgb(${(r * k) | 0},${(g * k) | 0},${(b * k) | 0})`);
    stop(0, 1);
    stop(0.25, 0.82);
    stop(0.5, 0.48);
    stop(0.75, 0.18);
    stop(1, 0);
    x.fillStyle = grad;
    x.fillRect(0, 0, 64, 64);
    sprites[key] = c;
  }
  return c;
}

const LS = 2; // world pixels per light-map pixel
const MAXL = 700;

export class Lighting {
  constructor() {
    this.c = makeCanvas(8, 8);
    this.g = this.c.getContext('2d');
    this.n = 0;
    this.lx = new Float32Array(MAXL);
    this.ly = new Float32Array(MAXL);
    this.lr = new Float32Array(MAXL);
    this.li = new Float32Array(MAXL);
    this.lk = new Array(MAXL);
  }

  add(x, y, r, key = 'warm', intensity = 1) {
    if (this.n >= MAXL) return;
    const i = this.n++;
    this.lx[i] = x;
    this.ly[i] = y;
    this.lr[i] = r;
    this.li[i] = intensity;
    this.lk[i] = key;
  }

  render(ctx, cam, ambient) {
    const lw = Math.ceil(cam.W / LS) + 3;
    const lh = Math.ceil(cam.H / LS) + 3;
    if (this.c.width !== lw || this.c.height !== lh) {
      this.c.width = lw;
      this.c.height = lh;
    }
    const g = this.g;
    const bx = Math.floor(cam.x / LS) - 1;
    const by = Math.floor(cam.y / LS) - 1;
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.fillStyle = `rgb(${ambient[0] | 0},${ambient[1] | 0},${ambient[2] | 0})`;
    g.fillRect(0, 0, lw, lh);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.n; i++) {
      const r = this.lr[i] / LS;
      const x = this.lx[i] / LS - bx, y = this.ly[i] / LS - by;
      if (x + r < 0 || y + r < 0 || x - r > lw || y - r > lh) continue;
      g.globalAlpha = Math.min(1, this.li[i]);
      g.drawImage(lightSprite(this.lk[i]), x - r, y - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    const S = cam.S;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.c, (bx * LS - cam.x) * S, (by * LS - cam.y) * S, lw * LS * S, lh * LS * S);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
    // Lights registered after this point (glow pass) show up next frame.
    this.n = 0;
  }
}

export { lightSprite };
