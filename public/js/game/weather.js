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
//
// The other Survival maps (28 October 2026) each have a climate of their own (game/biomes.js, a
// look's `weather`): their skies and spells in place of SKIES and SPELLS, forecast alike, and how
// their weather looks: the Sunscorch's clear skies and duststorms, the Frostfell's snow and blizzards, the
// Bloomvale's drifting petals and soft showers, the Abyss's ashfall and ember storms with red
// lightning. Only rain is heard and only rain wets a step; snow, sand, ash and petals fall silent
// (fresh snow crunches underfoot: `crunch`), and lightning brings the same thunder anywhere. The
// Darkwood's climate (CLIMATE) is the rain and clear above, forecast and drawn exactly as before.

import { mulberry32, clamp, lerp, TAU } from '../engine/util.js';
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

// A climate: its skies (every one of them with the same keys, rain, dark and lightning among them,
// as at() blends one into the next key by key; and a 'clear', which opens and closes every night)
// and its spells, and how its weather looks: `dim`, how the dark of a sky takes the night's red,
// green and blue (DIM); `flash`, the colour lightning lights the night with (FLASH); `bolt`, a
// bolt's colours and its light (BOLT); `gap`, the seconds between strikes (LIGHTNING.gap); `cast`,
// { to, k }: the colour a sky's `cast` pulls the night toward; `crunch`, the sky key under which
// the hero's steps crunch; `motes`, what falls or blows besides rain (Weather.drift: flakes, grains,
// embers). The Darkwood's is SKIES and SPELLS and the rest as it always was.
// Since 28 October 2026 a climate may say which skies its day opens and closes with (`first`, `close`;
// 'clear' unless given): the Frostfell's snow from its first second to its last (the owner's "Weather
// is snow blizzard"). A sky's other keys may drive a map's hazards too (game/hazards: the Sunscorch's
// `murk`, its duststorm's blinding sand; the Frostfell's `gust`, how often its gusts blow).
export const CLIMATE = { skies: SKIES, spells: SPELLS };
const DIM = [1.2, 1, 0.6];
const FLASH = [225, 232, 255];
const BOLT = { glow: '120,150,255', core: '235,240,255', light: 'cold' };

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

function pickNext(rng, kind, table = SPELLS) {
  const next = table[kind].next;
  let sum = 0;
  for (const k in next) sum += next[k];
  let r = rng() * sum;
  for (const k in next) if ((r -= next[k]) < 0) return k;
  return 'clear';
}

const span = (rng, [a, b]) => a + rng() * (b - a);

