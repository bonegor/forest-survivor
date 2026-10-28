// Bakes Sprite Fusion's pixel-art effects (tools/vfx/src, MIT, Copyright (c) 2026 Hugo Duprez) into
// the game's sprite frames, as the owner asked (28 October 2026): "see what of their effects we can
// use for weapons and bake it in with our approach". Their effects draw each frame in software;
// ours are played as sprites, so they are drawn here once, ahead of time:
//   node tools/vfx/bake.mjs [name ...] [--sheet] [--budget=700000]
// writes public/assets/art/vfx.js (every sprite of tools/vfx/picks.mjs; named ones are baked again
// and the rest kept as they were) and public/assets/art/VFX-CREDITS.md; --sheet also draws every
// frame into tools/out/vfx-sheet.png (git-ignored), on a dark ground.
//
// Each sprite: the effect is made (their unit set to the pick's px), stepped as they run it (a
// 1/60 s update: their spawn rates are a chance an update), and drawn at the times asked into a
// colour and a light buffer the size of the pick's box. Then:
//  - colour: what is under 15% opaque is left out, what is under 60% dithered (a Bayer pattern,
//    as their own dots), the rest opaque; a colour not in our palette (a blend, a smoke's mix)
//    snapped to the nearest that is (redmean). Their ramps are handed ours already (picks.mjs),
//    so most pixels are ours exactly.
//  - light (glow: 'frames'): each pixel's hue snapped to the palette and its strength (theirs times
//    GLOW_K, fading out at the box's edges), at half size (the brightest of each 2x2) in 7 levels
//    dithered between, drawn twice as big in the glow pass, adding light.
//  - all frames cut to the box that holds any of them (even, so a half-size glow mirrors true),
//    the effect's origin (its x = y = 0) recorded as ox, oy from the frame's top left.
// Stored as tools/bake-art.mjs stores sprites (a palette, an index a pixel, base64), run-length
// coded (rle: 1): a byte under 128 is one pixel of that colour; one of 128 or more, a run of
// (byte - 126) pixels, 2 to 129, of the colour in the next byte. js/art/baked.js reads it back.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PAL } from '../../public/js/art/palette.js';
import { hexPack } from '../../public/js/engine/pixels.js';
import { bakedBuffers } from '../../public/js/art/baked.js';
import { PICKS } from './picks.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const OUT = join(ROOT, 'public/assets/art/vfx.js');
const CREDITS = join(ROOT, 'public/assets/art/VFX-CREDITS.md');

const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const named = args.filter((a) => !a.startsWith('--'));
const BUDGET = Number(opt('budget', 700000));

// --------------------------------------------------------------- palette --

const KEYS = Object.keys(PAL);
const PACKED = Object.fromEntries(KEYS.map((k) => [k, hexPack(PAL[k])]));
const RGB = KEYS.map((k) => [PACKED[k] & 255, (PACKED[k] >>> 8) & 255, (PACKED[k] >>> 16) & 255]);
const exact = new Map(KEYS.map((k) => [PACKED[k] & 0xffffff, PACKED[k]]));
const near = new Map();
// The palette colour nearest (r, g, b), packed opaque: redmean, as tools' ramps.mjs judged them.
export function snap(r, g, b) {
  const key = r | (g << 8) | (b << 16);
  const hit = exact.get(key) ?? near.get(key);
  if (hit !== undefined) return hit;
  let best = 0, bd = Infinity;
  for (let i = 0; i < RGB.length; i++) {
    const [R, G, B] = RGB[i], rm = (r + R) / 2, dr = r - R, dg = g - G, db = b - B;
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bd) (bd = d), (best = i);
  }
  const c = PACKED[KEYS[best]];
  near.set(key, c);
  return c;
}

