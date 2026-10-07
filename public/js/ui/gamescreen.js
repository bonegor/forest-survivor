// The in-game screen: runs a Game and layers the HUD and modal overlays
// (level up, treasure chests, pause, results) on top.

import { input } from '../engine/input.js';
import { sfx, playMusic } from '../engine/audio.js';
import { view } from '../engine/view.js';
import { SPR, smoothScaled } from '../engine/sprites.js';
import { fmtTime, fmtNum, clamp, ease, rand, TAU } from '../engine/util.js';
import { Game } from '../game/game.js';
import { WEAPONS, MAX_WEAPON_LEVEL } from '../data/weapons.js';
import { PASSIVES } from '../data/passives.js';
import { HEROES } from '../data/heroes.js';
import { DIFFICULTY, MODES } from '../data/difficulty.js';
import { metaBonuses, rankTitle } from '../shared/profile.js';
import { unlockText } from './ladder.js';
import { panel, button, dim, drawText, drawRich, wrapText, textWidth, textCanvas, logo } from './ui.js';
import { OptionsScreen } from './screens.js';

export class GameScreen {
  enter(app, params) {
    this.app = app;
    const c = params.checkpoint;
    const hero = c ? c.hero : app.choice.hero;
    const mode = c ? c.mode : app.choice.mode;
    this.game = new Game({
      hero,
      mode,
      // Ranked plays one fixed ruleset so personal bests compare fairly.
      diff: mode === 'ranked' ? 'medium' : c ? c.diff : app.choice.diff,
      rankedBest: mode === 'ranked' ? app.store.profile.ranked?.[hero] || 0 : 0,
      meta: metaBonuses(app.store.profile),
      settings: app.settings,
      checkpoint: c || null,
    });
    const g = this.game;
    g.onCheckpoint = () => app.store.saveCheckpoint(g.checkpoint());
    if (g.mode === 'dungeon' && !c) app.store.saveCheckpoint(g.checkpoint());
    this.overlay = null;
    this.autosaveT = 60;
    input.joystickEnabled = true;
    input.touchRegions = (x, y) => {
      const W = view.W, H = view.H;
      if (x > W / 2 - 14 && x < W / 2 + 14 && y > H - 22) return 'pause';
      if (x > W - 56 && y > H - 56) return 'ult';
      return null;
    };
    window.__game = g;
  }

  leave() {
    input.joystickEnabled = false;
    input.touchRegions = null;
    input.stick.active = false;
  }

  open(overlay) {
    this.overlay = overlay;
    this.app.ui.lock(overlay.lockTime ?? 0.35);
  }

  frame(dt) {
    const app = this.app, g = this.game;
    if (!this.overlay) {
      if (input.pressed('pause') && g.state === 'play') {
        g.state = 'paused';
        this.open(new PauseOverlay(this));
        sfx('back');
      }
      if (input.pressed('map') && g.mode === 'dungeon') g.showMap = !g.showMap;
      if (input.pressed('fps')) app.settings.fps = !app.settings.fps;
      if (!app.devHold) g.update(dt); // the developer panel can freeze the action
      if (g.state === 'play' && g.pendingLevels > 0) {
        g.state = 'levelup';
        this.open(new LevelUpOverlay(this));
      } else if (g.state === 'play' && g.chestQueue.length) {
        g.state = 'chest';
        this.open(new ChestOverlay(this, g.chestQueue.shift()));
      }
      if (g.state === 'over') this.open(new ResultsOverlay(this));
      if (g.mode !== 'dungeon' && g.state === 'play') {
        this.autosaveT -= dt;
        if (this.autosaveT <= 0) {
          this.autosaveT = 60;
          app.store.saveCheckpoint(g.checkpoint());
        }
      }
    }
    // World.
    g.draw(view.ctx);
    // HUD + overlay on the UI canvas.
    const ctx = view.uctx, W = view.W, H = view.H;
    ctx.clearRect(0, 0, W, H);
    if (g.state !== 'over' || !this.overlay) g.hud.draw(ctx, W, H, g.time + g.frame * 0);
    if (this.overlay) {
      const r = this.overlay.draw(ctx, W, H, dt);
      if (r === 'close') this.overlay = null;
    }
  }
}

