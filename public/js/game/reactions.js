// How the reactions strike (their rules: data/reactions.js; G1 of the 21 November 2026 review):
// Game.hitEnemy asks before a blow whether it scalds and after it whether it sets off a Combust,
// and react deals the splash, says the word over the foe and tells the hint.

import { REACT, EXPOSED, REACT_WORD } from '../data/reactions.js';
import { explode } from './effects.js';

export { REACT, isHeavy } from '../data/reactions.js';

// The same word over the field no oftener than this, in s of the game's clock.
const WORD_EVERY = 0.4;
const WORD_UP = 16;
// Splash bursts drawn a second at most; past it the splash still lands, unseen.
const BURSTS = { per: 1, most: 10 };

// The crit chance a foe's state adds (Exposed).
export function exposed(e) {
  if (e.freezeT > 0 || e.rootT > 0 || e.stunT > 0 || e.lullT > 0) return EXPOSED.held;
  return e.slowT > 0 ? EXPOSED.held * Math.min(1, e.slowF) : 0;
}

// Whether a blow may set a reaction off: not a splash, a reckoned payoff or a burn's own tick, not
// on a box or a sealed guardian, and not on a foe that has just reacted.
const canReact = (g, e, o) => !(o.noReact || o.raw || o.tick || e.prop || e.sealed) && e.reactT <= g.clock;
// Before the blow is dealt, a Scald: a fire blow on a frozen foe.
export const scalds = (g, e, o) => o.type === 'fire' && e.freezeT > 0 && !e.boss && canReact(g, e, o);
// After it, a Combust: a fire blow, or a burn Ember Heart has just set (lit), on a poisoned foe.
export const combusts = (g, e, o, lit) => (o.type === 'fire' || lit) && e.dots.poison.t > 0 && canReact(g, e, o);

// Once the blow (d, as dealt) is in: the splash, the word and the hint. A Shatter has no splash of
// its own (its ×1.5 is in the blow; its burst comes if the foe dies frozen, Game.killEnemy).
export function react(g, e, kind, d, w) {
  if (kind !== 'shatter') {
    e.reactT = g.clock + REACT.rest;
    // Scald: the ice melts, the foe is free. Combust: the poison it had left, burnt up at once, is
    // dealt it again, half as much more, and with a share of the blow to those about it.
    let dmg, R, left = 0;
    if (kind === 'scald') {
      e.freezeT = 0;
      e.shatterOnDeath = false;
      dmg = d * REACT.scald.share;
      R = REACT.scald.R;
    } else {
      const pz = e.dots.poison;
      left = pz.dps * pz.t * REACT.combust.poison;
      pz.t = 0;
      dmg = d * REACT.combust.share + left;
      R = REACT.combust.R;
    }
    const cands = g.grid.foes(e.x, e.y, R);
    for (let i = 0, n = 0; i < cands.length && n < REACT.most; i++) {
      const f = cands[i];
      if (f === e || f.dead || f.prop || f.sealed) continue;
      if (Math.hypot(f.x - e.x, f.y - e.y) > R + f.hr) continue;
      g.hitEnemy(f, dmg, { w, type: 'fire', kb: 0, raw: true, noReact: true });
      n++;
    }
    if (left >= 1 && !e.dead && e.hp > 0) g.hitEnemy(e, left, { w, type: 'fire', kb: 0, raw: true, noReact: true });
    // Seen and heard only so often: a crowd in Miasma under a Hellfire would burst a foe at a time.
    const b = g.reactBursts;
    if (g.clock - b.t > BURSTS.per) {
      b.t = g.clock;
      b.n = 0;
    }
    if (b.n < BURSTS.most) {
      b.n++;
      explode(g, e.x, e.y, R, 0, null, 'fire');
    }
  }
  const W = REACT_WORD[kind], at = g.reactSaid;
  if ((at[kind] ?? -Infinity) > g.clock - WORD_EVERY) return;
  at[kind] = g.clock;
  // The word loud (Numbers.text), WORD_UP px over the foe's head: above where its splash's numbers
  // are born, and drawn over them.
  if (g.numbers.enabled) g.numbers.text(e.x, e.y - e.h - WORD_UP, W.word, W.style, true);
  g.hints?.saw(kind);
}
