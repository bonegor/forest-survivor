// Weather over the Darkwood: clear or rain, changing as the night goes on. Rain brings the
// thunder: now and then lightning strikes somewhere in view.
//
// The whole night's weather is forecast when the run begins, from the run's seed: a chain of
// spells, each lasting minutes, each passing into the next over a front of FRONT seconds. What
// the sky does at any second is a pure function of the night's clock (Weather.at), so setting the
// clock (the developer panel) jumps the weather with it, and the crypts, where the clock stands
// still, hold it. Nothing here touches Math.random: the seeded runs (the tests, the bots) play
// out exactly as before.
//
// The timeframes, a 15-minute night standing for a whole real one: a spell is a few minutes of
// play, as a passing storm is an hour or two of a real night. The owner's call (27 October 2026):
// no wind, only rain with its thunder, or a clear sky with none. The first minutes are clear,
// while a new hero learns the woods; the sky clears before dawn, so the sunrise is seen.
//
// It is all for the eye and the ear: no monster, hero or weapon fights any differently in it.

import { mulberry32, clamp, lerp } from '../engine/util.js';
import { sfx, weatherBed } from '../engine/audio.js';

// What each weather is: rain (0..1, how hard), dark (how much it dims the night's ambient light)
// and lightning (0..1, how often it strikes).
export const SKIES = {
  clear: { rain: 0, dark: 0, lightning: 0 },
  rain: { rain: 1, dark: 0.15, lightning: 1 },
};

// How long a spell of each lasts (seconds of the night's clock) and what may come after it, by
// weight.
export const SPELLS = {
  clear: { secs: [120, 240], next: { rain: 1 } },
  rain: { secs: [90, 180], next: { clear: 1 } },
};

export const FRONT = 25; // seconds one weather takes to pass into the next
export const CALM_START = 120; // the first two minutes are clear
export const DAWN_CLEAR = 90; // and the sky clears this long before dawn
const ENDLESS = 4 * 3600; // how far the forecast reaches in a night with no dawn

// Lightning while the rain is at its height: a strike every GAP seconds, a bolt at a random place
// in view with its flash, and the thunder a moment after.
export const LIGHTNING = { gap: [6, 16] };

// A spell of rain opens with a great clap of thunder, echoing, and the hush of the shower rising
// under it over `in` seconds; it is heard at full until `full` seconds into the spell, then fades
// over `fade` to `after` of full (0: gone, the music alone - whether the rain is heard all through
// is still the owner's to decide). The ground is wet while the rain is WET hard or more: the
// hero's steps squelch.
export const RAIN_HEARD = { in: 6, full: 30, fade: 12, after: 0 };
export const WET = 0.35;

// The rain: drops in view at full strength, and their fall.
const DROPS = 360, FALL = [250, 330], HIGH = [70, 190];
const SPLASHES = 96;

function pickNext(rng, kind) {
  const next = SPELLS[kind].next;
  let sum = 0;
  for (const k in next) sum += next[k];
  let r = rng() * sum;
  for (const k in next) if ((r -= next[k]) < 0) return k;
  return 'clear';
}

const span = (rng, [a, b]) => a + rng() * (b - a);

// The night's spells, [{ kind, at, until }], from `from` (the first spell given) to `end`.
export function forecast(seed, duration, first = { kind: 'clear', at: 0, until: CALM_START }, rng = mulberry32(seed ^ 0x5ea7)) {
  const spells = [first];
  // A spell forced past the clearing (the developer panel) runs its course before it.
  const end = Number.isFinite(duration) ? Math.max(duration - DAWN_CLEAR, first.until) : ENDLESS;
  let last = first;
  while (last.until < end) {
    const kind = pickNext(rng, last.kind);
    last = { kind, at: last.until, until: last.until + span(rng, SPELLS[kind].secs) };
    spells.push(last);
  }
  if (Number.isFinite(duration)) {
    // Cut at the clearing before dawn: a spell too short to be worth its front is folded into
    // the one before.
    last.until = Math.max(last.at, end);
    if (spells.length > 1 && last.until - last.at < 45) {
      spells.pop();
      spells[spells.length - 1].until = end;
    }
    if (spells[spells.length - 1].kind !== 'clear') spells.push({ kind: 'clear', at: end, until: Infinity });
    else spells[spells.length - 1].until = Infinity;
  }
  return spells;
}

const smooth = (k) => k * k * (3 - 2 * k);

