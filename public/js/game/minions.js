// Allies: undead raised by the Necromancer. They seek out nearby foes, strike at them (breaking
// any box in the swing, never going for one), and crumble when their time runs out. Enemies
// ignore them, and nothing bumps into them: they never stand in the hero's way or a monster's.

import { SPR, walkFrame, idleFrame } from '../engine/sprites.js';
import { sfx } from '../engine/audio.js';
import { rand, TAU, clamp } from '../engine/util.js';
import { shadowSprite, glow } from './fxsprites.js';
import { PC, P } from './particles.js';
import { explode } from './effects.js';
import { faceAlong, faceAttack } from './facing.js';

// How each kind of ally looks and fights: its sprite, pace (px/s), body, time between blows,
// glow, shadow, the dirt it rises from, the dust it crumbles to.
const LOOKS = {
  skeleton: { sprite: 'minion', speed: 64, r: 5, atk: 0.6, glow: '#63c74d', glowSize: 26, shadow: 9, rise: [PC.l, PC.b], dust: [PC.z, PC.Z, PC.l] },
  knight: { sprite: 'legionnaire', speed: 58, r: 6, atk: 0.75, glow: '#63c74d', glowSize: 34, shadow: 12, rise: [PC.l, PC.b], dust: [PC.z, PC.Z, PC.l] },
};

// How the minions share out the foes, cheaply. Each goes for the nearest foe, but every
// other minion already on a foe makes that one count SHARE px farther, so a pack fans out
// over the horde and doubles up only when foes run short; each re-picks on its own beat
// (0.3 to 0.5 s), never all on one frame. And none stands on another: within SPACE px they
// step apart, minions from minions only (never the hero, never a monster).
// Cost a frame, for m minions (a few dozen at most): the tally of who is on whom, O(m),
// rebuilt by the first minion to move; stepping apart, O(m²) quick box tests; and some m/24
// picks (at 60 Hz), each one grid query of the foes within 130 px, as before.
const SHARE = 40; // px a foe seems farther for each other minion on it
const STICK = 10; // px nearer the foe it is on seems, so it doesn't dither between two
const SPACE = 10; // px minions keep between them
const PUSH = 50; // px/s a standing one edges away at most: slower than any of them walks
const RING = 1; // px within reach a minion stands from its foe
const STEER = 4; // how hard a walking one turns from the others: head on, it stops at 3/4 SPACE
// A blow's swing: centred SWING_AHEAD px ahead of the minion, reaching SWING px about that point
// and the body of what it strikes.
const SWING_AHEAD = 8, SWING = 13;
const near = []; // the grid query's list for picks (nothing in a pick queries again)
let tick = 0; // stamps the tally: a foe's count is good only for this frame's tick

// How many minions are on foe e, and counting one more (n = 1) or one fewer (n = -1).
export const claims = (e) => (e._mTick === tick ? e._mOn : 0);
function claim(e, n) {
  if (e._mTick !== tick) {
    e._mTick = tick;
    e._mOn = 0;
  }
  e._mOn += n;
}
// Counted afresh each frame, so a foe that died or came back from the pool never carries old claims.
function tally(g) {
  tick++;
  for (const m of g.minions) if (m.target && !m.target.dead) claim(m.target, 1);
}

export class Minion {
  constructor(g, x, y, o) {
    this.g = g;
    this.x = x;
    this.y = y;
    this.w = o.w || null;
    this.knight = !!o.knight;
    this.look = LOOKS[this.knight ? 'knight' : 'skeleton'];
    this.spr = SPR[this.look.sprite];
    this.dmg = o.dmg;
    this.kb = this.knight ? 1 : 0.7;
    this.life = this.maxLife = o.dur;
    this.speed = this.look.speed * (o.speed || 1);
    this.r = this.look.r;
    this.burst = !!o.burst;
    this.ult = !!o.ult;
    this.rise = 0.45;
    this.atk = rand(0.1, 0.4);
    this.retarget = 0;
    this.target = null;
    this.face = 1;
    this.anim = rand(4);
    this.swing = 0;
    this.wob = rand(TAU);
    this.minion = true;
    this.moving = false;
  }

