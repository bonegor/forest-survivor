// The in-game screen: runs a Game and layers the HUD and modal overlays
// (level up, treasure chests, gear found, pause, results) on top.

import { input, padKey } from '../engine/input.js';
import { sfx, playAfterJingle, playJingle, playMusic } from '../engine/audio.js';
import { view } from '../engine/view.js';
import { SPR, smoothScaled } from '../engine/sprites.js';
import { fmtTime, fmtNum, clamp, ease, rand, TAU } from '../engine/util.js';
import { Game, MILESTONES, isFiller, FLASH_SOFT } from '../game/game.js';
import { tierOf, chestFrame, chestTease, revealOrder, chestSlots, chestTimeline, CHEST_TIME, CEREMONY, evolvedFrom, evolveLines, iconColor } from '../game/chests.js';
import { clockCountsDown, clockTime, heldBuild, revealOn, SLOT_LIT, slotsLeftOf } from '../game/hud.js';
import { levelBonus } from '../game/player.js';
import { heroStats } from '../game/weapons.js';
import { WEAPONS, MAX_WEAPON_LEVEL } from '../data/weapons.js';
import { PASSIVES, FILLERS, BLESSING } from '../data/passives.js';
import { HEROES } from '../data/heroes.js';
import { MODES, NIGHTMARE } from '../data/difficulty.js';
import { metaBonuses, openFor, rankTitle, unlocksNext, nextGoal, UPGRADES, upgradeCost, upgradeOpen, affordableRanks, PROGRESS, needText } from '../shared/profile.js';
import { SLOTS, SLOT_NAMES, RARITIES, STATS, BONUS_KEYS, itemName, itemLines, itemPrice, gearBonuses, powerWorn } from '../shared/items.js';
import { unlockText, goalText, nearestLocks, codexName, codexRecord, codexIcon } from './ladder.js';
import { panel, button, dim, drawText, drawRich, wrapText, textWidth, textCanvas, logo } from './ui.js';
import { buttonFace } from './skin.js';
import { OptionsScreen, codexBar } from './screens.js';
import { saveSettings, seenBox } from '../engine/storage.js';

export class GameScreen {
  enter(app, params = {}) {
    this.app = app;
    const { hero, mode } = app.choice;
    this.game = new Game({
      hero,
      mode,
      diff: app.choice.diff || 'easy', // Normal, Veteran or Elite: Normal unless chosen, as the trial screen shows
      nightmare: app.choice.nightmare === true, // three times the monsters, if ticked there (Elite only, never on Ranked)
      rankedBest: mode === 'ranked' ? app.store.profile.ranked?.[hero] || 0 : 0,
      // The records a run can break as it goes (Game.checkRecords), as they stand now.
      records: { kills: app.store.profile.best.kills, level: app.store.profile.best.level, time: mode === 's15' ? app.store.profile.best.s15 : 0 },
      meta: metaBonuses(app.store.profile),
      open: openFor(app.store.profile, hero), // the weapons, relics and ultimate opened so far
      gear: app.store.profile.gear[hero], // this hero's own
      unlocks: unlocksNext(app.store.profile, hero),
      settings: app.settings,
      hints: true,
      saveSettings: () => saveSettings(app.settings),
    });
    this.game.gold = this.game.stats.gold = params.prologueGold || 0;
    // Nothing of the run is saved while it lasts: its results reach the save when it ends
    // (ResultsOverlay), by death, Quit Run or victory.
    // The seen list as the run began (engine/storage.js seenBox), for the level-up's FIRST FIND; the
    // marks it makes are written when the run ends, as nothing is while it lasts (the hints' rule).
    this.seen = seenBox.read();
    this.offeredNew = [];
    this.overlay = null;
    this.away = false; // the game was left; the run pauses once it is back in play (frame)
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
    this.away = false; // a screen up holds the run still: no pause waits behind it
    this.overlay = overlay;
    this.app.ui.lock(overlay.lockTime ?? 0.35);
    this.app.ui.noSpace = !!overlay.noSpace;
    this.touchFor(overlay);
  }

