// The hero: movement, stats, health, experience, fury and ultimates.

import { HEROES } from '../data/heroes.js';
import { PASSIVES } from '../data/passives.js';
import { gearBonuses } from '../shared/items.js';
import { input } from '../engine/input.js';
import { sfx } from '../engine/audio.js';
import { clamp, damp, rand, lerp } from '../engine/util.js';
import { PC, P } from './particles.js';
import { faceAlong, faceAttack } from './facing.js';
import { foeName } from './names.js';

export const BASE_SPEED = 70;
export const BASE_MAGNET = 42;
// Armor, the user's: "10% + min 1 damage (but just denote that as armor +1) ... it can only stop
// 95% damage". Each point takes ARMOR_CUT off what is left of a blow, or 1 if that is more, and
// all of it together never more than ARMOR_MOST of the blow: every point adds a little less.
export const ARMOR_CUT = 0.1;
export const ARMOR_MOST = 0.95;

// What the levels themselves give, the user's: "level up make hero slightly stronger", then "do
// not cap, let it go wild. Also, let it be exponential for health", and on 16 October 2026
// "double the effect of levelling" (it was +0.5%, ×1.005 and a point every 20 levels). From
// level 2 on, each level adds LEVEL_MIGHT damage, multiplies health by LEVEL_HP (compounding),
// and every LEVEL_ARMOR levels bring a point of armor. No cap.
export const LEVEL_MIGHT = 0.01;
export const LEVEL_HP = 1.01;
export const LEVEL_ARMOR = 10;
export const levelBonus = (level) => ({
  might: 1 + LEVEL_MIGHT * (level - 1),
  hp: LEVEL_HP ** (level - 1),
  armor: Math.floor(level / LEVEL_ARMOR),
});

// The fury orb, out of 100: what fills it. The owner's, 16 October 2026: it "should not be
// permanently ready, pressing it should be a decision". It was 0.75 a kill, and at thousands of
// kills a minute it was full every few seconds from about minute 5.
// - kill: a kill of the horde while the hero kills slowly. The faster he kills, the less each is
//   worth: kill / (1 + kills a minute / pace), the kills a minute counted over about the last
//   `window` seconds (killShare). So the horde's kills fill no more than kill × pace a minute
//   (30, an orb every 3 1/3 minutes) however many fall, and its odd fury orb (hordeOrb, the chance
//   for a lone kill) thins out the same way, but never below orbFloor of it, so the horde still
//   drops one now and then (the owner's rule: gems, the odd coin and fury orbs): 0.1 to 0.4 orbs
//   a minute at the late night's 1000 to 4000 kills.
// - boss, lord, champion: what killing one gives.
// - hit: what striking one down from full health to nothing gives, a blow its share of that (a
//   boss: the orb over the fight, a boss's tool). The ultimate's own blows give none.
// - hurt: what losing his whole health would give, a blow its share (a quarter: a fifth of the
//   orb), so a hero in trouble gets his ultimate.
// A fury orb, from a box or the horde, gives 40 (Pickup.collect).
export const FURY = {
  kill: 0.75,
  pace: 40,
  window: 15,
  hordeOrb: 0.002,
  orbFloor: 0.05,
  boss: 35,
  lord: 25,
  champion: 8,
  hit: { boss: 100, lord: 60, champion: 30 },
  hurt: 80,
};

// What is left of a blow of raw damage against armor points.
export function armored(raw, armor) {
  if (!(armor > 0)) return raw;
  return Math.max(raw * (1 - ARMOR_MOST), Math.min(raw * (1 - ARMOR_CUT) ** armor, raw - armor));
}

