// Kael, the Shadow: the Shade (remaster-v1).
import { Pic, palette, outline, dropStrays, toBuf, across, inked, despeckle, R } from './kit.js';

const PAL = palette({
  k: 'k',
  // shadow body: black-violet, dark to light
  h: 'h', q: 'q', p: 'p', j: 'j',
  // flame rims and tips, the eyes
  '9': '#d9a6ff', w: 'w',
  // daggers and claws
  G: 'G', g: 'g', N: 'N', n: 'n',
});

const L = (x, y, rows) => ({ x, y, rows });

// The hood bent forward over a void with two slanted eyes; the shoulders of a ragged cloak.
const BODY = L(15, 11, [
  '..........jp....', // 11
  '.........jjpp...', // 12
  '.........jpqqp...', // 13
  '........jjpqqqqq.', // 14
  '........jpqhkkkkq', // 15
  '.......jjpqkkkkkh', // 16
  '.......jpqh9kkk9h', // 17
  '......jjpqhkwkwkh', // 18
  '......jppqhkkkkkh', // 19
  '.....jjpqqhhkkkh.', // 20
  '....jjppqqhhhhqq.', // 21
  '...jjpqqqhhhhhqp', // 22
  '...jppqqhhhhhqqp', // 23
  '....jpqqhhhhhqp.', // 24
  '....jpqqhhhhhq..', // 25
  '.....pqqhhhhq...', // 26
  '.....pqqhhhqq...', // 27
  '......pqhhhq....', // 28
  '......pqhhq.....', // 29
]);

const put = (pic, layer, dx = 0, dy = 0) => pic.stamp(layer.rows, layer.x + dx, layer.y + dy);

// The tattered tail: three wisps from the cloak's lower edge, the longest touching row 38.
function tail(p, by, back, wave) {
  // The main wisp curls back from under the body to its tip on row 38; two short ones beside it.
  const W = [
    [21.5, 29 + by, 38, -4 - back, 2.2, wave],
    [24, 28 + by, 34 + by, -2 - back, 1.4, -wave],
    [19.5, 28 + by, 33 + by, -3 - back, 1.2, wave],
  ];
  for (const [x0, y0, y1, lean, r, wv] of W) {
    const n = y1 - y0;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const hw = r * (1 - Math.pow(t, 1.3));
      const cx = x0 + lean * t * t + wv * Math.sin(t * Math.PI) * 0.8;
      const a = R(cx - hw), b = R(cx + hw);
      for (let x = a; x <= b; x++) p.set(x, y0 + i, x === a && b > a ? 'p' : t > 0.75 ? 'q' : 'h');
    }
  }
}

// Black fire: tongues as tapered curves from a base (each [x0, y0, cx, cy, x1, y1, r]: start,
// bend, tip, base radius), merged and coloured by depth: lilac tips, lavender rim, dark core.
function fire(p, tongues) {
  const m = new Pic();
  for (const [x0, y0, cx, cy, x1, y1, r] of tongues) {
    // A cubic rising straight off the base, then bending toward the tip.
    const h = y0 - y1;
    const P = [[x0, y0], [x0 + (cx - x0) * 0.1, y0 - h * 0.6], [cx, cy], [x1, y1]];
    const n = 30;
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      const k0 = u * u * u, k1 = 3 * u * u * t, k2 = 3 * u * t * t, k3 = t * t * t;
      const x = k0 * P[0][0] + k1 * P[1][0] + k2 * P[2][0] + k3 * P[3][0];
      const y = k0 * P[0][1] + k1 * P[1][1] + k2 * P[2][1] + k3 * P[3][1];
      const rr = Math.max(0.35, r * (1 - Math.pow(t, 1.6)));
      for (let yy = Math.floor(y - rr - 1); yy <= Math.ceil(y + rr + 1); yy++) for (let xx = Math.floor(x - rr - 1); xx <= Math.ceil(x + rr + 1); xx++) {
        if ((xx - x) ** 2 + (yy - y) ** 2 <= rr * rr + 0.25) m.set(xx, yy, Math.max(m.get(xx, yy) ?? 0, t));
      }
    }
  }
  // Banded by height: black at the root, deep violet, purple, lavender, lilac at the tips;
  // the edge facing the light a band brighter.
  const at = (x, y) => m.get(x, y);
  const BAND = ['h', 'q', 'p', 'j', '9'];
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const t = at(x, y);
    if (t === null) continue;
    let b = t < 0.3 ? 0 : t < 0.52 ? 1 : t < 0.72 ? 2 : t < 0.88 ? 3 : 4;
    if (at(x - 1, y) === null && b < 4 && b > 0) b++;
    p.set(x, y, BAND[b]);
  }
  despeckle(p, BAND);
}

