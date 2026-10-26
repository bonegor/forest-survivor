// Four shared weapons of 22 October 2026, each with its evolution: the Lighthouse Lantern (Beacon),
// the Runestone (Runestorm), Reaper's Scythe (Harvest Moon) and Starfall (Comet Shower). Their
// firing (KINDS, merged into game/weapons.js) and the effects they leave about. Kept apart so
// that weapons.js and effects.js (which this one leans on) need no change but one line.
//
// Effect interface as in effects.js: update(dt) -> keep?; drawGround / draw / drawGlow(ctx, cam).

import { sfx } from '../engine/audio.js';
import { rand, TAU, clamp, angleDiff, ease, pick } from '../engine/util.js';
import { glow, glint } from './fxsprites.js';
import { PC, P } from './particles.js';
import { Ring, brandFoe } from './effects.js';
import { reachesFeet, reachesBody } from './hitbox.js';

const toScreen = (cam, x, y) => [(x - cam.x) * cam.S, (y - cam.y) * cam.S];
const panOf = (g, x) => clamp((x - g.player.x) / 200, -1, 1);
// A foe the Scythe may take outright: not a boss, a lord, a champion or a prop.
const mortal = (e) => !(e.boss || e.lord || e.elite || e.prop);

// ----------------------------------------------------------------- lantern --

// The beam: its reach (px, at area 1), half-width (radians), turn (radians a second at speed 1) and
// how long a foe it lights stays marked (Beacon: Smite's brand, a shorter one).
export const LANTERN = { reach: 78, half: 0.4, spin: 1.5, mark: 1.2 };

// A cone of pale lamplight (not Consecration's gold) turning slowly round the hero, burning
// whatever it sweeps over; Beacon turns several evenly spread beams, and marks the foes they light
// (brandFoe: more from every blow).
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
    const cands = g.grid.foes(p.x, p.y, R);
    for (let i = 0; i < cands.length; i++) {
      const e = cands[i];
      if (e.dead) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
      if (d > R + e.hr) continue;
      const a = Math.atan2(dy, dx), slack = half + e.hr / Math.max(d, e.hr);
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
    const R = this.reach * cam.S, col = s.mark ? '190,235,255' : '255,244,214';
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
      const key = s.mark ? 'cold' : 'white';
      for (let j = 1; j <= 4; j++) {
        const d = (j / 4) * this.reach * 0.9;
        g.light(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 14 + j * 9 * Math.sqrt(s.area), key, 0.55);
      }
    }
    g.light(p.x, p.y, 36, 'warm', 0.45);
  }
}

// ---------------------------------------------------------------- runestone --

// An ash-grey stone lit by amber runes (not the lightning's cyan) that bounces off the edges of
// what the camera shows, piercing every foe it meets (each struck again only after RUNE.again s).
// `kid`: one of the two Runestorm splits off.
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
      g.particles.burst(this.x, this.y, 4, 4, [PC.y, PC.Y, PC.w], 50, 0.3, 1, P.GLOW | P.FADE, {});
      if (++this.bounces === 1 && s.split && !this.kid) this.splitUp();
    }
    // Struck at its feet, or on its body where the stone, drawn on the ground turning, crosses it
    // (hitbox.js): a square r either side, as wide as its corners turned.
    const cands = g.grid.foes(this.x, this.y, this.r * Math.SQRT2);
    for (let i = 0; i < cands.length; i++) {
      const e = cands[i];
      if (e.dead) continue;
      if (!reachesFeet(e, this.x, this.y, this.x, this.y, this.r) && !reachesBody(e, this.x, this.y, this.x, this.y, this.r * Math.SQRT2)) continue;
      const last = this.seen.get(e);
      if (last !== undefined && this.t - last < RUNE.again) continue;
      this.seen.set(e, this.t);
      const d = Math.hypot(this.vx, this.vy) || 1;
      g.hitEnemy(e, this.dmg, { w, type: 'normal', kb: s.kb ?? 0.4, kx: this.vx / d, ky: this.vy / d });
    }
    if (Math.random() < dt * 30) g.particles.emit(this.x, this.y, 0, rand(-6, 6), rand(-6, 6), rand(1, 4), 0.35, 1, PC.y, P.GLOW | P.FADE, 0);
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
    ctx.fillStyle = '#4b3d44';
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.fillStyle = '#7d6a6a';
    ctx.fillRect(-r + S, -r + S, r * 2 - 2 * S, r * 2 - 2 * S);
    ctx.fillStyle = '#fee761';
    ctx.fillRect(-S, -r * 0.6, S * 2, r * 1.2);
    ctx.fillRect(-r * 0.6, -S, r * 1.2, S * 2);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawGlow(ctx, cam) {
    const [sx, sy] = toScreen(cam, this.x, this.y);
    const sz = this.r * 6 * cam.S, fade = clamp((this.dur - this.t) / 0.4, 0, 1);
    ctx.globalAlpha = 0.7 * fade;
    ctx.drawImage(glow('#feae34'), sx - sz / 2, sy - sz / 2, sz, sz);
    ctx.globalAlpha = 1;
    this.g.light(this.x, this.y, 34, 'warm', 0.7 * fade);
  }
}

