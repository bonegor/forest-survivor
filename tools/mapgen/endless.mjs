// Previews of the Darkwood's endless map (public/js/game/darkwood.js, the same code the game runs):
// an overview round the start and one far away, game-sized night views of the start, a shrine
// crossroads, a bend, a landmark and a crossroads far out, then checks that the forest comes out
// the same in any order and without seams, and how long a chunk takes.
//   node tools/mapgen/endless.mjs [--seed=1] [--trees=1] [--out=tools/mapgen/out/endless]
// Another Survival map's look (public/js/game/biomes.js, 28 October 2026): --biome=desert (frozen,
// meadow, hell) paints the same views as the game paints that look: its ground, what stands in
// each place (biomeProp, its flora read from art/flora-<look>.js if defs.js has it not yet), its
// crypt doors, its night's light and its cracks' glow, laid out from its map's world seed
// (data/maps.js) unless --seed says otherwise; into tools/mapgen/out/endless-<look>.
// --views-only: just the pictures (a smaller overview, no far one), without the checks and timing.
// A look with a ground of its own (game/topology, 28 October 2026: the Sunscorch's and the Frostfell's
// corridors, the Abyss's islands) is laid out and painted by it as the game does it: its overview a strip
// of 128 x 12 chunks (x 4 for a band under 600 px) along a corridor round the start (its faces, road, caves or igloos, shrines and
// patches marked) or a square of the islands (the gaps in lava red or void black, the bridges brown);
// its views the start, the first crypt (cave, igloo, crypt), the nearest quicksand pool or ice pond, a
// shrine, the road's sharpest bend, a landmark, the nearest bridge and isthmus, and one far out.
// --run=<seed>: the run's seed (the Abyss's lava or void by it); --variant=lava|void sets it outright.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ART, resolveFrames } from '../../public/js/art/defs.js';
import { packedPalette, OUTLINE } from '../../public/js/art/palette.js';
import { fromRows, outline, makeBuf, hexPack } from '../../public/js/engine/pixels.js';
import { GLYPHS } from '../../public/js/engine/fontdata.js';
import { fbm, mulberry32, clamp, TAU } from '../../public/js/engine/util.js';
import { DARKWOOD, CHUNK, TREE_NAMES, setWorld, layoutChunk, paintChunk, place, road, roadsOf, roadExists, cacheSizes } from '../../public/js/game/darkwood.js';
import { BIOMES, biomeProp } from '../../public/js/game/biomes.js';
import { ART_FALLBACKS } from '../../public/js/art/fallbacks.js';
import { makeTopology, SURFACE, TN } from '../../public/js/game/topology/index.js';
import { sampleField } from '../../public/js/game/topology/terrain.js';
import { paintTerrain, groundRows } from '../../public/js/game/topology/paint.js';
import { strawPixel } from '../../public/js/game/topology/paint-quilt.js';
import { LIGHT_COLORS } from '../../public/js/game/lighting.js';
import { writePng } from '../png.mjs';

