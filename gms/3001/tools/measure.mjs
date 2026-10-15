// Measures a built sprite (the game's { frames, walk, idle, attack, anchorY }): how well its
// frames line up and how clean its pixels are. Used by build.mjs (a summary as it builds) and
// review.mjs (the review boards). Rows and columns are in the sprite's own pixels.
//
//   feet      the lowest opaque row of each frame: in an idle or a walk, where the feet stand.
//             anchorY is the ground line under them, so the feet should be on row anchorY - 1 in
//             every frame (as the plumed knight and the ranger have it)
//   top       the highest opaque row: how tall it stands (feet - top + 1), and how its bob runs
//   cx        the centre of its opaque pixels across: how far the body slides between frames
//   stray     opaque pixels with no opaque neighbour at all (noise, almost always a mistake)
//   islands   pixels none of whose four neighbours shares their colour (speckle; some is detail)
//   parts     frames in more than one piece (8-connected): detached bits (sometimes intended: sparks)
//   outline   the share of the silhouette's edge drawn in a dark colour (a clean outline is ~1)
//   upperChange  per idle/walk: the share of the upper body's pixels (above the hips) that change
//             from frame to frame (the game's knight walks at ~74%, Lyra at ~56%)
//   inkWall   outline pixels touching no colour, not even diagonally: doubled, 2-px black walls
//   bright, nightClear  of the first idle frame: pixels above luma 150, and pixels still clear of
//             the night grass in the review boards' night view (the bar: 50%, 40% for dark heroes)
//             (the game's heroes 0-4%)

const alpha = (c) => c >>> 24;
const luma = (c) => 0.299 * (c & 255) + 0.587 * ((c >>> 8) & 255) + 0.114 * ((c >>> 16) & 255);
// The review boards' night view: red, green and blue darkened this much.
export const NIGHT = [0.42, 0.46, 0.66];

export function frameStats(buf) {
  const { w, h, d } = buf;
  let top = -1, feet = -1, sx = 0, n = 0, stray = 0, islands = 0, edge = 0, dark = 0;
  const colours = new Set();
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = d[y * w + x];
      if (alpha(c) < 128) continue;
      if (top < 0) top = y;
      feet = y;
      sx += x;
      n++;
      colours.add(c);
      let near = 0, same = 0, open = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const o = at(x + dx, y + dy);
          if (alpha(o) >= 128) near++;
          else if (!dx || !dy) open = true;
          if ((!dx || !dy) && o === c) same++;
        }
      }
      if (!near) stray++;
      if (!same) islands++;
      if (open) {
        edge++;
        if (luma(c) < 70) dark++;
      }
    }
  }
  // Pieces: flood fill over opaque pixels, 8-connected.
  const seen = new Uint8Array(w * h);
  let parts = 0;
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || alpha(d[i]) < 128) continue;
    parts++;
    const todo = [i];
    seen[i] = 1;
    while (todo.length) {
      const k = todo.pop(), x = k % w, y = (k / w) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy, j = ny * w + nx;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[j] || alpha(d[j]) < 128) continue;
          seen[j] = 1;
          todo.push(j);
        }
      }
    }
  }
  return { top, feet, cx: n ? +(sx / n).toFixed(2) : null, pixels: n, colours, stray, islands, parts, edge, dark };
}

