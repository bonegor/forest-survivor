// The Sunscorch's ranges in dry stone (29 October 2026, game/topology/stone.js). The owner's words that
// day: "the mountain ridge looks kind of bad. It doesn't really look like a mountain. I provided you with
// example of what it could look like. I mean the edge of the walking surface at least, keep in mind that
// the top of the mountain ridge is not walkable so the provided pic is only applicable for the cliff
// part." Every pixel of the ranges is a function of where it is, so a chunk comes out the same whatever
// was painted before it; the rock is all painted, in the ranges' own tones (a wall of stones along the
// top range's edge, the pale cobbled rim along the bottom one's), and the band's sand is left as the
// ground below painted it beyond the shade at the wall's foot; the ground under the rock is never
// painted, which changes no pixel; the spires stand on ledges; the Frostfell keeps round 2's painter.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../public/js/game/darkwood.js';
import { BIOMES } from '../public/js/game/biomes.js';
import { MAPS } from '../public/js/data/maps.js';
import { makeTopology } from '../public/js/game/topology/index.js';
import { paintTerrain, groundRows } from '../public/js/game/topology/paint.js';

const CH = D.CHUNK, LOOK = BIOMES.desert, P = LOOK.terrain;
const topo = () => makeTopology(LOOK, MAPS.desert.seed, 7);
const tones = (...lists) => new Set(lists.flat().map((c) => c | 0));
const ROCK = tones(P.stone, P.cap, P.top, P.boulder), WALL = tones(P.stone, P.cap), CAP = tones(P.cap), LEDGE = tones(P.top, P.boulder), BOULDER = tones(P.boulder);
const SAND = 0x00c0ffee; // what lies under the terrain in the tests that paint only it (no colour: alpha 0)
// The terrain alone over the chunk, on SAND.
const paint = (T, cx, cy, look = LOOK) => {
  const px = new Uint32Array(CH * CH).fill(SAND);
  paintTerrain(T.terrain(cx, cy), px, null, look, T);
  return px;
};
// The chunk rows about the band (the top range's two, the bottom range's two) and some columns of
// chunks, with the start's and the first cave's.
const rowsOf = (T) => {
  const top = Math.floor(T.lo(0) / CH), bottom = Math.floor(T.hi(0) / CH);
  return [top - 1, top, bottom, bottom + 1];
};
const cave = (T) => Math.floor(T.cryptsNear(0, 0, 9000).sort((a, b) => Math.abs(a.x) - Math.abs(b.x))[0].x / CH);

test("a chunk's ranges are the same whichever chunk is painted first, and with the caches cold", () => {
  const T = topo(), list = [];
  for (const cy of rowsOf(T)) for (const cx of [-3, 0, 1, cave(T)]) list.push([cx, cy]);
  const first = list.map(([cx, cy]) => paint(T, cx, cy));
  const again = [...list].reverse().map(([cx, cy]) => paint(T, cx, cy)).reverse();
  const T2 = topo(), cold = [...list].reverse().map(([cx, cy]) => paint(T2, cx, cy)).reverse();
  for (const [i, [cx, cy]] of list.entries()) {
    assert.deepEqual(again[i], first[i], `chunk ${cx},${cy} painted again`);
    assert.deepEqual(cold[i], first[i], `chunk ${cx},${cy} from a new topology`);
  }
});

test("the rock is all painted in the ranges' own tones: the top range's wall at its edge, the bottom range's rim", () => {
  const T = topo();
  let rock = 0, walls = 0, rims = 0;
  for (const cy of rowsOf(T)) {
    for (const cx of [-2, 0, cave(T)]) {
      const px = paint(T, cx, cy);
      for (let x = 0; x < CH; x += 3) {
        const wx = cx * CH + x, lo = T.lo(wx), hi = T.hi(wx);
        for (let y = 0; y < CH; y++) {
          const wy = cy * CH + y, c = px[y * CH + x] | 0;
          // (2 px to spare: the painter holds the faces on their lattice, every 4 px of x.)
          if (wy < lo - 2 || wy > hi + 2) {
            assert.ok(ROCK.has(c), `${wx},${wy}: the ranges' tones, not ${(c >>> 0).toString(16)}`);
            rock++;
          }
          // The band's wall under the top range (or a cave's arch and jambs): stone and cobbles.
          if (wy >= Math.ceil(lo) - 22 && wy <= Math.ceil(lo) - 3) {
            assert.ok(WALL.has(c), `${wx},${wy}: the wall's stones`);
            walls++;
          }
          // The bottom range's pale cobbled rim, its dark lip at the band; or an outcrop on the ledge
          // just behind it, nearer the viewer, standing over it (paintDomes draws the stones over the
          // march: its review, 29 October 2026, found one by the start, 4-6 px into the rim).
          if (wy >= Math.ceil(hi) + 2 && wy <= Math.ceil(hi) + 5) {
            assert.ok(CAP.has(c) || BOULDER.has(c), `${wx},${wy}: the rim's cobbles`);
            rims++;
          }
        }
      }
    }
  }
  assert.ok(rock > 20000 && walls > 1000 && rims > 200, `${rock} rock, ${walls} wall, ${rims} rim pixels`);
});

