// Sir Aldric, the Knight (remaster-v5).
import { Pic, palette, outline, dropStrays, toBuf, across, folds, stroke, ribbon, blade, leg, GAIT, STAND, stamped, rimLight, softenNotches, destripe, R } from './kit.js';

export const PAL = palette({
  k: 'k',
  // steel, dark to light, and its specular white
  K: 'K', n: 'n', N: 'N', g: 'g', G: 'G', w: 'w',
  // scarlet cloth, light to deep (the deepest hue-shifted toward violet)
  '5': '#f2735a', r: 'r', R: 'R', '6': '#6e1a2a',
  // gold and leather (b a dark brown well under the night line, not the master's #733e39 on it)
  Y: 'Y', y: 'y', d: 'd', b: '#5e3230',
});

// Armet, gorget, near pauldron, breastplate, belt and tassets, with the red tabard flap.
// Placed at (13, 12). The plume, the arms, the shield and the cape are separate parts.
const BODY = [
  '..........GGGg....', // 12
  '.........GwwGgg...', // 13
  '........GwGGGggN..', // 14
  '.......GGGGGgggN..', // 15
  '.......GGGGggggNN.', // 16
  '......GgGGkkkkkkk.', // 17  the visor slit
  '......GggggNkNgNN.', // 18
  '.......NgggNkNNN..', // 19
  '...GGGg.NNNnnnn...', // 20
  '..GwGGgNnnnnnnn...', // 21  gorget in shadow, no ink bar
  '..GGGggNGwGGGgNg..', // 22
  '..gGggNNGGGGgNNg..', // 23
  '...NNNnNgGGGgNNg..', // 24
  '.......NggggNNNg..', // 25
  '........NNNNNNNg..', // 26
  '.......bbbbyYbbb..', // 27
  '.......GgN5rRGgN..', // 28
  '.......gNN5rRgNN..', // 29
  '..........5rR.....', // 30
  '...........rR.....', // 31
];

const SHIELD = [
  'GGGGGGg',
  'GrrrrRN',
  'G5rYrRN',
  'G5YYYRN',
  'G5rYrRN',
  'G5rYrRN',
  'GrrrrRN',
  '.GrrRN.',
  '.GRRRN.',
  '..GRN..',
  '...N...',
];

// Steel ramp for limbs and plates.
const LEG_NEAR = { E: 'w', A: 'G', B: 'g', C: 'N', D: 'n' };
const LEG_FAR = { E: 'G', A: 'g', B: 'N', C: 'n', D: 'K' };

// The plume: a thick horsehair crest off the top of the helm, curling back and down; its tail
// is moved by `sway` (x) and `lift` (y), the crest stays put.
function plume(p, bx, by, sway, lift) {
  const s = (t) => sway * t * t, l = (t) => lift * t;
  const spine = [
    [23, 12.5, 1.6],
    [22, 10.5, 2.0],
    [19, 9.6, 2.2],
    [16 + s(0.5), 10 + l(0.5), 2.0],
    [14 + s(0.75), 13 + l(0.75), 1.6],
    [13 + s(1), 16.5 + l(1), 0.9],
  ].map(([x, y, r]) => [x + bx, y + by, r]);
  ribbon(p, spine, across(['5', 'r', 'R'], [-0.35, 0.4]));
  // The front tip, laid on the helm's crown, ends in shadow rather than a 2-px ink step.
  p.set(24 + bx, 11 + by, 'R').set(25 + bx, 11 + by, 'R');
}

