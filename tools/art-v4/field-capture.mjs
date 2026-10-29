// Deterministic full-world review: production Game, Player, camera, lighting and HUD.
// No saved profile, browser, replacement game renderer or production mutations.
// CANVAS_MODULE points to an installed @napi-rs/canvas package. Optional hero IDs
// narrow a repeated capture after an art correction; FIELD_MAP defaults to forest.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { createCanvas } = require(process.env.CANVAS_MODULE || '@napi-rs/canvas');
globalThis.document = { createElement: () => createCanvas(1, 1) };
const { buildSprites, SPR } = await import('../../public/js/engine/sprites.js');
const { Game } = await import('../../public/js/game/game.js');
const { HEROES } = await import('../../public/js/data/heroes.js');
const { defaultProfile, metaBonuses } = await import('../../public/js/shared/profile.js');
const { input } = await import('../../public/js/engine/input.js');
const { view } = await import('../../public/js/engine/view.js');
const { mulberry32 } = await import('../../public/js/engine/util.js');
buildSprites();

const root = 'output/hero-v4/field';
mkdirSync(root, { recursive: true });
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(HEROES).filter(id => id !== 'knight');
const W = 480, H = 300, FPS = 15, HZ = 60, SECONDS = 6.4;
const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
const ui = createCanvas(W, H), uctx = ui.getContext('2d');
Object.assign(view, { canvas, ctx, ui, uctx, S: 1, W, H, pxW: W, pxH: H, zoom: 1 });
ctx.imageSmoothingEnabled = uctx.imageSmoothingEnabled = false;
const reportFile = `${root}/coverage.json`;
const report = existsSync(reportFile) ? JSON.parse(readFileSync(reportFile, 'utf8')) : {};
const profile = defaultProfile(), beforeProfile = JSON.stringify(profile);
const montage = createCanvas(W * 4, (H + 24) * Math.ceil(ids.length * 2 / 4)), mc = montage.getContext('2d');
mc.imageSmoothingEnabled = false;
let card = 0;
function action(t) {
  if (t < 1.4) return { kind: 'rest', x: 0, y: 0 };
  if (t < 2.6) return { kind: 'right', x: 1, y: 0 };
  if (t < 3.8) return { kind: 'left', x: -1, y: 0 };
  if (t < 5) return { kind: 'diagonal', x: Math.SQRT1_2, y: -Math.SQRT1_2 };
  return { kind: 'combat', x: 0, y: 0 };
}
const oldRandom = Math.random, oldBot = input.bot;
try {
  for (const id of ids) for (const option of ['a', 'b']) {
    Math.random = mulberry32(29471);
    const settings = { diff: 'easy', numbers: true, softFlash: true, skins: { [id]: `v4${option}` } };
    const g = new Game({ hero: id, mode: 's15', map: process.env.FIELD_MAP || 'forest', diff: 'easy', meta: metaBonuses(profile), settings, crypts: false });
    // Staged targets give every weapon combat to display within this short take.
    // They use the real Enemy and weapon systems; only the random waves are quiet.
    g.spawner.update = () => {};
    g.player.devGod = true;
    g.banners.length = 0;
    g.syncCam();
    g.cam.x = g.player.x - g.cam.W / 2;
    g.cam.y = g.player.y - 8 - g.cam.H / 2;
    const dir = `${root}/${id}-${option}`;
    mkdirSync(dir, { recursive: true });
    const seen = {}, start = { x: g.player.x, y: g.player.y };
    let lastSpawn = -1, maxEffects = 0, maxProjectiles = 0, samples = 0, clipped = 0;
    const stills = createCanvas(W * 3, H * 2), sc = stills.getContext('2d');
    sc.imageSmoothingEnabled = false;
    const marks = [0.7, 2, 3.2, 4.4, 5.5, 6.2].map(t => Math.round(t * HZ / (HZ / FPS)) * (HZ / FPS));
    for (let f = 0; f < Math.round(SECONDS * HZ); f++) {
      const a = action(f / HZ);
      input.bot = { x: a.x, y: a.y };
      if (a.kind === 'combat' && Math.floor((f / HZ - 5) * 2) !== lastSpawn) {
        lastSpawn = Math.floor((f / HZ - 5) * 2);
        const p = g.player, side = lastSpawn % 2 ? -1 : 1;
        g.spawnEnemy('skeleton', p.x + side * 32, p.y + 5, { instant: true, always: true, hpMul: 30, xpMul: 0 });
        g.spawnEnemy('skeleton', p.x + side * 46, p.y - 14, { instant: true, always: true, hpMul: 30, xpMul: 0 });
      }
      g.update(1 / HZ);
      maxEffects = Math.max(maxEffects, g.effects.length);
      maxProjectiles = Math.max(maxProjectiles, g.projectiles.length);
      if (f % (HZ / FPS)) continue;
      g.draw(ctx);
      uctx.clearRect(0, 0, W, H);
      g.hud.draw(uctx, W, H, g.clock, 1 / FPS);
      ctx.drawImage(ui, 0, 0);
      const p = g.player, spr = SPR[p.hero.sprite], rect = p._rect;
      if (!rect || !spr.frames.includes(rect[4])) throw Error(`${id}-${option}: missing own sprite at frame ${f}`);
      const key = `${a.kind}:${p.face}`;
      (seen[key] ??= new Set()).add(spr.frames.indexOf(rect[4]));
      if (rect[0] < 0 || rect[1] < 0 || rect[0] + rect[2] > W || rect[1] + rect[3] > H) clipped++;
      writeFileSync(`${dir}/${String(samples++).padStart(3, '0')}.png`, canvas.toBuffer('image/png'));
      const slot = marks.indexOf(f);
      if (slot >= 0) sc.drawImage(canvas, slot % 3 * W, Math.floor(slot / 3) * H);
      if (f === marks[4]) {
        const x = card % 4 * W, y = Math.floor(card / 4) * (H + 24);
        mc.fillStyle = '#151923'; mc.fillRect(x, y, W, H + 24);
        mc.fillStyle = '#e5d3ac'; mc.font = '14px sans-serif';
        mc.fillText(`${HEROES[id].title} / option ${option.toUpperCase()} / real combat`, x + 10, y + 17);
        mc.drawImage(canvas, x, y + 24);
      }
    }
    writeFileSync(`${root}/${id}-${option}-sequence.png`, stills.toBuffer('image/png'));
    report[`${id}-${option}`] = {
      sprite: g.player.hero.sprite, map: g.map.id, size: [W, H], fps: FPS, seconds: SECONDS, samples, clipped,
      seen: Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, [...v].sort((a, b) => a - b)])),
      displacement: [g.player.x - start.x, g.player.y - start.y], damage: g.stats.damage,
      maxEffects, maxProjectiles, state: g.state, heroAlive: !g.player.dead,
      scope: 'Full production world, lighting, camera, HUD, movement and staged real-weapon combat; no saved progress.'
    };
    writeFileSync(`${dir}/coverage.json`, JSON.stringify(report[`${id}-${option}`], null, 2));
    // Partial runs can be captured independently: retain completed entries already on disk.
    const previous = existsSync(reportFile) ? JSON.parse(readFileSync(reportFile, 'utf8')) : {};
    Object.assign(report, previous, { [`${id}-${option}`]: report[`${id}-${option}`] });
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`${id}-${option}: ${samples} frames, ${clipped} clipped, damage ${Math.round(g.stats.damage)}, states ${Object.keys(seen).join(', ')}`);
    card++;
  }
} finally {
  Math.random = oldRandom; input.bot = oldBot;
}
if (JSON.stringify(profile) !== beforeProfile) throw Error('Capture changed the in-memory profile');
writeFileSync(`${root}/montage${ids.length < 8 ? '-' + ids.join('-') : ''}.png`, montage.toBuffer('image/png'));
console.log(`Field capture complete: ${root}`);
