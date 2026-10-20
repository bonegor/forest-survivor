// Mercy Crane, the Witch Hunter (new heroes, 20 October 2026).
// A grim hunter in a wide-brimmed capotain with a silver buckle, a long blue-black frock coat over
// a white falling-band collar, a bandolier of silver bolts, tall boots with leather cuffs, and a
// heavy crossbow held levelled at the hip. Lit from the top-left; a slate rim on her top-left edges
// carries her at night.
import { Pic, palette, outline, dropStrays, toBuf, across, bands, stroke, ribbon, leg, GAIT, stamped, despeckle, destripe, destripeCols, R, softenNotches, fillDoubled } from './kit-witchhunter.js';

export const PAL = palette({
  k: 'k',
  // the coat and hat: blue-black slate, rim to deepest
  '1': '#9aa5c0', '2': '#5d6889', '3': '#33384f', '4': '#212436',
  // the falling-band collar and cuffs: white linen, its cool shade
  z: 'z', Z: '#aab3c6',
  // silver: buckles, bolt shafts, the crossbow's steel prod; w: the bolt tips' glint (glows)
  G: 'G', g: 'g', N: 'N', w: 'w',
  // skin
  s: 's', S: 'S',
  // auburn hair
  a: '#a5503a', A: '#6c2c27',
  // leather and walnut: the stock, belt, bandolier, boot cuffs (B lit, b dark, m deepest)
  t: 't', B: '#9a5a44', b: '#6e3a34', m: 'm',
});

// The hat and the head under it. A capotain: a tall crown (rows 7-11) with a dark band and a
// silver buckle at its front, an 18-px brim on rows 12-13 drooping a pixel at the front; under
// it the face in the brim's shadow, one eye, the nose, a grim mouth, auburn hair at the back.
// Placed at (15, 7).
const HEAD = [
  '......111122......', //  6  the crown's top
  '.....12222234.....', //  7
  '.....12222334.....', //  8
  '.....12223334.....', //  9
  '.....3444GGg4.....', // 10  the band, the buckle
  '....24444Ggg44....', // 11
  '111122222222223333', // 12  the brim, lit on top
  '444444444444444444', // 13  its underside
  '.....AaASSSSSS..44', // 14  hair, the forehead in the brim's shadow; the brim's front droops
  '.....AaassssAAs...', // 15  the brows, drawn down
  '.....AaAssszks....', // 16  the eye
  '.....aaAssssss....', // 17  the nose
  '.....aaASsssSs....', // 18  a grim mouth
  '......aASssssS....', // 19  the jaw
];

// The coat's body: a white falling-band collar over the shoulders with its two tabs at the front,
// the lit plane down the left, a belt with a silver buckle, the hips. Placed at (17, 19).
const TORSO = [
  '.....zzzzzz..', // 19
  '..1zzzzzzzzG.', // 20  shoulders and the collar
  '.12zzzzzzzZ4.', // 21  the collar's fall, the tabs
  '.12222333zZ4.', // 22  the tabs' ends
  '.12223333334.', // 23
  '.12223333334.', // 24
  '..2223333334.', // 25
  '..2223333334.', // 26
  '..2223333344.', // 27
  '..bbbbbGgbbm.', // 28  belt
  '..22233333344', // 29  hips
];

// The coat's skirt, behind the legs: from the waist to a hem slanting down from the front (row
// 31) to the back (row 35), split up the back into two tails. back: how far the tails stream;
// wave: a ripple along the hem.
function skirt(p, by, back, wave) {
  const top = 28 + by;
  const hem = (x) => R(Math.sin((x + wave * 1.3) * 0.9) * 0.6);
  const pts = [[17.5, top - 0.5], [28.5, top - 0.5], [29.5, 31 + by], [27.5, 33 + by], [22, 36 + by + hem(22)], [18 - back * 0.4, 36.4 + by + hem(18)], [15 - back, 35.6 + by + hem(15)], [16.5 - back * 0.3, 30 + by]];
  p.poly(pts, '3');
  // The vent between the tails.
  const vx = R(19 - back * 0.3);
  for (let y = 34 + by; y <= 37 + by; y++) p.set(vx, y, null);
  bands(p, { left: [[1, '1'], [2, '2']], rest: '3', right: [[1, '4']] });
  // A fold down each tail.
  p.line(R(22 - back * 0.2), 30 + by, R(21 - back * 0.4), 35 + by, '4', true);
  p.line(R(18 - back * 0.2), 31 + by, R(17 - back * 0.6), 35 + by, '4', true);
  destripe(p, [['2', '4'], ['1', '3']]);
}

