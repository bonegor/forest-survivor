import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { SPR, idleFrame, walkFrame } from '../public/js/engine/sprites.js';
import { HEROES } from '../public/js/data/heroes.js';
import { input } from '../public/js/engine/input.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { heroAttackPose, strikeClip } from '../public/js/game/hero-animation.js';
import baseline from '../tools/animation-round/baseline/index.js';

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

test('new pose counts preserve every hero\'s original manual hit delay', () => {
  const legacy = { knight: 2/10, archer: 2/14, mage: 2/12, rogue: 0, necromancer: 2/12, paladin: 2/13, druid: 2/12, berserker: 2/12, witchhunter: 2/12 };
  for (const [id, data] of Object.entries(baseline)) {
    const expected = legacy[id] ?? Math.min(2, data.attackRelease) / data.attackFps;
    assert.equal(strikeClip(SPR[id]).delay, expected, `${id}: artwork cannot change the damage schedule`);
  }
});

for (const id of Object.keys(HEROES)) test(`${id}: an empty clearing plays quiet idle and walk loops`, () => run(id, (g, p, w, spr) => {
  for (const moving of [false, true]) {
    input.bot = { x: moving ? 1 : 0, y: 0 };
    const seen = new Set();
    for (let i = 0; i < 180; i++) {
      g.update(1/60); g.placePlayer(g.cam);
      const index = spr.frames.indexOf(p._rect[4]);
      assert.ok((moving ? spr.walk : spr.idle).includes(index), 'automatic effects cannot replace quiet locomotion with a combat pose');
      seen.add(index);
    }
    assert.ok(seen.size >= 3, `${moving ? 'walk' : 'idle'} really animates`);
  }
}));

test('the attack remains visible when the sword kills the final nearby foe', () => run('knight', (g, p, w, spr) => {
  const e = g.spawnEnemy('skeleton', p.x + 24, p.y, { instant: true, always: true });
  e.hp = 1; g.grid.rebuild(g.enemies, p.x, p.y);
  w.cd = 0; w.update(0); g.placePlayer(g.cam);
  assert.ok(e.dead);
  assert.equal(p._rect[4], spr.frames[spr.attack[spr.attackRelease]]);
}));

for (const id of Object.keys(HEROES)) test(`${id}: successful field attacks animate, then recover, in both directions`, () => {
  for (const face of [-1, 1]) for (const moving of [false, true]) run(id, (g, p, w) => {
    const spr = SPR[p.hero.sprite];
    p.face = face; p.aim = face < 0 ? Math.PI : 0;
    input.bot = { x: moving ? face : 0, y: 0 };
    const e = g.spawnEnemy('skeleton', p.x + face * 24, p.y, { instant: true, always: true, hpMul: 1000 });
    e.speed = 0;
    let fired = false, attacked = false, recovered = false;
    for (let i = 0; i < 180; i++) {
      e.x = p.x + face * 24; e.y = p.y;
      g.update(1 / 60);
      g.placePlayer(g.cam);
      const step = Math.floor(p.anim * (spr.walk ? 1.4 : 1) * spr.motionRate);
      const pose = heroAttackPose(g, spr, step);
      const expected = pose?.frame ?? (p.moving ? walkFrame(spr, step) : idleFrame(spr, Math.floor(p.anim * spr.idleRate)));
      assert.equal(p._rect[4], expected, 'production renderer selects the attack or current locomotion phase');
      assert.equal(p._rect[5], face < 0);
      if (pose) {
        attacked = true;
        const frames = p.moving && spr.attackWalk ? spr.attackWalk.flat() : spr.attack;
        assert.ok(frames.includes(spr.frames.indexOf(pose.frame)), 'the signature uses an authored attack');
      } else if (attacked) recovered = true;
      if (!p.heroAttack) continue;
      fired = true;
      w.cd = 1000; w.queue = 0; // one real release followed by its complete recovery
      assert.equal(p.face, face, 'animation never changes facing');
    }
    assert.ok(fired, 'the signature weapon actually fired');
    assert.ok(attacked, 'the attack is visible');
    assert.ok(recovered, 'the hero returns to idle or walk after the attack');
  });
});

test('every grounded hero keeps its gait through all attack phases', () => {
  for (const id of Object.keys(HEROES)) run(id, (g, p, w, spr) => {
    if (spr.floating) return;
    assert.ok(spr.attackWalk, `${id}: moving attack clip`);
    assert.equal(spr.attackWalk.length, spr.attack.length);
    p.moving = true; p.face = 1;
    g.inCrypt = {};
    p.strikeAng = 0;
    const clip = strikeClip(spr);
    for (let k = clip.from; k < spr.attack.length; k++) {
      assert.equal(spr.attackWalk[k].length, spr.walk.length);
      const poses = new Set();
      for (let j = 0; j < spr.walk.length; j++) {
        const frame = spr.frames[spr.attackWalk[k][j]], b = frame.buf;
        assert.ok(b.d.some(c => c >>> 24), `${id}/${k}/${j}: nonempty pose`);
        poses.add([...b.d].join(','));
        p.strikeAt = g.clock - Math.max(0, clip.delay + (k - clip.hit + .1) / spr.attackFps);
        assert.equal(heroAttackPose(g, spr, j).frame, frame);
      }
      assert.ok(poses.size >= 4, `${id}/${k}: the moving attack keeps distinct gait phases`);
    }
  });
});

test('rear shots and failed casts never invent a forward attack or turn the hero', () => {
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
  for (const id of Object.keys(HEROES)) run(id, (g, p, w, spr) => {
    p.face = 1; p.heroAttack = { at: g.clock, ang: Math.PI, weapon: w };
    assert.equal(heroAttackPose(g, spr, 0), null, 'a rear release does not fake a forward attack');
    p.heroAttack = { at: g.clock + 1, ang: 0, weapon: w };
    assert.equal(heroAttackPose(g, spr, 0), null, 'a future receipt cannot play early');
    assert.equal(p.face, 1);
  });
});

test('secondary weapons cannot trigger the signature pose; evolved signature weapons can', () => run('mage', (g, p, w, spr) => {
  g.spawnEnemy('skeleton', p.x + 100, p.y, { instant: true, always: true, hpMul: 1000 });
  g.grid.rebuild(g.enemies, p.x, p.y);
  g.addWeapon('sword');
  const sword = p.weapons.find(w => w.id === 'sword');
  w.cd = 100; sword.cd = 0; sword.update(.01);
  assert.equal(p.heroAttack, null);
  w.evolve(); w.cd = 0; w.update(.01);
  assert.equal(p.heroAttack.weapon, w);
  assert.equal(heroAttackPose(g, spr, 0).frame, spr.frames[spr.attack[spr.attackRelease]], 'the evolved signature shows its release at the real firing time');
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
