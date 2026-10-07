// A single run: owns every system and runs the update/draw loop.

import { DIFFICULTY } from '../data/difficulty.js';
import { HEROES } from '../data/heroes.js';
import { WEAPONS, BASE_WEAPONS, MAX_WEAPON_LEVEL } from '../data/weapons.js';
import { PASSIVES, PASSIVE_IDS } from '../data/passives.js';
import { ENEMIES } from '../data/enemies.js';
import { FLOORS, hpScale, SURVIVAL_BOSSES } from '../data/waves.js';
import { SPR, TINTS } from '../engine/sprites.js';
import { sfx, playMusic, playJingle } from '../engine/audio.js';
import { view } from '../engine/view.js';
import { rand, pick, chance, TAU, clamp, damp, weighted, shuffle, mulberry32 } from '../engine/util.js';
import { Player, ULT_DURATION, xpFor } from './player.js';
import { Weapon } from './weapons.js';
import { Enemy, makeEnemyPool, SRC } from './enemies.js';
import { Pickup, gemTierValue } from './pickups.js';
import { Particles, PC, P } from './particles.js';
import { Numbers } from './numbers.js';
import { Lighting } from './lighting.js';
import { SpatialGrid } from './grid.js';
import { Spawner } from './spawner.js';
import { Forest } from './forest.js';
import { Dungeon } from './dungeon.js';
import { Hud, SHRINE_COLORS, SHRINE_INFO } from './hud.js';
import { releaseProjectile, spawnProjectile } from './projectiles.js';
import { explode, Ring, Beam, Whirl, ArrowRain, ShadowDance, Meteor, setUltDaggerSpawner } from './effects.js';
import { shadowSprite, glow, splatSprite, vignette } from './fxsprites.js';
import { Minion } from './minions.js';

const tmp = [];

export class Game {
  constructor(o) {
    this.mode = o.mode;
    this.diffId = o.diff;
    this.diff = DIFFICULTY[o.diff];
    this.settings = o.settings || {};
    this.seed = o.checkpoint?.seed ?? Math.floor(Math.random() * 2 ** 31);
    this.duration = this.mode === 's15' ? 15 * 60 : this.mode === 's30' ? 30 * 60 : Infinity;
    this.time = 0;
    this.floorTime = 0;
    this.frame = 0;
    this.state = 'play'; // play | levelup | chest | paused | dying | dawn | descend | over
    this.timeScale = 1;
    this.bossPower = 1;
    this.kills = 0;
    this.gold = 0;
    this.stats = { damage: 0, damageTaken: 0, gold: 0, bosses: 0, chests: 0, maxCombo: 0, minHp: 1, fromBoss: 0, fromMobs: 0, fromShots: 0, bossLog: [] };
    this.cam = { x: 0, y: 0, S: 4, W: 480, H: 270, pxW: 1920, pxH: 1080 };
    this.trauma = 0;
    this.hurtFlash = 0;
    this.whiteFlash = 0;
    this.calm = 0;
    this.dawn = 0;
    this.magnetAll = 0;
    this.combo = 0;
    this.comboT = 0;
    this.gemCombo = 0;
    this.gemComboT = 0;
    this.banners = [];
    this.boss = null;
    this.result = null;
    this.pendingLevels = 0;
    this.chestQueue = [];
    this.showMap = false;
    this.floor = o.checkpoint?.floor ?? 1;
    this.objective = '';
    this.floorName = '';
    this.relocT = 0;
    this.fade = 0;
    this.slowT = 0;
    this.hostileCount = 0;
    this.propCount = 0;

    this.enemies = [];
    this.minions = [];
    this.projectiles = [];
    this.eshots = [];
    this.pickups = [];
    this.effects = [];
    this.decals = [];
    this.shrines = [];
    this.drawList = [];
    this.particles = new Particles();
    this.numbers = new Numbers();
    this.numbers.enabled = this.settings.numbers !== false;
    this.lighting = new Lighting();
    this.grid = new SpatialGrid();
    this.enemyPool = makeEnemyPool();
    this.hud = new Hud(this);

    this.player = new Player(this, o.hero, o.meta);
    this.freeSrc = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    this.spawner = new Spawner(this);
    setUltDaggerSpawner((g, x, y, a) =>
      spawnProjectile(g, { kind: 'dagger', sprite: 'dagger', x, y: y - 1, z: 7, ang: a, speed: 300, life: 0.6, r: 3, dmg: 18, pierce: 2, kb: 0.4, crit: 0.35, trail: PC.P }),
    );

    if (this.mode === 'dungeon') this.enterFloor(this.floor, true);
    else {
      this.world = new Forest(this, this.seed);
      playMusic('forest');
    }
    if (o.checkpoint) this.restore(o.checkpoint);
    else this.addWeapon(HEROES[o.hero].weapon);
    this.cam.x = this.player.x - this.cam.W / 2;
    this.cam.y = this.player.y - this.cam.H / 2;
    if (this.mode !== 'dungeon') {
      const title = this.mode === 's15' ? 'Survive 15 minutes' : 'Survive 30 minutes';
      this.banner('The Darkwood', `${title} until dawn`, '#8fb8ff', 3.5);
    }
  }

  // ------------------------------------------------------------- clock --

  get phase() {
    if (this.mode === 's30') {
      // Same opening pace as the 15-minute night, then a long slow climb.
      const m = this.time / 60;
      return m <= 15 ? m * 1.4 : 21 + (m - 15) * 0.35;
    }
    if (this.mode === 's15') return (this.time / 60) * 1.4;
    const f = FLOORS[this.floor - 1];
    return Math.min(f.cap, f.phase0 + (this.floorTime / 60) * f.rate);
  }

  // Enemy damage stays gentle early and climbs once the night gets long.
  get dmgScale() {
    const ph = this.phase;
    return 1 + ph * 0.025 + Math.max(0, ph - 10) * 0.06 - Math.max(0, ph - 20) * 0.04;
  }

  // ------------------------------------------------------------ floors --

  enterFloor(n, first = false) {
    const f = FLOORS[n - 1];
    this.floor = n;
    this.floorName = f.name;
    this.floorTime = 0;
    for (const e of this.enemies) this.enemyPool.put(e);
    this.enemies.length = 0;
    for (const p of this.projectiles) releaseProjectile(p);
    this.projectiles.length = 0;
    this.eshots.length = 0;
    this.minions.length = 0;
    this.pickups.length = 0;
    this.decals.length = 0;
    this.shrines.length = 0;
    this.effects = this.effects.filter((e) => e.persistent);
    this.particles.clear();
    this.boss = null;
    this.world = new Dungeon(this, n, (this.seed + n * 7919) >>> 0);
    const start = this.world.start;
    this.player.x = start.x;
    this.player.y = start.y;
    this.cam.x = start.x - this.cam.W / 2;
    this.cam.y = start.y - this.cam.H / 2;
    this.spawner.resetForFloor(f.phase0);
    this.objective = `Slay ${ENEMIES[f.guardian].name}`;
    this.banner(`Floor ${n}`, f.name, n === 3 ? '#f77622' : '#c0cbdc', 3.2);
    playMusic('dungeon');
    if (!first && this.onCheckpoint) this.onCheckpoint();
  }

