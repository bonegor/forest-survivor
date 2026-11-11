#!/usr/bin/env node
// Offline preparation by default. Only --generate makes paid API requests.
import { Blob } from 'node:buffer';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { portraitRoster } from './catalog.mjs';
import { writePng } from '../png.mjs';
import { pad, scaleN } from '../../public/js/engine/pixels.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ENDPOINT = 'https://api.openai.com/v1/images/edits';
const MODELS = ['gpt-image-2.5-sunburst', 'gpt-image-2.5-flare', 'gpt-image-2'];
const QUALITIES = ['low', 'medium', 'high', 'auto'];
const hash = (value) => createHash('sha256').update(value).digest('hex');

export function parseOptions(args) {
  const options = { generate: false, model: MODELS[0], quality: 'high', out: join(ROOT, 'output/hero-portraits/api'), ids: undefined };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--generate') options.generate = true;
    else if (arg === '--dry-run') options.generate = false;
    else if (arg === '--help') options.help = true;
    else if (['--hero', '--model', '--quality', '--out'].includes(arg)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      if (arg === '--hero') options.ids = [...new Set([...(options.ids || []), ...value.split(',')])];
      else options[arg.slice(2)] = value;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!MODELS.includes(options.model)) throw new Error(`Supported models: ${MODELS.join(', ')}`);
  if (!QUALITIES.includes(options.quality)) throw new Error(`Supported qualities: ${QUALITIES.join(', ')}`);
  options.out = resolve(options.out);
  return options;
}

// Export the real game's first idle frame, not a historical portrait or lab variant.
export async function preparePortraits(options) {
  const heroes = portraitRoster(options.ids);
  await import('../headless.mjs');
  const { SPR } = await import('../../public/js/engine/sprites.js');
  mkdirSync(join(options.out, 'references'), { recursive: true });
  mkdirSync(join(options.out, 'prompts'), { recursive: true });
  return heroes.map((hero) => {
    const sprite = SPR[hero.sprite];
    const frame = sprite.frames[sprite.idle?.[0] ?? 0].buf;
    const reference = join(options.out, 'references', `${hero.id}.png`);
    writePng(reference, scaleN(pad(frame, 4), 8));
    const promptFile = join(options.out, 'prompts', `${hero.id}.txt`);
    writeFileSync(promptFile, `${hero.prompt}\n`);
    const request = { ...hero, reference, model: options.model, quality: options.quality, size: '1024x1536', background: 'opaque', output_format: 'png' };
    const fingerprint = hash(JSON.stringify({ prompt: hero.prompt, reference: hash(readFileSync(reference)), model: request.model, quality: request.quality, size: request.size }));
    return { ...request, fingerprint, output: join(options.out, `${hero.id}.png`), metadata: join(options.out, `${hero.id}.json`), promptFile };
  });
}

// A reference-guided edit can redraw the small sprite into a full scene.
// No key is written to a file or passed to the browser/game.
export async function generatePortrait(job, { apiKey, apiFetch = fetch } = {}) {
  if (!apiKey?.trim()) throw new Error('Set OPENAI_API_KEY locally before using --generate. Do not paste the key in chat.');
  const body = new FormData();
  for (const key of ['model', 'prompt', 'quality', 'size', 'background', 'output_format']) body.append(key, job[key]);
  body.append('n', '1');
  body.append('image[]', new Blob([readFileSync(job.reference)], { type: 'image/png' }), `${job.id}-sprite.png`);
  const response = await apiFetch(ENDPOINT, {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body,
    signal: AbortSignal.timeout(600_000),
  });
  // Do not echo a raw upstream error body: it may include request details.
  if (!response.ok) throw new Error(`Image API HTTP ${response.status}; request ${response.headers.get('x-request-id') || 'unknown'}. Stopped without retrying.`);
  const result = await response.json();
  const encoded = result.data?.[0]?.b64_json;
  if (!encoded) throw new Error('Image API returned no base64 image. Stopped without retrying.');
  const png = Buffer.from(encoded, 'base64');
  if (png.length < 8 || !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('Image API response is not a PNG.');
  return { png, usage: result.usage ?? null, requestId: response.headers.get('x-request-id') };
}

export async function main(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  if (options.help) {
    console.log('node tools/hero-portraits/generate.mjs [--dry-run | --generate] [--hero knight,mage] [--model gpt-image-2.5-sunburst | gpt-image-2.5-flare | gpt-image-2] [--quality low|medium|high|auto] [--out directory]');
    return;
  }
  if (options.generate && !process.env.OPENAI_API_KEY?.trim()) throw new Error('OPENAI_API_KEY is missing. Run without --generate to prepare references and prompts offline.');
  const jobs = await preparePortraits(options);
  // Check all existing outputs before the first API call. Never overwrite art.
  for (const job of jobs) {
    if (existsSync(job.output) || existsSync(job.metadata)) {
      if (!existsSync(job.output) || !existsSync(job.metadata) || JSON.parse(readFileSync(job.metadata, 'utf8')).fingerprint !== job.fingerprint) {
        throw new Error(`${job.id}: existing output is incomplete or has different settings. Choose a new --out directory.`);
      }
    }
  }
  const manifest = { mode: options.generate ? 'api' : 'dry-run', endpoint: ENDPOINT, model: options.model, jobs };
  writeFileSync(join(options.out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`${options.generate ? 'API generation' : 'Offline preparation'}: ${jobs.length} heroes; ${options.model}.`);
  for (const job of jobs) {
    if (!options.generate) { console.log(`${job.id}: ready; reference + prompt exported`); continue; }
    if (existsSync(job.output)) { console.log(`${job.id}: already complete; skipped`); continue; }
    console.log(`${job.id}: generating one portrait…`);
    const { png, usage, requestId } = await generatePortrait(job, { apiKey: process.env.OPENAI_API_KEY });
    // Persist each success immediately so reruns resume without repeating it.
    writeFileSync(job.output, png, { flag: 'wx' });
    writeFileSync(job.metadata, `${JSON.stringify({ ...job, usage, requestId, generatedAt: new Date().toISOString() }, null, 2)}\n`, { flag: 'wx' });
    console.log(`${job.id}: saved ${job.output}`);
  }
  console.log(`Saved manifest: ${join(options.out, 'manifest.json')}`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
