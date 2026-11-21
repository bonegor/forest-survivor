// The horde's pressure kinds (G10 of the 21 November 2026 gameplay review; the owner's "one by one,
// work them"): a few of each in the later pockets (data/waves.js), each asking the hero to move
// another way, each told by its look before it does anything:
// - Bloater: bursts where it dies into a cloud of gas that bites whoever stands in it (GAS), so a
//   blade swung at it in the crowd costs; kill it from afar, or step out.
// - Shieldbearer: its tower shield takes `def.shield` of every blow that comes from the hero's side of
//   it (a blow's push, o.kx/ky, away from him); one from behind or without a push (a pierce, a burst
//   from beside it, a bolt from the sky) comes through whole.
// - Shaman: every `rally.every` s the horde about it (`rally.r`) runs `rally.haste` times as fast for
//   `rally.dur` s and mends `rally.heal` of its health: the one to kill first.
// - Gem Eater: runs for the soul gems lying within `eats.r` of it, eats them (growing), and gives
//   back what it ate as one gem where it falls (no more: a horde drop is the owner's to change).
// The map kinds stand for none of them: every map's night has these four as they are.
import { sfx } from '../engine/audio.js';
import { Ring } from './effects.js';
import { discSprite } from './fxsprites.js';
import { PC, P } from './particles.js';
import { rand } from '../engine/util.js';

export const GAS = { r: 34, dur: 4, dmg: 4, tick: 0.5, grow: 0.3 };

// ------------------------------------------------------------------ bloater --

// A Bloater's gas where it burst (Game.killEnemy): grows over GAS.grow s, lies GAS.dur s; the hero in
// it is bitten every GAS.tick s (GAS.dmg as the night's monsters' blows grow). No monster minds it.
export class Gas {
  constructor(g, x, y) {
    Object.assign(this, { g, x, y, t: 0, hitT: 0 });
  }

  update(dt) {
    const g = this.g, p = g.player;
    this.t += dt;
    this.hitT -= dt;
    const r = GAS.r * Math.min(1, this.t / GAS.grow);
    if (this.hitT <= 0 && Math.hypot(p.x - this.x, (p.y - this.y) / 0.8) < r + p.r) {
      this.hitT = GAS.tick;
      p.hurt(GAS.dmg * g.dmgScale, null, "a Bloater's gas");
    }
    if (Math.random() < 6 * dt) g.particles.emit(this.x + rand(-r, r), this.y + rand(-r, r) * 0.8, 2, 0, -6, 0, 1, 1, PC.l, P.GLOW | P.FADE, 0);
    return this.t < GAS.dur;
  }

  drawGround(ctx, cam) {
    const S = cam.S, r = GAS.r * Math.min(1, this.t / GAS.grow), k = Math.min(1, (GAS.dur - this.t) / 0.8);
    const img = discSprite(Math.max(2, r), ['#9ee562', '#63c74d', '#3e8948'], 0.6);
    ctx.globalAlpha = 0.38 * k;
    ctx.drawImage(img, (this.x - cam.x) * S - (img.width * S) / 2, (this.y - cam.y) * S - (img.height * S * 0.8) / 2, img.width * S, img.height * S * 0.8);
    ctx.globalAlpha = 1;
  }
}

// --------------------------------------------------------------- shieldbearer --

// What of a blow a foe takes (Game.hitEnemy): a Shieldbearer's shield takes def.shield of one that
// pushes it away from the hero (struck from his side); 1 for any other foe or blow.
export function shieldTakes(e, o, p) {
  const k = e.def.shield;
  if (!k || !(o.kx || o.ky)) return 1;
  const hx = e.x - p.x, hy = e.y - p.y, l = Math.hypot(hx, hy) || 1, kl = Math.hypot(o.kx, o.ky) || 1;
  return (o.kx * hx + o.ky * hy) / (l * kl) > 0.5 ? 1 - k : 1;
}

// ------------------------------------------------------------------ shaman --

// A Shaman: it walks at the hero as any walker, and every rally.every s rallies the horde about it.
export function shamanAI(e, dt) {
  const g = e.g, R = e.def.rally;
  e.data.rallyT = (e.data.rallyT ?? rand(0.5, R.every)) - dt;
  if (e.data.rallyT <= 0) {
    e.data.rallyT = R.every;
    const near = g.grid.foes(e.x, e.y, R.r);
    for (let i = 0; i < near.length; i++) {
      const f = near[i];
      if (f.dead || f.prop || f.boss || f.lord || f.elite || f.sealed || Math.hypot(f.x - e.x, f.y - e.y) > R.r) continue;
      f.hasteT = Math.max(f.hasteT, R.dur);
      f.hasteK = R.haste;
      f.hp = Math.min(f.maxHp, f.hp + f.maxHp * R.heal);
    }
    g.effects.push(new Ring(g, e.x, e.y, 6, R.r, 0.5, '#9ee562', false, 2));
    sfx('heal', { pan: Math.max(-1, Math.min(1, (e.x - g.player.x) / 200)) });
  }
  const d = g.world.steer(e, g.player);
  return [d[0], d[1], 1];
}

// ---------------------------------------------------------------- gem eater --

// A Gem Eater: at the nearest soul gem within eats.r if there is one, a little quicker (eats.pace),
// eating it on reaching it; else at the hero.
const TO = { x: 0, y: 0 };
export function gemEaterAI(e, dt) {
  const g = e.g, E = e.def.eats;
  let best = null, bd = E.r;
  for (const pk of g.pickups) {
    if (pk.dead || pk.kind !== 'gem' || pk.pulled) continue;
    const d = Math.hypot(pk.x - e.x, pk.y - e.y);
    if (d < bd) [best, bd] = [pk, d];
  }
  if (best && bd < e.r + 4) {
    best.dead = true;
    e.ate += best.value;
    sfx('gem', { pitch: 0.6 });
  }
  if (!best) {
    const d = g.world.steer(e, g.player);
    return [d[0], d[1], 1];
  }
  TO.x = best.x;
  TO.y = best.y;
  const d = g.world.steer(e, TO);
  return [d[0], d[1], E.pace];
}
