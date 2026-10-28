// The Bloomvale's flora: the trees, bushes, stones and small props of the meadow look (MAPS.meadow,
// the third of the five Survival maps, after the Sunscorch and the Frostfell). The owner's (28
// October 2026): "And another would be sort of like a bright flower, colorful map." Painted as
// procgen.js paints the Darkwood's (pixel buffers lit from the top left, dithered with the same
// Bayer matrix, in palette tones only so they tune and burst like the rest, outlined in ink by
// the build), the smallest drawn as palette strings as props.js draws its. Each stands in a slot
// of the Darkwood's own layout (darkwood.js layoutChunk), about the size of what it replaces, its
// bottom row on its foot:
//   bloom_tree1..3    blossom trees: a pink cherry, a white apple blushed pink, a lilac wisteria
//                     hung with racemes (34x44, the oaks' size): the oaks
//   bloom_shroom1..2  giant mushrooms: a red fly agaric with a skirt, a violet parasol whose
//                     spots glow cyan ('cX') (26x42, 26x44): the pines
//   bloom_vine1..2    old trees long dead, their wood bleached silver, wound with flowering vines,
//                     pink and white (30x40): the cursed woods' dead trees
//   bloom_bush1..2    flowering bushes, pink roses and yellow (18x12): the bushes
//   bloom_rock1..3    mossy stones, flowers standing out of the moss (the rocks' sizes, two rows
//                     taller for the flowers): the rocks
//   bloom_toadstool   a big orange toadstool with a little one at its side (17x12): the stump
//   bloom_flower1..3  giant flowers: a sunflower, tulips (red, yellow, pink), bluebells: the
//                     redcaps at the trees' feet
//   bloom_statue      a stone maiden crowned with flowers, a posy in her hands (16x25): the
//                     gravestones and crosses
//   crypt_meadow      props.js's crypt grown over with ivy and flowers, the same 26x29 frames (open,
//                     sealed) and shape, its stairs still glowing lavender ('j')
import { makeBuf, blit } from '../engine/pixels.js';
import { packedPalette } from './palette.js';
import { mulberry32 } from '../engine/util.js';

const pal = packedPalette();
const tones = (keys) => [...keys].map((k) => pal[k]);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

// Light from the top-left, slightly towards the viewer (as procgen.js).
const LX = -0.5, LY = -0.72, LZ = 0.48;

function set(buf, x, y, c) {
  x = Math.round(x);
  y = Math.round(y);
  if (x >= 0 && y >= 0 && x < buf.w && y < buf.h) buf.d[y * buf.w + x] = c;
}
function get(buf, x, y) {
  x = Math.round(x);
  y = Math.round(y);
  return x >= 0 && y >= 0 && x < buf.w && y < buf.h ? buf.d[y * buf.w + x] : 0;
}
// Palette strings ('.' clear) laid into a buffer at (ox, oy).
function stamp(buf, rows, ox = 0, oy = 0) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] !== '.') set(buf, ox + x, oy + y, pal[row[x]]);
  });
}
const clampT = (v, n) => Math.max(0, Math.min(n - 1, Math.floor(v * n)));

// Paints sphere-shaded blobs back to front (procgen.js's), tones darkest -> brightest. Also:
// opts.owner, the blobs painted before (a layer behind), so a front blob's lower edge draws its
// seam over them too; opts.accent(t, x, y), a colour put in place of tone t (blossoms, leaves).
function paintBlobs(buf, blobs, tns, rng, opts = {}) {
  const owner = opts.owner || new Int16Array(buf.w * buf.h).fill(-1);
  const sep = opts.separator ?? tns[0];
  const base = opts.base ?? 0;
  blobs.forEach((b, i) => {
    const x0 = Math.floor(b.x - b.rx - 1), x1 = Math.ceil(b.x + b.rx + 1);
    const y0 = Math.floor(b.y - b.ry - 1), y1 = Math.ceil(b.y + b.ry + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (x < 0 || y < 0 || x >= buf.w || y >= buf.h) continue;
        const nx = (x + 0.5 - b.x) / b.rx, ny = (y + 0.5 - b.y) / b.ry;
        const ang = Math.atan2(ny, nx);
        const wob = opts.wobble ? 1 + Math.sin(ang * b.lobes + b.phase) * opts.wobble : 1;
        const d2 = nx * nx + ny * ny;
        if (d2 > wob * wob) continue;
        const idx = y * buf.w + x;
        const nz = Math.sqrt(Math.max(0, 1 - d2));
        let lum = nx * LX + ny * LY + nz * LZ;
        lum = lum * 0.5 + 0.5 + (opts.lift || 0) + (b.lift || 0);
        lum += bayer(x, y) * (opts.dither ?? 0.28);
        if (opts.speckle && rng() < opts.speckle) lum += (rng() - 0.5) * 0.5;
        const t = clampT(lum, tns.length);
        const edge = Math.sqrt(d2) > wob - 1.2 / Math.min(b.rx, b.ry);
        if (owner[idx] >= 0 && edge && ny > -0.2) buf.d[idx] = sep;
        else buf.d[idx] = (opts.accent && opts.accent(t, x, y)) || tns[t];
        owner[idx] = base + i;
      }
    }
  });
  return owner;
}