// Heals that come of kills (the Paladin's Devotion, Bloodstorm's): at most `most` of his health a
// second between them (Player.leech), so a horde mown down at once doesn't fill him at a stroke.
export const KILL_HEAL = { most: 0.01 };
// The Druid's Grove Warden: a tree within `near` px of him (World.treeNear), looked for every
// `every` s.
export const GROVE = { near: 48, every: 0.25 };

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
    this.strikeAng = 0; // and which way it was struck
    this.strikeBuf = 0; // a strike pressed before the weapon was ready, kept a moment
    this.fury = 0;
    this.furyFullAt = null; // when the orb last filled (addFury)
    this.lastBlow = null; // who struck the last blow, as the results name it (hurt)
    this.recentKills = 0; // the horde's kills, each fading over FURY.window seconds (killShare)
    this.ult = null; // active ultimate state
    this.invuln = 0;
    this.flash = 0;
    this.buffs = new Map(); // id -> { t, max }
    this.revivals = meta.revival || 0;
    // All from the Armory's Insight and Exile since 21 October 2026 (two free of each before):
    // shared/profile.js metaBonuses.
    this.rerolls = meta.reroll || 0;
    this.banishes = meta.banish || 0; // a card out of the run for good (the level-up's BANISH)
    this.ultLocked = false; // the hero's ultimate not yet opened (Game: open.ult): no fury, no ultimate
    this.dead = false;
    this.stepT = 0;
    this.heartT = 0;
    this.healPool = 0; // sanctuary heal accumulator
    this.leechLeft = 0; // what kills may heal him yet this second (leech)
    this.leap = null; // a leap of the Twin Axes under way (leapTo)
    this.inGrove = false; // a tree near him, for Grove Warden (GROVE)
    this.groveT = 0;
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
    const lv = levelBonus(this.level);
    this.maxHp = Math.round((h.maxHp ?? 100) * m.maxHp * (1 + bonus('maxHp') + this.blessings * 0.02) * lv.hp);
    this.armor = (h.armor || 0) + m.armor + bonus('armor') + lv.armor;
    this.speedMul = (h.speed || 1) * m.speed * (1 + bonus('speed'));
    this.might = (h.might || 1) * m.might * (1 + bonus('might') + this.blessings * 0.05) * lv.might;
    this.area = (h.area || 1) * m.area * (1 + bonus('area'));
    this.cooldown = Math.max(0.35, (h.cooldown || 1) * m.cooldown * (1 + bonus('cooldown')));
    this.amount = bonus('amount') + (m.amount || 0);
    this.duration = (m.duration || 1) * (1 + bonus('duration'));
    this.summonDur = h.summonDur || 1; // the Necromancer's Grave Pact: his minions alone last longer
    this.projSpeed = (h.projSpeed || 1) * (m.projSpeed || 1) * (1 + bonus('projSpeed'));
    this.magnet = BASE_MAGNET * m.magnet * (1 + bonus('magnet'));
    this.luck = (h.luck || 1) * m.luck * (1 + bonus('luck'));
    this.growth = (h.growth || 1) * m.growth * (1 + bonus('growth'));
    this.greed = m.greed * (1 + q.greed);
    this.regenMul = h.regenMul || 1;
    this.healMul = h.healMul || 1; // the Paladin's Devotion: every heal does this much (heal)
    // regenBoost: a bot's test buff (tools/headless.mjs), all its regeneration times this.
    this.regen = ((h.regen || 0) + m.regen + bonus('regen')) * this.regenMul * (m.regenBoost || 1);
    this.crit = 0.05 + (h.crit || 0) + bonus('crit');
    this.critMult = 2 + q.critMult;
    // More health to have brings the health with it; less (gear sold) caps it.
    if (oldMax && this.maxHp > oldMax) this.hp += this.maxHp - oldMax;
    if (this.hp > this.maxHp) this.hp = this.maxHp;
    for (const w of this.weapons) w.recompute();
  }

  // Revives left: the Second Winds counted down in `revivals`, and those relics give while held
  // (the Phoenix Heart's, spent first: hurt).
  get revives() {
    return this.revivals + this.passiveSum('revivals');
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
    this.strikeAng = ang;
    this.face = faceAttack(this.face, this.moving, Math.cos(ang), Math.sin(ang));
  }

  buff(id) {
    const b = this.buffs.get(id);
    return b && b.t > 0;
  }

  addBuff(id, t) {
    this.buffs.set(id, { t, max: t });
  }

  // The Berserker's Bloodrage: 0 at full health to 1 at none (none for any other hero), and how
  // much faster it makes his weapons (Weapon.haste); hitEnemy adds its damage.
  get rage() {
    return this.hero.stats.rage ? clamp(1 - this.hp / this.maxHp, 0, 1) : 0;
  }

  get rageHaste() {
    const r = this.hero.stats.rage;
    return r ? 1 + r.haste * this.rage : 1;
  }

  // The Twin Axes' leap (weapons.js LEAP): to (x, y) over LEAP.dur s, onLand then. The leap is his
  // own blow carrying him, never a blow shoving him, and it only goes where the weapon found open.
  leapTo(x, y, onLand, dur = 0.16) {
    this.leap = { x0: this.x, y0: this.y, x1: x, y1: y, t: 0, dur, onLand, lx: this.x, ly: this.y };
  }

  // How high off the ground he is in a leap, in px (Game.drawPlayer).
  get hop() {
    const L = this.leap;
    return L ? Math.sin(Math.min(1, L.t / L.dur) * Math.PI) * 7 : 0;
  }

  // A heal from a kill (KILL_HEAL): as much of v as this second has left.
  leech(v) {
    const h = Math.min(v, this.leechLeft);
    if (h <= 0) return 0;
    this.leechLeft -= h;
    return this.heal(h, true);
  }

  get moveSpeed() {
    let s = BASE_SPEED * this.speedMul * this.g.move;
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
    // Only the player moves the hero: no blow, however heavy, shoves him (Enemy.update). His own
    // leap carries him (leapTo), the player's steering held while he is in the air.
    // Carried off mid-leap (a crypt's door, the stairs): the leap is over, and lands nowhere.
    if (this.leap && Math.hypot(this.x - this.leap.lx, this.y - this.leap.ly) > 1) this.leap = null;
    if (this.leap) {
      const L = this.leap;
      L.t += dt;
      const u = Math.min(1, L.t / L.dur);
      this.x = L.lx = lerp(L.x0, L.x1, u);
      this.y = L.ly = lerp(L.y0, L.y1, u);
      if (u >= 1) {
        this.leap = null;
        g.world.collide(this);
        if (!this.dead) L.onLand();
      }
    } else {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      g.world.collide(this);
    }
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

    this.leechLeft = Math.min(this.maxHp * KILL_HEAL.most, this.leechLeft + this.maxHp * KILL_HEAL.most * dt);
    // Grove Warden: is a tree near him (the forest's; a crypt or the Dungeon has none)?
    if (this.hero.stats.grove && (this.groveT -= dt) <= 0) {
      this.groveT = GROVE.every;
      const was = this.inGrove;
      this.inGrove = !g.inCrypt && !!(g.world.treeNear && g.world.treeNear(this.x, this.y, GROVE.near));
      if (this.inGrove && !was) g.particles.burst(this.x, this.y - 4, 4, 6, [PC.L, PC.l, PC.e], 30, 0.6, 1, P.GLOW | P.FADE, { vz: 30 });
    }
    this.recentKills *= Math.exp(-dt / FURY.window);
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
    } else if (this.fury >= 100 && !this.ultLocked && input.pressed('ult') && !g.ultLaunch) {
      // Spent at once, so the press can't be doubled; the launch plays first (Game.launchUlt).
      this.fury = 0;
      g.launchUlt(this.hero.ult);
    }
  }

  get untouchable() {
    return this.invuln > 0 || !!this.leap || (this.ult && this.ult.type === 'shadowdance') || this.g.state !== 'play';
  }

  // A blow of amount from src (a foe, by contact) or by (who struck it from afar, as the results
  // name it: names.js); the one that fells him is the run's stats.killedBy.
  hurt(amount, src, by = null) {
    const g = this.g;
    if (this.dead || this.untouchable || this.devGod || g.state === 'faint') return 0;
    let dmg = armored(amount * g.diff.dmg, this.armor);
    if (this.buff('protection')) dmg *= 0.5;
    if (this.ult && this.ult.type === 'whirlwind') dmg *= 0.5;
    // Normal halves what he takes, after all of that (difficulty.js hurt). A blow always lands.
    dmg = Math.max(1, Math.round(dmg * g.diff.hurt));
    this.hp -= dmg;
    this.lastBlow = by || (src ? foeName(src) : null);
    this.invuln = 0.6;
    this.flash = 0.12;
    this.addFury((FURY.hurt * dmg) / this.maxHp);
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
      } else if (this.revives > 0) {
        // A relic that raises him (the Phoenix Heart) is the revive spent first, and goes with
        // it; a Second Wind (the Armory's, a legendary's) waits for the next fall.
        const relic = [...this.passives.keys()].find((id) => PASSIVES[id].stat.revivals);
        if (relic) g.spendRelic(relic);
        else this.revivals--;
        this.hp = Math.round(this.maxHp * 0.6);
        this.invuln = 2.5;
        g.revive(relic);
      } else {
        this.hp = 0;
        this.dead = true;
        g.stats.killedBy = this.lastBlow;
        g.onPlayerDeath();
      }
    }
    return dmg;
  }

  heal(amount, quiet = false) {
    if (this.dead) return 0;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount * this.healMul);
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
    const was = this.level;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = xpFor(this.level);
      this.g.queueLevelUp();
    }
    // Stronger for the levels themselves (levelBonus), the health he gains with it.
    if (this.level !== was) this.recompute();
  }

  // The orb fills; the moment it is full a chime rings, once until it has been emptied, and the HUD
  // bursts a ring out of it (furyFullAt, on the game's clock).
  addFury(v) {
    if (this.ultLocked) return; // nothing to fill it for while his ultimate is locked
    const was = this.fury;
    this.fury = Math.min(100, this.fury + v);
    if (was < 100 && this.fury >= 100) {
      this.furyFullAt = this.g.clock;
      sfx('furyready');
    }
  }

  // What a kill of the horde is worth to the orb now, as a share of a lone kill's (FURY): the
  // faster he is killing, the less.
  get killShare() {
    return 1 / (1 + (this.recentKills * 60) / FURY.window / FURY.pace);
  }

  // A kill's charge: a boss's, a lord's or a champion's is fixed, one of the horde's shrinks with
  // the pace of the killing (killShare).
  furyKill(e) {
    if (e.boss) return this.addFury(FURY.boss);
    if (e.lord) return this.addFury(FURY.lord);
    if (e.elite) return this.addFury(FURY.champion);
    this.addFury(FURY.kill * this.killShare);
    this.recentKills++;
  }

  // A blow of dmg on a boss, a lord or a champion: the share of its health it took.
  furyHit(e, dmg) {
    const k = e.boss ? FURY.hit.boss : e.lord ? FURY.hit.lord : e.elite ? FURY.hit.champion : 0;
    if (k) this.addFury((k * dmg) / e.maxHp);
  }
}

export const ULT_DURATION = { whirlwind: 3.5, arrowstorm: 3, cataclysm: 2.6, shadowdance: 3, deadrise: 0.8, sanctum: 5, overgrowth: 3, frenzy: 5, purge: 4 };
