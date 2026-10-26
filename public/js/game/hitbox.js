// Hitboxes as drawn. The owner's (26 October 2026): "The hitbox should be (at least) the whole
// monster or box as is drawn. And the hitbox of weapon should be (at least) as big as the
// projectile" (Ranger arrows flew through boxes without breaking them).
//
// A foe is struck in two places, either one will do:
// - where it stands: a disc round its feet as wide as it is drawn (Enemy.hr, never less than its
//   body r). Blows on the ground (a blast, an aura, a pool, a quake) go by this alone, so a pool
//   still burns the feet and not the head of one standing in front of it;
// - its body as drawn this frame (Enemy.body): the box its picture's opaque pixels fill. Anything
//   drawn in the air (a missile, an orbiting blade, a beam) strikes it there too, where it is drawn
//   (its z above the ground) with its shape as drawn, swept along its way since the last frame so
//   a fast one never skips a foe between two frames.

// A foe's body as drawn reaches at most this far from its feet; the few drawn larger (bosses,
// lords, big champions: Enemy.reach) the grid keeps apart and always hands over (grid.js foes).
export const FOE_REACH = 32;

// The distance from point P to segment AB.
export function pointSegGap(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy;
  const t = L2 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / L2)) : 0;
  return Math.hypot(px - ax - t * vx, py - ay - t * vy);
}

const pointBoxGap = (px, py, x0, y0, x1, y1) => Math.hypot(Math.max(x0 - px, 0, px - x1), Math.max(y0 - py, 0, py - y1));

// Clipping a segment to a box (Liang-Barsky): the part of it, T0 to T1 of the way, still in.
let T0 = 0, T1 = 1;
function clip(p, q) {
  if (p === 0) return q >= 0;
  const r = q / p;
  if (p < 0) {
    if (r > T1) return false;
    if (r > T0) T0 = r;
  } else {
    if (r < T0) return false;
    if (r < T1) T1 = r;
  }
  return true;
}

// The distance from segment AB to the box (x0, y0)-(x1, y1): 0 where they meet. Apart, the
// nearest of its two ends to the box, or of the box's four corners to it.
export function segBoxGap(ax, ay, bx, by, x0, y0, x1, y1) {
  const dx = bx - ax, dy = by - ay;
  T0 = 0;
  T1 = 1;
  if (clip(-dx, ax - x0) && clip(dx, x1 - ax) && clip(-dy, ay - y0) && clip(dy, y1 - ay)) return 0;
  return Math.min(
    pointBoxGap(ax, ay, x0, y0, x1, y1), pointBoxGap(bx, by, x0, y0, x1, y1),
    pointSegGap(x0, y0, ax, ay, bx, by), pointSegGap(x1, y0, ax, ay, bx, by),
    pointSegGap(x0, y1, ax, ay, bx, by), pointSegGap(x1, y1, ax, ay, bx, by),
  );
}

// Whether a shape on the ground, swept from A to B and r wide either side, reaches foe e's feet.
export const reachesFeet = (e, ax, ay, bx, by, r) => pointSegGap(e.x, e.y, ax, ay, bx, by) <= r + e.hr;

// Whether a shape as drawn on the screen (world px, its height already taken off its y), swept
// from A to B and r wide either side, touches foe e's body as drawn.
export function reachesBody(e, ax, ay, bx, by, r) {
  const b = e.body();
  return segBoxGap(ax, ay, bx, by, b[0], b[1], b[2], b[3]) <= r;
}

// A sprite's body from its feet over all its frames, at scale 1 (Enemy.init): how far to either
// side of them (side) and above them (up) any frame is drawn. Its feet are where Enemy.draw puts
// them: the frame centred on x, its bottom row `below` rows under the feet.
export function spriteExtent(spr) {
  if (!spr._ext) {
    let side = 0, up = 0;
    for (const fr of spr.frames) {
      const b = fr.box, half = fr.w / 2;
      side = Math.max(side, half - b[0], b[2] - half);
      up = Math.max(up, fr.h - spr.below - b[1]);
    }
    spr._ext = { side, up };
  }
  return spr._ext;
}

// The widest any of a sprite's frames is drawn turned some way: its farthest pixel from the centre.
export function spriteRadius(spr) {
  let r = 0;
  for (const fr of spr.frames) r = Math.max(r, fr.radius);
  return r;
}