function trunk(buf, cx, top, bottom, w, bark, rng) {
  for (let y = top; y <= bottom; y++) {
    const flare = y > bottom - 3 ? bottom - 3 - y : 0; // roots widen
    const half = w / 2 - flare * 0.8;
    for (let x = Math.floor(cx - half); x < Math.ceil(cx + half); x++) {
      const u = (x + 0.5 - (cx - half)) / (half * 2); // 0..1 across
      let t = u < 0.3 ? 2 : u < 0.72 ? 1 : 0;
      if (rng() < 0.12) t = Math.max(0, t - 1); // bark grain
      set(buf, x, y, bark[t]);
    }
  }
}

// A limb from (x0, y0) to (x1, y1) tapering from w0 to w1 px, lit on its top-left side.
function limb(buf, x0, y0, x1, y1, w0, w1, bark) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
  const flat = Math.abs(x1 - x0) > Math.abs(y1 - y0);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    const w = Math.max(1, Math.round(w0 + (w1 - w0) * t));
    for (let k = 0; k < w; k++) {
      const tone = w === 1 ? 1 : k === 0 ? 2 : k === w - 1 ? 0 : 1;
      if (flat) set(buf, x, y - w / 2 + k + 0.5, bark[tone]);
      else set(buf, x - w / 2 + k + 0.5, y, bark[tone]);
    }
  }
}

// ---- Blossom trees ---------------------------------------------------------------------------
const blob = (cx, rng, lift = 0) => ([dx, y, rx, ry]) => ({ x: cx + dx + rng.range(-0.6, 0.6), y: y + rng.range(-0.6, 0.6), rx, ry, lobes: rng.int(5, 8), phase: rng() * 6, lift: rng.range(-lift, lift) });

// A blossom tree: a short trunk forking into limbs that show under the crown, the crown's
// shadowed mass behind (o.backTones: the same blossom, or green leaves), the limbs over it, then
// the blossom puffs in front, each lit on its own; o.tassels hang racemes under the crown.
function genBlossom(seed, o) {
  const rng = mulberry32(seed);
  const W = 34, H = 44, buf = makeBuf(W, H), cx = W / 2;
  const crown = tones(o.crown), bark = tones(o.bark), backT = tones(o.backTones || o.crown);
  trunk(buf, cx, o.fork, H - 1, 6, bark, rng);
  const back = o.back.map(blob(cx, rng)).sort((a, b) => a.y - b.y);
  const owner = paintBlobs(buf, back, backT, rng, { wobble: 0.1, lift: o.backLift ?? -0.3, speckle: 0.05 });
  for (const [x0, y0, x1, y1, w0, w1] of o.limbs) limb(buf, cx + x0, y0, cx + x1, y1, w0, w1, bark);
  const front = o.front.map(blob(cx, rng, 0.07)).sort((a, b) => a.y - b.y);
  const top = crown.length - 1;
  paintBlobs(buf, front, crown, rng, {
    owner, base: back.length, wobble: 0.14, lift: o.lift ?? -0.06, speckle: 0.05,
    accent: (t) => (t === top && rng() < 0.22 ? pal[o.speck] : t <= 1 && rng() < (o.leafy ?? 0.05) ? pal[o.leaf] : 0),
  });
  for (const [dx, y, len] of o.tassels || []) raceme(buf, cx + dx, y, len, tones(o.raceme));
  return buf;
}

// A hanging raceme (wisteria's): three wide at its top, one at its tip, lit on its left, the
// buds at its tip darker.
function raceme(buf, x, y, len, [q, p, j, G]) {
  for (let k = 0; k < len; k++) {
    const u = k / (len - 1), w = u < 0.34 ? 3 : u < 0.75 ? 2 : 1;
    const x0 = x - (w === 3 ? 1 : 0);
    for (let i = 0; i < w; i++) {
      let c = u > 0.8 ? p : i === 0 && w > 1 ? G : j;
      if (u > 0.55 && i === w - 1 && w > 1) c = p;
      if ((k + i) % 3 === 2 && u < 0.8) c = j;
      set(buf, x0 + i, y + k, c);
    }
  }
}

