import { input } from '../engine/input.js';
import { sfx } from '../engine/audio.js';
import { SPR } from '../engine/sprites.js';
import { clamp, ease } from '../engine/util.js';
import { RARITIES, SLOTS, SLOT_NAMES, itemName, itemLines, itemPrice, powerWorn, itemIdentified, canEquipItem, itemIcon } from '../shared/items.js';
import { gearRevision, identificationCost, MAX_STASH } from '../shared/profile.js';
import { unpackSpoils } from '../shared/spoils.js';
import { button, dim, drawText, logo, panel, wrapText } from './ui.js';

const CHEST_SYMBOLS = ['i_sword', 'i_bow', 'i_area', 'i_might', 'i_luck', 'i_greed'];
const GEAR_SYMBOLS = SLOTS.map(slot => 'g_' + slot);
const NEUTRAL = '#c28569';
const PAGE = 4;
const SPIN = 0.78;
const GAP = 0.22;

export function reelProgress(t, start, end) {
  return clamp((t - start) / (end - start), 0, 1);
}

export function reelPosition(progress, seed) {
  return (10 + seed % 4) * (1 - ease.outCubic(clamp(progress, 0, 1)));
}

// The selected result is symbol zero; intermediate symbols are a fixed visual strip.
// The strip never chooses loot and uses no gameplay random numbers.
export function drawRewardReel(ctx, { x, y, w, h, progress, icon, color, seed, gear = false }) {
  const accent = progress >= 1 ? color : NEUTRAL;
  const symbols = gear ? GEAR_SYMBOLS : CHEST_SYMBOLS;
  const position = reelPosition(progress, seed), row = Math.floor(position), pitch = h - 4;
  x = Math.round(x);
  y = Math.round(y);
  panel(ctx, x, y, w, h, { fill: '#11101a', trim: [accent, '#3a2945'], rivets: false });
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 3, y + 3, w - 6, h - 6);
  ctx.clip();
  ctx.fillStyle = '#201929';
  ctx.fillRect(x + 3, y + Math.round(h / 2) - 9, w - 6, 18);
  for (let index = Math.max(0, row - 1); index <= row + 1; index++) {
    const id = index === 0 ? icon : symbols[(index + seed) % symbols.length];
    const img = (SPR[id] ?? SPR.i_greed).frames[0].c;
    const scale = Math.min(w - 8, h - 7) >= 30 ? 2 : 1;
    const sy = y + h / 2 + (index - position) * pitch;
    ctx.globalAlpha = index === 0 ? 1 : 0.56;
    ctx.drawImage(img, Math.round(x + w / 2 - img.width * scale / 2), Math.round(sy - img.height * scale / 2), img.width * scale, img.height * scale);
  }
  ctx.restore();
  ctx.fillStyle = accent;
  const cy = Math.round(y + h / 2);
  ctx.fillRect(x + 2, cy, 4, 1);
  ctx.fillRect(x + w - 6, cy, 4, 1);
  if (progress < 1) {
    ctx.fillStyle = '#fee761';
    const lane = Math.round((w - 10) * progress);
    ctx.fillRect(x + 4 + lane, y + h - 3, 3, 1);
  }
}

export class SpoilsReveal {
  constructor(app, receipt) {
    this.app = app;
    this.receipt = receipt;
    this.entries = unpackSpoils(receipt.spoils);
    this.page = 0;
    this.played = new Set();
    this.loadClaims(receipt);
  }

  loadClaims(receipt) {
    this.receipt = receipt;
    this.claims = unpackSpoils(receipt.claims);
    this.claim = this.claims.findIndex(e => e.state === 'sealed');
    if (this.claim < 0) {
      this.openPage(0);
      return;
    }
    this.t = 0;
    this.claimLanded = false;
    this.detailScroll = {};
    this.spinTick = null;
    this.app.ui.focusId = 'claim_skip';
    this.app.ui.lock(0.2);
  }

