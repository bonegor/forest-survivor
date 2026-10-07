// Visual + gameplay effects: slashes, explosions, burning pools, orbiting
// blades, holy ground, lightning, meteors, telegraphs, beams and ultimates.
//
// Effect interface: update(dt) -> keep?; drawGround / draw / drawGlow(ctx, cam).

import { SPR } from '../engine/sprites.js';
import { sfx } from '../engine/audio.js';
import { rand, TAU, lerp, clamp, ease, angleDiff, pick } from '../engine/util.js';
import { ringSprite, discSprite, slashFrame, glow, beamSprite, shadowSprite } from './fxsprites.js';
import { PC, P } from './particles.js';

function blitCentered(ctx, img, sx, sy, scale) {
  const w = img.width * scale, h = img.height * scale;
  ctx.drawImage(img, Math.round(sx - w / 2), Math.round(sy - h / 2), Math.round(w), Math.round(h));
}

const toScreen = (cam, x, y) => [(x - cam.x) * cam.S, (y - cam.y) * cam.S];

// ------------------------------------------------------------------ slash --

const STEEL = ['#3a4466', '#8b9bb4', '#c0cbdc', '#ffffff'];
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

const EXPLO = {
  fire: { ring: '#fee761', glow: '#f77622', light: 'fire', parts: [PC.Y, PC.y, PC.o, PC.O], num: 'fire' },
  shock: { ring: '#ffffff', glow: '#2ce8f5', light: 'cyan', parts: [PC.w, PC.c, PC.U], num: 'shock' },
  holy: { ring: '#ffffff', glow: '#feae34', light: 'holy', parts: [PC.w, PC.Y, PC.y], num: 'holy' },
  frost: { ring: '#ffffff', glow: '#2ce8f5', light: 'cyan', parts: [PC.w, PC.c, PC.U, PC.G], num: 'frost' },
  dark: { ring: '#f6757a', glow: '#b55088', light: 'purple', parts: [PC.P, PC.p, PC.i], num: 'dark' },
  blood: { ring: '#e43b44', glow: '#a22633', light: 'red', parts: [PC.r, PC.R, PC.x], num: 'normal' },
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
  if (opts.hurtsPlayer) {
    const p = g.player;
    if (Math.hypot(p.x - x, p.y - y) < R + p.r) p.hurt(opts.hurtsPlayer);
  }
  g.effects.push(new Explosion(g, x, y, R, style));
  g.shake(Math.min(0.45, R / 110));
  sfx('explode', { size: clamp(R / 28, 0.6, 1.8), pan: clamp((x - g.player.x) / 200, -1, 1), pitch: rand(0.85, 1.1) });
}

export class Explosion {
  constructor(g, x, y, R, style) {
    this.g = g;
    this.x = x;
    this.y = y;
    this.R = R;
    this.st = EXPLO[style] || EXPLO.fire;
    this.style = style;
    this.t = 0;
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
    ctx.globalAlpha = Math.max(0, 1 - u * 1.4);
    ctx.drawImage(glow(this.st.glow), sx - s / 2, sy - s / 2, s, s);
    if (u < 0.2) {
      const c = this.R * 1.6 * cam.S;
      ctx.globalAlpha = 1 - u * 5;
      ctx.drawImage(glow('#ffffff'), sx - c / 2, sy - c / 2, c, c);
    }
    ctx.globalAlpha = 1;
    this.g.light(this.x, this.y, this.R * 4, this.st.light, 1.2 * (1 - u));
  }
}

// ------------------------------------------------------------------- pool --

