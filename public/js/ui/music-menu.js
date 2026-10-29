import { input } from '../engine/input.js';
import { COMBAT_MUSIC, normalizeCombatMusic } from '../engine/combat-music.js';
import { previewCombatMusic, stopCombatMusicPreview, combatMusicPreview, setCombatMusic } from '../engine/audio.js';
import { saveSettings } from '../engine/storage.js';
import { button, dim, drawText, panel, textWidth } from './ui.js';

const optionId = (id) => 'soundtrack_' + id;
function fit(text, width) {
  if (textWidth(text) <= width) return text;
  while (text.length && textWidth(text + '...') > width) text = text.slice(0, -1);
  return text + '...';
}

// The same browser is used in camp options, a paused run and the introductory road.
// Browsing auditions a track; confirming a row saves it without closing the browser.
export class MusicMenu {
  constructor(app, audio = {}) {
    this.app = app;
    this.audio = { preview: previewCombatMusic, stop: stopCombatMusicPreview,
      state: combatMusicPreview, choose: setCombatMusic, ...audio };
    this.previewed = null;
    this.noSpace = app.ui.noSpace;
    app.ui.noSpace = false;
    app.ui.focusId = optionId(normalizeCombatMusic(app.settings.combatMusic));
    app.ui.focus(app.ui.focusId);
    app.ui.lock(0.18);
  }

  close() {
    this.audio.stop();
    this.app.ui.noSpace = this.noSpace;
    input.mouse.clicked = false;
    this.app.ui.fired = true;
    this.app.ui.lock(0.18);
    return 'close';
  }

  preview(id) {
    this.previewed = id;
    this.audio.preview(id);
  }

  draw(ctx, W, H, dt) {
    const { app } = this, ui = app.ui;
    dim(ctx, W, H, 0.75);
    const row = Math.max(10, Math.min(18, Math.floor((H - 100) / COMBAT_MUSIC.length)));
    const w = Math.min(300, W - 20), h = 69 + COMBAT_MUSIC.length * row;
    const x = Math.round((W - w) / 2), y = Math.round((H - h) / 2);
    panel(ctx, x, y, w, h, { title: 'MUSIC' });
    drawText(ctx, w < 230 ? '10 SECOND PREVIEWS' : 'CHOOSE A TRACK · 10 SECOND PREVIEW', W / 2, y + 11,
      { align: 'center', color: '#8b9bb4' });
    ui.begin(dt);
    if ((input.pressed('back') || input.pressed('pause')) && ui.lockT <= 0) return this.close();
    const selected = normalizeCombatMusic(app.settings.combatMusic);
    for (let i = 0; i < COMBAT_MUSIC.length; i++) {
      const track = COMBAT_MUSIC[i], id = optionId(track.id), ry = y + 26 + i * row;
      const hit = ui.item(id, x + 8, ry, w - 16, row, { group: 'soundtracks', home: track.id === selected });
      const focused = ui.focused(id), active = track.id === selected;
      if (focused) {
        ctx.fillStyle = '#3e2731';
        ctx.fillRect(x + 8, ry, w - 16, row - 1);
      }
      const tag = w < 220 ? '15 MIN' : track.genre || '15 MIN';
      drawText(ctx, active ? '>' : ' ', x + 12, ry + Math.floor((row - 8) / 2), { color: '#fee761' });
      drawText(ctx, fit(track.name, w - textWidth(tag) - 47), x + 23, ry + Math.floor((row - 8) / 2),
        { color: focused ? '#ffffff' : active ? '#fee761' : '#c0cbdc' });
      drawText(ctx, tag, x + w - 13, ry + Math.floor((row - 8) / 2), { align: 'right', color: '#8b9bb4' });
      if (hit) {
        // Preview first: choosing during a fight must not briefly start the complete file.
        this.preview(track.id);
        app.settings.combatMusic = this.audio.choose(track.id);
        saveSettings(app.settings);
      }
    }
    const preview = this.audio.state();
    const status = preview ? preview.playing ? 'PLAYING 10 SECOND PREVIEW' : 'LOADING PREVIEW...' : 'ENTER CHOOSE · ESC BACK';
    drawText(ctx, fit(status, w - 14), W / 2, y + h - 34,
      { align: 'center', color: preview?.playing ? '#feae34' : '#8b9bb4' });
    if (button(ctx, ui, 'music_done', W / 2 - 45, y + h - 21, 90, 14, 'DONE', { fallback: true })) return this.close();
    ui.end();
    const focused = COMBAT_MUSIC.find((track) => ui.focusId === optionId(track.id));
    if (focused && focused.id !== this.previewed) this.preview(focused.id);
    return null;
  }
}
