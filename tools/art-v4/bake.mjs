// Native review alternatives. Baselines are immutable: V3 for the two warriors,
// the selected original for everyone else. Run with optional hero IDs.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { renderSource } from '../art-v3/bake.mjs';

export const IDS = ['archer', 'mage', 'rogue', 'necromancer', 'paladin', 'druid', 'berserker', 'witchhunter'];
export async function bake(id, option) {
  const file = `tools/art-v4/src/${id}-${option}.px.js`;
  const source = readFileSync(file, 'utf8');
  const animation = [...source.matchAll(/anim\(\s*['"]([^'"]+)['"]/g)].at(-1)?.[1];
  if (!animation) throw new Error(`No animation in ${file}`);
  const rendered = renderSource(file, animation);
  const dir = ['paladin', 'berserker'].includes(id) ? 'heroes-v3' : 'heroes';
  const base = (await import(pathToFileURL(resolve(`public/assets/${dir}/${id}.js`)))).default;
  const palette = [0], indexes = new Map([[0, 0]]);
  const raw = rendered.frames.map(b => [...b.d].map(c => {
    if (!indexes.has(c)) { indexes.set(c, palette.length); palette.push(c); }
    return indexes.get(c);
  }));
  const indexBytes = palette.length > 256 ? 2 : 1;
  const frames = raw.map(p => Buffer.from(indexBytes === 2 ? p.flatMap(i => [i & 255, i >> 8]) : p).toString('base64'));
  const data = { ...base, ...rendered.metadata, pick: `review:${id}-${option}`, name: `${id} option ${option.toUpperCase()}`,
    w: rendered.frames[0].w, h: rendered.frames[0].h, palette, indexBytes, frames,
    ...(rendered.glow ? { glow: rendered.glow } : {}) };
  if (data.glow) data.glow = data.glow.filter(c => indexes.has(c));
  for (const key of ['idle', 'walk', 'attack']) for (const frame of data[key] || []) {
    if (!frames[frame]) throw new Error(`${id}-${option}: missing ${key} frame ${frame}`);
  }
  mkdirSync('public/assets/heroes-v4', { recursive: true });
  writeFileSync(`public/assets/heroes-v4/${id}-${option}.js`, `// Source: ${file}\n// Rebuild: node tools/art-v4/bake.mjs ${id}\nexport default ${JSON.stringify(data)};\n`);
  console.log(`${id}-${option}: ${frames.length} poses, ${palette.length - 1} colours`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  for (const id of process.argv.slice(2).length ? process.argv.slice(2) : IDS) for (const option of ['a', 'b']) {
    if (existsSync(`tools/art-v4/src/${id}-${option}.px.js`)) await bake(id, option);
  }
}
