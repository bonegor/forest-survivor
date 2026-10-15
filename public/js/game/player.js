// The hero: movement, stats, health, experience, fury and ultimates.

import { HEROES } from '../data/heroes.js';
import { PASSIVES } from '../data/passives.js';
import { gearBonuses } from '../shared/items.js';
import { input } from '../engine/input.js';
import { sfx } from '../engine/audio.js';
import { clamp, damp, rand, TAU } from '../engine/util.js';
import { PC, P } from './particles.js';
import { faceAlong, faceAttack } from './facing.js';

export const BASE_SPEED = 70;
export const BASE_MAGNET = 42;

export function xpFor(level) {
  if (level < 20) return 5 + (level - 1) * 10;
  if (level < 40) return 200 + (level - 20) * 18;
  // Past level 100 (endless nights) each level costs ever more, so Blessings thin out.
  return 560 + (level - 40) * 55 + Math.max(0, level - 100) ** 2 * 2;
}

export class Player {
  constructor(g, heroId, meta) {
    this.g = g;
    this.id = heroId;
    this.hero = HEROES[heroId];
    this.meta = meta;
    this.x = 0;
    this.y = 0;
    this.r = 5;
    this.vx = 0;
    this.vy = 0;
    this.face = 1;
    this.aim = 0; // radians, last movement direction
    this.moving = false;
    this.anim = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNext = xpFor(1);
    this.passives = new Map();
    this.blessings = 0; // stacking rewards once the build is complete
    this.weapons = [];
    this.strikeAt = null; // when the last blow struck by hand began (Game.strike)
    this.strikeBuf = 0; // a strike pressed before the weapon was ready, kept a moment
    this.fury = 0;
    this.ult = null; // active ultimate state
    this.invuln = 0;
    this.flash = 0;
    this.buffs = new Map(); // id -> { t, max }
    this.revivals = meta.revival || 0;
    this.rerolls = 2 + (meta.reroll || 0);
    this.dead = false;
    this.stepT = 0;
    this.heartT = 0;
    this.healPool = 0; // sanctuary heal accumulator
    this.recompute();
    this.revivals += this.gearB.revival;
    this.hp = this.maxHp;
  }

  passiveSum(key) {
    let v = 0;
    for (const [id, rank] of this.passives) {
      const s = PASSIVES[id].stat[key];
      if (s) v += s * rank;
    }
    return v;
  }

  recompute() {
    const h = this.hero.stats, m = this.meta;
    // Worn gear adds to the relics' sums.
    const q = (this.gearB = gearBonuses(this.g.gear));
    const bonus = (k) => this.passiveSum(k) + q[k];
    const oldMax = this.maxHp || 0;
    this.maxHp = Math.round((h.maxHp ?? 100) * m.maxHp * (1 + bonus('maxHp') + this.blessings * 0.02));
    this.armor = (h.armor || 0) + m.armor + bonus('armor');
    this.speedMul = (h.speed || 1) * m.speed * (1 + bonus('speed'));
    this.might = (h.might || 1) * m.might * (1 + bonus('might') + this.blessings * 0.05);
    this.area = (h.area || 1) * m.area * (1 + bonus('area'));
    this.cooldown = Math.max(0.35, (h.cooldown || 1) * m.cooldown * (1 + bonus('cooldown')));
    this.amount = bonus('amount') + (m.amount || 0);
    this.duration = (m.duration || 1) * (1 + bonus('duration'));
    this.projSpeed = (h.projSpeed || 1) * (m.projSpeed || 1) * (1 + bonus('projSpeed'));
    this.magnet = BASE_MAGNET * m.magnet * (1 + bonus('magnet'));
    this.luck = (h.luck || 1) * m.luck * (1 + bonus('luck'));
    this.growth = (h.growth || 1) * m.growth * (1 + bonus('growth'));
    this.greed = m.greed * (1 + q.greed);
    this.regenMul = h.regenMul || 1;
    this.regen = ((h.regen || 0) + m.regen + bonus('regen')) * this.regenMul;
    this.crit = 0.05 + (h.crit || 0) + bonus('crit');
    this.critMult = 2 + q.critMult;
    // More health to have brings the health with it; less (gear sold) caps it.
    if (oldMax && this.maxHp > oldMax) this.hp += this.maxHp - oldMax;
    if (this.hp > this.maxHp) this.hp = this.maxHp;
    for (const w of this.weapons) w.recompute();
  }

