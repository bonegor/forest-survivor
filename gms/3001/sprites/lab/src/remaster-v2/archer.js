// Lyra, the Ranger (remaster-v2).
import { Pic, palette, outline, dropStrays, toBuf, across, folds, stroke, leg, GAIT, STAND, stamped, despeckle, R } from './kit.js';

const PAL = palette({
  k: 'k',
  // hood and cloak: leaf green, light to dark
  l: 'l', L: 'L', e: 'e', E: 'E',
  // leather: bow, vest, belt, trousers, boots
  T: 'T', t: 't', B: 'B', b: 'b', m: 'm',
  // skin and hair
  s: 's', S: 'S', d: 'd',
  // bowstring and arrowhead, fletching, buckle
  G: 'G', g: 'g', w: 'w', r: 'r', y: 'y',
});

// Hood with the face in its opening (an auburn fringe, an eye looking ahead), the leather vest,
// the belt. Placed at (17, 11).
const BODY = [
  '...LL........', // 11
  '...LlLe......', // 12
  '..LlLLLee....', // 13
  '..LlLLLLeeE..', // 14
  '.LlLLLLeeEEE.', // 15
  '.LLLLeeEddSS.', // 16
  'LLLLeeEdSwks.', // 17
  'LLLeeeEdssssS', // 18
  'eLeeeEEdSssS.', // 19
  'eeeEEEEESSS..', // 20
  '.LLeeeeEE....', // 21
  '..TttBBbb....', // 22
  '..tttBBbb....', // 23
  '..ttBBBbb....', // 24
  '..tBBBbbm....', // 25
  '...BBbbbm....', // 26
  '...mmymmm....', // 27
  '...tBBbbbm...', // 28
  '...BBbbbmm...', // 29
];

// The quiver on her back, its mouth over the near shoulder with three fletched arrows fanning up
// and back: white tips, grey vanes, a red band. Placed at (10, 9).
const QUIVER = [
  'ww..ww...',
  'wG.wG..w.',
  '.Gr.Gr.Gw',
  '..r..rrG.',
  '...tttB..',
  '...BBbm..',
  '....Bbbm.',
  '....Bbbm.',
  '.....Bbm.',
  '.....Bbm.',
  '......bm.',
];

// Legs: trousers to the knee (b with a lit B edge), boots below with a t cuff.
const NEAR = (s, x, y) => (y <= 33 ? { E: 'B', A: 'B', B: 'b', C: 'm', D: 'm' } : y === 34 ? { E: 't', A: 't', B: 't', C: 'B', D: 'm' } : { E: 't', A: 'B', B: 'b', C: 'm', D: 'm' })[s];
const FAR = (s, x, y) => (y <= 33 ? { E: 'b', A: 'b', B: 'm', C: 'm', D: 'm' } : y === 34 ? { E: 'B', A: 'B', B: 'B', C: 'b', D: 'm' } : { E: 'B', A: 'b', B: 'm', C: 'm', D: 'm' })[s];

function arm(p, sh, el, hand, near) {
  stroke(p, sh[0], sh[1], el[0], el[1], 1.2, 1.05, across(near ? ['L', 'e', 'E'] : ['e', 'E', 'E']));
  stroke(p, el[0], el[1], hand[0], hand[1], 1.05, 0.95, across(near ? ['t', 'B', 'b'] : ['B', 'b', 'm']));
  p.set(R(hand[0]), R(hand[1]), near ? 's' : 'S');
}

// The bow: grip at g, limbs `half` long, bent back by `flex` (0 rest, 1 full draw), tilted
// `tilt` degrees with the top limb forward. Limbs in t / T, b tips, a leather grip; the string
// one pixel of G from tip to tip, or to the nock when drawn.
function bow(p, g, half, flex, tilt, nock) {
  const sag = 3.6 + flex * 2.6, tt = Math.tan((tilt * Math.PI) / 180);
  const pts = [];
  for (let i = -half; i <= half; i++) {
    const t = i / half, a = Math.abs(t);
    let x = g[0] - sag * t * t - tt * i;
    if (a > 0.82) x += (a - 0.82) * (7 - flex * 3);
    pts.push([R(x), g[1] + i]);
  }
  const s = new Pic();
  const [t0, t1] = [pts[0], pts[pts.length - 1]];
  if (nock) s.line(t0[0], t0[1], nock[0], nock[1], 'G').line(nock[0], nock[1], t1[0], t1[1], 'G');
  else s.line(t0[0], t0[1], t1[0], t1[1], 'G');
  const limb = new Pic();
  for (let i = 1; i < pts.length; i++) limb.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 't');
  for (let i = 0; i < limb.c.length; i++) {
    if (!limb.c[i]) continue;
    const d = Math.abs(((i / 48) | 0) - g[1]);
    limb.c[i] = d < 2 ? 'm' : d < half * 0.5 ? 'T' : d > half - 2 ? 'b' : 't';
  }
  // The belly's second ply near the grip, in shade.
  for (let i = -Math.floor(half * 0.5); i <= Math.floor(half * 0.5); i++) {
    const [x, y] = pts[i + half];
    if (Math.abs(i) >= 2) limb.set(x + 1, y, 'B');
  }
  p.over(s);
  p.over(limb);
}