const arg = (k, d) => {
  const a = process.argv.find((s) => s.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const BIOME = arg('biome', 'forest'), LOOK = BIOMES[BIOME], VIEWS_ONLY = process.argv.includes('--views-only');
// --u=<0..1>: the views lit by the look's night at that much of the night (as Forest.ambient), not a
// tenth into it (29 October 2026: the Bloomvale's crops checked at midnight, --u=0.5).
const U = arg('u') === undefined ? null : Number(arg('u'));
const nightAt = (night, u) => {
  if (u === null) return night[1][1];
  let i = 0;
  while (i < night.length - 2 && night[i + 1][0] < u) i++;
  const [t0, c0] = night[i], [t1, c1] = night[i + 1], k = clamp((u - t0) / (t1 - t0), 0, 1);
  return [0, 1, 2].map((q) => c0[q] + (c1[q] - c0[q]) * k);
};
// The quilt's own props, laid as pseudo-landmarks (topology/quilt.js): no label on the overview.
const PSEUDO = ['avenue', 'orchard', 'lone', 'hay'];
if (!LOOK) throw new Error(`no look '${BIOME}': ${Object.keys(BIOMES).join(', ')}`);
// The look's own world: its map's seed (the Darkwood's 1).
const WORLD = BIOME === 'forest' ? DARKWOOD.seed : Object.values((await import('../../public/js/data/maps.js')).MAPS).find((m) => m.look === BIOME)?.seed ?? DARKWOOD.seed;
setWorld({ seed: Number(arg('seed', WORLD)), trees: Number(arg('trees', DARKWOOD.trees)) });
const SEED = DARKWOOD.seed, D = DARKWOOD.spacing;
// Its ground of its own, as the Forest makes it (game/topology): null for the Darkwood; the Bloomvale's
// quilt of flower fields since 29 October 2026.
const RUN = arg('run') ? Number(arg('run')) : undefined;
const newTopo = () => {
  const t = makeTopology(LOOK, SEED, RUN);
  if (t && arg('variant')) t.variant = arg('variant');
  return t;
};
let TOPO = newTopo();
const OUT = arg('out', BIOME === 'forest' ? 'tools/mapgen/out/endless' : `tools/mapgen/out/endless-${BIOME}`);
// Its flora, drawn before the game's art table has it (art/flora-<look>.js FLORA_<LOOK>).
const FLORA = BIOME === 'forest' ? {} : await import(`../../public/js/art/flora-${BIOME}.js`).then((m) => m[`FLORA_${BIOME.toUpperCase()}`] || {}, () => ({}));
// A look spent in the sun (its sun: the Sunscorch and the Frostfell since 28 October 2026) is
// painted with its day ground and lit by its sun, as Forest does.
const GROUND = LOOK.sun ? LOOK.day || LOOK.ground : LOOK.ground, ZONE = { oak: 0, pine: 1, cursed: 2 };
const CELL = 8, MARGIN = 112, GN = (CHUNK + 2 * MARGIN) / CELL; // as in darkwood.js
const TREE_GAP = 30;
const SPEED = 70; // the hero's walking speed, world px per second
mkdirSync(OUT, { recursive: true });

const T0 = performance.now();
const lap = (label) => console.log(`  ${label.padEnd(34)} ${String(Math.round(performance.now() - T0)).padStart(6)} ms`);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

const pal = packedPalette();
const sprites = {};
function sprite(name) {
  if (name in sprites) return sprites[name];
  // Not drawn yet: its stand-in as the game draws it (art/fallbacks.js), or left out as the game does.
  const def = ART[name] || FLORA[name] || ART[ART_FALLBACKS[name]];
  if (!def) return (sprites[name] = null);
  const raw = resolveFrames(def)[0];
  let b = Array.isArray(raw) ? fromRows(raw, pal) : raw, ink = OUTLINE;
  // In its own colours (def.palette), as the game draws it (engine/sprites.js recolouring): the
  // Sunscorch's cave door in its walls' stone, not the palette keys' greens, its outline too (its ink,
  // k, recoloured: the stones' own outline since 29 October 2026).
  if (def.palette) {
    const map = new Map(Object.entries(def.palette).map(([k, v]) => [(k.length === 1 ? pal[k] : hexPack(k)) & 0xffffff, hexPack(v) & 0xffffff]));
    b = { ...b, d: b.d.map((c) => (c >>> 24 && map.has(c & 0xffffff) ? ((c & 0xff000000) | map.get(c & 0xffffff)) >>> 0 : c)) };
    if (map.has(OUTLINE & 0xffffff)) ink = ((OUTLINE & 0xff000000) | map.get(OUTLINE & 0xffffff)) >>> 0;
  }
  const thin = def.thin ? new Set([...def.thin].map((ch) => pal[ch])) : null;
  if (def.outline !== false) b = outline(b, ink, false, thin);
  return (sprites[name] = b);
}
const rgbOf = (c) => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255];
const packRgb = (r, g, b) => ((255 << 24) | (clamp(b, 0, 255) << 16) | (clamp(g, 0, 255) << 8) | clamp(r, 0, 255)) >>> 0;
const H = (hex) => hexPack(hex);
const SHRINE_LIGHT = { fury: 'red', haste: 'cyan', fortune: 'gold', wisdom: 'purple', protection: 'green' };
// What the game draws for a chunk: its props (what stands in each place on the look, Forest.generate),
// its shrines, and the lights they cast (each key as bright as the look burns it); on another look its
// crypts' doors too (the game's syncShrines), in its stone.
function chunkScene(cd) {
  const props = [], lights = [];
  for (const q of cd.props) {
    const p = LOOK.props ? biomeProp(LOOK, q, cd) : q;
    if (!p || !sprite(p.n)) continue;
    props.push(p);
    if (p.light) lights.push([p.x, p.y - 6, p.light[1], p.light[0], LOOK.lightK[p.light[0]] ?? 1]);
  }
  for (const s of cd.shrines) {
    props.push({ n: 'shrine', x: Math.round(s.x), y: Math.round(s.y) });
    lights.push([s.x, s.y - 12, 70, SHRINE_LIGHT[s.type], 0.9]);
  }
  if (BIOME !== 'forest') for (const d of cd.crypts) props.push({ n: sprite(LOOK.crypt.door) ? LOOK.crypt.door : 'crypt', x: d.x, y: d.y });
  return { props, lights };
}
// A chunk laid out as the game lays it (with its topology, when the look has one).
const lay = (kx, ky) => layoutChunk(kx, ky, null, LOOK.density, TOPO);
// A chunk's ground as the look paints it, and its cracks' (or its lava's) glow if they glow (buf.glow);
// its topology's terrain over it, as Forest.generate paints it.
const ground = (cd) => {
  const buf = makeBuf(CHUNK, CHUNK);
  cd.ground = GROUND;
  if (GROUND.cracks || TOPO?.variant === 'lava') buf.glow = new Uint32Array(CHUNK * CHUNK);
  const tc = TOPO ? TOPO.terrain(cd.cx, cd.cy) : null;
  paintChunk(cd, buf.d, buf.glow || null, groundRows(tc, LOOK, TOPO));
  if (tc && tc.any) paintTerrain(tc, buf.d, buf.glow || null, LOOK, TOPO);
  if (SOWN && tc && tc.bloom) sowInto(SOWN, tc, buf.d);
  return buf;
};
// The quilt's view of a sown circle (29 October 2026): a wobbly loop pressed into a crop field as the
// Fae Court presses one (game/fae.js), the straw only on the flowers (bloom > 0), even-odd inside it.
let SOWN = null;
function sowInto(S, tc, px) {
  const P = paintPalette(), { xs, ys } = S, n = xs.length;
  for (let y = 0; y < CHUNK; y++) {
    const wy = tc.y0 + y + 0.5;
    for (let x = 0; x < CHUNK; x++) {
      const wx = tc.x0 + x + 0.5;
      if (Math.abs(wx - S.cx) > S.r || Math.abs(wy - S.cy) > S.r) continue;
      let inside = false, near = Infinity;
      for (let a = 0, b = n - 1; a < n; b = a++) {
        if (ys[a] > wy !== ys[b] > wy && wx < ((xs[b] - xs[a]) * (wy - ys[a])) / (ys[b] - ys[a]) + xs[a]) inside = !inside;
        const dx = xs[b] - xs[a], dy = ys[b] - ys[a], l2 = dx * dx + dy * dy;
        let t = l2 ? ((wx - xs[a]) * dx + (wy - ys[a]) * dy) / l2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        near = Math.min(near, Math.hypot(xs[a] + dx * t - wx, ys[a] + dy * t - wy));
      }
      if (!inside || sampleField(tc, tc.bloom, wx, wy, -127) <= 0) continue;
      px[y * CHUNK + x] = near < 2 ? P.strawRim : strawPixel(P, wx - S.cx, wy - S.cy, Infinity, bayer(tc.x0 + x, tc.y0 + y));
    }
  }
}
let PALETTE = null;
const paintPalette = () => PALETTE || (PALETTE = JSON.parse(JSON.stringify(LOOK.terrain), (k, v) => (typeof v === 'number' && Number.isInteger(v) && v > 0x7fffffff ? v | 0 : v)));

function blitSprite(buf, spr, x, y) {
  for (let j = 0; j < spr.h; j++) {
    const yy = y + j;
    if (yy < 0 || yy >= buf.h) continue;
    for (let i = 0; i < spr.w; i++) {
      const xx = x + i, c = spr.d[j * spr.w + i];
      if (xx < 0 || xx >= buf.w || c >>> 24 < 128) continue;
      buf.d[yy * buf.w + xx] = c;
    }
  }
}
const falloff = (t) => (t < 0.25 ? 1 - t * 0.72 : t < 0.5 ? 0.82 - (t - 0.25) * 1.36 : t < 0.75 ? 0.48 - (t - 0.5) * 1.2 : 0.18 - (t - 0.75) * 0.72);

// One screen of the game: 600x338 world px at night, as at 1080p (shown 3x bigger), built
// chunk by chunk exactly as the game would build it.
function renderView(name, cx, cy, hero = null) {
  const w = 600, h = 338, x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
  const buf = makeBuf(w, h), props = [], L = [], glow = GROUND.cracks || TOPO?.variant === 'lava' ? new Uint32Array(w * h) : null;
  // Chunks a little beyond the screen too, for the trees that lean in and the lights that reach in.
  for (let ky = Math.floor((y0 - 120) / CHUNK); ky <= Math.floor((y0 + h + 120) / CHUNK); ky++) {
    for (let kx = Math.floor((x0 - 120) / CHUNK); kx <= Math.floor((x0 + w + 120) / CHUNK); kx++) {
      const cd = lay(kx, ky), sc = chunkScene(cd);
      props.push(...sc.props);
      L.push(...sc.lights);
      if (kx * CHUNK >= x0 + w || (kx + 1) * CHUNK <= x0 || ky * CHUNK >= y0 + h || (ky + 1) * CHUNK <= y0) continue;
      const g = ground(cd);
      for (let y = 0; y < CHUNK; y++) {
        const yy = ky * CHUNK + y - y0;
        if (yy < 0 || yy >= h) continue;
        for (let x = 0; x < CHUNK; x++) {
          const xx = kx * CHUNK + x - x0;
          if (xx >= 0 && xx < w) {
            buf.d[yy * w + xx] = g.d[y * CHUNK + x];
            if (glow) glow[yy * w + xx] = g.glow[y * CHUNK + x];
          }
        }
      }
    }
  }
  if (hero) props.push({ n: 'knight', x: hero.x, y: hero.y });
  props.sort((a, b) => a.y - b.y);
  for (const p of props) {
    const s = sprite(p.n);
    blitSprite(buf, s, p.x - x0 - Math.floor(s.w / 2), p.y - y0 - s.h + 1);
  }
  // Night: ambient light times the scene, lamps and fires added on, like the game's light pass. The
  // look's light a tenth into the night (the Darkwood's 118, 120, 172).
  const near = L.filter(([x, y, r]) => x > x0 - r && x < x0 + w + r && y > y0 - r && y < y0 + h + r);
  near.push([cx, cy - 6, 125, 'warm', 1], [cx, cy - 8, 46, 'white', 0.7]); // the hero's own lantern glow
  const amb = LOOK.sun || nightAt(LOOK.night, U);
  // The cracks' glow lights the night too (Forest.addLights, lighting.js glow, at the middle of its
  // pulse): averaged into the light map's 2 px texels and spread smoothly over the screen, as the game's.
  const lw = Math.ceil(w / 2) + 1, lh = Math.ceil(h / 2) + 1, GL = glow ? new Float32Array(lw * lh * 3) : null, gk = glow ? (GROUND.cracks || LOOK.terrain.lava).alpha : 0;
  if (GL) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!glow[y * w + x]) continue;
        const [r, g, b] = rgbOf(glow[y * w + x]), i = ((y >> 1) * lw + (x >> 1)) * 3;
        GL[i] += r / 4; GL[i + 1] += g / 4; GL[i + 2] += b / 4;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let lr = amb[0], lg = amb[1], lb = amb[2];
      for (const [lx, ly, r, key, k] of near) {
        const dx = x0 + x - lx, dy = y0 + y - ly, d = Math.sqrt(dx * dx + dy * dy) / r;
        if (d >= 1) continue;
        const f = falloff(d) * k, c = LIGHT_COLORS[key];
        lr += c[0] * f; lg += c[1] * f; lb += c[2] * f;
      }
      if (GL) {
        const fx = clamp((x + 0.5) / 2 - 0.5, 0, lw - 1.001), fy = clamp((y + 0.5) / 2 - 0.5, 0, lh - 1.001);
        const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
        for (let ch = 0; ch < 3; ch++) {
          const a = GL[(j * lw + i) * 3 + ch], b = GL[(j * lw + i + 1) * 3 + ch], c = GL[((j + 1) * lw + i) * 3 + ch], d = GL[((j + 1) * lw + i + 1) * 3 + ch];
          const v = ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty) * gk;
          if (ch === 0) lr += v; else if (ch === 1) lg += v; else lb += v;
        }
      }
      const [r, g, b] = rgbOf(buf.d[y * w + x]);
      buf.d[y * w + x] = packRgb(Math.round((r * Math.min(lr, 255)) / 255), Math.round((g * Math.min(lg, 255)) / 255), Math.round((b * Math.min(lb, 255)) / 255));
    }
  }
  const S = 3, big = makeBuf(w * S, h * S);
  for (let y = 0; y < h * S; y++) for (let x = 0; x < w * S; x++) big.d[y * w * S + x] = buf.d[Math.floor(y / S) * w + Math.floor(x / S)];
  writePng(join(OUT, `view-${name}.png`), big);
}

