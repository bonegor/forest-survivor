// Things to pick up: soul gems (XP), gold, potions, scrolls, relics, chests.

import { SPR } from '../engine/sprites.js';
import { sfx } from '../engine/audio.js';
import { rand, TAU } from '../engine/util.js';
import { shadowSprite, glow } from './fxsprites.js';
import { PC, P } from './particles.js';

const GEM_TIERS = [
  [100, 'gem4', '#feae34', 'gold'],
  [25, 'gem3', '#e43b44', 'red'],
  [5, 'gem2', '#63c74d', 'green'],
  [0, 'gem1', '#2ce8f5', 'cyan'],
];

const LOOK = {
  coin: { sprite: 'coin', glow: '#feae34', anim: 10 },
  goldpile: { sprite: 'goldpile', glow: '#feae34', anim: 3 },
  potion: { sprite: 'potion', glow: '#e43b44' },
  elixir: { sprite: 'elixir', glow: '#feae34', light: 'gold' },
  magnet: { sprite: 'magnet', glow: '#e43b44' },
  relic: { sprite: 'relic', glow: '#fee761', light: 'holy', anim: 2 },
  frostrune: { sprite: 'frostrune', glow: '#2ce8f5', light: 'cyan', anim: 2 },
  fury: { sprite: 'fury', glow: '#b55088', light: 'purple', anim: 3 },
  chest: { sprite: 'chest', glow: '#feae34', light: 'gold' },
};

// Items that fly to you inside the magnet radius.
const MAGNETIC = new Set(['gem', 'coin', 'goldpile', 'potion', 'fury']);

export class Pickup {
  constructor(g, kind, x, y, value = 1, opts = {}) {
    this.g = g;
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.value = value;
    this.z = opts.pop === false ? 0 : 1;
    this.vz = opts.pop === false ? 0 : rand(55, 95);
    this.vx = opts.pop === false ? 0 : rand(-30, 30);
    this.vy = opts.pop === false ? 0 : rand(-20, 20);
    this.t = rand(3);
    this.pulled = false;
    this.speed = 0;
    this.dead = false;
    this.opts = opts;
    this.setLook();
  }

  setLook() {
    if (this.kind === 'gem') {
      const tier = GEM_TIERS.find((t) => this.value >= t[0]);
      this.sprite = SPR[tier[1]];
      this.glowColor = tier[2];
      this.lightKey = tier[3];
    } else {
      const L = LOOK[this.kind];
      this.sprite = SPR[L.sprite];
      this.glowColor = L.glow;
      this.lightKey = L.light;
    }
  }

