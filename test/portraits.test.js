// The trial cards' scenes, the portrait frame and the Shadow's light line (ported from the side
// version; its Bone King and Lich recolours were not taken).
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { buildSprites, SPR } from '../public/js/engine/sprites.js';
import { HEROES, HERO_ORDER } from '../public/js/data/heroes.js';
import { ART } from '../public/js/art/defs.js';
import { rimRing, makeBuf, hexPack } from '../public/js/engine/pixels.js';
import { trialScene, SCENE, heroCrop, portraitBackdrop, mix } from '../public/js/ui/scenes.js';
import { cardScale, portraitFit } from '../public/js/ui/screens.js';

test('each trial has its own scene drawn in code, 64 x 44, and a locked one in shadow', () => {
  buildSprites();
  for (const m of ['s15', 'dungeon', 'ranked']) {
    const open = trialScene(m, true), locked = trialScene(m, false);
    assert.deepEqual([open.width, open.height], [SCENE.w, SCENE.h]);
    assert.deepEqual([locked.width, locked.height], [SCENE.w, SCENE.h]);
    assert.notEqual(open, locked, `${m}: the locked scene is its own picture`);
    assert.equal(trialScene(m, true), open, `${m}: drawn once, then kept`);
  }
});

test('the hero cards and the portrait size every hero by what he covers, all five at one scale', () => {
  buildSprites();
  for (const id of HERO_ORDER) {
    const s = SPR[HEROES[id].sprite], c = heroCrop(s);
    assert.ok(c.w > 0 && c.h > 0 && c.x >= 0 && c.y >= 0 && c.x + c.w <= s.w && c.y + c.h <= s.h, `${id}: the crop lies in the frame`);
    assert.equal(c.list.length, (s.idle || [0]).length, `${id}: one frame per idle pose`);
  }
  const tallest = Math.max(...HERO_ORDER.map((id) => heroCrop(SPR[HEROES[id].sprite]).h));
  const widest = Math.max(...HERO_ORDER.map((id) => heroCrop(SPR[HEROES[id].sprite]).w));
  // The hero screen's 64 x 66 card: each hero whole, his name under him.
  const cs = cardScale(64, 66);
  assert.ok(Number.isInteger(cs) && cs >= 1);
  assert.ok(cs === 1 || (widest * cs <= 64 - 8 && tallest * cs <= 66 - 18), 'every hero fits the card');
  // The detail panel's portrait (93 px tall, 138 wide at most): 2x, the tallest standing whole.
  const { s, foot } = portraitFit(93, 138);
  assert.equal(s, 2);
  assert.ok(tallest * s <= foot - 6 && widest * s <= 138 - 12);
});

test('the portrait backdrop is the hero colour in flat tones, cached per size', () => {
  assert.equal(mix('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(mix('#0099db', '#0d0b14', 0), '#0099db');
  const a = portraitBackdrop(120, 140, HEROES.knight.color);
  assert.deepEqual([a.width, a.height], [120, 140]);
  assert.equal(portraitBackdrop(120, 140, HEROES.knight.color), a);
  assert.notEqual(portraitBackdrop(120, 140, HEROES.knight.color, true), a, 'a locked hero has a slate one');
});

test('the Shadow carries a 2 px light line, his colours untouched; the ring is solid inside and fainter out', () => {
  assert.equal(HEROES.rogue.line, 2);
  assert.ok(!ART.rogue.palette, 'no recolour of the owner-picked sprite');
  const b = makeBuf(3, 3);
  b.d[4] = hexPack('#262b44');
  const r = rimRing(b, '#d8e2f0', 2);
  assert.deepEqual([r.w, r.h], [7, 7], 'grown by 2 each side');
  assert.equal(r.d[3 * 7 + 3], 0, 'the sprite itself is left clear');
  const inner = r.d[3 * 7 + 2] >>> 24, outer = r.d[3 * 7 + 1] >>> 24;
  assert.equal(inner, 255);
  assert.ok(outer > 0 && outer < inner, `outer ${outer} fainter than inner ${inner}`);
});
