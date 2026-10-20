// Decides what to spawn and when: the steady horde, timed events, champions,
// treasure thieves, breakables, shrines and survival bosses. None of it inside a
// crypt, where the night stands still; a crypt brings its own packs and lords.

import { EVENTS, targetCount, monsterHp, minuteOf, pocketAt, SURVIVAL_BOSSES, RANKED_BOSSES, RANKED_BOSS_EVERY, RANKED_EVENT_EVERY, PROP_SITES } from '../data/waves.js';
import { ARRIVAL } from './arrival.js';
import { WARN } from './events.js';
import { ENEMIES, CHAMPION_PREFIX, CHAMPION_SUFFIX, CHAMPION_TITLE, CHAMPION_MODS } from '../data/enemies.js';
import { rand, randi, pick, weighted, TAU, chance } from '../engine/util.js';
import { sfx } from '../engine/audio.js';
import { NIGHTMARE } from '../data/difficulty.js';

const SHRINE_TYPES = ['fury', 'haste', 'fortune', 'wisdom', 'protection'];

// The monsters that shoot (Cultists) or lunge (Dire Wolves, Orc Brutes, Hellhounds), of which
// Normal sends a third as many (difficulty.js few).
export const isFew = (type) => !!(ENEMIES[type]?.shot || ENEMIES[type]?.charge);

// How many times the night's monsters the rules send at a phase: Normal's late horde, 30% more
// from minute 9 of the night on (difficulty.js late), in the steady horde and the timed swarms,
// rings and packs alike. Veteran (and so Ranked) never.
export const lateMore = (diff, phase) => (diff.late && minuteOf(phase) >= diff.late.from ? diff.late.more : 1);

// All the more the run sends: Normal's late horde (lateMore) and, on a Nightmare, twice as many
// again (difficulty.js NIGHTMARE), on either difficulty. Never on Ranked (Game.nightmare).
export const hordeMore = (g, phase) => lateMore(g.diff, phase) * (g.nightmare ? NIGHTMARE.more : 1);

export class Spawner {
  constructor(g) {
    this.g = g;
    this.acc = 0.6;
    this.eventIdx = 0;
    this.eliteT = 95;
    this.thiefT = rand(140, 220);
    this.propT = 4;
    this.shrineT = 45;
    this.bossIdx = 0;
    this.loopAt = 0; // Ranked: next looping event, in phase minutes
    this.loopEv = null; // Ranked: that event, rolled and announced (warn)
    this.warnIdx = 0; // the next of EVENTS to announce (warn)
    this.warned = new Map(); // EVENTS index -> the announced copy, its side rolled
  }

  // The phase `s` game seconds from now (the clock and a Dungeon floor's clock alike).
  phaseAfter(s) {
    const g = this.g, t = g.time, f = g.floorTime;
    g.time += s;
    g.floorTime += s;
    const ph = g.phase;
    g.time = t;
    g.floorTime = f;
    return ph;
  }

  // An event about to come (events.js): its side rolled now and kept for its coming, and told.
  warn(ev) {
    const g = this.g, p = g.player;
    if (ev.type === 'swarm') ev.dir = rand(TAU);
    else if (ev.type === 'pack') {
      const pt = g.world.spawnPoint(g, 30);
      if (pt) ev.off = [pt.x - p.x, pt.y - p.y];
    }
    g.eventWarning(ev);
    return ev;
  }

  // Back to a phase (setTime, a new floor): what comes next is announced afresh.
  rewarn() {
    this.warnIdx = this.eventIdx;
    this.warned.clear();
    this.loopEv = null;
    this.g.warnings = [];
  }

  resetForFloor(phase0) {
    this.eventIdx = EVENTS.findIndex((e) => e.at >= phase0 + 1.5);
    if (this.eventIdx < 0) this.eventIdx = EVENTS.length;
    this.loopAt = 0;
    this.eliteT = 60;
    this.thiefT = rand(90, 170);
    this.acc = 1.5;
    this.rewarn();
  }

