// The weapons' effects baked from Sprite Fusion's (28 October 2026, tools/vfx/bake.mjs into
// public/assets/art/vfx.js, played by fxart.js vfxBurst): the owner's "see what of their effects we
// can use for weapons and bake it in with our approach". The data reads back whole and in our
// palette, every sprite the code names is there, and a baked burst is only a picture: it strikes
// nothing and leaves the CC0 bursts' cap alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import '../tools/headless.mjs';
import VFX from '../public/assets/art/vfx.js';
import { bakedBuffers } from '../public/js/art/baked.js';
import { PAL } from '../public/js/art/palette.js';
import { hexPack } from '../public/js/engine/pixels.js';
import { fxBurst, vfxBurst, VfxBurst, FxBurst, fxFrames, glowFrames, vfxPrewarm, vfxFrames, setVfx, vfxOn } from '../public/js/game/fxart.js';
import { CUT_REACH, bakedCuts, ZAP_RING, bakedZap, Slash, Chop, Pillar, Beam, Explosion, explode, Meteor, Whirl, ultFlash } from '../public/js/game/effects.js';
import { Star, STAR } from '../public/js/game/weapons-light.js';
import { Game } from '../public/js/game/game.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { PICKS, CUT_REACH as BAKED_REACH } from '../tools/vfx/picks.mjs';

const PACKED = new Set(Object.values(PAL).map((h) => hexPack(h)));
const RGB = new Set([...PACKED].map((c) => c & 0xffffff));
const LEVELS = new Set([1, 2, 3, 4, 5, 6, 7].map((l) => Math.round((l / 7) * 255)));
// The pixels a run-length coded frame holds, counted as baked.js reads them.
function pixels(encoded) {
  const bytes = atob(encoded);
  let n = 0;
  for (let k = 0; k < bytes.length; k++) {
    const b = bytes.charCodeAt(k);
    if (b < 128) n++;
    else (n += b - 126), k++;
  }
  return n;
}
const ctx = () => ({ globalAlpha: 1, globalCompositeOperation: 'lighter', drawImage() {} });
const stand = (clock = 1000) => ({ clock, effects: [], world: { daylight: false }, hitEnemy() { throw new Error('a picture struck'); } });

test('the run-length code reads back as the plain code does', () => {
  // Two 4x2 frames: a run of clear, single pixels, a run of a colour.
  const palette = [0, hexPack('#ffffff'), hexPack('#2ce8f5')];
  const plain = { w: 4, h: 2, palette, frames: [[0, 0, 0, 1, 2, 2, 2, 1], [1, 0, 2, 0, 0, 0, 0, 0]].map((f) => btoa(String.fromCharCode(...f))) };
  const rle = { w: 4, h: 2, palette, rle: 1, frames: [[126 + 3, 0, 1, 126 + 3, 2, 1], [1, 0, 2, 126 + 5, 0]].map((f) => btoa(String.fromCharCode(...f))) };
  assert.deepEqual(bakedBuffers(rle).map((b) => [...b.d]), bakedBuffers(plain).map((b) => [...b.d]));
});

test('every baked sprite reads back whole, its glow at half size, in our palette', () => {
  for (const [name, v] of Object.entries(VFX)) {
    assert.equal(v.rle, 1, name);
    for (const f of v.frames) assert.equal(pixels(f), v.w * v.h, `${name}: a frame holds its ${v.w}x${v.h} exactly`);
    for (const c of v.palette.slice(1)) assert.ok(PACKED.has(c), `${name}: ${c.toString(16)} is a palette colour, opaque`);
    assert.ok(Number.isInteger(v.ox) && Number.isInteger(v.oy) && v.fps > 0, `${name}: its origin and pace`);
    if (v.vn) assert.equal(v.frames.length % v.vn, 0, `${name}: its variants each as long`);
    if (v.em) for (const k of v.em) assert.ok(k in PAL, `${name}: unlit key ${k}`);
    if (!v.glow) continue;
    assert.ok(v.glow.w * 2 === v.w && v.glow.h * 2 === v.h, `${name}: its glow half its size, so it mirrors true`);
    assert.equal(v.glow.frames.length, v.frames.length, `${name}: a glow a frame`);
    for (const f of v.glow.frames) assert.equal(pixels(f), v.glow.w * v.glow.h, name);
    for (const c of v.glow.palette.slice(1)) assert.ok(RGB.has(c & 0xffffff) && LEVELS.has(c >>> 24), `${name}: glow ${c.toString(16)} a palette hue at one of 7 levels`);
  }
});

