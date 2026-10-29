// The looks of the Survival maps (game/biomes.js, 28 October 2026). The owner's: "we basically need
// a few more maps ... the desert map ... a frozen, you know, snowy map ... sort of like a bright
// flower, colorful map ... a dark, hellish, essentially dark, hellish, demonic map". Each is the
// Darkwood's map laid out from a world of its own and dressed in its own ground, trees, light, air,
// weather and crypts; the Darkwood's look is the forest as it always was, pixel for pixel and draw for
// draw, and a run without a map (the tests, the bots, the tools) is the Darkwood again whatever ran
// before it.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import * as D from '../public/js/game/darkwood.js';
import { BIOMES, FOREST, NIGHT, biomeProp } from '../public/js/game/biomes.js';
import { PC as KIT_PC } from '../public/js/game/biomes/kit.js';
import { PC } from '../public/js/game/particles.js';
import { SPR } from '../public/js/engine/sprites.js';
import { LIGHT_COLORS } from '../public/js/game/lighting.js';
import { THEMES, cryptLook } from '../public/js/game/dungeon.js';
import { Forest, NIGHT as FOREST_NIGHT } from '../public/js/game/forest.js';
import { Weather, SKIES, CLIMATE, forecast } from '../public/js/game/weather.js';
import { Game, cryptName, cryptLookFor } from '../public/js/game/game.js';
import { Prologue } from '../public/js/game/prologue.js';
import { MAPS } from '../public/js/data/maps.js';
import { metaBonuses, defaultProfile } from '../public/js/shared/profile.js';

const LOOKS = ['desert', 'frozen', 'meadow', 'hell'];
const meta = metaBonuses(defaultProfile());
const night = (o = {}) => new Game({ hero: 'knight', mode: 's15', meta, settings: { numbers: false }, headless: true, ...o });
// What a look's props table names in each slot: its entries' names (a list, a road's name too).
const namesOf = (e) => (e === null ? [] : typeof e === 'string' ? [e] : Array.isArray(e) ? e : [e.n, e.road].flat().filter(Boolean));

// FNV-1a over a chunk's packed pixels, and over a string: the Darkwood's chunks as they were made
// before the maps came (HEAD's darkwood.js gave the same four, 28 October 2026).
const pixelHash = (a) => {
  let h = 2166136261;
  for (let i = 0; i < a.length; i++) {
    h ^= a[i] & 0xffff;
    h = Math.imul(h, 16777619);
    h ^= a[i] >>> 16;
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
};
const textHash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
};
const propsText = (lay) => lay.props.map((p) => `${p.n}@${p.x},${p.y}${p.light ? ':' + p.light.join('/') : ''}`).join(';');
// The start's chunk, and three thick with trees: oaks, pines, the cursed woods.
const FOREST_CHUNKS = [[0, 0, 'fe0886c5', '65b6a94d', 7], [9, 5, '38eb0446', 'e033351e', 28], [11, -7, '9fc7fc96', '2641f78', 28], [-7, 12, '9e088569', '6abedd63', 25]];

test('a Darkwood chunk is laid out and painted as it always was, with the look or without', () => {
  if (D.DARKWOOD.seed !== 1) D.setWorld({ seed: 1 }); // whatever world an earlier night left
  for (const [cx, cy, pixels, props, n] of FOREST_CHUNKS) {
    const lay = D.layoutChunk(cx, cy, null, FOREST.density), px = new Uint32Array(D.CHUNK * D.CHUNK);
    D.paintChunk(lay, px);
    assert.equal(lay.props.length, n, `chunk ${cx},${cy}: its props`);
    assert.equal(textHash(propsText(lay)), props, `chunk ${cx},${cy}: where they stand`);
    assert.equal(pixelHash(px), pixels, `chunk ${cx},${cy}: its ground`);
    // As the Forest paints it: with its look's ground, the Darkwood's own table.
    lay.ground = FOREST.ground;
    D.paintChunk(lay, px.fill(0));
    assert.equal(pixelHash(px), pixels, `chunk ${cx},${cy}: its ground through the look`);
  }
});

