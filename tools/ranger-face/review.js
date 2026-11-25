import { buildSprite, buildSprites, SPR } from '/game/js/engine/sprites.js';
import { initView, view, presentUI } from '/game/js/engine/view.js';
import { input } from '/game/js/engine/input.js';
import { mulberry32 } from '/game/js/engine/util.js';
import { Game } from '/game/js/game/game.js';
import { defaultProfile, metaBonuses } from '/game/js/shared/profile.js';
import { HeroScreen } from '/game/js/ui/hero-selection.js';
import { MenuScene } from '/game/js/ui/background.js';
import { UI } from '/game/js/ui/ui.js';
import { APPROVED_HERO_ART as original } from '/original/js/art/approved-heroes.js';

const $ = id => document.getElementById(id);
const dt = 1 / 60;
const settings = { diff: 'easy', skins: {}, shake: false, softFlash: true, numbers: false };
const profile = defaultProfile();
profile.heroes = [...new Set([...profile.heroes, 'archer'])];
initView(document.createElement('canvas'));
buildSprites();
const shipped = { sprite: SPR.archer, pose: SPR.archer_pose };
const designs = [
  { id: 'current', name: 'Original Ranger', sprite: buildSprite('archer', original.archer), pose: buildSprite('archer_pose', original.archer_pose) },
  { id: 'remake', name: 'Ranger remake', ...shipped },
];
const before = designs[0].sprite.frames, after = designs[1].sprite.frames;
if (before.length === after.length && before.every((f, i) => {
  const next = after[i].buf.d;
  return next.length === f.buf.d.length && f.buf.d.every((v, j) => v === next[j]);
})) designs.pop();
const directions = {
  right: [1, 0], left: [-1, 0], diagonal: [Math.SQRT1_2, -Math.SQRT1_2],
  'diagonal-left': [-Math.SQRT1_2, -Math.SQRT1_2], 'attack-walk': [1, 0],
};
let action = 'right', tick = 0, paused = false, accumulator = 0;

const panels = designs.map(design => {
  const article = document.createElement('article');
  const legend = document.createElement('div'), title = document.createElement('h2'), run = document.createElement('a');
  legend.className = 'legend';
  title.textContent = design.name;
  run.href = '/play/' + design.id + '/';
  run.className = 'run-link';
  run.textContent = 'Play a run';
  run.setAttribute('aria-label', 'Play a run with ' + design.name);
  const stage = document.createElement('div'), canvas = document.createElement('canvas');
  stage.className = 'stage';
  canvas.setAttribute('aria-label', design.name);
  stage.append(canvas);
  legend.append(title, run);
  article.append(legend, stage);
  document.querySelector('.panels').append(article);
  return { ...design, canvas, ctx: canvas.getContext('2d') };
});

function use(panel, rng, fn) {
  const previous = Math.random;
  SPR.archer = panel.sprite;
  SPR.archer_pose = panel.pose;
  Math.random = rng;
  try { return fn(); } finally {
    Math.random = previous;
    SPR.archer = shipped.sprite;
    SPR.archer_pose = shipped.pose;
  }
}