// The whole sprite: each animation's frames measured, and what they add up to.
export function measure(spr) {
  const stats = spr.frames.map((f) => frameStats(f.buf));
  const all = spr.frames.map((_, i) => i);
  const anims = { idle: spr.idle || [0], walk: spr.walk || all, attack: spr.attack || [] };
  const out = { frames: spr.frames.length, w: spr.frames[0].w, h: spr.frames[0].h, anchorY: spr.anchorY, anims: {} };
  for (const [name, list] of Object.entries(anims)) {
    if (!list.length) continue;
    const s = list.map((i) => stats[i]);
    const feet = s.map((x) => x.feet), top = s.map((x) => x.top), cx = s.map((x) => x.cx);
    out.anims[name] = {
      frames: list,
      feet,
      top,
      cx,
      feetOff: Math.max(...feet.map((f) => Math.abs(f - (spr.anchorY - 1)))),
      feetSpread: Math.max(...feet) - Math.min(...feet),
      bob: Math.max(...top) - Math.min(...top),
      drift: +(Math.max(...cx) - Math.min(...cx)).toFixed(2),
    };
  }
  const idle0 = stats[anims.idle[0]];
  const colours = new Set();
  for (const s of stats) for (const c of s.colours) colours.add(c);
  const sum = (k) => stats.reduce((a, s) => a + s[k], 0);
  out.height = idle0.feet - idle0.top + 1;
  // How alive the upper body is: the share of its pixels (above the hips, the top 60% of the
  // body) that change from one frame of a cycle to the next. The game's knight walks at about
  // 74%, Lyra at 56%; a body carried along stiffly by its legs stays under 40%.
  const hip = idle0.feet - Math.round(out.height * 0.4);
  for (const [name, a] of Object.entries(out.anims)) {
    if (name === 'attack' || a.frames.length < 2) continue;
    let changed = 0, area = 0;
    a.frames.forEach((i, n) => {
      const A = spr.frames[i].buf.d, B = spr.frames[a.frames[(n + 1) % a.frames.length]].buf.d, w = spr.frames[i].w;
      for (let p = 0; p < Math.min(A.length, hip * w); p++) {
        const on = A[p] >>> 24 >= 128 || B[p] >>> 24 >= 128;
        if (!on) continue;
        area++;
        if (A[p] !== B[p]) changed++;
      }
    });
    a.upperChange = +(changed / Math.max(1, area)).toFixed(2);
  }
  // Doubled ink: outline pixels (the sprite's outline colour, the commonest on its edge) that
  // touch no colour at all, not even diagonally: the outer layer of a 2-px wall of ink, where a
  // 1-px line around colour always has colour beside it.
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const edgeColours = new Map();
  const each = (fn) => {
    for (const f of spr.frames) {
      const { w, h, d } = f.buf;
      const px = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const c = px(x, y);
          if (c >>> 24 < 128) continue;
          const outside = N4.filter(([dx, dy]) => px(x + dx, y + dy) >>> 24 < 128);
          if (outside.length) fn(c, x, y, outside, px);
        }
      }
    }
  };
  each((c) => edgeColours.set(c, (edgeColours.get(c) || 0) + 1));
  const inkColour = [...edgeColours].sort((a, b) => b[1] - a[1])[0]?.[0];
  let ink = 0, walls = 0;
  each((c, x, y, outside, px) => {
    if (c !== inkColour) return;
    ink++;
    let colour = false;
    for (let dy = -1; dy <= 1 && !colour; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const o = px(x + dx, y + dy);
        if ((dx || dy) && o >>> 24 >= 128 && o !== inkColour) {
          colour = true;
          break;
        }
      }
    }
    if (!colour) walls++;
  });
  out.inkWall = +(walls / Math.max(1, ink)).toFixed(2);
  // At night, on grass: the share of the first idle frame's pixels brighter than luma 150, and
  // the share still 20+ luma brighter than the forest's grass (#172425) when both are darkened
  // as the review boards' night view darkens them (NIGHT). Pessimistic (in the game the hero
  // carries his own light, and glowing parts draw unlit), but it ranks heroes as the game shows
  // them. (The reviewer's measure from src/BASELINE.md: knight 56%, Lyra 36%.)
  const grass = 0.299 * 0x17 * NIGHT[0] + 0.587 * 0x24 * NIGHT[1] + 0.114 * 0x25 * NIGHT[2], f0 = spr.frames[anims.idle[0]].buf.d;
  let lit = 0, bright = 0, clear = 0;
  for (const c of f0) {
    if (alpha(c) < 128) continue;
    lit++;
    if (luma(c) > 150) bright++;
    const night = 0.299 * (c & 255) * NIGHT[0] + 0.587 * ((c >>> 8) & 255) * NIGHT[1] + 0.114 * ((c >>> 16) & 255) * NIGHT[2];
    if (night >= grass + 20) clear++;
  }
  out.bright = +(bright / Math.max(1, lit)).toFixed(2);
  out.nightClear = +(clear / Math.max(1, lit)).toFixed(2);
  out.width = null;
  out.colours = colours.size;
  out.stray = sum('stray');
  out.islandShare = +(sum('islands') / Math.max(1, sum('pixels'))).toFixed(3);
  out.multiPart = stats.map((s, i) => (s.parts > 1 ? i : -1)).filter((i) => i >= 0);
  out.outline = +(sum('dark') / Math.max(1, sum('edge'))).toFixed(2);
  return out;
}

// One line about it, and what looks wrong.
export function verdict(m) {
  const notes = [];
  for (const [name, a] of Object.entries(m.anims)) {
    if (name !== 'attack' && a.feetSpread > 0) notes.push(`${name}: the feet don't stay on one row (rows ${[...new Set(a.feet)].join(',')})`);
    else if (name !== 'attack' && a.feetOff > 0) notes.push(`${name}: feet on row ${a.feet[0]}, but anchorY ${m.anchorY} wants them on ${m.anchorY - 1}`);
    if (name !== 'attack' && a.drift > 2.5) notes.push(`${name}: body slides ${a.drift} px across`);
    if (a.bob > 3) notes.push(`${name}: bobs ${a.bob} px`);
    if (name === 'walk' && a.upperChange !== undefined && a.upperChange < 0.4) notes.push(`walk: the upper body barely moves (${Math.round(a.upperChange * 100)}% of its pixels change per frame; the game's knight 74%, Lyra 56%)`);
    if (name === 'idle' && a.upperChange !== undefined && a.upperChange < 0.08) notes.push(`idle: nearly still (${Math.round(a.upperChange * 100)}% of the upper body changes per frame)`);
  }
  if (m.inkWall > 0.05) notes.push(`doubled ink: ${Math.round(m.inkWall * 100)}% of the outline is a 2-px wall touching no colour (the game's heroes: 0-4%)`);
  if (m.stray) notes.push(`${m.stray} stray pixel${m.stray > 1 ? 's' : ''}`);
  if (m.islandShare > 0.12) notes.push(`speckled: ${Math.round(m.islandShare * 100)}% of pixels share no edge with their colour`);
  if (m.outline < 0.8) notes.push(`outline only ${Math.round(m.outline * 100)}% dark`);
  if (m.multiPart.length) notes.push(`frames in pieces: ${m.multiPart.join(',')}`);
  if (m.nightClear < 0.4) notes.push(`hard to see at night: ${Math.round(m.nightClear * 100)}% of it clear of the grass (the bar: 50%, 40% for dark heroes)`);
  return { line: `${m.height} px tall · ${m.frames} frames (${Object.entries(m.anims).map(([k, a]) => `${k} ${a.frames.length}`).join(', ')}) · ${m.colours} colours · outline ${Math.round(m.outline * 100)}% · night ${Math.round(m.nightClear * 100)}%`, notes };
}
