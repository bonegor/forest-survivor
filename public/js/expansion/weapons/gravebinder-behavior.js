import { sfx } from '../../engine/audio.js';
import { clamp, lerp } from '../../engine/util.js';
import { Ring } from '../../game/effects.js';
import { recordHeroAttack } from '../../game/hero-animation.js';

const REACH = 152, SIPHON_RADIUS = 29, MAX_SIPHONS = 6, MAX_TITHE = 0.5, FLIGHT = 0.18;
const DARK = '#42284f', VIOLET = '#b55088', LILAC = '#e8b4d6';
const strong = foe => foe.boss || foe.lord || foe.elite;
const visible = (world, x, y, target) => !world.solid(target.x, target.y) && world.lineOfSight(x, y, target.x, target.y);
const available = foe => foe && !foe.dead && !foe.prop && foe.spawnT <= 0.3;

function targetFor(w) {
  const { g } = w, { player: p, world } = g;
  const open = foe => visible(world, p.x, p.y, foe);
  return g.nearestEnemy(p.x, p.y, REACH, foe => strong(foe) && open(foe)) ||
    g.nearestEnemy(p.x, p.y, REACH, open);
}

class CarrionFlight {
  constructor(w, target, damage, fed) {
    const { g } = w, { player: p } = g;
    Object.assign(this, {
      w, target, damage, fed, world: g.world, targetId: target.id,
      x: p.x, y: p.y, start: g.clock, dur: FLIGHT,
    });
  }

  valid() {
    const { w, target, world, x, y } = this;
    return !this.dead && w.g.world === world && available(target) && target.id === this.targetId &&
      visible(world, x, y, target);
  }

  update() {
    const { w, target } = this, { g } = w;
    if (this.valid()) {
      if (g.clock < this.start + this.dur - 1e-6) return true;
      this.dead = true;
      g.hitEnemy(target, this.damage, { w, type: 'dark' });
      g.effects.push(new Ring(g, target.x, target.y, 3, this.fed ? 17 : 10, 0.24, VIOLET, false, 2));
      sfx('bones', { pitch: this.fed ? 0.85 : 1.1 });
    }
    if (w.fx === this) w.fx = null;
    return false;
  }

  drawGlow(ctx, cam) {
    if (!this.valid()) return;
    const { w, target } = this;
    const t = clamp((w.g.clock - this.start) / this.dur, 0, 1), S = cam.S;
    const x = Math.round((lerp(this.x, target.x, t) - cam.x) * S);
    const y = Math.round((lerp(this.y - 19, target.y - target.h / 2, t) - 8 * Math.sin(t * Math.PI) - cam.y) * S);
    const face = target.x >= this.x ? 1 : -1, wing = t < 0.3 || t > 0.72 ? -3 : 1;
    ctx.fillStyle = DARK;
    ctx.fillRect(x - 4 * S, y - S, 8 * S, 3 * S);
    ctx.fillRect(x - 3 * S, y + wing * S, 4 * S, 3 * S);
    ctx.fillStyle = VIOLET;
    ctx.fillRect(x - 2 * S, y, 5 * S, S);
    ctx.fillRect(x - S, y + wing * S, 2 * S, 2 * S);
    ctx.fillStyle = LILAC;
    ctx.fillRect(x + face * 3 * S, y - S, S, S);
  }
}

function levy(w, target) {
  const { g, s } = w, { world } = g;
  const radius = Math.min(58, SIPHON_RADIUS * s.area);
  const { x, y } = target, candidates = [];
  for (const foe of g.grid.query(x, y, radius)) {
    if (foe === target || !available(foe) || strong(foe)) continue;
    const gap = (foe.x - x) ** 2 + (foe.y - y) ** 2;
    if (gap <= radius ** 2 && visible(world, x, y, foe)) candidates.push({ foe, gap });
  }
  candidates.sort((a, b) => a.gap - b.gap || a.foe.id - b.foe.id);
  let fed = 0;
  for (const { foe } of candidates.slice(0, Math.min(MAX_SIPHONS, s.amount))) {
    if (!g.hitEnemy(foe, s.dmg * s.siphon, { w, type: 'dark' })) continue;
    fed++;
    g.effects.push(new Ring(g, foe.x, foe.y, 7, 2, FLIGHT, VIOLET, false, 1));
  }
  return fed;
}

export default {
  reach: REACH,
  previewTarget: targetFor,
  fire(w) {
    const { g, s } = w, { player: p, world } = g;
    if (w.fx?.world === world && g.effects.includes(w.fx)) return 0.1;
    const target = w.hand ? w.handTarget : targetFor(w);
    if (!available(target) || !visible(world, p.x, p.y, target)) return false;
    const angle = Math.atan2(target.y - p.y, target.x - p.x);
    recordHeroAttack(w, angle);
    const fed = levy(w, target);
    const damage = s.dmg * (1 + Math.min(MAX_TITHE, s.tithe * fed));
    w.fx = new CarrionFlight(w, target, damage, fed);
    g.effects.push(w.fx);
    sfx('bones', { pitch: 1.35, pan: Math.cos(angle) * 0.24 });
  },
};