export class Weather {
  constructor(g) {
    this.g = g;
    this.rng = mulberry32(g.seed ^ 0x77e1);
    this.spells = forecast(g.seed, g.duration);
    // Where things stand now (update): the sky's blend and the spell under way.
    this.now = { rain: 0, dark: 0, lightning: 0 };
    this.kind = 'clear';
    this.flash = 0; // a lightning flash, 1 at its brightest, dying away
    this.bolt = null; // { pts, x, y, t } a strike's bolt on screen
    this.strikeT = span(this.rng, LIGHTNING.gap);
    this.thunder = []; // [{ t, size, pan }] thunder on its way
    this.bedT = 0;
    this.rainAt = null; // when the latest spell of rain began
    // The rain, in world space: x, y the ground under a drop, z its height.
    this.n = 0;
    this.dx = new Float32Array(DROPS);
    this.dy = new Float32Array(DROPS);
    this.dz = new Float32Array(DROPS);
    this.dv = new Float32Array(DROPS);
    this.splash = [];
  }

  // Whether the weather is to be seen and heard: the forest only, by night, out of the crypts,
  // unless the options turned it off.
  // Whether the hero's steps fall on wet ground.
  get wet() {
    return this.shown && this.now.rain >= WET;
  }

  get shown() {
    const g = this.g;
    return !g.headless && !g.inCrypt && !g.world.daylight && g.settings.weather !== false;
  }

  // The sky at second t of the night: the blend of the spell under way and the one it follows.
  at(t, out = {}) {
    const S = this.spells;
    let i = 0;
    while (i < S.length - 1 && S[i].until <= t) i++;
    const cur = SKIES[S[i].kind], front = S[i].front ?? FRONT;
    const k = i > 0 ? smooth(clamp((t - S[i].at) / front, 0, 1)) : 1;
    const prev = i > 0 ? SKIES[S[i - 1].kind] : cur;
    for (const key in cur) out[key] = lerp(prev[key], cur[key], k);
    out.kind = S[i].kind;
    out.at = S[i].at;
    return out;
  }

  // The developer panel's: this weather from now on, coming in fast, the forecast made again after it.
  force(kind) {
    const t = this.g.time;
    const keep = this.spells.filter((s) => s.at < t);
    if (keep.length) keep[keep.length - 1].until = t;
    const spell = { kind, at: t, until: t + span(this.rng, SPELLS[kind].secs), front: 3 };
    this.spells = [...keep, ...forecast(0, this.g.duration, spell, this.rng)];
  }

  update(dt) {
    const g = this.g, w = this.at(g.time, this.now);
    this.kind = w.kind;
    // A spell of rain beginning: the opening clap, if it began just now (not the clock set into it).
    if (w.kind === 'rain' && w.at !== this.rainAt) {
      this.rainAt = w.at;
      if (this.shown && g.time - w.at < 2) this.strike(true);
    }
    this.flash *= Math.exp(-dt * 11);
    if (this.bolt && (this.bolt.t -= dt) <= 0) this.bolt = null;
    const shown = this.shown;

    // Lightning, while the rain is near its height.
    if (w.lightning > 0.5) {
      this.strikeT -= dt * w.lightning;
      if (this.strikeT <= 0) {
        this.strikeT = span(this.rng, LIGHTNING.gap);
        if (shown) this.strike();
      }
    }
    for (let i = this.thunder.length - 1; i >= 0; i--) {
      const th = this.thunder[i];
      if ((th.t -= dt) > 0) continue;
      this.thunder.splice(i, 1);
      if (shown) sfx(th.big ? 'bigthunder' : 'thunder', { size: th.size, pan: th.pan });
    }

    // The rain heard: held where it is while this runs, fading by itself once it
    // stops (a pause, the menus, the end). Muffled in a crypt.
    if ((this.bedT -= dt) <= 0) {
      this.bedT = 0.1;
      const on = !g.headless && !g.world.daylight && g.settings.weather !== false, k = g.inCrypt ? 0.2 : 1;
      if (on) weatherBed(this.heard(g.time, w) * k);
    }

    if (shown) this.rain(dt, w);
    else this.n = 0;
  }

  // How loud the rain is heard at second t (RAIN_HEARD): the shower's hush through the first of
  // the spell, fading with the rain as it passes.
  heard(t, w) {
    if (this.rainAt === null) return 0;
    const H = RAIN_HEARD, s = t - this.rainAt;
    const k = s < H.in ? smooth(clamp(s / H.in, 0, 1)) : lerp(1, H.after, smooth(clamp((s - H.full) / H.fade, 0, 1)));
    return k * (w.kind === 'rain' ? 1 : w.rain);
  }

