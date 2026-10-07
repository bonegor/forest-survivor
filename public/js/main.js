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
  choice: { hero: 'knight', mode: 's15', diff: 'medium' },
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
      view.uctx.clearRect(0, 0, 40, 12);
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
}

// Hooks for automated play-testing: a crude bot that kites the horde.
function botStep(g) {
  const p = g.player;
  // Centroid of nearby foes and the closest one.
  let cx = 0, cy = 0, n = 0, dn = 1e9, near = null;
  for (const e of g.enemies) {
    if (e.dead || e.prop || e.sleeping) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < 160) {
      cx += e.x;
      cy += e.y;
      n++;
    }
    if (d < dn) {
      dn = d;
      near = e;
    }
  }
  let fx = 0, fy = 0;
  const side = Math.floor(g.time / 7) % 2 ? 1 : -1;
  if (n) {
    cx /= n;
    cy /= n;
    let tx = cx - p.x, ty = cy - p.y;
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    const px = -ty * side, py = tx * side; // tangent: circle the horde
    const keep = near && near.boss ? (p.id === 'knight' ? 30 : 70) : p.id === 'knight' ? 26 : 44;
    if (dn < keep) {
      fx = -tx * 1.2 + px;
      fy = -ty * 1.2 + py;
    } else if (dn > 70) {
      fx = tx * 0.7 + px * 0.7;
      fy = ty * 0.7 + py * 0.7;
    } else {
      fx = px - tx * 0.15;
      fy = py - ty * 0.15;
    }
  }
  // Bosses hit hard: keep a healthy distance.
  for (const e of g.enemies) {
    if (!e.boss || e.dead || e.sleeping) continue;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    const safe = p.id === 'knight' && p.hp > p.maxHp * 0.6 ? 30 : 80;
    if (d < safe) {
      fx += (dx / d) * 2.5 * (1 - d / safe);
      fy += (dy / d) * 2.5 * (1 - d / safe);
    }
  }
  // Hunt the boss down while healthy, like a player would.
  if (g.boss && !g.boss.dead && !g.boss.sleeping && p.hp > p.maxHp * 0.6) {
    const dx = g.boss.x - p.x, dy = g.boss.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (d > 50) {
      fx += (dx / d) * 1.1;
      fy += (dy / d) * 1.1;
    }
  }
  // Dodge missiles and telegraphed slams.
  for (const s of g.eshots) {
    const dx = p.x - s.x, dy = p.y - s.y, d2 = dx * dx + dy * dy;
    if (d2 < 50 * 50) {
      fx += (dx / Math.max(25, d2)) * 40;
      fy += (dy / Math.max(25, d2)) * 40;
    }
  }
  for (const e of g.effects) {
    if (!e.o || e.o.shape !== 'circle') continue;
    const dx = p.x - e.o.x, dy = p.y - e.o.y, d = Math.hypot(dx, dy) || 1;
    if (d < e.o.r + 10) {
      fx += (dx / d) * 3;
      fy += (dy / d) * 3;
    }
  }
  // Grab loot when it's calm.
  if (dn > 40) {
    let best = null, bd = 1e9;
    for (const pk of g.pickups) {
      const d = (pk.x - p.x) ** 2 + (pk.y - p.y) ** 2;
      const w = pk.kind === 'chest' || pk.kind === 'potion' || pk.kind === 'magnet' ? d * 0.1 : d;
      if (w < bd) {
        bd = w;
        best = pk;
      }
    }
    if (best && bd < 200 * 200) {
      const dx = best.x - p.x, dy = best.y - p.y, l = Math.hypot(dx, dy) || 1;
      fx += (dx / l) * 0.8;
      fy += (dy / l) * 0.8;
    }
  }
  // Dungeon goals.
  const w = g.world;
  // While the seal holds, fight in the open like in survival; then go find the guardian.
  if (w.stairs || (w.guardian && w.guardian.sleeping && !w.sealed)) {
    // Walk the corridors toward the stairs or the guardian using a BFS field rooted there.
    const T = 16;
    const goal = w.stairs ? [Math.floor(w.stairs.x / T), Math.floor((w.stairs.y + 4) / T)] : [w.guardRoom.cx, w.guardRoom.cy];
    if (!w._botFlow || w._botGoal !== goal.join()) {
      w._botFlow = w.bfs(goal[0], goal[1], new Int16Array(w.W * w.H));
      w._botGoal = goal.join();
    }
    const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
    let best = null, bd = w._botFlow[ty * w.W + tx];
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const d = w._botFlow[(ty + oy) * w.W + tx + ox];
      if (d >= 0 && d < bd) { bd = d; best = [tx + ox, ty + oy]; }
    }
    if (best) {
      const dx = best[0] * T + 8 - p.x, dy = best[1] * T + 8 - p.y, l = Math.hypot(dx, dy) || 1;
      const k = w.stairs ? 1.5 : 0.9;
      fx += (dx / l) * k;
      fy += (dy / l) * k;
    } else if (w.stairs) {
      // Already there (or off the field): head straight for the steps.
      const dx = w.stairs.x - p.x, dy = w.stairs.y + 4 - p.y, l = Math.hypot(dx, dy) || 1;
      fx += (dx / l) * 1.5;
      fy += (dy / l) * 1.5;
    }
  }
  const l = Math.hypot(fx, fy);
  input.bot = l > 1e-4 ? { x: fx / l, y: fy / l } : { x: 0, y: 0 };
  if (p.fury >= 100) input.virtual.add('ult');
}

function sim(seconds, opts = {}) {
  const gs = app.screen, g = gs.game;
  const dt = 1 / 30;
  const t0 = performance.now();
  let steps = 0;
  for (let t = 0; t < seconds; t += dt) {
    if (g.state === 'over') break;
    if (g.state === 'levelup') {
      const ch = g.levelChoices(g.choiceCount());
      // A sensible build: grow weapons, add up to four, then useful relics.
      const GOOD = ['might', 'area', 'cooldown', 'amount', 'armor', 'vitality', 'regen', 'duration', 'projspeed', 'movespeed'];
      const score = (c) => {
        if (c.type === 'weapon' && !c.isNew) return 0;
        if (c.type === 'weapon' && g.player.weapons.length < 4) return 1;
        if (c.type === 'passive') {
          const r = GOOD.indexOf(c.id);
          return 2 + (r < 0 ? 20 : r) + (c.isNew ? 0.5 : 0);
        }
        if (c.type === 'heal') return g.player.hp < g.player.maxHp * 0.7 ? 29 : 31;
        return c.type === 'bless' ? 30 : 32;
      };
      ch.sort((a, b) => score(a) - score(b));
      g.applyChoice(opts.random ? ch[Math.floor(Math.random() * ch.length)] : ch[0]);
      g.pendingLevels--;
      if (g.pendingLevels <= 0) g.state = 'play';
      continue;
    }
    if (g.state === 'chest') {
      g.state = 'play';
      continue;
    }
    if (g.state === 'play' && g.pendingLevels > 0) { g.state = 'levelup'; continue; }
    if (g.state === 'play' && g.chestQueue.length) {
      const roll = g.rollChest(g.chestQueue.shift());
      for (const it of roll.items) if (it.type === 'evolve') it.w.evolve();
      g.gold += roll.gold;
      continue;
    }
    if (opts.bot !== false) botStep(g);
    g.update(dt);
    input.virtual.clear();
    steps++;
  }
  input.bot = null;
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
