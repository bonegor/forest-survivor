import { input, padKey } from '../engine/input.js';
import { SPR, idleFrame } from '../engine/sprites.js';
import { sfx, playAfterJingle } from '../engine/audio.js';
import { clamp, fmtTime } from '../engine/util.js';
import { HEROES, HERO_ORDER, heroLook, startWeapons } from '../data/heroes.js';
import { WEAPONS } from '../data/weapons.js';
import { PROGRESS } from '../shared/progress.js';
import { MAP_LADDER } from '../data/maps.js';
import { nextHeroUnlock, nextGoal, openFor, heroUnlockTime, transferUnlocked, transferQuote, gearRevision, TRANSFER_ACHIEVEMENT, identificationCost, MAX_STASH } from '../shared/profile.js';
import { SLOTS, SLOT_NAMES, itemName, itemLines, itemPrice, RARITIES, itemIdentified, canEquipItem, sameItem } from '../shared/items.js';
import { panel, button, dim, drawText, wrapText, textWidth, textCanvas } from './ui.js';
import { heroCrop, mix } from './scenes.js';
import { goalText, featStars } from './ladder.js';
import { flank } from './skin.js';
import { MenuDialog } from './menu-dialog.js';
import { IDENTIFICATION_RULE } from './menu-copy.js';
import { gearPreview } from './gear-preview.js';
import { HeroShowcase } from './hero-showcase.js';

export function heroSelectionLayout(W, H) {
  const width = Math.min(608, W - 24), x = Math.round((W - width) / 2);
  const stacked = W < 440 && H >= 430;
  const cols = W >= 440 ? 9 : stacked ? 5 : 7, rows = Math.ceil(HERO_ORDER.length / cols);
  const gap = 4, cardW = Math.floor((width - (cols - 1) * gap) / cols), cardH = H < 335 ? 31 : 36;
  const top = 28 + rows * (cardH + gap) + 3;
  const bottom = H - (stacked ? 54 : 34);
  const height = bottom - top;
  const stageW = Math.round(width * 0.38), stageH = clamp(height * 0.43, 72, 320);
  return {
    x, width, cols, rows, cardW, cardH, gap, stacked,
    stage: { x, y: top, w: stacked ? width : stageW, h: stacked ? stageH : height },
    info: { x: stacked ? x : x + stageW + 8, y: stacked ? top + stageH + 8 : top, w: stacked ? width : width - stageW - 8, h: stacked ? height - stageH - 8 : height },
    play: { x: stacked ? x : x + width - 148, y: H - (stacked ? 45 : 23), w: stacked ? width : 148, h: 17 },
  };
}

function heading(ctx, W) {
  const c = textCanvas('Choose your Hero', ['#fff6c2', '#fee761', '#feae34', '#f77622'], '#181425', '#0d0b14', 'heading');
  ctx.drawImage(c, Math.round((W - c.width) / 2), 7);
  flank(ctx, (W - c.width) / 2 - 4, (W + c.width) / 2 + 4, 16, Math.min(40, (W - c.width) / 2 - 12));
}

function fit(text, width) {
  if (textWidth(text) <= width) return text;
  while (text.length && textWidth(text + '…') > width) text = text.slice(0, -1);
  return text + '…';
}

const FIELD_TARGETING = {
  eanasir: 'Good copper seeks the nearest foe, including in crypts',
  knight: 'Starts with a slash in front',
  archer: 'Fires along your last movement direction',
  mage: 'Fires at nearby foes and bursts on impact',
  rogue: 'Seeks the nearest foe',
  necromancer: 'Summons allies that seek foes',
  paladin: 'Prioritizes the strongest nearby foe',
  druid: 'Roots the nearest foe',
  berserker: 'Leaps at a foe ahead',
  witchhunter: 'Prioritizes strong foes',
  footman: 'Cuts the lead foe in front',
  marksman: 'Fires at the nearest foe',
  templar: 'Sets a short ward in front',
  trailblazer: 'Fires at a nearby foe and leaves a tripline',
  thornkeeper: 'Converges on a nearby foe',
  wraith: 'Cuts in front and from the previous shade',
  gravebinder: 'Targets a foe and siphons weaker foes nearby',
  arcanist: 'Sweeps at a foe’s distance',
  praetorian: 'Cuts a narrow front rank',
  seraph: 'Cleaves ahead and sweeps the flanks',
  boltguard: 'Fires toward the nearest visible foe',
  swordbearer: 'Cuts ahead. Momentum follows your stride',
};

