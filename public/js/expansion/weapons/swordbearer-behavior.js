import { sfx } from '../../engine/audio.js';
import { TAU } from '../../engine/util.js';
import { faceAlong } from '../../game/facing.js';
import { slashFrame } from '../../game/fxsprites.js';
import { reachesBody, reachesFeet } from '../../game/hitbox.js';
import { recordHeroAttack } from '../../game/hero-animation.js';

const MOMENTUM_DISTANCE = 34, MOMENTUM_TTL = 0.9, ALIGNED = 0.76;
const REACH = 32, MAX_REACH = 76, HEIGHT = 8, CUT_TIME = 0.2, MAX_HITS = 8;
const STEEL = ['#4c4a65', '#8a8194', '#c3c8df', '#f1f5ff'];
const GOLD = ['#70402f', '#b96f3a', '#f6ba68', '#fff1c8'];

function accumulateStride(w, dt) {
  const { g } = w, p = g.player;
  if (w.march?.world !== g.world) {
    w.march = { world: g.world, x: p.x, y: p.y, dx: 0, dy: 0, progress: 0, lastStep: -Infinity };
    return;
  }
  const m = w.march;
  const x = p.x - m.x, y = p.y - m.y, dist = Math.hypot(x, y);
  m.x = p.x;
  m.y = p.y;
  if (g.clock - m.lastStep > MOMENTUM_TTL) m.progress = 0;
  if (!p.moving || p.held || p.leap || p.slide || dist < 0.02) return;
  if (dist > p.moveSpeed * dt + 1) {
    m.progress = 0; // a relocation or discontinuous position never winds up the blade
    return;
  }
  const dx = x / dist, dy = y / dist;
  if (dx * Math.cos(p.aim) + dy * Math.sin(p.aim) < ALIGNED) return;
  if (dx * m.dx + dy * m.dy < ALIGNED) m.progress = 0;
  m.dx = dx;
  m.dy = dy;
  m.progress = Math.min(MOMENTUM_DISTANCE, m.progress + dist * w.s.stride);
  m.lastStep = g.clock;
}

function swingPlan(w) {
  const { g } = w, p = g.player, m = w.march;
  const ready = m?.world === g.world && m.progress >= MOMENTUM_DISTANCE && g.clock - m.lastStep <= MOMENTUM_TTL;
  let ang = w.hand ? p.strikeAng : p.face < 0 ? Math.PI : 0;
  if (ready && !w.hand && faceAlong(p.face, m.dx, m.dy) === p.face &&
      (!p.moving || Math.cos(p.aim) * m.dx + Math.sin(p.aim) * m.dy >= ALIGNED)) {
    ang = Math.atan2(m.dy, m.dx);
  }
  const dx = Math.cos(ang), dy = Math.sin(ang);
  return { ang, dx, dy, charged: ready && dx * m.dx + dy * m.dy >= ALIGNED };
}

function targets(w, dx, dy, reach, width) {
  const { g } = w, { x, y } = g.player;
  const hits = [], tx = x + dx * reach, ty = y + dy * reach;
  for (const e of g.grid.foes(x, y, reach + width)) {
    if (e.dead || e.prop || e.spawnT > 0.3) continue;
    const ex = e.x - x, ey = e.y - y, along = ex * dx + ey * dy;
    if (along <= 0 || !g.world.lineOfSight(x, y, e.x, e.y)) continue;
    if (!reachesFeet(e, x, y, tx, ty, width) &&
        !reachesBody(e, x, y - HEIGHT, tx, ty - HEIGHT, width)) continue;
    hits.push({ e, along, distance: ex * ex + ey * ey });
  }
  return hits.sort((a, b) => a.distance - b.distance);
}

class MarchsteelCut {
  constructor(w, ang, reach, charged) {
    this.w = w;
    this.x = w.g.player.x;
    this.y = w.g.player.y - HEIGHT;
    this.ang = ang;
    this.reach = reach;
    this.charged = charged;
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    return !this.dead && this.t < CUT_TIME;
  }

  draw(ctx, cam) {
    const angle = Math.round(this.ang / TAU * 32), frame = Math.min(5, Math.floor(this.t / CUT_TIME * 6));
    const image = slashFrame(this.reach, 0.82, angle, frame, 6, this.charged ? GOLD : STEEL);
    const w = image.width * cam.S, h = image.height * cam.S;
    ctx.drawImage(image, Math.round((this.x - cam.x) * cam.S - w / 2), Math.round((this.y - cam.y) * cam.S - h / 2), w, h);
    // A straight spine inside the cut gives the greatsword a weightier shape
    // than the other crescent strikes. It never reaches beyond the existing cut.
    if (frame >= 3) return;
    const S = cam.S, dx = Math.cos(this.ang), dy = Math.sin(this.ang);
    ctx.save();
    ctx.globalAlpha *= 1 - this.t / (CUT_TIME * 0.5);
    for (let d = Math.ceil(this.reach * 0.35); d <= this.reach * 0.9; d++) {
      const edge = d >= this.reach * 0.68;
      const size = Math.max(1, Math.round((edge ? 1 : 2) * S));
      ctx.fillStyle = this.charged ? (edge ? '#fff1c8' : '#f6ba68') : '#c3c8df';
      ctx.fillRect(Math.round((this.x + dx * d - cam.x) * S - size / 2),
        Math.round((this.y + dy * d - cam.y) * S - size / 2), size, size);
    }
    ctx.restore();
  }
}

export default {
  reach: MAX_REACH,
  tick: accumulateStride,
  previewTarget(w) {
    const { x, y } = w.g.player, { dx, dy } = swingPlan(w);
    return { x: x + dx, y: y + dy };
  },
  fire(w) {
    const { g, s } = w, { ang, dx, dy, charged } = swingPlan(w);
    if (charged) w.march.progress = 0;
    const reach = Math.min(charged ? MAX_REACH : 52, REACH * s.area * (charged ? 1 + s.chargeReach : 1));
    const width = Math.min(15, (charged ? 9 : 7) * s.area);
    const budget = Math.min(MAX_HITS, s.amount + (charged ? 2 : 0));
    g.player.swing(ang);
    recordHeroAttack(w, ang);
    sfx('slash', { pitch: charged ? 0.71 : 0.87, pan: dx * 0.23 });
    g.effects.push(new MarchsteelCut(w, ang, reach, charged));
    for (const { e, along } of targets(w, dx, dy, reach, width).slice(0, budget)) {
      const edge = charged && along >= reach * 0.68;
      const kb = e.boss || e.lord || e.elite ? 0 : s.kb;
      g.hitEnemy(e, s.dmg * (edge ? 1 + s.edge : 1), { w, kb, kx: dx, ky: dy });
    }
  },
};