function dagger(p, hand, ang, len = 6) {
  const a = (ang * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
  const side = Math.abs(dx) >= Math.abs(dy) ? [0, 1] : [1, 0];
  for (let k = 1; k <= len; k++) {
    const x = R(hand[0] + dx * k), y = R(hand[1] + dy * k);
    p.set(x, y, k >= len - 1 ? 'w' : 'G');
    if (k < len - 1) p.set(x + side[0], y + side[1], 'g');
  }
  // Guard and claw.
  p.set(R(hand[0] + dx * 0.5 - dy), R(hand[1] + dy * 0.5 + dx), 'N');
  p.set(R(hand[0] + dx * 0.5 + dy), R(hand[1] + dy * 0.5 - dx), 'N');
  p.set(hand[0], hand[1], 'p');
}

// A slash's trail: the sector swept between angles a0 and a1 (degrees, a0 < a1 going
// clockwise) around c, out to rOut; thickest at the blade's end (a1, or a0 when rev), lilac at
// its edge, lavender, then purple toward the tail.
function smear(p, c, a0, a1, rOut, rIn, rev = false) {
  const span = a1 - a0;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const dx = x - c[0], dy = y - c[1], r = Math.hypot(dx, dy);
    if (r > rOut + 0.5 || r < rIn - 1 || y > 38) continue;
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    const d = (((a - a0) % 360) + 360) % 360;
    if (d > span) continue;
    const t = rev ? 1 - d / span : d / span;
    if (r < rOut - (rOut - rIn) * Math.pow(t, 0.9)) continue;
    p.set(x, y, r > rOut - 1.3 ? '9' : t > 0.5 ? 'j' : 'p');
  }
}

function shadeFrame(q) {
  const pic = new Pic();
  const by = q.bob, lean = q.lean || 0;
  // Flames off the shoulders and back, behind the body.
  const fl = new Pic();
  const flare = q.flare || 0;
  const lift = Math.min(2, flare);
  fire(fl, q.flames.map(([x0, y0, cx, cy, x1, y1, r]) => [x0 + lean, y0 + by, cx + lean, cy + by - lift, x1 + lean - flare * 0.5, y1 + by - lift, r + flare * 0.3]));
  pic.over(fl);
  // Far arm with its dagger, behind the body.
  const fa = new Pic();
  fa.stroke(27 + lean, 22 + by, q.far[0], q.far[1], 0.9, 0.7, across(['p', 'q', 'h']));
  dagger(fa, q.far, q.farAng);
  pic.over(inked(fa));
  const b = new Pic();
  tail(b, by, q.back || 0, q.wave || 0);
  // A forward lean shears the body: the hood leads, the hem follows.
  const shear = q.shear || 0;
  BODY.rows.forEach((row, j) => b.stamp([row], BODY.x + lean + Math.round((shear * (BODY.rows.length - 1 - j)) / (BODY.rows.length - 1)), BODY.y + j + by));
  pic.over(b);
  // Slash trails over the body, under the near arm.
  if (q.smears) {
    const sm = new Pic();
    for (const [cx, cy, a0, a1, ro, ri, rev] of q.smears) smear(sm, [cx + lean, cy + by], a0, a1, ro, ri, rev);
    pic.over(sm);
  }
  // Near arm and dagger in front.
  const na = new Pic();
  na.stroke(18 + lean, 23 + by, q.near[0], q.near[1], 1.0, 0.8, across(['j', 'p', 'q']));
  dagger(na, q.near, q.nearAng);
  pic.over(inked(na));
  return dropStrays(outline(pic, 'k'));
}

