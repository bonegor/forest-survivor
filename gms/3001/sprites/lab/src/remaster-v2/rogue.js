// Kael, the Shadow (remaster-v2): two takes for the owner to choose from.
//   remaster-v2         a hooded assassin on two legs, twin daggers, a violet flame aura
//   remaster-v2-wraith  the floating shade, rebuilt: a clear hood, face, shoulders and arms
import { Pic, palette, outline, dropStrays, toBuf, across, folds, stroke, leg, GAIT, STAND, stamped, despeckle, R } from './kit.js';

const PAL = palette({
  k: 'k',
  // shadow violet, dark to light, and the lilac of his fire and eyes
  h: 'h', q: 'q', p: 'p', j: 'j', V: '#b57fd9', '9': '#d9a6ff', w: 'w',
  // a magenta sash
  P: 'P',
  // dagger steel, the hilts' gold and leather
  G: 'G', g: 'g', N: 'N', y: 'y', d: 'd', b: 'b',
});

// ------------------------------------------------------------- shared --

// A dagger from the hand along `ang` (degrees: 0 right, 90 down): a 2-px blade 6 long, white
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

// Violet fire: nested teardrop tongues, each [x, y, radius, height, lean, wobble]: a round body
// over the base point, a pointed tip leaning and swaying; a bright lilac core low inside, violet
// around it, purple at the edge, deep violet at the root where it meets the body.
function aura(p, tongues) {
  const rank = { q: 0, p: 1, j: 2, V: 3, '9': 4 };
  for (const [bx, by, rb, h, lean, wob] of tongues) {
    for (let y = R(by - h - 1); y <= R(by + rb + 1); y++) for (let x = R(bx - rb - 4); x <= R(bx + rb + 4); x++) {
      const dy = (by - y) / h;
      let cx = bx, w;
      if (dy <= 0) w = Math.sqrt(Math.max(0, rb * rb - (y - by) ** 2));
      else {
        cx = bx + lean * dy * dy + wob * Math.sin(dy * Math.PI);
        w = Math.max(0.55, rb * Math.pow(Math.max(0, 1 - dy), 1.15));
      }
      const e = Math.abs(x - cx) / Math.max(0.01, w + 0.45);
      if (e > 1 || dy > 1) continue;
      let c = dy < 0.25 ? (e < 0.6 ? 'p' : 'q') : dy < 0.5 ? (e < 0.55 ? 'j' : 'p') : dy < 0.72 ? (e < 0.6 ? 'V' : 'j') : '9';
      const old = p.get(x, y);
      if (!old || rank[c] > (rank[old] ?? -1)) p.set(x, y, c);
    }
  }
}

// ------------------------------------------------------------ assassin --

// Hood with a pointed tip, the face in its shadow: two slanted glowing eyes over a dark mask;
// the shoulders and fitted tunic, the sash and belt. Placed at (16, 11).
const ASSASSIN = [
  '....Vj.......', // 11  the hood's tip
  '...VVjp......', // 12
  '..VVjjpp.....', // 13
  '..Vjjjppq....', // 14
  '.VVjjphkkk...', // 15  the face in the hood's shadow
  '.Vjjph9kkk9..', // 16  the eyes, slanted
  '.Vjjphkwkwk..', // 17
  '.Vjppqppppq..', // 18  the mask
  '..Vjppjppq...', // 19
  '..9jjpppj....', // 20  the scarf at the throat
  'VVjjjppppqq..', // 21  shoulders
  'Vjjjpppppq...', // 22
  '.Vjjpppqq....', // 23
  '.Vjppppqq....', // 24
  '..jjpppqq....', // 25
  '..PPPPPPP....', // 26  sash
  '..byybbbb....', // 27  belt
  '..jjpppqq....', // 28
  '...jppqq.....', // 29
];

const LEGS_NEAR = (s) => ({ E: 'V', A: 'V', B: 'j', C: 'p', D: 'q' })[s];
const LEGS_FAR = (s) => ({ E: 'j', A: 'j', B: 'p', C: 'q', D: 'h' })[s];

