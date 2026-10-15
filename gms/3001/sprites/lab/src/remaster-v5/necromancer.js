// Morvath, the Necromancer: a Blood Lich (remaster-v5).
import { Pic, palette, outline, dropStrays, toBuf, across, bands, stroke, stamped, despeckle, R, softenNotches } from './kit.js';

export const PAL = palette({
  k: 'k',
  // robe and cowl: near-neutral cool blacks, lit plane to deep fold, at round 4's lightness (L* 22,
  // 15, 10) but chroma C* 6.5, 6.0, 5.4 (round 4's wine tones were 19, 16, 12): black, so the
  // crimson trim pops. None of them is another hero's colour.
  '1': '#38333c', '3': '#28242c', '4': '#1e1b22',
  // crimson, only as accents: the rim of light down his top-left edge, the blood-soaked hem
  // (its tatters' tips in r) and the grimoire's fire (i glows)
  r: 'r', R: 'R', i: 'i',
  // bone: crown, skull, pauldrons, clasps, front panel, staff; its shadows
  z: 'z', T: 'T', Z: 'Z', Q: 'Q', W: 'W',
  // necromancy in his minions' acid green, all of it glowing: the eyes, the runes on the panel,
  // the soul fire his staff blasts
  l: 'l', L: 'L',
});
const ROBE = '134';
// The hem's tatters, one period of 5 px: row 37 holds each point's 3-px body (x: the robe's own
// tone) with blood running down its middle (r), row 38 its 1-px tip (r). The tip sits at the
// middle of its body, so neither of its side outlines lands under the gap's ink.
const HEM = { r37: 'xrx..', r38: '.r...' };

// Bone crown over a black cowl (lit on its outer edge, deep inside); a gaunt skull face with
// acid-green eyes in deep sockets, a nose hole, bared teeth. Placed at (16, 8). The crown's
// spikes rise to row 8.
const HEAD = [
  '.....z..z..z.....', //  8
  '.....z44z44z.....', //  9  the hood's black between the spikes
  '....zTzzTzzTz....', // 10
  '...1TZZZiZZZ4....', // 11  crown band with a blood gem
  '..134zzzzZZZQ....', // 12  the brow, lit from the top-left
  '.134zzzzZZZQQ....', // 13  the brow's lit plane, two rows deep
  '.134z44ZZ44QW....', // 14  sockets
  '.134z4lZZ4lWW....', // 15  eyes; the near cheekbone lit
  '.134zz4ZWZQW.....', // 16  nose hole
  '.1344QZQQQWW.....', // 17  hollow cheeks, the far one in shadow
  '.1334QzzzzW......', // 18  the tooth row
  '..1344QWWW.......', // 19  jaw
];

// Bone pauldrons over the shoulders, on rows 20-24, joined into a bone collar by the clasp at the
// throat, which holds a soul gem (G: it glows, l or L). Placed at (15, 20).
const PAULDRONS = [
  '.zzzzzZZzTzZZzzzz.',
  'zzZZZZQZTGQZzZZZZQ',
  'zZZZZQQ..Q..ZZZZQQ',
  'ZQQQQQQ.....QQQQQQ',
  '.QQ.QQ.......QQ.Q.',
];

// The open grimoire, 8x5: black leather boards with bone corners framing two pale pages in a
// shallow V, a dark gutter between them and glyphs glowing on them (two phases).
const BOOK = [
  ['.zT..Tz.', '4TTz4TT4', '4iiT4iT4', '4TTT4TT4', 'Z444444Z'],
  ['.zT..Tz.', '4TTz4TT4', '4TiT4ii4', '4TTT4TT4', 'Z444444Z'],
];

// Rune glyphs for the front panel: an L, a cross, an eye.
const GLYPHS = [['r.', 'rr'], ['rrr', '.r.'], ['.r.', 'rrr']];

const put = (pic, rows, x, y, opts) => pic.stamp(rows, x, y, opts);

