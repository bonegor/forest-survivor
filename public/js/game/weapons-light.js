// Four shared weapons of 22 October 2026, each with its evolution: the Lighthouse Lantern (Beacon),
// the Runestone (Runestorm), Reaper's Scythe (Harvest Moon) and Starfall (Comet Shower). Their
// firing (KINDS, merged into game/weapons.js) and the effects they leave about. Kept apart so
// that weapons.js and effects.js (which this one leans on) need no change but one line.
//
// Effect interface as in effects.js: update(dt) -> keep?; drawGround / draw / drawGlow(ctx, cam).

import { sfx } from '../engine/audio.js';
import { rand, TAU, clamp, angleDiff } from '../engine/util.js';
import { glow, glint } from './fxsprites.js';
import { PC, P } from './particles.js';
import { Ring, brandFoe } from './effects.js';

const toScreen = (cam, x, y) => [(x - cam.x) * cam.S, (y - cam.y) * cam.S];
const panOf = (g, x) => clamp((x - g.player.x) / 200, -1, 1);
// A foe the Scythe may take outright: not a boss, a lord, a champion or a prop.
const mortal = (e) => !(e.boss || e.lord || e.elite || e.prop);

// ----------------------------------------------------------------- lantern --

// The beam: its reach (px, at area 1), half-width (radians), turn (radians a second at speed 1) and
// how long a foe it lights stays marked (Beacon: Smite's brand, a shorter one).
export const LANTERN = { reach: 78, half: 0.4, spin: 1.5, mark: 1.2 };

// A cone of light turning slowly round the hero, burning whatever it sweeps over; Beacon turns
// several evenly spread beams, and marks the foes they light (brandFoe: more from every blow).
export class Lantern {
  constructor(g, w) {
    this.g = g;
    this.w = w;
    this.ang = rand(TAU);
    this.tickT = 0.1;
    this.t = 0;
    this.dead = false;
    this.persistent = true;
  }

  get reach() {
    return LANTERN.reach * this.w.s.area;
  }

  get half() {
    return Math.min(0.7, LANTERN.half * Math.sqrt(this.w.s.area));
  }

  update(dt) {
    if (this.dead) return false;
    const g = this.g, s = this.w.s, p = g.player;
    this.t += dt;
    this.ang += LANTERN.spin * s.speed * dt;
    this.tickT -= dt;
    if (this.tickT > 0) return true;
    this.tickT = s.tick;
    const R = this.reach, half = this.half, n = Math.round(s.amount);
    const cands = g.grid.query(p.x, p.y, R + 14);
    for (let i = 0; i < cands.length; i++) {
      const e = cands[i];
      if (e.dead) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
      if (d > R + e.r) continue;
      const a = Math.atan2(dy, dx), slack = half + e.r / Math.max(d, e.r);
      let lit = false;
      for (let k = 0; k < n && !lit; k++) lit = Math.abs(angleDiff(a, this.ang + (k / n) * TAU)) <= slack;
      if (!lit) continue;
      g.hitEnemy(e, s.dmg, { w: this.w, type: 'fire' });
      if (s.mark && !e.dead && !(e.brandT > LANTERN.mark)) {
        brandFoe(e, s.mark);
        e.brandT = LANTERN.mark;
      }
      if (Math.random() < 0.3) g.particles.burst(e.x, e.y - 4, 2, 5, [PC.Y, PC.y, PC.w], 40, 0.3, 1, P.GLOW | P.FADE, { vz: 30 });
    }
    return true;
  }

