import { sfx } from '../../engine/audio.js';
import { TAU } from '../../engine/util.js';
import { recordHeroAttack } from '../../game/hero-animation.js';
import { reachesFeet } from '../../game/hitbox.js';

const REACH = 118, RADIUS = 24, INWARD_SPEED = 105;
const MAX_SPOKES = 8, MAX_HITS = 12, MAX_CASTS = 6, FADE = 0.13;

function visible(world, x, y, tx, ty) {
  return !world.solid(tx, ty) && world.lineOfSight(x, y, tx, ty);
}

// Walk outward from the centre. A spoke starts before the first obstruction even if
// the stone has clear ground on its far side.
function freeDistance(world, x, y, dx, dy, limit) {
  let free = 0;
  for (let step = 2; step < limit; step += 2) {
    if (world.solid(x + dx * step, y + dy * step)) return free;
    free = step;
  }
  return world.solid(x + dx * limit, y + dy * limit) ? free : limit;
}

function previewTarget(w) {
  const { g } = w, p = g.player;
  return g.nearestEnemy(p.x, p.y, REACH, e => visible(g.world, p.x, p.y, e.x, e.y));
}

class Convergence {
  constructor(w, x, y, angle) {
    const { g, s } = w;
    this.w = w;
    this.weaponId = w.id;
    this.world = g.world;
    this.x = x;
    this.y = y;
    this.radius = Math.min(58, RADIUS * s.area);
    this.width = Math.min(8, 3.25 * s.area);
    this.travel = Math.min(0.48, Math.max(0.12, this.radius / (INWARD_SPEED * s.speed)));
    this.t = 0;
    this.dmg = s.dmg;
    this.kb = s.kb;
    this.evolved = w.evolved;
    this.left = Math.min(MAX_HITS, 3 + s.amount + s.pierce);
    this.hit = new Set();
    this.spokes = [];
    const count = Math.min(MAX_SPOKES, 3 + s.amount);
    for (let i = 0; i < count; i++) {
      const a = angle + i * TAU / count;
      const dx = Math.cos(a), dy = Math.sin(a);
      const distance = freeDistance(this.world, x, y, dx, dy, this.radius);
      if (distance > 2) this.spokes.push({ dx: dx * distance, dy: dy * distance });
    }
  }

  update(dt) {
    const from = 1 - this.t / this.travel;
    this.t += dt;
    if (this.dead || this.w.id !== this.weaponId || this.w.g.world !== this.world || this.t >= this.travel + FADE && from < 0) {
      this.dead = true;
      if (this.w.fx === this) this.w.fx = null;
      return false;
    }
    if (from >= 0 && this.left) this.sweep(from, Math.max(0, 1 - this.t / this.travel));
    return true;
  }

  sweep(from, to) {
    const { w, world, x, y, width } = this, { g } = w;
    const foes = g.grid.foes(x, y, this.radius + width);
    for (const { dx, dy } of this.spokes) {
      for (const e of foes) {
        if (e.dead || e.prop || e.spawnT > 0.3 || this.hit.has(e.id)) continue;
        if (!reachesFeet(e, x + dx * from, y + dy * from, x + dx * to, y + dy * to, width) ||
            !visible(world, x, y, e.x, e.y)) continue;
        this.hit.add(e.id);
        this.left--;
        const strong = e.boss || e.lord || e.elite;
        const length = Math.hypot(dx, dy);
        g.hitEnemy(e, this.dmg, { w, kb: strong ? 0 : this.kb, kx: -dx / length, ky: -dy / length });
        if (!this.left) return;
      }
    }
  }

  drawGround(ctx, cam) {
    if (this.dead || this.w.g.world !== this.world) return;
    const { S } = cam, pos = Math.max(0, 1 - this.t / this.travel);
    const cx = (this.x - cam.x) * S, cy = (this.y - cam.y) * S;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, Math.max(0, (this.travel + FADE - this.t) / FADE));
    ctx.fillStyle = this.evolved ? '#63c74d' : '#427f48';
    ctx.fillRect(Math.round(cx - 4 * S), Math.round(cy - S), 8 * S, 2 * S);
    ctx.fillRect(Math.round(cx - S), Math.round(cy - 4 * S), 2 * S, 8 * S);
    for (const { dx, dy } of this.spokes) {
      for (let j = 3; j >= 0; j--) {
        const k = Math.min(1, pos + j * 0.045);
        const x = Math.round(cx + dx * k * S), y = Math.round(cy + dy * k * S);
        ctx.fillStyle = j ? '#305347' : this.evolved ? '#c7f06a' : '#9ee562';
        ctx.fillRect(x - S, y - (j ? 2 : 5) * S, 2 * S, (j ? 2 : 6) * S);
      }
    }
    ctx.restore();
  }
}

export default {
  reach: REACH,
  previewTarget,
  fire(w) {
    const { g } = w, p = g.player, world = g.world;
    const active = (w.convergences || []).filter(cast => !cast.dead && cast.weaponId === w.id && cast.world === world);
    if (active.length >= MAX_CASTS) return 0.1;
    const target = w.hand ? w.handTarget : previewTarget(w);
    const aimed = target && !target.dead && visible(world, p.x, p.y, target.x, target.y);
    if (!aimed && !w.hand) return false;
    const ang = aimed ? Math.atan2(target.y - p.y, target.x - p.x) : p.strikeAng;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const distance = aimed ? 0 : freeDistance(world, p.x, p.y, dx, dy, 45);
    const x = aimed ? target.x : p.x + dx * distance;
    const y = aimed ? target.y : p.y + dy * distance;
    recordHeroAttack(w, ang);
    sfx('wood', { pitch: w.evolved ? 0.68 : 0.86, pan: dx * 0.25 });
    const cast = new Convergence(w, x, y, ang);
    active.push(cast);
    w.convergences = active;
    w.fx = cast;
    g.effects.push(cast);
  },
};