const POOL_LOOK = {
  fire: { disc: ['#be4a2f', '#733e39', '#3e2731'], parts: [PC.y, PC.o, PC.O, PC.Y], glow: '#f77622', light: 'fire', num: 'fire' },
  hell: { disc: ['#0099db', '#124e89', '#262b44'], parts: [PC.c, PC.w, PC.U], glow: '#2ce8f5', light: 'cyan', num: 'frost' },
  holy: { disc: ['#feae34', '#be4a2f', '#3e2731'], parts: [PC.Y, PC.w, PC.y], glow: '#feae34', light: 'holy', num: 'holy' },
  poison: { disc: ['#63c74d', '#3e8948', '#193c3e'], parts: [PC.l, PC.L, PC.e], glow: '#63c74d', light: 'green', num: 'normal' },
};

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
    this.hostile = opts.hostile || 0; // damages the player instead
    this.src = w ? w.src : opts.src ?? 15;
  }

  update(dt) {
    const g = this.g;
    this.t += dt;
    if (this.t >= this.dur) return false;
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
      if (this.hostile) {
        const p = g.player;
        if (Math.hypot(p.x - this.x, p.y - this.y) < this.R + p.r - 2) p.hurt(this.hostile);
      } else {
        const cands = g.grid.query(this.x, this.y, this.R + 12);
        for (let i = 0; i < cands.length; i++) {
          const e = cands[i];
          if (e.dead || e.hitT[this.src] > g.time) continue;
          const d = Math.hypot(e.x - this.x, e.y - this.y);
          if (d > this.R + e.r) continue;
          e.hitT[this.src] = g.time + this.tick * 0.9;
          g.hitEnemy(e, this.dmg, { w: this.w, type: this.look.num, kb: 0.1, kx: 0, ky: 0 });
        }
      }
    }
    this.emitT -= dt;
    while (this.emitT <= 0) {
      this.emitT += 0.6 / (this.R + 4);
      const a = rand(TAU), r = Math.sqrt(Math.random()) * this.R;
      g.particles.emit(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r, 0, rand(-4, 4), rand(-4, 4), rand(18, 40), rand(0.3, 0.7), rand(1, 2), pick(this.look.parts), P.GLOW | P.FADE | P.SHRINK, 1);
    }
    return true;
  }

  get alpha() {
    return Math.min(1, this.t / 0.15, (this.dur - this.t) / 0.4);
  }

  drawGround(ctx, cam) {
    const img = discSprite(this.R, this.look.disc, 0.55);
    const [sx, sy] = toScreen(cam, this.x, this.y);
    ctx.globalAlpha = 0.75 * this.alpha;
    blitCentered(ctx, img, sx, sy, cam.S);
    ctx.globalAlpha = 1;
  }

  drawGlow(ctx, cam) {
    const [sx, sy] = toScreen(cam, this.x, this.y);
    const s = this.R * 2.6 * cam.S;
    ctx.globalAlpha = (0.22 + Math.sin(this.t * 17) * 0.05) * this.alpha;
    ctx.drawImage(glow(this.look.glow), sx - s / 2, sy - s / 2, s, s);
    ctx.globalAlpha = 1;
    this.g.light(this.x, this.y, this.R * 3, this.look.light, 0.7 * this.alpha);
  }
}

