// Pictures drawn in code for the menus: the trial cards' scenes, and the hero
// screen's portrait frame. Pixel art at native size, drawn by the menus at whole-number scales.

import { SPR } from '../engine/sprites.js';
import { makeCanvas } from '../engine/util.js';
import { bounds, hexPack, unpack } from '../engine/pixels.js';

// The trial cards' scenes, 64 × 44 art pixels each: the night's forest at dusk under a crescent,
// the Dungeon's stairs going down into torchlight, Ranked's blood moon over the graves (the
// gravestone of round 4 in front). Locked, the same in shadow.
// Survival's is the map it is played on (data/maps.js; the owner's five maps of 28 October 2026:
// "the desert map ... a frozen, you know, snowy map ... a bright flower, colorful map ... a dark,
// hellish, demonic map"): the Sunscorch's sun high over a pyramid and the Frostfell's cold sun
// over the ice peaks, both by day since the owner's word of the same day (sunscorch, below), the
// Bloomvale's blossom at twilight, the Abyss's black sun over a river of fire. The Darkwood (map
// 'forest', or none: the tests, an older caller) is the dusk it always was, the very same picture.
// The Dungeon and Ranked keep theirs whatever map is chosen.
export const SCENE = { w: 64, h: 44 };
const cache = new Map();

export function trialScene(mode, open, map) {
  const own = mode === 's15' && Object.hasOwn(MAP_SCENES, map ?? '') ? map : null;
  const key = mode + (own ? ':' + own : '') + (open ? '' : ':locked');
  if (cache.has(key)) return cache.get(key);
  const c = makeCanvas(SCENE.w, SCENE.h), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  (mode === 'dungeon' ? stairs : mode === 'ranked' ? bloodMoon : own ? MAP_SCENES[own] : dusk)(x, SCENE.w, SCENE.h);
  if (!open) {
    // In shadow: the picture all but gone, its shapes still there.
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(14,10,22,0.82)';
    x.fillRect(0, 0, SCENE.w, SCENE.h);
    x.globalCompositeOperation = 'source-over';
  }
  cache.set(key, c);
  return c;
}

// Horizontal bands of colour, top to bottom, over [y0, y1).
function bands(x, w, y0, y1, cols) {
  const n = cols.length;
  for (let i = 0; i < n; i++) {
    x.fillStyle = cols[i];
    const a = y0 + Math.round(((y1 - y0) * i) / n), b = y0 + Math.round(((y1 - y0) * (i + 1)) / n);
    x.fillRect(0, a, w, b - a);
  }
}

// A pine's silhouette: a stack of widening rows from its tip at (cx, top) down to its foot.
function pine(x, cx, top, h, col) {
  x.fillStyle = col;
  for (let r = 0; r < h; r++) {
    const half = Math.floor((r % 4) + r / 4);
    x.fillRect(cx - half, top + r, half * 2 + 1, 1);
  }
}

// A pixel disc (filled, or a crescent cut by a second disc).
function disc(x, cx, cy, r, col, cut = null) {
  x.fillStyle = col;
  for (let y = -r; y <= r; y++) {
    for (let xx = -r; xx <= r; xx++) {
      if (xx * xx + y * y > r * r + 1) continue;
      if (cut && (xx - cut[0]) ** 2 + (y - cut[1]) ** 2 <= r * r) continue;
      x.fillRect(cx + xx, cy + y, 1, 1);
    }
  }
}

function stars(x, w, h, col, seed) {
  x.fillStyle = col;
  let s = seed;
  for (let i = 0; i < 14; i++) {
    s = (s * 16807) % 2147483647;
    x.fillRect(s % w, Math.floor(s / w) % h, 1, 1);
  }
}

