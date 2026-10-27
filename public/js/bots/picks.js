// Level-up policies for bots: which card to take when a level-up is offered.
// A bot may pick for itself; otherwise the run's policy decides.
//
//   PICKS.name = { about, pick(cards, view) -> index }
//
// cards: [{ type: 'weapon' | 'passive' | 'bless' | 'haste' | 'reach' | 'heal' | 'gold', id, name,
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
// The shared weapons (data/heroes.js SHARED_WEAPONS) each hero's bot takes first, best first:
// what suits him, and clears the horde round him, before the rest (any other comes after).
const WEAPON_PREF = {
  knight: ['aura', 'blades', 'axe', 'thorns'],
  archer: ['glaive', 'wisps', 'thorns', 'lightning'],
  mage: ['lightning', 'arcane', 'frost', 'flask'],
  rogue: ['flask', 'caltrops', 'glaive', 'wisps'],
  necromancer: ['blades', 'lightning', 'wisps', 'axe'],
  paladin: ['aura', 'blades', 'lightning', 'axe'],
  druid: ['thorns', 'wisps', 'frost', 'flask'],
  berserker: ['aura', 'blades', 'axe', 'caltrops'],
  witchhunter: ['glaive', 'lightning', 'arcane', 'wisps'],
};
const prefOf = (v, id) => {
  const list = WEAPON_PREF[v.hero] || [], r = list.indexOf(id);
  return (r < 0 ? list.length : r) * 0.01;
};
// Whether a relic evolves a weapon the hero holds.
const evolves = (v, id) => v.me.weapons.some((w) => !w.evolved && WEAPONS[w.id]?.evo?.with === id);

export const PICKS = {
  first: { about: 'Always the first card', pick: () => 0 },
  random: { about: 'Any card, at random', pick: (cards, v) => Math.floor(v.rng() * cards.length) },
  weapons: { about: 'New weapons, then weapon upgrades, then the first card', pick: (cards) => lowest(cards, (c) => (c.type !== 'weapon' ? 2 : c.isNew ? 0 : 1)) },
  relics: { about: 'New relics, then relic upgrades, then the first card', pick: (cards) => lowest(cards, (c) => (c.type !== 'passive' ? 2 : c.isNew ? 0 : 1)) },
  build: {
    about: "A sensible build: grow weapons, add up to four (the shared ones that suit the hero first), then the relics that evolve them, then useful relics",
    pick: (cards, v) =>
      lowest(cards, (c) => {
        if (c.type === 'weapon' && !c.isNew) return 0;
        if (c.type === 'weapon' && v.me.weapons.length < 4) return 1 + prefOf(v, c.id);
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
