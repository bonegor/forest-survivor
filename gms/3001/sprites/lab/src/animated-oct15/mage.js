// The sorcerer as picked on 15 October 2026: the Grand Archmage (polish-a, src/polish-oct15-mage.js)
// in the user's colours, animated for the game: 8 idle frames, 8 walk and a 6-frame cast (the game
// plays idle and walk; the lab shows the cast too). He is one hand-drawn grid, so each pose cuts it
// into layers and moves them: the upper body breathes and bobs with the hat's cone and the beard's
// tip a frame behind, the robe below the belt stretches and its hem swings with the stride, the
// boots step under it, the staff is planted and swung forward, and the fire in his raised hand
// flickers (trailing back as he walks). Facing right in a 48x48 cell, feet on row 39.
// Pose tables and notes: mage-notes.md.
import { Grid, cut, lookOf, painter } from './kit.js';
import { VERSIONS, compose } from '../polish-oct15-mage.js';

// The look the user saved on the review page, as it handed it over.
export const CODE = 'FS mage polish-a hue=-9 sat=41 bright=-4 contrast=21 mid=23 warm=40 tint=-15 outline=-100';
const LOOK = lookOf(CODE);
const V = VERSIONS.find((v) => v.id === 'polish-a');
const PAL = V.pal;
// The fire glows unlit at night, as on the review page.
const FIRE_KEYS = ['r', 'f', 'F', 'y', 'h'];
const { toBuf, glow } = painter(PAL, FIRE_KEYS);

// ---- the drawing, cut into layers -------------------------------------------------------------
const SRC = compose(V);
// The staff's ember cup (its shaft, x 34-37, is redrawn per pose).
const CUP = cut(SRC, (x, y) => y <= 8 && x >= 32);
// The ember in the cup shimmers: it flares white-hot, or its light slides a pixel.
const ORBS = [
  [[34, 4, 'h'], [35, 4, 'y'], [35, 3, 'y']],
  [[34, 3, 'F'], [35, 3, 'y'], [34, 4, 'F'], [35, 4, 'y'], [36, 5, 'y']],
];
// The front hand round the staff: the cuff (x 32-33) and the fist (x 34-37), rows 23-25, with ink
// above and below. The sleeve's end (x 32, rows 22-26) is inked whatever the hand does.
const HAND = ['oo', 'GGSTTSo', 'GgSSSso', 'ggsSsso', 'oo'];
const SLEEVE_END = [22, 23, 24, 25, 26].map((y) => [32, y, 'o']);
const inHand = (x, y) => (y >= 22 && y <= 26 && x >= 32 && x <= 38) && !(x === 32 && (y === 22 || y === 26));
const inStaff = (x, y) => (x >= 34 && x <= 37 && y >= 9) || (y <= 8 && x >= 32);
// The fire over the raised hand is redrawn per pose (FLAMES below).
const inFire = (x, y) => x <= 15 && y >= 12 && y <= 20;
// The hat's cone (rows 3-10 over the band). Rows 8 and 9 have the same outline (x 21-27), so the
// cone's top (rows 3-8) can ride a row down (row 9 dropped: a squash) or up (row 8 doubled: a
// stretch) and the cone stays whole, its base rows 10-11 untouched.
const CONE = cut(SRC, (x, y) => y <= 10 && x <= 31);
const CONE_TOP = CONE.filter(([, y]) => y <= 8);
const coneBase = (c) => CONE.filter(([, y]) => y >= (c > 0 ? 9 : c < 0 ? 8 : 3));
// The beard's tip (rows 25-27), which swings a pixel; where it leaves the robe shows (colour 2).
const inTip = (x, y) => y >= 25 && y <= 27 && x >= 22 && x <= 26 && x - y >= -3;
const TIP = cut(SRC, inTip);
// Everything else from the hat's band to the belt.
const UPPER = cut(SRC, (x, y) => y >= 11 && y <= 28 && !inStaff(x, y) && !inHand(x, y) && !inFire(x, y) && !inTip(x, y));

