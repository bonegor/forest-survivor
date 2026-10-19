// Damage numbers, casino style: chunky digits with a dark 3D edge that pop in, arc away and
// fade, a shine sweeping across them as they land. Crits flash through jackpot colours like a
// slot machine's lights, and they and gold throw off twinkles. Rapid hits on the same target
// merge into one growing number that re-pops.
//
// They have a hierarchy (TIER), so the late night's thousands of blows never bury the hero or a
// boss: at most MAX alive. The big ones (the hero's wounds and heals, gold, words, and the one
// number each boss, lord or champion holds over its head, HELD) always come. Crits on the horde
// come while fewer than CRIT_MAX are alive, plain hits on it while fewer than PLAIN_MAX are; one
// of a lower tier never pushes out one of a higher. No hit on the horde is shown within CLEAR px
// of the hero, and no number but a boss's own is born on a boss's or a lord's body.

import { textCanvas } from '../engine/font.js';
import { rand, ease, clamp } from '../engine/util.js';
import { glint } from './fxsprites.js';

// color: top to bottom; edge: the 3D edge under each digit; cycle: colours flashed in turn;
// stars: twinkles around it; plain: no shine (the hero's own wounds).
const STYLES = {
  normal: { color: ['#ffffff', '#fff3a8', '#feae34'], edge: '#be4a2f', scale: 0.6 },
  crit: {
    cycle: [
      ['#fff3a8', '#fee761', '#f77622'],
      ['#ffffff', '#f6757a', '#e43b44'],
      ['#ffffff', '#2ce8f5', '#0099db'],
      ['#ffffff', '#f6757a', '#b55088'],
      ['#ffffff', '#fee761', '#feae34'],
    ],
    edge: '#68386c', scale: 0.95, crit: true, stars: 3,
  },
  fire: { color: ['#fee761', '#f77622', '#be4a2f'], edge: '#733e39', scale: 0.62 },
  frost: { color: ['#ffffff', '#2ce8f5', '#0099db'], edge: '#124e89', scale: 0.6 },
  holy: { color: ['#ffffff', '#fee761', '#feae34'], edge: '#be4a2f', scale: 0.62 },
  shock: { color: ['#ffffff', '#c0f0ff', '#2ce8f5'], edge: '#124e89', scale: 0.62 },
  dark: { color: ['#f6757a', '#b55088', '#68386c'], edge: '#3e2731', scale: 0.6 },
  poison: { color: ['#d9ff9e', '#9ee562', '#63c74d'], edge: '#193c3e', scale: 0.58 },
  player: { color: ['#ff8a8a', '#e43b44', '#a22633'], scale: 0.8, plain: true },
  heal: { color: ['#d9ff9e', '#63c74d', '#3e8948'], edge: '#265c42', scale: 0.62, prefix: '+' },
  gold: { color: ['#fff3a8', '#fee761', '#feae34'], edge: '#be4a2f', scale: 0.66, prefix: '+', stars: 2 },
  // What a boss, a lord or a champion has taken lately, held over its head (HELD).
  held: { color: ['#ffffff', '#fee761', '#f77622'], edge: '#733e39', scale: 0.85 },
};
// The plain hits on the horde: shown only while there is room for them (PLAIN_MAX).
const PLAIN = new Set(['normal', 'fire', 'frost', 'holy', 'shock', 'dark', 'poison']);
// The tiers, lowest first.
export const TIER = { plain: 0, crit: 1, big: 2 };

export const MAX = 40;
export const PLAIN_MAX = 12;
export const CRIT_MAX = 10;
// No hit on the horde is shown this near the hero's middle (world px).
export const CLEAR = 22;
// Hits on a boss, a lord or a champion within this many seconds of the last add up in its one
// number over its head.
export const HELD = 0.5;
const LIFE = 0.85;
const TEXT_LIFE = 1.6; // words last longer than numbers (Numbers.text)
// The shine's sweep across the digits: when, and how wide (text pixels).
const SHINE_FROM = 0.05, SHINE_FOR = 0.32, SHINE_W = 3;

export class Numbers {
  constructor() {
    this.list = [];
    this.pool = [];
    this.enabled = true;
    this.count = [0, 0, 0]; // numbers alive in each tier
    this.hero = null; // the hero (Game): the clear zone round him
    this.bodies = null; // the bosses and lords drawn this frame (Game.topList): none is born on one
  }

  clear() {
    for (const n of this.list) {
      n.alive = false;
      this.pool.push(n);
    }
    this.list.length = 0;
    this.count.fill(0);
  }

  // Plain numbers alive (the tests, the drivers).
  get plainN() {
    return this.count[TIER.plain];
  }

