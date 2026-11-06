import { sfx } from '../../engine/audio.js';
import { clamp } from '../../engine/util.js';
import { reachesFeet } from '../../game/hitbox.js';
import { recordHeroAttack } from '../../game/hero-animation.js';

const REACH = 33, HALF_WIDTH = 17, THICKNESS = 2, MAX_CHARGES = 10;

function openLine(world, x, y, toX, toY) {
  return !world.solid(toX, toY) && world.lineOfSight(x, y, toX, toY);
}

// Dungeon sight checks intermediate points, so check the endpoint separately.
function wardEnd(world, x, y, dx, dy, distance) {
  for (let d = distance; d > 0; d -= 2) {
    const endX = x + dx * d, endY = y + dy * d;
    if (openLine(world, x, y, endX, endY)) return [endX, endY];
  }
  return [x, y];
}

function targetAhead(w) {
  const p = w.g.player;
  return w.g.nearestEnemy(p.x, p.y, REACH * w.s.area, e =>
    (e.x - p.x) * p.face >= 0 && openLine(w.g.world, p.x, p.y, e.x, e.y));
}

class VotiveWard {
  constructor(w, x, y, angle) {
    const { g, s } = w;
    const sideX = -Math.sin(angle), sideY = Math.cos(angle);
    this.w = w;
    this.world = g.world;
    this.x = x;
    this.y = y;
    this.width = HALF_WIDTH * s.area;
    this.a = wardEnd(this.world, x, y, sideX, sideY, this.width);
    this.b = wardEnd(this.world, x, y, -sideX, -sideY, this.width);
    this.thick = THICKNESS * s.area;
    this.dur = Math.min(s.dur, 1.9);
    this.damage = s.dmg;
    this.slow = s.slow;
    this.charges = Math.min(MAX_CHARGES, 4 + s.amount);
    this.evolved = w.def.evolved;
    this.hit = new Set();
    this.t = 0;
  }

  strike() {
    const { w, world, x, y, a, b } = this;
    if (!this.charges) return;
    const hits = [];
    for (const e of w.g.grid.foes(x, y, this.width + this.thick)) {
      if (e.dead || e.prop || e.spawnT > 0.3 || this.hit.has(e.id)) continue;
      if (!reachesFeet(e, ...a, ...b, this.thick) || !openLine(world, x, y, e.x, e.y)) continue;
      hits.push(e);
    }
    hits.sort((first, second) => ((first.x - x) ** 2 + (first.y - y) ** 2) -
      ((second.x - x) ** 2 + (second.y - y) ** 2) || first.id - second.id);
    for (const e of hits) {
      if (!this.charges) break;
      if (e.dead) continue;
      this.hit.add(e.id);
      this.charges--;
      const slow = e.boss || e.lord || e.elite ? 0 : this.slow;
      w.g.hitEnemy(e, this.damage, { w, type: 'holy', slow, slowT: 0.7, kb: 0 });
    }
  }

  update(dt) {
    this.t += dt;
    if (this.dead || this.t >= this.dur || this.w.g.world !== this.world) {
      if (this.w.fx === this) this.w.fx = null;
      return false;
    }
    this.strike();
    return true;
  }

  drawGround(ctx, cam) {
    const [ax, ay] = this.a, [bx, by] = this.b;
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    const S = cam.S;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, (this.dur - this.t) * 5) * (this.charges ? 1 : 0.35);
    for (const rim of [true, false]) {
      for (let i = 0; i <= steps; i++) {
        const x = Math.round((ax + (bx - ax) * i / steps - cam.x) * S);
        const y = Math.round((ay + (by - ay) * i / steps - cam.y) * S);
        const rune = i % 6 === 0;
        const size = ((rim ? 3 : 1) + (rune ? 2 : 0)) * S;
        ctx.fillStyle = rim ? '#855638' : rune ? '#fff6c2' : this.evolved ? '#fee761' : '#f4b95e';
        ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), Math.ceil(size), Math.ceil(size));
      }
    }
    ctx.restore();
  }
}

export default {
  reach: 42,
  previewTarget: targetAhead,
  fire(w) {
    const { g, s } = w, p = g.player;
    const target = w.hand ? w.handTarget : targetAhead(w);
    const canAim = target && !target.dead && openLine(g.world, p.x, p.y, target.x, target.y);
    const ang = w.hand ? p.strikeAng : canAim ? Math.atan2(target.y - p.y, target.x - p.x) : p.face < 0 ? Math.PI : 0;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const distance = canAim ? (target.x - p.x) * dx + (target.y - p.y) * dy : 24 * s.area;
    const [x, y] = wardEnd(g.world, p.x, p.y, dx, dy, clamp(distance, 4, REACH * s.area));
    p.swing(ang);
    recordHeroAttack(w, ang);
    sfx('slash', { pitch: 1.22, pan: dx * 0.25 });
    if (Math.hypot(x - p.x, y - p.y) < 2) return;
    if (w.fx) w.fx.dead = true;
    const ward = new VotiveWard(w, x, y, ang);
    w.fx = ward;
    g.effects.push(ward);
    ward.strike();
  },
};