test('every pick is baked, and every vfx_ sprite the game names is there', () => {
  for (const p of PICKS) assert.ok(VFX[p.name], `${p.name} baked`);
  const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.js') ? [join(d, f)] : []));
  for (const file of walk('public/js')) {
    for (const [, name] of readFileSync(file, 'utf8').matchAll(/['"`](vfx_[a-z0-9_]+)['"`]/g)) assert.ok(VFX[name], `${file}: ${name}`);
  }
  // The Whirlwind's blade turns about its frame's centre (Frame.rotated): its origin is there.
  for (const R of [46, 56, 66]) {
    const v = VFX[`vfx_whirl_${R}`];
    assert.deepEqual([v.ox * 2, v.oy * 2], [v.w, v.h], `vfx_whirl_${R} centred`);
  }
});

test('a baked burst strikes nothing, plays its frames by its origin, and goes', () => {
  const g = stand();
  const b = vfxBurst(g, 'vfx_zap', 100, 50);
  assert.ok(b instanceof VfxBurst && g.effects[0] === b);
  let draws = 0;
  const c = { ...ctx(), drawImage(img, x, y, w, h) { draws++; assert.ok(w > 0 && h > 0); } };
  let alive = true;
  for (let i = 0; alive && i < 200; i++) {
    b.draw(c, { x: 0, y: 0, S: 3 });
    b.drawGlow(c, { x: 0, y: 0, S: 3 });
    alive = b.update(1 / 60);
  }
  assert.ok(!alive, 'it ends');
  assert.ok(draws > 0);
  assert.equal(vfxBurst(g, 'vfx_nothing', 0, 0), null, 'no such sprite: nothing');
});

test('one following the hero rides with him; variants and mirroring come from the point, not the dice', () => {
  const g = stand(), hero = { x: 10, y: 20 };
  const b = vfxBurst(g, 'vfx_ult', 10, 12, { follow: hero });
  hero.x = 40;
  hero.y = 60;
  b.update(1 / 60);
  assert.deepEqual([b.x, b.y], [40, 52]);
  const random = Math.random;
  Math.random = () => { throw new Error('a burst threw the dice'); };
  try {
    const a = new VfxBurst('vfx_zap', 33, 44, {}), a2 = new VfxBurst('vfx_zap', 33, 44, {});
    assert.equal(a.from, a2.from, 'the same point, the same variant');
    vfxBurst(stand(), 'vfx_meteor', 5, 6);
  } finally {
    Math.random = random;
  }
});

test('the baked bursts keep a cap of their own: a storm of them leaves the CC0 bursts their room', () => {
  const g = stand(5000);
  let made = 0;
  for (let i = 0; i < 60; i++) if (vfxBurst(g, 'vfx_zap_tiny', i, 0)) made++;
  assert.equal(made, 40, 'forty at once, no more');
  assert.ok(fxBurst(g, 'fx_explosion', 0, 0, { centre: true }), 'a flask still bursts');
  g.clock += 1;
  assert.ok(vfxBurst(g, 'vfx_zap_tiny', 0, 0), 'and a second on, there is room again');
});

test('the CC0 sprites are made as before (no unlit keys); a baked one\'s keys and glow are made once', () => {
  for (const fr of fxFrames('fx_explosion')) assert.equal(fr.em, null);
  vfxPrewarm(['vfx_zap', 'vfx_silver', 'vfx_nothing']);
  assert.ok(fxFrames('vfx_silver').some((fr) => fr.em), 'the silver keeps its white unlit');
  assert.equal(glowFrames('vfx_zap').length, VFX.vfx_zap.frames.length);
  assert.equal(glowFrames('vfx_silver'), null, 'no glow baked: none');
  // The pillar's column is light itself (its unlit keys), its glow frames left out (the critic's,
  // 28 October 2026: boxy checker where their wide glows were clipped by its box).
  assert.equal(glowFrames('vfx_pillar'), null);
  assert.equal(fxFrames('vfx_pillar'), fxFrames('vfx_pillar'), 'made once');
});

// ------------------------------------------------------- wired into the weapons --
// 28 October 2026: every pick the critic kept, played where vfx-plan.md says, only as a picture.

// A stand-in game with no foes, at a clock of its own (the burst caps count by the clock).
const world = (clock) => ({
  ...stand(clock), player: { x: 10, y: 20, area: 1 }, grid: { foes: () => [] }, light() {}, addDecal() {}, shake() {},
  particles: { burst() {}, emit() {} },
});
const bursts = (g, cls = VfxBurst) => g.effects.filter((e) => e instanceof cls);
const isArt = (b, name) => b.frames === fxFrames(name);
// A 2D context that counts its drawImage calls and the compositing each was drawn with.
function counter(op = 'lighter') {
  const draws = [];
  return { draws, globalAlpha: 1, globalCompositeOperation: op, drawImage(img) { draws.push([img, this.globalCompositeOperation]); } };
}

test('the cuts are baked at the reaches the game draws them at; the nearest within its slack, else the game\'s own', () => {
  assert.deepEqual(CUT_REACH, BAKED_REACH, 'effects.js and tools/vfx/picks.mjs name the same reaches');
  for (const [kind, list] of Object.entries(CUT_REACH)) for (const R of list) for (const n of bakedCuts(kind, R)) assert.ok(VFX[n], n);
  assert.deepEqual(bakedCuts('slash', 30), ['vfx_slash_30_up', 'vfx_slash_30_0', 'vfx_slash_30_dn', 'vfx_slash_30_up_l', 'vfx_slash_30_0_l', 'vfx_slash_30_dn_l']);
  assert.equal(bakedCuts('slash', 33)[1], 'vfx_slash_30_0', 'the nearer reach');
  assert.equal(bakedCuts('slash', 35)[1], 'vfx_slash_38_0');
  assert.equal(bakedCuts('holy', 46.5)[4], 'vfx_holy_46_0_l', 'Excalibur at its own area, on his left');
  assert.equal(bakedCuts('slash', 70).length, 0, 'far past the longest: none, the true reach drawn');
  assert.deepEqual(bakedCuts('chop', 30), ['vfx_chop_32_r', 'vfx_chop_32_d']);
  assert.deepEqual(bakedCuts('whirl', 46), ['vfx_whirl_46']);
});

test('a sword\'s cut plays the baked one of its swing and side, riding with him; the blow is the Slash\'s', () => {
  const g = world(7000);
  const SWINGS = [[0, '_0'], [Math.PI, '_0_l'], [0.55, '_dn'], [-0.55, '_up'], [Math.PI - 0.55, '_dn_l'], [Math.PI + 0.55, '_up_l'], [2 * Math.PI, '_0']];
  for (const [ang, end] of SWINGS) {
    g.effects.length = 0;
    const s = new Slash(g, null, ang, 30, Math.PI / 4, 10, false);
    const [b] = bursts(g);
    assert.ok(b && s.vfx === b && isArt(b, `vfx_slash_30${end}`) && !b.flip, `${ang.toFixed(2)}: vfx_slash_30${end}, never mirrored (the left cuts sweep as ours do)`);
    const c = counter('source-over');
    s.draw(c, { x: 0, y: 0, S: 3 });
    s.drawGlow(c, { x: 0, y: 0, S: 3 });
    assert.equal(c.draws.length, 0, 'the Slash draws nothing of its own over it');
  }
  // It rides with him from his chest.
  const b = bursts(g)[0];
  g.player.x = 50;
  g.player.y = 70;
  b.update(1 / 60);
  assert.deepEqual([b.x, b.y], [50, 63]);
  // Excalibur's, gold; past the reaches baked, the game's own cut at the true reach.
  g.effects.length = 0;
  assert.ok(isArt(new Slash(g, null, 0, 47, Math.PI / 4, 10, true).vfx, 'vfx_holy_46_0'));
  g.effects.length = 0;
  const long = new Slash(g, null, 0, 80, Math.PI / 4, 10, false), c = counter('source-over');
  assert.equal(long.vfx, null);
  assert.equal(bursts(g).length, 0);
  long.draw(c, { x: 0, y: 0, S: 3 });
  assert.equal(c.draws.length, 1, 'its own drawn');
});

test('with the baked effects off (tools/vfx/compare.mjs\'s "now"), every weapon draws its own as it did', () => {
  const g = world(7100);
  setVfx(false);
  try {
    assert.equal(vfxOn(), false);
    const s = new Slash(g, null, 0, 30, Math.PI / 4, 10, false);
    assert.equal(s.vfx, null);
    assert.equal(vfxBurst(g, 'vfx_zap', 0, 0), null);
    assert.equal(vfxFrames('vfx_star'), null);
    explode(g, 0, 0, 26, 0, null, 'shock');
    assert.equal(bursts(g).length, 0);
    assert.ok(!g.effects.find((e) => e instanceof Explosion).bare, 'its haze and flash as they were');
  } finally {
    setVfx(true);
  }
  assert.equal(vfxOn(), true);
});

test('the blasts play their baked art by style and reach, a few at a time; a boss\'s slam none', () => {
  const g = world(7200);
  explode(g, 0, 0, 26, 0, null, 'shock');
  explode(g, 0, 0, 49, 0, null, 'shock');
  explode(g, 0, 0, 22, 0, null, 'frost');
  explode(g, 0, 0, 18, 0, null, 'silver', { flip: true });
  explode(g, 0, 0, 30, 0, null, 'fire');
  const [zap, big, ice, silver, more] = bursts(g);
  assert.ok(isArt(zap, 'vfx_zap') && isArt(big, 'vfx_zap_big') && isArt(ice, 'vfx_shatter') && isArt(silver, 'vfx_silver'));
  assert.equal(more, undefined, 'a fire blast keeps its CC0 art alone');
  assert.ok(silver.flip, 'a bolt flying left: mirrored');
  const ex = g.effects.filter((e) => e instanceof Explosion);
  assert.deepEqual(ex.map((e) => e.bare), [true, true, false, false, false], 'the shock\'s haze left to its art; the rest keep theirs');
  assert.deepEqual(ex.slice(0, 4).map((e) => !!e.vfx), [true, true, true, true]);
  // The bare shock still lights the ground, and draws nothing of its own in the glow pass.
  const c = counter();
  let lit = 0;
  g.light = () => lit++;
  ex[0].drawGlow(c, { x: 0, y: 0, S: 3 });
  assert.deepEqual([c.draws.length, lit], [0, 1]);
  // Hrimgar's frost slam (bosses.js: an Explosion of its own) is no frozen foe shattering.
  g.effects.length = 0;
  g.effects.push(new Explosion(g, 0, 0, 40, 'frost'));
  assert.equal(bursts(g).length, 0);
  // A storm of shocks: six zaps within 0.42 s, the rest of the blasts as ever.
  const h = world(7300);
  for (let i = 0; i < 10; i++) explode(h, i * 40, 0, 26, 0, null, 'shock');
  assert.equal(bursts(h).length, 6);
  assert.equal(h.effects.filter((e) => e instanceof Explosion).length, 10);
});

test('a shock draws the zap whose ring is nearest its reach, within the slack; past them all, its own haze', () => {
  // The owner's (22 October 2026): "if I hit a monster it doesn't always hit even if the animation
  // implies a hit". A 27 px zap inside a 39 px blast, or a 45 px one over a 40 px blast, was that.
  for (const [name, r] of Object.entries(ZAP_RING)) {
    assert.ok(VFX[name], `${name} baked`);
    assert.deepEqual(bakedZap(r), [name]);
  }
  assert.deepEqual(bakedZap(26), ['vfx_zap'], 'Lightning Strike');
  assert.deepEqual(bakedZap(39), ['vfx_zap_35'], 'Lightning Strike at its widest');
  assert.deepEqual(bakedZap(49.4), ['vfx_zap_big'], 'Thunderstorm');
  assert.deepEqual(bakedZap(51), ['vfx_zap_57'], 'the one off by the least share of its ring');
  assert.deepEqual(bakedZap(80), [], 'past them all: none');
  const g = world(7360);
  explode(g, 0, 0, 80, 0, null, 'shock');
  assert.equal(bursts(g).length, 0);
  assert.ok(!g.effects.find((e) => e instanceof Explosion).bare, 'its haze and flash as they were');
});

test('a pillar of light slams down baked, its beam then only lighting the ground', () => {
  const g = world(7400);
  const w = { s: { area: 1, dmg: 10, kb: 1, brand: 0.1 } };
  const pl = new Pillar(g, w, { id: 1, x: 5, y: 6, dead: false }, 0);
  pl.update(1 / 60);
  const [b] = bursts(g), beam = g.effects.find((e) => e instanceof Beam);
  assert.ok(isArt(b, 'vfx_pillar') && b.index() === 0, 'from its first frame, on the blow');
  assert.deepEqual([b.x, b.y], [5, 7]);
  assert.ok(beam.bare);
  const c = counter();
  let lit = 0;
  g.light = () => lit++;
  beam.drawGlow(c, { x: 0, y: 0, S: 3 });
  assert.deepEqual([c.draws.length, lit], [0, 1], 'its light, not its gradient');
  // A shrine's beam (Game.useShrine) is whole.
  assert.equal(new Beam(g, 0, 0).bare, false);
});

test('a weapon\'s meteor crashes with the baked flash over its firebomb; the boss\'s dying shower without', () => {
  const land = (w, o = {}) => {
    const g = world(7500 + (w ? 0 : 10));
    const m = new Meteor(g, w, 0, 0, 54, w ? 10 : 0, 0, o);
    for (let i = 0; i < 60 && m.update(1 / 60) !== false; i++);
    return g;
  };
  const weapon = { s: { area: 1, dmg: 10 } };
  const g = land(weapon);
  assert.ok(bursts(g).some((b) => isArt(b, 'vfx_meteor')));
  assert.ok(bursts(g, FxBurst).some((b) => isArt(b, 'fx_firebomb')), 'the dome stays');
  assert.equal(bursts(land(null, { fall: 0.01 })).length, 0);
  assert.ok(bursts(land(null, { ult: true })).some((b) => isArt(b, 'vfx_meteor')), 'Cataclysm\'s');
});

test('the axes\' chops and the Whirlwind\'s blade are baked; a chop\'s look comes from where he stands', () => {
  const g = world(7600);
  const a = new Chop(g, null, 44, 10, { quiet: true }), [b] = bursts(g);
  assert.ok(a.vfx === b && (isArt(b, 'vfx_chop_44_r') || isArt(b, 'vfx_chop_44_d')));
  const c = counter('source-over');
  a.draw(c, { x: 0, y: 0, S: 3 });
  assert.equal(c.draws.length, 0);
  g.effects.length = 0;
  new Chop(g, null, 44, 10, { quiet: true });
  assert.equal(bursts(g)[0].frames, b.frames, 'the same spot, the same chop');
  // The blade: picked once for a reach, each turn made once and drawn as it is.
  const wl = new Whirl(g, 1);
  assert.equal(wl.blade(46), vfxFrames('vfx_whirl_46')[0]);
  assert.equal(wl.blade(46), wl.blade(46));
  assert.equal(wl.blade(200), null, 'far past the reaches baked: the game\'s own');
  Whirl.prewarm({ area: 1.2 });
  assert.equal(vfxFrames('vfx_whirl_56')[0].rotated(1.3, 32), vfxFrames('vfx_whirl_56')[0].rotated(1.3, 32), 'its turns made ahead, not drawn anew');
});

test('a star\'s flare is baked, added as light by night and laid over by day; an ultimate\'s start flashes with him', () => {
  for (const day of [false, true]) {
    const g = world(7700);
    g.world.daylight = day;
    const s = new Star(g, { s: { area: 1, comet: 0 } }, 0, 0, 0);
    s.t = STAR.fall + 0.05;
    s.struck = true;
    const c = counter();
    s.drawGlow(c, { x: 0, y: 0, S: 3 });
    const fr = vfxFrames('vfx_star')[Math.floor(0.05 * VFX.vfx_star.fps)];
    assert.deepEqual(c.draws, [[fr.get(s.flip), day ? 'source-over' : 'lighter']]);
    assert.equal(c.globalCompositeOperation, 'lighter', 'and the glow pass left as it was');
  }
  const g = world(7800);
  ultFlash(g, g.player);
  const [b] = bursts(g);
  assert.ok(isArt(b, 'vfx_ult') && b.follow === g.player);
});

// The owner's rule for all of it: only a picture. A seeded game played with the baked effects and
// without them strikes the same foes for the same damage, kills the same and throws the same dice.
test('with the baked effects or without, the same game is played: the same blows, kills and dice', () => {
  const play = (on) => {
    const oldRandom = Math.random, oldBot = input.bot;
    Math.random = mulberry32(31);
    setVfx(on);
    try {
      input.bot = { x: 0, y: 0 };
      const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
      const p = g.player;
      p.devGod = true;
      for (const id of ['excalibur', 'lightning', 'thunderstorm', 'chain', 'smite', 'crossbow', 'purifier', 'starfall', 'frozenheart', 'meteor', 'twinaxes']) g.addWeapon(id);
      for (let i = 0; i < 24; i++) g.spawnEnemy('zombie', p.x + Math.cos(i) * (40 + i * 5), p.y + Math.sin(i) * (40 + i * 5), { instant: true, hpMul: 3 });
      for (let i = 0; i < 600; i++) {
        if (i === 200) g.startUlt('whirlwind');
        g.update(1 / 60);
      }
      const alive = g.enemies.filter((e) => !e.dead);
      return {
        damage: Math.round(g.stats.damage * 1000), alive: alive.length, hp: Math.round(alive.reduce((s, e) => s + e.hp, 0) * 1000),
        dealt: p.weapons.map((w) => Math.round(w.dmgDealt * 1000)), kills: p.weapons.map((w) => w.kills),
        effects: g.effects.filter((e) => !(e instanceof FxBurst)).length, dice: Math.random(),
      };
    } finally {
      input.bot = oldBot;
      Math.random = oldRandom;
      setVfx(true);
    }
  };
  const off = play(false), on = play(true);
  assert.ok(off.damage > 0, 'blows were struck');
  assert.deepEqual(on, off);
});
