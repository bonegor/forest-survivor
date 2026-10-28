// Spell and hit effects drawn from art (public/assets/art/effects.js, baked by tools/bake-art.mjs
// from tools/art/effects.mjs): flames over the fire pools, fire blasts, a flask's shatter, a
// meteor's crash, lightning strikes and the fireball. Cosmetic only: none of it strikes, and none
// of it throws the game's dice (Math.random, seeded in a replay): what varies comes from hash2.
// Each sprite's frames become canvases (mirrored too: Frame) the first time it is drawn; it is
// drawn at the world's pixel size, a frame pixel to an art pixel.

import FX from '../../assets/art/effects.js';
import VFX from '../../assets/art/vfx.js';
import { bakedBuffers } from '../art/baked.js';
import { packedPalette } from '../art/palette.js';
import { Frame } from '../engine/sprites.js';
import { hash2, TAU } from '../engine/util.js';

// A sprite of effects.js, or of vfx.js (the weapons' effects baked from Sprite Fusion's, 28 October
// 2026: tools/vfx/bake.mjs), whose `em` palette keys glow unlit at night (Frame's emissive).
const made = {};
export function fxFrames(name) {
  const v = FX[name] ? null : VFX[name];
  return (made[name] ??= bakedBuffers(v || FX[name]).map((b) => new Frame(b, v ? unlitKeys(v.em) : undefined)));
}
const unlitKeys = (keys) => (keys ? new Set([...keys].map((k) => packedPalette()[k])) : null);

// A vfx.js sprite's glow frames (its light, baked at half size: drawn twice as big, adding light),
// or null if it has none.
const glows = {};
export function glowFrames(name) {
  const g = VFX[name] && VFX[name].glow;
  return g ? (glows[name] ??= bakedBuffers(g).map((b) => new Frame(b))) : null;
}

// What vfx.js holds for a sprite (its origin ox, oy in the frame, fps, variants ...), or undefined.
export const vfxData = (name) => VFX[name];

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

// ------------------------------------------------------------- vfx burst --

// The owner's (28 October 2026): "see what of their effects we can use for weapons and bake it in
// with our approach". Sprite Fusion's effects, baked into vfx.js, are played as sprites: drawn by
// their own origin (the point the effect was drawn round, vfx.js ox, oy), their light in the glow
// pass from their glow frames (half size, drawn twice as big) and their unlit keys (em), or, an
// additive one (a star's flare, light itself), drawn whole in the glow pass. Cosmetic only, as every
// burst: none strikes, and none throws the game's dice. o: as fxBurst's (from, to: frames of one
// variant; fps, the bake's unless given; flip; alpha), and variant (which seed's set of frames, for
// a sprite baked with several: by hash2 of the point unless given), follow (an object whose x, y it
// rides with, keeping its offset: a cut goes with the hero, as the Slash is drawn), glowAlpha (its
// light's strength).
export class VfxBurst extends FxBurst {
  constructor(name, x, y, o = {}) {
    const v = VFX[name], per = v.vn || v.frames.length;
    const variant = o.variant ?? (v.vn ? Math.floor(hash2(Math.round(x), Math.round(y), 73) * (v.frames.length / v.vn)) : 0);
    super(name, x, y, { ...o, from: variant * per + (o.from || 0), to: variant * per + (o.to ?? per), fps: o.fps || v.fps });
    this.v = v;
    this.glowFr = glowFrames(name);
    this.glowAlpha = o.glowAlpha ?? 1;
    this.follow = o.follow || null;
    this.dx = this.follow ? this.x - this.follow.x : 0;
    this.dy = this.follow ? this.y - this.follow.y : 0;
  }

  update(dt) {
    if (this.follow) {
      this.x = this.follow.x + this.dx;
      this.y = this.follow.y + this.dy;
    }
    return super.update(dt);
  }

  index() {
    return this.from + Math.min(this.n - 1, Math.floor(this.t * this.fps));
  }

