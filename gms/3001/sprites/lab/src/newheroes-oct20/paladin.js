// Dame Seraphine, the Paladin (new heroes, 2026-10-20). Drawn with the remaster-v5 kit, unchanged.
import { Pic, palette, outline, dropStrays, toBuf, across, stroke, ribbon, leg, GAIT, STAND, stamped, rimLight, softenNotches, bevel, limb, despeckle, R } from '../remaster-v5/kit.js';

export const PAL = palette({
  k: 'k',
  // pearl plate, its specular white, light to deep (the shadows lean cool, toward lilac)
  w: 'w', '1': '#ebe5d9', '2': '#bfb6bc', '3': '#857c97', '4': '#544a6c',
  // the tabard's and cape's white cloth and its warm shade
  '9': '#f6f1e6', '0': '#d6cab4',
  // gold trim, light to dark
  '6': '#ffe08a', '7': '#e9a93c', '8': '#a8622e',
  // holy light (glows): the sun gold, its pale core, the white of a pillar
  Y: 'Y', f: 'f', z: 'z',
  // skin, eyes, copper hair
  s: 's', S: 'S', e: '#3a2848', a: '#d8743a', A: '#a8452f', m: '#6e2a32',
  // the hammer's ash haft
  B: '#9a5a3a', b: '#5e3230',
});

// Open-faced helm (pearl dome, gold brow band with a sun gem), copper fringe, the face.
// Placed at (19, 10).
const HEAD = [
  '.....11w2...', // 10
  '...111ww22..', // 11
  '..1111112223', // 12
  '..1111122233', // 13
  '..666677Y88.', // 14  brow band
  '..322Aaasss.', // 15  cheek guard, fringe
  '..323AseseS.', // 16  eyes
  '..323Asssss.', // 17
  '..433SsssS..', // 18
  '...43SSsS...', // 19  chin
];

// The torso, placed at (17, 20): the gorget, the white tabard over a pearl cuirass with the sun
// on her breast (rows 20-26 ride the breath), the gold belt, the faulds flaring over the hips.
const TORSO = [
  '.....12222....', // 20 gorget
  '...11w99990223', // 21
  '...1w999Y99023', // 22
  '...1w99YYY9023', // 23
  '...1w9YYfYY023', // 24
  '....1w9YYY903.', // 25
  '....1w99Y9903.', // 26
  '...677767788..', // 27 belt, the buckle
  '..1112w99022..', // 28 faulds
  '..1222w990233.', // 29
  '..2333w990333.', // 30
];
const TORSO_SPLIT = 7; // rows from here on don't breathe

// The near pauldron: a pearl dome with a gold rim. Placed at (15, 20).
const PAULDRON = [
  '.11w1.',
  '11w112',
  '111223',
  '677778',
  '.2233.',
];

const LEG_NEAR = { E: '6', A: '1', B: '2', C: '3', D: '4' };
const LEG_FAR = { E: '7', A: '2', B: '3', C: '4', D: '4' };

// The short cape: from behind the shoulders to the hips, cream, its hem trimmed in gold; its
// back corner streams by `back` and the hem ripples with `wave`.
function cape(p, bx, by, back, wave) {
  const top = 21 + by, hem = 31 + by;
  const tail = 14 - back;
  const H = (x) => hem + R(Math.sin((x + wave * 1.5) * 1.1) * 0.6);
  const pts = [[17 + bx, top], [21 + bx, top], [21 + bx, H(21)]];
  for (let x = 20; x >= tail; x--) pts.push([x + bx, H(x)]);
  pts.push([tail - 0.5 + bx, hem - 2], [15 - back * 0.5 + bx, top + 4], [16 + bx, top + 1]);
  p.poly(pts, '0');
  bevel(p, { hi: '9', mid: '0', lo: '3', rimLo: 1 });
  // one fold from the shoulder to the hem
  p.line(19 + bx, top + 3, 17 - R(back / 2) + bx, hem - 1, '3', true);
  // the gold hem
  for (let x = 0; x < 48; x++) {
    let lo = -1;
    for (let y = 47; y >= 0; y--) if (p.get(x, y)) { lo = y; break; }
    if (lo >= 0) p.set(x, lo, '7');
  }
}

