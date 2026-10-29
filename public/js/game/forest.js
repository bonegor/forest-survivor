// The Darkwood: an endless night forest, the same in every run. Its map (roads from crossroads
// to crossroads, a shrine at each and a crypt at every second, groves and landmarks between)
// comes from darkwood.js; this turns it into chunks of ground and props, keeps the shrines and
// crypts in play, and lights the night.
//
// Every Survival map's night is spent in one (28 October 2026): the same endless map laid out from
// the map's own world seed (data/maps.js seed) and dressed in its look (game/biomes.js): its ground,
// what stands in each of the Darkwood's places, its light, fog, air and crypt doors. The Darkwood's
// look is the forest as it always was.

import { SPR } from '../engine/sprites.js';
import { makeCanvas, hash2, fbm, rand, lerp, clamp, pick, mulberry32 } from '../engine/util.js';
import { PC, P } from './particles.js';
import { CHUNK as CH, DARKWOOD, TREE_NAMES, setWorld, layoutChunk, paintChunk, shrinesNear, cryptsNear, start, trimCaches } from './darkwood.js';
import { BIOMES, NIGHT, biomeProp } from './biomes.js';
import { LS } from './lighting.js';
import { LANDMARK_SOLIDS, LANDMARK_TALL } from '../art/landmarks.js';
import { FaeCourt } from './fae.js';
import { TERRAIN_SOLIDS } from '../art/terrain.js';
import { makeTopology, SURFACE, HERO_BLOCKED, FOE_SLOWED, TMAX } from './topology/index.js';
import { sampleField, fieldGrad, surfaceOf } from './topology/terrain.js';
import { blobSdf } from './topology/shapes.js';
import { paintTerrain, groundRows } from './topology/paint.js';
import { drawLavaTiles, drawSwirls, drawTells } from './topology/draw.js';

// Half the width of each tree's trunk at its foot (a look's own trees: its `trunks`).
const TRUNK = { oak1: 3.5, oak2: 3.5, oak3: 3.5, pine1: 2.5, pine2: 2.5, deadtree1: 2.5, deadtree2: 2.5 };
// Shrines come into play within this distance of the hero (the next crossroads down each road)
// and leave it beyond the second; one that has been used stays used.
const SHRINE_NEAR = 2400, SHRINE_FAR = 2800;

// Ambient light over the course of the night (survival progress 0..1): the Darkwood's (its look's,
// game/biomes.js, where every look's night is; still exported here, for the sprite tuner).
export { NIGHT };

// What steer() returns: the one pair, filled again by the next call.
const HEADING = [0, 0];
// What fieldAt() returns: the one object, filled again by the next call (read it at once).
const FIELD = { open: TMAX, gx: 0, gy: 0 };
// The eight ways floorNear, landSpot and freeSpot look, a unit step each.
const WAYS = [[1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071], [0, -1], [0.7071, -0.7071]];

// A look's number, or a roll of r between its two (Forest.air).
const roll = (r, v) => (typeof v === 'number' ? v : v[0] + r() * (v[1] - v[0]));

// A crypt building's footprint round its door (x, y): w wide, up deep, its front steps px above
// the door's line.
export const CRYPT_BOX = { w: 24, up: 18, steps: 3 };

export class Forest {
  // look: the map's (game/biomes.js), the Darkwood's without one. o.topology false: the look's
  // ground without its topology (the prologue's road by day, in the Sunscorch's look).
  constructor(g, seed, look = BIOMES.forest, o = {}) {
    this.g = g;
    this.seed = seed;
    this.look = look;
    // A map spent by day (its look's sun: the owner's "only spend the night in the forest, make the
    // desert and snow one be normal bright", 28 October 2026): lit as the road by day is, its ground
    // its daytime one, drawn in the day's order (Game.draw), and still under its weather.
    this.daylight = !!look.sun;
    // The map's own world (data/maps.js seed: its roads, crossroads, groves and landmarks), the
    // Darkwood's 1 without a map. darkwood.js keeps the world it lays out as module state, so every
    // Forest sets it to its own (the Darkwood setting 1 back after a night elsewhere): nothing of one
    // run's world is left for the next.
    const world = g.map?.seed ?? 1;
    if (DARKWOOD.seed !== world) setWorld({ seed: world });
    this.chunks = new Map();
    this.glowPad = null; // where a chunk's cracks' glow is painted full size (generate), made when first wanted
    // The hero's footsteps' dust, the dirt a monster rises from and a charger's dust (enemies.js:
    // null, the forest's own there).
    this.dustColor = look.dust.step;
    this.riseDust = look.dust.rise;
    this.chargeDust = look.dust.charge;
    this.vignette = look.vignette; // Game.draw, by night
    this.flicker = new Set(look.flicker);
    this.fog = makeFogTexture(seed, look.fog.rgb);
    this.windX = 0; // how far the weather's wind has carried the fog (drawOverlay)
    this.ffT = 0;
    this.leafT = 0;
    // A look's own air (look.fx): its emitters' clocks, and dice of its own, so the Darkwood's
    // Math.random draws stay as they were.
    this.fxT = look.fx ? look.fx.map(() => 0) : null;
    this.fxRng = mulberry32((seed ^ 0x1f3a) >>> 0);
    // A map's ground of its own (game/topology, 28 October 2026: the Sunscorch's and the Frostfell's
    // corridors between their mountains and cliffs, the Abyss's islands over lava or the void): laid
    // out from the map's world seed, its gaps from the run's. Null in the Darkwood (its look has none),
    // in Ranked and on the prologue's road, and every use of it below is behind it, so the Darkwood is
    // what it was, pixel for pixel and draw for draw. Its terrain fields are kept per chunk by a
    // number (terrainOf), the last one asked for remembered.
    this.topo = o.topology === false ? null : makeTopology(look, world, g.seed);
    this.terrain = new Map();
    this._tk = NaN;
    this._tc = null;
    this.debrisT = 0;
    this.start = this.topo ? this.topo.start() : start();
    this.mapShrines = true; // the spawner leaves the shrines to the map
    this.usedShrines = new Set();
    this.shrineT = 0;
    // The Bloomvale's fae court (its look's `fae`: game/fae.js). The owner's (28 October 2026):
    // "Meadow, IDK what to do with meadow, you guys figure out something, have some good game design
    // idea how to make meadow not be identical to forest." Since 29 October 2026 it is the hero's
    // own Fae Thread: a sowing's preview fill goes on the ground, the thread and the sown circles
    // over the horde (Game.draw's drawGlow); marker gives no arrow now. Each the court's, on this
    // world alone, after whatever the world draws there itself. No other look has a court, so the
    // Darkwood's world has none of these of its own.
    this.court = look.fae ? new FaeCourt(g, this) : null;
    if (this.court) {
      const court = this.court, ground = this.drawGroundProps, glow = this.drawGlow, mark = this.marker;
      this.drawGroundProps = (ctx, cam, time) => {
        if (ground) ground.call(this, ctx, cam, time);
        court.drawGround(ctx, cam);
      };
      this.drawGlow = (ctx, cam) => {
        if (glow) glow.call(this, ctx, cam);
        court.drawGlow(ctx, cam);
      };
      this.marker = () => court.marker() || (mark ? mark.call(this) : null);
    }
  }

