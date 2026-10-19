// Menu screens: title, hero select, trial select, armory, records, options.

import { input } from '../engine/input.js';
import { sfx, playMusic, setVolumes, initAudio } from '../engine/audio.js';
import { SPR, walkFrame } from '../engine/sprites.js';
import { saveSettings, DEBUG } from '../engine/storage.js';
import { presentBackdrop } from '../engine/view.js';
import { fmtTime, fmtNum, clamp } from '../engine/util.js';
import { HEROES, HERO_ORDER, HERO_LINE, startWeapons } from '../data/heroes.js';
import { rimRing, silhouette, hexPack } from '../engine/pixels.js';
import { trialScene, SCENE, heroCrop, portraitBackdrop, pixelEllipse, mix, PORTRAIT } from './scenes.js';
import { WEAPONS } from '../data/weapons.js';
import { MODES, NORMAL, VETERAN, NIGHTMARE } from '../data/difficulty.js';
import { UPGRADES, upgradeCost, totalWins, HERO_UNLOCK_TIME, nextHeroUnlock, nextGoal, canPlay, rankTitle, modeUnlocked } from '../shared/profile.js';
import { panel, button, stepper, checkbox, checkboxWidth, logo, dim, drawText, wrapText, textWidth, textCanvas } from './ui.js';
import { goalText, lockReason, featStars } from './ladder.js';

const UP_ICONS = {
  might: 'i_might', armor: 'i_armor', vitality: 'i_vitality', recovery: 'i_regen', haste: 'i_cooldown', reach: 'i_area',
  swiftness: 'i_movespeed', magnet: 'i_magnet', fortune: 'i_luck', wisdom: 'i_growth', greed: 'i_greed', reroll: 'i_reroll', revival: 'i_revival',
  endurance: 'i_duration', velocity: 'i_projspeed', echo: 'i_amount',
};

function goldTag(ctx, app, x, y, align = 'right') {
  const g = fmtNum(app.store.profile.gold);
  const w = textWidth(g) + 12;
  const left = align === 'right' ? x - w : x;
  ctx.drawImage(SPR.h_coin.frames[0].c, left, y);
  drawText(ctx, g, left + 10, y + 1, { color: ['#fff3a8', '#fee761', '#feae34'] });
}

function header(ctx, W, title, y = 8) {
  const c = textCanvas(title, ['#fff6c2', '#fee761', '#feae34', '#d77643'], '#181425');
  ctx.drawImage(c, Math.round(W / 2 - c.width), y, c.width * 2, c.height * 2);
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
    // The campfire scene goes out first, so the knight's full picture sits
    // behind the logo and menu rather than over them.
    presentBackdrop();
    // On narrow (portrait) screens the title stacks onto two lines.
    const narrow = logo('FOREST SURVIVOR').width > W - 10;
    const L = narrow ? logo('SURVIVOR') : logo('FOREST SURVIVOR');
    const scale = Math.max(1, Math.min(2, Math.floor(((W - 20) / L.width) * 2) / 2));
    const lw = L.width * scale, lh = L.height * scale;
    let ly = Math.round(H * 0.1 + Math.sin(this.t * 1.5) * 2);
    if (narrow) {
      const top = logo('FOREST');
      ctx.drawImage(top, Math.round(W / 2 - (top.width * scale) / 2), ly, top.width * scale, top.height * scale);
      ly += top.height * scale + 2;
    }
    // Ember glow behind the logo.
    const gl = ctx.createRadialGradient(W / 2, ly + lh / 2, 4, W / 2, ly + lh / 2, lw * 0.6);
    gl.addColorStop(0, 'rgba(247,118,34,0.28)');
    gl.addColorStop(1, 'rgba(247,118,34,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(L, Math.round(W / 2 - lw / 2), ly, Math.round(lw), Math.round(lh));
    drawText(ctx, 'SURVIVE THE NIGHT · DELVE THE DEPTHS', W / 2, ly + lh + 4, { align: 'center', color: '#c0cbdc' });

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
    const items = [['play', 'NEW GAME'], ['armory', 'THE ARMORY'], ['records', 'RECORDS'], ['options', 'OPTIONS']];
    const bw = 104, bh = 15, gap = 4;
    let y = Math.round(Math.max(ly + lh + 18, H * 0.5 - (items.length * (bh + gap)) / 2 + 6));
    for (const [id, label] of items) {
      if (button(ctx, ui, id, Math.round(W / 2 - bw / 2), y, bw, bh, label)) this.pick(id);
      y += bh + gap;
    }
    ui.end();
    // Footer.
    const p = app.store.profile;
    goldTag(ctx, app, 6, H - 13, 'left');
    const wins = totalWins(p);
    ctx.drawImage(SPR.h_trophy.frames[0].c, W - 14 - textWidth(String(wins)), H - 13);
    drawText(ctx, String(wins), W - 5, H - 12, { align: 'right', color: '#fee761' });
    if (DEBUG) drawText(ctx, 'Debug: everything unlocked, saved apart from your own progress', W / 2, H - 12, { align: 'center', color: '#feae34' });
    else drawText(ctx, app.store.mode === 'server' ? 'Progress kept in encrypted cookies' : 'Progress kept in cookies (offline)', W / 2, H - 12, { align: 'center', color: '#3a4466' });
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
    else if (id === 'records') app.go('records');
    else if (id === 'options') app.go('options', { back: 'title' });
  }
}

