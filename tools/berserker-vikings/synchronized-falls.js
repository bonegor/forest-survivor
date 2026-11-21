import { buildSprite, buildSprites, SPR } from '/js/engine/sprites.js';
import { mulberry32, clamp } from '/js/engine/util.js';
import { input } from '/js/engine/input.js';
import { view } from '/js/engine/view.js';
import { Game } from '/js/game/game.js';
import { HEROES } from '/js/data/heroes.js';
import { defaultProfile, metaBonuses } from '/js/shared/profile.js';

const heroes = ['knight', 'archer', 'mage', 'rogue', 'necromancer', 'paladin', 'druid', 'berserker', 'witchhunter'];
const rate = 60, first = 8, last = 108;
const tileW = 88, tileH = 56, footX = 44, footY = 45;
const byId = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const proposals = params.get('v') === '10';
const canvases = {};
const frames = [];
let scenes, field, atlas;
let tick = first, paused = true, startedAt = 0;

function context(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

function seeded(random, fn) {
  const original = Math.random;
  Math.random = random;
  try { return fn(); }
  finally { Math.random = original; }
}

function makeScene(hero) {
  const random = mulberry32(29471);
  return seeded(random, () => {
    const game = new Game({ hero, mode: 's15', map: 'forest', diff: 'easy', settings: { numbers: false, softFlash: true, skins: {} }, meta: metaBonuses(defaultProfile()), crypts: false });
    game.spawner.update = () => {};
    game.hints = null;
    game.banners.length = 0;
    const player = game.player;
    player.face = 1; player.aim = 0; player.anim = player.idleAnim = 0;
    for (const weapon of player.weapons) weapon.cd = 1000;
    game.grid.rebuild(game.enemies, player.x, player.y);
    game.syncCam(); game.snapCam();
    for (let i = 0; i < 23; i++) game.update(1 / rate);
    game.draw(field); // Capture the actual pose hit, including the displayed facing.
    player.invuln = 0;
    player.hurt(player.maxHp * 100, null);
    return { hero, game, random, out: canvases[hero].getContext('2d') };
  });
}

function paintTick(i) {
  const records = [];
  for (let index = 0; index < scenes.length; index++) {
    const { game, random, hero } = scenes[index];
    seeded(random, () => game.update(1 / rate));
    if (i < first) continue;
    // The fixed camera and foot pin make the nine crops directly comparable.
    game.trauma = 0;
    seeded(mulberry32(701 + i), () => game.draw(field));
    const player = game.player, cam = game.cam;
    const fall = SPR[player.hero.sprite].fall, soul = fall.wisp;
    const soulAge = soul ? game.deathT - soul.release : -1;
    const soulVisible = soul && soulAge >= 0 && soulAge < soul.duration;
    // Aldric's original soul leaves while the other heroes are still falling.
    // It belongs to the game HUD and uses the same pixel coordinates at S = 1.
    if (soulVisible) game.hud.drawDepartingSoul(field);
    const x = Math.round((player.x - cam.x) * cam.S), y = Math.round((player.y - cam.y) * cam.S);
    atlas.drawImage(field.canvas, x - footX, y - footY, tileW, tileH, index * tileW, (i - first) * tileH, tileW, tileH);
    records.push({ id: hero, hero, deathT: game.deathT, clock: game.clock, state: game.state, dead: player.dead,
      fallFrame: fall.frameAt(game.deathT), soulRelease: soul?.release, soulFrame: soulVisible ? soul.frameAt(soulAge) : null,
      face: player.face, flipped: player._rect[5], foot: [footX, footY] });
  }
  if (i >= first) frames[i] = records;
}

function show(next) {
  tick = clamp(Math.round(next), first, last);
  const y = (tick - first) * tileH;
  for (const [index, scene] of scenes.entries()) {
    scene.out.drawImage(atlas.canvas, index * tileW, y, tileW, tileH, 0, 0, tileW, tileH);
  }
  const time = tick / rate;
  byId('sync-time').value = tick;
  byId('sync-clock').textContent = time.toFixed(2) + ' s after hit';
  byId('sync-time').setAttribute('aria-valuetext', byId('sync-clock').textContent);
  return frames[tick];
}

function pause(value = true) {
  paused = Boolean(value);
  startedAt = performance.now() - (tick - first) * 1000 / rate;
  byId('sync-toggle').textContent = paused ? 'Play' : 'Pause';
  return frames[tick];
}

function seek(seconds) {
  pause(true);
  return show(seconds * rate);
}

function step(delta = 1) {
  return seek((tick + delta) / rate);
}

function replay() {
  show(first);
  return pause(false);
}

function animate(now) {
  if (!paused) {
    const frame = first + Math.floor((now - startedAt) * rate / 1000) % (last - first + 1);
    if (frame !== tick) show(frame);
  }
  requestAnimationFrame(animate);
}

async function start() {
  const title = proposals ? 'Hero fall proposals' : 'Hero fall comparison';
  document.title = title + ' · Forest Survivor';
  document.querySelector('.sync-main h1').textContent = title;
  if (proposals) {
    document.querySelector('.sync-main').classList.add('fall-proposals');
    const link = document.querySelector('.sync-link a');
    link.href = '?v=9'; link.textContent = 'Compare current in-game falls';
  }
  for (const hero of heroes) {
    const figure = document.createElement('figure'), caption = document.createElement('figcaption');
    const canvas = context(tileW, tileH).canvas;
    canvas.id = 'sync-' + hero; canvas.setAttribute('aria-label', HEROES[hero].title);
    caption.textContent = HEROES[hero].title;
    if (proposals) {
      const label = document.createElement('small');
      label.textContent = hero === 'knight' ? 'Original' : hero === 'berserker' ? 'Approved' : 'Proposal';
      caption.append(label);
    }
    figure.append(canvas, caption); byId('sync-tiles').append(figure);
    canvases[hero] = canvas;
  }
  byId('sync-layout').onchange = e => { byId('sync-stage').dataset.layout = e.target.value; };
  buildSprites();
  if (proposals) {
    const [{ ART }, { proposedFalls }] = await Promise.all([import('/js/art/defs.js'), import('./proposed-falls/index.js')]);
    for (const [hero, fall] of Object.entries(proposedFalls)) SPR[hero] = buildSprite(hero, { ...ART[hero], fall });
  }
  field = context(160, 100);
  const ui = context(160, 100);
  Object.assign(view, { canvas: field.canvas, ctx: field, ui: ui.canvas, uctx: ui, S: 1, zoom: 1, W: 160, H: 100, pxW: 160, pxH: 100 });
  input.bot = { x: 0, y: 0 };
  scenes = heroes.map(makeScene);
  // Bake the shared playhead from nine genuine field renders once. Replays,
  // scrubbing and narrow-screen layouts then present the same 60 Hz simulation.
  atlas = context(tileW * heroes.length, tileH * (last - first + 1));
  for (let i = 1; i <= last; i++) {
    paintTick(i);
    if (i === first) show(first);
    if (i % 12 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }
  byId('sync-replay').onclick = replay;
  byId('sync-toggle').onclick = () => pause(!paused);
  byId('sync-back').onclick = () => step(-1);
  byId('sync-next').onclick = () => step(1);
  byId('sync-time').oninput = e => seek(Number(e.target.value) / rate);
  for (const control of document.querySelectorAll('.sync-controls :disabled')) control.disabled = false;
  show(first); pause(params.has('paused'));
  window.fallComparison = { heroes, canvases, seek, step, pause, replay, states: () => frames[tick], bounds: { start: first / rate, end: last / rate } };
  requestAnimationFrame(animate);
}

start().catch(error => { byId('sync-clock').textContent = 'Unable to prepare the comparison.'; console.error(error); });