// The robe: shoulders under the pauldrons, a waist at the bone belt (row 27, x 18-29), the hem
// flared to x 13-33 on row 38. Black, lit on the left, deep on the right, with a lit ridge and
// a deep crease for each fold; a bone-white front panel carries the runes. kick: the hem's front
// corner kicked forward; back: the back corner kicked back; lean shifts the top.
function robe(p, by, kick, back, lean, glow) {
  const t = 21 + by;
  const pts = [
    [16.5 + lean, t - 0.5], [29.5 + lean, t - 0.5], [30.5 + lean, t + 3],
    [29.5 + lean * 0.5, 27.5], [33.5 + kick, 38.5], [12.5 - back, 38.5], [17.5 + lean * 0.5, 27.5],
    [15.5 + lean, t + 3],
  ];
  p.poly(pts, '3');
  bands(p, { left: [[3, '1']], rest: '3', right: [[2, '4']] });
  // Folds from the waist: lit ridges beside deep creases.
  p.line(19 + lean * 0.5, 29, 16 - back * 0.6, 37, '1', true);
  p.line(20 + lean * 0.5, 29, 17 - back * 0.6, 37, '4', true);
  p.line(22 + lean * 0.5, 30, 21 - back * 0.3, 37, '1', true);
  p.line(23 + lean * 0.5, 30, 22 - back * 0.3, 37, '4', true);
  // The bone panel down the front, from the belt to the tatters, edged in shadow. One value down
  // from round 4 (its lit edge T, then Z, then Q), so it sits under the skull and the face leads.
  const Lx = R(lean * 0.5);
  for (let y = 28; y <= 36; y++) {
    const x = R(25 + ((y - 28) / 10) * (2 + kick * 0.6)) + Lx;
    p.on(x - 1, y, 'Q');
    for (let k = 0; k < 5; k++) p.on(x + k, y, k === 0 ? 'T' : k === 1 ? 'Z' : 'Q');
    p.on(x + 5, y, 'Q');
  }
  // Runes burning acid green on the panel, in a travelling pulse.
  const glyph = (g, x, y, k) => g.forEach((row, j) => [...row].forEach((c, i) => c !== '.' && p.on(x + i, y + j, ['L', 'l', 'l', 'L'][((glow || 0) + k) % 4])));
  glyph(GLYPHS[0], 26 + Lx, 29, 0);
  glyph(GLYPHS[1], R(27.5 + kick * 0.3) + Lx, 32, 1);
  glyph(GLYPHS[2], R(27.2 + kick * 0.5) + Lx, 35, 2);
  // The blood-soaked hem, cut in V points 2 rows tall: full on row 36, the points' 3-px bodies on
  // row 37 (the robe's own tone, blood running down the middle in r), their 1-px tips on row 38
  // (in r, where it drips). Round 4's R dashes on row 38 are gone. The points shift with the kick.
  const H = HEM, n = H.r37.length;
  for (let x = 6; x <= 42; x++) {
    const ph = (((x + kick + back) % n) + n) % n;
    const a = H.r37[ph], b = H.r38[ph];
    if (p.get(x, 37)) p.set(x, 37, a === '.' ? null : a === 'x' ? p.get(x, 37) : a);
    if (p.get(x, 38)) p.set(x, 38, b === '.' || !p.get(x, 37) ? null : b);
  }
  // The belt of bone plaques at the waist.
  for (let x = 16; x <= 31; x++) p.on(x + R(lean * 0.5), 27, (x - 17) % 3 === 2 ? 'Q' : 'Z');
}

