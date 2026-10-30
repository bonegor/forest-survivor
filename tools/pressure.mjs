// Pressure table: what the night sends at the hero, minute by minute, worked out from the game's own
// rules (the Spawner's rate, waves, pockets, events, jolts, champions and bosses; data/waves.js,
// data/maps.js, data/difficulty.js) with no game played: it runs in a second. Per minute: monsters a
// second of the steady horde (its waves averaged in), monsters sent at once (swarms, rings, packs,
// jolts, the last stand), the health a second all of them bring (what the hero must cut through to
// keep up), the champions' and bosses' health, and the touch damage a second they bring (one touch of
// each that arrives, at the minute's damage, before armor: how hard the crowd would hit if it reached
// him). Random parts come as their expectation (a swarm batch 3.5 swarms, a jolt a minute, a champion
// every 122.5 s over the difficulty's elite).
// Change a monster, a pocket or an event, and compare with the table from before the change:
//   node tools/pressure.mjs --save=before      (writes tools/out/pressure/before.json)
//   ...edit data/enemies.js, data/waves.js...
//   node tools/pressure.mjs --vs=before        (adds the change in percent)
// Options: --mode=s15|ranked  --diff=normal|veteran|elite (default elite, as the bots)  --nightmare
//   --map=forest|desert|frozen|meadow|hell (Survival; default forest)  --until=MIN (Ranked, default 30)
//   --kinds (a second table: each minute's kinds by their share of the health)  --json=FILE

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

await import('./headless.mjs');
const { Game } = await import('../public/js/game/game.js');
const { isFew, hordeMore, waveAt, RING, PACK_LEAST, JOLT } = await import('../public/js/game/spawner.js');
const { ENEMIES, CHAMPION_MODS } = await import('../public/js/data/enemies.js');
const { SWARM_BATCH, HORDE_RATE, RANKED_BOSSES, RANKED_BOSS_EVERY, kindWeightsBy, minuteOf, pocketAt } = await import('../public/js/data/waves.js');
const { MAPS } = await import('../public/js/data/maps.js');
const { PACE_OF } = await import('../public/js/game/enemies.js');
const { defaultProfile, metaBonuses } = await import('../public/js/shared/profile.js');

const OUT = resolve('tools/out/pressure');