  update(dt) {
    const g = this.g, p = g.player;
    if (g.minions[0] === this) tally(g); // the list runs from its head, so: once a frame
    this.life -= dt;
    if (this.life <= 0) {
      this.crumble();
      return false;
    }
    if (this.rise > 0) {
      this.rise -= dt;
      if (Math.random() < 0.5) g.particles.emit(this.x + rand(-5, 5), this.y, 0, rand(-15, 15), rand(-5, 5), rand(20, 50), 0.45, 1, Math.random() < 0.5 ? this.look.rise[0] : this.look.rise[1], P.GROUND | P.FADE, 2, 220);
      return true;
    }
    this.swing = Math.max(0, this.swing - dt);
    this.atk -= dt;
    this.retarget -= dt;
    if (this.retarget <= 0 || !this.target || this.target.dead) this.pick();
    const tgt = this.target && !this.target.dead ? this.target : null;
    let tx, ty;
    if (tgt) {
      tx = tgt.x;
      ty = tgt.y;
    } else {
      tx = p.x + Math.cos(this.wob + g.clock * 0.7) * 26;
      ty = p.y + Math.sin(this.wob + g.clock * 0.7) * 18;
    }
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
    const reach = tgt ? this.r + tgt.r + 3 : 6;
    this.moving = d > reach;
    // Minions too close push it aside: walking, it steers round them; standing, it edges off.
    const crowded = this.crowd();
    if (this.moving) {
      const sp = this.speed * (tgt ? 1 : clamp(d / 40, 0.3, 1.3));
      const ux = dx / d, uy = dy / d;
      let vx = ux + this.sx * STEER, vy = uy + this.sy * STEER;
      // Blocked by those ahead, it goes round them (each its own way) to find a gap.
      const blocked = clamp(-(this.sx * ux + this.sy * uy) * STEER, 0, 1), side = this.wob < Math.PI ? 1 : -1;
      vx -= uy * side * blocked;
      vy += ux * side * blocked;
      const l = Math.max(1, Math.hypot(vx, vy));
      this.x += (vx / l) * sp * dt;
      this.y += (vy / l) * sp * dt;
      g.world.collide(this);
    } else {
      if (tgt && this.atk <= 0) this.attack(tgt, dx / d, dy / d);
      const l = Math.max(1, Math.hypot(this.sx, this.sy));
      let vx = (this.sx / l) * PUSH, vy = (this.sy / l) * PUSH;
      if (tgt && crowded) {
        // Sharing a foe, it keeps to a ring just within reach: the middle stays clear for the
        // others, and their pushes slide it round the foe, never out of reach or into it.
        const ux = -dx / d, uy = -dy / d, out = vx * ux + vy * uy;
        const back = clamp((reach - RING - d) * 8, -PUSH, PUSH) - out;
        vx += ux * back;
        vy += uy * back;
      }
      if (vx || vy) {
        this.x += vx * dt;
        this.y += vy * dt;
        g.world.collide(this);
      }
    }
    // It faces the way it walks; standing, it keeps facing, but for turning to strike (facing.js).
    if (this.moving) this.face = faceAlong(this.face, dx, dy);
    this.anim += dt * (this.moving ? 6 : 1.5);
    // Never lose the master.
    if (Math.hypot(this.x - p.x, this.y - p.y) > 260) {
      const spot = g.world.freeSpot(p.x + rand(-20, 20), p.y + rand(-14, 14));
      if (spot) {
        this.x = spot.x;
        this.y = spot.y;
      }
    }
    return true;
  }

  // Chooses the foe to go for, and claims it so the others look elsewhere.
  pick() {
    const p = this.g.player, old = this.target;
    if (old && !old.dead) claim(old, -1);
    this.retarget = rand(0.3, 0.5);
    // Fight close to the master rather than wandering off.
    this.target = this.best(this.x, this.y, 130, 230) || this.best(p.x, p.y, 170, Infinity);
    if (this.target) claim(this.target, 1);
  }

  // Lets go of its foe, as the hero takes it to another world (Game.gatherMinions): that foe
  // stays behind, so it picks one here on its next step.
  forget() {
    if (this.target && claims(this.target) > 0) claim(this.target, -1);
    this.target = null;
    this.retarget = 0;
  }

  // The foe within r of (cx, cy), and within leash of the master, that is nearest this minion
  // once each other minion on a foe has made it SHARE px farther.
  best(cx, cy, r, leash) {
    const g = this.g, p = g.player;
    let best = null, bs = Infinity;
    for (const e of g.grid.query(cx, cy, r, near)) {
      if (e.dead || e.prop || (e.x - cx) ** 2 + (e.y - cy) ** 2 > r * r || (e.x - p.x) ** 2 + (e.y - p.y) ** 2 >= leash * leash) continue;
      const s = Math.hypot(e.x - this.x, e.y - this.y) + claims(e) * SHARE - (e === this.target ? STICK : 0);
      if (s < bs) {
        bs = s;
        best = e;
      }
    }
    return best;
  }

