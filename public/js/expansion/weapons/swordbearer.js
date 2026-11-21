const id = 'swordbearer_marchsteel';

export default {
  id,
  weapon: {
    name: 'Marchsteel Greatsword', icon: 'i_swordbearer_marchsteel', kind: id, directional: true,
    desc: 'March to build momentum. A cut along your stride spends it to reach farther and hit more foes. The outer edge strikes hardest.',
    base: { dmg: 295, cd: 1.1, amount: 2, area: 1, kb: 0.85, stride: 1, chargeReach: 0.42, edge: 0.22 },
    levels: [
      { dmg: 34, text: 'Damage {+34}.' },
      { stride: 0.12, text: 'Build momentum {12% faster}.' },
      { amount: 1, area: 0.1, text: 'Hit {1} more foe. Reach {+10%}.' },
      { cd: -0.12, text: 'Cuts {faster}.' },
      { dmg: 40, chargeReach: 0.05, text: 'Damage {+40}. Charged cut reaches {farther}.' },
      { amount: 1, stride: 0.13, text: 'Hit {1} more foe. Build momentum {faster}.' },
      { dmg: 47, edge: 0.08, text: 'Damage {+47}. The charged edge hits {harder}.' },
    ],
    evo: { into: 'swordbearer_roadbreaker', with: 'movespeed' },
  },
  evolution: {
    name: 'Roadbreaker', icon: 'i_swordbearer_roadbreaker', kind: id, evolved: true, directional: true,
    desc: 'Build momentum sooner. Its wider, longer charged cut carries a stronger outer edge through the horde.',
    base: { dmg: 750, cd: 0.72, amount: 7, area: 1.38, kb: 1.1, stride: 1.45, chargeReach: 0.59, edge: 0.37 },
  },
};
