// Enemies: AI, status effects and drawing. Breakable props and bosses share
// this class; boss behaviour lives in bosses.js.

import { ENEMIES } from '../data/enemies.js';
import { SPR, TINTS } from '../engine/sprites.js';
import { hexPack } from '../engine/pixels.js';
import { OUTLINE } from '../art/palette.js';
import { sfx } from '../engine/audio.js';
import { rand, TAU, clamp, pick } from '../engine/util.js';
import { shadowSprite, glow } from './fxsprites.js';
import { PC, P } from './particles.js';
import { EnemyShot } from './projectiles.js';
import { BOSS_AI } from './bosses.js';

export const SRC = { BURN: 16, ULT: 17, SHATTER: 18, RELIC: 19, MISC: 20, POOL: 15 };
const N_SRC = 24;
let nextId = 1;

export class Enemy {
  constructor() {
    this.hitT = new Float32Array(N_SRC);
  }

  init(g, type, x, y, o = {}) {
    const def = ENEMIES[type];
    this.g = g;
    this.type = type;
    this.def = def;
    this.id = nextId++;
    this.spr = SPR[def.sprite];
    this.x = x;
    this.y = y;
    this.kx = 0;
    this.ky = 0;
    this.elite = !!o.elite;
    this.boss = !!def.boss;
    this.prop = !!def.prop;
    this.scale = o.scale ?? (this.elite ? 1.35 : 1);
    this.r = def.r * (this.elite ? 1.3 : 1);
    this.maxHp = this.hp = Math.max(1, def.hp * (o.hpMul ?? 1));
    this.spd = def.spd * (o.spdMul ?? 1);
    this.dmg = def.dmg * (o.dmgMul ?? 1);
    this.xp = def.xp;
    this.face = Math.random() < 0.5 ? -1 : 1;
    this.anim = rand(10);
    this.flash = 0;
    this.dead = false;
    this.slowT = 0;
    this.slowF = 0;
    this.freezeT = 0;
    this.burnT = 0;
    this.burnDps = 0;
    this.burnTick = 0;
    this.state = 'move';
    this.stateT = 0;
    this.cdT = rand(1, 2.5);
    this.cd2 = rand(4, 7);
    this.cd3 = rand(8, 12);
    this.dirX = 0;
    this.dirY = 0;
    this.lockX = 0;
    this.lockY = 0;
    this.lockT = o.lockT || 0;
    if (o.lock) {
      this.lockX = o.lock[0];
      this.lockY = o.lock[1];
    }
    this.spawnMax = this.spawnT = o.instant ? 0 : def.rise ? 0.75 : 0.25;
    this.hitT.fill(0);
    this.h = this.spr.h * this.scale;
    this.name = o.name || null;
    this.mod = o.mod || null;
    this.vampiric = this.mod && this.mod.id === 'vampiric';
    this.wob = rand(TAU);
    this.life = 0;
    this._num = null;
    this.untargetable = false;
    this.alpha = def.alpha || 1;
    this.squash = 0;
    this.sleeping = !!o.sleeping; // dungeon guardians wait for you
    this.phase = 0;
    this.drops = o.drops || null;
    this.speech = null;
    this.shake = 0;
    this.ai = this.boss ? BOSS_AI[type] : null;
    this.data = {};
    if (this.mod && this.mod.id === 'swift') this.spd *= 1.45;
    if (this.mod && this.mod.id === 'brutal') this.dmg *= 1.5;
    return this;
  }

  get hostile() {
    return !this.prop && !this.dead;
  }

  update(dt) {
    const g = this.g, p = g.player, def = this.def;
    this.life += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.squash > 0) this.squash = Math.max(0, this.squash - dt * 5);
    if (this.prop) return;

    if (this.spawnT > 0) {
      this.spawnT -= dt;
      if (def.rise && Math.random() < 0.5) {
        g.particles.emit(this.x + rand(-5, 5), this.y, 0, rand(-15, 15), rand(-5, 5), rand(20, 50), 0.45, 1, pick([PC.b, PC.m, PC.a]), P.GROUND | P.FADE, 2, 220);
      }
      return;
    }

    if (this.sleeping) {
      this.anim += dt * 0.5;
      return;
    }