  openPage(page) {
    this.page = page;
    this.t = this.played.has(page) ? SPIN + GAP * PAGE : 0;
    this.heard = this.played.has(page) ? PAGE : 0;
    this.spinTick = null;
    this.app.ui.lock(0.2);
    this.app.ui.focusId = 'reveal_skip';
  }

  draw(ctx, W, H, dt) {
    if (this.claim >= 0) return this.drawClaim(ctx, W, H, dt);
    const ui = this.app.ui, entries = this.entries;
    this.t += dt;
    const pages = Math.max(1, Math.ceil(entries.length / PAGE));
    const shown = entries.slice(this.page * PAGE, (this.page + 1) * PAGE);
    const cols = W >= 480 ? PAGE : 2, rows = Math.max(1, Math.ceil(shown.length / cols));
    const gap = 5;
    const w = Math.min(124, Math.floor((W - 22 - (cols - 1) * gap) / cols));
    const end = shown.length ? SPIN + GAP * (shown.length - 1) : 0;
    const done = this.t >= end;
    if (done && !this.played.has(this.page)) {
      this.played.add(this.page);
      ui.focus('reveal_done');
    }
    dim(ctx, W, H, 0.9);
    const title = logo('RUN SPOILS', ['#fff6c2', '#fee761', '#feae34', '#f77622', '#be4a2f']);
    const titleScale = Math.min(1, (W - 14) / title.width);
    const titleH = Math.round(title.height * titleScale);
    const h = Math.min(114, Math.floor((H - titleH - 64 - (rows - 1) * gap) / rows));
    const cardsH = rows * h + (rows - 1) * gap;
    const start = Math.max(4, Math.round((H - titleH - cardsH - 60) / 2));
    const top = start + titleH + 24, foot = top + cardsH + 15;
    ctx.drawImage(title, Math.round(W / 2 - title.width * titleScale / 2), start, Math.round(title.width * titleScale), titleH);
    const summary = this.claims.length
      ? `${this.claims.filter(e => e.state === 'worn').length} equipped · ${this.claims.filter(e => e.state === 'stashed').length} stored · ${this.claims.filter(e => e.state === 'sold').length} sold`
      : `${entries.length} collected`;
    drawText(ctx, pages > 1 ? `${summary} · ${this.page + 1}/${pages}` : summary, W / 2, start + titleH + 7, { align: 'center', color: '#c0cbdc' });
    if (!shown.length) drawText(ctx, 'All gear decisions saved', W / 2, top + Math.round(h / 2), { align: 'center', color: '#fee761' });
    else if (this.receipt.reward?.spoilsGold) {
      drawText(ctx, `Excess gear sold · +${this.receipt.reward.spoilsGold} gold`, W / 2, top - 9, { align: 'center', color: '#feae34' });
    }
    if (!done) {
      const tick = Math.floor(reelPosition(reelProgress(this.t, 0, end), this.page));
      if (tick !== this.spinTick) {
        this.spinTick = tick;
        sfx('tally', { pitch: 0.85 + (10 - tick) * 0.035 });
      }
    }
    shown.forEach(({ item, state }, i) => {
      const row = Math.floor(i / cols), cells = Math.min(cols, shown.length - row * cols);
      const x = Math.round((W - cells * w - (cells - 1) * gap) / 2) + (i % cols) * (w + gap), y = top + row * (h + gap);
      const rarity = RARITIES[item.rarity], icon = itemIcon(item);
      const p = reelProgress(this.t, 0, SPIN + i * GAP), landed = p >= 1;
      panel(ctx, x, y, w, h, { fill: '#171421', trim: [landed ? rarity.color : '#5a3f3a', '#302238'], rivets: false });
      drawRewardReel(ctx, { x: x + Math.round((w - 40) / 2), y: y + 4, w: 40, h: 34, progress: p, icon, color: rarity.color, seed: i + this.page * PAGE, gear: true });
      if (!landed) return;
      if (i >= this.heard) {
        this.heard = i + 1;
        sfx(item.rarity === 4 ? 'legendary' : item.rarity === 3 ? 'epic' : 'reveal', { pitch: 1.05 + i * 0.13 });
      }
      const name = wrapText(itemName(item), w - 8);
      const maxName = h < 82 ? 1 : 2;
      name.slice(0, maxName).forEach((line, j) => drawText(ctx, line, x + w / 2, y + 41 + j * 9, { align: 'center', color: rarity.color }));
      const detailY = y + 43 + Math.min(name.length, maxName) * 9;
      const details = itemLines(item).flatMap(line => wrapText(line, w - 8));
      const detailRows = Math.max(0, Math.floor((y + h - 15 - detailY) / 8));
      details.slice(0, detailRows).forEach((line, j) => drawText(ctx, line, x + w / 2, detailY + j * 8, { align: 'center', color: '#c0cbdc' }));
      drawText(ctx, `${rarity.name.toUpperCase()} · ${state.toUpperCase()}`, x + w / 2, y + h - 11, { align: 'center', color: state === 'sold' ? '#c28569' : '#ead4aa' });
    });
    if (this.receipt.truncated) drawText(ctx, 'Showing the latest saved finds', W / 2, foot - 10, { align: 'center', color: '#c28569' });
    if (this.error) drawText(ctx, 'Could not confirm. Try again.', W / 2, foot - 10, { align: 'center', color: '#f6757a' });
    ui.begin(dt);
    const y = foot, center = Math.round(W / 2), step = 24, bw = Math.min(114, W - 82);
    if (!done) {
      const skip = button(ctx, ui, 'reveal_skip', center - bw / 2, y, bw, 15, 'STOP REELS');
      if (skip || ui.lockT <= 0 && input.pressed('back')) {
        this.t = end;
        ui.focus('reveal_done');
        ui.lock(0.2);
      }
    } else {
      const prev = pages > 1 && button(ctx, ui, 'reveal_prev', center - bw / 2 - step - 4, y, step, 15, '<', { disabled: this.page === 0 || this.saving });
      const next = pages > 1 && button(ctx, ui, 'reveal_next', center + bw / 2 + 4, y, step, 15, '>', { disabled: this.page === pages - 1 || this.saving });
      const advance = !this.claims.length && this.played.size < pages;
      const confirm = button(ctx, ui, 'reveal_done', center - bw / 2, y, bw, 15, this.saving ? 'CONFIRMING…' : advance ? 'NEXT REEL' : this.error ? 'TRY AGAIN' : 'CONTINUE', { disabled: this.saving, color: '#fee761' });
      if (prev) this.openPage(this.page - 1);
      else if (next) this.openPage(this.page + 1);
      else if (confirm && advance) this.openPage(Array.from({ length: pages }, (_, page) => page).find(page => !this.played.has(page)));
      else if (confirm) this.acknowledge();
    }
    ui.end();
  }

