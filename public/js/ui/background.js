// Animated menu backdrop: moonlit sky, parallax pine silhouettes, drifting
// mist, and the heroes resting around a campfire.
// Behind the trial screen while Survival is the trial chosen, the land it will be spent in
// (o.biome: a map's look, data/maps.js, for the five maps the same word as the map's id; the
// owner's five maps of 28 October 2026: "the desert map ... a frozen, you know, snowy map ... a
// bright flower, colorful map ... a dark, hellish, demonic map"): the Sunscorch's dunes and tombs
// under the sun high in a blue sky, sand on the wind; the Frostfell's crags of ice and firs under
// snow in a cold sun, snow falling (both by day since the owner's word of the same day, at their
// THEMES below); the Bloomvale's round hills in blossom at twilight, petals on the breeze; the
// Abyss's spires of rock under the black sun, the fire glowing up from below and embers rising.
// Without one, or with 'forest' (the title, every other menu), it is the Darkwood it always was,
// pixel for pixel, the title's campfire and all.

import { SPR, idleFrame } from '../engine/sprites.js';
import { makeCanvas, mulberry32, clamp, rand, TAU, hexToRgb } from '../engine/util.js';

// The campfire's heroes in a ring round it: their sheet, how far across from the fire (left of
// it facing right, right of it facing left) and how far down from its base (up is beyond it),
// back to front: the Shadow straight behind the flames, the Sorcerer and Necromancer beyond
// it either side, the Knight and Ranger on this side.
const CAMP = [
  ['rogue', 0, -24],
  ['mage', -48, -16],
  ['necromancer', 48, -16],
  ['knight', -70, 6],
  ['archer', 70, 6],
];

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);

