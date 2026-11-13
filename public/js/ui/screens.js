// Menu screens: title, hero select, trial select, armory, records, options.

import { input, padKey } from '../engine/input.js';
import { sfx, playMusic, playAfterJingle, setVolumes, initAudio, setCombatMusic, stopCombatMusicPreview } from '../engine/audio.js';
import { SPR } from '../engine/sprites.js';
import { saveSettings, DEBUG, seenBox } from '../engine/storage.js';
import { presentBackdrop } from '../engine/view.js';
import { fmtTime, fmtNum, clamp } from '../engine/util.js';
import { HEROES, HERO_ORDER } from '../data/heroes.js';
import { trialScene, SCENE, heroCrop, PORTRAIT } from './scenes.js';
import { MODES, NORMAL, VETERAN, ELITE, NIGHTMARE } from '../data/difficulty.js';
import { MAPS, MAP_LADDER, FIRST_MAP } from '../data/maps.js';
import { UPGRADES, upgradeCost, upgradeOpen, totalWins, nextGoal, canPlay, rankTitle, modeUnlocked, wonElite, affordableRanks, mapOpen } from '../shared/profile.js';
import { PASSIVES } from '../data/passives.js';
import { PROGRESS, needText } from '../shared/progress.js';
import { panel, button, stepper, checkbox, checkboxWidth, logo, dim, drawText, drawRich, wrapText, textWidth, textCanvas, newDot, padlock } from './ui.js';
import { goalText, lockReason, featStars, codexEntries, codexName, codexRecord, codexIcon, seenKey, isNewEntry, seenKeys } from './ladder.js';
import { flank, pointer } from './skin.js';
import { MenuDialog } from './menu-dialog.js';
import { codexSummary, codexDescription, evolutionRecipe, shortNeed, EFFORT_NOTE } from './menu-copy.js';
import { metaBonuses, exclusionState, lastInPlay } from '../shared/profile.js';
import { needsPrologue } from '../game/prologue.js';
import { normalizeCombatMusic, normalizeMusicTracks } from '../engine/combat-music.js';
import { CombatMusicPicker } from './music-picker.js';
import { MusicMenu } from './music-menu.js';

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
  if (input.device === 'pad') text = text.replace('ARROWS', 'D-PAD').replace('Q/E', `${padKey('LB')}/${padKey('RB')}`).replace('ENTER', padKey('A')).replace('ESC', padKey('B'));
  if (textWidth(text) > W - 2 * 76) return;
  drawText(ctx, text, W / 2, H - 16, { align: 'center', color: '#5a6988', outline: null });
}

// ------------------------------------------------------------------ title --

export class TitleScreen {
  enter(app, params = {}) {
    this.app = app;
    this.t = 0;
    this.ready = app.audioUnlocked;
    this.marksFor = null; // the NEW marks taken anew (draw)
    if (this.ready) playMusic('title');
    // Back from a menu: on the button that opened it (params.focus), not on START RUN.
    if (params.focus) app.ui.focusId = params.focus;
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

    // The NEW marks (the review's C5, 28 October 2026): the seen list's first fill, the save as it is
    // now (once a browser); then a dot on CODEX while anything has opened since the Codex last showed
    // it, and a coin on UPGRADES while the gold in hand buys a rank. Taken anew for each save in hand
    // and each time the title is come back to (enter), as the Codex adds to the list on leaving.
    if (this.marksFor !== app.store.profile) {
      const p = (this.marksFor = app.store.profile);
      seenBox.start(seenKeys(p));
      const seen = seenBox.read();
      this.marks = { codex: codexEntries(p).some((e) => isNewEntry(e, seen)), armory: !DEBUG && affordableRanks(p) > 0 };
    }

    // No Continue: a run is never saved to come back to, only its results when it ends.
    ui.begin(dt);
    const firstJourney = needsPrologue(app.store.profile, app.settings);
    const items = [['play', firstJourney ? 'BEGIN ADVENTURE' : 'START RUN'], ['armory', 'UPGRADES'], ['codex', 'CODEX'], ['records', 'RECORDS'], ['options', 'OPTIONS']];
    if (!firstJourney) items.push(['prologue', 'REPLAY INTRO']);
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
      const bx = Math.round(W / 2 - bw / 2);
      if (button(ctx, ui, id, bx, y, bw, bh, label)) this.pick(id);
      if (id === 'codex' && this.marks.codex) newDot(ctx, bx + bw - 14, y + 5);
      if (id === 'armory' && this.marks.armory) ctx.drawImage(SPR.h_coin.frames[0].c, bx + bw - 14, y + 5);
      y += bh + gap;
    }
    const goal = nextGoal(app.store.profile);
    if (goal && y + 13 < H - 17) {
      const width = Math.min(320, W - 24), text = `NEXT · ${goalText(goal)}`;
      const lines = y + 23 < H - 17 ? wrapText(text, width).slice(0, 2) : [fitLine(text, width)];
      lines.forEach((line, i) => drawText(ctx, line, W / 2, y + 5 + i * 10, { align: 'center', color: '#fee761' }));
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
    if (id === 'play') app.go(needsPrologue(app.store.profile, app.settings) ? 'prologue' : 'hero');
    else if (id === 'prologue') app.go('prologue', { replay: true });
    else if (id === 'armory') app.go('armory');
    else if (id === 'codex') app.go('codex');
    else if (id === 'records') app.go('records');
    else if (id === 'options') app.go('options', { back: 'title' });
  }
}

// ------------------------------------------------------------------- hero --

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

export { HeroScreen } from './hero-selection.js';

// ------------------------------------------------------------------- mode --

// The Survival map the trial screen shows, and BEGIN plays (data/maps.js; 28 October 2026): the one
// chosen (app.choice.map) while it is open; else the Darkwood where it is open (a save from before
// the maps spent every night there), else the last map open on the ladder.
export function shownMap(profile, chosen) {
  if (Object.hasOwn(MAPS, chosen ?? '') && mapOpen(profile, chosen)) return chosen;
  if (mapOpen(profile, 'forest')) return 'forest';
  return [...MAP_LADDER].reverse().find((m) => mapOpen(profile, m.id))?.id || FIRST_MAP;
}
// The map row's height and the gap under it: what the row moves the rest of the screen down by.
const MAP_ROW = 17;

export class ModeScreen {
  leave() {
    stopCombatMusicPreview();
  }

  enter(app, params = {}) {
    this.app = app;
    this.t = 0;
    this.musicPicker = new CombatMusicPicker();
    app.settings.combatMusic = normalizeCombatMusic(app.settings.combatMusic);
    app.settings.musicTracks = normalizeMusicTracks(app.settings.musicTracks, app.settings.combatMusic);
    setCombatMusic(app.settings.combatMusic);
    playAfterJingle('title'); // as on the hero screen (HeroScreen.enter)
    app.ui.lock(0.2);
    // A trial this hero can't enter (yet) falls back to Survival.
    const kept = canPlay(app.store.profile, app.choice.mode, app.choice.hero);
    if (!kept) app.choice.mode = 's15';
    // A map chosen that is shut now (a fresh start since it was) falls back to the one shown in its
    // place. None chosen stays none, the row showing its default; nothing is saved for coming here.
    if (app.choice.map !== undefined && !mapOpen(app.store.profile, app.choice.map)) app.choice.map = shownMap(app.store.profile);
    // Back from a run with the trial as it was (HeroScreen's again): the focus starts on BEGIN.
    this.step = params.again && kept ? 'difficulty' : 'destination';
    app.ui.focusId = this.step === 'difficulty' ? 'begin' : 'm_' + app.choice.mode;
  }

