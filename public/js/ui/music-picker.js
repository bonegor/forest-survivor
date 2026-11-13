import { input } from '../engine/input.js';
import { COMBAT_MUSIC, normalizeCombatMusic } from '../engine/combat-music.js';
import { previewCombatMusic, stopCombatMusicPreview } from '../engine/audio.js';
import { clamp } from '../engine/util.js';
import { button, drawText, panel, textWidth } from './ui.js';
import { buttonFace } from './skin.js';

const ROW = 18, PAD = 4, HEAD = 12, FOOT = 20;
const optionId = (id) => 'music_' + id;
const inside = (point, rect) => point.x >= rect.x && point.y >= rect.y && point.x < rect.x + rect.w && point.y < rect.y + rect.h;
const duration = (track) => track.seconds > 0 ? `${Math.floor(track.seconds / 60)}:${String(Math.floor(track.seconds % 60)).padStart(2, '0')}` : 'LOOP';
function fit(text, width) {
  if (textWidth(text) <= width) return text;
  while (text.length && textWidth(text + '...') > width) text = text.slice(0, -1);
  return text + '...';
}

// A canvas dropdown, using the same input and focus rules as the other menus.
// The screen owns ui.begin/end and isolates this menu's items while it is open.
export class CombatMusicPicker {
  constructor(audio = {}) {
    this.open = false;
    this.rect = null;
    this.audio = { preview: previewCombatMusic, stop: stopCombatMusicPreview, ...audio };
    this.previewed = null;
    this.page = null;
  }

  draw(ctx, ui, rect, selected) {
    const r = this.rect = { ...rect, h: rect.h ?? 13 };
    const id = normalizeCombatMusic(selected);
    const track = COMBAT_MUSIC.find((entry) => entry.id === id);
    if (this.open) buttonFace(ctx, r.x, r.y, r.w, r.h, 'on');
    else if (button(ctx, ui, 'combat_music', r.x, r.y, r.w, r.h, '', { fallback: true })) {
      this.open = true;
      this.previewed = null;
      this.page = null;
      ui.focus(optionId(id));
      ui.lock(0.12);
    }
    const lit = this.open || ui.focused('combat_music');
    const y = r.y + Math.floor((r.h - 8) / 2);
    drawText(ctx, 'MUSIC', r.x + 9, y, { color: lit ? '#fee761' : '#ead4aa' });
    drawText(ctx, fit(track.name, r.w - 64), r.x + 43, y, { color: lit ? '#ffffff' : '#c0cbdc' });
    ctx.fillStyle = '#feae34';
    for (let row = 0; row < 3; row++) ctx.fillRect(r.x + r.w - 13 + row, r.y + Math.floor(r.h / 2) - 1 + row, 5 - row * 2, 1);
  }

  menuBounds(W, H) {
    if (!this.rect) return null;
    const w = Math.min(Math.max(this.rect.w, 178), W - 12);
    const below = this.rect.y + this.rect.h + 2;
    const available = Math.max(this.rect.y - 8, H - below - 6);
    const allHeight = PAD * 2 + HEAD + COMBAT_MUSIC.length * ROW;
    const rows = allHeight <= available ? COMBAT_MUSIC.length : Math.max(1, Math.floor((available - PAD * 2 - HEAD - FOOT) / ROW));
    const pages = Math.ceil(COMBAT_MUSIC.length / rows);
    const h = PAD * 2 + HEAD + rows * ROW + (pages > 1 ? FOOT : 0);
    return {
      x: Math.round(clamp(this.rect.x, 6, W - w - 6)),
      y: Math.round(clamp(below + h <= H - 6 ? below : this.rect.y - h - 2, 6, H - h - 6)),
      w, h, rows, pages,
    };
  }

  movePage(delta, bounds, ui) {
    const page = Math.max(0, Math.min(bounds.pages - 1, this.page + delta));
    if (page === this.page) return;
    this.page = page;
    ui.focusId = optionId(COMBAT_MUSIC[page * bounds.rows].id);
    ui.focus(ui.focusId);
  }

  close(ui, keepPreview = false) {
    this.open = false;
    this.previewed = null;
    if (!keepPreview) this.audio.stop();
    input.mouse.clicked = false;
    ui.fired = true;
    ui.focus('combat_music');
    ui.lock(0.12);
  }

