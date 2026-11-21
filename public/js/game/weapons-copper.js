// The cursed copper always seeks the nearest foe. The Phoenix turns each of its
// six slots into a different fighting style, without freeing it from the curse.
import { spawnProjectile } from './projectiles.js';
import { Aura, Bolt, explode } from './effects.js';
import { SPR } from '../engine/sprites.js';
import { TAU } from '../engine/util.js';
import { PC } from './particles.js';
import { reachesFeet, reachesBody, spriteRadius } from './hitbox.js';
import { recordHeroAttack } from './hero-animation.js';
import { sfx } from '../engine/audio.js';
import { MERCHANT_WHIP, privateCopperDamage } from './merchant-whip.js';
import { nearbyWeaponProp } from './weapon-targets.js';

const COPPER = '#b86f50', HEAT = '#feae34';

// Liquidation calls the stock back to the spot where the merchant struck
// his seal. Each narrowing band crosses a creature once, even on long ticks.
export class CopperRecall {
  constructor(g, delay, radius) {
    this.g = g;
    this.world = g.world;
    this.x = g.player.x;
    this.y = g.player.y;
    this.range = radius;
    this.radius = radius;
    this.t = -delay;
    this.dur = .83;
    this.ult = true;
    this.hit = new Set();
  }

  update(dt) {
    if (this.dead || this.world !== this.g.world) return false;
    const previous = this.radius;
    this.t += dt;
    if (this.t < 0) return true;
    this.radius = this.range * Math.max(0, 1 - this.t / this.dur);
    for (const e of this.g.grid.foes(this.x, this.y, previous + 4)) {
      if (e.dead || e.spawnT > .3 || this.hit.has(e.id)) continue;
      const dx = this.x - e.x, dy = this.y - e.y, distance = Math.hypot(dx, dy);
      if (distance + e.hr < this.radius - 3 || distance - e.hr > previous + 3) continue;
      if (this.world.solid(e.x, e.y) || !this.world.lineOfSight(this.x, this.y, e.x, e.y)) continue;
      this.hit.add(e.id);
      this.g.hitEnemy(e, 92, { ult: true, kb: 1.8, kx: dx / (distance || 1), ky: dy / (distance || 1) });
    }
    return this.t < this.dur;
  }

  drawGround(ctx, cam) {
    if (this.t < 0 || this.radius < 2) return;
    const { S } = cam;
    const image = SPR.liquidation_ingot.frames[0].c;
    let joined = false;
    ctx.save();
    ctx.lineWidth = S;
    ctx.strokeStyle = '#d98e58';
    ctx.beginPath();
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const angle = i / steps * TAU;
      const x = this.x + this.radius * Math.cos(angle), y = this.y + this.radius * Math.sin(angle);
      if (this.world.solid(x, y) || !this.world.lineOfSight(this.x, this.y, x, y)) {
        joined = false;
        continue;
      }
      const sx = Math.round((x - cam.x) * S), sy = Math.round((y - cam.y) * S);
      if (joined) ctx.lineTo(sx, sy);
      else ctx.moveTo(sx, sy);
      joined = true;
      if (i % 4 === 0 && i < steps) {
        ctx.drawImage(image, sx - Math.floor(image.width / 2) * S, sy - Math.floor(image.height / 2) * S, image.width * S, image.height * S);
      }
    }
    ctx.stroke();
    ctx.restore();
  }
}

const target = (w) => {
  const { g } = w, p = g.player;
  return g.nearestEnemy(p.x, p.y, 260, e => g.inView(e) && !g.world.solid(e.x, e.y) &&
    g.world.lineOfSight(p.x, p.y, e.x, e.y)) || nearbyWeaponProp(w);
};
const bearing = (p, e) => Math.atan2(e.y - p.y, e.x - p.x);

function disc(w, ang, extra = {}) {
  const p = w.g.player, s = w.s;
  let sprite = 'copper_disc';
  if (w.def.goodCopper) sprite = w.evolved ? 'copper_refined_disc' : 'merchant_stock_disc';
  return spawnProjectile(w.g, {
    kind: 'copper', sprite, x: p.x, y: p.y - 1, z: 7,
    ang, speed: 190 * s.speed, life: 1.5, r: 3 * s.area, scale: s.area,
    dmg: s.dmg, pierce: s.pierce, kb: s.kb, w, spin: 16,
    damageAt: w.def.goodCopper ? privateCopperDamage : null,
    trail: w.evolved ? PC.o : null, ...extra,
  });
}

function prepare(w) {
  const e = target(w);
  if (!e && !w.hand) return false;
  w.burst(w.s.amount, w.def.kind === 'copper_shoot' ? 0.065 : 0.11);
}

