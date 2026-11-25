// Stage 1 screens bots on the Knight, then stage 2 repeats the top three on the rest of the roster.
// --preset=max-all plays to death or victory with full Armory and the unlocked Codex.
// --reuse=FILE can supply matching, completed zero-Armory runs from an earlier matrix.
// --stage=nightmare-roster runs the full roster on Max All Elite Nightmare only, for paired playtests.
// --stage=survival-roster runs the full roster, optionally limited to a comma-separated --scenarios list.

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, truncateSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { botFrom } from '../public/js/bots/strategies.js';
import { defaultProfile, HERO_ORDER, mapOpen, metaBonuses, openEverything, openFor, PROGRESS, UPGRADES } from '../public/js/shared/profile.js';
import { setPriority } from './priority.mjs';

const SCENARIOS = [
  { id: 'normal-zero', diff: 'easy', nightmare: false, equipment: 'zero' },
  { id: 'normal-full', diff: 'easy', nightmare: false, equipment: 'full' },
  { id: 'nightmare-zero', diff: 'hard', nightmare: true, equipment: 'zero' },
  { id: 'nightmare-full', diff: 'hard', nightmare: true, equipment: 'full' },
];
const DEFAULT_BOTS = ['tactician', 'autopilot', 'gems', 'kite', 'circle'];
const MAP = 'forest', MODE = 's15', NIGHT_END = 15 * 60;
const PICK = 'tactical', HZ = 60;
const ARMOR_MAX = UPGRADES.find((upgrade) => upgrade.id === 'armor').max;

function runProfile(hero, scenario, preset) {
  const profile = defaultProfile();
  // Grant the test hero and map independently of the Codex. Adding the whole roster would
  // backfill some heroes' ultimates during profile sanitation.
  if (!profile.heroes.includes(hero)) profile.heroes.push(hero);
  if (!mapOpen(profile, MAP)) profile.mo += 2 ** PROGRESS.maps.indexOf(MAP);
  if (scenario.equipment === 'full') {
    openEverything(profile);
    // Keep the bought Codex relic available and omit the separate slot upgrades.
    profile.up = preset === 'max-all'
      ? Object.fromEntries(UPGRADES.map(({ id, max }) => [id, max]))
      : { armor: ARMOR_MAX, phoenix: profile.up.phoenix };
  }
  return profile;
}

function scenarioSettings(scenario, preset) {
  const profile = runProfile('knight', scenario, preset);
  const { weaponSlots, relicSlots, reroll: rerolls, banish: banishes } = metaBonuses(profile);
  return { ...scenario, upgrades: profile.up, weaponSlots, relicSlots, rerolls, banishes, codex: openFor(profile, 'knight') };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function rankBots(bots, results) {
  return bots.map((bot) => {
    const runs = results.filter((run) => run.bot === bot);
    const scenarioMedians = Object.fromEntries(SCENARIOS.map(({ id }) => [
      id, median(runs.filter((run) => run.scenario === id).map((run) => Math.min(NIGHT_END, run.time))),
    ]));
    const score = Object.values(scenarioMedians).reduce((sum, time) => sum + time, 0) / SCENARIOS.length;
    return { bot, score, wins: runs.filter((run) => run.outcome === 'win').length, scenarioMedians };
  }).sort((a, b) => b.score - a.score || b.wins - a.wins || a.bot.localeCompare(b.bot));
}

function playAll(jobs, workers, onResult) {
  let next = 0;
  const pool = Array.from({ length: workers }, () => new Worker(new URL(import.meta.url)));
  const finish = pool.map((worker) => new Promise((done, failed) => {
    let active;
    const feed = () => {
      if (next === jobs.length) {
        done();
        return;
      }
      active = jobs[next++];
      worker.postMessage(active);
    };
    worker.on('message', (result) => {
      try {
        onResult(result, active);
        feed();
      } catch (error) {
        failed(error);
      }
    });
    worker.on('error', failed);
    worker.on('exit', (code) => failed(new Error(`Simulation worker exited early (${code}) on ${runKey(active)}`)));
    feed();
  }));
  return Promise.all(finish).finally(() => Promise.all(pool.map((worker) => worker.terminate())));
}

function runKey(job) {
  return JSON.stringify([job.hero, job.bot, job.scenario.id ?? job.scenario, job.seed]);
}

function terminalRun(run) {
  return !run.error && Number.isFinite(run.time) && run.report?.sealedGear === true &&
    Object.keys(run.report.gear ?? {}).length === 0 &&
    ((run.outcome === 'dead' && run.report.died === true) || (run.outcome === 'win' && run.report.victory === true));
}

function reusableRuns(sources, options, wanted) {
  const result = new Map();
  for (const { file, source } of sources) {
    for (const key of ['hz', 'map', 'mode', 'pick', 'crypts', 'sealedGear']) {
      if (source.options?.[key] !== options[key]) throw new Error(`Cannot reuse ${file}: ${key} differs`);
    }
    if (source.options.sourceFingerprint && source.options.sourceFingerprint !== options.sourceFingerprint) {
      throw new Error(`Cannot reuse ${file}: simulation source differs`);
    }
    for (const scenario of options.scenarios.filter((scenario) => scenario.equipment === 'zero')) {
      const old = source.options.scenarios?.find(({ id }) => id === scenario.id);
      // The first Knight JSON predates the metadata fix for the two zero resource counts.
      for (const key of ['diff', 'nightmare', 'equipment', 'upgrades', 'weaponSlots', 'relicSlots', 'rerolls', 'banishes', 'codex']) {
        const value = (key === 'rerolls' || key === 'banishes') ? (old?.[key] ?? 0) : old?.[key];
        if (JSON.stringify(value) !== JSON.stringify(scenario[key])) throw new Error(`Cannot reuse ${file}: ${scenario.id} ${key} differs`);
      }
    }
    for (const run of source.results) {
      const job = wanted.get(runKey(run));
      if (job?.scenario.equipment === 'zero' && run.time < (options.reuseBefore ?? Infinity) && run.diff === job.scenario.diff &&
        run.nightmare === job.scenario.nightmare && terminalRun(run)) {
        result.set(runKey(run), { ...run, reusedFrom: file });
      }
    }
  }
  return result;
}

function sourceFingerprint() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const publicFiles = readdirSync(resolve(root, 'public'), { recursive: true })
    .filter((file) => file.endsWith('.js')).map((file) => `public/${file.replaceAll('\\', '/')}`);
  const files = [...publicFiles, 'tools/headless.mjs', 'tools/buffs.mjs', 'tools/survival-playtest.mjs'].sort();
  const hash = createHash('sha256');
  for (const file of files) hash.update(file).update('\0').update(readFileSync(resolve(root, file))).update('\0');
  return hash.digest('hex');
}

