// Lyra, the Ranger (remaster-v1).
import { Pic, palette, outline, dropStrays, toBuf, across, bevel, inked, LEG, legPic, R } from './kit.js';

const PAL = palette({
  k: 'k',
  // hood and cloak: leaf green, light to dark
  l: 'l', L: 'L', e: 'e', E: 'E', v: 'v',
  // leather: jerkin, belt, boots, bow
  T: 'T', t: 't', B: 'B', b: 'b', m: 'm', h: 'h',
  // skin and hair
  s: 's', S: 'S', d: 'd',
  // steel, fletching, gold buckle
  G: 'G', g: 'g', w: 'w', r: 'r', y: 'y',
});

const L = (x, y, rows) => ({ x, y, rows });

// Hood with the face in its opening, the jerkin with the quiver strap, the belt.
const BODY = L(17, 11, [
  '...LL........', // 11
  '...LlLe......', // 12
  '..LlLLLee....', // 13
  '..LlLLLLeeE..', // 14
  '.LlLLLLeeEEE.', // 15
  '.LLLLeeEddSS.', // 16
  'LLLLeeEdSsks.', // 17
  'LLLeeeEdssssS', // 18
  'eLeeeEvdSssS.', // 19
  'eeeEEvvESSS..', // 20
  '.LLeeeeEE....', // 21
  '..TttBBbb....', // 22
  '..tttBBbb....', // 23
  '..ttBBBbb....', // 24
  '..tBBBbbm....', // 25
  '...BBbbbm....', // 26
  '...mmymmm....', // 27
  '...BBbbbbm...', // 28
  '...Bbbbbmm...', // 29
]);

// Quiver on the back with three fletchings over the shoulder.
const QUIVER = L(12, 12, [
  'ww.ww..',
  'rr.rr..',
  '.Bbbm..',
  '.Bbbm..',
  '..Bbbm.',
  '..Bbbm.',
  '...Bbm.',
  '...Bbm.',
  '....bm.',
]);

const put = (pic, layer, dx = 0, dy = 0) => pic.stamp(layer.rows, layer.x + dx, layer.y + dy);
const part = (layer, dx = 0, dy = 0) => {
  const p = new Pic();
  put(p, layer, dx, dy);
  return p;
};

// Legs: trousers to the knee, boots below with a light cuff.
const NEAR = (c, y) => (y <= 33 ? { E: 'B', A: 'b', B: 'm', C: 'h', D: 'h' } : { E: 't', A: y === 34 ? 't' : 'B', B: 'b', C: 'm', D: 'h' })[c];
const FAR = (c, y) => (y <= 33 ? { E: 'b', A: 'm', B: 'h', C: 'h', D: 'h' } : { E: 'B', A: y === 34 ? 'B' : 'b', B: 'm', C: 'h', D: 'k' })[c];

function arm(p, sh, el, hand, near) {
  const sleeve = near ? ['L', 'e', 'E'] : ['e', 'E', 'v'];
  p.stroke(sh[0], sh[1], el[0], el[1], 1.2, 1.0, across(sleeve));
  p.stroke(el[0], el[1], hand[0], hand[1], 1.0, 0.9, across(near ? ['t', 'B', 'b'] : ['B', 'b', 'm']));
  p.set(R(hand[0]), R(hand[1]), near ? 's' : 'S');
}

