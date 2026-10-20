// Bakes the Jacquard blackletters (SIL OFL 1.1) from the Creative Commons library next to this
// repository into the game's '#' glyph rows, in public/assets/ui. They come only as outline
// fonts drawn on a pixel grid, so Chrome draws each glyph at the size where one grid step is
// one pixel and the rows are read back from it:
//   node tools/bake-fonts.mjs [--from=../forest-survivor-assets/cc-graphics] [--chrome=<chrome.exe>] [--playwright=<module>]
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const FROM = resolve(opt('from', '../forest-survivor-assets/cc-graphics'));
const OUT = resolve('public/assets/ui');
const { chromium } = createRequire(import.meta.url)(opt('playwright', 'playwright-core'));

// name: [folder, file, size (font units per grid step into units per em), ascent, descent]
// Jacquard 24: 1290 units an em, a 30 unit grid: 43 px, 34 up and 9 down.
// Jacquard 12: 1260 units an em, a 60 unit grid: 21 px, 16 up and 5 down.
const FONTS = {
  jacquard24: ['jacquard-24', 'Jacquard24-Regular.ttf', 43, 34, 9],
  jacquard12: ['jacquard-12', 'Jacquard12-Regular.ttf', 21, 16, 5],
};
// Printable ASCII and the middle dot are all the game writes.
const CHARS = [...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)), '·'];

const browser = await chromium.launch(opt('chrome') ? { executablePath: opt('chrome') } : {});
const page = await browser.newPage();
for (const [name, [dir, file, size, ascent, descent]] of Object.entries(FONTS)) {
  const b64 = readFileSync(join(FROM, 'fonts', dir, file)).toString('base64');
  const glyphs = await page.evaluate(async ({ name, b64, size, ascent, descent, chars }) => {
    const face = new FontFace(name, `url(data:font/ttf;base64,${b64})`);
    await face.load();
    document.fonts.add(face);
    const PEN = 16, H = ascent + descent, c = document.createElement('canvas');
    c.width = size * 3;
    c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.font = `${size}px ${name}`;
    const out = {};
    for (const ch of chars) {
      x.clearRect(0, 0, c.width, c.height);
      x.fillText(ch, PEN, ascent);
      const d = x.getImageData(0, 0, c.width, H).data;
      // Half covered or more is ink.
      const ink = (px, py) => d[(py * c.width + px) * 4 + 3] >= 128;
      let x0 = Infinity, x1 = -1;
      for (let py = 0; py < H; py++) for (let px = 0; px < c.width; px++) if (ink(px, py)) { x0 = Math.min(x0, px); x1 = Math.max(x1, px); }
      if (x1 < 0) x0 = x1 = PEN;
      const rows = [];
      for (let py = 0; py < H; py++) {
        let r = '';
        for (let px = x0; px <= x1; px++) r += ink(px, py) ? '#' : '.';
        rows.push(r);
      }
      out[ch] = { adv: Math.round(x.measureText(ch).width), x0: x0 - PEN, rows: rows.join('/') };
    }
    return out;
  }, { name, b64, size, ascent, descent, chars: CHARS });
  // The space has no ink: keep its advance only.
  glyphs[' '].rows = glyphs[' '].rows.replace(/#/g, '.');
  // The em's top rows are room for accents the game never writes: the box starts at the
  // highest ink and ends at the lowest.
  let top = Infinity, bottom = -1;
  for (const g of Object.values(glyphs)) g.rows.split('/').forEach((r, y) => r.includes('#') && ((top = Math.min(top, y)), (bottom = Math.max(bottom, y))));
  for (const g of Object.values(glyphs)) g.rows = g.rows.split('/').slice(top, bottom + 1).join('/');
  const h = bottom + 1 - top, base = ascent - top;
  writeFileSync(join(OUT, `${name}.js`), `// ${dir} by Sarah Cadigan-Fried (SIL OFL 1.1, see OFL-Jacquard.txt): rows of ${h}, baseline under row ${base}.\n// Baked by tools/bake-fonts.mjs from forest-survivor-assets/cc-graphics; licences and credits in CREDITS.md here.\nexport default ${JSON.stringify({ h, ascent: base, glyphs })};\n`);
  console.log(name, Object.keys(glyphs).length, 'glyphs');
}
await browser.close();
copyFileSync(join(FROM, 'fonts/jacquard-24/OFL.txt'), join(OUT, 'OFL-Jacquard.txt'));