// ------------------------------------------------------------------- hero --

// A hero's light line round a frame drawn at (dx, dy) at scale s, for a hero with a wide one in play
// (the Shadow, game.js drawHeroLine): on the menus' lighter ground one faint pixel is enough.
function heroLine(ctx, h, fr, dx, dy, s, a) {
  if (!h.line) return;
  ctx.globalAlpha = a;
  ctx.drawImage(fr.variant(`heroline${HERO_LINE}:1`, (b) => rimRing(b, HERO_LINE, 1)), dx - s, dy - s, (fr.w + 2) * s, (fr.h + 2) * s);
  ctx.globalAlpha = 1;
}

// The hero screen's cards and portrait draw every hero at one whole-number scale, from the largest
// crop of any hero's idle frames (heroCrop), so the five stand alike.
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
    header(ctx, W, 'CHOOSE YOUR HERO');
    goldTag(ctx, app, W - 6, 9);
    ui.begin(dt);
    const prof = app.store.profile;
    const next = nextHeroUnlock(prof);
    const n = HERO_ORDER.length;
    const cw = Math.min(64, Math.floor((W - 30) / n) - 6), ch = 66;
    const cs = cardScale(cw, ch); // the five heroes at one scale
    const total = n * cw + (n - 1) * 6;
    let x = Math.round(W / 2 - total / 2);
    const y = 32;
    let focusHero = null;
    for (const id of HERO_ORDER) {
      const h = HEROES[id];
      const locked = !prof.heroes.includes(id);
      const fid = 'h_' + id;
      // A locked hero can't be bought: five minutes with the one before bring them in.
      if (ui.item(fid, x, y, cw, ch) && !locked) {
        app.choice.hero = id;
        app.go('mode');
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
        const label = textWidth(h.title.toUpperCase()) <= cw - 2 ? h.title.toUpperCase() : h.short.toUpperCase();
        drawText(ctx, label, x + cw / 2, y + ch - 12, { align: 'center', color: f ? '#fee761' : '#c0cbdc' });
        // Achievement stars: night survived, Dungeon beaten.
        let sx = x + cw - 8;
        for (const [, col, got] of featStars(prof, id).reverse()) {
          if (got) drawText(ctx, '★', sx, y + 4, { color: col });
          sx -= 7;
        }
      }
      x += cw + 6;
    }
    focusHero = focusHero || 'knight';
    const bottom = this.detail(ctx, W, H, focusHero, y + ch + 8, !prof.heroes.includes(focusHero));
    let gy = bottom + 6;
    for (const line of wrapText('NEXT: ' + goalText(nextGoal(prof)), W - 24)) {
      if (gy > H - 32) break;
      drawText(ctx, line, W / 2, gy, { align: 'center', color: '#feae34' });
      gy += 9;
    }
    if (button(ctx, ui, 'back', 14, H - 20, 50, 13, 'BACK')) app.go('title');
    ui.end();
    if (input.pressed('back') && ui.lockT <= 0) app.go('title');
  }

  // The portrait frame: every hero's own sprite (the Knight's painted portrait gave way to it, so
  // the five match) at one whole-number scale for all five, in a box: a glow in his colour, a
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
    const h = HEROES[id];
    const pw = Math.min(W - 16, 330), ph = Math.min(H - y - 26, 120);
    const x = Math.round(W / 2 - pw / 2);
    panel(ctx, x, y, pw, ph, { title: `${h.name.toUpperCase()} — ${h.title.toUpperCase()}` });
    // The portrait frame, as tall as the panel allows over the line of stars under it.
    const artW = this.portrait(ctx, h, x + 10, y + 12, ph - 27, Math.round(pw * 0.42), locked);
    const tx = x + 10 + artW + 10;
    const tw = pw - (tx - x) - 8;
    let ty = y + 9;
    const stat = (label, v, max, col) => {
      drawText(ctx, label, tx, ty, { color: '#8b9bb4' });
      const bx = tx + 40, bw = Math.min(70, tw - 44);
      ctx.fillStyle = '#0d0b14';
      ctx.fillRect(bx, ty + 1, bw, 5);
      ctx.fillStyle = col;
      ctx.fillRect(bx + 1, ty + 2, Math.round((bw - 2) * clamp(v / max, 0, 1)), 3);
      ty += 9;
    };
    stat('HEALTH', h.stats.maxHp, 300, '#e43b44');
    stat('SPEED', h.stats.speed || 1, 1.25, '#2ce8f5');
    // What he starts with: one weapon, or the Necromancer's two side by side.
    const start = startWeapons(h).map((id) => WEAPONS[id]);
    start.forEach((w, i) => ctx.drawImage(SPR[w.icon].frames[0].c, tx - 1 + i * 17, ty - 1));
    const nx = tx + 17 * start.length;
    const names = wrapText(start.map((w) => w.name).join(' + '), tx + tw - nx);
    names.forEach((ln, i) => drawText(ctx, ln, nx, ty + 3 + i * 9 - (names.length - 1) * 4, { color: '#fee761' }));
    ty += 17;
    for (const line of wrapText(h.perk, tw)) {
      drawText(ctx, line, tx, ty, { color: '#c0cbdc' });
      ty += 9;
    }
    ty += 2;
    drawText(ctx, `ULTIMATE: ${h.ultName.toUpperCase()}`, tx, ty, { color: '#f6757a' });
    ty += 9;
    for (const line of wrapText(h.ultDesc, tw)) {
      if (ty > y + ph - 10) break;
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
    } else {
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
    header(ctx, W, 'CHOOSE YOUR TRIAL');
    ui.begin(dt);
    const prof = app.store.profile;
    const hero = app.choice.hero;
    const modes = Object.keys(MODES);
    const cw = Math.min(110, Math.floor((W - 24) / modes.length) - 6), ch = 84;
    const total = modes.length * cw + (modes.length - 1) * 6;
    let x = Math.round(W / 2 - total / 2);
    const y = 34;
    let focusMode = null;
    for (const m of modes) {
      const M = MODES[m];
      const fid = 'm_' + m;
      const open = canPlay(prof, m, hero);
      if (ui.item(fid, x, y, cw, ch, { disabled: !open })) {
        app.choice.mode = m;
        ui.focus('begin');
      }
      const f = ui.focused(fid);
      if (f) focusMode = m;
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
    // The focused trial's description, or what it takes to unlock it.
    const lockedFocus = focusMode && !canPlay(prof, focusMode, hero);
    const desc = lockedFocus ? `To unlock: ${lockReason(prof, focusMode, hero)}` : MODES[focusMode || mode].desc;
    let ty = y + ch + 5;
    for (const line of wrapText(desc, W - 20)) {
      drawText(ctx, line, W / 2, ty, { align: 'center', color: lockedFocus ? '#feae34' : '#c0cbdc' });
      ty += 9;
    }
    // Normal or Veteran (data/difficulty.js), and beside them the Nightmare box (twice the
    // monsters), all remembered with the settings. Ranked keeps one best per hero, so it is always
    // Veteran and never a Nightmare: there the box isn't shown.
    ty += 5;
    if (mode === 'ranked') {
      for (const line of wrapText(`Ranked is always played as Veteran, never as a ${NIGHTMARE.name}`, W - 20)) {
        drawText(ctx, line, W / 2, ty, { align: 'center', color: '#8b9bb4' });
        ty += 9;
      }
    } else {
      const label = NIGHTMARE.name.toUpperCase(), nightmare = app.choice.nightmare === true;
      const bw = 64, gap = 8, bx = Math.round(W / 2 - (2 * (bw + gap) + checkboxWidth(label)) / 2);
      [NORMAL, VETERAN].forEach((d, i) => {
        const dx = bx + i * (bw + gap), on = app.choice.diff === d.id;
        if (on) {
          ctx.fillStyle = '#feae34';
          ctx.fillRect(dx - 2, ty - 2, bw + 4, 17);
        }
        if (button(ctx, ui, 'd_' + d.id, dx, ty, bw, 13, d.name.toUpperCase(), { color: on ? '#fee761' : '#8b9bb4' })) {
          app.choice.diff = app.settings.diff = d.id;
          saveSettings(app.settings);
          sfx('select');
        }
      });
      if (checkbox(ctx, ui, 'nightmare', bx + 2 * (bw + gap), ty, label, nightmare, { color: '#f6757a' })) {
        app.choice.nightmare = app.settings.nightmare = !nightmare;
        saveSettings(app.settings);
      }
      ty += 19;
      const d = app.choice.diff === VETERAN.id ? VETERAN : NORMAL;
      for (const line of wrapText(d.desc, W - 20)) {
        drawText(ctx, line, W / 2, ty, { align: 'center', color: '#8b9bb4' });
        ty += 9;
      }
      if (app.choice.nightmare === true) {
        for (const line of wrapText(NIGHTMARE.desc, W - 20)) {
          drawText(ctx, line, W / 2, ty, { align: 'center', color: '#f6757a' });
          ty += 9;
        }
      }
    }
    const dy = ty + 6;
    let beginY = dy + 14;
    if (mode === 'ranked') {
      // The record to beat is this hero's best.
      const best = prof.ranked[hero] || 0;
      let ry = dy;
      for (const line of wrapText(best ? `Your best with the ${HEROES[hero].title}: ${fmtTime(best)} · ${rankTitle(best).toUpperCase()}` : `No Ranked run with the ${HEROES[hero].title} yet`, W - 20)) {
        drawText(ctx, line, W / 2, ry, { align: 'center', color: '#feae34' });
        ry += 9;
      }
      beginY = Math.max(beginY, ry + 6);
    }
    if (button(ctx, ui, 'begin', Math.round(W / 2 - 50), Math.min(H - 22, beginY), 100, 15, 'BEGIN', { color: '#fee761' })) app.startRun();
    if (button(ctx, ui, 'back', 14, H - 20, 50, 13, 'BACK')) app.go('hero');
    ui.end();
    if (input.pressed('back')) app.go('hero');
  }
}

