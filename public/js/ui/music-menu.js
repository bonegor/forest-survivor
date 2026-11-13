import { input } from '../engine/input.js';
import { MUSIC_ROLES, normalizeMusicTrack, musicTracksForRole } from '../engine/combat-music.js';
import { previewMusicTrack, stopMusicPreview, musicPreview, setMusicTrack } from '../engine/audio.js';
import { saveSettings } from '../engine/storage.js';
import { button, dim, drawText, panel, textWidth } from './ui.js';

const optionId = (id) => 'soundtrack_' + id;
const roleId = (id) => 'music_role_' + id;
const duration = (track) => track.seconds > 0 ? `${Math.floor(track.seconds / 60)}:${String(Math.floor(track.seconds % 60)).padStart(2, '0')}` : 'LOOP';
function fit(text, width) {
  if (textWidth(text) <= width) return text;
  while (text.length && textWidth(text + '...') > width) text = text.slice(0, -1);
  return text + '...';
}

// Shared by camp, pause and the introductory road. Each situation keeps its own
// choice; browsing only auditions a short excerpt. Pages leave room for more tracks.
export class MusicMenu {
  constructor(app, audio = {}) {
    this.app = app;
    this.audio = { preview: previewMusicTrack, stop: stopMusicPreview,
      state: musicPreview, choose: setMusicTrack, ...audio };
    this.role = 'battle';
    this.page = null;
    this.previewed = null;
    this.noSpace = app.ui.noSpace;
    app.ui.noSpace = false;
    app.ui.focusId = optionId(this.selected());
    app.ui.focus(app.ui.focusId);
    app.ui.lock(0.18);
  }

  selected() {
    const { settings } = this.app;
    return normalizeMusicTrack(settings.musicTracks?.[this.role] ?? (this.role === 'battle' ? settings.combatMusic : undefined), this.role);
  }