// The copper ponytail from the back of the helm, swinging by `sway`.
function ponytail(p, bx, by, sway) {
  const s = (t) => sway * t * t;
  const spine = [
    [21, 14, 1.2],
    [19.5, 15.5, 1.6],
    [18.5 + s(0.5), 18.5, 1.5],
    [18 + s(0.8), 21.5, 1.2],
    [18.5 + s(1), 24, 0.7],
  ].map(([x, y, r]) => [x + bx, y + by, r]);
  ribbon(p, spine, across(['a', 'A', 'm'], [-0.4, 0.45]));
}

// The hammer: from the fist `g` along `ang` (degrees: 0 right, -90 up), the head's centre `up`
// px out, the butt `down` px back. The head is a pearl-steel block 8 across the haft and 6
// along it, with a gold socket band. snap: the head stays square to the frame (for the small
// tilts of the walk). glint: the lit corner flashes white. Returns the head's centre.
function hammer(p, g, ang, up, down, { snap = false, glint = true } = {}) {
  const a = (ang * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a);
  const ha = snap ? -Math.PI / 2 : a, nx = -Math.sin(ha), ny = Math.cos(ha), vx = Math.cos(ha), vy = Math.sin(ha);
  const hc = [g[0] + ux * up, g[1] + uy * up];
  const butt = [g[0] - ux * down, g[1] - uy * down];
  const hf = new Pic();
  limb(hf, butt[0], butt[1], hc[0], hc[1], 2, ['B', 'b']);
  hf.set(R(butt[0]), R(butt[1]), '7');
  p.over(hf);
  const hd = new Pic();
  const HW = 3.6, HH = 2.6;
  for (let y = R(hc[1] - 6); y <= R(hc[1] + 6); y++) for (let x = R(hc[0] - 6); x <= R(hc[0] + 6); x++) {
    const dx = x - hc[0], dy = y - hc[1];
    const al = dx * vx + dy * vy, cr = dx * nx + dy * ny;
    if (Math.abs(al) > HH || Math.abs(cr) > HW) continue;
    hd.set(x, y, Math.abs(cr) < 1.1 ? 'g' : 'm');
  }
  bevel(hd, { hi: '1', mid: '2', lo: '3', keep: new Set(['g']) });
  for (let i = 0; i < hd.c.length; i++) if (hd.c[i] === 'g') {
    const x = i % 48, y = (i / 48) | 0;
    hd.c[i] = !hd.get(x, y - 1) || !hd.get(x - 1, y) ? '6' : !hd.get(x, y + 1) || !hd.get(x + 1, y) ? '8' : '7';
  }
  if (!snap) despeckle(hd, ['1', '2', '3', '6', '7', '8']);
  const b = hd.bounds();
  if (glint && b) for (let y = b.y0; y <= b.y1; y++) {
    let done = false;
    for (let x = b.x0; x <= b.x1; x++) if (hd.get(x, y) === '1') { hd.set(x, y, 'w'); if (hd.get(x + 1, y) === '1') hd.set(x + 1, y, 'w'); done = true; break; }
    if (done) break;
  }
  p.over(hd, { sep: 'b', sides: 'd' });
  return hc;
}

// A plate arm: shoulder to elbow to fist, pearl, a gold cop at the elbow, a gauntlet fist.
function arm(p, sh, el, fist, ramp = ['1', '2', '3']) {
  stroke(p, sh[0], sh[1], el[0], el[1], 1.3, 1.2, across(ramp, [-0.2, 0.55]));
  stroke(p, el[0], el[1], fist[0], fist[1], 1.2, 1.1, across(ramp, [-0.2, 0.55]));
  despeckle(p, ramp);
  p.set(R(el[0]), R(el[1]), '7');
  gauntlet(p, fist, ramp);
}
function gauntlet(p, fist, ramp) {
  const fx = R(fist[0]), fy = R(fist[1]);
  p.rect(fx - 1, fy - 1, 3, 3, ramp[1]);
  p.set(fx - 1, fy - 1, ramp[0]).set(fx, fy - 1, ramp[0]).set(fx + 1, fy + 1, ramp[2]).set(fx, fy + 1, ramp[2]);
}

const part = (fn) => {
  const p = new Pic();
  fn(p);
  return p;
};

