// Enemies: AI, status effects and drawing. Breakable props and bosses share
// this class; boss behaviour lives in bosses.js.

import { ENEMIES } from '../data/enemies.js';
import { WEAPON_SPRITES } from '../data/weapons.js';
import { HEROES } from '../data/heroes.js';
import { UPGRADES } from '../shared/profile.js';
import { BASE_SPEED } from './player.js';
import { SPR, TINTS, nightBuf, NIGHT_PAD, canvasFromBuf } from '../engine/sprites.js';
import { hexPack, makeBuf, pack } from '../engine/pixels.js';
import { OUTLINE } from '../art/palette.js';
import { shade, hexOfPacked } from '../art/tune.js';
import { sfx } from '../engine/audio.js';
import { rand, TAU, clamp, pick, makeCanvas } from '../engine/util.js';
import { shadowSprite, glow } from './fxsprites.js';
import { PC, P } from './particles.js';
import { EnemyShot } from './projectiles.js';
import { BOSS_AI } from './bosses.js';
import { faceAlong, faceAttack } from './facing.js';
import { shotName, bossOf } from './names.js';
import { spriteExtent } from './hitbox.js';

// Hit cooldown channels a foe keeps (hitT): one for each weapon the hero holds (Game.freeSrc).
const N_SRC = 24;
// How much of its speed a monster that hasn't seen the hero strolls at (Dungeon.wander).
export const STROLL = 0.5;
// How much of its speed a monster on a Dungeon Run floor keeps while its feet are in a wall, a
// pillar or lava, which it goes straight through there (Dungeon.throughWalls): "slightly slower".
export const WALL_PACE = 0.8;
// Champions aren't pushed by blows: a blow stops one for HOLD seconds instead, and it
// can't be stopped again until HOLD_EVERY seconds after that, so hits can't pin it.
export const HOLD = 0.2, HOLD_EVERY = 0.6;
// A Gilded Thief (the owner's, 21 October 2026): it runs from the hero at THIEF.run of his own
// base pace (his class's, at the run's walking speed, before the Armory or a relic quickens him)
// once he comes within THIEF.near of it, and keeps running until it is THIEF.safe away; then it
// wanders, a new random way every THIEF.turn seconds, at THIEF.walk of that pace, until he comes
// near again. It escapes when its 20 seconds are up.
export const THIEF = { run: 0.8, walk: 0.35, near: 140, safe: 220, turn: [1.5, 3] };
// The hero's base pace a thief measures itself by (px/s).
export const heroPace = (g) => BASE_SPEED * (g.player.hero.stats.speed || 1) * g.move;
// How often a confused foe's touch hurts the monsters about it, in seconds.
export const CONFUSE_TOUCH = 0.5;
// The sparks a foe gives off while it burns or sickens (Enemy.addDot).
const DOT_SPARKS = { fire: [PC.o, PC.y], poison: [PC.l, PC.L], bleed: [PC.r, PC.R] };
// What charger() and caster() return: a heading and a share of the monster's own speed. The one
// triple is reused by the next call, so it is read at once (Enemy.update), never kept.
const AIM = [0, 0, 0];
function aim(x, y, k) {
  AIM[0] = x;
  AIM[1] = y;
  AIM[2] = k;
  return AIM;
}
// The spot a fleeing thief makes for this frame (Enemy.update), reused likewise.
const AWAY = { x: 0, y: 0 };
let nextId = 1;

// The night edge: the owner's "monsters more visible against the night". Out in the dark the
// lighting darkens a monster to the ambient light, a dark one down to the ground's own shade.
// So after the lighting each is drawn again unlit over its lit self (drawNightEdge), at alpha
// nightFloor(ambient): enough that it shows no darker than `floor` of its own colours (lit, it
// is at the ambient's brightness M; with f of the rest unlit, M + f·(1 − M) = floor), none once
// the light is that bright (dawn). With it, 1 px outside its ink outline, a ring of `ring` at
// `ringA` of that alpha, a light edge parting it from the ground. Within `near` px of the hero,
// whose own light shows it, it fades out to nothing at him. Bosses and crypt lords have a light
// and rim of their own and get none, nor do boxes; champions keep their gold outline with no
// ring round it; the Necromancer's allies are ringed in `allyRing`.
// The owner's (20 October 2026) "Make the monsters brighter because they are not visible": the
// layer is drawn in their own colours lifted (nightLift: `lift` and `gamma` as the sprite tuner's
// sliders, art/tune.js shade), the darkest the most, their hues kept and their ink outline left
// dark, and the floor is higher (0.75 before, so a dark monster sank to three quarters of colours
// already dark); 0.95 still leaves dawn's light alone. The ring stays as faint as it was: not a
// brighter edge, a brighter monster. With the layer drawn stronger it is a smaller share of it
// (`ringA` 0.3, 0.6 before), so no more of it shows than did, at dusk a hair more.
// Then (22 October 2026) "brighter, but like with contrast brighter, not just whiter, but more like
// shiny and easy to see and stand out": their colours saturated (`sat`) and pulled apart (`contrast`),
// on top of the lift (gamma 30 before), so they glow in their own hues instead of paling.
// Then (27 October 2026) "they have to have a ever so slight glow so that the user can easily spot
// them": the ring is a little stronger (`ringA` 0.4, 0.3 before) and a fainter pixel goes round it
// (`haloA`), corners and all, so the edge fades out as a soft glow; and by night the vignette
// darkens the scene under this layer, not over it (Game.draw), so a monster near the edge of the
// screen is no darker for it than one by the hero.
// The horde's speeds come in four classes (the owner's, 20 October 2026: "let us have a few
// classes of speeds ... mice and bats should probably be equally fast and as fast as basic no
// upgrade knight on normal. Then on nightmare they should be a little faster than basic knights
// with all speed upgrades ... the fastest animal should be like 5% faster"). SWIFT is the Knight's
// own pace with no upgrades (70 x 1.067 = 74.7 px/s); the others a tenth less each. Normal and
// Veteran alike: these are the speeds walked, not multiplied by a difficulty's speed. On a
// Nightmare every class goes NIGHTMARE_PACE faster, the swift ones 5% past a Knight with every rank
// of the Armory's Swiftness (90.2 px/s), the rest as far behind them as ever. Bosses, the crypts'
// lords, the Gilded Thief (who must stay a fifth slower than every hero) and props keep their own;
// one that walks a share slower than its class (def.slower: the Cultist's tenth) stays so.
const KNIGHT_PACE = BASE_SPEED * HEROES.knight.stats.speed;
const SWIFTNESS = UPGRADES.find((u) => u.id === 'swiftness');
export const PACE_CLASS = { swift: 1, quick: 0.9, steady: 0.8, slow: 0.7 };
export const PACE_OF = {
  bat: 'swift', rat: 'swift', imp: 'swift', hellhound: 'swift',
  wolf: 'quick', spider: 'quick', goblin: 'quick', slimelet: 'quick',
  skeleton: 'steady', ghost: 'steady', deathknight: 'steady', slime: 'steady', skeletonarcher: 'steady',
  zombie: 'slow', ogre: 'slow', orc: 'slow', cultist: 'slow',
};
export const NIGHTMARE_PACE = 1.05 * (1 + 0.05 * SWIFTNESS.max);
const isPaced = (def, o = {}) => !(def.boss || def.prop || o.lord || def.ai === 'flee' || def.ai === 'static' || !def.spd);
// A horde monster's speed in px/s on Normal and Veteran (its class's), or its own for the rest.
export function hordePace(type, o = {}) {
  const def = ENEMIES[type];
  if (!isPaced(def, o) || !PACE_OF[type]) return def.spd;
  return KNIGHT_PACE * PACE_CLASS[PACE_OF[type]] * (1 - (def.slower || 0));
}

