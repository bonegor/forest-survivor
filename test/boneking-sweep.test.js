import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { Game } from '../public/js/game/game.js';
import { BoneKingSweepWarning } from '../public/js/game/boneking-sweep-fx.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

const STEP = 1 / 60;
const WINDUP = 0.7;
const SWEEP_FRAME = 20;

function advance(g, ticks, dt = STEP) {
  for (let tick = 0; tick < ticks; tick++) g.update(dt);
}

function arena(run, { kind = 'boneking', face = 1, legged = false, health = 0.4, crypts = false } = {}) {
  const oldRandom = Math.random;
  const oldBot = input.bot;
  Math.random = mulberry32(7127);
  input.bot = { x: 0, y: 0 };
  try {
    const g = new Game({
      hero: 'knight', mode: 's15', map: 'forest', headless: true, crypts,
      meta: metaBonuses(defaultProfile()), settings: { numbers: false, boneKingLegs: legged },
    });
    const p = g.player;
    g.spawner.update = () => {};
    g.enemies.length = 0;
    p.weapons.length = 0;
    p.invuln = 0;
    const king = g.spawnEnemy(kind, p.x - face * 30, p.y, { instant: true, always: true });
    Object.assign(king, { aware: true, dead: false, sleeping: false, dormant: false,
      face: -face, hp: king.maxHp * health, cdT: 99, cd2: 99, cd3: 0 });
    const hits = [];
    const hurt = p.hurt.bind(p);
    p.hurt = (raw, source, by, boss) => {
      hits.push({ raw, by, boss, frame: king.frameIndex(), life: king.life });
      return hurt(raw, source, by, boss);
    };
    run(g, king, p, hits);
  } finally {
    Math.random = oldRandom;
    input.bot = oldBot;
  }
}

function startSweep(g, king, dt = STEP) {
  advance(g, 1, dt);
  assert.equal(king.pose, 'sweepWind');
  const warnings = g.effects.filter(effect => effect instanceof BoneKingSweepWarning);
  assert.equal(warnings.length, 1, 'one sword warning at the start of windup');
  return warnings[0];
}

function throughWarning(g, king, p, hits, warning, dt = STEP) {
  const start = king.poseAt;
  const hp = p.hp;
  const maxTicks = Math.ceil(WINDUP / dt) + 3;
  for (let tick = 0; g.effects.includes(warning) && tick < maxTicks; tick++) {
    assert.equal(hits.length, 0, 'no melee or unwarned close-range shot during the warning');
    assert.equal(p.hp, hp, 'no health lost in windup');
    assert.equal(g.eshots.length, 0, 'the five-bone fan waits for the warned swing');
    advance(g, 1, dt);
  }
  assert.ok(!g.effects.includes(warning), 'the warning ends on release');
  const elapsed = king.life - start;
  assert.ok(elapsed >= WINDUP - 1e-8 && elapsed <= WINDUP + dt + 1e-8, `release at ${elapsed}s`);
  assert.equal(king.pose, 'sweep');
  assert.equal(king.frameIndex(), SWEEP_FRAME, 'the impact pose shows on the release tick');
  assert.equal(g.eshots.length, 5, 'the original fan releases all five bones on the same tick');
  return start;
}

for (const health of [1, 0.5]) {
  test(`the sword sweep is unavailable at ${health * 100}% health`, () => {
    arena((g, king, p, hits) => {
      king.spd = 0;
      advance(g, 60);
      assert.equal(king.phase, 0);
      assert.equal(g.effects.some(effect => effect instanceof BoneKingSweepWarning), false);
      assert.equal(g.eshots.length, 0);
      assert.equal(hits.length, 0);
    }, { health });
  });
}

for (const legged of [false, true]) {
  for (const face of [-1, 1]) {
    test(`${legged ? 'legged' : 'floating'} Bone King warns and hits once on the ${face < 0 ? 'left' : 'right'} sweep frame`, () => {
      arena((g, king, p, hits) => {
        const dt = face > 0 ? STEP : 1 / 53;
        const hp = p.hp;
        const warning = startSweep(g, king, dt);
        assert.equal(king.phase, 1);
        assert.equal(king.face, face, 'faces the warning direction when the attack starts');
        const castStart = throughWarning(g, king, p, hits, warning, dt);
        assert.equal(king.face, face);
        assert.equal(hits.length, 1);
        const [hit] = hits;
        const expected = 20 * (1 + (g.dmgScale - 1) * 0.6) * g.bossPower;
        assert.ok(Math.abs(hit.raw - expected) < 1e-8);
        assert.equal(hit.frame, SWEEP_FRAME);
        assert.ok(hit.life - castStart >= WINDUP - 1e-8);
        assert.equal(hit.by, `${king.def.name}'s sword sweep`);
        assert.ok(p.hp < hp, 'the actual hero receives damage');
        assert.equal(g.stats.fromBoss, hp - p.hp, 'damage is attributed to the boss');

        // Isolate the retraction from ordinary contact and the independent fan.
        g.eshots.length = 0;
        king.spd = 0;
        let recovered = false;
        for (let tick = 0; tick < 24; tick++) {
          p.invuln = 0;
          advance(g, 1, dt);
          recovered ||= king.frameIndex() === 21;
        }
        assert.ok(recovered, 'the swing continues to its retraction pose');
        assert.equal(hits.length, 1, 'the retraction cannot hit a second time');
      }, { face, legged });
    });
  }
}

