// Lays out the hero sprites the user reviews at gamevibe.si/97sjbk94u6md/ (public/97sjbk94u6md/). For the
// ranger, the sorcerer and the necromancer: the sprite in the game now (its first idle frame), the
// standing studies of 14 October and the polish proposals of 15 October, each as a PNG facing
// right; and the knight, for scale. public/97sjbk94u6md/heroes.json lists them with their ground line
// and the colours that glow unlit at night.
//   node tools/export-hero-review.mjs
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const mod = (f) => import(pathToFileURL(join(ROOT, f)).href);
await mod('tools/headless.mjs');
const { SPR, buildSprites } = await mod('public/js/engine/sprites.js');
const { ART } = await mod('public/js/art/defs.js');
const { packedPalette } = await mod('public/js/art/palette.js');
const { HEROES } = await mod('public/js/data/heroes.js');
const { writePng } = await mod('tools/png.mjs');
const oct14 = (await mod('gms/3001/sprites/lab/src/standing-oct14.js'));
if (!SPR.knight) buildSprites();

const OUT = join(ROOT, 'public/97sjbk94u6md');
// Written afresh each time, so a version dropped from a source leaves no picture behind.
rmSync(join(OUT, 'heroes'), { recursive: true, force: true });
const pal = packedPalette();
const hex = (c) => '#' + [c & 255, (c >>> 8) & 255, (c >>> 16) & 255].map((v) => v.toString(16).padStart(2, '0')).join('');
const colours = (buf) => new Set([...buf.d].filter((c) => c >>> 24));
const firstIdle = (spr) => spr.frames[(spr.idle && spr.idle[0]) || 0].buf;

// The 14 October studies drew no glow; their fire and soul fire would glow in the game.
const P14 = oct14.PALETTE;
const STUDY_GLOW = { archer: [], mage: [P14.F, P14.G, P14.H], necromancer: [P14.U, P14.V, P14.W, P14.X] };

function write(file, buf) {
  mkdirSync(join(OUT, file, '..'), { recursive: true });
  writePng(join(OUT, file), buf);
  return file;
}
// A version as the page lists it; glow only names colours the picture has.
function entry(hero, id, kind, name, description, buf, anchorY, glow) {
  const have = colours(buf), packed = glow.map((g) => (typeof g === 'number' ? g : parseInt(g.slice(1, 3), 16) | (parseInt(g.slice(3, 5), 16) << 8) | (parseInt(g.slice(5, 7), 16) << 16) | (255 << 24)) >>> 0);
  return {
    id, kind, name, description, w: buf.w, h: buf.h, anchorY,
    file: write(`heroes/${hero}/${id}.png`, buf),
    glow: [...new Set(packed.filter((c) => have.has(c)).map(hex))],
  };
}

const heroes = [];
for (const hero of ['archer', 'mage', 'necromancer']) {
  const H = HEROES[hero], spr = SPR[hero], game = firstIdle(spr);
  const versions = [
    entry(hero, 'game', 'game', 'Current', 'The sprite the game uses now, with its walk and attacks.',
      game, spr.anchorY, [...(ART[hero].emissive || '')].map((k) => pal[k])),
  ];
  for (const p of oct14.default.filter((q) => q.cls === hero)) {
    versions.push(entry(hero, p.id.replace('standing-oct14', 'study-oct14'), 'study', p.name.split(' · ')[1], p.description, p.def.gen()[0], p.def.anchorY, STUDY_GLOW[hero]));
  }
  const file = join(ROOT, `gms/3001/sprites/lab/src/polish-oct15-${hero}.js`);
  const polish = existsSync(file) ? (await import(pathToFileURL(file).href + '?t=' + Date.now())).default : [];
  for (const p of polish) {
    const buf = p.def.gen()[0];
    if (buf.w !== 48 || buf.h !== 48) throw new Error(`${hero}/${p.id}: ${buf.w}x${buf.h}, not 48x48`);
    versions.push(entry(hero, p.id, 'new', p.name.split(' · ')[1] || p.name, p.description || '', buf, p.def.anchorY ?? 40, p.glow || []));
  }
  heroes.push({ id: hero, title: H.title, name: H.name, versions });
}

const knight = firstIdle(SPR.knight);
const manifest = {
  knight: { file: write('heroes/knight.png', knight), w: knight.w, h: knight.h, anchorY: SPR.knight.anchorY },
  heroes,
};
writeFileSync(join(OUT, 'heroes.json'), JSON.stringify(manifest, null, 1) + '\n');
for (const h of heroes) console.log(`${h.title}: ${h.versions.map((v) => `${v.id} (${v.name}${v.glow.length ? ', glows' : ''})`).join(', ')}`);