    // Damage over time.
    if (this.burnT > 0) {
      this.burnT -= dt;
      this.burnTick -= dt;
      if (this.burnTick <= 0) {
        this.burnTick = 0.5;
        g.hitEnemy(this, this.burnDps * 0.5, { type: 'fire', kb: 0, src: SRC.BURN });
        if (this.dead) return;
      }
      if (Math.random() < 0.3) g.particles.emit(this.x + rand(-3, 3), this.y - rand(2, 10), 0, 0, 0, rand(15, 30), 0.35, 1, pick([PC.o, PC.y]), P.GLOW | P.FADE, 0);
    }

    let sp = this.spd * g.diff.speed;
    if (this.slowT > 0) {
      this.slowT -= dt;
      sp *= 1 - this.slowF;
      if (this.slowT <= 0) this.slowF = 0;
    }
    if (this.freezeT > 0) {
      this.freezeT -= dt;
      sp = 0;
    }

    let dx = 0, dy = 0;
    if (this.lockT > 0) {
      this.lockT -= dt;
      dx = this.lockX;
      dy = this.lockY;
    } else if (this.ai) {
      const r = this.ai(this, dt, sp);
      dx = r[0];
      dy = r[1];
      sp *= r[2];
    } else {
      switch (def.ai) {
        case 'walker': {
          const d = g.world.steer(this, p);
          dx = d[0];
          dy = d[1];
          break;
        }
        case 'flyer': {
          const d = g.world.steer(this, p, true);
          const w = Math.sin(this.life * 4 + this.wob) * 0.7;
          dx = d[0] - d[1] * w;
          dy = d[1] + d[0] * w;
          const l = Math.hypot(dx, dy) || 1;
          dx /= l;
          dy /= l;
          break;
        }
        case 'hopper': {
          const d = g.world.steer(this, p);
          const ph = (this.life * 1.25 + this.wob) % 1;
          dx = d[0];
          dy = d[1];
          sp *= ph < 0.42 ? 2.3 : 0.08;
          if (ph < 0.42 && ph + dt * 1.25 >= 0.42) this.squash = 1;
          break;
        }
        case 'skitter': {
          const d = g.world.steer(this, p);
          this.stateT -= dt;
          if (this.stateT <= 0) {
            this.stateT = rand(0.25, 0.6);
            this.data.off = rand(-1, 1);
          }
          const o = this.data.off || 0;
          dx = d[0] - d[1] * o;
          dy = d[1] + d[0] * o;
          const l = Math.hypot(dx, dy) || 1;
          dx /= l;
          dy /= l;
          break;
        }
        case 'phaser': {
          const l = Math.hypot(p.x - this.x, p.y - this.y) || 1;
          dx = (p.x - this.x) / l;
          dy = (p.y - this.y) / l;
          this.alpha = (def.alpha || 0.8) * (0.75 + 0.25 * Math.sin(this.life * 3 + this.wob));
          break;
        }
        case 'charger':
          [dx, dy, sp] = this.charger(dt, sp);
          break;
        case 'caster':
          [dx, dy, sp] = this.caster(dt, sp);
          break;
        case 'flee': {
          const l = Math.hypot(this.x - p.x, this.y - p.y) || 1;
          const d = g.world.steer(this, { x: this.x + ((this.x - p.x) / l) * 60, y: this.y + ((this.y - p.y) / l) * 60 });
          dx = d[0];
          dy = d[1];
          if (Math.random() < 0.2) g.particles.emit(this.x + rand(-4, 4), this.y - rand(4, 12), 0, 0, 0, rand(5, 15), 0.6, 1, PC.Y, P.GLOW | P.FADE, 0);
          if (this.life > 20) {
            g.escape(this);
            return;
          }
          break;
        }
        default:
          break;
      }
    }

    this.dirX = dx;
    this.dirY = dy;
    this.x += (dx * sp + this.kx) * dt;
    this.y += (dy * sp + this.ky) * dt;
    const kd = Math.exp(-9 * dt);
    this.kx *= kd;
    this.ky *= kd;
    if (!def.fly && def.ai !== 'phaser') g.world.collide(this);
    if (Math.abs(dx) > 0.12 && this.state !== 'wind') this.face = dx < 0 ? -1 : 1;
    this.anim += dt * def.anim * (sp > 1 ? 1 : 0.25);

