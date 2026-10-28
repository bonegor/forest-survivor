// Before and after, for the owner to pick by eye (28 October 2026): each weapon effect the VFX bake
// would change (tools/vfx/picks.mjs), as the game draws it now and as it would with the baked
// sprite, frame by frame at the same moments, at the world's scale on a 1080p screen (3.2 device
// px an art px), on the Darkwood's ground by night and the Sunscorch's sand by day:
//   node tools/vfx/compare.mjs [pick ...] [--out=tools/out/vfx-compare] [--scale=3.2]
// One PNG a pick: for each case of it, four rows (now and baked, by night; now and baked, by day),
// eight frames across, their times above.
// Both run the game's own classes (effects.js, weapons-light.js, fxart.js) against a stand-in game
// (no foes, the particles real, Math.random seeded as tools/headless.mjs seeds it) on a software
// canvas (softcanvas.mjs), drawn as Game.render draws: the ground, the effects' ground, their draw
// and the particles, the night's light map multiplied over that (the look's ambient light and
// every light the effects shed), then their glow pass added. "Now" is the game with the baked
// effects off (fxart.js setVfx: each weapon draws its own art, as before them), "baked" the game as
// it plays them (effects.js, weapons-light.js, projectiles.js, Game.startUlt; 28 October 2026).
import { installSoftCanvas, SoftCanvas } from './softcanvas.mjs';
installSoftCanvas();
const { mkdirSync } = await import('node:fs');
const { join, resolve } = await import('node:path');
const { ART } = await import('../../public/js/art/defs.js');
const { SPR, buildSprite } = await import('../../public/js/engine/sprites.js');
const { mulberry32 } = await import('../../public/js/engine/util.js');
const { Particles, PC, P } = await import('../../public/js/game/particles.js');
const FX = await import('../../public/js/game/effects.js');
const { Star } = await import('../../public/js/game/weapons-light.js');
const { vfxBurst, setVfx } = await import('../../public/js/game/fxart.js');
const { LIGHT_COLORS } = await import('../../public/js/game/lighting.js');
const { GLYPHS } = await import('../../public/js/engine/fontdata.js');
const { writePng } = await import('../png.mjs');
const { hexPack } = await import('../../public/js/engine/pixels.js');

const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const only = args.filter((a) => !a.startsWith('--'));
const OUT = resolve(opt('out', 'tools/out/vfx-compare'));
const SCALE = Number(opt('scale', 3.2));
mkdirSync(OUT, { recursive: true });

for (const name of ['meteor', 'knight']) SPR[name] = buildSprite(name, ART[name]);

// ------------------------------------------------------------- the game --

// The two grounds: the Darkwood's floor at the depth of its night, the Sunscorch's sand in its sun.
const GROUNDS = {
  night: { tones: ['#193c3e', '#265c42', '#265c42', '#3e8948'], ambient: [110, 114, 166] },
  day: { tones: ['#9e8c60', '#d2c393', '#d2c393', '#ead4aa'], ambient: [255, 248, 230], daylight: true },
};

// Each stand-in game's clock starts far past the last one's, so the burst caps (fxart.js) count
// none of an earlier run's bursts against this one.
let epoch = 0;
function stand(day) {
  const lights = [];
  const g = {
    clock: (epoch += 100), time: 0, effects: [], particles: new Particles(), lights,
    player: { x: 0, y: 0, area: 1, dead: false, swing() {} },
    grid: { foes: () => [] },
    world: { daylight: day, throughWalls: false, solid: () => false },
    settings: {},
    light: (x, y, r, key, k = 1) => lights.push({ x, y, r, key, k }),
    hitEnemy: () => 0, addDecal() {}, shake() {}, nearestEnemies: () => [], enemiesOnScreen: () => [],
  };
  return g;
}
const weapon = (s) => ({ s: { area: 1, dmg: 10, kb: 1, brand: 1, ...s }, src: 'cmp' });

// ----------------------------------------------------------------- cases --

// Each case: a panel (w, h art px round the world point cx, cy), the moments shown (seconds from
// the start), and what starts it, as the game starts it. Both rows run the game's own code: "now"
// with the baked effects off (fxart.js setVfx), every weapon drawing its own art as it did before
// them; "baked" with them on, as the game plays them (the wiring of 28 October 2026, the critic's
// changes in). hero: the Knight stands at (0, 0), his light with him.
const SWING_NAME = (a) => (Math.abs(a) < 0.2 ? 'straight out' : a > 0 ? '0.55 down' : '0.55 up');

