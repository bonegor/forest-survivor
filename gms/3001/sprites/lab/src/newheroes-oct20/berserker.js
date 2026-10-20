// Ulfric, the Berserker (new heroes, 20 Oct 2026): a fur-clad northman under a grey wolf's pelt
// whose head sits over his brow, bare arms banded in blue woad, a braided red beard, a leather
// kilt, fur-wrapped boots, a hand axe in each fist.
import { Pic, palette, outline, dropStrays, toBuf, across, stroke, limb, leg, bevel, GAIT, STAND, despeckle, softenNotches, fillDoubled, R } from './kit-berserker.js';

// A separation line in the covered material's own deepest shade rather than ink, so the
// silhouette's outline is never doubled where a part crosses another.
const SHADE = { '1': '2', s: '2', S: '2', '2': 'k', W: 'h', F: 'h', f: 'h', h: 'k', O: 'R', r: 'R', R: 'k', L: 'm', l: 'm', m: 'k', y: 'm', U: 'u', u: 'k', w: 'N', G: 'N', g: 'N', N: 'k' };
const shade = (c) => SHADE[c] || 'k';

export const PAL = palette({
  k: 'k',
  // wolf fur, warm grey: lit tip, light, mid, shade
  W: '#ece4d4', F: '#c4b8a4', f: '#948774', h: '#655a4d',
  // skin, lit to deep
  '1': '#f7d2aa', s: '#e3a679', S: '#b8714f', '2': '#87503c',
  // the red beard: lit, mid, shade
  O: '#f39448', r: '#cf4c27', R: '#9c3527',
  // leather: lit, mid, dark
  L: '#ad6d42', l: '#7d4a31', m: '#55342a',
  // axe steel and its white edge
  w: 'w', G: 'G', g: 'g', N: 'N',
  // gold (the beard ring, the buckle, the wolf's eye) and blue woad
  y: 'y', U: '#5e8fdc', u: '#3b62a8',
});

// ---------------------------------------------------------------- axe --

// A bearded hand axe from the fist along `ang` (degrees: 0 right, 90 down): a 2-px haft `len`
// long (lit side L), the head at its end on `side` (+1: to the haft's right as it points),
// steel shaded by how far it stands from the haft: the socket N, the cheek g, the body G, the
// edge w.
// glint: a step (px down from the head's top) where a white glint crosses the steel, or null.
function axe(p, fist, ang, len = 9, side = 1, glint = null) {
  const a = (ang * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a);
  const vx = -uy * side, vy = ux * side;
  const at = (u, v) => [fist[0] + ux * u + vx * v, fist[1] + uy * u + vy * v];
  const [x0, y0] = at(-1.6, 0), [x1, y1] = at(len - 0.5, 0);
  limb(p, x0, y0, x1, y1, 2, ['F', 'h']);
  const head = [[len + 0.7, -0.9], [len + 1.7, 4.6], [len - 4.6, 4.8], [len - 2.6, 2.0], [len - 2.6, -0.9]];
  p.poly(head.map(([u, v]) => at(u, v)), (x, y) => {
    const dx = x - fist[0], dy = y - fist[1];
    const u = dx * ux + dy * uy, v = dx * vx + dy * vy;
    if (glint !== null && v > 1.4 && Math.abs(u - (len + 1 - glint)) < 0.6) return 'w';
    if (v > 3.5) return u < len - 2.5 ? 'G' : 'w';
    if (v > 1.4) return u < len - 1.8 ? 'g' : 'G';
    return u > len - 0.5 ? 'g' : 'N';
  });
  const [px, py] = at(-2.2, 0);
  p.set(px, py, 'm');
}

// The trail of a chop: the sector swept between angles a0 and a1 (clockwise) round c, out to
// rOut, thickest at the head's end (a1). White at its rim, steel behind, fading to grey.
function trail(p, c, a0, a1, rOut, rIn) {
  const span = a1 - a0;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const dx = x - c[0], dy = y - c[1], r = Math.hypot(dx, dy);
    if (r > rOut + 0.5 || r < rIn - 1 || y > 38) continue;
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    const d = (((ang - a0) % 360) + 360) % 360;
    if (d > span) continue;
    const t = d / span;
    if (r < rOut - (rOut - rIn) * Math.pow(t, 0.9)) continue;
    p.set(x, y, r > rOut - 1.3 ? 'w' : t > 0.45 ? 'G' : 'g');
  }
}