// ---- the robe below the belt ------------------------------------------------------------------
// Rows 29 and 30 are alike, so the robe stretches or gives a row there as the body rises or sinks.
// Each lower row (31-37, 37 the gold hem) is three pieces: the back panel (to x 19), the middle
// (from the fold at x 20 to the gold edge, which stays put) and the front (from the pale lining to
// the ink). The back panel trails back (b px, its last colour stretching) or draws in; the front
// pushes forward (f px, its dark side stretching, as the robe goes taut over a striding leg) or
// draws in (the lining narrowing). lift raises the front's hem a row: the leading leg kicks it up.
const SKIRT_ROWS = {};
for (let y = 31; y <= 37; y++) {
  const row = SRC[y];
  SKIRT_ROWS[y] = { row, L: row.findIndex((c) => c !== '.'), R: row.slice(0, 34).lastIndexOf('o'), fs: row.indexOf('5') };
}
function skirtRow(y, b, f) {
  const { row, L, R, fs } = SKIRT_ROWS[y];
  let back = row.slice(L, 20), front = row.slice(fs, R);
  back = b >= 0 ? back.concat(Array(b).fill(row[19])) : back.slice(0, back.length + b);
  front = f >= 0 ? front.concat(Array(f).fill(row[R - 1])) : front.slice(-f);
  const x0 = L - b, cells = [...back, ...row.slice(20, fs), ...front, 'o'];
  return { x0, cells, fs, R: x0 + cells.length - 1 };
}
function skirt(G, top, back, front, lift) {
  // Rows from just under the belt to 30, as row 29.
  const r29 = SRC[29].slice(0, 34);
  for (let y = top; y <= 30; y++) r29.forEach((ch, x) => ch !== '.' && G.set(x, y, ch));
  const edge = {};
  for (let y = 31; y <= 37; y++) {
    const r = (edge[y] = skirtRow(y, back[y - 31], front[y - 31]));
    r.cells.forEach((ch, i) => G.set(r.x0 + i, y, ch));
  }
  // The hem's ink underneath; a lifted front shows its hem a row higher with ink under it and the
  // ground under that.
  const h = edge[37];
  for (let x = h.x0 + 1; x <= h.R; x++) G.set(x, 38, 'o');
  if (lift) {
    for (let x = h.fs; x <= Math.max(h.R, edge[36].R); x++) G.g[36][x] = '.';
    for (let x = h.fs; x <= h.R; x++) {
      G.set(x, 36, h.cells[x - h.x0]);
      G.set(x, 37, 'o');
      G.g[38][x] = '.';
    }
  }
}

// ---- boots ------------------------------------------------------------------------------------
// A planted boot as the drawing has them: its upper on row 38, under the hem's ink, ink at the toe,
// and a sole of ink on row 39 a pixel longer at each end. x: the boot's first column. A lifted boot
// is hidden under the hem, so it isn't drawn.
const BOOT = { near: 'DkDdd', far: 'dDk' };
function boot(G, side, x) {
  const s = BOOT[side];
  G.put(x, 38, [s + 'o']).put(x - 1, 39, ['o'.repeat(s.length + 2)]);
}

