// What of game/topology's ground moves, drawn each frame (28 October 2026): canvas only, for the game
// alone (the Node tools leave it out; topology/paint.js paints the still ground). The Abyss's lava
// turning in its 32 px tiles (the crypts' baked lava, as the Dungeon's pools: dungeon.js drawLava), the
// sinking swirl over each of the Sunscorch's quicksand pools, and the tells: every pool and ice sheet
// near the hero outlined over the horde, so none is ever hidden under its feet (REQS2: readable).

import { SPR, bufToCanvas } from '../../engine/sprites.js';
import { hash2, makeCanvas } from '../../engine/util.js';
import { bakedBuffers } from '../../art/baked.js';
import CRYPT_ART from '../../../assets/art/crypts.js';

const T = 32; // the lava's tiles (TerrainChunk.lavaTiles), as the baked art is
let LAVA = null; // its frames as canvases, made when first wanted

// The chunk's wholly-lava tiles, each on its own phase (by where it lies in the world), the frames at
// the art's own pace.
export function drawLavaTiles(ctx, cam, time, tc) {
  if (!LAVA) LAVA = bakedBuffers(CRYPT_ART.lava).map(bufToCanvas);
  const S = cam.S, n = LAVA.length, fps = CRYPT_ART.lava.fps || 6, L = tc.lavaTiles;
  // World pixels to the screen's, rounded alike for every tile, so neighbours neither gap nor overlap.
  const sx = (wx) => Math.round((wx - cam.x) * S), sy = (wy) => Math.round((wy - cam.y) * S);
  for (let q = 0; q < L.length; q += 2) {
    const x = tc.x0 + L[q] * T, y = tc.y0 + L[q + 1] * T;
    if (x + T < cam.x || y + T < cam.y || x > cam.x + cam.W || y > cam.y + cam.H) continue;
    const f = LAVA[Math.floor(time * fps + hash2(tc.cx * 8 + L[q], tc.cy * 8 + L[q + 1], 5) * n) % n];
    const X = sx(x), Y = sy(y);
    ctx.drawImage(f, X, Y, sx(x + T) - X, sy(y + T) - Y);
  }
}

// A quicksand pool's sinking swirl: its sprite (art/terrain.js fx_quicksand), turning at 5 frames a
// second.
export function drawSwirls(ctx, cam, time, p) {
  const S = cam.S, X = (p.x - cam.x) * S, Y = (p.y - cam.y) * S, spr = SPR.fx_quicksand;
  if (!spr || X < -p.ext * S || Y < -p.ext * S || X > cam.pxW + p.ext * S || Y > cam.pxH + p.ext * S) return;
  const fr = spr.frames[Math.floor(time * 5) % spr.frames.length].c, w = fr.width * S, h = fr.height * S;
  ctx.globalAlpha = 0.55;
  ctx.drawImage(fr, Math.round(X - w / 2), Math.round(Y - h / 2), w, h);
  ctx.globalAlpha = 1;
}

// A patch's outline (its 48 points round the rim) in the tell's colour, one art pixel wide, at half
// alpha: traced once a pixel at a time into a canvas of its own (traceTell, made when first drawn),
// then drawn as a sprite is, on the art's grid. Stroked as a path each frame it was an antialiased
// curve thinner than an art pixel, the one vector line in a pixel world (graphics review world-13,
// 22 November 2026).
export function drawTells(ctx, cam, p, color) {
  let t = p._tellArt;
  if (!t || t.color !== color) t = p._tellArt = traceTell(p, color);
  const S = cam.S, X = Math.round((t.x - cam.x) * S), Y = Math.round((t.y - cam.y) * S);
  ctx.globalAlpha = 0.5;
  ctx.drawImage(t.img, X, Y, Math.round((t.x + t.img.width - cam.x) * S) - X, Math.round((t.y + t.img.height - cam.y) * S) - Y);
  ctx.globalAlpha = 1;
}

// The rim's pixels: from each point to the next a pixel at a time along the longer axis (as
// Bresenham's), each the world pixel the line passes through.
function traceTell(p, color) {
  const pts = p.pts, n = pts.length / 2;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let k = 0; k < n; k++) {
    x0 = Math.min(x0, Math.floor(pts[2 * k]));
    x1 = Math.max(x1, Math.floor(pts[2 * k]));
    y0 = Math.min(y0, Math.floor(pts[2 * k + 1]));
    y1 = Math.max(y1, Math.floor(pts[2 * k + 1]));
  }
  const img = makeCanvas(x1 - x0 + 1, y1 - y0 + 1), g = img.getContext('2d');
  g.fillStyle = color;
  for (let k = 0; k < n; k++) {
    const ax = pts[2 * k], ay = pts[2 * k + 1], bx = pts[(2 * k + 2) % (2 * n)], by = pts[(2 * k + 3) % (2 * n)];
    const m = Math.max(1, Math.round(Math.max(Math.abs(bx - ax), Math.abs(by - ay))));
    for (let i = 0; i < m; i++) g.fillRect(Math.floor(ax + ((bx - ax) * i) / m) - x0, Math.floor(ay + ((by - ay) * i) / m) - y0, 1, 1);
  }
  return { img, x: x0, y: y0, color };
}
