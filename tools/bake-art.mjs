// Bakes in-game sprites (shrines, effects, landmarks, bosses, crypt dressing) from the Creative
// Commons library that sits next to this repository (forest-survivor-assets/cc-graphics, see its
// README) into public/assets/art:
//   node tools/bake-art.mjs [group ...] [--from=../forest-survivor-assets/cc-graphics]
// Each group is a list in tools/art/<group>.mjs (all of them when none is named):
//   export default {
//     credits: [{ pack, what, source, author, link, licence }],  // every pack its sprites use
//     sprites: { name: spec },
//   }
// and comes out as public/assets/art/<group>.js, its frames packed as palette indices like the
// heroes' (js/art/baked.js reads them back). A spec's frames are, from the pack's folder:
//   files: ['a.png', 'b.png']               one frame a file, or
//   file: 'sheet.png', frame: [w, h]        a grid, read along rows from cell `from` (0), `count`
//                                           cells (all); or rects: [[x, y, w, h], ...]
//   sheets: [{ file, frame, from, count, crop, flip }, ...]   several such sheets one after
//                                           another, each cropped (and mirrored) to one frame size
// then, in turn, each frame:
//   crop: [x, y, w, h]                      a part of it
//   flip: true                              mirrored left to right (art drawn facing left)
//   scale: 0.5                              shrunk by nearest neighbour (halves, quarters)
//   map: { '#rrggbb': '#rrggbb' | null }    colours swapped (null clears), alpha kept
//   fill: { seed: ['#rrggbb'], map: {...} } as map, but only in the patches of those colours
//                                           (side by side) that hold a seed colour: one part
//                                           recoloured where its colours are used elsewhere too
//   trim: true                              all frames cut to the box that holds every one's art
//   pad: n                                  n clear pixels round each side
// and meta: { ... } goes through as it is (anchorY, idle, fps ...). A pack's licence must be one
// a public repository can ship (CC0, CC-BY, OGA-BY), or the bake refuses it.
import { writeFileSync, mkdirSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readPng } from './png.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const FROM = resolve(opt('from', '../forest-survivor-assets/cc-graphics'));
const OUT = resolve('public/assets/art');
const SPECS = join(dirname(fileURLToPath(import.meta.url)), 'art');
mkdirSync(OUT, { recursive: true });

const SHIPPABLE = /^(CC0|CC-BY [34]\.0|OGA-BY 3\.0)$/;
// Files a pack ships under no licence it can give (dcss-crawl-tiles-cc0/TILES_UNDER_UNKNOWN_LICENSE.md):
// every name that list gives, and these, which it lists under older names (dithmengos.png,
// dngn_altar_fedhas.png) than the files carry.
const UNKNOWN = [/dithmeng?os/i, /altars?[_/]fedhas/i];
const unlisted = new Map();
const isUnlisted = (pack, f) => {
  if (!unlisted.has(pack)) {
    const list = join(FROM, 'packs', pack, 'TILES_UNDER_UNKNOWN_LICENSE.md');
    unlisted.set(pack, new Set(existsSync(list) ? [...readFileSync(list, 'utf8').matchAll(/^\s*-\s*(?:\S*\/)?([^/\s]+\.png)\s*$/gm)].map((m) => m[1].toLowerCase()) : []));
  }
  return unlisted.get(pack).has(f.split('/').pop().toLowerCase());
};
// The licence a pack's own record gives it (packs/<pack>/SOURCE.md, "- **Licence:** CC0 1.0 ..."):
// a credit must claim that one, so no pack is credited under a licence it doesn't carry.
const packLicence = (pack) => {
  const src = join(FROM, 'packs', pack, 'SOURCE.md');
  return (existsSync(src) && /^- \*\*Licence:\*\* (.+)$/m.exec(readFileSync(src, 'utf8'))?.[1]) || '';
};
// A spec's files, its sheets' too.
const filesOf = (s) => s.files || (s.sheets ? s.sheets.flatMap(filesOf) : [s.file]);

const all = readdirSync(SPECS).filter((f) => f.endsWith('.mjs')).map((f) => f.slice(0, -4)).sort();
const named = args.filter((a) => !a.startsWith('--'));
const groups = named.length ? named : all;

