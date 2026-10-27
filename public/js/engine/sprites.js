// Builds canvases for every sprite definition, plus the variants the game
// needs at runtime: mirrored, white hit-flash, unlit "emissive" masks,
// tints and pre-rotated copies.

import { ART, resolveFrames } from '../art/defs.js';
import { ART_FALLBACKS } from '../art/fallbacks.js';
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

// A colour a tuned sprite is drawn in (def.palette), added to the list so its death burst keeps
// it. A particle holds its colour in a byte: past 256 colours a burst leaves that colour out.
function addColour(c) {
  if (packedToIndex.has(c) || PALETTE_CSS.length >= 256) return;
  const hex = `#${[c & 255, (c >>> 8) & 255, (c >>> 16) & 255].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  packedToIndex.set(c, PALETTE_CSS.length);
  PALETTE_KEYS.push(hex);
  PALETTE_CSS.push(hex);
}

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
    this._box = null;
    this._radius = -1;
  }

  // The box its opaque pixels fill, [x0, y0, x1, y1] (x1, y1 one past the last), as the hitboxes
  // go by (game/hitbox.js); the whole frame if it has none.
  get box() {
    if (!this._box) {
      const { w, h, d } = this.buf;
      let x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!(d[y * w + x] >>> 24)) continue;
          if (x < x0) x0 = x;
          if (x >= x1) x1 = x + 1;
          if (y < y0) y0 = y;
          if (y >= y1) y1 = y + 1;
        }
      }
      this._box = x1 > x0 ? [x0, y0, x1, y1] : [0, 0, w, h];
    }
    return this._box;
  }

  // How far from its centre its farthest opaque pixel reaches (to that pixel's far corner): the
  // disc it sweeps turning, or drawn at any turn (game/hitbox.js).
  get radius() {
    if (this._radius < 0) {
      const { w, h, d } = this.buf;
      let r2 = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!(d[y * w + x] >>> 24)) continue;
          const dx = Math.max(Math.abs(x - w / 2), Math.abs(x + 1 - w / 2)), dy = Math.max(Math.abs(y - h / 2), Math.abs(y + 1 - h / 2));
          if (dx * dx + dy * dy > r2) r2 = dx * dx + dy * dy;
        }
      }
      this._radius = Math.sqrt(r2);
    }
    return this._radius;
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

  // Opaque pixels as [x, y, paletteIndex, ...] for pixel-burst deaths: not the outline, nor a
  // tuned sprite's rim.
  get pixels() {
    if (!this._pixels) {
      const list = px.opaqueList(this.buf);
      const out = [];
      const ink = this.buf.ink ?? OUTLINE, rim = this.buf.rim;
      for (let i = 0; i < list.length; i += 3) {
        const c = list[i + 2], idx = packedToIndex.get(c);
        if (idx !== undefined && c !== ink && c !== rim) out.push(list[i], list[i + 1], idx);
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

// A tuned sprite's colours (def.palette, baked by tools/bake-tune.mjs into art/tuned.js): from a
// palette key, or from a colour the art is drawn in itself ('#rrggbb', the heroes' sheets), to the
// colour drawn instead. Keyed and given without alpha: a pixel keeps its own.
function recolouring(def) {
  if (!def.palette) return null;
  const map = new Map();
  for (const [from, to] of Object.entries(def.palette)) {
    const c = from.length === 1 ? pal[from] : px.hexPack(from);
    if (c !== undefined) map.set(c & 0xffffff, px.hexPack(to) & 0xffffff);
  }
  return map.size ? map : null;
}
function swap(map, c) {
  const n = map ? map.get(c & 0xffffff) : undefined;
  return n === undefined ? c : ((c & 0xff000000) | n) >>> 0;
}
function recoloured(b, map) {
  const out = px.makeBuf(b.w, b.h);
  for (let i = 0; i < b.d.length; i++) out.d[i] = b.d[i] >>> 24 ? swap(map, b.d[i]) : b.d[i];
  return out;
}
const touchesEdge = (b) => {
  for (let x = 0; x < b.w; x++) if (b.d[x] >>> 24 || b.d[(b.h - 1) * b.w + x] >>> 24) return true;
  for (let y = 0; y < b.h; y++) if (b.d[y * b.w] >>> 24 || b.d[y * b.w + b.w - 1] >>> 24) return true;
  return false;
};
const unpad = (b) => {
  const out = px.makeBuf(b.w - 2, b.h - 2);
  for (let y = 0; y < out.h; y++) out.d.set(b.d.subarray((y + 1) * b.w + 1, (y + 1) * b.w + 1 + out.w), y * out.w);
  return out;
};

// A sprite definition's frames as pixel buffers, outlined and in its tuned colours, with no
// canvas (tools/preview.mjs draws them too). def.palette recolours it; def.rim ('#rrggbb') rings
// it with 1 px outside the outline, growing the frames by a pixel a side only if the art reaches
// their edge (anchorY then moves down with it). A tuned sprite's buffers carry its outline colour
// (buf.ink) and rim (buf.rim), for what looks for the outline (a champion's gold one).
export function spriteBuffers(def) {
  const map = recolouring(def);
  const ink = swap(map, OUTLINE);
  const keys = (s) => (s ? new Set([...s].map((ch) => swap(map, pal[ch]))) : null);
  const emissive = def.emissive ? keys(def.emissive) : def.glow && def.glow.length ? new Set(def.glow.map((c) => swap(map, c))) : null;
  const thin = keys(def.thin);
  let frames = resolveFrames(def).map((raw) => {
    let b = Array.isArray(raw) ? px.fromRows(raw, pal) : raw;
    if (map) b = recoloured(b, map);
    if (def.outline !== false) b = px.outline(b, ink, false, thin);
    return b;
  });
  let anchorY = def.anchorY;
  const rim = def.rim ? px.hexPack(def.rim) : 0;
  if (rim) {
    const grow = frames.some(touchesEdge);
    frames = frames.map((b) => (grow ? px.outline(b, rim, false, thin) : unpad(px.outline(b, rim, false, thin))));
    if (grow && anchorY != null) anchorY += 1;
  }
  if (map || rim) {
    for (const b of frames) {
      b.ink = ink;
      if (rim) b.rim = rim;
    }
  }
  return { frames, emissive, anchorY };
}

// One sprite definition built into outlined frames (the sprite lab uses this too).
// What glows unlit: def.emissive, palette keys (as in art/palette.js); or def.glow, the colours
// themselves (packed), for art drawn in colours of its own.
export function buildSprite(name, def) {
  const built = spriteBuffers(def);
  const frames = built.frames.map((b) => new Frame(b, built.emissive));
  if (def.palette) for (const to of Object.values(def.palette)) addColour(px.hexPack(to));
  return { name, frames, walk: def.walk || null, idle: def.idle || null,
    motionRate: def.motionRate || 1, idleRate: def.idleRate ?? 4,
    attack: def.attack || null, attackFps: def.attackFps || 0, selfBob: !!def.selfBob,
    attackRelease: def.attackRelease ?? null, attackWalk: def.attackWalk || null,
    // A boss's: its poses as it strikes (frame lists at poseFps), the rows of art below its feet
    // (a blow sweeping low) and its body's [w, h] (what its shadow and glow go by).
    poses: def.poses || null, poseFps: def.poseFps || 0, below: def.below || 0, body: def.body || null,
    anchorY: built.anchorY ?? frames[0].h - 1,
    fitW: def.fitW || frames[0].w, fitH: def.fitH || frames[0].h,
    fps: def.fps || 0, hires: def.hires || 1, small: def.small || null, picture: def.picture || null, w: frames[0].w, h: frames[0].h };
}

export function buildSprites() {
  for (const [name, def] of Object.entries(ART)) SPR[name] = buildSprite(name, def);
  // Art not drawn yet is drawn as its stand-in (art/fallbacks.js) until it is.
  for (const [name, stand] of Object.entries(ART_FALLBACKS)) if (!SPR[name] && SPR[stand]) SPR[name] = SPR[stand];
}

// Frame for walk step n: the sprite's walk cycle if it has one, else every frame in turn.
export function walkFrame(spr, n) {
  return spr.walk ? spr.frames[spr.walk[n % spr.walk.length]] : spr.frames[n % spr.frames.length];
}

// Frame for idle step n: the idle cycle if the sprite has one (flames,
// flicker), else its first frame.
export function idleFrame(spr, n) {
  return spr.idle ? spr.frames[spr.idle[n % spr.idle.length]] : spr.frames[0];
}

// Frame at time t for a looping menu pose; sprites without an fps hold their first frame.
export function loopFrame(spr, t) {
  return spr.fps ? spr.frames[Math.floor(t * spr.fps) % spr.frames.length] : spr.frames[0];
}

export function sprite(name) {
  const s = SPR[name];
  if (!s) throw new Error(`Unknown sprite ${name}`);
  return s;
}

// Tints: a frozen or winding-up foe (enemies.js), a shrine used up (Game.drawShrine).
export const TINTS = {
  frozen: (b) => px.tint(b, px.hexPack('#9ee7ff'), 0.55),
  burn: (b) => px.tint(b, px.hexPack('#ff6a3d'), 0.35),
  dim: (b) => px.tint(b, px.hexPack('#181425'), 0.55),
};

// The night look of a frame (enemies.js NIGHT_EDGE, which lifts its colours first: nightLift):
// its pixels and, with `ring` (packed, its alpha kept), a 1 px ring round its outline, and with
// `halo` as well a fainter pixel round the ring, its corners too, so the two fade out as a soft
// glow; none of either where the frame is. Without a ring, just the frame. Either way
// (w+4)×(h+4), the frame NIGHT_PAD pixels in from each side, so a foe's night layer is one
// drawImage whatever it is ringed with.
export const NIGHT_PAD = 2;
export function nightBuf(b, ring, halo = 0) {
  if (!ring) return px.pad(b, NIGHT_PAD);
  const ringed = px.outline(b, ring);
  return halo ? px.outline(ringed, halo, true) : px.pad(ringed, 1);
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