// Survival: dusk over the Darkwood under a crescent: far pines against the sunset, the road
// winding in to the crossroads, near pines framing it.
function dusk(x, w, h) {
  bands(x, w, 0, 30, ['#1b1530', '#2a1f45', '#3e2a52', '#68386c', '#b55088', '#d77643']);
  stars(x, w, 18, '#c0cbdc', 7);
  disc(x, 46, 8, 4, '#fff6c2', [2, -1]);
  for (const [cx, top, ph] of [[3, 20, 11], [12, 18, 13], [21, 21, 10], [42, 19, 12], [51, 21, 10], [60, 18, 13]]) pine(x, cx, top, ph, '#2a2238');
  x.fillStyle = '#151a24';
  x.fillRect(0, 30, w, h - 30);
  x.fillStyle = '#1d2b25';
  x.fillRect(0, 32, w, h - 32);
  // The road, winding toward us out of the trees, its edge lit by the sunset.
  for (let y = 30; y < h; y++) {
    const t = (y - 30) / (h - 31), half = Math.round(1 + t * t * 8 + t * 2), cx = 32 + Math.round(Math.sin(t * 2.6) * 5);
    x.fillStyle = '#3f3237';
    x.fillRect(cx - half, y, half * 2 + 1, 1);
    x.fillStyle = '#6b4f45';
    x.fillRect(cx - half, y, 1, 1);
  }
  // Near pines framing the road.
  for (const [cx, top, ph] of [[4, 6, 38], [14, 16, 28], [56, 9, 35], [64, 14, 30]]) pine(x, cx, top, ph, '#0d1016');
}

// A rolling crest (a dune, a drift, a meadow's swell) at about y0 down to the foot of the
// picture: amp and freq shape its wave, its top row in the crest colour; with `lit` and `shade`,
// its slopes falling to the right (toward the sun) lit and those rising in shadow, `deep` rows down.
function crest(x, w, h, y0, amp, freq, ph, body, top = null, lit = null, shade = null, deep = 2) {
  const at = (xx) => Math.round(y0 + Math.sin(xx * freq + ph) * amp + Math.sin(xx * freq * 2.3 + ph * 1.7) * amp * 0.35);
  for (let xx = 0; xx < w; xx++) {
    const y = at(xx), next = at(xx + 1);
    x.fillStyle = body;
    x.fillRect(xx, y, 1, h - y);
    if (lit && next > y) {
      x.fillStyle = lit;
      x.fillRect(xx, y, 1, deep + next - y);
    } else if (shade && next < y) {
      x.fillStyle = shade;
      x.fillRect(xx, y, 1, deep);
    }
    if (top) {
      x.fillStyle = top;
      x.fillRect(xx, y, 1, 1);
    }
  }
}

// A peak, or a tomb, seen from a corner: rows widening from its tip at (cx, tip) down to `foot`
// by `slope` px a row each side, its ridge leaning right by `lean` a row, the face left of the
// ridge in one colour and the face right of it in another. o.cap: its top rows in two colours of
// their own (capLeft, capRight); o.edge: its right edge catching the light; o.rough: notches.
function peak(x, cx, tip, foot, slope, lean, left, right, o = {}) {
  for (let r = 0; tip + r < foot; r++) {
    const a = Math.round(r * slope) + (o.rough && (r * 7 + cx) % 5 === 2 ? o.rough : 0), ridge = Math.min(cx + a, cx + Math.floor(r * lean)), y = tip + r;
    x.fillStyle = r < (o.cap || 0) ? o.capLeft : left;
    x.fillRect(cx - a, y, ridge - (cx - a) + 1, 1);
    x.fillStyle = r < (o.cap || 0) ? o.capRight : right;
    x.fillRect(ridge + 1, y, cx + a - ridge, 1);
    if (o.edge) {
      x.fillStyle = o.edge;
      x.fillRect(cx + a, y, 1, 1);
    }
  }
}

// A spire of rock from its foot up to a tip at (cx + lean, tip), chipped here and there, its edge
// toward the fire (side 1 right, -1 left) lit.
function shard(x, cx, tip, foot, half, lean, col, rim = null, side = 1) {
  const n = foot - tip;
  for (let r = 0; r < n; r++) {
    const t = r / (n - 1), c = cx + Math.round(lean * (1 - t)), a = Math.round(half * t ** 1.2 + ((r * 5 + cx) % 7 === 3 ? -1 : (r * 3 + cx) % 11 === 4 ? 1 : 0));
    x.fillStyle = col;
    x.fillRect(c - a, tip + r, a * 2 + 1, 1);
    if (rim) {
      x.fillStyle = rim;
      x.fillRect(side > 0 ? c + a : c - a, tip + r, 1, 1);
    }
  }
}

