import test from 'node:test';
import assert from 'node:assert/strict';
import { link, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { writeCapture } from '../tools/write-capture.mjs';

test('capture servers keep nested frames and metadata within the capture tree', async t => {
  const temporary = await mkdtemp(join(tmpdir(), 'forest-capture-'));
  assert.equal(dirname(temporary), resolve(tmpdir()));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const root = join(temporary, 'captures');
  const frame = 'take-1/ranger/day/0001.png';
  const png = Buffer.from([137, 80, 78, 71]);
  await writeCapture(root, frame, 'data:image/png;base64,' + png.toString('base64'));
  assert.deepEqual(await readFile(join(root, frame)), png);

  const sentinel = join(temporary, 'keep.json');
  await writeFile(sentinel, 'keep');
  for (const name of [sentinel, '../keep.json', '', '/']) {
    await assert.rejects(writeCapture(root, name, 'invalid'), /Invalid capture/);
  }
  const other = join(temporary, 'other');
  await mkdir(other);
  await symlink(other, join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(writeCapture(root, 'linked/new/frame.png', 'invalid'), /Invalid capture directory/);
  await assert.rejects(readFile(join(other, 'new/frame.png')), { code: 'ENOENT' });

  await link(sentinel, join(root, 'latest.json'));
  await writeCapture(root, 'latest.json', '{"take":1}');
  assert.equal(await readFile(join(root, 'latest.json'), 'utf8'), '{"take":1}');
  assert.equal(await readFile(sentinel, 'utf8'), 'keep');
});
