import { Prologue } from '../game/prologue.js';
import { input } from '../engine/input.js';
import { view } from '../engine/view.js';
import { saveSettings } from '../engine/storage.js';
import { clamp } from '../engine/util.js';
import { FIRST_MAP } from '../data/maps.js';
import { button, panel, dim, drawText, wrapText, textWidth } from './ui.js';
import { MusicMenu } from './music-menu.js';
import { stopCombatMusicPreview } from '../engine/audio.js';

export class PrologueScreen {
  enter(app, params = {}) {
    this.app = app;
    this.replay = !!params.replay;
    this.game = new Prologue({ settings: app.settings });
    this.paused = false;
    this.musicMenu = null;
    this.arrival = null;
    this.finished = false;
    app.ui.lock(0.4);
    app.ui.noSpace = true;
    input.releaseTouches();
    input.joystickEnabled = true;
    input.touchRegions = (x, y) => {
      if (x > view.W - 78 && y < 28) return 'skip';
      if (x > view.W - 32 && y > view.H - 28) return 'pause';
      return null;
    };
  }

  leave() {
    stopCombatMusicPreview();
    input.joystickEnabled = false;
    input.touchRegions = null;
    input.releaseTouches();
    this.app.ui.noSpace = false;
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    const app = this.app;
    if (this.replay) {
      app.go('title');
      return;
    }
    // The road ends in the desert, and the first night is spent there (the owner's, 28 October 2026:
    // "the first one where we start is the desert map"; data/maps.js FIRST_MAP), as is the trial
    // screen's until another map is picked: saved with the intro done, in the one write.
    app.settings.prologueDone = true;
    app.settings.map = FIRST_MAP;
    saveSettings(app.settings);
    app.choice = { hero: 'knight', mode: 's15', diff: 'easy', nightmare: false, map: FIRST_MAP };
    // These coins join the first night and are banked with its ordinary end-of-run save.
    app.go('game', { prologueGold: this.game.gold });
  }

  frame(dt) {
    const { app, game: g } = this, ui = app.ui;
    // Left behind (input.away): paused, as Esc would.
    const away = input.away && !this.paused && g.state === 'play' && this.arrival === null;
    if (away || (!this.musicMenu && input.pressed('pause') && ui.lockT <= 0 && this.arrival === null && (g.state === 'play' || this.paused))) {
      this.paused = !this.paused;
      g.state = this.paused ? 'paused' : 'play';
      input.releaseTouches();
      ui.focus('road_resume');
      ui.lock(0.2);
    }
    input.joystickEnabled = !this.paused && this.arrival === null && g.state !== 'over';
    if (!app.devHold && !this.paused && this.arrival === null) g.update(dt);
    if (g.reached && this.arrival === null) {
      this.arrival = 0;
      g.state = 'paused';
      input.releaseTouches();
    }
    if (this.arrival !== null) {
      this.arrival += dt;
      g.fade = clamp(this.arrival / 1.2, 0, 1);
      if (!this.replay && this.arrival >= 4) { this.finish(); return; }
    }
    g.draw(view.ctx);
    const ctx = view.uctx, W = view.W, H = view.H;
    ctx.clearRect(0, 0, W, H);
    if (this.arrival !== null) {
      // The road's end, the Sunscorch: the desert of the first night (28 October 2026).
      drawText(ctx, 'The Sunscorch', W / 2, H / 2 - 20, { align: 'center', color: '#fee761', font: 'gothic' });
      const lines = wrapText('By midday, Aldric reached the Sunscorch. Something stirred beneath the sand.', Math.min(290, W - 32));
      lines.forEach((s, i) => drawText(ctx, s, W / 2, H / 2 + i * 11, { align: 'center', color: '#ead4aa' }));
      if (this.replay) {
        ui.begin(dt);
        if (button(ctx, ui, 'road_done', W / 2 - 65, H / 2 + 45, 130, 15, 'RETURN TO CAMP')) this.finish();
        ui.end();
      }
      return;
    }
    this.drawHud(ctx, W, H, dt);
    if (this.paused || g.state === 'over') this.drawPause(ctx, W, H, dt);
  }

