// Eldrin, the Sorcerer: a Frost Archmage (remaster-v5).
import { Pic, palette, outline, dropStrays, toBuf, across, bands, stroke, stamped, despeckle, R, softenNotches, fillDoubled } from './kit.js';

export const PAL = palette({
  k: 'k',
  // robe and hat: royal blue, dark to light, and the pale inner robe
  K: 'K', u: 'u', '7': '#1f6fbf', U: 'U', '8': '#7fd0f5',
  // beard and silver
  w: 'w', G: 'G', g: 'g', N: 'N',
  // skin
  s: 's', S: 'S',
  // gold trim and the staff's wood (B lit, b a dark brown well under the night line)
  Y: 'Y', y: 'y', d: 'd', B: 'B', b: '#5e3230', m: 'm',
  // ice, and the fire in his palm and at the heart of a cast: pale flame, orange and its deep
  // orange tongue (all glowing; c also lights his eyes)
  X: 'X', c: 'c', o: 'o', f: 'f', O: 'O',
});

// The hat: a tall cone bent back at the tip, a gold band, a wide brim on rows 13-14. Placed so
// the brim's left end is at x 14; dx/dy move it with the head; tip bends the top rows back.
const HAT = [
  '......u7.........', // 5
  '.......u7........', // 6
  '.......u77.......', // 7
  '........877......', // 8
  '.......U877u.....', // 9
  '......UU877uu....', // 10
  '.....UUU877uuK...', // 11
  '.....YYYYYyyyd...', // 12  gold band
  '..u77777777777uK.', // 13  brim
  '...KKKKKKKKKKKK..', // 14  brim's underside
];

// Face under the brim: white brows over two eyes, the nose, the cheeks; the white beard down to
// row 30 with a g shadow on its right. Placed at (19, 15).
const FACE = [
  '..wwSSSSww', // 15 the brows' outer ends, the forehead in the brim's shadow
  '...SwKKwSs', // 16 the brows' inner ends, a row lower, the brim's shadow between them: a scowl
  '...ScSscsS', // 17 eyes in shadow, glaring frost
  '..GwwSsssS', // 18 moustache starts, nose
  '..wwwwwGG.', // 19
  '..wwwwGGg.', // 20
  '..wwwwGGg.', // 21
  '...wwwGgg.', // 22
  '...wwwGgg.', // 23
  '...wwwGg..', // 24
  '....wwGgg.', // 25
  '....wwGg..', // 26
  '....wwGg..', // 27
  '.....wGg..', // 28
  '.....wG...', // 29
  '......g...', // 30
];

// The robe: shoulders on row 20 (x 15-30), a waist at the sash (x 18-28 on row 27), a hem flared
// to x 13-32 on row 38. kick: the hem's front corner (and a boot toe) kicked forward; back: the
// hem's back corner trailing; lean: the top shifted.
function robe(p, by, kick, back, lean) {
  const t = 20 + by;
  const pts = [
    [16.5 + lean, t - 0.5], [28.5 + lean, t - 0.5], [30.5 + lean, t + 1.5], [30.5 + lean, t + 3],
    [28.5 + lean * 0.5, 27.5], [32.5 + kick, 38.5], [12.5 - back, 38.5], [17.5 + lean * 0.5, 27.5],
    [14.5 + lean, t + 3], [14.5 + lean, t + 1.5],
  ];
  p.poly(pts, '7');
  // Cone shading: a lit band on the left, a shadow band on the right.
  bands(p, { left: [[3, 'U']], rest: '7', right: [[2, 'u']] });
  // The pale inner robe down the front, from the sash to the hem, with a silver trim line.
  for (let y = 28; y <= 38; y++) {
    const x = R(25 + lean * 0.5 + ((y - 28) / 10) * (2 + kick * 0.6));
    p.on(x, y, 'y');
    p.on(x + 1, y, '8');
    p.on(x + 2, y, '8');
    p.on(x + 3, y, '8');
  }
  // Folds: 2-px diagonals from the sash.
  for (const [x0, x1] of [[20, 17 - back * 0.5], [23, 22 - back * 0.3]]) {
    p.line(x0 + lean * 0.5, 28, x1, 37, 'u', true);
    p.line(x0 + 1 + lean * 0.5, 28, x1 + 1, 37, 'u', true);
  }
  // The sash with its gold clasp.
  for (let x = 17; x <= 29; x++) p.on(x + R(lean * 0.5), 27, x === 25 ? 'Y' : 'K');
  // The hem's trim.
  for (let x = 10; x <= 36; x++) p.on(x, 38, x > 28 ? 'g' : 'G');
}

