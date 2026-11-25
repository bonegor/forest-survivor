import { input, padKey } from '../engine/input.js';
import { SPR, idleFrame } from '../engine/sprites.js';
import { sfx, playAfterJingle } from '../engine/audio.js';
import { clamp, fmtTime } from '../engine/util.js';
import { GLYPH_H } from '../engine/font.js';
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
import { HeroShowcase, heroMenuScale } from './hero-showcase.js';
import { DEMO } from '../engine/build.js';
import { DEMO_HEROES, DEMO_DETAILS } from '../shared/demo.js';

const SHOWN_HEROES = DEMO ? DEMO_HEROES : HERO_ORDER;

const ROW_H = 34, ROW_STEP = 36, ROSTER_HEADER = 19;

export function heroSelectionLayout(W, H, count = SHOWN_HEROES.length) {
  const width = Math.min(620, W - (W < 400 ? 12 : 24)), x = Math.round((W - width) / 2);
  const rosterW = clamp(Math.round(width * .31), 78, 170);
  const right = x + rosterW + 6, rightW = width - rosterW - 6;
  const top = 30, twoFooters = width < 340;
  const bottom = H - (twoFooters ? 50 : 30);
  const stacked = rightW < 205;
  const stageW = stacked ? rightW : clamp(Math.round(rightW * .30), 82, 118);
  const stageH = Math.min(68, Math.round((bottom - top) * .34));
  const stage = { x: right, y: top + (stacked ? 41 : 0), w: stageW, h: stageH };
  const infoY = stage.y + stage.h + 5;
  return {
    x, width, stacked, stage,
    roster: { x, y: top, w: rosterW, h: Math.min(bottom - top, ROSTER_HEADER + count * ROW_STEP + 3) },
    header: { x: stacked ? right : right + stageW + 3, y: top, w: stacked ? rightW : rightW - stageW - 3, h: stacked ? 38 : stageH },
    info: { x: right, y: infoY, w: rightW, h: bottom - infoY },
    play: { x: twoFooters ? x : x + width - 148, y: H - (twoFooters ? 45 : 23), w: twoFooters ? width : 148, h: 17 },
  };
}

function heading(ctx, W) {
  const c = textCanvas('Choose your Hero', ['#fff6c2', '#fee761', '#feae34', '#f77622'], '#181425', '#0d0b14', 'heading');
  ctx.drawImage(c, Math.round((W - c.width) / 2), 7);
  flank(ctx, (W - c.width) / 2 - 4, (W + c.width) / 2 + 4, 16, Math.min(40, (W - c.width) / 2 - 12));
}

function fit(text, width, font = 'normal') {
  if (textWidth(text, font) <= width) return text;
  while (text.length && textWidth(text + '…', font) > width) text = text.slice(0, -1);
  return text + '…';
}

const FIELD_TARGETING = {
  eanasir: 'Whip seals a foe. Your next copper disc hits it 50% harder',
  knight: 'Slashes left or right, toward the side you face',
  archer: 'Fires along your last movement direction',
  mage: 'Fires at nearby foes and bursts on impact',
  rogue: 'Throws piercing blades at the nearest foe, even behind you',
  necromancer: 'Allies seek foes; moving leaves a poisonous trail',
  paladin: 'Prioritizes the strongest nearby foe',
  druid: 'Roots the nearest foe',
  berserker: 'Leaps at a foe ahead; chops nearby foes on landing',
  witchhunter: 'Prioritizes strong foes',
  footman: 'Cuts the first foe ahead; a shock hits the rank behind it',
  marksman: 'Aimed bolt splits sideways on its first impact',
  templar: 'Ward cuts passing foes. Step on its seal to ready your blade',
  trailblazer: 'Fires at a nearby foe and leaves a tripline',
  thornkeeper: 'Thorns converge inward around the nearest visible foe',
  wraith: 'Cuts in front and from the previous shade',
  gravebinder: 'Favors strong foes; nearby lesser foes empower the crow',
  arcanist: 'Sweeps a narrow arc at the nearest foe’s distance',
  praetorian: 'Face the target: the short slash hits a narrow lane ahead',
  seraph: 'Cleaves ahead and sweeps the flanks',
  boltguard: 'Aimed bolt strengthens through lesser foes; strong foes stop it',
  swordbearer: 'Walk steadily to charge a longer cut along your stride',
};

const PERK_COPY = {
  knight: 'Bulwark: +1 armor. All regeneration is doubled.',
  berserker: 'Bloodrage: up to +30% damage and +15% attack speed at low health; +15% speed.',
  witchhunter: 'Inquisition: +30% damage to bosses and elites, +10% crit.',
};

