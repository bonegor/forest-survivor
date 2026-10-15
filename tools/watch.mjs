// Fast-forward a run, then capture frames over a window to see what happens.
//   node tools/watch.mjs --mode=s15 --diff=medium --from=150 --to=220 --every=8
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('http://localhost:3000/');
await p.waitForFunction(() => window.__fs && window.__fs.app.screen);
await p.keyboard.press('Enter');
await p.evaluate(([hero, mode, diff]) => { const a = window.__fs.app; a.choice = { hero, mode, diff }; a.startRun(); }, [opt('hero', 'knight'), opt('mode', 's15'), opt('diff', 'medium')]);
await p.waitForTimeout(300);
const from = Number(opt('from', 150)), to = Number(opt('to', 220)), every = Number(opt('every', 8));
await p.evaluate((t) => window.__fs.sim(t), from);
for (let t = from; t <= to; t += every) {
  const r = await p.evaluate((s) => window.__fs.sim(s), every);
  await p.waitForTimeout(120);
  await p.screenshot({ path: `tools/out/watch-${String(r.time).padStart(4, '0')}.png` });
  console.log(r.time, r.state, `L${r.level} hp ${r.hp}/${r.maxHp} enemies ${r.enemies}`, JSON.stringify({ boss: r.stats.fromBoss, mobs: r.stats.fromMobs, shots: r.stats.fromShots }));
  if (r.state === 'over' || r.state === 'dying') break;
}
await b.close();
