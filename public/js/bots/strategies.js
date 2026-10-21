// Bot strategies for play-testing. Each one turns what the bot sees (a view,
// see driver.js) into the input a player would give: a direction to walk in
// and whether to press the ultimate.
//
//   BOTS.name = { about, params, make(params) }
//
// make() runs once per game and returns the bot: a tick function
// (view) => { x, y, ult }, or { tick, pick(cards, view) } to choose level-up
// cards as well. (x, y) is a heading; its length, capped at 1, is the share of
// full speed. Per-game state lives in make()'s closure.

import { TAU } from '../engine/util.js';

// Every built-in presses the ultimate as soon as it's ready, unless ult=0.
const act = (x, y, o, v) => ({ x, y, ult: !!o.ult && v.me.ultReady });

export const BOTS = {
  idle: {
    about: 'Stands still and lets the weapons work',
    make: (o) => (v) => act(0, 0, o, v),
  },

  circle: {
    about: 'Walks a circle of radius r around where it started (dir=-1: the other way round)',
    params: { r: 90, dir: 1 },
    make(o) {
      let c = null;
      return (v) => {
        const me = v.me;
        if (!c) c = { x: me.x, y: me.y };
        const dx = me.x - c.x, dy = me.y - c.y, d = Math.hypot(dx, dy);
        if (d < 1) return act(1, 0, o, v); // step off the centre first
        // Along the rim, steering back onto it when pushed off.
        const ux = dx / d, uy = dy / d, k = (2 * (o.r - d)) / o.r;
        return act(ux * k - uy * o.dir, uy * k + ux * o.dir, o, v);
      };
    },
  },

  kite: {
    about: 'Backs away from foes and missiles within r, toward the open side (r=0: 30 px for the Knight, whose sword reaches about 35, else 60)',
    params: { r: 0 },
    make(o) {
      let last = null;
      return (v) => {
        const R = o.r || (v.hero === 'knight' ? 30 : 60);
        const near = threats(v, R);
        if (!near.length) {
          last = null;
          return act(0, 0, o, v);
        }
        // A little loyalty to the last heading keeps it from dithering.
        last = bestHeading((hx, hy) => flee(hx, hy, near, R) + (last ? 0.1 * (hx * last.x + hy * last.y) : 0));
        return act(last.x, last.y, o, v);
      };
    },
  },

  gems: {
    about: 'Greedy for soul gems and loot within reach, swerving around foes closer than avoid',
    params: { reach: 200, avoid: 36 },
    make(o) {
      return (v) => {
        const near = threats(v, o.avoid);
        let goal = null, cost = Infinity;
        for (const pk of v.pickups(o.reach, false)) {
          const c = pk.d / worth(pk, v.me);
          if (!pk.pulled && c < cost) {
            cost = c;
            goal = pk;
          }
        }
        if (!near.length) return goal ? act(goal.dx, goal.dy, o, v) : act(0, 0, o, v);
        const h = bestHeading((hx, hy) => (goal ? (hx * goal.dx + hy * goal.dy) / (goal.d || 1) : 0) + 2 * flee(hx, hy, near, o.avoid));
        return act(h.x, h.y, o, v);
      };
    },
  },

  random: {
    about: 'Random walk: a new random heading every `every` seconds',
    params: { every: 1 },
    make(o) {
      let h = null, next = 0;
      return (v) => {
        if (!h || v.t >= next) {
          const a = v.rng() * TAU;
          h = { x: Math.cos(a), y: Math.sin(a) };
          next = v.t + o.every;
        }
        return act(h.x, h.y, o, v);
      };
    },
  },

  // The balance harness's player (main.js's old botStep).
  autopilot: {
    about: 'Plays like a decent player: circles the horde at weapon range, dodges missiles and slams, hunts bosses while healthy, grabs loot when calm, finds the dungeon guardian and stairs',
    make: (o) => (v) => {
      const me = v.me, knight = v.hero === 'knight', healthy = me.hp > me.maxHp * 0.6;
      // Centroid of nearby foes and the closest one.
      const near = v.nearest(), dn = near ? near.d : 1e9;
      let cx = 0, cy = 0, n = 0;
      for (const e of v.enemies(160)) {
        if (e.d >= 160) continue;
        cx += e.x;
        cy += e.y;
        n++;
      }
      let fx = 0, fy = 0;
      const side = Math.floor(v.t / 7) % 2 ? 1 : -1;
      if (n) {
        let tx = cx / n - me.x, ty = cy / n - me.y;
        const l = Math.hypot(tx, ty) || 1;
        tx /= l;
        ty /= l;
        const px = -ty * side, py = tx * side; // tangent: circle the horde
        const keep = near.boss ? (knight ? 30 : 70) : knight ? 26 : 44;
        if (dn < keep) {
          fx = -tx * 1.2 + px;
          fy = -ty * 1.2 + py;
        } else if (dn > 70) {
          fx = tx * 0.7 + px * 0.7;
          fy = ty * 0.7 + py * 0.7;
        } else {
          fx = px - tx * 0.15;
          fy = py - ty * 0.15;
        }
      }
      // Bosses hit hard: keep a healthy distance.
      const safe = knight && healthy ? 30 : 80;
      for (const e of v.enemies(safe)) {
        if (!e.boss || e.d >= safe) continue;
        const d = e.d || 1;
        fx -= (e.dx / d) * 2.5 * (1 - d / safe);
        fy -= (e.dy / d) * 2.5 * (1 - d / safe);
      }
      // Hunt the boss down while healthy, like a player would.
      const b = v.boss;
      if (b && healthy && b.d > 50) {
        fx += (b.dx / b.d) * 1.1;
        fy += (b.dy / b.d) * 1.1;
      }
      // Dodge missiles and telegraphed slams.
      for (const s of v.shots(50)) {
        const d2 = Math.max(25, s.d * s.d);
        fx -= (s.dx / d2) * 40;
        fy -= (s.dy / d2) * 40;
      }
      for (const h of v.hazards()) {
        if (h.shape !== 'circle' || h.d >= h.r + 10) continue;
        const d = h.d || 1;
        fx -= (h.dx / d) * 3;
        fy -= (h.dy / d) * 3;
      }
      // Grab loot when it's calm (chests, potions and scrolls from further away).
      if (dn > 40) {
        let best = null, bd = 1e9;
        for (const pk of v.pickups(640, false)) {
          const d2 = pk.d * pk.d, w = pk.kind === 'chest' || pk.kind === 'potion' || pk.kind === 'magnet' ? d2 * 0.1 : d2;
          if (w < bd) {
            bd = w;
            best = pk;
          }
        }
        if (best && bd < 200 * 200) {
          const l = best.d || 1;
          fx += (best.dx / l) * 0.8;
          fy += (best.dy / l) * 0.8;
        }
      }
      // Dungeon goals: while the seal holds, fight in the open like in survival;
      // then walk the corridors to the guardian, and after it to the stairs.
      const w = v.world, st = w.stairs, gd = w.guardian;
      if (st || (gd && gd.sleeping && !gd.sealed)) {
        const gx = st ? st.x : gd.x, gy = st ? st.y + 4 : gd.y, k = st ? 1.5 : 0.9;
        const step = w.path(gx, gy);
        if (step) {
          fx += step.x * k;
          fy += step.y * k;
        } else if (st) {
          // Already there (or off the map): head straight for the steps.
          const dx = gx - me.x, dy = gy - me.y, l = Math.hypot(dx, dy) || 1;
          fx += (dx / l) * 1.5;
          fy += (dy / l) * 1.5;
        }
      }
      const l = Math.hypot(fx, fy);
      return l > 1e-4 ? act(fx / l, fy / l, o, v) : act(0, 0, o, v);
    },
  },
};

