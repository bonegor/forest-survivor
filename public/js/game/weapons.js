// Weapon instances and the firing behaviour of every weapon kind.

import { WEAPONS, MAX_WEAPON_LEVEL } from '../data/weapons.js';
import { sfx } from '../engine/audio.js';
import { rand, TAU, pick } from '../engine/util.js';
import { spawnProjectile } from './projectiles.js';
import { Slash, Pool, Orbit, Aura, Bolt, Meteor, Ring, explode } from './effects.js';
import { PC, P } from './particles.js';

export class Weapon {
  constructor(g, id, src) {
    this.g = g;
    this.id = id;
    this.def = WEAPONS[id];
    this.level = 1;
    this.src = src; // per-weapon hit-cooldown channel on enemies
    this.cd = 0.35;
    this.queue = 0;
    this.queueT = 0;
    this.gap = 0.1;
    this.shot = 0;
    this.volley = 0;
    this.dmgDealt = 0;
    this.kills = 0;
    this.since = g.time;
    this.fx = null;
    this.targets = [];
    this.recompute();
  }

  get evolved() {
    return !!this.def.evolved;
  }

  get maxed() {
    return this.evolved || this.level >= MAX_WEAPON_LEVEL;
  }

  recompute() {
    const b = { dmg: 0, cd: 1, amount: 1, area: 1, speed: 1, dur: 1, pierce: 0, kb: 1, tick: 0.5, chains: 0, slow: 0, freeze: 0, ...this.def.base };
    if (!this.def.evolved) {
      for (let i = 0; i < this.level - 1; i++) {
        for (const [k, v] of Object.entries(this.def.levels[i])) if (k !== 'text') b[k] = (b[k] || 0) + v;
      }
    }
    const p = this.g.player;
    this.s = {
      ...b,
      amount: Math.max(1, b.amount + (this.def.kind === 'aura' ? 0 : p.amount)),
      area: b.area * p.area,
      cd: Math.max(0.08, b.cd * p.cooldown),
      speed: b.speed * p.projSpeed,
      dur: b.dur * p.duration,
      tick: Math.max(0.15, b.tick),
    };
    if (this.fx && this.fx.refresh) this.fx.refresh();
  }

  levelUp() {
    this.level = Math.min(MAX_WEAPON_LEVEL, this.level + 1);
    this.recompute();
  }

  evolve() {
    const into = this.def.evo.into;
    this.id = into;
    this.def = WEAPONS[into];
    this.level = MAX_WEAPON_LEVEL;
    if (this.fx) {
      this.fx.dead = true;
      this.fx = null;
    }
    this.cd = 0.2;
    this.recompute();
  }

  update(dt) {
    const K = KINDS[this.def.kind];
    if (K.tick) K.tick(this, dt);
    if (!K.fire) return;
    const haste = this.g.player.buff('haste') ? 1.35 : 1;
    this.cd -= dt * haste;
    if (this.cd <= 0) {
      const r = K.fire(this);
      this.cd = typeof r === 'number' ? r : r === false ? 0.2 : this.s.cd;
    }
    if (this.queue > 0) {
      this.queueT -= dt;
      while (this.queue > 0 && this.queueT <= 0) {
        K.shoot(this, this.shot++);
        this.queue--;
        this.queueT += this.gap;
      }
    }
  }

  burst(n, gap) {
    this.queue = n;
    this.queueT = 0;
    this.gap = gap;
    this.shot = 0;
  }
}

const muzzle = (g) => ({ x: g.player.x, y: g.player.y - 1 });
const panOf = (g, x) => Math.max(-1, Math.min(1, (x - g.player.x) / 200));