function paladinFrame(q) {
  const pic = new Pic();
  const by = q.bob, br = q.breath || 0, lean = q.lean || 0, hy = q.headDy || 0;
  const cp = new Pic();
  cape(cp, lean, by + br, q.capeBack || 0, q.capeWave || 0);
  pic.over(cp);
  const pt = new Pic();
  ponytail(pt, lean, by + br + hy, q.sway || 0);
  pic.over(pt, { sep: 'm', sides: 'rd' });
  // The far arm to the hammer, the hammer, the far fist on the haft: in front of her, or (behind:
  // cocked back over her shoulder) behind her head and body.
  const hm = new Pic();
  const hc = hammer(hm, q.grip, q.ang, q.up, q.down, { snap: Math.abs(q.ang + 90) < 15, glint: q.glint !== false });
  const layHammer = () => {
    const fa = new Pic();
    arm(fa, [28 + lean, 22 + by + br], q.farElbow, q.grip, ['2', '3', '4']);
    pic.over(fa, { sep: '4', sides: 'd' });
    pic.over(hm, { sep: 'k', sides: 'lrd' });
    pic.over(part((p) => gauntlet(p, q.grip, ['2', '3', '4'])));
  };
  if (q.behind) layHammer();
  // Legs: the far leg, then the near leg over it.
  const hx = 24 + (q.hipX || 0);
  pic.over(leg(new Pic(), hx + (q.farDx || 0), 30 + by, q.far, (s) => LEG_FAR[s], { tw: 4 }));
  pic.over(leg(new Pic(), hx + (q.nearDx || 0), 30 + by, q.near, (s) => LEG_NEAR[s], { tw: 4 }), { sep: '4', sides: 'rd' });
  // Body: the torso stamp, the tabard's front flap below it swinging with the stride.
  const body = new Pic();
  // (the last breathing row is laid at rest too, so no gap opens above the belt on the breath)
  body.stamp([TORSO[TORSO_SPLIT - 1]], 17 + lean, 20 + TORSO_SPLIT - 1 + by);
  TORSO.forEach((row, j) => body.stamp([row], 17 + lean, 20 + j + by + (j < TORSO_SPLIT ? br : 0)));
  if (q.sunGlint) body.on(25 + lean, 24 + by + br, 'z');
  const fl = q.flap || 0;
  for (let y = 31 + by; y <= 33 + by; y++) {
    const x0 = 23 + lean + (y > 31 + by ? fl : 0);
    const last = y === 33 + by;
    body.set(x0, y, last ? '7' : 'w').set(x0 + 1, y, last ? '7' : '9').set(x0 + 2, y, last ? '8' : '9').set(x0 + 3, y, last ? '8' : '0');
  }
  pic.over(body, { sep: '4', sides: 'd' });
  // Head: helm and face, riding the breath and its own lag.
  const head = new Pic();
  HEAD.forEach((row, j) => head.stamp([row], 19 + lean, 10 + j + by + br + hy));
  pic.over(head, { sep: '3', sides: 'd' });
  if (!q.behind) layHammer();
  // The near pauldron and arm, over everything: two-handed, its fist on the haft above the far
  // one; one-handed, swinging free at her side.
  pic.over(stamped(PAULDRON, 15 + lean, 20 + by + br), { sep: '3', sides: 'rd' });
  const a = (q.ang * Math.PI) / 180;
  const hand = q.hand || [q.grip[0] + Math.cos(a) * 4, q.grip[1] + Math.sin(a) * 4];
  const na = new Pic();
  arm(na, [18 + lean, 23 + by + br], q.elbow, hand);
  pic.over(na, { sep: '4', sides: q.hand ? 'r' : 'rd' });
  if (q.smear) smear(pic, ...q.smear);
  if (q.flash) burst(pic, hm, q.flash);
  rimLight(pic, { '3': '2', '4': '3' }, { sides: 'r' });
  const out = dropStrays(outline(pic, 'k'));
  softenNotches(out, '4m8b3A0', (x, y) => out.get(x, y) === 'e');
  if (q.halo) halo(out, hc, q.halo);
  return out;
}

