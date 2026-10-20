// Bakes the menus' frames, buttons and title font from the Creative Commons library that sits next
// to this repository (forest-survivor-assets/cc-graphics, see its README) into public/assets/ui:
//   node tools/bake-ui.mjs [--from=../forest-survivor-assets/cc-graphics]
// Pieces are kept in their own colours, packed as palette indices; js/ui/skin.js recolours them.
// The font is Pixtura12 (SIL OFL 1.1), converted from its BDF into the game's '#' glyph rows.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readPng } from './png.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const FROM = resolve(opt('from', '../forest-survivor-assets/cc-graphics'));
const OUT = resolve('public/assets/ui');
mkdirSync(OUT, { recursive: true });

const LUCIFER = 'packs/foozle-lucifer-rpg-ui';
const KENNEY = 'packs/kenney-fantasy-ui-borders/PNG/Default';

// name: [file, halve (Kenney draws on a 2 px grid; halved, its lines are one pixel like ours)]
const PIECES = {
  button: [`${LUCIFER}/Generic/Menu buttons/Png/GenericButton.png`],
  panel: [`${LUCIFER}/Generic/Menu/Png/GenericPanel.png`],
  arrow: [`${LUCIFER}/Generic/Menu/Png/GenericArrow.png`],
  divider: [`${KENNEY}/Divider Fade/divider-fade-003.png`, true],
};

function halve(b) {
  const o = { w: b.w >> 1, h: b.h >> 1, d: new Uint32Array((b.w >> 1) * (b.h >> 1)) };
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) o.d[y * o.w + x] = b.d[y * 2 * b.w + x * 2];
  return o;
}

const hex = (c) => '#' + [c & 255, (c >>> 8) & 255, (c >>> 16) & 255, c >>> 24].map((v) => v.toString(16).padStart(2, '0')).join('');

const pieces = {};
for (const [name, [file, half]] of Object.entries(PIECES)) {
  let b = readPng(join(FROM, file));
  if (half) b = halve(b);
  // Fully clear pixels all become index 0.
  const palette = ['#00000000'], index = new Map([[0, 0]]);
  const bytes = Buffer.alloc(b.w * b.h);
  b.d.forEach((c, i) => {
    const k = c >>> 24 ? c : 0;
    if (!index.has(k)) {
      index.set(k, palette.length);
      palette.push(hex(k));
    }
    bytes[i] = index.get(k);
  });
  pieces[name] = { w: b.w, h: b.h, palette, data: bytes.toString('base64'), from: file };
}

// Pixtura12: ascent 9, descent 3. Each glyph becomes rows of 12 ('#' inked) as wide as its ink,
// with x0 its offset from the pen (capitals reach one pixel back) and adv the pen's step.
const ASCENT = 9, H = 12;
const bdf = readFileSync(join(FROM, 'fonts/pixtura12/Pixtura12-12px.bdf'), 'utf8').split(/\r?\n/);
const glyphs = {};
let g = null;
for (let i = 0; i < bdf.length; i++) {
  const p = bdf[i].split(' ');
  if (p[0] === 'ENCODING') g = { code: +p[1] };
  else if (p[0] === 'DWIDTH') g.adv = +p[1];
  else if (p[0] === 'BBX') [g.w, g.h, g.x, g.y] = p.slice(1).map(Number);
  else if (p[0] === 'BITMAP') {
    const rows = Array.from({ length: H }, () => '.'.repeat(g.w).split(''));
    for (let r = 0; r < g.h; r++) {
      const bits = parseInt(bdf[i + 1 + r], 16), nb = bdf[i + 1 + r].length * 4;
      const yy = ASCENT - (g.y + g.h) + r;
      if (yy < 0 || yy >= H) continue;
      for (let x = 0; x < g.w; x++) if ((bits >> (nb - 1 - x)) & 1) rows[yy][x] = '#';
    }
    // Printable ASCII and the middle dot are all the game writes.
    if ((g.code >= 32 && g.code < 127) || g.code === 0xb7) glyphs[String.fromCharCode(g.code)] = { adv: g.adv, x0: g.x, rows: rows.map((r) => r.join('')).join('/') };
  }
}

const head = (what) => `// ${what}\n// Baked by tools/bake-ui.mjs from forest-survivor-assets/cc-graphics; licences and credits in CREDITS.md here.\n`;
writeFileSync(join(OUT, 'pieces.js'), head('Menu frames, buttons and pointer: Lucifer RPG UI by Foozle (CC0), Fantasy UI Borders by Kenney (CC0).') + `export default ${JSON.stringify(pieces)};\n`);
writeFileSync(join(OUT, 'pixtura12.js'), head('Pixtura12 by eishiya (SIL OFL 1.1, see OFL-Pixtura12.txt): rows of 12, baseline under row 9.') + `export default ${JSON.stringify({ h: H, ascent: ASCENT, glyphs })};\n`);
copyFileSync(join(FROM, 'fonts/pixtura12/LICENSE-FONTPIXEL.txt'), join(OUT, 'OFL-Pixtura12.txt'));
copyFileSync(join(FROM, `${LUCIFER}/License.txt`), join(OUT, 'LICENSE-Lucifer-RPG-UI.txt'));
copyFileSync(join(FROM, 'packs/kenney-fantasy-ui-borders/License.txt'), join(OUT, 'LICENSE-Kenney-Fantasy-UI-Borders.txt'));
console.log(Object.entries(pieces).map(([n, p]) => `${n} ${p.w}x${p.h} ${p.palette.length} colours`).join('\n'), `\n${Object.keys(glyphs).length} glyphs`);