// --------------------------------------------------------------- level up --

function choiceInfo(g, c) {
  const p = g.player;
  if (c.type === 'weapon') {
    const def = WEAPONS[c.id];
    const desc = c.isNew ? def.desc : def.levels[c.level - 2]?.text || def.desc;
    let hint = null;
    if (def.evo) hint = { text: 'Evolves with', icon: PASSIVES[def.evo.with].icon, owned: p.passives.has(def.evo.with) };
    return { name: def.name, icon: def.icon, desc, tag: c.isNew ? 'NEW!' : `LV ${c.level}`, color: c.isNew ? '#0099db' : '#c0cbdc', hint };
  }
  if (c.type === 'passive') {
    const def = PASSIVES[c.id];
    let hint = null;
    for (const w of p.weapons) if (!w.evolved && w.def.evo && w.def.evo.with === c.id) hint = { text: 'Evolves', icon: w.def.icon, owned: true };
    return { name: def.name, icon: def.icon, desc: def.desc, tag: c.isNew ? 'NEW!' : `LV ${c.level}`, color: c.isNew ? '#63c74d' : '#9ee562', hint };
  }
  if (c.type === 'bless') return { name: 'Blessing of Valor', icon: 'i_might', desc: 'Might {+5%}, health {+2%}. Stacks.', tag: `x${p.blessings + 1}`, color: '#fee761' };
  if (c.type === 'gold') return { name: 'Purse of Gold', icon: 'i_greed', desc: `Gain {${c.value}} gold.`, tag: '', color: '#feae34' };
  return { name: 'Roast Chicken', icon: 'i_vitality', desc: `Restore {${Math.round(c.value * 100)}%} health.`, tag: '', color: '#e43b44' };
}

class LevelUpOverlay {
  constructor(gs) {
    this.gs = gs;
    this.g = gs.game;
    this.t = 0;
    this.roll();
    this.lockTime = 0.45;
  }

  roll() {
    this.choices = this.g.levelChoices(this.g.choiceCount());
    this.t = 0;
    this.gs.app.ui.focusId = 'c0';
  }

  choose(i) {
    const g = this.g;
    g.applyChoice(this.choices[i]);
    g.pendingLevels--;
    sfx('pick');
    if (g.pendingLevels > 0) {
      this.roll();
      this.gs.app.ui.lock(0.3);
      return null;
    }
    g.state = 'play';
    return 'close';
  }

