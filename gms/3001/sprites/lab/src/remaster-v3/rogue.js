// Kael, the Shadow (remaster-v3): a hooded assassin on two legs, in shadow with a lilac rim of
// moonlight, twin daggers, a magenta scarf burning out in violet fire at its tail.
import { Pic, palette, outline, dropStrays, toBuf, across, stroke, leg, GAIT, STAND, despeckle, R } from './kit.js';

export const PAL = palette({
  k: 'k',
  // shadow violet, dark to light, and the lilac of his fire, his rim light and his eyes
  // (p a touch lighter than the master's #68386c, so it clears the night line by 4 rather than 1)
  h: 'h', q: 'q', p: '#6f3d78', j: 'j', V: '#b57fd9', '9': '#d9a6ff', w: 'w',
  // the eyes' white, which glows in the dark
  z: 'z',
  // a magenta scarf and sash, and the scarf's lit edge
  P: 'P', I: '#e88ac4',
  // dagger steel and the hilts' gold
  G: 'G', y: 'y',
});

// ------------------------------------------------------------- shared --

// A dagger from the hand along `ang` (degrees: 0 right, 90 down): a 2-px blade `len` long, white
// edge on the lit side and steel below, a gold guard across its root, the grip in the fist.
function dagger(p, hand, ang, len = 6) {
  const a = (ang * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
  const at = (k, s = 0) => [R(hand[0] + dx * k - dy * s), R(hand[1] + dy * k + dx * s)];
  const upright = Math.abs(dy) > Math.abs(dx);
  for (let k = 1; k <= len; k++) {
    const [x, y] = at(k + 0.5);
    p.set(x, y, 'w');
    if (k < len) {
      // the second pixel on the shadow side (below a flat blade, right of an upright one)
      if (upright) p.set(x + 1, y, 'G');
      else p.set(x, y + 1, 'G');
    }
  }
  const [g0x, g0y] = at(0.8, -1.3), [g1x, g1y] = at(0.8, 1.3);
  p.line(g0x, g0y, g1x, g1y, 'y');
}

// A slash's trail: the sector swept between angles a0 and a1 (a0 < a1 clockwise) around c, out
// to rOut; thickest at the blade's end (a1, or a0 when rev). White at its edge, steel behind,
// lilac only in the fading tail.
function trail(p, c, a0, a1, rOut, rIn, rev = false) {
  const span = a1 - a0;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const dx = x - c[0], dy = y - c[1], r = Math.hypot(dx, dy);
    if (r > rOut + 0.5 || r < rIn - 1 || y > 38) continue;
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    const d = (((a - a0) % 360) + 360) % 360;
    if (d > span) continue;
    const t = rev ? 1 - d / span : d / span;
    if (r < rOut - (rOut - rIn) * Math.pow(t, 0.9)) continue;
    p.set(x, y, t < 0.3 ? '9' : r > rOut - 1.3 ? 'w' : 'G');
  }
}

// Violet fire drawn by hand: a lick of flame in four phases of its flicker (a pale lilac core,
// violet around it, purple at the edge and the root), stamped with its root's centre at (x, y),
// its upper rows sheared back by lean px at the tip.
const LICKS = [
  ['..9..', '..99.', '.VV9.', '.V99j', 'jV99j', 'jjVVj', '.jjp.', '..pp.'],
  ['.9...', '.99..', '.VV9.', 'jV99.', 'jV99j', 'jjVVj', '.jjp.', '..pp.'],
  ['...9.', '..99.', '.VV9.', '.V99j', 'jV99j', 'jVVjj', '.jjp.', '..pp.'],
  ['.....', '..9..', '.V99.', 'jV99j', 'jV99j', 'jjVVj', '.jjp.', '..pp.'],
];
function lick(p, x, y, phase, lean = 0, grow = 0) {
  const rows = LICKS[((phase % 4) + 4) % 4];
  const all = [...Array(grow).fill(null).map((_, g) => (g === 0 ? '..9..' : '.jV9.')), ...rows];
  const n = all.length;
  all.forEach((row, j) => {
    const up = n - 1 - j;
    const dx = R(-lean * (up / (n - 1)) ** 1.5);
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') p.set(R(x) - 2 + i + dx, R(y) - up, row[i]);
  });
}

// ------------------------------------------------------------ assassin --

