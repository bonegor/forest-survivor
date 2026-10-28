// The Frostfell's gusts (28 October 2026). The owner's: "Weather is snow blizzard, gusts here and there
// freeze monsters or hero." A gust is a patch of whirling snow on the ground, `r` px round (70-100 px
// across): it gathers for `tell` s, drawn as it does so (a pale ring on the snow, motes of snow spiralling
// in, the fx_gust swirl of art/terrain.js), so it is never hidden under the horde's feet without a tell, and
// then it blasts. The horde caught in it is frozen `foes` s (Game.rimeFreeze, Rimeheart's freeze: a
// boss, a lord or a champion only slowed), the hero `hero` s (Player.freeze: he can't move, his weapons
// fire on, an ice tint over him), and then he has a grace (FROST.grace) in which no gust freezes him.
//
// When: none before `after` s of the day (a fair start, as the Darkwood's first minutes are calm), then
// one every rng-span(`every`) s at the weather's full `key` (a blizzard's), that much rarer as it blows
// softer (a snowfall's 0.3: three times rarer; a clear sky's nothing: twenty times, as max(0.05, w)), and
// no more than `most` gathering at once. Where: one time in `aim`'s at his feet, but only while he stands
// on his own feet on plain ground (not held, sliding or on ice: a gust that can't be walked out of is no
// fair one, and one that misses him is still worth seeing); else on land `near` px from him, and if he
// can't move out of its way, never over him, nor anywhere on the way a slide will carry him before it
// blows. Never by a crypt's door or a shrine (CLEAR px from its edge), so the steps down and a shrine's
// stone are always safe ground.
//
// What it freezes is what its tell rings on the snow: the ellipse r across by FLAT r down (the 3/4
// view's), never the circle round it, so no hero standing clear of the drawn ring is caught by it.
//
// Its own dice (from the run's seed), never Math.random, so the same seed brings the same gusts to the
// same places; its motes are drawn from a hash of its own seed, without a particle or a draw each frame.

import { mulberry32, hash2, TAU } from '../../engine/util.js';
import { SPR } from '../../engine/sprites.js';
import { sfx } from '../../engine/audio.js';
import { PC, P } from '../particles.js';
import { groundRing } from '../fxsprites.js';
import { ICE } from '../player.js';

// A blast's ring of snow thrown out, for BLAST s after it; the margin round a crypt's door and a
// shrine its edge keeps (CLEAR px); how flat its ring lies on the snow (FLAT: its height, of its
// width, drawn and frozen alike); a gust's motes; its colour.
export const BLAST = 0.35;
export const CLEAR = 60;
export const FLAT = 0.55;
const MOTES = 14;
const TELL_RGB = '#c8f4ec';

const span = (rng, [a, b]) => a + rng() * (b - a);

export class Gusts {
  // spec: the look's (biomes/frozen.js hazards.gusts): { key, after, every, tell, r, foes, hero, aim, near, most }.
  constructor(g, spec) {
    this.g = g;
    this.s = spec;
    this.rng = mulberry32((g.seed ^ 0x6a57) >>> 0);
    this.list = []; // { x, y, r, t, seed, blown }: gathering until t reaches the tell, then blown
    this.next = span(this.rng, spec.every); // s to the next, at the weather's full key
    this.made = 0; // gusts so far (the tests read it)
  }

  // Those gathering now (no more than spec.most).
  get gathering() {
    let n = 0;
    for (const q of this.list) if (!q.blown) n++;
    return n;
  }

  // What was under way goes (Hazards.update: the hero went down into a crypt).
  clear() {
    this.list.length = 0;
  }

