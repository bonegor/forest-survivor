// Player projectiles and enemy missiles.

import { SPR } from '../engine/sprites.js';
import { rand, TAU, lerp } from '../engine/util.js';
import { sfx } from '../engine/audio.js';
import { shadowSprite, glow, crescentSprite } from './fxsprites.js';
import { PC, P } from './particles.js';
import { explode } from './effects.js';

const pool = [];

export function spawnProjectile(g, o) {
  const p = pool.pop() || new Projectile();
  p.init(g, o);
  g.projectiles.push(p);
  return p;
}

export function releaseProjectile(p) {
  p.g = null;
  p.w = null;
  p.onLand = null;
  pool.push(p);
}

const GLOWS = {
  fireball: ['#f77622', 30, 'fire', 46],
  shard: ['#2ce8f5', 14, 'cyan', 22],
  wave: ['#feae34', 34, 'holy', 40],
  spiral: ['#c0cbdc', 12, null, 0],
};

export class Projectile {
  init(g, o) {
    this.g = g;
    this.kind = o.kind;
    this.sprite = o.sprite ? SPR[o.sprite] : null;
    this.x = o.x;
    this.y = o.y;
    this.z = o.z ?? 6;
    if (o.ang !== undefined) {
      this.vx = Math.cos(o.ang) * o.speed;
      this.vy = Math.sin(o.ang) * o.speed;
      this.ang = o.ang;
    } else {
      this.vx = o.vx || 0;
      this.vy = o.vy || 0;
      this.ang = Math.atan2(this.vy, this.vx);
    }
    this.life = o.life;
    this.max = o.life;
    this.r = o.r ?? 3;
    this.dmg = o.dmg ?? 0;
    this.pierce = o.pierce ?? 0;
    this.kb = o.kb ?? 1;
    this.w = o.w || null;
    this.type = o.type || 'normal';
    this.grav = o.grav || 0;
    this.spin = o.spin || 0;
    this.rot = rand(TAU);
    this.scale = o.scale || 1;
    this.explodeR = o.explodeR || 0;
    this.slow = o.slow || 0;
    this.slowT = o.slowT || 0;
    this.freeze = o.freeze || 0;
    this.shatter = o.shatter || 0;
    this.crit = o.crit || 0;
    this.trail = o.trail ?? null;
    this.trailT = 0;
    this.hitCd = o.hitCd || 0;
    if (!this.hits) this.hits = new Set();
    this.hits.clear();
    this.dead = false;
    this.t = 0;
    this.sx = o.x;
    this.sy = o.y;
    this.tx = o.tx;
    this.ty = o.ty;
    this.onLand = o.onLand || null;
    this.a0 = o.a0 || 0;
  }