function gradientCanvas(W, H, stops) {
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const cols = stops.map((s) => [s[0], hexToRgb(s[1])]);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = clamp(y / H + BAYER[(y & 3) * 4 + (x & 3)] * 0.05, 0, 1);
      let i = 0;
      while (i < cols.length - 2 && cols[i + 1][0] < t) i++;
      const [t0, c0] = cols[i], [t1, c1] = cols[i + 1];
      const k = clamp((t - t0) / (t1 - t0), 0, 1);
      // Posterise into 6 steps per segment for a banded retro sky.
      const q = Math.round(k * 6) / 6;
      const o = (y * W + x) * 4;
      img.data[o] = c0[0] + (c1[0] - c0[0]) * q;
      img.data[o + 1] = c0[1] + (c1[1] - c0[1]) * q;
      img.data[o + 2] = c0[2] + (c1[2] - c0[2]) * q;
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function treeLayer(W, H, seed, base, height, color, density) {
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const rng = mulberry32(seed);
  g.fillStyle = color;
  g.fillRect(0, base, W, H - base);
  let x = -10;
  while (x < W + 10) {
    const h = height * (0.6 + rng() * 0.6);
    const w = h * (0.32 + rng() * 0.12);
    const top = base - h;
    for (let y = Math.floor(top); y < base; y++) {
      const t = (y - top) / h;
      const jag = (Math.floor((y - top) / 4) % 2) * 1.5;
      const hw = Math.max(0.5, (w / 2) * t + jag * t);
      // Draw wrapped so the strip tiles horizontally.
      for (const off of [0, -W, W]) g.fillRect(Math.round(x - hw + off), y, Math.round(hw * 2), 1);
    }
    x += w * density * (0.5 + rng());
  }
  return c;
}

// ------------------------------------------------------------------ the maps' lands --
// Each paints one parallax strip, W × H, as treeLayer does: solid below `base`, its shapes rising
// up to about `height` over it, tiling across (what runs off one edge comes in at the other). p is
// the layer's own entry in THEMES: its rim and lit faces, what stands on it.

// A rect drawn three times, the strip's width apart, so that the strip tiles.
function wrapRect(g, W, x, y, w, h) {
  g.fillRect(x, y, w, h);
  g.fillRect(x - W, y, w, h);
  g.fillRect(x + W, y, w, h);
}

// Rolling ground: dunes, or drifts of snow. A long swell with a quicker ripple on it, whole waves
// across the strip so that it tiles; its crest's top row in p.rim, deeper down the slopes that
// fall away toward the light (to the right). The far dunes drift up over the feet of the tombs
// (p.tombs); saguaros (p.cacti, green in the sun: p.cactus, body and lit edge) or firs under snow
// (p.firs, in p.fir under p.snow) stand on the near ones. What stands on them is sized by the
// height as the land is, but kept to a share of the width, so that a phone held upright
// (293 × 633) doesn't grow them wider than its screen.
function dunes(W, H, seed, base, height, color, density, p) {
  const c = makeCanvas(W, H), g = c.getContext('2d'), rng = mulberry32(seed);
  const k = Math.max(1, Math.round((W / (height * 9)) * density)), k2 = k * 3 + 1, p1 = rng() * TAU, p2 = rng() * TAU;
  const top = (x) => {
    const u = (TAU * x) / W;
    return Math.round(base - height * (0.55 + 0.3 * (Math.sin(k * u + p1) + 0.3 * Math.sin(2 * (k * u + p1))) + 0.12 * Math.sin(k2 * u + p2)));
  };
  for (let i = 0; i < (p.tombs || 0); i++) tombs(g, W, rng, ((i + 0.2 + rng() * 0.6) * W) / p.tombs, base, height, color, p.lit);
  for (let x = 0; x < W; x++) {
    const y = top(x), fall = top(x + 1) - y;
    g.fillStyle = color;
    g.fillRect(x, y, 1, H - y);
    g.fillStyle = p.rim;
    g.fillRect(x, y, 1, fall > 0 ? 2 + Math.min(2, fall) : 1);
  }
  for (let i = 0; i < (p.cacti || 0); i++) {
    const x = Math.round(((i + 0.15 + rng() * 0.7) * W) / p.cacti);
    saguaro(g, W, x, top(x) + 2, Math.round(Math.min(height * (0.8 + rng() * 0.4), W * 0.16)), p.cactus[0], p.cactus[1]);
  }
  for (let i = 0; i < (p.firs || 0); i++) {
    const x = Math.round(((i + 0.15 + rng() * 0.7) * W) / p.firs);
    fir(g, W, x, top(x) + 2, Math.round(Math.min(height * (2 + rng() * 1.4), W * 0.22)), p.fir, p.snow);
  }
  return c;
}

// The Sunscorch's tombs: a great pyramid with a lesser one beside it, seen from a corner as on the
// trial card (scenes.js), the ridge leaning toward us and the face toward the sun (right) lit.
function tombs(g, W, rng, cx, base, height, color, lit) {
  const big = Math.round(Math.min(height * (1.6 + rng() * 0.6), W * 0.25)), small = Math.round(big * (0.5 + rng() * 0.15)), side = rng() < 0.5 ? -1 : 1;
  pyramid(g, W, Math.round(cx), base - big, base, color, lit);
  pyramid(g, W, Math.round(cx + side * big * 1.15), base - small, base, color, lit);
}

function pyramid(g, W, cx, tip, foot, left, right) {
  for (let r = 0; tip + r < foot; r++) {
    const ridge = cx + Math.floor(r * 0.4);
    g.fillStyle = left;
    wrapRect(g, W, cx - r, tip + r, ridge - (cx - r) + 1, 1);
    g.fillStyle = right;
    wrapRect(g, W, ridge + 1, tip + r, cx + r - ridge, 1);
  }
}

// A saguaro: its trunk and an arm either side bent upward, the tops rounded, the edges toward the
// sun (right) lit.
function saguaro(g, W, x, foot, h, color, lit) {
  const w = Math.max(3, Math.round(h * 0.13)), a = Math.max(2, w - 1), x0 = x - (w >> 1);
  const lx = x0 - Math.round(h * 0.28), ly = foot - Math.round(h * 0.42), lt = foot - Math.round(h * 0.7);
  const rx = x0 + w + Math.round(h * 0.2) - a, ry = foot - Math.round(h * 0.56), rt = foot - Math.round(h * 0.84);
  g.fillStyle = color;
  wrapRect(g, W, x0, foot - h + 1, w, h - 1);
  wrapRect(g, W, x0 + 1, foot - h, w - 2, 1);
  wrapRect(g, W, lx, ly, x0 - lx, a);
  wrapRect(g, W, lx, lt + 1, a, ly - lt);
  wrapRect(g, W, x0 + w, ry, rx - x0 - w + a, a);
  wrapRect(g, W, rx, rt + 1, a, ry - rt);
  g.fillStyle = lit;
  wrapRect(g, W, x0 + w - 1, foot - h + 1, 1, ry - foot + h - 1);
  wrapRect(g, W, x0 + w - 1, ry + a, 1, foot - ry - a);
  wrapRect(g, W, rx + a - 1, rt + 1, 1, ry - rt + a - 1);
  wrapRect(g, W, lx + a - 1, lt + 1, 1, ly - lt - 1);
}

// A fir under snow: tiers of branches widening down its height, the snow lying along the upper
// slopes of each tier and on its head, the tier's last row (the shade under its tips) bare; on a
// short trunk.
function fir(g, W, cx, foot, h, color, snow) {
  const top = foot - h, n = h - 2, T = Math.max(4, Math.round(h / 8));
  g.fillStyle = color;
  wrapRect(g, W, cx - 1, foot - 3, 3, 3);
  for (let r = 0; r < n; r++) {
    const k = r % T, half = Math.floor(k * 0.8 + r * 0.17), y = top + r;
    g.fillStyle = color;
    wrapRect(g, W, cx - half, y, half * 2 + 1, 1);
    if (k === T - 1) continue;
    g.fillStyle = snow;
    if (k === 0) wrapRect(g, W, cx - half, y, half * 2 + 1, 1);
    else {
      wrapRect(g, W, cx - half, y, 1, 1);
      wrapRect(g, W, cx + half, y, 1, 1);
    }
  }
}

// A wood of firs under snow, packed close as the Darkwood's pines are (treeLayer), its floor in
// their shade below `base` in the strip's colour; the firs (p.fir under p.snow) up to about
// `height` tall, but no taller than a share of the width, as the dunes keep what stands on them.
function firwood(W, H, seed, base, height, color, density, p) {
  const c = makeCanvas(W, H), g = c.getContext('2d'), rng = mulberry32(seed);
  g.fillStyle = color;
  g.fillRect(0, base, W, H - base);
  for (let x = -10; x < W + 10; ) {
    const h = Math.max(6, Math.round(Math.min(height * (0.45 + rng() * 0.9), W * 0.16)));
    fir(g, W, Math.round(x), base + 2, h, p.fir, p.snow);
    x += Math.max(1, h * 0.3 * density * (0.5 + rng()));
  }
  return c;
}

// Crags of rock and ice: peaks with notched and stepped slopes, the face toward the sun (left) in
// p.lit; snow on their heads (p.cap of their height, its lower edge ragged, p.snow lit and
// p.snowShade in shade); p.edge, ice catching the light up the lit edge.
function crags(W, H, seed, base, height, color, density, p) {
  const c = makeCanvas(W, H), g = c.getContext('2d'), rng = mulberry32(seed);
  g.fillStyle = color;
  g.fillRect(0, base, W, H - base);
  for (let x = -10; x < W + 10; ) {
    const h = Math.round(height * (0.45 + rng() * 0.6)), sl = p.slope[0] + rng() * (p.slope[1] - p.slope[0]);
    const cap = Math.round(h * p.cap * (0.7 + rng() * 0.6)), cx = Math.round(x), tip = base - h;
    let aL = 0, aR = 0;
    for (let r = 0; r < h; r++) {
      aL += sl * (0.5 + rng()) + (rng() < 0.06 ? 2 : 0);
      aR += sl * (0.5 + rng()) + (rng() < 0.06 ? 2 : 0);
      const L = cx - Math.round(aL), R = cx + Math.round(aR), ridge = Math.min(R, cx + Math.round(r * p.lean)), y = tip + r;
      if (Math.abs(r - cap) > 2) {
        const snow = r < cap;
        g.fillStyle = snow ? p.snow : p.lit;
        wrapRect(g, W, L, y, ridge - L + 1, 1);
        g.fillStyle = snow ? p.snowShade : color;
        wrapRect(g, W, ridge + 1, y, R - ridge, 1);
      } else {
        // The snow's ragged edge, pixel by pixel.
        for (let xx = L; xx <= R; xx++) {
          const snow = r < cap + ((((xx * 7 + tip) % 5) + 5) % 5) - 2;
          g.fillStyle = xx <= ridge ? (snow ? p.snow : p.lit) : snow ? p.snowShade : color;
          wrapRect(g, W, xx, y, 1, 1);
        }
      }
      if (p.edge && r > cap) {
        g.fillStyle = p.edge;
        wrapRect(g, W, L, y, 1, 1);
      }
    }
    // On by a pixel at least: on a strip a pixel or two high (a window squeezed to nothing tall) a
    // peak rounds to no height, so to no breadth, and the row would never end.
    x += Math.max(1, ((aL + aR) / 2) * density * (0.7 + rng() * 0.8));
  }
  return c;
}

// Round hills, the last of the light along their brows (p.rim); trees in blossom on them (p.trees,
// their crowns p.crown of the screen's height across, or of 1.2 times its width where that is less,
// in p.bloom) and flowers in the grass (p.flowers, so many to a pixel across, in p.petals).
function hills(W, H, seed, base, height, color, density, p) {
  const c = makeCanvas(W, H), g = c.getContext('2d'), rng = mulberry32(seed), tops = new Int16Array(W).fill(base);
  g.fillStyle = color;
  g.fillRect(0, base, W, H - base);
  for (let x = -10; x < W + 10; ) {
    const rx = Math.round(height * (1.3 + rng() * 1.5)), ry = height * (0.5 + rng() * 0.5);
    for (let dx = -rx; dx <= rx; dx++) {
      const hh = Math.round(Math.sqrt(1 - (dx / (rx + 0.5)) ** 2) * ry), col = Math.round(x) + dx, i = ((col % W) + W) % W;
      g.fillStyle = color;
      wrapRect(g, W, col, base - hh, 1, hh);
      g.fillStyle = p.rim;
      wrapRect(g, W, col, base - hh, 1, 1);
      tops[i] = Math.min(tops[i], base - hh);
    }
    x += Math.max(1, rx * density * (0.9 + rng() * 0.9)); // by a pixel at least, as the crags: a hill that low rounds to no breadth
  }
  for (let i = 0; i < (p.flowers || 0) * W; i++) {
    const x = Math.floor(rng() * W);
    g.fillStyle = p.petals[i % p.petals.length];
    wrapRect(g, W, x, tops[x] + 2 + Math.floor(rng() * (H - tops[x] - 3)), 1, 1);
  }
  for (let i = 0; i < (p.trees || 0); i++) {
    const x = Math.round(((i + 0.15 + rng() * 0.7) * W) / p.trees);
    blossom(g, W, x, tops[x] + 2, Math.max(3, Math.round(Math.min(H, W * 1.2) * p.crown * (0.8 + rng() * 0.4))), p.trunk, p.bloom);
  }
  return c;
}

// A tree in blossom: a short trunk under a round crown of three lobes (bloom[0]), its upper left
// lit (bloom[1]), its flowers bright in it (bloom[2]).
function blossom(g, W, cx, foot, r, trunk, bloom) {
  const cy = foot - Math.round(r * 1.7);
  g.fillStyle = trunk;
  wrapRect(g, W, cx - 1, cy, r > 7 ? 3 : 2, foot - cy);
  blob(g, W, cx - Math.round(r * 0.45), cy + Math.round(r * 0.25), Math.round(r * 0.7), bloom[0]);
  blob(g, W, cx + Math.round(r * 0.45), cy + Math.round(r * 0.3), Math.round(r * 0.65), bloom[0]);
  blob(g, W, cx, cy - Math.round(r * 0.1), r, bloom[0]);
  blob(g, W, cx - Math.round(r * 0.3), cy - Math.round(r * 0.35), Math.round(r * 0.55), bloom[1]);
  g.fillStyle = bloom[2];
  for (let i = 0; i < r + 2; i++) {
    const a = i * 2.4, d = r * 0.85 * Math.sqrt((i + 0.5) / (r + 2));
    wrapRect(g, W, Math.round(cx + Math.cos(a) * d), Math.round(cy - r * 0.1 + Math.sin(a) * d), 1, 1);
  }
}

function blob(g, W, cx, cy, r, col) {
  g.fillStyle = col;
  for (let y = -r; y <= r; y++) {
    const half = Math.round(Math.sqrt(Math.max(0, r * r - y * y)));
    wrapRect(g, W, cx - half, cy + y, half * 2 + 1, 1);
  }
}

// Spires of black rock, tall and leaning, broad at the foot, their sides stepped as stone splits,
// the edge toward the fire (right) in p.rim. On the nearest ground (p.lava) the fire shows through
// the cracks.
function spires(W, H, seed, base, height, color, density, p) {
  const c = makeCanvas(W, H), g = c.getContext('2d'), rng = mulberry32(seed);
  g.fillStyle = color;
  g.fillRect(0, base, W, H - base);
  for (let x = -10; x < W + 10; ) {
    const h = Math.round(height * (0.35 + rng() * 0.75)), half = Math.max(2, h * (0.11 + rng() * 0.08)), lean = (rng() - 0.5) * h * 0.3;
    spike(g, W, rng, x, base + 2, h, half, lean, color, p.rim, p.hot || p.rim);
    x += half * density * (1.5 + rng() * 2.5);
  }
  if (p.lava) cracks(g, W, H, base, rng, p.lava);
  return c;
}

// One spire, from its foot at (x, foot) up to its tip h above, leaning by `lean` over its height,
// its sides stepping in or out a pixel now and then and staying so a while; its lit edge hotter
// (hot) over the lower third, nearest the fire.
function spike(g, W, rng, x, foot, h, half, lean, color, rim, hot) {
  let jl = 0, jr = 0;
  for (let r = 0; r < h; r++) {
    const t = r / h, cx = Math.round(x + lean * (1 - t)), y = foot - h + r, a = half * t ** 1.1;
    if (r > 2 && rng() < 0.16) jl = Math.floor(rng() * 3) - 1;
    if (r > 2 && rng() < 0.16) jr = Math.floor(rng() * 3) - 1;
    const L = cx - Math.max(0, Math.round(a) + jl), R = cx + Math.max(0, Math.round(a) + jr);
    g.fillStyle = color;
    wrapRect(g, W, L, y, R - L + 1, 1);
    g.fillStyle = t > 0.66 ? hot : rim;
    wrapRect(g, W, R, y, 1, 1);
  }
}

// Cracks wandering across the near ground with the fire showing through: a glow either side of
// each (cols[0]), the fire in it (cols[1]), white-hot here and there (cols[2]).
function cracks(g, W, H, base, rng, cols) {
  const pts = [];
  for (let i = 0; i < 4; i++) {
    let y = base + 6 + rng() * (H - base - 10);
    const x0 = Math.floor(rng() * W), n = W * (0.25 + rng() * 0.35);
    for (let s = 0; s < n; s++) {
      y = clamp(y + (rng() - 0.5) * 1.6, base + 4, H - 3);
      pts.push((x0 + s) % W, Math.round(y));
    }
  }
  for (let k = 0; k < 2; k++) {
    g.fillStyle = cols[k];
    for (let i = 0; i < pts.length; i += 2) wrapRect(g, W, pts[i], pts[i + 1] - 1 + k, 1, 3 - k * 2);
  }
  g.fillStyle = cols[2];
  for (let i = 0; i < pts.length; i += 2) if (rng() < 0.08) wrapRect(g, W, pts[i], pts[i + 1], 1, 1);
}

// The moon as the Darkwood's always was (its craters, its rim, its shaded and its lit side) in the
// look's colours; or the sun high in the day's sky (o.sun), white-hot at its heart; or the black
// sun (o.dark), a burning ring round the dark, as on the Abyss's trial card (scenes.js). Drawn
// once, at radius r; cols: crater, rim, shade, light (the sun's rim, body and heart; the black
// sun's rim, inner rim and dark).
function orb(r, o) {
  const c = makeCanvas(r * 2 + 1, r * 2 + 1), g = c.getContext('2d'), [crater, edge, shade, light] = o.cols;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y);
      if (d > r) continue;
      const pit = !o.sun && !o.dark && (Math.hypot(x + r * 0.3, y - r * 0.2) < r * 0.25 || Math.hypot(x - r * 0.35, y + r * 0.3) < r * 0.18);
      g.fillStyle = pit ? crater : d > r - 1.2 ? edge : o.dark ? (d > r - 2.2 ? shade : light) : o.sun ? (d < r * 0.6 ? light : shade) : x + y > r * 0.4 ? shade : light;
      g.fillRect(x + r, y + r, 1, 1);
    }
  }
  return c;
}

