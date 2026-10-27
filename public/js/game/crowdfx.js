// The four weapons that move or frighten the horde (KINDS gale, hook, hollow, bell in weapons.js):
// Gale Horn and Tempest blow it back, the Grappling Hook and Kraken Chains cut a line through it,
// Grave Hollow and Abyss draw it in, Banshee Bell and Death Knell send it running. The foe side
// of each is on Enemy (blow, scare, addDot); none of them moves a boss, a lord or a champion,
// they only hurt it.

import { sfx } from '../engine/audio.js';
import { rand, TAU, lerp, pick, angleDiff, clamp } from '../engine/util.js';
import { Pool, Ring, explode } from './effects.js';
import { discSprite, ringSprite, glow } from './fxsprites.js';
import { PC, P } from './particles.js';

const toScreen = (cam, x, y) => [(x - cam.x) * cam.S, (y - cam.y) * cam.S];

// ------------------------------------------------------------------ gale --

export const GALE_R = 100;
let blastId = 0;

// The foes in the gust of weapon w: those within its reach and, unless it blows all round, in
// the cone ahead of the hero (the way he faces).
export function gustFoes(g, w) {
  const p = g.player, s = w.s, R = GALE_R * s.area, full = s.arc >= Math.PI;
  const out = [];
  for (const e of g.grid.foes(p.x, p.y, R)) {
    if (e.dead || e.prop || e.spawnT > 0.3) continue;
    if (Math.hypot(e.x - p.x, e.y - p.y) > R + e.hr) continue;
    if (!full && Math.abs(angleDiff(p.aim, Math.atan2(e.y - p.y, e.x - p.x))) > s.arc) continue;
    out.push(e);
  }
  return out;
}

// A blast of the horn: every foe in the gust takes its damage, and the horde alone is
// blown back (Enemy.blow), Tempest's slowed too. A foe thrown into another hurts them both once.
export function gust(g, w, foes) {
  const p = g.player, s = w.s, id = ++blastId, full = s.arc >= Math.PI;
  for (const e of foes) {
    // The nearer, the harder: the front of the horde is flung into the ranks behind it.
    const near = 1.3 - 0.6 * Math.min(1, Math.hypot(e.x - p.x, e.y - p.y) / (GALE_R * s.area));
    const moved = e.blow(p.x, p.y, s.push * near, id, w, s.bump);
    g.hitEnemy(e, s.dmg, { w, type: 'normal', kb: 0, slow: moved ? s.slow : 0, slowT: 2 });
  }
  const n = full ? 46 : 26;
  for (let i = 0; i < n; i++) {
    const a = full ? rand(TAU) : p.aim + rand(-s.arc, s.arc), v = rand(140, 300) * Math.sqrt(s.area);
    g.particles.emit(p.x + Math.cos(a) * 8, p.y - 4 + Math.sin(a) * 8, 4, Math.cos(a) * v, Math.sin(a) * v, 0, rand(0.25, 0.5), 1, pick([PC.w, PC.c, PC.G]), P.GLOW | P.FADE, 2);
  }
  sfx('blade', { pitch: 0.6 });
}

// ------------------------------------------------------------------ hook --

const HOOK_OUT = 0.16, HOOK_BACK = 0.18, HOOK_W = 5;
// The hook at the rope's end: a J of steel ('w', its glint).
const HOOK_ART = ['.w#', '..#', '#.#', '.#.'];

// A barbed hook flying from the hero at a foe and its rope ripping back: each way, every foe on
// the line is cut and bleeds. Hook i of a volley; two hooks bleeding a foe cut double (twin).
export class Hook {
  constructor(g, w, target, i) {
    this.g = g;
    this.w = w;
    this.target = target;
    this.i = i;
    this.x = target.x;
    this.y = target.y;
    this.t = 0;
    this.back = false;
  }

  update(dt) {
    const p = this.g.player;
    this.t += dt;
    if (!this.back) {
      if (!this.target.dead) {
        this.x = this.target.x;
        this.y = this.target.y;
      }
      if (this.t < HOOK_OUT) return true;
      this.cut(p);
      this.back = true;
      this.t = 0;
      sfx('axe', { pitch: 0.7 });
      return true;
    }
    if (this.t < HOOK_BACK) return true;
    this.cut(p);
    return false;
  }