  update(dt) {
    const g = this.g;
    this.t += dt;
    this.life -= dt;
    switch (this.kind) {
      case 'flask': {
        const u = Math.min(1, this.t / this.max);
        this.x = lerp(this.sx, this.tx, u);
        this.y = lerp(this.sy, this.ty, u);
        this.z = 6 + 150 * u * (1 - u);
        this.rot += this.spin * dt;
        if (u >= 1) {
          this.dead = true;
          if (this.onLand) this.onLand(this.x, this.y);
        }
        return !this.dead;
      }
      case 'spiral': {
        const p = g.player;
        const R = 8 + 95 * this.t * (this.w ? Math.sqrt(this.w.s.area) : 1);
        const a = this.a0 + this.t * 4.4;
        this.x = p.x + Math.cos(a) * R;
        this.y = p.y + Math.sin(a) * R * 0.9;
        this.rot += this.spin * dt;
        break;
      }
      case 'axe':
        this.vy += this.grav * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rot += this.spin * dt;
        break;
      default:
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (g.world.solid(this.x, this.y)) {
          this.impact();
          return false;
        }
    }

    // Trails.
    this.trailT -= dt;
    if (this.trailT <= 0) {
      if (this.kind === 'fireball') {
        this.trailT = 0.016;
        g.particles.emit(this.x + rand(-2, 2), this.y + rand(-2, 2), this.z, rand(-10, 10), rand(-10, 10), rand(10, 30), rand(0.2, 0.4), rand(1, 2.4), rand() < 0.5 ? PC.o : PC.y, P.GLOW | P.FADE | P.SHRINK, 2);
      } else if (this.kind === 'shard') {
        this.trailT = 0.04;
        g.particles.emit(this.x, this.y, this.z, 0, 0, rand(-5, 5), 0.25, 1, PC.c, P.GLOW | P.FADE, 0);
      } else if (this.kind === 'wave') {
        this.trailT = 0.02;
        g.particles.emit(this.x + rand(-6, 6), this.y + rand(-6, 6), this.z, rand(-15, 15), rand(-15, 15), rand(0, 20), 0.35, 1, rand() < 0.5 ? PC.Y : PC.y, P.GLOW | P.FADE, 3);
      } else if (this.trail !== null) {
        this.trailT = 0.025;
        g.particles.emit(this.x, this.y, this.z, 0, 0, 0, 0.18, 1, this.trail, P.FADE | (this.trail === PC.c || this.trail === PC.P ? P.GLOW : 0), 0);
      } else this.trailT = 1;
    }

    // Collision with enemies.
    if (this.dmg > 0) {
      const cands = g.grid.query(this.x, this.y, this.r + 16);
      for (let i = 0; i < cands.length; i++) {
        const e = cands[i];
        if (e.dead || e.untargetable) continue;
        const rr = this.r + e.r;
        const dx = e.x - this.x, dy = e.y - this.y;
        if (dx * dx + dy * dy > rr * rr) continue;
        if (this.hitCd) {
          if (e.hitT[this.w.src] > g.time) continue;
          e.hitT[this.w.src] = g.time + this.hitCd;
        } else {
          if (this.hits.has(e.id)) continue;
          this.hits.add(e.id);
        }
        const sp = Math.hypot(this.vx, this.vy) || 1;
        g.hitEnemy(e, this.dmg, {
          w: this.w, type: this.type, kb: this.kb, kx: this.vx / sp, ky: this.vy / sp, crit: this.crit,
          slow: this.slow, slowT: this.slowT, freeze: this.freeze, shatter: this.shatter,
        });
        if (this.kind === 'fireball') {
          this.impact();
          return false;
        }
        g.particles.burst(this.x, this.y, this.z, 3, [PC.w, PC.G], 50, 0.2, 1, P.FADE, {});
        if (--this.pierce < 0) {
          this.dead = true;
          return false;
        }
      }
    }

    if (this.life <= 0) {
      if (this.kind === 'fireball') this.impact();
      return false;
    }
    return !this.dead;
  }

  impact() {
    const g = this.g;
    this.dead = true;
    if (this.kind === 'fireball') {
      explode(g, this.x, this.y, this.explodeR, this.dmg, this.w, 'fire');
    } else {
      g.particles.burst(this.x, this.y, this.z, 5, [PC.G, PC.g, PC.w], 40, 0.25, 1, P.FADE, {});
    }
  }

  draw(ctx, cam) {
    const S = cam.S;
    const sx = (this.x - cam.x) * S, sy = (this.y - cam.y) * S;
    if (sx < -60 || sy < -60 || sx > cam.pxW + 60 || sy > cam.pxH + 60) return;
    if (this.kind === 'axe' || this.kind === 'flask' || this.kind === 'fireball' || this.kind === 'spiral') {
      const sh = shadowSprite(this.kind === 'axe' || this.kind === 'spiral' ? 8 * this.scale : 6);
      const groundY = this.kind === 'axe' ? this.y + 6 : this.y;
      ctx.globalAlpha = 0.5;
      ctx.drawImage(sh, Math.round(sx - (sh.width * S) / 2), Math.round((groundY - cam.y) * S - (sh.height * S) / 2), sh.width * S, sh.height * S);
      ctx.globalAlpha = 1;
    }
    let img;
    switch (this.kind) {
      case 'wave': {
        const ai = Math.round((this.ang / TAU) * 32) & 31;
        img = crescentSprite(this.r, ai, ['#ffffff', '#fee761', '#feae34', '#f77622']);
        const a = Math.min(1, this.life / 0.15);
        ctx.globalAlpha = a;
        drawCentered(ctx, img, sx, sy - this.z * S, S);
        ctx.globalAlpha = 1;
        return;
      }
      case 'fireball':
        img = this.sprite.frames[Math.floor(this.t * 12) % 2].c;
        break;
      case 'axe':
      case 'spiral':
      case 'flask':
        img = this.sprite.frames[0].rotated(this.rot, 16);
        break;
      default:
        img = this.sprite.frames[0].rotated(this.ang, 32);
    }
    const sc = this.kind === 'axe' || this.kind === 'spiral' ? S * this.scale : S;
    drawCentered(ctx, img, sx, sy - this.z * S, sc);
  }

