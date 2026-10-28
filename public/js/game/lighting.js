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
  // The Survival maps' own (28 October 2026, game/biomes.js): the Abyss's embers, a deeper orange
  // than a fire's, flickering as one does (a look's `flicker`); the Frostfell's ice, a paler blue
  // than the cyan; the Bloomvale's pink.
  ember: [255, 110, 40],
  ice: [150, 215, 255],
  pink: [255, 140, 205],
  // The Sunscorch's night-blooming cacti: the moon's own colour under a key of their own, so that
  // the look softens them (its lightK) without dimming every moonlit thing on the map with them
  // (the glades' sword in the stone, darkwood.js, burns as it does on every other map).
  bloom: [170, 185, 255],
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

export const LS = 2; // world pixels per light-map pixel (forest.js keeps the cracks' glow at this grain)
const MAXL = 700;
const MAXG = 64; // glowing pieces of ground a frame (glow)

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
    this.m = 0;
    this.gi = new Array(MAXG).fill(null);
    this.gx = new Float32Array(MAXG);
    this.gy = new Float32Array(MAXG);
    this.gw = new Float32Array(MAXG);
    this.gh = new Float32Array(MAXG);
    this.ga = new Float32Array(MAXG);
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

  // Ground that glows (28 October 2026: the Abyss's cracks, forest.js addLights): img, its glow in
  // colour and clear elsewhere, laid over the world at x, y (w by h world px), added to this frame's
  // light as the lights are, at alpha a. So it lights the night where it lies, and whatever stands
  // over it is lit by it rather than painted over. A chunk's comes already at the light map's grain
  // (LS world px a pixel, forest.js generate), so it is laid on pixel for pixel, nothing filtered.
  glow(img, x, y, w, h, a = 1) {
    if (this.m >= MAXG) return;
    const i = this.m++;
    this.gi[i] = img;
    this.gx[i] = x;
    this.gy[i] = y;
    this.gw[i] = w;
    this.gh[i] = h;
    this.ga[i] = a;
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
    for (let i = 0; i < this.m; i++) {
      const x = this.gx[i] / LS - bx, y = this.gy[i] / LS - by, w = this.gw[i] / LS, h = this.gh[i] / LS;
      if (x + w > 0 && y + h > 0 && x < lw && y < lh) {
        g.globalAlpha = Math.max(0, Math.min(1, this.ga[i]));
        g.drawImage(this.gi[i], x, y, w, h);
      }
      this.gi[i] = null; // a chunk let go is not kept for its glow
    }
    this.m = 0;
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
