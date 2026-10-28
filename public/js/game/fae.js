// The Bloomvale's fae court (28 October 2026): the rings of game/fae-rings.js brought to life round
// the hero. The owner's: "Meadow, IDK what to do with meadow, you guys figure out something, have some
// good game design idea how to make meadow not be identical to forest." The Darkwood's horde comes AT
// the hero; here, now and then, it goes ROUND him. Each ring near him keeps its own clock (ringPhase):
// asleep, its moonblooms closed; stirring, its blooms opening one by one, clockwise like a clock
// filling, for 6 s; dancing for 12 s, when every monster of the horde that crosses its line is swept
// into a wheel turning round it (enemies.js danceStep), still biting the hero if he touches one but
// no longer chasing him. The last 3 s are the quickening: the blooms blink, the line turns red-violet,
// the wheel speeds up and a bell rings; when the music stops the dancers break wild (enemies.js
// breakWild), a burst of petals flies off the rim and the blooms wilt. From 8:00 the court is
// Unseelie: violet blooms, shorter dances, wilder releases.
//
// The ring never holds, pushes, hurts or helps the hero (the owner's rules stand: monsters bump into
// nothing, damage never pushes him, no monster drop changes): it only ever takes the horde, and only
// for a while. "Prettier than it is kind." Readable in a horde of hundreds: the dance is the one thing
// in the game that moves round rather than at him; the rim and its sparks are drawn over the horde
// (drawGlow, from Game.draw), the blooms' hearts unlit over the night (their emissive keys), a pink
// light round a waking ring, and the HUD's arrow to the nearest (marker).
//
// Only the Bloomvale's world has a court (forest.js: its look's `fae`); the Darkwood, Ranked and the
// Dungeon Run never make one. Nothing here is allocated a frame but the rare banner and burst, and its
// dice are the world's own (world.fxRng): the Darkwood's Math.random draws stay as they were.

import { SPR, canvasFromBuf } from '../engine/sprites.js';
import { sfx } from '../engine/audio.js';
import { TAU, clamp, hash2 } from '../engine/util.js';
import { makeBuf, hexPack } from '../engine/pixels.js';
import { ringSprite } from './fxsprites.js';
import { PC, P } from './particles.js';
import { FAE, ASLEEP, STIR, DANCE, ringsNear, ringPhase, trimRings } from './fae-rings.js';

// The moonblooms' sprites (art/flora-meadow.js; bloom_flower3 should one be missing: views), by
// skin (Seelie, then the Unseelie's recolour) and kind (1, 2). Each has four frames: 0 a bud, 1 open,
// 2 bright, 3 wilted.
const BLOOMS = [['fae_bloom1', 'fae_bloom2'], ['fae_bloom1_u', 'fae_bloom2_u']];
const BUD = 0, OPEN = 1, BRIGHT = 2, WILTED = 3;
// The line's colours: the Seelie's pink and, in its quickening, red-violet; the Unseelie's red-violet,
// crimson in its quickening. The HUD's arrow is the map's own pink, or the Unseelie's violet.
const LINE = { seelie: '#ffb8d8', seelieQuick: '#b55088', unseelie: '#b55088', unseelieQuick: '#e43b44' };
const MARK_COLOR = { seelie: '#f6757a', unseelie: '#b55088' };
// The sparks riding the line while it dances.
const SPARK = { seelie: '#fff0f6', unseelie: '#ffb8d8' };
// The petals that burst off the rim when the music stops.
const PETALS = [PC.i, PC.z, PC.P];
// The darker grass under the line (FAE.band px wide), dithered, with a few pale petals in it: the
// Seelie's green, the Unseelie's violet-green.
const BAND = {
  seelie: ['#3f7e4a', '#478c52', '#ffb8d8', '#f4f4e4'],
  unseelie: ['#46705e', '#56608a', '#c8a0ff', '#b55088'],
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

// The band as a canvas, made once a skin: an annulus FAE.band px wide round FAE.r, its middle at
// (n/2, n/2).
const bands = {};
function bandCanvas(skin) {
  if (bands[skin]) return bands[skin];
  const R = FAE.r, half = FAE.band / 2, n = 2 * (R + half) + 2, c = n / 2, b = makeBuf(n, n);
  const [dark, light, p1, p2] = BAND[skin].map((h) => hexPack(h));
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      if (Math.abs(d - R) > half) continue;
      const h = hash2(x, y, 4409);
      // Lighter toward the line's middle, darker at the band's edges.
      const k = 1 - Math.abs(d - R) / half;
      b.d[y * n + x] = h < 0.035 ? (h < 0.02 ? p1 : p2) : k * 0.7 > BAYER[(y & 3) * 4 + (x & 3)] ? light : dark;
    }
  }
  return (bands[skin] = canvasFromBuf(b));
}

