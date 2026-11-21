import { buildSprites, buildSprite, SPR } from '/js/engine/sprites.js';
import { sheet } from '/js/art/hero-sheets.js';
import { BRACE_START, BRACE_END } from '/js/art/hero-fall.js';
import { DEATH, Game } from '/js/game/game.js';
import { HeroShowcase } from '/js/ui/hero-showcase.js';
import { HeroScreen } from '/js/ui/hero-selection.js';
import { MenuScene } from '/js/ui/background.js';
import { UI } from '/js/ui/ui.js';
import { defaultProfile, metaBonuses } from '/js/shared/profile.js';
import { input } from '/js/engine/input.js';
import { view } from '/js/engine/view.js';
import { clamp, mulberry32 } from '/js/engine/util.js';
import { HEROES } from '/js/data/heroes.js';
import { moveFor } from '/js/data/difficulty.js';

const byId = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const baselineOnly = params.get('baseline') === '1';
const reviewHeroes = Object.keys(HEROES);
let chosenHero = reviewHeroes.includes(params.get('hero')) ? params.get('hero') : 'berserker';
const editions = {
  3: { ids: ['current', 'skardi', 'ylva'], order: ['skardi', 'ylva', 'current'], references: ['knight', 'archer', 'paladin'],
    scaleHint: 'The two alternatives and four current heroes share the same scale.' },
  4: { ids: ['low-ready', 'high-guard', 'split-guard'], references: ['prior-ylva'], title: 'Ylva’s axe grips',
    scaleHint: 'Three axe grips beside the previous Ylva at the same scale.', previous: ['?v=3', 'Earlier Berserker comparison'] },
  5: { ids: ['forward-guard', 'split-guard'], references: ['knight', 'archer'], title: 'Ylva’s forward guard',
    scaleHint: 'Both Ylvas beside the Knight and Ranger at game scale.', previous: ['?v=4', 'Earlier axe grips'] },
  6: { ids: ['ylva-low-ready'], references: [], title: 'Ylva Wolf-Tooth', previous: ['?v=4', 'Earlier axe grips'] },
  8: { ids: ['live-hero'], references: [], title: 'Death sequence', previous: ['?v=6', 'Ylva’s movement review'] },
};
const revision = baselineOnly ? '3' : params.get('v') ?? '8';
const fieldReview = revision === '11';
const deathReview = revision === '7' || revision === '8' || fieldReview;
const singleHero = revision === '6' || deathReview;
const editionId = deathReview ? '8' : revision;
const edition = Object.hasOwn(editions, editionId) ? editions[editionId] : editions[3];
const dt = 1 / 60;
const profile = defaultProfile();
const settings = { diff: 'easy', numbers: false, softFlash: true, skins: {} };
const ids = edition.ids, referenceIds = edition.references;
const names = { current: 'Original Berserker', skardi: 'Skardi Ironbrow', ylva: 'Ylva Wolf-Tooth',
  knight: 'Knight', archer: 'Ranger', paladin: 'Paladin', 'prior-ylva': 'Previous Ylva',
  'low-ready': 'Low ready', 'ylva-low-ready': 'Low ready', 'high-guard': 'High guard', 'forward-guard': 'Forward guard',
  'live-hero': HEROES[chosenHero].title,
  'split-guard': revision === '5' ? 'Previous Split guard' : 'Split guard' };
const referenceSprites = new Map();
const modeButtons = [...document.querySelectorAll('[data-mode]')];
let scenes = [], mode = 'idle', facing = 1, paused = params.has('paused');
let references = [], records = [], accumulator = 0;

