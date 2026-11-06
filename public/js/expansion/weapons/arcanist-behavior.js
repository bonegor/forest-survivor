import { sfx } from '../../engine/audio.js';
import { clamp } from '../../engine/util.js';
import { recordHeroAttack } from '../../game/hero-animation.js';
import { reachesFeet } from '../../game/hitbox.js';

const REACH = 132, FALLBACK_DISTANCE = 48, EDGE = 3.5, TAIL = 0.11, MAX_HITS = 10;

function visible(world, x, y, tx, ty) {
  return !world.solid(tx, ty) && world.lineOfSight(x, y, tx, ty);
}

function targetInReach(w) {
  const { g } = w, p = g.player;
  return g.nearestEnemy(p.x, p.y, REACH, e => visible(g.world, p.x, p.y, e.x, e.y));
}

class MeridianSweep {
  constructor(w, angle, radius, direction) {
    const { g, s } = w;
    this.w = w;
    this.world = g.world;
    this.x = g.player.x;
    this.y = g.player.y;
    this.start = angle - direction * s.sweep;
    this.arc = 2 * direction * s.sweep;
    this.radius = radius;
    this.edge = EDGE * s.area;
    this.steps = Math.max(1, Math.ceil(Math.abs(this.arc * radius) / 5));
    this.charges = Math.min(MAX_HITS, 3 + s.amount);
    this.damage = s.dmg;
    this.dur = clamp(0.26 / s.speed, 0.1, 0.42);
    this.evolved = w.evolved;
    this.hit = new Set();
    this.t = 0;
    this.progress = 0;
  }

  point(progress) {
    const angle = this.start + this.arc * progress;
    return [this.x + Math.cos(angle) * this.radius, this.y + Math.sin(angle) * this.radius];
  }

  cut(a, b) {
    const { w, world, x, y } = this, [ax, ay] = a, [bx, by] = b;
    if (!visible(world, x, y, ax, ay) || !visible(world, x, y, bx, by) ||
        !world.lineOfSight(ax, ay, bx, by)) return;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    for (const e of w.g.grid.foes(mx, my, Math.hypot(bx - ax, by - ay) / 2 + this.edge)) {
      if (!this.charges) break;
      if (e.dead || e.prop || e.spawnT > 0.3 || this.hit.has(e.id) ||
          !reachesFeet(e, ax, ay, bx, by, this.edge) || !visible(world, x, y, e.x, e.y)) continue;
      this.hit.add(e.id);
      this.charges--;
      w.g.hitEnemy(e, this.damage, { w, type: 'shock', kb: 0 });
    }
  }

  update(dt) {
    if (this.dead || this.world !== this.w.g.world) return false;
    this.t += dt;
    const end = Math.min(1, this.t / this.dur);
    // Subdivide the arc so a slow frame still sweeps the curve and respects narrow walls.
    let progress = this.progress;
    let a = this.point(progress);
    while (this.charges && progress < end) {
      progress = Math.min(end, progress + 1 / this.steps);
      const b = this.point(progress);
      this.cut(a, b);
      a = b;
    }
    this.progress = end;
    return this.t < this.dur + TAIL;
  }

  drawGround(ctx, cam) {
    const fade = clamp((this.dur + TAIL - this.t) / TAIL, 0, 1);
    const trail = Math.min(0.28, this.progress);
    const { S } = cam;
    ctx.save();
    for (let i = 6; i >= 0; i--) {
      const [x, y] = this.point(this.progress - trail * i / 6);
      if (!visible(this.world, this.x, this.y, x, y)) continue;
      const sx = Math.round((x - cam.x) * S), sy = Math.round((y - cam.y) * S);
      const r = Math.max(1, Math.round((i === 0 ? this.edge : 2) * S));
      ctx.globalAlpha = fade * (1 - i / 8);
      ctx.fillStyle = this.evolved ? '#8f5bb0' : '#5b3566';
      ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      ctx.fillStyle = i === 0 ? '#f0c5fb' : this.evolved ? '#c789ed' : '#a868bd';
      const core = Math.max(1, Math.round(r * 0.55));
      ctx.fillRect(sx - core, sy - core, core * 2, core * 2);
    }
    ctx.restore();
  }
}

export default {
  reach: REACH,
  previewTarget: targetInReach,
  fire(w) {
    const { g } = w, p = g.player;
    const target = w.hand ? w.handTarget : targetInReach(w);
    if (!target && !w.hand) return false;
    const aimed = target && !target.dead && visible(g.world, p.x, p.y, target.x, target.y);
    const ang = w.hand ? p.strikeAng : Math.atan2(target.y - p.y, target.x - p.x);
    const radius = aimed ? Math.min(REACH, Math.hypot(target.x - p.x, target.y - p.y)) : FALLBACK_DISTANCE;
    w.meridianDirection = -(w.meridianDirection || -1);
    recordHeroAttack(w, ang);
    g.effects.push(new MeridianSweep(w, ang, radius, w.meridianDirection));
    sfx('shard', { pitch: 1.25, pan: Math.cos(ang) * 0.25 });
  },
};