  add(x, y, value, style = 'normal', target = null) {
    if (!this.enabled) return;
    value = Math.round(value);
    // A boss, a lord or a champion: one number over its head, growing while the blows keep coming.
    if (target && (target.boss || target.lord || target.elite)) {
      const n = target._num;
      if (n && n.alive && n.hold === target && n.holdId === target.id && n.t < HELD) {
        n.value += value;
        n.t = 0.12;
        n.boost = boostFor(n.value, 'crit');
        n.str = String(n.value);
        if (style === 'crit') n.critT = 0.12;
        return;
      }
      const h = this.spawn(target.x, target.y - target.h - 3, 'held', TIER.big);
      h.vx = h.vz = h.grav = 0;
      h.hold = target;
      h.holdId = target.id;
      h.value = value;
      h.str = String(value);
      h.boost = boostFor(value, 'crit');
      h.critT = style === 'crit' ? 0.12 : 0;
      target._num = h;
      return;
    }
    const plain = PLAIN.has(style), crit = style === 'crit';
    const tier = plain ? TIER.plain : crit ? TIER.crit : TIER.big;
    if (tier < TIER.big && (this.count[tier] >= (plain ? PLAIN_MAX : CRIT_MAX) || this.nearHero(x, y))) return;
    if (style !== 'player' && style !== 'heal' && this.onBody(x, y)) return;
    if (plain && target && target._num && target._num.alive && target._num.t < 0.32 && target._num.style === style) {
      const n = target._num;
      n.value += value;
      n.t = 0.05;
      n.boost = boostFor(n.value, style);
      n.str = (STYLES[style].prefix || '') + n.value;
      return;
    }
    const n = this.spawn(x, y, style, tier);
    if (!n) return;
    n.value = value;
    n.boost = boostFor(value, style);
    n.str = (STYLES[style].prefix || '') + value;
    n.spin = style === 'crit' ? rand(-0.25, 0.25) : 0;
    if (target) target._num = n;
  }

  // Whether a number alive now is drawn over the hero (the hero's outline then goes over it).
  over(p) {
    for (const n of this.list) if (Math.abs(n.x - p.x) < 10 && n.y - n.z > p.y - 26 && n.y - n.z < p.y + 2) return true;
    return false;
  }

  // Within the clear zone round the hero's middle.
  nearHero(x, y) {
    const p = this.hero;
    return !!p && (x - p.x) ** 2 + (y - p.y + 10) ** 2 < CLEAR * CLEAR;
  }

  // On a boss's or a lord's body (its sprite's box): no number but its own is born there.
  onBody(x, y) {
    const B = this.bodies;
    if (!B) return false;
    for (let i = 0; i < B.length; i++) {
      const e = B[i], hw = (e.spr.w * e.scale) / 2;
      if (!e.dead && x > e.x - hw && x < e.x + hw && y > e.y - e.h && y < e.y + 2) return true;
    }
    return false;
  }

  // A few words rather than a number (a level-up the run's auto-pick took: "Blessing ×17"), in
  // a style's colours, rising slowly and lasting longer. Shown even with damage numbers off:
  // it is the only word of what the level gave.
  text(x, y, str, style = 'gold') {
    const n = this.spawn(x, y, style, TIER.big);
    n.x = x;
    n.vx = 0;
    n.vz = 22;
    n.grav = 0;
    n.life = TEXT_LIFE;
    n.boost = 1.1;
    n.str = str;
    n.font = 'normal';
  }

  // A number from the pool, of a tier. At MAX it takes the place of the oldest of the lowest tier
  // below its own, or a big one of the oldest big one; else there is no room for it (null).
  spawn(x, y, style, tier) {
    const L = this.list;
    if (L.length >= MAX) {
      let at = -1;
      for (let t = 0; t <= Math.min(tier, TIER.big) && at < 0; t++) {
        if (t === tier && tier < TIER.big) break;
        at = L.findIndex((m) => m.tier === t);
      }
      if (at < 0) return null;
      this.drop(at);
    }
    const n = this.pool.pop() || {};
    n.tier = tier;
    this.count[tier]++;
    n.hold = null;
    n.holdId = 0;
    n.critT = 0;
    n.x = style === 'held' ? x : x + rand(-3, 3);
    n.y = y;
    n.z = 0;
    n.vx = rand(-22, 22);
    n.vz = rand(62, 86);
    n.grav = 210;
    n.t = 0;
    n.life = LIFE;
    n.value = 0;
    n.style = style;
    n.font = 'bold';
    n.alive = true;
    n.spin = 0;
    n.seed = (Math.random() * 1000) | 0;
    this.list.push(n);
    return n;
  }

