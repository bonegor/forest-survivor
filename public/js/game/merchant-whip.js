// One visible leather lash; collision follows the same polyline from grip to tip.
import { sfx } from '../engine/audio.js';
import { reachesBody, reachesFeet } from './hitbox.js';
import { recordHeroAttack } from './hero-animation.js';
import { nearbyWeaponProp } from './weapon-targets.js';

const HEIGHT = 18, DURATION = 0.22;
export const whipReach = w => Math.min(100, 48 * w.s.area);

export class MerchantLash {
  constructor(w, angle) {
    this.w = w;
    this.t = 0;
    this.hit = new Set();
    const p = w.g.player, reach = whipReach(w), dx = Math.cos(angle), dy = Math.sin(angle);
    this.dx = dx; this.dy = dy;
    // Keep the landed blow in world space; walking cannot drag it into new foes.
    this.x = p.x; this.y = p.y;
    this.points = [[0, 0], [reach * .28, -5], [reach * .58, -3], [reach, 0]]
      .map(([along, side]) => [p.x + dx * (along + 4) - dy * side, p.y + dy * (along + 4) + dx * side]);
    this.strike();
  }

  strike() {
    const { w } = this, { g } = w, radius = 3 * Math.min(2, w.s.area);
    for (const e of g.grid.foes(this.x, this.y, whipReach(w) + 12)) {
      if (e.dead || this.hit.has(e.id) || e.spawnT > .3 || !g.inView(e)) continue;
      if (!g.world.lineOfSight(this.x, this.y, e.x, e.y)) continue;
      let contact = false;
      for (let i = 1; i < this.points.length && !contact; i++) {
        const [ax, ay] = this.points[i - 1], [bx, by] = this.points[i];
        contact = reachesBody(e, ax, ay - HEIGHT, bx, by - HEIGHT, radius) || reachesFeet(e, ax, ay, bx, by, radius);
      }
      if (!contact) continue;
      this.hit.add(e.id);
      g.hitEnemy(e, w.s.dmg, { w, type: 'normal', kb: w.s.kb, kx: this.dx, ky: this.dy });
    }
  }

  update(dt) {
    this.t += dt;
    if (this.t < .09) this.strike();
    return !this.dead && this.t < DURATION;
  }

  draw(ctx, cam) {
    const { S } = cam, fade = Math.max(0, 1 - this.t / DURATION);
    ctx.save();
    ctx.globalAlpha = fade;
    // Native integer clusters, a dark core and copper edge, no smooth strokes.
    for (let i = 1; i < this.points.length; i++) {
      const [ax, ay] = this.points[i - 1], [bx, by] = this.points[i];
      const steps = Math.ceil(Math.hypot(bx - ax, by - ay));
      for (let j = 0; j <= steps; j++) {
        const x = Math.round(ax + (bx - ax) * j / steps - cam.x) * S;
        const y = Math.round(ay + (by - ay) * j / steps - HEIGHT - cam.y) * S;
        ctx.fillStyle = '#4a2c29'; ctx.fillRect(x - S, y - S, 3 * S, 3 * S);
        ctx.fillStyle = this.w.evolved ? '#feae34' : '#c28569'; ctx.fillRect(x, y, S, S);
      }
    }
    if (this.t < .1) {
      const [tx, ty] = this.points.at(-1), x = Math.round(tx - cam.x) * S, y = Math.round(ty - HEIGHT - cam.y) * S;
      ctx.fillStyle = '#ead4aa'; ctx.fillRect(x - 3 * S, y, 7 * S, S); ctx.fillRect(x, y - 3 * S, S, 7 * S);
    }
    ctx.restore();
  }
}

export const MERCHANT_WHIP = {
  // The real reach grows with area; the default getter in Weapon adds aim slack.
  fire(w) {
    const { g } = w, p = g.player;
    const target = g.nearestEnemy(p.x, p.y, whipReach(w), e => g.inView(e) && g.world.lineOfSight(p.x, p.y, e.x, e.y)) || nearbyWeaponProp(w, whipReach(w));
    if (!target && !w.hand) return false;
    const angle = w.hand ? p.strikeAng : Math.atan2(target.y - p.y, target.x - p.x);
    recordHeroAttack(w, angle);
    g.effects.push(new MerchantLash(w, angle));
    sfx('slash', { pitch: w.evolved ? 1.3 : 1.55 });
  },
};
