// Freeze the game and step a single sword swing, cropping around the hero.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('http://localhost:3000/');
await p.waitForFunction(() => window.__fs && window.__fs.app.screen);
await p.keyboard.press('Enter');
await p.evaluate(() => { const a = window.__fs.app; a.choice = { hero: 'knight', mode: 's15', diff: 'medium' }; a.startRun(); });
await p.waitForTimeout(300);
await p.evaluate(() => window.__fs.sim(Number(new URLSearchParams(location.search).get('t') || 20)));
const level = Number(process.argv[2] || 1);
await p.evaluate((level) => {
  const g = window.__fs.app.screen.game;
  const w = g.player.weapons[0];
  while (w.level < level) w.levelUp();
  g.state = 'paused';
  g.effects = g.effects.filter((e) => e.persistent);
  g.player.aim = 0;
  g.player.flash = 0;
  g.player.invuln = 0;
  // A couple of skeletons to the right as targets.
  for (let i = 0; i < 4; i++) g.spawnEnemy('skeleton', g.player.x + 70 + i * 4, g.player.y - 10 + i * 8, { instant: true });
  g.grid.rebuild(g.enemies, g.player.x, g.player.y);
  w.cd = 0; g.state = 'play'; w.update(0.0001); w.update(0.0001); g.state = 'paused';
  window.__slashes = g.effects.filter((e) => e.arc);
}, level);
const n = await p.evaluate(() => window.__slashes.length);
console.log('slashes', n);
const S = await p.evaluate(() => window.__fs.view.S);
for (let i = 0; i < 6; i++) {
  await p.evaluate((i) => { for (const s of window.__slashes) s.t = (i + 0.5) * 0.037; }, i);
  await p.waitForTimeout(80);
  const pos = await p.evaluate(() => { const g = window.__fs.app.screen.game; return { x: (g.player.x - g.cam.x) * g.cam.S, y: (g.player.y - g.cam.y) * g.cam.S }; });
  await p.screenshot({ path: `tools/out/slash-${i}.png`, clip: { x: pos.x - 70 * S / 2, y: pos.y - 45 * S / 2 - 20, width: 70 * S, height: 45 * S } });
}
await b.close();