// The braid down her back from under the brim, swinging by `sway`.
function braid(p, x0, y0, sway) {
  ribbon(p, [[x0, y0, 1.1], [x0 - 1 - sway * 0.5, y0 + 3, 1.0], [x0 - 2 - sway, y0 + 6, 0.8]], across(['a', 'A'], [0]));
  p.set(R(x0 - 2 - sway), R(y0 + 7), 'B');
}

// Legs: dark trousers to the knee, tall boots with a turned-down leather cuff.
const LEG_NEAR = (s, x, y) => (y <= 30 ? { E: '2', A: '2', B: '3', C: '3', D: 'm' } : y === 31 ? { E: 't', A: 't', B: 'B', C: 'b', D: 'm' } : { E: 't', A: 'B', B: 'B', C: 'b', D: 'm' })[s];
const LEG_FAR = (s, x, y) => (y <= 30 ? { E: '3', A: '3', B: '3', C: '4', D: 'm' } : y === 31 ? { E: 'B', A: 'B', B: 'b', C: 'm', D: 'm' } : { E: 'B', A: 'b', B: 'b', C: 'm', D: 'm' })[s];

// The crossbow, its stock along angle `ang` (degrees, 0 level and pointing right, below 0 the front
// up) from the grip o (the bottom of the stock where the near hand holds it). k runs along the
// stock (forward), s across it (up). A walnut stock (B on top, b under) from the butt (k -7) to
// the fore-end (k 10), a windlass drum on the butt, a steel prod at k 11 whose limbs curve back
// to tips 5 px above and below; the string drawn back to the nut at k `nut`; the bolt on the
// stock, a white glinting tip. bend: how far the prod's tips are drawn back (2 spanned, 0.6
// loosed). glint: a step along the bolt's shaft where it catches the light.
function crossbow(p, o, ang, { nut = 5, bend = 1.2, bolt = true, glint = null } = {}) {
  const a = (ang * Math.PI) / 180, f = [Math.cos(a), Math.sin(a)], u = [Math.sin(a), -Math.cos(a)];
  const at = (k, s) => [R(o[0] + f[0] * k + u[0] * s), R(o[1] + f[1] * k + u[1] * s)];
  const ln = (k0, s0, k1, s1, c) => {
    const [x0, y0] = at(k0, s0), [x1, y1] = at(k1, s1);
    p.line(x0, y0, x1, y1, c);
  };
  // The stock and its drop butt.
  ln(-6, 0, 10, 0, 'b');
  ln(-6, 1, 10, 1, 'B');
  ln(-6, -1, -3, -1, 'b');
  // The windlass drum on the butt.
  p.set(...at(-6, 2), 'G').set(...at(-5, 2), 'g');
  // The prod.
  const back = (s) => { const t = Math.abs(s); return t <= 2 ? 0 : t === 3 ? -0.3 : t === 4 ? -0.6 * bend : -1 * bend; };
  for (let s = -5; s <= 5; s++) {
    const [x, y] = at(11 + back(s), s);
    p.set(x, y, Math.abs(s) >= 4 ? 'g' : 'G');
    if (Math.abs(s) <= 2) p.set(...at(12, s), 'g');
  }
  // The string: to the nut, or straight across when loosed.
  const top = [11 + back(5), 5], bot = [11 + back(-5), -5];
  const nk = nut ?? 10.5;
  ln(top[0] - 0.5, top[1], nk, 2, 'Z');
  ln(bot[0] - 0.5, bot[1], nk, 2, 'Z');
  if (bolt) {
    // fletching, the silver shaft, the white head
    ln(nk, 2, 13, 2, 'G');
    p.set(...at(nk, 2), 'z').set(...at(nk, 3), 'z');
    p.set(...at(13, 2), 'G').set(...at(14, 2), 'w');
    if (glint !== null) p.set(...at(nk + 2 + glint, 2), 'w');
  }
  return at;
}

