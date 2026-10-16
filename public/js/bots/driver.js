// Bot play-testing: a Driver plays a run with a bot at the controls, the way
// the game screen would (level-up cards, chests, evolutions) but at a fixed
// timestep and as fast as the CPU allows. The headless runner
// (tools/bots.mjs) and the browser's __fs.sim() both use it, so a strategy
// plays the same in either.

import { input } from '../engine/input.js';
import { WEAPONS } from '../data/weapons.js';
import { PASSIVES } from '../data/passives.js';
import { botFrom } from './strategies.js';
import { PICKS } from './picks.js';

const T = 16; // dungeon tile size (dungeon.js)
const CARD_NAMES = { bless: 'Blessing of Valor', heal: 'Roast Chicken', gold: 'Purse of Gold' };

export class Driver {
  // o: { bot: 'kite:r=60' | strategy, params, label, pick: 'build', hz: 60, rng }
  constructor(g, o = {}) {
    this.g = g;
    this.hz = o.hz || 60;
    this.dt = 1 / this.hz;
    this.ticks = 0;
    this.hits = 0;
    this.cause = null; // what dealt the killing blow
    this.bot = botFrom(o.bot ?? 'autopilot', o.params, o.label);
    this.pickName = o.pick || 'build';
    this.policy = PICKS[this.pickName];
    if (!this.policy) throw new Error(`Unknown pick policy "${this.pickName}" (try ${Object.keys(PICKS).join(', ')})`);
    this.view = new BotView(g, this, o.rng || Math.random);
    // Count every blow and remember the one that kills; the hero's own
    // hurt() still does all the work.
    const p = g.player, hurt = p.hurt;
    p.hurt = (amount, src) => {
      const dmg = hurt.call(p, amount, src);
      if (dmg > 0) {
        this.hits++;
        if (p.dead) this.cause = this.blame(src);
      }
      return dmg;
    };
    this.detach = () => {
      p.hurt = hurt;
    };
  }

  // One frame: the bot looks and acts, the game advances, then level-ups and
  // chests are settled. False once the run is over.
  step() {
    const g = this.g;
    if (g.state === 'over') return false;
    this.settle();
    const a = this.bot.tick(this.view.refresh()) || {};
    let x = Number(a.x) || 0, y = Number(a.y) || 0;
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    input.bot = { x, y };
    if (a.ult) input.virtual.add('ult');
    g.update(this.dt);
    input.virtual.clear();
    input.bot = null;
    this.ticks++;
    this.settle();
    return g.state !== 'over';
  }

  // Plays on for `seconds` of game time, or until the run ends.
  run(seconds) {
    const g = this.g, end = g.time + seconds;
    // The clock stops while dying, at dawn and on the stairs: bound the frames too.
    for (let n = Math.ceil(seconds * this.hz * 4) + 600; n > 0 && g.time < end && this.step(); n--);
    return this;
  }

  // What the game screen does between frames: every pending level-up (the
  // game waits on the cards), else one treasure chest, else one piece of gear.
  settle() {
    const g = this.g;
    if (g.state === 'chest') g.state = 'play';
    if ((g.state === 'play' || g.state === 'levelup') && g.pendingLevels > 0) {
      while (g.pendingLevels > 0) {
        const cards = g.levelChoices(g.choiceCount());
        g.applyChoice(cards[this.choose(cards)]);
        g.pendingLevels--;
      }
      g.state = 'play';
    } else if (g.state === 'play' && g.chestQueue.length) {
      // The roll gives what it holds, an evolution too, as the chest screen's does.
      const roll = g.rollChest(g.chestQueue.shift());
      g.gold += roll.gold;
      g.stats.gold += roll.gold;
    } else if (g.state === 'play' && g.itemQueue.length) {
      // Wear it unless something rarer is worn there.
      const it = g.itemQueue.shift(), worn = g.gear[it.slot];
      if (!worn || it.rarity >= worn.rarity) g.wearItem(it);
      else g.sellItem(it);
    }
  }

  // The bot's own pick if it makes a valid one, else the policy's.
  choose(cards) {
    const v = this.view.refresh(), shown = cards.map(cardInfo);
    const ok = (i) => Number.isInteger(i) && i >= 0 && i < cards.length;
    let i = this.bot.pick ? this.bot.pick(shown, v) : -1;
    if (!ok(i)) i = this.policy.pick(shown, v);
    return ok(i) ? i : 0;
  }

  // Who to blame for a blow: the foe that struck, the missile that landed, or
  // a blast (boss slams and other explosions).
  blame(src) {
    if (src) return src.elite && !src.boss ? 'elite ' + src.type : src.type;
    const p = this.g.player;
    for (const s of this.g.eshots) if ((s.x - p.x) ** 2 + (s.y - p.y) ** 2 < (s.r + p.r) ** 2) return s.kind;
    return 'blast';
  }

