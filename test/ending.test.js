// An ending that tells the story (order 1, item 5): the blow that fells the hero is named (a
// monster by its name, a champion by its own, a boss with its title, a shot as its shooter's), the
// results say it, and the hero's fall plays out (the music stops, the world drains, he falls,
// "Slain by …") before the results come; a revive is unchanged. The results tick in, stamp the
// records the run broke, and count the gold; what the Armory's next rank costs is told.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
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
    assert.ok(Math.abs(t - g.deathTiming.end) <= 1 / 60 + 1e-8, `the results follow the full sequence at ${t.toFixed(2)} s`);
    assert.ok(g.deathTiming.drain <= 1 && g.deathTiming.name < g.deathTiming.end, 'drained within a second, the name before the results');
  }));

test('the fallen merchant loses his copper and whip before his soul leaves the statue', () =>
  game((g, p) => {
    const sprite = SPR.eanasir, fall = sprite.fall;
    const at = t => fall.frames[fall.frameAt(t)].buf;
    const last = fall.frames.at(-1).buf;
    const standing = sprite.frames[sprite.idle[0]].buf;
    const first = at(0), margin = (first.w - standing.w) / 2;
    for (let y=0; y<first.h; y++) assert.deepEqual(first.d.slice(y*first.w+margin,y*first.w+margin+standing.w),
      standing.d.slice(y*standing.w,(y+1)*standing.w));
    const statue = t => at(t).d.filter((_,i) => i % first.w < first.w/2 + 17);
    assert.deepEqual(statue(1.05),statue(1.20),'the statue stays still while the loose copper rolls');
    const low = bounds(at(1.75));
    assert.ok(low.y0 > bounds(at(1.05)).y0 + 8 && low.y1 === fall.anchorY);
    const objects = [];
    for (let x=0; x<last.w; x++) {
      if (last.d.some((color,i) => color && i%last.w===x)) {
        if (objects.at(-1)?.end === x-1) objects.at(-1).end=x;
        else objects.push({start:x,end:x});
      }
    }
    assert.equal(objects.length,2,'two distinct pieces of equipment survive');
    assert.ok(objects[0].end < first.w/2 && objects[1].start > first.w/2);
    assert.ok(at(2.95).d.filter((color,i)=>color && !last.d[i]).length > 50, 'the body is still there during his first steps');
    assert.deepEqual(at(fall.remainsAt+.01),last);
    p.hurt(1e9);
    assert.equal(g.deathTiming.name,fall.wisp.release);
    assert.equal(fall.cues[0].time,fall.wisp.release);
    assert.ok(g.deathTiming.end > fall.wisp.release + g.soulDuration(fall.wisp));
    for (let tick = 0; tick <= Math.ceil(g.deathTiming.end*60); tick++) g.update(1 / 60);
    assert.equal(g.state, 'over');
  }, 'eanasir'));

test('Ea-Nasir rises from his own body and walks clear of either screen edge before results', () =>
  game((g,p) => {
    const {fall}=SPR.eanasir, soul=fall.wisp;
    const saved={S:view.S, zoom:view.zoom, W:view.W, H:view.H, pxW:view.pxW, pxH:view.pxH};
    const ctx=document.createElement('canvas').getContext('2d');
    let drawn;
    ctx.drawImage=(image,x,y,width,height)=>{drawn={image,x,y,width,height};};
    try {
      for (const [width,height] of [[240,400],[650,270]]) for (const face of [-1,1]) {
        Object.assign(view,{S:2,zoom:.8,W:width,H:height,pxW:width*2,pxH:height*2});
        g.syncCam(); g.snapCam();
        p.face=face; g.placePlayer(g.cam);
        const duration=g.soulDuration(soul);
        const sample=age=>{
          g.deathT=soul.release+age;
          drawn=null; g.hud.drawDepartingSoul(ctx);
          return drawn;
        };
        assert.equal(sample(-.01),null);
        const emerging=sample(.01), first=soul.frames[0], upright=soul.frames[soul.frameAt(1)];
        assert.ok(first.box[3]-first.box[1] < upright.box[3]-upright.box[1]-12,'first appears lying where the merchant fell');
        assert.ok(emerging.x<width/2 && emerging.x+emerging.width>width/2);
        const start=sample(soul.walkOff.rise+.01), stride=sample(soul.walkOff.rise+.24);
        assert.notEqual(start.image,stride.image,'takes visible steps');
        assert.ok((stride.x-start.x)*face > 8);
        const age=duration-.001, exit=sample(age), frame=soul.frames[soul.frameAt(age)], box=frame.box;
        const k=exit.width/frame.w;
        if (face===1) assert.ok(exit.x+box[0]*k>=width,'whole figure clears right edge');
        else assert.ok(exit.x+(frame.w-box[0])*k<=0,'whole mirrored figure clears left edge');
        assert.equal(sample(duration+.01),null);
        assert.ok(g.deathTiming.end > soul.release+duration);
      }
    } finally {Object.assign(view,saved);}
  }, 'eanasir'));