  // Worn gear changed mid-run: its stats now, and a revive more or less from a legendary.
  gearChanged() {
    const before = this.gearB.revival;
    this.recompute();
    this.revivals = Math.max(0, this.revivals + this.gearB.revival - before);
  }

  // A blow his weapon strikes by itself never turns him, walking or standing: he keeps facing
  // the way he last walked, whichever side it lands (facing.js).
  swing(ang) {
    this.swingT = 0.14;
    this.swingAng = ang;
  }

  // A blow struck by the player (Game.strike): the sprite's attack starts now (at, the game's
  // clock). The one blow that may turn him: standing, he turns to the foe the player strikes at.
  strike(ang, at) {
    this.strikeAt = at;
    this.face = faceAttack(this.face, this.moving, Math.cos(ang), Math.sin(ang));
  }

  buff(id) {
    const b = this.buffs.get(id);
    return b && b.t > 0;
  }

  addBuff(id, t) {
    this.buffs.set(id, { t, max: t });
  }

  get moveSpeed() {
    let s = BASE_SPEED * this.speedMul;
    if (this.buff('haste')) s *= 1.3;
    if (this.ult && this.ult.type === 'whirlwind') s *= 1.15;
    return s;
  }

  update(dt) {
    const g = this.g;
    for (const [id, b] of this.buffs) {
      b.t -= dt;
      if (b.t <= 0) this.buffs.delete(id);
    }
    // Movement.
    const ax = input.axis();
    const sp = this.moveSpeed;
    this.vx = damp(this.vx, ax.x * sp, 16, dt);
    this.vy = damp(this.vy, ax.y * sp, 16, dt);
    this.moving = Math.abs(ax.x) + Math.abs(ax.y) > 0.1;
    if (this.moving) {
      this.aim = Math.atan2(ax.y, ax.x);
      this.face = faceAlong(this.face, ax.x, ax.y);
    }
    // Only the player moves the hero: no blow, however heavy, shoves him (Enemy.update).
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    g.world.collide(this);
    const spd = Math.hypot(this.vx, this.vy);
    this.anim += dt * (this.moving ? 7 * clamp(spd / BASE_SPEED, 0.6, 1.6) : 1.6);
    if (this.moving) {
      this.stepT -= dt * spd;
      if (this.stepT <= 0) {
        this.stepT = 22;
        g.particles.emit(this.x + rand(-2, 2), this.y, 0, rand(-8, 8), rand(-4, 2), 6, 0.4, 1, g.world.dustColor ?? PC.N, P.FADE | P.GROUND, 3, 30);
      }
    }

    // Regeneration and sanctuary healing.
    if (this.hp < this.maxHp && !this.dead) {
      let regen = this.regen;
      if (this.buff('protection')) regen += this.regenMul;
      if (regen > 0) this.hp = Math.min(this.maxHp, this.hp + regen * dt);
    }
    if (this.healPool > 0) {
      const h = Math.min(this.healPool, 4 * dt);
      this.healPool -= h;
      this.hp = Math.min(this.maxHp, this.hp + h * this.regenMul);
    }

    this.invuln = Math.max(0, this.invuln - dt);
    this.swingT = Math.max(0, (this.swingT || 0) - dt);
    this.flash = Math.max(0, this.flash - dt);

    // Low health heartbeat.
    if (this.hp / this.maxHp < 0.3 && !this.dead) {
      this.heartT -= dt;
      if (this.heartT <= 0) {
        this.heartT = 0.9;
        sfx('heartbeat');
      }
    }

    // Blows struck by hand, where the hero fights that way (Game.caveStrike): a press waits a
    // moment for the weapon to be ready, and holding the key strikes each time it is.
    if (g.caveStrike) {
      this.strikeBuf = input.pressed('strike') ? 0.25 : Math.max(0, this.strikeBuf - dt);
      if ((this.strikeBuf > 0 || input.down('strike')) && g.strike()) this.strikeBuf = 0;
    }

    // Ultimate.
    if (this.ult) {
      this.ult.t -= dt;
      g.updateUlt(this.ult, dt);
      if (this.ult.t <= 0) this.ult = null;
    } else if (this.fury >= 100 && input.pressed('ult')) {
      this.fury = 0;
      g.startUlt(this.hero.ult);
    }
  }

