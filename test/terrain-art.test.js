// The Survival maps' new ground and the Bloomvale's moonblooms, drawn (28 October 2026): the artists'
// sprites folded into art/terrain.js and art/flora-meadow.js, their stand-ins gone from art/fallbacks.js.
// Every name the maps lay out or draw is a drawn sprite that builds clean (no unknown palette key, every
// frame one size); the crypts' new doors are the crypt's size; no name is in two of the art's tables;
// a sleeping or wilted bloom doesn't glow. Pure data: no canvas, no game.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ART, DRAWN } from '../public/js/art/defs.js';
import { ART_FALLBACKS } from '../public/js/art/fallbacks.js';
import { TERRAIN_ART, TERRAIN_SOLIDS } from '../public/js/art/terrain.js';
import { spriteBuffers } from '../public/js/engine/sprites.js';
import { pack, keepColors } from '../public/js/engine/pixels.js';
import * as D from '../public/js/game/darkwood.js';
import { BIOMES, biomeProp } from '../public/js/game/biomes.js';
import { MAPS } from '../public/js/data/maps.js';
import { makeTopology } from '../public/js/game/topology/index.js';
import { HERO_ART } from '../public/js/art/heroes.js';
import { MONSTER_ART } from '../public/js/art/monsters.js';
import { BOSS_ART } from '../public/js/art/bosses.js';
import { PICKUP_ART, PROJECTILE_ART, ICON_ART } from '../public/js/art/items.js';
import { PROC_ART } from '../public/js/art/procgen.js';
import { PROP_ART } from '../public/js/art/props.js';
import { LANDMARK_ART } from '../public/js/art/landmarks.js';
import { PALADIN_ITEMS } from '../public/js/art/hero-paladin-items.js';
import { DRUID_ITEMS } from '../public/js/art/hero-druid-items.js';
import { BERSERKER_ITEMS } from '../public/js/art/hero-berserker-items.js';
import { WITCHHUNTER_ITEMS } from '../public/js/art/hero-witchhunter-items.js';
import { MAP_MONSTER_ART } from '../public/js/art/monsters-maps.js';
import { MAP_BOSS_ART } from '../public/js/art/bosses-maps.js';
import { FLORA_DESERT } from '../public/js/art/flora-desert.js';
import { FLORA_FROZEN } from '../public/js/art/flora-frozen.js';
import { FLORA_MEADOW } from '../public/js/art/flora-meadow.js';
import { FLORA_HELL } from '../public/js/art/flora-hell.js';

const BLOOMS = ['fae_bloom1', 'fae_bloom2', 'fae_bloom1_u', 'fae_bloom2_u'];
const NEW = [...Object.keys(TERRAIN_ART), ...BLOOMS];
const MAGENTA = pack(255, 0, 255); // what a palette key the palette doesn't know is drawn in

test('every new sprite builds: known keys only, every frame one size', () => {
  for (const n of NEW) {
    assert.ok(DRAWN[n], `${n} is drawn`);
    const { frames } = spriteBuffers(ART[n]);
    assert.ok(frames.length > 0, `${n}: frames`);
    for (const [i, f] of frames.entries()) {
      assert.equal(f.d.filter((c) => c === MAGENTA).length, 0, `${n} frame ${i}: no unknown palette key`);
      assert.deepEqual([f.w, f.h], [frames[0].w, frames[0].h], `${n} frame ${i}: the first's size`);
    }
  }
});

test("no stand-in is left for a drawn name, and what is solid is drawn", () => {
  for (const n of NEW) assert.equal(ART_FALLBACKS[n], undefined, `${n}: drawn, no stand-in`);
  for (const n of Object.keys(TERRAIN_SOLIDS)) assert.ok(TERRAIN_ART[n], `${n}: solid and drawn`);
});

// A particle holds its colour in a byte (engine/sprites.js addColour): the ground and the blooms never
// burst, so a recolour of theirs takes none of the 256 the horde and the sprite tuner's tunes need.
test('a recoloured door, bone or bloom keeps its colours off the particle list', () => {
  for (const n of NEW) if (ART[n].palette) assert.equal(ART[n].burst, false, `${n}: burst false`);
});