const hex = (c) => '#' + [c & 255, (c >>> 8) & 255, (c >>> 16) & 255].map((v) => v.toString(16).padStart(2, '0')).join('');
const unhex = (h) => {
  const n = parseInt(h.slice(1, 7), 16);
  return ((n >> 16) & 255) | (n & 0xff00) | ((n & 255) << 16);
};

function cut(b, x, y, w, h) {
  const o = { w, h, d: new Uint32Array(w * h) };
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const sx = x + i, sy = y + j;
      if (sx >= 0 && sy >= 0 && sx < b.w && sy < b.h) o.d[j * w + i] = b.d[sy * b.w + sx];
    }
  }
  return o;
}

function mirror(b) {
  const o = { w: b.w, h: b.h, d: new Uint32Array(b.d.length) };
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) o.d[y * b.w + x] = b.d[y * b.w + b.w - 1 - x];
  return o;
}

// Recolours, in each frame, the patches of fill.map's colours (4-connected) that hold a seed one.
function fillPatches(b, fill) {
  const map = new Map(Object.entries(fill.map).map(([f, t]) => [unhex(f), t === null ? null : unhex(t)]));
  const seeds = new Set(fill.seed.map(unhex));
  const rgb = (i) => (b.d[i] >>> 24 ? b.d[i] & 0xffffff : -1);
  const seen = new Uint8Array(b.d.length);
  for (let s = 0; s < b.d.length; s++) {
    if (seen[s] || !map.has(rgb(s))) continue;
    const patch = [s];
    seen[s] = 1;
    let seeded = false;
    for (let k = 0; k < patch.length; k++) {
      const i = patch[k], x = i % b.w;
      if (seeds.has(rgb(i))) seeded = true;
      for (const j of [x > 0 ? i - 1 : -1, x < b.w - 1 ? i + 1 : -1, i - b.w, i + b.w]) {
        if (j < 0 || j >= b.d.length || seen[j] || !map.has(rgb(j))) continue;
        seen[j] = 1;
        patch.push(j);
      }
    }
    if (!seeded) continue;
    for (const i of patch) {
      const to = map.get(rgb(i));
      b.d[i] = to === null ? 0 : ((b.d[i] & 0xff000000) | to) >>> 0;
    }
  }
}

function framesOf(spec) {
  const at = (f) => join(FROM, 'packs', f);
  if (spec.sheets) {
    return spec.sheets.flatMap((s) => {
      let f = framesOf(s);
      if (s.crop) f = f.map((b) => cut(b, ...s.crop));
      return s.flip ? f.map(mirror) : f;
    });
  }
  if (spec.files) return spec.files.map((f) => readPng(at(f)));
  const sheet = readPng(at(spec.file));
  if (spec.rects) return spec.rects.map(([x, y, w, h]) => cut(sheet, x, y, w, h));
  if (!spec.frame) return [sheet];
  const [fw, fh] = spec.frame, cols = Math.floor(sheet.w / fw), rows = Math.floor(sheet.h / fh);
  const from = spec.from || 0, count = spec.count ?? cols * rows - from;
  const out = [];
  for (let k = from; k < from + count; k++) out.push(cut(sheet, (k % cols) * fw, Math.floor(k / cols) * fh, fw, fh));
  return out;
}