export const NIGHT_EDGE = { floor: 0.95, lift: 90, gamma: 20, sat: 40, contrast: 25, ring: '#8b9bb4', allyRing: '#63c74d', ringA: 0.4, haloA: 0.16, near: 60 };

// A flyer is drawn up off the ground, bobbing a little (draw, body).
const HOVER = { up: 6, bob: 2 };

// A sealed guardian (dungeon.js) is iced over, the owner's (27 October 2026) "let it look like its
// being defrosted": the frozen tint (TINTS.frozen, a frozen foe's) over it at `most` while its seal
// holds whole, thinning to `least` as the seal breaks (thaw), when the last of it bursts off
// (Dungeon.thawBurst). Its outline burns in `rim` for as much as the ice is on it, its own colour
// coming back as it thaws, and a cold sheen at `sheen` of the ice glows round it; its ward glows at
// `ward`, fading to `wardLeast` of that as the seal breaks.
export const FROST = { most: 1, least: 0.3, rim: '#9ee7ff', sheen: 0.2, ward: 0.5, wardLeast: 0.3 };

export class Enemy {
  constructor() {
    this.hitT = new Float32Array(N_SRC);
    // Where it was last drawn, [X, Y, w, h, flip (1 or 0)]: one array for its whole life, which
    // _rect points at once it has been drawn (draw, drawEmissive).
    this._r = [0, 0, 0, 0, 0];
    // Its body as drawn, [x0, y0, x1, y1] in the world (body), and how far of it to each side of
    // its feet (hr) and anywhere from them (reach) any frame is drawn (init; hitbox.js).
    this._box = [0, 0, 0, 0];
    this.hr = 0;
    this.reach = 0;
    // Its shadow and the width it was made for (drawShadow).
    this._sh = null;
    this._shW = 0;
    // What other code stores on a foe, there from the start so that every foe has one shape
    // (hidden class) and the hot code reading them stays fast. Unset, as they would be absent.
    this._rect = undefined; // draw
    this._bob = undefined; // draw
    this._look = -1; // draw: its night look (NIGHT_LOOKS), -1 for none
    this._img = null; // draw: the picture it was drawn as
    this._cell = undefined; // grid.js
    this._shown = undefined; // hud.js, a boss's health shown
    this._mTick = undefined; // minions.js
    this._mOn = undefined;
    this.shatterOnDeath = undefined; // Game.hitEnemy
    this.sealed = undefined; // dungeon.js, a guardian
    this.thaw = undefined; // dungeon.js, a sealed guardian: how far its seal is broken (0-1)
  }

  init(g, type, x, y, o = {}) {
    const def = ENEMIES[type];
    this.g = g;
    this.type = type;
    this.def = def;
    this.id = nextId++;
    this.spr = SPR[def.sprite];
    this.x = x;
    this.y = y;
    this.kx = 0;
    this.ky = 0;
    this.elite = !!o.elite;
    this.boss = !!def.boss;
    this.prop = !!def.prop;
    this.scale = o.scale ?? (def.scale || 1) * (this.elite ? 1.35 : 1);
    this.r = def.r * (this.elite ? 1.3 : 1);
    // A boss's width on the ground is its body's (spr.body), not the reach of its swings.
    const ext = spriteExtent(this.spr), hover = def.fly ? HOVER.up + HOVER.bob : 0;
    this.hr = Math.max(this.r, (this.spr.body ? this.spr.body[0] / 2 : ext.side) * this.scale + 1);
    this.reach = Math.hypot(ext.side * this.scale, ext.up * this.scale + hover) + 2; // body's spare pixel
    this.maxHp = this.hp = Math.max(1, def.hp * (o.hpMul ?? 1));
    this.spd = hordePace(type, o) * (o.spdMul ?? 1);
    this.paced = isPaced(def, o) && !!PACE_OF[type]; // one of the horde, walking its class's speed (hordePace)
    this.fleeing = true; // a thief runs from the start (THIEF)
    this.turnT = 0;
    this.wanderA = 0;
    this.dmg = def.dmg * (o.dmgMul ?? 1);
    this.xp = def.xp;
    this.face = Math.random() < 0.5 ? -1 : 1;
    this.anim = rand(10);
    this.flash = 0;
    this.dead = false;
    this.slowT = 0;
    this.slowF = 0;
    this.freezeT = 0;
    this.shatterOnDeath = false; // Frozen Heart's mark (Game.hitEnemy): a body back from the pool brings none with it
    // Branded by Smite (Game.hitEnemy: every blow does brandK more while brandT lasts) and held
    // by roots (rootT: it can't move, though it still strikes what touches it and still shoots);
    // stunned (stunT, Sanctum's: held, and what touches it is not struck).
    this.brandT = 0;
    this.brandK = 0;
    this.rootT = 0;
    this.stunT = 0;
    // Confused (confuse): it wanders any way, its touch hurts other monsters (confuseDmg a touch,
    // for confuseW) and the hero not at all. Cursed (curse): while curseT lasts it records the damage
    // it takes (curseRec); when it ends it takes curseShare of that again as one blow, for curseW.
    this.confuseT = 0;
    this.confuseDmg = 0;
    this.confuseW = null;
    this.confuseA = 0;
    this.confuseTurn = 0;
    this.confuseHit = 0;
    this.curseT = 0;
    this.curseRec = 0;
    this.curseShare = 0;
    this.curseW = null;
    this.holdT = 0;
    this.holdCd = 0;
    this.dotT = 0; // damage over time (addDot): how long it lasts yet
    this.dotDps = 0;
    this.dotTick = 0;
    this.dotType = 'fire';
    this.dotW = null; // the weapon it counts for
    this.bleedBy = -1; // which of a weapon's hooks last opened a bleed on it (hook: two at once cut double)
    this.fearT = 0; // afraid (scare): runs from the hero for this long
    this.blowT = 0; // blown back (blow): how long it flies yet, striking foes it meets
    this.blowId = 0; // the blast that blew it, and the last blast whose collision hurt it
    this.blowHit = 0;
    this.blowDmg = 0;
    this.blowW = null;
    this.state = 'move';
    this.stateT = 0;
    this.cdT = rand(1, 2.5);
    this.cd2 = rand(4, 7);
    this.cd3 = rand(8, 12);
    this.dirX = 0;
    this.dirY = 0;
    this.lockX = 0;
    this.lockY = 0;
    this.lockT = o.lockT || 0;
    if (o.lock) {
      this.lockX = o.lock[0];
      this.lockY = o.lock[1];
    }
    this.spawnMax = this.spawnT = o.instant ? 0 : def.rise ? 0.75 : 0.25;
    this.hitT.fill(0);
    this.h = (this.spr.body ? this.spr.body[1] : this.spr.h) * this.scale;
    this.name = o.name || null;
    this.mod = o.mod || null;
    this.vampiric = this.mod && this.mod.id === 'vampiric';
    this.wob = rand(TAU);
    this.life = 0;
    this._num = null;
    this.alpha = def.alpha || 1;
    this.squash = 0;
    this.sleeping = !!o.sleeping; // dungeon guardians wait for you
    // A floor's guardian is sealed once spawned (Dungeon.populate); one back from the pool is not.
    this.sealed = false;
    this.thaw = 0;
    this.lord = !!o.lord; // one of a crypt's named bosses, each asleep in a room of its own
    this.dormant = !!o.dormant; // a crypt's sleeping pack, until the hero comes near
    this.summoned = !!o.summoned; // called up round the hero by a boss (Game.summonRing)
    this.steady = !!o.steady; // the steady horde's (Spawner.update): let go when left far behind (Game.relocate)
    // Whether it knows where the hero is. In a crypt one doesn't until it has seen him or been
    // hit (update); what is sent at him (o.aware: a ring, a swarm, a pack), a boss, one that
    // wakes by its own rule (sleeping) and the thief always do. In the forest and on a Dungeon Run
    // floor every one does.
    this.aware = !!(o.aware || def.boss || o.sleeping || def.ai === 'flee');
    this.lookT = 0;
    this.pack = o.pack || 0;
    this.phase = 0;
    this.pose = null; // a boss's pose as it strikes (game/bosses.js), from life = poseAt
    this.poseAt = 0;
    this.speech = null;
    this.shake = 0;
    this.ai = this.boss ? BOSS_AI[type] : null;
    this.data = {};
    if (this.mod && this.mod.id === 'swift') this.spd *= 1.45;
    if (this.mod && this.mod.id === 'brutal') this.dmg *= 1.5;
    return this;
  }

