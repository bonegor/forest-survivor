// A choice the run offers off the level-up cards (GameScreen.frame, once the screens before it have
// had their turn), the run standing still under it as under a chest's: a boss's TROPHY (G7 of the
// 21 November 2026 review; data/boons.js), three boons the hero hasn't, and a crypt's ALTAR (G8:
// Game.altarCards), a boon, a weapon's rank and a bargain. Its cards side by side, each with its
// icon, its name and what it does, and TAKE NONE. What is taken is given by Game.takeCard.
import { sfx } from '../engine/audio.js';
import { SPR } from '../engine/sprites.js';
import { button, dim, drawRich, drawText, logo, panel, wrapText } from './ui.js';

const READY = 0.5; // s before a card can be taken: it opens mid-fight, as a level-up's do
const RED = '#f6757a';
const SUB = { TROPHY: 'Take one boon for the rest of the night, or none', ALTAR: 'The altar grants one thing, or none' };

export class TrophyOverlay {
  // entry: { title, cards } (Game.trophyQueue).
  constructor(gs, entry) {
    this.gs = gs;
    this.g = gs.game;
    this.title = entry.title;
    this.cards = entry.cards;
    this.t = 0;
    this.lockTime = 0;
    this.noSpace = true; // Space is the ultimate: mashed, it must not take a card
    gs.app.ui.focusId = 'boon0';
  }

  // The card taken, or none (null): the run goes on.
  take(c) {
    const g = this.g;
    if (c) {
      const said = g.takeCard(c);
      sfx('pick');
      if (said) g.banner(said.name, said.sub, RED, 2.4);
    } else sfx('back');
    g.state = g.playState;
    return 'close';
  }

  draw(ctx, W, H, dt) {
    const g = this.g, ui = this.gs.app.ui;
    if (g.state !== 'chest' || !this.cards.length) {
      if (g.state === 'chest') g.state = g.playState;
      return 'close';
    }
    this.t += dt;
    dim(ctx, W, H, 0.62);
    const L = logo(this.title, ['#ffffff', '#ffd0d0', RED, '#be4a2f', '#5c0f1c']);
    const s = Math.min(1, (W - 20) / L.width);
    ctx.drawImage(L, Math.round(W / 2 - (L.width * s) / 2), 8, Math.round(L.width * s), Math.round(L.height * s));
    const top = 14 + L.height * s;
    drawText(ctx, SUB[this.title] || '', W / 2, top, { align: 'center', color: '#c0cbdc' });
    ui.begin(dt);
    const n = this.cards.length, vertical = W < 300;
    const y0 = top + 14, foot = 24;
    const w = vertical ? W - 16 : Math.min(132, Math.floor((W - 20 - (n - 1) * 6) / n));
    const h = vertical ? Math.min(64, Math.floor((H - y0 - foot) / n) - 4) : Math.min(140, H - y0 - foot);
    const ready = this.t >= READY;
    for (let i = 0; i < n; i++) {
      const c = this.cards[i], info = g.cardInfo(c);
      const x = vertical ? 8 : Math.round(W / 2 - (n * w + (n - 1) * 6) / 2) + i * (w + 6), y = vertical ? y0 + i * (h + 4) : y0;
      const hit = ui.item('boon' + i, x, y, w, h);
      const f = ui.focused('boon' + i);
      panel(ctx, x, y, w, h, { fill: f ? '#2a1f2d' : '#15131f', trim: f ? [RED, '#733e39'] : ['#5d4a52', '#3e2731'], rivets: false });
      const icon = SPR[info.icon]?.frames[0].c;
      if (vertical) {
        if (icon) ctx.drawImage(icon, x + 8, y + 8, icon.width * 2, icon.height * 2);
        drawText(ctx, info.name, x + 48, y + 6, { color: f ? '#fee761' : info.color || RED });
        wrapText(info.desc, w - 56).slice(0, 3).forEach((ln, j) => drawRich(ctx, ln, x + 48, y + 18 + j * 9, { color: '#c0cbdc' }));
      } else {
        if (icon) ctx.drawImage(icon, Math.round(x + w / 2 - icon.width), y + 8, icon.width * 2, icon.height * 2);
        drawText(ctx, info.name, x + w / 2, y + 46, { align: 'center', color: f ? '#fee761' : info.color || RED });
        wrapText(info.desc, w - 12).slice(0, 6).forEach((ln, j) => drawRich(ctx, ln, x + 6, y + 60 + j * 9, { color: '#c0cbdc' }));
      }
      if (!ready) {
        ctx.fillStyle = 'rgba(8,6,16,0.45)';
        ctx.fillRect(x, y, w, h);
      }
      if (hit && ready) {
        ui.end();
        return this.take(c);
      }
    }
    const by = vertical ? y0 + n * (h + 4) + 2 : y0 + h + 6;
    if (button(ctx, ui, 'boon_none', Math.round(W / 2 - 45), Math.min(H - 18, by), 90, 14, 'TAKE NONE', { color: '#8b9bb4' }) && ready) {
      ui.end();
      return this.take(null);
    }
    ui.end();
    return null;
  }
}