function bake(spec) {
  let frames = framesOf(spec);
  if (spec.crop) frames = frames.map((b) => cut(b, ...spec.crop));
  if (spec.flip) frames = frames.map(mirror);
  if (spec.scale) {
    const k = Math.round(1 / spec.scale);
    frames = frames.map((b) => {
      const o = { w: Math.floor(b.w / k), h: Math.floor(b.h / k) };
      o.d = new Uint32Array(o.w * o.h);
      for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) o.d[y * o.w + x] = b.d[y * k * b.w + x * k];
      return o;
    });
  }
  if (spec.map) {
    const map = new Map(Object.entries(spec.map).map(([f, t]) => [unhex(f), t === null ? null : unhex(t)]));
    for (const b of frames) {
      for (let i = 0; i < b.d.length; i++) {
        const c = b.d[i];
        if (!(c >>> 24) || !map.has(c & 0xffffff)) continue;
        const to = map.get(c & 0xffffff);
        b.d[i] = to === null ? 0 : ((c & 0xff000000) | to) >>> 0;
      }
    }
  }
  if (spec.fill) for (const b of frames) fillPatches(b, spec.fill);
  if (spec.trim) {
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (const b of frames) {
      for (let y = 0; y < b.h; y++) {
        for (let x = 0; x < b.w; x++) {
          if (!(b.d[y * b.w + x] >>> 24)) continue;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
      }
    }
    if (x1 >= 0) frames = frames.map((b) => cut(b, x0, y0, x1 - x0 + 1, y1 - y0 + 1));
  }
  if (spec.pad) frames = frames.map((b) => cut(b, -spec.pad, -spec.pad, b.w + 2 * spec.pad, b.h + 2 * spec.pad));
  const { w, h } = frames[0];
  if (frames.some((b) => b.w !== w || b.h !== h)) throw new Error('frames of different sizes');
  // Fully clear pixels all become index 0.
  const palette = [0], index = new Map([[0, 0]]);
  for (const b of frames) {
    for (const c of b.d) {
      const k = c >>> 24 ? c : 0;
      if (!index.has(k)) {
        index.set(k, palette.length);
        palette.push(k);
      }
    }
  }
  const n = palette.length > 256 ? 2 : 1;
  const data = frames.map((b) => {
    const bytes = Buffer.alloc(b.d.length * n);
    b.d.forEach((c, i) => {
      const v = index.get(c >>> 24 ? c : 0);
      if (n === 2) bytes.writeUInt16LE(v, 2 * i);
      else bytes[i] = v;
    });
    return bytes.toString('base64');
  });
  return { w, h, ...(n === 2 ? { indexBytes: 2 } : {}), palette, frames: data, ...(spec.meta || {}) };
}

const credits = [];
for (const group of all) {
  const { default: def } = await import(pathToFileURL(join(SPECS, `${group}.mjs`)).href);
  const packs = new Map(def.credits.map((c) => [c.pack, c]));
  for (const c of def.credits) {
    if (!SHIPPABLE.test(c.licence)) throw new Error(`${group}: ${c.pack} is ${c.licence}, which a public repository can't ship`);
    const own = packLicence(c.pack);
    if (!`${own} `.startsWith(`${c.licence} `)) throw new Error(`${group}: ${c.pack} is credited ${c.licence}, but its SOURCE.md says "${own || 'nothing'}"`);
  }
  credits.push(...def.credits.map((c) => ({ ...c, group })));
  if (!groups.includes(group)) continue;
  const out = {}, lines = [];
  for (const [name, spec] of Object.entries(def.sprites)) {
    const files = filesOf(spec);
    for (const f of files) {
      const parts = f.split(/[\\/]/), pack = parts[0];
      // A path that climbs out (pack/../other) would read a pack it isn't credited to.
      if (parts.includes('..')) throw new Error(`${group}/${name}: ${f} leaves its pack's folder`);
      if (!packs.has(pack)) throw new Error(`${group}/${name}: ${pack} has no credit line`);
      if (UNKNOWN.some((re) => re.test(f)) || isUnlisted(pack, f)) throw new Error(`${group}/${name}: ${f} is under no known licence`);
    }
    out[name] = bake(spec);
    lines.push(`//   ${name}: ${out[name].frames.length} frame(s) of ${out[name].w}x${out[name].h}, ${out[name].palette.length} colours, from ${files.length > 1 ? `${files[0]} …` : files[0]}`);
  }
  const head = [
    `// Baked by tools/bake-art.mjs from tools/art/${group}.mjs; art credited in CREDITS.md here.`,
    ...lines,
  ];
  writeFileSync(join(OUT, `${group}.js`), `${head.join('\n')}\nexport default ${JSON.stringify(out)};\n`);
  console.log(`${group}: ${Object.keys(out).length} sprites`);
}

// The credits for every group, in one page.
const rows = credits.map((c) => `| ${c.what} (\`${c.group}.js\`) | ${c.source} | [${c.title || c.pack}](${c.link}) by ${c.author} | ${c.licence} |`);
writeFileSync(join(OUT, 'CREDITS.md'), `# In-game art credits

Sprites cut from the Creative Commons library kept beside the game
(\`forest-survivor-assets/cc-graphics\`) and baked here by \`tools/bake-art.mjs\`, each group from its
list in \`tools/art/\`. The game recolours some of them to its palette and night. CC0 asks for no
credit; it is given as thanks. Changes for Forest Survivor: frames cut, trimmed and in places
recoloured or shrunk.

| What | Files | Pack | Licence |
| --- | --- | --- | --- |
${rows.join('\n')}
`);