function slashCase(R, ang, holy) {
  const left = Math.cos(ang) < 0, a = Math.atan2(Math.sin(ang), left ? -Math.cos(ang) : Math.cos(ang));
  const label = `${holy ? 'Excalibur (holy' : 'Longsword (steel'}, reach ${R}, ${SWING_NAME(a)}, ${left ? 'left' : 'right'})`;
  const T = [0.017, 0.033, 0.05, 0.083, 0.117, 0.15, 0.183, 0.233];
  return {
    label, panel: { w: 2 * R + 50, h: 2 * R + 30, cx: 0, cy: -10 }, times: T, hero: true,
    start(g) { g.effects.push(new FX.Slash(g, weapon({}), ang, R, Math.PI / 4, 10, holy)); },
  };
}

const CASES = {
  slash: [
    slashCase(30, 0, false),
    slashCase(30, Math.PI, false),
    slashCase(38, Math.PI - 0.55, false),
    slashCase(38, -0.55, false),
    slashCase(46, -0.55, true),
    slashCase(56, Math.PI + 0.55, true),
    {
      label: 'Whirlwind (reach 46)', panel: { w: 150, h: 140, cx: 0, cy: -8 }, times: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4], hero: true,
      start(g) { g.effects.push(new FX.Whirl(g, 1)); },
    },
    {
      label: 'Twin Axes (chop, reach 44)', panel: { w: 130, h: 120, cx: 0, cy: -6 }, times: [0.017, 0.033, 0.05, 0.075, 0.1, 0.125, 0.15, 0.19], hero: true,
      start(g) { g.effects.push(new FX.Chop(g, weapon({}), 44, 10)); },
    },
  ],
  pillar: [{
    label: 'Smite (pillar of light)', panel: { w: 90, h: 170, cx: 0, cy: -60 }, times: [0.017, 0.05, 0.1, 0.15, 0.2, 0.25, 0.32, 0.4],
    start(g) { g.effects.push(new FX.Pillar(g, weapon({}), { id: 1, x: 0, y: 0, dead: false }, 0)); },
  }],
  zap: [
    ...[['Lightning Strike (shock, R 26)', 26, 90], ['Thunderstorm (shock, R 49)', 49, 130]].map(([label, R, size]) => ({
      label, panel: { w: size, h: size, cx: 0, cy: 0 }, times: [0.017, 0.05, 0.083, 0.117, 0.167, 0.233, 0.3, 0.4],
      start(g) { FX.explode(g, 0, 0, R, 0, null, 'shock'); },
    })),
    {
      label: 'Chain Lightning (a hop)', panel: { w: 120, h: 70, cx: -30, cy: -4 }, times: [0.017, 0.033, 0.05, 0.083, 0.117, 0.15, 0.2, 0.3],
      start(g) { g.effects.push(new FX.Bolt(g, [{ x: -70, y: -12 }, { x: 0, y: -5 }], 'chain')); },
    },
  ],
  meteor: [{
    label: 'Meteor Storm (R 54), landing at 0.6 s', panel: { w: 170, h: 150, cx: 0, cy: -20 }, times: [0.5, 0.617, 0.633, 0.667, 0.7, 0.75, 0.85, 1.05],
    start(g) { g.effects.push(new FX.Meteor(g, weapon({}), 0, 0, 54, 10, 0, {})); },
  }],
  silver: [
    {
      label: 'Purifier (silver burst, R 18)', panel: { w: 80, h: 64, cx: 4, cy: -2 }, times: [0.017, 0.033, 0.05, 0.083, 0.117, 0.15, 0.2, 0.25],
      start(g) { FX.explode(g, 0, -2, 18, 0, null, 'silver', { flip: false }); },
    },
    {
      // As Projectile.update strikes: its sparks, and the baked star (none with it off).
      label: 'Silver Crossbow (a bolt hits, flying right)', panel: { w: 60, h: 48, cx: 4, cy: -7 }, times: [0.017, 0.033, 0.05, 0.083, 0.117, 0.15, 0.2, 0.25],
      start(g) {
        g.particles.burst(0, 0, 7, 3, [PC.w, PC.G], 50, 0.2, 1, P.FADE);
        vfxBurst(g, 'vfx_silver_small', 0, -7, { flip: false, cap: 6, span: 0.3 });
      },
    },
  ],
  star: [false, true].map((big) => ({
    label: big ? 'Comet Shower (a star falls and lands)' : 'Starfall (a star falls and lands)', panel: { w: 120, h: 150, cx: 20, cy: -50 },
    times: [0.08, 0.16, 0.24, 0.317, 0.35, 0.383, 0.45, 0.533],
    start(g) { g.effects.push(new Star(g, weapon({ comet: big }), 0, 0, 0)); },
  })),
  shatter: [{
    label: 'Frozen Heart (a frozen foe shatters)', panel: { w: 100, h: 76, cx: 0, cy: -16 }, times: [0, 0.042, 0.083, 0.125, 0.167, 0.208, 0.292, 0.417],
    start(g) { FX.explode(g, 0, 0, 22, 0, null, 'frost'); },
  }],
  ult: [{
    label: 'An ultimate starts (every hero)', panel: { w: 200, h: 200, cx: 0, cy: -8 }, times: [0.017, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5], hero: true,
    start(g) {
      const p = g.player;
      g.effects.push(new FX.Ring(g, p.x, p.y, 4, 90, 0.5, '#f6757a', true, 2));
      FX.ultFlash(g, p);
    },
  }],
};

