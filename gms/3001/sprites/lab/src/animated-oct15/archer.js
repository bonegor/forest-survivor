// The ranger as picked on 15 October 2026: Silverleaf (polish-d, src/polish-oct15-archer.js) in the
// user's colours, animated for the game as the old ranger was (public/js/art/ranger-verdant.js):
// 8 idle frames, 8 walk, 8 shots and the 64 shots on the move (attackWalk[shot][walk step]).
// Her hair is redrawn here: the long silver lock that hung behind the ear became a high ponytail,
// pulled back from the brow and over the ear to a gold tie at the back of the crown, from where it
// springs up and falls to her shoulder blades. The ear sits lower, at eye level, in front of it.
// Facing right in a 48x48 cell, feet on row 39. Pose tables and notes: archer-notes.md.
import { Grid as Letters, lookOf, painter } from './kit.js';
import { D_PAL, SILVERLEAF } from '../polish-oct15-archer.js';

// The look the user saved on the review page, as it handed it over.
export const CODE = 'FS archer polish-d hue=-19 sat=22 bright=-11 contrast=14 mid=37 warm=40 tint=11 outline=-100';
const LOOK = lookOf(CODE);
// The moonstone glows unlit at night.
const { toBuf, glow } = painter(D_PAL, ['G']);

// ---- her parts --------------------------------------------------------------------------------
// Silverleaf's own quiver, legs, torso, bow, bow arm, mantle and hand, and the new hair. Her lock
// (SILVERLEAF.hair) is not drawn: the tail replaces it. Walking and shooting, her legs are drawn
// per pose (below).
const P = {
  ...SILVERLEAF,
  // The head: the parted fringe and the face as drawn; the hair drawn back over the ear to the tie.
  // Where the tail lies behind it (rows 11-17 at the back) the head has no ink of its own, so head
  // and tail read as one mass of hair, not a lock hung on a head.
  head: [18, 8, [
    '....ooooo....',
    '...oDDCCCoo..',
    '..oDDCCCCCCo.',
    '.BDDCCCCCCCCo',
    '.BDCCCCCCCBCo',
    '.BCCCCCBCBuBo',
    'BCCCCCBuuuuuo',
    'BBCCBCuouuouo',
    'BBCBBBuiuuito',
    '.BBBBAtuuuto.',
    '.oBBBAsttmo..',
    '..ooooosso...',
  ]],
  // The ponytail: gathered at the tie, it springs up and back over the crown and falls behind the
  // ear to the shoulder blades, lit on its outer edge, mid grey towards her back. Its inner columns
  // run on under the head, so it stays covered there when its lower half swings.
  tail: [12, 6, [
    '....ooo.',
    '...oDDCo',
    '..oDCCBo',
    '.oDCCBBo',
    '.oDCCBBB',
    '.oDCCBBB',
    '.oCCCBBB',
    '.oCCBBBB',
    '.oCCBBBB',
    '.oCCBBBB',
    '..oCBBBB',
    '..oCBBBo',
    '..oCBBBo',
    '...oCBo.',
    '...oBo..',
    '....o...',
  ]],
  // The gold tie at the back of the crown.
  tie: [18, 7, ['.oo.', 'oqqo', 'oqjo', '.oo.']],
  // The long pointed ear, at eye level, sweeping up and back over the tail.
  ear: [16, 10, [
    'oo......',
    'ouo.....',
    '.ouo....',
    '.otuo...',
    '..otuo..',
    '..ottuo.',
    '...ostto',
    '....oo..',
  ]],
};
// The tail's rows from here down swing; those above stay with the head.
const TAIL_PIVOT = 14;

class Grid extends Letters {
  constructor() {
    super(D_PAL);
  }
  part(name, dx = 0, dy = 0, skip = null) {
    const [x, y, rows] = P[name];
    return this.put(x + dx, y + dy, rows, skip);
  }
}