test("the cave mouth and the igloo are the crypt's size, open and sealed, their steps glowing", () => {
  const crypt = spriteBuffers(ART.crypt).frames;
  for (const n of ['crypt_cave', 'crypt_igloo']) {
    const { frames, emissive } = spriteBuffers(ART[n]);
    assert.equal(frames.length, 2, `${n}: open and sealed`);
    assert.deepEqual([frames[0].w, frames[0].h], [crypt[0].w, crypt[0].h], `${n}: the crypt's size (26 x 29 art)`);
    assert.ok(keepColors(frames[0], emissive), `${n}: the open door's steps glow`);
    assert.equal(keepColors(frames[1], emissive), null, `${n}: the sealed one doesn't`);
  }
});

test('the swirls are ground marks played on a clock; the bridge posts and the bones stand on their solids', () => {
  for (const n of ['fx_quicksand', 'fx_gust']) {
    assert.equal(ART[n].outline, false, `${n}: no outline`);
    assert.ok(ART[n].fps > 0 && ART[n].frames.length > 1, `${n}: loops`);
    assert.ok(!ART[n].emissive, `${n}: spent by day, no glow`);
  }
  // The ribcage's two posts under its near ribs' feet (x 7-10 and 37-40 of 48).
  const w = ART.sand_ribcage.frames[0][0].length;
  for (const [dx] of TERRAIN_SOLIDS.sand_ribcage) {
    const col = Math.round(w / 2 + dx);
    assert.ok(ART.sand_ribcage.frames[0].slice(-6).some((row) => row[col] !== '.'), `a rib stands at x ${col}`);
  }
});

test("a bud or a wilted moonbloom doesn't glow; an open or a bright one does, in both skins", () => {
  for (const n of BLOOMS) {
    const { frames, emissive } = spriteBuffers(ART[n]);
    assert.equal(frames.length, 4, `${n}: bud, open, bright, wilted`);
    const lit = frames.map((f) => !!keepColors(f, emissive)); // null when no pixel of it glows
    assert.deepEqual(lit, [false, true, true, false], `${n}: which frames glow`);
  }
});

test('no name is in two of the art tables', () => {
  const tables = [HERO_ART, MONSTER_ART, BOSS_ART, PICKUP_ART, PROJECTILE_ART, ICON_ART, PROC_ART, PROP_ART, LANDMARK_ART,
    PALADIN_ITEMS, DRUID_ITEMS, BERSERKER_ITEMS, WITCHHUNTER_ITEMS, MAP_MONSTER_ART, MAP_BOSS_ART,
    FLORA_DESERT, FLORA_FROZEN, FLORA_MEADOW, FLORA_HELL, TERRAIN_ART];
  const seen = new Map();
  tables.forEach((t, i) => {
    for (const n of Object.keys(t)) {
      assert.ok(!seen.has(n), `${n} in tables ${seen.get(n)} and ${i}`);
      seen.set(n, i);
    }
  });
  assert.equal(seen.size, Object.keys(DRAWN).length, 'DRAWN is those tables, nothing more');
});

test('every name the Survival maps lay out is drawn, as laid and as their look dresses it (all three bridge posts too)', () => {
  const posts = new Set();
  try {
    for (const id of ['desert', 'frozen', 'hell']) {
      const look = BIOMES[id];
      assert.ok(DRAWN[look.crypt.door], `${id}: its crypt's door ${look.crypt.door}`);
      for (const run of [3, 7, 11]) {
        const T = makeTopology(look, MAPS[id].seed, run);
        for (const n of T.T.spires?.name || []) assert.ok(DRAWN[n], `${id}: its spire ${n}`);
        D.setWorld({ seed: MAPS[id].seed });
        for (let cy = -6; cy <= 6; cy++) {
          for (let cx = -6; cx <= 6; cx++) {
            const lay = D.layoutChunk(cx, cy, null, look.density, T);
            for (const q0 of lay.props) {
              assert.ok(ART[q0.n], `${id}: ${q0.n} at ${q0.x},${q0.y}`);
              const q = biomeProp(look, q0, lay);
              if (q) assert.ok(ART[q.n], `${id}: ${q.n} (for ${q0.n}) at ${q.x},${q.y}`);
              if (q0.n.startsWith('hell_post_')) posts.add(q0.n);
            }
          }
        }
      }
    }
  } finally {
    D.setWorld({ seed: 1 });
  }
  // Since the fault plates (29 October 2026, topology/plates.js) the walkways are stone, iron or bone,
  // never planks (a rock causeway has no posts), so the charred wood posts stand on none of them.
  assert.deepEqual([...posts].sort(), ['hell_post_bone', 'hell_post_iron', 'hell_post_stone'], "the Abyss's walkways stand on all three posts");
});
