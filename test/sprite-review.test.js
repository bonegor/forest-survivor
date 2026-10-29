import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';

// The hero sprite review published at gamevibe.si/97sjbk94u6md/ (tools/art-v4/archive/review-oct15/).
const root = fileURLToPath(new URL('../',import.meta.url));
const mod = file => import(pathToFileURL(root + '/' + file).href);
const {readPng} = await mod('tools/png.mjs');
const R = await mod('tools/art-v4/archive/review-oct15/recolour.js');
const manifest = JSON.parse(readFileSync(root + 'tools/art-v4/archive/review-oct15/heroes.json', 'utf8'));

// The Sprite Lab's colour bar, its pure part, without the game's sprite classes it also imports.
const labSource = readFileSync(root + 'gms/3001/lib/recolour.js', 'utf8')
  .replace(/^import .*$/m, 'const Frame = null, bufToCanvas = null;');
const Lab = await import('data:text/javascript;base64,' + Buffer.from(labSource).toString('base64'));

test('the page tunes colours exactly as the Sprite Lab does', () => {
  const pic = readPng(root + 'tools/art-v4/archive/review-oct15/heroes/mage/game.png');
  const looks = [
    R.neutral(),
    {...R.neutral(), hue: 40, sat: 30},
    {...R.neutral(), bright: -20, contrast: 35, mid: 15},
    {...R.neutral(), warm: 60, tint: -40, outline: 70},
    {...R.neutral(), outline: -80, sat: -100},
  ];
  for (const v of looks) {
    assert.deepEqual(R.recolourPixels(pic.d, pic.w, pic.h, v), Lab.recolourPixels(pic.d, pic.w, pic.h, v), JSON.stringify(v));
  }
  assert.deepEqual(R.recolourPixels(pic.d, pic.w, pic.h, R.neutral()), pic.d, 'all at 0: the sprite as drawn');
  assert.deepEqual(R.SLIDERS, Lab.SLIDERS);
});

test("a saved look's code names the hero, the version and the sliders moved, and reads back", () => {
  const v = {...R.neutral(), hue: -12, outline: 40};
  const code = R.pickCode('mage', 'polish-b', v);
  assert.equal(code, 'FS mage polish-b hue=-12 outline=40');
  assert.deepEqual(R.parsePickCode(code), {hero: 'mage', version: 'polish-b', values: v});
  assert.equal(R.pickCode('archer', 'game', R.neutral()), 'FS archer game');
  assert.equal(R.parsePickCode('hello'), null);
});

test('the ranger, the sorcerer and the necromancer each have the archived baseline and at least three historical versions', () => {
  assert.deepEqual(manifest.heroes.map(h => h.id), ['archer', 'mage', 'necromancer']);
  for (const h of manifest.heroes) {
    const kinds = h.versions.map(v => v.kind);
    assert.equal(kinds[0], 'game', `${h.id}: the sprite in the game comes first`);
    assert.ok(kinds.filter(k => k === 'new').length >= 3, `${h.id}: ${kinds.filter(k => k === 'new').length} new versions`);
    assert.equal(new Set(h.versions.map(v => v.id)).size, h.versions.length, `${h.id}: ids are unique`);
    for (const v of h.versions) {
      const file = root + 'tools/art-v4/archive/review-oct15/' + v.file;
      assert.ok(existsSync(file), v.file);
      const pic = readPng(file);
      assert.deepEqual([pic.w, pic.h], [48, 48], v.file);
      let feet = -1;
      for (let i = 0; i < pic.d.length; i++) if (pic.d[i] >>> 24) feet = Math.max(feet, (i / 48) | 0);
      assert.equal(feet, v.anchorY - 1, `${v.file}: stands on its ground line`);
      const colours = new Set([...pic.d].map(c => '#' + [c & 255, (c >>> 8) & 255, (c >>> 16) & 255].map(n => n.toString(16).padStart(2, '0')).join('')));
      for (const g of v.glow) assert.ok(colours.has(g), `${v.file}: glows in ${g}, a colour it has`);
    }
  }
  assert.ok(existsSync(root + 'tools/art-v4/archive/review-oct15/' + manifest.knight.file), 'the knight, for scale');
});
