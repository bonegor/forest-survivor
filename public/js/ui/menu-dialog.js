import { input } from '../engine/input.js';
import { clamp } from '../engine/util.js';
import { panel, button, dim, drawRich, wrapText } from './ui.js';

// A readable inspection/confirmation panel. Long details scroll instead of disappearing.
export class MenuDialog {
  constructor(title, lines, actions = []) {
    this.title = title;
    this.lines = lines;
    this.actions = actions;
    this.scroll = 0;
  }

  draw(ctx, ui, W, H, dt) {
    dim(ctx, W, H, 0.78);
    const w = Math.min(360, W - 20), x = Math.round((W - w) / 2);
    const rows = this.lines.flatMap(line => {
      const l = typeof line === 'string' ? { text: line } : line;
      return wrapText(l.text || ' ', w - 48).map(text => ({ text, color: l.color || '#c0cbdc' })).concat([{ text: '', color: '' }]);
    });
    const actions = [...this.actions, { id: 'close', label: 'BACK' }];
    const foot = actions.length * 21 + 12;
    const h = Math.min(H - 36, Math.max(120, rows.length * 10 + foot + 22));
    const y = Math.round((H - h) / 2), top = y + 14, room = h - foot - 22;
    const most = Math.max(0, rows.length * 10 - room);
    this.scroll = clamp(this.scroll + Math.sign(input.mouse.wheel || 0) * 30, 0, most);
    panel(ctx, x, y, w, h, { title: this.title, fill: '#15131f', rivets: false });
    ctx.save();ctx.beginPath();ctx.rect(x + 8, top, w - 16, room);ctx.clip();
    rows.forEach((r, i) => drawRich(ctx, r.text, x + 14, top + i * 10 - this.scroll, { color: r.color, hi: '#fee761' }));
    ctx.restore();
    ui.begin(dt);
    if (most) {
      if (button(ctx, ui, 'detail_up', x + w - 24, top, 18, 14, '↑')) this.scroll = Math.max(0, this.scroll - 40);
      if (button(ctx, ui, 'detail_down', x + w - 24, top + room - 15, 18, 14, '↓')) this.scroll = Math.min(most, this.scroll + 40);
    }
    let result = null;
    actions.forEach((a, i) => {
      if (button(ctx, ui, 'detail_' + a.id, x + 14, y + h - foot + i * 21 + 3, w - 28, 16, a.label, { disabled: a.disabled, color: a.color || (i === 0 && this.actions.length ? '#fee761' : '#c0cbdc') })) result = a.id;
    });
    ui.end();
    if (input.pressed('back')) result = 'close';
    return result;
  }
}