test("the Darkwood's look is the forest's own tables, and its numbers as they were", () => {
  assert.equal(BIOMES.forest, FOREST);
  assert.equal(FOREST.ground, D.GROUND);
  assert.equal(D.GROUND.zones[0], D.GRASS.oak);
  assert.equal(D.GROUND.road, D.ROAD);
  assert.equal(FOREST.night, NIGHT);
  assert.equal(FOREST_NIGHT, NIGHT, 'forest.js still exports the night (the sprite tuner reads it)');
  assert.deepEqual(NIGHT.find(([u]) => u === 0.5)[1], [102, 110, 164]);
  for (const k of ['density', 'props', 'trunks', 'lit', 'fx', 'weather']) assert.equal(FOREST[k], null, k);
  assert.deepEqual(FOREST.dawn, [255, 244, 228]);
  assert.deepEqual(FOREST.fog, { rgb: [200, 210, 240], alpha: [0.09, 0.06], drift: [3.5, 6], rise: [0.8, 1.5] });
  assert.deepEqual(FOREST.vignette, ['8,6,16', 0.7]);
  assert.deepEqual(FOREST.dust, { step: PC.b, rise: [PC.b, PC.m, PC.a], charge: null });
  assert.deepEqual(FOREST.crypt, { door: 'crypt', inside: null, kinds: null });
  assert.deepEqual(FOREST.flicker, ['fire']);
  assert.deepEqual(FOREST.lightK, { cyan: 0.55 });
  assert.equal(MAPS.forest.look, 'forest');
  assert.equal(MAPS.forest.seed, 1);
});

test("the looks' particle colours are the particles' own (biomes/kit.js against particles.js)", () => {
  assert.deepEqual(KIT_PC, PC);
});

test("every look dresses the Darkwood's places in sprites there are: its trees with trunks, its lights known", () => {
  for (const id of LOOKS) {
    const L = BIOMES[id];
    assert.equal(L.id, id);
    assert.equal(MAPS[id].look, id, `the ${id} map wears the ${id} look`);
    for (const [slot, e] of Object.entries(L.props)) {
      for (const n of namesOf(e)) {
        assert.ok(SPR[n], `${id}: ${n} (in ${slot}) is drawn`);
        // What stands in a tree's place is a tree, its trunk given (forest.js generate).
        if (D.TREE_NAMES.has(slot)) assert.ok(L.trunks[n] > 0, `${id}: ${n}, a tree in ${slot}, has a trunk`);
      }
      if (e && typeof e === 'object' && !Array.isArray(e) && e.light) assert.ok(LIGHT_COLORS[e.light[0]], `${id}: ${slot}'s light ${e.light[0]}`);
    }
    for (const [n, [key]] of Object.entries(L.lit || {})) {
      assert.ok(SPR[n], `${id}: ${n} (lit)`);
      assert.ok(LIGHT_COLORS[key], `${id}: ${n}'s light ${key}`);
    }
    for (const key of [...L.flicker, ...Object.keys(L.lightK)]) assert.ok(LIGHT_COLORS[key], `${id}: light ${key}`);
    if (L.crypt.light) assert.ok(LIGHT_COLORS[L.crypt.light], `${id}: its crypts' light`);
    // Its crypts' doors: the mausoleum's frames in its stone, so the walls (CRYPT_BOX), the steps and
    // the prompt over them fit as they do in the Darkwood.
    const door = SPR[L.crypt.door];
    assert.ok(door, `${id}: ${L.crypt.door} is drawn`);
    assert.equal(door.w, SPR.crypt.w, `${id}: its door as wide as the crypt's`);
    assert.equal(door.h, SPR.crypt.h, `${id}: and as tall`);
    assert.equal(door.frames.length, SPR.crypt.frames.length, `${id}: open and sealed`);
    if (L.crypt.inside) assert.ok(THEMES[L.crypt.inside], `${id}: its crypts' look within, ${L.crypt.inside}`);
    assert.ok(L.crypt.kinds.length > 0, `${id}: what its crypts are called`);
  }
});

