// Menu screens: title, hero select, trial select, armory, records, options.

import { input } from '../engine/input.js';
import { sfx, playMusic, setVolumes, initAudio } from '../engine/audio.js';
import { SPR, walkFrame } from '../engine/sprites.js';
import { saveSettings, DEBUG } from '../engine/storage.js';
import { presentBackdrop } from '../engine/view.js';
import { fmtTime, fmtNum, clamp } from '../engine/util.js';
import { HEROES, HERO_ORDER, HERO_LINE, startWeapons, heroLook } from '../data/heroes.js';
import { rimRing, silhouette, hexPack } from '../engine/pixels.js';
import { trialScene, SCENE, heroCrop, portraitBackdrop, pixelEllipse, mix, PORTRAIT } from './scenes.js';
import { WEAPONS } from '../data/weapons.js';
import { MODES, NORMAL, VETERAN, ELITE, NIGHTMARE } from '../data/difficulty.js';
import { UPGRADES, upgradeCost, upgradeOpen, totalWins, HERO_UNLOCK_TIME, nextHeroUnlock, nextGoal, canPlay, rankTitle, modeUnlocked } from '../shared/profile.js';
import { PASSIVES } from '../data/passives.js';
import { PROGRESS, needText } from '../shared/progress.js';
import { panel, button, stepper, checkbox, checkboxWidth, logo, dim, drawText, wrapText, textWidth, textCanvas } from './ui.js';
import { goalText, lockReason, featStars, codexEntries, codexName, codexRecord, codexIcon } from './ladder.js';
import { flank } from './skin.js';
import { MenuDialog } from './menu-dialog.js';
import { codexSummary, codexDescription, evolutionRecipe, shortNeed, HERO_SUMMARY } from './menu-copy.js';
import { openFor, metaBonuses, exclusionState } from '../shared/profile.js';
import { SLOTS, SLOT_NAMES, itemName, itemLines, RARITIES } from '../shared/items.js';

const UP_ICONS = {
  might: 'i_might', armor: 'i_armor', vitality: 'i_vitality', recovery: 'i_regen', haste: 'i_cooldown', reach: 'i_area',
  swiftness: 'i_movespeed', magnet: 'i_magnet', fortune: 'i_luck', wisdom: 'i_growth', greed: 'i_greed', reroll: 'i_reroll', revival: 'i_revival',
  banish: 'i_reroll', // placeholder (tools/handoff-art.md): Insight's, the other level-up card tool
  endurance: 'i_duration', velocity: 'i_projspeed', echo: 'i_amount',
  // The slots of 21 October 2026 (shared/progress.js); an axe and a clover stand in until they are
  // drawn (art/fallbacks.js).
  arsenal: 'i_arsenal', reliquary: 'i_reliquary',
  phoenix: 'i_revival', // the relic's own placeholder (data/passives.js)
};

function goldTag(ctx, app, x, y, align = 'right') {
  const g = fmtNum(app.store.profile.gold);
  const w = textWidth(g) + 12;
  const left = align === 'right' ? x - w : x;
  ctx.drawImage(SPR.h_coin.frames[0].c, left, y);
  drawText(ctx, g, left + 10, y + 1, { color: ['#fff3a8', '#fee761', '#feae34'] });
}

// A screen's title: Jacquard 12 between Kenney's dividers. Mixed case.
function header(ctx, W, title, y = 4) {
  const c = textCanvas(title, ['#fff6c2', '#fee761', '#feae34', '#f77622'], '#181425', '#0d0b14', 'heading');
  const hw = c.width / 2;
  ctx.drawImage(c, Math.round(W / 2 - hw), y + 3);
  flank(ctx, W / 2 - hw - 4, W / 2 + hw + 4, y + 12, Math.min(48, W / 2 - hw - 10));
}

// The keys a menu answers to, along its foot beside BACK (the owner's, 23 October 2026: the menus
// should "respect left, right, up, down" and Enter): the arrows move, and in a row of choices pick
// one; Enter takes it; Escape goes back. Not on a touch screen, nor where it would reach BACK.
function keysHint(ctx, W, H, text = 'ARROWS move · ENTER select · ESC back') {
  if (input.device === 'touch') return;
  if (input.device === 'pad') text = text.replace('ARROWS', 'D-PAD').replace('ENTER', 'A').replace('ESC', 'B');
  if (textWidth(text) > W - 2 * 76) return;
  drawText(ctx, text, W / 2, H - 16, { align: 'center', color: '#5a6988', outline: null });
}

// ------------------------------------------------------------------ title --

export class TitleScreen {
  enter(app) {
    this.app = app;
    this.t = 0;
    this.ready = app.audioUnlocked;
    if (this.ready) playMusic('title');
    app.ui.lock(0.3);
  }

