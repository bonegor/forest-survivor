// The Bloomvale's fae court (28 October 2026; since 29 October 2026 the Fae Thread). The owner's:
// "Meadow, IDK what to do with meadow, you guys figure out something, have some good game design idea
// how to make meadow not be identical to forest." The rings that woke on a clock of their own did not
// register, so the court's rings are the hero's own now. As he walks through the crop fields
// (game/topology/quilt.js: the chunk's `bloom` lattice) he trails a silver thread (game/fae-thread.js
// THREAD, its numbers and geometry): the last 900 px of his path in the flowers, one point every 6 px.
// Walk a circle and cross it, and the fae sow it: every monster of the horde whose feet are inside
// falls asleep for 2 s (enemies.js lullT: no step, no bite, no shot, no charge; blows still land),
// the gems and coins inside fly to him as the magnet's do, a bell rings, moonblooms open round the rim
// and a crop circle stays pressed into the field. Then 8 s of rest with no thread. 96 px in a row off
// the flowers (along a lane, through an orchard or a hay field) snaps it; crossing a lane forgives.
//
// The court never holds, pushes, hurts or helps the hero (the owner's rules stand: monsters bump into
// nothing, damage never pushes him, no monster drop changes, the thief never sleeps); it only ever
// takes the horde, and only for a while. Readable in a horde of hundreds: the thread, the sowing's
// fill and rim and the field's sown edge are drawn over the horde (drawGlow, from Game.draw), the
// sleepers charmed pink and ringed in pink by night (enemies.js NIGHT_LOOKS 6).
//
// Only the Bloomvale's world has a court (forest.js: its look's `fae`); the Darkwood, Ranked and the
// Dungeon Run never make one. Nothing here is allocated a frame but the rare banner, sowing and
// stamp, and its dice are the world's own (world.fxRng): the Darkwood's Math.random draws stay as
// they were. A gap in g.frame (the forest set aside for a crypt) clears the thread.

import { SPR, canvasFromBuf } from '../engine/sprites.js';
import { sfx } from '../engine/audio.js';
import { clamp, hash2, makeCanvas } from '../engine/util.js';
import { makeBuf } from '../engine/pixels.js';
import { PC, P } from './particles.js';
import { MAGNETIC } from './pickups.js';
import { THREAD, Thread, area, inside, simplify, rasterCircle, strawPalette } from './fae-thread.js';
import { sampleField, TMAX, TCHUNK } from './topology/terrain.js';

const CH = TCHUNK;
// The moonblooms' sprites (art/flora-meadow.js; bloom_flower3 should one be missing), by kind (1, 2).
// Each has four frames: 0 a bud, 1 open, 2 bright, 3 wilted.
const BLOOMS = ['fae_bloom1', 'fae_bloom2'];
const BUD = 0, OPEN = 1, BRIGHT = 2, WILTED = 3;
// The thread: an ivory core over a dark under-stroke; the sowing's fill and rim; the preview's fill.
const COL = { core: '#fff2fa', under: '#181425', twinkle: '#ffffff', fill: '#ffd6ec', rim: '#ffb8d8', preview: '#ffb8d8', tell: '#ffffff' };
// The petals of a snap, a sowing's waking and the thread's return.
const PETALS = [PC.i, PC.z, PC.P];
// The most sleepers kept for their motes (only 16 get one each time).
const SLEEPERS = 600;

// Scratch, made once: a closed loop (up to THREAD.points + 2 vertices), its simplified polygon, the
// preview's, and the grid's answer.
const LOOP = new Float32Array(2 * (THREAD.points + 2));
const POLY = new Float32Array(2 * THREAD.verts);
const TMP = [];
// The walked track's stamps: a 7 x 7 dithered disc of the look's tread, about 55% covered, in four
// variants; made on first use (never headless).
let STAMPS = null;
function stamps(pal) {
  if (STAMPS) return STAMPS;
  STAMPS = [];
  for (let v = 0; v < 4; v++) {
    const b = makeBuf(7, 7);
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        if ((x - 3) ** 2 + (y - 3) ** 2 > 11) continue;
        const h = hash2(x + v * 7, y, 5113);
        if (h >= 0.55) continue;
        b.d[y * 7 + x] = pal.tread[hash2(x, y + v * 7, 5119) < 0.5 ? 0 : 1] >>> 0;
      }
    }
    STAMPS.push(canvasFromBuf(b));
  }
  return STAMPS;
}

