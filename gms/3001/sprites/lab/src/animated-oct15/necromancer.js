// The necromancer as picked on 15 October 2026: Soulflame (polish-d, src/polish-oct15-necromancer.js)
// in the user's colours, with the user's change: "for the necromancer, lose the flames, give him a
// crown". The green soul fire that engulfed the skull is gone; a lich king's gold crown sits on the
// bare skull, a soul gem in its band. Animated for the game: 8 idle frames, 8 walk and a 6-frame
// cast (the game plays idle and walk; the lab shows the cast too). His parts are Soulflame's,
// copied here as named parts and moved pose by pose: the crowned head and the mantle breathe and
// bob, the mantle's gold trim settles a frame late, the skirt's hem swings, the bone feet step
// under it, the sickle staff is planted and swung, and the soul gem pulses. Facing right in a
// 48x48 cell, feet on row 39. Notes: necromancer-notes.md beside this file.
import { Grid, lookOf, painter } from './kit.js';
import { PALETTES } from '../polish-oct15-necromancer.js';

// The look the user saved on the review page, as it handed it over.
export const CODE = 'FS necromancer polish-d hue=1 sat=69 bright=11 warm=29 tint=46 outline=-100';
const LOOK = lookOf(CODE);
// Soulflame's palette (o ink; 1-5 midnight navy; a-d bone; f-i soul light, h and i glowing; w x
// wood; y z gold) and one more gold for the crown's lit faces: e.
const PAL = { ...PALETTES['polish-d'], e: '#f2d98a' };
// The eyes, the crown's soul gem and the cast's soul light glow unlit at night.
const { toBuf, glow } = painter(PAL, ['h', 'i']);

// ---- the parts: [x, y, rows] as he stands --------------------------------------------------------
// The crowned skull. The crown: a gold band on the brow with a soul gem at its front, a tall centre
// spire and a shorter point either side, lit on the left. It sits on the cranium (its band's left
// end on the line of the skull's back, a pixel over the brow at the front) with no ink between band
// and bone, so it is worn, not balanced. The skull is Soulflame's, its cranium a pixel deeper at the
// back so the band has something to sit on. Eyes at (24, 14) and (27, 14), the gem at (24, 9).
const HEAD = [19, 3, [
  '.....o.....', //  3 the spire's tip
  '....oeo....', //  4
  '....oeo....', //  5
  '.o..oeo..o.', //  6 the side points' tips
  'oeooezyooyo', //  7
  'oezoezyozyo', //  8
  'oezzzhzzzyo', //  9 the band and its gem
  'oyyyyyyyyyo', // 10
  'odddddccbo.', // 11 the brow under the band
  'odddddccbo.', // 12
  'occdoocooo.', // 13 sockets
  'obccohcoho.', // 14 eyes
  '.obcccocbo.', // 15 the nose
  '..obododo..', // 16 teeth
  '...obcbco..', // 17 the jaw
  '....oooo...', // 18
]];
// The mantle over the shoulders, a gold clasp at the throat, its gold-trimmed hem on rows 22-23
// (the front shoulder's outline closed at (29, 19)).
const MANTLE = [13, 16, [
  '......oooooo......',
  '....oo433322oo....',
  '..oo4543332221oo..',
  '.o4554333zy22221oo',
  'o44543333yy2222111o',
  'o44433333322222211o',
]];
const TRIM = [13, 22, [
  'oyzyyzyyzyyzyyzyyyo',
  '.ooooooooooooooooo.',
]];
// The robe's body under the mantle and the belt of vertebrae (row 25).
const TORSO = [13, 20, [
  '....o433322221o....',
  '....o433322221o....',
  '....o433322221o....',
  '....o433322221o....',
  '....o433322221o....',
  '....occbccbccbo....',
]];
// The skirt from the belt to the gold hem (row 37), the front flap's gold edge running down it.
const SKIRT = [13, 26, [
  '...o433332z2211o...',
  '...o433332z2211o...',
  '...o4333322z211o...',
  '...o4333322z211o...',
  '..o44333322z2111o..',
  '..o443333222z111o..',
  '..o443333222z111o..',
  '.o4433333222z1111o.',
  '.o4433333222z1111o.',
  '.o44333332222z111o.',
  '.o44333332222z111o.',
  'oyzyyzyyyyzyyyzyyyo',
]];
// The front arm, a bone hand round the staff (the hand at x 34-35, rows 24-26); the forearm's top
// edge inked where it leaves the mantle.
const ARM = [26, 21, [
  'o33o......',
  'o4322ooo..',
  '.o432221oo',
  '..o32221obo',
  '...ooooocdo',
  '.......obco',
  '........oo.',
]];
// The arm raised for the cast: the sleeve held out level from the shoulder, the hand three rows
// higher (x 34-35, rows 21-23); its top is cloth where it meets the mantle's shoulder, so the
// two inks don't stack.
const ARM_UP = [26, 20, [
  'o3322ooooo.',
  'o4332221obo',
  'o4322221cdo',
  '.o32221obco',
  '..ooooo.oo.',
]];
// The sickle on top of the staff (the staff's top at x 34, rows 4-6); its blade's underside and
// tip closed with ink.
const SICKLE = [32, 2, [
  '...ooo....',
  '..ocdcoo..',
  '.oxocddco.',
  '.oxoooocdo',
  '.oxo...odo',
  '........oo',
]];