  draw(ctx, W, H, dt) {
    const app = this.app, ui = app.ui;
    this.t += dt;
    const prof = app.store.profile;
    // The map Survival will be spent on (shownMap), and behind the screen its land and sky while
    // Survival is the trial chosen (ui/background.js biome).
    let map = shownMap(prof, app.choice.map);
    app.scene.draw(ctx, W, H, dt, { campfire: false, ...(app.choice.mode === 's15' && { biome: map }) });
    dim(ctx, W, H, 0.45);
    header(ctx, W, this.step === 'difficulty' ? 'Choose your Challenge' : 'Choose your Destination');
    if (this.step === 'difficulty') { this.drawDifficulty(ctx, W, H, dt, map); return; }
    drawText(ctx, '1  DESTINATION    ·    2  CHALLENGE', W / 2, 25, { align: 'center', color: '#8b9bb4' });
    // The note closed (below), the focus goes back onto the trials, not on to BEGIN: moving along
    // them picks one (the owner's, 23 October 2026), so one browsing onto Ranked and closing its
    // note with Enter would have begun an Elite run with the next (27 October 2026).
    if (this.dialog) { if (this.dialog.draw(ctx, ui, W, H, dt)) { this.dialog = null;ui.focus('m_' + app.choice.mode);ui.lock(0.2); }return; }
    ui.begin(dt);
    const hero = app.choice.hero;
    const modes = Object.keys(MODES);
    const cw = Math.min(110, Math.floor((W - 24) / modes.length) - 6), ch = 84;
    const total = modes.length * cw + (modes.length - 1) * 6;
    let x = Math.round(W / 2 - total / 2);
    const y = 41;
    let focusMode = null;
    // The trials, a row of choices (the owner's, 23 October 2026: the menus should "respect left,
    // right, up, down"): moving along it picks the trial in focus, if this hero may enter it; up or
    // down into it comes back to the one picked (ui.js group). Enter goes on to BEGIN.
    for (const m of modes) {
      const M = MODES[m];
      const fid = 'm_' + m;
      const open = canPlay(prof, m, hero);
      const activated = ui.item(fid, x, y, cw, ch, { disabled: !open, group: 'trial', home: app.choice.mode === m });
      if (activated) { app.choice.mode = m; ui.focus('next'); }
      const f = ui.focused(fid);
      if (f) focusMode = m;
      if (f && open && ui.focusSource !== 'pointer' && app.choice.mode !== m) app.choice.mode = m;
      const sel = app.choice.mode === m;
      panel(ctx, x, y, cw, ch, { trim: f ? ['#ffffff', '#feae34'] : sel ? ['#feae34', '#733e39'] : ['#5a6988', '#3a4466'], rivets: sel, fill: sel ? '#241b2c' : open ? null : '#120e18' });
      // Each trial its own scene (scenes.js): Survival's the map it will be spent on (data/maps.js),
      // the Dungeon's stairs, Ranked's blood moon; in shadow while locked. As large as the card's
      // picture area allows, a whole-number scale.
      const scene = trialScene(m, open, m === 's15' ? map : undefined);
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
      // Under Survival the map's name in its colour (every map's is the same 15-minute night).
      const sub = !open ? 'LOCKED' : m === 's15' ? fitLine(MAPS[map].name, cw - 6) : M.sub;
      drawText(ctx, sub, x + cw / 2, y + 61, { align: 'center', color: !open ? '#5a6988' : m === 's15' ? MAPS[map].color : '#8b9bb4' });
      // This hero's record here: stars for wins, or the best Ranked time.
      if (m === 'ranked') {
        const best = prof.ranked[hero];
        if (best && open) drawText(ctx, (cw >= 90 ? 'BEST ' : '') + fmtTime(best), x + 6, y + 5, { color: '#feae34' });
      } else if (open) {
        const stars = featStars(prof, hero).filter((s) => s[3] === m); // any win, then Veteran, Elite, Nightmare
        let sx = x + 6;
        for (const [, col, got] of stars) {
          if (got) drawText(ctx, '★', sx, y + 5, { color: col });
          sx += 7;
        }
      }
      x += cw + 6;
    }
    const mode = app.choice.mode;
    // The first time Ranked is the trial chosen, a word that it is always Elite (the 27 October 2026
    // review, D10), said once and remembered with the settings (rankedNote).
    if (mode === 'ranked' && !app.settings.rankedNote) {
      app.settings.rankedNote = true;
      saveSettings(app.settings);
      this.dialog = new MenuDialog('Always Elite', ['Ranked is always played on Elite: the night at full strength, and no dawn ever comes.', wonElite(prof) ? 'Your best time with each hero is kept as a personal record.' : 'You have not won a night on Elite yet: Survival on Elite is the place to learn it first.']);
      ui.focus('detail_close');
      ui.lock(0.2);
    }
    // The Survival maps (data/maps.js; the owner's, 28 October 2026: the desert first, then the
    // frozen map, the forest and the demonic map, a flower meadow between), a row of tabs under the
    // trials while Survival is the trial chosen. As along the trials and the difficulties, moving
    // along it picks the map in focus where it is open, and the pointer's hover never does; up or
    // down into it comes back to the map shown; a click or Enter goes on to BEGIN. A map picked is
    // remembered with the settings, never for only coming to the screen. A shut one wears a padlock
    // and, in focus, says what opens it (below). All under the row moves down by its height.
    let focusMap = null;
    const row = mode === 's15' ? MAP_ROW : 0;
    if (row) {
      const n = MAP_LADDER.length, gap = 4, bw = Math.min(64, Math.floor((W - 24 - gap * (n - 1)) / n));
      const mx0 = Math.round(W / 2 - (n * bw + gap * (n - 1)) / 2), my = y + ch + 4;
      MAP_LADDER.forEach((M, i) => {
        const id = 'map_' + M.id, open = mapOpen(prof, M.id), on = map === M.id, mx = mx0 + i * (bw + gap);
        // Its short name, or its first three letters on a tab too narrow for it (a phone held upright).
        const label = textWidth(M.short) <= bw - 14 ? M.short : M.short.slice(0, 3);
        const activated = button(ctx, ui, id, mx, my, bw, 13, open ? label : '', { color: on ? '#fee761' : '#8b9bb4', on, disabled: !open, group: 'map', home: on });
        if (activated) ui.focus('next');
        const f = ui.focused(id);
        if (f) focusMap = M.id;
        if ((activated || (f && ui.focusSource !== 'pointer')) && open && !on) {
          map = app.choice.map = app.settings.map = M.id;
          saveSettings(app.settings);
        }
        if (!open) {
          // The padlock, and the name beside it where both fit; in focus brighter, with the pointer at
          // it as at a button in focus (one that can't be pressed shows none of its own).
          const lw = textWidth(label), both = lw + 11 <= bw - 14, lx = Math.round(mx + bw / 2 - (both ? lw + 11 : 9) / 2);
          padlock(ctx, lx, my + 2, 1, f ? '#feae34' : '#5a6988', f ? '#fee761' : '#8b9bb4');
          if (both) drawText(ctx, label, lx + 11, my + 2, { color: f ? '#c0cbdc' : '#5d4a52' });
          if (f) pointer(ctx, mx - 2 + Math.round(Math.sin(ui.t * 8)), my + 6);
        }
      });
    }
    const tw = Math.min(W - 20, 360);
    // The focused trial's description, or what it takes to unlock it; under Survival the map's own
    // (data/maps.js desc), the one in focus on the row or else the one shown, or what opens a shut
    // one. Two lines kept for it, so nothing under it moves as the focus does; one where the map
    // row leaves a short screen no room for two (an 854 x 480 window's 427 x 240), cut short.
    const lockedFocus = focusMode && !canPlay(prof, focusMode, hero);
    const shutMap = !!focusMap && !mapOpen(prof, focusMap);
    const desc = shutMap ? `To unlock: ${lockReason(prof, 's15', hero, focusMap)}`
      : focusMap ? MAPS[focusMap].desc
      : lockedFocus ? `To unlock: ${lockReason(prof, focusMode, hero)}`
      : (focusMode || mode) === 's15' ? MAPS[map].desc : MODES[focusMode || mode].desc;
    // (rowDescN: the lines kept under the map row, which BEGIN's place keeps room for, below.)
    const rowDescN = H < 250 ? 1 : 2, descN = row ? rowDescN : 2, lines = wrapText(desc, tw);
    if (lines.length > descN) lines[descN - 1] = fitLine(lines.slice(descN - 1).join(' '), tw);
    lines.slice(0, descN).forEach((line, i) => drawText(ctx, line, W / 2, y + ch + 5 + row + i * 9, { align: 'center', color: shutMap || lockedFocus ? '#feae34' : '#c0cbdc' }));
    this.desc = desc; // what the slot tells (test/trial-maps.test.js reads it)
    const nextY = Math.min(H - 45, y + ch + row + 48);
    if (button(ctx, ui, 'next', Math.round(W / 2 - 64), nextY, 128, 16, 'NEXT · CHALLENGE', { color: '#fee761' })) {
      this.step = 'difficulty';
      ui.focus(mode === 'ranked' ? 'begin' : 'd_' + app.choice.diff);
      ui.lock(0.2);
    }
    if (button(ctx, ui, 'back', 14, H - 20, 50, 13, 'BACK', { fallback: true })) app.go('hero');
    keysHint(ctx, W, H);
    // Keep horizontal movement within the mode or map row.
    const items = ui.items;
    if (row && !ui.focusId?.startsWith('map_') && (input.pressed('left') || input.pressed('right')) && !input.pressed('up') && !input.pressed('down')) ui.items = items.filter(i => !i.id.startsWith('map_'));
    ui.end();ui.items = items;
    if (input.pressed('back')) app.go('hero');
  }

