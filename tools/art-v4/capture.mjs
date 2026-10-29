// Real Game/HeroShowcase rendering into a native Canvas (no browser imitation).
// CANVAS_MODULE may point at an installed @napi-rs/canvas package.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { createCanvas } = require(process.env.CANVAS_MODULE || '@napi-rs/canvas');
globalThis.document = { createElement: () => createCanvas(1, 1) };
const { buildSprites, SPR } = await import('../../public/js/engine/sprites.js');
const { HEROES } = await import('../../public/js/data/heroes.js');
const { HeroShowcase } = await import('../../public/js/ui/hero-showcase.js');
const { defaultProfile } = await import('../../public/js/shared/profile.js');
buildSprites();
const profile = defaultProfile();
const baseline = process.argv.includes('--still');
const out = 'output/hero-v4/selected';
mkdirSync(out, { recursive: true });
const ids = Object.keys(HEROES);
const labels = ['SELECTED'];
const w = 240, h = 220;
const overview = createCanvas(w * 3, (h + 28) * Math.ceil(ids.length / 3)), oc = overview.getContext('2d');
oc.imageSmoothingEnabled = false;
const report = {};
for (const [row, id] of ids.entries()) {
  const choices = ['selected'];
  const shows = [id].map((hero, col) => {
    const settings = { diff: 'easy', numbers: false, skins: { [hero]: choices[col - 1] } };
    return { hero, settings, show: new HeroShowcase(hero, profile, settings), seen: {} };
  });
  const canvas = createCanvas(w * shows.length, h + 28), ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const count = baseline ? 1 : 720; // continuous 12 seconds, 60 Hz; exported at 20 fps.
  if (!baseline) mkdirSync(`${out}/${id}`, { recursive: true });
  for (let frame = 0; frame < count; frame++) {
    ctx.fillStyle = '#10131b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const [col, { hero, settings, show, seen }] of shows.entries()) {
      show.update(baseline ? 0 : 1 / 60);
      show.draw(ctx, { x: col * w, y: 28, w, h }, false, settings);
      ctx.fillStyle = '#e5d3ac'; ctx.font = '13px sans-serif';
      ctx.fillText(HEROES[id].title + ' / SELECTED', col * w + 12, 19);
      const spr = SPR[show.game.player.hero.sprite], key = `${show.action.kind}:${show.game.player.face}`;
      (seen[key] ??= new Set()).add(spr.frames.indexOf(show.game.player._rect[4]));
    }
    if (frame === 0) oc.drawImage(canvas, (row % 3) * w, Math.floor(row / 3) * (h + 28));
    if (!baseline && frame % 3 === 0) writeFileSync(`${out}/${id}/${String(frame / 3).padStart(3, '0')}.png`, canvas.toBuffer('image/png'));
  }
  report[id] = shows.map(({ hero, show, seen }) => ({ hero, sprite: show.game.player.hero.sprite,
    seen: Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, [...v]])) }));
}
writeFileSync(`${out}/overview.png`, overview.toBuffer('image/png'));
writeFileSync(`${out}/coverage.json`, JSON.stringify(report, null, 2));
console.log(`${out}/overview.png`);