// The three blossom trees. crown/backTones/bark: palette keys darkest -> brightest; back, front:
// blobs [dx from the middle, y, rx, ry]; limbs: [x0, y0, x1, y1, w0, w1]; tassels: [dx, y, length].
const PINK = {
  crown: 'qpPi', speck: 'z', leaf: 'E', bark: 'hmb', fork: 30,
  back: [[0, 12, 13, 8.5], [-10, 17, 6, 5], [10, 17, 6, 5]],
  limbs: [[0, 31, -9, 20, 3, 1], [0, 31, 9, 19, 3, 1], [0, 30, -2, 16, 2, 1], [-6, 25, -12, 22, 1, 1], [6, 25, 12, 23, 1, 1]],
  front: [[-7, 6, 6, 4.5], [4, 5, 6.5, 4.5], [11, 10, 5, 4], [-12, 11, 5, 4], [-1, 11, 6, 4.5], [7, 14, 5.5, 4], [-8, 15, 5.5, 4], [-14, 18, 3.5, 3], [14, 17, 3.5, 3], [-1, 18, 5, 3.5], [-9, 21, 4.5, 3.5], [9, 21, 4.5, 3.5]],
};
const WHITE = {
  crown: 'Pszw', backTones: 'vEe', speck: 'w', leaf: 'e', bark: 'mbB', fork: 30, leafy: 0, backLift: -0.15,
  back: [[0, 13, 13, 10], [-9, 18, 7, 6], [9, 18, 7, 6]],
  limbs: [[0, 31, -8, 20, 3, 1], [0, 31, 8, 20, 3, 1], [0, 30, 1, 15, 2, 1]],
  front: [[-6, 5, 4.5, 3.5], [3, 4, 5, 3.5], [10, 8, 4, 3.5], [-11, 10, 4, 3.5], [-2, 10, 4.5, 3.5], [6, 13, 4.5, 3.5], [-8, 15, 4.5, 3.5], [13, 15, 3.5, 3], [-14, 17, 3, 2.5], [1, 17, 4, 3], [-10, 21, 3.5, 2.5], [9, 20, 4, 3]],
};
const LILAC = {
  crown: 'qpjG', backTones: 'vEe', backLift: -0.15, speck: 'z', leaf: 'E', bark: 'haA', fork: 30, lift: -0.2, raceme: 'qpjG',
  back: [[0, 11, 14, 8], [-10, 15, 7, 5.5], [10, 15, 7, 5.5]],
  limbs: [[0, 31, -9, 18, 3, 1], [0, 31, 9, 18, 3, 1], [0, 30, 0, 14, 2, 1]],
  front: [[-7, 6, 6, 4.5], [4, 5, 6.5, 4.5], [12, 10, 5, 4.5], [-12, 11, 5, 4.5], [-2, 11, 6, 4.5], [7, 15, 5.5, 4], [-7, 15, 5.5, 4]],
  tassels: [[-14, 15, 6], [-10, 18, 8], [-5, 19, 6], [-1, 17, 9], [4, 19, 7], [9, 18, 9], [13, 15, 6], [-7, 13, 5], [6, 12, 5]],
};

// ---- Giant mushrooms ---------------------------------------------------------------------------
// Warts as flakes: a lit, b mid, c shaded (a tone darker again on the cap's shaded side).
const WART = { s: ['b'], p: ['ab'], m: ['ab', 'bc'], l: ['.ab', 'abc'], x: ['ab.', 'abb', '.bc'] };

// A mushroom: a stem swelling to a bulb at its foot (a skirt under the gills if o.skirt), the
// gills a flat band under the rim, the cap a dome lit from the top left whose margin curls under,
// its warts or spots on it; grass and a little one at its foot.
function genShroom(seed, o) {
  const rng = mulberry32(seed);
  const { W, H } = o;
  const buf = makeBuf(W, H);
  const cap = tones(o.cap), stem = tones(o.stem), gill = tones(o.gill), spot = tones(o.spots);
  const ccx = W / 2 + (o.lean || 0);
  const cy0 = o.top + o.ry; // the cap's centre: its rim lies 0.4 ry below
  const rim = Math.round(cy0 + 0.4 * o.ry);
  const rimHalf = o.rx * Math.sqrt(1 - 0.16);
  for (let y = rim; y <= rim + o.gd; y++) {
    for (let x = Math.floor(ccx - rimHalf); x <= ccx + rimHalf; x++) {
      const nx = (x + 0.5 - ccx) / (rimHalf - 0.5), ny = (y + 0.5 - rim) / (o.gd + 0.5);
      if (nx * nx + ny * ny > 1) continue;
      const line = Math.round((x + 0.5 - ccx) * 0.9) % 2 === 0;
      const lum = 0.55 - nx * 0.3 - ny * 0.3 + bayer(x, y) * 0.2 - (line ? 0.25 : 0);
      set(buf, x, y, gill[clampT(lum, gill.length)]);
    }
  }
  const stemAt = (y) => {
    const t = (y - rim) / (H - 1 - rim);
    return [ccx + (W / 2 - ccx) * t + Math.sin(t * Math.PI) * (o.bow || 0), o.stem0 / 2 + ((o.stem1 - o.stem0) / 2) * t + (t > 0.8 ? (t - 0.8) * o.bulb : 0)];
  };
  for (let y = rim; y < H; y++) {
    const [mid, half] = stemAt(y);
    for (let x = Math.floor(mid - half); x < Math.ceil(mid + half); x++) {
      const u = (x + 0.5 - mid) / half;
      const lum = 0.62 - u * 0.42 + bayer(x, y) * 0.3 - (y < rim + o.gd + 2 ? 0.35 : 0);
      set(buf, x, y, stem[clampT(lum, stem.length)]);
    }
  }
  if (o.skirt) {
    const y = rim + o.skirt, [mid, half] = stemAt(y);
    for (let x = Math.floor(mid - half - 1.2); x < Math.ceil(mid + half + 1.2); x++) {
      set(buf, x, y, stem[x < mid ? 3 : 2]);
      set(buf, x, y + 1, stem[x < mid - 1 ? 2 : 1]);
    }
  }
  for (let y = o.top; y <= rim; y++) {
    for (let x = Math.floor(ccx - o.rx - 1); x <= ccx + o.rx + 1; x++) {
      const nx = (x + 0.5 - ccx) / o.rx, ny = (y + 0.5 - cy0) / o.ry;
      const d2 = nx * nx + ny * ny;
      if (d2 > 1) continue;
      const nz = Math.sqrt(Math.max(0, 1 - d2));
      let lum = (nx * LX + ny * LY + nz * LZ) * 0.5 + 0.5 + bayer(x, y) * 0.26 + (o.capLift || 0);
      if (rng() < 0.06) lum += (rng() - 0.5) * 0.4;
      const lip = y === rim || d2 > 0.86;
      set(buf, x, y, lip && ny > 0.1 ? cap[0] : cap[clampT(lum, cap.length)]);
    }
  }
  for (const [sx, sy, shape] of o.warts) {
    const px = Math.round(ccx + sx * o.rx), py = Math.round(cy0 + sy * o.ry), dark = sx > 0.35 ? 1 : 0;
    WART[shape].forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch === '.') return;
      const x = px + i, y = py + j, nx = (x + 0.5 - ccx) / o.rx, ny = (y + 0.5 - cy0) / o.ry;
      if (nx * nx + ny * ny > 0.9 || y >= rim) return;
      set(buf, x, y, spot[{ a: 3, b: 2, c: 1 }[ch] - dark]);
    }));
  }
  if (o.baby) stamp(buf, o.baby, o.babyAt[0], H - o.baby.length - o.babyAt[1]);
  if (o.grass) stamp(buf, o.grass, Math.round(W / 2 - o.grass[0].length / 2), H - o.grass.length);
  return buf;
}