  drawClaim(ctx, W, H, dt) {
    const { app, receipt, claim } = this, ui = app.ui;
    const { item } = this.claims[claim];
    const rarity = RARITIES[item.rarity], center = Math.round(W / 2), gear = app.store.profile.gear[receipt.hero] || {};
    const worn = gear[item.slot], duplicate = itemIdentified(item) && powerWorn(gear, item.power, item.slot);
    const compatible = canEquipItem(item, receipt.hero), cost = identificationCost(app.store.profile);
    const full = app.store.profile.stash.length >= MAX_STASH;
    const revision = gearRevision(app.store.profile, receipt.hero);
    this.t += dt;
    const progress = reelProgress(this.t, 0, SPIN), landed = progress >= 1;
    const tick = Math.floor(reelPosition(progress, claim));
    if (!landed && tick !== this.spinTick) {
      this.spinTick = tick;
      sfx('tally', { pitch: 0.85 + (10 - tick) * 0.035 });
    }
    if (landed && !this.claimLanded) {
      this.claimLanded = true;
      ui.focus(duplicate ? 'claim_sell' : 'claim_equip');
      ui.lock(0.2);
      sfx(item.rarity === 4 ? 'legendary' : item.rarity === 3 ? 'epic' : 'reveal');
    }
    dim(ctx, W, H, 0.9);
    const title = logo('COLLECTED GEAR');
    const scale = Math.min(1, (W - 16) / title.width), titleH = Math.round(title.height * scale);
    const cardW = Math.min(150, Math.floor((W - 24) / 2)), cardH = Math.min(116, H - titleH - 142);
    const start = Math.max(5, Math.round((H - titleH - cardH - 126) / 2));
    ctx.drawImage(title, Math.round(center - title.width * scale / 2), start, Math.round(title.width * scale), titleH);
    drawText(ctx, `${claim + 1} OF ${this.claims.length} · ${app.store.profile.gold} GOLD`, center, start + titleH + 5, { align: 'center', color: '#c0cbdc' });
    const reelY = start + titleH + 17;
    drawRewardReel(ctx, { x: center - 30, y: reelY, w: 60, h: 37, progress, icon: itemIcon(item), color: rarity.color, seed: claim, gear: true });
    const top = reelY + 42, left = center - cardW - 3, right = center + 3;
    ui.begin(dt);
    if (!landed) {
      if (button(ctx, ui, 'claim_skip', center - 48, top + 12, 96, 15, 'STOP REEL') || ui.lockT <= 0 && input.pressed('back')) this.t = SPIN;
      ui.end();
      return;
    }
    this.claimCard(ctx, left, top, cardW, cardH, 'NEW ' + rarity.name.toUpperCase(), item, 'new');
    this.claimCard(ctx, right, top, cardW, cardH, `WORN ${SLOT_NAMES[item.slot].toUpperCase()}`, worn, 'worn');
    const foot = top + cardH + 14;
    const message = this.claimError || (!compatible ? 'This weapon belongs to another fighting style' : duplicate ? 'That legendary power is already equipped' : worn ? 'Replaced equipment goes to your inventory' : !itemIdentified(item) ? 'Equip now for base bonuses; identify to reveal magic' : '');
    if (message) {
      const line = wrapText(message, W - 12)[0];
      drawText(ctx, line, center, foot - 10, { align: 'center', color: this.claimError || duplicate ? '#f6757a' : '#c0cbdc' });
    }
    if (button(ctx, ui, 'claim_equip', left, foot, cardW, 15, this.saving ? 'SAVING…' : 'EQUIP', { disabled: duplicate || !compatible || full && !!worn || this.saving, color: '#fee761' })) this.resolveClaim('equip', revision);
    if (button(ctx, ui, 'claim_sell', right, foot, cardW, 15, `SELL +${itemPrice(item)}`, { disabled: this.saving, color: '#feae34' })) this.resolveClaim('sell', revision);
    if (button(ctx, ui, 'claim_identify', left, foot + 21, cardW, 15, itemIdentified(item) ? 'IDENTIFIED' : `IDENTIFY ${cost} GOLD`, { disabled: this.saving || itemIdentified(item) || app.store.profile.gold < cost, color: '#63b8ff' })) this.resolveClaim('identify', revision, cost);
    if (button(ctx, ui, 'claim_stash', right, foot + 21, cardW, 15, full ? 'INVENTORY FULL' : `STASH ${app.store.profile.stash.length}/${MAX_STASH}`, { disabled: this.saving || full })) this.resolveClaim('stash', revision);
    ui.end();
  }