// ---- legs --------------------------------------------------------------------------------------
// A leg is drawn row by row as her standing legs are: the legging (2 px) from the hip to the knee,
// the boot's cuff at the knee, the boot (3 px) to the ankle, then the foot: flat (toe forward and
// the sole under it), on its toe (heel up, pushing off) or in the air. Each row is inked at both
// ends; x is a row's first coloured pixel. The far leg is a shade darker.
const LEG = {
  near: { thigh: 'hj', cuff: 'kll', boot: 'jkk', foot: 'jkkk', toe: 'jkk' },
  far: { thigh: 'hh', cuff: 'jkj', boot: 'hjj', foot: 'hjjj', toe: 'hjj' },
};
function leg(G, side, p, oy) {
  if (typeof p === 'string') {
    // Her drawn legs (standing), their top row repeated where the body rises off them.
    const [x, y, rows] = P[p];
    for (let k = oy; k < 0; k++) G.put(x, y + k, [rows[0]]);
    G.put(x, y, rows);
    return;
  }
  const L = LEG[side], hy = 30 + oy;
  const row = (x, y, fill) => G.put(x - 1, y, ['o' + fill + 'o']);
  const [hx] = p.hip, [kx, ky] = p.knee, [ax, ay] = p.ankle;
  const lerp = (a, b, t) => Math.round(a + (b - a) * t);
  for (let y = hy; y < ky; y++) row(lerp(hx, kx, (y - hy) / Math.max(1, ky - hy)), y, L.thigh);
  row(kx, ky, L.cuff);
  for (let y = ky + 1; y <= ay; y++) row(lerp(kx, ax, (y - ky) / Math.max(1, ay - ky)), y, L.boot);
  if (p.foot === 'toe') {
    // Heel up: the boot's toe tips down to the ground a pixel ahead, the heel clear of it.
    row(ax + 1, ay + 1, L.toe);
    G.put(ax + 1, ay + 2, ['oooo']);
  } else {
    row(ax, ay + 1, L.foot);
    G.put(ax - 1, ay + 2, ['oooooo']);
  }
}
const L = (hip, knee, ankle, foot = 'flat') => ({ hip: [hip], knee, ankle, foot });
// Standing: her drawn legs, the near one straight under her, the far one set back.
const STAND = { near: 'frontLeg', far: 'backLeg' };
// Shooting: a wider archer's stance, the near foot a step forward.
const BRACE = { near: L(26, [27, 33], [27, 37]), far: L(20, [19, 33], [17, 37]) };
// The walk, a stride of 8 frames. For the near leg: contact (0), down (1), passing (2), up (3),
// toe-off (4), lift (5), swing through (6), reach (7); the far leg takes the same steps half a
// stride later. Walking, her feet come in under her (the far hip a pixel ahead of the near one, as
// a body turned three-quarters to us stands), so the legs part in a clear V at both contacts
// instead of crossing. Knee and ankle are given relative to the hip; the body bobs with it,
// lowest on the down frames.
const BOB = [0, 1, 0, -1, 0, 1, 0, -1];
const HIPS = { near: 24, far: 25 };
const STRIDE = [
  { knee: [2, 33], ankle: [3, 37], foot: 'flat' },
  { knee: [1, 33], ankle: [1, 37], foot: 'flat' },
  { knee: [0, 33], ankle: [-1, 37], foot: 'flat' },
  { knee: [-2, 33], ankle: [-4, 37], foot: 'toe' },
  { knee: [-3, 33], ankle: [-6, 37], foot: 'toe' },
  { knee: [-1, 33], ankle: [-4, 35], foot: 'air' },
  { knee: [1, 32], ankle: [-3, 34], foot: 'air' },
  { knee: [2, 32], ankle: [3, 36], foot: 'air' },
];
function walkLeg(side, w) {
  const s = STRIDE[side === 'near' ? w : (w + 4) % 8], h = HIPS[side];
  return { hip: [h], knee: [h + s.knee[0], s.knee[1]], ankle: [h + s.ankle[0], s.ankle[1]], foot: s.foot };
}

// ---- the bow arm, raised in steps ---------------------------------------------------------------
// rest: as drawn, the bow held low. mid: lifting. high: the bow up at shoulder height, the arm
// straight out to it. For each: the bow's offset, the arm, and where the hand grips.
const ARMS = {
  rest: { bow: [0, 0], arm: P.bowArm, hand: [34, 27] },
  mid: {
    bow: [1, -3],
    arm: [28, 22, [
      'ooo.....',
      'cbbo....',
      'ottooo..',
      '.otjkko.',
      '..ojklto',
      '...ooooo',
    ]],
    hand: [35, 24],
  },
  high: {
    bow: [2, -6],
    arm: [28, 21, [
      '.ooooooo.',
      'ocbttjklt',
      'obbtsjkko',
      '.ooooooo.',
    ]],
    hand: [36, 21],
  },
};

