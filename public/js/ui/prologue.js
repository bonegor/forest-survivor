import { Prologue } from '../game/prologue.js';
import { input } from '../engine/input.js';
import { view } from '../engine/view.js';
import { saveSettings } from '../engine/storage.js';
import { clamp } from '../engine/util.js';
import { FIRST_MAP } from '../data/maps.js';
import { button, panel, dim, drawText, wrapText, textWidth, textCanvas } from './ui.js';
import { flank } from './skin.js';
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
      // The road's end, the Sunscorch: the desert of the first night (28 October 2026). Its name as
      // every screen's title is set (screens.js header: Jacquard 12 in gold between the dividers),
      // the dark it comes up out of the menus' ink, not a bare black; the words fading in with the
      // dark, not printed over the desert while it is still there to see.
      ctx.fillStyle = `rgba(13,11,20,${g.fade})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = g.fade;
      const title = textCanvas('The Sunscorch', ['#fff6c2', '#fee761', '#feae34', '#f77622'], '#181425', '#0d0b14', 'heading');
      const hw = title.width / 2, ty = Math.round(H / 2 - 8 - title.height);
      ctx.drawImage(title, Math.round(W / 2 - hw), ty);
      flank(ctx, W / 2 - hw - 4, W / 2 + hw + 4, ty + 9, Math.min(48, W / 2 - hw - 10));
      const lines = wrapText('By midday, Aldric reached the Sunscorch. Something stirred beneath the sand.', Math.min(290, W - 32));
      lines.forEach((s, i) => drawText(ctx, s, W / 2, H / 2 + i * 11, { align: 'center', color: '#ead4aa' }));
      if (!this.replay) {
        const lesson = wrapText('In the Sunscorch, gather soul gems to choose an upgrade.', Math.min(290, W - 32));
        lesson.forEach((s, i) => drawText(ctx, s, W / 2, H / 2 + (lines.length + i) * 11 + 5, { align: 'center', color: '#8fb8ff' }));
      }
      ctx.globalAlpha = 1;
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
    // The band in the menus' own inks (it was a green of its own, left from the forest road, over
    // the sand): the panels' dark, edged under with their copper trim and ink line; its title in
    // the plates' gold gothic, the road's bar a groove filling in amber as the Codex's bars do.
    ctx.fillStyle = 'rgba(21,19,31,0.88)';
    ctx.fillRect(0, 0, W, 47);
    ctx.fillStyle = '#b86f50'; ctx.fillRect(0, 47, W, 1);
    ctx.fillStyle = '#0d0b14'; ctx.fillRect(0, 48, W, 1);
    // The road to the Sunscorch (28 October 2026), its title clear of SKIP INTRO: 144 pixels from 320
    // wide, the short one's 104 under it (the Darkwood's were 127 and 106).
    drawText(ctx, W < 320 ? 'Road to Sunscorch' : 'The road to the Sunscorch', 9, 7, { color: ['#fff6c2', '#fee761', '#feae34', '#d77643'], font: 'gothic' });
    drawText(ctx, `HP ${Math.ceil(p.hp)}/${p.maxHp}   GOLD ${g.gold}`, 9, 26, { color: '#ead4aa' });
    // The way from the camp to its end, a bar between their names, 12 pixels clear of each.
    const end = 'SUNSCORCH', bar = Math.max(16, W - 65 - textWidth(end)), done = Math.round(bar * g.progress);
    drawText(ctx, 'CAMP', 9, 39, { color: '#8b9bb4' });
    drawText(ctx, end, W - 9, 39, { align: 'right', color: '#8b9bb4' });
    ctx.fillStyle = '#262b44'; ctx.fillRect(44, 41, bar, 3);
    ctx.fillStyle = '#feae34'; ctx.fillRect(44, 41, done, 3);
    ctx.fillStyle = '#fee761'; ctx.fillRect(44, 41, done, 1);
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
      // In a framed panel as the menus' are, as wide as its words (a box to the screen's edge held
      // two lines in its left half), its words inside the frame's lines; well clear of the II button.
      const lines = wrapText(`${move}. Follow the road east. Your sword attacks automatically.`, Math.min(300, W - 55));
      const bw = Math.max(...lines.map((s) => textWidth(s))) + 14, bh = lines.length * 11 + 9, by = H - 5 - bh;
      panel(ctx, 5, by, bw, bh, { fill: 'rgba(21,19,31,0.88)', rivets: false });
      lines.forEach((s, i) => drawText(ctx, s, 12, by + 5 + i * 11, { color: '#ead4aa' }));
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