function drawText(buf, s, x, y, col) {
  const ink = H('#181425');
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = (GLYPHS[ch] || GLYPHS['?']).split('/');
    for (let pass = 0; pass < 2; pass++) {
      g.forEach((row, j) => [...row].forEach((c, i) => {
        if (c !== '#') return;
        if (pass === 0) for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) { const xx = cx + i + ox, yy = y + j + oy; if (xx >= 0 && yy >= 0 && xx < buf.w && yy < buf.h) buf.d[yy * buf.w + xx] = ink; }
        else { const xx = cx + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < buf.w && yy < buf.h) buf.d[yy * buf.w + xx] = col; }
      }));
    }
    cx += g[0].length + 1;
  }
  return cx - x;
}
// A square of chunks round a point at one pixel per 8x8 world pixels, daylit for legibility (nx by ny
// of them: a corridor's strip along its axis). Every chunk is made on its own, as the game would make
// it, and the picture is pieced together. With a topology its terrain too: the ranges and cliffs in
// their rock, the lava red or the void black, the decks brown, the quicksand and ice; its crypt doors
// marked (cave, igloo, crypt).
const allTrees = [];
let chunkCount = 0, propCount = 0;
function renderOverview(name, wx, wy, nx, ny = nx) {
  const cx0 = Math.floor(wx / CHUNK) - Math.floor(nx / 2), cy0 = Math.floor(wy / CHUNK) - Math.floor(ny / 2), P = CHUNK / CELL, W = nx * P, HH = ny * P;
  const buf = makeBuf(W, HH), props = [], places = new Map(), landmarks = new Map();
  const TT = LOOK.terrain;
  for (let ky = 0; ky < ny; ky++) {
    for (let kx = 0; kx < nx; kx++) {
      const cd = lay(cx0 + kx, cy0 + ky), tc = TOPO ? TOPO.terrain(cx0 + kx, cy0 + ky) : null;
      chunkCount++;
      propCount += cd.props.length;
      for (const p of cd.props) {
        props.push(p);
        if (TREE_NAMES.has(p.n)) allTrees.push(p);
      }
      for (const p of cd.places) places.set(p.key, p);
      for (const L of cd.landmarks) landmarks.set(`${L.i},${L.j}`, L);
      const m = MARGIN / CELL;
      for (let j = 0; j < P; j++) {
        for (let i = 0; i < P; i++) {
          const c = (j + m) * GN + i + m, px = kx * P + i, py = ky * P + j, b = bayer(px, py);
          const x = (cx0 + kx) * CHUNK + (i + 0.5) * CELL, y = (cy0 + ky) * CHUNK + (j + 0.5) * CELL;
          const z = cd.cursedF[c] > 0.5 + b * 0.5 ? 'cursed' : cd.pineF[c] > 0.5 + b * 0.5 ? 'pine' : 'oak';
          const t2 = fbm(x / 110, y / 110, SEED, 2) * 0.6 + 0.35 - cd.groveF[c] * 0.3 + cd.clearF[c] * 0.15 + b * 0.1;
          let col = GROUND.zones[ZONE[z]][clamp(Math.floor(t2 * 5), 0, 4)];
          if (cd.dist[c] < 0.5 + b * 4) col = GROUND.road[cd.dist[c] < -5 ? 4 : 3];
          if (tc && tc.edge) {
            // The quilt: its lanes, each crop field in its flowers' middle tone, the headlands, the
            // orchards and the hay in their own.
            const e = sampleField(tc, tc.edge, x, y, 127), bl = sampleField(tc, tc.bloom, x, y, -127);
            const p = tc.plots[tc.plot[clamp(Math.round((y - tc.y0) / 4), 0, TN - 1) * TN + clamp(Math.round((x - tc.x0) / 4), 0, TN - 1)]];
            if (e < 0) col = TT.lane.crown[0];
            else if (p.kind === 'crop') {
              const tu = LOOK.topology.tulips, bed = (((p.bedStart + Math.floor((p.axis ? x - p.left.X0 : y - p.top.base) / 32)) % tu.length) + tu.length) % tu.length;
              col = bl > 0 ? TT.crops[p.crop === 'tulips' ? tu[bed] : p.crop].bloom[1] : TT.headland[1];
            }
            else col = p.kind === 'orchard' ? TT.orchard.mown[b > 0 ? 1 : 0] : TT.hay[1];
          } else if (tc && tc.any) {
            const o = sampleField(tc, tc.open, x, y, 127), pt = sampleField(tc, tc.patch, x, y, -127), dk = sampleField(tc, tc.deck, x, y, -127);
            if (dk > 0) col = H('#8a5a3a');
            else if (o < 0 && tc.blocked === SURFACE.GAP) col = TOPO.variant === 'lava' ? (o > -6 ? TT.lava.crust[1] : TT.lava.ramp[clamp(Math.floor(1.5 + b * 2), 0, 3)]) : o > -6 ? TT.cliff[1] : TT.void[0];
            else if (o < 0) col = tc.pools.length && tc.pools.some((q) => Math.hypot(q.x - x, q.y - y) < q.ext + 8) ? TT.water[1] : o > -5 ? TT.foot : TT.rock[clamp(Math.floor(-o / 40 + 1 + b), 0, 3)];
            else if (pt > 0) col = TT.quicksand ? TT.quicksand[1] : TT.ice[1];
          }
          buf.d[py * W + px] = col;
        }
      }
    }
  }
  const ox = cx0 * CHUNK, oy = cy0 * CHUNK;
  const dot = (x, y, r, col, ink) => {
    const cx = (x - ox) / CELL, cy = (y - oy) / CELL;
    for (let j = Math.floor(cy - r - 1); j <= Math.ceil(cy + r + 1); j++) {
      for (let i = Math.floor(cx - r - 1); i <= Math.ceil(cx + r + 1); i++) {
        if (i < 0 || j < 0 || i >= W || j >= HH) continue;
        const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cy);
        if (d <= r) buf.d[j * W + i] = col;
        else if (ink && d <= r + 0.8) buf.d[j * W + i] = ink;
      }
    }
  };
  const CANOPY = { oak: H('#3e8948'), pine: H('#265c42'), dead: H('#6d5d58') };
  props.sort((a, b) => a.y - b.y);
  for (const p of props) {
    if (p.n.startsWith('oak')) dot(p.x, p.y - 16, 2.1, CANOPY.oak, H('#193c3e'));
    else if (p.n.startsWith('pine')) dot(p.x, p.y - 16, 1.7, CANOPY.pine, H('#122a24'));
    else if (p.n.startsWith('dead')) dot(p.x, p.y - 12, 1.4, CANOPY.dead, H('#262b44'));
    else if (p.n.startsWith('bush')) dot(p.x, p.y - 4, 0.9, H('#4a7d4e'));
    else if (p.n.startsWith('rock') || p.n === 'rubble') dot(p.x, p.y - 3, 0.7, H('#8b9bb4'));
    else if (p.n.startsWith('grave') || p.n.includes('pillar')) dot(p.x, p.y - 4, 0.8, H('#c0cbdc'));
    else if (p.n === 'menhir') dot(p.x, p.y - 4, 0.9, H('#2ce8f5'));
    else if (p.n === 'campfire' || p.n === 'lantern') dot(p.x, p.y - 4, 1, H('#feae34'));
    else if (p.n.includes('spire')) dot(p.x, p.y - 6, 1, H('#3a2a20'));
    else if (p.n.startsWith('hell_post')) dot(p.x, p.y - 2, 0.6, H('#e8d8b0'));
  }
  const COL = { fury: '#e43b44', haste: '#2ce8f5', fortune: '#feae34', wisdom: '#c49bd9', protection: '#63c74d' };
  for (const p of places.values()) {
    if (p.kind === 'start') {
      dot(p.x, p.y, 6, H('#f77622'), H('#ffffff'));
      drawText(buf, 'start', Math.round((p.x - ox) / CELL) + 10, Math.round((p.y - oy) / CELL) - 4, H('#ffffff'));
    } else if (p.type) {
      dot(p.x, p.y, 5, H(COL[p.type]), H('#ffffff'));
      dot(p.x, p.y, 2, H('#ffffff'));
      drawText(buf, p.type, Math.round((p.x - ox) / CELL) + 8, Math.round((p.y - oy) / CELL) - 3, H(COL[p.type]));
    }
    if (TOPO && p.crypt) {
      const d = p.crypt;
      dot(d.x, d.y - 8, 4, H('#181425'), H('#feae34'));
      drawText(buf, d.face === 'cliff' ? 'cave' : d.face === 'igloo' ? 'igloo' : 'crypt', Math.round((d.x - ox) / CELL) + 7, Math.round((d.y - oy) / CELL) - 4, H('#feae34'));
    }
  }
  for (const L of landmarks.values()) if (L.kind !== 'ridge' && L.kind !== 'bridgehead' && !PSEUDO.includes(L.kind)) drawText(buf, L.kind, Math.round((L.x - ox) / CELL) - 14, Math.round((L.y - oy) / CELL) + 9, H('#c0cbdc'));
  writePng(join(OUT, `${name}.png`), buf);
  return { places: [...places.values()], landmarks: [...landmarks.values()] };
}

