import { weaponSfx } from '../../engine/audio.js';
import { angleDiff, TAU } from '../../engine/util.js';
import { slashFrame } from '../../game/fxsprites.js';
import { recordHeroAttack } from '../../game/hero-animation.js';
import { SPR } from '../../engine/sprites.js';
import { hexPack, tint } from '../../engine/pixels.js';
import { reachesFeet } from '../../game/hitbox.js';

const REACH = 32, ARC = Math.PI * 0.58, MAX_ECHO_GAP = 104;
const CUT_DURATION = 0.18, CUT_FRAMES = 6;
const BLADE = ['#342046', '#704c92', '#a67cc6', '#e6d3f4', '#fff3ff'];
const SHADE = ['#262240', '#4c3a73', '#7255a2', '#af8dcc', '#d9c3ed'];
const mist = buf => tint(buf, hexPack('#a381ce'), .68);

const openLine = (world, x, y, tx, ty) => !world.solid(tx, ty) && world.lineOfSight(x, y, tx, ty);

function targetAhead(w) {
  const { g, s } = w, p = g.player;
  return g.nearestEnemy(p.x, p.y, REACH * s.area + 6, e =>
    (e.x - p.x) * p.face >= 0 && openLine(g.world, p.x, p.y, e.x, e.y));
}

class ShadeAnchor {
  constructor(w, x, y, ang) {
    this.w = w;
    this.world = w.g.world;
    this.x = x;
    this.y = y;
    this.ang = ang;
    this.dur = Math.min(w.s.dur, 3);
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    if (!this.dead && this.t < this.dur) return true;
    if (this.w.fx === this) this.w.fx = null;
    return false;
  }

  drawGround(ctx, cam) {
    if (this.dead) return;
    const S = cam.S, x = Math.round((this.x - cam.x) * S), y = Math.round((this.y - cam.y) * S);
    const tipX = Math.round(x + Math.cos(this.ang) * 8 * S);
    const tipY = Math.round(y + Math.sin(this.ang) * 8 * S);
    ctx.save();
    ctx.globalAlpha *= Math.min(0.75, (this.dur - this.t) * 4);
    ctx.fillStyle = '#342046';
    ctx.fillRect(x - 4 * S, y - 2 * S, 8 * S, 4 * S);
    ctx.fillStyle = '#af8dcc';
    ctx.fillRect(x - 2 * S, y - S, 4 * S, 2 * S);
    ctx.fillRect(tipX - S, tipY - S, 2 * S, 2 * S);
    const spr = SPR.wraith, blade = spr.frames[spr.attack[spr.attackRelease ?? 0]];
    const image = blade.variant('veil-shade', mist, Math.cos(this.ang) < 0);
    const scale = S / spr.hires;
    ctx.globalAlpha *= .47;
    ctx.drawImage(image, Math.round(x - image.width * scale / 2), Math.round(y - spr.anchorY * scale),
      image.width * scale, image.height * scale);
    ctx.restore();
  }
}

class VeilCut {
  constructor(w, x, y, ang, radius, echo, threadEnd) {
    Object.assign(this, { w, x, y, radius, echo, threadEnd, t: 0 });
    this.angleIdx = (Math.round(ang * 32 / TAU) + 32) % 32;
  }

  update(dt) {
    this.t += dt;
    return !this.dead && this.t < CUT_DURATION;
  }