function buildLayout() {
  const order = baselineOnly ? ['current'] : edition.order ?? ids;
  for (const id of order) {
    const article = byId('look-slot').content.firstElementChild.cloneNode(true);
    article.dataset.id = id;
    article.querySelector('h2').textContent = names[id];
    byId('looks').append(article);
  }
  for (const id of [...order, ...referenceIds]) {
    const slot = byId('roster-slot').content.firstElementChild.cloneNode(true);
    slot.classList.toggle('candidate', order.includes(id) && id !== 'current' && !(revision === '5' && id === 'split-guard'));
    const canvas = slot.querySelector('canvas');
    canvas.id = 'roster-' + id;
    canvas.setAttribute('aria-label', names[id]);
    slot.querySelector('figcaption').textContent = names[id];
    byId('roster').append(slot);
  }
  if (edition.previous) {
    document.body.classList.add('grips');
    byId('title').textContent = edition.title;
    document.title = edition.title + ' · Forest Survivor';
    byId('prior-link').hidden = false;
    const link = byId('prior-link').querySelector('a');
    link.href = edition.previous[0]; link.textContent = edition.previous[1];
    byId('view').querySelector('option[value="roster"]').textContent = 'Scale comparison';
    setView('close');
  }
  if (singleHero) {
    document.body.classList.add('selected');
    byId('death-mode').hidden = false;
    byId('view').querySelector('option[value="roster"]').remove();
    byId('view').add(new Option('Hero selection', 'menu'));
  }
  if (deathReview) {
    document.body.classList.add('death-review');
    byId('hero-choice').hidden = false;
    for (const id of reviewHeroes) byId('hero').add(new Option(id === 'eanasir' ? HEROES[id].name + ' · ' + HEROES[id].title : HEROES[id].title, id));
    byId('hero').value = chosenHero;
  }
  if (fieldReview) {
    byId('title').textContent = 'Hero field review';
    document.title = 'Hero field review · Forest Survivor';
    byId('example-choice').hidden = false;
    byId('prior-link').hidden = true;
  }
}

function panel(id, index) {
  const node = document.querySelector(`article[data-id="${id}"]`);
  const name = node.querySelector('h2').textContent;
  node.querySelector('.plate').append(byId('field-canvases').content.cloneNode(true));
  const canvases = {};
  for (const type of ['world', 'crop', 'selection', 'native', 'death-field']) {
    const canvas = node.querySelector('.' + type);
    if (deathReview && type === 'death-field') { canvas.width = 104; canvas.height = 86; }
    canvas.id = type + index;
    canvas.setAttribute('aria-label', name + ' ' + type);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    canvases[type] = ctx;
  }
  if (singleHero) {
    const canvas = document.createElement('canvas');
    canvas.className = 'hero-menu'; canvas.id = 'menu' + index;
    canvas.width = 640; canvas.height = 360;
    canvas.setAttribute('aria-label', 'Hero selection screen');
    node.querySelector('.plate').append(canvas);
    canvases.menu = canvas.getContext('2d');
    canvases.menu.imageSmoothingEnabled = false;
  }
  return { id, node, roster: rosterContext(id), ...canvases };
}