// --------------------------------------------------------------- drawing --

const FALL = [1, 0.82, 0.48, 0.18, 0];
const falloff = (d) => {
  if (d >= 1) return 0;
  const u = d * 4, i = Math.floor(u);
  return FALL[i] + (FALL[i + 1] - FALL[i]) * (u - i);
};
const noise = (x, y) => (((Math.imul(x, 374761393) + Math.imul(y, 668265263)) >>> 0) % 1000) / 1000;

// One frame of the game's picture, w x h art px round (cx, cy), on a ground.
function frame(g, c, ground, hero) {
  const S = SCALE, W = Math.round(c.w * S), H = Math.round(c.h * S);
  const cam = { x: c.cx - c.w / 2, y: c.cy - c.h / 2, S, W: c.w, H: c.h, pxW: W, pxH: H };
  const cv = new SoftCanvas(W, H), ctx = cv.getContext('2d');
  const tones = GROUNDS[ground].tones.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255));
  for (let py = 0; py < H; py++) {
    for (let qx = 0; qx < W; qx++) {
      const wx = Math.floor(cam.x + qx / S), wy = Math.floor(cam.y + py / S), n = noise(wx >> 2, wy >> 2) * 0.7 + noise(wx, wy) * 0.3;
      const t = tones[Math.min(3, Math.floor(n * 4))], i = (py * W + qx) * 4;
      cv.px[i] = t[0];
      cv.px[i + 1] = t[1];
      cv.px[i + 2] = t[2];
      cv.px[i + 3] = 1;
    }
  }
  for (const e of g.effects) if (e.drawGround) e.drawGround(ctx, cam);
  for (const e of g.effects) if (e.draw) e.draw(ctx, cam);
  g.particles.draw(ctx, cam, false);
  if (hero) {
    const spr = SPR.knight, fr = spr.frames[0];
    ctx.drawImage(fr.get(false), Math.round((g.player.x - fr.w / 2 - cam.x) * S), Math.round((g.player.y - spr.anchorY - cam.y) * S), fr.w * S, fr.h * S);
  }
  // The lights this frame sheds (the glow pass names them), then the light map over the scene.
  g.lights.length = 0;
  const dry = new SoftCanvas(W, H).getContext('2d');
  dry.globalCompositeOperation = 'lighter';
  for (const e of g.effects) if (e.drawGlow) e.drawGlow(dry, cam);
  const lights = [...g.lights];
  if (hero) lights.push({ x: g.player.x, y: g.player.y - 6, r: 125, key: 'warm', k: 1 }, { x: g.player.x, y: g.player.y - 8, r: 46, key: 'white', k: 0.7 });
  const amb = GROUNDS[ground].ambient, px = cv.px;
  for (let py = 0; py < H; py++) {
    for (let qx = 0; qx < W; qx++) {
      const wx = cam.x + (qx + 0.5) / S, wy = cam.y + (py + 0.5) / S;
      const L = [amb[0], amb[1], amb[2]];
      for (const l of lights) {
        const f = falloff(Math.hypot(wx - l.x, wy - l.y) / l.r) * Math.min(1, l.k);
        if (f <= 0) continue;
        const col = LIGHT_COLORS[l.key] || LIGHT_COLORS.white;
        for (let k = 0; k < 3; k++) L[k] += col[k] * f;
      }
      const i = (py * W + qx) * 4;
      for (let k = 0; k < 3; k++) px[i + k] *= Math.min(255, L[k]) / 255;
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const e of g.effects) if (e.drawGlow) e.drawGlow(ctx, cam);
  g.particles.draw(ctx, cam, true);
  ctx.globalCompositeOperation = 'source-over';
  return cv.toBuf();
}

