// Lyra, the Ranger (remaster-v3).
import { Pic, palette, outline, dropStrays, toBuf, across, folds, stroke, leg, GAIT, stamped, despeckle, R, softenNotches } from './kit.js';

const PAL = palette({
  k: 'k',
  // hood and cloak: leaf green, light to dark
  l: 'l', L: 'L', e: 'e', E: 'E',
  // leather: bow, vest, belt, bracers, trousers, boots
  // (b a touch lighter than the master's #733e39, which sits on the night line, so it clears by 4)
  T: 'T', t: 't', B: 'B', b: '#7d4540', m: 'm',
  // skin and hair
  s: 's', S: 'S', d: 'd',
  // bowstring and arrowhead, fletching, buckle
  G: 'G', g: 'g', w: 'w', r: 'r', y: 'y',
});

// Hood with the face in its opening: a lit rim on the hood's top-left, an auburn fringe, a lid
// line over the eye, the chin raised; the leather vest and a light belt. Placed at (17, 11).
const BODY = [
  '...lL........', // 11
  '...lLLe......', // 12
  '..lLLLLe.....', // 13
  '..lLLLLeeE...', // 14
  '.lLLLLeeeEE..', // 15
  '.lLLLeeEdbbS.', // 16  the lid line
  'lLLLeeEdSwks.', // 17  the eye
  'lLLeeeEdssssS', // 18
  'eLeeeEEdSssS.', // 19  the chin, raised
  'eeeeeEEEEe...', // 20
  '.LLeeeeee....', // 21
  '..TttBBBb....', // 22
  '..tttBBBb....', // 23
  '..ttBBBBb....', // 24
  '..tBBBBbm....', // 25
  '...BBBbbm....', // 26
  '...ttyttb....', // 27  belt
  '...tBBbbbm...', // 28
  '...BBbbbmm...', // 29
];

// The quiver on her back, its mouth over the near shoulder with three fletched arrows fanning up
// and back: white tips, grey vanes, a red band. Placed at (10, 9).
const QUIVER = [
  'ww.ww....',
  'GG.GG.ww.',
  '.rr.rrGG.',
  '..r..rrr.',
  '...tttB..',
  '...BBbm..',
  '....Bbbm.',
  '....Bbbm.',
  '.....Bbm.',
  '.....Bbm.',
  '......bm.',
];

// Legs: trousers to the knee (b with a lit B edge), boots below with a t cuff.
const NEAR = (s, x, y) => (y <= 33 ? { E: 't', A: 't', B: 'B', C: 'b', D: 'm' } : y === 34 ? { E: 't', A: 't', B: 't', C: 'B', D: 'm' } : { E: 't', A: 'B', B: 'B', C: 'b', D: 'm' })[s];
const FAR = (s, x, y) => (y <= 33 ? { E: 'B', A: 'B', B: 'b', C: 'm', D: 'm' } : y === 34 ? { E: 'B', A: 'B', B: 'B', C: 'b', D: 'm' } : { E: 'B', A: 'B', B: 'b', C: 'm', D: 'm' })[s];

// The hunter's stance: feet wide (soles at x 17-21 and 28-32), the back knee bent.
const STANCE = {
  back: { k: [-3, 33], a: [-5, 36], foot: 'flat' },
  front: { k: [4, 33], a: [6, 36], foot: 'flat' },
};

function arm(p, sh, el, hand, near) {
  stroke(p, sh[0], sh[1], el[0], el[1], 1.2, 1.05, across(near ? ['L', 'e', 'E'] : ['e', 'E', 'E']));
  // Light leather bracers on the forearms.
  stroke(p, el[0], el[1], hand[0], hand[1], 1.0, 0.9, across(near ? ['t', 'B', 'b'] : ['t', 'B', 'b']));
  p.set(R(hand[0]), R(hand[1]), near ? 's' : 'S');
}

// The bow, turned `tilt` degrees with the top limb forward: grip at g, limbs `half` long, bent
// back by `flex` (0 at rest, 1 at full draw, below 0 springing past rest on the release). Limbs in
// t / T with b tips and a leather grip; the string one pixel of G from tip to tip, or to the nock
// when drawn. Returns the tips, the string's middle and the forward direction (for an arrow).
function bow(p, g, half, flex, tilt, nock) {
  const th = (tilt * Math.PI) / 180;
  const u = [-Math.sin(th), Math.cos(th)], f = [Math.cos(th), Math.sin(th)];
  const sag = 3.6 + flex * 2.6;
  const pts = [];
  for (let i = -half; i <= half; i++) {
    const t = i / half, a = Math.abs(t);
    let c = -sag * t * t;
    if (a > 0.82) c += (a - 0.82) * (7 - flex * 3);
    pts.push([R(g[0] + u[0] * i + f[0] * c), R(g[1] + u[1] * i + f[1] * c)]);
  }
  const [t0, t1] = [pts[0], pts[pts.length - 1]];
  const mid = [R((t0[0] + t1[0]) / 2), R((t0[1] + t1[1]) / 2)];
  const s = new Pic();
  if (nock) s.line(t0[0], t0[1], nock[0], nock[1], 'G').line(nock[0], nock[1], t1[0], t1[1], 'G');
  else s.line(t0[0], t0[1], t1[0], t1[1], 'G');
  const limb = new Pic();
  for (let i = 1; i < pts.length; i++) limb.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 't');
  pts.forEach(([x, y], k) => {
    const d = Math.abs(k - half);
    limb.set(x, y, d < 2 ? 'm' : d < half * 0.5 ? 'T' : d > half - 2 ? 'b' : 't');
    // The belly's second ply near the grip, in shade.
    const bx = x + R(-f[0]), byy = y + R(-f[1] * 0.6);
    if (d >= 2 && d <= half - 2 && !limb.get(bx, byy)) limb.set(bx, byy, d <= half * 0.5 ? 'B' : 'b');
  });
  p.over(s);
  p.over(limb);
  return { t0, t1, mid, f };
}

