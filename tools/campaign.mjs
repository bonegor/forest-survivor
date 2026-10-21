// Bot campaigns: how a new player progresses. Each campaign starts from a fresh save
// (shared/profile.js defaultProfile), plays a night with it (tools/headless.mjs, the save's Armory,
// slots, rerolls, banishes and unlocks), banks the run as the server does (applyRun: gold, wage,
// records, milestones), spends the gold in the Armory as the server does (buyUpgrade) by a buying
// order, and plays the next night, until a night is won or --runs have been played.
//   node tools/campaign.mjs --hero=knight --campaigns=2 --runs=40
// A campaign is sequential, so the worker pool plays whole campaigns (hero × bot × campaign) side
// by side. Campaign c plays seed + 1000·c + i on its run i, so a seed always replays the same campaigns.

import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOTS, botFrom } from '../public/js/bots/strategies.js';
import { HEROES } from '../public/js/data/heroes.js';
import * as P from '../public/js/shared/profile.js';
import { fmtTime } from '../public/js/engine/util.js';

// Armory buying orders. Tiers (separated by / on the command line) are bought one after another:
// on every visit the cheapest rank that gold can buy in the first tier with anything left, again
// and again, ties to the one listed first; while that tier's cheapest is out of reach the gold is
// saved for it, and nothing below is bought. One tier is "the cheapest affordable rank from the
// list"; a tier of one is a strict order.
export const ORDERS = {
  // Default: survive first, since a new Knight dies in the first minute. Health, armor and regen
  // keep him standing, Might and the slots (Arsenal, Reliquary) let him kill what reaches him,
  // Haste and Swiftness both; cheapest first spreads the gold, since every rank costs more than
  // the last. Then what speeds the climb (experience, gold, pickup, area, the level-up choices),
  // and last the dear and the marginal.
  survival: 'vitality,armor,recovery,might,arsenal,reliquary,haste,swiftness/wisdom,greed,magnet,reach,reroll,banish,endurance/revival,echo,fortune,velocity',
  // Killing first: damage, cooldowns, slots and area, then the survival tier.
  power: 'might,haste,arsenal,reliquary,reach/vitality,armor,recovery,swiftness/wisdom,greed,magnet,reroll,banish,endurance/revival,echo,fortune,velocity',
  // Investing first: gold and experience, then as survival.
  greed: 'greed,wisdom/vitality,armor,recovery,might,arsenal,reliquary,haste,swiftness/magnet,reach,reroll,banish,endurance/revival,echo,fortune,velocity',
  // Whatever is cheapest, of everything.
  cheapest: P.UPGRADES.map((u) => u.id).join(','),
};

const HELP = `Usage: node tools/campaign.mjs [options]

  --hero=LIST   ${Object.keys(HEROES).join(', ')}, or all (default: knight); a hero later
                in the ladder is given to the fresh save
  --bot=LIST    strategies (default: gems); gems and autopilot play best
  --diff=X      normal or veteran (default: normal)
  --runs=N      most runs in a campaign (default: 60); it stops at its first night won
  --campaigns=N independent campaigns for each hero and bot, on other seeds (default: 3)
  --seed=N      first seed (default: 1); campaign c plays seed + 1000c + i on its run i
  --order=X     the Armory's buying order: ${Object.keys(ORDERS).join(', ')} (default: survival),
                or a list of upgrade ids in tiers, e.g. vitality,armor,recovery/might,arsenal:
                the cheapest affordable rank of the first tier with anything left, saving
                for it when none is affordable; then the next tier. Ids: ${P.UPGRADES.map((u) => u.id).join(', ')}
  --block=N     runs to a column in the trends (default: 5)
  --max=TIME    stop a run after this much game time, seconds or m:ss (default: 20:00)
  --jobs=N      campaigns played in parallel (default: one per core, less one)
  --each        print every campaign run by run
  --json=FILE   write every run of every campaign to FILE`;

// 'survival' or 'a,b/c' -> [['a', 'b'], ['c']]
export function parseOrder(v) {
  const tiers = String(ORDERS[v] ?? v).split('/').map((t) => t.split(',').map((s) => s.trim()).filter(Boolean)).filter((t) => t.length);
  if (!tiers.length) throw new Error('--order needs at least one upgrade');
  const seen = new Set();
  for (const id of tiers.flat()) {
    if (!P.UPGRADES.some((u) => u.id === id)) throw new Error(`Unknown Armory upgrade "${id}" (${P.UPGRADES.map((u) => u.id).join(', ')}, or ${Object.keys(ORDERS).join(', ')})`);
    if (seen.has(id)) throw new Error(`"${id}" is in the order twice`);
    seen.add(id);
  }
  return tiers;
}