// ------------------------------------------------------------------- scythe --

// A reaper's sweep once round the hero, slow and wide, nothing like the Longsword's quick cut in
// front (the owner's, 22 October 2026: "scythe and sword look the same"): SCYTHE.turn s a circuit
// at speed 1, the blade's point R px out at area 1 (the sword's, 30). Each foe in its path is cut
// once and, if mortal and low enough, taken outright: its soul rises and a skull marks the spot.
// Harvest Moon swings `blades` (two) evenly spread, each going its share of the way round.
// The blade: a dark iron crescent on a long haft, its edge and wake in ghost-light (SCYTHE_LOOK).
export const SCYTHE = { turn: 1.5, R: 54, pad: 0.04, blade: 0.5 };
const SCYTHE_LOOK = {
  reaper: { edge: '#c8f4ec', iron: '#2c2c34', wake: ['#c8f4ec', '#9ee562', '#6fb8b0', '#8f5bb0', '#68386c', '#3b2346'], glow: '#9ee562', light: 'green', souls: [PC.l, PC.X, PC.j] },
  moon: { edge: '#fff6d0', iron: '#4a4030', wake: ['#ffffff', '#fee761', '#ead4aa', '#feae34', '#d2c393', '#9e8c60'], glow: '#fee761', light: 'gold', souls: [PC.Y, PC.T, PC.w] },
};
export class Sweep {
  constructor(g, w) {
    this.g = g;
    this.w = w;
    this.dur = SCYTHE.turn / w.s.speed;
    this.t = 0;
    this.u = 0; // how far round it has come, 0 to 1
    this.n = Math.max(1, Math.round(w.s.blades || 1));
    this.a0 = g.player.aim;
    this.dir = g.player.face < 0 ? -1 : 1;
    this.look = SCYTHE_LOOK[w.s.reap ? 'moon' : 'reaper'];
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

  // Where blade k points now: each goes 1/n of the way round from a start of its own.
  ang(k = 0) {
    return this.a0 + (this.dir * (this.u + k) * TAU) / this.n;
  }

  // Fades over the circuit's last sixth.
  get alpha() {
    return this.u > 0.84 ? Math.max(0, (1 - this.u) / 0.16) : 1;
  }

  update(dt) {
    const g = this.g, w = this.w, s = w.s, p = g.player, n = this.n;
    const prev = this.u;
    this.t += dt;
    // Heavy: it gathers speed, then slows as the swing spends itself.
    const v = Math.min(1, this.t / this.dur);
    this.u = v * 0.4 + ease.inOutSine(v) * 0.6;
    const R = this.R, thr = this.threshold;
    const cands = g.grid.foes(p.x, p.y, R);
    for (let i = 0; i < cands.length; i++) {
      const e = cands[i];
      if (e.dead || this.struck.has(e)) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
      if (d > R + e.hr) continue;
      // Where in its share of the circuit a blade meets it, with a little for its body.
      let f = (((Math.atan2(dy, dx) - this.a0) * this.dir) / TAU) * n;
      f -= Math.floor(f);
      const pad = ((e.hr / Math.max(d, e.hr)) / TAU + SCYTHE.pad) * n;
      if (f > 1 - pad) f -= 1;
      if (!(f >= prev - pad && f <= this.u + pad) && d > e.hr + 4) continue;
      this.struck.add(e);
      g.hitEnemy(e, s.dmg, { w, type: 'dark', kb: s.kb, kx: dx / (d || 1), ky: dy / (d || 1) });
      if (!e.dead && mortal(e) && e.hp <= e.maxHp * thr) {
        w.dmgDealt += e.hp;
        const x = e.x, y = e.y - (e.h || 8) * 0.5;
        g.killEnemy(e, { w });
        g.effects.push(new ReapMark(g, x, y, this.look));
        g.particles.burst(x, y, 4, 7, this.look.souls, 22, 1, 1, P.GLOW | P.FADE | P.RISE, { vz: 26 });
        sfx('reap', { pitch: rand(0.9, 1.1), pan: panOf(g, x) });
      }
    }
    // Ghost-light shed from a blade's point as it goes.
    if (this.u < 0.9 && Math.random() < dt * 40) {
      const a = this.ang(Math.floor(rand(n)));
      g.particles.emit(p.x + Math.cos(a) * R, p.y - 3 + Math.sin(a) * R, 2, rand(-5, 5), rand(-8, -2), rand(4, 10), 0.6, 1, pick(this.look.souls), P.GLOW | P.FADE, 0);
    }
    return this.t < this.dur;
  }

  draw(ctx, cam) {
    const p = this.g.player, S = cam.S, L = this.look, R = this.R * S, k0 = this.alpha;
    const [sx, sy] = toScreen(cam, p.x, p.y - 3);
    ctx.save();
    ctx.lineCap = 'butt';
    for (let k = 0; k < this.n; k++) {
      const a = this.ang(k);
      // The wake: a band of ghost-light just inside the point's reach, fading out behind it.
      const seg = 0.11, m = L.wake.length * 2;
      for (let i = 0; i < m; i++) {
        const to = a - this.dir * i * seg, from = to - this.dir * seg;
        ctx.globalAlpha = (1 - i / m) * 0.75 * k0;
        ctx.strokeStyle = L.wake[i >> 1];
        ctx.lineWidth = Math.max(1, (7 - i * 0.45) * S);
        ctx.beginPath();
        ctx.arc(sx, sy, R - 4 * S, Math.min(from, to), Math.max(from, to));
        ctx.stroke();
      }
      ctx.globalAlpha = k0;
      this.drawBlade(ctx, sx, sy, a, R, S);
    }
    ctx.restore();
  }

  // The haft from his hands out toward the reach, and at its head the blade, its back bowing out
  // to the reach R (what it strikes), its edge curving in to the point ahead along the sweep.
  drawBlade(ctx, sx, sy, a, R, S) {
    const L = this.look, b = SCYTHE.blade * R, h = R - b * 0.12, dir = this.dir;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a);
    ctx.strokeStyle = '#2a1f2d';
    ctx.lineWidth = 2 * S;
    ctx.beginPath();
    ctx.moveTo(4 * S, 0);
    ctx.lineTo(h + S, 0);
    ctx.stroke();
    ctx.strokeStyle = '#733e39';
    ctx.lineWidth = S;
    ctx.beginPath();
    ctx.moveTo(4 * S, -0.5 * S);
    ctx.lineTo(h, -0.5 * S);
    ctx.stroke();
    ctx.fillStyle = L.iron;
    ctx.beginPath();
    ctx.moveTo(h + 2 * S, -dir * 1.5 * S);
    ctx.quadraticCurveTo(R + b * 0.1, dir * b * 0.6, h - b * 0.6, dir * b * 0.85);
    ctx.quadraticCurveTo(h - b * 0.25, dir * b * 0.3, h - 2 * S, dir * 2 * S);
    ctx.closePath();
    ctx.fill();
    // Its back rimmed in a faint ghost-light, its edge bright.
    ctx.globalAlpha *= 0.7;
    ctx.strokeStyle = L.wake[2];
    ctx.lineWidth = S;
    ctx.stroke();
    ctx.globalAlpha /= 0.7;
    ctx.strokeStyle = L.edge;
    ctx.lineWidth = 1.5 * S;
    ctx.beginPath();
    ctx.moveTo(h - b * 0.6, dir * b * 0.85);
    ctx.quadraticCurveTo(h - b * 0.25, dir * b * 0.3, h - 2 * S, dir * 2 * S);
    ctx.stroke();
    ctx.restore();
  }