// The cape: from behind the shoulders, its trailing edge and hem moved by `back` (how far it
// streams behind) and `wave` (a ripple along the hem). Folds fan out from the shoulder in lit
// bands and shadows.
function cape(p, bx, by, back, wave) {
  const top = 21 + by, hem = 35 + by;
  const tail = 12 - back;
  const H = (x) => hem + R(Math.sin((x + wave * 1.5) * 1.1) * 0.7);
  const pts = [[15 + bx, top], [21 + bx, top]];
  pts.push([21 + bx, H(21)]);
  for (let x = 20; x >= tail; x--) pts.push([x + bx, H(x)]);
  pts.push([tail - 0.5 + bx, hem - 2], [13 - back * 0.5 + bx, top + 7], [14 + bx, top + 3]);
  p.poly(pts, 'r');
  folds(p, [18 + bx, top - 3], [[tail - 2 + bx, hem + 2], [tail + 3 + wave * 0.5 + bx, hem + 4], [17 - back * 0.4 + bx, hem + 6], [22 + bx, hem + 6]], ['5', '5', 'r', 'R', 'R'], { lit: 0.32, dark: 0.36, minWidth: 2 });
  // Where the folds converge, their 1-px lit and shadow bands alternate (5 R 5 R): pair them up
  // into 2-px bands.
  destripe(p, [['5', 'R']]);
}

// The sword arm: shoulder to elbow to fist, steel, the gauntlet over the grip.
function arm(p, sh, el, fist) {
  stroke(p, sh[0], sh[1], el[0], el[1], 1.5, 1.3, across(['G', 'g', 'N']));
  stroke(p, el[0], el[1], fist[0], fist[1], 1.3, 1.2, across(['G', 'g', 'N']));
  const ex = R(el[0]), ey = R(el[1]);
  p.set(ex - 1, ey - 1, 'w');
  const fx = R(fist[0]), fy = R(fist[1]);
  p.rect(fx - 1, fy - 1, 3, 3, 'g');
  p.set(fx - 1, fy - 1, 'G').set(fx, fy - 1, 'G').set(fx + 1, fy + 1, 'N').set(fx, fy + 1, 'N');
}

