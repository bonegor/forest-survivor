// Things to pick up: soul gems (XP), gold, potions, scrolls, relics, chests, gear.

import { SPR } from '../engine/sprites.js';
import { RARITIES } from '../shared/items.js';
import { sfx } from '../engine/audio.js';
import { rand } from '../engine/util.js';
import { shadowSprite, glow, glint, beamSprite } from './fxsprites.js';
import { tierOf, chestFrame } from './chests.js';
import { PC, P } from './particles.js';

// From the richest: [least XP, sprite, glow, light, palette key of its twinkles].
const GEM_TIERS = [
  [100, 'gem4', '#feae34', 'gold', 'Y'],
  [25, 'gem3', '#e43b44', 'red', 'r'],
  [5, 'gem2', '#63c74d', 'green', 'l'],
  [0, 'gem1', '#2ce8f5', 'cyan', 'c'],
];
// Soul gems are drawn half again their sprites' size; their shadow, glow and twinkles grow with them.
const GEM_SIZE = 1.5;

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

// The light a piece of gear casts, by rarity.
const GEAR_LIGHT = [null, null, 'cyan', 'purple', 'gold'];
// A Rare, an Epic or a Legendary piece stands in a pillar of its colour, this tall (world px; a
// Legendary's to the top of the screen, a glint running up it).
export const GEAR_PILLAR = [0, 0, 70, 120, Infinity];

// Items that fly to you inside the magnet radius.
const MAGNETIC = new Set(['gem', 'coin', 'goldpile', 'potion', 'fury']);
// A dropped chest lies on the ground this long (game seconds) before it can be opened, even under
// the hero, so it is seen before its screen comes up: 0.82 s of real time at GAME_SPEED 1.518.
export const CHEST_SETTLE = 1.25;