// Moonlight on the silhouette: coat and hat pixels whose top or left neighbour is clear take the
// rim colour; a rim pixel alone on a stair step is left off (a speck).
function rimTopLeft(pic, mine) {
  const UP = { '2': '1', '3': '1', '4': '2' };
  const marks = [];
  for (let y = 0; y < pic.h; y++) for (let x = 0; x < pic.w; x++) {
    const c = pic.get(x, y);
    if (!c || !mine(x, y) || (pic.get(x, y - 1) && pic.get(x - 1, y))) continue;
    if (UP[c]) marks.push([x, y, UP[c]]);
  }
  const at = new Map(marks.map(([x, y, c]) => [x + ',' + y, c]));
  for (const [x, y, c] of marks) {
    const runs = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => at.get(x + a + ',' + (y + b)) === c || pic.get(x + a, y + b) === c);
    if (runs) pic.set(x, y, c);
  }
  return pic;
}

function arm(p, sh, el, hand, near) {
  stroke(p, sh[0], sh[1], el[0], el[1], 1.35, 1.2, across(near ? ['2', '3'] : ['3', '4'], [0.25]));
  stroke(p, el[0], el[1], hand[0], hand[1], 1.2, 1.05, across(near ? ['2', '3'] : ['3', '4'], [0.25]));
}