const PERK_COPY = {
  knight: 'Bulwark: +1 armor. All regeneration is doubled.',
  berserker: 'Bloodrage: up to +30% damage and +15% attack speed at low health.',
  witchhunter: 'Inquisition: +30% damage to bosses and elites, +10% crit.',
};

export class HeroScreen {
  enter(app, params = {}) {
    this.app = app;
    this.t = 0;
    this.lastHero = app.choice.hero || 'knight';
    this.infoScroll = 0;
    // Returning to camp switches from the results' echo guitar to the menu piece.
    playAfterJingle('title');
    app.ui.lock(0.2);
    // Back from a run (the results' RETURN TO CAMP): the hero is as he was, so the focus starts on
    // PLAY, and the trial screen's on BEGIN. The way stays the owner's: every run starts here (db3987d).
    this.again = params.again && app.store.profile.heroes.includes(this.lastHero) ? this.lastHero : null;
    app.ui.focusId = this.again ? 'hero_continue' : 'h_' + this.lastHero;
  }

  draw(ctx, W, H, dt) {
    const app = this.app, ui = app.ui, profile = app.store.profile;
    this.t += dt;
    app.scene.draw(ctx, W, H, dt, { campfire: false });
    dim(ctx, W, H, 0.62);
    heading(ctx, W);
    if (this.dialog) {
      const action = this.dialog.draw(ctx, ui, W, H, dt);
      if (action && !this.inventorySaving) {
        const handle = this.dialogAction;
        this.dialog = this.dialogAction = null;
        ui.focus('h_' + this.lastHero);
        ui.lock(0.2);
        handle?.(action);
      }
      return;
    }
    const L = this.layout = heroSelectionLayout(W, H);
    ui.begin(dt);
    const next = nextHeroUnlock(profile);
    for (const [i, id] of HERO_ORDER.entries()) {
      const h = heroLook(id, app.settings.skins), locked = !profile.heroes.includes(id);
      const nextRecruit = locked && id === next;
      const x = L.x + i % L.cols * (L.cardW + L.gap), y = 28 + Math.floor(i / L.cols) * (L.cardH + L.gap);
      const activated = ui.item('h_' + id, x, y, L.cardW, L.cardH, { group: 'heroes', home: id === this.lastHero });
      if (ui.focused('h_' + id)) this.lastHero = id;
      if (activated && !locked) { app.choice.hero = id;ui.focus('hero_continue'); }
      const on = this.lastHero === id;
      panel(ctx, x, y, L.cardW, L.cardH, { rivets: false, fill: on ? '#292330' : '#14131f', trim: on ? ['#fee761', '#be4a2f'] : nextRecruit ? ['#feae34', '#59422f'] : ['#3a4466', '#262b44'] });
      const spr = SPR[h.sprite], crop = heroCrop(spr), frame = idleFrame(spr, Math.floor(this.t * SPR[h.pose].fps));
      const portraitW = Math.min(L.cardW - 4, crop.w);
      const portraitH = Math.min(L.cardH - 16, crop.h);
      ctx.globalAlpha = nextRecruit ? 0.65 : locked ? 0.22 : 1;
      ctx.drawImage(frame.c, crop.x + Math.floor((crop.w - portraitW) / 2), crop.y, portraitW, portraitH,
        Math.round(x + (L.cardW - portraitW) / 2), y + 3, portraitW, portraitH);
      ctx.globalAlpha = 1;
      const label = locked ? nextRecruit ? 'NEXT' : 'LOCKED' : h.short.toUpperCase();
      drawText(ctx, fit(label, L.cardW - 3), x + L.cardW / 2, y + L.cardH - 10, { align: 'center', color: on || nextRecruit ? '#fee761' : locked ? '#687186' : '#c0cbdc' });
      // The next hero's card fills toward his five minutes with the hero before him: that hero's
      // longest run (profile bt, the review's C4, 28 October 2026), the real distance only. Between
      // the portrait (y + 26 at most) and the label.
      if (nextRecruit) {
        const k = clamp((profile.bt?.[HERO_ORDER[i - 1]] || 0) / heroUnlockTime(id), 0, 1), bw = L.cardW - 12;
        if (k > 0) {
          ctx.fillStyle = '#262b44';
          ctx.fillRect(x + 6, y + L.cardH - 13, bw, 2);
          ctx.fillStyle = '#feae34';
          ctx.fillRect(x + 6, y + L.cardH - 13, Math.max(1, Math.round(bw * k)), 2);
        }
      }
      if (on) { ctx.fillStyle = '#fee761';ctx.fillRect(x + 3, y + L.cardH - 2, L.cardW - 6, 1); }
    }

    const id = this.lastHero, h = heroLook(id, app.settings.skins), locked = !profile.heroes.includes(id);
    if (!this.preview || this.preview.game.player.id !== id || this.preview.game.player.hero.sprite !== h.sprite) {
      this.preview = new HeroShowcase(id, profile, app.settings);
      this.infoScroll = 0;
    }
    this.preview.update(locked ? 0 : dt);
    const stage = { ...L.stage, h: L.stage.h - 20 };
    this.preview.draw(ctx, stage, locked, app.settings);
    if (ui.item('preview_attack', stage.x, stage.y, stage.w, stage.h, { disabled: locked })) this.preview.attack();
    if (ui.focused('preview_attack') && !locked) {
      const hint = input.device === 'pad' ? `${padKey('A')}: ATTACK` : input.device === 'touch' ? 'TAP TO ATTACK' : ui.focusSource === 'pointer' ? 'CLICK TO ATTACK' : 'ENTER: ATTACK';
      drawText(ctx, hint, stage.x + stage.w / 2, stage.y + stage.h - 10, { align: 'center', color: '#fee761' });
    }
    this.appearance(ctx, ui, h, L.stage, locked);
    this.details(ctx, ui, L.info, h, locked, dt);

    if (button(ctx, ui, 'back', L.x, H - 21, 44, 15, 'BACK', { fallback: true })) app.go('title');
    if (button(ctx, ui, 'equipment', L.x + 50, H - 21, 48, 15, 'GEAR', { disabled: locked })) this.equipment(id);
    if (button(ctx, ui, 'journey', L.x + 104, H - 21, 64, 15, 'JOURNEY')) this.journey();
    if (button(ctx, ui, 'hero_continue', L.play.x, L.play.y, L.play.w, L.play.h, locked ? 'HERO LOCKED' : `PLAY ${h.title.toUpperCase()}`, { disabled: locked, color: '#fee761' })) {
      app.choice.hero = id;app.go('mode', { again: this.again === id }); // BEGIN first only for the same hero
    }
    ui.end();
    if (input.pressed('back') && ui.lockT <= 0) app.go('title');
  }