// The staff: 2 px of driftwood (B lit, b shade) from the foot up to a crescent claw holding the
// ice orb. glow: glints beside the orb. Returns the orb's centre.
function staff(p, foot, top) {
  const [fx, fy] = foot, [tx, ty] = top;
  p.line(fx, fy, tx, ty + 3, 'b');
  p.line(fx - 1, fy, tx - 1, ty + 3, 'B');
  // Claw: the lit prong in g, the far one in N, a 3-px base (solid runs, no lone pixels).
  p.set(tx - 2, ty, 'g').set(tx - 2, ty + 1, 'g');
  p.set(tx + 2, ty, 'N').set(tx + 2, ty + 1, 'N');
  p.set(tx - 1, ty + 2, 'N').set(tx, ty + 2, 'N').set(tx + 1, ty + 2, 'N');
  p.ellipse(tx, ty - 1, 1.5, 1.5, (x, y, nx, ny) => (nx + ny < -0.7 ? 'w' : nx + ny < 0.2 ? 'X' : 'c'));
  return [tx, ty - 1];
}

// Fire in his palm: 5x5, in four phases of flicker.
const FLAME = [
  ['..O..', '.OoO.', '.ofoO', 'Offfo', '.ooo.'],
  ['.O...', '.oO..', 'OofO.', 'offoO', '.ooo.'],
  ['...O.', '..oO.', '.Ofo.', 'offfO', '.ooo.'],
  ['.....', '.O.O.', 'OofoO', 'offfo', '.ooo.'],
];

// The same fire, smaller (3x4), held at the waist on the walk, in the idle's four phases.
const FLAME_S = [
  ['.O.', '.OO', 'ofo', 'ooo'],
  ['O..', 'OO.', 'ofo', 'ooo'],
  ['..O', '.OO', 'ofo', 'ooo'],
  ['...', 'OO.', 'ofo', 'ooo'],
];

// A starburst of frost around a warm ember core, for the cast.
function burst(p, cx, cy, r) {
  for (let a = 0; a < 8; a++) {
    const ang = (a * Math.PI) / 4, len = a % 2 ? r * 0.6 : r;
    for (let k = 1; k <= len; k++) p.set(R(cx + Math.cos(ang) * k), R(cy + Math.sin(ang) * k), k > len - 1.5 ? 'c' : k > len * 0.5 ? 'X' : 'w');
  }
  p.ellipse(cx, cy, 1.5, 1.5, (x, y, nx, ny) => (nx * nx + ny * ny < 0.3 ? 'o' : 'f'));
}