  draw(ctx, W, H, dt) {
    const app = this.app, ui = app.ui;
    this.t += dt;
    app.scene.draw(ctx, W, H, dt);
    // The campfire scene goes out first, behind the logo and menu.
    presentBackdrop();
    // The title in Jacquard 24, at twice its size only on a screen with room to spare; on narrow
    // (portrait) screens it stacks onto two lines.
    const narrow = logo('Forest Survivor', undefined, undefined, 'title').width > W - 12;
    const L = narrow ? logo('Survivor', undefined, undefined, 'title') : logo('Forest Survivor', undefined, undefined, 'title');
    const scale = L.width * 2 < W * 0.7 ? 2 : 1;
    const lw = L.width * scale, lh = L.height * scale;
    let ly = Math.round(H * 0.07 + Math.sin(this.t * 1.5) * 1.5);
    if (narrow) {
      const top = logo('Forest', undefined, undefined, 'title');
      ctx.drawImage(top, Math.round(W / 2 - (top.width * scale) / 2), ly, top.width * scale, top.height * scale);
      ly += top.height * scale - 8 * scale;
    }
    // Ember glow behind the logo.
    const gl = ctx.createRadialGradient(W / 2, ly + lh / 2, 4, W / 2, ly + lh / 2, lw * 0.6);
    gl.addColorStop(0, 'rgba(247,118,34,0.22)');
    gl.addColorStop(1, 'rgba(247,118,34,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(L, Math.round(W / 2 - lw / 2), ly, Math.round(lw), Math.round(lh));
    // The motto in the small gothic, between dividers. Jacquard's descenders leave room below
    // the logo's ink, so it tucks up into it.
    const motto = 'Survive the Night · Delve the Depths', my = ly + lh - 5 * scale, mw = textWidth(motto, 'gothic');
    drawText(ctx, motto, W / 2, my, { align: 'center', color: ['#ead4aa', '#ead4aa', '#c28569'], font: 'gothic' });
    flank(ctx, W / 2 - mw / 2 - 5, W / 2 + mw / 2 + 5, my + 6, Math.min(40, W / 2 - mw / 2 - 12), '#b86f50');

    if (!this.ready) {
      if (Math.floor(this.t * 2) % 2 === 0) drawText(ctx, input.device === 'touch' ? 'TAP TO BEGIN' : 'PRESS ANY KEY', W / 2, Math.round(H * 0.62), { align: 'center', color: ['#ffffff', '#fee761', '#feae34'] });
      if (input.anyKey || input.mouse.clicked) {
        initAudio();
        app.audioUnlocked = true;
        this.ready = true;
        playMusic('title');
        sfx('select');
        ui.lock(0.25);
      }
      return;
    }

    if (app.store.offline) {
      this.drawOffline(ctx, W, H, dt, ly + lh + 16);
      return;
    }
    if (app.store.unreadable) {
      this.drawUnreadable(ctx, W, H, dt, ly + lh + 16);
      return;
    }

    // No Continue: a run is never saved to come back to, only its results when it ends.
    ui.begin(dt);
    const items = [['play', 'START RUN'], ['armory', 'UPGRADES'], ['codex', 'CODEX'], ['records', 'RECORDS'], ['options', 'OPTIONS']];
    const bw = 104, bh = 15, gap = 4;
    let y = Math.round(Math.max(my + 20, H * 0.5 - (items.length * (bh + gap)) / 2 + 6));
    // A pool of shadow under the buttons, so the trees behind don't fight them.
    const mh = items.length * (bh + gap), cy = y + mh / 2;
    const well = ctx.createRadialGradient(W / 2, cy, 8, W / 2, cy, bw);
    well.addColorStop(0, 'rgba(13,11,20,0.55)');
    well.addColorStop(1, 'rgba(13,11,20,0)');
    ctx.fillStyle = well;
    ctx.fillRect(W / 2 - bw, cy - bw, bw * 2, bw * 2);
    for (const [id, label] of items) {
      if (button(ctx, ui, id, Math.round(W / 2 - bw / 2), y, bw, bh, label)) this.pick(id);
      y += bh + gap;
    }
    const goal = nextGoal(app.store.profile);
    if (goal && y + 25 < H - 40) {
      wrapText(goalText(goal), Math.min(320, W - 32)).forEach((line, i) => drawText(ctx, line, W / 2, y + 7 + i * 10, { align: 'center', color: '#c0cbdc' }));
    }
    ui.end();
    // Footer.
    const p = app.store.profile;
    goldTag(ctx, app, 6, H - 13, 'left');
    const wins = totalWins(p);
    ctx.drawImage(SPR.h_trophy.frames[0].c, W - 14 - textWidth(String(wins)), H - 13);
    drawText(ctx, String(wins), W - 5, H - 12, { align: 'right', color: '#fee761' });
    if (DEBUG) drawText(ctx, 'Debug: everything unlocked, saved apart from your own progress', W / 2, H - 12, { align: 'center', color: '#feae34' });
    else drawText(ctx, 'Progress saved automatically after each run', W / 2, H - 12, { align: 'center', color: '#8b9bb4', outline: null });
  }

  // A save exists but can't be read: say so and offer a clean start instead of
  // silently resetting. The old cookie is only replaced once the player agrees.
  drawUnreadable(ctx, W, H, dt, top) {
    const app = this.app, ui = app.ui;
    const pw = Math.min(236, W - 16);
    const lines = ['Your saved progress could not be read.', 'The save may be damaged, or the game server\'s key has changed. It cannot be recovered.'];
    const wrapped = [];
    for (const l of lines) wrapped.push(...wrapText(l, pw - 16), '');
    wrapped.pop();
    const ph = 34 + wrapped.length * 9;
    const x = Math.round(W / 2 - pw / 2), y = Math.round(Math.min(Math.max(top + 8, H * 0.5 - ph / 2), H - ph - 18));
    panel(ctx, x, y, pw, ph, { title: 'SAVE UNREADABLE' });
    let ty = y + 11;
    for (const l of wrapped) {
      if (l) drawText(ctx, l, W / 2, ty, { align: 'center', color: ty === y + 11 ? '#fee761' : '#c0cbdc' });
      ty += 9;
    }
    ui.begin(dt);
    if (!this.freshFocus) {
      ui.focus('fresh');
      this.freshFocus = true;
    }
    const bw = 124;
    if (button(ctx, ui, 'fresh', Math.round(W / 2 - bw / 2), y + ph - 20, bw, 13, 'START A NEW ADVENTURE')) {
      sfx('select');
      app.store.startFresh().catch(() => {});
      ui.focus('play');
      ui.lock(0.25);
    }
    ui.end();
  }

  // The game's server didn't answer at startup: say so, rather than play on with a save
  // that would never reach it.
  drawOffline(ctx, W, H, dt, top) {
    const app = this.app, ui = app.ui;
    const pw = Math.min(236, W - 16);
    const wrapped = wrapText('The game server can\'t be reached, so your progress can\'t be loaded or saved. Check that it is running, then try again.', pw - 16);
    const ph = 34 + wrapped.length * 9;
    const x = Math.round(W / 2 - pw / 2), y = Math.round(Math.min(Math.max(top + 8, H * 0.5 - ph / 2), H - ph - 18));
    panel(ctx, x, y, pw, ph, { title: 'SERVER UNREACHABLE' });
    let ty = y + 11;
    for (const l of wrapped) {
      drawText(ctx, l, W / 2, ty, { align: 'center', color: '#c0cbdc' });
      ty += 9;
    }
    ui.begin(dt);
    if (!this.retryFocus) {
      ui.focus('retry');
      this.retryFocus = true;
    }
    const bw = 124;
    if (button(ctx, ui, 'retry', Math.round(W / 2 - bw / 2), y + ph - 20, bw, 13, this.retrying ? 'TRYING…' : 'TRY AGAIN') && !this.retrying) {
      sfx('select');
      this.retrying = true;
      app.store.init().finally(() => {
        this.retrying = false;
        ui.focus('play');
        ui.lock(0.25);
      });
    }
    ui.end();
  }

  pick(id) {
    const app = this.app;
    if (id === 'play') app.go('hero');
    else if (id === 'armory') app.go('armory');
    else if (id === 'codex') app.go('codex');
    else if (id === 'records') app.go('records');
    else if (id === 'options') app.go('options', { back: 'title' });
  }
}

// ------------------------------------------------------------------- hero --

// A hero's light line round a frame drawn at (dx, dy) at scale s, for a hero with one (the Shadow,
// heroes.js line): one faint pixel. None in play (game.js HERO_MARK).
function heroLine(ctx, h, fr, dx, dy, s, a) {
  if (!h.line) return;
  ctx.globalAlpha = a;
  ctx.drawImage(fr.variant(`heroline${HERO_LINE}:1`, (b) => rimRing(b, HERO_LINE, 1)), dx - s, dy - s, (fr.w + 2) * s, (fr.h + 2) * s);
  ctx.globalAlpha = 1;
}

// The hero screen's cards and portrait draw every hero at one whole-number scale, from the largest
// crop of any hero's idle frames (heroCrop), so they all stand alike.
function heroesCrop() {
  const crops = HERO_ORDER.map((id) => heroCrop(SPR[HEROES[id].sprite]));
  return { w: Math.max(...crops.map((c) => c.w)), h: Math.max(...crops.map((c) => c.h)) };
}

// The cards' one scale for a card cw x ch: the hero with room at the sides and his name under him.
export const cardScale = (cw, ch) => {
  const c = heroesCrop();
  return Math.max(1, Math.min(3, Math.floor((cw - 8) / c.w), Math.floor((ch - 18) / c.h)));
};

// The portrait frame's scale for a frame fh tall and at most maxW wide, and where his feet stand
// in it (foot, from its top): over the floor, under the glow.
export function portraitFit(fh, maxW) {
  const c = heroesCrop();
  const floorH = Math.max(4, Math.round(fh * PORTRAIT.floor)), foot = fh - Math.round(floorH * 0.55);
  return { s: Math.max(1, Math.min(6, Math.floor((foot - 6) / c.h), Math.floor((maxW - 12) / c.w))), foot };
}

// The hero screen's cards: as many in a row as fit HERO_CARD.min wide or wider (at most
// HERO_CARD.max), all nine in one row where they fit (a desktop), else in rows of as many as fit (a
// phone held upright: five and four); the rows kept short enough on a low screen to leave the
// detail panel under them room. A screen too low for rows even HERO_CARD.low tall (a 1366 x 768
// laptop) keeps all in one row, down to HERO_CARD.tight wide, rather than crush the panel.
export const HERO_CARD = { min: 44, tight: 38, max: 64, h: 66, low: 56, gap: 4 };
export function heroCards(W, H, n) {
  const C = HERO_CARD, wide = (k) => Math.min(C.max, Math.floor((W - 30) / k) - C.gap);
  const room = (rows) => Math.floor((H - 32 - 26 - 100 - 8 - C.gap * (rows - 1)) / rows);
  let cols = n;
  while (cols > 1 && wide(cols) < C.min) cols--;
  let rows = Math.ceil(n / cols);
  if (rows > 1 && room(rows) < C.low && wide(n) >= C.tight) rows = 1;
  cols = Math.ceil(n / rows);
  return { cols, rows, cw: wide(cols), ch: rows > 1 ? Math.max(C.low, Math.min(C.h, room(rows))) : C.h };
}

export class HeroScreen {
  enter(app) {
    this.app = app;
    this.t = 0;
    app.ui.lock(0.2);
    app.ui.focusId = 'h_' + (app.choice.hero || 'knight');
  }