function cloak(p, by, back, wave) {
  const top = 21 + by, hem = 31 + by;
  const tail = 14 - back;
  const H = (x) => hem + R(Math.sin((x + wave * 1.5) * 1.2) * 0.6);
  const pts = [[17, top], [21, top], [21, H(21) - 1]];
  for (let x = 20; x >= tail; x--) pts.push([x, H(x)]);
  pts.push([tail - 0.5, hem - 2], [15 - back * 0.5, top + 5], [16, top + 2]);
  p.poly(pts, 'L');
  // Folds in bands; the deepest fold in e, so the cloak stays readable at night.
  folds(p, [19, top - 2], [[tail - 3, hem + 3], [tail + 2 + wave * 0.4, hem + 5], [19 - back * 0.3, hem + 6], [23, hem + 5]], ['l', 'L', 'L', 'e', 'e'], { lit: 0.35, dark: 0.35 });
}

function rangerFrame(q) {
  const pic = new Pic();
  const by = q.bob, br = q.breath || 0, hy = q.headDy || 0, lean = q.lean || 0;
  const c = new Pic();
  cloak(c, by + br, q.cloakBack || 0, q.cloakWave || 0);
  pic.over(c);
  pic.over(stamped(QUIVER, 10, 9 + by + br + (q.quiverDy || 0)), { sep: 'm', sides: 'rd' });
  // Legs from one hip column.
  pic.over(leg(new Pic(), 23, 30 + by, q.far, FAR));
  pic.over(leg(new Pic(), 23, 30 + by, q.near, NEAR), { sep: 'm', sides: 'rd' });
  // The bow arm reaches forward to the grip, behind the body.
  const fa = new Pic();
  arm(fa, [26 + lean, 22 + by + br], q.bowElbow, q.grip, false);
  pic.over(fa, { sep: 'E', sides: 'd' });
  const body = new Pic();
  const tip = q.hoodTip || 0;
  BODY.forEach((row, j) => body.stamp([row], 17 + (j <= 10 ? lean : 0) + (j <= 2 ? tip : 0), 11 + j + by + (j < 16 ? br : 0) + (j <= 9 ? hy : 0)));
  pic.over(body);
  // Bow, string and the arrow.
  const b = new Pic();
  const { f } = bow(b, q.grip, 10, q.flex || 0, q.tilt ?? 28, q.nock || null);
  if (q.arrow) {
    const [ax0, ay0, len] = q.arrow;
    const ex = R(ax0 + f[0] * len), ey = R(ay0 + f[1] * len);
    b.line(ax0, ay0, ex, ey, 't');
    b.set(ex, ey, 'G').set(R(ex + f[0]), R(ey + f[1]), 'w');
    b.set(ax0, ay0 - 1, 'w').set(ax0 + 1, ay0 - 1, 'r');
  }
  pic.over(b, { sep: (cc) => (cc === 'k' ? 'k' : 'm'), sides: 'lrd' });
  pic.set(q.grip[0], q.grip[1], 'S').set(q.grip[0], q.grip[1] - 1, 's');
  // The drawing arm, in front.
  const na = new Pic();
  arm(na, [20 + lean, 22 + by + br], q.elbow, q.hand, true);
  pic.over(na, { sep: 'm', sides: 'rd' });
  despeckle(pic, ['B', 'b', 'm', 'e', 'E', 'L', 'l', 't']);
  // Ink notches: soften them in the cloak's greens anywhere, and in the leather only at the
  // boots (rows 34 and down), never beside the bow.
  return softenNotches(softenNotches(dropStrays(outline(pic, 'k')), 'Ee'), 'mbB', (x, y) => y < 34);
}

// ---------------------------------------------------------------- poses --

