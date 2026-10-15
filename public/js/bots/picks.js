// Level-up policies for bots: which card to take when a level-up is offered.
// A bot may pick for itself; otherwise the run's policy decides.
//
//   PICKS.name = { about, pick(cards, view) -> index }
//
// cards: [{ type: 'weapon' | 'passive' | 'bless' | 'heal' | 'gold', id, name,
//           level, isNew, value }]

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

export const PICKS = {
  first: { about: 'Always the first card', pick: () => 0 },
  random: { about: 'Any card, at random', pick: (cards, v) => Math.floor(v.rng() * cards.length) },
  weapons: { about: 'New weapons, then weapon upgrades, then the first card', pick: (cards) => lowest(cards, (c) => (c.type !== 'weapon' ? 2 : c.isNew ? 0 : 1)) },
  relics: { about: 'New relics, then relic upgrades, then the first card', pick: (cards) => lowest(cards, (c) => (c.type !== 'passive' ? 2 : c.isNew ? 0 : 1)) },
  build: {
    about: 'A sensible build: grow weapons, add up to four, then useful relics',
    pick: (cards, v) =>
      lowest(cards, (c) => {
        if (c.type === 'weapon' && !c.isNew) return 0;
        if (c.type === 'weapon' && v.me.weapons.length < 4) return 1;
        if (c.type === 'passive') {
          const r = GOOD.indexOf(c.id);
          return 2 + (r < 0 ? 20 : r) + (c.isNew ? 0.5 : 0);
        }
        if (c.type === 'heal') return v.me.hp < v.me.maxHp * 0.7 ? 29 : 31;
        return c.type === 'bless' ? 30 : 32;
      }),
  },
};