  key(cx, cy) {
    return cx + ',' + cy;
  }

  chunk(cx, cy) {
    const k = this.key(cx, cy);
    let c = this.chunks.get(k);
    if (!c) {
      c = this.generate(cx, cy);
      this.chunks.set(k, c);
    }
    c.used = this.g.frame;
    return c;
  }

  update(dt) {
    const g = this.g, cam = g.cam;
    // A topology that builds its ground ahead of the hero (the Abyss's plates, 29 October 2026) does so
    // for 1.5 ms a frame, so walking never meets a first build all at once.
    if (this.topo?.prewarm) this.topo.prewarm(g.player.x, g.player.y, 1.5);
    // Pre-generate one chunk per frame around the view.
    const x0 = Math.floor((cam.x - 160) / CH), x1 = Math.floor((cam.x + cam.W + 160) / CH);
    const y0 = Math.floor((cam.y - 160) / CH), y1 = Math.floor((cam.y + cam.H + 160) / CH);
    let made = 0;
    for (let cy = y0; cy <= y1 && made < 1; cy++) {
      for (let cx = x0; cx <= x1 && made < 1; cx++) {
        if (!this.chunks.has(this.key(cx, cy))) {
          this.chunk(cx, cy);
          made++;
        }
      }
    }
    if (this.chunks.size > 40) {
      const pcx = Math.floor(g.player.x / CH), pcy = Math.floor(g.player.y / CH);
      for (const [k, c] of this.chunks) {
        if (Math.abs(c.cx - pcx) > 3 || Math.abs(c.cy - pcy) > 3) this.chunks.delete(k);
      }
      trimCaches(g.player.x, g.player.y);
      if (this.topo) this.topo.trim(g.player.x, g.player.y);
    }
    // A topology's terrain fields (each chunk's, asked for by the monsters' pace near the hero too):
    // those more than four chunks from him go once there are more than 90.
    if (this.topo && this.terrain.size > 90) {
      const pcx = Math.floor(g.player.x / CH), pcy = Math.floor(g.player.y / CH);
      for (const [k, t] of this.terrain) if (Math.abs(t.cx - pcx) > 4 || Math.abs(t.cy - pcy) > 4) this.terrain.delete(k);
      this._tk = NaN;
      this._tc = null;
    }
    this.shrineT -= dt;
    if (this.shrineT <= 0) {
      this.shrineT = 0.5;
      this.syncShrines();
    }
    // The Bloomvale's Fae Thread at the hero's feet (game/fae.js), on the night's clock.
    if (this.court) this.court.update(dt);
    // Another look's air (its embers, snow, petals...), and its fog carried by the wind.
    if (this.look.fx) {
      this.air(dt);
      return;
    }
    // Fireflies and falling leaves: the fireflies hide from the rain (weather.js). The same draws
    // of Math.random whatever the weather.
    const wet = g.weather ? g.weather.now.rain : 0;
    this.ffT -= dt;
    while (this.ffT <= 0) {
      this.ffT += 0.12;
      const x = cam.x + rand(-20, cam.W + 20), y = cam.y + rand(-20, cam.H + 20);
      if (wet > 0 && g.weather.rng() < wet * 0.85 && g.weather.shown) continue; // drawn all the same: only rain that is seen hides them
      g.particles.emit(x, y, rand(4, 20), rand(-8, 8), rand(-8, 8), rand(-3, 3), rand(2, 4), 1, Math.random() < 0.7 ? PC.l : PC.Y, P.GLOW | P.FADE, 0.2);
    }
    this.leafT -= dt;
    if (this.leafT <= 0) {
      this.leafT = rand(0.3, 0.8);
      const x = cam.x + rand(0, cam.W), y = cam.y + rand(-10, cam.H * 0.6);
      g.particles.emit(x, y, 60, rand(10, 25), rand(5, 15), -18, 3.2, 1, pick([PC.d, PC.O, PC.b, PC.y]), P.FADE, 0.1);
    }
  }