// A long scarf from the throat, streaming back in a wave: magenta, lit on top, with a lilac
// fringe at its end. back: how far it streams; wave: its ripple phase.
function scarf(p, by, back, wave) {
  const pts = [];
  for (let k = 0; k <= 8; k++) {
    const t = k / 8;
    pts.push([21 - k * (1.2 + back * 0.15), 20.5 + by + t * (3 - back * 0.4) + Math.sin(t * 5 + wave * 1.6) * 0.9]);
  }
  for (let k = 1; k < pts.length; k++) {
    const [x0, y0] = pts[k - 1], [x1, y1] = pts[k];
    p.line(R(x0), R(y0), R(x1), R(y1), 'P');
    p.line(R(x0), R(y0) + 1, R(x1), R(y1) + 1, k > 6 ? 'P' : 'p');
  }
  const [ex, ey] = pts[pts.length - 1];
  p.set(R(ex) - 1, R(ey), '9').set(R(ex) - 1, R(ey) + 1, 'V');
}

function assassinFrame(q) {
  const pic = new Pic();
  const by = q.bob, br = q.breath || 0, lean = q.lean || 0, hy = q.headDy || 0;
  // Fire aura behind everything, off the shoulders and the cape's tip.
  const fire = new Pic();
  aura(fire, q.aura.map(([x, y, r, h, l, w]) => [x + lean, y + by + br, r, h, l, w]));
  pic.over(fire);
  const sc = new Pic();
  scarf(sc, by + br + (q.headDy || 0), q.capeBack || 0, q.capeWave || 0);
  pic.over(sc.shift(lean, 0));
  // Far arm and its dagger, behind the body.
  const fa = new Pic();
  stroke(fa, 26 + lean, 22 + by + br, q.farElbow[0], q.farElbow[1], 1.1, 1.0, across(['j', 'p', 'q']));
  stroke(fa, q.farElbow[0], q.farElbow[1], q.far[0], q.far[1], 1.0, 0.9, across(['j', 'p', 'q']));
  dagger(fa, q.far, q.farAng);
  pic.over(fa);
  // Legs from one hip column.
  pic.over(leg(new Pic(), 23, 30 + by, q.legFar, LEGS_FAR));
  pic.over(leg(new Pic(), 23, 30 + by, q.legNear, LEGS_NEAR), { sep: 'h', sides: 'rd' });
  const body = new Pic();
  ASSASSIN.forEach((row, j) => body.stamp([row], 17 + lean + (j <= 10 ? q.headLean || 0 : 0), 11 + j + by + (j < 15 ? br : 0) + (j <= 8 ? hy : 0)));
  pic.over(body, { sep: 'h', sides: 'd' });
  // Slash trails over the body, under the near arm.
  if (q.trails) {
    const tr = new Pic();
    for (const [cx, cy, a0, a1, ro, ri, rev] of q.trails) trail(tr, [cx + lean, cy + by], a0, a1, ro, ri, rev);
    pic.over(tr);
  }
  // Near arm and its dagger, in front.
  const na = new Pic();
  stroke(na, 19 + lean, 22 + by + br, q.nearElbow[0], q.nearElbow[1], 1.15, 1.0, across(['V', 'j', 'p']));
  stroke(na, q.nearElbow[0], q.nearElbow[1], q.near[0], q.near[1], 1.05, 0.95, across(['V', 'j', 'p']));
  dagger(na, q.near, q.nearAng);
  pic.over(na, { sep: 'q', sides: 'rd' });
  despeckle(pic, ['p', 'q', 'j', 'h', 'V']);
  return dropStrays(outline(pic, 'k'));
}

// Fire tongues off the shoulders and the cape: [x, y, height, lean], flickering.
const AURA = [[19, 22, 2.3, 8, -3, 0.5], [16, 25, 1.9, 6, -3, -0.4]];
const SWAY = [[0, 1, 1, 0, -1, -1, 0, 0], [1, 0, -1, -1, 0, 1, 1, 0], [-1, -1, 0, 1, 1, 0, 0, -1]];
const auraAt = (i, blow = 0, grow = 0) => AURA.map(([x, y, r, h, l, w], k) => [x, y, r + grow * 0.2, h + grow, l + blow + SWAY[k][i % 8] * 0.8, w * (SWAY[k][(i + 2) % 8] || 1)]);

const A_BASE = {
  bob: 0, breath: 0, lean: 0, headDy: 0,
  legNear: STAND.back, legFar: STAND.front,
  nearElbow: [20, 26], near: [24, 28], nearAng: 20,
  farElbow: [29, 25], far: [32, 26], farAng: -30,
  capeBack: 0, capeWave: 0,
};