// The hood, its point pulled forward and hooked over the brow, and the face in its shadow: two
// slanted white eyes over a dark mask. Lit from the top-left: a lilac rim (9) on the hood's
// top-left edge, the lit plane in j, the mass in p / q, the shadow in h. Placed at (15, 10).
const HEAD = [
  '.........9999..', // 10  the point
  '......999VVVq9.', // 11  the hook
  '....99VVjjjqqh.', // 12
  '...9Vjjpppqhhh.', // 13  the shadow under the point
  '...9jjppqqhhhh.', // 14  the face in the hood's shadow
  '..9jjppqqhzhhhz', // 15  the eyes, slanting down to the nose
  '..9jppqqhhhzhzh', // 16
  '..9jpqqqhqppppq', // 17  the mask
  '...ppqqqqqqqqq.', // 18
];
// The torso: the scarf's collar, shoulders, chest, the sash, the hips. Placed at (14, 19).
const TORSO = [
  '....PPPPPPPPPP..', // 19  the scarf wrapped at the throat
  '...99jjppqqqqq..', // 20  shoulders: the rim, the lit plane
  '..9jjjpppqqqqqh.', // 21
  '..9jjpppqqqqqqh.', // 22
  '...jjppqqqqqqh..', // 23
  '...pppqqqqqqqh..', // 24
  '...ppqqqqqqqh...', // 25  waist
  '...PPPPPPPPPP...', // 26  sash
  '...pppyyppph....', // 27  its buckle
  '....pqqqqqqqh...', // 28  hips
  '......pq........', // 29  the seat, into the thighs
];

// Legs: dark trousers, a light guard over the knee (lilac and violet on the near leg, violet and
// lavender on the far one), dark boots (h) from below it. The near leg is lit on its left.
const legMap = (g, hy, near) => {
  const ky = g.k[1] + (hy - 30);
  return (s, x, y) => {
    if (s === 'D') return 'h';
    if (y < ky) return (near ? { A: 'p', B: 'p', C: 'q' } : { A: 'q', B: 'q', C: 'h' })[s] || 'q';
    if (y === ky) return (near ? { E: '9', A: '9', B: '9', C: 'V' } : { E: 'V', A: 'V', B: 'V', C: 'p' })[s];
    if (y === ky + 1) return (near ? { A: 'V', B: 'V', C: 'j' } : { A: 'j', B: 'j', C: 'p' })[s];
    return (near ? { A: 'q', B: 'h', C: 'h' } : { A: 'h', B: 'h', C: 'h' })[s];
  };
};

// A long scarf from the knot at the back of the neck, streaming back in a wave: a magenta band
// lit on top (I) near the knot, burning out at its tail in licks of violet fire. back: how far it
// streams; droop: how far it falls by its end (rows); phase: its ripple (radians: a full turn
// loops). Returns its points, knot to tail.
function scarf(p, x0, y0, back, droop, phase) {
  const pts = [];
  for (let k = 0; k <= 8; k++) {
    const t = k / 8;
    pts.push([x0 - k * (1.1 + back * 0.15), y0 + t * droop + Math.sin(t * 5 - phase) * 1.6 * t]);
  }
  for (let k = 1; k < pts.length; k++) {
    const [xa, ya] = pts[k - 1], [xb, yb] = pts[k];
    p.line(R(xa), R(ya), R(xb), R(yb), k <= 6 ? 'I' : 'P');
    p.line(R(xa), R(ya) + 1, R(xb), R(yb) + 1, k <= 5 ? 'P' : k < 8 ? 'p' : 'P');
    if (k <= 5) p.line(R(xa), R(ya) + 2, R(xb), R(yb) + 2, 'p');
    if (k <= 2) p.line(R(xa), R(ya) + 3, R(xb), R(yb) + 3, 'p');
  }
  return pts;
}

// Moonlight on the silhouette: every pixel of cloth whose top or left neighbour is clear takes the
// rim colour: lilac (9) on the body above the hips, a lit step on the legs and boots.
function rimTopLeft(pic, hip, mine) {
  const UP = { q: '9', p: '9', j: '9', h: 'p' }, LEGS = { q: 'j', p: 'V', j: 'V', h: 'p' };
  const marks = [];
  for (let y = 0; y < pic.h; y++) for (let x = 0; x < pic.w; x++) {
    const c = pic.get(x, y);
    if (!c || !mine(x, y) || (pic.get(x, y - 1) && pic.get(x - 1, y))) continue;
    const to = (y < hip ? UP : LEGS)[c];
    if (to) marks.push([x, y, to]);
  }
  // A rim pixel alone on a stair step would be a speck: keep the ones that run on in a line.
  const at = new Map(marks.map(([x, y, c]) => [x + ',' + y, c]));
  for (const [x, y, c] of marks) {
    const runs = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => at.get(x + a + ',' + (y + b)) === c || pic.get(x + a, y + b) === c);
    if (runs) pic.set(x, y, c);
  }
  return pic;
}

