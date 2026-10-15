// Sir Aldric, the Knight (remaster-v1).
import { Pic, palette, outline, dropStrays, toBuf, across, bevel, inked, linePts, LEG, legPic, R } from './kit.js';

const PAL = palette({
  k: 'k', K: 'K', n: 'n', N: 'N', g: 'g', G: 'G', w: 'w',
  m: 'm', R: 'R', r: 'r', '5': '#f2735a', '6': '#6e1a2a',
  y: 'y', d: 'd', Y: 'Y', b: 'b',
});

const L = (x, y, rows) => ({ x, y, rows });

// Armet and pauldron, breastplate, belt and tabard. The plume is its own part.
const BODY = L(11, 11, [
  '...................', // 11
  '............GGGg...', // 12
  '..........GwwGGgg..', // 13
  '.........GwGGGGggN.', // 14
  '........GGGGGggggN.', // 15
  '........GGGGggggNN.', // 16
  '........gGGgkkkkkk.', // 17
  '........gggggNkNgN.', // 18
  '.........NgggNkNNN.', // 19
  '.....GGGg.NNNNnnn..', // 20
  '....GwGGgNkkkkkkk..', // 21
  '....GGGggNGwGGGgNN.', // 22
  '....gGggNNGGGGgNgN.', // 23
  '....kNNNnNgGGGgNNN.', // 24
  '.........NgggggNNn.', // 25
  '.........kNNNNNNNn.', // 26
  '.........bbbbyYbbb.', // 27
  '.........GGggNkgNn.', // 28
  '.........gggNNkNNn.', // 29
  '...........k5rRk...', // 30
  '............5rR....', // 31
  '............rRR....', // 32
]);
// The plume streams back off the crest; its tail (rows 4+) is moved by `sway`.
const PLUME = [
  '........555rr',
  '.....555rrrR',
  '...55rrrR6',
  '..5rrRR66',
  '.5rrR66k',
  '.5rR66k',
  '5rR66k',
  '5rR6k',
  'rrR6k',
  '.rRk',
  '..k',
];

const SHIELD = L(29, 20, [
  'kGGGGGGg',
  'kGrrrrRN',
  'kGrrYrRN',
  'kGrYYYRN',
  'kGrrYrRN',
  'kGrrYrRN',
  'kGRrrrRN',
  '.kGRrRN.',
  '.kGRRRN.',
  '..kGRN..',
  '...kN...',
]);

// The sword arm with hilt and blade, for standing and walking: the fist at the front of the hip,
// the blade forward and down at 1:3 (mid), 1:4 (swung forward), 1:2 (swung back).
const ARM = {
  mid: L(16, 24, [
    '.GgN.....................',
    '.GgN.....................',
    '.GggN....................',
    '.kGggN...................',
    '..kGgggGggY..............',
    '...kNNNGgNywww...........',
    '....kkyNNNygggwww........',
    '......kkkkdkkkgggwww.....',
    '..........k...kkkgggwwG..',
    '.................kkkgggG.',
    '....................kkk..',
  ]),
  fwd: L(16, 24, [
    '.GgN.....................',
    '.GgN.....................',
    '.GggN....................',
    '.kGgggN..................',
    '..kGggggGggY.............',
    '...kNNNNGgNywwww.........',
    '....kkkyNNNyggggwwww.....',
    '.......kkkkdkkkkggggwwG..',
    '...........k....kkkkgggG.',
    '....................kkkk.',
  ]),
  back: L(16, 24, [
    '.GgN.....................',
    '.GgN.....................',
    '.GggN....................',
    '.kGgg.Y..................',
    '..kGgGggy................',
    '...kNGgNyww..............',
    '....kyNNyggww............',
    '.....kkkdkkggww..........',
    '........k.kkggww.........',
    '...........kkggww........',
    '.............kkggwG......',
    '...............kkggG.....',
    '.................kkk.....',
  ]),
};

const put = (pic, layer, dx = 0, dy = 0) => pic.stamp(layer.rows, layer.x + dx, layer.y + dy);
const part = (layer, dx = 0, dy = 0) => {
  const p = new Pic();
  put(p, layer, dx, dy);
  return p;
};