function reset(nextAction = action) {
  if (![...$('motion').options].some(option => option.value === nextAction)) throw new Error('Unknown motion');
  action = $('motion').value = nextAction;
  tick = accumulator = 0;
  input.held.clear(); input.justDown.clear(); input.virtual.clear(); input.bot = { x: 0, y: 0 };
  const combat = action.startsWith('attack');
  for (const p of panels) {
    p.rng = mulberry32(1739);
    use(p, p.rng, () => {
      const g = p.game = new Game({ hero: 'archer', mode: 's15', map: 'forest', diff: 'easy', settings, meta: metaBonuses(profile), crypts: false });
      g.spawner.update = () => {};
      g.player.devGod = true;
      g.banners.length = 0;
      if (combat) {
        g.enterCrypt({ key: '2,3', depth: 1, x: g.player.x, y: g.player.y });
        for (let i = 0; i < 180 && g.state !== 'play'; i++) g.update(dt);
        g.enemies.length = 0;
        g.world.entrance = g.world.exit = null;
        g.banners.length = 0;
        const foe = g.spawnEnemy('skeleton', g.player.x + 55, g.player.y, { instant: true, always: true, hpMul: 1000 });
        if (foe) foe.dormant = true;
        g.grid.rebuild(g.enemies, g.player.x, g.player.y);
      }
      g.player.face = action.includes('left') ? -1 : 1;
      g.player.aim = g.player.face < 0 ? Math.PI : 0;
      for (const w of g.player.weapons) w.cd = combat ? 0.1 : 10000;
      g.syncCam(); g.snapCam();
      if (action === 'selection') {
        p.screen = new HeroScreen();
        p.menuFrame = document.createElement('canvas');
        p.menuElapsed = 0;
        p.screen.enter({ settings, choice: { hero: 'archer' }, store: { profile }, scene: new MenuScene(), ui: new UI() });
      }
    });
  }
  draw();
}
function update() {
  tick++;
  const [x, y] = directions[action] || [0, 0];
  input.bot = { x, y };
  if (action.startsWith('attack')) input.held.add('KeyX');
  for (const p of panels) use(p, p.rng, () => {
    if (action === 'selection') p.menuElapsed += dt;
    else p.game.update(dt);
  });
  input.endFrame();
}

// Render each scene on the normal full-window device canvas. At Gameplay size,
// every displayed pixel is a cropped pixel from that view at the same CSS size.
function draw() {
  const { W, H, S, ctx, uctx, canvas: world } = view;
  const displayRatio = world.width / innerWidth, zoom = Number($('size').value);
  for (const p of panels) use(p, mulberry32(9000 + tick), () => {
    let rect, scale = 1;
    if (action === 'selection') {
      if (p.menuElapsed > 0 || !p.screen.preview || p.menuFrame.width !== W || p.menuFrame.height !== H) {
        p.screen.draw(uctx, W, H, p.menuElapsed);
        p.menuFrame.width = W;
        p.menuFrame.height = H;
        p.menuFrame.getContext('2d').drawImage(view.ui, 0, 0);
        p.menuElapsed = 0;
      } else {
        uctx.drawImage(p.menuFrame, 0, 0);
      }
      presentUI();
      rect = p.screen.preview.game.player._rect;
      scale = S;
    } else {
      p.game.draw(ctx);
      uctx.clearRect(0, 0, W, H);
      p.game.hud.draw(uctx, W, H, p.game.clock, 0);
      presentUI();
      rect = p.game.player._rect;
    }
    const canvas = p.canvas;
    const width = Math.round(canvas.clientWidth * displayRatio), height = Math.round(canvas.clientHeight * displayRatio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width; canvas.height = height;
    }
    p.ctx.imageSmoothingEnabled = false;
    const [left, top, w, h, frame] = rect;
    const cx = (left + 0.5 * w) * scale, cy = (top + 0.64 * h) * scale;
    const cw = width / zoom, ch = height / zoom;
    p.ctx.drawImage(world, Math.round(cx - cw / 2), Math.round(cy - ch / 2), cw, ch, 0, 0, width, height);
    canvas.dataset.frame = p.sprite.frames.indexOf(frame);
  });
  $('pause').textContent = paused ? 'Resume' : 'Pause';
  $('status').textContent = designs.length === 1 ? 'Preparing the Ranger remake…' :
    (paused ? 'Paused · ' : '') + $('motion').selectedOptions[0].textContent;
}
function advance(ticks = 1) {
  paused = true;
  for (let i = 0; i < ticks; i++) update();
  draw();
}
$('motion').onchange = () => reset($('motion').value);
$('size').onchange = draw;
$('restart').onclick = () => reset();
$('step').onclick = () => advance();
$('pause').onclick = () => { paused = !paused; accumulator = 0; draw(); };
window.addEventListener('resize', draw);
reset();
window.rangerReview = {
  get games() { return panels.map(p => p.game); },
  get sprites() { return panels.map(p => p.sprite); },
  get state() { return { action, tick, paused }; },
  reset(action) { paused = true; reset(action); },
  advance,
};
let last = performance.now();
function loop(now) {
  if (!paused) {
    accumulator += Math.min(.1, (now - last) / 1000);
    while (accumulator >= dt) { update(); accumulator -= dt; }
    draw();
  }
  last = now;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