  // A lightning strike: a bolt down to a random place in view, its flash, and the thunder at once;
  // `big`, the clap that opens a spell of rain.
  strike(big = false) {
    const g = this.g, c = g.cam, rng = this.rng;
    this.flash = 1;
    const fx = 0.08 + rng() * 0.84;
    const x = c.x + c.W * fx, y = c.y + c.H * (0.3 + rng() * 0.62);
    const pts = [];
    let px = x + (rng() - 0.5) * 40, py = c.y - 10;
    const steps = 9;
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      pts.push(lerp(px, x, k) + (i && i < steps ? (rng() - 0.5) * 16 : 0), lerp(py, y, k));
    }
    this.bolt = { pts, x, y, t: 0.22 };
    this.thunder.push({ t: span(rng, [0.1, 0.45]), size: 1, pan: (fx - 0.5) * 1.4, big });
  }

  rain(dt, w) {
    const c = this.g.cam, rng = this.rng;
    const want = Math.round(DROPS * w.rain);
    while (this.n < want) this.drop(this.n++, c, true);
    if (this.n > want) this.n = want;
    for (let i = 0; i < this.n; i++) {
      this.dz[i] -= this.dv[i] * dt;
      if (this.dz[i] > 0) continue;
      if (this.splash.length < SPLASHES && rng() < 0.6) this.splash.push({ x: this.dx[i], y: this.dy[i], t: 0 });
      this.drop(i, c, false);
    }
    for (let i = this.splash.length - 1; i >= 0; i--) if ((this.splash[i].t += dt) > 0.22) this.splash.splice(i, 1);
  }

  // A drop over the view; `any` one at any height (the rain starting).
  drop(i, c, any) {
    const rng = this.rng, v = span(rng, FALL), z = any ? rng() * HIGH[1] : span(rng, HIGH);
    this.dv[i] = v;
    this.dz[i] = z;
    this.dx[i] = c.x - 20 + rng() * (c.W + 40);
    this.dy[i] = c.y - 10 + rng() * (c.H + 30);
  }

  // The night's ambient light, dimmed under cloud and lit by lightning (Forest.ambient).
  tint(a) {
    if (!this.shown) return a;
    const d = this.now.dark, f = Math.min(1, this.flash) * 0.6;
    const r = a[0] * (1 - d * 1.2), gg = a[1] * (1 - d), b = a[2] * (1 - d * 0.6);
    return [lerp(r, 225, f), lerp(gg, 232, f), lerp(b, 255, f)];
  }

  // The strike's light on the woods (Game.draw, with the other lights).
  addLights(g) {
    if (this.bolt && this.shown) g.light(this.bolt.x, this.bolt.y, 170, 'cold', Math.min(1, this.bolt.t * 6));
  }

  // Over the world, under the foes' shots and the numbers: the rain, its splashes, a bolt.
  draw(ctx, c) {
    if (!this.shown) return;
    const S = c.S, w = this.now;
    if (this.n) {
      const lw = Math.max(1, Math.round(S / 2)), k = 0.028;
      ctx.strokeStyle = `rgba(165,185,230,${(0.18 + 0.17 * w.rain).toFixed(3)})`;
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (let i = 0; i < this.n; i++) {
        const x = (this.dx[i] - c.x) * S, y = (this.dy[i] - this.dz[i] - c.y) * S;
        if (x < -20 || y < -40 || x > c.pxW + 20 || y > c.pxH + 20) continue;
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - this.dv[i] * k * S);
      }
      ctx.stroke();
    }
    if (this.splash.length) {
      ctx.fillStyle = 'rgb(175,195,235)';
      const px = Math.max(1, Math.round(S / 2));
      for (const s of this.splash) {
        const x = (s.x - c.x) * S, y = (s.y - c.y) * S, o = (1 + s.t * 14) * S * 0.5;
        ctx.globalAlpha = 0.45 * (1 - s.t / 0.22);
        ctx.fillRect(x - o - px, y - px, px, px);
        ctx.fillRect(x + o, y - px, px, px);
        ctx.fillRect(x - px / 2, y - px - s.t * 10 * S, px, px);
      }
      ctx.globalAlpha = 1;
    }
    if (this.bolt) {
      const b = this.bolt, a = (b.t > 0.14 || b.t < 0.07 ? 1 : 0.35) * Math.min(1, b.t * 8);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < b.pts.length; i += 2) {
        const x = (b.pts[i] - c.x) * S, y = (b.pts[i + 1] - c.y) * S;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = `rgba(120,150,255,${(0.35 * a).toFixed(3)})`;
      ctx.lineWidth = S * 3;
      ctx.stroke();
      ctx.strokeStyle = `rgba(235,240,255,${a.toFixed(3)})`;
      ctx.lineWidth = Math.max(1, S * 0.75);
      ctx.stroke();
      ctx.restore();
    }
  }
}