  // A look's air in place of the fireflies and leaves (biomes.js fx): each emitter's motes over the
  // view, or falling from above it, on dice of the look's own; some hide where rain is seen, as the
  // fireflies do, and the weather's wind carries what it may, and the fog.
  air(dt) {
    const g = this.g, cam = g.cam, r = this.fxRng, fx = this.look.fx, w = g.weather;
    const seen = !!w && w.shown, wet = seen ? w.now.rain || 0 : 0, wind = seen ? w.now.wind || 0 : 0;
    if (this.look.fog.wind) this.windX += dt * wind * this.look.fog.wind;
    for (let i = 0; i < fx.length; i++) {
      const e = fx[i];
      this.fxT[i] -= dt;
      while (this.fxT[i] <= 0) {
        this.fxT[i] += Math.max(0.01, roll(r, e.every));
        if (e.rain && wet > 0 && r() < wet * 0.85) continue;
        const sky = e.at === 'sky';
        const x = sky ? cam.x + r() * cam.W : cam.x - 20 + r() * (cam.W + 40);
        const y = sky ? cam.y - 10 + r() * (cam.H * 0.6 + 10) : cam.y - 20 + r() * (cam.H + 40);
        g.particles.emit(x, y, roll(r, e.z), roll(r, e.vx) + wind * (e.wind || 0), roll(r, e.vy), roll(r, e.vz), roll(r, e.life), e.size, e.colors[Math.floor(r() * e.colors.length)], e.flags, e.drag || 0);
      }
    }
    // The void's depth (the Abyss's, game/topology, 28 October 2026): now and then a faint speck of
    // ash sinking away into the dark, where the fall is deep, on the look's own dice.
    if (this.topo && this.topo.variant === 'void') {
      this.debrisT -= dt;
      while (this.debrisT <= 0) {
        this.debrisT += 0.12;
        const x = cam.x + r() * cam.W, y = cam.y + r() * cam.H;
        if (this.surfaceAt(x, y) !== SURFACE.GAP || this.openAt(x, y) >= -24) continue;
        g.particles.emit(x, y, 0, (r() - 0.5) * 6, 10 + r() * 14, -4, 1.5 + r() * 1.3, 1, [PC.a, PC.A, PC.W][Math.floor(r() * 3)], P.FADE | P.SHRINK, 0);
      }
    }
  }

  // The shrines at the crossroads near the hero join the game's own list; far ones leave it.
  // A topology's (the Sunscorch's, the Frostfell's, the Abyss's) places are its own; a corridor's
  // crypts, two minutes' walk apart, come into play from farther (topo.cryptRange).
  syncShrines() {
    const g = this.g, p = g.player, have = new Set(), T = this.topo;
    for (let i = g.shrines.length - 1; i >= 0; i--) {
      const s = g.shrines[i];
      if (!s.key) continue;
      if (s.used) this.usedShrines.add(s.key);
      if (Math.hypot(s.x - p.x, s.y - p.y) > SHRINE_FAR) g.shrines.splice(i, 1);
      else have.add(s.key);
    }
    for (const s of T ? T.shrinesNear(p.x, p.y, SHRINE_NEAR) : shrinesNear(p.x, p.y, SHRINE_NEAR)) {
      if (have.has(s.key)) continue;
      g.shrines.push({ x: s.x, y: s.y, type: s.type, used: this.usedShrines.has(s.key), t: hash2(Math.round(s.x), Math.round(s.y), 7) * 6, spr: SPR.shrine, shrine: true, key: s.key });
    }
    // Crypt doors the same way; the game remembers which ones it has cleared, and which the
    // hero fainted in (both shut for good). Each in its look's stone (look.crypt.door, the same
    // 26 x 29 frames: every look's is drawn), the Darkwood's mausoleum should one be missing.
    const doors = new Set(), near = T ? T.cryptRange.near : SHRINE_NEAR, far = T ? T.cryptRange.far : SHRINE_FAR;
    for (let i = g.crypts.length - 1; i >= 0; i--) {
      const d = g.crypts[i];
      if (Math.hypot(d.x - p.x, d.y - p.y) > far) g.crypts.splice(i, 1);
      else doors.add(d.key);
    }
    const door = SPR[this.look.crypt.door] || SPR.crypt;
    for (const d of T ? T.cryptsNear(p.x, p.y, near) : cryptsNear(p.x, p.y, near)) {
      if (!doors.has(d.key)) g.crypts.push({ ...d, sealed: g.cleared.has(d.key) || g.lost.has(d.key), t: hash2(d.x, d.y, 9) * 6, spr: door, crypt: true });
    }
  }

  layout(cx, cy) {
    return layoutChunk(cx, cy, null, this.look.density, this.topo);
  }