// Spends the profile's gold by the order, through the game's own purchase (buyUpgrade, as the
// server sells a rank). Returns the profile and what was bought, in order.
export function shop(profile, tiers) {
  let p = profile;
  const bought = [];
  for (;;) {
    const tier = tiers.find((t) => t.some((id) => (p.up[id] || 0) < P.UPGRADES.find((u) => u.id === id).max));
    if (!tier) break;
    let best = null;
    for (const id of tier) {
      const u = P.UPGRADES.find((x) => x.id === id), rank = p.up[id] || 0;
      if (rank >= u.max) continue;
      const cost = P.upgradeCost(id, rank);
      if (!best || cost < best.cost) best = { id, cost };
    }
    if (best.cost > p.gold) break; // saving for it
    const r = P.buyUpgrade(p, best.id);
    if (!r.ok) throw new Error(`The Armory refused ${best.id}: ${r.error}`);
    p = r.profile;
    bought.push(best.id);
  }
  return { profile: p, bought };
}

// One campaign, run by run. playGame: tools/headless.mjs's; onRun: called after each run.
export function playCampaign(o, playGame, onRun = () => {}) {
  const { hero = 'knight', bot = 'gems', diff = 'medium', runs = 60, seed = 1, order = 'survival', max = 1200, pick = 'build' } = o;
  const tiers = Array.isArray(order) ? order : parseOrder(order);
  let profile = P.defaultProfile();
  if (!profile.heroes.includes(hero)) profile.heroes.push(hero);
  const log = [];
  let won = 0;
  for (let i = 1; i <= runs && !won; i++) {
    const armory = { ...profile.up }; // the ranks this run is played with
    const g = playGame({ profile, hero, bot, pick, diff, mode: 's15', seed: seed + i - 1, max });
    const r = P.applyRun(profile, g.report);
    if (!r.ok) throw new Error(`Run ${i} was refused: ${r.error}`);
    const s = shop(r.profile, tiers);
    profile = s.profile;
    if (g.outcome === 'win') won = i;
    const unlocked = [...r.reward.unlocked.map((u) => `${u.type}:${u.id}`), ...r.reward.unlocks];
    const entry = {
      run: i, seed: seed + i - 1, outcome: g.outcome, time: g.time, level: g.level, kills: g.kills, cause: g.cause ?? null,
      gold: g.report.gold, collected: r.reward.collected, wage: r.reward.wage, bonus: r.reward.bonus, banked: r.reward.total,
      armory, bought: s.bought, unlocked, goldLeft: profile.gold, up: { ...profile.up }, weapons: g.weapons, passives: g.passives, ms: g.ms,
    };
    log.push(entry);
    onRun(entry);
  }
  return { hero, bot, diff, seed, order: tiers.map((t) => t.join(',')).join('/'), won, runs: log, profile };
}

// --------------------------------------------------------------- main --

