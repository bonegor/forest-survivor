// Review boards for sprites in the Sprite Lab's catalogue, as PNGs anyone (or any agent) can
// look at, with what tools/measure.mjs finds:
//   node gms/3001/tools/review.mjs knight/remaster-v1 [archer/remaster-v1 ... | mage/game] [--out=dir]
//     one board each: every frame of idle, walk and attack at 4x on a checker, with the ground
//     line under the feet (anchorY) in red, the knight's 30 px height in cyan and the middle in grey; an onion
//     skin of each cycle (every frame at once: any jitter shows as a ghost); the sprite beside
//     the game's five heroes and the class's other proposals in the same batch, feet on one
//     line; and the same lineup at night, as dark as the game's forest.
//   node gms/3001/tools/review.mjs --team=remaster-v1 [--out=dir]
//     the five classes' sprites with that id together, against the game's own five, by day
//     and by night, standing and mid-walk.
// Boards go to gms/3001/sprites/lab/review/ (not kept in git), with the measurements as JSON.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { measure, verdict } from './measure.mjs';

const LAB = fileURLToPath(new URL('../sprites/lab/', import.meta.url));
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const mod = (f) => import(pathToFileURL(join(ROOT, f)).href);
await mod('tools/headless.mjs');
const { SPR } = await mod('public/js/engine/sprites.js');
const { HEROES } = await mod('public/js/data/heroes.js');
const { readPng, writePng } = await mod('tools/png.mjs');

const args = process.argv.slice(2);
const OUT = args.find((a) => a.startsWith('--out='))?.slice(6) || join(LAB, 'review');
const team = args.find((a) => a.startsWith('--team='))?.slice(7);
const ids = args.filter((a) => !a.startsWith('--'));
const catalog = JSON.parse(readFileSync(join(LAB, 'catalog.json'), 'utf8'));
const CLASSES = ['knight', 'archer', 'mage', 'rogue', 'necromancer'];

// --------------------------------------------------------------- pixels --