  // The i-th number back to the pool.
  drop(i) {
    const n = this.list[i];
    n.alive = false;
    this.count[n.tier]--;
    this.list.splice(i, 1);
    this.pool.push(n);
  }

  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const n = L[i];
      n.t += dt;
      if (n.critT > 0) n.critT -= dt;
      if (n.t >= n.life) {
        this.drop(i);
        continue;
      }
      // A held number stays over its foe's head while the foe stands (not pooled as another).
      if (n.hold) {
        const e = n.hold;
        if (e.id === n.holdId && !e.dead) {
          n.x = e.x;
          n.y = e.y - e.h - 3;
        } else n.hold = null;
        continue;
      }
      n.x += n.vx * dt;
      n.z += n.vz * dt;
      n.vz -= n.grav * dt;
      n.vx *= Math.exp(-2 * dt);
    }
  }

  draw(ctx, cam) {
    const S = cam.S;
    for (const n of this.list) {
      const st = STYLES[n.style];
      const t = n.t;
      let k;
      if (t < 0.06) k = 0.3 + (1.75 - 0.3) * (t / 0.06);
      else if (t < 0.2) k = 1.75 - 0.75 * ease.outCubic((t - 0.06) / 0.14);
      else k = 1 - Math.max(0, t - (n.life - 0.3)) * 0.6;
      const scale = st.scale * n.boost * k * S;
      const alpha = clamp(t > n.life * 0.65 ? 1 - (t - n.life * 0.65) / (n.life * 0.35) : 1, 0, 1);
      const sx = (n.x - cam.x) * S;
      const sy = (n.y - n.z - cam.y) * S;
      if (sx < -200 || sy < -200 || sx > cam.pxW + 200 || sy > cam.pxH + 200) continue;
      const color = st.cycle ? st.cycle[(Math.floor(t * 16) + n.seed) % st.cycle.length] : st.color;
      const c = textCanvas(n.str, color, '#181425', st.edge || null, n.font);
      const w = c.width * scale, h = c.height * scale;
      const spin = n.spin && t < 0.3;
      ctx.globalAlpha = alpha;
      if (spin) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(n.spin * (1 - t / 0.3) * Math.sin(t * 45));
      }
      // Top-left of the number, around the origin while it spins; a held one stands on its foe's head.
      const X = spin ? -w / 2 : Math.round(sx - w / 2), Y = spin ? -h / 2 : n.style === 'held' ? Math.round(sy - h) : Math.round(sy - h / 2);
      ctx.drawImage(c, X, Y, Math.round(w), Math.round(h));
      // The shine: a band of the digits drawn white, sweeping left to right as it lands.
      if (!st.plain && t > SHINE_FROM && t < SHINE_FROM + SHINE_FOR) {
        const wc = textCanvas(n.str, '#ffffff', '#181425', st.edge || null, n.font);
        const at = Math.round(-SHINE_W + ((t - SHINE_FROM) / SHINE_FOR) * (c.width + SHINE_W));
        const x0 = Math.max(0, at), x1 = Math.min(c.width, at + SHINE_W);
        if (x1 > x0) {
          ctx.globalAlpha = alpha * 0.9;
          ctx.drawImage(wc, x0, 0, x1 - x0, c.height, X + x0 * scale, Y, (x1 - x0) * scale, h);
        }
      }
      // White-hot flash on the first frames of a crit, and on a held number a crit was just added to.
      if ((st.crit && t < 0.09) || n.critT > 0) {
        const fc = textCanvas(n.str, '#ffffff', '#ffffff', st.edge ? '#ffffff' : null, 'bold');
        ctx.globalAlpha = 0.85 * (1 - t / 0.09);
        ctx.drawImage(fc, X, Y, Math.round(w), Math.round(h));
      }
      if (spin) ctx.restore();
      // Twinkles circling a crit or gold, each breathing in turn.
      if (st.stars && t > 0.04) {
        const kk = Math.max(1, Math.round(S * 0.75));
        for (let i = 0; i < st.stars; i++) {
          const a = n.seed + (i / st.stars) * Math.PI * 2 + t * 2.2;
          const tw = Math.abs(Math.sin(t * 13 + i * 2.1));
          ctx.globalAlpha = alpha * (0.35 + 0.65 * tw);
          glint(ctx, sx + Math.cos(a) * (w / 2 + 2 * S), sy + Math.sin(a) * (h / 2 + 2 * S), S * (0.6 + 1.6 * tw), kk, i % 2 ? '#ffffff' : '#fee761');
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}

function boostFor(v, style) {
  const b = 0.85 + Math.log10(Math.max(1, v)) * 0.22;
  return clamp(style === 'crit' ? b * 1.1 : b, 0.85, style === 'crit' ? 2.1 : 1.7);
}