// ---------------------------------------------------------------- body --

// The arm: shoulder to elbow (a big bare upper arm with a woad band), elbow to fist (a leather
// bracer over the forearm), the fist.
function arm(p, sh, el, fist, near) {
  const up = new Pic();
  stroke(up, sh[0], sh[1], el[0], el[1], 2.2, 1.7, across(near ? ['1', 's', 'S'] : ['s', 'S', '2']));
  // woad: a blue band round the upper arm
  const L2 = (el[0] - sh[0]) ** 2 + (el[1] - sh[1]) ** 2 || 1;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    if (!up.get(x, y)) continue;
    const t = ((x - sh[0]) * (el[0] - sh[0]) + (y - sh[1]) * (el[1] - sh[1])) / L2;
    if (t > 0.5 && t < 0.72) up.set(x, y, near ? 'U' : 'u');
  }
  p.over(up);
  const fo = new Pic();
  stroke(fo, el[0], el[1], fist[0], fist[1], 1.6, 1.4, (s, t) => (t < 0.3 ? (near ? (s < 0 ? 's' : 'S') : 'S') : (near ? across(['L', 'l']) : across(['l', 'm']))(s)));
  p.over(fo, { sep: near ? 'S' : '2', sides: 'u' });
  const fx = R(fist[0]), fy = R(fist[1]);
  p.rect(fx - 1, fy - 1, 3, 3, near ? 's' : 'S');
  p.set(fx - 1, fy - 1, near ? '1' : 's').set(fx + 1, fy + 1, near ? 'S' : '2');
}

// Head: the face under the wolf's head. Placed at (20, 7): the ears on rows 7-8, the wolf's
// crown 9-10, its snout over his brow to x 34 (its eye amber, its nose black) on 11-12, the
// fangs hanging over his brow on row 13, his eyes on 14, the nose on 15, the moustache on 16.
// The pelt falls behind to the shoulders.
const HEAD = [
  '...WF..Ff.......', //  6  the ears
  '...WhF.Fhf......', //  7
  '..FWhFFFhf......', //  8
  '.FWWFFFFFff.....', //  9  the crown
  'FWWFFFFFFFfff...', // 10
  'FWFFFhyfFFFFFfkk', // 11  the wolf's eye; the snout and its nose
  'FWFfhhhhfhhhhhk.', // 12  the snout's underside
  'FFfh1SWSSSWS....', // 13  fangs over his brow
  'Ffh1sskssks.....', // 14  the eyes
  'Ffhs1ssssssS....', // 15  cheeks; the nose
  'ffhS1sOOrrrrS...', // 16  the moustache
  'fh..OOrrrrrRR...', // 17  the beard
  'fh..rOOrrrRR....', // 18
];
// The beard's braid: below the beard's mass, a rope of red with a gold ring.
const BRAID = [
  '.OOrR.', // 19
  '..OrR.', // 20
  '..yyy.', // 21  the ring
  '..rrR.', // 22
  '...rR.', // 23
];