  drawGlow(ctx, cam) {
    const p = this.g.player, L = this.look, k0 = this.alpha, R = this.R;
    for (let k = 0; k < this.n; k++) {
      const a = this.ang(k), x = p.x + Math.cos(a) * R * 0.9, y = p.y - 3 + Math.sin(a) * R * 0.9;
      const [sx, sy] = toScreen(cam, x, y), sz = 26 * cam.S;
      ctx.globalAlpha = 0.45 * k0;
      ctx.drawImage(glow(L.glow), sx - sz / 2, sy - sz / 2, sz, sz);
      this.g.light(x, y, 30, L.light, 0.55 * k0);
    }
    ctx.globalAlpha = 1;
  }
}

// A reaped foe's mark: a small skull of ghost-light rising from where it fell, fading.
const SKULL = [' ### ', '#####', '#.#.#', '#####', ' # # '], REAP_MARK = 0.7;
export class ReapMark {
  constructor(g, x, y, look) {
    this.g = g;
    this.x = x;
    this.y = y;
    this.look = look;
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    return this.t < REAP_MARK;
  }

  draw(ctx, cam) {
    const u = this.t / REAP_MARK, S = cam.S;
    const [sx, sy] = toScreen(cam, this.x, this.y - 4 - u * 10);
    ctx.globalAlpha = u < 0.6 ? 1 : (1 - u) / 0.4;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const ch = SKULL[r][c];
        if (ch === ' ') continue;
        ctx.fillStyle = ch === '#' ? this.look.edge : this.look.iron;
        ctx.fillRect(Math.round(sx + (c - 2.5) * S), Math.round(sy + (r - 2.5) * S), Math.ceil(S), Math.ceil(S));
      }
    }
    ctx.globalAlpha = 1;
  }

  drawGlow(ctx, cam) {
    const u = this.t / REAP_MARK, [sx, sy] = toScreen(cam, this.x, this.y - 4 - u * 10), sz = 16 * cam.S;
    ctx.globalAlpha = 0.5 * (1 - u);
    ctx.drawImage(glow(this.look.glow), sx - sz / 2, sy - sz / 2, sz, sz);
    ctx.globalAlpha = 1;
  }
}

