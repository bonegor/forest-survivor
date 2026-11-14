// Ea-nāṣir's meme likeness: the standing, bearded Mesopotamian worshipper
// supplied by the player. Native pixel art, drawn on the same pivot as the
// approved heroes. The statue's wide eyes, long curled beard and fringed skirt
// remain legible in play; a stern brow, carved beard and copper bracers give
// the merchant more weight without losing the statue's recognisable likeness.
const W = 80, H = 64, FOOT = 56;
const blank = (w = W, h = H) => Array.from({ length: h }, () => Array(w).fill('.'));
const rows = a => a.map(r => r.join(''));
function dot(a, x, y, c) { x = Math.round(x); y = Math.round(y); if (a[y]?.[x] !== undefined) a[y][x] = c; }
function rect(a, x, y, w, h, c) { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) dot(a, x + xx, y + yy, c); }
function stamp(a, x, y, r) { r.forEach((s, yy) => [...s].forEach((c, xx) => { if (c !== '.') dot(a, x + xx, y + yy, c); })); }
function line(a, x0, y0, x1, y1, c, width = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let t = 0; t <= n; t++) rect(a, Math.round(x0 + (x1 - x0) * t / (n || 1)), Math.round(y0 + (y1 - y0) * t / (n || 1)), width, width, c);
}
function poly(a, points, c) {
  const lo = Math.min(...points.map(p => p[1])), hi = Math.max(...points.map(p => p[1]));
  for (let y = lo; y <= hi; y++) {
    const xs = [];
    for (let i = 0; i < points.length; i++) {
      const [x0, y0] = points[i], [x1, y1] = points[(i + 1) % points.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + (y - y0) * (x1 - x0) / (y1 - y0));
    }
    xs.sort((x, y) => x - y);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.ceil(xs[i]); x <= Math.floor(xs[i + 1]); x++) dot(a, x, y, c);
  }
}

const HEAD = [
  '....IIIIIII....',
  '..IIHDHDHDHI...',
  '.IHDDHHDDHDHI..',
  '.IHHCTTTTDHHI..',
  'IHDCTTTTTTCDHI.',
  'IHCHHHCTHHHTHI.',
  'IHCCTIkTTIkTHI.',
  '.ICCTDDTTDDTHI.',
  '.IHCTTTCTTTDHI.',
  '..IHCTTCTTDHI..',
  '..IHDDIIIDHHI..',
  '..IHDHDDHDHHI..',
  '...IHDHDHDHI...',
  '...IHIDHIHDI...',
  '...IHDHDDHHI...',
  '....IHDHDHI....',
  '....IHHDHHI....',
  '.....IHDHI.....',
  '.....IHHHI.....',
  '......III......',
];

const DISC = [
  '...bbbbb...',
  '..bttyddb..',
  '.bttddddOb.',
  'btyddBdOObb',
  'btdBdBddOOb',
  'bddddBddOOb',
  'bddOBddOObb',
  '.bOdOOOOb..',
  '..bbOObb...',
  '...bbb.....',
];
const REFINED_DISC = DISC.map(row => row.replaceAll('O', 'd').replaceAll('B', 't'));
REFINED_DISC[1] = '..btYyddb..';
REFINED_DISC[2] = '.btzttdddb.';