  update(dt) {
    const g = this.g, p = g.player, def = this.def;
    this.life += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.squash > 0) this.squash = Math.max(0, this.squash - dt * 5);
    // A prop does nothing but fade in, a forest site's (Game.spawnProp) as it comes in view.
    if (this.prop) {
      if (this.spawnT > 0) this.spawnT = Math.max(0, this.spawnT - dt);
      return;
    }

    // Frozen and slowed wear off whatever the foe is doing, asleep or not: a Frost Rune taken
    // while a pack sleeps in a crypt's next room would otherwise hold it frozen until it woke.
    if (this.slowT > 0) {
      this.slowT -= dt;
      if (this.slowT <= 0) this.slowF = 0;
    }
    if (this.freezeT > 0) this.freezeT -= dt;
    if (this.brandT > 0) this.brandT -= dt;
    if (this.rootT > 0) this.rootT -= dt;
    if (this.stunT > 0) this.stunT -= dt;
    if (this.confuseT > 0) this.confuseT -= dt;
    if (this.fearT > 0) this.fearT -= dt;

    if (this.spawnT > 0) {
      this.spawnT -= dt;
      if (def.rise && Math.random() < 0.5) {
        g.particles.emit(this.x + rand(-5, 5), this.y, 0, rand(-15, 15), rand(-5, 5), rand(20, 50), 0.45, 1, pick([PC.b, PC.m, PC.a]), P.GROUND | P.FADE, 2, 220);
      }
      return;
    }

    if (this.sleeping) {
      this.anim += dt * 0.5;
      return;
    }
    if (this.dormant) {
      this.anim += dt * 0.5;
      if ((p.x - this.x) ** 2 + (p.y - this.y) ** 2 > 120 * 120 || !g.world.lineOfSight(this.x, this.y, p.x, p.y)) return;
      g.wakePack(this);
    }

    // A curse ends: one blow of its share of all that was dealt under it. The recording already holds
    // all the blows' strength (the hero's might, crits, brand, his rage...), so it lands as it is
    // (hitEnemy's o.raw; 27 October 2026).
    if (this.curseT > 0) {
      this.curseT -= dt;
      if (this.curseT <= 0) {
        const rec = this.curseRec * this.curseShare;
        this.curseRec = 0;
        g.particles.burst(this.x, this.y - this.h * 0.5, 6, 6, [PC.P, PC.p, PC.i], 50, 0.5, 1, P.GLOW | P.FADE, {});
        if (rec >= 1) g.hitEnemy(this, rec, { w: this.curseW, type: 'dark', kb: 0, noCrit: true, raw: true });
        if (this.dead) return;
      }
    }

    // Damage over time.
    if (this.dotT > 0) {
      this.dotT -= dt;
      this.dotTick -= dt;
      if (this.dotTick <= 0) {
        this.dotTick = 0.5;
        g.hitEnemy(this, this.dotDps * 0.5, { type: this.dotType, kb: 0, noCrit: true, w: this.dotW });
        if (this.dead) return;
      }
      if (Math.random() < 0.3) g.particles.emit(this.x + rand(-3, 3), this.y - rand(2, 10), 0, 0, 0, rand(15, 30), 0.35, 1, pick(DOT_SPARKS[this.dotType]), P.GLOW | P.FADE, 0);
    }

    // In a crypt (world.vision) a monster that hasn't seen the hero doesn't know where he is:
    // it strolls about (Dungeon.wander) and looks out for him (Dungeon.sees). Once it has seen
    // him, or been hit, it follows him, round corners too (the user's "follow the hero on
    // vision"). Out in the forest and on a Dungeon Run floor every monster knows.
    let unaware = false;
    if (!this.aware) {
      if (!g.world.vision) this.aware = true;
      else if ((this.lookT -= dt) <= 0) {
        this.lookT = rand(0.15, 0.3);
        this.aware = g.world.sees(this, p);
      }
      unaware = !this.aware;
    }

    // The horde walks its class's speed (hordePace), a Nightmare's faster; the rest scale by the difficulty.
    // Both at the run's walking speed (data/difficulty.js moveFor), as the hero's; on Normal 10% slower (foePace).
    let sp = (this.paced ? this.spd * (g.nightmare ? NIGHTMARE_PACE : 1) : this.spd * g.diff.speed) * g.move * (g.diff.foePace ?? 1);
    if (this.slowT > 0) sp *= 1 - this.slowF;
    if (this.freezeT > 0 || this.rootT > 0) sp = 0;
    if (this.holdCd > 0) this.holdCd -= dt;
    if (this.holdT > 0) {
      this.holdT -= dt;
      sp = 0;
    }
    // On a Dungeon Run floor it comes through walls, pillars and lava, slower while its feet are in
    // one (WALL_PACE), whatever its heading; a flier goes over them and a Wraith through them anywhere,
    // at their own pace.
    if (g.world.throughWalls && !def.fly && def.ai !== 'phaser' && !g.world.free(this.x, this.y)) sp *= WALL_PACE;