  update(dt) {
    const g = this.g, s = this.s, L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const q = L[i];
      q.t += dt;
      if (!q.blown && q.t >= s.tell) {
        q.blown = true;
        this.blast(q);
      }
      if (q.t >= s.tell + BLAST) L.splice(i, 1);
    }
    if (g.time < s.after) return;
    const w = g.weather ? g.weather.now[s.key] || 0 : 0;
    this.next -= dt * Math.max(0.05, w);
    if (this.next > 0) return;
    this.next = span(this.rng, s.every);
    if (this.gathering < s.most) this.launch();
  }

  // Whether a gust of radius r centred at (x, y) keeps CLEAR px off every crypt door and shrine near.
  clearOf(x, y, r) {
    const g = this.g, m = CLEAR + r;
    for (const d of g.crypts) if ((d.x - x) ** 2 + (d.y - y) ** 2 < m * m) return false;
    for (const sh of g.shrines) if ((sh.x - x) ** 2 + (sh.y - y) ** 2 < m * m) return false;
    return true;
  }

  // A gust begins gathering: at his feet (spec.aim of the time, while he is on his own feet on plain
  // ground), else at a spot on land near him; none if no spot will do this time.
  launch() {
    const g = this.g, s = this.s, p = g.player, rng = this.rng, w = g.world;
    const r = Math.round(span(rng, s.r));
    const seed = Math.floor(rng() * 65536);
    const trapped = !!(p.held || p.slide || p.onIce);
    // How far on a slide will have carried him by the time a gust laid now blows (his steering is
    // the ice's till then): the whole of that way is his, as where he stands is.
    const run = p.slide ? p.moveSpeed * ICE.speed * (s.tell + BLAST) : 0;
    let x = p.x, y = p.y, ok = rng() < s.aim && !trapped && !p.dead && this.clearOf(x, y, r);
    for (let k = 0; k < 6 && !ok; k++) {
      const a = rng() * TAU, d = span(rng, s.near);
      x = p.x + Math.cos(a) * d;
      y = p.y + Math.sin(a) * d;
      // Never over a hero who can't step out of its way, nor on the way a slide carries him.
      if (trapped && fromWay(p, run, x, y) < r + p.r + 8) continue;
      ok = this.clearOf(x, y, r) && (!w.free || w.free(x, y));
    }
    if (!ok) return null;
    const q = { x, y, r, t: 0, seed, blown: false };
    this.list.push(q);
    this.made++;
    if (inView(g.cam, x, y)) sfx('whoosh');
    return q;
  }

  // The blast: the horde in its ring frozen (Game.rimeFreeze, its ice with it, and its sound where it
  // is seen, as the whoosh it gathered with), the hero frozen if he stands in its ring (his feet's
  // reach, p.r, round it) out of his grace, and the snow thrown out. Its ring the one its tell drew:
  // r across, FLAT r down.
  blast(q) {
    const g = this.g, s = this.s, p = g.player, ry = q.r * FLAT;
    g.rimeFreeze(q.x, q.y, q.r, s.foes, ry, inView(g.cam, q.x, q.y));
    const ex = (p.x - q.x) / (q.r + p.r), ey = (p.y - q.y) / (ry + p.r);
    if (!p.dead && ex * ex + ey * ey <= 1 && p.freeze(s.hero)) {
      g.numbers.text(p.x, p.y - 22, 'Frozen!', 'frost');
      g.particles.burst(p.x, p.y - 8, 6, 10, [PC.w, PC.c, PC.X], 50, 0.6, 1, P.GLOW | P.FADE, { vz: 30 });
    }
    g.particles.burst(q.x, q.y - 2, 2, 22, [PC.w, PC.c, PC.X], 120, 0.55, 1, P.FADE, { vz: 40 });
  }

  // Under the actors: the ring it gathers in, filling in as the blast nears, and the fx_gust swirl
  // over it (art/terrain.js: a gathering swirl of snow, its frames played over the tell).
  drawGround(ctx, cam) {
    const s = this.s, S = cam.S, spr = SPR.fx_gust;
    for (const q of this.list) {
      if (q.blown || !near(cam, q)) continue;
      const k = Math.min(1, q.t / s.tell);
      const ring = groundRing(q.r, Math.round(q.r * FLAT), TELL_RGB);
      const sx = (q.x - cam.x) * S, sy = (q.y - cam.y) * S;
      ctx.globalAlpha = 0.2 + 0.5 * k;
      ctx.drawImage(ring, Math.round(sx - (ring.width * S) / 2), Math.round(sy - (ring.height * S) / 2), ring.width * S, ring.height * S);
      if (spr) {
        const fr = spr.frames[Math.min(spr.frames.length - 1, Math.floor(k * spr.frames.length))].c;
        const w = fr.width * 2 * S, h = fr.height * 2 * S;
        ctx.globalAlpha = 0.5 + 0.4 * k;
        ctx.drawImage(fr, Math.round(sx - w / 2), Math.round(sy - h / 2), w, h);
      }
    }
    ctx.globalAlpha = 1;
  }

  // Over the actors: its ring again, fainter, so a crowd standing in it can't hide it, and the snow
  // spiralling in, quicker as it tightens; then the blast's ring thrown out.
  drawOver(ctx, cam) {
    const s = this.s, S = cam.S, px = Math.max(1, Math.round(S));
    for (const q of this.list) {
      if (!near(cam, q)) continue;
      const sx = (q.x - cam.x) * S, sy = (q.y - cam.y) * S;
      if (q.blown) {
        const u = Math.min(1, (q.t - s.tell) / BLAST);
        ctx.globalAlpha = 0.9 * (1 - u);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = px;
        ctx.beginPath();
        ctx.ellipse(sx, sy, q.r * (0.7 + 0.6 * u) * S, q.r * FLAT * (0.7 + 0.6 * u) * S, 0, 0, TAU);
        ctx.stroke();
        continue;
      }
      const k = Math.min(1, q.t / s.tell);
      const ring = groundRing(q.r, Math.round(q.r * FLAT), TELL_RGB);
      ctx.globalAlpha = 0.25 + 0.35 * k;
      ctx.drawImage(ring, Math.round(sx - (ring.width * S) / 2), Math.round(sy - (ring.height * S) / 2), ring.width * S, ring.height * S);
      for (let i = 0; i < MOTES; i++) {
        const ph = (q.t * (0.9 + 1.4 * k) + hash2(q.seed, i, 1)) % 1; // 0 at the rim, 1 at the middle
        const a = hash2(q.seed, i, 2) * TAU + ph * 3.6, rr = q.r * (1.1 - ph);
        const x = sx + Math.cos(a) * rr * S, y = sy + (Math.sin(a) * rr * FLAT - 2 - 9 * (1 - ph)) * S;
        ctx.globalAlpha = (0.35 + 0.6 * k) * Math.min(1, ph * 4);
        ctx.fillStyle = i % 3 ? '#ffffff' : TELL_RGB;
        ctx.fillRect(Math.round(x - px / 2), Math.round(y - px / 2), px, px);
      }
    }
    ctx.globalAlpha = 1;
  }
}

// Whether (x, y) is in the view, or 40 px about it (a gust heard: its gathering and its blast).
function inView(c, x, y) {
  return !!c && x > c.x - 40 && x < c.x + c.W + 40 && y > c.y - 40 && y < c.y + c.H + 40;
}

// How far (x, y) lies from the hero's way: from where he stands to `run` px on along his slide (none:
// where he stands).
function fromWay(p, run, x, y) {
  const dx = x - p.x, dy = y - p.y;
  if (!run) return Math.hypot(dx, dy);
  const S = p.slide, u = Math.max(0, Math.min(run, dx * S.x + dy * S.y));
  return Math.hypot(dx - S.x * u, dy - S.y * u);
}

// Whether a gust is in or about the view.
function near(cam, q) {
  return q.x > cam.x - q.r - 40 && q.x < cam.x + cam.W + q.r + 40 && q.y > cam.y - q.r - 40 && q.y < cam.y + cam.H + q.r + 40;
}