// Idle: a hunter's low ready. The bow held low and turned 28 degrees with an arrow on the string,
// her drawing hand at the nock, weight forward. The breath lifts chest and head (frames 3-5);
// the hood's point, the cloak's hem and the fletching run on a continuous wave and the bow rocks,
// so no two frames are alike.
function idle(i) {
  const br = [0, 0, 0, -1, -1, -1, 0, 0][i];
  const rock = [0, 1, 1, 2, 1, 1, 0, -1][i];
  return {
    bob: 0, breath: br, lean: 1,
    far: STANCE.front, near: STANCE.back,
    bowElbow: [29, 25 + br], grip: [32, 28 + br], tilt: 28 + rock, flex: 0.1,
    nock: null, arrow: [27, 27 + br, 12],
    elbow: [21, 28 + br], hand: [27, 27 + br],
    cloakWave: i, cloakBack: [0, 0, 1, 1, 2, 2, 1, 0][i],
    quiverDy: [0, 0, 0, 0, -1, -1, -1, 0][i], hoodTip: [0, 0, -1, -1, -1, 0, 0, 0][i],
  };
}

// Walk: one hip column, an 11 px stride, the passing foot lifted 3 px. The bow is carried low and
// turned, swinging with the bow arm against the stride; the free hand swings 3 px; the head,
// hood point, quiver and cloak trail the body's dip by a frame.
function walk(i) {
  const bob = [0, 1, 0, 0, 0, 1, 0, 0][i];
  const lag = [0, 0, 1, 0, 0, 0, 1, 0][i];
  const s = Math.cos((i * Math.PI) / 4); // +1: the near arm forward (the near leg is behind)
  return {
    bob, headDy: lag, lean: [0, 0, 0, 1, 0, 0, 0, 1][i],
    far: GAIT[i], near: GAIT[(i + 4) % 8],
    bowElbow: [29 - s, 25 + bob + lag], grip: [R(32 - s), 28 + bob + lag], tilt: 28 + (i % 2 ? 3 : -2), flex: 0,
    elbow: [19.5 + s, 25 + bob], hand: [R(21 + 3 * s), 28 + bob],
    cloakBack: [1, 2, 3, 2, 1, 2, 3, 2][i], cloakWave: i,
    quiverDy: lag, hoodTip: [0, -1, -1, 0, 0, -1, -1, 0][i],
  };
}

// Draw and release: the bow comes up from the low ready and turns upright, the string is drawn
// to the cheek. Attack frame 4 (frame 20) is the release: the arrow has left, the bow hand kicks
// forward, the limbs spring past rest, the drawing hand flies 3 px past the cheek and the body
// rocks back; frame 21 settles.
const DRAW = [
  { grip: [34, 24], bowElbow: [30, 23], nock: null, elbow: [22, 24], hand: [28, 23], flex: 0, tilt: 10, arrow: [28, 23, 11], lean: 1 },
  { grip: [35, 23], bowElbow: [31, 22], nock: [26, 23], elbow: [22, 24], hand: [26, 23], flex: 0.4, tilt: 4, arrow: [26, 23, 12], lean: 1 },
  { grip: [35, 23], bowElbow: [31, 22], nock: [23, 23], elbow: [19, 23], hand: [23, 23], flex: 0.9, tilt: 2, arrow: [23, 23, 14], lean: 0 },
  { grip: [35, 23], bowElbow: [31, 22], nock: [23, 23], elbow: [19, 23], hand: [23, 23], flex: 0.9, tilt: 2, arrow: [23, 23, 14], lean: 0 },
  { grip: [37, 23], bowElbow: [32, 22], nock: null, elbow: [18, 21], hand: [19, 20], flex: -0.4, tilt: 1, lean: -1 },
  { grip: [35, 24], bowElbow: [31, 23], nock: null, elbow: [19, 23], hand: [21, 24], flex: 0, tilt: 6, lean: 0 },
];
function attack(a, w = null) {
  const base = w === null
    ? { bob: 0, breath: 0, headDy: 0, far: STANCE.front, near: STANCE.back, cloakBack: [0, 0, 1, 1, 2, 1][a], cloakWave: a, quiverDy: 0, hoodTip: 0 }
    : walk(w);
  const d = DRAW[a], by = base.bob;
  return {
    ...base, ...d,
    grip: [d.grip[0], d.grip[1] + by], bowElbow: [d.bowElbow[0], d.bowElbow[1] + by],
    nock: d.nock && [d.nock[0], d.nock[1] + by], elbow: [d.elbow[0], d.elbow[1] + by], hand: [d.hand[0], d.hand[1] + by],
    arrow: d.arrow && [d.arrow[0], d.arrow[1] + by, d.arrow[2]],
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
  id: 'remaster-v3',
  name: 'Remaster V3 · Ranger',
  description: 'Lyra in a hunter\'s low ready: a leaf-green hood and cloak, feet wide and chin up, the recurve longbow held low and tipped forward with an arrow nocked and her near hand on the string; the hood tip, the cloak hem and the fletching sway through the idle. She draws to the cheek, and the release kicks the bow forward as the string hand flies back. She shoots while she walks.',
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