// ---- the fire ---------------------------------------------------------------------------------
// The fire on the raised palm (the palm is row 21, x 11-13), drawn by hand: a dark ember rim (r)
// round orange (f), amber (F), yellow (y) and a white-hot heart (h) low in it. Each flame is rows
// ending on row 20, placed at x (its first column). The body (rows 17-20) is the drawing's; the
// tongues above it change.
const BODY = ['rfyFfFr', 'rFhyFfr', 'rFhhyFr', '.ryhyr.'];
const BODY2 = ['rfyFFfr', 'rFhyyFr', 'rFhhyFr', '.ryhyr.'];
// While he stands: the drawing's flame (a main tongue and a small one), then its tongues rising,
// splitting and leaning: six shapes, two of them repeated (frames 6-7) with a shimmer in the body.
const TONGUES = [
  ['.......', '..r....', '.rfr.r.', '.rFfrfr'],
  ['..r....', '.rfr...', '.rFfr..', '.rFFfrr'],
  ['...r...', '..rfr..', '.rFfr..', '.rFyFr.'],
  ['.r.....', 'rfr....', 'rFfr...', 'rFyFrr.'],
  ['.......', '..r.r..', '.rfrfr.', '.rFfFfr'],
  ['.......', '....r..', '..rrfr.', '.rfrFfr'],
  ['..r....', '.rfr...', '.rFfr..', '.rFFfrr'],
  ['.......', '..r.r..', '.rfrfr.', '.rFfFfr'],
];
// While he walks the tongues stream back (9 columns from x 7; the body stays on the palm).
const TRAIL = [
  ['.........', '...r.....', '..rfr.r..', '..rFfrfr.'],
  ['..r......', '.rfr.....', '.rFfr.r..', '..rFfrfr.'],
  ['.........', '..r......', '.rfr.r...', '.rFfrfrr.'],
  ['.r.......', 'rfr......', 'rFfr.r...', '.rFfrfrr.'],
];
const FLAMES = {
  idle: TONGUES.map((t, i) => ({ x: 9, rows: [...t, ...(i === 6 || i === 7 ? BODY2 : BODY)] })),
  walk: TRAIL.map((t) => ({ x: 7, rows: [...t, ...BODY.map((r) => '..' + r)] })),
  // The cast: the fire gathers, then blazes up twice its size, then a small flame is left.
  swell: {
    x: 7, rows: [
      '...r.....',
      '..rfr.r..',
      '..rFfrfr.',
      '.rfFyFfFr',
      '.rFyhyFfr',
      '.rFhhhyFr',
      '.rFhhhyFr',
      '..ryhhyr.',
    ],
  },
  blaze: {
    x: 6, rows: [
      '....r......',
      '...rfr.r...',
      '...rFfrfr..',
      '..rfFyFfFr.',
      '..rFyhyFfr.',
      '.rfFyhyyFr.',
      '.rFyhhhyFfr',
      '.rFyhhhyyFr',
      '.rfFyhhyFfr',
      '..rFyhhyFr.',
      '..rFyhhyFr.',
      '...ryhhyr..',
    ],
  },
  spent: { x: 9, rows: ['..r..', '.rfr.', '.rFfr', 'rFyhyr', '.ryhyr'] },
};
// Embers flung off the blaze, each a hot head with a cooler tail, as [x, y, letter]: close in as
// it flares, further out a frame later.
const SPARKS = [
  [[4, 11, 'y'], [5, 12, 'F'], [17, 8, 'y'], [16, 9, 'F'], [9, 6, 'y'], [9, 7, 'F']],
  [[2, 9, 'F'], [3, 10, 'f'], [15, 4, 'F'], [16, 5, 'f'], [8, 3, 'F'], [8, 4, 'f']],
];

// ---- the staff --------------------------------------------------------------------------------
// The shaft (2 px of wood in ink) stands upright from the cup (row 9) to its foot (row 38, capped
// on row 39), so it never shows a stair-step. x moves it (and the fist on it) along the ground,
// lift raises it; foot sets the shaft under the fist a pixel to either side of the part above, a
// lean whose one step hides in the fist (fist: the screen row of the fist's middle).
function staff(G, q, fist) {
  const { x = 0, foot = x, lift = 0 } = q;
  for (let y = 9; y <= 38; y++) G.put(34 + (y - lift <= fist ? x : foot), y - lift, ['oDdo']);
  G.put(35 + foot, 39 - lift, ['oo']);
  G.cells(CUP, x, -lift);
}