// ------------------------------------------------- helpers for strategies --

// Foes and enemy missiles within r.
export const threats = (v, r) => v.enemies(r).concat(v.shots(r));

const HEADINGS = Array.from({ length: 16 }, (_, i) => [Math.cos((i / 16) * TAU), Math.sin((i / 16) * TAU)]);

// The best of 16 evenly spread headings by score(hx, hy).
export function bestHeading(score) {
  let best = HEADINGS[0], top = -Infinity;
  for (const h of HEADINGS) {
    const s = score(h[0], h[1]);
    if (s > top) {
      top = s;
      best = h;
    }
  }
  return { x: best[0], y: best[1] };
}

// How well heading (hx, hy) gets away from threats within R, nearer ones (and
// bosses) counting more: moving away scores, moving toward costs, and running
// straight at one costs three times as much.
export function flee(hx, hy, list, R) {
  let s = 0;
  for (const t of list) {
    const c = (hx * t.dx + hy * t.dy) / (t.d || 1);
    const w = (1 - Math.min(t.d, R) / R) ** 2 * (t.boss ? 3 : 1);
    s -= w * (c + 2 * Math.max(0, c) ** 2);
  }
  return s;
}

// How much a pickup is worth a detour (the gems bot goes for distance / worth).
function worth(pk, me) {
  if (pk.kind === 'gem') return 1 + Math.log2(1 + pk.value);
  if (pk.kind === 'potion' || pk.kind === 'elixir') return me.hpFrac < 0.7 ? 6 : 0.5;
  if (pk.kind === 'chest') return 8;
  if (pk.kind === 'coin' || pk.kind === 'goldpile') return 1;
  return 4; // scrolls, relics, runes, fury orbs
}