// Ink notches: an inner ink pixel (no clear neighbour) beside the silhouette's ink doubles the line
// into a 2-px dark wedge. It takes the colour of the cloth beside it (the first of pref there);
// the outline it leaves keeps its line through the diagonal.
function smoothNotches(pic, pref) {
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const clear = (x, y) => !pic.get(x, y);
  const edge = (x, y) => pic.get(x, y) === 'k' && N4.some(([a, b]) => clear(x + a, y + b));
  const marks = [];
  for (let y = 0; y < pic.h; y++) for (let x = 0; x < pic.w; x++) {
    if (pic.get(x, y) !== 'k' || edge(x, y) || !N4.some(([a, b]) => edge(x + a, y + b))) continue;
    const near = N4.map(([a, b]) => pic.get(x + a, y + b));
    const c = [...pref].find((ch) => near.includes(ch));
    if (c) marks.push([x, y, c]);
  }
  for (const [x, y, c] of marks) pic.set(x, y, c);
  return pic;
}

function assassinFrame(q) {
  const pic = new Pic();
  const by = q.bob, br = q.breath || 0, lean = q.lean || 0, hy = q.headDy || 0, hl = q.headLean || 0;
  const hip = 29 + by;
  // The scarf first (its tail end feeds a flame), then the fire behind everything.
  const sc = new Pic();
  const pts = scarf(sc, 18 + lean + hl, 19.5 + by + br + hy, q.capeBack || 0, q.droop ?? 3, q.capeWave || 0);
  const fire = new Pic();
  // A lick of fire off the scarf's tail: [phase, lean, grow].
  const [ph, fl, fg] = q.tailFire;
  lick(fire, pts[8][0] - 0.5, pts[8][1] + 1, ph, fl, fg);
  pic.over(fire);
  pic.over(sc);
  // Far arm and its dagger, behind the body.
  const fa = new Pic();
  const fs = [27 + lean, 21 + by + br];
  stroke(fa, fs[0], fs[1], q.farElbow[0], q.farElbow[1], 1.3, 1.15, across(['p', 'q', 'h']));
  stroke(fa, q.farElbow[0], q.farElbow[1], q.far[0], q.far[1], 1.15, 1.0, across(['p', 'q', 'h']));
  dagger(fa, q.far, q.farAng, 9);
  pic.over(fa);
  // Legs from one hip column.
  const lf = leg(new Pic(), 23, hip, q.legFar, legMap(q.legFar, hip, false), { tw: 4, sw: 3 });
  const ln = leg(new Pic(), 23, hip, q.legNear, legMap(q.legNear, hip, true), { tw: 4, sw: 3 });
  pic.over(lf);
  pic.over(ln, { sep: 'h', sides: 'rd' });
  // The torso, then the head on it.
  const body = new Pic();
  body.stamp(TORSO.slice(0, 5), 14 + lean, 19 + by + br);
  body.stamp(TORSO.slice(5), 14 + lean, 24 + by);
  body.stamp(HEAD, 15 + lean + hl, 10 + by + br + hy);
  pic.over(body, { sep: 'h', sides: 'd' });
  // Slash trails over the body, under the near arm.
  if (q.trails) {
    const tr = new Pic();
    for (const [cx, cy, a0, a1, ro, ri, rev] of q.trails) trail(tr, [cx + lean, cy + by], a0, a1, ro, ri, rev);
    pic.over(tr);
  }
  // Near arm and its dagger, in front.
  const na = new Pic();
  const ns = [20 + lean, 21 + by + br];
  stroke(na, ns[0], ns[1], q.nearElbow[0], q.nearElbow[1], 1.35, 1.2, across(['V', 'p', 'q']));
  stroke(na, q.nearElbow[0], q.nearElbow[1], q.near[0], q.near[1], 1.2, 1.05, across(['V', 'p', 'q']));
  dagger(na, q.near, q.nearAng, 9);
  pic.over(na, { sep: 'h', sides: 'lrd' });
  despeckle(pic, ['p', 'q', 'j', 'h']);
  const parts = [fa, lf, ln, body, na];
  rimTopLeft(pic, hip, (x, y) => parts.some((pp) => pp.get(x, y)));
  return smoothNotches(dropStrays(outline(pic, 'k')), 'qphPj');
}

const A_BASE = {
  bob: 0, breath: 0, lean: 0, headDy: 0, headLean: 0,
  legNear: STAND.back, legFar: STAND.front,
  nearElbow: [22, 25], near: [27, 26], nearAng: 27,
  farElbow: [30, 23], far: [33, 23], farAng: -27,
  capeBack: 0, capeWave: 0, droop: 5,
};

// Idle: a ready stance, daggers out, the near blade low, the far one raised; breath on 3-5 with
// the hands a frame behind it, the scarf on a continuous wave and the fire flickering on every
// frame.
function aIdle(i) {
  const br = [0, 0, 0, -1, -1, -1, 0, 0][i], hb = [0, 0, 0, 0, -1, -1, -1, 0][i];
  return {
    ...A_BASE, breath: br,
    nearElbow: [22, 25 + hb], near: [27, 26 + hb], nearAng: [27, 27, 26, 24, 23, 24, 26, 27][i],
    farElbow: [30, 23 + hb], far: [33, 23 + hb], farAng: [-27, -27, -28, -30, -31, -30, -28, -27][i],
    capeWave: (i * Math.PI) / 4, capeBack: [0, 1, 1, 1, 1, 0, 0, 0][i],
    tailFire: [i, [0, 0, 1, 1, 1, 0, 0, 0][i], 0],
  };
}