function knightFrame(q) {
  const pic = new Pic();
  const by = q.bob, br = q.breath || 0, lean = q.lean || 0, hy = q.headDy || 0;
  const cp = new Pic();
  cape(cp, lean, by + br, q.capeBack || 0, q.capeWave || 0);
  pic.over(cp);
  // Legs: one hip column; the far leg first, the near leg over it.
  const hx = 24 + (q.hipX || 0);
  const lf = leg(new Pic(), hx + (q.farDx || 0), 30 + by, q.far, (s) => LEG_FAR[s], { tw: 4 });
  const ln = leg(new Pic(), hx + (q.nearDx || 0), 30 + by, q.near, (s) => LEG_NEAR[s], { tw: 4 });
  pic.over(lf);
  pic.over(ln, { sep: 'n', sides: 'rd' });
  // Body: the chest and head ride the breath, the head also its own lag.
  const body = new Pic();
  BODY.forEach((row, j) => {
    const y = 12 + j;
    const dy = by + (y < 27 ? br : 0) + (y <= 20 ? hy : 0);
    body.stamp([row], 13 + lean, y + dy);
  });
  pic.over(body, { sep: 'n', sides: 'd' });
  const pl = new Pic();
  plume(pl, lean, by + br + hy, q.plume || 0, q.plumeLift || 0);
  pic.over(pl, { sep: (c) => ('wGgN'.includes(c) ? 'N' : c === 'n' ? 'n' : '6'), sides: 'rd' });
  // Shield on the far arm, in front; the far forearm reaches it.
  const sx = 30 + lean + (q.shieldX || 0), sy = 21 + by + br + (q.shieldY || 0);
  const fa = new Pic();
  stroke(fa, 27 + lean, 23 + by + br, sx + 1, sy + 5, 1.3, 1.2, across(['g', 'N', 'n']));
  pic.over(fa, { sep: 'n', sides: 'd' });
  const sh = stamped(SHIELD, sx, sy);
  pic.over(sh, { sep: 'k', sides: 'l' });
  // Sword and the sword arm, over everything.
  const sw = new Pic();
  if (q.smear) smear(sw, [18 + lean, 23 + by], ...q.smear);
  const s = new Pic();
  const pts = blade(s, q.fist, q.ang, q.len || 13, { edge: 'w', flat: 'G', tip: 'G', guard: ['Y', 'y', 'd'], grip: 'b', pommel: 'y', guardHalf: 2 });
  if (q.wide) {
    // A raised blade gets a third, lit pixel along its edge so it holds up against the plume.
    const a = (q.ang * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
    const lit = Math.abs(dx) >= Math.abs(dy) ? [0, -1] : [-1, 0];
    pts.slice(0, -2).forEach(([x, y]) => s.set(x + lit[0], y + lit[1], 'w'));
  }
  arm(s, [18 + lean, 23 + by + br], q.elbow, q.fist);
  sw.over(s);
  pic.over(sw, { sep: 'k', sides: 'rd' });
  // Reflected light on the steel's shadow side.
  rimLight(pic, { N: 'g', n: 'N' }, { sides: 'r' });
  const out = dropStrays(outline(pic, 'k'));
  // Where a separation line meets the outline, soften it to the material's shadow (the plume's
  // root in R, steel in N), keeping the visor's slit.
  const visor = (x, y) => y >= 17 + by + br + hy && y <= 19 + by + br + hy && x >= 22 + lean && x <= 30 + lean;
  softenNotches(out, 'K6nbRdNgrGy5Yw', visor);
  // The ankles of the standing stance, where the cape's hem meets the near leg (REVIEW: N).
  if (q.near === STAND.back) for (const [x, y] of [[18, 36], [22, 36]]) if (out.get(x, y) === 'k' && out.get(x + 1, y) && out.get(x, y - 1)) out.set(x, y, 'N');
  if (q.streak) {
    // Motion streaks under the cocked blade, drawn after the outline so no ink boxes them: 1-px
    // lines parallel to the blade from the arm's edge, bright where they leave it and fading
    // (G, g, N) toward x 3.
    for (const [x0, y0, x1, y1] of q.streak) {
      out.line(x0, y0, x1, y1, (x, y, i, n) => (out.get(x, y) ? null : i < n * 0.34 ? 'G' : i < n * 0.7 ? 'g' : 'N'));
    }
  }
  if (q.glint) {
    const [gx, gy] = q.glint;
    for (const [dx, dy] of [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]]) out.set(gx + dx, gy + dy, 'w');
  }
  return out;
}

// A slash's trail: the crescent the blade swept clockwise from angle 'from' to 'to' (degrees)
// around the pivot c, out to rOut; thickest at the blade (down to rIn), thinning to the tail.
function smear(p, c, from, to, rOut, rIn) {
  const span = to - from;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const dx = x - c[0], dy = y - c[1], r = Math.hypot(dx, dy);
    if (r > rOut + 0.5 || r < rIn - 1) continue;
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    const dd = (((a - from) % 360) + 360) % 360;
    if (dd > span) continue;
    const t = dd / span;
    const inner = rOut - (rOut - rIn) * Math.pow(t, 0.9);
    if (r < inner || y > 38) continue;
    p.set(x, y, r > rOut - 1.3 ? 'w' : t > 0.5 ? 'G' : 'g');
  }
}

// ---------------------------------------------------------------- poses --

const BASE = {
  bob: 0, breath: 0, lean: 0, headDy: 0,
  near: STAND.back, far: STAND.front,
  elbow: [21, 28], fist: [27, 30], ang: 6, len: 13, shieldY: -1,
  capeBack: 0, capeWave: 0, plume: 0, plumeLift: 0,
};

// Idle: en garde, the shield up and the blade level, its point toward the foe. The breath lifts
// the chest, head, shield and sword a pixel (frames 3-5). The plume tail and the cape hem never
// stop: they run on a continuous wave a frame behind the breath, so no two frames are alike;
// the blade's point drifts with the breath and a glint runs along it.
function idle(i) {
  const br = [0, 0, 0, -1, -1, -1, 0, 0][i];
  return {
    ...BASE, breath: br,
    elbow: [21, 28 + br], fist: [27, 30 + br], ang: [6, 5, 5, 4, 3, 3, 4, 5][i], shieldY: -1,
    capeWave: i, capeBack: [0, 1, 1, 3, 3, 2, 1, 0][i],
    plume: [0, 0, -1, -1, -2, -2, -1, -1][i], plumeLift: [0, 0, 0, 0, -1, -1, -1, 0][i],
    glint: i === 5 ? [39, 30] : null,
  };
}

