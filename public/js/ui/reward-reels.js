import { input } from '../engine/input.js';
import { sfx } from '../engine/audio.js';
import { SPR } from '../engine/sprites.js';
import { clamp, ease } from '../engine/util.js';
import { HEROES } from '../data/heroes.js';
import { RARITIES, SLOTS, SLOT_NAMES, itemName, itemLines, itemPrice, powerWorn, itemIdentified, canEquipItem, itemIcon } from '../shared/items.js';
import { gearRevision, identificationCost, MAX_STASH } from '../shared/profile.js';
import { MAX_CLAIMS, unpackSpoils } from '../shared/spoils.js';
import { MenuDialog } from './menu-dialog.js';
import { IDENTIFICATION_RULE } from './menu-copy.js';
import { gearPreview } from './gear-preview.js';
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

// Choose the retained set before committing a run that exceeds the receipt's capacity.
export class SpoilsSelection {
  constructor(ui, finds, submit, volatile = false) {
    this.ui = ui;
    this.finds = finds;
    this.submit = submit;
    this.volatile = volatile;
    const byRarity = finds.map((entry, i) => ({ rarity: entry.item.rarity, i })).sort((a, b) => b.rarity - a.rarity);
    this.kept = new Set(byRarity.slice(0, MAX_CLAIMS).map(({ i }) => i));
    this.page = 0;
    ui.focus('select_spoils_next');
    ui.lock(0.2);
  }

  draw(ctx, W, H, dt) {
    const { ui, finds, kept, page } = this;
    if (this.confirm) {
      const action = this.confirm.draw(ctx, ui, W, H, dt);
      if (action === 'sell') this.submit([...kept].sort((a, b) => a - b));
      if (action === 'close') {
        this.confirm = null;
        ui.focus('select_spoils_review');
        ui.lock(0.2);
      }
      return;
    }
    const perPage = 3, pages = Math.ceil(finds.length / perPage);
    const first = page * perPage, shown = finds.slice(first, first + perPage);
    const w = Math.min(W - 20, 340), x = Math.round((W - w) / 2), y = Math.max(2, Math.round((H - 158) / 2));
    dim(ctx, W, H, 0.88);
    panel(ctx, x, y, w, 158, { title: 'CHOOSE FINDS TO KEEP', fill: '#15131f' });
    drawText(ctx, `Keep up to ${MAX_CLAIMS}. Unmarked finds sell for gold.`, W / 2, y + 12, { align: 'center', color: '#c0cbdc' });
    drawText(ctx, `${kept.size}/${MAX_CLAIMS} marked to keep · Page ${page + 1}/${pages}`, W / 2, y + 23, { align: 'center', color: '#fee761' });
    if (this.volatile) drawText(ctx, 'Keep this tab open until the run saves.', W / 2, y + 123, { align: 'center', color: '#feae34' });
    ui.begin(dt);
    shown.forEach(({ item }, offset) => {
      const index = first + offset, keep = kept.has(index), row = y + 34 + offset * 29;
      const rarity = RARITIES[item.rarity];
      if (button(ctx, ui, `select_spoils_${offset}`, x + 9, row, w - 18, 15, `${keep ? 'KEEP' : 'SELL'} · ${itemName(item)}`, { color: rarity.color, disabled: !keep && kept.size >= MAX_CLAIMS })) {
        if (keep) kept.delete(index);
        else kept.add(index);
      }
      const base = itemLines(item).filter(line => !line.startsWith('Unidentified')).slice(0, 2);
      drawText(ctx, `${rarity.name} · ${[...base, `${itemPrice(item)} gold`].join(' · ')}`, W / 2, row + 16, { align: 'center', color: '#c0cbdc' });
    });
    if (button(ctx, ui, 'select_spoils_prev', x + 9, y + 134, 26, 15, '<', { disabled: page === 0 })) this.page--;
    if (button(ctx, ui, 'select_spoils_next', x + w - 35, y + 134, 26, 15, '>', { disabled: page === pages - 1 })) this.page++;
    if (button(ctx, ui, 'select_spoils_review', W / 2 - 56, y + 134, 112, 15, 'REVIEW SALE', { color: '#fee761' })) {
      const gold = finds.reduce((sum, { item }, i) => sum + (kept.has(i) ? 0 : itemPrice(item)), 0);
      const count = finds.length - kept.size;
      this.confirm = new MenuDialog('Confirm overflow sale', [
        `${kept.size} marked finds will remain available to equip, identify, stash or sell.`,
        `${count} unmarked finds will be sold for ${gold} gold.`,
      ], [{ id: 'sell', label: `SELL ${count} FOR ${gold} GOLD`, color: '#feae34' }]);
      ui.focus('detail_close');
      ui.lock(0.2);
    }
    ui.end();
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
    const remaining = this.claims.filter(e => e.state === 'sealed').length;
    if (this.claim < 0) {
      this.openPage(0);
      return;
    }
    if (remaining > 1 || this.overviewPage !== undefined) this.openOverview(this.claim);
    else this.openClaim(this.claim);
  }