  drawDifficulty(ctx, W, H, dt, map) {
    const app = this.app, ui = app.ui, prof = app.store.profile, mode = app.choice.mode;
    drawText(ctx, '1  DESTINATION    ·    2  CHALLENGE', W / 2, 25, { align: 'center', color: '#fee761' });
    ui.begin(dt);
    const musicWasOpen = this.musicPicker.open, musicLock = ui.lockT, musicFocus = ui.focusId, musicSource = ui.focusSource;
    if (musicWasOpen) ui.lockT = Infinity;
    const width = Math.min(360, W - 28), x = Math.round((W - width) / 2);
    panel(ctx, x, 44, width, 36, { rivets: false, fill: '#15131f' });
    drawText(ctx, `${MODES[mode].name} · ${HEROES[app.choice.hero].title}`, W / 2, 51, { align: 'center', color: '#ead4aa' });
    drawText(ctx, mode === 's15' ? MAPS[map].name : MODES[mode].sub, W / 2, 65, { align: 'center', color: mode === 's15' ? MAPS[map].color : '#8b9bb4' });
    const diffs = [NORMAL, VETERAN, ELITE], ty = 96;
    if (mode === 'ranked') {
      drawText(ctx, 'ELITE · ENDLESS', W / 2, ty + 5, { align: 'center', color: '#fee761' });
      const best = prof.ranked[app.choice.hero] || 0;
      drawText(ctx, best ? `Personal best ${fmtTime(best)} · ${rankTitle(best)}` : 'Survive as long as you can', W / 2, ty + 22, { align: 'center', color: '#8b9bb4' });
    } else {
      const bw = Math.min(90, Math.floor((width - 12) / 3)), gap = 6, bx = Math.round((W - bw * 3 - gap * 2) / 2);
      diffs.forEach((d, i) => {
        const id = 'd_' + d.id, on = app.choice.diff === d.id;
        const activated = button(ctx, ui, id, bx + i * (bw + gap), ty, bw, 17, d.name.toUpperCase(), { on, color: on ? '#fee761' : '#8b9bb4', group: 'diff', home: on });
        if ((activated || (ui.focused(id) && ui.focusSource !== 'pointer')) && !on) {
          app.choice.diff = app.settings.diff = d.id;saveSettings(app.settings);
        }
        if (activated) ui.focus('begin');
      });
      const elite = app.choice.diff === ELITE.id, nightmare = elite && app.choice.nightmare === true;
      const label = elite ? NIGHTMARE.name.toUpperCase() : `${NIGHTMARE.name.toUpperCase()} · ELITE ONLY`;
      if (checkbox(ctx, ui, 'nightmare', Math.round((W - checkboxWidth(label)) / 2), ty + 24, label, nightmare, { color: '#f6757a', disabled: !elite })) {
        app.choice.nightmare = app.settings.nightmare = !nightmare;saveSettings(app.settings);
      }
      const d = diffs.find(d => d.id === app.choice.diff) || NORMAL;
      const lines = wrapText(d.desc, width - 8);
      lines.slice(0, 3).forEach((line, i) => drawText(ctx, line, W / 2, ty + 43 + i * 9, { align: 'center', color: '#8b9bb4' }));
      if (nightmare) drawText(ctx, fitLine(NIGHTMARE.desc, width - 8), W / 2, ty + 72, { align: 'center', color: '#f6757a' });
    }
    const controlsY = Math.min(H - 45, 186), musicW = Math.min(210, W - 140);
    const musicX = Math.round((W - musicW - 108) / 2), beginX = musicX + musicW + 8;
    this.musicPicker.draw(ctx, ui, { x: musicX, y: controlsY, w: musicW, h: 16 }, app.settings.combatMusic);
    if (button(ctx, ui, 'begin', beginX, controlsY, 100, 16, 'BEGIN', { color: '#fee761' })) {
      stopCombatMusicPreview();
      if (mode === 's15' && (app.choice.map ?? 'forest') !== map) app.choice.map = map;
      app.startRun();
    }
    const back = () => { this.step = 'destination';ui.focus('m_' + mode);ui.lock(0.2); };
    if (button(ctx, ui, 'back', 14, H - 20, 50, 13, 'BACK', { fallback: true })) back();
    keysHint(ctx, W, H);
    if (this.musicPicker.open) {
      if (musicWasOpen) { ui.lockT = musicLock;ui.focusId = musicFocus;ui.focusSource = musicSource; }
      ui.items.length = 0;
      this.musicPicker.drawMenu(ctx, ui, W, H, app.settings.combatMusic, id => {
        app.settings.combatMusic = setCombatMusic(id);
        app.settings.musicTracks.battle = app.settings.combatMusic;
        saveSettings(app.settings);
      });
      ui.end();return;
    }
    if (mode !== 'ranked' && ui.lockT <= 0) {
      if (ui.focusId?.startsWith('d_') && input.pressed('down')) ui.focus('nightmare');
      else if (ui.focusId === 'nightmare' && input.pressed('down')) ui.focus('begin');
      else if (ui.focusId === 'nightmare' && input.pressed('up')) ui.focus('d_' + app.choice.diff);
      else if (ui.focusId === 'begin' && input.pressed('up')) ui.focus('nightmare');
    }
    if (ui.focusId === 'begin' && (input.pressed('left') || input.pressed('right')) && !input.pressed('up') && !input.pressed('down')) ui.focus('combat_music');
    ui.end();
    if (input.pressed('back')) back();
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
  enter(app, { focus } = {}) {
    const group = UPGRADE_GROUPS.find(([, , ids]) => ids.includes(focus));
    this.app = app;this.selected = group ? focus : 'might';this.busy = false;this.scroll = 0;this.seen = null;this.drag = null;
    app.ui.lock(0.2);app.ui.focusId = 'u_' + this.selected;playMusic('title');
  }
  buy(u) {
    this.selected = u.id;
    if (this.busy) return;
    const app = this.app, p = app.store.profile, rank = p.up[u.id] || 0;
    if (!DEBUG && (rank >= u.max || !upgradeOpen(p, u) || p.gold < upgradeCost(u.id, rank))) return;
    this.busy = true;this.message = null;
    // One activation buys one rank. The current row and scroll position stay put while saving.
    Promise.resolve().then(() => DEBUG ? app.store.setUpgrades({ [u.id]: rank >= u.max ? 0 : rank + 1 }) : app.store.buy(u.id))
      .then(ok => { if (ok) sfx('chest');else this.message = 'Purchase failed. Please try again.'; })
      .catch(() => { this.message = 'Purchase failed. Please try again.'; })
      .finally(() => { this.busy = false; });
  }
  draw(ctx, W, H, dt) {
    const app = this.app, ui = app.ui, p = app.store.profile;
    app.scene.draw(ctx, W, H, dt, { campfire: false });dim(ctx, W, H, 0.65);
    header(ctx, W, 'The Armory');goldTag(ctx, app, W - 6, 9);
    if (this.dialog) {
      const action = this.dialog.draw(ctx, ui, W, H, dt);
      if (action === 'refund' && !this.busy) { this.busy = true;Promise.resolve(app.store.refund()).catch(() => { this.message = 'Refund failed. Please try again.'; }).finally(() => { this.busy = false; }); }
      if (action) { this.dialog = null;ui.focus('u_' + this.selected);ui.lock(0.2); }
      return;
    }
    ui.begin(dt);
    drawText(ctx, 'Permanent upgrades · all heroes', W / 2, 26, { align: 'center', color: '#8b9bb4' });
    const ids = UPGRADE_GROUPS.flatMap(g => g[2]);
    const width = Math.min(W - 24, 540), x = Math.round((W - width) / 2), top = 43, height = H - top - 34;
    const listW = Math.min(190, Math.floor(width * 0.46)), gap = 10, detailX = x + listW + gap, detailW = width - listW - gap, step = 21;
    const detailH = Math.min(height, detailW < 150 ? 200 : 170);
    const most = Math.max(0, ids.length * step - height), m = input.mouse;
    const focused = ids.findIndex(id => ui.focusId === 'u_' + id);
    if (focused >= 0 && ui.focusId !== this.seen) {
      this.scroll = clamp(this.scroll, focused * step + step - height, focused * step);
      this.selected = ids[focused];
    }
    if (m.wheel) this.scroll += Math.sign(m.wheel) * step * 2;
    if (m.down && !this.drag && m.x >= x && m.x < x + listW && m.y >= top && m.y < top + height) this.drag = { y: m.y, from: this.scroll, moved: false };
    let dragged = false;
    if (this.drag) {
      if (Math.abs(m.y - this.drag.y) > 4) this.drag.moved = true;
      if (this.drag.moved) { this.scroll = this.drag.from - (m.y - this.drag.y);dragged = true; }
      if (!m.down) { if (this.drag.moved) m.clicked = false;this.drag = null; }
    }
    this.scroll = clamp(this.scroll, 0, most);
    ctx.save();ctx.beginPath();ctx.rect(x - 3, top, listW + 6, height);ctx.clip();
    ids.forEach((id, i) => {
      const u = UPGRADES.find(u => u.id === id), rank = p.up[id] || 0, open = upgradeOpen(p, u), maxed = rank >= u.max;
      const cy = top + i * step - this.scroll, f = ui.focused('u_' + id);
      if (ui.item('u_' + id, x, cy, listW, step - 2, { noMouse: dragged || m.y < top || m.y >= top + height, disabled: this.busy || (!DEBUG && (maxed || !open || p.gold < upgradeCost(id, rank))) })) this.buy(u);
      if (ui.focused('u_' + id)) this.selected = id;
      panel(ctx, x, cy, listW, step - 2, { rivets: false, fill: f ? '#241b2c' : '#15131f', trim: f ? ['#fee761', '#be4a2f'] : ['#3a4466', '#262b44'] });
      ctx.drawImage(SPR[UP_ICONS[id]].frames[0].c, x + 3, cy + 2);
      drawText(ctx, fitLine(u.name, listW - 49), x + 22, cy + 6, { color: !open ? '#5a6988' : f ? '#fee761' : '#ead4aa' });
      drawText(ctx, `${rank}/${u.max}`, x + listW - 5, cy + 6, { align: 'right', color: maxed ? '#9ee562' : '#8b9bb4' });
    });
    ctx.restore();
    if (most) {
      const thumb = Math.max(12, height * height / (ids.length * step));
      ctx.fillStyle = '#262b44';ctx.fillRect(x + listW + 3, top, 2, height);
      ctx.fillStyle = '#8b9bb4';ctx.fillRect(x + listW + 3, top + (height - thumb) * this.scroll / most, 2, thumb);
    }
    const selected = UPGRADES.find(u => u.id === this.selected), rank = p.up[selected.id] || 0, open = upgradeOpen(p, selected), maxed = rank >= selected.max;
    const cost = upgradeCost(selected.id, rank);
    panel(ctx, detailX, top, detailW, detailH, { rivets: false, fill: '#15131f' });
    let dy = top + 10;
    for (const [text, color] of [[selected.name, '#fee761'], [selected.desc, '#c0cbdc'], [`Rank ${rank}/${selected.max}`, '#ead4aa'], [`Current: ${upgradeEffect(p, selected.id)}`, '#8b9bb4'], [!open ? shortNeed(needText(PROGRESS.locks.find(l => l.id === selected.lock))) : maxed ? 'Fully upgraded' : `Next: ${upgradeEffect({ ...p, up: { ...p.up, [selected.id]: rank + 1 } }, selected.id)}`, maxed ? '#9ee562' : '#feae34']]) {
      for (const line of wrapText(text, detailW - 18)) { if (dy < top + detailH - 37) drawText(ctx, line, detailX + 9, dy, { color });dy += 9; }
      dy += 7;
    }
    const canBuy = !this.busy && (DEBUG || (!maxed && open && p.gold >= cost));
    const buyLabel = this.busy ? 'SAVING...' : DEBUG ? (maxed ? 'CLEAR RANKS' : 'ADD RANK - FREE') : maxed ? 'FULLY UPGRADED' : !open ? 'LOCKED' : `BUY - ${cost} G`;
    if (button(ctx, ui, 'buy_upgrade', detailX + 8, top + detailH - 24, detailW - 16, 16, buyLabel, { color: '#fee761', disabled: !canBuy })) this.buy(selected);
    if (top + detailH + 20 < H - 34) {
      const hint = input.device === 'touch' ? 'Tap an upgrade to buy' : input.device === 'pad' ? `${padKey('A')} buys one rank` : 'ENTER or click buys one rank';
      wrapText(hint, detailW - 16).forEach((line, i) => drawText(ctx, line, detailX + detailW / 2, top + detailH + 9 + i * 9, { align: 'center', color: '#8b9bb4' }));
    }

    this.seen = ui.focusId;
    if (button(ctx, ui, 'back', 14, H - 20, 50, 13, 'BACK', { fallback: true })) app.go('title');
    if (this.message) drawText(ctx, this.message, W / 2, H - 34, { align: 'center', color: '#f6757a' });
    if (button(ctx, ui, DEBUG ? 'clearall' : 'refund', W - 98, H - 20, 90, 13, DEBUG ? 'CLEAR ALL' : 'REFUND ALL', { disabled: this.busy || !Object.values(p.up).some(Boolean) })) {
      if (DEBUG) app.store.setUpgrades(Object.fromEntries(UPGRADES.map(u => [u.id, 0])));
      else { this.dialog = new MenuDialog('Refund upgrades?', ['Return all purchased ranks to gold.', 'This removes their bonuses from future runs. You can buy them again.'], [{ id: 'refund', label: 'REFUND ALL UPGRADES' }]);ui.focus('detail_close');ui.lock(0.2); }
    }
    if (DEBUG && button(ctx, ui, 'maxall', Math.round(W / 2 - 40), H - 20, 80, 13, 'MAX ALL')) app.store.setUpgrades(Object.fromEntries(UPGRADES.map(u => [u.id, u.max])));
    if (ui.lockT <= 0) {
      const at = ids.findIndex(id => ui.focusId === 'u_' + id);
      if (at >= 0) {
        ui.take('up', 'down', 'left', 'right');
        const dir = input.pressed('down') - input.pressed('up');
        if (dir) { ui.focus(at === ids.length - 1 && dir > 0 ? 'back' : 'u_' + ids[clamp(at + dir, 0, ids.length - 1)]);ui.focusSource = 'keys'; }
        if (input.pressed('right') && canBuy) ui.focus('buy_upgrade');
      } else if (ui.focusId === 'buy_upgrade') {
        ui.take('up', 'down', 'left', 'right');
        if (input.pressed('left')) ui.focus('u_' + this.selected);
      } else if (input.pressed('up')) {
        ui.take('up');ui.focus('u_' + this.selected);
      }
    }
    ui.end();if (input.pressed('back')) app.go('title');
  }
}

// ------------------------------------------------------------------ codex --

// The collection in three tabs, four tiles to a row and a short panel under them (the owner's, 27
// October 2026: the screen filled, easy to find one's way about): WEAPONS, with the exclusion slots
// last, RELICS and owned heroes' ULTIMATES, each tab telling how many are open. All within reach of
// the keys: the arrows walk the grid and it scrolls to follow, up off its top row onto the tabs; Q
// and E (a pad's shoulders) the tab before or after from anywhere; Page Up and Page Down a
// screenful at a time; the tile in focus is told in full in the panel under the grid, no window to
// open; Enter on an open weapon is a switch, out of runs or back in; Escape goes back to the title,
// onto CODEX. The wheel and a touch drag scroll it too.
export const CODEX_TILE = { min: 112, max: 152, h: 44, gap: 6, top: 54, foot: 30, detail: 88 };
export const CODEX_TABS = [['weapon', 'WEAPONS'], ['relic', 'RELICS'], ['ult', 'ULTIMATES']];
let codexLastTab = 'weapon'; // the tab the Codex opens on: the one last left

export function menuEntries(profile) {
  const entries = codexEntries(profile), hidden = entries.filter(e => e.hidden);
  // One discovery card replaces a wall of identical mystery requirements.
  const visible = entries.filter(e => !e.hidden || e === hidden[0]).map(e => e === hidden[0] ? { ...e, hiddenCount: hidden.length } : e);
  return ['feature', 'weapon', 'relic', 'ult'].flatMap(type => visible.filter(e => e.type === type));
}

// One tab's tiles, in menuEntries' order: the weapons' with the exclusion slots after them.
export function codexTab(profile, tab) {
  const all = menuEntries(profile);
  return [...all.filter((e) => e.type === tab), ...(tab === 'weapon' ? all.filter((e) => e.type === 'feature') : [])];
}
const tabOf = (e) => (e.type === 'feature' ? 'weapon' : e.type);
const tileId = (e) => `cx_${e.type}_${e.id}`;

// One horizontal browsing row, with a fixed detail panel beneath it.
export function codexLayout(W, H, n) {
  const C = CODEX_TILE, gw = Math.min(620, W - 32), cw = Math.min(C.max, Math.max(C.min, Math.floor((gw - C.gap) / 3)));
  const step = cw + C.gap, most = Math.max(0, n * step - C.gap - gw);
  return { cols: Math.max(1, Math.floor((gw + C.gap) / step)), rows: 1, total: n, cw, ch: C.h, step, view: gw, most, gw,
    detail: Math.max(60, Math.min(180, H - C.top - C.h - C.foot - 34)), x0: Math.round((W - gw) / 2), y0: C.top };
}

const tileName = (e) => e.hiddenCount ? `${e.hiddenCount} hidden weapons` : codexName(e);
const slotsText = (used, level) => `${used} of ${level} exclusion slot${level === 1 ? '' : 's'} in use`;

// Whether Enter (or a click) on an entry switches it: an open weapon, back into runs, or out of
// them while an exclusion slot is free and it is not the last a run would offer (lastInPlay).
export function codexSwitchable(e, prof) {
  return e.type === 'weapon' && e.open && (e.home || ((prof.home?.length || 0) < exclusionState(prof).level && !lastInPlay(prof, e.id)));
}

// What the panel under the grid tells of an entry: what it does; shut, what opens it and how far
// along; an open weapon, whether runs offer it and the exclusion slots.
export function codexDetail(e, prof) {
  const lines = [codexDescription(e)];
  const slots = exclusionState(prof), used = prof.home?.length || 0;
  if (e.type === 'feature') {
    const next = e.next ? ` · next slot at ${fmtNum(e.next)}` : '';
    lines.push({ text: `${slotsText(used, slots.level)} · ${fmtNum(prof.effort || 0)} kills counted${next}`, color: '#fee761' });
    lines.push({ text: EFFORT_NOTE, color: '#8b9bb4' });
  } else if (!e.open && !e.hidden) {
    lines.push({ text: [shortNeed(e.need), codexRecord(e)].filter(Boolean).join(' · '), color: '#feae34' });
    if (PROGRESS.locks.find((l) => l.type === e.type && l.id === e.id)?.need === 'kills') lines.push({ text: EFFORT_NOTE, color: '#8b9bb4' });
  }
  const recipe = evolutionRecipe(e, prof);
  if (recipe) lines.push({ text: recipe, color: '#fee761' });
  if (e.type === 'relic' && e.open) lines.push(`${PASSIVES[e.id].max} ranks · bonuses apply during a run`);
  if (e.type === 'weapon' && e.open) {
    if (e.home) lines.push({ text: `Excluded: never offered in runs · ${slotsText(used, slots.level)}`, color: '#f6757a' });
    else if (lastInPlay(prof, e.id)) lines.push({ text: 'Offered in runs · the last weapon a run offers stays in', color: '#feae34' });
    else if (used < slots.level) lines.push({ text: `Offered in runs · ${slotsText(used, slots.level)}`, color: '#9ee562' });
    else {
      const more = slots.next ? ` · ${slots.level ? 'another' : 'one'} at ${fmtNum(slots.next)} kills counted as on Veteran` : '';
      lines.push({ text: `Offered in runs · ${slots.level ? 'every exclusion slot in use' : 'no exclusion slot yet'}${more}`, color: '#feae34' });
    }
  }
  return lines;
}

export class CodexScreen {
  enter(app, params = {}) {
    this.app = app;
    this.back = params.back || 'title';
    this.scroll = 0; // horizontal pixels, easing to want
    this.want = 0;
    this.drag = null; // a press in the grid: where it began, and whether it has become a drag
    this.seen = null; // the focus last frame: a new one by the keys is scrolled into view
    this.shown = null; // the tile the panel tells of: the last in focus, kept while BACK has it
    this.tab = codexLastTab;
    // The seen list as the Codex opened (no NEW marks without one), and the new tiles shown in full
    // since: seen, once the Codex is left (exit; the review's C5, 28 October 2026).
    this.fresh = seenBox.read();
    this.looked = new Set();
    app.ui.lock(0.2);
    app.ui.focusId = tileId(codexTab(app.store.profile, this.tab)[0]);
  }