// ---- drawing helpers --------------------------------------------------------------------------
const put = (G, [x, y, rows], dx = 0, dy = 0) => G.put(x + dx, y + dy, rows);
// A row of letters (from x0) stretched: the cells from `front` on moved by df (the gap filled with
// the cell before them), the cells up to `back` moved by -db (the gap filled with the cell after).
function stretch(row, x0, back, db, front, df) {
  const cells = [...row].map((ch, i) => [x0 + i, ch]).filter(([, ch]) => ch !== '.');
  const out = new Map();
  const mid = cells.filter(([x]) => x > back && x < front);
  for (const [x, ch] of mid) out.set(x, ch);
  const inner = (x) => cells.find(([cx]) => cx === x)?.[1];
  const fb = inner(back + 1), ff = inner(front - 1);
  if (fb && cells.some(([x]) => x <= back)) for (let k = 1; k <= db; k++) out.set(back + 1 - k, fb);
  if (ff && cells.some(([x]) => x >= front)) for (let k = 1; k <= df; k++) out.set(front - 1 + k, ff);
  for (const [x, ch] of cells) if (x <= back) out.set(x - db, ch);
  for (const [x, ch] of cells) if (x >= front) out.set(x + df, ch);
  return out;
}

// The staff from its top (the sickle's shaft at column tx) to its foot (column fx), lifted `lift`
// px off the ground. Returns the column of its shaft at a given row.
function staff(G, { tx, fx, lift }) {
  const col = (y) => Math.round(tx + ((fx - tx) * (y + lift - 4)) / 34);
  for (let y = 7 - lift; y <= 38 - lift; y++) G.put(col(y) - 1, y, ['oxwo']);
  G.put(fx, 39 - lift, ['oo']);
  put(G, SICKLE, tx - 34, -lift);
  return col;
}

