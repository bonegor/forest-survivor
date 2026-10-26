// Weapon instances and the firing behaviour of every weapon kind.

import { WEAPONS, MAX_WEAPON_LEVEL, WEAPON_SPRITES, statsAt } from '../data/weapons.js';
import { sfx } from '../engine/audio.js';
import { rand, TAU, pick, angleDiff } from '../engine/util.js';
import { spawnProjectile, shadowBlade } from './projectiles.js';
import { Slash, Pool, Orbit, Aura, Bolt, Meteor, Ring, Thorns, explode, Pillar, Burrow, Chop, FRENZY, PURGE, boltTargets, stunFoe, silverBolt, LeechChain, LEECH, plantMushroom } from './effects.js';
import { Minion } from './minions.js';
import { KINDS_LIGHT } from './weapons-light.js';
import { fxBurst } from './fxart.js';
import { gust, gustFoes, GALE_R, Hook, Hollow, thickest, toll, tollFoes, BELL_R } from './crowdfx.js';
import { PC, P } from './particles.js';
import { reachesBody } from './hitbox.js';

// What a weapon's stats are where its data says nothing (data/weapons.js statsAt).
const STAT_DEFAULTS = { dmg: 0, cd: 1, amount: 1, area: 1, speed: 1, dur: 1, pierce: 0, kb: 1, tick: 0.5, chains: 0, slow: 0, freeze: 0 };
// How much sooner every weapon is ready again under a Shrine of Haste (Weapon.update; the ranger's
// draw keeps time with it, ranger-animation.js). He walks faster too (Player.moveSpeed).
export const HASTE = 1.35;