    let dx = 0, dy = 0;
    if (this.lockT > 0) {
      this.lockT -= dt;
      dx = this.lockX;
      dy = this.lockY;
    } else if (this.fearT > 0) {
      // Afraid: it runs straight from the hero, whatever else it would do.
      const l = Math.hypot(this.x - p.x, this.y - p.y) || 1;
      AWAY.x = this.x + ((this.x - p.x) / l) * 60;
      AWAY.y = this.y + ((this.y - p.y) / l) * 60;
      const d = g.world.steer(this, AWAY);
      dx = d[0];
      dy = d[1];
    } else if (unaware) {
      // Neither chasing nor shooting nor charging at a hero it hasn't seen.
      const d = g.world.wander(this, dt);
      dx = d[0];
      dy = d[1];
      sp *= STROLL;
    } else if (this.confuseT > 0) {
      // Confused: a way of its own, a new one now and then, at a stroll.
      this.confuseTurn -= dt;
      if (this.confuseTurn <= 0) {
        this.confuseTurn = rand(0.4, 0.9);
        this.confuseA = rand(TAU);
      }
      dx = Math.cos(this.confuseA);
      dy = Math.sin(this.confuseA);
      sp *= 0.8;
      this.confusedTouch(dt);
    } else if (this.ai) {
      const r = this.ai(this, dt, sp);
      dx = r[0];
      dy = r[1];
      sp *= r[2];
    } else {
      switch (def.ai) {
        case 'walker': {
          const d = g.world.steer(this, p);
          dx = d[0];
          dy = d[1];
          break;
        }
        case 'flyer': {
          const d = g.world.steer(this, p, true);
          const w = Math.sin(this.life * 4 + this.wob) * 0.7;
          dx = d[0] - d[1] * w;
          dy = d[1] + d[0] * w;
          const l = Math.hypot(dx, dy) || 1;
          dx /= l;
          dy /= l;
          break;
        }
        case 'hopper': {
          const d = g.world.steer(this, p);
          const ph = (this.life * 1.25 + this.wob) % 1;
          dx = d[0];
          dy = d[1];
          sp *= ph < 0.42 ? 2.3 : 0.08;
          if (ph < 0.42 && ph + dt * 1.25 >= 0.42) this.squash = 1;
          break;
        }
        case 'skitter': {
          const d = g.world.steer(this, p);
          this.stateT -= dt;
          if (this.stateT <= 0) {
            this.stateT = rand(0.25, 0.6);
            this.data.off = rand(-1, 1);
          }
          const o = this.data.off || 0;
          dx = d[0] - d[1] * o;
          dy = d[1] + d[0] * o;
          const l = Math.hypot(dx, dy) || 1;
          dx /= l;
          dy /= l;
          break;
        }
        case 'phaser': {
          const l = Math.hypot(p.x - this.x, p.y - this.y) || 1;
          dx = (p.x - this.x) / l;
          dy = (p.y - this.y) / l;
          this.alpha = (def.alpha || 0.8) * (0.75 + 0.25 * Math.sin(this.life * 3 + this.wob));
          break;
        }
        // Both return a heading and a share of the monster's own speed.
        case 'charger':
        case 'caster': {
          const r = def.ai === 'charger' ? this.charger(dt) : this.caster(dt);
          dx = r[0];
          dy = r[1];
          sp *= r[2];
          break;
        }
        case 'flee': {
          const l = Math.hypot(this.x - p.x, this.y - p.y) || 1;
          if (l < THIEF.near) this.fleeing = true;
          else if (l > THIEF.safe) this.fleeing = false;
          if (this.fleeing) {
            AWAY.x = this.x + ((this.x - p.x) / l) * 60;
            AWAY.y = this.y + ((this.y - p.y) / l) * 60;
          } else {
            // Far enough: a stroll, a new way now and then.
            this.turnT = (this.turnT ?? 0) - dt;
            if (this.turnT <= 0) {
              this.turnT = rand(...THIEF.turn);
              this.wanderA = rand(TAU);
            }
            AWAY.x = this.x + Math.cos(this.wanderA) * 60;
            AWAY.y = this.y + Math.sin(this.wanderA) * 60;
          }
          const d = g.world.steer(this, AWAY);
          dx = d[0];
          dy = d[1];
          // Its own speed, slows and holds as they are, made the share of the hero's pace it runs or walks at.
          sp *= ((this.fleeing ? THIEF.run : THIEF.walk) * heroPace(g)) / Math.max(1, this.spd * g.diff.speed * g.move);
          if (Math.random() < 0.2) g.particles.emit(this.x + rand(-4, 4), this.y - rand(4, 12), 0, 0, 0, rand(5, 15), 0.6, 1, PC.Y, P.GLOW | P.FADE, 0);
          if (this.life > 20) {
            g.escape(this);
            return;
          }
          break;
        }
        default:
          break;
      }
    }

    this.dirX = dx;
    this.dirY = dy;
    this.x += (dx * sp + this.kx) * dt;
    this.y += (dy * sp + this.ky) * dt;
    const kd = Math.exp(-9 * dt);
    this.kx *= kd;
    this.ky *= kd;
    if (this.walled) g.world.collide(this);
    if (this.blowT > 0) this.blowInto(dt);
    // It faces the way it goes (facing.js); held, frozen or winding up, it isn't going anywhere.
    if (sp > 0) this.face = faceAlong(this.face, dx, dy);
    this.anim += dt * def.anim * (sp > 1 ? 1 : 0.25);