  draw(ctx, W, H, dt) {
    const ui = this.gs.app.ui, g = this.g;
    this.t += dt;
    dim(ctx, W, H, 0.6);
    // Rotating light rays behind the title.
    ctx.save();
    ctx.translate(W / 2, 28);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#2ce8f5';
    for (let i = 0; i < 12; i++) {
      ctx.rotate(TAU / 12);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W, -14 + Math.sin(this.t * 2 + i) * 4);
      ctx.lineTo(W, 14);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    const L = logo('LEVEL UP!', ['#ffffff', '#c0f8ff', '#2ce8f5', '#0099db', '#124e89']);
    const pop = this.t < 0.25 ? 1.6 - 0.6 * ease.outBack(this.t / 0.25) : 1;
    const s = Math.min(1, (W - 40) / L.width) * pop;
    ctx.drawImage(L, Math.round(W / 2 - (L.width * s) / 2), Math.round(18 - (L.height * (s - 1)) / 2), Math.round(L.width * s), Math.round(L.height * s));
    drawText(ctx, `LEVEL ${g.player.level - g.pendingLevels + 1}`, W / 2, 18 + L.height + 2, { align: 'center', color: '#8b9bb4' });

    ui.begin(dt);
    const n = this.choices.length;
    const vertical = W < 300;
    let result = null;
    const top = 18 + L.height + 14;
    const avail = H - top - 26;
    for (let i = 0; i < n; i++) {
      const info = choiceInfo(g, this.choices[i]);
      let x, y, w, h;
      if (vertical) {
        w = W - 16;
        h = Math.min(56, Math.floor(avail / n) - 4);
        x = 8;
        y = top + i * (h + 4);
      } else {
        w = Math.min(118, Math.floor((W - 20 - (n - 1) * 6) / n));
        h = Math.min(156, avail);
        x = Math.round(W / 2 - (n * w + (n - 1) * 6) / 2) + i * (w + 6);
        y = top;
      }
      // Slide-in animation.
      const k = clamp((this.t - i * 0.06) / 0.25, 0, 1);
      y += Math.round((1 - ease.outCubic(k)) * 40);
      if (k <= 0) continue;
      const id = 'c' + i;
      if (ui.item(id, x, y, w, h)) result = this.choose(i);
      const f = ui.focused(id);
      const lift = f ? -2 : 0;
      panel(ctx, x, y + lift, w, h, { trim: f ? ['#ffffff', info.color] : [info.color, '#262b44'], rivets: f });
      if (f) {
        ctx.globalAlpha = 0.12 + 0.06 * Math.sin(this.t * 6);
        ctx.fillStyle = info.color;
        ctx.fillRect(x + 3, y + lift + 3, w - 6, h - 6);
        ctx.globalAlpha = 1;
      }
      const icon = SPR[info.icon].frames[0];
      if (vertical) {
        ctx.drawImage(smoothScaled(icon, 1), x + 6, y + lift + Math.floor(h / 2) - 16);
        drawText(ctx, info.name, x + 44, y + lift + 6, { color: info.color });
        if (info.tag) drawText(ctx, info.tag, x + w - 6, y + lift + 6, { align: 'right', color: info.tag === 'NEW!' ? '#fee761' : '#8b9bb4' });
        const lines = wrapText(info.desc, w - 52);
        lines.slice(0, 3).forEach((ln, j) => drawRich(ctx, ln, x + 44, y + lift + 17 + j * 9, { color: '#c0cbdc' }));
      } else {
        const big = smoothScaled(icon, 1);
        ctx.drawImage(big, Math.round(x + w / 2 - big.width / 2), y + lift + 8);
        const nameLines = wrapText(info.name, w - 10);
        let ty = y + lift + 44;
        for (const ln of nameLines) {
          drawText(ctx, ln, x + w / 2, ty, { align: 'center', color: info.color });
          ty += 9;
        }
        if (info.tag) {
          drawText(ctx, info.tag, x + w / 2, ty + 1, { align: 'center', color: info.tag === 'NEW!' ? (Math.floor(this.t * 4) % 2 ? '#fee761' : '#feae34') : '#8b9bb4' });
          ty += 12;
        }
        ty += 2;
        for (const ln of wrapText(info.desc, w - 12)) {
          drawRich(ctx, ln, x + w / 2, ty, { align: 'center', color: '#c0cbdc' });
          ty += 9;
        }
        if (info.hint && h > 120) {
          const hy = y + lift + h - 22;
          drawText(ctx, info.hint.text, x + w / 2 - 6, hy + 4, { align: 'center', color: info.hint.owned ? '#feae34' : '#5a6988' });
          ctx.drawImage(SPR[info.hint.icon].frames[0].c, Math.round(x + w / 2 + textWidth(info.hint.text) / 2 - 3), hy);
        }
      }
      drawText(ctx, String(i + 1), x + 5, y + lift + 4, { color: '#3a4466', outline: null });
    }
    const p = g.player;
    if (p.rerolls > 0 && this.t > 0.3) {
      if (button(ctx, ui, 'reroll', Math.round(W / 2 - 45), H - 20, 90, 13, `REROLL ×${p.rerolls}`, { color: '#2ce8f5' }) || input.pressed('reroll')) {
        p.rerolls--;
        sfx('teleport');
        this.roll();
      }
    }
    ui.end();
    const keys = ['one', 'two', 'three', 'four'];
    for (let i = 0; i < n; i++) if (input.pressed(keys[i]) && ui.lockT <= 0 && this.t > 0.3) result = this.choose(i);
    return result;
  }
}

