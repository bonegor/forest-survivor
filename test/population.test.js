import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { killCredit } from '../public/js/shared/population.js';
import * as P from '../public/js/shared/profile.js';

test('Normal kill credit offsets the actual spawn curve across maps and run phases', () => {
  for (const mode of ['s15', 'dungeon']) for (const map of ['desert', 'forest', 'hell']) {
    const normal = new Game({ hero: 'knight', mode, map, diff: 'easy', settings: {}, meta: P.metaBonuses(P.defaultProfile()) });
    const veteran = new Game({ hero: 'knight', mode, map, diff: 'medium', settings: {}, meta: P.metaBonuses(P.defaultProfile()) });
    for (const phase of [0, 1.4, 6.3, 12.6, 14, 21, 30]) {
      const credited = normal.spawner.rate(phase) * killCredit(phase, 'easy', false, mode);
      assert.ok(Math.abs(credited - veteran.spawner.rate(phase)) < 1e-9, `${mode}/${map}/${phase}`);
    }
  }
  assert.equal(killCredit(14, 'medium'), 1, 'Veteran is unchanged');
  assert.equal(killCredit(14, 'hard'), 0.5, 'Elite is unchanged');
  assert.equal(killCredit(14, 'hard', true), 1 / 6, 'Nightmare retains its further division');
  assert.ok(killCredit(21, 'easy') < killCredit(0, 'easy'), 'the soft cap is accounted for');
});

test('earned kill credit is never revalued, and live milestones agree with the saved report', () => {
  const g = new Game({ hero: 'knight', mode: 's15', map: 'desert', diff: 'easy', settings: {}, meta: P.metaBonuses(P.defaultProfile()) });
  const slay = () => {
    const e = g.spawnEnemy('rat', g.player.x + 40, g.player.y, { instant: true });
    g.killEnemy(e);
    g.enemyPool.put(e);
    g.enemies.length = 0;
  };
  slay();
  const early = g.killEffort;
  g.time = 600;
  assert.equal(g.runReport().effort, early, 'waiting does not take earned credit away');
  slay();
  assert.ok(Math.abs(g.killEffort - early - killCredit(g.phase, 'easy')) < 1e-9);
  const report = g.runReport();
  const saved = P.applyRun(P.defaultProfile(), report).profile.effort;
  assert.equal(saved, Math.round(g.killEffort));
  assert.equal(g.lockReached({ need: 'kills', from: 0, at: saved, after: 0 }), true);
  assert.equal(g.lockReached({ need: 'kills', from: 0, at: saved + 1, after: 0 }), false);
  const forged = P.sanitizeRun({ ...report, effort: 1e99 });
  assert.ok(forged.effort <= Math.round(report.kills * P.PROGRESS.effort.easy));
  assert.equal(P.applyRun({ ...P.defaultProfile(), effort: 5000 }, { ...report, kills: 0, effort: 0 }).profile.effort, 5000, 'existing progression is preserved');
});

test('the production run report includes gear, evolutions and deaths for both browser and bots', () => {
  const g = new Game({ hero: 'knight', mode: 's15', map: 'desert', diff: 'easy', settings: {}, meta: P.metaBonuses(P.defaultProfile()) });
  g.time = 150;
  g.player.weapons[0].evolve();
  g.itemsFound = 1;
  g.gear.ring = { slot: 'ring', rarity: 0, stats: { crit: 2 }, power: null, seed: 1 };
  g.state = 'dying';
  g.finish(false);
  const report = g.runReport();
  assert.equal(report.died, true);
  assert.equal(report.evolved, true);
  assert.deepEqual(report.evos, ['excalibur']);
  assert.equal(report.found, 1);
  assert.deepEqual(report.gear, g.result.gear);
  for (const key of Object.keys(report)) assert.deepEqual(report[key], g.result[key], key);
  g.gold += 50;
  assert.equal(g.runReport().gold, report.gold, 'completed reports retain the result snapshot');
});
