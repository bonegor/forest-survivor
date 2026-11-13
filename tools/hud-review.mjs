// Render actual game + HUD frames, including live crypt strike and touch-map states.
// CANVAS_MODULE may point at an installed @napi-rs/canvas package.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { createCanvas } = require(process.env.CANVAS_MODULE || '@napi-rs/canvas');
globalThis.document = { createElement: () => createCanvas(1, 1) };
const { buildSprites, SPR } = await import('../public/js/engine/sprites.js');
const { Game } = await import('../public/js/game/game.js');
const { defaultProfile, metaBonuses } = await import('../public/js/shared/profile.js');
const { input } = await import('../public/js/engine/input.js');
const { view } = await import('../public/js/engine/view.js');
const { mulberry32 } = await import('../public/js/engine/util.js');
buildSprites();
const out = 'output/hud-review';
mkdirSync(out, { recursive: true });
for (const [W, H] of [[580, 216], [480, 270], [320, 240], [240, 210]]) {
  Math.random = mulberry32(1943);
  input.bot = { x: 0, y: 0 };
  input.device = 'keyboard';
  const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
  Object.assign(view, { canvas, ctx, uctx: ctx, S: 1, W, H, pxW: W, pxH: H, zoom: 1 });
  const g = new Game({ hero: 'knight', mode: 's15', map: 'forest', diff: 'medium', meta: metaBonuses(defaultProfile()),
    settings: { numbers: false, shake: false, weather: false, softFlash: true }, crypts: false });
  g.spawner.update = () => {};
  g.weather = null;
  const p = g.player;
  p.devGod = true;
  p.ultLocked = true;
  g.maxWeapons = 6;
  g.addWeapon('bow', 3);
  g.addWeapon('fireball', 2);
  p.level = 7; p.xp = p.xpNext * 0.57;
  g.banners.length = 0;
  g.effects.length = 0;
  g.time = 72;
  g.syncCam();
  g.addPickup('chest', p.x + 1000, p.y + 150);
  g.shrines.push({ x: p.x - 1000, y: p.y + 100, type: 'fury', shrine: true, spr: SPR.shrine, t: 0 });
  g.crypts.push({ key: '1,0', depth: 1, x: p.x + 180, y: p.y - 1000 });
  const shot = name => {
    ctx.imageSmoothingEnabled = false;
    g.draw(ctx);
    g.hud.draw(ctx, W, H, g.clock, 1 / 60);
    writeFileSync(`${out}/${name}-${W}x${H}.png`, canvas.toBuffer('image/png'));
  };
  shot('forest');
  g.travel = go => go();
  g.enterCrypt(g.crypts[0]);
  for (let i = 0; i < 30; i++) g.update(1 / 60);
  g.banners.length = 0;
  shot('crypt-entry');
  const w = g.mainWeapon();
  for (let i = 0; i < 10; i++) {
    w.cd = 0; w.handAt = null;
    g.cryptTime += 1;
    if (!g.strike()) throw Error('Fixture strike rejected');
  }
  if (g.inCrypt.strikes !== 10) throw Error('Strike count lost');
  shot('crypt-trained');
  input.device = 'touch';
  g.showMap = true;
  g.inCrypt.mapHintSeen = true;
  shot('crypt-touch-map');
}
console.log(`Captured 16 actual gameplay frames in ${out}`);