// The bow, raised (dx, dy). A pulled string is drawn from nock to nock through the drawing hand,
// so the pattern's straight string (column 1, rows 3-17, where it leaves the limbs) is left out.
function bow(G, dx, dy, pulled) {
  const [x, y] = P.bow;
  G.part('bow', dx, dy, pulled ? (i, j) => i === 1 && j >= 3 && j <= 17 : null);
  return { top: [x + 1 + dx, y + 1 + dy], bottom: [x + 1 + dx, y + 19 + dy] };
}

// ---- the hair ---------------------------------------------------------------------------------
// How far back each tail row below the pivot (rows 15-21) swings for a sway of 1 or 2 px at the
// tip. The steps fall on the rows where the tail's own outline steps in (16 and 19), so a swung
// tail keeps a straight back edge and a whole tip.
const SWING = { 0: [0, 0, 0, 0, 0, 0, 0], 1: [0, 1, 1, 1, 1, 1, 1], 2: [0, 1, 1, 1, 2, 2, 2] };
// The tail, riding the body's bob: its rows below the pivot swung back (SWING), and a row behind
// the bob (`lag`: +1 still low as the body rises, -1 still high as it sinks). The rows at the pivot
// are alike, so lagging low repeats the pivot row and lagging high lets the next row cover it.
// Under it lies the nape: the resting tail's lower half in shadow (A), no ink, so a swing never
// opens a gap behind her neck. At rest the tail covers it.
function tail(G, oy, sway, lag) {
  const [x, y, rows] = P.tail;
  rows.forEach((r, j) => {
    const ry = y + j;
    if (ry >= 17) G.put(x, ry + oy, [r.replace(/o/g, '.').replace(/[BCD]/g, 'A')]);
  });
  rows.forEach((r, j) => {
    const ry = y + j, off = ry <= TAIL_PIVOT ? 0 : SWING[sway][ry - TAIL_PIVOT - 1];
    if (ry === TAIL_PIVOT && lag > 0) G.put(x, ry + oy + 1, [r]);
    G.put(x - off, ry + oy + (ry > TAIL_PIVOT ? lag : 0), [r]);
  });
}

// Where moving parts leave a coloured pixel on the edge (a swung lock over a narrower one, a knee
// out past the thigh above it), the contour is closed with ink outside it.
function ink(G) {
  const add = [];
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const c = G.get(x, y);
    if (c === '.' || c === 'o') continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (G.get(x + dx, y + dy) === '.') add.push([x + dx, y + dy]);
  }
  for (const [x, y] of add) G.set(x, y, 'o');
}

// Clear pockets of one or two pixels closed in by the figure (between the legs, between the
// tail's tip and the quiver) are inked shut; the bow's open belly is far larger and stays clear.
function pinholes(G) {
  const seen = new Uint8Array(48 * 48);
  for (let y0 = 0; y0 < 48; y0++) for (let x0 = 0; x0 < 48; x0++) {
    if (seen[y0 * 48 + x0] || G.get(x0, y0) !== '.') continue;
    const cells = [[x0, y0]];
    let open = false;
    seen[y0 * 48 + x0] = 1;
    for (let i = 0; i < cells.length; i++) {
      const [x, y] = cells[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X > 47 || Y > 47) { open = true; continue; }
        if (seen[Y * 48 + X] || G.get(X, Y) !== '.') continue;
        seen[Y * 48 + X] = 1;
        cells.push([X, Y]);
      }
    }
    if (!open && cells.length <= 2) for (const [x, y] of cells) G.set(x, y, 'o');
  }
}

// The arrow, nock to point; and how far the string is drawn at full draw (to the chin).
const ARROW = 14;
const FULL = 7;

