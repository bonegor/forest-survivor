// The horde over the hero's weapons: the owner's (27 October 2026) "monsters and enemies, they
// should be above weapons", after "Hero must always be on top of everything" (Game.drawHero). The
// weapons' shots and blasts (their draw) and their glows (drawGlow) go over the scene as before,
// over the trees, boxes and shrines; but what shows of the monsters is first kept aside
// (keepHorde) and put back over them (putHorde), so no monster is under a weapon. What shows of
// them is a mask (maskHorde) built in the order Game.draw drew the scene: each monster and raised
// dead as drawn, and whatever stands in front of one (a tree, a box, a shrine, a crypt) cutting
// its own shape out of it, so a foe behind a tree stays behind it; then the bosses over them all
// (maskBosses). Kept and put back twice a frame: before the lighting for the shots and blasts,
// and after it, the horde lifted out of the dark by then, for their glows.

import { makeCanvas } from '../engine/util.js';

let maskC = null, keepC = null;

// A canvas the size of the screen, made once and resized with it.
function screen(c, cam) {
  if (!c) c = makeCanvas(cam.pxW, cam.pxH);
  if (c.width !== cam.pxW || c.height !== cam.pxH) {
    c.width = cam.pxW;
    c.height = cam.pxH;
  }
  return c;
}

// A monster as Enemy.draw drew it (its picture over its rectangle, at its alpha) or a raised dead
// as Minion.draw did; none still rising out of the ground, only part of it shown. Whether drawn.
function drawShape(m, o, cam) {
  if (o.minion) {
    if (o.rise > 0) return false;
    const { img, X, Y, w, h } = o.rect(cam);
    m.globalAlpha = o.life < 1 ? o.life : 1;
    m.drawImage(img, X, Y, w, h);
    return true;
  }
  const r = o._rect;
  if (!r || !o._img || (o.spawnT > 0 && o.def.rise)) return false;
  let a = o.alpha < 1 ? o.alpha : 1;
  if (o.spawnT > 0) a *= 1 - o.spawnT / o.spawnMax;
  m.globalAlpha = a;
  m.drawImage(o._img, Math.round(r[0]), Math.round(r[1]), Math.round(r[2]), Math.round(r[3]));
  return true;
}

// The mask's context, the size of the screen.
function maskContext(cam) {
  return (maskC = screen(maskC, cam)).getContext('2d');
}

// The mask of the monsters among the scene's y-sorted figures (`list`, drawn in its order), the
// hero (`p`) left out: he is drawn over all of it. Whether any shows. `m`: the mask's context
// (tests pass their own).
export function maskHorde(cam, list, p, m = maskContext(cam)) {
  m.globalCompositeOperation = 'source-over';
  m.globalAlpha = 1;
  m.imageSmoothingEnabled = false;
  m.clearRect(0, 0, cam.pxW, cam.pxH);
  let any = false;
  for (const o of list) {
    if (o === p) continue;
    if (o.minion || (o.def && !o.prop)) {
      m.globalCompositeOperation = 'source-over';
      if (drawShape(m, o, cam)) any = true;
    } else if (any && o._rect) {
      // Not a monster: cuts its shape out of those behind it, exactly where it was drawn.
      const r = o._rect;
      m.globalCompositeOperation = 'destination-out';
      m.globalAlpha = 1;
      if (o.def) m.drawImage(o._img, Math.round(r[0]), Math.round(r[1]), Math.round(r[2]), Math.round(r[3]));
      else m.drawImage(r[4].get(r[5]), r[0], r[1], r[2], r[3]);
    }
  }
  m.globalCompositeOperation = 'source-over';
  m.globalAlpha = 1;
  return any;
}

// The bosses and crypt lords, drawn over everything of the world, added to the mask. Whether any
// monster shows now.
export function maskBosses(cam, tops, any, m = maskContext(cam)) {
  if (!tops.length) return any;
  for (const e of tops) if (drawShape(m, e, cam)) any = true;
  m.globalAlpha = 1;
  return any;
}

// What shows of the monsters on the screen now (ctx: the screen's own context), kept aside.
export function keepHorde(ctx, cam) {
  const k = (keepC = screen(keepC, cam)).getContext('2d');
  k.globalAlpha = 1;
  k.globalCompositeOperation = 'copy';
  k.drawImage(ctx.canvas, 0, 0);
  k.globalCompositeOperation = 'destination-in';
  k.drawImage(maskC, 0, 0);
  k.globalCompositeOperation = 'source-over';
}

// The monsters as they were kept, back over what has been drawn since.
export function putHorde(ctx) {
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.drawImage(keepC, 0, 0);
  ctx.globalCompositeOperation = op;
}
