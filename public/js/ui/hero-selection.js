import { input, padKey } from '../engine/input.js';
import { SPR, idleFrame } from '../engine/sprites.js';
import { sfx, playAfterJingle } from '../engine/audio.js';
import { clamp, fmtTime } from '../engine/util.js';
import { HEROES, HERO_ORDER, heroLook, startWeapons } from '../data/heroes.js';
import { WEAPONS } from '../data/weapons.js';
import { PROGRESS } from '../shared/progress.js';
import { MAP_LADDER } from '../data/maps.js';
import { nextHeroUnlock, nextGoal, openFor, HERO_UNLOCK_TIME } from '../shared/profile.js';
import { SLOTS, SLOT_NAMES, itemName, itemLines, RARITIES } from '../shared/items.js';
import { panel, button, dim, drawText, wrapText, textWidth, textCanvas } from './ui.js';
import { heroCrop, mix } from './scenes.js';
import { goalText, featStars } from './ladder.js';
import { flank } from './skin.js';
import { MenuDialog } from './menu-dialog.js';
import { HeroShowcase } from './hero-showcase.js';

export function heroSelectionLayout(W, H) {
  const width = Math.min(608, W - 24), x = Math.round((W - width) / 2);
  const cols = W >= 440 ? 9 : 5, rows = Math.ceil(HERO_ORDER.length / cols);
  const gap = 4, cardW = Math.floor((width - (cols - 1) * gap) / cols), cardH = 40;
  const top = 28 + rows * (cardH + gap) + 3;
  const stacked = W < 440, bottom = H - (stacked ? 54 : 34);
  const height = bottom - top;
  const stageW = Math.round(width * 0.38), stageH = Math.min(320, Math.max(110, height - 210));
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
      if (this.dialog.draw(ctx, ui, W, H, dt)) {
        this.dialog = null;ui.focus('h_' + this.lastHero);ui.lock(0.2);
      }
      return;
    }
    const L = this.layout = heroSelectionLayout(W, H);
    ui.begin(dt);
    const next = nextHeroUnlock(profile);
    for (const [i, id] of HERO_ORDER.entries()) {
      const h = heroLook(id, app.settings.skins), locked = !profile.heroes.includes(id);
      const x = L.x + i % L.cols * (L.cardW + L.gap), y = 28 + Math.floor(i / L.cols) * (L.cardH + L.gap);
      const activated = ui.item('h_' + id, x, y, L.cardW, L.cardH, { group: 'heroes', home: id === this.lastHero });
      if (ui.focused('h_' + id)) this.lastHero = id;
      if (activated && !locked) { app.choice.hero = id;ui.focus('hero_continue'); }
      const on = this.lastHero === id;
      panel(ctx, x, y, L.cardW, L.cardH, { rivets: false, fill: on ? '#292330' : '#14131f', trim: on ? ['#fee761', '#be4a2f'] : ['#3a4466', '#262b44'] });
      const spr = SPR[h.sprite], crop = heroCrop(spr), frame = idleFrame(spr, Math.floor(this.t * spr.idleRate));
      const portraitH = Math.min(23, crop.h);
      ctx.globalAlpha = locked ? 0.22 : 1;
      ctx.drawImage(frame.c, crop.x, crop.y, crop.w, portraitH, Math.round(x + (L.cardW - crop.w) / 2), y + 3, crop.w, portraitH);
      ctx.globalAlpha = 1;
      const label = locked ? id === next ? 'NEXT' : 'LOCKED' : h.short.toUpperCase();
      drawText(ctx, label, x + L.cardW / 2, y + L.cardH - 10, { align: 'center', color: on ? '#fee761' : locked ? '#687186' : '#c0cbdc' });
      // The next hero's card fills toward his five minutes with the hero before him: that hero's
      // longest run (profile bt, the review's C4, 28 October 2026), the real distance only. Between
      // the portrait (y + 26 at most) and the label.
      if (locked && id === next) {
        const k = clamp((profile.bt?.[HERO_ORDER[i - 1]] || 0) / HERO_UNLOCK_TIME, 0, 1), bw = L.cardW - 12;
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
    const weapons = wrapText(startWeapons(h).map(id => WEAPONS[id].name).join(' + '), inner - 20);
    const ownedUltimate = openFor(profile, h.id).ult;
    const weaponY = 70, perkY = weaponY + Math.max(16, weapons.length * 9) + 7;
    const ultimateY = perkY + perk.length * 9 + 10;
    const goalY = ultimateY + 13 + ult.length * 9 + 7;
    const next = nextHeroUnlock(profile), prev = HERO_ORDER[HERO_ORDER.indexOf(h.id) - 1];
    // Each hero's longest run on the clock, any mode (profile bt, the review's C4, 28 October 2026):
    // the next hero's note tells the one before him's, a hero of the save his own under the note.
    const longest = (hid) => profile.bt?.[hid] || 0;
    const prevRun = locked && h.id === next && longest(prev) ? ` Longest run with the ${HEROES[prev].title}: ${fmtTime(longest(prev))}.` : '';
    const note = locked ? (h.id === next ? `Survive ${HERO_UNLOCK_TIME / 60} minutes with the ${HEROES[prev].title} to recruit this hero.${prevRun}` : 'Recruit the earlier heroes to continue this path.') : !ownedUltimate ? `Unlock ${h.ultName}: survive ${fmtTime(PROGRESS.ultTime)} with this hero.` : goalText(nextGoal(profile));
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
    const gear = this.app.store.profile.gear[id] || {};
    const lines = [{ text: `${HEROES[id].title}'s equipment · kept between runs`, color: '#fee761' }];
    for (const slot of SLOTS) {
      const it = gear[slot];
      lines.push({ text: it ? itemName(it) : `${SLOT_NAMES[slot]} · empty`, color: it ? RARITIES[it.rarity].color : '#8b9bb4' });
      if (it) lines.push(...itemLines(it));
    }
    lines.push('Find equipment in crypts. Each hero keeps their own gear.'); // a crypt is on every map
    this.dialog = new MenuDialog('Equipment', lines);
    this.app.ui.focus('detail_close');this.app.ui.lock(0.2);
  }

  journey() {
    const p = this.app.store.profile;
    this.dialog = new MenuDialog('Your journey', [
      { text: goalText(nextGoal(p)), color: '#fee761' },
      `${p.heroes.length} of ${HERO_ORDER.length} heroes recruited. Survive 5 minutes with a hero to recruit the next.`,
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
