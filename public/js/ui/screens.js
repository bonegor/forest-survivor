// Menu screens: title, hero select, trial select, armory, records, options.

import { input } from '../engine/input.js';
import { sfx, playMusic, setVolumes, initAudio } from '../engine/audio.js';
import { SPR, smoothScaled } from '../engine/sprites.js';
import { saveSettings } from '../engine/storage.js';
import { fmtTime, fmtNum, clamp, ease } from '../engine/util.js';
import { HEROES, HERO_ORDER } from '../data/heroes.js';
import { WEAPONS } from '../data/weapons.js';
import { DIFFICULTY, MODES } from '../data/difficulty.js';
import { UPGRADES, upgradeCost, totalWins, metaBonuses } from '../shared/profile.js';
import { panel, button, stepper, logo, dim, drawText, drawRich, wrapText, textWidth, textCanvas } from './ui.js';

const UP_ICONS = {
  might: 'i_might', armor: 'i_armor', vitality: 'i_vitality', recovery: 'i_regen', haste: 'i_cooldown', reach: 'i_area',
  swiftness: 'i_movespeed', magnet: 'i_magnet', fortune: 'i_luck', wisdom: 'i_growth', greed: 'i_greed', reroll: 'i_reroll', revival: 'i_revival',
};

function goldTag(ctx, app, x, y, align = 'right') {
  const g = fmtNum(app.store.profile.gold);
  const w = textWidth(g) + 12;
  const left = align === 'right' ? x - w : x;
  ctx.drawImage(SPR.h_coin.frames[0].c, left, y);
  drawText(ctx, g, left + 10, y + 1, { color: ['#fff3a8', '#fee761', '#feae34'] });
}

// Pixel moon: a crescent for the short night, full for the long one.
function moon(ctx, cx, cy, r, crescent) {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y > r * r + 1) continue;
      if (crescent && (x - 2) * (x - 2) + (y + 1) * (y + 1) <= r * r) continue;
      ctx.fillStyle = x + y < 0 ? '#fff8e0' : '#e4d8b4';
      ctx.fillRect(cx + x, cy + y, 1, 1);
    }
  }
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

    ui.begin(dt);
    const items = [];
    if (app.store.checkpoint) items.push(['continue', 'CONTINUE RUN']);
    items.push(['play', 'NEW GAME'], ['armory', 'THE ARMORY'], ['records', 'RECORDS'], ['options', 'OPTIONS']);
    const bw = 104, bh = 15, gap = 4;
    let y = Math.round(Math.max(ly + lh + 18, H * 0.5 - (items.length * (bh + gap)) / 2 + 6));
    for (const [id, label] of items) {
      if (button(ctx, ui, id, Math.round(W / 2 - bw / 2), y, bw, bh, label)) this.pick(id);
      y += bh + gap;
    }
    ui.end();
    if (app.store.checkpoint && ui.focused('continue')) {
      const cp = app.store.checkpoint;
      const where = cp.mode === 'dungeon' ? `Floor ${cp.floor}` : fmtTime(cp.time);
      drawText(ctx, `${HEROES[cp.hero]?.name || cp.hero} · ${MODES[cp.mode].name} ${MODES[cp.mode].sub} · ${DIFFICULTY[cp.diff].name} · ${where}`, W / 2, y + 2, { align: 'center', color: '#8b9bb4' });
    }
    // Footer.
    const p = app.store.profile;
    goldTag(ctx, app, 6, H - 13, 'left');
    const wins = totalWins(p);
    ctx.drawImage(SPR.h_trophy.frames[0].c, W - 14 - textWidth(String(wins)), H - 13);
    drawText(ctx, String(wins), W - 5, H - 12, { align: 'right', color: '#fee761' });
    drawText(ctx, app.store.mode === 'server' ? 'Progress kept in signed cookies' : 'Progress kept in cookies (offline)', W / 2, H - 12, { align: 'center', color: '#3a4466' });
  }

  pick(id) {
    const app = this.app;
    if (id === 'play') app.go('hero');
    else if (id === 'continue') app.continueRun();
    else if (id === 'armory') app.go('armory');
    else if (id === 'records') app.go('records');
    else if (id === 'options') app.go('options', { back: 'title' });
  }
}