const hex = (c) => '#' + [c & 255, (c >>> 8) & 255, (c >>> 16) & 255].map((v) => v.toString(16).padStart(2, '0')).join('');
// A pick's options with its palette keys made into what the effect takes.
function resolveOpts(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (!v || typeof v !== 'object' || !v.$pal) {
      out[k] = v;
      continue;
    }
    for (const ch of v.$pal) if (!(ch in PACKED)) throw new Error(`no palette key "${ch}" (${v.$pal})`);
    const list = [...v.$pal].map((ch) => PACKED[ch]);
    out[k] = v.as === 'one' ? list[0] : v.as === 'hex' ? list.map(hex) : list;
  }
  return out;
}

// How strong a baked light is against theirs (their light layer is a bloom over a dark stage; ours
// adds to a lit night, whose light map the game's own g.light calls already brighten), unless a
// pick says (glowK).
const GLOW_K = 0.6;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;

// ---------------------------------------------------------------- render --

// The frames of one pick, one seed: [{ color, light }] in its box, at its times (effect seconds).
function render(effect, setUnit, pick, seed) {
  setUnit(pick.px);
  const fx = effect({ ...resolveOpts(pick.opts), x: 0, y: 0, seed });
  const { w, h, ox, oy } = pick.box, step = pick.step ?? 1 / 60;
  const times = pick.times ?? Array.from({ length: pick.n }, (_, k) => (pick.t0 ?? 0) + (k * (pick.speed ?? 1)) / pick.fps);
  const f = { w, h, ox, oy, color: new Uint32Array(w * h), light: new Uint32Array(w * h) };
  const out = [];
  let done = 0;
  for (const t of times) {
    const steps = Math.round(t / step);
    if (steps < done) throw new Error(`${pick.name}: times must rise`);
    for (; done < steps; done++) fx.update(step);
    f.color.fill(0);
    f.light.fill(0);
    fx.draw(f, 'back');
    fx.draw(f, 'front');
    out.push({ color: f.color.slice(), light: f.light.slice() });
  }
  return out;
}

// Colour snapped into the palette (see the head), in place; light into levels (0 none .. 7) and
// palette hues, returned as packed colours with the level as alpha. The critic's two (28 October
// 2026), from the pick: fadeTop, the top N px of the box dissolved in the Bayer pattern (the
// pillar's column runs to the box's edge: it ends in pixels, not cut flat); fadeEdge, the same on
// all four sides over the last N px, its edge row cleared whole (a spray flying on past the box: the
// silver's sparks, the ult's motes; 28 October 2026); keep, its palette keys the only colours kept
// (a trail that fades by darkening, theirs on a dark stage, snaps to near-black streaks: on the
// sand by day, scratches of dirt).
function snapColour(buf, w, h, ox, oy, pick = {}) {
  const keepSet = pick.keep ? new Set([...pick.keep].map((k) => PACKED[k])) : null, N = pick.fadeTop || 0, E = pick.fadeEdge || 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, c = buf[i], a = (c >>> 24) / 255, e = E ? Math.min(x, y, w - 1 - x, h - 1 - y) : E;
      if (a < 0.15 || (a < 0.6 && a <= bayer(x + ox, y + oy)) || (y < N && (y + 0.5) / N <= bayer(x + ox, y + oy)) || (e < E && e / E <= bayer(x + ox, y + oy))) {
        buf[i] = 0;
        continue;
      }
      buf[i] = snap(c & 255, (c >>> 8) & 255, (c >>> 16) & 255);
      if (keepSet && !keepSet.has(buf[i])) buf[i] = 0;
    }
  }
}
// Light: each pixel's strength (alpha, 0..255: its brightest channel, times the pick's glowK, and
// fading to nothing over the last EDGE px of the box, so a wide glow is never cut off square) and
// its hue in the palette. Levels come later, at half size (levels).
const EDGE = 12;
function lightField(buf, w, h, K) {
  const out = new Uint32Array(buf.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, c = buf[i], r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255, m = Math.max(r, g, b);
      if (!m) continue;
      const e = Math.min(1, Math.min(x + 0.5, y + 0.5, w - x - 0.5, h - y - 0.5) / EDGE);
      const s = Math.min(1, (m / 255) * K * e * e * (3 - 2 * e));
      if (s * 7 < 0.25) continue;
      const k = 255 / m, hue = snap(Math.round(r * k), Math.round(g * k), Math.round(b * k)) & 0xffffff;
      out[i] = ((Math.round(s * 255) << 24) | hue) >>> 0;
    }
  }
  return out;
}
// A light field (half size) in 7 levels, dithered between them (a Bayer pattern, steady from frame
// to frame) so a soft glow fades in pixels, not in rings; the level its alpha.
function levels(b) {
  const out = new Uint32Array(b.d.length);
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const c = b.d[y * b.w + x], level = Math.min(7, Math.floor(((c >>> 24) / 255) * 7 + bayer(x, y)));
      if (level > 0) out[y * b.w + x] = ((Math.round((level / 7) * 255) << 24) | (c & 0xffffff)) >>> 0;
    }
  }
  return { ...b, d: out };
}