  drawHud(ctx, W, H, dt) {
    const { app, game: g } = this, p = g.player, ui = app.ui;
    ctx.fillStyle = 'rgba(25,34,27,0.85)';
    ctx.fillRect(0, 0, W, 49);
    // The road to the Sunscorch (28 October 2026), its title clear of SKIP INTRO: 144 pixels from 320
    // wide, the short one's 104 under it (the Darkwood's were 127 and 106).
    drawText(ctx, W < 320 ? 'Road to Sunscorch' : 'The road to the Sunscorch', 9, 7, { color: '#fff0c4', font: 'gothic' });
    drawText(ctx, `HP ${Math.ceil(p.hp)}/${p.maxHp}   GOLD ${g.gold}`, 9, 26, { color: '#fff0c4' });
    // The way from the camp to its end, a bar between their names, 12 pixels clear of each.
    const end = 'SUNSCORCH', bar = Math.max(16, W - 65 - textWidth(end));
    drawText(ctx, 'CAMP', 9, 39, { color: '#c7d4b0' });
    drawText(ctx, end, W - 9, 39, { align: 'right', color: '#c7d4b0' });
    ctx.fillStyle = '#354937'; ctx.fillRect(44, 41, bar, 3);
    ctx.fillStyle = '#e1c581'; ctx.fillRect(44, 41, bar * g.progress, 3);
    if (!this.paused && g.state === 'play') {
      ui.begin(dt);
      if (button(ctx, ui, 'road_skip', W - 73, 7, 65, 14, this.replay ? 'END REPLAY' : 'SKIP INTRO') || (input.pressed('skip') && ui.lockT <= 0)) {
        this.finish();
      }
      if (button(ctx, ui, 'road_pause', W - 27, H - 23, 20, 15, 'II')) {
        this.paused = true; g.state = 'paused'; input.releaseTouches(); ui.focus('road_resume'); ui.lock(0.2);
      }
      ui.end();
    }
    if (g.time < 7) {
      const move = input.device === 'touch' ? 'Drag to walk' : input.device === 'pad' ? 'Left stick to walk' : 'WASD or arrows to walk';
      const lines = wrapText(`${move}. Follow the road east. Your sword attacks automatically.`, Math.min(300, W - 55));
      ctx.fillStyle = 'rgba(25,34,27,0.8)'; ctx.fillRect(5, H - 13 - lines.length * 11, W - 40, lines.length * 11 + 8);
      lines.forEach((s, i) => drawText(ctx, s, 10, H - 10 - (lines.length - i) * 11, { color: '#fff0c4' }));
    }
    if (g.guideAlpha > 0.02 && !this.paused) {
      const target = g.guideTarget(), angle = Math.atan2(target.y - p.y, target.x - p.x);
      const a = g.guideAlpha * (0.6 + 0.15 * Math.sin(g.time * 2.5));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(W / 2 + Math.cos(angle) * 40, H / 2 + Math.sin(angle) * 40);
      ctx.rotate(angle);
      ctx.fillStyle = '#fff0b0';
      ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-3, -7); ctx.lineTo(0, -2); ctx.lineTo(-10, -2); ctx.lineTo(-10, 2); ctx.lineTo(0, 2); ctx.lineTo(-3, 7); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = g.guideAlpha;
      drawText(ctx, 'Follow the path', W / 2, H - 44, { align: 'center', color: '#fff0b0' });
      ctx.globalAlpha = 1;
    }
  }

  drawPause(ctx, W, H, dt) {
    const { app, game: g } = this, ui = app.ui, fallen = g.state === 'over';
    if (this.musicMenu) {
      if (this.musicMenu.draw(ctx, W, H, dt) === 'close') {
        this.musicMenu = null;
        ui.focus('road_music');
      }
      return;
    }
    dim(ctx, W, H, 0.6);
    const w = Math.min(250, W - 20), x = (W - w) / 2;
    const lines = wrapText(fallen ? 'Try the road again, or go on to the Sunscorch.' : 'A short journey before the first fight.', w - 16);
    const h = 111 + lines.length * 11, y = H / 2 - h / 2, by = y + 32 + lines.length * 11;
    panel(ctx, x, y, w, h, { title: fallen ? 'Back on your feet' : 'The road can wait' });
    lines.forEach((s, i) => drawText(ctx, s, W / 2, y + 22 + i * 11, { align: 'center', color: '#c0cbdc' }));
    ui.begin(dt);
    if (button(ctx, ui, 'road_resume', W / 2 - 65, by, 130, 15, fallen ? 'TRY AGAIN' : 'RESUME')) {
      if (fallen) this.game = new Prologue({ settings: app.settings });
      this.paused = false; this.game.state = 'play'; ui.lock(0.2);
    }
    if (button(ctx, ui, 'road_music', W / 2 - 65, by + 23, 130, 15, 'MUSIC')) this.musicMenu = new MusicMenu(app);
    if (button(ctx, ui, 'road_leave', W / 2 - 65, by + 46, 130, 15, this.replay ? 'RETURN TO CAMP' : 'SKIP THE ROAD')) this.finish();
    ui.end();
  }
}
