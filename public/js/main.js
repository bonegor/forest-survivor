// Forest Survivor — boot, screen management and the main loop.

import { initView, view, presentUI } from './engine/view.js';
import { initInput, input } from './engine/input.js';
import { buildSprites } from './engine/sprites.js';
import { store, loadSettings, saveSettings, DEBUG } from './engine/storage.js';
import { RELEASE } from './engine/build.js';
import { initAudio, setVolumes, setCombatMusic, stopCombatMusicPreview } from './engine/audio.js';
import { drawText } from './engine/font.js';
import { makeCanvas } from './engine/util.js';
import { UI } from './ui/ui.js';
import { MenuScene } from './ui/background.js';
import { TitleScreen, HeroScreen, ModeScreen, ArmoryScreen, CodexScreen, RecordsScreen, OptionsScreen } from './ui/screens.js';
import { GameScreen } from './ui/gamescreen.js';
import { PrologueScreen } from './ui/prologue.js';
import { MAPS } from './data/maps.js';

const SCREENS = {
  title: TitleScreen,
  hero: HeroScreen,
  mode: ModeScreen,
  armory: ArmoryScreen,
  codex: CodexScreen,
  records: RecordsScreen,
  options: OptionsScreen,
  game: GameScreen,
  prologue: PrologueScreen,
};

const app = {
  ui: new UI(),
  scene: new MenuScene(),
  store,
  settings: loadSettings(),
  choice: { hero: 'knight', mode: 's15', diff: 'medium', nightmare: false }, // diff, nightmare, map: as last chosen (settings), below
  screen: null,
  screenName: '',
  audioUnlocked: false,

  go(name, params = {}) {
    stopCombatMusicPreview();
    if (this.screen && this.screen.leave) this.screen.leave();
    const S = SCREENS[name];
    this.screen = new S();
    this.screenName = name;
    this.ui.focusId = null;
    this.screen.enter(this, params);
  },

  startRun() {
    setCombatMusic(this.settings.combatMusic);
    this.go('game', {});
  },

  applySettings() {
    setVolumes(this.settings.music, this.settings.sfx);
    setCombatMusic(this.settings.combatMusic);
    if (this.screen && this.screen.game) {
      this.screen.game.settings = this.settings;
      this.screen.game.numbers.enabled = this.settings.numbers !== false;
      this.screen.game.numbers.steady = this.settings.softFlash === true;
    }
  },

  toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  },
};

// Normal, Veteran or Elite, and Nightmare or not, as the player last chose (the trial screen saves
// them with the settings); a new player starts on Normal.
app.choice.diff = ['easy', 'medium', 'hard'].includes(app.settings.diff) ? app.settings.diff : 'easy';
app.choice.nightmare = app.settings.nightmare === true;
// The Survival map as last chosen on the trial screen (settings.map, data/maps.js), where it names
// one; else none, and the trial screen shows its default (ui/screens.js shownMap: for a save from
// before the maps, the Darkwood). A new player's first night, the prologue's, saves the desert.
if (Object.hasOwn(MAPS, app.settings.map ?? '')) app.choice.map = app.settings.map;

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
  // F11 at any time; F only off the battlefield (27 October 2026): mid-fight a stray F left the
  // window with nothing paused.
  if (input.pressed('fullscreen') && (input.justDown.has('F11') || app.screen?.game?.state !== 'play')) app.toggleFullscreen();
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
  setCombatMusic(app.settings.combatMusic);
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
  // Developer panel: loaded on demand with ` (or straight away with ?dev, for its DEV button),
  // where developer mode is on (the server's --dev or DEV_KEY, or the static game on this
  // machine), and at the debug address wherever it is served, GitHub Pages too, its DEV button
  // there from the start (a phone has no `). The debug game keeps a save of its own, a client
  // save (storage.js DEBUG), so what the panel does there never reaches a player's. A release
  // (engine/build.js RELEASE) has no panel: the zip leaves it out.
  let devPanel = null;
  const openDev = async () => {
    if (RELEASE) return null;
    if (!devPanel && !DEBUG && !(await store.devStatus()).enabled) return null;
    devPanel = devPanel || (await import('./dev/panel.js')).createDevPanel(app);
    return devPanel;
  };
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Backquote' || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '')) return;
    e.preventDefault();
    openDev().then((p) => p?.toggle());
  });
  if (DEBUG || new URLSearchParams(location.search).has('dev')) openDev();
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