// ------------------------------------------------------------------- hero --

export class HeroScreen {
  enter(app) {
    this.app = app;
    this.t = 0;
    app.ui.lock(0.2);
    app.ui.focusId = 'h_' + (app.choice.hero || 'knight');
    this.confirm = null;
  }

  draw(ctx, W, H, dt) {
    const app = this.app, ui = app.ui;
    this.t += dt;
    app.scene.draw(ctx, W, H, dt, { campfire: false });
    dim(ctx, W, H, 0.45);
    header(ctx, W, 'CHOOSE YOUR HERO');
    goldTag(ctx, app, W - 6, 9);
    // While the unlock dialog is open the cards are drawn but not interactive.
    const live = !this.confirm;
    if (live) ui.begin(dt);
    const prof = app.store.profile;
    const n = HERO_ORDER.length;
    const cw = Math.min(64, Math.floor((W - 30) / n) - 6), ch = 58;
    const total = n * cw + (n - 1) * 6;
    let x = Math.round(W / 2 - total / 2);
    const y = 32;
    let focusHero = null;
    for (const id of HERO_ORDER) {
      const h = HEROES[id];
      const locked = !prof.heroes.includes(id);
      const fid = 'h_' + id;
      if (live && ui.item(fid, x, y, cw, ch)) {
        if (locked) {
          this.confirm = id;
          this.returnFocus = fid;
          ui.focus('c_no');
          ui.lock(0.2);
        } else {
          app.choice.hero = id;
          app.go('mode');
        }
      }
      const f = live ? ui.focused(fid) : this.returnFocus === fid;
      if (f) focusHero = id;
      panel(ctx, x, y, cw, ch, { trim: f ? ['#fee761', '#be4a2f'] : ['#5a6988', '#3a4466'], rivets: f });
      const fr = SPR[h.sprite]?.frames[f && !locked ? Math.floor(this.t * 6) % 2 : 0];
      if (fr) {
        const img = locked ? fr.variant('shadow', (b) => ({ ...b, d: b.d.map((c) => (c >>> 24 ? 0xff1b141d : 0)) })) : fr.c;
        const s = 2;
        ctx.drawImage(img, Math.round(x + cw / 2 - (img.width * s) / 2), y + 6, img.width * s, img.height * s);
      }
      drawText(ctx, locked ? 'LOCKED' : h.title.toUpperCase(), x + cw / 2, y + ch - 12, { align: 'center', color: locked ? '#5a6988' : f ? '#fee761' : '#c0cbdc' });
      x += cw + 6;
    }
    focusHero = focusHero || 'knight';
    this.detail(ctx, W, H, focusHero, y + ch + 8, !prof.heroes.includes(focusHero));
    if (live) {
      if (button(ctx, ui, 'back', 14, H - 20, 50, 13, 'BACK')) app.go('title');
      ui.end();
      if (input.pressed('back') && ui.lockT <= 0) app.go('title');
    } else this.drawConfirm(ctx, W, H, dt);
  }

  detail(ctx, W, H, id, y, locked) {
    const h = HEROES[id];
    const pw = Math.min(W - 16, 330), ph = Math.min(H - y - 26, 120);
    const x = Math.round(W / 2 - pw / 2);
    panel(ctx, x, y, pw, ph, { title: `${h.name.toUpperCase()} — ${h.title.toUpperCase()}` });
    const fr = SPR[h.sprite].frames[Math.floor(this.t * 5) % 2];
    const big = smoothScaled(fr, 1);
    const s = ph > 90 ? 2 : 1;
    ctx.drawImage(locked ? fr.variant('shadow', (b) => ({ ...b, d: b.d.map((c) => (c >>> 24 ? 0xff1b141d : 0)) })) : big, x + 8, y + 10, big.width * s, big.height * s);
    const tx = x + 8 + big.width * s + 8;
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
    stat('HEALTH', h.stats.maxHp, 150, '#e43b44');
    stat('SPEED', h.stats.speed || 1, 1.25, '#2ce8f5');
    const w = WEAPONS[h.weapon];
    ctx.drawImage(SPR[w.icon].frames[0].c, tx - 1, ty - 1);
    drawText(ctx, w.name, tx + 17, ty + 3, { color: '#fee761' });
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
    if (locked) drawText(ctx, `UNLOCK FOR ${h.unlock} GOLD`, x + pw / 2, y + ph - 11, { align: 'center', color: '#feae34' });
  }