function hunterFrame(q) {
  const pic = new Pic();
  const by = q.bob || 0, br = q.breath || 0, lean = q.lean || 0, hy = q.headDy || 0;
  const hb = q.handDy ?? br;
  // The braid, behind everything.
  const bd = new Pic();
  braid(bd, 21 + lean, 17 + by + br + hy, q.braid || 0);
  pic.over(bd);
  // The coat's skirt, behind the legs.
  const sk = new Pic();
  skirt(sk, by, q.coatBack || 0, q.coatWave || 0);
  pic.over(sk, { sep: '4', sides: 'd' });
  // The far arm, behind the body, reaching forward to the fore-end.
  const o = [q.grip[0], q.grip[1] + by + hb];
  const fa = new Pic();
  const a = (q.ang * Math.PI) / 180;
  const fh = [o[0] + Math.cos(a) * 6 - Math.sin(a), o[1] + Math.sin(a) * 6 + Math.cos(a)];
  arm(fa, [27 + lean, 22 + by + br], [q.farElbow[0], q.farElbow[1] + by + hb], fh, false);
  pic.over(fa);
  // Legs from one hip column.
  const lf = leg(new Pic(), 23, 30 + by, q.far, LEG_FAR, { tw: 4 });
  const ln = leg(new Pic(), 23, 30 + by, q.near, LEG_NEAR, { tw: 4 });
  pic.over(lf, { sep: '4', sides: 'rd' });
  pic.over(ln, { sep: '4', sides: 'rd' });
  // The body, then the head and hat on it.
  const body = new Pic();
  TORSO.forEach((row, j) => body.stamp([row], 17 + (j <= 8 ? lean : 0), 19 + j + by + (j <= 6 ? br : 0)));
  // The bandolier: from the near shoulder down across the chest to the hip, three silver bolts
  // standing in its loops.
  const bl = new Pic();
  bl.line(20 + lean, 21 + by + br, 27 + lean, 27 + by, 'B').line(20 + lean, 22 + by + br, 27 + lean, 28 + by, 'b');
  for (const t of [0.3, 0.55, 0.8]) {
    const x = R(20 + lean + 7 * t), y = R(21 + by + br + 6 * t);
    // (the tips glint: emissive w, so every frame has a glow pixel)
    bl.set(x, y - 1, 'G').set(x, y - 2, 'w');
  }
  body.over(bl, { sep: null });
  const head = new Pic();
  HEAD.forEach((row, j) => head.stamp([row], 15 + lean + (j <= 7 ? (q.hatDx || 0) : 0), 6 + j + by + br + hy + (j <= 7 ? (q.hatDy || 0) : 0)));
  body.over(head);
  pic.over(body, { sep: '4', sides: 'd' });
  // The crossbow over the body; the far hand under its fore-end.
  const cb = new Pic();
  const at = crossbow(cb, o, q.ang, { nut: q.nut === undefined ? 5 : q.nut, bend: q.bend ?? 2, bolt: q.bolt !== false, glint: q.glint ?? null });
  cb.set(...at(6, -1), 'S');
  pic.over(cb);
  if (q.flash) {
    // The snap: a white burst at the prod and streaks where the bolt left.
    const [fx, fy] = at(13, 2);
    pic.set(fx, fy, 'w').set(fx + 1, fy, 'w').set(fx, fy - 1, 'z').set(fx, fy + 1, 'z');
    for (let k = 0; k < 5; k++) pic.set(fx + 2 + k, fy, k < 2 ? 'w' : k < 4 ? 'G' : 'g');
    for (let k = 0; k < 3; k++) { pic.set(fx + 2 + k, fy - 2, k < 2 ? 'G' : 'g'); pic.set(fx + 2 + k, fy + 2, k < 2 ? 'G' : 'g'); }
  }
  // The near arm in front, its hand on the grip or on the windlass crank.
  const na = new Pic();
  const nh = q.crank ? at(...q.crank) : at(0, -1);
  arm(na, [20 + lean, 22 + by + br], [q.elbow[0], q.elbow[1] + by + hb], nh, true);
  na.set(nh[0], nh[1], 's').set(nh[0] + 1, nh[1], 'S');
  // the white cuff at the wrist
  const cx = R(q.elbow[0] + (nh[0] - q.elbow[0]) * 0.6), cy = R(q.elbow[1] + by + hb + (nh[1] - q.elbow[1] - by - hb) * 0.6);
  na.set(cx, cy, 'z').set(cx, cy - 1, 'z');
  if (q.crank) {
    const [dx, dy] = at(-5.5, 2);
    na.line(dx, dy, nh[0], nh[1], 'g');
    na.set(nh[0], nh[1], 's');
  }
  pic.over(na, { sep: (c) => ('23'.includes(c) ? '4' : null), sides: 'r' });
  despeckle(pic, ['2', '3', '4', 'b', 'm']);
  const parts = [sk, fa, lf, ln, body];
  rimTopLeft(pic, (x, y) => (parts.some((pp) => pp.get(x, y)) && !cb.get(x, y)) || (na.get(x, y) && '234'.includes(na.get(x, y))));
  const out = softenNotches(dropStrays(outline(pic, 'k')), '4m3bAS2');
  return out;
}

// ---------------------------------------------------------------- poses --

const STANCE = {
  back: { k: [-2, 33], a: [-4, 36], foot: 'flat' },
  front: { k: [3, 33], a: [5, 36], foot: 'flat' },
};

const BASE = {
  bob: 0, breath: 0, lean: 0, headDy: 0,
  far: STANCE.front, near: STANCE.back,
  grip: [24, 27], ang: 0, elbow: [19, 26], farElbow: [28, 26],
  coatBack: 0, coatWave: 0, braid: 0,
};

// Idle: the crossbow levelled at the hip, spanned and loaded. The breath lifts chest, head and hat
// (frames 3-5) with the hands a frame behind; the coat's tails and the braid sway on a slow wave
// and a glint runs down the bolt.
function idle(i) {
  const br = [0, 0, 0, -1, -1, -1, 0, 0][i];
  const hb = [0, 0, 0, 0, -1, -1, -1, 0][i];
  return {
    ...BASE, breath: br, handDy: hb,
    coatBack: [0, 0, 0.5, 0.5, 1, 1, 0.5, 0][i], coatWave: i, braid: [0, 0, 1, 1, 1, 0, 0, -1][i],
    glint: [0, 1, 2, 3, 4, 5, null, null][i],
  };
}