  draw(ctx, W, H, dt) {
    const app = this.app, ui = app.ui, prof = app.store.profile;
    app.scene.draw(ctx, W, H, dt, { campfire: false });
    dim(ctx, W, H, 0.6);
    header(ctx, W, 'The Codex');
    ui.begin(dt);
    // A tile of another tab put in focus from outside: its tab shown.
    const held = menuEntries(prof).find((e) => ui.focusId === tileId(e));
    if (held) this.setTab(tabOf(held));
    this.tabKeys(prof);
    this.tabs(ctx, ui, W, prof);
    const list = codexTab(prof, this.tab);
    const L = codexLayout(W, H, list.length);
    this.page(list, L);
    this.scrollGrid(L, dt);
    // The focus moved onto a tile by the keys or a pad: brought into view.
    const at = list.findIndex((e) => ui.focusId === tileId(e));
    if (ui.focusId !== this.seen) this.message = null;
    if (at >= 0 && ui.focusId !== this.seen) {
      const left = at * L.step;
      if (left < this.want) this.want = left;
      else if (left + L.cw > this.want + L.view) this.want = left + L.cw - L.view;
      this.want = clamp(this.want, 0, L.most);
    }
    const m = input.mouse, out = m.x < L.x0 || m.x >= L.x0 + L.view || m.y < L.y0 || m.y >= L.y0 + L.ch || !!this.drag?.moved;
    ctx.save();ctx.beginPath();ctx.rect(L.x0, L.y0, L.view, L.ch);ctx.clip();
    list.forEach((e, i) => {
      const x = Math.round(L.x0 + i * L.step - this.scroll), y = L.y0, fid = tileId(e);
      if (ui.item(fid, x, y, L.cw, L.ch, { noMouse: out, disabled: !codexSwitchable(e, prof) })) this.toggle(e);
      const f = ui.focused(fid);
      if (f) this.shown = fid;
      if (x + L.cw >= L.x0 && x <= L.x0 + L.view) this.tile(ctx, e, x, y, L.cw, L.ch, f);
      if (x >= L.x0 && x + L.cw <= L.x0 + L.view && isNewEntry(e, this.fresh)) this.looked.add(seenKey(e));
    });
    ctx.restore();
    if (L.most > 0) {
      const whole = L.view + L.most, bw = Math.max(16, Math.round(L.view * L.view / whole));
      ctx.fillStyle = '#262b44';ctx.fillRect(L.x0, L.y0 + L.ch + 5, L.view, 2);
      ctx.fillStyle = '#8b9bb4';ctx.fillRect(L.x0 + Math.round((L.view - bw) * this.scroll / L.most), L.y0 + L.ch + 5, bw, 2);
    }
    const shown = list.find(e => tileId(e) === this.shown) || list[0];
    if (shown) this.drawDetail(ctx, shown, L.x0, L.y0 + L.ch + 34, L.gw, L.detail);
    const shownIndex = Math.max(0, list.indexOf(shown));
    drawText(ctx, `${shownIndex + 1} / ${list.length} · SCROLL TO BROWSE`, W / 2, L.y0 + L.ch + 11, { align: 'center', color: '#8b9bb4' });
    if (button(ctx, ui, 'back', 14, H - 20, 50, 13, 'BACK', { fallback: true })) this.exit();
    const weapon = at >= 0 && list[at].type === 'weapon' && list[at].open;
    keysHint(ctx, W, H, `ARROWS move · Q/E tabs · ${weapon ? `ENTER ${list[at].home ? 'include' : 'exclude'} · ` : ''}ESC back`);
    if (at >= 0 && ui.lockT <= 0) {
      const dir = input.pressed('right') - input.pressed('left');
      if (dir) { ui.take('left', 'right');ui.focus(tileId(list[clamp(at + dir, 0, list.length - 1)])); }
      if (input.pressed('up')) { ui.take('up');ui.focus('ct_' + this.tab); }
      if (input.pressed('down')) { ui.take('down');ui.focus('back'); }
    }
    ui.end();
    this.seen = ui.focusId;
    if (input.pressed('back')) this.exit();
  }

