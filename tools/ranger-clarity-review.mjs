// Package already captured real-Game PNGs. No game state or source art is changed.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require(process.env.CANVAS_MODULE || '@napi-rs/canvas');
const root = resolve('output/ranger-clarity');
const take = join(root, 'final-game');
const { HEROES } = await import('../public/js/data/heroes.js');
const ids = Object.keys(HEROES);
const takeFor = id => id === 'archer' && existsSync(join(root, 'final-ranger/archer-world/samples.json')) ? join(root, 'final-ranger') : take;
const samples = Object.fromEntries(ids.map(id => [id, JSON.parse(readFileSync(join(takeFor(id), `${id}-world/samples.json`), 'utf8'))]));
const native = (w, h) => {
  const c = createCanvas(w, h), ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#17202a'; ctx.fillRect(0, 0, w, h);
  return [c, ctx];
};
const path = (id, s) => join(takeFor(id), `${id}-world`, `${String(s.frame).padStart(4, '0')}.png`);
const phases = [...new Set(samples.archer.map(s => s.phase))];
for (let page = 0; page < 4; page++) {
  const group = ids.slice(page * 6, page * 6 + 6);
  const [c, ctx] = native(160 * phases.length, 152 * group.length);
  for (let row = 0; row < group.length; row++) {
    const id = group[row];
    for (let col = 0; col < phases.length; col++) {
      const phase = phases[col], candidates = samples[id].filter(s => s.phase === phase);
      const s = candidates.find(s => s.attack) || candidates[Math.floor(candidates.length / 2)];
      const image = await loadImage(path(id, s));
      const [x, y, w, h] = s.rect;
      ctx.drawImage(image, x, y, w, h, col * 160, row * 152 + 24, 160, 128);
      ctx.fillStyle = '#e7dfc7'; ctx.font = '11px sans-serif';
      ctx.fillText(`${HEROES[id].title} / ${phase}`, col * 160 + 3, row * 152 + 15, 155);
    }
  }
  writeFileSync(join(root, `roster-world-${page + 1}.png`), c.toBuffer('image/png'));
}
// Preserve every captured frame and its actual 20fps duration. Fixed actor rect
// cropping only removes empty world space; equipment padding remains visible.
const motion = join(root, 'roster-motion'); mkdirSync(motion, { recursive: true });
for (let frame = 0; frame < samples.archer.length; frame++) {
  const [c, ctx] = native(7 * 96, 4 * 88);
  const images = await Promise.all(ids.map(id => loadImage(path(id, samples[id][frame]))));
  ids.forEach((id, n) => {
    const s = samples[id][frame], [x, y, w, h] = s.rect, tx = n % 7 * 96, ty = Math.floor(n / 7) * 88;
    ctx.drawImage(images[n], x, y, w, h, tx + 8, ty + 16, 80, 64);
    ctx.fillStyle = '#e7dfc7'; ctx.font = '9px sans-serif'; ctx.fillText(HEROES[id].title, tx + 3, ty + 10, 90);
  });
  writeFileSync(join(motion, `${String(frame).padStart(4, '0')}.png`), c.toBuffer('image/png'));
}
console.log(`Packaged ${ids.length} heroes, ${samples.archer.length} timed frames each, into ${root}.`);