export class HeroScreen {
  enter(app, params = {}) {
    this.app = app;
    this.t = 0;
    const owned = SHOWN_HEROES.filter(id => app.store.profile.heroes.includes(id));
    this.lastHero = owned.includes(app.choice.hero) ? app.choice.hero : owned[0] || 'knight';
    this.rosterScroll = 0;
    this.rosterFocus = null;
    this.scrollFocus = null;
    this.rosterDrag = null;
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
    ui.begin(dt);
    const next = nextHeroUnlock(profile) || SHOWN_HEROES.find(id => !profile.heroes.includes(id));
    const roster = SHOWN_HEROES.filter(id => profile.heroes.includes(id));
    if (next && SHOWN_HEROES.includes(next)) roster.push(next);
    const L = this.layout = heroSelectionLayout(W, H, roster.length);
    this.drawRoster(ctx, ui, L.roster, roster, next);

    const id = this.lastHero, h = heroLook(id, app.settings.skins), locked = !profile.heroes.includes(id);
    if (!this.preview || this.preview.game.player.id !== id || this.preview.game.player.hero.sprite !== h.sprite) {
      this.preview = new HeroShowcase(id, profile, app.settings);
      this.infoScroll = 0;
    }
    this.preview.update(locked ? 0 : dt);
    const stage = L.stage;
    this.preview.draw(ctx, stage, locked, app.settings);
    if (ui.item('preview_attack', stage.x, stage.y, stage.w, stage.h, { disabled: locked })) this.preview.attack();
    if (ui.focused('preview_attack') && !locked) {
      const hint = input.device === 'pad' ? `${padKey('A')}: ATTACK` : input.device === 'touch' ? 'TAP TO ATTACK' : ui.focusSource === 'pointer' ? 'CLICK TO ATTACK' : 'ENTER: ATTACK';
      drawText(ctx, hint, stage.x + stage.w / 2, stage.y + stage.h - 10, { align: 'center', color: '#fee761' });
    }
    this.identity(ctx, h, L.header, locked);
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

  drawRoster(ctx, ui, box, ids, next) {
    const { x, y, w, h } = box;
    // The rows' window holds whole rows and the list comes to rest on whole rows, so no name or
    // portrait is ever cut through at the window's edge (a sliver of one reads as a glitch). What
    // the panel has left under the last row stays empty; the scrollbar runs its full length.
    const room = h - ROSTER_HEADER - 3, gap = ROW_STEP - ROW_H;
    const top = y + ROSTER_HEADER, height = room < ROW_H ? room : Math.floor((room + gap) / ROW_STEP) * ROW_STEP - gap;
    const most = Math.max(0, ids.length * ROW_STEP - gap - height);
    const m = input.mouse;
    const inside = m.x >= x && m.x < x + w && m.y >= top && m.y < top + room;
    const track = most > 0 && m.x >= x + w - 8;
    const thumb = Math.max(12, Math.round(room * height / (height + most)));
    let at = ids.findIndex(id => ui.focused('h_' + id));
    if (at >= 0 && ui.lockT <= 0) {
      const dir = Number(input.pressed('down')) - Number(input.pressed('up'));
      if (dir && ids[at + dir]) {
        ui.take('up', 'down');
        at += dir;
        ui.focusId = 'h_' + ids[at];
        ui.focusSource = 'keys';
        this.scrollFocus = null;
        sfx('ui');
      }
    }
    if (ui.focusId !== this.rosterFocus || this.rosterHeight !== height) {
      const index = at >= 0 ? at : ids.indexOf(this.lastHero);
      if (index >= 0) this.rosterScroll = clamp(this.rosterScroll, index * ROW_STEP + ROW_H - height, index * ROW_STEP);
    }
    this.rosterHeight = height;
    if (inside && m.wheel) this.rosterScroll += m.wheel * ROW_STEP;
    if (inside && most && m.down && !this.rosterDrag) {
      if (track) this.rosterScroll = clamp((m.y - top - thumb / 2) / (room - thumb), 0, 1) * most;
      this.rosterDrag = { y: m.y, scroll: this.rosterScroll, track, moved: track };
    }
    const drag = this.rosterDrag;
    if (drag) {
      const dy = m.y - drag.y;
      if (Math.abs(dy) > 3) drag.moved = true;
      if (drag.moved) this.rosterScroll = drag.scroll + dy * (drag.track ? most / (room - thumb) : -1);
      if (!m.down) {
        if (drag.moved) m.clicked = false;
        this.rosterDrag = null;
      }
    }
    // Only a drag holds the list between rows; let go, it settles on the nearest.
    const rest = this.rosterDrag?.moved ? this.rosterScroll : Math.round(this.rosterScroll / ROW_STEP) * ROW_STEP;
    this.rosterScroll = Math.round(clamp(rest, 0, most));

    panel(ctx, x, y, w, h, { rivets: false, fill: '#14131f', trim: ['#5a5465', '#262b44'] });
    const count = ids.length - Number(ids.includes(next));
    drawText(ctx, `${count} RECRUITED`, x + 7, y + 5, { color: '#c0cbdc' });
    const rowX = x + 3, rowW = w - (most ? 11 : 6);
    const first = Math.floor(this.rosterScroll / ROW_STEP);
    const end = Math.min(ids.length, Math.ceil((this.rosterScroll + height) / ROW_STEP));
    // Keep keyboard navigation in the viewport during a swipe or wheel scroll.
    // Moving focus for this purpose leaves the inspected hero in the preview.
    if (at >= 0 && (at * ROW_STEP + ROW_H <= this.rosterScroll || at * ROW_STEP >= this.rosterScroll + height)) {
      const visible = clamp(at, Math.ceil(this.rosterScroll / ROW_STEP), end - 1);
      this.scrollFocus = ui.focusId = 'h_' + ids[visible];
    }
    if (this.scrollFocus !== ui.focusId) this.scrollFocus = null;
    ctx.save();ctx.beginPath();ctx.rect(rowX, top, rowW, height);ctx.clip();
    for (let i = first; i < end; i++) {
      const id = ids[i], rowY = top + i * ROW_STEP - this.rosterScroll;
      const hitTop = Math.max(top, rowY), hitBottom = Math.min(top + height, rowY + ROW_H);
      if (hitBottom <= hitTop) continue;
      const activated = ui.item('h_' + id, rowX, hitTop, rowW, hitBottom - hitTop, {
        group: 'heroes', home: id === this.lastHero, noMouse: !!drag?.moved,
      });
      if (ui.focused('h_' + id)) {
        const pointed = !drag?.moved && m.moved && m.x >= rowX && m.x < rowX + rowW && m.y >= hitTop && m.y < hitBottom;
        if (activated || pointed) this.scrollFocus = null;
        if (!this.scrollFocus) this.lastHero = id;
      }
      if (activated && id !== next) {
        this.app.choice.hero = id;
        ui.focus('hero_continue');
      }
      this.rosterRow(ctx, rowX, rowY, rowW, id, id === next);
    }
    ctx.restore();
    if (most) {
      const pos = Math.round((room - thumb) * this.rosterScroll / most);
      ctx.fillStyle = '#282631';ctx.fillRect(x + w - 6, top, 3, room);
      ctx.fillStyle = '#a39378';ctx.fillRect(x + w - 6, top + pos, 3, thumb);
    }
    this.rosterFocus = ui.focusId;
  }

  rosterRow(ctx, x, y, w, id, locked) {
    const h = heroLook(id, this.app.settings.skins), selected = this.lastHero === id;
    ctx.fillStyle = selected ? '#302a31' : '#1b1924';
    ctx.fillRect(x, y, w, ROW_H);
    if (selected) { ctx.fillStyle = '#fee761';ctx.fillRect(x, y, 2, ROW_H); }
    const spr = SPR[h.sprite], crop = heroCrop(spr), frame = idleFrame(spr, Math.floor(this.t * SPR[h.pose].fps));
    const slot = Math.min(39, Math.floor(w * .36));
    // At the menus' whole scale (heroMenuScale) wherever he is no wider than his slot: a smaller
    // blit on the UI canvas drops whole rows and columns of the art. One taller than the row stands
    // in it from the head down, his feet cut by the row's own edge, as by a portrait's frame. Only
    // a slot too narrow for him (a phone held upright) still shrinks him, whole.
    const whole = heroMenuScale() / (spr.hires || 1);
    ctx.globalAlpha = locked ? .55 : 1;
    if (crop.w * whole <= slot + 1) {
      const dw = Math.round(crop.w * whole), dy = Math.max(1, Math.round((ROW_H - crop.h * whole) / 2));
      const rows = Math.min(crop.h, Math.floor((ROW_H - dy) / whole));
      ctx.drawImage(frame.c, crop.x, crop.y, crop.w, rows, x + Math.round((slot - dw) / 2) + 1, y + dy, dw, Math.round(rows * whole));
    } else {
      const scale = Math.min(whole, (slot - 4) / crop.w, (ROW_H - 4) / crop.h);
      const dw = Math.round(crop.w * scale), dh = Math.round(crop.h * scale);
      ctx.drawImage(frame.c, crop.x, crop.y, crop.w, crop.h, x + Math.round((slot - dw) / 2) + 1, y + Math.round((ROW_H - dh) / 2), dw, dh);
    }
    ctx.globalAlpha = 1;
    const tx = x + slot + 2, room = w - slot - 5;
    const label = textWidth(h.title) <= room ? h.title : h.short;
    const sub = locked ? (room >= textWidth('Next recruit') ? 'Next recruit' : 'Next') : h.name;
    const showSub = locked || textWidth(sub) <= room;
    drawText(ctx, fit(label, room), tx, y + (showSub ? 6 : 12), { color: selected ? '#fee761' : '#ead4aa' });
    if (showSub) drawText(ctx, sub, tx, y + 18, { color: locked ? '#e4a672' : '#8b9bb4' });
    if (locked && !h.unlock) {
      const previous = HERO_ORDER[HERO_ORDER.indexOf(id) - 1];
      const progress = clamp((this.app.store.profile.bt?.[previous] || 0) / heroUnlockTime(id), 0, 1);
      ctx.fillStyle = '#3d3540';ctx.fillRect(tx, y + 29, room, 2);
      ctx.fillStyle = '#feae34';ctx.fillRect(tx, y + 29, Math.round(room * progress), 2);
    }
  }

  identity(ctx, h, box, locked) {
    const { x, y, w, h: height } = box;
    panel(ctx, x, y, w, height, { rivets: false, fill: '#1c1923', trim: ['#59505b', '#262b44'] });
    const earned = locked ? [] : featStars(this.app.store.profile, h.id).filter(s => s[2]);
    const title = h.title.toUpperCase();
    const wrapStars = earned.length && textWidth(title) + earned.length * 7 + 20 > w;
    const top = y + Math.floor((height - (wrapStars ? 36 : 29)) / 2);
    drawText(ctx, fit(h.name, w - 16, 'heading'), x + 8, top, { font: 'heading', color: ['#fff6c2', '#fee761', '#feae34'] });
    drawText(ctx, fit(title, w - 16), x + 8, top + 17, { color: locked ? '#c28569' : '#c0cbdc' });
    const starsX = wrapStars ? x + 8 : x + w - 6 - earned.length * 7;
    earned.forEach(([, color], i) => drawText(ctx, '★', starsX + i * 7, top + (wrapStars ? 27 : 17), { color }));
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
    const next = nextHeroUnlock(profile), prev = HERO_ORDER[HERO_ORDER.indexOf(h.id) - 1];
    // Each hero's longest run on the clock, any mode (profile bt, the review's C4, 28 October 2026):
    // the next hero's note tells the one before him's, a hero of the save his own under the note.
    const longest = (hid) => profile.bt?.[hid] || 0;
    const prevRun = locked && h.id === next && longest(prev) ? ` Longest run with the ${HEROES[prev].title}: ${fmtTime(longest(prev))}.` : '';
    const note = locked ? h.unlock || `Survive ${heroUnlockTime(h.id) / 60} minutes with the ${HEROES[prev].title} to recruit this hero.${prevRun}` : !ownedUltimate ? `Survive ${fmtTime(PROGRESS.ultTime)} with this hero to use ${h.ultName} next run.` : goalText(nextGoal(profile));
    const notes = wrapText(note, inner);
    const runs = !locked && longest(h.id) ? wrapText(`Longest run with this hero: ${fmtTime(longest(h.id))}`, inner) : [];
    const statsY = locked ? notes.length * 9 + 20 : 0;
    const cols = inner < 165 ? 2 : 4;
    const rates = wrapText(`Attack ${Math.round(100 / p.cooldown)}% · Crit ${Math.round(p.crit * 100)}% · Regen ${Number(p.regen.toFixed(2))}`, inner);
    const ratesY = statsY + 14 + (4 / cols) * 28;
    const weaponY = ratesY + rates.length * 9 + 7;
    const descriptionY = weaponY + Math.max(16, weapons.length * 9) + 4;
    const perkY = descriptionY + (targeting.length + weaponDesc.length) * 9 + 6;
    const ultimateY = perkY + perk.length * 9 + 10;
    const goalY = ultimateY + 13 + ult.length * 9 + 7;
    const total = goalY + (locked ? 0 : notes.length + runs.length) * 9 + 8;
    const most = Math.max(0, total - (height - 12));
    const mouse = input.mouse;
    if (mouse.x >= x && mouse.x < x + w && mouse.y >= y && mouse.y < y + height) this.infoScroll += Math.sign(mouse.wheel || 0) * 27;
    this.infoScroll = clamp(this.infoScroll, 0, most);
    panel(ctx, x, y, w, height, { rivets: false, fill: '#14131f', trim: ['#3a4466', '#262b44'] });
    ctx.save();ctx.beginPath();ctx.rect(x + 4, y + 4, w - 8, height - 8);ctx.clip();
    // Only whole lines, stat boxes and icons show in the window: one cut through its middle at
    // the edge reads as a glitch, and the arrows and the scrollbar already tell there is more.
    const shown = (sy, sh) => sy >= y + 4 && sy + sh <= y + height - 4;
    const text = (str, sx, sy, o) => { if (shown(sy, GLYPH_H)) drawText(ctx, str, sx, sy, o); };
    const top = y + 7 - this.infoScroll;
    if (locked) {
      text('NEXT RECRUIT', tx, top, { color: '#feae34' });
      notes.forEach((line, i) => text(line, tx, top + 12 + i * 9, { color: '#ead4aa' }));
    }
    text(locked ? 'STARTING STATS' : 'EQUIPPED STATS', tx, top + statsY, { color: '#8b9bb4' });
    const stats = [['HEALTH', p.maxHp], ['ARMOR', p.armor], ['DAMAGE', `${Math.round(p.might * 100)}%`], ['SPEED', `${Math.round(p.speedMul * 100)}%`]];
    const sw = Math.floor((inner - 3 * (cols - 1)) / cols);
    stats.forEach(([label, value], i) => {
      const sx = tx + i % cols * (sw + 3), sy = top + statsY + 13 + Math.floor(i / cols) * 28;
      if (!shown(sy, 25)) return;
      ctx.fillStyle = '#201e2b';ctx.fillRect(sx, sy, sw, 25);
      drawText(ctx, label, sx + 4, sy + 3, { color: '#8b9bb4' });
      drawText(ctx, String(value), sx + 4, sy + 14, { color: '#ead4aa' });
      ctx.fillStyle = mix(h.color, '#3a4466', 0.55);ctx.fillRect(sx, sy + 24, sw, 1);
    });
    rates.forEach((line, i) => text(line, tx, top + ratesY + i * 9, { color: '#c0cbdc' }));
    // The weapon line starts after the starting-stat caption.
    const wy = weaponY, icon = SPR[WEAPONS[h.weapon].icon].frames[0].c;
    if (shown(top + wy, icon.height)) ctx.drawImage(icon, tx, top + wy);
    weapons.forEach((line, i) => text(line, tx + 20, top + wy + 3 + i * 9, { color: '#fee761' }));
    targeting.forEach((line, i) => text(line, tx, top + descriptionY + i * 9, { color: '#ead4aa' }));
    weaponDesc.forEach((line, i) => text(line, tx, top + descriptionY + (targeting.length + i) * 9, { color: '#c0cbdc' }));
    perk.forEach((line, i) => text(line, tx, top + perkY + i * 9, { color: '#c0cbdc' }));
    text(fit(h.ultName.toUpperCase() + (ownedUltimate ? '' : ' · LOCKED'), inner), tx, top + ultimateY, { color: ownedUltimate ? '#f6757a' : '#b39aac' });
    ult.forEach((line, i) => text(line, tx, top + ultimateY + 11 + i * 9, { color: '#c0cbdc' }));
    if (!locked) notes.forEach((line, i) => text(line, tx, top + goalY + i * 9, { color: '#c28569' }));
    runs.forEach((line, i) => text(line, tx, top + goalY + (notes.length + i) * 9, { color: '#8b9bb4' }));
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
      // Held open until the answer comes, as an inventory save is: dismissed mid-request, its result
      // popped up later, perhaps once a run had begun with the gear as it was.
      this.inventorySaving = true;
      this.gearDialog('Transferring', ['Checking the recipient and moving the item.'], [], null);
      const result = await this.app.store.transfer(details).catch(() => ({ ok: false, error: 'Could not save. Try again.' }));
      this.inventorySaving = false;
      const line = result.ok
        ? `${HEROES[to].title} received ${itemName(quote.item)}. ${quote.cost} gold paid.`
        : result.error;
      const lines = result.kept === false ? [line, 'This browser could not save the change.'] : [line];
      this.gearDialog(result.ok ? 'Transfer complete' : 'Transfer unavailable', lines, [], () => this.equipment(from));
    });
  }

  journey() {
    const p = this.app.store.profile;
    this.dialog = new MenuDialog(DEMO ? 'Your demo adventure' : 'Your journey', DEMO ? [
      { text: goalText(nextGoal(p)), color: '#fee761' },
      ...DEMO_DETAILS,
    ] : [
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