const RED_SHROOM = {
  W: 26, H: 42, top: 2, rx: 12.5, ry: 10, gd: 3, lean: 0.5, bow: 0.8, stem0: 5, stem1: 6, bulb: 12, skirt: 6,
  cap: 'mRri', stem: 'StTz', gill: 'StT', spots: 'ZGzw',
  warts: [[-0.6, -0.6, 'l'], [-0.05, -0.85, 'm'], [0.45, -0.55, 'x'], [-0.25, -0.3, 'p'], [-0.85, -0.12, 'm'], [0.2, -0.1, 's'], [0.7, -0.05, 'p'], [-0.45, 0.05, 's'], [0.1, -0.55, 's']],
  baby: ['.rr.', 'rrrR', '.TS.', '.tS.'], babyAt: [18, 0],
  grass: ['..L.....L..', '.LeL...eLe.', 'LeEeL.eEeEe'],
};
const VIOLET_SHROOM = {
  W: 26, H: 44, top: 3, rx: 13, ry: 7.5, gd: 3, lean: -1, bow: -1.2, stem0: 4, stem1: 6, bulb: 10, skirt: 0,
  cap: 'qpjP', stem: 'StTz', gill: 'pjG', spots: 'uUcX',
  warts: [[-0.6, -0.45, 'm'], [0.0, -0.7, 'p'], [0.45, -0.4, 'm'], [-0.2, -0.1, 's'], [0.75, 0.0, 's'], [-0.85, -0.05, 'p'], [0.25, -0.05, 'p']],
  baby: ['.jj.', 'jjjp', '.TS.'], babyAt: [3, 0],
  grass: ['.L......L.', 'LeL...LeLe', 'eEeE.eEeEe'],
};
const TOADSTOOL = {
  W: 13, H: 12, top: 0, rx: 6, ry: 3.4, gd: 1, lean: -0.5, bow: 0, stem0: 3, stem1: 4, bulb: 7, skirt: 0,
  cap: 'ROoy', stem: 'StTz', gill: 'StT', spots: 'tTzw',
  warts: [[-0.55, -0.6, 'p'], [0.1, -0.85, 's'], [0.45, -0.35, 'm'], [-0.2, -0.2, 's']],
  grass: ['.L...', 'LeL.e'],
};
const TOADLING = {
  W: 7, H: 7, top: 0, rx: 3.2, ry: 2, gd: 0, lean: 0.5, bow: 0, stem0: 2, stem1: 2, bulb: 4, skirt: 0,
  cap: 'ROoy', stem: 'StTz', gill: 'StT', spots: 'tTzw',
  warts: [[-0.4, -0.7, 'p'], [0.35, -0.3, 's']],
  grass: ['.e.L', 'eLeE'],
};
// A big toadstool with a little one at its side, so the patch reads as ground and never as a
// Myconid (the meadow's mushroom-man, a cap on legs about this size).
function genToadstools() {
  const buf = makeBuf(17, 12);
  blit(buf, genShroom(3, TOADSTOOL), 0, 0);
  blit(buf, genShroom(11, TOADLING), 10, 5);
  return buf;
}