// Walk: a prowl on the shared legs; the blades counter-swing, the head dips a frame late, the
// scarf and the fire stream back.
function aWalk(i) {
  const bob = [0, 1, 0, 0, 0, 1, 0, 0][i];
  const lag = [0, 0, 1, 0, 0, 0, 1, 0][i];
  const s = Math.cos((i * Math.PI) / 4);
  return {
    ...A_BASE, bob, headDy: lag,
    legFar: GAIT[i], legNear: GAIT[(i + 4) % 8],
    nearElbow: [R(22 + s), 25 + bob], near: [R(27 + 2 * s), 26 + bob], nearAng: R(27 - 8 * s),
    farElbow: [R(30 - s), 23 + bob], far: [R(33 - 2 * s), 23 + bob], farAng: R(-27 - 8 * s),
    capeBack: [2, 3, 3, 2, 2, 3, 3, 2][i], capeWave: (i * Math.PI) / 2, droop: 3,
    lean: [0, 0, 0, 1, 0, 0, 0, 1][i],
    tailFire: [i, 2, 0],
  };
}

// The attack: coil back with both blades drawn (2 frames), the near blade slashes down and
// forward, the far blade's rising slash crosses it on the blow (frame 3) as the scarf's fire
// flares, follow-through, recover. The body lunges 3 px.
function aAttack(i) {
  const T = [
    { lean: -1, nearElbow: [18, 23], near: [17, 21], nearAng: -150, farElbow: [28, 25], far: [29, 28], farAng: 160 },
    { lean: -2, nearElbow: [17, 21], near: [17, 17], nearAng: -120, farElbow: [27, 26], far: [27, 29], farAng: 150 },
    { lean: 1, nearElbow: [24, 22], near: [30, 23], nearAng: 15, farElbow: [28, 26], far: [29, 29], farAng: 120, trails: [[19, 21, -120, 15, 13, 8]] },
    { lean: 2, nearElbow: [24, 25], near: [30, 28], nearAng: 50, farElbow: [30, 22], far: [34, 20], farAng: -40, trails: [[28, 21, -40, 120, 12, 8, true], [19, 21, -40, 50, 13, 10]] },
    { lean: 2, nearElbow: [23, 26], near: [28, 29], nearAng: 70, farElbow: [30, 21], far: [34, 19], farAng: -60 },
    { lean: 1, nearElbow: [21, 25], near: [25, 27], nearAng: 25, farElbow: [29, 24], far: [32, 24], farAng: -35 },
  ][i];
  const q = { ...A_BASE, ...T, capeBack: [0, 1, 2, 3, 3, 1][i], droop: [5, 4, 3, 2, 2, 4][i], capeWave: i * 0.9, tailFire: [i, 1, [0, 1, 1, 2, 1, 0][i]] };
  if (i >= 2 && i <= 4) {
    q.legFar = { k: [5, 33], a: [6, 36], foot: 'flat' };
    q.legNear = GAIT[4];
  }
  return q;
}

// ------------------------------------------------------------- frames --

let aCache;
export const pics = () => (aCache ??= [
  ...Array.from({ length: 8 }, (_, i) => assassinFrame(aIdle(i))),
  ...Array.from({ length: 8 }, (_, i) => assassinFrame(aWalk(i))),
  ...Array.from({ length: 6 }, (_, i) => assassinFrame(aAttack(i))),
]);

const LISTS = { idle: [0, 1, 2, 3, 4, 5, 6, 7], walk: [8, 9, 10, 11, 12, 13, 14, 15], attack: [16, 17, 18, 19, 20, 21] };

export default [
  {
    cls: 'rogue',
    id: 'remaster-v3',
    name: 'Remaster V3 · Shadow',
    description: 'Kael as a hooded assassin, in shadow: a dark plum hood whose point hooks forward over two slanted eyes that glow in the dark, a mask, a lilac rim of moonlight on his top-left edges, a magenta scarf streaming behind and burning out in a lick of violet fire, twin daggers, dark boots under light knee guards. He prowls on two legs; his attack crosses two white blade trails as the fire flares.',
    collection: 'Remasters',
    def: {
      gen: () => pics().map((p) => toBuf(p, PAL)), emissive: 'z',
      ...LISTS, attackFps: 14, motionRate: 11 / (9.8 * 1.2), idleRate: 6 / 1.6,
      anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false,
    },
  },
];