test('the Knight and Berserker retain their approved native fall frames and cues', () => {
  for (const [hero, release, digest] of [
    ['knight', 1.10, '0c5cf181888d1fec1e41f9793f8244df40a4fbafb687fa3329ed5098517d50b5'],
    ['berserker', 1.85, '42f7bf8147fc3ac1974b3e93cfa0cacf57cc154f9e641705d5bf0667c662614b'],
  ]) {
    const fall = SPR[hero].fall, hash = createHash('sha256');
    for (const { buf } of fall.frames) hash.update(new Uint8Array(buf.d.buffer));
    assert.equal(hash.digest('hex'), digest, hero);
    assert.equal(fall.wisp.release, release);
    assert.equal(fall.cues.find(cue => cue.sound === 'souldepart').time, release);
  }
  assert.equal(SPR.knight.fall.cues.find(cue => cue.sound === 'shieldfall').time, .76);
});

test('Ylva holds the approved Low ready fall on all fours for 0.2 seconds, then collapses', () => {
  const fall = SPR.berserker.fall;
  const remains = fall.frames.at(-1).buf.d;
  const frameAt = time => fall.frames[fall.frameAt(time)].buf;
  const bodyBounds = frame => bounds({ ...frame, d: frame.d.map((pixel, i) => pixel === remains[i] ? 0 : pixel) });
  const held = frameAt(1.05);
  const brace = bodyBounds(held);
  const landed = frameAt(fall.wisp.release - .01);
  assert.ok(brace.y1 >= fall.anchorY - 2, 'Ylva meets the ground during the brace');
  assert.ok(brace.y0 <= bodyBounds(landed).y0 - 4, 'Ylva supports her weight above the floor');
  for (let tick = 0; tick < 24; tick++) {
    assert.deepEqual(frameAt(1.05 + tick / 120).d, held.d, 'Ylva moves during the hold');
  }
  assert.notDeepEqual(frameAt(1.25 + 1 / 60).d, held.d, 'Ylva starts to fall within one tick of the pause ending');
  let top = brace.y0;
  for (let tick = 75; tick <= 108; tick++) {
    const nextTop = bodyBounds(frameAt(tick / 60)).y0;
    assert.ok(nextTop >= top - 1, 'Ylva rises back up during the collapse');
    top = Math.max(top, nextTop);
  }
  assert.deepEqual(frameAt(1.70).d, landed.d, 'Ylva stays down after landing');
});

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
    for (let tick = Math.ceil(g.deathTiming.flash * 60); tick < fall.wisp.release * 60; tick++) seen.add(at(tick / 60));
    assert.ok(seen.size >= 5, 'distinct poses convey the brace, kneel and final collapse');
    const [shield, soul] = fall.cues;
    assert.deepEqual([shield.sound, soul.sound], ['shieldfall', 'souldepart']);
    assert.ok(shield.time < soul.time && soul.time < g.deathTiming.end);
    const landedIndex = fall.frameAt(soul.time - 1 / 60);
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
    assert.equal(at(g.deathTiming.end - 0.25), remains.get(face < 0));
    assert.equal(at(g.deathTiming.end), remains.get(face < 0));
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
    const release = fall.wisp.release;
    const landed = fall.frames[fall.frameAt(release - .02)].buf;
    const exposedBody = frame => frame.d.filter((pixel, i) => pixel && !bow.d[i]).length;
    for (const age of [0, .55, .8, 1.1, 1.3]) {
      const f = fall.frames[fall.frameAt(release + age)].buf;
      assert.ok(bow.d.every((pixel, i) => !pixel || f.d[i] === pixel), 'the planted bow holds still');
    }
    const counts = [landed, fall.frames[fall.frameAt(release + .8)].buf, bow].map(exposedBody);
    assert.ok(counts[0] > counts[1] && counts[1] > counts[2]);
    assert.equal(at(g.deathTiming.end), fall.frames.at(-1).get(face < 0));
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
      assert.ok(box && Math.abs(box.y1 - fall.anchorY) <= 2, `${hero}: gear meets the fall's ground line`);
      assert.ok(box.x0 > 0 && box.x1 < remains.w - 1, `${hero}: settled gear fits inside the sprite canvas`);
      const body = { ...landed, d: landed.d.map((pixel, i) => remains.d[i] ? 0 : pixel) };
      assert.ok(bounds(body).y0 >= fall.anchorY - 22, `${hero}: the body has dropped`);
      const bodyPixels = frame => frame.buf.d.filter((pixel, i) => pixel && !remains.d[i]).length;
      const frames = [0, .8, 1.58].map(age => fall.frames[fall.frameAt(wisp.release + age)]);
      const counts = frames.map(bodyPixels);
      assert.ok(counts[0] > counts[1] && counts[1] > counts[2] && counts[2] === 0, `${hero}: the body decays completely`);
      for (const buf of [landed, ...frames.map(frame => frame.buf)]) {
        assert.ok(remains.d.every((pixel, i) => !pixel || buf.d[i] === pixel), `${hero}: the gear remains fixed`);
      }
      g.deathT = wisp.release + .45;
      g.hud.drawDepartingSoul(ctx);
      assert.equal(shown, wisp.frames[wisp.frameAt(.45)].get(face < 0));
      assert.equal(at(g.deathTiming.end), fall.frames.at(-1).get(face < 0));
    }, hero);
  }
});