// ---- Old trees wound with vines ----------------------------------------------------------------
// An old tree long dead, its wood bleached silver and its limbs grown as the Darkwood's dead trees
// grow theirs (procgen.js genDeadTree), its twigs bare but for a leaf or two, that a flowering vine
// has climbed: wound round the trunk and the main limbs (o.wrap deep and more), strands of it
// hanging from the flatter limbs, its flowers open all along it.
function genVineTree(seed, o) {
  const rng = mulberry32(seed);
  const W = 30, H = 40, buf = makeBuf(W, H), cx = W / 2;
  const wood = tones(o.wood), fl = tones(o.flowers);
  const segs = [];
  const branch = (x, y, ang, len, w, depth) => {
    const x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len;
    segs.push({ x0: x, y0: y, x1, y1, w, depth, ang });
    if (depth <= 0 || len < 3) return;
    const n = depth > 2 ? 2 : rng.int(1, 2);
    for (let i = 0; i < n; i++) branch(x1, y1, ang + rng.range(-0.9, 0.9), len * rng.range(0.55, 0.75), w * 0.6, depth - 1);
  };
  branch(cx, H - 1, -Math.PI / 2 + rng.range(-0.08, 0.08), 14, 6, 4);
  branch(cx - 1, H - 11, -Math.PI / 2 - 0.9, 8, 2.6, 2);
  branch(cx + 1, H - 14, -Math.PI / 2 + 0.8, 9, 2.6, 2);
  for (const s of segs) limb(buf, s.x0, s.y0, s.x1, s.y1, s.w, Math.max(1, s.w * 0.7), wood);
  for (const [dx, dy, t] of [[-5, 0, 2], [-4, 0, 2], [-4, -1, 2], [3, 0, 0], [4, 0, 0], [3, -1, 1]]) set(buf, cx + dx, H - 1 + dy, wood[t]); // roots
  const isWood = (x, y) => wood.includes(get(buf, x, y));
  const blooms = [];
  // The vine wound round the trunk and the main limbs: drawn where it passes in front of the
  // wood, lit on the side that faces the light, a leaf standing out where it turns round an edge.
  for (const s of segs) {
    if (s.depth < (o.wrap ?? 2)) continue;
    const len = Math.hypot(s.x1 - s.x0, s.y1 - s.y0), ux = (s.x1 - s.x0) / len, uy = (s.y1 - s.y0) / len;
    const nx = -uy, ny = ux, toLight = nx * LX + ny * LY, phase = rng() * 6.283;
    const pitch = s.depth > 3 ? o.pitch : o.pitch * 0.7;
    let leafAt = -9, bloomAt = -9;
    for (let d = 0; d <= len; d += 0.3) {
      const w = s.w * (1 - 0.3 * (d / len)), a = (d / pitch) * 6.283 + phase, sn = Math.sin(a), cs = Math.cos(a);
      if (cs < -0.2) continue; // behind the wood
      const x = s.x0 + ux * d + nx * sn * (w / 2 - 0.2), y = s.y0 + uy * d + ny * sn * (w / 2 - 0.2);
      const lit = sn * toLight > 0;
      set(buf, x, y, cs > 0.55 ? pal.e : lit ? pal.L : pal.E);
      if (Math.abs(sn) > 0.9 && d - leafAt > 2.2) {
        const ex = x + nx * Math.sign(sn) * 1.3, ey = y + ny * Math.sign(sn) * 1.3;
        set(buf, ex, ey, lit ? pal.L : pal.e);
        set(buf, ex - ux, ey - uy, lit ? pal.e : pal.E);
        leafAt = d;
      }
      if (cs > 0.85 && d - bloomAt > 3 && rng() < o.bloom) {
        blooms.push([Math.round(x), Math.round(y)]);
        bloomAt = d;
      }
    }
  }
  // a few leaves at the tips of the bare twigs
  for (const s of segs) {
    if (s.depth > 1 || rng() > o.tufts) continue;
    const x = Math.round(s.x1), y = Math.round(s.y1);
    set(buf, x - 1, y, pal.e);
    set(buf, x + 1, y, pal.E);
    set(buf, x, y - 1, pal.L);
    set(buf, x, y + 1, pal.E);
  }
  // strands hanging from the flatter limbs, a flower at each end
  for (const s of segs) {
    if (s.depth < 1 || s.depth > 2 || Math.abs(Math.sin(s.ang)) > 0.8) continue;
    for (let n = rng.int(1, 2); n > 0; n--) {
      if (rng() > o.hang) continue;
      const t = rng.range(0.25, 0.85), x = Math.round(s.x0 + (s.x1 - s.x0) * t);
      let y = Math.round(s.y0 + (s.y1 - s.y0) * t);
      while (isWood(x, y)) y++;
      const len = rng.int(4, 9);
      for (let k = 0; k < len; k++) {
        set(buf, x, y + k, k % 2 ? pal.e : pal.E);
        if (k % 2 === 1 && k < len - 1) set(buf, x + (k % 4 === 1 ? 1 : -1), y + k, k % 4 === 1 ? pal.E : pal.L);
      }
      blooms.push([x, y + len]);
    }
  }
  // its flowers: the first o.big wide open, the rest in pairs
  blooms.forEach(([x, y], i) => {
    if (i < o.big) {
      set(buf, x, y - 1, fl[0]);
      set(buf, x - 1, y, fl[0]);
      set(buf, x + 1, y, fl[1]);
      set(buf, x, y + 1, fl[1]);
      set(buf, x, y, fl[2]);
    } else {
      set(buf, x, y, fl[0]);
      set(buf, x + 1, y, fl[1]);
    }
  });
  return buf;
}