// The bow: grip at g, limbs `half` long above and below, bent back by `flex` (0 rest, 1 drawn).
// Returns the tips for the string.
function bow(p, g, half, flex) {
  const sag = 4.2 + flex * 2.5;
  const pts = [];
  for (let i = -half; i <= half; i++) {
    const t = i / half, a = Math.abs(t);
    let x = g[0] - sag * t * t;
    if (a > 0.8) x += (a - 0.8) * (8 - flex * 4);
    pts.push([R(x), g[1] + i]);
  }
  const limb = new Pic();
  for (let i = 1; i < pts.length; i++) limb.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 't');
  for (let i = 0; i < limb.c.length; i++) {
    if (!limb.c[i]) continue;
    const d = Math.abs(((i / 48) | 0) - g[1]);
    limb.c[i] = d < 2 ? 'm' : d < half * 0.55 ? 'T' : 't';
  }
  // A second, shaded ply on the belly near the grip.
  for (let i = -Math.floor(half * 0.5); i <= Math.floor(half * 0.5); i++) {
    const [x, y] = pts[i + half];
    if (Math.abs(i) >= 2) limb.set(x + 1, y, 'B');
  }
  limb.set(pts[0][0], pts[0][1], 'b');
  limb.set(pts[pts.length - 1][0], pts[pts.length - 1][1], 'b');
  p.over(limb);
  return [pts[0], pts[pts.length - 1]];
}

function cloak(p, by, back, wave) {
  const top = 21 + by, hem = 33 + by;
  const bx = 14 - back;
  const H = (x) => hem + Math.round(Math.sin((x + wave * 2) * 1.3) * 0.6) + (x < bx + 2 ? 1 : 0);
  const pts = [[17, top], [21, top], [21, H(21) - 1]];
  for (let x = 20; x >= bx; x--) pts.push([x, H(x)]);
  pts.push([bx - 0.5, hem - 2], [15 - back * 0.5, top + 6], [16, top + 2]);
  p.poly(pts, 'e');
  bevel(p, { hi: 'L', mid: 'e', lo: 'E' });
  p.line(18, top + 3, bx + 2 + Math.round(wave * 0.5), hem - 1, 'E', true);
  p.line(20, top + 2, 20, hem, 'v', true);
  p.line(17, top + 4, 16 - Math.round(back * 0.5), hem - 1, 'L', true);
}

function rangerFrame(q) {
  const pic = new Pic();
  const by = q.bob, br = q.breath || 0;
  const c = new Pic();
  cloak(c, by, q.cloakBack, q.cloakWave);
  pic.over(c);
  pic.over(part(QUIVER, 0, by + br));
  pic.over(legPic(q.far, q.farHx ?? 25, FAR));
  // Far arm (the bow arm) reaches forward to the grip.
  const fa = new Pic();
  arm(fa, [26, 22 + by + br], q.bowElbow, q.grip, false);
  pic.over(fa);
  pic.over(inked(legPic(q.near, q.nearHx ?? 21, NEAR), 'k', (x, y) => y > 38));
  pic.over(part(BODY, 0, by + br));
  // Bow and string.
  const b = new Pic();
  const [t0, t1] = bow(b, q.grip, 11, q.flex || 0);
  const nock = q.nock || null;
  if (nock) {
    b.line(t0[0], t0[1], nock[0], nock[1], 'T');
    b.line(nock[0], nock[1], t1[0], t1[1], 'T');
  } else b.line(t0[0], t0[1], t1[0], t1[1], 'T');
  if (q.arrow) {
    const [ax0, ay0, ax1, ay1] = q.arrow;
    b.line(ax0, ay0, ax1, ay1, 't');
    b.set(ax1, ay1, 'w');
    b.set(ax1 - 1, ay1, 'G');
    b.set(ax0, ay0 - 1, 'w');
    b.set(ax0 + 1, ay0 - 1, 'r');
  }
  pic.over(inked(b, 'k', null, 'rd'));
  pic.set(q.grip[0], q.grip[1], 'S');
  pic.set(q.grip[0], q.grip[1] - 1, 's');
  // Near arm.
  const na = new Pic();
  arm(na, [20, 22 + by + br], q.elbow, q.hand, true);
  pic.over(inked(na, 'k', null, 'rd'));
  return dropStrays(outline(pic, 'k'));
}

const BASE = {
  bob: 0, breath: 0, cloakBack: 0, cloakWave: 0,
  near: LEG.back, far: LEG.front,
  bowElbow: [29, 24], grip: [33, 26], flex: 0,
  elbow: [19.5, 25], hand: [21, 28],
};