  appearance(ctx, ui, h, box, locked) {
    const app = this.app;
    {
      // Every star he has earned, each in its colour (ladder.js featStars: the wins, then their marks).
      const earned = featStars(app.store.profile, h.id).filter(s => s[2]);
      // Ready for the night, on whichever Survival map it falls (28 October 2026).
      if (locked || !earned.length) drawText(ctx, locked ? 'NOT YET RECRUITED' : 'READY FOR THE NIGHT', box.x + box.w / 2, box.y + box.h - 12, { align: 'center', color: locked ? '#8b9bb4' : '#c28569' });
      else {
        const x0 = Math.round(box.x + box.w / 2 - (earned.length * 7 - 2) / 2);
        earned.forEach(([, col], i) => drawText(ctx, '★', x0 + i * 7, box.y + box.h - 12, { color: col }));
      }
    }
  }

  details(ctx, ui, box, h, locked, dt) {
    const { x, y, w, h: height } = box, p = this.preview.game.player, profile = this.app.store.profile;
    const inner = w - 24, tx = x + 10;
    const perk = wrapText(PERK_COPY[h.id] || h.perk, inner);
    const ult = wrapText(h.ultDesc, inner);
    const loadout = new Map();
    for (const id of startWeapons(h)) { const name = WEAPONS[id].name; loadout.set(name, (loadout.get(name) || 0) + 1); }
    const weapons = wrapText([...loadout].map(([name, count]) => count > 1 ? `${name} x${count}` : name).join(' + '), inner - 20);
    const targeting = wrapText(`Field targeting · ${FIELD_TARGETING[h.id]}`, inner);
    const weaponDesc = wrapText(h.startDesc || WEAPONS[h.weapon].desc, inner);
    const ownedUltimate = openFor(profile, h.id).ult;
    const weaponY = 70, descriptionY = weaponY + Math.max(16, weapons.length * 9) + 4;
    const perkY = descriptionY + (targeting.length + weaponDesc.length) * 9 + 6;
    const ultimateY = perkY + perk.length * 9 + 10;
    const goalY = ultimateY + 13 + ult.length * 9 + 7;
    const next = nextHeroUnlock(profile), prev = HERO_ORDER[HERO_ORDER.indexOf(h.id) - 1];
    // Each hero's longest run on the clock, any mode (profile bt, the review's C4, 28 October 2026):
    // the next hero's note tells the one before him's, a hero of the save his own under the note.
    const longest = (hid) => profile.bt?.[hid] || 0;
    const prevRun = locked && h.id === next && longest(prev) ? ` Longest run with the ${HEROES[prev].title}: ${fmtTime(longest(prev))}.` : '';
    const note = locked ? h.unlock || `Survive ${heroUnlockTime(h.id) / 60} minutes with the ${HEROES[prev].title} to recruit this hero.${prevRun}` : !ownedUltimate ? `Survive ${fmtTime(PROGRESS.ultTime)} with this hero to use ${h.ultName} next run.` : goalText(nextGoal(profile));
    const notes = wrapText(note, inner);
    const runs = !locked && longest(h.id) ? wrapText(`Longest run with this hero: ${fmtTime(longest(h.id))}`, inner) : [];
    const total = goalY + (notes.length + runs.length) * 9 + 8;
    const most = Math.max(0, total - (height - 12));
    const mouse = input.mouse;
    if (mouse.x >= x && mouse.x < x + w && mouse.y >= y && mouse.y < y + height) this.infoScroll += Math.sign(mouse.wheel || 0) * 27;
    this.infoScroll = clamp(this.infoScroll, 0, most);
    panel(ctx, x, y, w, height, { rivets: false, fill: '#14131f', trim: ['#3a4466', '#262b44'] });
    ctx.save();ctx.beginPath();ctx.rect(x + 4, y + 4, w - 8, height - 8);ctx.clip();
    const top = y + 7 - this.infoScroll;
    drawText(ctx, h.name, tx, top, { font: 'heading', color: ['#fff6c2', '#fee761', '#feae34'] });
    drawText(ctx, `${h.title.toUpperCase()} · EQUIPPED STATS`, tx, top + 19, { color: '#8b9bb4' });
    const stats = [['HEALTH', p.maxHp], ['ARMOR', p.armor], ['DAMAGE', `${Math.round(p.might * 100)}%`], ['SPEED', `${Math.round(p.speedMul * 100)}%`]];
    const sw = Math.floor((inner - 9) / 4);
    stats.forEach(([label, value], i) => {
      const sx = tx + i * (sw + 3), sy = top + 33;
      ctx.fillStyle = '#201e2b';ctx.fillRect(sx, sy, sw, 25);
      drawText(ctx, label, sx + 4, sy + 3, { color: '#8b9bb4' });
      drawText(ctx, String(value), sx + 4, sy + 14, { color: '#ead4aa' });
      ctx.fillStyle = mix(h.color, '#3a4466', 0.55);ctx.fillRect(sx, sy + 24, sw, 1);
    });
    drawText(ctx, fit(`Attack ${Math.round(100 / p.cooldown)}% · Crit ${Math.round(p.crit * 100)}% · Regen ${Number(p.regen.toFixed(2))}`, inner), tx, top + 63, { color: '#c0cbdc' });
    // The weapon line starts after the starting-stat caption.
    const wy = weaponY;
    ctx.drawImage(SPR[WEAPONS[h.weapon].icon].frames[0].c, tx, top + wy);
    weapons.forEach((line, i) => drawText(ctx, line, tx + 20, top + wy + 3 + i * 9, { color: '#fee761' }));
    targeting.forEach((line, i) => drawText(ctx, line, tx, top + descriptionY + i * 9, { color: '#ead4aa' }));
    weaponDesc.forEach((line, i) => drawText(ctx, line, tx, top + descriptionY + (targeting.length + i) * 9, { color: '#c0cbdc' }));
    perk.forEach((line, i) => drawText(ctx, line, tx, top + perkY + i * 9, { color: '#c0cbdc' }));
    drawText(ctx, fit(h.ultName.toUpperCase() + (ownedUltimate ? '' : ' · LOCKED'), inner), tx, top + ultimateY, { color: ownedUltimate ? '#f6757a' : '#b39aac' });
    ult.forEach((line, i) => drawText(ctx, line, tx, top + ultimateY + 11 + i * 9, { color: '#c0cbdc' }));
    notes.forEach((line, i) => drawText(ctx, line, tx, top + goalY + i * 9, { color: '#c28569' }));
    runs.forEach((line, i) => drawText(ctx, line, tx, top + goalY + (notes.length + i) * 9, { color: '#8b9bb4' }));
    ctx.restore();
    if (most) {
      const bh = Math.max(12, Math.round((height - 8) ** 2 / total));
      ctx.fillStyle = '#3a4466';ctx.fillRect(x + w - 4, y + 4 + Math.round((height - 8 - bh) * this.infoScroll / most), 1, bh);
      if (button(ctx, ui, 'hero_info_up', x + w - 18, y + 5, 14, 12, '↑', { pointer: false })) this.infoScroll = Math.max(0, this.infoScroll - 30);
      if (button(ctx, ui, 'hero_info_down', x + w - 18, y + height - 17, 14, 12, '↓', { pointer: false })) this.infoScroll = Math.min(most, this.infoScroll + 30);
    }
    this.infoContentHeight = total;
  }

