// Balance harness: the bot plays several runs per mode/difficulty and we
// print outcomes, a per-minute timeline and boss kill times.
//   node tools/balance.mjs --hero=knight --configs=s15:easy,s15:medium --runs=2 --parallel=3
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const hero = opt('hero', 'knight');
const configs = opt('configs', 's15:medium').split(',');
const runs = Number(opt('runs', 1));
const parallel = Number(opt('parallel', 3));
const cap = Number(opt('cap', 0));

const browser = await chromium.launch();
const jobs = [];
for (const c of configs) for (let i = 0; i < runs; i++) jobs.push(c);

async function play(cfg) {
  const [mode, diff] = cfg.split(':');
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:3000/');
  await page.waitForFunction(() => window.__fs && window.__fs.app.screen);
  await page.keyboard.press('Enter');
  await page.evaluate(([hero, mode, diff]) => {
    const a = window.__fs.app;
    a.choice = { hero, mode, diff };
    a.startRun();
  }, [hero, mode, diff]);
  await page.waitForTimeout(300);
  const limit = cap || (mode === 's15' ? 900 : mode === 'ranked' ? 7200 : 2400);
  const timeline = [];
  let r;
  for (let t = 0; t < limit + 30; t += 60) {
    r = await page.evaluate(() => window.__fs.sim(60));
    timeline.push(`${Math.round(r.time / 60)}m:L${r.level}/${Math.round((r.hp / r.maxHp) * 100)}%/${r.enemies}e${r.floor > 1 ? '/F' + r.floor : ''}${mode === 'ranked' ? '/ph' + Math.round(r.phase) : ''}`);
    if (r.state === 'over' || r.time >= limit) break;
  }
  await ctx.close();
  const s = r.stats;
  const won = r.victory;
  return {
    cfg,
    out: won ? 'WIN ' : r.state === 'over' ? 'DEAD' : 'ALIVE',
    time: `${Math.floor(r.time / 60)}:${String(r.time % 60).padStart(2, '0')}`,
    level: r.level,
    kills: r.kills,
    gold: r.gold,
    minHp: Math.round(s.minHp * 100) + '%',
    dmg: `boss ${s.fromBoss} / mobs ${s.fromMobs} / shots ${s.fromShots}`,
    bosses: s.bossLog.map((b) => `${b.id}@${Math.floor(b.t / 60)}m L${b.lvl} hp${b.hp} ${b.kill !== undefined ? 'killed in ' + b.kill + 's' : 'ALIVE'}`).join('; '),
    build: `${r.weapons} | ${r.passives}`,
    timeline: timeline.join(' '),
    errors,
  };
}

const results = [];
let next = 0;
await Promise.all(
  Array.from({ length: parallel }, async () => {
    while (next < jobs.length) {
      const cfg = jobs[next++];
      const res = await play(cfg);
      results.push(res);
      console.log(`\n[${res.cfg}] ${res.out} at ${res.time}  L${res.level}  kills ${res.kills}  gold ${res.gold}  minHP ${res.minHp}`);
      console.log(`  damage taken: ${res.dmg}`);
      console.log(`  bosses: ${res.bosses || '-'}`);
      console.log(`  build: ${res.build}`);
      console.log(`  ${res.timeline}`);
      if (res.errors.length) console.log('  ERRORS', res.errors.slice(0, 3));
    }
  }),
);
await browser.close();