// What drifts through a look in the fireflies' place (MenuScene.drift): sand on the wind, snow,
// petals, embers. Seeded once per build, so none of it draws from Math.random.
function motes(W, H, m) {
  const rng = mulberry32(m.seed), list = [];
  for (let i = 0, n = Math.round((W * H) / m.per); i < n; i++) {
    list.push({ x: rng() * W, y: H * (m.y[0] + rng() * (m.y[1] - m.y[0])), vx: m.vx[0] + rng() * (m.vx[1] - m.vx[0]), vy: m.vy[0] + rng() * (m.vy[1] - m.vy[0]), ph: rng() * TAU, k: rng() });
  }
  return list;
}

// Each look's sky and land: the sky's stops (gradientCanvas); its stars by night (one to `per` px²
// over the top `top` of the screen, by how bright they twinkle and the big ones' cross); the moon
// or the sun (orb: where, its radius as a share of H and at least, its halo's reach and colours);
// the clouds' colour and how high; the strips far to near, three (the Frostfell's four: a fir wood
// in front of its snowfield), each a painter and its own settings, the ground's top as
// round(H × share) + px; the mist over the far two; what drifts (motes, or the Darkwood's
// fireflies); the glow from below; by day a lighter vignette at the corners than the night's. The
// Darkwood's are the numbers it always had.
const THEMES = {
  // The Darkwood: moonlight over the pines, fireflies.
  forest: {
    sky: [[0, '#07060f'], [0.45, '#1a1533'], [0.75, '#3b2346'], [1, '#5a2e3e']],
    stars: { per: 900, top: 0.6, cols: ['#ffffff', '#c0cbdc', '#5a6988', '#8b9bb4'] },
    orb: { x: 0.84, y: 0.42, r: [0.05, 9], reach: 5, halo: ['rgba(255,240,210,0.25)', 'rgba(255,240,210,0)'], cols: ['#d9cfae', '#e4d8b4', '#efe6c8', '#fff8e0'] },
    clouds: { y: 0.12, col: 'rgba(40,30,60,0.55)' },
    layers: [
      { paint: treeLayer, seed: 11, base: [0.66, 0], height: 0.28, color: '#2a2141', density: 0.9, speed: 2 },
      { paint: treeLayer, seed: 23, base: [0.74, 0], height: 0.36, color: '#1a1430', density: 0.8, speed: 5 },
      { paint: treeLayer, seed: 37, base: [0.8, 6], height: 0.5, color: '#0c0a16', density: 1.1, speed: 9 },
    ],
    mist: { y: 0.68, dy: 0.08, rgb: '120,100,170' },
  },
  // The Sunscorch by day (the owner's, 28 October 2026: "we will have to only have to spend the
  // night in the forest, make the desert and snow one be normal bright"): the sun high and
  // white-hot in a clear blue sky, up in the corner the trial cards leave open, the sky paler down
  // to the haze on the sand; the dunes and the tombs lighter the further off they lie, the nearest
  // in its own shade, dark under the trial screen's line of keys (drawn without an outline);
  // saguaros green in the sun, sand on the wind.
  desert: {
    sky: [[0, '#3a88de'], [0.3, '#4c9ae4'], [0.5, '#6cb4ea'], [0.62, '#9ccdee'], [0.72, '#d0e4e6'], [1, '#f0dcb0']],
    orb: { x: 0.92, y: 0.12, r: [0.055, 9], reach: 4.5, sun: true, halo: ['rgba(255,246,210,0.55)', 'rgba(255,246,210,0)'], cols: [null, '#feae34', '#fee761', '#fff6c2'] },
    clouds: { y: 0.1, col: 'rgba(255,250,240,0.35)' },
    layers: [
      { paint: dunes, seed: 11, base: [0.72, 0], height: 0.07, color: '#e0b878', rim: '#f4dcaa', lit: '#f6e2b8', tombs: 1, density: 1, speed: 2 },
      { paint: dunes, seed: 23, base: [0.8, 0], height: 0.1, color: '#d09a52', rim: '#f0cc88', lit: '#ebc07c', tombs: 1, density: 1, speed: 5 },
      { paint: dunes, seed: 37, base: [0.9, 0], height: 0.15, color: '#946440', rim: '#e0a860', cactus: ['#3e8948', '#63c74d'], cacti: 2, density: 1, speed: 9 },
    ],
    mist: { y: 0.7, dy: 0.09, rgb: '255,236,200' },
    motes: { kind: 'sand', seed: 5, per: 2600, y: [0.45, 1], vx: [35, 80], vy: [-3, 3], sway: 4, cols: ['#e8c890', '#d4a868', '#fff0cc'] },
    vignette: 'rgba(5,4,10,0.15)',
  },
  // The Frostfell by day (the same word of the owner's): a pale cold sun up in the other corner,
  // over crags of ice blue in their shade and white on their heads, the snowfield at their feet, a
  // wood of firs under snow in front, its floor dark under that line of keys, snow falling.
  frozen: {
    sky: [[0, '#3c86da'], [0.35, '#56a2e6'], [0.55, '#7cbcee'], [0.7, '#acd6f2'], [0.8, '#d0e6f6'], [1, '#e2eef8']],
    orb: { x: 0.08, y: 0.12, r: [0.045, 8], reach: 5, sun: true, halo: ['rgba(255,251,235,0.6)', 'rgba(255,251,235,0)'], cols: [null, '#fff4cc', '#fffbea', '#ffffff'] },
    clouds: { y: 0.08, col: 'rgba(240,246,255,0.5)' },
    layers: [
      { paint: crags, seed: 11, base: [0.72, 0], height: 0.3, color: '#8a9ec4', lit: '#b4c6e2', snow: '#eef3f9', snowShade: '#c8d6ea', cap: 0.32, slope: [0.9, 1.6], lean: 0.25, density: 0.8, speed: 2 },
      { paint: crags, seed: 23, base: [0.8, 0], height: 0.2, color: '#5a6f9a', lit: '#8098c4', snow: '#dce6f2', snowShade: '#a8b8d4', cap: 0.2, edge: '#c8e6f6', slope: [0.5, 0.9], lean: 0.2, density: 0.9, speed: 4 },
      { paint: dunes, seed: 37, base: [0.88, 0], height: 0.06, color: '#c4d2e6', rim: '#eef3f9', fir: '#2c5c4a', snow: '#e8eef6', firs: 2, density: 1, speed: 6 },
      { paint: firwood, seed: 41, base: [0.93, 0], height: 0.12, color: '#16302e', fir: '#1f4a3c', snow: '#dce6f2', density: 1, speed: 9 },
    ],
    mist: { y: 0.71, dy: 0.08, rgb: '230,240,255' },
    motes: { kind: 'snow', seed: 6, per: 1800, y: [0, 1], vx: [-4, 10], vy: [10, 24], sway: 6, cols: ['#ffffff', '#c8d8ec'] },
    vignette: 'rgba(5,4,10,0.15)',
  },
  // The Bloomvale: twilight over round hills, trees in blossom, flowers, petals on the breeze.
  meadow: {
    sky: [[0, '#0e1030'], [0.3, '#262c5e'], [0.5, '#4a3f86'], [0.64, '#8a4f96'], [0.76, '#d0708e'], [1, '#f6b08a']],
    stars: { per: 1400, top: 0.42, cols: ['#ffffff', '#ffd0d8', '#8f7ab8', '#f6757a'] },
    orb: { x: 0.18, y: 0.34, r: [0.06, 10], reach: 5, halo: ['rgba(255,200,215,0.28)', 'rgba(255,200,215,0)'], cols: ['#ecc4cc', '#f4d4d8', '#fbe6e6', '#fff6f2'] },
    clouds: { y: 0.14, col: 'rgba(70,50,110,0.35)' },
    layers: [
      { paint: hills, seed: 11, base: [0.74, 0], height: 0.12, color: '#4b3f7e', rim: '#6a5aa0', trees: 3, crown: 0.03, trunk: '#3a2e5e', bloom: ['#8a4f96', '#b05aa0', '#d07ab8'], density: 1, speed: 2 },
      { paint: hills, seed: 23, base: [0.82, 0], height: 0.1, color: '#2a5a48', rim: '#4f9a50', trees: 3, crown: 0.045, trunk: '#3e2731', bloom: ['#b55088', '#f6757a', '#ffd0d8'], density: 1, speed: 5 },
      { paint: hills, seed: 37, base: [0.92, 0], height: 0.09, color: '#16382e', rim: '#2e6a46', trees: 2, crown: 0.07, trunk: '#1e1420', bloom: ['#8a3a6a', '#b55088', '#f6757a'], flowers: 0.9, petals: ['#f6757a', '#fee761', '#ffffff', '#c080e0'], density: 1, speed: 9 },
    ],
    mist: { y: 0.74, dy: 0.08, rgb: '246,170,200' },
    motes: { kind: 'petal', seed: 7, per: 2600, y: [0.25, 1], vx: [10, 26], vy: [6, 14], sway: 8, cols: ['#f6757a', '#ffd0d8', '#ffffff', '#b55088'] },
  },
  // The Abyss: the black sun over spires of black rock, the fire below glowing up, embers rising.
  hell: {
    sky: [[0, '#050206'], [0.4, '#1a0610'], [0.62, '#3e0c16'], [0.8, '#7a1a1c'], [1, '#c03a1e']],
    stars: { per: 5000, top: 0.5, cols: ['#f6757a', '#a22633', '#5c1826', '#e43b44'] },
    orb: { x: 0.8, y: 0.28, r: [0.06, 10], reach: 3.5, dark: true, halo: ['rgba(247,118,34,0.5)', 'rgba(247,118,34,0)'], cols: [null, '#feae34', '#be4a2f', '#0d0b14'] },
    clouds: { y: 0.16, col: 'rgba(12,4,8,0.6)' },
    layers: [
      { paint: spires, seed: 11, base: [0.72, 0], height: 0.34, color: '#3e1018', rim: '#6a1a24', density: 1.3, speed: 2 },
      { paint: spires, seed: 23, base: [0.8, 0], height: 0.3, color: '#200810', rim: '#7a1f2a', hot: '#a22633', density: 1.3, speed: 5 },
      { paint: spires, seed: 37, base: [0.88, 0], height: 0.3, color: '#080306', rim: '#a22633', hot: '#f77622', lava: ['#5c1418', '#f77622', '#fee761'], density: 1.8, speed: 9 },
    ],
    mist: { y: 0.7, dy: 0.08, rgb: '228,59,68' },
    glow: ['rgba(255,90,40,0.2)', 'rgba(255,90,40,0)'],
    motes: { kind: 'ember', seed: 8, per: 2400, y: [0.3, 1], vx: [-5, 5], vy: [-30, -12], sway: 7, cols: ['#fee761', '#f77622', '#be4a2f'] },
  },
};

