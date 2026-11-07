import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import sheets from './baseline/index.js';
const require = createRequire(import.meta.url);
const { createCanvas, ImageData } = require(process.env.CANVAS_MODULE || 'C:/Users/I/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
mkdirSync('tools/animation-round/inspection', { recursive: true });
for (const [id, b] of Object.entries(sheets)) {
  const rows = [b.idle, b.walk, b.attack], cols = Math.max(...rows.map(x => x.length));
  const c = createCanvas(cols * 240, rows.length * 220), ctx = c.getContext('2d');
  ctx.fillStyle = '#242a31'; ctx.fillRect(0, 0, c.width, c.height); ctx.imageSmoothingEnabled = false;
  rows.forEach((list, j) => list.forEach((idx, i) => {
    const [x,y,w,h,e] = b.frames[idx], raw = Buffer.from(e, 'base64'), d = new Uint32Array(80*64);
    for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++) d[(y+yy)*80+x+xx] = b.palette[raw.readUIntLE((yy*w+xx)*b.indexBytes,b.indexBytes)];
    const f=createCanvas(80,64); f.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d.buffer),80,64),0,0);
    ctx.drawImage(f,i*240,j*220,240,192); ctx.fillStyle='#e4dbbf';ctx.font='14px sans-serif'; ctx.fillText(`${id} ${['idle','walk','attack'][j]} ${i}`,i*240+8,j*220+210);
  }));
  writeFileSync(`tools/animation-round/inspection/${id}.png`,c.toBuffer('image/png'));
}