  drawConfirm(ctx, W, H, dt) {
    const app = this.app, ui = app.ui;
    const h = HEROES[this.confirm];
    dim(ctx, W, H, 0.6);
    const pw = 200, ph = 64, x = Math.round(W / 2 - pw / 2), y = Math.round(H / 2 - ph / 2);
    panel(ctx, x, y, pw, ph, { title: 'UNLOCK HERO' });
    const can = app.store.profile.gold >= h.unlock;
    drawText(ctx, `${h.name} the ${h.title} — ${h.unlock} gold`, W / 2, y + 12, { align: 'center', color: can ? '#fee761' : '#e43b44' });
    ui.begin(dt);
    const close = () => {
      this.confirm = null;
      ui.focus(this.returnFocus);
      ui.lock(0.2);
    };
    if (button(ctx, ui, 'c_yes', x + 18, y + ph - 22, 70, 13, 'UNLOCK', { disabled: !can })) {
      app.store.unlock(this.confirm).then((ok) => {
        if (ok) sfx('chest');
      });
      close();
    } else if (button(ctx, ui, 'c_no', x + pw - 88, y + ph - 22, 70, 13, 'CANCEL') || (input.pressed('back') && ui.lockT <= 0)) close();
    ui.end();
  }
}

// ------------------------------------------------------------------- mode --

export class ModeScreen {
  enter(app) {
    this.app = app;
    this.t = 0;
    app.ui.lock(0.2);
    app.ui.focusId = 'm_' + (app.choice.mode || 's15');
  }