  // Every foe the line from the hero to the hook's end touches takes a cut and bleeds.
  cut(p) {
    const g = this.g, w = this.w, s = w.s;
    const ax = p.x, ay = p.y, bx = this.x, by = this.y, dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
    const width = HOOK_W * Math.sqrt(s.area);
    for (const e of g.grid.foes((ax + bx) / 2, (ay + by) / 2, Math.sqrt(L2) / 2 + width)) {
      if (e.dead) continue;
      const u = clamp(((e.x - ax) * dx + (e.y - ay) * dy) / L2, 0, 1);
      if (Math.hypot(e.x - (ax + dx * u), e.y - (ay + dy * u)) > e.hr + width) continue;
      g.hitEnemy(e, s.dmg, { w, type: 'normal', kb: 0 });
      if (e.dead) continue;
      // Bleeding already from another hook: the cut goes twice as deep.
      const double = s.twin && e.dotT > 0 && e.dotType === 'bleed' && e.bleedBy !== this.i;
      e.bleedBy = this.i;
      e.addDot('bleed', s.bleed * (double ? 2 : 1), s.dur, w);
    }
  }

  draw(ctx, cam) {
    const p = this.g.player;
    const u = this.back ? this.t / HOOK_BACK : this.t / HOOK_OUT;
    const k = clamp(this.back ? 1 - u : u, 0, 1);
    const ex = lerp(p.x, this.x, k), ey = lerp(p.y, this.y, k);
    const [sx, sy] = toScreen(cam, p.x, p.y - 6), [tx, ty] = toScreen(cam, ex, ey - 6);
    // A taut tan rope, twisted (not the Leech Chains' red links, nor a lightning's jag), and at
    // its end a steel hook; the Kraken Chains' is a dark iron chain.
    const [c0, c1] = this.w.s.twin ? ['#5a6988', '#262b44'] : ['#b86f50', '#733e39'];
    const n = Math.max(2, Math.round(Math.hypot(tx - sx, ty - sy) / cam.S)), S = Math.max(1, Math.round(cam.S));
    for (let j = 0; j <= n; j++) {
      const f = j / n;
      ctx.fillStyle = j % 3 ? c0 : c1;
      ctx.fillRect(Math.round(lerp(sx, tx, f)), Math.round(lerp(sy, ty, f)), S, S);
    }
    const hx = Math.round(tx) - S, hy = Math.round(ty) - 2 * S;
    for (let r = 0; r < HOOK_ART.length; r++) {
      for (let c = 0; c < 3; c++) {
        const ch = HOOK_ART[r][c];
        if (ch === '.') continue;
        ctx.fillStyle = ch === 'w' ? '#ffffff' : '#c0cbdc';
        ctx.fillRect(hx + c * S, hy + r * S, S, S);
      }
    }
  }
}

// ---------------------------------------------------------------- hollow --

const HOLLOW_PULL = 66, HOLLOW_CAVE = 40, HOLLOW_DRAG = 1.6;
const DRAGGED = new Set(['gem', 'coin', 'goldpile']);

// A pit in the ground that draws the horde in toward its middle for w.s.dur seconds, then caves in
// (area damage). Abyss also drags the gems and coins lying round it to the hero.
export class Hollow {
  constructor(g, w, x, y) {
    this.g = g;
    this.w = w;
    this.x = x;
    this.y = y;
    this.R = HOLLOW_PULL * w.s.area;
    this.Rc = HOLLOW_CAVE * w.s.area;
    this.t = 0;
    sfx('rumble');
  }

  update(dt) {
    const g = this.g, s = this.w.s;
    this.t += dt;
    for (const e of g.grid.query(this.x, this.y, this.R + 14)) {
      if (!e.movable) continue;
      const dx = this.x - e.x, dy = this.y - e.y, d = Math.hypot(dx, dy);
      if (d > this.R || d < 3) continue;
      const step = Math.min(d - 2, s.pull * dt * (1.15 - 0.5 * (d / this.R)));
      const nx = e.x + (dx / d) * step, ny = e.y + (dy / d) * step;
      // Never into a crypt's wall; a Dungeon Run floor's horde goes through them (Enemy.walled).
      if (!g.world.free || g.world.throughWalls || g.world.free(nx, ny)) {
        e.x = nx;
        e.y = ny;
      }
    }
    if (s.drag) {
      for (const pk of g.pickups) {
        if (pk.pulled || !DRAGGED.has(pk.kind) || (pk.x - this.x) ** 2 + (pk.y - this.y) ** 2 > (this.R * HOLLOW_DRAG) ** 2) continue;
        pk.pulled = true;
        pk.speed = -60;
      }
    }
    if (this.t < s.dur) return true;
    explode(g, this.x, this.y, this.Rc, s.dmg, this.w, 'dark', { kb: 1 });
    return false;
  }