// The skirt, its hem's front corner kicked forward (kick, px at the hem) and its back corner
// trailing (back), flaring towards the hem, and under the hem the ink of its underside. Lifted
// (lift), the hem's front corner (its last three pixels) rides a row higher, flicked up by the
// stepping foot, and the ground shows under it. Drawn before the body above it: lowered (up > 0), the belt covers its
// top rows; risen (up < 0), its top row fills the rows the belt leaves.
const clear = (G, x, y) => (G.g[y][x] = '.');
// How far an edge flares on a row, t from 0 (row 29) to 1 (the hem): a 1-px flare only from row 35,
// so it never lands on row 33, where Soulflame's own edge already steps (a 2-px notch there).
const flare = (n, t) => (n === 1 ? +(t >= 0.75) : Math.round(n * t));
function skirt(G, { kick = 0, back = 0, lift = 0 }, up) {
  const [x0, y0, rows] = SKIRT;
  const cells = new Map(), key = (x, y) => y * 48 + x;
  let ends;
  rows.forEach((r, j) => {
    const y = y0 + j, t = Math.max(0, Math.min(1, (y - 29) / 8));
    const first = x0 + r.search(/[^.]/), last = x0 + r.length - 1 - [...r].reverse().findIndex((c) => c !== '.');
    const m = stretch(r, x0, first + 1, flare(back, t), last - 1, flare(kick, t));
    for (const [x, ch] of m) cells.set(key(x, y), ch);
    if (j === rows.length - 1) ends = [Math.min(...m.keys()), Math.max(...m.keys())];
  });
  // Stretched, an edge may step out two pixels from one row to the next: the fill it bares is inked.
  for (const [k, ch] of cells) {
    const x = k % 48, y = (k - x) / 48;
    if (ch !== 'o' && y > y0 && ![key(x - 1, y), key(x + 1, y), key(x, y - 1)].every((n) => cells.has(n))) cells.set(k, 'o');
  }
  for (const [k, ch] of cells) {
    const x = k % 48, y = (k - x) / 48;
    if (y >= y0 + Math.max(0, up)) G.set(x, y, ch);
    if (y === y0) for (let d = up; d < 0; d++) G.set(x, y + d, ch);
  }
  for (let x = ends[0] + 1; x < ends[1]; x++) G.set(x, 38, 'o');
  if (lift) {
    for (let x = ends[1] - 2; x <= ends[1]; x++) {
      G.set(x, 36, G.get(x, 37));
      if (G.get(x, 38) === '.') clear(G, x, 37);
      else G.set(x, 37, G.get(x, 38));
      clear(G, x, 38);
    }
  }
}

// A bone foot under the hem: on row 38, outlined at both ends, its sole on row 39. `show` cuts it
// to its front pixels (the heel lifting off).
function foot(G, x, toes, show = toes.length) {
  const t = toes.slice(toes.length - show), x1 = x + toes.length - show;
  G.put(x1 - 1, 38, ['o' + t + 'o']);
  G.put(x1 - 1, 39, ['o'.repeat(t.length + 2)]);
}

// ---- a frame ------------------------------------------------------------------------------------
// pose: { up (the body's rise or bob, px down), head (the head's own offset from it), trim (the
// mantle trim's), staff: { tx, fx, lift }, arm ('rest' | 'up'), kick, back, lift (the hem's),
// near / far (a foot: [x, pixels shown] or null, lifted), gem (its letter), burst (LIGHT below) }
const REST_STAFF = { tx: 34, fx: 34, lift: 0 };
function frame(q) {
  const G = new Grid(PAL), up = q.up || 0, hy = up + (q.head || 0), ty = up + (q.trim || 0);
  const st = q.staff || REST_STAFF;
  // The soul light in the sickle's hook: kindling behind the blade, bursting in front of it.
  const light = () => soulLight(G, 38 + st.tx - 34, 7 - st.lift, q.burst);
  if (q.burst && q.burst < 3) light();
  const col = staff(G, st);
  // The robe: the skirt and hem, the body under the mantle and the belt, the feet.
  skirt(G, q, up);
  put(G, TORSO, 0, up);
  if (q.far) foot(G, q.far[0], 'bbc', q.far[1]);
  if (q.near) foot(G, q.near[0], 'bccd', q.near[1]);
  // The mantle; its trim may lag the shoulders by a row (lower, the mantle stretches a row; higher,
  // it rides up the robe). Only its free part (to x 26) lags; the rest, under the arm, does not.
  put(G, MANTLE, 0, up);
  if (ty > up) put(G, [13, 21, [MANTLE[2][5]]], 0, up + 1);
  const [, , trim] = TRIM;
  G.put(13, 22 + ty, trim.map((r) => r.slice(0, 14)));
  G.put(26, 22 + up, trim.map((r) => r.slice(13)));
  // The arm, its hand on the staff: the forearm stretched to wherever the shaft passes.
  if (q.arm === 'up') {
    const hx = col(22 + up) - 34;
    const [x, y, rows] = ARM_UP;
    rows.forEach((r, j) => {
      for (const [cx, ch] of stretch(r, x, -1, 0, 32, hx)) G.set(cx, y + j + up, ch);
    });
  } else {
    const hx = col(25 + up) - 34;
    const [x, y, rows] = ARM;
    rows.forEach((r, j) => {
      for (const [cx, ch] of stretch(r, x, -1, 0, 32, hx)) G.set(cx, y + j + up, ch);
    });
  }
  // The crowned head, the gem in this frame's light.
  const [x, y, rows] = HEAD;
  G.put(x, y + hy, rows.map((r, j) => (j === 6 ? r.replace('h', q.gem || 'h') : r)));
  if (q.burst >= 3) light();
  return G.g;
}