// ---- 6. Make the pictures, then check the forest really is the same however it is made ----------
console.log(BIOME === 'forest' ? `Endless Darkwood, seed ${SEED}` : `Endless Darkwood in the ${BIOME}'s look, seed ${SEED}`);
// Timing first, while the heap is as small as the game's: each chunk made and painted in turn,
// as the game does one per frame, after the first 40 have warmed the code up. A topology's terrain
// fields and their painting are timed apart too (they are within the ground's time).
const chunkMs = [], groundMs = [], terrainMs = [], tpaintMs = [];
for (let k = 0; k < (VIEWS_ONLY ? 0 : 340); k++) {
  const kx = (k % 20) - 10, ky = Math.floor(k / 20) - 8;
  const t0 = performance.now();
  const cd = lay(kx, ky);
  const t1 = performance.now();
  ground(cd);
  const t2 = performance.now();
  if (k >= 40) {
    chunkMs.push(t1 - t0);
    groundMs.push(t2 - t1);
  }
  if (TOPO) {
    const a = performance.now(), tc = TOPO.terrain(kx, ky), b = performance.now();
    if (tc.any) paintTerrain(tc, makeBuf(CHUNK, CHUNK).d, null, LOOK, TOPO);
    if (k >= 40) {
      terrainMs.push(b - a);
      tpaintMs.push(performance.now() - b);
    }
  }
}
if (!VIEWS_ONLY) lap('timing 300 chunks');
// The overview: a corridor's strip along its axis, else a square round the start.
const ST = TOPO ? TOPO.start() : { x: 0, y: 0 };
const HOME = TOPO?.kind === 'islands' || TOPO?.kind === 'plates' ? (VIEWS_ONLY ? 32 : 48) : VIEWS_ONLY ? 24 : 48;
// A corridor's strip is 12 chunks across, or 4 where its band is under 600 px (the Sunscorch's 300
// since 29 October 2026), so the strip is the band and a little of each range, not rock round a thread.
const ACROSS = TOPO?.kind === 'corridor' && TOPO.T.band < 600 ? 4 : 12;
const [NX, NY] = TOPO?.kind === 'corridor' ? (TOPO.axis === 'x' ? [128, ACROSS] : [ACROSS, 128]) : [HOME, HOME];
// Across a corridor, the strip is centred on the band's middle, not the start beside the road (the
// Frostfell's, narrowed to about 520 px on 29 October 2026, starts 116 px left of it, so a strip round
// the start cut off its right cliff; the Sunscorch's strip is the same either way).
const home = TOPO?.kind === 'corridor' ? renderOverview('overview', TOPO.X(TOPO.U(ST.x, ST.y), 0), TOPO.Y(TOPO.U(ST.x, ST.y), 0), NX, NY) : renderOverview('overview', ST.x, ST.y, NX, NY);
lap(`overview round the start (${NX}x${NY} chunks)`);
// About 120,000 px from the start: along a corridor, or a crossroads (an island) far off.
const FAR = TOPO?.kind === 'corridor' ? (TOPO.axis === 'x' ? { x: 120000, y: 0 } : { x: 0, y: 120000 }) : { x: 67 * D, y: 47 * D };
const far = VIEWS_ONLY ? null : TOPO?.kind === 'corridor' ? renderOverview('overview-far', FAR.x, FAR.y, TOPO.axis === 'x' ? 24 : ACROSS, TOPO.axis === 'x' ? ACROSS : 24) : renderOverview('overview-far', FAR.x, FAR.y, 24);
if (!VIEWS_ONLY) lap(`overview far away`);