// ------------------------------------------------------------------ orbit --

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
    if (s.dur < 100 && this.t >= s.dur) {
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
        if (e.dead || e.hitT[this.w.src] > g.time) continue;
        const rr = br + e.r;
        if ((e.x - bx) ** 2 + (e.y - by) ** 2 > rr * rr) continue;
        e.hitT[this.w.src] = g.time + s.tick;
        g.hitEnemy(e, s.dmg, { w: this.w, kb: s.kb, kx: Math.cos(a), ky: Math.sin(a) });
      }
      if (s.block) {
        for (const shot of g.eshots) {
          if (!shot.dead && (shot.x - bx) ** 2 + (shot.y - by) ** 2 < (br + shot.r + 2) ** 2) {
            shot.dead = true;
            g.particles.burst(shot.x, shot.y, 8, 6, [PC.y, PC.w], 60, 0.3, 1, P.GLOW | P.FADE, {});
          }
        }
      }
    }
    return true;
  }

  get alpha() {
    const s = this.w.s;
    if (s.dur > 100) return 1;
    return Math.min(1, this.t / 0.2, (s.dur - this.t) / 0.25);
  }

  draw(ctx, cam) {
    const s = this.w.s, p = this.g.player;
    const R = 34 * s.area;
    const spr = SPR[s.block ? 'goldblade' : 'blade'].frames[0];
    ctx.globalAlpha = this.alpha;
    for (let i = 0; i < this.n; i++) {
      for (let ghost = 2; ghost >= 0; ghost--) {
        const a = this.ang + (i / this.n) * TAU - ghost * 0.16;
        const [sx, sy] = toScreen(cam, p.x + Math.cos(a) * R, p.y - 6 + Math.sin(a) * R * 0.85);
        ctx.globalAlpha = this.alpha * (ghost ? 0.22 : 1);
        blitCentered(ctx, spr.rotated(a + Math.PI / 2, 32), sx, sy, cam.S * Math.min(1.3, s.area));
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
      const [sx, sy] = toScreen(cam, wx, wy);
      const sz = 22 * cam.S;
      ctx.drawImage(glow(col), sx - sz / 2, sy - sz / 2, sz, sz);
      if (i % 2 === 0) this.g.light(wx, wy, 30, s.block ? 'gold' : 'cyan', 0.6 * this.alpha);
    }
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------- aura --

export class Aura {
  constructor(g, w) {
    this.g = g;
    this.w = w;
    this.tickT = 0.2;
    this.pulse = 0;
    this.dead = false;
    this.t = 0;
    this.persistent = true;
  }

  update(dt) {
    if (this.dead) return false;
    const g = this.g, s = this.w.s, p = g.player;
    const R = 27 * s.area;
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
        g.hitEnemy(e, s.dmg, { w: this.w, type: 'holy', kb: s.kb, kx: dx / (d || 1), ky: dy / (d || 1) });
        if (s.slow) {
          e.slowT = Math.max(e.slowT, 0.6);
          e.slowF = Math.max(e.slowF, s.slow);
        }
        hits++;
      }
      if (s.heal && hits) p.healPool = Math.min(20, p.healPool + Math.min(hits, 8) * 0.22);
    }
    if (Math.random() < dt * (10 + R * 0.4)) {
      const a = rand(TAU), r = Math.sqrt(Math.random()) * R;
      g.particles.emit(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 0, 0, 0, rand(15, 35), rand(0.5, 0.9), 1, Math.random() < 0.5 ? PC.Y : PC.y, P.GLOW | P.FADE, 0);
    }
    return true;
  }

  drawGround(ctx, cam) {
    const s = this.w.s, p = this.g.player;
    const R = 27 * s.area;
    const [sx, sy] = toScreen(cam, p.x, p.y);
    const fill = s.heal ? '#63c74d' : '#feae34';
    ctx.globalAlpha = 0.14 + this.pulse * 0.1;
    blitCentered(ctx, ringSprite(R, fill, 99), sx, sy, cam.S);
    ctx.globalAlpha = 0.55 + this.pulse * 0.45;
    blitCentered(ctx, ringSprite(R, s.heal ? '#9ee562' : '#fee761', 1), sx, sy, cam.S);
    const r2 = R * (0.55 + 0.15 * Math.sin(this.t * 2));
    ctx.globalAlpha = 0.25;
    blitCentered(ctx, ringSprite(r2, '#feae34', 1), sx, sy, cam.S);
    ctx.globalAlpha = 1;
  }

  drawGlow(ctx, cam) {
    const s = this.w.s, p = this.g.player;
    const R = 27 * s.area;
    const [sx, sy] = toScreen(cam, p.x, p.y);
    const sz = R * 2.6 * cam.S;
    ctx.globalAlpha = 0.12 + this.pulse * 0.18;
    ctx.drawImage(glow(s.heal ? '#63c74d' : '#feae34'), sx - sz / 2, sy - sz / 2, sz, sz);
    ctx.globalAlpha = 1;
    this.g.light(p.x, p.y, R * 2.4, 'holy', 0.45 + this.pulse * 0.3);
  }
}

// ------------------------------------------------------------------- bolt --

export class Bolt {
  constructor(g, pts, style = 'chain', color = '#2ce8f5') {
    this.g = g;
    this.a = pts[0];
    this.b = pts[1];
    this.style = style;
    this.color = color;
    this.t = 0;
    this.dur = style === 'sky' ? 0.24 : 0.18;
    this.jitter();
  }