// The skull staff: a bone shaft from the foot to a horned skull with acid-green eyes.
function staff(p, foot, top, eye = 'l') {
  const [fx, fy] = foot, [tx, ty] = top;
  p.line(fx, fy, tx, ty + 3, 'Q');
  p.line(fx - 1, fy, tx - 1, ty + 3, 'Z');
  put(p, ['z...z', 'zzzzZ', 'zEEzZ', 'zzZZQ', '.zZQ.'], tx - 2, ty - 2, { map: { E: eye } });
}
// The staff held at its grip and turned to ang (degrees, -90 straight up): the skull 'up' px out,
// the foot 16 px the other way (never below the ground line).
function staffAt(hand, ang, up = 15) {
  const a = (ang * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
  const skull = [R(hand[0] + dx * up), R(hand[1] + dy * up)];
  let k = 16;
  while (hand[1] - dy * k > 38) k--;
  return { skull, foot: [R(hand[0] - dx * k), R(hand[1] - dy * k)] };
}
// A walking staff held at the hand, its foot at `foot`: the skull 15 px up the line through both.
function staffThrough(hand, foot) {
  const dx = hand[0] - foot[0], dy = hand[1] - foot[1], n = Math.hypot(dx, dy);
  return { foot, skull: [R(hand[0] + (dx / n) * 15), R(hand[1] + (dy / n) * 15)] };
}

// The grimoire's fire: a blood flame rising off the pages, or wisps breaking off it.
function flare(p, x, y, n) {
  const shapes = {
    1: ['..i...', '.irR..', '.RirR.'],
    2: ['...i....', '..ir....', '.Rii.r..', '.RirrR..', 'RrirriR.', '.RRiiRR.'],
    wisps: ['i....i', 'r..i.r', 'R..r.R', '...R..'],
    // embers rising off the pages, in four phases
    e0: ['..i...', '......', '...r..'],
    e1: ['....i.', '..i...', '......'],
    e2: ['.r....', '....i.', '..r...'],
    e3: ['......', '.i..r.', '....i.'],
  };
  const rows = shapes[n];
  p.stamp(rows, x + 4 - Math.floor(rows[0].length / 2), y - rows.length);
}

// The staff's swing as a bone-white smear: the crescent its skull swept around the hand from
// angle `from` to `to` (degrees), thickest at the staff and thinning to its tail.
function smear(p, c, from, to, rOut, rIn) {
  const span = to - from;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const dx = x - c[0], dy = y - c[1], r = Math.hypot(dx, dy);
    if (r > rOut + 0.5 || r < rIn - 1) continue;
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    const dd = (((a - from) % 360) + 360) % 360;
    if (dd > span) continue;
    const t = dd / span;
    const inner = rOut - (rOut - rIn) * Math.pow(t, 0.8);
    if (r < inner || y > 38) continue;
    p.set(x, y, r > rOut - 1.3 ? 'z' : 'Z');
  }
}

// Soul fire out of the staff's skull: a cone of acid-green flame blasting forward (the blow), or
// wisps of it rising (the follow-through). (x, y): the skull's centre.
function soulFire(p, x, y, kind) {
  const shapes = {
    blast: ['...l.L', '.LllL.', 'LlzzlL', 'lzzzl.', 'LlzzlL', '.LllL.', '...l.L'],
    wisps: ['.l...L', 'L.l...', '.L..l.', '..L...'],
  };
  const rows = shapes[kind];
  if (kind === 'blast') p.stamp(rows, x + 3, y - 3);
  else p.stamp(rows, x - 1, y - 8);
}

// Crimson rim light down the cowl's and robe's left silhouette: cloth pixels from the crown band
// down whose left neighbour is clear (or whose top one is, left of the middle), kept only where
// they run on in a line (no lone specks).
// body: the figure's own parts (a staff behind him doesn't shade his edge, so it counts as clear).
function rimTopLeft(pic, top, mid, body, bottom = 35) {
  const marks = [];
  for (let y = top; y <= bottom; y++) for (let x = 0; x < pic.w; x++) {
    const c = pic.get(x, y);
    if (!c || !ROBE.includes(c) || !body.get(x, y) || (body.get(x - 1, y) && (x >= mid || body.get(x, y - 1)))) continue;
    marks.push([x, y]);
  }
  const at = new Set(marks.map(([x, y]) => x + ',' + y));
  for (const [x, y] of marks) if ([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([a, b]) => at.has(x + a + ',' + (y + b)))) pic.set(x, y, 'r');
  return pic;
}

