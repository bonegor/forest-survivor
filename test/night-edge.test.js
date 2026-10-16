// The night edge (enemies.js NIGHT_EDGE): the owner's "monsters more visible against the night".
// After the lighting each monster is drawn again unlit, at the floor's alpha, with a light ring
// outside its ink outline, all in one canvas cut by whatever stands in front, a hole round the
// hero; bosses and crypt lords get none, the Necromancer's allies a green ring.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + file).href);
await mod('tools/headless.mjs');
const { Game } = await mod('public/js/game/game.js');
const { NIGHT_EDGE, NIGHT_LOOKS, ALLY_LOOK, nightFloor, nightHoleBuf, drawNightEdge } = await mod('public/js/game/enemies.js');
const { Minion } = await mod('public/js/game/minions.js');
const { SPR, nightBuf } = await mod('public/js/engine/sprites.js');
const { hexPack } = await mod('public/js/engine/pixels.js');
const { OUTLINE } = await mod('public/js/art/palette.js');
const { input } = await mod('public/js/engine/input.js');
const { view } = await mod('public/js/engine/view.js');
const { mulberry32 } = await mod('public/js/engine/util.js');
const P = await mod('public/js/shared/profile.js');

view.pxW = 1920;
view.pxH = 1080;
const RING_A = Math.round(255 * NIGHT_EDGE.ringA);

// An unkillable hero standing still, unarmed, with no spawner: only what a test puts there.
function game(fn, hero = 'knight') {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(7);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero, mode: 's15', meta: P.metaBonuses(P.defaultProfile()), settings: { numbers: false }, crypts: false });
    g.spawner.update = () => {};
    g.player.devGod = true;
    g.player.weapons.length = 0;
    g.syncCam();
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

// A 2D context that writes down every call and every setting, in order.
function recorder() {
  const calls = [];
  const ctx = new Proxy({}, {
    get: (t, k) => (...a) => calls.push([k, ...a]),
    set: (t, k, v) => (calls.push(['=' + String(k), v]), true),
  });
  return { ctx, calls };
}

// One frame drawn as the game draws it, then the night pass again into recorders.
function nightPass(g) {
  const stub = document.createElement('canvas').getContext('2d');
  g.draw(stub);
  const main = recorder(), night = recorder();
  drawNightEdge(main.ctx, g.cam, g, night.ctx);
  return { main: main.calls, night: night.calls };
}
// The night variant canvases a frame has built.
const nightCanvases = (fr, key) => fr.variants.get(key) || [];

test('the night look is the frame with a 1 px ring outside its outline: (w+2)×(h+2), the ring clear of the sprite', () => {
  for (const name of ['spider', 'bat', 'cultist', 'zombie']) {
    const b = SPR[name].frames[0].buf, look = NIGHT_LOOKS[0][1](b);
    assert.equal(look.w, b.w + 2, `${name}: a pixel wider each side`);
    assert.equal(look.h, b.h + 2, `${name}: a pixel taller each side`);
    const ring = hexPack(NIGHT_EDGE.ring, RING_A);
    let rings = 0;
    for (let y = 0; y < look.h; y++) {
      for (let x = 0; x < look.w; x++) {
        const c = look.d[y * look.w + x], inside = x > 0 && y > 0 && x <= b.w && y <= b.h ? b.d[(y - 1) * b.w + x - 1] : 0;
        if (inside >>> 24) {
          assert.equal(c, inside, `${name}: the sprite as it is at ${x},${y}, no ring over it`);
          continue;
        }
        if (!c) continue;
        assert.equal(c, ring, `${name}: only the ring outside the sprite, in its colour and alpha`);
        rings++;
        // Outside the ink: it touches the outline, not the sprite's colours.
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => {
          const xx = x + dx - 1, yy = y + dy - 1;
          return xx >= 0 && yy >= 0 && xx < b.w && yy < b.h ? b.d[yy * b.w + xx] : 0;
        }).filter((v) => v >>> 24);
        assert.ok(near.length && near.every((v) => v === (b.rim ?? b.ink ?? OUTLINE)), `${name}: the ring at ${x},${y} lies against the ink outline`);
      }
    }
    assert.ok(rings > 2 * (b.w + b.h) * 0.3, `${name}: ringed all round (${rings} px)`);
  }
  // Unringed (a champion's): just the frame, a pixel in from each side.
  const b = SPR.skeleton.frames[0].buf, plain = nightBuf(b, 0);
  assert.equal(plain.w, b.w + 2);
  assert.equal(plain.d.filter((c) => c >>> 24).length, b.d.filter((c) => c >>> 24).length, 'no ring');
});

