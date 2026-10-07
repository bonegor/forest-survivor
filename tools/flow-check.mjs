// Checks: save & quit -> continue (cookie checkpoint), audio context state,
// and layouts on phone-sized screens.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
const page = async (opts) => {
  const ctx = await b.newContext(opts);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await p.goto('http://localhost:3000/');
  await p.waitForFunction(() => window.__fs && window.__fs.app.screen);
  return { p, ctx };
};
// 1. Save & continue.
{
  const { p, ctx } = await page({ viewport: { width: 1280, height: 720 } });
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  const audio = await p.evaluate(() => (window.__fs.app.audioUnlocked ? 'unlocked' : 'locked'));
  await p.evaluate(() => { const a = window.__fs.app; a.choice = { hero: 'archer', mode: 'dungeon', diff: 'hard' }; a.startRun(); });
  await p.waitForTimeout(500);
  await p.evaluate(() => window.__fs.sim(45));
  const before = await p.evaluate(() => { const g = window.__fs.app.screen.game; return { lvl: g.player.level, kills: g.kills, w: g.player.weapons.map((w) => w.id + w.level).join(',') }; });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  await p.evaluate(() => { const ov = window.__fs.app.screen.overlay; ov.gs.app.store.saveCheckpoint(ov.g.checkpoint()).then(() => ov.gs.app.go('title')); });
  await p.waitForTimeout(500);
  const cookies = (await ctx.cookies()).map((c) => `${c.name}(${c.value.length}b,httpOnly=${c.httpOnly})`);
  await p.reload();
  await p.waitForFunction(() => window.__fs && window.__fs.app.screen);
  await p.waitForTimeout(300);
  const cp = await p.evaluate(() => window.__fs.app.store.checkpoint);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'tools/out/flow-continue-title.png' });
  await p.keyboard.press('Enter'); // CONTINUE RUN is first
  await p.waitForTimeout(800);
  const after = await p.evaluate(() => { const g = window.__fs.app.screen.game; return g && { lvl: g.player.level, kills: g.kills, w: g.player.weapons.map((w) => w.id + w.level).join(','), floor: g.floor, mode: g.mode }; });
  await p.screenshot({ path: 'tools/out/flow-continued.png' });
  console.log('audio', audio);
  console.log('cookies', cookies.join(' '));
  console.log('checkpoint after reload', cp && { hero: cp.hero, mode: cp.mode, floor: cp.floor, level: cp.level });
  console.log('before', JSON.stringify(before), '\nafter ', JSON.stringify(after));
  await ctx.close();
}
// 2. Phone layouts.
for (const [name, w, h] of [['portrait', 390, 844], ['landscape', 844, 390]]) {
  const { p, ctx } = await page({ viewport: { width: w, height: h }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await p.touchscreen.tap(w / 2, h / 2);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `tools/out/phone-${name}-title.png` });
  await p.evaluate(() => { const a = window.__fs.app; a.choice = { hero: 'knight', mode: 's15', diff: 'easy' }; a.startRun(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => window.__fs.sim(20));
  await p.waitForTimeout(300);
  await p.screenshot({ path: `tools/out/phone-${name}-game.png` });
  await p.evaluate(() => window.__fs.app.screen.game.queueLevelUp());
  await p.waitForTimeout(700);
  await p.screenshot({ path: `tools/out/phone-${name}-levelup.png` });
  await ctx.close();
}
console.log(errors.length ? errors.join('\n') : 'no errors');
await b.close();