// The shadows pickups cast: a chest's, a soul gem's and the rest's, made on first use.
let shadows = null;

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
    this.age = 0; // seconds since it dropped (CHEST_SETTLE)
    this.pulled = false;
    this.speed = 0;
    this.dead = false;
    this.opts = opts;
    // Where it was last drawn, [X, Y, w, h, frame]: one array for its whole life, which _rect
    // points at while it is on screen (draw).
    this._r = [0, 0, 0, 0, 0];
    this._rect = null;
    // Its glow sprite and the colour it was made for (drawGlow, drawBling).
    this._glow = null;
    this._glowFor = null;
    this.setLook();
  }

  setLook() {
    if (this.kind === 'gem') {
      const i = GEM_TIERS.findIndex((t) => this.value >= t[0]);
      const tier = GEM_TIERS[i];
      this.sprite = SPR[tier[1]];
      this.glowColor = tier[2];
      this.lightKey = tier[3];
      this.rank = GEM_TIERS.length - 1 - i; // 0 for the smallest gem, 3 for the gold one
      this.twinkle = PC[tier[4]];
    } else if (this.kind === 'item') {
      const it = this.opts.item;
      this.sprite = SPR['g_' + it.slot];
      this.glowColor = RARITIES[it.rarity].color;
      this.lightKey = GEAR_LIGHT[it.rarity];
    } else if (this.kind === 'chest') {
      // Its tier's colours (chests.js): a champion's bronze, a lord's silver, a boss's gold.
      const T = tierOf(this.opts.kind);
      this.sprite = SPR.chest;
      this.glowColor = T.glow;
      this.lightKey = T.light;
      this.scale = T.scale;
    } else {
      const L = LOOK[this.kind];
      this.sprite = SPR[L.sprite];
      this.glowColor = L.glow;
      this.lightKey = L.light;
    }
  }

  update(dt) {
    if (this.dead) return false; // swept up already, e.g. on the way out of a crypt
    const g = this.g, p = g.player;
    this.t += dt;
    this.age += dt;
    if (this.z > 0 || this.vz > 0) {
      this.vz -= 320 * dt;
      this.z += this.vz * dt;
      // It pops out over open floor only: a wall turns it back (a lord can fall right by one).
      const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
      if (!g.world.free || g.world.free(nx, ny)) {
        this.x = nx;
        this.y = ny;
      } else {
        this.vx *= -0.4;
        this.vy *= -0.4;
      }
      if (this.z <= 0) {
        this.z = 0;
        // A piece of gear landing rings out by its rarity (sfx 'gear').
        if (this.kind === 'item' && !this.landed) {
          this.landed = true;
          sfx('gear', { size: this.opts.item.rarity, pan: Math.max(-1, Math.min(1, (this.x - p.x) / 200)) });
        }
        if (this.vz < -40) this.vz = -this.vz * 0.35;
        else this.vz = 0;
        this.vx *= 0.4;
        this.vy *= 0.4;
      }
    }
    if (p.dead) return true; // the fallen pick nothing up (no XP or gold after the fall)
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
    } else if (d < 9 + p.r && (this.kind !== 'chest' || this.age >= CHEST_SETTLE)) {
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
        // A little jackpot of twinkles: more for a richer gem, and more on a streak.
        g.particles.burst(p.x, p.y - 8, 2, 1 + this.rank + Math.floor(g.gemCombo / 8), [this.twinkle, PC.w, PC.Y], 55, 0.45, 1.5, P.GLOW | P.FADE | P.STAR, { vz: 45 });
        break;
      }
      case 'coin':
      case 'goldpile': {
        const v = Math.max(1, Math.round(this.value * p.greed * (p.buff('fortune') ? 2 : 1)));
        g.gold += v;
        g.stats.gold += v;
        sfx('coin');
        if (this.kind === 'goldpile') {
          g.numbers.add(p.x, p.y - 20, v, 'gold');
          g.hud.fling(this.x, this.y); // a coin off the pile to the gold counter
        }
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
      case 'fury': {
        // The fury is his at once; the look follows: a comet to the HUD orb (Hud.comet).
        const was = p.fury;
        p.addFury(40);
        g.hud.comet(this.x, this.y, p.fury - was);
        sfx('pick');
        g.particles.burst(p.x, p.y - 8, 2, 16, [PC.P, PC.i, PC.w], 70, 0.6, 1, P.GLOW | P.FADE, { vz: 60 });
        break;
      }
      case 'chest':
        g.openChest(this.opts);
        break;
      case 'item':
        g.itemQueue.push(this.opts.item);
        sfx('chestopen');
        break;
      default:
        break;
    }
  }

  draw(ctx, cam) {
    const S = cam.S;
    const sx = (this.x - cam.x) * S, sy = (this.y - cam.y) * S;
    this._rect = null;
    if (sx < -40 || sy < -40 || sx > cam.pxW + 40 || sy > cam.pxH + 40) return;
    const big = this.kind === 'chest', k = this.kind === 'gem' ? GEM_SIZE : big ? this.scale : 1;
    shadows ||= [shadowSprite(14), shadowSprite(5 * GEM_SIZE), shadowSprite(6)];
    const sh = shadows[big ? 0 : this.kind === 'gem' ? 1 : 2];
    ctx.globalAlpha = 0.45;
    ctx.drawImage(sh, Math.round(sx - (sh.width * S) / 2), Math.round(sy - (sh.height * S) / 2), sh.width * S, sh.height * S);
    ctx.globalAlpha = 1;
    const look = LOOK[this.kind];
    const frames = this.sprite.frames;
    let fi = 0;
    if (this.kind === 'gem') fi = Math.floor(this.t * 2.5) % 5 === 0 ? 1 : 0;
    else if (look && look.anim) fi = Math.floor(this.t * look.anim) % frames.length;
    fi = Math.min(fi, frames.length - 1);
    const img = big ? chestFrame(this.opts.kind) : frames[fi].c;
    const bob = big || this.pulled ? 0 : Math.sin(this.t * 4) * 1.2;
    const w = img.width * S * k, h = img.height * S * k;
    const X = Math.round(sx - w / 2), Y = Math.round(sy - h - (this.z + bob + 1) * S);
    ctx.drawImage(img, X, Y, w, h);
    const r = this._r;
    r[0] = X;
    r[1] = Y;
    r[2] = w;
    r[3] = h;
    r[4] = fi;
    this._rect = r;
  }

  // Unlit, over the night's darkness: what glows in a pickup (a gem's facets, a coin's shine)
  // stays as bright as neon.
  drawEmissive(ctx) {
    const r = this._rect;
    if (!r) return;
    const X = r[0], Y = r[1], w = r[2], h = r[3];
    const em = this.sprite.frames[r[4]].em;
    if (em) ctx.drawImage(em, X, Y, w, h);
  }

  drawGlow(ctx, cam) {
    const S = cam.S;
    const sx = (this.x - cam.x) * S, sy = (this.y - this.z - 3 - cam.y) * S;
    if (sx < -60 || sy < -60 || sx > cam.pxW + 60 || sy > cam.pxH + 60) return;
    if (this.kind === 'gem') return this.drawBling(ctx, S, sx, sy);
    const big = this.kind === 'chest' || this.kind === 'relic' || this.kind === 'elixir' || this.kind === 'item';
    const s = (big ? 40 * (this.scale || 1) : this.kind === 'gem' ? 12 : 14) * S;
    if (this.kind === 'item') this.drawPillar(ctx, cam, sx, sy);
    // EVOLVE READY: while a weapon waits on a chest to evolve, every chest lying about glows orange.
    const ready = this.kind === 'chest' && this.g.evoReady.length > 0;
    ctx.globalAlpha = big ? (ready ? 0.7 + 0.3 * Math.sin(this.t * 8) : 0.55 + 0.15 * Math.sin(this.t * 5)) : 0.45;
    ctx.drawImage(ready ? glow('#f77622') : this.glowSprite(), sx - s / 2, sy - s / 2, s, s);
    ctx.globalAlpha = 1;
    if (this.lightKey) this.g.light(this.x, this.y, big ? 70 : 26, ready ? 'fire' : this.lightKey, 0.8);
  }

  // A Rare, Epic or Legendary piece's pillar of light, in its colour (GEAR_PILLAR), breathing; a
  // Legendary's reaches the top of the screen with a glint running up it.
  drawPillar(ctx, cam, sx, sy) {
    const it = this.opts.item, tall = GEAR_PILLAR[it.rarity];
    if (!tall) return;
    const S = cam.S, top = tall === Infinity ? 0 : sy - tall * S, h = Math.max(1, sy - top);
    const w = (it.rarity === 4 ? 14 : it.rarity === 3 ? 11 : 9) * S;
    const color = RARITIES[it.rarity].color;
    ctx.globalAlpha = 0.5 + 0.2 * Math.sin(this.t * 4);
    ctx.drawImage(beamSprite(color), Math.round(sx - w / 2), Math.round(top), Math.round(w), Math.round(h));
    if (it.rarity === 4) {
      const gy = sy - ((this.t * 0.6) % 1) * h;
      ctx.globalAlpha = 0.9;
      glint(ctx, sx, gy, 3 * S, Math.max(1, Math.round(S)), '#fff3a8');
    }
    ctx.globalAlpha = 1;
  }

  // Soul gems, casino style: a glow that beats like marquee lights, a glint that twinkles across
  // the facets (the richer the gem, the more often), and twinkles circling the two richest.
  drawBling(ctx, S, sx, sy) {
    const r = this.rank, t = this.t, G = S * GEM_SIZE, rect = this._rect;
    // Around the gem as drawn, bob and all.
    if (rect) sy = rect[1] + rect[3] / 2;
    const beat = Math.sin(t * 7);
    const s = (12 + r * 3) * G * (1 + 0.12 * beat);
    ctx.globalAlpha = 0.42 + 0.2 * beat;
    ctx.drawImage(this.glowSprite(), sx - s / 2, sy - s / 2, s, s);
    const k = Math.max(1, Math.round(S));
    if (rect) {
      const X = rect[0], Y = rect[1], w = rect[2], h = rect[3];
      const ph = (t % (1.8 - r * 0.3)) / 0.32;
      if (ph < 1) {
        const a = Math.sin(ph * Math.PI);
        ctx.globalAlpha = a;
        glint(ctx, X + w * 0.38, Y + h * 0.3, G * (1 + 2.5 * a), k);
      }
    }
    for (let i = 0; i < r - 1; i++) {
      const ang = t * 2.4 + i * Math.PI, tw = Math.abs(Math.sin(t * 9 + i * 1.7));
      ctx.globalAlpha = 0.45 + 0.55 * tw;
      glint(ctx, sx + Math.cos(ang) * 6 * G, sy + Math.sin(ang) * 3.5 * G, G * (0.5 + tw), k, i ? '#ffffff' : '#fee761');
    }
    ctx.globalAlpha = 1;
    if (this.value >= 5) this.g.light(this.x, this.y, 26, this.lightKey, 0.8);
  }

  // Its glow (fxsprites.js glow), looked up again only when its colour changes (setLook).
  glowSprite() {
    if (!this._glow || this._glowFor !== this.glowColor) {
      this._glowFor = this.glowColor;
      this._glow = glow(this.glowColor);
    }
    return this._glow;
  }
}
