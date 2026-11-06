import { sfx } from '../../engine/audio.js';
import { recordHeroAttack } from '../../game/hero-animation.js';
import { pointSegGap } from '../../game/hitbox.js';
import { PC } from '../../game/particles.js';
import { spawnProjectile } from '../../game/projectiles.js';

const REACH = 210, SPEED = 294;
const LINE_REACH = 118, LINE_WIDTH = 4, LINE_SCAN = 0.065;
const MAX_LINES = 3, MAX_TRIPS = 7, LINE_FADE = 0.18;

class Tripline {
  constructor(arrow, pin) {
    const { w } = arrow, s = w.s;
    const distance = Math.hypot(arrow.x - arrow.sx, arrow.y - arrow.sy);
    const back = Math.min(1, (LINE_REACH * s.area) / distance);
    this.w = w;
    this.ax = arrow.x + (arrow.sx - arrow.x) * back;
    this.ay = arrow.y + (arrow.sy - arrow.y) * back;
    this.bx = arrow.x;
    this.by = arrow.y;
    this.mx = (this.ax + this.bx) / 2;
    this.my = (this.ay + this.by) / 2;
    this.radius = (distance * back) / 2;
    this.width = LINE_WIDTH * s.area;
    this.damage = arrow.dmg * (w.evolved ? 0.7 : 0.63);
    this.slow = s.slow;
    this.evolved = w.evolved;
    this.left = Math.min(MAX_TRIPS, s.amount + 2);
    this.hits = new Set([pin.id]);
    this.dur = Math.min(s.dur, 3);
    this.t = 0;
    this.next = LINE_SCAN;
  }

  update(dt) {
    this.t += dt;
    if (this.t >= this.dur) return false;
    if (this.left && this.t >= this.next) {
      this.next = this.t + LINE_SCAN;
      this.check();
    }
    return true;
  }

  check() {
    const { w, ax, ay, bx, by, mx, my } = this, { g } = w;
    const contacts = [];
    for (const e of g.grid.foes(mx, my, this.radius + this.width)) {
      if (e.dead || e.prop || e.boss || e.lord || e.spawnT > 0.3 || this.hits.has(e.id)) continue;
      const gap = pointSegGap(e.x, e.y, ax, ay, bx, by);
      if (gap > e.hr + this.width || g.world.solid(e.x, e.y) || !g.world.lineOfSight(mx, my, e.x, e.y)) continue;
      contacts.push({ e, gap });
    }
    // The foes closest to the wire get the charges if a large pack arrives together.
    contacts.sort((a, b) => a.gap - b.gap || a.e.id - b.e.id);
    for (const { e } of contacts.slice(0, this.left)) {
      if (e.dead) continue;
      this.hits.add(e.id);
      this.left--;
      g.hitEnemy(e, this.damage, { w, slow: e.elite ? 0 : this.slow, slowT: 0.75 });
    }
    if (!this.left) this.dur = Math.min(this.dur, this.t + LINE_FADE);
  }

  draw(ctx, cam) {
    const { S } = cam;
    const x = (v) => Math.round((v - cam.x) * S);
    const y = (v) => Math.round((v - cam.y - 1) * S);
    const ax = x(this.ax), ay = y(this.ay), bx = x(this.bx), by = y(this.by);
    ctx.save();
    ctx.globalAlpha = Math.min(1, (this.dur - this.t) / LINE_FADE);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineWidth = 3 * S;
    ctx.strokeStyle = '#242f29';
    ctx.stroke();
    ctx.lineWidth = S;
    ctx.strokeStyle = this.evolved ? '#8dedc7' : '#b0c37b';
    ctx.stroke();
    ctx.fillStyle = this.evolved ? '#ddfff2' : '#f8df9b';
    ctx.fillRect(ax - S, ay - 2 * S, 2 * S, 3 * S);
    ctx.fillRect(bx - S, by - 2 * S, 2 * S, 3 * S);
    ctx.restore();
  }
}

function plantLine(arrow, pin) {
  const { g, w, sx, sy, x, y } = arrow;
  if (Math.hypot(x - sx, y - sy) < 12 || g.world.solid(x, y) || !g.world.lineOfSight(sx, sy, x, y)) return;
  const live = g.effects.filter(fx => fx instanceof Tripline && fx.w === w && fx.left);
  if (live.length >= MAX_LINES) {
    live[0].left = 0;
    live[0].dur = Math.min(live[0].dur, live[0].t + LINE_FADE);
  }
  g.effects.push(new Tripline(arrow, pin));
}

function previewTarget(w) {
  const { g } = w, p = g.player;
  return g.nearestEnemy(p.x, p.y, REACH, e => !g.world.solid(e.x, e.y) && g.world.lineOfSight(p.x, p.y, e.x, e.y));
}

export default {
  reach: REACH,
  previewTarget,
  fire(w) {
    const { g, s } = w, p = g.player;
    const target = w.hand ? w.handTarget : previewTarget(w);
    if (!target && !w.hand) return false;
    const ang = target && !target.dead ? Math.atan2(target.y - p.y, target.x - p.x) : (p.strikeAng ?? p.aim);
    const speed = SPEED * s.speed;
    recordHeroAttack(w, ang);
    spawnProjectile(g, {
      kind: 'waylineArrow', sprite: 'arrow', x: p.x, y: p.y, z: 14, ang,
      speed, life: (REACH + 10) / speed, r: 2, dmg: s.dmg, pierce: 0, kb: s.kb,
      trail: PC.g, w, onHit: plantLine,
    });
    sfx('arrow', { pitch: 1.14, pan: Math.cos(ang) * 0.3 });
  },
};