    // Contact damage.
    if (this.dmg > 0 && this.freezeT <= 0 && this.stunT <= 0 && this.confuseT <= 0) {
      const rr = this.r + p.r;
      if ((p.x - this.x) ** 2 + (p.y - this.y) ** 2 < rr * rr) {
        // It costs the hero health only: no blow, a boss's included, shoves him (Player.update).
        p.hurt(this.dmg * (this.boss ? (1 + (g.dmgScale - 1) * 0.6) * g.bossPower : g.dmgScale) * (this.state === 'dash' ? 1.4 : 1), this);
      }
    }
  }

  // Damage over time: dps for t seconds, a blow every half second ('fire' or 'poison', which
  // its numbers and sparks show), counting for weapon w. A stronger one takes over a weaker;
  // any keeps it going at least t seconds more.
  addDot(type, dps, t, w = null) {
    if (this.dead || this.prop || dps <= 0) return;
    if (this.dotT <= 0) this.dotTick = 0.5;
    if (this.dotT <= 0 || dps >= this.dotDps) {
      this.dotDps = dps;
      this.dotType = type;
      this.dotW = w;
    }
    this.dotT = Math.max(this.dotT, t);
  }

  // The horde alone is shoved, scared or dragged about: never a boss, a crypt's lord, a champion,
  // a prop, a sealed guardian or one still asleep.
  // The Gilded Thief keeps his own pace (THIEF: the owner's, he runs and strolls as set): no gust,
  // pull or fright moves him (22 October 2026: "the thief now seems to jump").
  get movable() {
    return !(this.dead || this.boss || this.lord || this.elite || this.prop || this.sealed || this.sleeping || this.dormant || this.spawnT > 0 || this.def.ai === 'flee');
  }

  // Whether walls hold it (Dungeon.collide, Game.separate): a walker's do in a crypt, and the Gilded
  // Thief's anywhere (fled into a wall it couldn't be caught: the owner's rule that he can always
  // catch it). A flier goes over them and a Wraith (ai 'phaser') through them anywhere, and on a
  // Dungeon Run floor every other monster comes straight through them (Dungeon.throughWalls),
  // slower while in one (WALL_PACE).
  get walled() {
    const d = this.def;
    return !d.fly && d.ai !== 'phaser' && (!this.g.world.throughWalls || d.ai === 'flee');
  }

  // Afraid for t seconds (it runs from the hero); false for one that shrugs it off.
  scare(t) {
    if (!this.movable) return false;
    this.fearT = Math.max(this.fearT, t);
    return true;
  }

  // Blown from (fromX, fromY) away at speed v (px/s; it slides about v/9 px, Enemy.update's drag)
  // by blast `id` of weapon w; in flight it strikes any foe it meets for dmg, and is struck for it
  // too, once each per blast (blowInto). False for one too strong to move.
  blow(fromX, fromY, v, id, w, dmg) {
    if (!this.movable) return false;
    const l = Math.hypot(this.x - fromX, this.y - fromY) || 1;
    this.kx = ((this.x - fromX) / l) * v;
    this.ky = ((this.y - fromY) / l) * v;
    this.blowT = 0.4;
    this.blowId = id;
    this.blowW = w;
    this.blowDmg = dmg;
    return true;
  }

  // In flight (blow): the first foe it meets takes a hit, and so does it. Foes bump into nothing
  // else; this is the one collision, and only while blown.
  blowInto(dt) {
    this.blowT -= dt;
    if (this.blowDmg <= 0 || this.blowHit === this.blowId) return;
    const g = this.g;
    for (const o of g.grid.query(this.x, this.y, this.r + 12)) {
      if (o === this || o.dead || o.prop || o.blowHit === this.blowId) continue;
      if ((o.x - this.x) ** 2 + (o.y - this.y) ** 2 > (this.r + o.r) ** 2) continue;
      this.blowHit = o.blowHit = this.blowId;
      g.hitEnemy(o, this.blowDmg, { w: this.blowW, kb: 0, noCrit: true });
      if (!this.dead) g.hitEnemy(this, this.blowDmg, { w: this.blowW, kb: 0, noCrit: true });
      return;
    }
  }

  // Confused for t seconds (a regular foe only: no boss, crypt lord, champion or thief), whatever it
  // touches hurt for dmg, counting for weapon w.
  confuse(t, dmg, w = null) {
    if (this.dead || this.prop || this.boss || this.lord || this.elite || this.def.ai === 'flee') return false;
    if (this.confuseT <= 0) {
      this.confuseA = rand(TAU);
      this.confuseTurn = 0;
      this.confuseHit = 0;
    }
    this.confuseT = Math.max(this.confuseT, t);
    this.confuseDmg = dmg;
    this.confuseW = w;
    return true;
  }

  // Cursed for t seconds: it records what it takes, and takes share of that again when it ends.
  curse(t, share, w = null) {
    if (this.dead || this.prop) return false;
    if (this.curseT <= 0) this.curseRec = 0;
    this.curseT = Math.max(this.curseT, t);
    this.curseShare = Math.max(this.curseShare, share);
    this.curseW = w;
    return true;
  }

  // A confused foe's touch (update): every CONFUSE_TOUCH seconds it hurts the monsters it overlaps.
  confusedTouch(dt) {
    this.confuseHit -= dt;
    if (this.confuseHit > 0 || this.confuseDmg <= 0) return;
    this.confuseHit = CONFUSE_TOUCH;
    const g = this.g;
    for (const o of g.grid.query(this.x, this.y, this.r + 14)) {
      if (o === this || o.dead || o.prop || o.spawnT > 0.3) continue;
      const rr = this.r + o.r;
      if ((o.x - this.x) ** 2 + (o.y - this.y) ** 2 > rr * rr) continue;
      g.hitEnemy(o, this.confuseDmg, { w: this.confuseW, type: 'poison', kb: 0, noCrit: true });
      if (this.dead) return;
    }
  }

  // A champion taking a blow. A charge already under way carries on.
  stagger() {
    if (this.holdCd > 0 || this.state === 'dash') return;
    this.holdT = HOLD;
    this.holdCd = HOLD_EVERY;
  }

  charger(dt) {
    const g = this.g, p = g.player, c = this.def.charge;
    const dist = Math.hypot(p.x - this.x, p.y - this.y);
    this.cdT -= dt;
    switch (this.state) {
      case 'wind':
        this.stateT -= dt;
        this.shake = 1;
        if (this.stateT <= 0) {
          this.state = 'dash';
          this.stateT = c.dur;
          sfx('charge', { pan: clamp((this.x - p.x) / 200, -1, 1) });
        }
        return aim(this.lockX, this.lockY, 0);
      case 'dash':
        this.stateT -= dt;
        this.shake = 0;
        if (Math.random() < 0.6) g.particles.emit(this.x, this.y, 0, -this.lockX * 30, -this.lockY * 30, 5, 0.3, 1, PC.N, P.FADE, 2);
        if (this.stateT <= 0) {
          this.state = 'move';
          this.cdT = c.cd * rand(0.8, 1.2);
        }
        return aim(this.lockX, this.lockY, c.spd / Math.max(1, this.spd));
      default: {
        const d = g.world.steer(this, p);
        if (this.cdT <= 0 && dist < c.range && dist > 20 && this.freezeT <= 0) {
          this.state = 'wind';
          this.stateT = c.wind;
          const l = dist || 1;
          this.lockX = (p.x - this.x) / l;
          this.lockY = (p.y - this.y) / l;
          this.face = faceAttack(this.face, false, this.lockX, this.lockY);
        }
        return aim(d[0], d[1], 1);
      }
    }
  }

  caster(dt) {
    // Frozen, it neither winds up nor looses a shot: a wind-up under way (and the red flash that
    // warns of it, hidden under the ice tint: draw) waits for the thaw, and its cooldown with it (27 October 2026).
    if (this.freezeT > 0) return aim(0, 0, 0);
    const g = this.g, p = g.player, s = this.def.shot;
    const dx = p.x - this.x, dy = p.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.cdT -= dt;
    if (this.state === 'wind') {
      this.stateT -= dt;
      if (this.stateT <= 0) {
        this.state = 'move';
        this.cdT = s.cd * rand(0.8, 1.2);
        const ang = Math.atan2(dy, dx);
        g.eshots.push(new EnemyShot(g, this.x, this.y - 2, ang, s.spd, s.dmg * g.dmgScale, s.kind, { by: shotName(this, s.kind), boss: bossOf(this) }));
        sfx('enemyshot', { pan: clamp((this.x - p.x) / 200, -1, 1) });
      }
      return aim(0, 0, 0);
    }
    // On a Dungeon Run floor (throughWalls) one standing in the rock neither takes aim (its shot
    // would break on the rock it stands in: EnemyShot.update) nor counts as seeing him: sight is
    // sampled from 6 px along the line (Dungeon.lineOfSight), so one just inside a wall's face
    // would "see" him from there (27 October 2026).
    const open = !g.world.throughWalls || !g.world.solid(this.x, this.y);
    if (this.cdT <= 0 && dist < s.range && open && g.world.lineOfSight(this.x, this.y, p.x, p.y)) {
      this.state = 'wind';
      this.stateT = s.wind;
      // A shot wound up standing still: it turns toward the hero first (facing.js).
      this.face = faceAttack(this.face, false, dx, dy);
      return aim(0, 0, 0);
    }
    // It keeps its distance, but on a Dungeon Run floor, where it comes on through the rock
    // (throughWalls, the owner's 27 October 2026), only once it sees him: one holding off inside a
    // wall would never see him to shoot, nor come out. Out on open floor it backs off no further
    // than the wall's face: a step back into the rock would take it out of the fight again, so
    // there it stands its ground.
    if (dist < s.range * 0.6 && (!g.world.throughWalls || (open && g.world.lineOfSight(this.x, this.y, p.x, p.y)))) {
      if (g.world.throughWalls && g.world.solid(this.x - (dx / dist) * 8, this.y - (dy / dist) * 8)) return aim(0, 0, 0);
      return aim(-dx / dist, -dy / dist, 0.8);
    }
    const d = g.world.steer(this, p);
    return aim(d[0], d[1], 1);
  }

  // ------------------------------------------------------------- drawing --

  // Round and round its frames, or its walk if the sprite has one; a shooter with a drawing
  // frame (attack) holds it while it takes aim. A boss with poses plays the one it strikes in
  // (game/bosses.js), held at its end while it casts, and its idle while it stands (asleep,
  // rising, or casting with no pose); its walk goes motionRate frames to a step of the old one.
  frameIndex() {
    const s = this.spr;
    if (s.attack && this.state === 'wind') return s.attack[0];
    if (s.poses) {
      const seq = this.pose && s.poses[this.pose];
      if (seq) {
        const i = Math.floor((this.life - this.poseAt) * s.poseFps);
        if (i < seq.length || this.state === 'cast') return seq[Math.min(i, seq.length - 1)];
      }
      if (s.idle && (this.sleeping || this.spawnT > 0 || this.state === 'cast')) return s.idle[Math.floor(this.life * IDLE_FPS) % s.idle.length];
    }
    return s.walk ? s.walk[Math.floor(this.anim * s.motionRate) % s.walk.length] : Math.floor(this.anim) % s.frames.length;
  }

  // Its body as drawn this frame (hitbox.js), [x0, y0, x1, y1] in the world: the opaque pixels of
  // the frame draw shows, where it puts them (mirrored as it faces, a flyer up off the ground with
  // the whole of its bob), and a pixel to spare all round. One array, rewritten each call.
  body() {
    const fr = this.spr.frames[this.frameIndex()], b = fr.box, sc = this.scale, half = fr.w / 2, out = this._box;
    const flip = this.face < 0, l = flip ? half - b[2] : b[0] - half, r = flip ? half - b[0] : b[2] - half;
    const top = this.y + 1 + (this.spr.below - fr.h) * sc - (this.def.fly ? HOVER.up : 0), bob = this.def.fly ? HOVER.bob : 0;
    out[0] = this.x + l * sc - 1;
    out[1] = top + b[1] * sc - bob - 1;
    out[2] = this.x + r * sc + 1;
    out[3] = top + b[3] * sc + bob + 1;
    return out;
  }

  drawShadow(ctx, cam) {
    const S = cam.S;
    const sw = Math.max(6, (this.spr.body ? this.spr.body[0] : this.spr.w) * 0.7 * this.scale);
    if (sw !== this._shW) {
      this._shW = sw;
      this._sh = shadowSprite(sw);
    }
    const sh = this._sh;
    const sx = (this.x - cam.x) * S, sy = (this.y - cam.y) * S;
    let a = 0.55;
    if (this.def.fly) a = 0.35;
    if (this.spawnT > 0) a *= 1 - this.spawnT / this.spawnMax;
    ctx.globalAlpha = a * (this.alpha < 1 ? this.alpha : 1);
    ctx.drawImage(sh, Math.round(sx - (sh.width * S) / 2), Math.round(sy - (sh.height * S) / 2), sh.width * S, sh.height * S);
    ctx.globalAlpha = 1;
  }

  draw(ctx, cam) {
    const S = cam.S;
    const fr = this.spr.frames[this.frameIndex()];
    const flip = this.face < 0;
    let img, look = 0;
    if (this.flash > 0) {
      img = fr.white(flip);
      look = -1;
    } else if (this.freezeT > 0) {
      img = fr.variant('frozen', TINTS.frozen, flip);
      look = 1;
    } else if (this.state === 'wind' && Math.floor(this.life * 20) % 2) {
      img = fr.variant('burn', TINTS.burn, flip);
      look = 2;
    } else if (this.elite) img = fr.variant('eliteo', eliteOutlineBuf, flip);
    else img = fr.get(flip);
    // Its night look, as drawn (a champion's unringed). A white flash needs no lifting.
    this._look = look < 0 || this.boss || this.lord || this.prop ? -1 : this.elite ? look + 3 : look;
    this._img = img;

    let sx = this.scale, sy = this.scale;
    if (this.flash > 0) {
      sx *= 1.12;
      sy *= 0.9;
    }
    if (this.squash > 0) {
      sx *= 1 + this.squash * 0.25;
      sy *= 1 - this.squash * 0.2;
    }
    if (this.def.ai === 'hopper') {
      const ph = (this.life * 1.25 + this.wob) % 1;
      if (ph < 0.42) {
        sy *= 1.12;
        sx *= 0.92;
      }
    }
    const w = img.width * S * sx, h = img.height * S * sy;
    let X = (this.x - cam.x) * S - w / 2;
    const Y = (this.y - cam.y) * S - h + S + this.spr.below * S * sy;
    if (this.shake) X += (Math.random() - 0.5) * S * 2;
    if (this.def.fly) {
      const bob = Math.sin(this.life * 6 + this.wob) * HOVER.bob * S;
      this._bob = bob;
    } else this._bob = 0;
    const by = Y - this._bob - (this.def.fly ? HOVER.up * S : 0);
    const r = this._r;
    r[0] = X;
    r[1] = by;
    r[2] = w;
    r[3] = h;
    r[4] = flip ? 1 : 0;
    this._rect = r;
    let alpha = this.alpha;
    if (this.spawnT > 0 && this.def.rise) {
      const k = 1 - this.spawnT / this.spawnMax;
      const vis = Math.max(1, Math.round(img.height * k));
      ctx.drawImage(img, 0, 0, img.width, vis, Math.round(X), Math.round(by + h - vis * S * sy), Math.round(w), Math.round(vis * S * sy));
      this._look = -1;
      return;
    }
    if (this.spawnT > 0) alpha *= 1 - this.spawnT / this.spawnMax;
    if (alpha < 1) ctx.globalAlpha = alpha;
    ctx.drawImage(img, Math.round(X), Math.round(by), Math.round(w), Math.round(h));
    if (alpha < 1) ctx.globalAlpha = 1;
    // A sealed guardian's ice over it (FROST), thinning as its seal breaks. The night's cut (_img)
    // is the frame's own shape all the same.
    if (this.sealed && this.flash <= 0) {
      ctx.globalAlpha = alpha * this.frost();
      ctx.drawImage(fr.variant('frozen', TINTS.frozen, flip), Math.round(X), Math.round(by), Math.round(w), Math.round(h));
      ctx.globalAlpha = 1;
    }
  }

  // How thick a sealed guardian's ice is drawn (FROST): `most` with its seal whole, `least` all
  // but broken; 0 for any other foe.
  frost() {
    return this.sealed ? FROST.most - (FROST.most - FROST.least) * clamp(this.thaw || 0, 0, 1) : 0;
  }

  // Unlit layer: glowing eyes, embers, champion auras, and a boss's outline burning in its
  // colour, so the night can't swallow it.
  drawEmissive(ctx, cam) {
    if (!this._rect || this.spawnT > 0) return;
    const fr = this.spr.frames[this.frameIndex()];
    const r = this._rect, X = r[0], Y = r[1], w = r[2], h = r[3], flip = r[4];
    if (fr.em && this.flash <= 0) {
      ctx.globalAlpha = this.alpha;
      ctx.drawImage(flip ? fr.emf : fr.em, Math.round(X), Math.round(Y), Math.round(w), Math.round(h));
      ctx.globalAlpha = 1;
    }
    if (this.brandT > 0) this.drawBrand(ctx, cam, X, Y, w);
    if (this.curseT > 0 || this.confuseT > 0) this.drawMarks(ctx, cam, X, Y, w);
    if ((this.boss || this.lord) && this.flash <= 0) {
      // A sealed guardian's outline burns icy for as much as its ice is on it (FROST), in its own
      // colour for the rest.
      const a = this.alpha * (0.7 + 0.3 * Math.sin(this.life * 6)), ice = this.frost();
      if (ice < 1) this.drawRim(ctx, fr, this.rimColor(), a * (1 - ice));
      if (ice > 0) this.drawRim(ctx, fr, FROST.rim, a * ice);
    }
  }

  // Smite's brand: its sigil (WEAPON_SPRITES.brand) over the foe's head, unlit, bobbing a little,
  // fading out over its last half second. X, Y, w: where the foe was drawn, on the screen.
  drawBrand(ctx, cam, X, Y, w) {
    const spr = SPR[WEAPON_SPRITES.brand];
    if (!spr) return;
    const S = cam.S, img = spr.frames[Math.floor(this.life * 6) % spr.frames.length].c;
    const bob = Math.round(Math.sin(this.life * 5 + this.wob) * 1) * S;
    ctx.globalAlpha = Math.min(1, this.brandT * 2) * 0.95;
    ctx.drawImage(img, Math.round(X + w / 2 - (img.width * S) / 2), Math.round(Y - (img.height + 2) * S + bob), img.width * S, img.height * S);
    ctx.globalAlpha = 1;
  }

  // A curse's hourglass (violet, its sand running down with the curse) and a confusion's three
  // circling sparks, over the foe's head. X, Y, w: where it was drawn, on the screen.
  drawMarks(ctx, cam, X, Y, w) {
    const S = cam.S, cx = Math.round(X + w / 2), top = Math.round(Y - 3 * S);
    if (this.curseT > 0) {
      const px = (dx, dy, wd, c) => {
        ctx.fillStyle = c;
        ctx.fillRect(cx + dx * S, top + dy * S - 8 * S, wd * S, S);
      };
      const sand = Math.min(1, this.curseT / 3);
      px(-2, 0, 5, '#8f5bb0');
      px(-1, 1, 3, sand > 0.5 ? '#b55088' : '#68386c');
      px(0, 2, 1, '#b55088');
      px(-1, 3, 3, sand > 0.5 ? '#68386c' : '#b55088');
      px(-2, 4, 5, '#8f5bb0');
    }
    if (this.confuseT > 0) {
      for (let i = 0; i < 3; i++) {
        const a = this.life * 7 + (i * TAU) / 3;
        ctx.fillStyle = i ? '#fee761' : '#ffffff';
        ctx.fillRect(Math.round(cx + Math.cos(a) * 5 * S), Math.round(top - 2 * S + Math.sin(a) * 1.5 * S), 2 * S, 2 * S);
      }
    }
  }

  // How much of its night layer shows (NIGHT_EDGE): as much as of its body, fading in as that
  // does when it appears, and over NIGHT_RISE seconds once it has risen from the ground.
  nightShare() {
    let a = this.alpha;
    if (this.spawnT > 0) a *= 1 - this.spawnT / this.spawnMax;
    else if (this.def.rise && this.life < this.spawnMax + NIGHT_RISE) a *= Math.max(0, this.life - this.spawnMax) / NIGHT_RISE;
    return a;
  }

  rimColor() {
    return this.boss ? this.def.color : this.mod ? this.mod.color : '#b55088';
  }

  // Its outline in col (rimBuf), unlit at alpha a, where frame fr was last drawn (drawEmissive).
  drawRim(ctx, fr, col, a) {
    const r = this._rect;
    ctx.globalAlpha = a;
    ctx.drawImage(fr.variant('rim' + col, (b) => rimBuf(b, col), r[4]), Math.round(r[0]), Math.round(r[1]), Math.round(r[2]), Math.round(r[3]));
    ctx.globalAlpha = 1;
  }

  drawGlow(ctx, cam) {
    if (!this.elite && !this.boss) return;
    const S = cam.S;
    if (this.sealed) {
      // A shimmering ward around a sealed guardian, fading as its seal breaks, and the cold of its
      // ice about it (FROST).
      const sx = (this.x - cam.x) * S, sy = (this.y - this.h * 0.45 - cam.y) * S;
      const s = this.h * 2.2 * S * (1 + 0.04 * Math.sin(this.life * 4)), c = this.h * 1.4 * S;
      ctx.globalAlpha = FROST.ward * (1 - (1 - FROST.wardLeast) * clamp(this.thaw || 0, 0, 1));
      ctx.drawImage(glow('#b55088'), sx - s / 2, sy - s / 2, s, s);
      ctx.globalAlpha = FROST.sheen * this.frost();
      ctx.drawImage(glow(FROST.rim), sx - c / 2, sy - c / 2, c, c);
      ctx.globalAlpha = 1;
      return;
    }
    const sx = (this.x - cam.x) * S, sy = (this.y - this.h * 0.45 - cam.y) * S;
    const s = this.h * 2.6 * S;
    const col = this.boss ? this.def.color : this.mod ? this.mod.color : '#feae34';
    ctx.globalAlpha = 0.28 + 0.1 * Math.sin(this.life * 5);
    ctx.drawImage(glow(col), sx - s / 2, sy - s / 2, s, s);
    ctx.globalAlpha = 1;
  }
}

