// The trial screen's oaths (G4 of the 21 November 2026 review; data/oaths.js): a button beside the
// Nightmare box, and the list it opens of every oath to swear or forswear, each with its heat; over
// them the night's heat and the gold it pays as they stand, under them the rule of the one in focus
// and the hero's best heat won. The screen owns ui.begin/end and keeps this list's items alone
// while it is open, as it does the music's (music-picker.js).
import { input } from '../engine/input.js';
import { button, checkbox, dim, drawText, panel, wrapText } from './ui.js';
import { OATHS, OATH_OF, heatOf, oathGold } from '../data/oaths.js';

const ROW = 15, PAD = 8, HEAD = 18, FOOT = 46;
const optionId = (id) => 'oath_' + id;
const inside = (pt, r) => pt.x >= r.x && pt.y >= r.y && pt.x < r.x + r.w && pt.y < r.y + r.h;
const ON = '#f6757a';

export class OathPicker {
  constructor() {
    this.open = false;
  }

  // The button, OATHS and the heat sworn; true when it opens the list.
  draw(ctx, ui, x, y, w, oaths) {
    const heat = heatOf(oaths);
    if (!button(ctx, ui, 'oaths', x, y, w, 13, heat ? `OATHS · ${heat}` : 'OATHS', { color: heat ? ON : '#ead4aa' })) return false;
    this.open = true;
    ui.focus(optionId(OATHS[0].id));
    ui.lock(0.12);
    return true;
  }

  close(ui) {
    this.open = false;
    input.mouse.clicked = false;
    ui.fired = true;
    ui.focus('oaths');
    ui.lock(0.12);
  }

  // The list: oaths sworn, the hero's best heat won (best), onChange with the new list.
  drawMenu(ctx, ui, W, H, oaths, best, onChange) {
    if (!this.open) return;
    const w = Math.min(300, W - 12), rows = OATHS.length;
    const h = Math.min(H - 8, PAD * 2 + HEAD + rows * ROW + FOOT);
    const x = Math.round((W - w) / 2), y = Math.round((H - h) / 2);
    if (input.pressed('back') || (input.mouse.clicked && !inside(input.mouse, { x, y, w, h }))) {
      this.close(ui);
      return;
    }
    dim(ctx, W, H, 0.55);
    panel(ctx, x, y, w, h, { fill: '#15131f', trim: [ON, '#733e39'], rivets: false });
    const heat = heatOf(oaths);
    drawText(ctx, `OATHS · HEAT ${heat} · GOLD ×${oathGold(heat).toFixed(1)}`, W / 2, y + PAD, { align: 'center', color: heat ? ON : '#ead4aa' });
    for (let i = 0; i < rows; i++) {
      const o = OATHS[i], on = oaths.includes(o.id), ry = y + PAD + HEAD + i * ROW;
      if (checkbox(ctx, ui, optionId(o.id), x + PAD, ry, o.name, on, { color: ON })) {
        onChange(on ? oaths.filter((id) => id !== o.id) : [...oaths, o.id]);
      }
      // Its heat, a pip a point.
      for (let k = 0; k < o.heat; k++) {
        ctx.fillStyle = on ? ON : '#5d4a52';
        ctx.fillRect(x + w - PAD - 6 - k * 7, ry + 4, 5, 5);
      }
    }
    // The rule of the oath in focus, and what the hero has won under.
    const fy = y + PAD + HEAD + rows * ROW + 2;
    const focus = OATH_OF[(ui.focusId || '').replace('oath_', '')];
    const lines = wrapText(focus ? focus.desc : 'Swear oaths to make the night harder: each pays more gold.', w - PAD * 2);
    lines.slice(0, 2).forEach((ln, i) => drawText(ctx, ln, x + PAD, fy + i * 9, { color: '#c0cbdc' }));
    drawText(ctx, best ? `Best won with this hero: heat ${best}` : 'No night won under oaths yet', x + PAD, fy + 22, { color: '#8b9bb4' });
    if (button(ctx, ui, 'oath_done', x + w - PAD - 50, fy + 19, 50, 13, 'DONE', { color: '#fee761' })) this.close(ui);
  }
}