// ------------------------------------------------------------------ chest --

class ChestOverlay {
  constructor(gs, kind) {
    this.gs = gs;
    this.g = gs.game;
    this.kind = kind;
    this.t = 0;
    this.roll = this.g.rollChest(kind);
    this.g.gold += this.roll.gold;
    this.g.stats.gold += this.roll.gold;
    this.revealed = 0;
    this.coins = [];
    this.lockTime = 0.6;
    sfx('chest');
  }

  draw(ctx, W, H, dt) {
    const ui = this.gs.app.ui, g = this.g;
    this.t += dt;
    dim(ctx, W, H, 0.7);
    const cx = W / 2, cy = H * 0.36;
    const opened = this.t > 1;
    // Light rays once open.
    if (opened) {
      const k = clamp((this.t - 1) / 0.4, 0, 1);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.t * 0.4);
      ctx.globalAlpha = 0.18 * k;
      ctx.fillStyle = '#fee761';
      for (let i = 0; i < 14; i++) {
        ctx.rotate(TAU / 14);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(W, -10);
        ctx.lineTo(W, 10);
        ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      const gl = ctx.createRadialGradient(cx, cy, 2, cx, cy, 70 * k + 10);
      gl.addColorStop(0, 'rgba(255,230,140,0.6)');
      gl.addColorStop(1, 'rgba(255,230,140,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(cx - 90, cy - 90, 180, 180);
    }
    // Shaking chest.
    const shake = !opened ? Math.sin(this.t * 50) * (this.t * 2) : 0;
    const spr = SPR.chest.frames[opened ? 1 : 0];
    const s = 3;
    ctx.drawImage(spr.c, Math.round(cx - (spr.w * s) / 2 + shake), Math.round(cy - (spr.h * s) / 2), spr.w * s, spr.h * s);
    if (opened && !this.burst) {
      this.burst = true;
      sfx('chestopen');
      for (let i = 0; i < 40; i++) this.coins.push({ x: cx, y: cy - 6, vx: rand(-90, 90), vy: rand(-160, -60), life: rand(0.8, 1.6) });
    }
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.life -= dt;
      if (c.life <= 0) {
        this.coins.splice(i, 1);
        continue;
      }
      c.vy += 260 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      ctx.drawImage(SPR.coin.frames[Math.floor((c.life * 12) % 4)].c, Math.round(c.x), Math.round(c.y));
    }
    // Items, one at a time.
    const items = this.roll.items;
    const iy = Math.round(cy + 30);
    if (opened) {
      const due = Math.min(items.length, Math.floor((this.t - 1.2) / 0.45) + 1);
      while (this.revealed < due) {
        const it = items[this.revealed++];
        if (it.type === 'evolve') {
          it.w.evolve();
          sfx('levelup');
          g.whiteFlash = 0.5;
        } else sfx('pick');
      }
      const slot = Math.min(84, Math.floor((W - 16) / Math.max(1, items.length)));
      const rowW = slot * items.length;
      items.slice(0, this.revealed).forEach((it, i) => {
        const x = Math.round(W / 2 - rowW / 2 + (i + 0.5) * slot);
        let icon, name, sub, color;
        if (it.type === 'evolve') {
          const d = WEAPONS[it.id];
          icon = d.icon;
          name = d.name;
          sub = 'EVOLVED!';
          color = '#f77622';
        } else if (it.type === 'weapon') {
          icon = WEAPONS[it.id].icon;
          name = WEAPONS[it.id].name;
          sub = `LV ${it.level}`;
          color = '#c0cbdc';
        } else {
          icon = PASSIVES[it.id].icon;
          name = PASSIVES[it.id].name;
          sub = `LV ${it.level}`;
          color = '#9ee562';
        }
        const big = smoothScaled(SPR[icon].frames[0], 1);
        ctx.drawImage(big, x - big.width / 2, iy);
        const lines = wrapText(name, slot - 6);
        lines.forEach((ln, j) => drawText(ctx, ln, x, iy + 34 + j * 9, { align: 'center', color }));
        drawText(ctx, sub, x, iy + 34 + lines.length * 9, { align: 'center', color: it.type === 'evolve' ? '#fee761' : '#8b9bb4' });
      });
      if (items.some((it) => it.type === 'evolve') && this.revealed > 0) {
        const L = logo('EVOLUTION!', ['#ffffff', '#fee761', '#feae34', '#f77622', '#be4a2f']);
        const k = Math.min(1, W / 2 / L.width);
        ctx.drawImage(L, Math.round(W / 2 - (L.width * k) / 2), 10, Math.round(L.width * k), Math.round(L.height * k));
      }
      drawText(ctx, `+${this.roll.gold} GOLD`, W / 2, iy + 66, { align: 'center', color: '#fee761' });
    }
    ui.begin(dt);
    let res = null;
    const done = opened && this.revealed >= items.length && this.t > 1.6;
    if (done) {
      if (button(ctx, ui, 'take', Math.round(W / 2 - 40), H - 22, 80, 14, 'COLLECT') || input.pressed('back')) {
        this.g.state = 'play';
        res = 'close';
      }
    } else if (this.t > 0.4 && (input.pressed('confirm') || input.mouse.clicked)) {
      // Skip ahead.
      this.t = Math.max(this.t, 1 + items.length * 0.45 + 0.8);
    }
    ui.end();
    return res;
  }
}