// A round hill's brow, half an ellipse standing on `base`, its top row lit.
function hill(x, cx, base, rx, ry, body, brow) {
  for (let xx = -rx; xx <= rx; xx++) {
    const hh = Math.round(Math.sqrt(1 - (xx / (rx + 0.5)) ** 2) * ry);
    x.fillStyle = body;
    x.fillRect(cx + xx, base - hh, 1, hh);
    x.fillStyle = brow;
    x.fillRect(cx + xx, base - hh, 1, 1);
  }
}

// A pine bowed under snow: the tree in `body`, each tier of branches `snow` along its top, `shade`
// on its right.
function snowPine(x, cx, top, h, body, snow, shade) {
  pine(x, cx, top, h, body);
  for (let r = 0; r < h; r += 4) {
    const half = Math.floor(r / 4);
    x.fillStyle = snow;
    x.fillRect(cx - half, top + r, half + 1, 1);
    x.fillRect(cx - half - 1, top + r + 1, 1, 1);
    x.fillStyle = shade;
    x.fillRect(cx + 1, top + r, half, 1);
  }
}

// Single pixels, [x, y] each, in one colour.
function dots(x, col, list) {
  x.fillStyle = col;
  for (const [px, py] of list) x.fillRect(px, py, 1, 1);
}

// The Sunscorch by day (the owner's, 28 October 2026: "we will have to only have to spend the
// night in the forest, make the desert and snow one be normal bright"): the sun high and white-hot
// in a clear blue sky over the dunes and the tombs, the dunes' crests and the slopes toward it
// lit, a saguaro green in the sun framing them and a skull bleaching in the sand.
function sunscorch(x, w, h) {
  bands(x, w, 0, 32, ['#2c6cc6', '#3a82d4', '#4f98de', '#6cb0e8', '#92c8ee', '#c4e0ec']);
  const g = x.createRadialGradient(44, 8, 4, 44, 8, 14);
  g.addColorStop(0, 'rgba(255,246,194,0.6)');
  g.addColorStop(1, 'rgba(255,246,194,0)');
  x.fillStyle = g;
  x.fillRect(30, 0, 28, 22);
  disc(x, 44, 8, 5, '#fee761');
  disc(x, 44, 8, 4, '#fff6c2');
  disc(x, 44, 8, 2, '#ffffff');
  // The tombs, a small one far off and a great one, the faces toward the sun lit, their edges
  // catching it.
  peak(x, 31, 21, 30, 0.8, 0.3, '#d8a868', '#f2d49a', { edge: '#fff2cc' });
  peak(x, 15, 12, 30, 0.8, 0.3, '#c88a4c', '#f0c47c', { edge: '#fff0c0' });
  crest(x, w, h, 29, 1.5, 0.07, 1.2, '#e6c48c', '#f6e2b4');
  crest(x, w, h, 33, 3, 0.085, 3.6, '#dcaa62', '#fbe6b0', '#f0c87e', '#c08a4c', 1);
  crest(x, w, h, 40, 3, 0.065, 0.9, '#c98f48', '#f6d08a', '#e2ac60', '#a26a34', 1);
  // A saguaro framing them, its sunward edges lit, its others in shade.
  x.fillStyle = '#3e8948';
  x.fillRect(56, 14, 4, 30);
  x.fillRect(57, 13, 2, 1);
  x.fillRect(51, 27, 5, 2);
  x.fillRect(51, 20, 2, 7);
  x.fillRect(60, 23, 3, 2);
  x.fillRect(61, 16, 2, 7);
  x.fillStyle = '#265c42';
  x.fillRect(59, 15, 1, 29);
  x.fillRect(52, 21, 1, 6);
  x.fillRect(62, 17, 1, 6);
  x.fillRect(51, 28, 5, 1);
  x.fillStyle = '#63c74d';
  x.fillRect(56, 15, 1, 12);
  x.fillRect(51, 21, 1, 6);
  x.fillRect(61, 17, 1, 6);
  // A skull bleaching on the dune, horns and all.
  dots(x, '#ffffff', [[7, 40], [13, 40], [8, 41], [9, 41], [10, 41], [11, 41], [12, 41], [9, 42], [11, 42], [10, 43]]);
  dots(x, '#733e39', [[10, 42]]);
}