function mageFrame(q) {
  const pic = new Pic();
  const by = q.bob, br = q.breath || 0, lean = q.lean || 0, hy = q.headDy || 0;
  // Staff behind the far hand.
  const st = new Pic();
  const orb = staff(st, q.foot, q.top);
  if (q.glow) for (const [dx, dy] of q.glow === 2 ? [[-3, 1], [3, -2], [-3, -2], [3, 2]] : [[-3, -1], [3, 1]]) st.set(orb[0] + dx, orb[1] + dy, 'c');
  if (q.spark !== undefined) {
    // A glint circling the orb, a step every frame.
    const [dx, dy] = [[-3, -1], [-2, -3], [0, -4], [2, -3], [3, -1], [3, 1], [2, 3], [-2, 3]][q.spark % 8];
    st.set(orb[0] + dx, orb[1] + dy, 'w').set(orb[0] + R(dx * 0.6), orb[1] + R(dy * 0.6), 'c');
  }
  if (q.burst) burst(st, orb[0], orb[1], q.burst);
  pic.over(st);
  // The far sleeve reaching the staff.
  const fs = new Pic();
  stroke(fs, 28 + lean, 22 + by + br, q.grip[0] - 2, q.grip[1], 1.6, 1.4, across(['7', 'u', 'u']));
  pic.over(fs);
  // Robe, then the boot toe under the hem's front.
  const rb = new Pic();
  robe(rb, by + br, q.kick || 0, q.back || 0, lean);
  pic.over(rb, { sep: 'u', sides: 'l' });
  if (q.toe !== undefined && q.toe !== null) pic.over(stamped(['bB.', 'mbb'], q.toe, 37), { sep: 'k', sides: 'u' });
  if (q.heel !== undefined && q.heel !== null) pic.over(stamped(['.bB', 'bbm'], q.heel, 37), { sep: 'k', sides: 'u' });
  // Head: hat and face, riding the breath and their own lag.
  const head = new Pic();
  HAT.forEach((row, j) => head.stamp([row], 14 + lean + (j <= 3 ? q.tip || 0 : 0), 5 + j + by + br + hy));
  FACE.forEach((row, j) => head.stamp([row], 19 + lean + (j >= 10 ? q.beard || 0 : 0), 15 + j + by + br + hy));
  pic.over(head, { sep: 'u', sides: 'd' });
  // Far hand on the staff.
  pic.set(q.grip[0] - 1, q.grip[1], 's').set(q.grip[0], q.grip[1], 's').set(q.grip[0] - 1, q.grip[1] + 1, 'S').set(q.grip[0], q.grip[1] + 1, 'S');
  // Near bell sleeve and hand; the hand may hold a frost light.
  const sl = new Pic();
  if (q.raise) {
    // Raised to the chest: the upper sleeve to the elbow, the bell sleeve hanging from the
    // forearm, a gold cuff, the hand palm up.
    const [ex, ey] = q.raise.elbow, [hx2, hy3] = q.raise.hand;
    stroke(sl, 18 + lean, 22 + by + br, ex, ey, 1.6, 1.7, across(['U', '7', 'u']));
    stroke(sl, ex, ey, hx2 - 1, hy3 + 1, 1.8, 2.1, across(['U', '7', 'u']));
    sl.set(hx2 - 1, hy3, 'y').set(hx2 - 1, hy3 + 1, 'd');
    sl.set(hx2, hy3, 's').set(hx2 + 1, hy3, 's').set(hx2, hy3 + 1, 'S');
  } else {
    stroke(sl, 18 + lean, 22 + by + br, q.sleeve[0], q.sleeve[1], 1.7, 2.3, across(['U', '7', 'u']));
    sl.set(R(q.sleeve[0]) + 1, R(q.sleeve[1]) + 2, 's').set(R(q.sleeve[0]), R(q.sleeve[1]) + 2, 'S');
    sl.set(R(q.sleeve[0]) - 1, R(q.sleeve[1]) + 1, 'y');
  }
  pic.over(sl, { sep: 'u', sides: 'rd' });
  // Fire held up in the palm (or, in the cast's wind-up, at the lowered hand): a pale core, an
  // orange body, a deep orange tongue flickering upward; it throws a warm rim (y) on the left
  // edges of the beard and the sleeve.
  let flameAt = null, reach = 11;
  if (q.walkFlame !== undefined) {
    // On the walk the fire rides in the palm at the waist (3x4), flickering as in the idle, its
    // tongue trailing a pixel on the passing frames.
    const [px, py] = [R(q.sleeve[0]) + 1, R(q.sleeve[1]) + 2];
    const E = FLAME_S[q.walkFlame % 4];
    E.forEach((row, j) => pic.stamp([row], px - 1 - (q.trail && j <= 1 ? 1 : 0), py - 4 + j));
    flameAt = [px, py - 2];
    // its light on the beard and sleeve flickers with it
    reach = 5 + [0, 2, -1, 1][q.walkFlame % 4];
  } else if (q.ember !== undefined) {
    const [hx2, hy3] = q.raise ? q.raise.hand : [R(q.sleeve[0]) + 1, R(q.sleeve[1]) + 1];
    const E = FLAME[q.ember % 4];
    const fx0 = hx2 - 2 + (q.raise ? 0 : 1), fy0 = hy3 - E.length;
    pic.stamp(E, fx0, fy0);
    flameAt = [fx0 + 2, fy0 + 2];
    reach = 11 + [0, 1, -1, 1][q.ember % 4];
  }
  if (flameAt) {
    const marks = [];
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      const c = pic.get(x, y);
      if (!c || Math.hypot(x - flameAt[0], y - flameAt[1]) > reach) continue;
      const beard = c === 'w' && head.get(x, y) === 'w' && y >= 18 + by + br + hy;
      const sleeve = 'U7u'.includes(c) && sl.get(x, y);
      if ((beard && pic.get(x - 1, y) !== 'w') || (sleeve && !pic.get(x - 1, y) && y < flameAt[1] + 9)) marks.push([x, y]);
    }
    for (const [x, y] of marks) pic.set(x, y, 'y');
  }
  despeckle(pic, ['7', 'u', 'U', 'G', 'w']);
  // Doubled ink where a sleeve meets the robe or the staff's outline (below the hat): filled with
  // the sleeve's blue.
  return fillDoubled(softenNotches(dropStrays(outline(pic, 'k')), 'KmuN7'), 'u7U', (x, y) => y >= 19 + by + br + hy);
}

// ---------------------------------------------------------------- poses --

const BASE = { bob: 0, breath: 0, lean: 0, headDy: 0, foot: [34, 38], top: [34, 7], grip: [34, 24], sleeve: [19, 29], glow: 0, kick: 0, back: 0 };