function cloak(p, by, back, wave) {
  const top = 21 + by, hem = 33 + by;
  const tail = 14 - back;
  const H = (x) => hem + R(Math.sin((x + wave * 1.5) * 1.2) * 0.6);
  const pts = [[17, top], [21, top], [21, H(21) - 1]];
  for (let x = 20; x >= tail; x--) pts.push([x, H(x)]);
  pts.push([tail - 0.5, hem - 2], [15 - back * 0.5, top + 6], [16, top + 2]);
  p.poly(pts, 'e');
  folds(p, [19, top - 2], [[tail - 3, hem + 3], [tail + 2 + wave * 0.4, hem + 5], [19 - back * 0.3, hem + 6], [23, hem + 5]], ['l', 'L', 'e', 'E', 'E'], { lit: 0.35, dark: 0.33 });
}

function rangerFrame(q) {
  const pic = new Pic();
  const by = q.bob, br = q.breath || 0, hy = q.headDy || 0;
  const c = new Pic();
  cloak(c, by + br, q.cloakBack || 0, q.cloakWave || 0);
  pic.over(c);
  pic.over(stamped(QUIVER, 10, 9 + by + br + (q.quiverDy || 0)), { sep: 'm', sides: 'rd' });
  // Legs from one hip column.
  pic.over(leg(new Pic(), 23, 30 + by, q.far, FAR));
  pic.over(leg(new Pic(), 23, 30 + by, q.near, NEAR), { sep: 'k', sides: 'rd' });
  // The bow arm reaches forward to the grip, behind the body.
  const fa = new Pic();
  arm(fa, [26, 22 + by + br], q.bowElbow, q.grip, false);
  pic.over(fa, { sep: 'E', sides: 'd' });
  const body = new Pic();
  const lean = q.lean || 0, tip = q.hoodTip || 0;
  BODY.forEach((row, j) => body.stamp([row], 17 + (j <= 10 ? lean : 0) + (j <= 2 ? tip : 0), 11 + j + by + (j < 16 ? br : 0) + (j <= 9 ? hy : 0)));
  pic.over(body);
  // Bow, string and arrow.
  const b = new Pic();
  bow(b, q.grip, 11, q.flex || 0, q.tilt ?? 12, q.nock || null);
  if (q.arrow) {
    const [ax0, ay0, ax1, ay1] = q.arrow;
    b.line(ax0, ay0, ax1, ay1, 't');
    b.set(ax1, ay1, 'G').set(ax1 + 1, ay1, 'w');
    b.set(ax0, ay0 - 1, 'w').set(ax0 + 1, ay0 - 1, 'r');
  }
  pic.over(b, { sep: (c) => (c === 'k' ? 'k' : 'm'), sides: 'lrd' });
  pic.set(q.grip[0], q.grip[1], 'S').set(q.grip[0], q.grip[1] - 1, 's');
  // The drawing arm, in front.
  const na = new Pic();
  arm(na, [20, 22 + by + br], q.elbow, q.hand, true);
  pic.over(na, { sep: 'k', sides: 'rd' });
  despeckle(pic, ['B', 'b', 'm', 'e', 'E', 'L', 'l', 't']);
  return dropStrays(outline(pic, 'k'));
}

// ---------------------------------------------------------------- poses --

const BASE = {
  bob: 0, breath: 0, headDy: 0,
  near: STAND.back, far: STAND.front,
  bowElbow: [29, 24], grip: [33, 26], flex: 0, tilt: 12,
  elbow: [19.5, 25], hand: [21, 28],
  cloakBack: 0, cloakWave: 0, quiverDy: 0,
};

// Idle: the breath lifts chest and head (frames 3-5); the bow sways a pixel with it, the
// drawing hand rests on the hip and the cloak hem follows a frame later, 2 px.
function idle(i) {
  const br = [0, 0, 0, -1, -1, -1, 0, 0][i];
  return {
    ...BASE, breath: br,
    bowElbow: [29, 24 + br], grip: [33, 26 + br], tilt: [12, 12, 13, 14, 14, 13, 12, 12][i],
    elbow: [19.5, 25 + br], hand: [21, 28 + br],
    cloakWave: [0, 0, 0, 1, 2, 2, 1, 0][i], cloakBack: [0, 0, 0, 0, 1, 2, 1, 0][i],
    quiverDy: [0, 0, 0, 0, -1, -1, 0, 0][i],
  };
}