// The Frostfell by day (the same word of the owner's): a pale cold sun in a clear blue sky over the
// ice peaks, the lake frozen at their feet, the snowfield and its drifts, pines bowed under snow
// framing it.
function frostfell(x, w, h) {
  bands(x, w, 0, 32, ['#3a74c8', '#4a8ad6', '#62a2e2', '#82bbec', '#a8d2f2', '#d0e8f6']);
  const g = x.createRadialGradient(18, 7, 3, 18, 7, 11);
  g.addColorStop(0, 'rgba(255,251,235,0.55)');
  g.addColorStop(1, 'rgba(255,251,235,0)');
  x.fillStyle = g;
  x.fillRect(7, 0, 22, 18);
  disc(x, 18, 7, 4, '#fff4cc');
  disc(x, 18, 7, 3, '#ffffff');
  // The ice peaks, lit from the left, snow on their heads.
  for (const [cx, tip, sl] of [[46, 17, 1], [6, 18, 1.1], [60, 19, 0.9], [25, 12, 0.95]]) peak(x, cx, tip, 30, sl, 0.25, '#c4d2ea', '#7488b8', { cap: 5, capLeft: '#ffffff', capRight: '#d4def0', rough: 1 });
  // The lake frozen at their feet, pale ice catching the sun, down under the snowfield's first
  // crest where it dips.
  x.fillStyle = '#9cc8e4';
  x.fillRect(0, 29, w, 7);
  for (const [lx, ly, n] of [[9, 30, 2], [17, 31, 1], [28, 30, 3], [36, 31, 2], [47, 30, 2], [55, 31, 1]]) {
    x.fillStyle = '#c8e6f6';
    x.fillRect(lx, ly, 1, n);
    x.fillStyle = '#ffffff';
    x.fillRect(lx, ly, 1, 1);
  }
  dots(x, '#ffffff', [[21, 30], [40, 32]]);
  // The snowfield, its drifts.
  crest(x, w, h, 34, 1, 0.12, 2, '#d0dbe9', '#f2f6fb');
  crest(x, w, h, 39, 1.6, 0.09, 4.5, '#e7eef7', '#ffffff');
  // Pines bowed under snow framing it.
  for (const [cx, top, ph] of [[4, 6, 38], [14, 16, 28], [56, 9, 35], [64, 14, 30]]) snowPine(x, cx, top, ph, '#265c42', '#ffffff', '#8aa2c4');
}