  setRole(role) {
    if (role === this.role) return;
    this.role = role;
    this.page = null;
    this.previewed = null;
    this.audio.stop();
    this.app.ui.focusId = optionId(this.selected());
    this.app.ui.focus(this.app.ui.focusId);
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

  movePage(delta, tracks, capacity, pages) {
    const next = Math.max(0, Math.min(pages - 1, this.page + delta));
    if (next === this.page) return;
    this.page = next;
    this.app.ui.focusId = optionId(tracks[next * capacity].id);
    this.app.ui.focus(this.app.ui.focusId);
  }

  draw(ctx, W, H, dt) {
    const { app } = this, ui = app.ui;
    dim(ctx, W, H, 0.75);
    ui.begin(dt);
    if ((input.pressed('back') || input.pressed('pause')) && ui.lockT <= 0) return this.close();
    if (ui.lockT <= 0 && (input.pressed('tabPrev') || input.pressed('tabNext'))) {
      const index = MUSIC_ROLES.findIndex((role) => role.id === this.role);
      this.setRole(MUSIC_ROLES[(index + (input.pressed('tabNext') ? 1 : MUSIC_ROLES.length - 1)) % MUSIC_ROLES.length].id);
    }
    const tracks = musicTracksForRole(this.role), selected = this.selected();
    const w = Math.min(340, W - 20), columns = w < 220 ? 2 : MUSIC_ROLES.length;
    const tabExtra = (Math.ceil(MUSIC_ROLES.length / columns) - 1) * 16;
    const row = 16, capacity = Math.max(1, Math.min(tracks.length, Math.floor((H - 110 - tabExtra) / row)));
    const pages = Math.ceil(tracks.length / capacity);
    const selectedIndex = Math.max(0, tracks.findIndex((track) => track.id === selected));
    const focusedIndex = tracks.findIndex((track) => ui.focusId === optionId(track.id));
    if (this.page === null || this.capacity !== capacity) this.page = Math.floor((focusedIndex >= 0 ? focusedIndex : selectedIndex) / capacity);
    this.capacity = capacity;
    this.page = Math.min(pages - 1, this.page);
    if (ui.lockT <= 0) {
      if (input.pressed('pageDown') || input.pressed('pageUp')) this.movePage(input.pressed('pageDown') ? 1 : -1, tracks, capacity, pages);
      if (focusedIndex >= 0) {
        if (input.pressed('down') && focusedIndex + 1 < tracks.length && Math.floor((focusedIndex + 1) / capacity) !== this.page) {
          ui.take('down'); this.page++; ui.focusId = optionId(tracks[focusedIndex + 1].id);
        } else if (input.pressed('up') && focusedIndex > 0 && Math.floor((focusedIndex - 1) / capacity) !== this.page) {
          ui.take('up'); this.page--; ui.focusId = optionId(tracks[focusedIndex - 1].id);
        }
        if (pages > 1) {
          ui.take('left', 'right');
          if (input.pressed('left') || input.pressed('right')) this.movePage(input.pressed('right') ? 1 : -1, tracks, capacity, pages);
        }
      }
    }
    const visible = tracks.slice(this.page * capacity, (this.page + 1) * capacity);
    const h = 92 + tabExtra + capacity * row;
    const x = Math.round((W - w) / 2), y = Math.round((H - h) / 2);
    panel(ctx, x, y, w, h, { title: 'MUSIC' });
    const tabWidth = (w - 16) / columns;
    for (const [i, role] of MUSIC_ROLES.entries()) {
      if (button(ctx, ui, roleId(role.id), x + 8 + (i % columns) * tabWidth, y + 10 + Math.floor(i / columns) * 16, tabWidth - 2, 14,
        fit(role.name, tabWidth - 8), { on: role.id === this.role })) {
        this.setRole(role.id); ui.end(); return null;
      }
    }
    drawText(ctx, '10 SECOND PREVIEWS', W / 2, y + 29 + tabExtra, { align: 'center', color: '#8b9bb4' });
    for (let i = 0; i < visible.length; i++) {
      const track = visible[i], id = optionId(track.id), ry = y + 42 + tabExtra + i * row;
      const hit = ui.item(id, x + 8, ry, w - 16, row, { group: 'soundtracks', home: track.id === selected });
      const focused = ui.focused(id), active = track.id === selected;
      if (focused) {
        ctx.fillStyle = '#3e2731';
        ctx.fillRect(x + 8, ry, w - 16, row - 1);
      }
      const tag = w < 250 ? duration(track) : track.genre || duration(track);
      drawText(ctx, active ? '>' : ' ', x + 12, ry + 4, { color: '#fee761' });
      drawText(ctx, fit(track.name, w - textWidth(tag) - 47), x + 23, ry + 4,
        { color: focused ? '#ffffff' : active ? '#fee761' : '#c0cbdc' });
      drawText(ctx, tag, x + w - 13, ry + 4, { align: 'right', color: '#8b9bb4' });
      if (hit) {
        this.preview(track.id);
        app.settings.musicTracks ??= {};
        app.settings.musicTracks[this.role] = this.audio.choose(this.role, track.id);
        if (this.role === 'battle') app.settings.combatMusic = app.settings.musicTracks.battle;
        saveSettings(app.settings);
      }
    }
    const footer = y + 42 + tabExtra + capacity * row + 3;
    if (pages > 1) {
      if (button(ctx, ui, 'music_prev', x + 8, footer, 48, 14, 'PREV', { disabled: this.page === 0 })) this.movePage(-1, tracks, capacity, pages);
      drawText(ctx, `${this.page + 1} / ${pages}`, W / 2, footer + 3, { align: 'center', color: '#8b9bb4' });
      if (button(ctx, ui, 'music_next', x + w - 56, footer, 48, 14, 'NEXT', { disabled: this.page === pages - 1 })) this.movePage(1, tracks, capacity, pages);
    }
    const preview = this.audio.state();
    const status = preview ? preview.playing ? 'PLAYING PREVIEW' : 'LOADING PREVIEW...' : 'ENTER CHOOSE · ESC BACK';
    drawText(ctx, fit(status, w - 14), W / 2, footer + 18,
      { align: 'center', color: preview?.playing ? '#feae34' : '#8b9bb4' });
    if (button(ctx, ui, 'music_done', W / 2 - 45, footer + 30, 90, 14, 'DONE', { fallback: true })) return this.close();
    ui.end();
    const focused = tracks.find((track) => ui.focusId === optionId(track.id));
    if (focused && focused.id !== this.previewed) this.preview(focused.id);
    return null;
  }
}
