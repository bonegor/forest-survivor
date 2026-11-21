const id = 'seraph_sunwing_edge';

export default {
  id,
  weapon: {
    name: 'Sunwing Edge', icon: 'i_seraph_sunwing_edge', kind: id, directional: true,
    desc: 'Cleave ahead and send two golden wings sweeping out to the flanks. Each foe can be cut once per swing.',
    base: { dmg: 176, cd: 1.12, amount: 1, area: 1, speed: 1, kb: 0.8, wing: 0.62 },
    levels: [
      { dmg: 21, text: 'Damage {+21}.' },
      { area: 0.12, text: 'Sword and wings reach {+12%} farther.' },
      { amount: 1, text: 'Each swing can cut {1} more foe.' },
      { cd: -0.12, text: 'Swing {faster}.' },
      { dmg: 25, speed: 0.12, text: 'Damage {+25}. Wings sweep {12%} faster.' },
      { area: 0.15, amount: 1, text: 'Reach {+15%}. {+1} foe per swing.' },
      { dmg: 29, wing: 0.06, text: 'Damage {+29}. Wings deal {68%} sword damage.' },
    ],
    evo: { into: 'seraph_aureole_sundering', with: 'area' },
  },
  evolution: {
    name: 'Aureole Sundering', icon: 'i_seraph_aureole_sundering', kind: id, directional: true, evolved: true,
    desc: 'A greater cleave splits into wider, faster wings of light that cut more foes.',
    base: { dmg: 437, cd: 0.76, amount: 6, area: 1.55, speed: 1.3, kb: 0.95, wing: 0.75 },
  },
};
