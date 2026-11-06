import { sfx } from '../../engine/audio.js';
import { recordHeroAttack } from '../../game/hero-animation.js';
import { reachesBody, reachesFeet } from '../../game/hitbox.js';
import { P, PC } from '../../game/particles.js';
import { Projectile } from '../../game/projectiles.js';

const REACH = 198;
const HEIGHT = 12;
const MAX_IMPACTS = 8;
const WALL_STEP = 3;
const CHARGED_GLOW = ['#fee761', 14];

const strong = e => e.boss || e.lord || e.elite;

// A higher-pressure bolt needs an ordered sweep so stacked foes are struck by the
// shaft in front-to-back order even when they share a grid cell.
class RatchetBolt extends Projectile {
  constructor(w, ang) {
    super();
    const { g, s } = w, p = g.player;
    const speed = Math.min(700, 295 * s.speed);
    const range = Math.min(330, 226 * s.dur);
    this.init(g, {
      kind: 'ratchetBolt', sprite: 'silverbolt', w, x: p.x, y: p.y, z: HEIGHT, ang, speed,
      life: range / speed, scale: 1.25, r: Math.min(4, 1.8 * s.area), dmg: s.dmg, kb: s.kb,
    });
    this.world = g.world;
    this.dur = this.life;
    this.charge = 0;
    this.crank = s.crank;
    this.crankCap = s.crankCap;
    this.left = Math.min(MAX_IMPACTS, s.pierce + s.amount);
    this.dx = Math.cos(ang);
    this.dy = Math.sin(ang);
  }

  update(dt) {
    const { g, world, dx, dy } = this;
    if (this.dead || world !== g.world || this.t >= this.dur) return false;
    const t = Math.min(dt, this.dur - this.t);
    const ox = this.x, oy = this.y;
    const length = Math.hypot(this.vx, this.vy) * t;
    let travel = length;
    const steps = Math.ceil(length / WALL_STEP);
    for (let i = 1; i <= steps; i++) {
      const d = length * i / steps;
      if (world.solid(ox + dx * d, oy + dy * d)) {
        travel = length * (i - 1) / steps;
        break;
      }
    }
    this.t += t;
    this.x = ox + dx * travel;
    this.y = oy + dy * travel;
    if (travel > 0 && !this.sweep(ox, oy, travel, travel < length)) return false;
    this.trailT -= t;
    if (this.trailT <= 0) {
      this.trailT = 0.04;
      g.particles.emit(this.x, this.y, this.z, 0, 0, 0, 0.16, 1, this.charge ? PC.Y : PC.G, P.FADE, 0);
    }
    return travel === length && this.t < this.dur;
  }

  sweep(ox, oy, travel, clipped) {
    const { g, w, world, dx, dy, x, y, hl, hw, z } = this;
    const wing = travel / 2 + hl + hw + z;
    const candidates = g.grid.foes((x + ox) / 2, (y + oy) / 2, wing);
    const hits = [];
    for (const e of candidates) {
      if (e.dead || this.hits.has(e.id) || e.spawnT > 0.3) continue;
      const along = (e.x - ox) * dx + (e.y - oy) * dy;
      if (clipped && along > travel) continue;
      if (!reachesFeet(e, ox, oy, x, y, this.r) &&
          !reachesBody(e, ox - dx * hl, oy - z - dy * hl, x + dx * hl, y - z + dy * hl, hw)) continue;
      if (world.solid(e.x, e.y) || !world.lineOfSight(ox, oy, e.x, e.y)) continue;
      hits.push({ e, id: e.id, along });
    }
    hits.sort((a, b) => a.along - b.along || a.id - b.id);
    for (const { e, id } of hits) {
      if (e.dead || e.id !== id) continue;
      this.hits.add(id);
      const stops = strong(e);
      g.hitEnemy(e, this.dmg * (1 + this.charge), { w, kb: stops ? 0 : this.kb, kx: dx, ky: dy });
      g.particles.burst(e.x, e.y, z, 3, [PC.w, this.charge ? PC.Y : PC.G], 45, 0.2, 1, P.FADE);
      if (--this.left === 0 || stops) return false;
      if (!e.prop) {
        this.charge = Math.min(this.crankCap, this.charge + this.crank);
        this.glowSpec = CHARGED_GLOW;
      }
    }
    return true;
  }
}

function previewTarget(w) {
  const { g } = w, p = g.player;
  return g.nearestEnemy(p.x, p.y, REACH, e => !g.world.solid(e.x, e.y) && g.world.lineOfSight(p.x, p.y, e.x, e.y));
}

export default {
  reach: REACH,
  previewTarget,
  fire(w) {
    const { g } = w, p = g.player;
    const target = w.hand ? w.handTarget : previewTarget(w);
    if (!target && !w.hand) return false;
    const ang = target && !target.dead ? Math.atan2(target.y - p.y, target.x - p.x) : (p.strikeAng ?? p.aim);
    recordHeroAttack(w, ang);
    g.effects.push(new RatchetBolt(w, ang));
    sfx('arrow', { pitch: 0.68, pan: Math.cos(ang) * 0.3 });
  },
};
