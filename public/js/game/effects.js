// Visual + gameplay effects: slashes, explosions, burning pools, orbiting
// blades, holy ground, lightning, meteors, telegraphs, beams and ultimates.
//
// Effect interface: update(dt) -> keep?; drawGround / draw / drawGlow(ctx, cam).

import { SPR } from '../engine/sprites.js';
import { sfx } from '../engine/audio.js';
import { rand, TAU, lerp, clamp, ease, angleDiff, pick, hash2, hexToRgb, makeCanvas } from '../engine/util.js';
import { ringSprite, discSprite, slashFrame, glow, beamSprite, shadowSprite } from './fxsprites.js';
import { PC, P } from './particles.js';
import { WEAPON_SPRITES, BRAND_TIME } from '../data/weapons.js';
import { danceBlade, spawnProjectile } from './projectiles.js';
import { fxBurst, poolFlames, flameSeed } from './fxart.js';

function blitCentered(ctx, img, sx, sy, scale) {
  const w = img.width * scale, h = img.height * scale;
  ctx.drawImage(img, Math.round(sx - w / 2), Math.round(sy - h / 2), Math.round(w), Math.round(h));
}

// World to screen pixels. A fresh pair on purpose: its callers read it as
// `const [sx, sy] = toScreen(...)`, and read that way a reused pair makes more garbage, not less
// (measured in Node 24). The hottest paths (Orbit, ArrowRain) work out sx and sy as plain numbers.
const toScreen = (cam, x, y) => [(x - cam.x) * cam.S, (y - cam.y) * cam.S];

// ------------------------------------------------------------------ slash --

const STEEL = ['#5a6988', '#8b9bb4', '#c0cbdc', '#e8f4ff', '#ffffff'];
const HOLY = ['#be4a2f', '#f77622', '#feae34', '#fee761', '#ffffff'];

export class Slash {
  constructor(g, w, ang, R, arc, dmg, holy) {
    this.g = g;
    this.ang = ang;
    this.R = Math.round(R);
    this.arc = arc;
    this.t = 0;
    this.dur = 0.22;
    this.holy = holy;
    this.ai = ((Math.round((ang / TAU) * 32) % 32) + 32) % 32;
    this.pal = holy ? HOLY : STEEL;
    const p = g.player;
    const cands = g.grid.query(p.x, p.y, R + 14);
    for (let i = 0; i < cands.length; i++) {
      const e = cands[i];
      if (e.dead) continue;
      const dx = e.x - p.x, dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > R + e.r) continue;
      if (d > 8 && Math.abs(angleDiff(ang, Math.atan2(dy, dx))) > arc / 2 + Math.atan2(e.r, d)) continue;
      g.hitEnemy(e, dmg, { w, type: holy ? 'holy' : 'normal', kb: w ? w.s.kb : 1, kx: dx / (d || 1), ky: dy / (d || 1) });
    }
    if (holy) g.particles.burst(p.x + Math.cos(ang) * R * 0.7, p.y + Math.sin(ang) * R * 0.7, 6, 8, [PC.Y, PC.y, PC.w], 70, 0.4, 1, P.GLOW | P.FADE, {});
  }

  update(dt) {
    this.t += dt;
    return this.t < this.dur;
  }

  draw(ctx, cam) {
    const p = this.g.player;
    const f = Math.min(5, Math.floor((this.t / this.dur) * 6));
    const img = slashFrame(this.R, this.arc, this.ai, f, 6, this.pal);
    const [sx, sy] = toScreen(cam, p.x, p.y - 7);
    blitCentered(ctx, img, sx, sy, cam.S);
  }

  drawGlow(ctx, cam) {
    if (!this.holy) return;
    const p = this.g.player;
    const [sx, sy] = toScreen(cam, p.x + Math.cos(this.ang) * this.R * 0.6, p.y - 7 + Math.sin(this.ang) * this.R * 0.6);
    const s = this.R * 2.2 * cam.S;
    ctx.globalAlpha = 0.5 * (1 - this.t / this.dur);
    ctx.drawImage(glow('#feae34'), sx - s / 2, sy - s / 2, s, s);
    ctx.globalAlpha = 1;
    this.g.light(p.x, p.y, this.R * 2.5, 'holy', 0.6);
  }
}

// -------------------------------------------------------------- explosion --

// art: the blast's sprite (fxart.js), played over its ring. glowK: how strong its haze and flash
// are (a Thunderstorm's many shocks: faint, so the horde reads through them).
const EXPLO = {
  fire: { ring: '#fee761', glow: '#f77622', light: 'fire', parts: [PC.Y, PC.y, PC.o, PC.O], num: 'fire', art: 'fx_explosion' },
  shock: { ring: '#ffffff', glow: '#2ce8f5', light: 'cyan', parts: [PC.w, PC.c, PC.U], num: 'shock', glowK: 0.4 },
  holy: { ring: '#ffffff', glow: '#feae34', light: 'holy', parts: [PC.w, PC.Y, PC.y], num: 'holy' },
  frost: { ring: '#ffffff', glow: '#2ce8f5', light: 'cyan', parts: [PC.w, PC.c, PC.U, PC.G], num: 'frost' },
  dark: { ring: '#f6757a', glow: '#b55088', light: 'purple', parts: [PC.P, PC.p, PC.i], num: 'dark' },
  blood: { ring: '#e43b44', glow: '#a22633', light: 'red', parts: [PC.r, PC.R, PC.x], num: 'normal' },
  soul: { ring: '#9ee562', glow: '#63c74d', light: 'green', parts: [PC.l, PC.L, PC.w], num: 'normal' },
  silver: { ring: '#ffffff', glow: '#c0cbdc', light: 'cold', parts: [PC.w, PC.G, PC.g], num: 'holy', glowK: 0.6 },
};

export function explode(g, x, y, R, dmg, w, style = 'fire', opts = {}) {
  const st = EXPLO[style] || EXPLO.fire;
  if (dmg > 0) {
    const cands = g.grid.query(x, y, R + 14);
    for (let i = 0; i < cands.length; i++) {
      const e = cands[i];
      if (e.dead) continue;
      const dx = e.x - x, dy = e.y - y;
      const d = Math.hypot(dx, dy);
      if (d > R + e.r) continue;
      g.hitEnemy(e, dmg, { w, type: st.num, kb: opts.kb ?? 1.4, kx: dx / (d || 1), ky: dy / (d || 1), ult: opts.ult });
    }
  }
  g.effects.push(new Explosion(g, x, y, R, style, opts.art));
  sfx('explode', { size: clamp(R / 28, 0.6, 1.8), pan: clamp((x - g.player.x) / 200, -1, 1), pitch: rand(0.85, 1.1) });
}

// art: a sprite for the blast in place of its style's (a meteor's crash: Meteor.update).
export class Explosion {
  constructor(g, x, y, R, style, art) {
    this.g = g;
    this.x = x;
    this.y = y;
    this.R = R;
    this.st = EXPLO[style] || EXPLO.fire;
    this.style = style;
    this.t = 0;
    // The fire bomb's dome stands on the ground; any other blast bursts round the point.
    art ??= this.st.art;
    if (art) fxBurst(g, art, x, y, art === 'fx_explosion' ? { centre: true, fps: 16 } : { fps: 16, dy: 6 });
    const n = Math.min(40, 8 + R * 0.6);
    g.particles.burst(x, y, 4, n, this.st.parts, R * 3.2, 0.5, 2, P.GLOW | P.FADE | P.SHRINK, { flat: 0.8, vz: 50, drag: 3.5 });
    if (style === 'fire') {
      g.particles.burst(x, y, 6, n * 0.4, [PC.a, PC.K, PC.n], R * 1.2, 1.1, 3, P.FADE | P.RISE, { vz: 25, drag: 1.5 });
      g.particles.burst(x, y, 2, 8, [PC.y, PC.o], R * 4, 0.9, 1, P.GLOW | P.GROUND | P.FADE, { vz: 110, grav: 260 });
      g.addDecal('scorch', x, y, R * 0.8);
    } else if (style === 'frost') {
      g.particles.burst(x, y, 4, 10, [PC.w, PC.G, PC.c], R * 3, 0.8, 1, P.GROUND | P.FADE, { vz: 90, grav: 260 });
    }
  }

  update(dt) {
    this.t += dt;
    return this.t < 0.45;
  }

  draw(ctx, cam) {
    const u = this.t / 0.3;
    if (u >= 1) return;
    const r = Math.max(2, this.R * ease.outCubic(u));
    const img = ringSprite(r, this.st.ring, 2);
    const [sx, sy] = toScreen(cam, this.x, this.y);
    ctx.globalAlpha = 1 - u;
    blitCentered(ctx, img, sx, sy, cam.S);
    ctx.globalAlpha = 1;
  }

  drawGlow(ctx, cam) {
    const u = this.t / 0.45;
    const [sx, sy] = toScreen(cam, this.x, this.y - 4);
    const s = this.R * 3.4 * cam.S * (0.6 + u * 0.6);
    const k = this.st.glowK ?? 1;
    ctx.globalAlpha = Math.max(0, 1 - u * 1.4) * k;
    ctx.drawImage(glow(this.st.glow), sx - s / 2, sy - s / 2, s, s);
    if (u < 0.2) {
      const c = this.R * 1.6 * cam.S;
      ctx.globalAlpha = (1 - u * 5) * k;
      ctx.drawImage(glow('#ffffff'), sx - c / 2, sy - c / 2, c, c);
    }
    ctx.globalAlpha = 1;
    this.g.light(this.x, this.y, this.R * 4, this.st.light, 1.2 * (1 - u));
  }
}

// ------------------------------------------------------------------- mist --

// Miasma's poison is a mist, not a disc: lumpy puffs, dense in the middle and thinning to nothing
// at the rim, a darker body under lighter wisps that rise, drifting and swirling slowly. All of it
// (the cloud round the hero and every pool of his trail) is drawn into one small canvas, a canvas
// pixel to an art pixel, where the puffs run together into one cloud. That canvas is laid on the
// ground partly see-through, its pixels as crisp as the art's, and the glow pass adds a faint copy
// so the mist still shows in the night without lighting the woods like a lamp.