// The night's spells, [{ kind, at, until }], from `from` (the first spell given) to `end`; of a
// climate's spells (`table`, the Darkwood's SPELLS without one).
export function forecast(seed, duration, first = { kind: 'clear', at: 0, until: CALM_START }, rng = mulberry32(seed ^ 0x5ea7), table = SPELLS) {
  const spells = [first];
  // A spell forced past the clearing (the developer panel) runs its course before it.
  const end = Number.isFinite(duration) ? Math.max(duration - DAWN_CLEAR, first.until) : ENDLESS;
  let last = first;
  while (last.until < end) {
    const kind = pickNext(rng, last.kind, table);
    last = { kind, at: last.until, until: last.until + span(rng, table[kind].secs) };
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
  // climate: the night's look's (game/biomes.js `weather`); the Darkwood's (CLIMATE) without one.
  constructor(g, climate = null) {
    const C = (this.climate = climate || CLIMATE);
    this.skies = C.skies;
    this.g = g;
    this.rng = mulberry32(g.seed ^ 0x77e1);
    // Opened by its `first` sky for the calm minutes where the climate gives one, and closed by its
    // `close` (closes); the Darkwood's (neither) forecast exactly as it always was.
    this.spells = forecast(g.seed, g.duration, C.first ? { kind: C.first, at: 0, until: CALM_START } : undefined, undefined, C.spells);
    this.closes();
    // Where things stand now (update): the sky's blend and the spell under way.
    this.now = { ...C.skies.clear };
    this.kind = 'clear';
    this.flash = 0; // a lightning flash, 1 at its brightest, dying away
    this.bolt = null; // { pts, x, y, t } a strike's bolt on screen
    this.strikeT = span(this.rng, C.gap || LIGHTNING.gap);
    this.thunder = []; // [{ t, size, pan }] thunder on its way
    this.bedT = 0;
    this.rainAt = null; // when the latest spell of rain began
    this.stormAt = null; // when the latest spell of rain or lightning began (its opening clap)
    // The rain, in world space: x, y the ground under a drop, z its height.
    this.n = 0;
    this.dx = new Float32Array(DROPS);
    this.dy = new Float32Array(DROPS);
    this.dz = new Float32Array(DROPS);
    this.dv = new Float32Array(DROPS);
    this.splash = [];
    // What else falls or blows (C.motes, none in the Darkwood), each style in typed arrays of its
    // own as the rain is: x, y the ground under a mote, z its height, v its fall (an ember's rise),
    // u its speed along x, p its phase (its sway, an ember's flicker); and its colours as drawn.
    this.motes = (C.motes || []).map((s) => ({
      s, n: 0, x: new Float32Array(s.most), y: new Float32Array(s.most), z: new Float32Array(s.most),
      v: new Float32Array(s.most), u: new Float32Array(s.most), p: new Float32Array(s.most),
      fill: s.colors.map((rgb) => `rgba(${rgb},${s.alpha})`),
    }));
  }

  // Whether the hero's steps fall on wet ground.
  get wet() {
    return this.shown && this.now.rain >= WET;
  }

  // Whether they fall in fresh snow (a climate's `crunch`: the sky's key for it), to crunch.
  get crunch() {
    const k = this.climate.crunch;
    return !!k && this.shown && this.now[k] >= WET;
  }

  // Whether the weather is to be seen and heard: on a map's ground, by night or by day (a map spent
  // in the sun has its weather too: 28 October 2026), out of the crypts, unless the world has none
  // (the road by day: noWeather) or the options turned it off.
  get shown() {
    const g = this.g;
    return !g.headless && !g.inCrypt && !g.world.noWeather && g.settings.weather !== false;
  }

  // The sky at second t of the night: the blend of the spell under way and the one it follows.
  at(t, out = {}) {
    const S = this.spells;
    let i = 0;
    while (i < S.length - 1 && S[i].until <= t) i++;
    const cur = this.skies[S[i].kind], front = S[i].front ?? FRONT;
    const k = i > 0 ? smooth(clamp((t - S[i].at) / front, 0, 1)) : 1;
    const prev = i > 0 ? this.skies[S[i - 1].kind] : cur;
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
    const table = this.climate.spells;
    const spell = { kind, at: t, until: t + span(this.rng, table[kind].secs), front: 3 };
    this.spells = [...keep, ...forecast(0, this.g.duration, spell, this.rng, table)];
    this.closes();
  }

  // A climate's `close` sky for the last spell, the one the day ends in (forecast's clearing before
  // dawn), in a run that ends; none given, it stays clear.
  closes() {
    const k = this.climate.close;
    if (k && Number.isFinite(this.g.duration)) this.spells[this.spells.length - 1].kind = k;
  }

  update(dt) {
    const g = this.g, w = this.at(g.time, this.now), sky = this.skies[w.kind];
    this.kind = w.kind;
    // A spell of rain (or of lightning, the Abyss's ember storm) beginning: the rain's hush is heard
    // from it (hear), and a stormy one opens with its clap, if it began just now (not the clock set
    // into it). In the Darkwood: its spells of rain, as ever.
    if ((sky.rain > 0 || sky.lightning > 0) && w.at !== this.stormAt) {
      this.stormAt = w.at;
      if (sky.rain > 0) this.rainAt = w.at;
      if (sky.lightning > 0 && this.shown && g.time - w.at < 2) this.strike(true);
    }
    this.flash *= Math.exp(-dt * 11);
    if (this.bolt && (this.bolt.t -= dt) <= 0) this.bolt = null;
    const shown = this.shown;

    // Lightning, while the rain is near its height.
    if (w.lightning > 0.5) {
      this.strikeT -= dt * w.lightning;
      if (this.strikeT <= 0) {
        this.strikeT = span(this.rng, this.climate.gap || LIGHTNING.gap);
        if (shown) this.strike();
      }
    }
    for (let i = this.thunder.length - 1; i >= 0; i--) {
      const th = this.thunder[i];
      if ((th.t -= dt) > 0) continue;
      this.thunder.splice(i, 1);
      if (shown) sfx(th.big ? 'bigthunder' : 'thunder', { size: th.size, pan: th.pan });
    }

    this.hear(dt);

    if (shown) this.rain(dt, w);
    else this.n = 0;
    for (let k = 0; k < this.motes.length; k++) {
      if (shown) this.drift(this.motes[k], dt, w);
      else this.motes[k].n = 0;
    }
  }

  // The rain heard: held where it is while this runs, and under the level-up's cards, a chest and a
  // find (Game.fadeReal: the owner's, 27 October 2026, "keep it going"); fading by itself once it
  // stops (a pause, the menus, the end). Muffled in a crypt.
  hear(dt) {
    if ((this.bedT -= dt) > 0) return;
    this.bedT = 0.1;
    const g = this.g, on = !g.headless && !g.world.noWeather && g.settings.weather !== false, k = g.inCrypt ? 0.2 : 1;
    if (on) weatherBed(this.heard(g.time, this.now) * k);
  }

  // How loud the rain is heard at second t (RAIN_HEARD): the shower's hush through the first of
  // the spell, fading with the rain as it passes (a softer rain's, the Bloomvale's shower, softer).
  heard(t, w) {
    if (this.rainAt === null) return 0;
    const H = RAIN_HEARD, s = t - this.rainAt, sky = this.skies[w.kind];
    const k = s < H.in ? smooth(clamp(s / H.in, 0, 1)) : lerp(1, H.after, smooth(clamp((s - H.full) / H.fade, 0, 1)));
    return k * (sky.rain > 0 ? sky.rain : w.rain);
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

  // A climate's motes of one style (m.s) through dt: as many as its sky's key asks (s.key, 0 to 1
  // of s.most), flakes and grains falling (grains blown fast along x), embers rising, all carried
  // by the wind (s.wind px/s at the sky's full wind). Slow as they are, they would be left behind
  // as the hero walks: whatever leaves the view's box comes in again at its far side.
  drift(m, dt, w) {
    const c = this.g.cam, s = m.s, want = Math.round(s.most * (w[s.key] || 0));
    while (m.n < want) this.mote(m, m.n++, c, true);
    if (m.n > want) m.n = want;
    const wind = (w.wind || 0) * (s.wind || 0), ember = s.kind === 'ember';
    const L = c.x - 40, Wd = c.W + 80, T = c.y - 30, Hd = c.H + 80;
    for (let i = 0; i < m.n; i++) {
      if (ember ? (m.z[i] += m.v[i] * dt) > s.top : (m.z[i] -= m.v[i] * dt) <= 0) {
        this.mote(m, i, c, false);
        continue;
      }
      m.x[i] += (m.u[i] + wind) * dt;
      if (m.x[i] < L) m.x[i] += Wd;
      else if (m.x[i] >= L + Wd) m.x[i] -= Wd;
      if (m.y[i] < T) m.y[i] += Hd;
      else if (m.y[i] >= T + Hd) m.y[i] -= Hd;
    }
  }

  // A mote of m's style somewhere over the view; `any`, at any height (the weather setting in).
  mote(m, i, c, any) {
    const rng = this.rng, s = m.s;
    m.x[i] = c.x - 40 + rng() * (c.W + 80);
    m.y[i] = c.y - 30 + rng() * (c.H + 80);
    m.p[i] = rng() * TAU;
    if (s.kind === 'ember') {
      m.z[i] = any ? rng() * s.top : span(rng, s.high);
      m.v[i] = span(rng, s.rise);
      m.u[i] = (rng() - 0.5) * 2 * s.sway;
    } else {
      m.z[i] = any ? rng() * s.high[1] : span(rng, s.high);
      m.v[i] = span(rng, s.fall);
      m.u[i] = s.kind === 'grain' ? span(rng, s.speed) : 0;
    }
  }

  // Them drawn, unlit, over the night: flakes (snow, ash, petals) one or two pixels, swaying as they
  // fall; grains short streaks along the wind; embers glowing (added), flickering.
  drawMotes(ctx, c, m) {
    const S = c.S, s = m.s, t = this.g.clock, nc = m.fill.length;
    if (s.kind === 'grain') {
      ctx.lineWidth = Math.max(1, Math.round(S / 2));
      for (let k = 0; k < nc; k++) {
        ctx.strokeStyle = m.fill[k];
        ctx.beginPath();
        for (let i = k; i < m.n; i += nc) {
          const x = (m.x[i] - c.x) * S, y = (m.y[i] - m.z[i] - c.y) * S;
          if (x < -40 || y < -40 || x > c.pxW + 40 || y > c.pxH + 40) continue;
          const len = (s.len[0] + (s.len[1] - s.len[0]) * ((m.p[i] / TAU) % 1)) * S;
          ctx.moveTo(x, y);
          ctx.lineTo(x - len, y + len * 0.12);
        }
        ctx.stroke();
      }
      return;
    }
    const ember = s.kind === 'ember';
    if (ember) ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < nc; k++) {
      ctx.fillStyle = m.fill[k];
      for (let i = k; i < m.n; i += nc) {
        const sway = Math.sin(t * (ember ? 2.3 : 1.3) + m.p[i]) * (s.sway || 0) * (ember ? 0.4 : 1);
        const x = (m.x[i] + sway - c.x) * S, y = (m.y[i] - m.z[i] - c.y) * S;
        if (x < -20 || y < -20 || x > c.pxW + 20 || y > c.pxH + 20) continue;
        const px = Math.max(1, Math.round((!ember && (i % 10) < (s.big || 0) * 10 ? 2 : 1) * S));
        if (ember) ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(t * 7 + m.p[i] * 3)) * Math.min(1, (s.top - m.z[i]) / 40);
        ctx.fillRect(Math.round(x - px / 2), Math.round(y - px / 2), px, px);
      }
    }
    if (ember) {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // The night's ambient light, dimmed under cloud and lit by lightning (Forest.ambient); a sky's
  // `cast` pulls it toward its climate's colour (the Sunscorch's sand).
  tint(a) {
    if (!this.shown) return a;
    const C = this.climate, d = this.now.dark, f = Math.min(1, this.flash) * 0.6, k = C.dim || DIM, F = C.flash || FLASH;
    let r = a[0] * (1 - d * k[0]), gg = a[1] * (1 - d * k[1]), b = a[2] * (1 - d * k[2]);
    if (C.cast) {
      const q = this.now.cast * C.cast.k, to = C.cast.to;
      r = lerp(r, to[0], q);
      gg = lerp(gg, to[1], q);
      b = lerp(b, to[2], q);
    }
    return [lerp(r, F[0], f), lerp(gg, F[1], f), lerp(b, F[2], f)];
  }

  // The strike's light on the woods (Game.draw, with the other lights).
  addLights(g) {
    if (this.bolt && this.shown) g.light(this.bolt.x, this.bolt.y, 170, (this.climate.bolt || BOLT).light, Math.min(1, this.bolt.t * 6));
  }

  // Over the world, under the foes' shots and the numbers: the rain, its splashes, the climate's
  // motes (none in the Darkwood), a bolt.
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
    for (let k = 0; k < this.motes.length; k++) if (this.motes[k].n) this.drawMotes(ctx, c, this.motes[k]);
    if (this.bolt) {
      const b = this.bolt, a = (b.t > 0.14 || b.t < 0.07 ? 1 : 0.35) * Math.min(1, b.t * 8), B = this.climate.bolt || BOLT;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < b.pts.length; i += 2) {
        const x = (b.pts[i] - c.x) * S, y = (b.pts[i + 1] - c.y) * S;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = `rgba(${B.glow},${(0.35 * a).toFixed(3)})`;
      ctx.lineWidth = S * 3;
      ctx.stroke();
      ctx.strokeStyle = `rgba(${B.core},${a.toFixed(3)})`;
      ctx.lineWidth = Math.max(1, S * 0.75);
      ctx.stroke();
      ctx.restore();
    }
  }
}