// One connected rig across every clip. The skirt follows the pelvis; the feet
// trace alternating support / lifted-return phases beneath its fringe.
function frame({ phase = 0, moving = false, breath = 0, attack = -1 } = {}) {
  const a = blank(), s = Math.sin(phase), c = Math.cos(phase);
  const sway = moving ? Math.round(s) : 0;
  const bob = moving ? -Math.round(Math.abs(s)) : breath;
  const hip = 40 + sway, top = 25 + bob;
  const rearFoot = moving ? Math.round(-c * 4) : -1;
  const frontFoot = moving ? Math.round(c * 4) : 1;
  const rearLift = moving && s < 0 ? Math.round(-s * 2) : 0;
  const frontLift = moving && s > 0 ? Math.round(s * 2) : 0;

  // Bare feet and lower legs; both remain attached behind the skirt.
  line(a, hip - 6, 47 + bob, hip - 6 + rearFoot, FOOT - 2 - rearLift, 'H', 4);
  rect(a, hip - 7 + rearFoot, FOOT - 2 - rearLift, 7, 2, 'H');
  rect(a, hip - 6 + rearFoot, FOOT - 2 - rearLift, 5, 1, 'D');
  line(a, hip + 4, 47 + bob, hip + 4 + frontFoot, FOOT - 2 - frontLift, 'D', 4);
  rect(a, hip + 3 + frontFoot, FOOT - 2 - frontLift, 8, 2, 'H');
  rect(a, hip + 4 + frontFoot, FOOT - 2 - frontLift, 6, 1, 'C');

  // Alabaster shoulders and bare chest, tapering to the woollen kaunakes skirt.
  poly(a, [[hip - 10, top], [hip + 9, top], [hip + 12, top + 4], [hip + 7, top + 14], [hip - 8, top + 14], [hip - 12, top + 4]], 'I');
  poly(a, [[hip - 9, top + 1], [hip + 8, top + 1], [hip + 10, top + 4], [hip + 6, top + 14], [hip - 7, top + 14], [hip - 10, top + 4]], 'C');
  poly(a, [[hip - 7, top + 1], [hip + 3, top + 1], [hip + 5, top + 12], [hip - 6, top + 12]], 'T');
  line(a, hip - 6, top + 8, hip - 5, top + 11, 'D');
  line(a, hip + 6, top + 7, hip + 5, top + 12, 'D');
  dot(a, hip + 1, top + 12, 'D');
  line(a, hip - 8, top + 5, hip - 2, top + 6, 'D');
  line(a, hip + 3, top + 6, hip + 8, top + 4, 'D');
  line(a, hip - 6, top + 4, hip - 3, top + 4, 'z');

  poly(a, [[hip - 8, 37 + bob], [hip + 8, 37 + bob], [hip + 12, 52], [hip + 9, 54], [hip - 10, 54], [hip - 12, 52]], 'H');
  poly(a, [[hip - 7, 38 + bob], [hip + 7, 38 + bob], [hip + 10, 52], [hip + 7, 53], [hip - 9, 53], [hip - 10, 51]], 'C');
  poly(a, [[hip - 6, 38 + bob], [hip + 2, 38 + bob], [hip + 5, 52], [hip - 7, 52], [hip - 9, 50]], 'T');
  rect(a, hip - 8, 37 + bob, 17, 3, 'I');
  rect(a, hip - 7, 37 + bob, 15, 1, 'B');
  rect(a, hip - 1, 37 + bob, 4, 3, 'b');
  rect(a, hip, 37 + bob, 2, 2, 'y');
  for (let i = -8; i <= 8; i += 3) {
    const bend = Math.round(s * (i > 0 ? 1 : -1));
    line(a, hip + i * .75, 40 + bob, hip + i + bend, 52 + (i % 2), i > 4 ? 'H' : 'D');
    line(a, hip + i * .75 + 1, 41 + bob, hip + i + bend + 1, 51, i < 4 ? 'T' : 'C');
  }

  // Rear hand grips a leather whip. Its open curl stays separate from the skirt
  // silhouette and every segment stays connected to the grip through the cast.
  const cast = attack < 0 ? 0 : [0, -2, 2, 3, 1][attack];
  const handX = hip + (attack < 0 ? -11 : [-11, -16, 4, 8, -6][attack]) + (moving ? Math.round(c) : 0), handY = 34 + bob + cast;
  line(a, hip - 9, top + 2, hip - 13, top + 9, 'H', 3);
  line(a, hip - 9, top + 2, hip - 12, top + 8, 'T', 2);
  line(a, hip - 12, top + 8, handX, handY, 'H', 4);
  line(a, hip - 12, top + 8, handX, handY, 'C', 3);
  rect(a, handX - 1, handY - 2, 4, 3, 'b');
  rect(a, handX, handY - 2, 3, 1, 'd');
  line(a, handX, handY, handX - 2, handY + 6, 'I', 2);
  line(a, handX, handY + 1, handX - 1, handY + 5, 'B');
  const curl = attack === 2 || attack === 3 ? [[handX - 1, handY + 5], [handX + 6, handY + 2], [handX + 15, handY - 1], [handX + 24, handY + 1]]
    : [[handX - 1, handY + 5], [handX - 6, handY + 10], [handX - 9, handY + 8], [handX - 10, handY + 3], [handX - 7, handY + 1]];
  for (let i = 1; i < curl.length; i++) line(a, ...curl[i - 1], ...curl[i], 'b');
  rect(a, handX, handY, 3, 3, 'T');

  // Leading arm cradles his copper: a small, unmistakably warm disc against stone.
  const lead = moving ? Math.round(-c) : 0;
  line(a, hip + 8, top + 2, hip + 12 + lead, top + 10, 'H', 3);
  line(a, hip + 8, top + 2, hip + 11 + lead, top + 9, 'C', 2);
  line(a, hip + 12 + lead, top + 9, hip + 8 + lead, top + 11, 'T', 3);
  rect(a, hip + 10 + lead, top + 8, 4, 3, 'b');
  rect(a, hip + 10 + lead, top + 8, 3, 1, 'd');
  stamp(a, hip + 7 + lead, top + 5, DISC);
  rect(a, hip + 8 + lead, top + 12, 4, 2, 'T');
  dot(a, hip + 11 + lead, top + 12, 'D');

  stamp(a, hip - 7, 12 + bob, HEAD);
  return rows(a);
}