// Importable without running the CLI: tests can inspect the numeric table directly.
export function pressureTable({ mode = 's15', diff = 'hard', map = 'forest', nightmare = false, minutes = mode === 's15' ? 15 : 30 } = {}) {
  if (!['s15', 'ranked'].includes(mode)) throw new Error('--mode must be s15 or ranked');
  if (!['easy', 'medium', 'hard'].includes(diff)) throw new Error('Invalid difficulty');
  if (!Object.hasOwn(MAPS, map)) throw new Error(`Unknown map "${map}"`);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) throw new Error('--until must be a whole number from 1 to 240');
  if (nightmare && (diff !== 'hard' || mode === 'ranked')) throw new Error('Nightmare requires Elite Survival');
  const g = new Game({ hero: 'knight', mode, diff, nightmare, map, meta: metaBonuses(defaultProfile()), settings: {}, headless: true });
  const sp = g.spawner, D = g.diff;
  const at = (t) => {
    g.time = t;
    return g.phase;
  };
  // The time of a phase (the inverse of Game.phase for Survival and Ranked).
  const timeOf = (ph) => minuteOf(ph) * 60;

  // What one monster of a kind is worth at a phase: its health (a slime's slimelets with it) and one touch.
  const hpOf = (type, mul) => {
    const d = ENEMIES[type];
    return Math.max(1, d.hp * mul) + (d.split ? d.splitN * Math.max(1, ENEMIES[d.split].hp * mul) : 0);
  };
  const touchMul = () => g.dmgScale * D.dmg * (g.map.foe.dmg ?? 1) * D.hurt;

  // The steady horde's mix at a phase: each kind's share of the monsters (pickType: the few cut and
  // replaced by the rest; a group kind brings its group and owes as many).
  function mix(ph, exclude = []) {
    const rows = Object.entries(pocketAt(minuteOf(ph), g.map.pockets).spawn).filter(([k]) => !exclude.includes(k));
    if (!rows.length) return { [g.map.fallback]: 1 };
    const W = rows.reduce((s, [, w]) => s + w, 0);
    const rest = rows.filter(([k]) => !isFew(k)), RW = rest.reduce((s, [, w]) => s + w, 0);
    const cut = rows.reduce((s, [k, w]) => s + (isFew(k) && D.few < 1 && RW ? w * (1 - D.few) : 0), 0) / W;
    const draw = {};
    for (const [k, w] of rows) draw[k] = (isFew(k) && D.few < 1 && RW ? w * D.few : w) / W + (!isFew(k) && RW ? cut * w / RW : 0);
    const pack = (k) => ENEMIES[k].group || 1;
    const per = Object.entries(draw).reduce((s, [k, p]) => s + p * pack(k), 0);
    return Object.fromEntries(Object.entries(draw).map(([k, p]) => [k, (p * pack(k)) / per]));
  }

  const rows = [];
  for (let m = 0; m < minutes; m++) rows.push({ minute: m, steady: 0, sent: 0, hp: 0, bossHp: 0, touch: 0, kinds: {}, notes: [] });
  const rowAt = (t) => rows[Math.floor(t / 60)];
  // n monsters of a mix (or one kind) arriving at time t.
  function arrive(t, n, kinds, { steady = false, hpX = 1, dmgX = 1, boss = false } = {}) {
    const r = rowAt(t);
    if (!r || n <= 0) return;
    const ph = at(t), mul = sp.stats(ph).hpMul * hpX, tm = touchMul() * dmgX;
    for (const [k, share] of Object.entries(typeof kinds === 'string' ? { [kinds]: 1 } : kinds)) {
      const c = n * share, hp = c * hpOf(k, mul);
      if (boss) r.bossHp += hp;
      else {
        r.hp += hp;
        r.kinds[k] = (r.kinds[k] || 0) + hp;
        if (steady) r.steady += c;
        else r.sent += c;
      }
      r.touch += c * ENEMIES[k].dmg * tm;
    }
  }

  // The steady horde, integrated in at most one-second steps after the live spawner's delay.
  for (let s = 0; s < minutes * 60; s++) {
    const from = Math.max(s, HORDE_RATE.delay), dt = s + 1 - from;
    if (dt <= 0) continue;
    const t = from + dt / 2, ph = at(t);
    arrive(t, sp.rate(ph) * waveAt(t) * dt, mix(ph), { steady: true });
  }
  const start = HORDE_RATE.delay, headStart = sp.initialOwed(at(start));
  if (headStart > 0) {
    arrive(start, headStart, mix(at(start)));
    rows[0].notes.push('head start');
  }

  // The timed events, as Spawner.fire counts them; a swarm comes as a batch of 2-5 (3.5 expected).
  const evCount = (ev, ph) => {
    at(timeOf(ph));
    return Math.max(ev.type === 'pack' ? PACK_LEAST : 1, Math.round(ev.count * D.horde * (isFew(ev.enemy) && !ev.picked ? D.few : 1) * hordeMore(g, ph)));
  };
  const events = mode === 's15' && g.map.lastStand ? [...g.map.events, g.map.lastStand] : [...g.map.events];
  const sizes = [];
  for (let n = SWARM_BATCH.min; n <= SWARM_BATCH.max; n++) sizes.push(n);
  const champHp = (ph) => {
    const mx = mix(ph, Object.keys(ENEMIES).filter((k) => ENEMIES[k].fry));
    return { mx, x: 13 * (1 + 0.4 / CHAMPION_MODS.length) }; // a Stoneskin's 1.4, as often as any mod
  };
  for (const ev of events) {
    if (ev.type === 'swarm') {
      const gapPh = at(timeOf(ev.at) + SWARM_BATCH.gap) - ev.at;
      for (let i = 0; i < SWARM_BATCH.max; i++) {
        const p = sizes.filter((n) => n > i).length / sizes.length, ph = ev.at + i * gapPh, t = timeOf(ph);
        arrive(t, p * evCount({ ...ev, count: ev.count * SWARM_BATCH.more }, ph), ev.enemy);
      }
      rowAt(timeOf(ev.at))?.notes.push(`swarm ${ev.enemy}`);
    } else if (ev.type === 'stand') {
      const t = timeOf(ev.at), n = evCount(ev, ev.at) * RING.more, w = kindWeightsBy(minuteOf(ev.at), g.map.pockets);
      const kept = w.map(([k, x]) => [k, x * (isFew(k) ? D.few : 1)]), W = w.reduce((s, [, x]) => s + x, 0);
      arrive(t, n, Object.fromEntries(kept.map(([k, x]) => [k, x / W])));
      const c = champHp(ev.at);
      arrive(t, ev.champions, c.mx, { hpX: c.x, dmgX: 1.3, boss: true });
      rowAt(t)?.notes.push('last stand');
    } else {
      const t = timeOf(ev.at), n = evCount(ev, ev.at) * (ev.type === 'ring' ? RING.more : 1);
      arrive(t, n, ev.enemy);
      rowAt(t)?.notes.push(`${ev.type} ${ev.enemy}`);
    }
  }
  // Ranked past its scripted events: one of the late ones every RANKED_EVENT_EVERY phase, as an average.
  if (mode === 'ranked') {
    const late = g.map.events.filter((e) => e.at >= 16.8), last = Math.max(...g.map.events.map((e) => e.at));
    for (let ph = last + 2.5; timeOf(ph) < minutes * 60; ph += 2.5) {
      for (const ev of late) {
        const e = { ...ev, count: Math.round(ev.count * (1 + Math.max(0, ph - 30) * 0.04)) };
        const n = evCount(e, ph) * (e.type === 'ring' ? RING.more : e.type === 'swarm' ? SWARM_BATCH.more * 3.5 : 1);
        arrive(timeOf(ph), n / late.length, e.enemy);
      }
    }
  }

  // Jolts, one a minute on average from JOLT.every: six of the night's swift and quick, as a swarm.
  const joltNot = Object.keys(ENEMIES).filter((k) => ENEMIES[k].shot || !JOLT.pace.includes(PACE_OF[k]));
  for (let m = 1; m < minutes; m++) {
    const t = m * 60, ph = at(t), mx = mix(ph, joltNot);
    for (const [k, share] of Object.entries(mx)) arrive(t, share * evCount({ type: 'swarm', enemy: k, count: JOLT.count, picked: true }, ph), k);
  }

  // Champions: the first at 95 s, then every 122.5 s on average, faster by the difficulty's elite.
  for (let t = 95 / D.elite; t < minutes * 60; t += 122.5 / D.elite) {
    const c = champHp(at(t));
    arrive(t, 1, c.mx, { hpX: c.x, dmgX: 1.3, boss: true });
  }

  // Bosses: Survival's map's three; Ranked's lords every RANKED_BOSS_EVERY.
  const bosses = mode === 's15' ? g.map.bosses : [];
  if (mode === 'ranked') {
    for (let i = 1; i * RANKED_BOSS_EVERY < minutes * 60; i++) bosses.push({ at: i * RANKED_BOSS_EVERY, id: RANKED_BOSSES[(i - 1) % RANKED_BOSSES.length] });
  }
  for (const b of bosses) {
    const ph = at(b.at), r = rowAt(b.at);
    if (!r) continue;
    r.bossHp += ENEMIES[b.id].hp * monsterHpFor(ph) * 0.8 * D.hp * g.map.foe.hp;
    r.notes.push(`BOSS ${ENEMIES[b.id].name}`);
  }
  function monsterHpFor(ph) {
    return sp.stats(ph).hpMul / (D.hp * g.map.foe.hp);
  }

  // New kinds in the steady horde, by minute.
  let seen = new Set();
  for (const r of rows) {
    const ks = Object.keys(mix(at(r.minute * 60 + 30)));
    const fresh = ks.filter((k) => !seen.has(k));
    if (fresh.length && r.minute > 0) r.notes.unshift('+' + fresh.map((k) => ENEMIES[k].name).join(', +'));
    seen = new Set([...seen, ...ks]);
  }

  const label = `${mode === 's15' ? `Survival, ${g.map.name}` : 'Ranked'} · ${{ easy: 'Normal', medium: 'Veteran', hard: 'Elite' }[g.diffId]}${g.nightmare ? ' Nightmare' : ''}`;
  return { label, mode, diff: g.diffId, map: g.map.id, nightmare: g.nightmare, headStart, rows };
}

