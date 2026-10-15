// Morvath, the Necromancer: a Blood Lich (remaster-v2).
import { Pic, palette, outline, dropStrays, toBuf, across, bands, stroke, stamped, despeckle, R } from './kit.js';

const PAL = palette({
  k: 'k',
  // robe: blood crimson lit and deep, maroon and near-black shadow; ash for the cowl's rim
  r: 'r', '2': '#aa2a3a', m: 'm', h: 'h', A: 'A', a: 'a',
  // blood: runes and the grimoire's fire, dim to burning
  R: 'R', i: 'i',
  // bone: crown, skull, pauldrons, front panel, staff; its shadows
  z: 'z', T: 'T', Z: 'Z', Q: 'Q', W: 'W',
  // the eyes, his minions' acid green
  l: 'l',
  // grimoire: page shade and leather
  t: 't', b: 'b',
});

// Bone crown over a dark cowl; a gaunt skull face with acid-green eyes in deep sockets, a nose
// hole, bared teeth. Placed at (16, 8). The crown's spikes rise to row 8.
const HEAD = [
  '.....z..z..z.....', //  8
  '.....z..z..z.....', //  9
  '....zTzzTzzTz....', // 10
  '...hTZZZiZZZh....', // 11  crown band with a blood gem
  '..hhaZzZZZZZQ....', // 12
  '.hhaZzZZZZZZQ....', // 13
  '.hhaZWWZzWWZQ....', // 14  sockets
  '.hhaZWlZzWlQQ....', // 15  eyes
  '.hhaQQZZWZZQ.....', // 16  nose hole, sunken cheeks
  '.hhaaQZzZzZQ.....', // 17
  '.hhhaQzzzzzQ.....', // 18  teeth
  '..hhhaQQZQQ......', // 19  jaw
];

// Bone pauldrons over the shoulders, ribbed, on rows 20-23. Placed at (15, 20).
const PAULDRONS = [
  '.zzTTz.......zTTz.',
  'zTzzTZz.....zTzzZQ',
  'TZQZZQZ.....TZQZQQ',
  '.QQ.QQ.......QQ.Q.',
];

// The open grimoire, 8x5: two pages in a shallow V over a blood-red cover, a dark spine, glyphs.
const BOOK = [
  'TT....TT',
  'TTTttTTT',
  'TrrTTrrT',
  'tTTbbTTt',
  'RRRbbRRR',
];

// Rune glyphs for the front panel (2x2 to 3x3): an L, a cross, an eye.
const GLYPHS = [['r.', 'rr'], ['rrr', '.r.'], ['.r.', 'rrr']];

const put = (pic, rows, x, y, opts) => pic.stamp(rows, x, y, opts);

// The robe: shoulders under the pauldrons, a waist at the bone belt (row 27, x 18-29), the hem
// flared to x 13-33 on row 38. A bone-white front panel carries the runes. kick: the hem's front
// corner kicked forward; back: the back corner trailing; lean shifts the top.
function robe(p, by, kick, back, lean, glow) {
  const t = 21 + by;
  const pts = [
    [16.5 + lean, t - 0.5], [29.5 + lean, t - 0.5], [30.5 + lean, t + 3],
    [29.5 + lean * 0.5, 27.5], [33.5 + kick, 38.5], [12.5 - back, 38.5], [17.5 + lean * 0.5, 27.5],
    [15.5 + lean, t + 3],
  ];
  p.poly(pts, '2');
  bands(p, { left: [[2, 'r']], rest: '2', right: [[2, 'm'], [1, 'h']] });
  // Blood-soaked toward the hem: the lower robe darkens a step, and the hem is ragged.
  for (let y = 33; y <= 38; y++) for (let x = 8; x <= 40; x++) {
    const c = p.get(x, y);
    if (!c) continue;
    p.set(x, y, { r: '2', '2': y >= 36 ? 'm' : 'R', m: 'h' }[c] ?? c);
  }
  for (let x = 10; x <= 37; x++) if (p.get(x, 38) && ((x + kick + back) % 4 === 1 || (x + kick + back) % 4 === 2) && p.get(x, 37)) p.set(x, 38, null);
  // Folds 2 px wide in shadow from the waist.
  p.line(21 + lean * 0.5, 29, 18 - back * 0.5, 37, 'm', true);
  p.line(22 + lean * 0.5, 29, 19 - back * 0.5, 37, 'R', true);
  // The bone panel down the front, from the belt to the hem, edged in shadow.
  for (let y = 28; y <= 38; y++) {
    const x = R(25 + lean * 0.5 + ((y - 28) / 10) * (2 + kick * 0.6));
    p.on(x - 1, y, 'Q');
    for (let k = 0; k < 4; k++) p.on(x + k, y, k === 0 ? 'T' : 'Z');
    p.on(x + 4, y, 'Q');
  }
  // Glyphs burning on the panel.
  const glyph = (g, x, y) => g.forEach((row, j) => [...row].forEach((c, i) => c !== '.' && p.on(x + i, y + j, glow ? (c === 'r' ? 'i' : 'r') : c === 'i' ? 'r' : 'R')));
  glyph(GLYPHS[0], R(26 + lean * 0.5), 29);
  glyph(GLYPHS[1], R(26.5 + kick * 0.3), 32);
  glyph(GLYPHS[2], R(27.5 + kick * 0.5), 36);
  // The belt of bone plaques at the waist.
  for (let x = 16; x <= 31; x++) p.on(x + R(lean * 0.5), 27, (x - 17) % 3 === 2 ? 'Q' : 'Z');

}

