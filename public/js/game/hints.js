// The first runs' hints: lines in the banners' style, each said once, when it is of use: how to
// move (a moment in), what a soul gem is (the first one picked up), that the weapons strike by
// themselves (when the first level-up closes), the ultimate's key and name (the first time the
// fury orb is full) and what a crypt is (the first time a crypt door is on screen); and a sixth,
// the first level-up screen's footer (ui/gamescreen.js LevelUpOverlay teach). Each fits the device
// in hand. Each counts as said only once its banner has played out in full (27 October 2026: they
// counted as soon as they were queued, and other banners could push them out unseen); one pushed
// off or replaced comes again, in this run or a later one. Which have been said is kept with the
// settings (settings.hints), and the settings cookie keeps it when the run ends (nothing is
// written while a run lasts). A player whose first run ended before then (settings.hintsDone,
// no longer written) knows the gem's and the level-up's already. The profile's shape doesn't change.

import { input, padKey } from '../engine/input.js';

export const HINT_IDS = ['move', 'gem', 'weapons', 'fury', 'crypt', 'levelup'];
// The hints a player whose first run ended before 27 October 2026 counts as said (said).
const LATER = ['gem', 'levelup'];
const COLOR = '#8fb8ff';
const DUR = 4.5;

// What each says, for the device: [title, line under it].
function words(id, g) {
  const dev = input.device, p = g.player;
  if (id === 'move') {
    return [dev === 'pad' ? 'Left stick to move' : dev === 'touch' ? 'Drag anywhere to move' : 'WASD or arrows to move', 'Keep moving: the horde closes in'];
  }
  if (id === 'gem') return ['A soul gem', 'Gems fill the bar: a full bar is a level, and a card to choose'];
  if (id === 'weapons') return ['Your weapons strike by themselves', 'Soul gems from the fallen make them grow'];
  if (id === 'fury') {
    const key = dev === 'pad' ? padKey('X') : dev === 'touch' ? 'Tap the orb' : 'SPACE';
    return [`Fury full: ${key}`, `${p.hero.ultName}: ${p.hero.ultDesc}`];
  }
  return ['A crypt', 'Walk up its steps: below, time stands still and lords guard their gear'];
}

export class Hints {
  // settings: the settings object (its `hints` holds what has been said); save: writes it.
  constructor(g, settings, save) {
    this.g = g;
    this.settings = settings;
    this.save = save;
    this.levelClosed = false; // the first level-up screen has closed (GameScreen)
    this.gemTaken = false; // a soul gem picked up (pickups.js)
    this.out = new Map(); // id -> its banner, shown but not yet played out
  }

  said(id) {
    return !!this.settings.hints?.[id] || (!!this.settings.hintsDone && LATER.includes(id));
  }

  mark(id) {
    this.settings.hints = { ...this.settings.hints, [id]: 1 };
    this.marked = true; // for done() to keep
  }

  // Its banner, to be counted once it has played out (update). Only into free room (Game.bannerRoom):
  // a hint pushed off and said again must not push the game's own banners off in turn (27 October
  // 2026: two hints up cut every new one within two frames). One that never finds room comes in a
  // later run.
  say(id) {
    if (this.said(id) || this.out.has(id) || !this.g.bannerRoom) return;
    const [title, sub] = words(id, this.g);
    const b = this.g.banner(title, sub, COLOR, DUR);
    if (!b) return;
    b.hint = true; // held back, not drawn or run down, while the screen is another's (Game.hintsHeld)
    this.out.set(id, b);
  }

  // Each frame of play: whatever has come up.
  update() {
    const g = this.g;
    // A banner played out in full is said; one gone before (pushed off, or a twin's) is not.
    for (const [id, b] of this.out) {
      if (b.t >= b.dur) {
        this.mark(id);
        this.out.delete(id);
      } else if (!g.banners.includes(b)) this.out.delete(id);
    }
    // Not while a warning, the ultimate's cut-in or a boss's card has the screen: they wait.
    if (g.state !== 'play' || g.inCrypt || g.hintsHeld) return;
    if (g.clock > 2) this.say('move');
    if (this.gemTaken) this.say('gem');
    if (this.levelClosed) this.say('weapons');
    if (g.player.fury >= 100) this.say('fury');
    // After the opening's lines have had their say, not on top of them.
    if (g.clock > 10 && !this.said('crypt') && g.crypts.some((d) => !d.sealed && onScreen(g.cam, d))) this.say('crypt');
  }

  // The run is over: what has played out in full counts as said, and the settings cookie
  // remembers what is new. A hint never shown (a crypt's in a run that met none, the ultimate's
  // while it is locked) comes in a later run.
  done() {
    for (const [id, b] of this.out) if (b.t >= b.dur) this.mark(id);
    this.out.clear();
    if (this.marked) this.save();
  }
}

const onScreen = (c, d) => d.x > c.x + 8 && d.x < c.x + c.W - 8 && d.y > c.y + 20 && d.y < c.y + c.H;