// Walk: the shared gait from one hip column; the crossbow carried levelled at the hip, its nose
// bobbing against the stride; the head dips a frame late; the coat's tails stream back.
function walk(i) {
  const bob = [0, 1, 0, 0, 0, 1, 0, 0][i];
  const lag = [0, 0, 1, 0, 0, 0, 1, 0][i];
  const s = Math.cos((i * Math.PI) / 4);
  return {
    ...BASE, bob, headDy: lag, lean: [0, 0, 0, 1, 0, 0, 0, 1][i],
    far: GAIT[i], near: GAIT[(i + 4) % 8],
    grip: [R(24 + s * 0.6), 27], ang: R(2 * s), elbow: [19 + s * 0.5, 26],
    coatBack: [1, 1.5, 2, 1.5, 1, 1.5, 2, 1.5][i], coatWave: i, braid: [1, 2, 2, 1, 1, 2, 2, 1][i],
  };
}

// The shot: the crossbow comes up to the shoulder (0) and is aimed (1); frame 2 looses with a
// snap (the bolt leaves, the prod springs forward, a white burst); 3 recoils, nose up and the body
// rocked back; 4-5 lower it to the hip and crank the windlass to span it again, a new bolt laid
// on at 5.
function attack(i) {
  const T = [
    { grip: [25, 25], ang: -3, elbow: [19, 25], farElbow: [29, 25], lean: 0 },
    { grip: [25, 23], ang: 0, elbow: [19, 24], farElbow: [29, 24], lean: 1 },
    { grip: [25, 23], ang: 0, elbow: [19, 24], farElbow: [29, 24], lean: 1, nut: null, bend: 0.6, bolt: false, flash: true },
    { grip: [24, 23], ang: -12, elbow: [18, 24], farElbow: [28, 23], lean: -1, nut: null, bend: 0.6, bolt: false, hatDx: -1 },
    { grip: [24, 27], ang: 14, elbow: [19, 24], farElbow: [28, 27], lean: 0, nut: 8, bolt: false, crank: [-6, 5] },
    { grip: [24, 27], ang: 6, elbow: [19, 24], farElbow: [28, 27], lean: 0, nut: 5, bolt: true, crank: [-4, 4] },
  ][i];
  return { ...BASE, ...T, coatBack: [0, 1, 1, 2, 1, 0][i], coatWave: i, braid: [0, 1, 1, 2, 1, 0][i] };
}

let cache;
export const pics = () => (cache ??= [
  ...Array.from({ length: 8 }, (_, i) => hunterFrame(idle(i))),
  ...Array.from({ length: 8 }, (_, i) => hunterFrame(walk(i))),
  ...Array.from({ length: 6 }, (_, i) => hunterFrame(attack(i))),
]);
const gen = () => pics().map((p) => toBuf(p, PAL));

export default [{
  cls: 'witchhunter',
  id: 'v1',
  name: 'Witch Hunter · v1',
  description: 'Mercy Crane, a grim hunter in a wide-brimmed black capotain with a silver buckle, a long blue-black frock coat split into tails, a white falling-band collar, a bandolier of silver bolts and tall cuffed boots, her heavy crossbow levelled at the hip. She brings it to the shoulder, looses with a snap, rides the recoil and cranks the windlass to span it again.',
  collection: 'New heroes',
  def: {
    gen,
    idle: [0, 1, 2, 3, 4, 5, 6, 7], walk: [8, 9, 10, 11, 12, 13, 14, 15], attack: [16, 17, 18, 19, 20, 21],
    attackFps: 12, attackRelease: 2,
    motionRate: 11 / (9.8 * 1.067), idleRate: 6 / 1.6,
    anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false, emissive: 'w',
  },
}];
