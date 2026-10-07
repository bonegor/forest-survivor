// Damage numbers: chunky digits that pop in, arc away and fade. Rapid hits
// on the same target merge into one growing number that re-pops.

import { textCanvas } from '../engine/font.js';
import { rand, ease, clamp } from '../engine/util.js';

const STYLES = {
  normal: { color: ['#ffffff', '#ffffff', '#c0cbdc'], scale: 0.6 },
  crit: { color: ['#fee761', '#feae34', '#f77622'], scale: 0.95, crit: true },
  fire: { color: ['#fee761', '#f77622', '#be4a2f'], scale: 0.62 },
  frost: { color: ['#ffffff', '#2ce8f5', '#0099db'], scale: 0.6 },
  holy: { color: ['#ffffff', '#fee761', '#feae34'], scale: 0.62 },
  shock: { color: ['#ffffff', '#c0f0ff', '#2ce8f5'], scale: 0.62 },
  dark: { color: ['#f6757a', '#b55088', '#68386c'], scale: 0.6 },
  player: { color: ['#ff8a8a', '#e43b44', '#a22633'], scale: 0.8 },
  heal: { color: ['#d9ff9e', '#63c74d', '#3e8948'], scale: 0.62, prefix: '+' },
  gold: { color: ['#fff3a8', '#feae34', '#be4a2f'], scale: 0.6, prefix: '+' },
};

const MAX = 170;
const LIFE = 0.85;

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
      const alpha = t > LIFE * 0.65 ? 1 - (t - LIFE * 0.65) / (LIFE * 0.35) : 1;
      const sx = (n.x - cam.x) * S;
      const sy = (n.y - n.z - cam.y) * S;
      if (sx < -200 || sy < -200 || sx > cam.pxW + 200 || sy > cam.pxH + 200) continue;
      const c = textCanvas(n.str, st.color, '#181425', null, 'bold');
      const w = c.width * scale, h = c.height * scale;
      ctx.globalAlpha = clamp(alpha, 0, 1);
      if (n.spin && t < 0.3) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(n.spin * (1 - t / 0.3) * Math.sin(t * 45));
        ctx.drawImage(c, -w / 2, -h / 2, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(c, Math.round(sx - w / 2), Math.round(sy - h / 2), Math.round(w), Math.round(h));
      }
      // White-hot flash on the first frames of a crit.
      if (st.crit && t < 0.09) {
        const wc = textCanvas(n.str, '#ffffff', '#ffffff', null, 'bold');
        ctx.globalAlpha = 0.85 * (1 - t / 0.09);
        ctx.drawImage(wc, Math.round(sx - w / 2), Math.round(sy - h / 2), Math.round(w), Math.round(h));
      }
    }
    ctx.globalAlpha = 1;
  }
}

function boostFor(v, style) {
  const b = 0.85 + Math.log10(Math.max(1, v)) * 0.22;
  return clamp(style === 'crit' ? b * 1.1 : b, 0.85, style === 'crit' ? 2.1 : 1.7);
}