// The Bloomvale: twilight over the round hills, a path winding in through the flowers, trees in
// blossom framing it and the fireflies coming out.
function bloomvale(x, w, h) {
  bands(x, w, 0, 32, ['#2c3366', '#3f477e', '#6a5aa0', '#b0689a', '#e8889a', '#f6b08a']);
  stars(x, w, 12, '#ffffff', 2);
  dots(x, '#ffffff', [[45, 6], [44, 6], [46, 6], [45, 5], [45, 7]]);
  // Round hills far off, the last light on their brows, small trees in blossom on them.
  hill(x, 12, 31, 16, 7, '#3f3f76', '#5f5596');
  hill(x, 52, 31, 18, 8, '#3f3f76', '#5f5596');
  hill(x, 32, 32, 15, 5, '#33356a', '#4b4a86');
  for (const [tx, ty] of [[7, 25], [18, 26], [45, 25], [56, 24], [29, 28]]) {
    x.fillStyle = '#2c2240';
    x.fillRect(tx, ty + 1, 1, 2);
    x.fillStyle = '#b55088';
    x.fillRect(tx - 1, ty - 1, 3, 2);
    x.fillRect(tx, ty - 2, 1, 1);
    dots(x, '#f6757a', [[tx, ty - 2], [tx - 1, ty - 1]]);
  }
  // The meadow, its nearer swell lit, the path winding in.
  crest(x, w, h, 31, 0.8, 0.17, 2, '#265c42', '#3e8948');
  crest(x, w, h, 36, 1.5, 0.1, 5, '#3e8948', '#63c74d');
  for (let y = 31; y < h; y++) {
    const t = (y - 31) / (h - 32), half = Math.round(t * t * 6 + t * 2), cx = 32 + Math.round(Math.sin(t * 2.6 + 1) * 5);
    x.fillStyle = '#c28569';
    x.fillRect(cx - half, y, half * 2 + 1, 1);
    x.fillStyle = '#e4a672';
    x.fillRect(cx - half, y, 1, 1);
  }
  // Flowers.
  let s = 9;
  for (let i = 0; i < 40; i++) {
    s = (s * 16807) % 2147483647;
    dots(x, ['#f6757a', '#ffffff', '#fee761', '#8f5bb0'][i % 4], [[s % w, 32 + (Math.floor(s / w) % 12)]]);
  }
  // Trees in blossom framing the path.
  for (const [cx, cy, r, foot] of [[6, 12, 9, 40], [57, 18, 7, 38]]) {
    x.fillStyle = '#3e2731';
    x.fillRect(cx, cy, 2, foot - cy);
    disc(x, cx, cy, r, '#b55088');
    disc(x, cx - 2, cy - 2, r - 2, '#f6757a');
    dots(x, '#ffd0d8', [[cx - 4, cy - 4], [cx - 1, cy - 5], [cx - 5, cy - 1], [cx + 1, cy - 2]]);
  }
  // Fireflies.
  for (const [fx, fy] of [[20, 26], [41, 29], [48, 21], [15, 34], [37, 38], [26, 34]]) {
    dots(x, 'rgba(158,229,98,0.45)', [[fx - 1, fy], [fx + 1, fy], [fx, fy - 1], [fx, fy + 1]]);
    dots(x, '#fee761', [[fx, fy]]);
  }
}

// The Abyss: a black sun over the pit, spires of black rock, a river of fire winding in, embers.
function abyss(x, w, h) {
  bands(x, w, 0, 31, ['#120a10', '#24101c', '#3e1622', '#6a1a24', '#a22633', '#d04a2a']);
  // The black sun, its corona.
  const g = x.createRadialGradient(44, 10, 5, 44, 10, 15);
  g.addColorStop(0, 'rgba(247,118,34,0.6)');
  g.addColorStop(1, 'rgba(247,118,34,0)');
  x.fillStyle = g;
  x.fillRect(28, 0, 32, 26);
  disc(x, 44, 10, 6, '#feae34');
  disc(x, 44, 10, 5, '#0d0b14');
  // Spires far off against the glow.
  for (const [cx, tip, half, lean] of [[23, 16, 2, 2], [28, 21, 2, -1], [39, 18, 3, -2], [47, 21, 2, 1]]) shard(x, cx, tip, 31, half, lean, '#2a0e16');
  // The black ground, lit by a river of fire winding in across it.
  x.fillStyle = '#140a0e';
  x.fillRect(0, 29, w, h - 29);
  const lg = x.createRadialGradient(32, 40, 2, 32, 40, 22);
  lg.addColorStop(0, 'rgba(228,59,68,0.4)');
  lg.addColorStop(1, 'rgba(228,59,68,0)');
  x.fillStyle = lg;
  x.fillRect(0, 29, w, h - 29);
  for (let y = 29; y < h; y++) {
    const t = (y - 29) / (h - 30), half = Math.round(1 + t * t * 7 + t * 2), cx = 32 + Math.round(Math.sin(t * 2.8 + 0.6) * 5);
    x.fillStyle = '#a22633';
    x.fillRect(cx - half - 1, y, half * 2 + 3, 1);
    x.fillStyle = '#f77622';
    x.fillRect(cx - half, y, half * 2 + 1, 1);
    x.fillStyle = '#fee761';
    x.fillRect(cx - Math.floor(half / 3), y, Math.floor(half / 3) * 2 + 1, 1);
  }
  // Spires of black rock framing it, their edges toward the fire lit.
  shard(x, 5, 3, h, 6, -2, '#0a0608', '#a22633', 1);
  shard(x, 14, 18, h, 4, 3, '#0a0608', '#7a1f2a', 1);
  shard(x, 58, 6, h, 6, 2, '#0a0608', '#a22633', -1);
  shard(x, 50, 21, h, 4, -3, '#0a0608', '#7a1f2a', -1);
  // Embers rising.
  dots(x, '#feae34', [[24, 27], [40, 25], [35, 21], [28, 32], [44, 31]]);
  dots(x, '#f77622', [[20, 23], [47, 19], [37, 15]]);
}

