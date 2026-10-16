// Weapon instances and the firing behaviour of every weapon kind.

import { WEAPONS, MAX_WEAPON_LEVEL, WEAPON_SPRITES } from '../data/weapons.js';
import { sfx } from '../engine/audio.js';
import { rand, TAU, pick } from '../engine/util.js';
import { spawnProjectile, shadowBlade } from './projectiles.js';
import { Slash, Pool, Orbit, Aura, Bolt, Meteor, Ring, Thorns, explode } from './effects.js';
import { Minion } from './minions.js';
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
    this.handAt = null; // when a blow struck by hand lands or fires, on the game's clock (strike)
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

  // Into its evolved form; false for one that has none (an evolution itself).
  evolve() {
    if (!this.def.evo) return false;
    const into = this.def.evo.into;
    this.id = into;
    this.def = WEAPONS[into];
    this.level = MAX_WEAPON_LEVEL;
    if (this.fx) {
      this.fx.dead = true;
      this.fx = null;
    }
    this.cd = 0.2;
    this.queue = 0; // the new form may not fire volleys
    this.handAt = null;
    this.recompute();
    return true;
  }

  // A foe it struck has died (Game.killEnemy).
  onKill(e) {
    const K = KINDS[this.def.kind];
    if (K.kill) K.kill(this, e);
  }

  // manual: struck by hand (strike), it waits ready instead of firing by itself.
  update(dt, manual = false) {
    const K = KINDS[this.def.kind];
    if (K.tick) K.tick(this, dt);
    if (!K.fire) return;
    const haste = this.g.player.buff('haste') ? 1.35 : 1;
    this.cd -= dt * haste;
    // A blow struck by hand waits for the sprite's blow frame, by the clock it is drawn by.
    if (this.handAt !== null) {
      if (this.g.clock < this.handAt) return;
      this.handAt = null;
      if (!K.shoot) {
        const r = K.fire(this);
        if (typeof r === 'number') this.cd = r;
      }
    }
    if (manual) this.cd = Math.max(0, this.cd);
    else if (this.cd <= 0) {
      const r = K.fire(this);
      this.cd = typeof r === 'number' ? r : r === false ? 0.2 : this.s.cd;
    }
    if (this.queue > 0 && K.shoot) {
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

  // How far a blow struck by hand looks for a foe to aim at (Game.strike): a sword's swing, or
  // as far as the weapon looks for one by itself.
  get reach() {
    return KINDS[this.def.kind].reach ?? 34 * this.s.area + 26;
  }

  // One blow struck by hand (Game.strike), its first slash landing or first shot leaving delay
  // seconds on (update): a sword swings toward ang; a bow, a fireball or daggers fire at the foe
  // struck at, if any (aim); anything else fires as it would by itself.
  strike(ang, delay, target = null) {
    this.cd = this.s.cd;
    this.handAt = this.g.clock + delay;
    const K = KINDS[this.def.kind];
    if (this.def.kind === 'sword') {
      this.aimAng = ang;
      this.burst(this.s.amount, 0.11);
    } else if (K.shoot) {
      const r = K.fire(this);
      if (typeof r === 'number') this.cd = r;
      if (K.aim) K.aim(this, target);
    }
  }
}

const muzzle = (g) => ({ x: g.player.x, y: g.player.y - 1 });
const panOf = (g, x) => Math.max(-1, Math.min(1, (x - g.player.x) / 200));
// The i-th shot of a fan, step radians apart: straight on, then one side and the other.
const fan = (i, step) => Math.ceil(i / 2) * (i % 2 ? 1 : -1) * step;

// An instant ray from (x, y) along ang, up to L px or the first wall: strikes every foe whose
// body it crosses (but those in skip), drawn as a bright beam. Returns them, nearest first.
function ray(g, w, x, y, ang, L, dmg, skip = null) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  let len = L;
  for (let s = 8; s < L; s += 8) {
    if (g.world.solid(x + dx * s, y + dy * s)) {
      len = s;
      break;
    }
  }
  const width = 5 * Math.sqrt(w.s.area), hits = [];
  for (const e of g.grid.query(x + (dx * len) / 2, y + (dy * len) / 2, len / 2 + 16)) {
    if (e.dead || e.untargetable || (skip && skip.has(e))) continue;
    const u = (e.x - x) * dx + (e.y - y) * dy;
    if (u < -e.r || u > len + e.r) continue;
    if (Math.abs((e.y - y) * dx - (e.x - x) * dy) > e.r + width) continue;
    hits.push([u, e]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  for (const [, e] of hits) g.hitEnemy(e, dmg, { w, type: 'dark', kb: w.s.kb, kx: dx, ky: dy });
  g.effects.push(new Bolt(g, [{ x, y: y - 6 }, { x: x + dx * len, y: y + dy * len - 6 }], 'ray', '#b55088'));
  return hits.map((h) => h[1]);
}

export const KINDS = {
  sword: {
    fire(w) {
      // Swing at the closest foe; with none in reach, the way the hero last moved.
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
      // No slash turns him, not even one at a foe behind him (facing.js).
      p.swing(ang);
      if (holy) {
        spawnProjectile(g, {
          kind: 'wave', x: p.x, y: p.y, z: 7, ang, speed: 200, life: 0.6, r: 11 * w.s.area, dmg: w.s.dmg * 0.6,
          pierce: 999, kb: 1.2, w, type: 'holy',
        });
      }
      sfx('slash', { pitch: rand(0.85, 1.15) });
    },
  },

  // Arrows fly straight the way she faces (the way she last walked; standing, she keeps facing
  // it), seeking nothing: a volley goes out as one tight fan.
  bow: {
    reach: 230,
    fire(w) {
      w.baseAng = w.g.player.aim;
      w.volley++;
      w.burst(w.s.amount, 0.03);
    },
    // Struck by hand in a crypt: the volley flies at the foe the player strikes at, if any.
    aim(w, t) {
      const p = w.g.player, m = muzzle(w.g);
      if (t) w.baseAng = Math.atan2(t.y - m.y, t.x - m.x);
      else w.baseAng = p.aim;
    },
    shoot(w, i) {
      const g = w.g, p = g.player;
      const m = muzzle(g);
      const ang = w.baseAng + fan(i, 0.06);
      // The ranger's release is recorded at the actual shot, including every
      // arrow in a volley. This is visual state; projectile timing is unchanged.
      // No arrow turns him, not even one at a foe behind him (facing.js).
      if (p.id === 'archer') p.bowShot = { at: g.clock, ang };
      const arrow = (a) =>
        spawnProjectile(g, {
          kind: 'arrow', sprite: 'arrow', x: m.x, y: m.y, z: p.id === 'archer' ? 19 : 7, ang: a, speed: 270 * w.s.speed, life: 1.2, r: 3,
          dmg: w.s.dmg, pierce: w.s.pierce, kb: w.s.kb, w, trail: w.evolved ? PC.c : PC.G,
        });
      arrow(ang);
      if (w.s.ring && i === 0 && w.volley % 3 === 0) {
        for (let k = 0; k < 10; k++) arrow((k / 10) * TAU + rand(-0.05, 0.05));
      }
      sfx('arrow', { pitch: rand(0.9, 1.15), pan: Math.cos(ang) * 0.3 });
    },
  },

  fireball: {
    reach: 190,
    fire(w) {
      const g = w.g, p = g.player;
      const near = g.nearestEnemies(p.x, p.y, 8, 190);
      w.targets = [];
      for (let i = 0; i < w.s.amount; i++) w.targets.push(near.length ? pick(near) : null);
      w.burst(w.s.amount, 0.13);
    },
    aim(w, t) {
      w.targets = w.targets.map(() => t);
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
    reach: 190,
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
      sfx('zap', { pitch: rand(0.9, 1.1), pan: panOf(g, cur.x) });
    },
  },

  // Shadow Blade: spinning blades thrown at the nearest foe (with none near, the way he faces),
  // each cutting through all in its path; Shadowstrike's fly all round.
  daggers: {
    reach: 260,
    fire(w) {
      const g = w.g, p = g.player;
      if (w.s.radial) w.baseAng = (w.baseAng || 0) + 0.38;
      else {
        const t = g.nearestEnemy(p.x, p.y, 260, (e) => !e.untargetable);
        w.baseAng = t ? Math.atan2(t.y - p.y, t.x - p.x) : p.aim;
      }
      w.burst(w.s.amount, w.s.radial ? 0.02 : 0.045);
    },
    // A fan of blades struck by hand flies at the foe struck at; a ring flies all round anyway.
    aim(w, t) {
      const p = w.g.player;
      if (t && !w.s.radial) w.baseAng = Math.atan2(t.y - p.y, t.x - p.x);
    },
    shoot(w, i) {
      const g = w.g, p = g.player;
      const n = w.s.amount;
      const ang = w.s.radial ? w.baseAng + (i / n) * TAU : w.baseAng + fan(i, 0.05);
      const off = w.s.radial ? 0 : (i - (n - 1) / 2) * 3;
      shadowBlade(g, w, p.x - Math.sin(ang) * off, p.y - 1 + Math.cos(ang) * off, ang, w.s.dmg, 0.75);
      if (i % 2 === 0) sfx('dagger', { pitch: rand(0.9, 1.2) });
    },
  },

  // Caltrops: scatters of spikes thrown behind the hero, so whatever follows him bleeds and
  // slows; the hero's crits count, and Razor Field's cut deeper.
  caltrops: {
    fire(w) {
      w.burst(w.s.amount, 0.12);
    },
    shoot(w, i) {
      const g = w.g, p = g.player;
      const ang = p.aim + Math.PI + fan(i, 0.45) + rand(-0.15, 0.15);
      const d = rand(34, 52);
      spawnProjectile(g, {
        kind: 'flask', sprite: WEAPON_SPRITES.caltrop, x: p.x, y: p.y, tx: p.x + Math.cos(ang) * d, ty: p.y + Math.sin(ang) * d * 0.85,
        life: 0.35, w, spin: 18,
        onLand: (x, y) => {
          g.effects.push(new Pool(g, w, x, y, 18 * w.s.area, w.s.dur, w.s.dmg, w.s.tick, 'spikes', false, { kb: 0, slow: w.s.slow, slowT: 0.6, critDmg: w.s.critDmg || 0 }));
          sfx('dagger', { pitch: 0.7, pan: panOf(g, x) });
        },
      });
    },
  },

  summon: {
    reach: 190,
    fire(w) {
      const g = w.g, p = g.player;
      let mine = 0;
      for (const m of g.minions) if (m.w === w) mine++;
      const n = Math.min(w.s.amount, w.s.amount * 3 - mine);
      if (n <= 0) return 0.4;
      for (let i = 0; i < n; i++) {
        const spot = g.world.freeSpot(p.x + rand(-30, 30), p.y + rand(-22, 22));
        if (!spot) continue;
        g.minions.push(new Minion(g, spot.x, spot.y, { w, dmg: w.s.dmg, dur: w.s.dur * p.summonDur, speed: w.s.speed, knight: !!w.s.knights, burst: !!w.s.burst }));
      }
      g.effects.push(new Ring(g, p.x, p.y, 4, 34, 0.45, '#9ee562', true));
      sfx('bones', { pitch: 0.7 });
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

  glaive: {
    fire(w) {
      const g = w.g, p = g.player;
      w.targets = g.nearestEnemies(p.x, p.y, w.s.amount, 120 * w.s.speed);
      w.baseAng = rand(TAU);
      // Lodestar throws the whole wheel at once.
      w.burst(w.s.amount, w.s.ring ? 0 : 0.12);
    },
    shoot(w, i) {
      const g = w.g, p = g.player;
      const n = w.s.amount;
      let ang;
      if (w.s.ring) ang = w.baseAng + (i / n) * TAU;
      else {
        const t = w.targets.length ? w.targets[i % w.targets.length] : null;
        ang = t ? Math.atan2(t.y - p.y, t.x - p.x) + (i >= w.targets.length ? rand(-0.5, 0.5) : 0) : p.aim + rand(-0.6, 0.6);
      }
      spawnProjectile(g, {
        kind: 'glaive', sprite: w.s.pull ? 'starglaive' : 'glaive', x: p.x, y: p.y - 1, z: 6, ang, speed: 250 * w.s.speed,
        out: 0.65, life: 3, r: 6 * w.s.area, dmg: w.s.dmg, pierce: 999, kb: w.s.kb, w, spin: 18, scale: w.s.area,
        hitCd: 0.3, pull: w.s.pull, glow: w.s.pull ? ['#fee761', 24, 'holy', 34] : null, trail: w.s.pull ? PC.Y : null,
      });
      if (!w.s.ring || i === 0) sfx('axe', { pitch: rand(1.3, 1.5) });
    },
  },

  thorns: {
    fire(w) {
      const g = w.g, p = g.player;
      const n = w.s.amount;
      if (w.s.ring) {
        const a0 = rand(TAU);
        for (let i = 0; i < n; i++) g.effects.push(new Thorns(g, w, p.x, p.y, a0 + (i / n) * TAU));
      } else {
        const near = g.nearestEnemies(p.x, p.y, n, 160);
        for (let i = 0; i < n; i++) {
          const t = near[i];
          const ang = t ? Math.atan2(t.y - p.y, t.x - p.x) : p.aim + (i - (n - 1) / 2) * 0.5;
          g.effects.push(new Thorns(g, w, p.x, p.y, ang));
        }
      }
      sfx('wood', { pitch: 0.6 });
    },
  },

  // Miasma: a poison cloud that follows the hero (effects.js Aura, its poison look), and a trail
  // of pools seeping from his steps, one every few paces walked, that sink into the ground as
  // they fade. Every pool of one weapon shares its hit channel, so where they overlap a foe is
  // poisoned once. Pestilence: foes dying of it burst into a pool of their own.
  miasma: {
    tick(w) {
      const g = w.g, p = g.player;
      if (!w.fx || w.fx.dead) {
        w.fx = new Aura(g, w, 'poison');
        g.effects.push(w.fx);
      }
      if (w.lastX === undefined) {
        w.lastX = p.x;
        w.lastY = p.y;
        w.walked = 0;
      }
      const d = Math.hypot(p.x - w.lastX, p.y - w.lastY);
      w.lastX = p.x;
      w.lastY = p.y;
      if (d > 40) return; // carried off (a crypt's door, the stairs): no trail across the gap
      w.walked += d;
      const every = 9 * w.s.area;
      if (w.walked < every) return;
      w.walked -= every;
      g.effects.push(new Pool(g, w, p.x + rand(-2, 2), p.y + rand(-2, 2), 12 * w.s.area, w.s.dur, w.s.dmg * 0.75, w.s.tick * 0.8, 'poison', false, { decay: true, sparse: true, kb: 0, dot: w.s.dot }));
    },
    kill(w, e) {
      if (!w.s.plague || e.boss) return;
      const g = w.g;
      g.effects.push(new Pool(g, w, e.x, e.y, 14 * w.s.area, 2, w.s.dmg, w.s.tick, 'poison', false, { decay: true, sparse: true, kb: 0, dot: w.s.dot }));
    },
  },

  // Arcane Ray: an instant ray from the hero at the nearest foe (another at the next nearest
  // for each ray more), searing everything along its line. Prismatic Ray splits on the first
  // foe it strikes, a shorter ray leaping on to that foe's nearest neighbour.
  arcane: {
    reach: 190,
    fire(w) {
      const g = w.g, p = g.player;
      const L = 190 * w.s.area;
      const foes = g.nearestEnemies(p.x, p.y, w.s.amount, L);
      if (!foes.length) return false;
      for (const t of foes) {
        const ang = Math.atan2(t.y - p.y, t.x - p.x);
        const hit = ray(g, w, p.x, p.y, ang, L, w.s.dmg);
        if (w.s.split && hit.length) {
          const first = hit[0], skip = new Set(hit);
          const next = g.nearestEnemy(first.x, first.y, 90 * w.s.area, (e) => !skip.has(e) && !e.untargetable);
          if (next) ray(g, w, first.x, first.y, Math.atan2(next.y - first.y, next.x - first.x), 90 * w.s.area, w.s.dmg * 0.7, skip);
        }
      }
      g.light(p.x, p.y, 60, 'purple', 0.8);
      sfx('zap', { pitch: rand(1.5, 1.7) });
    },
  },

  wisp: {
    fire(w) {
      w.baseAng = rand(TAU);
      w.burst(w.s.amount, 0.08);
    },
    shoot(w, i) {
      const g = w.g, p = g.player;
      const ang = w.baseAng + (i / w.s.amount) * TAU;
      const fae = !!w.s.fae;
      spawnProjectile(g, {
        kind: 'wisp', sprite: fae ? 'faelight' : 'wisp', x: p.x + Math.cos(ang) * 6, y: p.y - 2 + Math.sin(ang) * 6, z: 9, ang, a0: i * 1.7,
        speed: 120 * w.s.speed, life: 3.2, r: fae ? 5 : 4, dmg: w.s.dmg, pierce: w.s.pierce, kb: w.s.kb, w,
        crit: w.s.critBonus || 0, type: fae ? 'holy' : 'normal', trail: fae ? PC.Y : PC.l,
        glow: fae ? ['#fee761', 22, 'holy', 34] : ['#9ee562', 18, 'green', 28],
      });
      if (i % 2 === 0) sfx('blade', { pitch: fae ? 1.4 : 1.1 });
    },
  },
};