test('what stands in a slot: by what the place dresses, then by name, one picked by where it stands', () => {
  const q = { n: 'oak1', x: 120, y: -340 };
  assert.equal(biomeProp(FOREST, q), q, 'the Darkwood: the slot itself');
  const desert = BIOMES.desert, near = { pathDist: () => 10 }, far = { pathDist: () => 200 };
  assert.equal(biomeProp(desert, q, near).n, 'sand_palm1', 'a palm by the road');
  const cactus = biomeProp(desert, q, far).n;
  assert.ok(['sand_cactus1', 'sand_cactus2'].includes(cactus), 'a saguaro away from it');
  assert.equal(biomeProp(desert, { ...q }, far).n, cactus, 'the same one wherever the chunk is made from');
  assert.equal(biomeProp(desert, { n: 'stump', x: 0, y: 0, src: 'start' }).n, 'sand_rock3', "the start camp's stones");
  assert.equal(biomeProp(desert, { n: 'stump', x: 0, y: 0 }).n, 'sand_bones', "a grove's stump");
  const meadow = BIOMES.meadow;
  assert.equal(biomeProp(meadow, { n: 'lm_gibbet', x: 0, y: 0, src: 'gallows' }), null, 'no gallows in the Bloomvale');
  assert.equal(biomeProp(meadow, { n: 'lm_gallows', x: 0, y: 0, src: 'gallows' }).n, 'bloom_statue');
  const hell = BIOMES.hell;
  const lamp = biomeProp(hell, { n: 'lantern', x: 5, y: 5, light: ['warm', 60], src: 'shrine' });
  assert.deepEqual([lamp.n, lamp.light, lamp.anim], ['brazier', ['fire', 70], 9], 'braziers for the lanterns');
  const vent = biomeProp(hell, { n: 'mushrooms', x: 5, y: 5, light: ['cyan', 26] });
  assert.deepEqual([vent.n, vent.light, vent.anim], ['hell_vent', ['fire', 34], 6], 'the vents breathe fire where the mushrooms glowed');
});

test('a map lays its night out from a world of its own; the next run without one is the Darkwood again', () => {
  const trees = (g) => g.world.chunk(1, 1).props.filter((p) => p.tree).map((p) => `${p.x},${p.y},${p.trunk}`);
  const before = night(), start = { ...before.world.start }, wood = trees(before);
  assert.equal(before.world.look, FOREST);
  for (const id of LOOKS) {
    const g = night({ map: id });
    assert.equal(g.map.id, id);
    assert.ok(g.world instanceof Forest, 'a Forest still (Game.relocate)');
    assert.equal(g.world.look, BIOMES[id]);
    assert.equal(D.DARKWOOD.seed, MAPS[id].seed, `the ${id}'s own world`);
    assert.notEqual(MAPS[id].seed, MAPS.forest.seed);
  }
  const after = night();
  assert.equal(D.DARKWOOD.seed, 1);
  assert.equal(after.world.look, FOREST);
  assert.deepEqual(after.world.start, start, 'the start where it was');
  assert.deepEqual(trees(after), wood, 'and its trees');
  // Ranked keeps to the Darkwood, whatever map was chosen.
  assert.equal(night({ mode: 'ranked', map: 'hell' }).world.look, FOREST);
});

