// An ending that tells the story (order 1, item 5): the blow that fells the hero is named (a
// monster by its name, a champion by its own, a boss with its title, a shot as its shooter's), the
// results say it, and the hero's fall plays out (the music stops, the world drains, he falls,
// "Slain by …") before the results come; a revive is unchanged. The results tick in, stamp the
// records the run broke, and count the gold; what the Armory's next rank costs is told.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game, DEATH } from '../public/js/game/game.js';
import { EnemyShot } from '../public/js/game/projectiles.js';
import { shotName } from '../public/js/game/names.js';
import { armoryLine } from '../public/js/ui/gamescreen.js';
import { ArmoryScreen } from '../public/js/ui/screens.js';
import { UI } from '../public/js/ui/ui.js';
import { input } from '../public/js/engine/input.js';
import { view } from '../public/js/engine/view.js';
import { SPR } from '../public/js/engine/sprites.js';
import { bounds } from '../public/js/engine/pixels.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function game(fn, hero = 'knight') {
  const random = Math.random, bot = input.bot;
  Math.random = mulberry32(8);
  input.bot = { x: 0, y: 0 };
  try {
    const g = new Game({ hero, mode: 's15', diff: 'medium', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.spawner.update = () => {};
    g.update(1 / 60);
    return fn(g, g.player);
  } finally {
    input.bot = bot;
    Math.random = random;
  }
}

test('a blow by contact is named after the foe: a monster, a champion by its own name, a boss with its title', () => {
  game((g, p) => {
    const e = g.spawnEnemy('zombie', p.x + 3, p.y, { instant: true });
    p.hp = 1;
    for (let i = 0; i < 60 && !p.dead; i++) g.update(1 / 60);
    assert.ok(p.dead, 'felled by its touch');
    assert.equal(g.stats.killedBy, 'Ghoul');
    assert.equal(e.def.name, 'Ghoul');
  });
  game((g, p) => {
    g.spawner.spawnElite(g.phase);
    const e = g.enemies.find((x) => x.elite);
    p.hurt(1e9, e);
    assert.equal(g.stats.killedBy, e.name, 'a champion: its own name');
    assert.match(e.name, /^[A-Z][a-z]+$/, 'champions have one name without an epithet');
  });
  game((g, p) => {
    const b = g.spawnBoss('boneking', p.x + 20, p.y);
    b.cdT = 0; // the slam at once
    p.hp = 1;
    for (let i = 0; i < 240 && !p.dead; i++) g.update(1 / 60);
    assert.ok(p.dead);
    assert.equal(g.stats.killedBy, 'Ossarian', 'a boss: only the name, by touch or by its slam');
  });
});

test("a shot is named as its shooter's", () =>
  game((g, p) => {
    const c = g.spawnEnemy('cultist', p.x + 60, p.y, { instant: true });
    assert.equal(shotName(c, 'darkbolt'), "Cultist's bolt");
    g.eshots.push(new EnemyShot(g, p.x, p.y - 2, 0, 1, 1e9, 'darkbolt', { by: shotName(c, 'darkbolt') }));
    p.invuln = 0;
    g.update(1 / 60);
    assert.ok(p.dead);
    assert.equal(g.stats.killedBy, "Cultist's bolt");
    const boss = g.spawnBoss('lich', p.x + 90, p.y);
    assert.equal(shotName(boss, 'skullbolt'), "Malgrath's skull", 'a boss by its name alone');
  }));

test('the fall plays out before the results', () =>
  game((g, p) => {
    p.hurt(1e9);
    assert.equal(g.state, 'dying');
    let t = 0;
    while (g.state === 'dying' && t < 5) {
      g.update(1 / 60);
      t += 1 / 60;
    }
    assert.equal(g.state, 'over');
    assert.ok(t >= DEATH.end - 0.02 && t <= 3, `the results after ${t.toFixed(2)} s, at most 3`);
    assert.ok(DEATH.drain <= 1 && DEATH.name < DEATH.end, 'drained within a second, the name before the results');
  }));

test('Aldric falls in either facing, his wisp rises, and only his sword and shield stay until results', () =>
  [1, -1].forEach(face => game((g, p) => {
    const fall = SPR.knight.fall;
    const ctx = document.createElement('canvas').getContext('2d');
    let shown;
    ctx.drawImage = img => { shown = img; };
    ctx.rotate = () => assert.fail('the authored fall already contains the body motion');
    const at = t => { g.deathT = t; g.drawFallen(ctx, g.cam); return shown; };
    p.walking = true;
    p.anim = 0.4;
    p.face = face;
    g.placePlayer(g.cam);
    p.face = -face; // A direction change on the killing tick hasn't reached the display.
    p.hurt(1e9);
    assert.equal(at(0), p._rect[4].white(face < 0));
    const seen = new Set();
    for (let tick = Math.ceil(DEATH.flash * 60); tick <= 60; tick++) seen.add(at(tick / 60));
    assert.ok(seen.size >= 5, 'distinct poses convey the brace, kneel and final collapse');
    const [shield, soul] = fall.cues;
    assert.deepEqual([shield.sound, soul.sound], ['shieldfall', 'souldepart']);
    assert.ok(shield.time < soul.time && soul.time < DEATH.end);
    const landedIndex = fall.frameAt(0.92);
    const landed = fall.frames[landedIndex];
    const remains = fall.frames.at(-1);
    assert.equal(at(soul.time - 1 / 60), landed.get(face < 0));
    const buf = remains.buf;
    for (const frame of fall.frames.slice(landedIndex)) {
      assert.ok(buf.d.every((color, i) => !(color >>> 24) || color === frame.buf.d[i]),
        'the sword and shield are already in their final positions before decomposition');
    }
    const left = i => (i % buf.w) < buf.w / 2;
    const sword = bounds({ ...buf, d: buf.d.map((pixel, i) => left(i) ? pixel : 0) });
    const shieldOnGround = bounds({ ...buf, d: buf.d.map((pixel, i) => left(i) ? 0 : pixel) });
    assert.ok(sword && shieldOnGround);
    assert.ok(sword.y1 - sword.y0 > 2 * (sword.x1 - sword.x0), 'the planted blade stands upright');
    assert.ok(shieldOnGround.x1 - shieldOnGround.x0 > shieldOnGround.y1 - shieldOnGround.y0, 'the shield lies on its side');
    assert.ok(shieldOnGround.x0 - sword.x1 >= 10, 'the helmet and armour have cleared the ground between them');
    assert.equal(at(DEATH.end - 0.25), remains.get(face < 0));
    assert.equal(at(DEATH.end), remains.get(face < 0));
  })));

test('the Ranger drops her bow, leaves it planted at a slant and fully decays beneath the rising soul', () =>
  [1, -1].forEach(face => game((g, p) => {
    const ranger = SPR.archer, fall = ranger.fall;
    const ctx = document.createElement('canvas').getContext('2d');
    let image;
    ctx.drawImage = drawn => { image = drawn; };
    p.face = face;
    g.placePlayer(g.cam);
    p.hurt(1e9);
    const at = t => { g.deathT = t; g.drawFallen(ctx, g.cam); return image; };
    assert.equal(at(0), p._rect[4].white(face < 0));
    const falling = [.17, .31, .49, .60, .73, .94].map(at);
    assert.equal(new Set(falling).size, falling.length);

    const bow = fall.frames.at(-1).buf;
    const box = bounds(bow);
    assert.ok(box.x0 > bow.w / 2, 'the whole body and both boots have disappeared');
    assert.equal(box.y1, ranger.anchorY - 1, 'the submerged end is cut off at ground level');
    const row = y => [...bow.d.slice(y * bow.w, (y + 1) * bow.w)];
    assert.ok(row(box.y0).findIndex(Boolean) - row(box.y1).findIndex(Boolean) >= 5,
      'the upper tip leans several native pixels outward from the nock in the soil');
    const landed = fall.frames[fall.frameAt(.94)].buf;
    const exposedBody = frame => frame.d.filter((pixel, i) => pixel && !bow.d[i]).length;
    for (const t of [1.1, 1.65, 1.9, 2.2, 2.4]) {
      const f = fall.frames[fall.frameAt(t)].buf;
      assert.ok(bow.d.every((pixel, i) => !pixel || f.d[i] === pixel), 'the planted bow holds still');
    }
    const counts = [landed, fall.frames[fall.frameAt(1.9)].buf, bow].map(exposedBody);
    assert.ok(counts[0] > counts[1] && counts[1] > counts[2]);
    assert.equal(at(DEATH.end), fall.frames.at(-1).get(face < 0));
    assert.deepEqual(fall.wisp.frames.map(f => f.buf), SPR.knight.fall.wisp.frames.map(f => f.buf));
    g.deathT = fall.wisp.release + .5;
    g.hud.drawDepartingSoul(ctx);
    assert.equal(image, fall.wisp.frames[fall.wisp.frameAt(.5)].get(face < 0));
  }, 'archer')));

test('each of the other seven original heroes falls, releases a soul and leaves their planted gear', () => {
  for (const hero of ['mage', 'rogue', 'necromancer', 'paladin', 'druid', 'berserker', 'witchhunter']) {
    for (const face of [1, -1]) game((g, p) => {
      const spr = SPR[p.hero.sprite], fall = spr.fall;
      const ctx = document.createElement('canvas').getContext('2d');
      let shown;
      ctx.drawImage = img => { shown = img; };
      ctx.rotate = () => assert.fail(`${hero}: the fall is animated in native poses`);
      p.face = face;
      g.placePlayer(g.cam);
      p.hurt(1e9);
      const at = t => { g.deathT = t; g.drawFallen(ctx, g.cam); return shown; };
      assert.equal(at(0), p._rect[4].white(face < 0));
      assert.equal(new Set([.16, .29, .42, .55, .69, .83].map(at)).size, 6, `${hero}: the whole stumble plays`);

      const { wisp } = fall;
      const landed = fall.frames[fall.frameAt(wisp.release - .01)].buf;
      const remains = fall.frames.at(-1).buf;
      const box = bounds(remains);
      assert.ok(box && box.y1 >= spr.anchorY - 2, `${hero}: gear meets the ground`);
      assert.ok(box.x0 > 0 && box.x1 < remains.w - 1, `${hero}: settled gear fits inside the sprite canvas`);
      const body = { ...landed, d: landed.d.map((pixel, i) => remains.d[i] ? 0 : pixel) };
      assert.ok(bounds(body).y0 >= spr.anchorY - 22, `${hero}: the body has dropped`);
      const bodyPixels = frame => frame.buf.d.filter((pixel, i) => pixel && !remains.d[i]).length;
      const frames = [wisp.release, 1.9, 2.68].map(t => fall.frames[fall.frameAt(t)]);
      const counts = frames.map(bodyPixels);
      assert.ok(counts[0] > counts[1] && counts[1] > counts[2] && counts[2] === 0, `${hero}: the body decays completely`);
      for (const buf of [landed, ...frames.map(frame => frame.buf)]) {
        assert.ok(remains.d.every((pixel, i) => !pixel || buf.d[i] === pixel), `${hero}: the gear remains fixed`);
      }
      g.deathT = wisp.release + .45;
      g.hud.drawDepartingSoul(ctx);
      assert.equal(shown, wisp.frames[wisp.frameAt(.45)].get(face < 0));
      assert.equal(at(DEATH.end), fall.frames.at(-1).get(face < 0));
    }, hero);
  }
});

test('the wisp visibly crosses the top edge, tail last, before results in landscape and portrait', () =>
  game((g, p) => {
    const wisp = SPR.knight.fall.wisp;
    const ctx = document.createElement('canvas').getContext('2d');
    let drawn;
    ctx.drawImage = (image, x, y, w, h) => { drawn = { image, x, y, w, h }; };
    p.hurt(1e9);
    const sample = age => {
      drawn = null;
      g.deathT = wisp.release + age;
      g.hud.drawDepartingSoul(ctx);
      if (!drawn) return null;
      const frame = wisp.frames[wisp.frameAt(age)];
      const scale = drawn.h / frame.h;
      return { top: drawn.y + frame.box[1] * scale, bottom: drawn.y + frame.box[3] * scale };
    };
    const { S, zoom, W, H, pxW, pxH } = view;
    try {
      for (const [w, h, uiScale, worldZoom] of [[480, 270, 1, 0.8], [1920, 1080, 4, 0.8], [780, 1688, 3, 0.8]]) {
        Object.assign(view, { S: uiScale, zoom: worldZoom, W: Math.ceil(w / uiScale), H: Math.ceil(h / uiScale), pxW: w, pxH: h });
        g.syncCam();
        g.snapCam();
        assert.equal(sample(-0.05), null);
        assert.ok(Math.abs(sample(0).top - view.H / 2) <= 2, 'emerges at the fallen Knight');
        let crossed = false;
        for (let tick = 1; tick / 60 < wisp.duration; tick++) {
          const { top, bottom } = sample(tick / 60);
          if (top < 0 && bottom > 0) crossed = true;
        }
        assert.ok(crossed, 'part of the wisp remains on screen while its tip passes the upper edge');
        assert.ok(sample(wisp.duration - 0.001).bottom <= 0, 'the whole ribbon travels offscreen before it stops drawing');
        assert.equal(sample(wisp.duration + 0.01), null);
        assert.ok(wisp.release + wisp.duration < DEATH.end);
      }
    } finally {
      Object.assign(view, { S, zoom, W, H, pxW, pxH });
    }
  }));

test('Shadow and Necromancer souls descend through the ground in either facing', () => {
  for (const hero of ['rogue', 'necromancer']) {
    for (const face of [1, -1]) game((g, p) => {
      const wisp = SPR[p.hero.sprite].fall.wisp;
      const ctx = document.createElement('canvas').getContext('2d');
      let drawn;
      ctx.drawImage = (image, sx, sy, sw, sh, x, y, w, h) => { drawn = { image, sh, y, h }; };
      p.face = face;
      g.placePlayer(g.cam);
      p.hurt(1e9);
      const sample = age => {
        drawn = null;
        g.deathT = wisp.release + age;
        g.hud.drawDepartingSoul(ctx);
        return drawn;
      };

      assert.equal(sample(-.01), null);
      const emerge = sample(0), entering = sample(.45), tail = sample(.73);
      assert.equal(emerge.image, wisp.frames[0].get(face < 0));
      assert.ok(emerge.y < entering.y && entering.y < tail.y, 'the wisp moves down');
      assert.ok(entering.sh < emerge.sh && tail.sh < entering.sh, 'the ground covers the tip before the tail');
      const groundY = Math.round((p.y - g.cam.y) * g.cam.S / view.S);
      for (const draw of [emerge, entering, tail]) {
        assert.ok(draw.h > 0 && draw.y + draw.h <= groundY);
      }
      assert.equal(sample(wisp.duration - .001), null, 'the tail clears the ground');
      assert.equal(sample(DEATH.end - wisp.release), null);
    }, hero);
  }
});

test("the killer caption leaves Aldric's wisp, sword and shield visible", () =>
  game((g, p) => {
    p.hurt(1e9);
    g.deathT = 2.1;
    const ctx = document.createElement('canvas').getContext('2d');
    let caption;
    ctx.drawImage = (_image, x, y, w, h) => { caption = { x, y, w, h }; };
    for (const [w, h] of [[480, 270], [320, 240], [270, 480]]) {
      g.hud.drawSlain(ctx, w, h);
      // With the camera centred, the boots sit eight pixels below screen centre.
      assert.ok(caption.y > h / 2 + 10 && caption.y + caption.h < h);
      assert.ok(caption.x >= 0 && caption.x + caption.w <= w);
    }
  }));

test('a revive is as it was: no fall, no name', () =>
  game((g, p) => {
    p.revivals = 1;
    p.hurt(1e9);
    assert.ok(!p.dead && g.state === 'play');
    assert.equal(g.stats.killedBy, null);
  }));

test('the results tell what the gold buys at the Armory', () => {
  const p = defaultProfile();
  p.gold = 0;
  // Every first rank at half price (shared/progress.js firstRank).
  assert.equal(armoryLine(p), '+50 gold to Magnetism I', 'the cheapest rank, and how far it is');
  p.gold = 50;
  assert.equal(armoryLine(p), 'Magnetism I · 50 gold · +20% pickup range');
  p.up.magnet = 1;
  p.gold = 70;
  assert.equal(armoryLine(p), 'Recovery I · 60 gold · +0.1 health per second', 'the recommendation updates after a purchase');
  const app = { ui: new UI() }, screen = new ArmoryScreen();
  screen.enter(app, { focus: 'magnet' });
  assert.equal(screen.selected, 'magnet');
  assert.equal(app.ui.focusId, 'u_magnet');
});