  jitter() {
    const { a, b } = this;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(3, Math.round(len / 7));
    const nx = -(b.y - a.y) / (len || 1), ny = (b.x - a.x) / (len || 1);
    const amp = this.style === 'sky' ? 7 : 4;
    this.pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const o = i === 0 || i === n ? 0 : rand(-amp, amp);
      this.pts.push(lerp(a.x, b.x, u) + nx * o, lerp(a.y, b.y, u) + ny * o);
    }
    // One small fork.
    const k = 2 * Math.floor(rand(1, n - 1));
    this.fork = [this.pts[k], this.pts[k + 1], this.pts[k] + rand(-12, 12), this.pts[k + 1] + rand(4, 14)];
  }

  update(dt) {
    this.t += dt;
    if (Math.random() < dt * 25) this.jitter();
    return this.t < this.dur;
  }

  drawGlow(ctx, cam) {
    const S = cam.S;
    const fade = 1 - this.t / this.dur;
    const path = () => {
      ctx.beginPath();
      for (let i = 0; i < this.pts.length; i += 2) {
        const x = (this.pts[i] - cam.x) * S, y = (this.pts[i + 1] - cam.y) * S;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.moveTo((this.fork[0] - cam.x) * S, (this.fork[1] - cam.y) * S);
      ctx.lineTo((this.fork[2] - cam.x) * S, (this.fork[3] - cam.y) * S);
    };
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    path();
    ctx.globalAlpha = 0.35 * fade;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = S * 4;
    ctx.stroke();
    ctx.globalAlpha = fade;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = S * 1.2;
    ctx.stroke();
    ctx.globalAlpha = 1;
    this.g.light(this.b.x, this.b.y, 60, 'cyan', fade);
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
      explode(this.g, this.tx, this.ty, this.R, this.dmg, this.w, 'fire', { kb: 2, ult: this.opts.ult });
      if (this.opts.pool) {
        this.g.effects.push(new Pool(this.g, this.w, this.tx, this.ty, this.R * 0.75, this.opts.pool, this.dmg * 0.2, this.opts.tick || 0.35, 'fire'));
      }
      this.g.shake(0.3);
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
  }

  update(dt) {
    this.t += dt;
    if (this.o.follow) {
      this.o.x = this.o.follow.x;
      this.o.y = this.o.follow.y;
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
      while (this.spawnT <= 0) {
        this.spawnT += 0.035;
        const list = g.enemiesOnScreen(true);
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
        g.particles.burst(d.x, d.y, 1, 4, [PC.B, PC.T, PC.G], 40, 0.3, 1, P.FADE | P.GROUND, { vz: 50, grav: 200 });
        if (Math.random() < 0.3) sfx('arrow', { pitch: rand(1.2, 1.6) });
      }
    }
    return this.t < this.dur || this.drops.length > 0;
  }

  draw(ctx, cam) {
    const img = SPR.arrow.frames[0].rotated(Math.PI / 2, 32);
    for (const d of this.drops) {
      const u = d.t / 0.22;
      const [sx, sy] = toScreen(cam, d.x, d.y - (1 - u) * 140);
      blitCentered(ctx, img, sx, sy - 6 * cam.S, cam.S);
      const sh = shadowSprite(5);
      const [gx, gy] = toScreen(cam, d.x, d.y);
      ctx.globalAlpha = 0.3 + u * 0.4;
      blitCentered(ctx, sh, gx, gy, cam.S);
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
      for (let i = 0; i < 2; i++) {
        const a = rand(TAU);
        spawnUltDagger(g, p.x, p.y, a);
      }
    }
    if (Math.random() < 0.5) g.particles.emit(p.x + rand(-5, 5), p.y - rand(0, 14), 0, 0, 0, rand(10, 20), 0.5, 2, pick([PC.p, PC.q, PC.P]), P.FADE | P.GLOW, 0);
    return this.t < this.dur;
  }
}

let spawnUltDagger = () => {};
export function setUltDaggerSpawner(fn) {
  spawnUltDagger = fn;
}