// Idle: commanding. The staff planted forward and leaning, an ember held up in the free hand,
// a scowl under the brim. The breath lifts chest, head and hand (frames 3-5); the beard's tip,
// the hat's tip and the hem run on a continuous wave a frame behind it; the ember pulses and a
// glint circles the orb, a step every frame, so no two frames are alike.
function idle(i) {
  const br = [0, 0, 0, -1, -1, -1, 0, 0][i];
  return {
    ...BASE, breath: br,
    foot: [32, 38], top: [40, 7 + br], grip: [36, 22 + br],
    raise: { elbow: [14, 23 + br], hand: [12, 16 + br] }, ember: i % 4,
    tip: [0, 0, -1, -1, -1, 0, 0, 0][i], beard: [0, 0, 0, -1, -1, 0, 0, 1][i], back: [0, 1, 1, 1, 0, 0, 0, 0][i],
    spark: i,
  };
}

// Walk: the staff is planted on the contact frames (0, 4) while the body passes it, swung
// forward on the passing frames (2, 6); the hem kicks forward with a boot toe on alternate
// steps; the near sleeve swings; the head and hat dip a frame after the body.
function walk(i) {
  const bob = [0, 1, 0, 0, 0, 1, 0, 0][i];
  const lag = [0, 0, 1, 0, 0, 0, 1, 0][i];
  const fx = [33, 31, 35, 34, 33, 31, 35, 34][i];
  const fy = [38, 38, 37, 38, 38, 38, 37, 38][i];
  const s = Math.cos((i * Math.PI) / 4);
  return {
    ...BASE, bob, headDy: lag,
    foot: [fx, fy], top: [fx + 3, fy - 31 + lag], grip: [fx + 2, fy - 14],
    kick: [2, 1, 0, 0, 0, 0, 0, 0][i], toe: [32, 31, null, null, null, null, null, null][i],
    back: [0, 1, 1, 2, 3, 2, 0, 0][i], heel: [null, null, null, null, 11, 12, null, null][i],
    sleeve: [R(19 + 2 * s), 28 + bob], walkFlame: i % 4, trail: i === 2 || i === 6, tip: [0, -1, -1, 0, 0, 0, -1, -1][i], beard: [0, 0, -1, -1, -1, 0, 0, 1][i], spark: i,
  };
}

// The cast: lean back 2 px drawing the staff over the shoulder (orb near (24, 4)) with the free
// hand raised and glowing; thrust it forward leaning in 2 px, the robe flaring; the orb bursts
// into a frost star around an ember core (frame 3, the blow); fade; recover.
function attack(i) {
  const T = [
    { lean: -1, foot: [33, 36], top: [22, 8], grip: [29, 23], sleeve: [16, 25], ember: 1, glow: 1, back: 1 },
    { lean: -2, foot: [32, 34], top: [15, 12], grip: [24, 24], sleeve: [14, 22], ember: 2, glow: 2, back: 2 },
    { lean: 1, foot: [30, 37], top: [34, 9], grip: [32, 23], sleeve: [20, 26], glow: 2, kick: 1 },
    { lean: 2, foot: [25, 33], top: [39, 18], grip: [34, 23], sleeve: [21, 27], burst: 6, kick: 2 },
    { lean: 2, foot: [26, 34], top: [38, 17], grip: [33, 24], sleeve: [20, 28], burst: 3, kick: 2 },
    { lean: 1, foot: [33, 38], top: [35, 9], grip: [34, 24], sleeve: [19, 29], glow: 1, kick: 1 },
  ][i];
  return { ...BASE, ...T };
}

let cache;
export const pics = () => (cache ??= [
  ...Array.from({ length: 8 }, (_, i) => mageFrame(idle(i))),
  ...Array.from({ length: 8 }, (_, i) => mageFrame(walk(i))),
  ...Array.from({ length: 6 }, (_, i) => mageFrame(attack(i))),
]);
const gen = () => pics().map((p) => toBuf(p, PAL));

export default [{
  cls: 'mage',
  id: 'remaster-v5',
  name: 'Remaster V5 · Sorcerer',
  description: 'Eldrin the Frost Archmage, commanding: a tall bent hat with a gold band, frost-lit eyes glaring from the brim\'s shadow under scowling white brows, a long white beard, royal-blue robes shaded as a cone, the driftwood staff planted forward at a lean with its ice orb glinting, and his free hand raised to his head holding a flickering fire that lights his beard. He walks planting the staff, the fire still flickering in his free hand at his waist; his cast draws the staff back over his shoulder and thrusts it into a frost star around an ember core.',
  collection: 'Remasters',
  def: {
    gen, emissive: 'cXofO',
    idle: [0, 1, 2, 3, 4, 5, 6, 7], walk: [8, 9, 10, 11, 12, 13, 14, 15], attack: [16, 17, 18, 19, 20, 21],
    attackFps: 13, motionRate: 10 / 9.8, idleRate: 6 / 1.6,
    anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false,
  },
}];