const rgba = (hex, a = 255) => {
  const n = parseInt(hex.slice(1), 16);
  return ((a << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0;
};
const canvas = (w, h, bg) => ({ w, h, d: new Uint32Array(w * h).fill(bg ? rgba(bg) : 0) });
const fill = (c, x, y, w, h, col) => {
  for (let j = Math.max(0, y); j < Math.min(c.h, y + h); j++) for (let i = Math.max(0, x); i < Math.min(c.w, x + w); i++) c.d[j * c.w + i] = col;
};
// A frame drawn k times bigger at (x, y), over what is there (alpha blended; a: extra opacity).
function draw(c, buf, x, y, k, a = 1, mul = null) {
  for (let j = 0; j < buf.h; j++) {
    for (let i = 0; i < buf.w; i++) {
      const s = buf.d[j * buf.w + i], sa = ((s >>> 24) / 255) * a;
      if (sa <= 0) continue;
      let r = s & 255, g = (s >>> 8) & 255, b = (s >>> 16) & 255;
      if (mul) [r, g, b] = [r * mul[0], g * mul[1], b * mul[2]];
      for (let v = 0; v < k; v++) {
        for (let u = 0; u < k; u++) {
          const X = x + i * k + u, Y = y + j * k + v;
          if (X < 0 || Y < 0 || X >= c.w || Y >= c.h) continue;
          const o = c.d[Y * c.w + X];
          const or = o & 255, og = (o >>> 8) & 255, ob = (o >>> 16) & 255;
          c.d[Y * c.w + X] = ((255 << 24) | (Math.round(ob + (b - ob) * sa) << 16) | (Math.round(og + (g - og) * sa) << 8) | Math.round(or + (r - or) * sa)) >>> 0;
        }
      }
    }
  }
}

// A 3x5 font for the labels: five rows of three per glyph.
const GLYPHS = Object.fromEntries(Object.entries({
  A: '.#. #.# ### #.# #.#', B: '##. #.# ##. #.# ##.', C: '.## #.. #.. #.. .##', D: '##. #.# #.# #.# ##.', E: '### #.. ##. #.. ###',
  F: '### #.. ##. #.. #..', G: '.## #.. #.# #.# .##', H: '#.# #.# ### #.# #.#', I: '### .#. .#. .#. ###', J: '..# ..# ..# #.# .#.',
  K: '#.# #.# ##. #.# #.#', L: '#.. #.. #.. #.. ###', M: '#.# ### ### #.# #.#', N: '##. #.# #.# #.# #.#', O: '.#. #.# #.# #.# .#.',
  P: '##. #.# ##. #.. #..', Q: '.#. #.# #.# ##. .##', R: '##. #.# ##. #.# #.#', S: '.## #.. .#. ..# ##.', T: '### .#. .#. .#. .#.',
  U: '#.# #.# #.# #.# ###', V: '#.# #.# #.# #.# .#.', W: '#.# #.# ### ### #.#', X: '#.# #.# .#. #.# #.#', Y: '#.# #.# .#. .#. .#.',
  Z: '### ..# .#. #.. ###', 0: '### #.# #.# #.# ###', 1: '.#. ##. .#. .#. ###', 2: '##. ..# .#. #.. ###', 3: '##. ..# .#. ..# ##.',
  4: '#.# #.# ### ..# ..#', 5: '### #.. ##. ..# ##.', 6: '.## #.. ### #.# ###', 7: '### ..# .#. .#. .#.', 8: '### #.# ### #.# ###',
  9: '### #.# ### ..# ##.', '-': '... ... ### ... ...', '.': '... ... ... ... .#.', ':': '... .#. ... .#. ...', '/': '..# ..# .#. #.. #..',
  '(': '.#. #.. #.. #.. .#.', ')': '.#. ..# ..# ..# .#.', ' ': '... ... ... ... ...', '·': '... ... .#. ... ...', '%': '#.# ..# .#. #.. #.#',
  '+': '... .#. ### .#. ...', ',': '... ... ... .#. #..', '|': '.#. .#. .#. .#. .#.', '>': '#.. .#. ..# .#. #..', '=': '... ### ... ### ...',
  "'": '.#. .#. ... ... ...', '!': '.#. .#. .#. ... .#.', '?': '##. ..# .#. ... .#.', x: '... #.# .#. #.# ...', '&': '.#. #.# .#. #.# .##',
}).map(([k, v]) => [k, v.replace(/ /g, '')]));
function text(c, s, x, y, col = '#c0cbdc', k = 1) {
  const p = rgba(col);
  for (const ch of String(s).toUpperCase().replace(/X(?=\d)/g, 'x')) {
    const g = GLYPHS[ch] ?? GLYPHS['?'];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === '#') fill(c, x + i * k, y + j * k, k, k, p);
    x += 4 * k;
  }
  return x;
}
const textW = (s, k = 1) => String(s).length * 4 * k;

// ------------------------------------------------------------- sprites --

// A catalogue entry's frames, cut from its sheet, as the game would have them.
function fromSheet(e) {
  const sheet = readPng(join(LAB, e.sheet));
  const frames = [];
  for (let n = 0; n < e.frames; n++) {
    const buf = { w: e.w, h: e.h, d: new Uint32Array(e.w * e.h) };
    for (let y = 0; y < e.h; y++) for (let x = 0; x < e.w; x++) buf.d[y * e.w + x] = sheet.d[y * sheet.w + n * e.w + x];
    frames.push({ buf, w: e.w, h: e.h });
  }
  return { frames, idle: e.idle || [0], walk: e.walk || null, attack: e.attack || null, anchorY: e.anchorY ?? e.h - 1, name: e.name, id: e.id };
}
const entryOf = (cls, id) => catalog.entries.find((e) => e.cls === cls && e.id === id);
const gameHero = (cls) => {
  const s = SPR[HEROES[cls].sprite];
  return { frames: s.frames.map((f) => ({ buf: f.buf, w: f.w, h: f.h })), idle: s.idle || [0], walk: s.walk, attack: s.attack, anchorY: s.anchorY, name: `${HEROES[cls].name} (game)`, id: 'game' };
};

// Sprites standing in a row on one ground line, k times bigger, each labelled; by night too.
const NIGHT = [0.42, 0.46, 0.66];
function lineup(c, list, x, y, k, night = false, frameOf = (s) => s.idle[0]) {
  const top = 46 * k, ground = y + top;
  fill(c, x - 4, ground, list.reduce((a, s) => a + Math.max(s.frames[0].w * k, textW(s.label) + 4) + 10, 0) + 4, 3 * k, rgba(night ? '#14231a' : '#2f5a3a'));
  // The knight's height, dashed.
  for (let i = x - 4; i < c.w - 8; i += 6) fill(c, i, ground - 30 * k, 3, 1, rgba('#2ce8f5', 140));
  for (const s of list) {
    const f = s.frames[frameOf(s)], w = Math.max(f.w * k, textW(s.label) + 4);
    draw(c, f.buf, x + Math.round((w - f.w * k) / 2), ground - s.anchorY * k, k, 1, night ? NIGHT : null);
    text(c, s.label, x + Math.round((w - textW(s.label)) / 2), ground + 3 * k + 3, night ? '#6c7a96' : '#c0cbdc');
    x += w + 10;
  }
  return ground + 3 * k + 12;
}

function checker(c, x, y, w, h, k) {
  const a = rgba('#2b2935'), b = rgba('#24222d');
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) c.d[(y + j) * c.w + x + i] = ((((i / (k * 4)) | 0) + ((j / (k * 4)) | 0)) & 1 ? a : b);
}