const frames = [], idle = [], walk = [], attack = [], attackWalk = [];
for (const breath of [0, 0, -1, -1, 0, 1]) { idle.push(frames.length); frames.push(frame({ breath })); }
for (let i = 0; i < 8; i++) { walk.push(frames.length); frames.push(frame({ moving: true, phase: i * Math.PI / 4 })); }
for (let i = 0; i < 5; i++) { attack.push(frames.length); frames.push(frame({ attack: i })); }
for (let i = 0; i < 5; i++) {
  const gait = [];
  for (let j = 0; j < 8; j++) { gait.push(frames.length); frames.push(frame({ moving: true, phase: j * Math.PI / 4, attack: i })); }
  attackWalk.push(gait);
}
const portrait = idle.map(i => frames[i].slice(10, 57).map(r => r.slice(15, 61)));
const icon = blank(16, 16);
stamp(icon, 3, 3, DISC);
// A fleck of green patina makes poor quality visible without changing its shape.
dot(icon, 8, 7, 'E'); dot(icon, 9, 7, 'e'); dot(icon, 7, 10, 'E');

const mediumIcon = blank(16, 16), highIcon = blank(16, 16);
stamp(mediumIcon, 3, 3, DISC);
stamp(highIcon, 3, 3, DISC);
line(highIcon, 4, 6, 7, 3, 'Y'); line(highIcon, 5, 7, 8, 4, 't');
line(highIcon, 11, 1, 11, 5, 'z'); line(highIcon, 9, 3, 13, 3, 'z');
function whipIcon(evolved) {
  const a = blank(16, 16);
  const path = [[3, 13], [1, 8], [2, 3], [6, 1], [12, 3], [14, 7], [12, 10], [8, 10], [6, 7]];
  for (let i = 1; i < path.length; i++) line(a, ...path[i - 1], ...path[i], 'I', 2);
  for (let i = 1; i < path.length; i++) line(a, ...path[i - 1], ...path[i], evolved ? 'y' : 'B');
  line(a, 3, 14, 7, 9, 'b', 2); line(a, 4, 14, 8, 9, evolved ? 'Y' : 'd');
  return { frames: [rows(a)], outline: false };
}