function rosterContext(id) {
  const ctx = byId('roster-' + id).getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

// Every slot represents the same 64×54 world pixels. Retain the game's anchor
// and density; a wide axe head or raised sword never changes the hero's scale.
function drawRoster(ctx, sprite, frame, flip, index) {
  const { width, height } = ctx.canvas;
  const scale = 1 / sprite.hires;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(frame.get(flip), Math.round((width - frame.w * scale) / 2),
    Math.round(height - 8 - sprite.anchorY * scale), frame.w * scale, frame.h * scale);
  ctx.canvas.dataset.frame = index;
  ctx.canvas.dataset.flip = String(flip);
}

function setView(value) {
  byId('view').value = value;
  byId('looks').dataset.view = value;
  byId('roster').hidden = value !== 'roster';
  byId('looks').hidden = value === 'roster';
  input.held.clear();
  if (mode === 'death' && value !== 'close' && value !== 'field') setMode('idle', facing);
  updateControls();
  if (value === 'menu' && scenes.length) draw();
}

// Game and HeroShowcase use global sprite lookup. Each disposable scene gets its own
// model and seeded simulation while its code runs, including construction and rendering.
function inScene(s, random, run) {
  const spriteId = HEROES[s.heroId ?? 'berserker'].sprite;
  const original = SPR[spriteId], originalRandom = Math.random;
  SPR[spriteId] = s.sprite;
  Math.random = random;
  try { return run(); }
  finally { SPR[spriteId] = original; Math.random = originalRandom; }
}

function combat() { return mode === 'attack' || mode === 'attack-walk'; }

// Use a shorter real viewport for the death close-up. The game's soul travels
// to the top of its actual camera; the capture includes that boundary.
function fitSelectedField() {
  const width = mode === 'death' ? 240 : 480, height = mode === 'death' ? 128 : 300;
  if (view.W === width && view.H === height) return;
  for (const { world } of scenes) { world.canvas.width = width; world.canvas.height = height; }
  view.ui.width = width; view.ui.height = height;
  Object.assign(view, { W: width, H: height, pxW: width, pxH: height });
}

function reset() {
  accumulator = 0;
  if (singleHero) fitSelectedField();
  input.held.clear(); input.endFrame(); input.bot = { x: 0, y: 0 };
  for (const s of scenes) {
    s.random = mulberry32(29471);
    inScene(s, s.random, () => {
      const hero = s.heroId ?? 'berserker';
      const game = new Game({ hero, mode: 's15', map: 'forest', diff: 'easy', settings, meta: metaBonuses(profile), crypts: false });
      s.game = game;
      if (fieldReview && byId('example-upgrades').checked) {
        for (const id of [game.player.hero.weapon, 'blades']) game.applyChoice({type:'weapon', id}, true);
        for (const id of ['armor', 'might', 'might']) game.applyChoice({type:'passive', id}, true);
        game.applyChoice({type:'reach'}, true);
      }
      s.leadIn = 0;
      s.stage = new HeroShowcase(hero, profile, settings);
      game.spawner.update = () => {};
      game.player.devGod = true;
      game.hints = null;
      if (combat()) {
        const p = game.player;
        game.enterCrypt({ key: '2,3', depth: 1, x: p.x, y: p.y });
        for (let i = 0; game.state !== 'play' && i < 180; i++) game.update(dt);
        game.world.entrance = game.world.exit = null;
        game.enemies.length = 0;
        const target = game.spawnEnemy('skeleton', p.x + facing * 38, p.y + 3, { instant: true, always: true, hpMul: 1000, xpMul: 0 });
        if (target) target.speed = 0;
      }
      const player = game.player;
      player.face = facing;
      player.aim = facing < 0 ? Math.PI : 0;
      player.anim = player.idleAnim = 0;
      for (const weapon of player.weapons) weapon.cd = combat() ? 0 : 1000;
      game.banners.length = 0;
      game.grid.rebuild(game.enemies, player.x, player.y);
      game.syncCam(); game.snapCam();
    });
  }
  references = [...referenceSprites].map(([id, sprite]) => ({ sprite,
    game: new HeroShowcase(id === 'prior-ylva' ? 'berserker' : id, profile, settings).game, roster: rosterContext(id) }));
  updateControls();
  return draw();
}

function tick() {
  const dx = mode === 'left' ? -1 : mode === 'right' ? 1 : mode === 'attack-walk' ? facing : 0;
  input.bot = mode === 'play' ? null : mode === 'diagonal' ? { x: facing * Math.SQRT1_2, y: -Math.SQRT1_2 } : { x: dx, y: 0 };
  if (combat()) input.held.add('KeyX');
  else input.held.delete('KeyX');
  for (const s of scenes) inScene(s, s.random, () => {
    const game = s.game;
    if (mode === 'death' && game.state === 'play' && ++s.leadIn === 24) {
      const player = game.player;
      player.devGod = false; player.invuln = 0;
      player.hurt(player.maxHp * 100, null);
    }
    if (mode === 'attack-walk') {
      const target = game.enemies[0];
      if (target) { target.x = game.player.x + facing * 38; target.y = game.player.y + 3; }
    }
    game.update(dt);
    if (mode === 'death' && game.state === 'over' && !paused) pause(true);
  });
  const lead = scenes[0].game;
  for (const { game } of references) {
    const actor = game.player;
    actor.moving = lead.player.walking;
    actor.advanceAnimation(dt, actor.moving ? actor.moveSpeed * dt : 0);
  }
  input.endFrame();
}

function drawScene(s) {
  const { game, world, crop, stage, selection, sprite, native } = s;
  const player = game.player;
  view.canvas = world.canvas; view.ctx = world;
  game.draw(world);
  const [x, y, w, h, frame, flipped] = player._rect;
  // The field at S=1 downsamples denser art. Show the same chosen pose here
  // with two display pixels per world pixel and a shared ground anchor.
  const scale = 2 / sprite.hires;
  const { width, height } = native.canvas;
  native.fillStyle = '#283137';
  native.fillRect(0, 0, width, height);
  native.drawImage(frame.get(flipped), Math.round((width - frame.w * scale) / 2),
    Math.round(height - 13 - sprite.anchorY * scale), frame.w * scale, frame.h * scale);
  // Keep the boots on the same row across both art canvases and all poses.
  const footX = Math.round((player.x - game.cam.x) * game.cam.S);
  const footY = Math.round((player.y - game.cam.y) * game.cam.S);
  crop.drawImage(world.canvas, footX - 44, footY - 59, 88, 76, 0, 0, 88, 76);
  view.uctx.clearRect(0, 0, view.W, view.H);
  if (mode === 'death') {
    const detail = s['death-field'], { width, height } = detail.canvas;
    const left = footX - width / 2;
    detail.drawImage(world.canvas, left, 0, width, height, 0, 0, width, height);
    if (game.state === 'dying') {
      // The production HUD owns the departing soul. Add only that layer to
      // the clean capture; the full field below retains its normal HUD.
      game.hud.drawDepartingSoul(view.uctx);
      detail.drawImage(view.ui, left, 0, width, height, 0, 0, width, height);
      view.uctx.clearRect(0, 0, view.W, view.H);
    }
  }
  game.hud.draw(view.uctx, view.W, view.H, game.clock, dt);
  world.drawImage(view.ui, 0, 0);

  if (mode === 'death') {
    const age = game.deathT, fall = sprite.fall;
    const fallFrame = player.dead && age >= DEATH.flash && fall ? fall.frameAt(age) : null;
    return { id: s.id, hero: player.id, state: game.state, hp: player.hp, dead: player.dead, deathT: age ?? null, fallFrame,
      frame: sprite.frames.indexOf(frame), face: player.face, flipped, x: player.x, y: player.y,
      clock: game.clock, foot: [footX, footY], walking: player.walking };
  }

  // Present the same instant on the game's selection dais, including its strike clock.
  stage.game.time = game.clock;
  const actor = stage.game.player;
  for (const key of ['face', 'anim', 'idleAnim', 'walking', 'moving', 'strikeAt', 'strikeAng']) actor[key] = player[key];
  if (game.inCrypt && actor.strikeAt != null) {
    const from = sprite.attackStart ?? sprite.attackRelease ?? 0;
    actor.strikeAt -= from / (sprite.attackFps || 1);
  }
  stage.draw(selection, { x: 0, y: 0, w: selection.canvas.width, h: selection.canvas.height }, false);
  if (s.menu && byId('view').value === 'menu') {
    if (!s.heroScreen) {
      const menuProfile = { ...profile, heroes: deathReview ? reviewHeroes : [...new Set([...profile.heroes, player.id])] };
      s.heroScreen = new HeroScreen();
      s.heroScreen.enter({ ui: new UI(), store: { profile: menuProfile }, settings,
        scene: new MenuScene(), choice: { hero: player.id } });
    }
    const elapsed = Math.max(0, game.clock - (s.menuClock ?? game.clock));
    s.heroScreen.draw(s.menu, s.menu.canvas.width, s.menu.canvas.height, elapsed);
    s.menuClock = game.clock;
  }
  const index = sprite.frames.indexOf(frame);
  drawRoster(s.roster, sprite, frame, flipped, index);
  world.canvas.dataset.frame = index;
  return { id: s.id, hero: player.id, frame: index, face: player.face, flipped, x: player.x, y: player.y,
    walking: player.walking, clock: game.clock, strikeAt: player.strikeAt, rect: [x, y, w, h], foot: [footX, footY],
    idle: sprite.idle, walk: sprite.walk, attack: sprite.attack, attackWalk: sprite.attackWalk };
}

function draw() {
  records = scenes.map(s => inScene(s, mulberry32(s.game.frame + 701), () => drawScene(s)));
  if (deathReview && mode === 'death') drawTimeline(records[0]);
  const lead = scenes[0].game;
  for (const reference of references) {
    const { game, sprite, roster } = reference;
    game.time = lead.clock;
    game.inCrypt = lead.inCrypt;
    const player = game.player;
    player.face = lead.player.face;
    player.strikeAt = lead.player.strikeAt;
    player.strikeAng = lead.player.strikeAng;
    // Real class gait clock and strike clip selection on a shared review beat.
    inScene(reference, Math.random, () => game.placePlayer({ S: 1, x: 0, y: 0 }));
    const frame = player._rect[4], flip = player._rect[5];
    drawRoster(roster, sprite, frame, flip, sprite.frames.indexOf(frame));
  }
  return records;
}

function setMode(next, face = next === 'left' ? -1 : 1) {
  mode = next; facing = face < 0 ? -1 : 1;
  byId('looks').dataset.mode = next;
  if (byId('view').value === 'menu' && next !== 'idle') setView('close');
  if (next === 'death' && byId('view').value !== 'field') setView('close');
  return reset();
}

function updateControls() {
  for (const button of modeButtons) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  byId('turn').textContent = facing > 0 ? 'Face left' : 'Face right';
  byId('pause').textContent = paused ? 'Resume' : 'Pause';
  byId('death-mode').textContent = mode === 'death' ? 'Replay death' : 'Death';
  const hint = byId('hint');
  byId('death-timeline').hidden = !deathReview || mode !== 'death';
  if (mode === 'death') hint.textContent = deathReview ? '' : scenes[0]?.game?.state === 'over' ? 'The axes remain on the forest floor.' : 'Forest · death sequence';
  else if (mode === 'play') hint.textContent = 'Move with WASD or the arrow keys.';
  else if (byId('view').value === 'roster') hint.textContent = edition.scaleHint;
  else if (byId('view').value === 'native') hint.textContent = 'The sprites share a flat background at twice their game scale.';
  else hint.textContent = combat() ? (deathReview && chosenHero !== 'berserker' ? 'Crypt · weapon strike' : 'Crypt · twin-axe strike') : '';
}

function drawTimeline({ deathT, dead }) {
  const age = Math.round((deathT ?? 0) / dt) / 60;
  const { game, sprite } = scenes[0];
  const timing = game.deathTiming;
  let label = 'Fall';
  if (!dead) label = 'Before hit';
  else if (age < timing.flash) label = 'Hit';
  else if (age >= timing.name + game.soulDuration(sprite.fall.wisp)) label = 'Aftermath';
  else if (sprite.fall.wisp.walkOff && age >= timing.name) label = age < timing.name + sprite.fall.wisp.walkOff.rise ? 'Spirit rises' : 'Spirit walks away';
  else if (age >= timing.name) label = 'Soul departs';
  else if (game.player.id === 'berserker') {
    label = age < BRACE_START ? 'Stagger' : age < BRACE_END ? 'Hands and knees' : age < 1.60 ? 'Collapse' : 'Grounded';
  }
  byId('death-age').max = timing.end;
  byId('death-age').value = Math.min(timing.end, age);
  byId('death-readout').textContent = dead ? label + ' · ' + age.toFixed(2) + 's' : label;
}

function seekDeath(age) {
  pause(true);
  const current = scenes[0];
  const ticks = 24 + Math.round(clamp(age, 0, current.game.deathTiming.end) / dt) - 1;
  const progressed = mode !== 'death' ? 0 : current.game.player.dead ? 23 + Math.round(current.game.deathT / dt) : current.leadIn;
  if (mode !== 'death' || progressed > ticks) { setMode('death', facing); return step(ticks); }
  return step(ticks - progressed);
}

function selectHero(id) {
  if (!deathReview || !reviewHeroes.includes(id)) return;
  chosenHero = id;
  const hero = HEROES[id], s = scenes[0];
  s.heroId = id; s.sprite = SPR[hero.sprite]; s.heroScreen = null; s.menuClock = null;
  byId('hero').value = id;
  s.node.querySelector('h2').textContent = hero.title + ' · ' + hero.name;
  for (const canvas of s.node.querySelectorAll('canvas')) canvas.setAttribute('aria-label', hero.title + ' ' + canvas.className);
  const url = new URL(location.href);
  if (id === 'berserker') url.searchParams.delete('hero'); else url.searchParams.set('hero', id);
  history.replaceState(null, '', url);
  return setMode(mode, facing);
}

function pause(value = true) { paused = value; accumulator = 0; updateControls(); }

function step(count = 1) {
  for (let i = 0; i < count; i++) tick();
  return draw();
}

function play() {
  let previous = performance.now();
  function advance(now) {
    if (!paused) {
      accumulator += Math.min(.1, (now - previous) / 1000);
      if (accumulator >= dt) {
        while (accumulator >= dt) { tick(); accumulator -= dt; }
        draw();
      }
    }
    previous = now;
    requestAnimationFrame(advance);
  }
  requestAnimationFrame(advance);
}

function proposalSprite(data) {
  const def = typeof data.gen === 'function' ? data : sheet(data);
  return buildSprite('berserker', { ...def, hires: data.hires || 1,
    attackStart: data.attackStart, manualDelay: SPR.berserker.manualDelay });
}

async function originalBerserker() {
  const { default: data } = await import('./prior-accepted-berserker.js');
  const { frames, palette, ...animation } = data;
  const speed = clamp(moveFor('s15', 'easy') * HEROES.berserker.stats.speed, .6, 1.6);
  return buildSprite('berserker', {
    ...animation, gen: () => frames.map(([left, top, width, height, encoded]) => {
      const indices = atob(encoded), pixels = new Uint32Array(data.w * data.h);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * data.indexBytes;
        const color = indices.charCodeAt(i) | (data.indexBytes === 2 ? indices.charCodeAt(i + 1) << 8 : 0);
        pixels[(top + y) * data.w + left + x] = palette[color];
      }
      return { w: data.w, h: data.h, d: pixels };
    }),
    motionRate: data.walkFps / (9.8 * speed), idleRate: data.idleFps / 1.6,
    outline: false, selfBob: true, manualDelay: 2 / 12,
  });
}