  drawGlow(ctx, cam) {
    const gl = GLOWS[this.kind];
    if (!gl && !(this.kind === 'arrow' && this.trail === PC.c)) return;
    const S = cam.S;
    const sx = (this.x - cam.x) * S, sy = (this.y - this.z - cam.y) * S;
    const [color, size] = gl || ['#2ce8f5', 12];
    const s = size * S * (this.kind === 'wave' ? this.r / 11 : 1);
    ctx.drawImage(glow(color), sx - s / 2, sy - s / 2, s, s);
    if (gl && gl[2]) this.g.light(this.x, this.y, gl[3], gl[2], 0.9);
  }
}

function drawCentered(ctx, img, sx, sy, scale) {
  const w = img.width * scale, h = img.height * scale;
  ctx.drawImage(img, Math.round(sx - w / 2), Math.round(sy - h / 2), Math.round(w), Math.round(h));
}

// ------------------------------------------------------------- enemy fire --

const SHOT_LOOK = {
  darkbolt: { sprite: 'darkbolt', glow: '#b55088', light: 'purple' },
  bone: { sprite: 'bone', glow: null, light: null, spin: 14 },
  skullbolt: { sprite: 'skullbolt', glow: '#9ee562', light: 'green' },
  firebolt: { sprite: 'firebolt', glow: '#f77622', light: 'fire' },
};

export class EnemyShot {
  constructor(g, x, y, ang, speed, dmg, kind, opts = {}) {
    this.g = g;
    this.x = x;
    this.y = y;
    this.z = opts.z ?? 8;
    this.vx = Math.cos(ang) * speed;
    this.vy = Math.sin(ang) * speed;
    this.ang = ang;
    this.dmg = dmg;
    this.kind = kind;
    this.look = SHOT_LOOK[kind];
    this.r = opts.r ?? 3;
    this.life = opts.life ?? 4;
    this.rot = 0;
    this.dead = false;
    this.accel = opts.accel || 0;
    this.homing = opts.homing || 0;
  }

  update(dt) {
    const g = this.g, p = g.player;
    this.life -= dt;
    if (this.homing) {
      const want = Math.atan2(p.y - this.y, p.x - this.x);
      let d = want - this.ang;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.ang += Math.max(-this.homing * dt, Math.min(this.homing * dt, d));
      const sp = Math.hypot(this.vx, this.vy);
      this.vx = Math.cos(this.ang) * sp;
      this.vy = Math.sin(this.ang) * sp;
    }
    if (this.accel) {
      const k = 1 + this.accel * dt;
      this.vx *= k;
      this.vy *= k;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += (this.look.spin || 0) * dt;
    if (g.world.solid(this.x, this.y) && this.kind !== 'skullbolt') this.dead = true;
    const rr = this.r + p.r;
    if (!this.dead && (p.x - this.x) ** 2 + (p.y - this.y) ** 2 < rr * rr) {
      if (p.hurt(this.dmg) > 0 || !p.untouchable) this.dead = true;
    }
    if (this.dead || this.life <= 0) {
      g.particles.burst(this.x, this.y, this.z, 6, [PC.P, PC.i, PC.p], 40, 0.3, 1, P.FADE | P.GLOW, {});
      return false;
    }
    return true;
  }

  draw(ctx, cam) {
    const S = cam.S;
    const f = SPR[this.look.sprite].frames[0];
    const img = this.look.spin ? f.rotated(this.rot, 16) : f.rotated(this.ang, 32);
    drawCentered(ctx, img, (this.x - cam.x) * S, (this.y - this.z - cam.y) * S, S);
  }

  drawGlow(ctx, cam) {
    if (!this.look.glow) return;
    const S = cam.S;
    const s = 20 * S;
    ctx.drawImage(glow(this.look.glow), (this.x - cam.x) * S - s / 2, (this.y - this.z - cam.y) * S - s / 2, s, s);
    this.g.light(this.x, this.y, 30, this.look.light, 0.8);
  }
}

export { sfx };