// The skull staff: a bone shaft from the foot to a horned skull with acid-green eyes.
function staff(p, foot, top) {
  const [fx, fy] = foot, [tx, ty] = top;
  p.line(fx, fy, tx, ty + 3, 'Q');
  p.line(fx - 1, fy, tx - 1, ty + 3, 'Z');
  put(p, ['z...z', 'zzzzZ', 'zllzZ', 'zZzZQ', '.zZQ.'], tx - 2, ty - 2);
}

// The grimoire's fire: a blood flame rising off the pages, or wisps breaking off it.
function flare(p, x, y, n) {
  const shapes = {
    1: ['..i...', '.irR..', '.RirR.'],
    2: ['...i....', '..ir....', '.Rii.r..', '.RirrR..', 'RrirriR.', '.RRiiRR.'],
    3: ['..i...i.', '..ir..rR', '.Rii.Rr.', '.RirrirR', 'RriirrrR', 'RrirriRR', '.RRiiRR.'],
    wisps: ['i....i', 'r..i.r', 'R..r.R', '...R..'],
  };
  const rows = shapes[n];
  p.stamp(rows, x + 4 - Math.floor(rows[0].length / 2), y - rows.length);
}

function lichFrame(q) {
  const pic = new Pic();
  const by = q.bob, br = q.breath || 0, lean = q.lean || 0, hy = q.headDy || 0;
  // Skull staff behind the near hand.
  const st = new Pic();
  staff(st, q.foot, q.skull);
  pic.over(st);
  // Robe, the boot toe under the hem, then the pauldrons and head.
  const rb = new Pic();
  robe(rb, by + br, q.kick || 0, q.back || 0, lean, q.glow);
  pic.over(rb, { sep: 'm', sides: 'l' });
  if (q.toe !== undefined && q.toe !== null) pic.over(stamped(['mh.', 'hhm'], q.toe, 37), { sep: 'k', sides: 'u' });
  const head = new Pic();
  put(head, HEAD, 16 + lean, 8 + by + br + hy);
  pic.over(head);
  pic.over(stamped(PAULDRONS, 15 + lean, 20 + by + br), { sep: 'h', sides: 'd' });
  // Far arm and the open grimoire at chest height.
  const fa = new Pic();
  stroke(fa, 28 + lean, 23 + by + br, q.book[0] + 2, q.book[1] + 4, 1.4, 1.5, across(['2', 'm', 'h']));
  put(fa, BOOK, q.book[0], q.book[1]);
  fa.set(q.book[0] + 3, q.book[1] + 5, 'Z').set(q.book[0] + 4, q.book[1] + 5, 'Q');
  if (q.flare) flare(fa, q.book[0], q.book[1], q.flare);
  pic.over(fa, { sep: 'h', sides: 'lrd' });
  // Near arm gripping the staff.
  const na = new Pic();
  stroke(na, 18 + lean, 23 + by + br, q.hand[0] + 1, q.hand[1], 1.5, 1.8, across(['r', '2', 'm']));
  na.set(R(q.hand[0]), R(q.hand[1]), 'Z').set(R(q.hand[0]), R(q.hand[1]) + 1, 'Q').set(R(q.hand[0]) + 1, R(q.hand[1]), 'z');
  pic.over(na, { sep: 'h', sides: 'rd' });
  despeckle(pic, ['r', '2', 'm', 'h', 'Q', 'Z']);
  return dropStrays(outline(pic, 'k'));
}