  draw(ctx, cam) {
    if (this.dead) return;
    const phase = Math.min(CUT_FRAMES - 1, Math.floor(this.t * CUT_FRAMES / CUT_DURATION));
    const image = slashFrame(this.radius, ARC, this.angleIdx, phase, CUT_FRAMES, this.echo ? SHADE : BLADE);
    const S = cam.S, x = this.x - cam.x, y = this.y - cam.y - 7;
    if (this.threadEnd) {
      const dx = this.threadEnd.x - this.x, dy = this.threadEnd.y - this.y;
      const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)));
      ctx.save();
      ctx.globalAlpha *= Math.max(0, 1 - this.t / CUT_DURATION);
      for (let i = 0; i <= steps; i++) {
        ctx.fillStyle = (i + phase) % 6 < 2 ? SHADE[4] : SHADE[2];
        ctx.fillRect(Math.round((x + dx * i / steps) * S), Math.round((y + dy * i / steps) * S), S, S);
      }
      ctx.restore();
    }
    ctx.drawImage(image, Math.round((x - image.width / 2) * S), Math.round((y - image.height / 2) * S),
      Math.round(image.width * S), Math.round(image.height * S));
  }
}

function cut(w, { x, y, ang }, hit, echo, threadEnd) {
  const { g, s } = w, radius = Math.round(Math.min(65, REACH * s.area));
  const max = Math.min(echo ? 5 : 7, s.amount + (echo ? 1 : 2));
  const choices = [];
  for (const e of g.grid.foes(x, y, radius)) {
    if (e.dead || e.spawnT > 0.3 || hit.has(e.id)) continue;
    const dx = e.x - x, dy = e.y - (e.h || 0) / 2 - y + 7;
    const gap = Math.hypot(dx, dy), body = Math.max(e.hr, (e.h || 0) * 0.3);
    if (gap > radius + body || Math.abs(angleDiff(Math.atan2(dy, dx), ang)) > ARC / 2 + Math.atan2(body, gap)) continue;
    if (!openLine(g.world, x, y, e.x, e.y)) continue;
    choices.push({ e, dx, dy, gap });
  }
  choices.sort((a, b) => a.gap - b.gap || a.e.id - b.e.id);
  let left = max;
  for (const { e, dx, dy, gap } of choices) {
    if (!e.prop && !left) continue;
    if (!e.prop) left--;
    hit.add(e.id);
    g.hitEnemy(e, s.dmg * (echo ? s.echo : 1), { w, type: 'dark', kb: s.kb * (echo ? 0.35 : 1),
      kx: dx / (gap || 1), ky: dy / (gap || 1) });
  }
  g.effects.push(new VeilCut(w, x, y, ang, radius, echo, threadEnd));
}

export default {
  reach: 38,
  previewTarget: targetAhead,
  fire(w) {
    const { g } = w, p = g.player;
    const target = w.hand ? null : targetAhead(w);
    const facing = p.face < 0 ? Math.PI : 0;
    const ang = w.hand ? p.strikeAng : target ? Math.atan2(target.y - p.y, target.x - p.x) : facing;
    const prior = w.fx, anchor = new ShadeAnchor(w, p.x, p.y, ang), hit = new Set();
    p.swing(ang);
    recordHeroAttack(w, ang);
    cut(w, anchor, hit, false);
    if (prior) {
      const gap = Math.hypot(anchor.x - prior.x, anchor.y - prior.y);
      if (!prior.dead && prior.world === g.world && g.effects.includes(prior) && gap <= MAX_ECHO_GAP) {
        const stretched = w.evolved && gap >= 24 && openLine(g.world, prior.x, prior.y, anchor.x, anchor.y);
        cut(w, prior, hit, true, stretched ? { x:anchor.x, y:anchor.y } : null);
        if (stretched) {
          const mx = (anchor.x + prior.x) / 2, my = (anchor.y + prior.y) / 2;
          const foe = g.nearestEnemy(mx, my, gap / 2 + 4, e => !hit.has(e.id) &&
            reachesFeet(e, prior.x, prior.y, anchor.x, anchor.y, 3) && openLine(g.world, mx, my, e.x, e.y));
          if (foe) g.hitEnemy(foe, w.s.dmg * w.s.echo, { w, type:'dark', kb:0 });
        }
      }
      prior.dead = true;
    }
    w.fx = anchor;
    g.effects.push(anchor);
    weaponSfx(w, 'slash', { pitch: 0.8, pan: Math.cos(ang) * 0.25 });
  },
};
