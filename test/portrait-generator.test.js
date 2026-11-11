import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HEROES } from '../public/js/data/heroes.js';
import { portraitRoster } from '../tools/hero-portraits/catalog.mjs';
import { generatePortrait, parseOptions } from '../tools/hero-portraits/generate.mjs';

test('portrait jobs cover the shipping roster and reject an unknown hero', () => {
  assert.deepEqual(portraitRoster().map((h) => h.id), Object.keys(HEROES));
  assert.throws(() => portraitRoster(['old-skin']), /No portrait brief/);
  assert.equal(parseOptions([]).generate, false);
  assert.deepEqual(parseOptions(['--hero', 'knight,mage', '--hero', 'knight']).ids, ['knight', 'mage']);
  assert.throws(() => parseOptions(['--model', 'typo']), /Supported models/);
  assert.throws(() => parseOptions(['--out']), /Missing value/);
});

test('API call sends sprite bytes and explicit model; fails safely without credentials', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'forest-portrait-'));
  try {
    const reference = join(folder, 'knight.png');
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    writeFileSync(reference, png);
    const job = { ...portraitRoster(['knight'])[0], reference, model: 'gpt-image-2.5-sunburst', quality: 'high', size: '1024x1536', background: 'opaque', output_format: 'png' };
    let calls = 0;
    const apiFetch = async (url, init) => {
      calls++;
      assert.equal(url, 'https://api.openai.com/v1/images/edits');
      assert.equal(init.headers.Authorization, 'Bearer test-only');
      assert.equal(init.body.get('model'), job.model);
      assert.equal(init.body.get('prompt'), job.prompt);
      assert.equal(init.body.get('n'), '1');
      assert.deepEqual(Buffer.from(await init.body.get('image[]').arrayBuffer()), png);
      return new Response(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }), { headers: { 'x-request-id': 'mock-request' } });
    };
    await assert.rejects(generatePortrait(job, { apiFetch }), /Set OPENAI_API_KEY/);
    assert.equal(calls, 0);
    const result = await generatePortrait(job, { apiKey: 'test-only', apiFetch });
    assert.deepEqual(result.png, png);
    assert.equal(result.requestId, 'mock-request');
    assert.equal(calls, 1);
    let failures = 0;
    await assert.rejects(generatePortrait(job, { apiKey: 'test-only', apiFetch: async () => { failures++; return new Response('sensitive upstream body', { status: 429 }); } }), /HTTP 429/);
    assert.equal(failures, 1, 'no automatic retry of a potentially charged request');
    await assert.rejects(generatePortrait(job, { apiKey: 'test-only', apiFetch: async () => new Response('{"data":[]}') }), /no base64 image/);
  } finally { rmSync(folder, { recursive: true, force: true }); }
});
