const id = 'swordbearer_marchsteel';

export default {
  id,
  weapon: {
    name: 'Marchsteel Greatsword', icon: 'i_sword', kind: id, directional: true,
    desc: 'March to build momentum. A cut along your stride spends it to reach farther and hit more foes. The outer edge strikes hardest.',
    base: { dmg: 44, cd: 1.10, amount: 2, area: 1, kb: 0.85, stride: 1, chargeReach: 0.42, edge: 0.22 },
    levels: [
      { dmg: 5, text: 'Damage {+5}.' },
      { stride: 0.12, text: 'Build momentum {12% faster}.' },
      { amount: 1, area: 0.1, text: 'Hit {1} more foe. Reach {+10%}.' },
      { cd: -0.12, text: 'Cuts {faster}.' },
      { dmg: 6, chargeReach: 0.05, text: 'Damage {+6}. Charged cut reaches {farther}.' },
      { amount: 1, stride: 0.13, text: 'Hit {1} more foe. Build momentum {faster}.' },
      { dmg: 7, edge: 0.08, text: 'Damage {+7}. The charged edge hits {harder}.' },
    ],
    evo: { into: 'swordbearer_roadbreaker', with: 'movespeed' },
  },
  evolution: {
    name: 'Roadbreaker', icon: 'i_sword', kind: id, evolved: true, directional: true,
    desc: 'Build momentum sooner. Its wider, longer charged cut carries a stronger outer edge through the horde.',
    base: { dmg: 71, cd: 0.86, amount: 5, area: 1.22, kb: 1.1, stride: 1.45, chargeReach: 0.59, edge: 0.37 },
  },
};