async function loadModels() {
  if (baselineOnly) return [await originalBerserker()];
  if (revision === '6') return [SPR.berserker];
  if (deathReview) return [SPR[HEROES[chosenHero].sprite]];
  if (revision === '4') {
    const [{ ylvaGrips }, { default: prior }] = await Promise.all([import('./ylva-grips.js'), import('./ylva.js')]);
    referenceSprites.set('prior-ylva', proposalSprite(prior));
    return ylvaGrips.map(proposalSprite);
  }
  for (const id of referenceIds) referenceSprites.set(id, SPR[id]);
  if (revision === '5') {
    const [{ ylvaForward }, { ylvaGrips }] = await Promise.all([import('./ylva-forward.js'), import('./ylva-grips.js')]);
    return [ylvaForward, ylvaGrips[2]].map(proposalSprite);
  }
  const assets = await Promise.all([import('./skardi.js'), import('./ylva.js')]);
  return [await originalBerserker(), ...assets.map(({ default: data }) => proposalSprite(data))];
}

async function start() {
  buildLayout();
  if (baselineOnly) {
    setView('close');
    byId('view').querySelector('option[value="roster"]').disabled = true;
  }
  buildSprites();
  const models = await loadModels();
  for (const [id, sprite] of [...models.map((sprite, i) => [ids[i], sprite]), ...referenceSprites]) {
    const first = sprite.idle[0];
    drawRoster(rosterContext(id), sprite, sprite.frames[first], false, first);
  }
  scenes = models.map((sprite, index) => ({ ...panel(ids[index], index), sprite }));
  const ui = document.createElement('canvas');
  ui.width = 480; ui.height = 300;
  Object.assign(view, { canvas: scenes[0].world.canvas, ctx: scenes[0].world, ui, uctx: ui.getContext('2d'),
    S: 1, zoom: 1, W: 480, H: 300, pxW: 480, pxH: 300 });
  byId('view').onchange = () => setView(byId('view').value);
  byId('example-upgrades').onchange = reset;
  byId('hero').onchange = () => {
    const heldTime = paused && records[0]?.state === 'dying' ? records[0].deathT : null;
    selectHero(byId('hero').value);
    if (heldTime !== null) seekDeath(heldTime);
    else pause(false);
  };
  byId('death-age').onpointerdown = () => pause(true);
  byId('death-age').oninput = () => seekDeath(Number(byId('death-age').value));
  byId('turn').onclick = () => {
    const heldTime = paused && records[0]?.dead ? records[0].deathT : null;
    const next = mode === 'left' ? 'right' : mode === 'right' ? 'left' : mode;
    setMode(next, -facing);
    if (heldTime !== null) seekDeath(heldTime);
  };
  byId('pause').onclick = () => pause(!paused);
  byId('step').onclick = () => { pause(); step(); };
  for (const button of modeButtons) button.onclick = () => { pause(false); setMode(button.dataset.mode); };
  const moveKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  window.addEventListener('keydown', event => {
    if (mode === 'play' && moveKeys.has(event.code) && event.target.tagName !== 'SELECT') {
      event.preventDefault(); input.held.add(event.code);
    }
  });
  window.addEventListener('keyup', event => input.held.delete(event.code));
  window.addEventListener('blur', () => input.held.clear());
  if (fieldReview) {
    mode = params.get('mode') === 'death' ? 'death' : 'attack';
    setView(mode === 'death' ? 'close' : 'field');
    selectHero(chosenHero);
  } else if (deathReview) { mode = 'death'; selectHero(chosenHero); }
  else if (revision === '6' && params.get('mode') === 'death') setMode('death');
  else reset();
  window.berserkerReview = { setMode, setView, pause, step, selectHero, seekDeath, states: () => records,
    get sprites() { return scenes.map(s => s.sprite); } };
  play();
}

start().catch(error => { byId('hint').textContent = 'Preview failed to load. ' + error.message; console.error(error); });