// How much of the mist covers the ground where it is thickest (Pestilence's a little more), and
// how bright its glow is.
const MIST_ALPHA = 0.7, MIST_PLAGUE = 0.74, MIST_GLOW = 0.11;
// A puff lies on the ground, so it is a little wider than tall.
const MIST_SQUASH = 0.82;
// The tones of a puff, its underside to its top: Miasma's body, darker than the lit grass and no
// lighter on top (its wisps are the light), and its wisps; then Pestilence's, thicker and a touch
// yellower.
const MIST_TONES = [
  ['#265c42', '#3e8948', '#3e8948'],
  ['#63c74d', '#9ee562', '#c4f08e'],
  ['#3e8948', '#6fc94c', '#6fc94c'],
  ['#7fcf4c', '#b2df5a', '#d6e67c'],
];
// Pestilence's motes: a few yellow among the green.
const PLAGUE_MOTES = [PC.l, PC.Y, PC.L];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// The pixels (RGBA, row by row) of a puff of radius r, and its size: v (0-3) picks its lumps, k
// its tones (MIST_TONES). Three quarters thick over its inner half (never solid, so where puffs
// overlap the mist grows thicker, in lumps), it thins over the outer half in three steps of alpha,
// dithered between, to nothing at its lumpy rim; lit from above, its top is a tone lighter and its
// underside a tone darker.
export function mistPuff(r, v, k) {
  const w = r * 2 + 2, h = Math.round(r * 2 * MIST_SQUASH) + 2;
  const data = new Uint8ClampedArray(w * h * 4);
  const tones = MIST_TONES[k].map(hexToRgb);
  const p1 = v * 1.7 + 0.4, p2 = v * 2.9 + 1.3, p3 = v * 4.1 + 2.2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - w / 2, dy = (y + 0.5 - h / 2) / MIST_SQUASH;
      const th = Math.atan2(dy, dx);
      const edge = r * (0.84 + 0.08 * Math.sin(3 * th + p1) + 0.05 * Math.sin(5 * th + p2) + 0.03 * Math.sin(2 * th + p3));
      const q = Math.hypot(dx, dy) / edge;
      if (q >= 1) continue;
      const dith = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      const lvl = Math.min(3, Math.floor(Math.min(1, (1 - q) * 2) * 3 + dith));
      if (lvl <= 0) continue;
      const lit = (-dy / r) * 0.9 - (dx / r) * 0.2 + (dith - 0.5) * 0.5;
      const c = tones[lit > 0.45 ? 2 : lit < -0.45 ? 0 : 1];
      const i = (y * w + x) * 4;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = Math.min(255, lvl * 64);
    }
  }
  return { w, h, data };
}

// The puffs are cut from a few big sheets, each puff painted on when first wanted: a hundred
// puffs a frame from one picture the graphics card already holds cost next to nothing, where a
// hundred little pictures, or a mist canvas sent to the card afresh each frame, cost milliseconds.
const SHEET = 512;
const sheets = [];
const puffs = new Map();
function puffSprite(r, v, k) {
  const key = (k * 4 + v) * 4096 + r;
  let s = puffs.get(key);
  if (!s) {
    const { w, h, data } = mistPuff(r, v, k);
    // Left to right along a shelf as tall as its tallest puff, then the next shelf, then a new sheet.
    let sh = sheets[sheets.length - 1];
    if (sh && sh.x + w > SHEET) {
      sh.x = 0;
      sh.y += sh.row + 1;
      sh.row = 0;
    }
    if (!sh || sh.y + h > SHEET) {
      const c = makeCanvas(SHEET, SHEET);
      sh = { c, g: c.getContext('2d'), x: 0, y: 0, row: 0 };
      sheets.push(sh);
    }
    const img = sh.g.createImageData(w, h);
    img.data.set(data);
    sh.g.putImageData(img, sh.x, sh.y);
    s = { c: sh.c, x: sh.x, y: sh.y, w, h };
    sh.x += w + 1;
    sh.row = Math.max(sh.row, h);
    puffs.set(key, s);
  }
  return s;
}

// One puff into the mist canvas m, centred on the world point (x, y); the canvas's corner is the
// world point (ox, oy). k: its tones; a: how thick.
function puff(m, ox, oy, x, y, r, v, k, a) {
  r = Math.min(120, Math.round(r));
  if (r < 2 || a <= 0.01) return;
  const s = puffSprite(r, v, k);
  m.globalAlpha = a;
  m.drawImage(s.c, s.x, s.y, s.w, s.h, Math.round(x - ox - s.w / 2), Math.round(y - oy - s.h / 2), s.w, s.h);
}

// A trail pool's puffs, worked out from where it lies (so a replay draws it the same, and the
// game's dice are left alone): two (three in a big pool) for its body and one (two) for its
// wisps, each with its offset, its size (of the pool's R), how fast and from where it wobbles
// and its lumps; and how the whole pool drifts, a few pixels a second, mostly upward.
function mistLayout(pool) {
  const hx = Math.round(pool.x * 8), hy = Math.round(pool.y * 8);
  const h = (i) => hash2(hx, hy, i);
  const big = pool.R > 16, a0 = h(1) * TAU;
  const make = (n, top, salt) => {
    const list = [];
    for (let i = 0; i < n; i++) {
      const k = salt + i * 8;
      const a = a0 + (i / n) * TAU + (h(k) - 0.5) * 1.2 + (top ? 0.8 : 0);
      const d = pool.R * (top ? 0.1 + h(k + 1) * 0.15 : 0.22 + h(k + 1) * 0.2);
      list.push({
        dx: Math.cos(a) * d,
        dy: Math.sin(a) * d * MIST_SQUASH,
        r: top ? 0.36 + h(k + 2) * 0.1 : 0.56 + h(k + 2) * 0.14,
        w: 0.6 + h(k + 3) * 0.7,
        ph: h(k + 4) * TAU,
        v: Math.floor(h(k + 5) * 4),
      });
    }
    return list;
  };
  pool.body = make(big ? 3 : 2, false, 10);
  pool.wisps = make(big ? 2 : 1, true, 50);
  const da = -Math.PI / 2 + (h(2) - 0.5) * 2.6, ds = 1 + h(3) * 1.5;
  pool.vx = Math.cos(da) * ds;
  pool.vy = Math.sin(da) * ds * 0.6;
  pool.emitT = 0.2 + h(4) * 0.6;
}

// The mist canvas, and the box of the world (whole pixels) it held this frame.
const MIST = { c: null, m: null, x: 0, y: 0, w: 0, h: 0 };
// The box round all the mist, grown by each piece (mistBox).
const BOX = { x0: 0, y0: 0, x1: 0, y1: 0 };
function boxAround(x, y, r) {
  if (x - r < BOX.x0) BOX.x0 = x - r;
  if (y - r < BOX.y0) BOX.y0 = y - r;
  if (x + r > BOX.x1) BOX.x1 = x + r;
  if (y + r > BOX.y1) BOX.y1 = y + r;
}

// The first piece of mist in the list draws the whole of it, the rest nothing.
function mistLead(list) {
  for (let i = 0; i < list.length; i++) if (list[i].mist) return list[i];
  return null;
}

// Every piece of mist into the mist canvas (all the bodies, then all the wisps over them), and
// the canvas onto the ground.
function layMist(g, ctx, cam) {
  const list = g.effects;
  BOX.x0 = BOX.y0 = Infinity;
  BOX.x1 = BOX.y1 = -Infinity;
  let plague = false;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!e.mist) continue;
    e.mistBox();
    if (e.w.s.plague) plague = true;
  }
  // Only what is on screen.
  const x0 = Math.max(Math.floor(BOX.x0), Math.floor(cam.x) - 1), y0 = Math.max(Math.floor(BOX.y0), Math.floor(cam.y) - 1);
  const x1 = Math.min(Math.ceil(BOX.x1), Math.ceil(cam.x + cam.W) + 1), y1 = Math.min(Math.ceil(BOX.y1), Math.ceil(cam.y + cam.H) + 1);
  MIST.w = MIST.h = 0;
  if (x1 <= x0 || y1 <= y0) return;
  const w = x1 - x0, h = y1 - y0;
  if (!MIST.c) MIST.c = makeCanvas(w, h);
  if (!MIST.m || MIST.c.width < w || MIST.c.height < h) {
    MIST.c.width = Math.max(MIST.c.width, w);
    MIST.c.height = Math.max(MIST.c.height, h);
    MIST.m = MIST.c.getContext('2d');
  }
  const m = MIST.m;
  m.globalAlpha = 1;
  m.clearRect(0, 0, w, h);
  for (let i = 0; i < list.length; i++) if (list[i].mist) list[i].drawMist(m, x0, y0, false);
  for (let i = 0; i < list.length; i++) if (list[i].mist) list[i].drawMist(m, x0, y0, true);
  m.globalAlpha = 1;
  MIST.x = x0;
  MIST.y = y0;
  MIST.w = w;
  MIST.h = h;
  blitMist(ctx, cam, plague ? MIST_PLAGUE : MIST_ALPHA);
}