  // The run stands still under the PAUSED panel: by Esc, P, Start or the pause button, and quietly
  // when the game is left behind (input.away), for on itch.io a click on the page around its frame
  // left the horde hitting a hero who couldn't move, and quitting ends the run (no saved runs).
  // Only in play: a screen already up holds the run still.
  pause(quiet = false) {
    if (this.overlay || this.game.state !== 'play') return false;
    this.game.state = 'paused';
    this.open(new PauseOverlay(this));
    if (!quiet) sfx('back');
    return true;
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
      // Left behind on a stairway, at a crypt door or in a faint: paused once the run is back in play.
      this.away ||= input.away;
      if (input.pressed('pause')) this.pause();
      else if (this.away) this.pause(true);
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

// What a relic's lock asks, in words ('Survive 4:00 in one run'), or ''.
const relicNeed = (id) => {
  const l = PROGRESS.locks.find((x) => x.type === 'relic' && x.id === id);
  return l ? needText(l) : '';
};

// What a weapon card says of its evolution (Game.evoState), or null for one with none. The
// owner's (27 October 2026): until a run before has made that evolution its relic is never named
// ("Evolves with a relic yet unknown"); once known, whether the relic is owned, may still come
// (missing), or is blocked this run: still locked (and what opens it), banished, or no relic slot
// free. name and word: the stacked card's one line; line1 and line2: the tall card's two (short:
// line2 where it doesn't fit).
function evoHint(g, id) {
  const s = g.evoState(id);
  if (!s) return null;
  if (s.state === 'unknown') return { unknown: true, name: 'A relic yet unknown', icon: null, word: 'unknown', line1: 'Evolves with a relic', line2: 'yet unknown', color: '#8b9bb4' };
  const r = PASSIVES[s.relic], need = s.state === 'locked' ? relicNeed(s.relic) : '';
  const [word, line2, color, short] = {
    owned: ['owned', 'Partner owned', '#feae34'],
    open: ['missing', 'Partner missing', '#8b9bb4'],
    locked: [need ? `locked: ${need[0].toLowerCase()}${need.slice(1)}` : 'locked', need ? `Locked: ${need}` : 'Partner locked', '#f6757a', 'Partner locked'],
    banished: ['banished', 'Partner banished', '#f6757a'],
    full: ['no relic slot', 'No relic slot free', '#f6757a'],
  }[s.state];
  return { name: r.name, icon: r.icon, owned: s.state === 'owned', word, line2, short, color };
}

// What a card tells of the evolution it completes (Game.completesEvolution), as its gold back and
// its COMPLETES line: the evolution once a run before has made it (Game.evoKnown), else UNTOLD.
// Its name beside "Evolves with a relic yet unknown" gave away what the relic held was for (28
// October 2026): a weapon brought to the top with its relic held, or a Phoenix Heart, which evolves
// any, still has the gold back while the evolution is unknown (the next chest evolves it, and the
// HUD says EVOLVE READY once it is at hand), but its line says "COMPLETES ???". A new relic whose
// own pairing is the secret tells nothing, for a gold back would name it.
export const UNTOLD = '???';
const toldCompletes = (g, c) => {
  const into = g.completesEvolution(c);
  if (!into || g.evoKnown(evolvedFrom(into))) return into;
  return c.type === 'passive' && !PASSIVES[c.id].evolvesAny ? null : UNTOLD;
};
// The gold line of a card that completes an evolution (toldCompletes): its name, or ??? untold.
const completesLine = (into) => `COMPLETES ${into === UNTOLD ? UNTOLD : WEAPONS[into].name.toUpperCase()}`;

// A card's change in numbers, as this hero has it (cardChange): signed percent, a multiplier as
// percent, a whole number.
const pct = (v) => `${v < 0 ? '-' : '+'}${Math.round(Math.abs(v) * 100)}%`, mul = (v) => pct(v - 1), flat = (v) => `${Math.round(v)}`;
// A weapon level's main stat, the first of these the level changes: [key, label, as this hero has
// it, shown as]. Damage takes his might (Game.hitEnemy); the rest are his already (heroStats).
const WEAPON_LINE = [
  ['dmg', 'Damage', (v, p) => v * p.might, flat],
  ['amount', 'Count', (v) => v, flat],
  ['cd', 'Cooldown', (v) => v, (v) => `${v.toFixed(2)}s`],
  ['area', 'Area', (v) => v, (v) => `${Math.round(v * 100)}%`],
  ['pierce', 'Pierce', (v) => v, flat],
  ['dur', 'Lasts', (v) => v, (v) => `${v.toFixed(1)}s`],
  ['speed', 'Speed', (v) => v, (v) => `${Math.round(v * 100)}%`],
];
// A relic's stat (the first of its PASSIVES stat) as the hero's own total: [label, from
// Player.derived, shown as]. His own multipliers are in it: the Knight's and the Paladin's
// regeneration, the Ranger's might, the Witch Hunter's Inquisition, the Paladin's healing.
const RELIC_LINE = {
  might: ['Damage', (s) => s.might, mul],
  armor: ['Armor', (s) => s.armor, flat],
  maxHp: ['Max health', (s) => s.maxHp, flat],
  regen: ['Health a second', (s) => s.regen, (v) => v.toFixed(1)],
  cooldown: ['Cooldowns', (s) => s.cooldown, mul],
  area: ['Area', (s) => s.area, mul],
  projSpeed: ['Projectile speed', (s) => s.projSpeed, mul],
  duration: ['Effects last', (s) => s.duration, mul],
  speed: ['Move speed', (s) => s.speedMul, mul],
  magnet: ['Pickup range', (s) => s.magnet, flat],
  luck: ['Luck', (s) => s.luck, mul],
  bane: ['Damage to the strong', (s, p) => (1 + (p.hero.stats.bane || 0)) * (1 + s.huntBane), mul],
  torc: ['Low-health damage', (s) => s.torc, pct],
  thorns: ['Damage back', (s) => s.thorns, flat],
  dodge: ['Dodge', (s) => s.dodge, pct],
  ember: ['Burn chance', (s) => s.ember, pct],
  knock: ['Knockback', (s) => s.knock, pct],
  fang: ['Heals', (s) => s.fang * s.healMul, (v) => `${(v * 100).toFixed(1)}%`],
  amount: ['Extra projectiles', (s) => s.amount, flat],
  growth: ['Experience', (s) => s.growth, mul],
};
// The owner's (27 October 2026): one before → after line on an upgrade card, as this hero has
// it ("Damage 46 → 48 (+4%)", "Health a second 0.3 → 0.9"); null for a NEW weapon, a filler, or a
// relic with nothing to measure (the Phoenix Heart, Rimeheart).
export function cardChange(g, c) {
  const p = g.player;
  if (c.type === 'weapon') {
    const def = WEAPONS[c.id], lv = !c.isNew && def.levels?.[c.level - 2];
    const row = lv && WEAPON_LINE.find(([k]) => k in lv);
    if (!row) return null;
    const [k, label, as, fmt] = row;
    const a = as(heroStats(def, c.level - 1, p)[k], p), b = as(heroStats(def, c.level, p)[k], p);
    return `${label} ${fmt(a)} → {${fmt(b)}}${k === 'dmg' && a > 0 ? ` (+${Math.round((b / a - 1) * 100)}%)` : ''}`;
  }
  if (c.type === 'passive') {
    const row = RELIC_LINE[Object.keys(PASSIVES[c.id].stat)[0]];
    if (!row) return null;
    const [label, of, fmt] = row;
    const next = new Map(p.passives).set(c.id, (p.passives.get(c.id) || 0) + 1);
    return `${label} ${fmt(of(p.derived(), p))} → {${fmt(of(p.derived(next), p))}}`;
  }
  return null;
}

// The review's D7 (27 October 2026): a card the hero's own perk makes count for more says so,
// "Synergy: Bulwark" in his colour (the perk's name before its colon). Only where the perk
// multiplies what the card gives: regeneration under a perk that multiplies it (the Knight's
// Bulwark, the Paladin's Devotion); a heal under one that multiplies every heal (the Paladin's
// Devotion: the Vampire Fang, the Roast Chicken); Hunter's Mark under the Witch Hunter's
// Inquisition, whose bane it multiplies (Game.hitEnemy); the Berserker's Torc under the
// Berserker's Bloodrage, both rising as his health falls. A hero's plain stat (the Ranger's might,
// the Sorcerer's cooldowns) only starts higher, so a relic of it is no synergy. Null for any other.
export function cardSynergy(g, c) {
  const h = g.player.hero, s = h.stats;
  const key = c.type === 'passive' ? Object.keys(PASSIVES[c.id].stat)[0] : c.type;
  const on = key === 'regen' ? (s.regenMul || 1) > 1 : key === 'fang' || key === 'heal' ? (s.healMul || 1) > 1 : key === 'bane' ? !!s.bane : key === 'torc' ? !!s.rage : false;
  return on && h.perk ? { text: `Synergy: ${h.perk.split(':')[0]}`, color: h.color } : null;
}

// What a card shows: its name, icon and text; its tag (a NEW weapon or relic, or the level it
// brings) and colour; what it evolves with (evoHint); its change in numbers (cardChange); its
// synergy with the hero's perk (cardSynergy); and how many levels it has, for its pips (max: 0
// for a filler).
function choiceInfo(g, c) {
  const p = g.player;
  if (c.type === 'weapon') {
    const def = WEAPONS[c.id];
    const desc = c.isNew ? def.desc : def.levels[c.level - 2]?.text || def.desc;
    const hint = def.evo ? evoHint(g, c.id) : null;
    return { name: def.name, icon: def.icon, desc, isNew: !!c.isNew, tag: c.isNew ? 'NEW WEAPON' : `LV ${c.level}`, color: c.isNew ? '#0099db' : '#c0cbdc', hint, change: cardChange(g, c), max: MAX_WEAPON_LEVEL };
  }
  if (c.type === 'passive') {
    const def = PASSIVES[c.id];
    let hint = null;
    // The weapon it evolves, only once that evolution is known (Game.evoKnown).
    for (const w of p.weapons) if (!w.evolved && w.def.evo && w.def.evo.with === c.id && g.evoKnown(w.id)) hint = { name: w.def.name, icon: w.def.icon, owned: true, word: 'evolves', line2: 'Evolves it', color: '#feae34' };
    return { name: def.name, icon: def.icon, desc: def.desc, isNew: !!c.isNew, tag: c.isNew ? 'NEW RELIC' : `LV ${c.level}`, color: c.isNew ? '#63c74d' : '#9ee562', hint, change: cardChange(g, c), synergy: cardSynergy(g, c), max: def.max };
  }
  const { name, icon } = FILLERS[c.type], B = BLESSING;
  // The three Blessings (the owner's, 27 October 2026), each counted on its tag.
  if (c.type === 'bless') return { name, icon, desc: `Might {+${B.might * 100}%}, health {+${B.maxHp * 100}%}. Stacks.`, tag: `x${p.blessings + 1}`, color: '#fee761', max: 0 };
  if (c.type === 'haste') {
    // At the floor it says so, as Reach at its most (a capped one isn't offered: Game.blessingCapped).
    const desc = g.blessingCapped('haste') ? 'Cooldowns at their floor: {no more}.' : `Cooldowns {${B.cooldown * 100}%}. Stacks.`;
    return { name, icon, desc, tag: `x${p.hastes + 1}`, color: '#fee761', max: 0 };
  }
  if (c.type === 'reach') {
    const desc = p.reaches < B.reachMost ? `Area {+${B.area * 100}%}. Stacks to {+${Math.round(B.area * B.reachMost * 100)}%}.` : 'Area at its most: {no more}.';
    return { name, icon, desc, tag: `x${p.reaches + 1}`, color: '#fee761', max: 0 };
  }
  if (c.type === 'gold') return { name, icon, desc: `Gain {${c.value}} gold.`, tag: '', color: '#feae34', max: 0 };
  // The heal as this hero has it (Player.heal: the Paladin's Devotion, x1.5), full health at most.
  return { name, icon, desc: `Restore {${Math.min(100, Math.round(c.value * p.healMul * 100))}%} health.`, tag: '', color: '#e43b44', synergy: cardSynergy(g, c), max: 0 };
}

// A card's levels as pips under its tag: those it has in gold, the one it brings blinking, those
// still to come dark. Nothing for a filler or a relic of one rank.
function drawPips(ctx, cx, y, level, max, t) {
  if (max <= 1) return;
  const pw = max > 5 ? 3 : 4, total = max * pw + (max - 1);
  const x0 = Math.round(cx - total / 2);
  ctx.fillStyle = '#0d0b14';
  ctx.fillRect(x0 - 1, y - 1, total + 2, 5);
  for (let k = 0; k < max; k++) {
    ctx.fillStyle = k < level - 1 ? '#feae34' : k === level - 1 ? (Math.floor(t * 4) % 2 ? '#ffffff' : '#fee761') : '#3a4466';
    ctx.fillRect(x0 + k * (pw + 1), y, pw, 3);
  }
}

// The key that does what a button of the level-up's foot does, on a small cap at its left.
function keycap(ctx, x, y, k, off) {
  const w = textWidth(k) + 4;
  ctx.fillStyle = off ? '#3a4466' : '#8b9bb4';
  ctx.fillRect(x, y, w, 9);
  ctx.fillStyle = '#181425';
  ctx.fillRect(x + 1, y + 1, w - 2, 7);
  drawText(ctx, k, x + 2, y + 1, { color: off ? '#5a6988' : '#c0cbdc', outline: null });
}

// A button of the level-up's foot (BANISH, REROLL). Held (the screen's first moments, or cards
// flipping) it is only drawn, greyed: the focus can't land on it and nothing presses it.
function footButton(ctx, ui, id, x, y, w, label, o) {
  let hit = false;
  if (o.held) {
    buttonFace(ctx, x, y, w, 13, 'off');
    drawText(ctx, label, x + w / 2, y + 2, { align: 'center', color: '#5a6988' });
  } else hit = button(ctx, ui, id, x, y, w, 13, label, { color: o.color, disabled: o.disabled });
  // Past the button's pointed end.
  if (o.key) keycap(ctx, x + 9, y + 1, o.key, o.held || o.disabled);
  return hit;
}

// The cards come face down and flip up FLIP.gap apart, each in FLIP.dur; they can be taken once the
// last is up. A press before that is dropped, not kept.
export const FLIP = { first: 0.05, gap: 0.1, dur: 0.1 };
const flipAt = (i) => FLIP.first + i * FLIP.gap;
export const cardsReadyAt = (n) => flipAt(n - 1) + FLIP.dur;
// The screen pops up mid-fight, where Space, E or Q is the ultimate and a number key may be under a
// finger, so for its first LEVELUP_DELAY no card can be taken. The owner (2026-10-20): "we can
// still flip left and right in menu items, but only the select has like a 0.5 to maybe 1 second
// delay, have it meaningfully greyed out". So the focus moves from the first frame (the arrows,
// a pad, the mouse, a click or tap, a card's number), but a press that would take a card, reroll
// or banish is dropped, never kept for later; the cards stand greyed, the focused one framed in
// grey over a bar that fills to the moment, and then the ready highlight snaps in.
export const LEVELUP_DELAY = 0.75;
// A banished card takes BANISH_GO s to go before its place flips up anew; on touch a finger held
// BANISH_HOLD s on a card banishes it.
export const BANISH_GO = 0.3;
export const BANISH_HOLD = 0.5;
// A card's back tells its kind: an upgrade's plain, a NEW weapon's blue, a NEW relic's green, and
// gold for one that completes an evolution (Game.completesEvolution). [fill, trim, pattern]
const BACKS = {
  plain: ['#262b44', '#5a6988', '#3a4466'],
  weapon: ['#124e89', '#0099db', '#2ce8f5'],
  relic: ['#265c42', '#63c74d', '#9ee562'],
  gold: ['#be4a2f', '#fee761', '#feae34'],
};
const backOf = (c, completes) => (completes ? 'gold' : c.isNew ? (c.type === 'weapon' ? 'weapon' : 'relic') : 'plain');
// A chain of levels gained at once (the 27 October 2026 review, C3; 28 October 2026): its first
// screen stamped "×3" beside the title, the next "2 of 3", as a batch of swarms says which it is
// (Game.eventWarning, the owner's "N of M"). Nothing for a level alone. ({ at, of }:
// LevelUpOverlay.chain.)
export const chainStamp = ({ at, of }) => (of <= 1 ? '' : at === 1 ? `×${of}` : `${at} of ${of}`);
// FIRST FIND (the review's C5, 28 October 2026): a level-up card's tag the first time this browser is
// offered a weapon or relic a milestone opened (shared/progress.js locks), in place of NEW WEAPON or
// NEW RELIC. offerKey: its key in the seen list (engine/storage.js seenBox; ui/ladder.js seenKey's
// letters). Never without a seen list.
export const offerKey = (c) => `${c.type === 'weapon' ? 'w' : 'r'}:${c.id}`;
export function firstFind(c, seen) {
  if (!seen || !c.isNew || (c.type !== 'weapon' && c.type !== 'passive')) return false;
  const type = c.type === 'weapon' ? 'weapon' : 'relic';
  return PROGRESS.locks.some((l) => !l.retired && l.type === type && l.id === c.id) && !seen.offered.has(offerKey(c));
}

export class LevelUpOverlay {
  constructor(gs) {
    this.gs = gs;
    this.g = gs.game;
    this.t = 0;
    this.roll();
    // The second screen of a chain (more levels waiting) or a reroll comes when the player is already
    // choosing, so only the flips hold it; the first waits the full LEVELUP_DELAY.
    this.readyAt = Math.max(this.readyAt, LEVELUP_DELAY);
    // No lock on the keys: the focus moves from the first frame, and the cards hold themselves
    // (heldCard) until they can be taken.
    this.lockTime = 0;
    this.noSpace = true; // it pops up mid-fight: Space mashed for the ultimate mustn't pick a card
    // Shift is the crypts' strike too: held as the screen opens, it isn't ALWAYS until it has been
    // let go and pressed again.
    this.heldAlways = input.down('always');
    // The first level-up screen's footer tells what a card is (hints.js 'levelup'), until a card is
    // taken from it.
    this.teach = !!this.g.hints && !this.g.hints.said('levelup');
    // The screens of its chain already taken (chain): it stays up from one level to the next.
    this.taken = 0;
  }

  roll() {
    this.choices = this.g.levelChoices(this.g.choiceCount());
    // What each card completes (an evolution, or UNTOLD while unknown), its back, and when it flips up.
    this.completes = this.choices.map((c) => toldCompletes(this.g, c));
    this.backs = this.choices.map((c, i) => backOf(c, this.completes[i]));
    this.first = this.choices.map((c) => this.markFirst(c)); // FIRST FIND, in place of NEW
    this.flips = this.choices.map((c, i) => flipAt(i));
    this.readyAt = cardsReadyAt(this.choices.length);
    // Nothing but the fillers (the whole build maxed, which lasts unless a Phoenix Heart is
    // spent): each card offers ALWAYS, and no reroll or banish is spent on them.
    this.fillersOnly = this.g.fillersOnly();
    this.always = -1; // the card whose ALWAYS is ticked
    this.banishing = false; // BANISH pressed: the next card clicked, tapped or confirmed is banished
    this.gone = null; // a banished card on its way out: { info, rect, t }
    this.press = null; // a finger on a card (touch): { i, t, done }; held BANISH_HOLD s, it banishes
    this.t = 0;
    this.gs.app.ui.focusId = 'c0';
    this.lastCard = 'c0';
  }

  // Whether a card is this browser's first offer of a milestone's weapon or relic (firstFind): then
  // it is offered, kept in the run's seen list and among the marks written as the run ends.
  markFirst(c) {
    const seen = this.gs.seen, first = firstFind(c, seen);
    if (first) {
      seen.offered.add(offerKey(c));
      (this.gs.offeredNew ??= []).push(offerKey(c));
    }
    return first;
  }

  // Whether card i can't be taken yet: the screen's first moments (LEVELUP_DELAY, or a chain's or
  // a reroll's flips), or the card itself still flipping up (one drawn in place of one banished).
  heldCard(i) {
    return this.t < this.readyAt || this.t < this.flips[i] + FLIP.dur;
  }

  // Whether BANISH and REROLL wait: the screen's first moments, or a card still flipping.
  busy() {
    return this.t < this.readyAt || this.flips.some((f) => this.t < f + FLIP.dur);
  }

  // Where this screen stands in its chain: { at, of }, `of` the screens taken and the levels still
  // waiting, this one among them (Game.pendingLevels). A level the run's ALWAYS takes unseen never
  // comes to a screen (Game.resolveAutoLevels, before it opens and after each card), so it is not
  // counted; a chain ALWAYS cuts short simply closes.
  chain() {
    return { at: this.taken + 1, of: this.taken + Math.max(1, this.g.pendingLevels) };
  }

  // Whether a card can be banished: one left this run, a weapon or relic (no filler), and not on
  // a maxed build's screen of fillers (it has ALWAYS).
  canBanish(c) {
    return this.g.player.banishes > 0 && !this.fillersOnly && !!c && !isFiller(c);
  }

  // Takes card i; with its ALWAYS ticked (or Shift held), every level-up from now on takes it
  // unseen, and so do any levels still waiting.
  choose(i, always = this.always === i) {
    const g = this.g, c = this.choices[i];
    if (always && this.fillersOnly) g.autoPick = c.type;
    g.applyChoice(c);
    if (this.teach) {
      g.hints.mark('levelup');
      this.teach = false;
    }
    g.pendingLevels = Math.max(0, g.pendingLevels - 1); // never below none (draw: levels taken elsewhere)
    this.taken++;
    sfx('pick');
    g.state = 'play';
    if (g.hints) g.hints.levelClosed = true; // the first-run hint on weapons and gems comes next
    if (g.resolveAutoLevels()) return 'close';
    g.state = 'levelup';
    this.roll(); // the next level's cards, held until they are up (no lock on the keys: browsing goes on)
    return null;
  }

  // BANISH card i: out of the run for good (Game.banish), and its place drawn anew (Game.redrawCard),
  // flipping up once the old one has gone; with nothing left to draw, its place closes.
  banishCard(i) {
    const g = this.g, c = this.choices[i];
    if (this.busy() || !this.canBanish(c) || !g.banish(c)) {
      sfx('deny');
      return false;
    }
    g.player.banishes--;
    this.banishing = false;
    sfx('banish');
    this.gone = { info: choiceInfo(g, c), rect: this.rects?.[i], t: this.t };
    const next = g.redrawCard(this.choices.filter((x, j) => j !== i));
    if (next) {
      this.choices[i] = next;
      this.completes[i] = toldCompletes(g, next);
      this.backs[i] = backOf(next, this.completes[i]);
      this.first[i] = this.markFirst(next);
      this.flips[i] = this.t + BANISH_GO;
    } else {
      for (const a of [this.choices, this.completes, this.backs, this.flips, this.first]) a.splice(i, 1);
      this.fillersOnly = g.fillersOnly();
    }
    return true;
  }

  // The BANISH button: arms the screen (the next card taken is banished instead), or disarms it.
  toggleBanishing() {
    if (this.banishing) {
      this.banishing = false;
      sfx('back');
    } else if (this.choices.some((c) => this.canBanish(c))) {
      this.banishing = true;
      sfx('ui');
      this.gs.app.ui.focus(this.lastCard); // back on the cards, to choose one
    } else sfx('deny');
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
    // The level this screen is for; a milestone (10, 25, 50, 100) is told in gold, its stinger once.
    const lvl = g.player.level - g.pendingLevels + 1, mile = MILESTONES.includes(lvl);
    if (mile) g.milestoneDue(lvl);
    dim(ctx, W, H, 0.6);
    const L = mile ? logo(`LEVEL ${lvl}!`) : logo('LEVEL UP!', ['#ffffff', '#c0f8ff', '#2ce8f5', '#0099db', '#124e89']);
    // A shade behind the title, so the HUD's clock under it doesn't show through its letters.
    ctx.save();
    ctx.translate(W / 2, 18 + L.height / 2);
    ctx.scale(1, 0.32);
    const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, L.width * 0.62);
    shade.addColorStop(0, 'rgba(8,6,16,0.85)');
    shade.addColorStop(0.65, 'rgba(8,6,16,0.75)');
    shade.addColorStop(1, 'rgba(8,6,16,0)');
    ctx.fillStyle = shade;
    ctx.fillRect(-L.width, -L.width, L.width * 2, L.width * 2);
    ctx.restore();
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
    const pop = this.t < 0.25 ? 1.6 - 0.6 * ease.outBack(this.t / 0.25) : 1;
    const s = Math.min(1, (W - 40) / L.width) * pop;
    ctx.drawImage(L, Math.round(W / 2 - (L.width * s) / 2), Math.round(18 - (L.height * (s - 1)) / 2), Math.round(L.width * s), Math.round(L.height * s));
    // The level, and what the levels themselves have given the hero by now (Player levelBonus):
    // only the gains that aren't nought. Since the owner's "set change to 0" (21 October 2026)
    // there are none, and "+0% damage · +0% health" told of a gain there isn't: then "choose one".
    const lb = levelBonus(lvl), pct = (v) => Math.round((v - 1) * 100);
    const gains = [], short = [];
    if (pct(lb.might) > 0) gains.push(`+${pct(lb.might)}% damage`), short.push(`+${pct(lb.might)}% dmg`);
    if (pct(lb.hp) > 0) gains.push(`+${pct(lb.hp)}% health`), short.push(`+${pct(lb.hp)}% hp`);
    if (lb.armor) gains.push(`+${lb.armor} armor`), short.push(`+${lb.armor} arm`);
    let line = mile ? 'MILESTONE' : `LEVEL ${lvl}`;
    if (!gains.length) line += ' · choose one';
    else {
      const long = [line, ...gains].join(' · ');
      line = textWidth(long) <= W - 8 ? long : [line, ...short].join(' · ');
    }
    drawText(ctx, line, W / 2, 18 + L.height + 2, { align: 'center', color: mile ? '#feae34' : '#8b9bb4' });
    // Four cards: LUCKY!, stamped beside the title (where the screen is narrow, over its right end,
    // clear of the line under it).
    if (this.choices.length === 4 && !this.fillersOnly) {
      const c = textCanvas('LUCKY!', ['#ffffff', '#9ee562', '#63c74d'], '#181425');
      const k = this.t < 0.25 ? 2.2 - 1.2 * ease.outBack(this.t / 0.25) : 1, cw = c.width * 2 * k, ch = c.height * 2 * k;
      const right = W / 2 + (L.width * s) / 2 + 6, fits = right + c.width * 2 <= W - 2;
      const cx = fits ? right + cw / 2 : W - 4 - cw / 2, cy = fits ? 18 + L.height / 2 : 14;
      ctx.save();
      ctx.translate(Math.round(cx), Math.round(cy));
      ctx.rotate(-0.12);
      ctx.drawImage(c, Math.round(-cw / 2), Math.round(-ch / 2), Math.round(cw), Math.round(ch));
      ctx.restore();
    }
    // A chain of levels (chainStamp): "×3", then "2 of 3", stamped left of the title as LUCKY! is
    // right of it (where the screen is narrow, over its left end).
    const stamp = chainStamp(this.chain());
    if (stamp) {
      const c = textCanvas(stamp, mile ? ['#ffffff', '#fee761', '#feae34'] : ['#ffffff', '#c0f8ff', '#2ce8f5'], '#181425');
      const k = this.t < 0.25 ? 2.2 - 1.2 * ease.outBack(this.t / 0.25) : 1, cw = c.width * 2 * k, ch = c.height * 2 * k;
      const left = W / 2 - (L.width * s) / 2 - 6, fits = left - c.width * 2 >= 2;
      const cx = fits ? left - cw / 2 : 4 + cw / 2, cy = fits ? 18 + L.height / 2 : 14;
      ctx.save();
      ctx.translate(Math.round(cx), Math.round(cy));
      ctx.rotate(0.12);
      ctx.drawImage(c, Math.round(-cw / 2), Math.round(-ch / 2), Math.round(cw), Math.round(ch));
      ctx.restore();
    }

    ui.begin(dt);
    const n = this.choices.length;
    // Stacked on a narrow screen, as on a phone held upright; a full build's five fillers already under 360.
    const vertical = W < 300 || (n > 4 && W < 360);
    const always = this.fillersOnly; // each card has its ALWAYS toggle: under it, or beside it when stacked
    const touch = input.device === 'touch';
    let result = null, act = null; // act: a card to banish, once all are drawn
    const top = 18 + L.height + 16; // clear of the line above, the focus ring and all
    // Under the cards their foot: a line of help, and the row of BANISH and REROLL (a maxed
    // build's screen: the line on ALWAYS alone).
    const foot = always ? 14 : 36;
    let w, h;
    if (vertical) {
      w = W - 16 - (always ? 56 : 0);
      h = Math.min(72, Math.floor((H - top - foot) / n) - 4);
    } else {
      w = Math.min(118, Math.floor((W - 20 - (n - 1) * 6) / n));
      h = Math.min(156, H - top - foot - (always ? 15 : 0));
    }
    const at = (i) => (vertical ? [8, top + i * (h + 4)] : [Math.round(W / 2 - (n * w + (n - 1) * 6) / 2) + i * (w + 6), top]);
    // The foot stands right under the cards (a tall phone's), else at the bottom of the screen.
    const bottom = vertical ? top + n * (h + 4) - 4 : top + h + (always ? 15 : 0);
    const rowY = Math.min(H - 18, bottom + 18), tipY = always ? Math.min(H - 12, bottom + 6) : rowY - 11;
    // A finger lifted after a long press (it banished a card) takes nothing.
    if (this.press && !input.mouse.down) {
      if (this.press.done) input.mouse.clicked = false;
      this.press = null;
    }
    this.rects = [];
    const shown = this.choices;
    for (let i = 0; i < n; i++) {
      if (result || this.choices !== shown) break; // a card was taken: the next level's cards come next frame
      const c = this.choices[i], info = choiceInfo(g, c);
      const [x, y] = at(i);
      this.rects[i] = { x, y, w, h };
      const id = 'c' + i, held = this.heldCard(i);
      // Touch: a finger held on a card banishes it (BANISH_HOLD), its fill told on the card.
      const m = input.mouse, under = m.x >= x && m.x < x + w && m.y >= y && m.y < y + h;
      if (touch && m.down && under && !held && this.canBanish(c)) {
        // One banish a touch: a finger that has banished, slid onto another card, neither banishes
        // it nor takes it as it lifts.
        if (!this.press || (this.press.i !== i && !this.press.done)) this.press = { i, t: 0, done: false };
        if (this.press.i === i && !this.press.done && (this.press.t += dt) >= BANISH_HOLD) {
          this.press.done = true;
          act = i;
        }
      } else if (this.press && this.press.i === i && !this.press.done) this.press = null; // slid off, or not yet
      if (ui.item(id, x, y, w, h, { held }) && !result && act === null) {
        if (this.banishing) act = i;
        else result = this.choose(i);
      }
      if (result) break;
      if (always) {
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
      const f = ui.focused(id);
      if (f) this.lastCard = id;
      // The ready highlight: lifted, framed white in its colour, pulsing, a ring round it; armed
      // to banish, the ring and frame are red (a filler, which can't be, keeps its own).
      const lit = f && !held, red = lit && this.banishing && this.canBanish(c);
      const lift = lit ? -2 : 0;
      // A banished card's place stays empty while it goes.
      if (this.gone && this.t < this.flips[i]) continue;
      // Face down, then flipping up (half its width gone, back to the front).
      const fk = clamp((this.t - this.flips[i]) / FLIP.dur, 0, 1), face = fk >= 0.5;
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
      if (gold && !held) {
        // A card that completes an evolution glows gold round its edge.
        ctx.globalAlpha = 0.45 + 0.3 * Math.sin(this.t * 6);
        ctx.fillStyle = '#feae34';
        ctx.fillRect(x - 3, y + lift - 3, w + 6, h + 6);
        ctx.globalAlpha = 1;
      }
      if (lit) {
        // Just past the hold the ring flashes white, then pulses in the card's colour.
        const snap = this.t - Math.max(this.readyAt, this.flips[i] + FLIP.dur) < 0.12;
        ctx.fillStyle = red ? '#e43b44' : snap || Math.sin(this.t * 6) > 0 ? '#ffffff' : gold ? '#fee761' : info.color;
        ctx.fillRect(x - 3, y + lift - 3, w + 6, 2);
        ctx.fillRect(x - 3, y + lift + h + 1, w + 6, 2);
        ctx.fillRect(x - 3, y + lift - 1, 2, h + 2);
        ctx.fillRect(x + w + 1, y + lift - 1, 2, h + 2);
      }
      const trim = red ? ['#ffffff', '#e43b44']
        : held ? (f ? ['#c0cbdc', '#5a6988'] : [info.color, '#262b44'])
        : gold ? (lit ? ['#ffffff', '#fee761'] : ['#fee761', '#feae34'])
        : lit ? ['#ffffff', info.color] : [info.color, '#262b44'];
      panel(ctx, x, y + lift, w, h, { trim, rivets: lit || gold, fill: red ? '#2a1420' : gold ? '#2e2218' : undefined });
      if (lit) {
        ctx.globalAlpha = 0.12 + 0.06 * Math.sin(this.t * 6);
        ctx.fillStyle = red ? '#e43b44' : info.color;
        ctx.fillRect(x + 3, y + lift + 3, w - 6, h - 6);
        ctx.globalAlpha = 1;
      }
      const icon = SPR[info.icon].frames[0];
      const blink = Math.floor(this.t * 4) % 2;
      // FIRST FIND in green over NEW's gold (firstFind); its short form where the card is narrow. Its
      // white blink held steady green with FLASHES: SOFT (28 October 2026), as the combo's word is.
      const first = this.first?.[i], full = first ? 'FIRST FIND' : info.tag, short = first ? 'FIRST!' : info.isNew ? 'NEW!' : info.tag;
      const tagColor = first ? (blink && this.g.settings.softFlash !== true ? '#ffffff' : '#9ee562') : info.isNew ? (blink ? '#fee761' : '#feae34') : '#8b9bb4';
      if (vertical) {
        // The icon at the left over its pips; name and tag on top, the text under them.
        ctx.drawImage(smoothScaled(icon, 1), x + 6, y + lift + 5);
        drawPips(ctx, x + 22, y + lift + 41, c.level, info.max, this.t);
        drawText(ctx, info.name, x + 44, y + lift + 6, { color: info.color });
        const tag = textWidth(info.name) + textWidth(full) + 58 <= w ? full : short;
        if (tag) drawText(ctx, tag, x + w - 6, y + lift + 6, { align: 'right', color: tagColor });
        const lines = wrapText(info.desc, w - 52), room = Math.min(gold || info.hint ? 3 : 4, Math.floor((h - 26) / 9));
        // Its change in numbers (cardChange), in green, on the lines the text leaves free.
        const change = info.change ? wrapText(info.change, w - 52) : [];
        const told = lines.slice(0, room), more = change.slice(0, room - told.length);
        told.forEach((ln, j) => drawRich(ctx, ln, x + 44, y + lift + 17 + j * 9, { color: '#c0cbdc' }));
        more.forEach((ln, j) => drawRich(ctx, ln, x + 44, y + lift + 17 + (told.length + j) * 9, { color: '#9ee562' }));
        // Its synergy with the hero's perk (cardSynergy), in his colour, on a line still free.
        if (info.synergy && told.length + more.length < room) drawText(ctx, fitText(info.synergy.text, w - 52), x + 44, y + lift + 17 + (told.length + more.length) * 9, { color: info.synergy.color });
        if (gold) drawText(ctx, completesLine(this.completes[i]), x + w - 6, y + lift + h - 14, { align: 'right', color: blink ? '#fee761' : '#feae34' });
        else if (info.hint && h >= 64) {
          // Its evolution (evoHint): the relic and its state, or a relic yet unknown and a ?.
          const hx = x + w - 6 - 16, hy = y + lift + h - 20, eh = info.hint;
          const word = eh.short && textWidth(`${eh.name} · ${eh.word}`) > w - 50 ? 'locked' : eh.word;
          drawText(ctx, fitText(eh.unknown ? eh.name : `${eh.name} · ${word}`, w - 50), hx - 3, hy + 4, { align: 'right', color: eh.color });
          if (eh.icon) ctx.drawImage(SPR[eh.icon].frames[0].c, hx, hy);
          else drawText(ctx, '?', hx + 6, hy + 4, { color: '#8b9bb4' });
        }
      } else {
        const big = smoothScaled(icon, 1);
        ctx.drawImage(big, Math.round(x + w / 2 - big.width / 2), y + lift + 8);
        let ty = y + lift + 44;
        for (const ln of wrapText(info.name, w - 10)) {
          drawText(ctx, ln, x + w / 2, ty, { align: 'center', color: info.color });
          ty += 9;
        }
        if (full) {
          const tag = textWidth(full) <= w - 8 ? full : short;
          drawText(ctx, tag, x + w / 2, ty + 1, { align: 'center', color: tagColor });
          ty += 11;
        }
        if (info.max > 1) {
          drawPips(ctx, x + w / 2, ty + 1, c.level, info.max, this.t);
          ty += 6;
        }
        ty += 3;
        for (const ln of wrapText(info.desc, w - 12)) {
          drawRich(ctx, ln, x + w / 2, ty, { align: 'center', color: '#c0cbdc' });
          ty += 9;
        }
        // Its change in numbers (cardChange), in green, clear of the evolution's lines at the foot.
        const low = (gold || info.hint) && h > 120 ? 28 : 6;
        if (info.change) for (const ln of wrapText(info.change, w - 12)) {
          if (ty + 9 > y + lift + h - low) break;
          drawRich(ctx, ln, x + w / 2, ty + 2, { align: 'center', color: '#9ee562' });
          ty += 9;
        }
        // Its synergy with the hero's perk (cardSynergy), in his colour, above the evolution's foot.
        if (info.synergy && ty + 9 <= y + lift + h - low) drawText(ctx, fitText(info.synergy.text, w - 12), x + w / 2, ty + 3, { align: 'center', color: info.synergy.color });
        if (gold && h > 120) {
          // It completes an evolution: said in gold where the hint was.
          const lines = wrapText(completesLine(this.completes[i]), w - 10);
          lines.forEach((ln, j) => drawText(ctx, ln, x + w / 2, y + lift + h - 17 - (lines.length - 1 - j) * 9, { align: 'center', color: blink ? '#fee761' : '#feae34' }));
        } else if (info.hint && h > 120) {
          // Its evolution (evoHint), on two lines: the relic (or "Evolves with a relic") and its state.
          const hy = y + lift + h - 25, eh = info.hint;
          const line2 = eh.short && textWidth(eh.line2) > w - 12 ? eh.short : eh.line2;
          drawText(ctx, fitText(eh.unknown ? eh.line1 : eh.name, w - 12), x + w / 2, hy - 2, { align: 'center', color: '#c0cbdc' });
          drawText(ctx, fitText(line2, w - 12), x + w / 2, hy + 8, { align: 'center', color: eh.color });
        }
      }
      if (!touch) drawText(ctx, String(i + 1), x + 7, y + lift + 6, { color: lit ? '#8b9bb4' : '#5a6988', outline: null });
      if (held) {
        // Not yet: the card drained of its colours and darkened; the focused one is framed in grey
        // (above) over a bar that fills to the moment it can be taken.
        ctx.globalCompositeOperation = 'saturation';
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#808080';
        ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#0d0b14';
        ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        ctx.globalAlpha = 1;
        if (f) {
          // Its ring in grey, still: the "not yet" of the ready one's.
          ctx.fillStyle = '#8b9bb4';
          ctx.fillRect(x - 3, y - 3, w + 6, 2);
          ctx.fillRect(x - 3, y + h + 1, w + 6, 2);
          ctx.fillRect(x - 3, y - 1, 2, h + 2);
          ctx.fillRect(x + w + 1, y - 1, 2, h + 2);
          const from = this.gone ? this.gone.t : 0, to = Math.max(this.readyAt, this.flips[i] + FLIP.dur);
          const k = clamp((this.t - from) / Math.max(0.01, to - from), 0, 1), bw = w - 10;
          ctx.fillStyle = '#0d0b14';
          ctx.fillRect(x + 4, y + h - 8, bw + 2, 5);
          ctx.fillStyle = '#3a4466';
          ctx.fillRect(x + 5, y + h - 7, bw, 3);
          ctx.fillStyle = '#c0cbdc';
          ctx.fillRect(x + 5, y + h - 7, Math.round(bw * k), 3);
        }
      } else if ((!lit && !touch) || (this.banishing && !this.canBanish(c))) {
        // The cards not in focus a shade darker, so the one that is stands out (armed to banish,
        // a filler too: it can't be).
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#0d0b14';
        ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        ctx.globalAlpha = 1;
      }
      if (this.press && this.press.i === i && !this.press.done && this.press.t > 0.12) {
        // A finger held to banish it: the card reddens as a bar fills.
        const k = clamp((this.press.t - 0.12) / (BANISH_HOLD - 0.12), 0, 1);
        ctx.globalAlpha = 0.35 * k;
        ctx.fillStyle = '#e43b44';
        ctx.fillRect(x, y + lift, w, h);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#0d0b14';
        ctx.fillRect(x + 4, y + lift + h - 8, w - 8, 5);
        ctx.fillStyle = '#e43b44';
        ctx.fillRect(x + 5, y + lift + h - 7, Math.round((w - 10) * k), 3);
        drawText(ctx, 'BANISH', x + w / 2, y + lift + h - 18, { align: 'center', color: '#ffffff' });
      }
      ctx.restore();
    }
    // A banished card going: it drops and fades, crossed out, before its place flips up anew.
    if (this.gone) this.drawGone(ctx);
    const p = g.player;
    // A line of the foot fits between the HUD's orbs in the bottom corners (a phone's are far below).
    const room = vertical ? W - 8 : W - 120;
    const fit = (lines) => lines.find((s) => textWidth(s) <= room) || lines[lines.length - 1];
    if (always) {
      // What ALWAYS does, and where it is undone. (No reroll: fillers are all there is.)
      const keys = input.device === 'kb' ? ` · Shift+1-${n}` : '';
      const hint = fit([`ALWAYS takes that card at every level-up from now on${keys} · undo it in the pause menu`, `ALWAYS: every level-up from now on${keys} · undo in pause`, 'ALWAYS: every level-up · undo in pause']);
      drawText(ctx, hint, W / 2, tipY, { align: 'center', color: this.always >= 0 ? '#fee761' : '#8b9bb4' });
    } else if (!result) {
      // BANISH (B, or a pad's left-stick press to arm it) and REROLL (R, a pad's Y), side by side;
      // held while the cards are, greyed with none left. A run that began with none of one (none
      // bought in the Armory's Exile or Insight: shared/progress.js) has no button for it at all,
      // and the other stands alone in the middle; with neither, the line of help alone.
      const busy = this.busy(), pad = input.device === 'pad', kb = input.device === 'kb';
      const hasB = p.banishes > 0 || this.banishing || (p.meta?.banish || 0) > 0, hasR = p.rerolls > 0 || (p.meta?.reroll || 0) > 0;
      const bw = Math.min(96, Math.floor((W - 22) / 2)), bx = Math.round(W / 2 - (hasB && hasR ? bw + 3 : bw / 2));
      const canB = this.choices.some((c) => this.canBanish(c));
      const bl = this.banishing ? 'CANCEL' : `BANISH ×${p.banishes}`;
      if (hasB && footButton(ctx, ui, 'banish', bx, rowY, bw, bl, { color: '#e43b44', held: busy, disabled: !canB && !this.banishing, key: kb ? 'B' : pad ? padKey('LS') : null })) this.toggleBanishing();
      const rerolled = hasR && footButton(ctx, ui, 'reroll', hasB ? bx + bw + 6 : bx, rowY, bw, `REROLL ×${p.rerolls}`, { color: '#2ce8f5', held: busy, disabled: p.rerolls <= 0, key: kb ? 'R' : pad ? padKey('Y') : null });
      if ((rerolled || input.pressed('reroll')) && !busy && p.rerolls > 0) {
        p.rerolls--;
        sfx('teleport');
        this.roll();
      }
      // The line of help over them: what the focused button does, the armed BANISH, else the keys;
      // the first level-up screen's teaching line keeps them too (27 October 2026: it took their
      // place on the one screen a new player needs them most).
      const take = touch ? ['Tap a card to take it', 'Tap: take'] : pad ? [`${padKey('A')} takes the card in focus`, `${padKey('A')}: take`] : [`Enter or 1-${n} takes a card`, `Enter/1-${n}: take`];
      let tip, color = '#5a6988';
      if (this.banishing) {
        tip = fit(['Choose a card to banish: it is gone for the rest of the run', 'Choose a card to banish', 'Banish which?']);
        color = '#e43b44';
      } else if (ui.focusId === 'banish') tip = fit(['BANISH: the card in focus is gone for the rest of the run', 'BANISH: gone for the run']);
      else if (ui.focusId === 'reroll') tip = fit(['REROLL: all new cards', 'REROLL']);
      else if (this.teach) {
        tip = fit([
          `Your first level: a new weapon or relic, or a rank of one you hold · ${take[1]}`,
          `A new weapon or relic, or a rank of one held · ${take[1]}`,
          `Take a card · ${take[1]}`,
          take[1],
        ]);
        color = '#8fb8ff';
      } else if (touch) tip = fit(canB ? ['Tap a card to take it · hold a card to banish it', 'Tap: take · hold: banish'] : take);
      else tip = fit(take);
      drawText(ctx, tip, W / 2, hasB || hasR ? tipY : rowY + 2, { align: 'center', color });
    }
    ui.end();
    if (this.banishing && input.pressed('back')) this.toggleBanishing();
    if (!result && act === null && !this.fillersOnly && !this.busy()) {
      // B: the card in focus, at once; with a button in focus, arms the screen as BANISH does. A
      // pad's left-stick press only arms it, or disarms it, as the button does: the next A on a
      // card banishes that card.
      const i = this.choices.findIndex((c, j) => ui.focusId === 'c' + j);
      if (input.pressed('banishArm')) this.toggleBanishing();
      else if (input.pressed('banish')) {
        if (i >= 0) act = i;
        else this.toggleBanishing();
      }
    }
    if (!input.down('always')) this.heldAlways = false;
    const keys = ['one', 'two', 'three', 'four', 'five'], shift = input.down('always') && !this.heldAlways;
    for (let i = 0; i < n && !result && act === null && this.choices === shown; i++) {
      if (!input.pressed(keys[i]) || i >= this.choices.length) continue;
      if (this.heldCard(i)) {
        // Held: the number moves the focus there, and takes nothing, now or later.
        if (ui.focusId !== 'c' + i) sfx('ui');
        ui.focusId = 'c' + i;
      } else if (this.banishing) act = i;
      else result = this.choose(i, this.always === i || shift);
    }
    if (act !== null && !result) this.banishCard(act);
    return result;
  }

  // The banished card going (BANISH_GO s): dropping, tilting and fading under a red cross.
  drawGone(ctx) {
    const { info, rect, t } = this.gone, k = clamp((this.t - t) / BANISH_GO, 0, 1);
    if (k >= 1 || !rect) return;
    const { w, h } = rect;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.translate(Math.round(rect.x + w / 2), Math.round(rect.y + h / 2 + k * k * 40));
    ctx.rotate(k * 0.25);
    panel(ctx, -w / 2, -h / 2, w, h, { trim: ['#e43b44', '#5c0f1c'], rivets: false });
    ctx.drawImage(SPR[info.icon].frames[0].c, -8, Math.min(-h / 2 + 10, -16));
    ctx.strokeStyle = '#e43b44';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 6, -h / 2 + 6);
    ctx.lineTo(w / 2 - 6, h / 2 - 6);
    ctx.moveTo(w / 2 - 6, -h / 2 + 6);
    ctx.lineTo(-w / 2 + 6, h / 2 - 6);
    ctx.stroke();
    ctx.restore();
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
    // The gold its screen counts: the chest's own and, with it, a full build's Purses of Gold (the
    // 27 October 2026 review, C13), all of it carried to the HUD's counter by its coins (drawFlyers).
    this.goldTotal = this.roll.gold + this.roll.items.reduce((sum, it) => sum + (it.type === 'gold' ? it.value : 0), 0);
    this.items = revealOrder(this.roll.items); // least first, an evolution last
    this.slots = chestSlots(this.items); // the places they take on the screen: fillers alike share one
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
    this.flyers = []; // coins on their way to the HUD's gold counter, each with its share of the gold
    this.coinsIn = 0; // of them, landed
    this.lit = []; // the build's slots the things shown have raised, each { row, i, at } (drawSlots' lit)
    this.lockTime = 0.6;
    this.noSpace = true; // as with level-ups and gear: Space mashed for the ultimate mustn't skip the reveal, nor collect
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
    const lay = chestLayout(W, H, this.slots.length, T.scale), cx = W / 2, cy = lay.cy;
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
    // An evolution's ceremony (drawCeremony), and EVOLUTION! over the screen's top once it is over.
    const ceremony = this.evo && t >= this.evoAt && t < this.evoAt + CEREMONY.dur;
    const evoLogo = this.evo && t >= this.evoAt + CEREMONY.dur ? evolutionLogo(W) : null;
    // The build's slots and the gold counter again, over the dim (28 October 2026): under it the
    // HUD shows them at a third of their light, so what the chest gives now lands on them in full
    // light, each slot it raises lit for a moment (SLOT_LIT), its gold coming in coin by coin
    // (drawFlyers). Not while an evolution's ceremony plays: its slot holds the new weapon from the
    // first crack, which the ceremony is there to show, so they wait under its dim with the rest.
    // Nor under EVOLUTION!, which on a narrow screen (a phone held upright) reaches over the
    // slots: from the first it covers on, they are left to the HUD under the dim.
    if (!ceremony) {
      const lit = [];
      for (const l of this.lit) {
        const u = (t - l.at) / SLOT_LIT;
        if (u >= 0 && u < 1) lit.push({ row: l.row, i: l.i, k: 1 - u });
      }
      g.hud.drawSlots(ctx, g.player, lit, evoLogo ? slotsLeftOf(evoLogo.x) : undefined);
      g.hud.drawGold(ctx, W);
    }
    // Shut, it shakes in sets (a champion's one, a lord's two, a boss's three), each stronger and a
    // step higher, light leaking from the crack: a beam for each thing inside, one orange for an
    // evolution (chestTease: always true).
    const fr = chestFrame(this.kind, opened), s = CHEST_SCALE * T.scale;
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
    const iy = lay.iy;
    while (this.revealed < items.length && t >= tl.at[this.revealed]) {
      const it = items[this.revealed++];
      const raised = g.hud.held ? revealOn(g.hud.held, it, g) : null;
      // The slot it raised lights up; an evolution's once its ceremony is over.
      if (raised) this.lit.push({ ...raised, at: it.type === 'evolve' ? Math.max(t, this.evoAt + CEREMONY.dur) : t });
      // An evolution's sound and flash are its ceremony's.
      if (it.type !== 'evolve') sfx('reveal', { pitch: SCALE[Math.min(SCALE.length - 1, this.revealed - 1)] });
    }
    if (ceremony) this.drawCeremony(ctx, W, H, t - this.evoAt);
    else if (opened) {
      // At twice the size where they fit (chestLayout), today's where they don't (phones). Each
      // place (chestSlots) shows its last thing shown; fillers alike share one, whose count climbs.
      const k = lay.k, slots = this.slots;
      const slot = Math.min(84 * k, Math.floor((W - 16) / Math.max(1, slots.length)));
      const rowW = slot * slots.length;
      slots.forEach((ix, si) => {
        const n = ix.filter((j) => j < this.revealed).length; // shown so far (they are shown in order)
        if (!n) return;
        const last = ix[n - 1], it = items[last];
        const x = Math.round(W / 2 - rowW / 2 + (si + 0.5) * slot);
        const info = chestItemInfo(g, it);
        // Purses together: their gold added up (counted with the chest's own, goldTotal).
        if (it.type === 'gold' && n > 1) info.sub = `+${ix.slice(0, n).reduce((sum, j) => sum + items[j].value, 0)}`;
        const { icon, name, sub, color } = info;
        const pop = t - tl.at[last] < 0.12 ? 1.3 : 1; // and again at each one shown in a shared place
        const big = smoothScaled(SPR[icon].frames[0], 1), bw = big.width * k * pop, bh = big.height * k * pop;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(big, Math.round(x - bw / 2), Math.round(iy - (bh - big.height * k) / 2), Math.round(bw), Math.round(bh));
        const lines = wrapText(name, Math.floor((slot - 6) / k));
        lines.forEach((ln, j) => drawScaled(ctx, ln, x, iy + 34 * k + j * 9 * k, k, color));
        drawScaled(ctx, sub, x, iy + 34 * k + lines.length * 9 * k, k, it.type === 'evolve' || it.isNew ? '#fee761' : '#8b9bb4');
        // A shared place: how many of them so far, on the icon's lower right.
        if (ix.length > 1) {
          const c = textCanvas(`×${n}`, ['#ffffff', '#fee761', '#feae34'], '#181425'), s2 = k * pop;
          ctx.drawImage(c, Math.round(x + (big.width * k) / 2 - c.width * s2 * 0.75), Math.round(iy + big.height * k - c.height * s2 * 0.75), Math.round(c.width * s2), Math.round(c.height * s2));
        }
      });
      if (evoLogo) ctx.drawImage(evoLogo.L, evoLogo.x, evoLogo.y, evoLogo.w, evoLogo.h);
    }
    // The gold last (its own and its purses', goldTotal): counted up, coins ticking up the scale, a
    // thunk as it lands, and a stream of coins carries it to the HUD's gold counter, which takes
    // each one's share as it lands (drawFlyers); the last one in, the HUD shows the build and the
    // gold as they are.
    const gold = this.goldTotal;
    if (t >= tl.gold && !ceremony) {
      const kg = clamp((t - tl.gold) / CHEST_TIME.gold, 0, 1), before = this.goldCount;
      this.goldCount = Math.round(gold * ease.outCubic(kg));
      const step = Math.max(1, gold / 8);
      if (!this.goldShown && Math.floor(this.goldCount / step) > Math.floor(before / step)) sfx('coin', { pitch: 1 + 0.5 * kg });
      if (kg >= 1 && !this.goldShown) {
        this.goldShown = true;
        sfx('thunk');
        // The gold the counter still owes (all of it: the chest's own and its purses'), in ten
        // shares as even as whole coins make them. How much gold is unchanged: it is Game.gold's.
        const owed = g.hud.held ? Math.max(0, g.gold - g.hud.held.gold) : 0, n = 10;
        for (let i = 0; i < n; i++) this.flyers.push({ x: cx + rand(-12, 12), y: lay.goldY + 2, t: -i * 0.04, gold: Math.round((owed * (i + 1)) / n) - Math.round((owed * i) / n) });
      }
      const c = textCanvas(`+${this.goldCount} GOLD`, ['#fff3a8', '#fee761', '#feae34'], '#181425');
      ctx.drawImage(c, Math.round(W / 2 - c.width), lay.goldY, c.width * 2, c.height * 2);
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
    } else if (t > this.lockTime && (input.pressed('select') || input.pressed('back') || input.mouse.clicked)) {
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
    // One flash as it breaks (≤0.6, FLASHES: SOFT's FLASH_SOFT), fading.
    if (v < C.flash) {
      ctx.globalAlpha = (this.g.settings.softFlash ? FLASH_SOFT : 0.6) * (1 - v / C.flash);
      ctx.fillStyle = '#fff8e8';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  // Coins flying from the chest to the HUD's gold counter (top right), arcing up. Each one landing
  // puts its share on the counter with a tick a step higher than the last ('coinland': the coin's
  // chime under a limit of its own, for the coin's own dropped any landing two frames after the
  // last, and the climb skipped steps). The last one in, the HUD shows the build as it is, EVOLVE
  // READY taken anew with it (the run, and Game.update with it, stand still under the chest).
  drawFlyers(ctx, W, dt) {
    const tx = W - 12, ty = 32;
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const f = this.flyers[i];
      f.t += dt;
      if (f.t < 0) continue;
      const k = f.t / 0.5;
      if (k >= 1) {
        this.flyers.splice(i, 1);
        const held = this.g.hud.held;
        if (held) held.gold += f.gold;
        this.coinsIn++;
        sfx('coinland', { pitch: 1.5 + 0.05 * this.coinsIn }); // on up from where the count ended
        if (!this.flyers.length) {
          this.g.hud.held = null; // the last one in: the build and gold as they are
          this.g.evoReady = this.g.evolvable();
        }
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
// The chest's things at twice today's size when each gets CHEST_ITEMS.big of the width, else today's.
export const CHEST_ITEMS = { big: 116 };
export const chestItemScale = (W, n) => ((W - 16) / Math.max(1, n) >= CHEST_ITEMS.big ? 2 : 1);
// The chest is drawn CHEST_SCALE times its tier's scale. Under it its things stand in a row,
// CHEST_ROW px a scale (the icon and up to three lines); under them the gold line and COLLECT take
// CHEST_FOOT px to the screen's foot; the chest's lid stays below CHEST_TOP (clear of EVOLUTION!).
const CHEST_SCALE = 3, CHEST_ROW = 34 + 3 * 9, CHEST_FOOT = 4 + 22 + 4 + 22, CHEST_TOP = 44;

// Where a chest's n things go on a W x H screen, the chest drawn at its tier's scale: at twice
// today's size where the width allows (chestItemScale) and the row, its gold line and COLLECT fit
// under the chest (standing higher on a short screen, its lid below CHEST_TOP), else at today's.
// The things' scale k, the chest's middle cy, the row's top iy and the gold line's goldY.
export function chestLayout(W, H, n, scale) {
  const half = (SPR.chest.frames[0].h * CHEST_SCALE * scale) / 2, below = 18 + 15 * scale;
  for (let k = chestItemScale(W, n); ; k--) {
    const cy = Math.min(H * 0.36, H - CHEST_FOOT - CHEST_ROW * k - below), iy = Math.round(cy + below);
    if (k === 1 || cy - half >= CHEST_TOP) return { k, cy, iy, goldY: iy + CHEST_ROW * k + 4 };
  }
}

// EVOLUTION! over a chest's screen once its ceremony is over: centred at the HUD's height, at
// most half the screen wide (above CHEST_TOP), drawn at x, y, w by h.
function evolutionLogo(W) {
  const L = logo('EVOLUTION!', ['#ffffff', '#fee761', '#feae34', '#f77622', '#be4a2f']);
  const kk = Math.min(1, W / 2 / L.width);
  return { L, x: Math.round(W / 2 - (L.width * kk) / 2), y: 10, w: Math.round(L.width * kk), h: Math.round(L.height * kk) };
}

// A line of text at a whole-number scale, centred on x (crisp: a text canvas drawn k times its size).
function drawScaled(ctx, s, x, y, k, color) {
  if (k === 1) return drawText(ctx, s, x, y, { align: 'center', color });
  const c = textCanvas(s, color, '#181425');
  ctx.drawImage(c, Math.round(x - (c.width * k) / 2), Math.round(y), c.width * k, c.height * k);
}

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
  return { icon, name, color, sub: FILLERS[it.type]?.count ? `x${it.level}` : it.type === 'gold' ? `+${it.value}` : `+${Math.round(it.value * 100)}%` };
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
      ui.begin(dt); // the lock (lockTime, from the moment it opens) runs down while the rarity climbs
      return null;
    }
    const gap = 6, cw = Math.min(180, Math.floor((W - 16 - gap) / 2));
    const x0 = Math.round(W / 2 - cw - gap / 2), x1 = x0 + cw + gap;
    const ph = Math.min(240, H - top - 6);
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
    const p = g.player, auto = FILLERS[g.autoPick]?.short;
    // As tall as the build it shows (its longer column), the buttons and, if any, the ALWAYS line.
    const listed = Math.max(1, p.weapons.length, p.passives.size);
    const pw = Math.min(W - 16, 320), ph = Math.min(H - 20, 26 + 12 + listed * 15 + 8 + 58 + (auto ? 18 : 0));
    const x = Math.round(W / 2 - pw / 2), y = Math.round(H / 2 - ph / 2) + 4;
    panel(ctx, x, y, pw, ph, { title: 'PAUSED' });
    // The run so far along the top (the clock as the HUD showed it: in a timed run, the time left),
    // or, once QUIT RUN is pressed, what quitting means.
    const stats = `${clockCountsDown(g) ? 'TIME LEFT' : 'TIME'} ${fmtTime(clockTime(g))} · LV ${p.level} · KILLS ${fmtNum(g.kills)} · GOLD ${fmtNum(g.gold)}`;
    const note = this.confirm ? 'Quitting ends the run. The gold you found is kept.' : stats;
    drawText(ctx, note, W / 2, y + 11, { align: 'center', color: this.confirm ? '#c0cbdc' : '#feae34' });
    // The build in two columns, a rule between: weapons and their levels, relics and their ranks.
    // The owner's (27 October 2026): after each weapon not yet evolved, its partner relic
    // (Game.evoState): its icon full if owned, dimmed if it may still come, dimmed under a red ×
    // if blocked this run; a ? while its evolution isn't known yet; and "LV n/8".
    const mid = x + Math.round(pw / 2), top = y + 26;
    const column = (cx, right, title, rows) => {
      drawText(ctx, title, cx, top, { color: '#8b9bb4' });
      let ry = top + 12;
      if (!rows.length) drawText(ctx, 'None yet', cx, ry + 1, { color: '#5a6988' });
      for (const [icon, name, tag, color, mark] of rows) {
        const mx = right - textWidth(tag) - 20;
        ctx.drawImage(SPR[icon].frames[0].c, cx, ry - 3);
        drawText(ctx, fitText(name, (mark ? mx - 4 : right - textWidth(tag) - 4) - (cx + 18)), cx + 18, ry + 1, { color });
        drawText(ctx, tag, right, ry + 1, { align: 'right', color: '#8b9bb4' });
        if (mark?.state === 'unknown') drawText(ctx, '?', mx + 6, ry + 1, { color: '#8b9bb4' });
        else if (mark) {
          ctx.globalAlpha = mark.state === 'owned' ? 1 : 0.35;
          ctx.drawImage(SPR[PASSIVES[mark.relic].icon].frames[0].c, mx, ry - 3);
          ctx.globalAlpha = 1;
          if (mark.state === 'locked' || mark.state === 'banished' || mark.state === 'full') drawText(ctx, '×', mx + 6, ry + 1, { color: '#e43b44' });
        }
        ry += 15;
      }
      return ry;
    };
    const wy = column(x + 10, mid - 8, 'WEAPONS', p.weapons.map((w) => [w.def.icon, w.def.name, w.evolved ? 'MAX' : `LV ${w.level}/${MAX_WEAPON_LEVEL}`, w.evolved ? '#f77622' : '#c0cbdc', w.evolved ? null : g.evoState(w.id)]));
    const ry = column(mid + 8, x + pw - 10, 'RELICS', [...p.passives].map(([id, r]) => [PASSIVES[id].icon, PASSIVES[id].name, `${r}`, '#c0cbdc']));
    ctx.fillStyle = '#3a4466';
    ctx.fillRect(mid, top, 1, Math.max(wy, ry) - top - 4);
    ui.begin(dt);
    // RESUME, OPTIONS and QUIT RUN one under another at the foot (the owner's, 23 October 2026:
    // menus that "respect left, right, up, down"), the way out last.
    const bw = 110, bx = Math.round(W / 2 - bw / 2), row = (k) => y + ph - 20 - (2 - k) * 18;
    // The filler every level-up takes since the player ticked ALWAYS on it, and the way back to
    // being asked (Game.autoPick).
    if (auto) {
      const label = `Level-ups: always ${auto}`, aw = 64, lw = textWidth(label);
      const lx = Math.round(W / 2 - (lw + 6 + aw) / 2), ay = row(0) - 18;
      drawText(ctx, label, lx, ay + 3, { color: '#fee761' });
      if (button(ctx, ui, 'ask', lx + lw + 6, ay, aw, 12, 'ASK AGAIN', { color: '#2ce8f5', pointer: false })) {
        g.autoPick = null;
        ui.focusId = 'resume';
      }
    }
    // Start, Esc or P, or a pad's B (back), as every other screen goes back.
    if (button(ctx, ui, 'resume', bx, row(0), bw, 13, 'RESUME') || ((input.pressed('pause') || input.pressed('back')) && ui.lockT <= 0)) {
      g.state = 'play';
      return 'close';
    }
    if (button(ctx, ui, 'opts', bx, row(1), bw, 13, 'OPTIONS')) {
      this.options = new OptionsScreen();
      this.options.enter(app, { back: null });
    }
    // One way out of a run: it ends, with its results and gold. (A run is never saved to pick
    // up again.)
    if (button(ctx, ui, 'quit', bx, row(2), bw, 13, this.confirm ? 'SURE? QUIT RUN' : 'QUIT RUN', { color: '#e43b44' })) {
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
// seconds apart from `rows` on, a soft tick each, a record broken stamped NEW BEST, each a step
// higher; the gold found counts up with coins climbing in pitch, then each step of the formula is
// stamped in `beat` apart (goldSteps), all within goldMin to goldMax seconds (the more, the longer),
// landing with a thunk. The UNLOCKED chips then come in one every `row`, a page of them held
// `page` seconds where there are more than fit (chipView). Any key, click or tap shows it all at
// once; only then does RETURN TO CAMP take a press.
export const TALLY = { rows: 0.6, row: 0.16, weapon: 0.08, gap: 0.3, goldMin: 1.5, goldMax: 2.5, beat: 0.35, countMin: 0.6, page: 2.4 };
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// What gold buys at the Armory now: how many ranks are affordable (affordableRanks: for sale, not at
// their top), or how far the cheapest one for sale is.
export function armoryLine(p) {
  const n = affordableRanks(p);
  if (n) return `${n} Armory rank${n > 1 ? 's' : ''} affordable`;
  let near = null;
  for (const u of UPGRADES) {
    const rank = p.up[u.id] || 0;
    if (rank >= u.max || !upgradeOpen(p, u)) continue;
    const cost = upgradeCost(u.id, rank);
    if (cost > p.gold && (!near || cost - p.gold < near.need)) near = { need: cost - p.gold, name: `${u.name} ${ROMAN[rank] || rank + 1}` };
  }
  return near ? `+${fmtNum(near.need)} gold to ${near.name}` : 'The Armory is complete';
}

// The review's C4 (28 October 2026): when the next goal is a time with the hero just played (the
// next hero's five minutes), the NEXT line is that distance, as a bar: '04:31 of 05:00 with the
// Knight · 29 s from the Ranger'. This run's time, the real distance only; a run that made it has
// its unlock told above and the goal has moved on. Null for any other goal. Its text the longest of
// three forms that fits w (28 October 2026: "with the Berserker" cut "from the Witch Hunter" to
// "Witch Hu…" on the widest panel): the hero played goes first, the bar telling it, then the times;
// the hero the goal opens stays.
//   { k: this run's share of the goal, need: its seconds, text }
export function heroGoalBar(goal, res, w = Infinity) {
  if (goal?.type !== 'survive' || goal.hero !== res.hero) return null;
  const need = goal.minutes * 60, left = need - res.time;
  if (left <= 0) return null;
  const gap = `${left < 60 ? `${left} s` : fmtTime(left)} from the ${HEROES[goal.unlocks].title}`, times = `${fmtTime(res.time)} of ${fmtTime(need)}`;
  const forms = [`${times} with the ${HEROES[res.hero].title} · ${gap}`, `${times} · ${gap}`, gap];
  return { k: clamp(res.time / need, 0, 1), need, text: forms.find((f) => textWidth(f) <= w) || forms[2] };
}

// The results' gold as a short cascade (the review's C11, 28 October 2026): the gold found counts
// up, then a beat apart each step is stamped in, the total stepping up to it: the difficulty's rate
// (a Nightmare's in it) where it is above 1, the wage for the time on the clock, a win's bonus. A rate
// of 1 or under (Normal's 0.75) is no stamp, never told as a step down: the count is of the gold at
// that rate already, the formula saying "× 0.75" beside it from the start. All in about the span the
// single count took (goldFor). What is paid is runReward's, as ever.
//   { count: its seconds, countTo, stamps: [{ key: 'mult' | 'wage' | 'bonus', to, at }], end }
export function goldSteps(r, span) {
  const up = r.multiplier > 1 && r.gold > 0, wage = r.wage || 0, bonus = r.bonus || 0, stamps = [];
  if (up) stamps.push({ key: 'mult', to: r.collected });
  if (wage) stamps.push({ key: 'wage', to: r.collected + wage });
  if (bonus) stamps.push({ key: 'bonus', to: r.collected + wage + bonus });
  const countTo = up ? r.gold : r.collected;
  const count = countTo > 0 ? Math.max(TALLY.countMin, span - stamps.length * TALLY.beat) : 0;
  stamps.forEach((st, i) => (st.at = count + (i + 1) * TALLY.beat));
  return { count, countTo, stamps, end: stamps.length ? stamps[stamps.length - 1].at : count };
}
// The formula's parts, in the longest of its three forms whose whole line fits w: the gold found
// (with its rate, where that is no stamp of its own), then one part for each stamp.
export function goldParts(r, gold, time, plan, w) {
  const m = r.multiplier, own = plan.stamps.some((st) => st.key === 'mult');
  const forms = [0, 1, 2].map((form) => {
    const part = { mult: ` × ${m}`, wage: ` + ${r.wage} ${form === 0 ? `wage for ${fmtTime(time)}` : 'wage'}`, bonus: ` + ${r.bonus} ${form < 2 ? 'victory bonus' : 'bonus'}` };
    return [`${form < 2 ? 'Collected' : 'Gold'} ${gold}${own ? '' : ` × ${m}`}`, ...plan.stamps.map((st) => part[st.key])];
  });
  return forms.find((p) => textWidth(p.join('')) <= w) || forms[2];
}

// The results' UNLOCKED: what the run opened (reward.unlocked), as chips of an icon and a name in
// rows at most maxW wide, the first led by the word itself. Each chip { e, w } or { label, w }.
const UNLOCK_ROW = 17;
const UNLOCK_LABEL = 'UNLOCKED';
// A chip's name. A milestone that only puts its relic up for sale in the Armory (a lock with
// `buy`: the Phoenix Heart) says so, as it isn't the hero's yet.
const chipName = (e) => (e.buy ? `${codexName(e)} · NOW FOR SALE` : codexName(e));
export function chipRows(list, maxW) {
  const rows = [];
  let row = [{ label: UNLOCK_LABEL, w: textWidth(UNLOCK_LABEL) }], w = row[0].w;
  for (const e of list) {
    const cw = Math.min(maxW, 19 + textWidth(chipName(e)));
    if (w + 10 + cw > maxW && row.length) {
      rows.push(row);
      row = [];
      w = -10;
    }
    row.push({ e, w: cw });
    w += 10 + cw;
  }
  if (list.length) rows.push(row);
  return rows;
}

// The UNLOCKED rows a page at a time, perPage rows each (what room the panel has).
export const chipPages = (rows, perPage) => {
  const n = Math.max(1, perPage), out = [];
  for (let i = 0; i < rows.length; i += n) out.push(rows.slice(i, i + n));
  return out;
};
// What of them shows dt seconds after they began (the review's C5, 28 October 2026): the page, and
// how many of its chips are in, one every TALLY.row; a page full holds TALLY.page, then the next
// comes; after the last they go round again, whole (first: false). A single page stays. Where there
// are more than fit, nothing is lost behind a "+N MORE".
//   { page, shown, first }
export function chipView(pages, dt) {
  const n = pages.map((rows) => rows.flat().filter((c) => c.e).length);
  let t = Math.max(0, dt);
  for (let i = 0; i < pages.length; i++) {
    if (t < n[i] * TALLY.row + TALLY.page) return { page: i, shown: Math.min(n[i], Math.floor(t / TALLY.row) + 1), first: true };
    t -= n[i] * TALLY.row + TALLY.page;
  }
  const page = Math.floor(t / TALLY.page) % pages.length;
  return { page, shown: n[page], first: false };
}

// One row of those chips, centred on cx, its icons' tops at y, laid out whole so nothing moves as
// they come in: its label always, its first `shown` chips, and `tail` at its end (a page's "1/2").
function drawChips(ctx, row, cx, y, tail, shown = row.length) {
  const total = row.reduce((s, c) => s + c.w, 0) + 10 * (row.length - 1) + (tail ? 10 + textWidth(tail) : 0);
  let x = Math.round(cx - total / 2), k = 0;
  for (const c of row) {
    if (c.label) drawText(ctx, c.label, x, y + 4, { color: ['#ffffff', '#9ee562', '#63c74d'] });
    else if (k++ < shown) {
      codexIcon(ctx, c.e, x, y, false);
      drawText(ctx, fitText(chipName(c.e), c.w - 19), x + 19, y + 4, { color: '#fee761' });
    }
    x += c.w + 10;
  }
  if (tail) drawText(ctx, tail, x, y + 4, { color: '#8b9bb4' });
}

// The second circle's weapons (shared/progress.js deep), revealed by the first night won: the
// results say how many (11; the review's C5 counted 10).
const SECOND_CIRCLE = PROGRESS.locks.filter((l) => l.deep && !l.retired).length;

// The locks nearest to opening, as lines under the gold: 'NEXT: Frost Nova · Survive 3:00 in a run
// — 2:14 best', all in the longest form that fits every one of them, cut to fit at the last.
function nearLines(list, w) {
  const forms = list.map((e) => {
    const name = codexName(e), rec = codexRecord(e), tail = rec ? ` — ${rec}` : '';
    return [`NEXT: ${name} · ${e.need}${tail}`, `${name} · ${e.need}${tail}`, `${name}: ${e.need}`];
  });
  let k = 0;
  while (k < 2 && forms.some((f) => textWidth(f[k]) > w)) k++;
  return forms.map((f) => fitText(f[k], w));
}

// A fall's results tell what dealt the hero's wounds, the three that dealt most by their share of
// all he took (Game.stats.wounds), and one tip for the worst kind of them (the review of 27 October
// 2026: "slain by" names only the last blow, in a crowd often a rat). A win or a quit tells none.
// A boss's share is all his blows, his touch, slams and shots (Player.hurt), and his tip is for both.
export const WOUND_TIPS = {
  boss: "Tip: keep a boss at arm's length, out of the ground he marks",
  mobs: "Tip: the Armory's Armor and Vitality hold the horde off longer",
  shots: 'Tip: bolts and blasts are aimed where you stand: keep moving',
};
export function woundLines(res) {
  const st = res.stats, all = st?.damageTaken;
  if (!res.died || !all || !st.wounds) return [];
  const top = Object.entries(st.wounds).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const worst = [['boss', st.fromBoss], ['mobs', st.fromMobs], ['shots', st.fromShots]].sort((a, b) => b[1] - a[1])[0][0];
  return [
    ['Wounds: ' + top.map(([who, d]) => `${who} ${Math.round((100 * d) / all)}%`).join(' · '), '#c0cbdc'],
    [WOUND_TIPS[worst], '#8b9bb4'],
  ];
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
    this.wounds = woundLines(res);
    // Quit Run: no win and no fall (Game.finish's died). Its own neutral title, and the title piece.
    this.quit = !res.victory && !res.died;
    // The records as they stood before this run: a row beating one is stamped NEW BEST. All read
    // before submit, which the browser's own store applies at once.
    const prof = gs.app.store.profile;
    this.before = { ...prof.best };
    this.firstRun = !prof.runs; // no run on record yet: every row's record is nought
    this.btBefore = prof.bt?.[res.hero] || 0; // his longest run before this one (the NEXT bar's tick)
    // The first night won shows the second circle (shared/profile.js hiddenLock): the results say so.
    this.firstNight = res.victory && res.mode === 's15' && !(prof.wins?.s15 || []).some((n) => n > 0);
    this.rows = this.tally();
    this.ticked = 0; // rows that have ticked in
    this.goldAt = null; // when the gold began to count (this.t)
    this.plan = null; // the gold's cascade (goldSteps): its plan, the stamps in, the last one's moment
    this.stamped = 0;
    this.stampAt = null;
    this.chipsAt = null; // when the UNLOCKED chips began to come in (this.t), and how many were heard
    this.chipsHeard = 0;
    this.landed = false; // the count is done (or skipped): RETURN TO CAMP takes a press
    // The level-ups' FIRST FINDs of this run, kept now it is over (by a fall, Quit Run or a win).
    if (gs.offeredNew?.length) seenBox.add('offered', gs.offeredNew);
    this.submit();
    // A win's jingle is heard in full, the title piece after it; a fall's lament plays now; a quit
    // goes back to the title piece.
    if (res.victory) playAfterJingle('title');
    else if (this.g.player.dead) playJingle('gameover');
    else playMusic('title'); // a quit: the run's forest or boss music would play on (stopMusic is the death's)
    gs.app.ui.focusId = 'camp';
  }

  // The rows: [label, value, record broken]: every record the profile keeps (best) stamped where
  // this run beat it (the review's C8a, 28 October 2026).
  tally() {
    const res = this.res, st = res.stats, b = this.before, ranked = res.mode === 'ranked';
    const rows = [[ranked ? 'Survived' : 'Time', fmtTime(res.time), res.mode === 's15' && res.time > (b.s15 || 0)]];
    if (ranked) rows.push(['Rank', rankTitle(res.time), false]);
    // A won Dungeon Run counts as its fourth floor, as the save keeps it (applyRun best.dungeon) and
    // the Records say Conquered; its row is 'Dungeon', as 'Floor reached' ran into the word.
    if (res.mode === 'dungeon') rows.push(res.victory ? ['Dungeon', 'Conquered', 4 > (b.dungeon || 0)] : ['Floor reached', String(res.floor), res.floor > (b.dungeon || 0)]);
    rows.push(
      ['Level', String(res.level), res.level > (b.level || 0)],
      ['Kills', fmtNum(res.kills), res.kills > (b.kills || 0)],
      // The combo has been on record since 28 October 2026: a save from before has none to beat yet.
      ['Best combo', String(st.maxCombo), st.maxCombo > (b.combo || 0) && ((b.combo || 0) > 0 || this.firstRun)],
      ['Bosses slain', String(st.bosses), st.bosses > (b.bosses || 0)],
      ['Gold found', fmtNum(res.gold), res.gold > (b.gold || 0)],
      ['Damage dealt', fmtNum(st.damage), false],
    );
    return rows;
  }

  submit() {
    const res = this.res;
    this.reward = null;
    this.gs.app.store.submitRun({
      mode: res.mode, diff: res.diff, nightmare: res.nightmare, hero: res.hero, victory: res.victory, died: res.died, time: res.time, gold: res.gold, kills: res.kills, combo: res.combo, level: res.level, bosses: res.bosses, evolved: res.evolved, evos: res.evos, floor: res.floor,
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
    this.stampAt = null;
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
    const title = res.victory ? (res.mode === 'dungeon' ? 'VICTORY' : 'DAWN BREAKS') : this.quit ? 'RUN ENDED' : 'YOU HAVE FALLEN';
    const cols = res.victory ? ['#ffffff', '#fee761', '#feae34', '#f77622', '#be4a2f'] : this.quit ? ['#ffffff', '#e8eef6', '#c0cbdc', '#8b9bb4', '#5a6988'] : ['#f6757a', '#e43b44', '#a22633', '#5c0f1c', '#3e2731'];
    const L = logo(title, cols);
    const s = Math.min(1, (W - 20) / L.width);
    ctx.globalAlpha = clamp(this.t * 2, 0, 1);
    ctx.drawImage(L, Math.round(W / 2 - (L.width * s) / 2), 8, Math.round(L.width * s), Math.round(L.height * s));
    ctx.globalAlpha = 1;
    const ranked = res.mode === 'ranked';
    let sub = `${HEROES[res.hero].name} · ${MODES[res.mode].name} ${MODES[res.mode].sub}${res.nightmare ? ` · ${NIGHTMARE.name}` : ''}`;
    if (res.died && res.stats.killedBy) sub += ` · slain by ${res.stats.killedBy}`;
    drawText(ctx, fitText(sub, W - 8), W / 2, 12 + L.height * s, { align: 'center', color: res.victory ? '#feae34' : '#8b9bb4' });
    if (this.t < TALLY.rows - 0.2) return null;
    // Personal bests and anything this run unlocked, shown above the gold once it has landed; a
    // fall's wounds over them, in what room is left (below).
    const notes = [];
    if (this.reward && this.landed) {
      const rk = this.reward.ranked;
      if (rk) notes.push(rk.personalBest ? ['★ NEW PERSONAL BEST ★', '#63c74d'] : [`Personal best: ${fmtTime(rk.best)}`, '#8b9bb4']);
      for (const k of this.reward.unlocks || []) notes.push([unlockText(k), '#fee761']);
      // The first night won reveals the second circle (the review's C5, 28 October 2026): told here,
      // its weapons marked NEW in the Codex (ui/ladder.js isNewEntry).
      const circle = this.firstNight && !this.reward.unsaved;
      if (circle) notes.push([`THE SECOND CIRCLE STIRS · ${SECOND_CIRCLE} weapons revealed`, '#fee761']);
      if (!this.announced && (this.reward.unlocks?.length || rk?.personalBest || circle)) {
        this.announced = true;
        sfx(rk?.personalBest ? 'record' : 'unlock');
      }
    }
    // The weapons beside the rows, or under them on a narrow screen.
    const pw = Math.min(W - 16, 340), side = pw >= 330, nw = Math.min(6, res.weapons.length);
    // What the run opened (shared/progress.js: reward.unlocked), in rows of an icon and a name each
    // under UNLOCKED, and the one or two locks nearest to opening, told under the gold. Their room
    // is kept from the moment the store answers, so nothing moves when they show. They take the
    // room the rows and weapons leave (tight: what those, the notes and the gold need), the panel
    // growing for them where the screen allows; on a low screen the locks give way first, then
    // the rows of the unlocked down to one.
    const saved = this.reward && !this.reward.unsaved;
    const unlocked = saved ? this.reward.unlocked || [] : [];
    const near = saved ? (this.near ??= nearestLocks(this.gs.app.store.profile, 2)) : [];
    const cap = H - 52 - L.height * s;
    const need = () => 16 + Math.max(this.rows.length * 10, side ? nw * 15 : 0) + (side ? 0 : nw * 15 + 4) + notes.length * 10 + 55;
    let tight = need();
    // The rows give way before the unlocked do (28 October 2026): where not even one row of them
    // fits under the rows (a 240-high screen), Damage dealt is left out, as the Gold found row had
    // put it under the chips. It is never a record, and each weapon's damage is told beside it.
    if (unlocked.length && cap - tight < UNLOCK_ROW && this.rows[this.rows.length - 1][0] === 'Damage dealt') {
      this.rows.pop();
      this.ticked = Math.min(this.ticked, this.rows.length);
      tight = need();
    }
    let chips = chipRows(unlocked, pw - 16);
    const fit = Math.max(1, Math.floor((cap - tight) / UNLOCK_ROW));
    // More rows than fit: a page at a time (chipView), each row with room at its end for its "1/2".
    if (chips.length > fit) chips = chipRows(unlocked, pw - 16 - 10 - textWidth('9/9'));
    const nChips = Math.min(chips.length, fit);
    const unH = unlocked.length ? nChips * UNLOCK_ROW : 0;
    // A fall's wounds and their tip (woundLines) take the room the rest leaves, the tip giving way
    // first, then the wounds, before the nearest locks do (27 October 2026: on a 480x270 screen
    // they pushed a fall's unlocked down onto its sixth weapon).
    const nWounds = clamp(Math.floor((cap - tight - unH) / 10), 0, this.wounds.length);
    notes.unshift(...this.wounds.slice(0, nWounds));
    tight += nWounds * 10;
    const base = 178 + notes.length * 10 + (side ? 0 : nw * 15 - 10);
    const nNear = clamp(Math.floor((cap - tight - unH) / 10), 0, near.length);
    const ph = Math.min(cap, Math.max(base, tight + unH + nNear * 10));
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
    // The one that dealt the most, marked MVP (the review's C8a, 28 October 2026), where there are two or more.
    const mvp = res.weapons.length > 1 ? res.weapons.slice(0, 6).reduce((a, w) => (w.dmg > a.dmg ? w : a)) : null;
    res.weapons.slice(0, 6).forEach((w, j) => {
      if (this.t < wFrom + j * TALLY.weapon) return;
      const def = WEAPONS[w.id], star = w === mvp && w.dmg > 0;
      ctx.drawImage(SPR[def.icon].frames[0].c, wx, wy - 3);
      const name = fitText(def.name, x + pw - 74 - wx - 18 - (star ? textWidth('MVP') + 4 : 0));
      drawText(ctx, name, wx + 18, wy + 1, { color: def.evolved ? '#f77622' : '#c0cbdc' });
      if (star) drawText(ctx, 'MVP', wx + 18 + textWidth(name) + 4, wy + 1, { color: ['#ffffff', '#fee761', '#feae34'] });
      const secs = Math.max(1, res.time - (w.since || 0));
      drawText(ctx, `${fmtNum(w.dmg)}  ${fmtNum(w.dmg / secs)}/s`, x + pw - 8, wy + 1, { align: 'right', color: '#feae34' });
      wy += 15;
    });
    // The gold, counting up once the rows are in and the store has answered; then what next.
    const gy = y + ph - 51 - nNear * 10;
    notes.forEach(([text, color], i) => drawText(ctx, fitText(text, pw - 12), W / 2, gy - 4 - (notes.length - i) * 10, { align: 'center', color }));
    if (this.landed && unH) {
      this.chipsAt ??= this.t;
      const pages = chipPages(chips, nChips), view = chipView(pages, this.t - this.chipsAt);
      // Each chip's first showing: the unlock's bell with the first, a note a step up the scale each.
      if (view.first) {
        const upto = pages.slice(0, view.page).reduce((n, rows) => n + rows.flat().filter((c) => c.e).length, 0) + view.shown;
        while (this.chipsHeard < upto) {
          if (!this.announced) {
            this.announced = true;
            sfx('unlock');
          }
          sfx('reveal', { pitch: SCALE[Math.min(SCALE.length - 1, this.chipsHeard++)] });
        }
      }
      const rows = pages[view.page], tail = pages.length > 1 ? `${view.page + 1}/${pages.length}` : '';
      let left = view.shown;
      rows.forEach((row, r) => {
        const k = row.filter((c) => c.e).length;
        drawChips(ctx, row, W / 2, gy - 6 - notes.length * 10 - unH + r * UNLOCK_ROW, r === rows.length - 1 ? tail : '', clamp(left, 0, k));
        left -= k;
      });
    }
    const unsaved = this.reward?.unsaved;
    const counting = this.reward && !unsaved && this.t >= this.rowsEnd + TALLY.gap;
    if (unsaved) {
      const why = this.reward.down ? 'the game server can\'t be reached' : this.reward.error;
      drawText(ctx, fitText(`This run's gold isn't saved${why ? `: ${why}` : ''}`, pw - 12), W / 2, gy, { align: 'center', color: '#e43b44' });
      this.landed = true;
    } else if (counting) {
      // The gold picked up, the wage for the time on the clock (shared/progress.js wage) and a
      // win's bonus, as a cascade (goldSteps). The gold as credited (runReward gold: within the cap,
      // with gear sold), so the line adds up; an older server's reward says only what was picked up.
      const r = this.reward, total = r.total, gold = r.gold ?? res.gold;
      this.goldAt ??= this.t;
      const plan = (this.plan ??= goldSteps({ ...r, gold }, this.goldFor(total))), at = this.t - this.goldAt;
      if (!total) this.land(); // nothing to count
      if (!this.landed) {
        if (!this.stamped) {
          const k = plan.count > 0 ? clamp(at / plan.count, 0, 1) : 1, before = this.shown;
          this.shown = plan.countTo * ease.outCubic(k);
          // A coin a twentieth of the way, climbing in pitch.
          const step = Math.max(1, plan.countTo / 20);
          if (Math.floor(this.shown / step) > Math.floor(before / step)) sfx('coin', { pitch: 1 + 0.6 * (this.shown / Math.max(1, plan.countTo)) });
        }
        // Each stamp in its turn: the total steps up to it, a step on up the scale past the coins.
        while (this.stamped < plan.stamps.length && at >= plan.stamps[this.stamped].at) {
          this.shown = plan.stamps[this.stamped++].to;
          this.stampAt = this.t;
          sfx('stamp', { pitch: SCALE[Math.min(SCALE.length - 1, 3 + this.stamped)] });
        }
        if (at >= plan.end) {
          this.shown = total;
          this.land(); // the thunk, on the last stamp
        }
      }
      // The formula, built as its stamps land: laid out as its whole line, so nothing moves; the
      // newest part gold for a moment.
      const w = pw - 12, parts = goldParts(r, gold, res.time, plan, w), n = this.landed ? parts.length : 1 + this.stamped;
      const line = parts.join(''), fresh = n > 1 && this.stampAt != null && this.t - this.stampAt < 0.4;
      if (textWidth(line) > w) drawText(ctx, fitText(parts.slice(0, n).join(''), w), W / 2, gy, { align: 'center', color: '#8b9bb4' });
      else {
        const x0 = Math.round(W / 2 - textWidth(line) / 2), done = parts.slice(0, n - 1).join('');
        if (done) drawText(ctx, done, x0, gy, { color: '#8b9bb4' });
        drawText(ctx, parts[n - 1], x0 + textWidth(done), gy, { color: fresh ? '#fee761' : '#8b9bb4' });
      }
      // The total flashes white as a stamp lands (held gold with FLASHES: SOFT).
      const hot = !this.g.settings?.softFlash && this.stampAt != null && this.t - this.stampAt < 0.12;
      const c = textCanvas(`+${fmtNum(Math.floor(this.shown))} GOLD`, hot ? ['#ffffff', '#ffffff', '#fee761'] : ['#fff3a8', '#fee761', '#feae34'], '#181425');
      ctx.drawImage(c, Math.round(W / 2 - c.width), gy + 9, c.width * 2, c.height * 2);
    } else if (!this.reward) drawText(ctx, 'Counting your spoils…', W / 2, gy + 6, { align: 'center', color: '#8b9bb4' });
    if (this.landed && this.reward) {
      // What next: the next goal, and what the gold buys.
      const prof = app.store.profile;
      nearLines(near.slice(0, nNear), pw - 12).forEach((line, i) => drawText(ctx, line, W / 2, y + ph - 20 - (nNear - i) * 10, { align: 'center', color: '#c28569' }));
      const goal = nextGoal(prof), bw = 40, bar = heroGoalBar(goal, res, pw - 12 - bw - 4), ny = y + ph - 20;
      if (bar) {
        // The distance as a bar before its words (heroGoalBar, in the form that fits); a pale tick
        // where his longest run before this one stood, if it went further.
        const text = fitText(bar.text, pw - 12 - bw - 4), bx = Math.round(W / 2 - (bw + 4 + textWidth(text)) / 2);
        codexBar(ctx, bx, ny + 2, bw, bar.k, '#feae34');
        const was = this.btBefore / bar.need;
        if (was > bar.k && was < 1) {
          ctx.fillStyle = '#ead4aa';
          ctx.fillRect(bx + 1 + Math.round((bw - 2) * was), ny + 1, 1, 6);
        }
        drawText(ctx, text, bx + bw + 4, ny, { color: '#feae34' });
      } else drawText(ctx, fitText('NEXT: ' + goalText(goal), pw - 12), W / 2, ny, { align: 'center', color: '#feae34' });
      drawText(ctx, fitText(armoryLine(prof), pw - 12), W / 2, y + ph - 11, { align: 'center', color: '#c0cbdc' });
    }
    ui.begin(dt);
    if (unsaved && this.reward.down && button(ctx, ui, 'resubmit', Math.round(W / 2 - 50), gy + 10, 100, 13, 'SAVE AGAIN')) this.submit();
    const by = Math.min(H - 20, y + ph + 6);
    // Return to this hero or spend the spoils. Before the tally lands, a press only reveals it.
    if (button(ctx, ui, 'camp', Math.round(W / 2 - 106), by, 100, 14, 'RETURN TO CAMP', { color: this.landed ? '#fee761' : '#8b9bb4' })) {
      if (this.landed) {
        app.choice.hero = res.hero;
        app.go('hero', { again: true });
      } else this.skip();
    }
    if (button(ctx, ui, 'upgrades', Math.round(W / 2 + 6), by, 100, 14, 'UPGRADES', { disabled: !this.landed || !this.reward || unsaved })) app.go('armory');
    ui.end();
    return null;
  }
}
