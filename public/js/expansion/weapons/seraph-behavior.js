import { sfx } from '../../engine/audio.js';
import { recordHeroAttack } from '../../game/hero-animation.js';
import { reachesFeet } from '../../game/hitbox.js';

const REACH = 32, WING_START = 9, WING_TRAVEL = 46, WING_SPREAD = 23;
const STEPS = 12, MAX_HITS = 10, FADE = 0.1;

function clear(world, x, y, tx, ty) {
  return !world.solid(tx, ty) && world.lineOfSight(x, y, tx, ty);
}

function previewTarget(w) {
  const { g, s } = w, p = g.player;
  return g.nearestEnemy(p.x, p.y, REACH * Math.min(2, s.area), e =>
    (e.x - p.x) * p.face >= 0 && clear(g.world, p.x, p.y, e.x, e.y));
}

class SunwingCut {
  constructor(w, ang) {
    this.w = w;
    this.def = w.def;
    const { g, s } = w, p = g.player;
    this.world = g.world;
    this.x = p.x;
    this.y = p.y;
    this.dx = Math.cos(ang);
    this.dy = Math.sin(ang);
    this.area = Math.min(2, s.area);
    this.dmg = s.dmg;
    this.wingDamage = s.dmg * s.wing;
    this.kb = s.kb;
    this.duration = Math.max(0.16, Math.min(0.38, 0.30 / s.speed));
    this.t = 0;
    this.step = 0;
    this.left = Math.min(MAX_HITS, 4 + s.amount);
    this.hit = new Set();
    this.tip = this.centerTip();
    this.wings = [-1, 1].map(side => this.wingPath(side));
  }

  point(forward, side = 0) {
    return {
      x: this.x + this.dx * forward - this.dy * side,
      y: this.y + this.dy * forward + this.dx * side,
    };
  }

  centerTip() {
    for (let d = REACH * this.area; d > 0; d -= 2) {
      const point = this.point(d);
      if (clear(this.world, this.x, this.y, point.x, point.y)) return point;
    }
    return { x: this.x, y: this.y };
  }

  wingPath(side) {
    const path = [{ x: this.x, y: this.y }];
    for (let i = 0; i <= STEPS; i++) {
      const progress = i / STEPS;
      const forward = (WING_START + WING_TRAVEL * progress) * this.area;
      const lateral = side * WING_SPREAD * Math.sin(progress * Math.PI / 2) * this.area;
      const point = this.point(forward, lateral), prev = path.at(-1);
      if (!clear(this.world, prev.x, prev.y, point.x, point.y)) break;
      path.push(point);
    }
    return path.slice(1);
  }

  strike(a, b, radius, dmg, limit) {
    if (!this.left) return;
    const { g } = this.w;
    const reach = Math.hypot(b.x - a.x, b.y - a.y) / 2 + radius;
    const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
    const foes = g.grid.foes(x, y, reach).filter(e =>
      !e.dead && !e.prop && e.spawnT <= 0.3 && !this.hit.has(e.id) &&
      (e.x - this.x) * this.dx + (e.y - this.y) * this.dy >= 0 &&
      reachesFeet(e, a.x, a.y, b.x, b.y, radius) && clear(this.world, this.x, this.y, e.x, e.y));
    foes.sort((first, second) => ((first.x - a.x) ** 2 + (first.y - a.y) ** 2) -
      ((second.x - a.x) ** 2 + (second.y - a.y) ** 2) || first.id - second.id);
    for (const e of foes) {
      if (limit <= 0 || this.left <= 0) break;
      if (e.dead) continue;
      this.hit.add(e.id);
      this.left--;
      limit--;
      g.hitEnemy(e, dmg, {
        w: this.w, type: 'holy', kb: e.boss || e.lord || e.elite ? 0 : this.kb, kx: this.dx, ky: this.dy,
      });
    }
  }

  update(dt) {
    if (this.dead || this.w.def !== this.def || this.w.g.world !== this.world) return false;
    this.t += dt;
    const next = Math.min(STEPS, Math.floor(this.t / this.duration * STEPS + 1e-6));
    while (this.step < next && this.left) {
      for (const wing of this.wings) {
        if (this.step + 1 >= wing.length) continue;
        this.strike(wing[this.step], wing[this.step + 1], 3 * this.area, this.wingDamage, this.left);
      }
      this.step++;
    }
    this.step = next;
    return this.t < this.duration + FADE;
  }

  draw(ctx, cam) {
    if (this.dead) return;
    const { S } = cam;
    const colors = this.def.evolved ? ['#be4a2f', '#feae34', '#fff6c2'] : ['#855638', '#f4b95e', '#fee761'];
    const px = (x, y, size, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(Math.round((x - cam.x) * S), Math.round((y - cam.y - 7) * S), size * S, size * S);
    };
    ctx.save();
    ctx.globalAlpha *= Math.min(1, (this.duration + FADE - this.t) / FADE);
    if (this.t < 0.11) {
      for (let i = 1; i <= 10; i++) {
        const x = this.x + (this.tip.x - this.x) * i / 10;
        const y = this.y + (this.tip.y - this.y) * i / 10;
        px(x, y, 2, colors[i % 3]);
      }
    }
    for (const wing of this.wings) {
      const last = Math.min(this.step, wing.length - 1);
      for (let i = Math.max(0, last - 4); i <= last; i++) {
        const { x, y } = wing[i], tip = i === last;
        px(x, y, tip ? 3 : 2, colors[tip ? 2 : i >= last - 2 ? 1 : 0]);
        if (tip) px(x - this.dx * 4, y - this.dy * 4 - 2, 2, colors[1]);
      }
    }
    ctx.restore();
  }
}

export default {
  reach: 35,
  previewTarget,
  fire(w) {
    const { g } = w, p = g.player;
    const target = w.hand ? null : previewTarget(w);
    const ang = w.hand ? p.strikeAng : target ? Math.atan2(target.y - p.y, target.x - p.x) : p.face < 0 ? Math.PI : 0;
    p.swing(ang);
    recordHeroAttack(w, ang);
    sfx('slash', { pitch: 1.08, pan: Math.cos(ang) * 0.25 });
    const cut = new SunwingCut(w, ang);
    g.effects.push(cut);
    if (cut.tip.x !== p.x || cut.tip.y !== p.y) {
      cut.strike(p, cut.tip, 6 * cut.area, cut.dmg, Math.min(3, 1 + Math.ceil(w.s.amount / 2)));
    }
  },
};
