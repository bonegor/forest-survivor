// Decides what to spawn and when: the steady horde, timed events, champions,
// treasure thieves, breakables, shrines and survival bosses.

import { SPAWN_TABLE, EVENTS, targetCount, hpScale, SURVIVAL_BOSSES } from '../data/waves.js';
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
  }

  resetForFloor(phase0) {
    this.eventIdx = EVENTS.findIndex((e) => e.at >= phase0 + 1.5);
    if (this.eventIdx < 0) this.eventIdx = EVENTS.length;
    this.eliteT = 60;
    this.thiefT = rand(90, 170);
    this.acc = 1.5;
  }

  pickType(phase, exclude) {
    const rows = SPAWN_TABLE.filter((r) => phase >= r[0] && phase < r[1] && (!exclude || !exclude.includes(r[2])));
    const r = weighted(rows, (row) => row[3]);
    return r ? r[2] : 'skeleton';
  }

  stats(phase) {
    const d = this.g.diff;
    return { hpMul: hpScale(phase) * d.hp, dmgMul: 1 };
  }

  update(dt) {
    const g = this.g;
    if (g.calm > 0) return; // e.g. dawn, descending
    const phase = g.phase;

    // Steady horde.
    const target = targetCount(phase) * g.diff.spawn * (g.mode === 'dungeon' ? 0.8 : 1);
    this.acc -= dt;
    if (this.acc <= 0) {
      const alive = g.hostileCount;
      const deficit = target - alive;
      this.acc = deficit > target * 0.5 ? 0.22 : deficit > 0 ? 0.5 : 1.2;
      if (deficit > 0) {
        const n = Math.min(Math.ceil(deficit), 2 + Math.floor(phase / 3));
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

    // Breakables and shrines (the dungeon places its own).
    if (g.mode !== 'dungeon') {
      this.propT -= dt;
      if (this.propT <= 0) {
        this.propT = rand(16, 26);
        if (g.propCount < 10) this.spawnProps();
      }
      this.shrineT -= dt;
      if (this.shrineT <= 0) {
        this.shrineT = rand(95, 135);
        if (g.shrines.filter((s) => !s.used).length < 2) {
          const a = rand(TAU), r = rand(170, 230);
          g.addShrine(g.player.x + Math.cos(a) * r, g.player.y + Math.sin(a) * r, pick(SHRINE_TYPES));
        }
      }
      const bosses = SURVIVAL_BOSSES[g.mode];
      if (bosses && this.bossIdx < bosses.length && g.time >= bosses[this.bossIdx].at) {
        const id = bosses[this.bossIdx++].id;
        const pt = g.world.spawnPoint(g, 30);
        g.spawnBoss(id, pt.x, pt.y);
      }
    }
  }

  fire(ev, phase) {
    const g = this.g, p = g.player;
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
          if (e) e.spd *= 1.4;
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

  spawnThief(phase) {
    const g = this.g, p = g.player;
    const a = rand(TAU);
    const spot = g.world.freeSpot(p.x + Math.cos(a) * 120, p.y + Math.sin(a) * 100);
    if (!spot) return;
    const e = g.spawnEnemy('thief', spot.x, spot.y, { hpMul: hpScale(phase) * g.diff.hp, instant: true });
    if (e) {
      g.banner('A Gilded Thief!', 'Catch it before it escapes!', '#feae34', 2);
      sfx('coin');
    }
  }

  spawnProps() {
    const g = this.g, p = g.player;
    const a = Math.atan2(p.vy, p.vx) + rand(-1, 1);
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