test("whatever stands in a tree's place is a tree: it stops the hero, fades over him and counts for the Druid", () => {
  for (const id of LOOKS) {
    const g = night({ map: id }), L = BIOMES[id];
    let n = 0;
    for (let cy = -2; cy <= 1; cy++) {
      for (let cx = -2; cx <= 1; cx++) {
        const at = new Map(g.world.chunk(cx, cy).props.map((p) => [`${p.x},${p.y}`, p]));
        // Laid out on the map's own ground (game/topology, 28 October 2026: the Sunscorch's and the
        // Frostfell's corridors, the Abyss's islands), as the Forest lays it: no tree in the rock or
        // over a gap, and the topology's own places.
        for (const q of D.layoutChunk(cx, cy, null, L.density, g.world.topo).props) {
          if (!D.TREE_NAMES.has(q.n)) continue;
          // Nothing stands where a look keeps clear (look.clearAt: the Bloomvale's rings' clearings
          // until 29 October 2026; no look keeps any now).
          if (L.clearAt?.(q.x, q.y)) continue;
          const p = at.get(`${q.x},${q.y}`);
          assert.ok(p, `${id}: what stands in the ${q.n} at ${q.x},${q.y}`);
          assert.ok(p.tree && p.trunk > 0, `${id}: the ${q.n} at ${q.x},${q.y} is a tree`);
          n++;
        }
      }
    }
    // Some, so that the rule above was put to them: how thick a look's woods stand is its own to tune
    // (its density: the Sunscorch's, thinned a little, had come within a few trees of a floor of ten).
    assert.ok(n > 0, `${id}: ${n} trees round the start`);
  }
});

test("the Abyss's cracks light the night where they run; the Darkwood's ground has none", () => {
  const ctx = document.createElement('canvas').getContext('2d');
  const hell = night({ map: 'hell', headless: false });
  assert.ok(hell.world.chunk(0, 0).glow, 'their glow painted apart');
  hell.world.addLights(hell);
  assert.ok(hell.lighting.m > 0, 'and added to the light (lighting.js glow), not drawn over the props');
  hell.lighting.render(ctx, hell.cam, [0, 0, 0]);
  assert.equal(hell.lighting.m, 0, 'for one frame');
  assert.ok(hell.lighting.gi.every((c) => c === null), 'no chunk kept for it');
  const wood = night({ headless: false });
  assert.equal(wood.world.chunk(0, 0).glow, null);
  wood.world.addLights(wood);
  assert.equal(wood.lighting.m, 0);
});

test("every look's ground is the Darkwood's table in its own colours, and its night has the forest's breakpoints", () => {
  const breaks = NIGHT.map(([u]) => u);
  const grounds = LOOKS.map((id) => [id, BIOMES[id].ground]).concat([['desert by day', BIOMES.desert.day], ['snow by day', BIOMES.frozen.day]]);
  for (const [id, G] of grounds) {
    assert.equal(G.zones.length, 3, `${id}: three zones`);
    for (const z of G.zones) assert.ok(z.length === 5 && z.every(Number.isFinite), `${id}: five tones a zone`);
    assert.ok(G.road.length === 5 && G.road.every(Number.isFinite), `${id}: its road`);
    for (const z of ['oak', 'pine', 'cursed']) {
      assert.ok(G.tuft[z].length >= 3, `${id}: tufts in ${z}`);
      assert.ok(G.leaf[z].length >= 1, `${id}: leaves in ${z}`);
    }
    assert.ok(G.flower.length >= 1 && Number.isFinite(G.stem), `${id}: its flowers`);
    assert.equal(G.pebble.length, 3, `${id}: its pebbles`);
    for (const k of ['verge', 'tufts', 'sparse', 'leaves', 'flowers', 'bloom', 'pebbles']) assert.ok(Number.isFinite(G[k]), `${id}: ${k}`);
    for (const k of ['ripple', 'glint', 'cracks']) if (G[k]) assert.equal(G[k].zones.length, 3, `${id}: its ${k} by zone`);
  }
  for (const id of LOOKS) {
    const L = BIOMES[id];
    assert.deepEqual(L.night.map(([u]) => u), breaks, `${id}: the night's breakpoints, 0.5 among them`);
    for (const [, c] of L.night) assert.ok(c.length === 3 && c.every((v) => v >= 0 && v <= 255), `${id}: its night's colours`);
    assert.equal(L.dawn.length, 3);
    assert.ok(typeof L.vignette[0] === 'string' && L.vignette[1] > 0, `${id}: its vignette`);
    for (const k of ['alpha', 'drift', 'rise']) assert.equal(L.fog[k].length, 2, `${id}: its fog's ${k}`);
    assert.equal(L.fog.rgb.length, 3);
  }
});

