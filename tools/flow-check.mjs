// Checks: Quit Run ends a run and nothing of it is kept to pick up again (no run cookie, no
// Continue on the title screen), audio context state, and layouts on phone-sized screens.
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
// Clicks a button the UI drew last frame, by its id, where it stands on the page.
const clickUI = async (p, id) => {
  const at = await p.evaluate((id) => {
    const { app, view } = window.__fs, it = app.ui.items.find((i) => i.id === id);
    if (!it) return null;
    const r = view.canvas.getBoundingClientRect(), k = view.S / view.pxW * r.width, l = view.S / view.pxH * r.height;
    return { x: r.left + (it.x + it.w / 2) * k, y: r.top + (it.y + it.h / 2) * l };
  }, id);
  if (!at) throw new Error(`no "${id}" on screen`);
  await p.mouse.click(at.x, at.y);
};
// The cookies a run was once kept in to pick up again (the game server's, the static game's, the debug address's).
const RUN_COOKIES = ['fs_run', 'fs_lrun', 'fs_drun'];
// 1. Quit Run, then reload: no run cookie, and no Continue.
{
  const { p, ctx } = await page({ viewport: { width: 1280, height: 720 } });
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  const audio = await p.evaluate(() => (window.__fs.app.audioUnlocked ? 'unlocked' : 'locked'));
  await p.evaluate(() => { const a = window.__fs.app; a.choice = { hero: 'knight', mode: 's15', diff: 'medium' }; a.startRun(); });
  await p.waitForTimeout(500);
  await p.evaluate(() => window.__fs.sim(45));
  await p.waitForTimeout(300);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(600); // the pause screen, past its lock
  await clickUI(p, 'quit'); // QUIT RUN
  await p.waitForTimeout(200);
  await clickUI(p, 'quit'); // SURE?
  await p.waitForTimeout(2000); // the results, and the run reported
  const results = await p.evaluate(() => { const s = window.__fs.app.screen; return { state: s.game?.state, reward: s.overlay?.reward || null }; });
  await p.screenshot({ path: 'tools/out/flow-quit-results.png' });
  const during = (await ctx.cookies()).map((c) => `${c.name}(${c.value.length}b,httpOnly=${c.httpOnly})`);
  await p.reload();
  await p.waitForFunction(() => window.__fs && window.__fs.app.screen);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'tools/out/flow-title-after-quit.png' });
  const title = await p.evaluate(() => window.__fs.app.ui.items.map((i) => i.id));
  const after = (await ctx.cookies()).map((c) => c.name);
  console.log('audio', audio);
  console.log('results', JSON.stringify(results));
  console.log('cookies after the run', during.join(' '));
  console.log('title buttons after reload', title.join(' '));
  if (results.state !== 'over' || !results.reward) errors.push('Quit Run did not end the run with its results');
  if (results.reward?.unsaved) errors.push(`the quit run was not saved: ${results.reward.error || 'no reason given'}`);
  for (const name of RUN_COOKIES) if (after.includes(name)) errors.push(`a run cookie (${name}) is there after the run`);
  if (title.includes('continue')) errors.push('the title screen offers Continue');
  await ctx.close();
}
// 2. Phone layouts.
for (const [name, w, h] of [['portrait', 390, 844], ['landscape', 844, 390]]) {
  const { p, ctx } = await page({ viewport: { width: w, height: h }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await p.touchscreen.tap(w / 2, h / 2);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `tools/out/phone-${name}-title.png` });
  await p.evaluate(() => { const a = window.__fs.app; a.choice = { hero: 'knight', mode: 's15', diff: 'medium' }; a.startRun(); });
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