// The mist canvas as drawn this frame onto the screen, a canvas pixel to an art pixel.
function blitMist(ctx, cam, a) {
  if (!MIST.w) return;
  const S = cam.S;
  ctx.globalAlpha = a;
  ctx.drawImage(MIST.c, 0, 0, MIST.w, MIST.h, Math.round((MIST.x - cam.x) * S), Math.round((MIST.y - cam.y) * S), Math.round(MIST.w * S), Math.round(MIST.h * S));
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------- pool --

// flames: the sprite (fxart.js) of the flames that burn over it, which carry its look: its ground
// (alpha) and haze (glowK) are fainter under them.
const POOL_LOOK = {
  fire: { disc: ['#be4a2f', '#733e39', '#3e2731'], parts: [PC.y, PC.o, PC.O, PC.Y], glow: '#f77622', light: 'fire', num: 'fire', flames: 'fx_flame', alpha: 0.6, glowK: 0.6 },
  hell: { disc: ['#0099db', '#124e89', '#262b44'], parts: [PC.c, PC.w, PC.U], glow: '#2ce8f5', light: 'cyan', num: 'frost', flames: 'fx_flame_hell', alpha: 0.4, glowK: 0.35 },
  holy: { disc: ['#feae34', '#be4a2f', '#3e2731'], parts: [PC.Y, PC.w, PC.y], glow: '#feae34', light: 'holy', num: 'holy' },
  // Miasma's: a mist (drawn as one with its cloud, layMist), a mote rising now and then.
  poison: { mist: true, parts: [PC.l, PC.L, PC.e], glow: '#63c74d', light: 'green', num: 'poison', dot: 'poison' },
  // Caltrops: dark ground strewn with caltrops (marks: the sprite drawn at each), no glow, hardly a spark.
  spikes: { disc: ['#3a4466', '#262b44', '#181425'], parts: [PC.G, PC.g], glow: null, light: null, num: 'normal', emit: 0.15, alpha: 0.35, marks: WEAPON_SPRITES.caltrop },
};

// A pool on the ground that the weapon w left, hurting the foes that stand in it every `tick`. It
// strikes on its weapon's hit channel, so a weapon's pools never hurt one foe twice in a tick.
// opts: kb, slow + slowT, dot (poison a second after each touch, for a poison look), critDmg
// (extra crit damage), decay (shrinks to nothing over its life, as if seeping into the ground),
// sparse (a quarter of the sparks, for the many of a trail).
export class Pool {
  constructor(g, w, x, y, R, dur, dmg, tick, style = 'fire', creep = false, opts = {}) {
    this.g = g;
    this.w = w;
    this.x = x;
    this.y = y;
    this.R = R;
    this.dur = dur;
    this.dmg = dmg;
    this.tick = tick;
    this.look = POOL_LOOK[style] || POOL_LOOK.fire;
    this.creep = creep;
    this.t = 0;
    this.tickT = 0;
    this.emitT = 0;
    this.src = w.src;
    this.kb = opts.kb ?? 0.1;
    this.slow = opts.slow || 0;
    this.slowT = opts.slowT || 0.6;
    this.dot = opts.dot || 0;
    this.critDmg = opts.critDmg || 0;
    this.decay = !!opts.decay;
    this.sparse = !!opts.sparse;
    this.mist = !!this.look.mist;
    if (this.mist) mistLayout(this);
    if (this.look.flames) this.seed = flameSeed(x, y);
    if (this.look.marks) {
      this.marks = [];
      for (let i = Math.round(4 + R * 0.35); i > 0; i--) {
        const a = rand(TAU), r = Math.sqrt(Math.random()) * R * 0.85;
        this.marks.push(Math.cos(a) * r, Math.sin(a) * r * 0.85);
      }
    }
  }

  // Its reach now: a decaying pool shrinks to nothing as its time runs out.
  get r() {
    return this.decay ? this.R * Math.max(0, 1 - this.t / this.dur) : this.R;
  }

  update(dt) {
    const g = this.g;
    this.t += dt;
    if (this.t >= this.dur) return false;
    const R = this.r;
    if (this.creep) {
      const e = g.nearestEnemy(this.x, this.y, 140);
      if (e) {
        const d = Math.hypot(e.x - this.x, e.y - this.y) || 1;
        this.x += ((e.x - this.x) / d) * 24 * dt;
        this.y += ((e.y - this.y) / d) * 24 * dt;
      }
    }
    this.tickT -= dt;
    if (this.tickT <= 0) {
      this.tickT = this.tick;
      const cands = g.grid.query(this.x, this.y, R + 12);
      for (let i = 0; i < cands.length; i++) {
        const e = cands[i];
        // By the game's clock, which runs on in a crypt where the night's stands still.
        if (e.dead || e.hitT[this.src] > g.clock) continue;
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d > R + e.r) continue;
        e.hitT[this.src] = g.clock + this.tick * 0.9;
        g.hitEnemy(e, this.dmg, { w: this.w, type: this.look.num, kb: this.kb, kx: 0, ky: 0, slow: this.slow, slowT: this.slowT, critDmg: this.critDmg });
        if (this.dot && this.look.dot) e.addDot(this.look.dot, this.dot, 1.5, this.w);
      }
    }
    this.emitT -= dt;
    if (this.mist) {
      // Now and then a mote rises slowly out of the mist.
      if (this.emitT <= 0) {
        this.emitT = (this.sparse ? 0.8 : 0.35) * rand(0.6, 1.4);
        const a = rand(TAU), r = Math.sqrt(Math.random()) * R;
        const cols = this.w.s.plague ? PLAGUE_MOTES : this.look.parts;
        g.particles.emit(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r * MIST_SQUASH, 2, rand(-3, 3), rand(-4, 1), rand(6, 14), rand(0.8, 1.4), 1, pick(cols), P.GLOW | P.FADE, 0);
      }
      return true;
    }
    const every = (0.6 / (R + 4)) / ((this.look.emit ?? 1) * (this.sparse ? 0.25 : 1));
    while (this.emitT <= 0) {
      this.emitT += every;
      const a = rand(TAU), r = Math.sqrt(Math.random()) * R;
      g.particles.emit(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r, 0, rand(-4, 4), rand(-4, 4), rand(18, 40), rand(0.3, 0.7), rand(1, 2), pick(this.look.parts), P.GLOW | P.FADE | P.SHRINK, 1);
    }
    return true;
  }

  get alpha() {
    return Math.min(1, this.t / 0.15, (this.dur - this.t) / 0.4);
  }

  // How thick a pool's mist is: in over a moment, then thinning away, slowly at first, to nothing
  // at the end of its life, so the oldest of a trail is the faintest.
  get mistA() {
    return Math.min(1, this.t / 0.2) * (1 - Math.pow(Math.min(1, this.t / this.dur), 1.5));
  }

  mistBox() {
    const t = this.t;
    boxAround(this.x + this.vx * t, this.y + this.vy * t, this.R * 1.6 + 3 + 2 * t);
  }

  // Its puffs into the mist canvas (layMist): its body, or its wisps (top), which sit a little
  // above it and rise. They billow out as it lands, then spread and swell a little as it thins.
  drawMist(m, ox, oy, top) {
    const a = this.mistA;
    if (a <= 0.01) return;
    const t = this.t, u = t / this.dur, R = this.R, plague = !!this.w.s.plague;
    const k = (plague ? 2 : 0) + (top ? 1 : 0);
    const size = (0.6 + 0.4 * ease.outCubic(Math.min(1, t / 0.4))) * (1 + 0.15 * u) * (plague ? 1.1 : 1), spread = 1 + 0.5 * u;
    const cx = this.x + this.vx * t, cy = this.y + this.vy * t - (top ? R * 0.22 + t * 2 : 0);
    const list = top ? this.wisps : this.body;
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const x = cx + f.dx * spread + Math.cos(t * f.w + f.ph) * 1.6, y = cy + f.dy * spread + Math.sin(t * f.w * 0.8 + f.ph) * 1.2;
      puff(m, ox, oy, x, y, R * f.r * size, f.v, k, top ? a * 0.75 : a);
    }
  }

  drawGround(ctx, cam) {
    if (this.mist) {
      if (mistLead(this.g.effects) === this) layMist(this.g, ctx, cam);
      return;
    }
    const R = this.r;
    const [sx, sy] = toScreen(cam, this.x, this.y);
    if (R >= 2) {
      ctx.globalAlpha = (this.look.alpha ?? 0.75) * this.alpha;
      blitCentered(ctx, discSprite(R, this.look.disc, 0.55), sx, sy, cam.S);
    }
    if (this.look.flames) poolFlames(ctx, cam, this.look.flames, this.x, this.y, R, this.t, this.seed, this.alpha);
    // Caltrops: the look's sprite (its small ground frame) at a dozen marks at most, every other one mirrored.
    if (this.marks) {
      const S = cam.S, k = R / this.R, fr = SPR[this.look.marks].frames[1], w = fr.w * S, h = fr.h * S;
      ctx.globalAlpha = this.alpha;
      for (let i = 0; i < Math.min(this.marks.length, 24); i += 2) {
        const mx = Math.round(sx + this.marks[i] * k * S - w / 2), my = Math.round(sy + this.marks[i + 1] * k * S - h / 2);
        ctx.drawImage(fr.get(i & 2), mx, my, w, h);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawGlow(ctx, cam) {
    if (this.mist) {
      if (mistLead(this.g.effects) === this) blitMist(ctx, cam, MIST_GLOW);
      const t = this.t;
      this.g.light(this.x + this.vx * t, this.y + this.vy * t, this.R * 2, this.look.light, 0.22 * this.mistA);
      return;
    }
    if (!this.look.glow) return;
    const R = this.r;
    const [sx, sy] = toScreen(cam, this.x, this.y);
    const s = R * 2.6 * cam.S;
    ctx.globalAlpha = (0.22 + Math.sin(this.t * 17) * 0.05) * this.alpha * (this.look.glowK ?? 1);
    ctx.drawImage(glow(this.look.glow), sx - s / 2, sy - s / 2, s, s);
    ctx.globalAlpha = 1;
    this.g.light(this.x, this.y, R * 3, this.look.light, 0.7 * this.alpha);
  }
}

// ------------------------------------------------------------------ orbit --

// The sparks of an enemy missile a guardian blade shatters (Orbit.update).
const BLOCK_SPARKS = [PC.y, PC.w];

export class Orbit {
  constructor(g, w) {
    this.g = g;
    this.w = w;
    this.t = 0;
    this.ang = rand(TAU);
    this.dead = false;
    this.n = w.s.amount;
    this.persistent = true;
  }

  refresh() {
    this.n = this.w.s.amount;
  }

  update(dt) {
    if (this.dead) return false;
    const g = this.g, s = this.w.s, p = g.player;
    this.t += dt;
    if (!s.eternal && this.t >= s.dur) {
      this.dead = true;
      return false;
    }
    this.ang += dt * 3.3 * s.speed;
    const R = 34 * s.area, br = 7 * s.area;
    for (let i = 0; i < this.n; i++) {
      const a = this.ang + (i / this.n) * TAU;
      const bx = p.x + Math.cos(a) * R, by = p.y + Math.sin(a) * R * 0.85;
      const cands = g.grid.query(bx, by, br + 12);
      for (let k = 0; k < cands.length; k++) {
        const e = cands[k];
        if (e.dead || e.hitT[this.w.src] > g.clock) continue;
        const rr = br + e.r;
        if ((e.x - bx) ** 2 + (e.y - by) ** 2 > rr * rr) continue;
        e.hitT[this.w.src] = g.clock + s.tick;
        g.hitEnemy(e, s.dmg, { w: this.w, kb: s.kb, kx: Math.cos(a), ky: Math.sin(a) });
      }
      if (s.block) {
        for (const shot of g.eshots) {
          if (!shot.dead && (shot.x - bx) ** 2 + (shot.y - by) ** 2 < (br + shot.r + 2) ** 2) {
            shot.dead = true;
            g.particles.burst(shot.x, shot.y, 8, 6, BLOCK_SPARKS, 60, 0.3, 1, P.GLOW | P.FADE);
          }
        }
      }
    }
    return true;
  }

  get alpha() {
    const s = this.w.s;
    if (s.eternal) return 1;
    return Math.min(1, this.t / 0.2, (s.dur - this.t) / 0.25);
  }

  draw(ctx, cam) {
    const s = this.w.s, p = this.g.player;
    const R = 34 * s.area, S = cam.S;
    const spr = SPR[s.block ? 'goldblade' : 'blade'].frames[0];
    ctx.globalAlpha = this.alpha;
    for (let i = 0; i < this.n; i++) {
      for (let ghost = 2; ghost >= 0; ghost--) {
        const a = this.ang + (i / this.n) * TAU - ghost * 0.16;
        const wx = p.x + Math.cos(a) * R, wy = p.y - 6 + Math.sin(a) * R * 0.85;
        ctx.globalAlpha = this.alpha * (ghost ? 0.22 : 1);
        blitCentered(ctx, spr.rotated(a + Math.PI / 2, 32), (wx - cam.x) * S, (wy - cam.y) * S, S * Math.min(1.3, s.area));
      }
    }
    ctx.globalAlpha = 1;
  }

  drawGlow(ctx, cam) {
    const s = this.w.s, p = this.g.player;
    const R = 34 * s.area;
    const col = s.block ? '#feae34' : '#2ce8f5';
    ctx.globalAlpha = 0.45 * this.alpha;
    for (let i = 0; i < this.n; i++) {
      const a = this.ang + (i / this.n) * TAU;
      const wx = p.x + Math.cos(a) * R, wy = p.y - 6 + Math.sin(a) * R * 0.85;
      const sx = (wx - cam.x) * cam.S, sy = (wy - cam.y) * cam.S;
      const sz = 22 * cam.S;
      ctx.drawImage(glow(col), sx - sz / 2, sy - sz / 2, sz, sz);
      if (i % 2 === 0) this.g.light(wx, wy, 30, s.block ? 'gold' : 'cyan', 0.6 * this.alpha);
    }
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------- aura --

// How a ground round the hero looks: R, its radius at area 1; num, the damage numbers' style;
// fill, rim and inner, its rings; parts, its sparks; dot, the poison it leaves on a foe.
const AURA_LOOK = {
  holy: { R: 27, num: 'holy', fill: '#feae34', rim: '#fee761', inner: '#feae34', glow: '#feae34', light: 'holy', parts: [PC.Y, PC.y] },
  // Sanctuary: the holy ground, healing.
  heal: { R: 27, num: 'holy', fill: '#63c74d', rim: '#9ee562', inner: '#feae34', glow: '#63c74d', light: 'holy', parts: [PC.Y, PC.y] },
  // Miasma: a sickly cloud a tenth smaller than Consecration's ground, a mist (layMist).
  poison: { R: 24.3, num: 'poison', mist: true, glow: '#63c74d', light: 'green', parts: [PC.l, PC.L, PC.e], dot: 'poison' },
};

// The cloud's six lobes: each its angle round him, its distance and size (of his reach R) and the
// phase it drifts and breathes at, fixed (from hash2) so the cloud is lumpy but never flickers.
// Five of 0.40-0.56 R at 0.50-0.75 R, and a sixth, smaller.
const CLOUD_LOBES = Array.from({ length: 6 }, (_, i) => {
  const h = (k) => hash2(i, k, 977);
  return {
    a: ((i + (h(1) - 0.5) * 0.5) / 6) * TAU,
    d: 0.5 + h(2) * 0.25,
    r: i < 5 ? 0.4 + h(3) * 0.16 : 0.3,
    ph: h(4) * TAU,
  };
});

export class Aura {
  constructor(g, w, style = 'holy') {
    this.g = g;
    this.w = w;
    this.style = style;
    this.tickT = 0.2;
    this.pulse = 0;
    this.dead = false;
    this.t = 0;
    this.persistent = true;
    this.mist = !!AURA_LOOK[style]?.mist;
  }

  get look() {
    return AURA_LOOK[this.w.s.heal ? 'heal' : this.style];
  }

  get R() {
    return this.look.R * this.w.s.area;
  }

  update(dt) {
    if (this.dead) return false;
    const g = this.g, s = this.w.s, p = g.player, L = this.look;
    const R = this.R;
    this.t += dt;
    this.tickT -= dt;
    this.pulse = Math.max(0, this.pulse - dt * 3);
    if (this.tickT <= 0) {
      this.tickT = s.tick;
      this.pulse = 1;
      const cands = g.grid.query(p.x, p.y, R + 12);
      let hits = 0;
      for (let i = 0; i < cands.length; i++) {
        const e = cands[i];
        if (e.dead) continue;
        const dx = e.x - p.x, dy = e.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d > R + e.r) continue;
        g.hitEnemy(e, s.dmg, { w: this.w, type: L.num, kb: s.kb, kx: dx / (d || 1), ky: dy / (d || 1) });
        if (s.slow) {
          e.slowT = Math.max(e.slowT, 0.6);
          e.slowF = Math.max(e.slowF, s.slow);
        }
        if (s.dot && L.dot) e.addDot(L.dot, s.dot, 1.5, this.w);
        hits++;
      }
      if (s.heal && hits) p.healPool = Math.min(20, p.healPool + Math.min(hits, 8) * 0.22);
    }
    if (this.mist) {
      // A mist: now and then a mote rising slowly out of it.
      if (Math.random() < dt * (3 + R * 0.1)) {
        const a = rand(TAU), r = Math.sqrt(Math.random()) * R;
        g.particles.emit(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * MIST_SQUASH, 2, rand(-3, 3), rand(-4, 1), rand(6, 14), rand(0.9, 1.5), 1, pick(s.plague ? PLAGUE_MOTES : L.parts), P.GLOW | P.FADE, 0);
      }
    } else if (Math.random() < dt * (10 + R * 0.4)) {
      const a = rand(TAU), r = Math.sqrt(Math.random()) * R;
      g.particles.emit(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 0, 0, 0, rand(15, 35), rand(0.5, 0.9), 1, pick(L.parts), P.GLOW | P.FADE, 0);
    }
    return true;
  }

  mistBox() {
    const p = this.g.player;
    boxAround(p.x, p.y, this.R * 1.5 + 3);
  }

  // The cloud's puffs into the mist canvas (layMist). Its body: a puff at his feet and six lobes
  // round it (CLOUD_LOBES), each at a distance and of a size of its own, drifting on its own and
  // breathing in its own time, the whole turning very slowly and swelling a touch as the poison
  // strikes; its wisps (top): three turning the other way, slower still, a little above the ground.
  drawMist(m, ox, oy, top) {
    const p = this.g.player, R = this.R, t = this.t, plague = !!this.w.s.plague;
    const k = (plague ? 2 : 0) + (top ? 1 : 0), thick = plague ? 1.08 : 1;
    if (!top) {
      const swell = (1 + this.pulse * 0.04) * thick, turn = t * 0.1;
      puff(m, ox, oy, p.x, p.y + R * 0.04, R * 0.62 * swell, 0, k, 1);
      for (let i = 0; i < CLOUD_LOBES.length; i++) {
        const L = CLOUD_LOBES[i], a = L.a + turn;
        const x = p.x + Math.cos(a) * L.d * R + Math.cos(t * 0.5 + L.ph) * R * 0.08;
        const y = p.y + (Math.sin(a) * L.d * R + Math.sin(t * 0.37 + L.ph) * R * 0.06) * MIST_SQUASH;
        const r = R * (L.r + 0.03 * Math.sin(t * 1.1 + L.ph)) * swell;
        puff(m, ox, oy, x, y, r, i & 3, k, 1);
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const a = -t * 0.225 + (i / 3) * TAU + 0.6, d = R * 0.4;
        const r = R * (0.32 + 0.05 * Math.sin(t * 1.7 + i * 1.9)) * thick;
        puff(m, ox, oy, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * MIST_SQUASH - R * 0.18, r, (i + 2) & 3, k, 0.75);
      }
    }
  }

  drawGround(ctx, cam) {
    if (this.mist) {
      if (mistLead(this.g.effects) === this) layMist(this.g, ctx, cam);
      return;
    }
    const p = this.g.player, L = this.look;
    const R = this.R;
    const [sx, sy] = toScreen(cam, p.x, p.y);
    ctx.globalAlpha = 0.14 + this.pulse * 0.1;
    blitCentered(ctx, ringSprite(R, L.fill, 99), sx, sy, cam.S);
    ctx.globalAlpha = 0.55 + this.pulse * 0.45;
    blitCentered(ctx, ringSprite(R, L.rim, 1), sx, sy, cam.S);
    const r2 = R * (0.55 + 0.15 * Math.sin(this.t * 2));
    ctx.globalAlpha = 0.25;
    blitCentered(ctx, ringSprite(r2, L.inner, 1), sx, sy, cam.S);
    ctx.globalAlpha = 1;
  }

  drawGlow(ctx, cam) {
    const p = this.g.player, L = this.look;
    const R = this.R;
    if (this.mist) {
      if (mistLead(this.g.effects) === this) blitMist(ctx, cam, MIST_GLOW);
      this.g.light(p.x, p.y, R * 2.2, L.light, 0.35 + this.pulse * 0.15);
      return;
    }
    const [sx, sy] = toScreen(cam, p.x, p.y);
    const sz = R * 2.6 * cam.S;
    ctx.globalAlpha = 0.12 + this.pulse * 0.18;
    ctx.drawImage(glow(L.glow), sx - sz / 2, sy - sz / 2, sz, sz);
    ctx.globalAlpha = 1;
    this.g.light(p.x, p.y, R * 2.4, L.light, 0.45 + this.pulse * 0.3);
  }
}

// ------------------------------------------------------------------- bolt --

// A lightning bolt between two points ('sky': down from the sky, 'chain': foe to foe), or a
// straight ray ('ray': Arcane Ray's beam, no jitter and no fork, in its colour and a pink core).
export class Bolt {
  constructor(g, pts, style = 'chain', color = '#2ce8f5') {
    this.g = g;
    this.a = pts[0];
    this.b = pts[1];
    this.style = style;
    this.color = color;
    this.straight = style === 'ray';
    this.t = 0;
    this.dur = style === 'sky' ? 0.24 : this.straight ? 0.22 : 0.18;
    this.jitter();
    // A bolt from the sky is drawn from art (fxart.js), leaning the way this one comes down; it
    // keeps only its light. A chain's leaves a splash of sparks on each foe it leaps to.
    this.art = style === 'sky';
    // So the horde still reads in a storm: at most 6 strikes on screen at once, and a chain's
    // splash only while fewer than 3 are.
    if (this.art) fxBurst(g, 'fx_lightning', this.b.x, this.b.y + 4, { fps: 24, glow: true, alpha: 0.9, flip: this.a.x > this.b.x, cap: 6, span: 0.42 });
    else if (style === 'chain') fxBurst(g, 'fx_lightning', this.b.x, this.b.y + 5, { from: 6, fps: 20, glow: true, alpha: 0.7, flip: this.a.x > this.b.x, cap: 3, span: 0.42 });
  }

  jitter() {
    const { a, b } = this;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = this.straight ? 1 : Math.max(3, Math.round(len / 7));
    const nx = -(b.y - a.y) / (len || 1), ny = (b.x - a.x) / (len || 1);
    const amp = this.style === 'sky' ? 7 : 4;
    this.pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const o = i === 0 || i === n ? 0 : rand(-amp, amp);
      this.pts.push(lerp(a.x, b.x, u) + nx * o, lerp(a.y, b.y, u) + ny * o);
    }
    if (this.straight) {
      this.fork = null;
      return;
    }
    // One small fork.
    const k = 2 * Math.floor(rand(1, n - 1));
    this.fork = [this.pts[k], this.pts[k + 1], this.pts[k] + rand(-12, 12), this.pts[k + 1] + rand(4, 14)];
  }

  update(dt) {
    this.t += dt;
    if (!this.straight && Math.random() < dt * 25) this.jitter();
    return this.t < this.dur;
  }

  drawGlow(ctx, cam) {
    const S = cam.S;
    const fade = 1 - this.t / this.dur;
    if (this.art) {
      this.g.light(this.b.x, this.b.y, 60, 'cyan', fade);
      return;
    }
    const path = () => {
      ctx.beginPath();
      for (let i = 0; i < this.pts.length; i += 2) {
        const x = (this.pts[i] - cam.x) * S, y = (this.pts[i + 1] - cam.y) * S;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      if (!this.fork) return;
      ctx.moveTo((this.fork[0] - cam.x) * S, (this.fork[1] - cam.y) * S);
      ctx.lineTo((this.fork[2] - cam.x) * S, (this.fork[3] - cam.y) * S);
    };
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    path();
    ctx.globalAlpha = 0.35 * fade;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = S * (this.straight ? 5 : 4);
    ctx.stroke();
    if (this.straight) {
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = '#f6757a';
      ctx.lineWidth = S * 2.4;
      ctx.stroke();
    }
    ctx.globalAlpha = fade;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = S * 1.2;
    ctx.stroke();
    ctx.globalAlpha = 1;
    this.g.light(this.b.x, this.b.y, 60, this.straight ? 'purple' : 'cyan', fade);
  }
}

// ----------------------------------------------------------------- meteor --

export class Meteor {
  constructor(g, w, tx, ty, R, dmg, delay = 0, opts = {}) {
    this.g = g;
    this.w = w;
    this.tx = tx;
    this.ty = ty;
    this.R = R;
    this.dmg = dmg;
    this.t = -delay;
    this.fall = opts.fall ?? 0.6;
    this.opts = opts;
    this.sx = tx + 90;
    this.sy = ty - 210;
  }

  update(dt) {
    this.t += dt;
    if (this.t < 0) return true;
    const u = this.t / this.fall;
    if (u >= 1) {
      explode(this.g, this.tx, this.ty, this.R, this.dmg, this.w, 'fire', { kb: 2, ult: this.opts.ult, art: 'fx_firebomb' });
      if (this.opts.pool) {
        this.g.effects.push(new Pool(this.g, this.w, this.tx, this.ty, this.R * 0.75, this.opts.pool, this.dmg * 0.2, this.opts.tick || 0.35, 'fire'));
      }
      if (this.opts.ult) this.g.shake(0.3);
      return false;
    }
    const x = lerp(this.sx, this.tx, u * u), y = lerp(this.sy, this.ty, u * u);
    this.g.particles.emit(x + rand(-3, 3), y + rand(-3, 3), 0, rand(-10, 10), rand(-20, 0), 0, rand(0.25, 0.5), rand(1.5, 3), pick([PC.o, PC.y, PC.O]), P.GLOW | P.FADE | P.SHRINK, 1);
    return true;
  }

  drawGround(ctx, cam) {
    if (this.t < -0.3) return;
    const u = clamp(this.t / this.fall, 0, 1);
    const [sx, sy] = toScreen(cam, this.tx, this.ty);
    ctx.globalAlpha = 0.25 + u * 0.5;
    blitCentered(ctx, ringSprite(this.R, '#e43b44', 1), sx, sy, cam.S);
    ctx.globalAlpha = 0.15 + u * 0.2;
    blitCentered(ctx, ringSprite(Math.max(2, this.R * u), '#f77622', 99), sx, sy, cam.S);
    ctx.globalAlpha = 1;
  }

  draw(ctx, cam) {
    if (this.t < 0) return;
    const u = this.t / this.fall;
    const x = lerp(this.sx, this.tx, u * u), y = lerp(this.sy, this.ty, u * u);
    const [sx, sy] = toScreen(cam, x, y);
    blitCentered(ctx, SPR.meteor.frames[0].rotated(this.t * 8, 16), sx, sy, cam.S * (this.R > 40 ? 1.6 : 1.2));
  }

  drawGlow(ctx, cam) {
    if (this.t < 0) return;
    const u = this.t / this.fall;
    const x = lerp(this.sx, this.tx, u * u), y = lerp(this.sy, this.ty, u * u);
    const [sx, sy] = toScreen(cam, x, y);
    const s = 40 * cam.S;
    ctx.drawImage(glow('#f77622'), sx - s / 2, sy - s / 2, s, s);
    this.g.light(x, y, 60, 'fire', 1);
  }
}

// ----------------------------------------------------------------- thorns --

const THORN_RISE = 0.07, THORN_HOLD = 0.4, THORN_SINK = 0.15;
const DIRT = ['#3e2731', '#3e2731', '#733e39'];
// What bursts from the ground: frames of a sprite (alternating along the line), and the sparks
// it kicks up. Bramble's thorns, Briarheart's iron.
const THORN_LOOK = {
  bramble: { sprite: 'thorn', frames: [0, 1], parts: [PC.m, PC.b, PC.e] },
  iron: { sprite: 'thorn', frames: [2, 3], parts: [PC.m, PC.R, PC.N] },
};

// A line of thorns bursting from the ground one after another, snaring all
// they pierce. Each line hits a foe once.
export class Thorns {
  constructor(g, w, x, y, ang) {
    this.g = g;
    this.w = w;
    this.t = 0;
    this.iron = !!w.s.ring;
    this.look = THORN_LOOK[this.iron ? 'iron' : 'bramble'];
    this.sc = clamp(w.s.area, 1, 1.6);
    this.kx = Math.cos(ang);
    this.ky = Math.sin(ang);
    this.hit = new Set();
    this.spikes = [];
    const step = 9 * w.s.area;
    for (let i = 0; i < w.s.len; i++) {
      const sx = x + this.kx * step * (i + 1), sy = y + this.ky * step * (i + 1);
      if (g.world.solid(sx, sy)) break; // roots don't grow through walls
      this.spikes.push({ x: sx + rand(-2, 2), y: sy + rand(-2, 2), at: i * 0.035, up: false, f: this.look.frames[i % 2] });
    }
    this.end = this.spikes.length ? this.spikes[this.spikes.length - 1].at + THORN_RISE + THORN_HOLD + THORN_SINK : 0;
  }

  update(dt) {
    const g = this.g, w = this.w;
    this.t += dt;
    for (const s of this.spikes) {
      if (s.up || this.t < s.at) continue;
      s.up = true;
      const R = 8 * w.s.area;
      const cands = g.grid.query(s.x, s.y, R + 16);
      for (let i = 0; i < cands.length; i++) {
        const e = cands[i];
        if (e.dead || this.hit.has(e.id)) continue;
        if (Math.hypot(e.x - s.x, e.y - s.y) > R + e.r) continue;
        this.hit.add(e.id);
        g.hitEnemy(e, w.s.dmg, { w, kb: w.s.kb, kx: this.kx, ky: this.ky, slow: w.s.slow, slowT: this.iron ? 2.4 : 1.6 });
      }
      g.particles.burst(s.x, s.y, 1, 4, this.look.parts, 45, 0.35, 1, P.FADE, { vz: 50 });
    }
    return this.t < this.end;
  }

  height(s) {
    const lt = this.t - s.at;
    if (lt < 0) return 0;
    if (lt < THORN_RISE) return lt / THORN_RISE;
    return clamp(1 - (lt - THORN_RISE - THORN_HOLD) / THORN_SINK, 0, 1);
  }

  drawGround(ctx, cam) {
    const img = discSprite(4 * this.sc, DIRT, 0.5);
    for (const s of this.spikes) {
      const u = this.height(s);
      if (u <= 0) continue;
      const [sx, sy] = toScreen(cam, s.x, s.y);
      ctx.globalAlpha = 0.6 * u;
      blitCentered(ctx, img, sx, sy, cam.S);
    }
    ctx.globalAlpha = 1;
  }

  draw(ctx, cam) {
    const S = cam.S * this.sc;
    for (const s of this.spikes) {
      const u = this.height(s);
      if (u <= 0) continue;
      // Crop from the tip down so the thorn grows out of the ground.
      const img = SPR[this.look.sprite].frames[s.f].c;
      const hh = Math.max(1, Math.round(img.height * u));
      const [sx, sy] = toScreen(cam, s.x, s.y);
      ctx.drawImage(img, 0, 0, img.width, hh, Math.round(sx - (img.width * S) / 2), Math.round(sy + S - hh * S), Math.round(img.width * S), Math.round(hh * S));
    }
  }
}

// ------------------------------------------------------------------- ring --

export class Ring {
  constructor(g, x, y, r0, r1, dur, color, follow = false, thick = 2) {
    Object.assign(this, { g, x, y, r0, r1, dur, color, follow, thick });
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    if (this.follow) {
      this.x = this.g.player.x;
      this.y = this.g.player.y;
    }
    return this.t < this.dur;
  }

  drawGlow(ctx, cam) {
    const u = this.t / this.dur;
    const r = lerp(this.r0, this.r1, ease.outCubic(u));
    const [sx, sy] = toScreen(cam, this.x, this.y);
    ctx.globalAlpha = 1 - u;
    blitCentered(ctx, ringSprite(r, this.color, this.thick), sx, sy, cam.S);
    ctx.globalAlpha = 1;
  }
}

// -------------------------------------------------------------- telegraph --

export class Telegraph {
  constructor(g, o) {
    this.g = g;
    this.o = o;
    this.t = 0;
    // Whom it follows, by the id of that spawn: a dead foe's body goes back to the pool and
    // comes out again as another monster, with a new id.
    this.followId = o.follow ? o.follow.id : null;
  }

  update(dt) {
    this.t += dt;
    const f = this.o.follow;
    if (f) {
      // Its caster fell: the warning goes with it, and nothing lands.
      if (f.dead || f.id !== this.followId) return false;
      this.o.x = f.x;
      this.o.y = f.y;
    }
    if (this.t >= this.o.dur) {
      if (this.o.onDone) this.o.onDone();
      return false;
    }
    return true;
  }

  drawGround(ctx, cam) {
    const o = this.o, S = cam.S;
    const u = this.t / o.dur;
    const blink = 0.55 + 0.45 * Math.sin(this.t * 30);
    if (o.shape === 'circle') {
      const [sx, sy] = toScreen(cam, o.x, o.y);
      ctx.globalAlpha = 0.18 + 0.2 * u;
      blitCentered(ctx, ringSprite(o.r, o.color || '#e43b44', 99), sx, sy, S);
      ctx.globalAlpha = 0.35 + 0.4 * u;
      blitCentered(ctx, ringSprite(Math.max(1, o.r * u), '#ff0044', 99), sx, sy, S);
      ctx.globalAlpha = blink;
      blitCentered(ctx, ringSprite(o.r, '#ff0044', 1), sx, sy, S);
    } else if (o.shape === 'line') {
      const [ax, ay] = toScreen(cam, o.x, o.y);
      const ang = o.ang, len = o.len * S, wid = o.w * S;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(ang);
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#e43b44';
      ctx.fillRect(0, -wid / 2, len, wid);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#ff0044';
      ctx.fillRect(0, -wid / 2, len * u, wid);
      ctx.globalAlpha = blink * 0.8;
      ctx.fillRect(0, -wid / 2, len, S);
      ctx.fillRect(0, wid / 2 - S, len, S);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------- beam --

export class Beam {
  constructor(g, x, y, color = '#fee761', dur = 0.9, h = 110) {
    Object.assign(this, { g, x, y, color, dur, h });
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    return this.t < this.dur;
  }

  drawGlow(ctx, cam) {
    const u = this.t / this.dur;
    const [sx, sy] = toScreen(cam, this.x, this.y);
    const img = beamSprite(this.color);
    const w = img.width * cam.S * (1 + u * 0.6) * (u < 0.1 ? u * 10 : 1);
    const h = this.h * cam.S;
    ctx.globalAlpha = 1 - u * u;
    ctx.drawImage(img, sx - w / 2, sy - h, w, h);
    ctx.globalAlpha = 1;
    this.g.light(this.x, this.y - 10, 80, 'holy', 1 - u);
  }
}

// -------------------------------------------------------------- ultimates --

// Knight: a spinning storm of steel around the hero.
export class Whirl {
  constructor(g, dur) {
    this.g = g;
    this.dur = dur;
    this.t = 0;
    this.tickT = 0;
    this.ang = 0;
  }

  update(dt) {
    const g = this.g, p = g.player;
    this.t += dt;
    this.ang += dt * 16;
    this.tickT -= dt;
    const R = 46 * p.area;
    if (this.tickT <= 0) {
      this.tickT = 0.12;
      const cands = g.grid.query(p.x, p.y, R + 12);
      for (let i = 0; i < cands.length; i++) {
        const e = cands[i];
        if (e.dead) continue;
        const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
        if (d > R + e.r) continue;
        g.hitEnemy(e, 22, { type: 'normal', kb: 1.6, kx: dx / (d || 1), ky: dy / (d || 1), ult: true });
      }
      sfx('slash', { pitch: rand(1.1, 1.4) });
    }
    if (Math.random() < 0.7) {
      const a = rand(TAU);
      g.particles.emit(p.x + Math.cos(a) * R * 0.8, p.y + Math.sin(a) * R * 0.8, 6, -Math.sin(a) * 120, Math.cos(a) * 120, 0, 0.25, 1, PC.G, P.FADE, 4);
    }
    return this.t < this.dur;
  }

  draw(ctx, cam) {
    const p = this.g.player;
    const R = 46 * p.area;
    for (let k = 0; k < 2; k++) {
      const a = this.ang + k * Math.PI;
      const ai = ((Math.round((a / TAU) * 32) % 32) + 32) % 32;
      const img = slashFrame(R, 2.6, ai, 3, 6, STEEL);
      const [sx, sy] = toScreen(cam, p.x, p.y - 7);
      ctx.globalAlpha = 0.85;
      blitCentered(ctx, img, sx, sy, cam.S);
    }
    ctx.globalAlpha = 1;
  }

  drawGlow(ctx, cam) {
    const p = this.g.player;
    const [sx, sy] = toScreen(cam, p.x, p.y - 6);
    const s = 120 * cam.S * p.area;
    ctx.globalAlpha = 0.25;
    ctx.drawImage(glow('#c0cbdc'), sx - s / 2, sy - s / 2, s, s);
    ctx.globalAlpha = 1;
  }
}

// What an arrow of the storm throws up where it lands (ArrowRain.update).
const ARROW_SPLINTERS = [PC.B, PC.T, PC.G];
const ARROW_FALL = { vz: 50, grav: 200 };

// Archer: arrows fall from the sky on every visible foe.
export class ArrowRain {
  constructor(g, dur) {
    this.g = g;
    this.dur = dur;
    this.t = 0;
    this.spawnT = 0;
    this.drops = [];
  }

  update(dt) {
    const g = this.g;
    this.t += dt;
    this.spawnT -= dt;
    if (this.t < this.dur) {
      // Who is on screen, looked up once for all the arrows loosed this frame: nothing in between
      // moves or fells a foe.
      let list = null;
      while (this.spawnT <= 0) {
        this.spawnT += 0.035;
        list ??= g.enemiesOnScreen();
        const e = list.length ? pick(list) : null;
        const p = g.player;
        const x = e ? e.x + rand(-4, 4) : p.x + rand(-g.cam.W / 2, g.cam.W / 2);
        const y = e ? e.y + rand(-4, 4) : p.y + rand(-g.cam.H / 2, g.cam.H / 2);
        this.drops.push({ x, y, t: 0 });
      }
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.t += dt;
      if (d.t >= 0.22) {
        this.drops.splice(i, 1);
        const cands = g.grid.query(d.x, d.y, 18);
        for (const e of cands) {
          if (e.dead || Math.hypot(e.x - d.x, e.y - d.y) > 9 + e.r) continue;
          g.hitEnemy(e, 26, { type: 'normal', kb: 0.6, kx: 0, ky: 1, crit: 0.15, ult: true });
        }
        g.particles.burst(d.x, d.y, 1, 4, ARROW_SPLINTERS, 40, 0.3, 1, P.FADE | P.GROUND, ARROW_FALL);
        if (Math.random() < 0.3) sfx('arrow', { pitch: rand(1.2, 1.6) });
      }
    }
    return this.t < this.dur || this.drops.length > 0;
  }

  draw(ctx, cam) {
    const img = SPR.arrow.frames[0].rotated(Math.PI / 2, 32), sh = shadowSprite(5), S = cam.S;
    for (const d of this.drops) {
      const u = d.t / 0.22;
      // The arrow on its way down, and its shadow on the ground where it will land.
      const sx = (d.x - cam.x) * S, sy = (d.y - (1 - u) * 140 - cam.y) * S;
      blitCentered(ctx, img, sx, sy - 6 * S, S);
      ctx.globalAlpha = 0.3 + u * 0.4;
      blitCentered(ctx, sh, sx, (d.y - cam.y) * S, S);
      ctx.globalAlpha = 1;
    }
  }
}

// Rogue: a vanishing act with blades flying everywhere.
export class ShadowDance {
  constructor(g, dur) {
    this.g = g;
    this.dur = dur;
    this.t = 0;
    this.k = 0;
  }

  update(dt) {
    const g = this.g, p = g.player;
    this.t += dt;
    this.k -= dt;
    while (this.k <= 0 && this.t < this.dur) {
      this.k += 0.05;
      for (let i = 0; i < 2; i++) danceBlade(g, p.x, p.y, rand(TAU));
    }
    if (Math.random() < 0.5) g.particles.emit(p.x + rand(-5, 5), p.y - rand(0, 14), 0, 0, 0, rand(10, 20), 0.5, 2, pick([PC.p, PC.q, PC.P]), P.FADE | P.GLOW, 0);
    return this.t < this.dur;
  }
}

// ------------------------------------------ the four of 20 October 2026 --

// What the strong shrug off: a boss or a crypt's lord held by roots or stunned is only slowed, by
// HELD_SLOW, for as long. Everything else stands where it is (Enemy.rootT, Enemy.stunT).
export const HELD_SLOW = 0.5;
export function rootFoe(e, t) {
  if (e.dead || e.prop) return;
  if (e.boss || e.lord) {
    e.slowT = Math.max(e.slowT, t);
    e.slowF = Math.max(e.slowF, HELD_SLOW);
  } else e.rootT = Math.max(e.rootT, t);
}
// Stunned: held, and it strikes nothing that touches it (Enemy.update).
export function stunFoe(e, t) {
  if (e.dead || e.prop) return;
  rootFoe(e, t);
  if (!e.boss && !e.lord) e.stunT = Math.max(e.stunT, t);
}
// Smite's brand: k more from every blow (Game.hitEnemy) for BRAND_TIME s; a deeper one holds.
export function brandFoe(e, k) {
  if (e.dead || e.prop) return;
  e.brandK = e.brandT > 0 ? Math.max(e.brandK, k) : k;
  e.brandT = BRAND_TIME;
}

// Smite and Judgement: after `delay` a pillar of light falls on a foe (following it till then),
// striking it and, for a little less, all round it within its splash; all it strikes is branded.
export const SMITE = { R: 22, splash: 0.75 };
export class Pillar {
  constructor(g, w, target, delay = 0) {
    this.g = g;
    this.w = w;
    this.target = target;
    this.id = target.id;
    this.x = target.x;
    this.y = target.y;
    this.t = -delay;
    this.struck = false;
  }

  get R() {
    return SMITE.R * this.w.s.area;
  }

  update(dt) {
    const g = this.g, w = this.w, s = w.s;
    this.t += dt;
    if (!this.struck) {
      const e = this.target, on = !e.dead && e.id === this.id;
      if (on) {
        this.x = e.x;
        this.y = e.y;
      }
      if (this.t < 0) return true;
      this.struck = true;
      const R = this.R;
      const cands = g.grid.query(this.x, this.y, R + 14);
      for (let i = 0; i < cands.length; i++) {
        const f = cands[i];
        if (f.dead) continue;
        const dx = f.x - this.x, dy = f.y - this.y, d = Math.hypot(dx, dy);
        const main = on && f === e;
        if (!main && d > R + f.r) continue;
        g.hitEnemy(f, main ? s.dmg : s.dmg * SMITE.splash, { w, type: 'holy', kb: s.kb, kx: dx / (d || 1), ky: dy / (d || 1) });
        brandFoe(f, s.brand);
      }
      g.effects.push(new Beam(g, this.x, this.y + 1, '#fee761', 0.42, 130));
      g.effects.push(new Ring(g, this.x, this.y, 3, R, 0.3, '#fee761', false, 2));
      g.particles.burst(this.x, this.y, 4, 14, [PC.Y, PC.y, PC.w], R * 3.5, 0.45, 1, P.GLOW | P.FADE, { flat: 0.8, vz: 60 });
      sfx('zap', { pitch: rand(0.55, 0.7), pan: clamp((this.x - g.player.x) / 200, -1, 1) });
    }
    return this.t < 0.3;
  }

  drawGround(ctx, cam) {
    const [sx, sy] = toScreen(cam, this.x, this.y);
    if (!this.struck) {
      // The spot it is about to strike, gathering light.
      if (this.t < -0.25) return;
      ctx.globalAlpha = 0.4;
      blitCentered(ctx, ringSprite(this.R * (1 - this.t * 2), '#fee761', 1), sx, sy, cam.S);
    } else {
      ctx.globalAlpha = 0.45 * (1 - clamp(this.t / 0.3, 0, 1));
      blitCentered(ctx, ringSprite(this.R * 0.8, '#fee761', 99), sx, sy, cam.S);
    }
    ctx.globalAlpha = 1;
  }
}

// How a root of Snaring Roots grows: it tunnels (unseen but for a ripple of dirt) at TUNNEL px/s,
// TUNNEL_MOST s at most, and bursts up where it reaches its foe; each root of the grip rises over
// ROOT_RISE s and withers over the last ROOT_SINK s of the hold.
const TUNNEL = 210, TUNNEL_MOST = 1.1, ROOT_RISE = 0.1, ROOT_SINK = 0.25;
const ROOT_DIRT = [PC.m, PC.b, PC.B];
// A root sprite's frame for a root ROOT s into its life, with left s to go: rising, grown,
// withering, gone (the art's frames in turn, as many as it has).
function rootFrame(spr, lt, left) {
  const n = spr.frames.length;
  return lt < ROOT_RISE ? 0 : left > ROOT_SINK ? Math.min(1, n - 1) : left > ROOT_SINK / 2 ? Math.min(2, n - 1) : n - 1;
}
// A root drawn growing out of the ground at (x, y): u of its height shows, from its tip down.
function drawRoot(ctx, cam, img, x, y, u, sc = 1) {
  const S = cam.S * sc, hh = Math.max(1, Math.round(img.height * u));
  const sx = (x - cam.x) * cam.S, sy = (y - cam.y) * cam.S;
  ctx.drawImage(img, 0, 0, img.width, hh, Math.round(sx - (img.width * S) / 2), Math.round(sy + S - hh * S), Math.round(img.width * S), Math.round(hh * S));
}

// One root of Snaring Roots or World Root: from (x, y) under the ground to `target`, striking
// nothing on its way; where it surfaces it grips every foe within reach (Grip).
export class Burrow {
  constructor(g, w, x, y, target, delay = 0) {
    this.g = g;
    this.w = w;
    this.x = x;
    this.y = y;
    this.target = target;
    this.id = target.id;
    this.tx = target.x;
    this.ty = target.y;
    this.t = -delay;
    this.trailT = 0;
  }

  update(dt) {
    const g = this.g, e = this.target;
    this.t += dt;
    if (this.t < 0) return true;
    if (!e.dead && e.id === this.id) {
      this.tx = e.x;
      this.ty = e.y;
    }
    const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
    const step = TUNNEL * this.w.s.speed * dt;
    let up = this.t > TUNNEL_MOST;
    if (d <= step + 2) {
      this.x = this.tx;
      this.y = this.ty;
      up = true;
    } else if (!up) {
      const nx = this.x + (dx / d) * step, ny = this.y + (dy / d) * step;
      // A wall stops it: it bursts up at the foot of it.
      if (g.world.solid(nx, ny)) up = true;
      else {
        this.x = nx;
        this.y = ny;
      }
    }
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = 0.03;
      g.particles.emit(this.x + rand(-2, 2), this.y + rand(-1, 1), 0, rand(-12, 12), rand(-6, 6), rand(20, 45), 0.35, 1, pick(ROOT_DIRT), P.GROUND | P.FADE, 2, 250);
    }
    if (!up) return true;
    g.effects.push(new Grip(g, this.w, this.x, this.y));
    return false;
  }
}

// Where a root surfaces: every foe within R is struck and held for the weapon's hold (the
// Hourglass's longer); roots stand round the spot as long, then wither.
export const GRIP = { R: 18 };
export class Grip {
  constructor(g, w, x, y) {
    const s = w.s;
    this.g = g;
    this.w = w;
    this.x = x;
    this.y = y;
    this.t = 0;
    this.R = GRIP.R * s.area;
    this.dur = s.hold * g.player.duration;
    this.sc = clamp(s.area * 0.85, 1, 1.4);
    const cands = g.grid.query(x, y, this.R + 14);
    for (let i = 0; i < cands.length; i++) {
      const e = cands[i];
      if (e.dead) continue;
      if (Math.hypot(e.x - x, e.y - y) > this.R + e.r) continue;
      g.hitEnemy(e, s.dmg, { w, type: 'normal', kb: 0 });
      rootFoe(e, this.dur);
    }
    // The roots: one in the middle and a ring of them round it, more for a wider grip.
    const n = Math.round(3 + this.R / 6);
    this.roots = [{ x, y: y + 1, at: 0, flip: false }];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand(-0.3, 0.3), r = this.R * rand(0.5, 0.9);
      this.roots.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.7, at: rand(0, 0.08), flip: Math.cos(a) < 0 });
    }
    this.roots.sort((a, b) => a.y - b.y);
    g.particles.burst(x, y, 2, 14, ROOT_DIRT, this.R * 4, 0.5, 1, P.GROUND | P.FADE, { vz: 80, grav: 300 });
    sfx('wood', { pitch: rand(0.45, 0.6), pan: clamp((x - g.player.x) / 200, -1, 1) });
  }

  update(dt) {
    this.t += dt;
    return this.t < this.dur;
  }

  drawGround(ctx, cam) {
    const [sx, sy] = toScreen(cam, this.x, this.y);
    ctx.globalAlpha = 0.5 * clamp((this.dur - this.t) / ROOT_SINK, 0, 1);
    blitCentered(ctx, discSprite(this.R * 0.7, DIRT, 0.5), sx, sy, cam.S);
    ctx.globalAlpha = 1;
  }

  draw(ctx, cam) {
    const spr = SPR[WEAPON_SPRITES.root];
    if (!spr) return;
    const left = this.dur - this.t;
    for (const r of this.roots) {
      const lt = this.t - r.at;
      if (lt < 0) continue;
      drawRoot(ctx, cam, spr.frames[rootFrame(spr, lt, left)].get(r.flip), r.x, r.y, Math.min(1, lt / ROOT_RISE), this.sc);
    }
  }
}

const BLOOD = ['#3e2731', '#a22633', '#e43b44', '#f6757a', '#ffffff'];

// One chop of the Twin Axes (and Bloodstorm), and of Red Frenzy: the axes sweep all round the
// hero where he stands, striking every foe within R. o.ult: Red Frenzy's (no weapon's).
export class Chop {
  constructor(g, w, R, dmg, o = {}) {
    const p = g.player;
    this.g = g;
    this.x = p.x;
    this.y = p.y;
    this.R = Math.round(R);
    this.t = 0;
    this.dur = 0.2;
    this.ai = Math.floor(rand(32));
    const cands = g.grid.query(this.x, this.y, R + 14);
    for (let i = 0; i < cands.length; i++) {
      const e = cands[i];
      if (e.dead) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
      if (d > R + e.r) continue;
      g.hitEnemy(e, dmg, { w, type: 'normal', kb: o.kb ?? (w ? w.s.kb : 1), kx: dx / (d || 1), ky: dy / (d || 1), ult: o.ult });
    }
    g.particles.burst(this.x, this.y, 5, 6, [PC.r, PC.R, PC.G], R * 3, 0.3, 1, P.FADE, { flat: 0.9, vz: 30 });
    if (!o.quiet) sfx('slash', { pitch: rand(0.7, 0.85) });
  }

  update(dt) {
    this.t += dt;
    return this.t < this.dur;
  }

  draw(ctx, cam) {
    const f = Math.min(5, Math.floor((this.t / this.dur) * 6));
    const [sx, sy] = toScreen(cam, this.x, this.y - 5);
    blitCentered(ctx, slashFrame(this.R, 6, this.ai, f, 6, BLOOD), sx, sy, cam.S);
  }
}

// Paladin: Sanctum, a dome of light round her for its time. Foes in it are stunned (bosses and
// lords slowed) and burn; she heals SANCTUM.heal of her health a second (Devotion's more).
export const SANCTUM = { R: 64, tick: 0.25, dmg: 12, heal: 0.04 };
export class Sanctum {
  constructor(g, dur) {
    this.g = g;
    this.dur = dur;
    this.t = 0;
    this.tickT = 0;
    this.healT = 0;
  }

  get R() {
    return SANCTUM.R * this.g.player.area;
  }

  get k() {
    return clamp(Math.min(this.t / 0.2, (this.dur - this.t) / 0.3), 0, 1);
  }

  update(dt) {
    const g = this.g, p = g.player, R = this.R;
    this.t += dt;
    this.tickT -= dt;
    this.healT -= dt;
    if (this.tickT <= 0 && this.t < this.dur) {
      this.tickT = SANCTUM.tick;
      const cands = g.grid.query(p.x, p.y, R + 12);
      for (let i = 0; i < cands.length; i++) {
        const e = cands[i];
        if (e.dead || Math.hypot(e.x - p.x, e.y - p.y) > R + e.r) continue;
        stunFoe(e, SANCTUM.tick + 0.1);
        g.hitEnemy(e, SANCTUM.dmg, { type: 'holy', kb: 0, ult: true });
      }
    }
    if (this.healT <= 0 && this.t < this.dur) {
      this.healT = 1;
      p.heal(p.maxHp * SANCTUM.heal);
    }
    if (Math.random() < 0.6) {
      const a = rand(TAU), r = Math.sqrt(Math.random()) * R;
      g.particles.emit(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.8, 0, 0, 0, rand(20, 40), 0.7, 1, pick([PC.Y, PC.y, PC.w]), P.GLOW | P.FADE, 0);
    }
    return this.t < this.dur;
  }

  drawGround(ctx, cam) {
    const p = this.g.player, [sx, sy] = toScreen(cam, p.x, p.y), R = this.R, k = this.k;
    ctx.globalAlpha = 0.16 * k;
    blitCentered(ctx, ringSprite(R, '#fee761', 99), sx, sy, cam.S);
    ctx.globalAlpha = (0.6 + 0.25 * Math.sin(this.t * 8)) * k;
    blitCentered(ctx, ringSprite(R, '#fee761', 2), sx, sy, cam.S);
    ctx.globalAlpha = 1;
  }

  drawGlow(ctx, cam) {
    const p = this.g.player, [sx, sy] = toScreen(cam, p.x, p.y - 10), R = this.R, k = this.k;
    const s = R * 2.6 * cam.S;
    ctx.globalAlpha = 0.3 * k;
    ctx.drawImage(glow('#feae34'), sx - s / 2, sy - s / 2, s, s);
    ctx.globalAlpha = 1;
    this.g.light(p.x, p.y, R * 2.4, 'holy', 0.9 * k);
  }
}

// Druid: Overgrowth. Vines burst over the whole screen: every foe on it is struck and rooted
// (bosses and lords slowed) for the rest of the ultimate's time, one that comes onto it while it
// lasts too; those held take a lesser blow every OVERGROWTH.tick s.
export const OVERGROWTH = { dmg: 12, late: 8, tick: 0.5, tickDmg: 4, vines: 70 };
export class Overgrowth {
  constructor(g, dur) {
    this.g = g;
    this.dur = dur;
    this.t = 0;
    this.tickT = OVERGROWTH.tick;
    this.held = new Map(); // foe -> its id when caught (a dead one's body comes back as another)
    this.vines = [];
    const c = g.cam;
    for (let i = 0; i < OVERGROWTH.vines; i++) this.vines.push({ x: c.x + rand(c.W), y: c.y + rand(c.H), at: rand(0, 0.35), flip: Math.random() < 0.5 });
    this.vines.sort((a, b) => a.y - b.y);
    this.catch(OVERGROWTH.dmg);
    g.shake(0.5);
    sfx('wood', { pitch: 0.4 });
  }

  catch(dmg) {
    const g = this.g, left = this.dur - this.t;
    for (const e of g.enemiesOnScreen()) {
      if (this.held.get(e) === e.id) continue;
      this.held.set(e, e.id);
      rootFoe(e, left);
      g.hitEnemy(e, dmg, { type: 'normal', kb: 0, ult: true });
    }
  }

  update(dt) {
    const g = this.g;
    this.t += dt;
    this.tickT -= dt;
    if (this.tickT <= 0 && this.t < this.dur) {
      this.tickT = OVERGROWTH.tick;
      for (const [e, id] of this.held) {
        if (e.dead || e.id !== id) this.held.delete(e);
        else g.hitEnemy(e, OVERGROWTH.tickDmg, { type: 'normal', kb: 0, noCrit: true, ult: true });
      }
      this.catch(OVERGROWTH.late);
    }
    return this.t < this.dur;
  }

  draw(ctx, cam) {
    const spr = SPR[WEAPON_SPRITES.root];
    if (!spr) return;
    const left = this.dur - this.t;
    for (const v of this.vines) {
      const lt = this.t - v.at;
      if (lt > 0) drawRoot(ctx, cam, spr.frames[rootFrame(spr, lt, left)].get(v.flip), v.x, v.y, Math.min(1, lt / ROOT_RISE));
    }
    const f = spr.frames[rootFrame(spr, this.t, left)];
    for (const [e, id] of this.held) if (!e.dead && e.id === id) drawRoot(ctx, cam, f.get(true), e.x + 3, e.y + 1, Math.min(1, this.t / ROOT_RISE));
  }
}

// Berserker: Red Frenzy. For its time he chops all round him every FRENZY.every s, on top of his
// weapons (which strike FRENZY.haste times as fast: Player.weaponHaste); every kill heals him
// FRENZY.heal of his health (Game.killEnemy).
export const FRENZY = { every: 0.15, R: 42, dmg: 22, haste: 2, heal: 0.03 };
export class Frenzy {
  constructor(g, dur) {
    this.g = g;
    this.dur = dur;
    this.t = 0;
    this.k = 0;
  }

  update(dt) {
    const g = this.g, p = g.player;
    this.t += dt;
    this.k -= dt;
    while (this.k <= 0 && this.t < this.dur) {
      this.k += FRENZY.every;
      g.effects.push(new Chop(g, null, FRENZY.R * p.area, FRENZY.dmg, { ult: true, kb: 0.8, quiet: Math.random() < 0.5 }));
    }
    if (Math.random() < 0.5) g.particles.emit(p.x + rand(-5, 5), p.y - rand(2, 14), 0, 0, 0, rand(10, 25), 0.5, 1, pick([PC.r, PC.x, PC.R]), P.GLOW | P.FADE, 0);
    return this.t < this.dur;
  }

  drawGlow(ctx, cam) {
    const p = this.g.player, [sx, sy] = toScreen(cam, p.x, p.y - 8), s = 70 * cam.S;
    ctx.globalAlpha = 0.25 + 0.1 * Math.sin(this.t * 14);
    ctx.drawImage(glow('#e43b44'), sx - s / 2, sy - s / 2, s, s);
    ctx.globalAlpha = 1;
    this.g.light(p.x, p.y, 70, 'red', 0.7);
  }
}

// The wicked, whom the Witch Hunter's bolts seek out first and bite deeper into (bane).
export const wicked = (e) => !!(e.boss || e.lord || e.elite || e.type === 'cultist');

// Up to n foes for her bolts: the wicked within R, nearest first, then the rest.
export function boltTargets(g, x, y, R, n) {
  const near = g.nearestEnemies(x, y, 40, R);
  return [...near.filter(wicked), ...near.filter((e) => !wicked(e))].slice(0, n);
}

// The Purifier's bolts (and Purge's) burst in silver light round each foe they strike.
export const SILVER_BURST = { R: 18, dmg: 0.4 };
function silverBurst(pr, e) {
  explode(pr.g, e.x, e.y - 2, SILVER_BURST.R, pr.dmg * SILVER_BURST.dmg, pr.w, 'silver', { kb: 0.6, ult: pr.ult });
}

// One of her heavy silver bolts from (x, y) along ang (weapons.js KINDS.crossbow, Purge): o.dmg,
// o.pierce, o.kb, o.speed, o.bane more on the wicked; o.nova: it bursts on every foe it strikes;
// o.ult: the ultimate's blow. w: the weapon it is, or null (Purge's own).
export function silverBolt(g, w, x, y, ang, o) {
  return spawnProjectile(g, {
    kind: 'bolt', sprite: WEAPON_SPRITES.silverbolt, x, y: y - 1, z: 7, ang, speed: 300 * (o.speed || 1), life: 0.9, r: 3,
    dmg: o.dmg, pierce: o.pierce, kb: o.kb, w, bane: o.bane || 0, wicked, ult: !!o.ult, trail: o.nova ? PC.w : PC.G,
    glow: o.nova ? ['#c0cbdc', 16, 'cold', 26] : null, onHit: o.nova ? silverBurst : null,
  });
}

// Witch Hunter: Purge. For its time every foe on the screen is slowed by PURGE.slow; her bolts fly
// three at once and burst (weapons.js KINDS.crossbow), reloading PURGE.haste times as fast; and
// every PURGE.every s it looses a volley of three bursting bolts of its own (PURGE.bolt) at the
// nearest of the wicked, else the nearest foe.
export const PURGE = { slow: 0.5, haste: 1.5, spread: 0.12, every: 0.4, reach: 230, bolt: { dmg: 30, pierce: 3, kb: 0.8, speed: 1.2, bane: 0.5, nova: true, ult: true } };
export class Purge {
  constructor(g, dur) {
    this.g = g;
    this.dur = dur;
    this.t = 0;
    this.k = 0;
    this.volT = 0; // the next volley of its own
  }

  update(dt) {
    const g = this.g;
    this.t += dt;
    this.k -= dt;
    if (this.k <= 0 && this.t < this.dur) {
      this.k = 0.1;
      for (const e of g.enemiesOnScreen()) {
        e.slowT = Math.max(e.slowT, 0.3);
        e.slowF = Math.max(e.slowF, PURGE.slow);
      }
    }
    this.volT -= dt;
    if (this.volT <= 0 && this.t < this.dur) {
      const p = g.player, t = boltTargets(g, p.x, p.y, PURGE.reach, 1)[0];
      this.volT = t ? PURGE.every : 0.1;
      if (t) {
        const ang = Math.atan2(t.y - p.y, t.x - p.x);
        for (const da of [-PURGE.spread, 0, PURGE.spread]) silverBolt(g, null, p.x, p.y, ang + da, PURGE.bolt);
        sfx('arrow', { pitch: rand(0.5, 0.6) });
      }
    }
    return this.t < this.dur;
  }

  drawGlow(ctx, cam) {
    const k = clamp(Math.min(this.t / 0.2, (this.dur - this.t) / 0.4), 0, 1);
    ctx.globalAlpha = 0.1 * k;
    ctx.fillStyle = '#c0cbdc';
    ctx.fillRect(0, 0, cam.pxW, cam.pxH);
    ctx.globalAlpha = 1;
    const p = this.g.player;
    this.g.light(p.x, p.y, 160, 'cold', 0.6 * k);
  }
}