const GOLD = hexPack('#feae34');
// Champions get a gold outline instead of the ink one (a tuned sprite's own ink: b.ink).
function eliteOutlineBuf(b) {
  const out = { w: b.w, h: b.h, d: b.d.slice() }, ink = b.ink ?? OUTLINE;
  for (let i = 0; i < out.d.length; i++) if (out.d[i] === ink) out.d[i] = GOLD;
  return out;
}

// ------------------------------------------------------------ the night edge --

// How strongly the night layer is drawn under ambient light [r, g, b] (0–255): NIGHT_EDGE.
export function nightFloor(amb) {
  const m = (0.299 * amb[0] + 0.587 * amb[1] + 0.114 * amb[2]) / 255, f = NIGHT_EDGE.floor;
  return m < f ? (f - m) / (1 - m) : 0;
}

// The night layers are drawn first into a canvas of their own the size of the screen, in the
// order Game.draw drew the scene (its y-sorted list, then the bosses over it), each over those
// behind it as the figures themselves are; and whatever else was drawn there (a tree, a box, the
// hero, a crypt, a foe flashing white, a boss) cuts its own shape out of them. So nothing shows
// through what stands in front of it, a foe through a tree or through another foe. A hole round
// the hero fades them out near him; then the one canvas goes over the lit scene at the floor's
// alpha. Called after the lighting, before the unlit layers (eyes, glows) that go over it.
// `n`: the night canvas's context (tests pass their own).
export function drawNightEdge(ctx, cam, g, n = nightContext(cam)) {
  const f = nightFloor(g.world.ambient());
  if (f <= 0) return;
  const p = g.player;
  n.globalCompositeOperation = 'source-over';
  n.globalAlpha = 1;
  n.imageSmoothingEnabled = false;
  n.clearRect(0, 0, cam.pxW, cam.pxH);
  let any = false, cut = false;
  for (const o of g.drawList) {
    let fr, key, fn, flip, X, Y, w, h, a;
    if (o instanceof Enemy && o._look >= 0) {
      a = o.nightShare();
      const r = o._rect, look = NIGHT_LOOKS[o._look];
      fr = o.spr.frames[o.frameIndex()];
      key = look[0];
      fn = look[1];
      flip = r[4];
      X = Math.round(r[0]);
      Y = Math.round(r[1]);
      w = Math.round(r[2]);
      h = Math.round(r[3]);
    } else if (o.minion) {
      if (o.rise > 0) continue;
      const m = o.rect(cam);
      a = o.life < 1 ? o.life : 1;
      fr = m.fr;
      key = ALLY_LOOK[0];
      fn = ALLY_LOOK[1];
      flip = m.flip;
      X = m.X;
      Y = m.Y;
      w = m.w;
      h = m.h;
    } else {
      // Not lifted: cuts its shape out of those behind it.
      if (any) cut = nightCut(n, o, p, cut);
      continue;
    }
    if (a < 0.02) continue;
    if (cut) n.globalCompositeOperation = 'source-over';
    cut = false;
    const ux = (NIGHT_PAD * w) / fr.w, uy = (NIGHT_PAD * h) / fr.h;
    n.globalAlpha = a;
    n.drawImage(fr.variant(key, fn, flip), X - ux, Y - uy, w + 2 * ux, h + 2 * uy);
    any = true;
  }
  if (!any) return;
  for (const e of g.topList) cut = nightCut(n, e, p, cut);
  // Fading out near the hero, to nothing at the middle of his light.
  const S = cam.S, R = NIGHT_EDGE.near * S;
  n.globalCompositeOperation = 'destination-out';
  n.globalAlpha = 1;
  n.imageSmoothingEnabled = true;
  n.drawImage(nightHole(), (p.x - cam.x) * S - R, (p.y - 6 - cam.y) * S - R, R * 2, R * 2);
  n.imageSmoothingEnabled = false;
  n.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = f;
  ctx.drawImage(n.canvas, 0, 0);
  ctx.globalAlpha = 1;
}

