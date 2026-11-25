import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../tools/slice.mjs', import.meta.url));

test('recorded slices follow the recording seed and preserve the last complete baseline on failure', (t) => {
  const cwd = mkdtempSync(join(tmpdir(), 'fs-slice-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const out = join(cwd, 'tools', 'out', 'slice');
  const buildsFile = join(out, 'builds-knight-hard-ranked.json');
  const baselineFile = join(out, 'baseline.json');
  const run = (...args) => spawnSync(process.execPath, [cli, '--mode=ranked', '--jobs=1', '--hz=20', ...args], { cwd, encoding: 'utf8' });
  const slice = (...args) => run('--at=1', '--secs=0.1', '--warm=0', '--save=baseline', ...args);
  const selections = () => JSON.parse(readFileSync(baselineFile)).results.map(({ seed, night }) => [seed, night]);

  const recording = run('--record', '--seed=20', '--nights=2', '--until=1');
  assert.equal(recording.status, 0, recording.stderr);
  // Supply two minute-one builds independently of how long a bot survives in Ranked.
  const recorded = JSON.parse(readFileSync(buildsFile));
  for (const night of recorded.nights) night[1] = { weapons: [['sword', 1]], passives: [] };
  writeFileSync(buildsFile, JSON.stringify(recorded));
  const modern = slice('--seed=19', '--runs=3');
  assert.equal(modern.status, 0, modern.stderr);
  assert.deepEqual(selections(), [[19, 2], [20, 1], [21, 2]]);

  // Old recordings only stored the ordered nights and replayed them from seed 1.
  const legacy = recorded;
  delete legacy.firstSeed;
  writeFileSync(buildsFile, JSON.stringify(legacy));
  const historical = slice('--seed=0', '--runs=2');
  assert.equal(historical.status, 0, historical.stderr);
  assert.deepEqual(selections(), [[0, 2], [1, 1]]);

  // Only the second of these two slices fails inside its simulation worker.
  const baseline = readFileSync(baselineFile, 'utf8');
  delete legacy.nights[1][1].weapons;
  writeFileSync(buildsFile, JSON.stringify(legacy));
  const failed = slice('--seed=1', '--runs=2');
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /1 slice\(s\) failed/);
  assert.equal(readFileSync(baselineFile, 'utf8'), baseline);
});
