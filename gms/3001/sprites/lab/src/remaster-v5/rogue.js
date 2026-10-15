// Kael, the Shadow (remaster-v5): a hooded assassin on two legs, in shadow with a lilac rim of
// moonlight, twin daggers, a magenta scarf over his nose whose tails burn out in violet fire.
import { Pic, palette, outline, dropStrays, toBuf, across, stroke, leg, GAIT, STAND, despeckle, R } from './kit.js';

export const PAL = palette({
  k: 'k',
  // shadow violet, dark to light, and the lilac of his fire, his rim light and his eyes (p, the
  // mid shadow, well under the night line: what reads at night is the light, not the cloth)
  h: 'h', q: 'q', p: '#552d5c', j: 'j', V: '#b57fd9', '9': '#d9a6ff', w: 'w',
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
// glint: a step along the blade where its shadow side catches the light too (w), or null.
function dagger(p, hand, ang, len = 6, glint = null) {
  const a = (ang * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
  const at = (k, s = 0) => [R(hand[0] + dx * k - dy * s), R(hand[1] + dy * k + dx * s)];
  const upright = Math.abs(dy) > Math.abs(dx);
  for (let k = 1; k <= len; k++) {
    const [x, y] = at(k + 0.5);
    p.set(x, y, 'w');
    if (k < len) {
      // the second pixel on the shadow side (below a flat blade, right of an upright one)
      const c = k === glint ? 'w' : 'G';
      if (upright) p.set(x + 1, y, c);
      else p.set(x, y + 1, c);
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
  ['..9..', '.99..', '.99V.', 'VVVV.', '.VV..'],
  ['.9...', '.99..', 'V99..', 'VVVV.', '.VV..'],
  ['...9.', '..99.', '.V99.', '.VVVV', '..VV.'],
  ['.....', '..9..', '.99V.', 'VVVV.', '.VV..'],
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

// The hood: a peak at (26, 7) hooking forward over the eyes to (30, 11), its back pulled in to
// x 18, about 12 px wide; the face in its shadow: two slanted white eyes over a dark mask. Lit
// from the top-left: a lilac rim (9) up the back slope to the peak, the lit plane in j / V, the
// mass in p / q, the shadow in h. Placed at (17, 7).
const HEAD = [
  '.........9....', //  7  the peak
  '........99q...', //  8
  '.......99Vqq..', //  9
  '......99VjVqq.', // 10
  '....999VjjVpqq', // 11  the hook over the brow
  '..999VVjjjpqh.', // 12
  '.99VVjjpqhhhh.', // 13  the face in the hood's shadow
  '.9VVjjjpqhhhh.', // 14
  '.9Vjjjpqzzhzz.', // 15  the eyes: two white slits, their inner ends a row lower (a scowl)
  '.9Vjjpqhhzhzh.', // 16
  '.9VjjpqIIIIIIP', // 17  the scarf pulled up over the nose: a magenta mask
  '..pjpqPPPPPPP.', // 18
];
// The torso: the scarf's collar, shoulders, chest, the sash, the hips. Placed at (14, 19).
const TORSO = [
  '....PPPPPPPPPP..', // 19  the scarf wrapped at the throat
  '...99Vjjppqqqq..', // 20  shoulders: the rim, the lit plane
  '..9Vjjjppqqqqqh.', // 21
  '..9Vjjpppqqqqqh.', // 22
  '...Vjjppqqqqqh..', // 23
  '...jjppqqqqqqh..', // 24
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
    if (g.swing && y === g.a[1] + 1 && s !== 'D') return near ? '9' : 'j';
    if (s === 'D') return 'h';
    if (y < ky) return (near ? { A: 'j', B: 'p', C: 'p' } : { A: 'q', B: 'q', C: 'q' })[s] || 'q';
    if (y === ky) return near ? '9' : 'V';
    if (y === ky + 1) return near ? 'V' : 'j';
    return (near ? { A: 'j', B: 'h', C: 'h' } : { A: 'h', B: 'h', C: 'h' })[s];
  };
};

// A long scarf from the knot at the back of the neck, streaming back in a wave: a magenta band
// lit on top (I) near the knot, burning out at its tail in licks of violet fire. back: how far it
// streams; droop: how far it falls by its end (rows); phase: its ripple (radians: a full turn
// loops); len: how many of its 8 segments are out (fewer: the same wave, cut short); step: px
// back per segment (null: set by back); amp: the ripple's height (px at the tail). Returns its
// points, knot to tail.
function scarf(p, x0, y0, back, droop, phase, len = 8, step = null, amp = 1.6) {
  const pts = [];
  for (let k = 0; k <= len; k++) {
    const t = k / 8;
    pts.push([x0 - k * (step ?? 1.1 + back * 0.15), y0 + t * droop + Math.sin(t * 5 - phase) * amp * t]);
  }
  for (let k = 1; k < pts.length; k++) {
    // the band thins from the knot (k) and darkens towards the tail (d: segments left)
    const [xa, ya] = pts[k - 1], [xb, yb] = pts[k], d = len - k;
    p.line(R(xa), R(ya), R(xb), R(yb), d >= 2 ? 'I' : 'P');
    p.line(R(xa), R(ya) + 1, R(xb), R(yb) + 1, d >= 3 ? 'P' : d >= 1 ? 'p' : 'P');
    if (d >= 3) p.line(R(xa), R(ya) + 2, R(xb), R(yb) + 2, 'p');
    if (k <= 2) p.line(R(xa), R(ya) + 3, R(xb), R(yb) + 3, 'p');
  }
  return pts;
}

// The scarf at rest: two tails falling from the knot at the back of the neck, down and back to
// x 10-13 by row 29-30, magenta lit on the upper edge (I) and shaded under it (q); the back tail
// darker. Each burns out at its tip in a flicker of violet fire 2-3 px high. sway: the tips'
// swing (px); phase: the flicker.
function scarfTails(p, x0, y0, sway, phase) {
  const back = new Pic(), front = new Pic();
  // The two tails part as they fall: the back one swings out further, the front one hangs
  // nearly straight; 2 px wide each, their tips 4 px apart.
  stroke(back, x0 - 2, y0 + 1, 11.5 + sway, 29, 1.15, 0.9, across(['P', 'q'], [0.5]));
  stroke(front, x0 - 1, y0 + 2, 15 + sway * 0.6, 30.5, 1.2, 0.9, across(['I', 'P'], [-0.5]));
  p.over(back);
  p.over(front, { sep: 'q', sides: 'lu' });
  const tips = [[R(11.5 + sway), 29.5], [R(15 + sway * 0.6), 31]];
  const F = [['9.', '99'], ['.9', '99'], ['9.', '9.'], ['.9', '.9']];
  tips.forEach(([x, y], k) => p.stamp(F[(phase + k) % 4], x - 1, y - 1, { only: false }));
  return tips;
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
  // The scarf: at rest its two tails hang down his back; on the move it streams behind him, its
  // tail burning out in a small lick of violet fire.
  const sc = new Pic();
  if (q.tails) scarfTails(sc, 18 + lean + hl, 19 + by + br + hy, q.tails[0], q.tails[1]);
  else {
    const pts = scarf(sc, 18 + lean + hl, 19.5 + by + br + hy, q.capeBack || 0, q.droop ?? 3, q.capeWave || 0, q.scarfLen ?? 8, q.scarfStep ?? null, q.scarfAmp ?? 1.6);
    const fire = new Pic();
    // A lick of fire off the scarf's tail: [phase, lean, grow].
    const [ph, fl, fg] = q.tailFire;
    const tip = pts[pts.length - 1];
    lick(fire, tip[0] - 0.5, tip[1] + 1, ph, fl, fg);
    pic.over(fire);
  }
  pic.over(sc);
  // Far arm and its dagger, behind the body.
  const fa = new Pic();
  const fs = [27 + lean, 21 + by + br];
  // The far arm in shade, its forearm in a steel bracer.
  stroke(fa, fs[0], fs[1], q.farElbow[0], q.farElbow[1], 1.3, 1.15, across(['q', 'h']));
  stroke(fa, q.farElbow[0], q.farElbow[1], q.far[0], q.far[1], 1.15, 1.0, across(['G']));
  dagger(fa, q.far, q.farAng, 11, q.glint ?? null);
  // (in the coil both arms cross in front of the chest: the far arm is drawn over the body)
  if (!q.farFront) pic.over(fa);
  // Legs from one hip column.
  const lf = leg(new Pic(), 23, hip, q.legFar, legMap(q.legFar, hip, false), { tw: 4, sw: 3 });
  const ln = leg(new Pic(), 23, hip, q.legNear, legMap(q.legNear, hip, true), { tw: 4, sw: 3 });
  pic.over(lf);
  pic.over(ln, { sep: 'h', sides: 'rd' });
  // The torso, then the head on it.
  const body = new Pic();
  body.stamp(TORSO.slice(0, 5), 14 + lean, 19 + by + br);
  body.stamp(TORSO.slice(5), 14 + lean, 24 + by);
  // The head rides the breath, but the peak's tip holds on row 7 (its outline on row 6): on the
  // breath frames it squashes into the row below.
  // squashed, the cap is all moonlit rim and the slope under it catches a pixel more light.
  body.stamp(HEAD.slice(0, 1), 17 + lean + hl, 7 + by + hy + Math.max(0, br));
  body.stamp(br < 0 ? ['........999...', '.......99VVq..', ...HEAD.slice(3)] : HEAD.slice(1), 17 + lean + hl, 8 + by + br + hy);
  pic.over(body, { sep: 'h', sides: 'd' });
  if (q.farFront) pic.over(fa, { sep: 'h', sides: 'lrd' });
  // Slash trails over the body, under the near arm.
  if (q.trails) {
    const tr = new Pic();
    for (const [cx, cy, a0, a1, ro, ri, rev] of q.trails) trail(tr, [cx + lean, cy + by], a0, a1, ro, ri, rev);
    pic.over(tr);
  }
  // Near arm and its dagger, in front.
  const na = new Pic();
  const ns = [20 + lean, 21 + by + br];
  // The near arm in the moonlight (j), its forearm in a steel bracer.
  stroke(na, ns[0], ns[1], q.nearElbow[0], q.nearElbow[1], 1.35, 1.2, across(['j']));
  stroke(na, q.nearElbow[0], q.nearElbow[1], q.near[0], q.near[1], 1.2, 1.05, across(['G']));
  dagger(na, q.near, q.nearAng, 11);
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
    nearElbow: [22, 25 + hb], near: [26, 26 + hb], nearAng: [28, 26, 24, 22, 21, 22, 24, 26][i],
    farElbow: [29, 23 + hb], far: [31, 22 + hb], farAng: [-28, -30, -32, -34, -35, -34, -32, -30][i],
    tails: [[1.5, 0.5, -0.5, -1.5, -2, -1, 0, 1][i], i],
    // a glint runs up the raised blade twice a breath (k: px from the hand), on spots where it
    // doesn't cut a lone steel pixel off the blade's shadow line
    glint: [2, 5, 7, null, 3, 4, 7, null][i],
  };
}

// The shared gait, with the passing foot (phase 6) carried 2 px ahead of the stance shin and its
// top edge lit, so both legs read on the passing frames.
const SWING = (ph) => (ph === 6 ? { k: [3, 32], a: [2, 33], foot: 'air', swing: true } : GAIT[ph]);

// Walk: a prowl on the shared legs; the blades counter-swing, the head dips a frame late, the
// scarf and the fire stream back.
function aWalk(i) {
  const bob = [0, 1, 0, 0, 0, 1, 0, 0][i];
  const lag = [0, 0, 1, 0, 0, 0, 1, 0][i];
  const s = Math.cos((i * Math.PI) / 4);
  return {
    ...A_BASE, bob, headDy: lag,
    legFar: SWING(i), legNear: SWING((i + 4) % 8),
    nearElbow: [R(22 + s), 25 + bob], near: [R(27 + 2 * s), 26 + bob], nearAng: R(27 - 8 * s),
    farElbow: [R(29 - s), 23 + bob], far: [R(31 - 2 * s), 23 + bob], farAng: R(-27 - 8 * s),
    capeBack: [2, 3, 3, 2, 2, 2, 3, 3][i], capeWave: (i * Math.PI) / 4, droop: 3,
    // the stream cut short: six of its eight segments, 1-1.05 px each, rippling a little higher,
    // so its fire ends at x 8 and the walk box stays at 37 px or less
    scarfLen: 6, scarfStep: 0.9 + [2, 3, 3, 2, 2, 2, 3, 3][i] * 0.05, scarfAmp: 1.8,
    lean: [0, 0, 0, 1, 0, 0, 0, 1][i],
    tailFire: [[0, 1, 2, 3, 1, 2, 3, 0][i], 1, 0],
  };
}

// The attack: coil back with both blades drawn (2 frames), the near blade slashes down and
// forward, the far blade's rising slash crosses it on the blow (frame 3) as the scarf's fire
// flares, follow-through, recover. The body lunges 3 px.
function aAttack(i) {
  const T = [
    { lean: -1, nearElbow: [20, 25], near: [23, 24], nearAng: -25, farElbow: [29, 26], far: [30, 24], farAng: -155, farFront: true },
    { lean: -2, nearElbow: [19, 25], near: [22, 23], nearAng: -30, farElbow: [28, 25], far: [29, 23], farAng: -150, farFront: true },
    { lean: 1, nearElbow: [24, 23], near: [30, 26], nearAng: 45, farElbow: [28, 24], far: [29, 22], farAng: -110, trails: [[21, 21, -55, 50, 13, 8]] },
    { lean: 2, nearElbow: [24, 25], near: [30, 28], nearAng: 50, farElbow: [30, 22], far: [34, 20], farAng: -40, trails: [[28, 21, -40, 110, 12, 8, true], [21, 21, -30, 50, 15, 10]] },
    { lean: 2, nearElbow: [23, 26], near: [28, 28], nearAng: 58, farElbow: [30, 21], far: [34, 19], farAng: -60 },
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
    id: 'remaster-v5',
    name: 'Remaster V5 · Shadow',
    description: 'Kael as a hooded assassin, in shadow: a dark plum hood rising to a peak that hooks forward over two slanted eyes that glow in the dark, the scarf pulled up over his nose as a magenta mask, a lilac rim of moonlight on his top-left edges, the two tails of the scarf hanging down his back and burning out at their tips in a flicker of violet fire (on the move, a short stream rippling out behind his neck), twin daggers with a glint running up the raised one, steel bracers, dark boots under light knee guards. He prowls on two legs; his attack coils both blades crossed in front of his chest, slashes down to the knee, then crosses two white blade trails.',
    collection: 'Remasters',
    def: {
      gen: () => pics().map((p) => toBuf(p, PAL)), emissive: 'z',
      ...LISTS, attackFps: 14, motionRate: 11 / (9.8 * 1.2), idleRate: 6 / 1.6,
      anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false,
    },
  },
];
