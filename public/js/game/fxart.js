// Spell and hit effects drawn from art (public/assets/art/effects.js, baked by tools/bake-art.mjs
// from tools/art/effects.mjs): flames over the fire pools, fire blasts, a flask's shatter, a
// meteor's crash, lightning strikes and the fireball. Cosmetic only: none of it strikes, and none
// of it throws the game's dice (Math.random, seeded in a replay): what varies comes from hash2.
// Each sprite's frames become canvases (mirrored too: Frame) the first time it is drawn; it is
// drawn at the world's pixel size, a frame pixel to an art pixel.

import FX from '../../assets/art/effects.js';
import { bakedBuffers } from '../art/baked.js';
import { Frame } from '../engine/sprites.js';
import { hash2, TAU } from '../engine/util.js';

const made = {};
export function fxFrames(name) {
  return (made[name] ??= bakedBuffers(FX[name]).map((b) => new Frame(b)));
}

// A frame of a sprite onto the screen: its foot (the bottom of its box, or its centre with
// centre) at the world point (x, y), mirrored with flip.
function blit(ctx, cam, fr, x, y, flip, centre) {
  const S = cam.S, w = fr.w * S, h = fr.h * S;
  ctx.drawImage(fr.get(flip), Math.round((x - cam.x) * S - w / 2), Math.round((y - cam.y) * S - (centre ? h / 2 : h)), w, h);
}

// ------------------------------------------------------------------ burst --

// One-shot sprites over the horde can pile up (a Thunderstorm strikes ~36 foes a second): at most
// CAP start within any BUSY seconds of the game's clock; past that a burst is left out.
const CAP = 40, BUSY = 0.5;
const starts = new Float64Array(CAP).fill(-1e9);
let next = 0;

// A sprite played once at a point. o: from, to (its frames, all by default); fps; centre (its
// centre on the point, else its foot); flip; glow (drawn in the glow pass, adding light: lightning);
// dy (a nudge down, art pixels); alpha.
export class FxBurst {
  constructor(name, x, y, o) {
    this.frames = fxFrames(name);
    this.x = x;
    this.y = y + (o.dy || 0);
    this.from = o.from || 0;
    this.n = (o.to ?? this.frames.length) - this.from;
    this.fps = o.fps || 18;
    this.centre = !!o.centre;
    this.flip = !!o.flip;
    this.glow = !!o.glow;
    this.alpha = o.alpha ?? 1;
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    return this.t * this.fps < this.n;
  }

  frame() {
    return this.frames[this.from + Math.min(this.n - 1, Math.floor(this.t * this.fps))];
  }

  paint(ctx, cam) {
    ctx.globalAlpha = this.alpha;
    blit(ctx, cam, this.frame(), this.x, this.y, this.flip, this.centre);
    ctx.globalAlpha = 1;
  }

  draw(ctx, cam) {
    if (!this.glow) this.paint(ctx, cam);
  }

  drawGlow(ctx, cam) {
    if (this.glow) this.paint(ctx, cam);
  }
}

// Whether `cap` bursts of sprite `name` have started within the last `span` seconds (at most 8
// counted); if not, this one is counted. A stamp from later than now is a past game's.
const recent = new Map();
function crowded(name, now, cap, span) {
  let r = recent.get(name);
  if (!r) recent.set(name, (r = { at: new Float64Array(8).fill(-1e9), i: 0 }));
  let n = 0;
  for (let k = 0; k < 8; k++) if (r.at[k] > now - span && r.at[k] <= now) n++;
  if (n >= cap) return true;
  r.at[r.i] = now;
  r.i = (r.i + 1) & 7;
  return false;
}

// A burst of sprite `name` at (x, y) into the game's effects, unless too many have just started:
// of all sprites (CAP), or of this one, with o.cap (at most that many within o.span seconds).
export function fxBurst(g, name, x, y, o = {}) {
  const now = g.clock, s = starts[next];
  // A stamp from later than now is a past game's (the clock starts again with each run). The
  // CAP first, so that one it leaves out is not counted against its sprite's own cap.
  if (s > now - BUSY && s <= now) return null;
  if (o.cap && crowded(name, now, o.cap, o.span ?? BUSY)) return null;
  starts[next] = now;
  next = (next + 1) % CAP;
  const b = new FxBurst(name, x, y, o);
  g.effects.push(b);
  return b;
}

// ----------------------------------------------------------------- flames --

// Flames over a burning pool: a few for each, by its size (at most FLAMES), each flaring and dying
// in its own time and then springing up again elsewhere in the pool. Where and when come from the
// pool's seed, so nothing is kept for them and a flame never jumps mid-flare.
const FLAMES = 9, FLAME_FPS = 11;
export function poolFlames(ctx, cam, name, x, y, R, t, seed, alpha) {
  if (R < 4 || alpha <= 0.02) return;
  const fr = fxFrames(name), n = fr.length;
  const count = Math.min(FLAMES, Math.max(2, Math.round((R * R) / 120)));
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    const c = (t * FLAME_FPS) / n + hash2(seed, i, 11);
    const cyc = Math.floor(c), f = Math.floor((c - cyc) * n);
    const a = hash2(seed + cyc, i, 12) * TAU, r = Math.sqrt(hash2(seed + cyc, i, 13)) * R * 0.78;
    blit(ctx, cam, fr[f], x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8 + 2, (cyc + i) & 1, false);
  }
  ctx.globalAlpha = 1;
}

// A seed for a pool's flames, from where it lies.
export const flameSeed = (x, y) => (Math.round(x * 8) * 7919 + Math.round(y * 8)) | 0;

// ---------------------------------------------------------------- fireball --

// The Fireball's frame at time t flying at angle ang (the art flies up and to the right).
export function fireballFrame(t, ang) {
  const fr = fxFrames('fx_fireball');
  return fr[Math.floor(t * 12) % fr.length].rotated(ang + Math.PI / 4, 32);
}