// ---------------------------------------------------------------- specs --

// 'circle:r=60:dir=-1' -> { name: 'circle', params: { r: 60, dir: -1 } }.
// Only trailing ':key=value' parts are parameters, so a path like
// C:\bots\mine.mjs still names a file.
export function parseSpec(spec) {
  const parts = String(spec).split(':'), params = {};
  while (parts.length > 1 && parts[parts.length - 1].includes('=')) {
    const [k, ...rest] = parts.pop().split('=');
    const val = rest.join('=');
    params[k] = val !== '' && !isNaN(val) ? Number(val) : val;
  }
  return { name: parts.join(':'), params };
}

// A bot ready to play one game, { name, params, tick, pick }, from a spec
// string naming a built-in ('kite:r=60'), or from a strategy of your own: an
// object shaped like the BOTS entries, a { tick, pick } object, or a bare
// tick function.
export function botFrom(spec, params = {}, name) {
  let def = spec;
  if (typeof spec === 'string') {
    const s = parseSpec(spec);
    def = BOTS[s.name];
    if (!def) throw new Error(`Unknown bot "${s.name}" (built-in: ${Object.keys(BOTS).join(', ')})`);
    params = { ...s.params, ...params };
    name = name || spec;
  }
  if (!def || (typeof def !== 'function' && typeof def.make !== 'function' && typeof def.tick !== 'function')) {
    throw new Error('A bot needs a tick(view) function, or make(params) returning one');
  }
  const o = { ult: 1, ...def.params };
  for (const [k, val] of Object.entries(params)) {
    if (def.params && !(k in o)) throw new Error(`${name || 'bot'} has no parameter "${k}" (has ${Object.keys(o).join(', ')})`);
    o[k] = val;
  }
  const made = typeof def === 'function' ? def : def.make ? def.make(o) : def;
  const bot = typeof made === 'function' ? { tick: made } : made;
  return {
    name: name || def.name || 'custom',
    params: o,
    tick: (v) => bot.tick(v),
    pick: bot.pick ? (cards, v) => bot.pick(cards, v) : null,
  };
}