// Idle: a crouched readiness, daggers out, the near blade low and level, the far one raised;
// breath on 3-5, the cape and the fire a frame behind.
function aIdle(i) {
  const br = [0, 0, 0, -1, -1, -1, 0, 0][i];
  return {
    ...A_BASE, breath: br,
    nearElbow: [20, 26 + br], near: [24, 28 + br], nearAng: [20, 20, 18, 16, 15, 16, 18, 20][i],
    farElbow: [29, 25 + br], far: [32, 26 + br], farAng: [-30, -30, -32, -34, -35, -34, -32, -30][i],
    capeWave: [0, 0, 0, 1, 2, 2, 1, 0][i], capeBack: [0, 0, 0, 0, 1, 1, 1, 0][i],
    aura: auraAt(i),
  };
}

// Walk: a prowl on the shared legs; the blades counter-swing, the head dips a frame late, the
// cape and the fire stream back.
function aWalk(i) {
  const bob = [0, 1, 0, 0, 0, 1, 0, 0][i];
  const lag = [0, 0, 1, 0, 0, 0, 1, 0][i];
  const s = Math.cos((i * Math.PI) / 4);
  return {
    ...A_BASE, bob, headDy: lag,
    legFar: GAIT[i], legNear: GAIT[(i + 4) % 8],
    nearElbow: [R(20 + s), 26 + bob], near: [R(24 + 2 * s), 28 + bob], nearAng: R(20 - 10 * s),
    farElbow: [R(29 - s), 25 + bob], far: [R(32 - 2 * s), 26 + bob], farAng: R(-30 - 10 * s),
    capeBack: [2, 3, 3, 2, 2, 3, 3, 2][i], capeWave: i % 4,
    lean: [0, 0, 0, 1, 0, 0, 0, 1][i], headLean: [0, 0, 0, 0, 0, 0, 0, 0][i],
    aura: auraAt(i, -2),
  };
}

// The attack: coil back with both blades drawn (2 frames), the near blade slashes down and
// forward, the far blade's rising slash crosses it on the blow (frame 3) as the fire flares,
// follow-through, recover. The body lunges 3 px.
function aAttack(i) {
  const T = [
    { lean: -1, nearElbow: [18, 24], near: [17, 22], nearAng: -150, farElbow: [28, 26], far: [29, 29], farAng: 160 },
    { lean: -2, nearElbow: [17, 22], near: [17, 18], nearAng: -120, farElbow: [27, 27], far: [27, 30], farAng: 150 },
    { lean: 1, nearElbow: [24, 23], near: [30, 24], nearAng: 15, farElbow: [28, 27], far: [29, 30], farAng: 120, trails: [[19, 22, -120, 15, 13, 8]] },
    { lean: 2, nearElbow: [24, 26], near: [30, 29], nearAng: 50, farElbow: [30, 23], far: [34, 21], farAng: -40, trails: [[28, 22, -40, 120, 12, 8, true], [19, 22, -40, 50, 13, 10]] },
    { lean: 2, nearElbow: [23, 27], near: [28, 30], nearAng: 70, farElbow: [30, 22], far: [34, 20], farAng: -60 },
    { lean: 1, nearElbow: [21, 26], near: [25, 28], nearAng: 25, farElbow: [29, 25], far: [32, 25], farAng: -35 },
  ][i];
  const q = { ...A_BASE, ...T, capeBack: [0, 1, 2, 3, 3, 1][i], aura: auraAt(i, -1, [0, 1, 2, 3, 2, 1][i]) };
  if (i >= 2 && i <= 4) {
    q.legFar = { k: [5, 33], a: [6, 36], foot: 'flat' };
    q.legNear = GAIT[4];
  }
  return q;
}

// --------------------------------------------------------------- wraith --

// The floating shade: a tall hood hooked forward over a void face with two slanted eyes, clear
// shoulders, and a body tapering into a tail whose lowest wisp stays on row 38. Placed at (14, 11).
const WRAITH = [
  '...........Vj....', // 11
  '..........VVjp...', // 12
  '..........Vjjpp..', // 13
  '.........VVjppq..', // 14
  '.........Vjphkkkq', // 15
  '........VVjpkkkkh', // 16
  '........Vjph9kk9h', // 17
  '.......VVjphkwkwh', // 18
  '.......Vjjphkkkkh', // 19
  '.....VVVjjppqhkh.', // 20
  '...VVVjjjjpppppq.', // 21  shoulders
  '..VVjVVjjpppppjpq', // 22
  '..Vj9jVjppppppjp.', // 23
  '...VVjjjpppppqp..', // 24
  '....Vjjjppppqq...', // 25
  '....VVjjpppqq....', // 26
  '.....Vjjppqqq....', // 27
  '.....VVjppqq.....', // 28
  '......Vjppq......', // 29
];