export class FaeCourt {
  constructor(g, world) {
    this.g = g;
    this.world = world;
    this.rng = world.fxRng; // the world's own dice (forest.js), so no Math.random is drawn
    this.pal = strawPalette(world.look && world.look.terrain);
    this.thread = new Thread(THREAD.points);
    this.dist = 0; // px of path he has walked (the thread's points keep theirs)
    this.lx = g.player ? g.player.x : 0; // where he was last frame
    this.ly = g.player ? g.player.y : 0;
    this.frame = -2; // the last g.frame updated (a gap clears the thread)
    this.off = 0; // px of path in a row off the bloom
    this.restT = 0; // the rest after a sowing
    this.taught = false; // "The Fae Thread", once a run
    this.sown = false; // "Fae-sown", once a run
    // The would-be loop (preview): on this frame, its polygon and the crossable segment.
    this.pv = false;
    this.pvN = 0;
    this.pvI = -1;
    this.PV = new Float32Array(2 * THREAD.verts);
    // The sowing under way (one at a time: the rest outlasts it), its moonblooms and its sleepers.
    this.sow = { on: false, n: 0, poly: new Float32Array(2 * THREAD.verts), cx: 0, cy: 0, t: 0, woke: false, heard: false, moteT: 0 };
    this.blooms = [];
    for (let i = 0; i < THREAD.blooms; i++) this.blooms.push({ spr: null, x: 0, y: 0, frame: 0, anim: 0, light: null, tree: false, t: 0, solid: 0, trunk: 0, kind: 1, at: 0 });
    this.nBlooms = 0;
    this.sleepers = [];
    // The sown circles kept for the run (at most THREAD.circles), pressed again into a chunk made anew
    // (paintInto).
    this.circles = [];
    // The blooms as props see them: for each kind and frame, a sprite of that one frame
    // ({ w, h, frames }), so Forest.drawProp draws the frame a bloom wears (its anim 0: frames[0]).
    this.views = BLOOMS.map((name) => {
      const spr = SPR[name] || SPR.bloom_flower3;
      if (!spr) return null;
      const n = spr.frames.length;
      return [BUD, OPEN, BRIGHT, WILTED].map((k) => ({ name, w: spr.w, h: spr.h, frames: [spr.frames[Math.min(k, n - 1)]] }));
    });
    // The live chunks' scratch (press): one 256² ImageData and canvas, made on the first sowing.
    this.scratch = null;
    // The chunk the last stamp went on (stamp), so a stamp looks no key up.
    this.stC = null;
    this.stX = NaN;
    this.stY = NaN;
    // The sown edge's tell (drawGlow): its context and camera for the topology's callback.
    this.tellCtx = null;
    this.tellCam = null;
    this.tellFn = (x, y, tx, ty) => this.dash(x, y, tx, ty);
    this.box = [0, 0, 0, 0];
  }

  // The bloom at (x, y), px into a crop field (> 0 on the flowers): the chunk's lattice
  // (game/topology/quilt.js); everywhere without one.
  bloomAt(x, y) {
    const W = this.world, tc = W.terrainOf ? W.terrainOf(Math.floor(x / CH), Math.floor(y / CH)) : null;
    if (!tc || !tc.bloom) return TMAX;
    return sampleField(tc, tc.bloom, x, y, -TMAX);
  }