  // How the run went (so far).
  summary() {
    const g = this.g, p = g.player, s = g.stats;
    const won = g.result ? g.result.victory : g.state === 'dawn';
    return {
      outcome: won ? 'win' : p.dead ? 'dead' : 'alive',
      time: Math.round(g.time * 10) / 10,
      level: p.level,
      kills: g.kills,
      gold: g.gold,
      hp: Math.max(0, Math.round(p.hp)),
      maxHp: p.maxHp,
      damageTaken: s.damageTaken,
      hits: this.hits,
      fromBoss: s.fromBoss,
      fromMobs: s.fromMobs,
      fromShots: s.fromShots,
      minHp: Math.round(s.minHp * 1000) / 1000,
      cause: this.cause,
      bosses: s.bosses,
      bossLog: s.bossLog.map((b) => ({ ...b })),
      floor: g.floor,
      weapons: p.weapons.map((w) => `${w.id}:${w.level}`),
      passives: [...p.passives].map(([id, r]) => `${id}:${r}`),
      ticks: this.ticks,
    };
  }
}

function cardInfo(c) {
  const def = c.type === 'weapon' ? WEAPONS[c.id] : c.type === 'passive' ? PASSIVES[c.id] : null;
  return { type: c.type, id: c.id ?? c.type, name: def ? def.name : CARD_NAMES[c.type], level: c.level ?? 0, isNew: !!c.isNew, value: c.value ?? 0 };
}

const byDist = (a, b) => a.d - b.d;

// What a bot sees. Positions are world pixels; dx, dy point from the hero to
// the thing and d is that distance. Every query returns fresh plain objects,
// so a strategy can keep or change them without touching the game.
class BotView {
  constructor(g, driver, rng) {
    this.g = g;
    this.driver = driver;
    this.rng = rng; // the bot's own dice, apart from the game's
    this.dt = driver.dt;
    this.hero = g.player.id;
    this.mode = g.mode;
    this.world = new WorldView(g);
  }

  // Called before every tick and level-up card.
  refresh() {
    const g = this.g, p = g.player, b = g.boss;
    this.tick = this.driver.ticks;
    this.t = g.time; // seconds survived
    this.phase = g.phase; // how far the enemy mix and scaling have advanced
    this.state = g.state;
    this.kills = g.kills;
    this.gold = g.gold;
    this.me = {
      x: p.x,
      y: p.y,
      r: p.r,
      hp: p.hp,
      maxHp: p.maxHp,
      hpFrac: p.hp / p.maxHp,
      level: p.level,
      xp: p.xp,
      xpNext: p.xpNext,
      fury: p.fury,
      ultReady: p.fury >= 100 && !p.ult,
      ulting: !!p.ult,
      speed: p.moveSpeed,
      magnet: p.magnet,
      armor: p.armor,
      invuln: p.invuln > 0,
      weapons: p.weapons.map((w) => ({ id: w.id, level: w.level, evolved: w.evolved })),
      passives: Object.fromEntries(p.passives),
    };
    // The boss fight in progress, if any.
    this.boss = b && !b.dead && !b.sleeping ? this.foe(b) : null;
    return this;
  }