// The tail: one wisp curling back from under the body to its tip on row 38; two short ones.
function tail(p, by, back, wave) {
  const W = [
    [22.5, 29 + by, 38, -3 - back * 0.7, 2.3, wave],
    [25, 28 + by, 34 + by, -2 - back, 1.4, -wave],
    [20.5, 28 + by, 33 + by, -3 - back, 1.3, wave],
  ];
  for (const [x0, y0, y1, lean, r, wv] of W) {
    const n = y1 - y0;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const hw = r * (1 - Math.pow(t, 1.3));
      const cx = x0 + lean * t * t + wv * Math.sin(t * Math.PI) * 0.8;
      const a = R(cx - hw), b = R(cx + hw);
      for (let x = a; x <= b; x++) p.set(x, y0 + i, x === a && b > a ? 'V' : t > 0.6 ? 'j' : 'p');
    }
  }
}

// His crown of violet fire: tongues rooted in the back of the hood and the shoulders.
const W_FIRE = [[21, 15, 2.6, 8, -3, 0.6], [18, 19, 2.4, 8, -3, -0.5], [15, 23, 2.0, 6, -3, 0.5]];
const wFire = (i, blow = 0, grow = 0) => W_FIRE.map(([x, y, r, h, l, w], k) => [x, y, r + grow * 0.2, h + grow, l + blow + SWAY[k][i % 8] * 0.8, w * (SWAY[k][(i + 2) % 8] || 1)]);

function wraithFrame(q) {
  const pic = new Pic();
  const by = q.bob, lean = q.lean || 0, shear = q.shear || 0;
  const fire = new Pic();
  aura(fire, wFire(q.flame, -(q.blow || 0), q.flare || 0).map(([x, y, r, h, l, w]) => [x + lean, y + by, r, h, l, w]));
  pic.over(fire);
  // Far arm with its dagger, behind the body.
  const fa = new Pic();
  stroke(fa, 27 + lean, 22 + by, q.far[0], q.far[1], 1.0, 0.85, across(['p', 'q', 'h']));
  dagger(fa, q.far, q.farAng);
  pic.over(fa);
  const b = new Pic();
  tail(b, by, q.back || 0, q.wave || 0);
  WRAITH.forEach((row, j) => b.stamp([row], 14 + lean + R((shear * (WRAITH.length - 1 - j)) / (WRAITH.length - 1)), 11 + j + by));
  pic.over(b, { sep: 'h', sides: 'd' });
  if (q.trails) {
    const tr = new Pic();
    for (const [cx, cy, a0, a1, ro, ri, rev] of q.trails) trail(tr, [cx + lean, cy + by], a0, a1, ro, ri, rev);
    pic.over(tr);
  }
  // Near arm and dagger, in front.
  const na = new Pic();
  stroke(na, 19 + lean, 23 + by, q.nearElbow[0], q.nearElbow[1], 1.2, 1.05, across(['j', 'p', 'q']));
  stroke(na, q.nearElbow[0], q.nearElbow[1], q.near[0], q.near[1], 1.05, 0.95, across(['j', 'p', 'q']));
  dagger(na, q.near, q.nearAng);
  pic.over(na, { sep: 'h', sides: 'rd' });
  despeckle(pic, ['p', 'q', 'j', 'h', 'V']);
  return dropStrays(outline(pic, 'k'));
}

const W_BASE = { bob: 0, lean: 0, shear: 0, back: 0, wave: 0, flame: 0, nearElbow: [19, 27], near: [22, 30], nearAng: 100, far: [31, 26], farAng: 10 };