// The line as a canvas, by its colour: fxsprites.js's crisp 1 px ring of radius FAE.r, kept here so
// no key is made a frame.
const rims = {};

// A dancing ring's foes, as the grid gives them (only read at once: game/grid.js query).
const TMP = [];
// The courts' frames, counted across runs: the rings are kept from run to run (fae-rings.js), so a
// ring last updated in an earlier run is never taken for one updated the frame before. Each new
// court skips a frame (constructor): nothing ticks a court between runs, so without it a new run's
// first frame would follow the last run's, and a ring that was dancing as that run ended would
// burst its petals (release) as the new one opens.
let TICK = 0;

export class FaeCourt {
  constructor(g, world) {
    TICK++; // no ring of an earlier run is "seen" on this court's first frame (TICK)
    this.g = g;
    this.world = world;
    this.rng = world.fxRng; // the world's own dice (forest.js), so no Math.random is drawn
    this.near = []; // the rings within FAE.near of the hero, this frame (update)
    this.mark = [0, 0, '', 'ring']; // the HUD's arrow (marker), one array for the run
    this.marked = false;
    this.taught = false; // "A fae ring stirs", once a run
    this.unseelie = false; // "The Unseelie Hour", once a run
    this.trimT = 0;
    // The blooms as props see them: for each skin, kind and frame, a sprite of that one frame
    // ({ w, h, frames }), so Forest.drawProp draws the frame a bloom wears (its anim 0: frames[0]).
    // A sprite with fewer frames gives its last (bloom_flower3, standing in should one be missing).
    this.views = BLOOMS.map((names) =>
      names.map((name) => {
        const spr = SPR[name] || SPR.bloom_flower3;
        if (!spr) return null;
        const n = spr.frames.length;
        return [BUD, OPEN, BRIGHT, WILTED].map((k) => ({ name, w: spr.w, h: spr.h, frames: [spr.frames[Math.min(k, n - 1)]] }));
      }),
    );
  }

  // The rings round the hero through the night: their clocks, their blooms, who they take, their
  // sounds and banners.
  update(dt) {
    const g = this.g, p = g.player, t = g.time, near = this.near, soft = g.settings.softFlash === true;
    const tick = ++TICK;
    ringsNear(p.x, p.y, FAE.near, near);
    let best = Infinity, mark = null;
    for (const r of near) {
      const was = r.state, seen = r.at === tick - 1; // updated last frame too: a change is a change, not a ring come in range
      ringPhase(r, t);
      const d2 = (r.x - p.x) ** 2 + (r.y - p.y) ** 2, heard = d2 <= FAE.sound * FAE.sound;
      if (seen && was === DANCE && r.state === ASLEEP) this.release(r, heard, p);
      // The quickening's bell, once a dance (not for a ring that comes in range already ringing).
      if (r.state !== DANCE) r.rang = false;
      else if (r.quick && !r.rang) {
        r.rang = true;
        if (seen && heard) sfx('bell', { pan: clamp((r.x - p.x) / 200, -1, 1) });
      }
      const awake = r.state !== ASLEEP;
      // The first ring the hero sees waking teaches what it is, once a run.
      if (awake && !this.taught && d2 <= FAE.teach * FAE.teach) {
        this.taught = true;
        g.banner('A fae ring stirs', 'Lead the horde into its dance', '#f6757a', 2.6);
        sfx('shrine');
      }
      this.dress(r, t, soft);
      if (r.state === DANCE) {
        r.spinA += (r.quick ? FAE.quickSpin : FAE.spin) * dt;
        if (d2 <= FAE.reach * FAE.reach) this.capture(r);
      } else if (r.state === STIR && d2 <= FAE.reach * FAE.reach) this.motes(r, dt);
      if (awake && d2 <= FAE.mark * FAE.mark && d2 < best) {
        best = d2;
        mark = r;
      }
      r.at = tick;
      r.seen = true;
    }
    // The HUD's arrow: the nearest ring awake, in its court's colour.
    this.marked = !!mark;
    if (mark) {
      this.mark[0] = mark.x;
      this.mark[1] = mark.y - 6;
      this.mark[2] = mark.fierce ? MARK_COLOR.unseelie : MARK_COLOR.seelie;
    }
    // The court turns cruel at 8:00, a free minute between the 7:00 swarm and the 9:00 boss: its
    // cycles from then on dance shorter and release wilder (FAE.unseelie).
    if (!this.unseelie && t >= FAE.unseelie.at) {
      this.unseelie = true;
      g.banner('The Unseelie Hour', 'The fae rings turn cruel', '#b55088', 3);
      sfx('bell');
    }
    this.trimT -= dt;
    if (this.trimT <= 0) {
      this.trimT = 2;
      trimRings(p.x, p.y);
    }
  }