// ---- a frame ------------------------------------------------------------------------------------
// pose: { up (the upper body, px down), cone (the hat's cone against the head), tip (the beard's
// tip, px), back / front (the hem's rows 31-37: trail and push, px), lift (the hem's front kicked
// up), near / far (each boot's first column, or null: lifted), staff { x, foot, lift }, hand (the fist's rise
// against the body, px), fire ([set, index]), sparks (0, 1 or 2), orb (the cup's flicker) }
const STILL = [0, 0, 0, 0, 0, 0, 0];
function frame(q) {
  const G = new Grid(PAL), up = q.up || 0;
  // The robe from under the belt, then the boots under its hem.
  skirt(G, 29 + up, q.back || STILL, q.front || STILL, q.lift || 0);
  if (q.far !== null) boot(G, 'far', q.far);
  if (q.near !== null) boot(G, 'near', q.near);
  // The upper body, the hat's cone on it, the beard's tip.
  G.cells(UPPER, 0, up);
  const c = q.cone || 0;
  G.cells(coneBase(c), 0, up);
  if (c) G.cells(CONE_TOP, 0, up + c);
  // The beard's tip, swung: the robe shows where it was, and ink goes under its point on the belt.
  const tip = q.tip || 0;
  if (tip) for (const [x, y] of TIP) G.set(x, y + up, '2');
  G.cells(TIP, tip, up);
  if (tip) G.set(25 + tip, 28 + up, 'o');
  // The staff, then the fist round it (reaching out of the sleeve, or drawn back into it), then the
  // fire on the raised palm.
  const st = q.staff || {}, hx = st.x || 0, hy = up + (q.hand || 0);
  staff(G, st, 24 + hy);
  G.cells(SLEEVE_END, 0, up);
  for (let i = 0; i < hx; i++) for (let j = 0; j < 3; j++) G.set(32 + i, 23 + hy + j, '1');
  G.put(32 + hx, 22 + hy, HAND);
  if (q.orb) G.cells(ORBS[q.orb - 1], hx, -(st.lift || 0));
  const [set, k] = q.fire || ['idle', 0];
  const fl = typeof k === 'number' ? FLAMES[set][k] : FLAMES[set];
  G.put(fl.x, 21 - fl.rows.length + up, fl.rows);
  for (const [x, y, ch] of q.sparks ? SPARKS[q.sparks - 1] : []) G.set(x, y + up, ch);
  seal(G);
  return G.g;
}

// Ink any empty pixel that touches a coloured one (but not the fire, which has its own ember rim),
// so no seam where moving layers part shows bare colour.
function seal(G) {
  const add = [];
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const ch = G.get(x, y);
    if (ch === '.' || ch === 'o' || FIRE_KEYS.includes(ch)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (G.get(x + dx, y + dy) === '.') add.push([x + dx, y + dy]);
  }
  for (const [x, y] of add) G.set(x, y, 'o');
}

// ---- the poses ----------------------------------------------------------------------------------
// Idle: he breathes (up a pixel on frames 3-5); the hat's cone follows a frame late; the fire
// flickers through six shapes (two again, shimmering) and the ember in the cup shimmers.
const BREATH = [0, 0, 0, -1, -1, -1, 0, 0];
const idle = (i) => ({
  up: BREATH[i],
  cone: BREATH[(i + 7) % 8] - BREATH[i],
  near: 27, far: 18,
  fire: ['idle', i], orb: [0, 0, 1, 1, 0, 0, 2, 2][i],
});

// Walk: a stride of 8 frames, contact (0), down (1), passing (2), up (3), then the other leg. The
// body bobs; the hat's cone and the beard's tip follow a frame late; the boots step (the near one
// planted on 0-4 and moving back with the ground, then swung forward under the hem; the far one
// half a stride later and a pixel further back); the hem's front pushes out and kicks up with the
// leading leg and its back trails behind the other, then the back draws in as the legs pass; the staff
// is planted on 0-3 while he walks past it, then lifted and swung forward on 4-7; the fire trails.
const BOB = [0, 1, 0, -1, 0, 1, 0, -1];
// The near boot's first column (null: lifted, under the hem); the far boot steps half a stride
// later, a pixel further back.
const NEAR = [30, 28, 26, 24, 21, null, null, null];
// The hem's profiles, rows 31-37: the back edge trailing 2, 1 or drawn in a pixel, each a clean
// slope; the front pushed out 3, 2, 1 or hanging straight. Each step has its kick: the near leg's
// front +3 then +2, the far leg's +1 then +2 (less, as the staff's foot is back by then).
const BACK = { 2: [0, 1, 1, 2, 2, 2, 2], 1: [0, 0, 0, 1, 1, 1, 1], 0: [0, 0, 0, 0, 0, 0, 0], '-1': [0, 0, 0, 0, -1, -1, -1] };
const FRONT = { 3: [0, 0, 1, 1, 2, 2, 3], 2: [0, 0, 0, 1, 1, 2, 2], 1: [0, 0, 0, 0, 1, 1, 1], 0: [0, 0, 0, 0, 0, 0, 0] };
const HEM = [[3, 2, 1], [2, 1], [0, -1], [1, 0], [1, 2, 1], [2, 1], [0, -1], [1, 0]]
  .map(([f, b, lift]) => ({ front: FRONT[f], back: BACK[b], lift: lift || 0 }));
