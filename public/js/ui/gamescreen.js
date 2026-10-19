// The in-game screen: runs a Game and layers the HUD and modal overlays
// (level up, treasure chests, gear found, pause, results) on top.

import { input } from '../engine/input.js';
import { sfx, playAfterJingle, playJingle } from '../engine/audio.js';
import { view } from '../engine/view.js';
import { SPR, smoothScaled } from '../engine/sprites.js';
import { fmtTime, fmtNum, clamp, ease, rand, TAU } from '../engine/util.js';
import { Game, MILESTONES } from '../game/game.js';
import { tierOf, chestFrame, chestTease, revealOrder, chestTimeline, CHEST_TIME, CEREMONY, evolvedFrom, evolveLines, iconColor } from '../game/chests.js';
import { clockCountsDown, clockTime, heldBuild, revealOn } from '../game/hud.js';
import { levelBonus } from '../game/player.js';
import { WEAPONS } from '../data/weapons.js';
import { PASSIVES, FILLERS } from '../data/passives.js';
import { HEROES } from '../data/heroes.js';
import { MODES, GAME_SPEED, NIGHTMARE } from '../data/difficulty.js';
import { metaBonuses, rankTitle, unlocksNext, nextGoal, UPGRADES, upgradeCost } from '../shared/profile.js';
import { SLOTS, SLOT_NAMES, RARITIES, STATS, BONUS_KEYS, itemName, itemLines, itemPrice, gearBonuses, powerWorn } from '../shared/items.js';
import { unlockText, goalText } from './ladder.js';
import { panel, button, dim, drawText, drawRich, wrapText, textWidth, textCanvas, logo } from './ui.js';
import { OptionsScreen } from './screens.js';
import { saveSettings } from '../engine/storage.js';

export class GameScreen {
  enter(app) {
    this.app = app;
    const { hero, mode } = app.choice;
    this.game = new Game({
      hero,
      mode,
      diff: app.choice.diff || 'medium', // Normal or Veteran: Normal unless chosen, as the trial screen shows
      nightmare: app.choice.nightmare === true, // twice the monsters, if ticked there (never on Ranked)
      rankedBest: mode === 'ranked' ? app.store.profile.ranked?.[hero] || 0 : 0,
      // The records a run can break as it goes (Game.checkRecords), as they stand now.
      records: { kills: app.store.profile.best.kills, level: app.store.profile.best.level, time: mode === 's15' ? app.store.profile.best.s15 : 0 },
      meta: metaBonuses(app.store.profile),
      gear: app.store.profile.gear[hero], // this hero's own
      unlocks: unlocksNext(app.store.profile, hero),
      pace: GAME_SPEED,
      settings: app.settings,
      hints: true,
      saveSettings: () => saveSettings(app.settings),
    });
    // Nothing of the run is saved while it lasts: its results reach the save when it ends
    // (ResultsOverlay), by death, Quit Run or victory.
    this.overlay = null;
    // The touch buttons in play: the pause button and the fury orb (touchFor).
    this.regions = (x, y) => {
      const W = view.W, H = view.H;
      if (x > W / 2 - 14 && x < W / 2 + 14 && y > H - 22) return 'pause';
      if (x > W - 56 && y > H - 56) return 'ult';
      return null;
    };
    this.touchFor(null);
  }

  leave() {
    input.joystickEnabled = false;
    input.touchRegions = null;
    input.stick.active = false;
    this.app.ui.noSpace = false;
  }

  open(overlay) {
    this.overlay = overlay;
    this.app.ui.lock(overlay.lockTime ?? 0.35);
    this.app.ui.noSpace = !!overlay.noSpace;
    this.touchFor(overlay);
  }

  // What a touch does. In play a finger steers, a second one strikes, and the pause button and the
  // fury orb are buttons; with an overlay up a touch is only a tap on it: no stick, no strike, and
  // no pause or ultimate under its buttons (REROLL, COLLECT, RETURN TO CAMP). Fingers already down as
  // it opens let go, so a steering finger's lift is no click on it.
  touchFor(overlay) {
    if (overlay && input.joystickEnabled) input.releaseTouches();
    input.joystickEnabled = !overlay;
    input.touchRegions = overlay ? null : this.regions || null;
  }

  frame(dt) {
    const app = this.app, g = this.game;
    this.touchFor(this.overlay); // however the overlay came or went
    if (!this.overlay) {
      if (input.pressed('pause') && g.state === 'play') {
        g.state = 'paused';
        this.open(new PauseOverlay(this));
        sfx('back');
      }
      if (input.pressed('map') && (g.mode === 'dungeon' || g.inCrypt)) g.showMap = !g.showMap;
      if (input.pressed('fps')) app.settings.fps = !app.settings.fps;
      if (!app.devHold) g.update(dt); // the developer panel can freeze the action
      // Nothing opens while a big beat plays out (Game.moment); then level-ups, chests and gear,
      // in that order. Levels the run's auto-pick takes need no screen (Game.resolveAutoLevels).
      const ready = g.state === 'play' && !g.momentRunning;
      if (ready && g.pendingLevels > 0) g.resolveAutoLevels();
      if (ready && g.pendingLevels > 0) {
        g.state = 'levelup';
        this.open(new LevelUpOverlay(this));
      } else if (ready && g.chestQueue.length) {
        g.state = 'chest';
        this.open(new ChestOverlay(this, g.chestQueue.shift()));
      } else if (ready && g.itemQueue.length) {
        g.state = 'item';
        this.open(new ItemOverlay(this, g.itemQueue.shift()));
      }
      if (g.state === 'over') this.open(new ResultsOverlay(this));
    } else if (!app.devHold) {
      // Under the cards the run stands still, but its flashes, shake and slow motion run out.
      g.fadeReal(dt);
    }
    // World.
    g.draw(view.ctx);
    // HUD + overlay on the UI canvas.
    const ctx = view.uctx, W = view.W, H = view.H;
    ctx.clearRect(0, 0, W, H);
    if (g.state !== 'over' || !this.overlay) g.hud.draw(ctx, W, H, g.clock, dt); // the clock that keeps going in crypts
    if (this.overlay) {
      const r = this.overlay.draw(ctx, W, H, dt);
      if (r === 'close') {
        this.overlay = null;
        app.ui.noSpace = false;
        this.touchFor(null);
      }
    }
  }
}

// --------------------------------------------------------------- level up --

function choiceInfo(g, c) {
  const p = g.player;
  if (c.type === 'weapon') {
    const def = WEAPONS[c.id];
    const desc = c.isNew ? def.desc : def.levels[c.level - 2]?.text || def.desc;
    let hint = null;
    if (def.evo) hint = { text: 'Evolves with', icon: PASSIVES[def.evo.with].icon, owned: p.passives.has(def.evo.with) };
    return { name: def.name, icon: def.icon, desc, tag: c.isNew ? 'NEW!' : `LV ${c.level}`, color: c.isNew ? '#0099db' : '#c0cbdc', hint };
  }
  if (c.type === 'passive') {
    const def = PASSIVES[c.id];
    let hint = null;
    for (const w of p.weapons) if (!w.evolved && w.def.evo && w.def.evo.with === c.id) hint = { text: 'Evolves', icon: w.def.icon, owned: true };
    return { name: def.name, icon: def.icon, desc: def.desc, tag: c.isNew ? 'NEW!' : `LV ${c.level}`, color: c.isNew ? '#63c74d' : '#9ee562', hint };
  }
  const { name, icon } = FILLERS[c.type];
  if (c.type === 'bless') return { name, icon, desc: 'Might {+5%}, health {+2%}. Stacks.', tag: `x${p.blessings + 1}`, color: '#fee761' };
  if (c.type === 'gold') return { name, icon, desc: `Gain {${c.value}} gold.`, tag: '', color: '#feae34' };
  return { name, icon, desc: `Restore {${Math.round(c.value * 100)}%} health.`, tag: '', color: '#e43b44' };
}

// The cards come face down and flip up FLIP.gap apart, each in FLIP.dur; they can be taken once the
// last is up (a press before is kept and taken then, never early).
export const FLIP = { first: 0.05, gap: 0.1, dur: 0.1 };
const flipAt = (i) => FLIP.first + i * FLIP.gap;
export const cardsReadyAt = (n) => flipAt(n - 1) + FLIP.dur;
// A card's back tells its kind: an upgrade's plain, a NEW weapon's blue, a NEW relic's green, and
// gold for one that completes an evolution (Game.completesEvolution). [fill, trim, pattern]
const BACKS = {
  plain: ['#262b44', '#5a6988', '#3a4466'],
  weapon: ['#124e89', '#0099db', '#2ce8f5'],
  relic: ['#265c42', '#63c74d', '#9ee562'],
  gold: ['#be4a2f', '#fee761', '#feae34'],
};