test('Ylva staggers at her last foot position and leaves two axes when the results appear', () => {
  for (const face of [1, -1]) game((g, p) => {
    const sprite = SPR[p.hero.sprite], fall = sprite.fall;
    const upright = sprite.frames[sprite.idle[0]].buf, first = fall.frames[fall.frameAt(0)].buf;
    const dx = (first.w - upright.w) / 2, dy = fall.anchorY - sprite.anchorY;
    for (let y = 0; y < upright.h; y++) {
      const start = (y + dy) * first.w + dx;
      assert.deepEqual(first.d.subarray(start, start + upright.w), upright.d.subarray(y * upright.w, (y + 1) * upright.w),
        'the fall starts from the selected Low ready art at the same world position');
    }
    const ctx = document.createElement('canvas').getContext('2d');
    let draw, origin;
    ctx.translate = (x, y) => { origin = [x, y]; };
    ctx.drawImage = (...args) => { draw = args; };
    const cam = { x: p.x - 100, y: p.y - 80, S: 2, pxW: 480, pxH: 300 };
    p.face = face;
    g.placePlayer(cam);
    p.face = -face;
    p.hurt(1e9, null, 'A charging boar');
    const at = (seconds, expected, anchor) => {
      g.deathT = seconds;
      g.drawFallen(ctx, cam);
      assert.deepEqual(origin, [200, 160]);
      assert.equal(draw[0], expected);
      assert.deepEqual(draw.slice(1), [-expected.width, -2 * anchor, expected.width * 2, expected.height * 2]);
    };
    at(0, p._rect[4].white(face < 0), sprite.anchorY);
    const landed = fall.frames[fall.frameAt(fall.wisp.release - .01)];
    at(fall.wisp.release - .01, landed.get(face < 0), fall.anchorY);

    const remains = fall.frames.at(-1);
    const { w, h, d } = remains.buf;
    const body = bounds({ ...landed.buf, d: landed.buf.d.map((color, i) => d[i] ? 0 : color) });
    assert.ok(body.x1 - body.x0 > body.y1 - body.y0, 'her body is lying down at soul release');
    const soulX = w / 2 + fall.wisp.offsetX, soulY = fall.anchorY + fall.wisp.offsetY;
    assert.ok(soulX >= body.x0 && soulX <= body.x1 && soulY >= body.y0 && soulY <= body.y1,
      'the rising soul starts inside her fallen silhouette');
    assert.ok(!fall.wisp.sinks);
    const axes = [];
    for (let x = 0; x < w; x++) {
      let lowest = -1;
      for (let y = 0; y < h; y++) if (d[y * w + x]) lowest = y;
      if (lowest === -1) continue;
      const last = axes.at(-1);
      if (last?.right === x - 1) {
        last.right = x;
        last.foot = Math.max(last.foot, lowest);
      } else axes.push({ left: x, right: x, foot: lowest });
    }
    assert.equal(axes.length, 2, 'two separate weapon silhouettes remain');
    for (const axe of axes) {
      assert.ok(axe.right - axe.left >= 4, 'each surviving axe has a distinct blade');
      assert.ok(Math.abs(axe.foot - fall.anchorY) <= 2, 'both axes rest at the world ground line');
    }
    // Complete the actual terminal hit and render the frozen scene beneath the results.
    at(g.deathTiming.end - .02, remains.get(face < 0), fall.anchorY);
    g.update(1 / 30);
    assert.equal(g.state, 'over');
    assert.equal(g.result.hero, 'berserker');
    assert.equal(g.result.died, true);
    assert.equal(g.result.stats.killedBy, 'A charging boar');
    at(g.deathT, remains.get(face < 0), fall.anchorY);
  }, 'berserker');
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
        assert.ok(wisp.release + wisp.duration < g.deathTiming.end);
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
      assert.equal(sample(g.deathTiming.end - wisp.release), null);
    }, hero);
  }
});

test("the killer caption leaves Aldric's wisp, sword and shield visible", () =>
  game((g, p) => {
    p.hurt(1e9);
    g.deathT = g.deathTiming.name + .5;
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

test('a revive returns the Knight and Berserker to play with no fall or killer', () =>
  ['knight', 'berserker'].forEach(hero => game((g, p) => {
    p.revivals = 1;
    p.hurt(1e9);
    assert.ok(!p.dead && g.state === 'play');
    assert.equal(g.deathT, undefined);
    assert.equal(g.stats.killedBy, null);
  }, hero)));

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
