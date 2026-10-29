// Reproducible native sprite authoring: the tiny drawing DSL used by the existing
// source art, evaluated locally at build time. No runtime eval or external tools.
import vm from 'node:vm';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { hexPack } from '../../public/js/engine/pixels.js';

export function renderSource(file, name) {
  let palette = {}, metadata = {}, glowKeys = null; const animations = {};
  vm.runInNewContext(readFileSync(file, 'utf8'), {
    pal: p => Object.assign(palette, p), ramps: () => {},
    meta: m => Object.assign(metadata, m), glow: s => { glowKeys = s; },
    anim: (id, box, draw) => { animations[id] = { box, draw }; },
  }, { filename: file, timeout: 10000 });
  const a = animations[name];
  if (!a) throw new Error(`No ${name}; available: ${Object.keys(animations)}`);
  const { w, h } = a.box, frames = [];
  for (let frame = 0; frame < a.box.frames; frame++) {
    const d = new Uint32Array(w * h);
    a.draw({ frame, px(x, y, key) {
      if (key === '.' || key == null) return;
      if (!(key in palette)) throw new Error(`Unknown palette key ${key}`);
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && y >= 0 && x < w && y < h) d[y * w + x] = hexPack(palette[key]);
    } });
    frames.push({ w, h, d });
  }
  return { frames, metadata, glow: glowKeys && [...glowKeys].map(k => hexPack(palette[k])) };
}

export async function bake(id, file, animation) {
  const rendered = renderSource(file, animation);
  const base = id === 'knight' ? {} : (await import(pathToFileURL(resolve(`tools/art-v4/archive/heroes/${id}.js`)))).default;
  const palette = [0], indexes = new Map([[0, 0]]);
  const raw = rendered.frames.map(b => [...b.d].map(c => {
    if (!indexes.has(c)) { indexes.set(c, palette.length);palette.push(c); }
    return indexes.get(c);
  }));
  const indexBytes = palette.length > 256 ? 2 : 1;
  const frames = raw.map(p => Buffer.from(indexBytes === 2 ? p.flatMap(i => [i & 255, i >> 8]) : p).toString('base64'));
  const data = { ...base, ...rendered.metadata, pick: `v3:${id}`, name: `${id} V3`, w: rendered.frames[0].w, h: rendered.frames[0].h,
    ...(rendered.glow ? { glow: rendered.glow } : {}), palette, indexBytes, frames };
  if (data.glow) data.glow = data.glow.filter(c => indexes.has(c));
  const target = resolve(`tools/art-v4/archive/heroes-v3/${id}.js`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `// V3 structural redraw. Source: ${file.replaceAll('\\', '/')}\n// Rebuild: node tools/art-v3/bake.mjs ${id} ${file.replaceAll('\\', '/')} ${animation}\nexport default ${JSON.stringify(data)};\n`);
  console.log(`${id}: ${frames.length} frames, ${palette.length - 1} colours → ${target}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await bake(...process.argv.slice(2));