  claimCard(ctx, x, y, w, h, heading, item, key) {
    const color = item ? RARITIES[item.rarity].color : '#8b9bb4';
    panel(ctx, x, y, w, h, { fill: '#171421', trim: [color, '#302238'], rivets: false });
    drawText(ctx, heading, x + w / 2, y + 5, { align: 'center', color: '#c28569' });
    const lines = item ? wrapText(itemName(item), w - 10) : ['Empty slot'];
    lines.forEach((line, i) => drawText(ctx, line, x + w / 2, y + 16 + i * 9, { align: 'center', color }));
    if (!item) return;
    const dy = 19 + lines.length * 9, rows = Math.max(1, Math.floor((h - 6 - dy) / 8));
    let details = itemLines(item).flatMap(line => wrapText(line, w - 10));
    const overflow = details.length > rows;
    if (overflow) details = itemLines(item).flatMap(line => wrapText(line, w - 29));
    const most = Math.max(0, details.length - rows), mouse = input.mouse;
    this.detailScroll ??= {};
    let scroll = this.detailScroll[key] || 0;
    if (mouse.x >= x && mouse.x < x + w && mouse.y >= y && mouse.y < y + h) scroll += Math.sign(mouse.wheel || 0) * 2;
    if (overflow) {
      const ui = this.app.ui;
      if (button(ctx, ui, `claim_${key}_up`, x + w - 20, y + dy, 15, 12, '↑', { disabled: scroll <= 0 })) scroll -= 2;
      if (button(ctx, ui, `claim_${key}_down`, x + w - 20, y + h - 18, 15, 12, '↓', { disabled: scroll >= most })) scroll += 2;
    }
    scroll = this.detailScroll[key] = clamp(scroll, 0, most);
    details.slice(scroll, scroll + rows).forEach((line, i) => {
      drawText(ctx, line, x + (w - (overflow ? 18 : 0)) / 2, y + dy + i * 8, { align: 'center', color: '#c0cbdc' });
    });
  }