  drawGlow(ctx, cam) {
    const g = this.g, p = g.player, s = this.w.s, n = Math.round(s.amount), half = this.half;
    const [sx, sy] = toScreen(cam, p.x, p.y - 4);
    const R = this.reach * cam.S, col = s.mark ? '190,235,255' : '255,225,140';
    for (let k = 0; k < n; k++) {
      const a = this.ang + (k / n) * TAU;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(a);
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      gr.addColorStop(0, `rgba(${col},0.6)`);
      gr.addColorStop(0.55, `rgba(${col},0.3)`);
      gr.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, -half, half);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // The ground it lights: soft lights along the beam, wider the farther they lie.
      const key = s.mark ? 'white' : 'warm';
      for (let j = 1; j <= 4; j++) {
        const d = (j / 4) * this.reach * 0.9;
        g.light(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 14 + j * 9 * Math.sqrt(s.area), key, 0.55);
      }
    }
    g.light(p.x, p.y, 36, 'warm', 0.45);
  }
}

// ---------------------------------------------------------------- runestone --

// A glowing stone that bounces off the edges of what the camera shows, piercing every foe it
// meets (each struck again only after RUNE.again s). `kid`: one of the two Runestorm splits off.
export const RUNE = { speed: 125, r: 5, again: 0.35, kid: 0.7, spread: 0.55 };
export class Rune {
  constructor(g, w, x, y, ang, dur, kid = false) {
    this.g = g;
    this.w = w;
    this.x = x;
    this.y = y;
    const v = RUNE.speed * w.s.speed;
    this.vx = Math.cos(ang) * v;
    this.vy = Math.sin(ang) * v;
    this.dur = dur;
    this.t = 0;
    this.kid = kid;
    this.bounces = 0;
    this.r = RUNE.r * (kid ? RUNE.kid : 1);
    this.dmg = w.s.dmg * (kid ? RUNE.kid : 1);
    this.seen = new Map();
    this.spin = rand(TAU);
  }

  update(dt) {
    const g = this.g, c = g.cam, w = this.w, s = w.s;
    this.t += dt;
    this.spin += dt * 6;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // Off the edge of the screen: back in, and the other way.
    let hit = false;
    const x0 = c.x + this.r, x1 = c.x + c.W - this.r, y0 = c.y + this.r, y1 = c.y + c.H - this.r;
    if (this.x < x0) { this.x = x0; this.vx = Math.abs(this.vx); hit = true; }
    else if (this.x > x1) { this.x = x1; this.vx = -Math.abs(this.vx); hit = true; }
    if (this.y < y0) { this.y = y0; this.vy = Math.abs(this.vy); hit = true; }
    else if (this.y > y1) { this.y = y1; this.vy = -Math.abs(this.vy); hit = true; }
    if (hit) {
      sfx('shard', { pitch: rand(1.5, 1.9), pan: panOf(g, this.x) });
      g.particles.burst(this.x, this.y, 4, 4, [PC.c, PC.w, PC.U], 50, 0.3, 1, P.GLOW | P.FADE, {});
      if (++this.bounces === 1 && s.split && !this.kid) this.splitUp();
    }
    const cands = g.grid.query(this.x, this.y, this.r + 16);
    for (let i = 0; i < cands.length; i++) {
      const e = cands[i];
      if (e.dead || Math.hypot(e.x - this.x, e.y - this.y) > this.r + e.r) continue;
      const last = this.seen.get(e);
      if (last !== undefined && this.t - last < RUNE.again) continue;
      this.seen.set(e, this.t);
      const d = Math.hypot(this.vx, this.vy) || 1;
      g.hitEnemy(e, this.dmg, { w, type: 'shock', kb: s.kb ?? 0.4, kx: this.vx / d, ky: this.vy / d });
    }
    if (Math.random() < dt * 30) g.particles.emit(this.x, this.y, 0, rand(-6, 6), rand(-6, 6), rand(1, 4), 0.35, 1, PC.c, P.GLOW | P.FADE, 0);
    return this.t < this.dur;
  }

  // Runestorm: on its first bounce a stone breaks into two smaller, flying off either side of its way.
  splitUp() {
    const g = this.g, a = Math.atan2(this.vy, this.vx);
    for (const side of [-1, 1]) g.effects.push(new Rune(g, this.w, this.x, this.y, a + side * RUNE.spread, this.dur - this.t, true));
  }