test("the band's sand is left as the ground painted it, past the wall's shade and the rim's", () => {
  // Against the same chunk painted by round 2's painter (the look without its style): the quicksand,
  // the oases and the sand alike, but for the shades along the edges (and the old painter's cave).
  const T = topo(), plain = { ...LOOK, terrain: { ...P, style: undefined } };
  for (const cy of rowsOf(T)) {
    for (const cx of [-5, -1, 0, 2, 6]) {
      const a = paint(T, cx, cy), b = paint(T, cx, cy, plain);
      for (let x = 0; x < CH; x++) {
        const wx = cx * CH + x, lo = T.lo(wx), hi = T.hi(wx);
        if (T.cryptsNear(wx, lo, 40).length) continue;
        for (let y = 0; y < CH; y++) {
          const wy = cy * CH + y;
          if (wy > lo + 12 && wy < hi - 4) assert.equal(a[y * CH + x], b[y * CH + x], `${wx},${wy}: the band as it was`);
        }
      }
    }
  }
});

test('the ground under the ranges is never painted, and no pixel is the other for it', () => {
  D.setWorld({ seed: MAPS.desert.seed });
  const T = topo(), ground = LOOK.sun ? LOOK.day || LOOK.ground : LOOK.ground;
  let skipped = 0;
  for (const cy of rowsOf(T)) {
    for (const cx of [-1, 0, cave(T)]) {
      const lay = D.layoutChunk(cx, cy, null, LOOK.density, T), tc = T.terrain(cx, cy), rows = groundRows(tc, LOOK, T);
      lay.ground = ground;
      const all = new Uint32Array(CH * CH), some = new Uint32Array(CH * CH).fill(SAND);
      D.paintChunk(lay, all, null);
      D.paintChunk(lay, some, null, rows);
      paintTerrain(tc, all, null, LOOK, T);
      paintTerrain(tc, some, null, LOOK, T);
      assert.deepEqual(some, all, `chunk ${cx},${cy}`);
      skipped += CH - (rows[1] - rows[0]);
    }
  }
  assert.ok(skipped > CH * 4, `${skipped} rows skipped`);
  D.setWorld({ seed: 1 });
});

test("the spires stand on a ledge of the tiers, never on a wall or a cap, 6 px of it before their feet", () => {
  const T = topo();
  const chunks = new Map(), at = (x, y) => {
    const cx = Math.floor(x / CH), cy = Math.floor(y / CH), k = `${cx},${cy}`;
    if (!chunks.has(k)) chunks.set(k, paint(T, cx, cy));
    return chunks.get(k)[(y - cy * CH) * CH + x - cx * CH] | 0;
  };
  let n = 0;
  for (let b = -4; b < 4; b++) {
    for (const side of [0, 1]) {
      for (const p of T.ridge(b, side)?.props || []) {
        assert.ok(side ? p.y > T.hi(p.x) : p.y < T.lo(p.x), `${p.x},${p.y}: in its range`);
        for (let dy = 0; dy <= 6; dy++) assert.ok(LEDGE.has(at(p.x, p.y + dy)), `spire at ${p.x},${p.y}: a ledge ${dy} px before it`);
        n++;
      }
    }
  }
  assert.ok(n > 40, `${n} spires`);
});

test("only the Sunscorch is dry stone: the Frostfell keeps round 2's painter and all its ground", () => {
  assert.equal(P.style, 'drystone');
  for (const id of Object.keys(BIOMES)) if (id !== 'desert') assert.notEqual(BIOMES[id].terrain?.style, 'drystone', id);
  const F = makeTopology(BIOMES.frozen, MAPS.frozen.seed, 7);
  for (const [cx, cy] of [[Math.floor(F.lo(0) / CH), 0], [Math.floor(F.hi(0) / CH), 3]]) assert.equal(groundRows(F.terrain(cx, cy), BIOMES.frozen, F), null);
  assert.ok(!F.T.spires.ledge, "the Frostfell's spires stand at their depth into the rock");
});