  equipment(id) {
    const profile = this.app.store.profile, gear = profile.gear[id] || {};
    const lines = [{ text: `${HEROES[id].title}'s equipment · kept between runs`, color: '#fee761' }];
    for (const slot of SLOTS) {
      const it = gear[slot];
      lines.push({ text: it ? itemName(it) : `${SLOT_NAMES[slot]} · empty`, color: it ? RARITIES[it.rarity].color : '#8b9bb4' });
      if (it) lines.push(...itemLines(it));
    }
    const unlocked = transferUnlocked(profile);
    lines.splice(1, 0, unlocked
      ? 'Quartermaster earned. Transfer equipped gear to a recruit with a free slot for ten times its sale value.'
      : `Transfer locked. ${TRANSFER_ACHIEVEMENT}.`);
    lines.splice(1, 0, `${profile.gold} gold · Next identification: ${identificationCost(profile)} gold`, IDENTIFICATION_RULE, `Inventory: ${profile.stash.length}/${MAX_STASH}. Replaced equipment is stored here.`);
    const actions = [
      { id: 'inventory', label: 'INVENTORY / STASH' },
      { id: 'inspect', label: 'MANAGE WORN GEAR', disabled: !Object.keys(gear).length },
      { id: 'transfer', label: 'TRANSFER GEAR', disabled: !unlocked || !Object.keys(gear).length },
    ];
    this.gearDialog('Equipment', lines, actions, action => {
      if (action === 'transfer') this.transferSlots(id);
      else if (action === 'inventory') this.inventory(id);
      else if (action === 'inspect') this.inventory(id, 'gear');
    });
  }