  exit() {
    seenBox.add('codex', this.looked || []);
    codexLastTab = this.tab;
    this.app.go(this.back, this.back === 'title' ? { focus: 'codex' } : {});
  }

  // Another tab: its grid from the top, its panel on its first tile.
  setTab(tab) {
    if (tab === this.tab) return;
    this.tab = tab;
    this.scroll = this.want = 0;
    this.shown = null;
  }

  // The tabs over the grid, each with how many of its kind are open (the hidden weapons among the
  // shut). A click picks one; so does the focus brought onto one by the keys, and up or down into
  // the row lands on the one shown.
  tabs(ctx, ui, W, prof) {
    const all = codexEntries(prof);
    const tw = Math.min(104, Math.floor((W - 32) / 3)), tx = Math.round((W - 3 * tw - 8) / 2);
    CODEX_TABS.forEach(([id, label], i) => {
      const of = all.filter((e) => e.type === id), bid = `ct_${id}`, on = this.tab === id;
      const text = `${label} ${of.filter((e) => e.open).length}/${of.length}`;
      if (button(ctx, ui, bid, tx + i * (tw + 4), 25, tw, 14, text, { on, group: 'codex_tabs', home: on })) this.setTab(id);
      if (ui.focused(bid) && ui.focusSource !== 'pointer') this.setTab(id);
      // A NEW mark while the tab holds a new entry not yet shown in full.
      if (all.some((e) => tabOf(e) === id && isNewEntry(e, this.fresh) && !this.looked.has(seenKey(e)))) newDot(ctx, tx + i * (tw + 4) + tw - 9, 30);
    });
  }

