// Player projectiles and enemy missiles.

import { SPR } from '../engine/sprites.js';
import { rand, TAU, lerp } from '../engine/util.js';
import { sfx } from '../engine/audio.js';
import { shadowSprite, glow, crescentSprite } from './fxsprites.js';
import { PC, P } from './particles.js';
import { explode } from './effects.js';
import { WEAPON_SPRITES } from '../data/weapons.js';

const pool = [];

export function spawnProjectile(g, o) {
  const p = pool.pop() || new Projectile();
  p.init(g, o);
  g.projectiles.push(p);
  return p;
}

// One of the Shadow's spinning blades (Shadow Blade, Shadowstrike, Twin Shadows' clones):
// through everything in its path, his crits keener with an evolved one's critBonus.
export function shadowBlade(g, w, x, y, ang, dmg, life) {
  return spawnProjectile(g, {
    kind: 'dagger', sprite: WEAPON_SPRITES.shadowblade, x, y, z: 7, ang, speed: 330 * w.s.speed, life, r: 3, dmg,
    pierce: w.s.pierce || 99, kb: w.s.kb, w, crit: w.s.critBonus || 0.05, spin: 22, trail: w.evolved ? PC.P : null,
  });
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
    this.v0 = o.speed || 0;
    this.out = o.out || 0;
    this.pull = o.pull || 0;
    this.glowSpec = o.glow || null;
    this.target = null;
    this.retarget = 0;
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
      case 'glaive': {
        // Out along the throw, slowing to a stop, then back to the hand.
        const p = g.player;
        this.rot += this.spin * dt;
        if (this.t < this.out) {
          const k = 1 - this.t / this.out;
          this.x += this.vx * k * dt;
          this.y += this.vy * k * dt;
        } else {
          const dx = p.x - this.x, dy = p.y - 2 - this.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 8) return false;
          const sp = this.v0 * Math.min(1.4, (this.t - this.out) * 3);
          this.vx = (dx / d) * this.v0;
          this.vy = (dy / d) * this.v0;
          const step = Math.min(d, sp * dt);
          this.x += (dx / d) * step;
          this.y += (dy / d) * step;
        }
        if (this.pull) {
          for (const pk of g.pickups) {
            if (pk.kind === 'gem' && !pk.pulled && Math.abs(pk.x - this.x) < 20 && Math.abs(pk.y - this.y) < 20) {
              pk.pulled = true;
              pk.speed = 0;
            }
          }
        }
        break;
      }
      case 'wisp': {
        // Drift out, then home on the nearest foe not yet struck.
        this.retarget -= dt;
        const tg = this.target;
        if (!tg || tg.dead || this.hits.has(tg.id) || this.retarget <= 0) {
          this.target = g.nearestEnemy(this.x, this.y, 220, (e) => !this.hits.has(e.id) && !e.untargetable);
          this.retarget = 0.3;
        }
        const sp = this.v0 * Math.min(1.6, 0.35 + this.t * 1.6);
        if (this.target && this.t > 0.2) {
          const want = Math.atan2(this.target.y - this.y, this.target.x - this.x);
          let da = want - this.ang;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          this.ang += Math.max(-7 * dt, Math.min(7 * dt, da));
        } else this.ang += Math.sin(this.t * 5 + this.a0) * 2 * dt;
        this.vx = Math.cos(this.ang) * sp;
        this.vy = Math.sin(this.ang) * sp;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.z = 9 + Math.sin(this.t * 7 + this.a0) * 1.5;
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
        this.rot += this.spin * dt;
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
        g.particles.emit(this.x, this.y, this.z, 0, 0, 0, 0.18, 1, this.trail, P.FADE | (this.trail === PC.c || this.trail === PC.P || this.glowSpec ? P.GLOW : 0), 0);
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
          // By the game's clock, which runs on in a crypt where the night's stands still.
          if (e.hitT[this.w.src] > g.clock) continue;
          e.hitT[this.w.src] = g.clock + this.hitCd;
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
        if (this.kind === 'wisp') g.particles.burst(this.x, this.y, this.z, 5, [PC.w, this.trail], 60, 0.3, 1, P.GLOW | P.FADE, {});
        else g.particles.burst(this.x, this.y, this.z, 3, [PC.w, PC.G], 50, 0.2, 1, P.FADE, {});
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
    const spun = this.kind === 'axe' || this.kind === 'spiral' || this.kind === 'glaive';
    if (spun || this.kind === 'flask' || this.kind === 'fireball') {
      const sh = shadowSprite(spun ? 8 * this.scale : 6);
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
      case 'glaive':
      case 'flask':
        img = this.sprite.frames[0].rotated(this.rot, 16);
        break;
      case 'wisp':
        img = this.sprite.frames[Math.floor(this.t * 10 + this.a0) % this.sprite.frames.length].c;
        break;
      default:
        // A spinning blade turns as it flies; anything else points the way it goes.
        img = this.spin ? this.sprite.frames[0].rotated(this.rot, 16) : this.sprite.frames[0].rotated(this.ang, 32);
    }
    drawCentered(ctx, img, sx, sy - this.z * S, S * this.scale);
  }

  drawGlow(ctx, cam) {
    const gl = this.glowSpec || GLOWS[this.kind];
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

// The foes' shots are drawn over everything, unlit (Game.draw), a quarter bigger than their
// sprites (SHOT_GROW), and scale times that again. Most hit within r of the hero's feet; a
// shot with a reach hits as it is drawn (EnemyShot.touches).
const SHOT_GROW = 1.25;
const SHOT_LOOK = {
  // The Cultist's: a big, slow orb, easy to see coming.
  darkbolt: { sprite: 'darkbolt', glow: '#b55088', light: 'purple', scale: 1.5 },
  // The Bone King's: big, and burning gold so they can't hide in the dark or the horde. Drawn
  // 33 px long, a bone hits wherever it crosses the hero's body: a bar 12 px either side of its
  // drawn centre, 4 px thick, turning with it.
  bone: { sprite: 'bone', glow: '#feae34', light: 'gold', spin: 14, scale: 2.4, reach: 12, r: 4 },
  skullbolt: { sprite: 'skullbolt', glow: '#9ee562', light: 'green' },
  firebolt: { sprite: 'firebolt', glow: '#f77622', light: 'fire' },
  arrow: { sprite: 'arrow', glow: null, light: null },
};

// The hero's body as a shot that hits as drawn sees it: an upright bar from 4 to 26 px above
// the feet, 6 px thick (the heroes stand 30 to 38 px tall).
export const HERO_BODY = { foot: 4, top: 26, r: 6 };

// The shortest distance between segments AB and CD (0 where they cross).
function segmentGap(ax, ay, bx, by, cx, cy, dx, dy) {
  const side = (x1, y1, x2, y2, x3, y3) => (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
  if (side(ax, ay, bx, by, cx, cy) > 0 !== side(ax, ay, bx, by, dx, dy) > 0 && side(cx, cy, dx, dy, ax, ay) > 0 !== side(cx, cy, dx, dy, bx, by) > 0) return 0;
  const toSeg = (px, py, x1, y1, x2, y2) => {
    const vx = x2 - x1, vy = y2 - y1, t = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / (vx * vx + vy * vy || 1)));
    return Math.hypot(px - x1 - t * vx, py - y1 - t * vy);
  };
  return Math.min(toSeg(ax, ay, cx, cy, dx, dy), toSeg(bx, by, cx, cy, dx, dy), toSeg(cx, cy, ax, ay, bx, by), toSeg(dx, dy, ax, ay, bx, by));
}

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
    this.size = SHOT_GROW * (this.look.scale || 1);
    this.r = opts.r ?? this.look.r ?? 3;
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
    if (!this.dead && this.touches(p)) {
      if (p.hurt(this.dmg) > 0 || !p.untouchable) this.dead = true;
    }
    if (this.dead || this.life <= 0) {
      g.particles.burst(this.x, this.y, this.z, 6, [PC.P, PC.i, PC.p], 40, 0.3, 1, P.FADE | P.GLOW, {});
      return false;
    }
    return true;
  }

  // Whether it touches the hero. Most shots: within r of the feet. One with a reach, as it is
  // drawn: a bar `reach` either side of its drawn centre, at its drawn turn, within r of the
  // hero's body (from HERO_BODY.foot to HERO_BODY.top above the feet, HERO_BODY.r thick).
  touches(p) {
    const reach = this.look.reach;
    if (!reach) {
      const rr = this.r + p.r;
      return (p.x - this.x) ** 2 + (p.y - this.y) ** 2 < rr * rr;
    }
    const n = this.look.spin ? 16 : 32, a = (Math.round(((this.look.spin ? this.rot : this.ang) / TAU) * n) / n) * TAU;
    const dx = Math.cos(a) * reach, dy = Math.sin(a) * reach, y = this.y - this.z;
    const d = segmentGap(this.x - dx, y - dy, this.x + dx, y + dy, p.x, p.y - HERO_BODY.top, p.x, p.y - HERO_BODY.foot);
    return d < this.r + HERO_BODY.r;
  }

  draw(ctx, cam) {
    const S = cam.S;
    const f = SPR[this.look.sprite].frames[0];
    const img = this.look.spin ? f.rotated(this.rot, 16) : f.rotated(this.ang, 32);
    drawCentered(ctx, img, (this.x - cam.x) * S, (this.y - this.z - cam.y) * S, S * this.size);
  }

  drawGlow(ctx, cam) {
    if (!this.look.glow) return;
    const S = cam.S, k = this.size;
    const s = 20 * S * k;
    ctx.drawImage(glow(this.look.glow), (this.x - cam.x) * S - s / 2, (this.y - this.z - cam.y) * S - s / 2, s, s);
    this.g.light(this.x, this.y, 30 * k, this.look.light, 0.8);
  }
}

export { sfx };