let bend = null;
if (TOPO) {
  // A topology's views: its start, its first crypt, its nearest patch (and pond), a shrine, the road's
  // sharpest bend, its landmarks, its edges; the islands' nearest bridge, isthmus and broad joining.
  const T = TOPO, byNear = (a, b) => Math.hypot(a.x - ST.x, a.y - ST.y) - Math.hypot(b.x - ST.x, b.y - ST.y);
  renderView('start', ST.x, ST.y - 10, ST);
  const crypt = T.cryptsNear(ST.x, ST.y, 9000).filter((c) => c.key !== '0,0').sort(byNear)[0];
  renderView(crypt.face === 'cliff' ? 'cave' : crypt.face === 'igloo' ? 'igloo' : 'crypt', crypt.x, crypt.y + 10, { x: crypt.x + 3, y: crypt.y + 44 });
  if (T.patchKind) {
    const ps = T.patchesNear(ST.x, ST.y, 6000).sort(byNear), p = ps[0], pond = ps.find((q) => q.rocks);
    renderView(T.patchKind === SURFACE.QUICKSAND ? 'quicksand' : 'ice', p.x, p.y, { x: Math.round(p.x + p.ext + 14), y: Math.round(p.y + 6) });
    if (pond) renderView('pond', pond.x, pond.y);
  }
  const sh = T.shrinesNear(ST.x, ST.y, 6000).sort(byNear)[0];
  renderView('shrine', sh.x, sh.y + 10);
  const lms = home.landmarks.filter((L) => !['ridge', 'bridgehead', 'pond', ...PSEUDO].includes(L.kind)).sort(byNear);
  for (const kind of [...new Set(lms.map((L) => L.kind))].slice(0, 4)) {
    const L = lms.find((q) => q.kind === kind);
    renderView('landmark-' + kind, L.x, L.y + 10);
  }
  if (T.kind === 'corridor') {
    // The sharpest bend of the road within 6,000 px of the start, over 200 px.
    for (let u = -6000; u <= 6000; u += 20) {
      const a1 = Math.atan2(T.road(u) - T.road(u - 100), 100), a2 = Math.atan2(T.road(u + 100) - T.road(u), 100), turn = Math.abs(a2 - a1);
      if (!bend || turn > bend.turn) bend = { turn, x: T.X(u, T.road(u)), y: T.Y(u, T.road(u)) };
    }
    renderView('bend', bend.x, bend.y);
    // Both edges a little way along: the lo face (the top range, the left cliff) and the hi one.
    const u = 1500;
    renderView('edge-lo', T.X(u, T.lo(u) + 120), T.Y(u, T.lo(u) + 120));
    renderView('edge-hi', T.X(u, T.hi(u) - 120), T.Y(u, T.hi(u) - 120));
    const uf = FAR.x + FAR.y;
    renderView('far', T.X(uf, T.road(uf)), T.Y(uf, T.road(uf)));
  } else if (T.kind === 'quilt') {
    // The Bloomvale's quilt (29 October 2026): the nearest orchard, hay field without a landmark,
    // avenue tree and tulip field, a circle sown in a crop field about 800 px out, and a field far off.
    const ps = [];
    for (let k = -8; k <= 8; k++) T.bandPlots(k, -4000, 4000, (p) => ps.push(p));
    ps.sort(byNear);
    const orch = ps.find((p) => p.kind === 'orchard'), hay = ps.find((p) => p.kind === 'hay' && !p.lm), tul = ps.find((p) => p.kind === 'crop' && p.crop === 'tulips');
    if (orch) renderView('orchard', orch.x, orch.y);
    if (hay) renderView('hay', hay.x, hay.y);
    const av = T.features(-3000, -3000, 3000, 3000).landmarks.find((L) => L.kind === 'avenue');
    const tree = av && av.props.filter((q) => Math.hypot(q.x - ST.x, q.y - ST.y) > 300).sort(byNear)[0];
    if (tree) renderView('avenue', tree.x, tree.y);
    if (tul) renderView('tulips', tul.x, tul.y);
    const sp = ps.filter((p) => p.kind === 'crop' && p.key !== 0).sort((a, b) => Math.abs(Math.hypot(a.x, a.y) - 800) - Math.abs(Math.hypot(b.x, b.y) - 800))[0];
    if (sp) {
      const xs = [], ys = [];
      for (let q = 0; q < 40; q++) {
        const a = (q / 40) * TAU, r = 70 * (1 + 0.08 * Math.sin(3 * a + 1) + 0.05 * Math.sin(5 * a));
        xs.push(sp.x + Math.cos(a) * r);
        ys.push(sp.y + Math.sin(a) * r);
      }
      SOWN = { xs, ys, cx: sp.x, cy: sp.y, r: 90 };
      renderView('sown', sp.x, sp.y);
      SOWN = null;
    }
    const fp = T.plotAt(67 * D, 47 * D);
    renderView('far', fp.x, fp.y);
  } else if (T.kind === 'plates') {
    // The Abyss's fault plates (29 October 2026): the nearest walkway, ford and lake, a shattered field
    // (a coarse cell split 3x3) and a node's heart far off.
    const { geoms, polys } = T.near(ST.x - 2500, ST.y - 2500, ST.x + 2500, ST.y + 2500, 0);
    const d = (x, y) => Math.hypot(x - ST.x, y - ST.y), mid = (g) => [g.xs[g.xs.length >> 1], g.ys[g.xs.length >> 1]];
    const walk = T.decksNear(ST.x - 2500, ST.y - 2500, ST.x + 2500, ST.y + 2500).map((B) => [(B.x1 + B.x2) / 2, (B.y1 + B.y2) / 2]).sort((a, b) => d(...a) - d(...b))[0];
    if (walk) renderView('walkway', walk[0], walk[1]);
    const ford = geoms.filter((g) => g.e.crossing === 'ford').map(mid).sort((a, b) => d(...a) - d(...b))[0];
    if (ford) renderView('ford', ford[0], ford[1]);
    const lake = polys.filter((p) => p.kind === 'lake').sort((a, b) => d(a.x, a.y) - d(b.x, b.y))[0];
    if (lake) renderView('lake', lake.x, lake.y);
    let shat = null;
    for (let cj = -10; cj <= 10; cj++) for (let ci = -10; ci <= 10; ci++) for (const S of T.sitesOf(ci, cj)) if (S.n === 3 && (!shat || d(S.x, S.y) < d(shat.x, shat.y))) shat = S;
    if (shat) renderView('shattered', shat.x, shat.y);
    const fh = T.home(FAR.x, FAR.y);
    renderView('far', fh.x, fh.y);
  } else if (T.kind === 'islands') {
    const links = [];
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) for (const d of [0, 1]) if (T.link(i, j, d)) links.push(T.link(i, j, d));
    const mid = (L) => L.pts[(L.mA + L.mB) >> 1];
    links.sort((a, b) => Math.hypot(...mid(a)) - Math.hypot(...mid(b)));
    for (const kind of ['bridge', 'isthmus', 'broad']) {
      const L = links.find((q) => q.kind === kind);
      if (L) renderView(kind, mid(L)[0], mid(L)[1]);
    }
    const I = T.island(20, 13);
    renderView('far', I.x, I.y);
  }
} else {
  const start = place(0, 0);
  renderView('start', start.x, start.y + 14, start.hero);
  const firstShrines = roadsOf(0, 0).map(([a, b, s]) => (a === 0 && b === 0 ? place(a + 1, b + s) : place(a, b)));
  const ne = firstShrines.find((p) => p.x > 0 && p.y < 0) || firstShrines[0];
  renderView('shrine', ne.x, ne.y + 10);
  // The sharpest bend on the roads round the start, away from the crossroads.
  for (const e of cacheSizes().roadList) {
    if (Math.abs(e.xs[0]) > 4 * D || Math.abs(e.ys[0]) > 4 * D) continue;
    for (let k = 60; k < e.xs.length - 60; k += 4) {
      const a1 = Math.atan2(e.ys[k] - e.ys[k - 25], e.xs[k] - e.xs[k - 25]), a2 = Math.atan2(e.ys[k + 25] - e.ys[k], e.xs[k + 25] - e.xs[k]);
      let turn = Math.abs(a2 - a1);
      if (turn > Math.PI) turn = TAU - turn;
      if (!bend || turn > bend.turn) bend = { turn, x: e.xs[k], y: e.ys[k] };
    }
  }
  renderView('bend', bend.x, bend.y);
  const lm = [...home.landmarks].sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y)).find((L) => L.kind === 'circle') || home.landmarks[0];
  renderView('landmark', lm.x, lm.y + 10);
  const farNode = place(67, 47);
  renderView('far', farNode.x, farNode.y + 10);
}
lap('game-scale views');
if (VIEWS_ONLY) {
  lap('done');
  process.exit(0);
}