for (const [label, x, y] of [['behind him', -30, 0], ['past the sword tip', 55, 0], ['inside the arc’s hollow', 5, -16]]) {
  test(`dodging ${label} avoids the melee without redirecting or suppressing the fan`, () => {
    arena((g, king, p, hits) => {
      king.dmg = 0; // the hollow can sit near his independent body contact radius
      const warning = startSweep(g, king);
      const hp = p.hp;
      p.x = king.x + x;
      p.y = king.y + y;
      throughWarning(g, king, p, hits, warning);
      assert.equal(king.face, 1, 'the boss keeps his warned facing');
      assert.equal(hits.length, 0);
      assert.equal(p.hp, hp);
      assert.ok(Math.cos(g.eshots[2].ang) > 0.999, 'the center bone follows the original rightward aim');
      assert.ok(Math.abs(Math.sin(g.eshots[2].ang)) < 0.001, 'the fan does not retarget vertically');
    });
  });
}

test('a hit flash does not stretch the sword outside the marked sweep', () => {
  arena((g, king, p, hits) => {
    const warning = startSweep(g, king);
    throughWarning(g, king, p, hits, warning);

    const ctx = document.createElement('canvas').getContext('2d');
    king.draw(ctx, g.cam);
    const impact = [...king._rect];
    king.flash = 0.09;
    king.draw(ctx, g.cam);
    assert.deepEqual(king._rect, impact);
    assert.equal(king._img, king.drawSprite.frames[SWEEP_FRAME].white(false));
  });
});

test('a distant hero gets the existing ranged fan after the warning and takes no sword damage', () => {
  arena((g, king, p, hits) => {
    p.x = king.x + 130;
    const warning = startSweep(g, king);
    throughWarning(g, king, p, hits, warning);
    assert.equal(hits.length, 0);
  });
});

test('the wounded Bone King still starts his five-bone attacks 3.75 seconds apart', () => {
  arena((g, king, p) => {
    p.devGod = true;
    king.spd = 0;
    const first = startSweep(g, king);
    const start = king.poseAt;
    let second;
    for (let tick = 0; tick < 5 * 60 && !second; tick++) {
      advance(g, 1);
      second = g.effects.find(effect => effect instanceof BoneKingSweepWarning && effect !== first);
    }
    assert.ok(second, 'a subsequent warning starts');
    assert.ok(Math.abs(king.poseAt - start - 3.75) <= STEP + 1e-8, `cadence was ${king.poseAt - start}s`);
  });
});

test('the sword warning cancels once its boss dies, including after that body is reused', () => {
  arena((g, king, p, hits) => {
    const warning = startSweep(g, king);
    const id = king.id;
    g.killEnemy(king);
    advance(g, 1);
    assert.ok(!g.effects.includes(warning), 'death removes the outstanding warning');
    const reused = g.spawnEnemy('zombie', p.x + 200, p.y, { instant: true, always: true, sleeping: true });
    assert.equal(reused, king, 'the enemy pool really reused the former boss object');
    assert.notEqual(reused.id, id);

    // Even a stale queued warning must reject the new spawn identity.
    g.effects.push(warning);
    advance(g, 60);
    assert.ok(!g.effects.includes(warning));
    assert.equal(g.eshots.length, 0);
    assert.equal(hits.length, 0);
  });
});

test('entering a crypt discards the sword warning with the rest of the forest effects', () => {
  arena((g, king, p, hits) => {
    p.devGod = true;
    king.dmg = 0;
    const warning = startSweep(g, king);
    g.enterCrypt({ key: '2,0', depth: 1, x: p.x, y: p.y });
    advance(g, 110);
    assert.ok(g.inCrypt);
    assert.ok(g.forestState.enemies.includes(king), 'the same living boss is still outside');
    assert.ok(!g.effects.includes(warning));
    assert.equal(g.eshots.length, 0);

    g.leaveCrypt();
    advance(g, 130);
    assert.equal(g.inCrypt, null);
    assert.ok(g.enemies.includes(king));
    assert.ok(!g.effects.includes(warning));
    assert.equal(g.eshots.length, 0, 'the canceled fan does not fire on return');
    assert.equal(hits.filter(hit => hit.boss === king.def.name).length, 0);
  }, { crypts: true });
});

for (const kind of ['pharaoh', 'pitlord']) {
  test(`${kind} keeps its existing volley and does not use the Bone King sword`, () => {
    arena((g, boss, p, hits) => {
      advance(g, 1);
      assert.equal(boss.phase, 1);
      assert.equal(boss.pose, 'volley');
      assert.equal(g.eshots.length, 5);
      assert.equal(g.effects.some(effect => effect instanceof BoneKingSweepWarning), false);
      assert.equal(hits.length, 0);
    }, { kind });
  });
}