  openClaim(index) {
    this.claim = index;
    this.overview = false;
    this.claimError = null;
    this.claimReady = false;
    this.revealedMagic = false;
    this.detailScroll = {};
    this.app.ui.lock(0.2);
  }

  openOverview(index) {
    this.overview = true;
    this.overviewPage ??= 0;
    this.app.ui.focus(`find_${index}`);
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
    if (this.claim >= 0 && this.overview) return this.drawOverview(ctx, W, H, dt);
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

  drawOverview(ctx, W, H, dt) {
    const { ui, store } = this.app;
    const finds = this.claims.flatMap(({ item, state }, index) => state === 'sealed' ? [{ item, index }] : []);
    const cols = W >= 440 ? 3 : 2, step = 36;
    const perPage = cols * Math.max(1, Math.floor((H - 66) / step));
    const pages = Math.ceil(finds.length / perPage), page = this.overviewPage = Math.min(this.overviewPage, pages - 1);
    const shown = finds.slice(page * perPage, (page + 1) * perPage);
    const w = Math.min(510, W - 16), h = Math.ceil(shown.length / cols) * step + 60;
    const x = Math.round((W - w) / 2), y = Math.round((H - h) / 2), gap = 4;
    const cardW = Math.floor((w - 16 - (cols - 1) * gap) / cols);
    dim(ctx, W, H, 0.9);
    panel(ctx, x, y, w, h, { title: 'COLLECTED GEAR', fill: '#15131f' });
    const status = this.saving ? 'Saving decision…' : this.claimError || `${finds.length} finds remaining · ${store.profile.gold} gold`;
    drawText(ctx, wrapText(status, w - 12)[0], W / 2, y + 16, { align: 'center', color: this.claimError ? '#f6757a' : '#c0cbdc' });
    ui.begin(dt);
    for (const [i, { item, index }] of shown.entries()) {
      const bx = x + 8 + i % cols * (cardW + gap), by = y + 29 + Math.floor(i / cols) * step;
      const rarity = RARITIES[item.rarity];
      const routine = item.rarity === 0 && item.base !== undefined;
      const half = Math.floor((cardW - 3) / 2);
      drawText(ctx, wrapText(itemName(item), cardW)[0], bx + cardW / 2, by, { align: 'center', color: rarity.color });
      drawText(ctx, routine ? itemLines(item)[0] : rarity.name, bx + cardW / 2, by + 9, { align: 'center', color: '#c0cbdc' });
      if (button(ctx, ui, `find_${index}`, bx, by + 18, routine ? half : cardW, 14, 'INSPECT', { color: rarity.color, disabled: this.saving })) this.openClaim(index);
      if (routine && button(ctx, ui, `quick_sell_${index}`, bx + half + 3, by + 18, cardW - half - 3, 14, `SELL +${itemPrice(item)}`, { color: '#feae34', disabled: this.saving })) {
        this.claim = index;
        this.resolveClaim('sell');
      }
    }
    if (pages > 1) {
      const foot = y + h - 24, center = Math.round(W / 2);
      if (button(ctx, ui, 'finds_prev', center - 52, foot, 24, 15, '<', { disabled: this.saving || page === 0 })) this.overviewPage--;
      if (button(ctx, ui, 'finds_next', center + 28, foot, 24, 15, '>', { disabled: this.saving || page === pages - 1 })) this.overviewPage++;
      drawText(ctx, `${page + 1}/${pages}`, center, foot + 3, { align: 'center', color: '#c0cbdc' });
    }
    ui.end();
  }

  drawClaim(ctx, W, H, dt) {
    const { app, receipt, claim } = this, ui = app.ui;
    if (this.claimDialog) {
      const action = this.claimDialog.draw(ctx, ui, W, H, dt);
      if (action && !this.saving) this.claimDialogAction(action);
      return;
    }
    const { item } = this.claims[claim];
    const rarity = RARITIES[item.rarity], center = Math.round(W / 2), gear = app.store.profile.gear[receipt.hero] || {};
    const worn = gear[item.slot], duplicate = itemIdentified(item) && powerWorn(gear, item.power, item.slot);
    const compatible = canEquipItem(item, receipt.hero), cost = identificationCost(app.store.profile);
    const full = app.store.profile.stash.length >= MAX_STASH;
    const revision = gearRevision(app.store.profile, receipt.hero);
    if (!this.claimReady) {
      this.claimReady = true;
      ui.focus(full && worn ? 'claim_stash' : duplicate ? 'claim_sell' : 'claim_equip');
    }
    dim(ctx, W, H, 0.9);
    const title = logo('COLLECTED GEAR');
    const scale = Math.min(1, (W - 16) / title.width), titleH = Math.round(title.height * scale);
    const cardW = Math.min(150, Math.floor((W - 24) / 2)), cardH = Math.min(134, H - titleH - 124);
    const start = Math.max(5, Math.round((H - titleH - cardH - 112) / 2));
    ctx.drawImage(title, Math.round(center - title.width * scale / 2), start, Math.round(title.width * scale), titleH);
    drawText(ctx, `${claim + 1} OF ${this.claims.length} · ${app.store.profile.gold} GOLD`, center, start + titleH + 5, { align: 'center', color: '#c0cbdc' });
    const icon = (SPR[itemIcon(item)] ?? SPR.i_greed).frames[0].c;
    const iconScale = Math.min(2, 24 / Math.max(icon.width, icon.height));
    const iconW = Math.round(icon.width * iconScale), iconH = Math.round(icon.height * iconScale);
    ctx.drawImage(icon, center - Math.floor(iconW / 2), start + titleH + 17, iconW, iconH);
    const top = start + titleH + 45, left = center - cardW - 3, right = center + 3;
    ui.begin(dt);
    const compareW = Math.min(94, center - 25);
    if (this.overviewPage !== undefined && (button(ctx, ui, 'claim_back', center - 18 - compareW, top - 24, compareW, 15, W < 220 ? 'FINDS' : 'ALL FINDS', { disabled: this.saving }) ||
        !this.saving && ui.lockT <= 0 && input.pressed('back'))) {
      this.openOverview(claim);
      ui.end();
      return;
    }
    if (button(ctx, ui, 'claim_compare', center + 18, top - 24, compareW, 15, W < 220 ? 'COMPARE' : 'NEXT RUN STATS', { disabled: this.saving })) {
      this.showClaimDialog(`Next run · ${HEROES[receipt.hero].title}`, gearPreview(app.store.profile, receipt.hero, item), [], () => this.closeClaimDialog('claim_compare'));
    }
    this.claimCard(ctx, left, top, cardW, cardH, this.revealedMagic ? 'MAGIC REVEALED' : 'NEW ' + rarity.name.toUpperCase(), item, 'new');
    this.claimCard(ctx, right, top, cardW, cardH, `WORN ${SLOT_NAMES[item.slot].toUpperCase()}`, worn, 'worn');
    const foot = top + cardH + 14;
    const message = this.claimError || (!compatible ? 'This weapon belongs to another fighting style' : duplicate ? 'That legendary power is already equipped' : full ? 'Manage inventory to make room for gear' : worn ? 'Replaced equipment goes to your inventory' : !itemIdentified(item) ? 'Equip now for base bonuses; identify to reveal magic' : '');
    if (message) {
      const line = wrapText(message, W - 12)[0];
      drawText(ctx, line, center, foot - 10, { align: 'center', color: this.claimError || duplicate ? '#f6757a' : '#c0cbdc' });
    }
    if (button(ctx, ui, 'claim_equip', left, foot, cardW, 15, this.saving ? 'SAVING…' : 'EQUIP', { disabled: duplicate || !compatible || full && !!worn || this.saving, color: '#fee761' })) this.resolveClaim('equip', revision);
    if (button(ctx, ui, 'claim_sell', right, foot, cardW, 15, `SELL +${itemPrice(item)}`, { disabled: this.saving, color: '#feae34' })) this.resolveClaim('sell', revision);
    if (button(ctx, ui, 'claim_identify', left, foot + 21, cardW, 15, itemIdentified(item) ? 'IDENTIFIED' : `IDENTIFY ${cost} GOLD`, { disabled: this.saving || itemIdentified(item) || app.store.profile.gold < cost, color: '#63b8ff' })) this.resolveClaim('identify', revision, cost);
    if (button(ctx, ui, 'claim_stash', right, foot + 21, cardW, 15, full ? 'MANAGE INVENTORY' : `STASH ${app.store.profile.stash.length}/${MAX_STASH}`, { disabled: this.saving })) {
      if (full) this.openInventory();
      else this.resolveClaim('stash', revision);
    }
    if (!itemIdentified(item)) drawText(ctx, IDENTIFICATION_RULE, center, foot + 40, { align: 'center', color: '#c0cbdc' });
    ui.end();
  }

  showClaimDialog(title, lines, actions, handle) {
    this.claimDialog = new MenuDialog(title, lines, actions);
    this.claimDialogAction = handle;
    this.app.ui.focus('detail_close');
    this.app.ui.lock(0.2);
  }

  openInventory(page = 0, error) {
    const { stash } = this.app.store.profile;
    const pages = Math.max(1, Math.ceil(stash.length / 3));
    page = Math.min(page, pages - 1);
    const start = page * 3, shown = stash.slice(start, start + 3);
    const lines = [error || 'Sell a stored item to make room. Your new find stays pending.'];
    const actions = shown.map((item, i) => ({ id: String(i), label: itemName(item), color: RARITIES[item.rarity].color }));
    if (pages > 1) actions.push({ id: 'page', label: `NEXT ITEMS · ${page + 1}/${pages}` });
    this.showClaimDialog(`Inventory ${stash.length}/${MAX_STASH}`, lines, actions, action => {
      if (action === 'page') this.openInventory((page + 1) % pages);
      else if (action === 'close') this.closeClaimDialog();
      else this.inspectStored(shown[Number(action)], start + Number(action), page, stash.length);
    });
  }

  closeClaimDialog(focus = 'claim_stash') {
    this.claimDialog = this.claimDialogAction = null;
    this.app.ui.focus(focus);
    this.app.ui.lock(0.2);
  }

  inspectStored(item, index, page, expectedStashSize) {
    const { store } = this.app, hero = this.receipt.hero;
    const claim = { id: this.receipt.id, index: this.claim };
    const decision = { hero, source: 'stash', index, expected: item, expectedGearRev: gearRevision(store.profile, hero), expectedStashSize, action: 'sell', claim };
    const sell = { id: 'sell', label: `SELL STORED ITEM · +${itemPrice(item)} GOLD`, color: '#feae34' };
    this.showClaimDialog(itemName(item), itemLines(item), [sell], async action => {
      if (action === 'close') return this.openInventory(page);
      this.saving = true;
      this.showClaimDialog('Saving inventory', ['Keeping your decision…'], [], () => {});
      const result = await store.manageInventory(decision).catch(() => ({ ok: false, error: 'Could not save. Try again.' }));
      this.saving = false;
      const receipt = store.pendingReveal;
      if (receipt?.id !== this.receipt.id) {
        this.done = true;
        return;
      }
      if (receipt.claims !== this.receipt.claims) {
        this.closeClaimDialog();
        this.loadClaims(receipt);
      } else if (result.ok || store.profile.stash.length < MAX_STASH) {
        this.claimError = null;
        if (result.ok) sfx('coin');
        this.closeClaimDialog();
      } else this.openInventory(page, result.error);
    });
  }

  claimCard(ctx, x, y, w, h, heading, item, key) {
    const color = item ? RARITIES[item.rarity].color : '#8b9bb4';
    const revealed = key === 'new' && this.revealedMagic;
    const accent = item?.power || item?.grant ? '#fee761' : '#63b8ff';
    panel(ctx, x, y, w, h, { fill: '#171421', trim: [revealed ? accent : color, '#302238'], rivets: false });
    drawText(ctx, heading, x + w / 2, y + 5, { align: 'center', color: revealed ? accent : '#c28569' });
    const lines = item ? wrapText(itemName(item), w - 10) : ['Empty slot'];
    lines.forEach((line, i) => drawText(ctx, line, x + w / 2, y + 16 + i * 9, { align: 'center', color }));
    if (!item) return;
    const dy = 19 + lines.length * 9, rows = Math.max(1, Math.floor((h - 6 - dy) / 8));
    const effects = itemLines(item), ordinary = Object.keys(item.base || {}).length + Number(!!item.weaponType);
    const wrapEffects = width => effects.flatMap((line, i) => wrapText(line, width).map(text => ({ text, color: revealed && i >= ordinary ? accent : '#c0cbdc' })));
    let details = wrapEffects(w - 10);
    const overflow = details.length > rows;
    if (overflow) details = wrapEffects(w - 29);
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
    details.slice(scroll, scroll + rows).forEach(({ text, color }, i) => {
      drawText(ctx, text, x + (w - (overflow ? 18 : 0)) / 2, y + dy + i * 8, { align: 'center', color });
    });
  }

  async resolveClaim(action, expectedGearRev, expectedCost) {
    if (this.saving) return;
    this.saving = true;
    const store = this.app.store, { id } = this.receipt, index = this.claim;
    const r = await store.resolveSpoil({ id, index, action, expectedGearRev, expectedCost })
      .catch(() => ({ ok: false, error: 'Could not save. Try again.' }));
    this.saving = false;
    this.claimError = r.error;
    const receipt = store.pendingReveal;
    if (receipt?.id === id && (r.ok || receipt.claims !== this.receipt.claims)) {
      const claims = unpackSpoils(receipt.claims), identified = claims[index];
      if (action === 'identify' && identified?.state === 'sealed' && itemIdentified(identified.item)) {
        this.receipt = receipt;
        this.claims = claims;
        this.claimError = null;
        this.detailScroll.new = 0;
        this.revealedMagic = true;
        sfx(identified.item.power || identified.item.grant ? 'legendary' : 'reveal');
      } else {
        if (r.ok) sfx(action === 'sell' ? 'coin' : 'pick');
        this.loadClaims(receipt);
      }
    } else if (receipt?.id !== id) this.done = true;
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

  async resume(report = this.app.store.pendingRun) {
    this.saving = true;
    const store = this.app.store;
    if (report) {
      this.error = await store.resumeRun(report);
      if (this.error?.chooseSpoils) this.selection = new SpoilsSelection(this.app.ui, this.error.chooseSpoils, claimIndices => {
        this.selection = null;
        this.resume({ ...report, claimIndices });
      }, this.error.volatile);
    }
    if (store.pendingReveal) this.reveal = new SpoilsReveal(this.app, store.pendingReveal);
    this.saving = false;
  }

  draw(ctx, W, H, dt) {
    const { app } = this, ui = app.ui;
    app.scene.draw(ctx, W, H, dt);
    if (this.selection) return this.selection.draw(ctx, W, H, dt);
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