  // ------------------------------------------------------------- items --

  addWeapon(id, level = 1) {
    const src = this.freeSrc.shift() ?? 13;
    const w = new Weapon(this, id, src);
    w.level = WEAPONS[id].evolved ? MAX_WEAPON_LEVEL : level;
    w.recompute();
    this.player.weapons.push(w);
    return w;
  }

  addPassive(id, rank = 1) {
    this.player.passives.set(id, rank);
    this.player.recompute();
  }

  ownsWeapon(id) {
    return this.player.weapons.some((w) => w.id === id || (w.def.evolved && WEAPONS[id].evo && WEAPONS[id].evo.into === w.id));
  }

  levelChoices(n) {
    const p = this.player;
    const pool = [];
    for (const w of p.weapons) {
      if (!w.maxed) pool.push({ type: 'weapon', id: w.id, level: w.level + 1, weight: 3 });
    }
    if (p.weapons.length < 6) {
      for (const id of BASE_WEAPONS) if (!this.ownsWeapon(id)) pool.push({ type: 'weapon', id, level: 1, isNew: true, weight: 1 });
    }
    for (const [id, rank] of p.passives) {
      if (rank < PASSIVES[id].max) pool.push({ type: 'passive', id, level: rank + 1, weight: (PASSIVES[id].weight || 1) * 2 });
    }
    if (p.passives.size < 6) {
      for (const id of PASSIVE_IDS) if (!p.passives.has(id)) pool.push({ type: 'passive', id, level: 1, isNew: true, weight: (PASSIVES[id].weight || 1) * 0.55 });
    }
    const out = [];
    while (out.length < n && pool.length) {
      const c = weighted(pool, (x) => x.weight);
      out.push(c);
      pool.splice(pool.indexOf(c), 1);
    }
    if (!out.length) {
      out.push({ type: 'bless' }, { type: 'heal', value: 0.35 }, { type: 'gold', value: 30 });
    }
    return out;
  }

  choiceCount() {
    return Math.random() < 0.06 + (this.player.luck - 1) * 0.6 ? 4 : 3;
  }

  applyChoice(c) {
    const p = this.player;
    if (c.type === 'weapon') {
      const w = p.weapons.find((x) => x.id === c.id);
      if (w) w.levelUp();
      else if (!this.ownsWeapon(c.id) && p.weapons.length < 6) this.addWeapon(c.id);
    } else if (c.type === 'passive') {
      p.passives.set(c.id, (p.passives.get(c.id) || 0) + 1);
      p.recompute();
    } else if (c.type === 'gold') {
      this.gold += c.value;
      sfx('coin');
    } else if (c.type === 'heal') {
      p.heal(p.maxHp * c.value);
    } else if (c.type === 'bless') {
      p.blessings++;
      p.recompute();
    }
  }

  queueLevelUp() {
    this.pendingLevels++;
    sfx('levelup');
    const p = this.player;
    this.effects.push(new Beam(this, p.x, p.y, '#2ce8f5', 0.8, 120));
    this.effects.push(new Ring(this, p.x, p.y, 4, 60, 0.5, '#2ce8f5', true, 2));
    this.particles.burst(p.x, p.y - 8, 4, 30, [PC.c, PC.w, PC.U], 100, 0.8, 1, P.GLOW | P.FADE, { vz: 80 });
    this.pushback(p.x, p.y, 50, 160);
  }

  evolvable() {
    const p = this.player;
    return p.weapons.filter((w) => !w.evolved && w.level >= MAX_WEAPON_LEVEL && w.def.evo && p.passives.has(w.def.evo.with));
  }

  rollChest(kind = 'elite') {
    const p = this.player;
    const items = [];
    const ev = this.evolvable();
    if (ev.length) items.push({ type: 'evolve', w: ev[0], id: ev[0].def.evo.into });
    let n = 1;
    const r = Math.random() / p.luck;
    if (kind === 'boss') n = r < 0.35 ? 5 : 3;
    else n = r < 0.04 ? 5 : r < 0.2 ? 3 : 1;
    if (items.length) n = Math.max(0, n - 2);
    const up = () => {
      const opts = [];
      for (const w of p.weapons) if (!w.maxed) opts.push({ type: 'weapon', id: w.id });
      for (const [id, rank] of p.passives) if (rank < PASSIVES[id].max) opts.push({ type: 'passive', id });
      return opts.length ? pick(opts) : null;
    };
    for (let i = 0; i < n; i++) {
      const u = up();
      if (!u) break;
      items.push(u);
      // Apply as we go so later rolls see the new levels.
      this.applyChoice(u);
      u.level = u.type === 'weapon' ? p.weapons.find((w) => w.id === u.id).level : p.passives.get(u.id);
    }
    const gold = Math.round(rand(15, 40) * (1 + this.phase / 10) * (kind === 'boss' ? 3 : 1));
    return { items, gold };
  }

  openChest(opts = {}) {
    this.chestQueue.push(opts.kind || 'elite');
    this.stats.chests++;
  }

  // ----------------------------------------------------------- enemies --

  spawnEnemy(type, x, y, o = {}) {
    if (this.enemies.length > 900) return null;
    const e = this.enemyPool.get().init(this, type, x, y, o);
    this.enemies.push(e);
    return e;
  }

  spawnProp(type, x, y) {
    const spot = this.world.freeSpot(x, y);
    if (!spot) return null;
    return this.spawnEnemy(type, spot.x, spot.y, { instant: true });
  }

  spawnBoss(id, x, y, o = {}) {
    const mul = this.mode === 'dungeon' ? [0.65, 1.3, 4][this.floor - 1] : hpScale(this.phase) * 0.8;
    const e = this.spawnEnemy(id, x, y, { hpMul: this.diff.hp * mul, instant: true, ...o });
    if (!e) return null;
    // The Crypt's guardian is the gentler first boss: cramped rooms make every blow count.
    this.bossPower = this.mode === 'dungeon' && this.floor === 1 ? 0.75 : 1;
    if (!o.sleeping) this.bossIntro(e);
    return e;
  }

