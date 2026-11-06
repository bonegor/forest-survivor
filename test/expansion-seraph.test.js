import assert from 'node:assert/strict';
import test from 'node:test';
import '../tools/headless.mjs';
import { WEAPONS } from '../public/js/data/weapons.js';
import { SPR } from '../public/js/engine/sprites.js';
import { mulberry32 } from '../public/js/engine/util.js';
import blueprint from '../public/js/expansion/weapons/seraph.js';
import behavior from '../public/js/expansion/weapons/seraph-behavior.js';
import { Game, strikeClip } from '../public/js/game/game.js';
import { KINDS, Weapon } from '../public/js/game/weapons.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function combat(run) {
  const random = Math.random;
  Math.random = mulberry32(2144);
  WEAPONS[blueprint.id] = blueprint.weapon;
  WEAPONS[blueprint.weapon.evo.into] = blueprint.evolution;
  KINDS[blueprint.id] = behavior;
  try {
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    const p = g.player;
    p.hero = { ...p.hero, weapon: blueprint.id, sprite: 'seraph' };
    const w = new Weapon(g, blueprint.id, 1);
    p.weapons = [w];
    w.cd = 0;
    g.world.solid = () => false;
    g.world.lineOfSight = () => true;
    run(g, p, w);
  } finally {
    Math.random = random;
  }
}

function enemy(g, dx, dy, extra = {}) {
  const p = g.player;
  return g.spawnEnemy('zombie', p.x + dx, p.y + dy, { instant: true, hpMul: 100, ...extra });
}

const wounded = e => e.hp < e.maxHp;
const rebuild = g => g.grid.rebuild(g.enemies, g.player.x, g.player.y);
const cast = (g, w) => g.effects.filter(e => e.w === w).at(-1);

test('Sunwing Edge cuts the middle at release, then separately sweeps both flanks', () => combat((g, p, w) => {
  const lead = enemy(g, 18, 0), left = enemy(g, 51, -21), right = enemy(g, 51, 21);
  const rear = enemy(g, -14, 0), gap = enemy(g, 53, 0);
  rebuild(g);
  w.update(0);
  assert.equal(p.heroAttack.weapon, w);
  assert.equal(w.cd, w.s.cd);
  assert.ok(wounded(lead));
  assert.ok(!wounded(left) && !wounded(right));
  const leadHp = lead.hp, middle = w.dmgDealt;
  assert.equal(cast(g, w).update(0.12), true);
  assert.ok(!wounded(left) && !wounded(right), 'the wings do not reach their endpoints instantly');
  assert.equal(cast(g, w).update(0.18), true);
  assert.ok(wounded(left) && wounded(right));
  assert.equal(lead.hp, leadHp, 'overlap of a wing and the sword does not hit twice');
  assert.ok(!wounded(rear) && !wounded(gap));
  assert.ok(w.dmgDealt > middle);
  assert.equal(g.stats.damage, w.dmgDealt);
  w.update(0.5);
  assert.equal(g.effects.filter(e => e.w === w).length, 1, 'the next cast waits for its normal cooldown');
}));

test('a cast has one shared crowd cap and never hits or staggers a lone lord twice', () => {
  combat((g, p, w) => {
    const crowd = Array.from({ length: 15 }, (_, i) => enemy(g, 16 + i / 10, 0));
    rebuild(g);
    w.update(0);
    assert.equal(crowd.filter(wounded).length, 2, 'the central blade has its own budget');
    cast(g, w).update(0.31);
    assert.equal(crowd.filter(wounded).length, 5, 'wing hits share the remaining budget');
  });
  combat((g, p, w) => {
    const lord = enemy(g, -18, 0, { lord: true });
    p.face = -1;
    rebuild(g);
    w.update(0);
    const hp = lord.hp;
    assert.ok(wounded(lord));
    cast(g, w).update(0.35);
    assert.equal(lord.hp, hp);
    assert.equal(lord.stunT, 0);
    assert.equal(p.face, -1);
  });
});

test('a real crypt strike releases at the approved frame, stops at stone and evolves', () => combat((g, p, w) => {
  g.inCrypt = {};
  const spr = SPR.seraph;
  assert.equal(spr.attackRelease, 8);
  assert.equal(spr.attackFps, 24);
  const clip = strikeClip(spr);
  const front = enemy(g, 18, 0), blocked = enemy(g, 45, 19);
  const wall = p.x + 28;
  g.world.solid = x => x >= wall;
  g.world.lineOfSight = (x, y, tx) => x < wall && tx <= wall;
  rebuild(g);
  assert.equal(g.strike(), true);
  g.cryptTime = clip.delay - 0.001;
  w.update(clip.delay - 0.001, true);
  assert.ok(!wounded(front));
  assert.equal(cast(g, w), undefined);
  g.cryptTime = clip.delay;
  w.update(0.001, true);
  assert.ok(wounded(front));
  const cut = cast(g, w);
  assert.ok(cut.wings.every(wing => wing.every(pos => pos.x < wall)));
  cut.update(0.35);
  assert.ok(!wounded(blocked));
  for (let rank = 1; rank < 8; rank++) w.levelUp();
  const peak = w.s;
  assert.ok(w.evolve());
  assert.equal(cut.update(0), false, 'evolution retires an old swing');
  assert.ok(w.s.dmg > peak.dmg && w.s.wing > peak.wing && w.s.cd < peak.cd && w.s.area > peak.area);
}));

test('haste can begin the next swing while a previous wing is still travelling', () => combat((g, p, w) => {
  assert.ok(w.evolve());
  p.cooldown = 0.35;
  p.area = 3;
  p.addBuff('haste', 4);
  w.recompute();
  w.cd = 0;
  const flank = enemy(g, 108, 45);
  rebuild(g);
  const dt = 1 / 120;
  for (let frame = 0; frame < 120; frame++) {
    g.time += dt;
    w.update(dt);
    g.effects = g.effects.filter(effect => effect.w !== w || effect.update(dt));
  }
  assert.ok(wounded(flank), 'fast repeated swings must not cancel distant damage');
  assert.ok(w.dmgDealt > 2 * Math.round(w.s.dmg * w.s.wing));
}));