// A sunburst round the raised hammer's head (drawn after the outline: light has no ink): eight
// rays from the outline outward, the straight ones long, the diagonals short.
function halo(out, hc, n) {
  for (let k = 0; k < 8; k++) {
    const ang = (k * Math.PI) / 4, len = (k % 2 ? 2 : k === 6 ? 2 : 3) + n;
    let r = 0, drawn = 0;
    while (r < 14 && drawn < len) {
      const x = R(hc[0] + Math.cos(ang) * r), y = R(hc[1] + Math.sin(ang) * r);
      r += k % 2 ? 0.71 : 1;
      if (out.get(x, y) && !drawn) continue;
      if (out.get(x, y)) break;
      out.set(x, y, drawn === 0 ? 'z' : drawn < len - 1 ? 'Y' : 'f');
      drawn++;
    }
  }
}

// The blow: light bursts up from where the hammer's head meets the ground, behind it, in spikes
// round a white core (n 2, the strike), then a thinning pillar (n 1, the frame after). Drawn
// before the outline, so it is inked like the knight's smear.
function burst(pic, hm, n) {
  const hb = hm.bounds();
  let bx = hb.x1;
  for (let x = hb.x0; x <= hb.x1; x++) if (hm.get(x, hb.y1)) { bx = x; break; }
  bx += 2;
  const fx = new Pic();
  const sh = (s, t) => (t < 0.3 ? 'z' : t < 0.78 ? 'Y' : 'f');
  const spikes = n === 2
    ? [[-172, 7], [-145, 10], [-118, 9], [-90, 33], [-62, 9], [-35, 10], [-8, 7]]
    : [[-90, 33], [-120, 5], [-60, 5]];
  for (const [a, len] of spikes) {
    const r = (a * Math.PI) / 180;
    stroke(fx, bx, 37, bx + Math.cos(r) * len, 37 + Math.sin(r) * len, n === 2 ? 1.5 : 0.9, 0.2, sh);
  }
  fx.ellipse(bx, 38, n === 2 ? 3.5 : 2, n === 2 ? 2.5 : 1, (x, y, nx, ny) => (nx * nx + ny * ny < 0.45 ? 'z' : 'Y'));
  for (let i = 0; i < fx.c.length; i++) if (fx.c[i] && !pic.c[i] && ((i / 48) | 0) <= 38) pic.c[i] = fx.c[i];
}

// The swing's trail: the crescent the hammer head swept clockwise from 'from' to 'to'
// (degrees) round the pivot c, out to rOut; thickest at the head, thinning to the tail. Gold.
function smear(p, c, from, to, rOut, rIn) {
  const span = to - from;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    if (p.get(x, y)) continue;
    const dx = x - c[0], dy = y - c[1], r = Math.hypot(dx, dy);
    if (r > rOut + 0.5 || r < rIn - 1) continue;
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    const dd = (((a - from) % 360) + 360) % 360;
    if (dd > span) continue;
    const t = dd / span;
    const inner = rOut - (rOut - rIn) * Math.pow(t, 0.9);
    if (r < inner || y > 38) continue;
    p.set(x, y, r > rOut - 1.3 ? 'z' : t > 0.5 ? 'Y' : 'f');
  }
}

// ---------------------------------------------------------------- poses --

const BASE = {
  bob: 0, breath: 0, lean: 0, headDy: 0,
  near: STAND.back, far: STAND.front,
  grip: [34.5, 25], ang: -90, up: 16.5, down: 10, farElbow: [30, 27],
  hand: [19, 31], elbow: [18, 27],
  capeBack: 0, capeWave: 0, sway: 0, flap: 0,
};

// Idle: at rest and watchful, the hammer upright in her far hand like a standard, the near
// hand at her side. The breath lifts chest, head, arms and hammer a pixel (frames 3-5); the cape
// and ponytail run on a wave a frame behind it; a glint runs over the hammer and the sun.
function idle(i) {
  const br = [0, 0, 0, -1, -1, -1, 0, 0][i];
  return {
    ...BASE, breath: br,
    grip: [34.5, 25 + br], farElbow: [30, 27 + br], hand: [19, 31 + br], elbow: [18, 27 + br],
    ang: -90 + [0, 0, 2, 3, 3, 2, 0, -2][i],
    capeWave: i, capeBack: [0, 1, 2, 2, 3, 2, 1, 0][i],
    sway: [0, -1, -1, -2, -2, -1, 0, 1][i], flap: [0, 0, 0, -1, -1, -1, 0, 0][i],
    glint: i >= 2 && i <= 4, sunGlint: i === 6 || i === 7,
  };
}