  inventory(hero, source = 'stash', page = 0) {
    const profile = this.app.store.profile, gear = profile.gear[hero] || {};
    const items = source === 'stash' ? profile.stash.map((item, index) => ({ item, index })) : SLOTS.filter(slot => gear[slot]).map(slot => ({ item: gear[slot], slot }));
    const pages = Math.max(1, Math.ceil(items.length / 3));
    page = Math.min(page, pages - 1);
    const shown = items.slice(page * 3, page * 3 + 3);
    const lines = [`${HEROES[hero].title} · ${profile.gold} gold`, `Next identification: ${identificationCost(profile)} gold`, IDENTIFICATION_RULE];
    if (!items.length) lines.push('No items stored yet. Choose STASH after a run to keep a find.');
    shown.forEach(({ item }) => lines.push({ text: `${SLOT_NAMES[item.slot]} · ${itemName(item)}`, color: RARITIES[item.rarity].color }));
    const actions = shown.map((entry, i) => ({ id: String(i), label: `${SLOT_NAMES[entry.item.slot].toUpperCase()} · INSPECT`, color: RARITIES[entry.item.rarity].color }));
    if (pages > 1) actions.push({ id: 'page', label: `NEXT ITEMS · ${page + 1}/${pages}` });
    this.gearDialog(source === 'stash' ? `Inventory ${items.length}/${MAX_STASH}` : 'Worn equipment', lines, actions, action => {
      if (action === 'page') this.inventory(hero, source, (page + 1) % pages);
      else if (action === 'close') this.equipment(hero);
      else if (shown[Number(action)]) this.inspectOwned(hero, source, shown[Number(action)], page);
    });
  }

