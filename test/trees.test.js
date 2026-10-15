// Half the Darkwood's trees stand (the user's call, 15 October 2026: "reduce number of trees by
// half"): the same forest, every other tree left out at random, each standing one where it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const D = await import(pathToFileURL(root + 'public/js/game/darkwood.js').href);

test('half the trees stand, each one where it stood, the same kind', () => {
  assert.equal(D.DARKWOOD.standing, 0.5);
  const trees = (standing) => {
    D.setWorld({ standing });
    const out = new Map();
    for (let cy = -8; cy < 8; cy++) {
      for (let cx = -8; cx < 8; cx++) for (const p of D.layoutChunk(cx, cy).props) if (D.TREE_NAMES.has(p.n)) out.set(`${p.x},${p.y}`, p.n);
    }
    return out;
  };
  try {
    const all = trees(1), half = trees(0.5);
    const share = half.size / all.size;
    assert.ok(all.size > 1000, `${all.size} trees in 256 chunks, all standing`);
    assert.ok(share > 0.46 && share < 0.54, `${half.size} of ${all.size} stand (${(share * 100).toFixed(1)}%)`);
    for (const [at, n] of half) assert.equal(all.get(at), n, `the tree at ${at}`);
  } finally {
    D.setWorld({ standing: 0.5 });
  }
});