  get untouchable() {
    return this.invuln > 0 || (this.ult && this.ult.type === 'shadowdance') || this.g.state !== 'play';
  }

  hurt(amount, src) {
    const g = this.g;
    if (this.dead || this.untouchable || this.devGod || g.state === 'faint') return 0;
    let dmg = amount * g.diff.dmg;
    dmg = Math.max(1, dmg - this.armor);
    if (this.buff('protection')) dmg *= 0.5;
    if (this.ult && this.ult.type === 'whirlwind') dmg *= 0.5;
    dmg = Math.round(dmg);
    this.hp -= dmg;
    this.invuln = 0.6;
    this.flash = 0.12;
    this.fury = Math.min(100, this.fury + 2.5);
    g.stats.damageTaken += dmg;
    if (src && src.boss) g.stats.fromBoss += dmg;
    else if (src) g.stats.fromMobs += dmg;
    else g.stats.fromShots += dmg;
    g.stats.minHp = Math.min(g.stats.minHp, Math.max(0, this.hp) / this.maxHp);
    g.numbers.add(this.x, this.y - 18, dmg, 'player');
    g.shake(0.35);
    g.hurtFlash = 0.35;
    sfx('hurt');
    g.particles.burst(this.x, this.y - 8, 6, 10, [PC.r, PC.R, PC.x], 60, 0.5, 1, P.GROUND | P.FADE, { grav: 200, vz: 60 });
    // Shove nearby enemies back so a crowd can't stun-lock you.
    g.pushback(this.x, this.y, 30, 120);
    if (src && src.vampiric) src.hp = Math.min(src.maxHp, src.hp + dmg * 3);
    if (this.hp <= 0) {
      if (g.inCrypt) {
        // Felled in a crypt he only faints, and wakes outside it (Game.faint): a Second
        // Wind is kept for the forest, where a fall is the end.
        this.hp = 0;
        g.faint();
      } else if (this.revivals > 0) {
        this.revivals--;
        this.hp = Math.round(this.maxHp * 0.6);
        this.invuln = 2.5;
        g.revive();
      } else {
        this.hp = 0;
        this.dead = true;
        g.onPlayerDeath();
      }
    }
    return dmg;
  }

  heal(amount, quiet = false) {
    if (this.dead) return 0;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const healed = Math.round(this.hp - before);
    if (healed > 0 && !quiet) {
      this.g.numbers.add(this.x, this.y - 18, healed, 'heal');
      sfx('heal');
    }
    return healed;
  }

  addXp(v) {
    let gain = v * this.growth;
    if (this.buff('wisdom')) gain *= 1.5;
    if (this.g.mode === 's15' || this.g.mode === 'ranked') gain *= 1.1;
    else if (this.g.mode === 'dungeon') gain *= 1.15; // fewer foes down there
    this.xp += gain;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = xpFor(this.level);
      this.g.queueLevelUp();
    }
  }

  addFury(v) {
    this.fury = Math.min(100, this.fury + v);
  }
}

export const ULT_DURATION = { whirlwind: 3.5, arrowstorm: 3, cataclysm: 2.6, shadowdance: 3, deadrise: 0.8 };
export { TAU };
