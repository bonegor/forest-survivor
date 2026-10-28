// Decides what to spawn and when: the steady horde, timed events, champions,
// treasure thieves, breakables, shrines and survival bosses. None of it inside a
// crypt, where the night stands still; a crypt brings its own packs and lords.

import { EVENTS, LAST_STAND, kindsBy, SWARM_BATCH, batchEvents, HORDE_RATE, HORDE_CAP, hordeRate, monsterHp, minuteOf, pocketAt, SURVIVAL_BOSSES, RANKED_BOSSES, RANKED_BOSS_EVERY, RANKED_EVENT_EVERY, PROP_SITES } from '../data/waves.js';
import { ARRIVAL } from './arrival.js';
import { WARN } from './events.js';
import { ENEMIES, CHAMPION_PREFIX, CHAMPION_SUFFIX, CHAMPION_TITLE, CHAMPION_MODS } from '../data/enemies.js';
import { rand, randi, pick, weighted, TAU, chance } from '../engine/util.js';
import { sfx } from '../engine/audio.js';
import { NIGHTMARE } from '../data/difficulty.js';
import { PACE_OF } from './enemies.js';

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
export const hordeMore = (g, phase) => minuteMore(phase) * lateMore(g.diff, phase) * runMore(g);
// The run's own part of it: a Nightmare's triple and a quarter more for each Cursed Skull.
export const runMore = (g) => (g.nightmare ? NIGHTMARE.more : 1) * (1 + 0.25 * (g.skulls || 0));

// "make it more wave like, the generation of monsters ... it is too constant", then "not full on
// waves, just occasionally ... base line, + wave every once in a while" (21 October 2026): the
// steady horde comes at its rate, and every WAVE.every seconds of the night (the first at
// WAVE.first) a wave swells that rate for WAVE.length seconds, up to 1 + WAVE.peak times at its
// height, then lets it go back down. Since the horde comes at a rate (26 October 2026; it kept a
// number standing, a wave 1.6 times it) the peak is 1.5, not 0.6: a wave brings about 14 seconds'
// worth more over its 15, about what the old one poured in at once at minute 5, and what it brings
// stays for the hero to deal with.
// A timed swarm's stream: how wide across its way and how deep along it (the owner's "slightly less
// clumped up", 22 October 2026; it was 120 x 20). A swarm of more than `base` comes wider across its
// way by the square root of how many times base it brings, up to `most` times (27 October 2026: the
// swarms of 2,600-4,300 an Elite Nightmare sends landed almost whole in one 170 x 70 strip, and the
// crowd's work in each crowded cell grows as its count squared). Never deeper: at the start of the
// stream (0.55 screen diagonals off) a longer tail, or a wider stream than `most` times, would lie
// past the forest's tooFar, and Game.relocate would put it back at the screen's edge. Its size
// stays as the rules give it.
export const SWARM_SPREAD = { wide: 170, deep: 70, base: 300, most: 1.8 };

// A ring, "more intense ... 3 times as many monsters in it" (the owner's, 26 October 2026): its
// count RING.more times the rules', in RING.layers circles RING.gap px apart, each turned half a
// step so they don't line up.
export const RING = { more: 3, layers: 3, gap: 26 };

// A pack event is never fewer than PACK_LEAST, whatever the difficulty and its few take off (the
// 27 October 2026 review, D5: Normal's "Wolves on the hunt!" brought two).
export const PACK_LEAST = 6;

// Jolts (the owner's, 26 October 2026): "random jolts of monsters ... every 30 - 90 seconds ... the
// computer quickly checks where the hero is currently headed" and sends a stream at him from ahead,
// close to his way but not on it (up to JOLT.spread radians off), JOLT.count of one kind as the
// difficulty and the night weigh it. No warning: that's the jolt. So it comes only of the night's
// swift and quick kinds (JOLT.pace, enemies.js PACE_OF: bats, rats, imps, hellhounds, wolves, spiders,
// goblins, slimelets) and never one that shoots: the night's count of Cultists, Orcs, Ogres or Death
// Knights locked on him unwarned was a wall of the heavy and slow (27 October 2026; Cultists are few,
// big and slow, the owner's). Every pocket of the night has one of them (the first, rats and bats).
export const JOLT = { every: [30, 90], count: 6, spread: 0.45, pace: ['swift', 'quick'] };
// What a jolt never is: the shooters (Cultists, Skeleton Archers) and any kind not of JOLT.pace.
const JOLT_NOT = Object.keys(ENEMIES).filter((type) => ENEMIES[type].shot || !JOLT.pace.includes(PACE_OF[type]));

