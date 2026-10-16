// Bot play-testing: plays the real game headlessly (tools/headless.mjs) with
// scripted strategies (public/js/bots/) and compares how they fare.
//   node tools/bots.mjs --bot=idle,circle,kite --hero=knight --mode=s15 --runs=10 --seed=1
// Options take comma lists (or "all"); the table gets a row per combination,
// and every combination plays the same seeds. --list shows the strategies.

import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BOTS, botFrom, parseSpec } from '../public/js/bots/strategies.js';
import { PICKS } from '../public/js/bots/picks.js';
import { HEROES } from '../public/js/data/heroes.js';
import { MODES } from '../public/js/data/difficulty.js';
import { UPGRADES } from '../public/js/shared/profile.js';
import { fmtTime } from '../public/js/engine/util.js';

const HELP = `Usage: node tools/bots.mjs [options]     (npm run bots -- [options])

  --bot=LIST    strategies: ${Object.keys(BOTS).join(', ')} (default: all)
                with parameters as name:key=value (kite:r=40, circle:r=60:dir=-1),
                or a .mjs file of your own exporting a strategy
  --pick=LIST   level-up policy when the bot doesn't pick: ${Object.keys(PICKS).join(', ')} (default: build)
  --hero=LIST   ${Object.keys(HEROES).join(', ')} (default: knight)
  --mode=LIST   ${Object.keys(MODES).join(', ')} (default: s15)
  --runs=N      games per combination (default: 3); run i plays seed + i
  --seed=N      first seed (default: 1)
  --max=TIME    stop a game after this much game time, seconds or m:ss (default: 60:00)
  --hz=N        simulation steps per second (default: 60, like a 60 Hz screen)
  --armory=X    Armory ranks: none, max, or might:5,armor:3 (default: none)
  --diff=X      normal or veteran (default: veteran, the game as it was tuned)
  --jobs=N      games played in parallel (default: one per core, less one)
  --each        print a line per game
  --json=FILE   write every game's result to FILE
  --list        describe the strategies and pick policies`;

// A built-in spec goes to the game as is; a file is loaded and its parameters split off.
const loaded = new Map();
async function strategyOf(spec) {
  const { name, params } = parseSpec(spec);
  if (BOTS[name]) return { bot: spec };
  const file = resolve(name);
  if (!existsSync(file)) throw new Error(`No strategy "${name}": not a built-in (${Object.keys(BOTS).join(', ')}) and no such file`);
  if (!loaded.has(file)) {
    const mod = await import(pathToFileURL(file).href);
    loaded.set(file, mod.default ?? mod.bot);
  }
  return { bot: loaded.get(file), params };
}

async function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help) return console.log(HELP);
  if (opts.list) return listStrategies();
  const pickList = (key, all, dflt) => {
    const raw = opts[key] ?? dflt;
    const list = raw === 'all' ? Object.keys(all) : String(raw).split(',').map((s) => s.trim()).filter(Boolean);
    if (!list.length) fail(`--${key} needs at least one value`);
    if (all !== BOTS) for (const x of list) if (!all[x]) fail(`Unknown ${key} "${x}" (try ${Object.keys(all).join(', ')}, or all)`);
    return [...new Set(list)];
  };
  const bots = pickList('bot', BOTS, 'all');
  const picks = pickList('pick', PICKS, 'build');
  const heroes = pickList('hero', HEROES, 'knight');
  const modes = pickList('mode', MODES, 's15');
  const runs = posInt(opts.runs ?? 3, 'runs');
  const seed0 = Number.isInteger(Number(opts.seed ?? 1)) ? Number(opts.seed ?? 1) : fail('--seed must be a whole number');
  const hz = posInt(opts.hz ?? 60, 'hz');
  const max = parseTime(opts.max ?? '60:00');
  const armory = parseArmory(opts.armory ?? 'none');
  const diff = { normal: 'medium', veteran: 'hard' }[opts.diff ?? 'veteran'] ?? fail('--diff must be normal or veteran');
  if (opts.json === true) fail('--json needs a file name: --json=tools/out/bots.json');
  // Catch a bad strategy or parameter here rather than in every worker.
  for (const spec of bots) {
    const s = await strategyOf(spec);
    botFrom(s.bot, s.params, spec);
  }

  // Every combination plays the same seeds, so rows compare like for like.
  const combos = [];
  for (const bot of bots) for (const pick of picks) for (const hero of heroes) for (const mode of modes) {
    combos.push({ bot, pick, hero, mode });
  }
  const jobs = [];
  for (const c of combos) for (let i = 0; i < runs; i++) jobs.push({ ...c, seed: seed0 + i, hz, max, armory, diff });

  const cores = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
  const workers = Math.max(1, Math.min(jobs.length, posInt(opts.jobs ?? Math.max(1, cores - 1), 'jobs')));
  const t0 = performance.now();
  let done = 0;
  const results = await playAll(jobs, workers, () => {
    done++;
    if (process.stderr.isTTY) process.stderr.write(`\r  ${done}/${jobs.length} games`);
  });
  if (process.stderr.isTTY) process.stderr.write('\r' + ' '.repeat(30) + '\r');
  const secs = (performance.now() - t0) / 1000;

  // Header: whatever is the same for every row.
  const dims = ['bot', 'pick', 'hero', 'mode'];
  const varying = dims.filter((k) => new Set(combos.map((c) => c[k])).size > 1);
  const same = dims.filter((k) => !varying.includes(k)).map((k) => (k === 'pick' ? 'pick ' : '') + combos[0][k]);
  const seeds = runs > 1 ? `seeds ${seed0}-${seed0 + runs - 1}` : `seed ${seed0}`;
  const arm = Object.keys(armory).length ? 'armory ' + Object.entries(armory).map(([k, r]) => k + ':' + r).join(',') : 'no armory';
  console.log(`\nBot play-test · ${[...same, `${runs} run${runs > 1 ? 's' : ''} each (${seeds})`, `${hz} Hz`, `cap ${fmtTime(max)}`, arm, diff === 'medium' ? 'Normal' : 'Veteran'].join(' · ')}`);
  console.log(`${jobs.length} game${jobs.length > 1 ? 's' : ''} on ${workers} worker${workers > 1 ? 's' : ''} in ${secs.toFixed(1)} s\n`);

  const rows = combos.map((c) => ({ c, s: summarize(results.filter((r) => dims.every((k) => r[k] === c[k]))) }));
  printTable(rows, varying, modes.includes('dungeon'));

  if (opts.each) {
    const who = (r) => [...(varying.length ? varying : ['bot']).map((k) => shown(k, r[k])), `seed ${r.seed}`].join(' ');
    const w = Math.max(...results.map((r) => who(r).length));
    console.log('');
    for (const r of results) console.log(`${who(r).padEnd(w)}  ${gameLine(r)}`);
  }
  const errors = results.filter((r) => r.error);
  if (errors.length) {
    console.log(`\n${errors.length} game${errors.length > 1 ? 's' : ''} failed; the first:\n${errors[0].error}`);
    process.exitCode = 1;
  }
  if (opts.json) {
    const file = resolve(String(opts.json));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ options: { bots, picks, heroes, modes, runs, seed: seed0, hz, max, armory }, results }, null, 1));
    console.log(`\nWrote ${results.length} results to ${file}`);
  }
}