// The soul light in the sickle's hook: 1 a spark kindling, 2 a ball, 3 the burst (rays from a
// white-hot core), 4 its rays breaking into sparks, 5 the last embers rising. Each spark is two
// pixels, so none floats alone.
const LIGHT = {
  1: ['.g.', 'ghg', '.g.'],
  2: ['..g..', '.ghg.', 'ghihg', '.ghg.', '..g..'],
  3: [
    '......h......',
    '......h......',
    '.g....h....g.',
    '..g..ghg..g..',
    '...g.hih.g...',
    '....hhihh....',
    'hhhhiiiiihhhh',
    '....hhihh....',
    '...g.hih.g...',
    '..g..ghg..g..',
    '.g....h....g.',
    '......h......',
    '......h......',
  ],
  4: [
    '.....h.....',
    '.h...g...h.',
    '..g.....g..',
    '...........',
    '.....g.....',
    'hg..ghg..gh',
    '.....g.....',
    '...........',
    '..g.....g..',
    '.h...g...h.',
    '.....h.....',
  ],
  5: [
    '.......h.',
    '..h....g.',
    '..g......',
    '.........',
    '....g....',
    '...ghg...',
    '....g....',
    '.........',
    '.........',
  ],
};
function soulLight(G, cx, cy, n) {
  const rows = LIGHT[n], r = (rows.length - 1) / 2;
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    const x = cx - r + i, y = cy - r + j;
    if (ch !== '.' && x >= 0 && x < 48 && y >= 0 && y < 48) G.set(x, y, ch);
  }));
}