// Same forest whatever the order: forget everything, then rebuild chunks in another order.
const probe = [];
const pr = mulberry32(99);
for (let k = 0; k < 120; k++) probe.push(TOPO?.kind === 'corridor' ? (TOPO.axis === 'x' ? [pr.int(-60, 59), pr.int(-5, 4)] : [pr.int(-5, 4), pr.int(-60, 59)]) : [pr.int(-24, 23), pr.int(-24, 23)]);
for (let k = 0; k < 40; k++) probe.push([Math.floor(FAR.x / CHUNK) + pr.int(-12, 11), Math.floor(FAR.y / CHUNK) + pr.int(-12, 11)]);
// A topology's terrain fields too, by an FNV hash of their numbers.
const fieldHash = (tc) => {
  let h = 2166136261;
  for (const f of [tc.open, tc.patch, tc.deck]) {
    if (!f) {
      h = Math.imul(h ^ 7, 16777619);
      continue;
    }
    const u = new Uint32Array(f.buffer, f.byteOffset, f.length);
    for (let i = 0; i < u.length; i++) h = Math.imul(h ^ u[i], 16777619);
  }
  return (h >>> 0).toString(16);
};
const snap = (list) => list.map(([x, y]) => JSON.stringify(lay(x, y), (k, v) => (k === 'props' || k === 'shrines' || k === '' || /^\d+$/.test(k) || typeof v !== 'object' ? v : undefined)) + (TOPO ? fieldHash(TOPO.terrain(x, y)) : '')).join('\n');
const before = snap(probe);
const cached = cacheSizes();
let roadBytes = 0;
for (const e of cached.roadList) roadBytes += e.xs.length * (8 + 8 + 4 + 1);
setWorld(); // forgets every road and place it has worked out
TOPO = newTopo(); // and the topology's every segment, island, joining and patch
const after = snap([...probe].reverse()).split('\n').reverse().join('\n');
const sameOrder = before === after;
// No two trees closer than the smallest spacing, seams included.
let minGap = Infinity, tooClose = 0;
const tg = new Map();
for (const t of allTrees) {
  const k = `${Math.floor(t.x / 48)},${Math.floor(t.y / 48)}`;
  if (!tg.has(k)) tg.set(k, []);
  tg.get(k).push(t);
}
for (const t of allTrees) {
  const i = Math.floor(t.x / 48), j = Math.floor(t.y / 48);
  for (let jj = j - 1; jj <= j + 1; jj++) {
    for (let ii = i - 1; ii <= i + 1; ii++) {
      for (const q of tg.get(`${ii},${jj}`) || []) {
        if (q === t) continue;
        const d = Math.hypot(q.x - t.x, q.y - t.y);
        minGap = Math.min(minGap, d);
        if (d < TREE_GAP - 4 - 1.5) tooClose++;
      }
    }
  }
}
lap('checks');

