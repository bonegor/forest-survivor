// Ea-nāṣir replaces a crypt's lords. His three tells are deliberately distinct:
// a narrow whip lane, a quick fireball, and a slower copper disc that curses one slot.
import { EnemyShot } from './projectiles.js';
import { CRYPT_LORD } from '../data/enemies.js';
import { sfx } from '../engine/audio.js';
import { faceAttack } from './facing.js';
import { shotName } from './names.js';

export const MERCHANT = {
  whipReach: 62, whipWidth: 14, whipWind: 0.55, whipCooldown: 2.1, whipDamage: 14,
  range: 190, magicWind: 0.45, magicCooldown: 2.4, magicSpeed: 300, magicDamage: 10,
  copperWind: 0.85, copperCooldown: 4.8, copperSpeed: 135, copperDamage: 1,
};

// Kept on the enemy's clock, so a freeze cannot make its tell finish before the blow.
class WhipLane {
  constructor(e, angle) {
    this.e = e;
    this.id = e.id;
    this.angle = angle;
  }
  update() {
    return !this.e.dead && this.e.id === this.id && this.e.state === 'wind' && this.e.data.attack === 'whip';
  }
  drawGround(ctx, cam) {
    const e = this.e, S = cam.S, u = 1 - Math.max(0, e.stateT) / MERCHANT.whipWind;
    ctx.save();
    ctx.translate((e.x - cam.x) * S, (e.y - cam.y) * S);
    ctx.rotate(this.angle);
    ctx.globalAlpha = 0.25 + u * 0.2;
    ctx.fillStyle = '#e43b44';
    ctx.fillRect(0, -MERCHANT.whipWidth * S / 2, MERCHANT.whipReach * S, MERCHANT.whipWidth * S);
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#e4a672';
    ctx.fillRect(0, -MERCHANT.whipWidth * S / 2, MERCHANT.whipReach * u * S, S);
    ctx.fillRect(0, (MERCHANT.whipWidth / 2 - 1) * S, MERCHANT.whipReach * u * S, S);
    ctx.restore();
  }
}

// A segmented leather lash, extending from his hand along the warned lane.
class CopperWhip {
  constructor(e, angle) {
    Object.assign(this, { x: e.x - e.face * 11, y: e.y - 20,
      tipX: e.x + Math.cos(angle) * MERCHANT.whipReach,
      tipY: e.y - 20 + Math.sin(angle) * MERCHANT.whipReach, angle, t: 0 });
  }
  update(dt) {
    this.t += dt;
    return this.t < 0.24;
  }
  draw(ctx, cam) {
    const S = cam.S, u = this.t / 0.24;
    const length = Math.hypot(this.tipX - this.x, this.tipY - this.y);
    const reach = length * (u < 0.25 ? 0.55 + u * 1.8 : 1);
    const c = (this.tipX - this.x) / length, s = (this.tipY - this.y) / length;
    ctx.save();
    ctx.globalAlpha = 1 - u * u;
    for (let d = 0; d < reach; d += 2) {
      const bend = Math.sin(d * 0.16 - u * 10) * (1 - d / length) * 4;
      const x = Math.round(this.x + c * d - s * bend - cam.x) * S;
      const y = Math.round(this.y + s * d + c * bend - cam.y) * S;
      ctx.fillStyle = '#3b2632';
      ctx.fillRect(x - S, y - S, 3 * S, 3 * S);
      ctx.fillStyle = d % 6 ? '#b86f50' : '#e4a672';
      ctx.fillRect(x, y, S, S);
    }
    ctx.restore();
  }
}

function wind(e, kind, duration, angle) {
  e.state = 'wind';
  e.stateT = duration;
  e.data.wind = duration;
  e.data.releasedAt = null;
  e.data.attack = kind;
  e.data.angle = angle;
  e.data.targetX = e.g.player.x;
  e.data.targetY = e.g.player.y;
  e.face = faceAttack(e.face, false, Math.cos(angle), Math.sin(angle));
  if (kind === 'whip') e.g.effects.push(new WhipLane(e, angle));
  if (kind === 'pqc') e.speech = { text: 'POOR QUALITY COPPER!', t: 1.7 };
}

function release(e) {
  const g = e.g, p = g.player, kind = e.data.attack, a = e.data.angle;
  e.data.releasedAt = e.life;
  if (kind === 'whip') {
    g.effects.push(new CopperWhip(e, a));
    const dx = p.x - e.x, dy = p.y - e.y;
    const along = dx * Math.cos(a) + dy * Math.sin(a);
    const across = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
    if (along >= -p.r && along <= MERCHANT.whipReach + p.r && across < MERCHANT.whipWidth / 2 + p.r && g.world.lineOfSight(e.x, e.y, p.x, p.y)) {
      p.hurt(MERCHANT.whipDamage * g.dmgScale, null, `${e.def.name}'s whip`, e.def.name);
    }
    sfx('slash', { weaponSound: false });
    return;
  }
  const copper = kind === 'pqc', count = copper || !e.lordEnraged ? 1 : 3;
  const x = e.x + e.face * 12, y = e.y;
  const shotAngle = Math.atan2(e.data.targetY - y, e.data.targetX - x);
  for (let i = 0; i < count; i++) {
    g.eshots.push(new EnemyShot(g, x, y, shotAngle + (i - (count - 1) / 2) * CRYPT_LORD.spread,
      copper ? MERCHANT.copperSpeed : MERCHANT.magicSpeed,
      copper ? MERCHANT.copperDamage : MERCHANT.magicDamage * g.dmgScale * CRYPT_LORD.damage,
      copper ? 'pqc' : 'cryptfireball', {
        swept: true, z: copper ? 22 : 24, life: 3,
        by: shotName(e, copper ? 'pqc' : 'cryptfireball'), boss: e.def.name,
      }));
  }
  sfx('enemyshot');
}

export function merchantAI(e, dt) {
  if (e.freezeT > 0 || e.stunT > 0) return [0, 0, 0];
  const g = e.g, p = g.player;
  if (!e.lordEnraged && e.hp <= e.maxHp * CRYPT_LORD.enrageAt) {
    e.lordEnraged = true;
    g.numbers.text(e.x, e.y - e.h - 8, 'ENRAGED', 'fire');
  }
  const haste = e.lordEnraged ? CRYPT_LORD.cooldown : 1;
  e.cdT -= dt;
  e.cd2 -= dt;
  e.cd3 -= dt;
  if (e.state === 'wind') {
    e.stateT -= dt;
    if (e.stateT <= 0) {
      e.state = 'move';
      release(e);
    }
    return [0, 0, 0];
  }
  const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy);
  if (dist < MERCHANT.range && g.world.lineOfSight(e.x, e.y, p.x, p.y)) {
    const a = Math.atan2(dy, dx);
    if (e.cd3 <= 0) {
      e.cd3 = MERCHANT.copperCooldown * haste;
      wind(e, 'pqc', MERCHANT.copperWind, a);
      return [0, 0, 0];
    }
    if (dist < MERCHANT.whipReach && e.cdT <= 0) {
      e.cdT = MERCHANT.whipCooldown * haste;
      wind(e, 'whip', MERCHANT.whipWind, a);
      return [0, 0, 0];
    }
    if (e.cd2 <= 0) {
      e.cd2 = MERCHANT.magicCooldown * haste;
      wind(e, 'magic', MERCHANT.magicWind, a);
      return [0, 0, 0];
    }
  }
  const d = g.world.steer(e, p);
  // He closes to whipping distance, leaving enough space to read and sidestep the lane.
  return [d[0], d[1], dist < MERCHANT.whipReach * 0.7 ? 0 : 1];
}