// ----------------------------------------------------------------- armory --

export class ArmoryScreen {
  enter(app) {
    this.app = app;
    this.t = 0;
    this.flash = {};
    app.ui.lock(0.2);
    app.ui.focusId = 'u_might';
    playMusic('title');
  }

  draw(ctx, W, H, dt) {
    const app = this.app, ui = app.ui;
    this.t += dt;
    app.scene.draw(ctx, W, H, dt, { campfire: false });
    dim(ctx, W, H, 0.55);
    header(ctx, W, 'THE ARMORY');
    goldTag(ctx, app, W - 6, 9);
    ui.begin(dt);
    const prof = app.store.profile;
    const cols = Math.max(3, Math.min(5, Math.floor((W - 16) / 84)));
    const cw = Math.floor((W - 16 - (cols - 1) * 4) / cols), ch = 30;
    const x0 = Math.round(W / 2 - (cols * cw + (cols - 1) * 4) / 2);
    let focusUp = null;
    UPGRADES.forEach((u, i) => {
      const cx = x0 + (i % cols) * (cw + 4), cy = 30 + Math.floor(i / cols) * (ch + 4);
      const rank = prof.up[u.id] || 0;
      const maxed = rank >= u.max;
      const cost = maxed ? 0 : upgradeCost(u.id, rank);
      const fid = 'u_' + u.id;
      // Debug (the debug flag): free, each press a rank more, past the last back to none.
      if (DEBUG && ui.item(fid, cx, cy, cw, ch)) {
        app.store.setUpgrades({ [u.id]: maxed ? 0 : rank + 1 });
        sfx(maxed ? 'coin' : 'chest');
        this.flash[u.id] = 0.5;
      } else if (!DEBUG && ui.item(fid, cx, cy, cw, ch, { disabled: maxed || prof.gold < cost })) {
        app.store.buy(u.id).then((ok) => {
          if (ok) {
            sfx('chest');
            this.flash[u.id] = 0.5;
          }
        });
      }
      const f = ui.focused(fid);
      if (f) focusUp = u;
      const fl = this.flash[u.id] > 0;
      if (fl) this.flash[u.id] -= dt;
      panel(ctx, cx, cy, cw, ch, { trim: fl ? ['#ffffff', '#feae34'] : f ? ['#fee761', '#be4a2f'] : ['#5a6988', '#3a4466'], rivets: false, fill: fl ? '#3e2731' : null });
      ctx.drawImage(SPR[UP_ICONS[u.id]].frames[0].c, cx + 3, cy + 3);
      drawText(ctx, u.name, cx + 21, cy + 4, { color: f ? '#fee761' : '#c0cbdc' });
      for (let r = 0; r < u.max; r++) {
        ctx.fillStyle = r < rank ? '#feae34' : '#3a4466';
        ctx.fillRect(cx + 21 + r * 5, cy + 14, 4, 3);
      }
      if (maxed) drawText(ctx, 'MAX', cx + cw - 4, cy + ch - 11, { align: 'right', color: '#63c74d' });
      else if (DEBUG) drawText(ctx, 'FREE', cx + cw - 4, cy + ch - 11, { align: 'right', color: '#feae34' });
      else {
        drawText(ctx, String(cost), cx + cw - 4, cy + ch - 11, { align: 'right', color: prof.gold >= cost ? '#fee761' : '#a22633' });
      }
    });
    const rows = Math.ceil(UPGRADES.length / cols);
    const iy = 30 + rows * (ch + 4) + 2;
    if (focusUp) {
      const rank = prof.up[focusUp.id] || 0;
      drawText(ctx, `${focusUp.name}: ${focusUp.desc} per rank (${rank}/${focusUp.max})`, W / 2, iy, { align: 'center', color: '#c0cbdc' });
    }
    if (DEBUG) drawText(ctx, 'Debug: each press adds a rank, free; past the last, back to none', W / 2, iy + 10, { align: 'center', color: '#feae34' });
    if (button(ctx, ui, 'back', 14, H - 20, 50, 13, 'BACK')) app.go('title');
    const spent = Object.keys(prof.up).length > 0;
    if (DEBUG) {
      if (button(ctx, ui, 'maxall', W - 172, H - 20, 80, 13, 'MAX ALL')) {
        app.store.setUpgrades(Object.fromEntries(UPGRADES.map((u) => [u.id, u.max])));
        sfx('chest');
      }
      if (button(ctx, ui, 'clearall', W - 88, H - 20, 80, 13, 'CLEAR ALL', { disabled: !spent })) {
        app.store.setUpgrades(Object.fromEntries(UPGRADES.map((u) => [u.id, 0])));
        sfx('coin');
      }
    } else if (button(ctx, ui, 'refund', W - 88, H - 20, 80, 13, 'REFUND ALL', { disabled: !spent })) {
      app.store.refund().then(() => sfx('coin'));
    }
    ui.end();
    if (input.pressed('back')) app.go('title');
  }
}