  drawMenu(ctx, ui, W, H, selected, onSelect) {
    if (!this.open || !this.rect) return;
    const bounds = this.menuBounds(W, H);
    if (input.pressed('back') || (input.mouse.clicked && !inside(input.mouse, bounds))) {
      this.close(ui);
      return;
    }
    const chosen = normalizeCombatMusic(selected);
    const chosenIndex = COMBAT_MUSIC.findIndex((track) => track.id === chosen);
    const focusedIndex = COMBAT_MUSIC.findIndex((track) => ui.focusId === optionId(track.id));
    if (this.page === null || this.rows !== bounds.rows) this.page = Math.floor((focusedIndex >= 0 ? focusedIndex : chosenIndex) / bounds.rows);
    this.rows = bounds.rows;
    this.page = Math.min(bounds.pages - 1, this.page);
    if (ui.lockT <= 0) {
      if (focusedIndex >= 0 && (input.pressed('up') || input.pressed('down'))) {
        ui.take('up', 'down');
        const next = (focusedIndex + (input.pressed('down') ? 1 : COMBAT_MUSIC.length - 1)) % COMBAT_MUSIC.length;
        this.page = Math.floor(next / bounds.rows);
        ui.focusId = optionId(COMBAT_MUSIC[next].id);
      }
      if (input.pressed('pageDown') || input.pressed('right')) this.movePage(1, bounds, ui);
      else if (input.pressed('pageUp') || input.pressed('left')) this.movePage(-1, bounds, ui);
    }
    panel(ctx, bounds.x, bounds.y, bounds.w, bounds.h, { fill: '#15131f', trim: ['#feae34', '#733e39'], rivets: false });
    drawText(ctx, '10 SECOND PREVIEW', bounds.x + PAD + 5, bounds.y + PAD + 1, { color: '#8b9bb4' });
    ui.take('left', 'right');
    const visible = COMBAT_MUSIC.slice(this.page * bounds.rows, (this.page + 1) * bounds.rows);
    for (let i = 0; i < visible.length; i++) {
      const track = visible[i], x = bounds.x + PAD, y = bounds.y + PAD + HEAD + i * ROW, w = bounds.w - PAD * 2;
      const id = optionId(track.id), active = track.id === chosen;
      const hit = ui.item(id, x, y, w, ROW, { group: 'music', home: active });
      if (ui.focused(id)) {
        ctx.fillStyle = '#3e2731';
        ctx.fillRect(x, y, w, ROW - 1);
      }
      drawText(ctx, active ? '>' : ' ', x + 3, y + 5, { color: '#fee761' });
      const label = duration(track), durationWidth = textWidth(label);
      drawText(ctx, fit(track.name, w - durationWidth - 27), x + 13, y + 5, { color: ui.focused(id) ? '#ffffff' : active ? '#fee761' : '#c0cbdc' });
      if (w >= 160) drawText(ctx, label, x + w - 5, y + 5, { align: 'right', color: '#8b9bb4' });
      if (hit) {
        this.audio.preview(track.id);
        onSelect(track.id);
        this.close(ui, true);
        return;
      }
    }
    if (bounds.pages > 1) {
      const y = bounds.y + PAD + HEAD + bounds.rows * ROW + 2;
      if (button(ctx, ui, 'music_prev', bounds.x + PAD, y, 44, 14, 'PREV', { disabled: this.page === 0 })) this.movePage(-1, bounds, ui);
      drawText(ctx, `${this.page + 1} / ${bounds.pages}`, bounds.x + bounds.w / 2, y + 3, { align: 'center', color: '#8b9bb4' });
      if (button(ctx, ui, 'music_next', bounds.x + bounds.w - PAD - 44, y, 44, 14, 'NEXT', { disabled: this.page === bounds.pages - 1 })) this.movePage(1, bounds, ui);
    }
    const focused = COMBAT_MUSIC.find((track) => ui.focusId === optionId(track.id));
    if (focused && focused.id !== this.previewed) {
      this.previewed = focused.id;
      this.audio.preview(focused.id);
    }
  }
}