// ------------------------------------------------------------------ pause --

class PauseOverlay {
  constructor(gs) {
    this.gs = gs;
    this.g = gs.game;
    this.options = null;
    this.confirm = false;
    gs.app.ui.focusId = 'resume';
  }

  draw(ctx, W, H, dt) {
    const ui = this.gs.app.ui, g = this.g, app = this.gs.app;
    if (this.options) {
      const r = this.options.draw(ctx, W, H, dt, true);
      if (r === 'close') {
        this.options = null;
        ui.focusId = 'resume';
        g.numbers.enabled = app.settings.numbers !== false;
      }
      return null;
    }
    dim(ctx, W, H, 0.6);
    const pw = Math.min(W - 16, 320), ph = Math.min(H - 20, 196);
    const x = Math.round(W / 2 - pw / 2), y = Math.round(H / 2 - ph / 2) + 4;
    panel(ctx, x, y, pw, ph, { title: 'PAUSED' });
    const p = g.player;
    // Build.
    let bx = x + 8, by = y + 10;
    drawText(ctx, 'WEAPONS', bx, by, { color: '#8b9bb4' });
    by += 10;
    for (const w of p.weapons) {
      ctx.drawImage(SPR[w.def.icon].frames[0].c, bx, by - 3);
      drawText(ctx, `${w.def.name}`, bx + 18, by + 1, { color: w.evolved ? '#f77622' : '#c0cbdc' });
      drawText(ctx, w.evolved ? 'MAX' : `LV ${w.level}`, x + pw / 2 - 6, by + 1, { align: 'right', color: '#8b9bb4' });
      by += 15;
    }
    let sx = x + pw / 2 + 4, sy = y + 10;
    drawText(ctx, 'RELICS', sx, sy, { color: '#8b9bb4' });
    sy += 10;
    for (const [id, r] of p.passives) {
      ctx.drawImage(SPR[PASSIVES[id].icon].frames[0].c, sx, sy - 3);
      drawText(ctx, PASSIVES[id].name, sx + 18, sy + 1, { color: '#c0cbdc' });
      drawText(ctx, `${r}`, x + pw - 8, sy + 1, { align: 'right', color: '#8b9bb4' });
      sy += 15;
    }
    const statY = Math.max(by, sy) + 2;
    const stats = `TIME ${fmtTime(g.time)} · LV ${p.level} · KILLS ${fmtNum(g.kills)} · GOLD ${fmtNum(g.gold)}`;
    drawText(ctx, stats, W / 2, Math.min(statY, y + ph - 50), { align: 'center', color: '#feae34' });
    ui.begin(dt);
    const bw = Math.min(90, (pw - 30) / 2);
    const row1 = y + ph - 38, row2 = y + ph - 20;
    if (button(ctx, ui, 'resume', Math.round(W / 2 - bw - 4), row1, bw, 13, 'RESUME') || (input.pressed('pause') && ui.lockT <= 0)) {
      g.state = 'play';
      return 'close';
    }
    if (button(ctx, ui, 'opts', Math.round(W / 2 + 4), row1, bw, 13, 'OPTIONS')) {
      this.options = new OptionsScreen();
      this.options.enter(app, { back: null });
    }
    if (button(ctx, ui, 'save', Math.round(W / 2 - bw - 4), row2, bw, 13, 'SAVE & QUIT')) {
      app.store.saveCheckpoint(g.checkpoint()).then(() => app.go('title'));
      return null;
    }
    if (button(ctx, ui, 'quit', Math.round(W / 2 + 4), row2, bw, 13, this.confirm ? 'SURE?' : 'GIVE UP', { color: '#e43b44' })) {
      if (this.confirm) {
        g.finish(false);
        this.gs.open(new ResultsOverlay(this.gs));
        return null;
      }
      this.confirm = true;
    }
    ui.end();
    return null;
  }
}