// The sword: fist at f, blade along ang (degrees: 0 right, 90 down), drawn with the hilt.
function sword(p, f, ang, len = 13) {
  const a = (ang * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
  const at = (k, s = 0) => [R(f[0] + dx * k - dy * s), R(f[1] + dy * k + dx * s)];
  const shade = Math.abs(dx) >= Math.abs(dy) ? [0, 1] : [1, 0];
  const [b0, b1] = [at(2.5), at(len)];
  const pts = [...linePts(b0[0], b0[1], b1[0], b1[1])];
  pts.forEach(([x, y], i) => {
    const tip = i >= pts.length - 2;
    p.set(x, y, tip ? 'G' : 'w');
    if (!tip) p.set(x + shade[0], y + shade[1], 'g');
  });
  // Grip and pommel.
  const g0 = at(-0.5), g1 = at(-2);
  p.line(g0[0], g0[1], g1[0], g1[1], 'b');
  const pm = at(-3);
  p.set(pm[0], pm[1], 'y');
  // Guard across the blade's root.
  const c0 = at(1.5, -1.6), c1 = at(1.5, 1.6);
  p.line(c0[0], c0[1], c1[0], c1[1], 'y');
  const lit = c0[1] < c1[1] || (c0[1] === c1[1] && c0[0] < c1[0]) ? c0 : c1;
  p.set(lit[0], lit[1], 'Y');
}

function arm(p, sh, el, fist) {
  p.stroke(sh[0], sh[1], el[0], el[1], 1.5, 1.3, across(['G', 'g', 'N']));
  p.stroke(el[0], el[1], fist[0], fist[1], 1.25, 1.1, across(['G', 'g', 'N']));
  const ex = R(el[0]), ey = R(el[1]);
  p.set(ex, ey, 'G');
  p.set(ex - 1, ey, 'G');
  // Gauntlet.
  const fx = R(fist[0]), fy = R(fist[1]);
  p.rect(fx - 1, fy - 1, 3, 3, 'g');
  p.set(fx - 1, fy - 1, 'G');
  p.set(fx, fy - 1, 'G');
  p.set(fx + 1, fy + 1, 'N');
  p.set(fx, fy + 1, 'N');
}

// The cape behind: fixed at the shoulders, its trailing edge and hem moved by `back` (how far
// it streams behind) and `wave` (the hem's ripple).
function cape(p, by, back, wave, lift = 0) {
  const top = 21 + by, hem = 35 + by - lift;
  const bx = 12 - back;
  // The hem ripples: a wave travels along it.
  const H = (x) => hem + Math.round(Math.sin((x + wave * 2) * 1.3) * 0.6);
  const pts = [[15, top], [20, top], [20, H(20)]];
  for (let x = 19; x >= bx; x--) pts.push([x, H(x)]);
  pts.push([bx - 0.5, hem - 2], [13 - back * 0.5, top + 7], [14, top + 3]);
  p.poly(pts, 'r');
  bevel(p, { hi: '5', mid: 'r', lo: 'R' });
  // Folds falling from the shoulder, and the shadow the body casts on the inside.
  p.line(16, top + 3, bx + 2 + Math.round(wave * 0.5), hem - 1, 'R', true);
  p.line(18, top + 5, 17 - Math.round(back * 0.5), hem, 'R', true);
  p.line(19, top + 2, 19, hem, '6', true);
  p.line(17, top + 6, 16 - Math.round(back * 0.5), hem - 1, '5', true);
}

function knightFrame(q) {
  const pic = new Pic();
  const by = q.bob, lean = q.lean || 0;
  const capeP = new Pic();
  cape(capeP, by, q.capeBack, q.capeWave, q.capeLift || 0);
  pic.over(capeP.shift(lean, 0));
  // Legs: the far one first, the near one with an ink edge over it.
  pic.over(legPic(q.far, q.farHx ?? 26, (c) => LEG_FAR[c]));
  pic.over(inked(legPic(q.near, q.nearHx ?? 22, (c) => LEG_NEAR[c]), 'k', (x, y) => y > 38));
  // Body (breath moves the chest and head, not the belt and tabard).
  const body = new Pic();
  const br = q.breath || 0;
  BODY.rows.forEach((row, j) => body.stamp([row], BODY.x + lean, BODY.y + j + by + (j < 16 ? br : 0)));
  pic.over(body);
  const plume = new Pic();
  PLUME.forEach((row, j) => plume.stamp([row], 11 + lean + (j >= 5 ? q.plume : 0), 11 + j + by + br));
  pic.over(plume);
  pic.over(part(SHIELD, lean + (q.shieldX || 0), by + br + (q.shieldY || 0)));
  // Sword arm.
  if (q.arm) {
    pic.over(part(ARM[q.arm], lean, by + br));
    const out = dropStrays(outline(pic, 'k'));
    // A star glint on the blade's tip, drawn over the outline.
    if (q.glint) {
      const [gx, gy] = [39 + lean, 33 + by + br];
      for (const [dx, dy] of q.glint === 2 ? [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0], [0, -2], [2, 0]] : [[0, 0], [0, -1], [1, 0]]) out.set(gx + dx, gy + dy, 'w');
    }
    return out;
  }
  const a = new Pic();
  const sh = [18 + lean, 23 + by + br];
  if (q.smear) smear(a, sh, ...q.smear);
  const s = new Pic();
  sword(s, q.fist, q.ang);
  arm(s, sh, q.elbow, q.fist);
  a.over(s);
  pic.over(inked(a, 'k', null, q.armInk || 'rd'));
  return dropStrays(outline(pic, 'k'));
}

// ---------------------------------------------------------------- poses --

