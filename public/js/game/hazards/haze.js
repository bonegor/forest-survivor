// The Sunscorch's duststorm (28 October 2026): the owner's "weather is clear or has duststorm with effect
// reduced visibility". At the storm's height (the weather's `key`, murk, at 1) the hero sees clearly
// only `clear` px round him (110-130 px: REQS2); beyond it the blowing sand thickens to `full` px and
// hides the rest at `alpha`, in the sand's colour (`rgb`). It comes in and goes with the weather's front
// (weather.js FRONT, 25 s), as the storm's grains and its thicker fog do (Weather.draw, Forest.drawOverlay).
//
// What it hides is still found: the edge markers point at what is off the screen as ever, and what is
// on it but lost in the sand (the boss, an unused shrine, an open crypt, a chest, the thief) shows its
// marker where it stands (hazeR, Hud.drawIndicators). It goes over the world's fog and under the storm's
// grains (Game.drawSkies); the foes' shots, the numbers, the hero and the HUD are drawn over it, so no
// blow comes unseen.
//
// Seen where the weather is seen (not in a crypt, not on the road by day, and not with the options'
// weather turned off: it is the storm's look, if one that fights), whether or not the run is headless.

import { makeCanvas, clamp } from '../../engine/util.js';

// The hole's texture, a side: clear inside clear/full of its radius, the sand rising to opaque at its rim.
const SIDE = 128;
const holes = new Map();

export class Haze {
  // spec: the look's (biomes/desert.js hazards.haze): { key, clear, full, alpha, rgb }.
  constructor(g, spec) {
    this.g = g;
    this.s = spec;
    this.fill = `rgb(${spec.rgb.join(',')})`;
    this.tex = null; // its hole (hole), fetched at its first draw, never looked up again
  }

  update() {}

  // How thick the sand blows now, 0 to 1: the weather's blend of its key.
  get murk() {
    const g = this.g, w = g.weather;
    if (!w || g.inCrypt || g.world.noWeather || g.settings.weather === false) return 0;
    return clamp(w.now[this.s.key] || 0, 0, 1);
  }

  // World px of clear sight while the storm is thick (murk over 0.4), else null.
  get hazeR() {
    return this.murk > 0.4 ? this.s.clear : null;
  }

  // In screen space: the hole round his feet, scaled so its rim is `full` world px out, and the sand
  // all round it, at murk × alpha. Nothing at all drawn while the sky is clear.
  drawOverlay(ctx, cam) {
    const m = this.murk;
    if (m <= 0) return;
    const s = this.s, p = this.g.player, S = cam.S, W = cam.pxW, H = cam.pxH;
    const R = s.full * S, cx = (p.x - cam.x) * S, cy = (p.y - 8 - cam.y) * S;
    const x0 = Math.round(cx - R), x1 = Math.round(cx + R), y0 = Math.round(cy - R), y1 = Math.round(cy + R);
    ctx.globalAlpha = m * s.alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage((this.tex ??= hole(s)), x0, y0, x1 - x0, y1 - y0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = this.fill;
    const top = clamp(y0, 0, H), bottom = clamp(y1, 0, H);
    if (top > 0) ctx.fillRect(0, 0, W, top);
    if (bottom < H) ctx.fillRect(0, bottom, W, H - bottom);
    if (bottom > top) {
      if (x0 > 0) ctx.fillRect(0, top, Math.min(x0, W), bottom - top);
      if (x1 < W) ctx.fillRect(Math.max(0, x1), top, W - Math.max(0, x1), bottom - top);
    }
    ctx.globalAlpha = 1;
  }
}

// The hole for a haze's numbers, made once: the sand's colour, clear out to clear/full of the radius,
// thickening smoothly to opaque at it, opaque in the corners beyond.
function hole(s) {
  const key = `${s.clear}|${s.full}|${s.rgb.join(',')}`;
  let c = holes.get(key);
  if (c) return c;
  c = makeCanvas(SIDE, SIDE);
  const g = c.getContext('2d'), img = g.createImageData(SIDE, SIDE), d = img.data, h = SIDE / 2, inner = s.clear / s.full;
  for (let y = 0; y < SIDE; y++) {
    for (let x = 0; x < SIDE; x++) {
      const r = Math.hypot(x + 0.5 - h, y + 0.5 - h) / h;
      const k = clamp((r - inner) / (1 - inner), 0, 1), i = (y * SIDE + x) * 4;
      d[i] = s.rgb[0];
      d[i + 1] = s.rgb[1];
      d[i + 2] = s.rgb[2];
      d[i + 3] = Math.round(255 * k * k * (3 - 2 * k));
    }
  }
  g.putImageData(img, 0, 0);
  holes.set(key, c);
  return c;
}