// The torso: the bare chest, broad at the shoulders and narrow at the waist, the belt and the
// leather kilt in strips, the fur mantle over the shoulders.
function torso(p, lean, by, br, kick = 0) {
  const t = by + br;
  const ch = new Pic();
  ch.poly([[17 + lean, 18.5 + t], [33 + lean, 18.5 + t], [32 + lean, 22 + t], [30.5 + lean, 26.5 + by], [19.5 + lean, 26.5 + by], [17.5 + lean, 22 + t]], 's');
  bevel(ch, { hi: '1', mid: 's', lo: 'S', lo2: null });
  // the belly's blocks either side of its line
  ch.vline(25 + lean, 23 + t, 26 + by, 'S', true);
  ch.hline(21 + lean, 24 + lean, 24 + t, 'S', true);
  // two pecs, lit on their upper left, a shadow under each
  const pc = new Pic();
  pc.ellipse(21.5 + lean, 21 + t, 3.4, 1.6, 's');
  pc.ellipse(29 + lean, 21 + t, 2.8, 1.6, 's');
  bevel(pc, { hi: '1', mid: 's', lo: 'S' });
  ch.over(pc, { sep: 'S', sides: 'd' });
  // a leather strap from the near shoulder across the chest to the far hip
  const st = new Pic();
  stroke(st, 19.5 + lean, 19 + t, 30.5 + lean, 26 + t, 0.8, 0.8, across(['L', 'l']));
  for (let i = 0; i < st.c.length; i++) if (st.c[i] && ch.c[i]) ch.c[i] = st.c[i];
  p.over(ch);
  // the kilt: a belt, then strips of leather to row 32
  const k = new Pic();
  k.poly([[18.5 + lean, 26.5 + by], [31.5 + lean, 26.5 + by], [33 + lean, 31.5 + by], [17 + lean, 31.5 + by]], 'l');
  bevel(k, { hi: 'L', mid: 'L', lo: 'l' });
  for (let x = 16; x <= 34; x++) {
    if ((x - 17) % 4 === 0) for (let y = 29; y <= 31; y++) k.on(x + lean, y + by, 'l');
    if ((x - 17) % 4 === 2 && k.get(x + lean, 31 + by)) k.set(x + lean, 32 + by, 'l');
  }
  k.hline(18 + lean, 32 + lean, 27 + by, 'm', true);
  k.hline(18 + lean, 32 + lean, 28 + by, 'L', true);
  k.rect(25 + lean, 27 + by, 2, 2, 'y');
  // the hem swings with the stride
  if (kick) k.shear((y) => (y >= 31 + by ? kick : y >= 30 + by ? kick / 2 : 0));
  p.over(k, { sep: 'S', sides: 'u' });
  // the fur mantle round the shoulders and the back of the neck
  const m = new Pic();
  m.ellipse(22 + lean, 18 + t, 6, 1.4, 'F');
  m.ellipse(17 + lean, 19 + t, 3, 1.8, 'F');
  m.ellipse(32 + lean, 19 + t, 2, 1.2, 'F');
  bevel(m, { hi: 'W', mid: 'F', lo: 'f', lo2: 'h' });
  p.over(m, { sep: 'S', sides: 'd' });
}

// The pelt down his back: from the wolf's head behind his neck to a ragged hem at row 29.
function pelt(p, lean, by, br, sway) {
  const t = by + br;
  const pts = [[21 + lean, 11 + t], [18 + lean, 15 + t], [15 + lean - sway * 0.3, 20 + t], [13 + lean - sway * 0.7, 25 + by], [12 + lean - sway, 29 + by],
    [14 + lean - sway, 28 + by], [15 + lean - sway, 30 + by], [17 + lean - sway * 0.6, 28 + by], [19 + lean, 29 + by], [20 + lean, 24 + t], [22 + lean, 16 + t]];
  const c = new Pic();
  c.poly(pts, 'f');
  bevel(c, { hi: 'F', mid: 'f', lo: 'h' });
  p.over(c);
}

const LEG_NEAR = { E: 'W', A: 'F', B: 'f', C: 'h', D: 'm' };
const LEG_FAR = { E: 'F', A: 'f', B: 'h', C: 'h', D: 'm' };
const legMap = (g, hy, near) => {
  const ky = g.k[1] + (hy - 30);
  return (s, x, y) => {
    if (s === 'D') return 'm';
    if (y < ky) return near ? { A: 'L', B: 'l', C: 'm', E: 'L' }[s] : { A: 'l', B: 'm', C: 'm', E: 'l' }[s];
    return (near ? LEG_NEAR : LEG_FAR)[s];
  };
};