// ---------------------------------------------------------------- records --

export class RecordsScreen {
  enter(app) {
    this.app = app;
    app.ui.lock(0.2);
  }

  draw(ctx, W, H, dt) {
    const app = this.app, ui = app.ui;
    app.scene.draw(ctx, W, H, dt, { campfire: false });
    dim(ctx, W, H, 0.55);
    header(ctx, W, 'RECORDS');
    const p = app.store.profile;
    // Ranked personal bests, one row per hero that has a run.
    const ranked = HERO_ORDER.filter((h) => p.ranked[h]).map((h) => [`${HEROES[h].name}, ${HEROES[h].title}`, `${fmtTime(p.ranked[h])} · ${rankTitle(p.ranked[h])}`]);
    const pw = Math.min(W - 16, 300), ph = Math.min(H - 54, 170 + Math.max(1, ranked.length) * 10 + 14);
    const x = Math.round(W / 2 - pw / 2), y = 32;
    panel(ctx, x, y, pw, ph, { title: 'VICTORIES' });
    const cx = [x + 10, x + pw - 50];
    let ty = y + 10;
    drawText(ctx, 'TRIAL', cx[0], ty, { color: '#8b9bb4' });
    drawText(ctx, 'WINS', cx[1] + 20, ty, { align: 'center', color: '#8b9bb4' });
    ty += 12;
    for (const m of ['s15', 'dungeon']) {
      // Wins from every difficulty there used to be.
      const w = p.wins[m].reduce((s, n) => s + n, 0);
      drawText(ctx, `${MODES[m].name} ${MODES[m].sub}`, cx[0], ty, { color: '#c0cbdc' });
      drawText(ctx, String(w), cx[1] + 20, ty, { align: 'center', color: w ? '#fee761' : '#3a4466' });
      ty += 11;
    }
    ty += 6;
    const rows = [
      ['Runs played', fmtNum(p.runs)],
      ['Monsters slain', fmtNum(p.kills)],
      ['Most kills in a run', fmtNum(p.best.kills)],
      ['Highest level', String(p.best.level)],
      ['Longest night (15 min)', fmtTime(p.best.s15)],
      ['Deepest floor', p.best.dungeon >= 4 ? 'Conquered' : p.best.dungeon ? `Floor ${p.best.dungeon}` : '—'],
      ['Gold', fmtNum(p.gold)],
    ];
    const line = (k, v, kc = '#8b9bb4', vc = '#c0cbdc') => {
      if (ty > y + ph - 10) return;
      drawText(ctx, k, cx[0], ty, { color: kc });
      drawText(ctx, v, x + pw - 10, ty, { align: 'right', color: vc });
      ty += 10;
    };
    for (const [k, v] of rows) line(k, v);
    ty += 4;
    line('RANKED BESTS', '', '#feae34');
    if (!ranked.length) line(modeUnlocked(p, 'ranked') ? 'No Ranked runs yet' : 'Locked', '', '#3a4466');
    for (const [k, v] of ranked) line(k, v, '#8b9bb4', '#fee761');
    ui.begin(dt);
    if (button(ctx, ui, 'back', 14, H - 20, 50, 13, 'BACK')) app.go('title');
    ui.end();
    if (input.pressed('back')) app.go('title');
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
    header(ctx, W, 'OPTIONS');
    ui.begin(dt);
    const w = Math.min(220, W - 30), x = Math.round(W / 2 - w / 2);
    let y = 36;
    const changed = () => {
      saveSettings(s);
      setVolumes(s.music, s.sfx);
      app.applySettings();
    };
    let d = stepper(ctx, ui, 'o_music', x, y, w, 'MUSIC', `${Math.round(s.music * 10)}`);
    if (d) {
      s.music = clamp(Math.round(s.music * 10 + d) / 10, 0, 1);
      changed();
    }
    y += 17;
    d = stepper(ctx, ui, 'o_sfx', x, y, w, 'SOUND EFFECTS', `${Math.round(s.sfx * 10)}`);
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
    if (!embedded) {
      if (button(ctx, ui, 'o_reset', x, y, w, 13, this.confirmReset ? 'REALLY ERASE ALL PROGRESS?' : 'RESET PROGRESS', { color: '#e43b44' })) {
        if (this.confirmReset) {
          app.store.reset();
          this.confirmReset = false;
          sfx('back');
        } else this.confirmReset = true;
      }
      y += 17;
    }
    if (button(ctx, ui, 'back', 14, H - 20, 50, 13, 'BACK') || input.pressed('back')) {
      if (embedded) return 'close';
      app.go(this.back);
    }
    ui.end();
    drawText(ctx, 'WASD / ARROWS move · SPACE ultimate · ESC pause · TAB map', W / 2, H - 34, { align: 'center', color: '#5a6988' });
    return null;
  }
}
