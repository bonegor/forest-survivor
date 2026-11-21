// The map bosses' own (G3 of the 21 November 2026 gameplay review; the owner's "one by one, work
// them"): each map's last boss fights with a night boss's kit (bosses.js) and, beside it, one thing
// of its map's own, warned before it lands, so the fight asks what the map taught (def.mech, data/
// enemies.js; run each frame after the kit by bosses.js bossAI):
// - Neferkhet (the Sunscorch, 'sands'): rings of quicksand open round the hero, one under him, and
//   lie a while, slowing him to a third as the Sunscorch's own pools do (QUICKSAND).
// - Hrimgar (the Frostfell, 'rime'): a stamp where the hero stands, a blast of frost, and the ground
//   there frozen into an ice sheet he slides on, as the Frostfell's own (ICE).
// - Sylvaine (the Bloomvale, 'briars'): hedges of thorn grow across his way, hurting him as he
//   passes through and cutting the Fae Thread; a loop of it closed round her dazes her (fae.js).
// - Belzakor (the Abyss, 'fault'): the ground cracks along a line through the hero and burns.
// Each comes `first` s after the boss wakes, then every `every` s (the second for his second phase).
import { sfx } from '../engine/audio.js';
import { rand, TAU } from '../engine/util.js';
import { Telegraph, Explosion, Ring } from './effects.js';
import { discSprite } from './fxsprites.js';
import { SURFACE } from './topology/terrain.js';
import { foeName, bossOf } from './names.js';

export const MECH = {
  sands: { first: 5, every: [10, 7], n: 3, R: 34, wind: 1.1, last: 7, spread: 62 },
  rime: { first: 6, every: [11, 7], R: 64, wind: 1.2, last: 8, dmg: 16 },
  briars: { first: 4, every: [9, 6.5], n: 2, len: 140, w: 12, off: [26, 46], wind: 1, last: 6, dmg: 8, rest: 0.6, daze: 2 },
  fault: { first: 6, every: [12, 8], len: 300, w: 26, wind: 1.3, last: 5, dmg: 6, tick: 0.5 },
};

// As a boss's warned blows grow with the night (bosses.js bossDamage).
const bossDamage = (g, d) => d * (1 + (g.dmgScale - 1) * 0.6) * g.bossPower;
const still = (e, id) => !e.dead && e.id === id;

// Each frame of a boss with a mechanic of its own, after its kit: its clock, and the next one due.
export function runMech(e, dt) {
  const m = MECH[e.def.mech];
  if (!m || e.sleeping || e.sealed || e.dead) return;
  const d = e.data;
  if (d.mechT == null) d.mechT = m.first;
  d.mechT -= dt;
  if (d.mechT > 0) return;
  d.mechT = m.every[e.phase ? 1 : 0];
  CAST[e.def.mech](e, m);
}

// Sylvaine dazed by a loop of the Fae Thread closed round her (fae.js sowLoop): no step, no spell.
export function daze(e) {
  const m = MECH.briars;
  e.data.dazedT = m.daze;
  e.speech = { text: 'MY THORNS...!', t: 1.6 };
  sfx('bell');
}