const crop = (buf, w, x0, y0, cw, ch) => {
  const out = new Uint32Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) out[y * cw + x] = buf[(y + y0) * w + x + x0];
  return out;
};
// Half size, keeping each 2x2's brightest (by its level, then by its colour's sum).
function half(buf, w, h) {
  const hw = w >> 1, hh = h >> 1, out = new Uint32Array(hw * hh);
  const lum = (c) => (c >>> 24) * 1024 + (c & 255) + ((c >>> 8) & 255) + ((c >>> 16) & 255);
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < hw; x++) {
      let best = 0;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const c = buf[(2 * y + dy) * w + 2 * x + dx];
        if (lum(c) > lum(best)) best = c;
      }
      out[y * hw + x] = best;
    }
  }
  return { w: hw, h: hh, d: out };
}

// --------------------------------------------------------------- encode --

export function encode(frames) {
  const palette = [0], index = new Map([[0, 0]]);
  for (const d of frames) for (const c of d) if (!index.has(c)) (index.set(c, palette.length), palette.push(c));
  if (palette.length > 128) throw new Error(`${palette.length} colours: the run-length code holds 128`);
  const data = frames.map((d) => {
    const bytes = [];
    for (let i = 0; i < d.length;) {
      const v = index.get(d[i]);
      let n = 1;
      while (i + n < d.length && n < 129 && d[i + n] === d[i]) n++;
      if (n === 1) bytes.push(v);
      else bytes.push(126 + n, v);
      i += n;
    }
    return Buffer.from(bytes).toString('base64');
  });
  return { palette, frames: data };
}

// ----------------------------------------------------------------- bake --

