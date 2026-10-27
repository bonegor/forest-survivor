import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import '../tools/headless.mjs';
import { ART, withTunes } from '../public/js/art/defs.js';
import { OUTLINE } from '../public/js/art/palette.js';
import { spriteBuffers, buildSprite, PALETTE_CSS } from '../public/js/engine/sprites.js';
import { hexPack } from '../public/js/engine/pixels.js';
import { readPng } from '../tools/png.mjs';
import * as T from '../public/js/art/tune.js';

// The sprite tuner (an unlisted page, public/ufld3ryaj0u2/) and its bake (tools/bake-tune.mjs).
const root = fileURLToPath(new URL('../', import.meta.url));
const SLUG = 'ufld3ryaj0u2';
const tune = (t) => ({ ...T.neutral(), ...t });
const rgb = (c) => c & 0xffffff;

test("a tune's code names the sprite and what moved, and reads back", () => {
  const t = tune({ bright: 10, lift: 40, ink: '#3a2e4a', rim: T.RIM });
  const code = T.tuneCode('spider', t);
  assert.equal(code, 'FS tune spider bright=10 lift=40 ink=3a2e4a rim');
  assert.deepEqual(T.parseTuneCode(code), { name: 'spider', tune: t });
  assert.equal(T.tuneCode('bat', tune({ hue: -30, rim: '#c0cbdc' })), 'FS tune bat hue=-30 rim=c0cbdc');
  assert.equal(T.tuneCode('bat', tune({ rim: false })), 'FS tune bat rim=off');
  assert.equal(T.tuneCode('bat', T.neutral()), 'FS tune bat');
  assert.deepEqual(T.parseTuneCode('FS tune bat rim=off gamma=-20').tune, tune({ gamma: -20, rim: false }));
  assert.equal(T.parseTuneCode('FS tune bat lift=500').tune.lift, 100, 'a slider is held to its range');
  for (const bad of ['FS mage polish-b hue=4', 'FS tune Spider', 'FS tune bat lift=x', 'FS tune bat ink=zzz', 'FS tune bat glow=3', 'FS tune bat lift=1=2']) {
    assert.equal(T.parseTuneCode(bad), null, bad);
  }
  const pasted = T.parseTunes('Here you go: FS tune bat lift=20 FS tune spider rim\nthanks\nFS tune bat bogus=1');
  assert.deepEqual(pasted.tunes.map((x) => T.tuneCode(x.name, x.tune)), ['FS tune bat lift=20', 'FS tune spider rim']);
  assert.deepEqual(pasted.bad, ['FS tune bat bogus=1']);
  const blob = JSON.stringify({ fsTune: 1, codes: ['FS tune ogre sat=12'], own: { ogre: { sat: 12 } } });
  assert.deepEqual(T.parseTunes(blob).tunes, [{ name: 'ogre', tune: tune({ sat: 12 }) }], "the page's copy-all blob");
});

test('a tune moves the colours, never the pixels: the ink outlines the sprite, the rim rings it', () => {
  const def = ART.spider, stock = spriteBuffers(def);
  assert.deepEqual(T.tunedPalette(def, T.neutral()), {}, 'nothing moved, nothing to bake');
  assert.deepEqual(spriteBuffers(T.tunedDef(def, T.neutral())).frames.map((b) => [...b.d]), stock.frames.map((b) => [...b.d]));

  const t = tune({ lift: 60, contrast: 10, ink: '#3a2e4a', rim: T.RIM });
  const tuned = spriteBuffers(T.tunedDef(def, t));
  const INK = hexPack('#3a2e4a'), RIM = hexPack(T.RIM);
  stock.frames.forEach((s, f) => {
    const b = tuned.frames[f];
    // The spider's outline reaches the frame's edge, so the rim grows it by a pixel a side.
    assert.deepEqual([b.w, b.h], [s.w + 2, s.h + 2]);
    assert.equal(b.ink, INK);
    assert.equal(b.rim, RIM);
    const at = (x, y) => (x < 0 || y < 0 || x >= s.w || y >= s.h ? 0 : s.d[y * s.w + x]);
    for (let y = -1; y <= s.h; y++) {
      for (let x = -1; x <= s.w; x++) {
        const was = at(x, y), now = b.d[(y + 1) * b.w + x + 1];
        if (was >>> 24) assert.equal(now, was === OUTLINE ? INK : hexPack(T.shade(T.hexOfPacked(was), t)), `frame ${f} (${x},${y})`);
        else {
          const ringed = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy) >>> 24);
          assert.equal(now, ringed ? RIM : 0, `frame ${f} (${x},${y}): ${ringed ? 'rim' : 'clear'}`);
        }
      }
    }
  });
  const eye = hexPack(T.shade(T.hexOfPacked(hexPack('#ff0044')), t));
  assert.ok(tuned.emissive.has(eye), 'its eyes glow in their tuned colour');
  // (+10: the spider redrawn in mid tones on 27 October 2026 has less dark left to lift, about +14.)
  assert.ok(T.meanLuma(tuned.frames, new Set([INK, RIM])) > T.meanLuma(stock.frames, new Set([OUTLINE])) + 10, 'lifted: lighter');
});