test('the floor: lit plus the layer comes to 0.75 of a monster\'s colours, under any night; nothing at dawn', () => {
  const luma = (a) => (0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2]) / 255;
  assert.equal(NIGHT_EDGE.floor, 0.75);
  for (const [where, amb, want] of [['forest at dusk', [150, 136, 186], 0.416], ['forest at midnight', [102, 110, 164], 0.549], ['crypt', [70, 70, 104], 0.648]]) {
    const f = nightFloor(amb), m = luma(amb);
    assert.ok(Math.abs(f - want) < 0.002, `${where}: ${f.toFixed(3)}`);
    assert.ok(Math.abs(m + f * (1 - m) - NIGHT_EDGE.floor) < 1e-9, `${where}: M + f(1 − M) = floor`);
  }
  assert.equal(nightFloor([255, 244, 228]), 0, 'dawn');
  assert.equal(nightFloor([240, 214, 190]), 0, 'the last of the night');
  assert.equal(nightFloor([255, 255, 255]), 0, 'full light');
});

test('a monster out in the dark is lifted, once, at the floor\'s alpha; at dawn nothing is drawn', () =>
  game((g, p) => {
    const e = g.spawnEnemy('spider', p.x + 100, p.y + 20, { instant: true });
    const { main, night } = nightPass(g);
    const fr = e.spr.frames[e.frameIndex()], look = nightCanvases(fr, 'night')[e.face < 0 ? 1 : 0];
    assert.ok(look, 'its night look built');
    const drawn = night.find((c) => c[0] === 'drawImage' && c[1] === look);
    const [X, Y, w, h] = e._rect.slice(0, 4).map(Math.round), ux = w / fr.w, uy = h / fr.h;
    assert.deepEqual(drawn.slice(2), [X - ux, Y - uy, w + 2 * ux, h + 2 * uy], 'over its body, a frame pixel bigger each side');
    const f = nightFloor(g.world.ambient());
    const i = main.findIndex((c) => c[0] === 'drawImage');
    assert.deepEqual(main.slice(i - 1, i + 2).map((c) => c.slice(0, 2)), [['=globalAlpha', f], ['drawImage', main[i][1]], ['=globalAlpha', 1]], 'the one canvas over the scene at f');
    assert.equal(main.filter((c) => c[0] === 'drawImage').length, 1, 'one drawImage on the scene');
    g.dawn = 1;
    const dawn = nightPass(g);
    assert.equal(dawn.main.length + dawn.night.length, 0, 'dawn: nothing');
  }));

test('it fades out near the hero: a hole in the layers, clear at its edge, centred on his light', () =>
  game((g, p) => {
    g.spawnEnemy('spider', p.x + 100, p.y, { instant: true });
    const { night } = nightPass(g);
    const i = night.findLastIndex((c) => c[0] === 'drawImage');
    assert.ok(i > 0 && night[i][1].width === 64 && night[i][1].height === 64, 'the hole drawn last');
    assert.equal(night.slice(0, i).findLast((c) => c[0] === '=globalCompositeOperation')[1], 'destination-out', 'cut out');
    const S = g.cam.S, R = NIGHT_EDGE.near * S;
    assert.deepEqual(night[i].slice(2), [(p.x - g.cam.x) * S - R, (p.y - 6 - g.cam.y) * S - R, 2 * R, 2 * R], `${NIGHT_EDGE.near} px round his light`);
    const hole = nightHoleBuf(64), at = (x, y) => hole.d[y * 64 + x] >>> 24;
    assert.ok(at(32, 32) >= 245, 'nothing of the layer left at the hero');
    assert.ok(Math.abs(at(48, 32) - 128) <= 10, 'half of it halfway out');
    assert.equal(at(63, 32), 0, 'all of it at the edge');
    assert.equal(at(0, 0), 0, 'and beyond');
  }));

