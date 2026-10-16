// Frame cost, headless: how long a frame's update, world drawing and HUD take in JavaScript,
// and how much garbage each leaves. The canvases are tools/headless.mjs's dummies, so drawing
// costs only the game's own code. An unkillable Knight on Normal is played by a bot to the
// starting minute (the horde is hundreds strong by minute 10), then timed for `secs` of game time.
//   node --expose-gc tools/perf.mjs [--seed=1] [--from=570] [--secs=60] [--bot=autopilot] [--hero=knight]
//   node tools/perf.mjs --detail      # also times the drawing paths one by one (slower)
//   node tools/perf.mjs --root=DIR    # another checkout of the game (DIR/public, DIR/tools/headless.mjs)
//   node tools/perf.mjs --sites=25    # where the garbage is made: the top 25 allocation sites
// Calls into the dummy canvas box their non-integer numbers, which a browser's canvas doesn't,
// so the world drawing's garbage here is more than a browser's; compare runs with each other.

import { pathToFileURL } from 'node:url';
import { PerformanceObserver, performance } from 'node:perf_hooks';
import { Session } from 'node:inspector/promises';
import v8 from 'node:v8';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const root = args.root ? pathToFileURL(args.root.replace(/[\\/]?$/, '/')).href : new URL('../', import.meta.url).href;
const mod = (file) => import(new URL(file, root).href);
const seed = Number(args.seed ?? 1), from = Number(args.from ?? 570), secs = Number(args.secs ?? 60);
const hero = args.hero || 'knight', bot = args.bot || 'autopilot', detail = !!args.detail;

await mod('tools/headless.mjs');
const { Game } = await mod('public/js/game/game.js');
const { Driver } = await mod('public/js/bots/driver.js');
const { mulberry32 } = await mod('public/js/engine/util.js');
const { view } = await mod('public/js/engine/view.js');
const { Enemy } = await mod('public/js/game/enemies.js');
const { Pickup } = await mod('public/js/game/pickups.js');
const FX = await mod('public/js/game/effects.js');
const P = await mod('public/js/shared/profile.js');

// A 1080p screen: the world at 3.2 screen pixels an art pixel, the HUD at 4.
view.pxW = 1920;
view.pxH = 1080;
const wctx = document.createElement('canvas').getContext('2d');
const uctx = document.createElement('canvas').getContext('2d');

const random = Math.random;
Math.random = mulberry32(seed);
const g = new Game({ hero, mode: 's15', diff: 'medium', meta: P.metaBonuses(P.sanitizeProfile({})), settings: {}, crypts: false });
g.player.devGod = true;
const d = new Driver(g, { bot, hz: 60, rng: mulberry32(Math.imul(seed, 0x9e3779b1) ^ 0x5bd1e995) });
let t0 = performance.now();
d.run(from);
const warm = performance.now() - t0;

// --detail: the drawing paths one by one. Accumulators are a typed array, so timing them adds no garbage.
const PATHS = [
  ['Enemy draw', Enemy.prototype, 'draw'], ['Enemy shadow', Enemy.prototype, 'drawShadow'], ['Enemy emissive', Enemy.prototype, 'drawEmissive'],
  ['Pickup draw', Pickup.prototype, 'draw'], ['Pickup glow', Pickup.prototype, 'drawGlow'],
  ['Orbit draw', FX.Orbit.prototype, 'draw'], ['Orbit glow', FX.Orbit.prototype, 'drawGlow'],
  ['ArrowRain update', FX.ArrowRain.prototype, 'update'], ['ArrowRain draw', FX.ArrowRain.prototype, 'draw'],
  ['HUD orbs', g.hud, 'drawOrbs'],
];
const acc = new Float64Array(PATHS.length), calls = new Float64Array(PATHS.length);
if (detail) {
  PATHS.forEach(([, o, k], i) => {
    const f = o[k];
    o[k] = function (a, b, c, d2, e) {
      const t = performance.now();
      const r = f.call(this, a, b, c, d2, e);
      acc[i] += performance.now() - t;
      calls[i]++;
      return r;
    };
  });
}

// The heap's size before and after a phase; a phase during which it shrank had a collection in it
// and isn't counted.
const heap = () => v8.getHeapStatistics().used_heap_size;
const gcs = [];
const obs = new PerformanceObserver((list) => gcs.push(...list.getEntries()));
obs.observe({ entryTypes: ['gc'] });