async function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help) return console.log(HELP);
  const list = (key, all, dflt) => {
    const raw = opts[key] ?? dflt;
    const l = raw === 'all' ? Object.keys(all) : String(raw).split(',').map((s) => s.trim()).filter(Boolean);
    if (!l.length) fail(`--${key} needs at least one value`);
    return [...new Set(l)];
  };
  const heroes = list('hero', HEROES, 'knight');
  for (const h of heroes) if (!HEROES[h]) fail(`Unknown hero "${h}" (${Object.keys(HEROES).join(', ')}, or all)`);
  const bots = list('bot', BOTS, 'gems');
  for (const b of bots) botFrom(b); // a bad strategy fails here, not in every worker
  const diff = { normal: 'medium', veteran: 'hard' }[opts.diff ?? 'normal'] ?? fail('--diff must be normal or veteran');
  const runs = posInt(opts.runs ?? 60, 'runs');
  if (runs > 1000) fail('--runs must be at most 1000');
  const campaigns = posInt(opts.campaigns ?? 3, 'campaigns');
  const seed0 = Number.isInteger(Number(opts.seed ?? 1)) ? Number(opts.seed ?? 1) : fail('--seed must be a whole number');
  const order = parseOrder(opts.order ?? 'survival');
  const block = posInt(opts.block ?? 5, 'block');
  const max = parseTime(opts.max ?? '20:00');
  if (opts.json === true) fail('--json needs a file name: --json=tools/out/campaign.json');

  const jobs = [];
  for (const hero of heroes) for (const bot of bots) for (let c = 0; c < campaigns; c++) {
    jobs.push({ hero, bot, diff, runs, seed: seed0 + 1000 * c, order, max, campaign: c + 1 });
  }
  const cores = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
  const workers = Math.max(1, Math.min(jobs.length, posInt(opts.jobs ?? Math.max(1, cores - 1), 'jobs')));
  const t0 = performance.now();
  let played = 0;
  const results = await playAll(jobs, workers, () => {
    played++;
    if (process.stderr.isTTY) process.stderr.write(`\r  ${played} runs played`);
  });
  if (process.stderr.isTTY) process.stderr.write('\r' + ' '.repeat(30) + '\r');
  const secs = (performance.now() - t0) / 1000;

  const orderName = ORDERS[opts.order ?? 'survival'] ? opts.order ?? 'survival' : 'custom';
  console.log(`\nBot campaigns · ${diff === 'medium' ? 'Normal' : 'Veteran'} · ${campaigns} campaign${campaigns > 1 ? 's' : ''} each of up to ${runs} runs (seeds from ${seed0}) · cap ${fmtTime(max)} · buying ${orderName}`);
  console.log(`  order: ${order.map((t) => t.join(',')).join(' / ')}`);
  console.log(`${played} runs on ${workers} worker${workers > 1 ? 's' : ''} in ${secs.toFixed(1)} s`);

  for (const hero of heroes) for (const bot of bots) {
    const cs = results.filter((r) => r.hero === hero && r.bot === bot);
    report(cs, `${hero} · ${bot}`, runs, block, !!opts.each);
  }
  const errors = results.filter((r) => r.error);
  if (errors.length) {
    console.log(`\n${errors.length} campaign${errors.length > 1 ? 's' : ''} failed; the first:\n${errors[0].error}`);
    process.exitCode = 1;
  }
  if (opts.json) {
    const file = resolve(String(opts.json));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ options: { heroes, bots, diff, runs, campaigns, seed: seed0, order: order.map((t) => t.join(',')).join('/'), max }, campaigns: results.map(({ profile, ...c }) => c) }, null, 1));
    console.log(`\nWrote ${results.length} campaigns to ${file}`);
  }
}

// Plays every campaign on a pool of workers; results come back in job order. A worker reports
// each run as it goes ({ run }) and the campaign at its end ({ done }).
function playAll(jobs, n, onRun) {
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
      w.on('message', (m) => {
        if (m.run) return onRun(m.run);
        results[at] = { ...m.done, campaign: jobs[at].campaign };
        feed();
      });
      w.on('error', crash);
      feed();
    });
  return Promise.all(Array.from({ length: n }, worker)).then(() => results);
}

// ------------------------------------------------------------- report --

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b), n = s.length;
  return n ? (s[(n - 1) >> 1] + s[n >> 1]) / 2 : 0;
};
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const ranks = (up) => P.UPGRADES.filter((u) => up[u.id]).map((u) => `${u.id} ${up[u.id]}`).join(', ') || 'nothing';