async function bake(pick) {
  const { default: effect, setUnit } = await import(pathToFileURL(join(HERE, 'src', `${pick.src}.mjs`)).href);
  const { w, h, ox, oy } = pick.box;
  const seeds = pick.seeds ?? [1];
  const all = seeds.flatMap((s) => render(effect, setUnit, pick, s));
  const glow = pick.glow === 'frames';
  for (const f of all) {
    snapColour(f.color, w, h, ox, oy, pick);
    f.lit = glow ? lightField(f.light, w, h, pick.glowK ?? GLOW_K) : null;
  }
  // Art on the box's edge was cut flat there (sparks flying past it): the box wants widening.
  const edge = (x, y) => all.some((f) => f.color[y * w + x]);
  const cut = [['left', (k) => edge(0, k), h], ['right', (k) => edge(w - 1, k), h], ['top', (k) => edge(k, 0), w], ['bottom', (k) => edge(k, h - 1), w]]
    .filter(([side, at, n]) => !(side === 'top' && pick.fadeTop) && Array.from({ length: n }, (_, k) => k).some(at)).map(([side]) => side);
  if (cut.length) console.warn(`${pick.name}: art reaches the box's ${cut.join(', ')} edge, cut flat there: widen its box`);
  // The box holding every frame's art (and light), a pixel to spare, even sized.
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (const f of all) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!f.color[i] && !(f.lit && f.lit[i])) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error(`${pick.name}: nothing drawn`);
  x0 = Math.max(0, x0 - 1);
  y0 = Math.max(0, y0 - 1);
  x1 = Math.min(w - 1, x1 + 1);
  y1 = Math.min(h - 1, y1 + 1);
  // centre: the origin in the middle (a frame turned about its centre, Frame.rotated: the Whirl's).
  if (pick.centre) {
    const ex = Math.max(-ox - x0, x1 + 1 + ox), ey = Math.max(-oy - y0, y1 + 1 + oy);
    (x0 = -ox - ex), (x1 = -ox + ex - 1), (y0 = -oy - ey), (y1 = -oy + ey - 1);
    if (x0 < 0 || y0 < 0 || x1 >= w || y1 >= h) throw new Error(`${pick.name}: no centred box inside ${w}x${h}`);
  }
  let cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  if (cw & 1) {
    if (x0 + cw >= w) x0--;
    cw++;
  }
  if (ch & 1) {
    if (y0 + ch >= h) y0--;
    ch++;
  }
  if (x0 < 0 || y0 < 0) throw new Error(`${pick.name}: no even box inside ${w}x${h}`);
  const colour = all.map((f) => crop(f.color, w, x0, y0, cw, ch));
  const out = {
    w: cw, h: ch, ...encode(colour), rle: 1,
    fps: pick.fps, ox: -(ox + x0), oy: -(oy + y0),
    ...(seeds.length > 1 ? { vn: all.length / seeds.length } : {}),
    ...(pick.em ? { em: pick.em } : {}),
    ...(pick.loop ? { loop: true } : {}),
    ...(pick.mirror ? { mirror: true } : {}),
    ...(pick.additive ? { additive: true } : {}),
  };
  let halves = null;
  if (glow) {
    halves = all.map((f) => levels(half(crop(f.lit, w, x0, y0, cw, ch), cw, ch)));
    out.glow = { w: halves[0].w, h: halves[0].h, scale: 2, ...encode(halves.map((b) => b.d)), rle: 1 };
  }
  // Read back as the game reads it (js/art/baked.js): every pixel as baked, or nothing is written.
  const same = (data, frames) => bakedBuffers(data).every((b, k) => b.d.length === frames[k].length && b.d.every((c, i) => c === frames[k][i]));
  if (!same(out, colour) || (halves && !same(out.glow, halves.map((b) => b.d)))) throw new Error(`${pick.name}: the run-length code doesn't read back`);
  return { out, colour, frames: all.length };
}

// ------------------------------------------------------------------ main --

