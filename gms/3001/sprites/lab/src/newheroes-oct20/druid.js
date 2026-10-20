// Bramwyn, the Druid (newheroes-oct20, v1): an antlered forest shaman.
import { Pic, palette, outline, dropStrays, toBuf, across, bands, stroke, leg, GAIT, stamped, despeckle, destripeWhere, R, softenNotches, fillDoubled } from '../remaster-v5/kit.js';

export const PAL = palette({
  k: 'k',
  // the robe and hood: bark brown, lit to deep. '3' sits just over the night line, so even the
  // robe's shadow side reads after dark; '4' is only for the folds' creases and the cowl's depth.
  '1': '#c4915f', '2': '#9c6a45', '3': '#7e5038', '4': '#593628',
  // the mantle of autumn leaves (and the wreath on the hood): gold, orange, rust, a few green
  t: 't', o: 'o', d: 'd', O: 'O', L: 'L', e: 'e',
  // antlers: pale bone, lit tip, shadow side
  z: 'z', T: 'T', D: 'D',
  // skin, the ash-grey beard
  s: 's', S: 'S', A: 'A', a: 'a',
  // the staff's gnarled wood, the boots
  B: 'B', b: 'b', m: 'm',
  // the seed-crystal and the life it wakes: amber, gold, green (all glow)
  Y: 'Y', y: 'y', l: 'l', w: 'w',
});

// The head, x 11-34 from row 4: two pale antlers forking out of a wreath of autumn leaves on the
// bark hood; the face in the hood's open front (two eyes, a nose, an ash-grey beard).
const HEAD = [
  '........................', //  4
  '.z....z..........z....z.', //  5  antler tips
  '.zT...z..........z...Tz.', //  6
  '..TT.TT..........TT.TT..', //  7
  '..TTTT............TTTT..', //  8  the forks
  '...TTT...........TTT....', //  9
  '....TTT.........TTT.....', // 10
  '.....TTT.o..d..TTT......', // 11  two leaves of the wreath stand up
  '......DDttooooODD.......', // 12  the wreath, over the antlers' roots
  '.......1OoooddOO23......', // 13
  '.......112222222233.....', // 14  the hood's peak, forward over the brow
  '.......112234SSSSS3.....', // 15  the brow in the hood's shadow
  '......1122234Skssks.....', // 16  eyes
  '......1122234SsssssS....', // 17  nose
  '......1222334SAAAAA.....', // 18  moustache
  '......1223333aAAAAA.....', // 19
  '.......233344aAAAA......', // 20
  '..............aaa.......', // 21  the beard's tip
];

// Leaf sets for the mantle, (lit, shade): gold, orange, moss green, rust.
const LEAF = { g: ['t', 'd'], o: ['o', 'O'], m: ['L', 'e'], r: ['d', 'O'] };

// Which leaf set a leaf takes (fixed per leaf, row r and column c): gold and orange in a staggered
// checker, rust for gold toward the shadow side, two green ones.
function leafSet(r, c, x) {
  // a green leaf here and there; the rest gold over orange, rust on the shadow side
  if ((r === 0 && c === 1) || (r === 1 && c === 4)) return LEAF.m;
  if (x >= 28) return (r + c) % 2 ? LEAF.r : LEAF.o;
  return (r + c) % 2 ? LEAF.g : LEAF.o;
}

// The mantle of leaves: a shoulder cape from row 19, short at the front (row 24), long down the back
// (row 28), laid as overlapping 3-px leaves, each lit on its left, in shade on its right and lower
// edge, its point hanging over the leaf below. The lowest leaves' points cut the edge. sway: the
// back drape swings back.
function mantle(p, by, lean, sway = 0) {
  const top = 19 + by;
  const shape = new Pic();
  shape.poly([
    [18.5 + lean, top - 0.5], [28.5 + lean, top - 0.5], [31.5 + lean, top + 3], [31.5 + lean, top + 4.5],
    [24.5 + lean, top + 5.5], [19.5 + lean - sway * 0.5, top + 6.5], [14.5 + lean - sway, top + 7.5], [15.5 + lean - sway * 0.5, top + 3],
  ], 'x');
  const ox = 13 + lean;
  const cellOf = (x, r) => {
    const xx = x - ox + (r % 2 ? 2 : 0), c = Math.floor(xx / 3);
    return [c, xx - c * 3];
  };
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    if (!shape.get(x, y)) continue;
    // leaf rows from row top + 2, the first the head leaves showing
    const yy = y - top - 2, r = Math.floor(yy / 3), j = yy - r * 3;
    const [c, i] = cellOf(x, r);
    let ch;
    if (!ch) {
      const [hi, lo] = leafSet(r, c, x);
      ch = i === 2 ? lo : hi;
    }
    // the edge: only the leaves' points hang below the row above them
    if (!shape.get(x, y + 1) && i !== 1 && j !== 0) continue;
    p.set(x, y, ch);
  }
  return p;
}