test("a hero's sheet is tuned by its own colours: no ink to swap, the rim kept in the frame when it fits", () => {
  // Every hero outlines in dark shades of their own colours (the plumed Knight's style, 27 October
  // 2026): there is no one ink to swap. The monsters' ink is swapped in the test above.
  for (const id of ['archer', 'mage', 'necromancer', 'rogue', 'paladin', 'paladin_d', 'druid', 'berserker', 'witchhunter']) {
    assert.equal(T.colourSlots(ART[id]).find((s) => s.ink), undefined, `${id}: no ink`);
  }
  const necro = ART.necromancer, slots = T.colourSlots(necro);
  const t = tune({ lift: 30, ink: '#ff00ff', rim: T.RIM }), def = T.tunedDef(necro, t, slots);
  const stock = spriteBuffers(necro), tuned = spriteBuffers(def);
  assert.ok(!tuned.frames.some((b) => b.d.includes(hexPack('#ff00ff'))), 'no ink drawn');
  assert.ok(tuned.frames[0].d.some((c) => c === hexPack(T.RIM)), 'the rim drawn');
  assert.equal(tuned.anchorY, necro.anchorY + (tuned.frames[0].w > stock.frames[0].w ? 1 : 0), 'the feet move with a grown frame');
  for (const c of necro.glow) assert.ok(tuned.emissive.has(hexPack(def.palette[T.hexOfPacked(c)] || T.hexOfPacked(c))), 'what glows still glows');

  // The Knight outlines in many colours: no ink to swap. His frames have room for the rim.
  const knight = ART.knight;
  assert.equal(T.colourSlots(knight).find((s) => s.ink), undefined);
  const kn = spriteBuffers(T.tunedDef(knight, tune({ ink: '#ff00ff', rim: T.RIM })));
  assert.deepEqual([kn.frames[0].w, kn.frames[0].h, kn.anchorY], [knight.gen()[0].w, knight.gen()[0].h, knight.anchorY]);
  assert.ok(kn.frames[0].d.some((c) => c === hexPack(T.RIM)) && !kn.frames.some((b) => b.d.includes(hexPack('#ff00ff'))));
});

test("the game builds a tuned sprite in its colours, and its death burst leaves out the ink and the rim", () => {
  const t = tune({ lift: 50, ink: '#3a2e4a', rim: T.RIM }), def = T.tunedDef(ART.bat, t);
  const spr = buildSprite('bat', def), fr = spr.frames[0], pix = fr.pixels;
  assert.ok(pix.length > 0);
  const colours = new Set();
  for (let i = 2; i < pix.length; i += 3) colours.add(PALETTE_CSS[pix[i]]);
  assert.ok(!colours.has('#3a2e4a') && !colours.has(T.RIM), 'no ink or rim in the burst');
  for (const [key, hex] of Object.entries(def.palette)) if (key !== 'k' && fr.buf.d.includes(hexPack(hex))) assert.ok(colours.has(hex), `the burst keeps ${hex}`);
});