// The owner's (28 October 2026): "we will have to only have to spend the night in the forest, make the
// desert and snow one be normal bright". The Sunscorch and the Frostfell stand in their sun the whole
// fifteen minutes (a light too bright for the night's lifted edge), on their ground by day, drawn in the
// day's order and still under their weather; the Bloomvale, the Darkwood and the Abyss keep their nights.
test('the Sunscorch and the Frostfell are spent in the sun, under their weather; the other maps by night', () => {
  const luma = ([r, gg, b]) => (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
  for (const id of ['desert', 'frozen']) {
    const L = BIOMES[id];
    assert.ok(L.sun && luma(L.sun) >= 0.95, `${id}: a sun too bright for the night's edge`);
    assert.ok(L.day && L.day.zones.length === 3, `${id}: its ground by day`);
    const g = night({ map: id });
    assert.equal(g.world.daylight, true, `${id}: drawn by day`);
    assert.ok(!g.world.noWeather, `${id}: its weather still comes`);
    for (const t of [0, 300, 899]) {
      g.time = t;
      assert.deepEqual(g.world.ambient(), [...L.sun], `${id}: the same sun at ${t} s`);
    }
    assert.notEqual(g.world.ambient(), L.sun, `${id}: a copy of its sun, never the look's own`);
  }
  for (const id of ['meadow', 'forest', 'hell']) {
    assert.equal(BIOMES[id].sun ?? null, null, `${id}: no sun`);
    assert.ok(!night({ map: id }).world.daylight, `${id}: by night`);
  }
});

test("the Darkwood's weather is forecast as it was; every climate's skies blend key by key", () => {
  const g = { seed: 4242, duration: 900, headless: false, inCrypt: false, world: {}, settings: {} };
  const rain = new Weather(g);
  assert.equal(rain.climate, CLIMATE);
  assert.equal(rain.skies, SKIES);
  assert.deepEqual(rain.spells, forecast(g.seed, 900));
  assert.deepEqual(rain.now, { rain: 0, dark: 0, lightning: 0 });
  assert.equal(rain.motes.length, 0);
  rain.now.rain = 1;
  assert.equal(rain.wet, true, 'rain wets the steps');
  assert.equal(rain.crunch, false);
  for (const id of LOOKS) {
    const C = BIOMES[id].weather, keys = Object.keys(C.skies.clear).sort().join();
    for (const [k, s] of Object.entries(C.skies)) {
      assert.equal(Object.keys(s).sort().join(), keys, `${id}: the ${k} sky has the clear's keys (Weather.at)`);
      for (const n of ['rain', 'dark', 'lightning']) assert.ok(n in s, `${id}: ${k} says its ${n}`);
    }
    for (const [k, s] of Object.entries(C.spells)) for (const n of Object.keys(s.next)) assert.ok(C.skies[n] && C.spells[n], `${id}: ${k} passes into ${n}`);
    for (const m of C.motes || []) assert.ok(m.key in C.skies.clear, `${id}: its ${m.kind} follow a sky's ${m.key}`);
    const w = new Weather({ ...g, seed: 77 }, C);
    assert.ok(w.spells.every((s) => s.kind in C.skies), `${id}: only its own skies`);
    // Opened and closed by its `first` and `close` skies where it gives them (the Frostfell's snow,
    // 28 October 2026: the owner's "Weather is snow blizzard"), clear otherwise.
    assert.equal(w.spells[0].kind, C.first ?? 'clear', `${id}: the sky it opens with`);
    assert.equal(w.spells.at(-1).kind, C.close ?? 'clear', `${id}: the sky it ends in`);
  }
  assert.equal(BIOMES.frozen.weather.first, 'snow', 'the Frostfell opens in falling snow');
  assert.equal(BIOMES.frozen.weather.close, 'snow', 'and ends in it');
  // The Sunscorch's sky is clear or a duststorm (the owner's "weather is clear or has duststorm", 28
  // October 2026): no other, and only the storm's murk blinds.
  assert.deepEqual(Object.keys(BIOMES.desert.weather.skies).sort(), ['clear', 'duststorm']);
  assert.equal(BIOMES.desert.weather.skies.clear.murk, 0);
  assert.equal(BIOMES.desert.weather.skies.duststorm.murk, 1);
  // Only rain is heard and wets a step: the Bloomvale's shower, without its thunder; the snow
  // crunches; sand and ash fall silent; the Abyss's ember storms bring the thunder.
  const skies = (id) => Object.values(BIOMES[id].weather.skies);
  for (const id of ['desert', 'frozen', 'hell']) assert.ok(skies(id).every((s) => s.rain === 0), `${id}: no rain`);
  assert.ok(skies('meadow').some((s) => s.rain > 0) && skies('meadow').every((s) => s.lightning === 0), 'a soft shower');
  assert.ok(skies('hell').some((s) => s.lightning > 0), 'red lightning');
  assert.ok(skies('desert').every((s) => s.lightning === 0) && skies('frozen').every((s) => s.lightning === 0));
  const snow = new Weather(g, BIOMES.frozen.weather);
  snow.now.flake = 1;
  assert.equal(snow.crunch, true, 'fresh snow crunches');
  assert.equal(snow.wet, false);
  snow.now.flake = 0.1;
  assert.equal(snow.crunch, false);
  const sand = new Weather(g, BIOMES.desert.weather);
  sand.now.grain = 1;
  assert.equal(sand.crunch, false);
  assert.equal(sand.wet, false);
});

test("a crypt's look within and its name go by the map's look, the Darkwood's as they were", () => {
  const keys = ['0,0', '2,0', '0,2', '-2,2', '4,-2', '2,4', '-4,0', '6,6', '-6,-4', '8,2'];
  const words = { forest: /^(Crypt|Barrow|Tomb|Ossuary|Sepulchre|Vault|Undercroft) of /, desert: /^(Cave|Tomb|Necropolis) of /, frozen: /^(Ice Cave|Glacier Vault) of /, meadow: /^(Barrow|Hollow|Undercroft) of /, hell: /^(Pit|Abyss Gate) of / };
  for (const key of keys) {
    assert.equal(cryptName(key), cryptName(key, FOREST), 'without a look, the Darkwood');
    assert.equal(cryptLookFor(key), cryptLook(key));
    for (const [id, re] of Object.entries(words)) assert.match(cryptName(key, BIOMES[id]), re, `${id}: ${key}`);
    assert.equal(cryptLookFor(key, BIOMES.desert), 'tomb');
    assert.equal(cryptLookFor(key, BIOMES.frozen), 'icecave');
    assert.equal(cryptLookFor(key, BIOMES.hell), 'inferno');
    assert.equal(cryptLookFor(key, BIOMES.meadow), cryptLook(key), "the Bloomvale's as the Darkwood's");
  }
  // The new looks within are palettes alone, as the crypt's own is.
  for (const id of ['tomb', 'icecave']) {
    for (const [k, v] of Object.entries(THEMES.crypt)) {
      assert.ok(k in THEMES[id], `${id}: ${k}`);
      if (Array.isArray(v)) assert.equal(THEMES[id][k].length, v.length, `${id}: ${k}`);
    }
  }
});

test("the road to the Sunscorch: the desert's sand and caravan road by day, saguaros and palms along the camp's west", () => {
  const g = new Prologue({ headless: true, settings: {} }), w = g.world, desert = BIOMES.desert;
  assert.equal(w.look, desert);
  assert.equal(w.daylight, true);
  assert.equal(w.layout(0, 0).ground, desert.day);
  const trees = new Set(['sand_cactus1', 'sand_cactus2', 'sand_palm1', 'sand_joshua1', 'sand_joshua2', 'sand_acacia1', 'sand_acacia2'].map((n) => SPR[n]));
  const west = w.chunk(-1, 0).props.filter((p) => p.x <= -88 && p.tree);
  assert.ok(west.length >= 5, 'the west edge marked');
  for (const p of west) assert.ok(trees.has(p.spr) && p.trunk > 0, `a desert tree at ${p.x},${p.y}`);
});
