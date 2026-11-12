import { buildSprites, buildSprite, SPR } from '/js/engine/sprites.js';
import { Game } from '/js/game/game.js';
import { HEROES } from '/js/data/heroes.js';
import { defaultProfile, metaBonuses } from '/js/shared/profile.js';
import { moveFor } from '/js/data/difficulty.js';
import { input } from '/js/engine/input.js';
import { view } from '/js/engine/view.js';
import { clamp, mulberry32 } from '/js/engine/util.js';
import { HeroShowcase } from '/js/ui/hero-showcase.js';

const $ = id => document.getElementById(id), ids = Object.keys(HEROES);
const params = new URLSearchParams(location.search), comparingV2 = params.get('compare') === 'v2';
const previousPath = comparingV2 ? '/variants/v1' : params.get('before') === 'previous' ? '/previous' : '/baseline';
if (comparingV2) {
  document.body.classList.add('comparison-v2');
  $('heading0').textContent = 'V1 · preserved current walk';
  $('heading1').textContent = 'V2 · shorter steps proposal';
  $('intro').textContent = 'V1 stays in the game. V2 proposes shorter steps, lower foot lift and restrained knees. Both run at the same travel speed; choose a hero and watch complete cycles against the ground.';
}
buildSprites();
const before = {}, updated = {};
function originalSprite(id, data) {
  return buildSprite(id, {
    gen: () => data.frames.map(([x, y, w, h, encoded]) => {
      const raw = atob(encoded), d = new Uint32Array(data.w * data.h), n = data.indexBytes;
      for (let iy = 0; iy < h; iy++) for (let ix = 0; ix < w; ix++) {
        const k = (iy * w + ix) * n;
        d[(iy + y) * data.w + ix + x] = data.palette[raw.charCodeAt(k) | (n === 2 ? raw.charCodeAt(k + 1) << 8 : 0)];
      }
      return { w: data.w, h: data.h, d };
    }),
    ...Object.fromEntries(['idle', 'walk', 'attack', 'attackWalk', 'attackRelease', 'attackFps', 'anchorY', 'floating'].map(k => [k, data[k]])),
    motionRate: data.walkFps / (9.8 * clamp(moveFor('s15', 'easy') * (HEROES[id].stats.speed || 1), .6, 1.6)),
    idleRate: data.idleFps / 1.6, selfBob: true, outline: false, manualDelay: SPR[id].manualDelay,
  });
}
const originalData = await Promise.all(ids.map(id => import(`${previousPath}/${id}.js`)));
const proposedData = comparingV2 ? await Promise.all(ids.map(id => import(`/variants/v2/${id}.js`))) : null;
for (const [i, id] of ids.entries()) {
  updated[id] = proposedData ? originalSprite(id, proposedData[i].default) : SPR[id];
  before[id] = originalSprite(id, originalData[i].default);
  $('hero').add(new Option(HEROES[id].title, id));
  const b = document.createElement('button'); b.textContent = HEROES[id].title;
  b.onclick = () => { $('hero').value = id; reset(); }; $('roster').append(b);
}
const worlds = [0, 1].map(i => $('world' + i)), contexts = worlds.map(c => c.getContext('2d'));
const ui = document.createElement('canvas'); ui.width = 480; ui.height = 300;
Object.assign(view, { canvas: worlds[0], ctx: contexts[0], ui, uctx: ui.getContext('2d'), S: 1, W: 480, H: 300, pxW: 480, pxH: 300, zoom: 1 });
for (const c of [...contexts, view.uctx]) c.imageSmoothingEnabled = false;
let games = [], shows = [], action = comparingV2 ? 'right' : 'idle', phase = 'idle', face = 1, paused = false, time = 0;
const tour = [['idle', 3], ['right', 2], ['left', 2], ['diagonal', 2], ['attack', 2.5], ['attack-walk', 2.5]];
function withSprite(v, fn) {
  const id = $('hero').value; SPR[id] = (v ? updated : before)[id];
  try { return fn(); } finally { SPR[id] = updated[id]; }
}
function clearInput() { input.held.clear(); input.justDown.clear(); input.virtual.clear(); input.bot = { x: 0, y: 0 }; }
function reset() {
  clearInput(); time = 0;
  const profile = defaultProfile(), settings = { diff: 'easy', numbers: false, softFlash: true, skins: {} };
  const previousRandom = Math.random;
  try {
    games = [0, 1].map(v => withSprite(v, () => {
      Math.random = mulberry32(29471);
      const g = new Game({ hero: $('hero').value, mode: 's15', map: $('setting').value === 'day' ? 'desert' : 'forest', diff: 'easy', settings, meta: metaBonuses(profile), crypts: false });
      if ($('loadout').value === 'full') {
        for (const id of ['axe', 'blades', 'aura', 'lightning', 'glaive']) if (g.player.weapons.length < 6) g.addWeapon(id);
        for (const weapon of g.player.weapons) while (weapon.level < 8) weapon.levelUp();
      }
      g.spawner.update = () => {}; g.hints = null; g.player.devGod = true; g.banners.length = 0;
      if ($('setting').value === 'crypt') {
        g.enterCrypt({ key: '2,3', depth: 1, x: g.player.x, y: g.player.y });
        for (let i = 0; i < 180 && g.state !== 'play'; i++) g.update(1 / 60);
        g.enemies.length = 0; g.world.entrance = g.world.exit = null; g.banners.length = 0;
      }
      g.syncCam(); g.snapCam(); return g;
    }));
  } finally { Math.random = previousRandom; }
  shows = [0, 1].map(v => withSprite(v, () => new HeroShowcase($('hero').value, profile, settings)));
  for (const v of [0, 1]) {
    const spr = (v ? updated : before)[$('hero').value];
    $('note' + v).textContent = `${spr.idle.length} idle frames · ${spr.walk.length} walk frames · ${spr.attack.length} attack frames${spr.attackWalk ? ' · moving attacks' : ''}`;
  }
  begin(action === 'tour' ? 'idle' : action); draw();
}
function begin(next) {
  clearInput(); phase = next;
  games.forEach(g => {
    const p = g.player; g.enemies.length = g.projectiles.length = g.minions.length = g.effects.length = 0;
    p.heroAttack = null; p.strikeAt = null; p.anim = 0; p.idleAnim = 0; p.walking = false; p.face = face; p.aim = face < 0 ? Math.PI : 0;
    for (const w of p.weapons) { w.cd = next.startsWith('attack') ? .35 : 1000; w.queue = 0; }
    if (next.startsWith('attack')) for (const y of [-8, 8]) {
      const e = g.spawnEnemy('skeleton', p.x + face * 32, p.y + y, { instant: true, always: true, hpMul: 1000, xpMul: 0 });
      if (e) e.speed = 0;
    }
    // Reset swaps the disposable actors before the first update. The crypt HUD
    // aims immediately while drawing, so its spatial index must match them now.
    g.grid.rebuild(g.enemies, p.x, p.y);
  });
}
function tick() {
  if (action === 'tour') {
    let t = time % 14, next = tour.at(-1)[0];
    for (const [name, seconds] of tour) { if (t < seconds) { next = name; break; } t -= seconds; }
    if (phase !== next) begin(next);
  }
  time += 1 / 60;
  const motion = { right: [1, 0], left: [-1, 0], diagonal: [face * Math.SQRT1_2, -Math.SQRT1_2], 'attack-walk': [face, 0] };
  const [x, y] = motion[phase] || [0, 0], pace = Number($('pace').value); input.bot = { x: x * pace, y: y * pace };
  if (phase.startsWith('attack') && games[0].inCrypt) input.held.add('KeyX'); else input.held.delete('KeyX');
  games.forEach((g, v) => withSprite(v, () => {
    if (phase === 'attack-walk') for (const [i, e] of g.enemies.entries()) { e.x = g.player.x + face * 32; e.y = g.player.y + (i % 2 ? 8 : -8); }
    g.update(1 / 60); shows[v].update(1 / 60);
  }));
  input.endFrame();
}
function draw() {
  games.forEach((g, v) => withSprite(v, () => {
    const ctx = contexts[v]; view.ctx = ctx; view.canvas = worlds[v];
    g.draw(ctx);
    view.uctx.clearRect(0, 0, 480, 300); g.hud.draw(view.uctx, 480, 300, g.clock, 1 / 60); ctx.drawImage(ui, 0, 0);
    const r = g.player._rect, cc = $('crop' + v).getContext('2d'); cc.imageSmoothingEnabled = false;
    cc.clearRect(0, 0, 96, 96); cc.drawImage(worlds[v], Math.round((g.player.x - g.cam.x) * g.cam.S - 48), Math.round((g.player.y - g.cam.y) * g.cam.S - 70), 96, 96, 0, 0, 96, 96);
    const sc = $('selection' + v).getContext('2d'); sc.imageSmoothingEnabled = false;
    sc.clearRect(0, 0, 128, 180); shows[v].draw(sc, { x: 0, y: 0, w: 128, h: 180 }, false, g.settings);
    const spr = SPR[$('hero').value], index = spr.frames.indexOf(r[4]);
    worlds[v].dataset.frame = index;
    worlds[v].dataset.pose = spr.idle.includes(index) ? 'idle' : spr.walk.includes(index) ? (spr.floating ? 'float' : 'walk') : spr.attack.includes(index) ? 'attack' : 'walk + attack';
  }));
  const scene = phase.startsWith('attack') ? (games[1].inCrypt ? 'manual crypt combat' : 'automatic map combat') : phase;
  $('status').textContent = `${HEROES[$('hero').value].title} · ${scene} · showing ${worlds[1].dataset.pose} · ${paused ? 'paused' : 'playing'} · ${time.toFixed(1)}s`;
}
$('hero').onchange = $('setting').onchange = $('loadout').onchange = $('pace').onchange = reset;
for (const b of document.querySelectorAll('[data-action]')) b.onclick = () => {
  action = b.dataset.action; for (const c of document.querySelectorAll('[data-action]')) c.classList.toggle('active', c === b); reset();
};
$('pause').onclick = () => { paused = !paused; $('pause').textContent = paused ? 'Resume' : 'Pause'; draw(); };
$('step').onclick = () => { paused = true; $('pause').textContent = 'Resume'; tick(); draw(); };
$('face').onclick = () => { face *= -1; $('face').textContent = face > 0 ? 'Face ←' : 'Face →'; reset(); };
$('reset').onclick = reset;
let last = performance.now(), accumulator = 0;
function loop(now) {
  if (!paused) { accumulator += Math.min(.1, (now - last) / 1000); while (accumulator >= 1 / 60) { tick(); accumulator -= 1 / 60; } draw(); }
  last = now; requestAnimationFrame(loop);
}
for (const b of document.querySelectorAll('[data-action]')) b.classList.toggle('active', b.dataset.action === action);
reset(); requestAnimationFrame(loop);
