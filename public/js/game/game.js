// A single run: owns every system and runs the update/draw loop.

import { diffFor } from '../data/difficulty.js';
import { HEROES, startWeapons, weaponsFor } from '../data/heroes.js';
import { WEAPONS, MAX_WEAPON_LEVEL, MAX_WEAPONS, MAX_RELICS } from '../data/weapons.js';
import { PASSIVES, PASSIVE_IDS, FILLER_IDS } from '../data/passives.js';
import { ENEMIES } from '../data/enemies.js';
import { FLOORS, monsterHp, minuteOf } from '../data/waves.js';
import { RANKS, HERO_UNLOCK_TIME } from '../shared/profile.js';
import { RARITIES, SLOT_NAMES, rollItem, sanitizeGear, itemPrice, lordDrop } from '../shared/items.js';
import { SPR, TINTS, walkFrame, idleFrame } from '../engine/sprites.js';
import { sfx, playMusic, playJingle } from '../engine/audio.js';
import { view } from '../engine/view.js';
import { input } from '../engine/input.js';
import { rand, pick, chance, TAU, clamp, damp, weighted, mulberry32, hash2 } from '../engine/util.js';
import { Player, ULT_DURATION } from './player.js';
import { rangerPose } from './ranger-animation.js';
import { faceAlong } from './facing.js';
import { Weapon, aimAt } from './weapons.js';
import { Enemy, makeEnemyPool } from './enemies.js';
import { Pickup } from './pickups.js';
import { Particles, PC, P } from './particles.js';
import { Numbers } from './numbers.js';
import { Lighting } from './lighting.js';
import { SpatialGrid } from './grid.js';
import { Spawner } from './spawner.js';
import { Forest } from './forest.js';
import { Dungeon, cryptLords } from './dungeon.js';
import { Hud, SHRINE_COLORS, SHRINE_INFO } from './hud.js';
import { releaseProjectile } from './projectiles.js';
import { explode, Ring, Beam, Whirl, ArrowRain, ShadowDance, Meteor } from './effects.js';
import { shadowSprite, glow, splatSprite, vignette } from './fxsprites.js';
import { Minion } from './minions.js';

const tmp = [];
// How far behind the hero coins and potions in the forest last (a few screens).
const PICKUP_FAR = 1400;
// How hard the hero's blows throw a foe back: px/s per point of a blow's kb, before the foe's
// own weight and resistance. A third of the old 75 since 15 October 2026 (the user's call).
export const KNOCKBACK = 25;

// Whether a card is one of the fillers a level-up falls back on once fewer upgrades are left than
// it offers (data/passives.js FILLERS). With nothing else left a level-up shows just these three,
// and the player may tick ALWAYS on one: the run's level-ups then take it unseen (Game.autoPick).
export const isFiller = (c) => FILLER_IDS.includes(c.type);

// A foe the hero's weapons may pick out, to aim, cast or chain at (nearestEnemy, nearestEnemies,
// enemiesOnScreen): alive, no prop (a barrel or a crate breaks only to what happens to hit it),
// and not still rising out of the ground. A monster that rises (def.rise) is passed over for the
// first 0.45 s of its 0.75 s rise, while spawnT is above 0.3; every other one fades in within a
// quarter second and is never passed over. A blow that lands where one rises still hurts it.
export const targetable = (e) => !e.dead && !e.prop && e.spawnT <= 0.3;

// Game.dropSpots: how far apart two drops lie, side by side or one above the other, and where the
// second goes from the first when neither way is open (a tile on, any way).
const DROP_GAP = 10;
const DROP_SIDES = [[DROP_GAP, 0], [0, DROP_GAP]];
const DROP_ON = [[16, 0], [-16, 0], [0, 16], [0, -16]];

// What each broken barrel, crate, urn or lantern leaves, by weight: at plain luck the weights
// are the odds, and every one holds something. The user's (16 October 2026): "one third of boxes
// have potions, one third has rage powerup, one tenth has a magnet, and the rest have gold" or
// the rarer finds. So a third a potion, a third a fury orb, a tenth a Scroll of Gathering, and
// of the 23% left gold the most (a fifth of all), now and then an elixir or a Frost Rune, and
// a Holy Relic half as often. The horde leaves none of these but the odd coin and fury orb
// (Game.killEnemy). Luck multiplies the rare treasures' weights, so better luck only ever makes
// each of them likelier.
export const PROP_LOOT = [
  { kind: 'potion', w: 1 / 3 },
  { kind: 'fury', w: 1 / 3 },
  { kind: 'magnet', w: 1 / 10, lucky: true },
  { kind: 'coins', w: 0.12 },
  { kind: 'goldpile', w: 0.08 },
  { kind: 'elixir', w: 1 / 75, lucky: true },
  { kind: 'frostrune', w: 1 / 75, lucky: true },
  { kind: 'relic', w: 1 / 150, lucky: true },
];

// A blow struck by hand on the hero's sprite: its attack from two frames before the blow frame,
// where the blade lands or the shot leaves (delay seconds in): the bow's release, else the
// middle frame. Null for a sprite with no attack.
export function strikeClip(spr) {
  if (!spr.attack || !spr.attack.length || !spr.attackFps) return null;
  const hit = spr.attackRelease ?? Math.floor(spr.attack.length / 2), from = Math.max(0, hit - 2);
  return { from, hit, delay: (hit - from) / spr.attackFps };
}

// What a hand-struck weapon is called on to do, for the crypt's banner (Game.enterCrypt).
const STRIKE_VERB = { bow: 'shoot', fireball: 'cast', meteor: 'cast', daggers: 'throw', summon: 'raise the dead' };

// Crypt names, picked by the crossroads; the night's minute picks the stone.
const CRYPT_KIND = ['Crypt', 'Barrow', 'Tomb', 'Ossuary', 'Sepulchre', 'Vault'];
const CRYPT_OF = ['the Hollow King', 'Saint Aldwyn', 'the Nameless', 'Mourn', 'the Weeping Widow', 'Old Bones', 'the Last Knight', 'the Ashen Monk', 'the Drowned', 'Vesper', 'the Pale Hunt', 'Black Ondra'];
// How many of a crypt's lords, in its banners.
const LORDS_WORD = ['No', 'One', 'Two', 'Three', 'Four'];