// ---------------------------------------------------------------------------------- output --

function main(argv) {
  const known = new Set(['mode', 'diff', 'map', 'nightmare', 'until', 'kinds', 'save', 'vs', 'json']);
  const opts = Object.fromEntries(argv.map(a => {
    const m = /^--([a-z]+)(?:=(.*))?$/.exec(a);
    if (!m || !known.has(m[1])) throw new Error(`Unknown option "${a}"`);
    const [key, value] = [m[1], m[2]];
    if (['nightmare', 'kinds'].includes(key)) {
      if (value !== undefined) throw new Error(`--${key} takes no value`);
      return [key, true];
    }
    if (!value) throw new Error(`--${key} needs a value`);
    return [key, value];
  }));
  const diff = { normal: 'easy', veteran: 'medium', elite: 'hard' }[opts.diff ?? 'elite'];
  if (!diff) throw new Error('--diff must be normal, veteran or elite');
  const mode = opts.mode ?? 's15';
  const data = pressureTable({ mode, diff, map: opts.map ?? 'forest', nightmare: !!opts.nightmare, minutes: mode === 's15' ? 15 : Number(opts.until ?? 30) });
  const { rows, label } = data;
  let vs = null;
  if (opts.vs) {
    const f = existsSync(opts.vs) ? opts.vs : resolve(OUT, `${opts.vs}.json`);
    if (!existsSync(f)) throw new Error(`No saved table "${opts.vs}" (looked for ${f})`);
    vs = JSON.parse(readFileSync(f, 'utf8'));
  }
  const n = (x) => (x >= 1e6 ? (x / 1e6).toFixed(1) + 'M' : x >= 1e4 ? (x / 1e3).toFixed(0) + 'k' : x >= 1e3 ? (x / 1e3).toFixed(1) + 'k' : x >= 10 ? x.toFixed(0) : x.toFixed(1));
  const pct = (a, b) => (!b && !a ? '' : !b ? 'new' : Math.abs(a / b - 1) < 0.005 ? '·' : `${a > b ? '+' : ''}${((a / b - 1) * 100).toFixed(0)}%`);

  const head = ['min', 'foes/s', 'sent', 'HP/s', 'boss+champ HP', 'touch/s', ...(vs ? ['Δ HP/s', 'Δ boss', 'Δ touch/s'] : []), 'what comes'];
  const body = rows.map((r, i) => {
    const o = vs?.rows[i], hps = r.hp / 60, ts = r.touch / 60;
    return [
      `${r.minute}:00`, n(r.steady / 60), n(r.sent), n(hps), r.bossHp ? n(r.bossHp) : '', n(ts),
      ...(vs ? [o ? pct(hps, o.hp / 60) : '?', o ? pct(r.bossHp, o.bossHp) : '?', o ? pct(ts, o.touch / 60) : '?'] : []),
      r.notes.join('; '),
    ];
  });
  const widths = head.map((h, c) => Math.max(h.length, ...body.map((b) => String(b[c]).length)));
  const line = (cells) => cells.map((x, c) => (c === cells.length - 1 ? x : String(x).padStart(widths[c]))).join('  ');
  console.log(`\nPressure · ${label}${vs ? ` · vs "${opts.vs}" (${vs.label})` : ''}`);
  console.log('foes/s: steady horde a second (waves averaged)   sent: swarms, rings, packs, jolts at once   HP/s: health a second to cut through (horde + sent)');
  console.log('boss+champ HP: health of champions and bosses arriving   touch/s: one touch of each monster arriving, a second, before armor\n');
  console.log(line(head));
  for (const b of body) console.log(line(b));

  if (opts.kinds) {
    console.log('\nShare of the minute\'s health (horde + sent), top kinds:');
    for (const r of rows) {
      const tot = Object.values(r.kinds).reduce((s, x) => s + x, 0);
      const top = Object.entries(r.kinds).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, x]) => `${ENEMIES[k].name} ${((x / tot) * 100).toFixed(0)}%`);
      console.log(`${String(r.minute).padStart(3)}:00  ${top.join(', ')}`);
    }
  }

  if (opts.save) {
    mkdirSync(OUT, { recursive: true });
    const f = resolve(OUT, `${opts.save}.json`);
    writeFileSync(f, JSON.stringify(data, null, 1));
    console.log(`\nSaved ${f}`);
  }
  if (opts.json && opts.json !== true) {
    mkdirSync(dirname(resolve(opts.json)), { recursive: true });
    writeFileSync(opts.json, JSON.stringify(data, null, 1));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