  draw(ctx, cam) {
    const [sx, sy] = toScreen(cam, this.x, this.y);
    const S = cam.S, r = this.r * S, fade = clamp((this.dur - this.t) / 0.4, 0, 1);
    ctx.globalAlpha = fade;
    ctx.save();
    ctx.translate(Math.round(sx), Math.round(sy));
    ctx.rotate(this.spin);
    ctx.fillStyle = '#3a4466';
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.fillStyle = '#8b9bb4';
    ctx.fillRect(-r + S, -r + S, r * 2 - 2 * S, r * 2 - 2 * S);
    ctx.fillStyle = '#2ce8f5';
    ctx.fillRect(-S, -r * 0.6, S * 2, r * 1.2);
    ctx.fillRect(-r * 0.6, -S, r * 1.2, S * 2);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawGlow(ctx, cam) {
    const [sx, sy] = toScreen(cam, this.x, this.y);
    const sz = this.r * 6 * cam.S, fade = clamp((this.dur - this.t) / 0.4, 0, 1);
    ctx.globalAlpha = 0.7 * fade;
    ctx.drawImage(glow('#2ce8f5'), sx - sz / 2, sy - sz / 2, sz, sz);
    ctx.globalAlpha = 1;
    this.g.light(this.x, this.y, 34, 'cyan', 0.7 * fade);
  }
}

// ------------------------------------------------------------------- scythe --

// A reaping sweep once round the hero: SCYTHE.turn s a circuit at speed 1, its blade reaching
// R px at area 1. Each foe in its path is cut once and, if mortal and low enough, taken outright.
export const SCYTHE = { turn: 1.1, R: 40, pad: 0.04 };
export class Sweep {
  constructor(g, w) {
    this.g = g;
    this.w = w;
    this.dur = SCYTHE.turn / w.s.speed;
    this.t = 0;
    this.u = 0; // how far round it has come, 0 to 1
    this.a0 = g.player.aim;
    this.dir = g.player.face < 0 ? -1 : 1;
    this.struck = new Set();
  }

  get R() {
    return SCYTHE.R * this.w.s.area;
  }

  // How low a foe's health must be for the blade to take it: the base, and what the night has added.
  get threshold() {
    const s = this.w.s;
    return Math.min(s.execMax ?? s.exec, s.exec + (s.execGrow || 0) * (this.g.time / 60));
  }

  get ang() {
    return this.a0 + this.dir * this.u * TAU;
  }

  update(dt) {
    const g = this.g, w = this.w, s = w.s, p = g.player;
    const prev = this.u;
    this.t += dt;
    this.u = Math.min(1, this.t / this.dur);
    const R = this.R, thr = this.threshold;
    const cands = g.grid.query(p.x, p.y, R + 14);
    for (let i = 0; i < cands.length; i++) {
      const e = cands[i];
      if (e.dead || this.struck.has(e)) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
      if (d > R + e.r) continue;
      // Where in the circuit the blade meets it, with a little for its body.
      let f = ((Math.atan2(dy, dx) - this.a0) * this.dir) / TAU;
      f -= Math.floor(f);
      const pad = (e.r / Math.max(d, e.r)) / TAU + SCYTHE.pad;
      if (!(f >= prev - pad && f <= this.u + pad) && d > e.r + 4) continue;
      this.struck.add(e);
      g.hitEnemy(e, s.dmg, { w, type: 'normal', kb: s.kb, kx: dx / (d || 1), ky: dy / (d || 1) });
      if (!e.dead && mortal(e) && e.hp <= e.maxHp * thr) {
        w.dmgDealt += e.hp;
        g.particles.burst(e.x, e.y - 6, 8, 6, [PC.z, PC.Z, PC.x], 70, 0.45, 1, P.GLOW | P.FADE, { vz: 40 });
        g.killEnemy(e, { w });
        sfx('crit', { pitch: rand(0.6, 0.75), pan: panOf(g, e.x) });
      }
    }
    return this.u < 1;
  }