const smallDisc = ['.bbb.', 'btydb', 'btdOb', 'bdOOb', '.bbb.'];
function evolutionIcon(kind) {
  const a = blank(16, 16);
  if (kind === 'furnace') {
    stamp(a, 0, 0, ['......oo........', '.....oYo..o.....', '..o..oYooYo.....', '.oYooYYYYYo..o..', '.oYYYYYYYYYooYo.', 'oYYYYYYYYYYYYYo.', 'oYYYooooooYYYoo.', 'oYYoo....ooYYo..', '.oYo......oYYo..', '.oYo......oYYo..', '..oo......ooo...', '...oooooo.......']);
    stamp(a, 3, 4, DISC);
  } else if (kind === 'crown') {
    line(a, 4, 4, 12, 7, 'D'); line(a, 12, 7, 7, 13, 'D'); line(a, 7, 13, 4, 4, 'D');
    stamp(a, 1, 1, smallDisc); stamp(a, 10, 5, smallDisc); stamp(a, 4, 10, smallDisc);
  } else if (kind === 'return') {
    line(a, 3, 2, 11, 2, 'y'); line(a, 11, 2, 14, 5, 'y'); line(a, 14, 5, 14, 11, 'y'); line(a, 14, 11, 10, 14, 'y');
    poly(a, [[3, 0], [0, 3], [4, 5]], 'Y'); stamp(a, 2, 5, DISC);
  } else if (kind === 'hail') {
    for (const [x, y] of [[1, 10], [6, 6], [10, 1]]) {
      line(a, x - 1, y + 5, x + 2, y + 2, 'y'); stamp(a, x, y, smallDisc);
    }
  } else if (kind === 'arc') {
    poly(a, [[9, 0], [2, 8], [7, 8], [4, 16], [14, 5], [9, 5]], 'b');
    poly(a, [[9, 1], [4, 7], [9, 7], [6, 13], [12, 6], [8, 6]], 'y');
    line(a, 8, 3, 5, 6, 'T'); line(a, 7, 10, 10, 7, 'T');
    dot(a, 2, 2, 'd'); dot(a, 13, 12, 'd'); dot(a, 1, 10, 'd');
  } else if (kind === 'foundry') {
    poly(a, [[7, 0], [9, 5], [15, 2], [12, 7], [16, 10], [10, 11], [10, 16], [6, 12], [1, 15], [3, 9], [0, 5], [5, 5]], 'O');
    poly(a, [[7, 3], [9, 7], [13, 5], [10, 9], [11, 13], [7, 11], [4, 13], [5, 9], [2, 7], [6, 7]], 'y');
    stamp(a, 5, 6, smallDisc);
  }
  return { frames: [rows(a)], outline: false };
}

export const EANASIR_ART = {
  eanasir: { frames, anchorY: FOOT, below: H - 1 - FOOT, body: [25, 44], idle, walk, attack, attackWalk,
    motionRate: 1, idleRate: 2, attackFps: 18, attackRelease: 2,
    manualDelay: 2 / 18, selfBob: true, outline: false },
  eanasir_pose: { frames: portrait, outline: false, fps: 3.2 },
  copper_disc: { frames: [DISC], outline: false },
  copper_refined_disc: { frames: [REFINED_DISC], outline: false },
  i_copper: { frames: [rows(icon)], outline: false },
  i_mediumcopper: { frames: [rows(mediumIcon)], outline: false },
  i_highcopper: { frames: [rows(highIcon)], outline: false },
  i_merchantwhip: whipIcon(false), i_lionslash: whipIcon(true),
  ...Object.fromEntries(['furnace', 'crown', 'return', 'hail', 'arc', 'foundry'].map(kind => ['i_copper_' + kind, evolutionIcon(kind)])),
};

export const EANASIR_HERO_ART = { eanasir: EANASIR_ART.eanasir, eanasir_pose: EANASIR_ART.eanasir_pose };
export const COPPER_ART = Object.fromEntries(Object.entries(EANASIR_ART).filter(([key]) => !Object.hasOwn(EANASIR_HERO_ART, key)));