const CAST = {
  sands(e, m) {
    const g = e.g, p = g.player, id = e.id;
    for (let i = 0; i < m.n; i++) {
      const a = rand(TAU), r = i === 0 ? 0 : rand(m.spread * 0.6, m.spread);
      const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * 0.85;
      g.effects.push(new Telegraph(g, {
        shape: 'circle', x, y, r: m.R, dur: m.wind, color: '#d77643',
        onDone: () => { if (still(e, id)) addPatch(g, 'sand', x, y, m.R, m.last); },
      }));
    }
    sfx('rumble');
  },

  rime(e, m) {
    const g = e.g, p = g.player, id = e.id, x = p.x, y = p.y;
    const by = `${foeName(e)}'s frozen stamp`, boss = bossOf(e);
    g.effects.push(new Telegraph(g, {
      shape: 'circle', x, y, r: m.R, dur: m.wind, color: '#2ce8f5',
      onDone: () => {
        if (!still(e, id)) return;
        g.effects.push(new Explosion(g, x, y, m.R, 'frost'));
        g.effects.push(new Ring(g, x, y, 4, m.R * 1.1, 0.4, '#c8f4ec'));
        if (Math.hypot(p.x - x, p.y - y) < m.R + p.r) p.hurt(bossDamage(g, m.dmg), null, by, boss);
        addPatch(g, 'ice', x, y, m.R, m.last);
        g.shake(0.4);
        sfx('slam');
      },
    }));
  },

  briars(e, m) {
    const g = e.g, p = g.player, id = e.id;
    for (let i = 0; i < m.n; i++) {
      // Across his way: along a line at a random turn, set off to one side of him.
      const a = rand(TAU), side = i % 2 ? 1 : -1, off = rand(m.off[0], m.off[1]) * side;
      const cx = p.x + Math.cos(a + Math.PI / 2) * off, cy = p.y + Math.sin(a + Math.PI / 2) * off;
      const x = cx - Math.cos(a) * m.len / 2, y = cy - Math.sin(a) * m.len / 2;
      g.effects.push(new Telegraph(g, {
        shape: 'line', x, y, ang: a, len: m.len, w: m.w, dur: m.wind,
        onDone: () => { if (still(e, id)) g.effects.push(new Hedge(g, e, x, y, a, m)); },
      }));
    }
    sfx('wood');
  },

  fault(e, m) {
    const g = e.g, p = g.player, id = e.id, a = rand(TAU);
    const x = p.x - Math.cos(a) * m.len / 2, y = p.y - Math.sin(a) * m.len / 2;
    g.effects.push(new Telegraph(g, {
      shape: 'line', x, y, ang: a, len: m.len, w: m.w, dur: m.wind,
      onDone: () => {
        if (!still(e, id)) return;
        g.effects.push(new Fault(g, e, x, y, a, m));
        g.shake(0.5);
        sfx('slam');
      },
    }));
    sfx('rumble');
  },
};

// ---------------------------------------------------------------- patches --

// A boss's quicksand or ice for a while (Neferkhet's, Hrimgar's): the hero's ground (Player.groundUnder
// asks bossPatchAt before the map's own) and drawn on it.
function addPatch(g, kind, x, y, r, last) {
  const patch = new Patch(g, kind, x, y, r, last);
  g.bossPatches.push(patch);
  g.effects.push(patch);
}

const PATCH_LOOK = { sand: ['#3e2731', '#733e39', '#b86f50', '#d77643'], ice: ['#ffffff', '#c8f4ec', '#2ce8f5', '#0099db'] };

class Patch {
  constructor(g, kind, x, y, r, last) {
    Object.assign(this, { g, kind, x, y, r, last, t: 0 });
    this.surface = kind === 'sand' ? SURFACE.QUICKSAND : SURFACE.ICE;
  }

  update(dt) {
    this.t += dt;
    if (this.t < this.last) return true;
    const list = this.g.bossPatches, i = list.indexOf(this);
    if (i >= 0) list.splice(i, 1);
    return false;
  }

  drawGround(ctx, cam) {
    const S = cam.S, sx = (this.x - cam.x) * S, sy = (this.y - cam.y) * S;
    const k = Math.min(1, this.t / 0.3, (this.last - this.t) / 0.8);
    const img = discSprite(this.r, PATCH_LOOK[this.kind], this.kind === 'sand' ? 0.5 : 0.3);
    ctx.globalAlpha = 0.75 * k;
    ctx.drawImage(img, sx - (img.width * S) / 2, sy - (img.height * S * 0.85) / 2, img.width * S, img.height * S * 0.85);
    ctx.globalAlpha = 1;
  }
}

// The boss patch under (x, y), the deepest: { surface, depth } (depth: px inside its rim), one object
// filled again by the next call; null where there is none.
const HERE = { surface: 0, depth: 0 };
export function bossPatchAt(g, x, y) {
  let best = null;
  for (const p of g.bossPatches) {
    const depth = p.r - Math.hypot((x - p.x), (y - p.y) / 0.85);
    if (depth > -2 && (!best || depth > HERE.depth)) {
      HERE.surface = p.surface;
      HERE.depth = depth;
      best = HERE;
    }
  }
  return best;
}

// --------------------------------------------------------- hedges, faults --