  // Q and E (a pad's shoulders): the tab before or after, round and round; the focus goes with it,
  // onto the new tab's button from the tabs, onto its first tile from the grid.
  tabKeys(prof) {
    const ui = this.app.ui, dir = input.pressed('tabNext') - input.pressed('tabPrev');
    if (!dir || ui.lockT > 0) return;
    const i = CODEX_TABS.findIndex(([id]) => id === this.tab);
    const to = CODEX_TABS[(i + dir + CODEX_TABS.length) % CODEX_TABS.length][0];
    const first = codexTab(prof, to)[0];
    const onTabs = ui.focusId?.startsWith('ct_') || !first;
    this.setTab(to);
    ui.focusId = onTabs ? `ct_${to}` : tileId(first);
    ui.focusSource = 'keys';
    sfx('ui');
  }

  // Enter, Space or a click on an open weapon: out of runs, or back in (codexSwitchable; on any
  // other tile the UI denies it).
  toggle(e) {
    if (this.busy) return;
    this.busy = true;
    const failed = () => { this.message = 'Could not save weapon choice. Try again.'; };
    this.app.store.setHome(e.id, !e.home).then((ok) => { if (!ok) failed(); }).catch(failed).finally(() => { this.busy = false; });
  }

  // Page Up and Page Down: the focus a screenful of rows up or down the grid (the grid follows it).
  page(list, L) {
    const ui = this.app.ui, dir = input.pressed('pageDown') - input.pressed('pageUp');
    if (!dir || ui.lockT > 0) return;
    const at = list.findIndex((e) => ui.focusId === tileId(e));
    const to = clamp(at < 0 ? 0 : at + dir * L.rows * L.cols, 0, list.length - 1);
    if (to === at || !list.length) return;
    ui.focusId = tileId(list[to]);
    ui.focusSource = 'keys';
    sfx('ui');
  }

  // The panel under the grid: the entry's name on its plate, then all codexDetail tells of it, the
  // lines past its room cut short; a failed save first, in red.
  drawDetail(ctx, e, x, y, w, h) {
    panel(ctx, x, y, w, h, { title: tileName(e), fill: '#15131f', rivets: false });
    const lines = codexDetail(e, this.app.store.profile);
    if (this.message) lines.unshift({ text: this.message, color: '#f6757a' });
    const rows = lines.flatMap((l) => {
      const o = typeof l === 'string' ? { text: l } : l;
      return wrapText(o.text, w - 20).map((text) => ({ text, color: o.color || '#c0cbdc' }));
    });
    const room = Math.floor((h - 16) / 9);
    if (rows.length > room) rows[room - 1].text = fitLine(rows[room - 1].text + '…', w - 20);
    rows.slice(0, room).forEach((r, i) => drawRich(ctx, r.text, x + 10, y + 11 + i * 9, { color: r.color, hi: '#fee761' }));
  }