// ---------------------------------------------------------------- poses --

const BASE = { bob: 0, breath: 0, lean: 0, headDy: 0, skull: [14, 6], foot: [14, 38], hand: [14, 25], book: [30, 21], glow: false, flare: 0, kick: 0, back: 0 };

// Idle: the breath lifts head, pauldrons and book (frames 3-5); the runes burn brighter as he
// draws breath, a small flame licks off the pages, the robe's back corner and the staff sway.
function idle(i) {
  const br = [0, 0, 0, -1, -1, -1, 0, 0][i];
  return {
    ...BASE, breath: br,
    book: [30, 21 + br], hand: [14, 25 + br], skull: [14 + [0, 0, 0, 0, -1, -1, 0, 0][i], 6], foot: [14, 38],
    glow: i >= 3 && i <= 6, flare: [0, 0, 1, 1, 1, 0, 0, 0][i], back: [0, 0, 0, 1, 2, 2, 1, 0][i],
  };
}

// Walk: the staff planted on the contact frames (0, 4) while he passes it, swung forward on the
// passing frames (2, 6); the hem kicks forward with a boot toe on alternate steps; the head and
// book dip a frame after the body.
function walk(i) {
  const bob = [0, 1, 0, 0, 0, 1, 0, 0][i];
  const lag = [0, 0, 1, 0, 0, 0, 1, 0][i];
  const fx = [15, 13, 17, 16, 15, 13, 17, 16][i];
  const fy = [38, 38, 37, 38, 38, 38, 37, 38][i];
  return {
    ...BASE, bob, headDy: lag,
    foot: [fx, fy], skull: [fx, fy - 32 + lag], hand: [fx, 25 + bob],
    book: [30, 21 + bob + lag], kick: [2, 1, 0, 0, 2, 1, 0, 0][i], toe: [32, 31, null, null, 32, 31, null, null][i],
    back: [0, 1, 2, 1, 0, 1, 2, 1][i], glow: i % 4 < 2,
  };
}

// The cast: raise the skull staff high and lift the grimoire to the chest, leaning back; the
// pages flare; drive the staff down and forward and thrust the book out as it bursts into blood
// flame, the hem flaring (frame 3, the blow); the flame breaks into rising wisps; recover.
function attack(i) {
  const T = [
    { lean: -1, skull: [15, 5], foot: [16, 37], hand: [16, 22], book: [29, 21], glow: true, flare: 1, back: 1 },
    { lean: -2, skull: [15, 4], foot: [16, 36], hand: [16, 21], book: [28, 20], glow: true, flare: 1, back: 2 },
    { lean: -1, skull: [16, 4], foot: [17, 36], hand: [17, 21], book: [29, 20], glow: true, flare: 2, back: 1 },
    { lean: 2, skull: [20, 6], foot: [20, 38], hand: [19, 24], book: [32, 21], glow: true, flare: 3, kick: 2 },
    { lean: 1, skull: [19, 6], foot: [19, 38], hand: [18, 24], book: [31, 21], glow: true, flare: 'wisps', kick: 1 },
    { lean: 0, skull: [15, 6], foot: [15, 38], hand: [15, 25], book: [30, 21], flare: 1 },
  ][i];
  return { ...BASE, ...T };
}

let cache;
export const pics = () => (cache ??= [
  ...Array.from({ length: 8 }, (_, i) => lichFrame(idle(i))),
  ...Array.from({ length: 8 }, (_, i) => lichFrame(walk(i))),
  ...Array.from({ length: 6 }, (_, i) => lichFrame(attack(i))),
]);
const gen = () => pics().map((p) => toBuf(p, PAL));

export default [{
  cls: 'necromancer',
  id: 'remaster-v2',
  name: 'Remaster V2 · Necromancer',
  description: 'Morvath the Blood Lich: a spiked bone crown, a bone-grey skull face with acid-green eyes (the eye colour of his skeletons), bone pauldrons, a crimson robe darkening to a ragged blood-soaked hem with burning glyphs on a bone panel, a skull staff he plants as he walks and an open grimoire. His cast raises the staff and drives it down as the book bursts into blood flame.',
  collection: 'Remasters',
  def: {
    gen, emissive: 'li',
    idle: [0, 1, 2, 3, 4, 5, 6, 7], walk: [8, 9, 10, 11, 12, 13, 14, 15], attack: [16, 17, 18, 19, 20, 21],
    attackFps: 12, motionRate: 10 / 9.8, idleRate: 6 / 1.6,
    anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false,
  },
}];