// Plays every job on a pool of workers; results come back in job order.
function playAll(jobs, n, onResult) {
  const results = new Array(jobs.length);
  let next = 0;
  const worker = () =>
    new Promise((done, crash) => {
      const w = new Worker(new URL(import.meta.url));
      let at = -1;
      const feed = () => {
        if (next >= jobs.length) {
          w.terminate();
          return done();
        }
        at = next++;
        w.postMessage(jobs[at]);
      };
      w.on('message', (r) => {
        results[at] = r;
        onResult(r);
        feed();
      });
      w.on('error', crash);
      feed();
    });
  return Promise.all(Array.from({ length: n }, worker)).then(() => results);
}

// ------------------------------------------------------------- report --

function summarize(rs) {
  const ok = rs.filter((r) => !r.error), n = ok.length;
  const mean = (f) => (n ? ok.reduce((s, r) => s + f(r), 0) / n : 0);
  const times = ok.map((r) => r.time).sort((a, b) => a - b);
  const causes = new Map();
  for (const r of ok) if (r.cause) causes.set(r.cause, (causes.get(r.cause) || 0) + 1);
  return {
    n,
    failed: rs.length - n,
    won: ok.filter((r) => r.outcome === 'win').length,
    died: ok.filter((r) => r.outcome === 'dead').length,
    alive: ok.filter((r) => r.outcome === 'alive').length,
    median: n ? (times[(n - 1) >> 1] + times[n >> 1]) / 2 : 0,
    mean: mean((r) => r.time),
    range: n ? [times[0], times[n - 1]] : [0, 0],
    kills: mean((r) => r.kills),
    level: mean((r) => r.level),
    dpm: mean((r) => r.damageTaken / Math.max(1, r.time / 60)), // damage taken per minute alive
    bosses: mean((r) => r.bosses),
    floor: mean((r) => r.floor),
    causes: [...causes].sort((a, b) => b[1] - a[1]),
  };
}

// A strategy file shows as its file name: C:\bots\mine.mjs:x=1 -> mine.mjs:x=1
const shown = (k, v) => (k === 'bot' && /[\\/]/.test(v) ? basename(parseSpec(v).name) + v.slice(parseSpec(v).name.length) : v);