// Walk: contact (0, 4), down (1, 5: the body drops a pixel), passing (2, 6), up (3, 7). The
// head dips a frame after the body; the sword swings with the near arm, the shield against it;
// the plume and the cape trail by a frame.
function walk(i) {
  const bob = [0, 1, 0, 0, 0, 1, 0, 0][i];
  const headDy = [0, 0, 1, 0, 0, 0, 1, 0][i];
  const s = Math.cos((i * Math.PI) / 4);
  const ang = R(16 - 10 * s);
  return {
    ...BASE, bob, headDy,
    far: GAIT[i], near: GAIT[(i + 4) % 8],
    elbow: [20 + s, 27 + bob], fist: [25 + 2 * s, 29 + bob], ang, len: 13,
    shieldX: [-2, -1, 0, 1, 2, 1, 0, -1][i], shieldY: 0,
    lean: [0, 0, 0, 1, 0, 0, 0, 1][i],
    capeBack: [2, 1, 1, 2, 3, 2, 2, 2][i], capeWave: [0, 1, 2, 3, 0, 1, 2, 3][i],
    plume: [-1, 0, 1, 0, -1, 0, 1, 0][i], plumeLift: [0, 0, 1, 1, 0, 0, 1, 1][i],
  };
}

// The slash, struck on frame 3 (the game's strike lands on the middle frame): the sword raised,
// cocked behind the head, brought over the top and down in front with a lunge, followed
// through and recovered.
function attack(i) {
  const T = [
    { lean: -1, elbow: [16, 21], fist: [18, 18], ang: -100, len: 12, wide: true },
    { lean: -2, elbow: [15, 20], fist: [16, 17], ang: -160, len: 12, wide: true, streak: [[12, 19, 3, 16], [11, 21, 5, 19]] },
    { lean: 0, elbow: [20, 19], fist: [24, 16], ang: -70, len: 12, smear: [-150, -70, 18, 11] },
    { lean: 2, elbow: [25, 24], fist: [30, 26], ang: 25, smear: [-75, 25, 18, 9], shieldX: -1 },
    { lean: 2, elbow: [24, 27], fist: [29, 28], ang: 40, shieldX: -1 },
    { lean: 1, elbow: [22, 27], fist: [27, 29], ang: 0 },
  ][i];
  const q = { ...BASE, ...T, capeBack: [0, 1, 1, 3, 3, 1][i], capeWave: [0, 0, 1, 2, 1, 0][i], plume: [0, 1, 1, -2, -2, -1][i] };
  if (i >= 3) {
    q.far = { k: [5, 33], a: [6, 36], foot: 'flat' };
    q.near = GAIT[4];
  }
  return q;
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
  id: 'remaster-v5',
  name: 'Remaster V5 · Knight',
  description: 'Sir Aldric en garde: a T-visored armet under a tall red horsehair plume, a fan-folded red cape, his red heater shield with its gold cross raised and the longsword levelled at the foe; the plume sways through the whole idle and the cape billows back on his breath. He walks with sword and shield swinging against an 11 px stride; the slash cocks a broad blade behind the helm with a motion streak and brings it over the top in a crescent.',
  collection: 'Remasters',
  def: {
    gen,
    idle: [0, 1, 2, 3, 4, 5, 6, 7], walk: [8, 9, 10, 11, 12, 13, 14, 15], attack: [16, 17, 18, 19, 20, 21],
    attackFps: 13, motionRate: 11 / (9.8 * 1.067), idleRate: 6 / 1.6,
    anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false,
  },
}];
