import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { FURY } from '../public/js/game/player.js';
import { PASSIVES } from '../public/js/data/passives.js';
import { input } from '../public/js/engine/input.js';
import { SPR } from '../public/js/engine/sprites.js';
import { applyRun, defaultProfile, metaBonuses, openFor } from '../public/js/shared/profile.js';
import { cardChange } from '../public/js/ui/gamescreen.js';

const RELICS = ['wardrum', 'pilgrimcord', 'bulwarkseal'];
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} should be ${expected}`);

function game(open) {
  const g = new Game({ hero: 'knight', mode: 's15', diff: 'medium', meta: metaBonuses(defaultProfile()), open, crypts: false });
  g.spawner.update = () => {};
  g.update(1 / 60);
  return g;
}

test('expansion relic milestones grant normal upgrade cards and bottom-row HUD icons', () => {
  const profile = defaultProfile();
  const locked = game(openFor(profile, 'knight'));
  assert.ok(!locked.upgradePool().some(c => RELICS.includes(c.id)));

  const earned = applyRun(profile, { mode: 's15', diff: 'medium', hero: 'knight', time: 180, realTime: 180, level: 12, bosses: 2 }).profile;
  const g = game(openFor(earned, 'knight'));
  for (const id of RELICS) {
    const card = g.upgradePool().find(c => c.id === id);
    assert.ok(card?.isNew, `${id} may enter the build`);
    assert.match(cardChange(g, card), /→/);
    g.applyChoice(card, true);
    for (let level = 2; level <= PASSIVES[id].max; level++) {
      const next = g.upgradePool().find(c => c.id === id);
      assert.equal(next?.level, level);
      g.applyChoice(next, true);
    }
    assert.equal(g.player.passives.get(id), PASSIVES[id].max);
    assert.ok(!g.upgradePool().some(c => c.id === id));
  }
  assert.equal(g.player.passives.size, g.maxRelics);
  assert.ok(!g.upgradePool().some(c => c.type === 'passive' && c.isNew));

  const drawn = [];
  g.hud.slot = (ctx, x, y, spr, level, max, evolved, small) => {
    if (small) drawn.push([spr, level, max]);
  };
  g.hud.drawSlots(document.createElement('canvas').getContext('2d'), g.player);
  assert.deepEqual(drawn, RELICS.map(id => {
    const relic = PASSIVES[id], sprite = SPR[relic.icon];
    assert.ok(sprite?.frames[0]);
    return [sprite, relic.max, relic.max];
  }));
});

test('Bulwark Seal guards a heavy hit, ignores chip damage and rests for eight seconds', () => {
  const g = game(), p = g.player;
  const hurt = raw => {
    p.hp = p.maxHp;
    p.invuln = 0;
    return p.hurt(raw);
  };
  const chip = hurt(4), heavy = hurt(40);
  g.addPassive('bulwarkseal', 5);
  assert.equal(hurt(4), chip);
  assert.equal(p.sealReadyAt, 0);
  assert.equal(hurt(40), Math.round(heavy * 0.6));
  const ready = p.sealReadyAt;
  assert.equal(hurt(40), heavy);
  g.time = ready - 0.001;
  assert.equal(hurt(40), heavy);
  g.time = ready;
  assert.equal(hurt(40), Math.round(heavy * 0.6));
});

test('War Drum only boosts combat Fury and keeps the horde limit and orb cap', () => {
  const g = game(), p = g.player;
  g.addPassive('wardrum', 4);
  p.fury = 0;
  p.furyHit({ boss: true, maxHp: 100 }, 10);
  near(p.fury, 0.1 * FURY.hit.boss * 1.28);
  p.recentKills = 400;
  const before = p.fury, share = p.killShare;
  p.furyKill({});
  near(p.fury - before, FURY.kill * share * 1.28);
  p.fury = 0;
  p.addFury(40);
  assert.equal(p.fury, 40, 'a Fury pickup has its usual value');
  p.fury = 0;
  const taken = p.hurt(10);
  near(p.fury, FURY.hurt * taken / p.maxHp);
  p.fury = 98;
  p.furyKill({ boss: true });
  assert.equal(p.fury, 100);
});

test('Pilgrim’s Cord heals after real walking, with no charge against a wall or on ice', () => {
  const g = game(), p = g.player, oldBot = input.bot;
  g.world.topo = null;
  p.hp = p.maxHp / 2;
  const tick = () => { for (let frame = 0; frame < 60; frame++) p.update(1 / 60); };
  try {
    input.bot = { x: 1, y: 0 };
    g.addPassive('pilgrimcord', 5);
    const wall = p.x;
    g.world.collide = entity => { entity.x = wall; };
    tick();
    assert.equal(p.pilgrimDistance, 0);
    g.world.collide = () => {};
    p.slide = { x: 1, y: 0 };
    tick();
    assert.equal(p.pilgrimDistance, 0);
    p.slide = null;
    const start = p.x;
    tick();
    near(p.pilgrimDistance, p.x - start);
    assert.equal(p.trickled, 0);
    tick();
    tick();
    near(p.pilgrimDistance, p.x - start - 150);
    assert.ok(p.hp > p.maxHp / 2 + p.regen * 5, 'walking contributes health beyond passive regeneration');
  } finally {
    input.bot = oldBot;
  }
});