// Fire tongues off the shoulders and back: start, bend, tip, base radius. Each flickers: the
// tip rises and falls and sways a pixel.
const TONGUES = [
  // base x, y; bend x, y; tip x, y; base radius
  [18, 22, 17, 9, 12, 10, 3.0],
  [15, 25, 13, 15, 9, 16, 2.6],
  [21, 20, 22, 11, 18, 12, 2.0],
];
// Each tongue sways: [tip dx, bend dx] per frame. The tips keep their height, so the fire
// flickers without the sprite's top row jumping.
const FLICK = [
  [[0, 0], [-1, 0], [-1, -1], [0, -1], [1, 0], [1, 1], [0, 1], [0, 0]],
  [[1, 0], [0, 0], [-1, 0], [-1, -1], [0, -1], [1, 0], [1, 1], [1, 1]],
  [[0, 1], [1, 1], [1, 0], [0, 0], [-1, 0], [-1, -1], [0, -1], [0, 0]],
];
const flames = (i, blow = 0) => TONGUES.map(([x0, y0, cx, cy, x1, y1, r], k) => {
  const [tx, bx] = FLICK[k][i % 8];
  return [x0, y0, cx + bx + blow * 0.5, cy, x1 + tx + blow, y1, r];
});

const BASE = { bob: 0, lean: 0, wave: 0, near: [20, 30], nearAng: 115, far: [31, 27], farAng: 15 };

function idle(i) {
  const bob = [0, 0, 0, 1, 1, 1, 0, 0][i];
  return { ...BASE, bob, wave: [0, 1, 1, 1, 0, -1, -1, -1][i], flames: flames(i), near: [20, 30 + bob], far: [31, 27 + bob] };
}
function walk(i) {
  const bob = [0, 1, 0, 0, 0, 1, 0, 0][i];
  const s = [0, 1, 1, 0, 0, -1, -1, 0][i];
  // A glide: leaning in, the tail streaming back, the fire blown back, both blades trailing low.
  return {
    ...BASE, bob, lean: 0, shear: 2, back: 3, wave: [1, 2, 1, 0, -1, -2, -1, 0][i], flames: flames(i, -3),
    near: [19 - s, 31 + bob], nearAng: 150, far: [29 + s, 29 + bob], farAng: 165,
  };
}
// Coil, raise, a downward slash with the near blade, the far blade's rising slash crossing it
// (the blow, frame 3), follow-through, recover; the black fire flares with the strikes.
function attack(i) {
  const T = [
    { lean: -1, near: [17, 27], nearAng: 160, far: [29, 26], farAng: -20 },
    { lean: -1, near: [16, 19], nearAng: -120, far: [28, 28], farAng: 30, flare: 1 },
    { lean: 1, near: [30, 25], nearAng: 20, far: [29, 28], farAng: 40, flare: 2, smears: [[19, 23, -120, 20, 13, 7]] },
    { lean: 2, near: [31, 29], nearAng: 60, far: [33, 21], farAng: -45, flare: 3, smears: [[28, 22, -45, 60, 11, 6, true], [19, 23, -60, 25, 13, 10]] },
    { lean: 2, near: [29, 30], nearAng: 75, far: [33, 23], farAng: -20, flare: 1, smears: [[28, 22, -40, -10, 11, 9, true]] },
    { lean: 1, near: [22, 30], nearAng: 105, far: [31, 27], farAng: 15 },
  ][i];
  return { ...BASE, ...T, flames: flames(i, -1) };
}

let cache;
export const pics = () => (cache ??= [
  ...Array.from({ length: 8 }, (_, i) => shadeFrame(idle(i))),
  ...Array.from({ length: 8 }, (_, i) => shadeFrame(walk(i))),
  ...Array.from({ length: 6 }, (_, i) => shadeFrame(attack(i))),
]);
const gen = () => pics().map((p) => toBuf(p, PAL));

export default [{
  cls: 'rogue',
  id: 'remaster-v1',
  name: 'Remaster V1 · Shade',
  description: 'Kael the Shade: a hooded wraith with a forward-hooked hood, two slanted glowing eyes, twin daggers and black-violet fire streaming off his shoulders, floating on a curling tail. He glides; his attack crosses two violet slashes as the fire flares.',
  collection: 'Remasters',
  def: {
    gen, floating: true, emissive: 'j',
    idle: [0, 1, 2, 3, 4, 5, 6, 7], walk: [8, 9, 10, 11, 12, 13, 14, 15], attack: [16, 17, 18, 19, 20, 21],
    attackFps: 14, motionRate: 11 / (9.8 * 1.2), idleRate: 6 / 1.6,
    anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false,
  },
}];