  draw(ctx, cam) {
    const p = this.g.player, S = cam.S, s = this.w.s;
    const [sx, sy] = toScreen(cam, p.x, p.y - 3);
    const R = this.R * S * 0.85, a = this.ang, moon = !!s.reap;
    const edge = moon ? '#fee761' : '#e8f4ff', mid = moon ? '#feae34' : '#8b9bb4';
    ctx.save();
    ctx.lineCap = 'butt';
    // The blade's wake: arcs behind the edge, thinner and fainter the older.
    for (let i = 0; i < 9; i++) {
      const to = a - this.dir * i * 0.13, from = to - this.dir * 0.13;
      ctx.globalAlpha = (1 - i / 9) * 0.8 * (this.u > 0.85 ? (1 - this.u) / 0.15 : 1);
      ctx.strokeStyle = i < 2 ? edge : mid;
      ctx.lineWidth = Math.max(1, (4 - i * 0.35) * S);
      ctx.beginPath();
      ctx.arc(sx, sy, R, Math.min(from, to), Math.max(from, to));
      ctx.stroke();
    }
    // The haft, from the hero to the blade's heel.
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#733e39';
    ctx.lineWidth = S;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(a) * R, sy + Math.sin(a) * R);
    ctx.stroke();
    ctx.restore();
  }

  drawGlow(ctx, cam) {
    const p = this.g.player, [sx, sy] = toScreen(cam, p.x, p.y - 3);
    const R = this.R * cam.S * 0.85, a = this.ang;
    const x = sx + Math.cos(a) * R, y = sy + Math.sin(a) * R, sz = 18 * cam.S;
    ctx.globalAlpha = 0.5;
    ctx.drawImage(glow(this.w.s.reap ? '#feae34' : '#8bd0ff'), x - sz / 2, y - sz / 2, sz, sz);
    ctx.globalAlpha = 1;
    this.g.light(p.x + Math.cos(a) * this.R * 0.85, p.y + Math.sin(a) * this.R * 0.85, 26, this.w.s.reap ? 'gold' : 'cold', 0.5);
  }
}

// ----------------------------------------------------------------- starfall --

// A star falling on a foe: from high up and to one side, a bright streak, landing after STAR.fall s
// as a small area blow in a burst of sparks.
export const STAR = { fall: 0.3, R: 13, dx: 46, h: 120, tail: 0.45 };
export class Star {
  constructor(g, w, x, y, delay = 0) {
    this.g = g;
    this.w = w;
    this.x = x;
    this.y = y;
    this.t = -delay;
    this.struck = false;
    this.big = !!w.s.comet;
    this.dur = STAR.fall;
  }

  get R() {
    return STAR.R * this.w.s.area * (this.big ? 1.25 : 1);
  }

  update(dt) {
    const g = this.g, w = this.w, s = w.s;
    this.t += dt;
    if (!this.struck && this.t >= STAR.fall) {
      this.struck = true;
      const R = this.R;
      const cands = g.grid.query(this.x, this.y, R + 14);
      for (let i = 0; i < cands.length; i++) {
        const e = cands[i];
        if (e.dead) continue;
        const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
        if (d > R + e.r) continue;
        g.hitEnemy(e, s.dmg, { w, type: 'holy', kb: s.kb, kx: dx / (d || 1), ky: dy / (d || 1) });
      }
      g.particles.burst(this.x, this.y, this.big ? 10 : 6, 8, [PC.w, PC.Y, PC.c], R * 4, 0.4, 1, P.GLOW | P.FADE, { flat: 0.6, vz: 50 });
      g.effects.push(new Ring(g, this.x, this.y, 2, R, 0.22, '#fff6b0', false, 1));
      if (Math.random() < 0.35) sfx('gem', { pitch: rand(1.3, 1.8), pan: panOf(g, this.x) });
    }
    return this.t < STAR.fall + 0.25;
  }

