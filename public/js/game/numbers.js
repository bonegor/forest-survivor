// Damage numbers, casino style: chunky digits with a dark 3D edge that pop in, arc away and
// fade, a shine sweeping across them as they land. Crits flash through jackpot colours like a
// slot machine's lights, and they and gold throw off twinkles. Rapid hits on the same target
// merge into one growing number that re-pops.

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
};

const MAX = 170;
const LIFE = 0.85;
// The shine's sweep across the digits: when, and how wide (text pixels).
const SHINE_FROM = 0.05, SHINE_FOR = 0.32, SHINE_W = 3;

export class Numbers {
  constructor() {
    this.list = [];
    this.pool = [];
    this.enabled = true;
  }

  clear() {
    this.list.length = 0;
  }

  add(x, y, value, style = 'normal', target = null) {
    if (!this.enabled) return;
    value = Math.round(value);
    if (target && target._num && target._num.alive && target._num.t < 0.32 && target._num.style === style) {
      const n = target._num;
      n.value += value;
      n.t = 0.05;
      n.boost = boostFor(n.value, style);
      n.str = (STYLES[style].prefix || '') + n.value;
      return;
    }
    let n;
    if (this.list.length >= MAX) {
      n = this.list.shift();
    } else n = this.pool.pop() || {};
    n.x = x + rand(-3, 3);
    n.y = y;
    n.z = 0;
    n.vx = rand(-22, 22);
    n.vz = rand(62, 86);
    n.t = 0;
    n.value = value;
    n.style = style;
    n.boost = boostFor(value, style);
    n.str = (STYLES[style].prefix || '') + value;
    n.alive = true;
    n.spin = style === 'crit' ? rand(-0.25, 0.25) : 0;
    n.seed = (Math.random() * 1000) | 0;
    if (target) target._num = n;
    this.list.push(n);
  }

  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const n = L[i];
      n.t += dt;
      if (n.t >= LIFE) {
        n.alive = false;
        L.splice(i, 1);
        this.pool.push(n);
        continue;
      }
      n.x += n.vx * dt;
      n.z += n.vz * dt;
      n.vz -= 210 * dt;
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
      else k = 1 - Math.max(0, t - 0.55) * 0.6;
      const scale = st.scale * n.boost * k * S;
      const alpha = clamp(t > LIFE * 0.65 ? 1 - (t - LIFE * 0.65) / (LIFE * 0.35) : 1, 0, 1);
      const sx = (n.x - cam.x) * S;
      const sy = (n.y - n.z - cam.y) * S;
      if (sx < -200 || sy < -200 || sx > cam.pxW + 200 || sy > cam.pxH + 200) continue;
      const color = st.cycle ? st.cycle[(Math.floor(t * 16) + n.seed) % st.cycle.length] : st.color;
      const c = textCanvas(n.str, color, '#181425', st.edge || null, 'bold');
      const w = c.width * scale, h = c.height * scale;
      const spin = n.spin && t < 0.3;
      ctx.globalAlpha = alpha;
      if (spin) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(n.spin * (1 - t / 0.3) * Math.sin(t * 45));
      }
      // Top-left of the number, around the origin while it spins.
      const X = spin ? -w / 2 : Math.round(sx - w / 2), Y = spin ? -h / 2 : Math.round(sy - h / 2);
      ctx.drawImage(c, X, Y, Math.round(w), Math.round(h));
      // The shine: a band of the digits drawn white, sweeping left to right as it lands.
      if (!st.plain && t > SHINE_FROM && t < SHINE_FROM + SHINE_FOR) {
        const wc = textCanvas(n.str, '#ffffff', '#181425', st.edge || null, 'bold');
        const at = Math.round(-SHINE_W + ((t - SHINE_FROM) / SHINE_FOR) * (c.width + SHINE_W));
        const x0 = Math.max(0, at), x1 = Math.min(c.width, at + SHINE_W);
        if (x1 > x0) {
          ctx.globalAlpha = alpha * 0.9;
          ctx.drawImage(wc, x0, 0, x1 - x0, c.height, X + x0 * scale, Y, (x1 - x0) * scale, h);
        }
      }
      // White-hot flash on the first frames of a crit.
      if (st.crit && t < 0.09) {
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
