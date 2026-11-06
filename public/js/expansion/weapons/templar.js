const id = 'templar_votive_edge';

export default {
  id,
  weapon: {
    name: 'Votive Edge', icon: 'i_excalibur', kind: id, directional: true,
    desc: 'Carve a short ward ahead. It cuts each foe that touches the line once and briefly slows ordinary foes.',
    base: { dmg: 38, cd: 1.2, area: 1, amount: 1, dur: 0.88, slow: 0.16 },
    levels: [
      { dmg: 4, text: 'Damage {+4}.' },
      { area: 0.14, text: 'Ward reach and width {+14%}.' },
      { amount: 1, text: 'Ward can cut {1} more foe.' },
      { cd: -0.1, text: 'Carve wards {faster}.' },
      { dmg: 6, dur: 0.12, text: 'Damage {+6}. Wards last {+0.12s}.' },
      { area: 0.14, amount: 1, text: 'Ward reach and width {+14%}. {+1} foe per ward.' },
      { dmg: 7, slow: 0.06, text: 'Damage {+7}. Ordinary foes are slowed {more}.' },
    ],
    evo: { into: 'templar_hallowed_boundary', with: 'area' },
  },
  evolution: {
    name: 'Hallowed Boundary', icon: 'i_excalibur', kind: id, directional: true, evolved: true,
    desc: 'A wider, brighter ward holds the ground longer and cuts down more foes that cross it.',
    base: { dmg: 67, cd: 0.95, area: 1.42, amount: 4, dur: 1.16, slow: 0.3 },
  },
};