export const KINDS = {
  sword: {
    fire(w) {
      // Swing at the closest foe; fall back to the facing direction.
      const p = w.g.player;
      const t = w.g.nearestEnemy(p.x, p.y, 34 * w.s.area + 26);
      w.aimAng = t ? Math.atan2(t.y - p.y, t.x - p.x) : p.aim;
      w.burst(w.s.amount, 0.11);
    },
    shoot(w, i) {
      const g = w.g, p = g.player;
      let ang = w.aimAng ?? p.aim;
      if (i % 2 === 1) ang += Math.PI;
      if (i >= 2) ang += i % 4 < 2 ? 0.55 : -0.55;
      const holy = !!w.s.wave;
      g.effects.push(new Slash(g, w, ang, 30 * w.s.area, 2.4, w.s.dmg, holy));
      if (holy) {
        spawnProjectile(g, {
          kind: 'wave', x: p.x, y: p.y, z: 7, ang, speed: 200, life: 0.6, r: 11 * w.s.area, dmg: w.s.dmg * 0.6,
          pierce: 999, kb: 1.2, w, type: 'holy',
        });
      }
      sfx('slash', { pitch: rand(0.85, 1.15) });
    },
  },

  bow: {
    fire(w) {
      const g = w.g, p = g.player;
      w.targets = g.nearestEnemies(p.x, p.y, w.s.amount, 230);
      w.volley++;
      w.burst(w.s.amount, 0.07);
    },
    shoot(w, i) {
      const g = w.g, p = g.player;
      const t = w.targets.length ? w.targets[i % w.targets.length] : null;
      const m = muzzle(g);
      const ang = t ? Math.atan2(t.y - m.y, t.x - m.x) + (i >= w.targets.length ? rand(-0.15, 0.15) : 0) : p.aim + rand(-0.25, 0.25);
      const arrow = (a) =>
        spawnProjectile(g, {
          kind: 'arrow', sprite: 'arrow', x: m.x, y: m.y, z: 7, ang: a, speed: 270 * w.s.speed, life: 1.2, r: 3,
          dmg: w.s.dmg, pierce: w.s.pierce, kb: w.s.kb, w, trail: w.s.ring ? PC.c : PC.G,
        });
      arrow(ang);
      if (w.s.ring && i === 0 && w.volley % 3 === 0) {
        for (let k = 0; k < 10; k++) arrow((k / 10) * TAU + rand(-0.05, 0.05));
      }
      sfx('arrow', { pitch: rand(0.9, 1.15), pan: Math.cos(ang) * 0.3 });
    },
  },

  fireball: {
    fire(w) {
      const g = w.g, p = g.player;
      const near = g.nearestEnemies(p.x, p.y, 8, 190);
      w.targets = [];
      for (let i = 0; i < w.s.amount; i++) w.targets.push(near.length ? pick(near) : null);
      w.burst(w.s.amount, 0.13);
    },
    shoot(w, i) {
      const g = w.g, p = g.player;
      const t = w.targets[i];
      const ang = t ? Math.atan2(t.y - p.y, t.x - p.x) : p.aim + rand(-0.4, 0.4);
      spawnProjectile(g, {
        kind: 'fireball', sprite: 'fireball', x: p.x, y: p.y, z: 8, ang, speed: 150 * w.s.speed, life: 1.6, r: 4,
        dmg: w.s.dmg, pierce: 0, kb: w.s.kb, w, explodeR: 24 * w.s.area, type: 'fire',
      });
      sfx('fireball', { pitch: rand(0.9, 1.1) });
    },
  },

  meteor: {
    fire(w) {
      const g = w.g;
      const picks = g.enemiesOnScreen(true);
      for (let i = 0; i < w.s.amount; i++) {
        const t = picks.length ? pick(picks) : null;
        const p = g.player;
        const tx = t ? t.x + rand(-8, 8) : p.x + rand(-120, 120);
        const ty = t ? t.y + rand(-8, 8) : p.y + rand(-80, 80);
        g.effects.push(new Meteor(g, w, tx, ty, 34 * w.s.area, w.s.dmg, i * 0.16, { pool: w.s.dur, tick: w.s.tick }));
      }
    },
  },

  axe: {
    fire(w) {
      w.burst(w.s.amount, 0.1);
    },
    shoot(w, i) {
      const g = w.g, p = g.player;
      const side = i % 2 === 0 ? p.face : -p.face;
      spawnProjectile(g, {
        kind: 'axe', sprite: 'axe', x: p.x, y: p.y - 6, z: 0, vx: side * (20 + i * 14) + rand(-14, 14), vy: -225 - rand(0, 45),
        grav: 430, life: 2.1, r: 6 * w.s.area, dmg: w.s.dmg, pierce: w.s.pierce, kb: w.s.kb, w, spin: side * 14, scale: w.s.area,
      });
      sfx('axe', { pitch: rand(0.9, 1.1) });
    },
  },

  spiral: {
    fire(w) {
      const g = w.g;
      const a0 = rand(TAU);
      for (let i = 0; i < w.s.amount; i++) {
        spawnProjectile(g, {
          kind: 'spiral', sprite: 'axe', x: g.player.x, y: g.player.y, z: 6, a0: a0 + (i / w.s.amount) * TAU, life: 2.2,
          r: 7 * w.s.area, dmg: w.s.dmg, pierce: 999, kb: w.s.kb, w, spin: 16, scale: w.s.area, hitCd: 0.3,
        });
      }
      sfx('axe', { pitch: 0.7 });
    },
  },

  flask: {
    fire(w) {
      w.burst(w.s.amount, 0.14);
    },
    shoot(w) {
      const g = w.g, p = g.player;
      const near = g.nearestEnemies(p.x, p.y, 10, 160);
      const t = near.length ? pick(near) : null;
      const tx = t ? t.x + rand(-6, 6) : p.x + rand(-90, 90);
      const ty = t ? t.y + rand(-6, 6) : p.y + rand(-70, 70);
      const hell = !!w.s.creep;
      spawnProjectile(g, {
        kind: 'flask', sprite: hell ? 'blueflask' : 'flask', x: p.x, y: p.y, tx, ty, life: 0.5, w, spin: 12,
        onLand: (x, y) => {
          g.effects.push(new Pool(g, w, x, y, 21 * w.s.area, w.s.dur, w.s.dmg, w.s.tick, hell ? 'hell' : 'fire', hell));
          sfx('flask', { pan: panOf(g, x) });
        },
      });
    },
  },

  blades: {
    fire(w) {
      const g = w.g;
      if (w.fx && !w.fx.dead) {
        if (w.s.dur > 100) return 0.5; // Aegis never expires
        return 0.2;
      }
      w.fx = new Orbit(g, w);
      g.effects.push(w.fx);
      sfx('blade');
      return w.s.dur + w.s.cd;
    },
  },

  aura: {
    tick(w) {
      if (!w.fx || w.fx.dead) {
        w.fx = new Aura(w.g, w);
        w.g.effects.push(w.fx);
      }
    },
  },

  lightning: {
    fire(w) {
      w.struck = new Set();
      w.burst(w.s.amount, 0.09);
    },
    shoot(w) {
      const g = w.g;
      const cands = g.enemiesOnScreen(true).filter((e) => !w.struck.has(e));
      if (!cands.length) return;
      let cur = pick(cands);
      w.struck.add(cur);
      const hit = new Set([cur]);
      let dmg = w.s.dmg;
      g.effects.push(new Bolt(g, [{ x: cur.x + rand(-14, 14), y: cur.y - 150 }, { x: cur.x, y: cur.y - 4 }], 'sky'));
      const strike = (e, d) => {
        g.hitEnemy(e, d, { w, type: 'shock', kb: w.s.kb, kx: rand(-1, 1), ky: rand(-1, 1) });
        g.particles.burst(e.x, e.y, 6, 8, [PC.c, PC.w, PC.U], 80, 0.35, 1, P.GLOW | P.FADE, { vz: 40 });
        g.light(e.x, e.y, 50, 'cyan', 0.9, 0.15);
        if (w.s.blast) explode(g, e.x, e.y, 22 * w.s.area, d * 0.5, w, 'shock');
      };
      strike(cur, dmg);
      for (let c = 0; c < w.s.chains; c++) {
        const next = g.nearestEnemy(cur.x, cur.y, 75 * w.s.area, (e) => !hit.has(e));
        if (!next) break;
        g.effects.push(new Bolt(g, [{ x: cur.x, y: cur.y - 5 }, { x: next.x, y: next.y - 5 }], 'chain'));
        dmg *= 0.92;
        strike(next, dmg);
        hit.add(next);
        cur = next;
      }
      g.shake(0.08);
      sfx('zap', { pitch: rand(0.9, 1.1), pan: panOf(g, cur.x) });
    },
  },

  daggers: {
    fire(w) {
      const p = w.g.player;
      w.baseAng = w.s.radial ? (w.baseAng || 0) + 0.38 : p.aim;
      w.burst(w.s.amount, w.s.radial ? 0.02 : 0.045);
    },
    shoot(w, i) {
      const g = w.g, p = g.player;
      const n = w.s.amount;
      const ang = w.s.radial ? w.baseAng + (i / n) * TAU : w.baseAng + rand(-0.04, 0.04);
      const off = w.s.radial ? 0 : (i - (n - 1) / 2) * 3;
      spawnProjectile(g, {
        kind: 'dagger', sprite: 'dagger', x: p.x - Math.sin(ang) * off, y: p.y - 1 + Math.cos(ang) * off, z: 7, ang,
        speed: 330 * w.s.speed, life: 0.75, r: 3, dmg: w.s.dmg, pierce: w.s.pierce, kb: w.s.kb, w,
        crit: w.s.critBonus || 0.05, trail: w.s.radial ? PC.P : null,
      });
      if (i % 2 === 0) sfx('dagger', { pitch: rand(0.9, 1.2) });
    },
  },

  frost: {
    fire(w) {
      const g = w.g, p = g.player;
      const n = w.s.amount;
      const a0 = rand(TAU);
      for (let i = 0; i < n; i++) {
        const ang = a0 + (i / n) * TAU;
        spawnProjectile(g, {
          kind: 'shard', sprite: 'shard', x: p.x, y: p.y - 1, z: 6, ang, speed: 140 * w.s.speed, life: 0.95, r: 3,
          dmg: w.s.dmg, pierce: w.s.pierce, kb: w.s.kb, w, type: 'frost', slow: w.s.slow, slowT: 1.8,
          freeze: w.s.freeze, shatter: w.s.shatter,
        });
      }
      g.effects.push(new Ring(g, p.x, p.y, 4, 30 * w.s.area, 0.3, '#2ce8f5', true));
      sfx('shard');
    },
  },
};
