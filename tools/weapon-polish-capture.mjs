// Real-game weapon contact sheets. Run with weapon IDs, optionally --out=directory.
// CANVAS_MODULE can point to an installed @napi-rs/canvas package.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { createCanvas } = require(process.env.CANVAS_MODULE || '@napi-rs/canvas');
globalThis.document = { createElement: () => createCanvas(1, 1) };
const { buildSprites } = await import('../public/js/engine/sprites.js');
const { Game } = await import('../public/js/game/game.js');
const { WEAPONS } = await import('../public/js/data/weapons.js');
const { defaultProfile, metaBonuses } = await import('../public/js/shared/profile.js');
const { input } = await import('../public/js/engine/input.js');
const { view } = await import('../public/js/engine/view.js');
const { mulberry32 } = await import('../public/js/engine/util.js');
buildSprites();
const args = process.argv.slice(2), out = args.find(a => a.startsWith('--out='))?.slice(6) || 'output/weapon-polish/captures';
const ids = args.filter(a => !a.startsWith('--'));
if (!ids.length) throw new Error('Supply weapon IDs to capture.');
mkdirSync(out, { recursive: true });
const W = 360, H = 230, canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
Object.assign(view, { canvas, ctx, S: 1, W, H, pxW: W, pxH: H, zoom: 1 });
const oldRandom = Math.random, oldBot = input.bot;
try {
  for (const id of ids) {
    if (!WEAPONS[id]) throw new Error(`Unknown weapon: ${id}`);
    Math.random = mulberry32(1943);
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', map: 'forest', diff: 'medium', meta: metaBonuses(defaultProfile()),
      settings: { numbers: false, shake: false, weather: false, softFlash: true }, crypts: false });
    g.spawner.update = () => {};
    g.weather = null;
    g.player.devGod = true;
    g.player.ultLocked = true;
    g.player.addXp = () => {};
    g.banners.length = 0;
    g.player.weapons.length = 0;
    g.effects.length = 0;
    const weapon = g.addWeapon(id, WEAPONS[id].evolved ? 1 : 5);
    g.player.recompute();
    const p = g.player;
    for (let i = 0; i < 16; i++) {
      const angle = i / 16 * Math.PI * 2, radius = 35 + (i % 3) * 24;
      const e = g.spawnEnemy('skeleton', p.x + Math.cos(angle) * radius, p.y + Math.sin(angle) * radius,
        { instant: true, always: true, aware: true, hpMul: 200, xpMul: 0 });
      if (e) e.spd *= 0.08;
    }
    const sheet = createCanvas(W * 3, (H + 22) * 2), sc = sheet.getContext('2d');
    sc.imageSmoothingEnabled = false;
    const marks = [24, 42, 66, 96, 126, 156];
    for (let f = 0; f <= marks.at(-1); f++) {
      input.bot = f < 50 ? { x: 1, y: 0 } : f < 100 ? { x: -1, y: 0.2 } : { x: 0, y: 0 };
      g.update(1 / 60);
      const index = marks.indexOf(f);
      if (index < 0) continue;
      g.draw(ctx);
      const x = index % 3 * W, y = Math.floor(index / 3) * (H + 22);
      sc.fillStyle = '#151923'; sc.fillRect(x, y, W, H + 22);
      sc.drawImage(canvas, x, y + 22);
      sc.fillStyle = '#e5d3ac'; sc.font = '12px sans-serif';
      sc.fillText(`${WEAPONS[id].name} / ${(f / 60).toFixed(2)}s`, x + 8, y + 15);
    }
    writeFileSync(`${out}/${id}.png`, sheet.toBuffer('image/png'));
    console.log(`${id}: ${weapon.dmgDealt.toFixed(1)} damage, contact sheet saved`);
  }
} finally {
  Math.random = oldRandom;
  input.bot = oldBot;
}