function printTable(rows, varying, dungeon) {
  const any = (f) => rows.some((r) => f(r.s));
  const cols = [
    ...(varying.length ? varying : ['bot']).map((k) => [k, (r) => shown(k, r.c[k]), 'left']),
    ['won', (r) => r.s.won],
    ['died', (r) => r.s.died],
    ...(any((s) => s.alive) ? [['alive', (r) => r.s.alive]] : []),
    ...(any((s) => s.failed) ? [['failed', (r) => r.s.failed]] : []),
    ['median', (r) => fmtTime(r.s.median)],
    ['mean', (r) => fmtTime(r.s.mean)],
    ['range', (r) => (r.s.range[0] === r.s.range[1] ? fmtTime(r.s.range[0]) : `${fmtTime(r.s.range[0])}-${fmtTime(r.s.range[1])}`)],
    ['kills', (r) => Math.round(r.s.kills)],
    ['level', (r) => r.s.level.toFixed(1)],
    ['dmg/min', (r) => Math.round(r.s.dpm)],
    ['bosses', (r) => r.s.bosses.toFixed(1)],
    ...(dungeon ? [['floor', (r) => r.s.floor.toFixed(1)]] : []),
    ['killed by', (r) => r.s.causes.slice(0, 3).map(([k, v]) => `${k} ${v}`).join(', ') || '-', 'left'],
  ];
  const cells = rows.map((r) => cols.map(([, f]) => String(f(r))));
  const width = cols.map(([h], i) => Math.max(h.length, ...cells.map((row) => row[i].length)));
  const line = (vals) => vals.map((v, i) => (cols[i][2] === 'left' ? v.padEnd(width[i]) : v.padStart(width[i]))).join('  ').trimEnd();
  console.log(line(cols.map(([h]) => h)));
  for (const row of cells) console.log(line(row));
  console.log('\nwon/died/alive: games (alive = standing at the cap). median/mean/range: game time survived. kills, level,');
  console.log('dmg/min (damage taken per minute alive) and bosses (slain): means. killed by: what landed the final blow.');
}

function gameLine(r) {
  if (r.error) return `FAILED: ${r.error.split('\n')[0]}`;
  const out = { win: 'WON  ', dead: 'DIED ', alive: 'ALIVE' }[r.outcome];
  const floor = r.mode === 'dungeon' ? ` floor ${r.floor}` : '';
  const death = r.cause ? `  killed by ${r.cause}` : '';
  return `${out} ${fmtTime(r.time)}${floor}  L${r.level}  ${r.kills} kills  ${r.damageTaken} dmg in ${r.hits} hits (boss ${r.fromBoss}, mobs ${r.fromMobs}, shots ${r.fromShots})${death}  [${r.weapons.join(' ')} | ${r.passives.join(' ') || '-'}]  ${r.ms} ms`;
}

function listStrategies() {
  const show = (title, table) => {
    console.log(`${title}:`);
    for (const [name, def] of Object.entries(table)) {
      const params = Object.entries({ ...(table === BOTS ? { ult: 1 } : {}), ...def.params }).map(([k, v]) => `${k}=${v}`).join(' ');
      console.log(`  ${name.padEnd(10)} ${def.about}${params ? `  [${params}]` : ''}`);
    }
  };
  show('Strategies (--bot)', BOTS);
  console.log('  Every strategy presses the ultimate when it is ready unless given ult=0.\n');
  show('Level-up policies (--pick)', PICKS);
}

// --------------------------------------------------------------- options --

function parseArgs(argv) {
  const known = ['bot', 'pick', 'hero', 'mode', 'runs', 'seed', 'max', 'hz', 'armory', 'diff', 'jobs', 'each', 'json', 'list', 'help'];
  const opts = {};
  for (const a of argv) {
    const m = /^--([a-z]+)(?:=(.*))?$/.exec(a);
    if (!m || !known.includes(m[1])) fail(`Unknown option "${a}"\n\n${HELP}`);
    opts[m[1]] = m[2] ?? true;
  }
  return opts;
}

function fail(msg) {
  throw new Error(msg);
}

function posInt(v, name) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : fail(`--${name} must be a whole number above 0`);
}

// '600', '10:00' -> 600
function parseTime(v) {
  const m = /^(\d+)(?::(\d{1,2}))?$/.exec(String(v));
  if (!m) fail(`--max must be seconds or m:ss, not "${v}"`);
  return m[2] === undefined ? Number(m[1]) : Number(m[1]) * 60 + Number(m[2]);
}

// 'none', 'max', 'might:5,armor:3' -> { might: 5, armor: 3 }
function parseArmory(v) {
  if (v === 'none') return {};
  if (v === 'max') return Object.fromEntries(UPGRADES.map((u) => [u.id, u.max]));
  const up = {};
  for (const part of String(v).split(',')) {
    const [id, rank] = part.split(':');
    const u = UPGRADES.find((x) => x.id === id);
    if (!u) fail(`Unknown Armory upgrade "${id}" (${UPGRADES.map((x) => x.id).join(', ')})`);
    up[id] = Math.min(u.max, Math.max(0, Math.floor(Number(rank ?? u.max)) || 0));
  }
  return up;
}

// ----------------------------------------------------------------- entry --

if (!isMainThread) {
  // A worker: plays whatever games the main thread hands it, one at a time.
  const { playGame } = await import('./headless.mjs');
  parentPort.on('message', async (job) => {
    try {
      const { bot, params } = await strategyOf(job.bot);
      parentPort.postMessage(playGame({ ...job, bot, params, label: job.bot }));
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