// ---------------------------------------------------------------- results --

class ResultsOverlay {
  constructor(gs) {
    this.gs = gs;
    this.g = gs.game;
    this.t = 0;
    this.reward = null;
    this.shown = 0;
    this.lockTime = 1;
    const res = this.g.result || (this.g.finish(false), this.g.result);
    this.res = res;
    gs.app.store.submitRun({
      mode: res.mode, diff: res.diff, hero: res.hero, victory: res.victory, time: res.time, gold: res.gold, kills: res.kills, level: res.level, floor: res.floor,
    }).then((r) => {
      this.reward = r;
    });
    if (res.victory) playMusic('title');
    gs.app.ui.focusId = 'again';
  }

  draw(ctx, W, H, dt) {
    const ui = this.gs.app.ui, app = this.gs.app, res = this.res;
    this.t += dt;
    dim(ctx, W, H, Math.min(0.85, this.t * 1.5));
    const title = res.victory ? (res.mode === 'dungeon' ? 'VICTORY' : 'DAWN BREAKS') : 'YOU HAVE FALLEN';
    const cols = res.victory ? ['#ffffff', '#fee761', '#feae34', '#f77622', '#be4a2f'] : ['#f6757a', '#e43b44', '#a22633', '#5c0f1c', '#3e2731'];
    const L = logo(title, cols);
    const s = Math.min(1, (W - 20) / L.width);
    const a = clamp(this.t * 2, 0, 1);
    ctx.globalAlpha = a;
    ctx.drawImage(L, Math.round(W / 2 - (L.width * s) / 2), 8, Math.round(L.width * s), Math.round(L.height * s));
    ctx.globalAlpha = 1;
    const ranked = res.mode === 'ranked';
    const sub = `${HEROES[res.hero].name} · ${MODES[res.mode].name} ${MODES[res.mode].sub}` + (ranked ? '' : ` · ${DIFFICULTY[res.diff].name}`);
    drawText(ctx, sub, W / 2, 12 + L.height * s, { align: 'center', color: '#8b9bb4' });
    if (this.t < 0.6) return null;
    // Personal bests and anything this run unlocked, shown above the gold.
    const notes = [];
    if (this.reward) {
      const rk = this.reward.ranked;
      if (rk) notes.push(rk.personalBest ? ['★ NEW PERSONAL BEST ★', '#63c74d'] : [`Personal best: ${fmtTime(rk.best)}`, '#8b9bb4']);
      for (const k of this.reward.unlocks || []) notes.push([unlockText(k), '#fee761']);
      if (!this.announced && (this.reward.unlocks?.length || rk?.personalBest)) {
        this.announced = true;
        sfx('chest');
      }
    }
    const pw = Math.min(W - 16, 340), ph = Math.min(H - 70 - L.height * s, 160 + notes.length * 10);
    const x = Math.round(W / 2 - pw / 2), y = Math.round(26 + L.height * s);
    panel(ctx, x, y, pw, ph);
    // Stats column.
    const st = res.stats;
    const rows = [
      [ranked ? 'Survived' : 'Time', fmtTime(res.time)],
      ['Level', String(res.level)],
      ['Kills', fmtNum(res.kills)],
      ['Best combo', String(st.maxCombo)],
      ['Bosses slain', String(st.bosses)],
      ['Damage dealt', fmtNum(st.damage)],
    ];
    if (res.mode === 'dungeon') rows.splice(1, 0, ['Floor reached', String(res.floor)]);
    if (ranked) rows.splice(1, 0, ['Rank', rankTitle(res.time)]);
    let ty = y + 8;
    for (const [k, v] of rows) {
      drawText(ctx, k, x + 8, ty, { color: '#8b9bb4' });
      drawText(ctx, v, x + 108, ty, { align: 'right', color: '#c0cbdc' });
      ty += 10;
    }
    // Weapons.
    let wy = y + 8;
    const wx = x + 120;
    for (const w of res.weapons.slice(0, 6)) {
      const def = WEAPONS[w.id];
      ctx.drawImage(SPR[def.icon].frames[0].c, wx, wy - 3);
      drawText(ctx, def.name, wx + 18, wy + 1, { color: def.evolved ? '#f77622' : '#c0cbdc' });
      const secs = Math.max(1, res.time - (w.since || 0));
      drawText(ctx, `${fmtNum(w.dmg)}  ${fmtNum(w.dmg / secs)}/s`, x + pw - 8, wy + 1, { align: 'right', color: '#feae34' });
      wy += 15;
    }
    // Gold reward.
    const gy = y + ph - 33;
    notes.forEach(([text, color], i) => drawText(ctx, text, W / 2, gy - 4 - (notes.length - i) * 10, { align: 'center', color }));
    if (this.reward) {
      this.shown = Math.min(this.reward.total, this.shown + Math.max(1, this.reward.total * dt * 1.5));
      if (Math.floor(this.shown) % 5 === 0 && this.shown < this.reward.total) sfx('coin');
      const parts = `Collected ${res.gold} × ${this.reward.multiplier}` + (this.reward.bonus ? ` + ${this.reward.bonus} victory bonus` : '');
      drawText(ctx, parts, W / 2, gy, { align: 'center', color: '#8b9bb4' });
      const c = textCanvas(`+${Math.floor(this.shown)} GOLD`, ['#fff3a8', '#fee761', '#feae34'], '#181425');
      ctx.drawImage(c, Math.round(W / 2 - c.width), gy + 9, c.width * 2, c.height * 2);
    } else drawText(ctx, 'Counting your spoils…', W / 2, gy + 6, { align: 'center', color: '#8b9bb4' });
    ui.begin(dt);
    const by = Math.min(H - 20, y + ph + 6);
    if (button(ctx, ui, 'again', Math.round(W / 2 - 104), by, 100, 14, 'TRY AGAIN')) {
      app.choice = { hero: res.hero, mode: res.mode, diff: res.diff };
      app.startRun();
    }
    if (button(ctx, ui, 'camp', Math.round(W / 2 + 4), by, 100, 14, 'RETURN TO CAMP')) app.go('title');
    ui.end();
    return null;
  }
}