export class Game {
  constructor(o) {
    this.mode = o.mode;
    // Normal or Veteran (data/difficulty.js), as chosen; Veteran without.
    this.diff = diffFor(o.mode, o.diff);
    this.diffId = this.diff.id;
    this.settings = o.settings || {};
    this.seed = Math.floor(Math.random() * 2 ** 31);
    this.duration = this.mode === 's15' ? 15 * 60 : Infinity;
    this.rankedBest = o.rankedBest || 0; // personal best to beat in Ranked
    this.rankIdx = 0;
    this.pace = o.pace || 1; // how much faster than real time the run goes (GAME_SPEED; the bots keep 1)
    // The hero five minutes on the clock bring in, announced as the clock passes them.
    this.unlocks = o.unlocks || null;
    this.time = 0;
    this.floorTime = 0;
    this.frame = 0;
    this.state = 'play'; // play | levelup | chest | item | paused | dying | dawn | descend | travel | over
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
    // The filler the player chose to take at every level-up once nothing else is left (one of
    // FILLER_IDS, or null: ask). For this run only; the pause menu clears it.
    this.autoPick = null;
    this.phoenixLostAt = null; // the level a Phoenix Heart was spent at this run (Game.relicOffered)
    this.chestQueue = [];
    this.showMap = false;
    this.floor = 1;
    this.objective = '';
    this.floorName = '';
    this.relocT = 0;
    this.fade = 0;
    this.slowT = 0;
    this.hostileCount = 0;
    this.propCount = 0;
    // Gear worn into the run (kept between runs), and the crypts off the forest roads.
    this.gear = sanitizeGear(o.gear);
    this.itemQueue = [];
    this.itemsFound = 0; // pieces of gear dropped this run; the server keeps no more new ones than this
    this.crypts = [];
    this.cleared = new Set();
    this.lost = new Set(); // crypts the hero left before their last lord fell, or fainted in: shut to him
    this.inCrypt = null; // the crypt the hero is in; the night's clock stands still meanwhile
    this.cryptsOpen = o.crypts !== false; // the balance bots keep to the forest unless asked
    this.cryptTime = 0; // play time spent in crypts, where the night's clock stands still

    this.enemies = [];
    this.minions = [];
    this.projectiles = [];
    this.eshots = [];
    this.pickups = [];
    this.effects = [];
    this.decals = [];
    this.shrines = [];
    this.drawList = [];
    this.topList = []; // bosses and crypt lords, drawn over the rest
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

    if (this.mode === 'dungeon') this.enterFloor(this.floor);
    else {
      this.world = new Forest(this, this.seed);
      this.player.x = this.world.start.x;
      this.player.y = this.world.start.y;
      playMusic('forest');
    }
    for (const id of startWeapons(HEROES[o.hero])) this.addWeapon(id);
    this.syncCam();
    this.cam.x = this.player.x - this.cam.W / 2;
    this.cam.y = this.player.y - this.cam.H / 2;
    if (this.mode === 's15') this.banner('The Darkwood', 'Survive 15 minutes until dawn', '#8fb8ff', 3.5);
    else if (this.mode === 'ranked') {
      this.banner('The Endless Night', 'No dawn will come. Last as long as you can.', '#f6757a', 3.5);
      this.rankIdx = RANKS.findLastIndex(([min]) => this.time >= min * 60);
      this.bestBeaten = this.rankedBest > 0 && this.time > this.rankedBest;
    }
  }

  // ------------------------------------------------------------- clock --

  get phase() {
    if (this.mode === 'ranked') {
      // The 15-minute night's pace, then a climb that never stops.
      const m = this.time / 60;
      return m <= 15 ? m * 1.4 : 21 + (m - 15) * 0.9;
    }
    if (this.mode === 's15') return (this.time / 60) * 1.4;
    const f = FLOORS[this.floor - 1];
    return Math.min(f.cap, f.phase0 + (this.floorTime / 60) * f.rate);
  }

  // What animation runs by: the night's clock, which keeps going in crypts.
  get clock() {
    return this.time + this.cryptTime;
  }

  // Enemy damage stays gentle early and climbs once the night gets long.
  get dmgScale() {
    const ph = this.phase;
    return 1 + ph * 0.025 + Math.max(0, ph - 10) * 0.06 - Math.max(0, ph - 20) * 0.04 + Math.max(0, ph - 30) * 0.1;
  }

  // ------------------------------------------------------------ floors --