// ----------------------------------------------------------------- starfall --

// A star falling on a foe: from high up and to one side, a bright streak, landing after STAR.fall s
// as a small area blow in a burst of sparks.
// Its light is cool starlight (ring: the burst's), apart from Smite's gold and the lightning's cyan.
export const STAR = { fall: 0.3, R: 13, dx: 46, h: 120, tail: 0.45, ring: '#c4d0ff' };
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
      const cands = g.grid.foes(this.x, this.y, R);
      for (let i = 0; i < cands.length; i++) {
        const e = cands[i];
        if (e.dead) continue;
        const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
        if (d > R + e.hr) continue;
        g.hitEnemy(e, s.dmg, { w, type: 'holy', kb: s.kb, kx: dx / (d || 1), ky: dy / (d || 1) });
      }
      g.particles.burst(this.x, this.y, this.big ? 10 : 6, 8, [PC.w, PC.G, PC.j], R * 4, 0.4, 1, P.GLOW | P.FADE, { flat: 0.6, vz: 50 });
      g.effects.push(new Ring(g, this.x, this.y, 2, R, 0.22, STAR.ring, false, 1));
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
      gr.addColorStop(0.4, 'rgba(170,185,255,0.55)');
      gr.addColorStop(1, 'rgba(143,91,176,0)');
      ctx.strokeStyle = gr;
      ctx.lineWidth = (this.big ? 3 : 2) * S;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      glint(ctx, sx, sy, (this.big ? 5 : 3.5) * S, S, '#ffffff');
      this.g.light(hx, hy, 22, 'moon', 0.6);
    } else {
      // The spot it struck: a four-point sparkle opening and fading.
      const u = clamp((this.t - STAR.fall) / 0.25, 0, 1);
      const [sx, sy] = toScreen(cam, this.x, this.y);
      ctx.globalAlpha = 1 - u;
      glint(ctx, sx, sy, (3 + u * this.R * 0.6) * S, S, STAR.ring);
      ctx.globalAlpha = 1;
      this.g.light(this.x, this.y, this.R * 2, 'moon', (1 - u) * 0.8);
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
      sfx('whoosh', { pitch: w.s.reap ? 1.15 : rand(0.9, 1) });
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
