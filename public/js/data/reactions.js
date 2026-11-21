// Reactions (G1 of the 21 November 2026 gameplay review; the owner's "one by one, work them"): a
// state one weapon leaves on a foe that another weapon's blow cashes in, so that a build is more
// than a list of weapons that each strike alone. The rules are here, for the game and the menus
// alike; how they strike is game/reactions.js.
// - Shatter: a heavy blow (HEAVY) on a frozen foe strikes half again as hard, as Frozen Heart's
//   shards always have, and marks it to burst into shards should it die still frozen (killEnemy).
// - Scald: a fire blow on a frozen foe melts its ice: twice the blow, half of it again splashed on
//   those about it, and the foe is free (it's no longer frozen).
// - Combust: a fire blow on a poisoned foe (or a burn Ember Heart sets on it) burns the poison up
//   at once: the poison it had left, half again, dealt it and, with a share of the blow, splashed
//   on those about it.
// - Exposed: a held foe (frozen, rooted, stunned or asleep) is crit more easily (EXPOSED.held more
//   crit chance), a slowed one by a share of that as deep as its slow (a 40% slow, 40% of it).
// A boss is never frozen or held (only slowed), so Shatter and Scald never touch one; Combust and
// a slow's Exposed do. Splashes are dealt as reckoned (raw: the blow's own strength already in
// them) and set off nothing more (noReact), so they never run on through a crowd.

import { WEAPONS } from './weapons.js';

export const REACT = {
  shatter: { mul: 1.5 },
  scald: { mul: 2, R: 26, share: 0.5 },
  combust: { R: 30, share: 0.6, poison: 1.5 },
  // A foe reacts (Scald, Combust) once in `rest` s of the game's clock at most, and a splash
  // strikes `most` foes about it at most.
  rest: 1,
  most: 8,
};
export const EXPOSED = { held: 0.25 };

// Heavy blows: swords, axes, crossbows, Smite, the scythe and the hook, with their evolutions.
const HEAVY_OF = ['sword', 'axe', 'twinaxes', 'smite', 'crossbow', 'scythe', 'hook',
  'footman_linebreaker', 'marksman_splitpin', 'templar_votive_edge', 'wraith_aftercut',
  'praetorian_shieldward_blade', 'seraph_sunwing_edge', 'boltguard_ratchet', 'swordbearer_marchsteel'];
const withEvos = (ids) => new Set(ids.flatMap((id) => (WEAPONS[id] ? [id, WEAPONS[id].evo?.into].filter(Boolean) : [])));
export const HEAVY = withEvos(HEAVY_OF);
export const isHeavy = (w) => !!w && HEAVY.has(w.id);

// Fire blows (o.type 'fire'): the fireball, the flask, the lantern and theirs; and what sets the
// others up: frost freezes, Miasma poisons. Ember Heart's burn counts as fire, Rimeheart as frost.
const FIRE = withEvos(['fireball', 'flask', 'lantern']);
const FREEZE = new Set(['frost', 'frozenheart', 'rime']);
const POISON = new Set(['miasma', 'pestilence']);

// Each reaction's name, the style of its word over the foe (numbers.js), its colour on a card and
// the hint it teaches the first time it is seen (hints.js).
export const REACT_WORD = {
  shatter: { word: 'SHATTER', style: 'frost', name: 'Shatter', color: '#2ce8f5', hint: 'Heavy blows shatter frozen foes' },
  scald: { word: 'SCALD', style: 'fire', name: 'Scald', color: '#f77622', hint: 'Fire melts a frozen foe in a scalding burst' },
  combust: { word: 'COMBUST', style: 'fire', name: 'Combust', color: '#9ee562', hint: 'Fire burns up the poison in a foe at once' },
};

const fire = (id) => FIRE.has(id) || id === 'ember';
// The reaction two things make together, either way round (null for none).
export function reactionOf(a, b) {
  const pair = (x, y) => (FREEZE.has(x) && HEAVY.has(y) ? 'shatter' : FREEZE.has(x) && fire(y) ? 'scald' : POISON.has(x) && fire(y) ? 'combust' : null);
  return pair(a, b) || pair(b, a);
}

// A card's line (ui/gamescreen.js choiceInfo): the reaction it makes with a weapon or relic the
// hero holds, "Shatter: Longsword", in that reaction's colour; null for none.
export function cardReaction(id, held) {
  for (const h of held) {
    const r = h.id !== id && reactionOf(id, h.id);
    if (r) return { text: `${REACT_WORD[r].name}: ${h.name}`, color: REACT_WORD[r].color };
  }
  return null;
}

// The Codex's line for a weapon or relic: what it sets up or cashes in.
export function reactionLine(id) {
  const parts = [];
  if (FREEZE.has(id)) parts.push('Freezes: heavy blows Shatter the frozen, fire Scalds them');
  if (POISON.has(id)) parts.push('Poisons: fire makes the poisoned Combust');
  if (HEAVY.has(id)) parts.push('Heavy: Shatters frozen foes');
  if (fire(id)) parts.push('Fire: Scalds the frozen, Combusts the poisoned');
  if (id === 'lightning' || id === 'thunderstorm' || id === 'roots' || id === 'worldroot') parts.push('Holds foes: they are Exposed to crits');
  if (['caltrops', 'razorfield', 'thorns', 'briarheart', 'sanctuary', 'tempest'].includes(id)) parts.push('Slows foes: they are Exposed to crits');
  return parts.length ? `${parts.join('. ')}.` : '';
}