// A look's backdrop at one size, all drawn once (MenuScene.build): the sky, the stars (none by
// day), the strips, the moon or the sun with its halo, the vignette, the mist's colours,
// and where the look has them the glow from below and the motes. Gradients made here are kept,
// so that a frame draws without making any.
function scenery(W, H, th) {
  const sky = gradientCanvas(W, H, th.sky), g = sky.getContext('2d');
  const rng = mulberry32(7), stars = [];
  if (th.stars) for (let i = 0; i < (W * H) / th.stars.per; i++) stars.push([rng() * W, rng() * H * th.stars.top, rng() * TAU, rng() < 0.15]);
  const layers = th.layers.map((L) => ({ c: L.paint(W, H, L.seed, Math.round(H * L.base[0]) + L.base[1], H * L.height, L.color, L.density, L), speed: L.speed }));
  const o = th.orb, r = Math.max(o.r[1], Math.round(H * o.r[0])), x = Math.round(W * o.x), y = Math.round(H * o.y);
  const halo = g.createRadialGradient(x, y, r, x, y, r * o.reach);
  halo.addColorStop(0, o.halo[0]);
  halo.addColorStop(1, o.halo[1]);
  const vig = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  vig.addColorStop(0, 'rgba(5,4,10,0)');
  vig.addColorStop(1, th.vignette || 'rgba(5,4,10,0.75)');
  let glow = null;
  if (th.glow) {
    glow = g.createLinearGradient(0, H, 0, H * 0.45);
    glow.addColorStop(0, th.glow[0]);
    glow.addColorStop(1, th.glow[1]);
  }
  return {
    th, sky, stars, layers, vig, glow,
    orb: { c: orb(r, o), x, y, r, R: r * o.reach, halo },
    mist: [0, 1].map((i) => `rgba(${th.mist.rgb},${0.07 + i * 0.03})`),
    motes: th.motes ? motes(W, H, th.motes) : null,
  };
}