  // Each bloom in its sprite and frame for the ring's state: buds asleep (wilted for a while after a
  // dance), opening one by one as it stirs, bright as it dances, blinking at 4 Hz in its quickening
  // (held bright under FLASHES: SOFT).
  dress(r, t, soft) {
    const skin = this.views[r.fierce ? 1 : 0];
    let lit = 0;
    if (r.state === STIR) lit = Math.floor(r.k * FAE.blooms) + 1;
    const blink = r.quick && !soft && Math.floor(t * 8) % 2 === 1;
    for (let i = 0; i < r.blooms.length; i++) {
      const b = r.blooms[i];
      const f = r.state === ASLEEP ? (r.wilt ? WILTED : BUD) : r.state === STIR ? (i < lit ? OPEN : BUD) : blink ? OPEN : BRIGHT;
      b.frame = f;
      const views = skin && skin[b.kind - 1];
      b.spr = views ? views[f] : null;
    }
  }

  // A dancing ring takes every foe of the horde whose middle comes within its line (FAE.r): one that
  // can be moved at all (Enemy.movable: no boss, crypt lord, champion, prop, sealed or sleeping foe,
  // none still rising, never the thief), not dancing already and not wild (a released dancer is never
  // taken again, so the dance can't loop). The grid is last frame's (Game.update rebuilds it after
  // the world's update): a foe killed since is still in it, and movable rules it out. A charge or a
  // cast being wound up is dropped, and a charger's wind-up shake with it (enemies.js charger: only a
  // dash stills it), so no dancer shivers with a charge that never comes. Each dancer keeps the ring,
  // its release time and its court, so its release never waits on the ring being updated again.
  capture(r) {
    const C = r.fierce ? FAE.unseelie : FAE.seelie, R2 = FAE.r * FAE.r;
    this.g.grid.query(r.x, r.y, FAE.r, TMP);
    for (let i = 0; i < TMP.length; i++) {
      const e = TMP[i];
      if (e.dance || e.wildT > 0 || !e.movable) continue;
      if ((e.x - r.x) ** 2 + (e.y - r.y) ** 2 > R2) continue;
      e.dance = r;
      e.danceEnd = r.end;
      e.danceC = C;
      e.lockT = 0;
      e.state = 'move';
      e.shake = 0;
    }
    TMP.length = 0;
  }