// ---- a frame ------------------------------------------------------------------------------------
// pose: { oy (the body's bob), near/far legs, arm ('rest' | 'mid' | 'high'), pull (px), arrow,
// snap (the string loosed), hand (after the loose: 'loose' | 'eased'), sway (the tail's tip, px
// back), glint }
function frame(pose) {
  const G = new Grid(), oy = pose.oy || 0;
  G.part('quiver', 0, oy);
  leg(G, 'far', pose.far, oy);
  G.part('torso', 0, oy);
  leg(G, 'near', pose.near, oy);
  const A = ARMS[pose.arm || 'rest'], pull = pose.pull || 0;
  // Walking, she carries the lowered bow a row higher, so its tip clears the ground, and her bow arm
  // swings a pixel forward as the near leg goes back, so the bow clears the far foot's reach.
  const [ax, ay] = pose.arm ? [0, oy] : [pose.carry?.[0] || 0, oy + (pose.carry?.[1] || 0)];
  const b = bow(G, A.bow[0] + ax, A.bow[1] + ay, pull > 0 || pose.snap);
  // The nock: on the string, level with the top of the bow hand. Loosed, the string flies past
  // straight and bows a pixel forward.
  const nock = [b.top[0] - (pose.snap ? -1 : pull), A.hand[1] - 1 + ay];
  if (pull || pose.snap) {
    G.line(...b.top, ...nock, 'o');
    G.line(...nock, ...b.bottom, 'o');
  }
  // Swung forward, the shoulder's ink would stand a pixel outside the cape's: leave it out.
  G.put(A.arm[0] + ax, A.arm[1] + ay, A.arm[2], ax ? (i, j) => j <= 1 && i === 3 : null);
  G.part('mantle', 0, oy);
  // The drawing arm. Drawn to the chin, its forearm lies under the jaw, two rows of skin inked only
  // beneath, sloping down towards the elbow hidden behind her (the tail and head, drawn next,
  // cover its far end and its top). After the loose, the open hand has flown back behind the jaw,
  // under the ear; then it sinks behind her shoulder.
  const ny = A.hand[1] - 1 + ay, [nx] = nock;
  if (pull >= 5) {
    G.put(nx - 8, ny, [
      '...ttttt',
      '.ttsssss',
      'tssooooo',
      'ooo.....',
    ]);
  } else if (pose.hand === 'eased') G.put(17, ny + 1, ['.oo.', 'otuo', 'otto', '.oo.']);
  tail(G, oy, pose.sway || 0, pose.lag || 0);
  G.part('head', 0, oy);
  G.part('tie', 0, oy);
  G.part('ear', 0, oy);
  // The drawing hand: the fist on the string (its wrist open to the forearm on a full draw); loosed,
  // open behind the jaw.
  if (pull) G.put(nx - 1, ny - 1, pull >= 5 ? ['.oo.', 'ttuo', 'ttto', '.oo.'] : ['.oo.', 'otuo', 'otto', '.oo.']);
  // On a full draw the forearm's top row under the neck (x 25-26) takes the neck's shadow, a hint of
  // the jaw over the arm.
  if (pull >= 5) G.put(25, ny, ['ss']);
  else if (pose.hand === 'loose') G.put(19, ny - 2, ['.ooo.', 'ottuo', 'ottoo', '.oo..']);
  G.put(A.hand[0] + ax, A.hand[1] + ay, P.hand[2]);
  ink(G);
  pinholes(G);
  if (pose.arrow) {
    // The arrow on the string: teal-and-white fletching at the nock, the shaft, a steel head. It
    // keeps its length, so drawing it back brings the head to the bow.
    const [nx, ny2] = nock, head = Math.min(47, nx + ARROW);
    G.line(nx + 2, ny2, head - 2, ny2, 'U');
    G.set(nx + 2, ny2, 'z');
    G.set(nx + 3, ny2, 'c');
    G.set(head - 1, ny2, 'C');
    G.set(head, ny2, 'D');
  }
  // A flash where the loosed string slaps forward.
  if (pose.snap) G.set(nock[0] + 1, nock[1], 'D');
  // The glint runs down the birch beside the moonstone, leaving the glowing stone whole.
  if (pose.glint) G.set(31 + A.bow[0] + 4 + ax, 18 + A.bow[1] + 5 + ay, 'D');
  return G.g;
}