const MAP_SCENES = { desert: sunscorch, frozen: frostfell, meadow: bloomvale, hell: abyss };

// The Dungeon: a stone hall, an arch, its stairs going down into torchlight.
function stairs(x, w, h) {
  x.fillStyle = '#0d0b14';
  x.fillRect(0, 0, w, h);
  // Stone courses.
  for (let y = 0; y < h; y += 5) {
    x.fillStyle = y % 10 ? '#262b44' : '#2b3150';
    x.fillRect(0, y, w, 4);
    x.fillStyle = '#181425';
    for (let bx = (y % 10 ? 3 : 8); bx < w; bx += 11) x.fillRect(bx, y, 1, 4);
  }
  // The arch and the dark beyond it.
  x.fillStyle = '#05040a';
  x.fillRect(20, 12, 24, h - 12);
  disc(x, 32, 13, 12, '#05040a');
  x.fillStyle = '#5a6988';
  for (let i = 0; i < 25; i++) {
    const a = Math.PI + (i / 24) * Math.PI;
    x.fillRect(Math.round(32 + Math.cos(a) * 13), Math.round(13 + Math.sin(a) * 13), 1, 1);
  }
  const st = SPR.stairs && SPR.stairs.frames[0].c;
  if (st) x.drawImage(st, Math.round(w / 2 - st.width / 2), h - st.height - 1);
  // Two torches, their light.
  for (const tx of [10, 53]) {
    const g = x.createRadialGradient(tx, 20, 1, tx, 20, 14);
    g.addColorStop(0, 'rgba(254,174,52,0.55)');
    g.addColorStop(1, 'rgba(254,174,52,0)');
    x.fillStyle = g;
    x.fillRect(tx - 14, 6, 28, 28);
    x.fillStyle = '#733e39';
    x.fillRect(tx, 21, 1, 6);
    x.fillStyle = '#f77622';
    x.fillRect(tx - 1, 18, 3, 3);
    x.fillStyle = '#fee761';
    x.fillRect(tx, 17, 1, 2);
  }
}

// Ranked: a blood moon over the graves, the round-4 gravestone in front.
function bloodMoon(x, w, h) {
  bands(x, w, 0, 32, ['#140c16', '#24101c', '#3e1622', '#5c1826', '#7a1f2a']);
  stars(x, w, 16, '#f6757a', 3);
  const g = x.createRadialGradient(46, 12, 2, 46, 12, 16);
  g.addColorStop(0, 'rgba(228,59,68,0.45)');
  g.addColorStop(1, 'rgba(228,59,68,0)');
  x.fillStyle = g;
  x.fillRect(28, 0, 36, 30);
  disc(x, 46, 12, 7, '#a22633');
  disc(x, 46, 12, 6, '#e43b44');
  x.fillStyle = '#f6757a';
  x.fillRect(43, 9, 2, 2);
  // Graves on the rise.
  x.fillStyle = '#0d0b14';
  x.fillRect(0, 30, w, h - 30);
  for (const [gx, gy, gw, gh] of [[4, 25, 5, 6], [12, 27, 4, 4], [52, 26, 5, 5], [59, 28, 3, 3]]) {
    x.fillRect(gx, gy, gw, gh);
    x.fillRect(gx + 1, gy - 1, gw - 2, 1);
  }
  x.fillStyle = '#1b1220';
  x.fillRect(0, 33, w, h - 33);
  const gr = SPR.ranked_grave && SPR.ranked_grave.frames[0].c;
  if (gr) x.drawImage(gr, Math.round(w / 2 - gr.width / 2 - 6), h - gr.height);
}

