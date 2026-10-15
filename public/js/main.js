// Forest Survivor — boot, screen management and the main loop.

import { initView, view, presentUI } from './engine/view.js';
import { initInput, input } from './engine/input.js';
import { buildSprites } from './engine/sprites.js';
import { store, loadSettings, saveSettings } from './engine/storage.js';
import { initAudio, setVolumes } from './engine/audio.js';
import { drawText } from './engine/font.js';
import { makeCanvas } from './engine/util.js';
import { UI } from './ui/ui.js';
import { MenuScene } from './ui/background.js';
import { TitleScreen, HeroScreen, ModeScreen, ArmoryScreen, RecordsScreen, OptionsScreen } from './ui/screens.js';
import { GameScreen } from './ui/gamescreen.js';

const SCREENS = {
  title: TitleScreen,
  hero: HeroScreen,
  mode: ModeScreen,
  armory: ArmoryScreen,
  records: RecordsScreen,
  options: OptionsScreen,
  game: GameScreen,
};

const app = {
  ui: new UI(),
  scene: new MenuScene(),
  store,
  settings: loadSettings(),
  choice: { hero: 'knight', mode: 's15' },
  screen: null,
  screenName: '',
  audioUnlocked: false,

  go(name, params = {}) {
    if (this.screen && this.screen.leave) this.screen.leave();
    const S = SCREENS[name];
    this.screen = new S();
    this.screenName = name;
    this.ui.focusId = null;
    this.screen.enter(this, params);
  },

  startRun() {
    this.go('game', {});
  },

  continueRun() {
    if (this.store.checkpoint) this.go('game', { checkpoint: this.store.checkpoint });
  },

  applySettings() {
    setVolumes(this.settings.music, this.settings.sfx);
    if (this.screen && this.screen.game) {
      this.screen.game.settings = this.settings;
      this.screen.game.numbers.enabled = this.settings.numbers !== false;
    }
  },

  toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  },
};

// Scanline overlay for the optional CRT look.
let scan = null;
function scanlines(ctx) {
  const S = view.S;
  if (!scan || scan.height !== S) {
    scan = makeCanvas(1, S);
    const g = scan.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.fillRect(0, S - Math.max(1, Math.floor(S / 3)), 1, Math.max(1, Math.floor(S / 3)));
  }
  ctx.fillStyle = ctx.createPattern(scan, 'repeat');
  ctx.fillRect(0, 0, view.pxW, view.pxH);
}

let last = performance.now();
let fps = 60, fpsAcc = 0, fpsFrames = 0;

function loop(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  fpsAcc += dt;
  fpsFrames++;
  if (fpsAcc >= 0.5) {
    fps = Math.round(fpsFrames / fpsAcc);
    fpsAcc = 0;
    fpsFrames = 0;
  }
  input.update();
  if (input.pressed('fullscreen')) app.toggleFullscreen();
  const s = app.screen;
  try {
    if (s.frame) s.frame(dt);
    else s.draw(view.uctx, view.W, view.H, dt);
    presentUI();
    if (app.settings.crt) scanlines(view.ctx);
    if (app.settings.fps) {
      const c = view.ctx;
      c.save();
      c.fillStyle = 'rgba(0,0,0,0.6)';
      c.fillRect(0, view.pxH - 12 * view.S, 44 * view.S, 12 * view.S);
      c.restore();
      const g = app.screen.game;
      drawFps(c, `${fps} FPS${g ? ' · ' + g.enemies.length + 'E ' + g.particles.n + 'P' : ''}`);
    }
  } catch (err) {
    console.error(err);
  }
  input.endFrame();
  requestAnimationFrame(loop);
}

const fpsCanvas = makeCanvas(160, 12);
function drawFps(ctx, text) {
  const g = fpsCanvas.getContext('2d');
  g.clearRect(0, 0, 160, 12);
  drawText(g, text, 2, 2, { color: '#63c74d' });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(fpsCanvas, 0, view.pxH - 12 * view.S, 160 * view.S, 12 * view.S);
}

async function boot() {
  const canvas = document.getElementById('game');
  initView(canvas);
  initInput(canvas);
  buildSprites();
  await store.init();
  setVolumes(app.settings.music, app.settings.sfx);
  // Browsers only allow audio after a user gesture.
  const unlock = () => {
    initAudio();
    app.audioUnlocked = true;
  };
  for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, unlock, { passive: true });
  document.getElementById('loading')?.remove();
  canvas.focus();
  app.go('title');
  requestAnimationFrame(loop);
  // Developer panel: loaded on demand with ` (or straight away with ?dev), where developer
  // mode is on (the server's --dev or DEV_KEY, or the static game on this machine).
  let devPanel = null;
  const openDev = async () => {
    if (!devPanel && !(await store.devStatus()).enabled) return null;
    devPanel = devPanel || (await import('./dev/panel.js')).createDevPanel(app);
    return devPanel;
  };
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Backquote' || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '')) return;
    e.preventDefault();
    openDev().then((p) => p?.toggle());
  });
  if (new URLSearchParams(location.search).has('dev')) openDev();
}

// Hooks for automated play-testing (tools/balance.mjs, play.mjs, watch.mjs):
// fast-forward the current run with a bot from js/bots/, loaded on first use.
//   __fs.sim(seconds, { bot: 'autopilot' | 'kite:r=40' | false, pick: 'build', random, hz: 30 })
const drivers = new WeakMap();
async function sim(seconds, opts = {}) {
  const { Driver } = await import('./bots/driver.js');
  const g = app.screen.game;
  const bot = opts.bot === false ? 'idle:ult=0' : opts.bot || 'autopilot';
  const pick = opts.pick || (opts.random ? 'random' : 'build');
  const hz = opts.hz || 30;
  // One driver per run and bot, so a strategy remembers between calls.
  const key = `${bot}|${pick}|${hz}`;
  let run = drivers.get(g);
  if (!run || run.key !== key) {
    if (run) run.d.detach();
    run = { key, d: new Driver(g, { bot, pick, hz }) };
    drivers.set(g, run);
  }
  const t0 = performance.now();
  let steps = 0;
  while (steps < seconds * hz && run.d.step()) steps++;
  const p = g.player;
  return {
    stats: g.stats,
    time: Math.round(g.time), state: g.state, victory: !!(g.result && g.result.victory), level: p.level, hp: Math.round(p.hp), maxHp: p.maxHp, kills: g.kills, gold: g.gold,
    enemies: g.enemies.length, floor: g.floor, phase: +g.phase.toFixed(2),
    weapons: p.weapons.map((w) => `${w.id}:${w.level}`).join(' '), passives: [...p.passives].map(([k, v]) => `${k}:${v}`).join(' '),
    msPerStep: +((performance.now() - t0) / Math.max(1, steps)).toFixed(2), boss: g.boss ? g.boss.type + ' ' + Math.round(g.boss.hp) : null,
  };
}

window.__fs = { app, view, input, saveSettings, sim };

boot();