  draw(ctx, W, H, dt) {
    const app = this.app, ui = app.ui;
    this.t += dt;
    app.scene.draw(ctx, W, H, dt, { campfire: false });
    dim(ctx, W, H, 0.45);
    header(ctx, W, 'Choose your Hero');
    if (this.dialog) {
      if (this.dialog.draw(ctx, ui, W, H, dt)) { this.dialog = null; ui.focus('h_' + this.lastHero); ui.lock(0.2); }
      return;
    }
    goldTag(ctx, app, W - 6, 9);
    ui.begin(dt);
    const prof = app.store.profile;
    const next = nextHeroUnlock(prof);
    const { cols, cw, ch } = heroCards(W, H, HERO_ORDER.length), gap = HERO_CARD.gap;
    const cs = cardScale(cw, ch); // every hero at one scale
    const y0 = 32;
    let x = 0, y = y0;
    let focusHero = null;
    HERO_ORDER.forEach((id, i) => {
      // Row by row, each row centred (the last may be shorter).
      if (i % cols === 0) {
        const k = Math.min(cols, HERO_ORDER.length - i);
        x = Math.round(W / 2 - (k * cw + (k - 1) * gap) / 2);
        y = y0 + (i / cols) * (ch + gap);
      }
      const h = heroLook(id, app.settings.skins);
      const locked = !prof.heroes.includes(id);
      const fid = 'h_' + id;
      // A locked hero can't be bought: five minutes with the one before bring them in. Up from below
      // comes back to the hero shown in the panel.
      if (ui.item(fid, x, y, cw, ch, { group: 'heroes', home: id === (this.lastHero || app.choice.hero) }) && !locked) {
        app.choice.hero = id;
        this.lastHero = id;
        ui.focus('hero_continue');
      }
      const f = ui.focused(fid);
      if (f) focusHero = id;
      panel(ctx, x, y, cw, ch, { trim: f ? ['#fee761', '#be4a2f'] : ['#5a6988', '#3a4466'], rivets: f });
      const spr = SPR[h.sprite];
      const fr = spr && (f && !locked ? walkFrame(spr, Math.floor(this.t * 6 * spr.motionRate)) : spr.frames[0]);
      if (fr) {
        const img = locked ? fr.variant('shadow', (b) => ({ ...b, d: b.d.map((c) => (c >>> 24 ? 0xff1b141d : 0)) })) : fr.c;
        // At the cards' one scale, every hero standing on the same line just above the name, centred
        // on what he covers.
        const crop = heroCrop(spr);
        const dx = Math.round(x + cw / 2 - (crop.x + crop.w / 2) * cs), dy = y + ch - 14 - (spr.anchorY + 1) * cs;
        ctx.drawImage(img, dx, dy, img.width * cs, img.height * cs);
        if (!locked) heroLine(ctx, h, fr, dx, dy, cs, f ? 0.7 : 0.45);
      }
      if (locked) {
        // The next one shows what it takes; the rest wait their turn.
        drawText(ctx, id === next ? `${HERO_UNLOCK_TIME / 60} MIN` : 'LOCKED', x + cw / 2, y + ch - 12, { align: 'center', color: id === next ? '#feae34' : '#5a6988' });
      } else {
        // The title, or its short form where the card is too narrow for it (labels never run together).
        const label = textWidth(h.title.toUpperCase()) <= cw - 8 ? h.title.toUpperCase() : h.short.toUpperCase();
        drawText(ctx, label, x + cw / 2, y + ch - 12, { align: 'center', color: f ? '#fee761' : '#c0cbdc' });
        // Achievement stars: night survived, Dungeon beaten.
        let sx = x + cw - 8;
        for (const [, col, got] of featStars(prof, id).reverse()) {
          if (got) drawText(ctx, '★', sx, y + 4, { color: col });
          sx -= 7;
        }
      }
      x += cw + gap;
    });
    // The hero last focused stays in the panel while its LOOK button is (detail).
    focusHero = focusHero || this.lastHero || 'knight';
    this.lastHero = focusHero;
    // Clear of the cards: the panel's name plate stands 8 px over its top edge.
    const bottom = this.detail(ctx, W, H, focusHero, y + ch + 14, !prof.heroes.includes(focusHero));
    let gy = bottom + 6;
    for (const line of wrapText('NEXT: ' + goalText(nextGoal(prof)), W - 24)) {
      if (gy > H - 56) break;
      drawText(ctx, line, W / 2, gy, { align: 'center', color: '#feae34' });
      gy += 9;
    }
    if (button(ctx, ui, 'back', 8, H - 20, 44, 13, 'BACK', { fallback: true })) app.go('title');
    const owned = prof.heroes.includes(focusHero);
    if (button(ctx, ui, 'equipment', 58, H - 20, 54, 13, 'GEAR', { disabled: !owned })) {
      const gear = prof.gear[focusHero] || {};
      const lines = [{ text: `${HEROES[focusHero].title}'s equipment · kept between runs`, color: '#fee761' }];
      for (const slot of SLOTS) {
        const it = gear[slot];
        lines.push({ text: it ? itemName(it) : `${SLOT_NAMES[slot]} · empty`, color: it ? RARITIES[it.rarity].color : '#8b9bb4' });
        if (it) lines.push(...itemLines(it));
      }
      lines.push('Find equipment in forest crypts. Each hero keeps their own gear.');
      this.dialog = new MenuDialog('Equipment', lines);ui.focus('detail_close');ui.lock(0.2);
    }
    if (button(ctx, ui, 'journey', 118, H - 20, 68, 13, 'JOURNEY')) {
      this.dialog = new MenuDialog('Your journey', [
        { text: goalText(nextGoal(prof)), color: '#fee761' },
        `${prof.heroes.length}/${HERO_ORDER.length} heroes recruited. Survive 5 minutes with a hero to recruit the next.`,
        'Survive the night with the Necromancer to open the Dungeon for the Knight.',
        'Clear the Dungeon with Knight, Ranger, Sorcerer, Shadow, then Necromancer to open Ranked. The other heroes may enter once the Dungeon opens.',
        'Ranked: endless runs, personal bests and rank titles.',
        'Weapons and relics unlock through milestones in the Codex. Permanent upgrades are bought in the Armory.',
      ]);ui.focus('detail_close');ui.lock(0.2);
    }
    if (button(ctx, ui, 'abilities', 192, H - 20, 80, 13, 'ABILITIES')) {
      const h = HEROES[focusHero], ult = openFor(prof, focusHero).ult;
      this.dialog = new MenuDialog(h.title, [h.perk, `Starts with ${startWeapons(h).map(id => WEAPONS[id].name).join(' + ')}`, { text: h.ultName, color: '#fee761' }, h.ultDesc, ult ? 'Ultimate unlocked' : `Unlock: survive ${fmtTime(PROGRESS.ultTime)} with this hero`]);ui.focus('detail_close');ui.lock(0.2);
    }
    const playY = Math.min(H - 43, Math.max(bottom + 34, gy + 8));
    if (button(ctx, ui, 'hero_continue', Math.round(W / 2 - 70), playY, 140, 16, owned ? `PLAY ${HEROES[focusHero].title.toUpperCase()}` : 'HERO LOCKED', { disabled: !owned, color: '#fee761' })) {
      app.choice.hero = focusHero;app.go('mode');
    }
    ui.end();
    if (input.pressed('back') && ui.lockT <= 0) app.go('title');
  }

  // The portrait frame: every hero's own sprite (the Knight's painted portrait gave way to it, so
  // they all match) at one whole-number scale for all of them, in a box: a glow in his colour, a
  // floor, his shadow, a rim light from the top left and his light line where he has one (the
  // Shadow). Returns the frame's width.
  portrait(ctx, h, fx, fy, fh, maxW, locked) {
    const { s, foot } = portraitFit(fh, maxW), footY = fy + foot;
    const fw = Math.max(90, heroesCrop().w * s + 2 * Math.max(8, 3 * s));
    const spr = SPR[h.sprite], crop = heroCrop(spr);
    const fr = crop.list[Math.floor(this.t * (SPR[h.pose]?.fps || 6)) % crop.list.length];
    ctx.fillStyle = '#0d0b14';
    ctx.fillRect(fx - 2, fy - 2, fw + 4, fh + 4);
    ctx.fillStyle = locked ? '#3a4466' : mix(h.color, '#c0cbdc', 0.25);
    ctx.fillRect(fx - 1, fy - 1, fw + 2, fh + 2);
    ctx.drawImage(portraitBackdrop(fw, fh, h.color, locked), fx, fy);
    pixelEllipse(ctx, fx + fw / 2, footY, Math.round(crop.w * s * 0.4), Math.max(2, Math.round(s * 1.5)), 'rgba(5,4,10,0.5)');
    const dx = Math.round(fx + fw / 2 - (crop.x + crop.w / 2) * s), dy = footY - (crop.y + crop.h - 1) * s;
    const W1 = fr.w * s, H1 = fr.h * s, rim = mix(h.color, '#ffffff', 0.7);
    ctx.globalAlpha = locked ? 0.35 : 0.9;
    ctx.drawImage(fr.variant('rim' + rim, (b) => silhouette(b, hexPack(rim))), dx - s, dy - s, W1, H1);
    ctx.globalAlpha = 1;
    ctx.drawImage(locked ? fr.variant('shadow', (b) => ({ ...b, d: b.d.map((c) => (c >>> 24 ? 0xff1b141d : 0)) })) : fr.c, dx, dy, W1, H1);
    if (!locked) heroLine(ctx, h, fr, dx, dy, s, 0.55);
    return fw;
  }