function lichFrame(q) {
  const pic = new Pic();
  const by = q.bob, br = q.breath || 0, lean = q.lean || 0, hy = q.headDy || 0;
  // The smear of the swing, behind everything.
  if (q.smear) {
    const sm = new Pic();
    smear(sm, q.hand, ...q.smear);
    pic.over(sm);
  }
  // Skull staff: behind the body, or (on the blow) in front of it.
  const st = new Pic();
  staff(st, q.foot, q.skull, q.eye || 'l');
  if (!q.front) pic.over(st);
  // Robe, the boot toes under the hem, then the head and pauldrons.
  const rb = new Pic();
  robe(rb, by + br, q.kick || 0, q.back || 0, lean, q.glow);
  pic.over(rb, { sep: '4', sides: 'l' });
  // boots with a cool lit edge (Q) where the toe or heel catches the moon
  if (q.toe !== undefined && q.toe !== null) pic.over(stamped(['Q4.', '443'], q.toe, 37), { sep: 'k', sides: 'u' });
  if (q.heel !== undefined && q.heel !== null) pic.over(stamped(['.QQ', '344'], q.heel, 37), { sep: 'k', sides: 'u' });
  const head = new Pic();
  put(head, HEAD, 16 + lean, 8 + by + br + hy);
  pic.over(head);
  pic.over(stamped(PAULDRONS, 15 + lean, 20 + by + br, { map: { G: q.eye === 'L' ? 'L' : 'l' } }), { sep: '4', sides: 'd' });
  // Far arm and the open grimoire.
  const fa = new Pic();
  stroke(fa, 28 + lean, 23 + by + br, q.book[0] + 2, q.book[1] + 4, 1.4, 1.5, across(['4']));
  put(fa, BOOK[(q.glow || 0) % 2], q.book[0], q.book[1]);
  fa.set(q.book[0] + 3, q.book[1] + 5, 'Z').set(q.book[0] + 4, q.book[1] + 5, 'Q');
  // a bone cuff on the far wrist, as on the near one
  fa.on(q.book[0] + 1, q.book[1] + 4, 'Z').on(q.book[0] + 2, q.book[1] + 4, 'Z');
  if (q.flare) flare(fa, q.book[0], q.book[1], q.flare);
  pic.over(fa, { sep: '4', sides: 'lrd' });
  if (q.front) pic.over(st, { sep: '4', sides: 'lrd' });
  // Near arm gripping the staff.
  const na = new Pic();
  stroke(na, 18 + lean, 23 + by + br, q.hand[0] + 1, q.hand[1], 1.5, 1.8, across(['1', '3', '4']));
  na.set(R(q.hand[0]), R(q.hand[1]), 'Z').set(R(q.hand[0]), R(q.hand[1]) + 1, 'Q').set(R(q.hand[0]) + 1, R(q.hand[1]), 'z');
  // A bone cuff on the wrist, just up the sleeve from the hand (one tone, so it doesn't stripe
  // against the pauldron above it).
  {
    const [sx, sy] = [18 + lean, 23 + by + br], [hx, hy2] = [q.hand[0] + 1, q.hand[1]];
    const d = Math.hypot(hx - sx, hy2 - sy) || 1, cx = R(hx - ((hx - sx) / d) * 1.5), cy = R(hy2 - ((hy2 - sy) / d) * 1.5);
    for (const [ox, oy] of Math.abs(hx - sx) >= Math.abs(hy2 - sy) ? [[0, -1], [0, 0], [0, 1]] : [[-1, 0], [0, 0], [1, 0]]) na.on(cx + ox, cy + oy, 'Z');
  }
  pic.over(na, { sep: '4', sides: 'rd' });
  if (q.fire) {
    const sf = new Pic();
    soulFire(sf, q.skull[0], q.skull[1], q.fire);
    pic.over(sf);
  }
  despeckle(pic, ['1', '3', '4', 'Q', 'Z']);
  const body = new Pic();
  for (const part of [rb, head, fa, na, ...(q.front ? [st] : [])]) body.over(part);
  body.over(stamped(PAULDRONS, 15 + lean, 20 + by + br));
  rimTopLeft(pic, 11 + by + br + hy, 22 + lean, body);
  return softenNotches(dropStrays(outline(pic, 'k')), '43WR1');
}

// ---------------------------------------------------------------- poses --

const BASE = { bob: 0, breath: 0, lean: 0, headDy: 0, skull: [15, 6], foot: [15, 38], hand: [15, 25], book: [30, 21], glow: 0, flare: 0, kick: 0, back: 0, eye: 'l' };

// Idle: the breath lifts head, pauldrons and book (frames 3-5). The runes on the panel burn in a
// travelling pulse, the glyphs on the pages flicker, the skull staff sways about its planted foot
// and its eyes throb, a small flame licks off the pages and the robe's back corner sways, all on
// continuous cycles, so no two frames are alike.
function idle(i) {
  const br = [0, 0, 0, -1, -1, -1, 0, 0][i];
  return {
    ...BASE, breath: br,
    book: [30, 21 + br], hand: [15, 25 + br], skull: [15 + [0, -1, -1, 0, 0, 1, 1, 0][i], 6], foot: [15, 38],
    glow: i, flare: 'e' + (i % 4), back: [1, 1, 2, 2, 1, 1, 0, 0][i], eye: i % 4 < 2 ? 'l' : 'L',
  };
}