  // img (w by h art px) with the effect's origin at (this.x, this.y); a mirrored one's origin
  // mirrored with it.
  place(ctx, cam, img, w, h) {
    const S = cam.S, v = this.v;
    ctx.drawImage(img, Math.round((this.x - (this.flip ? w - v.ox : v.ox) - cam.x) * S), Math.round((this.y - v.oy - cam.y) * S), w * S, h * S);
  }

  draw(ctx, cam) {
    if (this.v.additive) return;
    const fr = this.frames[this.index()];
    ctx.globalAlpha = this.alpha;
    this.place(ctx, cam, fr.get(this.flip), fr.w, fr.h);
    ctx.globalAlpha = 1;
  }

  // In the glow pass ('lighter'): the unlit keys laid over as they are (as a monster's glowing
  // eyes, drawEmissive), then the light added over them.
  drawGlow(ctx, cam) {
    const i = this.index(), fr = this.frames[i];
    if (this.v.additive) {
      ctx.globalAlpha = this.alpha * this.glowAlpha;
      this.place(ctx, cam, fr.get(this.flip), fr.w, fr.h);
      ctx.globalAlpha = 1;
      return;
    }
    const em = this.flip ? fr.emf : fr.em;
    if (em) {
      const op = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = this.alpha;
      this.place(ctx, cam, em, fr.w, fr.h);
      ctx.globalCompositeOperation = op;
    }
    if (this.glowFr) {
      const gl = this.glowFr[i];
      ctx.globalAlpha = this.alpha * this.glowAlpha;
      this.place(ctx, cam, gl.get(this.flip), gl.w * 2, gl.h * 2);
    }
    ctx.globalAlpha = 1;
  }
}

// By day (the Sunscorch and the Frostfell, spent in the sun) light added over bright sand and snow
// washes the art out: the baked light is drawn this strong.
const DAY_GLOW = 0.5;
// The baked effects keep a CAP of their own: a Thunderstorm's shocks or a volley's silver hits
// never leave the flasks and lightning columns of fxBurst's out.
const vstarts = new Float64Array(CAP).fill(-1e9);
let vnext = 0;

// Whether the baked effects play. Always, in the game; tools/vfx/compare.mjs turns them off to draw
// the weapons as they were before them, for the owner to compare by eye (28 October 2026). Off,
// vfxBurst makes none and vfxFrames has none, and every weapon draws its own art as it did.
let vfxOff = false;
export const setVfx = (on) => {
  vfxOff = !on;
};
export const vfxOn = () => !vfxOff;

// A vfx.js sprite's frames, for an effect that draws them itself (a falling star's flare, the
// Whirlwind's turning blade), or null: there is none, or the baked effects are off (setVfx).
export const vfxFrames = (name) => (vfxOff || !VFX[name] ? null : fxFrames(name));

// A burst of vfx.js sprite `name` at (x, y) into the game's effects, unless too many have just
// started (as fxBurst, in a pool of its own), there is no such sprite or the baked effects are
// off (setVfx). Mirrored by hash2 of the point if the sprite may be (vfx.js mirror) and o.flip
// doesn't say.
export function vfxBurst(g, name, x, y, o = {}) {
  const v = VFX[name];
  if (!v || vfxOff) return null;
  const now = g.clock, s = vstarts[vnext];
  if (s > now - BUSY && s <= now) return null;
  if (o.cap && crowded(name, now, o.cap, o.span ?? BUSY)) return null;
  vstarts[vnext] = now;
  vnext = (vnext + 1) % CAP;
  const flip = o.flip ?? (!!v.mirror && hash2(Math.round(x), Math.round(y), 74) < 0.5);
  const b = new VfxBurst(name, x, y, { ...o, flip, glowAlpha: o.glowAlpha ?? (g.world && g.world.daylight ? DAY_GLOW : 1) });
  g.effects.push(b);
  return b;
}

// Decodes sprites ahead of their first burst (a weapon gained or evolved: the level-up card's
// pause hides the few milliseconds), so none is made mid-fight.
export function vfxPrewarm(names) {
  for (const n of names) {
    if (!VFX[n]) continue;
    fxFrames(n);
    glowFrames(n);
  }
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