export class LevelUpOverlay {
  constructor(gs) {
    this.gs = gs;
    this.g = gs.game;
    this.t = 0;
    this.roll();
    this.lockTime = this.readyAt;
    this.noSpace = true; // it pops up mid-fight: Space mashed for the ultimate mustn't pick a card
    // Shift is the crypts' strike too: held as the screen opens, it isn't ALWAYS until it has been
    // let go and pressed again.
    this.heldAlways = input.down('always');
  }

  roll() {
    this.choices = this.g.levelChoices(this.g.choiceCount());
    // What each card completes (an evolution's name), and its back.
    this.completes = this.choices.map((c) => this.g.completesEvolution(c));
    this.backs = this.choices.map((c, i) => (this.completes[i] ? 'gold' : c.isNew ? (c.type === 'weapon' ? 'weapon' : 'relic') : 'plain'));
    this.readyAt = cardsReadyAt(this.choices.length);
    this.pending = null; // a card pressed during the flips, taken when they end
    // Nothing but the fillers (the whole build maxed, which lasts unless a Phoenix Heart is
    // spent): each card offers ALWAYS, and no reroll is spent on them.
    this.fillersOnly = this.g.fillersOnly();
    this.always = -1; // the card whose ALWAYS is ticked
    this.t = 0;
    this.gs.app.ui.focusId = 'c0';
  }

  // Takes card i; with its ALWAYS ticked (or Shift held), every level-up from now on takes it
  // unseen, and so do any levels still waiting.
  choose(i, always = this.always === i) {
    const g = this.g, c = this.choices[i];
    if (always && this.fillersOnly) g.autoPick = c.type;
    g.applyChoice(c);
    g.pendingLevels = Math.max(0, g.pendingLevels - 1); // never below none (draw: levels taken elsewhere)
    sfx('pick');
    g.state = 'play';
    if (g.hints) g.hints.levelClosed = true; // the first-run hint on weapons and gems comes next
    if (g.resolveAutoLevels()) return 'close';
    g.state = 'levelup';
    this.roll();
    this.gs.app.ui.lock(0.3);
    return null;
  }