  inspectOwned(hero, source, entry, page, { revealed = false, error } = {}) {
    const profile = this.app.store.profile, { item } = entry, cost = identificationCost(profile);
    const accent = item.power || item.grant ? '#fee761' : '#63b8ff';
    const ordinary = Object.keys(item.base || {}).length + Number(!!item.weaponType);
    const effects = itemLines(item).map((text, i) => revealed && i >= ordinary ? { text, color: accent } : text);
    const lines = [{ text: itemName(item), color: RARITIES[item.rarity].color }, ...effects, `${profile.gold} gold · Sell value ${itemPrice(item)} gold`];
    if (!canEquipItem(item, hero)) lines.push('This weapon belongs to another fighting style.');
    if (!itemIdentified(item)) lines.splice(1, 0, IDENTIFICATION_RULE);
    if (error) lines.unshift({ text: error, color: '#f6757a' });
    const actions = [
      { id: 'identify', label: itemIdentified(item) ? 'IDENTIFIED' : `IDENTIFY · ${cost} GOLD`, disabled: itemIdentified(item) || profile.gold < cost, color: '#63b8ff' },
      source === 'stash' ? { id: 'equip', label: 'EQUIP', disabled: !canEquipItem(item, hero) } : { id: 'stash', label: 'MOVE TO INVENTORY', disabled: profile.stash.length >= MAX_STASH },
      { id: 'sell', label: `SELL · +${itemPrice(item)} GOLD`, color: '#feae34' },
      { id: 'compare', label: 'NEXT RUN STATS' },
    ];
    const decision = { hero, source, index: entry.index, slot: entry.slot, expected: item, expectedGearRev: gearRevision(profile, hero), expectedCost: cost };
    this.gearDialog(revealed ? 'Magic revealed' : 'Inspect item', lines, actions, async action => {
      if (action === 'close') return this.inventory(hero, source, page);
      const { store } = this.app;
      if (action === 'compare') {
        this.gearDialog(`Next run · ${HEROES[hero].title}`, gearPreview(store.profile, hero, item, source === 'gear'), [],
          () => this.inspectOwned(hero, source, entry, page, { revealed, error }));
        return;
      }
      this.inventorySaving = true;
      this.gearDialog('Saving inventory', ['Keeping your decision…'], []);
      const result = await store.manageInventory({ ...decision, action }).catch(() => ({ ok: false, error: 'Could not save. Try again.' }));
      this.inventorySaving = false;
      if (action === 'identify') {
        const current = source === 'stash' ? store.profile.stash[entry.index] : store.profile.gear[hero]?.[entry.slot];
        if (sameItem(current, { ...item, identified: true })) {
          this.preview = null;
          sfx(current.power || current.grant ? 'legendary' : 'reveal');
          return this.inspectOwned(hero, source, { ...entry, item: current }, page, { revealed: true });
        }
        if (!result.ok && sameItem(current, item)) return this.inspectOwned(hero, source, { ...entry, item: current }, page, { error: result.error });
      }
      if (result.ok) {
        this.preview = null;
        sfx(action === 'sell' ? 'coin' : 'pick');
        this.inventory(hero, source, page);
      } else this.gearDialog('Inventory unchanged', [result.error], [], () => this.inventory(hero, source, page));
    });
    if (revealed) this.app.ui.lock(0);
  }

  gearDialog(title, lines, actions, handle) {
    this.dialog = new MenuDialog(title, lines, actions);
    this.dialogAction = handle;
    this.app.ui.focus('detail_close');
    this.app.ui.lock(0.2);
  }

