import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = 'output/hero-round2-2026-11-14/preview';
const revised = (process.env.REVIEW_HERO_IDS || 'archer,berserker,eanasir').split(',');
const scales = (process.env.REVIEW_SCALES || '1,2.4,3.2').split(',').map(Number);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'chrome' }) });
const page = await browser.newPage({ viewport: { width: 1480, height: 1200 } }), errors = [];
page.on('pageerror', e => errors.push(e.stack || e.message));
const result = { scales: {}, errors };
try {
  for (const scale of scales) {
    await page.goto(`http://127.0.0.1:3018/?scale=${scale}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !!window.heroReview);
    await page.evaluate(() => heroReview.advance(0));
    const roster = await page.locator('#hero option').evaluateAll(list => list.map(n => n.value));
    const records = result.scales[scale] = { roster, heroes: {} };
    for (const id of roster) {
      await page.selectOption('#hero', id);
      await page.evaluate(() => heroReview.advance(.25));
      records.heroes[id] = await page.evaluate(() => ({ state: heroReview.state,
        rects: heroReview.games.map(g => g.player._rect.slice(0, 4)),
        frames: [...document.querySelectorAll('.world')].map(c => ({ frame: c.dataset.frame, pose: c.dataset.pose })) }));
    }
    for (const id of revised) {
      await page.selectOption('#hero', id);
      const scenes = records.heroes[id].scenes = {};
      for (const [setting, action] of [['forest','idle'], ['forest','right'], ['forest','left'],
        ['forest','diagonal'], ['forest','attack'], ['forest','attack-walk'], ['crypt','attack'], ['crypt','attack-walk']]) {
        await page.selectOption('#setting', setting);
        await page.click(`[data-action="${action}"]`);
        scenes[setting+'/'+action] = await page.evaluate(() => {
          const seen = [new Set(), new Set()];
          for (let n=0; n<120; n++) {
            heroReview.advance(1/60);
            [...document.querySelectorAll('.world')].forEach((c,i) => seen[i].add(c.dataset.frame));
          }
          return seen.map(s => [...s]);
        });
      }
      await page.selectOption('#setting', 'forest');
      await page.click('[data-action="idle"]');
      await page.evaluate(() => heroReview.advance(.5));
      await page.screenshot({ path: `${out}/${id}-S${scale}.png`, fullPage: true });
    }
  }
  await page.selectOption('#hero','archer');
  await page.click('[data-action="play"]');
  const prior = await page.evaluate(() => heroReview.games.map(g => g.player.x));
  await page.keyboard.down('KeyD'); await page.evaluate(() => heroReview.advance(.6)); await page.keyboard.up('KeyD');
  const current = await page.evaluate(() => heroReview.games.map(g => g.player.x));
  if (current.some((x,i) => x <= prior[i]+10)) throw Error('Paired keyboard movement failed');
  await page.selectOption('#setting','crypt'); await page.click('[data-action="play"]');
  await page.keyboard.down('KeyX'); await page.evaluate(() => heroReview.advance(.6)); await page.keyboard.up('KeyX');
  const strikes = await page.evaluate(() => heroReview.games.map(g => g.player.strikeAt));
  if (strikes.some(t => t == null)) throw Error('Paired manual crypt attack failed');
  result.keyboard = { prior, current, strikes };
  await page.goto('http://127.0.0.1:3018/bosses.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__bossReview);
  await page.click('#pause');
  result.bosses = {};
  for (const id of await page.locator('#boss option').evaluateAll(list => list.map(n => n.value))) {
    await page.selectOption('#boss', id);
    result.bosses[id] = await page.evaluate(() => {
      const scene = window.__bossReview, ctx = document.querySelector('#world').getContext('2d');
      const states = new Set(), frames = new Set(), facings = new Set(), segments = new Set();
      for (let n = 0; n < 1800; n++) {
        scene.tick(1/60);
        states.add(scene.e.state); frames.add(scene.e.frameIndex()); facings.add(scene.e.face); segments.add(scene.label);
        if (n % 6 === 0) scene.draw(ctx);
      }
      scene.draw(ctx);
      return { states: [...states], frames: [...frames], facings: [...facings], segments: [...segments], final: scene.record() };
    });
    if (result.bosses[id].facings.length !== 2 || result.bosses[id].segments.length !== 5)
      throw Error(`${id}: incomplete boss tour`);
    await page.screenshot({ path: `${out}/${id}-browser.png`, fullPage: true });
  }
} finally {
  writeFileSync(`${out}/browser-review.json`, JSON.stringify(result, null, 2));
  await browser.close();
}
if (errors.length) throw Error(errors.join('\n'));
console.log(`All 22 heroes load at ${scales.length} display scales; ${revised.length} revised heroes cover eight scenes plus paired keyboard play. Six bosses complete both-facing tours.`);