// One thing drawn in the scene and not lifted, cutting its shape out of the night layers behind
// it: a foe (as drawn: _img over _rect), the hero, or a tree, box, crypt or shrine (_rect, its
// frame last). Returns that the night canvas is cutting now.
function nightCut(n, o, p, cut) {
  const r = o._rect;
  const foe = o instanceof Enemy;
  if (!r || (o === p && p.dead) || (foe && o.spawnT > 0 && o.def.rise)) return cut;
  if (!cut) n.globalCompositeOperation = 'destination-out';
  n.globalAlpha = 1;
  // Exactly where it was drawn: a foe rounds its rectangle as it draws, the rest draw at theirs.
  if (foe) n.drawImage(o._img, Math.round(r[0]), Math.round(r[1]), Math.round(r[2]), Math.round(r[3]));
  else n.drawImage(r[4].get(r[5]), r[0], r[1], r[2], r[3]);
  return true;
}

let nightC = null, holeC = null;
// The night canvas, the size of the screen.
function nightContext(cam) {
  if (!nightC) nightC = makeCanvas(cam.pxW, cam.pxH);
  if (nightC.width !== cam.pxW || nightC.height !== cam.pxH) {
    nightC.width = cam.pxW;
    nightC.height = cam.pxH;
  }
  return nightC.getContext('2d');
}