  // The way out from among the minions closer than SPACE, the closer the stronger, into
  // (sx, sy); true if there are any.
  crowd() {
    let px = 0, py = 0;
    for (const o of this.g.minions) {
      if (o === this || o.life <= 0) continue;
      const ox = this.x - o.x, oy = this.y - o.y;
      if (ox >= SPACE || ox <= -SPACE || oy >= SPACE || oy <= -SPACE) continue;
      const d = Math.hypot(ox, oy);
      if (d >= SPACE) continue;
      const k = 1 - d / SPACE;
      if (d > 0.01) {
        px += (ox / d) * k;
        py += (oy / d) * k;
      } else {
        // Right on top of one another: each parts along its own bearing.
        px += Math.cos(this.wob) * k;
        py += Math.sin(this.wob) * k;
      }
    }
    this.sx = px;
    this.sy = py;
    return px !== 0 || py !== 0;
  }

  attack(tgt, nx, ny) {
    const g = this.g;
    this.atk = this.look.atk;
    this.swing = 0.15;
    this.face = faceAttack(this.face, false, nx, ny);
    // Death knights cleave everything in their swing; a skeleton strikes its own foe. Either breaks
    // any box (barrel, crate, urn, lantern) in the swing as well, as the hero's blows do: only in
    // passing, as it strikes a foe. It never goes for one (best passes them by), and none stops
    // it, as nothing but a wall does (the user's call, 16 October 2026).
    if (!this.knight) g.hitEnemy(tgt, this.dmg, { w: this.w, kb: this.kb, kx: nx, ky: ny, ult: this.ult });
    const cx = this.x + nx * SWING_AHEAD, cy = this.y + ny * SWING_AHEAD;
    for (const e of g.grid.query(cx, cy, 24)) {
      if (e.dead || (!this.knight && !e.prop) || Math.hypot(e.x - cx, e.y - cy) > SWING + e.r) continue;
      g.hitEnemy(e, this.dmg, { w: this.w, kb: this.kb, kx: nx, ky: ny, ult: this.ult });
    }
    g.particles.burst(tgt.x, tgt.y - 4, 4, 3, [this.look.dust[2], PC.w], 40, 0.2, 1, P.GLOW | P.FADE, {});
  }

  crumble() {
    const g = this.g;
    g.particles.burst(this.x, this.y - 6, 6, 10, this.look.dust, 60, 0.8, 1, P.GROUND | P.FADE, { vz: 70, grav: 260 });
    if (this.burst) {
      explode(g, this.x, this.y - 4, 26, this.dmg * 1.5, this.w, 'soul');
    } else sfx('bones', { pitch: 1.3 });
  }

  rect(cam) {
    const S = cam.S;
    const n = Math.floor(this.anim);
    const fr = this.moving ? walkFrame(this.spr, n) : idleFrame(this.spr, n);
    const flip = this.face < 0;
    const img = fr.get(flip);
    const lunge = this.swing > 0 ? this.face * 2 : 0;
    const w = img.width * S, h = img.height * S;
    const X = Math.round((this.x + lunge - cam.x) * S - w / 2), Y = Math.round((this.y - cam.y - this.spr.anchorY) * S);
    return { fr, flip, img, X, Y, w, h };
  }

  drawShadow(ctx, cam) {
    const S = cam.S;
    const sh = shadowSprite(this.look.shadow);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(sh, Math.round((this.x - cam.x) * S - (sh.width * S) / 2), Math.round((this.y - cam.y) * S - (sh.height * S) / 2), sh.width * S, sh.height * S);
    ctx.globalAlpha = 1;
  }

  draw(ctx, cam) {
    const { img, X, Y, w, h } = this.rect(cam);
    const fade = this.life < 1 ? this.life : 1;
    ctx.globalAlpha = fade;
    if (this.rise > 0) {
      const k = 1 - this.rise / 0.45;
      const vis = Math.max(1, Math.round(img.height * k));
      ctx.drawImage(img, 0, 0, img.width, vis, X, Math.round(Y + h - (vis * h) / img.height), w, Math.round((vis * h) / img.height));
    } else ctx.drawImage(img, X, Y, w, h);
    ctx.globalAlpha = 1;
  }

  drawEmissive(ctx, cam) {
    if (this.rise > 0) return;
    const { fr, flip, X, Y, w, h } = this.rect(cam);
    if (fr.em) ctx.drawImage(flip ? fr.emf : fr.em, X, Y, w, h);
  }

  drawGlow(ctx, cam) {
    const S = cam.S;
    const s = this.look.glowSize * S;
    ctx.globalAlpha = 0.22 * Math.min(1, this.life);
    ctx.drawImage(glow(this.look.glow), (this.x - cam.x) * S - s / 2, (this.y - 8 - cam.y) * S - s / 2, s, s);
    ctx.globalAlpha = 1;
  }
}