  // The thread through the night: spun, snapped, closed and sown, with its banners and sounds.
  update(dt) {
    const g = this.g, p = g.player, T = THREAD, th = this.thread;
    if (g.frame !== this.frame + 1) this.reset();
    this.frame = g.frame;
    this.tickSow(dt);
    this.pv = false;
    if (this.restT > 0) {
      this.restT -= dt;
      // The thread comes back: six pale motes at his feet.
      if (this.restT <= 0) this.motes(p.x, p.y, 6);
    }
    const sx = this.lx, sy = this.ly;
    this.lx = p.x;
    this.ly = p.y;
    if (g.state !== 'play' || p.dead || g.time >= T.last || this.restT > 0) {
      if (th.n) th.clear();
      this.off = 0;
      return;
    }
    const dx = p.x - sx, dy = p.y - sy;
    // A standing hero spins nothing.
    if (dx === 0 && dy === 0) {
      this.preview(p);
      return;
    }
    const step = Math.sqrt(dx * dx + dy * dy);
    if (step > T.jump) {
      this.snap(false);
      return;
    }
    this.dist += step;
    // Closed: this frame's step crosses a segment far enough behind him. A loop too small sows
    // nothing, and the thread stays.
    if (th.n >= 2) {
      const i = th.cross(sx, sy, p.x, p.y, this.dist, T.gap);
      if (i >= 0) {
        const n = simplify(LOOP, th.loop(i, th.ix, th.iy, sx, sy, LOOP), T.verts, POLY);
        if (area(POLY, n) >= T.minArea) {
          this.sowLoop(POLY, n);
          return;
        }
      }
    }
    if (this.bloomAt(p.x, p.y) > 0) {
      this.off = 0;
      const k = th.n - 1;
      if (th.n === 0 || (p.x - th.x(k)) ** 2 + (p.y - th.y(k)) ** 2 >= T.step * T.step) {
        th.add(p.x, p.y, this.dist);
        this.stamp(p.x, p.y);
      }
      // The first 300 px of thread teach what it is, once a run, not before 0:05.
      if (!this.taught && g.time >= T.teach.after && th.span >= T.teach.len) {
        this.taught = true;
        g.banner('The Fae Thread', 'Walk a circle through the flowers', '#ffb8d8', 2.6);
        sfx('shrine');
      }
    } else if (th.n) {
      this.off += step;
      if (this.off >= T.snap) this.snap(true);
    }
    this.preview(p);
  }

  // A new start: the thread cleared, where he stands now his last place (a new run, or back from a
  // crypt: the forest was set aside).
  reset() {
    const p = this.g.player;
    this.thread.clear();
    this.off = 0;
    this.pv = false;
    this.lx = p.x;
    this.ly = p.y;
    this.stX = NaN; // the stamp's chunk looked up anew (stamp)
  }

  // The thread snapped: cleared, with a small puff of pale petals at his feet when he walked off it.
  snap(puff) {
    this.thread.clear();
    this.off = 0;
    // Off the flowers 96 px or more, he may walk on along the lanes until the chunk he last stamped is
    // pruned (Forest.update) and made anew: the next stamp looks its chunk up again, so it never lands
    // on a canvas no longer drawn (29 October 2026).
    this.stX = NaN;
    if (!puff) return;
    const p = this.g.player, rng = this.rng;
    for (let i = 0; i < 8; i++) {
      const a = rng() * 6.283, s = 10 + rng() * 20;
      this.g.particles.emit(p.x, p.y, 2 + rng() * 4, Math.cos(a) * s, Math.sin(a) * s * 0.7, 8 + rng() * 12, 0.5 + rng() * 0.4, 1, PETALS[i % 3], P.GLOW | P.FADE, 2);
    }
  }

  // Pale motes rising at (x, y).
  motes(x, y, n) {
    const rng = this.rng;
    for (let i = 0; i < n; i++) this.g.particles.emit(x + (rng() - 0.5) * 12, y - rng() * 4, 2 + rng() * 6, (rng() - 0.5) * 6, (rng() - 0.5) * 4, 10 + rng() * 10, 0.8 + rng() * 0.6, 1, PC.i, P.GLOW | P.FADE, 0.5);
  }

