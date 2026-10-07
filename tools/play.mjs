// Headless play-test driver: loads the game, runs a scripted session and
// saves screenshots.  node tools/play.mjs <script> [--w=1280 --h=720]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const script = args.find((a) => !a.startsWith('--')) || 'smoke';
const W = Number(opt('w', 1280)), H = Number(opt('h', 720));
const URL = opt('url', 'http://localhost:3000/');
const OUT = 'tools/out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: Number(opt('dpr', 1)) });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}\n${e.stack}`));
await page.goto(URL);
await page.waitForFunction(() => window.__fs && window.__fs.app.screen, null, { timeout: 15000 });

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
};
const wait = (ms) => page.waitForTimeout(ms);
const key = async (k, ms = 60) => {
  await page.keyboard.down(k);
  await wait(ms);
  await page.keyboard.up(k);
};

// Move in a slow circle by holding keys.
async function wander(seconds) {
  const seq = [['KeyD'], ['KeyD', 'KeyS'], ['KeyS'], ['KeyA', 'KeyS'], ['KeyA'], ['KeyA', 'KeyW'], ['KeyW'], ['KeyD', 'KeyW']];
  const end = Date.now() + seconds * 1000;
  let i = 0;
  while (Date.now() < end) {
    const ks = seq[i++ % seq.length];
    for (const k of ks) await page.keyboard.down(k);
    await wait(700);
    for (const k of ks) await page.keyboard.up(k);
    // Pick the first card if a level-up is showing.
    await page.evaluate(() => {
      const s = window.__fs.app.screen;
      if (s.overlay && s.overlay.choose) {
        const r = s.overlay.choose(0);
        if (r === 'close') s.overlay = null;
      }
    });
  }
}

async function startRun(hero, mode, diff) {
  await key('Enter');
  await wait(200);
  await page.evaluate(([hero, mode, diff]) => {
    const a = window.__fs.app;
    a.choice = { hero, mode, diff };
    a.startRun();
  }, [hero, mode, diff]);
  await wait(500);
}

// Fast-forward with the bot, screenshotting along the way.
async function simulate(tag, total, chunk, opts = {}) {
  for (let t = chunk; t <= total; t += chunk) {
    const r = await page.evaluate(([c, o]) => window.__fs.sim(c, o), [chunk, opts]);
    console.log(JSON.stringify(r));
    await wait(250);
    await shot(`${tag}-${String(r.time).padStart(4, '0')}`);
    if (r.state === 'over') break;
  }
}

const scripts = {
  // Walk every menu and overlay, screenshotting each.
  async ui() {
    await wait(500);
    await key('Enter');
    await wait(400);
    // Give the profile some gold through the real API so the armory has stock.
    await page.evaluate(async () => {
      await fetch('/api/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 's15', diff: 'hard', victory: true, time: 900, gold: 1500, kills: 4000, level: 50 }),
      });
      await window.__fs.app.store.init();
    });
    await key('Enter'); // NEW GAME
    await wait(400);
    await key('ArrowRight');
    await key('ArrowRight');
    await wait(400);
    await shot('ui-hero-mage');
    await key('ArrowRight');
    await wait(300);
    await shot('ui-hero-rogue-locked');
    await key('Enter');
    await wait(300);
    await shot('ui-hero-unlock-confirm');
    await key('Escape');
    await wait(400);
    await key('ArrowLeft');
    await wait(100);
    await key('Enter'); // mage
    await wait(400);
    await key('ArrowRight');
    await key('ArrowRight');
    await key('Enter'); // dungeon
    await wait(300);
    await key('ArrowRight');
    await key('Enter'); // hard
    await wait(300);
    await shot('ui-mode');
    await key('Escape');
    await wait(200);
    await key('Escape');
    await wait(300);
    await page.evaluate(() => window.__fs.app.go('armory'));
    await wait(400);
    await key('Enter'); // buy might
    await wait(600);
    await shot('ui-armory');
    await page.evaluate(() => window.__fs.app.go('records'));
    await wait(400);
    await shot('ui-records');
    await page.evaluate(() => window.__fs.app.go('options', { back: 'title' }));
    await wait(400);
    await shot('ui-options');
    // In-game overlays.
    await page.evaluate(() => {
      const a = window.__fs.app;
      a.choice = { hero: 'knight', mode: 's15', diff: 'medium' };
      a.startRun();
    });
    await wait(1200);
    await page.evaluate(() => window.__fs.sim(40));
    await page.evaluate(() => window.__fs.app.screen.game.queueLevelUp());
    await wait(900);
    await shot('ui-levelup');
    await key('Digit1');
    await wait(300);
    await page.evaluate(() => window.__fs.app.screen.game.openChest({ kind: 'boss' }));
    await wait(3200);
    await shot('ui-chest');
    await key('Escape');
    await wait(400);
    await key('Escape');
    await wait(500);
    await shot('ui-pause');
    await key('Escape');
    await wait(300);
    await page.evaluate(() => window.__fs.app.screen.game.victory('survival'));
    await wait(6500);
    await shot('ui-results-victory');
  },
  async sim() {
    const hero = opt('hero', 'knight'), mode = opt('mode', 's15'), diff = opt('diff', 'medium');
    await startRun(hero, mode, diff);
    await simulate(`sim-${hero}-${mode}`, Number(opt('secs', 120)), Number(opt('chunk', 30)), { random: opt('random', '') === '1' });
  },
  async smoke() {
    await wait(800);
    await shot('01-title-press');
    await key('Enter');
    await wait(600);
    await shot('02-title-menu');
    await key('Enter'); // NEW GAME
    await wait(500);
    await shot('03-hero');
    await key('Enter'); // knight
    await wait(500);
    await shot('04-mode');
    await page.evaluate(() => window.__fs.app.startRun());
    await wait(1500);
    await shot('05-game-start');
    await wander(6);
    await shot('06-game-6s');
  },
  async dungeon() {
    await key('Enter');
    await wait(300);
    await page.evaluate(() => {
      const a = window.__fs.app;
      a.choice = { hero: 'mage', mode: 'dungeon', diff: 'medium' };
      a.startRun();
    });
    await wait(1500);
    await shot('10-dungeon-start');
    await wander(6);
    await shot('11-dungeon-6s');
  },
};

try {
  await scripts[script]();
} catch (e) {
  errors.push('[driver] ' + e.message);
}
console.log(errors.length ? errors.slice(0, 30).join('\n') : 'no console errors');
await browser.close();
