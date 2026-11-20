import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { input } from '../public/js/engine/input.js';

const frames = (g, n) => { for (let i = 0; i < n; i++) g.update(1 / 60); };
function scenario(hero, run) {
  const bot = input.bot;
  input.bot = { x: 0, y: 0 };
  try {
    const g = new Game({ hero, mode: 's15', headless: true,
      meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    g.spawner.update = () => {};
    g.player.devGod = true;
    run(g, g.player, g.mainWeapon());
  } finally { input.bot = bot; }
}
function enter(g) {
  g.enterCrypt({ key: '2,0', depth: 1, x: g.player.x, y: g.player.y });
  frames(g, 100);
  assert.ok(g.inCrypt);
  g.enemies = []; g.effects = []; g.projectiles = [];
  g.grid.rebuild(g.enemies, g.player.x, g.player.y);
}

for (const hero of ['mage', 'paladin']) for (const exit of ['stairs', 'faint']) {
  test(`${hero}: a pending manual release and target cannot cross a crypt ${exit} transition`, () => scenario(hero, (g, p, w) => {
    enter(g);
    const target = g.spawnEnemy('zombie', p.x + 24, p.y, { instant: true, always: true, hpMul: 1000 });
    g.world.lineOfSight = () => true;
    g.grid.rebuild(g.enemies, p.x, p.y);
    w.cd = 0;
    assert.equal(g.strike(), true);
    assert.notEqual(w.handAt, null);
    assert.equal(w.handTarget, target);
    const cd = w.cd;
    if (exit === 'stairs') g.leaveCrypt(); else g.faint();
    for (let i = 0; i < 240 && (g.inCrypt || g.state !== 'play'); i++) g.update(1 / 60);
    assert.equal(g.inCrypt, null);
    assert.equal(w.handAt, null, 'departed strike must not be released in the forest');
    assert.equal(w.handTarget, null, 'departed target may now be pooled');
    assert.equal(w.queue, 0, 'a delayed volley belongs to its original world');
    assert.ok(w.cd > cd - .05 && w.cd <= cd, 'travel neither refunds nor restarts the cooldown');
    frames(g, 20);
    assert.ok(w.cd > 0, 'fresh automatic attacks are still cooling down');
    assert.equal(g.projectiles.length, 0, 'no old queued projectile appears after returning');
  }));
}

test('entering a crypt discards a field volley without changing its cooldown', () => scenario('mage', (g, p, w) => {
  w.level = 8; w.recompute(); w.cd = 0;
  frames(g, 1);
  assert.ok(w.queue > 0, 'real rank-eight fireball has follow-up shots waiting');
  const cd = w.cd;
  enter(g);
  assert.equal(w.queue, 0);
  assert.equal(w.handAt, null);
  assert.ok(w.cd > cd - .3 && w.cd <= cd);
  frames(g, 30);
  assert.equal(g.projectiles.length, 0, 'field volley cannot autofire below');
}));

test('movement within the same crypt retains and releases a valid manual volley', () => scenario('mage', (g, p, w) => {
  enter(g); w.cd = 0;
  assert.equal(g.strike(), true);
  input.bot = { x: .25, y: 0 };
  frames(g, 15);
  assert.equal(w.handAt, null);
  assert.ok(g.projectiles.some(shot => shot.kind === 'fireball'), 'moving never cancels a valid release');
}));

for (const fallback of [false, true]) {
  test(`a recycled manual target cannot steal Druid's delayed roots${fallback ? ' from a nearby living foe' : ''}`, () => scenario('druid', (g, p, w) => {
    enter(g);
    g.world.solid = () => false; g.world.lineOfSight = () => true;
    const target = g.spawnEnemy('zombie', p.x + 24, p.y, { instant: true, always: true });
    target.spd = 0; g.grid.rebuild(g.enemies, p.x, p.y);
    // Allow the pool to recycle a queued target before the weapon update consumes it.
    w.strike(0, 0.1, target);
    const oldId = target.id;
    g.killEnemy(target); frames(g, 1);
    const recycled = g.spawnEnemy('zombie', p.x + 300, p.y, { instant: true, always: true });
    recycled.spd = 0;
    assert.equal(recycled, target, 'real Game pool reuses the chosen target object');
    assert.notEqual(recycled.id, oldId);
    const near = fallback && g.spawnEnemy('zombie', p.x + 40, p.y, { instant: true, always: true });
    if (near) near.spd = 0;
    const roots = [];
    for (let i = 0; i < 20; i++) {
      frames(g, 1);
      roots.push(...g.effects.filter(effect => effect.constructor.name === 'Burrow'));
    }
    assert.ok(!roots.some(effect => effect.target === recycled), 'new identity beyond reach cannot inherit the old selection');
    if (near) assert.ok(roots.some(effect => effect.target === near), 'release can select a valid nearby replacement');
    else assert.equal(roots.length, 0, 'no eligible foe means no root cast');
    assert.equal(w.handTarget, null);
  }));
}

test('a living manual target keeps its identity while moving before release', () => scenario('druid', (g, p, w) => {
  enter(g);
  g.world.solid = () => false; g.world.lineOfSight = () => true;
  const target = g.spawnEnemy('zombie', p.x + 24, p.y, { instant: true, always: true });
  target.spd = 0; g.grid.rebuild(g.enemies, p.x, p.y);
  w.cd = 0; assert.equal(g.strike(), true);
  target.x = p.x + 48;
  frames(g, 1);
  assert.ok(g.effects.some(effect => effect.constructor.name === 'Burrow' && effect.target === target));
}));