  drawGround(ctx, cam) {
    const [sx, sy] = toScreen(cam, this.x, this.y), S = cam.S;
    const grow = Math.min(1, this.t / 0.3), r = this.Rc * (0.7 + 0.3 * grow) * (1 + 0.05 * Math.sin(this.t * 14));
    const d = discSprite(r, ['#0b0912', '#181425', '#68386c'], 0.5);
    ctx.globalAlpha = 0.9 * grow;
    ctx.drawImage(d, Math.round(sx - (d.width * S) / 2), Math.round(sy - (d.height * S) / 2), d.width * S, d.height * S);
    // Rings drawing in toward the pit show what it is doing.
    for (let k = 0; k < 2; k++) {
      const f = (this.t * 1.1 + k / 2) % 1;
      const ring = ringSprite(lerp(this.R, this.Rc, f), '#b55088', 1);
      ctx.globalAlpha = 0.55 * (1 - f) * grow;
      ctx.drawImage(ring, Math.round(sx - (ring.width * S) / 2), Math.round(sy - (ring.height * S) / 2), ring.width * S, ring.height * S);
    }
    ctx.globalAlpha = 1;
  }

  drawGlow(ctx, cam) {
    const [sx, sy] = toScreen(cam, this.x, this.y), s = this.Rc * 2.4 * cam.S;
    ctx.globalAlpha = 0.25 + 0.2 * (this.t / this.w.s.dur);
    ctx.drawImage(glow('#68386c'), sx - s / 2, sy - s / 2, s, s);
    ctx.globalAlpha = 1;
    this.g.light(this.x, this.y, this.R * 1.4, 'purple', 0.5);
  }
}

// The densest knot of foes within reach of (x, y): of the nearest 40, the one with most others
// within 40 px of it. Null with none.
export function thickest(g, x, y, reach) {
  const foes = g.nearestEnemies(x, y, 40, reach);
  let best = null, bn = -1;
  for (const a of foes) {
    let n = 0;
    for (const b of foes) if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 < 40 * 40) n++;
    if (n > bn) {
      bn = n;
      best = a;
    }
  }
  return best;
}

// ------------------------------------------------------------------ bell --

export const BELL_R = 62;

// The foes within the toll of weapon w.
export function tollFoes(g, w) {
  const p = g.player, R = BELL_R * w.s.area;
  return g.grid.foes(p.x, p.y, R).filter((e) => !e.dead && !e.prop && e.spawnT <= 0.3 && Math.hypot(e.x - p.x, e.y - p.y) <= R + e.hr);
}

// A toll round the hero: every foe within it takes its damage, and the horde alone is
// frightened (Enemy.scare) for w.s.fear seconds. Death Knell's fleeing foes leave echoes.
export function toll(g, w, foes) {
  const p = g.player, s = w.s, R = BELL_R * s.area, scared = [];
  for (const e of foes) {
    if (e.scare(s.fear)) scared.push(e);
    g.hitEnemy(e, s.dmg, { w, type: 'dark', kb: 0 });
  }
  g.effects.push(new Ring(g, p.x, p.y, 6, R, 0.45, '#fee761', true), new Ring(g, p.x, p.y, 3, R * 0.8, 0.35, '#ffffff', true));
  if (s.echo && scared.length) g.effects.push(new Echoes(g, w, scared.slice(0, 12)));
  sfx('aura', { pitch: 1.4 });
}

// The echoes of Death Knell: while a foe flees it drops a ghostly pool every so often, each short
// lived, cutting whatever runs through it.
class Echoes {
  constructor(g, w, foes) {
    this.g = g;
    this.w = w;
    this.foes = foes;
    this.t = 0;
  }

  update(dt) {
    const g = this.g, s = this.w.s;
    this.t -= dt;
    if (this.t > 0) return true;
    this.t = 0.3;
    let any = false;
    for (const e of this.foes) {
      if (e.dead || e.fearT <= 0) continue;
      any = true;
      g.effects.push(new Pool(g, this.w, e.x, e.y, 10 * Math.sqrt(s.area), 0.8, s.dmg * 0.5, 0.3, 'hell', false, { decay: true, sparse: true, kb: 0 }));
    }
    return any;
  }
}