  bossIntro(e) {
    e.sleeping = false;
    this.boss = e;
    this.stats.bossLog.push({ id: e.type, t: Math.round(this.time), lvl: this.player.level, hp: Math.round(e.maxHp) });
    this.banner(e.def.name, e.def.title, e.def.color, 3);
    sfx('boss');
    this.shake(0.5);
    playMusic('boss');
    this.effects.push(new Ring(this, e.x, e.y, 6, 140, 0.9, e.def.color, false, 3));
  }

  summonRing(type, n, R, o = {}) {
    const p = this.player;
    const st = { hpMul: hpScale(this.phase) * this.diff.hp, ...o };
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand(-0.2, 0.2);
      const spot = this.world.freeSpot(p.x + Math.cos(a) * R, p.y + Math.sin(a) * R * 0.85);
      if (spot) this.spawnEnemy(type, spot.x, spot.y, st);
    }
  }

  hitEnemy(e, dmg, o = {}) {
    if (e.dead) return 0;
    if (e.sealed) {
      if (Math.random() < 0.1) this.particles.burst(e.x, e.y - e.h * 0.5, 4, 4, [PC.P, PC.i, PC.w], 50, 0.4, 1, P.GLOW | P.FADE, {});
      return 0;
    }
    if (e.sleeping) this.bossIntro(e);
    const p = this.player;
    let d = dmg * p.might;
    if (p.buff('fury')) d *= 1.6;
    if (o.ult) d *= 1 + p.level * 0.04;
    let crit = false;
    if (!o.src || o.src !== SRC.BURN) {
      crit = Math.random() < p.crit + (o.crit || 0);
      if (crit) d *= p.critMult;
    }
    d *= rand(0.9, 1.1);
    if (e.mod && e.mod.id === 'stone') d *= 0.65;
    if (e.freezeT > 0 && o.shatter) d *= 1.5;
    d = Math.max(1, Math.round(d));
    e.hp -= d;
    if (!e.prop) e.flash = 0.09;
    else e.flash = 0.06;
    const kbRes = e.def.kbRes || 0;
    if (o.kb && kbRes < 1 && !e.prop) {
      const k = (o.kb * 75 * (1 - kbRes)) / Math.sqrt(e.def.mass || 1);
      e.kx += (o.kx || 0) * k;
      e.ky += (o.ky || 0) * k;
    }
    if (o.slow) {
      e.slowT = Math.max(e.slowT, o.slowT || 1.5);
      e.slowF = Math.max(e.slowF, o.slow);
    }
    if (o.freeze && !e.boss && !e.prop && (o.freeze >= 1 || Math.random() < o.freeze)) {
      if (e.freezeT <= 0) this.particles.burst(e.x, e.y - 6, 4, 6, [PC.w, PC.c], 40, 0.4, 1, P.GLOW | P.FADE, {});
      e.freezeT = Math.max(e.freezeT, 1.6);
      e.shatterOnDeath = o.shatter;
    }
    if (this.numbers.enabled && !o.noNum) this.numbers.add(e.x, e.y - e.h * 0.85, d, crit ? 'crit' : o.type || 'normal', e);
    if (o.w) o.w.dmgDealt += d;
    this.stats.damage += d;
    const pan = clamp((e.x - p.x) / 200, -1, 1);
    if (crit) sfx('crit', { pitch: rand(0.9, 1.1), pan });
    else sfx('hit', { pitch: rand(0.8, 1.2), pan });
    if (crit) this.particles.burst(e.x, e.y - e.h * 0.5, 4, 5, [PC.Y, PC.w], 90, 0.25, 1, P.GLOW | P.FADE, {});
    if (e.hp <= 0) this.killEnemy(e, o);
    return d;
  }

  killEnemy(e, o = {}) {
    if (e.dead) return;
    e.dead = true;
    const fr = e.spr.frames[e.frameIndex()];
    if (e.prop) {
      this.breakProp(e, fr);
      return;
    }
    const p = this.player;
    this.kills++;
    this.combo++;
    this.comboT = 2;
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo);
    p.addFury(e.boss ? 35 : e.elite ? 8 : 0.75);
    if (o.w) o.w.kills++;
    this.deathFx(e, fr);
    // Loot.
    if (e.xp > 0) this.dropGem(e.x, e.y, e.xp);
    const luck = p.luck;
    if (e.type === 'thief') {
      for (let i = 0; i < 26; i++) this.addPickup('coin', e.x, e.y, 2);
      this.addPickup('goldpile', e.x, e.y, 40);
      if (chance(0.5)) this.addPickup('chest', e.x, e.y, 0, { kind: 'elite' });
      this.banner('Thief slain!', 'Its stolen gold is yours', '#feae34', 1.8);
    } else if (e.boss) {
      this.bossDefeated(e);
    } else if (e.elite) {
      this.addPickup('chest', e.x, e.y, 0, { kind: 'elite' });
      this.addPickup('goldpile', e.x + rand(-8, 8), e.y, Math.round(rand(10, 20)));
      if (chance(0.35)) this.addPickup('potion', e.x, e.y);
    } else {
      const r = Math.random();
      if (r < 0.014 * luck) this.addPickup('coin', e.x, e.y, 1);
      else if (r < 0.016 * luck) this.addPickup('potion', e.x, e.y);
      else if (r < 0.0168 * luck) this.addPickup('magnet', e.x, e.y);
      else if (r < 0.0173 * luck) this.addPickup('relic', e.x, e.y);
      else if (r < 0.0178 * luck) this.addPickup('frostrune', e.x, e.y);
      else if (r < 0.0198 * luck) this.addPickup('fury', e.x, e.y);
    }
    if (e.def.split && !o.noSplit) {
      for (let i = 0; i < e.def.splitN; i++) {
        const c = this.spawnEnemy(e.def.split, e.x + rand(-5, 5), e.y + rand(-5, 5), { hpMul: hpScale(this.phase) * this.diff.hp, instant: true });
        if (c) {
          c.kx = rand(-60, 60);
          c.ky = rand(-60, 60);
        }
      }
    }
    if (e.shatterOnDeath && e.freezeT > 0) {
      explode(this, e.x, e.y, 22, 16 * (1 + this.phase * 0.05), null, 'frost', { kb: 1 });
    }
  }

  deathFx(e, fr) {
    const ps = this.particles;
    const pix = fr.pixels;
    const S = e.scale;
    const ox = e.x - (fr.w * S) / 2, oy = e.y - fr.h * S;
    // The sprite shatters into its own pixels.
    const step = pix.length > 300 ? 3 : 1;
    const flip = e.face < 0;
    for (let i = 0; i < pix.length; i += 3 * step) {
      if (Math.random() > 0.45 * ps.budget) continue;
      const px = flip ? fr.w - 1 - pix[i] : pix[i];
      const x = ox + px * S, y = oy + pix[i + 1] * S;
      const dx = x - e.x, dy = y - (e.y - fr.h * S * 0.5);
      ps.emit(e.x + dx * 0.2, e.y, (e.y - y) + 1, dx * rand(3, 7) + rand(-20, 20), dy * rand(1, 3) + rand(-10, 10), rand(40, 110), rand(0.6, 1.3), S > 1.2 ? 2 : 1, pix[i + 2], P.GROUND | P.FADE, 1.5, 300);
    }
    const D = e.def.death;
    const pan = clamp((e.x - this.player.x) / 200, -1, 1);
    switch (D) {
      case 'blood':
        ps.burst(e.x, e.y, 6, 8, [PC.r, PC.R, PC.x], 70, 0.7, 1, P.GROUND | P.FADE, { vz: 70, grav: 280 });
        if (chance(0.6)) this.addDecal('blood', e.x, e.y, 3 + e.r * 0.6);
        sfx('die', { pitch: rand(0.8, 1.1), pan });
        break;
      case 'bones':
        ps.burst(e.x, e.y, 8, 6, [PC.z, PC.Z, PC.T], 80, 1, 1, P.GROUND | P.FADE, { vz: 100, grav: 300 });
        if (chance(0.5)) this.addDecal('bones', e.x, e.y, 4);
        sfx('bones', { pitch: rand(0.9, 1.2), pan });
        break;
      case 'goo':
        ps.burst(e.x, e.y, 4, 10, [PC.L, PC.l, PC.e], 70, 0.7, 1, P.GROUND | P.FADE, { vz: 60, grav: 250 });
        this.addDecal('goo', e.x, e.y, 3 + e.r * 0.6);
        sfx('goo', { pitch: rand(0.9, 1.3), pan });
        break;
      case 'ecto':
        ps.burst(e.x, e.y - 6, 4, 14, [PC.c, PC.G, PC.w], 40, 1, 2, P.GLOW | P.FADE | P.SHRINK, { vz: 40, drag: 2 });
        sfx('die', { pitch: 1.5, pan });
        break;
      case 'ash':
        ps.burst(e.x, e.y - 4, 4, 12, [PC.o, PC.y, PC.O], 80, 0.8, 1, P.GLOW | P.FADE, { vz: 60 });
        ps.burst(e.x, e.y, 4, 6, [PC.a, PC.A], 40, 1.2, 2, P.FADE, { vz: 30 });
        this.addDecal('ash', e.x, e.y, 4);
        sfx('die', { pitch: 0.7, pan });
        break;
      case 'dark':
        ps.burst(e.x, e.y - 4, 4, 10, [PC.P, PC.p, PC.q], 70, 0.7, 1, P.GLOW | P.FADE, { vz: 50 });
        if (chance(0.5)) this.addDecal('dark', e.x, e.y, 3 + e.r * 0.5);
        sfx('die', { pitch: rand(1, 1.3), pan });
        break;
      case 'gold':
        ps.burst(e.x, e.y - 4, 6, 24, [PC.Y, PC.y, PC.w], 120, 1, 1, P.GLOW | P.FADE, { vz: 90 });
        sfx('chest');
        break;
      default:
        sfx('die', { pan });
    }
    if (e.elite || e.boss || e.def.mass >= 3) {
      sfx('bigdie', { pan });
      this.shake(e.boss ? 0.8 : 0.25);
    }
  }

  breakProp(e, fr) {
    const ps = this.particles;
    const cols = e.type === 'urn' ? [PC.d, PC.O, PC.B] : e.type === 'lantern' ? [PC.b, PC.y, PC.N] : [PC.b, PC.B, PC.t, PC.m];
    ps.burst(e.x, e.y - 5, 6, 16, cols, 90, 1.1, 1, P.GROUND | P.FADE, { vz: 110, grav: 300 });
    sfx('wood', { pan: clamp((e.x - this.player.x) / 200, -1, 1) });
    this.addDecal('wood', e.x, e.y, 3);
    const luck = this.player.luck;
    const r = Math.random();
    if (r < 0.34) {
      const n = Math.floor(rand(1, 4));
      for (let i = 0; i < n; i++) this.addPickup('coin', e.x, e.y, 1);
    } else if (r < 0.5) this.addPickup('potion', e.x, e.y);
    else if (r < 0.56 + 0.02 * luck) this.addPickup('magnet', e.x, e.y);
    else if (r < 0.6 + 0.02 * luck) this.addPickup('fury', e.x, e.y);
    else if (r < 0.62 + 0.01 * luck) this.addPickup('relic', e.x, e.y);
    else if (r < 0.64 + 0.01 * luck) this.addPickup('frostrune', e.x, e.y);
    else if (r < 0.66 + 0.01 * luck) this.addPickup('elixir', e.x, e.y);
    else if (r < 0.8) this.addPickup('goldpile', e.x, e.y, Math.round(rand(5, 12)));
  }

  bossDefeated(e) {
    const p = this.player;
    this.stats.bosses++;
    const log = this.stats.bossLog.find((b) => b.id === e.type && b.kill === undefined);
    if (log) log.kill = Math.round(this.time - log.t);
    if (this.boss === e) this.boss = null;
    this.timeScale = 0.35;
    this.slowT = 1.1;
    this.whiteFlash = 0.6;
    sfx('bigexplode');
    explode(this, e.x, e.y - 8, 60, 0, null, 'fire');
    for (let i = 0; i < 6; i++) {
      this.effects.push(new Meteor(this, null, e.x + rand(-30, 30), e.y + rand(-24, 24), 20, 0, 0.1 + i * 0.12, { fall: 0.01 }));
    }
    this.addPickup('chest', e.x, e.y, 0, { kind: 'boss' });
    for (let i = 0; i < 18; i++) this.addPickup('coin', e.x, e.y, 2);
    this.addPickup('goldpile', e.x, e.y, 60);
    this.addPickup('elixir', e.x + rand(-10, 10), e.y + rand(-10, 10));
    this.banner(`${e.def.name} is slain!`, e.def.title, '#fee761', 3.2);
    if (this.mode === 'dungeon') {
      if (this.floor < 3) {
        this.world.openStairs(e.x, e.y);
        this.objective = 'Descend the stairs';
      } else {
        this.objective = '';
        this.victory('dungeon');
      }
    }
    if (this.mode !== 'dungeon' || this.floor < 3) playMusic(this.mode === 'dungeon' ? 'dungeon' : 'forest');
  }

  descend() {
    if (this.state !== 'play') return;
    this.state = 'descend';
    this.descendT = 0;
    sfx('descend');
  }

  escape(e) {
    e.dead = true;
    this.particles.burst(e.x, e.y - 6, 4, 20, [PC.Y, PC.y, PC.w], 60, 0.8, 1, P.GLOW | P.FADE, { vz: 60 });
    this.banner('The thief escaped...', '', '#8b9bb4', 1.6);
    sfx('teleport');
  }

  // ----------------------------------------------------------- pickups --

  addPickup(kind, x, y, value = 1, opts = {}) {
    const pk = new Pickup(this, kind, x, y, value, opts);
    this.pickups.push(pk);
    return pk;
  }

  dropGem(x, y, value) {
    let gems = 0;
    for (const pk of this.pickups) if (pk.kind === 'gem') gems++;
    if (gems > 380) {
      // Fold the XP into the oldest gem rather than flooding the floor.
      for (const pk of this.pickups) {
        if (pk.kind === 'gem' && !pk.pulled) {
          pk.value += value;
          pk.setLook();
          return;
        }
      }
    }
    this.addPickup('gem', x, y, value);
  }

  // ------------------------------------------------------------ queries --

  nearestEnemies(x, y, n, maxR) {
    const cands = this.grid.query(x, y, maxR, tmp);
    const list = [];
    for (const e of cands) {
      if (e.dead || e.prop || e.spawnT > 0.3) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d <= maxR * maxR) list.push([d, e]);
    }
    list.sort((a, b) => a[0] - b[0]);
    return list.slice(0, n).map((v) => v[1]);
  }

  nearestEnemy(x, y, maxR, filter) {
    const cands = this.grid.query(x, y, maxR, tmp);
    let best = null, bd = maxR * maxR;
    for (const e of cands) {
      if (e.dead || e.prop || (filter && !filter(e))) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  enemiesOnScreen(noProps = true) {
    const c = this.cam, out = [];
    for (const e of this.enemies) {
      if (e.dead || (noProps && e.prop) || e.spawnT > 0.3) continue;
      if (e.x > c.x - 8 && e.x < c.x + c.W + 8 && e.y > c.y - 4 && e.y < c.y + c.H + 16) out.push(e);
    }
    return out;
  }

  // ------------------------------------------------------------- juice --

  light(x, y, r, key, i = 1) {
    this.lighting.add(x, y, r, key, i);
  }

  shake(a) {
    if (this.settings.shake === false) return;
    this.trauma = Math.min(1, this.trauma + a);
  }

  banner(title, sub = '', color = '#ffffff', dur = 2.4) {
    this.banners.push({ title, sub, color, dur, t: 0 });
    if (this.banners.length > 3) this.banners.shift();
  }

  addDecal(kind, x, y, r) {
    let img;
    if (kind === 'bones') img = SPR.bonepile.frames[0].c;
    else img = splatSprite(kind, Math.floor(rand(6)), r);
    this.decals.push({ img, x, y, t: 0, life: kind === 'scorch' ? 6 : 14 });
    if (this.decals.length > 240) this.decals.shift();
  }

  pushback(x, y, R, force) {
    const cands = this.grid.query(x, y, R + 10, tmp);
    for (const e of cands) {
      if (e.dead || e.prop || e.boss) continue;
      const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1;
      if (d > R) continue;
      const k = (force * (1 - d / R)) / Math.sqrt(e.def.mass || 1);
      e.kx += (dx / d) * k;
      e.ky += (dy / d) * k;
    }
  }

  holyNova() {
    this.whiteFlash = 0.8;
    sfx('relic');
    this.shake(0.6);
    this.banner('Holy Relic', 'The wicked are purged', '#fee761', 2);
    const p = this.player;
    this.effects.push(new Ring(this, p.x, p.y, 6, 260, 0.8, '#fee761', false, 3));
    for (const e of this.enemiesOnScreen(true)) {
      if (e.boss) this.hitEnemy(e, 200, { type: 'holy' });
      else this.killEnemy(e, { noSplit: true });
    }
  }

  freezeAll(t) {
    sfx('freeze');
    this.banner('Frost Rune', 'Time itself freezes', '#2ce8f5', 2);
    this.whiteFlash = 0.3;
    for (const e of this.enemies) {
      if (e.prop || e.dead) continue;
      if (e.boss) {
        e.slowT = t;
        e.slowF = 0.6;
      } else e.freezeT = t;
    }
  }

  revive() {
    const p = this.player;
    this.whiteFlash = 1;
    sfx('relic');
    this.banner('Second Wind!', 'You rise again', '#feae34', 2.5);
    this.effects.push(new Beam(this, p.x, p.y, '#feae34', 1.5, 160));
    explode(this, p.x, p.y, 90, 120, null, 'holy', { kb: 3 });
  }

  addShrine(x, y, type) {
    const spot = this.world.freeSpot(x, y);
    if (!spot) return;
    this.shrines.push({ x: spot.x, y: spot.y, type, used: false, t: rand(6), spr: SPR.shrine, shrine: true });
  }

  useShrine(s) {
    s.used = true;
    const p = this.player;
    p.addBuff(s.type, 30);
    if (s.type === 'protection') p.heal(p.maxHp * 0.25);
    const [title, sub] = SHRINE_INFO[s.type];
    this.banner(title, sub, SHRINE_COLORS[s.type], 2.6);
    sfx('shrine');
    this.effects.push(new Beam(this, s.x, s.y, SHRINE_COLORS[s.type], 1.2, 140));
    this.effects.push(new Ring(this, p.x, p.y, 4, 50, 0.5, SHRINE_COLORS[s.type], true));
  }

  // ---------------------------------------------------------- ultimate --

  startUlt(type) {
    const p = this.player;
    const dur = ULT_DURATION[type];
    p.ult = { type, t: dur, max: dur, k: 0 };
    sfx('ult');
    this.whiteFlash = 0.25;
    this.shake(0.4);
    this.effects.push(new Ring(this, p.x, p.y, 4, 90, 0.5, '#f6757a', true, 2));
    this.banner(p.hero.ultName + '!', '', '#f6757a', 1.4);
    if (type === 'whirlwind') this.effects.push(new Whirl(this, dur));
    else if (type === 'arrowstorm') this.effects.push(new ArrowRain(this, dur));
    else if (type === 'shadowdance') {
      this.effects.push(new ShadowDance(this, dur));
      p.invuln = dur;
    } else if (type === 'deadrise') {
      // Army of the Dead: a ring of empowered death knights.
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        const spot = this.world.freeSpot(p.x + Math.cos(a) * 34, p.y + Math.sin(a) * 26);
        if (spot) this.minions.push(new Minion(this, spot.x, spot.y, { dmg: 24, dur: 11 * p.duration, speed: 1.3, knight: true, burst: true, ult: true }));
      }
      this.effects.push(new Ring(this, p.x, p.y, 6, 110, 0.7, '#9ee562', false, 3));
      this.pushback(p.x, p.y, 70, 260);
    }
  }

  updateUlt(u, dt) {
    if (u.type !== 'cataclysm') return;
    u.k -= dt;
    while (u.k <= 0 && u.t > 0.3) {
      u.k += 0.12;
      const list = this.enemiesOnScreen(true);
      const e = list.length ? pick(list) : null;
      const p = this.player;
      const x = e ? e.x : p.x + rand(-150, 150), y = e ? e.y : p.y + rand(-90, 90);
      this.effects.push(new Meteor(this, null, x, y, 34, 55, 0, { fall: 0.45, ult: true }));
    }
  }

  // -------------------------------------------------------- end states --

  onPlayerDeath() {
    this.state = 'dying';
    this.deathT = 0;
    this.timeScale = 0.3;
    const p = this.player;
    this.particles.burst(p.x, p.y - 8, 6, 60, [PC.r, PC.R, PC.x, PC.w], 120, 1.4, 1, P.GROUND | P.FADE, { vz: 120, grav: 250 });
    this.particles.burst(p.x, p.y - 8, 6, 20, [PC.w, PC.G], 40, 2, 2, P.GLOW | P.FADE, { vz: 50, drag: 1 });
    this.shake(1);
    playJingle('gameover');
  }

  victory(kind) {
    if (this.state === 'dawn' || this.state === 'over') return;
    this.state = 'dawn';
    this.dawnT = 0;
    this.calm = 1;
    this.victoryKind = kind;
    if (kind === 'survival') this.banner('Dawn breaks!', 'You survived the night', '#fee761', 4);
    else this.banner('Victory!', 'The Lord of Cinders is no more', '#fee761', 4);
    sfx('bell');
    playJingle('victory');
  }

  finish(victory) {
    this.state = 'over';
    const p = this.player;
    this.result = {
      victory,
      mode: this.mode,
      diff: this.diffId,
      hero: p.id,
      time: Math.floor(this.time),
      gold: this.gold,
      kills: this.kills,
      level: p.level,
      floor: this.floor,
      weapons: p.weapons.map((w) => ({ id: w.id, level: w.level, dmg: Math.round(w.dmgDealt), kills: w.kills, since: w.since })),
      stats: { ...this.stats },
    };
  }

  // ----------------------------------------------------------- persist --

  checkpoint() {
    const p = this.player;
    return {
      mode: this.mode,
      diff: this.diffId,
      hero: p.id,
      floor: this.floor,
      seed: this.seed,
      time: Math.floor(this.time),
      level: p.level,
      xp: Math.floor(p.xp),
      hp: Math.max(1, Math.ceil(p.hp)),
      gold: this.gold,
      kills: this.kills,
      fury: Math.floor(p.fury),
      rerolls: p.rerolls,
      weapons: p.weapons.map((w) => [w.id, w.level, w.evolved ? 1 : 0]),
      passives: [...p.passives.entries()].map(([id, r]) => [id, r, 0]),
      bless: p.blessings,
      ts: Date.now(),
    };
  }

  restore(cp) {
    const p = this.player;
    this.time = cp.time;
    this.gold = cp.gold;
    this.kills = cp.kills;
    p.level = cp.level;
    p.xpNext = xpFor(cp.level);
    p.fury = cp.fury;
    p.rerolls = cp.rerolls;
    for (const [id, lvl] of cp.weapons) if (WEAPONS[id]) this.addWeapon(id, lvl);
    if (!p.weapons.length) this.addWeapon(p.hero.weapon);
    for (const [id, r] of cp.passives) if (PASSIVES[id]) p.passives.set(id, Math.min(r, PASSIVES[id].max));
    p.blessings = cp.bless || 0;
    p.recompute();
    p.hp = Math.min(p.maxHp, cp.hp);
    p.xp = cp.xp;
    this.spawner.bossIdx = 0;
    if (this.mode !== 'dungeon') {
      const b = SURVIVAL_BOSSES[this.mode].map((x) => x.at);
      while (this.spawner.bossIdx < b.length && b[this.spawner.bossIdx] <= this.time) this.spawner.bossIdx++;
      this.spawner.resetForFloor(this.phase);
    }
    this.banner('Run restored', 'Your saved progress continues', '#63c74d', 2.5);
  }

  // ------------------------------------------------------------ update --

  syncCam() {
    const c = this.cam;
    c.S = view.S;
    c.W = view.W;
    c.H = view.H;
    c.pxW = view.pxW;
    c.pxH = view.pxH;
  }

  update(rdt) {
    this.syncCam();
    if (this.state === 'paused' || this.state === 'levelup' || this.state === 'chest' || this.state === 'over') return;
    if (this.slowT > 0) {
      this.slowT -= rdt;
      if (this.slowT <= 0 && this.state !== 'dying') this.timeScale = 1;
    }
    const dt = Math.min(rdt, 1 / 30) * this.timeScale;
    this.frame++;
    const p = this.player;

    if (this.state === 'play') {
      this.time += dt;
      this.floorTime += dt;
    }
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.hurtFlash = Math.max(0, this.hurtFlash - rdt * 2);
    this.whiteFlash = Math.max(0, this.whiteFlash - rdt * 1.5);
    this.magnetAll = Math.max(0, this.magnetAll - dt);
    this.gemComboT -= dt;
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    for (let i = this.banners.length - 1; i >= 0; i--) {
      const b = this.banners[i];
      b.t += rdt;
      if (b.t >= b.dur) this.banners.splice(i, 1);
    }

    if (this.state === 'play') {
      p.update(dt);
      this.spawner.update(dt);
    } else if (this.state === 'dying') {
      this.deathT += rdt;
      if (this.deathT > 2.4) this.finish(false);
    } else if (this.state === 'descend') {
      this.descendT += rdt;
      this.fade = Math.min(1, this.descendT / 0.8);
      if (this.descendT >= 0.8 && !this.descended) {
        this.descended = true;
        this.player.heal(this.player.maxHp * 0.3, true);
        this.enterFloor(this.floor + 1);
      }
      if (this.descendT >= 1.2) {
        this.fade = Math.max(0, 1 - (this.descendT - 1.2) / 0.8);
        if (this.descendT >= 2) {
          this.state = 'play';
          this.descended = false;
          this.fade = 0;
        }
      }
    } else if (this.state === 'dawn') {
      this.dawnT += rdt;
      this.dawn = Math.min(1, this.dawnT / 2.5);
      // Every foe burns away in the light.
      if (this.frame % 3 === 0) {
        for (const e of this.enemies) {
          if (!e.dead && !e.prop && Math.random() < 0.15) {
            e.dead = true;
            this.particles.burst(e.x, e.y - 6, 4, 8, [PC.y, PC.o, PC.w], 50, 0.8, 1, P.GLOW | P.FADE, { vz: 50 });
          }
        }
      }
      p.update(dt);
      if (this.dawnT > 5) this.finish(true);
    }

    this.world.update(dt);
    // Sweep last frame's dead before indexing; the grid must match the array.
    const E = this.enemies;
    for (let i = E.length - 1; i >= 0; i--) {
      if (E[i].dead) {
        this.enemyPool.put(E[i]);
        E[i] = E[E.length - 1];
        E.pop();
      }
    }
    this.grid.rebuild(E, p.x, p.y);

    if (this.state === 'play') {
      for (const w of p.weapons) w.update(dt);
      updateList(this.minions, dt);
    }
    updateList(this.projectiles, dt, releaseProjectile);
    updateList(this.eshots, dt);

    // Enemies.
    let hostile = 0, props = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (this.state === 'play' || this.state === 'dying') e.update(dt);
      if (e.prop) props++;
      else hostile++;
    }
    this.hostileCount = hostile;
    this.propCount = props;
    this.separate();
    this.relocT -= dt;
    if (this.relocT <= 0) {
      this.relocT = 0.5;
      this.relocate();
    }
    if (this.boss && this.boss.dead) this.boss = null;

    updateList(this.effects, dt);
    updateList(this.pickups, dt);
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      d.t += dt;
      if (d.t > d.life) this.decals.splice(i, 1);
    }
    // Shrines.
    for (const s of this.shrines) {
      s.t += dt;
      if (!s.used && this.state === 'play' && Math.hypot(p.x - s.x, p.y - s.y) < 13) this.useShrine(s);
    }
    this.particles.budget = this.particles.n > 3500 ? 0.4 : this.particles.n > 2000 ? 0.7 : 1;
    this.particles.update(dt);
    this.numbers.update(rdt * (this.timeScale < 1 ? 0.6 : 1));

    // Camera.
    const c = this.cam;
    const tx = p.x - c.W / 2, ty = p.y - 8 - c.H / 2;
    c.x = damp(c.x, tx, 9, rdt);
    c.y = damp(c.y, ty, 9, rdt);
    if (Math.abs(c.x - tx) > c.W) c.x = tx;
    if (Math.abs(c.y - ty) > c.H) c.y = ty;

    if (this.state === 'play' && this.mode !== 'dungeon' && this.time >= this.duration) this.victory('survival');
  }

  separate() {
    const E = this.enemies, p = this.player;
    for (let i = 0; i < E.length; i++) {
      const a = E[i];
      if (a.dead || a.prop) continue;
      const cands = this.grid.query(a.x, a.y, a.r + 14, tmp);
      for (let k = 0; k < cands.length; k++) {
        const b = cands[k];
        if (b === a || b.dead) continue;
        if (!b.prop && b.id < a.id) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const rr = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const ov = (rr - d) * 0.5;
        const nx = dx / d, ny = dy / d;
        if (b.prop) {
          a.x -= nx * ov * 2;
          a.y -= ny * ov * 2;
          continue;
        }
        const ma = a.def.mass || 1, mb = b.def.mass || 1, mt = ma + mb;
        a.x -= nx * ov * (mb / mt);
        a.y -= ny * ov * (mb / mt);
        b.x += nx * ov * (ma / mt);
        b.y += ny * ov * (ma / mt);
      }
      // Don't let foes stand inside the hero.
      if (!a.def.fly) {
        const dx = a.x - p.x, dy = a.y - p.y, d2 = dx * dx + dy * dy, rr = a.r + p.r - 2;
        if (d2 < rr * rr && d2 > 0.01) {
          const d = Math.sqrt(d2);
          a.x += (dx / d) * (rr - d) * 0.5;
          a.y += (dy / d) * (rr - d) * 0.5;
        }
      }
    }
  }

  relocate() {
    const w = this.world;
    for (const e of this.enemies) {
      if (e.dead || e.boss || e.type === 'thief' || e.sleeping) continue;
      if (!w.tooFar(e, this.cam)) continue;
      if (e.prop) {
        e.dead = true;
        continue;
      }
      const pt = w.spawnPoint(this);
      if (pt) {
        e.x = pt.x;
        e.y = pt.y;
        e.lockT = 0;
      }
    }
  }

  // -------------------------------------------------------------- draw --

  draw(ctx) {
    this.syncCam();
    const c = this.cam;
    const S = c.S;
    // Screen shake offsets the camera for this frame only.
    const sh = this.trauma * this.trauma;
    const bx = c.x, by = c.y;
    c.x = bx + (Math.random() - 0.5) * 9 * sh;
    c.y = by + (Math.random() - 0.5) * 9 * sh;

    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0d0b14';
    ctx.fillRect(0, 0, c.pxW, c.pxH);
    this.world.drawGround(ctx, c, this.time);

    // Decals.
    for (const d of this.decals) {
      const a = Math.min(1, (d.life - d.t) / 3) * 0.85;
      if (a <= 0) continue;
      const sx = (d.x - c.x) * S, sy = (d.y - c.y) * S;
      if (sx < -40 || sy < -40 || sx > c.pxW + 40 || sy > c.pxH + 40) continue;
      ctx.globalAlpha = a;
      ctx.drawImage(d.img, Math.round(sx - (d.img.width * S) / 2), Math.round(sy - (d.img.height * S) / 2), d.img.width * S, d.img.height * S);
    }
    ctx.globalAlpha = 1;
    if (this.world.drawGroundProps) this.world.drawGroundProps(ctx, c, this.time);

    for (const e of this.effects) if (e.drawGround) e.drawGround(ctx, c);
    for (const pk of this.pickups) pk.draw(ctx, c);

    // Shadows.
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.dead && onScreen(c, e.x, e.y, 40)) e.drawShadow(ctx, c);
    }
    for (const m of this.minions) if (onScreen(c, m.x, m.y, 40)) m.drawShadow(ctx, c);
    if (!p.dead) {
      const shd = shadowSprite(10);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(shd, Math.round((p.x - c.x) * S - (shd.width * S) / 2), Math.round((p.y - c.y) * S - (shd.height * S) / 2), shd.width * S, shd.height * S);
      ctx.globalAlpha = 1;
    }

    // Y-sorted actors and props.
    const list = this.drawList;
    list.length = 0;
    this.world.collectProps(c, list);
    for (const s of this.shrines) list.push(s);
    for (const e of this.enemies) if (!e.dead && onScreen(c, e.x, e.y, 60)) list.push(e);
    for (const m of this.minions) if (onScreen(c, m.x, m.y, 60)) list.push(m);
    list.push(p);
    list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o === p) this.drawPlayer(ctx, c);
      else if (o.shrine) this.drawShrine(ctx, c, o);
      else if (o.def || o.minion) o.draw(ctx, c);
      else this.world.drawProp(ctx, c, o, this.time);
    }

    for (const pr of this.projectiles) pr.draw(ctx, c);
    for (const s of this.eshots) s.draw(ctx, c);
    for (const e of this.effects) if (e.draw) e.draw(ctx, c);
    this.particles.draw(ctx, c, false);

    // Lighting.
    this.world.addLights(this);
    const flick = 0.94 + 0.06 * Math.sin(this.time * 9) * Math.sin(this.time * 5.3);
    this.light(p.x, p.y - 6, (this.mode === 'dungeon' ? 130 : 125) * flick, 'warm', 1);
    this.light(p.x, p.y - 8, 46, 'white', 0.7);
    this.lighting.render(ctx, c, this.world.ambient());

    // Unlit / additive layers.
    for (const o of list) {
      if (o.def || o.minion) o.drawEmissive(ctx, c);
      else if (o === p) this.drawPlayerEmissive(ctx, c);
      else if (!o.shrine && this.world.drawPropEmissive) this.world.drawPropEmissive(ctx, o);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.shrines) this.drawShrineGlow(ctx, c, s);
    for (const pk of this.pickups) pk.drawGlow(ctx, c);
    for (const e of this.effects) if (e.drawGlow) e.drawGlow(ctx, c);
    for (const pr of this.projectiles) pr.drawGlow(ctx, c);
    for (const s of this.eshots) s.drawGlow(ctx, c);
    for (const e of this.enemies) if (!e.dead && (e.elite || e.boss) && onScreen(c, e.x, e.y, 60)) e.drawGlow(ctx, c);
    for (const m of this.minions) if (onScreen(c, m.x, m.y, 40)) m.drawGlow(ctx, c);
    this.particles.draw(ctx, c, true);
    ctx.globalCompositeOperation = 'source-over';

    if (this.world.drawOverlay) this.world.drawOverlay(ctx, c, this.time);
    this.numbers.draw(ctx, c);

    // Screen-space post effects.
    ctx.drawImage(vignette(256, 144, '8,6,16', 0.7), 0, 0, c.pxW, c.pxH);
    const low = p.hp / p.maxHp;
    if (this.hurtFlash > 0 || (low < 0.3 && !p.dead)) {
      const a = Math.max(this.hurtFlash * 0.7, low < 0.3 ? (0.25 + 0.15 * Math.sin(this.time * 6)) * (1 - low / 0.3) : 0);
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(vignette(256, 144, '200,20,40', 0.9), 0, 0, c.pxW, c.pxH);
      ctx.globalAlpha = 1;
    }
    if (this.whiteFlash > 0) {
      ctx.globalAlpha = Math.min(0.85, this.whiteFlash);
      ctx.fillStyle = '#fff8e8';
      ctx.fillRect(0, 0, c.pxW, c.pxH);
      ctx.globalAlpha = 1;
    }
    if (this.fade > 0) {
      ctx.globalAlpha = Math.min(1, this.fade);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, c.pxW, c.pxH);
      ctx.globalAlpha = 1;
    }
    c.x = bx;
    c.y = by;
  }

  drawPlayer(ctx, c) {
    const p = this.player;
    if (p.dead) return;
    const S = c.S;
    const spr = SPR[p.hero.sprite];
    const moving = p.moving;
    const fi = moving ? Math.floor(p.anim) % spr.frames.length : 0;
    const fr = spr.frames[fi];
    const flip = p.face < 0;
    let img = p.flash > 0 ? fr.white(flip) : fr.get(flip);
    const bob = moving ? (Math.floor(p.anim) % 2) * -1 : Math.sin(p.anim * 2) > 0.6 ? -1 : 0;
    const w = img.width * S, h = img.height * S;
    const lunge = p.swingT > 0 ? Math.sin((p.swingT / 0.14) * Math.PI) * 2.5 : 0;
    const lx = p.swingT > 0 ? Math.cos(p.swingAng) * lunge : 0, ly = p.swingT > 0 ? Math.sin(p.swingAng) * lunge * 0.6 : 0;
    const X = Math.round((p.x + lx - c.x) * S - w / 2), Y = Math.round((p.y + ly - c.y) * S - h + S + bob * S);
    let alpha = 1;
    if (p.invuln > 0 && !(p.ult && p.ult.type === 'shadowdance') && Math.floor(p.invuln * 18) % 2 === 0) alpha = 0.45;
    if (p.ult && p.ult.type === 'shadowdance') alpha = 0.35 + 0.15 * Math.sin(this.time * 20);
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, X, Y, w, h);
    ctx.globalAlpha = 1;
    p._rect = [X, Y, w, h, fr, flip];
  }

  drawPlayerEmissive(ctx) {
    const p = this.player;
    if (p.dead || !p._rect) return;
    const [X, Y, w, h, fr, flip] = p._rect;
    if (fr.em) ctx.drawImage(flip ? fr.emf : fr.em, X, Y, w, h);
  }

  drawShrine(ctx, c, s) {
    const S = c.S;
    const img = s.used ? s.spr.frames[0].variant('dim', TINTS.dim, false) : s.spr.frames[0].c;
    const w = img.width * S, h = img.height * S;
    const X = Math.round((s.x - c.x) * S - w / 2), Y = Math.round((s.y - c.y) * S - h + S);
    ctx.globalAlpha = s.used ? 0.6 : 1;
    ctx.drawImage(img, X, Y, w, h);
    ctx.globalAlpha = 1;
  }

  drawShrineGlow(ctx, c, s) {
    if (s.used) return;
    const S = c.S;
    const col = SHRINE_COLORS[s.type];
    const sx = (s.x - c.x) * S, sy = (s.y - 15 - c.y) * S;
    const sz = (26 + 4 * Math.sin(s.t * 3)) * S;
    ctx.drawImage(glow(col), sx - sz / 2, sy - sz / 2, sz, sz);
    ctx.drawImage(glow(col), sx - sz / 4, sy - sz / 4, sz / 2, sz / 2);
    this.light(s.x, s.y - 12, 70, s.type === 'fury' ? 'red' : s.type === 'haste' ? 'cyan' : s.type === 'fortune' ? 'gold' : s.type === 'wisdom' ? 'purple' : 'green', 0.9);
    if (Math.random() < 0.2) this.particles.emit(s.x + rand(-4, 4), s.y - 14, 0, 0, 0, rand(10, 25), 0.8, 1, PC.w, P.GLOW | P.FADE, 0);
  }
}

function onScreen(c, x, y, m) {
  return x > c.x - m && x < c.x + c.W + m && y > c.y - m && y < c.y + c.H + m * 1.5;
}

function updateList(list, dt, release) {
  let j = 0;
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    if (o.update(dt)) list[j++] = o;
    else if (release) release(o);
  }
  list.length = j;
}