// One sprite's board (e: a catalogue entry, or { cls, id: 'game', ..., spr } for the game's own).
function board(e) {
  const spr = e.spr || fromSheet(e), m = measure(spr), v = verdict(m);
  const k = e.w > 56 ? 3 : 4, cw = e.w * k + 6, ch = e.h * k + 6;
  const rows = ['idle', 'walk', 'attack'].filter((r) => spr[r] && spr[r].length);
  const perRow = Math.max(...rows.map((r) => spr[r].length + (r === 'attack' ? 0 : 1)));
  const others = catalog.entries.filter((o) => o.cls === e.cls && o !== e && o.collection && o.collection === e.collection).map(fromSheet);
  const team = [...CLASSES.map(gameHero), ...others, spr];
  const W = Math.max(700, perRow * (cw + 4) + 24, team.length * 70 + 40);
  const H = 96 + v.notes.length * 13 + rows.length * (ch + 34) + 2 * (46 * 3 + 40) + 40;
  const c = canvas(Math.max(W, textW(v.line, 2) + 30, ...v.notes.map((n) => textW('! ' + n, 2) + 30)), H, '#1b1a22');
  let y = 8;
  text(c, `${e.name}`, 10, y, '#feae34', 3);
  text(c, `lab:${e.cls}/${e.id} · ${e.collection || ''}`, 10, (y += 20), '#8b9bb4', 2);
  text(c, v.line, 10, (y += 14), '#c0cbdc', 2);
  for (const n of v.notes) text(c, '! ' + n, 10, (y += 13), '#f6757a', 2);
  y += 20;
  for (const r of rows) {
    const list = spr[r];
    text(c, `${r} · ${list.length} frame${list.length > 1 ? 's' : ''}${r === 'attack' ? '' : ' + onion skin'}`, 10, y, '#8b9bb4', 2);
    y += 14;
    let x = 10;
    const cells = r === 'attack' ? list.map((i) => [i]) : [...list.map((i) => [i]), list];
    cells.forEach((group, n) => {
      checker(c, x, y, cw, ch, k);
      const ox = x + 3, oy = y + 3;
      for (const i of group) draw(c, spr.frames[i].buf, ox, oy, k, group.length > 1 ? Math.min(1, 1.6 / group.length) : 1);
      fill(c, ox, oy + spr.anchorY * k, e.w * k, 1, rgba('#e43b44'));
      fill(c, ox, oy + (spr.anchorY - 30) * k, e.w * k, 1, rgba('#2ce8f5', 160));
      fill(c, ox + Math.round((e.w * k) / 2), oy, 1, e.h * k, rgba('#5a6988', 120));
      text(c, group.length > 1 ? 'onion' : String(group[0]), x + 2, y + ch + 3, group.length > 1 ? '#feae34' : '#8b9bb4', 2);
      x += cw + 4;
    });
    y += ch + 20;
  }
  for (const s of team) s.label = s === spr ? 'this' : s.id === 'game' ? s.name.replace(/ \(game\)$/, '') : s.id;
  text(c, 'beside the game\'s heroes and this batch, 3x · by day', 10, y, '#8b9bb4', 2);
  y = lineup(c, team, 14, y + 12, 3);
  text(c, 'and at night', 10, y, '#8b9bb4', 2);
  lineup(c, team, 14, y + 12, 3, true);
  return { c, m, v };
}