// ---- the poses ----------------------------------------------------------------------------------
// The tail's lag: a frame behind the body's bob.
const lagOf = (bob, i) => bob[(i + bob.length - 1) % bob.length] - bob[i];
// Idle: she breathes (the body up a pixel on frames 3-5); the tail follows a frame late, stirs on
// frame 1 and swings a pixel back and settles as she breathes in; a glint runs down the bow.
const BREATH = [0, 0, 0, -1, -1, -1, 0, 0];
const idle = (i) => ({ oy: BREATH[i], lag: lagOf(BREATH, i), near: STAND.near, far: STAND.far, sway: [0, 1, 0, 0, 1, 1, 1, 0][i], glint: i === 6 });
// Walk: the stride, the body bobbing with it, the tail trailing and bouncing a frame late, the bow
// carried a row higher and swung a pixel forward while the near leg is back (ARM_SWING).
const walk = (w) => ({ oy: BOB[w], lag: lagOf(BOB, w), near: walkLeg('near', w), far: walkLeg('far', w), sway: [1, 2, 2, 1, 1, 2, 2, 1][w], carry: [ARM_SWING[w], -1] });
const ARM_SWING = [0, 0, 1, 1, 1, 1, 0, 0];
// The shot, 14 frames a second, the arrow leaving on frame 5 (the weapon's own shot): lift the bow,
// nock, draw to the chin, hold, loose (the string snaps), follow through, lower.
const SHOT = [
  { arm: 'mid', pull: 0 },
  { arm: 'high', pull: 1, arrow: true },
  { arm: 'high', pull: 3, arrow: true },
  { arm: 'high', pull: 6, arrow: true },
  { arm: 'high', pull: FULL, arrow: true },
  { arm: 'high', pull: 0, snap: true, hand: 'loose' },
  { arm: 'high', pull: 0, hand: 'eased' },
  { arm: 'mid', pull: 0 },
];
const shoot = (k) => ({ oy: 0, near: BRACE.near, far: BRACE.far, sway: 0, ...SHOT[k] });
const shootWalking = (k, w) => ({ ...walk(w), ...SHOT[k] });

// ---- frames ------------------------------------------------------------------------------------
let grids;
const allGrids = () => (grids ??= [
  ...Array.from({ length: 8 }, (_, i) => frame(idle(i))),
  ...Array.from({ length: 8 }, (_, i) => frame(walk(i))),
  ...Array.from({ length: 8 }, (_, i) => frame(shoot(i))),
  ...Array.from({ length: 8 }, (_, k) => Array.from({ length: 8 }, (_, w) => frame(shootWalking(k, w)))).flat(),
]);
const def = (look) => ({
  gen: () => allGrids().map((g) => toBuf(g, look)),
  idle: [0, 1, 2, 3, 4, 5, 6, 7], walk: [8, 9, 10, 11, 12, 13, 14, 15],
  attack: [16, 17, 18, 19, 20, 21, 22, 23], attackFps: 14, attackRelease: 5,
  attackWalk: Array.from({ length: 8 }, (_, a) => Array.from({ length: 8 }, (_, w) => 24 + a * 8 + w)),
  motionRate: 12 / (9.8 * 1.15), idleRate: 6 / 1.6,
  anchorY: 40, fitW: 36, fitH: 34, selfBob: true, outline: false,
});

const COLLECTION = 'Picked · October 15';
export default [
  {
    cls: 'archer', id: 'silverleaf-picked', name: 'Ranger · Silverleaf (picked)',
    description: 'Silverleaf in the colours picked on the review page (hue -19, colour +22, brightness -11, contrast +14, midtones +37, warmth +40, tint +11, outline -100), animated for the game. Her silver hair is drawn back from the parted fringe, over the long pointed ear, into a high ponytail tied in gold. She breathes as the tail settles; walks with a planted stride, the body bobbing and the tail trailing; and shoots: lifts the bow, nocks, draws to the chin, holds, looses with the string snapping forward, follows through and lowers, standing or on the move.',
    collection: COLLECTION, glow: glow(LOOK), def: def(LOOK),
  },
  {
    cls: 'archer', id: 'silverleaf-animated', name: 'Ranger · Silverleaf (animated)',
    description: 'Silverleaf in her own colours, with the same ponytail and the same breathing, walk and shots as the picked one.',
    collection: COLLECTION, glow: glow(null), def: def(null),
  },
];