  // When the music stops: petals burst off the rim and a whoosh within earshot. The blooms wilt
  // (dress, by the ring's own clock).
  release(r, heard, p) {
    const g = this.g, rng = this.rng;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU + rng() * 0.15, s = 30 + rng() * 40;
      g.particles.emit(r.x + Math.cos(a) * FAE.r, r.y + Math.sin(a) * FAE.r, 2 + rng() * 6, Math.cos(a) * s, Math.sin(a) * s * 0.7, 10 + rng() * 25, 0.7 + rng() * 0.6, 1, PETALS[i % 3], P.GLOW | P.FADE, 2);
    }
    if (heard) sfx('whoosh', { pan: clamp((r.x - p.x) / 200, -1, 1) });
  }

  // A stirring ring's motes: one pink mote at an opened bloom every quarter second.
  motes(r, dt) {
    r.moteT -= dt;
    if (r.moteT > 0) return;
    r.moteT = 0.25;
    const lit = Math.min(r.blooms.length, Math.floor(r.k * FAE.blooms) + 1), rng = this.rng;
    const b = r.blooms[Math.floor(rng() * lit)];
    this.g.particles.emit(b.x + (rng() - 0.5) * 4, b.y - 4, 4 + rng() * 6, (rng() - 0.5) * 6, (rng() - 0.5) * 4, 6 + rng() * 8, 1 + rng() * 0.8, 1, PC.i, P.GLOW | P.FADE, 0.5);
  }

  // The blooms within view, into the game's y-sorted list (as Forest.collectProps puts its props).
  collect(cam, list) {
    for (const r of this.near) {
      if (r.x + 70 < cam.x || r.x - 70 > cam.x + cam.W || r.y - 80 > cam.y + cam.H || r.y + 70 < cam.y) continue;
      for (const b of r.blooms) {
        const s = b.spr;
        if (!s) continue;
        if (b.x + s.w < cam.x || b.x - s.w > cam.x + cam.W || b.y - s.h > cam.y + cam.H || b.y < cam.y - 8) continue;
        list.push(b);
      }
    }
  }

  // The darker grass under each ring's line, on the ground (Game.draw's drawGroundProps): faint while
  // it sleeps, deeper while it is awake.
  drawGround(ctx, cam) {
    const S = cam.S;
    for (const r of this.near) {
      if (!onView(cam, r, 60)) continue;
      const c = bandCanvas(r.fierce ? 'unseelie' : 'seelie'), n = c.width;
      ctx.globalAlpha = r.state === ASLEEP ? 0.55 : 0.85;
      ctx.drawImage(c, Math.round((r.x - n / 2 - cam.x) * S), Math.round((r.y - n / 2 - cam.y) * S), n * S, n * S);
    }
    ctx.globalAlpha = 1;
  }

  // The line over the horde, in 'lighter' (Game.draw, after the horde is put back): faint and
  // brightening as the ring stirs, bright as it dances, blinking at 4 Hz in its quickening (held under
  // FLASHES: SOFT) in the quickening's colour; and while it dances, ten sparks riding the wheel.
  drawGlow(ctx, cam) {
    const S = cam.S, g = this.g, soft = g.settings.softFlash === true, t = g.time;
    for (const r of this.near) {
      if (r.state === ASLEEP || !onView(cam, r, 60)) continue;
      const fierce = r.fierce;
      const col = r.quick ? (fierce ? LINE.unseelieQuick : LINE.seelieQuick) : fierce ? LINE.unseelie : LINE.seelie;
      const a = r.state === STIR ? 0.25 + 0.35 * r.k : !r.quick ? 0.7 : soft ? 0.7 : Math.floor(t * 8) % 2 ? 0.35 : 0.9;
      const rim = (rims[col] ??= ringSprite(FAE.r, col)), n = rim.width;
      ctx.globalAlpha = a;
      ctx.drawImage(rim, Math.round((r.x - n / 2 - cam.x) * S), Math.round((r.y - n / 2 - cam.y) * S), n * S, n * S);
      if (r.state === DANCE) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = fierce ? SPARK.unseelie : SPARK.seelie;
        for (let i = 0; i < FAE.blooms; i++) {
          const ang = r.a0 + r.spinA + (i * TAU) / FAE.blooms;
          const x = r.x + Math.cos(ang) * FAE.r, y = r.y + Math.sin(ang) * FAE.r;
          ctx.fillRect(Math.round((x - 1 - cam.x) * S), Math.round((y - 1 - cam.y) * S), Math.ceil(2 * S), Math.ceil(2 * S));
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // A waking ring's light: growing as it stirs, full as it dances; pink, the Unseelie's violet.
  addLights(g) {
    const K = this.world.look.lightK || {};
    for (const r of this.near) {
      if (r.state === ASLEEP || !onView(g.cam, r, 120)) continue;
      const key = r.fierce ? 'purple' : 'pink';
      g.light(r.x, r.y - 4, r.state === STIR ? 40 + 30 * r.k : FAE.light, key, K[key] ?? 1);
    }
  }

  // The HUD's arrow (Hud.drawIndicators): [x, y, colour, 'ring'] toward the nearest ring awake within
  // FAE.mark, or null. The one array, reused.
  marker() {
    return this.marked ? this.mark : null;
  }
}

// Whether a ring's circle (and m px more) is within the camera's view.
const onView = (cam, r, m) => r.x + m >= cam.x && r.x - m <= cam.x + cam.W && r.y + m >= cam.y && r.y - m <= cam.y + cam.H;