function idle(i) {
  const br = [0, 0, 0, 1, 1, 1, 0, 0][i];
  return { ...BASE, breath: br, bowElbow: [29, 24 + br], grip: [33, 26 + br], elbow: [19.5, 25 + br], hand: [21, 28 + br], cloakWave: [0, 0, -1, -1, -1, 0, 0, 0][i] };
}

function walk(i) {
  const bob = [0, 1, 0, 0, 0, 1, 0, 0][i];
  const swing = [-1, -1, 0, 1, 1, 1, 0, -1][i];
  return {
    ...BASE, bob,
    far: LEG.walk[i], near: LEG.walk[(i + 4) % 8],
    bowElbow: [29, 24 + bob], grip: [33, 26 + bob],
    elbow: [19.5 - swing * 0.5, 25 + bob], hand: [21 - swing * 1.5, 28 + bob],
    cloakBack: [1, 2, 2, 1, 1, 2, 2, 1][i], cloakWave: [0, -1, 0, 1, 0, -1, 0, 1][i],
  };
}

// Draw and release; the release frame is attack index 4 (attackRelease).
function attack(i) {
  const T = [
    { grip: [33, 23], bowElbow: [30, 22], nock: null, elbow: [22, 24], hand: [27, 23], flex: 0, arrow: [27, 23, 37, 23] },
    { grip: [34, 23], bowElbow: [30, 22], nock: [26, 23], elbow: [22, 24], hand: [26, 23], flex: 0.4, arrow: [26, 23, 37, 23] },
    { grip: [34, 23], bowElbow: [30, 22], nock: [23, 23], elbow: [19, 23], hand: [23, 23], flex: 1, arrow: [23, 23, 37, 23] },
    { grip: [34, 23], bowElbow: [30, 22], nock: [23, 23], elbow: [19, 23], hand: [23, 23], flex: 1, arrow: [23, 23, 37, 23] },
    { grip: [34, 23], bowElbow: [30, 22], nock: null, elbow: [18, 22], hand: [20, 20], flex: 0 },
    { grip: [33, 24], bowElbow: [29, 23], nock: null, elbow: [19, 24], hand: [21, 25], flex: 0 },
  ][i];
  return { ...BASE, ...T, cloakBack: [0, 0, 1, 1, 2, 1][i], far: LEG.front, near: LEG.back };
}

let cache;
export const pics = () => (cache ??= [
  ...Array.from({ length: 8 }, (_, i) => rangerFrame(idle(i))),
  ...Array.from({ length: 8 }, (_, i) => rangerFrame(walk(i))),
  ...Array.from({ length: 6 }, (_, i) => rangerFrame(attack(i))),
]);
const gen = () => pics().map((p) => toBuf(p, PAL));

export default [{
  cls: 'archer',
  id: 'remaster-v1',
  name: 'Remaster V1 · Ranger',
  description: 'Lyra in a leaf-green hood and cloak over tan leather, a recurve longbow in the front hand and a fletched quiver on her back. She nocks, draws to the cheek and looses: the release is attack frame 4.',
  collection: 'Remasters',
  def: {
    gen,
    idle: [0, 1, 2, 3, 4, 5, 6, 7], walk: [8, 9, 10, 11, 12, 13, 14, 15], attack: [16, 17, 18, 19, 20, 21],
    // The lab's game screen builds lab sprites without attackRelease, and the game's bow pose
    // (game/ranger-animation.js) then picks a NaN frame for any archer with an attackFps: so
    // attackFps stays 0 here (the lab plays the attack at its default 10 fps). In the game
    // proper this sprite wants attackFps 13 with attackRelease 4 (the release frame).
    attackFps: 0, attackRelease: 4, gameAttackFps: 13, motionRate: 12 / (9.8 * 1.15), idleRate: 6 / 1.6,
    anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false,
  },
}];
