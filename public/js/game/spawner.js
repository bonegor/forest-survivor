// Decides what to spawn and when: the steady horde, timed events, champions,
// treasure thieves, breakables, shrines and survival bosses. None of it inside a
// crypt, where the night stands still; a crypt brings its own packs and lords.

import { EVENTS, SWARM_BATCH, batchEvents, targetCount, monsterHp, minuteOf, pocketAt, SURVIVAL_BOSSES, RANKED_BOSSES, RANKED_BOSS_EVERY, RANKED_EVENT_EVERY, PROP_SITES } from '../data/waves.js';
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

// The owner's (21 October 2026): "late game should have more monsters ... for every minute passed,
// increase the monster generation by 5%": the horde grows by PER_MINUTE of its first size each
// minute of the night (1.75 times it at 15:00), the steady horde and the timed swarms alike.
export const PER_MINUTE = 0.05;
export const minuteMore = (phase) => 1 + PER_MINUTE * minuteOf(phase);

// All the more the run sends: a minute's growth (minuteMore), Normal's late horde (lateMore) and,
// on a Nightmare, three times as many again (difficulty.js NIGHTMARE), on Veteran only. Never on
// Ranked (Game.nightmare).
export const hordeMore = (g, phase) => minuteMore(phase) * lateMore(g.diff, phase) * (g.nightmare ? NIGHTMARE.more : 1) * (1 + 0.25 * (g.skulls || 0));

// "make it more wave like, the generation of monsters ... it is too constant", then "not full on
// waves, just occasionally ... base line, + wave every once in a while" (21 October 2026): the
// steady horde keeps its size, and every WAVE.every seconds of the night (the first at WAVE.first)
// a wave swells it for WAVE.length seconds, up to 1 + WAVE.peak times at its height, then lets it
// go back down. A wave fills the field fast; once it passes, nothing more comes until the hero has
// thinned it back to its size.
// A timed swarm's stream: how wide across its way and how deep along it (the owner's "slightly less
// clumped up", 22 October 2026; it was 120 x 20).
export const SWARM_SPREAD = { wide: 170, deep: 70 };

export const WAVE = { first: 45, every: 75, length: 15, peak: 0.6 };
export function waveAt(t) {
  const s = t - WAVE.first;
  if (s < 0) return 1;
  const into = s % WAVE.every;
  return into < WAVE.length ? 1 + WAVE.peak * Math.sin((into / WAVE.length) * Math.PI) : 1;
}

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
    this.loopAt = 0; // Ranked: next looping event, in phase minutes (put in events when near)
    this.warnIdx = 0; // the next of events to announce (warn)
    this.warned = new Map(); // events index -> the announced copy, its side rolled
    this._events = null;
  }

  // The night's timed events, every swarm a batch (data/waves.js batchEvents), rolled once a run
  // the first time they are asked for: by then the mode and the floor are set, and with them how
  // far the phase moves in SWARM_BATCH.gap seconds.
  get events() {
    if (!this._events) this._events = this.batch(EVENTS);
    return this._events;
  }

  // Events with every swarm made a batch (data/waves.js batchEvents), its swarms SWARM_BATCH.gap
  // game seconds apart at the pace the phase moves now.
  batch(list) {
    const per = (this.phaseAfter(60) - this.g.phase) / 60;
    return batchEvents(() => randi(SWARM_BATCH.min, SWARM_BATCH.max), SWARM_BATCH.gap * per, list);
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
    this.g.warnings = [];
  }

  resetForFloor(phase0) {
    this.eventIdx = this.events.findIndex((e) => e.at >= phase0 + 1.5);
    if (this.eventIdx < 0) this.eventIdx = this.events.length;
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
  // dungeon floor, and Normal's late horde and a Nightmare's triple on top (hordeMore).
  target(phase) {
    const g = this.g;
    return targetCount(phase) * g.diff.spawn * (g.mode === 'dungeon' ? 0.9 : 1) * hordeMore(g, phase);
  }

  // What it keeps up right now: target, and more while a wave is on (waveAt).
  waveTarget(phase) {
    return this.target(phase) * waveAt(this.g.time);
  }

  update(dt) {
    const g = this.g;
    if (g.calm > 0 || g.inCrypt) return; // e.g. dawn, descending, a crypt
    const phase = g.phase;

    // Steady horde, in waves.
    const target = this.waveTarget(phase);
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
    const events = this.events;
    // Ranked, once the night's are spent: one of its later events again every RANKED_EVENT_EVERY,
    // growing past phase 30, put at the end of the list (a swarm as a whole batch), where it is
    // announced and comes like the night's own.
    if (g.mode === 'ranked' && this.eventIdx >= events.length) {
      if (!this.loopAt) this.loopAt = phase + RANKED_EVENT_EVERY;
      if (soon >= this.loopAt) {
        const ev = pick(EVENTS.filter((e) => e.at >= 18));
        events.push(...this.batch([{ ...ev, at: this.loopAt, count: Math.round(ev.count * (1 + Math.max(0, phase - 30) * 0.04)) }]));
        this.loopAt = 0;
      }
    }
    while (this.warnIdx < events.length && events[this.warnIdx].at <= soon) {
      const i = this.warnIdx++;
      this.warned.set(i, this.warn({ ...events[i] }));
    }
    while (this.eventIdx < events.length && events[this.eventIdx].at <= phase) {
      const i = this.eventIdx++;
      this.fire(this.warned.get(i) || events[i], phase);
      this.warned.delete(i);
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
        // A stream crossing the screen, from the side its warning showed: SWARM_SPREAD.wide px
        // across and up to .deep px deep, so it comes loose rather than as one clump.
        const a = ev.dir ?? rand(TAU);
        const dx = Math.cos(a), dy = Math.sin(a);
        const R = Math.hypot(cam.W, cam.H) * 0.55;
        const sx = p.x - dx * R, sy = p.y - dy * R;
        for (let i = 0; i < ev.count; i++) {
          const off = (i / ev.count - 0.5) * SWARM_SPREAD.wide + rand(-8, 8), back = rand(SWARM_SPREAD.deep);
          const x = sx - dy * off - dx * back, y = sy + dx * off - dy * back;
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