  detail(ctx, W, H, id, y, locked) {
    const h = heroLook(id, this.app.settings.skins);
    const pw = Math.min(W - 16, 400), ph = Math.min(H - y - 72, 140);
    const x = Math.round(W / 2 - pw / 2);
    panel(ctx, x, y, pw, ph, { title: `${h.name.toUpperCase()} — ${h.title.toUpperCase()}` });
    // The portrait frame, as tall as the panel allows over the line of stars under it.
    const artW = this.portrait(ctx, h, x + 10, y + 12, ph - 27, Math.round(pw * 0.42), locked);
    const tx = x + 10 + artW + 10;
    const tw = pw - (tx - x) - 8;
    let ty = y + 9;
    const stat = (label, v, max, col) => {
      drawText(ctx, label, tx, ty, { color: '#8b9bb4' });
      drawText(ctx, label === 'SPEED' ? `${Math.round(v * 100)}%` : String(v), tx + tw, ty, { align: 'right', color: col });
      ty += 9;
    };
    stat('BASE HP', h.stats.maxHp, 300, '#e43b44');
    stat('SPEED', h.stats.speed || 1, 1.25, '#2ce8f5');
    // What he starts with: one weapon, or the Necromancer's two side by side.
    const start = startWeapons(h).map((id) => WEAPONS[id]);
    start.forEach((w, i) => ctx.drawImage(SPR[w.icon].frames[0].c, tx - 1 + i * 17, ty - 1));
    const nx = tx + 17 * start.length;
    const names = wrapText(start.map((w) => w.name).join(' + '), tx + tw - nx);
    names.forEach((ln, i) => drawText(ctx, ln, nx, ty + 3 + i * 9 - (names.length - 1) * 4, { color: '#fee761' }));
    ty += 17;
    for (const line of wrapText(HERO_SUMMARY[id][0], tw)) {
      if (ty > y + ph - 38) break;
      drawText(ctx, line, tx, ty, { color: '#c0cbdc' });
      ty += 9;
    }
    ty += 2;
    const ultimateOpen = openFor(this.app.store.profile, id).ult;
    drawText(ctx, fitLine('ULT · ' + h.ultName, tw), tx, ty, { color: ultimateOpen ? '#f6757a' : '#8b9bb4' });
    ty += 9;
    for (const line of wrapText(ultimateOpen ? HERO_SUMMARY[id][1] : `Locked · survive ${fmtTime(PROGRESS.ultTime)} with this hero`, tw)) {
      if (ty > y + ph - (locked || ph >= 125 ? 24 : 10)) break;
      drawText(ctx, line, tx, ty, { color: '#8b9bb4' });
      ty += 9;
    }
    const prof = this.app.store.profile;
    if (locked) {
    const next = nextHeroUnlock(prof);
      const prev = HERO_ORDER[HERO_ORDER.indexOf(id) - 1];
      const msg = next !== id ? `UNLOCK THE ${HEROES[next].title.toUpperCase()} FIRST`
        : `SURVIVE ${HERO_UNLOCK_TIME / 60} MINUTES WITH THE ${HEROES[prev].title.toUpperCase()}`;
      drawText(ctx, msg, x + pw / 2, y + ph - 11, { align: 'center', color: next === id ? '#feae34' : '#8b9bb4' });
    } else if (ph >= 125) {
      // Which trials this hero has conquered.
      const stars = featStars(prof, id);
      const parts = stars.map(([label]) => `★ ${label}`);
      const widths = parts.map((s) => textWidth(s));
      let sx = Math.round(x + pw / 2 - (widths.reduce((a, b) => a + b, 0) + 10 * (parts.length - 1)) / 2);
      stars.forEach(([, col, got], i) => {
        drawText(ctx, parts[i], sx, y + ph - 11, { color: got ? col : '#3a4466' });
        sx += widths[i] + 10;
      });
    }
    // His looks (data/heroes.js skins), left and right through them, remembered with the settings.
    const skins = HEROES[id].skins;
    if (skins && !locked) {
      const app = this.app, cur = skins.find((k) => k.id === app.settings.skins?.[id]) || skins[0];
      const d = stepper(ctx, app.ui, 'look', Math.round(W / 2 - 80), y + ph + 4, 160, 'LOOK', cur.name.toUpperCase());
      if (d) {
        const next = skins[(skins.indexOf(cur) + d + skins.length) % skins.length];
        app.settings.skins = { ...app.settings.skins, [id]: next.id };
        saveSettings(app.settings);
        sfx('select');
      }
      return y + ph + 19;
    }
    return y + ph;
  }
}

// ------------------------------------------------------------------- mode --

export class ModeScreen {
  enter(app) {
    this.app = app;
    this.t = 0;
    app.ui.lock(0.2);
    // A trial this hero can't enter (yet) falls back to Survival.
    if (!canPlay(app.store.profile, app.choice.mode, app.choice.hero)) app.choice.mode = 's15';
    app.ui.focusId = 'm_' + app.choice.mode;
  }