  // The would-be loop, should he cross the nearest crossable segment now: shown (drawGround,
  // drawGlow) while that segment is within THREAD.near and the loop would sow.
  preview(p) {
    const th = this.thread, T = THREAD;
    if (th.n < 2) return;
    const i = th.nearest(p.x, p.y, this.dist, T.gap);
    if (i < 0 || th.nd > T.near) return;
    const n = simplify(LOOP, th.loop(i, th.nx, th.ny, p.x, p.y, LOOP), T.verts, this.PV);
    if (area(this.PV, n) < T.minArea) return;
    this.pv = true;
    this.pvN = n;
    this.pvI = i;
  }

  // A loop sown: what it holds falls asleep, its gems fly to him, it is pressed into the field and its
  // rim blooms; then the rest.
  sowLoop(poly, n) {
    const g = this.g, p = g.player, T = THREAD, S = this.sow;
    S.poly.set(poly.subarray(0, 2 * n));
    S.n = n;
    let cx = 0, cy = 0;
    for (let i = 0; i < n; i++) {
      cx += poly[2 * i];
      cy += poly[2 * i + 1];
    }
    cx /= n;
    cy /= n;
    let R = 0;
    for (let i = 0; i < n; i++) R = Math.max(R, Math.hypot(poly[2 * i] - cx, poly[2 * i + 1] - cy));
    S.cx = cx;
    S.cy = cy;
    S.t = 0;
    S.on = true;
    S.woke = false;
    S.moteT = 0;
    // Asleep: every foe whose feet are inside that may be moved at all (Enemy.movable: no boss, crypt
    // lord, champion, prop, sealed, sleeping or dormant foe, none still rising, never the thief).
    // Fliers too. A charge or a cast being wound up is dropped, and the charger's shake with it. The
    // grid is last frame's (Game.update rebuilds it after the world's update): a foe killed since is
    // still in it, and movable rules it out.
    const sl = this.sleepers;
    sl.length = 0;
    g.grid.query(cx, cy, R + 1, TMP);
    for (let i = 0; i < TMP.length; i++) {
      const e = TMP[i];
      if (!e.movable || !inside(S.poly, n, e.x, e.y)) continue;
      e.lullT = T.lull;
      e.lockT = 0;
      e.state = 'move';
      e.shake = 0;
      if (sl.length < SLEEPERS) sl.push(e);
    }
    TMP.length = 0;
    // Gathered: what the magnet would pull (MAGNETIC; never a box's loot) flies to him, with its hop.
    for (const pk of g.pickups) {
      if (pk.pulled || pk.dead || pk.hold > 0 || pk.opts.box || !MAGNETIC.has(pk.kind)) continue;
      if (!inside(S.poly, n, pk.x, pk.y)) continue;
      pk.pulled = true;
      pk.speed = -60;
    }
    this.thread.clear();
    this.off = 0;
    this.pv = false;
    this.restT = T.rest;
    this.keep(S.poly, n, cx, cy);
    this.rimBlooms(S);
    S.heard = (cx - p.x) ** 2 + (cy - p.y) ** 2 <= T.sound * T.sound;
    sfx('bell', { pan: clamp((cx - p.x) / 200, -1, 1) });
    if (!this.sown) {
      this.sown = true;
      g.banner('Fae-sown', 'What the circle holds falls asleep', '#ffb8d8', 2.4);
    }
  }