// The robe: bark brown, knee length, a waist at the rope belt (row 27), the hem flaring to x 15-31
// on rows 31-33 (longer behind), cut in ragged points with moss along them.
function robe(p, by, kick, back, lean) {
  const t = 21 + by;
  const pts = [
    [16.5 + lean, t - 0.5], [29.5 + lean, t - 0.5], [30.5 + lean, t + 3],
    [29.5 + lean * 0.5, 27.5], [31.5 + kick, 31.5], [24.5, 32.5], [14.5 - back, 33.5], [17.5 + lean * 0.5, 27.5],
    [15.5 + lean, t + 3],
  ];
  p.poly(pts, '2');
  bands(p, { left: [[2, '1']], rest: '2', right: [[2, '3']] });
  // folds from the belt
  p.line(20 + lean * 0.5, 28, 19 - back * 0.5, 32, '3', true);
  // the ragged hem: the lowest pixel of each column, every third column cut back a row; moss on
  // what's left of the edge
  for (let x = 10; x <= 38; x++) {
    let y = 40;
    while (y > 26 && !p.get(x, y)) y--;
    if (y <= 28) continue;
    if ((x + kick + back) % 3 === 0) { p.set(x, y, null); y--; }
    p.set(x, y, 'e');
    if (p.get(x, y - 1) && y - 1 > 28) p.set(x, y - 1, 'e');
  }
  // the leather belt with an amber seed for a clasp
  for (let x = 17; x <= 30; x++) p.on(x + R(lean * 0.5), 27, x === 25 ? 'y' : 'b');
}

// The gnarled staff: 2 px of wood (B lit, b shade) with a crook halfway, from the foot up to a
// claw of roots holding the seed-crystal, green shoots sprouting off the claw. Returns the
// crystal's centre.
const STAFF_HEAD = [
  '...Y...', // -5
  'llcYy..', // -4
  'lBYYybl', // -3
  '.BYyybl', // -2
  '.Bbybb.', // -1
  '..Bbb..', //  0
];
function staff(p, foot, top, glow = 0) {
  const [fx, fy] = foot, [tx, ty] = top;
  // the crook: the shaft bends a pixel back halfway up
  const my = R((fy + ty) / 2), mx = R((fx + tx) / 2) - 1;
  p.line(fx, fy, mx, my, 'b').line(mx, my, tx, ty + 1, 'b');
  p.line(fx - 1, fy, mx - 1, my, 'B').line(mx - 1, my, tx - 1, ty + 1, 'B');
  // a knot on each side
  p.set(mx - 2, my + 1, 'B').set(mx - 2, my + 2, 'B');
  const ky = R(fy - (fy - my) * 0.4), kx = R(fx + (mx - fx) * 0.6);
  p.set(kx + 1, ky, 'b');
  // the crystal: amber and gold with a white glint that pulses
  p.stamp(STAFF_HEAD, tx - 3, ty - 5, { map: { c: glow % 2 ? 'Y' : 'w' } });
  return [tx, ty - 3];
}

// Legs: linen wraps (T / t, B in shade) to the ankle, bark-brown boots.
const NEAR = (s, x, y) => (y >= 37 ? { E: 'B', A: 'B', B: 'b', C: 'b', D: 'm' } : { E: 'T', A: 'T', B: 't', C: 'B', D: 'm' })[s];
const FAR = (s, x, y) => (y >= 37 ? { E: 'b', A: 'b', B: 'b', C: 'm', D: 'm' } : { E: 't', A: 't', B: 'B', C: 'b', D: 'm' })[s];

const STANCE = {
  back: { k: [-2, 33], a: [-4, 36], foot: 'flat' },
  front: { k: [3, 33], a: [5, 36], foot: 'flat' },
};