    // Contact damage.
    if (this.dmg > 0 && this.freezeT <= 0) {
      const rr = this.r + p.r;
      if ((p.x - this.x) ** 2 + (p.y - this.y) ** 2 < rr * rr) p.hurt(this.dmg * g.dmgScale * (this.state === 'dash' ? 1.4 : 1), this);
    }
  }

  charger(dt, sp) {
    const g = this.g, p = g.player, c = this.def.charge;
    const dist = Math.hypot(p.x - this.x, p.y - this.y);
    this.cdT -= dt;
    switch (this.state) {
      case 'wind':
        this.stateT -= dt;
        this.shake = 1;
        if (this.stateT <= 0) {
          this.state = 'dash';
          this.stateT = c.dur;
          sfx('charge', { pan: clamp((this.x - p.x) / 200, -1, 1) });
        }
        return [this.lockX, this.lockY, 0];
      case 'dash':
        this.stateT -= dt;
        this.shake = 0;
        if (Math.random() < 0.6) g.particles.emit(this.x, this.y, 0, -this.lockX * 30, -this.lockY * 30, 5, 0.3, 1, PC.N, P.FADE, 2);
        if (this.stateT <= 0) {
          this.state = 'move';
          this.cdT = c.cd * rand(0.8, 1.2);
        }
        return [this.lockX, this.lockY, c.spd / Math.max(1, this.spd)];
      default: {
        const d = g.world.steer(this, p);
        if (this.cdT <= 0 && dist < c.range && dist > 20 && this.freezeT <= 0) {
          this.state = 'wind';
          this.stateT = c.wind;
          const l = dist || 1;
          this.lockX = (p.x - this.x) / l;
          this.lockY = (p.y - this.y) / l;
          this.face = this.lockX < 0 ? -1 : 1;
        }
        return [d[0], d[1], 1];
      }
    }
  }

  caster(dt, sp) {
    const g = this.g, p = g.player, s = this.def.shot;
    const dx = p.x - this.x, dy = p.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.cdT -= dt;
    if (this.state === 'wind') {
      this.stateT -= dt;
      if (this.stateT <= 0) {
        this.state = 'move';
        this.cdT = s.cd * rand(0.8, 1.2);
        const ang = Math.atan2(dy, dx);
        g.eshots.push(new EnemyShot(g, this.x, this.y - 2, ang, s.spd, s.dmg * g.dmgScale, s.kind));
        sfx('enemyshot', { pan: clamp((this.x - p.x) / 200, -1, 1) });
      }
      return [0, 0, 0];
    }
    if (this.cdT <= 0 && dist < s.range && g.world.lineOfSight(this.x, this.y, p.x, p.y)) {
      this.state = 'wind';
      this.stateT = s.wind;
      return [0, 0, 0];
    }
    if (dist < s.range * 0.6) return [-dx / dist, -dy / dist, 0.8];
    const d = g.world.steer(this, p);
    return [d[0], d[1], 1];
  }

  // ------------------------------------------------------------- drawing --

  frameIndex() {
    const n = this.spr.frames.length;
    return Math.floor(this.anim) % n;
  }

  drawShadow(ctx, cam) {
    const S = cam.S;
    const sh = shadowSprite(Math.max(6, this.spr.w * 0.7 * this.scale));
    const sx = (this.x - cam.x) * S, sy = (this.y - cam.y) * S;
    let a = 0.55;
    if (this.def.fly) a = 0.35;
    if (this.spawnT > 0) a *= 1 - this.spawnT / this.spawnMax;
    ctx.globalAlpha = a * (this.alpha < 1 ? this.alpha : 1);
    ctx.drawImage(sh, Math.round(sx - (sh.width * S) / 2), Math.round(sy - (sh.height * S) / 2), sh.width * S, sh.height * S);
    ctx.globalAlpha = 1;
  }

  draw(ctx, cam) {
    const S = cam.S;
    const fr = this.spr.frames[this.frameIndex()];
    const flip = this.face < 0;
    let img;
    if (this.flash > 0) img = fr.white(flip);
    else if (this.freezeT > 0) img = fr.variant('frozen', TINTS.frozen, flip);
    else if (this.state === 'wind' && Math.floor(this.life * 20) % 2) img = fr.variant('burn', TINTS.burn, flip);
    else if (this.elite) img = fr.variant('eliteo', eliteOutlineBuf, flip);
    else img = fr.get(flip);

    let sx = this.scale, sy = this.scale;
    if (this.flash > 0) {
      sx *= 1.12;
      sy *= 0.9;
    }
    if (this.squash > 0) {
      sx *= 1 + this.squash * 0.25;
      sy *= 1 - this.squash * 0.2;
    }
    if (this.def.ai === 'hopper') {
      const ph = (this.life * 1.25 + this.wob) % 1;
      if (ph < 0.42) {
        sy *= 1.12;
        sx *= 0.92;
      }
    }
    const w = img.width * S * sx, h = img.height * S * sy;
    let X = (this.x - cam.x) * S - w / 2;
    const Y = (this.y - cam.y) * S - h + S;
    if (this.shake) X += (Math.random() - 0.5) * S * 2;
    if (this.def.fly) {
      const bob = Math.sin(this.life * 6 + this.wob) * 2 * S;
      this._bob = bob;
    } else this._bob = 0;
    const by = Y - this._bob - (this.def.fly ? 6 * S : 0);
    this._rect = [X, by, w, h, flip];
    let alpha = this.alpha;
    if (this.spawnT > 0 && this.def.rise) {
      const k = 1 - this.spawnT / this.spawnMax;
      const vis = Math.max(1, Math.round(img.height * k));
      ctx.drawImage(img, 0, 0, img.width, vis, Math.round(X), Math.round(by + h - vis * S * sy), Math.round(w), Math.round(vis * S * sy));
      return;
    }
    if (this.spawnT > 0) alpha *= 1 - this.spawnT / this.spawnMax;
    if (alpha < 1) ctx.globalAlpha = alpha;
    ctx.drawImage(img, Math.round(X), Math.round(by), Math.round(w), Math.round(h));
    if (alpha < 1) ctx.globalAlpha = 1;
  }

  // Unlit layer: glowing eyes, embers, champion auras.
  drawEmissive(ctx, cam) {
    if (!this._rect || this.spawnT > 0) return;
    const fr = this.spr.frames[this.frameIndex()];
    const [X, Y, w, h, flip] = this._rect;
    if (fr.em && this.flash <= 0) {
      ctx.globalAlpha = this.alpha;
      ctx.drawImage(flip ? fr.emf : fr.em, Math.round(X), Math.round(Y), Math.round(w), Math.round(h));
      ctx.globalAlpha = 1;
    }
  }

  drawGlow(ctx, cam) {
    if (!this.elite && !this.boss) return;
    const S = cam.S;
    if (this.sealed) {
      // A shimmering ward around a sealed guardian.
      const sx = (this.x - cam.x) * S, sy = (this.y - this.h * 0.45 - cam.y) * S;
      const s = this.h * 2.2 * S * (1 + 0.04 * Math.sin(this.life * 4));
      ctx.globalAlpha = 0.5;
      ctx.drawImage(glow('#b55088'), sx - s / 2, sy - s / 2, s, s);
      ctx.globalAlpha = 1;
      return;
    }
    const sx = (this.x - cam.x) * S, sy = (this.y - this.h * 0.45 - cam.y) * S;
    const s = this.h * 2.6 * S;
    const col = this.boss ? this.def.color : this.mod ? this.mod.color : '#feae34';
    ctx.globalAlpha = 0.28 + 0.1 * Math.sin(this.life * 5);
    ctx.drawImage(glow(col), sx - s / 2, sy - s / 2, s, s);
    ctx.globalAlpha = 1;
  }
}

const GOLD = hexPack('#feae34');
// Champions get a gold outline instead of the ink one.
function eliteOutlineBuf(b) {
  const out = { w: b.w, h: b.h, d: b.d.slice() };
  for (let i = 0; i < out.d.length; i++) if (out.d[i] === OUTLINE) out.d[i] = GOLD;
  return out;
}

export function makeEnemyPool() {
  const pool = [];
  return {
    get() {
      return pool.pop() || new Enemy();
    },
    put(e) {
      e.g = null;
      e._num = null;
      e._rect = null;
      pool.push(e);
    },
  };
}
