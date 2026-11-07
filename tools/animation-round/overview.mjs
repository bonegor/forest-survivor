// Compact review of every class; complete chronological sheets are captured separately.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import sheets from '../../public/assets/heroes-approved/index.js';
import { HEROES } from '../../public/js/data/heroes.js';
import { unpack } from './build.mjs';
const require = createRequire(import.meta.url);
const { createCanvas, ImageData } = require(process.env.CANVAS_MODULE || '@napi-rs/canvas');
const ids = Object.keys(sheets), dir = 'output/animation-round/overview';
mkdirSync(dir, { recursive: true });
const labels = ['Rest', 'Breath peak', 'Stride', 'Passing', 'Wind-up', 'Release', 'Recovery', 'Moving hit'];
for (let group = 0; group < 3; group++) {
  const c = createCanvas(1168, 7 * 128 + 32), ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#18212b'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.font = '14px sans-serif'; ctx.fillStyle = '#e1d4b4';
  labels.forEach((t, i) => ctx.fillText(t, 148 + i * 128, 21));
  ids.slice(group * 7, group * 7 + 7).forEach((id, row) => {
    const data = sheets[id], y = 32 + row * 128;
    const indices = [data.idle[0], data.idle[8], data.walk[0], data.walk[2], data.attack[Math.max(0, data.attackRelease - 1)], data.attack[data.attackRelease], data.attack.at(-1), data.attackWalk?.[data.attackRelease][3] ?? data.attack[data.attackRelease]];
    ctx.fillStyle = row % 2 ? '#222d37' : '#1b2630'; ctx.fillRect(0, y, c.width, 128);
    ctx.fillStyle = '#e1d4b4'; ctx.fillText(HEROES[id].title, 10, y + 62);
    indices.forEach((index, col) => {
      const b = unpack(data, data.frames[index]), f = createCanvas(b.w, b.h);
      f.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(b.d.buffer), b.w, b.h), 0, 0);
      ctx.drawImage(f, 8, 8, 64, 52, 144 + col * 128, y + 12, 128, 104);
    });
  });
  writeFileSync(`${dir}/roster-${group + 1}.png`, c.toBuffer('image/png'));
}