// Walk: one hip column, an 11 px stride, the passing foot lifted 3 px; the bow arm and the
// drawing hand counter-swing; the head, quiver and cloak trail the body's dip by a frame.
function walk(i) {
  const bob = [0, 1, 0, 0, 0, 1, 0, 0][i];
  const lag = [0, 0, 1, 0, 0, 0, 1, 0][i];
  const s = Math.cos((i * Math.PI) / 4); // +1: the near arm forward (the near leg is behind)
  return {
    ...BASE, bob, headDy: lag,
    far: GAIT[i], near: GAIT[(i + 4) % 8],
    bowElbow: [29 - s, 24 + bob + lag], grip: [R(33 - s), 26 + bob + lag], tilt: 12 + (i % 2 ? 4 : 0),
    elbow: [19.5 + s, 25 + bob], hand: [R(21 + 3 * s), 28 + bob],
    cloakBack: [1, 2, 3, 2, 1, 2, 3, 2][i], cloakWave: i,
    quiverDy: lag, lean: [0, 0, 0, 1, 0, 0, 0, 1][i], hoodTip: [0, -1, -1, 0, 0, -1, -1, 0][i],
  };
}

// Draw and release. Attack frame 4 (frame 20) is the release: the arrow has left, the string
// is straight, the drawing hand flung back.
const DRAW = [
  { grip: [34, 23], bowElbow: [30, 22], nock: null, elbow: [22, 24], hand: [27, 23], flex: 0, tilt: 4, arrow: [27, 23, 38, 23] },
  { grip: [35, 23], bowElbow: [31, 22], nock: [26, 23], elbow: [22, 24], hand: [26, 23], flex: 0.4, tilt: 3, arrow: [26, 23, 38, 23] },
  { grip: [35, 23], bowElbow: [31, 22], nock: [23, 23], elbow: [19, 23], hand: [23, 23], flex: 1, tilt: 2, arrow: [23, 23, 38, 23] },
  { grip: [35, 23], bowElbow: [31, 22], nock: [23, 23], elbow: [19, 23], hand: [23, 23], flex: 1, tilt: 2, arrow: [23, 23, 38, 23] },
  { grip: [35, 23], bowElbow: [31, 22], nock: null, elbow: [18, 22], hand: [19, 20], flex: 0, tilt: 3 },
  { grip: [34, 24], bowElbow: [30, 23], nock: null, elbow: [19, 24], hand: [21, 25], flex: 0, tilt: 6 },
];
function attack(a, w = null) {
  const base = w === null ? { ...BASE, far: STAND.front, near: STAND.back, cloakBack: [0, 0, 1, 1, 2, 1][a] } : walk(w);
  const d = DRAW[a], by = base.bob;
  return {
    ...base, ...d,
    grip: [d.grip[0], d.grip[1] + by], bowElbow: [d.bowElbow[0], d.bowElbow[1] + by],
    nock: d.nock && [d.nock[0], d.nock[1] + by], elbow: [d.elbow[0], d.elbow[1] + by], hand: [d.hand[0], d.hand[1] + by],
    arrow: d.arrow && [d.arrow[0], d.arrow[1] + by, d.arrow[2], d.arrow[3] + by],
  };
}

let cache;
export const pics = () => (cache ??= [
  ...Array.from({ length: 8 }, (_, i) => rangerFrame(idle(i))),
  ...Array.from({ length: 8 }, (_, i) => rangerFrame(walk(i))),
  ...Array.from({ length: 6 }, (_, a) => rangerFrame(attack(a))),
  // Shooting while walking: each draw frame over each walk step (frames 22..69).
  ...Array.from({ length: 6 }, (_, a) => Array.from({ length: 8 }, (_, w) => rangerFrame(attack(a, w)))).flat(),
]);
const gen = () => pics().map((p) => toBuf(p, PAL));

export default [{
  cls: 'archer',
  id: 'remaster-v2',
  name: 'Remaster V2 · Ranger',
  description: 'Lyra in a leaf-green hood and cloak over tan leather, a tilted recurve longbow with a grey string, a fletched quiver. Wired for the game: she looses on attack frame 4 (frame 20) and shoots while walking (attackWalk, frames 22-69).',
  collection: 'Remasters',
  def: {
    gen,
    idle: [0, 1, 2, 3, 4, 5, 6, 7], walk: [8, 9, 10, 11, 12, 13, 14, 15], attack: [16, 17, 18, 19, 20, 21],
    attackFps: 13, attackRelease: 4,
    attackWalk: Array.from({ length: 6 }, (_, a) => Array.from({ length: 8 }, (_, w) => 22 + a * 8 + w)),
    motionRate: 12 / (9.8 * 1.15), idleRate: 6 / 1.6,
    anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false,
  },
}];