// The hole round the hero: opaque at its middle, clear at its edge, straight between.
export function nightHoleBuf(size = 64) {
  const b = makeBuf(size, size), c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const k = 1 - Math.hypot(x - c, y - c) / c;
      if (k > 0) b.d[y * size + x] = pack(0, 0, 0, Math.round(255 * k));
    }
  }
  return b;
}
const nightHole = () => (holeC ??= canvasFromBuf(nightHoleBuf()));

// How long a risen foe's night layer takes to fade in (s).
const NIGHT_RISE = 0.3;
// A posed boss's idle, frames a second (frameIndex).
const IDLE_FPS = 8;
// A ring colour, at its share of the layer's alpha; its halo, the fainter pixel round it.
const ringOf = (hex) => hexPack(hex, Math.round(255 * NIGHT_EDGE.ringA));
const haloOf = (hex) => hexPack(hex, Math.round(255 * NIGHT_EDGE.haloA));
const RING = ringOf(NIGHT_EDGE.ring), HALO = haloOf(NIGHT_EDGE.ring);
// A frame in its night colours (NIGHT_EDGE lift, gamma, sat and contrast), each colour worked out once; its ink
// outline (a tuned sprite's own: b.ink) and a rim of its own (b.rim) stay as they are.
// Lifted first, then saturated and pulled apart: contrast before the lift would crush the darks
// it is there to raise.
const NIGHT_TUNE = { lift: NIGHT_EDGE.lift, gamma: NIGHT_EDGE.gamma }, NIGHT_POP = { sat: NIGHT_EDGE.sat, contrast: NIGHT_EDGE.contrast };
const nightColours = new Map();
const lumOf = (p) => 0.299 * (p & 255) + 0.587 * ((p >> 8) & 255) + 0.114 * ((p >> 16) & 255);
// One colour by night: lifted, then popped; a mid tone the contrast would leave darker than it was
// keeps the lift alone, so no monster is ever darker for it.
function nightColour(hex) {
  const lifted = shade(hex, NIGHT_TUNE), popped = hexPack(shade(lifted, NIGHT_POP));
  return (lumOf(popped) >= lumOf(hexPack(hex)) ? popped : hexPack(lifted)) & 0xffffff;
}
export function nightLift(b) {
  const ink = b.ink ?? OUTLINE, out = { w: b.w, h: b.h, d: b.d.slice() };
  if (b.ink !== undefined) out.ink = b.ink;
  if (b.rim !== undefined) out.rim = b.rim;
  for (let i = 0; i < out.d.length; i++) {
    const c = out.d[i];
    if (!(c >>> 24) || c === ink || c === b.rim) continue;
    const rgb = c & 0xffffff;
    let to = nightColours.get(rgb);
    if (to === undefined) nightColours.set(rgb, (to = nightColour(hexOfPacked(c))));
    out.d[i] = ((c & 0xff000000) | to) >>> 0;
  }
  return out;
}
// A foe's night looks, by Enemy._look: as drawn plain, frozen, winding up; then a champion's,
// unringed round its gold outline. Each is lifted first (nightLift), then tinted or outlined in
// gold as drawn. [variant key, how it is built from the frame]
export const NIGHT_LOOKS = [
  ['night', (b) => nightBuf(nightLift(b), RING, HALO)],
  ['night-frozen', (b) => nightBuf(TINTS.frozen(nightLift(b)), RING, HALO)],
  ['night-burn', (b) => nightBuf(TINTS.burn(nightLift(b)), RING, HALO)],
  ['night-eliteo', (b) => nightBuf(eliteOutlineBuf(nightLift(b)), 0)],
  ['night-frozen-e', (b) => nightBuf(TINTS.frozen(nightLift(b)), 0)],
  ['night-burn-e', (b) => nightBuf(TINTS.burn(nightLift(b)), 0)],
];
// An ally's, lifted as the horde's and ringed in green so that a skeleton of the hero's reads
// apart from the horde's.
const ALLY_RING = ringOf(NIGHT_EDGE.allyRing), ALLY_HALO = haloOf(NIGHT_EDGE.allyRing);
export const ALLY_LOOK = ['night-ally', (b) => nightBuf(nightLift(b), ALLY_RING, ALLY_HALO)];

// Just a boss's outline, in its colour: drawn unlit over the boss.
function rimBuf(b, color) {
  const c = hexPack(color), ink = b.ink ?? OUTLINE;
  const out = { w: b.w, h: b.h, d: new Uint32Array(b.d.length) };
  for (let i = 0; i < out.d.length; i++) if (b.d[i] === ink) out.d[i] = c;
  return out;
}

export function makeEnemyPool() {
  const pool = [];
  return {
    get() {
      return pool.pop() || new Enemy();
    },
    put(e) {
      e.g = null;
      e._num = null;
      e._rect = null;
      pool.push(e);
    },
  };
}
