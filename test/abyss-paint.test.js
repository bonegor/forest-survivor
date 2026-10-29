// The Abyss's grey Act IV floor (29 October 2026, game/topology/abyss.js). The owner's words that day:
// "the setup should be more like grey and the floow should resemble act 4 of diablo 2." The floor paints
// every pixel of its chunks (no Darkwood ground under it: paint.js groundRows), each a function of where
// it lies, so a chunk comes out the same whatever was painted before it; the lava glows into the night's
// light (the glow pad) and so do the lit fissures, the void and the rock do not; nothing is violet any
// more; the Sanctuary's plaza lies under the start's camp; the Darkwood keeps its own ground.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../public/js/game/darkwood.js';
import { BIOMES } from '../public/js/game/biomes.js';
import { MAPS } from '../public/js/data/maps.js';
import { makeTopology } from '../public/js/game/topology/index.js';
import { paintTerrain, groundRows } from '../public/js/game/topology/paint.js';

const CH = D.CHUNK, LOOK = BIOMES.hell, P = LOOK.terrain;
const topo = (variant) => {
  const T = makeTopology(LOOK, MAPS.hell.seed, 3);
  T.variant = variant;
  return T;
};
const tones = (...lists) => new Set(lists.flat().map((c) => c | 0));
const NONE = 0x00c0ffee; // what lies under the floor in these tests (no colour: alpha 0)
const paint = (T, cx, cy) => {
  const px = new Uint32Array(CH * CH).fill(NONE), glow = new Uint32Array(CH * CH);
  paintTerrain(T.terrain(cx, cy), px, glow, LOOK, T);
  return { px, glow };
};
const CHUNKS = [];
for (let cy = -2; cy <= 1; cy++) for (let cx = -2; cx <= 1; cx++) CHUNKS.push([cx, cy]);

test("the Abyss's floor is its own: every pixel painted, no Darkwood ground under it", () => {
  assert.equal(P.style, 'abyss');
  for (const variant of ['lava', 'void']) {
    const T = topo(variant);
    for (const [cx, cy] of CHUNKS) {
      const tc = T.terrain(cx, cy);
      assert.ok(tc.any, `${variant} ${cx},${cy}: a chunk of the plates is always painted`);
      assert.deepEqual(groundRows(tc, LOOK, T), [0, 0], 'no ground painted under it');
      const { px } = paint(T, cx, cy);
      assert.ok(px.every((c) => c !== NONE), `${variant} ${cx},${cy}: every pixel painted`);
      assert.ok(px.every((c) => c >>> 24 === 255), `${variant} ${cx},${cy}: and opaque`);
    }
  }
  // The Darkwood keeps its own ground (no topology, no rows withheld).
  assert.equal(groundRows(null, BIOMES.forest, null), null);
});

test('a chunk comes out the same whatever was painted before it (pure in its world position)', () => {
  for (const variant of ['lava', 'void']) {
    const T = topo(variant), first = paint(T, 0, 0);
    for (const [cx, cy] of CHUNKS) paint(T, cx, cy);
    const again = paint(T, 0, 0), fresh = paint(topo(variant), 0, 0);
    assert.deepEqual(again.px, first.px, `${variant}: the same after other chunks`);
    assert.deepEqual(fresh.px, first.px, `${variant}: the same from a new topology`);
    assert.deepEqual(again.glow, first.glow, `${variant}: its glow too`);
  }
});

test('the lava and the lit fissures glow into the night; the void and the rock do not', () => {
  const lit = (variant) => {
    let n = 0, lavaPx = 0;
    const T = topo(variant), ramp = tones(P.lava.ramp);
    for (const [cx, cy] of CHUNKS) {
      const { px, glow } = paint(T, cx, cy);
      for (let k = 0; k < px.length; k++) {
        if (glow[k]) n++;
        if (ramp.has(px[k] | 0)) lavaPx++;
      }
    }
    return { n, lavaPx };
  };
  const L = lit('lava'), V = lit('void');
  assert.ok(L.lavaPx > 0 && L.n >= L.lavaPx * 0.8, `lava glows (${L.n} lit of ${L.lavaPx} lava px)`);
  assert.ok(V.lavaPx === 0, 'no lava over the void');
  assert.ok(V.n < L.n / 10, `over the void only the fissures' dim ember glows (${V.n})`);
});

test('grey: no violet left in the floor, the void neutral black', () => {
  const violet = (c) => {
    const r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
    return b > r + 12 && b > g + 12;
  };
  for (const [k, v] of Object.entries(P)) {
    if (k === 'tile' || k === 'grout') continue; // the Sanctuary's tiles: a cool grey, a hair blue
    const list = Array.isArray(v) ? v : typeof v === 'number' ? [v] : [];
    for (const c of list) assert.ok(!violet(c), `${k}: no violet (${(c & 0xffffff).toString(16)})`);
  }
  for (const c of P.void) {
    const r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
    assert.ok(Math.max(r, g, b) - Math.min(r, g, b) <= 10, 'the void a neutral black');
  }
  // The night is near-neutral now (it turned every grey maroon).
  for (const [u, [r, g, b]] of LOOK.night) if (u < 1) assert.ok(Math.abs(r - b) <= 24 && Math.abs(r - g) <= 16, 'a grey night (its dawn warm)');
});

test("the Sanctuary's tiled plaza lies under the start's camp", () => {
  const T = topo('lava'), tile = tones(P.tile, P.grout, P.inlay);
  const hero = T.start(), cx = Math.floor(hero.x / CH), cy = Math.floor(hero.y / CH);
  const { px } = paint(T, cx, cy);
  const at = (x, y) => px[(y - cy * CH) * CH + (x - cx * CH)] | 0;
  assert.ok(tile.has(at(hero.x, hero.y)), 'the hero starts on its tiles');
  let inlay = 0;
  for (let k = 0; k < px.length; k++) if (tones(P.inlay).has(px[k] | 0)) inlay++;
  assert.ok(inlay > 50, `its border inlaid red and gold (${inlay} px)`);
});
