import { sfx } from '../../engine/audio.js';
import { TAU } from '../../engine/util.js';
import { slashFrame } from '../../game/fxsprites.js';
import { recordHeroAttack } from '../../game/hero-animation.js';
import { reachesFeet, reachesBody } from '../../game/hitbox.js';
import { PC, P } from '../../game/particles.js';

const REACH = 33, HEIGHT = 8, CUT_TIME = 0.17, ARC = 0.94, MAX_CUTS = 6;
const GUARD_RECOVERY = 0.72, GUARD_DURATION_CAP = 0.34, CHARGE_TIME = 1.9;
const STEEL = ['#333951', '#506c8a', '#95b4cb', '#d9ecff'];
const GOLD = ['#5e4350', '#b28042', '#ffc665', '#fff4ca'];

const ahead = (p) => p.face < 0 ? Math.PI : 0;
const cutReach = (w) => Math.min(72, REACH * w.s.area);

function targets(w, angle) {
  const { g } = w, p = g.player;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const reach = cutReach(w), width = Math.min(14, 7 * w.s.area);
  const x = p.x + dx * reach, y = p.y + dy * reach;
  const found = [];
  for (const e of g.grid.foes(p.x, p.y, reach + width)) {
    if (e.dead || e.prop || e.spawnT > 0.3) continue;
    const ex = e.x - p.x, ey = e.y - p.y;
    if (ex * dx + ey * dy < 0) continue;
    if (!reachesFeet(e, p.x, p.y, x, y, width) &&
        !reachesBody(e, p.x, p.y - HEIGHT, x, y - HEIGHT, width)) continue;
    if (!g.world.lineOfSight(p.x, p.y, e.x, e.y)) continue;
    found.push({ e, distance: ex * ex + ey * ey });
  }
  found.sort((a, b) => a.distance - b.distance);
  return found;
}

function ward(w, state) {
  const { g } = w, p = g.player, guard = state.guard;
  if (!guard || !guard.left || guard.until <= g.clock) return;
  for (const shot of g.eshots) {
    if (shot.dead || shot.life <= 0 || guard.seen.has(shot)) continue;
    const x = shot.x - p.x, y = shot.y - p.y;
    const reach = guard.reach + shot.r;
    const distance = Math.hypot(x, y);
    if (distance > reach || x * guard.dx + y * guard.dy < distance * 0.54) continue;
    if (x * shot.vx + y * shot.vy >= 0 || !g.world.lineOfSight(p.x, p.y, shot.x, shot.y)) continue;
    // Incoming fire empowers the next cut, but weapons never erase an enemy
    // missile. Count each passing shot once while this guard is active.
    guard.seen.add(shot);
    guard.left--;
    state.chargeUntil = g.clock + CHARGE_TIME;
    g.particles.burst(p.x + guard.dx * guard.reach, p.y + guard.dy * guard.reach, shot.z, 7, [PC.Y, PC.w], 45, 0.24, 1, P.FADE | P.GLOW, {});
    sfx('hit', { pitch: 1.45, pan: guard.dx * 0.22 });
    if (!guard.left) return;
  }
}

function stateFor(w) {
  if (w.shieldward?.world !== w.g.world) {
    w.shieldward = { world: w.g.world, readyAt: 0, chargeUntil: 0, guard: null };
  }
  return w.shieldward;
}

class ShieldwardStroke {
  constructor(w, angle, guard, charged) {
    this.w = w;
    this.angle = angle;
    this.guard = guard;
    this.charged = charged;
    this.reach = cutReach(w);
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    const guarding = this.guard?.left > 0 && this.guard.until > this.w.g.clock;
    return !this.dead && (guarding || this.t < CUT_TIME);
  }

  draw(ctx, cam) {
    const { S } = cam, { g } = this.w, p = g.player;
    const cx = (p.x - cam.x) * S, cy = (p.y - HEIGHT - cam.y) * S;
    if (this.t < CUT_TIME) {
      const frame = Math.min(5, Math.floor(this.t / CUT_TIME * 6));
      const art = slashFrame(this.reach, ARC, Math.round(this.angle / TAU * 32), frame, 6, this.charged ? GOLD : STEEL);
      const w = art.width * S, h = art.height * S;
      ctx.drawImage(art, Math.round(cx - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h));
    }
    if (!(this.guard?.left > 0 && this.guard.until > g.clock)) return;
    const radius = this.guard.reach;
    for (let i = -4; i <= 4; i++) {
      const angle = this.angle + i * 0.24;
      const x = Math.round(cx + Math.cos(angle) * radius * S);
      const y = Math.round(cy + Math.sin(angle) * radius * S);
      ctx.fillStyle = i % 2 ? '#95b4cb' : '#3c5275';
      ctx.fillRect(x, y - S, 2 * S, 3 * S);
    }
  }
}

export default {
  reach: 48,
  previewTarget(w) {
    return targets(w, ahead(w.g.player))[0]?.e ?? null;
  },
  tick(w) {
    if (w.shieldward) ward(w, stateFor(w));
  },
  fire(w) {
    const { g, s } = w, p = g.player, state = stateFor(w);
    const first = w.hand ? null : targets(w, ahead(p))[0]?.e;
    const angle = w.hand ? p.strikeAng : first ? Math.atan2(first.y - p.y, first.x - p.x) : ahead(p);
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const charged = state.chargeUntil > g.clock;
    state.chargeUntil = 0;
    let guard = null;
    if (g.clock >= state.readyAt) {
      state.readyAt = g.clock + GUARD_RECOVERY;
      state.guard = guard = {
        dx, dy, left: s.guard, seen: new Set(), reach: Math.min(40, 26 * s.area),
        until: g.clock + Math.min(GUARD_DURATION_CAP, s.dur),
      };
      ward(w, state);
    }
    p.swing(angle);
    recordHeroAttack(w, angle);
    sfx('slash', { pitch: charged ? 1.12 : 0.88, pan: dx * 0.22 });
    g.effects.push(new ShieldwardStroke(w, angle, guard, charged));
    const damage = s.dmg * (charged ? 1 + s.reprisal : 1);
    for (const { e } of targets(w, angle).slice(0, Math.min(MAX_CUTS, s.amount + 1))) {
      const kb = e.boss || e.elite || e.lord ? 0 : s.kb;
      g.hitEnemy(e, damage, { w, kb, kx: dx, ky: dy });
    }
  },
};