// ---- Flowering bushes --------------------------------------------------------------------------
// A bush as the Darkwood's (procgen.js genBush), its blossoms in clusters of four, lit at their
// top left, never on its rim so the outline keeps its line.
function genBloomBush(seed, o) {
  const rng = mulberry32(seed);
  const W = 18, H = 12, buf = makeBuf(W, H);
  const blobs = [];
  for (let i = 0; i < 4; i++) {
    const r = rng.range(3.5, 5);
    blobs.push({ x: 4 + i * 3.4 + rng.range(-1, 1), y: H - r - rng.range(0, 2), rx: r, ry: r * 0.85, lobes: 6, phase: rng() * 6 });
  }
  blobs.sort((a, b) => a.y - b.y);
  paintBlobs(buf, blobs, tones('vEeL'), rng, { wobble: 0.12, speckle: 0.08, lift: -0.05 });
  const fl = tones(o.flowers);
  const placed = [];
  for (let tries = 0; placed.length < o.n && tries < 300; tries++) {
    const x = rng.int(2, W - 4), y = rng.int(1, H - 4);
    if (!get(buf, x - 1, y) || !get(buf, x + 2, y + 1) || !get(buf, x, y - 1) || !get(buf, x + 1, y + 2)) continue;
    if (placed.some(([a, b]) => Math.abs(a - x) < 3 && Math.abs(b - y) < 3)) continue;
    placed.push([x, y]);
    set(buf, x, y, fl[2]);
    set(buf, x + 1, y, fl[1]);
    set(buf, x, y + 1, fl[1]);
    set(buf, x + 1, y + 1, fl[0]);
  }
  return buf;
}

// ---- Mossy stones with flowers -----------------------------------------------------------------
// A stone as the Darkwood's (genRock), its top grown over with a thick moss, and flowers standing
// up out of the moss on short stems.
function genBloomRock(seed, size, o) {
  const rng = mulberry32(seed);
  const W = Math.round(12 * size + 2), H = Math.round(9 * size + 2) + 2;
  const buf = makeBuf(W, H);
  const blobs = [];
  const n = size > 1.2 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const r = rng.range(3.2, 4.6) * size;
    blobs.push({ x: W / 2 + (i - (n - 1) / 2) * 3.5 * size, y: H - r * 0.8 - 0.5, rx: r, ry: r * 0.78, lobes: 3, phase: rng() * 6 });
  }
  blobs.sort((a, b) => a.y - b.y);
  paintBlobs(buf, blobs, tones('KnNg'), rng, { wobble: 0.06, dither: 0.22, separator: pal.K });
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!get(buf, x, y)) continue;
      const a1 = get(buf, x, y - 1), a2 = get(buf, x, y - 2), a3 = get(buf, x, y - 3);
      const west = x < W * o.mossW;
      if (!a1 && rng() < 0.92) set(buf, x, y, rng() < (west ? 0.6 : 0.35) ? pal.L : pal.e);
      else if (!a2 && rng() < 0.85) set(buf, x, y, rng() < 0.55 ? pal.e : pal.E);
      else if (!a3 && west && rng() < o.moss) set(buf, x, y, pal.E);
    }
  }
  const fl = tones(o.flowers);
  for (const [fx, k] of o.tufts) {
    const x = Math.round(fx * (W - 1));
    let y = 0;
    while (y < H && !get(buf, x, y)) y++;
    if (y >= H - 2) continue;
    set(buf, x, y - 1, pal.e);
    set(buf, x, y - 2, fl[k]);
    if (k === 0) set(buf, x + 1, y - 2, fl[1]);
  }
  return buf;
}