function frame(q) {
  const pic = new Pic();
  const by = q.bob || 0, br = q.breath || 0, lean = q.lean || 0, hy = q.headDy || 0, hop = q.hop || 0;
  // the far axe drawn back behind him (the crouch)
  const fx = new Pic();
  axe(fx, q.farFist, q.farAng, 9, q.farSide ?? 1, q.farGlint ?? null);
  pelt(pic, lean, by, br, q.sway || 0);
  if (q.farBehind) pic.over(fx, { sep: 'h', sides: 'lrd' });
  // the chops' trails, behind the body
  if (q.trails) {
    const tr = new Pic();
    for (const [cx, cy, a0, a1, ro, ri] of q.trails) trail(tr, [cx + lean, cy + by], a0, a1, ro, ri);
    pic.over(tr);
  }
  // the far arm behind the body
  const fa = new Pic();
  arm(fa, [32 + lean, 20 + by + br], q.farEl, q.farFist, false);
  pic.over(fa);
  // legs
  const hip = 29 + by;
  const lf = leg(new Pic(), 25 + (q.farDx ?? 1), hip, q.legFar, legMap(q.legFar, hip, false), { tw: 5, sw: 4 });
  const ln = leg(new Pic(), 23 + (q.nearDx ?? -1), hip, q.legNear, legMap(q.legNear, hip, true), { tw: 5, sw: 4 });
  pic.over(lf);
  pic.over(ln, { sep: 'h', sides: 'rd' });
  const body = new Pic();
  torso(body, lean, by, br, q.kick || 0);
  pic.over(body, { sep: 'h', sides: 'd' });
  const head = new Pic();
  head.stamp(HEAD, 20 + lean, 7 + by + br + hy);
  head.stamp(BRAID, 25 + lean + (q.braid || 0), 20 + by + br + hy);
  pic.over(head, { sep: 'h', sides: 'd' });
  // the far axe, in front of the body (it is held forward)
  if (!q.farBehind) pic.over(fx, { sep: shade, sides: 'lrd' });
  // the near arm and its axe, in front of everything
  const na = new Pic();
  axe(na, q.nearFist, q.nearAng, 9, q.nearSide ?? -1, q.nearGlint ?? null);
  arm(na, [17 + lean, 20 + by + br], q.nearEl, q.nearFist, true);
  pic.over(na, { sep: shade, sides: 'lrd' });
  if (q.dust) for (const [x, y, n] of q.dust) pic.stamp(DUST[n], x - (DUST[n][0].length >> 1), y - DUST[n].length + 1);
  if (hop) pic.shift(0, -hop);
  // nothing goes below the soles' row: an axe that reaches it has bitten into the ground
  for (let y = 39; y < 48; y++) for (let x = 0; x < 48; x++) pic.set(x, y, null);
  despeckle(pic, ['F', 'f', 'h', 's', 'S', 'l', 'm', 'L']);
  const out = dropStrays(outline(pic, 'k'));
  softenNotches(out, 'm2hRuNlSfgLsFG');
  fillDoubled(out, 'm2hRuNlSfgLsFGrW1y', () => true, 'k', true, true);
  return out;
}

// ---------------------------------------------------------------- poses --

const BASE = {
  legNear: STAND.back, legFar: STAND.front,
  nearEl: [13, 25], nearFist: [14, 29], nearAng: -135, nearSide: -1,
  farEl: [36, 24], farFist: [37, 28], farAng: -60, farSide: 1,
};

// Idle: a wide stance, both axes up, chest heaving: the breath lifts the chest, head and arms
// (frames 3-5), the pelt and the braid swing a frame behind it, the axes rock.
function idle(i) {
  const br = [0, 0, 0, -1, -1, -1, 0, 0][i], hb = [0, 0, 0, 0, -1, -1, -1, 0][i];
  return {
    ...BASE, breath: br,
    nearEl: [13, 25 + hb], nearFist: [14, 29 + hb], nearAng: [-134, -136, -139, -141, -142, -141, -139, -136][i],
    farEl: [36, 24 + hb], farFist: [37, 28 + hb], farAng: [-61, -59, -56, -54, -53, -54, -56, -59][i],
    // a glint runs down each axe head in turn
    nearGlint: [1, 2, 3, 4, null, null, null, null][i], farGlint: [null, null, null, null, 1, 2, 3, 4][i],
    sway: [0, 1, 2, 2, 1, 0, -1, -1][i], braid: [0, 0, 0, -1, -1, 0, 0, 0][i],
  };
}

function walk(i) {
  const bob = [0, 1, 0, 0, 0, 1, 0, 0][i];
  const hd = [0, 0, 1, 0, 0, 0, 1, 0][i];
  const s = Math.cos((i * Math.PI) / 4);
  return {
    ...BASE, bob, headDy: hd,
    legFar: GAIT[i], legNear: GAIT[(i + 4) % 8], nearDx: 0, farDx: 0,
    nearEl: [R(13 + s), 25 + bob], nearFist: [R(14 + 2 * s), 29 + bob], nearAng: R(-135 + 10 * s),
    farEl: [R(36 - s), 24 + bob], farFist: [R(37 - 2 * s), 28 + bob], farAng: R(-60 - 10 * s),
    sway: [2, 3, 3, 2, 2, 3, 3, 2][i], braid: [0, -1, -1, 0, 0, -1, -1, 0][i],
    lean: [0, 0, 0, 1, 0, 0, 0, 1][i], kick: [1, 1, 0, -1, -1, -1, 0, 1][i],
  };
}

