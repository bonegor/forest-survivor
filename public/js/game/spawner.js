// Decides what to spawn and when: the steady horde, timed events, champions,
// treasure thieves, breakables, shrines and survival bosses. None of it inside a
// crypt, where the night stands still; a crypt brings its own packs and lord.

import { EVENTS, targetCount, monsterHp, minuteOf, pocketAt, SURVIVAL_BOSSES, RANKED_BOSSES, RANKED_BOSS_EVERY, RANKED_EVENT_EVERY } from '../data/waves.js';
import { CHAMPION_PREFIX, CHAMPION_SUFFIX, CHAMPION_TITLE, CHAMPION_MODS } from '../data/enemies.js';
import { rand, pick, weighted, TAU, chance } from '../engine/util.js';
import { sfx } from '../engine/audio.js';

const SHRINE_TYPES = ['fury', 'haste', 'fortune', 'wisdom', 'protection'];

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
  }

  resetForFloor(phase0) {
    this.eventIdx = EVENTS.findIndex((e) => e.at >= phase0 + 1.5);
    if (this.eventIdx < 0) this.eventIdx = EVENTS.length;
    this.loopAt = 0;
    this.eliteT = 60;
    this.thiefT = rand(90, 170);
    this.acc = 1.5;
  }

  // One of the monsters the current pocket of the night allows, by weight.
  pickType(phase, exclude) {
    const rows = Object.entries(pocketAt(minuteOf(phase)).spawn).filter(([type]) => !exclude || !exclude.includes(type));
    const r = weighted(rows, (row) => row[1]);
    return r ? r[0] : 'skeleton';
  }

  stats(phase) {
    const d = this.g.diff;
    return { hpMul: monsterHp(phase, this.g.mode) * d.hp, dmgMul: 1 };
  }

  update(dt) {
    const g = this.g;
    if (g.calm > 0 || g.inCrypt) return; // e.g. dawn, descending, a crypt
    const phase = g.phase;

    // Steady horde.
    const target = targetCount(phase) * g.diff.spawn * (g.mode === 'dungeon' ? 0.9 : 1);
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

    // Timed events.
    while (this.eventIdx < EVENTS.length && EVENTS[this.eventIdx].at <= phase) {
      this.fire(EVENTS[this.eventIdx++], phase);
    }
    if (g.mode === 'ranked' && this.eventIdx >= EVENTS.length) {
      if (!this.loopAt) this.loopAt = phase + RANKED_EVENT_EVERY;
      if (phase >= this.loopAt) {
        this.loopAt = phase + RANKED_EVENT_EVERY;
        const ev = pick(EVENTS.filter((e) => e.at >= 18));
        this.fire({ ...ev, count: Math.round(ev.count * (1 + Math.max(0, phase - 30) * 0.04)) }, phase);
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

    // Breakables, and shrines where the world doesn't place its own.
    if (g.mode !== 'dungeon') {
      this.propT -= dt;
      if (this.propT <= 0) {
        this.propT = rand(16, 26);
        if (g.propCount < 10) this.spawnProps();
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
      if (bosses && this.bossIdx < bosses.length && g.time >= bosses[this.bossIdx].at) {
        const pt = g.world.spawnPoint(g, 30);
        if (pt && g.spawnBoss(bosses[this.bossIdx].id, pt.x, pt.y)) this.bossIdx++;
      }
    }
  }

  fire(ev, phase) {
    const g = this.g, p = g.player;
    ev = { ...ev, count: Math.round(ev.count * g.diff.horde) };
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
          g.spawnEnemy(ev.enemy, spot.x, spot.y, { ...st, instant: true });
          placed++;
        }
        if (placed) g.banner('You are surrounded!', '', '#e43b44', 1.6);
        break;
      }
      case 'swarm': {
        // A dense stream crossing the screen.
        const a = rand(TAU);
        const dx = Math.cos(a), dy = Math.sin(a);
        const R = Math.hypot(cam.W, cam.H) * 0.55;
        const sx = p.x - dx * R, sy = p.y - dy * R;
        for (let i = 0; i < ev.count; i++) {
          const off = (i / ev.count - 0.5) * 120;
          const x = sx - dy * off + rand(-10, 10), y = sy + dx * off + rand(-10, 10);
          const e = g.spawnEnemy(ev.enemy, x, y, { ...st, instant: true, lock: [dx, dy], lockT: 6 });
          if (e) e.spd *= 1.2;
        }
        sfx('charge');
        break;
      }
      case 'pack': {
        const pt = g.world.spawnPoint(g, 30);
        if (!pt) break;
        for (let i = 0; i < ev.count; i++) g.spawnEnemy(ev.enemy, pt.x + rand(-20, 20), pt.y + rand(-20, 20), st);
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
    });
    if (e) {
      e.xp *= 8;
      g.banner(name, `${mod.name} champion`, mod.color, 2.2);
      sfx('charge');
    }
  }

  // A crypt's lord: a named Skeleton Archer, drawn boss-sized, asleep in the last room until the
  // hero comes, at its own health whenever the crypt is entered (data/enemies.js), and never
  // Stoneskin, which would take a third off every blow.
  spawnLord(x, y) {
    const g = this.g;
    const mod = pick(CHAMPION_MODS.filter((m) => m.id !== 'stone'));
    const name = `${pick(CHAMPION_PREFIX)}${pick(CHAMPION_SUFFIX)} ${pick(CHAMPION_TITLE)}`;
    const e = g.spawnEnemy('skeletonarcher', x, y, {
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
    const e = g.spawnEnemy('thief', spot.x, spot.y, { hpMul: monsterHp(phase, g.mode) * g.diff.hp, instant: true });
    if (e) {
      g.banner('A Gilded Thief!', 'Catch it before it escapes!', '#feae34', 2);
      sfx('coin');
    }
  }

  spawnProps() {
    const g = this.g, p = g.player;
    // Ahead of the hero on the move; anywhere around him while he stands still.
    const moving = Math.hypot(p.vx, p.vy) > 1;
    const a = moving ? Math.atan2(p.vy, p.vx) + rand(-1, 1) : rand(TAU);
    const r = rand(190, 260);
    const cx = p.x + Math.cos(a) * r, cy = p.y + Math.sin(a) * r;
    const roll = Math.random();
    if (roll < 0.3) g.spawnProp('lantern', cx, cy);
    else if (roll < 0.8) {
      const n = Math.floor(rand(2, 5));
      for (let i = 0; i < n; i++) g.spawnProp(chance(0.5) ? 'barrel' : 'crate', cx + rand(-14, 14), cy + rand(-10, 10));
    } else {
      for (let i = 0; i < 3; i++) g.spawnProp('urn', cx + rand(-12, 12), cy + rand(-8, 8));
    }
  }
}