const old = existsSync(OUT) ? (await import(pathToFileURL(OUT).href + `?t=${Date.now()}`)).default : {};
const lines = [], sprites = {}, sheet = [];
let total = 0;
for (const pick of PICKS) {
  if (named.length && !named.includes(pick.name) && old[pick.name]) {
    sprites[pick.name] = old[pick.name];
  } else {
    const t = performance.now();
    const { out, colour } = await bake(pick);
    sprites[pick.name] = out;
    sheet.push({ name: pick.name, w: out.w, h: out.h, colour });
    console.log(`${pick.name.padEnd(18)} ${String(out.frames.length).padStart(2)} x ${out.w}x${out.h}${out.glow ? ` + glow ${out.glow.w}x${out.glow.h}` : ''}, ${out.palette.length} colours, ${JSON.stringify(out).length} bytes (${Math.round(performance.now() - t)} ms)`);
  }
  const s = sprites[pick.name];
  total += JSON.stringify(s).length;
  lines.push(`//   ${pick.name}: ${s.frames.length} frame(s) of ${s.w}x${s.h}, ${s.palette.length - 1} colours${s.glow ? `, glow ${s.glow.w}x${s.glow.h}` : ''}, from tools/vfx/src/${pick.src}.mjs (Sprite Fusion, MIT)`);
}
const head = [
  '// Baked by tools/vfx/bake.mjs from tools/vfx/picks.mjs: Sprite Fusion\'s pixel-art effects (MIT,',
  '// Copyright (c) 2026 Hugo Duprez; VFX-CREDITS.md here), recoloured to our palette, retimed, resized.',
  '// Read by js/game/fxart.js (vfxBurst); frames run-length coded (rle: 1, js/art/baked.js).',
  ...lines,
];
const text = `${head.join('\n')}\nexport default ${JSON.stringify(sprites)};\n`;
console.log(`vfx.js: ${Object.keys(sprites).length} sprites, ${text.length} bytes (budget ${BUDGET})`);
if (text.length > BUDGET) {
  console.error(`over the budget by ${text.length - BUDGET} bytes: nothing written. Cut (vfx-plan): the chops, a second reach, a second seed, fps.`);
  process.exit(1);
}
writeFileSync(OUT, text);

// The credits, with the picks and the licence.
const uses = new Map();
for (const p of PICKS) uses.set(p.src, [...new Set([...(uses.get(p.src) || []), p.for])]);
const licence = readFileSync(join(HERE, 'LICENSE'), 'utf8').split('\n\nThe effects in src/')[0].trim();
writeFileSync(CREDITS, `# Weapon effects (vfx.js)

Weapon effects baked from Sprite Fusion's pixel-art VFX
(<https://www.spritefusion.com/pixel-art-vfx>), MIT License, Copyright (c) 2026 Hugo Duprez:
recoloured to the game's palette, retimed, resized. The effects were ported from TypeScript to
plain JavaScript (\`tools/vfx/src/\`, by \`tools/vfx/port.mjs\`, our edits marked "FS") and drawn
ahead of time into the sprite frames of \`vfx.js\` by \`tools/vfx/bake.mjs\`, from the list in
\`tools/vfx/picks.mjs\`.

| Effect | For |
| --- | --- |
${[...uses].map(([src, f]) => `| ${src} (\`tools/vfx/src/${src}.mjs\`) | ${f.join('; ')} |`).join('\n')}

## Licence

\`\`\`
${licence}
\`\`\`
`);
console.log(`wrote ${OUT} and ${CREDITS}`);

// --sheet: every frame baked now, in rows, three times as big, on the Darkwood's dark green.
if (args.includes('--sheet')) {
  const { writePng } = await import('../png.mjs');
  const pad = 4, rows = sheet.map((s) => ({ ...s, rw: s.colour.length * (s.w + pad) + pad, rh: s.h + pad }));
  const W = Math.max(...rows.map((r) => r.rw)), H = rows.reduce((a, r) => a + r.rh, pad);
  const img = { w: W, h: H, d: new Uint32Array(W * H).fill(hexPack('#1d2a22')) };
  let y = pad;
  for (const r of rows) {
    r.colour.forEach((d, k) => {
      const x0 = pad + k * (r.w + pad);
      for (let j = 0; j < r.h; j++) for (let i = 0; i < r.w; i++) if (d[j * r.w + i]) img.d[(y + j) * W + x0 + i] = d[j * r.w + i];
    });
    y += r.rh;
  }
  const S = 3, big = { w: W * S, h: H * S, d: new Uint32Array(W * H * S * S) };
  for (let j = 0; j < big.h; j++) for (let i = 0; i < big.w; i++) big.d[j * big.w + i] = img.d[Math.floor(j / S) * W + Math.floor(i / S)];
  mkdirSync(join(ROOT, 'tools/out'), { recursive: true });
  writePng(join(ROOT, 'tools/out/vfx-sheet.png'), big);
  console.log('wrote tools/out/vfx-sheet.png');
}