function shoot(w, i) {
  const p = w.g.player, e = target(w);
  // Retarget each shot: no stored reference to a dead enemy's pooled body.
  if (!e && !w.hand) return;
  const ang = e ? bearing(p, e) : p.aim;
  if (!i) recordHeroAttack(w, ang);
  sfx('blade', { pitch: w.evolved ? 0.85 : 1.12 });
  const kind = w.def.kind;
  if (kind === 'copper_return') {
    disc(w, ang + (i - (w.s.amount - 1) / 2) * 0.13, {
      kind: 'glaive', speed: 265 * w.s.speed, out: 0.65, life: w.s.dur,
      pierce: 999, hitCd: 0.3,
    });
  } else if (kind === 'copper_burst') {
    // The normal projectile owns the first hit; its blast damages nearby foes.
    disc(w, ang, { pierce: 0, onHit: (pr) => explode(w.g, pr.x, pr.y, 23 * w.s.area, w.s.dmg, w, 'fire') });
  } else disc(w, ang, { speed: (kind === 'copper_shoot' ? 330 : 190) * w.s.speed });
}

const FURNACE_LOOK = { R: 30, num: 'fire', fill: COPPER, rim: HEAT, inner: '#be4a2f', glow: HEAT, light: 'fire', parts: [PC.o, PC.y] };
export class CopperFurnace extends Aura {
  get look() { return FURNACE_LOOK; }
}

export class CopperCrown {
  constructor(w) {
    this.w = w;
    this.g = w.g;
    this.ang = 0;
    this.dead = false;
    this.persistent = true;
  }

  update(dt) {
    if (this.dead) return false;
    const w = this.w, g = this.g, p = g.player, s = w.s;
    this.ang += dt * 3.3 * s.speed;
    const r = Math.max(4 * s.area, spriteRadius(SPR.copper_disc) * Math.min(1.5, s.area));
    for (let i = 0; i < s.amount; i++) {
      const a = this.ang + i / s.amount * TAU;
      const x = p.x + Math.cos(a) * 30 * s.area, y = p.y + Math.sin(a) * 30 * s.area;
      for (const e of g.grid.foes(x, y, r + 7)) {
        if (e.dead || e.hitT[w.src] > g.clock) continue;
        if (!reachesFeet(e, x, y, x, y, r) && !reachesBody(e, x, y - 7, x, y - 7, r)) continue;
        e.hitT[w.src] = g.clock + s.tick;
        g.hitEnemy(e, s.dmg, { w, type: 'fire', kb: s.kb, kx: Math.cos(a), ky: Math.sin(a) });
      }
    }
    return true;
  }

  draw(ctx, cam) {
    const s = this.w.s, p = this.g.player, frame = SPR.copper_disc.frames[0];
    const img = frame.rotated(this.ang * 3, 16), size = Math.min(1.5, s.area) * cam.S;
    for (let i = 0; i < s.amount; i++) {
      const a = this.ang + i / s.amount * TAU;
      const x = (p.x + Math.cos(a) * 30 * s.area - cam.x) * cam.S;
      const y = (p.y + Math.sin(a) * 30 * s.area - 7 - cam.y) * cam.S;
      ctx.drawImage(img, Math.round(x - img.width * size / 2), Math.round(y - img.height * size / 2), Math.round(img.width * size), Math.round(img.height * size));
    }
  }
}

const persistent = (w, create) => {
  if (!w.fx || w.fx.dead) {
    w.fx = create();
    w.g.effects.push(w.fx);
  }
};

export const COPPER_BEHAVIORS = {
  merchant_whip: MERCHANT_WHIP,
  copper: { reach: 260, fire: prepare, shoot },
  copper_return: { reach: 260, fire: prepare, shoot },
  copper_shoot: { reach: 260, fire: prepare, shoot },
  copper_burst: { reach: 260, fire: prepare, shoot },
  copper_area: { tick(w) { persistent(w, () => new CopperFurnace(w.g, w)); } },
  copper_orbit: { tick(w) { persistent(w, () => new CopperCrown(w)); } },
  copper_chain: {
    reach: 260,
    fire(w) {
      const g = w.g, p = g.player, s = w.s;
      let e = target(w);
      if (!e) return false;
      recordHeroAttack(w, bearing(p, e));
      sfx('zap', { pitch: 0.8 });
      let from = { x: p.x, y: p.y - 7 };
      const struck = new Set();
      for (let i = 0; e && i <= s.chains; i++) {
        struck.add(e.id);
        const to = { x: e.x, y: e.y - 5 };
        g.effects.push(new Bolt(g, [from, to], 'chain', COPPER));
        g.hitEnemy(e, s.dmg * Math.pow(0.94, i), { w, type: 'shock', kb: s.kb });
        from = to;
        const last = e;
        e = g.nearestEnemy(last.x, last.y, 75 * s.area, (foe) => !struck.has(foe.id) && !foe.prop && g.inView(foe)
          && (!g.inCrypt || g.world.lineOfSight(last.x, last.y, foe.x, foe.y)));
      }
    },
  },
};