test('bosses and crypt lords get no night layer: they cut theirs out instead', () =>
  game((g, p) => {
    const foe = g.spawnEnemy('zombie', p.x + 90, p.y - 30, { instant: true });
    foe.life = 5;
    const boss = g.spawnEnemy('boneking', p.x - 90, p.y - 30, { instant: true, always: true });
    const lord = g.spawnEnemy('deathknight', p.x + 90, p.y + 40, { instant: true, lord: true });
    const { night } = nightPass(g);
    assert.ok(nightCanvases(foe.spr.frames[foe.frameIndex()], 'night').length, 'a foe is lifted');
    for (const e of [boss, lord]) {
      assert.equal(e._look, -1, `${e.type}: no night look`);
      assert.ok(![...e.spr.frames[e.frameIndex()].variants.keys()].some((k) => k.startsWith('night')), `${e.type}: none built`);
      const at = night.findIndex((c) => c[0] === 'drawImage' && c[1] === e._img);
      assert.ok(at > 0, `${e.type}: cuts its shape out`);
      assert.equal(night.slice(0, at).findLast((c) => c[0] === '=globalCompositeOperation')[1], 'destination-out');
    }
  }));

test('what stands in front cuts a foe\'s layer: the hero over one behind him', () =>
  game((g, p) => {
    const e = g.spawnEnemy('spider', p.x + 1, p.y - 4, { instant: true });
    const { night } = nightPass(g);
    const fr = e.spr.frames[e.frameIndex()], mine = night.findIndex((c) => c[0] === 'drawImage' && nightCanvases(fr, 'night').includes(c[1]));
    const hero = night.findIndex((c) => c[0] === 'drawImage' && c[1] === p._rect[4].get(p._rect[5]));
    assert.ok(mine >= 0 && hero > mine, 'the foe behind, then the hero cut over it');
    assert.equal(night.slice(0, hero).findLast((c) => c[0] === '=globalCompositeOperation')[1], 'destination-out');
  }));

test('a shrine cuts the layer of a foe behind it, as it hides the foe itself', () =>
  game((g, p) => {
    const e = g.spawnEnemy('spider', p.x + 100, p.y - 3, { instant: true });
    const s = { x: p.x + 100, y: p.y + 4, type: 'haste', used: false, t: 0, spr: SPR.shrine, shrine: true };
    g.shrines.push(s);
    const { night } = nightPass(g);
    const fr = e.spr.frames[e.frameIndex()], mine = night.findIndex((c) => c[0] === 'drawImage' && nightCanvases(fr, 'night').includes(c[1]));
    const shrine = night.findIndex((c) => c[0] === 'drawImage' && c[1] === SPR.shrine.frames[0].c);
    assert.ok(mine >= 0 && shrine > mine, 'the foe behind, then the shrine cut over it');
    assert.equal(night.slice(0, shrine).findLast((c) => c[0] === '=globalCompositeOperation')[1], 'destination-out');
    assert.deepEqual(night[shrine].slice(2), s._rect.slice(0, 4), 'where the shrine was drawn');
  }));

test('champions keep their gold outline unringed; allies are ringed in green, foes in grey-blue', () =>
  game((g, p) => {
    const champ = g.spawnEnemy('goblin', p.x + 90, p.y, { instant: true, elite: true });
    const m = new Minion(g, p.x - 90, p.y, { dmg: 1, dur: 99 });
    m.rise = 0;
    g.minions.push(m);
    const { night } = nightPass(g);
    assert.equal(champ._look, 3, 'a champion\'s look');
    const cf = champ.spr.frames[champ.frameIndex()];
    assert.ok(night.some((c) => c[0] === 'drawImage' && nightCanvases(cf, 'night-eliteo').includes(c[1])), 'the champion lifted, gold and all');
    const gold = hexPack('#feae34'), look = NIGHT_LOOKS[3][1](cf.buf);
    assert.ok(look.d.includes(gold), 'its gold outline');
    assert.ok(!look.d.some((c) => c >>> 24 && c >>> 24 < 255), 'no ring round it');
    const mf = m.rect(g.cam).fr;
    assert.ok(night.some((c) => c[0] === 'drawImage' && nightCanvases(mf, ALLY_LOOK[0]).includes(c[1])), 'the ally lifted');
    const ally = ALLY_LOOK[1](mf.buf), foe = NIGHT_LOOKS[0][1](mf.buf);
    assert.ok(ally.d.includes(hexPack(NIGHT_EDGE.allyRing, RING_A)) && NIGHT_EDGE.allyRing === '#63c74d', 'the ally ringed green');
    assert.ok(foe.d.includes(hexPack(NIGHT_EDGE.ring, RING_A)) && NIGHT_EDGE.ring === '#8b9bb4', 'a foe grey-blue');
  }, 'necromancer'));