  // The wheel moves one card; dragging the row scrolls without activating a weapon.
  scrollGrid(L, dt) {
    const m = input.mouse;
    if (m.wheel) this.want += Math.sign(m.wheel) * L.step;
    if (m.down && !this.drag && m.x >= L.x0 && m.x < L.x0 + L.view && m.y >= L.y0 && m.y < L.y0 + L.ch) this.drag = { x: m.x, from: this.want, moved: false };
    if (this.drag) {
      if (Math.abs(m.x - this.drag.x) > 4) this.drag.moved = true;
      if (this.drag.moved) this.want = this.scroll = clamp(this.drag.from - (m.x - this.drag.x), 0, L.most);
      if (!m.down) {
        if (this.drag.moved) m.clicked = false;
        this.drag = null;
      }
    }
    this.want = clamp(this.want, 0, L.most);
    this.scroll += (this.want - this.scroll) * Math.min(1, dt * 14);
    if (Math.abs(this.want - this.scroll) < 0.5) this.scroll = this.want;
  }

  // One entry's tile: its icon and name; under them, in up to two lines, shut, what opens it over a
  // bar of how far the records have come; open, what it does. An open weapon has its switch in the
  // top corner: on while runs offer it.
  tile(ctx, e, x, y, w, h, f) {
    const open = e.open, sw = e.type === 'weapon' && open;
    panel(ctx, x, y, w, h, { trim: f ? ['#fee761', '#be4a2f'] : open ? ['#5a6988', '#3a4466'] : ['#3a4466', '#262b44'], rivets: false, fill: open ? '#15131f' : '#120e18' });
    codexIcon(ctx, e, x + 4, y + Math.floor((h - 16) / 2));
    const tx = x + 23, room = w - 27;
    drawText(ctx, fitLine(tileName(e), sw ? room - 17 : room), tx, y + 3, { color: !open ? (f ? '#c0cbdc' : '#8b9bb4') : f ? '#fee761' : '#ead4aa' });
    const lines = wrapText(e.home ? 'Excluded from runs' : codexSummary(e), room);
    if (lines.length > 2) lines[1] = fitLine(lines.slice(1).join(' '), room);
    lines.slice(0, 2).forEach((line, i) => drawText(ctx, line, tx, y + 12 + i * 9, { color: e.home ? '#f6757a' : open ? '#c0cbdc' : '#c28569' }));
    if (!open || (e.type === 'feature' && e.next)) codexBar(ctx, tx, y + h - 4, room, e.progress, '#feae34');
    if (sw) codexSwitch(ctx, x + w - 18, y + 4, !e.home);
    // New since this browser last looked (the review's C5): a green dot in its corner.
    if (isNewEntry(e, this.fresh)) newDot(ctx, x + 2, y + 2);
  }
}

// An open weapon's switch, 14 x 7 at (x, y): green with the knob right while runs offer the
// weapon, iron with the knob left while it is excluded.
function codexSwitch(ctx, x, y, on) {
  ctx.fillStyle = '#0d0b14';
  ctx.fillRect(x, y, 14, 7);
  ctx.fillStyle = on ? '#3e8948' : '#3a4466';
  ctx.fillRect(x + 1, y + 1, 12, 5);
  ctx.fillStyle = on ? '#9ee562' : '#8b9bb4';
  ctx.fillRect(on ? x + 8 : x + 1, y + 1, 5, 5);
}

// A tile's bar, w wide at (x, y): k of it filled in col over an empty iron groove (the results'
// NEXT bar too, ui/gamescreen.js heroGoalBar).
export function codexBar(ctx, x, y, w, k, col) {
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
    // Three tabs side by side, narrower on a narrow screen.
    const tabs = ['overview', 'heroes', 'ranked'], tw = Math.min(100, Math.floor((W - 24 - 8 * (tabs.length - 1)) / tabs.length));
    const tx = Math.round(W / 2 - (tabs.length * tw + 8 * (tabs.length - 1)) / 2);
    for (const [i, id] of tabs.entries()) if (button(ctx, ui, 'records_' + id, tx + i * (tw + 8), 28, tw, 15, id.toUpperCase(), { on: this.tab === id })) this.tab = id;
    if (this.tab === 'heroes') this.drawHeroes(ctx, W, H, p);
    const rows = this.tab === 'heroes' ? [] : this.tab === 'overview' ? [
      ['Nights won', String(p.wins.s15.reduce((a,b) => a+b, 0))],
      ['Dungeons cleared', String(p.wins.dungeon.reduce((a,b) => a+b, 0))],
      ['Runs played', fmtNum(p.runs)], ['Monsters slain', fmtNum(p.kills)],
      ['Most kills / run', fmtNum(p.best.kills)], ['Highest level', String(p.best.level)],
      ['Longest night', fmtTime(p.best.s15)], ['Deepest floor', p.best.dungeon >= 4 ? 'Conquered' : String(p.best.dungeon || '—')],
      ['Heroes recruited', `${p.heroes.length}/${HERO_ORDER.length}`],
    ] : HERO_ORDER.map(h => [HEROES[h].title, p.ranked[h] ? `${fmtTime(p.ranked[h])} · ${rankTitle(p.ranked[h])}` : 'No record']);
    const w = Math.min(380, W - 24), x = Math.round((W - w) / 2), step = Math.min(22, Math.floor((H - 86) / Math.max(1, rows.length)));
    if (rows.length) panel(ctx, x, 54, w, rows.length * step + 12, { rivets: false, fill: '#15131f' });
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

  // HEROES: what each hero has won, by mode and difficulty (the review of 27 October 2026: the cards
  // drew a win's marks as coloured stars and nothing said what they were, and the Records added
  // every difficulty's wins together). A column for a night won, then one each for a night won on
  // Veteran, on Elite and in a Nightmare, and the same four for the Dungeon (ladder.js featStars),
  // each star in its colour, and what the colours are under them. The six-step mastery row the
  // review asked for on the hero screen is not made yet.
  drawHeroes(ctx, W, H, p) {
    const n = HERO_ORDER.length, w = Math.min(380, W - 24), x = Math.round((W - w) / 2);
    const step = Math.min(18, Math.floor((H - 112) / (n + 1))), cell = 14, right = x + w - 10;
    // The centre of column j: the Dungeon's four at the right, two cells' gap, the night's before them.
    const cx = (j) => Math.round(right - cell / 2 - (7 - j) * cell - (j < 4 ? cell : 0));
    panel(ctx, x, 54, w, (n + 1) * step + 12, { rivets: false, fill: '#15131f' });
    drawText(ctx, 'NIGHT', Math.round((cx(0) + cx(3)) / 2), 61, { align: 'center', color: '#8b9bb4' });
    drawText(ctx, 'DUNGEON', Math.round((cx(4) + cx(7)) / 2), 61, { align: 'center', color: '#8b9bb4' });
    HERO_ORDER.forEach((h, i) => {
      const y = 61 + (i + 1) * step;
      if (i % 2 === 0) { ctx.fillStyle = '#1d1b2a';ctx.fillRect(x + 3, y - 2, w - 6, step); }
      drawText(ctx, HEROES[h].title, x + 10, y, { color: p.heroes.includes(h) ? '#c0cbdc' : '#5a6988' });
      featStars(p, h).forEach(([, col, got], j) => drawText(ctx, got ? '★' : '·', cx(j), y, { align: 'center', color: got ? col : '#3a4466' }));
    });
    // The key: a win's star (gold for a night, green for the Dungeon), then the three marks.
    const key = [[['#fee761', '#9ee562'], 'won'], [['#c28569'], 'Veteran'], [['#c0cbdc'], 'Elite'], [['#e43b44'], 'Nightmare']];
    const star = textWidth('★') + 1, gap = 10, words = key.map(([cols, t]) => cols.length * star + textWidth(' ' + t));
    let kx = Math.round(W / 2 - (words.reduce((s, v) => s + v, 0) + gap * (key.length - 1)) / 2);
    const ky = 54 + (n + 1) * step + 18;
    key.forEach(([cols, t], k) => {
      cols.forEach((col, c) => drawText(ctx, '★', kx + c * star, ky, { color: col }));
      drawText(ctx, ' ' + t, kx + cols.length * star, ky, { color: '#8b9bb4' });
      kx += words[k] + gap;
    });
  }
}

// ---------------------------------------------------------------- options --

export class OptionsScreen {
  enter(app, params = {}) {
    this.app = app;
    this.back = params.back || 'title';
    this.confirmReset = false;
    this.musicMenu = null;
    app.ui.lock(0.2);
    app.ui.focusId = 'o_music';
  }