// Thorny roots bursting out of the ground: spikes of bark with thorns, tipped green.
function roots(p, x, h) {
  for (let j = 0; j < h; j++) {
    const y = 38 - j, w = j < h * 0.35 ? 3 : j < h * 0.75 ? 2 : 1;
    for (let i = 0; i < w; i++) p.set(x + i - (w > 2 ? 1 : 0), y, j >= h - 1 ? 'l' : i === 0 ? 'B' : 'b');
    if (j === Math.floor(h * 0.5)) p.set(x + 2, y, 'b');
  }
}

function druidFrame(q) {
  const pic = new Pic();
  const by = q.bob || 0, br = q.breath || 0, lean = q.lean || 0, hy = q.headDy || 0;
  // legs from one hip column
  pic.over(leg(new Pic(), 23, 30 + by, q.far, FAR));
  pic.over(leg(new Pic(), 23, 30 + by, q.near, NEAR), { sep: 'm', sides: 'rd' });
  // the robe
  const rb = new Pic();
  robe(rb, by + br, q.kick || 0, q.back || 0, lean);
  pic.over(rb);
  // the far arm, bent at the elbow, to the grip on the staff
  const fa = new Pic();
  stroke(fa, 28 + lean, 23 + by + br, q.felbow[0], q.felbow[1], 1.3, 1.2, across(['1', '2', '3']));
  stroke(fa, q.felbow[0], q.felbow[1], q.grip[0] - 1, q.grip[1], 1.1, 1.0, across(['1', '2', '3']));
  pic.over(fa, { sep: '4', sides: 'd' });
  // the staff
  const st = new Pic();
  const cr = staff(st, q.foot, q.top, q.glow || 0);
  if (q.flash) {
    const n = q.flash;
    for (let a = 0; a < 8; a++) {
      const ang = (a * Math.PI) / 4, len = a % 2 ? n * 0.6 : n;
      for (let k = 3; k <= len; k++) st.set(R(cr[0] + Math.cos(ang) * k), R(cr[1] + Math.sin(ang) * k), k > len - 1 ? 'l' : 'Y');
    }
  }
  if (q.streak) for (let k = 3; k <= 8; k++) { st.set(cr[0] - 1, cr[1] - k, k > 6 ? 'T' : 'z'); st.set(cr[0] + 1, cr[1] - k - 2, k > 5 ? 'T' : 'z'); }
  pic.over(st, { sep: (c) => (c === 'k' ? 'k' : '4'), sides: 'lr' });
  // the mantle and the head
  pic.over(mantle(new Pic(), by + br, lean, q.sway || 0));
  const head = new Pic();
  head.stamp(HEAD, 11 + lean, 4 + by + br + hy, { map: { 1: '2', 2: '3', 3: '4', 4: '4' } });
  pic.over(head);
  // hands on the staff
  pic.set(q.grip[0], q.grip[1], 's').set(q.grip[0] + 1, q.grip[1], 'S').set(q.grip[0], q.grip[1] + 1, 'S');
  if (q.roots) for (const [x, h] of q.roots) roots(pic, x, h);
  // the blow's shock where the staff's foot meets the ground: sparks of gold and green flung up
  if (q.impact) pic.stamp(['l.......l', '.Y.....Y.', '..Y...Y..', '...y.y...'], q.foot[0] - 5, 35);
  despeckle(pic, ['1', '2', '3']);
  // the sleeve's lit and mid tones paired up where its slant would pinstripe them
  destripeWhere(pic, [['1', '2']], (x, y) => !!fa.get(x, y));
  // doubled ink where the arm, the robe and the boots meet: filled with the cloth or leather beside
  // it, only where the outline keeps an ink neighbour (no lone outline pixel)
  return fillDoubled(softenNotches(dropStrays(outline(pic, 'k')), '43bmea'), '123Bb', (x, y) => y >= 20, 'k', true, true);
}

// ---------------------------------------------------------------- poses --

const BASE = {
  bob: 0, breath: 0, lean: 0, headDy: 0, far: STANCE.front, near: STANCE.back,
  foot: [36, 38], top: [37, 13], grip: [35, 24], felbow: [30, 27], glow: 0, sway: 0,
};