const update = g.update;
// Timed inside the step, without the bot's own thinking.
let tUpd = 0, aUpd = 0;
g.update = function (dt) {
  const h = heap(), t = performance.now();
  update.call(this, dt);
  tUpd = performance.now() - t;
  aUpd = heap() - h;
};
// --sites: V8's sampling heap profiler, counting what was collected too.
const sites = Number(args.sites === true ? 25 : args.sites || 0);
const session = sites ? new Session() : null;
if (session) session.connect();

const frames = [];
const end = g.time + secs, settle = 60; // the first second fills the sprite caches: not counted
let n = 0, mStart = 0;
globalThis.gc?.();
for (let guard = secs * 60 * 4 + 600; guard > 0 && g.time < end; guard--) {
  if (n === settle) {
    acc.fill(0);
    calls.fill(0);
    if (session) await session.post('HeapProfiler.startSampling', { samplingInterval: 4096, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
    mStart = performance.now();
  }
  if (!d.step()) break;
  const h1 = heap();
  t0 = performance.now();
  g.draw(wctx);
  const tDraw = performance.now() - t0;
  const h2 = heap();
  t0 = performance.now();
  g.hud.draw(uctx, view.W, view.H, g.clock);
  const tHud = performance.now() - t0;
  const h3 = heap();
  if (n++ >= settle) {
    const live = g.enemies.filter((e) => !e.dead && !e.prop).length;
    frames.push({ upd: tUpd, draw: tDraw, hud: tHud, aStep: aUpd, aDraw: h2 - h1, aHud: h3 - h2, live, pickups: g.pickups.length });
  }
}
const mEnd = performance.now();
const profile = session ? (await session.post('HeapProfiler.stopSampling')).profile : null;
await new Promise((r) => setTimeout(r, 50));
obs.disconnect();
Math.random = random;

const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const pct = (a, q) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0;
};
const col = (k) => frames.map((f) => f[k]);
const alloc = (k) => {
  const ok = col(k).filter((v) => v >= 0);
  return { kb: mean(ok) / 1024, n: ok.length };
};
const inWindow = gcs.filter((e) => e.startTime >= mStart && e.startTime <= mEnd);
const minor = inWindow.filter((e) => (e.detail?.kind ?? e.kind) === 1);
const f2 = (v) => v.toFixed(2).padStart(7);

console.log(`${hero} · Normal · ${bot} · seed ${seed} · ${frames.length} frames timed from ${Math.floor(from / 60)}:${String(from % 60).padStart(2, '0')} (warm-up ${(warm / 1000).toFixed(1)} s)`);
console.log(`monsters alive ${Math.round(mean(col('live')))} (max ${Math.max(...col('live'))}) · pickups ${Math.round(mean(col('pickups')))}`);
console.log('phase       mean ms   p50 ms   p95 ms   garbage KB/frame');
for (const [name, t, a] of [['update', 'upd', 'aStep'], ['world draw', 'draw', 'aDraw'], ['HUD', 'hud', 'aHud']]) {
  const al = alloc(a);
  console.log(`${name.padEnd(10)} ${f2(mean(col(t)))}  ${f2(pct(col(t), 0.5))}  ${f2(pct(col(t), 0.95))}   ${f2(al.kb)}  (${al.n} frames without a GC)`);
}
console.log(`GC in the timed window: ${minor.length} minor (${inWindow.reduce((s, e) => s + e.duration, 0).toFixed(1)} ms in all ${inWindow.length})`);
if (detail) {
  console.log('path              ms/frame   calls/frame');
  PATHS.forEach(([name], i) => {
    if (calls[i]) console.log(`${name.padEnd(17)} ${f2(acc[i] / frames.length)}   ${(calls[i] / frames.length).toFixed(1).padStart(7)}`);
  });
}
if (profile) {
  // Bytes allocated per frame by each function line, the bot's and the benchmark's own included.
  const by = new Map();
  const walk = (node) => {
    const f = node.callFrame;
    const key = `${f.url.replace(/^.*\/(public|tools)\//, '$1/')}:${f.lineNumber + 1} ${f.functionName || '(anonymous)'}`;
    by.set(key, (by.get(key) || 0) + node.selfSize);
    node.children.forEach(walk);
  };
  walk(profile.head);
  const total = [...by.values()].reduce((s, v) => s + v, 0);
  console.log(`allocation sites, KB/frame (all: ${(total / 1024 / frames.length).toFixed(1)})`);
  for (const [k, v] of [...by].sort((a, b) => b[1] - a[1]).slice(0, sites)) console.log(`${f2(v / 1024 / frames.length)}  ${k}`);
}
