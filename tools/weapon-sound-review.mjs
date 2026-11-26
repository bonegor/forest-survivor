// Disposable browser/audio verification; serves only public assets, no profile API.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const root = resolve('public'), out = resolve('output/sound-lab-review');
mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ogg': 'audio/ogg' };
const server = createServer(async (req, res) => {
  let file = resolve(root, '.' + new URL(req.url, 'http://local').pathname);
  if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
  if (!extname(file)) file = resolve(file, 'index.html');
  try { const data = await readFile(file); res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream'); res.end(data); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 1040 } });
const errors = [], page = await context.newPage();
page.on('pageerror', err => errors.push(err.message));
try {
  // Record actual bank-source starts, including offsets, independently of the on-screen cue counter.
  await context.addInitScript(() => {
    window.recordingStarts = [];
    const original = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (args.length === 2) window.recordingStarts.push(this.buffer?.duration);
      return original.apply(this, args);
    };
  });
  const bankResponses = [];
  page.on('response', response => { if (response.url().includes('/library/bank-')) bankResponses.push(response.status()); });
  await page.goto(url + '/sound-lab/');
  const libraryReady = tab => tab.waitForFunction(() => !!document.querySelector('#recording option[value^="clip:"]'));
  await libraryReady(page);
  assert.equal(await page.locator('#weapon option').count(), 60);
  assert.match(await page.locator('#saved').innerText(), /In game · Current/);
  assert.equal(await page.locator('#studio').getAttribute('href'), 'field-studio/');
  await page.selectOption('#category', 'all');
  const catalogCount = JSON.parse(await readFile(resolve(root, 'audio/sfx/library/index.json'), 'utf8')).length;
  assert.equal(await page.locator('#recording option').count(), catalogCount + 4);
  await page.fill('#search', 'axe');
  assert.ok(await page.locator('#recording option').count() > 0);
  await page.fill('#search', '');
  await page.selectOption('#category', 'best');
  await page.selectOption('#recording', 'heavy');
  await page.click('[data-level="8"]');
  await page.waitForFunction(() => /[1-9]\d* weapon cue/.test(document.querySelector('#stats').textContent));
  assert.equal(await page.evaluate(() => localStorage.getItem('fs_weapon_sound_style_v1_weapons')), null, 'audition does not apply');
  await page.click('#stop');

  const clip = await page.locator('#recording option[value^="clip:"]').first().getAttribute('value');
  await page.selectOption('#recording', clip);
  assert.ok(await page.locator('#credit a').count() > 0);
  await page.click('[data-level="whirlwind"]');
  await page.waitForFunction(() => window.recordingStarts.length > 0);
  assert.ok(bankResponses.length && bankResponses.every(status => status === 200));
  await page.screenshot({ path: out + '/desktop.png', fullPage: true });
  await page.click('#stop');

  // An already-open game-side module picks up changes without reloading the game.
  const receiver = await context.newPage();
  await receiver.goto(url + '/sound-lab/');
  await libraryReady(receiver);
  await page.bringToFront();
  await page.click('#apply');
  await receiver.waitForFunction(async expected => {
    const { weaponSoundChoice } = await import('/js/engine/weapon-sounds.js');
    return weaponSoundChoice('axe') === expected && weaponSoundChoice('bow') === 'current';
  }, clip);
  // Let real gameplay resolve its saved choice with no audition override.
  const playedInGame = await receiver.evaluate(async expected => {
    const { prepareWeaponAudio, setWeaponSoundAudition, setVolumes } = await import('/js/engine/audio.js');
    const { makeWeaponPreview } = await import('/sound-lab/preview.js');
    await prepareWeaponAudio(expected);
    setWeaponSoundAudition(null);
    setVolumes(0, .6);
    const { game } = makeWeaponPreview('axe', 1, { headless: true });
    const before = window.recordingStarts.length;
    for (let i = 0; i < 100; i++) game.update(1 / 60);
    return window.recordingStarts.length > before;
  }, clip);
  assert.ok(playedInGame, 'gameplay uses the saved recorded attack');
  await receiver.reload();
  await libraryReady(receiver);
  assert.equal(await receiver.inputValue('#recording'), clip);
  await receiver.close();

  await page.selectOption('#weapon', 'steamvent');
  assert.equal(await page.locator('#levels button').count(), 1);
  await page.click('[data-level="steamvent"]');
  await page.waitForFunction(() => /[1-9]\d* weapon cue/.test(document.querySelector('#stats').textContent));
  await page.click('#stop');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: out + '/mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'phone layout fits');

  const result = await page.evaluate(async () => {
    const { scheduleWeaponSound, WEAPON_SOUND_STYLES, WEAPON_SOUND_NAMES } = await import('/js/engine/weapon-sounds.js');
    const { makeWeaponPreview, PREVIEW_SECONDS } = await import('/sound-lab/preview.js');
    const { setVolumes, stopMusic } = await import('/js/engine/audio.js');
    setVolumes(0, 0);
    const captures = {};
    for (const level of [1, 8]) {
      const { game: g, weapon: w } = makeWeaponPreview('axe', level, { headless: true });
      const times = [], push = g.projectiles.push.bind(g.projectiles);
      g.projectiles.push = (...shots) => { for (const shot of shots) if (shot.w === w) times.push(g.clock); return push(...shots); };
      for (let frame = 0; frame < PREVIEW_SECONDS * 60; frame++) g.update(1 / 60);
      captures[level] = times;
    }
    stopMusic();
    const metrics = [], clips = [], sample = await fetch('/audio/sfx/axe-throw.ogg').then(r => r.arrayBuffer());
    const measure = buffer => {
      let peak = 0, sum = 0, finite = true, n = 0;
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) for (const value of buffer.getChannelData(ch)) {
        finite &&= Number.isFinite(value); peak = Math.max(peak, Math.abs(value)); sum += value * value; n++;
      }
      return { peak, rms: Math.sqrt(sum / n), finite };
    };
    for (const style of WEAPON_SOUND_STYLES) for (const level of [1, 8]) {
      const ctx = new OfflineAudioContext(1, 44100 * 9, 44100);
      const current = style.id === 'current' ? await ctx.decodeAudioData(sample.slice(0)) : null;
      for (const when of captures[level]) {
        if (current) { const src = ctx.createBufferSource(), gain = ctx.createGain(); src.buffer = current; gain.gain.value = 0.55; src.connect(gain); gain.connect(ctx.destination); src.start(when); }
        else scheduleWeaponSound(ctx, ctx.destination, 'axe', style.id, {}, when);
      }
      const buffer = await ctx.startRendering();
      metrics.push({ style: style.id, level, shots: captures[level].length, ...measure(buffer) });
      const samples = buffer.getChannelData(0), pcm = new Int16Array(samples.length);
      for (let i = 0; i < samples.length; i++) pcm[i] = Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767);
      clips.push({ name: `${style.id}-axe-level-${level}.wav`, pcm: Array.from(new Uint8Array(pcm.buffer)) });
    }
    // Simultaneous six-way volleys test the raw synth before the game's limiter/compressor.
    const stress = [];
    for (const style of WEAPON_SOUND_STYLES.slice(1)) for (const name of WEAPON_SOUND_NAMES) {
      const ctx = new OfflineAudioContext(1, 44100, 44100);
      for (let i = 0; i < 6; i++) scheduleWeaponSound(ctx, ctx.destination, name, style.id, { pitch: 1 + i * .025 }, .1);
      stress.push({ style: style.id, name, ...measure(await ctx.startRendering()) });
    }
    return { metrics, stress, clips, captures };
  });
  for (const metric of [...result.metrics, ...result.stress]) {
    assert.ok(metric.finite, JSON.stringify(metric));
    assert.ok(metric.peak < 1 && metric.rms > 0, JSON.stringify(metric));
  }
  for (const clip of result.clips) {
    const pcm = Buffer.from(clip.pcm), wav = Buffer.alloc(44 + pcm.length);
    wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(44100, 24); wav.writeUInt32LE(88200, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
    wav.write('data', 36); wav.writeUInt32LE(pcm.length, 40); pcm.copy(wav, 44);
    writeFileSync(out + '/' + clip.name, wav);
  }
  delete result.clips;
  result.pageErrors = errors;
  writeFileSync(out + '/metrics.json', JSON.stringify(result, null, 2));
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ screenshots: ['desktop.png', 'mobile.png'], axe: result.metrics,
    maxSixWayPeak: Math.max(...result.stress.map(s => s.peak)), checks: result.stress.length, errors }));
} finally { await browser.close(); await new Promise(ok => server.close(ok)); }