  draw(ctx, W, H, dt) {
    const app = this.app, ui = app.ui;
    this.t += dt;
    app.scene.draw(ctx, W, H, dt, { campfire: false });
    dim(ctx, W, H, 0.45);
    header(ctx, W, 'CHOOSE YOUR TRIAL');
    ui.begin(dt);
    const prof = app.store.profile;
    const modes = ['s15', 's30', 'dungeon'];
    const cw = Math.min(110, Math.floor((W - 24) / 3) - 6), ch = 84;
    const total = 3 * cw + 12;
    let x = Math.round(W / 2 - total / 2);
    const y = 34;
    for (const m of modes) {
      const M = MODES[m];
      const fid = 'm_' + m;
      if (ui.item(fid, x, y, cw, ch)) {
        app.choice.mode = m;
        ui.focus('d_' + (app.choice.diff || 'medium'));
      }
      const f = ui.focused(fid);
      const sel = app.choice.mode === m;
      panel(ctx, x, y, cw, ch, { trim: f ? ['#ffffff', '#feae34'] : sel ? ['#feae34', '#733e39'] : ['#5a6988', '#3a4466'], rivets: sel, fill: sel ? '#241b2c' : null });
      const icon = m === 'dungeon' ? SPR.stairs.frames[0].c : SPR.oak1.frames[0].c;
      ctx.drawImage(icon, Math.round(x + cw / 2 - icon.width / 2), y + 6);
      if (m !== 'dungeon') moon(ctx, x + cw - 15, y + 12, 4, m === 's15');
      if (sel) {
        ctx.fillStyle = '#feae34';
        ctx.fillRect(x + 3, y + ch - 12, cw - 6, 9);
        drawText(ctx, 'SELECTED', x + cw / 2, y + ch - 11, { align: 'center', color: '#3e2731', outline: null });
      }
      drawText(ctx, M.name.toUpperCase(), x + cw / 2, y + 52, { align: 'center', color: f || sel ? '#fee761' : '#c0cbdc' });
      drawText(ctx, M.sub, x + cw / 2, y + 61, { align: 'center', color: '#8b9bb4' });
      const wins = prof.wins[m].reduce((a, b) => a + b, 0);
      if (wins) {
        ctx.drawImage(SPR.h_trophy.frames[0].c, x + 6, y + 6);
        drawText(ctx, `×${wins}`, x + 14, y + 6, { color: '#feae34' });
      }
      x += cw + 6;
    }
    const M = MODES[app.choice.mode || 's15'];
    drawText(ctx, M.desc, W / 2, y + ch + 5, { align: 'center', color: '#c0cbdc' });
    // Difficulty.
    const dy = y + ch + 20;
    const dw = 70;
    let dx = Math.round(W / 2 - (3 * dw + 12) / 2);
    for (const d of ['easy', 'medium', 'hard']) {
      const D = DIFFICULTY[d];
      const sel = app.choice.diff === d;
      if (button(ctx, ui, 'd_' + d, dx, dy, dw, 14, (sel ? '★ ' : '') + D.name.toUpperCase(), { color: D.color })) {
        app.choice.diff = d;
        ui.focus('begin');
      }
      dx += dw + 6;
    }
    const D = DIFFICULTY[app.choice.diff || 'medium'];
    drawText(ctx, `${D.flavor} · Gold ×${D.gold}`, W / 2, dy + 18, { align: 'center', color: D.color });
    if (button(ctx, ui, 'begin', Math.round(W / 2 - 50), Math.min(H - 22, dy + 32), 100, 15, 'BEGIN', { color: '#fee761' })) app.startRun();
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
      if (ui.item(fid, cx, cy, cw, ch, { disabled: maxed || prof.gold < cost })) {
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
      else {
        drawText(ctx, String(cost), cx + cw - 4, cy + ch - 11, { align: 'right', color: prof.gold >= cost ? '#fee761' : '#a22633' });
      }
    });
    const rows = Math.ceil(UPGRADES.length / cols);
    const iy = 30 + rows * (ch + 4) + 2;
    if (focusUp) {
      const rank = prof.up[focusUp.id] || 0;
      const meta = metaBonuses(prof);
      void meta;
      drawText(ctx, `${focusUp.name}: ${focusUp.desc} per rank (${rank}/${focusUp.max})`, W / 2, iy, { align: 'center', color: '#c0cbdc' });
    }
    if (button(ctx, ui, 'back', 14, H - 20, 50, 13, 'BACK')) app.go('title');
    const spent = Object.keys(prof.up).length > 0;
    if (button(ctx, ui, 'refund', W - 88, H - 20, 80, 13, 'REFUND ALL', { disabled: !spent })) {
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
    const pw = Math.min(W - 16, 300), ph = Math.min(H - 54, 180);
    const x = Math.round(W / 2 - pw / 2), y = 32;
    panel(ctx, x, y, pw, ph, { title: 'VICTORIES' });
    const cx = [x + 10, x + pw - 150, x + pw - 100, x + pw - 50];
    let ty = y + 10;
    drawText(ctx, 'TRIAL', cx[0], ty, { color: '#8b9bb4' });
    ['EASY', 'MEDIUM', 'HARD'].forEach((d, i) => drawText(ctx, d, cx[i + 1] + 20, ty, { align: 'center', color: [DIFFICULTY.easy.color, DIFFICULTY.medium.color, DIFFICULTY.hard.color][i] }));
    ty += 12;
    for (const m of ['s15', 's30', 'dungeon']) {
      drawText(ctx, `${MODES[m].name} ${MODES[m].sub}`, cx[0], ty, { color: '#c0cbdc' });
      p.wins[m].forEach((w, i) => drawText(ctx, String(w), cx[i + 1] + 20, ty, { align: 'center', color: w ? '#fee761' : '#3a4466' }));
      ty += 11;
    }
    ty += 6;
    const rows = [
      ['Runs played', fmtNum(p.runs)],
      ['Monsters slain', fmtNum(p.kills)],
      ['Most kills in a run', fmtNum(p.best.kills)],
      ['Highest level', String(p.best.level)],
      ['Longest night (15 min)', fmtTime(p.best.s15)],
      ['Longest night (30 min)', fmtTime(p.best.s30)],
      ['Deepest floor', p.best.dungeon >= 4 ? 'Conquered' : p.best.dungeon ? `Floor ${p.best.dungeon}` : '—'],
      ['Gold', fmtNum(p.gold)],
    ];
    for (const [k, v] of rows) {
      if (ty > y + ph - 10) break;
      drawText(ctx, k, cx[0], ty, { color: '#8b9bb4' });
      drawText(ctx, v, x + pw - 10, ty, { align: 'right', color: '#c0cbdc' });
      ty += 10;
    }
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

export { ease };
