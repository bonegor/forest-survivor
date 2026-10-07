// Undead allies raised by the Necromancer. They seek out nearby foes, claw
// at them, and crumble when their time runs out. Enemies ignore them.

import { SPR } from '../engine/sprites.js';
import { sfx } from '../engine/audio.js';
import { rand, TAU, clamp } from '../engine/util.js';
import { shadowSprite, glow } from './fxsprites.js';
import { PC, P } from './particles.js';
import { explode } from './effects.js';

export class Minion {
  constructor(g, x, y, o) {
    this.g = g;
    this.x = x;
    this.y = y;
    this.w = o.w || null;
    this.knight = !!o.knight;
    this.spr = SPR[this.knight ? 'legionnaire' : 'minion'];
    this.dmg = o.dmg;
    this.life = this.maxLife = o.dur;
    this.speed = (this.knight ? 58 : 64) * (o.speed || 1);
    this.r = this.knight ? 6 : 5;
    this.burst = !!o.burst;
    this.ult = !!o.ult;
    this.rise = 0.45;
    this.atk = rand(0.1, 0.4);
    this.retarget = 0;
    this.target = null;
    this.face = 1;
    this.anim = rand(4);
    this.swing = 0;
    this.wob = rand(TAU);
    this.minion = true;
    this.moving = false;
  }

  update(dt) {
    const g = this.g, p = g.player;
    this.life -= dt;
    if (this.life <= 0) {
      this.crumble();
      return false;
    }
    if (this.rise > 0) {
      this.rise -= dt;
      if (Math.random() < 0.5) g.particles.emit(this.x + rand(-5, 5), this.y, 0, rand(-15, 15), rand(-5, 5), rand(20, 50), 0.45, 1, Math.random() < 0.5 ? PC.l : PC.b, P.GROUND | P.FADE, 2, 220);
      return true;
    }
    this.swing = Math.max(0, this.swing - dt);
    this.atk -= dt;
    this.retarget -= dt;
    if (this.retarget <= 0 || !this.target || this.target.dead) {
      this.retarget = 0.3;
      // Fight close to the master rather than wandering off.
      const t = g.nearestEnemy(this.x, this.y, 130);
      this.target = t && Math.hypot(t.x - p.x, t.y - p.y) < 230 ? t : g.nearestEnemy(p.x, p.y, 170);
    }
    const tgt = this.target && !this.target.dead ? this.target : null;
    let tx, ty;
    if (tgt) {
      tx = tgt.x;
      ty = tgt.y;
    } else {
      tx = p.x + Math.cos(this.wob + g.time * 0.7) * 26;
      ty = p.y + Math.sin(this.wob + g.time * 0.7) * 18;
    }
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
    const reach = tgt ? this.r + tgt.r + 3 : 6;
    this.moving = d > reach;
    if (this.moving) {
      const sp = this.speed * (tgt ? 1 : clamp(d / 40, 0.3, 1.3));
      this.x += (dx / d) * sp * dt;
      this.y += (dy / d) * sp * dt;
      g.world.collide(this);
    } else if (tgt && this.atk <= 0) this.attack(tgt, dx / d, dy / d);
    if (Math.abs(dx) > 1) this.face = dx < 0 ? -1 : 1;
    this.anim += dt * (this.moving ? 6 : 1.5);
    // Never lose the master.
    if (Math.hypot(this.x - p.x, this.y - p.y) > 260) {
      const spot = g.world.freeSpot(p.x + rand(-20, 20), p.y + rand(-14, 14));
      if (spot) {
        this.x = spot.x;
        this.y = spot.y;
      }
    }
    return true;
  }

  attack(tgt, nx, ny) {
    const g = this.g;
    this.atk = this.knight ? 0.75 : 0.6;
    this.swing = 0.15;
    if (this.knight) {
      // Death knights cleave everything in front of them.
      const cx = this.x + nx * 8, cy = this.y + ny * 8;
      for (const e of g.grid.query(cx, cy, 24)) {
        if (e.dead || Math.hypot(e.x - cx, e.y - cy) > 13 + e.r) continue;
        g.hitEnemy(e, this.dmg, { w: this.w, kb: 1, kx: nx, ky: ny, ult: this.ult });
      }
    } else g.hitEnemy(tgt, this.dmg, { w: this.w, kb: 0.7, kx: nx, ky: ny, ult: this.ult });
    g.particles.burst(tgt.x, tgt.y - 4, 4, 3, [PC.l, PC.w], 40, 0.2, 1, P.GLOW | P.FADE, {});
  }

  crumble() {
    const g = this.g;
    g.particles.burst(this.x, this.y - 6, 6, 10, [PC.z, PC.Z, PC.l], 60, 0.8, 1, P.GROUND | P.FADE, { vz: 70, grav: 260 });
    if (this.burst) {
      explode(g, this.x, this.y - 4, 26, this.dmg * 1.5, this.w, 'soul');
    } else sfx('bones', { pitch: 1.3 });
  }

  rect(cam) {
    const S = cam.S;
    const fr = this.spr.frames[this.moving ? Math.floor(this.anim) % this.spr.frames.length : 0];
    const flip = this.face < 0;
    const img = fr.get(flip);
    const lunge = this.swing > 0 ? this.face * 2 : 0;
    const w = img.width * S, h = img.height * S;
    const X = Math.round((this.x + lunge - cam.x) * S - w / 2), Y = Math.round((this.y - cam.y) * S - h + S);
    return { fr, flip, img, X, Y, w, h };
  }

  drawShadow(ctx, cam) {
    const S = cam.S;
    const sh = shadowSprite(this.knight ? 12 : 9);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(sh, Math.round((this.x - cam.x) * S - (sh.width * S) / 2), Math.round((this.y - cam.y) * S - (sh.height * S) / 2), sh.width * S, sh.height * S);
    ctx.globalAlpha = 1;
  }

  draw(ctx, cam) {
    const { img, X, Y, w, h } = this.rect(cam);
    const fade = this.life < 1 ? this.life : 1;
    ctx.globalAlpha = fade;
    if (this.rise > 0) {
      const k = 1 - this.rise / 0.45;
      const vis = Math.max(1, Math.round(img.height * k));
      ctx.drawImage(img, 0, 0, img.width, vis, X, Math.round(Y + h - (vis * h) / img.height), w, Math.round((vis * h) / img.height));
    } else ctx.drawImage(img, X, Y, w, h);
    ctx.globalAlpha = 1;
  }

  drawEmissive(ctx, cam) {
    if (this.rise > 0) return;
    const { fr, flip, X, Y, w, h } = this.rect(cam);
    if (fr.em) ctx.drawImage(flip ? fr.emf : fr.em, X, Y, w, h);
  }

  drawGlow(ctx, cam) {
    const S = cam.S;
    const s = (this.knight ? 34 : 26) * S;
    ctx.globalAlpha = 0.22 * Math.min(1, this.life);
    ctx.drawImage(glow('#63c74d'), (this.x - cam.x) * S - s / 2, (this.y - 8 - cam.y) * S - s / 2, s, s);
    ctx.globalAlpha = 1;
  }
}