// Chips and dust thrown up where the axes bite the ground: [x, y (bottom row), size].
const DUST = [
  ['F...F', '.W.W.', 'FWFWF'],
  ['..F..F..', '.FWF.WF.', 'FWWFFWWF', '.fFFFFf.'],
];

// The leap and the double chop: crouch (0), spring with both axes high (1), over the top (2),
// the chop as he lands (3, the blow), follow-through low in front (4), recover (5).
function attack(i) {
  const T = [
    // crouch: knees bent, both axes swung back behind him
    { bob: 2, lean: -1, nearEl: [13, 27], nearFist: [11, 30], nearAng: -170, nearSide: 1, farEl: [26, 28], farFist: [19, 32], farAng: 172, farSide: -1, farBehind: true },
    // spring: off the ground, both axes high and cocked back over his head
    { hop: 2, lean: 0, nearEl: [15, 17], nearFist: [17, 13], nearAng: -125, nearSide: -1, farEl: [33, 16], farFist: [29, 12], farAng: -105, farSide: -1,
      legNear: { k: [3, 32], a: [1, 35], foot: 'air' }, legFar: { k: [-1, 33], a: [-3, 35], foot: 'air' } },
    // over the top: the axes come forward over his head
    { hop: 1, lean: 1, nearEl: [19, 15], nearFist: [24, 12], nearAng: -55, nearSide: 1, farEl: [35, 16], farFist: [37, 13], farAng: -35, farSide: 1,
      trails: [[18, 20, -125, -60, 15, 10]], legNear: GAIT[5], legFar: GAIT[1] },
    // the chop as he lands: both axes down into the ground before him
    { bob: 1, lean: 2, nearEl: [25, 25], nearFist: [31, 28], nearAng: 55, nearSide: 1, farEl: [38, 24], farFist: [41, 27], farAng: 70, farSide: 1,
      trails: [[17, 20, -45, 55, 19, 13], [32, 20, -50, 70, 14, 10]], dust: [[39, 38, 0]], legNear: GAIT[4], legFar: { k: [5, 33], a: [6, 36], foot: 'flat' } },
    // follow-through: the axes bitten in low, dust thrown up
    { bob: 2, lean: 2, nearEl: [25, 27], nearFist: [32, 30], nearAng: 65, nearSide: 1, farEl: [38, 26], farFist: [41, 30], farAng: 75, farSide: 1,
      dust: [[39, 38, 1]], legNear: GAIT[4], legFar: { k: [5, 33], a: [6, 36], foot: 'flat' } },
    // recover: up again, the axes back to the guard
    { bob: 1, lean: 1, nearEl: [14, 26], nearFist: [15, 30], nearAng: -120, farEl: [36, 25], farFist: [37, 29], farAng: -65 },
  ][i];
  return { ...BASE, ...T, sway: [1, 0, 1, 3, 3, 2][i] };
}

let cache;
export const pics = () => (cache ??= [
  ...Array.from({ length: 8 }, (_, i) => frame(idle(i))),
  ...Array.from({ length: 8 }, (_, i) => frame(walk(i))),
  ...Array.from({ length: 6 }, (_, i) => frame(attack(i))),
]);

export default [{
  cls: 'berserker',
  id: 'v1',
  name: 'Berserker · v1',
  description: 'Ulfric the Berserker: a broad northman under a grey wolf pelt whose head sits over his brow, a braided red beard with a gold ring, bare arms banded in blue woad, leather bracers, a leather kilt and fur-wrapped boots, a hand axe in each fist. He leaps and brings both axes down in a double chop.',
  collection: 'New heroes',
  def: {
    gen: () => pics().map((p) => toBuf(p, PAL)),
    idle: [0, 1, 2, 3, 4, 5, 6, 7], walk: [8, 9, 10, 11, 12, 13, 14, 15], attack: [16, 17, 18, 19, 20, 21],
    attackFps: 13, motionRate: 11 / (9.8 * 1.067), idleRate: 6 / 1.6,
    anchorY: 40, fitW: 40, fitH: 36, selfBob: true, outline: false,
  },
}];