  drawGlow(ctx, cam) {
    if (this.t < 0) return;
    const S = cam.S;
    if (!this.struck) {
      const u = this.t / STAR.fall, k = 1 - u;
      const hx = this.x + k * STAR.dx, hy = this.y - k * STAR.h;
      const [sx, sy] = toScreen(cam, hx, hy);
      // The streak behind the head, back along the way it came, fading out.
      const tx = sx + STAR.dx * STAR.tail * S, ty = sy - STAR.h * STAR.tail * S;
      const gr = ctx.createLinearGradient(sx, sy, tx, ty);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)');
      gr.addColorStop(0.4, 'rgba(255,230,120,0.5)');
      gr.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.strokeStyle = gr;
      ctx.lineWidth = (this.big ? 3 : 2) * S;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      glint(ctx, sx, sy, (this.big ? 5 : 3.5) * S, S, '#ffffff');
      this.g.light(hx, hy, 22, 'holy', 0.6);
    } else {
      // The spot it struck: a four-point sparkle opening and fading.
      const u = clamp((this.t - STAR.fall) / 0.25, 0, 1);
      const [sx, sy] = toScreen(cam, this.x, this.y);
      ctx.globalAlpha = 1 - u;
      glint(ctx, sx, sy, (3 + u * this.R * 0.6) * S, S, '#fff6b0');
      ctx.globalAlpha = 1;
      this.g.light(this.x, this.y, this.R * 2, 'holy', (1 - u) * 0.8);
    }
  }
}

// -------------------------------------------------------------------- kinds --

export const KINDS_LIGHT = {
  // The Lantern: its beam turns for good (the effect is kept; an evolved or removed weapon's goes out).
  lantern: {
    tick(w) {
      if (!w.fx || w.fx.dead) {
        w.fx = new Lantern(w.g, w);
        w.g.effects.push(w.fx);
      }
    },
  },

  // The Runestone: each cast sends `amount` stones at random foes on screen (none: any way).
  runestone: {
    fire(w) {
      const g = w.g, p = g.player, foes = g.enemiesOnScreen();
      for (let i = 0; i < w.s.amount; i++) {
        const t = foes.length ? foes[Math.floor(Math.random() * foes.length)] : null;
        const ang = (t ? Math.atan2(t.y - p.y, t.x - p.x) : rand(TAU)) + rand(-0.15, 0.15);
        g.effects.push(new Rune(g, w, p.x, p.y - 2, ang, w.s.dur));
      }
      sfx('shard', { pitch: 0.7 });
    },
  },

  // The Scythe: a sweep every cooldown; every kill of it may leave a bonus gem (Harvest Moon).
  scythe: {
    fire(w) {
      w.g.effects.push(new Sweep(w.g, w));
      sfx('slash', { pitch: rand(0.5, 0.6) });
    },
    kill(w, e) {
      if (w.s.reap && e.xp > 0) w.g.dropGem(e.x, e.y, Math.max(1, Math.round(e.xp * w.s.reap)));
    },
  },

  // Starfall: `amount` stars on foes seen on screen, one after another over the cooldown's first part.
  starfall: {
    fire(w) {
      const g = w.g, foes = g.enemiesOnScreen();
      if (!foes.length) return false;
      const gap = Math.min(0.12, (w.s.cd * 0.8) / Math.max(1, w.s.amount));
      for (let i = 0; i < w.s.amount; i++) {
        // Each its own foe while there are foes enough; then they double up.
        const j = Math.floor(Math.random() * foes.length), e = foes[j];
        if (foes.length > w.s.amount) foes.splice(j, 1);
        g.effects.push(new Star(g, w, e.x + rand(-4, 4), e.y + rand(-3, 3), i * gap));
      }
    },
  },
};