export const WAVE = { first: 45, every: 75, length: 15, peak: 1.5 };
export function waveAt(t) {
  const s = t - WAVE.first;
  if (s < 0) return 1;
  const into = s % WAVE.every;
  return into < WAVE.length ? 1 + WAVE.peak * Math.sin((into / WAVE.length) * Math.PI) : 1;
}

export class Spawner {
  constructor(g) {
    this.g = g;
    this.acc = 0.6; // how long yet before the steady horde starts coming
    this.owed = null; // the steady horde's monsters due and not yet come (null: its head start yet to come)
    this.eventIdx = 0;
    this.eliteT = 95;
    this.thiefT = rand(140, 220);
    this.propT = 4;
    this.shrineT = 45;
    this.joltT = null; // the next jolt, rolled at the first update (so a new Game draws no random number for it)
    this.bossIdx = 0;
    this.loopAt = 0; // Ranked: next looping event, in phase minutes (put in events when near)
    this.warnIdx = 0; // the next of events to announce (warn)
    this.warned = new Map(); // events index -> the announced copy, its side rolled
    this._events = null;
  }

  // The night's timed events, every swarm a batch (data/waves.js batchEvents), rolled once a run
  // the first time they are asked for: by then the mode and the floor are set, and with them how
  // far the phase moves in SWARM_BATCH.gap seconds. Survival's night has its last stand among them
  // (data/waves.js LAST_STAND), Ranked and the Dungeon only the night's EVENTS.
  get events() {
    if (!this._events) this._events = this.batch(this.g.mode === 's15' ? [...EVENTS, LAST_STAND].sort((a, b) => a.at - b.at) : EVENTS);
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
    this.owed = null; // a new floor gets its head start (HORDE_RATE.head, .headLate)
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

  // How many monsters a second the steady horde sends at a phase (data/waves.js hordeRate), however
  // many stand: the rules' rate times the difficulty's spawn, a tenth fewer on a dungeon floor, the
  // minute's growth and Veteran's late horde, bent under HORDE_RATE.knee (x / (1 + x / knee): half
  // the knee asked comes as a third of it, the knee as half, ever closer to it past that; the knee
  // grows with the minute, so Ranked's never stops growing), then a Nightmare's triple and the
  // Cursed Skulls on top, whole (runMore). Unbent, Veteran asked 115 a second at 10:00 and Elite
  // 330 at 15:00, far past any hero's killing: the cap would have held the field full all night,
  // the standing horde again.
  rate(phase) {
    const g = this.g, grow = minuteMore(phase), knee = HORDE_RATE.knee * grow;
    const x = hordeRate(phase) * g.diff.spawn * (g.mode === 'dungeon' ? 0.9 : 1) * grow * lateMore(g.diff, phase);
    return (x / (1 + x / knee)) * runMore(g);
  }

  // The rate right now: rate, and more while a wave is on (waveAt).
  waveRate(phase) {
    return this.rate(phase) * waveAt(this.g.time);
  }

  update(dt) {
    const g = this.g;
    if (g.calm > 0 || g.inCrypt) return; // e.g. dawn, descending, a crypt
    const phase = g.phase;

    // Steady horde, in waves: waveRate a second, never minding how many stand (the owner's of 26
    // October 2026, data/waves.js HORDE_RATE). Due monsters gather in owed, fractions too; each
    // whole one comes at a spawn point at the screen's edge (a Goblin with two more, all three
    // counted). The night's or floor's first comes with HORDE_RATE.head seconds' worth (.headLate
    // on a floor starting later in the night).
    if (this.acc > 0) this.acc -= dt;
    else {
      const R = HORDE_RATE, rate = this.waveRate(phase);
      if (this.owed === null) this.owed = this.rate(phase) * (phase < 1 ? R.head : R.headLate);
      // At most `carry` seconds' worth wait (a head start may be more, and only runs down).
      this.owed = Math.min(this.owed + rate * dt, Math.max(this.owed, 1 + rate * R.carry));
      // Room kept for what is sent at the hero (HORDE_RATE.room): what was due doesn't come, unless
      // fewer than HORDE_RATE.thin stand on the screen (shown). Then the field stands full out of
      // sight (a ring's or a swarm's on its way back) and he'd be left alone (the owner's of 27
      // October 2026), so it comes all the same, at the cap in the place of the farthest off the
      // screen (room: Game.recycleFar as for what is sent).
      const full = g.enemies.length - g.propCount >= HORDE_CAP.most - R.room;
      if (full && this.shown() >= R.thin) this.owed = Math.min(this.owed, 0);
      const st = this.owed >= 1 ? { ...this.stats(phase), steady: true, room: full, xpMul: g.diff.xp ?? 1 } : null;
      for (let i = 0; i < R.perFrame && this.owed >= 1; i++) {
        const type = this.pickType(phase);
        const pt = g.world.spawnPoint(g);
        if (!pt) break;
        const pack = type === 'goblin' ? 3 : 1;
        let came = 0;
        for (let k = 0; k < pack; k++) if (g.spawnEnemy(type, pt.x + rand(-8, 8), pt.y + rand(-8, 8), st)) came++;
        // At the cap with no room (Game.recycleFar): what was due now doesn't come at all.
        if (!came) {
          this.owed = 0;
          break;
        }
        this.owed -= pack;
      }
    }

    // Timed events, each announced WARN.lead real seconds before (warn).
    const soon = this.phaseAfter(WARN.lead * g.pace);
    if (this.warnIdx < this.eventIdx) this.warnIdx = this.eventIdx;
    const events = this.events;
    // Ranked, once the night's are spent: one of its later events again every RANKED_EVENT_EVERY,
    // growing past phase 30, put at the end of the list (a swarm as a whole batch), where it is
    // announced and comes like the night's own. The later ones are those from the Wraith ring on,
    // the same six since it moved to 12:00 (data/waves.js EVENTS, 27 October 2026).
    if (g.mode === 'ranked' && this.eventIdx >= events.length) {
      if (!this.loopAt) this.loopAt = phase + RANKED_EVENT_EVERY;
      if (soon >= this.loopAt) {
        const ev = pick(EVENTS.filter((e) => e.at >= 16.8));
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

    // Jolts, from where the hero is headed.
    this.joltT ??= rand(...JOLT.every);
    this.joltT -= dt;
    if (this.joltT <= 0) {
      this.joltT = rand(...JOLT.every);
      this.jolt(phase);
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
        // At PROP_SITES.most the farthest off the screen make way (letPropsGo), so boxes left
        // standing where he fought never stop new ones coming ahead of him.
        if (g.propCount >= PROP_SITES.most) g.propCount -= this.letPropsGo(g.propCount - PROP_SITES.most + PROP_SITES.boxes[1]);
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

  // Whether (x, y) is on the screen or within HORDE_CAP.edge px of it.
  inView(x, y) {
    const c = this.g.cam, m = HORDE_CAP.edge;
    return x > c.x - m && x < c.x + c.W + m && y > c.y - m && y < c.y + c.H + m;
  }

  // How many monsters stand on the screen (inView), props aside.
  shown() {
    let n = 0;
    for (const e of this.g.enemies) if (!e.dead && !e.prop && this.inView(e.x, e.y)) n++;
    return n;
  }

  // Up to n unbroken boxes off the screen, the farthest from the hero first, simply vanish, as
  // those left far behind do (Game.relocate): no loot. Returns how many went.
  letPropsGo(n) {
    const p = this.g.player, d2 = (e) => (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    const off = this.g.enemies.filter((e) => e.prop && !e.dead && !this.inView(e.x, e.y));
    off.sort((a, b) => d2(b) - d2(a));
    const gone = off.slice(0, Math.max(0, n));
    for (const e of gone) e.dead = true;
    return gone.length;
  }

  // A timed swarm, ring or pack, or the night's last stand. At the cap of monsters it comes in full
  // all the same (sent: Game.recycleFar), each of them in the place of one off the screen. A pack
  // comes at least PACK_LEAST strong, and the horde it sends pays the difficulty's xp (Normal's
  // NORMAL_XP; a crypt's packs, which take stats, as ever).
  fire(ev, phase) {
    const g = this.g, p = g.player;
    g.warnings = g.warnings.filter((w) => w.ev !== ev);
    // A kind picked by pickType (a jolt: ev.picked) came that much more seldom already; cut again it was a ninth, not a third (27 October 2026).
    ev = { ...ev, count: Math.max(ev.type === 'pack' ? PACK_LEAST : 1, Math.round(ev.count * g.diff.horde * (isFew(ev.enemy) && !ev.picked ? g.diff.few : 1) * hordeMore(g, phase))) };
    const st = { ...this.stats(phase), xpMul: g.diff.xp ?? 1 };
    const cam = g.cam;
    // At the cap a refused spawn means no one is left off the screen to make room (Game.recycleFar),
    // so none of the rest would come this frame either: the event stops asking. Only at the cap, so
    // a refusal for any other reason is passed over as before.
    const shut = (e) => !e && g.enemies.length - g.propCount > HORDE_CAP.most;
    switch (ev.type) {
      case 'ring':
      case 'stand': {
        // The last stand (data/waves.js LAST_STAND) is a ring of every kind the night has brought,
        // one after another round it, those that shoot or lunge as few as anywhere (pickType's
        // few), and a pack of champions together at one spot, without their names' banners.
        const kinds = ev.type === 'stand' ? kindsBy(minuteOf(phase)) : [ev.enemy];
        const R0 = Math.hypot(cam.W, cam.H) * 0.5 + 10;
        const count = ev.count * RING.more, per = Math.ceil(count / RING.layers);
        for (let i = 0; i < count; i++) {
          const layer = Math.floor(i / per), R = R0 + layer * RING.gap;
          const a = ((i % per) + (layer % 2) * 0.5) / per * TAU;
          const spot = g.world.freeSpot(p.x + Math.cos(a) * R, p.y + Math.sin(a) * R * 0.85);
          if (!spot) continue;
          const type = kinds[i % kinds.length];
          if (ev.type === 'stand' && isFew(type) && Math.random() >= g.diff.few) continue;
          if (shut(g.spawnEnemy(type, spot.x, spot.y, { ...st, instant: true, aware: true, sent: true }))) break;
        }
        if (ev.type === 'stand') {
          const pt = g.world.spawnPoint(g, 20);
          for (let k = 0; k < ev.champions; k++) this.spawnElite(phase, pt && { x: pt.x + rand(-16, 16), y: pt.y + rand(-16, 16) }, true);
        }
        // (Its banner came with its warning.)
        break;
      }
      case 'swarm': {
        // A stream crossing the screen, from the side its warning showed: SWARM_SPREAD.wide px
        // across (more for a big one) and up to .deep px deep, so it comes loose rather than as one
        // clump.
        const a = ev.dir ?? rand(TAU);
        const dx = Math.cos(a), dy = Math.sin(a);
        const R = Math.hypot(cam.W, cam.H) * 0.55;
        const sx = p.x - dx * R, sy = p.y - dy * R;
        const wide = SWARM_SPREAD.wide * Math.min(SWARM_SPREAD.most, Math.sqrt(Math.max(1, ev.count / SWARM_SPREAD.base)));
        for (let i = 0; i < ev.count; i++) {
          const off = (i / ev.count - 0.5) * wide + rand(-8, 8), back = rand(SWARM_SPREAD.deep);
          const x = sx - dy * off - dx * back, y = sy + dx * off - dy * back;
          const e = g.spawnEnemy(ev.enemy, x, y, { ...st, instant: true, lock: [dx, dy], lockT: 6, aware: true, sent: true });
          if (shut(e)) break;
          if (e) e.spd *= 1.2;
        }
        sfx('charge');
        break;
      }
      case 'pack': {
        // Where its warning pointed (as far from the hero as then), or a spawn point.
        const pt = ev.off ? g.world.freeSpot(p.x + ev.off[0], p.y + ev.off[1]) || g.world.spawnPoint(g, 30) : g.world.spawnPoint(g, 30);
        if (!pt) break;
        for (let i = 0; i < ev.count; i++) if (shut(g.spawnEnemy(ev.enemy, pt.x + rand(-20, 20), pt.y + rand(-20, 20), { ...st, aware: true, sent: true }))) break;
        break;
      }
      default:
        break;
    }
  }

  // A jolt (JOLT): a swarm of one kind of tonight's swift or quick monsters that doesn't shoot
  // (JOLT_NOT), coming at the hero from the way he is headed (his last step's, Player.aim), a little off it.
  jolt(phase) {
    const g = this.g;
    // dir is the way the swarm moves, so back at him; fire weighs its count as a timed swarm's, but
    // for the few cut pickType already made (picked).
    const dir = g.player.aim + Math.PI + rand(-JOLT.spread, JOLT.spread);
    this.fire({ type: 'swarm', enemy: this.pickType(phase, JOLT_NOT), dir, count: JOLT.count, picked: true }, phase);
  }

  // A champion: at a spot given, and quietly (no banner of its name, no sting) when it comes in a
  // pack (the night's last stand, LAST_STAND).
  spawnElite(phase, at = null, quiet = false) {
    const g = this.g;
    const type = this.pickType(phase, ['bat', 'slimelet', 'rat']);
    const pt = at || g.world.spawnPoint(g, 20);
    if (!pt) return null;
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
      if (!quiet) {
        g.banner(name, `${mod.name} champion`, mod.color, 2.2);
        sfx('charge');
      }
    }
    return e;
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