function report(cs, title, maxRuns, block, each) {
  const ok = cs.filter((c) => !c.error);
  console.log(`\n== ${title} ==`);
  if (!ok.length) return console.log('  every campaign failed');
  const wins = ok.filter((c) => c.won).map((c) => c.won);
  const firstWin = wins.length
    ? `median ${median(wins)}${wins.length > 1 ? `, range ${Math.min(...wins)}-${Math.max(...wins)}` : ''}${wins.length < ok.length ? `; ${ok.length - wins.length} of ${ok.length} not within ${maxRuns}` : ''}`
    : `not within ${maxRuns} (none of ${ok.length})`;
  console.log(`  runs to the first win: ${firstWin}   [${ok.map((c) => c.won || `>${maxRuns}`).join(', ')}]`);

  // Trends: a column for every `block` runs, the mean over the campaigns still playing.
  const longest = Math.max(...ok.map((c) => c.runs.length));
  const cols = [];
  for (let a = 1; a <= longest; a += block) {
    const rs = ok.flatMap((c) => c.runs.filter((r) => r.run >= a && r.run < a + block));
    cols.push({ head: block > 1 ? `${a}-${Math.min(a + block - 1, longest)}` : `${a}`, rs });
  }
  const row = (label, f) => [label, ...cols.map((c) => f(c.rs))];
  const table = [
    ['runs', ...cols.map((c) => c.head)],
    row('survived', (rs) => fmtTime(mean(rs.map((r) => r.time)))),
    row('level', (rs) => mean(rs.map((r) => r.level)).toFixed(0)),
    row('picked up', (rs) => Math.round(mean(rs.map((r) => r.collected)))),
    row('wage', (rs) => Math.round(mean(rs.map((r) => r.wage)))),
    row('banked', (rs) => Math.round(mean(rs.map((r) => r.banked)))),
    row('Armory ranks', (rs) => mean(rs.map((r) => Object.values(r.up).reduce((a, b) => a + b, 0))).toFixed(0)),
  ];
  const width = table[0].map((_, i) => Math.max(...table.map((r) => String(r[i]).length)));
  for (const r of table) console.log('  ' + r.map((v, i) => (i ? String(v).padStart(width[i]) : String(v).padEnd(width[i]))).join('  '));
  console.log('  (means of each block of runs over the campaigns still playing; banked = picked up + wage + a win\'s bonus)');

  // The gold over the whole campaign, and the Armory the first win was played with (or the one at the end).
  for (const c of ok) {
    const total = c.runs.reduce((s, r) => s + r.banked, 0), last = c.runs[c.runs.length - 1];
    const spent = c.won ? `won on run ${c.won} with Armory: ${ranks(last.armory)}` : `no win in ${c.runs.length}; Armory at the end: ${ranks(last.up)}`;
    console.log(`  campaign ${c.campaign}: ${total} gold banked, ${last.goldLeft} unspent; ${spent}`);
  }

  // When each unlock came: the run, in each campaign.
  const when = new Map();
  ok.forEach((c, k) => {
    for (const r of c.runs) for (const u of r.unlocked) {
      if (!when.has(u)) when.set(u, new Array(ok.length).fill(null));
      when.get(u)[k] = r.run;
    }
  });
  if (when.size) {
    console.log('  unlocked on run (each campaign):');
    const list = [...when].sort((a, b) => median(a[1].map((x) => x ?? 1e9)) - median(b[1].map((x) => x ?? 1e9)));
    const w = Math.max(...list.map(([u]) => u.length));
    for (const [u, at] of list) console.log(`    ${u.padEnd(w)}  ${at.map((x) => x ?? '-').join(', ')}`);
  } else console.log('  nothing unlocked');

  if (each) for (const c of ok) {
    console.log(`\n  campaign ${c.campaign} (seeds ${c.seed}-${c.seed + c.runs.length - 1}):`);
    for (const r of c.runs) {
      const out = { win: 'WON  ', dead: 'DIED ', alive: 'ALIVE' }[r.outcome];
      const extra = [r.bought.length ? `bought ${r.bought.join(' ')}` : '', r.unlocked.length ? `unlocked ${r.unlocked.join(' ')}` : ''].filter(Boolean).join('; ');
      console.log(`  ${String(r.run).padStart(3)} ${out} ${fmtTime(r.time)} L${r.level} ${r.kills} kills  +${r.banked} (${r.collected} + wage ${r.wage}${r.bonus ? ` + win ${r.bonus}` : ''}) -> ${r.goldLeft} left${extra ? '  ' + extra : ''}${r.cause ? `  killed by ${r.cause}` : ''}`);
    }
  }
}

// --------------------------------------------------------------- options --

function parseArgs(argv) {
  const known = ['hero', 'bot', 'diff', 'runs', 'campaigns', 'seed', 'order', 'block', 'max', 'jobs', 'each', 'json', 'help'];
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

// ----------------------------------------------------------------- entry --

if (!isMainThread) {
  // A worker: plays whatever campaigns the main thread hands it, one at a time.
  const { playGame } = await import('./headless.mjs');
  parentPort.on('message', (job) => {
    try {
      const c = playCampaign(job, playGame, (run) => parentPort.postMessage({ run: { run: run.run } }));
      parentPort.postMessage({ done: c });
    } catch (e) {
      parentPort.postMessage({ done: { hero: job.hero, bot: job.bot, seed: job.seed, error: e.stack || String(e) } });
    }
  });
} else if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Run, not imported (test/campaign.test.js imports it).
  try {
    await main(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