  draw(ctx, W, H, dt) {
    const ui = this.gs.app.ui, g = this.g;
    // Its levels were taken while it was up (a bot's __fs.sim settles the cards itself), or the run
    // ended: nothing is left to choose, and the game screen goes on from there.
    if (g.state !== 'levelup' || g.pendingLevels <= 0) {
      if (g.state === 'levelup') g.state = 'play';
      return 'close';
    }
    this.t += dt;
    const ready = this.t >= this.readyAt;
    // The level this screen is for; a milestone (10, 25, 50, 100) is told in gold, its stinger once.
    const lvl = g.player.level - g.pendingLevels + 1, mile = MILESTONES.includes(lvl);
    if (mile) g.milestoneDue(lvl);
    dim(ctx, W, H, 0.6);
    // Rotating light rays behind the title.
    ctx.save();
    ctx.translate(W / 2, 28);
    ctx.globalAlpha = mile ? 0.18 : 0.12;
    ctx.fillStyle = mile ? '#feae34' : '#2ce8f5';
    for (let i = 0; i < 12; i++) {
      ctx.rotate(TAU / 12);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W, -14 + Math.sin(this.t * 2 + i) * 4);
      ctx.lineTo(W, 14);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    const L = mile ? logo(`LEVEL ${lvl}!`) : logo('LEVEL UP!', ['#ffffff', '#c0f8ff', '#2ce8f5', '#0099db', '#124e89']);
    const pop = this.t < 0.25 ? 1.6 - 0.6 * ease.outBack(this.t / 0.25) : 1;
    const s = Math.min(1, (W - 40) / L.width) * pop;
    ctx.drawImage(L, Math.round(W / 2 - (L.width * s) / 2), Math.round(18 - (L.height * (s - 1)) / 2), Math.round(L.width * s), Math.round(L.height * s));
    // The level, and what the levels themselves have given the hero by now (Player levelBonus).
    const lb = levelBonus(lvl);
    const pct = (v) => `+${Math.round((v - 1) * 100)}%`;
    let line = mile ? 'MILESTONE' : `LEVEL ${lvl}`;
    if (lvl > 1) {
      const long = `${line} · ${pct(lb.might)} damage · ${pct(lb.hp)} health${lb.armor ? ` · +${lb.armor} armor` : ''}`;
      line = textWidth(long) <= W - 8 ? long : `${line} · ${pct(lb.might)} dmg · ${pct(lb.hp)} hp${lb.armor ? ` · +${lb.armor} arm` : ''}`;
    }
    drawText(ctx, line, W / 2, 18 + L.height + 2, { align: 'center', color: mile ? '#feae34' : '#8b9bb4' });
    // Four cards: LUCKY!, stamped beside the title (under it where the screen is narrow).
    if (this.choices.length === 4 && !this.fillersOnly) {
      const c = textCanvas('LUCKY!', ['#ffffff', '#9ee562', '#63c74d'], '#181425');
      const k = this.t < 0.25 ? 2.2 - 1.2 * ease.outBack(this.t / 0.25) : 1, cw = c.width * 2 * k, ch = c.height * 2 * k;
      const right = W / 2 + (L.width * s) / 2 + 6, fits = right + c.width * 2 <= W - 2;
      const cx = fits ? right + cw / 2 : W - 4 - cw / 2, cy = fits ? 18 + L.height / 2 : 18 + L.height + 8;
      ctx.save();
      ctx.translate(Math.round(cx), Math.round(cy));
      ctx.rotate(-0.12);
      ctx.drawImage(c, Math.round(-cw / 2), Math.round(-ch / 2), Math.round(cw), Math.round(ch));
      ctx.restore();
    }

    ui.begin(dt);
    const n = this.choices.length;
    const vertical = W < 300;
    const always = this.fillersOnly; // each card has its ALWAYS toggle: under it, or beside it when stacked
    let result = null;
    const top = 18 + L.height + 14;
    const avail = H - top - 26;
    const shown = this.choices;
    for (let i = 0; i < n; i++) {
      if (result || this.choices !== shown) break; // a card was taken: the next level's cards come next frame
      const info = choiceInfo(g, this.choices[i]);
      let x, y, w, h;
      if (vertical) {
        w = W - 16 - (always ? 56 : 0);
        h = Math.min(56, Math.floor(avail / n) - 4);
        x = 8;
        y = top + i * (h + 4);
      } else {
        w = Math.min(118, Math.floor((W - 20 - (n - 1) * 6) / n));
        h = Math.min(156, avail - (always ? 15 : 0));
        x = Math.round(W / 2 - (n * w + (n - 1) * 6) / 2) + i * (w + 6);
        y = top;
      }
      // Face down, then flipping up (half its width gone, back to the front).
      const fk = clamp((this.t - flipAt(i)) / FLIP.dur, 0, 1), face = fk >= 0.5;
      const id = 'c' + i;
      if (!ready) {
        // A press on a card before the flips end is kept, never taken early.
        if (input.mouse.clicked && input.mouse.x >= x && input.mouse.x < x + w && input.mouse.y >= y && input.mouse.y < y + h) this.pending = i;
      } else if (ui.item(id, x, y, w, h) && !result) result = this.choose(i);
      if (always && ready && !result) {
        const on = this.always === i;
        const tx = vertical ? x + w + 6 : x + 8, ty = vertical ? y + Math.floor(h / 2) - 6 : y + h + 3;
        const tw = vertical ? 48 : w - 16;
        if (button(ctx, ui, 'a' + i, tx, ty, tw, 12, '  ALWAYS', { color: on ? '#fee761' : '#8b9bb4', pointer: false })) {
          this.always = on ? -1 : i;
          sfx(on ? 'back' : 'pick');
        }
        // The tick box, left of the word.
        const bx = Math.round(tx + tw / 2 - textWidth('  ALWAYS') / 2), by = ty + 3;
        ctx.fillStyle = on ? '#fee761' : '#5a6988';
        ctx.fillRect(bx, by, 6, 6);
        ctx.fillStyle = on ? '#feae34' : '#181425';
        ctx.fillRect(bx + 1, by + 1, 4, 4);
        if (on) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(bx + 2, by + 2, 2, 2);
        }
      }
      const f = ready && ui.focused(id);
      const lift = f ? -2 : 0;
      ctx.save();
      ctx.translate(x + w / 2, 0);
      ctx.scale(Math.max(0.05, face ? fk * 2 - 1 : 1 - fk * 2), 1);
      ctx.translate(-(x + w / 2), 0);
      if (!face) {
        this.drawBack(ctx, x, y, w, h, this.backs[i]);
        ctx.restore();
        continue;
      }
      const gold = this.backs[i] === 'gold';
      if (gold) {
        // A card that completes an evolution glows gold round its edge.
        ctx.globalAlpha = 0.45 + 0.3 * Math.sin(this.t * 6);
        ctx.fillStyle = '#feae34';
        ctx.fillRect(x - 3, y + lift - 3, w + 6, h + 6);
        ctx.globalAlpha = 1;
      }
      panel(ctx, x, y + lift, w, h, { trim: gold ? (f ? ['#ffffff', '#fee761'] : ['#fee761', '#feae34']) : f ? ['#ffffff', info.color] : [info.color, '#262b44'], rivets: f || gold, fill: gold ? '#2e2218' : undefined });
      if (f) {
        ctx.globalAlpha = 0.12 + 0.06 * Math.sin(this.t * 6);
        ctx.fillStyle = info.color;
        ctx.fillRect(x + 3, y + lift + 3, w - 6, h - 6);
        ctx.globalAlpha = 1;
      }
      const icon = SPR[info.icon].frames[0];
      if (vertical) {
        ctx.drawImage(smoothScaled(icon, 1), x + 6, y + lift + Math.floor(h / 2) - 16);
        drawText(ctx, info.name, x + 44, y + lift + 6, { color: info.color });
        if (info.tag) drawText(ctx, info.tag, x + w - 6, y + lift + 6, { align: 'right', color: info.tag === 'NEW!' ? '#fee761' : '#8b9bb4' });
        const lines = wrapText(info.desc, w - 52);
        lines.slice(0, 3).forEach((ln, j) => drawRich(ctx, ln, x + 44, y + lift + 17 + j * 9, { color: '#c0cbdc' }));
      } else {
        const big = smoothScaled(icon, 1);
        ctx.drawImage(big, Math.round(x + w / 2 - big.width / 2), y + lift + 8);
        const nameLines = wrapText(info.name, w - 10);
        let ty = y + lift + 44;
        for (const ln of nameLines) {
          drawText(ctx, ln, x + w / 2, ty, { align: 'center', color: info.color });
          ty += 9;
        }
        if (info.tag) {
          drawText(ctx, info.tag, x + w / 2, ty + 1, { align: 'center', color: info.tag === 'NEW!' ? (Math.floor(this.t * 4) % 2 ? '#fee761' : '#feae34') : '#8b9bb4' });
          ty += 12;
        }
        ty += 2;
        for (const ln of wrapText(info.desc, w - 12)) {
          drawRich(ctx, ln, x + w / 2, ty, { align: 'center', color: '#c0cbdc' });
          ty += 9;
        }
        if (gold && h > 120) {
          // It completes an evolution: said in gold where the hint was.
          const lines = wrapText(`COMPLETES ${WEAPONS[this.completes[i]].name.toUpperCase()}`, w - 10);
          lines.forEach((ln, j) => drawText(ctx, ln, x + w / 2, y + lift + h - 14 - (lines.length - 1 - j) * 9, { align: 'center', color: Math.floor(this.t * 4) % 2 ? '#fee761' : '#feae34' }));
        } else if (info.hint && h > 120) {
          const hy = y + lift + h - 22;
          drawText(ctx, info.hint.text, x + w / 2 - 6, hy + 4, { align: 'center', color: info.hint.owned ? '#feae34' : '#5a6988' });
          ctx.drawImage(SPR[info.hint.icon].frames[0].c, Math.round(x + w / 2 + textWidth(info.hint.text) / 2 - 3), hy);
        }
      }
      if (vertical && gold) drawText(ctx, `COMPLETES ${WEAPONS[this.completes[i]].name.toUpperCase()}`, x + w - 6, y + lift + h - 11, { align: 'right', color: '#fee761' });
      drawText(ctx, String(i + 1), x + 5, y + lift + 4, { color: '#3a4466', outline: null });
      ctx.restore();
    }
    const p = g.player;
    if (always) {
      // What ALWAYS does, and where it is undone. (No reroll: fillers are all there is.)
      const keys = input.device === 'kb' ? ` · Shift+1-${n}` : '';
      const lines = [`ALWAYS takes that card at every level-up from now on${keys} · undo it in the pause menu`, `ALWAYS: every level-up from now on${keys} · undo in pause`, 'ALWAYS: every level-up · undo in pause'];
      const hint = lines.find((s) => textWidth(s) <= W - 8) || lines[lines.length - 1];
      drawText(ctx, hint, W / 2, H - 12, { align: 'center', color: this.always >= 0 ? '#fee761' : '#8b9bb4' });
    } else if (p.rerolls > 0 && ready && !result) {
      if (button(ctx, ui, 'reroll', Math.round(W / 2 - 45), H - 20, 90, 13, `REROLL ×${p.rerolls}`, { color: '#2ce8f5' }) || input.pressed('reroll')) {
        p.rerolls--;
        sfx('teleport');
        this.roll();
      }
    }
    ui.end();
    if (!input.down('always')) this.heldAlways = false;
    const keys = ['one', 'two', 'three', 'four'], shift = input.down('always') && !this.heldAlways;
    for (let i = 0; i < n; i++) {
      if (result || !input.pressed(keys[i])) continue;
      if (ready) result = this.choose(i, this.always === i || shift);
      else this.pending = i; // kept for when the cards are up
    }
    if (!ready && input.pressed('confirm')) this.pending = Math.max(0, this.choices.findIndex((c, i) => ui.focusId === 'c' + i));
    // A card pressed during the flips, taken now that they are up.
    if (!result && ready && this.pending !== null) {
      const i = this.pending;
      this.pending = null;
      if (i < n) result = this.choose(i, this.always === i);
    }
    return result;
  }

  // A card face down: its kind's colours (BACKS) in a lattice, a mark in the middle.
  drawBack(ctx, x, y, w, h, kind) {
    const [fill, trim, mark] = BACKS[kind];
    panel(ctx, x, y, w, h, { trim: [trim, '#181425'], fill, rivets: kind === 'gold' });
    ctx.fillStyle = mark;
    ctx.globalAlpha = 0.35;
    for (let yy = y + 6; yy < y + h - 6; yy += 8) for (let xx = x + 6 + ((yy - y) % 16 ? 4 : 0); xx < x + w - 6; xx += 8) ctx.fillRect(xx, yy, 2, 2);
    ctx.globalAlpha = 1;
    const c = textCanvas(kind === 'gold' ? '★' : '?', ['#ffffff', trim, mark], '#181425');
    ctx.drawImage(c, Math.round(x + w / 2 - c.width), Math.round(y + h / 2 - c.height), c.width * 2, c.height * 2);
  }
}

// ------------------------------------------------------------------ chest --

export class ChestOverlay {
  constructor(gs, kind) {
    this.gs = gs;
    this.g = gs.game;
    this.kind = kind;
    this.tier = tierOf(kind);
    this.t = 0;
    // The HUD keeps showing the build as it was until each thing is revealed (no spoilers): the
    // chest gives everything at once, its gold too, and only shows it here.
    this.g.hud.held = heldBuild(this.g);
    this.roll = this.g.rollChest(kind);
    this.items = revealOrder(this.roll.items); // least first, an evolution last
    this.tease = chestTease(this.roll.items);
    this.tl = chestTimeline(kind, this.items.length);
    // An evolution, shown last, has its ceremony (drawCeremony): the gold waits for it.
    this.evo = this.items.find((it) => it.type === 'evolve') || null;
    if (this.evo) {
      this.evoFrom = evolvedFrom(this.evo.id);
      this.evoAt = this.tl.at[this.items.length - 1];
      this.evoLines = evolveLines(this.evoFrom, this.evo.id);
      this.signature = this.g.player.hero.unique.includes(this.evoFrom);
      this.tl.gold += CEREMONY.dur;
      this.tl.end += CEREMONY.dur;
    }
    this.revealed = 0;
    this.sets = 0; // shake sets begun
    this.goldShown = false; // the gold has landed (counted, its coins sent to the HUD)
    this.goldCount = 0;
    this.coins = []; // the burst as the lid opens
    this.flyers = []; // coins on their way to the HUD's gold counter
    this.lockTime = 0.6;
    sfx('chest', { size: this.kind === 'boss' ? 3 : this.kind === 'lord' ? 2 : 1 });
  }