// ---- the poses ----------------------------------------------------------------------------------
// Idle: he breathes in (the body under the mantle, the arm and the shoulders up a pixel on frames
// 1-3); the head rises with them but comes down a frame late, the mantle's heavy trim lags the rise by two
// frames (so the mantle stretches, then settles), the hem's back sways after the breath, and the
// soul gem in the crown brightens and dims.
const idle = (i) => ({
  up: [0, -1, -1, -1, 0, 0, 0, 0][i],
  head: [0, 0, 0, 0, -1, 0, 0, 0][i],
  trim: [0, 1, 1, 0, 0, 0, 0, 0][i],
  back: [0, 0, 0, 0, 1, 1, 1, 0][i],
  near: [24, 4], far: [17, 2],
  gem: ['h', 'h', 'i', 'i', 'h', 'h', 'g', 'g'][i],
});
// Walk: a stride of 8 frames, contact (0), down (1), passing (2), up (3), then the other foot.
// The body dips after each contact and rises after passing. The near foot is planted from its
// contact to its toe-off at the back, then lifted under the hem; the far foot steps half a stride
// later. On each contact the hem widens and its front corner flicks up over the stepping foot. The
// staff is set down ahead on contact (0) and stays planted through the down (1), its foot moving
// back at the ground's pace (2 px a frame) as he passes it; then it is lifted (2), swung forward
// (3-6) and held just off the ground (7). It never leans more than 2 px (one jog in the shaft per
// pixel of lean) and keeps a clear pixel from the robe.
const walk = (w) => ({
  up: [0, 1, 0, -1, 0, 1, 0, -1][w],
  kick: [2, 1, 0, 1, 2, 1, 0, 1][w],
  back: [1, 1, 0, 0, 1, 1, 0, 0][w],
  lift: [1, 0, 0, 0, 1, 0, 0, 0][w],
  near: [[28, 4], [26, 4], [24, 4], [22, 4], [20, 2], null, null, null][w],
  far: [[19, 2], null, null, null, [27, 3], [25, 3], [23, 3], [21, 3]][w],
  staff: {
    fx: [37, 35, 34, 35, 36, 37, 38, 38][w],
    tx: [35, 36, 36, 37, 38, 37, 36, 36][w],
    lift: [0, 0, 1, 2, 2, 1, 1, 1][w],
  },
});
// The cast, 13 frames a second: he draws the staff in, lifts it high and the soul light gathers in
// the sickle's hook, bursts, throws sparks and dies away as he lowers it.
const CAST = [
  { up: 1, staff: { tx: 33, fx: 34, lift: 0 }, burst: 1 },
  { up: -1, arm: 'up', staff: { tx: 36, fx: 34, lift: 2 }, burst: 2, gem: 'i' },
  { up: -1, arm: 'up', staff: { tx: 37, fx: 34, lift: 2 }, burst: 3, gem: 'i' },
  { up: 0, arm: 'up', staff: { tx: 37, fx: 34, lift: 2 }, burst: 4, gem: 'i' },
  { up: 0, staff: { tx: 35, fx: 34, lift: 1 }, burst: 5 },
  { up: 0, staff: REST_STAFF },
];
const cast = (k) => ({ near: [24, 4], far: [17, 2], ...CAST[k] });

// ---- frames ------------------------------------------------------------------------------------
let grids;
const allGrids = () => (grids ??= [
  ...Array.from({ length: 8 }, (_, i) => frame(idle(i))),
  ...Array.from({ length: 8 }, (_, i) => frame(walk(i))),
  ...Array.from({ length: 6 }, (_, i) => frame(cast(i))),
]);
const def = (look) => ({
  gen: () => allGrids().map((g) => toBuf(g, look)),
  idle: [0, 1, 2, 3, 4, 5, 6, 7], walk: [8, 9, 10, 11, 12, 13, 14, 15], attack: [16, 17, 18, 19, 20, 21],
  attackFps: 13, motionRate: 10 / 9.8, idleRate: 6 / 1.6,
  anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false,
});
// The frames as letter grids, for checking tools.
export const letterGrids = allGrids;

const COLLECTION = 'Picked · October 15';
export default [
  {
    cls: 'necromancer', id: 'soulflame-picked', name: 'Necromancer · Soulflame (picked)',
    description: 'Soulflame in the colours picked on the review page (hue +1, colour +69, brightness +11, warmth +29, tint +46, outline -100), the flames gone and a lich king\'s gold crown with a soul gem on his bare skull, animated for the game: breathing with the mantle settling and the gem pulsing, a walk that plants and vaults the sickle staff with the hem swinging over stepping bone feet, and a cast that lifts the staff as soul light bursts from the sickle.',
    collection: COLLECTION, glow: glow(LOOK), def: def(LOOK),
  },
  {
    cls: 'necromancer', id: 'soulflame-animated', name: 'Necromancer · Soulflame (animated)',
    description: 'Soulflame crowned, in his own colours, animated as the picked one is.',
    collection: COLLECTION, glow: glow(null), def: def(null),
  },
];