  // One of the monsters the current pocket of the night allows, by weight. Where the rules send
  // fewer of those that shoot or lunge, one picked comes only that often (few); otherwise another
  // kind comes in its place, so the horde is as big and they are that many times fewer.
  pickType(phase, exclude) {
    const rows = Object.entries(pocketAt(minuteOf(phase)).spawn).filter(([type]) => !exclude || !exclude.includes(type));
    let r = weighted(rows, (row) => row[1]);
    const few = this.g.diff.few;
    if (r && few < 1 && isFew(r[0]) && Math.random() >= few) {
      const rest = rows.filter(([type]) => !isFew(type));
      if (rest.length) r = weighted(rest, (row) => row[1]);
    }
    return r ? r[0] : 'skeleton';
  }

  stats(phase) {
    const d = this.g.diff;
    return { hpMul: monsterHp(phase, this.g.mode) * d.hp, dmgMul: 1 };
  }

  // How many foes the steady horde keeps up at a phase: the rules' numbers, a tenth fewer on a
  // dungeon floor, and Normal's late horde and a Nightmare's double on top (hordeMore).
  target(phase) {
    const g = this.g;
    return targetCount(phase) * g.diff.spawn * (g.mode === 'dungeon' ? 0.9 : 1) * hordeMore(g, phase);
  }

  update(dt) {
    const g = this.g;
    if (g.calm > 0 || g.inCrypt) return; // e.g. dawn, descending, a crypt
    const phase = g.phase;

    // Steady horde.
    const target = this.target(phase);
    this.acc -= dt;
    if (this.acc <= 0) {
      const alive = g.hostileCount;
      const deficit = target - alive;
      this.acc = deficit > target * 0.5 ? 0.18 : deficit > 0 ? 0.4 : 1.2;
      if (deficit > 0) {
        const n = Math.min(Math.ceil(deficit), 3 + Math.floor(phase * 0.7));
        const st = this.stats(phase);
        for (let i = 0; i < n; i++) {
          const type = this.pickType(phase);
          const pt = g.world.spawnPoint(g);
          if (!pt) break;
          const pack = type === 'goblin' ? 3 : 1;
          for (let k = 0; k < pack; k++) g.spawnEnemy(type, pt.x + rand(-8, 8), pt.y + rand(-8, 8), st);
        }
      }
    }

    // Timed events, each announced WARN.lead real seconds before (warn).
    const soon = this.phaseAfter(WARN.lead * g.pace);
    if (this.warnIdx < this.eventIdx) this.warnIdx = this.eventIdx;
    while (this.warnIdx < EVENTS.length && EVENTS[this.warnIdx].at <= soon) {
      const i = this.warnIdx++;
      this.warned.set(i, this.warn({ ...EVENTS[i] }));
    }
    while (this.eventIdx < EVENTS.length && EVENTS[this.eventIdx].at <= phase) {
      const i = this.eventIdx++;
      this.fire(this.warned.get(i) || EVENTS[i], phase);
      this.warned.delete(i);
    }
    if (g.mode === 'ranked' && this.eventIdx >= EVENTS.length) {
      if (!this.loopAt) this.loopAt = phase + RANKED_EVENT_EVERY;
      if (!this.loopEv && soon >= this.loopAt) {
        const ev = pick(EVENTS.filter((e) => e.at >= 18));
        this.loopEv = this.warn({ ...ev, count: Math.round(ev.count * (1 + Math.max(0, phase - 30) * 0.04)) });
      }
      if (phase >= this.loopAt) {
        this.loopAt = phase + RANKED_EVENT_EVERY;
        this.fire(this.loopEv || pick(EVENTS.filter((e) => e.at >= 18)), phase);
        this.loopEv = null;
      }
    }

    // Champions.
    this.eliteT -= dt * g.diff.elite;
    if (this.eliteT <= 0) {
      this.eliteT = rand(105, 140);
      this.spawnElite(phase);
    }

    // Treasure thief.
    this.thiefT -= dt;
    if (this.thiefT <= 0) {
      this.thiefT = rand(170, 260);
      if (chance(0.75)) this.spawnThief(phase);
    }

    // Breakables (data/waves.js PROP_SITES), and shrines where the world doesn't place its own.
    if (g.mode !== 'dungeon') {
      this.propT -= dt;
      if (this.propT <= 0) {
        this.propT = rand(...PROP_SITES.every);
        if (g.propCount < PROP_SITES.most) this.spawnProps();
      }
      this.shrineT -= dt;
      if (this.shrineT <= 0 && !g.world.mapShrines) {
        this.shrineT = rand(95, 135);
        if (g.shrines.filter((s) => !s.used).length < 2) {
          const a = rand(TAU), r = rand(170, 230);
          g.addShrine(g.player.x + Math.cos(a) * r, g.player.y + Math.sin(a) * r, pick(SHRINE_TYPES));
        }
      }
      if (g.mode === 'ranked') {
        // One lord at a time; the next waits until the last has fallen.
        // A boss that can't be placed this frame is tried again the next, not skipped.
        if (g.time >= (this.bossIdx + 1) * RANKED_BOSS_EVERY && (!g.boss || g.boss.dead)) {
          const pt = g.world.spawnPoint(g, 30);
          if (pt && g.spawnBoss(RANKED_BOSSES[this.bossIdx % RANKED_BOSSES.length], pt.x, pt.y)) this.bossIdx++;
        }
      }
      const bosses = SURVIVAL_BOSSES[g.mode];
      // Something stirs in the dark ARRIVAL.stir real seconds before a night's boss comes.
      if (bosses && this.bossIdx < bosses.length && g.stirFor !== this.bossIdx && g.time >= bosses[this.bossIdx].at - ARRIVAL.stir * g.pace) {
        g.stirFor = this.bossIdx;
        g.bossStir(bosses[this.bossIdx].id);
      }
      if (bosses && this.bossIdx < bosses.length && g.time >= bosses[this.bossIdx].at) {
        const pt = g.world.spawnPoint(g, 30);
        if (pt && g.spawnBoss(bosses[this.bossIdx].id, pt.x, pt.y)) this.bossIdx++;
      }
    }
  }

