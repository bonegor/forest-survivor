// A choice the run offers off the level-up cards (GameScreen.frame, once the screens before it have
// had their turn), the run standing still under it as under a chest's: a boss's TROPHY (G7 of the
// 21 November 2026 review; data/boons.js), three boons the hero hasn't; a crypt's ALTAR (G8:
// Game.altarCards), a boon, a weapon's rank and a bargain; and the night's MERCHANT (G6:
// game/stall.js), wares for the night's gold, one he can't afford greyed. Its cards side by side, each with its
// icon, its name and what it does, and TAKE NONE. What is taken is given by Game.takeCard.
import { sfx } from '../engine/audio.js';
import { SPR } from '../engine/sprites.js';
import { button, dim, drawRich, drawText, logo, panel, textWidth, wrapText } from './ui.js';

const READY = 0.5; // s before a card can be taken: it opens mid-fight, as a level-up's do
const RED = '#f6757a';
const SUB = { TROPHY: 'Take one boon for the rest of the night, or none', ALTAR: 'The altar grants one thing, or none', MERCHANT: 'One thing for tonight\'s gold, or none' };

// A card's text and, for a ware, its price, which has a place of its own on the card: out of the
// text, which ends with it (Game.cardInfo: ' {47} gold.'). A text that doesn't keeps it there.
function priced(c, info) {
  const tail = c.kind === 'buy' ? ` {${c.price}} gold.` : null;
  if (!tail || !info.desc.endsWith(tail)) return { desc: info.desc, price: null };
  return { desc: info.desc.slice(0, -tail.length), price: c.price };
}

// A price: the coin and the number, right-aligned to x (align 'right') or centred on it, in gold,
// or red where there isn't the gold for it.
function drawPrice(ctx, price, x, y, poor, align) {
  const s = String(price), w = 10 + textWidth(s), left = align === 'right' ? x - w : Math.round(x - w / 2);
  ctx.drawImage(SPR.h_coin.frames[0].c, left, y);
  drawText(ctx, s, left + 10, y, { color: poor ? '#e43b44' : '#fee761' });
}

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
    // The merchant's: the gold there is to spend (game/stall.js).
    const sub = this.title === 'MERCHANT' ? `${SUB.MERCHANT} · gold ${g.gold}` : SUB[this.title] || '';
    drawText(ctx, sub, W / 2, top, { align: 'center', color: '#c0cbdc' });
    ui.begin(dt);
    const n = this.cards.length, vertical = W < 300;
    const y0 = top + 14, foot = 24;
    const w = vertical ? W - 16 : Math.min(132, Math.floor((W - 20 - (n - 1) * 6) / n));
    const cards = this.cards.map((c) => {
      const info = g.cardInfo(c);
      return { c, info, ...priced(c, info) };
    });
    // Side by side, the cards as tall as the longest text needs (from 60 px down, under the icon
    // and the name, and a ware's price on its own line at the foot), no taller than the screen
    // leaves; stacked (a phone held upright), as the screen shares out, the price beside the name
    // and of the text the lines that fit.
    const lines = cards.map(({ desc }) => wrapText(desc, vertical ? w - 56 : w - 12));
    const pad = cards.some((k) => k.price != null) ? 12 : 0;
    const h = vertical ? Math.min(64, Math.floor((H - y0 - foot) / n) - 4) : Math.min(140, H - y0 - foot, 66 + Math.min(6, Math.max(...lines.map((l) => l.length))) * 9 + pad);
    const room = Math.max(0, vertical ? Math.min(3, Math.floor((h - 23) / 9)) : Math.min(6, Math.floor((h - 66 - pad) / 9)));
    const ready = this.t >= READY;
    for (let i = 0; i < n; i++) {
      const { c, info, price } = cards[i];
      const x = vertical ? 8 : Math.round(W / 2 - (n * w + (n - 1) * 6) / 2) + i * (w + 6), y = vertical ? y0 + i * (h + 4) : y0;
      const hit = ui.item('boon' + i, x, y, w, h);
      const f = ui.focused('boon' + i);
      panel(ctx, x, y, w, h, { fill: f ? '#2a1f2d' : '#15131f', trim: f ? [RED, '#733e39'] : ['#5d4a52', '#3e2731'], rivets: false });
      const icon = SPR[info.icon]?.frames[0].c;
      if (vertical) {
        // Twice its size where the card is tall enough for it, else at its own, centred in the card.
        if (icon && h >= 46) ctx.drawImage(icon, x + 8, y + 8, icon.width * 2, icon.height * 2);
        else if (icon) ctx.drawImage(icon, x + 24 - (icon.width >> 1), y + ((h - icon.height) >> 1));
        // The name and the price on the card's middle where no line of the text fits under them.
        const ny = room > 0 ? 6 : Math.max(6, (h - 9) >> 1);
        drawText(ctx, info.name, x + 48, y + ny, { color: f ? '#fee761' : info.color || RED });
        if (price != null) drawPrice(ctx, price, x + w - 6, y + ny, info.disabled, 'right');
        lines[i].slice(0, room).forEach((ln, j) => drawRich(ctx, ln, x + 48, y + 18 + j * 9, { color: '#c0cbdc' }));
      } else {
        if (icon) ctx.drawImage(icon, Math.round(x + w / 2 - icon.width), y + 8, icon.width * 2, icon.height * 2);
        drawText(ctx, info.name, x + w / 2, y + 46, { align: 'center', color: f ? '#fee761' : info.color || RED });
        lines[i].slice(0, room).forEach((ln, j) => drawRich(ctx, ln, x + w / 2, y + 60 + j * 9, { align: 'center', color: '#c0cbdc' }));
        if (price != null) drawPrice(ctx, price, x + w / 2, y + h - 14, info.disabled);
      }
      if (!ready || info.disabled) {
        ctx.fillStyle = 'rgba(8,6,16,0.45)';
        ctx.fillRect(x, y, w, h);
      }
      // A ware he can't afford says no.
      if (hit && ready && info.disabled) sfx('deny');
      else if (hit && ready) {
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