// The fist's x, the shaft's foot under it, the lift: planted ahead and leaning back (0), walked
// past until it leans forward (3), lifted and swung forward (4-7). Its foot never stands a pixel
// off the robe's front (two inks side by side): it clears it by two or more.
const STAFF = [
  { x: 2, foot: 3, lift: 0 },
  { x: 2, foot: 2, lift: 0 },
  { x: 1, foot: 1, lift: 0 },
  { x: 1, foot: 0, lift: 0 },
  { x: 0, foot: 0, lift: 1 },
  { x: 1, foot: 1, lift: 2 },
  { x: 2, foot: 2, lift: 2 },
  { x: 2, foot: 3, lift: 1 },
];
const walk = (w) => {
  const far = NEAR[(w + 4) % 8];
  return {
    up: BOB[w],
    cone: BOB[(w + 7) % 8] - BOB[w],
    tip: [0, -1, -1, 0, 0, -1, -1, 0][w],
    ...HEM[w],
    near: NEAR[w], far: far === null ? null : far - 1,
    staff: STAFF[w], hand: -STAFF[w].lift,
    fire: ['walk', [1, 3, 2, 0, 1, 3, 2, 0][w]], orb: [0, 1, 1, 0, 0, 2, 2, 0][w],
  };
};

// The cast: he sinks as the fire swells, rises into it as it blazes and lifts the staff, throws
// (the fire flares and spits embers, the staff's top tips forward), and settles as a small flame
// grows back.
const CAST = [
  { up: 1, cone: -1, fire: ['swell'], orb: 1 },
  { up: -1, cone: 1, fire: ['blaze'], staff: { lift: 1 }, hand: -1, orb: 2 },
  { up: -1, cone: 0, fire: ['blaze'], sparks: 1, staff: { x: 2, foot: 1, lift: 1 }, hand: -1, orb: 1 },
  { up: 0, cone: -1, fire: ['spent'], sparks: 2, staff: { x: 2, foot: 1 }, orb: 2 },
  { up: 0, cone: 0, fire: ['idle', 5], staff: { x: 1, foot: 1 } },
  { up: 0, cone: 0, fire: ['idle', 0] },
];
const cast = (k) => ({ near: 27, far: 18, ...CAST[k] });

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

const COLLECTION = 'Picked · October 15';
export default [
  {
    cls: 'mage', id: 'grand-archmage-picked', name: 'Sorcerer · Grand Archmage (picked)',
    description: 'The Grand Archmage in the colours picked on the review page (hue -9, colour +41, brightness -4, contrast +21, midtones +23, warmth +40, tint -15, outline -100), animated for the game: he breathes as the fireball in his hand flickers; he walks with the hem of his robe swinging and kicking up over each stride, his boots stepping under it, the staff planted and swung forward and the fire streaming back; and his cast swells the fire to a blaze that flings embers.',
    collection: COLLECTION, glow: glow(LOOK), def: def(LOOK),
  },
  {
    cls: 'mage', id: 'grand-archmage-animated', name: 'Sorcerer · Grand Archmage (animated)',
    description: 'The Grand Archmage in his own colours, animated as the picked one is.',
    collection: COLLECTION, glow: glow(null), def: def(null),
  },
];