  // The moonblooms round a sowing's rim: one every THREAD.bloomEvery px of it, at most THREAD.blooms,
  // opening one after another over THREAD.open s.
  rimBlooms(S) {
    const T = THREAD, poly = S.poly, n = S.n;
    let L = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) L += Math.hypot(poly[2 * i] - poly[2 * j], poly[2 * i + 1] - poly[2 * j + 1]);
    const count = Math.max(1, Math.min(T.blooms, Math.floor(L / T.bloomEvery))), gap = L / count;
    let k = 0, want = gap * 0.5, walked = 0;
    for (let i = 0, j = n - 1; i < n && k < count; j = i++) {
      const ax = poly[2 * j], ay = poly[2 * j + 1], ex = poly[2 * i] - ax, ey = poly[2 * i + 1] - ay, l = Math.hypot(ex, ey);
      while (k < count && want <= walked + l) {
        const t = l > 0 ? (want - walked) / l : 0, b = this.blooms[k];
        b.x = ax + ex * t;
        b.y = ay + ey * t;
        b.kind = this.rng() < 0.3 ? 2 : 1;
        b.at = (T.open * k) / count;
        b.t = this.rng() * 10;
        b.spr = null;
        k++;
        want += gap;
      }
      walked += l;
    }
    this.nBlooms = k;
  }

  // A sowing's life: its blooms' frames, the sleepers' motes, their waking, and its end.
  tickSow(dt) {
    const S = this.sow, T = THREAD;
    if (!S.on) return;
    S.t += dt;
    const t = S.t;
    if (t >= T.lull + T.wilt) {
      S.on = false;
      this.nBlooms = 0;
      this.sleepers.length = 0;
      return;
    }
    for (let i = 0; i < this.nBlooms; i++) {
      const b = this.blooms[i];
      const f = t < T.open ? (t >= b.at ? OPEN : BUD) : t < T.lull ? BRIGHT : WILTED;
      b.frame = f;
      const views = this.views[b.kind - 1];
      b.spr = views ? views[f] : null;
    }
    const g = this.g, rng = this.rng;
    if (t < T.lull) {
      // Pale motes over at most 16 sleepers every 0.3 s.
      S.moteT -= dt;
      if (S.moteT <= 0) {
        S.moteT = 0.3;
        const sl = this.sleepers;
        for (let i = 0, m = 0; i < sl.length && m < 16; i++) {
          const e = sl[i];
          if (e.dead || !(e.lullT > 0)) continue;
          m++;
          g.particles.emit(e.x + (rng() - 0.5) * 6, e.y, (e.h || 12) + 2, (rng() - 0.5) * 4, 0, 10 + rng() * 6, 0.9, 1, PC.z, P.GLOW | P.FADE, 0.5);
        }
      }
    } else if (!S.woke) {
      // The sleepers wake: 24 petals off the rim, and a whoosh within earshot.
      S.woke = true;
      this.sleepers.length = 0;
      const poly = S.poly, n = S.n;
      for (let i = 0; i < 24; i++) {
        const v = Math.floor(rng() * n), x = poly[2 * v], y = poly[2 * v + 1];
        const a = Math.atan2(y - S.cy, x - S.cx) + (rng() - 0.5) * 0.4, s = 30 + rng() * 40;
        g.particles.emit(x, y, 2 + rng() * 6, Math.cos(a) * s, Math.sin(a) * s * 0.7, 10 + rng() * 25, 0.7 + rng() * 0.6, 1, PETALS[i % 3], P.GLOW | P.FADE, 2);
      }
      const p = g.player;
      if ((S.cx - p.x) ** 2 + (S.cy - p.y) ** 2 <= T.sound * T.sound) sfx('whoosh', { pan: clamp((S.cx - p.x) / 200, -1, 1) });
    }
  }

  // A sown circle kept for the run (the oldest dropped past THREAD.circles) and pressed into the
  // chunks already made.
  keep(poly, n, cx, cy) {
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = poly[2 * i], y = poly[2 * i + 1];
      minx = Math.min(minx, x);
      maxx = Math.max(maxx, x);
      miny = Math.min(miny, y);
      maxy = Math.max(maxy, y);
    }
    const c = { poly: poly.slice(0, 2 * n), n, cx, cy, minx, miny, maxx, maxy };
    if (this.circles.length >= THREAD.circles) this.circles.shift();
    this.circles.push(c);
    this.press(c);
  }

  // A sown circle pressed into the live chunks it meets: rasterised onto the scratch, then one
  // drawImage onto each chunk's canvas (no getImageData). A chunk not made yet gets it when it is
  // (paintInto). Never headless: nothing is drawn there.
  press(c) {
    const g = this.g, W = this.world;
    if (g.headless || !W.chunks) return;
    if (!this.scratch) {
      const cv = makeCanvas(CH, CH), c2d = cv.getContext('2d'), img = c2d.createImageData(CH, CH);
      this.scratch = { cv, c2d, img, px: new Uint32Array(img.data.buffer) };
    }
    const s = this.scratch;
    for (let cy = Math.floor(c.miny / CH); cy <= Math.floor(c.maxy / CH); cy++) {
      for (let cx = Math.floor(c.minx / CH); cx <= Math.floor(c.maxx / CH); cx++) {
        const ch = W.chunks.get(W.key(cx, cy));
        if (!ch || !ch.canvas) continue;
        s.px.fill(0);
        if (!rasterCircle(c.poly, c.n, c.cx, c.cy, cx * CH, cy * CH, CH, CH, W.terrainOf ? W.terrainOf(cx, cy) : null, this.pal, s.px)) continue;
        s.c2d.putImageData(s.img, 0, 0);
        ch.canvas.getContext('2d').drawImage(s.cv, 0, 0);
      }
    }
  }

  // The sown circles kept this run, pressed into chunk (cx, cy)'s pixels as it is made anew
  // (Forest.generate, before putImageData). The walked track is not: a pruned chunk regrows.
  paintInto(px32, cx, cy, tc) {
    const C = this.circles;
    if (!C.length) return;
    const x0 = cx * CH, y0 = cy * CH;
    for (let i = 0; i < C.length; i++) {
      const c = C[i];
      if (c.maxx < x0 || c.minx > x0 + CH || c.maxy < y0 || c.miny > y0 + CH) continue;
      rasterCircle(c.poly, c.n, c.cx, c.cy, x0, y0, CH, CH, tc, this.pal, px32);
    }
  }

  // The flowers pressed flat under his feet: a stamp of the tread onto the chunk's canvas (and its
  // neighbour's, should it straddle the edge). Never headless.
  stamp(x, y) {
    const g = this.g, W = this.world;
    if (g.headless || !W.chunks) return;
    const S = stamps(this.pal), img = S[Math.floor(this.rng() * S.length)];
    const X = Math.round(x) - 3, Y = Math.round(y) - 3;
    const c0 = Math.floor(X / CH), c1 = Math.floor((X + 6) / CH), r0 = Math.floor(Y / CH), r1 = Math.floor((Y + 6) / CH);
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        let ch;
        if (cx === this.stX && cy === this.stY) ch = this.stC;
        else {
          ch = W.chunks.get(W.key(cx, cy));
          // (A chunk not made yet is not remembered, so it is looked up again once it is.)
          if (ch && c0 === c1 && r0 === r1) {
            this.stC = ch;
            this.stX = cx;
            this.stY = cy;
          }
        }
        if (ch && ch.canvas) ch.canvas.getContext('2d').drawImage(img, X - cx * CH, Y - cy * CH);
      }
    }
  }

  // A sowing's moonblooms within view, into the game's y-sorted list (as Forest.collectProps puts its
  // props).
  collect(cam, list) {
    if (!this.sow.on) return;
    for (let i = 0; i < this.nBlooms; i++) {
      const b = this.blooms[i], s = b.spr;
      if (!s) continue;
      if (b.x + s.w < cam.x || b.x - s.w > cam.x + cam.W || b.y - s.h > cam.y + cam.H || b.y < cam.y - 8) continue;
      list.push(b);
    }
  }

  // The would-be loop, faintly filled on the ground under the actors (Game.draw's drawGroundProps).
  drawGround(ctx, cam) {
    if (!this.pv) return;
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = COL.preview;
    path(ctx, cam, this.PV, this.pvN, 0);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Over the horde (Game.draw, after the horde is put back; it comes in 'lighter' and leaves so):
  // the sowing's fill and rim, the thread's under-stroke, its core by age, its twinkles, the preview's
  // segment and the field's sown edge.
  drawGlow(ctx, cam) {
    const g = this.g, S = this.sow, T = THREAD, th = this.thread, p = g.player, Sc = cam.S;
    const soft = g.settings.softFlash === true, clock = g.clock ?? g.time;
    ctx.globalCompositeOperation = 'source-over';
    if (S.on && onView(cam, S)) {
      if (S.t < 0.6) {
        ctx.globalAlpha = 0.35 * (1 - S.t / 0.6);
        ctx.fillStyle = COL.fill;
        path(ctx, cam, S.poly, S.n, 0);
        ctx.fill();
      }
      if (S.t < T.lull) {
        ctx.globalAlpha = 0.6 * (1 - S.t / T.lull);
        ctx.strokeStyle = COL.rim;
        ctx.lineWidth = Sc;
        path(ctx, cam, S.poly, S.n, 0);
        ctx.closePath();
        ctx.stroke();
      }
    }
    if (th.n > 0) {
      // Off the bloom the thread is half as bright, its newest segment flickering at 8 Hz (steady
      // under FLASHES: SOFT).
      const dim = this.off > 0 ? 0.5 : 1, n = th.n;
      ctx.lineWidth = Sc;
      ctx.globalAlpha = 0.5 * dim;
      ctx.strokeStyle = COL.under;
      ctx.beginPath();
      threadPath(ctx, cam, th, 0, n - 1, p, 1);
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = COL.core;
      // Five age buckets, 0.3 (oldest) to 0.9; the segments within THREAD.calm of him no brighter
      // than 0.35 (the last pass), the live tail to him in the newest bucket.
      const c2 = T.calm * T.calm;
      for (let b = 0; b <= 5; b++) {
        const calmPass = b === 5, a = calmPass ? 0.35 : 0.3 + 0.15 * b;
        let drew = false;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const x0 = th.x(i), y0 = th.y(i), last = i === n - 1;
          const x1 = last ? p.x : th.x(i + 1), y1 = last ? p.y : th.y(i + 1);
          const bucket = last ? 4 : Math.min(4, Math.floor((i * 5) / Math.max(1, n - 1)));
          const calm = (x0 - p.x) ** 2 + (y0 - p.y) ** 2 < c2 || (x1 - p.x) ** 2 + (y1 - p.y) ** 2 < c2;
          const inCalm = calm && bucket > 0;
          if (calmPass ? !inCalm : inCalm || bucket !== b) continue;
          if (last && this.off > 0 && !soft && Math.floor(clock * 16) % 2) continue; // the flicker
          ctx.moveTo(Math.round((x0 - cam.x) * Sc), Math.round((y0 - cam.y) * Sc));
          ctx.lineTo(Math.round((x1 - cam.x) * Sc), Math.round((y1 - cam.y) * Sc));
          drew = true;
        }
        if (!drew) continue;
        ctx.globalAlpha = a * dim;
        ctx.stroke();
      }
      // A white twinkle on every third point.
      ctx.fillStyle = COL.twinkle;
      const w = Math.max(1, Math.round(Sc));
      for (let i = n - 1; i >= 0; i -= 3) {
        ctx.globalAlpha = (soft ? 0.6 : 0.5 + 0.4 * Math.sin(clock * 6 + i)) * dim;
        ctx.fillRect(Math.round((th.x(i) - cam.x) * Sc), Math.round((th.y(i) - cam.y) * Sc), w, w);
      }
      // The preview: the segment he would cross, bright and twice as wide.
      if (this.pv && this.pvI >= 0 && this.pvI + 1 < n) {
        const i = this.pvI;
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2 * Sc;
        ctx.beginPath();
        ctx.moveTo(Math.round((th.x(i) - cam.x) * Sc), Math.round((th.y(i) - cam.y) * Sc));
        ctx.lineTo(Math.round((th.x(i + 1) - cam.x) * Sc), Math.round((th.y(i + 1) - cam.y) * Sc));
        ctx.stroke();
        ctx.lineWidth = Sc;
      }
      this.drawTell(ctx, cam);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
  }

  // The field's sown edge within THREAD.tell of him, while a thread exists: 3 px dashes every 8 px,
  // white at 0.3, from the topology's own rim of the plot he stands in (quilt.js bloomRim).
  drawTell(ctx, cam) {
    const W = this.world, topo = W.topo, p = this.g.player, T = THREAD;
    if (!topo || !topo.bloomRim || !topo.plotAt) return;
    const plot = topo.plotAt(p.x, p.y);
    if (!plot) return;
    const B = this.box;
    B[0] = p.x - T.tell;
    B[1] = p.y - T.tell;
    B[2] = p.x + T.tell;
    B[3] = p.y + T.tell;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = COL.tell;
    this.tellCtx = ctx;
    this.tellCam = cam;
    topo.bloomRim(plot, B, this.tellFn);
    this.tellCtx = null;
    this.tellCam = null;
    ctx.globalCompositeOperation = 'lighter';
  }

  // One dash of the tell at (x, y) along (tx, ty) (a 3 px tick across it should no heading come).
  dash(x, y, tx, ty) {
    const ctx = this.tellCtx, cam = this.tellCam, p = this.g.player;
    if (!ctx || (x - p.x) ** 2 + (y - p.y) ** 2 > THREAD.tell * THREAD.tell) return;
    const S = cam.S, w = Math.max(1, Math.round(S));
    if (tx === undefined || ty === undefined) {
      ctx.fillRect(Math.round((x - 1.5 - cam.x) * S), Math.round((y - cam.y) * S), Math.round(3 * S), w);
      return;
    }
    for (let k = -1; k <= 1; k++) ctx.fillRect(Math.round((x + tx * k - cam.x) * S), Math.round((y + ty * k - cam.y) * S), w, w);
  }

  // A sowing's pink light through the lull.
  addLights(g) {
    const S = this.sow;
    if (!S.on || S.t >= THREAD.lull || !onView(g.cam, S, 120)) return;
    const K = this.world.look.lightK || {};
    g.light(S.cx, S.cy - 4, THREAD.light, 'pink', K.pink ?? 1);
  }

  // No HUD arrow: the thread is at his feet (Hud.drawIndicators; hud.js's `ring` icon stays dormant).
  marker() {
    return null;
  }
}

// A flat polygon as a path on the screen (begun anew), offset dy world px down.
function path(ctx, cam, poly, n, dy) {
  const S = cam.S;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const X = Math.round((poly[2 * i] - cam.x) * S), Y = Math.round((poly[2 * i + 1] + dy - cam.y) * S);
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  }
}

// The thread's points a..b and the live tail to the hero, offset dy world px down, into the path.
function threadPath(ctx, cam, th, a, b, p, dy) {
  const S = cam.S;
  for (let i = a; i <= b; i++) {
    const X = Math.round((th.x(i) - cam.x) * S), Y = Math.round((th.y(i) + dy - cam.y) * S);
    if (i === a) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  }
  ctx.lineTo(Math.round((p.x - cam.x) * S), Math.round((p.y + dy - cam.y) * S));
}

// Whether a sowing (its centre, and m px more than 300) is within the camera's view.
const onView = (cam, s, m = 0) => s.cx + 300 + m >= cam.x && s.cx - 300 - m <= cam.x + cam.W && s.cy + 300 + m >= cam.y && s.cy - 300 - m <= cam.y + cam.H;
