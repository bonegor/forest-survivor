// Real shipping HeroScreen and ChestOverlay; isolated in-memory review only.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { createCanvas } = require(process.env.CANVAS_MODULE || 'C:/Users/I/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
globalThis.document = { createElement: () => createCanvas(1, 1) };
const { buildSprites } = await import('../public/js/engine/sprites.js');
const { Game } = await import('../public/js/game/game.js');
const { defaultProfile, metaBonuses } = await import('../public/js/shared/profile.js');
const { HeroScreen } = await import('../public/js/ui/hero-selection.js');
const { ChestOverlay } = await import('../public/js/ui/gamescreen.js');
const { MenuScene } = await import('../public/js/ui/background.js');
const { UI } = await import('../public/js/ui/ui.js');
const { input } = await import('../public/js/engine/input.js');
const { view } = await import('../public/js/engine/view.js');
const { mulberry32 } = await import('../public/js/engine/util.js');
buildSprites();
const root = 'output/good-copper-review';
mkdirSync(root + '/evolution', { recursive: true });
function surface(w, h) {
  const canvas = createCanvas(w, h), ctx = canvas.getContext('2d');
  const ui = createCanvas(w, h), uctx = ui.getContext('2d');
  ctx.imageSmoothingEnabled = uctx.imageSmoothingEnabled = false;
  Object.assign(view, { canvas, ctx, ui, uctx, S: 1, W: w, H: h, pxW: w, pxH: h, zoom: 1 });
  return { canvas, ctx, ui, uctx, w, h };
}
function save(surface, name) { writeFileSync(`${root}/${name}.png`, surface.canvas.toBuffer('image/png')); }
Math.random = mulberry32(20261115);
input.mouse.x = input.mouse.y = -1;
const report = { selection: [], evolution: null };
for (const [w, h] of [[640, 420], [480, 270], [293, 633]]) {
  const s = surface(w, h), profile = defaultProfile();
  profile.heroes.push('eanasir');
  const before = JSON.stringify(profile);
  const app = { ui: new UI(), store: { profile }, settings: { diff: 'easy' }, choice: { hero: 'eanasir' }, scene: new MenuScene(), go() {} };
  const screen = new HeroScreen(); screen.enter(app);
  for (let i = 0; i < 45; i++) screen.draw(s.ctx, w, h, 1 / 60);
  save(s, `selection-${w}`);
  screen.infoScroll = 60; screen.draw(s.ctx, w, h, 1 / 60); save(s, `selection-description-${w}`);
  assert.equal(JSON.stringify(profile), before, 'HeroScreen must not mutate profile');
  report.selection.push({ size: [w, h], contentHeight: screen.infoContentHeight, stage: screen.layout.stage, info: screen.layout.info });
}

for (const [w, h] of [[640, 420], [480, 270]]) {
  const s = surface(w, h), profile = defaultProfile();
  const g = new Game({ hero: 'eanasir', mode: 's15', map: 'forest', diff: 'easy', meta: metaBonuses(profile), settings: { numbers: false, softFlash: true, weather: false }, crypts: false });
  g.spawner.update = () => {}; g.weather = null; g.banners.length = 0;
  g.enemies = []; g.pickups = []; g.effects = [];
  const p = g.player;
  assert.deepEqual(p.weapons.map(w => w.id), ['goodcopper']);
  p.weapons[0].level = 8;
  p.passives.set('cooldown', 1);
  p.recompute();
  g.syncCam(); g.snapCam();
  const gs = { game: g, app: { ui: new UI(), settings: g.settings, store: { profile } } };
  // Actual evolve() draws its random branch. 0.75 selects index 4 (Merchant's
  // Arc), deliberately proving a non-representative branch through the chest.
  const random = Math.random; Math.random = () => 0.75;
  const overlay = new ChestOverlay(gs, 'elite');
  Math.random = random;
  assert.equal(overlay.evoFrom, 'goodcopper');
  assert.equal(overlay.evo.id, 'copper_arc');
  assert.equal(overlay.evo.from, 'goodcopper');
  assert.equal(overlay.signature, true);
  assert.equal(p.weapons[0].baseId, 'goodcopper');
  g.state = 'chest';
  const frames = Math.ceil((overlay.tl.end + 1) * 60);
  const snapshots = { crack: overlay.evoAt + .3, ceremony: overlay.evoAt + 1.2, result: overlay.tl.end + .6 };
  const done = new Set(); let samples = 0;
  for (let i = 0; i < frames; i++) {
    g.draw(s.ctx);
    s.uctx.clearRect(0, 0, w, h); g.hud.draw(s.uctx, w, h, g.clock, 1 / 60); s.ctx.drawImage(s.ui, 0, 0);
    overlay.draw(s.ctx, w, h, 1 / 60);
    for (const [label, at] of Object.entries(snapshots)) if (!done.has(label) && overlay.t >= at) { save(s, `chest-${label}-${w}`); done.add(label); }
    if (w === 640 && i % 3 === 0) save(s, `evolution/${String(samples++).padStart(4, '0')}`);
  }
  report.evolution = { from: overlay.evoFrom, into: overlay.evo.id, receiptFrom: overlay.evo.from, baseId: p.weapons[0].baseId, signature: overlay.signature, changes: overlay.evoLines, name: p.weapons[0].def.name, snapshots: [...done], seconds: frames / 60, fps: 20 };
}
writeFileSync(`${root}/coverage.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