// How far (x, y) is from the line from (x0, y0) along a for len px, and how far along it.
function onLine(x, y, x0, y0, a, len) {
  const dx = x - x0, dy = y - y0, ux = Math.cos(a), uy = Math.sin(a);
  const along = dx * ux + dy * uy;
  return { along, off: Math.abs(-dx * uy + dy * ux), on: along >= 0 && along <= len };
}

// Sylvaine's hedge of thorns: it hurts the hero while he is in it (every m.rest s) and snaps the Fae
// Thread he trails through it (fae.js snap). The horde passes as through anything.
class Hedge {
  constructor(g, e, x, y, a, m) {
    Object.assign(this, { g, x, y, a, m, t: 0, hitT: 0 });
    this.by = `${foeName(e)}'s thorns`;
    this.boss = bossOf(e);
  }

  update(dt) {
    const g = this.g, p = g.player, m = this.m;
    this.t += dt;
    this.hitT -= dt;
    const l = onLine(p.x, p.y, this.x, this.y, this.a, m.len);
    if (l.on && l.off < m.w / 2 + p.r) {
      if (this.hitT <= 0) {
        this.hitT = m.rest;
        p.hurt(bossDamage(g, m.dmg), null, this.by, this.boss);
      }
      if (g.world.court?.thread?.n) g.world.court.snap(true);
    }
    return this.t < m.last;
  }

  drawGround(ctx, cam) {
    const S = cam.S, m = this.m, k = Math.min(1, this.t / 0.25, (m.last - this.t) / 0.6);
    ctx.save();
    ctx.translate((this.x - cam.x) * S, (this.y - cam.y) * S);
    ctx.rotate(this.a);
    ctx.globalAlpha = k;
    // A dark bramble with thorns along it, a rose here and there.
    ctx.fillStyle = '#265c42';
    ctx.fillRect(0, (-m.w / 2) * S, m.len * S, m.w * S);
    ctx.fillStyle = '#193c3e';
    for (let i = 0; i < m.len; i += 6) ctx.fillRect(i * S, ((i * 7) % m.w - m.w / 2) * S, 2 * S, 2 * S);
    ctx.fillStyle = '#b55088';
    for (let i = 9; i < m.len; i += 23) ctx.fillRect(i * S, -1.5 * S, 3 * S, 3 * S);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// Belzakor's fault: a strip of cracked, burning ground; the hero standing in it is burnt every m.tick s.
class Fault {
  constructor(g, e, x, y, a, m) {
    Object.assign(this, { g, x, y, a, m, t: 0, hitT: 0 });
    this.by = `${foeName(e)}'s fault`;
    this.boss = bossOf(e);
  }

  update(dt) {
    const g = this.g, p = g.player, m = this.m;
    this.t += dt;
    this.hitT -= dt;
    const l = onLine(p.x, p.y, this.x, this.y, this.a, m.len);
    if (l.on && l.off < m.w / 2 && this.hitT <= 0) {
      this.hitT = m.tick;
      p.hurt(bossDamage(g, m.dmg), null, this.by, this.boss);
    }
    // Its glow along it.
    for (let i = 0; i <= 4; i++) {
      const u = (i / 4) * m.len;
      g.light(this.x + Math.cos(this.a) * u, this.y + Math.sin(this.a) * u, 40, 'fire', 0.6 * Math.min(1, (m.last - this.t) / 0.8));
    }
    return this.t < m.last;
  }

  drawGround(ctx, cam) {
    const S = cam.S, m = this.m, k = Math.min(1, this.t / 0.2, (m.last - this.t) / 0.8);
    const flick = 0.85 + 0.15 * Math.sin(this.t * 17);
    ctx.save();
    ctx.translate((this.x - cam.x) * S, (this.y - cam.y) * S);
    ctx.rotate(this.a);
    ctx.globalAlpha = k;
    ctx.fillStyle = '#3e2731';
    ctx.fillRect(0, (-m.w / 2) * S, m.len * S, m.w * S);
    ctx.globalAlpha = k * flick;
    ctx.fillStyle = '#be4a2f';
    ctx.fillRect(0, (-m.w / 4) * S, m.len * S, (m.w / 2) * S);
    ctx.fillStyle = '#feae34';
    ctx.fillRect(0, -1 * S, m.len * S, 2 * S);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