  // A timed swarm, ring or pack. At the cap of monsters it comes in full all the same (sent:
  // Game.recycleFar), each of them in the place of one off the screen.
  fire(ev, phase) {
    const g = this.g, p = g.player;
    g.warnings = g.warnings.filter((w) => w.ev !== ev);
    ev = { ...ev, count: Math.max(1, Math.round(ev.count * g.diff.horde * (isFew(ev.enemy) ? g.diff.few : 1) * hordeMore(g, phase))) };
    const st = this.stats(phase);
    const cam = g.cam;
    switch (ev.type) {
      case 'ring': {
        const R = Math.hypot(cam.W, cam.H) * 0.5 + 10;
        let placed = 0;
        for (let i = 0; i < ev.count; i++) {
          const a = (i / ev.count) * TAU;
          const spot = g.world.freeSpot(p.x + Math.cos(a) * R, p.y + Math.sin(a) * R * 0.85);
          if (!spot) continue;
          g.spawnEnemy(ev.enemy, spot.x, spot.y, { ...st, instant: true, aware: true, sent: true });
          placed++;
        }
        // (Its banner came with its warning.)
        break;
      }
      case 'swarm': {
        // A dense stream crossing the screen, from the side its warning showed.
        const a = ev.dir ?? rand(TAU);
        const dx = Math.cos(a), dy = Math.sin(a);
        const R = Math.hypot(cam.W, cam.H) * 0.55;
        const sx = p.x - dx * R, sy = p.y - dy * R;
        for (let i = 0; i < ev.count; i++) {
          const off = (i / ev.count - 0.5) * 120;
          const x = sx - dy * off + rand(-10, 10), y = sy + dx * off + rand(-10, 10);
          const e = g.spawnEnemy(ev.enemy, x, y, { ...st, instant: true, lock: [dx, dy], lockT: 6, aware: true, sent: true });
          if (e) e.spd *= 1.2;
        }
        sfx('charge');
        break;
      }
      case 'pack': {
        // Where its warning pointed (as far from the hero as then), or a spawn point.
        const pt = ev.off ? g.world.freeSpot(p.x + ev.off[0], p.y + ev.off[1]) || g.world.spawnPoint(g, 30) : g.world.spawnPoint(g, 30);
        if (!pt) break;
        for (let i = 0; i < ev.count; i++) g.spawnEnemy(ev.enemy, pt.x + rand(-20, 20), pt.y + rand(-20, 20), { ...st, aware: true, sent: true });
        break;
      }
      default:
        break;
    }
  }