// ---- 7. Report --------------------------------------------------------------------------------
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
// The quilt's shares of the ground over 24 x 24 chunks round the start, every 8 px: flowers, lanes, the
// headlands, orchards and hay.
function quiltShares() {
  const n = { crop: 0, lane: 0, head: 0, orchard: 0, hay: 0 };
  let all = 0;
  for (let cy = -12; cy < 12; cy++) {
    for (let cx = -12; cx < 12; cx++) {
      const tc = TOPO.terrain(cx, cy);
      for (let j = 0; j < TN - 1; j += 2) {
        for (let i = 0; i < TN - 1; i += 2) {
          const c = j * TN + i, p = tc.plots[tc.plot[c]];
          all++;
          if (tc.edge[c] < 0) n.lane++;
          else if (p.kind !== 'crop') n[p.kind]++;
          else if (tc.bloom[c] > 0) n.crop++;
          else n.head++;
        }
      }
    }
  }
  const f = (v) => `${((100 * v) / all).toFixed(1)}%`;
  return `flowers ${f(n.crop)}, lanes ${f(n.lane)}, headlands and cuts ${f(n.head)}, orchards ${f(n.orchard)}, hay ${f(n.hay)}`;
}
const pct = (a, q) => [...a].sort((x, y) => x - y)[Math.floor(q * (a.length - 1))];
const kb = (b) => `${(b / 1024).toFixed(1)} KB`;
if (TOPO) {
  const T = TOPO, from = (c) => Math.round(Math.hypot(c.x - ST.x, c.y - ST.y));
  const cr = T.cryptsNear(ST.x, ST.y, 30000).filter((c) => c.key !== '0,0').map(from).sort((a, b) => a - b);
  const sh = T.shrinesNear(ST.x, ST.y, 12000).map(from).sort((a, b) => a - b);
  const ms = (a) => `${pct(a, 0.5).toFixed(2)} ms median, ${pct(a, 0.9).toFixed(2)} ms at the 90th percentile, ${Math.max(...a).toFixed(2)} ms at most`;
  console.log(`
${T.kind === 'corridor' ? `A corridor along ${T.axis}` : T.kind === 'quilt' ? `A quilt of fields ${T.T.col} x ${T.T.band} px, ${quiltShares()}` : T.kind === 'plates' ? `Fault plates over ${T.variant}` : `Islands over ${T.variant}`}; the start at ${ST.x}, ${ST.y}
Crypts from the start: ${cr.slice(0, 6).join(', ')} px (the nearest two ${cr.slice(0, 2).map((d) => Math.round(d / SPEED)).join(' and ')} s of walking at ${SPEED} px/s)
Shrines from the start: ${sh.slice(0, 6).join(', ')} px${T.kind === 'corridor' ? `
Sharpest bend near the start ${Math.round((bend.turn * 180) / Math.PI)}° over 200 px; ${T.patchesNear(ST.x, ST.y, 50000).length} patches within 50,000 px` : ''}
Chunks made: ${chunkCount}, ${(propCount / chunkCount).toFixed(1)} props and ${(allTrees.length / chunkCount).toFixed(1)} trees each on average
Time per chunk, fields and props: ${ms(chunkMs)}
Time per chunk, ground pixels:    ${ms(groundMs)}
Time per chunk, terrain fields:   ${ms(terrainMs)}
Time per chunk, terrain painted:  ${ms(tpaintMs)}

Same ground in any order: ${sameOrder ? `yes, ${probe.length} chunks (props and terrain fields) rebuilt from nothing in reverse order match exactly` : 'NO, the chunks differ'}
Trees along seams: closest pair ${minGap.toFixed(1)} px apart, ${tooClose} pairs under the ${TREE_GAP - 4} px spacing`);
  lap('done');
  process.exit(0);
}
const startRoads = roadsOf(0, 0).map(([a, b, s]) => road(a, b, s));
const allPlaces = [...home.places, ...far.places].filter((p) => p.kind === 'shrine');
const degree = (p) => roadsOf(p.i, p.j).filter((e) => roadExists(...e)).length;
const fourWay = allPlaces.filter((p) => degree(p) === 4).length;
const lens = [...new Set([...home.places].flatMap((p) => roadsOf(p.i, p.j).filter((e) => roadExists(...e)).map((e) => road(...e))))].map((e) => e.len);
console.log(`
Start: a crossroads with ${startRoads.length} roads, ${startRoads.map((e) => `${Math.round(e.len)} px`).join(', ')} to the next crossroads
Roads: ${Math.round(mean(lens))} px on average (${Math.round(mean(lens) / SPEED)} s of walking), ${Math.round(Math.min(...lens))}-${Math.round(Math.max(...lens))} px; sharpest bend near the start ${Math.round((bend.turn * 180) / Math.PI)}° over 200 px
Crossroads seen: ${allPlaces.length}, ${fourWay} with four roads, ${allPlaces.length - fourWay} with three
Chunks made: ${chunkCount}, ${(propCount / chunkCount).toFixed(1)} props and ${(allTrees.length / chunkCount).toFixed(1)} trees each on average
Time per chunk, fields and props: ${pct(chunkMs, 0.5).toFixed(2)} ms median, ${pct(chunkMs, 0.9).toFixed(2)} ms at the 90th percentile, ${Math.max(...chunkMs).toFixed(2)} ms at most
Time per chunk, ground pixels:    ${pct(groundMs, 0.5).toFixed(2)} ms median, ${pct(groundMs, 0.9).toFixed(2)} ms at the 90th percentile, ${Math.max(...groundMs).toFixed(2)} ms at most
The hero crosses a chunk every ${(CHUNK / SPEED).toFixed(1)} s

Same forest in any order: ${sameOrder ? `yes, ${probe.length} chunks rebuilt from nothing in reverse order match exactly` : 'NO, the chunks differ'}
Trees along seams: closest pair ${minGap.toFixed(1)} px apart, ${tooClose} pairs under the ${TREE_GAP - 4} px spacing
Cached while making ${chunkCount} chunks: ${cached.roads} roads (${kb(roadBytes)}), ${cached.places} crossroads, ${cached.landmarks} woods checked for a landmark
Stored: the settings, ${JSON.stringify(DARKWOOD).length} bytes: ${JSON.stringify(DARKWOOD)}`);
lap('done');