function wIdle(i) {
  const bob = [0, 0, 0, 1, 1, 1, 0, 0][i];
  return {
    ...W_BASE, bob, wave: [0, 1, 1, 1, 0, -1, -1, -1][i], flame: [0, 0, 1, 1, 2, 2, 3, 3][i],
    nearElbow: [19, 27 + bob], near: [22, 30 + bob], nearAng: [100, 100, 104, 108, 110, 108, 104, 100][i],
    far: [31, 26 + bob], farAng: [10, 10, 6, 2, 0, 2, 6, 10][i],
  };
}
function wWalk(i) {
  // A glide: he floats a pixel up and down on alternate transitions and leans in and out on the
  // others, so the whole upper body moves every frame.
  const bob = [0, 1, 1, 0, 0, 1, 1, 0][i];
  const s = Math.cos((i * Math.PI) / 4);
  return {
    ...W_BASE, bob, shear: [1, 1, 2, 2, 1, 1, 2, 2][i], back: 3, wave: [1, 2, 1, 0, -1, -2, -1, 0][i], flame: i % 4, blow: 1,
    nearElbow: [R(19 - s), 27 + bob], near: [R(20 - 2 * s), 31 + bob], nearAng: 150, far: [R(29 + 2 * s), 28 + bob], farAng: 165,
  };
}
function wAttack(i) {
  const T = [
    { lean: -1, nearElbow: [17, 25], near: [17, 22], nearAng: -150, far: [29, 28], farAng: 160 },
    { lean: -2, nearElbow: [16, 23], near: [16, 18], nearAng: -120, far: [28, 29], farAng: 150, flare: 1 },
    { lean: 1, nearElbow: [24, 24], near: [30, 24], nearAng: 15, far: [29, 29], farAng: 120, flare: 1, trails: [[19, 23, -120, 15, 13, 8]] },
    { lean: 2, nearElbow: [24, 27], near: [30, 29], nearAng: 50, far: [34, 21], farAng: -40, flare: 2, trails: [[28, 22, -40, 120, 12, 8, true], [19, 23, -40, 50, 13, 10]] },
    { lean: 2, nearElbow: [23, 28], near: [28, 30], nearAng: 70, far: [34, 20], farAng: -60, flare: 1 },
    { lean: 1, nearElbow: [20, 27], near: [23, 30], nearAng: 100, far: [31, 26], farAng: 10 },
  ][i];
  return { ...W_BASE, ...T, flame: i % 4 };
}

// ------------------------------------------------------------- frames --

let aCache, wCache;
export const pics = () => (aCache ??= [
  ...Array.from({ length: 8 }, (_, i) => assassinFrame(aIdle(i))),
  ...Array.from({ length: 8 }, (_, i) => assassinFrame(aWalk(i))),
  ...Array.from({ length: 6 }, (_, i) => assassinFrame(aAttack(i))),
]);
export const wraithPics = () => (wCache ??= [
  ...Array.from({ length: 8 }, (_, i) => wraithFrame(wIdle(i))),
  ...Array.from({ length: 8 }, (_, i) => wraithFrame(wWalk(i))),
  ...Array.from({ length: 6 }, (_, i) => wraithFrame(wAttack(i))),
]);

const LISTS = { idle: [0, 1, 2, 3, 4, 5, 6, 7], walk: [8, 9, 10, 11, 12, 13, 14, 15], attack: [16, 17, 18, 19, 20, 21] };

export default [
  {
    cls: 'rogue',
    id: 'remaster-v2',
    name: 'Remaster V2 · Shadow',
    description: 'Kael as a hooded assassin: a violet hood with two slanted glowing eyes over a mask, a magenta scarf streaming behind, twin daggers, a violet fire aura off his shoulders. He prowls on two legs; his attack crosses two white blade trails as the fire flares.',
    collection: 'Remasters',
    def: {
      gen: () => pics().map((p) => toBuf(p, PAL)), emissive: 'j',
      ...LISTS, attackFps: 14, motionRate: 11 / (9.8 * 1.2), idleRate: 6 / 1.6,
      anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false,
    },
  },
  {
    cls: 'rogue',
    id: 'remaster-v2-wraith',
    name: 'Remaster V2 · Shade (wraith)',
    description: 'Kael as the floating shade, rebuilt: a tall hooked hood over a void face with two slanted glowing eyes, shoulders and arms with twin daggers, a crown of violet fire rooted in the hood, a tail whose lowest wisp stays on the ground line. He glides; his attack crosses two white blade trails.',
    collection: 'Remasters',
    def: {
      gen: () => wraithPics().map((p) => toBuf(p, PAL)), floating: true, emissive: 'j',
      ...LISTS, attackFps: 14, motionRate: 11 / (9.8 * 1.2), idleRate: 6 / 1.6,
      anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false,
    },
  },
];
