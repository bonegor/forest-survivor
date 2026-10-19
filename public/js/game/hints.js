// The first run's hints: four lines in the banners' style, each said once, when it is of use: how
// to move (a moment in), that the weapons strike by themselves and soul gems grow them (when the
// first level-up closes), the ultimate's key and name (the first time the fury orb is full), and
// what a crypt is (the first time a crypt door is on screen). Each fits the device in hand. Which
// have been said is kept with the settings (settings.hints); when the first run ends all count as
// said and the settings cookie keeps that (nothing is written while a run lasts): a second run
// shows none. The profile's shape doesn't change.

import { input } from '../engine/input.js';

export const HINT_IDS = ['move', 'weapons', 'fury', 'crypt'];
const COLOR = '#8fb8ff';
const DUR = 4.5;

// What each says, for the device: [title, line under it].
function words(id, g) {
  const dev = input.device, p = g.player;
  if (id === 'move') {
    return [dev === 'pad' ? 'Left stick to move' : dev === 'touch' ? 'Drag anywhere to move' : 'WASD or arrows to move', 'Keep moving: the horde closes in'];
  }
  if (id === 'weapons') return ['Your weapons strike by themselves', 'Soul gems from the fallen make them grow'];
  if (id === 'fury') {
    const key = dev === 'pad' ? 'X' : dev === 'touch' ? 'Tap the orb' : 'SPACE';
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
  }

  said(id) {
    return !!this.settings.hints?.[id];
  }

  mark(id) {
    this.settings.hints = { ...this.settings.hints, [id]: 1 };
  }

  say(id) {
    if (this.said(id)) return;
    const [title, sub] = words(id, this.g);
    this.g.banner(title, sub, COLOR, DUR);
    this.mark(id);
  }

  // Each frame of play: whatever has come up.
  update() {
    const g = this.g;
    if (g.state !== 'play' || g.inCrypt) return;
    if (g.clock > 2) this.say('move');
    if (this.levelClosed) this.say('weapons');
    if (g.player.fury >= 100) this.say('fury');
    // After the opening's lines have had their say, not on top of them.
    if (g.clock > 10 && !this.said('crypt') && g.crypts.some((d) => !d.sealed && onScreen(g.cam, d))) this.say('crypt');
  }

  // The run is over: every hint counts as said, and the settings cookie remembers it.
  done() {
    if (this.settings.hintsDone) return;
    this.settings.hints = Object.fromEntries(HINT_IDS.map((id) => [id, 1]));
    this.settings.hintsDone = true;
    this.save();
  }
}

const onScreen = (c, d) => d.x > c.x + 8 && d.x < c.x + c.W - 8 && d.y > c.y + 20 && d.y < c.y + c.H;