// ------------------------------------------------------------------ the portrait frame --

// A hero's standing sprite cut to what it covers (the union of its idle frames), for the hero
// cards and the portrait frame: the same source for all five, so they share one treatment.
// { list: [Frame], x, y, w, h }: the box inside each frame.
const crops = new Map();
export function heroCrop(spr) {
  if (crops.has(spr)) return crops.get(spr);
  const list = spr.idle ? spr.idle.map((i) => spr.frames[i]) : [spr.frames[0]];
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const f of list) {
    const b = bounds(f.buf);
    if (!b) continue;
    x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0);
    x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1);
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = list[0].w - 1; y1 = list[0].h - 1; }
  const out = { list, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  crops.set(spr, out);
  return out;
}

// Mix two '#rrggbb' colours into a third: t = 0 gives a, 1 gives b.
export function mix(a, b, t) {
  const A = unpack(hexPack(a)), B = unpack(hexPack(b));
  const [r, g, bl] = [0, 1, 2].map((i) => Math.round(A[i] + (B[i] - A[i]) * t));
  return '#' + [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// The portrait frame's backdrop, w × h UI pixels: the hero's colour as a glow in five flat tones
// (pixel art, dithered at the steps, not a smooth gradient), darkest at the edges, and a floor
// under him. A locked hero's is the same in slate.
export const PORTRAIT = { floor: 0.2, glowY: 0.46, tones: [0.22, 0.4, 0.56, 0.7, 0.84] };
const backdrops = new Map();
export function portraitBackdrop(w, h, color, locked = false) {
  const key = `${w}x${h}:${color}:${locked}`;
  if (backdrops.has(key)) return backdrops.get(key);
  const c = makeCanvas(w, h), x = c.getContext('2d');
  const base = locked ? '#5a6988' : color, dark = '#0d0b14';
  const tones = PORTRAIT.tones.map((t) => mix(base, dark, locked ? Math.min(1, t + 0.12) : t));
  const floorY = h - Math.max(4, Math.round(h * PORTRAIT.floor));
  const cx = w / 2, cy = h * PORTRAIT.glowY, rx = w * 0.62, ry = h * 0.6;
  const bayer = [0, 0.5, 0.75, 0.25];
  for (let y = 0; y < floorY; y++) {
    for (let xx = 0; xx < w; xx++) {
      const d = Math.hypot((xx + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      const i = Math.min(tones.length - 1, Math.floor(d * tones.length + bayer[(xx & 1) + (y & 1) * 2] - 0.5));
      x.fillStyle = tones[Math.max(0, i)];
      x.fillRect(xx, y, 1, 1);
    }
  }
  // The floor: a lit edge, then darker toward the front.
  x.fillStyle = tones[2];
  x.fillRect(0, floorY, w, 1);
  x.fillStyle = tones[3];
  x.fillRect(0, floorY + 1, w, h - floorY - 1);
  x.fillStyle = tones[4];
  x.fillRect(0, floorY + Math.ceil((h - floorY) / 2), w, h);
  backdrops.set(key, c);
  return c;
}

// A flat pixel ellipse (a ground shadow), centred on (cx, cy).
export function pixelEllipse(ctx, cx, cy, rx, ry, col) {
  ctx.fillStyle = col;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + 0.5)) ** 2)));
    if (half > 0) ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2, 1);
  }
}
