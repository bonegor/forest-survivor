// Slices: a stretch of the night played on its own, from minute X with the build a hero has by then,
// instead of the whole night up to it. The real game, headless (tools/headless.mjs), a bot at the
// controls (public/js/bots/), seeded: a seed replays the same slice.
//
// 1. Once: record the builds. The bot plays whole nights, and at every minute it lives to its
//    weapons, relics, Blessings, gear and level are kept, one night per seed:
//      node tools/slice.mjs --record --hero=knight --diff=elite --nights=4
//    (tools/out/slice/builds-knight-hard.json). Record again when the weapons or the level-ups change
//    much; a monster change doesn't need it.
// 2. Slices: from `warm` seconds before minute --at the hero has that minute's build of the night of
//    his seed (seed i plays night i's, in turn), at full health, the field filling as it would; from
//    --at the slice is measured for --secs, and he can die:
//      node tools/slice.mjs --at=10 --secs=120 --save=before
//      ...change a monster, a weapon, a wave...
//      node tools/slice.mjs --at=10 --secs=120 --vs=before
//    --vs plays the saved slices' seeds again, with their settings unless others are given, pairs them
//    seed by seed, and stops early once the difference in damage taken a second is clear, or clearly
//    small (under 5%). Nothing else changing, a seed replays exactly.
// A boss that came before the warm-up began isn't there (Game.setTime passes it): a slice at 10:00 has
// no Butcher (9:00), whom a real night's hero may still be fighting then; start before 9:00 to have him.
// Checked against whole bot nights (Elite, full Armory, the same night's build): 0.1 against 0.3 taken
// a second at 5:00, 0.5 against 0.3 at 11:00.
// A slice late in the night is dear (some 2,500 monsters stand): 40-80 s of one core for 105 s of game.
// A build can be given instead of recorded: --weapons=bow:8,axe:5 --passives=might:3 --level=30 --blessings=20.
// The PC: low priority (--priority=normal to undo) and half the cores (--jobs=N).

import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { resolve } from 'node:path';
import { setPriority } from './priority.mjs';

const OUT = resolve('tools/out/slice');
const HELP = `Usage: node tools/slice.mjs [options]

  --record      play whole undying nights and keep the build at every minute (do this first)
  --nights=N    nights to record (default 4)
  --at=LIST     minutes the slices start at, e.g. 10 or 5,10,13 (default 10)
  --secs=N      seconds measured from there (default 120)
  --warm=N      seconds played before --at with the build, the field filling (default 45)
  --runs=N      slices per minute, seeds --seed.. (default 8; with --vs, at most the saved ones)
  --seed=N      first seed (default 1)
  --hero=ID     (default knight)       --diff=normal|veteran|elite (default elite)  --nightmare
  --mode=s15|ranked (default s15)      --map=ID (Survival map; default forest)
  --bot=SPEC    strategy (default autopilot)   --pick=POLICY level-up policy (default build)
  --armory=X    none, max, or might:5,armor:3 (default none)
  --weapons=LIST, --passives=LIST, --level=N, --blessings=N   a build of your own instead of the recorded ones
  --hz=N        steps a second (default 60)
  --jobs=N      slices played at once (default half the cores)
  --priority=low|normal   (default low: the PC stays usable)
  --save=NAME   keep the results (tools/out/slice/NAME.json)
  --vs=NAME     compare with saved results (their settings too), seed by seed, stopping when the answer is clear
  --each        a line per slice`;

// ------------------------------------------------------------------------------- the game --

