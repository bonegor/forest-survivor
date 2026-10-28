// What of game/topology's ground moves, drawn each frame (28 October 2026): canvas only, for the game
// alone (the Node tools leave it out; topology/paint.js paints the still ground). The Abyss's lava
// turning in its 32 px tiles (the crypts' baked lava, as the Dungeon's pools: dungeon.js drawLava), the
// sinking swirl over each of the Sunscorch's quicksand pools, and the tells: every pool and ice sheet
// near the hero outlined over the horde, so none is ever hidden under its feet (REQS2: readable).

import { SPR, bufToCanvas } from '../../engine/sprites.js';
import { hash2 } from '../../engine/util.js';
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

// A patch's outline (its 48 points round the rim) in the tell's colour, 1 world px, at half alpha.
export function drawTells(ctx, cam, p, color) {
  const S = cam.S, pts = p.pts, n = pts.length / 2;
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = color;
  ctx.lineWidth = S;
  ctx.beginPath();
  ctx.moveTo((pts[0] - cam.x) * S, (pts[1] - cam.y) * S);
  for (let k = 1; k < n; k++) ctx.lineTo((pts[2 * k] - cam.x) * S, (pts[2 * k + 1] - cam.y) * S);
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 1;
}