// No options: the title's call, its campfire lit.
const NONE = {};

export class MenuScene {
  constructor() {
    this.t = 0;
    this.W = 0;
    this.H = 0;
    this.look = null;
    this.built = new Map(); // look -> its scenery at this.W × this.H
    this.s = null; // the scenery drawn now
    this.embers = [];
    this.flies = [];
  }

  // Each look's scenery is drawn once for the screen's size and kept, so that moving along the map
  // row and back never draws one again (gradientCanvas alone goes over every pixel of the screen);
  // a new size (the window resized) starts them afresh rather than keeping every size it passed.
  build(W, H, look) {
    if (W !== this.W || H !== this.H) {
      this.W = W;
      this.H = H;
      this.built.clear();
    }
    let s = this.built.get(look);
    if (!s) this.built.set(look, (s = scenery(W, H, THEMES[look])));
    this.look = look;
    this.s = s;
  }

  // o.campfire false: none (every menu but the title); o.biome: the land to show (THEMES), the
  // Darkwood without one. Nothing made per frame but what the title's campfire makes.
  draw(ctx, W, H, dt, o = NONE) {
    const look = Object.hasOwn(THEMES, o.biome) ? o.biome : 'forest';
    if (W !== this.W || H !== this.H || look !== this.look) this.build(W, H, look);
    this.t += dt;
    const t = this.t, s = this.s, th = s.th;
    ctx.drawImage(s.sky, 0, 0);
    // Stars (by night).
    const sc = th.stars && th.stars.cols;
    for (let i = 0; i < s.stars.length; i++) {
      const st = s.stars[i], x = st[0], y = st[1], tw = 0.5 + 0.5 * Math.sin(t * 2 + st[2]);
      ctx.fillStyle = tw > 0.7 ? sc[0] : tw > 0.35 ? sc[1] : sc[2];
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      if (st[3] && tw > 0.8) {
        ctx.fillStyle = sc[3];
        ctx.fillRect(Math.round(x) - 1, Math.round(y), 1, 1);
        ctx.fillRect(Math.round(x) + 1, Math.round(y), 1, 1);
        ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 1);
        ctx.fillRect(Math.round(x), Math.round(y) + 1, 1, 1);
      }
    }
    // Moon with halo (or the sun, the black sun).
    const b = s.orb;
    ctx.fillStyle = b.halo;
    ctx.fillRect(b.x - b.R, b.y - b.R, b.R * 2, b.R * 2);
    ctx.drawImage(b.c, b.x - b.r, b.y - b.r);
    // Clouds drifting across the moon (by day, white across the sun).
    ctx.fillStyle = th.clouds.col;
    for (let i = 0; i < 4; i++) {
      const cx = ((t * (3 + i) + i * 140) % (W + 160)) - 80;
      const cy = H * (th.clouds.y + i * 0.07);
      ctx.fillRect(Math.round(cx), Math.round(cy), 70 + i * 10, 3);
      ctx.fillRect(Math.round(cx + 10), Math.round(cy - 2), 40, 2);
    }
    // Parallax tree lines (or dunes, crags, a fir wood, hills, spires).
    for (let i = 0; i < s.layers.length; i++) {
      const L = s.layers[i], off = -((t * L.speed) % W);
      ctx.drawImage(L.c, Math.round(off), 0);
      ctx.drawImage(L.c, Math.round(off) + W, 0);
      if (i < 2) {
        ctx.fillStyle = s.mist[i];
        const fy = Math.round(H * (th.mist.y + i * th.mist.dy));
        ctx.fillRect(0, fy, W, 6);
        ctx.fillRect(0, fy + 6, W, 3);
      }
    }
    // The Abyss's fire glowing up from below, flickering.
    if (s.glow) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 1.9) * Math.sin(t * 0.7);
      ctx.fillStyle = s.glow;
      ctx.fillRect(0, Math.floor(H * 0.45), W, H - Math.floor(H * 0.45));
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    if (o.campfire !== false) this.drawCamp(ctx, W, H, dt);

    if (s.motes) this.drift(ctx, W, H, dt);
    else {
      // Fireflies.
      if (this.flies.length < 18) this.flies.push({ x: rand(W), y: rand(H * 0.5, H * 0.95), ph: rand(TAU), sp: rand(0.3, 1) });
      for (const f of this.flies) {
        f.x += Math.sin(t * f.sp + f.ph) * 0.2;
        f.y += Math.cos(t * f.sp * 1.3 + f.ph) * 0.15;
        const a = 0.5 + 0.5 * Math.sin(t * 3 + f.ph);
        if (a < 0.3) continue;
        ctx.fillStyle = a > 0.8 ? '#fee761' : '#9ee562';
        ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
      }
    }
    // Vignette.
    ctx.fillStyle = s.vig;
    ctx.fillRect(0, 0, W, H);
  }

  // A look's motes, moved where they are and round the screen's edges: sand streaming along the
  // wind, snow falling and swaying, petals fluttering down the breeze (flat, then edge on), embers
  // rising, cooling as they go and flickering.
  drift(ctx, W, H, dt) {
    const t = this.t, s = this.s, m = s.th.motes, list = s.motes, cols = m.cols, y0 = H * m.y[0], span = H * (m.y[1] - m.y[0]);
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      f.x += (f.vx + Math.sin(t * 1.3 + f.ph) * m.sway) * dt;
      f.y += (f.vy + Math.cos(t * 1.7 + f.ph) * m.sway * 0.5) * dt;
      if (f.x < -2) f.x += W + 4;
      else if (f.x > W + 2) f.x -= W + 4;
      if (f.y < y0) f.y += span;
      else if (f.y >= y0 + span) f.y -= span;
      const x = Math.round(f.x), y = Math.round(f.y);
      if (m.kind === 'sand') {
        ctx.fillStyle = cols[f.k < 0.5 ? 0 : f.k < 0.85 ? 1 : 2];
        ctx.fillRect(x, y, f.vx > 60 ? 2 : 1, 1);
      } else if (m.kind === 'snow') {
        ctx.fillStyle = cols[f.k < 0.75 ? 0 : 1];
        ctx.fillRect(x, y, 1, 1);
        if (f.k > 0.92) {
          ctx.fillStyle = cols[1];
          ctx.fillRect(x - 1, y, 1, 1);
          ctx.fillRect(x + 1, y, 1, 1);
          ctx.fillRect(x, y - 1, 1, 1);
          ctx.fillRect(x, y + 1, 1, 1);
        }
      } else if (m.kind === 'petal') {
        const flat = Math.sin(t * 4 + f.ph * 3) > 0;
        ctx.fillStyle = cols[Math.floor(f.k * cols.length)];
        ctx.fillRect(x, y, flat ? 2 : 1, flat ? 1 : 2);
      } else {
        if (Math.sin(t * 9 + f.ph * 5) < -0.75) continue;
        const up = (f.y - y0) / span;
        ctx.fillStyle = cols[up > 0.6 ? 0 : up > 0.3 ? 1 : 2];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  drawCamp(ctx, W, H, dt) {
    const t = this.t;
    const fx = Math.round(W / 2), fy = Math.round(H * 0.9);
    // Firelight on the ground.
    const r = H * 0.35 * (0.95 + 0.05 * Math.sin(t * 13) * Math.sin(t * 7));
    const lg = ctx.createRadialGradient(fx, fy - 4, 0, fx, fy - 4, r);
    lg.addColorStop(0, 'rgba(255,170,90,0.45)');
    lg.addColorStop(0.5, 'rgba(255,120,60,0.12)');
    lg.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = lg;
    ctx.fillRect(fx - r, fy - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
    // The heroes round the fire as they look in a run, from their own sheets at one scale,
    // idling and facing it: those beyond it first, then the fire over their feet, then those
    // on this side of it. One with no room on a narrow screen stays out.
    const hero = ([name, dx, dy]) => {
      const spr = SPR[name], fr = idleFrame(spr, Math.floor((t + Math.abs(dx)) * 1.6 * spr.idleRate)), flip = dx > 0;
      const img = fr.get(flip);
      const x = fx + dx, y = fy + dy;
      if (x - img.width / 2 < 2 || x + img.width / 2 > W - 2) return;
      ctx.fillStyle = 'rgba(5,4,10,0.5)';
      ctx.fillRect(Math.round(x - 8), y - 1, 16, 2);
      const ix = Math.round(x - img.width / 2), iy = y - spr.anchorY;
      ctx.drawImage(img, ix, iy);
      if (fr.em) ctx.drawImage(flip ? fr.emf : fr.em, ix, iy);
    };
    for (const h of CAMP) if (h[2] < 0) hero(h);
    const fire = SPR.campfire.frames[Math.floor(t * 8) % 3].c;
    const fs = 2;
    ctx.drawImage(fire, fx - (fire.width * fs) / 2, fy - fire.height * fs, fire.width * fs, fire.height * fs);
    for (const h of CAMP) if (h[2] >= 0) hero(h);
    // Embers.
    if (Math.random() < dt * 14) this.embers.push({ x: fx + rand(-6, 6), y: fy - 14, vx: rand(-6, 6), vy: rand(-22, -12), life: rand(1.2, 2.4) });
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      e.life -= dt;
      if (e.life <= 0) {
        this.embers.splice(i, 1);
        continue;
      }
      e.x += (e.vx + Math.sin(t * 3 + i) * 6) * dt;
      e.y += e.vy * dt;
      ctx.fillStyle = e.life > 1 ? '#fee761' : e.life > 0.5 ? '#f77622' : '#be4a2f';
      ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
    }
  }
}