  spawnElite(phase) {
    const g = this.g;
    const type = this.pickType(phase, ['bat', 'slimelet', 'rat']);
    const pt = g.world.spawnPoint(g, 20);
    if (!pt) return;
    const mod = pick(CHAMPION_MODS);
    const name = `${pick(CHAMPION_PREFIX)}${pick(CHAMPION_SUFFIX)} ${pick(CHAMPION_TITLE)}`;
    const st = this.stats(phase);
    const e = g.spawnEnemy(type, pt.x, pt.y, {
      hpMul: st.hpMul * 13 * (mod.id === 'stone' ? 1.4 : 1),
      dmgMul: 1.3,
      elite: true,
      mod,
      name,
      sent: true,
    });
    if (e) {
      e.xp *= 8;
      g.banner(name, `${mod.name} champion`, mod.color, 2.2);
      sfx('charge');
    }
  }

  // A crypt's lord: a named Skeleton Archer, drawn boss-sized, asleep in a room of its own until the
  // hero comes, at its own health whenever the crypt is entered (data/enemies.js) as the difficulty
  // weighs it (difficulty.js health: 20% more, as every monster since 20 October 2026, and on
  // Normal 70% less on top), and never Stoneskin, which would take a third off every blow.
  spawnLord(x, y) {
    const g = this.g;
    const mod = pick(CHAMPION_MODS.filter((m) => m.id !== 'stone'));
    const name = `${pick(CHAMPION_PREFIX)}${pick(CHAMPION_SUFFIX)} ${pick(CHAMPION_TITLE)}`;
    const e = g.spawnEnemy('skeletonarcher', x, y, {
      hpMul: g.diff.health,
      dmgMul: 1.5,
      elite: true,
      lord: true,
      mod,
      name,
      scale: 1,
      instant: true,
      sleeping: true,
    });
    if (e) e.xp *= 20;
    return e;
  }

  spawnThief(phase) {
    const g = this.g, p = g.player;
    const a = rand(TAU);
    const spot = g.world.freeSpot(p.x + Math.cos(a) * 120, p.y + Math.sin(a) * 100);
    if (!spot) return;
    const e = g.spawnEnemy('thief', spot.x, spot.y, { hpMul: monsterHp(phase, g.mode) * g.diff.hp, instant: true, sent: true });
    if (e) {
      g.banner('A Gilded Thief!', 'Catch it before it escapes!', '#feae34', 2);
      sfx('coin');
    }
  }

  // A site of 2-5 breakables (data/waves.js PROP_SITES): barrels and crates, urns, or a lantern
  // among barrels and crates. Ahead of the hero on the move; anywhere around him while he stands
  // still, never on him.
  spawnProps() {
    const g = this.g, p = g.player;
    const moving = Math.hypot(p.vx, p.vy) > 1;
    const a = moving ? Math.atan2(p.vy, p.vx) + rand(-1, 1) : rand(TAU);
    const r = rand(190, 260);
    const cx = p.x + Math.cos(a) * r, cy = p.y + Math.sin(a) * r;
    const roll = Math.random();
    const kind = roll < 0.3 ? 'lantern' : roll < 0.8 ? 'box' : 'urn';
    const n = randi(...PROP_SITES.boxes), spots = [];
    for (let i = 0; i < n; i++) {
      // Side by side rather than on top of one another: a few tries for a spot clear of the rest.
      let x = cx, y = cy;
      for (let t = 0; t < 6; t++) {
        x = cx + rand(-16, 16);
        y = cy + rand(-11, 11);
        if (spots.every(([sx, sy]) => (sx - x) ** 2 + (sy - y) ** 2 >= 81)) break;
      }
      spots.push([x, y]);
      g.spawnProp(kind === 'urn' ? 'urn' : kind === 'lantern' && i === 0 ? 'lantern' : chance(0.5) ? 'barrel' : 'crate', x, y);
    }
  }
}
