// Builds canvases for every sprite definition, plus the variants the game
// needs at runtime: mirrored, white hit-flash, unlit "emissive" masks,
// tints and pre-rotated copies.

import { ART, resolveFrames } from '../art/defs.js';
import { PAL, packedPalette, OUTLINE } from '../art/palette.js';
import * as px from './pixels.js';
import { makeCanvas, TAU } from './util.js';

const pal = packedPalette();
const WHITE = px.pack(255, 255, 255);

// Particle colours reference this list by index.
export const PALETTE_KEYS = Object.keys(PAL);
export const PALETTE_CSS = PALETTE_KEYS.map((k) => PAL[k]);
const packedToIndex = new Map(PALETTE_KEYS.map((k, i) => [pal[k], i]));
export const colorIndex = (key) => PALETTE_KEYS.indexOf(key);

export function bufToCanvas(buf) {
  const c = makeCanvas(buf.w, buf.h);
  const g = c.getContext('2d');
  const img = g.createImageData(buf.w, buf.h);
  new Uint32Array(img.data.buffer).set(buf.d);
  g.putImageData(img, 0, 0);
  return c;
}

export class Frame {
  constructor(buf, emissive) {
    this.buf = buf;
    this.w = buf.w;
    this.h = buf.h;
    this.c = bufToCanvas(buf);
    this.cf = bufToCanvas(px.flipX(buf));
    const em = emissive ? px.keepColors(buf, emissive) : null;
    this.em = em ? bufToCanvas(em) : null;
    this.emf = em ? bufToCanvas(px.flipX(em)) : null;
    this.variants = new Map();
    this._pixels = null;
    this._rot = new Map();
  }

  get(flip) {
    return flip ? this.cf : this.c;
  }

  // White silhouette for hit flashes.
  white(flip) {
    return this.variant('white', (b) => px.silhouette(b, WHITE), flip);
  }

  variant(key, fn, flip = false) {
    let v = this.variants.get(key);
    if (!v) {
      const b = fn(this.buf);
      v = [bufToCanvas(b), bufToCanvas(px.flipX(b))];
      this.variants.set(key, v);
    }
    return v[flip ? 1 : 0];
  }

  // Opaque pixels as [x, y, paletteIndex, ...] for pixel-burst deaths.
  get pixels() {
    if (!this._pixels) {
      const list = px.opaqueList(this.buf);
      const out = [];
      for (let i = 0; i < list.length; i += 3) {
        const idx = packedToIndex.get(list[i + 2]);
        if (idx !== undefined && list[i + 2] !== OUTLINE) out.push(list[i], list[i + 1], idx);
      }
      this._pixels = out;
    }
    return this._pixels;
  }

  // n pre-rotated copies (nearest neighbour, pixel-consistent).
  rotations(n) {
    let r = this._rot.get(n);
    if (!r) {
      r = [];
      for (let i = 0; i < n; i++) r.push(bufToCanvas(px.rotate(this.buf, (i / n) * TAU)));
      this._rot.set(n, r);
    }
    return r;
  }

  rotated(angle, n = 32) {
    const rots = this.rotations(n);
    let i = Math.round((angle / TAU) * n) % n;
    if (i < 0) i += n;
    return rots[i];
  }
}

export const SPR = {};

export function buildSprites() {
  for (const [name, def] of Object.entries(ART)) {
    const emissive = def.emissive ? new Set([...def.emissive].map((ch) => pal[ch])) : null;
    const frames = resolveFrames(def).map((raw) => {
      let b = Array.isArray(raw) ? px.fromRows(raw, pal) : raw;
      if (def.outline !== false) b = px.outline(b, OUTLINE);
      return new Frame(b, emissive);
    });
    SPR[name] = { name, frames, w: frames[0].w, h: frames[0].h };
  }
}

export function sprite(name) {
  const s = SPR[name];
  if (!s) throw new Error(`Unknown sprite ${name}`);
  return s;
}

// Tint helpers used for status effects.
export const TINTS = {
  frozen: (b) => px.tint(b, px.hexPack('#9ee7ff'), 0.55),
  burn: (b) => px.tint(b, px.hexPack('#ff6a3d'), 0.35),
  elite: (b) => px.tint(b, px.hexPack('#feae34'), 0.18),
  shadow: (b) => px.silhouette(b, px.pack(10, 8, 18)),
  dim: (b) => px.tint(b, px.hexPack('#181425'), 0.55),
};

// Gold outline for champions: re-outline the sprite in a bright colour.
export function eliteOutline(frame, color = '#feae34') {
  return frame.variant(`ol${color}`, (b) => {
    const c = px.hexPack(color);
    const out = px.cloneBuf(b);
    for (let i = 0; i < out.d.length; i++) if (out.d[i] === OUTLINE) out.d[i] = c;
    return out;
  });
}

// Build a canvas from a raw pixel buffer (procedural textures).
export function canvasFromBuf(buf) {
  return bufToCanvas(buf);
}

// Upscaled (Scale2x) copy of a sprite frame, for menus / portraits.
export function smoothScaled(frame, times = 1) {
  return frame.variant(`s2x${times}`, (b) => {
    let out = b;
    for (let i = 0; i < times; i++) out = px.scale2x(out);
    return out;
  });
}