const LEG_NEAR = { E: 'w', A: 'G', B: 'g', C: 'N', D: 'n' };
const LEG_FAR = { E: 'G', A: 'g', B: 'N', C: 'n', D: 'K' };

const BASE = {
  bob: 0, breath: 0, lean: 0, capeBack: 0, capeWave: 0, plume: 0,
  near: LEG.back, far: LEG.front,
  elbow: [19, 27], fist: [23.5, 29], ang: 17,
};

function idle(i) {
  const br = [0, 0, 0, 1, 1, 1, 0, 0][i];
  return {
    ...BASE, breath: br,
    arm: 'mid', glint: [0, 0, 0, 0, 1, 2, 1, 0][i],
    capeWave: [0, 0, -1, -1, -1, 0, 0, 0][i], capeBack: 0,
    plume: [0, 0, 0, -1, -1, -1, 0, 0][i],
  };
}

function walk(i) {
  const bob = [0, 1, 0, 0, 0, 1, 0, 0][i];
  const swing = [-1, -1, 0, 1, 1, 1, 0, -1][i];
  return {
    ...BASE, bob, lean: 0,
    far: LEG.walk[i], near: LEG.walk[(i + 4) % 8],
    arm: swing > 0 ? 'back' : swing < 0 ? 'fwd' : 'mid',
    shieldX: [0, 0, 0, 0, 0, 0, 0, 0][i], shieldY: 0,
    capeBack: [1, 2, 2, 1, 1, 2, 2, 1][i], capeWave: [0, -1, 0, 1, 0, -1, 0, 1][i],
    plume: [-1, -1, 0, 0, -1, -1, 0, 0][i],
  };
}

// The slash, struck on frame 3 (the game's strike lands on the middle frame): the sword raised,
// cocked behind the head, brought over the top and down in front with a lunge, followed
// through and recovered.
function attack(i) {
  const T = [
    { lean: -1, elbow: [16, 20], fist: [18, 17], ang: -100 },
    { lean: -1, elbow: [15, 20], fist: [16, 16], ang: -160 },
    { lean: 0, elbow: [20, 18], fist: [24, 15], ang: -70, smear: [-160, -70, 19, 11] },
    { lean: 2, elbow: [25, 24], fist: [30, 26], ang: 25, smear: [-75, 25, 21, 10], shieldX: -1 },
    { lean: 2, elbow: [24, 27], fist: [29, 28], ang: 40, shieldX: -1 },
    { lean: 1, elbow: [21, 27], fist: [25, 29], ang: 25 },
  ][i];
  const q = { ...BASE, ...T, capeBack: [0, 1, 1, 3, 3, 1][i], capeWave: [0, 0, 1, 1, 0, 0][i], plume: [0, 1, 1, -1, -1, 0][i] };
  if (i >= 3) {
    q.far = LEG.lunge;
    q.farHx = 27;
    q.near = LEG.walk[4];
  }
  return q;
}

// A slash's trail: the crescent the blade swept clockwise from angle 'from' to 'to' (degrees)
// around the pivot c, out to rOut; thickest at the blade (down to rIn), thinning to the tail.
function smear(p, c, from, to, rOut, rIn) {
  const span = to - from;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const dx = x - c[0], dy = y - c[1], r = Math.hypot(dx, dy);
    if (r > rOut + 0.5 || r < rIn - 1) continue;
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    const d = (((a - from) % 360) + 360) % 360;
    if (d > span) continue;
    const t = d / span;
    const inner = rOut - (rOut - rIn) * Math.pow(t, 0.9);
    if (r < inner || y > 38) continue;
    p.set(x, y, r > rOut - 1.3 ? 'w' : t > 0.5 ? 'G' : 'g');
  }
}

let cache;
export const pics = () => (cache ??= [
  ...Array.from({ length: 8 }, (_, i) => knightFrame(idle(i))),
  ...Array.from({ length: 8 }, (_, i) => knightFrame(walk(i))),
  ...Array.from({ length: 6 }, (_, i) => knightFrame(attack(i))),
]);
const gen = () => pics().map((p) => toBuf(p, PAL));

export default [{
  cls: 'knight',
  id: 'remaster-v1',
  name: 'Remaster V1 · Knight',
  description: 'Sir Aldric in silver plate under a red horsehair plume and cape: a T-visored armet, a red heater shield with a gold cross, the longsword low and forward. He breathes, plume and cape sway and the blade glints; the slash cocks the sword behind the helm and brings it over the top in a crescent, with a lunge.',
  collection: 'Remasters',
  def: {
    gen,
    idle: [0, 1, 2, 3, 4, 5, 6, 7], walk: [8, 9, 10, 11, 12, 13, 14, 15], attack: [16, 17, 18, 19, 20, 21],
    attackFps: 13, motionRate: 11 / (9.8 * 1.067), idleRate: 6 / 1.6,
    anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false,
  },
}];
