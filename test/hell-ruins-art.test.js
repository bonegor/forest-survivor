// The Abyss in grey (29 October 2026). The owner's: "the setup should be more like grey and the floow
// should resemble act 4 of diablo 2". Its flora recoloured from the violets and the warm near-blacks to
// charcoal and grey (art/flora-hell.js), and the ruins drawn for its slots: broken pillars, a fallen drum,
// wall ends, an arch, an iron stake, a seal stone and a walkway's iron post. Each builds clean at the size
// drawn; no hell sprite keeps a violet; what the slots name is drawn and what stands in a tree's place has
// a trunk; what is solid is drawn and the arch is solid at its piers, open between them; the seal burns.
// Pure data: no canvas, no game.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ART, DRAWN } from '../public/js/art/defs.js';
import { PAL } from '../public/js/art/palette.js';
import { FLORA_HELL, HELL_ARCH } from '../public/js/art/flora-hell.js';
import { LANDMARK_SOLIDS, LANDMARK_TALL } from '../public/js/art/landmarks.js';
import { spriteBuffers } from '../public/js/engine/sprites.js';
import { pack, hexPack, keepColors } from '../public/js/engine/pixels.js';
import { TREE_NAMES } from '../public/js/game/darkwood.js';
import { BIOMES } from '../public/js/game/biomes.js';

const MAGENTA = pack(255, 0, 255); // what a palette key the palette doesn't know is drawn in
// [name, width, height] as drawn (the build's ink outline adds a pixel a side)
const SIZES = [
  ['hell_pillar1', 12, 30], ['hell_pillar2', 14, 42], ['hell_pillar3', 14, 55], ['hell_drum', 20, 10],
  ['hell_wall1', 26, 22], ['hell_wall2', 40, 26], ['hell_arch', 40, 46], ['hell_stake', 9, 34],
  ['hell_seal', 12, 18], ['hell_post_iron', 9, 15],
];

test('the ruins build: known keys only, one frame each, the size drawn', () => {
  for (const [n, w, h] of SIZES) {
    assert.ok(DRAWN[n], `${n} is drawn`);
    const { frames } = spriteBuffers(ART[n]);
    assert.equal(frames.length, 1, `${n}: one frame`);
    assert.deepEqual([frames[0].w, frames[0].h], [w + 2, h + 2], `${n}: ${w} x ${h}, outlined`);
    assert.equal(frames[0].d.filter((c) => c === MAGENTA).length, 0, `${n}: no unknown palette key`);
  }
});

test('no hell sprite keeps a violet (q p j); the trees, thorns, rocks and vent keep no warm near-black (h m) either', () => {
  const violet = new Set('qpj'.split('').map((k) => hexPack(PAL[k])));
  const warm = new Set('hm'.split('').map((k) => hexPack(PAL[k])));
  for (const n of Object.keys(FLORA_HELL)) {
    for (const [i, f] of spriteBuffers(ART[n]).frames.entries()) {
      assert.ok(!f.d.some((c) => violet.has(c)), `${n} frame ${i}: no violet`);
      // The hellgate keeps h for the dark of its door (only its m b R walls went grey).
      if (n !== 'crypt_hell') assert.ok(!f.d.some((c) => warm.has(c)), `${n} frame ${i}: charcoal, not warm brown`);
    }
  }
});

test('the embers, the gate\'s stairs and the seal still glow', () => {
  for (const n of ['hell_tree1', 'hell_tree2', 'hell_spire1', 'hell_spire2', 'hell_thorn1', 'hell_thorn2', 'hell_vent', 'hell_seal']) {
    const { frames, emissive } = spriteBuffers(ART[n]);
    assert.ok(keepColors(frames[0], emissive), `${n}: glows`);
  }
  const gate = spriteBuffers(ART.crypt_hell);
  assert.ok(keepColors(gate.frames[0], gate.emissive), "crypt_hell: the open gate's stairs burn");
  assert.equal(keepColors(gate.frames[1], gate.emissive), null, "crypt_hell: the sealed one's don't");
});

test("the Abyss's slots name drawn sprites, thinned to a quarter, a tree's place with a trunk", () => {
  const L = BIOMES.hell;
  assert.equal(L.density.standing, 0.25);
  const names = (e) => (typeof e === 'string' ? [e] : Array.isArray(e) ? e : e && e.n ? [].concat(e.n) : []);
  for (const [slot, e] of Object.entries(L.props)) {
    for (const n of names(e)) {
      assert.ok(ART[n], `${slot}: ${n} is drawn`);
      if (TREE_NAMES.has(slot)) assert.ok(L.trunks[n] > 0, `${n}, in a tree's place (${slot}), has a trunk`);
    }
  }
  assert.deepEqual(names(L.props.pine1), ['hell_pillar2', 'hell_spire2']);
  assert.deepEqual(names(L.props.pine2), ['hell_pillar3', 'hell_spire1']);
  assert.equal(L.props['ruins:lm_gargoyle2'], 'hell_arch');
  assert.equal(L.props['circle:menhir'].n, 'hell_seal');
});

test('what is solid is drawn; the arch stands on its piers and is open between them; the pillars are tall', () => {
  for (const n of Object.keys(LANDMARK_SOLIDS)) assert.ok(ART[n], `${n}: solid and drawn`);
  const rows = spriteBuffers(ART.hell_arch).frames[0];
  const opaque = (x, y) => rows.d[(y + 1) * rows.w + x + 1] >>> 24 > 0; // art coordinates, past the outline
  const foot = HELL_ARCH.h - 6; // above the plinths and the rubble
  for (const [dx] of LANDMARK_SOLIDS.hell_arch) assert.ok(opaque(Math.round(HELL_ARCH.w / 2 + dx), foot), `a pier stands at ${dx}`);
  assert.ok(!opaque(HELL_ARCH.w / 2, foot - 8), 'the opening is walked through');
  for (const n of ['hell_pillar1', 'hell_pillar2', 'hell_pillar3', 'hell_arch']) assert.ok(LANDMARK_TALL.has(n), `${n} fades over the hero`);
});