  // Awake foes within r, nearest first:
  // { x, y, dx, dy, d, r, hp, maxHp, type, boss, elite, dmg, speed, fly, rising }
  enemies(r = Infinity) {
    const p = this.g.player, out = [], r2 = r * r;
    for (const e of this.g.enemies) {
      if (e.dead || e.prop || e.sleeping) continue;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= r2) out.push(this.foe(e));
    }
    return out.sort(byDist);
  }

  // The closest awake foe within r, or null.
  nearest(r = Infinity) {
    const p = this.g.player;
    let best = null, bd = Infinity;
    for (const e of this.g.enemies) {
      if (e.dead || e.prop || e.sleeping) continue;
      const d2 = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d2 < bd) {
        bd = d2;
        best = e;
      }
    }
    return best && bd <= r * r ? this.foe(best) : null;
  }

  foe(e) {
    const p = this.g.player, dx = e.x - p.x, dy = e.y - p.y;
    return {
      x: e.x, y: e.y, dx, dy, d: Math.hypot(dx, dy), r: e.r, hp: e.hp, maxHp: e.maxHp, type: e.type,
      boss: e.boss, elite: e.elite, dmg: e.dmg, speed: e.spd, fly: !!e.def.fly, rising: e.spawnT > 0,
    };
  }

  // Enemy missiles within r, nearest first: { x, y, dx, dy, d, vx, vy, r, kind, dmg }
  shots(r = Infinity) {
    const p = this.g.player, out = [];
    for (const s of this.g.eshots) {
      const dx = s.x - p.x, dy = s.y - p.y, d = Math.hypot(dx, dy);
      if (!s.dead && d <= r) out.push({ x: s.x, y: s.y, dx, dy, d, vx: s.vx, vy: s.vy, r: s.r, kind: s.kind, dmg: s.dmg });
    }
    return out.sort(byDist);
  }

  // Telegraphed strikes that haven't landed yet, from their warning marks,
  // nearest first; left is the seconds until they do.
  //   { shape: 'circle', x, y, r, ... } or { shape: 'line', x, y, ang, len, w, ... }
  // with d the distance to the circle's centre or to the line.
  hazards(r = Infinity) {
    const p = this.g.player, out = [];
    for (const fx of this.g.effects) {
      const o = fx.o;
      if (!o || !o.shape) continue;
      const h = { shape: o.shape, x: o.x, y: o.y, left: o.dur - fx.t };
      let cx = o.x, cy = o.y;
      if (o.shape === 'line') {
        Object.assign(h, { ang: o.ang, len: o.len, w: o.w });
        const ux = Math.cos(o.ang), uy = Math.sin(o.ang);
        const k = Math.max(0, Math.min(o.len, (p.x - o.x) * ux + (p.y - o.y) * uy));
        cx = o.x + ux * k;
        cy = o.y + uy * k;
      } else h.r = o.r;
      h.dx = cx - p.x;
      h.dy = cy - p.y;
      h.d = Math.hypot(h.dx, h.dy);
      if (h.d <= r) out.push(h);
    }
    return out.sort(byDist);
  }

  // Things to pick up within r, nearest first: { x, y, dx, dy, d, kind, value, pulled }.
  // kind: gem (value = XP), coin, goldpile, potion, elixir, magnet, relic,
  // frostrune, fury, chest. Pulled ones are already flying to the hero.
  pickups(r = Infinity) {
    const p = this.g.player, out = [], r2 = r * r;
    for (const pk of this.g.pickups) {
      const dx = pk.x - p.x, dy = pk.y - p.y, d2 = dx * dx + dy * dy;
      if (!pk.dead && d2 <= r2) out.push({ x: pk.x, y: pk.y, dx, dy, d: Math.sqrt(d2), kind: pk.kind, value: pk.value, pulled: pk.pulled });
    }
    return out.sort(byDist);
  }
}

// The map, for bots that need to find their way: the forest is open ground,
// the dungeon has walls, a sealed guardian and, once it falls, stairs.
class WorldView {
  constructor(g) {
    this.g = g;
    this.flow = null;
    this.flowOf = null;
    this.flowKey = '';
  }

  get dungeon() {
    return this.g.mode === 'dungeon';
  }

  get floor() {
    return this.g.floor;
  }

  get objective() {
    return this.g.objective;
  }

  solid(x, y) {
    return this.g.world.solid(x, y);
  }

  sight(x0, y0, x1, y1) {
    return this.g.world.lineOfSight(x0, y0, x1, y1);
  }

  get stairs() {
    const s = this.g.world.stairs;
    return s ? { x: s.x, y: s.y } : null;
  }

  get guardian() {
    const w = this.g.world, e = w.guardian;
    return e && !e.dead ? { x: e.x, y: e.y, sleeping: e.sleeping, sealed: !!w.sealed } : null;
  }

  // Unit heading for the next step of the shortest walkable path to (x, y),
  // or null when already there or it can't be reached.
  path(x, y) {
    const w = this.g.world, p = this.g.player;
    if (!w.bfs) {
      const dx = x - p.x, dy = y - p.y, l = Math.hypot(dx, dy);
      return l > 1 ? { x: dx / l, y: dy / l } : null;
    }
    // A distance field rooted at the goal tile, rebuilt when the goal moves.
    const gx = Math.floor(x / T), gy = Math.floor(y / T), key = gx + ',' + gy;
    if (this.flowOf !== w || this.flowKey !== key) {
      this.flow = w.bfs(gx, gy, this.flowOf === w ? this.flow : new Int16Array(w.W * w.H));
      this.flowOf = w;
      this.flowKey = key;
    }
    const f = this.flow, W = w.W, tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
    let best = -1, bd = f[ty * W + tx];
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const i = (ty + oy) * W + tx + ox, d = f[i];
        if (d >= 0 && d < bd) {
          bd = d;
          best = i;
        }
      }
    }
    if (best < 0) return null;
    const dx = (best % W) * T + T / 2 - p.x, dy = Math.floor(best / W) * T + T / 2 - p.y, l = Math.hypot(dx, dy) || 1;
    return { x: dx / l, y: dy / l };
  }
}