// ---- Giant flowers -----------------------------------------------------------------------------
// A sunflower near as tall as the hero, its face to the light: the seed disc dithered dark to
// light from the bottom right, the petals scalloped round it.
function genSunflower() {
  const W = 13, H = 23, buf = makeBuf(W, H);
  stamp(buf, [
    '.....eE......',
    '.....eE......',
    '..LLeeE......',
    '.LeeEeE......',
    '..EE.eE......',
    '.....eEeLL...',
    '.....eEEeeL..',
    '.....eE.EE...',
    '.....eE......',
    '....eeEE.....',
    '...eEeEeE....',
  ], 0, 12);
  const cx = 6.5, cy = 6.5, R = 6.4;
  for (let y = 0; y < 13; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const wave = Math.cos(a * 11 + 0.4);
      if (d > R * (0.8 + 0.2 * wave)) continue;
      const lit = -(dx * 0.5 + dy * 0.72) / R;
      if (d < R * 0.42) {
        const lum = 0.45 + lit * 0.6 + bayer(x, y) * 0.45;
        set(buf, x, y, lum > 0.74 ? pal.B : lum > 0.4 ? pal.b : pal.m);
      } else {
        const lum = 0.55 + lit * 0.45 + bayer(x, y) * 0.25 - (wave < -0.3 ? 0.22 : 0);
        set(buf, x, y, lum > 0.6 ? pal.Y : lum > 0.32 ? pal.y : pal.o);
      }
    }
  }
  return buf;
}

// ---- The crypt, overgrown -----------------------------------------------------------------------
// props.js's crypt as drawn (open, then sealed), and what grows over it: '.' leaves the stone be.
const CRYPT = [
  [
    '...........kkkk...........',
    '.........kkNGGNkk.........',
    '.......kkNGGggGGNkk.......',
    '.....kkNGGggzzggGGNkk.....',
    '...kkNGGggggzzggggGGNkk...',
    '.kkNGGggggggggggggggGGNkk.',
    'kNNeNNNNNNNNNNNNNNNNNNeNNk',
    'knnnnnnnnnnnnnnnnnnnnnnnnk',
    '.kGgNkggggggggggggggkGgNk.',
    '.kGgNkgggggkkkkgggggkGgNk.',
    '.kGgNkggggkhhhhkggggkGgNk.',
    '.kGgNkgggkhhhhhhkgggkGgNk.',
    '.kGgNkggkhhhhhhhhkggkGgNk.',
    '.kGgNkggkhhhhhhhhkggkGgNk.',
    '.kGgNkNNkhhhhhhhhkNNkGgNk.',
    '.kGgNkggkhhhhhhhhkggkGgNk.',
    '.kGgNkggkhhhhhhhhkggkGgNk.',
    '.kGgNkggkhhhhhhhhkggkGgNk.',
    '.kGgNkNNkhhhhhhhhkNNkGgNk.',
    '.kGgNkggkhhhhhhhhkggkGgNk.',
    '.kGgNkggkhhhhhhhhkggkGgNk.',
    '.kGeNkggkqqqqqqqqkggkGgNk.',
    '.keENkggkjjjjjjjjkggkGeNk.',
    '.kEENkgekqqqqqqqqkegkeENk.',
    'kNNNNNNNkjjjjjjjjkNNNNNNNk',
    'kGGGGGGGGGGGGGGGGGGGGGGGGk',
    'kggeggggggggggggggggggeggk',
    'kNNNNNNNNNNNNNNNNNNNNNNNNk',
    '.kkkkkkkkkkkkkkkkkkkkkkkk.',
  ],
  [
    '...........kkkk...........',
    '.........kkNGGNkk.........',
    '.......kkNGGggGGNkk.......',
    '.....kkNGGggzzggGGNkk.....',
    '...kkNGGggggzzggggGGNkk...',
    '.kkNGGggggggggggggggGGNkk.',
    'kNNeNNNNNNNNNNNNNNNNNNeNNk',
    'knnnnnnnnnnnnnnnnnnnnnnnnk',
    '.kGgNkggggggggggggggkGgNk.',
    '.kGgNkgggggkkkkgggggkGgNk.',
    '.kGgNkggggkNNNNkggggkGgNk.',
    '.kGgNkgggkNnnnnNkgggkGgNk.',
    '.kGgNkggkNnnnnnnNkggkGgNk.',
    '.kGgNkggkNnnggnnNkggkGgNk.',
    '.kGgNkNNkNnnggnnNkNNkGgNk.',
    '.kGgNkggkNggggggNkggkGgNk.',
    '.kGgNkggkNnnggnnNkggkGgNk.',
    '.kGgNkggkNnnggnnNkggkGgNk.',
    '.kGgNkNNkNnnggnnNkNNkGgNk.',
    '.kGgNkggkNnnggnnNkggkGgNk.',
    '.kGgNkggkNnnnnnnNkggkGgNk.',
    '.kGeNkggkNnnnnnnNkggkGgNk.',
    '.keENkggkNnnnnnnNkggkGeNk.',
    '.kEENkgekNNNNNNNNkegkeENk.',
    'kNNNNNNNkNNNNNNNNkNNNNNNNk',
    'kGGGGGGGGGGGGGGGGGGGGGGGGk',
    'kggeggggggggggggggggggeggk',
    'kNNNNNNNNNNNNNNNNNNNNNNNNk',
    '.kkkkkkkkkkkkkkkkkkkkkkkk.',
  ],
];
const IVY = [
  '..........................',
  '............L.............',
  '..........Le....e.........',
  '........eLi......eE.......',
  '......LLe..........eE.....',
  '....eLY.............Ee....',
  '.eLeiE...........eLeE.....',
  '.EeLeE............ezE.....',
  '..Le.................eE...',
  '..Ye.................e....',
  '...e.................E....',
  '...E......................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '...e......................',
  '..Le.................e....',
  '..eiE................e....',
  '..LeE................ze...',
  '..eYe..e.............Le...',
  '..eLe................LeE..',
  '..........................',
  '..........................',
  '.L.....................e..',
  '.eLi..................Yee.',
  '.EeE.................eEeE.',
  '..........................',
];
// The ink edge, the dark doorway and the glowing stairs are left as they are: only stone grows over.
const overgrow = (rows) => rows.map((row, y) => [...row].map((c, x) => (IVY[y][x] !== '.' && !'.khqj'.includes(c) ? IVY[y][x] : c)).join(''));

