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

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ART, resolveFrames } from '../../public/js/art/defs.js';
import { packedPalette, OUTLINE } from '../../public/js/art/palette.js';
import { fromRows, outline, makeBuf, hexPack } from '../../public/js/engine/pixels.js';
import { GLYPHS } from '../../public/js/engine/fontdata.js';
import { fbm, mulberry32, clamp, TAU } from '../../public/js/engine/util.js';
import { DARKWOOD, CHUNK, TREE_NAMES, setWorld, layoutChunk, paintChunk, place, road, roadsOf, roadExists, cacheSizes } from '../../public/js/game/darkwood.js';
import { BIOMES, biomeProp } from '../../public/js/game/biomes.js';
import { LIGHT_COLORS } from '../../public/js/game/lighting.js';
import { writePng } from '../png.mjs';

const arg = (k, d) => {
  const a = process.argv.find((s) => s.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const BIOME = arg('biome', 'forest'), LOOK = BIOMES[BIOME], VIEWS_ONLY = process.argv.includes('--views-only');
if (!LOOK) throw new Error(`no look '${BIOME}': ${Object.keys(BIOMES).join(', ')}`);
// The look's own world: its map's seed (the Darkwood's 1).
const WORLD = BIOME === 'forest' ? DARKWOOD.seed : Object.values((await import('../../public/js/data/maps.js')).MAPS).find((m) => m.look === BIOME)?.seed ?? DARKWOOD.seed;
setWorld({ seed: Number(arg('seed', WORLD)), trees: Number(arg('trees', DARKWOOD.trees)) });
const SEED = DARKWOOD.seed, D = DARKWOOD.spacing;
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
  const def = ART[name] || FLORA[name];
  if (!def) return (sprites[name] = null); // not drawn yet: the game leaves it out too
  const raw = resolveFrames(def)[0];
  let b = Array.isArray(raw) ? fromRows(raw, pal) : raw;
  const thin = def.thin ? new Set([...def.thin].map((ch) => pal[ch])) : null;
  if (def.outline !== false) b = outline(b, OUTLINE, false, thin);
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
// A chunk's ground as the look paints it, and its cracks' glow if they glow (buf.glow).
const ground = (cd) => {
  const buf = makeBuf(CHUNK, CHUNK);
  cd.ground = GROUND;
  if (GROUND.cracks) buf.glow = new Uint32Array(CHUNK * CHUNK);
  paintChunk(cd, buf.d, buf.glow || null);
  return buf;
};

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
  const buf = makeBuf(w, h), props = [], L = [], glow = GROUND.cracks ? new Uint32Array(w * h) : null;
  // Chunks a little beyond the screen too, for the trees that lean in and the lights that reach in.
  for (let ky = Math.floor((y0 - 120) / CHUNK); ky <= Math.floor((y0 + h + 120) / CHUNK); ky++) {
    for (let kx = Math.floor((x0 - 120) / CHUNK); kx <= Math.floor((x0 + w + 120) / CHUNK); kx++) {
      const cd = layoutChunk(kx, ky, null, LOOK.density), sc = chunkScene(cd);
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
  const amb = LOOK.sun || LOOK.night[1][1];
  // The cracks' glow lights the night too (Forest.addLights, lighting.js glow, at the middle of its
  // pulse): averaged into the light map's 2 px texels and spread smoothly over the screen, as the game's.
  const lw = Math.ceil(w / 2) + 1, lh = Math.ceil(h / 2) + 1, GL = glow ? new Float32Array(lw * lh * 3) : null, gk = glow ? GROUND.cracks.alpha : 0;
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
// A square of chunks round a point at one pixel per 8x8 world pixels, daylit for legibility.
// Every chunk is made on its own, as the game would make it, and the picture is pieced together.
const allTrees = [];
let chunkCount = 0, propCount = 0;
function renderOverview(name, wx, wy, n) {
  const cx0 = Math.floor(wx / CHUNK) - n / 2, cy0 = Math.floor(wy / CHUNK) - n / 2, P = CHUNK / CELL, W = n * P;
  const buf = makeBuf(W, W), props = [], places = new Map(), landmarks = new Map();
  for (let ky = 0; ky < n; ky++) {
    for (let kx = 0; kx < n; kx++) {
      const cd = layoutChunk(cx0 + kx, cy0 + ky, null, LOOK.density);
      chunkCount++;
      propCount += cd.props.length;
      for (const p of cd.props) {
        props.push(p);
        if (TREE_NAMES.has(p.n)) allTrees.push(p);
      }
      for (const p of cd.places) places.set(`${p.i},${p.j}`, p);
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
        if (i < 0 || j < 0 || i >= W || j >= W) continue;
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
  }
  const COL = { fury: '#e43b44', haste: '#2ce8f5', fortune: '#feae34', wisdom: '#c49bd9', protection: '#63c74d' };
  for (const p of places.values()) {
    if (p.kind === 'start') {
      dot(p.x, p.y, 6, H('#f77622'), H('#ffffff'));
      drawText(buf, 'start', Math.round((p.x - ox) / CELL) + 10, Math.round((p.y - oy) / CELL) - 4, H('#ffffff'));
    } else {
      dot(p.x, p.y, 5, H(COL[p.type]), H('#ffffff'));
      dot(p.x, p.y, 2, H('#ffffff'));
      drawText(buf, p.type, Math.round((p.x - ox) / CELL) + 8, Math.round((p.y - oy) / CELL) - 3, H(COL[p.type]));
    }
  }
  for (const L of landmarks.values()) drawText(buf, L.kind, Math.round((L.x - ox) / CELL) - 14, Math.round((L.y - oy) / CELL) + 9, H('#c0cbdc'));
  writePng(join(OUT, `${name}.png`), buf);
  return { places: [...places.values()], landmarks: [...landmarks.values()] };
}

// ---- 6. Make the pictures, then check the forest really is the same however it is made ----------
console.log(BIOME === 'forest' ? `Endless Darkwood, seed ${SEED}` : `Endless Darkwood in the ${BIOME}'s look, seed ${SEED}`);
// Timing first, while the heap is as small as the game's: each chunk made and painted in turn,
// as the game does one per frame, after the first 40 have warmed the code up.
const chunkMs = [], groundMs = [];
for (let k = 0; k < (VIEWS_ONLY ? 0 : 340); k++) {
  const t0 = performance.now();
  const cd = layoutChunk((k % 20) - 10, Math.floor(k / 20) - 8, null, LOOK.density);
  const t1 = performance.now();
  ground(cd);
  if (k >= 40) {
    chunkMs.push(t1 - t0);
    groundMs.push(performance.now() - t1);
  }
}
if (!VIEWS_ONLY) lap('timing 300 chunks');
const HOME = VIEWS_ONLY ? 24 : 48;
const home = renderOverview('overview', 0, 0, HOME);
lap(`overview round the start (${HOME}x${HOME} chunks)`);
const FAR = { x: 67 * D, y: 47 * D }; // a crossroads about 120,000 px from the start
const far = VIEWS_ONLY ? null : renderOverview('overview-far', FAR.x, FAR.y, 24);
if (!VIEWS_ONLY) lap(`overview far away (24x24 chunks)`);

const start = place(0, 0);
renderView('start', start.x, start.y + 14, start.hero);
const firstShrines = roadsOf(0, 0).map(([a, b, s]) => (a === 0 && b === 0 ? place(a + 1, b + s) : place(a, b)));
const ne = firstShrines.find((p) => p.x > 0 && p.y < 0) || firstShrines[0];
renderView('shrine', ne.x, ne.y + 10);
// The sharpest bend on the roads round the start, away from the crossroads.
let bend = null;
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
lap('game-scale views');
if (VIEWS_ONLY) {
  lap('done');
  process.exit(0);
}

// Same forest whatever the order: forget everything, then rebuild chunks in another order.
const probe = [];
const pr = mulberry32(99);
for (let k = 0; k < 120; k++) probe.push([pr.int(-24, 23), pr.int(-24, 23)]);
for (let k = 0; k < 40; k++) probe.push([Math.floor(FAR.x / CHUNK) + pr.int(-12, 11), Math.floor(FAR.y / CHUNK) + pr.int(-12, 11)]);
const snap = (list) => list.map(([x, y]) => JSON.stringify(layoutChunk(x, y, null, LOOK.density), (k, v) => (k === 'props' || k === 'shrines' || k === '' || /^\d+$/.test(k) || typeof v !== 'object' ? v : undefined))).join('\n');
const before = snap(probe);
const cached = cacheSizes();
let roadBytes = 0;
for (const e of cached.roadList) roadBytes += e.xs.length * (8 + 8 + 4 + 1);
setWorld(); // forgets every road and place it has worked out
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
const startRoads = roadsOf(0, 0).map(([a, b, s]) => road(a, b, s));
const allPlaces = [...home.places, ...far.places].filter((p) => p.kind === 'shrine');
const degree = (p) => roadsOf(p.i, p.j).filter((e) => roadExists(...e)).length;
const fourWay = allPlaces.filter((p) => degree(p) === 4).length;
const lens = [...new Set([...home.places].flatMap((p) => roadsOf(p.i, p.j).filter((e) => roadExists(...e)).map((e) => road(...e))))].map((e) => e.len);
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const pct = (a, q) => [...a].sort((x, y) => x - y)[Math.floor(q * (a.length - 1))];
const kb = (b) => `${(b / 1024).toFixed(1)} KB`;
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