function loadCheckpoint(file, header, wanted) {
  if (!existsSync(file)) {
    writeFileSync(file, `${JSON.stringify(header)}\n`, { flag: 'wx' });
    return new Map();
  }
  const data = readFileSync(file);
  const end = data.lastIndexOf(10) + 1; // Ignore a partial record from an interrupted append.
  const [first, ...lines] = data.subarray(0, end).toString('utf8').trimEnd().split('\n');
  if (first !== JSON.stringify(header)) throw new Error(`Checkpoint configuration differs in ${file}`);
  const completed = new Map();
  for (const line of lines) {
    const run = JSON.parse(line);
    const key = runKey(run);
    if (!wanted.has(key) || !terminalRun(run)) throw new Error(`Unexpected run ${key} in ${file}`);
    completed.set(key, run);
  }
  if (end < data.length) truncateSync(file, end);
  return completed;
}

function integer(value, name, min = 1) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min) throw new Error(`--${name} must be an integer of at least ${min}`);
  return number;
}

async function main() {
  const { values } = parseArgs({ options: {
    stage: { type: 'string' }, seed: { type: 'string' }, runs: { type: 'string' }, max: { type: 'string' },
    jobs: { type: 'string' }, json: { type: 'string' }, knight: { type: 'string' }, bots: { type: 'string' },
    priority: { type: 'string' }, preset: { type: 'string' }, reuse: { type: 'string' }, 'reuse-before': { type: 'string' },
    scenarios: { type: 'string' },
  } });
  const { stage } = values;
  const nightmareRoster = stage === 'nightmare-roster';
  const survivalRoster = stage === 'survival-roster';
  const fullRoster = nightmareRoster || survivalRoster;
  if (stage !== 'knight' && stage !== 'heroes' && !fullRoster) {
    throw new Error('Use --stage=knight, --stage=heroes, --stage=nightmare-roster, or --stage=survival-roster');
  }
  if (!survivalRoster && values.scenarios !== undefined) throw new Error('--scenarios is for --stage=survival-roster');
  if (!values.json) throw new Error('Set the output path with --json=FILE');
  if (stage !== 'heroes' && values.knight) throw new Error('--knight is the stage-one file used by --stage=heroes');
  const knight = values.knight ? JSON.parse(readFileSync(values.knight, 'utf8')) : null;
  if (knight && (knight.stage !== 'knight' || knight.selected?.length !== 3)) throw new Error('Expected a completed Knight playtest with three selected bots');
  const preset = values.preset ?? knight?.options.preset ?? (fullRoster ? 'max-all' : 'armor-codex');
  if (preset !== 'max-all' && preset !== 'armor-codex') throw new Error('Use --preset=max-all or --preset=armor-codex');
  const untilTerminal = preset === 'max-all';
  if (fullRoster && !untilTerminal) throw new Error(`--stage=${stage} requires the Max All preset`);
  if (nightmareRoster && values.reuse) throw new Error('--reuse is for zero-Armory runs');
  if (untilTerminal && values.max !== undefined) throw new Error('The Max All preset runs to death or victory');
  if (knight && (knight.options.preset ?? 'armor-codex') !== preset) throw new Error('Use a Knight matrix with the same preset');
  if (values.reuse && !untilTerminal) throw new Error('--reuse applies to the Max All preset');
  if (values['reuse-before'] !== undefined && !values.reuse) throw new Error('--reuse-before needs a --reuse source');
  const json = resolve(values.json);
  if (untilTerminal && existsSync(json) && JSON.parse(readFileSync(json, 'utf8')).options?.preset !== preset) {
    throw new Error('Choose a new --json path to preserve the original playtest');
  }
  const sources = values.reuse ? values.reuse.split(',').map((file) => {
    if (resolve(file) === json) throw new Error('The reuse source must differ from --json');
    return { file, source: JSON.parse(readFileSync(file, 'utf8')) };
  }) : [];
  const bots = values.bots?.split(',').map((bot) => bot.trim()) ?? (stage === 'knight' ? DEFAULT_BOTS : knight?.selected);
  if (!bots || new Set(bots).size !== bots.length || (stage === 'knight' ? bots.length < 3 : bots.length !== 3)) {
    if (fullRoster) throw new Error('Provide exactly three distinct finalists with --bots');
    throw new Error(stage === 'knight' ? 'Provide at least three distinct bots' : 'Provide --knight=FILE or exactly three distinct bots with --bots');
  }
  bots.forEach((bot) => botFrom(bot));
  const prior = knight?.options ?? sources[0]?.source.options;
  const seed = integer(values.seed ?? prior?.seed ?? (fullRoster ? 3111 : 2109), 'seed', 0);
  const runs = integer(values.runs ?? prior?.runs ?? 3, 'runs');
  const max = untilTerminal ? null : integer(values.max ?? prior?.max ?? 18 * 60, 'max');
  const heroes = stage === 'knight' ? ['knight'] : HERO_ORDER.filter((hero) => fullRoster || hero !== 'knight');
  const ids = SCENARIOS.map(({ id }) => id);
  const selectedScenarios = nightmareRoster ? ['nightmare-full'] : values.scenarios?.split(',').map((id) => id.trim()) ?? ids;
  if (new Set(selectedScenarios).size !== selectedScenarios.length || selectedScenarios.some((id) => !ids.includes(id))) {
    throw new Error(`Choose distinct --scenarios from ${ids.join(', ')}`);
  }
  const scenarios = SCENARIOS.filter(({ id }) => selectedScenarios.includes(id));
  const options = { preset, untilTerminal, seed, runs, max, hz: HZ, map: MAP, mode: MODE, pick: PICK, bots, heroes,
    scenarios: scenarios.map((scenario) => scenarioSettings(scenario, preset)), crypts: false, sealedGear: true };
  if (values['reuse-before'] !== undefined) options.reuseBefore = integer(values['reuse-before'], 'reuse-before');
  if (untilTerminal) {
    options.sourceFingerprint = sourceFingerprint();
    if (knight && knight.options.sourceFingerprint !== options.sourceFingerprint) throw new Error('Knight matrix simulation source differs');
  }
  const seeds = Array.from({ length: runs }, (_, index) => seed + index);
  const jobs = heroes.flatMap((hero) => scenarios.flatMap((scenario) => bots.flatMap((bot) => seeds.map((seed) => ({ hero, scenario, bot, seed, max, preset })))));
  const wanted = new Map(jobs.map((job) => [runKey(job), job]));
  const cache = reusableRuns(sources, options, wanted);
  mkdirSync(dirname(json), { recursive: true });
  const checkpoint = `${json}.checkpoint.jsonl`;
  const resumed = untilTerminal ? loadCheckpoint(checkpoint, { version: 1, stage, options }, wanted) : new Map();
  for (const [key, run] of resumed) cache.set(key, run);
  const reusedRuns = [...cache.values()].filter((run) => run.reusedFrom).length;
  const resumedRuns = resumed.size;
  const pending = jobs.filter((job) => !cache.has(runKey(job)));
  if (untilTerminal) {
    const priority = ['normal-full', 'nightmare-full', 'normal-zero', 'nightmare-zero'];
    pending.sort((a, b) => priority.indexOf(a.scenario.id) - priority.indexOf(b.scenario.id));
  }
  const workers = Math.min(pending.length, integer(values.jobs ?? Math.max(1, Math.min(6, availableParallelism() - 1)), 'jobs'));
  const start = performance.now();
  let completed = cache.size;
  setPriority(values.priority ?? 'low');
  console.log(`${stage} ${preset}: ${jobs.length} games (${pending.length} pending, ${reusedRuns} reused, ${resumedRuns} checkpointed), ${workers} workers, ${runs} seeds starting at ${seed}, ${HZ} Hz`);
  await playAll(pending, workers, (result, job) => {
    const key = runKey(job);
    if (runKey(result) !== key) throw new Error(`Unexpected simulation result for ${key}`);
    if (untilTerminal && !result.error && !terminalRun(result)) result.error = 'Simulation returned without verified death or victory';
    if (untilTerminal && !result.error) appendFileSync(checkpoint, `${JSON.stringify(result)}\n`, { flush: true });
    cache.set(key, result);
    completed++;
    if (result.error) console.error(`${result.hero} ${result.bot} ${result.scenario} seed ${result.seed}: ${result.error}`);
    if (completed === 1 || completed % 5 === 0 || completed === jobs.length) {
      console.log(`${completed}/${jobs.length} complete | ${result.hero} ${result.bot} ${result.scenario} seed ${result.seed} | ${result.outcome ?? 'failed'} ${result.time ?? '-'}s`);
    }
  });
  const results = jobs.map((job) => cache.get(runKey(job)));
  const failed = results.filter((result) => result.error).length;
  const ranking = stage === 'knight' && failed === 0 ? rankBots(bots, results) : undefined;
  const selected = stage === 'knight' ? ranking?.slice(0, 3).map(({ bot }) => bot) : bots;
  const elapsedSeconds = (performance.now() - start) / 1000;
  if (untilTerminal && failed) throw new Error(`${failed} games failed. Successful runs are saved in ${checkpoint}`);
  const temp = `${json}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify({ stage, options, ranking, selected, elapsedSeconds, reusedRuns, resumedRuns, results }, null, 2) + '\n');
  renameSync(temp, json);
  console.log(`Wrote ${results.length} games to ${json} in ${elapsedSeconds.toFixed(1)} seconds`);
  if (ranking) console.table(ranking.map(({ bot, score, wins }) => ({ bot, score, wins })));
  if (failed) process.exitCode = 1;
}

if (isMainThread) {
  await main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
} else {
  const { playGame } = await import('./headless.mjs');
  const { Pickup } = await import('../public/js/game/pickups.js');
  const collect = Pickup.prototype.collect;
  parentPort.on('message', ({ hero, scenario, bot, seed, max, preset }) => {
    const progression = { pickups: {}, xpCollected: 0, chestsOpened: 0, evolutions: [] };
    Pickup.prototype.collect = function () {
      collect.call(this);
      progression.pickups[this.kind] = (progression.pickups[this.kind] ?? 0) + 1;
      if (this.kind === 'gem') progression.xpCollected += this.value;
    };
    try {
      const strategy = botFrom(bot);
      let game;
      const observed = { ...strategy, tick(view) {
        if (!game) {
          game = view.g;
          const rollChest = game.rollChest.bind(game);
          game.rollChest = (kind) => {
            const chest = rollChest(kind);
            progression.chestsOpened++;
            for (const item of chest.items) {
              if (item.type === 'evolve') progression.evolutions.push({ time: Math.round(game.time * 10) / 10, from: item.from, id: item.id });
            }
            return chest;
          };
        }
        return strategy.tick(view);
      } };
      const profile = runProfile(hero, scenario, preset);
      const { diff, nightmare } = scenario;
      const result = playGame({ hero, bot: observed, label: bot, pick: PICK, mode: MODE, map: MAP, diff, nightmare, profile, seed, max, hz: HZ, sealedGear: true });
      if (Object.keys(result.report.gear).length) throw new Error('A wearable item was equipped');
      parentPort.postMessage({ ...result, scenario: scenario.id, progression });
    } catch (error) {
      parentPort.postMessage({ hero, scenario: scenario.id, bot, seed, error: error.stack });
    } finally {
      Pickup.prototype.collect = collect;
    }
  });
}