  draw(ctx, W, H, dt) {
    const app = this.app, ui = app.ui;
    this.t += dt;
    app.scene.draw(ctx, W, H, dt, { campfire: false });
    dim(ctx, W, H, 0.45);
    header(ctx, W, 'Choose your Trial');
    ui.begin(dt);
    const prof = app.store.profile;
    const hero = app.choice.hero;
    const modes = Object.keys(MODES);
    const cw = Math.min(110, Math.floor((W - 24) / modes.length) - 6), ch = 84;
    const total = modes.length * cw + (modes.length - 1) * 6;
    let x = Math.round(W / 2 - total / 2);
    const y = 34;
    let focusMode = null;
    // The trials, a row of choices (the owner's, 23 October 2026: the menus should "respect left,
    // right, up, down"): moving along it picks the trial in focus, if this hero may enter it; up or
    // down into it comes back to the one picked (ui.js group). Enter goes on to BEGIN.
    for (const m of modes) {
      const M = MODES[m];
      const fid = 'm_' + m;
      const open = canPlay(prof, m, hero);
      const activated = ui.item(fid, x, y, cw, ch, { disabled: !open, group: 'trial', home: app.choice.mode === m });
      if (activated) { app.choice.mode = m; ui.focus('begin'); }
      const f = ui.focused(fid);
      if (f) focusMode = m;
      if (f && open && ui.focusSource !== 'pointer' && app.choice.mode !== m) app.choice.mode = m;
      const sel = app.choice.mode === m;
      panel(ctx, x, y, cw, ch, { trim: f ? ['#ffffff', '#feae34'] : sel ? ['#feae34', '#733e39'] : ['#5a6988', '#3a4466'], rivets: sel, fill: sel ? '#241b2c' : open ? null : '#120e18' });
      // Each trial its own scene (scenes.js): Survival's dusk, the Dungeon's stairs, Ranked's blood
      // moon; in shadow while locked. As large as the card's picture area allows, a whole-number scale.
      const scene = trialScene(m, open);
      const k = Math.max(1, Math.floor(Math.min((cw - 8) / SCENE.w, (ch - 40) / SCENE.h)));
      const sx0 = Math.round(x + cw / 2 - (SCENE.w * k) / 2), sy0 = Math.round(y + 4 + (ch - 38 - SCENE.h * k) / 2);
      ctx.fillStyle = '#0d0b14';
      ctx.fillRect(sx0 - 1, sy0 - 1, SCENE.w * k + 2, SCENE.h * k + 2);
      ctx.drawImage(scene, sx0, sy0, SCENE.w * k, SCENE.h * k);
      if (sel) {
        ctx.fillStyle = '#feae34';
        ctx.fillRect(x + 3, y + ch - 12, cw - 6, 9);
        drawText(ctx, 'SELECTED', x + cw / 2, y + ch - 11, { align: 'center', color: '#3e2731', outline: null });
      }
      drawText(ctx, M.name.toUpperCase(), x + cw / 2, y + 52, { align: 'center', color: !open ? '#5a6988' : f || sel ? '#fee761' : '#c0cbdc' });
      drawText(ctx, open ? M.sub : 'LOCKED', x + cw / 2, y + 61, { align: 'center', color: open ? '#8b9bb4' : '#5a6988' });
      // This hero's record here: stars for wins, or the best Ranked time.
      if (m === 'ranked') {
        const best = prof.ranked[hero];
        if (best && open) drawText(ctx, (cw >= 90 ? 'BEST ' : '') + fmtTime(best), x + 6, y + 5, { color: '#feae34' });
      } else if (open) {
        const stars = featStars(prof, hero).filter(([label]) => (m === 's15' ? label === 'Night survived' : label === 'Dungeon'));
        let sx = x + 6;
        for (const [, col, got] of stars) {
          if (got) drawText(ctx, '★', sx, y + 5, { color: col });
          sx += 7;
        }
      }
      x += cw + 6;
    }
    const mode = app.choice.mode;
    const tw = Math.min(W - 20, 360);
    // The focused trial's description, or what it takes to unlock it: two lines kept for it, so
    // nothing under it moves as the focus does.
    const lockedFocus = focusMode && !canPlay(prof, focusMode, hero);
    const desc = lockedFocus ? `To unlock: ${lockReason(prof, focusMode, hero)}` : MODES[focusMode || mode].desc;
    wrapText(desc, tw).slice(0, 2).forEach((line, i) => drawText(ctx, line, W / 2, y + ch + 5 + i * 9, { align: 'center', color: lockedFocus ? '#feae34' : '#c0cbdc' }));
    // Normal, Veteran or Elite (data/difficulty.js), a row of choices like the trials: moving along
    // it picks one. Under it the Nightmare box (three times the monsters), open only on Elite (the
    // owner's, 21 October 2026). All remembered with the settings. Ranked keeps one best per hero,
    // so it is always Elite and never a Nightmare: there neither is shown.
    let ty = y + ch + 25;
    const note = [];
    if (mode === 'ranked') {
      note.push(['Endless personal bests · Elite difficulty', '#8b9bb4']);
      const best = prof.ranked[hero] || 0;
      note.push([best ? `Your best with the ${HEROES[hero].title}: ${fmtTime(best)} · ${rankTitle(best).toUpperCase()}` : `No Ranked run with the ${HEROES[hero].title} yet`, '#feae34']);
    } else {
      const elite = app.choice.diff === ELITE.id, nightmare = elite && app.choice.nightmare === true;
      const DIFF_ROW = [NORMAL, VETERAN, ELITE];
      const bw = 64, gap = 8, bx = Math.round(W / 2 - (DIFF_ROW.length * bw + (DIFF_ROW.length - 1) * gap) / 2);
      DIFF_ROW.forEach((d, i) => {
        const id = 'd_' + d.id, on = app.choice.diff === d.id;
        const activated = button(ctx, ui, id, bx + i * (bw + gap), ty, bw, 13, d.name.toUpperCase(), { color: on ? '#fee761' : '#8b9bb4', on, group: 'diff', home: on });
        if (activated) ui.focus('begin');
        if ((activated || (ui.focused(id) && ui.focusSource !== 'pointer')) && !on) {
          app.choice.diff = app.settings.diff = d.id;
          saveSettings(app.settings);
        }
      });
      // The box, centred under the row; shut but for Elite, and saying so.
      const label = elite ? NIGHTMARE.name.toUpperCase() : `${NIGHTMARE.name.toUpperCase()} · ELITE ONLY`;
      if (checkbox(ctx, ui, 'nightmare', Math.round(W / 2 - checkboxWidth(label) / 2), ty + 17, label, nightmare, { color: '#f6757a', disabled: !elite })) {
        app.choice.nightmare = app.settings.nightmare = !nightmare;
        saveSettings(app.settings);
      }
      ty += 34;
      const d = DIFF_ROW.find((x) => x.id === app.choice.diff) || NORMAL;
      note.push([d.desc, '#8b9bb4']);
      if (nightmare) note.push([NIGHTMARE.desc, '#f6757a']);
    }
    for (const [text, color] of note) {
      for (const line of wrapText(text, tw)) {
        drawText(ctx, line, W / 2, ty, { align: 'center', color });
        ty += 9;
      }
    }
    // BEGIN in one place whatever is chosen: under room for the longest notes (four lines), and on a
    // short screen no lower than over the keys' line.
    const beginY = Math.max(ty + 6, Math.min(H - 44, y + ch + 25 + 34 + 4 * 9 + 8));
    if (button(ctx, ui, 'begin', Math.round(W / 2 - 50), beginY, 100, 15, 'BEGIN', { color: '#fee761' })) app.startRun();
    if (button(ctx, ui, 'back', 14, H - 20, 50, 13, 'BACK', { fallback: true })) app.go('hero');
    keysHint(ctx, W, H);
    ui.end();
    if (input.pressed('back')) app.go('hero');
  }
}

// ----------------------------------------------------------------- armory --

const UPGRADE_GROUPS = [
  ['power', 'POWER', ['might', 'haste', 'reach', 'endurance', 'velocity', 'echo']],
  ['survival', 'SURVIVAL', ['armor', 'vitality', 'recovery', 'swiftness', 'revival', 'phoenix']],
  ['preparation', 'PREPARATION', ['arsenal', 'reliquary', 'magnet', 'fortune', 'wisdom', 'greed', 'reroll', 'banish']],
];
export function upgradeEffect(p, id) {
  if (id === 'phoenix') return p.up.phoenix ? 'Relic available' : 'Relic unavailable';
  const key = { vitality: 'maxHp', recovery: 'regen', haste: 'cooldown', reach: 'area', swiftness: 'speed', fortune: 'luck', wisdom: 'growth', arsenal: 'weaponSlots', reliquary: 'relicSlots', endurance: 'duration', velocity: 'projSpeed', echo: 'amount' }[id] || id;
  const n = metaBonuses(p)[key];
  if (['armor', 'recovery', 'arsenal', 'reliquary', 'reroll', 'banish', 'echo', 'revival'].includes(id)) return String(Math.round(n * 10) / 10);
  const pct = Math.round((n - 1) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}
export class ArmoryScreen {
  enter(app) {
    this.app = app;this.tab = 'power';this.selected = 'might';this.busy = false;
    app.ui.lock(0.2);app.ui.focusId = 'u_might';playMusic('title');
  }
  inspect(u) {
    const p = this.app.store.profile, rank = p.up[u.id] || 0, maxed = rank >= u.max;
    const cost = upgradeCost(u.id, rank), open = upgradeOpen(p, u);
    this.selected = u.id;
    const lines = [{ text: u.desc, color: '#fee761' }, `Rank ${rank}/${u.max} · permanent for all heroes`];
    if (!open) lines.push(shortNeed(needText(PROGRESS.locks.find(l => l.id === u.lock))));
    else if (!maxed) lines.push(`Current ${upgradeEffect(p, u.id)} → next ${upgradeEffect({ ...p, up: { ...p.up, [u.id]: rank + 1 } }, u.id)}`, `${cost} gold · you have ${fmtNum(p.gold)}`, p.gold >= cost ? `${fmtNum(p.gold - cost)} gold after purchase` : `${cost - p.gold} more gold needed`);
    else lines.push('Fully upgraded');
    this.dialog = new MenuDialog(u.name, lines, DEBUG ? [{ id: 'buy', label: maxed ? 'CLEAR RANKS' : 'ADD RANK · FREE' }] : [{ id: 'buy', label: maxed ? 'FULLY UPGRADED' : !open ? 'LOCKED' : `BUY · ${cost} GOLD`, disabled: maxed || !open || p.gold < cost || this.busy }]);
    this.app.ui.focus('detail_close');this.app.ui.lock(0.2);
  }
  draw(ctx, W, H, dt) {
    const app = this.app, ui = app.ui, p = app.store.profile;
    app.scene.draw(ctx, W, H, dt, { campfire: false });dim(ctx, W, H, 0.65);
    header(ctx, W, 'The Armory');goldTag(ctx, app, W - 6, 9);
    if (this.dialog) {
      const action = this.dialog.draw(ctx, ui, W, H, dt);
      if (action === 'buy' && !this.busy) {
        const u = UPGRADES.find(u => u.id === this.selected), rank = p.up[u.id] || 0;
        this.busy = true;
        Promise.resolve(DEBUG ? app.store.setUpgrades({ [u.id]: rank >= u.max ? 0 : rank + 1 }) : app.store.buy(u.id)).then(ok => { if (ok) sfx('chest'); }).catch(() => { this.message = 'Purchase failed. Please try again.'; }).finally(() => { this.busy = false; });
      }
      if (action === 'refund' && !this.busy) { this.busy = true;Promise.resolve(app.store.refund()).catch(() => { this.message = 'Refund failed. Please try again.'; }).finally(() => { this.busy = false; }); }
      if (action) { this.dialog = null;ui.focus('u_' + this.selected);ui.lock(0.2); }
      return;
    }
    ui.begin(dt);
    drawText(ctx, 'Permanent upgrades · all heroes', W / 2, 26, { align: 'center', color: '#8b9bb4' });
    const tw = Math.min(105, Math.floor((W - 24) / 3)), tx = Math.round((W - 3 * tw - 8) / 2);
    UPGRADE_GROUPS.forEach(([id, label], i) => {
      if (button(ctx, ui, 'ug_' + id, tx + i * (tw + 4), 40, tw, 15, label, { on: this.tab === id })) this.tab = id;
      if (ui.focused('ug_' + id) && ui.focusSource !== 'pointer') this.tab = id;
    });
    const ids = UPGRADE_GROUPS.find(g => g[0] === this.tab)[2];
    const width = Math.min(W - 24, 450), cols = width >= 390 ? 3 : 2, cw = Math.floor((width - (cols - 1) * 6) / cols), ch = 37;
    const x = Math.round((W - width) / 2);
    ids.forEach((id, i) => {
      const u = UPGRADES.find(u => u.id === id), rank = p.up[id] || 0;
      const maxed = rank >= u.max, open = upgradeOpen(p, u), cost = upgradeCost(id, rank);
      const cx = x + i % cols * (cw + 6), cy = 64 + Math.floor(i / cols) * (ch + 6);
      if (ui.item('u_' + id, cx, cy, cw, ch)) this.inspect(u);
      const f = ui.focused('u_' + id);if (f) this.selected = id;
      panel(ctx, cx, cy, cw, ch, { rivets: false, fill: '#15131f', trim: f ? ['#fee761', '#be4a2f'] : ['#3a4466', '#262b44'] });
      ctx.drawImage(SPR[UP_ICONS[id]].frames[0].c, cx + 5, cy + 5);
      drawText(ctx, u.name, cx + 24, cy + 6, { color: f ? '#fee761' : '#ead4aa' });
      drawText(ctx, `${rank}/${u.max}`, cx + 7, cy + 24, { color: '#8b9bb4' });
      drawText(ctx, maxed ? 'MAX' : !open ? 'LOCKED' : DEBUG ? 'FREE' : `${cost} G`, cx + cw - 7, cy + 24, { align: 'right', color: maxed ? '#9ee562' : !open || cost > p.gold ? '#8b9bb4' : '#fee761' });
    });
    const selected = UPGRADES.find(u => u.id === this.selected), bottom = 64 + Math.ceil(ids.length / cols) * (ch + 6);
    if (bottom + 30 < H - 28) wrapText(selected.desc, width - 12).forEach((line, i) => drawText(ctx, line, W / 2, bottom + 6 + i * 10, { align: 'center', color: '#c0cbdc' }));
    if (bottom + 80 < H - 28) {
      const bonuses = metaBonuses(p), sy = bottom + 42;
      panel(ctx, x, sy, width, 43, { title: 'Your preparation', rivets: false, fill: '#15131f' });
      drawText(ctx, `${bonuses.weaponSlots} weapon slots · ${bonuses.relicSlots} relic slots`, W / 2, sy + 12, { align: 'center', color: '#ead4aa' });
      drawText(ctx, `${bonuses.reroll} rerolls · ${bonuses.banish} banishes · ${bonuses.revival} revives`, W / 2, sy + 26, { align: 'center', color: '#8b9bb4' });
    }
    if (button(ctx, ui, 'back', 14, H - 20, 50, 13, 'BACK', { fallback: true })) app.go('title');
    if (this.message) drawText(ctx, this.message, W / 2, H - 34, { align: 'center', color: '#f6757a' });
    if (button(ctx, ui, DEBUG ? 'clearall' : 'refund', W - 98, H - 20, 90, 13, DEBUG ? 'CLEAR ALL' : 'REFUND ALL', { disabled: this.busy || !Object.values(p.up).some(Boolean) })) {
      if (DEBUG) app.store.setUpgrades(Object.fromEntries(UPGRADES.map(u => [u.id, 0])));
      else { this.dialog = new MenuDialog('Refund upgrades?', ['Return all purchased ranks to gold.', 'This removes their bonuses from future runs. You can buy them again.'], [{ id: 'refund', label: 'REFUND ALL UPGRADES' }]);ui.focus('detail_close');ui.lock(0.2); }
    }
    if (DEBUG && button(ctx, ui, 'maxall', Math.round(W / 2 - 40), H - 20, 80, 13, 'MAX ALL')) app.store.setUpgrades(Object.fromEntries(UPGRADES.map(u => [u.id, u.max])));
    ui.end();if (input.pressed('back')) app.go('title');
  }
}

// ------------------------------------------------------------------ codex --

// One collection: exclusions, weapons, relics and owned heroes' ultimates. Wheel, touch drag,
// keyboard and gamepad all move through the same scrolling grid.
export const CODEX_TILE = { min: 150, max: 210, h: 48, gap: 5, top: 42, foot: 46 };

export function menuEntries(profile) {
  const entries = codexEntries(profile), hidden = entries.filter(e => e.hidden);
  // One discovery card replaces a wall of identical mystery requirements.
  const visible = entries.filter(e => !e.hidden || e === hidden[0]).map(e => e === hidden[0] ? { ...e, hiddenCount: hidden.length } : e);
  return ['feature', 'weapon', 'relic', 'ult'].flatMap(type => visible.filter(e => e.type === type));
}

// The tiles' grid for n of them on a W x H screen: as many columns as fit CODEX_TILE.min wide
// (at most three), below the heading and above the status and BACK controls.
export function codexLayout(W, H, n) {
  const C = CODEX_TILE;
  const width = Math.min(480, W - 24);
  const cols = clamp(Math.floor((width + C.gap) / (C.min + C.gap)), 1, 3);
  const cw = Math.min(C.max, Math.floor((width - (cols - 1) * C.gap) / cols));
  const step = C.h + C.gap, room = H - C.top - C.foot;
  // Whole rows only, never one cut in half at the foot.
  const rows = Math.max(1, Math.floor((room + C.gap) / step)), total = Math.ceil(n / cols);
  const view = Math.min(room, rows * step - C.gap);
  const most = Math.max(0, total * step - C.gap - view);
  return { cols, rows, total, cw, ch: C.h, step, view, most, x0: Math.round(W / 2 - (cols * cw + (cols - 1) * C.gap) / 2), y0: C.top };
}

export class CodexScreen {
  enter(app, params = {}) {
    this.app = app;
    this.back = params.back || 'title';
    this.scroll = 0; // px the grid is scrolled, easing to want
    this.want = 0;
    this.drag = null; // a press in the grid: where it began, and whether it has become a drag
    this.seen = null; // the focus last frame: a new one by the keys is scrolled into view
    app.ui.lock(0.2);
    app.ui.focusId = 'cx_feature_exclusions';
  }

  draw(ctx, W, H, dt) {
    const app = this.app, ui = app.ui, prof = app.store.profile;
    app.scene.draw(ctx, W, H, dt, { campfire: false });
    dim(ctx, W, H, 0.6);
    header(ctx, W, 'The Codex');
    if (this.detail) {
      const e = codexEntries(prof).find(e => `${e.type}_${e.id}` === this.detailKey);
      const action = this.detail.draw(ctx, ui, W, H, dt);
      if (action === 'pool' && e?.open && e.type === 'weapon' && !this.busy) {
        this.busy = true;
        app.store.setHome(e.id, !e.home).then(ok => { if (ok) sfx('select'); }).catch(() => { this.message = 'Could not save weapon choice. Try again.'; }).finally(() => { this.busy = false; });
      }
      if (action) { this.detail = null; ui.focus('cx_' + this.detailKey); ui.lock(0.2); }
      return;
    }
    ui.begin(dt);
    drawText(ctx, 'Weapons · Relics · Ultimates · Unlocks', W / 2, 27, { align: 'center', color: '#8b9bb4' });
    const list = menuEntries(prof);
    const L = codexLayout(W, H, list.length);
    this.scrollGrid(L, dt);
    // The focus moved onto a tile by the keys or a pad: brought into view.
    const at = list.findIndex((e) => ui.focusId === `cx_${e.type}_${e.id}`);
    if (at >= 0 && ui.focusId !== this.seen) {
      const top = Math.floor(at / L.cols) * L.step;
      if (top < this.want) this.want = top;
      else if (top + L.ch > this.want + L.view) this.want = top + L.ch - L.view;
      this.want = clamp(this.want, 0, L.most);
    }
    let focused = null;
    const m = input.mouse, out = m.y < L.y0 || m.y >= L.y0 + L.view || !!this.drag?.moved;
    // The rows in sight, and one more each side, so the keys can step onto the next.
    const r0 = Math.max(0, Math.floor(this.scroll / L.step) - 1), r1 = Math.min(L.total - 1, Math.floor((this.scroll + L.view) / L.step) + 1);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, L.y0, W, L.view);
    ctx.clip();
    list.slice(r0 * L.cols, (r1 + 1) * L.cols).forEach((e, k) => {
      const i = r0 * L.cols + k;
      const x = L.x0 + (i % L.cols) * (L.cw + CODEX_TILE.gap), y = Math.round(L.y0 + Math.floor(i / L.cols) * L.step - this.scroll);
      const fid = `cx_${e.type}_${e.id}`;
      if (ui.item(fid, x, y, L.cw, L.ch, { noMouse: out })) {
        const recipe = evolutionRecipe(e);
        const lines = [codexDescription(e)];
        if (e.type === 'feature') {
          lines.push({ text: `${e.level} exclusion slot${e.level === 1 ? '' : 's'} unlocked`, color: '#fee761' });
          lines.push(`${fmtNum(prof.kills)} monsters slain across all runs`);
          if (e.next) lines.push({ text: `Next level: ${e.need.toLowerCase()}`, color: '#feae34' });
          lines.push('Milestones: 10, 20, 40, 80, 160, 320 monsters, then keep doubling.');
        } else if (!e.open) lines.push({ text: shortNeed(e.need), color: '#feae34' }, codexRecord(e));
        if (e.type === 'relic' && e.open) lines.push(`${PASSIVES[e.id].max} ranks · bonuses apply during a run`);
        if (recipe) lines.push({ text: recipe, color: '#fee761' });
        const capacity = exclusionState(prof), used = prof.home?.length || 0;
        const canExclude = used < capacity.level;
        if (e.type === 'weapon' && e.open) {
          lines.push(e.home ? 'Excluded from future runs.' : 'Included in future runs.');
          lines.push(`${used} of ${capacity.level} exclusion slot${capacity.level === 1 ? '' : 's'} used`);
          if (!e.home && !canExclude && capacity.next) lines.push(`Slay ${fmtNum(capacity.next)} monsters in total to unlock another slot.`);
        }
        this.detail = new MenuDialog(codexName(e), lines.filter(Boolean), e.type === 'weapon' && e.open ? [{ id: 'pool', label: e.home ? 'INCLUDE IN RUNS' : canExclude ? 'EXCLUDE FROM RUNS' : 'NO EXCLUSION SLOTS AVAILABLE', disabled: !e.home && !canExclude }] : []);
        this.detailKey = `${e.type}_${e.id}`;ui.focus('detail_close');ui.lock(0.2);
      }
      const f = ui.focused(fid);
      if (f) focused = e;
      this.tile(ctx, e, x, y, L.cw, L.ch, f);
    });
    ctx.restore();
    // The bar: where the view is in the whole grid.
    if (L.most > 0) {
      const bx = Math.min(W - 4, L.x0 + L.cols * L.cw + (L.cols - 1) * CODEX_TILE.gap + 2), whole = L.view + L.most;
      const bh = Math.max(10, Math.round((L.view * L.view) / whole)), by = L.y0 + Math.round(((L.view - bh) * this.scroll) / L.most);
      ctx.fillStyle = '#262b44';
      ctx.fillRect(bx, L.y0, 2, L.view);
      ctx.fillStyle = '#8b9bb4';
      ctx.fillRect(bx, by, 2, bh);
    }
    // The focused tile told in full: what it does once open, else what opens it and how far along.
    if (focused) {
      const status = focused.open ? (focused.home ? 'Excluded from runs' : 'Unlocked') : codexRecord(focused) || 'Locked';
      drawText(ctx, this.message || `${status} · Select for details`, W / 2, H - 38, { align: 'center', color: '#8b9bb4' });
    } else {
      drawText(ctx, this.message || 'Select an entry to inspect it', W / 2, H - 38, { align: 'center', color: '#8b9bb4' });
    }
    if (button(ctx, ui, 'back', 14, H - 20, 50, 13, 'BACK', { fallback: true })) app.go(this.back);
    keysHint(ctx, W, H);
    ui.end();
    this.seen = ui.focusId;
    if (input.pressed('back')) app.go(this.back);
  }

  // The grid's scroll: the wheel a row a notch; a press in the grid that moves more than a few
  // pixels drags it (and lifting then is no click); it eases to where it is wanted.
  scrollGrid(L, dt) {
    const m = input.mouse;
    if (m.wheel) this.want += Math.sign(m.wheel) * L.step;
    if (m.down && !this.drag && m.y >= L.y0 && m.y < L.y0 + L.view) this.drag = { y: m.y, from: this.want, moved: false };
    if (this.drag) {
      if (Math.abs(m.y - this.drag.y) > 4) this.drag.moved = true;
      if (this.drag.moved) this.want = this.scroll = clamp(this.drag.from - (m.y - this.drag.y), 0, L.most);
      if (!m.down) {
        if (this.drag.moved) m.clicked = false;
        this.drag = null;
      }
    }
    this.want = clamp(this.want, 0, L.most);
    this.scroll += (this.want - this.scroll) * Math.min(1, dt * 14);
    if (Math.abs(this.want - this.scroll) < 0.5) this.scroll = this.want;
  }

  // One entry's tile: its icon and name; under them, shut, what opens it and a bar of how far the
  // records have come; open, what opened it (or that it always was).
  tile(ctx, e, x, y, w, h, f) {
    const open = e.open;
    panel(ctx, x, y, w, h, { trim: f ? ['#fee761', '#be4a2f'] : open ? ['#5a6988', '#3a4466'] : ['#3a4466', '#262b44'], rivets: false, fill: open ? '#15131f' : '#120e18' });
    codexIcon(ctx, e, x + 4, y + 4);
    const tx = x + 23, room = w - 27;
    drawText(ctx, fitLine(e.hiddenCount ? `${e.hiddenCount} hidden weapons` : codexName(e), room), tx, y + 4, { color: !open ? (f ? '#c0cbdc' : '#8b9bb4') : f ? '#fee761' : '#ead4aa' });
    const lines = wrapText(e.home ? 'Excluded from runs' : codexSummary(e), room);
    if (lines.length > 2) lines[1] = fitLine(lines.slice(1).join(' '), room);
    lines.slice(0, 2).forEach((line, i) => drawText(ctx, line, tx, y + 14 + i * 9, { color: e.home ? '#f6757a' : open ? '#c0cbdc' : '#c28569' }));
    const kind = { weapon: 'WEAPON', relic: 'RELIC', ult: 'ULTIMATE', feature: `LEVEL ${e.level}` }[e.type];
    drawText(ctx, kind, tx, y + h - 13, { color: '#8b9bb4' });
    if (!open || (e.type === 'feature' && e.next)) codexBar(ctx, tx, y + h - 4, room, e.progress, '#feae34');
  }
}

// A tile's bar, w wide at (x, y): k of it filled in col over an empty iron groove.
function codexBar(ctx, x, y, w, k, col) {
  ctx.fillStyle = '#0d0b14';
  ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = '#262b44';
  ctx.fillRect(x + 1, y + 1, w - 2, 2);
  ctx.fillStyle = col;
  ctx.fillRect(x + 1, y + 1, Math.round((w - 2) * clamp(k, 0, 1)), 2);
}

// A line cut to fit a width, with an ellipsis.
function fitLine(s, w) {
  if (textWidth(s) <= w) return s;
  while (s.length > 1 && textWidth(s + '…') > w) s = s.slice(0, -1);
  return s + '…';
}

// ---------------------------------------------------------------- records --

export class RecordsScreen {
  enter(app) { this.app = app;this.tab = 'overview';app.ui.lock(0.2); }
  draw(ctx, W, H, dt) {
    const app = this.app, ui = app.ui, p = app.store.profile;
    app.scene.draw(ctx, W, H, dt, { campfire: false });dim(ctx, W, H, 0.65);header(ctx, W, 'Records');
    if (this.dialog) { if (this.dialog.draw(ctx, ui, W, H, dt)) { this.dialog = null;ui.focus('records_ranked');ui.lock(0.2); }return; }
    ui.begin(dt);
    for (const [i, id] of ['overview', 'ranked'].entries()) if (button(ctx, ui, 'records_' + id, W / 2 - 104 + i * 108, 28, 100, 15, id.toUpperCase(), { on: this.tab === id })) this.tab = id;
    const rows = this.tab === 'overview' ? [
      ['Nights won', String(p.wins.s15.reduce((a,b) => a+b, 0))],
      ['Dungeons cleared', String(p.wins.dungeon.reduce((a,b) => a+b, 0))],
      ['Runs played', fmtNum(p.runs)], ['Monsters slain', fmtNum(p.kills)],
      ['Most kills / run', fmtNum(p.best.kills)], ['Highest level', String(p.best.level)],
      ['Longest night', fmtTime(p.best.s15)], ['Deepest floor', p.best.dungeon >= 4 ? 'Conquered' : String(p.best.dungeon || '—')],
      ['Heroes recruited', `${p.heroes.length}/${HERO_ORDER.length}`],
    ] : HERO_ORDER.map(h => [HEROES[h].title, p.ranked[h] ? `${fmtTime(p.ranked[h])} · ${rankTitle(p.ranked[h])}` : 'No record']);
    const w = Math.min(380, W - 24), x = Math.round((W - w) / 2), step = Math.min(22, Math.floor((H - 86) / rows.length));
    panel(ctx, x, 54, w, rows.length * step + 12, { rivets: false, fill: '#15131f' });
    rows.forEach(([label, value], i) => {
      const y = 61 + i * step;
      if (this.tab === 'ranked' && ui.item('record_' + HERO_ORDER[i], x + 6, y - 2, w - 12, step)) {
        const best = p.ranked[HERO_ORDER[i]] || 0;
        this.dialog = new MenuDialog(HEROES[HERO_ORDER[i]].title, [`Personal best: ${fmtTime(best)}`, `Title: ${rankTitle(best)}`, modeUnlocked(p, 'ranked') ? 'Endless runs on Elite. Your records are personal, not a shared leaderboard.' : 'Beat the Dungeon with the Necromancer to unlock Ranked.']);ui.focus('detail_close');ui.lock(0.2);
      }
      if (i % 2 === 0) { ctx.fillStyle = '#1d1b2a';ctx.fillRect(x + 3, y - 2, w - 6, step); }
      drawText(ctx, label, x + 10, y, { color: ui.focused('record_' + HERO_ORDER[i]) ? '#fee761' : '#c0cbdc' });
      drawText(ctx, value, x + w - 10, y, { align: 'right', color: '#fee761' });
    });
    if (button(ctx, ui, 'back', 14, H - 20, 50, 13, 'BACK', { fallback: true })) app.go('title');
    ui.end();if (input.pressed('back')) app.go('title');
  }
}

// ---------------------------------------------------------------- options --

export class OptionsScreen {
  enter(app, params = {}) {
    this.app = app;
    this.back = params.back || 'title';
    this.confirmReset = false;
    app.ui.lock(0.2);
    app.ui.focusId = 'o_music';
  }