async function setup() {
  await import('./headless.mjs');
  const { Game } = await import('../public/js/game/game.js');
  const { Driver } = await import('../public/js/bots/driver.js');
  const { mulberry32 } = await import('../public/js/engine/util.js');
  const { xpFor } = await import('../public/js/game/player.js');
  const { sanitizeGear } = await import('../public/js/shared/items.js');
  const P = await import('../public/js/shared/profile.js');

  // A game as tools/headless.mjs playGame starts one: everything open, six slots of each, the Armory given.
  function start(job) {
    Math.random = mulberry32(job.seed);
    const meta = P.metaBonuses(P.sanitizeProfile({ up: job.armory || {} }));
    Object.assign(meta, { weaponSlots: 6, relicSlots: 6, reroll: meta.reroll + 2, banish: meta.banish + 2 });
    const g = new Game({ hero: job.hero, mode: job.mode, diff: job.diff, nightmare: job.nightmare, map: job.map, meta, open: null, settings: {}, crypts: false, headless: true });
    const d = new Driver(g, { bot: job.bot, label: job.bot, pick: job.pick, hz: job.hz, rng: mulberry32(Math.imul(job.seed, 0x9e3779b1) ^ 0x5bd1e995) });
    return { g, d };
  }

  // What a run has built by a minute: weapons, relics, gear, level, the Blessings its level-ups gave
  // once the build was full (each Valor +5% might and +2% health: dozens by mid-night), what is left of
  // its revivals, rerolls and banishes, its fury, and the Cursed Skulls it took (each a quarter more horde).
  const buildOf = (g) => {
    const p = g.player;
    return {
      weapons: p.weapons.map((w) => [w.id, w.level]),
      passives: [...p.passives],
      gear: JSON.parse(JSON.stringify(g.gear)),
      level: p.level,
      blessings: p.blessings, hastes: p.hastes, reaches: p.reaches,
      revivals: p.revivals, rerolls: p.rerolls, banishes: p.banishes, fury: p.fury,
      skulls: g.skulls || 0,
    };
  };

  function giveBuild(g, b) {
    const p = g.player;
    for (const w of p.weapons) if (w.fx) w.fx.dead = true;
    p.weapons.length = 0;
    g.freeSrc = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    for (const [id, lv] of b.weapons) g.addWeapon(id, lv);
    p.passives.clear();
    for (const [id, r] of b.passives) p.passives.set(id, r);
    g.gear = sanitizeGear(b.gear || {});
    p.level = b.level || 1;
    p.xp = 0;
    p.xpNext = xpFor(p.level);
    for (const k of ['blessings', 'hastes', 'reaches', 'rerolls', 'banishes', 'fury']) if (b[k] !== undefined) p[k] = b[k];
    if (b.skulls) g.skulls = b.skulls;
    p.gearChanged();
    if (b.revivals !== undefined) p.revivals = b.revivals;
    p.hp = p.maxHp;
  }

  // Plays on `secs` of game time with the hero's health topped up every frame: every blow lands as
  // ever (the crowd shoved back, Thornmail, Rimeheart, the grace after it; Player.devGod would skip
  // them all, and a crowd that is never shoved packs him in), but none kills him.
  function topped(g, d, secs) {
    const p = g.player, end = g.time + secs;
    for (let n = Math.ceil(secs * d.hz * 4) + 600; n > 0 && g.time < end && !p.dead; n--) {
      p.hp = p.maxHp;
      if (!d.step()) break;
    }
  }

  // A whole night as the bots play it, its build kept at every minute it lives to. A real night: one
  // the hero can't die in plays otherwise (the bot, always healthy, hunts every boss) and builds
  // otherwise (at 11:00 its Knight had no Thunderstorm, and died in every slice where a real night's
  // Knight took 0.3 a second).
  function record(job) {
    const { g, d } = start(job);
    const builds = [];
    const end = g.duration === Infinity ? job.until * 60 : g.duration;
    for (let m = 1; m * 60 < end; m++) {
      d.run(m * 60 - g.time);
      if (g.state === 'over' || g.player.dead) break;
      builds[m] = buildOf(g);
    }
    return { seed: job.seed, builds, died: g.player.dead ? Math.round(g.time) : null };
  }

  // A slice: the build from `warm` s before `at`, measured from `at` for `secs`.
  function slice(job) {
    const t0 = performance.now();
    const { g, d } = start(job);
    const p = g.player;
    g.setTime(Math.max(0, job.at * 60 - job.warm));
    // No head start (HORDE_RATE.headLate: 8 seconds' worth at once, some 700 on Elite late in the
    // night, which no night in progress ever gets): the field fills at the horde's rate over the warm-up.
    if (g.time > 0) g.spawner.owed = 0;
    g.cryptTime = 0; // the clock as a night's that got here: its time (Game.setTime keeps the clock where it was)
    giveBuild(g, job.build);
    topped(g, d, job.at * 60 - g.time); // the warm-up only fills the field
    if (p.dead) return { at: job.at, seed: job.seed, night: job.night, error: 'died in the warm-up (one blow above his whole health)' };
    p.hp = p.maxHp;
    const standing = () => g.enemies.reduce((n, e) => n + (!e.dead && !e.prop ? 1 : 0), 0);
    const s0 = { taken: g.stats.damageTaken, kills: g.kills, stand: standing(), level: p.level, time: g.time, wounds: { ...g.stats.wounds }, bless: p.blessings, maxHp: p.maxHp, x: p.x, y: p.y };
    let minHp = 1, walked = 0, lx = p.x, ly = p.y;
    const end = g.time + job.secs;
    for (let n = Math.ceil(job.secs * job.hz * 4) + 600; n > 0 && g.time < end && !p.dead; n--) {
      if (!d.step()) break;
      minHp = Math.min(minHp, Math.max(0, p.hp) / p.maxHp);
      walked += Math.hypot(p.x - lx, p.y - ly);
      lx = p.x;
      ly = p.y;
    }
    const secs = Math.max(0.001, g.time - s0.time);
    return {
      at: job.at, seed: job.seed, night: job.night,
      died: p.dead ? Math.round((g.time - s0.time) * 10) / 10 : null,
      minHp: Math.round(minHp * 1000) / 1000,
      takenPerS: (g.stats.damageTaken - s0.taken) / secs,
      killsPerS: (g.kills - s0.kills) / secs,
      standStart: s0.stand, standEnd: standing(),
      levels: p.level - s0.level,
      blessings: [s0.bless, p.blessings],
      walked: Math.round(walked), at0: [Math.round(s0.x), Math.round(s0.y)],
      maxHp: s0.maxHp,
      // Who dealt the slice's damage, the most first.
      hurtBy: Object.entries(g.stats.wounds).map(([k, v]) => [k, v - (s0.wounds[k] || 0)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 4),
      cause: d.cause,
      ms: Math.round(performance.now() - t0),
    };
  }
  return { record, slice };
}

if (!isMainThread) {
  const { record, slice } = await setup();
  parentPort.on('message', (job) => {
    try {
      parentPort.postMessage(job.kind === 'record' ? record(job) : slice(job));
    } catch (e) {
      parentPort.postMessage({ ...job, error: e.stack || String(e) });
    }
  });
} else {
  try {
    await main(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------------- main --

async function main(argv) {
  const o = {};
  for (const a of argv) {
    const m = /^--([a-z]+)(?:=(.*))?$/.exec(a);
    if (!m) fail(`Unknown option "${a}"\n\n${HELP}`);
    o[m[1]] = m[2] ?? true;
  }
  if (o.help) return console.log(HELP);
  // A comparison plays as the saved slices were played, unless told otherwise.
  let vs = null;
  if (o.vs) {
    const f = existsSync(o.vs) ? o.vs : resolve(OUT, `${o.vs}.json`);
    if (!existsSync(f)) fail(`No saved slices "${o.vs}" (looked for ${f})`);
    vs = JSON.parse(readFileSync(f, 'utf8'));
    for (const k of ['hero', 'mode', 'map', 'bot', 'pick', 'hz', 'secs', 'warm']) if (o[k] === undefined && vs[k] !== undefined) o[k] = vs[k];
    if (o.diff === undefined) o.diff = { easy: 'normal', medium: 'veteran', hard: 'elite' }[vs.diff];
    if (o.nightmare === undefined && vs.nightmare) o.nightmare = true;
  }
  const { HEROES } = await import('../public/js/data/heroes.js');
  const { MAPS } = await import('../public/js/data/maps.js');
  const { UPGRADES } = await import('../public/js/shared/profile.js');

  const hero = o.hero ?? 'knight';
  if (!HEROES[hero]) fail(`Unknown hero "${hero}" (${Object.keys(HEROES).join(', ')})`);
  const mode = o.mode ?? 's15';
  if (mode !== 's15' && mode !== 'ranked') fail('--mode must be s15 or ranked');
  const diff = { normal: 'easy', veteran: 'medium', elite: 'hard' }[o.diff ?? 'elite'] ?? fail('--diff must be normal, veteran or elite');
  const nightmare = !!o.nightmare;
  const map = o.map ?? 'forest';
  if (!MAPS[map]) fail(`--map must be one of ${Object.keys(MAPS).join(', ')}`);
  const armory = o.armory === undefined || o.armory === 'none' ? {} : o.armory === 'max'
    ? Object.fromEntries(UPGRADES.map((u) => [u.id, u.max]))
    : Object.fromEntries(String(o.armory).split(',').map((s) => s.split(':')).map(([k, r]) => [k, Number(r)]));
  const num = (k, d) => {
    const v = Number(o[k] ?? d);
    return Number.isFinite(v) && v >= 0 ? v : fail(`--${k} must be a number`);
  };
  const base = { hero, mode, diff, nightmare, map, armory, bot: o.bot ?? 'autopilot', pick: o.pick ?? 'build', hz: num('hz', 60), until: num('until', 30) };
  const cores = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
  const jobsMax = Math.max(1, Math.round(num('jobs', Math.max(1, Math.floor(cores / 2)))));
  setPriority(o.priority ?? 'low');
  const tag = `${hero}-${diff}${nightmare ? '-nightmare' : ''}${mode === 's15' && map !== 'forest' ? '-' + map : ''}${mode === 'ranked' ? '-ranked' : ''}`;
  const buildsFile = resolve(OUT, `builds-${tag}.json`);
  const seed0 = Math.round(num('seed', 1));

  // ---- record
  if (o.record) {
    const nights = Math.max(1, Math.round(num('nights', 4)));
    const jobs = Array.from({ length: nights }, (_, i) => ({ ...base, kind: 'record', seed: seed0 + i }));
    const t0 = performance.now();
    const res = await pool(jobs, Math.min(jobsMax, nights), () => false, 'nights');
    const bad = res.find((r) => r.error);
    if (bad) fail(bad.error);
    mkdirSync(OUT, { recursive: true });
    writeFileSync(buildsFile, JSON.stringify({ tag, ...base, firstSeed: seed0, nights: res.map((r) => r.builds) }));
    console.log(`Recorded ${nights} night${nights > 1 ? 's' : ''} in ${((performance.now() - t0) / 1000).toFixed(0)} s: ${buildsFile}`);
    res.forEach((r, i) => console.log(`  night ${i + 1}: ${r.died !== null ? `died at ${Math.floor(r.died / 60)}:${String(r.died % 60).padStart(2, '0')}, builds to ${r.builds.length - 1}:00` : 'lived'}`));
    const last = res[0].builds.at(-1);
    if (last) console.log(`Night 1's build at ${res[0].builds.length - 1}:00: ${last.weapons.map(([w, l]) => `${w}:${l}`).join(' ')} | ${last.passives.map(([p, r]) => `${p}:${r}`).join(' ')} | level ${last.level}, ${last.blessings} Blessings`);
    return;
  }

  // ---- slices
  const ats = String(o.at ?? 10).split(',').map(Number);
  if (ats.some((a) => !(a >= 0))) fail('--at must be minutes, e.g. 10 or 5,10,13');
  const secs = num('secs', 120), warm = num('warm', 45);
  let own = vs?.ownBuild && !o.weapons ? vs.ownBuild : null;
  if (o.weapons) {
    const list = (v) => (v && v !== true ? String(v).split(',').map((s) => s.split(':')).map(([k, n]) => [k, Number(n ?? 1)]) : []);
    own = { weapons: list(o.weapons), passives: list(o.passives), gear: {}, level: Math.round(num('level', 1)), blessings: Math.round(num('blessings', 0)) };
  }
  let nights = null, firstRecordedSeed = 1;
  if (!own) {
    if (!existsSync(buildsFile)) fail(`No recorded builds for ${tag}: run  node tools/slice.mjs --record ${argv.filter((a) => /^--(hero|diff|nightmare|map|mode|armory|bot|pick)/.test(a)).join(' ')}  first, or give --weapons=...`);
    const rec = JSON.parse(readFileSync(buildsFile, 'utf8'));
    nights = rec.nights;
    // Recordings made before firstSeed was saved were indexed from seed 1.
    firstRecordedSeed = rec.firstSeed ?? 1;
    // The Armory the nights were recorded with, unless one is given.
    if (o.armory === undefined) base.armory = rec.armory || {};
  }
  if (vs && o.armory === undefined) base.armory = vs.armory || {};
  const runs = Math.max(1, Math.round(num('runs', 8)));
  const jobs = [];
  for (const at of ats) {
    const seeds = vs ? vs.results.filter((r) => r.at === at).map((r) => r.seed) : Array.from({ length: runs }, (_, i) => seed0 + i);
    if (vs && !seeds.length) fail(`"${o.vs}" has no slices at ${at}:00`);
    for (const seed of seeds) {
      let build = own, night = null;
      if (!own) {
        // The seed's night if it got to this minute, else the next that did.
        const m = Math.max(1, Math.floor(at));
        const start = ((seed - firstRecordedSeed) % nights.length + nights.length) % nights.length;
        for (let k = 0; k < nights.length && !build; k++) {
          const i = (start + k) % nights.length;
          if (nights[i][m]) [build, night] = [nights[i][m], i + 1];
        }
        if (!build) fail(`No recorded night reached ${m}:00`);
      }
      jobs.push({ ...base, kind: 'slice', seed, at, secs, warm, build, night });
    }
  }

  // With --vs: stop a minute's slices once the paired difference in damage taken a second is clear
  // (|t| > 3 over at least 4 pairs) or clearly small (its 95% interval within ±5% of the saved mean).
  const old = new Map((vs?.results || []).map((r) => [`${r.at}/${r.seed}`, r]));
  const decided = new Set();
  const verdict = (at, done) => {
    const pairs = done.filter((r) => r.at === at && !r.error && old.has(`${at}/${r.seed}`)).map((r) => [old.get(`${at}/${r.seed}`).takenPerS, r.takenPerS]);
    if (pairs.length < 4) return null;
    const d = pairs.map(([a, b]) => b - a), n = d.length, mean = d.reduce((s, x) => s + x, 0) / n;
    const sd = Math.sqrt(d.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)), se = sd / Math.sqrt(n);
    const ref = pairs.reduce((s, [a]) => s + a, 0) / n;
    if (se === 0) return mean === 0 ? 'same' : 'clear';
    if (Math.abs(mean / se) > 3) return 'clear';
    if (ref > 0 && Math.abs(mean) + 2 * se < 0.05 * ref) return 'same';
    return null;
  };
  const skip = (job, done) => {
    if (!vs) return false;
    if (decided.has(job.at)) return true;
    const v = verdict(job.at, done);
    if (v) decided.add(job.at);
    return !!v;
  };
  const t0 = performance.now();
  const results = (await pool(jobs, jobsMax, skip, 'slices')).filter(Boolean);
  const wall = (performance.now() - t0) / 1000;
  const errs = results.filter((r) => r.error);
  if (errs.length) fail(`${errs.length} slice(s) failed:\n${errs[0].error}`);
  const ok = results.sort((a, b) => a.at - b.at || a.seed - b.seed);

  // ---- report
  const diffName = { easy: 'Normal', medium: 'Veteran', hard: 'Elite' }[diff];
  console.log(`\nSlices · ${HEROES[hero].name} · ${mode === 's15' ? MAPS[map].name ?? map : 'Ranked'} · ${diffName}${nightmare ? ' Nightmare' : ''} · ${secs} s from each minute after ${warm} s warm-up · ${own ? 'build given' : 'recorded builds'}${vs ? ` · vs "${o.vs}"` : ''}`);
  console.log(`${ok.length} slice${ok.length === 1 ? '' : 's'} on ${jobsMax} worker${jobsMax > 1 ? 's' : ''} in ${wall.toFixed(1)} s${vs ? `, ${jobs.length - results.length} skipped once the answer was clear` : ''}\n`);
  if (o.each) {
    for (const r of ok) {
      const was = old.get(`${r.at}/${r.seed}`);
      console.log(`  ${r.at}:00 seed ${r.seed}${r.night ? ` (night ${r.night})` : ''}  ${r.died !== null ? `DIED at +${r.died}s (${r.cause})` : 'lived'}  low ${(r.minHp * 100).toFixed(0)}%  taken ${r.takenPerS.toFixed(1)}/s${was ? ` (was ${was.takenPerS.toFixed(1)})` : ''}  kills ${r.killsPerS.toFixed(1)}/s  standing ${r.standStart}->${r.standEnd}  blessings ${r.blessings.join('->')}  max hp ${r.maxHp}  walked ${r.walked} px from ${r.at0}${r.hurtBy.length ? `  hurt by ${r.hurtBy.map(([k, v]) => `${k} ${Math.round(v)}`).join(', ')}` : ''}  ${r.ms} ms`);
    }
    console.log('');
  }
  const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN);
  const f1 = (x) => (Number.isFinite(x) ? (Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(1)) : '-');
  const head = ['start', 'n', 'lived', 'lowest hp', 'taken/s', 'kills/s', 'standing', ...(vs ? ['was: lived', 'taken/s', 'change', 'verdict'] : [])];
  const body = [];
  for (const at of ats) {
    const rs = ok.filter((r) => r.at === at);
    if (!rs.length) continue;
    const row = [`${at}:00`, rs.length, `${rs.filter((r) => r.died === null).length}/${rs.length}`, `${(mean(rs.map((r) => r.minHp)) * 100).toFixed(0)}%`, f1(mean(rs.map((r) => r.takenPerS))), f1(mean(rs.map((r) => r.killsPerS))), `${f1(mean(rs.map((r) => r.standStart)))}->${f1(mean(rs.map((r) => r.standEnd)))}`];
    if (vs) {
      const was = rs.map((r) => old.get(`${r.at}/${r.seed}`)).filter(Boolean);
      const a = mean(was.map((r) => r.takenPerS)), b = mean(rs.map((r) => r.takenPerS));
      const v = verdict(at, ok);
      row.push(`${was.filter((r) => r.died === null).length}/${was.length}`, f1(a), a ? `${b >= a ? '+' : ''}${(((b - a) / a) * 100).toFixed(0)}%` : '-', v === 'clear' ? 'clear' : v === 'same' ? 'no real change' : 'unsure');
    }
    body.push(row);
  }
  const widths = head.map((h, c) => Math.max(h.length, ...body.map((b) => String(b[c]).length)));
  console.log(head.map((h, c) => h.padStart(widths[c])).join('  '));
  for (const b of body) console.log(b.map((x, c) => String(x).padStart(widths[c])).join('  '));
  console.log('\nlived: slices the hero lived through   lowest hp: his lowest health on average   taken/s: damage a second (after armor)');
  console.log('standing: monsters standing at the start and at the end of the slice (growing: the horde is getting ahead of him)');

  if (o.save) {
    mkdirSync(OUT, { recursive: true });
    const f = resolve(OUT, `${o.save}.json`);
    writeFileSync(f, JSON.stringify({ ...base, secs, warm, ownBuild: own, results: ok }, null, 1));
    console.log(`\nSaved ${f}`);
  }
}

// Plays the jobs on `n` workers, a job at a time each, in order; skip(job, done) passes over a job
// not yet started (early stopping).
function pool(jobs, n, skip, what) {
  return new Promise((done, failed) => {
    const results = [];
    let next = 0, busy = 0, finished = 0;
    const workers = [];
    const feed = (w) => {
      while (next < jobs.length && skip(jobs[next], results.filter(Boolean))) next++;
      if (next >= jobs.length) {
        w.terminate();
        if (--busy === 0) done(results);
        return;
      }
      const i = next++;
      w.once('message', (r) => {
        results[i] = r;
        finished++;
        if (process.stderr.isTTY) process.stderr.write(`\r  ${finished} ${what}  `);
        feed(w);
      });
      w.postMessage(jobs[i]);
    };
    for (let k = 0; k < Math.min(n, jobs.length); k++) {
      const w = new Worker(new URL(import.meta.url));
      w.on('error', failed);
      workers.push(w);
      busy++;
      feed(w);
    }
    if (!busy) done(results);
  }).finally(() => process.stderr.isTTY && process.stderr.write('\r' + ' '.repeat(30) + '\r'));
}

function fail(msg) {
  throw new Error(msg);
}