  generate(cx, cy) {
    const c = makeCanvas(CH, CH);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(CH, CH);
    const lay = this.layout(cx, cy), look = this.look;
    // The look's ground, unless the layout brought its own (the prologue's road by day; a layout
    // that only says it is daylit keeps the Darkwood's day palettes, darkwood.js).
    if (!lay.ground && !lay.daylight) lay.ground = look.sun ? look.day || look.ground : look.ground;
    // A look whose cracks glow paints their glow apart: the light they give the night (addLights).
    // Kept at the light map's grain (lighting.js LS, 2 world px a texel), all the light map ever
    // takes of it: painted full size on the Forest's one pad, cleared for each chunk, then drawn down
    // to half once, smoothly, which averages each 2 x 2 as the light map did when it took the full
    // glow every frame. The same light, from a quarter of the pixels kept a chunk, nothing made and
    // thrown away a chunk, and nothing filtered a frame (render lays it on pixel for pixel).
    let glow = null;
    // A topology's terrain over the chunk (its mountains, gaps, patches and decks), painted over the
    // ground below; the lava's glow goes on the pad with the cracks'.
    const tc = this.topo ? this.terrainOf(cx, cy) : null;
    // Headless, the layout (trees, props, colliders) is all that matters.
    if (!this.g.headless) {
      let pad = null;
      if (lay.ground?.cracks || tc?.lava) {
        if (!this.glowPad) {
          const pc = makeCanvas(CH, CH), pg = pc.getContext('2d'), pimg = pg.createImageData(CH, CH);
          this.glowPad = { c: pc, g: pg, img: pimg, px: new Uint32Array(pimg.data.buffer) };
        }
        pad = this.glowPad;
        pad.px.fill(0);
      }
      const px32 = new Uint32Array(img.data.buffer);
      // (No ground under what the terrain paints over whole: the Sunscorch's ranges.)
      paintChunk(lay, px32, pad && pad.px, groundRows(tc, look, this.topo));
      if (tc && tc.any) paintTerrain(tc, px32, pad && pad.px, look, this.topo);
      if (this.court) this.court.paintInto(px32, cx, cy, tc);
      ctx.putImageData(img, 0, 0);
      if (pad) {
        pad.g.putImageData(pad.img, 0, 0);
        glow = makeCanvas(CH / LS, CH / LS);
        glow.getContext('2d').drawImage(pad.c, 0, 0, CH / LS, CH / LS);
      }
    }
    const props = [], trunks = [];
    for (const q0 of lay.props) {
      // What stands in the slot on this look (biomes.js biomeProp): in the Darkwood, the slot's own.
      const q = look.props ? biomeProp(look, q0, lay) : q0;
      if (!q) continue;
      const spr = SPR[q.n];
      if (!spr) continue;
      // A tree by its slot: whatever stands in a tree's place (a saguaro in an oak's) stops the hero
      // at its trunk, fades while he is behind it and is a tree to the Druid; as tall a landmark too,
      // and one of the look's trees standing in a tall landmark's place (the Bloomvale's vine-wrapped
      // trees for the graveyards' skull trees) is a tree with its trunk.
      const tree = TREE_NAMES.has(q0.n), tall = LANDMARK_TALL.has(q0.n) || LANDMARK_TALL.has(q.n);
      const trunk = tree ? (look.trunks?.[q.n] ?? TRUNK[q.n] ?? TRUNK[q0.n]) : (tall && look.trunks?.[q.n]) || 0;
      const p = { spr, x: q.x, y: q.y, frame: 0, anim: q.anim || 0, light: q.light || null, tree: tree || tall, t: hash2(q.x, q.y, 11) * 10, solid: 0, trunk };
      props.push(p);
      if (p.trunk) trunks.push(p);
      // A landmark's solid parts (its posts, its stone) stop the hero as trunks do; so do a topology's
      // rocks, bones and bridge posts (art/terrain.js).
      for (const [dx, dy, r] of LANDMARK_SOLIDS[q.n] || TERRAIN_SOLIDS[q.n] || []) trunks.push({ x: q.x + dx, y: q.y + dy, trunk: r });
    }
    return { cx, cy, canvas: c, glow, props, trunks, used: 0, terrain: tc };
  }

