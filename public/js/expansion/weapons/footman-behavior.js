import { sfx } from '../../engine/audio.js';
import { TAU } from '../../engine/util.js';
import { stunFoe } from '../../game/effects.js';
import { slashFrame } from '../../game/fxsprites.js';
import { reachesBody, reachesFeet } from '../../game/hitbox.js';
import { recordHeroAttack } from '../../game/hero-animation.js';

const CUT_REACH = 34, CUT_HEIGHT = 7, CUT_TIME = 0.16;
const SHOCK_REACH = 27, SHOCK_TIME = 0.23, SHOCK_DELAY = 0.11;
const CUT_ARC = 0.9, SHOCK_ARC = 2.25;
const STEEL = ['#575c74', '#8397a5', '#c0cbdc', '#e8f4ff'];
const BRONZE = ['#683e34', '#b87848', '#f5bf72', '#fff1cb'];

const ahead = (p) => p.face < 0 ? Math.PI : 0;
const enemy = (e) => !e.dead && !e.prop && e.spawnT <= 0.3;

function leadTarget(w, ang) {
  const { g, s } = w, p = g.player;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const reach = CUT_REACH * s.area, halfWidth = 10 * s.area;
  const endX = p.x + dx * reach, endY = p.y + dy * reach;
  let first = null, closest = Infinity;
  for (const e of g.grid.foes(p.x, p.y, reach + halfWidth)) {
    if (!enemy(e)) continue;
    const x = e.x - p.x, y = e.y - p.y, distance = x * x + y * y;
    if (distance >= closest || x * dx + y * dy < 0) continue;
    if (!reachesFeet(e, p.x, p.y, endX, endY, halfWidth)
      && !reachesBody(e, p.x, p.y - CUT_HEIGHT, endX, endY - CUT_HEIGHT, halfWidth)) continue;
    if (!g.world.lineOfSight(p.x, p.y, e.x, e.y)) continue;
    first = e;
    closest = distance;
  }
  return first;
}

function drawCut(ctx, cam, x, y, radius, arc, ang, progress, palette) {
  const angleIndex = Math.round(ang / TAU * 32);
  const frame = Math.min(5, Math.floor(progress * 6));
  const image = slashFrame(radius, arc, angleIndex, frame, 6, palette);
  const w = image.width * cam.S, h = image.height * cam.S;
  const sx = Math.round((x - cam.x) * cam.S - w / 2);
  const sy = Math.round((y - cam.y) * cam.S - h / 2);
  ctx.drawImage(image, sx, sy, Math.round(w), Math.round(h));
}

// A single impact through the lead foe's rank. The source ID is captured before it can
// die and its pooled object can be reused. Each other foe can take at most one shock hit.
class RankShock {
  constructor(w, first, ang) {
    this.w = w;
    this.sourceId = first.id;
    this.x = first.x;
    this.y = first.y;
    this.ang = ang;
    this.radius = SHOCK_REACH * w.s.area;
    this.limit = w.s.amount + 2;
    this.damage = w.s.dmg * (w.def.evolved ? 0.66 : 0.58);
    this.knockback = w.s.kb * 0.55;
    this.t = 0;
  }

  update(dt) {
    const before = this.t;
    this.t += dt;
    if (before < SHOCK_DELAY && this.t >= SHOCK_DELAY) this.impact();
    return this.t < SHOCK_TIME;
  }

  impact() {
    const { w, x, y, radius } = this, g = w.g;
    const dx = Math.cos(this.ang), dy = Math.sin(this.ang);
    const hits = [];
    for (const e of g.grid.foes(x, y, radius)) {
      if (!enemy(e) || e.id === this.sourceId) continue;
      const ex = e.x - x, ey = e.y - y, gap = Math.hypot(ex, ey);
      const along = ex * dx + ey * dy;
      if (along <= 0 || gap > radius + e.hr || along < gap * Math.cos(SHOCK_ARC / 2)) continue;
      if (!g.world.lineOfSight(x, y, e.x, e.y)) continue;
      hits.push([gap, e]);
    }
    hits.sort((a, b) => a[0] - b[0]);
    for (const [, e] of hits.slice(0, this.limit)) {
      g.hitEnemy(e, this.damage, { w, kb: this.knockback, kx: dx, ky: dy });
    }
  }

  draw(ctx, cam) {
    drawCut(ctx, cam, this.x, this.y - 2, this.radius, SHOCK_ARC, this.ang, this.t / SHOCK_TIME, BRONZE);
    // The delayed impact breaks forward through the next rank. Three short
    // bronze splinters stay inside its existing sector and vanish with it.
    if (this.t < SHOCK_DELAY) return;
    const progress = Math.min(1, (this.t - SHOCK_DELAY) / (SHOCK_TIME - SHOCK_DELAY)), S = cam.S;
    const size = Math.max(1, Math.round(S));
    ctx.save();
    ctx.globalAlpha *= 1 - progress;
    for (const offset of [-0.42, 0, 0.42]) {
      const dx = Math.cos(this.ang + offset), dy = Math.sin(this.ang + offset);
      const distance = this.radius * (0.3 + progress * 0.4);
      for (let i = 0; i < 4; i++) {
        const d = distance + i;
        ctx.fillStyle = i === 3 ? '#fff1cb' : '#b87848';
        ctx.fillRect(Math.round((this.x + dx * d - cam.x) * S),
          Math.round((this.y - 2 + dy * d - cam.y) * S), size, size);
      }
    }
    ctx.restore();
  }
}

export default {
  reach: 56,
  previewTarget(w) {
    return leadTarget(w, ahead(w.g.player));
  },
  fire(w) {
    const { g, s } = w, p = g.player;
    const initial = w.hand ? p.strikeAng : ahead(p);
    const target = leadTarget(w, initial);
    const ang = target && !w.hand ? Math.atan2(target.y - p.y, target.x - p.x) : initial;
    let t = 0;
    p.swing(ang);
    recordHeroAttack(w, ang);
    sfx('slash', { pitch: 0.82, pan: Math.cos(ang) * 0.22 });
    g.effects.push({
      update(dt) { t += dt; return t < CUT_TIME; },
      draw(ctx, cam) { drawCut(ctx, cam, p.x, p.y - CUT_HEIGHT, CUT_REACH * s.area, CUT_ARC, ang, t / CUT_TIME, STEEL); },
    });
    if (!target) return;
    g.effects.push(new RankShock(w, target, ang));
    const dealt = g.hitEnemy(target, s.dmg, { w, kb: s.kb, kx: Math.cos(ang), ky: Math.sin(ang) });
    if (dealt && !target.boss && !target.lord && !target.elite) stunFoe(target, s.dur);
  },
};