// Walk: contact (0, 4), down (1, 5), passing (2, 6), up (3, 7). The hammer is carried upright,
// rocking with the far arm; the near arm swings against the near leg; the cape, the ponytail and
// the tabard's flap trail by a frame.
function walk(i) {
  const bob = [0, 1, 0, 0, 0, 1, 0, 0][i];
  const headDy = [0, 0, 1, 0, 0, 0, 1, 0][i];
  const s = Math.cos((i * Math.PI) / 4);
  return {
    ...BASE, bob, headDy,
    far: GAIT[i], near: GAIT[(i + 4) % 8],
    grip: [34.5 + R(s), 25 + bob], ang: -90 + 5 * s, farElbow: [30, 27 + bob],
    hand: [19 - 3 * s, 31 + bob - R(Math.abs(s))], elbow: [18 - 1.5 * s, 27 + bob],
    lean: [0, 0, 0, 1, 0, 0, 0, 1][i],
    capeBack: [2, 1, 1, 2, 3, 2, 2, 2][i], capeWave: [0, 1, 2, 3, 0, 1, 2, 3][i],
    sway: [-1, 0, 1, 0, -1, 0, 1, 0][i], flap: [1, 1, 0, -1, -1, -1, 0, 1][i],
    glint: false,
  };
}

// The Smite: she lifts the hammer skyward in both hands and the light gathers round its head
// (0); cocks it back over her shoulder (1); brings it over the top in a gold crescent (2); slams
// it into the ground in front of her, light bursting up from the blow (3, the strike); the
// pillar thins (4); she recovers (5).
function attack(i) {
  const T = [
    { lean: -1, grip: [32.5, 19], ang: -90, up: 11, down: 9, elbow: [22, 26], farElbow: [30, 24], halo: 1 },
    { lean: -2, grip: [22, 16], ang: -135, up: 14, down: 4, elbow: [15, 20], farElbow: [26, 20], behind: true },
    { lean: 0, grip: [29, 19], ang: -45, up: 14, down: 6, elbow: [23, 25], farElbow: [28, 22], smear: [[25, 20], -150, -40, 17, 11] },
    { lean: 2, grip: [31, 22], ang: 60, up: 13, down: 3, elbow: [25, 25], farElbow: [29, 26], flash: 2 },
    { lean: 2, grip: [31, 22], ang: 60, up: 13, down: 3, elbow: [25, 25], farElbow: [29, 26], flash: 1 },
    { lean: 1, grip: [33.5, 22], ang: -90, up: 15.5, down: 9, elbow: [25, 26], farElbow: [30, 25] },
  ][i];
  const q = { ...BASE, ...T, hand: null, capeBack: [0, 1, 1, 3, 3, 1][i], capeWave: [0, 0, 1, 2, 1, 0][i], sway: [0, 1, 1, -2, -2, -1][i] };
  if (i >= 2) {
    q.far = { k: [5, 33], a: [6, 36], foot: 'flat' };
    q.near = GAIT[4];
  }
  return q;
}

let cache;
export const pics = () => (cache ??= [
  ...Array.from({ length: 8 }, (_, i) => paladinFrame(idle(i))),
  ...Array.from({ length: 8 }, (_, i) => paladinFrame(walk(i))),
  ...Array.from({ length: 6 }, (_, i) => paladinFrame(attack(i))),
]);
const gen = () => pics().map((p) => toBuf(p, PAL));

export default [{
  cls: 'paladin',
  id: 'v1',
  name: 'Paladin · v1',
  description: 'Dame Seraphine, a holy warrior in pearl-white plate trimmed in gold: an open-faced helm with a sun gem on its brow, a copper ponytail, a white tabard with a glowing gold sun, a short cream cape, and a heavy warhammer held upright like a standard. She walks with the hammer carried upright and her free arm swinging; her Smite lifts the hammer into a sunburst, brings it over in a gold crescent and slams it down in a burst of holy light.',
  collection: 'New heroes',
  def: {
    gen, emissive: 'Yfz',
    idle: [0, 1, 2, 3, 4, 5, 6, 7], walk: [8, 9, 10, 11, 12, 13, 14, 15], attack: [16, 17, 18, 19, 20, 21],
    attackFps: 13, motionRate: 11 / (9.8 * 1.067), idleRate: 6 / 1.6,
    anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false,
  },
}];