  transferSlots(from, page = 0) {
    const gear = this.app.store.profile.gear[from] || {};
    const slots = SLOTS.filter(slot => gear[slot]);
    if (!slots.length) return this.equipment(from);
    const pages = Math.ceil(slots.length / 3);
    const visible = slots.slice(page * 3, page * 3 + 3);
    const lines = [`Choose an equipped item from ${HEROES[from].title}.`];
    const actions = visible.map(slot => {
      const it = gear[slot], cost = itemPrice(it) * 10;
      lines.push(`${SLOT_NAMES[slot]} · ${itemName(it)} · ${cost} gold`);
      return { id: slot, label: SLOT_NAMES[slot].toUpperCase() };
    });
    if (pages > 1) actions.push({ id: 'page', label: `NEXT ITEMS · ${page + 1}/${pages}` });
    this.gearDialog('Transfer gear', lines, actions, action => {
      if (action === 'page') this.transferSlots(from, (page + 1) % pages);
      else if (action === 'close') this.equipment(from);
      else this.transferRecipients(from, action);
    });
  }

  transferRecipients(from, slot, page = 0) {
    const p = this.app.store.profile, it = p.gear[from]?.[slot];
    if (!it) return this.equipment(from);
    const heroes = HERO_ORDER.filter(id => id !== from && p.heroes.includes(id));
    const pages = Math.ceil(heroes.length / 3);
    const lines = [`${itemName(it)} · ${itemPrice(it) * 10} gold · You have ${p.gold} gold`];
    if (!heroes.length) lines.push('Recruit another hero to transfer this item.');
    const actions = heroes.slice(page * 3, page * 3 + 3).map(id => {
      const quote = transferQuote(p, from, id, slot);
      lines.push(`${HEROES[id].title} · ${quote.error || 'Eligible'}`);
      return { id, label: HEROES[id].title.toUpperCase(), disabled: !quote.ok };
    });
    if (pages > 1) actions.push({ id: 'page', label: `NEXT RECIPIENTS · ${page + 1}/${pages}` });
    this.gearDialog('Choose a recipient', lines, actions, action => {
      if (action === 'page') this.transferRecipients(from, slot, (page + 1) % pages);
      else if (action === 'close') this.transferSlots(from);
      else this.confirmTransfer(from, action, slot);
    });
  }

  confirmTransfer(from, to, slot) {
    const p = this.app.store.profile, quote = transferQuote(p, from, to, slot);
    if (!quote.ok) return this.transferRecipients(from, slot);
    const details = { from, to, slot, expected: quote.item, fromRev: gearRevision(p, from), toRev: gearRevision(p, to) };
    this.gearDialog('Confirm transfer', [
      `${itemName(quote.item)} · ${HEROES[from].title} → ${HEROES[to].title}`,
      `Pay ${quote.cost} gold. ${p.gold - quote.cost} gold will remain.`,
    ], [{ id: 'confirm', label: `TRANSFER · ${quote.cost} GOLD` }], async action => {
      if (action !== 'confirm') return this.transferRecipients(from, slot);
      this.gearDialog('Transferring', ['Checking the recipient and moving the item.'], [], null);
      const result = await this.app.store.transfer(details);
      const line = result.ok
        ? `${HEROES[to].title} received ${itemName(quote.item)}. ${quote.cost} gold paid.`
        : result.error;
      const lines = result.kept === false ? [line, 'This browser could not save the change.'] : [line];
      this.gearDialog(result.ok ? 'Transfer complete' : 'Transfer unavailable', lines, [], () => this.equipment(from));
    });
  }

  journey() {
    const p = this.app.store.profile;
    this.dialog = new MenuDialog('Your journey', [
      { text: goalText(nextGoal(p)), color: '#fee761' },
      `${p.heroes.length} of ${HERO_ORDER.length} heroes recruited. Survive the time listed on each recruit's card.`,
      // The Survival maps in the order they open (data/maps.js; 28 October 2026).
      `Win a night in Survival to open the next land: ${MAP_LADDER.map((m) => m.name.replace(/^The /, 'the ')).join(', ').replace(/, (?=[^,]*$)/, ', then ')}.`,
      'Survive the night with the Necromancer to open the Dungeon for the Knight.',
      'Clear the Dungeon with Knight, Ranger, Sorcerer, Shadow, then Necromancer to open Ranked. The other heroes may enter once the Dungeon opens.',
      'Ranked: endless runs, personal bests and rank titles.',
      'Weapons and relics unlock through milestones in the Codex. Permanent upgrades are bought in the Armory.',
    ]);
    this.app.ui.focus('detail_close');this.app.ui.lock(0.2);
  }
}
