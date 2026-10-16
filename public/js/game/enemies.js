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
import { faceAlong, faceAttack } from './facing.js';

export const SRC = { BURN: 16, ULT: 17, SHATTER: 18, RELIC: 19, MISC: 20, POOL: 15 };
const N_SRC = 24;
// How much of its speed a monster that hasn't seen the hero strolls at (Dungeon.wander).
export const STROLL = 0.5;
// Champions aren't pushed by blows: a blow stops one for HOLD seconds instead, and it
// can't be stopped again until HOLD_EVERY seconds after that, so hits can't pin it.
export const HOLD = 0.2, HOLD_EVERY = 0.6;
// A Gilded Thief runs flat out while the hero is within THIEF_NEAR of it (a fifth slower than
// the slowest hero) and eases off farther ahead, down to a jog at THIEF_JOG of its speed from
// THIEF_FAR on, as if taunting him. A hero who sets off five or eight seconds late still
// catches it; one who lets it be still loses it when its 20 seconds are up.
export const THIEF_NEAR = 100, THIEF_FAR = 180, THIEF_JOG = 0.3;
export const thiefPace = (d) => clamp((THIEF_FAR - d) / (THIEF_FAR - THIEF_NEAR), THIEF_JOG, 1);
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
    this.scale = o.scale ?? (def.scale || 1) * (this.elite ? 1.35 : 1);
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
    this.holdT = 0;
    this.holdCd = 0;
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
    this.lord = !!o.lord; // the named boss at the end of a crypt
    this.dormant = !!o.dormant; // a crypt's sleeping pack, until the hero comes near
    // Whether it knows where the hero is. In a crypt one doesn't until it has seen him or been
    // hit (update); what is sent at him (o.aware: a ring, a swarm, a pack), a boss, one that
    // wakes by its own rule (sleeping) and the thief always do. In the forest and on a Dungeon Run
    // floor every one does.
    this.aware = !!(o.aware || def.boss || o.sleeping || def.ai === 'flee');
    this.lookT = 0;
    this.pack = o.pack || 0;
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

    // Frozen and slowed wear off whatever the foe is doing, asleep or not: a Frost Rune taken
    // while a pack sleeps in a crypt's next room would otherwise hold it frozen until it woke.
    if (this.slowT > 0) {
      this.slowT -= dt;
      if (this.slowT <= 0) this.slowF = 0;
    }
    if (this.freezeT > 0) this.freezeT -= dt;

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
    if (this.dormant) {
      this.anim += dt * 0.5;
      if ((p.x - this.x) ** 2 + (p.y - this.y) ** 2 > 120 * 120 || !g.world.lineOfSight(this.x, this.y, p.x, p.y)) return;
      g.wakePack(this);
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

    // In a crypt (world.vision) a monster that hasn't seen the hero doesn't know where he is:
    // it strolls about (Dungeon.wander) and looks out for him (Dungeon.sees). Once it has seen
    // him, or been hit, it follows him, round corners too (the user's "follow the hero on
    // vision"). Out in the forest and on a Dungeon Run floor every monster knows.
    let unaware = false;
    if (!this.aware) {
      if (!g.world.vision) this.aware = true;
      else if ((this.lookT -= dt) <= 0) {
        this.lookT = rand(0.15, 0.3);
        this.aware = g.world.sees(this, p);
      }
      unaware = !this.aware;
    }

    let sp = this.spd * g.diff.speed;
    if (this.slowT > 0) sp *= 1 - this.slowF;
    if (this.freezeT > 0) sp = 0;
    if (this.holdCd > 0) this.holdCd -= dt;
    if (this.holdT > 0) {
      this.holdT -= dt;
      sp = 0;
    }

    let dx = 0, dy = 0;
    if (this.lockT > 0) {
      this.lockT -= dt;
      dx = this.lockX;
      dy = this.lockY;
    } else if (unaware) {
      // Neither chasing nor shooting nor charging at a hero it hasn't seen.
      const d = g.world.wander(this, dt);
      dx = d[0];
      dy = d[1];
      sp *= STROLL;
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
        // Both return a heading and a share of the monster's own speed.
        case 'charger':
        case 'caster': {
          const r = def.ai === 'charger' ? this.charger(dt) : this.caster(dt);
          dx = r[0];
          dy = r[1];
          sp *= r[2];
          break;
        }
        case 'flee': {
          const l = Math.hypot(this.x - p.x, this.y - p.y) || 1;
          const d = g.world.steer(this, { x: this.x + ((this.x - p.x) / l) * 60, y: this.y + ((this.y - p.y) / l) * 60 });
          dx = d[0];
          dy = d[1];
          sp *= thiefPace(l);
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
    // It faces the way it goes (facing.js); held, frozen or winding up, it isn't going anywhere.
    if (sp > 0) this.face = faceAlong(this.face, dx, dy);
    this.anim += dt * def.anim * (sp > 1 ? 1 : 0.25);

    // Contact damage.
    if (this.dmg > 0 && this.freezeT <= 0) {
      const rr = this.r + p.r;
      if ((p.x - this.x) ** 2 + (p.y - this.y) ** 2 < rr * rr) {
        // It costs the hero health only: no blow, a boss's included, shoves him (Player.update).
        p.hurt(this.dmg * (this.boss ? (1 + (g.dmgScale - 1) * 0.6) * g.bossPower : g.dmgScale) * (this.state === 'dash' ? 1.4 : 1), this);
      }
    }
  }

  // A champion taking a blow. A charge already under way carries on.
  stagger() {
    if (this.holdCd > 0 || this.state === 'dash') return;
    this.holdT = HOLD;
    this.holdCd = HOLD_EVERY;
  }

  charger(dt) {
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
          this.face = faceAttack(this.face, false, this.lockX, this.lockY);
        }
        return [d[0], d[1], 1];
      }
    }
  }

  caster(dt) {
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
      // A shot wound up standing still: it turns toward the hero first (facing.js).
      this.face = faceAttack(this.face, false, dx, dy);
      return [0, 0, 0];
    }
    if (dist < s.range * 0.6) return [-dx / dist, -dy / dist, 0.8];
    const d = g.world.steer(this, p);
    return [d[0], d[1], 1];
  }

  // ------------------------------------------------------------- drawing --

  // Round and round its frames, or its walk if the sprite has one; a shooter with a drawing
  // frame (attack) holds it while it takes aim.
  frameIndex() {
    const s = this.spr;
    if (s.attack && this.state === 'wind') return s.attack[0];
    return s.walk ? s.walk[Math.floor(this.anim) % s.walk.length] : Math.floor(this.anim) % s.frames.length;
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

  // Unlit layer: glowing eyes, embers, champion auras, and a boss's outline burning in its
  // colour, so the night can't swallow it.
  drawEmissive(ctx, cam) {
    if (!this._rect || this.spawnT > 0) return;
    const fr = this.spr.frames[this.frameIndex()];
    const [X, Y, w, h, flip] = this._rect;
    if (fr.em && this.flash <= 0) {
      ctx.globalAlpha = this.alpha;
      ctx.drawImage(flip ? fr.emf : fr.em, Math.round(X), Math.round(Y), Math.round(w), Math.round(h));
      ctx.globalAlpha = 1;
    }
    if ((this.boss || this.lord) && this.flash <= 0) {
      const col = this.rimColor();
      ctx.globalAlpha = this.alpha * (0.7 + 0.3 * Math.sin(this.life * 6));
      ctx.drawImage(fr.variant('rim' + col, (b) => rimBuf(b, col), flip), Math.round(X), Math.round(Y), Math.round(w), Math.round(h));
      ctx.globalAlpha = 1;
    }
  }

  rimColor() {
    return this.boss ? this.def.color : this.mod ? this.mod.color : '#b55088';
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

// Just a boss's outline, in its colour: drawn unlit over the boss.
function rimBuf(b, color) {
  const c = hexPack(color);
  const out = { w: b.w, h: b.h, d: new Uint32Array(b.d.length) };
  for (let i = 0; i < out.d.length; i++) if (b.d[i] === OUTLINE) out.d[i] = c;
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