// Idle: the staff planted forward in his far hand, the near arm under the mantle. The breath lifts
// head, mantle and hand (frames 3-5); the staff rocks about its foot, the crystal pulses, the
// mantle's back drape swings a frame behind the breath.
function idle(i) {
  const br = [0, 0, 0, -1, -1, -1, 0, 0][i];
  return {
    ...BASE, breath: br,
    top: [37 + [0, 1, 2, 2, 1, 0, 0, -1][i], 13], grip: [35, 24 + br], felbow: [30, 27 + br],
    glow: i, sway: [0, 0, 1, 1, 2, 1, 1, 0][i],
  };
}

// Walk: one hip column, an 11-px stride (the kit's gait). The staff is planted once a stride and
// swung forward through the second step; the head dips a
// frame after the body; the mantle's back drape trails.
function walk(i) {
  const bob = [0, 1, 0, 0, 0, 1, 0, 0][i];
  const lag = [0, 0, 1, 0, 0, 0, 1, 0][i];
  // planted once a stride: the foot stays on the ground as he passes it (0-3), then lifts and
  // swings forward (4-7), so the two steps differ
  const fx = [39, 38, 37, 36, 37, 38, 40, 40][i];
  const fy = [38, 38, 38, 38, 36, 35, 36, 37][i];
  const sw = Math.cos((i * Math.PI) / 4);
  return {
    ...BASE, bob, headDy: lag, far: GAIT[i], near: GAIT[(i + 4) % 8], lean: [0, 0, 0, 1, 0, 0, 0, 1][i],
    foot: [fx, fy], top: [fx + 1, fy - 25], grip: [fx - 1, fy - 14 + lag], felbow: [30, 27 + bob],
   
    glow: i, sway: [0, 1, 2, 2, 1, 0, 1, 1][i],
  };
}

// The blow: he lifts the staff high (the crystal blazing), he leans back, then
// drives it down into the ground before him (frame 3); thorny roots burst up round its foot, grow,
// then sink as he straightens.
function attack(i) {
  const T = [
    { lean: -1, foot: [35, 33], top: [36, 9], grip: [35, 19], felbow: [31, 22], glow: 1, sway: 1 },
    { lean: -2, foot: [34, 28], top: [35, 5], grip: [34, 13], felbow: [31, 18], glow: 2, flash: 4, sway: 2 },
    { lean: 1, foot: [38, 36], top: [39, 12], grip: [37, 20], felbow: [32, 23], glow: 1, streak: true, sway: 2 },
    { lean: 2, bob: 1, foot: [40, 38], top: [41, 14], grip: [39, 25], felbow: [33, 26], glow: 0, flash: 5, impact: true, roots: [[44, 9], [47, 6]], sway: 1 },
    { lean: 2, bob: 1, foot: [40, 38], top: [41, 14], grip: [39, 25], felbow: [33, 26], glow: 1, flash: 3, roots: [[44, 11], [47, 8], [36, 5]], sway: 0 },
    { lean: 0, foot: [37, 38], top: [38, 13], grip: [36, 24], felbow: [31, 27], glow: 0, roots: [[41, 4], [45, 2]], sway: 0 },
  ][i];
  return { ...BASE, ...T };
}

let cache;
export const pics = () => (cache ??= [
  ...Array.from({ length: 8 }, (_, i) => druidFrame(idle(i))),
  ...Array.from({ length: 8 }, (_, i) => druidFrame(walk(i))),
  ...Array.from({ length: 6 }, (_, i) => druidFrame(attack(i))),
]);
const gen = () => pics().map((p) => toBuf(p, PAL));

export default [{
  cls: 'druid',
  id: 'v1',
  name: 'Druid · v1',
  description: 'Bramwyn the Druid: pale antlers forking out of a wreath of autumn leaves on a bark-brown hood, an ash-grey beard, a mantle of gold, orange and rust leaves over a knee-length bark robe with a mossy hem, linen-wrapped legs, and a gnarled staff whose root-claw holds a glowing amber seed-crystal. He drives the staff into the ground and thorny roots burst up round it.',
  collection: 'New heroes',
  def: {
    gen, emissive: 'Yyl',
    idle: [0, 1, 2, 3, 4, 5, 6, 7], walk: [8, 9, 10, 11, 12, 13, 14, 15], attack: [16, 17, 18, 19, 20, 21],
    attackFps: 12, motionRate: 10 / 9.8, idleRate: 6 / 1.6,
    anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false,
  },
}];