  draw(ctx, W, H, dt, embedded = false) {
    const app = this.app, ui = app.ui, s = app.settings;
    const changed = () => {
      saveSettings(s);
      setVolumes(s.music, s.sfx);
      app.applySettings();
    };
    if (!embedded) {
      app.scene.draw(ctx, W, H, dt, { campfire: false });
      dim(ctx, W, H, 0.55);
    } else dim(ctx, W, H, 0.7);
    if (this.musicMenu) {
      if (this.musicMenu.draw(ctx, W, H, dt) === 'close') {
        this.musicMenu = null;
        ui.focus('o_tracks');
      }
      return null;
    }
    header(ctx, W, 'Options');
    if (this.dialog) {
      const action = this.dialog.draw(ctx, ui, W, H, dt);
      if (action === 'reset') app.store.reset();
      if (action === 'low' || action === 'standard') {
        const low = action === 'low';
        Object.assign(s, { softFlash: low, shake: !low, numbers: !low, weather: !low });
        changed();
      }
      if (action) { this.dialog = null;ui.focus('o_music');ui.lock(0.2); }
      return null;
    }
    ui.begin(dt);
    const w = Math.min(220, W - 30), x = Math.round(W / 2 - w / 2);
    let y = 36;
    // Ten rows, and RESET PROGRESS below them, must stay clear of CONTROLS and CREDITS at H - 44 on
    // a short window (27 October 2026: an 854x480 itch.io embed is 240 high), so a short screen
    // packs the rows down to 14 apart and then narrows the spacer before RESET PROGRESS, and the
    // column ends two pixels above the footer buttons.
    const foot = H - 46, rows = 10;
    const step = clamp(Math.floor((foot - y - 13 - (embedded ? 0 : 8)) / (embedded ? rows - 1 : rows)), 13, 17);
    const gap = clamp(foot - y - 13 - rows * step, 2, 8);
    let d = stepper(ctx, ui, 'o_music', x, y, w, 'MUSIC VOLUME', `${Math.round(s.music * 100)}%`);
    if (d) {
      s.music = clamp(Math.round(s.music * 10 + d) / 10, 0, 1);
      changed();
    }
    y += step;
    if (button(ctx, ui, 'o_tracks', x, y, w, 13, 'CHOOSE MUSIC')) this.musicMenu = new MusicMenu(app);
    y += step;
    d = stepper(ctx, ui, 'o_sfx', x, y, w, 'SOUND EFFECTS', `${Math.round(s.sfx * 100)}%`);
    if (d) {
      s.sfx = clamp(Math.round(s.sfx * 10 + d) / 10, 0, 1);
      changed();
      sfx('hit');
    }
    y += step;
    // FLASHES: FULL, or SOFT for eyes that want less (27 October 2026): white flashes held to
    // FLASH_SOFT, crits in steady gold, no white pulse on a boss's bar.
    if (stepper(ctx, ui, 'o_flash', x, y, w, 'FLASHES', s.softFlash ? 'SOFT' : 'FULL')) {
      s.softFlash = !s.softFlash;
      changed();
    }
    y += step;
    for (const [key, label] of [['shake', 'SCREEN SHAKE'], ['numbers', 'DAMAGE NUMBERS'], ['weather', 'WEATHER'], ['crt', 'CRT SCANLINES'], ['fps', 'SHOW FPS']]) {
      if (stepper(ctx, ui, 'o_' + key, x, y, w, label, s[key] ? 'ON' : 'OFF')) {
        s[key] = !s[key];
        changed();
      }
      y += step;
    }
    const half = Math.floor((w - 4) / 2);
    if (button(ctx, ui, 'o_full', x, y, half, 13, document.fullscreenElement ? 'EXIT FULLSCREEN' : 'FULLSCREEN')) app.toggleFullscreen();
    if (button(ctx, ui, 'o_effects', x + half + 4, y, w - half - 4, 13, 'EFFECTS PRESETS')) {
      this.dialog = new MenuDialog('Effects presets', [
        'Low effects softens flashes and turns off shake, damage numbers, and ambient weather.',
        'Enemy warnings and reward information stay visible. Each setting can be adjusted afterward.',
      ], [{ id: 'low', label: 'LOW EFFECTS' }, { id: 'standard', label: 'STANDARD EFFECTS' }]);
      ui.focus('detail_close');
      ui.lock(0.2);
    }
    y += step;
    // Erasing everything stands apart from the rest, so a press too many down the list can't land on it.
    y += gap;
    if (!embedded) {
      if (button(ctx, ui, 'o_reset', x, y, w, 13, 'RESET PROGRESS', { color: '#f6757a' })) {
        this.dialog = new MenuDialog('Erase progress?', ['This deletes your gold, heroes, equipment, upgrades and records.', 'This cannot be undone.'], [{ id: 'reset', label: 'ERASE ALL PROGRESS', color: '#f6757a' }]);ui.focus('detail_close');ui.lock(0.2);
      }
      y += step;
    }
    if (button(ctx, ui, 'back', 14, H - 20, 50, 13, 'BACK', { fallback: true }) || input.pressed('back')) {
      if (embedded) return 'close';
      app.go(this.back);
    }
    if (button(ctx, ui, 'controls', W / 2 - 104, H - 44, 100, 15, 'CONTROLS')) {
      this.dialog = new MenuDialog('Controls', ['Move: WASD / arrows · gamepad stick / D-pad · drag on touch', `Ultimate: Space / E / Q · gamepad ${padKey('X')} / triggers · tap fury orb`, 'Crypt strike: X / Shift · shoulder buttons · second finger', 'Pause: Esc / P · Start · pause button', 'Map: Tab / M · gamepad Back', 'Fullscreen: F11 · F outside a fight', 'Menus: arrows to browse, Enter to choose, Escape to go back.', 'Level-up: 1–4 choose · R reroll · B banish']);ui.focus('detail_close');ui.lock(0.2);
    }
    if (button(ctx, ui, 'credits', W / 2 + 4, H - 44, 100, 15, 'CREDITS')) {
      this.dialog = new MenuDialog('Credits', [
        'Choose regular battle music before BEGIN. Options and Pause offer separate MENU, BATTLE, BOSS and CRYPT tracks, with ten-second previews. Music credits: audio/music/CREDITS.md',
        'Sound effects: 0 A.D. by Wildfire Games, Flare, UFO: Alien Invasion, MegaGlest, Ardentryst, HyperRogue (CC BY-SA); OpenClonk by K-Pone (CC BY); artisticdude, Ogrebane, Jan Schupke, Stendhal, Endless Sky, M.A.R.S. (CC0 / public domain)',
        'UI: Foozle Lucifer RPG UI and Kenney Fantasy UI Borders (CC0).',
        'Fonts: Pixtura12 by eishiya; Jacquard by Sarah Cadigan-Fried (SIL OFL).',
        'Full credits and licences for every track and sound are included with the game.',
      ]);ui.focus('detail_close');ui.lock(0.2);
    }
    keysHint(ctx, W, H, 'ARROWS adjust · ENTER select · ESC back');
    ui.end();
    return null;
  }

  leave() {
    this.musicMenu?.close();
  }
}