  forEachVisible(cam, margin, fn) {
    const x0 = Math.floor((cam.x - margin) / CH), x1 = Math.floor((cam.x + cam.W + margin) / CH);
    const y0 = Math.floor((cam.y - margin) / CH), y1 = Math.floor((cam.y + cam.H + margin) / CH);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) fn(this.chunk(cx, cy));
  }

  drawGround(ctx, cam) {
    const S = cam.S;
    this.forEachVisible(cam, 0, (c) => {
      const x0 = Math.round((c.cx * CH - cam.x) * S), x1 = Math.round(((c.cx + 1) * CH - cam.x) * S);
      const y0 = Math.round((c.cy * CH - cam.y) * S), y1 = Math.round(((c.cy + 1) * CH - cam.y) * S);
      ctx.drawImage(c.canvas, x0, y0, x1 - x0, y1 - y0);
    });
  }

  // Adds y-sortable props within view to `list`.
  collectProps(cam, list) {
    this.forEachVisible(cam, 60, (c) => {
      for (const p of c.props) {
        const w = p.spr.w, h = p.spr.h;
        if (p.x + w < cam.x || p.x - w > cam.x + cam.W || p.y - h > cam.y + cam.H || p.y < cam.y - 8) continue;
        list.push(p);
      }
    });
    // The moonblooms on a fae-sown circle's rim (the Bloomvale's: game/fae.js), props as the rest.
    if (this.court) this.court.collect(cam, list);
  }

  drawProp(ctx, cam, p, time) {
    const S = cam.S;
    const fr = p.anim ? p.spr.frames[Math.floor(time * p.anim + p.t) % p.spr.frames.length] : p.spr.frames[0];
    const img = fr.c;
    const w = img.width * S, h = img.height * S;
    const X = Math.round((p.x - cam.x) * S - w / 2), Y = Math.round((p.y - cam.y) * S - h + S);
    let alpha = 1;
    if (p.tree) {
      // Fade canopies that hide the hero.
      const pl = this.g.player;
      if (pl.y < p.y - 2 && pl.y > p.y - img.height + 4 && Math.abs(pl.x - p.x) < img.width / 2) alpha = 0.45;
    }
    if (alpha < 1) ctx.globalAlpha = alpha;
    ctx.drawImage(img, X, Y, w, h);
    if (alpha < 1) ctx.globalAlpha = 1;
    // Where it was drawn (drawPropEmissive, the night's cut: enemies.js nightCut), in one array a prop
    // filled again each frame, so no prop allocates a frame: the trees, nor the Bloomvale's moonblooms
    // (game/fae.js collect; 28 October 2026).
    const r = p._rect || (p._rect = [0, 0, 0, 0, null]);
    r[0] = X;
    r[1] = Y;
    r[2] = w;
    r[3] = h;
    r[4] = fr;
  }

  drawPropEmissive(ctx, p) {
    if (!p._rect) return;
    const [X, Y, w, h, fr] = p._rect;
    if (fr.em) ctx.drawImage(fr.em, X, Y, w, h);
  }

  // The props' lights: a fire's (and a look's embers', look.flicker) flickering, each key as bright
  // as its look burns it (look.lightK: the Darkwood's glowing mushrooms and stones at 0.55). A look
  // whose cracks glow (the Abyss's) lights the night along them too, pulsing (lighting.js glow): what
  // stands over a crack is lit by it, not painted over.
  addLights(g) {
    const t = g.time, flicker = this.flicker, K = this.look.lightK, CK = this.look.ground.cracks;
    // The lava's glow (a topology's: game/topology) lights the night through the same pad, at the
    // cracks' alpha where the look's ground cracks, else its own.
    const LV = !CK && this.topo && this.look.terrain?.lava;
    const hot = CK ? CK.alpha + CK.pulse * Math.sin(g.clock * 1.7) : LV ? LV.alpha + LV.pulse * Math.sin(g.clock * 1.7) : 0;
    this.forEachVisible(g.cam, 120, (c) => {
      for (const p of c.props) {
        if (!p.light) continue;
        const flick = flicker.has(p.light[0]) ? 0.85 + 0.15 * Math.sin(t * 13 + p.t) * Math.sin(t * 7.3 + p.t * 2) : 1;
        g.light(p.x, p.y - 6, p.light[1] * flick, p.light[0], K[p.light[0]] ?? 1);
      }
      if (c.glow) g.lighting.glow(c.glow, c.cx * CH, c.cy * CH, CH, CH, hot);
    });
    // A fae-sown circle's light (the Bloomvale's: game/fae.js).
    if (this.court) this.court.addLights(g);
  }

  // The night's light (its look's, the Darkwood's NIGHT): deepening, under the weather, and
  // brought to its dawn's by the sunrise.
  ambient() {
    const g = this.g, night = this.look.night, dawn = this.look.dawn, sun = this.look.sun;
    // A map spent by day stands in its sun the day long, under its weather.
    if (sun) {
      const s = g.weather ? g.weather.tint(sun) : sun; // tint hands back the sun itself when unseen
      let c = [s[0], s[1], s[2]];
      if (g.dawn > 0) {
        const d = clamp(g.dawn, 0, 1);
        c = [lerp(c[0], dawn[0], d), lerp(c[1], dawn[1], d), lerp(c[2], dawn[2], d)];
      }
      return c;
    }
    // Ranked has no dawn: the night deepens over 12 minutes and stays.
    const u = g.mode === 'ranked' ? clamp(g.time / 900, 0, 0.86) : clamp(g.time / g.duration, 0, 1);
    let i = 0;
    while (i < night.length - 2 && night[i + 1][0] < u) i++;
    const [t0, c0] = night[i], [t1, c1] = night[i + 1];
    const k = clamp((u - t0) / (t1 - t0), 0, 1);
    let c = [lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k)];
    if (g.mode === 'ranked' && g.phase > 30) {
      // A blood moon rises as the endless night turns lethal.
      const r = clamp((g.phase - 30) / 15, 0, 1) * 0.45;
      c = [lerp(c[0], 170, r), lerp(c[1], 70, r), lerp(c[2], 90, r)];
    }
    if (g.weather) c = g.weather.tint(c);
    if (g.dawn > 0) {
      const d = clamp(g.dawn, 0, 1);
      c = [lerp(c[0], dawn[0], d), lerp(c[1], dawn[1], d), lerp(c[2], dawn[2], d)];
    }
    return c;
  }

  drawOverlay(ctx, cam, time) {
    const F = this.look.fog, w = this.g.weather;
    // Two drifting fog layers, drifting east as the leaves fall: a look's thicker in its weather's
    // haze, and carried further by its wind (Forest.air), while the weather is seen.
    const S = cam.S;
    const fog = this.fog;
    const scale = S * 3;
    const tw = fog.width * scale, th = fog.height * scale;
    const haze = F.haze && w && w.shown ? 1 + (w.now.haze || 0) * F.haze : 1;
    for (let layer = 0; layer < 2; layer++) {
      const drift = time * (layer ? F.drift[1] : F.drift[0]) + this.windX * (layer ? 1.3 : 1);
      const ox = -((((cam.x * (layer ? 1.15 : 0.85) - drift) * S) % tw + tw) % tw) - tw;
      const oy = -(((cam.y * (layer ? 1.15 : 0.85) + time * (layer ? F.rise[1] : F.rise[0])) * S) % th) - th;
      ctx.globalAlpha = (layer ? F.alpha[1] : F.alpha[0]) * haze;
      for (let y = oy; y < cam.pxH; y += th) for (let x = ox; x < cam.pxW; x += tw) ctx.drawImage(fog, x, y, tw, th);
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------- world interface --

  solid() {
    return false;
  }

  // Tree trunks stop the hero, who slides around them. Monsters and minions walk straight
  // through, so the horde never snags on the woods (the user's rule: monsters bump into
  // nothing). A trunk is a squat ellipse at the foot of its tree, as the ground is seen at an
  // angle.
  // On a topology's ground (game/topology, 28 October 2026) the mountains, cliffs, water, lava and
  // the void hold him too (holdOut), before the crypts and trunks and again after them, so a trunk's
  // nudge never leaves him over a gap.
  collide(e) {
    const T = this.topo;
    if (e !== this.g.player) {
      // The Gilded Thief, fleeing, is held by them as the hero is (never by a trunk): the owner's rule
      // that he can always be caught (enemies.js walled). Every other monster crosses everything.
      if (T && e.def && e.def.ai === 'flee') this.holdOut(e);
      return;
    }
    if (T) this.holdOut(e);
    // A crypt's walls: only its steps, below its door, can be stood on (Game's door check).
    for (const d of this.g.crypts) {
      const dx = e.x - d.x, dy = e.y - (d.y - CRYPT_BOX.up / 2 - CRYPT_BOX.steps);
      const px = CRYPT_BOX.w / 2 + 3 - Math.abs(dx), py = CRYPT_BOX.up / 2 - Math.abs(dy);
      if (px <= 0 || py <= 0) continue;
      if (px < py) e.x += Math.sign(dx || 1) * px;
      else e.y += Math.sign(dy || 1) * py;
    }
    this.trunksNear(e.x, e.y, (p) => {
      const rx = p.trunk + (e.r || 5), ry = rx * 0.65;
      // In units where the ellipse is a circle of radius rx.
      const dx = e.x - p.x, dy = ((e.y - p.y) * rx) / ry;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rx * rx) return;
      const d = Math.sqrt(d2);
      const nx = d > 1e-3 ? dx / d : 0, ny = d > 1e-3 ? dy / d : 1;
      // Walking dead straight at the trunk: creep round it rather than stick
      // forever, to the side the hero leans to (in front of the tree when dead on).
      const vx = e.vx || 0, vy = ((e.vy || 0) * rx) / ry, v = Math.hypot(vx, vy);
      const along = nx * vy - ny * vx;
      const side = Math.abs(along) > 0.02 * v ? Math.sign(along) : nx < 0 ? -1 : 1;
      const slip = v > 1 && nx * vx + ny * vy < -0.99 * v ? 0.03 * side : 0;
      const tx = nx - ny * slip, ty = ny + nx * slip, tl = Math.hypot(tx, ty);
      e.x = p.x + (tx / tl) * rx;
      e.y = p.y + ((ty / tl) * rx * ry) / rx;
    });
    if (T) this.holdOut(e);
  }

  // Whether a body of radius r could stand at (x, y): off every trunk and landmark post (as
  // collide shapes them) and out of every crypt's walls. What a leap tests its way by (weapons.js LEAP).
  // On a topology's ground, on land too: a leap stops at a gap's edge, never across it.
  open(x, y, r = 5) {
    if (this.topo && this.fieldAt(x, y).open < r) return false;
    for (const d of this.g.crypts) {
      const dx = x - d.x, dy = y - (d.y - CRYPT_BOX.up / 2 - CRYPT_BOX.steps);
      if (Math.abs(dx) < CRYPT_BOX.w / 2 + 3 && Math.abs(dy) < CRYPT_BOX.up / 2) return false;
    }
    let free = true;
    this.trunksNear(x, y, (t) => {
      const rx = t.trunk + r, ry = rx * 0.65;
      if ((x - t.x) ** 2 + (((y - t.y) * rx) / ry) ** 2 < rx * rx) free = false;
    });
    return free;
  }

  // Whether a tree stands within R px of (x, y) (the Druid's Grove Warden): a tree's foot, not a
  // landmark's post.
  treeNear(x, y, R) {
    let near = false;
    this.trunksNear(x, y, (t) => {
      if (t.spr && (x - t.x) ** 2 + (y - t.y) ** 2 <= R * R) near = true;
    }, R);
    return near;
  }

  // fn(trunk) for every trunk and landmark post in the chunks within m px of (x, y). 36 px round
  // by default: a landmark's posts may stand up to 24 px from the foot that places it in its chunk.
  trunksNear(x, y, fn, m = 36) {
    const x0 = Math.floor((x - m) / CH), x1 = Math.floor((x + m) / CH);
    const y0 = Math.floor((y - m) / CH), y1 = Math.floor((y + m) / CH);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) for (const t of this.chunk(cx, cy).trunks) fn(t);
  }

  lineOfSight() {
    return true;
  }

  // Monster e's heading toward target, [dx, dy], straight at it out here. The returned pair is
  // reused by the next call: read it at once, don't keep it.
  steer(e, target) {
    const dx = target.x - e.x, dy = target.y - e.y;
    const l = Math.hypot(dx, dy) || 1;
    HEADING[0] = dx / l;
    HEADING[1] = dy / l;
    return HEADING;
  }

  // Where something sent near (x, y) comes in (a ring, a pack, a summons, a boss's blink, a minion
  // called back, the Druid's mushrooms): there. On a topology's ground, the nearest land within 96 px
  // (8 ways, 16 px a step), else there all the same: monsters cross the gaps, and nothing an event
  // counts on is lost.
  freeSpot(x, y) {
    if (!this.topo) return { x, y };
    return this.seek(x, y, 16, 96, 16, 8, false) || { x, y };
  }

  // Where the horde comes in, at the view's edge (edgePoint). On a topology's ground, up to three more
  // tries for one on land; one still in the rock or over the void crosses on foot. The Darkwood's: the
  // one call, its very draws of Math.random.
  spawnPoint(g, margin = 22) {
    let pt = this.edgePoint(g, margin);
    if (!this.topo) return pt;
    for (let k = 0; k < 3 && !this.free(pt.x, pt.y); k++) pt = this.edgePoint(g, margin);
    return pt;
  }

  edgePoint(g, margin = 22) {
    const cam = g.cam, p = g.player;
    const x0 = cam.x - margin, y0 = cam.y - margin, w = cam.W + margin * 2, h = cam.H + margin * 2;
    // Favour the direction of travel a little.
    if (Math.hypot(p.vx, p.vy) > 20 && Math.random() < 0.35) {
      const a = Math.atan2(p.vy, p.vx) + rand(-0.8, 0.8);
      const R = Math.hypot(w, h) / 2;
      return { x: p.x + Math.cos(a) * R, y: p.y + Math.sin(a) * R };
    }
    let t = rand(2 * (w + h));
    if (t < w) return { x: x0 + t, y: y0 };
    t -= w;
    if (t < h) return { x: x0 + w, y: y0 + t };
    t -= h;
    if (t < w) return { x: x0 + w - t, y: y0 + h };
    t -= w;
    return { x: x0, y: y0 + h - t };
  }

  // Enemies left far behind: the steady horde's are let go, what was sent at the hero is moved
  // back into play (Game.relocate).
  tooFar(e, cam) {
    const p = this.g.player;
    const lim = Math.max(cam.W, cam.H) * 0.85;
    return Math.abs(e.x - p.x) > lim || Math.abs(e.y - p.y) > lim;
  }

  // ------------------------------------------- a topology's ground (game/topology) --
  // The Sunscorch's mountains, the Frostfell's cliffs and ice, the Abyss's lava or void and bridges
  // (28 October 2026). Every query reads the chunk's terrain fields (topology/terrain.js), so what is
  // drawn, what holds the hero and what each asks agree; none makes anything per call, and without a
  // topology each answers the Darkwood's at once.

  // The terrain fields of chunk (cx, cy), made on first asking and kept by a number; null without.
  terrainOf(cx, cy) {
    if (!this.topo) return null;
    const k = (cx + 32768) * 65536 + (cy + 32768);
    if (k === this._tk) return this._tc;
    let t = this.terrain.get(k);
    if (!t) {
      t = this.topo.terrain(cx, cy);
      this.terrain.set(k, t);
    }
    this._tk = k;
    this._tc = t;
    return t;
  }
  // What the ground is at (x, y) (topology/index.js SURFACE): GROUND without a topology.
  surfaceAt(x, y) {
    if (!this.topo) return SURFACE.GROUND;
    return surfaceOf(this.terrainOf(Math.floor(x / CH), Math.floor(y / CH)), x, y, this.topo.axis);
  }
  // Px to the nearest wall or gap's edge (+ on land) and its gradient: the one object, filled again
  // by the next call. TMAX and flat without a topology.
  fieldAt(x, y) {
    if (!this.topo) {
      FIELD.open = TMAX;
      FIELD.gx = FIELD.gy = 0;
      return FIELD;
    }
    return fieldGrad(this.terrainOf(Math.floor(x / CH), Math.floor(y / CH)), x, y, FIELD);
  }
  openAt(x, y) {
    return this.fieldAt(x, y).open;
  }
  // The quicksand pool or ice sheet under (x, y) ({ key, kind, x, y, r, ... }), or null.
  patchAt(x, y) {
    if (!this.topo) return null;
    const tc = this.terrainOf(Math.floor(x / CH), Math.floor(y / CH));
    for (const p of tc.patches) if (blobSdf(p, x, y, 16) > 0) return p;
    return null;
  }
  // Signed px into a quicksand pool or ice sheet at (x, y) (+ inside): -TMAX without one.
  patchDepth(x, y) {
    if (!this.topo) return -TMAX;
    const tc = this.terrainOf(Math.floor(x / CH), Math.floor(y / CH));
    return sampleField(tc, tc.patch, x, y, -TMAX);
  }
  // Whether the hero could stand at (x, y): every caller's `!w.free || w.free(...)` reads the same as
  // without it in the Darkwood.
  free(x, y) {
    return !this.topo || !HERO_BLOCKED[this.surfaceAt(x, y)];
  }
  // The first point on land from (x, y) outward (itself first), `need` px from any edge, 8 ways on
  // rings from r0 to r1 every `step` px; off the patches too when `dry`. Null when there is none.
  seek(x, y, r0, r1, step, need, dry) {
    const ok = (a, b) => this.fieldAt(a, b).open >= need && (!dry || this.patchDepth(a, b) <= -4);
    if (ok(x, y)) return { x, y };
    for (let r = r0; r <= r1; r += step) {
      for (const [ux, uy] of WAYS) if (ok(x + ux * r, y + uy * r)) return { x: x + ux * r, y: y + uy * r };
    }
    return null;
  }
  // The land nearest (x, y), where what fell there is carried (Game.addPickup, a boss's loot): the
  // point if the hero could stand there, else 8 ways out to 640 px; failing that, the middle of the
  // nearest island or the road where it runs. A new { x, y } without a topology.
  floorNear(x, y) {
    if (!this.topo || this.free(x, y)) return { x, y };
    const s = this.seek(x, y, 8, 640, 8, 8, false);
    if (s) return s;
    const T = this.topo;
    if (T.home) return T.home(x, y); // the Abyss's fault plates (29 October 2026): the nearest node's dry heart
    if (T.kind === 'islands') {
      const I = T.island(Math.round(x / T.T.spacing), Math.round(y / T.T.spacing));
      return { x: I.x, y: I.y };
    }
    const u = T.U(x, y), v = T.road(u);
    return { x: T.X(u, v), y: T.Y(u, v) };
  }
  // The nearest dry land within R px of (x, y) (8 ways, 16 px a step): where something that must
  // stand on land is put (a box of loot, the thief), or null. (x, y) itself without a topology.
  // In a corridor, none found there, it is looked for again straight across from it, 24 px in from
  // the nearer face: the Sunscorch's band, narrower than the screen since 29 October 2026, leaves a
  // box sent 190-260 px from the hero (Spawner.spawnProps) deep in the rock now and then (about one
  // in 13 round a hero standing still), and it comes down on the sand still that far along the way.
  // Only what found no land before is moved. The Frostfell, narrowed to about 520 px the same day
  // (biomes/frozen.js), has its boxes and thief brought onto the snow across its band the same way.
  landSpot(x, y, R = 160) {
    if (!this.topo) return { x, y };
    const s = this.seek(x, y, 16, R, 16, 8, true), T = this.topo;
    if (s || T.kind !== 'corridor') return s;
    const u = T.U(x, y), v = clamp(T.V(x, y), T.lo(u) + 24, T.hi(u) - 24);
    return this.seek(T.X(u, v), T.Y(u, v), 16, R, 16, 8, true);
  }
  // Whether a walking monster at (x, y) goes at the slower pace of one crossing the rock, the lava or
  // the void (enemies.js WALL_PACE). Never in the Darkwood, nor more than 800 px from the hero (its
  // chunk is never made for that, and its pace off screen doesn't matter).
  slows(x, y) {
    if (!this.topo || this.topo.still) return false;
    const p = this.g.player;
    if (Math.abs(x - p.x) > 800 || Math.abs(y - p.y) > 800) return false;
    return FOE_SLOWED[this.surfaceAt(x, y)] === 1;
  }
  // Pushes e out of the walls and gaps along the field, onto open >= its radius: at most twice. Deep
  // in the rock (where the field lies flat at -TMAX) he is brought to the nearest land.
  holdOut(e) {
    const r = e.r || 5;
    for (let k = 0; k < 2; k++) {
      const f = this.fieldAt(e.x, e.y);
      if (f.open >= r) return;
      const l = Math.hypot(f.gx, f.gy), push = r - f.open;
      if (l < 1e-4) {
        const s = this.floorNear(e.x, e.y);
        e.x = s.x;
        e.y = s.y;
        return;
      }
      e.x += (f.gx / l) * push;
      e.y += (f.gy / l) * push;
    }
  }
  // What moves in the ground, under everything (Game.draw): the lava's 32 px tiles turning (the
  // crypts' baked lava), and over each quicksand pool its sinking swirl. Nothing without a topology,
  // not a call on the context.
  drawGroundProps(ctx, cam, time) {
    if (!this.topo) return;
    const stamp = (this._swirlN = (this._swirlN || 0) + 1);
    this.forEachVisible(cam, 0, (c) => {
      const tc = c.terrain;
      if (!tc) return;
      if (tc.lavaTiles) drawLavaTiles(ctx, cam, time, tc);
      for (const p of tc.patches) {
        if (p.kind !== 'quicksand' || p._swirl === stamp) continue;
        p._swirl = stamp;
        drawSwirls(ctx, cam, time, p);
      }
    });
  }
  // The tells over the horde (Game.draw, after the actors): every quicksand pool and ice sheet within
  // 160 px of the hero outlined, so none is ever hidden under the horde's feet (REQS2: readable).
  drawTerrainTells(ctx, cam) {
    if (!this.topo || !this.topo.patchKind) return;
    const p = this.g.player, pcx = Math.floor(p.x / CH), pcy = Math.floor(p.y / CH), tell = this.look.terrain?.tell || {};
    const stamp = (this._tellN = (this._tellN || 0) + 1);
    for (let cy = pcy - 1; cy <= pcy + 1; cy++) {
      for (let cx = pcx - 1; cx <= pcx + 1; cx++) {
        for (const q of this.terrainOf(cx, cy).patches) {
          if (q._tell === stamp) continue;
          q._tell = stamp;
          if (Math.hypot(q.x - p.x, q.y - p.y) - q.ext > 160) continue;
          drawTells(ctx, cam, q, tell[q.kind] || '#ffffff');
        }
      }
    }
  }
}

// The fog's tile, in its look's colour (the Darkwood's a pale blue, 200, 210, 240).
function makeFogTexture(seed, rgb) {
  const N = 96;
  const c = makeCanvas(N, N);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // Tileable: blend noise sampled at wrapped coordinates.
      const u = x / N, v = y / N;
      const n = (a, b) => fbm(a * 6, b * 6, seed + 500, 3);
      const val = n(u, v) * (1 - u) * (1 - v) + n(u - 1, v) * u * (1 - v) + n(u, v - 1) * (1 - u) * v + n(u - 1, v - 1) * u * v;
      const a = clamp((val - 0.42) * 3, 0, 1);
      const i = (y * N + x) * 4;
      img.data[i] = rgb[0];
      img.data[i + 1] = rgb[1];
      img.data[i + 2] = rgb[2];
      img.data[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
