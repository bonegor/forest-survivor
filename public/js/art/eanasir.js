import { EANASIR_MODEL_ART } from './eanasir-source.js';
import { merchantFall } from './eanasir-fall.js';

// Ea-nāṣir's meme likeness: the standing, bearded Mesopotamian worshipper
// requested by the player (Met 40.156, as pictured on Wikipedia). The complete
// source model and rig live in tools/eanasir-source.
const W = 80, H = 64;
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
// The merchant strikes a wedge and upright into each disc he keeps for himself.
const STOCK_DISC = [...DISC];
STOCK_DISC[3] = 'btyttttOObb';
STOCK_DISC[4] = 'btdOtbdtOOb';
STOCK_DISC[5] = 'bdddtbdtOOb';
STOCK_DISC[6] = 'bddObbOOObb';
const REFINED_DISC = [...STOCK_DISC];
REFINED_DISC[1] = '..btYyddb..';
REFINED_DISC[2] = '.btzttdddb.';
REFINED_DISC[3] = 'btyYYyYddbb';

// Hero motion is reconstructed from the retained statue source model.
const icon = blank(16, 16);
stamp(icon, 3, 3, DISC);
// A fleck of green patina makes poor quality visible without changing its shape.
dot(icon, 8, 7, 'E'); dot(icon, 9, 7, 'e'); dot(icon, 7, 10, 'E');

const mediumIcon = blank(16, 16), highIcon = blank(16, 16);
stamp(mediumIcon, 3, 3, STOCK_DISC);
stamp(highIcon, 3, 3, REFINED_DISC);
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
  ...EANASIR_MODEL_ART,
  copper_disc: { frames: [DISC], outline: false },
  merchant_stock_disc: { frames: [STOCK_DISC], outline: false },
  copper_refined_disc: { frames: [REFINED_DISC], outline: false },
  i_copper: { frames: [rows(icon)], outline: false },
  i_mediumcopper: { frames: [rows(mediumIcon)], outline: false },
  i_highcopper: { frames: [rows(highIcon)], outline: false },
  i_merchantwhip: whipIcon(false), i_lionslash: whipIcon(true),
  ...Object.fromEntries(['furnace', 'crown', 'return', 'hail', 'arc', 'foundry'].map(kind => ['i_copper_' + kind, evolutionIcon(kind)])),
};

export const EANASIR_HERO_ART = {
  eanasir: { ...EANASIR_ART.eanasir, fall: merchantFall(EANASIR_ART.eanasir) },
  eanasir_pose: EANASIR_ART.eanasir_pose,
};
export const COPPER_ART = Object.fromEntries(Object.entries(EANASIR_ART).filter(([key]) => !Object.hasOwn(EANASIR_HERO_ART, key)));