// The way from p (anything with an x and a y) to the foe t; with no foe, fallback: by default the
// way the hero faces (p.aim).
export const aimAt = (p, t, fallback = p.aim) => (t ? Math.atan2(t.y - p.y, t.x - p.x) : fallback);

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
    this.handTarget = null; // and the foe it is struck at, if any
    this.hand = false; // true while a blow struck by hand fires (KINDS' fire: it fires, foe or none)
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
    const b = statsAt(this.def, this.level, STAT_DEFAULTS);
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
    this.handTarget = null; // else its blows by itself would go on seeking a foe struck at long ago
    this.recompute();
    return true;
  }

  // A foe it struck has died (Game.killEnemy).
  onKill(e) {
    const K = KINDS[this.def.kind];
    if (K.kill) K.kill(this, e);
  }

  // Any foe has died, struck by whom it may (Game.killEnemy): the weapons that seed or spread on a
  // death (spores, hex) see to it.
  onFoeDeath(e) {
    const K = KINDS[this.def.kind];
    if (K.death) K.death(this, e);
  }

  // manual: struck by hand (strike), it waits ready instead of firing by itself.
  update(dt, manual = false) {
    const K = KINDS[this.def.kind];
    if (K.tick) K.tick(this, dt);
    if (!K.fire) return;
    this.cd -= dt * this.haste;
    // A blow struck by hand waits for the sprite's blow frame, by the clock it is drawn by, with the
    // same hair of slack the frame count has (Game.drawPlayer's 1e-6), so a clock a rounding short
    // never shows the blow a frame before it lands.
    if (this.handAt !== null) {
      if (this.g.clock < this.handAt - 1e-6) return;
      this.handAt = null;
      if (!K.shoot) {
        this.hand = true;
        const r = K.fire(this);
        this.hand = false;
        if (typeof r === 'number') this.cd = r;
      }
      this.handTarget = null;
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

  // How much faster than its cooldown it is ready again: a Shrine of Haste's, the Berserker's
  // Bloodrage, his Red Frenzy (every weapon), the Witch Hunter's Purge (her crossbow).
  get haste() {
    const p = this.g.player, u = p.ult && p.ult.type;
    let k = (p.buff('haste') ? HASTE : 1) * p.rageHaste;
    if (u === 'frenzy') k *= FRENZY.haste;
    else if (u === 'purge' && this.def.kind === 'crossbow') k *= PURGE.haste;
    return k;
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
  // seconds on (update): a sword swings out to the side he faces, turned to the foe (sideways); a
  // bow, a fireball or daggers fire at the foe struck at, if any (aim); anything else fires as it
  // would by itself.
  strike(ang, delay, target = null) {
    this.cd = this.s.cd;
    this.handAt = this.g.clock + delay;
    this.handTarget = target;
    const K = KINDS[this.def.kind];
    if (this.def.kind === 'sword') {
      this.aimAng = sideways(this.g.player);
      this.burst(this.s.amount, 0.11);
    } else if (K.shoot) {
      this.hand = true;
      const r = K.fire(this);
      this.hand = false;
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
// feet or body as drawn (hitbox.js) it crosses (but those in skip), drawn as a bright beam RAY_UP
// px up. Returns them, nearest first.
const RAY_UP = 6;
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
  for (const e of g.grid.foes(x + (dx * len) / 2, y + (dy * len) / 2, len / 2 + width + RAY_UP)) {
    if (e.dead || (skip && skip.has(e))) continue;
    const u = (e.x - x) * dx + (e.y - y) * dy;
    const feet = u >= -e.hr && u <= len + e.hr && Math.abs((e.y - y) * dx - (e.x - x) * dy) <= e.hr + width;
    if (!feet && !reachesBody(e, x, y - RAY_UP, x + dx * len, y + dy * len - RAY_UP, width)) continue;
    hits.push([u, e]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  for (const [, e] of hits) g.hitEnemy(e, dmg, { w, type: 'dark', kb: w.s.kb, kx: dx, ky: dy });
  g.effects.push(new Bolt(g, [{ x, y: y - RAY_UP }, { x: x + dx * len, y: y + dy * len - RAY_UP }], 'ray', '#b55088'));
  return hits.map((h) => h[1]);
}

// A curse of weapon w on foe e (Enemy.curse), marked with a ring.
function hexCurse(g, w, e) {
  if (e.curse(w.s.dur, w.s.share, w)) g.effects.push(new Ring(g, e.x, e.y, 3, 14, 0.4, '#b55088', false, 2));
}

// ------------------------------------------ the four of 20 October 2026 --

// Who Smite strikes first: up to n foes within R of (x, y), the mightiest first (a boss, a crypt's
// lord, a champion, then the one with the most health); `first`, a foe struck at by hand, ahead.
const MIGHT = (e) => (e.boss ? 3 : e.lord ? 2 : e.elite ? 1 : 0);
export function mightiest(g, x, y, R, n, first = null) {
  const all = g.nearestEnemies(x, y, Infinity, R);
  all.sort((a, b) => MIGHT(b) - MIGHT(a) || b.hp - a.hp);
  const i = first && !first.dead ? all.indexOf(first) : -1;
  if (i > 0) all.unshift(...all.splice(i, 1));
  return all.slice(0, n);
}

// The Twin Axes' leap: at a foe within `reach` px (from his feet to its edge) ahead of him: on the
// way he walks, within `ahead` radians of it (straight on to a little behind square), or standing,
// on the side he faces, so he never turns for it and never jumps back against the way the player
// steers. He lands just short of it, `dur` s on, never through a wall, a crypt's wall, lava or a
// tree's trunk (World.open, tested every `step` px of the way), and only if the hop is longer
// than `near` px: else he chops where he stands. In the air nothing touches him (Player.untouchable).
export const LEAP = { reach: 64, ahead: 1.75, dur: 0.16, step: 3, near: 10, close: 10 };
// The chop's reach at area 1 (with no leap, he chops for a foe within it and LEAP.close more),
// and what each kill of Bloodstorm's heals (of his health).
export const CHOP_R = 30;
export const KILL_HEAL_BLOOD = 0.005;

export function leapTarget(g, p, w) {
  const ahead = (e) => {
    const dx = e.x - p.x, dy = e.y - p.y;
    return p.moving ? Math.abs(angleDiff(p.aim, Math.atan2(dy, dx))) <= LEAP.ahead : dx * p.face >= 0;
  };
  const t = w.handTarget;
  if (t && !t.dead && Math.hypot(t.x - p.x, t.y - p.y) <= LEAP.reach + t.r + p.r && ahead(t)) return t;
  // Looked for out to where the widest body's edge (a champion boss's, under 24 px) is in reach.
  return g.nearestEnemy(p.x, p.y, LEAP.reach + p.r + 24, (e) => ahead(e) && Math.hypot(e.x - p.x, e.y - p.y) - e.r - p.r <= LEAP.reach);
}

// Where a leap at foe t lands: just short of it, as far along the way as is open; null if that
// is no farther than LEAP.near (no hop worth taking).
export function leapSpot(g, p, t) {
  const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy);
  const want = Math.min(LEAP.reach, d - t.r - p.r - 1);
  if (want <= LEAP.near) return null;
  const ux = dx / d, uy = dy / d, open = g.world.open;
  let got = 0;
  for (let s = LEAP.step; s <= want; s += LEAP.step) {
    if (open && !g.world.open(p.x + ux * s, p.y + uy * s, p.r)) break;
    got = s;
  }
  if (got < want && got + LEAP.step > want && (!open || g.world.open(p.x + ux * want, p.y + uy * want, p.r))) got = want;
  return got > LEAP.near ? { x: p.x + ux * got, y: p.y + uy * got } : null;
}

// The chops of a landing (or of a blow where he stands): `amount` of them, CHOP_GAP s apart.
const CHOP_GAP = 0.12;
function chops(w) {
  const g = w.g;
  const one = () => g.effects.push(new Chop(g, w, CHOP_R * w.s.area, w.s.dmg));
  one();
  for (let i = 1; i < w.s.amount; i++) {
    g.effects.push({ t: -i * CHOP_GAP, update(dt) {
      this.t += dt;
      if (this.t < 0) return true;
      if (!g.player.dead) one();
      return false;
    } });
  }
}

// A sword's swing: straight out to the side the hero's sprite faces (face: -1 left, 1 right), its
// cut 45° across in all (the owner's, 23 October 2026: "make it like only 45 degrees in total";
// 2.4 radians, some 137°, before).
export const sideways = (p) => (p.face < 0 ? Math.PI : 0);
export const SWORD_ARC = Math.PI / 4;

export const KINDS = {
  ...KINDS_LIGHT, // the Lantern, Runestone, Scythe and Starfall (weapons-light.js)
  sword: {
    fire(w) {
      // Swing straight out to the side his sprite faces, seeking no foe: one on the other side
      // takes his turning round (the owner's, 21 October 2026). The owner's (23 October 2026):
      // "The sword should not point to where the hero is moving, but only towards right or left,
      // depending on which way the sprite is painted". A blow struck by hand in a crypt too, once
      // he has turned to the foe it is struck at (Weapon.strike).
      w.aimAng = sideways(w.g.player);
      w.burst(w.s.amount, 0.11);
    },
    shoot(w, i) {
      const g = w.g, p = g.player;
      let ang = w.aimAng ?? sideways(p);
      if (i % 2 === 1) ang += Math.PI;
      if (i >= 2) ang += i % 4 < 2 ? 0.55 : -0.55;
      const holy = !!w.s.wave;
      g.effects.push(new Slash(g, w, ang, 30 * w.s.area, SWORD_ARC, w.s.dmg, holy));
      // No slash turns him, not even one at a foe behind him (facing.js).
      p.swing(ang);
      if (holy) {
        spawnProjectile(g, {
          kind: 'wave', x: p.x, y: p.y, z: 7, ang, speed: 200, life: 0.6, r: 11 * w.s.area, dmg: w.s.dmg * 0.6,
          pierce: 999, kb: 1.2, w, type: 'holy',
        });
      }
      sfx('slash', { pitch: rand(1.05, 1.3) });
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
      w.baseAng = aimAt(muzzle(w.g), t, w.g.player.aim);
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
      const near = g.nearestEnemies(p.x, p.y, 8, w.reach);
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
      const ang = t ? aimAt(p, t) : p.aim + rand(-0.4, 0.4);
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
      const picks = g.enemiesOnScreen();
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
          fxBurst(g, hell ? 'fx_firebomb_hell' : 'fx_firebomb', x, y, { fps: 18, dy: 6 });
          sfx('flask', { pan: panOf(g, x) });
        },
      });
    },
  },

  blades: {
    fire(w) {
      const g = w.g;
      // Aegis's blades never go out (eternal): it only looks in now and then for an orbit put out
      // (by a crypt's door: Game.enterCrypt).
      if (w.fx && !w.fx.dead) return w.s.eternal ? 0.5 : 0.2;
      w.fx = new Orbit(g, w);
      g.effects.push(w.fx);
      sfx('blade');
      return w.s.eternal ? 0.5 : w.s.dur + w.s.cd;
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
    // Lightning Strike: a bolt falls from the sky on the toughest of the foes nearest the hero (a
    // different one each time in a volley), a splash round the impact and a brief stun.
    shoot(w) {
      const g = w.g, p = g.player;
      const near = g.enemiesOnScreen().filter((e) => !w.struck.has(e) && !e.prop)
        .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 6);
      if (!near.length) return;
      const e = near.reduce((a, b) => (b.hp > a.hp ? b : a));
      w.struck.add(e);
      g.effects.push(new Bolt(g, [{ x: e.x + rand(-6, 6), y: e.y - 150 }, { x: e.x, y: e.y - 4 }], 'sky'));
      g.hitEnemy(e, w.s.dmg, { w, type: 'shock', kb: w.s.kb, kx: rand(-1, 1), ky: rand(-1, 1) });
      stunFoe(e, w.s.stun);
      explode(g, e.x, e.y, 26 * w.s.area, w.s.dmg * 0.5, w, 'shock', { kb: w.s.kb });
      for (const f of g.grid.foes(e.x, e.y, 26 * w.s.area)) {
        if (f !== e && Math.hypot(f.x - e.x, f.y - e.y) <= 26 * w.s.area + f.hr) stunFoe(f, w.s.stun * 0.6);
      }
      g.particles.burst(e.x, e.y, 8, 10, [PC.c, PC.w, PC.U], 90, 0.35, 1, P.GLOW | P.FADE, { vz: 50 });
      g.light(e.x, e.y, 90, 'white', 0.9);
      sfx('zap', { pitch: rand(0.75, 0.95), pan: panOf(g, e.x) });
    },
  },

  // Chain Lightning: sparks leap from the hero to the nearest foe and arc on from foe to foe;
  // Stormlash's fork in two at the first.
  chain: {
    reach: 190,
    fire(w) {
      w.struck = new Set();
      w.burst(w.s.amount, 0.12);
    },
    shoot(w) {
      const g = w.g, p = g.player;
      const strike = (e, d) => {
        g.hitEnemy(e, d, { w, type: 'shock', kb: w.s.kb, kx: rand(-1, 1), ky: rand(-1, 1) });
        g.particles.burst(e.x, e.y, 5, 8, [PC.c, PC.w], 70, 0.3, 1, P.GLOW | P.FADE, { vz: 30 });
        g.light(e.x, e.y, 45, 'cyan', 0.8);
      };
      let last = null;
      for (let f = 0; f <= (w.s.fork ? 1 : 0); f++) {
        let cur = g.nearestEnemy(p.x, p.y, w.reach * w.s.area, (e) => !w.struck.has(e) && !e.prop);
        if (!cur) break;
        w.struck.add(cur);
        g.effects.push(new Bolt(g, [{ x: p.x, y: p.y - 8 }, { x: cur.x, y: cur.y - 5 }], 'chain'));
        let dmg = w.s.dmg;
        strike(cur, dmg);
        for (let c = 0; c < w.s.chains; c++) {
          const next = g.nearestEnemy(cur.x, cur.y, 75 * w.s.area, (e) => !w.struck.has(e) && !e.prop);
          if (!next) break;
          w.struck.add(next);
          g.effects.push(new Bolt(g, [{ x: cur.x, y: cur.y - 5 }, { x: next.x, y: next.y - 5 }], 'chain'));
          dmg *= 0.92;
          strike(next, dmg);
          cur = next;
        }
        last = cur;
      }
      if (last) sfx('zap', { pitch: rand(1.05, 1.3), pan: panOf(g, last.x) });
    },
  },

  // Shadow Blade: spinning blades thrown at the nearest foe (with none near, the way he faces),
  // each cutting through all in its path; Shadowstrike's fly all round.
  daggers: {
    reach: 260,
    fire(w) {
      const g = w.g, p = g.player;
      if (w.s.radial) w.baseAng = (w.baseAng || 0) + 0.38;
      else w.baseAng = aimAt(p, g.nearestEnemy(p.x, p.y, w.reach));
      w.burst(w.s.amount, w.s.radial ? 0.02 : 0.045);
    },
    // A fan of blades struck by hand flies at the foe struck at; a ring flies all round anyway.
    aim(w, t) {
      const p = w.g.player;
      if (t && !w.s.radial) w.baseAng = aimAt(p, t);
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

  // Leech Chains: chains latch onto the nearest foes (not one already held) and drain them; they
  // hang on in w.chains until they end (LeechChain).
  leech: {
    fire(w) {
      const g = w.g, p = g.player;
      w.chains = (w.chains || []).filter((c) => c.t < c.dur && !c.e.dead);
      const want = w.s.amount - w.chains.length;
      if (want <= 0) return 0.4;
      const held = new Set(w.chains.map((c) => c.e));
      const reach = LEECH.reach * w.s.area;
      const foes = g.nearestEnemies(p.x, p.y, want + held.size, reach).filter((e) => !held.has(e)).slice(0, want);
      if (!foes.length) return 0.4;
      for (const e of foes) {
        const c = new LeechChain(g, w, e);
        w.chains.push(c);
        g.effects.push(c);
      }
      sfx('dagger', { pitch: 0.6 });
    },
  },

  // Puffcap Spores: a few mushrooms about the hero on the cooldown (Fairy Ring's in a ring), and
  // one where a foe dies now and then, whoever struck it; Fairy Ring plants one where a confused
  // foe dies, always.
  spores: {
    fire(w) {
      const g = w.g, p = g.player, n = w.s.amount;
      const a0 = rand(TAU);
      for (let i = 0; i < n; i++) {
        const a = w.s.ring ? a0 + (i / n) * TAU : rand(TAU);
        const d = w.s.ring ? 48 : rand(26, 80);
        plantMushroom(g, w, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.85, true);
      }
      g.effects.push(new Ring(g, p.x, p.y, 4, 30, 0.35, '#9ee562', true));
    },
    death(w, e) {
      const g = w.g;
      if (e.prop || Math.hypot(e.x - g.player.x, e.y - g.player.y) > 260) return;
      if ((w.s.chain && e.confuseT > 0) || Math.random() < w.s.chance * g.player.luck) plantMushroom(g, w, e.x, e.y);
    },
  },

  // Hex Hourglass: curses the toughest foes near him (Enemy.curse); Doom's curse leaps to others
  // when the cursed foe falls.
  hex: {
    reach: 150,
    fire(w) {
      const g = w.g, p = g.player;
      const foes = mightiest(g, p.x, p.y, 150 * w.s.area, 99).filter((e) => e.curseT <= 0).slice(0, w.s.amount);
      if (!foes.length) return 0.4;
      for (const e of foes) hexCurse(g, w, e);
      sfx('zap', { pitch: 0.55, pan: panOf(g, foes[0].x) });
    },
    death(w, e) {
      if (!w.s.spread || e.curseT <= 0 || e.curseW !== w) return;
      const g = w.g;
      let n = w.s.spread;
      for (const o of g.nearestEnemies(e.x, e.y, 8, 90)) {
        if (n <= 0) break;
        if (o === e || o.curseT > 0) continue;
        hexCurse(g, w, o);
        n--;
      }
    },
  },

  // Gale Horn and Tempest: a blast blows the horde in the cone ahead of him (all round, Tempest's)
  // back, never a boss, a lord or a champion (Enemy.blow). With no foe in the gust it waits.
  gale: {
    reach: GALE_R,
    fire(w) {
      const foes = gustFoes(w.g, w);
      if (!foes.length && !w.hand) return false;
      gust(w.g, w, foes);
    },
  },

  // The Grappling Hook and Kraken Chains: a hook at the farthest foe in reach (the farthest n for
  // n hooks), the chain cutting every foe on its line out and back, all of them bleeding.
  hook: {
    reach: 190,
    fire(w) {
      const g = w.g, p = g.player;
      const foes = g.nearestEnemies(p.x, p.y, 999, w.reach * w.s.area);
      if (!foes.length) return false;
      foes.slice(-w.s.amount).reverse().forEach((t, i) => g.effects.push(new Hook(g, w, t, i)));
      sfx('axe', { pitch: 0.5 });
    },
  },

  // Grave Hollow and Abyss: a pit opens in the thickest knot of foes in reach.
  hollow: {
    reach: 200,
    fire(w) {
      const g = w.g, p = g.player;
      const t = thickest(g, p.x, p.y, w.reach);
      if (!t) return false;
      g.effects.push(new Hollow(g, w, t.x, t.y));
    },
  },

  // Banshee Bell and Death Knell: a toll round him sends the horde fleeing (Enemy.scare).
  bell: {
    reach: BELL_R,
    fire(w) {
      const foes = tollFoes(w.g, w);
      if (!foes.length && !w.hand) return false;
      toll(w.g, w, foes);
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
        ang = t ? aimAt(p, t) + (i >= w.targets.length ? rand(-0.5, 0.5) : 0) : p.aim + rand(-0.6, 0.6);
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
        for (let i = 0; i < n; i++) g.effects.push(new Thorns(g, w, p.x, p.y, aimAt(p, near[i], p.aim + (i - (n - 1) / 2) * 0.5)));
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
      const L = w.reach * w.s.area;
      const foes = g.nearestEnemies(p.x, p.y, w.s.amount, L);
      if (!foes.length) return false;
      for (const t of foes) {
        const hit = ray(g, w, p.x, p.y, aimAt(p, t), L, w.s.dmg);
        if (w.s.split && hit.length) {
          const first = hit[0], skip = new Set(hit);
          const next = g.nearestEnemy(first.x, first.y, 90 * w.s.area, (e) => !skip.has(e));
          if (next) ray(g, w, first.x, first.y, aimAt(first, next), 90 * w.s.area, w.s.dmg * 0.7, skip);
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
  // Smite and Judgement (the Paladin's): a pillar on each of the mightiest foes in reach, one
  // after another (a foe struck at by hand first). None in reach: it waits.
  smite: {
    reach: 170,
    fire(w) {
      const g = w.g, p = g.player;
      const foes = mightiest(g, p.x, p.y, w.reach, w.s.amount, w.handTarget);
      if (!foes.length) return false;
      foes.forEach((e, i) => g.effects.push(new Pillar(g, w, e, i * 0.08)));
    },
  },

  // Snaring Roots and World Root (the Druid's): a root tunnels to each of the nearest foes (a
  // foe struck at by hand first) and grips all round it where it surfaces. None in reach: it waits.
  roots: {
    reach: 170,
    fire(w) {
      const g = w.g, p = g.player;
      const foes = g.nearestEnemies(p.x, p.y, w.s.amount, w.reach);
      const t = w.handTarget;
      if (t && !t.dead && !foes.includes(t)) foes.unshift(t);
      if (!foes.length) return false;
      foes.slice(0, w.s.amount).forEach((e, i) => g.effects.push(new Burrow(g, w, p.x, p.y + 1, e, i * 0.06)));
      sfx('wood', { pitch: rand(0.3, 0.4) });
    },
  },

  // The Twin Axes and Bloodstorm (the Berserker's): he leaps on a foe ahead and chops all round
  // where he lands (LEAP, Player.leapTo); with no foe ahead in reach but one close, he chops
  // where he stands; with none, it waits. Bloodstorm's kills heal him a little (Player.leech).
  leap: {
    reach: LEAP.reach,
    fire(w) {
      const g = w.g, p = g.player;
      if (p.leap) return 0.05;
      const R = CHOP_R * w.s.area;
      const t = leapTarget(g, p, w);
      if (t) {
        const to = leapSpot(g, p, t);
        if (to) {
          p.leapTo(to.x, to.y, () => chops(w), LEAP.dur);
          return;
        }
      }
      if (!w.hand && !g.nearestEnemy(p.x, p.y, R + LEAP.close)) return false;
      chops(w);
    },
    kill(w) {
      const p = w.g.player;
      if (w.s.heal) p.leech(p.maxHp * KILL_HEAL_BLOOD);
    },
  },

  // The Silver Crossbow and the Purifier (the Witch Hunter's): heavy bolts aimed at the nearest of
  // the wicked in reach (a boss, a lord, a champion, a cultist), else at the nearest foe, a bolt
  // more at the next for each more it looses; through `pierce` foes, `bane` more on the wicked.
  // The Purifier's burst in silver light on every foe they strike. Under Purge (her ultimate)
  // each bolt flies three at once, bursting too, and those are the ultimate's blows. No foe in
  // reach: it waits, but one struck by hand looses anyway, the way she faces.
  crossbow: {
    reach: 230,
    fire(w) {
      const g = w.g, p = g.player;
      w.targets = boltTargets(g, p.x, p.y, w.reach, w.s.amount);
      if (!w.targets.length && !w.hand) return false;
      w.baseAng = aimAt(p, w.targets[0], p.aim);
      w.burst(w.s.amount, w.s.nova ? 0.08 : 0.12);
    },
    aim(w, t) {
      if (t) {
        w.targets = [t];
        w.baseAng = aimAt(w.g.player, t);
      }
    },
    shoot(w, i) {
      const g = w.g, p = g.player;
      const t = w.targets.length ? w.targets[i % w.targets.length] : null;
      const ang = t && !t.dead ? aimAt(p, t) : w.baseAng;
      const purge = !!(p.ult && p.ult.type === 'purge');
      const o = { dmg: w.s.dmg, pierce: w.s.pierce, kb: w.s.kb, speed: w.s.speed, bane: w.s.bane, nova: !!w.s.nova || purge, ult: purge };
      silverBolt(g, w, p.x, p.y, ang, o);
      if (purge) {
        silverBolt(g, w, p.x, p.y, ang - PURGE.spread, o);
        silverBolt(g, w, p.x, p.y, ang + PURGE.spread, o);
      }
      sfx('arrow', { pitch: rand(0.6, 0.7), pan: Math.cos(ang) * 0.3 });
    },
  },
};