  async resolveClaim(action, expectedGearRev, expectedCost) {
    if (this.saving) return;
    this.saving = true;
    const store = this.app.store, { id } = this.receipt;
    const r = await store.resolveSpoil({ id, index: this.claim, action, expectedGearRev, expectedCost })
      .catch(() => ({ ok: false, error: 'Could not save. Try again.' }));
    this.saving = false;
    this.claimError = r.error;
    const receipt = store.pendingReveal;
    if (receipt?.id === id && (r.ok || receipt.claims !== this.receipt.claims)) {
      if (r.ok) sfx(action === 'sell' ? 'coin' : 'pick');
      if (action === 'identify' && r.ok) {
        this.receipt = receipt;
        this.claims = unpackSpoils(receipt.claims);
      } else this.loadClaims(receipt);
    } else if (r.ok && !receipt) this.done = true;
  }

  async acknowledge() {
    if (this.saving) return;
    this.saving = true;
    this.error = !(await this.app.store.acknowledgeReveal(this.receipt.id).catch(() => false));
    this.done = !this.error;
    this.saving = false;
  }
}

// The same reveal resumes after closing the tab. If the original request had no
// response, the store sends the exact same run id before showing any items.
export class SpoilsScreen {
  enter(app) {
    this.app = app;
    app.ui.lock(0.3);
    this.resume();
  }

  async resume() {
    this.saving = true;
    const store = this.app.store;
    if (store.pendingRun) this.error = await store.resumeRun();
    if (store.pendingReveal) this.reveal = new SpoilsReveal(this.app, store.pendingReveal);
    this.saving = false;
  }

  draw(ctx, W, H, dt) {
    const { app } = this, ui = app.ui;
    app.scene.draw(ctx, W, H, dt);
    if (this.reveal) {
      this.reveal.draw(ctx, W, H, dt);
      if (this.reveal.done) app.go('title');
      return;
    }
    if (!this.saving && !this.error?.unsaved) {
      app.go('title');
      return;
    }
    dim(ctx, W, H, 0.8);
    const center = Math.round(W / 2), y = Math.round(H / 2);
    drawText(ctx, this.saving ? 'Saving your spoils…' : 'The last run could not be saved.', center, y - 24, { align: 'center', color: '#fee761' });
    ui.begin(dt);
    if (this.error?.down && !this.saving && button(ctx, ui, 'resume_run', center - 48, y - 7, 96, 15, 'SAVE AGAIN')) this.resume();
    if (!this.saving && button(ctx, ui, 'back', center - 48, y + 13, 96, 15, 'BACK TO CAMP')) app.go('title');
    ui.end();
  }
}