  draw(ctx, W, H, dt, embedded = false) {
    const app = this.app, ui = app.ui, s = app.settings;
    if (!embedded) {
      app.scene.draw(ctx, W, H, dt, { campfire: false });
      dim(ctx, W, H, 0.55);
    } else dim(ctx, W, H, 0.7);
    header(ctx, W, 'Options');
    if (this.dialog) {
      const action = this.dialog.draw(ctx, ui, W, H, dt);
      if (action === 'reset') app.store.reset();
      if (action) { this.dialog = null;ui.focus('o_music');ui.lock(0.2); }
      return null;
    }
    ui.begin(dt);
    const w = Math.min(220, W - 30), x = Math.round(W / 2 - w / 2);
    let y = 36;
    const changed = () => {
      saveSettings(s);
      setVolumes(s.music, s.sfx);
      app.applySettings();
    };
    let d = stepper(ctx, ui, 'o_music', x, y, w, 'MUSIC', `${Math.round(s.music * 100)}%`);
    if (d) {
      s.music = clamp(Math.round(s.music * 10 + d) / 10, 0, 1);
      changed();
    }
    y += 17;
    d = stepper(ctx, ui, 'o_sfx', x, y, w, 'SOUND EFFECTS', `${Math.round(s.sfx * 100)}%`);
    if (d) {
      s.sfx = clamp(Math.round(s.sfx * 10 + d) / 10, 0, 1);
      changed();
      sfx('hit');
    }
    y += 17;
    for (const [key, label] of [['shake', 'SCREEN SHAKE'], ['numbers', 'DAMAGE NUMBERS'], ['crt', 'CRT SCANLINES'], ['fps', 'SHOW FPS']]) {
      if (stepper(ctx, ui, 'o_' + key, x, y, w, label, s[key] ? 'ON' : 'OFF')) {
        s[key] = !s[key];
        changed();
      }
      y += 17;
    }
    if (button(ctx, ui, 'o_full', x, y, w, 13, document.fullscreenElement ? 'EXIT FULLSCREEN' : 'FULLSCREEN')) app.toggleFullscreen();
    y += 17;
    // Erasing everything stands apart from the rest, so a press too many down the list can't land on it.
    y += 8;
    if (!embedded) {
      if (button(ctx, ui, 'o_reset', x, y, w, 13, 'RESET PROGRESS', { color: '#f6757a' })) {
        this.dialog = new MenuDialog('Erase progress?', ['This deletes your gold, heroes, equipment, upgrades and records.', 'This cannot be undone.'], [{ id: 'reset', label: 'ERASE ALL PROGRESS', color: '#f6757a' }]);ui.focus('detail_close');ui.lock(0.2);
      }
      y += 17;
    }
    if (button(ctx, ui, 'back', 14, H - 20, 50, 13, 'BACK', { fallback: true }) || input.pressed('back')) {
      if (embedded) return 'close';
      app.go(this.back);
    }
    if (button(ctx, ui, 'controls', W / 2 - 104, H - 44, 100, 15, 'CONTROLS')) {
      this.dialog = new MenuDialog('Controls', ['Move: WASD / arrows · gamepad stick / D-pad · drag on touch', 'Ultimate: Space / E / Q · gamepad X / triggers · tap fury orb', 'Crypt strike: X / Shift · shoulder buttons · second finger', 'Pause: Esc / P · Start · pause button', 'Map: Tab / M · gamepad Back', 'Menus: arrows to browse, Enter to choose, Escape to go back.', 'Level-up: 1–4 choose · R reroll · B banish']);ui.focus('detail_close');ui.lock(0.2);
    }
    if (button(ctx, ui, 'credits', W / 2 + 4, H - 44, 100, 15, 'CREDITS')) {
      this.dialog = new MenuDialog('Credits', [
        'Music: Askyel, Ian Alex Mac, Gundatsch, Muldjord, Alexandr Zhelanov, Lincoln Domina, 0 A.D. by Wildfire Games (CC BY / BY-SA), Juhani Junkala, HydroGene and others',
        'UI: Foozle Lucifer RPG UI and Kenney Fantasy UI Borders (CC0).',
        'Fonts: Pixtura12 by eishiya; Jacquard by Sarah Cadigan-Fried (SIL OFL).',
        'Full track credits and licences are included with the game.',
      ]);ui.focus('detail_close');ui.lock(0.2);
    }
    keysHint(ctx, W, H, 'ARROWS adjust · ENTER select · ESC back');
    ui.end();
    return null;
  }
}