test('the bake writes a tune into tuned.js, a second on top of it, and the preview draws what was baked', () => {
  const real = readFileSync(join(root, 'public/js/art/tuned.js'), 'utf8');
  const dir = mkdtempSync(join(tmpdir(), 'fs-tune-'));
  try {
    const out = join(dir, 'tuned.js'), codes = join(dir, 'codes.txt');
    const bake = (...a) => spawnSync(process.execPath, ['tools/bake-tune.mjs', codes, `--out=${out}`, ...a], { cwd: root, encoding: 'utf8' });
    writeFileSync(codes, 'From the tuner:\nFS tune spider lift=60 ink=3a2e4a rim\nFS tune necromancer lift=20\n');
    let r = bake();
    assert.equal(r.status, 0, r.stderr);
    const first = { ...readTuned(out) };
    assert.deepEqual(first.spider.codes, ['FS tune spider lift=60 ink=3a2e4a rim']);
    assert.equal(first.spider.palette.k, '#3a2e4a');
    assert.equal(first.spider.rim, T.RIM);
    assert.deepEqual(first.necromancer_pose.palette, first.necromancer.palette, "his menu pose takes his colours");
    // What was baked draws exactly as the tuner previewed it.
    const baked = withTunes({ spider: ART.spider }, first).spider;
    const previewed = T.tunedDef(ART.spider, tune({ lift: 60, ink: '#3a2e4a', rim: T.RIM }));
    assert.deepEqual(spriteBuffers(baked).frames.map((b) => [...b.d]), spriteBuffers(previewed).frames.map((b) => [...b.d]));

    // tools/preview.mjs draws the bake: tuned ink and rim, not the game's ink.
    const png = join(dir, 'spider.png');
    r = spawnSync(process.execPath, ['tools/preview.mjs', 'spider', `--tuned=${out}`, `--out=${png}`, '--scale=1'], { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const seen = new Set(readPng(png).d.map(rgb));
    assert.ok(seen.has(rgb(hexPack('#3a2e4a'))) && seen.has(rgb(hexPack(T.RIM))) && !seen.has(rgb(OUTLINE)));

    // A second bake works on the sprite as the first left it, and keeps both codes.
    writeFileSync(codes, 'FS tune spider bright=20\n');
    assert.equal(bake().status, 0);
    const second = readTuned(out);
    assert.deepEqual(second.spider.codes, ['FS tune spider lift=60 ink=3a2e4a rim', 'FS tune spider bright=20']);
    assert.equal(second.spider.palette.p, T.shade(first.spider.palette.p, tune({ bright: 20 })));
    assert.equal(second.spider.palette.k, '#3a2e4a');

    writeFileSync(codes, 'FS tune nosuch lift=4\n');
    assert.equal(bake().status, 1, 'an unknown sprite is refused');
    writeFileSync(codes, 'FS tune bat lift=x\n');
    assert.equal(bake().status, 1, 'so is a code it cannot read');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  assert.equal(readFileSync(join(root, 'public/js/art/tuned.js'), 'utf8'), real, "the game's own tuned.js untouched");
});

// A baked tuned.js read as the game reads it.
function readTuned(file) {
  const src = readFileSync(file, 'utf8');
  return new Function(`${src.replace('export const TUNED =', 'return')}`)();
}

test("the tuner page is on the owner's link list, named nowhere in the README, and finds what it imports", async () => {
  const links = readFileSync(join(root, 'public/nb5hzpva1bhd/index.html'), 'utf8');
  assert.ok(links.includes(`href="../${SLUG}/"`), 'the link list links it');
  assert.ok(!readFileSync(join(root, 'README.md'), 'utf8').includes(SLUG), 'unlisted: not in the README');
  const html = readFileSync(join(root, `public/${SLUG}/index.html`), 'utf8');
  assert.match(html, /<script type="module" src="tuner\.js"><\/script>/);
  assert.match(html, /name="robots" content="noindex"/);
  // Every name the page imports from the game is exported there.
  const src = readFileSync(join(root, `public/${SLUG}/tuner.js`), 'utf8');
  for (const [, names, from] of src.matchAll(/^import \{([^}]+)\} from '([^']+)';$/gm)) {
    const mod = await import(pathToFileURL(join(root, `public/${SLUG}`, from)).href);
    for (const n of names.split(',').map((s) => s.trim())) assert.ok(n in mod, `${from} exports ${n}`);
  }
});