// Runs a case, now or baked, and returns its frames on both grounds at its times.
function run(cs, baked) {
  const out = { night: [], day: [] };
  for (const ground of ['night', 'day']) {
    const random = Math.random;
    Math.random = mulberry32(7);
    setVfx(baked);
    try {
      const g = stand(ground === 'day');
      cs.start(g);
      const dt = 1 / 60;
      let step = 0;
      for (const t of cs.times) {
        const want = Math.round(t / dt);
        for (; step < want; step++) {
          g.clock += dt;
          g.time += dt;
          // What an effect makes as it updates (a pillar's beam, a meteor's blast) joins after.
          const cur = g.effects;
          g.effects = [];
          g.effects = cur.filter((e) => e.update(dt) !== false).concat(g.effects);
          g.particles.update(dt);
        }
        out[ground].push(frame(g, cs.panel, ground, cs.hero));
      }
    } finally {
      Math.random = random;
      setVfx(true);
    }
  }
  return out;
}

// ----------------------------------------------------------------- sheet --

function text(str, color) {
  const glyphs = [...str].map((ch) => (GLYPHS[ch] || GLYPHS['?']).split('/'));
  const w = glyphs.reduce((s, gl) => s + gl[0].length + 1, 0);
  const buf = { w: Math.max(1, w), h: 9, d: new Uint32Array(Math.max(1, w) * 9) };
  let x = 0;
  for (const gl of glyphs) {
    gl.forEach((row, y) => [...row].forEach((c, i) => { if (c === '#') buf.d[y * buf.w + x + i] = color; }));
    x += gl[0].length + 1;
  }
  return buf;
}
function blit(dst, src, x0, y0, k = 1) {
  for (let y = 0; y < src.h * k; y++) {
    for (let x = 0; x < src.w * k; x++) {
      const c = src.d[Math.floor(y / k) * src.w + Math.floor(x / k)];
      const X = x0 + x, Y = y0 + y;
      if (c >>> 24 && X >= 0 && Y >= 0 && X < dst.w && Y < dst.h) dst.d[Y * dst.w + X] = c;
    }
  }
}

const LEFT = 180;
const INK = hexPack('#e8e8f0'), DIM = hexPack('#9aa0b8'), BG = hexPack('#111018');
const written = [];
for (const [pick, cases] of Object.entries(CASES)) {
  if (only.length && !only.includes(pick)) continue;
  const t0 = performance.now();
  const blocks = cases.map((cs) => ({ cs, now: run(cs, false), baked: run(cs, true) }));
  const gap = 6, lab = 2, fw = Math.max(...blocks.map((b) => b.now.night[0].w)), rowsH = blocks.map((b) => b.now.night[0].h);
  const W = LEFT + 8 * (fw + gap), H = blocks.reduce((s, b, i) => s + 40 + 4 * (rowsH[i] + gap), 10);
  const img = { w: W, h: H, d: new Uint32Array(W * H).fill(BG) };
  let y = 10;
  blocks.forEach((b, i) => {
    blit(img, text(b.cs.label, INK), 10, y, lab);
    b.cs.times.forEach((t, k) => blit(img, text(`${Math.round(t * 1000)} ms`, DIM), LEFT + k * (fw + gap), y + 22, lab));
    y += 40;
    const rows = [['now, night', b.now.night], ['baked, night', b.baked.night], ['now, day', b.now.day], ['baked, day', b.baked.day]];
    for (const [name, frames] of rows) {
      blit(img, text(name, INK), 10, y + 6, lab);
      frames.forEach((f, k) => blit(img, f, LEFT + k * (fw + gap), y));
      y += rowsH[i] + gap;
    }
  });
  const file = join(OUT, `vfx-${pick}.png`);
  writePng(file, img);
  written.push(file);
  console.log(`${file} (${W}x${H}, ${Math.round(performance.now() - t0)} ms)`);
}
console.log(`${written.length} sheet(s) in ${OUT}`);