  // Everything shown at once (a first press): every thing revealed, the gold landed.
  skip() {
    this.t = Math.max(this.t, this.tl.end);
  }

  draw(ctx, W, H, dt) {
    const ui = this.gs.app.ui, g = this.g, T = this.tier, tl = this.tl;
    this.t += dt;
    const t = this.t;
    dim(ctx, W, H, 0.7);
    const cx = W / 2, cy = H * 0.36;
    const opened = t >= tl.open;
    const k = opened ? clamp((t - tl.open) / 0.4, 0, 1) : 0;
    // The room lit in the tier's colour once it is open, its rays turning slowly.
    if (opened) {
      const gl = ctx.createRadialGradient(cx, cy, 2, cx, cy, (70 + 30 * T.scale) * k + 10);
      gl.addColorStop(0, `rgba(${T.room},0.6)`);
      gl.addColorStop(1, `rgba(${T.room},0)`);
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.4);
      ctx.globalAlpha = 0.16 * k * (0.7 + 0.3 * T.scale);
      ctx.fillStyle = T.ray;
      for (let i = 0; i < T.rays; i++) {
        ctx.rotate(TAU / T.rays);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(W, -T.rayW);
        ctx.lineTo(W, T.rayW);
        ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    // Shut, it shakes in sets (a champion's one, a lord's two, a boss's three), each stronger and a
    // step higher, light leaking from the crack: a beam for each thing inside, one orange for an
    // evolution (chestTease: always true).
    const fr = chestFrame(this.kind, opened), s = 3 * T.scale;
    const per = CHEST_TIME.set + CHEST_TIME.setGap, set = Math.floor(t / per), inSet = t - set * per;
    let shake = 0;
    if (!opened) {
      if (set >= this.sets) {
        this.sets = set + 1;
        sfx('chestshake', { pitch: 1 + set * 0.15 });
      }
      if (inSet < CHEST_TIME.set) shake = Math.sin(t * 60) * (1 + set) * 1.4;
    }
    ctx.drawImage(fr, Math.round(cx - (fr.width * s) / 2 + shake), Math.round(cy - (fr.height * s) / 2), fr.width * s, fr.height * s);
    // The light from the crack, over the shut chest.
    if (!opened) {
      const n = this.tease.beams, crackY = cy - (fr.height * s) / 2 + 3 * s;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (n > 1 ? (i / (n - 1) - 0.5) * 1.6 : 0);
        const len = (26 + 14 * set) * (0.8 + 0.2 * Math.sin(t * 20 + i));
        ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 13 + i * 2);
        ctx.strokeStyle = this.tease.orange && i === Math.floor(n / 2) ? '#f77622' : T.ray;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + shake, crackY);
        ctx.lineTo(cx + shake + Math.cos(a) * len, crackY + Math.sin(a) * len);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (opened && !this.burst) {
      this.burst = true;
      sfx('chestopen');
      for (let i = 0; i < 24 + 16 * T.shakes; i++) this.coins.push({ x: cx, y: cy - 6, vx: rand(-90, 90), vy: rand(-160, -60), life: rand(0.8, 1.6) });
    }
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.life -= dt;
      if (c.life <= 0) {
        this.coins.splice(i, 1);
        continue;
      }
      c.vy += 260 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      ctx.drawImage(SPR.coin.frames[Math.floor((c.life * 12) % 4)].c, Math.round(c.x), Math.round(c.y));
    }
    // The things, least first, the gaps growing toward the last; each a note a step up.
    const items = this.items;
    const iy = Math.round(cy + 18 + 15 * T.scale);
    while (this.revealed < items.length && t >= tl.at[this.revealed]) {
      const it = items[this.revealed++];
      if (g.hud.held) revealOn(g.hud.held, it, g);
      // An evolution's sound and flash are its ceremony's.
      if (it.type !== 'evolve') sfx('reveal', { pitch: SCALE[Math.min(SCALE.length - 1, this.revealed - 1)] });
    }
    const ceremony = this.evo && t >= this.evoAt && t < this.evoAt + CEREMONY.dur;
    if (ceremony) this.drawCeremony(ctx, W, H, t - this.evoAt);
    else if (opened) {
      const slot = Math.min(84, Math.floor((W - 16) / Math.max(1, items.length)));
      const rowW = slot * items.length;
      items.slice(0, this.revealed).forEach((it, i) => {
        const x = Math.round(W / 2 - rowW / 2 + (i + 0.5) * slot);
        const { icon, name, sub, color } = chestItemInfo(g, it);
        const pop = t - tl.at[i] < 0.12 ? 1.3 : 1;
        const big = smoothScaled(SPR[icon].frames[0], 1);
        ctx.drawImage(big, Math.round(x - (big.width * pop) / 2), Math.round(iy - (big.height * (pop - 1)) / 2), Math.round(big.width * pop), Math.round(big.height * pop));
        const lines = wrapText(name, slot - 6);
        lines.forEach((ln, j) => drawText(ctx, ln, x, iy + 34 + j * 9, { align: 'center', color }));
        drawText(ctx, sub, x, iy + 34 + lines.length * 9, { align: 'center', color: it.type === 'evolve' || it.isNew ? '#fee761' : '#8b9bb4' });
      });
      if (items.some((it) => it.type === 'evolve') && this.revealed === items.length) {
        const L = logo('EVOLUTION!', ['#ffffff', '#fee761', '#feae34', '#f77622', '#be4a2f']);
        const kk = Math.min(1, W / 2 / L.width);
        ctx.drawImage(L, Math.round(W / 2 - (L.width * kk) / 2), 10, Math.round(L.width * kk), Math.round(L.height * kk));
      }
    }
    // The gold last: counted up, coins ticking up the scale, a thunk as it lands, and a stream of
    // coins flies to the HUD's gold counter, which rolls up as they arrive.
    const gold = this.roll.gold;
    if (t >= tl.gold && !ceremony) {
      const kg = clamp((t - tl.gold) / CHEST_TIME.gold, 0, 1), before = this.goldCount;
      this.goldCount = Math.round(gold * ease.outCubic(kg));
      const step = Math.max(1, gold / 8);
      if (!this.goldShown && Math.floor(this.goldCount / step) > Math.floor(before / step)) sfx('coin', { pitch: 1 + 0.5 * kg });
      if (kg >= 1 && !this.goldShown) {
        this.goldShown = true;
        g.hud.held = null; // all of it shown: the HUD rolls up to the build and gold as they are
        sfx('thunk');
        for (let i = 0; i < 10; i++) this.flyers.push({ x: cx + rand(-12, 12), y: iy + 66, t: -i * 0.04 });
      }
      const c = textCanvas(`+${this.goldCount} GOLD`, ['#fff3a8', '#fee761', '#feae34'], '#181425');
      ctx.drawImage(c, Math.round(W / 2 - c.width), iy + 60, c.width * 2, c.height * 2);
    }
    this.drawFlyers(ctx, W, dt);
    ui.begin(dt);
    let res = null;
    const done = this.goldShown && t >= tl.end;
    if (done) {
      if (button(ctx, ui, 'take', Math.round(W / 2 - 40), H - 22, 80, 14, 'COLLECT') || input.pressed('back')) {
        this.g.state = 'play';
        g.hud.held = null;
        res = 'close';
      }
    } else if (t > 0.3 && (input.pressed('confirm') || input.pressed('back') || input.mouse.clicked)) {
      // A first press shows it all; the next collects.
      this.skip();
      ui.lock(0.2);
    }
    ui.end();
    return res;
  }

  // The evolution's ceremony, u seconds in (CEREMONY): the room darker still; the old icon at 3x
  // trembling as cracks run through it; one flash; the new icon at 4x with rays in its colour, its
  // name in the logo's letters and what changed; for the hero's own weapon, him beside it and the
  // word SIGNATURE. Its own stinger as it breaks.
  drawCeremony(ctx, W, H, u) {
    const C = CEREMONY, from = WEAPONS[this.evoFrom], to = WEAPONS[this.evo.id];
    dim(ctx, W, H, 0.55);
    const cx = Math.round(W / 2), cy = Math.round(H * 0.4);
    if (u < C.crack) {
      const k = u / C.crack, img = SPR[from.icon].frames[0].c, s = 3;
      const jx = Math.round(Math.sin(u * 91) * 2 * k), jy = Math.round(Math.cos(u * 77) * 1.5 * k); // trembling, without dice
      const w = img.width * s, h = img.height * s;
      ctx.drawImage(img, cx - w / 2 + jx, cy - h / 2 + jy, w, h);
      // Cracks running out from its middle, longer as it goes.
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5 + 0.5 * k;
      for (let i = 0; i < 5; i++) {
        const a = i * 1.3 + 0.4;
        let x = cx + jx, y = cy + jy;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let j = 1; j <= 3; j++) {
          x += Math.cos(a + (j % 2 ? 0.5 : -0.5)) * 7 * k;
          y += Math.sin(a + (j % 2 ? 0.5 : -0.5)) * 7 * k;
          ctx.lineTo(Math.round(x), Math.round(y));
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return;
    }
    const v = u - C.crack;
    if (!this.stung) {
      this.stung = true;
      sfx('evolve');
    }
    // The new weapon, rays in its colour turning behind it.
    const color = iconColor(to.icon);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(v * 0.6);
    ctx.globalAlpha = 0.28 * Math.min(1, v / 0.3);
    ctx.fillStyle = color;
    for (let i = 0; i < 16; i++) {
      ctx.rotate(TAU / 16);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W, -12);
      ctx.lineTo(W, 12);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    const img = SPR[to.icon].frames[0].c, pop = v < 0.3 ? 1 + 0.5 * (1 - ease.outBack(v / 0.3)) : 1, s = 4 * pop;
    ctx.drawImage(img, Math.round(cx - (img.width * s) / 2), Math.round(cy - (img.height * s) / 2), Math.round(img.width * s), Math.round(img.height * s));
    const L = logo(to.name.toUpperCase(), ['#ffffff', '#fee761', '#feae34', '#f77622', '#be4a2f']);
    const ls = Math.min(1, (W - 20) / L.width);
    const ly = cy + 40;
    ctx.drawImage(L, Math.round(cx - (L.width * ls) / 2), ly, Math.round(L.width * ls), Math.round(L.height * ls));
    let ty = ly + Math.round(L.height * ls) + 4;
    drawText(ctx, fitText(to.desc, W - 16), cx, ty, { align: 'center', color: '#c0cbdc' });
    ty += 11;
    if (this.evoLines.length) drawText(ctx, fitText(this.evoLines.join(' · '), W - 16), cx, ty, { align: 'center', color: '#9ee562' });
    if (this.signature) {
      // The hero beside his own weapon, and the word.
      const pose = SPR[this.g.player.hero.pose] || SPR[this.g.player.hero.sprite];
      const pf = pose.frames[0].c, ps = Math.min(2, 64 / pf.height);
      ctx.drawImage(pf, Math.round(cx - 64 - pf.width * ps), Math.round(cy - (pf.height * ps) / 2), Math.round(pf.width * ps), Math.round(pf.height * ps));
      const c = textCanvas('SIGNATURE', ['#ffffff', '#fee761', '#feae34'], '#181425');
      ctx.drawImage(c, Math.round(cx - c.width), cy - 52, c.width * 2, c.height * 2);
    }
    // One flash as it breaks (≤0.6), fading.
    if (v < C.flash) {
      ctx.globalAlpha = 0.6 * (1 - v / C.flash);
      ctx.fillStyle = '#fff8e8';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  // Coins flying from the chest to the HUD's gold counter (top right), arcing up.
  drawFlyers(ctx, W, dt) {
    const tx = W - 12, ty = 32;
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const f = this.flyers[i];
      f.t += dt;
      if (f.t < 0) continue;
      const k = f.t / 0.5;
      if (k >= 1) {
        this.flyers.splice(i, 1);
        continue;
      }
      const e = ease.inOutSine(k);
      const x = f.x + (tx - f.x) * e, y = f.y + (ty - f.y) * e - Math.sin(k * Math.PI) * 30;
      ctx.drawImage(SPR.coin.frames[Math.floor((f.t * 14) % 4)].c, Math.round(x - 3), Math.round(y - 3));
    }
  }
}

// A note a step up for each thing a chest shows (a major pentatonic run).
const SCALE = [1, 1.122, 1.26, 1.498, 1.682, 2, 2.245];

// How a chest's screen shows one thing it gave.
function chestItemInfo(g, it) {
  if (it.type === 'evolve') {
    const d = WEAPONS[it.id];
    return { icon: d.icon, name: d.name, sub: 'EVOLVED!', color: '#f77622' };
  }
  if (it.type === 'weapon' || it.type === 'passive') {
    const d = (it.type === 'weapon' ? WEAPONS : PASSIVES)[it.id];
    const color = it.type === 'weapon' ? (it.isNew ? '#0099db' : '#c0cbdc') : it.isNew ? '#63c74d' : '#9ee562';
    return { icon: d.icon, name: d.name, sub: it.isNew ? 'NEW!' : `LV ${it.level}`, color };
  }
  // A filler, once the whole build is maxed: the run's auto-pick, else a Blessing.
  const { icon, name, color } = choiceInfo(g, it);
  return { icon, name, color, sub: it.type === 'bless' ? `x${it.level}` : it.type === 'gold' ? `+${it.value}` : `+${Math.round(it.value * 100)}%` };
}

// ------------------------------------------------------------------- gear --

// How a Rare or better is told on the gear screen: the frame and title climb a rarity every `step`
// seconds; an Epic and a Legendary hold on near-black at least `hold` seconds, then slam in.
export const GEAR_CLIMB = { step: 0.12, hold: [0, 0, 0, 0.36, 0.5] };

// Each rarity's title colours, light to dark.
const RARITY_LOGO = [
  ['#ffffff', '#e8eef6', '#c0cbdc', '#8b9bb4', '#5a6988'],
  ['#ffffff', '#c8f4b0', '#63c74d', '#3e8948', '#265c42'],
  ['#ffffff', '#c0f8ff', '#2ce8f5', '#0099db', '#124e89'],
  ['#ffffff', '#f4c4e4', '#b55088', '#68386c', '#3b2346'],
  ['#ffffff', '#fee761', '#feae34', '#f77622', '#be4a2f'],
];
const POWER_NAMES = { amount: 'projectile', revival: 'revive' };

// What wearing `it` instead of whatever is in its slot changes, as [text, better?] lines.
function gearDiff(gear, it) {
  const now = gearBonuses(gear), next = gearBonuses({ ...gear, [it.slot]: it });
  const out = [];
  for (const k of BONUS_KEYS) {
    const d = next[k] - now[k];
    if (Math.abs(d) < 1e-9) continue;
    const s = STATS[k];
    if (!s) {
      out.push(k === 'critMult' ? [`${d > 0 ? '+' : '-'}${Math.round(Math.abs(d) * 100)}% crit damage`, d > 0] : [`${d > 0 ? '+' : '-'}${Math.abs(d)} ${POWER_NAMES[k]}`, d > 0]);
      continue;
    }
    const v = s.unit === 'flat' ? Math.abs(d) : s.unit === 'tenth' ? (Math.abs(d)).toFixed(1) : Math.round(Math.abs(d) * 100);
    const good = s.minus ? d < 0 : d > 0;
    // A cooldown cut is shown as a minus; any other gain as a plus.
    const sign = good === !s.minus ? '+' : '-';
    out.push([`${sign}${v}${s.unit ? '' : '%'} ${s.name}`, good]);
  }
  return out;
}

// Text cut to fit a width, with an ellipsis.
function fitText(s, w) {
  if (textWidth(s) <= w) return s;
  while (s.length > 1 && textWidth(s + '…') > w) s = s.slice(0, -1);
  return s + '…';
}

// A piece of gear picked up: wear it or sell it, next to everything already worn, any of which can be sold.
class ItemOverlay {
  constructor(gs, item) {
    this.gs = gs;
    this.g = gs.game;
    this.item = item;
    this.t = 0;
    this.lockTime = 0.5;
    this.noSpace = true; // as with level-ups: no wearing or selling by a mashed Space
    gs.app.ui.focusId = 'wear';
    // A Rare or better climbs the rarities first (GEAR_CLIMB) and is told at slamAt; the rest at once.
    this.slamAt = item.rarity >= 2 ? Math.max(item.rarity * GEAR_CLIMB.step, GEAR_CLIMB.hold[item.rarity]) : 0;
    this.lockTime = Math.max(0.5, this.slamAt + 0.2);
    if (item.rarity <= 1) sfx('pick');
  }

  // The rarity the frame and title show now: climbing a step every GEAR_CLIMB.step seconds from
  // Common, stopping on the true one (never past it).
  shownRarity() {
    return Math.min(this.item.rarity, Math.floor(this.t / GEAR_CLIMB.step));
  }

  draw(ctx, W, H, dt) {
    const ui = this.gs.app.ui, g = this.g, it = this.item, R = RARITIES[it.rarity];
    this.t += dt;
    const told = this.t >= this.slamAt, shown = told ? it.rarity : this.shownRarity(), RS = RARITIES[shown];
    // An Epic or a Legendary is drawn out on near-black until it is told.
    dim(ctx, W, H, told || it.rarity < 3 ? 0.72 : 0.94);
    if (told && !this.slammed && it.rarity >= 2) {
      this.slammed = true;
      sfx(it.rarity === 4 ? 'legendary' : it.rarity === 3 ? 'epic' : 'reveal', { pitch: 1.5 });
      if (it.rarity === 4) this.g.shake(0.3);
    }
    const L = logo(RS.name.toUpperCase() + (shown >= 3 ? '!' : ''), RARITY_LOGO[shown]);
    // Told: the title pops in, a Legendary's slamming down from twice its size, an Epic's less.
    const since = this.t - this.slamAt, big = it.rarity === 4 ? 1.2 : it.rarity === 3 ? 0.7 : 0.5;
    const pop = since >= 0 && since < 0.25 ? 1 + big * (1 - ease.outBack(since / 0.25)) : 1;
    const s = Math.min(1, (W - 40) / L.width) * pop;
    ctx.globalAlpha = told ? 1 : 0.55;
    ctx.drawImage(L, Math.round(W / 2 - (L.width * s) / 2), Math.round(8 - (L.height * (s - 1)) / 2), Math.round(L.width * s), Math.round(L.height * s));
    ctx.globalAlpha = 1;
    const top = Math.round(12 + L.height);
    if (!told) {
      // The frame alone, climbing.
      const cw = Math.min(180, Math.floor((W - 22) / 2)), x0 = Math.round(W / 2 - cw - 3);
      panel(ctx, x0, top, cw, H - top - 6, { trim: [RS.color, '#262b44'] });
      return null;
    }
    const gap = 6, cw = Math.min(180, Math.floor((W - 16 - gap) / 2));
    const x0 = Math.round(W / 2 - cw - gap / 2), x1 = x0 + cw + gap;
    const ph = H - top - 6;
    ui.begin(dt);
    let res = null;
    // The find.
    panel(ctx, x0, top, cw, ph, { trim: [R.color, '#262b44'] });
    const icon = smoothScaled(SPR['g_' + it.slot].frames[0], 1);
    ctx.drawImage(icon, x0 + 7, top + 7);
    let ty = top + 8;
    for (const ln of wrapText(itemName(it), cw - 50)) {
      drawText(ctx, ln, x0 + 43, ty, { color: R.color });
      ty += 9;
    }
    drawText(ctx, `${R.name} ${SLOT_NAMES[it.slot].toLowerCase()}`, x0 + 43, ty, { color: '#8b9bb4' });
    ty = Math.max(ty + 13, top + 44);
    const dupe = powerWorn(g.gear, it.power, it.slot);
    itemLines(it).forEach((ln, i) => {
      const power = it.power && i === Object.keys(it.stats).length;
      drawText(ctx, ln, x0 + 8, ty, { color: power ? (dupe ? '#8b9bb4' : '#feae34') : '#c0cbdc' });
      ty += 9;
      if (power && dupe) {
        drawText(ctx, fitText('Already worn: a power counts once', cw - 16), x0 + 8, ty, { color: '#8b9bb4' });
        ty += 9;
      }
    });
    const worn = g.gear[it.slot];
    ty += 5;
    for (const ln of wrapText(worn ? `Instead of ${itemName(worn)}:` : `No ${SLOT_NAMES[it.slot].toLowerCase()} worn yet:`, cw - 16)) {
      drawText(ctx, ln, x0 + 8, ty, { color: '#8b9bb4' });
      ty += 9;
    }
    for (const [txt, good] of gearDiff(g.gear, it)) {
      drawText(ctx, txt, x0 + 12, ty, { color: good ? '#63c74d' : '#e43b44' });
      ty += 9;
    }
    const by = top + ph - 34, bw = cw - 16;
    // Every lord of a crypt may drop a piece, so several can be picked up at once (climbing out
    // with them, say): each is shown in turn, and the one shown says how many wait.
    const more = g.itemQueue.length;
    if (more && ty <= by - 11) drawText(ctx, fitText(`${more} more piece${more > 1 ? 's' : ''} to see after this`, cw - 16), x0 + 8, by - 11, { color: '#8b9bb4' });
    if (button(ctx, ui, 'wear', x0 + 8, by, bw, 13, worn ? `WEAR · OLD ONE +${itemPrice(worn)}` : 'WEAR')) {
      g.wearItem(it);
      sfx('pick');
      res = 'close';
    }
    if (!res && button(ctx, ui, 'sell', x0 + 8, by + 17, bw, 13, `SELL · +${itemPrice(it)} GOLD`, { color: '#feae34' })) {
      g.sellItem(it);
      res = 'close';
    }
    // Everything worn; any of it can be sold.
    panel(ctx, x1, top, cw, ph, { title: 'WORN' });
    const rowH = Math.floor((ph - 12) / SLOTS.length);
    SLOTS.forEach((slot, i) => {
      const y = top + 9 + i * rowH, w = g.gear[slot];
      if (slot === it.slot) {
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = R.color;
        ctx.fillRect(x1 + 3, y - 2, cw - 6, rowH - 1);
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(SPR['g_' + slot].frames[0].c, x1 + 5, y);
      if (!w) {
        drawText(ctx, `no ${SLOT_NAMES[slot].toLowerCase()}`, x1 + 24, y + 4, { color: '#5a6988' });
        return;
      }
      drawText(ctx, fitText(itemName(w), cw - 30), x1 + 24, y, { color: RARITIES[w.rarity].color });
      drawText(ctx, fitText(itemLines(w)[0], cw - 74), x1 + 24, y + 9, { color: '#8b9bb4' });
      if (!res && button(ctx, ui, 'sell_' + slot, x1 + cw - 46, y + 8, 40, 10, `+${itemPrice(w)}`, { color: '#feae34', pointer: false })) g.sellWorn(slot);
    });
    ui.end();
    if (res) g.state = 'play';
    return res;
  }
}

// ------------------------------------------------------------------ pause --

export class PauseOverlay {
  constructor(gs) {
    this.gs = gs;
    this.g = gs.game;
    this.options = null;
    this.confirm = false;
    gs.app.ui.focusId = 'resume';
  }

  draw(ctx, W, H, dt) {
    const ui = this.gs.app.ui, g = this.g, app = this.gs.app;
    if (this.options) {
      const r = this.options.draw(ctx, W, H, dt, true);
      if (r === 'close') {
        this.options = null;
        ui.focusId = 'resume';
        g.numbers.enabled = app.settings.numbers !== false;
      }
      return null;
    }
    dim(ctx, W, H, 0.6);
    const pw = Math.min(W - 16, 320), ph = Math.min(H - 20, 196);
    const x = Math.round(W / 2 - pw / 2), y = Math.round(H / 2 - ph / 2) + 4;
    panel(ctx, x, y, pw, ph, { title: 'PAUSED' });
    const p = g.player;
    // Build.
    let bx = x + 8, by = y + 10;
    drawText(ctx, 'WEAPONS', bx, by, { color: '#8b9bb4' });
    by += 10;
    for (const w of p.weapons) {
      ctx.drawImage(SPR[w.def.icon].frames[0].c, bx, by - 3);
      drawText(ctx, `${w.def.name}`, bx + 18, by + 1, { color: w.evolved ? '#f77622' : '#c0cbdc' });
      drawText(ctx, w.evolved ? 'MAX' : `LV ${w.level}`, x + pw / 2 - 6, by + 1, { align: 'right', color: '#8b9bb4' });
      by += 15;
    }
    let sx = x + pw / 2 + 4, sy = y + 10;
    drawText(ctx, 'RELICS', sx, sy, { color: '#8b9bb4' });
    sy += 10;
    for (const [id, r] of p.passives) {
      ctx.drawImage(SPR[PASSIVES[id].icon].frames[0].c, sx, sy - 3);
      drawText(ctx, PASSIVES[id].name, sx + 18, sy + 1, { color: '#c0cbdc' });
      drawText(ctx, `${r}`, x + pw - 8, sy + 1, { align: 'right', color: '#8b9bb4' });
      sy += 15;
    }
    const statY = Math.max(by, sy) + 2;
    // The clock the HUD showed: in a timed run, the time left.
    const stats = `${clockCountsDown(g) ? 'TIME LEFT' : 'TIME'} ${fmtTime(clockTime(g))} · LV ${p.level} · KILLS ${fmtNum(g.kills)} · GOLD ${fmtNum(g.gold)}`;
    const note = this.confirm ? 'Quitting ends the run. The gold you found is kept.' : stats;
    const auto = FILLERS[g.autoPick]?.short;
    drawText(ctx, note, W / 2, Math.min(statY, y + ph - (auto ? 66 : 50)), { align: 'center', color: this.confirm ? '#c0cbdc' : '#feae34' });
    ui.begin(dt);
    const bw = Math.min(90, (pw - 30) / 2);
    const row1 = y + ph - 38, row2 = y + ph - 20;
    // The filler every level-up takes since the player ticked ALWAYS on it, and the way back to
    // being asked (Game.autoPick).
    if (auto) {
      const label = `Level-ups: always ${auto}`, aw = 64, lw = textWidth(label);
      const lx = Math.round(W / 2 - (lw + 6 + aw) / 2), ay = row1 - 17;
      drawText(ctx, label, lx, ay + 3, { color: '#fee761' });
      if (button(ctx, ui, 'ask', lx + lw + 6, ay, aw, 12, 'ASK AGAIN', { color: '#2ce8f5', pointer: false })) {
        g.autoPick = null;
        ui.focusId = 'resume';
      }
    }
    if (button(ctx, ui, 'resume', Math.round(W / 2 - bw - 4), row1, bw, 13, 'RESUME') || (input.pressed('pause') && ui.lockT <= 0)) {
      g.state = 'play';
      return 'close';
    }
    if (button(ctx, ui, 'opts', Math.round(W / 2 + 4), row1, bw, 13, 'OPTIONS')) {
      this.options = new OptionsScreen();
      this.options.enter(app, { back: null });
    }
    // One way out of a run: it ends, with its results and gold. (A run is never saved to pick
    // up again.)
    if (button(ctx, ui, 'quit', Math.round(W / 2 - bw / 2), row2, bw, 13, this.confirm ? 'SURE?' : 'QUIT RUN', { color: '#e43b44' })) {
      if (this.confirm) {
        g.finish(false);
        this.gs.open(new ResultsOverlay(this.gs));
        return null;
      }
      this.confirm = true;
    }
    ui.end();
    return null;
  }
}

// ---------------------------------------------------------------- results --

// How the results tell the run (ResultsOverlay): the title first; then the rows tick in `row`
// seconds apart from `rows` on, a soft tick each, a record broken stamped NEW BEST; the gold
// counts up over goldMin to goldMax seconds (the more, the longer) with coins climbing in pitch,
// and lands with a thunk. Any key, click or tap shows it all at once; only then does RETURN TO
// CAMP take a press.
export const TALLY = { rows: 0.6, row: 0.16, weapon: 0.08, gap: 0.3, goldMin: 1.5, goldMax: 2.5 };
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// What gold buys at the Armory now: how many ranks are affordable, or how far the cheapest is.
export function armoryLine(p) {
  let n = 0, near = null;
  for (const u of UPGRADES) {
    const rank = p.up[u.id] || 0;
    if (rank >= u.max) continue;
    const cost = upgradeCost(u.id, rank);
    if (cost <= p.gold) n++;
    else if (!near || cost - p.gold < near.need) near = { need: cost - p.gold, name: `${u.name} ${ROMAN[rank] || rank + 1}` };
  }
  if (n) return `${n} Armory rank${n > 1 ? 's' : ''} affordable`;
  return near ? `+${fmtNum(near.need)} gold to ${near.name}` : 'The Armory is complete';
}

class ResultsOverlay {
  constructor(gs) {
    this.gs = gs;
    this.g = gs.game;
    this.t = 0;
    this.reward = null;
    this.shown = 0;
    this.lockTime = 1;
    const res = this.g.result || (this.g.finish(false), this.g.result);
    this.res = res;
    // The records as they stood before this run: a row beating one is stamped NEW BEST.
    this.before = { ...gs.app.store.profile.best };
    this.rows = this.tally();
    this.ticked = 0; // rows that have ticked in
    this.goldAt = null; // when the gold began to count (this.t)
    this.landed = false; // the count is done (or skipped): RETURN TO CAMP takes a press
    this.submit();
    // A win's jingle is heard in full, the title piece after it; a fall's lament plays now.
    if (res.victory) playAfterJingle('title');
    else if (this.g.player.dead) playJingle('gameover');
    gs.app.ui.focusId = 'camp';
  }

  // The rows: [label, value, record broken].
  tally() {
    const res = this.res, st = res.stats, b = this.before, ranked = res.mode === 'ranked';
    const rows = [[ranked ? 'Survived' : 'Time', fmtTime(res.time), res.mode === 's15' && res.time > (b.s15 || 0)]];
    if (ranked) rows.push(['Rank', rankTitle(res.time), false]);
    if (res.mode === 'dungeon') rows.push(['Floor reached', String(res.floor), false]);
    rows.push(
      ['Level', String(res.level), res.level > (b.level || 0)],
      ['Kills', fmtNum(res.kills), res.kills > (b.kills || 0)],
      ['Best combo', String(st.maxCombo), false],
      ['Bosses slain', String(st.bosses), false],
      ['Damage dealt', fmtNum(st.damage), false],
    );
    return rows;
  }

  submit() {
    const res = this.res;
    this.reward = null;
    this.gs.app.store.submitRun({
      mode: res.mode, diff: res.diff, nightmare: res.nightmare, hero: res.hero, victory: res.victory, time: res.time, gold: res.gold, kills: res.kills, level: res.level, floor: res.floor,
      gear: res.gear, realTime: res.realTime, found: res.found,
    }).then((r) => {
      // Nothing paid for a run that found gold or won: the store didn't take it, whatever the
      // reason (on static hosting a refused run comes back as a bare zero), and the screen says so.
      this.reward = !r.unsaved && !r.total && (res.gold > 0 || res.victory) ? { ...r, unsaved: true } : r;
    });
  }

  // When the rows and the weapons have all ticked in.
  get rowsEnd() {
    return TALLY.rows + this.rows.length * TALLY.row + Math.min(6, this.res.weapons.length) * TALLY.weapon;
  }

  // How long the gold counts: the more, the longer.
  goldFor(total) {
    return TALLY.goldMin + (TALLY.goldMax - TALLY.goldMin) * clamp(Math.log10(total + 1) / 4, 0, 1);
  }

  // Everything shown at once.
  skip() {
    this.t = Math.max(this.t, this.rowsEnd + TALLY.gap);
    this.ticked = this.rows.length;
    if (this.reward && !this.reward.unsaved) {
      this.shown = this.reward.total;
      this.land();
    }
  }

  land() {
    if (this.landed) return;
    this.landed = true;
    if (this.reward && this.reward.total > 0) sfx('thunk');
  }

  // A win's backdrop: a sunrise (a warm sky, slow rays from the sun under the panel). A fall's
  // stays cold: the dark over the drained world.
  backdrop(ctx, W, H) {
    if (!this.res.victory) {
      dim(ctx, W, H, Math.min(0.85, this.t * 1.5));
      return;
    }
    const k = clamp(this.t * 1.2, 0, 1);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, 'rgba(26,16,48,0.92)');
    sky.addColorStop(0.55, 'rgba(116,44,52,0.86)');
    sky.addColorStop(0.85, 'rgba(247,118,34,0.8)');
    sky.addColorStop(1, 'rgba(254,231,97,0.85)');
    ctx.globalAlpha = k;
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H + 10);
    ctx.rotate(this.t * 0.05);
    ctx.globalAlpha = 0.12 * k;
    ctx.fillStyle = '#fff3a8';
    for (let i = 0; i < 16; i++) {
      ctx.rotate(TAU / 16);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W + H, -12);
      ctx.lineTo(W + H, 12);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  draw(ctx, W, H, dt) {
    const ui = this.gs.app.ui, app = this.gs.app, res = this.res;
    this.t += dt;
    // Any key, click or tap before the end shows it all.
    if (!this.landed && this.t > 0.3 && (input.anyKey || input.mouse.clicked)) {
      this.skip();
      input.mouse.clicked = false;
      ui.lock(0.25);
    }
    this.backdrop(ctx, W, H);
    const title = res.victory ? (res.mode === 'dungeon' ? 'VICTORY' : 'DAWN BREAKS') : 'YOU HAVE FALLEN';
    const cols = res.victory ? ['#ffffff', '#fee761', '#feae34', '#f77622', '#be4a2f'] : ['#f6757a', '#e43b44', '#a22633', '#5c0f1c', '#3e2731'];
    const L = logo(title, cols);
    const s = Math.min(1, (W - 20) / L.width);
    ctx.globalAlpha = clamp(this.t * 2, 0, 1);
    ctx.drawImage(L, Math.round(W / 2 - (L.width * s) / 2), 8, Math.round(L.width * s), Math.round(L.height * s));
    ctx.globalAlpha = 1;
    const ranked = res.mode === 'ranked';
    let sub = `${HEROES[res.hero].name} · ${MODES[res.mode].name} ${MODES[res.mode].sub}${res.nightmare ? ` · ${NIGHTMARE.name}` : ''}`;
    if (!res.victory && res.stats.killedBy) sub += ` · slain by ${res.stats.killedBy}`;
    drawText(ctx, fitText(sub, W - 8), W / 2, 12 + L.height * s, { align: 'center', color: res.victory ? '#feae34' : '#8b9bb4' });
    if (this.t < TALLY.rows - 0.2) return null;
    // Personal bests and anything this run unlocked, shown above the gold once it has landed.
    const notes = [];
    if (this.reward && this.landed) {
      const rk = this.reward.ranked;
      if (rk) notes.push(rk.personalBest ? ['★ NEW PERSONAL BEST ★', '#63c74d'] : [`Personal best: ${fmtTime(rk.best)}`, '#8b9bb4']);
      for (const k of this.reward.unlocks || []) notes.push([unlockText(k), '#fee761']);
      if (!this.announced && (this.reward.unlocks?.length || rk?.personalBest)) {
        this.announced = true;
        sfx(rk?.personalBest ? 'record' : 'unlock');
      }
    }
    // The weapons beside the rows, or under them on a narrow screen.
    const pw = Math.min(W - 16, 340), side = pw >= 330, nw = Math.min(6, res.weapons.length);
    const ph = Math.min(H - 52 - L.height * s, 178 + notes.length * 10 + (side ? 0 : nw * 15 - 10));
    const x = Math.round(W / 2 - pw / 2), y = Math.round(24 + L.height * s);
    panel(ctx, x, y, pw, ph, res.victory ? { trim: ['#fee761', '#be4a2f'], rivets: true } : {});
    // The rows, one by one, each with a tick; a record broken stamped NEW BEST.
    const due = Math.min(this.rows.length, Math.floor((this.t - TALLY.rows) / TALLY.row) + 1);
    while (this.ticked < due) {
      const [, , best] = this.rows[this.ticked++];
      sfx(best ? 'pick' : 'tally', { pitch: 1 + this.ticked * 0.04 });
    }
    let ty = y + 8;
    this.rows.slice(0, this.ticked).forEach(([k, v, best], i) => {
      drawText(ctx, k, x + 8, ty, { color: '#8b9bb4' });
      drawText(ctx, v, x + 108, ty, { align: 'right', color: best ? '#fee761' : '#c0cbdc' });
      if (best) {
        // Stamped: twice the size for a moment, then set (whole pixels, the font stays crisp).
        const pop = this.t - (TALLY.rows + i * TALLY.row) < 0.12 ? 2 : 1;
        const c = textCanvas('NEW BEST', ['#ffffff', '#9ee562', '#63c74d'], '#181425');
        ctx.drawImage(c, x + 112, Math.round(ty - 1 - (c.height * (pop - 1)) / 2), c.width * pop, c.height * pop);
      }
      ty += 10;
    });
    // The weapons, after the rows.
    const wFrom = TALLY.rows + this.rows.length * TALLY.row;
    let wy = side ? y + 8 : y + 14 + this.rows.length * 10;
    const wx = side ? x + 166 : x + 8;
    res.weapons.slice(0, 6).forEach((w, j) => {
      if (this.t < wFrom + j * TALLY.weapon) return;
      const def = WEAPONS[w.id];
      ctx.drawImage(SPR[def.icon].frames[0].c, wx, wy - 3);
      drawText(ctx, fitText(def.name, x + pw - 74 - wx - 18), wx + 18, wy + 1, { color: def.evolved ? '#f77622' : '#c0cbdc' });
      const secs = Math.max(1, res.time - (w.since || 0));
      drawText(ctx, `${fmtNum(w.dmg)}  ${fmtNum(w.dmg / secs)}/s`, x + pw - 8, wy + 1, { align: 'right', color: '#feae34' });
      wy += 15;
    });
    // The gold, counting up once the rows are in and the store has answered; then what next.
    const gy = y + ph - 51;
    notes.forEach(([text, color], i) => drawText(ctx, text, W / 2, gy - 4 - (notes.length - i) * 10, { align: 'center', color }));
    const unsaved = this.reward?.unsaved;
    const counting = this.reward && !unsaved && this.t >= this.rowsEnd + TALLY.gap;
    if (unsaved) {
      const why = this.reward.down ? 'the game server can\'t be reached' : this.reward.error;
      drawText(ctx, fitText(`This run's gold isn't saved${why ? `: ${why}` : ''}`, pw - 12), W / 2, gy, { align: 'center', color: '#e43b44' });
      this.landed = true;
    } else if (counting) {
      const total = this.reward.total;
      this.goldAt ??= this.t;
      if (!total) this.land(); // nothing to count
      if (!this.landed) {
        const k = clamp((this.t - this.goldAt) / this.goldFor(total), 0, 1);
        const before = this.shown;
        this.shown = total * ease.outCubic(k);
        // A coin a twentieth of the way, climbing in pitch.
        const step = Math.max(1, total / 20);
        if (Math.floor(this.shown / step) > Math.floor(before / step)) sfx('coin', { pitch: 1 + 0.6 * (this.shown / Math.max(1, total)) });
        if (k >= 1) this.land();
      }
      const parts = `Collected ${res.gold} × ${this.reward.multiplier}` + (this.reward.bonus ? ` + ${this.reward.bonus} victory bonus` : '');
      drawText(ctx, fitText(parts, pw - 12), W / 2, gy, { align: 'center', color: '#8b9bb4' });
      const c = textCanvas(`+${fmtNum(Math.floor(this.shown))} GOLD`, ['#fff3a8', '#fee761', '#feae34'], '#181425');
      ctx.drawImage(c, Math.round(W / 2 - c.width), gy + 9, c.width * 2, c.height * 2);
    } else if (!this.reward) drawText(ctx, 'Counting your spoils…', W / 2, gy + 6, { align: 'center', color: '#8b9bb4' });
    if (this.landed && this.reward) {
      // What next: the next goal, and what the gold buys.
      const prof = app.store.profile;
      drawText(ctx, fitText('NEXT: ' + goalText(nextGoal(prof)), pw - 12), W / 2, y + ph - 20, { align: 'center', color: '#feae34' });
      drawText(ctx, fitText(armoryLine(prof), pw - 12), W / 2, y + ph - 11, { align: 'center', color: '#c0cbdc' });
    }
    ui.begin(dt);
    if (unsaved && this.reward.down && button(ctx, ui, 'resubmit', Math.round(W / 2 - 50), gy + 10, 100, 13, 'SAVE AGAIN')) this.submit();
    const by = Math.min(H - 20, y + ph + 6);
    // One way on: back to camp, the hero screen with this run's hero ready (the owner dropped TRY
    // AGAIN). Before the count has landed a press only shows it all.
    if (button(ctx, ui, 'camp', Math.round(W / 2 - 50), by, 100, 14, 'RETURN TO CAMP', { color: this.landed ? '#fee761' : '#8b9bb4' })) {
      if (this.landed) {
        app.choice.hero = res.hero;
        app.go('hero');
      } else this.skip();
    }
    ui.end();
    return null;
  }
}
