// Level-up policies for bots: which card to take when a level-up is offered.
// A bot may pick for itself; otherwise the run's policy decides.
//
//   PICKS.name = { about, pick(cards, view) -> index }
//
// cards: [{ type: 'weapon' | 'passive' | 'bless' | 'heal' | 'gold', id, name,
//           level, isNew, value }]

import { WEAPONS } from '../data/weapons.js';

// Index of the card with the lowest score (the first one on ties).
function lowest(cards, score) {
  let bi = 0, bs = Infinity;
  cards.forEach((c, i) => {
    const s = score(c);
    if (s < bs) {
      bs = s;
      bi = i;
    }
  });
  return bi;
}

// Relics worth having, best first (the balance harness's order).
const GOOD = ['might', 'area', 'cooldown', 'amount', 'armor', 'vitality', 'regen', 'duration', 'projspeed', 'movespeed'];
// New weapons worth taking first, best first. A level-up offers only the hero's own roster
// (data/heroes.js), so each hero's bot takes from its own part of the list: what clears the
// horde round him before what picks foes off.
const WEAPON_PREF = [
  'aura', 'blades', 'axe', // the Knight
  'glaive', 'wisps', 'thorns', // the Ranger
  'lightning', 'arcane', 'frost', // the Sorcerer
  'flask', 'clone', 'caltrops', // the Shadow
  'grasp', 'bonespear', // the Necromancer
];
const prefOf = (id) => {
  const r = WEAPON_PREF.indexOf(id);
  return (r < 0 ? WEAPON_PREF.length : r) * 0.01;
};
// Whether a relic evolves a weapon the hero holds.
const evolves = (v, id) => v.me.weapons.some((w) => !w.evolved && WEAPONS[w.id]?.evo?.with === id);

export const PICKS = {
  first: { about: 'Always the first card', pick: () => 0 },
  random: { about: 'Any card, at random', pick: (cards, v) => Math.floor(v.rng() * cards.length) },
  weapons: { about: 'New weapons, then weapon upgrades, then the first card', pick: (cards) => lowest(cards, (c) => (c.type !== 'weapon' ? 2 : c.isNew ? 0 : 1)) },
  relics: { about: 'New relics, then relic upgrades, then the first card', pick: (cards) => lowest(cards, (c) => (c.type !== 'passive' ? 2 : c.isNew ? 0 : 1)) },
  build: {
    about: 'A sensible build: grow weapons, add up to four from the roster, then the relics that evolve them, then useful relics',
    pick: (cards, v) =>
      lowest(cards, (c) => {
        if (c.type === 'weapon' && !c.isNew) return 0;
        if (c.type === 'weapon' && v.me.weapons.length < 4) return 1 + prefOf(c.id);
        if (c.type === 'passive' && c.isNew && evolves(v, c.id)) return 1.9;
        if (c.type === 'passive') {
          const r = GOOD.indexOf(c.id);
          return 2 + (r < 0 ? 20 : r) + (c.isNew ? 0.5 : 0);
        }
        if (c.type === 'heal') return v.me.hp < v.me.maxHp * 0.7 ? 29 : 31;
        return c.type === 'bless' ? 30 : 32;
      }),
  },
};