  enterFloor(n) {
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
    playMusic('dungeon-' + f.theme);
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

  // Everything a level-up card or a chest can still give, each with its weight: a weapon he
  // holds grows (3); a new weapon while a slot is free (1: the hero's own signature and those
  // shared by all, never another class's, weaponsFor); a relic he holds grows (twice its
  // weight); a new relic while a slot is free (about half its weight; the Phoenix Heart only
  // when relicOffered says so). Empty once the whole build is maxed, and it stays so: an
  // evolution adds nothing to choose. (Only a Phoenix Heart spent frees a slot again.)
  upgradePool() {
    const p = this.player;
    const pool = [];
    for (const w of p.weapons) {
      if (!w.maxed) pool.push({ type: 'weapon', id: w.id, level: w.level + 1, weight: 3 });
    }
    if (p.weapons.length < MAX_WEAPONS) {
      for (const id of weaponsFor(p.hero)) if (!this.ownsWeapon(id)) pool.push({ type: 'weapon', id, level: 1, isNew: true, weight: 1 });
    }
    for (const [id, rank] of p.passives) {
      if (rank < PASSIVES[id].max) pool.push({ type: 'passive', id, level: rank + 1, weight: (PASSIVES[id].weight || 1) * 2 });
    }
    if (p.passives.size < MAX_RELICS) {
      for (const id of PASSIVE_IDS) {
        if (!p.passives.has(id) && this.relicOffered(id)) pool.push({ type: 'passive', id, level: 1, isNew: true, weight: (PASSIVES[id].weight || 1) * 0.55 });
      }
    }
    return pool;
  }

  // Whether a relic he doesn't hold may be offered. The Phoenix Heart (afterSignature) only once
  // one of the hero's own signature weapons has evolved, and, if one was spent this run, not
  // until `again` levels after.
  relicOffered(id) {
    const r = PASSIVES[id], p = this.player;
    if (!r.afterSignature) return true;
    const evolved = p.weapons.some((w) => w.evolved && p.hero.unique.some((u) => WEAPONS[u].evo?.into === w.id));
    return evolved && (this.phoenixLostAt == null || p.level - this.phoenixLostAt >= (r.again || 0));
  }

  // A relic used up (the Phoenix Heart, by the revive it gave): gone, its slot free again, and
  // remembered so it is not offered again too soon (relicOffered).
  spendRelic(id) {
    const p = this.player;
    p.passives.delete(id);
    p.recompute();
    this.phoenixLostAt = p.level;
  }

  // Up to n different upgrades, drawn from the pool by weight.
  drawUpgrades(n) {
    const pool = this.upgradePool(), out = [];
    while (out.length < n && pool.length) {
      const c = weighted(pool, (x) => x.weight);
      out.push(c);
      pool.splice(pool.indexOf(c), 1);
    }
    return out;
  }

  // A level-up's cards: n drawn from the pool, the fillers after them while there is room. With
  // nothing left to draw, the three fillers alone (a four-card level-up shows three, no copy).
  levelChoices(n) {
    const out = this.drawUpgrades(n);
    for (const type of FILLER_IDS) if (out.length < n) out.push(this.filler(type));
    return out;
  }

  // A filler card: the Blessing; a heal of 35%; gold that grows with the night and with the
  // hero's greed, as every coin he picks up does.
  filler(type) {
    if (type === 'heal') return { type, value: 0.35 };
    if (type === 'gold') return { type, value: Math.max(1, Math.round(30 * (1 + this.phase / 10) * this.player.greed)) };
    return { type: 'bless' };
  }

  choiceCount() {
    return Math.random() < 0.06 + (this.player.luck - 1) * 0.6 ? 4 : 3;
  }

  // Gives what a card (or a chest's draw) holds. quiet: no sound or number of its own, for
  // whatever shows it instead (the chest screen, a burst of auto-picked levels).
  applyChoice(c, quiet = false) {
    const p = this.player;
    if (c.type === 'weapon') {
      const w = p.weapons.find((x) => x.id === c.id);
      if (w) w.levelUp();
      else if (!this.ownsWeapon(c.id) && p.weapons.length < MAX_WEAPONS) this.addWeapon(c.id);
    } else if (c.type === 'passive') {
      p.passives.set(c.id, (p.passives.get(c.id) || 0) + 1);
      p.recompute();
    } else if (c.type === 'gold') {
      this.gold += c.value;
      this.stats.gold += c.value;
      if (!quiet) sfx('coin');
    } else if (c.type === 'heal') {
      p.heal(p.maxHp * c.value, quiet);
    } else if (c.type === 'bless') {
      p.blessings++;
      p.recompute();
    }
  }

  // Level-ups that need no screen: once nothing but the fillers is left and the player ticked
  // ALWAYS on one (autoPick), every waiting level takes it at once, with no pause. Every place
  // that would open the level-up screen asks here first (the game screen, the screen itself for
  // the next waiting level, the bots, the developer panel). The levels' own sound and beam
  // played as they came (queueLevelUp); one line over the hero says what the lot gave
  // ("Blessing ×17", "+35% health", "+41 gold"). True when no level-up is left waiting.
  resolveAutoLevels() {
    const n = this.pendingLevels;
    if (n <= 0) return true;
    if (!this.autoReady()) return false;
    const p = this.player;
    let gold = 0, heal = 0;
    for (let i = 0; i < n; i++) {
      const c = this.filler(this.autoPick);
      this.applyChoice(c, true);
      if (c.type === 'gold') gold += c.value;
      else if (c.type === 'heal') heal += c.value;
    }
    this.pendingLevels = 0;
    const [text, style, sound] =
      this.autoPick === 'gold' ? [`+${gold} gold`, 'gold', 'coin']
      : this.autoPick === 'heal' ? [`+${Math.min(100, Math.round(heal * 100))}% health`, 'heal', 'heal']
      : [`Blessing ×${p.blessings}`, 'holy', 'pick'];
    this.numbers.text(p.x, p.y - 22, text, style);
    sfx(sound);
    return true;
  }

  // Whether nothing is left to offer but the fillers: the whole build maxed, as it stays unless a
  // Phoenix Heart is spent (its slot free again). A level-up then shows the three fillers alone,
  // each with its ALWAYS (LevelUpOverlay).
  fillersOnly() {
    return !this.upgradePool().length;
  }

  // Whether a level-up waiting is taken unseen now (resolveAutoLevels, the developer panel): the
  // player ticked ALWAYS on a filler (autoPick), nothing else is left to offer, and the level-up
  // screen isn't open (its cards come first).
  autoReady() {
    return this.state !== 'levelup' && FILLER_IDS.includes(this.autoPick) && this.fillersOnly();
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

  // Weapons a chest may evolve: at their top level, with their relic held, or with any relic that
  // evolves them all (the Phoenix Heart, which evolving doesn't use up).
  evolvable() {
    const p = this.player;
    const any = [...p.passives.keys()].some((id) => PASSIVES[id].evolvesAny);
    return p.weapons.filter((w) => !w.evolved && w.level >= MAX_WEAPON_LEVEL && w.def.evo && (any || p.passives.has(w.def.evo.with)));
  }

  // What a chest holds, given at once: an evolution if one is ready, then draws from the
  // level-up cards' own pool (a new weapon or relic too, while a slot is free), and gold. With
  // the pool empty, each draw is the run's auto-pick if the player chose one, else a Blessing of
  // Valor. The gold is the hero's at once too. The chest screen only shows them, one by one.
  rollChest(kind = 'elite') {
    const p = this.player;
    const items = [];
    const ev = this.evolvable();
    if (ev.length) {
      const w = ev[0];
      items.push({ type: 'evolve', w, id: w.def.evo.into });
      w.evolve();
    }
    let n = 1;
    const r = Math.random() / p.luck;
    if (kind === 'boss') n = r < 0.35 ? 5 : 3;
    else n = r < 0.04 ? 5 : r < 0.2 ? 3 : 1;
    if (items.length) n = Math.max(0, n - 2);
    for (let i = 0; i < n; i++) {
      const u = this.drawUpgrades(1)[0] || this.filler(this.autoPick || 'bless');
      items.push(u);
      // Apply as we go so later draws see the new levels.
      this.applyChoice(u, true);
      if (u.type === 'weapon') u.level = p.weapons.find((w) => w.id === u.id).level;
      else if (u.type === 'passive') u.level = p.passives.get(u.id);
      else if (u.type === 'bless') u.level = p.blessings;
    }
    const gold = Math.round(rand(15, 40) * (1 + this.phase / 10) * (kind === 'boss' ? 3 : 1));
    this.gold += gold;
    this.stats.gold += gold;
    return { items, gold };
  }

  openChest(opts = {}) {
    this.chestQueue.push(opts.kind || 'elite');
    this.stats.chests++;
  }

  // ----------------------------------------------------------- enemies --

  // Past 900 foes nothing more spawns, except a boss (o.always). Props standing don't count:
  // a dungeon floor's stand all floor long.
  spawnEnemy(type, x, y, o = {}) {
    if (this.enemies.length - this.propCount > 900 && !o.always) return null;
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
    const mul = this.mode === 'dungeon' ? [0.65, 1.3, 4][this.floor - 1] : monsterHp(this.phase, this.mode) * 0.8;
    const e = this.spawnEnemy(id, x, y, { hpMul: this.diff.hp * mul, instant: true, always: true, ...o });
    if (!e) return null;
    // The Crypt's guardian is the gentler first boss: cramped rooms make every blow count.
    this.bossPower = this.mode === 'dungeon' && this.floor === 1 ? 0.75 : 1;
    if (!o.sleeping) this.bossIntro(e);
    return e;
  }

  bossIntro(e) {
    e.sleeping = false;
    this.boss = e;
    this.stats.bossLog.push({ id: e.lord ? 'lord ' + e.type : e.type, t: Math.round(this.time), rt: this.clock, lvl: this.player.level, hp: Math.round(e.maxHp) });
    // A crypt's lord is a champion: its colour is its affix's.
    const color = e.lord ? (e.mod ? e.mod.color : '#b55088') : e.def.color;
    if (e.lord) this.banner(e.name, `Lord of the ${this.inCrypt ? this.inCrypt.name : 'crypt'}`, color, 3);
    else this.banner(e.def.name, e.def.title, color, 3);
    sfx('boss');
    this.shake(0.5);
    playMusic('boss');
    this.effects.push(new Ring(this, e.x, e.y, 6, 140, 0.9, color, false, 3));
  }

  summonRing(type, n, R, o = {}) {
    const p = this.player;
    // Summoned round the hero by a boss: they know where he is (Enemy.aware).
    const st = { hpMul: monsterHp(this.phase, this.mode) * this.diff.hp, aware: true, ...o };
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
    if (e.dormant) this.wakePack(e);
    // Hit, it knows where the hero is, in a crypt too (Enemy.aware).
    e.aware = true;
    const p = this.player;
    let d = dmg * p.might;
    if (p.buff('fury')) d *= 1.6;
    if (o.ult) d *= 1 + p.level * 0.04;
    let crit = false;
    // A tick of damage over time (Enemy.addDot) never crits.
    if (!o.noCrit) {
      crit = Math.random() < p.crit + (o.crit || 0);
      if (crit) d *= p.critMult + (o.critDmg || 0);
    }
    d *= rand(0.9, 1.1);
    if (e.mod && e.mod.id === 'stone') d *= 0.65;
    if (e.freezeT > 0 && o.shatter) d *= 1.5;
    d = Math.max(1, Math.round(d));
    e.hp -= d;
    if (!e.prop) e.flash = 0.09;
    else e.flash = 0.06;
    const kbRes = e.def.kbRes || 0;
    // Champions don't get pushed around: a blow stops them for a moment instead.
    if (e.elite) {
      if (o.kb) e.stagger();
    } else if (o.kb && kbRes < 1 && !e.prop) {
      const k = (o.kb * KNOCKBACK * (1 - kbRes)) / Math.sqrt(e.def.mass || 1);
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
    p.addFury(e.boss ? 35 : e.lord ? 25 : e.elite ? 8 : 0.75);
    if (o.w) {
      o.w.kills++;
      if (o.w.onKill) o.w.onKill(e);
    }
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
    } else if (e.lord) {
      this.lordDefeated(e);
    } else if (e.elite) {
      // A champion leaves its chest and gold. Potions, scrolls, relics and runes come only
      // from what the hero breaks (PROP_LOOT).
      this.addPickup('chest', e.x, e.y, 0, { kind: 'elite' });
      this.addPickup('goldpile', e.x + rand(-8, 8), e.y, Math.round(rand(10, 20)));
    } else {
      // The horde leaves its soul gems and, now and then, a coin or a fury orb: nothing else.
      const r = Math.random();
      if (r < 0.014 * luck) this.addPickup('coin', e.x, e.y, 1);
      else if (r < 0.016 * luck) this.addPickup('fury', e.x, e.y);
    }
    if (e.def.split && !o.noSplit) {
      for (let i = 0; i < e.def.splitN; i++) {
        const c = this.spawnEnemy(e.def.split, e.x + rand(-5, 5), e.y + rand(-5, 5), { hpMul: monsterHp(this.phase, this.mode) * this.diff.hp, instant: true, aware: true });
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
      if (e.boss) this.shake(0.8);
    }
  }

  breakProp(e, fr) {
    const ps = this.particles;
    const cols = e.type === 'urn' ? [PC.d, PC.O, PC.B] : e.type === 'lantern' ? [PC.b, PC.y, PC.N] : [PC.b, PC.B, PC.t, PC.m];
    ps.burst(e.x, e.y - 5, 6, 16, cols, 90, 1.1, 1, P.GROUND | P.FADE, { vz: 110, grav: 300 });
    sfx('wood', { pan: clamp((e.x - this.player.x) / 200, -1, 1) });
    this.addDecal('wood', e.x, e.y, 3);
    const luck = this.player.luck;
    const { kind } = weighted(PROP_LOOT, (d) => (d.lucky ? d.w * luck : d.w));
    if (kind === 'coins') {
      const n = Math.floor(rand(1, 4));
      for (let i = 0; i < n; i++) this.addPickup('coin', e.x, e.y, 1);
    } else if (kind === 'goldpile') this.addPickup('goldpile', e.x, e.y, Math.round(rand(5, 12)));
    else if (kind) this.addPickup(kind, e.x, e.y);
  }

  bossDefeated(e) {
    const p = this.player;
    this.stats.bosses++;
    const log = this.stats.bossLog.find((b) => b.id === e.type && b.kill === undefined);
    if (log) log.kill = Math.round(this.time - log.t);
    // A boss whose time came before the last one fell is still fighting: the bar and music go to it.
    const next = this.enemies.find((o) => o !== e && o.boss && !o.dead && !o.sleeping);
    if (this.boss === e) this.boss = next || null;
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
    if (next) return;
    if (this.mode !== 'dungeon' || this.floor < 3) playMusic(this.mode === 'dungeon' ? 'dungeon-' + FLOORS[this.floor - 1].theme : 'forest');
  }

  // A crypt's lord has fallen, and leaves its coins, its gold and, rolled lord by lord (LORD_DROPS
  // in shared/items.js), a piece of gear, a champion's chest or both. The last one's fall breaks
  // the wall open on a way out (Dungeon.lightWayOut).
  lordDefeated(e) {
    const p = this.player, c = this.inCrypt;
    const left = this.world.lordsLeft ? this.world.lordsLeft().length : 0;
    // The last one down: cleared now, however the hero leaves, so no more lords (and no more gear)
    // from going back in.
    if (c && !left) this.cleared.add(c.key);
    this.stats.bosses++;
    const log = this.stats.bossLog.find((b) => b.id === 'lord ' + e.type && b.kill === undefined);
    if (log) log.kill = Math.round(this.clock - log.rt);
    // Another lord still fighting: the bar and the music go to it.
    const next = this.enemies.find((o) => o !== e && o.lord && !o.dead && !o.sleeping);
    if (this.boss === e) this.boss = next || null;
    this.timeScale = 0.4;
    this.slowT = 0.8;
    this.whiteFlash = 0.4;
    sfx('bigexplode');
    explode(this, e.x, e.y - 8, 40, 0, null, 'fire');
    for (let i = 0; i < 10; i++) this.addPickup('coin', e.x, e.y, 2);
    this.addPickup('goldpile', e.x, e.y, left ? 20 : 30);
    const drop = lordDrop(Math.random());
    // Gear and a chest lie side by side, so neither hides the other, and neither in a wall.
    const [gearAt, chestAt] = drop.item && drop.chest ? this.dropSpots(e.x, e.y) : [e, e];
    let it = null;
    if (drop.item) {
      it = rollItem(mulberry32((Math.random() * 2 ** 32) >>> 0), { minute: c ? c.minute : minuteOf(this.phase), depth: c ? c.depth : 1, luck: p.luck });
      this.itemsFound++;
      this.addPickup('item', gearAt.x, gearAt.y, 0, { item: it });
    }
    if (drop.chest) this.addPickup('chest', chestAt.x, chestAt.y, 0, { kind: 'elite' });
    const R = it && RARITIES[it.rarity];
    const what = it ? `${R.name} ${SLOT_NAMES[it.slot].toLowerCase()}${drop.chest ? ' and a chest' : ''}` : 'A chest';
    const rest = left ? `. ${LORDS_WORD[left] || left} ${left === 1 ? 'lord remains' : 'lords remain'}` : '';
    this.banner(`${e.name} is slain!`, `${what} dropped${rest}`, it ? R.color : '#feae34', 3.2);
    if (!left && this.world.lightWayOut) this.world.lightWayOut();
    if (!next) playMusic('crypt');
  }

  descend() {
    if (this.state !== 'play') return;
    this.state = 'descend';
    this.descendT = 0;
    sfx('descend');
  }

  // ------------------------------------------------------------ crypts --

  // Every hero fights by hand below: in a crypt only his own weapon (the knight's sword, the
  // ranger's bow, ...) fights, and only when the player strikes (X or either Shift; a pad's
  // shoulder buttons; a second finger on a touch screen).
  get caveStrike() {
    return !!this.inCrypt;
  }

  // The hero's own weapon, or what it evolved into.
  mainWeapon() {
    const id = this.player.hero.weapon, into = WEAPONS[id].evo?.into;
    return this.player.weapons.find((w) => w.id === id || w.id === into) || null;
  }

  // A blow struck by the player (Player.update reads the keys), once the weapon is ready: at
  // the nearest foe in its reach (Weapon.reach; a sword on the move, only one ahead of him, as
  // he keeps facing the way he walks), else straight ahead, or for a shot the way he last
  // walked. The sprite plays its attack, and the blade lands or the shot leaves on its blow
  // frame (strikeClip).
  strike() {
    const p = this.player, w = this.mainWeapon();
    if (!w || w.cd > 0 || p.dead) return false;
    const melee = w.def.kind === 'sword';
    const t = this.nearestEnemy(p.x, p.y, w.reach, melee && p.moving ? (e) => (e.x - p.x) * p.face >= 0 : null);
    const ang = aimAt(p, t, !melee ? p.aim : p.face < 0 ? Math.PI : 0);
    p.strike(ang, this.clock);
    w.strike(ang, strikeClip(SPR[p.hero.sprite])?.delay ?? 0, t);
    return true;
  }

  // The hero walks into a crypt: the forest is set aside exactly as it was, and the night's clock stops.
  enterCrypt(d) {
    if (this.inCrypt || this.state !== 'play') return;
    this.travel(() => {
      const p = this.player;
      this.forestState = {
        world: this.world, enemies: this.enemies, pickups: this.pickups, decals: this.decals, shrines: this.shrines,
        crypts: this.crypts, boss: this.boss, objective: this.objective, door: d,
      };
      this.enemies = [];
      this.pickups = [];
      this.decals = [];
      this.shrines = [];
      this.crypts = [];
      this.boss = null;
      this.clearTransient();
      const [a, b] = d.key.split(',').map(Number);
      const minute = minuteOf(this.phase);
      const name = `${CRYPT_KIND[Math.floor(hash2(a, b, 41) * CRYPT_KIND.length)]} of ${CRYPT_OF[Math.floor(hash2(a, b, 42) * CRYPT_OF.length)]}`;
      this.inCrypt = { key: d.key, depth: d.depth, minute, name, hp: p.hp };
      const theme = minute < 6 ? 'crypt' : minute < 11 ? 'catacombs' : 'inferno';
      new Dungeon(this, 1, (this.seed ^ Math.floor(hash2(a, b, 43) * 2 ** 31)) >>> 0, { name, theme, lords: cryptLords(minute, d.depth) });
      p.x = this.world.start.x;
      p.y = this.world.start.y;
      this.gatherMinions();
      this.snapCam();
      this.objective = '';
      this.banner(name, `Here the night stands still. ${LORDS_WORD[this.world.lordCount] || this.world.lordCount} lords sleep below`, '#b55088', 3.2);
      // The other weapons wait outside: their blades and auras go out until he is back.
      const main = this.mainWeapon();
      for (const w of p.weapons) {
        if (w === main || !w.fx) continue;
        w.fx.dead = true;
        w.fx = null;
        w.cd = Math.min(w.cd, 0.35);
      }
      const keys = input.device === 'pad' ? 'RB' : input.device === 'touch' ? 'Tap a second finger' : 'X or Shift';
      this.banner(`Your ${main ? main.def.name : 'weapon'} alone`, `${keys} to ${STRIKE_VERB[main?.def.kind] || 'strike'}`, '#feae34', 4);
      playMusic('crypt');
    });
  }

  // Back up to the forest, by the stairs he came down (whenever he likes) or the hole the last
  // lord's fall broke, out by the crypt's door. It is sealed behind him for the rest of the run:
  // cleared once its last lord has fallen, else shut with its lords below (lost).
  leaveCrypt() {
    if (!this.inCrypt || this.state !== 'play') return;
    this.sweepCrypt();
    this.travel(() => {
      const c = this.inCrypt, door = this.backToForest(), done = this.cleared.has(c.key);
      if (!done) this.lost.add(c.key);
      door.sealed = true;
      this.banner('The crypt is sealed', done ? 'The night goes on' : 'Its lords sleep on below', done ? '#63c74d' : '#8b9bb4', 2.4);
    });
  }

  // Felled in a crypt, the hero only faints (Player.hurt): the dark takes him, and he wakes by
  // its door in the forest at half his health (or what he went in with, if less: a crypt is no
  // place to heal), the crypt shut to him for good. Whatever lay about in it is lost.
  faint() {
    if (!this.inCrypt || this.state !== 'play') return;
    this.state = 'faint';
    this.faintT = 0;
    this.timeScale = 0.3;
    const p = this.player;
    this.particles.burst(p.x, p.y - 8, 6, 20, [PC.w, PC.G], 40, 2, 2, P.GLOW | P.FADE, { vz: 50, drag: 1 });
    this.shake(0.8);
    sfx('descend');
  }

  wake() {
    const c = this.inCrypt, door = this.backToForest(), p = this.player;
    this.lost.add(c.key);
    door.sealed = true;
    p.hp = Math.max(1, Math.min(Math.round(c.hp), Math.round(p.maxHp * 0.5)));
    p.invuln = 3;
    this.timeScale = 1;
    this.banner('You wake by the crypt', 'Its door will not open again', '#8b9bb4', 3.2);
  }

  // The forest as the hero left it, him by the crypt's door; returns the door.
  backToForest() {
    const f = this.forestState, p = this.player;
    for (const e of this.enemies) this.enemyPool.put(e);
    this.clearTransient();
    this.world = f.world;
    this.enemies = f.enemies;
    this.pickups = f.pickups;
    this.decals = f.decals;
    this.shrines = f.shrines;
    this.crypts = f.crypts;
    this.boss = f.boss;
    this.objective = f.objective;
    this.forestState = null;
    this.inCrypt = null;
    p.x = f.door.x;
    p.y = f.door.y + 12;
    p.invuln = Math.max(p.invuln, 1.5);
    this.gatherMinions();
    this.snapCam();
    playMusic(this.boss && !this.boss.dead ? 'boss' : 'forest');
    return f.door;
  }

  // Fade out, swap worlds, fade back in.
  travel(go) {
    this.state = 'travel';
    this.travelT = 0;
    this.travelGo = go;
    sfx('descend');
  }

  // What lies about a crypt when the hero leaves it comes along: gems, gold, gear, chests.
  sweepCrypt() {
    const p = this.player;
    for (const pk of this.pickups) {
      if (pk.dead) continue;
      if (pk.kind === 'gem') p.addXp(pk.value);
      else if (pk.kind === 'coin' || pk.kind === 'goldpile') {
        const v = Math.max(1, Math.round(pk.value * p.greed));
        this.gold += v;
        this.stats.gold += v;
      } else if (pk.kind === 'item') this.itemQueue.push(pk.opts.item);
      else if (pk.kind === 'chest') this.openChest(pk.opts);
      pk.dead = true;
    }
  }

  clearTransient() {
    for (const pr of this.projectiles) releaseProjectile(pr);
    this.projectiles.length = 0;
    this.eshots.length = 0;
    this.effects = this.effects.filter((e) => e.persistent);
    this.particles.clear();
  }

  gatherMinions() {
    const p = this.player;
    for (const m of this.minions) {
      m.x = p.x + rand(-12, 12);
      m.y = p.y + rand(-10, 10);
      m.forget(); // the foes it was on are in the world he left
    }
  }

  snapCam() {
    const c = this.cam, p = this.player;
    c.x = p.x - c.W / 2;
    c.y = p.y - 8 - c.H / 2;
  }

  // A crypt's pack wakes together.
  wakePack(e) {
    for (const o of this.enemies) {
      if (o.dormant && o.pack === e.pack) {
        o.dormant = false;
        o.aware = true;
      }
    }
  }

  // Gear from the pickup screen: wear it (selling what it replaces), or sell it, or sell what is worn.
  wearItem(it) {
    const old = this.gear[it.slot];
    if (old) this.earnGold(itemPrice(old));
    this.gear[it.slot] = it;
    this.player.gearChanged();
  }

  sellItem(it) {
    this.earnGold(itemPrice(it));
  }

  sellWorn(slot) {
    const it = this.gear[slot];
    if (!it) return;
    delete this.gear[slot];
    this.earnGold(itemPrice(it));
    this.player.gearChanged();
  }

  earnGold(v) {
    this.gold += v;
    this.stats.gold += v;
    sfx('coin');
  }

  escape(e) {
    e.dead = true;
    this.particles.burst(e.x, e.y - 6, 4, 20, [PC.Y, PC.y, PC.w], 60, 0.8, 1, P.GLOW | P.FADE, { vz: 60 });
    this.banner('The thief escaped...', '', '#8b9bb4', 1.6);
    sfx('teleport');
  }

  // ----------------------------------------------------------- pickups --

  // Two spots side by side for two things dropped at (x, y), both on open floor: DROP_GAP px to
  // either side of it, else above and below it (against a wall), else the open floor nearest it
  // and a spot a tile on from there (in a corner). Anywhere does in the forest, which has no walls.
  dropSpots(x, y) {
    const w = this.world, free = (a, b) => !w.free || w.free(a, b);
    for (const [dx, dy] of DROP_SIDES) {
      if (free(x + dx, y + dy) && free(x - dx, y - dy)) return [{ x: x + dx, y: y + dy }, { x: x - dx, y: y - dy }];
    }
    const a = (w.freeSpot && w.freeSpot(x, y)) || { x, y };
    for (const [dx, dy] of DROP_ON) if (free(a.x + dx, a.y + dy)) return [a, { x: a.x + dx, y: a.y + dy }];
    return [a, a];
  }

  addPickup(kind, x, y, value = 1, opts = {}) {
    // Never inside a wall: whatever falls there starts from the nearest open floor.
    const w = this.world;
    if (w.free && !w.free(x, y)) {
      const s = w.freeSpot(x, y);
      if (s) ({ x, y } = s);
    }
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

  // Up to n foes within maxR of (x, y), nearest first. Like the two below, only targetable ones.
  nearestEnemies(x, y, n, maxR) {
    const cands = this.grid.query(x, y, maxR, tmp);
    const list = [];
    for (const e of cands) {
      if (!targetable(e)) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d <= maxR * maxR) list.push([d, e]);
    }
    list.sort((a, b) => a[0] - b[0]);
    return list.slice(0, n).map((v) => v[1]);
  }

  // The nearest foe within maxR of (x, y) that filter (if any) takes, or null.
  nearestEnemy(x, y, maxR, filter) {
    const cands = this.grid.query(x, y, maxR, tmp);
    let best = null, bd = maxR * maxR;
    for (const e of cands) {
      if (!targetable(e) || (filter && !filter(e))) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  // Every foe on screen.
  enemiesOnScreen() {
    const c = this.cam, out = [];
    for (const e of this.enemies) {
      if (!targetable(e)) continue;
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
      if (e.dead || e.prop || e.boss || e.elite) continue;
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
    // Bosses, crypt lords and champions only take a heavy blow: a relic is no way past them. The
    // blow shrinks with their health (difficulty.js health), so it takes the same share of them on
    // Normal as on Veteran: a flat 200 would fell a Normal crypt lord (180) outright.
    for (const e of this.enemiesOnScreen()) {
      if (e.boss || e.elite) this.hitEnemy(e, 200 * this.diff.health, { type: 'holy' });
      else this.killEnemy(e, { noSplit: true });
    }
  }

  freezeAll(t) {
    sfx('freeze');
    this.banner('Frost Rune', 'Time itself freezes', '#2ce8f5', 2);
    this.whiteFlash = 0.3;
    for (const e of this.enemies) {
      if (e.prop || e.dead) continue;
      // The strong (bosses, crypt lords, champions) are slowed rather than frozen.
      if (e.boss || e.elite) {
        e.slowT = t;
        e.slowF = 0.6;
      } else e.freezeT = t;
    }
  }

  // The hero rises (Player.hurt): by a relic spent for it (the Phoenix Heart), or a Second Wind.
  revive(relic = null) {
    const p = this.player;
    this.whiteFlash = 1;
    sfx('relic');
    if (relic) {
      this.banner(`${PASSIVES[relic].name}!`, 'You rise from the ashes', '#f77622', 2.5);
      this.numbers.text(p.x, p.y - 22, `${PASSIVES[relic].name} spent`, 'fire');
    } else this.banner('Second Wind!', 'You rise again', '#feae34', 2.5);
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
        if (spot) this.minions.push(new Minion(this, spot.x, spot.y, { dmg: 24, dur: 11 * p.duration * p.summonDur, speed: 1.3, knight: true, burst: true, ult: true }));
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
      const list = this.enemiesOnScreen();
      const e = list.length ? pick(list) : null;
      const p = this.player;
      const x = e ? e.x : p.x + rand(-150, 150), y = e ? e.y : p.y + rand(-90, 90);
      this.effects.push(new Meteor(this, null, x, y, 34, 55, 0, { fall: 0.45, ult: true }));
    }
  }

  // Ranked: announce each new rank, and the moment the personal best falls.
  rankedMilestones() {
    const next = RANKS[this.rankIdx + 1];
    if (next && this.time >= next[0] * 60) {
      this.rankIdx++;
      this.banner(`Rank: ${next[1]}`, `${next[0]} minutes survived`, '#fee761', 2.6);
      sfx('levelup');
    }
    if (!this.bestBeaten && this.rankedBest > 0 && this.time > this.rankedBest) {
      this.bestBeaten = true;
      this.banner('New personal best!', 'Every second now is a record', '#63c74d', 3);
      sfx('bell');
    }
  }

  // Five minutes on the clock bring in the next hero; the profile takes them in when the run ends.
  heroMilestone() {
    if (!this.unlocks || this.time < HERO_UNLOCK_TIME) return;
    const h = HEROES[this.unlocks];
    this.unlocks = null;
    this.banner(`${h.title} unlocked!`, `${h.name} can join your next run`, h.color, 3.5);
    sfx('bell');
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
      gear: this.gear,
      realTime: Math.floor(this.clock),
      crypts: this.cleared.size,
      found: this.itemsFound,
    };
  }

  // ------------------------------------------------------------ update --

  syncCam() {
    const c = this.cam;
    // Zoomed out from the HUD scale, but never below one screen pixel per art pixel.
    c.S = Math.max(1, view.S * view.zoom);
    c.W = (view.W * view.S) / c.S;
    c.H = (view.H * view.S) / c.S;
    c.pxW = view.pxW;
    c.pxH = view.pxH;
  }

  update(rdt) {
    this.syncCam();
    if (this.state === 'paused' || this.state === 'levelup' || this.state === 'chest' || this.state === 'item' || this.state === 'over') return;
    if (this.slowT > 0) {
      this.slowT -= rdt;
      if (this.slowT <= 0 && this.state !== 'dying' && this.state !== 'faint') this.timeScale = 1;
    }
    const dt = Math.min(rdt, 1 / 30) * this.timeScale * this.pace;
    this.frame++;
    const p = this.player;

    if (this.state === 'play') {
      if (this.inCrypt) this.cryptTime += dt;
      else this.time += dt;
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
    } else if (this.state === 'faint') {
      // The world slows and goes dark; then the fade back in, outside (as a journey's).
      this.faintT += rdt;
      this.fade = Math.min(1, this.faintT / 1.2);
      if (this.faintT >= 1.4) {
        this.wake();
        this.state = 'travel';
        this.travelT = 0.6;
        this.travelGo = null;
      }
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
    } else if (this.state === 'travel') {
      this.travelT += rdt;
      this.fade = Math.min(1, this.travelT / 0.6);
      if (this.travelT >= 0.6 && this.travelGo) {
        const go = this.travelGo;
        this.travelGo = null;
        go();
      }
      if (this.travelT >= 0.9) {
        this.fade = Math.max(0, 1 - (this.travelT - 0.9) / 0.6);
        if (this.travelT >= 1.5) {
          this.state = 'play';
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
      if (this.caveStrike) this.mainWeapon()?.update(dt, true);
      else for (const w of p.weapons) w.update(dt);
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
    // Crypt doors: walk up the steps to go in.
    for (const d of this.crypts) {
      d.t += dt;
      if (!d.sealed && this.cryptsOpen && this.state === 'play' && p.vy < 0 && Math.abs(p.x - d.x) < 7 && p.y < d.y + 1 && p.y > d.y - 6) this.enterCrypt(d);
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
    if (this.state === 'play' && this.mode === 'ranked') this.rankedMilestones();
    if (this.state === 'play') this.heroMilestone();
  }

  // Foes pass through one another and through props (barrels, crates...), and in the forest
  // through the trees, so nothing holds a horde up; the only thing they can't do is stand inside
  // the hero. Dungeon walls alone stop them (Dungeon.collide). The user's rule: "They cannot bump
  // into anything, apart from, obviously, in the dungeon where there is no space."
  separate() {
    const E = this.enemies, p = this.player;
    for (let i = 0; i < E.length; i++) {
      const a = E[i];
      if (a.dead || a.prop) continue;
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
      if (e.dead || e.boss || e.type === 'thief' || e.sleeping || e.dormant) continue;
      if (!w.tooFar(e, this.cam)) continue;
      if (e.prop) {
        // The forest's are put down about the hero as he goes, and fade behind him; a dungeon's
        // stand in the rooms they furnish until they are broken.
        if (w instanceof Forest) e.dead = true;
        continue;
      }
      const pt = w.spawnPoint(this);
      if (pt) {
        e.x = pt.x;
        e.y = pt.y;
        e.lockT = 0;
      }
    }
    // The forest never ends: what the hero walked away from fades, or the list would only grow.
    // Gems, chests and gear stay (gems are folded together once there are many: dropGem).
    if (w instanceof Forest) {
      const p = this.player;
      for (const pk of this.pickups) {
        if (pk.dead || pk.kind === 'gem' || pk.kind === 'chest' || pk.kind === 'item') continue;
        if (Math.abs(pk.x - p.x) > PICKUP_FAR || Math.abs(pk.y - p.y) > PICKUP_FAR) pk.dead = true;
      }
    }
  }

  // -------------------------------------------------------------- draw --

  draw(ctx) {
    this.syncCam();
    const c = this.cam;
    const S = c.S;
    // Screen shake offsets the camera for this frame only. The camera sits on
    // whole screen pixels, so a fractional scale keeps a steady pixel pattern.
    const sh = this.trauma * this.trauma;
    const bx = c.x, by = c.y;
    c.x = Math.round((bx + (Math.random() - 0.5) * 9 * sh) * S) / S;
    c.y = Math.round((by + (Math.random() - 0.5) * 9 * sh) * S) / S;

    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0d0b14';
    ctx.fillRect(0, 0, c.pxW, c.pxH);
    this.world.drawGround(ctx, c, this.clock);

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
    if (this.world.drawGroundProps) this.world.drawGroundProps(ctx, c, this.clock);

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

    // Y-sorted actors and props. Bosses and crypt lords aren't among them: they stand over it all.
    const list = this.drawList, tops = this.topList;
    list.length = 0;
    tops.length = 0;
    this.world.collectProps(c, list);
    for (const s of this.shrines) list.push(s);
    for (const d of this.crypts) if (onScreen(c, d.x, d.y, 60)) list.push(d);
    for (const e of this.enemies) if (!e.dead && onScreen(c, e.x, e.y, 60)) (e.boss || e.lord ? tops : list).push(e);
    for (const m of this.minions) if (onScreen(c, m.x, m.y, 60)) list.push(m);
    list.push(p);
    list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o === p) this.drawPlayer(ctx, c);
      else if (o.shrine) this.drawShrine(ctx, c, o);
      else if (o.crypt) this.drawCrypt(ctx, c, o);
      else if (o.def || o.minion) o.draw(ctx, c);
      else this.world.drawProp(ctx, c, o, this.clock);
    }
    // Bosses and crypt lords over the trees, the horde and the hero, each in a light of its own
    // so the night can't hide it either.
    tops.sort((a, b) => a.y - b.y);
    for (const e of tops) {
      e.draw(ctx, c);
      this.light(e.x, e.y - e.h * 0.5, Math.max(56, e.h * 1.6), 'white', 0.85);
    }

    for (const pr of this.projectiles) pr.draw(ctx, c);
    for (const e of this.effects) if (e.draw) e.draw(ctx, c);
    this.particles.draw(ctx, c, false);

    // Lighting.
    this.world.addLights(this);
    for (const d of this.crypts) if (!d.sealed && onScreen(c, d.x, d.y, 80)) this.light(d.x, d.y - 8, 44 + 4 * Math.sin(d.t * 2), 'purple', 0.8);
    const flick = 0.94 + 0.06 * Math.sin(this.clock * 9) * Math.sin(this.clock * 5.3);
    this.light(p.x, p.y - 6, (this.mode === 'dungeon' ? 130 : 125) * flick, 'warm', 1);
    this.light(p.x, p.y - 8, 46, 'white', 0.7);
    this.lighting.render(ctx, c, this.world.ambient());

    // Unlit / additive layers.
    for (const o of list) {
      if (o.def || o.minion) o.drawEmissive(ctx, c);
      else if (o === p) this.drawPlayerEmissive(ctx, c);
      else if (o.crypt) this.drawCryptEmissive(ctx, o);
      else if (!o.shrine && this.world.drawPropEmissive) this.world.drawPropEmissive(ctx, o);
    }
    for (const e of tops) e.drawEmissive(ctx, c);
    for (const pk of this.pickups) pk.drawEmissive(ctx);
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.shrines) this.drawShrineGlow(ctx, c, s);
    for (const d of this.crypts) if (!d.sealed && onScreen(c, d.x, d.y, 60)) this.drawCryptGlow(ctx, c, d);
    for (const pk of this.pickups) pk.drawGlow(ctx, c);
    for (const e of this.effects) if (e.drawGlow) e.drawGlow(ctx, c);
    for (const pr of this.projectiles) pr.drawGlow(ctx, c);
    for (const s of this.eshots) s.drawGlow(ctx, c);
    for (const e of this.enemies) if (!e.dead && (e.elite || e.boss) && onScreen(c, e.x, e.y, 60)) e.drawGlow(ctx, c);
    for (const m of this.minions) if (onScreen(c, m.x, m.y, 40)) m.drawGlow(ctx, c);
    this.particles.draw(ctx, c, true);
    ctx.globalCompositeOperation = 'source-over';

    if (this.world.drawOverlay) this.world.drawOverlay(ctx, c, this.clock);
    // The foes' shots over everything, unlit: none can be lost behind a tree, in the horde or
    // in the dark.
    for (const s of this.eshots) s.draw(ctx, c);
    this.numbers.draw(ctx, c);

    // Screen-space post effects.
    ctx.drawImage(vignette(256, 144, '8,6,16', 0.7), 0, 0, c.pxW, c.pxH);
    const low = p.hp / p.maxHp;
    if (this.hurtFlash > 0 || (low < 0.3 && !p.dead)) {
      const a = Math.max(this.hurtFlash * 0.7, low < 0.3 ? (0.25 + 0.15 * Math.sin(this.clock * 6)) * (1 - low / 0.3) : 0);
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
    // Walk cycles step a little faster so planted feet slide less against the ground.
    const step = Math.floor(p.anim * (spr.walk ? 1.4 : 1) * spr.motionRate);
    // Walk/idle remains the base. In the forest the ranger draws before the bow is ready and
    // releases with its real projectile; in a crypt every hero plays his attack for a blow
    // struck by hand, when it is struck the way he faces (on the move a shot may fly behind
    // him), the ranger his shot on the move too.
    let fr = moving ? walkFrame(spr, step) : idleFrame(spr, Math.floor(p.anim * spr.idleRate));
    const clip = this.caveStrike && p.strikeAt !== null ? strikeClip(spr) : null;
    if (clip && faceAlong(p.face, Math.cos(p.strikeAng), Math.sin(p.strikeAng)) === p.face) {
      const k = clip.from + Math.floor((this.clock - p.strikeAt) * spr.attackFps + 1e-6);
      if (k < spr.attack.length) fr = spr.frames[moving && spr.attackWalk ? spr.attackWalk[k][step % spr.walk.length] : spr.attack[k]];
    }
    const bowPose = this.caveStrike ? null : rangerPose(this, spr, step);
    if (bowPose) fr = bowPose.frame;
    const flip = bowPose ? bowPose.flip : p.face < 0;
    let img = p.flash > 0 ? fr.white(flip) : fr.get(flip);
    // Walk cycles carry their own body bob; two-frame sprites hop on alternate steps.
    const bob = spr.selfBob ? 0 : moving ? (spr.walk ? 0 : -(step % 2)) : Math.sin(p.anim * 2) > 0.6 ? -1 : 0;
    const w = img.width * S, h = img.height * S;
    const X = Math.round((p.x - c.x) * S - w / 2), Y = Math.round((p.y - c.y - spr.anchorY + bob) * S);
    let alpha = 1;
    if (p.invuln > 0 && !(p.ult && p.ult.type === 'shadowdance') && Math.floor(p.invuln * 18) % 2 === 0) alpha = 0.45;
    if (p.ult && p.ult.type === 'shadowdance') alpha = 0.35 + 0.15 * Math.sin(this.clock * 20);
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

  drawCrypt(ctx, c, d) {
    const S = c.S, fr = d.spr.frames[d.sealed ? 1 : 0], img = fr.c;
    const w = img.width * S, h = img.height * S;
    const X = Math.round((d.x - c.x) * S - w / 2), Y = Math.round((d.y - c.y) * S - h + S);
    ctx.drawImage(img, X, Y, w, h);
    d._rect = [X, Y, w, h, fr];
  }

  drawCryptEmissive(ctx, d) {
    if (!d._rect || d.sealed) return;
    const [X, Y, w, h, fr] = d._rect;
    if (fr.em) ctx.drawImage(fr.em, X, Y, w, h);
  }

  drawCryptGlow(ctx, c, d) {
    const S = c.S;
    const sx = (d.x - c.x) * S, sy = (d.y - 7 - c.y) * S;
    const sz = (24 + 3 * Math.sin(d.t * 2)) * S;
    ctx.globalAlpha = 0.6;
    ctx.drawImage(glow('#8f5bb0'), sx - sz / 2, sy - sz / 2, sz, sz);
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
