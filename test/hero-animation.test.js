import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { SPR, idleFrame, walkFrame } from '../public/js/engine/sprites.js';
import { HEROES } from '../public/js/data/heroes.js';
import { input } from '../public/js/engine/input.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { heroAttackPose, strikeClip } from '../public/js/game/hero-animation.js';

const changed = ['knight', 'mage', 'necromancer', 'paladin', 'druid', 'berserker', 'witchhunter'];
function run(id, fn) {
  const before = input.bot;
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: id, mode: 's15', meta: metaBonuses(defaultProfile()), settings: {}, crypts: false });
    g.spawner.update = () => {};
    g.player.devGod = true;
    return fn(g, g.player, g.mainWeapon(), SPR[id]);
  } finally { input.bot = before; }
}

for (const id of Object.keys(HEROES)) test(`${id}: automatic field attacks preserve idle and walk in both directions`, () => {
  for (const face of [-1, 1]) for (const moving of [false, true]) run(id, (g, p, w) => {
    const spr = SPR[p.hero.sprite];
    p.face = face; p.aim = face < 0 ? Math.PI : 0;
    input.bot = { x: moving ? face : 0, y: 0 };
    const e = g.spawnEnemy('skeleton', p.x + face * 24, p.y, { instant: true, always: true, hpMul: 1000 });
    e.speed = 0;
    let fired = false;
    for (let i = 0; i < 120; i++) {
      g.update(1 / 60);
      g.placePlayer(g.cam);
      const step = Math.floor(p.anim * (spr.walk ? 1.4 : 1) * spr.motionRate);
      const expected = p.moving ? walkFrame(spr, step) : idleFrame(spr, Math.floor(p.anim * spr.idleRate));
      assert.equal(p._rect[4], expected, 'field renderer always selects idle or walk');
      assert.equal(heroAttackPose(g, spr, step), null);
      if (!p.heroAttack) continue;
      fired = true;
      assert.equal(p.face, face, 'animation never changes facing');
    }
    assert.ok(fired, 'the signature weapon actually fired');
  });
});

test('every authored moving attack retains eight distinct lower-body phases and its ground anchor', () => {
  for (const id of changed.filter(id => id !== 'knight')) run(id, (g, p, w, spr) => {
    if (!spr.attackWalk) return; // Imported sheets use their walk clip during a moving strike.
    assert.equal(spr.attackWalk.length, spr.attack.length);
    p.moving = true;
    g.inCrypt = {};
    p.strikeAng = 0;
    const clip = strikeClip(spr);
    for (let k = 0; k < spr.attack.length; k++) {
      const legs = new Set();
      for (let j = 0; j < spr.walk.length; j++) {
        const frame = spr.frames[spr.attackWalk[k][j]], b = frame.buf;
        legs.add([...b.d.slice(33 * b.w, 40 * b.w)].join(','));
        assert.ok([...b.d.slice((spr.anchorY - 1) * b.w, spr.anchorY * b.w)].some(c => c >>> 24), `${id}/${k}/${j}: supporting foot`);
        if (k >= spr.attackRelease) {
          p.strikeAt = g.clock - clip.delay - (k - clip.hit + .1) / spr.attackFps;
          assert.equal(heroAttackPose(g, spr, j).frame, frame);
        }
      }
      assert.ok(legs.size >= 6, `${id}/${k}: legs continue stepping`);
    }
  });
});

test('rear shots, failed casts and imported moving attacks cannot replace the gait with a planted pose', () => {
  for (const id of ['mage', 'paladin', 'druid', 'witchhunter']) run(id, (g, p, w, spr) => {
    g.inCrypt = {};
    p.moving = true; p.face = 1;
    p.strikeAt = g.clock; p.strikeAng = Math.PI;
    assert.equal(heroAttackPose(g, spr, 0), null);
    assert.equal(p.face, 1);
  });
  for (const id of ['paladin', 'druid', 'witchhunter']) run(id, (g, p, w, spr) => {
    w.cd = .1;
    assert.equal(heroAttackPose(g, spr, 0), null, 'no target: no false wind-up');
    g.update(.15);
    assert.equal(p.heroAttack, null, 'a failed attempt is not a release');
  });
  run('knight', (g, p, w, spr) => {
    p.moving = true; p.heroAttack = { at: g.clock, ang: 0, weapon: w };
    assert.equal(heroAttackPose(g, spr, 0), null);
    g.inCrypt = {}; p.strikeAt = g.clock; p.strikeAng = 0;
    g.placePlayer(g.cam);
    assert.ok(spr.walk.includes(spr.frames.indexOf(p._rect[4])), 'crypt strike keeps the imported walk');
  });
});

test('secondary weapons cannot trigger the signature pose; evolved signature weapons can', () => run('mage', (g, p, w, spr) => {
  g.addWeapon('sword');
  const sword = p.weapons.find(w => w.id === 'sword');
  w.cd = 100; sword.cd = 0; sword.update(.01);
  assert.equal(p.heroAttack, null);
  w.evolve(); w.cd = 0; w.update(.01);
  assert.equal(p.heroAttack.weapon, w);
  assert.equal(heroAttackPose(g, spr, 0), null, 'even evolved field attacks keep the idle pose');
}));

for (const id of Object.keys(HEROES)) test(`${id}: crypt strikes animate only after a manual attack, then return to idle`, () => {
  for (const face of [-1, 1]) run(id, (g, p, w) => {
    const spr = SPR[p.hero.sprite], clip = strikeClip(spr);
    g.inCrypt = {};
    p.face = face; p.aim = face < 0 ? Math.PI : 0;
    w.cd = 0;
    assert.equal(heroAttackPose(g, spr, 0), null, 'waiting ready does not predict a strike');
    assert.equal(g.strike(), true);
    if (clip) {
      for (let k = clip.from; k < spr.attack.length; k++) {
        g.cryptTime = p.strikeAt + Math.max(0, clip.delay + (k - clip.hit + .1) / spr.attackFps) - g.time;
        g.placePlayer(g.cam);
        assert.equal(p._rect[4], spr.frames[spr.attack[k]], `crypt attack frame ${k}`);
        assert.equal(p._rect[5], face < 0);
      }
      g.cryptTime += 2 / spr.attackFps;
      g.placePlayer(g.cam);
      assert.equal(p._rect[4], idleFrame(spr, Math.floor(p.anim * spr.idleRate)));
    }
    g.inCrypt = null;
    g.cryptTime = p.strikeAt - g.time;
    g.placePlayer(g.cam);
    assert.equal(p._rect[4], idleFrame(spr, Math.floor(p.anim * spr.idleRate)), 'leaving the crypt cannot carry an attack pose outside');
  });
});