// A team's board: the five classes in one batch, against the game's own.
function teamBoard(id) {
  const ours = CLASSES.map((cls) => entryOf(cls, id)).filter(Boolean).map(fromSheet);
  if (!ours.length) throw new Error(`no sprites with id ${id}`);
  const game = CLASSES.map(gameHero);
  for (const s of game) s.label = s.name.replace(/ \(game\)$/, '');
  for (const s of ours) s.label = s.name.split('·').pop().trim().slice(0, 18);
  // As wide as the widest row draws (lineup: each sprite or its label, whichever is wider, + 10).
  const span = (list) => list.reduce((a, s) => a + Math.max(s.frames[0].w * 4, textW(s.label) + 4) + 10, 0) + 40;
  const title = `team ${id} against the game's own, 4x: the game's, ${id} standing, mid-walk, at night`;
  const c = canvas(Math.max(span(game), span(ours), textW(title, 2) + 30), 4 * (46 * 4 + 40) + 70, '#1b1a22');
  let y = 8;
  text(c, title, 10, y, '#feae34', 2);
  y = lineup(c, game, 14, y + 24, 4);
  y = lineup(c, ours, 14, y + 4, 4);
  y = lineup(c, ours, 14, y + 4, 4, false, (s) => (s.walk ? s.walk[Math.floor(s.walk.length / 4)] : s.idle[0]));
  lineup(c, ours, 14, y + 4, 4, true);
  return c;
}

mkdirSync(OUT, { recursive: true });
if (team) {
  const file = join(OUT, `team-${team}.png`);
  writePng(file, teamBoard(team));
  console.log(file);
}
for (const id of ids) {
  const [cls, eid] = id.replace(/^lab:/, '').split('/');
  // <class>/game: the sprite the game draws now.
  const own = eid === 'game' && HEROES[cls] ? gameHero(cls) : null;
  const e = own ? { cls, id: 'game', name: `${HEROES[cls].name} (in the game now)`, collection: null, w: own.frames[0].w, h: own.frames[0].h, spr: own } : entryOf(cls, eid);
  if (!e) {
    console.error(`no lab:${cls}/${eid} in the catalogue`);
    process.exitCode = 1;
    continue;
  }
  const { c, m, v } = board(e);
  const file = join(OUT, `${cls}-${eid}.png`);
  writePng(file, c);
  writeFileSync(join(OUT, `${cls}-${eid}.json`), JSON.stringify({ ...m, notes: v.notes }, null, 1));
  console.log(`${file}\n  ${v.line}${v.notes.length ? '\n  ! ' + v.notes.join('\n  ! ') : ''}`);
}