// Walk: two different steps. The skull staff is planted once a stride (frame 0): the body passes
// it as its foot stays on the ground (0-3), then it lifts and swings forward (4-7). The first
// step kicks the hem's front corner forward over the front boot's toe; the second kicks its back
// corner back over the back boot's heel. The head and book dip a frame after the body.
function walk(i) {
  const bob = [0, 1, 0, 0, 0, 1, 0, 0][i];
  const lag = [0, 0, 1, 0, 0, 0, 1, 0][i];
  const hand = [[14, 25], [14, 26], [13, 25], [12, 25], [13, 24], [14, 24], [15, 25], [15, 25]][i];
  const foot = [[17, 38], [15, 38], [13, 38], [12, 37], [13, 35], [15, 35], [17, 36], [17, 37]][i];
  const s = staffThrough(hand, foot);
  return {
    ...BASE, bob, headDy: lag, hand: [hand[0], hand[1]], ...s,
    // the upper body pushes forward a pixel on each step's up frame
    lean: [0, 0, 0, 1, 0, 0, 0, 1][i],
    book: [30 + [1, 1, 0, -1, -1, -1, 0, 1][i], 21 + bob + lag + [0, 0, 0, 1, 1, 0, 0, 0][i]],
    kick: [2, 1, 0, 0, 0, 0, 0, 0][i], toe: [32, 31, null, null, null, null, null, null][i],
    back: [0, 0, 0, 1, 2, 1, 0, 0][i], heel: [null, null, null, null, 11, 12, null, null][i],
    glow: i, eye: i % 4 < 2 ? 'l' : 'L', flare: 'e' + (i % 4),
  };
}

// The cast: he leans back 2 px raising the skull staff up and behind him, the grimoire lifted
// and its pages bursting into blood flame (the spell read); he whips the staff over the top (a
// bone-white smear) and drives it forward in front of him, leaning in 2 px with the hem kicked,
// as acid-green soul fire blasts out of its skull (frame 3, the blow); the fire breaks into
// rising wisps; recover.
function attack(i) {
  const T = [
    { lean: -1, hand: [16, 22], ang: -100, book: [29, 19], flare: 1, back: 1 },
    { lean: -2, hand: [14, 21], ang: -122, book: [28, 18], flare: 2, back: 2 },
    { lean: 0, hand: [24, 20], ang: -55, book: [30, 20], flare: 1, smear: [-122, -55, 15, 11] },
    { lean: 2, hand: [26, 21], ang: -35, up: 13, book: [31, 24], front: true, fire: 'blast', kick: 2, eye: 'z' },
    { lean: 2, hand: [26, 22], ang: -30, book: [31, 23], front: true, fire: 'wisps', kick: 1, flare: 'wisps' },
    { lean: 0, hand: [15, 24], ang: -88, book: [30, 21], flare: 1 },
  ][i];
  return { ...BASE, ...T, ...staffAt(T.hand, T.ang, T.up || 15), glow: 2, eye: T.eye || 'l' };
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
  id: 'remaster-v5',
  name: 'Remaster V5 · Necromancer',
  description: 'Morvath the Blood Lich: a spiked bone crown over a modelled skull with acid-green eyes (his skeletons\' colour) in a black cowl, bone pauldrons joined by a bone collar, a black robe lit only by a crimson rim, its hem torn into pointed tatters that drip crimson, acid-green runes burning on a bone panel kept in shadow below the skull, a skull staff whose eyes pulse and an open grimoire whose glyphs glow. He walks planting the staff once a stride, leaning into it; his cast reads the spell off the burning pages, whips the staff over the top and drives it forward as acid-green soul fire blasts from its skull.',
  collection: 'Remasters',
  def: {
    gen, emissive: 'lLi',
    idle: [0, 1, 2, 3, 4, 5, 6, 7], walk: [8, 9, 10, 11, 12, 13, 14, 15], attack: [16, 17, 18, 19, 20, 21],
    attackFps: 12, motionRate: 10 / 9.8, idleRate: 6 / 1.6,
    anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false,
  },
}];