// ---- The meadow's sprites ---------------------------------------------------------------------
export const FLORA_MEADOW = {
  bloom_tree1: { gen: () => [genBlossom(3, PINK)] },
  bloom_tree2: { gen: () => [genBlossom(17, WHITE)] },
  bloom_tree3: { gen: () => [genBlossom(42, LILAC)] },
  bloom_shroom1: { gen: () => [genShroom(5, RED_SHROOM)] },
  bloom_shroom2: { emissive: 'cX', gen: () => [genShroom(23, VIOLET_SHROOM)] },
  bloom_vine1: { gen: () => [genVineTree(58, { wood: 'aAZ', flowers: 'iPY', wrap: 3, pitch: 8, bloom: 0.5, tufts: 0.5, hang: 0.8, big: 3 })] },
  bloom_vine2: { gen: () => [genVineTree(63, { wood: 'aAZ', flowers: 'zTY', wrap: 3, pitch: 8, bloom: 0.9, tufts: 0.6, hang: 1, big: 3 })] },
  bloom_bush1: { gen: () => [genBloomBush(2, { flowers: 'Pis', n: 5 })] },
  bloom_bush2: { gen: () => [genBloomBush(9, { flowers: 'yYz', n: 5 })] },
  bloom_rock1: { gen: () => [genBloomRock(4, 1, { flowers: 'YyiP', tufts: [[0.3, 0], [0.7, 2]], moss: 0.3, mossW: 0.6 })] },
  bloom_rock2: { gen: () => [genBloomRock(8, 1.6, { flowers: 'YyiPz', tufts: [[0.2, 2], [0.45, 0], [0.75, 4], [0.85, 2]], moss: 0.5, mossW: 0.7 })] },
  bloom_rock3: { gen: () => [genBloomRock(15, 0.7, { flowers: 'iP', tufts: [[0.4, 0]], moss: 0.2, mossW: 0.5 })] },
  bloom_toadstool: { gen: () => [genToadstools()] },
  bloom_flower1: { gen: () => [genSunflower()] },
  bloom_flower2: { frames: [[
    '.....r.r.R...',
    '.....irrrR...',
    '.....irrRR...',
    '.....irrRR...',
    '......rRR....',
    '.Y.Y.y.e.....',
    '.zYYYy.e.....',
    '.zYYyy.ei.i.P',
    '.YYyyo.esiiPP',
    '..yyo..esiiPP',
    '...e...eiiPPp',
    '...e...e.PPp.',
    '...e...e..e..',
    '..Le.LLe.Le..',
    '.LeeLeeEeeEE.',
    '..EeEEeEEeE..',
  ]] },
  bloom_flower3: { thin: '2', frames: [[
    '.....222......',
    '....2...2.....',
    '....2..GUu....',
    '...2...UUu.22.',
    '...2...U.u2..2',
    '..GUu.....2.GU',
    '..UUu.....2.UU',
    '..U.u..22.2.U.',
    '...2..2..22...',
    '...2..2.GUu...',
    '...2..2.UUu...',
    '...2..2.U.u...',
    '...2..2...2...',
    '.L.2.L2...2L..',
    'LeL2LeEL.LeEL.',
    'eEeLeEeEeLeEeL',
    '.EeEeEeEeEeEe.',
  ]] },
  bloom_statue: { frames: [[
    '.....PiYzi......',
    '....eGGGggL.....',
    '....YGGgggz.....',
    '.....GGggN......',
    '.....GgggN......',
    '......ggN.......',
    '......gNn.......',
    '....NGGggNN.....',
    '...GGGgggggN....',
    '..GGgGggggNnN...',
    '..Gg.GgggggNn...',
    '..Gg.GggggN.n...',
    '..gg.GggggN.n...',
    '..ggGGiYzeNnn...',
    '...gGePiPeNn....',
    '....GggLggNn....',
    '....GgNgggNn....',
    '....GgNggNNn....',
    '...GGgNgggNnn...',
    '...GggNggNNen...',
    '..GGggNgggNNEn..',
    '.LNNNNNNNNNNNeN.',
    '.eGGGGGgggggNnE.',
    'LiEgggggggggNNe.',
    'eELNNNNNNNNNNNEe',
  ]] },
  crypt_meadow: { emissive: 'j', frames: CRYPT.map(overgrow) },
};