  update(dt) {
    const g = this.g, p = g.player;
    this.t += dt;
    if (this.z > 0 || this.vz > 0) {
      this.vz -= 320 * dt;
      this.z += this.vz * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.z <= 0) {
        this.z = 0;
        if (this.vz < -40) this.vz = -this.vz * 0.35;
        else this.vz = 0;
        this.vx *= 0.4;
        this.vy *= 0.4;
      }
    }
    const dx = p.x - this.x, dy = p.y - 3 - this.y;
    const d = Math.hypot(dx, dy);
    if (!this.pulled && MAGNETIC.has(this.kind)) {
      const range = this.kind === 'gem' ? p.magnet : p.magnet * 0.7;
      if (d < range || (this.kind === 'gem' && g.magnetAll > 0)) {
        this.pulled = true;
        // A little hop away first makes the pull feel springy.
        this.speed = -60;
      }
    }
    if (this.pulled) {
      this.speed = Math.min(480, this.speed + 900 * dt);
      if (d > 0) {
        // Negative speed (the initial hop) moves it away from the player.
        const k = Math.min(this.speed * dt, d) / d;
        this.x += dx * k;
        this.y += dy * k;
      }
      if (d < 7) this.collect();
    } else if (d < 9 + p.r) {
      this.collect();
    }
    return !this.dead;
  }

  collect() {
    const g = this.g, p = g.player;
    this.dead = true;
    switch (this.kind) {
      case 'gem': {
        p.addXp(this.value);
        g.gemCombo = g.gemComboT > 0 ? Math.min(g.gemCombo + 1, 24) : 0;
        g.gemComboT = 0.35;
        sfx('gem', { pitch: 1 + g.gemCombo * 0.035 });
        g.particles.emit(p.x, p.y - 8, 0, rand(-20, 20), rand(-20, 0), 20, 0.25, 1, PC.c, P.GLOW | P.FADE, 3);
        break;
      }
      case 'coin':
      case 'goldpile': {
        const v = Math.max(1, Math.round(this.value * p.greed * (p.buff('fortune') ? 2 : 1)));
        g.gold += v;
        g.stats.gold += v;
        sfx('coin');
        if (this.kind === 'goldpile') g.numbers.add(p.x, p.y - 20, v, 'gold');
        g.particles.burst(p.x, p.y - 8, 2, 5, [PC.Y, PC.y], 40, 0.35, 1, P.GLOW | P.FADE, { vz: 40 });
        break;
      }
      case 'potion':
        p.heal(Math.round(p.maxHp * 0.3));
        g.particles.burst(p.x, p.y - 8, 2, 14, [PC.L, PC.l, PC.w], 50, 0.6, 1, P.GLOW | P.FADE, { vz: 60 });
        break;
      case 'elixir':
        p.heal(p.maxHp);
        g.particles.burst(p.x, p.y - 8, 2, 24, [PC.Y, PC.l, PC.w], 70, 0.8, 1, P.GLOW | P.FADE, { vz: 70 });
        break;
      case 'magnet':
        g.magnetAll = 2.5;
        sfx('pick');
        g.banner('Scroll of Gathering', 'All soul gems fly to you', '#2ce8f5', 1.6);
        break;
      case 'relic':
        g.holyNova();
        break;
      case 'frostrune':
        g.freezeAll(6);
        break;
      case 'fury':
        p.addFury(40);
        sfx('pick');
        g.particles.burst(p.x, p.y - 8, 2, 16, [PC.P, PC.i, PC.w], 70, 0.6, 1, P.GLOW | P.FADE, { vz: 60 });
        break;
      case 'chest':
        g.openChest(this.opts);
        break;
      default:
        break;
    }
  }

  draw(ctx, cam) {
    const S = cam.S;
    const sx = (this.x - cam.x) * S, sy = (this.y - cam.y) * S;
    if (sx < -40 || sy < -40 || sx > cam.pxW + 40 || sy > cam.pxH + 40) return;
    const big = this.kind === 'chest';
    const sh = shadowSprite(big ? 14 : this.kind === 'gem' ? 5 : 6);
    ctx.globalAlpha = 0.45;
    ctx.drawImage(sh, Math.round(sx - (sh.width * S) / 2), Math.round(sy - (sh.height * S) / 2), sh.width * S, sh.height * S);
    ctx.globalAlpha = 1;
    const look = LOOK[this.kind];
    const frames = this.sprite.frames;
    let fi = 0;
    if (this.kind === 'gem') fi = Math.floor(this.t * 2.5) % 5 === 0 ? 1 : 0;
    else if (look && look.anim) fi = Math.floor(this.t * look.anim) % frames.length;
    const img = frames[Math.min(fi, frames.length - 1)].c;
    const bob = big || this.pulled ? 0 : Math.sin(this.t * 4) * 1.2;
    const w = img.width * S, h = img.height * S;
    ctx.drawImage(img, Math.round(sx - w / 2), Math.round(sy - h - (this.z + bob + 1) * S), w, h);
  }

  drawGlow(ctx, cam) {
    const S = cam.S;
    const sx = (this.x - cam.x) * S, sy = (this.y - this.z - 3 - cam.y) * S;
    if (sx < -60 || sy < -60 || sx > cam.pxW + 60 || sy > cam.pxH + 60) return;
    const big = this.kind === 'chest' || this.kind === 'relic' || this.kind === 'elixir';
    const s = (big ? 40 : this.kind === 'gem' ? 12 : 14) * S;
    ctx.globalAlpha = big ? 0.55 + 0.15 * Math.sin(this.t * 5) : 0.45;
    ctx.drawImage(glow(this.glowColor), sx - s / 2, sy - s / 2, s, s);
    ctx.globalAlpha = 1;
    if (this.lightKey && (big || this.kind !== 'gem' || this.value >= 5)) this.g.light(this.x, this.y, big ? 70 : 26, this.lightKey, 0.8);
  }
}

export function gemTierValue(v) {
  return GEM_TIERS.find((t) => v >= t[0])[0];
}
